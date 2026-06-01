import { buildSteps, goalOptionsFor } from '../onboarding/engine';

describe('onboarding engine — life-stage branching', () => {
  test('retired flow uses decumulation horizon, never accumulation age', () => {
    const steps = buildSteps('retired', ['retire_dec', 'spend']);
    expect(steps).toContain('ret_horizon');
    expect(steps).not.toContain('ret_age');
  });

  test('retired goal options exclude "plan for retirement" (retire_acc)', () => {
    const vals = goalOptionsFor('retired').map(o => o.value);
    expect(vals).not.toContain('retire_acc');
    expect(vals).toContain('retire_dec');
  });

  test('employed flow uses accumulation age, not horizon', () => {
    const steps = buildSteps('employed', ['retire_acc', 'spend']);
    expect(steps).toContain('ret_age');
    expect(steps).not.toContain('ret_horizon');
  });

  test('spending-only flow is short: status → … → summary, no retirement', () => {
    const steps = buildSteps('employed', ['spend']);
    expect(steps[0]).toBe('status');
    expect(steps[steps.length - 1]).toBe('summary');
    expect(steps).not.toContain('ret_age');
    expect(steps).not.toContain('ret_horizon');
  });

  test('account always comes right after goals', () => {
    const steps = buildSteps('employed', ['spend', 'retire_acc']);
    expect(steps.slice(0, 3)).toEqual(['status', 'goals', 'account']);
  });
});
