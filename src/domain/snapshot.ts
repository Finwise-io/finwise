// Financial snapshot — assembles every module's read-model from the consolidated
// onboarding answers (+ live economic data). One synchronous source for the cockpit,
// so the UI never waits on per-module Firestore round-trips. Each module's pure
// onboarding-mapper + calc is reused, so the snapshot can't drift from the modules.
import type { UserId } from './_shared/ids';
import { toNum } from './_shared/num';

import { profileFromOnboarding, toReadModel, ProfileReadModel } from './profile';
import { incomeFromOnboarding, buildIncomeState, IncomeState, retirementIncomeMonthly } from './income';
import { assetsFromOnboarding, buildAssetsState, monthlyContributionsFromOnboarding, retirementEarmarkedValue, AssetsState, AssetAccount, blendedReturn } from './assets';
import { debtsFromOnboarding, buildDebtState, DebtState, Debt } from './debt';
import { buildNetWorth, NetWorthState } from './networth';
import { budgetFromOnboarding, buildBudgetState, savingsByMonth, BudgetState } from './budget';
import { goalsFromOnboarding, buildGoalsState, GoalsState } from './goals';
import { buildRetirementState, retirementSpendMonthly, RetirementState } from './retirement';

export interface EconomicData { inflationRate: number; treasuryYield: number; } // percentages

export interface FinancialSnapshot {
  profile: ProfileReadModel;
  income: IncomeState;
  assets: AssetsState;
  debt: DebtState;
  networth: NetWorthState;
  budget: BudgetState;
  goals: GoalsState;
  retirement: RetirementState;
}

/** NEGATIVE CASH FLOW DRAINS WEALTH — committed contributions don't create money. If the year's
 *  free cash (after tax, 401(k), spending — month-placement-aware, so $0-pay months and lumpy
 *  gifts count where they land) can't cover the non-401(k) contributions, the shortfall is
 *  deducted from the effective amount added to the nest egg; an outright deficit goes negative
 *  and the projection correctly shows wealth declining. */
export function effectiveAnnualContribution(op: Record<string, any> | null): number {
  const a = op ?? {};
  const statedAnnual = monthlyContributionsFromOnboarding(op) * 12;
  const hasSpendData = toNum(a.monthlySpending) > 0 || (Array.isArray(a.spendCats) && a.spendCats.length > 0);
  if (!hasSpendData) return statedAnnual;          // no cash-flow picture → take contributions at face value
  const freeCashAnnual = savingsByMonth(a as any).reduce((t, m) => t + m.amount, 0);
  const non401kAnnual = (toNum(a.c_roth) + toNum(a.c_invest) + toNum(a.c_property)) * 12;
  return statedAnnual + Math.min(0, freeCashAnnual - non401kAnnual);
}

/**
 * Build a snapshot from EXPLICIT net-worth rows. `accounts`/`liabilities` are required so no caller
 * can silently fall back to stale onboarding numbers (B-49): a live UI surface passes the store
 * arrays; a headless/test caller that only has onboarding answers uses `snapshotFromOnboarding`.
 * The rows are authoritative — passing `[]` means "the user has none" (e.g. all accounts deleted, or
 * a paid-off debt), NOT "resurrect onboarding".
 */
export function buildSnapshot(
  uid: UserId,
  op: Record<string, any> | null,
  econ: EconomicData,
  accounts: AssetAccount[],
  liabilities: Debt[],
): FinancialSnapshot {
  const a = op ?? {};
  const profile = toReadModel(profileFromOnboarding(uid, op));

  const incomeDoc = incomeFromOnboarding(uid, op);
  const income = buildIncomeState(uid, incomeDoc.sources, incomeDoc.tax);

  const acctRows = accounts;
  const debtRows = liabilities;
  const assets = buildAssetsState(uid, acctRows);
  const debt = buildDebtState(uid, debtRows);
  const networth = buildNetWorth(uid, assets.total_asset_value, debt.total_debt_balance);

  const budget = buildBudgetState(uid, income.net_monthly_income, budgetFromOnboarding(uid, op));

  // ONE pool: goal capacity = free cash AFTER the investing plan (same dollars never fund both)
  const investMo = toNum(a.c_roth) + toNum(a.c_invest) + toNum(a.c_property);
  const capacity = toNum(a.monthlySavingsCapacity) || Math.max(0, budget.projected_to_save - investMo);
  const goals = buildGoalsState(uid, goalsFromOnboarding(uid, op).goals, capacity);

  // guaranteed retirement income (Social Security/pension/etc.) — cadence-normalized; 0 outside retired flow
  const guaranteedMonthly = retirementIncomeMonthly(a);

  const retirement = buildRetirementState(uid, {
    current_age: profile.current_age ?? 35,
    retire_age: profile.target_retirement_age ?? 65,
    horizon_age: profile.plan_to_age ?? 90,
    // B-49: nest egg = retirement-earmarked value (excludes property, partial cash) — the same basis
    // the Retirement cockpit uses. Identical to total_asset_value for onboarding-derived accounts
    // (all 100%-earmarked), so op-only callers are unchanged.
    start_balance: retirementEarmarkedValue(acctRows),
    annual_contribution: effectiveAnnualContribution(op),
    retire_monthly_spend_today: retirementSpendMonthly(a) || budget.monthly_spending,
    guaranteed_monthly_income: guaranteedMonthly,
    inflation: (econ.inflationRate || 2.4) / 100,
    // walk row 10 (audit PRD #5): the ONE expected-return figure — the same blendedReturn the
    // cockpit and will-it-last read; the snapshot's own average_target_return stays display-only.
    mean_return: blendedReturn(acctRows) || 0.07,
    vol_return: 0.12,
    paths: 500,
  });

  return { profile, income, assets, debt, networth, budget, goals, retirement };
}

/**
 * Snapshot from onboarding answers alone — for headless/test callers (and any surface that runs
 * before Net Worth is set up). Derives the accounts/liabilities from `op`, then calls buildSnapshot.
 * Live UI surfaces (Home, TopBar) resolve their rows via `resolveNetWorthRows` instead.
 */
export function snapshotFromOnboarding(uid: UserId, op: Record<string, any> | null, econ: EconomicData): FinancialSnapshot {
  return buildSnapshot(uid, op, econ, assetsFromOnboarding(uid, op).accounts, debtsFromOnboarding(uid, op).debts);
}

export interface NetWorthRows { accounts: AssetAccount[]; liabilities: Debt[]; }

/**
 * The single rule for which net-worth rows a live UI surface should use, so Home + TopBar + the Net
 * Worth screen never disagree (B-49). The live store rows are authoritative once the user has any of
 * them OR Net Worth has been seeded — so a user who DELETED everything correctly shows $0 rather than
 * resurrecting onboarding (`nwSeeded` stays true after deletions). Only a user who has never set up
 * Net Worth at all (nothing live, never seeded) falls back to the onboarding-derived estimate.
 */
export function resolveNetWorthRows(
  uid: UserId,
  op: Record<string, any> | null,
  nwSeeded: boolean,
  liveAccounts: AssetAccount[],
  liveLiabilities: Debt[],
): NetWorthRows {
  const useLive = nwSeeded || liveAccounts.length > 0 || liveLiabilities.length > 0;
  return useLive
    ? { accounts: liveAccounts, liabilities: liveLiabilities }
    : { accounts: assetsFromOnboarding(uid, op).accounts, liabilities: debtsFromOnboarding(uid, op).debts };
}
