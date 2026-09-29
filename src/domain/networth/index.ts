// Net Worth module (spec service 5) — DERIVED from Assets − Debt. No own storage.
import type { UserId } from '../_shared/ids';

export interface NetWorthState {
  user_id: UserId;
  net_worth: number;
  gross_assets: number;
  gross_debt: number;
}

/* ─ MK-NW-F-065 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * buildNetWorth
 *
 * Answers ..... What is this household worth?
 *
 * Formula .....
 *     gross assets = round(assets total, 2 dp)
 *     gross debt   = round(debt total, 2 dp)
 *     net worth    = round(assets total − debt total, 2 dp)
 *
 * Called by ... MK-NW-O-003 theNetWorth · MK-XS-F-031 buildSnapshot
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-XS-F-031 buildSnapshot
 *               MK-XS-F-032 snapshotFromOnboarding · MK-NW-O-003 theNetWorth
 *
 * Serves ...... MK-NW-M-016
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-065
 * Changed ..... 2026-06-05 (f742136)
 */
export function buildNetWorth(uid: UserId, grossAssets: number, grossDebt: number): NetWorthState {
  return { user_id: uid, gross_assets: (grossAssets), gross_debt: (grossDebt), net_worth: (grossAssets - grossDebt) };
}
