// THE PROFILE EVERY INCOME AND TAX FIGURE READS, IN ONE PLACE (2026-10-26, FIX-INCOME-A; the lead's ruling from DEC-0179 and
// DEC-0198, tenet 4).
//
// The year's interest and dividends are one figure — interestAndDividendsForYear: the year's records → the figure typed →
// calculated from the accounts' rates (≈) → not entered — and it counts in the tax whether or not it was typed. FIX-INCOME-B
// built profileWithAccountIncome (src/domain/income/onboarding.ts) to hand it in, but only the Income summary and the Income
// manager passed the accounts, so with $10,000 of savings at 4% and nothing typed the Income summary taxed $400 that Your base
// pay, Home, Cash flow and sign-up did not: one person, two rates. Every screen that works out a rate, a tax or a take-home reads
// its profile here.
//
// READ ONLY. What this returns carries the worked-out figure for the reading; it is NEVER written back to the store — a profile
// saved from it would turn a calculated figure into a typed one (the lead's ruling: nothing is stored). Screens keep the stored
// profile for anything they save.
import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { profileWithAccountIncome } from '../domain/income/onboarding';

/** What it is for: the profile an income or tax figure is read from — the stored answers (or the ones being edited, `op`), with the
 *  year's interest and dividends from the accounts handed in (profileWithAccountIncome). Never saved. */
/* ─ MK-CF-F-280 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * useIncomeProfile
 *
 * Answers ..... The profile an income or tax figure is read from — the stored answers (or the ones being edited), with the year's interest and dividends from the accounts handed in (profileWithAccountIncome). Never saved.
 *
 * Called by ... BasePayScreen · CashFlowScreen · FilingStatusScreen · GoalsScreen · IncomeDetailScreen · MortgageRateCompare
 *               the sign-up steps (src/onboarding/modules.tsx)
 *
 * Formula also in Calculation Module code/scripts/moneykeel_function_rules.json · MK-CF-F-280 (the master's
 *               functions_from_code does not read src/hooks yet, so it is not listed there; this record is written by hand
 *               in the generated form, as MK-NW-F-145's is)
 * Changed ..... not in git yet (—)
 */
export function useIncomeProfile(op?: Record<string, any> | null): any {
  const store = useStore() as any;
  const base = op === undefined ? store.onboardingProfile ?? null : op;
  return useMemo(() => profileWithAccountIncome(base, store.assetAccounts ?? [], store.transactions ?? []),
    [base, store.assetAccounts, store.transactions]);
}

/** What it is for: the same, outside a component (sign-up's step renderer is a plain function): the store's accounts and records
 *  read at the moment it is called. */
/* ─ MK-CF-F-281 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * incomeProfileNow
 *
 * Answers ..... The same profile as useIncomeProfile, outside a component (sign-up's step renderer is a plain function): the store's accounts and records read at the moment it is called.
 *
 * Called by ... BudgetScreen · DrawSteerSheet · the sign-up steps (src/onboarding/modules.tsx)
 *
 * Formula also in Calculation Module code/scripts/moneykeel_function_rules.json · MK-CF-F-281 (the master's
 *               functions_from_code does not read src/hooks yet, so it is not listed there; this record is written by hand
 *               in the generated form, as MK-NW-F-145's is)
 * Changed ..... not in git yet (—)
 */
export function incomeProfileNow(op: Record<string, any> | null): any {
  const s = useStore.getState() as any;
  return profileWithAccountIncome(op as any, s.assetAccounts ?? [], s.transactions ?? []);
}
