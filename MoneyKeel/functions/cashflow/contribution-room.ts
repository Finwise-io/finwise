// Cash flow · How much room is left in my 401(k), IRA and HSA this year, and what fills it.
//
// THE DOOR for Q-CF-4, ruled by the founder 2026-09-27: "yes" — Contribution room, the Tax organizer
// and Home answer one question, so the room they each show cannot differ.
//
// THREE RULINGS LIVE IN HERE, and each was his:
//   · G1 — the age the IRS tests is the age ATTAINED IN THE YEAR, not the age today. Someone who
//     turns 50 in December gets the catch-up for the whole year.
//   · G10 (2026-09-08) — enrolled in Medicare means NO HSA contribution is allowed at all. Not a
//     smaller limit: none.
//   · G36 — the current month COUNTS as remaining when the room is spread over the rest of the year.
//     Leaving it out told people to save more per month than they need to.
import { declareFigures } from '../_figure-spec';
import {
  k401Headroom, annualIraLimit, annualHsaLimit, monthsLeftInYear, perMonthToFill, ageAttainedInYear,
  IRS_LIMITS,
} from '../../../src/domain/income/limits';

/** catchUp is WHETHER the age allows one, not how much — the limit already carries the amount. */
export interface Room { limit: number; used: number; remaining: number; catchUp: boolean; }

export interface ContributionRoom {
  year: number;
  /** The age the IRS tests — attained in the year, not today's (his ruling G1). */
  age: number | null;
  k401: Room;
  ira: Room;
  hsa: Room;
  /** Months left including this one (his ruling G36), and what filling the 401(k) would cost a month. */
  monthsLeft: number;
  perMonthToFill401k: number;
  /** True when Medicare bars an HSA contribution entirely (his ruling G10). */
  hsaBarredByMedicare: boolean;
}

/* ─ MK-CF-O-005 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * theContributionRoom
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     op = input.profile (or none when missing)
 *     num = (v: any) => (number.is finite(number(v)) ? number(v) : 0)
 *     age = age attained in year(num(op.birth year) or nothing)
 *     k401 = k401 headroom(age, num(op.c 401k) × 12)
 *     ira limit = annual ira limit(age)
 *     ira used = min(num(op.c roth) × 12, ira limit)
 *     medicare = true   if op.medicare enrolled = 'yes'
 *     false   if op.medicare enrolled = 'no'
 *     nothing   otherwise   otherwise
 *     hsa limit = annual hsa limit(age, false, medicare)
 *     hsa used = min(num(op.c hsa) × 12, hsa limit)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-017 birth year
 *               MK-XS-I-043 their own retirement contribution
 *               MK-XS-I-062 enrolled in Medicare (yes / no)
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Decides .....
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-005
 * Changed ..... not in git yet (—)
 */
/** ── ORCHESTRATOR ─────────────────────────────────────────────────────────────────────
 *  The one function a screen calls for this question. Written as a DOC comment on purpose: the
 *  header generator owns the plain block comment below and rewrites it on every build, which is how
 *  all twelve doors lost this marker once and two were typed F instead of O (2026-09-28). */
/* ─ MK-CF-O-005 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * theContributionRoom
 *
 * Answers ..... ── ORCHESTRATOR ───────────────────────────────────────────────────────────────────── The one function a screen calls for this question.
 *
 * Formula .....
 *     op = input.profile (or none when missing)
 *     num = (v: any) => (number.is finite(number(v)) ? number(v) : 0)
 *     age = age attained in year(num(op.birth year) or nothing)
 *     k401 = k401 headroom(age, num(op.c 401k) × 12)
 *     ira limit = annual ira limit(age)
 *     ira used = min(num(op.c roth) × 12, ira limit)
 *     medicare = true   if op.medicare enrolled = 'yes'
 *     false   if op.medicare enrolled = 'no'
 *     nothing   otherwise   otherwise
 *     hsa limit = annual hsa limit(age, false, medicare)
 *     hsa used = min(num(op.c hsa) × 12, hsa limit)
 *
 * Called by ... MK-CF-F-199 ROOM
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-F-199 ROOM
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-017 birth year
 *               MK-XS-I-043 their own retirement contribution
 *               MK-XS-I-062 enrolled in Medicare (yes / no)
 *
 * Decides .....
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-005
 * Changed ..... not in git yet (—)
 */
export function theContributionRoom(input: {
  profile: any;
  /** THE DAY IT IS READ ON. Absent means today, which is what the app passes. A worked example passes
   *  a fixed day, because "how much is left to put in this year" depends on the month — and an example
   *  whose answer changes when the calendar turns is an example that cannot be checked. This one broke
   *  on 2026-10-01 for exactly that reason: it said $5,300/month in September and $7,100 in October. */
  today?: Date;
}): ContributionRoom {
  const op = input.profile ?? {};
  const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const age = ageAttainedInYear(num(op.birthYear) || null);

  const k401 = k401Headroom(age, num(op.c_401k) * 12);
  const iraLimit = annualIraLimit(age);
  const iraUsed = Math.min(num(op.c_roth) * 12, iraLimit);
  // G10: Medicare bars it entirely — the limit itself is zero, not a reduced one
  const medicare: boolean | null = op.medicareEnrolled === 'yes' ? true : op.medicareEnrolled === 'no' ? false : null;
  const hsaLimit = annualHsaLimit(age, false, medicare);
  const hsaUsed = Math.min(num(op.c_hsa) * 12, hsaLimit);

  return {
    year: IRS_LIMITS.year,
    age,
    k401: { limit: k401.limit, used: k401.used, remaining: k401.remaining, catchUp: k401.catchUp },
    ira: { limit: iraLimit, used: iraUsed, remaining: Math.max(0, iraLimit - iraUsed), catchUp: age != null && age >= 50 },
    hsa: { limit: hsaLimit, used: hsaUsed, remaining: Math.max(0, hsaLimit - hsaUsed), catchUp: age != null && age >= 55 },
    monthsLeft: monthsLeftInYear(input.today),
    perMonthToFill401k: perMonthToFill(k401.remaining, input.today),
    hsaBarredByMedicare: medicare === true,
  };
}

/** THE WORKED EXAMPLE (six steps, step 6, 2026-09-28).
 *
 *  Someone born in 1965, putting $1,200/month into a 401(k), $300 into a Roth IRA and $150 into an
 *  HSA, not on Medicare. Every figure runs `theContributionRoom`, the real door.
 *
 *  THE BIRTH YEAR IS THE POINT. They turn 61 during 2026, and 60-to-63 is the one band the IRS gives
 *  the bigger catch-up to — $11,250 instead of $8,000 — so the 401(k) limit is $35,750 and not
 *  $32,500. That band is the heart of this audience and was missing from the code entirely until it
 *  was found. His ruling G1: the age is the one ATTAINED in the year, never today's.
 */
const EXAMPLE = {
  profile: { birthYear: 1965, c_401k: 1200, c_roth: 300, c_hsa: 150, medicareEnrolled: 'no' },
  // PINNED to 29 September 2026. Without it this example read the real clock and its answer changed
  // with the month — $5,300/month in September, $7,100 in October. An example a person cannot check
  // twice is not an example.
  today: new Date(2026, 8, 29),
};
const GIVEN =
  'Born 1965 — so 61 during 2026. Paying in $1,200/month to a 401(k), $300 to a Roth IRA and $150 '
  + 'to an HSA; not on Medicare. Read on 29 September 2026, so four months of the year are left.';
/* ─ MK-CF-F-199 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * ROOM
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     the contribution room(EXAMPLE)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-199
 * Changed ..... not in git yet (—)
 */
const ROOM = () => theContributionRoom(EXAMPLE);

/** THE FIGURES THIS DOOR HANDS OUT (rule 11). The master file's rows are printed from here. */
export const CONTRIBUTION_ROOM_FIGURES = declareFigures({
  'MK-MN-M-003': {
    label: '$X left / up to $Y', unit: 'money', screens: ['/contribution-room', '/home'],
    answers: 'How much more you can still put into this account this year.',
    formula: 'the IRS limit for your age this year, less what has gone in already',
    inputs: ['MK-XS-I-030 tax filing status and age', 'MK-XS-I-023 salary and other income'],
    decisions: ['The age tested is the age ATTAINED IN THE YEAR (his ruling G1) — someone turning 50 in December gets the catch-up for the whole year.'],
    refusal: 'No birth year entered — the catch-up cannot be judged, so the limit says it is the base one.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$21,350',
      run: () => ROOM().k401.remaining,
    },
  },
  'MK-MN-M-004': {
    label: 'about $X of the $Y limit', unit: 'money', screens: ['/contribution-room'],
    answers: 'What has gone in so far, against what the law allows.',
    formula: 'what you entered per month × 12, capped at the limit',
    inputs: ['MK-XS-I-023 salary and other income'],
    decisions: ['Capped at the limit: a figure above it would be describing a contribution the law does not permit.'],
    refusal: 'Nothing entered yet.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$14,400',
      run: () => ROOM().k401.used,
    },
  },
  'MK-MN-M-005': {
    label: 'about $X for the rest of the year', unit: 'money', per: 'month', screens: ['/contribution-room'],
    answers: 'What filling the remaining room would cost you each month.',
    formula: 'what is left ÷ the months remaining, this month included',
    inputs: ['MK-XS-I-023 salary and other income'],
    decisions: ['THIS MONTH COUNTS (his ruling G36). Leaving it out told people to save more per month than they need to.'],
    refusal: 'Nothing left to fill.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$5,300/month',
      run: () => ROOM().perMonthToFill401k,
    },
  },
  'MK-MN-M-029': {
    label: 'each contribution and its amount', unit: 'money', screens: ['/contribution-room'], grain: 'one account',
    answers: 'One line per tax-advantaged account, and what has gone into it.',
    formula: 'the monthly amount you entered for that account × 12',
    inputs: ['MK-XS-I-023 salary and other income'],
    decisions: ['Enrolled in Medicare means NO HSA contribution is allowed at all — not a smaller one (his ruling G10, 2026-09-08).'],
    refusal: 'Nothing entered for that account.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$5,000',
      run: () => ROOM().ira.remaining,
    },
  },
});
