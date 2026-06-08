import { payoffPlan, loanPayment, debtToIncome, creditUtilization, creditScoreBand, type Debt } from './index';

const d = (id: string, bal: number, apr: number, min: number): Debt =>
  ({ debt_id: id, label: id, debt_type: 'CREDIT_CARD', remaining_balance: bal, interest_rate_apr: apr, minimum_monthly_payment: min });

describe('credit health', () => {
  test('utilization status: ≤30% good, ≤50% caution, else high', () => {
    expect(creditUtilization(200, 1000).ratio).toBeCloseTo(0.2, 3);
    expect(creditUtilization(200, 1000).status).toBe('good');
    expect(creditUtilization(450, 1000).status).toBe('caution');
    expect(creditUtilization(800, 1000).status).toBe('high');
    expect(creditUtilization(100, 0).ratio).toBe(0);   // no limit → 0
  });
  test('score bands', () => {
    expect(creditScoreBand(810).label).toBe('Excellent');
    expect(creditScoreBand(700).label).toBe('Good');
    expect(creditScoreBand(620).good).toBe(false);
    expect(creditScoreBand(500).label).toBe('Poor');
  });
});

describe('loan repayment + DTI', () => {
  test('loanPayment: amortizes principal over the term (standard formula)', () => {
    const p = loanPayment(10000, 6, 10);   // $10k at 6% over 10y
    expect(p.monthly).toBeCloseTo(111.02, 0);
    expect(p.totalInterest).toBeGreaterThan(0);
    expect(p.totalPaid).toBeCloseTo(p.monthly * 120, 0);
    expect(loanPayment(0, 6, 10).monthly).toBe(0);
    expect(loanPayment(1200, 0, 1).monthly).toBe(100);   // 0% → principal / months
  });
  test('debtToIncome: ratio + renter/homeowner guideline + status', () => {
    const renter = debtToIncome(300, 3000);              // 10% — good for a renter
    expect(renter.ratio).toBeCloseTo(0.1, 3);
    expect(renter.guideline).toBe(0.20);
    expect(renter.status).toBe('good');
    expect(debtToIncome(900, 3000).status).toBe('high'); // 30% renter → high
    expect(debtToIncome(900, 3000, true).status).toBe('good'); // 30% homeowner (≤36%) → good
    expect(debtToIncome(100, 0).ratio).toBe(0);          // no income → 0
  });
});

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
