// Debt & Liability module (spec service 3). Owns `debts/{uid}`.
import type { UserId, EntityId } from '../_shared/ids';
import { newEntityId } from '../_shared/ids';
import { toNum, round2 } from '../_shared/num';
import { getUserDoc, setUserDoc } from '../_shared/firestore';
import { emit } from '../_shared/eventBus';

export type DebtType = 'MORTGAGE' | 'HELOC' | 'CREDIT_CARD' | 'STUDENT_LOAN' | 'AUTO' | 'PERSONAL' | 'MEDICAL' | 'OTHER';

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
  first_payment_date?: string;     // 'YYYY-MM-DD' — payments START here (deferred/future-start loans);
                                   // absent = already paying. Interest accrues from now either way (F2).
  // #17 / Term #9 / B47 finding 11 — payment shape (drives DTI bucket + how cash flow shows it):
  payoff_date?: string;            // 'YYYY-MM-DD' final payoff / loan maturity (term loans);
                                   // for due_in_full this IS the due date of the lump sum
  payment_frequency?: 'monthly' | 'annual';     // default monthly
  payment_type?: 'installment' | 'revolving' | 'due_in_full';   // fixed loan payment vs revolving
                                   // minimum (cards) vs one lump sum on a date; defaults by debt_type
  origin?: 'onboarding';           // seeded from onboarding answers; re-seeding replaces ONLY these
                                   // rows (absent = user-created, never touched by seeding/restart)
}

/** B47 finding 11 — a debt's repayment SHAPE. Cards/lines revolve (a minimum that floats with the
 *  balance); everything else is an installment loan (a real fixed payment + an end date) unless the
 *  user says it's due in full on a date. One function so every editor defaults the same way. */
export function defaultPaymentType(t: DebtType): NonNullable<Debt['payment_type']> {
  return t === 'CREDIT_CARD' || t === 'HELOC' ? 'revolving' : 'installment';
}
export function paymentShape(d: Debt): NonNullable<Debt['payment_type']> {
  return d.payment_type ?? defaultPaymentType(d.debt_type);
}

/** The payment reserved/required each month for a debt (planned payment, else the minimum).
 *  Due-in-full debts have NO monthly payment — they are a dated lump, not a monthly outflow. */
export function requiredPayment(d: Debt): number {
  if (paymentShape(d) === 'due_in_full') return 0;
  return Math.max(d.minimum_monthly_payment, d.monthly_payment ?? 0) || d.minimum_monthly_payment;
}
/** Total monthly debt obligation across all debts (override-aware). */
export function totalDebtMonthly(debts: Debt[]): number {
  return debts.reduce((t, d) => t + requiredPayment(d), 0);
}

// Term #9 — TWO clearly-named monthly-debt numbers (they're different concepts, not a bug to pick one):
/** Σ MINIMUM required payments — the contractual obligation. Use for DEBT-TO-INCOME (DTI). */
export function minimumDebtService(debts: Debt[]): number {
  return round2((debts ?? []).reduce((t, d) => t + (paymentShape(d) === 'due_in_full' ? 0 : d.minimum_monthly_payment || 0), 0));
}
/** Σ ACTUAL payments (override ≥ minimum) — what actually leaves your account. Use for CASH FLOW. */
export function actualDebtPayment(debts: Debt[]): number {
  return round2(totalDebtMonthly(debts ?? []));
}
/** Σ outstanding debt BALANCE — what you still owe (not a monthly payment). The one canonical
 *  "total debt" so net worth, the debt screen, and insurance can't show different totals. */
export function totalDebtBalance(debts: Debt[]): number {
  return round2((debts ?? []).reduce((t, d) => t + (d.remaining_balance || 0), 0));
}

// ── Loan repayment (standard amortization) — e.g. what a student loan costs once you're repaying ──
export interface LoanPlan { monthly: number; totalInterest: number; totalPaid: number; }
/** UNIT LANDMINE (P0): `aprPct` is a PERCENT (7 = 7%), unlike Debt.interest_rate_apr which is a
 *  DECIMAL (0.07). Passing a decimal here silently computes a ~100× lower rate. The dev-time guard
 *  below flags decimal-looking inputs; term-loan rates genuinely under 1%/yr don't occur in our
 *  flows (0% promos pass 0, which is fine). */
export function loanPayment(principal: number, aprPct: number, termYears: number): LoanPlan {
  const dev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
  if (dev && aprPct > 0 && aprPct < 1) {
    console.warn(`loanPayment: aprPct=${aprPct} looks like a DECIMAL rate — this parameter is a percent (7 = 7%). Multiply by 100.`);
  }
  const n = Math.round(termYears * 12), r = aprPct / 100 / 12;
  if (principal <= 0 || n <= 0) return { monthly: 0, totalInterest: 0, totalPaid: 0 };
  const monthly = r > 0 ? (principal * r) / (1 - Math.pow(1 + r, -n)) : principal / n;
  const totalPaid = monthly * n;
  return { monthly: round2(monthly), totalInterest: round2(totalPaid - principal), totalPaid: round2(totalPaid) };
}

// ── B47 finding 11: the installment two-way math — enter the payment OR the end date, the app
// computes the other. Both use Debt's DECIMAL rate (0.0625 = 6.25%), unlike loanPayment's percent.
/** Months to clear `principal` paying `payment`/month at decimal APR. null = never (payment ≤ interest). */
export function monthsToClear(principal: number, aprDecimal: number, payment: number): number | null {
  if (principal <= 0) return 0;
  if (payment <= 0) return null;
  const r = aprDecimal / 12;
  if (r <= 0) return Math.ceil(principal / payment);
  if (payment <= principal * r) return null;                       // covers interest only — never clears
  return Math.ceil(Math.log(payment / (payment - principal * r)) / Math.log(1 + r));
}
/** Monthly payment that clears `principal` in `months` at decimal APR (amortization).
 *  Rounded UP to the next cent — the stated payment must actually meet the stated date. */
export function paymentToClearBy(principal: number, aprDecimal: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = aprDecimal / 12;
  const monthly = r > 0 ? (principal * r) / (1 - Math.pow(1 + r, -months)) : principal / months;
  return Math.ceil(monthly * 100) / 100;
}

// ── Credit health — utilization (balance ÷ limit) + score band ──
export interface CreditUtil { ratio: number; status: 'good' | 'caution' | 'high'; }
export function creditUtilization(balance: number, limit: number): CreditUtil {
  const ratio = limit > 0 ? balance / limit : 0;
  const status: CreditUtil['status'] = ratio <= 0.30 ? 'good' : ratio <= 0.50 ? 'caution' : 'high';
  return { ratio: Math.round(ratio * 1000) / 1000, status };
}
export function creditScoreBand(score: number): { label: string; good: boolean } {
  if (score >= 800) return { label: 'Excellent', good: true };
  if (score >= 740) return { label: 'Very good', good: true };
  if (score >= 670) return { label: 'Good', good: true };
  if (score >= 580) return { label: 'Fair', good: false };
  return { label: 'Poor', good: false };
}

// ── Debt-to-income ratio (CFPB) — how much of your gross income goes to debt payments ──
export interface DTI { ratio: number; monthlyDebt: number; grossMonthly: number; guideline: number; status: 'good' | 'caution' | 'high'; }
export function debtToIncome(monthlyDebt: number, grossMonthly: number, homeowner = false): DTI {
  const ratio = grossMonthly > 0 ? monthlyDebt / grossMonthly : 0;
  const guideline = homeowner ? 0.36 : 0.20;   // CFPB: renters 15–20%, homeowners ≤36% (incl. mortgage)
  const status: DTI['status'] = ratio <= guideline ? 'good' : ratio <= guideline * 1.4 ? 'caution' : 'high';
  return { ratio: Math.round(ratio * 1000) / 1000, monthlyDebt: round2(monthlyDebt), grossMonthly: round2(grossMonthly), guideline, status };
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
export function payoffPlan(debts: Debt[], extraMonthly: number, method: PayoffMethod = 'avalanche', now: Date = new Date()): PayoffResult {
  // B47 finding 11 — due-in-full debts are NOT part of the monthly-budget simulation (a $15k lump
  // isn't paid from the monthly debt budget; it's a dated big-ticket the cash-flow grid schedules).
  // They still count toward "debt-free by": cleared in their due month, interest accrued until then.
  const lumps = (debts ?? []).filter((d) => d.remaining_balance > 0 && paymentShape(d) === 'due_in_full')
    .map((d) => {
      const m = d.payoff_date?.match(/^(\d{4})-(\d{2})/);
      const dueMonth = m ? Math.max(1, (+m[1] * 12 + (+m[2] - 1)) - (now.getFullYear() * 12 + now.getMonth())) : 1;
      const interest = d.remaining_balance * (Math.pow(1 + d.interest_rate_apr / 12, dueMonth) - 1);
      return { debt_id: d.debt_id, label: d.label, payoffMonth: dueMonth, interestPaid: round2(interest) };
    });
  const live = (debts ?? []).filter((d) => d.remaining_balance > 0 && paymentShape(d) !== 'due_in_full')
    .map((d) => {
      // deferred loans (first_payment_date in the future): interest accrues from now, but no
      // payment leaves until that month (founder review F2 #17 — a loan due in 3 years is real)
      const fm = d.first_payment_date?.match(/^(\d{4})-(\d{2})/);
      const startAfter = fm ? Math.max(0, (+fm[1] * 12 + (+fm[2] - 1)) - (now.getFullYear() * 12 + now.getMonth())) : 0;
      return { id: d.debt_id, label: d.label, bal: d.remaining_balance, apr: d.interest_rate_apr, min: d.minimum_monthly_payment, interest: 0, payoffMonth: 0, startAfter };
    });
  const lumpMonths = lumps.reduce((m, l) => Math.max(m, l.payoffMonth), 0);
  const lumpInterest = round2(lumps.reduce((t, l) => t + l.interestPaid, 0));
  if (!live.length) return { months: lumpMonths, totalInterest: lumpInterest, neverPaysOff: false, order: lumps.sort((a, b) => a.payoffMonth - b.payoffMonth) };
  // budget grows as deferred debts come due (their minimum joins when payments start)
  const budgetAt = (month: number) => live.concat(cleared).reduce((t, d) => t + (month > d.startAfter ? d.min : 0), 0) + Math.max(0, extraMonthly);
  const cleared: typeof live = [];
  let month = 0;
  while (live.some((d) => d.bal > 0) && month < 600) {
    month++;
    for (const d of live) { const i = (d.bal * d.apr) / 12; d.bal += i; d.interest += i; }            // accrue interest
    let pool = budgetAt(month);
    for (const d of live) { if (month <= d.startAfter) continue; const pay = Math.min(d.min, d.bal, pool); d.bal -= pay; pool -= pay; }     // pay minimums (deferred debts wait)
    const priority = [...live].filter((d) => d.bal > 0 && month > d.startAfter).sort((a, b) => (method === 'avalanche' ? b.apr - a.apr : a.bal - b.bal));
    for (const d of priority) { if (pool <= 0) break; const pay = Math.min(pool, d.bal); d.bal -= pay; pool -= pay; }   // extra to priority
    for (let j = live.length - 1; j >= 0; j--) { if (live[j].bal <= 0.01) { live[j].payoffMonth = month; cleared.push(live[j]); live.splice(j, 1); } }
  }
  const neverPaysOff = live.length > 0;
  const all = [...cleared, ...live];
  return {
    months: neverPaysOff ? 600 : Math.max(month, lumpMonths),
    totalInterest: round2(all.reduce((t, d) => t + d.interest, 0) + lumpInterest),
    neverPaysOff,
    order: cleared.map((d) => ({ debt_id: d.id, label: d.label, payoffMonth: d.payoffMonth, interestPaid: round2(d.interest) }))
      .concat(lumps).sort((a, b) => a.payoffMonth - b.payoffMonth),
  };
}

// Capture types for debts (id maps to DebtType).
export const DEBT_KINDS: { id: DebtType; label: string; icon: string }[] = [
  { id: 'MORTGAGE', label: 'Mortgage', icon: '🏠' },
  { id: 'HELOC', label: 'HELOC', icon: '🏡' },
  { id: 'STUDENT_LOAN', label: 'Student loan', icon: '🎓' },
  { id: 'CREDIT_CARD', label: 'Credit card', icon: '💳' },
  { id: 'AUTO', label: 'Auto loan', icon: '🚗' },
  { id: 'PERSONAL', label: 'Personal loan', icon: '🧾' },
  { id: 'MEDICAL', label: 'Medical', icon: '🏥' },
  { id: 'OTHER', label: 'Other', icon: '📦' },
];
export function debtKind(id?: string) { return DEBT_KINDS.find((k) => k.id === id); }
export interface DebtDoc { user_id: UserId; debts: Debt[]; last_updated?: any; }

export interface DebtState {
  user_id: UserId;
  total_debt_balance: number;
  total_monthly_debt_service: number;   // Σ MINIMUM payments — the obligation (use for DTI)
  total_actual_payment: number;         // Σ ACTUAL payments (override-aware) — use for cash flow
  debts: Debt[];
  highest_rate_debt: Debt | null;   // the "pay this first" (avalanche) target
  toxic_debt_balance: number;       // balances above ~7% APR
}

/** APR above which debt is "toxic" — paying it down beats almost any investment return. The single
 *  source of truth for "high-interest / toxic" debt across the debt module, Net Worth, and Insights. */
export const TOXIC_APR = 0.07;

export function buildDebtState(uid: UserId, debts: Debt[]): DebtState {
  const total = debts.reduce((t, d) => t + d.remaining_balance, 0);
  const highest = debts.length ? debts.reduce((m, d) => (d.interest_rate_apr > m.interest_rate_apr ? d : m)) : null;
  const toxic = debts.filter((d) => d.interest_rate_apr > TOXIC_APR).reduce((t, d) => t + d.remaining_balance, 0);
  return {
    user_id: uid, total_debt_balance: round2(total),
    total_monthly_debt_service: minimumDebtService(debts),   // DTI obligation (Σ minimum)
    total_actual_payment: actualDebtPayment(debts),          // cash-flow outflow (override-aware)
    debts, highest_rate_debt: highest, toxic_debt_balance: round2(toxic),
  };
}

/** B-30: infer the debt type from its name so a "Mortgage" is treated as a mortgage (homeowner DTI
 *  guideline), not lumped into OTHER (renter guideline). */
export function inferDebtType(label: string | undefined): DebtType {
  const s = (label ?? '').toLowerCase();
  if (/heloc|home\s*equity/.test(s)) return 'HELOC';
  if (/mortgage|home\s*loan/.test(s)) return 'MORTGAGE';
  if (/auto|car\s*loan|vehicle/.test(s)) return 'AUTO';
  if (/student|tuition/.test(s)) return 'STUDENT_LOAN';
  if (/credit\s*card|visa|mastercard|amex/.test(s)) return 'CREDIT_CARD';
  if (/medical|hospital|dental/.test(s)) return 'MEDICAL';
  if (/personal/.test(s)) return 'PERSONAL';
  return 'OTHER';
}

export function debtsFromOnboarding(uid: UserId, op: Record<string, any> | null): DebtDoc {
  const a = op ?? {};
  const debts: Debt[] = [];
  const bal = toNum(a.debtBalance);
  if (bal > 0) {
    const label = (a.debtName ?? 'Debt') || 'Debt';
    debts.push({
      debt_id: newEntityId('debt'), label, debt_type: inferDebtType(label),
      remaining_balance: bal, interest_rate_apr: toNum(a.debtRate) / 100, minimum_monthly_payment: toNum(a.debtPayment),
      origin: 'onboarding',
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
