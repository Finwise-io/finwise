// DEC-2159 / his 2026-10-20 words: "always the class broker sends."
//
// His newest ruling settles DEC-2159 (2026-09-30, "Q10: Draft order is correct": the institution's own class field
// first) against brief B7 (2026-08-20, "name first, broker tag as fallback only"). For a linked or imported holding the
// class the broker sends decides — its cash-equivalent flag (the broker saying "this is cash"), else its own type — and
// the name and every other automatic rule apply only when it sends no usable class. B7's other rule stays: a class the
// person set outranks every automatic rule and survives every sync (DEC-2161: a sync keeps what the person entered).
//
// Everything here runs through the real functions: the sync (MK-XS-F-102 ingestSync), the one order (MK-ST-F-011
// classifyHoldingClass), the reader of a saved holding (MK-NW-F-109 holdingClassOf), the account split (MK-NW-F-027),
// the Net worth door's class rows (MK-NW-O-003 theNetWorth, MK-NW-M-007) and the emergency fund (MK-NW-O-004).
import { ingestSync, stAssetId } from './ingest';
import { mapPosition } from './snaptrade';
import { holdingClassOf, accountClassBreakdown, type AssetAccount } from '../../domain/assets';
import { reclassifyAccounts } from '../../domain/assets/reclassify';
import { importHoldings } from '../../domain/import/holdingsImport';
import { brokerClassOf, BROKER_TYPE_CLASS } from '../../../Calculation Module code/engines/holding-class';
import { theNetWorth } from '../../../MoneyKeel/functions/networth-and-performance/net-worth';
import { theEmergencyFund } from '../../../MoneyKeel/functions/networth-and-performance/emergency-fund';

const NOW = '2026-10-20T12:00:00Z';
const CHASE: AssetAccount = { asset_id: 'chase', label: 'Chase Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 9_000, target_return: 0.005 } as any;
const PROFILE = { monthlySpending: 6_000 };   // essentials, entered: $6,000 a month

const vanguardPayload = (positions: any[], balancesCash: number, total: number) => ({
  account: { id: 'van-1', name: 'Vanguard Brokerage', number: '****5738', institution_name: 'Vanguard', raw_type: 'Individual',
    balance: { total: { amount: total, currency: 'USD' } }, sync_status: { holdings: { last_successful_sync: NOW } } },
  balancesCash, positions, activities: [],
} as any);
const VTI = { symbol: { symbol: { id: 'u-vti', raw_symbol: 'VTI', symbol: 'VTI', description: 'VANGUARD TOTAL STOCK MARKET ETF', type: { code: 'et' } } }, units: 400, price: 250, average_purchase_price: 200 };
const VMFXX = { symbol: { symbol: { id: 'u-vmfxx', raw_symbol: 'VMFXX', symbol: 'VMFXX', description: 'VANGUARD FEDERAL MONEY MARKET FUND', type: { code: 'mf' } } }, units: 50_000, price: 1, average_purchase_price: 1, cash_equivalent: true };

/** The four figures he reads, from the real doors: the Cash row, the Stocks / Funds row, What you own, the emergency fund. */
const figures = (accounts: AssetAccount[]) => {
  const nw = theNetWorth({ uid: 'u', accounts, debts: [] });
  const ef = theEmergencyFund({ accounts, expenses: [], profile: PROFILE });
  return { cash: nw.byClass.cash ?? 0, stocks: nw.byClass.stocks_etf ?? 0, bonds: nw.byClass.bonds ?? 0, owned: nw.assets, months: ef.monthsCovered };
};

/** A Vanguard account as a sync before 2026-10-20 saved it: classed by the old name-first order, with no broker type
 *  or flag kept on its holdings. */
const savedBefore = (a: AssetAccount): AssetAccount => ({
  ...a,
  positions: (a.positions ?? []).map((p: any) => {
    const { broker_type, cash_equivalent, ...rest } = p;
    return { ...rest, asset_class: p.ticker === 'VMFXX' ? 'stock_etf' : rest.asset_class, kind: p.ticker === 'VMFXX' ? 'stocks_etf' : rest.kind };
  }),
} as any);

describe('DEC-2159 / his 2026-10-20 words — the worked example, before and after', () => {
  const synced = ingestSync([], {}, [vanguardPayload([VTI, VMFXX], 51_000, 151_000)], NOW).accounts[0];
  const before = savedBefore(synced);
  // THE NEXT SYNC re-classes the holdings saved under the old order (DATA REALITY: existing accounts, not only new ones)
  const after = ingestSync([CHASE, before], {}, [vanguardPayload([VTI, VMFXX], 51_000, 151_000)], NOW).accounts.find((a) => a.asset_id === stAssetId('van-1'))!;

  test('before (the old name-first order, as saved): Cash $10,000 · Stocks / Funds $150,000 · emergency fund 1.7 months', () => {
    const f = figures([CHASE, before]);
    // eslint-disable-next-line no-console
    console.log('BEFORE', JSON.stringify(f));
    expect(f.cash).toBe(10_000);                   // Chase $9,000 + Vanguard's uninvested $1,000
    expect(f.stocks).toBe(150_000);                // VTI $100,000 + VMFXX $50,000 (by its name)
    expect(f.owned).toBe(160_000);
    expect(f.months).toBeCloseTo(10_000 / 6_000, 12);   // 1.67 → "1.7 months"
  });

  test('after (his ruling — the broker flags VMFXX cash-equivalent, so it is Cash): Cash $60,000 · Stocks / Funds $100,000 · emergency fund 10.0 months', () => {
    const f = figures([CHASE, after]);
    // eslint-disable-next-line no-console
    console.log('AFTER', JSON.stringify(f));
    expect(f.cash).toBe(60_000);                   // $9,000 + $1,000 + VMFXX $50,000
    expect(f.stocks).toBe(100_000);                // VTI only
    expect(f.owned).toBe(160_000);                 // the money did not change, only its class: counted once
    expect(f.months).toBeCloseTo(60_000 / 6_000, 12);   // 10.0
    // the sync kept what the broker sent, and the money moved without a flag: the broker's class is not held back
    const vmfxx = (after.positions as any[]).find((p) => p.ticker === 'VMFXX');
    expect([vmfxx.asset_class, vmfxx.cash_equivalent, vmfxx.broker_type, vmfxx.class_flag]).toEqual(['cash', true, 'mf', undefined]);
    expect(after.cash_balance).toBe(1_000);        // the cash beside it is still net of it (MK-XS-F-110)
    const split = accountClassBreakdown(after)!;
    expect([split.cash, split.stocks_etf]).toEqual([51_000, 100_000]);
  });

  test('ON THE NEXT READ, too: a saved holding that carries the broker\'s flag is read as Cash whatever class was stored beside it', () => {
    const stale = { ...after, positions: (after.positions as any[]).map((p) => (p.ticker === 'VMFXX' ? { ...p, asset_class: 'stock_etf', kind: 'stocks_etf' } : p)) } as AssetAccount;
    expect(figures([CHASE, stale]).cash).toBe(60_000);
    // and the one-time tidy-up stores the same answer the readers give
    const tidied = reclassifyAccounts([stale]).accounts[0];
    expect((tidied.positions as any[]).find((p) => p.ticker === 'VMFXX').asset_class).toBe('cash');
  });
});

describe('DEC-2159 / his 2026-10-20 words — a bond ETF and a T-bill ETF are what the broker sends: ETFs', () => {
  const BND = { symbol: { symbol: { id: 'u-bnd', raw_symbol: 'BND', description: 'VANGUARD TOTAL BOND MARKET ETF', type: { code: 'et' } } }, units: 100, price: 72 };
  const SGOV = { symbol: { symbol: { id: 'u-sgov', raw_symbol: 'SGOV', description: 'ISHARES 0-3 MONTH TREASURY BOND ETF', type: { code: 'et' } } }, units: 100, price: 100.5 };
  const TSY = { symbol: { symbol: { id: 'u-tsy', raw_symbol: '91282CGM7', description: 'US TREASURY NOTE 4.25% 02/15/2028', type: { code: 'bnd' } } }, units: 10, price: 1_000 };

  test('BND and SGOV, sent as ETFs, are Stocks / Funds (they were Bonds & CDs by their names, and SGOV by DEC-0051\'s T-bill rule); a Treasury sent as a bond stays Bonds & CDs', () => {
    expect(mapPosition(BND as any)!.assetClass).toBe('stocks_etf');
    expect(mapPosition(SGOV as any)!.assetClass).toBe('stocks_etf');
    expect(mapPosition(TSY as any)!.assetClass).toBe('bonds');
  });

  test('re-classed at the next sync, with no flag: Bonds & CDs $27,250 → $10,000 and Stocks / Funds $0 → $17,250, on the same $27,250', () => {
    const first = ingestSync([], {}, [vanguardPayload([BND, SGOV, TSY], 0, 27_250)], NOW).accounts[0];
    // as saved by the old order: BND and SGOV under Bonds & CDs by their names, no broker type kept
    const old = { ...first, positions: (first.positions as any[]).map(({ broker_type, cash_equivalent, ...p }) => ({ ...p, asset_class: 'bond', kind: 'fixed_income' })) } as AssetAccount;
    const b0 = accountClassBreakdown(old)!;
    expect([b0.bonds, b0.stocks_etf]).toEqual([27_250, 0]);
    const next = ingestSync([old], {}, [vanguardPayload([BND, SGOV, TSY], 0, 27_250)], NOW).accounts[0];
    const b1 = accountClassBreakdown(next)!;
    expect([b1.bonds, b1.stocks_etf]).toEqual([10_000, 17_250]);
    expect((next.positions as any[]).map((p) => [p.ticker, p.asset_class, p.class_flag])).toEqual([
      ['BND', 'stock_etf', undefined], ['SGOV', 'stock_etf', undefined], ['91282CGM7', 'bond', undefined]]);
  });
});

describe('B7\'s other rule, kept — a class the PERSON set outranks the broker and survives every sync (DEC-2161)', () => {
  test('VMFXX the person called Stocks / Funds stays Stocks / Funds after a sync whose broker flags it cash-equivalent', () => {
    const first = ingestSync([], {}, [vanguardPayload([VTI, VMFXX], 51_000, 151_000)], NOW).accounts[0];
    const theirs = { ...first, positions: (first.positions as any[]).map((p) => (p.ticker === 'VMFXX' ? { ...p, asset_class: 'stock_etf', class_source: 'user' } : p)) } as AssetAccount;
    expect(holdingClassOf((theirs.positions as any[])[1])).toBe('stocks_etf');
    const next = ingestSync([theirs], {}, [vanguardPayload([VTI, VMFXX], 51_000, 151_000)], NOW).accounts[0];
    const v = (next.positions as any[]).find((p) => p.ticker === 'VMFXX');
    expect([v.asset_class, v.class_source, holdingClassOf(v)]).toEqual(['stock_etf', 'user', 'stocks_etf']);
    expect(accountClassBreakdown(next)!.cash).toBe(1_000);
    expect(reclassifyAccounts([next]).changed).toBe(0);
  });
});

describe('what the broker sends, mapped — the one table (MK-ST-F-011 classifyHoldingClass reads it through brokerClassOf)', () => {
  test('SnapTrade\'s 14 documented codes: 11 name a class, 3 fall through; plus mf, adr and cd', () => {
    // SnapTrade's positions reference, read 2026-08-04: ad bnd cs cef crypto et oef pm ps rt struct ut wi wt
    const documented = ['ad', 'bnd', 'cs', 'cef', 'crypto', 'et', 'oef', 'pm', 'ps', 'rt', 'struct', 'ut', 'wi', 'wt'];
    const fallThrough = ['struct', 'ut', 'wi'];
    expect(documented.length).toBe(14);            // a guard that proves it looked: every documented code is accounted for
    expect(documented.filter((c) => BROKER_TYPE_CLASS[c] == null)).toEqual(fallThrough);
    expect(Object.keys(BROKER_TYPE_CLASS).filter((c) => !documented.includes(c)).sort()).toEqual(['adr', 'cd', 'mf']);
    expect(Object.fromEntries(['cs', 'ps', 'ad', 'et', 'oef', 'cef', 'mf', 'bnd', 'crypto', 'pm', 'wt', 'rt'].map((c) => [c, brokerClassOf(c)?.cls]))).toEqual({
      cs: 'stocks_etf', ps: 'stocks_etf', ad: 'stocks_etf', et: 'stocks_etf', oef: 'stocks_etf', cef: 'stocks_etf', mf: 'stocks_etf',
      bnd: 'bonds', crypto: 'alternatives', pm: 'alternatives', wt: 'alternatives', rt: 'alternatives',
    });
    for (const none of ['ut', 'struct', 'wi', '', null, undefined, 'UNKNOWN']) expect(brokerClassOf(none as any)).toBeNull();
    expect(brokerClassOf('oef', true)!.cls).toBe('cash');          // the flag decides before the type
    expect(brokerClassOf(null, true)!.cls).toBe('cash');
    expect(brokerClassOf('ET')!.cls).toBe('stocks_etf');           // capitals ignored
  });

  test('a file\'s own type words (Schwab\'s Security Type) map the same way', () => {
    expect(['Equity', 'ETFs & Closed End Funds', 'Mutual Funds', 'Fixed Income', 'Cash and Money Market', 'Option'].map((w) => brokerClassOf(w)?.cls))
      .toEqual(['stocks_etf', 'stocks_etf', 'stocks_etf', 'bonds', 'cash', 'alternatives']);
  });

  test('an import file with a type column: the file\'s type decides; a bare Type column (Fidelity: Cash / Margin) is not read', () => {
    const r = importHoldings('Symbol,Description,Quantity,Market Value,Security Type\n'
      + 'BND,VANGUARD TOTAL BOND MARKET ETF,100,7200,ETFs & Closed End Funds\n'
      + 'SPAXX,FIDELITY GOVERNMENT MONEY MARKET,5000,5000,Cash and Money Market\n'
      + 'GLD,SPDR GOLD SHARES,10,2000,ETFs & Closed End Funds\n'
      + '06418AAA1,KEYBANK NA 4.00% CD 08/24/26,10000,10000,Fixed Income\n');
    expect(r.holdings.map((h) => [h.symbol, h.assetClass, h.brokerType])).toEqual([
      ['BND', 'stocks_etf', 'ETFs & Closed End Funds'],
      ['SPAXX', 'cash', 'Cash and Money Market'],
      ['GLD', 'stocks_etf', 'ETFs & Closed End Funds'],
      ['06418AAA1', 'bonds', 'Fixed Income'],
    ]);
    expect(r.mapped.name).toBe('Description');     // the type column is never read as the name
    const fid = importHoldings('Symbol,Description,Quantity,Value,Type\nSPAXX,FIDELITY GOVERNMENT MONEY MARKET,5000,5000,Cash\n');
    expect([fid.holdings[0].assetClass, fid.holdings[0].brokerType]).toEqual(['stocks_etf', undefined]);   // by its name, as before
  });
});
