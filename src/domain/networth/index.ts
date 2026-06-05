// Net Worth module (spec service 5) — DERIVED from Assets − Debt. No own storage.
import type { UserId } from '../_shared/ids';
import { round2 } from '../_shared/num';

export interface NetWorthState {
  user_id: UserId;
  net_worth: number;
  gross_assets: number;
  gross_debt: number;
}

export function buildNetWorth(uid: UserId, grossAssets: number, grossDebt: number): NetWorthState {
  return { user_id: uid, gross_assets: round2(grossAssets), gross_debt: round2(grossDebt), net_worth: round2(grossAssets - grossDebt) };
}
