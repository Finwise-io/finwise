// Net worth · How is this one holding doing — value, cost, gains realised and unrealised.
//
// THE DOOR for Q-NW-3, which carries no decision for the founder: one screen, one question.
//
// IT REFUSES RATHER THAN GUESSES, in two places that were paid for once already:
//   · with no price today, the holding shows WHAT YOU PAID and says so — it is never priced at zero,
//     and the gain, the return and the tax estimate simply do not appear (rule r30);
//   · a dividend row belongs to this holding only when the record NAMES this ticker. The same rule
//     the account page carries, for the same reason: an untickered row belongs to no holding.
import { declareFigures } from '../_figure-spec';
import {
  totalShares, costBasis, capGains, marketValue, type Position, type CapGains,
} from '../../../src/domain/performance';
import { realizedFromLedger, type RealizedResult } from '../../../src/domain/performance/realized';

export interface HoldingAnswer {
  ticker: string;
  name: string;
  shares: number;
  /** True once every share is sold — the screen says "Holding liquidated", never a $0 position. */
  closed: boolean;
  /** What was paid for what is still held. */
  totalPaid: number;
  /** Per share, unrounded — rounding happens at display (Q49), not here. */
  avgPaidPerShare: number;
  /** Today's price, or null when none is held. */
  price: number | null;
  /** What it is worth. With no price this is WHAT YOU PAID, and `priced` says so. */
  value: number;
  priced: boolean;
  /** Only when priced: what it has gained, and the return on what was paid. */
  gain: number | null;
  returnOnCost: number | null;
  /** Only when priced: the gain split by how long it has been held. */
  capitalGains: CapGains | null;
  /** Dividends whose record NAMES this ticker. */
  dividends: { trailing12: number; allTime: number };
  /** What earlier sales of this holding actually made — and how many sales could NOT be priced
   *  honestly, because no purchase was ever recorded for them. A figure that leaves those out
   *  silently is the one that gets trusted and is wrong. */
  realised: RealizedResult;
}

/* ─ MK-NW-O-006 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * theHolding
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     now = input.now (or new date() when missing)
 *     p = input.position
 *     ticker = string((p as any).ticker ?? '')
 *     shares = total shares(p)
 *     paid = cost basis(p)
 *     priced = input.price ≠ nothing
 *     value = market value(p, input.price as number)   if priced
 *     paid   otherwise
 *     a year ago = the first 10 of the date now.get time() − 365 × 24 × 3600 × 1000).to isostring(
 *     div rows = named where type = 'DIVIDEND'
 *     sum = Σ over (list: any[]) => list of (amount (or 0 when missing or zero))
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... MK-MN-M-023
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-009 transaction date
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Decides .....
 *     · If amount is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-NW-O-006
 * Changed ..... not in git yet (—)
 */
/** ── ORCHESTRATOR ─────────────────────────────────────────────────────────────────────
 *  The one function a screen calls for this question. Written as a DOC comment on purpose: the
 *  header generator owns the plain block comment below and rewrites it on every build, which is how
 *  all twelve doors lost this marker once and two were typed F instead of O (2026-09-28). */
/* ─ MK-NW-O-006 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * theHolding
 *
 * Answers ..... ── ORCHESTRATOR ───────────────────────────────────────────────────────────────────── The one function a screen calls for this question.
 *
 * Formula .....
 *     now = input.now (or new date() when missing)
 *     p = input.position
 *     ticker = string((p as any).ticker ?? '')
 *     shares = total shares(p)
 *     paid = cost basis(p)
 *     priced = input.price ≠ nothing
 *     value = market value(p, input.price as number)   if priced
 *     paid   otherwise
 *     a year ago = the first 10 of the date now.get time() − 365 × 24 × 3600 × 1000).to isostring(
 *     div rows = named where type = 'DIVIDEND'
 *     sum = Σ over (list: any[]) => list of (amount (or 0 when missing or zero))
 *
 * Called by ... MK-NW-F-080 HOLD
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-080 HOLD
 *
 * Serves ...... MK-NW-M-029 · MK-NW-M-030 · MK-NW-M-031 · MK-NW-M-033
 *               MK-NW-M-034 · MK-NW-M-035 · MK-NW-M-036 · MK-NW-M-037
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-009 transaction date
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Decides .....
 *     · If amount is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-NW-O-006
 * Changed ..... not in git yet (—)
 */
export function theHolding(input: {
  position: Position;
  accountId: string;
  price: number | null;
  transactions: any[];
  now?: Date;
}): HoldingAnswer {
  const now = input.now ?? new Date();
  const p = input.position;
  const ticker = String((p as any).ticker ?? '');
  const shares = totalShares(p);
  const paid = costBasis(p);
  const priced = input.price != null;
  // r30: NO PRICE, NO INVENTED VALUE. The holding shows what was paid, and every figure that needs a
  // price refuses — a holding priced at zero would quietly shrink the whole portfolio.
  const value = priced ? marketValue(p, input.price as number) : paid;

  const named = (input.transactions ?? []).filter(
    (t) => !!t.ticker && String(t.ticker).toUpperCase() === ticker.toUpperCase());
  const aYearAgo = new Date(now.getTime() - 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const divRows = named.filter((t) => t.type === 'DIVIDEND');
  const sum = (list: any[]) => list.reduce((t, x) => t + (x.amount || 0), 0);

  return {
    ticker,
    name: String((p as any).label ?? '').trim() || ticker,
    shares,
    closed: shares <= 0,
    totalPaid: paid,
    avgPaidPerShare: shares > 0 ? paid / shares : 0,
    price: input.price ?? null,
    value,
    priced,
    gain: priced ? value - paid : null,
    returnOnCost: priced && paid > 0 ? (value - paid) / paid : null,
    capitalGains: priced ? capGains(p, input.price as number, now) : null,
    dividends: {
      trailing12: sum(divRows.filter((t) => String(t.date) >= aYearAgo)),
      allTime: sum(divRows),
    },
    realised: realizedFromLedger(input.transactions ?? [], { ticker, accountId: input.accountId }),
  };
}

/** THE WORKED EXAMPLE — ONE HOLDING, EVERY FIGURE ON THIS DOOR (six steps, step 6, 2026-09-28).
 *
 *  140 shares of VTI in two lots — 100 bought at $210 in March 2023, 40 at $265 in June 2026 — priced
 *  at $290 on 28 September 2026, with two dividends and one sell in the records. Every figure runs
 *  `theHolding`, the real door.
 *
 *  TWO LOTS AT DIFFERENT AGES IS THE POINT: on 28 Sep 2026 the 2023 lot is long-term and the 2026 lot
 *  is not, so the gain splits $8,000 long and $1,000 short. A single-lot example would never show
 *  that the split is what the holding is FOR.
 */
const EXAMPLE_POSITION = { position_id: 'p1', ticker: 'VTI', label: 'Vanguard Total Market', unit: 'shares',
  last_price: 290,
  lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 210, purchase_date: '2023-03-15' },
         { lot_id: 'l2', shares: 40, cost_per_share: 265, purchase_date: '2026-06-01' }] } as any;
const EXAMPLE_LEDGER = [
  { txn_id: 't1', account_id: 'a2', ticker: 'VTI', type: 'DIVIDEND', amount: 420, date: '2026-06-20' },
  { txn_id: 't2', account_id: 'a2', ticker: 'VTI', type: 'DIVIDEND', amount: 405, date: '2026-03-20' },
  { txn_id: 't3', account_id: 'a2', ticker: 'VTI', type: 'BUY', shares: 20, price: 200, amount: 4000, date: '2024-02-01' },
  { txn_id: 't4', account_id: 'a2', ticker: 'VTI', type: 'SELL', shares: 20, price: 285, amount: 5700, date: '2026-08-10' },
] as any[];
const GIVEN =
  '140 shares of VTI on 28 Sep 2026, priced at $290: 100 bought at $210 in Mar 2023 and 40 at $265 in '
  + 'Jun 2026. Dividends of $420 and $405 this year; 20 shares bought at $200 were sold at $285.';
/* ─ MK-NW-F-080 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * HOLD
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-080
 * Changed ..... not in git yet (—)
 */
const HOLD = () => theHolding({ position: EXAMPLE_POSITION, accountId: 'a2', price: 290,
  transactions: EXAMPLE_LEDGER, now: new Date('2026-09-28T12:00:00') });

/** THE FIGURES THIS DOOR HANDS OUT (rule 11). The master file's rows are printed from here. */
export const HOLDING_FIGURES = declareFigures({
  'MK-NW-M-029': {
    label: 'CURRENT PRICE · LIVE', unit: 'money-cents', screens: ['/holding-detail'], grain: 'one holding',
    answers: 'What one share is worth right now, and how fresh that price is.',
    formula: 'the last close the price feed holds for this ticker',
    inputs: ['MK-NW-I-005 the price feed'],
    decisions: ['A price that has gone stale says its age rather than passing as today’s.'],
    refusal: 'No price — the screen shows what you paid instead, and says so.',
    ruled: '2026-09-28',
    worked: {
      given: GIVEN,
      answer: '$290.00',
      run: () => HOLD().price,
    },
  },
  'MK-NW-M-030': {
    label: 'Current value', unit: 'money', screens: ['/holding-detail'], grain: 'one holding',
    answers: 'What this holding is worth today.',
    formula: 'shares × today’s price',
    inputs: ['MK-NW-I-001 your accounts', 'MK-NW-I-005 the price feed'],
    decisions: ['r30: with NO price it shows what you paid, never a zero — a holding priced at zero would quietly shrink your whole portfolio.'],
    refusal: 'No price — it shows what you paid, labelled as that.',
    ruled: '2026-09-28',
    worked: {
      given: GIVEN,
      answer: '$40,600',
      run: () => HOLD().value,
    },
  },
  'MK-NW-M-031': {
    label: 'Quantity — n shares', unit: 'count', screens: ['/holding-detail'], grain: 'one holding',
    answers: 'How many shares you still hold.',
    formula: 'the shares of every lot still held, added up',
    inputs: ['MK-NW-I-001 your accounts'],
    refusal: 'All sold — the screen says the holding is liquidated rather than showing 0 shares.',
    ruled: '2026-09-28',
    worked: {
      given: GIVEN,
      answer: '140',
      run: () => HOLD().shares,
    },
  },
  'MK-NW-M-032': {
    label: 'Price paid (average)', unit: 'money-cents', screens: ['/holding-detail'], grain: 'one holding',
    answers: 'What you paid per share, on average, for what you still hold.',
    formula: 'what you paid in total ÷ the shares you still hold',
    inputs: ['MK-NW-I-001 your accounts'],
    decisions: ['Kept unrounded inside, rounded once at display (Q49) — rounding it early moved the total it multiplies back into.'],
    refusal: 'No purchase price recorded.',
    ruled: '2026-09-28',
    worked: {
      given: GIVEN,
      answer: '$225.71',
      run: () => HOLD().avgPaidPerShare,
    },
  },
  'MK-NW-M-033': {
    label: 'Total paid', unit: 'money', screens: ['/holding-detail'], grain: 'one holding',
    answers: 'What you paid for the shares you still hold.',
    formula: 'the cost of every lot still held, added up',
    inputs: ['MK-NW-I-001 your accounts'],
    refusal: 'No purchase price recorded.',
    ruled: '2026-09-28',
    worked: {
      given: GIVEN,
      answer: '$31,600',
      run: () => HOLD().totalPaid,
    },
  },
  'MK-NW-M-034': {
    label: 'Dividends received (12 mo)', unit: 'money', screens: ['/holding-detail'], grain: 'one holding',
    answers: 'What this holding has paid you over the last twelve months.',
    formula: 'the DIVIDEND records naming this ticker, dated within the last year',
    inputs: ['MK-NW-I-004 the activity records'],
    decisions: ['A record that names no ticker belongs to no holding — the same rule the account page carries.'],
    refusal: 'No records naming this holding — the line does not appear.',
    ruled: '2026-09-28',
    worked: {
      given: GIVEN,
      answer: '$825',
      run: () => HOLD().dividends.trailing12,
    },
  },
  'MK-NW-M-035': {
    label: 'Realized gain from your buys and sells', unit: 'money', screens: ['/holding-detail'], grain: 'one holding',
    answers: 'What your earlier sales of this holding actually made.',
    formula: 'for each sale: what it sold for, less what those shares cost',
    inputs: ['MK-NW-I-004 the activity records'],
    refusal: 'Nothing sold yet.',
    ruled: '2026-09-28',
    worked: {
      given: GIVEN,
      answer: '$1,700',
      run: () => HOLD().realised.realizedAllTime,
    },
  },
  'MK-NW-M-036': {
    label: 'Gain — long-term (held over 1 yr)', unit: 'money', screens: ['/holding-detail'], grain: 'one holding',
    answers: 'The gain on shares you have held more than a year — the part taxed at the lower rate.',
    formula: 'for each lot bought over a year ago: shares × (today’s price − what you paid)',
    inputs: ['MK-NW-I-001 your accounts', 'MK-NW-I-005 the price feed'],
    refusal: 'No price today — no gain is stated at all.',
    ruled: '2026-09-28',
    worked: {
      given: GIVEN,
      answer: '$8,000',
      run: () => HOLD().capitalGains!.longGain,
    },
  },
  'MK-NW-M-037': {
    label: 'Gain — short-term (under 1 yr)', unit: 'money', screens: ['/holding-detail'], grain: 'one holding',
    answers: 'The gain on shares held under a year — the part taxed as ordinary income.',
    formula: 'for each lot bought within the year: shares × (today’s price − what you paid)',
    inputs: ['MK-NW-I-001 your accounts', 'MK-NW-I-005 the price feed'],
    refusal: 'No price today — no gain is stated at all.',
    ruled: '2026-09-28',
    worked: {
      given: GIVEN,
      answer: '$1,000',
      run: () => HOLD().capitalGains!.shortGain,
    },
  },
});
