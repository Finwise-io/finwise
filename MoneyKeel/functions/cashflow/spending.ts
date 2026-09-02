// Cash flow · Spending — recurring debt, the plan, what was actually spent, and the radar.
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
import { toNum, round2 } from '../../../src/domain/_shared/num';
import { requiredPayment, paymentShape, type Debt } from '../../../src/domain/debt';

import { inMonth, DEBT_CATEGORY, type LoggedExpense } from './logged-expenses';

export interface SpendingInput {
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
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-CF-O-002 spending
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-O-002 spending
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-042 how a stream is paid — monthly, yearly or one lump
 *
 * Decides .....
 *     · Leaves some rows out of the answer — check which.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-149
 * Changed ..... not in git yet (—)
 */
export function recurringDebtPayments(s: SpendingInput): { label: string; monthly: number }[] {
  return (s.debts ?? [])
    .filter((d) => paymentShape(d) === 'installment')
    .map((d) => ({ label: d.label, monthly: round2(requiredPayment(d)) }))
    .filter((r) => r.monthly > 0);
}

/** DEBT PAYMENTS THAT ARE COUNTED AS EXPENSES — revolving and due-in-full.
 *
 *  A card payment counts as spending only when the purchases behind it were NOT captured. Once a
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
 * Called by ... MK-CF-O-002 spending
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-O-002 spending
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged spending
 *               MK-XS-I-042 how a stream is paid — monthly, yearly or one lump
 *
 * Decides .....
 *     · Uses a built-in s h o w f i r s t of 5.
 *     · Leaves some rows out of the answer — check which.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-150
 * Changed ..... not in git yet (—)
 */
export function debtPaymentsCountedAsExpenses(
  s: SpendingInput, purchasesCaptured: Set<string> = new Set(),
): { label: string; amount: number }[] {
  const out: { label: string; amount: number }[] = [];
  for (const d of s.debts ?? []) {
    if (paymentShape(d) === 'installment') continue;          // recurring debt is not an expense
    if (purchasesCaptured.has(String(d.debt_id))) continue;   // its purchases are the expense instead
    const paid = (s.expenses ?? [])
      .filter((e) => e.category === DEBT_CATEGORY && inMonth(e, s.ym)
                     && String(e.store ?? '').trim().toLowerCase() === String(d.label).trim().toLowerCase())
      .reduce((t, e) => t + toNum(e.amount), 0);
    if (paid > 0) out.push({ label: d.label, amount: round2(paid) });
  }
  return out;
}

/** WHAT WAS ACTUALLY SPENT, listed. Debt payments are excluded — they have their own section.
 *  [Founder 2026-08-27] Five shown, the rest one tap away; the COUNT and TOTAL always visible. */
export interface SpentList { items: LoggedExpense[]; shown: LoggedExpense[]; hidden: number;
                             hiddenTotal: number; total: number; }
export const SHOW_FIRST = 5;

/* ─ MK-CF-F-151 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * actualSpending
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     shown = the first SHOW_FIRST of items
 *     total = round(Σ over items of (amount read as a number (0 when it is not one)), 2 dp)
 *     shown total = round(Σ over shown of (amount read as a number (0 when it is not one)), 2 dp)
 *
 * Called by ... MK-CF-O-002 spending
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-O-002 spending
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged spending
 *
 * Decides .....
 *     · Leaves some rows out of the answer — check which.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-151
 * Changed ..... not in git yet (—)
 */
export function actualSpending(s: SpendingInput): SpentList {
  const items = (s.expenses ?? [])
    .filter((e) => inMonth(e, s.ym) && e.category !== DEBT_CATEGORY)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const shown = items.slice(0, SHOW_FIRST);
  const total = round2(items.reduce((t, e) => t + toNum(e.amount), 0));
  const shownTotal = round2(shown.reduce((t, e) => t + toNum(e.amount), 0));
  return { items, shown, hidden: Math.max(0, items.length - shown.length),
           hiddenTotal: round2(total - shownTotal), total };
}

/** IS THIS A RADAR ITEM? The rule, in one place.
 *
 *  [Founder 2026-08-27] A credit-card or HELOC payment always is. Installment debt never is —
 *  a warning you see every month stops being a warning. A non-debt bill is when it is large. */
export type RadarReason = 'revolving-debt' | 'lump-debt' | 'big-bill';
export interface RadarItem { label: string; amount: number; reason: RadarReason;
                             countedAsExpense: boolean; note: string; }

/* ─ MK-CF-F-152 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * isRadarItem
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     shape = payment shape(d)
 *     nothing   when shape = 'installment'
 *     the answer:
 *     'lump − debt'   if shape = 'due_in_full'
 *     'revolving − debt'   otherwise
 *
 * Called by ... MK-CF-F-153 radar
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-153 radar · MK-CF-O-002 spending
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

/* ─ MK-CF-F-153 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * radar
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     out = []
 *     reason = is radar item(d)
 *     amount = round(paid   if paid > 0
 *     required payment(d)   otherwise, 2 dp)
 *     counted = !purchases captured.has(string(debt id))
 *     the answer = out
 *
 * Called by ... MK-CF-O-002 spending
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-O-002 spending
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged spending
 *
 * Decides .....
 *     · Leaves some rows out of the answer — check which.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-153
 * Changed ..... not in git yet (—)
 */
export function radar(s: SpendingInput, purchasesCaptured: Set<string> = new Set()): RadarItem[] {
  const out: RadarItem[] = [];
  for (const d of s.debts ?? []) {
    const reason = isRadarItem(d);
    if (!reason) continue;
    const paid = (s.expenses ?? [])
      .filter((e) => e.category === DEBT_CATEGORY && inMonth(e, s.ym)
                     && String(e.store ?? '').trim().toLowerCase() === String(d.label).trim().toLowerCase())
      .reduce((t, e) => t + toNum(e.amount), 0);
    const amount = round2(paid > 0 ? paid : requiredPayment(d));
    if (amount <= 0) continue;
    const counted = !purchasesCaptured.has(String(d.debt_id));
    out.push({ label: d.label, amount, reason, countedAsExpense: counted,
               note: counted ? 'counted as an expense — no purchases to match it to'
                             : 'NOT counted as an expense — the imported purchases are' });
  }
  for (const b of (s.bigBills ?? [])) {
    if (round2(b.amount) >= BIG_BILL_FLOOR) {
      out.push({ label: b.label, amount: round2(b.amount), reason: 'big-bill',
                 countedAsExpense: true, note: `due ${b.dueLabel}` });
    }
  }
  return out;
}

/** ── ORCHESTRATOR ────────────────────────────────────────────────────────────────────────────
 *  WHAT DOES THIS PERSON SPEND? The Spending tab calls THIS and nothing else. */
export interface Spending {
  recurringDebt: { label: string; monthly: number }[];
  recurringDebtTotal: number;
  planned: { label: string; monthly: number }[];
  plannedTotal: number;
  actual: SpentList;
  debtCountedAsExpense: { label: string; amount: number }[];
  actualTotal: number;
  radar: RadarItem[];
}

/* ─ MK-CF-O-002 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * spending
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     rec = recurring debt payments(s)
 *     act = actual spending(s)
 *     debt exp = debt payments counted as expenses(s, purchases captured)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-002
 * Changed ..... not in git yet (—)
 */
export function spending(s: SpendingInput, purchasesCaptured: Set<string> = new Set()): Spending {
  const rec = recurringDebtPayments(s);
  const act = actualSpending(s);
  const debtExp = debtPaymentsCountedAsExpenses(s, purchasesCaptured);
  return {
    recurringDebt: rec,
    recurringDebtTotal: round2(rec.reduce((t, r) => t + r.monthly, 0)),
    planned: s.plannedByCategory ?? [],
    plannedTotal: round2((s.plannedByCategory ?? []).reduce((t, c) => t + c.monthly, 0)),
    actual: act,
    debtCountedAsExpense: debtExp,
    actualTotal: round2(act.total + debtExp.reduce((t, d) => t + d.amount, 0)),
    radar: radar(s, purchasesCaptured),
  };
}
