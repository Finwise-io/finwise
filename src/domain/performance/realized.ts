// Realized profit/loss — the founder's PRD ask (Invest r3 + NW r43, verified missing by the
// 2026-07-18 comment audit). Computed HONESTLY from the ledger: FIFO — the oldest recorded buy
// lots are consumed first by each sale; a sale with no recorded basis contributes nothing and is
// counted separately (we never invent a cost). Works for manual ledgers and connected history.
import type { Transaction } from '../transactions';
import { contractMultiplier, quantityWithUnit, type Position } from './index';

/** A sale for which some or all of the shares sold have no recorded purchase — a linked broker sends about two years
 *  of activity, so a sale can reach back past the oldest buy it sent (his approval, 2026-10-12, DEC-4643). */
export interface SaleShortOfPurchases {
  date: string;
  sold: number;                 // shares (or contracts, coins…) the sale took
  matched: number;              // of those, how many a recorded purchase covers
  gain: number | null;          // the gain on the matched part; null when nothing was matched
}

export interface RealizedResult {
  realizedAllTime: number;      // Σ (proceeds − basis) over the shares WITH a recorded purchase
  realizedThisYear: number;     // same, sale-dated in the current calendar year
  sellsCounted: number;         // sales with a gain counted — wholly or partly matched to recorded purchases
  sellsWithoutBasis: number;    // sales with NO recorded purchase behind any of their shares
  /** Every sale with shares that have no recorded purchase, partly or wholly — each counted once (DEC-4643). */
  shortOfPurchases: SaleShortOfPurchases[];
}

/* ─ MK-PF-F-028 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * realizedFromLedger
 *
 * Answers ..... How much profit have I actually taken?
 *
 * Formula .....
 *     rows = the ledger's BUY, Opening holding and SELL rows with a ticker, shares and a price (filtered to the ticker / account asked for), oldest first
 *     for each row: a buy is queued per account and ticker; a sale takes from the oldest queued buys: take = min(lot shares, shares still to sell); basis += take × lot price; lot shares −= take; still to sell −= take; the lot is dropped when empty
 *     gain = covered shares × sale price − basis, to the cent; added to the all-time total, and to this year's when the sale date is in this year
 *     a sale with shares still uncovered is counted as a sale without basis — reported, never guessed
 *     the answer = { realized all time, realized this year, sells counted, sells without basis }
 *
 * Called by ... MK-NW-O-006 theHolding
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-080 HOLD · MK-NW-O-006 theHolding
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-009 transaction date
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Decides .....
 *     · If shares is missing it uses 0.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · Sales dated in the current calendar year make the this-year total; the device clock decides which year that is.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-028
 * Changed ..... 2026-07-18 (50e9885)
 */
export function realizedFromLedger(
  txns: Transaction[],
  opts: { ticker?: string; accountId?: string; now?: Date; holding?: Pick<Position, 'kind' | 'multiplier'> } = {},
): RealizedResult {
  const now = opts.now ?? new Date();
  // × THE CONTRACT MULTIPLIER of the holding asked about (DEC-0274: "options: value = contracts × 100 × price"),
  // as cost, value and the long/short split already apply it: two contracts bought at $3.20 and sold at $5.45
  // made $450, they read $4.50 (outside review Claude Performance, 2026-10-11). The records carry a price per
  // share and a count of contracts; the holding says how many shares a contract is.
  const mult = opts.holding ? contractMultiplier(opts.holding) : 1;
  const yr = String(now.getFullYear());
  const rows = txns
    .filter((t) => (t.type === 'BUY' || t.type === 'OPENING_POSITION' || t.type === 'SELL'))
    .filter((t) => !!t.ticker && (t.shares ?? 0) > 0 && t.price != null)
    .filter((t) => (opts.ticker ? String(t.ticker).toUpperCase() === opts.ticker.toUpperCase() : true))
    .filter((t) => (opts.accountId ? t.account_id === opts.accountId : true))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));    // oldest first — FIFO needs time order

  // FIFO queues per ticker+account (a Schwab AAPL lot never covers a Robinhood AAPL sale)
  const queues = new Map<string, { shares: number; price: number; fee: number }[]>();
  const keyOf = (t: Transaction) => `${t.account_id}|${String(t.ticker).toUpperCase()}`;
  let all = 0, year = 0, counted = 0, uncovered = 0;
  const short: SaleShortOfPurchases[] = [];

  for (const t of rows) {
    const k = keyOf(t);
    if (t.type !== 'SELL') {
      const q = queues.get(k) ?? [];
      // A PURCHASE'S OWN FEE IS PART OF WHAT WAS PAID (2026-10-21; IRS Publication 550: the basis of shares includes the
      // commissions paid to buy them) — counted only where the price does not already carry it (feeNotInPrice)
      q.push({ shares: t.shares!, price: t.price!, fee: feeNotInPrice(t) });
      queues.set(k, q);
      continue;
    }
    const q = queues.get(k) ?? [];
    let toSell = t.shares!;
    let basis = 0, covered = 0, buyFees = 0;
    while (toSell > 0 && q.length > 0) {
      const lot = q[0];
      const take = Math.min(lot.shares, toSell);
      basis += take * lot.price;
      // the purchase fee goes with the shares it bought: 10 bought with a $4 fee and 5 of them sold carry $2 of it
      const lotFee = lot.fee * (take / lot.shares);
      buyFees += lotFee;
      lot.fee -= lotFee;
      covered += take;
      lot.shares -= take;
      toSell -= take;
      if (lot.shares <= 1e-9) q.shift();
    }
    // A SALE'S OWN FEES COME OFF WHAT IT BROUGHT IN (2026-10-21, the lead's decision under DEC-3523 tenets 1 and 7; US tax
    // rule: selling expenses reduce the amount realized — IRS Publication 550, Form 8949). A sale recorded with its fee —
    // 10 shares sold at $120 with a $5 fee, bought at $100 — gained $195, not $200. Where only part of the sale has a
    // purchase on record, that part carries its share of the fee. A sale with no fee recorded is counted as before.
    // A synced sale's price is the broker's cash ÷ shares, already after its fee when the broker's cash is (fee_in_price):
    // that fee is never taken off a second time (2026-10-21, feeNotInPrice).
    const fee = feeNotInPrice(t);
    const feeOnCovered = fee > 0 && t.shares! > 0 ? fee * (covered / t.shares!) : 0;
    const gain = covered > 0 ? (covered * t.price! - basis) * mult - feeOnCovered - buyFees : null;
    if (gain != null) {
      all += gain;
      if (t.date.startsWith(yr)) year += gain;
      counted++;
    }
    // A SALE IS COUNTED ONCE (his approval, 2026-10-12, DEC-4643). A sale of 15 shares with 10 on record used to
    // count as one sale counted AND one sale without a purchase — the page read as two sales. It is one sale: its
    // gain on the matched part is counted, and the shares with no recorded purchase are named on it, never guessed.
    if (toSell > 1e-9) {
      short.push({ date: t.date, sold: t.shares!, matched: covered, gain });
      if (covered <= 0) uncovered++;
    }
  }
  return {
    realizedAllTime: (all),
    realizedThisYear: (year),
    sellsCounted: counted,
    sellsWithoutBasis: uncovered,
    shortOfPurchases: short,
  };
}

/** THE FEE ON A BUY OR A SALE THAT ITS PRICE DOES NOT ALREADY CARRY, in dollars (2026-10-21). The broker's fee is stored at
 *  sync (tradeFeeOnRecord, ingest.ts) with fee_in_price saying whether the stored price is already net of it; a record with a
 *  fee and no such word — typed, or from an older import — has a price before its fee. No fee on record, or one inside the
 *  price, is 0 here. */
/* ─ MK-PF-F-057 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * feeNotInPrice
 *
 * Answers ..... THE FEE ON A BUY OR A SALE THAT ITS PRICE DOES NOT ALREADY CARRY, in dollars (2026-10-21).
 *
 * Formula .....
 *     fee = fee read as a number
 *     the answer:
 *     fee   if fee in price ! = true and number.is finite(fee) and fee > 0
 *     0   otherwise
 *
 * Called by ... MK-PF-F-028 realizedFromLedger
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-080 HOLD · MK-PF-F-028 realizedFromLedger
 *               MK-NW-O-006 theHolding
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-057
 * Changed ..... not in git yet (—)
 */
export function feeNotInPrice(t: Pick<Transaction, 'fee' | 'fee_in_price'>): number {
  const fee = Number(t.fee);
  return t.fee_in_price !== true && Number.isFinite(fee) && fee > 0 ? fee : 0;
}

/** The line for a sale whose shares are not all covered by a recorded purchase: the gain on the part that is, and how many shares have no price paid on record. */
/* ─ MK-PF-F-046 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * saleShortOfPurchasesSentence
 *
 * Answers ..... The line for a sale whose shares are not all covered by a recorded purchase: the gain on the part that is, and how many shares have no price paid on record.
 *
 * Formula .....
 *     gain on part sentence({ gain: sale.gain, counted: sale.matched, of: sale.sold }, holding, money, count, ' sold')
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-046
 * Changed ..... not in git yet (—)
 */
export function saleShortOfPurchasesSentence(
  sale: SaleShortOfPurchases, holding: Pick<Position, 'kind' | 'unit'>, money: (n: number) => string,
  count: (n: number) => string = String,
): string {
  // HIS WORDS, 2026-10-12 (DEC-4643): "$200 gain on 10 of 15 shares sold; what you paid for the other 5 is not on
  // record." Written by the one sentence writer below, which the gains if sold today use too (Q20, 2026-10-20).
  return gainOnPartSentence({ gain: sale.gain, counted: sale.matched, of: sale.sold }, holding, money, count, ' sold');
}

/** The ONE line for a gain counted on only part of a holding: the gain on the part whose price paid is on record, and
 *  how much is left out — "$200 gain on 10 of 20 shares; what you paid for the other 10 is not on record." */
/* ─ MK-PF-F-058 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * gainOnPartSentence
 *
 * Answers ..... The ONE line for a gain counted on only part of a holding: the gain on the part whose price paid is on record, and how much is left out — "$200 gain on 10 of 20 shares; what you paid for the other 10 is not on record."
 *
 * Formula .....
 *     of words = quantity with unit(holding, part.of, count) (or count(part.of) when missing)
 *     the answer = `${of words}${sold}; what you paid for them is not on record, so no gain is counted.`
 *     g = part.gain
 *
 * Called by ... MK-PF-F-035 unknownFigure · MK-PF-F-046 saleShortOfPurchasesSentence
 *
 * Reaches ..... 267 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-NW-F-080 HOLD
 *               MK-CF-F-201 INCOME · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               … and 249 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-058
 * Changed ..... not in git yet (—)
 */
export function gainOnPartSentence(
  part: { gain: number | null; counted: number; of: number }, holding: Pick<Position, 'kind' | 'unit'>,
  money: (n: number) => string, count: (n: number) => string = String, sold: '' | ' sold' = '',
): string {
  // the shape is his, for sales (DEC-4643, 2026-10-12); applied unchanged to what is still held (Q20, 2026-10-20). The
  // unit is the holding's own (MK-PF-F-033 quantityWithUnit): shares, contracts, coins, ounces.
  const ofWords = quantityWithUnit(holding, part.of, count) ?? count(part.of);
  if (part.gain == null || part.counted <= 0) {
    return `${ofWords}${sold}; what you paid for them is not on record, so no gain is counted.`;
  }
  const g = part.gain;
  return `${money(Math.abs(g))} ${g < 0 ? 'loss' : 'gain'} on ${count(part.counted)} of ${ofWords}${sold}; what you paid for the other ${count(part.of - part.counted)} is not on record.`;
}
