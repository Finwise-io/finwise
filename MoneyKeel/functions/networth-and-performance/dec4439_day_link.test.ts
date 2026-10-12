// DEC-4439 (his word "approved.", 2026-10-11): money that moves on a day counts for that whole day. The day's link
// = evening value ÷ (previous evening + money added − money taken out that day) − 1. Held here on the three
// examples he approved, including a REAL new account whose first record is the deposit day.
import { timeWeightedReturn } from '../../../Calculation Module code/engines/time-weighted-return';
import { buildDayFromAccounts } from '../../../Calculation Module code/engines/snapshots';

const acct = (id: string, value: number) => ({ asset_id: id, label: id, kind: 'brokerage', source: 'connected', tax_bucket: 'TAXABLE',
  cash_balance: 0, balance: value, target_return: 0.06,
  positions: [{ position_id: `p${id}`, ticker: 'X', last_price: value, lots: [{ lot_id: 'l', shares: 1, cost_per_share: 1, purchase_date: '2024-01-02' }] }] }) as any;
const day = (date: string, accts: any[]) => buildDayFromAccounts(accts, date, `${date}T00:00:00Z`);

describe('DEC-4439 · the day link', () => {
  test('a new account opened with $10,000, worth $10,050 that evening, its first record that day: +0.50%', () => {
    // measured over ALL accounts (Performance's total): x is on record the evening before; v first appears on 9 Sep with
    // its $10,000 as its base — the day's link is (20,000 + 10,050) ÷ (20,000 + 10,000), v's own part +$50 on $10,000.
    // On v's OWN page the record begins 9 Sep, so no window reaches the evening before (DEC-3035i): its return starts 10 Sep.
    const days = [day('2026-09-08', [acct('x', 20000)]), day('2026-09-09', [acct('x', 20000), acct('v', 10050)])];
    const all = timeWeightedReturn({ days, accountIds: new Set(['x', 'v']), flows: [{ accountId: 'v', date: '2026-09-09', amount: 10000 }], start: '2026-09-08', end: '2026-09-09' } as any);
    expect(all.rate!).toBeCloseTo(30050 / 30000 - 1, 12);
    const alone = [day('2026-09-08', [acct('v', 0)]), day('2026-09-09', [acct('v', 10050)])];   // the same account, on record at $0 the evening before
    expect(timeWeightedReturn({ days: alone, accountIds: new Set(['v']), flows: [{ accountId: 'v', date: '2026-09-09', amount: 10000 }], start: '2026-09-08', end: '2026-09-09' } as any).rate!).toBeCloseTo(10050 / 10000 - 1, 12);   // +0.50%
  });
  test('the same account worth $9,800 that evening: −2.00% — a loss, not a broken record', () => {
    const alone = [day('2026-09-08', [acct('v', 0)]), day('2026-09-09', [acct('v', 9800)])];
    const v = timeWeightedReturn({ days: alone, accountIds: new Set(['v']), flows: [{ accountId: 'v', date: '2026-09-09', amount: 10000 }], start: '2026-09-08', end: '2026-09-09' } as any);
    expect(v.rate!).toBeCloseTo(9800 / 10000 - 1, 12);    // −2.00%
  });
  test('Vanguard worth $50,000, $10,000 added that morning, $60,300 that evening: +0.50% (was +0.60%)', () => {
    const days = [day('2026-09-08', [acct('v', 50000)]), day('2026-09-09', [acct('v', 60300)])];
    const v = timeWeightedReturn({ days, accountIds: new Set(['v']), flows: [{ accountId: 'v', date: '2026-09-09', amount: 10000 }], start: '2026-09-08', end: '2026-09-09' } as any);
    expect(v.rate!).toBeCloseTo(60300 / 60000 - 1, 12);   // +0.50%: the $300 was earned on $60,000
  });
});
