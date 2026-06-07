import { goalOptionsFor, buildSteps, type Status } from './engine';

describe('onboarding goal options — relevance-ordered per stage', () => {
  test('student: spending, goals, student-debt are top; retirement/partner/family lower', () => {
    const vals = goalOptionsFor('student').map((o) => o.value);
    expect(vals.slice(0, 3)).toEqual(['spend', 'goals', 'debt']);
    expect(vals.indexOf('debt')).toBeLessThan(vals.indexOf('retire_acc'));
    expect(vals.indexOf('retire_acc')).toBeLessThan(vals.indexOf('partner'));
    expect(vals).not.toContain('retire_dec');   // not offered to students
    expect(vals).not.toContain('legacy');
  });
  test('employed leads with spending then retirement; no student-debt/legacy', () => {
    const vals = goalOptionsFor('employed').map((o) => o.value);
    expect(vals[0]).toBe('spend');
    expect(vals[1]).toBe('retire_acc');
    expect(vals).not.toContain('debt');
    expect(vals).not.toContain('retire_dec');
  });
  test('retired leads with make-money-last + legacy; no accumulation/student-debt', () => {
    const vals = goalOptionsFor('retired').map((o) => o.value);
    expect(vals[0]).toBe('retire_dec');
    expect(vals).toContain('legacy');
    expect(vals).not.toContain('retire_acc');
    expect(vals).not.toContain('debt');
  });
  test('every offered option stays valid for buildSteps (no orphan tracks)', () => {
    (['student', 'employed', 'partial', 'retired'] as Status[]).forEach((s) => {
      const tracks = goalOptionsFor(s).map((o) => o.value);
      const steps = buildSteps(s, tracks);
      expect(steps[0]).toBe('status');
      expect(steps[steps.length - 1]).toBe('summary');
    });
  });
});
