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
import { assetClassOf, benchmarkReturn } from '../../../src/domain/assets';

export interface AlternativesOutlook {
  /** How many alternatives are held. */
  count: number;
  /** The blended yearly rate — each holding's benchmark, weighted by what it is worth. */
  expectedReturn: number;
  /** That rate in money, over a year. Null when nothing is held: zero would read as a forecast. */
  estimatedGrowthPerYear: number | null;
  /** The TOTAL the rows add to — the figure above them on the screen. */
  totalValue: number;
  /** ONE ROW PER ALTERNATIVE, from the door rather than built on the screen (2026-10-01).
   *  The screen filtered and summed the accounts itself while asking this door for the rate, which is
   *  how one surface comes to hold two answers. The rows add to `totalValue` by construction. */
  rows: AlternativeRow[];
}

export interface AlternativeRow {
  accountId: string;
  label: string;
  /** Where it is held, or '' — never a dash: the screen decides how to say nothing. */
  institution: string;
  value: number;
  /** The benchmark for its KIND, as a rate. Not the person's own target. */
  benchmark: number;
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
 *     accounts = input.accounts (or none when missing)
 *     s = alternatives summary(accounts)
 *
 * Called by ... MK-NW-F-076 ALT
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT
 *
 * Serves ...... MK-NW-M-050 · MK-NW-M-051 · MK-NW-M-052
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-003 institution name
 *               MK-XS-I-028 assumed return
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · If balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-NW-O-005
 * Changed ..... not in git yet (—)
 */
export function theAlternativesOutlook(input: { accounts: AssetAccount[] }): AlternativesOutlook {
  const accounts = input.accounts ?? [];
  const s = alternativesSummary(accounts);
  return {
    count: s.count,
    expectedReturn: s.blendedReturn,
    // nothing held is not a forecast of nothing — it is no forecast at all
    estimatedGrowthPerYear: s.count > 0 && s.totalValue > 0 ? s.estAnnualGrowth : null,
    totalValue: s.totalValue,
    rows: accounts
      .filter((a) => assetClassOf(a) === 'alternatives')
      .map((a) => ({
        accountId: String(a.asset_id),
        label: a.label || 'Other',
        institution: (a.institution || '').trim(),
        value: a.balance || 0,
        benchmark: benchmarkReturn(a.kind),
      })),
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
/* ─ MK-NW-F-076 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
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
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-076
 * Changed ..... not in git yet (—)
 */
const ALT = () => theAlternativesOutlook({ accounts: EXAMPLE });

/** THE FIGURES THIS DOOR HANDS OUT (rule 11). The master file's rows are printed from here. */
export const ALTERNATIVES_OUTLOOK_FIGURES = declareFigures({
  // RE-FILED FROM THE MENU FAMILY TO NET WORTH, 2026-10-01. It was MK-MN-M-023, issued under the
  // menu family for a figure declared on /other-investments and nowhere else. Alternatives is a Net
  // worth screen (his scope, DEC-0649), so the figure answered to the wrong family and sat outside
  // every Net worth check — which is how step 2.a of his seven steps found it. The register retires
  // MK-MN-M-023 with the reason rather than re-pointing it, because a number is issued once.
  // ISSUED AND DECLARED 2026-10-01. Step 2.a found the Alternatives screen showing three figures in
  // its summary while only two were declared: this rate and the per-holding row had no metric at all,
  // so neither was on the master file and neither could be checked against the screen.
  'MK-NW-M-051': {
    label: 'EXP. RETURN', unit: 'percent-2dp', screens: ['/other-investments'],
    grain: 'the household',
    answers: 'The one yearly rate your alternatives are expected to earn, taking each holding\'s own '
      + 'benchmark and weighting it by what that holding is worth.',
    formula: 'each holding\'s value × the benchmark for its kind, added up, ÷ the total value',
    inputs: ['MK-XS-I-001 account balance'],
    decisions: [
      'IT IS WEIGHTED BY VALUE, not an average of the rates: $28,000 of crypto and $500 of gold is '
      + 'almost entirely a crypto outlook, and averaging the two rates would say otherwise.',
      'TWO DECIMALS, because it is a rate (the precision standard, Q49) — it read to one until 2026-09.',
    ],
    refusal: 'Nothing held — no figure at all, because a 0.00% expected return reads as a forecast of '
      + 'nothing rather than an absence of holdings.',
    ruled: '2026-10-01',
    worked: {
      given: GIVEN,
      answer: '8.12%',
      run: () => ALT().expectedReturn,
    },
  },
  'MK-NW-M-052': {
    label: 'each alternative and what it is worth', unit: 'money', screens: ['/other-investments'],
    grain: 'one alternative holding',
    answers: 'Every alternative you hold, with its value, where it is held and the benchmark for its '
      + 'kind — so the total above can be read line by line.',
    formula: 'one row per account whose class is alternatives, its own balance beside it',
    inputs: ['MK-XS-I-001 account balance'],
    decisions: [
      'THE ROWS MUST ADD TO THE TOTAL ABOVE THEM. That is the whole reason the rows exist: a total '
      + 'nobody can take apart is a number you have to trust rather than check.',
    ],
    refusal: 'No rows, and the screen shows the sentence that says what belongs here instead.',
    ruled: '2026-10-01',
    worked: {
      given: GIVEN,
      answer: '$9,000',
      run: () => ALT().rows[0].value,     // gold, the first row — the rows add to $15,000
    },
  },
  'MK-NW-M-050': {
    label: 'EST. GROWTH /year', unit: 'money', per: 'year', screens: ['/other-investments'],
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
