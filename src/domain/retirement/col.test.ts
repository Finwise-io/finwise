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
