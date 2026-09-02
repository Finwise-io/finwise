// Cash flow · This month — the plan, and what has actually happened.
//
// TWO BLOCKS THAT NEVER SHARE A ROW. Planned is what you said would happen; actual is what did.
// Mixing them is what produced "Out (bills + debt) $8,321" sitting four rows above "Spent $45 of
// $0 planned" — two definitions of the word planned on one card, differing by the whole amount.
// That is finding B26.
//
// THE RULE THIS FILE OBEYS: every row shown is a row deducted. Nothing appears in either block
// without being in its sum. The founder's own sheet had HELOC and a card payment listed but not
// subtracted, which is how its surpluses read 750 and 1,300 instead of 350 and 900.
import { toNum, round2 } from '../../../src/domain/_shared/num';
import { requiredPayment, paymentShape, type Debt } from '../../../src/domain/debt';
import { inMonth, DEBT_CATEGORY, type LoggedExpense } from './logged-expenses';



export interface MonthInput {
  ym: string;                    // 'YYYY-MM' — the month being shown
  takeHomeMonthly: number;       // from basePay — the take-home
  debts: Debt[];
  plannedExpenses: number;       // from plannedMonthlySpend — the ONE canonical planned figure
  expenses: LoggedExpense[];     // everything logged, debt payments included
}

export interface Line { label: string; amount: number; kind: 'in' | 'debt' | 'spend'; paid?: boolean; note?: string; }
export interface MonthBlock { lines: Line[]; surplus: number; }



/** Negating zero in JavaScript gives NEGATIVE zero, which formats as "−$0" — and a person looking
 *  at "−$0" beside an unpaid car loan reasonably wonders what it means. Zero has no sign. */
/* ─ MK-CF-F-155 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * cash
 *
 * Answers ..... Negating zero in JavaScript gives NEGATIVE zero, which formats as "−$0" — and a person looking at "−$0" beside an unpaid car loan reasonably wonders what it means.
 *
 * Formula .....
 *     0   if n = 0
 *     round(n, 2 dp)   otherwise
 *
 * Called by ... MK-CF-F-005 actualMonthFlow · MK-CF-F-156 plannedMonthFlow
 *               MK-HM-F-006 money0 · MK-NW-F-008 incomeBearingClassOf
 *               MK-PL-F-022 goalProgressPct
 *
 * Reaches ..... 47 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-005 accountAllowsTicker · MK-NW-F-027 accountClassBreakdown
 *               MK-CF-F-005 actualMonthFlow · MK-NW-F-002 alternativesSummary
 *               MK-NW-F-019 alternativesTotal · MK-NW-F-029 assetAllocation
 *               MK-NW-F-011 assetClassOf · MK-NW-F-007 assetKind
 *               MK-CF-O-001 basePay · MK-NW-F-036 benchmarkInfo
 *               MK-NW-F-034 benchmarkReturn · MK-NW-F-037 blendedReturn
 *               MK-NW-F-035 blendedVolatility · MK-CF-F-107 buildPaycheckYear
 *               MK-XS-F-031 buildSnapshot · MK-NW-F-016 cashTotal
 *               MK-PL-F-077 clamp · MK-NW-F-053 correctClassOf
 *               … and 29 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-155
 * Changed ..... not in git yet (—)
 */
const cash = (n: number): number => (n === 0 ? 0 : round2(n));


/** THE PLAN for this month: the take-home, less each debt, less planned spending.
 *
 *  Each debt is its own line — never lumped into "bills + debt". A person chasing a wrong figure
 *  can see which debt it came from without opening another screen. */
/* ─ MK-CF-F-156 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * plannedMonthFlow
 *
 * Answers ..... THE PLAN for this month: the take-home, less each debt, less planned spending.
 *
 * Formula .....
 *     lines = [{ label: 'in (take − home)', amount: round2(take home monthly), kind: 'in' }]
 *     due = round(required payment(d), 2 dp)
 *     the answer:
 *     lines = lines
 *     surplus = cash(lines.reduce((t, l) => t + amount, 0))
 *
 * Called by ... MK-CF-O-003 thisMonth
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-O-003 thisMonth
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-156
 * Changed ..... not in git yet (—)
 */
export function plannedMonthFlow(m: MonthInput): MonthBlock {
  const lines: Line[] = [{ label: 'In (take-home)', amount: round2(m.takeHomeMonthly), kind: 'in' }];
  for (const d of m.debts ?? []) {
    const due = round2(requiredPayment(d));
    if (due > 0) lines.push({ label: d.label, amount: cash(-due), kind: 'debt' });
  }
  lines.push({ label: 'Expenses', amount: cash(-m.plannedExpenses), kind: 'spend',
               note: 'from your spending plan' });
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
 *     lines = [{ label: 'in (take − home) received', amount: round2(take home monthly), kind: 'in' }]
 *     paid = round(paid for.get(debt id) (or 0 when missing), 2 dp)
 *     matched = Σ over [...paid for.values()] of (each)
 *     unmatched = round(all debt paid − matched, 2 dp)
 *     spending = logged where category ! = DEBT_CATEGORY
 *     spent = round(Σ over spending of (amount read as a number (0 when it is not one)), 2 dp)
 *     the answer:
 *     lines = lines
 *     surplus = cash(lines.reduce((t, l) => t + amount, 0))
 *
 * Called by ... MK-CF-O-003 thisMonth
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-O-003 thisMonth
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged spending
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · Leaves some rows out of the answer — check which.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-005
 * Changed ..... not in git yet (—)
 */
export function actualMonthFlow(m: MonthInput): MonthBlock {
  const logged = (m.expenses ?? []).filter((e) => inMonth(e, m.ym));
  const paidFor = debtPaymentsByDebt(m);
  const lines: Line[] = [{ label: 'In (take-home) received', amount: round2(m.takeHomeMonthly), kind: 'in' }];
  for (const d of m.debts ?? []) {
    if (round2(requiredPayment(d)) <= 0) continue;
    const paid = round2(paidFor.get(d.debt_id) ?? 0);
    lines.push({ label: d.label, amount: cash(-paid), kind: 'debt', paid: paid > 0,
                 note: paid > 0 ? 'paid' : 'not paid yet' });
  }
  // A logged debt payment whose label matches no debt we hold. The money still left the bank, so it
  // must still be deducted — dropping it was a real leak: this function replaced MK-CF-F-005, which
  // totalled EVERY logged debt payment, and without this line a person who deleted a paid-off debt
  // would have seen their surplus rise by the amount they had just paid.
  const matched = [...paidFor.values()].reduce((t, v) => t + v, 0);
  const allDebtPaid = round2(logged.filter((e) => e.category === DEBT_CATEGORY)
                                   .reduce((t, e) => t + toNum(e.amount), 0));
  const unmatched = round2(allDebtPaid - matched);
  if (unmatched > 0) {
    lines.push({ label: 'Other debt payments', amount: cash(-unmatched), kind: 'debt', paid: true,
                 note: 'logged, but not against a debt you still hold' });
  }
  const spending = logged.filter((e) => e.category !== DEBT_CATEGORY);
  const spent = round2(spending.reduce((t, e) => t + toNum(e.amount), 0));
  lines.push({ label: 'Spent so far', amount: cash(-spent), kind: 'spend',
               note: `${spending.length} logged` });
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
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-005 actualMonthFlow · MK-CF-O-003 thisMonth
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged spending
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
    out.set(id, round2((out.get(id) ?? 0) + toNum(e.amount)));
  }
  return out;
}

/** ── ORCHESTRATOR ────────────────────────────────────────────────────────────────────────────
 *  WHAT DOES THIS MONTH LOOK LIKE? The This month tab calls THIS and nothing else.
 *
 *  It does no arithmetic of its own. Both blocks come back together so the screen cannot show one
 *  without the other, and cannot build "planned" from a different source than the row beneath it. */
export interface ThisMonth { planned: MonthBlock; actual: MonthBlock; }

/* ─ MK-CF-O-003 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * thisMonth
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     planned = planned month flow(m)
 *     actual = actual month flow(m)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-003
 * Changed ..... not in git yet (—)
 */
export function thisMonth(m: MonthInput): ThisMonth {
  return { planned: plannedMonthFlow(m), actual: actualMonthFlow(m) };
}

/** Is this debt one that repeats unchanged every month? Installment debt is; revolving is not.
 *  Exported here because both this file and Spending need the same answer. */
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
