/* The debts — what they ask each month, and when they are gone. */
import { theDebts, DEBT_FIGURES } from './the-debts';

const debts = [
  { debt_id: 'c', label: 'Card', debt_type: 'CREDIT_CARD', remaining_balance: 9000, interest_rate_apr: 0.24, minimum_monthly_payment: 200 },
  { debt_id: 'a', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 250 },
] as any[];
const now = new Date('2026-10-01T12:00:00');

describe('theDebts — the Debts tab asks this and nothing else', () => {
  it('MK-NW-M-009 / MK-CF-M-057: the balances add up, and interest a month is balance × rate ÷ 12', () => {
    const d = theDebts({ debts, now });
    expect(d.totalBalance).toBe(23_000);
    expect(d.interestMonthly).toBeCloseTo(9000 * 0.24 / 12 + 14000 * 0.069 / 12, 2);   // $180 + $80.50
  });
  it('MK-CF-M-058 / 059: extra money shortens the plan and costs less interest — never the reverse', () => {
    const slow = theDebts({ debts, extraMonthly: 0, now }).plan;
    const fast = theDebts({ debts, extraMonthly: 300, now }).plan;
    expect(slow.neverPaysOff).toBe(false);
    expect(fast.months).toBeLessThan(slow.months);
    expect(fast.totalInterest).toBeLessThan(slow.totalInterest);
  });
  it('a card whose minimum cannot cover its interest says never, not a number', () => {
    const d = theDebts({ debts: [{ debt_id: 'x', label: 'Card', debt_type: 'CREDIT_CARD', remaining_balance: 20000, interest_rate_apr: 0.30, minimum_monthly_payment: 100 }] as any, now });
    expect(d.plan.neverPaysOff).toBe(true);
  });
  it('every figure this door hands out has a worked example that runs', () => {
    for (const [id, f] of Object.entries(DEBT_FIGURES as any)) expect(`${id}: ${typeof (f as any).worked?.run}`).toBe(`${id}: function`);
  });
});
