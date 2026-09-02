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
 * Called by ... MK-CF-F-091 userCapGainsRates · MK-PL-F-004 withdrawalOrder
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-091 userCapGainsRates · MK-PL-F-004 withdrawalOrder
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
