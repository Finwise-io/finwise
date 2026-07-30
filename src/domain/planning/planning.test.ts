import { educationPlan, lifeInsuranceNeed, rothConversionCost, taxOrganizer } from './index';
import type { OnboardingProfile } from '../onboardingProfile';

describe('tax organizer', () => {
  const op: OnboardingProfile = {
    taxMode: 'manual', manualTaxRate: '22',
    baseSalary: '8000', salaryFreq: 'monthly', salaryMode: 'gross', bonusAnnual: '10000',
    invAnnual: '2000', c_401k: '1500', incomeSources: ['employment', 'investment_income'],
    scholarships: [], loans: [{ amount: '5000' }],
  };
  test('assembles income lines, separates taxable vs non-taxable, tailors documents', () => {
    const o = taxOrganizer(op, { accounts: [{ kind: 'brokerage', balance: 50000 }], liabilities: [{ debt_type: 'MORTGAGE' }], year: 2026 });
    expect(o.income.find((l) => l.label === 'Wages (W-2)')!.amount).toBe(96000);
    expect(o.income.find((l) => l.label === 'Bonus')!.amount).toBe(10000);
    expect(o.taxableTotal).toBeGreaterThan(100000);
    expect(o.contributions.find((c) => c.label.startsWith('401'))!.amount).toBe(18000);
    expect(o.documents).toEqual(expect.arrayContaining(['W-2 from each employer', '1099-INT, 1099-DIV, and 1099-B (brokerage)', '1098-E (student-loan interest)']));
    expect(o.documents.some((d) => d.includes('1098 (mortgage'))).toBe(true);
  });
  test('actual passive income overrides the estimate', () => {
    const o = taxOrganizer(op, { actualPassive: 3500, year: 2026 });
    expect(o.income.find((l) => l.label === 'Interest & dividends')!.amount).toBe(3500);
  });

  // BUG-LEDGER: B-35 — a working person's FUTURE Social Security/pension must not be taxed today.
  test('future Social Security/pension is NOT in a working person\'s taxable income', () => {
    const working: OnboardingProfile = { ...op, ri_ss: '2000', ri_pension: '1500' };  // employed, not retired
    const o = taxOrganizer(working, { year: 2026 });
    expect(o.income.find((l) => l.label.startsWith('Retirement income'))?.amount ?? 0).toBe(0);  // absent or $0
    const withoutRi = taxOrganizer(op, { year: 2026 });
    expect(o.taxableTotal).toBe(withoutRi.taxableTotal);   // adding future SS changed nothing
  });

  test('a retiree who receives it DOES report retirement income', () => {
    const retiree: OnboardingProfile = {
      taxMode: 'manual', manualTaxRate: '12', status: 'retired',
      incomeSources: ['retirement_income'], ri_ss: '2000', ri_pension: '1500',
    };
    const o = taxOrganizer(retiree, { year: 2026 });
    expect(o.income.find((l) => l.label.startsWith('Retirement income'))!.amount).toBe((2000 + 1500) * 12);
  });
});

// (the bracket-fill rothConversion helper was retired in Build-47 walk row 6 — zero product callers;
// the ONE Roth tax figure is rothConversionCost, pinned below)

describe('life-insurance need', () => {
  test('DIME-style: income replacement + debts + goals + final, minus what you have', () => {
    const n = lifeInsuranceNeed({ annualIncome: 80000, yearsToReplace: 10, debts: 300000, futureGoals: 120000, finalExpenses: 15000, liquidSavings: 50000, existingCoverage: 200000 });
    expect(n.incomeReplacement).toBe(800000);
    expect(n.totalNeed).toBe(800000 + 300000 + 120000 + 15000);
    expect(n.covered).toBe(250000);
    expect(n.gap).toBe(1235000 - 250000);
  });
  test('well-covered → no gap', () => {
    const n = lifeInsuranceNeed({ annualIncome: 50000, yearsToReplace: 5, debts: 0, futureGoals: 0, finalExpenses: 15000, liquidSavings: 100000, existingCoverage: 500000 });
    expect(n.gap).toBe(0);
  });
});

describe('529 / education savings planner', () => {
  test('projects inflated cost, grows current savings, solves the monthly contribution', () => {
    const p = educationPlan({ currentAnnualCost: 30000, yearsUntilStart: 10, yearsOfSchool: 4, currentSavings: 20000, returnRate: 0.06, costInflation: 0.05 });
    expect(p.futureTotalCost).toBeGreaterThan(30000 * 4);   // inflated above today's 4-year sticker
    expect(p.savingsAtStart).toBeCloseTo(20000 * Math.pow(1.06, 10), 0);
    expect(p.gap).toBeGreaterThan(0);
    expect(p.monthlyNeeded).toBeGreaterThan(0);
    expect(p.onTrackPct).toBeGreaterThan(0);
  });
  test('already fully funded → no gap, no monthly needed', () => {
    const p = educationPlan({ currentAnnualCost: 10000, yearsUntilStart: 5, yearsOfSchool: 4, currentSavings: 500000, returnRate: 0.06, costInflation: 0.05 });
    expect(p.gap).toBe(0);
    expect(p.monthlyNeeded).toBe(0);
    expect(p.onTrackPct).toBeGreaterThanOrEqual(100);
  });
  test('starting now (0 years) → the whole gap is due immediately', () => {
    const p = educationPlan({ currentAnnualCost: 20000, yearsUntilStart: 0, yearsOfSchool: 1, currentSavings: 0, returnRate: 0.06, costInflation: 0.05 });
    expect(p.monthlyNeeded).toBeCloseTo(20000, 0);
  });
});

describe('rothConversionCost — the ONE Roth tax figure (Build-47 walk row 6)', () => {
  const { taxOwedFor } = require('../income/tax');
  test('equals the progressive taxOwedFor difference, filing-status and state aware', () => {
    expect(rothConversionCost(90000, 30000, 'single', 0)).toBeCloseTo(taxOwedFor(120000, 'single', 0) - taxOwedFor(90000, 'single', 0), 2);
    expect(rothConversionCost(90000, 30000, 'married', 0.05)).toBeCloseTo(taxOwedFor(120000, 'married', 0.05) - taxOwedFor(90000, 'married', 0.05), 2);
  });
  test('zero conversion costs zero', () => {
    expect(rothConversionCost(90000, 0, 'single', 0)).toBe(0);
  });
});
