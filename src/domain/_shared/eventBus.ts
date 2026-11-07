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
 * Called by ... MK-CF-F-005 actualMonthFlow · MK-CF-F-049 buildIncomeState
 *               MK-CF-F-071 extraIncome · MK-CF-F-087 monthlyTaxRates
 *               MK-CF-F-111 applyTransaction · MK-CF-F-124 nextOccurrence
 *               MK-CF-F-144 takeHomeAsEntered · MK-CF-F-184 incomeFromAccounts
 *               MK-CF-F-186 convertTakeHomeMode · MK-CF-F-188 householdPreTaxContributionsAnnual
 *               MK-CF-F-202 TAX · MK-CF-F-207 SOURCE
 *               MK-CF-F-234 wagesLandingByMonth · MK-CF-F-240 PAY_LANDS_TYPED
 *               MK-CF-F-298 capFirst · MK-CF-O-001 basePay
 *               MK-CF-O-017 futurePaycheck · MK-NW-F-025 accountDisplayName
 *               MK-NW-F-071 isCertificateOfDeposit · MK-NW-F-088 BENCH
 *               MK-NW-O-003 theNetWorth · MK-NW-O-008 thePerformance
 *               MK-PF-F-073 sharesThroughWindow · MK-PL-F-004 withdrawalOrder
 *               MK-PL-F-010 drawOrderOutcome · MK-PL-F-036 weighGoals
 *               MK-PL-F-067 willItLastInputs · MK-PL-F-082 taxableIncomeSteps
 *               MK-PL-F-083 inflationRateInForce · MK-ST-F-049 formatMoney
 *               MK-ST-F-073 rebuildDays · MK-ST-F-081 timeWeightedReturn
 *               MK-XS-F-192 typedValueDatedBack · MK-XS-F-197 chainShown
 *               MK-XS-F-216 fileDateOf
 *
 * Reaches ..... 507 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-081 LB
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-CF-F-200 LINE
 *               … and 489 more — the full list is on functions_from_code
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
 *               MK-CF-F-051 saveIncome · MK-XS-F-022 saveProfile
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-017 publishSurplus · MK-CF-F-040 saveDebt
 *               MK-CF-F-051 saveIncome · MK-XS-F-022 saveProfile
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
