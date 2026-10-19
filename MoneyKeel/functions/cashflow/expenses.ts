// Cash flow · Expenses — recurring debt, the plan, what was actually spent, and the radar.
//
// THE RADAR WAS BACKWARDS. It flagged any bill over $500 from the dated grid, and debt payments
// join that grid as bills — so the MORTGAGE was flagged every single month, which teaches people
// to ignore the section. Meanwhile an unusual credit-card payment was tested against the mean of
// ALL logged "Debt payment" expenses — mortgage, car and card averaged together — so $1,850
// against a usual $195 was compared to a bar near $3,120 and stayed quiet. It showed the payment
// that never changes and hid the one that does. That is finding B28.
//
// [Founder 2026-08-27] Recurring debt is never a radar item. A credit card or HELOC payment
// always is. The split is one the data already makes: paymentShape gives installment, revolving
// or due_in_full, so nothing new has to be captured.
import { toNum } from '../../../src/domain/_shared/num';
import { requiredPayment, paymentShape, type Debt } from '../../../src/domain/debt';

import { inMonth, DEBT_CATEGORY, type LoggedExpense } from './logged-expenses';

export interface ExpensesInput {
  ym: string;
  debts: Debt[];
  plannedByCategory: { label: string; monthly: number }[];
  expenses: LoggedExpense[];
  bigBills?: { label: string; amount: number; dueLabel: string }[];   // dated non-debt bills
}



export const BIG_BILL_FLOOR = 500;

/** RECURRING DEBT PAYMENTS — the installment debts, one row each.
 *  The same every month, which is exactly why they are here and never in the radar. */
/* ─ MK-CF-F-149 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * recurringDebtPayments
 *
 * Answers ..... RECURRING DEBT PAYMENTS — the installment debts, one row each.
 *
 * Formula .....
 *     for each debt whose payment shape is 'installment' and whose required payment > 0: { label, monthly = required payment(debt) }
 *
 * Called by ... MK-CF-O-002 expenses
 *
 * Reaches ..... 186 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               … and 168 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-042 how a stream is paid — monthly, yearly or one lump
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-149
 * Changed ..... not in git yet (—)
 */
export function recurringDebtPayments(s: ExpensesInput): { label: string; monthly: number }[] {
  return (s.debts ?? [])
    .filter((d) => paymentShape(d) === 'installment')
    .map((d) => ({ label: d.label, monthly: (requiredPayment(d)) }))
    .filter((r) => r.monthly > 0);
}

/** DEBT PAYMENTS THAT ARE COUNTED AS EXPENSES — revolving and due-in-full.
 *
 *  A card payment counts as expenses only when the purchases behind it were NOT captured. Once a
 *  card is connected and its purchases arrive on their own, the payment stops being an expense and
 *  becomes a transfer — otherwise the same money is counted twice. `purchasesCaptured` carries
 *  which cards those are; until a card provider exists it is always empty. */
/* ─ MK-CF-F-150 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * debtPaymentsCountedAsExpenses
 *
 * Answers ..... DEBT PAYMENTS THAT ARE COUNTED AS EXPENSES — revolving and due-in-full.
 *
 * Formula .....
 *     out = []
 *     the answer = out
 *
 * Called by ... MK-CF-O-002 expenses
 *
 * Reaches ..... 186 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               … and 168 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *               MK-XS-I-042 how a stream is paid — monthly, yearly or one lump
 *
 * Decides .....
 *     · Uses a built-in s h o w f i r s t of 5.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-150
 * Changed ..... not in git yet (—)
 */
export function debtPaymentsCountedAsExpenses(
  s: ExpensesInput, purchasesCaptured: Set<string> = new Set(),
): { label: string; amount: number }[] {
  const out: { label: string; amount: number }[] = [];
  for (const d of s.debts ?? []) {
    if (paymentShape(d) === 'installment') continue;          // recurring debt is not an expense
    if (purchasesCaptured.has(String(d.debt_id))) continue;   // its purchases are the expense instead
    const paid = (s.expenses ?? [])
      .filter((e) => e.category === DEBT_CATEGORY && inMonth(e, s.ym)
                     && String(e.store ?? '').trim().toLowerCase() === String(d.label).trim().toLowerCase())
      .reduce((t, e) => t + toNum(e.amount), 0);
    // named as the drawing names it: "HELOC payment"; a debt already called "… payment" keeps its name
    if (paid > 0) out.push({ label: /payment$/i.test(String(d.label).trim()) ? d.label : `${d.label} payment`, amount: (paid) });
  }
  return out;
}

/** WHAT WAS ACTUALLY SPENT, listed. Debt payments are excluded — they have their own section.
 *  [Founder 2026-08-27] Five shown, the rest one tap away; the COUNT and TOTAL always visible. */
export interface SpentList { items: LoggedExpense[]; shown: LoggedExpense[]; hidden: number;
                             hiddenTotal: number; total: number; }
export const SHOW_FIRST = 5;

/** What was actually spent in a month, debt payments left out: every expense newest first, the five shown, how many more there are and the totals, for all of them or only those entered by hand or only those imported. */
/* ─ MK-CF-F-151 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * actualSpending
 *
 * Answers ..... What was actually spent in a month, debt payments left out: every expense newest first, the five shown, how many more there are and the totals, for all of them or only those entered by hand or only those imported.
 *
 * Formula .....
 *     shown = the first SHOW_FIRST of items
 *     total = Σ over items of (amount read as a number (0 when it is not one))
 *     shown total = Σ over shown of (amount read as a number (0 when it is not one))
 *
 * Called by ... MK-CF-O-002 expenses
 *
 * Reaches ..... 186 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               … and 168 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-151
 * Changed ..... not in git yet (—)
 */
export function actualSpending(s: ExpensesInput, origin?: 'by-hand' | 'imported'): SpentList {
  // BY WHERE IT CAME FROM (cash-flow_v01, frame C): what was typed in or photographed, and what a card
  // brought — two lists, each with its own five-then-the-rest and its own closing total, "so you can
  // see what the card brought in". With no origin asked for, it is every expense of the month.
  const items = (s.expenses ?? [])
    .filter((e) => inMonth(e, s.ym) && e.category !== DEBT_CATEGORY)
    .filter((e) => !origin || (origin === 'imported') === (e.origin === 'imported'))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const shown = items.slice(0, SHOW_FIRST);
  const total = (items.reduce((t, e) => t + toNum(e.amount), 0));
  const shownTotal = (shown.reduce((t, e) => t + toNum(e.amount), 0));
  return { items, shown, hidden: Math.max(0, items.length - shown.length),
           hiddenTotal: (total - shownTotal), total };
}

/** IS THIS A RADAR ITEM? The rule, in one place.
 *
 *  [Founder 2026-08-27] A credit-card or HELOC payment always is. Installment debt never is —
 *  a warning you see every month stops being a warning. A non-debt bill is when it is large. */
export type RadarReason = 'revolving-debt' | 'lump-debt' | 'big-bill';
export interface RadarItem { label: string; amount: number; reason: RadarReason;
                             countedAsExpense: boolean; note: string; }

/** Whether a debt belongs on the big-ticket radar: yes for a card or a credit line and for a debt due in one lump, no for a loan paid the same every month. */
/* ─ MK-CF-F-152 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * isRadarItem
 *
 * Answers ..... Whether a debt belongs on the big-ticket radar: yes for a card or a credit line and for a debt due in one lump, no for a loan paid the same every month.
 *
 * Formula .....
 *     shape = payment shape(d)
 *     nothing   when shape = 'installment'
 *     the answer:
 *     'lump − debt'   if shape = 'due_in_full'
 *     'revolving − debt'   otherwise
 *
 * Called by ... MK-CF-F-005 actualMonthFlow · MK-CF-F-153 radar
 *               MK-CF-F-156 plannedMonthFlow
 *
 * Reaches ..... 186 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               … and 168 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-042 how a stream is paid — monthly, yearly or one lump
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-152
 * Changed ..... not in git yet (—)
 */
export function isRadarItem(d: Debt): RadarReason | null {
  const shape = paymentShape(d);
  if (shape === 'installment') return null;
  return shape === 'due_in_full' ? 'lump-debt' : 'revolving-debt';
}

/** The big-ticket radar for a month: each card, credit-line or lump-sum debt payment and each large dated bill, with its amount and whether it is already counted as an expense. */
/* ─ MK-CF-F-153 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * radar
 *
 * Answers ..... The big-ticket radar for a month: each card, credit-line or lump-sum debt payment and each large dated bill, with its amount and whether it is already counted as an expense.
 *
 * Formula .....
 *     out = []
 *     reason = is radar item(d)
 *     amount = paid   if paid > 0
 *     required payment(d)   otherwise
 *     counted = !purchases captured.has(string(debt id))
 *     name = label   if ÷ payment$ ÷ test(string(label).trim())
 *     `${label} payment`   otherwise
 *     the answer = out
 *
 * Called by ... MK-CF-O-002 expenses
 *
 * Reaches ..... 186 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               … and 168 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-153
 * Changed ..... not in git yet (—)
 */
export function radar(s: ExpensesInput, purchasesCaptured: Set<string> = new Set()): RadarItem[] {
  const out: RadarItem[] = [];
  for (const d of s.debts ?? []) {
    const reason = isRadarItem(d);
    if (!reason) continue;
    const paid = (s.expenses ?? [])
      .filter((e) => e.category === DEBT_CATEGORY && inMonth(e, s.ym)
                     && String(e.store ?? '').trim().toLowerCase() === String(d.label).trim().toLowerCase())
      .reduce((t, e) => t + toNum(e.amount), 0);
    const amount = (paid > 0 ? paid : requiredPayment(d));
    if (amount <= 0) continue;
    const counted = !purchasesCaptured.has(String(d.debt_id));
    // EACH ITEM SAYS WHETHER IT IS COUNTED, in the drawing's words (cash-flow_v01, frame C) — "so nobody
    // adds it up twice in their head". A card whose purchases arrive on their own is not counted: the
    // purchases are the expense. A payment entered on the Debts tab is; for a card it adds why.
    const name = /payment$/i.test(String(d.label).trim()) ? d.label : `${d.label} payment`;
    out.push({ label: name, amount, reason, countedAsExpense: counted,
               note: !counted ? 'connected card · NOT counted as an expense — the purchases are'
                 : reason === 'revolving-debt' && d.debt_type === 'CREDIT_CARD'
                   ? 'entered on the Debts tab · counted as an expense — no receipts to match it to'
                   : 'entered on the Debts tab · counted as an expense' });
  }
  for (const b of (s.bigBills ?? [])) {
    if ((b.amount) >= BIG_BILL_FLOOR) {
      out.push({ label: b.label, amount: (b.amount), reason: 'big-bill',
                 countedAsExpense: true, note: `due ${b.dueLabel}` });
    }
  }
  return out;
}

/** ── ORCHESTRATOR ────────────────────────────────────────────────────────────────────────────
 *  WHAT DOES THIS PERSON SPEND? The Expenses tab calls THIS and nothing else. */
export interface Expenses {
  recurringDebt: { label: string; monthly: number }[];
  recurringDebtTotal: number;
  planned: { label: string; monthly: number }[];
  plannedTotal: number;
  actual: SpentList;
  /** The same expenses, apart: what was entered by hand, and what a card or a file brought. */
  byHand: SpentList;
  imported: SpentList;
  debtCountedAsExpense: { label: string; amount: number }[];
  actualTotal: number;
  radar: RadarItem[];
}

/** What is being spent this month: the debts that repeat every month, the planned expenses by category, what was actually spent by where it came from, and the big-ticket radar? */
/* ─ MK-CF-O-002 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * expenses
 *
 * Answers ..... What is being spent this month: the debts that repeat every month, the planned expenses by category, what was actually spent by where it came from, and the big-ticket radar?
 *
 * Formula .....
 *     rec = recurring debt payments(s)
 *     act = actual expenses(s)
 *     debt exp = debt payments counted as expenses(s, purchases captured)
 *
 * Called by ... MK-CF-F-044 annualNet · MK-CF-F-067 rentalList
 *               MK-CF-F-068 rentalNetAnnual · MK-CF-F-079 incomeFromOnboarding
 *               MK-CF-F-153 radar · MK-CF-F-190 essentialsMonthly
 *               MK-CF-O-010 theMonth · MK-NW-F-115 liveRent
 *               MK-PL-F-040 targetAtRetirement · MK-PL-F-049 retirementSpendMonthly
 *               MK-PL-F-050 simulate · MK-PL-F-065 volOf
 *               MK-PL-F-067 willItLastInputs · MK-XS-F-004 buildDatedGrid
 *               MK-XS-F-057 analyzeExpenses · MK-XS-F-176 useMonthlyStats
 *               MK-XS-F-177 useCategorySpend
 *
 * Reaches ..... 186 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               … and 168 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-002
 * Changed ..... not in git yet (—)
 */
export function expenses(s: ExpensesInput, purchasesCaptured: Set<string> = new Set()): Expenses {
  const rec = recurringDebtPayments(s);
  const act = actualSpending(s);
  const debtExp = debtPaymentsCountedAsExpenses(s, purchasesCaptured);
  return {
    recurringDebt: rec,
    recurringDebtTotal: (rec.reduce((t, r) => t + r.monthly, 0)),
    planned: s.plannedByCategory ?? [],
    plannedTotal: ((s.plannedByCategory ?? []).reduce((t, c) => t + c.monthly, 0)),
    actual: act,
    byHand: actualSpending(s, 'by-hand'),
    imported: actualSpending(s, 'imported'),
    debtCountedAsExpense: debtExp,
    actualTotal: (act.total + debtExp.reduce((t, d) => t + d.amount, 0)),
    radar: radar(s, purchasesCaptured),
  };
}
