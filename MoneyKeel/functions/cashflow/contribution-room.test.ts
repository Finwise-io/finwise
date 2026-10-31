/** THE DOOR FOR "how much room is left" — MK-CF-O-005 theContributionRoom (Q-CF-4, ruled 2026-09-27).
 *  Three of his rulings live here, and these are their laws.
 */
import { theContributionRoom } from './contribution-room';

const thisYear = new Date().getFullYear();

test('G1: the age tested is the age ATTAINED IN THE YEAR, not the age today', () => {
  // someone turning 50 this year gets the catch-up for the whole year, whatever month it is
  const turning50 = theContributionRoom({ profile: { birthYear: thisYear - 50 } });
  expect(turning50.age).toBe(50);
  expect(turning50.k401.catchUp).toBe(true);
  const turning49 = theContributionRoom({ profile: { birthYear: thisYear - 49 } });
  expect(turning49.k401.catchUp).toBe(false);
  expect(turning49.k401.limit).toBeLessThan(turning50.k401.limit);
});

test('G10: enrolled in Medicare means NO HSA contribution at all — not a smaller one', () => {
  const onMedicare = theContributionRoom({ profile: { birthYear: thisYear - 67, medicareEnrolled: 'yes' } });
  expect(onMedicare.hsa.limit).toBe(0);
  expect(onMedicare.hsa.remaining).toBe(0);
  expect(onMedicare.hsaBarredByMedicare).toBe(true);
  const notOnIt = theContributionRoom({ profile: { birthYear: thisYear - 67, medicareEnrolled: 'no' } });
  expect(notOnIt.hsa.limit).toBeGreaterThan(0);
});

test('G36: this month COUNTS as remaining, so the per-month figure is not overstated', () => {
  const r = theContributionRoom({ profile: { birthYear: thisYear - 40 } });
  const monthsLeftIfThisOneCounts = 12 - new Date().getMonth();
  expect(r.monthsLeft).toBe(monthsLeftIfThisOneCounts);
  // rounded to the nearest $100 — a savings instruction to the dollar is false precision
  expect(r.perMonthToFill401k).toBe(Math.round(r.k401.remaining / r.monthsLeft / 100) * 100);
});

// FIXED 2026-10-25 (FIX-ROOM; tenets 1, 5, 7 of DEC-3523; IRC §402(g)): what goes in is never cut to the limit — the excess is
// a figure of its own, because money over the limit has to come out by April 15 or it is taxed twice
test('what goes in is shown as it is, and what is over the limit is the excess — never cut to the limit', () => {
  const r = theContributionRoom({ profile: { birthYear: thisYear - 40, c_401k: 99999 } });
  expect(r.k401.used).toBe(99999 * 12);
  expect(r.k401.remaining).toBe(0);
  expect(r.k401.excess).toBe(99999 * 12 - r.k401.limit);
  // the worked case: at 60, $3,333.33 a month = $39,999.96 — $4,249.96 over the $35,750 limit
  const at60 = theContributionRoom({ profile: { birthYear: 1966, c_401k: 3333.33 }, today: new Date(2026, 9, 25, 12) });
  expect([at60.k401.limit, at60.k401.remaining]).toEqual([35_750, 0]);
  expect(at60.k401.used).toBeCloseTo(39_999.96, 9);
  expect(at60.k401.excess).toBeCloseTo(4_249.96, 9);
  // the IRA follows the same rule: $800 a month at 60 is $9,600, $1,000 over $8,600
  const ira = theContributionRoom({ profile: { birthYear: 1966, c_roth: 800 }, today: new Date(2026, 9, 25, 12) }).ira;
  expect([ira.limit, ira.used, ira.remaining, ira.excess]).toEqual([8_600, 9_600, 0, 1_000]);
});
test.failing('the door until 2026-10-25, pinned: what had gone in was cut to the limit — no longer its answer (FIXED 2026-10-25)', () => {
  const r = theContributionRoom({ profile: { birthYear: thisYear - 40, c_401k: 99999 } });
  expect(r.k401.used).toBe(r.k401.limit);
});

test('no birth year: the base limits, and the door says they are the base ones (tenet 3; MK-MN-M-003\'s refusal line)', () => {
  const r = theContributionRoom({ profile: { c_401k: 1000 }, today: new Date(2026, 9, 25, 12) });
  expect(r.baseLimitOnly).toBe(true);
  expect([r.k401.limit, r.ira.limit, r.hsa.limit]).toEqual([24_500, 7_500, 4_400]);
  expect([r.k401.used, r.k401.remaining]).toEqual([12_000, 12_500]);
  expect(theContributionRoom({ profile: { birthYear: 1976 }, today: new Date(2026, 9, 25, 12) }).baseLimitOnly).toBe(false);
});

test('MEDICARE FROM A MONTH THIS YEAR leaves the months before it (IRS Publication 969): 66, from July 2026 → $5,400 × 6 ÷ 12 = $2,700', () => {
  const on = (medicareStart?: string) => theContributionRoom({ profile: { birthYear: 1960, medicareEnrolled: 'yes', ...(medicareStart ? { medicareStart } : {}) }, today: new Date(2026, 9, 25, 12) });
  const july = on('2026-07');
  expect([july.hsa.limit, july.hsaEligibleMonths, july.hsaFullYearLimit, july.hsaBarredByMedicare]).toEqual([2_700, 6, 5_400, false]);
  expect(july.medicareFrom).toEqual({ year: 2026, month: 7 });
  // January, before this year, or no month said: none at all (his G10 where nothing more is known)
  for (const v of ['2026-01', 'before-2026', '2025-03', undefined]) {
    const r = on(v);
    expect([v, r.hsa.limit, r.hsaEligibleMonths, r.hsaBarredByMedicare]).toEqual([v, 0, 0, true]);
  }
  // a start in a later year leaves this whole year
  expect(on('2027-02').hsa.limit).toBe(5_400);
});

test('the day it is read on reaches the age too: a fixed day fixes the age, not the device clock', () => {
  const r = theContributionRoom({ profile: { birthYear: 1976 }, today: new Date(2030, 5, 1, 12) });
  expect(r.age).toBe(54);
});

test('no birth year: the base limit stands, and no catch-up is claimed', () => {
  const r = theContributionRoom({ profile: {} });
  expect(r.age).toBeNull();
  expect(r.k401.catchUp).toBe(false);
  expect(r.k401.limit).toBeGreaterThan(0);
});

// ── WORKPLAN #361 (2026-10-27, FX-CF-C; drawing contribution-room v02, rows 3 and 4) — the two inputs CFR-4 found missing ─────────
// Worked by hand with the 2026 IRS limits (src/domain/income/limits.ts IRS_LIMITS): IRA $7,500 + $1,100 at 50; HSA self-only
// $4,400, family $8,750, + $1,000 at 55. The day is fixed, so the age is the same whatever the clock says.
const DAY_361 = new Date(2026, 9, 27, 12);
describe('#361 · HSA cover, self-only or family', () => {
  test('family cover takes the family limit: 55 this year → $8,750 + $1,000 = $9,750; self-only, or nothing chosen, $4,400 + $1,000 = $5,400', () => {
    const at = (hsaCover?: string) => theContributionRoom({ profile: { birthYear: 1971, hsaCover }, today: DAY_361 });
    expect([at('family').hsa.limit, at('family').hsaFullYearLimit, at('family').hsaCover]).toEqual([9_750, 9_750, 'family']);
    expect([at('self').hsa.limit, at('self').hsaCover]).toEqual([5_400, 'self']);
    expect([at().hsa.limit, at().hsaCover]).toEqual([5_400, null]);           // not chosen: the self-only limit, never the family one unasked
    expect([at('both').hsa.limit, at('both').hsaCover]).toEqual([5_400, null]);   // anything else is not an answer
  });
  test('family cover and Medicare from July: ($8,750 + $1,000) × 6 ÷ 12 = $4,875; with no month, $0 (his G10)', () => {
    const r = theContributionRoom({ profile: { birthYear: 1960, hsaCover: 'family', medicareEnrolled: 'yes', medicareStart: '2026-07' }, today: DAY_361 });
    expect([r.hsa.limit, r.hsaFullYearLimit, r.hsaEligibleMonths]).toEqual([4_875, 9_750, 6]);
    expect(theContributionRoom({ profile: { birthYear: 1960, hsaCover: 'family', medicareEnrolled: 'yes' }, today: DAY_361 }).hsa.limit).toBe(0);
  });
});
describe('#361 · one IRA amount for Traditional and Roth together', () => {
  test('$450 a month → $5,400 this year; $8,600 − $5,400 = $3,200 room, one limit for both (IRC §408A(c)(2))', () => {
    const r = theContributionRoom({ profile: { birthYear: 1971, c_ira: '450' }, today: DAY_361 });
    expect([r.ira.monthly, r.ira.used, r.ira.remaining, r.ira.excess, r.ira.limit]).toEqual([450, 5_400, 3_200, 0, 8_600]);
  });
  test('until it is typed, the Roth amount sign-up stored still counts; once typed — even cleared — it alone is read, so nothing counts twice', () => {
    const at = (p: any) => theContributionRoom({ profile: { birthYear: 1965, ...p }, today: DAY_361 }).ira;
    expect(at({ c_roth: '300' }).used).toBe(3_600);                   // $300 × 12, as before
    expect(at({ c_roth: '300', c_ira: '500' }).used).toBe(6_000);     // $500 × 12 — never $300 + $500
    expect(at({ c_roth: '300', c_ira: '' }).used).toBe(0);            // cleared: nothing entered, the card reads "up to $8,600"
    expect(at({ c_ira: '800' })).toMatchObject({ used: 9_600, remaining: 0, excess: 1_000 });   // over the $8,600 limit by $1,000
  });
});
