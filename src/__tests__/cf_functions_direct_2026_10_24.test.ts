/** CASH FLOW FUNCTIONS NO TEST NAMED — EACH ONE CALLED DIRECTLY, ON NUMBERS WORKED BY HAND (2026-10-24).
 *
 *  The trace table (cf_function_trace.test.ts) gives every Cash flow function the test that exercises it. These six were
 *  numbered this week and run only inside flows; here each is asked on its own, so its row can name a test that calls it.
 */
import { rentEntryMonthly, earnerWageShares, wagesLandingByMonth } from '../domain/income/onboarding';
import { tradeMultiplierOf, openingRecordsOf } from '../domain/transactions';
import { addedAfterRecord } from '../../MoneyKeel/functions/cashflow/this-month';

describe('MK-CF-F-219 rentEntryMonthly — one rent entry a month: its rent, its costs, and the rent less the costs', () => {
  test('$2,000 rent and $500 of costs: $2,000 · $500 · $1,500', () => {
    expect(rentEntryMonthly({ income: 2000, expenses: 500 })).toEqual({ income: 2000, expenses: 500, net: 1500 });
  });
  test('nothing entered: $0 · $0 · $0', () => {
    expect(rentEntryMonthly(null)).toEqual({ income: 0, expenses: 0, net: 0 });
  });
});

describe('MK-CF-F-223 tradeMultiplierOf — the shares per contract a buy or a sale trades', () => {
  const OPT = 'SPY  261218C00600000';
  const accounts: any[] = [{ asset_id: 'b', positions: [{ position_id: 'p1', ticker: OPT, kind: 'options', lots: [] }] }];
  test('a buy of an option the account holds: 100 shares per contract', () => {
    expect(tradeMultiplierOf(accounts, { type: 'BUY', account_id: 'b', ticker: OPT } as any)).toBe(100);
  });
  test('its "Shares per contract" said otherwise: 10', () => {
    const own: any[] = [{ ...accounts[0], positions: [{ ...accounts[0].positions[0], multiplier: 10 }] }];
    expect(tradeMultiplierOf(own, { type: 'SELL', account_id: 'b', ticker: OPT } as any)).toBe(10);
  });
  test('a deposit, or a ticker the account does not hold yet: 1', () => {
    expect(tradeMultiplierOf(accounts, { type: 'DEPOSIT', account_id: 'b' } as any)).toBe(1);
    expect(tradeMultiplierOf(accounts, { type: 'BUY', account_id: 'b', ticker: 'VTI' } as any)).toBe(1);
  });
});

describe('MK-CF-F-224 openingRecordsOf — one opening-holding record per purchase of a holding already owned', () => {
  test('two purchases, one with no price paid on record: two records, the second with no price', () => {
    const pos: any = { position_id: 'p', ticker: 'VTI', kind: 'etf',
      lots: [{ lot_id: 'l1', shares: 10, cost_per_share: 200, purchase_date: '2025-03-04' }, { lot_id: 'l2', shares: 5, cost_per_share: null, purchase_date: '2026-01-10' }] };
    const r = openingRecordsOf('a1', pos);
    expect(r.map((t: any) => [t.type, t.account_id, t.position_id, t.ticker, t.shares, t.price, t.date]))
      .toEqual([['OPENING_POSITION', 'a1', 'p', 'VTI', 10, 200, '2025-03-04'], ['OPENING_POSITION', 'a1', 'p', 'VTI', 5, undefined, '2026-01-10']]);
  });
});

describe("MK-CF-F-231 addedAfterRecord — a past month's expenses entered after its record was saved", () => {
  const exp: any[] = [
    { id: 'x', amount: 40, category: 'Groceries', date: '2026-09-10', createdAt: '2026-09-29T09:00:00Z' },   // entered after the save
    { id: 'y', amount: 10, category: 'Groceries', date: '2026-09-11', createdAt: '2026-09-20T09:00:00Z' },   // before it
    { id: 'z', amount: 99, category: 'Groceries', date: '2026-10-02', createdAt: '2026-10-02T09:00:00Z' },   // another month
  ];
  test('saved 28 Sep: the $40 entered on 29 Sep is left out of the record — {x}, $40', () => {
    const r = addedAfterRecord({ captured_at: '2026-09-28T12:00:00Z' }, exp, '2026-09');
    expect([[...r.ids], r.total]).toEqual([['x'], 40]);
  });
  test('no time the record was saved: none', () => {
    expect(addedAfterRecord(null, exp, '2026-09').total).toBe(0);
  });
});

describe("MK-CF-F-233 earnerWageShares and MK-CF-F-234 wagesLandingByMonth — the wages that land", () => {
  // one earner, $7,200 a month, a tax rate entered as 0% and no 401(k): every month lands $7,200 by hand
  const op: any = { status: 'employed', incomeSources: ['employment'], baseSalary: '7200', salaryMode: 'takehome', salaryFreq: 'monthly',
    taxMode: 'manual', manualTaxRate: '0' };
  test('earnerWageShares: one earner, $7,200 in each of the 12 months, no take-home of their own typed (the household rate applies)', () => {
    const s = earnerWageShares(op);
    expect(s).toHaveLength(1);
    expect([s[0].gross.length, new Set(s[0].gross).size, s[0].gross[0], s[0].own]).toEqual([12, 1, 7200, null]);
  });
  test('wagesLandingByMonth: $7,200 × (1 − 0%) − $0 of 401(k) = $7,200 in each of the 12 months', () => {
    expect(wagesLandingByMonth(op, new Date(2026, 8, 15))).toEqual(Array(12).fill(7200));
  });
});
