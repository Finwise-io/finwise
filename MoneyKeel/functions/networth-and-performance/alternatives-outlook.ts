// Net worth · What might these investments earn in a year — the expected return, and the money it
// comes to.
//
// THE DOOR for Q-NW-6, split out of Q-NW-1 on the founder's "ok" (2026-09-27), answering his own
// question on that row: the Alternatives screen belongs in "what am I worth" only for its TOTAL
// VALUE, which must equal what the Net worth tab shows for that class. What it earns in a year is a
// FORWARD ESTIMATE, and a projection is not a worth figure.
//
// IT IS AN ESTIMATE AND SAYS SO. The rate is a historical benchmark for each KIND of thing held —
// what crypto or private equity has tended to do — never a promise about what this person's holding
// will do. The screen wears the estimate label; the door never hands back a figure that implies
// otherwise.
import { declareFigures } from '../_figure-spec';
import type { AssetAccount } from '../../../src/domain/assets';
import { alternativesSummary } from '../../../src/domain/alternatives';

export interface AlternativesOutlook {
  /** How many alternatives are held. */
  count: number;
  /** The blended yearly rate — each holding's benchmark, weighted by what it is worth. */
  expectedReturn: number;
  /** That rate in money, over a year. Null when nothing is held: zero would read as a forecast. */
  estimatedGrowthPerYear: number | null;
}

/* ─ MK-NW-O-005 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * theAlternativesOutlook
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     s = alternatives summary(input.accounts ?? [])
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... MK-NW-M-029 · MK-NW-M-030 · MK-NW-M-031 · MK-NW-M-033
 *               MK-NW-M-034 · MK-NW-M-035 · MK-NW-M-036 · MK-NW-M-037
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-NW-O-005
 * Changed ..... not in git yet (—)
 */
/** ── ORCHESTRATOR ─────────────────────────────────────────────────────────────────────
 *  The one function a screen calls for this question. Written as a DOC comment on purpose: the
 *  header generator owns the plain block comment below and rewrites it on every build, which is how
 *  all twelve doors lost this marker once and two were typed F instead of O (2026-09-28). */
/* ─ MK-NW-O-005 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * theAlternativesOutlook
 *
 * Answers ..... ── ORCHESTRATOR ───────────────────────────────────────────────────────────────────── The one function a screen calls for this question.
 *
 * Formula .....
 *     s = alternatives summary(input.accounts ?? [])
 *
 * Called by ... MK-NW-F-076 ALT
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT
 *
 * Serves ...... MK-MN-M-023
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-028 assumed return
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-O-005
 * Changed ..... not in git yet (—)
 */
export function theAlternativesOutlook(input: { accounts: AssetAccount[] }): AlternativesOutlook {
  const s = alternativesSummary(input.accounts ?? []);
  return {
    count: s.count,
    expectedReturn: s.blendedReturn,
    // nothing held is not a forecast of nothing — it is no forecast at all
    estimatedGrowthPerYear: s.count > 0 && s.totalValue > 0 ? s.estAnnualGrowth : null,
  };
}

/** THE WORKED EXAMPLE (six steps, step 6, 2026-09-28).
 *
 *  $9,000 of gold and $6,000 of bitcoin. The rate is NOT the person\'s own target: it is each kind\'s
 *  benchmark, weighted by what is held — 0.075 on commodities and 0.09 on crypto blend to 8.12%, and
 *  8.12% of $15,000 is $1,218/year. The example runs `theAlternativesOutlook`, the real door.
 */
const EXAMPLE = [
  { asset_id: 'a5', label: 'Gold', kind: 'commodities', tax_bucket: 'TAXABLE', balance: 9000, target_return: 0, asset_class: 'alternatives' },
  { asset_id: 'a6', label: 'Bitcoin', kind: 'crypto', tax_bucket: 'TAXABLE', balance: 6000, target_return: 0, asset_class: 'alternatives' },
] as any[];
const GIVEN = '$9,000 of gold and $6,000 of bitcoin — $15,000 of other investments, at their kinds\' own benchmark rates.';
/* ─ MK-NW-F-076 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * ALT
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-076
 * Changed ..... not in git yet (—)
 */
const ALT = () => theAlternativesOutlook({ accounts: EXAMPLE });

/** THE FIGURES THIS DOOR HANDS OUT (rule 11). The master file's rows are printed from here. */
export const ALTERNATIVES_OUTLOOK_FIGURES = declareFigures({
  'MK-MN-M-023': {
    label: 'EST. GROWTH', unit: 'money', per: 'year', screens: ['/other-investments'],
    answers: 'What your alternatives might earn in a year, at the rates these kinds of things have historically paid.',
    formula: 'each holding’s value × the historical benchmark for its kind, added up',
    inputs: ['MK-NW-I-001 your accounts'],
    decisions: [
      'An ESTIMATE, and it wears the estimate label: a historical benchmark for the KIND of thing held, never a promise about this holding.',
      'FOUNDER 2026-09-27 ("ok"): split out of "what am I worth". The Alternatives TOTAL belongs there because it must equal what the Net worth tab shows for that class; a projection does not.',
    ],
    refusal: 'Nothing held — no figure at all, because a $0 forecast reads as a forecast.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$1,218/year',
      run: () => ALT().estimatedGrowthPerYear,
    },
  },
});
