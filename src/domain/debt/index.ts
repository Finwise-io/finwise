// Debt & Liability module (spec service 3). Owns `debts/{uid}`.
import type { UserId, EntityId } from '../_shared/ids';
import { newEntityId } from '../_shared/ids';
import { toNum, round2 } from '../_shared/num';
import { getUserDoc, setUserDoc } from '../_shared/firestore';
import { emit } from '../_shared/eventBus';

export type DebtType = 'MORTGAGE' | 'CREDIT_CARD' | 'STUDENT_LOAN' | 'AUTO' | 'PERSONAL' | 'OTHER';

export interface Debt {
  debt_id: EntityId;
  label: string;                   // account name, e.g. "Chase Sapphire"
  institution?: string;
  debt_type: DebtType;
  remaining_balance: number;
  interest_rate_apr: number;       // decimal
  minimum_monthly_payment: number;
  monthly_payment?: number;        // what you actually pay each month (≥ minimum); defaults to minimum
  due_day?: number;                // day of month the payment is due (1–31)
}

/** The payment reserved/required each month for a debt (planned payment, else the minimum). */
export function requiredPayment(d: Debt): number {
  return Math.max(d.minimum_monthly_payment, d.monthly_payment ?? 0) || d.minimum_monthly_payment;
}
/** Total monthly debt obligation across all debts. */
export function totalDebtMonthly(debts: Debt[]): number {
  return debts.reduce((t, d) => t + requiredPayment(d), 0);
}

// ── Debt-payoff plan (avalanche = highest APR first; snowball = smallest balance first) ──
export type PayoffMethod = 'avalanche' | 'snowball';
export interface PayoffResult {
  months: number;                 // months to debt-free (0 = already free)
  totalInterest: number;          // interest paid over the plan
  neverPaysOff: boolean;          // payments can't cover interest
  order: { debt_id: EntityId; label: string; payoffMonth: number; interestPaid: number }[];
}
/** Simulate paying off debts with a constant monthly budget (sum of minimums + extra), rolling each
 *  cleared debt's freed-up payment into the next per the chosen method. */
export function payoffPlan(debts: Debt[], extraMonthly: number, method: PayoffMethod = 'avalanche'): PayoffResult {
  const live = (debts ?? []).filter((d) => d.remaining_balance > 0)
    .map((d) => ({ id: d.debt_id, label: d.label, bal: d.remaining_balance, apr: d.interest_rate_apr, min: d.minimum_monthly_payment, interest: 0, payoffMonth: 0 }));
  if (!live.length) return { months: 0, totalInterest: 0, neverPaysOff: false, order: [] };
  const budget = live.reduce((t, d) => t + d.min, 0) + Math.max(0, extraMonthly);
  const cleared: typeof live = [];
  let month = 0;
  while (live.some((d) => d.bal > 0) && month < 600) {
    month++;
    for (const d of live) { const i = (d.bal * d.apr) / 12; d.bal += i; d.interest += i; }            // accrue interest
    let pool = budget;
    for (const d of live) { const pay = Math.min(d.min, d.bal, pool); d.bal -= pay; pool -= pay; }     // pay minimums
    const priority = [...live].filter((d) => d.bal > 0).sort((a, b) => (method === 'avalanche' ? b.apr - a.apr : a.bal - b.bal));
    for (const d of priority) { if (pool <= 0) break; const pay = Math.min(pool, d.bal); d.bal -= pay; pool -= pay; }   // extra to priority
    for (let j = live.length - 1; j >= 0; j--) { if (live[j].bal <= 0.01) { live[j].payoffMonth = month; cleared.push(live[j]); live.splice(j, 1); } }
  }
  const neverPaysOff = live.length > 0;
  const all = [...cleared, ...live];
  return {
    months: neverPaysOff ? 600 : month,
    totalInterest: round2(all.reduce((t, d) => t + d.interest, 0)),
    neverPaysOff,
    order: cleared.sort((a, b) => a.payoffMonth - b.payoffMonth).map((d) => ({ debt_id: d.id, label: d.label, payoffMonth: d.payoffMonth, interestPaid: round2(d.interest) })),
  };
}

// Capture types for debts (id maps to DebtType).
export const DEBT_KINDS: { id: DebtType; label: string; icon: string }[] = [
  { id: 'MORTGAGE', label: 'Mortgage', icon: '🏠' },
  { id: 'STUDENT_LOAN', label: 'Student loan', icon: '🎓' },
  { id: 'CREDIT_CARD', label: 'Credit card', icon: '💳' },
  { id: 'AUTO', label: 'Auto loan', icon: '🚗' },
  { id: 'PERSONAL', label: 'Personal loan', icon: '🧾' },
  { id: 'OTHER', label: 'Other', icon: '📦' },
];
export function debtKind(id?: string) { return DEBT_KINDS.find((k) => k.id === id); }
export interface DebtDoc { user_id: UserId; debts: Debt[]; last_updated?: any; }

export interface DebtState {
  user_id: UserId;
  total_debt_balance: number;
  total_monthly_debt_service: number;
  debts: Debt[];
  highest_rate_debt: Debt | null;   // the "pay this first" (avalanche) target
  toxic_debt_balance: number;       // balances above ~7% APR
}

const TOXIC_APR = 0.07;

export function buildDebtState(uid: UserId, debts: Debt[]): DebtState {
  const total = debts.reduce((t, d) => t + d.remaining_balance, 0);
  const service = debts.reduce((t, d) => t + d.minimum_monthly_payment, 0);
  const highest = debts.length ? debts.reduce((m, d) => (d.interest_rate_apr > m.interest_rate_apr ? d : m)) : null;
  const toxic = debts.filter((d) => d.interest_rate_apr > TOXIC_APR).reduce((t, d) => t + d.remaining_balance, 0);
  return {
    user_id: uid, total_debt_balance: round2(total), total_monthly_debt_service: round2(service),
    debts, highest_rate_debt: highest, toxic_debt_balance: round2(toxic),
  };
}

export function debtsFromOnboarding(uid: UserId, op: Record<string, any> | null): DebtDoc {
  const a = op ?? {};
  const debts: Debt[] = [];
  const bal = toNum(a.debtBalance);
  if (bal > 0) {
    debts.push({
      debt_id: newEntityId('debt'), label: (a.debtName ?? 'Debt') || 'Debt', debt_type: 'OTHER',
      remaining_balance: bal, interest_rate_apr: toNum(a.debtRate) / 100, minimum_monthly_payment: toNum(a.debtPayment),
    });
  }
  return { user_id: uid, debts };
}

const COLLECTION = 'debts';
export const DEBT_UPDATED = 'DebtUpdated';
export async function loadDebt(uid: UserId) { return getUserDoc<DebtDoc>(COLLECTION, uid); }
export async function saveDebt(d: DebtDoc) { await setUserDoc(COLLECTION, d.user_id, d); emit(DEBT_UPDATED, { user_id: d.user_id }); }
export async function getDebtState(uid: UserId) {
  const d = await loadDebt(uid); return d ? buildDebtState(uid, d.debts ?? []) : null;
}
