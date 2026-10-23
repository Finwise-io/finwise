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
import { declareFigures, percentDigits } from '../_figure-spec';
import {
  totalShares, capGains, marketValue, contractMultiplier, lotCostOnRecord, paidOnRecord, unrealizedGain, totalROI,
  quantityWithUnit, quantityUnit, buildPerformance, SECTION_1256_LONG_TERM_PERCENT, type Position, type CapGains, type PriceSeries,
  type Period, type PerformanceRow,
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
  /** Dividends whose record NAMES this ticker and sits in this account. `records` is how many such records there are: with
   *  none, nothing is on record about this holding's dividends, so the page draws no line — never $0 (tenet 3; the row's own
   *  refusal, MK-NW-M-034; 2026-10-21). */
  dividends: { trailing12: number; allTime: number; records: number };
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
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-167 COMPARE · MK-NW-F-080 HOLD
 *
 * Serves ...... MK-NW-M-029 · MK-NW-M-030 · MK-NW-M-031 · MK-NW-M-032
 *               MK-NW-M-033 · MK-NW-M-034 · MK-NW-M-035 · MK-NW-M-036
 *               MK-NW-M-037 · MK-NW-M-059 · MK-NW-M-060 · MK-NW-M-061
 *               MK-NW-M-067 · MK-NW-M-068 · MK-NW-M-070 · MK-NW-M-071
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-009 transaction date
 *               MK-XS-I-024 logged expenses
 * Ruled by .... DEC-0092 · DEC-0108 · DEC-0152 · DEC-0165 · DEC-0264 · DEC-0301
 *               DEC-0310 · DEC-0475 · DEC-0476 · DEC-0479 · DEC-0483
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
  // $0 read $0 beside Total paid saying no price paid was on record.
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
      records: divRows.length,
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
 * Reads ....... MK-XS-I-048 the person’s own asset-class answer
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

/** A SHARE COUNT NOT ON RECORD, IN ONE SET OF WORDS (2026-10-21 on the Holding page; the lead's ruling of 2026-10-22 brought it
 *  to the account page): every figure built from the count — Quantity, Current value, Price paid (average), Total paid, and the
 *  account page's shares line — says this, never a count that read the missing purchase as 0 (tenets 3 and 4). */
export const SHARE_COUNT_NOT_STATED = 'Not stated — a purchase has no share count on record.';

/** THE LINE IN PLACE OF THE SPLIT inside an account taxed as pre-tax or tax-free (notCapitalGains, 2026-10-21). */
export const NOT_CAPITAL_GAINS_LINE = 'Gains inside this account are not taxed as capital gains, so they are not split into long-term and short-term.';

/** WHAT A HOLDING IS COMPARED WITH, IN WORDS (2026-10-21). The yardstick follows what the holding is — the person's class,
 *  then the class the broker sends (DEC-6614, MK-PF-F-013 benchmarkTicker) — so a bond is set beside AGG. The Holding page's
 *  band said "the stock market" for every one of them, which is false for a bond, gold or bitcoin (tenets 1 and 2). The
 *  band now names the yardstick it is measured against (DEC-0458: the screen names WHICH benchmark), in the names his
 *  Look back ruling gave them (DEC-1624: the stock market (SPY), bonds (AGG), gold (GLD), bitcoin (BTC), a balanced
 *  fund (AOR)). One table, read by the band and its spoken words. A yardstick not on it is named by its ticker. */
const YARDSTICK_WORDS: Readonly<Record<string, string>> = Object.freeze({
  SPY: 'the stock market', AGG: 'the bond market', GLD: 'gold', BTC: 'bitcoin', AOR: 'a balanced fund',
  PSP: 'listed private equity', QAI: 'a hedge-fund index',
});
/** THE YARDSTICK'S NAME IN WORDS, from the one table above — a yardstick not on it is named by its ticker; no ticker, no name. */
/* ─ MK-NW-F-163 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * yardstickName
 *
 * Answers ..... THE YARDSTICK'S NAME IN WORDS, from the one table above — a yardstick not on it is named by its ticker; no ticker, no name.
 *
 * Formula .....
 *     t = string(ticker ?? '').trim().to upper case()
 *     the answer:
 *     YARDSTICK_WORDS[t] (or t when missing)   if t
 *     nothing   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-163
 * Changed ..... not in git yet (—)
 */
export function yardstickName(ticker: string | null | undefined): string | null {
  const t = String(ticker ?? '').trim().toUpperCase();
  return t ? YARDSTICK_WORDS[t] ?? t : null;
}

/** THE GAP BETWEEN A HOLDING'S RETURN AND ITS YARDSTICK'S, IN WORDS — "ahead by 15.79 points", "behind by 10.00 points" (the
 *  holding page's You are … row and its spoken words). Two decimals, from the one percent writer (percentDigits, Q49), like
 *  the two returns it is taken from. Over a window longer than a year the two returns are yearly rates, so the gap is too,
 *  and it says so: "/year" (DEC-0368, canon row 14). Null when either return is unknown. */
/* ─ MK-NW-F-164 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * gapWords
 *
 * Answers ..... THE GAP BETWEEN A HOLDING'S RETURN AND ITS YARDSTICK'S, IN WORDS — "ahead by 15.79 points", "behind by 10.00 points" (the holding page's You are … row and its spoken words).
 *
 * Formula .....
 *     nothing   when gap = nothing (or !number.is finite(gap) when missing or zero)
 *     `${gap ≥ 0 ? 'ahead' : 'behind'} by ${percent digits(math.abs(gap))} points${yearly ? ' ÷ year' : ''}`
 *
 * Called by ... MK-NW-F-167 COMPARE
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-167 COMPARE
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-164
 * Changed ..... not in git yet (—)
 */
export function gapWords(gap: number | null | undefined, yearly = false): string | null {
  if (gap == null || !Number.isFinite(gap)) return null;
  return `${gap >= 0 ? 'ahead' : 'behind'} by ${percentDigits(Math.abs(gap))} points${yearly ? '/year' : ''}`;
}

/** ONE PURCHASE'S QUANTITY ON ITS LINE UNDER WHAT YOU BOUGHT (2026-10-21; DEC-0277: the unit beside every quantity; tenet 4, one
 *  holding one unit). Shares are written as the approved drawing writes them, "100 sh"; any other unit in full, as the
 *  Quantity row above says it — "2 contracts", "0.5 coins" — never "2 sh" under "2 contracts". A purchase whose share count is
 *  not on record says so (tenet 3); it was drawn blank, "sh @ $210.00". */
/* ─ MK-NW-F-165 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * purchaseQuantityWords
 *
 * Answers ..... ONE PURCHASE'S QUANTITY ON ITS LINE UNDER WHAT YOU BOUGHT (2026-10-21; DEC-0277: the unit beside every quantity; tenet 4, one holding one unit).
 *
 * Formula .....
 *     'no share count on record'   when shares = nothing (or !number.is finite(shares) when missing or zero)
 *     `${count(shares)} sh`   if quantity unit(holding) = 'shares'
 *     quantity with unit(holding, shares, count) (or `${count(shares)} sh` when missing)   otherwise
 *
 * Called by ... MK-NW-F-167 COMPARE
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-167 COMPARE
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-165
 * Changed ..... not in git yet (—)
 */
export function purchaseQuantityWords(
  holding: Pick<Position, 'kind' | 'unit'>, shares: number | null | undefined, count: (n: number) => string = String,
): string {
  if (shares == null || !Number.isFinite(shares)) return 'no share count on record';
  return quantityUnit(holding) === 'shares' ? `${count(shares)} sh` : (quantityWithUnit(holding, shares, count) ?? `${count(shares)} sh`);
}

/** EACH HOLDING'S WINDOW FIGURE IN ONE ACCOUNT, ONE WAY ON EVERY PAGE THAT SHOWS IT (2026-10-22; tenet 4, one thing one number;
 *  the founder's rule, one concept → one function → one number). The account page's holding rows and the Holding page both
 *  print a holding's return over a window (MK-PF-M-023). They asked buildPerformance (MK-PF-F-014) two ways: the account page
 *  told it when this account first bought each holding (a linked holding's average-cost purchase has no date) and the Holding
 *  page did not; and the account page's row printed its own price move over the whole window, not this row. Both ask here
 *  now: this account's own records, its earliest buy of each ticker standing in for an undated purchase (invest-v3 FINAL,
 *  2026-07-19), and the account itself, so a bond's or a CD's interest counts (DEC-6212). A row's figures do not depend on
 *  the other holdings built beside it; only its path across the window does (DEC-1669). */
/* ─ MK-NW-F-168 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * holdingRowsIn
 *
 * Answers ..... EACH HOLDING'S WINDOW FIGURE IN ONE ACCOUNT, ONE WAY ON EVERY PAGE THAT SHOWS IT (2026-10-22; tenet 4, one thing one number; the founder's rule, one concept → one function → one number).
 *
 * Formula .....
 *     ledger = input.transactions (or none when missing) where string(account id ?? '') = string(input.account.asset id ?? '')
 *     first buy = {}
 *     d = the first 10 of string(date ?? '')
 *     k = string(ticker).trim().to upper case()
 *
 * Called by ... MK-NW-F-088 BENCH · MK-NW-F-167 COMPARE
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-167 COMPARE
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-168
 * Changed ..... not in git yet (—)
 */
export function holdingRowsIn(input: {
  account: AssetAccount; positions: Position[]; priceOf: (ticker: string) => PriceSeries | null | undefined;
  period: Period; transactions: any[]; now?: Date; windowStart?: string | null;
}): PerformanceRow[] {
  const ledger = (input.transactions ?? []).filter((t) => String(t?.account_id ?? '') === String(input.account?.asset_id ?? ''));
  const firstBuy: Record<string, string> = {};
  for (const t of ledger) {
    const d = String(t?.date ?? '').slice(0, 10);
    if (t?.type !== 'BUY' || !t?.ticker || !/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    const k = String(t.ticker).trim().toUpperCase();
    if (!firstBuy[k] || d < firstBuy[k]) firstBuy[k] = d;
  }
  return buildPerformance(input.positions, input.priceOf, input.period, input.now ?? new Date(),
    (q) => firstBuy[String(q.ticker ?? '').trim().toUpperCase()] ?? null, input.windowStart ?? undefined,
    { transactions: ledger, accounts: [input.account] });
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
 * Called by ... MK-NW-F-167 COMPARE
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-167 COMPARE
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-080
 * Changed ..... not in git yet (—)
 */
const HOLD = () => theHolding({ position: EXAMPLE_POSITION, accountId: 'a2', price: 290,
  transactions: EXAMPLE_LEDGER, now: new Date('2026-09-28T12:00:00'),
  // the two closes before today, so the day's change has something to compare against
  recentCloses: [287.69, 290] });

/** THE SAME HOLDING BESIDE ITS YARDSTICK (2026-10-21) — the worked example of the page's VS THE STOCK MARKET card. The
 *  holding's closes and the stock market's (SPY) on the same days, read through holdingRowsIn — buildPerformance (MK-PF-F-014)
 *  asked the one way: the very row the page prints from, and the account page's holding rows (r24, one row, no recomputation). */

/** Example only: builds the worked example's price lists from its day and close pairs, and calculates nothing of its own. */
/* ─ MK-NW-F-166 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * series
 *
 * Answers ..... Example only: builds the worked example's price lists from its day and close pairs, and calculates nothing of its own.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-143 gainRowBetween · MK-NW-F-167 COMPARE
 *               MK-NW-F-185 valueChanged · MK-PF-F-007 totalROI
 *               MK-PF-F-010 periodReturn · MK-PF-F-011 periodReturnSince
 *               MK-PF-F-014 buildPerformance · MK-PF-F-029 closeAsOf
 *               MK-PF-F-033 quantityWithUnit · MK-PF-F-034 closeOnOrBefore
 *               MK-PF-F-038 periodTotalReturn · MK-PF-F-039 periodReturnParts
 *               MK-PF-F-040 returnSincePurchases · MK-PF-F-055 valueAtClose
 *               MK-PF-F-056 purchasePieces · MK-PF-F-070 holdingPath
 *               MK-PF-F-077 eventPath · MK-XS-F-192 typedValueDatedBack
 *
 * Reaches ..... 308 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               … and 290 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-166
 * Changed ..... not in git yet (—)
 */
const series = (ticker: string, pts: [string, number][]): PriceSeries => ({ ticker, points: pts.map(([date, close]) => ({ date, close })) });
const EXAMPLE_CLOSES: Record<string, PriceSeries> = {
  VTI: series('VTI', [['2024-09-27', 240], ['2025-09-26', 250], ['2026-09-25', 287.69], ['2026-09-28', 290]]),
  SPY: series('SPY', [['2024-09-27', 500], ['2025-09-26', 550], ['2026-09-25', 610], ['2026-09-28', 616]]),
};
const EXAMPLE_ACCOUNT = { asset_id: 'a2', label: 'Fidelity Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 40_600, positions: [EXAMPLE_POSITION] } as any;
/** Example only: runs holdingRowsIn on the worked example and calculates nothing of its own. */
/* ─ MK-NW-F-167 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * COMPARE
 *
 * Answers ..... Example only: runs holdingRowsIn on the worked example and calculates nothing of its own.
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
 *               MK-XS-I-034 option positions — contracts, strike, expiry, put or call
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-167
 * Changed ..... not in git yet (—)
 */
const COMPARE = (period: '1Y' | '2Y' = '1Y') =>
  holdingRowsIn({ account: EXAMPLE_ACCOUNT, positions: [EXAMPLE_POSITION], priceOf: (t) => EXAMPLE_CLOSES[t], period, transactions: [],
    now: new Date('2026-09-28T12:00:00') })[0];
const COMPARE_GIVEN =
  '140 shares of VTI on 28 Sep 2026, first bought in Mar 2023. The past year opens 28 Sep 2025, so it is measured from the close '
  + 'of the day before — 26 Sep 2025, the last trading day on or before 27 Sep: VTI closed at $250 then and $290 today; the stock '
  + 'market (SPY) at $550 then and $616 today. Closes are dividend-adjusted.';

/** THE FIGURES THIS DOOR HANDS OUT (rule 11). The master file's rows are printed from here. */
export const HOLDING_FIGURES = declareFigures({
  // ISSUED AND DECLARED 2026-10-01, working rule 11 across this screen. Three figures a person reads
  // here had no identifier — and finding the first of them turned up a one-door breach: the day's
  // change was computed on the screen from the price series, which is a money figure derived inline.
  'MK-NW-M-059': {
    label: 'Change since purchase', unit: 'money', screens: ['/holding-detail'], grain: 'one holding',
    period: 'since purchase — from the day each share you still hold was bought, to today',
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
    period: 'since the previous close — the last close against the one before it',
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
      'THE QUANTITY BESIDE IT CARRIES THE HOLDING\u2019S OWN UNIT (2026-10-21; DEC-0277, tenet 4; purchaseQuantityWords): shares as the '
      + 'drawing writes them, 100 sh @ $210.00; any other unit in full, 2 contracts @ $5.00, as the Quantity row says it \u2014 it read 2 sh '
      + 'under 2 contracts. A purchase whose share count is not on record reads no share count on record @ $210.00; it was drawn blank.',
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
    decisions: ['A price that has gone stale says its age rather than passing as today’s.',
      'THE DAY ON THE BAND IS NEVER LATER THAN THE PERSON\u2019S OWN TODAY (2026-10-21; DEC-0189, DEC-0282; MK-NW-F-148 lastCloseLabel). '
      + 'The price feed dates each close by the day in London, so after 5 pm in California a coin\u2019s latest price is dated tomorrow; '
      + 'it was taken on the person\u2019s today, and the band says today.'],
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
      + 'is on record, a stored $0 not on record. 0.5 coins at $56,000 and 0.25 with none read $28,000, as Total paid does.',
      'WHAT THE ROW READS WHEN IT CANNOT BE KNOWN (2026-10-21; tenet 3, DEC-3523; outside re-run OpenAI part 1, MK-NW-M-030#3): a '
      + 'purchase with no share count \u2014 Not stated \u2014 a purchase has no share count on record., the words Price paid (average) and '
      + 'Total paid say for the same cause; no price and nothing paid on record \u2014 No price paid on record. It printed this row\u2019s '
      + 'refusal, a sentence about the figure that blamed a missing price under a price of $290.00.'],
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
    decisions: ['ALL SOLD IS NOT THE SAME AS NOT ON RECORD (2026-10-21; tenet 3, DEC-3523; outside re-run OpenAI part 1, MK-NW-M-031#3): '
      + 'with every share sold the page says Holding liquidated and draws no Quantity row; with a purchase whose share count is not '
      + 'on record the row reads Not stated \u2014 a purchase has no share count on record. It read this row\u2019s refusal, which says All sold.'],
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
    formula: 'what you paid for the purchases with a price paid on record ÷ the shares in those purchases',
    inputs: ['MK-NW-I-001 your accounts'],
    decisions: ['Kept unrounded inside, rounded once at display (Q49) — rounding it early moved the total it multiplies back into.',
      // Q34 (2026-10-21, DEC-7170, the lead's decision under DEC-6627, DEC-4643 and DEC-3523): the rule, word for word as the info dot
      // beside the figure says it (GLOSSARY.averagePricePaid), so the master's row and the screen say one thing
      'Price paid (average) is what you paid per share, over the purchases with a price paid on record. Shares with no '
      + 'price paid on record are left out of the average, and What you bought says how many. A price of $0 counts as not '
      + 'on record. If a purchase has no share count on record, no average is shown.',
      'With no purchase that has a price paid on record the row reads No price paid on record.; with a purchase whose share '
      + 'count is not on record it reads Not stated — a purchase has no share count on record. Example: 10 shares at $100 and '
      + '10 with no price paid read $100.00, and What you bought says the average and the total paid leave out 10 shares.'],
    refusal: 'No price paid on record.',
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
    // one wording for an unknown price paid on the Holding page (Q34, 2026-10-21; tenet 4; canon row 24)
    refusal: 'No price paid on record.',
    ruled: '2026-09-28',
    worked: {
      given: GIVEN,
      answer: '$31,600',
      run: () => HOLD().totalPaid,
    },
  },
  'MK-NW-M-034': {
    // the window spelled out (Q35, 2026-10-21, DEC-7171; his comment of 2026-08-26; canon row 23)
    label: 'Dividends received (trailing twelve months)', unit: 'money', screens: ['/holding-detail'], grain: 'one holding',
    period: 'the trailing twelve months — the 365 days ending today',
    answers: 'What this holding has paid you over the trailing twelve months.',
    formula: 'the DIVIDEND records in this account naming this ticker, dated in the trailing twelve months (the 365 days ending today)',
    inputs: ['MK-NW-I-004 the activity records'],
    decisions: ['A record that names no ticker belongs to no holding — the same rule the account page carries.',
      'A record in another account belongs to that account’s holding (2026-10-20): VTI at Vanguard ($40) and at '
      + 'Fidelity ($10) read $40 and $10, never $50 on both — the same records the sales on this page are counted from.',
      'NO RECORD NAMES THIS HOLDING, NO LINE (2026-10-21; this row\u2019s refusal, tenet 3; outside re-run OpenAI part 1, MK-NW-M-034#3): '
      + 'it printed $0 for a holding no dividend record names \u2014 a holding typed in by hand, with no records at all, read as if it had '
      + 'paid nothing. One dividend record naming it, of any date, draws the line, and $0 is then a real $0 for the twelve months.'],
    refusal: 'No records naming this holding — the line does not appear.',
    ruled: '2026-09-28',
    worked: {
      given: GIVEN,
      answer: '$825',
      run: () => HOLD().dividends.trailing12,
    },
  },
  'MK-NW-M-035': {
    // the name the screen and his approved Holding page drawing print (row words corrected 2026-10-21, outside re-run OpenAI part 1)
    label: 'Realized from sales', unit: 'money', screens: ['/holding-detail'], grain: 'one holding',
    period: 'every sale on record, to today',
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
  // ISSUED AND DECLARED 2026-10-21 (Performance launch audit, gaps 9 and 10): the page printed five percents with no
  // identifier — the change since purchase and the day's move as percents, and the three lines of its market comparison —
  // so nothing could check them against a row (rule 11). Each is printed through fig() now, and said through figSaid().
  'MK-NW-M-067': {
    label: 'Change since purchase (percent)', unit: 'percent-signed', screens: ['/holding-detail'], grain: 'one holding',
    period: 'since purchase — from the day each share you still hold was bought, to today',
    answers: 'What this holding has gained or lost, as a share of what was paid for it — the percent beside the change since purchase.',
    formula: 'the change since purchase ÷ what was paid, over the purchases whose price paid is on record (MK-PF-F-007 totalROI)',
    inputs: ['MK-XS-I-004 holding quantity (shares)', 'MK-XS-I-005 holding price', 'MK-XS-I-007 purchase price and date (per lot)'],
    decisions: ['TWO DECIMALS AND ITS SIGN (Q49).', 'It counts the same purchases as Total paid and the gain beside it (MK-PF-F-051 paidOnRecord, 2026-10-20).'],
    refusal: 'No price today, or nothing paid on record — no percent, and the gain beside it is not drawn either.',
    ruled: '2026-10-21',
    // $9,000 gained on $31,600 paid: 9,000 ÷ 31,600 = +28.48%
    worked: { given: GIVEN, answer: '+28.48%', run: () => HOLD().returnOnCost },
  },
  'MK-NW-M-068': {
    label: 'up … today (percent)', unit: 'percent-2dp', screens: ['/holding-detail'], grain: 'one holding',
    period: 'since the previous close — the last close against the one before it',
    answers: 'How much one share moved since the previous close, as a share of that close — the percent beside the day’s move under the price.',
    formula: '(the last close − the close before it) ÷ the close before it; the arrow and the word up or down carry its direction',
    inputs: ['MK-XS-I-005 holding price'],
    decisions: ['TWO DECIMALS (Q49). Written without a sign: the arrow and the word beside it say up or down.'],
    refusal: 'Fewer than two closes known, or a previous close of zero — the line is not drawn.',
    ruled: '2026-10-21',
    // ($290 − $287.69) ÷ $287.69 = 0.80%
    worked: { given: GIVEN, answer: '0.80%', run: () => HOLD().dayChange?.share ?? null },
  },
  // MK-NW-M-069 (Your return, past <window>) WAS RETIRED 2026-10-22, the day after it was issued: it is the account page's
  // holding Return, MK-PF-M-023 — one holding, one window, one figure (tenet 4) — and both pages now print it from one
  // function (holdingRowsIn) under that older identifier. The number is never reused (moneykeel_metric_register.json, retired).
  'MK-NW-M-070': {
    label: 'The market, same dates', unit: 'percent-signed', screens: ['/holding-detail'], grain: 'one holding',
    answers: 'What this holding’s yardstick did over the same dates — the stock market (SPY) for a stock or fund, the bond market (AGG) for a bond, '
      + 'and the rest as MK-PF-F-013 benchmarkTicker names them; the band above says which.',
    formula: 'the yardstick’s close today ÷ its close on the day the holding’s own figure is measured from − 1, dividend-adjusted; '
      + 'over 2Y a yearly rate over the same days (MK-PF-F-014 buildPerformance)',
    inputs: ['MK-XS-I-005 holding price'],
    decisions: [
      'THE SAME DATES AS THE HOLDING’S OWN FIGURE: from the purchase when bought inside the window, from its first close when its prices begin later.',
      'THE YARDSTICK FOLLOWS WHAT THE HOLDING IS (DEC-6614, DEC-2160) and the band names it (DEC-0458, DEC-1624; 2026-10-21): a bond reads against the bond market.',
      'IT INCLUDES THE YARDSTICK’S DIVIDENDS AND INTEREST (DEC-4645).',
    ],
    refusal: 'No yardstick for an Unclassified holding, or no price history for it over these dates — no percent, and a line saying which.',
    ruled: '2026-10-21',
    // $616 ÷ $550 − 1 = +12.00%
    worked: { given: COMPARE_GIVEN, answer: '+12.00%', run: () => COMPARE().benchReturn },
  },
  'MK-NW-M-071': {
    label: 'You are ahead by / behind by … points', unit: 'words', screens: ['/holding-detail'], grain: 'one holding',
    answers: 'How far this holding’s return is ahead of or behind its yardstick’s over the same dates, in percentage points.',
    formula: 'your return − the market, same dates (MK-PF-F-066 marketGap), in points to two decimals; over 2Y the gap of the two yearly rates, written /year',
    inputs: ['MK-XS-I-005 holding price'],
    decisions: ['TWO DECIMALS, like the two returns it is taken from (Q49, holding-detail v02 READ THIS FIRST 2026-10-21).'],
    refusal: 'Either return unknown — the line is not drawn.',
    ruled: '2026-10-21',
    // +16.00% − +12.00% = ahead by 4.00 points
    worked: { given: COMPARE_GIVEN, answer: 'ahead by 4.00 points', run: () => gapWords(COMPARE().beatBy) },
  },
});
