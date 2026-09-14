/** THE DATE A PERSON IS LIVING IN, not the one UTC is.
 *
 *  `d.toISOString().slice(0, 10)` is the obvious way to write this and it is wrong for anyone west
 *  of UTC: at 6pm in California, toISOString already says tomorrow. Two screens stamped dates that
 *  way while the cash-flow code used the local one — so a transaction logged on the evening of the
 *  31st was filed in the next month, on those screens only. One function, and a name that says why.
 */
/* ─ MK-ST-F-065 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * isoLocalDate
 *
 * Answers ..... THE DATE A PERSON IS LIVING IN, not the one UTC is.
 *
 * Formula .....
 *     `${get full year()}-${string(get month() + 1).pad start(2, '0')}-${string(get date()).pad start(2, '0')}`
 *
 * Called by ... MK-CF-F-019 upcomingBills · MK-CF-F-183 paidOutByAccount
 *               MK-PF-F-022 factorOverMonths · MK-XS-F-175 uid
 *
 * Reaches ..... 58 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-PF-F-022 factorOverMonths · MK-NW-F-044 getAssetsState
 *               MK-CF-F-041 getDebtState · MK-CF-F-052 getIncomeState
 *               MK-XS-F-023 getProfileReadModel · MK-ST-F-041 getUserDoc
 *               … and 40 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-065
 * Changed ..... not in git yet (—)
 */
export function isoLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
