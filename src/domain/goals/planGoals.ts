/** PLAN · GOALS — WHAT THE SUB-TAB SHOWS, WORKED HERE (2026-10-31, FX-PLAN; drawing MoneyKeel/documents/plan/moneykeel_pres_mock_goals_v03.html,
 *  built under his DEC-9228: he judges the built screen on TestFlight).
 *
 *  His words on the old Goals screen (DEC-8889, 2026-10-27): "$1,750/month typical free cash to save - typical based on what? … Debt
 *  Pay-off should be a goal to enter." So every figure says how it is made, and paying off a debt is a goal a person enters:
 *  - goalsCapacity: what a person can put toward goals — this year's 12 months of take-home, less expenses, less debt payments, averaged,
 *    with the lowest and highest month when they differ. The total is the one the old screen printed (availableToSaveSummary of
 *    surplusByMonth); the three rows above it are its own parts, so they add up to it.
 *  - debtGoalPlan: what clearing one debt by a chosen month needs each month (equal payments at the debt's own rate), against the
 *    payment set today, and the interest each way.
 *  The figures it prints are listed at the end of this file. */
import { incomeMonthlyGrid } from '../income';
import { spendByMonth } from '../budget';
import { actualDebtPayment, loanPayment, payoffPlan, requiredPayment, type Debt } from '../debt';
import { availableToSaveSummary, monthsUntil } from './index';

export interface GoalsCapacity {
  takeHome: number; expenses: number; debt: number; surplus: number;
  min: number; max: number; lumpy: boolean;
  /** no take-home entered: the surplus has nothing behind it (Q48) */
  nothing: boolean;
}

/** This year's 12 months, averaged: take-home − expenses − debt payments = what can go toward goals. */
/* ─ MK-PL-F-098 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * goalsCapacity
 *
 * Answers ..... This year's 12 months, averaged: take-home − expenses − debt payments = what can go toward goals.
 *
 * Formula .....
 *     income = income monthly grid(op as any, 'available')   if op
 *     []   otherwise
 *     spend = spend by month(op as any)   if op
 *     []   otherwise
 *     n = count of income (or 12 when missing or zero)
 *     take home = Σ over income of (amount)÷ n
 *     expenses = Σ over spend of (each)÷ n
 *     debt = actual debt payment(debts)
 *     months = for each of income: label = label
 *     amount = amount − (spend[i] ?? 0) − debt
 *     cap = available to save summary(months)
 *     the answer:
 *     take home = take home
 *     expenses = expenses
 *     debt = debt
 *     surplus = cap.avg
 *     min = cap.min
 *     max = cap.max
 *     lumpy = cap.lumpy
 *     nothing = not (take home > 0)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *
 * Decides .....
 *     · If spend[i] is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-098
 * Changed ..... not in git yet (—)
 */
export function goalsCapacity(op: Record<string, any> | null, debts: Debt[] = []): GoalsCapacity {
  const income = op ? incomeMonthlyGrid(op as any, 'available') : [];
  const spend = op ? spendByMonth(op as any) : [];
  const n = income.length || 12;
  const takeHome = income.reduce((t, m) => t + m.amount, 0) / n;
  const expenses = spend.reduce((t, v) => t + v, 0) / n;
  const debt = actualDebtPayment(debts);
  const months = income.map((m, i) => ({ label: m.label, amount: m.amount - (spend[i] ?? 0) - debt }));
  const cap = availableToSaveSummary(months);
  return { takeHome, expenses, debt, surplus: cap.avg, min: cap.min, max: cap.max, lumpy: cap.lumpy, nothing: !(takeHome > 0) };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** 'YYYY-MM' → 'Oct 2027'; the month a number of months from `now` → the same words */
/* ─ MK-PL-F-099 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * monthYear
 *
 * Answers ..... 'YYYY-MM' → 'Oct 2027'; the month a number of months from `now` → the same words
 *
 * Formula .....
 *     m = string(ym ?? '').match( ÷ ^(\d{4}) − (\d{1,2}) ÷ )
 *     the answer:
 *     `${MONTHS[number(m[2]) − 1]} ${m[1]}`   if m and number(m[2]) ≥ 1 and number(m[2]) ≤ 12
 *     nothing   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-099
 * Changed ..... not in git yet (—)
 */
export function monthYear(ym: string | null | undefined): string | null {
  const m = String(ym ?? '').match(/^(\d{4})-(\d{1,2})/);
  return m && Number(m[2]) >= 1 && Number(m[2]) <= 12 ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : null;
}
/** The month a number of months from now, as the Goals rows write it ("Oct 2027"). */
/* ─ MK-PL-F-100 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * monthsFrom
 *
 * Answers ..... The month a number of months from now, as the Goals rows write it ("Oct 2027").
 *
 * Formula .....
 *     d = the date now.get full year(), now.get month() + months, 1
 *     the answer = `${MONTHS[get month()]} ${get full year()}`
 *
 * Called by ... MK-PL-F-101 debtGoalPlan
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-PL-F-101 debtGoalPlan
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-100
 * Changed ..... not in git yet (—)
 */
export function monthsFrom(now: Date, months: number): string {
  const d = new Date(now.getFullYear(), now.getMonth() + months, 1);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export type DebtGoalPlan =
  | { kind: 'gone' }
  | { kind: 'paid' }
  | { kind: 'no-rate'; balance: number }
  | { kind: 'no-date'; balance: number }
  | {
      kind: 'plan'; balance: number; rate: number; monthlyRate: number; months: number; firstMonth: string; lastMonth: string;
      need: number; interest: number; payment: number; extra: number;
      /** at the payment set: when it clears and the interest then; null when that payment never clears it */
      clears: { when: string; interest: number } | null;
      saved: number | null;
    };

/** Paying off one debt by a month: equal payments at its own rate from next month to that one (loanPayment), against the payment set. */
/* ─ MK-PL-F-101 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * debtGoalPlan
 *
 * Answers ..... Paying off one debt by a month: equal payments at its own rate from next month to that one (loanPayment), against the payment set.
 *
 * Formula .....
 *     kind = 'gone'   when debt is missing
 *     balance = debt.remaining balance read as a number (or 0 when missing or zero)
 *     kind = 'paid'   when not (balance > 0)
 *     rate = debt.interest rate apr read as a number
 *     kind = 'no − rate'
 *     balance = balance   when debt.interest rate apr = nothing (or !number.is finite(rate) when missing or zero)
 *     months = months until(target ym ?? undefined, now)
 *     kind = 'no − date'
 *     balance = balance   when months = nothing
 *     loan = loan payment(balance, rate × 100, months ÷ 12)
 *     payment = required payment(debt)
 *     at payment = payoff plan([debt], 0, 'avalanche', now)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-014 debt balance
 *               MK-XS-I-015 debt interest rate
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-101
 * Changed ..... not in git yet (—)
 */
export function debtGoalPlan(debt: Debt | null | undefined, targetYm: string | null | undefined, now: Date = new Date()): DebtGoalPlan {
  if (!debt) return { kind: 'gone' };
  const balance = Number(debt.remaining_balance) || 0;
  if (!(balance > 0)) return { kind: 'paid' };
  const rate = Number(debt.interest_rate_apr);
  if (debt.interest_rate_apr == null || !Number.isFinite(rate)) return { kind: 'no-rate', balance };   // nothing worked on a missing rate (R6)
  const months = monthsUntil(targetYm ?? undefined, now);
  if (months == null) return { kind: 'no-date', balance };
  const loan = loanPayment(balance, rate * 100, months / 12);
  const payment = requiredPayment(debt);
  const atPayment = payoffPlan([debt], 0, 'avalanche', now);
  const clears = !atPayment.neverPaysOff && !atPayment.pastHorizon && atPayment.notEntered.length === 0
    ? { when: monthsFrom(now, atPayment.months), interest: atPayment.totalInterest } : null;
  return {
    kind: 'plan', balance, rate, monthlyRate: rate / 12, months, firstMonth: monthsFrom(now, 1), lastMonth: monthsFrom(now, months),
    need: loan.monthly, interest: loan.totalInterest, payment, extra: loan.monthly - payment,
    clears, saved: clears ? clears.interest - loan.totalInterest : null,
  };
}

/* THE FIGURES IT PRINTS, AND WHY THEY ARE NOT DECLARED HERE (2026-10-31): a figure is declared on its door, and a door is an
 * orchestrator — the lead's ruling of 2026-10-31 that took Roth conversion's figures off the register; the Plan doors wait on Q-PL-5
 * (workplan #121). Until then the Goals sub-tab prints them itself, counted as undeclared by guard_figures_declared, its true count:
 * what can go toward goals (MK-MN-M-008, issued against the old Goals screen's words), each goal's target and saved (MK-MN-M-009),
 * and, needing numbers: take-home and expenses in the average month this year; the lowest and highest month; what a goal needs a
 * month and still needs; a debt's rate a year and a month; what clearing it by the date needs a month; how much more than the payment
 * set; the interest by the date, at the payment set, and saved. A debt's balance (MK-NW-M-010), its payment (MK-CF-M-073) and the
 * month's debt payments (MK-NW-M-012) are its own doors' figures. */
