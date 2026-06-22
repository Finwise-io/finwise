// Term #10 — the two savings rates, pinned by their identities (robust to the income engine).
import { takeHomeMonthly, monthlySavings, savingsRateCash, savingsRateTotal } from './index';
import { plannedMonthlySpend } from '../budget';
import { totalGrossAnnual } from '../income';
import { round2 } from '../_shared/num';
import type { Debt } from '../debt';

const op = { baseSalary: '8000', salaryMode: 'gross', salaryFreq: 'monthly', monthlySpending: '4000', c_401k: '500' } as any;

describe('savings rates', () => {
  test('take-home is positive and below gross (after tax + 401k)', () => {
    const th = takeHomeMonthly(op);
    expect(th).toBeGreaterThan(0);
    expect(th).toBeLessThan(totalGrossAnnual(op) / 12);
  });

  test('monthly savings = take-home − planned spend − debt payments', () => {
    expect(monthlySavings(op, [])).toBe(round2(takeHomeMonthly(op) - plannedMonthlySpend(op)));
  });

  test('cash savings rate = monthly savings ÷ take-home', () => {
    expect(savingsRateCash(op)).toBeCloseTo((monthlySavings(op) / takeHomeMonthly(op)) * 100, 1);
  });

  test('debt payments reduce the cash savings rate (debt payoff is not saving)', () => {
    const debts: Debt[] = [{
      debt_id: 'd' as any, label: 'Card', debt_type: 'CREDIT_CARD',
      remaining_balance: 5000, interest_rate_apr: 0.2, minimum_monthly_payment: 800,
    }];
    expect(savingsRateCash(op, debts)).toBeLessThan(savingsRateCash(op, []));
  });

  test('total-with-retirement adds 401(k) to the numerator, over gross', () => {
    const grossMo = totalGrossAnnual(op) / 12;
    expect(savingsRateTotal(op)).toBeCloseTo(((monthlySavings(op) + 500) / grossMo) * 100, 1);
  });
});
