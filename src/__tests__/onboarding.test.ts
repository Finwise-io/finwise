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

  test('employed + spend + retire_acc: focused income flow + recaps, 401k deduped', () => {
    const steps = buildSteps('employed', ['spend', 'retire_acc']);
    expect(steps).toEqual(
      expect.arrayContaining([
        'income_salary', 'income_401k', 'income_rsu', 'income_tax', 'recap_income',
        'monthlySpending', 'recap_spend', 'contributionsByType', 'targetRetirementAge', 'recap_retire',
      ]),
    );
    // income_401k appears once even though both spend and retire_acc reference it
    expect(steps.filter((s) => s === 'income_401k')).toHaveLength(1);
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
