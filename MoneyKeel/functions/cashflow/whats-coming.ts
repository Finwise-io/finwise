// Cash flow · Which bills and paychecks are coming, and which look out of the ordinary.
//
// THE DOOR for Q-CF-3, ruled by the founder 2026-09-27: "yes" — the Cash flow tab, the Bill
// calendar, Your paycheck month by month and Worth a look answer one question, so what one says is
// coming cannot differ from what another says.
//
// TWO THINGS IT REFUSES TO INVENT:
//   · a bill with no date is not scheduled. It is in the month's total but it is NOT on the calendar,
//     because a date the person never gave would be read as one they did.
//   · "out of the ordinary" needs an ordinary to compare against. With too little history there is no
//     usual, so nothing is flagged — a first month's expenses are not unusual, it is all there is.
import { declareFigures } from '../_figure-spec';
import { upcomingBills, type UpcomingBill } from '../../../src/domain/cashflow';

export interface WhatsComing {
  /** Every dated bill and paycheck in the window ahead, soonest first. */
  bills: UpcomingBill[];
  /** The soonest one, or null when nothing is dated. */
  next: UpcomingBill | null;
}

/* ─ MK-CF-O-008 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * whatsComing
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     bills = bills
 *     next = the first of bills   if count of bills
 *     nothing   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... MK-CF-M-012 · MK-CF-M-016 · MK-CF-M-017 · MK-CF-M-026
 *               MK-CF-M-028 · MK-MN-M-030
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Decides .....
 *     · If start balance is missing it uses 0.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-008
 * Changed ..... not in git yet (—)
 */
/** ── ORCHESTRATOR ─────────────────────────────────────────────────────────────────────
 *  The one function a screen calls for this question. Written as a DOC comment on purpose: the
 *  header generator owns the plain block comment below and rewrites it on every build, which is how
 *  all twelve doors lost this marker once and two were typed F instead of O (2026-09-28). */
/* ─ MK-CF-O-008 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * whatsComing
 *
 * Answers ..... ── ORCHESTRATOR ───────────────────────────────────────────────────────────────────── The one function a screen calls for this question.
 *
 * Formula .....
 *     bills = bills
 *     next = the first of bills   if count of bills
 *     nothing   otherwise
 *
 * Called by ... MK-CF-F-205 COMING
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING
 *
 * Serves ...... MK-CF-M-012 · MK-CF-M-016 · MK-CF-M-017 · MK-CF-M-026
 *               MK-CF-M-028 · MK-MN-M-030
 * Reads ....... MK-XS-I-032 expenses categories the person set up
 * Ruled by .... DEC-0002 · DEC-0078 · DEC-0187 · DEC-0443
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
 *
 * Decides .....
 *     · If start balance is missing it uses 0.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-008
 * Changed ..... not in git yet (—)
 */
export function whatsComing(input: {
  profile: any;
  startBalance?: number;
  now?: Date;
  horizonDays?: number;
}): WhatsComing {
  const bills = upcomingBills(
    input.profile ?? null,
    input.startBalance ?? 0,
    input.now ?? new Date(),
    input.horizonDays != null ? { horizonDays: input.horizonDays } : {},
  );
  return { bills, next: bills.length ? bills[0] : null };
}

/** THE WORKED EXAMPLE (six steps, step 6, 2026-09-28).
 *
 *  Two big dated bills ahead of 28 September 2026: car insurance of $1,400 due 15 October and
 *  property tax of $4,800 due 1 November, against $8,000 in the account. Both figures run
 *  `whatsComing`, the real door.
 *
 *  ONLY THE LUMPY ONES APPEAR. Rent and groceries are not "coming" — they are every month, and they
 *  are already in the budget. This screen is for the bill that arrives once a year and is forgotten
 *  about until it lands, which is why the door reads the non-monthly categories and nothing else.
 */
const EXAMPLE = {
  profile: {
    monthlySpending: 0,
    spendCats: [
      { id: 'proptax', label: 'Property tax', amount: 4800, bucket: 'nonmonthly', months: [11], dueDay: 1, tier: 'critical' },
      { id: 'carins', label: 'Car insurance', amount: 1400, bucket: 'nonmonthly', months: [10], dueDay: 15 },
    ],
  },
  startBalance: 8000,
  now: new Date('2026-09-28T12:00:00'),
  horizonDays: 120,
};
const GIVEN =
  'On 28 Sep 2026, with $8,000 in the account: car insurance of $1,400 due 15 Oct and property tax of '
  + '$4,800 due 1 Nov. Nothing else is dated.';
/* ─ MK-CF-F-205 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * COMING
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     whats coming(EXAMPLE)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-205
 * Changed ..... not in git yet (—)
 */
const COMING = () => whatsComing(EXAMPLE);

/** THE FIGURES THIS DOOR HANDS OUT (rule 11). The master file's rows are printed from here. */
export const WHATS_COMING_FIGURES = declareFigures({
  'MK-CF-M-012': {
    label: 'RECEIVED · <month> — each payment', unit: 'money', screens: ['/cashflow'], grain: 'one payment',
    answers: 'Each payment that has actually arrived this month, and when.',
    formula: 'the income records dated inside the month',
    inputs: ['MK-NW-I-004 the activity records'],
    refusal: 'Nothing received yet this month.',
    ruled: '2026-09-27',
  },
  'MK-CF-M-016': {
    label: 'BIG-TICKET RADAR — <bill> · due <month>', unit: 'money', screens: ['/cashflow', '/bill-calendar'], grain: 'one bill',
    answers: 'A bill big enough to plan for, and the month it falls in.',
    formula: 'the dated bills above the everyday size, in date order',
    inputs: ['MK-CF-I-002 your bills'],
    decisions: ['A regular monthly debt is never a radar item: a warning you see every month stops being a warning.'],
    refusal: 'Nothing unusual ahead — the section keeps its heading and says so.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$1,400',
      run: () => COMING().next!.amount,
    },
  },
  'MK-CF-M-017': {
    label: 'well above your usual <category>', unit: 'words', screens: ['/worth-a-look'], grain: 'one expense',
    answers: 'Why this one expense stood out.',
    formula: 'this expense against the typical one in its category, over the months logged',
    inputs: ['MK-CF-I-001 your logged expenses'],
    decisions: ['There must BE a usual to compare against: with too little logged, nothing is flagged. A first month’s expenses are not unusual, they are all there is.'],
    refusal: 'Too little history to call anything unusual.',
    ruled: '2026-09-27',
  },
  'MK-CF-M-026': {
    label: 'the months a paycheck lands', unit: 'words', screens: ['/paycheck-months'], grain: 'one month',
    answers: 'Which months carry an extra paycheck, for anyone paid fortnightly.',
    formula: 'the pay dates that fall in each month, counted',
    inputs: ['MK-XS-I-023 salary and other income'],
    refusal: 'Paid monthly — every month carries one, so there is nothing to point out.',
    ruled: '2026-09-27',
  },
  'MK-CF-M-028': {
    label: 'each bill and the day it falls', unit: 'money', screens: ['/bill-calendar'], grain: 'one bill',
    answers: 'One line per bill ahead, with its date and what is left after it.',
    formula: 'each dated bill in the window, in date order, with the running balance after it',
    inputs: ['MK-CF-I-002 your bills', 'MK-NW-I-001 your accounts'],
    decisions: ['A bill with NO date is not on the calendar — a date nobody gave would be read as one they did. It is still counted in the month’s total.'],
    refusal: 'No dated bills ahead.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$4,800',
      run: () => COMING().bills.find((b) => b.label === 'Property tax')!.amount,
    },
  },
  'MK-MN-M-030': {
    label: '$X left <account> on <date>', unit: 'money', screens: ['/bill-calendar'], grain: 'one date',
    answers: 'What would be left after each bill, so a shortfall is visible before it happens.',
    formula: 'the balance you start with, less each bill as its date passes',
    inputs: ['MK-NW-I-001 your accounts', 'MK-CF-I-002 your bills'],
    refusal: 'No balance to start from.',
    ruled: '2026-09-27',
  },
});
