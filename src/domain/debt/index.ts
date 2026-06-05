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
