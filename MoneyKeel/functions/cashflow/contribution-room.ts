// Cash flow · How much room is left in my 401(k), IRA and HSA this year, and what fills it.
//
// THE DOOR for Q-CF-4, ruled by the founder 2026-09-27: "yes" — Contribution room, the Tax organizer
// and Home answer one question, so the room they each show cannot differ.
//
// THREE RULINGS LIVE IN HERE, and each was his:
//   · G1 — the age the IRS tests is the age ATTAINED IN THE YEAR, not the age today. Someone who
//     turns 50 in December gets the catch-up for the whole year.
//   · G10 (2026-09-08) — enrolled in Medicare means NO HSA contribution is allowed at all. Not a
//     smaller limit: none. Since 2026-10-25 (FIX-ROOM; IRS Publication 969, DEC-0378) that holds from Medicare's first
//     month: a first month this year leaves the months before it — from July, $5,400 × 6 ÷ 12 = $2,700.
//   · G36 — the current month COUNTS as remaining when the room is spread over the rest of the year.
//     Leaving it out told people to save more per month than they need to.
import { declareFigures } from '../_figure-spec';
import {
  k401Headroom, annualIraLimit, annualHsaLimit, monthsLeftInYear, perMonthToFill, ageAttainedInYear,
  IRS_LIMITS,
} from '../../../src/domain/income/limits';

/** catchUp is WHETHER the age allows one, not how much — the limit already carries the amount.
 *  used is the year at the monthly amount entered (monthly × 12), never cut to the limit; excess is what that puts in above
 *  the limit, 0 when nothing is over (2026-10-25, FIX-ROOM; tenets 1, 5, 7; IRC §402(g) for the 401(k), §4973 for the IRA). */
export interface Room { limit: number; used: number; remaining: number; excess: number; catchUp: boolean; monthly: number; }

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
  /** NO BIRTH YEAR (2026-10-25, FIX-ROOM; tenet 3, and MK-MN-M-003's own refusal line): every limit is the one before any
   *  catch-up, and the screen says so beside a place to enter the year. */
  baseLimitOnly: boolean;
  /** The HSA months that count this year: 12, or the months before Medicare's first month this year (IRS Publication 969).
   *  medicareFrom is what the person said — the first month this year, 'before' this year, or null when not said. */
  hsaEligibleMonths: number;
  medicareFrom: { year: number; month: number } | 'before' | null;
  /** the HSA limit for a whole year at this age, before any Medicare months come off — the "$5,400" of "$5,400 × 6 ÷ 12" */
  hsaFullYearLimit: number;
  /** HSA COVER, AS THE PERSON CHOSE IT (2026-10-27, FX-CF-C; workplan #361; drawing contribution-room v02, row 4): 'family' uses the
   *  family limit ($8,750 in 2026, Rev. Proc. 2025-19), 'self' the self-only one; null = not chosen, and the limit stays the
   *  self-only one — the reading that never lets a person put in more than the law allows. The screen says which it is. */
  hsaCover: 'self' | 'family' | null;
}

/** WHEN MEDICARE BEGAN, as the room reads it: the stored answer is "YYYY-MM" (its first month) or "before-YYYY" (it began
 *  before that year). Anything else is not an answer. The answer is input MK-XS-I-074, the month Medicare began (beside MK-XS-I-062). */
/* ─ MK-CF-F-248 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * medicareFromOf
 *
 * Answers ..... WHEN MEDICARE BEGAN, as the room reads it: the stored answer is "YYYY-MM" (its first month) or "before-YYYY" (it began before that year).
 *
 * Formula .....
 *     s = string(v ?? '')
 *     'before'   when ÷ ^before-\d{4}$ ÷ .test(s)
 *     m = ÷ ^(\d{4}) − (\d{2})$ ÷ .exec(s)
 *     nothing   when m is missing
 *     year = m[1]), month = number(m[2] read as a number
 *     the answer:
 *     { year, month }   if month ≥ 1 and month ≤ 12
 *     nothing   otherwise
 *
 * Called by ... MK-CF-O-005 theContributionRoom
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-199 ROOM · MK-CF-F-229 balanceGrownTo
 *               MK-CF-F-043 compareMortgageToTreasury · MK-CF-F-126 futureValue
 *               MK-CF-O-005 theContributionRoom
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-248
 * Changed ..... not in git yet (—)
 */
function medicareFromOf(v: unknown): { year: number; month: number } | 'before' | null {
  const s = String(v ?? '');
  if (/^before-\d{4}$/.test(s)) return 'before';
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  if (!m) return null;
  const year = Number(m[1]), month = Number(m[2]);
  return month >= 1 && month <= 12 ? { year, month } : null;
}

/** How much room is left in my 401(k), IRA and HSA this year, and what would fill it?
 *  ── ORCHESTRATOR ── the one function a screen asks for this.
 *  The one function a screen calls for this question. Written as a DOC comment on purpose: the
 *  header generator owns the plain block comment below and rewrites it on every build, which is how
 *  all twelve doors lost this marker once and two were typed F instead of O (2026-09-28). */
/* ─ MK-CF-O-005 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * theContributionRoom
 *
 * Answers ..... How much room is left in my 401(k), IRA and HSA this year, and what would fill it?
 *
 * Formula .....
 *     op = input.profile (or none when missing)
 *     num = (v: any) => (number.is finite(number(v)) ? number(v) : 0)
 *     today = input.today (or new date() when missing)
 *     age = age attained in year(num(op.birth year) or nothing, today)
 *     k401 = k401 headroom(age, num(op.c 401k) × 12)
 *     ira limit = annual ira limit(age)
 *     ira monthly = max(0, num(op.c ira)   if op.c ira ≠ nothing
 *     num(op.c roth)   otherwise)
 *     ira used = ira monthly × 12
 *     medicare = true   if op.medicare enrolled = 'yes'
 *     false   if op.medicare enrolled = 'no'
 *     nothing   otherwise   otherwise
 *     from = medicare from of(op.medicare start)   if medicare = true
 *     nothing   otherwise
 *     this year = today.get full year()
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-F-199 ROOM
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-199 ROOM · MK-CF-F-229 balanceGrownTo
 *               MK-CF-F-043 compareMortgageToTreasury · MK-CF-F-126 futureValue
 *               MK-CF-O-005 theContributionRoom
 *
 * Serves ...... MK-MN-M-031 · MK-MN-M-032 · MK-MN-M-033
 * Reads ....... MK-XS-I-017 birth year
 *               MK-XS-I-043 their own retirement contribution
 *               MK-XS-I-062 enrolled in Medicare (yes / no)
 *               MK-XS-I-074 the month Medicare began — "YYYY-MM", or "before-YYYY" for a start before the year
 *               MK-XS-I-080 what goes into IRAs a month — Traditional and Roth together, one amount, since they share one limit
 *               MK-XS-I-081 the HSA cover — self-only or family
 *
 * Decides .....
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
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
  const today = input.today ?? new Date();
  // the age on the day it is read — `today` reaches the age too (it read the device clock, so a fixed day could not fix it)
  const age = ageAttainedInYear(num(op.birthYear) || null, today);

  // WHAT GOES IN IS NEVER CUT TO THE LIMIT (2026-10-25, FIX-ROOM): the year at the monthly amount entered, and what it puts
  // in above the limit. At 60, $3,333.33 a month is $40,000 — $4,250 over the $35,750 limit; it read "$35,750 used".
  const k401 = k401Headroom(age, num(op.c_401k) * 12);
  const iraLimit = annualIraLimit(age);
  // ONE AMOUNT FOR BOTH IRAs (2026-10-27, FX-CF-C; workplan #361, CFR-4: "only a Roth IRA amount exists"): a Traditional and a Roth
  // IRA share one limit (IRC §408A(c)(2)), so the room needs one monthly amount, Traditional and Roth together — c_ira, typed on the
  // IRA card. Until it is typed, the Roth amount sign-up stored before (c_roth) still counts, as it did; once typed (even cleared to
  // nothing) c_ira alone is read. Read here only: what a person invests stays sign-up's one figure, so the plan counts nothing twice.
  const iraMonthly = Math.max(0, op.c_ira != null ? num(op.c_ira) : num(op.c_roth));
  const iraUsed = iraMonthly * 12;
  // G10: Medicare bars it from its first month — a month this year leaves the months before it (IRS Publication 969);
  // no month said, or a start before this year, leaves none
  const medicare: boolean | null = op.medicareEnrolled === 'yes' ? true : op.medicareEnrolled === 'no' ? false : null;
  const from = medicare === true ? medicareFromOf(op.medicareStart) : null;
  const thisYear = today.getFullYear();
  const firstMonth = from == null || from === 'before' ? null
    : from.year < thisYear ? null : from.year > thisYear ? 13 : from.month;   // 13: it begins after this year
  const enrolledThisYear = medicare === true && firstMonth !== 13;
  // HSA COVER (2026-10-27, FX-CF-C; #361): family cover takes the family limit; not chosen → self-only, said so on the screen
  const hsaCover: 'self' | 'family' | null = op.hsaCover === 'family' ? 'family' : op.hsaCover === 'self' ? 'self' : null;
  const family = hsaCover === 'family';
  const hsaLimit = annualHsaLimit(age, family, enrolledThisYear, enrolledThisYear ? firstMonth : null);
  const hsaEligibleMonths = !enrolledThisYear ? 12 : firstMonth == null ? 0 : firstMonth - 1;
  const hsaUsed = Math.max(0, num(op.c_hsa) * 12);
  const room = (limit: number, used: number) => ({ remaining: Math.max(0, limit - used), excess: Math.max(0, used - limit) });

  return {
    year: IRS_LIMITS.year,
    age,
    k401: { limit: k401.limit, used: k401.used, remaining: k401.remaining, excess: k401.excess, catchUp: k401.catchUp, monthly: Math.max(0, num(op.c_401k)) },
    ira: { limit: iraLimit, used: iraUsed, ...room(iraLimit, iraUsed), catchUp: age != null && age >= 50, monthly: iraMonthly },
    hsa: { limit: hsaLimit, used: hsaUsed, ...room(hsaLimit, hsaUsed), catchUp: age != null && age >= 55, monthly: Math.max(0, num(op.c_hsa)) },
    monthsLeft: monthsLeftInYear(today),
    perMonthToFill401k: perMonthToFill(k401.remaining, today),
    hsaBarredByMedicare: enrolledThisYear && hsaEligibleMonths === 0,
    baseLimitOnly: age == null,
    hsaEligibleMonths,
    medicareFrom: medicare === true ? from : null,
    hsaFullYearLimit: annualHsaLimit(age, family),
    hsaCover,
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

/** Example only: runs theContributionRoom on the worked example and calculates nothing of its own. */
/* ─ MK-CF-F-199 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * ROOM
 *
 * Answers ..... Example only: runs theContributionRoom on the worked example and calculates nothing of its own.
 *
 * Formula .....
 *     the contribution room(EXAMPLE)
 *
 * Called by ... MK-CF-F-043 compareMortgageToTreasury · MK-CF-F-126 futureValue
 *               MK-CF-O-005 theContributionRoom
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-199 ROOM · MK-CF-F-229 balanceGrownTo
 *               MK-CF-F-043 compareMortgageToTreasury · MK-CF-F-126 futureValue
 *               MK-CF-O-005 theContributionRoom
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
    label: 'room for $X / up to $Y / $X over', unit: 'money', screens: ['/contribution-room', '/home'],
    answers: 'How much more you can still put into this account this year — or, when the monthly amount puts in more than the law allows, how much over.',
    formula: 'the IRS limit for your age this year, less the year at the monthly amount you entered (monthly × 12); never below $0 — what goes in above the limit is the amount over',
    inputs: ['MK-XS-I-030 tax filing status and age', 'MK-XS-I-023 salary and other income'],
    decisions: ['The age tested is the age ATTAINED IN THE YEAR (his ruling G1) — someone turning 50 in December gets the catch-up for the whole year.',
      'THE YEAR AT THE MONTHLY AMOUNT, SAID AS A PLAN (the lead\u2019s ruling of 2026-10-25 on CFR-4\u2019s first question, the way DEC-0013 did the HSA card): the app has no input for money already in this year, so the card reads "room for $X" and "At $1,000/month you will put in $12,000 this year — room for $20,500 more", never "left". Nothing entered → "up to" the limit. To reverse: "$X left" again.',
      'OVER THE LIMIT IS SHOWN (2026-10-25, tenets 1, 5, 7; IRC §402(g), §4973): "$4,250 over", with what the law does with the excess. It read "$0 left".',
      'NO BIRTH YEAR → the base limit, and the screen says so beside a place to enter the year (tenet 3; this figure\u2019s refusal line).'],
    refusal: 'No birth year entered — the catch-up cannot be judged, so the limit says it is the base one.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$21,350',
      run: () => ROOM().k401.remaining,
    },
  },
  'MK-MN-M-004': {
    label: 'At $M/month you will put in $X this year', unit: 'money', screens: ['/contribution-room'],
    answers: 'What the monthly amount you entered puts in over the whole year — a plan, not money already in.',
    formula: 'what you entered per month × 12 — never cut to the limit',
    inputs: ['MK-XS-I-023 salary and other income'],
    decisions: ['NEVER CUT TO THE LIMIT (2026-10-25, FIX-ROOM; tenets 1, 5, 7 of DEC-3523; IRC §402(g)): at 60, $3,333.33 a month is $40,000, $4,250 over the $35,750 limit — and money over the limit has to come out by April 15 or it is taxed twice. It was capped at the limit, so the $4,250 vanished. To reverse: cap it again.'],
    refusal: 'Nothing entered yet — the card reads "up to" the limit.',
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
  // THE FIGURES THE CARDS' SENTENCES NAME (2026-10-26, PF-TOOLS; CLEANUP-TESTS' rule 11 red): the sentences FIX-ROOM wrote on
  // 2026-10-25 — "At $1,200/month you will put in $14,400 this year — $X over the $35,750 limit", "The 2026 limit is $X", the HSA's
  // Medicare months "$5,400 × 6 ÷ 12 = $2,700" — printed the limit, the monthly amount and the whole-year HSA limit with no
  // identifier (the screen's undeclared figures went from 7 to 13). Each is its own figure now.
  'MK-MN-M-031': {
    label: 'the $X limit', unit: 'money', screens: ['/contribution-room'], grain: 'one account',
    answers: 'The most the law lets this account take this year, at the person\u2019s age — for an HSA, the months before Medicare only.',
    formula: 'the IRS limit for the account and the age attained this year (MK-CF-F-054 annualIraLimit, MK-CF-F-055 annualHsaLimit, the 401(k) limit by age), with its catch-up; for an HSA, the self-only or the family limit as the cover chosen (self-only when none is chosen), and, enrolled in Medicare this year, the whole-year limit × the months before Medicare ÷ 12',
    inputs: ['MK-XS-I-017 birth year', 'MK-XS-I-062 enrolled in Medicare (yes / no)', 'MK-XS-I-074 the month Medicare began', 'MK-XS-I-081 the HSA cover — self-only or family'],
    decisions: ['The age tested is the age ATTAINED IN THE YEAR (his ruling G1).', 'Enrolled in Medicare means no HSA contribution from its first month (his ruling G10); the months before it still count (IRS Publication 969).',
      'HSA COVER (2026-10-27, FX-CF-C, workplan #361; the lead\u2019s decision, made without asking him): family cover takes the family limit — at 55, $8,750 + $1,000 = $9,750, where self-only is $5,400 (Rev. Proc. 2025-19). Not chosen → the self-only limit, and the card says so. To reverse: self-only always.'],
    refusal: 'No birth year entered — the base limit, said as the base one.',
    ruled: '2026-10-26',   // the lead's decision, made without asking him (decide, apply, report); its decision row is PF-RECORDS'
    worked: { given: GIVEN, answer: '$35,750', run: () => ROOM().k401.limit },
  },
  'MK-MN-M-032': {
    // AS TYPED (2026-10-31, FX-CF-C; CR3-01, the lead's ruling R13; tenets 2 and 4; contribution-room v02, row 7): printed by figPerAsTyped —
    // whole when typed whole ("$1,200/month", as Base pay prints the same 401(k), MK-CF-M-034), to the cent when typed with cents, so the year
    // beside it adds up as printed: $3,333.33 × 12 = $39,999.96, shown $40,000. It printed $3,333 beside $40,000 (3,333 × 12 = 39,996).
    label: 'At $M/month', unit: 'money', per: 'month', screens: ['/contribution-room'], grain: 'one account',
    answers: 'The monthly amount the person entered for this account — what the year at the monthly amount is worked from.',
    formula: 'the amount entered a month for the account, as entered; for the IRAs, one amount for Traditional and Roth together, typed on the IRA card — until it is typed, the Roth amount sign-up stored',
    inputs: ['MK-XS-I-043 their own retirement contribution', 'MK-XS-I-080 what goes into IRAs a month — Traditional and Roth together'],
    decisions: ['AS TYPED (2026-10-31, CR3-01; the lead\u2019s ruling R13, made without asking him; tenets 2 and 4): an amount typed whole prints whole, as Base pay prints the same 401(k) (MK-CF-M-034); an amount typed with cents prints to the cent, so the year beside it adds up as printed. Base pay keeps a cents amount to the dollar, because its card\u2019s own sum (gross − tax − 401(k)s = take-home) adds up to the dollar: tenet 2 outranks tenet 4. At $3,333.33 a month the card reads "At $3,333.33/month you will put in $40,000 this year" ($39,999.96, a total, shown to the dollar); it read "$3,333/month", and 3,333 × 12 = 39,996. To reverse: whole dollars always, and the year as 12 times the printed month.'],
    refusal: 'Nothing entered — the card reads "up to" the limit and names no monthly amount.',
    ruled: '2026-10-26',   // the lead's decision, made without asking him (decide, apply, report); its decision row is PF-RECORDS'
    worked: { given: GIVEN, answer: '$1,200/month', run: () => ROOM().k401.monthly },
  },
  'MK-MN-M-033': {
    label: 'the whole-year HSA limit, before Medicare', unit: 'money', screens: ['/contribution-room'],
    answers: 'What the HSA could take this year with no Medicare at all — the figure the months before Medicare are a share of.',
    formula: 'the HSA limit for the cover chosen (self-only when none is chosen) and the age attained this year, with the age-55 catch-up (MK-CF-F-055 annualHsaLimit, not enrolled)',
    inputs: ['MK-XS-I-017 birth year', 'MK-XS-I-081 the HSA cover — self-only or family'],
    refusal: 'Shown only for someone enrolled in Medicare from a month of this year.',
    ruled: '2026-10-26',   // the lead's decision, made without asking him (decide, apply, report); its decision row is PF-RECORDS'
    worked: { given: GIVEN, answer: '$5,400', run: () => ROOM().hsaFullYearLimit },
  },
  'MK-MN-M-029': {
    label: 'each contribution and its amount', unit: 'money', screens: ['/contribution-room'], grain: 'one account',
    answers: 'One line per tax-advantaged account, and what has gone into it.',
    formula: 'the monthly amount you entered for that account × 12',
    inputs: ['MK-XS-I-023 salary and other income'],
    decisions: ['Enrolled in Medicare means NO HSA contribution from its first month (his ruling G10, 2026-09-08). A first month this year leaves the months before it: from July, $5,400 × 6 ÷ 12 = $2,700 (IRS Publication 969; 2026-10-25, FIX-ROOM). With no month given, or from before this year, none.'],
    refusal: 'Nothing entered for that account.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$5,000',
      run: () => ROOM().ira.remaining,
    },
  },
});
