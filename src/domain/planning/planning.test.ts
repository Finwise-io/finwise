import { educationPlan, lifeInsuranceNeed } from './index';

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
