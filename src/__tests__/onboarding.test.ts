import { buildSteps, goalOptionsFor, isOptional } from '../onboarding/engine';

describe('onboarding engine — data-driven flow (matrix v3)', () => {
  test('retired + invest only: no income / retirement / location', () => {
    const steps = buildSteps('retired', ['invest']);
    expect(steps).toEqual(
      expect.arrayContaining(['investObjective', 'trackingLevel', 'investmentHoldings', 'recap_invest']),
    );
    expect(steps).not.toContain('income');
    expect(steps).not.toContain('birth');
    expect(steps).not.toContain('retLocation');
    expect(steps).not.toContain('targetRetirementAge');
  });

  test('retired + make-money-last: decumulation fields, no income/age; location is optional', () => {
    const steps = buildSteps('retired', ['retire_dec']);
    expect(steps).toEqual(
      expect.arrayContaining(['retirementIncomeSources', 'horizonAge', 'currentSavingsPortfolio', 'recap_retire']),
    );
    expect(steps).not.toContain('income');           // retirement income sources ARE the income
    expect(steps).not.toContain('targetRetirementAge');
    expect(steps).toContain('retLocation');          // present...
    expect(isOptional('retLocation')).toBe(true);    // ...but skippable
  });

  test('employed + spend + retire_acc: contributions by type, employer, recaps', () => {
    const steps = buildSteps('employed', ['spend', 'retire_acc']);
    expect(steps).toEqual(
      expect.arrayContaining([
        'income', 'monthlySpending', 'recap_spend',
        'contributionsByType', 'employerContribution', 'targetRetirementAge', 'recap_retire',
      ]),
    );
    expect(steps).not.toContain('horizonAge');
    expect(steps).not.toContain('retirementIncomeSources');
  });

  test('goals reuses income/spending when spend also selected (no duplicate capacity ask)', () => {
    expect(buildSteps('employed', ['goals'])).toContain('monthlySavingsCapacity');
    expect(buildSteps('employed', ['spend', 'goals'])).not.toContain('monthlySavingsCapacity');
  });

  test('account always right after the goals(services) step', () => {
    const steps = buildSteps('employed', ['spend', 'retire_acc', 'invest']);
    expect(steps.slice(0, 4)).toEqual(['status', 'goals', 'account', 'name']);
    expect(steps[steps.length - 1]).toBe('summary');
  });

  test('retired goal options exclude accumulation; employed excludes decumulation', () => {
    expect(goalOptionsFor('retired').map(o => o.value)).not.toContain('retire_acc');
    expect(goalOptionsFor('retired').map(o => o.value)).toContain('retire_dec');
    expect(goalOptionsFor('employed').map(o => o.value)).not.toContain('retire_dec');
    expect(goalOptionsFor('employed').map(o => o.value)).toContain('retire_acc');
  });
});
