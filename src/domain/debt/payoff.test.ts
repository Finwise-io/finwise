import { payoffPlan, type Debt } from './index';

const d = (id: string, bal: number, apr: number, min: number): Debt =>
  ({ debt_id: id, label: id, debt_type: 'CREDIT_CARD', remaining_balance: bal, interest_rate_apr: apr, minimum_monthly_payment: min });

describe('debt payoff', () => {
  test('no debts → already free', () => {
    expect(payoffPlan([], 0).months).toBe(0);
    expect(payoffPlan([], 0).order).toEqual([]);
  });

  test('avalanche targets highest APR first', () => {
    const r = payoffPlan([d('card', 5000, 0.22, 100), d('loan', 10000, 0.05, 150)], 300, 'avalanche');
    expect(r.neverPaysOff).toBe(false);
    expect(r.order[0].label).toBe('card');           // 22% paid first
    expect(r.months).toBeGreaterThan(0);
  });

  test('snowball targets smallest balance first', () => {
    const r = payoffPlan([d('big', 12000, 0.10, 200), d('small', 1500, 0.08, 50)], 300, 'snowball');
    expect(r.order[0].label).toBe('small');          // smallest balance cleared first
  });

  test('extra payment shortens payoff + cuts interest', () => {
    const debts = [d('card', 8000, 0.19, 160)];
    const base = payoffPlan(debts, 0, 'avalanche');
    const fast = payoffPlan(debts, 400, 'avalanche');
    expect(fast.months).toBeLessThan(base.months);
    expect(fast.totalInterest).toBeLessThan(base.totalInterest);
  });

  test('payments below interest → never pays off (flagged)', () => {
    const r = payoffPlan([d('card', 10000, 0.25, 50)], 0, 'avalanche');   // $50 < interest (~$208/mo)
    expect(r.neverPaysOff).toBe(true);
  });
});
