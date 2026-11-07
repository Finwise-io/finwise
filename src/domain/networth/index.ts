// Net worth module (spec service 5) — DERIVED from Assets − Debt. No own storage.
import type { UserId } from '../_shared/ids';

export interface NetWorthState {
  user_id: UserId;
  net_worth: number;
  gross_assets: number;
  gross_debt: number;
}


/** Net worth from two totals: everything owned less everything owed. */
/* ─ MK-NW-F-065 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * buildNetWorth
 *
 * Answers ..... Net worth from two totals: everything owned less everything owed.
 *
 * Formula .....
 *     gross assets = round(assets total, 2 dp)
 *     gross debt   = round(debt total, 2 dp)
 *     net worth    = round(assets total − debt total, 2 dp)
 *
 * Called by ... MK-NW-O-003 theNetWorth · MK-XS-F-031 buildSnapshot
 *
 * Reaches ..... 488 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 470 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-065
 * Changed ..... 2026-06-05 (f742136)
 */
export function buildNetWorth(uid: UserId, grossAssets: number, grossDebt: number): NetWorthState {
  return { user_id: uid, gross_assets: (grossAssets), gross_debt: (grossDebt), net_worth: (grossAssets - grossDebt) };
}
