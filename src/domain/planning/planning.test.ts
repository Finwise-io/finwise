import { educationPlan } from './index';

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
