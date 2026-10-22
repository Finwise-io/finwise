// Ingest pins (design v2 §4): the broker's total is authoritative, activities are HISTORY ONLY
// (never applied — no double-count), dedupe survives re-sync, the user-confirmed wrapper is
// permanent, options itemize without changing totals, money-market never counts twice.
import { ingestSync, confirmWrapper, stAssetId, type AccountSyncPayload } from './ingest';
import type { StAccount } from './snaptrade';

const NOW = '2026-07-18T12:00:00.000Z';
const acct = (over: Partial<StAccount> = {}): StAccount => ({
  id: 'acc-1', brokerage_authorization: 'conn-1', name: 'Robinhood Individual',
  number: '998877665', institution_name: 'Robinhood', raw_type: 'Individual',
  balance: { total: { amount: 50000, currency: 'USD' } },
  sync_status: { holdings: { initial_sync_completed: true, last_successful_sync: '2026-07-18T06:00:00Z' } },
  ...over,
});
const payload = (over: Partial<AccountSyncPayload> = {}): AccountSyncPayload => ({
  account: acct(), balancesCash: 1200,
  positions: [
    { symbol: { id: 'u-vti', raw_symbol: 'VTI', description: 'Vanguard Total', type: { code: 'et' } } as any, units: 100, price: 250, average_purchase_price: 200 },
    { symbol: { id: 'u-spaxx', raw_symbol: 'SPAXX', type: { code: 'oef' } } as any, units: 200, price: 1, cash_equivalent: true },
  ],
  activities: [
    { id: 'a1', type: 'DIVIDEND', trade_date: '2026-07-10', amount: 55, symbol: { id: 'u-vti', raw_symbol: 'VTI' } as any },
    { id: 'a2', type: 'BUY', trade_date: '2026-07-01', units: 10, price: 240, amount: -2400, symbol: { id: 'u-vti', raw_symbol: 'VTI' } as any },
  ],
  ...over,
});

test('the broker total IS the balance; the cash is net of the money-market fund, which is a holding — classed Cash by the broker\'s flag (DEC-2159 / his 2026-10-20 words); positions carry the mark', () => {
  const r = ingestSync([], {}, [payload()], NOW);
  const a = r.accounts.find((x) => x.asset_id === stAssetId('acc-1'))!;
  expect(a.balance).toBe(50000);                    // authority rule — never recomputed from parts
  expect(a.cash_balance).toBe(1000);                // 1200 cash − 200 SPAXX: the broker counts the fund inside its cash figure
  expect(a.positions!.map((x) => x.ticker)).toEqual(['VTI', 'SPAXX']);   // the fund is a holding (owner, DEC-0051) — it used to be dropped
  expect(a.positions![1].asset_class).toBe('cash');                  // was 'stock_etf' (DEC-0051); the broker flags it cash-equivalent
  expect((a.positions![1] as any).cash_equivalent).toBe(true);        // the broker's own flag and type are kept on the holding
  expect((a.positions![1] as any).broker_type).toBe('oef');
  expect(a.positions![0].ticker).toBe('VTI');
  expect(a.positions![0].last_price).toBe(250);
  expect(a.source).toBe('connected');
  expect(a.mask).toBe('••7665');
  expect(a.last_synced).toBe('2026-07-18T06:00:00Z');
});

test('activities are HISTORY ONLY — appended with source connected, never applied to balances', () => {
  const r = ingestSync([], {}, [payload()], NOW);
  expect(r.newTransactions).toHaveLength(2);
  const div = r.newTransactions.find((t) => t.type === 'DIVIDEND')!;
  expect(div.source).toBe('connected');
  expect(div.amount).toBe(55);
  // the account balance stayed the broker's number — no ledger math touched it
  expect(r.accounts[0].balance).toBe(50000);
});

test('re-syncing the same window adds NOTHING (id churn included)', () => {
  const first = ingestSync([], {}, [payload()], NOW);
  const churned = payload({ activities: [
    { id: 'REPROCESSED-9', type: 'DIVIDEND', trade_date: '2026-07-10', amount: 55, symbol: { id: 'u-vti', raw_symbol: 'VTI' } as any },
  ] });
  const second = ingestSync(first.accounts, first.seenKeys, [churned], NOW);
  expect(second.newTransactions).toHaveLength(0);
  expect(second.accounts).toHaveLength(1);          // upsert, not a twin
});

test('an ambiguous raw_type flags wrapper-confirm; a USER-confirmed wrapper survives every later sync', () => {
  const weird = payload({ account: acct({ raw_type: 'Special Custody 7' }) });
  const r1 = ingestSync([], {}, [weird], NOW);
  expect(r1.needsWrapperConfirm).toEqual([stAssetId('acc-1')]);
  const confirmed = confirmWrapper(r1.accounts, stAssetId('acc-1'), 'roth_ira', 'ROTH');
  const r2 = ingestSync(confirmed, r1.seenKeys, [weird], NOW);
  expect(r2.accounts[0].tax_bucket).toBe('ROTH');   // the sync did NOT override the human
  expect(r2.needsWrapperConfirm).toHaveLength(0);   // and stops asking
});

test('options itemize as display rows; the total is untouched (their value is already inside it)', () => {
  const withOpts = payload({ optionPositions: [
    { symbol: { option_symbol: { option_type: 'CALL', strike_price: 220, expiration_date: '2027-01-16', underlying_symbol: { raw_symbol: 'AAPL' } } }, units: 2, price: 6.5 },
  ] });
  const r = ingestSync([], {}, [withOpts], NOW);
  const a = r.accounts[0];
  expect(a.option_holdings).toHaveLength(1);
  expect(a.option_holdings![0].label).toBe('AAPL $220 call · exp Jan 16 2027');
  expect(a.option_holdings![0].value).toBe(1300);
  expect(a.option_holdings![0].multiplier).toBe(100);   // the shares per contract travel with the row (DEC-4646)
  expect(a.balance).toBe(50000);                    // never balance + option value
});

test('a mini option is stored at 10 shares a contract, as the broker says (DEC-4646, 2026-10-12)', () => {
  const r = ingestSync([], {}, [payload({ optionPositions: [
    { symbol: { option_symbol: { option_type: 'CALL', strike_price: 220, expiration_date: '2027-01-16', underlying_symbol: { raw_symbol: 'AAPL' }, is_mini_option: true } }, units: 2, price: 6.5 },
  ] })], NOW);
  expect(r.accounts[0].option_holdings![0]).toMatchObject({ value: 130, multiplier: 10 });
});

test('SPLIT arrives as a visible ADJUSTMENT row; SKIP types never reach the ledger', () => {
  const r = ingestSync([], {}, [payload({ activities: [
    { id: 's1', type: 'SPLIT', trade_date: '2026-06-10', symbol: { id: 'u-vti', raw_symbol: 'VTI' } as any },
    { id: 'x1', type: 'OPTIONEXPIRATION', trade_date: '2026-06-11' },
  ] })], NOW);
  expect(r.newTransactions).toHaveLength(1);
  expect(r.newTransactions[0].type).toBe('ADJUSTMENT');
});

test('a closed account is kept and marked, never silently dropped', () => {
  const r = ingestSync([], {}, [payload({ account: acct({ status: 'closed' }) })], NOW);
  expect(r.accounts[0].status).toBe('closed');
});

// ── AUDIT FIXES 2026-07-18 (design-vs-code + adversarial reviews) ──────────────────────────────
describe('audit fixes', () => {
  test('P0 merge gate: a manual twin (same institution + mask) is ABSORBED, never doubled', () => {
    const manual = [{ asset_id: 'ast-manual1', label: 'My Robinhood', institution: 'Robinhood', kind: 'brokerage',
      tax_bucket: 'TAXABLE' as const, balance: 51000, target_return: 0.08, mask: '••7665', retirement_pct: 80, source: 'manual' as const }];
    const r = ingestSync(manual as any, {}, [payload()], NOW);
    expect(r.accounts).toHaveLength(1);                              // absorbed, not a sibling
    expect(r.accounts[0].asset_id).toBe('ast-manual1');              // keeps its id (ledger refs live on)
    expect(r.accounts[0].balance).toBe(50000);                       // broker total takes over
    expect(r.accounts[0].retirement_pct).toBe(80);                   // earmark survives the absorption
    expect(r.accounts[0].snaptrade_account_id).toBe('acc-1');        // future syncs find it directly
    // and the NEXT sync hits the same row again
    const r2 = ingestSync(r.accounts, r.seenKeys, [payload()], NOW);
    expect(r2.accounts).toHaveLength(1);
  });

  test('currency guard: a non-USD broker total never masquerades as dollars', () => {
    const cad = payload({ account: acct({ balance: { total: { amount: 68000, currency: 'CAD' } } }) });
    const r = ingestSync([], {}, [cad], NOW);
    expect(r.accounts[0].balance).toBe(0);                           // no prior → 0, never 68000 "dollars"
  });

  test('sell-off truth: a PROVIDED-but-empty positions list clears stale holdings; a missing fetch keeps them', () => {
    const first = ingestSync([], {}, [payload()], NOW);
    const soldOut = ingestSync(first.accounts, first.seenKeys, [payload({ positions: [] })], NOW);
    expect(soldOut.accounts[0].positions ?? []).toHaveLength(0);     // sold out — stale rows would lie
    const fetchFailed = ingestSync(first.accounts, first.seenKeys, [{ account: acct() }], NOW);
    expect(fetchFailed.accounts[0].positions?.length ?? 0).toBeGreaterThan(0);   // no data ≠ no holdings
  });

  test('option-trade cash is exact: shares×price equals the broker signed amount', () => {
    const r = ingestSync([], {}, [payload({ activities: [
      { id: 'o1', type: 'BUY', option_type: 'BUY_TO_OPEN', trade_date: '2026-07-02', units: 2, price: 6.5, amount: -1300 },
    ] })], NOW);
    const t = r.newTransactions.find((x) => x.note?.includes('option purchase'))!;
    expect(t.type).toBe('BUY');                                      // internal move, not a fake flow
    expect((t.shares ?? 0) * (t.price ?? 0)).toBe(1300);             // ledger math shows the true cash
  });

  test('shares transferred in or out keep which way they went — the type alone cannot say (2026-10-04)', () => {
    const r = ingestSync([], {}, [payload({ activities: [
      { id: 'x1', type: 'EXTERNAL_ASSET_TRANSFER_IN', trade_date: '2026-06-02', units: 100, price: 120, amount: 0, symbol: { id: 'u-vti', raw_symbol: 'VTI' } as any },
      { id: 'x2', type: 'EXTERNAL_ASSET_TRANSFER_OUT', trade_date: '2026-06-09', units: -40, price: 125, amount: 0, symbol: { id: 'u-vti', raw_symbol: 'VTI' } as any },
    ] })], NOW);
    const moved = r.newTransactions.filter((x) => x.type === 'TRANSFER_IN_KIND');
    expect(moved.map((t) => [t.date, t.direction, t.shares])).toEqual([['2026-06-02', 'IN', 100], ['2026-06-09', 'OUT', 40]]);
    // every other kind of row carries none
    expect(r.newTransactions.filter((x) => x.type !== 'TRANSFER_IN_KIND').every((t) => t.direction == null)).toBe(true);
  });

  test('a share transfer synced BEFORE the direction was stored gets it on the next sync — and is not imported twice', () => {
    const activity = { id: 'x1', type: 'EXTERNAL_ASSET_TRANSFER_OUT', trade_date: '2026-06-09', units: -40, price: 125, amount: 0, symbol: { id: 'u-vti', raw_symbol: 'VTI' } as any };
    const first = ingestSync([], {}, [payload({ activities: [activity] })], NOW);
    expect(first.directionOf).toEqual([]);                           // new rows carry their own direction
    const again = ingestSync(first.accounts, first.seenKeys, [payload({ activities: [activity] })], NOW);
    expect(again.newTransactions).toHaveLength(0);                   // already stored
    expect(again.directionOf).toEqual([{ account_id: String(first.newTransactions[0].account_id), date: '2026-06-09', ticker: 'VTI', shares: 40, direction: 'OUT' }]);
  });

  // HIS RULING, 2026-09-30 (master Q12): "user entry stays even if it is not in the import file. If user modify
  // cost or quantity post import/linked from institution, cost basis should not be overwritten in future sync
  // as quantity, price and market value can change with time but not cost."
  test('a cost the person set on a linked holding survives the next sync; the shares and the price are still the broker’s', () => {
    const first = ingestSync([], {}, [payload()], NOW);
    const id = stAssetId('acc-1');
    const mine = first.accounts.map((a) => a.asset_id !== id ? a : { ...a, positions: a.positions!.map((p: any) =>
      ({ ...p, cost_source: 'user', lots: [{ lot_id: 'l', shares: 100, cost_per_share: 180, purchase_date: '2024-03-01' }] })) });
    // the broker now reports more shares at a new price, and still says the average cost was $200
    const next = ingestSync(mine, first.seenKeys, [payload({ positions: [
      { symbol: { id: 'u-vti', raw_symbol: 'VTI', description: 'Vanguard Total', type: { code: 'et' } } as any, units: 120, price: 260, average_purchase_price: 200 }] })], NOW);
    const p: any = next.accounts.find((a) => a.asset_id === id)!.positions![0];
    expect(p.lots.reduce((t: number, l: any) => t + l.shares, 0)).toBe(120);     // quantity can change with time
    expect(p.last_price).toBe(260);                                                 // so can price
    expect(p.lots.every((l: any) => l.cost_per_share === 180)).toBe(true);          // cost cannot: theirs, not $200
    expect(p.cost_source).toBe('user');                                             // and it stays theirs on the sync after
  });

  test('a holding the person never touched takes the broker’s cost, as it always did', () => {
    const first = ingestSync([], {}, [payload()], NOW);
    const next = ingestSync(first.accounts, first.seenKeys, [payload()], NOW);
    expect((next.accounts[0].positions![0] as any).lots[0].cost_per_share).toBe(200);
  });

  test('a holding the person added to a linked account stays when the broker’s list does not carry it', () => {
    const first = ingestSync([], {}, [payload()], NOW);
    const id = stAssetId('acc-1');
    const added = { position_id: 'mine', ticker: 'PRIVCO', added_by: 'user', cost_source: 'user', lots: [{ lot_id: 'l', shares: 10, cost_per_share: 50, purchase_date: '2025-01-01' }] };
    const mine = first.accounts.map((a) => a.asset_id !== id ? a : { ...a, positions: [...a.positions!, added as any] });
    const next = ingestSync(mine, first.seenKeys, [payload()], NOW);
    const tickers = next.accounts.find((a) => a.asset_id === id)!.positions!.map((p) => p.ticker);
    expect(tickers).toEqual(['VTI', 'SPAXX', 'PRIVCO']);   // SPAXX: a money-market fund is a holding (2026-10-05)
    // a broker holding that is simply gone is still dropped: sold out, and a stale row would lie
    const soldOut = ingestSync(mine, first.seenKeys, [payload({ positions: [] })], NOW);
    expect(soldOut.accounts.find((a) => a.asset_id === id)!.positions!.map((p) => p.ticker)).toEqual(['PRIVCO']);
  });

  // HIS RULING, 2026-09-30 (master Q11): when nothing says what a holding is — "Refuse the line and ask".
  test('a holding nothing can class is marked as asked; one with evidence is not; the person’s answer ends the asking', () => {
    const unknown = { symbol: { id: 'u-zz', raw_symbol: 'ZZZZ', description: '', type: { code: '' } } as any, units: 10, price: 5, average_purchase_price: 4 };
    const first = ingestSync([], {}, [payload({ positions: [...payload().positions!, unknown] })], NOW);
    const positions: any[] = first.accounts[0].positions as any;
    expect(positions.find((p) => p.ticker === 'ZZZZ').class_asked).toBe(true);
    expect(positions.find((p) => p.ticker === 'VTI').class_asked).toBeUndefined();        // the broker says it is an ETF
    // they say what it is: the answer stays through the next sync, and nothing asks again
    const answered = first.accounts.map((a) => ({ ...a, positions: (a.positions as any[]).map((p) => p.ticker === 'ZZZZ' ? { ...p, asset_class: 'bond', class_source: 'user', class_asked: undefined } : p) }));
    const next = ingestSync(answered as any, first.seenKeys, [payload({ positions: [...payload().positions!, unknown] })], NOW);
    const z: any = (next.accounts[0].positions as any[]).find((p) => p.ticker === 'ZZZZ');
    expect([z.asset_class, z.class_source, z.class_asked]).toEqual(['bond', 'user', undefined]);
  });

  // ── LIVE-VERIFIED against a real E*TRADE connection, 2026-07-19 ─────────────────────────────
  test('broker sells carry NEGATIVE units — the ledger stores positive shares or realized P/L never sees a single connected sale', () => {
    const r = ingestSync([], {}, [payload({ activities: [
      { id: 's1', type: 'SELL', trade_date: '2026-06-27', units: -50, price: 8.1, amount: 402.75,
        symbol: { id: 'u-gnr', raw_symbol: 'GNR' } as any },
    ] })], NOW);
    const t = r.newTransactions.find((x) => x.type === 'SELL')!;
    expect(t.shares).toBe(50);                                       // |units| — direction lives in the type
    expect((t.shares ?? 0) * (t.price ?? 0)).toBeCloseTo(402.75, 2); // exact cash, fees folded in
  });

  test('bond math: per-$100-face prices normalize to the true cash, so a redemption gain is $500 — not 100× that', () => {
    const r = ingestSync([], {}, [payload({ activities: [
      // buy $100k face of a T-bill at 99.5 (broker cash −99,500), redeem at maturity for 100,000
      { id: 'b1', type: 'BUY', trade_date: '2026-01-05', units: 100000, price: 99.5, amount: -99500,
        symbol: { id: 'u-tbill', raw_symbol: '912796ZZ0' } as any },
      { id: 'b2', type: 'REDEMPTION', trade_date: '2026-05-05', units: -100000, amount: 100000,
        symbol: { id: 'u-tbill', raw_symbol: '912796ZZ0' } as any },
    ] })], NOW);
    const sell = r.newTransactions.find((x) => x.type === 'SELL')!;
    expect(sell.note).toContain('redeemed at maturity');
    const acctId = r.accounts[0].asset_id;
    const { realizedFromLedger } = require('../../domain/performance/realized');
    const res = realizedFromLedger(r.newTransactions, { accountId: acctId });
    expect(res.realizedAllTime).toBe(500);                           // the honest gain, to the dollar
    expect(res.sellsCounted).toBe(1);
  });
});

// B47 finding 3 (founder's Vanguard connection): the broker reported NO usable total while the
// positions carried $132k — the account read $0 on the detail hero and in the by-institution sums.
// The authority rule gains the honesty fallback: derive from holdings when the total is absent/zero.
describe('missing broker total (Vanguard class)', () => {
  test('total absent + positions present → balance derives from marks + sleeve (never $0)', () => {
    const r = ingestSync([], {}, [payload({
      account: acct({ id: 'acc-vg', institution_name: 'Vanguard', name: 'Vanguard Brokerage', balance: { total: null } }),
    })], NOW);
    const a = r.accounts.find((x) => x.asset_id === stAssetId('acc-vg'))!;
    // VTI 100 × $250 = 25,000 · SPAXX 200 × $1 = 200 · uninvested cash 1,000 (the broker's 1,200 less the fund).
    // It read 26,000 until 2026-10-05: the fund was dropped from the holdings AND taken out of the cash, so it was in neither.
    expect(a.balance).toBeGreaterThan(0);
    expect(a.balance).toBeCloseTo(25000 + 200 + 1000, 0);
  });
  test('total reported as ZERO with real positions → derived wins (a $132k account never reads $0)', () => {
    const r = ingestSync([], {}, [payload({
      account: acct({ id: 'acc-vg0', balance: { total: { amount: 0, currency: 'USD' } } }),
    })], NOW);
    const a = r.accounts.find((x) => x.asset_id === stAssetId('acc-vg0'))!;
    expect(a.balance).toBeGreaterThan(0);
  });
  test('a genuinely empty account stays honestly zero; a real broker total still stands', () => {
    const r = ingestSync([], {}, [payload({
      account: acct({ id: 'acc-empty', balance: { total: { amount: 0, currency: 'USD' } } }),
      positions: [], balancesCash: 0,
    })], NOW);
    expect(r.accounts.find((x) => x.asset_id === stAssetId('acc-empty'))!.balance).toBe(0);
    const r2 = ingestSync([], {}, [payload()], NOW);
    expect(r2.accounts[0].balance).toBe(50000);   // authority unchanged when the broker speaks
  });
});
