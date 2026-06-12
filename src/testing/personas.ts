// Shared persona fixtures for the invariants / journey / edge suites.
// Field names follow the consolidated onboardingProfile shape used by src/onboarding/engine.ts
// and mirrored in src/domain/scenarios.test.ts — keep them in sync with the engine's step ids.
// NOTE: this lives in src/testing (NOT __tests__) so Jest's testMatch doesn't treat it as a suite.
import type { OnboardingProfile } from '../domain/onboardingProfile';
import type { EconomicData } from '../domain/snapshot';

export const ECON: EconomicData = { inflationRate: 2.4, treasuryYield: 4.2 };

export const NO_TAX: OnboardingProfile = { taxMode: 'manual', manualTaxRate: '0' };

/** Retiree, 75, living off Social Security + pension, $250k portfolio (the launch plan's named case). */
export const retiree75: OnboardingProfile = {
  ...NO_TAX,
  status: 'retired', name: 'Ruth', birthYear: '1951', birthMonth: '3', horizonAge: '95',
  incomeSources: ['retirement_income'],
  ri_ss: '2200', ri_ss_freq: 'monthly', ri_pension: '1300', ri_pension_freq: 'monthly',
  currentSavingsPortfolio: '250000',
  monthlySpending: '3800',
  spendCats: [
    { id: 'housing', tier: 'critical', bucket: 'fixed', amount: '1800', unit: 'dollar' },
    { id: 'food', tier: 'important', bucket: 'fixed', amount: '700', unit: 'dollar' },
    { id: 'travel', tier: 'flex', bucket: 'flexible', amount: '500', unit: 'dollar' },
    { id: 'insurance', label: 'Insurance premium', tier: 'critical', bucket: 'nonmonthly', amount: '2400', unit: 'dollar', months: [6] },
  ],
};

/** Employed professional with partner: salary, 401(k)+match, Roth + taxable investing, a car loan,
 *  retirement savings + holdings to seed Net Worth, and two goals. */
export const employedPartner: OnboardingProfile = {
  taxMode: 'manual', manualTaxRate: '20',
  status: 'employed', name: 'Ava', birthYear: '1991', birthMonth: '7',
  hasPartner: 'yes', partnerName: 'Sam', dependentsCount: '1',
  targetRetirementAge: '65',
  incomeSources: ['employment'],
  baseSalary: '9000', salaryMode: 'gross', salaryFreq: 'monthly',
  c_401k: '800', employerMatchValue: '50', employerMatchMode: 'pct',
  c_roth: '500', c_invest: '300',
  currentRetirementSavings: '120000', investmentHoldings: '45000',
  debtName: 'Car loan', debtBalance: '14000', debtRate: '5.5', debtPayment: '420',
  monthlySpending: '0',
  spendCats: [
    { id: 'rent', tier: 'critical', bucket: 'fixed', amount: '2300', unit: 'dollar' },
    { id: 'food', tier: 'important', bucket: 'fixed', amount: '900', unit: 'dollar' },
    { id: 'fun', tier: 'flex', bucket: 'flexible', amount: '600', unit: 'dollar' },
    { id: 'insurance', label: 'Insurance premium', tier: 'critical', bucket: 'nonmonthly', amount: '3600', unit: 'dollar', months: [4] },
  ],
  goals: [
    { label: 'House down payment', target: '60000', year: '2030' },
    { label: 'New car', target: '20000', year: '2028' },
  ],
};

/** Student on part-time pay + aid, tuition due in September (mirrors scenarios.test.ts). */
export const studentAid: OnboardingProfile = {
  ...NO_TAX,
  status: 'student', name: 'Kai', birthYear: '2005',
  incomeSources: ['employment', 'scholarship', 'loans', 'support'],
  baseSalary: '1000', salaryMode: 'gross', salaryFreq: 'monthly', supportMonthly: '400', monthlySpending: '0',
  scholarships: [{ amount: '4000', freq: 'annual', months: [9], day: 20, year: '2026' }],
  loans: [{ amount: '5000', months: [9], day: 20, year: '2026' }],
  spendCats: [
    { id: 'tuition', label: 'Tuition', tier: 'critical', bucket: 'nonmonthly', amount: '15000', unit: 'dollar', months: [9], dueDay: 15 },
    { id: 'rent', tier: 'critical', bucket: 'fixed', amount: '700', unit: 'dollar' },
  ],
};

/** Variable-income server: uneven months, thin margin (mirrors scenarios.test.ts). */
export const hourlyServer: OnboardingProfile = {
  ...NO_TAX,
  status: 'employed', name: 'Mia', birthYear: '1996',
  incomeSources: ['employment'],
  salaryByMonth: Array.from({ length: 12 }, (_, i) => (i % 3 === 0 ? '1400' : '2600')),
  salaryMode: 'gross', tipsMonthly: '200', monthlySpending: '0',
  spendCats: [
    { id: 'rent', tier: 'critical', bucket: 'fixed', amount: '1900', unit: 'dollar' },
    { id: 'food', tier: 'important', bucket: 'fixed', amount: '500', unit: 'dollar' },
  ],
};

/** Simple flat persona: 0% tax, no 401(k), fixed-only spending, no lumpy items.
 *  The smoothed baseline and the month-placed grid must agree exactly for this one. */
export const simpleFlat: OnboardingProfile = {
  ...NO_TAX,
  status: 'employed', name: 'Flat', birthYear: '1990',
  incomeSources: ['employment'],
  baseSalary: '5000', salaryMode: 'gross', salaryFreq: 'monthly', monthlySpending: '0',
  spendCats: [{ id: 'rent', tier: 'critical', bucket: 'fixed', amount: '3000', unit: 'dollar' }],
};

/** Everything-skipped onboarding — the all-defaults floor. */
export const allSkip: OnboardingProfile = { status: 'employed' };

export const ALL_PERSONAS: { name: string; op: OnboardingProfile }[] = [
  { name: 'retiree75', op: retiree75 },
  { name: 'employedPartner', op: employedPartner },
  { name: 'studentAid', op: studentAid },
  { name: 'hourlyServer', op: hourlyServer },
  { name: 'simpleFlat', op: simpleFlat },
  { name: 'allSkip', op: allSkip },
];
