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
import { declareFigures } from '../../../MoneyKeel/functions/_figure-spec';

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
 * Reads ....... MK-XS-I-029 inflation rate
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
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

/** THE INFLATION A PROJECTION RUNS ON, AS THE SCREENS PRINT IT (2026-10-26, PF-TOOLS; the figure CF-MMFIX-A and FIX-TAX asked an
 *  identifier for). The future paycheck's "assumes a 7.65% return and 2.50% inflation a year" and the draw sheet's "less 2.50%
 *  inflation" printed it with none — under MK-CF-M-022, or in a sentence the guard could not see. One rate, one figure: the rate
 *  inflationRateInForce gives is the one every plan runs on (willItLastInputs reads it too). */
export const INFLATION_FIGURES = declareFigures({
  'MK-CF-M-083': {
    label: 'inflation a year', unit: 'percent-2dp', screens: ['/cashflow'],
    answers: 'The yearly inflation the future paycheck and the draw sheet take off the return — the one rate every plan runs on.',
    formula: 'the inflation rate set on the Plan; else the dated default, 2.5%/year — the 30-year average of consumer prices (Bureau of Labor Statistics, CPI-U, 1996–2025) (MK-PL-F-083 inflationRateInForce; MK-CF-O-017 futurePaycheck hands it to the card as the inflation it assumes)',
    inputs: ['MK-XS-I-029 inflation rate'],
    decisions: ['ONE DATED DEFAULT, NEVER A LIVE FEED (founder ruling brief Q-50, 2026-08-20, executed 2026-09-08 as G30); the person\u2019s own rate outranks it.'],
    refusal: 'Never absent: with no rate set it is the dated default.',
    ruled: '2026-10-26',   // the lead's decision, made without asking him (decide, apply, report); its decision row is PF-RECORDS'
    worked: { given: 'A plan read in 2026 with no inflation rate set on it.', answer: '2.50%', run: () => inflationRateInForce(null).rate },
  },
} as const);
