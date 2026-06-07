import { planCompleteness } from './index';

const base = { incomeAnnual: 0, accountCount: 0, hasInvestments: false, goalCount: 0, ssAnswered: false, monthlySpending: 0, hasDebtsOrSkipped: false };

describe('plan completeness', () => {
  test('empty plan → 0%', () => {
    const r = planCompleteness(base);
    expect(r.doneCount).toBe(0);
    expect(r.pct).toBe(0);
    expect(r.checks.every((c) => !c.done)).toBe(true);
  });
  test('partial plan → proportional %', () => {
    const r = planCompleteness({ ...base, incomeAnnual: 120000, accountCount: 3, monthlySpending: 4000 });
    expect(r.doneCount).toBe(3);
    expect(r.total).toBe(6);
    expect(r.pct).toBe(50);
    expect(r.checks.find((c) => c.key === 'income')!.done).toBe(true);
    expect(r.checks.find((c) => c.key === 'goals')!.done).toBe(false);
  });
  test('full plan → 100%', () => {
    const r = planCompleteness({ incomeAnnual: 1, accountCount: 1, hasInvestments: true, goalCount: 1, ssAnswered: true, monthlySpending: 1, hasDebtsOrSkipped: true });
    expect(r.pct).toBe(100);
  });
  test('each check routes somewhere', () => {
    planCompleteness(base).checks.forEach((c) => expect(c.route.length).toBeGreaterThan(1));
  });
});
