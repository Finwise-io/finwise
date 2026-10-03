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
import { requiredPayment, paymentShape, type Debt } from '../../../src/domain/debt';
import { inMonth, DEBT_CATEGORY, type LoggedExpense } from './logged-expenses';
// the radar's own rule for which debts are radar items — one place, so the note on a row and the
// radar list can never disagree about what a HELOC or a card payment is (2026-09-30)
import { isRadarItem } from './expenses';



export interface MonthInput {
  ym: string;                    // 'YYYY-MM' — the month being shown
  takeHomeMonthly: number;       // from basePay — the take-home
  inflowSources?: string[];      // the sources inside takeHomeMonthly, by name — the inflow line prints them (cluster #5 ruling, 2026-09-10)
  debts: Debt[];
  plannedExpenses: number;       // from plannedMonthlySpend — the ONE canonical planned figure
  expenses: LoggedExpense[];     // everything logged, debt payments included
  /** WHAT THE PLAN HAS ALREADY PROMISED to goals, per month. The hero figure on This month is the
   *  surplus LESS these, because money already committed to a goal is not free (F11). */
  commitments?: { label: string; monthlyAmount: number }[];
}

export interface Line { label: string; amount: number; kind: 'in' | 'debt' | 'spend'; paid?: boolean; note?: string; }

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
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... MK-CF-M-004
 * Ruled by .... DEC-0002 · DEC-0260
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
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
export interface MonthBlock { lines: Line[]; surplus: number; }

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
 *
 * Reaches ..... 68 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-005 actualMonthFlow
 *               MK-CF-F-012 annualCashflow · MK-CF-F-210 annualOfSource
 *               … and 50 more — the full list is on functions_from_code
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
 * Reaches ..... 69 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-005 actualMonthFlow
 *               MK-CF-F-012 annualCashflow · MK-CF-F-210 annualOfSource
 *               … and 51 more — the full list is on functions_from_code
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
 *               MK-CF-F-156 plannedMonthFlow · MK-CF-O-010 theMonth
 *               MK-HM-F-006 money0 · MK-NW-F-004 portfolioActualReturn
 *               MK-NW-F-005 accountAllowsTicker · MK-NW-F-007 assetKind
 *               MK-NW-F-008 incomeBearingClassOf · MK-NW-F-010 wrapperAccount
 *               MK-NW-F-026 accountDisplayNames · MK-NW-F-027 accountClassBreakdown
 *               MK-NW-F-035 blendedVolatility · MK-NW-F-056 bondInfo
 *               MK-NW-F-075 ACC · MK-NW-F-079 EF
 *               MK-NW-F-084 categoryEarnings · MK-NW-F-101 PLAN
 *               MK-NW-O-004 theEmergencyFund · MK-PF-F-017 allocation
 *               MK-PL-F-010 drawOrderOutcome · MK-PL-F-022 goalProgressPct
 *               MK-ST-F-031 valueOn · MK-ST-F-072 undo
 *               MK-XS-F-031 buildSnapshot · MK-XS-F-107 mapActivityType
 *
 * Reaches ..... 189 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-NW-F-078 ONE
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               … and 171 more — the full list is on functions_from_code
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
 *     lines = [{ label: inflow label('Inflow', inflow sources), amount: (take home monthly), kind: 'in' }]
 *     due = required payment(d)
 *     radar kind = is radar item(d)
 *     the answer:
 *     lines = lines
 *     surplus = cash(lines.reduce((t, l) => t + amount, 0))
 *
 * Called by ... MK-CF-O-003 thisMonth
 *
 * Reaches ..... 68 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-005 actualMonthFlow
 *               MK-CF-F-012 annualCashflow · MK-CF-F-210 annualOfSource
 *               … and 50 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-156
 * Changed ..... not in git yet (—)
 */
export function plannedMonthFlow(m: MonthInput): MonthBlock {
  const lines: Line[] = [{ label: inflowLabel('Inflow', m.inflowSources), amount: (m.takeHomeMonthly), kind: 'in' }];
  for (const d of m.debts ?? []) {
    const due = (requiredPayment(d));
    if (due <= 0) continue;
    // EVERY ROW SAYS WHERE IT CAME FROM (approved mock cash-flow_v01, corrected 2026-09-30). The mock
    // draws each planned debt with the note "debt", and a HELOC or a card payment with "from
    // big-ticket radar" — because those two are the rows a person does not expect to see deducted and
    // would otherwise hunt for. The arithmetic is unchanged; only the words a person reads are.
    const radarKind = isRadarItem(d);
    lines.push({ label: d.label, amount: cash(-due), kind: 'debt',
                 note: radarKind ? 'from big-ticket radar' : 'debt' });
  }
  lines.push({ label: 'Expenses', amount: cash(-m.plannedExpenses), kind: 'spend',
               note: 'your budget' });
  return { lines, surplus: cash(lines.reduce((t, l) => t + l.amount, 0)) };
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
 *     matched = Σ over [...paid for.values()] of (each)
 *     unmatched = all debt paid − matched
 *     expenses = logged where category ! = DEBT_CATEGORY
 *     by hand = expenses where origin ! = 'imported'
 *     brought = expenses where origin = 'imported'
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-O-003 thisMonth
 *
 * Reaches ..... 68 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-005 actualMonthFlow
 *               MK-CF-F-012 annualCashflow · MK-CF-F-210 annualOfSource
 *               … and 50 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
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
    if ((requiredPayment(d)) <= 0) continue;
    const paid = (paidFor.get(d.debt_id) ?? 0);
    // AN UNPAID DEBT NAMES ITS DUE DAY (approved mock: "Car loan · due 28th · $0"). It read "not paid
    // yet", which says the same thing without the one fact that makes it actionable. Where no due day
    // is recorded it keeps the old words rather than inventing a date.
    const due = (d as any).due_day;
    const unpaidNote = due ? `due ${due}${[, 'st', 'nd', 'rd'][Number(String(due).slice(-1))] || 'th'}`
                           : 'not paid yet';
    const radarKind = isRadarItem(d);
    lines.push({ label: d.label, amount: cash(-paid), kind: 'debt', paid: paid > 0,
                 note: radarKind ? (paid > 0 ? 'from big-ticket radar' : `${unpaidNote} \u00b7 from big-ticket radar`)
                                 : (paid > 0 ? 'paid' : unpaidNote) });
  }
  // A logged debt payment whose label matches no debt we hold. The money still left the bank, so it
  // must still be deducted — dropping it was a real leak: this function replaced MK-CF-F-005, which
  // totalled EVERY logged debt payment, and without this line a person who deleted a paid-off debt
  // would have seen their surplus rise by the amount they had just paid.
  const matched = [...paidFor.values()].reduce((t, v) => t + v, 0);
  const allDebtPaid = (logged.filter((e) => e.category === DEBT_CATEGORY)
                                   .reduce((t, e) => t + toNum(e.amount), 0));
  const unmatched = (allDebtPaid - matched);
  if (unmatched > 0) {
    lines.push({ label: 'Other debt payments', amount: cash(-unmatched), kind: 'debt', paid: true,
                 note: 'logged, but not against a debt you still hold' });
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
  if (byHand.length && brought.length) {
    lines.push({ label: 'Expenses entered by hand', amount: cash(-sum(byHand)), kind: 'spend',
                 note: `${byHand.length} logged` });
    lines.push({ label: 'Expenses imported from your card', amount: cash(-sum(brought)), kind: 'spend',
                 note: 'imported' });
  } else if (brought.length) {
    lines.push({ label: 'Expenses imported from your card', amount: cash(-sum(brought)), kind: 'spend',
                 note: 'imported' });
  } else {
    lines.push({ label: 'Actual expenses so far', amount: cash(-sum(byHand)), kind: 'spend',
                 note: `${byHand.length} logged` });
  }
  return { lines, surplus: cash(lines.reduce((t, l) => t + l.amount, 0)) };
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
 *     out = new map<string, number>()
 *     by label = a lookup of for each of debts (or none when missing): [string(label).trim().to lower case(), debt id]
 *     id = by label.get(string(store ?? '').trim().to lower case())
 *     the answer = out
 *
 * Called by ... MK-CF-F-005 actualMonthFlow
 *
 * Reaches ..... 68 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-005 actualMonthFlow
 *               MK-CF-F-012 annualCashflow · MK-CF-F-210 annualOfSource
 *               … and 50 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-014 debt balance
 *               MK-XS-I-015 debt interest rate
 *               MK-XS-I-016 debt minimum payment
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-042 how a stream is paid — monthly, yearly or one lump
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-157
 * Changed ..... not in git yet (—)
 */
export function debtPaymentsByDebt(m: MonthInput): Map<string, number> {
  const out = new Map<string, number>();
  const byLabel = new Map((m.debts ?? []).map((d) => [String(d.label).trim().toLowerCase(), d.debt_id]));
  for (const e of (m.expenses ?? [])) {
    if (e.category !== DEBT_CATEGORY || !inMonth(e, m.ym)) continue;
    const id = byLabel.get(String(e.store ?? '').trim().toLowerCase());
    if (!id) continue;                       // a payment against a debt that no longer exists
    out.set(id, ((out.get(id) ?? 0) + toNum(e.amount)));
  }
  return out;
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
 *  take-home, a $2,400 mortgage and a $250 car loan due, a $3,400 budget, and $2,998 of expenses
 *  logged with the car loan paid. Every figure runs `thisMonth`, the real door.
 *
 *  PLANNED AND ACTUAL ARE NEVER MIXED. Planned: 7,200 − 2,400 − 250 − 3,400 = $1,150 — what the month
 *  holds if it goes to plan. Actual so far: 7,200 − 0 − 250 − 2,998 = $3,952 — which reads HIGHER
 *  only because the mortgage has not gone out yet. Both are true; neither is the other, and that is
 *  why the screen labels each one.
 */
const EXAMPLE: MonthInput = {
  ym: '2026-09', takeHomeMonthly: 7200, inflowSources: ['income (take-home)'],
  debts: [
    { debt_id: 'd1', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 228000, interest_rate_apr: 0.0625, minimum_monthly_payment: 2400, payment_type: 'installment' },
    { debt_id: 'd2', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 250, payment_type: 'installment' },
  ] as any[],
  plannedExpenses: 3400,
  expenses: [
    { amount: 2300, category: 'Rent / Mortgage', date: '2026-09-01' },
    { amount: 512, category: 'Groceries', date: '2026-09-07' },
    { amount: 186, category: 'Eating out', date: '2026-09-12' },
    { amount: 250, category: 'Debt payment', store: 'Car loan', date: '2026-09-12' },
  ],
};
const GIVEN =
  'September 2026: $7,200 take-home; a $2,400 mortgage and a $250 car loan due; a $3,400 budget. '
  + 'Logged so far: $2,300 rent, $512 groceries, $186 eating out, and the $250 car loan paid.';
/* ─ MK-CF-O-014 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * M
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     this month(EXAMPLE)
 *
 * Called by ... MK-CF-O-015 workedLineAmount
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-O-015 workedLineAmount
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-014
 * Changed ..... not in git yet (—)
 */
const M = () => thisMonth(EXAMPLE);
/* ─ MK-CF-O-015 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * workedLineAmount
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-015
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
  'MK-CF-M-047': {
    label: 'Expected inflow', unit: 'money', per: 'month', screens: ['/cashflow'],
    answers: 'What the plan says comes in this month — take-home, and anything else that lands in this particular month.',
    formula: 'expected inflow = Σ of every income source that lands in this month, at its take-home amount; a source that lands once a year counts only in the month it lands',
    inputs: ['MK-CF-M-037 take-home each month', 'MK-CF-I-006 other income', 'MK-CF-I-007 rental income', 'MK-CF-I-008 retirement income'],
    decisions: ['A month is a real calendar month, never a twelfth of a year (founder, 2026-08-28).'],
    grain: 'one figure per household per month',
    refusal: 'Shows $0 until income is entered, with the door to enter it.',
    worked: {
      given: GIVEN,
      answer: '$7,200/month',
      run: () => workedLineAmount('planned', 'Inflow'),
    },
  },
  'MK-CF-M-048': {
    label: 'Planned outflow (expenses + debt)', unit: 'money', per: 'month', screens: ['/cashflow'],
    answers: 'What the plan says goes out this month — the budget, plus the debt payments due, plus any big bill that falls in this month.',
    formula: 'planned outflow = planned everyday expenses + Σ of the debt payments due this month + Σ of the big bills that fall in this month',
    inputs: ['MK-CF-I-012 planned expenses', 'MK-CF-I-013 debt payment', 'MK-CF-I-014 big bill'],
    decisions: ['A debt payment is counted as an outflow, not as saving (founder, 2026-06-21).', 'A bill that falls once a year is shown in its own month, never spread.'],
    grain: 'one figure per household per month',
    refusal: 'Shows $0 until expenses or debts are entered.',
    worked: {
      given: GIVEN,
      answer: '-$6,050/month',
      run: () => workedLineAmount('planned', 'Expenses') + workedLineAmount('planned', 'Mortgage') + workedLineAmount('planned', 'Car loan'),
    },
  },
  'MK-CF-M-049': {
    label: '= Planned surplus', unit: 'money', per: 'month', screens: ['/cashflow'],
    answers: 'What the plan leaves over this month, before anything has actually happened.',
    formula: 'planned surplus = expected inflow − planned outflow',
    inputs: ['MK-CF-M-047 expected inflow', 'MK-CF-M-048 planned outflow'],
    grain: 'one figure per household per month',
    refusal: 'Shows $0 until both sides are entered.',
    note: 'The Cash flow screen used to subtract this itself (rule 5). It is the door’s figure now.',
    worked: {
      given: GIVEN,
      answer: '$1,150/month',
      run: () => M().planned.surplus,
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
      answer: '-$2,400/month',
      run: () => workedLineAmount('planned', 'Mortgage'),
    },
  },
  'MK-CF-M-051': {
    label: 'Inflow', unit: 'money', per: 'month', screens: ['/cashflow', '/home'],
    answers: 'What has actually come in so far this month, as opposed to what the plan expected.',
    formula: 'inflow so far = Σ of the income recorded as received in this month up to today',
    inputs: ['MK-CF-I-015 income recorded as received'],
    decisions: ['Nothing is assumed to have arrived; a source counts only once it is recorded (founder, 2026-08-28).'],
    grain: 'one figure per household per month',
    refusal: 'Shows $0 until something is recorded as received.',
    note: 'The words beside it name what is inside it — "Inflow (income (take-home) + rent)" — his cluster 5 ruling of 2026-09-10.',
    worked: {
      given: GIVEN,
      answer: '$7,200/month',
      run: () => workedLineAmount('actual', 'Actual inflow'),
    },
  },
  'MK-CF-M-052': {
    label: 'Outflow (expenses + debt)', unit: 'money', per: 'month', screens: ['/cashflow', '/home'],
    answers: 'What has actually gone out so far this month: the expenses logged, plus the debt payments due in the month.',
    formula: 'outflow so far = expenses logged so far this month + Σ of the debt payments due this month',
    inputs: ['MK-CF-I-016 logged expense', 'MK-CF-I-013 debt payment'],
    decisions: ['Debt payments are counted in full for the month, logged or not, because they are committed.'],
    grain: 'one figure per household per month',
    refusal: 'Shows $0 until an expense is logged or a debt is entered.',
    worked: {
      given: GIVEN,
      answer: '-$3,248/month',
      run: () => workedLineAmount('actual', 'Actual expenses') + workedLineAmount('actual', 'Mortgage') + workedLineAmount('actual', 'Car loan'),
    },
  },
  'MK-CF-M-053': {
    label: '= Surplus', unit: 'money', per: 'month', screens: ['/cashflow', '/home'],
    answers: 'What is actually left this month so far — not what the plan said, what has happened.',
    formula: 'surplus so far = inflow so far − outflow so far',
    inputs: ['MK-CF-M-051 inflow so far', 'MK-CF-M-052 outflow so far'],
    grain: 'one figure per household per month',
    refusal: 'Shows $0 until something is recorded.',
    note: 'The Cash flow screen used to subtract this itself (rule 5). It is the door’s figure now.',
    worked: {
      given: GIVEN,
      answer: '$3,952/month',
      run: () => M().actual.surplus,
    },
  },
  'MK-CF-M-054': {
    label: 'each received line', unit: 'money', per: 'month', screens: ['/cashflow'],
    answers: 'Each payment recorded as received this month, named, so the inflow total can be checked by hand.',
    formula: 'one line per payment recorded as received in this month, at its amount',
    inputs: ['MK-CF-I-015 income recorded as received'],
    grain: 'one figure per payment',
    refusal: 'The list is replaced by the door to record income when nothing is recorded.',
    worked: {
      given: GIVEN,
      answer: '-$250/month',
      run: () => workedLineAmount('actual', 'Car loan'),
    },
  },
} as const);

/* ─ MK-CF-O-003 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * thisMonth
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     planned = planned month flow(m)
 *     actual = actual month flow(m)
 *
 * Called by ... MK-CF-O-010 theMonth · MK-CF-O-014 M
 *
 * Reaches ..... 68 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-005 actualMonthFlow
 *               MK-CF-F-012 annualCashflow · MK-CF-F-210 annualOfSource
 *               … and 50 more — the full list is on functions_from_code
 *
 * Serves ...... MK-CF-M-047 · MK-CF-M-048 · MK-CF-M-049 · MK-CF-M-050
 *               MK-CF-M-051 · MK-CF-M-052 · MK-CF-M-053 · MK-CF-M-054
 * Ruled by .... DEC-0002 · DEC-0199 · DEC-0512
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
