// Net worth · How is this one holding doing — value, cost, gains realised and unrealised.
//
// THE DOOR for Q-NW-3, which carries no decision for the founder: one screen, one question.
//
// IT REFUSES RATHER THAN GUESSES, in two places that were paid for once already:
//   · with no price today, the holding shows WHAT YOU PAID and says so — it is never priced at zero,
//     and the gain, the return and the tax estimate simply do not appear (rule r30);
//   · a dividend row belongs to this holding only when the record NAMES this ticker AND sits in this
//     account. The same rule the account page carries, for the same reason: an untickered row belongs
//     to no holding, and a row in another account belongs to that account's holding (2026-10-20).
import { declareFigures } from '../_figure-spec';
import {
  totalShares, capGains, marketValue, contractMultiplier, lotCostOnRecord, paidOnRecord, unrealizedGain, totalROI,
  quantityWithUnit, SECTION_1256_LONG_TERM_PERCENT, type Position, type CapGains,
} from '../../../src/domain/performance';
import { realizedFromLedger, type RealizedResult } from '../../../src/domain/performance/realized';
import { moneyIntoAccount } from '../../../Calculation Module code/engines/ledger';
import { taxTreatmentOf, type AssetAccount } from '../../../src/domain/assets';

export interface HoldingAnswer {
  ticker: string;
  name: string;
  /** Null when a purchase has no share count — unknown, never 0 (tenet 3; outside review Claude Performance, 2026-10-11). */
  shares: number | null;
  /** True once every share is sold — the screen says "Holding liquidated", never a $0 position. */
  closed: boolean;
  /** What was paid for what is still held, over the purchases whose price paid is on record (paidOnRecord, 2026-10-20) — the
   *  same purchases the average and the gains count; `avgLeavesOut` is how many units it leaves out. Null when a share count
   *  is not on record, or no purchase has a price paid on record. */
  totalPaid: number | null;
  /** Per share, unrounded — rounding happens at display (Q49), not here. Taken over the purchases whose price paid is on
   *  record (lotCostOnRecord) — a purchase with none is left out, never read as $0 (2026-10-20). Null with no shares
   *  held, a share count not on record, or no purchase with a price paid on record. */
  avgPaidPerShare: number | null;
  /** The shares the average leaves out because what was paid for them is not on record — the page says so. 0 when
   *  none is left out; null when a share count is not on record. */
  avgLeavesOut: number | null;
  /** Today's price, or null when none is held. */
  price: number | null;
  /** What it is worth. With no price this is WHAT YOU PAID, and `priced` says so. Null when that is not known. */
  value: number | null;
  priced: boolean;
  /** Only when priced: what it has gained, and the return on what was paid. */
  gain: number | null;
  /** WHAT IT MOVED SINCE THE PREVIOUS CLOSE, in money and as a share of that close.
   *  Null when fewer than two closes are known: one price is a price, not a change.
   *  It was calculated on HoldingDetailScreen from the price series — a money figure derived inline on
   *  a screen, which is the one thing the one-door rule forbids (2026-10-01). */
  dayChange: { amount: number; share: number } | null;
  returnOnCost: number | null;
  /** EACH PURCHASE, oldest first — what the average cost is made of, so it can be checked rather
   *  than trusted. The screen read `position.lots` directly, which is the position's own shape
   *  leaking onto a screen; the door names the three things a person reads and nothing else. */
  purchases: { lotId: string; date: string; shares: number; costPerShare: number | null }[];
  /** Only when priced: the gain split by how long it has been held — a purchase with no purchase date on record in neither
   *  part, and an option on a broad-based index 60/40 by law (MK-PF-F-006 capGains, 2026-10-21). */
  capitalGains: CapGains | null;
  /** TRUE WHEN THE HOLDING SITS IN AN ACCOUNT TAXED AS PRE-TAX OR TAX-FREE — a 401(k), a Traditional IRA, a Roth IRA, a Roth
   *  401(k), an HSA or a 529 (MK-NW-F-012 taxTreatmentOf, 2026-10-21). A sale inside such an account is not taxed as a
   *  capital gain, so the long-term / short-term split has no tax meaning there and the page shows the gain whole. IRS
   *  Publication 550: "The rules in this publication do not apply to investments held in individual retirement
   *  arrangements (IRAs), section 401(k) plans, and other qualified retirement plans." An account whose tax type is not
   *  stated keeps the split. */
  notCapitalGains: boolean;
  /** Dividends whose record NAMES this ticker and sits in this account. */
  dividends: { trailing12: number; allTime: number };
  /** What earlier sales of this holding actually made — and how many sales could NOT be priced
   *  honestly, because no purchase was ever recorded for them. A figure that leaves those out
   *  silently is the one that gets trusted and is wrong. */
  realised: RealizedResult;
}

/** How is this one holding doing: its value, its cost, and its gains realised and not yet realised?
 *  ── ORCHESTRATOR ── the one function a screen asks for this.
 *  The one function a screen calls for this question. Written as a DOC comment on purpose: the
 *  header generator owns the plain block comment below and rewrites it on every build, which is how
 *  all twelve doors lost this marker once and two were typed F instead of O (2026-09-28). */
/* ─ MK-NW-O-006 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * theHolding
 *
 * Answers ..... How is this one holding doing: its value, its cost, and its gains realised and not yet realised?
 *
 * Formula .....
 *     now = input.now (or new date() when missing)
 *     p = input.position
 *     ticker = string((p as any).ticker ?? '')
 *     shares = total shares(p)
 *     paid = paid on record(p).paid
 *     priced = input.price ≠ nothing
 *     treatment = tax treatment of(input.account)   if input.account
 *     'not_stated'   otherwise
 *     value = market value(p, input.price as number)   if priced
 *     paid   otherwise
 *     tk = ticker.trim().to upper case()
 *     a year ago = the first 10 of the date now.get time() − 365 × 24 × 3600 × 1000).to isostring(
 *     div rows = named where type = 'DIVIDEND'
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-080 HOLD
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-080 HOLD
 *
 * Serves ...... MK-NW-M-029 · MK-NW-M-030 · MK-NW-M-031 · MK-NW-M-032
 *               MK-NW-M-033 · MK-NW-M-034 · MK-NW-M-035 · MK-NW-M-036
 *               MK-NW-M-037 · MK-NW-M-059 · MK-NW-M-060 · MK-NW-M-061
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-009 transaction date
 *               MK-XS-I-024 logged expenses
 * Ruled by .... DEC-0092 · DEC-0108 · DEC-0152 · DEC-0165 · DEC-0264 · DEC-0301
 *               DEC-0310 · DEC-0475 · DEC-0476
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
 *
 * Decides .....
 *     · If shares is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-NW-O-006
 * Changed ..... not in git yet (—)
 */
export function theHolding(input: {
  position: Position;
  accountId: string;
  /** The account the holding sits in — how it is taxed decides whether a sale is a capital gain (2026-10-21). */
  account?: AssetAccount | null;
  price: number | null;
  transactions: any[];
  now?: Date;
  /** The recent daily closes, oldest first. Two are enough for the day's change. */
  recentCloses?: number[];
}): HoldingAnswer {
  const now = input.now ?? new Date();
  const p = input.position;
  const ticker = String((p as any).ticker ?? '');
  const shares = totalShares(p);
  // WHAT WAS PAID IS READ ONE WAY ON THE WHOLE PAGE (2026-10-21; DEC-6627, tenet 4): over the purchases whose price paid is
  // on record (paidOnRecord), as Total paid, the average and the gains. With no price this is the large figure, and it was
  // read through costBasis, which counted a stored $0 as a real $0 and refused the whole figure for one purchase with no
  // price paid: 0.5 coins at $56,000 and 0.25 with none read no figure beside Total paid $28,000; one purchase stored at
  // $0 read $0 beside Total paid saying no purchase price recorded.
  const paid = paidOnRecord(p).paid;
  const priced = input.price != null;
  const treatment = input.account ? taxTreatmentOf(input.account) : 'not_stated';
  // r30: NO PRICE, NO INVENTED VALUE. The holding shows what was paid, and every figure that needs a
  // price refuses — a holding priced at zero would quietly shrink the whole portfolio.
  const value = priced ? marketValue(p, input.price as number) : paid;

  // THIS ACCOUNT'S RECORDS ONLY (2026-10-20). A holding is one ticker IN ONE ACCOUNT, and its sales are
  // already counted that way (realizedFromLedger, accountId below). The dividends matched the ticker across
  // EVERY account, so VTI held at Vanguard ($40 of dividends) and at Fidelity ($10) read $50 on both pages,
  // and the two pages added up to $100 against the $50 received. The ticker is trimmed the way the account
  // page reads it (MK-NW-O-002, "a broker's "VTI " is VTI"), so the two pages count one set of records.
  const tk = ticker.trim().toUpperCase();
  const named = (input.transactions ?? []).filter(
    (t) => String(t?.account_id ?? '') === String(input.accountId)
      && !!t.ticker && String(t.ticker).trim().toUpperCase() === tk);
  const aYearAgo = new Date(now.getTime() - 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const divRows = named.filter((t) => t.type === 'DIVIDEND');
  // the one rule for a stored amount (moneyIntoAccount, 2026-10-21): a −$50 dividend — a reversal — cancels, never adds
  const sum = (list: any[]) => list.reduce((t, x) => t + (moneyIntoAccount(x) ?? 0), 0);

  return {
    ticker,
    name: String((p as any).label ?? '').trim() || ticker,
    shares,
    closed: shares != null && shares <= 0,
    // OVER THE PURCHASES WHOSE PRICE PAID IS ON RECORD (2026-10-20), as the average and the gains: a blank price paid saved as
    // $0 made 10 at $100 and 10 with none read $1,000 for all 20; it is $1,000 for the 10, and the page names the other 10
    totalPaid: paid,
    // IN THE UNIT THE PRICE IS QUOTED IN. An option's price is per share and a contract is 100 of them;
    // total paid carries that 100, so the average is taken back per share — it read $683.33 beside a
    // price of $9.10 (outside review, 2026-10-04).
    // OVER THE PURCHASES WHOSE PRICE PAID IS ON RECORD (2026-10-20). It was what was paid ÷ every share, and a linked
    // purchase the broker sent with no cost was stored as $0 — so 10 shares at $100 and 10 with no cost read $50.00
    // while the gains below left the second purchase out. One rule now decides both (lotCostOnRecord). Taken per
    // share, as the price is quoted: Σ shares × cost ÷ Σ shares equals what was paid ÷ (shares × the multiplier).
    avgPaidPerShare: (() => {
      if (shares == null || !(shares > 0)) return null;
      const onRecord = ((p as any).lots ?? []).filter((l: any) => l.shares > 0 && lotCostOnRecord(l));
      const counted = onRecord.reduce((t: number, l: any) => t + l.shares, 0);
      return counted > 0 ? onRecord.reduce((t: number, l: any) => t + l.shares * l.cost_per_share, 0) / counted : null;
    })(),
    avgLeavesOut: shares == null ? null
      : ((p as any).lots ?? []).filter((l: any) => l.shares > 0 && !lotCostOnRecord(l)).reduce((t: number, l: any) => t + l.shares, 0),
    price: input.price ?? null,
    value,
    priced,
    // the gain and the return on what was paid count the same purchases as Total paid (unrealizedGain, totalROI — one reading)
    gain: priced ? unrealizedGain(p, input.price as number) : null,
    purchases: ((p as any).lots ?? []).map((l: any) => ({
      lotId: String(l.lot_id ?? ''),
      date: String(l.purchase_date ?? ''),
      shares: l.shares || 0,
      // a cost not on record stays not on record — it read 0 here (2026-10-20)
      costPerShare: lotCostOnRecord(l) ? l.cost_per_share : null,
    })),
    dayChange: (() => {
      const c = input.recentCloses ?? [];
      if (c.length < 2) return null;
      const last = c[c.length - 1], prev = c[c.length - 2];
      // a previous close of zero cannot be divided by, and a share of nothing is not a move
      return prev > 0 ? { amount: last - prev, share: (last - prev) / prev } : null;
    })(),
    returnOnCost: priced ? totalROI(p, input.price as number) : null,
    capitalGains: priced ? capGains(p, input.price as number, now) : null,
    notCapitalGains: treatment === 'tax_deferred' || treatment === 'tax_free',
    dividends: {
      trailing12: sum(divRows.filter((t) => String(t.date) >= aYearAgo)),
      allTime: sum(divRows),
    },
    // the holding is named, so an option's realised gain carries its contract multiplier (DEC-0274; outside review Claude Performance, 2026-10-11)
    realised: realizedFromLedger(input.transactions ?? [], { ticker, accountId: input.accountId, holding: p as any }),
  };
}

/** THE LINE FOR PURCHASES WITH NO PURCHASE DATE ON RECORD, under the gains if sold today (2026-10-21; tenet 3, DEC-3523):
 *  their gain, in the holding's own unit, and why it is in neither part — "$57 gain on 3.25 contracts whose purchase date
 *  is not on record, so it is neither long-term nor short-term." The shape of his line for sales (DEC-4643): the figure,
 *  what it counts, and what is not on record, in one sentence. */
/* ─ MK-NW-F-146 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * undatedGainSentence
 *
 * Answers ..... THE LINE FOR PURCHASES WITH NO PURCHASE DATE ON RECORD, under the gains if sold today (2026-10-21; tenet 3, DEC-3523): their gain, in the holding's own unit, and why it is in neither part — "$57 gain on 3.25 contracts whose purchase date is not on record, so it is neither long-term nor short-term." The shape of his line for sales (DEC-4643): the figure, what it counts, and what is not on record, in one sentence.
 *
 * Formula .....
 *     qty = quantity with unit(holding, undated.counted, count) (or count(undated.counted) when missing)
 *     the answer = `${money(math.abs(undated.gain))} ${undated.gain < 0 ? 'loss' : 'gain'} on ${qty} whose purchase date is not on record, so it is neither long − term nor short − term.`
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-146
 * Changed ..... not in git yet (—)
 */
export function undatedGainSentence(
  undated: { gain: number; counted: number }, holding: Pick<Position, 'kind' | 'unit'>,
  money: (n: number) => string, count: (n: number) => string = String,
): string {
  const qty = quantityWithUnit(holding, undated.counted, count) ?? count(undated.counted);
  return `${money(Math.abs(undated.gain))} ${undated.gain < 0 ? 'loss' : 'gain'} on ${qty} whose purchase date is not on record, so it is neither long-term nor short-term.`;
}

/** THE LINE UNDER AN INDEX OPTION'S GAINS (2026-10-21): why its split is 60/40 and not by how long it was held. The shares are
 *  the law's, read from the one constant (SECTION_1256_LONG_TERM_PERCENT), and the source is named. */
export const SECTION_1256_LINE =
  `An index option's gain is taxed ${SECTION_1256_LONG_TERM_PERCENT}% long-term and ${100 - SECTION_1256_LONG_TERM_PERCENT}% short-term, however long it was held (IRS Publication 550).`;

/** THE LINE IN PLACE OF THE SPLIT inside an account taxed as pre-tax or tax-free (notCapitalGains, 2026-10-21). */
export const NOT_CAPITAL_GAINS_LINE = 'Gains inside this account are not taxed as capital gains, so they are not split into long-term and short-term.';

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
// a linked account's holding carries the broker's tag (ingest writes it) — without one it is Unclassified (DEC-2160)
const EXAMPLE_POSITION = { position_id: 'p1', ticker: 'VTI', asset_class: 'stock_etf', label: 'Vanguard Total Market', unit: 'shares',
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

/** Example only: runs theHolding on the worked example and calculates nothing of its own. */
/* ─ MK-NW-F-080 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * HOLD
 *
 * Answers ..... Example only: runs theHolding on the worked example and calculates nothing of its own.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-080
 * Changed ..... not in git yet (—)
 */
const HOLD = () => theHolding({ position: EXAMPLE_POSITION, accountId: 'a2', price: 290,
  transactions: EXAMPLE_LEDGER, now: new Date('2026-09-28T12:00:00'),
  // the two closes before today, so the day's change has something to compare against
  recentCloses: [287.69, 290] });

/** THE FIGURES THIS DOOR HANDS OUT (rule 11). The master file's rows are printed from here. */
export const HOLDING_FIGURES = declareFigures({
  // ISSUED AND DECLARED 2026-10-01, working rule 11 across this screen. Three figures a person reads
  // here had no identifier — and finding the first of them turned up a one-door breach: the day's
  // change was computed on the screen from the price series, which is a money figure derived inline.
  'MK-NW-M-059': {
    label: 'Change since purchase', unit: 'money', screens: ['/holding-detail'], grain: 'one holding',
    answers: 'What this holding has gained or lost against what was paid for it.',
    formula: 'what it is worth today \u2212 what was paid for it',
    inputs: ['MK-XS-I-001 account balance'],
    decisions: [
      'IT IS AGAINST WHAT WAS PAID, not against any starting price: the figure answers "am I ahead on '
      + 'this holding", which only the cost basis can answer.',
      'WITHOUT A PRICE THERE IS NO FIGURE at all, rather than a zero \u2014 a gain of zero reads as '
      + 'break-even when the truth is that nothing is known.',
    ],
    refusal: 'No price \u2014 the row is left out, and the screen says what was paid instead.',
    ruled: '2026-10-01',
    // $40,600 worth against $31,600 paid (100 at $210 plus 40 at $265)
    worked: { given: GIVEN, answer: '$9,000', run: () => HOLD().gain },
  },
  'MK-NW-M-060': {
    label: 'up', unit: 'money-cents', screens: ['/holding-detail'], grain: 'one holding',
    answers: 'How much ONE SHARE of this holding moved since the previous close, in money — it sits under the price of one share.',
    formula: 'the last close \u2212 the close before it',
    inputs: ['MK-XS-I-006 price fetched at'],
    decisions: [
      'TWO CLOSES ARE NEEDED. One price is a price, not a change, so with a single point there is no '
      + 'figure rather than a change of zero.',
      'IT CAME OFF THE SCREEN (2026-10-01). It was calculated inside HoldingDetailScreen from the '
      + 'price series \u2014 a money figure derived inline on a screen, which is what one door exists to '
      + 'prevent. The door computes it now and the screen prints what the door says.',
    ],
    refusal: 'Fewer than two closes known, or a previous close of zero \u2014 the line is not drawn.',
    ruled: '2026-10-01',
    worked: { given: GIVEN, answer: '$2.31', run: () => HOLD().dayChange?.amount ?? null },
  },
  'MK-NW-M-061': {
    label: 'sh @', unit: 'money-cents', screens: ['/holding-detail', '/invest'], grain: 'one purchase',
    answers: 'What one purchase cost per share, on the day it was bought.',
    formula: 'the cost per share as recorded on that purchase',
    inputs: ['MK-XS-I-001 account balance'],
    decisions: [
      'EACH PURCHASE KEEPS ITS OWN PRICE. They are what the average above them is made of, so a '
      + 'person can check the average rather than having to trust it.',
    ],
    refusal: 'No purchases recorded \u2014 the section is not drawn.',
    ruled: '2026-10-01',
    worked: { given: GIVEN, answer: '$210.00', run: () => HOLD().purchases[0].costPerShare },
  },
  'MK-NW-M-029': {
    label: 'LAST CLOSE', unit: 'money-cents', screens: ['/holding-detail'], grain: 'one holding',
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
    decisions: ['r30: with NO price it shows what you paid, never a zero — a holding priced at zero would quietly shrink your whole portfolio.',
      'With no price, what you paid is Total paid, read the one way (2026-10-21, DEC-6627): over the purchases whose price paid '
      + 'is on record, a stored $0 not on record. 0.5 coins at $56,000 and 0.25 with none read $28,000, as Total paid does.'],
    // the second sentence covers the states the outside review opened (Claude Performance, 2026-10-11, tenet 3): a
    // value that cannot be known is refused, never printed as $0
    refusal: 'No price — it shows what you paid, labelled as that. Not stated where a purchase has no share count on record, or no purchase has a price paid on record.',
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
    refusal: 'All sold — the screen says the holding is liquidated rather than showing 0 shares. Not stated where a purchase has no share count on record.',
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
    label: 'Total paid', unit: 'money', screens: ['/holding-detail', '/invest'], grain: 'one holding',
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
    formula: 'the DIVIDEND records in this account naming this ticker, dated within the last year',
    inputs: ['MK-NW-I-004 the activity records'],
    decisions: ['A record that names no ticker belongs to no holding — the same rule the account page carries.',
      'A record in another account belongs to that account’s holding (2026-10-20): VTI at Vanguard ($40) and at '
      + 'Fidelity ($10) read $40 and $10, never $50 on both — the same records the sales on this page are counted from.'],
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
    formula: 'for each lot bought over a year ago: shares × (today’s price − what you paid); for an option on a broad-based index, 60% of the whole gain',
    inputs: ['MK-NW-I-001 your accounts', 'MK-NW-I-005 the price feed'],
    decisions: [
      'A PURCHASE WITH NO PURCHASE DATE ON RECORD IS IN NEITHER PART (2026-10-21; tenet 3, DEC-3523): its gain is in the '
      + 'total and on its own line. It was read as bought on 1 January 1970, so it showed as long-term.',
      'AN OPTION ON A BROAD-BASED INDEX (SPX, NDX, RUT, VIX and the rest — one list) is 60% long-term whatever the holding '
      + 'period (IRS Publication 550, the 60/40 rule; 2026-10-21). 2 SPX calls bought at $50, now $80: $3,600 of $6,000.',
      'INSIDE AN ACCOUNT TAXED AS PRE-TAX OR TAX-FREE (401(k), IRA, Roth, HSA, 529) there is no split: a sale there is not '
      + 'taxed as a capital gain, so the gain is shown whole (2026-10-21).',
    ],
    refusal: 'No price today — no gain is stated at all. Not stated where a purchase in this part has no price paid or share count on record, or no purchase held has a purchase date on record.',
    ruled: '2026-09-28',
    worked: {
      given: GIVEN,
      answer: '$8,000',
      run: () => HOLD().capitalGains!.longGain,
    },
  },
  'MK-NW-M-037': {
    label: 'Gain — short-term (held 1 yr or less)', unit: 'money', screens: ['/holding-detail'], grain: 'one holding',
    answers: 'The gain on shares held under a year — the part taxed as ordinary income.',
    formula: 'for each lot bought within the year: shares × (today’s price − what you paid); for an option on a broad-based index, the whole gain less its 60% long-term part',
    inputs: ['MK-NW-I-001 your accounts', 'MK-NW-I-005 the price feed'],
    decisions: [
      'A PURCHASE WITH NO PURCHASE DATE ON RECORD IS IN NEITHER PART (2026-10-21; tenet 3, DEC-3523). A date stored blank '
      + 'was read as short-term.',
      'AN OPTION ON A BROAD-BASED INDEX is 40% short-term whatever the holding period (IRS Publication 550; 2026-10-21): '
      + '2 SPX calls bought at $50, now $80: $2,400 of $6,000, not $6,000.',
      'INSIDE AN ACCOUNT TAXED AS PRE-TAX OR TAX-FREE there is no split (2026-10-21).',
    ],
    refusal: 'No price today — no gain is stated at all. Not stated where a purchase in this part has no price paid or share count on record, or no purchase held has a purchase date on record.',
    ruled: '2026-09-28',
    worked: {
      given: GIVEN,
      answer: '$1,000',
      run: () => HOLD().capitalGains!.shortGain,
    },
  },
});
