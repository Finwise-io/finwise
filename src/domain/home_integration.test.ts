// Integration: exercises the exact data path HomeScreen relies on, end-to-end, so a realistic
// onboarded profile + logged expenses can't throw or produce nonsense headlessly.
import { buildSnapshot } from './snapshot';
import { budgetVsActual, spendBuckets, savingsByMonth, budgetFromOnboarding } from './budget';
import { incomeMonthlyGrid } from './income';

// A realistic "Employed" onboarding profile (mirrors what the flow stores).
const op: Record<string, any> = {
  status: 'employed', tracks: ['spend', 'retire_acc'],
  baseSalary: '8000', salaryMode: 'gross', salaryFreq: 'monthly',
  bonusAnnual: '12000', signingOnetime: '10000',
  equityType: 'rsu', rsuGrants: [{ shares: '100', price: '400', date: '2026-03' }],
  c_401k: '800', employerMatchMode: 'pct', employerMatchValue: '50',
  taxMode: 'system',
  spendCats: [
    { id: 'rent', bucket: 'fixed', amount: '2200', unit: 'dollar' },
    { id: 'utilities', bucket: 'fixed', amount: '180', unit: 'dollar' },
    { id: 'groceries', bucket: 'flexible', amount: '600', unit: 'dollar' },
    { id: 'dining', bucket: 'flexible', amount: '300', unit: 'dollar' },
    { id: 'travel', bucket: 'nonmonthly', amount: '2400', unit: 'dollar' },   // yearly → 200/mo
  ],
  birthYear: '1990', birthMonth: '6', currentRetirementSavings: '50000',
  targetRetirementAge: '65', expectedRetirementSpending: '5000',
};
const now = new Date('2026-06-15T12:00:00');
const expenses = [
  { id: 'e1', amount: 2200, category: 'Rent / Mortgage', store: 'Landlord', date: '2026-06-01' },
  { id: 'e2', amount: 85, category: 'Groceries', store: 'Market', date: '2026-06-05' },
  { id: 'e3', amount: 40, category: 'Dining out', store: 'Cafe', date: '2026-06-12' },
  { id: 'e4', amount: 60, category: 'Insurance', store: 'Geico', date: '2026-06-08' },  // fixed
  { id: 'e5', amount: 99, category: 'Groceries', store: 'Market', date: '2026-05-20' }, // prior month
];

describe('home data path (onboarding → dashboard)', () => {
  test('budgetVsActual buckets month-to-date vs plan', () => {
    const r = budgetVsActual(expenses, op, now);
    expect(r.month).toBe('2026-06');
    expect(r.spent_total).toBe(2200 + 85 + 40 + 60);            // June only
    expect(r.planned_total).toBeGreaterThan(0);
    const fixed = r.buckets.find((b) => b.key === 'fixed')!;
    expect(fixed.spent).toBe(2200 + 60);                        // rent + insurance
    const flex = r.buckets.find((b) => b.key === 'flexible')!;
    expect(flex.spent).toBe(85 + 40);
  });

  test('planned budget total = fixed + flexible + non-monthly/12', () => {
    const b = spendBuckets(op);
    expect(b.fixed).toBe(2380);                                 // 2200 + 180
    expect(b.flexible).toBe(900);                               // 600 + 300
    expect(b.non_monthly).toBe(200);                            // 2400 / 12
    expect(budgetFromOnboarding('u1', op).monthly_spending).toBe(3480);
  });

  test('income grid is 12 months, current month positive, equity lands in March', () => {
    const grid = incomeMonthlyGrid(op, 'net');
    expect(grid).toHaveLength(12);
    expect(grid[5].amount).toBeGreaterThan(0);                  // June take-home
    expect(grid[2].amount).toBeGreaterThan(grid[1].amount);     // March (equity) > February
  });

  test('savings-by-month present and lumpy', () => {
    const s = savingsByMonth(op);
    expect(s).toHaveLength(12);
    expect(s[2].amount).toBeGreaterThan(s[1].amount);           // equity month saves more
  });

  test('buildSnapshot produces all read-models without throwing', () => {
    const snap = buildSnapshot('u1', op, { inflationRate: 2.4, treasuryYield: 4.3 } as any);
    expect(snap.income).toBeTruthy();
    expect(snap.budget).toBeTruthy();
    expect(snap.networth).toBeTruthy();
    expect(snap.retirement).toBeTruthy();
    expect(snap.budget.monthly_spending).toBeGreaterThan(0);
  });
});
