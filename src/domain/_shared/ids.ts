// Shared identity keys (the spec's "Shared Core Data Contracts" pattern).
// Modules reference each other by these ids — never by duplicating fields.
export type UserId = string;     // Firebase auth uid
export type EntityId = string;   // asset_id | debt_id | goal_id | income_source_id …

/* ─ MK-ST-F-043 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * newEntityId
 *
 * Answers ..... What do we call this new thing?
 *
 * Formula .....
 *     `${prefix}_${date.now().to string(36)}${math.random().to string(36).slice(2, 8)}`
 *
 * Called by ... MK-CF-F-038 debtsFromOnboarding · MK-CF-F-079 incomeFromOnboarding
 *               MK-CF-F-112 makeTransaction · MK-CF-F-116 inverseOf
 *               MK-CF-F-138 addLot · MK-NW-F-040 assetsFromOnboarding
 *               MK-PL-F-013 goalsFromOnboarding · MK-XS-F-102 ingestSync
 *               MK-XS-F-175 uid
 *
 * Reaches ..... 58 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-CF-F-138 addLot · MK-CF-F-111 applyTransaction
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-CF-F-041 getDebtState · MK-CF-F-052 getIncomeState
 *               … and 40 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-043
 * Changed ..... 2026-06-05 (f742136)
 */
export function newEntityId(prefix: string): EntityId {
  // short, readable, collision-resistant enough for per-user entities
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
