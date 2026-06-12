import { colFactor } from './col';
import { retirementSpendMonthly } from './index';
import type { OnboardingProfile } from '../onboardingProfile';

describe('cost-of-living factor (retirement location)', () => {
  test('recognizes countries and common aliases', () => {
    expect(colFactor('Portugal')).toEqual({ factor: 0.6, name: 'Portugal' });
    expect(colFactor('I want to retire in portugal')).toEqual({ factor: 0.6, name: 'Portugal' });
    expect(colFactor('UK')).toEqual({ factor: 0.95, name: 'United Kingdom' });
    expect(colFactor('USA').factor).toBe(1);
    expect(colFactor('Bali').name).toBe('Indonesia');
  });
  test('unknown or blank → no adjustment, honestly unnamed', () => {
    expect(colFactor('')).toEqual({ factor: 1, name: null });
    expect(colFactor(undefined)).toEqual({ factor: 1, name: null });
    expect(colFactor('Atlantis')).toEqual({ factor: 1, name: null });
  });
  test('retirementSpendMonthly scales by the location factor', () => {
    const base: OnboardingProfile = { expectedRetirementSpending: '4000' };
    expect(retirementSpendMonthly(base)).toBe(4000);
    expect(retirementSpendMonthly({ ...base, retLocation: 'Portugal' })).toBeCloseTo(4000 * 0.6, 2);
    expect(retirementSpendMonthly({ ...base, retLocation: 'Switzerland' })).toBeCloseTo(4000 * 1.35, 2);
    expect(retirementSpendMonthly({ ...base, retLocation: 'Atlantis' })).toBe(4000);   // unknown → unchanged
  });
});

describe('capitalNeeded — amortization-based (replaces 4%-rule ×25)', () => {
  const { capitalNeeded } = require('./index');
  test('the live-test persona: 76→90, $15k/mo, 3% real, no bequest ≈ $2.03MM (not $4.5MM)', () => {
    const n = capitalNeeded({ monthlySpend: 15000, guaranteedMonthly: 0, retireAge: 76, horizonAge: 90, realReturn: 0.03, bequest: 0 });
    expect(n.years).toBe(14);
    expect(n.netAnnual).toBe(180000);
    expect(n.needed).toBeGreaterThan(1_900_000);
    expect(n.needed).toBeLessThan(2_100_000);          // ≈ 180k × 11.296
  });
  test('guaranteed income lowers the target dollar-for-dollar before the factor', () => {
    const n = capitalNeeded({ monthlySpend: 15000, guaranteedMonthly: 2400, retireAge: 76, horizonAge: 90, realReturn: 0.03, bequest: 0 });
    expect(n.netAnnual).toBe((15000 - 2400) * 12);
    expect(n.needed).toBeLessThan(1_750_000);
  });
  test('bequest is explicit: wanting to leave money RAISES the target by its present value', () => {
    const base = capitalNeeded({ monthlySpend: 10000, guaranteedMonthly: 0, retireAge: 65, horizonAge: 90, realReturn: 0.03, bequest: 0 });
    const withB = capitalNeeded({ monthlySpend: 10000, guaranteedMonthly: 0, retireAge: 65, horizonAge: 90, realReturn: 0.03, bequest: 200000 });
    expect(withB.needed - base.needed).toBeCloseTo(200000 / Math.pow(1.03, 25), 0);
  });
  test('longer horizon needs more; zero real return degrades to years × spending', () => {
    const short = capitalNeeded({ monthlySpend: 5000, guaranteedMonthly: 0, retireAge: 65, horizonAge: 75, realReturn: 0.03, bequest: 0 });
    const long = capitalNeeded({ monthlySpend: 5000, guaranteedMonthly: 0, retireAge: 65, horizonAge: 95, realReturn: 0.03, bequest: 0 });
    expect(long.needed).toBeGreaterThan(short.needed);
    const flat = capitalNeeded({ monthlySpend: 5000, guaranteedMonthly: 0, retireAge: 65, horizonAge: 75, realReturn: 0, bequest: 0 });
    expect(flat.needed).toBe(5000 * 12 * 10);
  });
});
