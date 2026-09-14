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

/** identifier → who declared it, so a clash names both doors. */
const DOORS: [string, Record<string, FigureSpec>][] = [
  ['MK-CF-O-001 basePay', basePayFigures],
  ['MK-CF-O-004 incomeSummary', incomeSummaryFigures],
  ['MK-CF-O-003 thisMonth', thisMonthFigures],
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
