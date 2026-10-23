// Performance · What would this holding be worth had I moved it — the look-back.
//
// THE DOOR for Q-PF-2. One screen, one question, so it carried no decision for the founder.
//
// WHAT IT REFUSES, AND WHY IT MATTERS MORE HERE THAN ANYWHERE. This screen is about a road not
// taken, so a figure that quietly fills a gap does not read as an estimate — it reads as what would
// have happened. With no price history for either fund over the whole window, there is NO answer:
// not a zero, not a partial window silently shortened. The screen's own title says it — "Facts about
// the PAST only".
import { declareFigures } from '../_figure-spec';
import { formatMoney } from '../../../src/domain/_shared/money';
import { lookBack, type LookBackResult } from '../../../src/domain/performance/lookBack';

/** What would this holding be worth today had I put the same money into something else on the same days?
 *  ── ORCHESTRATOR ── the one function a screen asks for this.
 *  The one function a screen calls for this question. Written as a DOC comment on purpose: the
 *  header generator owns the plain block comment below and rewrites it on every build, which is how
 *  all twelve doors lost this marker once and two were typed F instead of O (2026-09-28). */
/* ─ MK-NW-O-007 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * theLookBack
 *
 * Answers ..... What would this holding be worth today had I put the same money into something else on the same days?
 *
 * Formula .....
 *     look back(input.amount, input.from series, input.to series, input.months, input.now ?? new date())
 *
 * Called by ... MK-NW-F-081 LB
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-081 LB
 *
 * Serves ...... MK-PF-M-010 · MK-PF-M-011 · MK-PF-M-012 · MK-PF-M-025
 *               MK-PF-M-026
 * Reads ....... MK-XS-I-005 holding price
 * Ruled by .... DEC-0030 · DEC-1069
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-NW-O-007
 * Changed ..... not in git yet (—)
 */
export function theLookBack(input: {
  amount: number;
  /** The price history of the fund it is in, and of the one it might have moved to. */
  fromSeries: any;
  toSeries: any;
  months: number;
  now?: Date;
}): LookBackResult | null {
  // null is the honest answer: no history for either fund over the whole window means there is
  // nothing to say, and saying nothing is not the same as saying zero
  return lookBack(input.amount, input.fromSeries, input.toSeries, input.months, input.now ?? new Date());
}

/** THE WORKED EXAMPLE (six steps, step 6, 2026-09-28).
 *
 *  $10,000 that sat in BND for a year while VTI ran. BND went $72.00 → $73.80 (+2.5%), so the money
 *  became $10,250; VTI went $250 → $290 (+16%), so moved it would have been $11,600. The difference
 *  is $1,350. Every figure runs `theLookBack`, the real door, against those real closes.
 *
 *  It is a fact about the past and never a recommendation — which is why the example names both ends
 *  of each price, so a person can do the division themselves.
 */
const TODAY = new Date('2026-09-28T12:00:00');
const EXAMPLE = {
  amount: 10000,
  fromSeries: { ticker: 'BND', points: [{ date: '2025-09-01', close: 72.00 }, { date: '2026-09-25', close: 73.80 }] },
  toSeries: { ticker: 'VTI', points: [{ date: '2025-09-01', close: 250.00 }, { date: '2026-09-25', close: 290.00 }] },
  months: 12,
  now: TODAY,
};
const GIVEN =
  '$10,000 left in BND for 12 months, against moving it to VTI. BND closed $72.00 a year ago and '
  + '$73.80 now; VTI closed $250.00 and $290.00.';

/** Example only: runs theLookBack on the worked example and calculates nothing of its own. */
/* ─ MK-NW-F-081 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * LB
 *
 * Answers ..... Example only: runs theLookBack on the worked example and calculates nothing of its own.
 *
 * Formula .....
 *     the look back(EXAMPLE)!
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-081
 * Changed ..... not in git yet (—)
 */
const LB = () => theLookBack(EXAMPLE)!;

/** THE FIGURES THIS DOOR HANDS OUT (rule 11). The master file's rows are printed from here. */
export const LOOK_BACK_FIGURES = declareFigures({
  'MK-PF-M-010': {
    label: 'Left in <fund> it became $X (up/down $Y, Z%)', unit: 'money', screens: ['/look-back'],
    answers: 'What your money actually did, where it actually was.',
    formula: 'the amount × (the fund’s price today ÷ its price at the start of the window)',
    inputs: ['MK-NW-I-005 the price feed'],
    // corrected 2026-10-12 (DEC-4645): this said "Price changes only — dividends are not in it, and the screen says
    // so". Both were false: the look-back reads the same dividend-adjusted closes, and the screen never said it.
    decisions: ['Dividends and distributions are in it: the closes it reads are adjusted for them (corrected 2026-10-12; it said price changes only).'],
    refusal: 'No price history over the whole window — the screen shows nothing rather than a shortened one.',
    ruled: '2026-09-28',
    worked: {
      given: GIVEN,
      // the figure is the money; the screen writes the sentence around it (2026-10-01: unit money, not words,
      // so the end value and the change print through fig() with their identifier)
      answer: '$10,250',
      run: () => LB().stayed.endValue,
    },
  },
  'MK-PF-M-011': {
    label: 'Moved to <fund> it would be $X', unit: 'money', screens: ['/look-back'],
    answers: 'What the same money would have become in the other fund.',
    formula: 'the amount × (the other fund’s price today ÷ its price at the start of the window)',
    inputs: ['MK-NW-I-005 the price feed'],
    decisions: ['A road not taken, priced from real history — never a projection forward.'],
    refusal: 'No price history for the other fund over the whole window.',
    ruled: '2026-09-28',
    worked: {
      given: GIVEN,
      answer: '$11,600',
      run: () => LB().moved.endValue,
    },
  },
  'MK-PF-M-012': {
    label: 'Difference: $X more/less if you had moved', unit: 'money', screens: ['/look-back'],
    answers: 'What the move would have been worth, in money.',
    formula: 'what it would have become, less what it did become',
    inputs: ['MK-NW-I-005 the price feed'],
    refusal: 'Either fund missing its history means no difference is stated.',
    ruled: '2026-09-28',
    worked: {
      given: GIVEN,
      answer: '$1,350',
      run: () => LB().difference,
    },
  },
  // ISSUED AND DECLARED 2026-10-21 (Performance audit row 9, rule 11): the percent in brackets after each line printed by hand
  // (toFixed) with no identifier, because the guard that counts unnamed figures read dollars only. Issued under rule 11 and
  // Q49; `ruled` is the issue date, as MK-NW-M-065 and 066 were. To reverse: delete the two rows and print toFixed again.
  'MK-PF-M-025': {
    label: 'Left in <fund> it became $X (up/down $Y, Z%) \u2014 the Z%', unit: 'percent-signed', screens: ['/look-back'],
    answers: 'How much the fund your money was in grew or fell over the window, in percent.',
    formula: 'the fund\u2019s price today \u00f7 its price at the start of the window, less 1',
    inputs: ['MK-NW-I-005 the price feed'],
    decisions: ['TWO DECIMALS AND ITS SIGN (Q49): +2.50%, \u22122.50%.',
      'Dividends and distributions are in it: the closes it reads are adjusted for them (DEC-4645).'],
    refusal: 'No price history over the whole window \u2014 the screen shows nothing rather than a shortened one.',
    ruled: '2026-10-21',
    // BND $72.00 \u2192 $73.80: $73.80 \u00f7 $72.00 \u2212 1 = +2.50%
    worked: { given: GIVEN, answer: '+2.50%', run: () => LB().stayed.pct / 100 },
  },
  'MK-PF-M-026': {
    label: 'Moved to <fund> it would be $X (up/down $Y, Z%) \u2014 the Z%', unit: 'percent-signed', screens: ['/look-back'],
    answers: 'How much the other fund grew or fell over the same window, in percent.',
    formula: 'the other fund\u2019s price today \u00f7 its price at the start of the window, less 1',
    inputs: ['MK-NW-I-005 the price feed'],
    decisions: ['TWO DECIMALS AND ITS SIGN (Q49).', 'A road not taken, priced from real history \u2014 never a projection forward.'],
    refusal: 'No price history for the other fund over the whole window.',
    ruled: '2026-10-21',
    // VTI $250.00 \u2192 $290.00: $290.00 \u00f7 $250.00 \u2212 1 = +16.00%
    worked: { given: GIVEN, answer: '+16.00%', run: () => LB().moved.pct / 100 },
  },
});
