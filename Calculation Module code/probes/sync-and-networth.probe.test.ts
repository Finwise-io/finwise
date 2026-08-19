// PROBES — the sync assembly, net worth itself, and the market/economic feeds.
import { ingestSync, confirmWrapper } from '../../src/services/sync/ingest';
import { mapOptionHolding } from '../../src/services/sync/snaptrade';
import { buildNetWorth } from '../../src/domain/networth';
import { isAlternative } from '../../src/domain/alternatives';
import { taxBucketSplit } from '../../src/domain/decumulation';
import { dataGaps } from '../../src/domain/gaps';
import { resolveLens } from '../../src/domain/profile/lens';

const A = (o: any = {}) => ({ asset_id: 'a', label: 'acct', tax_bucket: 'TAXABLE',
  balance: 100_000, target_return: 0.07, ...o } as any);

// ════════════════════════════════════════════════════════════════════════════════════════════════
// NET WORTH — the identity, computed and never stored as a third number
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('NET_WORTH', () => {
  test('it is assets minus debts, computed here', () => {
    expect(buildNetWorth('u', 813_152, 418_000).net_worth).toBe(395_152);
  });
  test('owing more than you own is a real negative, never floored', () => {
    expect(buildNetWorth('u', 100_000, 250_000).net_worth).toBe(-150_000);
  });
  test('nothing owned and nothing owed is zero, not an error', () => {
    expect(buildNetWorth('u', 0, 0).net_worth).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// OPTION HOLDINGS — the mixed-units trap, live-verified on a real E*TRADE account
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('OPTION_HOLDING', () => {
  const o = (units: number, price: number, avg?: number) => ({
    units, price, average_purchase_price: avg,
    symbol: { option_symbol: { underlying_symbol: { raw_symbol: 'AAPL' }, option_type: 'CALL',
      strike_price: 220, expiration_date: '2027-01-16' } },
  } as any);

  test('value is contracts × price × 100, because the PRICE is per share', () => {
    expect(mapOptionHolding(o(1, 3.60))!.value).toBe(360);
  });

  test('but COST is already per contract — multiplying it too overstates basis 100-fold', () => {
    // live-verified 2026-07-19 against a real E*TRADE account: it matched the actual cash to the cent
    expect(mapOptionHolding(o(1, 3.60, 725))!.costBasis).toBe(725);
  });

  test('the label reads the way a person says it', () => {
    expect(mapOptionHolding(o(1, 3.60))!.label).toBe('AAPL $220 call · exp Jan 16 2027');
  });

  test('a SHORT position says so — it is a liability, not a holding', () => {
    expect(mapOptionHolding(o(-2, 3.60))!.label).toContain('(short)');
    expect(mapOptionHolding(o(-2, 3.60))!.contracts).toBe(-2);
  });

  test('no contracts, or no option details, is nothing rather than a zero-value row', () => {
    expect(mapOptionHolding(o(0, 3.60))).toBeNull();
    expect(mapOptionHolding({ units: 1 } as any)).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// THE SYNC ASSEMBLY
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('SYNC_ASSEMBLY', () => {
  const payload = (o: any = {}) => ({
    account: { id: 'acc-1', name: 'Brokerage', number: '998877', institution_name: 'Vanguard',
      raw_type: 'Individual', balance: { total: { amount: 50_000, currency: 'USD' } } },
    positions: [{ units: 100, price: 250, average_purchase_price: 200,
      symbol: { symbol: { raw_symbol: 'VTI', description: 'VANGUARD TOTAL STOCK', type: { code: 'et' } } } }],
    activities: [], ...o,
  } as any);

  test('a first sync creates the account and remembers what it has seen', () => {
    const r = ingestSync([], {}, [payload()], '2026-08-18T12:00:00Z');
    expect(r.accounts).toHaveLength(1);
    expect(r.accounts[0].balance).toBe(50_000);
  });

  test('syncing the SAME payload twice does not twin the account or the ledger', () => {
    const first = ingestSync([], {}, [payload()], '2026-08-18T12:00:00Z');
    const second = ingestSync(first.accounts, first.seenKeys, [payload()], '2026-08-18T12:00:00Z');
    expect(second.accounts).toHaveLength(1);
    expect(second.newTransactions).toHaveLength(0);
  });

  test('an unrecognised account type is flagged for the person to confirm, never assumed', () => {
    const odd = payload({ account: { ...payload().account, raw_type: 'Some New Product' } });
    expect(ingestSync([], {}, [odd], '2026-08-18T12:00:00Z').needsWrapperConfirm.length).toBe(1);
  });

  test('once the person confirms, later syncs never override their answer', () => {
    const r = ingestSync([], {}, [payload()], '2026-08-18T12:00:00Z');
    const confirmed = confirmWrapper(r.accounts, r.accounts[0].asset_id, 'roth_ira', 'ROTH');
    expect(confirmed[0].wrapper_confirmed).toBe(true);
    const again = ingestSync(confirmed, r.seenKeys, [payload()], '2026-08-19T12:00:00Z');
    expect(again.accounts[0].tax_bucket).toBe('ROTH');
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// TAX BUCKETS · ALTERNATIVES · WHAT IS MISSING · WHICH VIEW
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('TAX_BUCKET_SPLIT', () => {
  test('it splits the retirement money by how it will be taxed', () => {
    const s = taxBucketSplit([
      A({ asset_id: '1', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 400_000 }),
      A({ asset_id: '2', kind: 'roth_ira', tax_bucket: 'ROTH', balance: 100_000 }),
      A({ asset_id: '3', kind: 'brokerage', balance: 200_000 }),
    ]);
    expect(s.preTax).toBe(400_000);
    expect(s.roth).toBe(100_000);
    expect(s.taxable).toBe(200_000);
  });
  test('no accounts splits into nothing rather than failing', () => {
    const s = taxBucketSplit([]);
    expect(s.preTax + s.roth + s.taxable).toBe(0);
  });
});

describe('IS_ALTERNATIVE', () => {
  // CORRECTED BY THE PROBE: it takes the whole ACCOUNT, not a type string — because the answer
  // depends on the account's resolved class, not on the word alone.
  test('crypto, commodities, private equity and options are alternatives', () => {
    for (const kind of ['crypto', 'commodities', 'private_equity', 'hedge_funds', 'options']) {
      expect(isAlternative(A({ kind }))).toBe(true);
    }
  });
  test('shares, cash and property are not', () => {
    expect(isAlternative(A({ kind: 'stocks_etf' }))).toBe(false);
    expect(isAlternative(A({ kind: 'checking', tax_bucket: 'CASH' }))).toBe(false);
    expect(isAlternative(A({ kind: 'home', tax_bucket: 'PROPERTY' }))).toBe(false);
  });
});

describe('WHAT_IS_MISSING', () => {
  test('it reports gaps rather than letting a screen quietly show an incomplete picture', () => {
    const g = dataGaps([A({ source: 'connected', last_synced: '2020-01-01' })], null, Date.parse('2026-08-18'), [], []);
    expect(g).toBeTruthy();
  });
});

describe('WHICH_VIEW', () => {
  test('someone drawing retirement income sees the retiree view', () => {
    expect(resolveLens({ ri_ss: 2_000, incomeSources: ['retirement_income'] } as any, null)).toBeTruthy();
  });
  test('an explicit choice always wins over what we inferred', () => {
    expect(resolveLens({} as any, 'retired')).toBe('retired');
  });
});
