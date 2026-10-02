// Inflation — ONE dated default, and the person's own lever above it.
//
// Founder ruling brief Q-50 (2026-08-20), executed 2026-09-08 on second-verification G30: inflation for
// every calculation defaults to the 30-year average of consumer prices — fixed, dated, stated on
// screen, and adjustable by the person. No live feed feeds a calculation: a feed made the odds move
// overnight for no reason the person could see, and its fallback (2.5 in one place, 2.4 in another)
// was two numbers for one thing.
//
// The figure: 2.5% a year — the compound average change in the Consumer Price Index for all urban
// consumers (CPI-U, Bureau of Labor Statistics) over 1996–2025. Re-check when a new year's index is
// published; the date below says when it was last checked.
export const INFLATION_DEFAULT = {
  rate: 0.025,
  percent: 2.5,
  basis: '30-year average of consumer prices',
  source: 'Bureau of Labor Statistics, CPI-U, 1996–2025',
  checked: '2026-09-08',
} as const;

export interface InflationInForce { rate: number; basis: 'entered' | 'default'; label: string }

/** The inflation rate a plan runs on, and where it came from. */
/* ─ MK-PL-F-083 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * inflationRateInForce
 *
 * Answers ..... The inflation rate a plan runs on, and where it came from.
 *
 * Formula .....
 *     entered = the person's own rate from the cockpit, when set
 *     the answer = { rate: entered, basis 'entered', label 'you entered' }   when entered exists
 *                  { rate: 2.5%, basis 'default', label '2.5% — the 30-year average of consumer prices (Bureau of Labor Statistics, 1996–2025)' }   otherwise
 *
 * Called by ... MK-PL-F-067 willItLastInputs · MK-XS-F-031 buildSnapshot
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-031 buildSnapshot · MK-CF-O-017 futurePaycheck
 *               MK-PL-F-068 selectWillItLast · MK-XS-F-032 snapshotFromOnboarding
 *               MK-PL-F-067 willItLastInputs
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Founder ruling brief Q-50 (2026-08-20), executed 2026-09-08 (G30): the default is the dated 30-year average — 2.5% a year, Bureau of Labor Statistics CPI-U 1996–2025, checked 2026-09-08 — never a live feed; the person's own rate outranks it.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-083
 * Changed ..... not in git yet (—)
 */
export function inflationRateInForce(entered: number | null | undefined): InflationInForce {
  if (entered != null && Number.isFinite(entered)) return { rate: entered, basis: 'entered', label: 'you entered' };
  return { rate: INFLATION_DEFAULT.rate, basis: 'default',
           label: `${INFLATION_DEFAULT.percent}% — the ${INFLATION_DEFAULT.basis} (${INFLATION_DEFAULT.source})` };
}
