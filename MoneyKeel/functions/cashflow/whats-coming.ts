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
import { buildDatedGrid } from '../../../src/domain/grid';
import { buildPaycheckYear } from '../../../src/domain/paycheck';
import { formatMoney } from '../../../src/domain/_shared/money';
import { reviewTransactions, type TxnFlag } from '../../../src/domain/transactions/flags';

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
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-199 ROOM
 *               MK-CF-F-215 YEAR · MK-XS-F-004 buildDatedGrid
 *               MK-CF-F-107 buildPaycheckYear · MK-CF-O-017 futurePaycheck
 *               MK-NW-F-091 pricedGainOf
 *
 * Serves ...... MK-CF-M-012 · MK-CF-M-016 · MK-CF-M-017 · MK-CF-M-026
 *               MK-CF-M-028 · MK-CF-M-060 · MK-CF-M-061 · MK-CF-M-062
 *               MK-CF-M-063 · MK-CF-M-064 · MK-MN-M-030
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
 * Called by ... MK-CF-F-215 YEAR
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-199 ROOM · MK-CF-F-215 YEAR
 *               MK-XS-F-004 buildDatedGrid · MK-CF-F-107 buildPaycheckYear
 *               MK-CF-O-017 futurePaycheck · MK-NW-F-091 pricedGainOf
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-205
 * Changed ..... not in git yet (—)
 */
const COMING = () => whatsComing(EXAMPLE);

/** THE FIGURES THIS DOOR HANDS OUT (rule 11). The master file's rows are printed from here. */

/** RECEIVED THIS MONTH (MK-CF-M-012) — the income records dated inside the month, newest first. The
 *  Cash flow tab filtered the store itself; it asks this now (2026-10-02). */
/* ─ MK-CF-F-212 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * receivedInMonth
 *
 * Answers ..... RECEIVED THIS MONTH (MK-CF-M-012) — the income records dated inside the month, newest first.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-CF-F-215 YEAR
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-199 ROOM · MK-CF-F-215 YEAR
 *               MK-XS-F-004 buildDatedGrid · MK-CF-F-107 buildPaycheckYear
 *               MK-CF-O-017 futurePaycheck · MK-NW-F-091 pricedGainOf
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-212
 * Changed ..... not in git yet (—)
 */
export function receivedInMonth(incomes: { date?: string; amount?: any }[] | null | undefined, ym: string) {
  return (incomes ?? [])
    .filter((i) => String(i.date ?? '').startsWith(ym))
    .sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
}
/** WELL ABOVE YOUR USUAL (MK-CF-M-017) — the words for a flagged expense, from the one review function. */
/* ─ MK-CF-F-213 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * unusualWords
 *
 * Answers ..... WELL ABOVE YOUR USUAL (MK-CF-M-017) — the words for a flagged expense, from the one review function.
 *
 * Formula .....
 *     `${format money(flag.amount)} — well above your usual ${category}`   if flag and flag.reason = 'unusually_large'
 *     nothing   otherwise
 *
 * Called by ... MK-CF-F-215 YEAR
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-199 ROOM · MK-CF-F-215 YEAR
 *               MK-XS-F-004 buildDatedGrid · MK-CF-F-107 buildPaycheckYear
 *               MK-CF-O-017 futurePaycheck · MK-NW-F-091 pricedGainOf
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-213
 * Changed ..... not in git yet (—)
 */
export function unusualWords(flag: TxnFlag | null | undefined, category: string): string | null {
  return flag && flag.reason === 'unusually_large' ? `${formatMoney(flag.amount)} — well above your usual ${category}` : null;
}
/** THE MONTHS A PAYCHECK LANDS (MK-CF-M-026) — one month of the paycheck year, in words. */
/* ─ MK-CF-F-214 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * paycheckMonthWords
 *
 * Answers ..... THE MONTHS A PAYCHECK LANDS (MK-CF-M-026) — one month of the paycheck year, in words.
 *
 * Formula .....
 *     `${label} — ${format money(net safe to spend)}${bills total > 0 ? ', lower: a big bill lands' : ''}`
 *
 * Called by ... MK-CF-F-215 YEAR
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-199 ROOM · MK-CF-F-215 YEAR
 *               MK-XS-F-004 buildDatedGrid · MK-CF-F-107 buildPaycheckYear
 *               MK-CF-O-017 futurePaycheck · MK-NW-F-091 pricedGainOf
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-032 expenses categories the person set up
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-214
 * Changed ..... not in git yet (—)
 */
export function paycheckMonthWords(m: { label: string; netSafeToSpend: number; billsTotal: number }): string {
  return `${m.label} — ${formatMoney(m.netSafeToSpend)}${m.billsTotal > 0 ? ', lower: a big bill lands' : ''}`;
}
const RECEIVED = [
  { id: 'r1', source: 'Salary', amount: 3600, date: '2026-09-15' },
  { id: 'r2', source: 'Salary', amount: 3600, date: '2026-09-30' },
  { id: 'r0', source: 'Salary', amount: 3600, date: '2026-08-31' },
];
const USUAL = [60, 55, 62, 58, 61].map((amount, i) => ({ id: `h${i}`, account_id: 'chk', type: 'WITHDRAWAL', amount, note: 'Safeway', date: `2026-0${(i % 3) + 7}-1${i}`, source: 'connected' })) as any[];
const BIG = { id: 'n1', account_id: 'chk', type: 'WITHDRAWAL', amount: 640, note: 'Safeway', date: '2026-09-27', source: 'connected' } as any;
const RETIRED = { ri_ss: '2100', ri_ss_receiving: 'yes', ri_ss_freq: 'monthly', spendCats: EXAMPLE.profile.spendCats.slice(1) } as any;
/* ─ MK-CF-F-215 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * YEAR
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-CF-F-199 ROOM · MK-NW-F-091 pricedGainOf
 *               MK-XS-F-004 buildDatedGrid
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-199 ROOM · MK-CF-F-215 YEAR
 *               MK-XS-F-004 buildDatedGrid · MK-CF-F-107 buildPaycheckYear
 *               MK-CF-O-017 futurePaycheck · MK-NW-F-091 pricedGainOf
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-022 pension monthly amount
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-028 assumed return
 *               MK-XS-I-029 inflation rate
 *               MK-XS-I-032 expenses categories the person set up
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-215
 * Changed ..... not in git yet (—)
 */
const YEAR = () => buildPaycheckYear(RETIRED, { accounts: [], liabilities: [], now: EXAMPLE.now,
  sim: { current_age: 68, horizon_age: 92, mean_return: 0.055, vol_return: 0.0935, inflation: 0.025, seed: 42, paths: 1000 } } as any);

export const WHATS_COMING_FIGURES = declareFigures({
  'MK-CF-M-012': {
    label: 'RECEIVED · <month> — each payment', unit: 'money-cents', screens: ['/cashflow', '/income', '/income-manager'], grain: 'one payment',
    answers: 'Each payment that has actually arrived this month, and when.',
    formula: 'the income records dated inside the month',
    inputs: ['MK-NW-I-004 the activity records'],
    refusal: 'Nothing received yet this month.',
    ruled: '2026-09-27',
    worked: { given: 'Two $3,600 salary payments landed in September, on the 15th and the 30th; one landed on 31 August.', answer: '$3,600.00', run: () => receivedInMonth(RECEIVED, '2026-09')[0]?.amount ?? null },
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
    worked: { given: 'Five grocery trips of about $60 at Safeway over the summer, then a $640 one on 27 September.', answer: '$640 — well above your usual Groceries',
      run: () => unusualWords(reviewTransactions([BIG], { history: USUAL, makeId: () => 'f1', now: new Date('2026-09-28T12:00:00') })[0], 'Groceries') },
  },
  'MK-CF-M-026': {
    label: 'the months a paycheck lands', unit: 'words', screens: ['/paycheck-months'], grain: 'one month',
    answers: 'Which months carry an extra paycheck, for anyone paid fortnightly.',
    formula: 'the pay dates that fall in each month, counted',
    inputs: ['MK-XS-I-023 salary and other income'],
    refusal: 'Paid monthly — every month carries one, so there is nothing to point out.',
    ruled: '2026-09-27',
    worked: { given: 'Retired on $2,100/month of Social Security, with a $1,400 car-insurance bill in October.', answer: 'Sep — $2,100', run: () => paycheckMonthWords(YEAR().months[0]) },
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
    worked: { given: GIVEN, answer: '$6,600', run: () => { const b = COMING().bills[0]; return b ? b.availableByNeed - b.amount : null; } },
  },

  // ── THE TWELVE-MONTH TABLE (2026-10-02): the Bill calendar and the paycheck year printed six figures
  //    with no identifier. Each has its row now, read from the same dated grid the Cash flow tab draws.
  'MK-CF-M-060': {
    label: 'Lowest point', unit: 'money', screens: ['/bill-calendar'],
    answers: 'The lowest the balance falls to in the twelve months ahead, and which month.',
    formula: 'the smallest running balance across the twelve month-ends, starting from the balance you gave',
    inputs: ['MK-NW-I-001 your accounts', 'MK-CF-I-002 your bills', 'MK-XS-I-023 salary and other income'],
    refusal: 'No starting balance — the table starts from $0 and says so.',
    ruled: '2026-10-02',
    worked: { given: GIVEN, answer: '$1,800', run: () => buildDatedGrid(EXAMPLE.profile as any, { startBalance: 8000, now: EXAMPLE.now }).lowestBalance },
  },
  'MK-CF-M-061': {
    label: 'END — where the month leaves you', unit: 'money', screens: ['/bill-calendar'], grain: 'one month',
    answers: 'The balance at the end of each month: the month before’s end, plus what came in, less what went out.',
    formula: 'running balance = last month’s end + inflow − outflow, month by month from the starting balance',
    inputs: ['MK-NW-I-001 your accounts', 'MK-CF-I-002 your bills', 'MK-XS-I-023 salary and other income'],
    refusal: 'No starting balance — the chain starts from $0 and says so.',
    ruled: '2026-10-02',
    worked: { given: GIVEN, answer: '$6,600', run: () => buildDatedGrid(EXAMPLE.profile as any, { startBalance: 8000, now: EXAMPLE.now }).cells[1].runningBalance },
  },
  'MK-CF-M-062': {
    label: 'Short — set it aside by <date>', unit: 'money', screens: ['/bill-calendar'], grain: 'one bill',
    answers: 'How much more is needed for a bill by the day the money has to be there.',
    formula: 'the bill − what is projected to be in the account on its need-by date, when that is less',
    inputs: ['MK-NW-I-001 your accounts', 'MK-CF-I-002 your bills'],
    refusal: 'Nothing short — the line reads Covered instead.',
    ruled: '2026-10-02',
    worked: { given: GIVEN, answer: '$0', run: () => COMING().bills[0]?.shortfall ?? null },
  },
  'MK-CF-M-063': {
    label: 'Covered — about $X there by <date>', unit: 'money', screens: ['/bill-calendar'], grain: 'one bill',
    answers: 'What is projected to be in the account on the day a bill’s money has to be there.',
    formula: 'the starting balance, less every earlier dated bill, on the need-by date',
    inputs: ['MK-NW-I-001 your accounts', 'MK-CF-I-002 your bills'],
    refusal: 'No balance to start from — nothing is projected.',
    ruled: '2026-10-02',
    worked: { given: GIVEN, answer: '$8,000', run: () => COMING().bills[0]?.availableByNeed ?? null },
  },
  'MK-CF-M-064': {
    label: 'This year', unit: 'money', per: 'year', screens: ['/paycheck-months'],
    answers: 'The whole year’s paycheck for someone retired: the twelve months added up exactly, never a month × 12.',
    formula: 'Σ over the twelve months of (guaranteed income + draw − the month’s big dated bills)',
    inputs: ['MK-XS-I-020 Social Security monthly amount', 'MK-XS-I-022 pension monthly amount', 'MK-NW-I-001 your accounts', 'MK-CF-I-002 your bills'],
    decisions: ['EXACT SUM OF THE TWELVE, never monthly × 12 — a pension that lands in December is in December.'],
    refusal: 'No guaranteed income entered — the year is not added up; the screen asks for it.',
    ruled: '2026-10-02',
    worked: {
      given: 'Retired, with $2,100/month of Social Security and no pot; a $1,400 car-insurance bill in October.',
      answer: '$23,800/year',
      run: () => buildPaycheckYear({ ri_ss: '2100', ri_ss_receiving: 'yes', ri_ss_freq: 'monthly', spendCats: EXAMPLE.profile.spendCats.slice(1) } as any,
        { accounts: [], liabilities: [], now: EXAMPLE.now, sim: { current_age: 68, horizon_age: 92, mean_return: 0.055, vol_return: 0.0935, inflation: 0.025, seed: 42, paths: 1000 } } as any).thisYear,
    },
  },
});
