import { spendBuckets, budgetFromOnboarding, budgetVsActual, spendByMonth, savingsByMonth, emergencyTest, monthlyEssentials } from './index';
import { categoryBucketFor } from '../../constants/categories';
import type { OnboardingProfile } from '../onboardingProfile';

describe('emergency stress test', () => {
  const op: OnboardingProfile = {
    taxMode: 'manual', manualTaxRate: '0', monthlySpending: '0',
    spendCats: [
      { id: 'rent', tier: 'critical', bucket: 'fixed', amount: '1500', unit: 'dollar' },
      { id: 'food', tier: 'important', bucket: 'fixed', amount: '500', unit: 'dollar' },
      { id: 'dining', tier: 'flex', bucket: 'flexible', amount: '400', unit: 'dollar' },   // a want — not essential
      { id: 'tuition', tier: 'critical', bucket: 'nonmonthly', amount: '12000', unit: 'dollar', months: [9] }, // lumpy — excluded
    ],
  };
  test('essentials = recurring critical + important only', () => {
    expect(monthlyEssentials(op)).toBe(2000);   // rent 1500 + food 500 (dining + tuition excluded)
  });
  test('absorbing a shock + runway after', () => {
    const r = emergencyTest(op, 5000, 3000);
    expect(r.coversIt).toBe(true);
    expect(r.cashAfter).toBe(2000);
    expect(r.runwayAfter).toBe(1);              // $2k left ÷ $2k/mo
    expect(r.jobLossRunway).toBe(2.5);          // $5k ÷ $2k/mo with no income
    expect(r.recommendedFund).toBe(6000);       // 3 × essentials
    expect(r.gapToFund).toBe(1000);             // 6000 − 5000
  });
  test('a shock bigger than cash goes red', () => {
    const r = emergencyTest(op, 1000, 3000);
    expect(r.coversIt).toBe(false);
    expect(r.cashAfter).toBe(-2000);
  });

  // BUG-LEDGER: B-33 — a user who gave a lump monthlySpending with no itemized categories used to
  // get $0 essentials → "strong cushion" with $0 cash, contradicting "you'd go into the red."
  test('lump monthlySpending with no categories falls back to that total (no $0-essentials)', () => {
    const lump: OnboardingProfile = { taxMode: 'manual', manualTaxRate: '0', monthlySpending: '5000' };
    expect(monthlyEssentials(lump)).toBe(5000);
    const r = emergencyTest(lump, 0, 3000);
    expect(r.coversIt).toBe(false);              // $0 cash can't absorb a $3k hit
    expect(r.recommendedFund).toBe(15000);       // 3 × $5k
    expect(r.gapToFund).toBe(15000);             // and the full fund is the gap — NOT a "strong cushion"
  });
});

describe('spending placed in actual months (not averaged)', () => {
  test('a non-monthly bill lands in its month; monthly bills repeat', () => {
    const op: OnboardingProfile = {
      taxMode: 'manual', manualTaxRate: '0', monthlySpending: '0',
      spendCats: [
        { id: 'tuition', bucket: 'nonmonthly', amount: '12000', unit: 'dollar', months: [8] },  // Aug
        { id: 'rent', bucket: 'fixed', amount: '500', unit: 'dollar' },                          // every month
      ],
    };
    const s = spendByMonth(op);
    expect(s[7]).toBeCloseTo(12500, 0);   // August: tuition $12k + rent $500
    expect(s[6]).toBeCloseTo(500, 0);     // July: just rent
    expect(s.reduce((t, x) => t + x, 0)).toBeCloseTo(12000 + 500 * 12, 0);
  });
  test('savings dips in the month a big bill is due', () => {
    const op: OnboardingProfile = {
      taxMode: 'manual', manualTaxRate: '0',
      baseSalary: '3000', salaryMode: 'gross', salaryFreq: 'monthly', monthlySpending: '0',
      spendCats: [{ id: 'tuition', bucket: 'nonmonthly', amount: '12000', unit: 'dollar', months: [8] }],
    };
    const s = savingsByMonth(op);
    expect(s[7].amount).toBeLessThan(s[6].amount);   // August (tuition due) saves far less than July
    expect(s[7].amount).toBeCloseTo(3000 - 12000, 0);
  });
});

describe('spending categories → buckets', () => {
  test('rolls categories into monthly-normalized buckets ($ amounts)', () => {
    const op: OnboardingProfile = {
      spendCats: [
        { id: 'rent', bucket: 'fixed', amount: '2000', unit: 'dollar' },
        { id: 'groceries', bucket: 'flexible', amount: '500', unit: 'dollar' },
        { id: 'repairs', bucket: 'nonmonthly', amount: '1200', unit: 'dollar' },   // yearly → 100/mo
      ],
    };
    const b = spendBuckets(op);
    expect(b.fixed).toBe(2000);
    expect(b.flexible).toBe(500);
    expect(b.non_monthly).toBe(100);                 // 1200 / 12
    expect(b.monthly_total).toBe(2600);
  });

  test('percent amounts resolve against take-home income', () => {
    // gross 120k salary, 0% manual tax → net = 120k → net monthly 10k; 30% fixed = 3000/mo
    const op: OnboardingProfile = {
      baseSalary: '10000', salaryMode: 'gross', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '0',
      spendCats: [{ id: 'rent', bucket: 'fixed', amount: '30', unit: 'pct' }],
    };
    expect(spendBuckets(op).fixed).toBeCloseTo(3000, 0);
  });

  test('budgetVsActual rolls month-to-date expenses into buckets vs plan', () => {
    const op: OnboardingProfile = { spendCats: [
      { id: 'rent', bucket: 'fixed', amount: '2000', unit: 'dollar' },
      { id: 'groceries', bucket: 'flexible', amount: '600', unit: 'dollar' },
    ] };
    const now = new Date('2026-06-15T12:00:00');
    const expenses = [
      { amount: 50, category: 'Groceries', date: '2026-06-03' },        // flexible
      { amount: 30, category: 'Dining out', date: '2026-06-10' },       // flexible
      { amount: 2000, category: 'Rent / Mortgage', date: '2026-06-01' },// fixed
      { amount: 99, category: 'Groceries', date: '2026-05-28' },        // prior month — excluded
    ];
    const r = budgetVsActual(expenses, op, now);
    expect(r.month).toBe('2026-06');
    expect(r.spent_total).toBe(2080);                              // 50+30+2000
    expect(r.planned_total).toBe(2600);
    expect(r.remaining).toBe(520);
    const flex = r.buckets.find((b) => b.key === 'flexible')!;
    expect(flex.spent).toBe(80);                                   // groceries+dining this month
    expect(categoryBucketFor('Insurance')).toBe('fixed');
    expect(categoryBucketFor('Dining out')).toBe('flexible');
  });

  test('falls back to legacy b_* fields when no categories', () => {
    const b = spendBuckets({ b_fixed: '1500', b_nonmonthly: '200', b_flexible: '800' });
    expect(b.monthly_total).toBe(2500);
    expect(budgetFromOnboarding('u1', { b_fixed: '1500', b_nonmonthly: '200', b_flexible: '800' }).monthly_spending).toBe(2500);
  });
});
