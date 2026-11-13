// Cash flow · This month — the plan, and what has actually happened.
//
// TWO BLOCKS THAT NEVER SHARE A ROW. Planned is what you said would happen; actual is what did.
// Mixing them is what produced "Outflow (bills + debt) $8,321" sitting four rows above "Spent $45 of
// $0 planned" — two definitions of the word planned on one card, differing by the whole amount.
// That is finding B26.
//
// THE RULE THIS FILE OBEYS: every row shown is a row deducted. Nothing appears in either block
// without being in its sum. The founder's own sheet had HELOC and a card payment listed but not
// subtracted, which is how its surpluses read 750 and 1,300 instead of 350 and 900.
import { declareFigures } from '../_figure-spec';
import { toNum } from '../../../src/domain/_shared/num';
import { paymentShape, paysInMonth, paymentInMonth, type Debt } from '../../../src/domain/debt';
import { inMonth, DEBT_CATEGORY, debtPaymentsMatched, type LoggedExpense } from './logged-expenses';
import { localDay } from '../../../src/domain/_shared/dates';   // the one reader of a stored day (CF-21, 2026-10-25)
import { buildDatedGrid } from '../../../src/domain/grid';   // the later-month card's three figures are the grid's (worked examples)
// the worked months run on the budget AS IT IS COUNTED, as every screen's month does (2026-10-26, PF-TOOLS; FIX-MONTH's finding)
import { theBudgetCounted, expensesAsCounted } from './budget-counted';
import { spendByMonthByBucket } from '../../../src/domain/budget';
// the radar's own rule for which debts are radar items — one place, so the note on a row and the
// radar list can never disagree about what a HELOC or a card payment is (2026-09-30)
import { isRadarItem } from './expenses';
// the one test for a debt payment never entered — the one Net worth and the emergency fund use (MK-NW-F-147, 2026-10-21)
import { paymentNotEntered } from '../networth-and-performance/net-worth';



export interface MonthInput {
  ym: string;                    // 'YYYY-MM' — the month being shown
  takeHomeMonthly: number;       // from basePay — the take-home
  inflowSources?: string[];      // the sources inside takeHomeMonthly, by name — the inflow line prints them (cluster #5 ruling, 2026-09-10)
  debts: Debt[];
  plannedExpenses: number;       // this month's planned expenses (the month's cell — a once-a-year bill only in its month)
  /** A BUDGET IS SET, even when nothing in it falls this month (2026-10-23): a budget whose only line is a once-a-year bill
   *  plans $0 for the other eleven months and is still set. Not given → set when this month plans more than $0, as before. */
  budgetSet?: boolean;
  expenses: LoggedExpense[];     // everything logged, debt payments included
  /** WHAT THE PLAN HAS ALREADY PROMISED to goals, per month. The hero figure on This month is the
   *  surplus LESS these, because money already committed to a goal is not free (F11). */
  commitments?: { label: string; monthlyAmount: number }[];
}

export interface Line { label: string; amount: number; kind: 'in' | 'debt' | 'spend'; paid?: boolean; note?: string;
  /** NO BUDGET SET: the row reads "— not set" and is no part of any sum (cash-flow_v01, rule 6:
   *  "nothing is guessed — no plan set → not set, never $0 dressed as an answer"). */
  notSet?: boolean;
  /** A DEBT WHOSE PAYMENT WAS NEVER ENTERED (2026-10-23, tenet 3: unknown is not zero): the row reads "payment not entered"
   *  and the planned surplus is not given — the block's `refusal` says why. The same test Net worth uses (paymentNotEntered). */
  notEntered?: boolean; }

/** THE MONTH'S OUTFLOW — expenses plus the debt actually paid — from one place. G12 (founder,
 *  2026-09-12): the Cash-flow month card used to add the two on the screen itself; a screen doing
 *  arithmetic is a second definition waiting to happen. A month with a saved snapshot uses the
 *  snapshot's expenses and debt paid; a month without one uses the expenses logged so far. */
/* ─ MK-CF-F-194 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * monthOutflow
 *
 * Answers ..... THE MONTH'S OUTFLOW — expenses plus the debt actually paid — from one place.
 *
 * Formula .....
 *     (snap.expenses ?? 0) + (snap.debt paid ?? 0)   if snap
 *     logged so far   otherwise
 *
 * Called by ... MK-CF-F-005 actualMonthFlow · MK-CF-F-220 pastMonthFlow
 *
 * Reaches ..... 689 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 671 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · If expenses is missing it uses 0.
 *     · If debt paid is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-194
 * Changed ..... not in git yet (—)
 */
export function monthOutflow(snap: { spending?: number | null; debt_paid?: number | null } | null | undefined, loggedSoFar: number): number {
  return snap ? ((snap.spending ?? 0) + (snap.debt_paid ?? 0)) : loggedSoFar;
}

/** A PAST MONTH — what came in, what went out and the surplus — as the Cash flow tab shows it (2026-10-23). The month's
 *  frozen record when there is one (what came in, the expenses and the debt paid, saved while the month was open); without
 *  one, the income recorded as received and everything logged in that month. Home's month-end question ("where did last
 *  month's surplus go?") reads this too: it calculated the month itself, without the debt paid, so it offered a different
 *  surplus from the one Cash flow shows for the same month (outside re-run of Performance, gap list item 38, its class). */
/* ─ MK-CF-F-220 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * pastMonthFlow
 *
 * Answers ..... A PAST MONTH — what came in, what went out and the surplus — as the Cash flow tab shows it (2026-10-23).
 *
 * Formula .....
 *     recorded = Σ over incomes (or none when missing) where local day(date).starts with(ym) of (amount read as a number (or 0 when missing or zero))
 *     logged = Σ over expenses (or none when missing) where in month(each, ym) of (amount read as a number (0 when it is not one))
 *     inflow = snap.income net (or recorded when missing)   if snap
 *     recorded   otherwise
 *     outflow = month outflow(snap, logged)
 *     the answer:
 *     inflow = inflow
 *     outflow = outflow
 *     surplus = cash(inflow − outflow)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-220
 * Changed ..... not in git yet (—)
 */
export function pastMonthFlow(
  snap: { income_net?: number | null; spending?: number | null; debt_paid?: number | null } | null | undefined,
  incomes: { amount?: unknown; date?: unknown }[] | null | undefined, expenses: LoggedExpense[] | null | undefined, ym: string,
): { inflow: number; outflow: number; surplus: number } {
  const recorded = (incomes ?? []).filter((i) => localDay(i?.date).startsWith(ym)).reduce((t, i) => t + (Number(i?.amount) || 0), 0);
  const logged = (expenses ?? []).filter((e) => inMonth(e, ym)).reduce((t, e) => t + toNum(e.amount), 0);
  const inflow = snap ? (snap.income_net ?? recorded) : recorded;
  const outflow = monthOutflow(snap, logged);
  return { inflow, outflow, surplus: cash(inflow - outflow) };
}

/** What it is for: WHETHER A PAST MONTH COMES BEFORE ANYTHING WAS RECORDED (2026-10-27, FX-CF-A; the round-2 drawing match, CF2-08;
 *  tenet 1). A past month with no saved record printed two lines that disagree — "Nothing recorded for this month — it predates
 *  your tracking." and "Added up from what is logged for this month — it changes if more is logged." It predates the tracking only
 *  when no month-end record, no income and no expense is dated in it or before it; then the first line is true and the second is
 *  not said. Worked by hand: frame A's household, every expense logged on Aug 20, 2026 — July predates (true), August does not. */
/* ─ MK-CF-F-286 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * monthBeforeAnyRecord
 *
 * Answers ..... What it is for: WHETHER A PAST MONTH COMES BEFORE ANYTHING WAS RECORDED (2026-10-27, FX-CF-A; the round-2 drawing match, CF2-08; tenet 1).
 *
 * Formula .....
 *     first = nothing (or ym < first when missing or zero)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-286
 * Changed ..... not in git yet (—)
 */
export function monthBeforeAnyRecord(
  ym: string, snapshots: Record<string, unknown> | null | undefined,
  incomes: { date?: unknown }[] | null | undefined, expenses: { date?: unknown }[] | null | undefined,
): boolean {
  const first = [...Object.keys(snapshots ?? {}),
    ...(incomes ?? []).map((i) => localDay(i?.date).slice(0, 7)), ...(expenses ?? []).map((e) => localDay(e?.date).slice(0, 7))]
    .filter((k) => /^\d{4}-\d{2}$/.test(k)).sort()[0];
  return first == null || ym < first;
}

/** WHAT A PAST MONTH'S RECORD LEAVES OUT (2026-10-24, the lead's ruling on the Cash flow journey E2E-76): the expenses dated in
 *  that month but entered after its record was last saved — a statement imported later, say. The record stays as it is (the approved
 *  card's words: "Frozen — past months never change under you"), so the month's card leaves them out while the month's Expenses tab lists them;
 *  this names each one and adds them up, so the tab can say so on the row and under its total and never disagree silently.
 *  No record, or a record that does not say when it was saved: nothing is named. */
/* ─ MK-CF-F-231 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * addedAfterRecord
 *
 * Answers ..... WHAT A PAST MONTH'S RECORD LEAVES OUT (2026-10-24, the lead's ruling on the Cash flow journey E2E-76): the expenses dated in that month but entered after its record was last saved — a statement imported later, say.
 *
 * Formula .....
 *     saved = string(snap.captured at)   if snap.captured at
 *     ''   otherwise
 *     late = saved ? (expenses ?? []) where in month(each, ym) and !!created at and string(created at) > saved: []
 *     no saved time = !!snap and !saved
 *     listed = Σ over expenses (or none when missing) where in month(each, ym) and category ! = DEBT_CATEGORY of (amount read as a number (0 when it is not one))
 *     more than record = max(0, listed − number(snap.expenses))   if no saved time and snap.expenses ≠ nothing
 *     0   otherwise
 *     the answer:
 *     ids = a list with no repeats of for each of late: string(id)
 *     total = Σ over late of (amount read as a number (0 when it is not one))
 *     no saved time = no saved time
 *     more than record = more than record
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-231
 * Changed ..... not in git yet (—)
 */
export function addedAfterRecord(
  snap: { captured_at?: string | null; spending?: number | null } | null | undefined,
  expenses: (LoggedExpense & { id?: string; createdAt?: string })[] | null | undefined, ym: string,
): { ids: Set<string>; total: number; noSavedTime: boolean; moreThanRecord: number } {
  const saved = snap?.captured_at ? String(snap.captured_at) : '';
  const late = saved ? (expenses ?? []).filter((e) => inMonth(e, ym) && !!e.createdAt && String(e.createdAt) > saved) : [];
  // A RECORD THAT DOES NOT SAY WHEN IT WAS SAVED (2026-10-25, FIX-MONTH; CFR-5, DEC-7949 NOT HELD; tenet 2): an older record, read
  // with no saved time (history.ts), named nothing — August's card read $1,360 and its list $1,510 with nothing said. Which entries
  // came later cannot be told, so none is named; what can be told is how much more the month's expenses list holds than the
  // record's expenses: 1,510 − 1,360 = $150. Nought when the two agree, or there is no record.
  const noSavedTime = !!snap && !saved;
  const listed = (expenses ?? []).filter((e) => inMonth(e, ym) && e.category !== DEBT_CATEGORY).reduce((t, e) => t + toNum(e.amount), 0);
  const moreThanRecord = noSavedTime && snap?.spending != null ? Math.max(0, listed - Number(snap.spending)) : 0;
  return { ids: new Set(late.map((e) => String(e.id))), total: late.reduce((t, e) => t + toNum(e.amount), 0), noSavedTime, moreThanRecord };
}
export interface MonthBlock { lines: Line[]; surplus: number;
  /** False on the PLANNED side when no budget is set: there is no planned surplus, and the screen
   *  prints an em-dash rather than a figure built on a guess. Always true on the actual side. */
  planSet: boolean;
  /** WHAT CAME IN AND WHAT WENT OUT, added up from the rows above (2026-10-23): inflow = the rows that come in; outflow =
   *  every other row, as an amount going out; surplus = inflow − outflow. A screen that shows the month in three figures —
   *  Home's box — prints these and calculates nothing, so it can never leave a row out (Home left out a $250 car loan
   *  already paid: Left $4,202 against Cash flow's +$3,952, outside re-run of Performance, gap list item 38). */
  inflow: number; outflow: number;
  /** WHY THERE IS NO SURPLUS, when one cannot be calculated: a debt whose payment was never entered (2026-10-23). The
   *  surplus is then not a number, so nothing can print a figure built on a missing payment. Null when it is given. */
  refusal: string | null; }

/** THE BIGGEST AMOUNT GOING OUT OF A MONTH, AS ITS ROW PRINTS IT (design review, 2026-11-08): a month below $0 names it, so the
 *  person sees where to start. Only rows going out with an amount count — not the money coming in, not a row not set, not a payment
 *  not entered. The amount is the row's own printed one (monthShown), so the sentence and the row agree. Null when no row goes out. */
/* ─ MK-CF-F-318 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * biggestOutLine
 *
 * Answers ..... THE BIGGEST AMOUNT GOING OUT OF A MONTH, AS ITS ROW PRINTS IT (design review, 2026-11-08): a month below $0 names it, so the person sees where to start.
 *
 * Formula .....
 *     best = nothing
 *     amt = shown[i]
 *     the answer = best
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-318
 * Changed ..... not in git yet (—)
 */
export function biggestOutLine(lines: Line[], shown: number[]): { label: string; amount: number } | null {
  let best: { label: string; amount: number } | null = null;
  lines.forEach((l, i) => {
    const amt = shown[i];
    if (l.kind === 'in' || l.notSet || l.notEntered || !(amt < 0)) return;
    if (best == null || amt < best.amount) best = { label: l.label, amount: amt };
  });
  return best;
}

/** The inflow line names what is inside it — founder's cluster #5 ruling (2026-09-10): the words in
 *  the brackets are the sources, "Inflow (income (take-home) + rent)". No sources named → the
 *  take-home alone. */
/* ─ MK-CF-F-192 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * inflowLabel
 *
 * Answers ..... The inflow line names what is inside it — founder's cluster #5 ruling (2026-09-10): the words in the brackets are the sources, "Inflow (income (take-home) + rent)".
 *
 * Formula .....
 *     words = []
 *     w = inflow source word(s)
 *     the answer = `${prefix} (${words.join(' + ')})`
 *
 * Called by ... MK-CF-F-005 actualMonthFlow · MK-CF-F-156 plannedMonthFlow
 *               MK-CF-O-004 incomeSummary
 *
 * Reaches ..... 689 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 671 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-192
 * Changed ..... not in git yet (—)
 */
export function inflowLabel(prefix: 'Inflow' | 'Actual inflow' | 'Planned inflow', sources?: string[]): string {
  const words: string[] = [];
  for (const s of sources ?? []) {
    const w = inflowSourceWord(s);
    if (!words.includes(w)) words.push(w);
  }
  if (words.length === 0) words.push('income (take-home)');
  return `${prefix} (${words.join(' + ')})`;
}

/** One source of money arriving, as the bracket says it: pay is "income (take-home)", a rental is
 *  "rent", Social Security keeps its name, anything else is its own name in lower case. */
/* ─ MK-CF-F-193 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * inflowSourceWord
 *
 * Answers ..... One source of money arriving, as the bracket says it: pay is "income (take-home)", a rental is "rent", Social Security keeps its name, anything else is its own name in lower case.
 *
 * Formula .....
 *     s = source.trim().to lower case()
 *     'income (take − home)'   when starts with('salary') (or starts with('base salary') (or starts with('paycheck') (or s = 'income (take − home)' when missing or zero) when missing or zero) when missing or zero)
 *     'rent'   when starts with('rental') (or s = 'rent' when missing or zero)
 *     'social Security'   when starts with('social security')
 *     the answer = replace( ÷ \(. × \)$ ÷ , '')
 *
 * Called by ... MK-CF-F-192 inflowLabel
 *
 * Reaches ..... 690 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 672 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-193
 * Changed ..... not in git yet (—)
 */
export function inflowSourceWord(source: string): string {
  const s = source.trim().toLowerCase();
  if (s.startsWith('salary') || s.startsWith('base salary') || s.startsWith('paycheck') || s === 'income (take-home)') return 'income (take-home)';
  if (s.startsWith('rental') || s === 'rent') return 'rent';
  if (s.startsWith('social security')) return 'Social Security';
  return s.replace(/ \(.*\)$/, '');
}



/** Negating zero in JavaScript gives NEGATIVE zero, which formats as "−$0" — and a person looking
 *  at "−$0" beside an unpaid car loan reasonably wonders what it means. Zero has no sign. */
// exported 2026-09-30 so the-month.ts shares it rather than keeping a second copy: it exists only to
// turn a negative zero into a plain zero, and a person should never read “-$0”
/* ─ MK-CF-F-155 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * cash
 *
 * Answers ..... Negating zero in JavaScript gives NEGATIVE zero, which formats as "−$0" — and a person looking at "−$0" beside an unpaid car loan reasonably wonders what it means.
 *
 * Formula .....
 *     0   if n = 0
 *     n   otherwise
 *
 * Called by ... MK-CF-F-005 actualMonthFlow · MK-CF-F-010 emergencyTest
 *               MK-CF-F-066 rsuAnnual · MK-CF-F-111 applyTransaction
 *               MK-CF-F-136 bumpCash · MK-CF-F-156 plannedMonthFlow
 *               MK-CF-F-220 pastMonthFlow · MK-CF-F-288 openingRecordsHeld
 *               MK-CF-F-291 purchaseRecordsFollowReimport · MK-CF-F-292 optionTradesOnTheWayIn
 *               MK-CF-O-010 theMonth · MK-HM-F-007 percent2
 *               MK-NW-F-004 portfolioActualReturn · MK-NW-F-005 accountAllowsTicker
 *               MK-NW-F-007 assetKind · MK-NW-F-008 incomeBearingClassOf
 *               MK-NW-F-021 investmentsTotal · MK-NW-F-027 accountClassBreakdown
 *               MK-NW-F-035 blendedVolatility · MK-NW-F-051 itemizedResultTotal
 *               MK-NW-F-052 buildItemizedAccounts · MK-NW-F-075 ACC
 *               MK-NW-F-079 EF · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-120 classEvidenceOf · MK-NW-F-123 holdingNameEvidence
 *               MK-NW-F-142 classReturnOf · MK-NW-F-148 lastCloseLabel
 *               MK-NW-F-151 linkedSplit · MK-NW-F-153 uninvestedCashOf
 *               MK-NW-F-159 settleBondValue · MK-NW-F-160 pricePer100OfFace
 *               MK-NW-F-185 valueChanged · MK-NW-F-194 brokerUpdateToRecord
 *               MK-NW-F-199 fileToRecord · MK-NW-F-201 fileRowsToSave
 *               MK-NW-F-205 priceFeedValues · MK-NW-F-213 lotRow
 *               MK-NW-F-214 accountValueRows · MK-NW-F-221 lotsFollow
 *               MK-NW-F-226 fileValues · MK-NW-F-240 placedOn
 *               MK-NW-F-242 valueBatchesOf · MK-NW-F-248 answerValuesQuestion
 *               MK-NW-F-335 writeAnswer · MK-NW-F-361 valueToday
 *               MK-NW-F-382 explainedDifference · MK-NW-F-421 marketValueEmptied
 *               MK-NW-O-004 theEmergencyFund · MK-NW-O-008 thePerformance
 *               MK-PF-F-014 buildPerformance · MK-PL-F-010 drawOrderOutcome
 *               MK-PL-F-022 goalProgressPct · MK-ST-F-010 nameEvidence
 *               MK-ST-F-072 undo · MK-ST-F-093 typedValueOnItsDate
 *               MK-XS-F-031 buildSnapshot · MK-XS-F-102 ingestSync
 *               MK-XS-F-107 mapActivityType · MK-XS-F-184 theirCost
 *               MK-XS-F-219 importedAccountOf · MK-XS-F-229 typedIntoRecord
 *
 * Reaches ..... 701 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 683 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-155
 * Changed ..... not in git yet (—)
 */
export const cash = (n: number): number => (n === 0 ? 0 : (n));


/** THE PLAN for this month: the take-home, less each debt, less planned expenses.
 *
 *  Each debt is its own line — never lumped into "bills + debt". A person chasing a wrong figure
 *  can see which debt it came from without opening another screen. */
/* ─ MK-CF-F-156 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * plannedMonthFlow
 *
 * Answers ..... THE PLAN for this month: the take-home, less each debt, less planned expenses.
 *
 * Formula .....
 *     plan set = budget set (or (planned expenses ?? 0) > 0 when missing)
 *     every month = debts (or none when missing) where !is radar item(each)
 *     radar = debts (or none when missing) where is radar item(each)
 *     due = payment in month(d, ym)
 *     radar kind = is radar item(d)
 *     missing = lines where not enteredfor each of : label
 *     inflow = cash(lines.filter((l) => kind = 'in').reduce((t, l) => t + amount, 0))
 *     outflow = cash(-lines.filter((l) => kind ! = 'in').reduce((t, l) => t + amount, 0))
 *
 * Called by ... MK-CF-O-003 thisMonth
 *
 * Reaches ..... 689 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 671 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-042 how a stream is paid — monthly, yearly or one lump
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · If planned expenses is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-156
 * Changed ..... not in git yet (—)
 */
export function plannedMonthFlow(m: MonthInput): MonthBlock {
  // THE ORDER IS THE DRAWING'S (cash-flow_v01, frame 1): what comes in · the debts that are the same
  // every month · the budget · then the radar's items, the rows a person does not expect and would
  // otherwise hunt for. It ran in the order the debts were entered, with the budget last.
  const planSet = m.budgetSet ?? ((m.plannedExpenses ?? 0) > 0);
  // "after tax and 401(k)" is drawn under the inflow beside a budget (frame A) and not on a fresh account with none (frame B) —
  // 2026-10-25, the drawing match CF-11
  const lines: Line[] = [{ label: inflowLabel('Inflow', m.inflowSources), amount: (m.takeHomeMonthly), kind: 'in',
                           ...(planSet ? { note: 'after tax and 401(k)' } : {}) }];
  const budget: Line = planSet
    ? { label: 'Expenses', amount: cash(-m.plannedExpenses), kind: 'spend', note: 'your budget' }
    : { label: 'Expenses', amount: 0, kind: 'spend', note: 'not set', notSet: true };
  const everyMonth = (m.debts ?? []).filter((d) => !isRadarItem(d));
  const radar = (m.debts ?? []).filter((d) => isRadarItem(d));
  for (const d of [...everyMonth, null, ...radar]) {
    if (d === null) { lines.push(budget); continue; }
    // A DEBT COUNTS IN THIS MONTH ONLY IF A PAYMENT FALLS IN IT (2026-10-24, CF-FIX; PF-TOOLS, settling MK-CF-M-001 to 004) —
    // the one rule the dated grid reads for every later month (paysInMonth). A $250 car loan whose first payment is next month
    // was taken off this month's planned surplus, a loan paid off last month still was, and a balance due in full this month
    // was not (the grid counted it, as the later-month card prints it).
    if (!paysInMonth(d, m.ym)) continue;
    // A PAYMENT NEVER ENTERED IS NOT $0 (2026-10-23, tenet 3; outside re-run of Performance, MK-CF-M-002 tenet 3). It read as
    // a missing number, so the row printed the figure's master-file sentence and the planned surplus read "+No budget set"
    // with a budget set. The row now says "payment not entered" and the block refuses its surplus, naming the debt.
    if (paymentNotEntered(d)) {
      lines.push({ label: d.label, amount: 0, kind: 'debt', note: isRadarItem(d) ? 'from big-ticket radar' : 'debt', notEntered: true });
      continue;
    }
    const due = paymentInMonth(d, m.ym);
    if (due <= 0) continue;
    // EVERY ROW SAYS WHERE IT CAME FROM (approved mock cash-flow_v01, corrected 2026-09-30). The mock
    // draws each planned debt with the note "debt", and a HELOC or a card payment with "from
    // big-ticket radar" — because those two are the rows a person does not expect to see deducted and
    // would otherwise hunt for. The arithmetic is unchanged; only the words a person reads are.
    const radarKind = isRadarItem(d);
    lines.push({ label: paymentShape(d) === 'due_in_full' ? `${d.label} — due in full` : d.label, amount: cash(-due), kind: 'debt',
                 note: radarKind ? 'from big-ticket radar' : 'debt' });
  }
  const missing = lines.filter((l) => l.notEntered).map((l) => l.label);
  // NO BUDGET, NO PLANNED SURPLUS (2026-10-25, FIX-MONTH; DEC-0296 "an unknown input produces no number and a reason — never a
  // default", DEC-7939, tenet 3; CFR-4, MK-CF-F-156-C05): with no budget the Expenses row read "— not set" and every screen printed
  // "—", yet the block handed out 5,000 − 250 = $4,750 as a planned surplus and theMonth's free figure was built on it. It is now no
  // number, with the screen's own words as the reason.
  const refusal = !planSet
    ? 'You haven’t set your budget. Until you do there is no planned surplus — we won’t guess one.'
    : missing.length
      ? `${missing.join(' and ')}${missing.length > 1 ? ' payments are' : '’s payment is'} not entered, so there is no planned surplus — we won’t guess one.`
      : null;
  const inflow = cash(lines.filter((l) => l.kind === 'in').reduce((t, l) => t + l.amount, 0));
  const outflow = cash(-lines.filter((l) => l.kind !== 'in').reduce((t, l) => t + l.amount, 0));
  return { lines, surplus: refusal ? NaN : cash(lines.reduce((t, l) => t + l.amount, 0)), planSet,
           inflow, outflow: refusal ? NaN : outflow, refusal };
}

/** WHAT HAS ACTUALLY HAPPENED: what landed, less only the debts confirmed paid, less what was
 *  really spent.
 *
 *  A debt nobody has paid yet shows at ZERO with its own line — never silently dropped, because a
 *  row that vanishes is a row nobody notices is missing. */
/* ─ MK-CF-F-005 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * actualMonthFlow
 *
 * Answers ..... WHAT HAS ACTUALLY HAPPENED: what landed, less only the debts confirmed paid, less what was really spent.
 *
 * Formula .....
 *     logged = expenses (or none when missing) where in month(each, ym)
 *     paid for = debt payments by debt(m)
 *     lines = [{ label: inflow label('actual inflow', inflow sources), amount: (take home monthly), kind: 'in' }]
 *     paid = paid for.get(debt id) (or 0 when missing)
 *     due = (d as any).due day
 *     radar kind = is radar item(d)
 *     paid to = debt payments matched(debts as any, expenses, ym)
 *     expenses = logged where category ! = DEBT_CATEGORY
 *     by hand = expenses where origin ! = 'imported'
 *     brought = expenses where origin = 'imported'
 *     sum = (xs: typeof expenses) => (xs.reduce((t, e) => t + to num(amount), 0))
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-F-157 debtPaymentsByDebt · MK-CF-O-003 thisMonth
 *
 * Reaches ..... 689 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 671 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *               MK-XS-I-042 how a stream is paid — monthly, yearly or one lump
 *               MK-XS-I-052 the day of the month a debt payment is due
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-005
 * Changed ..... not in git yet (—)
 */
export function actualMonthFlow(m: MonthInput): MonthBlock {
  const logged = (m.expenses ?? []).filter((e) => inMonth(e, m.ym));
  const paidFor = debtPaymentsByDebt(m);
  const lines: Line[] = [{ label: inflowLabel('Actual inflow', m.inflowSources), amount: (m.takeHomeMonthly), kind: 'in' }];
  for (const d of m.debts ?? []) {
    const paid = (paidFor.get(d.debt_id) ?? 0);
    // listed in a month a payment falls in, or one was made in it (paysInMonth, the plan's and the grid's rule; 2026-10-24) —
    // a loan whose first payment is next month read "due 28th · $0" this month, and a balance due in full this month was not listed
    if (!(paid > 0) && !(paysInMonth(d, m.ym) && !(paymentInMonth(d, m.ym) <= 0))) continue;
    // AN UNPAID DEBT NAMES ITS DUE DAY (approved mock: "Car loan · due 28th · $0"). It read "not paid
    // yet", which says the same thing without the one fact that makes it actionable. Where no due day
    // is recorded it keeps the old words rather than inventing a date.
    const due = (d as any).due_day;
    const unpaidNote = due ? `due ${due}${[, 'st', 'nd', 'rd'][Number(String(due).slice(-1))] || 'th'}`
                           : 'not paid yet';
    const radarKind = isRadarItem(d);
    lines.push({ label: paymentShape(d) === 'due_in_full' ? `${d.label} — due in full` : d.label, amount: cash(-paid), kind: 'debt', paid: paid > 0,
                 note: radarKind ? (paid > 0 ? 'from big-ticket radar' : `${unpaidNote} \u00b7 from big-ticket radar`)
                                 : (paid > 0 ? 'paid' : unpaidNote) });
  }
  // A logged debt payment whose label matches no debt we hold. The money still left the bank, so it
  // must still be deducted — dropping it was a real leak: this function replaced MK-CF-F-005, which
  // totalled EVERY logged debt payment, and without this line a person who deleted a paid-off debt
  // would have seen their surplus rise by the amount they had just paid.
  // A PAYMENT IS MATCHED BY THE DEBT ITSELF (2026-10-25, FIX-MONTH; DEC-1923): debtPaymentsMatched puts each logged payment in
  // exactly one place — the debt it was paid on, a name two debts share (given to neither, said once), or no debt still held.
  const paidTo = debtPaymentsMatched(m.debts as any, m.expenses, m.ym);
  if (paidTo.unmatched > 0) {
    lines.push({ label: 'Other debt payments', amount: cash(-paidTo.unmatched), kind: 'debt', paid: true,
                 note: 'logged, but not against a debt you still hold' });
  }
  for (const sh of paidTo.shared) {
    lines.push({ label: 'Other debt payments', amount: cash(-sh.amount), kind: 'debt', paid: true,
                 note: `logged as “${sh.name}” — ${sh.debtIds.length === 2 ? 'two' : sh.debtIds.length} of your debts have that name, so it is given to neither` });
  }
  // TWO ROWS, NOT ONE (approved mock cash-flow_v01): "Expenses entered by hand" and "Expenses
  // imported from your card" are drawn apart, because a person checking the month needs to know which
  // of the two they can still correct. It was one merged row, and could not be split until an imported
  // expense recorded that it was imported — nothing did (2026-09-30). A month with only one kind keeps
  // a single row, so nobody reads a $0 line that means nothing.
  const spending = logged.filter((e) => e.category !== DEBT_CATEGORY);
  const byHand = spending.filter((e) => e.origin !== 'imported');
  const brought = spending.filter((e) => e.origin === 'imported');
  const sum = (xs: typeof spending) => (xs.reduce((t, e) => t + toNum(e.amount), 0));
  // "Expenses entered by hand" is always there, at $0 on a month with nothing typed in (frame B draws
  // it so); the imported row joins it once a card has brought anything. Each is worded as drawn.
  lines.push({ label: 'Expenses entered by hand', amount: cash(-sum(byHand)), kind: 'spend' });
  if (brought.length) {
    lines.push({ label: 'Expenses imported from your card', amount: cash(-sum(brought)), kind: 'spend',
                 note: 'imported' });
  }
  // THE ACTUAL SIDE RUNS IN THE DRAWING'S ORDER TOO: inflow · the every-month debts · the expenses ·
  // then the radar's items.
  const isRadarLine = (l: Line) => l.kind === 'debt' && /from big-ticket radar/.test(l.note ?? '');
  const ordered = [...lines.filter((l) => !isRadarLine(l)), ...lines.filter(isRadarLine)];
  // what came in and what went out, from the same rows (2026-10-23): Home's box prints these three, never its own sums
  const inflow = cash(ordered.filter((l) => l.kind === 'in').reduce((t, l) => t + l.amount, 0));
  // THE MONTH'S OUTFLOW COMES FROM ONE FUNCTION (his DEC-0333, 2026-09-12: "agree; ensure compliance with the synonym ruling"):
  // the expenses so far and the debt paid so far, handed to MK-CF-F-194 monthOutflow — the same sum a past month's frozen
  // record is read through. Until 2026-10-24 this month's outflow was summed here instead, so the one function his ruling
  // names made only the past months'. The amount is unchanged: every row that is not money in.
  const spentSoFar = -ordered.filter((l) => l.kind === 'spend').reduce((t, l) => t + l.amount, 0);
  const debtPaidSoFar = -ordered.filter((l) => l.kind === 'debt').reduce((t, l) => t + l.amount, 0);
  const outflow = cash(monthOutflow({ spending: spentSoFar, debt_paid: debtPaidSoFar }, spentSoFar + debtPaidSoFar));
  return { lines: ordered, surplus: cash(ordered.reduce((t, l) => t + l.amount, 0)), planSet: true, inflow, outflow, refusal: null };
}

/** WHICH DEBTS HAVE ACTUALLY BEEN PAID this month, and how much each.
 *
 *  Until now a logged payment was only ever TOTALLED — one number, debtPaid, for every debt at
 *  once. The data to split them was already there: logging a payment stores the debt's own label.
 *  Nothing read it back, so "mortgage paid, car still due" could not be said. */
/* ─ MK-CF-F-157 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * debtPaymentsByDebt
 *
 * Answers ..... WHICH DEBTS HAVE ACTUALLY BEEN PAID this month, and how much each.
 *
 * Formula .....
 *     the answer = debt payments matched(debts as any, expenses, ym).by debt
 *     sep = spend by month by bucket(counted)[8]
 *
 * Called by ... MK-CF-F-005 actualMonthFlow
 *
 * Reaches ..... 689 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 671 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-014 debt balance
 *               MK-XS-I-015 debt interest rate
 *               MK-XS-I-016 debt minimum payment
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-032 expenses categories the person set up
 *               MK-XS-I-042 how a stream is paid — monthly, yearly or one lump
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-157
 * Changed ..... not in git yet (—)
 */
export function debtPaymentsByDebt(m: MonthInput): Map<string, number> {
  // BY THE DEBT ITSELF, NEVER BY A NAME TWO DEBTS SHARE (2026-10-25, FIX-MONTH; DEC-1923, CFR-4 MK-CF-F-157-C05): the name lookup
  // kept the later of two debts called "Loan", so one $250 was credited to B and A read unpaid — a guess shown as fact. The one
  // matcher (debtPaymentsMatched) credits a payment to the debt it names by id, or to the one debt with its name; a name two
  // debts share is given to neither and is listed once on its own row (actualMonthFlow).
  return debtPaymentsMatched(m.debts as any, m.expenses, m.ym).byDebt;
}

/** ── ORCHESTRATOR ────────────────────────────────────────────────────────────────────────────
 *  WHAT DOES THIS MONTH LOOK LIKE? The This month tab calls THIS and nothing else.
 *
 *  It does no arithmetic of its own. Both blocks come back together so the screen cannot show one
 *  without the other, and cannot build "planned" from a different source than the row beneath it. */
export interface ThisMonth { planned: MonthBlock; actual: MonthBlock; }

/** THE WORKED EXAMPLE — ONE MONTH, TWICE (six steps, step 6, 2026-09-28).
 *
 *  The same September 2026 as the Cash-flow door uses, because it is the same month: $7,200 of
 *  take-home, a $2,400 mortgage (on no property in Net worth) and a $250 car loan due, a $3,400 budget of which $2,300 is the
 *  Rent / Mortgage line, and $2,998 logged — $2,300 of it under Rent / Mortgage — with the car loan paid. Every figure runs
 *  `thisMonth`, the real door, on the budget AS IT IS COUNTED (2026-10-26, PF-TOOLS; FIX-MONTH's finding, his DEC-1923 and the
 *  lead's ruling on DEC-2440): the mortgage on no property is taken as the Rent / Mortgage line, so the line stands down ($1,100
 *  of budget left) and the $2,300 logged under it is the mortgage's payment. It ran on the budget as typed, mortgage counted twice.
 *
 *  PLANNED AND ACTUAL ARE NEVER MIXED. Planned: 7,200 − 2,400 − 250 − 1,100 = $3,450 — what the month
 *  holds if it goes to plan. Actual so far: 7,200 − 2,300 − 250 − 698 = $3,952 — the mortgage's $2,300 paid, $100 of its
 *  $2,400 still to go. Both are true; neither is the other, and that is why the screen labels each one.
 */
const EXAMPLE: MonthInput = {
  ym: '2026-09', takeHomeMonthly: 7200, inflowSources: ['income (take-home)'],
  debts: [
    { debt_id: 'd1', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 228000, interest_rate_apr: 0.0625, minimum_monthly_payment: 2400, payment_type: 'installment' },
    { debt_id: 'd2', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 250, payment_type: 'installment' },
  ] as any[],
  ...((): any => {
    const counted = theBudgetCounted({ profile: { monthlySpending: '3400', spendCats: [
      { id: 'rent', label: 'Rent / Mortgage', amount: 2300, bucket: 'fixed' }, { id: 'groceries', label: 'Groceries', amount: 700, bucket: 'flexible' },
      { id: 'dining', label: 'Eating out', amount: 400, bucket: 'flexible' }] }, accounts: [], debts: [
      { debt_id: 'd1', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 228000, interest_rate_apr: 0.0625, minimum_monthly_payment: 2400, payment_type: 'installment' },
      { debt_id: 'd2', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 250, payment_type: 'installment' }] as any[] }).profile;
    const sep = spendByMonthByBucket(counted)[8];
    return {
      plannedExpenses: sep.fixed + sep.nonmonthly + sep.flexible,
      expenses: expensesAsCounted([
        { amount: 2300, category: 'Rent / Mortgage', date: '2026-09-01' },
        { amount: 512, category: 'Groceries', date: '2026-09-07' },
        { amount: 186, category: 'Eating out', date: '2026-09-12' },
        { amount: 250, category: 'Debt payment', store: 'Car loan', date: '2026-09-12' }] as any[], counted),
    };
  })(),
};
const GIVEN =
  'September 2026: $7,200 take-home; a $2,400 mortgage (on no property in Net worth) and a $250 car loan due; a $3,400 budget, '
  + '$2,300 of it the Rent / Mortgage line, which stands down for the mortgage in Debts. '
  + 'Logged so far: $2,300 under Rent / Mortgage (the mortgage\u2019s payment), $512 groceries, $186 eating out, and the $250 car loan paid.';

/** Example only: runs thisMonth on the worked example and calculates nothing of its own. */
/* ─ MK-CF-F-241 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * M
 *
 * Answers ..... Example only: runs thisMonth on the worked example and calculates nothing of its own.
 *
 * Formula .....
 *     this month(EXAMPLE)
 *
 * Called by ... MK-CF-F-242 workedLineAmount
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-F-242 workedLineAmount
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-014 debt balance
 *               MK-XS-I-015 debt interest rate
 *               MK-XS-I-016 debt minimum payment
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-241
 * Changed ..... not in git yet (—)
 */
const M = () => thisMonth(EXAMPLE);
/** THE LATER-MONTH CARD'S HOUSEHOLD — the worked September's, one month on: on 15 Sep 2026, October's plan from the dated grid. */
const GIVEN_LATER = 'On 15 Sep 2026, October’s plan card: $7,200/month take-home; a $3,400/month budget, $2,300 of it the Rent / Mortgage line, which stands down for the $2,400 mortgage in Debts (on no property); and a $250 car loan.';
const LATER_DEBTS = [
  { debt_id: 'm', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 228_000, interest_rate_apr: 0.0625, minimum_monthly_payment: 2_400 },
  { debt_id: 'c', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14_000, interest_rate_apr: 0.069, minimum_monthly_payment: 250 }] as any[];
/** Example only: builds the later-month card's dated grid for the worked example, and calculates nothing of its own. */
/* ─ MK-CF-F-237 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * LATER
 *
 * Answers ..... Example only: builds the later-month card's dated grid for the worked example, and calculates nothing of its own.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-CF-F-242 workedLineAmount · MK-CF-F-295 debtLoad
 *               MK-XS-F-004 buildDatedGrid
 *
 * Reaches ..... 10 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-237 LATER
 *               MK-CF-F-296 LOAD · MK-XS-F-004 buildDatedGrid
 *               MK-CF-F-107 buildPaycheckYear · MK-CF-F-295 debtLoad
 *               MK-CF-O-017 futurePaycheck · MK-CF-F-212 receivedInMonth
 *               MK-CF-O-008 whatsComing · MK-CF-F-242 workedLineAmount
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-032 expenses categories the person set up
 *               MK-XS-I-039 how often each income arrives
 *               MK-XS-I-040 whether a stream is already being received
 *               MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-237
 * Changed ..... not in git yet (—)
 */
const LATER = () => buildDatedGrid(theBudgetCounted({ profile: { status: 'employed', incomeSources: ['employment'], baseSalary: '7200', salaryMode: 'takehome', salaryFreq: 'monthly',
  taxMode: 'manual', manualTaxRate: '0', monthlySpending: '3400', spendCats: [
    { id: 'rent', label: 'Rent / Mortgage', amount: 2300, bucket: 'fixed' }, { id: 'groceries', label: 'Groceries', amount: 700, bucket: 'flexible' },
    { id: 'dining', label: 'Eating out', amount: 400, bucket: 'flexible' }] }, accounts: [], debts: LATER_DEBTS }).profile as any,
  { now: new Date(2026, 8, 15), liabilities: LATER_DEBTS }).cells[1];

/** Example only: reads one row's amount from the worked example of the month. */
/* ─ MK-CF-F-242 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * workedLineAmount
 *
 * Answers ..... Example only: reads one row's amount from the worked example of the month.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-242
 * Changed ..... not in git yet (—)
 */
const workedLineAmount = (block: 'planned' | 'actual', startsWith: string) =>
  M()[block].lines.find((l) => l.label.startsWith(startsWith))!.amount;

/** ── THE FIGURES THIS DOOR HANDS OUT (founder rule 11) ───────────────────────────────────────────
 *  DRAFT, 2026-09-14 — declared and printed on the master file, waiting for the founder's verdict
 *  before the Cash flow screen moves behind this door (rule 10: the row before the code).
 *
 *  The question is "how much have I spent this month, against the plan, and what is left". It is
 *  answered TWICE for the same month and the two answers are never mixed: what the plan says the
 *  month holds, and what has actually happened so far. Every figure below says which of the two it is.
 */
export const FIGURES = declareFigures({
  // WHAT IS PRINTED, AND WHERE (2026-10-24, CF-FIX; PF-TOOLS, settling MK-CF-M-001 to 004). These three are declared beside
  // this month's door, but the door does not print them: the plan card of a month after this one prints them (Cash flow →
  // This month → ›), from the dated grid's cell for that month (MK-XS-F-004 buildDatedGrid) — and MK-CF-M-047 is also the
  // Income tab's expected take-home for the month shown. This month's own PLANNED block prints MK-CF-M-002. The rows read
  // "(this month)" and ran this month's door; they now say what is printed and run the grid.
  'MK-CF-M-047': {
    label: 'Planned inflow', unit: 'money', per: 'month', screens: ['/cashflow'],
    answers: 'What the plan says comes in during a month after this one — printed on that month’s plan card, and as the Income tab’s expected take-home for the month shown.',
    formula: 'planned inflow = the dated grid’s inflow for that month: Σ of every income source that lands in that month, at its take-home amount (after tax and 401(k)); a source that lands once a year counts only in the month it lands',
    inputs: ['MK-CF-M-037 take-home each month', 'MK-CF-I-006 other income', 'MK-CF-I-007 rental income', 'MK-CF-I-008 retirement income'],
    decisions: ['A month is a real calendar month, never a twelfth of a year (founder, 2026-08-28).'],
    grain: 'one figure per household per month',
    refusal: 'Shows $0 until income is entered, with the door to enter it.',
    note: 'Printed by the plan card of a later month (“Planned inflow”) and by the Income tab (“expected take-home”, this month or the month picked), both from the dated grid’s cell for that month.',
    worked: {
      given: GIVEN_LATER,
      answer: '$7,200/month',
      run: () => LATER().inflow,
    },
  },
  'MK-CF-M-048': {
    label: 'Planned outflow (expenses + debt)', unit: 'money', per: 'month', screens: ['/cashflow'],
    answers: 'What the plan says goes out during a month after this one — printed on that month’s plan card: the budget, the debt payments that fall in that month, and any big bill that falls in it.',
    formula: 'planned outflow = the dated grid’s outflow for that month: the month’s planned expenses (a bill with its own month in that month only) + each debt payment that falls in that month (from its first payment to its payoff; a balance due in full once, in its month)',
    inputs: ['MK-CF-I-012 planned expenses', 'MK-CF-I-013 debt payment', 'MK-CF-I-014 big bill'],
    decisions: ['A debt payment is counted as an outflow, not as saving (founder, 2026-06-21).', 'A bill that falls once a year is shown in its own month, never spread.',
      'A debt counts in a month only if a payment falls in that month — the rule This month’s planned surplus (MK-CF-M-002) reads too (2026-10-24).'],
    grain: 'one figure per household per month',
    refusal: 'Shows $0 until expenses or debts are entered.',
    note: 'Printed by the plan card of a later month only, from the dated grid’s cell for that month.',
    worked: {
      given: GIVEN_LATER,
      answer: '$3,750/month',   // 1,100 of budget (the 2,300 Rent / Mortgage line stood down) + 2,400 mortgage + 250 car loan (2026-10-26; was $6,050)
      run: () => LATER().outflow,
    },
  },
  'MK-CF-M-049': {
    label: '= Planned surplus', unit: 'money', per: 'month', screens: ['/cashflow'],
    answers: 'What the plan leaves over in a month after this one — printed on that month’s plan card.',
    formula: 'planned surplus = planned inflow − planned outflow, as the card prints them (the dated grid’s cell for that month)',
    inputs: ['MK-CF-M-047 planned inflow', 'MK-CF-M-048 planned outflow'],
    grain: 'one figure per household per month',
    refusal: 'Shows $0 until both sides are entered.',
    note: 'Printed by the plan card of a later month only. This month’s planned surplus is MK-CF-M-002; the retired view’s “Spent $X of $Y surplus” line prints MK-CF-M-078 (until 2026-10-24 it was printed under this number).',
    worked: {
      given: GIVEN_LATER,
      answer: '$3,450/month',   // 7,200 − 3,750: the mortgage counted once, as the screens count it (2026-10-26; was $1,150)
      run: () => LATER().net,
    },
  },
  'MK-CF-M-050': {
    label: 'each planned line', unit: 'money', per: 'month', screens: ['/cashflow'],
    answers: 'Each thing the plan says comes in or goes out this month, named, so the two totals can be checked by hand.',
    formula: 'one line per source or commitment that falls in this month, at its amount for this month',
    inputs: ['MK-CF-M-047 expected inflow', 'MK-CF-M-048 planned outflow'],
    grain: 'one figure per line per month',
    refusal: 'The list is replaced by the door to enter income or expenses when nothing is entered.',
    worked: {
      given: GIVEN,
      answer: '−$2,400/month',
      run: () => workedLineAmount('planned', 'Mortgage'),
    },
  },
  'MK-CF-M-051': {
    label: 'Inflow', unit: 'money', per: 'month', screens: ['/cashflow', '/home'],
    // THE ROW'S WORDS NOW SAY WHAT THE SCREEN DOES (2026-10-23, CF-FIX; outside re-run of Performance, MK-CF-M-051 tenet 1, and
    // the Cash flow package's check of the declarations). They said only income recorded as received counts; the approved
    // drawing, and the code with it, put the month's take-home in Actual inflow before any paycheck is recorded — Sep 12,
    // nothing received, the screen reads $7,200. No figure moves.
    answers: 'What has come in this month on the actual side: the month’s take-home, as the approved drawing draws it — before any paycheck is recorded as received.',
    formula: 'inflow = the month’s take-home — this month’s cell of the dated grid: every source that lands in this month, after tax and 401(k); a payment recorded as received is listed under RECEIVED on the Income tab (MK-CF-M-012) and is not added to it',
    inputs: ['MK-CF-M-037 take-home each month'],
    decisions: ['THE APPROVED DRAWING WINS (2026-10-23, under his rules DEC-3523 tenet 6 and "the newest approval wins", 2026-09-27): cash-flow_v01, approved 2026-09-28 (DEC-0440), draws the month’s take-home as Actual inflow with nothing recorded. The words this row carried — "nothing is assumed to have arrived; a source counts only once it is recorded" (2026-08-28) — are older and stand down. To reverse: count only recorded payments here, and Cash flow and Home move together.',
      'Home prints this same figure, from the same rows (2026-10-23): it added any income recorded as received on top of the take-home, which Cash flow does not.'],
    grain: 'one figure per household per month',
    refusal: 'Income not entered: $0, and under it the one line "Nothing entered yet. Add your income ›" on Home (Q48); Cash flow draws no month until income is entered — its two set-up steps stand in its place.',
    note: 'The words beside it name what is inside it — "Inflow (income (take-home) + rent)" — his cluster 5 ruling of 2026-09-10.',
    worked: {
      given: GIVEN,
      answer: '$7,200/month',
      run: () => workedLineAmount('actual', 'Actual inflow'),
    },
  },
  // THE ROW'S WORDS NOW SAY WHAT THE SCREEN DOES (2026-10-23; outside re-run of Performance, MK-CF-M-052 tenets 2 and 8, row
  // words only — no figure moves). They said the debt payments DUE are counted in full, logged or not; the screen, by the
  // approved drawing (DEC-0440), counts the payments MADE and shows an unpaid debt at $0 with its due day. The reviewer's
  // $5,648 followed the old words; the screen's $3,248 follows the drawing.
  'MK-CF-M-052': {
    label: 'Outflow (expenses + debt)', unit: 'money', per: 'month', screens: ['/cashflow', '/home'],
    answers: 'What has actually gone out so far this month: the expenses logged and the debt payments made.',
    // the producer named on the row (DEC-0333, re-pointed 2026-10-24 from MK-CF-M-004, whose number went to the month's rows on 2026-10-02)
    formula: 'Outflow (expenses + debt) so far = MK-CF-F-194 monthOutflow of the expenses logged so far this month and the debt payments made so far; an unpaid debt shows $0 with its due day',
    inputs: ['MK-CF-I-016 logged expense', 'MK-CF-I-013 debt payment'],
    decisions: ['A debt payment counts once it is made — logged as a debt payment — and an unpaid debt shows $0 with its due day, never left off (the approved drawing, DEC-0440).',
      'Home prints this same figure, from the same rows (2026-10-23): it used to count the expenses only, without the debt paid.'],
    grain: 'one figure per household per month',
    refusal: 'A real $0 when nothing is logged and no debt is paid. Cash flow draws no month until income is entered (its two set-up steps); a past month with no record reads "Nothing recorded for this month — it predates your tracking."',
    worked: {
      given: GIVEN,
      answer: '−$3,248/month',
      run: () => workedLineAmount('actual', 'Expenses entered by hand') + workedLineAmount('actual', 'Mortgage') + workedLineAmount('actual', 'Car loan'),
    },
  },
  'MK-CF-M-053': {
    label: '= Surplus', unit: 'money', per: 'month', screens: ['/cashflow', '/home'],
    answers: 'What is actually left this month so far — not what the plan said, what has happened.',
    formula: 'surplus so far = inflow so far − outflow so far',
    inputs: ['MK-CF-M-051 inflow so far', 'MK-CF-M-052 outflow so far'],
    decisions: ['ONE FIGURE ON TWO SCREENS (2026-10-23, DEC-0345 and tenet 4): Home\'s "Left" is the Cash flow tab\'s "= Actual surplus so far", read from the same rows — Home showed $4,202 against Cash flow\'s $3,952 for one month because it left out the $250 car loan paid.'],
    grain: 'one figure per household per month',
    refusal: 'Income not entered: no surplus — Cash flow shows its two set-up steps, and Home\'s box reads — beside Left, with "Nothing entered yet. Add your income ›" under Income and no pace word. A past month with no record: $0 and "Nothing recorded for this month — it predates your tracking."',
    note: 'The Cash flow screen used to subtract this itself (rule 5). It is the door’s figure now.',
    worked: {
      given: GIVEN,
      answer: '$3,952/month',
      run: () => M().actual.surplus,
    },
  },
  'MK-CF-M-054': {
    // THE LABEL NOW SAYS WHAT THE ROWS ARE (2026-10-27, PF-TOOLS; the screens measurement, MK-CF-M-054 tenet 8): "each received
    // line" named rows that hold the take-home before anything is received and debts not yet paid at $0. No screen prints this
    // label (the rows print as MK-CF-M-004) and the identifier is in this file, so nothing else moves. To reverse: the old label.
    label: 'each line of what has happened so far', unit: 'money', per: 'month', screens: ['/cashflow'],
    // THE ROW'S WORDS NOW SAY WHAT THE CODE DOES (2026-10-23, CF-FIX; the Cash flow package's check of the declarations): its
    // words said each payment recorded as received, its worked answer is the car loan's paid row, −$250. The actual block has
    // no received payments in it (MK-CF-M-051): its lines are the inflow, each debt paid or still due and the expenses — the
    // actual side of MK-CF-M-050 "each planned line". No figure moves; the label is kept for the register's key.
    answers: 'Each line of the actual side of the month, named — the inflow, each debt paid or still due, the expenses — so the actual surplus can be checked by hand.',
    formula: 'one line per row of the actual block, at its amount so far: the inflow; each debt, minus what was paid against it this month ($0 with its due day when nothing was); other debt payments; the expenses entered by hand and imported',
    inputs: ['MK-CF-M-037 take-home each month', 'MK-CF-I-013 debt payment', 'MK-CF-I-016 logged expense'],
    grain: 'one figure per line',
    refusal: 'A real $0 on a line with nothing in it — a debt not paid yet reads $0 with its due day, and "Expenses entered by hand" stays at $0; Cash flow draws no month until income is entered.',
    worked: {
      given: GIVEN,
      answer: '−$250/month',
      run: () => workedLineAmount('actual', 'Car loan'),
    },
  },
} as const);

/** How is the month going: what the plan says it holds and what has actually happened so far, each row by row and each ending in its surplus? */
/* ─ MK-CF-O-003 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * thisMonth
 *
 * Answers ..... How is the month going: what the plan says it holds and what has actually happened so far, each row by row and each ending in its surplus?
 *
 * Formula .....
 *     planned = planned month flow(m)
 *     actual = actual month flow(m)
 *
 * Called by ... MK-CF-F-241 M · MK-CF-O-010 theMonth
 *
 * Reaches ..... 689 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 671 more — the full list is on functions_from_code
 *
 * Serves ...... MK-CF-M-047 · MK-CF-M-048 · MK-CF-M-049 · MK-CF-M-050
 *               MK-CF-M-051 · MK-CF-M-052 · MK-CF-M-053 · MK-CF-M-054
 * Ruled by .... DEC-0002 · DEC-0199 · DEC-0260 · DEC-0512
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-003
 * Changed ..... not in git yet (—)
 */
export function thisMonth(m: MonthInput): ThisMonth {
  return { planned: plannedMonthFlow(m), actual: actualMonthFlow(m) };
}

/** Is this debt one that repeats unchanged every month? Installment debt is; revolving is not.
 *  Exported here because both this file and Expenses need the same answer. */
/* ─ MK-CF-F-159 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * isRecurringDebt
 *
 * Answers ..... Is this debt one that repeats unchanged every month?
 *
 * Formula .....
 *     payment shape(d) = 'installment'
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-042 how a stream is paid — monthly, yearly or one lump
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-159
 * Changed ..... not in git yet (—)
 */
export const isRecurringDebt = (d: Debt): boolean => paymentShape(d) === 'installment';
