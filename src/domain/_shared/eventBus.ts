// Tiny in-app event bus — stands in for the spec's Kafka broker while we're a
// single client app. Modules publish/consume domain events by name; when we move
// server-side, only this file's implementation changes (the contracts stay).
type Handler<T = any> = (payload: T) => void;

const handlers: Record<string, Set<Handler>> = {};

/* ─ MK-ST-F-039 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * on
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     () => handlers[event type].delete(handler as handler)
 *
 * Called by ... MK-CF-F-071 extraIncome · MK-CF-F-091 userCapGainsRates
 *               MK-CF-F-144 takeHomeAsEntered · MK-CF-F-171 earnerPay
 *               MK-PL-F-004 withdrawalOrder · MK-PL-F-036 weighGoals
 *               MK-PL-F-082 taxableIncomeSteps · MK-ST-F-049 formatMoney
 *
 * Reaches ..... 106 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-005 actualMonthFlow · MK-CF-F-012 annualCashflow
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-O-001 basePay
 *               MK-PF-F-013 benchmarkTicker · MK-CF-F-013 budgetFromOnboarding
 *               MK-CF-F-014 budgetVsActual · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-XS-F-004 buildDatedGrid
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-CF-F-107 buildPaycheckYear
 *               MK-PF-F-014 buildPerformance · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-020 cashflowYear
 *               … and 88 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-039
 * Changed ..... 2026-06-05 (f742136)
 */
export function on<T = any>(eventType: string, handler: Handler<T>): () => void {
  (handlers[eventType] ??= new Set()).add(handler as Handler);
  return () => handlers[eventType]?.delete(handler as Handler);
}

/* ─ MK-ST-F-040 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * emit
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     It records or announces something and returns no figure — no arithmetic of its own.
 *
 * Called by ... MK-CF-F-017 publishSurplus · MK-CF-F-040 saveDebt
 *               MK-CF-F-051 saveIncome · MK-NW-F-043 saveAssets
 *               MK-XS-F-022 saveProfile
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-017 publishSurplus · MK-NW-F-043 saveAssets
 *               MK-CF-F-040 saveDebt · MK-CF-F-051 saveIncome
 *               MK-XS-F-022 saveProfile
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-040
 * Changed ..... 2026-06-05 (f742136)
 */
export function emit<T = any>(eventType: string, payload: T): void {
  handlers[eventType]?.forEach((h) => {
    try { h(payload); } catch (e) { console.warn(`[eventBus] ${eventType} handler error`, e); }
  });
}
