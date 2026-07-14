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
export function milestoneLabel(threshold: number): string {
  if (threshold >= 1_000_000) {
    const m = threshold / 1_000_000;
    return `$${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  return `$${Math.round(threshold / 1000)}k`;
}

/** The highest ladder rung at or below `netWorth` (0 when below the first rung). */
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
export function milestoneCrossed(netWorth: number, highSeen: number | null): number | null {
  if (highSeen == null) return null;                 // first sight = baseline, never a party
  const floor = milestoneFloor(netWorth);
  return floor > highSeen ? floor : null;
}
