// B-71: goals funded from surplus — the derived progress + on-track math.
import { monthsUntil, goalMonthsRemaining, requiredMonthly, monthsToGoal, goalProgressPct, goalStatus } from './index';

const NOW = new Date('2026-06-15T12:00:00');   // fixed clock so the month math is deterministic

describe('goal funding projections', () => {
  test('monthsUntil counts whole months to the target month, min 1', () => {
    expect(monthsUntil('2027-06', NOW)).toBe(12);
    expect(monthsUntil('2026-06', NOW)).toBe(1);     // same/past month floors to 1
    expect(monthsUntil(undefined, NOW)).toBeNull();
  });

  test('requiredMonthly = remaining / months (0 when funded, null with no date)', () => {
    expect(requiredMonthly({ target: 6000, saved: 2400, targetDate: '2027-06' }, NOW)).toBe(300);  // 3600/12
    expect(requiredMonthly({ target: 6000, saved: 6000, targetDate: '2027-06' }, NOW)).toBe(0);
    expect(requiredMonthly({ target: 6000, saved: 0 }, NOW)).toBeNull();                            // no date
  });

  test('monthsToGoal at a funding rate (null if rate <= 0)', () => {
    expect(monthsToGoal({ target: 6000, saved: 2400 }, 300)).toBe(12);
    expect(monthsToGoal({ target: 6000, saved: 2400 }, 0)).toBeNull();
    expect(monthsToGoal({ target: 6000, saved: 6000 }, 300)).toBe(0);
  });

  test('goalProgressPct clamps 0–100', () => {
    expect(goalProgressPct({ target: 6000, saved: 2400 })).toBe(40);
    expect(goalProgressPct({ target: 6000, saved: 9000 })).toBe(100);
    expect(goalProgressPct({ target: 0, saved: 100 })).toBe(0);
  });

  test('requiredMonthly + goalMonthsRemaining fall back to duration when no targetDate (the device bug)', () => {
    expect(goalMonthsRemaining({ target: 1, saved: 0, duration: 12 } as any, NOW)).toBe(12);
    expect(requiredMonthly({ target: 30000, saved: 0, duration: '30' } as any, NOW)).toBe(1000);
    expect(requiredMonthly({ target: 30000, saved: 0 } as any, NOW)).toBeNull();   // neither → null
  });

  test('goalStatus: a duration goal is BEHIND when the required exceeds savings capacity', () => {
    const home = { target: 740000, saved: 10000, duration: '30' };   // needs ~24,333/mo
    expect(goalStatus(home as any, 2000, NOW)).toBe('behind');        // can only free up 2,000/mo
    expect(goalStatus(home as any, 30000, NOW)).toBe('on_track');     // could save 30,000/mo
  });

  test('goalStatus: funding >= required → on_track, else behind; done when funded; no_date without a date', () => {
    const g = { target: 6000, saved: 2400, targetDate: '2027-06' };   // needs $300/mo
    expect(goalStatus(g, 300, NOW)).toBe('on_track');
    expect(goalStatus(g, 200, NOW)).toBe('behind');
    expect(goalStatus({ ...g, saved: 6000 }, 0, NOW)).toBe('done');
    expect(goalStatus({ target: 6000, saved: 0 }, 100, NOW)).toBe('no_date');
  });

  test('goalStatus: no committed funding (0 / null / undefined) → no_plan, not a misleading green/amber (build-34 #1b)', () => {
    const g = { target: 6000, saved: 2400, targetDate: '2027-06' };   // needs $300/mo, dated
    expect(goalStatus(g, 0, NOW)).toBe('no_plan');
    expect(goalStatus(g, undefined, NOW)).toBe('no_plan');
    expect(goalStatus(g, null, NOW)).toBe('no_plan');
    expect(goalStatus(g, 300, NOW)).toBe('on_track');                 // a real commitment resolves normally
    expect(goalStatus(g, 150, NOW)).toBe('behind');
    expect(goalStatus({ ...g, saved: 6000 }, 0, NOW)).toBe('done');   // done/no_date win over no_plan
    expect(goalStatus({ target: 6000, saved: 0 }, 0, NOW)).toBe('no_date');
  });
});
