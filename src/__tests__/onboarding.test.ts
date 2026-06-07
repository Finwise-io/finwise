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

  test('income sources gate the income detail screens (pick employment → salary/401k flow)', () => {
    // Without picking sources, only the source picker shows — no detail screens yet.
    const noSrc = buildSteps('employed', ['spend', 'retire_acc']);
    expect(noSrc).toContain('income_sources');
    expect(noSrc).not.toContain('income_salary');

    // Pick "employment" (ongoing) → salary + 401k/RSU/bonus appear; tax + recap too.
    const steps = buildSteps('employed', ['spend', 'retire_acc'], { incomeSources: ['employment'] });
    expect(steps).toEqual(
      expect.arrayContaining([
        'income_sources', 'income_salary', 'income_401k', 'income_rsu', 'income_tax', 'recap_income',
        'monthlySpending', 'recap_spend', 'contributionsByType', 'targetRetirementAge', 'recap_retire',
      ]),
    );
    expect(steps.filter((s) => s === 'income_401k')).toHaveLength(1);   // deduped across tracks
    expect(steps).not.toContain('horizonAge');
  });

  test('temporary job hides 401k/RSU/bonus; benefits/scholarship add their own screens', () => {
    const temp = buildSteps('student', ['spend'], { incomeSources: ['employment'], jobType: 'temporary' });
    expect(temp).toContain('income_salary');
    expect(temp).not.toContain('income_401k');
    expect(temp).not.toContain('income_rsu');

    const benefits = buildSteps('student', ['spend'], { incomeSources: ['benefits', 'scholarship'] });
    expect(benefits).toContain('income_benefits');
    expect(benefits).toContain('income_scholarship');
    expect(benefits).not.toContain('income_tax');     // benefits + scholarship are non-taxable → no tax screen
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
