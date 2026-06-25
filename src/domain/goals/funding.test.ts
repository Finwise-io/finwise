// B-71: goals funded from surplus — the derived progress + on-track math.
import { monthsUntil, requiredMonthly, monthsToGoal, goalProgressPct, goalStatus } from './index';

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

  test('goalStatus: funding >= required → on_track, else behind; done when funded; no_date without a date', () => {
    const g = { target: 6000, saved: 2400, targetDate: '2027-06' };   // needs $300/mo
    expect(goalStatus(g, 300, NOW)).toBe('on_track');
    expect(goalStatus(g, 200, NOW)).toBe('behind');
    expect(goalStatus({ ...g, saved: 6000 }, 0, NOW)).toBe('done');
    expect(goalStatus({ target: 6000, saved: 0 }, 100, NOW)).toBe('no_date');
  });
});
