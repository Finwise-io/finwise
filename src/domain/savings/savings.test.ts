// Term #10 — the two savings rates, pinned by their identities (robust to the income function).
import { takeHomeMonthly, monthlySavings } from './index';
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
    expect(monthlySavings(op, [])).toBeCloseTo(takeHomeMonthly(op) - plannedMonthlySpend(op), 2);
  });

  // The savings-rate tests left with the functions — CUT by the founder 2026-08-20 (brief §C, Q29).
});
