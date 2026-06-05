import { currentAge, yearsToRetirement, retirementHorizonYears, toReadModel } from './calc';
import { profileFromOnboarding } from './onboarding';
import { Profile } from './types';

describe('profile calc', () => {
  test('currentAge: birthday already passed this year', () => {
    expect(currentAge(1990, 3, new Date('2026-06-02'))).toBe(36);
  });
  test('currentAge: birthday not yet reached this year', () => {
    expect(currentAge(1990, 9, new Date('2026-06-02'))).toBe(35);
  });
  test('currentAge: missing data → null', () => {
    expect(currentAge(null, 3)).toBeNull();
    expect(currentAge(1990, null)).toBeNull();
  });

  test('yearsToRetirement: normal + never negative', () => {
    expect(yearsToRetirement(40, 65)).toBe(25);
    expect(yearsToRetirement(70, 65)).toBe(0);          // already past target
    expect(yearsToRetirement(null, 65)).toBeNull();
  });

  test('retirementHorizonYears: uses default plan-to age (90) when unset', () => {
    expect(retirementHorizonYears(65, null)).toBe(25);   // 90 − 65
    expect(retirementHorizonYears(65, 95)).toBe(30);
    expect(retirementHorizonYears(null, 95)).toBeNull();
  });

  test('toReadModel derives all planning values', () => {
    const p: Profile = {
      user_id: 'u1', first_name: 'Alex', employment_status: 'employed',
      birth_month: 3, birth_year: 1990, target_retirement_age: 65, plan_to_age: null,
      retire_country: null, has_partner: false, partner_name: null, dependents_count: 0,
    };
    const rm = toReadModel(p, new Date('2026-06-02'));
    expect(rm.current_age).toBe(36);
    expect(rm.years_to_retirement).toBe(29);
    expect(rm.retirement_horizon_years).toBe(25);
  });
});

describe('profile from onboarding', () => {
  test('maps onboarding answers + parses string inputs', () => {
    const op = {
      name: ' Alex ', status: 'employed', birthMonth: '3', birthYear: '1990',
      targetRetirementAge: '65', retLocation: 'USA', hasPartner: 'yes',
      partnerName: 'Sam', dependentsCount: '2',
    };
    const p = profileFromOnboarding('u1', op);
    expect(p).toMatchObject({
      user_id: 'u1', first_name: 'Alex', employment_status: 'employed',
      birth_month: 3, birth_year: 1990, target_retirement_age: 65,
      retire_country: 'USA', has_partner: true, partner_name: 'Sam', dependents_count: 2,
    });
  });

  test('handles empty/missing onboarding gracefully', () => {
    const p = profileFromOnboarding('u1', null);
    expect(p.user_id).toBe('u1');
    expect(p.has_partner).toBe(false);
    expect(p.dependents_count).toBe(0);
    expect(p.target_retirement_age).toBeNull();
  });
});
