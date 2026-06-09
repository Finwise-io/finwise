// Financial snapshot — assembles every module's read-model from the consolidated
// onboarding answers (+ live economic data). One synchronous source for the cockpit,
// so the UI never waits on per-module Firestore round-trips. Each module's pure
// onboarding-mapper + calc is reused, so the snapshot can't drift from the modules.
import type { UserId } from './_shared/ids';
import { toNum } from './_shared/num';

import { profileFromOnboarding, toReadModel, ProfileReadModel } from './profile';
import { incomeFromOnboarding, buildIncomeState, IncomeState } from './income';
import { assetsFromOnboarding, buildAssetsState, monthlyContributionsFromOnboarding, AssetsState } from './assets';
import { debtsFromOnboarding, buildDebtState, DebtState } from './debt';
import { buildNetWorth, NetWorthState } from './networth';
import { budgetFromOnboarding, buildBudgetState, BudgetState } from './budget';
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

export function buildSnapshot(uid: UserId, op: Record<string, any> | null, econ: EconomicData): FinancialSnapshot {
  const a = op ?? {};
  const profile = toReadModel(profileFromOnboarding(uid, op));

  const incomeDoc = incomeFromOnboarding(uid, op);
  const income = buildIncomeState(uid, incomeDoc.sources, incomeDoc.tax);

  const assets = buildAssetsState(uid, assetsFromOnboarding(uid, op).accounts);
  const debt = buildDebtState(uid, debtsFromOnboarding(uid, op).debts);
  const networth = buildNetWorth(uid, assets.total_asset_value, debt.total_debt_balance);

  const budget = buildBudgetState(uid, income.net_monthly_income, budgetFromOnboarding(uid, op));

  const capacity = toNum(a.monthlySavingsCapacity) || budget.projected_to_save;
  const goals = buildGoalsState(uid, goalsFromOnboarding(uid, op).goals, capacity);

  // guaranteed retirement income (Social Security/pension) — present only in the retired flow; 0 otherwise
  const guaranteedMonthly = ['ri_ss', 'ri_pension', 'ri_withdrawals', 'ri_rmd', 'ri_annuities', 'ri_other']
    .reduce((t, k) => t + toNum(a[k]), 0);

  const retirement = buildRetirementState(uid, {
    current_age: profile.current_age ?? 35,
    retire_age: profile.target_retirement_age ?? 65,
    horizon_age: profile.plan_to_age ?? 90,
    start_balance: assets.total_asset_value,
    annual_contribution: monthlyContributionsFromOnboarding(op) * 12,
    retire_monthly_spend_today: retirementSpendMonthly(a) || budget.monthly_spending,
    guaranteed_monthly_income: guaranteedMonthly,
    inflation: (econ.inflationRate || 2.4) / 100,
    mean_return: assets.average_target_return || 0.07,
    vol_return: 0.12,
    paths: 500,
  });

  return { profile, income, assets, debt, networth, budget, goals, retirement };
}
