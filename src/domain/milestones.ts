// Milestone moment (FCC detailed design v1.1, Home STATES + the strategy's stated retention
// moment): when net worth crosses a round threshold, ONE calm fact-toned line under the hero,
// dismissed on tap, never repeated for the same milestone. Honesty rules: the FIRST observation
// of a user's wealth sets a silent baseline (we never congratulate someone for money they walked
// in with — "crossed" means we watched it happen), and a later dip below never re-arms the same
// milestone (high-water acknowledgment).

export const MILESTONE_LADDER = [
  10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 750_000,
  1_000_000, 1_500_000, 2_000_000, 3_000_000, 5_000_000, 10_000_000,
] as const;

/** '$500k' / '$1M' — the label the celebration line uses. */
/* ─ MK-HM-F-002 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * milestoneLabel
 *
 * Answers ..... '$500k' / '$1M' — the label the celebration line uses.
 *
 * Formula .....
 *     m = threshold ÷ 1000000
 *     the answer = `$${number.is integer(m) ? m : to fixed(1)}M`
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Rounds the answer to a whole number.
 *     · Shows 1 decimal place.
 *
 * Formula also on the master file · functions_from_code · MK-HM-F-002
 * Changed ..... 2026-07-14 (63edc6b)
 */
export function milestoneLabel(threshold: number): string {
  if (threshold >= 1_000_000) {
    const m = threshold / 1_000_000;
    return `$${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  return `$${Math.round(threshold / 1000)}k`;
}

/** The highest ladder rung at or below `netWorth` (0 when below the first rung). */
/* ─ MK-HM-F-003 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * milestoneFloor
 *
 * Answers ..... The highest ladder rung at or below `netWorth` (0 when below the first rung).
 *
 * Formula .....
 *     floor = 0
 *     the answer = floor
 *
 * Called by ... MK-HM-F-004 milestoneCrossed
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-HM-F-004 milestoneCrossed
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses a built-in floor of 0.
 *
 * Formula also on the master file · functions_from_code · MK-HM-F-003
 * Changed ..... 2026-07-14 (63edc6b)
 */
export function milestoneFloor(netWorth: number): number {
  let floor = 0;
  for (const t of MILESTONE_LADDER) { if (netWorth >= t) floor = t; else break; }
  return floor;
}

/**
 * The one decision rule. `highSeen` is the highest acknowledged rung (null = never observed:
 * caller must set the baseline SILENTLY, no celebration). Returns the newly crossed rung to
 * celebrate, or null.
 */
/* ─ MK-HM-F-004 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * milestoneCrossed
 *
 * Answers ..... The one decision rule.
 *
 * Formula .....
 *     nothing   when high seen = nothing
 *     floor = milestone floor(net worth)
 *     the answer:
 *     floor   if floor > high seen
 *     nothing   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... MK-HM-M-002
 *
 * Formula also on the master file · functions_from_code · MK-HM-F-004
 * Changed ..... 2026-07-14 (63edc6b)
 */
export function milestoneCrossed(netWorth: number, highSeen: number | null): number | null {
  if (highSeen == null) return null;                 // first sight = baseline, never a party
  const floor = milestoneFloor(netWorth);
  return floor > highSeen ? floor : null;
}
