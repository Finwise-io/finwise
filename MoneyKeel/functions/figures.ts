/** THE FIGURE REGISTER — every figure any door hands out, in one place (founder rule 11, 2026-09-14).
 *
 *  A door declares its own figures beside the code that computes them; this merges those declarations
 *  so three things can read one list: `fig()`, which a screen uses to print a figure by its identifier;
 *  the build, which PRINTS the master file's rows from it; and the guards, which fail the build when a
 *  screen prints a figure that was never declared.
 *
 *  A door joins by adding one line here on the day its figures are declared.
 */
import type { FigureSpec } from './_figure-spec';
import { FIGURES as basePayFigures } from './cashflow/base-pay';
import { FIGURES as incomeSummaryFigures } from './cashflow/income-summary';
import { FIGURES as thisMonthFigures } from './cashflow/this-month';
import { BOND_FIGURES } from './networth-and-performance/bonds';
import { ACCOUNT_FIGURES } from './networth-and-performance/account';
import { NET_WORTH_FIGURES } from './networth-and-performance/net-worth';
import { EMERGENCY_FUND_FIGURES } from './networth-and-performance/emergency-fund';
import { HOLDING_FIGURES } from './networth-and-performance/holding';
import { ALTERNATIVES_OUTLOOK_FIGURES } from './networth-and-performance/alternatives-outlook';
import { PERFORMANCE_FIGURES } from './networth-and-performance/performance';
import { LOOK_BACK_FIGURES } from './networth-and-performance/look-back';
import { CONTRIBUTION_ROOM_FIGURES } from './cashflow/contribution-room';
import { CREDIT_LINE_FIGURES } from './cashflow/credit-line';
import { TAX_ORGANIZER_FIGURES } from './cashflow/tax-organizer';
import { WHATS_COMING_FIGURES } from './cashflow/whats-coming';
import { THE_MONTH_FIGURES } from './cashflow/the-month';

/** identifier → who declared it, so a clash names both doors. */
const DOORS: [string, Record<string, FigureSpec>][] = [
  ['MK-CF-O-001 basePay', basePayFigures],
  ['MK-CF-O-004 incomeSummary', incomeSummaryFigures],
  ['MK-CF-O-003 thisMonth', thisMonthFigures],
  ['MK-NW-O-001 theBonds', BOND_FIGURES],   // Q-NW-4, ruled 2026-09-27
  ['MK-NW-O-002 theAccount', ACCOUNT_FIGURES],   // Q-NW-2, ruled 2026-09-27
  ['MK-NW-O-003 theNetWorth', NET_WORTH_FIGURES],   // Q-NW-1, ruled 2026-09-27
  ['MK-NW-O-004 theEmergencyFund', EMERGENCY_FUND_FIGURES],   // Q-NW-5, ruled 2026-09-27
  ['MK-NW-O-006 theHolding', HOLDING_FIGURES],   // Q-NW-3 — one screen, no decision
  ['MK-NW-O-005 theAlternativesOutlook', ALTERNATIVES_OUTLOOK_FIGURES],   // Q-NW-6, split out 2026-09-27
  ['MK-NW-O-008 thePerformance', PERFORMANCE_FIGURES],   // Q-PF-1, ruled 2026-09-27
  ['MK-NW-O-007 theLookBack', LOOK_BACK_FIGURES],   // Q-PF-2 — one screen, no decision
  ['MK-CF-O-005 theContributionRoom', CONTRIBUTION_ROOM_FIGURES],   // Q-CF-4, ruled 2026-09-27
  ['MK-CF-O-006 theCreditLine', CREDIT_LINE_FIGURES],   // Q-CF-6 — one screen, no decision
  ['MK-CF-O-007 theTaxOrganizer', TAX_ORGANIZER_FIGURES],   // Q-CF-5 — one screen, no decision
  ['MK-CF-O-008 whatsComing', WHATS_COMING_FIGURES],   // Q-CF-3, ruled 2026-09-27
  ['MK-CF-O-010 theMonth', THE_MONTH_FIGURES],   // Q-CF-2 — the last of the twelve
];

/* ─ MK-XS-F-181 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * merge
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     out = {}
 *     from = {}
 *     the answer = out
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-181
 * Changed ..... not in git yet (—)
 */
function merge(): Record<string, FigureSpec> {
  const out: Record<string, FigureSpec> = {};
  const from: Record<string, string> = {};
  for (const [door, figures] of DOORS) {
    for (const [id, spec] of Object.entries(figures)) {
      if (out[id]) throw new Error(`Figure ${id} is declared twice — by ${from[id]} and by ${door}. One figure, one door (rule 1).`);
      out[id] = spec; from[id] = door;
    }
  }
  return out;
}

export const FIGURE_REGISTER: Record<string, FigureSpec> = merge();
export const FIGURE_DOOR: Record<string, string> = Object.fromEntries(
  DOORS.flatMap(([door, figures]) => Object.keys(figures).map((id) => [id, door])),
);

/** The declaration behind an identifier, or a refusal that names the identifier — never a silent blank. */
/* ─ MK-XS-F-182 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * figureSpec
 *
 * Answers ..... The declaration behind an identifier, or a refusal that names the identifier — never a silent blank.
 *
 * Formula .....
 *     spec = FIGURE_REGISTER[id]
 *     the answer = spec
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-182
 * Changed ..... not in git yet (—)
 */
export function figureSpec(id: string): FigureSpec {
  const spec = FIGURE_REGISTER[id];
  if (!spec) throw new Error(`No figure is declared as ${id}. Declare it on the door that computes it (rule 11).`);
  return spec;
}
