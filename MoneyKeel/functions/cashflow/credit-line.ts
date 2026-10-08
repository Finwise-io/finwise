// Cash flow · How much of my credit line is used.
//
// THE DOOR for Q-CF-6. One screen, one figure, no decision for the founder.
//
// THE ONE THING IT WILL NOT DO: with no limit entered there is no ratio. Not zero — zero would read
// as "you have used none of your credit", which is the opposite of "we do not know your limit".
import { declareFigures } from '../_figure-spec';
import { creditUtilization } from '../../../src/domain/debt';

export interface CreditLine {
  balance: number;
  limit: number;
  /** The share of the line in use, 0…1 — null when no limit is known. */
  used: number | null;
  /** 'good' under 30%, 'caution' to 50%, 'high' above. Null when there is no ratio. */
  status: 'good' | 'caution' | 'high' | null;
}

/** How much of my credit limit am I using?
 *  ── ORCHESTRATOR ── the one function a screen asks for this.
 *  The one function a screen calls for this question. Written as a DOC comment on purpose: the
 *  header generator owns the plain block comment below and rewrites it on every build, which is how
 *  all twelve doors lost this marker once and two were typed F instead of O (2026-09-28). */
/* ─ MK-CF-O-006 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * theCreditLine
 *
 * Answers ..... How much of my credit limit am I using?
 *
 * Formula .....
 *     balance = input.balance (or 0 when missing or zero)
 *     limit = input.limit (or 0 when missing or zero)
 *     balance = balance
 *     limit = limit
 *     used = nothing
 *     status = nothing   when not (limit > 0)
 *     u = credit utilization(balance, limit)
 *     the answer:
 *     balance = balance
 *     limit = limit
 *     used = ratio
 *     status = status
 *
 * Called by ... MK-CF-F-200 LINE
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-NW-F-101 PLAN
 *               MK-NW-F-002 alternativesSummary · MK-NW-O-005 theAlternativesOutlook
 *
 * Serves ...... MK-MN-M-006
 * Reads ....... MK-XS-I-001 account balance
 *
 * Decides .....
 *     · If balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If limit is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-006
 * Changed ..... not in git yet (—)
 */
export function theCreditLine(input: { balance: number; limit: number }): CreditLine {
  const balance = input.balance || 0;
  const limit = input.limit || 0;
  if (!(limit > 0)) return { balance, limit, used: null, status: null };
  const u = creditUtilization(balance, limit);
  return { balance, limit, used: u.ratio, status: u.status };
}

/** THE WORKED EXAMPLE (six steps, step 6, 2026-09-28).
 *
 *  $3,100 owed against a $12,000 limit — 25.8% of the line, which is under the 30% the screen marks,
 *  so the door calls it good. It runs `theCreditLine`, the real door.
 */
const GIVEN = '$3,100 owed on the cards against $12,000 of total limit — 25.8% of the line in use.';

/** Example only: runs theCreditLine on the worked example and calculates nothing of its own. */
/* ─ MK-CF-F-200 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * LINE
 *
 * Answers ..... Example only: runs theCreditLine on the worked example and calculates nothing of its own.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-002 alternativesSummary · MK-NW-F-098 LEDGER_BAND
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-101 PLAN · MK-NW-F-002 alternativesSummary
 *               MK-NW-O-005 theAlternativesOutlook
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-200
 * Changed ..... not in git yet (—)
 */
const LINE = () => theCreditLine({ balance: 3100, limit: 12000 });

/** THE FIGURE THIS DOOR HANDS OUT (rule 11). The master file's row is printed from here. */
export const CREDIT_LINE_FIGURES = declareFigures({
  'MK-MN-M-006': {
    label: '$X of $Y used — the line marks 30%', unit: 'money', screens: ['/credit'],
    answers: 'How much of your available credit you are using.',
    formula: 'what is owed on your cards ÷ the total limit across them',
    inputs: ['MK-NW-I-002 your debts'],
    decisions: ['Under 30% is the mark the line shows, because that is the level credit scoring treats as unstretched.'],
    refusal: 'No limit entered — there is no ratio, and a 0% would read as "you have used none of it".',
    ruled: '2026-09-28',
    worked: {
      given: GIVEN,
      answer: '$3,100',
      run: () => LINE().balance,
    },
  },
});
