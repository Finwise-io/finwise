import { goalOptionsFor, goalGroupsFor, buildSteps, type Status } from './engine';

describe('onboarding goals — grouped, stage-ordered sections', () => {
  test('student leads with "Manage money now" (spending/goals/debt); retirement lower', () => {
    const groups = goalGroupsFor('student');
    expect(groups[0].title).toBe('Manage money now');
    const vals = goalOptionsFor('student').map((o) => o.value);
    expect(vals.slice(0, 3)).toEqual(['spend', 'goals', 'debt']);
    expect(vals.indexOf('debt')).toBeLessThan(vals.indexOf('retire_acc'));
    expect(vals).not.toContain('retire_dec');   // not offered to students
    expect(vals).not.toContain('legacy');
  });
  test('employed: manage-money first, then plan-ahead; debt is general (offered)', () => {
    const groups = goalGroupsFor('employed');
    expect(groups.map((g) => g.title)).toEqual(['Manage money now', 'Plan ahead', 'Grow & track', 'With others']);
    const vals = goalOptionsFor('employed').map((o) => o.value);
    expect(vals[0]).toBe('spend');
    expect(vals).toContain('retire_acc');
    expect(vals).toContain('debt');             // debt now general, not student-only
    expect(vals).toContain('networth');         // net worth offered
    expect(vals).not.toContain('retire_dec');
  });
  test('retired leads with "Plan ahead" (make-money-last + legacy); no accumulation', () => {
    const groups = goalGroupsFor('retired');
    expect(groups[0].title).toBe('Plan ahead');
    const vals = goalOptionsFor('retired').map((o) => o.value);
    expect(vals[0]).toBe('retire_dec');
    expect(vals).toContain('legacy');
    expect(vals).not.toContain('retire_acc');
  });
  test('every offered option stays valid for buildSteps (no orphan tracks)', () => {
    (['student', 'employed', 'partial', 'retired'] as Status[]).forEach((s) => {
      const tracks = goalOptionsFor(s).map((o) => o.value);
      const steps = buildSteps(s, tracks);
      expect(steps[0]).toBe('status');
      expect(steps[steps.length - 1]).toBe('summary');
    });
  });
  test('net worth track adds only the hand-off step (capture happens in the Net Worth tab)', () => {
    const withNW = buildSteps('employed', ['networth']);
    expect(withNW).toEqual(['status', 'goals', 'account', 'name', 'networthIntro', 'summary']);
  });
});
