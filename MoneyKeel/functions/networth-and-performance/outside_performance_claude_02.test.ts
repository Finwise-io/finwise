/* THE OUTSIDE CASES, RUN AGAINST THE APP — batch "performance 02", written by Claude (outside judge) from the
 * cards alone (MK-PF-F-001..007, F-012, F-028, F-031..033 — one holding's lot arithmetic).
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/performance_02.claude.json (60 cases).
 * The cards the judge saw: to-send/moneykeel_brief_performance_02_claude-code_v02.md. Every expected answer below is
 * the judge's, copied as written; only its plain input names are mapped onto the app's fields. A case the app fails
 * is marked, never fixed by changing the answer here. Results, case by case:
 * MoneyKeel/documents/audit/outside-test-cases/returned/results/performance_claude_02_results.json
 *
 * Markers: `// FINDING:` the app fails a correct expectation (test.failing) · `// BRIEF WRONG:` the judge's own
 * expectation is wrong (test.failing, its number kept) · `// UNCLEAR:` the judge wrote RULE UNCLEAR, no decision
 * settles it, so the app's current behaviour is asserted · `// BLOCKED:` the case cannot be handed to the function.
 *
 * INPUT NAMES MAPPED (the app's fields, not the answers):
 *   today → capGains' / realizedFromLedger's `now` (a local Date at that calendar day). Other functions take no date.
 *   kind words → ASSET_KINDS ids: "stock" 'stocks_etf', "option" 'options', "crypto" 'crypto', "commodity"
 *   'commodities', "alternative" 'private_equity'; no kind → none. stated_multiplier → Position.multiplier; unit →
 *   Position.unit. purchases [{shares, cost_per_share, date}] / purchases_shares [n] → Position.lots (a missing figure
 *   handed over as the judge wrote it: null). A lot "cost_known: false" with cost 0 → cost_per_share 0 (the app's Lot
 *   has no other way to say a cost is unknown). price → the function's `price` argument; "shares" + "price" for
 *   marketValue → one lot of that many shares.
 *   realizedFromLedger records: buy 'BUY', sale 'SELL', opening position 'OPENING_POSITION'; account → account_id;
 *   the ticker and account asked for → opts.ticker / opts.accountId.
 *   quantityWithUnit is called with the app's default format (String). "shown" strings are screen formatting and are
 *   not asserted.
 * TOLERANCES: exact arithmetic compared with toBe; where floating multiplication is involved, toBeCloseTo to 9 decimal
 * places (1e-9 of a dollar or of a share) — and to the judge's own stated figure at the precision the judge stated.
 */
import {
  totalShares, contractMultiplier, costBasis, marketValue, unrealizedGain, capGains, totalROI,
  earliestPurchaseDate, quantityUnit, quantityWithUnit, type Position,
} from '../../../src/domain/performance';
import { realizedFromLedger, saleShortOfPurchasesSentence } from '../../../src/domain/performance/realized';
import { theHolding } from './holding';

const NOW = (iso = '2026-10-10') => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const refuses = (v: unknown) => expect(v == null).toBe(true);
const KIND: Record<string, string> = { stock: 'stocks_etf', option: 'options', crypto: 'crypto', commodity: 'commodities', alternative: 'private_equity' };
const pos = (o: { kind?: string | null; multiplier?: number | null; unit?: any; lots?: { shares: any; cost?: any; date?: any }[]; ticker?: string }): Position => ({
  position_id: 'p1', ticker: o.ticker ?? 'X', kind: o.kind ? KIND[o.kind] : undefined,
  multiplier: o.multiplier ?? undefined, unit: o.unit ?? undefined,
  lots: (o.lots ?? []).map((l, i) => ({ lot_id: `l${i}`, shares: l.shares, cost_per_share: l.cost as any, purchase_date: l.date as any })),
} as Position);
const sharesOnly = (shares: any[]) => pos({ lots: shares.map((s) => ({ shares: s, cost: 0 })) });
const THREE_LOTS = [{ shares: 12.5, cost: 187.43 }, { shares: 7.25, cost: 201.16 }, { shares: 30, cost: 172.885 }];

describe('MK-PF-F-001 totalShares — five cases', () => {
  test('easy · Two purchases of one stock', () => { expect(totalShares(sharesOnly([10, 15]))).toBe(25); });
  test('easy · Fractional crypto coins', () => { expect(totalShares(sharesOnly([0.25, 0.125]))).toBe(0.375); });
  test('complex · Broker-linked lots with long decimals', () => { expect(totalShares(sharesOnly([12.3456, 7.891, 30.0001]))).toBeCloseTo(50.2367, 9); });
  test('complex · Option contracts are counted as contracts, not as 100 shares each', () => {
    expect(totalShares(pos({ kind: 'option', multiplier: 100, lots: [{ shares: 3 }, { shares: 2 }] }))).toBe(5);
  });
  // FINDING: app gives 40, expected REFUSES — a purchase with no share count is counted as 0 shares (`l.shares || 0`),
  // so the total looks complete when it is not (tenet 3, DEC-3523: unknown is not zero).
  // FIXED 2026-10-11 (outside review Claude Performance, DEC-3523 tenet 3): a purchase with no share count makes the total unknown (null).
  test('edge · One purchase arrives with no share count', () => { refuses(totalShares(sharesOnly([40, null]))); });
});

describe('MK-PF-F-031 contractMultiplier — five cases', () => {
  test('easy · A share of stock', () => { expect(contractMultiplier(pos({ kind: 'stock' }))).toBe(1); });
  test('easy · An option with nothing stated', () => { expect(contractMultiplier(pos({ kind: 'option' }))).toBe(100); });
  test('complex · A mini option the broker states as 10', () => { expect(contractMultiplier(pos({ kind: 'option', multiplier: 10 }))).toBe(10); });
  test('complex · An adjusted contract after a special dividend delivers 102 shares', () => { expect(contractMultiplier(pos({ kind: 'option', multiplier: 102 }))).toBe(102); });
  test('edge · An option whose stated multiplier is exactly zero', () => {
    expect(contractMultiplier({ kind: 'options', multiplier: 0 })).toBe(100);
  });
});

describe('MK-PF-F-002 costBasis — five cases', () => {
  test('easy · One purchase of a stock', () => { expect(costBasis(pos({ kind: 'stock', lots: [{ shares: 10, cost: 50 }] }))).toBe(500); });
  test('easy · Option premium times 100', () => { expect(costBasis(pos({ kind: 'option', lots: [{ shares: 2, cost: 3.5 }] }))).toBe(700); });
  test('complex · Three lots bought at different prices', () => { expect(costBasis(pos({ kind: 'stock', lots: THREE_LOTS }))).toBeCloseTo(8987.835, 9); });
  test('complex · Adjusted option contract with two purchases', () => {
    expect(costBasis(pos({ kind: 'option', multiplier: 102, lots: [{ shares: 4, cost: 1.37 }, { shares: 1, cost: 2.05 }] }))).toBeCloseTo(768.06, 9);
  });
  // FINDING: app gives 900, expected REFUSES — a lot holding 10 shares with no cost on record adds $0 (`cost_per_share
  // || 0`), so the total looks complete (tenet 3, DEC-3523). The figure it feeds, MK-NW-M-032, refuses with no price paid.
  // FIXED 2026-10-11 (outside review Claude Performance, DEC-3523 tenet 3): shares with no cost make what was paid unknown (null).
  test('edge · One lot transferred in with no cost on record', () => {
    refuses(costBasis(pos({ kind: 'stock', lots: [{ shares: 20, cost: 45 }, { shares: 10, cost: null }] })));
  });
});

// RE-POINTED 2026-10-12 by DEC-4642 (his approval: "3,4, 8-approved"): MK-PF-F-003 avgCost left the code — no screen
// called it; the Holding page's "Price paid (average)" is MK-NW-O-006 theHolding's avgPaidPerShare, the same arithmetic
// (what was paid ÷ (shares × the contract multiplier)). The judge's five cases, answers unchanged, now run on it.
const avgCost = (p: Position) => theHolding({ position: p, accountId: 'a', price: null, transactions: [] }).avgPaidPerShare;
describe('MK-PF-F-003 avgCost — five cases (on MK-NW-O-006 avgPaidPerShare since 2026-10-12)', () => {
  test('easy · Two equal lots at different prices', () => { expect(avgCost(pos({ kind: 'stock', lots: [{ shares: 10, cost: 50 }, { shares: 10, cost: 70 }] }))).toBe(60); });
  test('easy · Option average comes back per share', () => { expect(avgCost(pos({ kind: 'option', lots: [{ shares: 2, cost: 3.5 }] }))).toBe(3.5); });
  test('complex · Three lots, kept unrounded until shown', () => { expect(avgCost(pos({ kind: 'stock', lots: THREE_LOTS }))).toBeCloseTo(180.66, 9); });
  test('complex · Adjusted option contract, two purchases', () => {
    expect(avgCost(pos({ kind: 'option', multiplier: 102, lots: [{ shares: 4, cost: 1.37 }, { shares: 1, cost: 2.05 }] }))).toBeCloseTo(1.506, 9);
  });
  // FINDING: app gives 0, expected REFUSES — with no shares held there is no average price; $0.00 reads as "paid
  // nothing" (tenet 3, DEC-3523).
  // FIXED 2026-10-11 (outside review Claude Performance, DEC-3523 tenet 3): no shares held, no average (null).
  test('edge · Every share sold, no shares held', () => { refuses(avgCost(pos({ kind: 'stock', lots: [{ shares: 0, cost: 150 }] }))); });
});

describe('MK-PF-F-004 marketValue — five cases', () => {
  test('easy · Ten shares at fifty dollars', () => { expect(marketValue(pos({ kind: 'stock', lots: [{ shares: 10 }] }), 50)).toBe(500); });
  test('easy · Three option contracts', () => { expect(marketValue(pos({ kind: 'option', lots: [{ shares: 3 }] }), 2.1)).toBeCloseTo(630, 9); });
  test('complex · Three-lot ETF at a broker price', () => { expect(marketValue(pos({ kind: 'stock', lots: THREE_LOTS }), 213.47)).toBeCloseTo(10620.1325, 9); });
  test('complex · Fractional bitcoin at a price with cents', () => {
    expect(marketValue(pos({ kind: 'crypto', lots: [{ shares: 0.37415 }] }), 61842.17)).toBeCloseTo(23138.2479055, 9);
  });
  // FINDING: app gives 0, expected REFUSES — 40 shares with no price are worth something unknown, not $0 (tenet 3,
  // DEC-3523). buildPerformance passes this 0 into the row's marketValue (src/domain/performance/index.ts:837).
  // FIXED 2026-10-11 (outside review Claude Performance, DEC-3523 tenet 3): shares with no price are worth something unknown (null).
  test('edge · A holding with shares and no price', () => { refuses(marketValue(pos({ kind: 'stock', lots: [{ shares: 40 }] }), null)); });
});

describe('MK-PF-F-005 unrealizedGain — five cases', () => {
  test('easy · A simple gain', () => { expect(unrealizedGain(pos({ lots: [{ shares: 10, cost: 50 }] }), 60)).toBe(100); });
  test('easy · A simple loss', () => { expect(unrealizedGain(pos({ lots: [{ shares: 10, cost: 50 }] }), 40)).toBe(-100); });
  test('complex · Three lots at a broker price', () => { expect(unrealizedGain(pos({ lots: THREE_LOTS }), 213.47)).toBeCloseTo(1632.2975, 9); });
  test('complex · Adjusted option bought twice, now worth less', () => {
    expect(unrealizedGain(pos({ kind: 'option', multiplier: 102, lots: [{ shares: 4, cost: 1.37 }, { shares: 1, cost: 2.05 }] }), 0.85)).toBeCloseTo(-334.56, 9);
  });
  // FINDING: app gives 0, expected REFUSES — with no price the gain is unknown; $0 says "no gain" (tenet 3, DEC-3523).
  // FIXED 2026-10-11 (outside review Claude Performance, DEC-3523 tenet 3): no price, no gain to state (null).
  test('edge · No price for a holding that has shares', () => { refuses(unrealizedGain(pos({ lots: [{ shares: 40, cost: 25 }] }), null)); });
});

describe('MK-PF-F-006 capGains — five cases', () => {
  const split = (c: { longGain: number | null; shortGain: number | null; totalGain: number | null }) => [c.longGain, c.shortGain, c.totalGain];
  test('easy · Held two years: all long-term', () => {
    expect(split(capGains(pos({ lots: [{ date: '2024-05-01', shares: 10, cost: 100 }] }), 150, NOW()))).toEqual([500, 0, 500]);
  });
  test('easy · Held four months at a loss: short-term', () => {
    expect(split(capGains(pos({ lots: [{ date: '2026-06-01', shares: 10, cost: 100 }] }), 90, NOW()))).toEqual([0, -100, -100]);
  });
  test('complex · Three lots, one held exactly a year to the day', () => {
    const c = capGains(pos({ lots: [{ date: '2025-10-10', shares: 12.5, cost: 187.43 }, { date: '2025-10-09', shares: 7.25, cost: 201.16 }, { date: '2026-03-02', shares: 30, cost: 172.885 }] }), 213.47, NOW());
    expect(c.longGain).toBeCloseTo(89.2475, 9);
    expect(c.shortGain).toBeCloseTo(1543.05, 9);
    expect(c.totalGain).toBeCloseTo(1632.2975, 9);
  });
  // FINDING: app gives { long 1,320, short 0, total 1,320 }, expected long 1,320, short REFUSES, total REFUSES — the lot
  // with no cost on record (stored as 0) is skipped, so its 50 shares vanish from the split and the total disagrees
  // with unrealizedGain for the same holding (tenet 3, DEC-3523; tenet 4).
  // FIXED 2026-10-11 (outside review Claude Performance, DEC-3523 tenets 3 and 4): the lot with no cost makes its part (short) and the total unknown.
  test('complex · A lot transferred in with no basis', () => {
    const c = capGains(pos({ lots: [{ date: '2023-04-17', shares: 100, cost: 42.1 }, { date: '2026-01-20', shares: 50, cost: 0 }] }), 55.3, NOW());
    expect(c.longGain).toBeCloseTo(1320, 9);
    refuses(c.shortGain); refuses(c.totalGain);
  });
  test('edge · Bought on the leap day, today is 1 March the next year', () => {
    expect(split(capGains(pos({ lots: [{ date: '2024-02-29', shares: 10, cost: 100 }] }), 130, NOW('2025-03-01')))).toEqual([300, 0, 300]);
  });
});

describe('MK-PF-F-007 totalROI — five cases', () => {
  test('easy · One lot up twenty percent', () => { expect(totalROI(pos({ lots: [{ date: '2026-01-05', shares: 10, cost: 50 }] }), 60)!).toBeCloseTo(0.2, 12); });
  test('easy · No price: no return', () => { refuses(totalROI(pos({ lots: [{ date: '2026-01-05', shares: 10, cost: 50 }] }), null)); });
  // BRIEF WRONG: 0.30 — right is 0.155556 (700 ÷ 4,500) because this figure is the return ON COST of one holding, which
  // DEC-1669 itself sets apart: "'Return on cost' on one holding is a different question and keeps its own name." It is
  // printed beside the gain since purchase, not as a window return. (Checked 2026-10-12: a holding bought inside the
  // window gets its window return from returnSincePurchases, time-weighted from purchase to purchase, not from this figure.)
  test.failing('complex · Bought twice at different prices', () => {
    expect(totalROI(pos({ lots: [{ date: '2026-01-15', shares: 10, cost: 200 }, { date: '2026-06-15', shares: 10, cost: 250 }] }), 260)!).toBeCloseTo(0.3, 12);
  });
  test('complex · Adjusted option, one purchase', () => {
    expect(totalROI(pos({ kind: 'option', multiplier: 102, lots: [{ date: '2026-07-20', shares: 3, cost: 2.4 }] }), 3.15)!).toBeCloseTo(0.3125, 12);
  });
  test('edge · Cost of zero', () => { refuses(totalROI(pos({ lots: [{ date: '2025-12-01', shares: 25, cost: 0 }] }), 40)); });
});

describe('MK-PF-F-012 earliestPurchaseDate — five cases', () => {
  const dated = (dates: any[]) => pos({ lots: dates.map((d) => ({ shares: 1, cost: 1, date: d })) });
  test('easy · Two dated lots', () => { expect(earliestPurchaseDate(dated(['2024-03-01', '2025-07-15']))).toBe('2024-03-01'); });
  test('easy · No lots at all', () => { refuses(earliestPurchaseDate(dated([]))); });
  test('complex · Lots out of order, one undated', () => { expect(earliestPurchaseDate(dated(['2025-11-03', null, '2023-08-22', '2024-01-09']))).toBe('2023-08-22'); });
  test('complex · Blank and placeholder dates from a broker', () => { expect(earliestPurchaseDate(dated(['', 'pending', '2022-06-30']))).toBe('2022-06-30'); });
  test('edge · Every lot undated', () => { refuses(earliestPurchaseDate(dated([null, null]))); });
});

describe('MK-PF-F-028 realizedFromLedger — five cases', () => {
  const T: Record<string, string> = { buy: 'BUY', sale: 'SELL', 'opening position': 'OPENING_POSITION' };
  // `kind` is the judge's own input for the holding asked about ("kind": "option"); it is handed over as the
  // holding the caller names (mapping completed 2026-10-11 — no expected answer changed)
  const run = (ticker: string, account: string, recs: any[], now = NOW(), kind?: string) => {
    const r = realizedFromLedger(recs.map((x, i) => ({ id: `t${i}`, type: T[x.type], date: x.date, ticker, account_id: x.account ?? account, shares: x.shares, price: x.price, amount: 0 })) as any,
      { ticker, accountId: account, now, ...(kind ? { holding: { kind: KIND[kind] } } : {}) });
    return r;
  };
  test('easy · One buy, one sale', () => {
    expect(run('MSFT', 'Brokerage', [{ type: 'buy', date: '2026-02-01', shares: 10, price: 50 }, { type: 'sale', date: '2026-08-01', shares: 10, price: 60 }]))
      .toEqual({ realizedAllTime: 100, realizedThisYear: 100, sellsCounted: 1, sellsWithoutBasis: 0, shortOfPurchases: [] });
  });
  test('easy · First in, first out', () => {
    expect(run('KO', 'Brokerage', [{ type: 'buy', date: '2025-01-10', shares: 10, price: 50 }, { type: 'buy', date: '2025-06-10', shares: 10, price: 80 },
      { type: 'sale', date: '2026-03-01', shares: 10, price: 90 }])).toEqual({ realizedAllTime: 400, realizedThisYear: 400, sellsCounted: 1, sellsWithoutBasis: 0, shortOfPurchases: [] });
  });
  test('complex · Opening position, two sales across a year end, another account ignored', () => {
    const r = run('VTI', 'Brokerage A', [
      { account: 'Brokerage A', type: 'opening position', date: '2024-12-31', shares: 25, price: 241.17 },
      { account: 'Brokerage A', type: 'buy', date: '2025-04-08', shares: 12.5, price: 255.06 },
      { account: 'Brokerage A', type: 'sale', date: '2025-11-20', shares: 30, price: 312.44 },
      { account: 'Brokerage A', type: 'sale', date: '2026-05-14', shares: 5, price: 318.9 },
      { account: 'IRA B', type: 'buy', date: '2025-02-03', shares: 40, price: 290 },
      { account: 'IRA B', type: 'sale', date: '2026-02-03', shares: 10, price: 300 },
    ]);
    expect(r.realizedAllTime).toBeCloseTo(2387.85, 9);
    expect(r.realizedThisYear).toBeCloseTo(319.2, 9);
    expect([r.sellsCounted, r.sellsWithoutBasis]).toEqual([2, 0]);
  });
  // FINDING: app gives 4.50 (all time and this year), expected 450 — the realised gain on option contracts leaves out
  // the contract multiplier that cost, value and the long/short split all apply (DEC-0274: "options: value = contracts
  // × 100 × price"). The function is handed records only and never asks the holding for its multiplier.
  // FIXED 2026-10-11 (outside review Claude Performance, DEC-0274): the realised gain × the named holding's contract multiplier.
  test('complex · Option contracts bought and sold, as a broker names them', () => {
    const r = run('AAPL  260619C00200000', 'Brokerage', [{ type: 'buy', date: '2026-03-02', shares: 2, price: 3.2 }, { type: 'sale', date: '2026-04-20', shares: 2, price: 5.45 }], NOW(), 'option');
    expect(r.realizedAllTime).toBeCloseTo(450, 9);
    expect(r.realizedThisYear).toBeCloseTo(450, 9);
    expect([r.sellsCounted, r.sellsWithoutBasis]).toEqual([1, 0]);
  });
  // UNCLEAR: app counts the partly matched sale in both tallies (reading 1: sales counted 1, without a cost 1; gain
  // $200). Open question: does a sale only partly matched to recorded purchases count as a "sale counted"? Searched:
  // rulings-for.py "realized", "sale" + "basis", "nothing sold" (DEC-1559 covers the no-sale wording only).
  // SETTLED 2026-10-12 by DEC-4643 ("3,4, 8-approved"): the sale is counted ONCE — sales counted 1, sales with no
  // purchase on record behind any share 0 — its gain is the matched part's, 10 × ($70 − $50) = $200, and the 5 shares
  // with no price paid on record are named on it: "$200 gain on 10 of 15 shares sold; what you paid for the other 5 is
  // not on record." (Before: sellsCounted 1 AND sellsWithoutBasis 1, which the page read as two sales.)
  test('edge · A sale bigger than the purchases on record', () => {
    const r = run('T', 'Brokerage', [{ type: 'buy', date: '2026-01-05', shares: 10, price: 50 }, { type: 'sale', date: '2026-06-01', shares: 15, price: 70 }]);
    expect(r).toEqual({ realizedAllTime: 200, realizedThisYear: 200, sellsCounted: 1, sellsWithoutBasis: 0,
      shortOfPurchases: [{ date: '2026-06-01', sold: 15, matched: 10, gain: 200 }] });
    expect(saleShortOfPurchasesSentence(r.shortOfPurchases[0], pos({ kind: 'stock' }), (n) => `$${n.toLocaleString('en-US')}`))
      .toBe('$200 gain on 10 of 15 shares sold; what you paid for the other 5 is not on record.');
  });
});

describe('MK-PF-F-032 quantityUnit — five cases', () => {
  test('easy · A stock', () => { expect(quantityUnit(pos({ kind: 'stock' }))).toBe('shares'); });
  test('easy · A cryptocurrency', () => { expect(quantityUnit(pos({ kind: 'crypto' }))).toBe('coins'); });
  test('complex · Option and commodity from a broker link', () => {
    expect([quantityUnit(pos({ kind: 'option' })), quantityUnit(pos({ kind: 'commodity' }))]).toEqual(['contracts', 'ounces']);
  });
  test("complex · The person's own unit wins over the kind", () => {
    expect([quantityUnit(pos({ kind: 'alternative', unit: 'units' })), quantityUnit(pos({ kind: 'crypto', unit: 'shares' }))]).toEqual(['units', 'shares']);
  });
  test('edge · Nothing at all', () => { expect(quantityUnit(pos({ kind: null, unit: null }))).toBe('shares'); });
});

describe('MK-PF-F-033 quantityWithUnit — five cases', () => {
  test('easy · Three shares', () => { expect(quantityWithUnit(pos({ kind: 'stock' }), 3)).toBe('3 shares'); });
  test('easy · One coin', () => { expect(quantityWithUnit(pos({ kind: 'crypto' }), 1)).toBe('1 coin'); });
  test('complex · Contracts, an ounce and half a coin', () => {
    expect([quantityWithUnit(pos({ kind: 'option' }), 2), quantityWithUnit(pos({ kind: 'commodity' }), 1), quantityWithUnit(pos({ kind: 'crypto' }), 0.5)])
      .toEqual(['2 contracts', '1 ounce', '0.5 coins']);
  });
  test("complex · The person's own unit, one and many", () => {
    expect([quantityWithUnit(pos({ kind: 'alternative', unit: 'units' }), 1), quantityWithUnit(pos({ kind: 'alternative', unit: 'units' }), 250)]).toEqual(['1 unit', '250 units']);
  });
  // SETTLED 2026-10-12 by DEC-0277 (the unit beside every quantity): a written (short) option keeps its minus sign and
  // its unit, singular at one either way, as the linked broker sends it and as the holding's name says "(short)".
  test('edge · A written call: minus one contract', () => { expect(quantityWithUnit(pos({ kind: 'option' }), -1)).toBe('-1 contract'); });
});
