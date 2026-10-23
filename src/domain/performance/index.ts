// Portfolio Performance Analysis — pure core.
// A holding is a ticker + one or more cost-basis LOTS (shares bought at a price on a date).
// Market value, unrealized gain, total ROI, and period returns all derive from lots + live price.
// Price data comes from a swappable PriceProvider (see services/marketData.ts) so the model and UI
// never need rework if we change data source later.
import type { EntityId } from '../_shared/ids';
import { plural } from '../_shared/plural';
import { dateShown } from '../_shared/dates';
import { coverageFor } from '../../../Calculation Module code/engines/coverage';
import { unitWorth, lotCostOnRecord } from '../../../Calculation Module code/engines/snapshots';
import { TBILL_ETF_TICKERS, brokerClassOf } from '../../../Calculation Module code/engines/holding-class';
import { moneyIntoAccount } from '../../../Calculation Module code/engines/ledger';
import { holdingClassOf, assetClassOf } from '../assets';
import { cashEffect } from '../transactions';   // the one reader of the cash a record moved (a sale's, 2026-10-22)
import { feeNotInPrice } from './realized';      // the one reading of a trade's fee the price does not carry (2026-10-22)
import { maturityParts } from '../_shared/dates';

/** One purchase lot — shares bought at a price on a date (enables true cost-basis ROI). */
export interface Lot {
  lot_id: EntityId;
  shares: number;
  // purchase price per share, in account currency. NULL = NOT ON RECORD: a linked broker sent no cost for this purchase
  // (stored as null since 2026-10-20 — it was stored as $0, which the average price read as a real $0 cost). Ask
  // lotCostOnRecord whether a lot's cost can be counted; never read a missing cost as 0.
  cost_per_share: number | null;
  purchase_date: string;        // 'YYYY-MM-DD'
}

/** A marketable holding inside an account: a ticker + its lots. */
export interface Position {
  position_id: EntityId;
  ticker: string;               // e.g. 'AAPL', 'SPY', 'VTI'
  label?: string;               // display name, e.g. 'Apple Inc.'
  kind?: string;                // ASSET_KINDS id, for benchmark mapping
  asset_class?: 'stock_etf' | 'bond' | 'other' | 'cash';   // explicit class (import/sync sets it; wins over kind); 'cash' = money-market funds a broker didn't flag (live-verified 2026-07-19)
  class_source?: 'user';        // B7: the person set the class themselves — it survives every sync
  // HIS RULING, 2026-09-30 (master Q12): "user entry stays even if it is not in the import file. If user
  // modify cost or quantity post import/linked from institution, cost basis should not be overwritten in
  // future sync as quantity, price and market value can change with time but not cost."
  cost_source?: 'user';         // the person set this holding's cost: a sync keeps their cost per share
  added_by?: 'user';            // the person added this holding to a linked account: a sync keeps it
  // HIS RULING, 2026-09-30 (master Q11): when nothing says what a holding is — "Refuse the line and ask".
  class_asked?: true;           // nothing said what this is: it is in no class until the person says
  class_flag?: { was: string; evidenceSays: string };   // B7: a sync wanted to move the class; kept + flagged instead
  // THE CLASS THE BROKER SENT, kept exactly as sent (his ruling, 2026-10-20: "always the class broker sends"): its own
  // type — SnapTrade's code ('et', 'oef', 'bnd', …) or an import file's type words — and its cash-equivalent flag, the
  // broker saying "this is cash". MK-NW-F-109 holdingClassOf reads them first after the person's own answer, so the
  // class follows the broker on every read, not only at the sync that stored them. Absent = the broker sent none.
  broker_type?: string;
  cash_equivalent?: true;
  last_price?: number;          // broker's daily mark (connected accounts — no live feed needed)
  value_now?: number;           // a hand-built holding's value at the price its account balance was last built from (2026-10-07)
  multiplier?: number;          // Q06 (founder, 2026-08-26): an option contract is 100 shares unless the broker or the person states otherwise
  unit?: QuantityUnit;          // Q09 (founder, 2026-08-26): a quantity is never shown without its unit
  // A BOND OR CD HELD AS A HOLDING carries its own facts when the broker or the person gives them (DEC-6212, 2026-10-19):
  // its face value, its yearly coupon rate (0.04 = 4.00%) and its maturity date, year-month-day. Never guessed.
  face_value?: number;
  coupon_rate?: number;
  maturity_date?: string;
  // how often a held bond pays its interest, 1 or 2 a year, as the person chose it in the holding editor (2026-10-21, under
  // DEC-3390; MK-XS-I-069) — read by the accrued-interest estimate in its yield to maturity. Absent = not entered.
  coupons_per_year?: 1 | 2;
  // HOW A LINKED BOND'S PRICE IS QUOTED (MK-XS-I-068, 2026-10-20), calculated at each sync from the broker's own total
  // (bondQuoteBasis, in the sync): 'per_100_of_face' = the quantity is the face amount and the price is per $100 of it, so
  // value = quantity × price ÷ 100; 'unclear' = the evidence cannot tell, so the value is shown as quantity × price and the
  // missing-information box names the bond. Absent = quantity × price, as for a share.
  price_quote?: 'per_100_of_face' | 'unclear';
  lots: Lot[];
}

export type QuantityUnit = 'shares' | 'coins' | 'contracts' | 'ounces' | 'units';

/** Q06 (founder, 2026-08-26): options are contracts × 100 × price unless the broker or the person
 *  states another multiplier. Everything that is not an option is 1. */
export const OPTION_CONTRACT_MULTIPLIER = 100;

/** How many units one contract stands for: 100 for an option unless the holding states its own figure, and 1 for everything else. */
/* ─ MK-PF-F-031 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * contractMultiplier
 *
 * Answers ..... How many units one contract stands for: 100 for an option unless the holding states its own figure, and 1 for everything else.
 *
 * Formula .....
 *     multiplier   when kind = 'options' and multiplier ≠ nothing and number.is finite(multiplier) and multiplier > 0
 *     unit worth(p)   when unit worth(p) ! = 1
 *     OPTION_CONTRACT_MULTIPLIER   if kind = 'options'
 *     1   otherwise
 *
 * Called by ... MK-NW-F-027 accountClassBreakdown · MK-NW-F-128 heldValueOf
 *               MK-NW-F-143 gainRowBetween · MK-NW-F-151 linkedSplit
 *               MK-PF-F-002 costBasis · MK-PF-F-004 marketValue
 *               MK-PF-F-005 unrealizedGain · MK-PF-F-006 capGains
 *               MK-PF-F-014 buildPerformance · MK-PF-F-028 realizedFromLedger
 *               MK-PF-F-051 paidOnRecord · MK-PF-F-070 holdingPath
 *               MK-PF-F-072 tradesAfter · MK-PF-F-073 sharesThroughWindow
 *               MK-PF-F-077 eventPath · MK-PL-F-081 taxableGainShare
 *               MK-XS-F-102 ingestSync
 *
 * Reaches ..... 307 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               … and 289 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *               MK-XS-I-068 how a linked bond's price is quoted — per $100 of face value, or per unit like a share
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-031
 * Changed ..... not in git yet (—)
 */
export function contractMultiplier(p: Pick<Position, 'kind' | 'multiplier'> & { price_quote?: Position['price_quote'] }): number {
  // SHARES PER CONTRACT ARE AN OPTION'S FIGURE (2026-10-21; DEC-0274, DEC-4646; outside re-run OpenAI part 3, MK-PF-F-031): a
  // stated figure counts only for an option, and only when it is a real number above zero — like 0 or a negative, a figure
  // that is not finite is no statement, so the option's 100 stands. Before: an option changed to a stock kept its 100, so
  // 10 shares at $50 read $50,000, not $500; and a 309-digit figure typed in the box made every value it touched infinite.
  if (p.kind === 'options' && p.multiplier != null && Number.isFinite(p.multiplier) && p.multiplier > 0) return p.multiplier;
  // A BOND QUOTED PER $100 OF FACE (MK-XS-I-068, 2026-10-20): its quantity is the face amount and its price is per $100
  // of it, so each unit of quantity × price stands for one hundredth of a dollar — $100,000 face at 99.50 is $99,500,
  // not $9,950,000. Value and cost are both read through here, so both follow it.
  if (unitWorth(p) !== 1) return unitWorth(p);   // the one reading of the quote: unitWorth, beside the daily record's builder
  return p.kind === 'options' ? OPTION_CONTRACT_MULTIPLIER : 1;
}

/** Q09 (founder, 2026-08-26): the unit beside a quantity — the person's when entered, else the one
 *  the kind implies: coins for crypto, contracts for options, ounces for gold and commodities, shares
 *  for everything else. */

/** The unit written beside a quantity: the person's own where they entered one, otherwise coins for crypto, contracts for options, ounces for commodities and shares for everything else. */
/* ─ MK-PF-F-032 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * quantityUnit
 *
 * Answers ..... The unit written beside a quantity: the person's own where they entered one, otherwise coins for crypto, contracts for options, ounces for commodities and shares for everything else.
 *
 * Formula .....
 *     unit   when unit
 *     'coins'   when kind = 'crypto'
 *     'contracts'   when kind = 'options'
 *     'ounces'   when kind = 'commodities'
 *     'shares'
 *
 * Called by ... MK-NW-F-165 purchaseQuantityWords · MK-PF-F-033 quantityWithUnit
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
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-034 option positions — contracts, strike, expiry, put or call
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-032
 * Changed ..... not in git yet (—)
 */
export function quantityUnit(p: Pick<Position, 'kind' | 'unit'>): QuantityUnit {
  if (p.unit) return p.unit;
  if (p.kind === 'crypto') return 'coins';
  if (p.kind === 'options') return 'contracts';
  if (p.kind === 'commodities') return 'ounces';
  return 'shares';
}

/** "3 shares", "1 coin", "2 contracts" — the quantity printed with its unit, singular when it is one. */
/* ─ MK-PF-F-033 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * quantityWithUnit
 *
 * Answers ..... "3 shares", "1 coin", "2 contracts" — the quantity printed with its unit, singular when it is one.
 *
 * Formula .....
 *     nothing   when qty = nothing (or !number.is finite(qty) when missing or zero)
 *     n = size of(qty), shown = format(qty)
 *
 * Called by ... MK-NW-F-146 undatedGainSentence · MK-NW-F-165 purchaseQuantityWords
 *               MK-PF-F-058 gainOnPartSentence
 *
 * Reaches ..... 307 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               … and 289 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-005 holding price
 *               MK-XS-I-034 option positions — contracts, strike, expiry, put or call
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-033
 * Changed ..... not in git yet (—)
 */
export function quantityWithUnit(p: Pick<Position, 'kind' | 'unit'>, qty: number | null, format: (n: number) => string = String): string | null {
  // A quantity not on record has no number, so it refuses (tenet 3, DEC-3523). A quantity below zero is a written
  // (short) position, as a linked broker sends it and as the holding's own name already says "(short)": it keeps its
  // minus sign and its unit, singular at one either way — "-1 contract", never "-1 contracts" (DEC-0277, the unit
  // beside every quantity; outside review Claude Performance, 2026-10-12)
  if (qty == null || !Number.isFinite(qty)) return null;
  // THE UNIT'S SINGULAR COMES FROM THE ONE LIST OF WORDS AND PLURALS (DEC-4082; outside re-run OpenAI part 3,
  // MK-PF-F-033, 2026-10-21): it was made by dropping the final s, outside the list. One unit at minus one too.
  const n = Math.abs(qty), shown = format(qty);
  switch (quantityUnit(p)) {
    case 'coins': return plural(n, 'coin', shown);
    case 'contracts': return plural(n, 'contract', shown);
    case 'ounces': return plural(n, 'ounce', shown);
    case 'units': return plural(n, 'unit', shown);
    default: return plural(n, 'share', shown);
  }
}

/** A daily close series, oldest→newest, for return math. */
export interface PriceSeries { ticker: string; points: { date: string; close: number }[]; }

export type Period = '1M' | '3M' | '6M' | 'YTD' | '1Y' | '2Y';
export const PERIODS: Period[] = ['1M', '3M', '6M', 'YTD', '1Y', '2Y'];

// ---- cost basis & value (lot math) ----

/** How many shares of a holding are held, added up across every purchase. */
/* ─ MK-PF-F-001 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * totalShares
 *
 * Answers ..... How many shares of a holding are held, added up across every purchase.
 *
 * Formula .....
 *     total shares(holding) = Σ over every lot of (shares, or 0 when missing)
 *
 * Called by ... MK-CF-F-111 applyTransaction · MK-NW-F-127 gainOfRow
 *               MK-NW-F-128 heldValueOf · MK-NW-F-170 incomeSumParts
 *               MK-NW-F-171 listedShares · MK-NW-O-006 theHolding
 *               MK-PF-F-004 marketValue · MK-PF-F-073 sharesThroughWindow
 *
 * Reaches ..... 309 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               … and 291 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-001
 * Changed ..... 2026-06-05 (d925b9e)
 */
export function totalShares(p: Position): number | null {
  // A PURCHASE WITH NO SHARE COUNT MAKES THE TOTAL UNKNOWN, never a total that looks complete (tenet 3, DEC-3523;
  // outside review Claude Performance, 2026-10-11). A real 0 is a count.
  let t = 0;
  for (const l of p.lots ?? []) {
    const sh = l?.shares as number | null | undefined;
    if (sh == null || !Number.isFinite(sh)) return null;
    t += sh;
  }
  return t;
}

/** Whether a purchase's figure was never entered — missing or not a number. A real 0 is a figure. */
/* ─ MK-PF-F-035 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * unknownFigure
 *
 * Answers ..... Whether a purchase's figure was never entered — missing or not a number.
 *
 * Formula .....
 *     v = nothing (or v is not a number (or !number.is finite(v) when missing or zero) when missing or zero)
 *
 * Called by ... MK-PF-F-002 costBasis · MK-PF-F-006 capGains
 *               MK-PF-F-051 paidOnRecord · MK-PF-F-073 sharesThroughWindow
 *
 * Reaches ..... 305 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               … and 287 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-035
 * Changed ..... not in git yet (—)
 */
const unknownFigure = (v: unknown): boolean => v == null || typeof v !== 'number' || !Number.isFinite(v);

/** Is what was paid for this purchase on record — a cost per share above zero? ONE RULE for the average price paid and
 *  the gains if sold today, so the two can never read one purchase two ways (2026-10-20). Not on record: no cost at
 *  all (a linked broker that sent none), or the 0 that a blank cost in the holding editor saves, and that a sync wrote
 *  for a missing cost until 2026-10-20 — the same test capGains has applied since 2026-10-11. */
//  THE RULE LIVES BESIDE unitWorth since 2026-10-21 (Calculation Module code/engines/snapshots.ts), so the
//  daily record reads a cost the same way; it is re-exported here, so every caller keeps importing it from this module.
export { lotCostOnRecord };

/** WHAT WAS PAID, OVER THE PURCHASES WHOSE PRICE PAID IS ON RECORD (lotCostOnRecord), and how many units that covers of how
 *  many held (2026-10-20). The one reading of what was paid for Total paid, the gain at the top of a holding, its return on
 *  what was paid and the Performance row — the reading the average price paid and the gains if sold today already use, so
 *  every figure on the page counts the same purchases. 10 shares at $100 and 10 with no price paid: $1,000 on 10 of 20.
 *  A purchase with no share count makes all three unknown; shares held with no price paid on record at all leave `paid`
 *  unknown, never $0. The person is told what is left out (gainOnPartSentence, and the WHAT YOU BOUGHT line). */
/* ─ MK-PF-F-051 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * paidOnRecord
 *
 * Answers ..... WHAT WAS PAID, OVER THE PURCHASES WHOSE PRICE PAID IS ON RECORD (lotCostOnRecord), and how many units that covers of how many held (2026-10-20).
 *
 * Formula .....
 *     paid = 0, counted = 0, held = 0
 *     paid = nothing
 *     counted = nothing
 *     held = nothing   when unknown figure(shares)
 *     the answer:
 *     paid = nothing   if held ! = 0 and counted = 0
 *     paid × contract multiplier(p)   otherwise
 *     counted = counted
 *     held = held
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-NW-F-027 accountClassBreakdown · MK-NW-F-139 leftOutValueOf
 *               MK-NW-F-144 beforeTheRecordSentence · MK-NW-F-167 COMPARE
 *               MK-NW-O-006 theHolding · MK-PF-F-005 unrealizedGain
 *               MK-PF-F-007 totalROI · MK-PF-F-013 benchmarkTicker
 *               MK-PF-F-014 buildPerformance · MK-PL-F-081 taxableGainShare
 *               MK-XS-F-174 recomputeBalances
 *
 * Reaches ..... 305 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               … and 287 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-051
 * Changed ..... not in git yet (—)
 */
export function paidOnRecord(p: Position): { paid: number | null; counted: number | null; held: number | null } {
  let paid = 0, counted = 0, held = 0;
  for (const l of p.lots ?? []) {
    if (unknownFigure(l?.shares)) return { paid: null, counted: null, held: null };
    if (l.shares === 0) continue;
    held += l.shares;
    if (!lotCostOnRecord(l)) continue;
    counted += l.shares;
    paid += l.shares * (l.cost_per_share as number);
  }
  return { paid: held !== 0 && counted === 0 ? null : paid * contractMultiplier(p), counted, held };
}
/* ─ MK-PF-F-002 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * costBasis
 *
 * Answers ..... What did I pay for this in total?
 *
 * Formula .....
 *     cost basis(holding) = Σ over every lot of (shares × cost per share)
 *
 * Called by ... MK-NW-O-006 theHolding · MK-XS-F-102 ingestSync
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-167 COMPARE · MK-NW-F-080 HOLD
 *               MK-XS-F-102 ingestSync · MK-NW-O-006 theHolding
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-002
 * Changed ..... 2026-06-05 (d925b9e)
 */
export function costBasis(p: Position): number | null {
  // A PURCHASE WITH NO SHARE COUNT, OR SHARES WITH NO COST ON RECORD, MAKES WHAT WAS PAID UNKNOWN — it added $0
  // and the total looked complete (tenet 3, DEC-3523; outside review Claude Performance, 2026-10-11). A cost of
  // 0 is a figure here, as it always was.
  let t = 0;
  for (const l of p.lots ?? []) {
    if (unknownFigure(l?.shares)) return null;
    if (l.shares === 0) continue;
    if (unknownFigure(l?.cost_per_share)) return null;
    t += l.shares * (l.cost_per_share as number);   // a cost not on record returned above
  }
  return t * contractMultiplier(p);
}

/* ─ MK-PF-F-004 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * marketValue
 *
 * Answers ..... What is this holding worth right now?
 *
 * Formula .....
 *     market value(holding) = round(total shares × price, 2 dp)
 *                           = 0   when no price came back
 *
 * Called by ... MK-NW-F-075 ACC · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-128 heldValueOf · MK-NW-F-138 knownHoldingsReturn
 *               MK-NW-O-006 theHolding · MK-PF-F-005 unrealizedGain
 *               MK-PF-F-014 buildPerformance · MK-PF-F-055 valueAtClose
 *               MK-PL-F-081 taxableGainShare · MK-XS-F-174 recomputeBalances
 *
 * Reaches ..... 306 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               … and 288 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-004
 * Changed ..... 2026-08-20 (77eea92)
 */
export function marketValue(p: Position, price: number | null | undefined): number | null {
  const sh = totalShares(p);
  // SHARES WITH NO PRICE ARE WORTH SOMETHING UNKNOWN, not $0 (tenet 3, DEC-3523; outside review Claude
  // Performance, 2026-10-11). No shares held is worth $0 at any price.
  if (sh === 0) return 0;
  if (price == null || sh == null) return null;
  return sh * price * contractMultiplier(p);
}
/** Unrealized gain = market value − cost basis (unknown when either is unknown — no price is no gain to state). */
/* ─ MK-PF-F-005 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * unrealizedGain
 *
 * Answers ..... Unrealized gain = market value − cost basis (unknown when either is unknown — no price is no gain to state).
 *
 * Formula .....
 *     nothing   when price = nothing
 *     c = paid on record(p)
 *     nothing   when paid = nothing (or counted = nothing when missing or zero)
 *     nothing   if market value(p, price) = nothing
 *     0   otherwise   when counted = 0
 *     the answer = counted × price × contract multiplier(p) − paid
 *
 * Called by ... MK-NW-O-006 theHolding · MK-PF-F-007 totalROI
 *               MK-PF-F-014 buildPerformance
 *
 * Reaches ..... 32 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-PF-F-070 holdingPath · MK-NW-F-168 holdingRowsIn
 *               … and 14 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-005
 * Changed ..... 2026-08-20 (77eea92)
 */
export function unrealizedGain(p: Position, price: number | null | undefined): number | null {
  // with no price the gain is unknown — $0 said "no gain" (tenet 3, DEC-3523; outside review Claude Performance, 2026-10-11)
  if (price == null) return null;
  // OVER THE SAME PURCHASES AS WHAT WAS PAID (paidOnRecord, 2026-10-20): the value of the units whose price paid is on
  // record, less what was paid for them. A blank price paid was saved as $0, so 10 shares at $100 and 10 with none, today
  // $120, read a gain of $2,400 − $1,000 = $1,400 beside a long-term gain of $200; now both read $200. With every price paid
  // on record the units counted are every unit held, and this is the value less what was paid, as it always was.
  const c = paidOnRecord(p);
  if (c.paid == null || c.counted == null) return null;
  if (c.counted === 0) return marketValue(p, price) == null ? null : 0;   // nothing held: no gain
  return c.counted * price * contractMultiplier(p) - c.paid;
}

/** A PURCHASE DATE ON RECORD: a real calendar day written year-month-day, or nothing (2026-10-21; tenet 3, DEC-3523 —
 *  unknown is not zero). ONE RULE for every reader of a purchase's date on the Holding page — the gains if sold today
 *  and the purchase rows. Not on record: no date (a linked broker that sent none, stored blank), a date written another
 *  way, or a day that does not exist — 31 February read as 3 March. A missing date was read as 1 January 1970, so its
 *  gain showed as long-term; a blank one as short-term. */
/* ─ MK-PF-F-052 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * purchaseDateOnRecord
 *
 * Answers ..... A PURCHASE DATE ON RECORD: a real calendar day written year-month-day, or nothing (2026-10-21; tenet 3, DEC-3523 — unknown is not zero).
 *
 * Formula .....
 *     m = ÷ ^\d{4}-\d{2}-\d{2} ÷ .exec(string(d ?? '').trim())
 *     the answer:
 *     the first of m   if m and maturity parts(m[0])
 *     nothing   otherwise
 *
 * Called by ... MK-CF-F-139 removeShares · MK-NW-F-143 gainRowBetween
 *               MK-PF-F-006 capGains · MK-PF-F-012 earliestPurchaseDate
 *               MK-PF-F-053 isBroadIndexOption · MK-PF-F-060 closeDayOnOrBefore
 *               MK-PF-F-063 heldOnDay · MK-PF-F-065 firstDatedPurchase
 *               MK-PF-F-067 purchaseDays · MK-PF-F-073 sharesThroughWindow
 *               MK-XS-F-127 toIsoDate
 *
 * Reaches ..... 105 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-082 NW · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-CF-F-111 applyTransaction · MK-NW-F-040 assetsFromOnboarding
 *               MK-NW-F-144 beforeTheRecordSentence · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               … and 87 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses a built-in s e c t i o n 1256 l o n g t e r m p e r c e n t of 60.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-052
 * Changed ..... not in git yet (—)
 */
export function purchaseDateOnRecord(d: string | null | undefined): string | null {
  const m = /^\d{4}-\d{2}-\d{2}/.exec(String(d ?? '').trim());
  // the day must be one the calendar has, by the app's one reader of a written day (MK-NW-F-124 maturityParts)
  return m && maturityParts(m[0]) ? m[0] : null;
}

/** THE ONE LIST OF BROAD-BASED INDEX OPTIONS (2026-10-21; DEC-0378, every figure set by law typed from the published
 *  source). An option on one of these indexes is a nonequity option — a section 1256 contract — and IRS Publication 550
 *  (2025) says: "Gains or losses on section 1256 contracts open at the end of the year, or terminated during the year,
 *  are treated as 60% long-term and 40% short-term, regardless of how long the contracts were held." A broad-based stock
 *  index "is based on the value of a group of diversified stocks or securities (such as the Standard and Poor's 500
 *  index)". The S&P 500 (SPX, SPXW, the mini XSP), the Nasdaq-100 (NDX, NDXP), the Russell 2000 (RUT, the mini MRUT),
 *  the volatility index (VIX), the Dow (DJX) and the S&P 100 (OEX, XEO). An option on SPY or on a single company is an
 *  equity option and keeps the holding-period split. */
export const SECTION_1256_INDEX_OPTION_ROOTS: ReadonlySet<string> = new Set([
  'SPX', 'SPXW', 'XSP', 'NDX', 'NDXP', 'RUT', 'MRUT', 'VIX', 'DJX', 'OEX', 'XEO',
]);
/** The long-term share of a section 1256 contract's gain, in percent (IRS Publication 550 (2025), the 60/40 rule); the
 *  rest, 40, is short-term. */
export const SECTION_1256_LONG_TERM_PERCENT = 60;

/** Is this holding an option on a broad-based index (SECTION_1256_INDEX_OPTION_ROOTS)? Read from the option's ticker —
 *  its root, the letters before the expiry: 'SPX', 'SPX  261218C06000000', 'SPXW261218C06000000', 'SPX 12/18/2026 6000 C'. */
/* ─ MK-PF-F-053 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * isBroadIndexOption
 *
 * Answers ..... Is this holding an option on a broad-based index (SECTION_1256_INDEX_OPTION_ROOTS)?
 *
 * Formula .....
 *     false   when kind ! = 'options'
 *     m = ÷ ^[$^]?([A − Z]+)(?=$|[\s\d]) ÷ .exec(string(ticker ?? '').trim().to upper case())
 *     the answer = !!m and SECTION_1256_INDEX_OPTION_ROOTS.has(m[1])
 *
 * Called by ... MK-PF-F-006 capGains
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-167 COMPARE · MK-NW-F-080 HOLD
 *               MK-PF-F-006 capGains · MK-NW-O-006 theHolding
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-053
 * Changed ..... not in git yet (—)
 */
export function isBroadIndexOption(p: Pick<Position, 'kind' | 'ticker'>): boolean {
  if (p.kind !== 'options') return false;
  const m = /^[$^]?([A-Z]+)(?=$|[\s\d])/.exec(String(p.ticker ?? '').trim().toUpperCase());
  return !!m && SECTION_1256_INDEX_OPTION_ROOTS.has(m[1]);
}

/** Unrealized capital gains split by holding period — long-term (held MORE than one year, the
 *  IRS line, day-precise) vs short-term. Computed per lot from its purchase date; a lot without a
 *  cost on record is left out of the gain and counted in heldShares but not countedShares, so the page can say so.
 *  E7 (founder brief 2026-08-20): the old rule counted CALENDAR MONTHS — bought Jan 31, sold
 *  Jan 1 was 335 days yet read as long-term, always erring toward the LOWER tax. Day-precise now:
 *  long-term begins the day AFTER the one-year anniversary; exactly one year is still short.
 *  A PURCHASE DATE NOT ON RECORD (purchaseDateOnRecord) puts the lot in NEITHER part (2026-10-21; tenet 3): its gain is in
 *  the total and in `undated`, and with no dated purchase held the two parts are unknown. Until then an unparseable date
 *  was short-term ("the cautious side", a code choice of 2026-08-20) and a missing one long-term (1 January 1970).
 *  AN OPTION ON A BROAD-BASED INDEX (isBroadIndexOption) is split 60% long-term and 40% short-term whatever the holding
 *  period, by law (IRS Publication 550); its purchase dates are not needed. */
export interface CapGains {
  longGain: number | null; shortGain: number | null; totalGain: number | null;
  /** HOW MUCH OF THE HOLDING THE GAIN COUNTS (Q20, 2026-10-20, by DEC-4643's rule): the shares whose price paid is on
   *  record, of the shares held — in the holding's own unit. Null when a share count is not on record, or no price. */
  countedShares: number | null; heldShares: number | null;
  /** PRESENT ONLY WHEN A PURCHASE HELD HAS NO PURCHASE DATE ON RECORD (2026-10-21): the gain on those purchases whose price
   *  paid is on record (null when none has one), the shares it counts, and the shares with no date held. In neither part. */
  undated?: { gain: number | null; counted: number; held: number };
  /** PRESENT ONLY FOR AN OPTION ON A BROAD-BASED INDEX: the split is the 60/40 rule of section 1256, not the holding period. */
  split?: 'section_1256';
}
/* ─ MK-PF-F-006 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * capGains
 *
 * Answers ..... If I sold this today, how much of the gain is long-term and how much short-term?
 *
 * Formula .....
 *     per lot:  gain = shares × (price − cost per share)
 *     long-term when today is LATER than the first anniversary of the purchase
 *     short-term otherwise, and a lot with no cost recorded is skipped entirely
 *
 * Called by ... MK-NW-O-006 theHolding
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-167 COMPARE · MK-NW-F-080 HOLD
 *               MK-NW-O-006 theHolding
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-006
 * Changed ..... 2026-08-20 (77eea92)
 */
export function capGains(p: Position, price: number | null | undefined, now: Date = new Date()): CapGains {
  // no price: no gain to split — unknown, never $0 (tenet 3, DEC-3523; outside review Claude Performance, 2026-10-11)
  if (price == null) return { longGain: null, shortGain: null, totalGain: null, countedShares: null, heldShares: null };
  // per part of the split: the gain on the lots whose cost is on record, the shares counted, the shares held, and whether
  // every share count is on record
  const fresh = () => ({ gain: 0, counted: 0, held: 0, sharesKnown: true });
  const part = { long: fresh(), short: fresh(), undated: fresh() };
  const p2 = (n: number) => String(n).padStart(2, '0');
  const nowKey = `${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())}`;
  for (const lot of (p.lots ?? [])) {
    if (!unknownFigure(lot.shares) && !(lot.shares > 0)) continue;   // no shares held in this lot
    // NO PURCHASE DATE ON RECORD, NO HOLDING PERIOD (2026-10-21; tenet 3): the lot goes in neither part. A missing date was
    // read as bought on 1 January 1970 (long-term) and a blank or impossible one as short-term — a split nothing supports.
    const day = purchaseDateOnRecord(lot.purchase_date);
    let into = part.undated;
    if (day != null) {
      // compare CALENDAR DAYS, not instants — the day as written, against today's local day
      const [y, mo, d] = day.split('-').map(Number);
      const anniversary = new Date(Date.UTC(y + 1, mo - 1, d));
      // bought on 29 February: the next year has no such day, and the date rolled to 1 March, which
      // put the line one day late. The anniversary is the last day of February (Gemini, 2026-10-05).
      if (anniversary.getUTCMonth() !== mo - 1) anniversary.setUTCDate(0);
      const annKey = anniversary.toISOString().slice(0, 10);
      into = nowKey > annKey ? part.long : part.short;
    }
    // A LOT WITH NO SHARE COUNT makes its part of the split unknown, and the total with it: how much of the holding is
    // counted cannot be said (tenet 3; tenet 4) (outside review Claude Performance, 2026-10-11)
    if (unknownFigure(lot.shares)) { into.sharesKnown = false; continue; }
    into.held += lot.shares;
    // A LOT WITH NO COST ON RECORD IS LEFT OUT, AND SAID (Q20, 2026-10-20, by his rule for sales, DEC-4643: "$200 gain on
    // 10 of 15 shares sold; what you paid for the other 5 is not on record"). Its whole part used to be refused, so one
    // purchase with no price paid hid the gain on every purchase that has one.
    if (!lotCostOnRecord(lot)) continue;
    into.counted += lot.shares;
    // × the contract multiplier, as cost and value are (Q06): an option's long/short split was 100 times
    // too small, so its two parts did not add up to the gain above them (outside review, 2026-10-04)
    into.gain += lot.shares * (price - (lot.cost_per_share as number)) * contractMultiplier(p);
  }
  // a part with shares held but none with a price paid on record has no gain to count: unknown, never $0
  const gainOf = (x: typeof part.long) => (!x.sharesKnown || (x.held > 0 && x.counted === 0) ? null : x.gain);
  const sharesKnown = part.long.sharesKnown && part.short.sharesKnown && part.undated.sharesKnown;
  const counted = part.long.counted + part.short.counted + part.undated.counted;
  const held = part.long.held + part.short.held + part.undated.held;
  const totalGain = !sharesKnown || (held > 0 && counted === 0) ? null : part.long.gain + part.short.gain + part.undated.gain;
  const shares = { countedShares: sharesKnown ? counted : null, heldShares: sharesKnown ? held : null };
  // AN OPTION ON A BROAD-BASED INDEX: 60% long-term and 40% short-term of the whole gain, however long it was held (IRS
  // Publication 550, the 60/40 rule; 2026-10-21). It was split by holding period like a share: 2 SPX calls bought 1 July at
  // $50, now $80, read $6,000 short-term and $0 long-term; the law says $3,600 long-term and $2,400 short-term. The
  // short-term part is what is left, so the two add up to the total exactly.
  if (isBroadIndexOption(p)) {
    const longGain = totalGain == null ? null : (totalGain * SECTION_1256_LONG_TERM_PERCENT) / 100;
    return { longGain, shortGain: totalGain == null || longGain == null ? null : totalGain - longGain, totalGain, ...shares, split: 'section_1256' };
  }
  // with no dated purchase held, how the gain splits is not known: neither part is stated (the line under them gives it)
  const noneDated = part.long.held === 0 && part.short.held === 0 && part.long.sharesKnown && part.short.sharesKnown
    && (part.undated.held > 0 || !part.undated.sharesKnown);
  return {
    longGain: noneDated ? null : gainOf(part.long),
    shortGain: noneDated ? null : gainOf(part.short),
    totalGain,
    ...shares,
    ...(part.undated.held > 0 || !part.undated.sharesKnown
      ? { undated: { gain: gainOf(part.undated), counted: part.undated.counted, held: part.undated.held } } : {}),
  };
}
// capGainsTax was CUT by the founder 2026-08-20 (brief §C, Q12) with the embedded-tax
// metric: an estimate on an unrealised gain cannot be calculated honestly.

/** Total return since purchase = gain / cost basis (decimal). null price or zero basis → null. */
/* ─ MK-PF-F-007 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * totalROI
 *
 * Answers ..... Total return since purchase = gain / cost basis (decimal).
 *
 * Formula .....
 *     basis = paid on record(p).paid
 *     gain = unrealized gain(p, price)
 *     nothing   when price = nothing (or basis = nothing (or basis ≤ 0 (or gain = nothing when missing or zero) when missing or zero) when missing or zero)
 *     the answer = gain ÷ basis
 *
 * Called by ... MK-NW-F-167 COMPARE · MK-NW-O-006 theHolding
 *               MK-PF-F-014 buildPerformance
 *
 * Reaches ..... 31 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-PF-F-070 holdingPath · MK-NW-F-168 holdingRowsIn
 *               … and 13 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-007
 * Changed ..... 2026-08-01 (84a3ba5)
 */
export function totalROI(p: Position, price: number | null | undefined): number | null {
  const basis = paidOnRecord(p).paid;   // the same purchases the gain counts (2026-10-20)
  const gain = unrealizedGain(p, price);
  if (price == null || basis == null || basis <= 0 || gain == null) return null;
  return gain / basis;
}

// ---- period returns from a price series (price return of the security itself) ----

/** The date a period starts from, counted back from today: one, three or six months, the start of this year, one year or two years. */
/* ─ MK-PF-F-008 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * startDateFor
 *
 * Answers ..... The date a period starts from, counted back from today: one, three or six months, the start of this year, one year or two years.
 *
 * Formula .....
 *     the date now.get full year(), 0, 1   when period = 'YTD'
 *     back = WINDOW_MONTHS[period]
 *     nothing   when back = nothing
 *     the answer = months before(now, back)
 *
 * Called by ... MK-NW-F-090 windowStartKey · MK-PF-F-014 buildPerformance
 *               MK-PF-F-039 periodReturnParts · MK-PF-F-045 priceHistoryShortSentence
 *
 * Reaches ..... 38 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-NW-F-127 gainOfRow · MK-NW-F-143 gainRowBetween
 *               … and 20 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-008
 * Changed ..... 2026-08-18 (98a342a)
 */
export function startDateFor(period: Period, now: Date): Date | null {
  if (period === 'YTD') return new Date(now.getFullYear(), 0, 1);
  // A WINDOW NAME THE APP DOES NOT HAVE GIVES NO START (his approval, 2026-10-12, DEC-4640): "5Y" read as
  // today here and as twelve months back in MK-NW-F-090 windowStartKey — two guesses for one question. Now
  // both refuse, and whatever asked for that window shows no figure. The screens offer only known names.
  const back = WINDOW_MONTHS[period];
  if (back == null) return null;
  return monthsBefore(now, back);
}

/** The sentence written wherever a holding's window figure is shown and its prices begin after the window opens: how many months the prices reach, against the window the chip names. Empty when the prices reach back, and for a window the app does not name. */
/* ─ MK-PF-F-045 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * priceHistoryShortSentence
 *
 * Answers ..... The sentence written wherever a holding's window figure is shown and its prices begin after the window opens: how many months the prices reach, against the window the chip names.
 *
 * Formula .....
 *     named = NAMED[period]
 *     ''   when named is missing (or window start is missing (or ! ÷ ^\d{4}-\d{2}-\d{2}$ ÷ .test(today) when missing or zero) when missing or zero)
 *     coverage = the first 10) })), window start, today of coverage for((points ?? []).filter((x) => ÷ ^\d{4}-\d{2}-\d{2} ÷ .test(string(date ?? ''))).map((x) => ({ date: string(date)
 *     ''   when coverage.covers (or coverage.from is missing when missing or zero)
 *     first = coverage.from
 *     months = max(0, (ty − fy) × 12 + tm − fm − (td < fd ? 1 : 0))
 *     days = max(0, round((date.parse(`${today}T00:00:00Z`) − date.parse(`${first}T00:00:00Z`)) ÷ 86400000))
 *     the answer = `prices for this holding go back ${plural(months, 'month')}, so the ${label} figure covers ${plural(months, 'month')} — not ${words}.`
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-045
 * Changed ..... not in git yet (—)
 */
export function priceHistoryShortSentence(
  points: { date: string }[] | null | undefined, windowStart: string | null, period: string, today: string,
  /** THE DAY THE PAGE'S OWN "Since" CHIP NAMES, when the caller has one (2026-10-21, one date for one window): on the account
   *  page an account with no daily record opens Since ON its first day money moved, so the day before it is not the day
   *  the chip names — the page read "Since Feb 1, 2024" above "not since Jan 31, 2024". Left out, the day before the window
   *  opens, as before. */
  sinceDay?: string | null,
): string {
  // ONE SENTENCE, ONE PLACE (his approval, 2026-10-12, DEC-4641: "1, 2 - approved"). A holding whose prices
  // begin after the window opens is still measured from its first price; the sentence the Holding page already
  // printed says so — and it was written on that screen only, so the Account page printed the same shorter
  // figure under the longer name with no sentence. Both screens now ask this function. Wording unchanged from
  // the approved drawing (holding-detail v02, phone 3).
  const NAMED: Record<string, [string, string]> = {
    '1M': ['1-month', 'a month'], '3M': ['3-month', 'three months'], '6M': ['6-month', 'six months'],
    YTD: ['year-so-far', 'the whole year so far'], '1Y': ['1-year', 'a year'], '2Y': ['2-year', 'two years'],
    // "Since" names the record's first day, the day before the window opens — as its chip does ("Since Jul 19, 2026")
    SINCE: ['Since', `since ${sinceDay && /^\d{4}-\d{2}-\d{2}$/.test(sinceDay) ? dateShown(sinceDay) : windowStart ? dateShown(new Date(Date.parse(`${windowStart}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10)) : ''}`],
  };
  const named = NAMED[period];
  if (!named || !windowStart || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return '';
  // how far back the prices reach is the ONE coverage function's answer (MK-ST-F-004 coverageFor), never a rewrite
  const coverage = coverageFor((points ?? []).filter((x) => /^\d{4}-\d{2}-\d{2}/.test(String(x?.date ?? ''))).map((x) => ({ date: String(x.date).slice(0, 10) })), windowStart, today);
  if (coverage.covers || !coverage.from) return '';
  const first = coverage.from;
  const [fy, fm, fd] = first.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  const months = Math.max(0, (ty - fy) * 12 + tm - fm - (td < fd ? 1 : 0));
  const [label, words] = named;
  // UNDER A MONTH, THE DAYS (2026-10-21; outside re-run OpenAI part 1, found rendering F3): three days of prices read "go back
  // 0 months, so the 1-year figure covers 0 months" — a span that exists, written as none. Under a month the sentence counts
  // days, from the one list of words and plurals; prices that begin today say so.
  if (months === 0) {
    const days = Math.max(0, Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / 86_400_000));
    return days === 0
      ? `Prices for this holding begin today, so the ${label} figure covers today only — not ${words}.`
      : `Prices for this holding go back ${plural(days, 'day')}, so the ${label} figure covers ${plural(days, 'day')} — not ${words}.`;
  }
  return `Prices for this holding go back ${plural(months, 'month')}, so the ${label} figure covers ${plural(months, 'month')} — not ${words}.`;
}

/** How many months back each window name reaches. ONE table: MK-PF-F-008 startDateFor and MK-NW-F-090
 *  windowStartKey both read it, so a name is either known to both or refused by both (DEC-4640, 2026-10-12). */
export const WINDOW_MONTHS: Readonly<Record<string, number>> = Object.freeze({ '1M': 1, '3M': 3, '6M': 6, '1Y': 12, '2Y': 24 });

/** THE ONE RULE FOR "N MONTHS BACK" (his approval, 2026-10-10, DEC-3768b): the same day of the earlier month,
 *  or that month's last day when the day does not exist there — Mar 31 less one month is Feb 28, and Feb 29
 *  less a year is Feb 28, never rolled into the next month. A local calendar day, so the answer is the same
 *  in every timezone. startDateFor, the look-back's cut-off (MK-PF-F-022) and the door's windowStartKey
 *  (MK-NW-F-090) all ask this one function (outside review Claude Performance, 2026-10-11, DEC-3768b). */
/* ─ MK-PF-F-036 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * monthsBefore
 *
 * Answers ..... THE ONE RULE FOR "N MONTHS BACK" (his approval, 2026-10-10, DEC-3768b): the same day of the earlier month, or that month's last day when the day does not exist there — Mar 31 less one month is Feb 28, and Feb 29 less a year is Feb 28, never rolled into the next month.
 *
 * Formula .....
 *     m = now.get month() − months
 *     last day = the date now.get full year(), m + 1, 0).get date(
 *     d = the date now
 *     the answer = d
 *
 * Called by ... MK-PF-F-008 startDateFor · MK-PF-F-022 factorOverMonths
 *
 * Reaches ..... 43 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-081 LB
 *               MK-NW-F-140 LEFT_OUT · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-144 beforeTheRecordSentence · MK-PF-F-014 buildPerformance
 *               MK-NW-F-084 categoryEarnings · MK-NW-F-142 classReturnOf
 *               MK-PF-F-068 dayAfterDay · MK-PF-F-012 earliestPurchaseDate
 *               MK-PF-F-022 factorOverMonths · MK-PF-F-065 firstDatedPurchase
 *               … and 25 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-036
 * Changed ..... not in git yet (—)
 */
export function monthsBefore(now: Date, months: number): Date {
  const m = now.getMonth() - months;
  const lastDay = new Date(now.getFullYear(), m + 1, 0).getDate();
  const d = new Date(now);
  d.setDate(1); d.setFullYear(now.getFullYear(), m, Math.min(now.getDate(), lastDay));
  return d;
}

/** The calendar day before a day, at the same time of day. */
/* ─ MK-PF-F-037 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * dayBefore
 *
 * Answers ..... The calendar day before a day, at the same time of day.
 *
 * Formula .....
 *     x = the date d
 *     the answer = x
 *
 * Called by ... MK-PF-F-014 buildPerformance · MK-PF-F-039 periodReturnParts
 *
 * Reaches ..... 35 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-NW-F-127 gainOfRow · MK-PF-F-070 holdingPath
 *               … and 17 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-037
 * Changed ..... not in git yet (—)
 */
function dayBefore(d: Date): Date {
  const x = new Date(d);
  x.setDate(x.getDate() - 1);
  return x;
}

/** The calendar day before a day written year-month-day, written the same way — counted on the calendar, so the same in
 *  every time zone. Null for a day the calendar does not have. */
/* ─ MK-PF-F-059 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * dayBeforeDay
 *
 * Answers ..... The calendar day before a day written year-month-day, written the same way — counted on the calendar, so the same in every time zone.
 *
 * Formula .....
 *     nothing   when calendar day(day) = nothing
 *     the first 10 of the date date.parse(`${day}T00:00:00Z`) − 86400000).to isostring(
 *
 * Called by ... MK-PF-F-056 purchasePieces · MK-PF-F-067 purchaseDays
 *               MK-PF-F-070 holdingPath · MK-PF-F-077 eventPath
 *               MK-PF-F-078 yardstickOn
 *
 * Reaches ..... 32 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-077 eventPath
 *               MK-PF-F-065 firstDatedPurchase · MK-PF-F-070 holdingPath
 *               … and 14 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-059
 * Changed ..... not in git yet (—)
 */
function dayBeforeDay(day: string): string | null {
  if (calendarDay(day) == null) return null;
  return new Date(Date.parse(`${day}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
}
/** Close on/just-before a target date (series oldest→newest). */
/* ─ MK-PF-F-029 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * closeAsOf
 *
 * Answers ..... Close on/just-before a target date (series oldest→newest).
 *
 * Formula .....
 *     pts = series.points (or none when missing)
 *     nothing   when count of pts is missing
 *     nothing   when calendar day(day) = nothing
 *     the answer = close on or before(series, day) (or first close(series).close (or nothing when missing) when missing)
 *
 * Called by ... MK-PF-F-011 periodReturnSince · MK-PF-F-014 buildPerformance
 *               MK-PF-F-039 periodReturnParts · MK-PF-F-055 valueAtClose
 *               MK-PF-F-070 holdingPath · MK-PF-F-077 eventPath
 *               MK-PF-F-078 yardstickOn
 *
 * Reaches ..... 38 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-077 eventPath
 *               MK-PF-F-065 firstDatedPurchase · MK-NW-F-127 gainOfRow
 *               … and 20 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-005 holding price
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-029
 * Changed ..... not in git yet (—)
 */
function closeAsOf(series: PriceSeries | null | undefined, target: Date | string): number | null {
  const pts = series?.points ?? [];
  if (!pts.length) return null;
  // A DAY IS COMPARED AS A DAY, ON THE PERSON'S OWN CALENDAR (2026-10-21; DEC-0189, DEC-0282 — "the look-back window must
  // be a local calendar date"). It compared moments: a price's day read as midnight in London against the person's clock,
  // so in California after 5 pm the close of the window's FIRST day was taken as the beginning — the same 1Y window read
  // +21.00% at 9 am and +10.00% at 8 pm. A Date is read as its local calendar day; a written day is read as written.
  const day = typeof target === 'string' ? target.slice(0, 10)
    : `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
  if (calendarDay(day) == null) return null;   // a day the calendar does not have (31 February) is no day (tenet 3)
  // the latest close on or before that day, whatever order the list arrived in; the target predates the series → the
  // first price on record (DEC-4641)
  return closeOnOrBefore(series, day) ?? firstClose(series)?.close ?? null;
}

/** The close ON OR BEFORE a day, with NO fallback. `closeAsOf` reaches forward to the first price
 *  it holds when a date predates the series, which is right for a chart that must draw something
 *  and WRONG for rebuilding a past day: it would price a 2024 holding at a 2026 price. A day we
 *  hold no price for returns null here, so the rebuilt record leaves an honest gap instead
 *  (founder, 2026-09-25 — "what app will show will not match the account"). */
/* ─ MK-PF-F-034 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * closeOnOrBefore
 *
 * Answers ..... The close ON OR BEFORE a day, with NO fallback.
 *
 * Formula .....
 *     close day on or before(series, iso date).close (or nothing when missing)
 *
 * Called by ... MK-NW-F-143 gainRowBetween · MK-PF-F-029 closeAsOf
 *               MK-PF-F-070 holdingPath · MK-XS-F-175 uid
 *
 * Reaches ..... 93 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-082 NW · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-040 assetsFromOnboarding · MK-NW-F-144 beforeTheRecordSentence
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               … and 75 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-005 holding price
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-034
 * Changed ..... not in git yet (—)
 */
export function closeOnOrBefore(series: PriceSeries | null | undefined, isoDate: string): number | null {
  return closeDayOnOrBefore(series, isoDate)?.close ?? null;
}

/** The close on or before a day AND the day it is from — closeOnOrBefore's own reading, for a reader that must know
 *  whether that close falls inside a span (returnSincePurchases' pieces). Null where closeOnOrBefore is. */
/* ─ MK-PF-F-060 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * closeDayOnOrBefore
 *
 * Answers ..... The close on or before a day AND the day it is from — closeOnOrBefore's own reading, for a reader that must know whether that close falls inside a span (returnSincePurchases' pieces).
 *
 * Formula .....
 *     pts = series.points (or none when missing)
 *     nothing   when count of pts is missing (or calendar day(iso date) = nothing when missing or zero)
 *     chosen = nothing
 *     day = the first 10) of calendar day(string(date ?? '')
 *     the answer = chosen
 *
 * Called by ... MK-PF-F-034 closeOnOrBefore · MK-PF-F-056 purchasePieces
 *               MK-PF-F-070 holdingPath · MK-PF-F-077 eventPath
 *
 * Reaches ..... 94 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-082 NW · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-040 assetsFromOnboarding · MK-NW-F-144 beforeTheRecordSentence
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               … and 76 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-005 holding price
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-060
 * Changed ..... not in git yet (—)
 */
export function closeDayOnOrBefore(series: PriceSeries | null | undefined, isoDate: string): { day: string; close: number } | null {
  const pts = series?.points ?? [];
  // A DAY THE CALENDAR HAS (2026-10-21; DEC-3523 tenet 3, DEC-6773; outside re-run OpenAI part 3, MK-PF-F-034): 31 February
  // was read by its shape and priced at the last February close. The one reader of a written day decides, here as for a
  // purchase date (purchaseDateOnRecord).
  if (!pts.length || calendarDay(isoDate) == null) return null;
  // the latest close on or before the date, whatever order the list arrived in (outside review Claude Performance, 2026-10-12);
  // two closes on one day: the one listed later, as latestClose reads it (the feed lists them in time order)
  let chosen: { day: string; close: number } | null = null;
  for (const p of pts) {
    const day = calendarDay(String(p?.date ?? '').slice(0, 10));
    // a close that is not a number is no price (tenet 3: unknown is not a figure) — the point is passed over
    if (day == null || typeof p.close !== 'number' || !Number.isFinite(p.close)) continue;
    if (day <= isoDate && (chosen == null || day >= chosen.day)) chosen = { day, close: p.close };
  }
  return chosen;
}

/** THE FIRST PRICE ON RECORD: the close of the earliest real day in a price list, whatever order it arrived in — what a
 *  window figure is measured from where the holding's prices begin after the window opens (DEC-4641). Null when none. */
/* ─ MK-PF-F-061 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * firstClose
 *
 * Answers ..... THE FIRST PRICE ON RECORD: the close of the earliest real day in a price list, whatever order it arrived in — what a window figure is measured from where the holding's prices begin after the window opens (DEC-4641).
 *
 * Formula .....
 *     first = nothing
 *     day = the first 10) of calendar day(string(date ?? '')
 *     the answer = first
 *
 * Called by ... MK-PF-F-014 buildPerformance · MK-PF-F-029 closeAsOf
 *               MK-PF-F-039 periodReturnParts
 *
 * Reaches ..... 39 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-029 closeAsOf
 *               MK-PF-F-068 dayAfterDay · MK-PF-F-012 earliestPurchaseDate
 *               MK-PF-F-077 eventPath · MK-PF-F-065 firstDatedPurchase
 *               … and 21 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-005 holding price
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-061
 * Changed ..... not in git yet (—)
 */
export function firstClose(series: PriceSeries | null | undefined): { day: string; close: number } | null {
  let first: { day: string; close: number } | null = null;
  for (const p of series?.points ?? []) {
    const day = calendarDay(String(p?.date ?? '').slice(0, 10));
    if (day == null || typeof p.close !== 'number' || !Number.isFinite(p.close)) continue;
    if (first == null || day <= first.day) first = { day, close: p.close };   // ties: the one listed later, as above
  }
  return first;
}

/** A DAY WRITTEN YEAR-MONTH-DAY THAT THE CALENDAR HAS, else null — the app's one reader of a written day decides (MK-NW-F-124
 *  maturityParts): 2026-02-31 is no day and never rolls into March (DEC-0332, DEC-6773). */
/* ─ MK-PF-F-062 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * calendarDay
 *
 * Answers ..... A DAY WRITTEN YEAR-MONTH-DAY THAT THE CALENDAR HAS, else null — the app's one reader of a written day decides (MK-NW-F-124 maturityParts): 2026-02-31 is no day and never rolls into March (DEC-0332, DEC-6773).
 *
 * Formula .....
 *     s = string(d ?? '').trim()
 *     the answer:
 *     s   if ÷ ^\d{4}-\d{2}-\d{2}$ ÷ .test(s) and maturity parts(s) ≠ nothing
 *     nothing   otherwise
 *
 * Called by ... MK-NW-F-148 lastCloseLabel · MK-PF-F-011 periodReturnSince
 *               MK-PF-F-029 closeAsOf · MK-PF-F-059 dayBeforeDay
 *               MK-PF-F-060 closeDayOnOrBefore · MK-PF-F-061 firstClose
 *               MK-PF-F-072 tradesAfter · MK-PF-F-075 soldOutPositions
 *
 * Reaches ..... 101 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-082 NW · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-040 assetsFromOnboarding · MK-NW-F-144 beforeTheRecordSentence
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               … and 83 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-062
 * Changed ..... not in git yet (—)
 */
export function calendarDay(d: unknown): string | null {
  const s = String(d ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && maturityParts(s) != null ? s : null;
}
/* ─ MK-PF-F-009 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * latestClose
 *
 * Answers ..... What is the most recent price we hold for this?
 *
 * Formula .....
 *     latest close = the last point in the price series
 *                  = nothing   when the series is empty
 *
 * Called by ... MK-NW-F-143 gainRowBetween · MK-PF-F-011 periodReturnSince
 *               MK-PF-F-014 buildPerformance · MK-PF-F-039 periodReturnParts
 *               MK-PF-F-054 latestCloseLookup · MK-PF-F-078 yardstickOn
 *
 * Reaches ..... 306 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               … and 288 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-005 holding price
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-009
 * Changed ..... 2026-06-05 (d925b9e)
 */
export function latestClose(series: PriceSeries | null | undefined): number | null {
  // the close on the LATEST DATE, whatever order the list arrived in (outside review Claude Performance, 2026-10-12)
  const pts = (series?.points ?? []).filter((p) => /^\d{4}-\d{2}-\d{2}/.test(String(p?.date ?? '')));
  if (!pts.length) return null;
  return pts.reduce((a, b) => (String(b.date).slice(0, 10) >= String(a.date).slice(0, 10) ? b : a)).close;
}
/** A holding's price today, looked up by its ticker: the latest close in the price history the app holds, nothing when it holds none. The one lookup the amber box is handed on Net worth, Performance and the account page, so a hand-added holding with no price is named on all three or on none (2026-10-21). */
/* ─ MK-PF-F-054 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * latestCloseLookup
 *
 * Answers ..... A holding's price today, looked up by its ticker: the latest close in the price history the app holds, nothing when it holds none.
 *
 * Formula .....
 *     (ticker: string) => latest close(cache.[string(ticker ?? '').trim().to upper case()])
 *
 * Called by ... MK-XS-F-174 recomputeBalances
 *
 * Reaches ..... 305 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               … and 287 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-005 holding price
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-054
 * Changed ..... not in git yet (—)
 */
export function latestCloseLookup(cache: Record<string, PriceSeries> | null | undefined): (ticker: string) => number | null {
  return (ticker: string) => latestClose(cache?.[String(ticker ?? '').trim().toUpperCase()]);
}
/** Price return of a ticker over a period (decimal). null if insufficient data. */
/* ─ MK-PF-F-010 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * periodReturn
 *
 * Answers ..... Price return of a ticker over a period (decimal).
 *
 * Formula .....
 *     p = period return parts(series, period, now)
 *     nothing   when p is missing
 *     the answer:
 *     (1 + total)^(1 ÷ years) − 1   if years > 1
 *     total   otherwise
 *
 * Called by ... MK-NW-F-084 categoryEarnings · MK-NW-F-088 BENCH
 *               MK-NW-F-127 gainOfRow · MK-NW-F-138 knownHoldingsReturn
 *               MK-NW-O-008 thePerformance · MK-PF-F-014 buildPerformance
 *               MK-PF-F-043 windowTotalOfRow
 *
 * Reaches ..... 32 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-NW-F-127 gainOfRow · MK-PF-F-070 holdingPath
 *               … and 14 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-010
 * Changed ..... 2026-08-18 (98a342a)
 */
export function periodReturn(series: PriceSeries | null | undefined, period: Period, now = new Date()): number | null {
  const p = periodReturnParts(series, period, now);
  if (!p) return null;
  // annualize multi-year so 2Y is comparable to 1Y
  return p.years > 1 ? Math.pow(1 + p.total, 1 / p.years) - 1 : p.total;
}

/** THE WINDOW'S OWN TOTAL — the same price move as periodReturn, never turned into a yearly rate. Anything
 *  that adds holdings up or works a dollar gain from a return reads THIS, because over 2Y periodReturn is a
 *  yearly rate and reading it as the window's total halved the gain (outside review Claude Performance,
 *  2026-10-11, MK-NW-F-091: $12,100 at 10% a year gained $2,100 over two years, not $1,100). */
/* ─ MK-PF-F-038 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * periodTotalReturn
 *
 * Answers ..... THE WINDOW'S OWN TOTAL — the same price move as periodReturn, never turned into a yearly rate.
 *
 * Formula .....
 *     period return parts(series, period, now).total (or nothing when missing)
 *
 * Called by ... MK-PF-F-014 buildPerformance
 *
 * Reaches ..... 30 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-PF-F-070 holdingPath · MK-NW-F-168 holdingRowsIn
 *               … and 12 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-038
 * Changed ..... not in git yet (—)
 */
export function periodTotalReturn(series: PriceSeries | null | undefined, period: Period, now = new Date()): number | null {
  return periodReturnParts(series, period, now)?.total ?? null;
}

/** One price move over a period: its total, and the years a yearly rate of it is taken over (1 = never yearly). */
/* ─ MK-PF-F-039 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * periodReturnParts
 *
 * Answers ..... One price move over a period: its total, and the years a yearly rate of it is taken over (1 = never yearly).
 *
 * Formula .....
 *     nothing   when series is missing (or not (count of series.points) when missing or zero)
 *     end = latest close(series)
 *     opens = start date for(period, now)
 *     nothing   when opens = nothing
 *     begin day = iso day(day before(opens))
 *     start = close as of(series, begin day)
 *     nothing   when end = nothing (or start = nothing (or start ≤ 0 when missing or zero) when missing or zero)
 *     total = end ÷ start − 1
 *     total = total
 *     years = 1   when period ! = '2Y'
 *     first = first close(series)
 *     from = first.day   if first ≠ nothing and first.day > begin day
 *     begin day   otherwise
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-PF-F-010 periodReturn · MK-PF-F-014 buildPerformance
 *               MK-PF-F-038 periodTotalReturn
 *
 * Reaches ..... 34 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-NW-F-127 gainOfRow · MK-PF-F-070 holdingPath
 *               … and 16 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-005 holding price
 *
 * Decides .....
 *     · Treats a year as 365 days.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-039
 * Changed ..... not in git yet (—)
 */
function periodReturnParts(series: PriceSeries | null | undefined, period: Period, now: Date): { total: number; years: number } | null {
  if (!series || !(series.points?.length)) return null;
  const end = latestClose(series);
  // THE BEGINNING IS THE CLOSE OF THE DAY BEFORE THE PERIOD'S FIRST DAY (DEC-0315, Q3: both boundary days are
  // inside the window). It was the close ON the first day, so that day's own move was left out — +7.84% where
  // +10.00% is right (outside review Claude Performance, 2026-10-11). The door's walk reads the same day.
  const opens = startDateFor(period, now);
  if (opens == null) return null;   // a window name the app does not have: no figure (DEC-4640)
  // the beginning is read as the person's own calendar day (DEC-0189, DEC-0282 — closeAsOf, 2026-10-21)
  const beginDay = isoDay(dayBefore(opens));
  const start = closeAsOf(series, beginDay);
  if (end == null || start == null || start <= 0) return null;
  const total = end / start - 1;
  // FOUNDER DECISION 2026-08-18: two years is the longest window offered, because two years is
  // exactly how much daily history the app keeps. Offering three would draw a line from a date
  // we have no record of. Multi-year returns are still shown per year, so 2Y sits fairly beside 1Y.
  if (period !== '2Y') return { total, years: 1 };
  // WHEN THE PRICES DO NOT REACH BACK TWO YEARS the start is the first price on record, and the
  // figure covers only that span. It was still turned into a yearly rate as though it covered two
  // years — fourteen months of a holding that rose 21% read as +10% a year instead of +17.8%
  // (found 2026-10-04 holding the Holding page to its drawing, which says the window out loud).
  // The yearly rate is over the span the prices do cover; a span of a year or less is never made
  // yearly (founder ruling 2026-09-25).
  // ONE RULE FOR A YEARLY RATE ON EVERY SCREEN (2026-10-21; the precision standard, "(1 + the return)^(365 ÷ days) − 1",
  // which the account's figure and DEC-6412's approved "+22.95% over 731 days = +10.87% a year" follow; outside re-run
  // OpenAI, MK-PF-M-016 and MK-PF-F-010). The holding rows used exactly 2 years — 21% over the same 731 days read +10.00%
  // a year on a holding and +9.99% on the account — and 365.25-day years where the prices begin later. Now: the days
  // from the evening the figure is measured from (the day before the window, or the first price) to today, ÷ 365; and,
  // as the door reads it, a span that reaches back no further than the 1Y window's own beginning is a year or less, so
  // it is the total, never made yearly.
  const first = firstClose(series);
  const from = first != null && first.day > beginDay ? first.day : beginDay;
  const yearBegins = isoDay(dayBefore(startDateFor('1Y', now)!));
  if (from >= yearBegins) return { total, years: 1 };
  const days = Math.round((Date.parse(`${isoDay(now)}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
  return { total, years: days / 365 };
}

/** Price return from an explicit start DATE to now (for purchase-capped windows). */
/* ─ MK-PF-F-011 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * periodReturnSince
 *
 * Answers ..... Price return from an explicit start DATE to now (for purchase-capped windows).
 *
 * Formula .....
 *     nothing   when series is missing (or not (count of series.points) when missing or zero)
 *     since = the first 10) of calendar day(string(since iso ?? '')
 *     nothing   when since = nothing (or since > iso day(now) when missing or zero)
 *     end = latest close(series)
 *     start = close as of(series, since)
 *     nothing   when end = nothing (or start = nothing (or start ≤ 0 when missing or zero) when missing or zero)
 *     the answer = end ÷ start − 1
 *
 * Called by ... MK-PF-F-014 buildPerformance
 *
 * Reaches ..... 30 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-PF-F-070 holdingPath · MK-NW-F-168 holdingRowsIn
 *               … and 12 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-005 holding price
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-011
 * Changed ..... 2026-07-20 (8f9b9f1)
 */
export function periodReturnSince(series: PriceSeries | null | undefined, sinceISO: string, now = new Date()): number | null {
  if (!series || !(series.points?.length)) return null;
  // the day written, read as written (closeAsOf compares days, 2026-10-21); a day the calendar does not have is no start
  const since = calendarDay(String(sinceISO ?? '').slice(0, 10));
  // A WINDOW THAT HAS NOT BEGUN HAS NO MOVE TO STATE (2026-10-21; DEC-3523 tenet 3; outside re-run OpenAI part 2,
  // MK-PF-F-011): a start after today read the latest close against itself, +0.00% — a figure that says "no change".
  // `now` is the person's own calendar day. No figure.
  if (since == null || since > isoDay(now)) return null;
  const end = latestClose(series);
  const start = closeAsOf(series, since);
  if (end == null || start == null || start <= 0) return null;
  return ((end / start - 1));
}

/** WHAT A HOLDING WAS WORTH AT THE CLOSE A WINDOW FIGURE IS MEASURED FROM (2026-10-21; DEC-5068, tenet 4): the shares it
 *  holds × the close on or before that day (its first close where its prices begin later — the close periodReturnSince and
 *  periodReturnParts divide by) × its multiplier. A day written YYYY-MM-DD is read as periodReturnSince reads it. Unknown
 *  where no close above $0 is held for it, or the share count is unknown. The one start a holding worth $0 today has. */
/* ─ MK-PF-F-055 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * valueAtClose
 *
 * Answers ..... WHAT A HOLDING WAS WORTH AT THE CLOSE A WINDOW FIGURE IS MEASURED FROM (2026-10-21; DEC-5068, tenet 4): the shares it holds × the close on or before that day (its first close where its prices begin later — the close periodReturnSince and periodReturnParts divide by) × its multiplier.
 *
 * Formula .....
 *     close = close as of(series, from)
 *     the answer:
 *     nothing   if close = nothing (or not (close > 0) when missing or zero)
 *     market value(p, close)   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-005 holding price
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-055
 * Changed ..... not in git yet (—)
 */
export function valueAtClose(p: Position, series: PriceSeries | null | undefined, from: Date | string): number | null {
  // a written day is read as written, a Date as the person's own calendar day (closeAsOf compares days, 2026-10-21)
  const close = closeAsOf(series, from);
  return close == null || !(close > 0) ? null : marketValue(p, close);
}

/** THE PART OF A HOLDING THAT WAS ALREADY HELD ON A DAY (2026-10-21; DEC-1669, DEC-3035b, tenet 4; outside re-run OpenAI
 *  part 3, MK-PF-F-020): its purchases dated on or before that day, and those with no date on record (counted as held, as
 *  every reader of the window does). 10 shares bought in 2025 and 10 more inside the window are 10 shares when the window
 *  began — the market's weights were worked from all 20 ($2,420 ÷ 1.21 = $2,000, where $1,000 was held). The holding
 *  itself when every purchase was. */
/* ─ MK-PF-F-063 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * heldOnDay
 *
 * Answers ..... THE PART OF A HOLDING THAT WAS ALREADY HELD ON A DAY (2026-10-21; DEC-1669, DEC-3035b, tenet 4; outside re-run OpenAI part 3, MK-PF-F-020): its purchases dated on or before that day, and those with no date on record (counted as held, as every reader of the window does).
 *
 * Formula .....
 *     lots = lots (or none when missing)
 *     kept = lots where { const d = purchase date on record(purchase date); return d = nothing or d ≤ last day; }
 *     the answer:
 *     p   if count of kept.length = lots
 *     ...p = ...p
 *     lots = kept   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-007 purchase price and date (per lot)
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-063
 * Changed ..... not in git yet (—)
 */
export function heldOnDay(p: Position, lastDay: string): Position {
  const lots = p.lots ?? [];
  const kept = lots.filter((l) => { const d = purchaseDateOnRecord(l.purchase_date); return d == null || d <= lastDay; });
  return kept.length === lots.length ? p : { ...p, lots: kept };
}

/** Earliest dated lot — the day this holding became YOUR money. null when no lot carries a date. */
/* ─ MK-PF-F-012 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * earliestPurchaseDate
 *
 * Answers ..... Earliest dated lot — the day this holding became YOUR money.
 *
 * Formula .....
 *     held = purchases held(p)
 *     dates = for each of held: purchase date on record(purchase date)
 *     nothing   when count of dates is missing (or dates.some((d) => d = nothing) when missing or zero)
 *     the answer = (dates as string[]).sort()[0]!
 *
 * Called by ... MK-PF-F-014 buildPerformance
 *
 * Reaches ..... 30 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-PF-F-070 holdingPath · MK-NW-F-168 holdingRowsIn
 *               … and 12 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-007 purchase price and date (per lot)
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-012
 * Changed ..... 2026-07-20 (8f9b9f1)
 */
export function earliestPurchaseDate(p: Position): string | null {
  // the one reading of a purchase date (purchaseDateOnRecord, 2026-10-21): a day that does not exist (31 February) is not on
  // record here either, as on the gains if sold today
  // A LOT OF 0 SHARES IS NO PURCHASE (2026-10-21; DEC-1669, tenet 4; outside re-run OpenAI part 2, MK-PF-F-012): every other
  // reader of a holding's purchases passes it over, and here a value-only import line dated 2024 kept a holding bought in
  // May 2026 measured over the whole year (+21.64% where +17.00% is right).
  const held = purchasesHeld(p);
  // A PURCHASE WITH NO DATE BESIDE DATED ONES (2026-10-21, the lead's decision under DEC-3523 tenet 3; outside re-run OpenAI
  // part 2, MK-PF-F-012, was NEEDS A RULING): it may be the first, so the day this holding became your money is not on
  // record — never the earliest dated one. With no date on any purchase it is not on record either, as before.
  const dates = held.map((l) => purchaseDateOnRecord(l.purchase_date));
  if (!dates.length || dates.some((d) => d == null)) return null;
  return (dates as string[]).sort()[0]!;
}

/** The purchases a holding still holds: every lot but one whose share count is a known 0 or less (a lot whose count is not
 *  on record is still a purchase). One reading for the readers of a holding's purchase days (2026-10-21, MK-PF-F-012). */
/* ─ MK-PF-F-064 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * purchasesHeld
 *
 * Answers ..... The purchases a holding still holds: every lot but one whose share count is a known 0 or less (a lot whose count is not on record is still a purchase).
 *
 * Formula .....
 *     lots (or none when missing) where not (typeof shares = 'number' and number.is finite(shares) and shares ≤ 0)
 *
 * Called by ... MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-PF-F-073 sharesThroughWindow
 *
 * Reaches ..... 30 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-PF-F-070 holdingPath · MK-NW-F-168 holdingRowsIn
 *               … and 12 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-064
 * Changed ..... not in git yet (—)
 */
function purchasesHeld(p: Position): Lot[] {
  return (p.lots ?? []).filter((l) => !(typeof l?.shares === 'number' && Number.isFinite(l.shares) && l.shares <= 0));
}

/** THE EARLIEST PURCHASE WHOSE DATE IS ON RECORD, of the purchases a holding still holds — null when none has one. Where a
 *  purchase with no date sits beside it this is not the day the holding began (earliestPurchaseDate says that is not on
 *  record); a window still counts the holding as bought inside it from this day, and its return since purchase refuses
 *  (returnSincePurchases, 2026-10-21). */
/* ─ MK-PF-F-065 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * firstDatedPurchase
 *
 * Answers ..... THE EARLIEST PURCHASE WHOSE DATE IS ON RECORD, of the purchases a holding still holds — null when none has one.
 *
 * Formula .....
 *     dates = for each of purchases held(p): purchase date on record(purchase date) where (d): d is string => d ≠ nothing
 *     the answer:
 *     dates.sort()[0]!   if count of dates
 *     nothing   otherwise
 *
 * Called by ... MK-PF-F-014 buildPerformance
 *
 * Reaches ..... 30 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-PF-F-070 holdingPath · MK-NW-F-168 holdingRowsIn
 *               … and 12 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-007 purchase price and date (per lot)
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-065
 * Changed ..... not in git yet (—)
 */
function firstDatedPurchase(p: Position): string | null {
  const dates = purchasesHeld(p).map((l) => purchaseDateOnRecord(l.purchase_date)).filter((d): d is string => d != null);
  return dates.length ? dates.sort()[0]! : null;
}

/** Default benchmark ETF proxy per asset kind — the index we compare a holding against, same period. */
export const BENCHMARK_TICKER: Record<string, string> = {
  stocks_etf: 'SPY',        // S&P 500
  fixed_income: 'AGG',      // US Aggregate Bond
  private_equity: 'PSP',    // listed PE proxy
  hedge_funds: 'QAI',       // hedge-fund-replication proxy
  commodities: 'GLD',       // gold
  crypto: 'BTC',            // (provider maps to btc.v / btcusd)
  annuities: 'AGG',
  college_529: 'AOR',       // 60/40 allocation proxy
  '401k': 'AOR',
  trad_ira: 'AOR',
  roth_ira: 'AOR',
  hsa: 'AOR',
  other_asset: 'SPY',
};
/* ─ MK-PF-F-013 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * benchmarkTicker
 *
 * Answers ..... What should this holding be compared against?
 *
 * Formula .....
 *     h = { kind: of ?? undefined } as pick<position, 'kind' | 'asset_class' | 'class_source' | 'broker_type' | 'cash_equivalent'>   if of is a string (or of = nothing when missing or zero)
 *     of   otherwise
 *     kind = kind (or undefined when missing or zero)
 *     by class = 'AGG'   if asset class = 'bond'
 *     'SPY'   if asset class = 'stock_etf'
 *     nothing   otherwise   otherwise
 *     by class   when by class and class source = 'user'
 *     broker = broker class of(broker type ?? nothing, cash equivalent = true)
 *     by broker = 'AGG'   if broker.cls = 'bonds'
 *     'SPY'   if broker.cls = 'stocks_etf'
 *     nothing   otherwise   otherwise
 *     by broker   when by broker
 *     by class   when by class and (!kind or !BENCHMARK_TICKER[kind])
 *     BENCHMARK_TICKER[kind]   when kind and BENCHMARK_TICKER[kind]
 *     'SPY'   when kind (or asset class when missing or zero)
 *     the answer = nothing
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-146 undatedGainSentence · MK-PF-F-014 buildPerformance
 *               MK-XS-F-175 uid
 *
 * Reaches ..... 84 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-082 NW · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-040 assetsFromOnboarding · MK-NW-F-144 beforeTheRecordSentence
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               … and 66 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-056 how a holding was classified, and by whom
 *               MK-XS-I-070 the class a broker sends for a holding — its security type and its cash-equivalent flag
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-013
 * Changed ..... 2026-06-05 (d925b9e)
 */
export function benchmarkTicker(of?: string | Pick<Position, 'kind' | 'asset_class' | 'class_source' | 'broker_type' | 'cash_equivalent'>): string | null {
  const h = typeof of === 'string' || of == null ? { kind: of ?? undefined } as Pick<Position, 'kind' | 'asset_class' | 'class_source' | 'broker_type' | 'cash_equivalent'> : of;
  const kind = h.kind || undefined;
  // THE PERSON'S CLASS DECIDES (tenet 5, DEC-3523; DEC-0309 a class they set is kept): a holding they called a
  // bond is set beside the bond market, whatever kind it was first given. A class with no kind beside it
  // decides too. (outside review Claude Performance, 2026-10-11)
  const byClass = h.asset_class === 'bond' ? 'AGG' : h.asset_class === 'stock_etf' ? 'SPY' : null;
  if (byClass && h.class_source === 'user') return byClass;
  // THEN THE CLASS THE BROKER SENDS (his ruling of 2026-10-20, DEC-6614: "always the class broker sends"; DEC-2159
  // settled). The class reader (MK-NW-F-109 holdingClassOf) already files a bond the broker sends as Bonds & CDs; the
  // yardstick followed the wrapper kind instead (a 401(k) → AOR), so one holding had two answers to "what is it"
  // (tenet 4). The same broker reading (brokerClassOf) now picks the yardstick: a bond → AGG, a stock or fund → SPY.
  // (outside re-run OpenAI part 2, MK-PF-F-013, 2026-10-21)
  const broker = brokerClassOf(h.broker_type ?? null, h.cash_equivalent === true);
  const byBroker = broker?.cls === 'bonds' ? 'AGG' : broker?.cls === 'stocks_etf' ? 'SPY' : null;
  if (byBroker) return byBroker;
  if (byClass && (!kind || !BENCHMARK_TICKER[kind])) return byClass;
  if (kind && BENCHMARK_TICKER[kind]) return BENCHMARK_TICKER[kind];
  // described, with no yardstick of its own named: the stock market, as before
  if (kind || h.asset_class) return 'SPY';
  // NOTHING SAYS WHAT IT IS: no yardstick, and the comparison refuses for it (DEC-2160: the app does not guess;
  // tenet 3, never a default that looks like an answer) — it read 'SPY' (outside review Claude Performance, 2026-10-11)
  return null;
}

/** One row of the per-holding performance table. */
export interface PerformanceRow {
  position: Position;
  price: number | null;
  marketValue: number | null;     // null: worth something unknown — shares with no price (tenet 3)
  costBasis: number | null;       // what was paid over the purchases whose price paid is on record (paidOnRecord); null: a share count not entered, or no price paid on record
  gain: number | null;
  totalROI: number | null;        // since purchase
  periodReturn: number | null;    // YOUR return over the window (capped at purchase — see cappedSince); a yearly rate over 2Y
  /** The window's OWN total — never a yearly rate. Equal to periodReturn except over 2Y. Read this to add
   *  holdings up or to work a dollar gain (outside review Claude Performance, 2026-10-11). */
  periodTotal?: number | null;
  benchTicker: string | null;     // null: nothing says what the holding is, so no yardstick (DEC-2160)
  benchReturn: number | null;     // benchmark over the SAME dates — honest comparison
  /** The yardstick's own total over the window, never a yearly rate. */
  benchTotal?: number | null;
  beatBy: number | null;          // periodReturn − benchReturn
  cappedSince: string | null;     // 'YYYY-MM-DD' when the window starts at YOUR purchase, else null
  /** A BOND'S OR CD'S INTEREST IN THE WINDOW (DEC-6212, 2026-10-19): the interest records it was paid on or after the
   *  window's first day — already inside periodReturn and periodTotal. Null for anything that is not an individual bond
   *  or CD (a fund's distributions are in its adjusted closes, DEC-4644), and where nothing was handed to read. */
  interest?: number | null;
  /** WHAT THE HOLDING WAS WORTH WHEN ITS WINDOW FIGURE BEGAN (2026-10-21; DEC-5068, tenet 4): the shares it held then × the
   *  close its window figure is measured from × its multiplier — for a holding bought inside the window, the value its
   *  return since its purchases is measured from. Its value today ÷ (1 + its window total) is this same figure whenever
   *  it is worth more than $0 and no shares were bought inside the window (shares bought inside it are left out here,
   *  MK-PF-F-020); worth $0 today, this is the only way to read it, so the readers that work a window back
   *  count what it lost instead of leaving it out. A known $0 is $0. Null where that close or share count is unknown. */
  startValue?: number | null;
  /** WHAT WAS PAID FOR SHARES BOUGHT INSIDE THE WINDOW (2026-10-21; DEC-3656, tenet 3): shares × price paid × multiplier over
   *  its purchases dated after the close its window figure starts from — including any a sale has since taken (2026-10-22).
   *  What it gained is its value today + interest − startValue − this + soldInside: 10 held at $100, 10 more bought at $110,
   *  now $121 → $2,420 − $1,000 − $1,100 = $320 (worked from today's 20 shares it read $420). Bought inside the window, every
   *  purchase in it. Null where one of them has no price paid on record (its gain is then unknown); absent where a holding
   *  held when the window began bought nothing after. */
  paidInside?: number | null;
  /** WHAT ITS SALES INSIDE THE WINDOW BROUGHT IN (2026-10-22; DEC-3656): shares × the sale price × multiplier, or the amount
   *  where no price is on record. 20 held at $100, 10 sold at $110, 10 left at $121 → gained $1,210 − $2,000 + $1,100 = $310.
   *  Null where a sale has neither; absent where it sold nothing in the window. */
  soldInside?: number | null;
  /** BOUGHT INSIDE THE WINDOW, BUT HELD WHEN IT BEGAN TOO (2026-10-22): every purchase from before the window was sold and it was
   *  bought again, so today's purchases all fall inside it — what the shares held at the start were worth then. Absent
   *  otherwise; null where that is not known. */
  heldAtStart?: number | null;
  /** WHAT IT WAS WORTH ON EACH DAY MONEY WENT INTO ANY HOLDING BUILT BESIDE IT (2026-10-21; DEC-1669) — so a category, or
   *  the holdings together, is split at each of those days (returnSplitAtPurchases). Absent where a figure it needs is not
   *  known; then a category is weighed by the starts instead. */
  path?: HoldingPath;
  /** BOUGHT INSIDE THE WINDOW WITH A PURCHASE WHOSE DATE IS NOT ON RECORD BESIDE DATED ONES (2026-10-21, MK-PF-F-040): its
   *  return since purchase is not known (periodReturn and periodTotal are null), and the screen says why. Absent otherwise. */
  undatedPurchase?: true;
  /** THE YEARS periodReturn IS A YEARLY RATE OVER (2026-10-21; DEC-0237, DEC-0404): set only where it is one — a fixed window
   *  longer than a year whose prices reach back more than a year — so a screen can write "/year" and the window's own total
   *  (periodTotal) beside it. Null where periodReturn is the window's own total. */
  years?: number | null;
}
/** Build the per-holding rows for a period from positions + a price-series lookup.
 *  APPROVED 2026-07-19 (invest-v3 FINAL): a holding younger than the period counts from the day
 *  it was bought — its return is what happened to YOUR money ((value − cost)/cost), and the
 *  benchmark is measured over those SAME dates. `purchaseDateOf` supplies a purchase date when
 *  the lots don't carry one (e.g. a connected broker's average-cost lot — the ledger's earliest
 *  BUY fills in). */
/* ─ MK-PF-F-014 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * buildPerformance
 *
 * Answers ..... Build the per-holding rows for a period from positions + a price-series lookup.
 *
 * Formula .....
 *     given = window start   if window start ≠ nothing and ÷ ^\d{4}-\d{2}-\d{2}$ ÷ .test(window start)
 *     nothing   otherwise
 *     opens = the date `${given}T12:00:00`   if given
 *     start date for(period, now)   otherwise
 *     period start = nothing   if opens = nothing
 *     iso day(opens)   otherwise
 *     begin iso = nothing   if opens = nothing
 *     iso day(day before(opens))   otherwise
 *     ret = period return since(s, begin iso, now)   if begin iso
 *     nothing   otherwise   if (s: price series | nothing | undefined) => given
 *     period return(s, period, now)   otherwise
 *     total = period return since(s, begin iso, now)   if begin iso
 *     nothing   otherwise   if (s: price series | nothing | undefined) => given
 *     period total return(s, period, now)   otherwise
 *     plans = []
 *     sold out = sold out positions(positions ?? [], income.transactions ?? [], income.accounts ?? [], begin iso, iso day(now))   if income and begin iso ≠ nothing
 *     []   otherwise
 *     gone = (p as any).sold out = true
 *     series = price of(ticker)
 *     price = latest close(series)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-080 HOLD · MK-NW-F-088 BENCH
 *               MK-NW-F-091 pricedGainOf · MK-NW-F-142 classReturnOf
 *               MK-NW-F-165 purchaseQuantityWords · MK-NW-F-167 COMPARE
 *               MK-NW-F-168 holdingRowsIn · MK-NW-O-008 thePerformance
 *               MK-PF-F-020 portfolioBenchReturn
 *
 * Reaches ..... 30 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-PF-F-070 holdingPath · MK-NW-F-168 holdingRowsIn
 *               … and 12 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Decides .....
 *     · If years is missing it uses 1.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-014
 * Changed ..... 2026-07-20 (8f9b9f1)
 */
export function buildPerformance(
  positions: Position[],
  priceOf: (ticker: string) => PriceSeries | null | undefined,
  period: Period,
  now = new Date(),
  purchaseDateOf?: (p: Position) => string | null,
  windowStart?: string | null,
  /** The records, and the accounts holding these positions — so a bond's or a CD's interest is added to its return
   *  (DEC-6212). Without them a row is its price move alone, as before. */
  income?: { transactions?: any[] | null; accounts?: any[] | null } | null,
): PerformanceRow[] {
  // the period's first day as the person's own calendar day (TZ-1) — never through UTC
  // a window name the app does not have opens nowhere: every row's window figures are unknown (DEC-4640)
  // "SINCE" HAS NO FIXED LENGTH — its first day is the record's, which only the caller knows, so the caller hands it
  // over (windowStart). Before 2026-10-12 startDateFor read "SINCE" as TODAY, and every holding's "Since" figure was
  // that one day's move — a guessed start under the Since label (found applying DEC-4640). A window handed over this
  // way is the window's own total, never a yearly rate.
  const given = windowStart != null && /^\d{4}-\d{2}-\d{2}$/.test(windowStart) ? windowStart : null;
  const opens = given ? new Date(`${given}T12:00:00`) : startDateFor(period, now);
  const periodStart = opens == null ? null : isoDay(opens);
  const beginISO = opens == null ? null : isoDay(dayBefore(opens));
  const ret = (s: PriceSeries | null | undefined) => given ? (beginISO ? periodReturnSince(s, beginISO, now) : null) : periodReturn(s, period, now);
  const total = (s: PriceSeries | null | undefined) => given ? (beginISO ? periodReturnSince(s, beginISO, now) : null) : periodTotalReturn(s, period, now);
  const plans: (HoldingPlan | null)[] = [];   // what each row's path is read from (holdingPath, below), row by row
  // A HOLDING SOLD IN FULL INSIDE THE WINDOW IS STILL PART OF IT (2026-10-22; DEC-3656): the sale took it out of today's
  // holdings, so it is read from its account's sale records — 10 held at $100, all sold at $110: it was worth $1,000 when the
  // window began and gained $100. It had no row, so its $1,100 of cash read as if held from the start.
  const soldOut = income && beginISO != null ? soldOutPositions(positions ?? [], income.transactions ?? [], income.accounts ?? [], beginISO, isoDay(now)) : [];
  const rows: PerformanceRow[] = [...(positions ?? []), ...soldOut].map((p) => {
    const gone = (p as any).sold_out === true;
    const series = priceOf(p.ticker);
    const price = latestClose(series);
    const lotDate = earliestPurchaseDate(p);
    // a purchase with no date beside dated ones (2026-10-21, MK-PF-F-012): the day the holding began is not on record, but
    // the window still counts it as bought inside from its first dated purchase — and its return since purchase refuses
    const firstDated = lotDate ?? firstDatedPurchase(p);
    const bought = firstDated ?? purchaseDateOf?.(p) ?? null;
    // A PURCHASE ON THE PERIOD'S FIRST DAY IS INSIDE IT (DEC-0315, Q3: both boundary days are inside, and the
    // beginning is the close of the day before, when this money was not yet held) — it read '>' (outside
    // review Claude Performance, 2026-10-11)
    // For "Since" (a window handed over), a stand-in date the caller supplies for a holding with no dated purchase is
    // the record's own first day — the holding is part of the beginning value, not bought inside the window — so only a
    // stand-in AFTER the first day caps it.
    const capped = !gone && bought != null && periodStart != null && (given && firstDated == null ? bought > periodStart : bought >= periodStart);
    // A HOLDING BOUGHT INSIDE THE WINDOW IS TIME-WEIGHTED FROM ITS PURCHASES (DEC-1669): split at each purchase,
    // each piece's growth multiplied — bought at $200 and again at $250, now $260, is +30.00%, not the +15.56%
    // return on cost (outside review Claude Performance, 2026-10-11). One purchase day gives the return on cost.
    const pricePr = capped ? returnSincePurchases(p, series, price, bought!) : ret(series);
    const priceTotal = capped ? pricePr : total(series);
    const benchTicker = benchmarkTicker(p);
    const benchSeries = benchTicker ? priceOf(benchTicker) : null;
    // THE MARKET OVER THE SAME DATES WHEN THIS HOLDING'S PRICES DO NOT REACH BACK. The holding is then measured from
    // its first close on record (periodReturnParts), so the market is measured from that same day, and over 2Y made
    // yearly over the same span. It was measured over the whole window: a holding with two days of prices read
    // "Your return, past year +0.96%" beside "The market, same dates +22.40%", a year of the market (mock-match
    // audit v02, 2026-10-11 — Holding detail v02 draws "VS THE STOCK MARKET · SAME DATES").
    // the first price on record, whatever order the list arrived in, compared as a day on the person's own calendar —
    // it was compared as a moment, so after 5 pm in California a first close ON the window's beginning read as later
    // (DEC-0189, DEC-0282; closeAsOf, 2026-10-21)
    const firstISO = firstClose(series)?.day ?? null;
    const short = !capped && firstISO != null && beginISO != null && firstISO > beginISO;
    const benchSameDays = short && benchTicker != null ? periodReturnSince(benchSeries, firstISO!, now) : null;
    // ONE YEARLY RATE FOR THE TWO (2026-10-21, MK-PF-M-016): the market over the same span is made yearly over the very
    // years the holding's own figure is (periodReturnParts) — it used 365.25-day years from the first to the last price
    const spanYears = short && !given ? (periodReturnParts(series, period, now)?.years ?? 1) : 1;
    // bought inside the window, the market is measured since the purchase date (invest-v3 FINAL, 2026-07-19); a purchase
    // dated after today has no market figure (periodReturnSince, 2026-10-21 — a window that has not begun)
    const benchReturn = benchTicker == null ? null : capped
      ? periodReturnSince(benchSeries, bought!, now)
      : short ? (benchSameDays == null ? null : !given && period === '2Y' && spanYears > 1 ? Math.pow(1 + benchSameDays, 1 / spanYears) - 1 : benchSameDays)
      : ret(benchSeries);
    const benchTotal = benchTicker == null ? null : capped ? benchReturn : short ? benchSameDays : total(benchSeries);
    // A BOND'S OR CD'S RETURN IS ITS PRICE CHANGE PLUS THE INTEREST IT PAID IN THE WINDOW (DEC-6212, 2026-10-19, his
    // words: "Rule is to return % should include price change, dividend and interest, so showing 0% return for bond is
    // not accurate." — "approved."). The interest counted is from the day the price is measured from: the purchase when
    // bought inside the window, the first close when its prices begin later, else the window's first day. A fund keeps
    // its adjusted closes alone (DEC-4644): its distributions are already in them, so nothing is added twice.
    const mv = marketValue(p, price);
    const from = capped ? bought : short ? isoDay(new Date(Date.parse(`${firstISO!.slice(0, 10)}T12:00:00`) + 86_400_000)) : periodStart;
    const interest = income ? bondInterestInWindow(p, income.transactions ?? [], from, income.accounts ?? []) : null;
    // WHAT IT WAS WORTH WHEN ITS WINDOW FIGURE BEGAN (2026-10-21; DEC-5068, tenet 4): the shares held × the very close its
    // window figure divides by × its multiplier; bought inside the window, the value its return since its purchases is
    // measured from. A holding that fell to $0 keeps it, so nothing that works the window back can lose what it lost.
    const pieces = capped && priceTotal != null ? purchasePieces(p, series, bought!) : null;
    // ONLY THE SHARES HELD WHEN THE WINDOW BEGAN (2026-10-21, MK-PF-F-020): shares bought inside the window were not held
    // at that close, so they are not part of what it was worth then — the close of the day before the first day, or the
    // first close where its prices begin later (purchases on that day are before its close)
    const startDay = short ? firstISO!.slice(0, 10) : beginISO!;
    // ITS SHARES AND TRADES THROUGH THE WINDOW (2026-10-22; DEC-3656, DEC-7221): a sale takes shares out of today's purchases,
    // so what was held when the window began is today's shares less those bought since plus those sold since — 20 held, 10
    // sold, 10 left: 20 held then, never the 10 still held. Its account's records say what it bought and sold, and when.
    const trades = income && beginISO != null ? tradesAfter(p, income.transactions ?? [], income.accounts ?? [], capped ? beginISO : startDay, isoDay(now))
      : { sales: [], buys: new Map() } as WindowTrades;
    const through = priceTotal == null || beginISO == null ? null : sharesThroughWindow(p, capped ? beginISO : startDay, trades, capped ? bought : null);
    // the close its window figure is measured from: the evening before the first day, or its first close where its prices begin later
    const startClose = beginISO == null ? null : closeAsOf(series, given ? beginISO : dayBefore(opens!));
    const heldThen = (shares: number | null | undefined) => shares == null || startClose == null || !(startClose > 0) ? null
      : shares === 0 ? 0 : shares * startClose * contractMultiplier(p);
    // ITS OWN FIGURE FROM EVERY PURCHASE AND SALE IN THE WINDOW (2026-10-22; DEC-1669, DEC-4439), wherever today's purchases cannot
    // say it: a holding bought inside the window that sold some of it, one held when it began that sold out and bought again,
    // and one sold in full. Each purchase counts from the start of its day at what was paid; a sale takes its shares out at the
    // previous evening's close; nothing held, no piece. 10 bought at $100, 10 more at $110 the next month (that evening's close
    // $110), the first 10 sold the month after (close $120), $130 today: 1,100 ÷ 1,000 × 2,400 ÷ 2,200 × 1,300 ÷ 1,200 − 1 =
    // +30.00%; from the 10 still held it read 1,300 ÷ 1,100 − 1 = +18.18%.
    const traded = through ? [...through.days.values()] : [];
    const sells = traded.some((g) => g.sold > 0);
    const byEvents = through != null && priceTotal != null && (gone || (capped && (sells || through.start == null || through.start > 1e-9)));
    const s0 = byEvents ? through!.start : null;
    const events = byEvents && s0 != null && (s0 <= 1e-9 || heldThen(s0) != null)
      ? { s0: s0 <= 1e-9 ? 0 : s0, v0: s0 <= 1e-9 ? 0 : heldThen(s0) as number, from0: startDay, days: through!.days } : null;
    const ownPath = events ? eventPath({ p, series, events, end: worthWithInterest({ marketValue: mv, interest }) }, [...through!.days.keys()].sort()) : null;
    // read from its events, its market is its yardstick over the very days it was held (marketSplitAtPurchases on its own path)
    const ownMarket = events && ownPath && benchSeries
      ? (marketSplitAtPurchases([{ ...ownPath, bench: yardstickOn(benchSeries, beginISO, events.s0 > 0 ? null : firstEvent(events), capped, [...through!.days.keys()].sort()),
        benchAt: [...through!.days.keys()].sort().map((g) => closeAsOf(benchSeries, g)) }]) ?? null) : null;
    const startValue = priceTotal == null ? null
      : events && events.s0 > 0 ? events.v0
      : gone ? (events ? 0 : null)
      : capped ? (pieces && pieces.growth > 0 ? marketValue(p, pieces.after / (pieces.growth * pieces.held)) : null)
      : heldThen(through?.start);
    // worth $0 today, its interest is counted on that start (returnWithInterest, 2026-10-21)
    const prTotal = byEvents ? (ownPath ? returnSplitAtPurchases([ownPath]) ?? null : null) : returnWithInterest(priceTotal, mv, interest, startValue);
    // over a window longer than a year the figure shown is a yearly rate over the span the prices cover (MK-PF-F-039)
    // (periodReturn's own rule, applied to the total with its interest; a purchase cap or a handed-over first day is
    // never made yearly)
    const parts = !capped && !given && !byEvents ? periodReturnParts(series, period, now) : null;
    const pr = parts && parts.years > 1 && prTotal != null ? Math.pow(1 + prTotal, 1 / parts.years) - 1 : prTotal;
    // WHAT WAS PAID FOR SHARES BOUGHT AFTER ITS WINDOW FIGURE BEGAN, for a holding held before it (2026-10-21; DEC-3656): what
    // it gained is its value today less what it was worth then less that money — worked back from today's shares it read
    // $420 where $320 is right (outside re-run OpenAI part 1, MK-NW-F-091 / MK-NW-F-127)
    // AND WHAT ITS SALES BROUGHT IN (2026-10-22): what it gained is its value today + interest − what it was worth when the window
    // began − what it paid for shares bought since + what its sales brought in. 20 held at $100, 10 sold at $110, 10 left at
    // $121: $1,210 − $2,000 + $1,100 = $310, beginning $2,000 (from today's 10 shares it read $210 and $2,100). Bought inside
    // the window, everything it paid in the window counts, so a purchase a sale took is still in what was paid.
    // (on the trades themselves, so a figure that cannot be read from them still leaves its gain unknown, never a guess)
    const paidInside = priceTotal == null || !traded.some((g) => g.bought > 0) ? (capped && priceTotal != null ? 0 : undefined)
      : traded.reduce<number | null>((t, g) => (t == null || (g.bought > 0 && g.paid == null) ? null : t + (g.bought > 0 ? g.paid as number : 0)), 0);
    const soldInside = priceTotal == null || !traded.some((g) => g.sold > 0) ? undefined
      : traded.reduce<number | null>((t, g) => (t == null || (g.sold > 0 && g.proceeds == null) ? null : t + (g.sold > 0 ? g.proceeds as number : 0)), 0);
    // bought inside the window but held before it too — every purchase from before it sold, then bought again: what the
    // shares held when it began were worth (its own figure counts from the purchase; what it gained counts from the start)
    const heldAtStart = capped && priceTotal != null && through && (through.start == null || Math.abs(through.start) > 1e-9) ? heldThen(through.start) : undefined;
    // WHAT ITS PATH ACROSS THE WINDOW IS READ FROM (2026-10-21; DEC-1669): bought inside the window, its purchases by day; held
    // before it, each purchase after its window figure began; its prices beginning later, it joins the day after its first close
    const joins = short ? dayAfterDay(firstISO!.slice(0, 10)) : null;
    const ownDays = prTotal == null || mv == null ? null
      : events ? [...through!.days.keys()]
      : capped ? purchaseDays(p, bought!)?.map((d) => d.day) ?? null
      : [...(joins ? [joins] : []), ...[...(through?.days.keys() ?? [])]];
    plans.push(ownDays == null ? null
      : { p, series, bench: benchSeries, benchFrom: beginISO, capped, bought, joins, start: startValue, shares: through, events,
        end: worthWithInterest({ marketValue: mv, interest }), total: prTotal!, benchTotal: (events ? ownMarket : benchTotal) ?? null, days: ownDays });
    const benchShown = events ? (benchTicker == null ? null : ownMarket) : benchReturn;
    return {
      position: p, price,
      // what was paid and the gain over the purchases whose price paid is on record — the holding page's Total paid (2026-10-20)
      marketValue: mv, costBasis: paidOnRecord(p).paid, gain: unrealizedGain(p, price),
      totalROI: totalROI(p, price), periodReturn: pr, periodTotal: prTotal,
      benchTicker, benchReturn: benchShown, benchTotal: events ? benchShown : benchTotal,
      beatBy: marketGap(pr, benchShown),
      cappedSince: capped ? bought : null,
      interest, startValue,
      // the years the yearly rate is over, where periodReturn is one — the holding page writes /year and the total beside it
      years: parts && parts.years > 1 && prTotal != null ? parts.years : null,
      // bought inside the window with a purchase whose date is not on record beside dated ones: no return since purchase,
      // and the screen says why (2026-10-21, MK-PF-F-040)
      ...(capped && lotDate == null && firstDated != null ? { undatedPurchase: true as const } : {}),
      ...(paidInside !== undefined ? { paidInside } : {}),
      ...(soldInside !== undefined ? { soldInside } : {}),
      ...(heldAtStart !== undefined ? { heldAtStart } : {}),
    };
  });
  // ONE LIST OF DAYS FOR EVERY ROW BUILT TOGETHER (2026-10-21; DEC-1669): each day money went into any of these holdings inside
  // the window, so a category — or every holding together — is split at each of them (returnSplitAtPurchases)
  const grid = [...new Set(plans.flatMap((x) => x?.days ?? []))].sort();
  rows.forEach((r, i) => { const path = holdingPath(plans[i], grid); if (path) r.path = path; });
  return rows;
}

/** IS THIS HOLDING ONE BOND OR ONE CD — not a fund? (DEC-6212, 2026-10-19). Only then is its interest added to its return:
 *  a bond fund's or ETF's distributions are already in its adjusted closes (DEC-4644). It sits in Bonds & CDs, nothing in
 *  its name says fund (ETF, fund, trust, index, portfolio) and it is not a Treasury-bill ETF; and something says it is
 *  one instrument — the CD type, a 9-character security identifier as its ticker, a maturity date, a coupon rate or a
 *  face value. With no such evidence it is not one, and its return stays its price move. */
/* ─ MK-PF-F-047 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * isIndividualBondOrCD
 *
 * Answers ..... IS THIS HOLDING ONE BOND OR ONE CD — not a fund?
 *
 * Formula .....
 *     false   when p is missing (or holding class of(p) ! = 'bonds' when missing or zero)
 *     t = string(ticker ?? '').trim().to upper case()
 *     false   when ÷ \b(etf|etfs|fund|funds|trust|index|portfolio)\b ÷ test(`${ticker ?? ''} ${label ?? ''}`)
 *     false   when TBILL_ETF_TICKERS.has(t)
 *     security id = ÷ ^[0 − 9A − Z]{9}$ ÷ .test(t) and ÷ \d ÷ .test(t)
 *
 * Called by ... MK-PF-F-048 bondInterestInWindow · MK-XS-F-102 ingestSync
 *
 * Reaches ..... 33 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-048 bondInterestInWindow · MK-PF-F-014 buildPerformance
 *               MK-NW-F-084 categoryEarnings · MK-NW-F-142 classReturnOf
 *               MK-PF-F-068 dayAfterDay · MK-PF-F-012 earliestPurchaseDate
 *               MK-PF-F-065 firstDatedPurchase · MK-NW-F-143 gainRowBetween
 *               … and 15 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-047
 * Changed ..... not in git yet (—)
 */
export function isIndividualBondOrCD(p: Position | null | undefined): boolean {
  if (!p || holdingClassOf(p) !== 'bonds') return false;
  const t = String(p.ticker ?? '').trim().toUpperCase();
  if (/\b(etf|etfs|fund|funds|trust|index|portfolio)\b/i.test(`${p.ticker ?? ''} ${p.label ?? ''}`)) return false;
  if (TBILL_ETF_TICKERS.has(t)) return false;
  const securityId = /^[0-9A-Z]{9}$/.test(t) && /\d/.test(t);
  return p.kind === 'cd' || securityId || maturityParts(p.maturity_date) != null
    || (p.coupon_rate != null && Number.isFinite(p.coupon_rate)) || (p.face_value != null && p.face_value > 0);
}

/** THE INTEREST ONE BOND OR CD WAS PAID IN THE WINDOW (DEC-6212, 2026-10-19): every interest or coupon record dated on or
 *  after the day given and no later than today's records, that names this holding (its ticker, or its own holding id) —
 *  in its own account when the record names one — or that names no holding and sits in an account that is itself a bond
 *  or CD holding only this one holding. Amounts are signed, so a reversal cancels. Null when the holding is not an
 *  individual bond or CD, or there is no first day; 0 when nothing was paid. */
/* ─ MK-PF-F-048 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * bondInterestInWindow
 *
 * Answers ..... THE INTEREST ONE BOND OR CD WAS PAID IN THE WINDOW (DEC-6212, 2026-10-19): every interest or coupon record dated on or after the day given and no later than today's records, that names this holding (its ticker, or its own holding id) — in its own account when the record names one — or that names no holding and sits in an account that is itself a bond or CD holding only this one holding.
 *
 * Formula .....
 *     nothing   when !is individual bond or cd(p) (or from day is missing when missing or zero)
 *     tk = string(ticker ?? '').trim().to upper case()
 *     pid = string(position id)   if position id ≠ nothing
 *     nothing   otherwise
 *     home = undefined   if pid = nothing
 *     (accounts ?? []).find((a: any) => (positions ?? []).some((q: any) => string(position id) = pid))   otherwise
 *     home is this bond = !!home and (home.positions.length ?? 0) = 1 and asset class of(home) = 'bonds'
 *     total = 0
 *     d = the first 10 of string(date ?? '')
 *     rtk = string(ticker ?? '').trim().to upper case()
 *     named = pid ≠ nothing and position id ≠ nothing and string(position id) = pid (or !!rtk and rtk = tk when missing or zero)
 *     unnamed here = !rtk and position id = nothing and home is this bond and string(account id ?? '') = string(home!.asset id)
 *     amt = money into account(t)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-143 gainRowBetween · MK-PF-F-014 buildPerformance
 *
 * Reaches ..... 31 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-NW-F-143 gainRowBetween · MK-PF-F-070 holdingPath
 *               … and 13 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-009 transaction date
 *               MK-XS-I-024 logged expenses
 *
 * Decides .....
 *     · If length is missing it uses 0.
 *     · Uses a built-in total of 0.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-048
 * Changed ..... not in git yet (—)
 */
export function bondInterestInWindow(p: Position, transactions: any[], fromDay: string | null, accounts: any[] = []): number | null {
  if (!isIndividualBondOrCD(p) || !fromDay) return null;
  const tk = String(p.ticker ?? '').trim().toUpperCase();
  const pid = p.position_id != null ? String(p.position_id) : null;
  const home = pid == null ? undefined : (accounts ?? []).find((a: any) => (a?.positions ?? []).some((q: any) => String(q?.position_id) === pid));
  const homeIsThisBond = !!home && (home.positions?.length ?? 0) === 1 && assetClassOf(home) === 'bonds';
  let total = 0;
  for (const t of transactions ?? []) {
    if (t?.type !== 'INTEREST' && t?.type !== 'COUPON') continue;
    const d = String(t.date ?? '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d < fromDay) continue;
    // a record on another account is that account's, even for the same security
    if (home && t.account_id != null && String(t.account_id) !== String(home.asset_id)) continue;
    const rtk = String(t.ticker ?? '').trim().toUpperCase();
    const named = (pid != null && t.position_id != null && String(t.position_id) === pid) || (!!rtk && rtk === tk);
    const unnamedHere = !rtk && t.position_id == null && homeIsThisBond && String(t.account_id ?? '') === String(home!.asset_id);
    if (!named && !unnamedHere) continue;
    // the one rule for a stored amount (moneyIntoAccount, 2026-10-21): a reversed coupon cancels, never adds
    const amt = moneyIntoAccount(t);
    if (amt != null) total += amt;
  }
  return total;
}

/** A RETURN WITH THE INTEREST PAID ADDED (DEC-6212): (1 + the price return) × (1 + interest ÷ value today) − 1. That is
 *  (value today + interest) ÷ value at the start − 1, because value at the start = value today ÷ (1 + price return). The
 *  price return alone where there is no interest, no price return, or no value today to divide by. WORTH $0 TODAY, its
 *  start handed in (2026-10-21; DEC-5068, tenet 4: a known $0 is $0): (0 + interest) ÷ that start − 1 — a bond that fell
 *  to $0 after paying $50 on a $1,000 start is −95.00%; its interest was left out and it read −100.00%. */
/* ─ MK-PF-F-049 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * returnWithInterest
 *
 * Answers ..... A RETURN WITH THE INTEREST PAID ADDED (DEC-6212): (1 + the price return) × (1 + interest ÷ value today) − 1.
 *
 * Formula .....
 *     interest ÷ start − 1   when price total ≠ nothing and interest and value now = 0 and start ≠ nothing and start > 0
 *     price total   when price total = nothing (or interest is missing (or value now = nothing (or not (value now > 0) when missing or zero) when missing or zero) when missing or zero)
 *     (1 + price total) × (1 + interest ÷ value now) − 1
 *
 * Called by ... MK-NW-F-088 BENCH · MK-NW-F-143 gainRowBetween
 *               MK-PF-F-014 buildPerformance
 *
 * Reaches ..... 31 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-NW-F-143 gainRowBetween · MK-PF-F-070 holdingPath
 *               … and 13 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-049
 * Changed ..... not in git yet (—)
 */
export function returnWithInterest(priceTotal: number | null, valueNow: number | null | undefined, interest: number | null | undefined,
  start?: number | null): number | null {
  if (priceTotal != null && interest && valueNow === 0 && start != null && start > 0) return interest / start - 1;
  if (priceTotal == null || !interest || valueNow == null || !(valueNow > 0)) return priceTotal;
  return (1 + priceTotal) * (1 + interest / valueNow) - 1;
}

/** WHAT A HOLDING HAS TO SHOW FOR THE WINDOW: its value today plus the interest it was paid in the window (DEC-6212). Its
 *  value at the start is this ÷ (1 + its window total), because that total already holds the interest. */
/* ─ MK-PF-F-050 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * worthWithInterest
 *
 * Answers ..... WHAT A HOLDING HAS TO SHOW FOR THE WINDOW: its value today plus the interest it was paid in the window (DEC-6212).
 *
 * Formula .....
 *     (market value ?? 0) + (interest ?? 0)
 *
 * Called by ... MK-NW-F-127 gainOfRow · MK-NW-F-142 classReturnOf
 *               MK-PF-F-014 buildPerformance · MK-PF-F-044 startValues
 *
 * Reaches ..... 31 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-NW-F-127 gainOfRow · MK-PF-F-070 holdingPath
 *               … and 13 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · If market value is missing it uses 0.
 *     · If interest is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-050
 * Changed ..... not in git yet (—)
 */
export function worthWithInterest(r: { marketValue?: number | null; interest?: number | null }): number {
  return (r.marketValue ?? 0) + (r.interest ?? 0);
}

/** A holding bought inside the window: its time-weighted return from the first purchase to today (DEC-1669).
 *  The purchases are grouped by day, oldest first. The first piece starts at what was paid; a purchase counts from the
 *  start of its day (DEC-4439), so at each later purchase the piece ends at the shares then held × the PREVIOUS
 *  EVENING's close (the piece's start value where no close falls inside it), and the next starts there plus what was
 *  paid; the last ends at today's value. Unknown when a share count or a cost is missing, or a purchase with no date
 *  sits beside dated ones — never a guess (tenet 3). A holding with no dated purchase is placed on `firstDay`. */
/* ─ MK-PF-F-040 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * returnSincePurchases
 *
 * Answers ..... A holding bought inside the window: its time-weighted return from the first purchase to today (DEC-1669).
 *
 * Formula .....
 *     nothing   when price = nothing
 *     k = purchase pieces(p, series, first day)
 *     the answer:
 *     nothing   if k = nothing
 *     growth × (held × price) ÷ after − 1   otherwise
 *
 * Called by ... MK-PF-F-014 buildPerformance · MK-PF-F-064 purchasesHeld
 *
 * Reaches ..... 30 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-PF-F-070 holdingPath · MK-NW-F-168 holdingRowsIn
 *               … and 12 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-040
 * Changed ..... not in git yet (—)
 */
function returnSincePurchases(p: Position, series: PriceSeries | null | undefined, price: number | null, firstDay: string): number | null {
  if (price == null) return null;
  const k = purchasePieces(p, series, firstDay);
  return k == null ? null : k.growth * (k.held * price) / k.after - 1;
}

/** THE PIECES A HOLDING BOUGHT INSIDE THE WINDOW IS MEASURED IN (DEC-1669) — returnSincePurchases' own steps, kept apart so
 *  the value its return is measured from can be read when the holding is worth $0 today (2026-10-21, tenet 4): the shares
 *  held after the last purchase, the money in the last piece when it began, and the growth of the pieces before it. The
 *  return is growth × shares × today's price ÷ that money − 1; the value it is measured from is shares × (that money ÷
 *  (growth × shares)) — what was paid, for a holding bought on one day. Unknown as returnSincePurchases is. */
/* ─ MK-PF-F-056 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * purchasePieces
 *
 * Answers ..... THE PIECES A HOLDING BOUGHT INSIDE THE WINDOW IS MEASURED IN (DEC-1669) — returnSincePurchases' own steps, kept apart so the value its return is measured from can be read when the holding is worth $0 today (2026-10-21, tenet 4): the shares held after the last purchase, the money in the last piece when it began, and the growth of the pieces before it.
 *
 * Formula .....
 *     days = purchase days(p, first day)
 *     nothing   when days is missing
 *     held = 0, after = 0, growth = 1, piece from = ''
 *     eve = day before day(d)
 *     nothing   when eve = nothing (or not (after > 0) when missing or zero)
 *     mark = close day on or before(series, eve)
 *     close = mark.close   if mark ≠ nothing and mark.day ≥ piece from
 *     nothing   otherwise
 *     nothing   when not (after > 0)
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-PF-F-014 buildPerformance · MK-PF-F-040 returnSincePurchases
 *
 * Reaches ..... 30 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-PF-F-070 holdingPath · MK-NW-F-168 holdingRowsIn
 *               … and 12 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-056
 * Changed ..... not in git yet (—)
 */
function purchasePieces(p: Position, series: PriceSeries | null | undefined, firstDay: string): { held: number; after: number; growth: number } | null {
  // its purchases by day, oldest first — one reading, shared with the holding's path across the window (purchaseDays)
  const days = purchaseDays(p, firstDay);
  if (!days) return null;
  let held = 0, after = 0, growth = 1, pieceFrom = '';
  for (const { day: d, ...g } of days) {
    if (held > 0) {
      // A PURCHASE COUNTS FROM THE START OF ITS DAY (2026-10-21; DEC-4439, his "approved." of 2026-10-11: money that arrives
      // on a day counts for that whole day — the day's growth is the evening value ÷ (the previous evening's value + money
      // added) − 1; outside re-run OpenAI parts 1, 2 and 4, MK-PF-F-040). The piece before it ends at the PREVIOUS EVENING's
      // close: 10 shares at $100, 10 more at $110 the next morning, close $121 → 2,420 ÷ (1,000 + 1,100) − 1 = +15.24%, what
      // the account's own record reads for the same money. It ended at the purchase day's close, so the old shares were
      // credited with that day's rise before the new money arrived: +26.76%. The close is the latest one from the piece's
      // own first day to that evening; with none (no trading day between), the piece ends where it began (growth ×1) — the
      // last value on record stands, as in the account's record.
      const eve = dayBeforeDay(d);
      if (eve == null || !(after > 0)) return null;
      const mark = closeDayOnOrBefore(series, eve);
      const close = mark != null && mark.day >= pieceFrom ? mark.close : null;
      if (close != null) {
        growth *= (held * close) / after;   // the piece ends at the evening before this purchase
        after = held * close + g.paid;      // the next starts that morning, with this purchase added
      } else {
        after = after + g.paid;             // no close inside the piece: it ends at the value it began with
      }
    } else {
      after = g.paid;
    }
    held += g.shares;
    pieceFrom = d;
  }
  if (!(after > 0)) return null;
  return { held, after, growth };
}

/** A HOLDING'S PURCHASES BY DAY, OLDEST FIRST (DEC-1669) — the one reading returnSincePurchases' pieces and the holding's path
 *  across the window (holdingPath) are both made of: on each day, the shares bought and what was paid. Null when a share count
 *  or a price paid is not on record, or a purchase with no date sits beside dated ones (tenet 3); a holding with no dated
 *  purchase at all is placed on `firstDay`. */
/* ─ MK-PF-F-067 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * purchaseDays
 *
 * Answers ..... A HOLDING'S PURCHASES BY DAY, OLDEST FIRST (DEC-1669) — the one reading returnSincePurchases' pieces and the holding's path across the window (holdingPath) are both made of: on each day, the shares bought and what was paid.
 *
 * Formula .....
 *     by day = new map<string, { shares: number; paid: number }>()
 *     sh = shares as number | nothing | undefined, c = cost per share as number | nothing | undefined
 *     nothing   when sh = nothing (or !number.is finite(sh) (or sh > 0 and !lot cost on record(l) when missing or zero) when missing or zero)
 *     dated = purchase date on record(purchase date)
 *     nothing   when dated = nothing and (lots ?? []).some((x) => (shares as number) > 0 and purchase date on record(purchase date) ≠ nothing)
 *     d = dated (or first day when missing)
 *     g = by day.get(d) (or shares = 0
 *     paid = 0 when missing)
 *     days = [...by day.keys()], in order
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-PF-F-014 buildPerformance · MK-PF-F-056 purchasePieces
 *               MK-PF-F-070 holdingPath
 *
 * Reaches ..... 30 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-PF-F-070 holdingPath · MK-NW-F-168 holdingRowsIn
 *               … and 12 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-007 purchase price and date (per lot)
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-067
 * Changed ..... not in git yet (—)
 */
function purchaseDays(p: Position, firstDay: string): { day: string; shares: number; paid: number }[] | null {
  const byDay = new Map<string, { shares: number; paid: number }>();
  for (const l of p.lots ?? []) {
    const sh = l?.shares as number | null | undefined, c = l?.cost_per_share as number | null | undefined;
    // a cost is read ONE way (lotCostOnRecord, 2026-10-21): a stored $0 is not on record, as a missing one is — it was a
    // purchase that cost nothing, so its piece began at $0
    if (sh == null || !Number.isFinite(sh) || (sh > 0 && !lotCostOnRecord(l))) return null;
    if (!(sh > 0)) continue;
    // the one reading of a purchase date (purchaseDateOnRecord, 2026-10-21): a day that does not exist (31 February) is not on
    // record, as a missing one is — it was read by its shape and priced at a close that is not that day's
    const dated = purchaseDateOnRecord(l.purchase_date);
    // A PURCHASE WITH NO DATE IS NEVER PUT ON A GUESSED DAY (2026-10-21; DEC-3523 tenet 3: never a default that looks like an
    // answer; outside re-run OpenAI part 4, MK-PF-F-040). Beside dated purchases it was put on the first of them — +13.60% as
    // if both were bought on Sep 17 — when it may have come before, after or between them: the return since purchase is not
    // known, so there is none. A holding with no dated purchase at all is placed on the day the caller hands in (`firstDay`:
    // its first purchase in the activity records — invest-v3 FINAL, 2026-07-19), as before.
    if (dated == null && (p.lots ?? []).some((x) => (x?.shares as number) > 0 && purchaseDateOnRecord(x.purchase_date) != null)) return null;
    const d = dated ?? firstDay;
    const g = byDay.get(d) ?? { shares: 0, paid: 0 };
    g.shares += sh; g.paid += sh * (c as number);   // on record: checked above
    byDay.set(d, g);
  }
  const days = [...byDay.keys()].sort();
  return days.length ? days.map((day) => ({ day, ...byDay.get(day)! })) : null;
}

/** The calendar day after a day written year-month-day, written the same way (dayBeforeDay, the other way). */
/* ─ MK-PF-F-068 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * dayAfterDay
 *
 * Answers ..... The calendar day after a day written year-month-day, written the same way (dayBeforeDay, the other way).
 *
 * Formula .....
 *     the first 10 of the date date.parse(`${day}T00:00:00Z`) + 86400000).to isostring(
 *
 * Called by ... MK-PF-F-014 buildPerformance
 *
 * Reaches ..... 30 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-PF-F-070 holdingPath · MK-NW-F-168 holdingRowsIn
 *               … and 12 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-068
 * Changed ..... not in git yet (—)
 */
function dayAfterDay(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
}

/** THE HOLDINGS SOLD IN FULL INSIDE THE WINDOW (2026-10-22; DEC-3656): for each account handed in that holds one of these
 *  positions — or holds none at all — every ticker it sold after `afterDay` (a sale dated after today is read on today) that
 *  it no longer holds. Each becomes a holding with no purchases left, naming its account, so its sale records give what it was
 *  worth when the window began and what it gained (tradesAfter, sharesThroughWindow). What it was: the same ticker held in any
 *  account handed in, or else what its account is — a stocks-and-funds account's holding is a stock or fund, a bonds account's
 *  a bond; otherwise nothing is said, and it is unclassified. */
/* ─ MK-PF-F-075 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * soldOutPositions
 *
 * Answers ..... THE HOLDINGS SOLD IN FULL INSIDE THE WINDOW (2026-10-22; DEC-3656): for each account handed in that holds one of these positions — or holds none at all — every ticker it sold after `afterDay` (a sale dated after today is read on today) that it no longer holds.
 *
 * Formula .....
 *     ids = a list with no repeats of for each of positions: string(position id)   if position id ≠ nothing
 *     ''   otherwise where boolean
 *     ticker of = (x: any) => string(ticker ?? '').trim().to upper case()
 *     everywhere = (accounts ?? []).flat map((a: any) => (positions ?? []) as position[])
 *     out = []
 *     own = (positions ?? []) as position[]
 *     held = a list with no repeats of for each of own: ticker of
 *     sold = new set<string>()
 *     tk = the first 10) of ticker of(t), d = calendar day(string(date ?? '')
 *     twin = everywhere.find((q) => ticker of(q) = tk)
 *     the answer = out
 *
 * Called by ... MK-NW-O-008 thePerformance · MK-PF-F-014 buildPerformance
 *               MK-PF-F-072 tradesAfter
 *
 * Reaches ..... 31 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-PF-F-070 holdingPath · MK-NW-F-168 holdingRowsIn
 *               … and 13 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-056 how a holding was classified, and by whom
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *               MK-XS-I-070 the class a broker sends for a holding — its security type and its cash-equivalent flag
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-075
 * Changed ..... not in git yet (—)
 */
function soldOutPositions(positions: Position[], transactions: any[], accounts: any[], afterDay: string, today: string): Position[] {
  const ids = new Set(positions.map((q) => (q?.position_id != null ? String(q.position_id) : '')).filter(Boolean));
  const tickerOf = (x: any) => String(x?.ticker ?? '').trim().toUpperCase();
  const everywhere = (accounts ?? []).flatMap((a: any) => (a?.positions ?? []) as Position[]);
  const out: Position[] = [];
  for (const a of accounts ?? []) {
    const own = (a?.positions ?? []) as Position[];
    if (own.length && !own.some((q) => positions.includes(q) || (q?.position_id != null && ids.has(String(q.position_id))))) continue;
    const held = new Set(own.map(tickerOf));
    const sold = new Set<string>();
    for (const t of transactions ?? []) {
      if (t?.type !== 'SELL' || String(t?.account_id) !== String(a?.asset_id) || !(Number(t?.shares) > 0)) continue;
      const tk = tickerOf(t), d = calendarDay(String(t?.date ?? '').slice(0, 10));
      if (tk && d != null && !held.has(tk) && (d > today ? today : d) > afterDay) sold.add(tk);
    }
    for (const tk of [...sold].sort()) {
      const twin: any = everywhere.find((q) => tickerOf(q) === tk);
      const what = twin ? Object.fromEntries(['kind', 'asset_class', 'class_source', 'broker_type', 'cash_equivalent', 'label', 'name', 'multiplier']
        .filter((k) => twin[k] != null).map((k) => [k, twin[k]]))
        : a?.asset_class === 'stocks_etf' ? { asset_class: 'stock_etf' } : a?.asset_class === 'bonds' ? { asset_class: 'bond' } : {};
      out.push({ position_id: `sold:${a.asset_id}:${tk}`, ticker: tk, lots: [], ...what, account_id: String(a.asset_id), sold_out: true } as any);
    }
  }
  return out;
}

type WindowTrades = { sales: { day: string; shares: number; proceeds: number | null }[]; buys: Map<string, { shares: number; paid: number | null }> };
/** A HOLDING'S OWN TRADES AFTER A DAY, AS ITS ACCOUNT RECORDS THEM (2026-10-22; DEC-3656: the beginning is "today's value less
 *  what each holding gained, less the money moved"): its account's sales of its ticker — the shares, and what each brought in
 *  (shares × the price × its multiplier, or the amount where no price is on record; unknown with neither) — and its purchases
 *  by day: bought, opened, or a dividend or interest reinvested in it, with what was paid (unknown without a price above $0).
 *  A position names no account, so the account holding it is found; none found, no record is read. A record dated after
 *  today is read on today, as thePerformance reads it. */
/* ─ MK-PF-F-072 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * tradesAfter
 *
 * Answers ..... A HOLDING'S OWN TRADES AFTER A DAY, AS ITS ACCOUNT RECORDS THEM (2026-10-22; DEC-3656: the beginning is "today's value less what each holding gained, less the money moved"): its account's sales of its ticker — the shares, and what each brought in (shares × the price × its multiplier, or the amount where no price is on record; unknown with neither) — and its purchases by day: bought, opened, or a dividend or interest reinvested in it, with what was paid (unknown without a price above $0).
 *
 * Formula .....
 *     out = sales = []
 *     buys = a lookup
 *     pid = string(position id)   if position id ≠ nothing
 *     nothing   otherwise
 *     tk = string(ticker ?? '').trim().to upper case()
 *     out   when home is missing (or tk is missing when missing or zero)
 *     mult = contract multiplier(p)
 *     written = the first 10) of calendar day(string(date ?? '')
 *     sh = shares read as a number
 *     day = today   if written > today
 *     written   otherwise
 *     price = na n   if price = nothing (or price = '' when missing or zero)
 *     price read as a number   otherwise
 *     moved = nothing   if number.is finite(price) and price > 0
 *     cash effect(t)   otherwise
 *     gross = sh × price × mult   if number.is finite(price) and price > 0
 *     moved   if moved ≠ nothing and moved > 0
 *     nothing   otherwise   otherwise
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-PF-F-014 buildPerformance · MK-PF-F-068 dayAfterDay
 *
 * Reaches ..... 30 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-PF-F-070 holdingPath · MK-NW-F-168 holdingRowsIn
 *               … and 12 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-072
 * Changed ..... not in git yet (—)
 */
function tradesAfter(p: Position, transactions: any[], accounts: any[], afterDay: string, today: string): WindowTrades {
  const out: WindowTrades = { sales: [], buys: new Map() };
  const pid = p.position_id != null ? String(p.position_id) : null;
  const home = (accounts ?? []).find((a: any) => (a?.positions ?? []).some((q: any) => q === p || (pid != null && String(q?.position_id) === pid)))
    // a holding sold in full is no longer in its account's holdings: it names its account (soldOutPositions, 2026-10-22)
    ?? ((p as any).account_id != null ? (accounts ?? []).find((a: any) => String(a?.asset_id) === String((p as any).account_id)) : undefined);
  const tk = String(p.ticker ?? '').trim().toUpperCase();
  if (!home || !tk) return out;
  const mult = contractMultiplier(p);
  for (const t of transactions ?? []) {
    if (String(t?.account_id) !== String(home.asset_id) || String(t?.ticker ?? '').trim().toUpperCase() !== tk) continue;
    const written = calendarDay(String(t?.date ?? '').slice(0, 10));
    const sh = Number(t?.shares);
    if (written == null || !(sh > 0)) continue;
    const day = written > today ? today : written;
    if (!(day > afterDay)) continue;
    const price = t?.price == null || t.price === '' ? NaN : Number(t.price);
    if (t.type === 'SELL') {
      // with no price on record, the cash the sale moved, read the one way (cashEffect, MK-CF-F-118: its amount)
      const moved = Number.isFinite(price) && price > 0 ? null : cashEffect(t);
      const gross = Number.isFinite(price) && price > 0 ? sh * price * mult : moved != null && moved > 0 ? moved : null;
      // AFTER THE SALE'S OWN FEE, ONCE (2026-10-22; DEC-6873, DEC-6874): a fee the stored price or cash does not already carry
      // comes off what the sale brought in (feeNotInPrice); one inside them is not taken off again. 10 sold at $120 with a $5 fee
      // the broker's cash leaves out brought in $1,195; the same sale stored at $119.50 a share brought in $1,195 too.
      out.sales.push({ day, shares: sh, proceeds: gross == null ? null : gross - feeNotInPrice(t) });
    } else if (t.type === 'BUY' || t.type === 'OPENING_POSITION' || (t.reinvested && (t.type === 'DIVIDEND' || t.type === 'INTEREST' || t.type === 'COUPON'))) {
      const g = out.buys.get(day) ?? { shares: 0, paid: 0 as number | null };
      g.shares += sh;
      g.paid = g.paid == null || !(Number.isFinite(price) && price > 0) ? null : g.paid + sh * price * mult;
      out.buys.set(day, g);
    }
  }
  out.sales.sort((x, y) => x.day.localeCompare(y.day));
  return out;
}

type WindowShares = { start: number | null; days: Map<string, { bought: number; paid: number | null; sold: number; proceeds: number | null }> };
/** WHAT A HOLDING HELD AND TRADED INSIDE ITS WINDOW (2026-10-22; DEC-3656, DEC-7221) — what its gain, its start and its path are
 *  read from. On each day after `fromDay`: the shares bought and what was paid, the shares sold and what they brought in.
 *  `start`: the shares held at `fromDay`'s close — today's shares, less every share bought since, plus every share sold since.
 *  A sale takes the oldest purchase first (MK-CF-F-139 removeShares), so:
 *   · while a purchase made before the window is still held, no sale inside the window reached a purchase made inside it: those
 *     purchases are today's purchases of their days, whole;
 *   · with none left (and always for a holding bought inside the window), a sale may have taken from a purchase made inside the
 *     window, and that purchase's own record says how large it was — the larger of the record and what is held today; one
 *     made on or before a sale with no record that large leaves the start, and what was paid that day, not known (tenet 3);
 *   · a holding whose purchases carry no date at all (a broker's one total) is told what it bought inside the window by its
 *     records alone.
 *  `placedOn`: the day a holding bought inside the window was bought — a purchase of it with no date is placed there. A share
 *  count not on record leaves the start not known. Worked: 20 held at $100, 10 sold at $110, 10 left → start 10 − 0 + 10 = 20. */
/* ─ MK-PF-F-073 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * sharesThroughWindow
 *
 * Answers ..... WHAT A HOLDING HELD AND TRADED INSIDE ITS WINDOW (2026-10-22; DEC-3656, DEC-7221) — what its gain, its start and its path are read from.
 *
 * Formula .....
 *     mult = contract multiplier(p)
 *     lots by = new map<string, { shares: number; paid: number | nothing }>()
 *     held before = 0, dated = 0, unknown = false
 *     own = purchase date on record(purchase date)
 *     d = own (or placed on when missing)
 *     g = lots by.get(d) (or shares = 0
 *     paid = 0 as number | nothing when missing)
 *     last sale = trades.sales[trades.sales.length − 1].day   if count of trades.sales
 *     nothing   otherwise
 *     reach = !(held before > 0) and last sale ≠ nothing
 *     read records = reach (or dated = 0 and placed on = nothing when missing or zero)
 *     days = a lookup
 *     at = (d: string) => { let g = days.get(d); if (!g) days.set(d, g = { bought: 0, paid: 0, sold: 0, proceeds: 0 }); return g; }
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-PF-F-014 buildPerformance · MK-PF-F-068 dayAfterDay
 *
 * Reaches ..... 30 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-PF-F-070 holdingPath · MK-NW-F-168 holdingRowsIn
 *               … and 12 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Decides .....
 *     · If shares is missing it uses 0.
 *     · If paid is missing it uses 0.
 *     · Never lets held fall below 0.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-073
 * Changed ..... not in git yet (—)
 */
function sharesThroughWindow(p: Position, fromDay: string, trades: WindowTrades, placedOn: string | null): WindowShares {
  const mult = contractMultiplier(p);
  const lotsBy = new Map<string, { shares: number; paid: number | null }>();
  let heldBefore = 0, dated = 0, unknown = false;
  for (const l of purchasesHeld(p)) {
    if (unknownFigure(l.shares)) { unknown = true; continue; }
    const own = purchaseDateOnRecord(l.purchase_date);
    if (own != null) dated++;
    const d = own ?? placedOn;
    if (d == null || d <= fromDay) { if (own != null && own <= fromDay) heldBefore += l.shares as number; continue; }
    const g = lotsBy.get(d) ?? { shares: 0, paid: 0 as number | null };
    g.shares += l.shares as number;
    g.paid = g.paid == null || !lotCostOnRecord(l) ? null : g.paid + (l.shares as number) * (l.cost_per_share as number) * mult;
    lotsBy.set(d, g);
  }
  const lastSale = trades.sales.length ? trades.sales[trades.sales.length - 1].day : null;
  // the records of purchases are read where a sale may have reached a purchase inside the window, or where no purchase is dated
  const reach = !(heldBefore > 0) && lastSale != null;
  const readRecords = reach || (dated === 0 && placedOn == null);
  const days: WindowShares['days'] = new Map();
  const at = (d: string) => { let g = days.get(d); if (!g) days.set(d, g = { bought: 0, paid: 0, sold: 0, proceeds: 0 }); return g; };
  let notKnown = unknown;
  for (const d of new Set([...lotsBy.keys(), ...(readRecords ? [...trades.buys.keys()] : [])])) {
    const lot = lotsBy.get(d), rec = readRecords ? trades.buys.get(d) : undefined;
    const ls = lot?.shares ?? 0, rs = rec?.shares ?? 0;
    const g = at(d);
    if (rs > ls) {
      g.bought = rs;
      g.paid = rec!.paid == null || (lot != null && lot.paid == null) ? null : (lot?.paid ?? 0) + rec!.paid * (rs - ls) / rs;
    } else {
      g.bought = ls; g.paid = lot!.paid;
      // a sale on or after this day may have taken part of this purchase, and no record says how large it was
      if (reach && d <= lastSale! && rs < ls) { notKnown = true; g.paid = null; }
    }
  }
  for (const s of trades.sales) {
    const g = at(s.day);
    g.sold += s.shares;
    g.proceeds = g.proceeds == null || s.proceeds == null ? null : g.proceeds + s.proceeds;
  }
  const now = totalShares(p);
  let start: number | null = null;
  if (!notKnown && now != null) {
    let held = now;
    for (const g of days.values()) held += g.sold - g.bought;
    start = held < -1e-9 ? null : Math.max(0, held);
  }
  return { start, days };
}

/** What buildPerformance hands holdingPath for one row: the holding, its prices and its yardstick's, how its window figure is
 *  measured, what it was worth when that figure began, its shares and trades through the window, what it has to show today
 *  (value + interest), its figure and its yardstick's over the window, and its own days. */
type HoldingPlan = { p: Position; series: PriceSeries | null | undefined; bench: PriceSeries | null | undefined; benchFrom: string | null;
  capped: boolean; bought: string | null; joins: string | null; start: number | null; shares: WindowShares | null; end: number; total: number;
  benchTotal: number | null; days: string[]; events?: WindowEvents | null };

/** A holding read from its own purchases and sales through the window (2026-10-22): the shares held when the window began and
 *  what they were worth then, the day that value is read on, and each day's trades. */
type WindowEvents = { s0: number; v0: number; from0: string; days: WindowShares['days'] };

/** The first day such a holding bought or sold anything. */
/* ─ MK-PF-F-076 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * firstEvent
 *
 * Answers ..... The first day such a holding bought or sold anything.
 *
 * Formula .....
 *     ds = [...days.entries()] where ([, g]) => bought > 0 (or sold > 0 when missing or zero)for each of : ([d]) => d, in order
 *     the answer = the first of ds (or nothing when missing)
 *
 * Called by ... MK-PF-F-014 buildPerformance · MK-PF-F-070 holdingPath
 *
 * Reaches ..... 30 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-PF-F-070 holdingPath · MK-NW-F-168 holdingRowsIn
 *               … and 12 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-076
 * Changed ..... not in git yet (—)
 */
function firstEvent(e: WindowEvents): string | null {
  const ds = [...e.days.entries()].filter(([, g]) => g.bought > 0 || g.sold > 0).map(([d]) => d).sort();
  return ds[0] ?? null;
}

/** A HOLDING'S PATH READ FROM ITS OWN PURCHASES AND SALES (2026-10-22; DEC-1669, DEC-4439), on the list of days `grid`: from what
 *  the shares held when the window began were worth (nothing, for a holding bought inside it); each later day's value is the
 *  shares held × the previous evening's close — or the value the piece began with where no close falls inside it — and that
 *  day's trades move it: a purchase in at what was paid, and — its mirror (2026-10-22, the lead's ruling: a person can see how
 *  the figure was made) — a sale out at what it brought in, after its fee: the piece ends with the shares sold at that, the
 *  shares kept at the previous evening's close. 10 held at $100, all sold at $110: 1,100 ÷ 1,000 − 1 = +10.00%, beside a gain
 *  of $100 (valued at the evening's $108 it read +8.00%, which nobody could work out from $100 on $1,000). Nothing held, no
 *  piece. Null where a purchase's price paid or a sale's takings is not on record, or more is sold than was held. */
/* ─ MK-PF-F-077 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * eventPath
 *
 * Answers ..... A HOLDING'S PATH READ FROM ITS OWN PURCHASES AND SALES (2026-10-22; DEC-1669, DEC-4439), on the list of days `grid`: from what the shares held when the window began were worth (nothing, for a holding bought inside it); each later day's value is the shares held × the previous evening's close — or the value the piece began with where no close falls inside it — and that day's trades move it: a purchase in at what was paid, and — its mirror (2026-10-22, the lead's ruling: a person can see how the figure was made) — a sale out at what it brought in, after its fee: the piece ends with the shares sold at that, the shares kept at the previous evening's close.
 *
 * Formula .....
 *     mult = contract multiplier(p)
 *     held = events.s0, began = events.v0, from = events.from0
 *     marks = []
 *     before = 0
 *     eve = day before day(g)
 *     nothing   when eve = nothing
 *     mark = close day on or before(series, eve)
 *     after = before, share = 0
 *     t = events.days.get(g)
 *     nothing   when bought > 0 and paid = nothing
 *     nothing   when sold > 0 and (proceeds = nothing or !(held > 1e − 12) or sold > held + 1e − 9)
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-PF-F-014 buildPerformance · MK-PF-F-070 holdingPath
 *
 * Reaches ..... 30 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-PF-F-070 holdingPath · MK-NW-F-168 holdingRowsIn
 *               … and 12 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-005 holding price
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Decides .....
 *     · Uses a built-in before of 0.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-077
 * Changed ..... not in git yet (—)
 */
function eventPath(x: { p: Position; series: PriceSeries | null | undefined; events: WindowEvents; end: number }, grid: string[]): HoldingPath | null {
  const mult = contractMultiplier(x.p);
  let held = x.events.s0, began = x.events.v0, from = x.events.from0;
  const marks: HoldingPath['marks'] = [];
  for (const g of grid) {
    let before = 0;
    if (held > 1e-12) {
      const eve = dayBeforeDay(g);
      if (eve == null) return null;
      const mark = closeDayOnOrBefore(x.series, eve);
      before = mark != null && mark.day >= from ? held * mark.close * mult : began;
    }
    let after = before, share = 0;
    const t = x.events.days.get(g);
    if (t && (t.bought > 0 || t.sold > 0)) {
      if (t.bought > 0 && t.paid == null) return null;
      if (t.sold > 0 && (t.proceeds == null || !(held > 1e-12) || t.sold > held + 1e-9)) return null;
      share = t.sold > 0 ? Math.min(1, t.sold / held) : 0;
      const kept = before * (1 - share);
      before = kept + (t.sold > 0 ? t.proceeds as number : 0);   // the piece ends with the shares sold at what they brought in
      after = kept + (t.bought > 0 ? t.paid as number : 0);
      held += t.bought - t.sold;
      if (held < 1e-9) held = 0;
      began = after; from = g;
    }
    marks.push(share > 0 ? { day: g, before, after, sold: share } : { day: g, before, after });
  }
  return { start: x.events.v0, marks, end: x.end };
}

/** A HOLDING'S YARDSTICK ON THE DAYS OF ITS PATH (2026-10-22, MK-PF-M-008): the close the window begins at (`from`), or — for one that
 *  enters later — nothing before it enters and, on the day it does, that day's close for a holding bought inside the window
 *  (its market since the purchase date, invest-v3 FINAL) or the previous evening's; then each previous evening's close, and
 *  today's. closeAsOf, as its own market figure reads them. */
/* ─ MK-PF-F-078 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * yardstickOn
 *
 * Answers ..... A HOLDING'S YARDSTICK ON THE DAYS OF ITS PATH (2026-10-22, MK-PF-M-008): the close the window begins at (`from`), or — for one that enters later — nothing before it enters and, on the day it does, that day's close for a holding bought inside the window (its market since the purchase date, invest-v3 FINAL) or the previous evening's; then each previous evening's close, and today's.
 *
 * Formula .....
 *     out = [enters = nothing and from ≠ nothing ? close as of(bench, from) : nothing]
 *     eve = day before day(g)
 *     the answer = out
 *
 * Called by ... MK-PF-F-014 buildPerformance · MK-PF-F-070 holdingPath
 *
 * Reaches ..... 30 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-PF-F-070 holdingPath · MK-NW-F-168 holdingRowsIn
 *               … and 12 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-005 holding price
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-078
 * Changed ..... not in git yet (—)
 */
function yardstickOn(bench: PriceSeries | null | undefined, from: string | null, enters: string | null, enterAtClose: boolean, grid: string[]): (number | null)[] {
  const out: (number | null)[] = [enters == null && from != null ? closeAsOf(bench, from) : null];
  for (const g of grid) {
    const eve = dayBeforeDay(g);
    out.push(enters != null && g < enters ? null : enters != null && g === enters && enterAtClose ? closeAsOf(bench, g) : eve == null ? null : closeAsOf(bench, eve));
  }
  out.push(latestClose(bench));
  return out;
}

/** ONE HOLDING'S PATH ACROSS THE WINDOW (2026-10-21; DEC-1669), on the list of days `grid` — every day money went into or out of
 *  any holding built beside it. On each day: `before`, the shares held before that day × the previous evening's close; `after`,
 *  with that day's trades in. Its pieces are the very pieces its own window figure is made of, so they multiply to exactly
 *  that figure and a category of one holding reads its return:
 *   · held when the window began: from its start (the shares held then × the close the window begins at); a later purchase or
 *     sale (2026-10-22) is counted at that evening's close, so its pieces multiply to its price move;
 *   · its prices beginning after the window opens: $0 until the day after its first close, when it joins at what it was
 *     worth at that close;
 *   · bought inside the window: $0 until its first purchase, then returnSincePurchases' own pieces — each purchase at what was
 *     paid, each piece ending at the previous evening's close, or where it began with no close inside it (DEC-4439).
 *  With it, its yardstick's close on the same days (2026-10-22, MK-PF-M-008: the market on the same days, with the same
 *  weights): at the close the window begins at, at each previous evening's close, and today — kept only where its pieces give
 *  back the yardstick's own figure over the window.
 *  Null where a close or share count it needs is unknown, or its pieces do not give back its own figure: it then carries no
 *  path, and a category holding it is weighed by the starts instead (classReturnOf). */
/* ─ MK-PF-F-070 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * holdingPath
 *
 * Answers ..... ONE HOLDING'S PATH ACROSS THE WINDOW (2026-10-21; DEC-1669), on the list of days `grid` — every day money went into or out of any holding built beside it.
 *
 * Formula .....
 *     nothing   when x is missing
 *     mult = contract multiplier(p)
 *     marks = []
 *     read = event path({ p: p, series: series, events: events, end: end }, grid)
 *     nothing   when read is missing
 *     own = purchase days(p, bought!)
 *     nothing   when own is missing
 *     held = 0, began = 0, from = '', k = 0
 *     before = 0
 *     nothing   when eve = nothing
 *     after = before
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-PF-F-014 buildPerformance · MK-PF-F-056 purchasePieces
 *
 * Reaches ..... 30 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-PF-F-070 holdingPath · MK-NW-F-168 holdingRowsIn
 *               … and 12 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Decides .....
 *     · If bought is missing it uses 0.
 *     · If sold is missing it uses 0.
 *     · Uses a built-in before of 0.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-070
 * Changed ..... not in git yet (—)
 */
function holdingPath(x: HoldingPlan | null, grid: string[]): HoldingPath | null {
  if (!x) return null;
  const mult = contractMultiplier(x.p);
  let marks: HoldingPath['marks'] = [];
  if (x.events) {
    // read from its own purchases and sales (2026-10-22)
    const read = eventPath({ p: x.p, series: x.series, events: x.events, end: x.end }, grid);
    if (!read) return null;
    marks = read.marks;
  } else if (x.capped) {
    const own = purchaseDays(x.p, x.bought!);
    if (!own) return null;
    let held = 0, began = 0, from = '', k = 0;
    for (const g of grid) {
      let before = 0;
      if (k > 0) {
        const eve = dayBeforeDay(g);
        if (eve == null) return null;
        const mark = closeDayOnOrBefore(x.series, eve);
        before = mark != null && mark.day >= from ? held * mark.close * mult : began;
      }
      let after = before;
      if (k < own.length && own[k].day === g) {
        if (k > 0 && !(began > 0)) return null;
        after = before + own[k].paid * mult;
        held += own[k].shares; began = after; from = g; k++;
      }
      marks.push({ day: g, before, after });
    }
    if (k !== own.length) return null;
  } else {
    if (x.joins == null && x.start == null) return null;
    // the shares held through the window: those held when its figure began, then each day's purchases in and sales out
    let held = x.shares?.start;
    if (held == null) return null;
    for (const g of grid) {
      if (x.joins != null && g < x.joins) { marks.push({ day: g, before: 0, after: 0 }); continue; }
      const eve = dayBeforeDay(g);
      const close = eve == null ? null : closeOnOrBefore(x.series, eve);
      if (close == null) return null;
      const t = x.shares!.days.get(g);
      const before = x.joins === g ? 0 : held * close * mult;
      held += (t?.bought ?? 0) - (t?.sold ?? 0);
      if (held < -1e-9) return null;
      marks.push({ day: g, before, after: held * close * mult });
    }
  }
  const path: HoldingPath = { start: x.events ? x.events.v0 : x.capped || x.joins != null ? 0 : x.start!, marks, end: x.end };
  // its pieces must give back its own window figure; a path that does not is not its own, and is not carried
  const own = returnSplitAtPurchases([path]);
  if (!(own != null && Math.abs(own - x.total) <= 1e-9 * Math.max(1, Math.abs(x.total)))) return null;
  // ITS YARDSTICK ON THE SAME DAYS (2026-10-22): the close the window begins at (or, where it joins later, nothing before it
  // joins), the close of each previous evening, and today's — closeAsOf, as its own figure reads them
  if (x.bench && x.benchTotal != null && x.benchFrom != null) {
    // bought inside the window, its yardstick starts where its own market figure does: the purchase day's close
    // (invest-v3 FINAL, 2026-07-19 — the market since the purchase date)
    const enters = x.events ? (x.events.s0 > 0 ? null : firstEvent(x.events)) : x.capped ? x.bought! : x.joins;
    const withBench = { ...path, bench: yardstickOn(x.bench, x.benchFrom, enters, x.capped, grid), benchAt: grid.map((g) => closeAsOf(x.bench, g)) };
    const mine = marketSplitAtPurchases([withBench]);
    if (mine != null && Math.abs(mine - x.benchTotal) <= 1e-9 * Math.max(1, Math.abs(x.benchTotal))) return withBench;
  }
  return path;
}

/** WHAT A HOLDING WAS WORTH ACROSS ITS WINDOW (2026-10-21; DEC-1669): `start`, when the window began ($0 where it was bought, or
 *  its prices begin, later); on each day money went into any holding built beside it, `before` (the previous evening's close,
 *  before that day's money) and `after` (with it); `end`, its value today plus the interest it was paid in the window. */
export type HoldingPath = { start: number; marks: { day: string; before: number; after: number; sold?: number }[]; end: number;
  /** Its yardstick's close on each day of `marks` itself — where a sale ends a piece, the shares sold are set beside the
   *  market to that day's close, the mirror of a purchase measured from its own day's close (2026-10-22). */
  benchAt?: (number | null)[];
  /** Its yardstick's close at the window's beginning, at the evening before each day of `marks`, and today (2026-10-22) — null
   *  where the holding was not yet held; absent where its yardstick's own figure cannot be given back. */
  bench?: (number | null)[] };

/** A RETURN SPLIT AT EVERY DAY MONEY WENT IN (2026-10-21; DEC-1669, his words: "All return should be True Weighted Return and
 *  not Dietz return." — the window split at every deposit, each piece's growth taken, the pieces multiplied), for a category or
 *  for the holdings together. On each day of their one list the piece ends at what they were all worth the evening before
 *  (Σ before) and the next begins once that day's money is in (Σ after); the last ends at what they are worth today with the
 *  interest they were paid (Σ end). Money put into a holding is never read as earned, and a holding bought inside the window
 *  weighs nothing before it was bought. Worked (outside re-run OpenAI part 1, MK-PF-M-006): A 10 shares at $100 and B 100 at
 *  $100 = $11,000; the evening before A buys 90 more at $105 they are worth $1,050 + $10,000 = $11,050; with the $9,450 in,
 *  $20,500; today A 100 × $110 + B 100 × $50 = $16,000 → 11,050 ÷ 11,000 × 16,000 ÷ 20,500 − 1 = −21.60% (weighed by value
 *  now ÷ (1 + each return) it read −20.00%). Undefined where the paths were not built on one list of days (the caller then
 *  weighs by the starts); null where nothing was there to grow. */
/* ─ MK-PF-F-071 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * returnSplitAtPurchases
 *
 * Answers ..... A RETURN SPLIT AT EVERY DAY MONEY WENT IN (2026-10-21; DEC-1669, his words: "All return should be True Weighted Return and not Dietz return." — the window split at every deposit, each piece's growth taken, the pieces multiplied), for a category or for the holdings together.
 *
 * Formula .....
 *     undefined   when count of paths is missing
 *     days = for each of paths[0].marks: day.join('|')
 *     undefined   when paths.some((x) => marks.map((m) => day).join('|') ! = days)
 *     growth = 1, measured = false
 *     open = Σ over paths of (start)
 *     before = Σ over paths of (marks[k].before)
 *     end = Σ over paths of (end)
 *     growth − 1   if measured and size of(end) < 1e − 9
 *     nothing   otherwise   when not (open > 0)
 *     nothing   when not (end ≥ 0)
 *     the answer = growth × (end ÷ open) − 1
 *
 * Called by ... MK-NW-F-142 classReturnOf · MK-PF-F-013 benchmarkTicker
 *               MK-PF-F-014 buildPerformance · MK-PF-F-070 holdingPath
 *
 * Reaches ..... 85 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-082 NW · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-040 assetsFromOnboarding · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-013 benchmarkTicker · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               … and 67 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-071
 * Changed ..... not in git yet (—)
 */
export function returnSplitAtPurchases(paths: HoldingPath[]): number | null | undefined {
  if (!paths.length) return undefined;
  const days = paths[0].marks.map((m) => m.day).join('|');
  if (paths.some((x) => x.marks.map((m) => m.day).join('|') !== days)) return undefined;
  let growth = 1, measured = false;
  let open = paths.reduce((t, x) => t + x.start, 0);   // what they were all worth when the window began
  for (let k = 0; k < paths[0].marks.length; k++) {
    const before = paths.reduce((t, x) => t + x.marks[k].before, 0);
    if (open > 0) { growth *= before / open; measured = true; }   // nothing held yet: no piece to measure
    open = paths.reduce((t, x) => t + x.marks[k].after, 0);
  }
  const end = paths.reduce((t, x) => t + x.end, 0);
  // EVERYTHING SOLD BEFORE TODAY (2026-10-22): the pieces it was held in are the whole of its return
  if (!(open > 0)) return measured && Math.abs(end) < 1e-9 ? growth - 1 : null;
  if (!(end >= 0)) return null;
  return growth * (end / open) - 1;
}

/** THE MARKET ON THE SAME DAYS, WITH THE SAME WEIGHTS, AS YOUR RETURN BESIDE IT (2026-10-22; MK-PF-M-008, the lead's decision under
 *  DEC-1669, DEC-7221 and tenets 1 and 7). Your return is split at every day money went into or out of a holding
 *  (returnSplitAtPurchases); the market beside it is split at the same days, and each piece weighs each holding's yardstick by
 *  what that holding was worth when the piece began — the weights your own pieces carry. With no money moved inside the window
 *  there is one piece, and this is the market weighed by what each holding was worth when the window began, as before
 *  (DEC-7221). Weighed by those starts alone, a holding bought last week counted at full weight from the first day with a
 *  week of the market, so the market read low and the gap flattered you: VTI $10,000 up 10% with the market, $10,000 more
 *  bought Sep 25 with the market flat after → your +10.00% beside a market of +5.00%, ahead by 5.00%; on the same days and
 *  weights the market is +10.00% and you are level with it. Undefined where a path or a yardstick close is missing.
 *  Worked: piece 1 VTI alone, $10,000, market $500 → $550; piece 2 VTI $11,000 + the new $10,000, market $550 → $550:
 *  (10,000 × 1.10) ÷ 10,000 × (11,000 × 1 + 10,000 × 1) ÷ 21,000 − 1 = +10.00%. */
/* ─ MK-PF-F-074 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * marketSplitAtPurchases
 *
 * Answers ..... THE MARKET ON THE SAME DAYS, WITH THE SAME WEIGHTS, AS YOUR RETURN BESIDE IT (2026-10-22; MK-PF-M-008, the lead's decision under DEC-1669, DEC-7221 and tenets 1 and 7).
 *
 * Formula .....
 *     undefined   when count of paths is missing (or paths.some((x) => !bench or bench.length ! = marks.length + 2) when missing or zero)
 *     days = for each of paths[0].marks: day.join('|')
 *     undefined   when paths.some((x) => marks.map((m) => day).join('|') ! = days)
 *     growth = 1
 *     weight = for each of paths: start
 *     total = Σ over weight of (each)
 *     moved = 0
 *     undefined   when from = nothing (or to = nothing (or not (from > 0) when missing or zero) when missing or zero)
 *     undefined   when out > 0 and out at = nothing
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-PF-F-014 buildPerformance · MK-PF-F-020 portfolioBenchReturn
 *               MK-PF-F-070 holdingPath
 *
 * Reaches ..... 30 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-PF-F-070 holdingPath · MK-NW-F-168 holdingRowsIn
 *               … and 12 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · If sold is missing it uses 0.
 *     · Uses a built-in growth of 1.
 *     · Uses a built-in moved of 0.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-074
 * Changed ..... not in git yet (—)
 */
export function marketSplitAtPurchases(paths: HoldingPath[]): number | null | undefined {
  if (!paths.length || paths.some((x) => !x.bench || x.bench.length !== x.marks.length + 2)) return undefined;
  const days = paths[0].marks.map((m) => m.day).join('|');
  if (paths.some((x) => x.marks.map((m) => m.day).join('|') !== days)) return undefined;
  let growth = 1;
  let weight = paths.map((x) => x.start);
  for (let k = 0; k <= paths[0].marks.length; k++) {
    const total = weight.reduce((t, w) => t + w, 0);
    if (total > 0) {
      let moved = 0;
      for (let i = 0; i < paths.length; i++) {
        if (!(weight[i] > 0)) continue;
        const from = paths[i].bench![k], to = paths[i].bench![k + 1];
        if (from == null || to == null || !(from > 0)) return undefined;
        // shares sold that day leave the market at that day's close, as they left the holding at what the sale brought in
        const out = k < paths[i].marks.length ? (paths[i].marks[k].sold ?? 0) : 0;
        const outAt = out > 0 ? paths[i].benchAt?.[k] : null;
        if (out > 0 && outAt == null) return undefined;
        moved += weight[i] * ((1 - out) * (to / from) + (out > 0 ? out * ((outAt as number) / from) : 0));
      }
      growth *= moved / total;
    }
    if (k < paths[0].marks.length) weight = paths.map((x) => x.marks[k].after);
  }
  return growth - 1;
}

/** A Date as its local calendar day, YYYY-MM-DD. */
/* ─ MK-PF-F-041 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * isoDay
 *
 * Answers ..... A Date as its local calendar day, YYYY-MM-DD.
 *
 * Formula .....
 *     p2 = (n: number) => string(n).pad start(2, '0')
 *     the answer = `${get full year()}-${p2(get month() + 1)}-${p2(get date())}`
 *
 * Called by ... MK-PF-F-011 periodReturnSince · MK-PF-F-014 buildPerformance
 *               MK-PF-F-039 periodReturnParts
 *
 * Reaches ..... 36 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-NW-F-127 gainOfRow · MK-PF-F-070 holdingPath
 *               … and 18 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-041
 * Changed ..... not in git yet (—)
 */
function isoDay(d: Date): string {
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

/** The holding-concentration FACT (Invest main + the insights function share this one rule):
 *  the largest single holding as a % of invested money, reported only at 25%+ with 2+ holdings —
 *  below that it isn't a fact worth a card. Never advice, just the number and the ticker. */
/* ─ MK-PF-F-015 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * topHoldingConcentration
 *
 * Answers ..... The holding-concentration FACT (Invest main + the insights function share this one rule): the largest single holding as a % of invested money, reported only at 25%+ with 2+ holdings — below that it isn't a fact worth a card.
 *
 * Formula .....
 *     nothing   when rows.some((r) => market value = nothing)
 *     nothing   when rows.some((r) => (market value as number) < 0)
 *     held = []
 *     at = new map<string, number>()
 *     t = string(position.ticker ?? '').trim().to upper case()
 *     k = t (or `#${position.position id ?? i}` when missing or zero)
 *     invested = Σ over held of (value)
 *     nothing   when invested ≤ 0 (or held.length < 2 when missing or zero)
 *     top = the first of held
 *     top value = top.value
 *     share = (top value ÷ invested) × 100
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-015
 * Changed ..... 2026-07-29 (13c9be6)
 */
export function topHoldingConcentration(rows: PerformanceRow[]): { ticker: string; pct: number; value: number } | null {
  // a holding worth something unknown (shares, no price) makes every share of the whole unknown — no fact to state (tenet 3)
  if (rows.some((r) => r.marketValue == null)) return null;
  // A SHORT POSITION MAKES "A SHARE OF YOUR INVESTED MONEY" MEANINGLESS (2026-10-21, the lead's decision under DEC-3523
  // tenet 1; outside re-run OpenAI part 3, MK-PF-F-015): counted negative, it shrank the whole and the largest holding read
  // 112% of it. With a holding below $0 there is no fact to state, as with one of unknown worth.
  if (rows.some((r) => (r.marketValue as number) < 0)) return null;
  // ONE HOLDING HELD IN TWO ACCOUNTS IS ONE HOLDING (2026-10-21, the same decision, tenets 1 and 4; MK-PF-F-015): the rows
  // come one per account, so VTI $30,000 in each of two accounts lost to SCHD $50,000 (45%) though VTI is $60,000 (55%).
  // Rows of one ticker are added together first. Two of equal size: the first one listed is named (the share is the same).
  const held: { ticker: string; value: number }[] = [];
  const at = new Map<string, number>();
  rows.forEach((r, i) => {
    const t = String(r.position.ticker ?? '').trim().toUpperCase();
    const k = t || `#${r.position.position_id ?? i}`;
    if (at.has(k)) held[at.get(k)!].value += r.marketValue as number;
    else { at.set(k, held.length); held.push({ ticker: r.position.ticker, value: r.marketValue as number }); }
  });
  const invested = held.reduce((t, h) => t + h.value, 0);
  if (invested <= 0 || held.length < 2) return null;
  let top = held[0];
  for (const h of held) if (h.value > top.value) top = h;
  const topValue = top.value;
  const share = (topValue / invested) * 100;
  // THE 25% LINE IS TESTED ON THE UNROUNDED SHARE, and the value is not rounded (DEC-0300: nothing rounds inside a
  // calculation): 24.6% is under the line, it read 25 and was reported (outside review Claude Performance,
  // 2026-10-11). `pct` stays the whole percent the card states it returns — the figure as shown.
  return share >= 25 ? { ticker: top.ticker, pct: Math.round(share), value: topValue } : null;
}


/** A ROW'S WINDOW TOTAL — the one rule for reading a holding's return as the window's own total, never a yearly
 *  rate. A row that carries its total (buildPerformance writes it) is read as written; one that does not is a
 *  yearly rate over `years` when the window is longer than a year, else the total itself (outside review Claude
 *  Performance, 2026-10-11, MK-NW-F-091). */
/* ─ MK-PF-F-042 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * windowTotal
 *
 * Answers ..... A ROW'S WINDOW TOTAL — the one rule for reading a holding's return as the window's own total, never a yearly rate.
 *
 * Formula .....
 *     total   when total ! = undefined
 *     nothing   when rate = nothing
 *     (1 + rate)^(years) − 1   if years > 1
 *     rate   otherwise
 *
 * Called by ... MK-NW-F-084 categoryEarnings · MK-NW-F-127 gainOfRow
 *               MK-NW-F-138 knownHoldingsReturn · MK-NW-O-008 thePerformance
 *               MK-PF-F-020 portfolioBenchReturn · MK-PF-F-043 windowTotalOfRow
 *
 * Reaches ..... 17 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-NW-F-084 categoryEarnings · MK-NW-F-127 gainOfRow
 *               MK-NW-F-138 knownHoldingsReturn · MK-NW-F-130 notIncludedSentence
 *               MK-PF-F-020 portfolioBenchReturn · MK-NW-F-091 pricedGainOf
 *               MK-PF-F-044 startValues · MK-NW-O-008 thePerformance
 *               MK-PF-F-043 windowTotalOfRow
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-042
 * Changed ..... not in git yet (—)
 */
export function windowTotal(rate: number | null | undefined, total: number | null | undefined, years = 0): number | null {
  if (total !== undefined) return total;
  if (rate == null) return null;
  return years > 1 ? Math.pow(1 + rate, years) - 1 : rate;
}
/** One holding's return over the whole window — its total, never a yearly rate (a 2Y yearly rate is turned back into the two-year total). */
/* ─ MK-PF-F-043 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * windowTotalOfRow
 *
 * Answers ..... One holding's return over the whole window — its total, never a yearly rate (a 2Y yearly rate is turned back into the two-year total).
 *
 * Formula .....
 *     window total(period return, period total)
 *
 * Called by ... MK-PF-F-020 portfolioBenchReturn
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-PF-F-020 portfolioBenchReturn
 *               MK-PF-F-044 startValues
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-043
 * Changed ..... not in git yet (—)
 */
const windowTotalOfRow = (r: PerformanceRow): number | null => windowTotal(r.periodReturn, r.periodTotal);

/** Each holding that has a window total, with its value when the window began — a holding worth $0 today counted at the start it was read at (2026-10-21). */
/* ─ MK-PF-F-044 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * startValues
 *
 * Answers ..... Each holding that has a window total, with its value when the window began — a holding worth $0 today counted at the start it was read at (2026-10-21).
 *
 * Formula .....
 *     out = []
 *     ret = ret of(r)
 *     the answer = out
 *
 * Called by ... MK-PF-F-020 portfolioBenchReturn
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-PF-F-020 portfolioBenchReturn
 *               MK-PF-F-044 startValues
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · If start value is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-044
 * Changed ..... not in git yet (—)
 */
function startValues(rows: PerformanceRow[], retOf: (r: PerformanceRow) => number | null): { row: PerformanceRow; ret: number; start: number }[] {
  const out: { row: PerformanceRow; ret: number; start: number }[] = [];
  for (const r of rows ?? []) {
    const ret = retOf(r);
    if (ret == null) continue;
    // WORTH $0 TODAY, WORTH SOMETHING WHEN THE WINDOW BEGAN (2026-10-21; tenet 4, DEC-5068): it is in the person's return
    // with what it lost, so it is in the market's average at that start — a known $0 is $0, never left out. Its start is
    // the one buildPerformance read (startValue); a row that carries none is still left out, as before.
    if (!(ret > -1) || !((r.marketValue as number) > 0)) {
      if ((r.startValue ?? 0) > 0) out.push({ row: r, ret, start: r.startValue as number });
      continue;
    }
    // THE START THE ROW CARRIES, WHERE IT CARRIES ONE (2026-10-21; DEC-1669, DEC-3035b, tenet 4; outside re-run OpenAI part 4,
    // MK-PF-F-044, was NEEDS A RULING): what buildPerformance read from the shares held when the window began. Worked back as
    // value now ÷ (1 + total) it counted shares bought inside the window as held all along — $2,420 ÷ 1.21 = $2,000 where
    // $1,000 was held. The market's average already weighed by it (portfolioBenchReturn); this one reading now gives it too.
    // A row with none: a bond's window total holds its interest, so its start is its value today plus that interest ÷
    // (1 + total) (DEC-6212)
    out.push({ row: r, ret, start: (r.startValue ?? 0) > 0 ? r.startValue as number : worthWithInterest(r) / (1 + ret) });
  }
  return out;
}




/** Value-weighted benchmark ("the market, matched to your mix") return across holdings that have
 *  one (decimal), or null. Walk row 5 (audit Strategy #5): Home and Invest both say "the market:
 *  up X%" — this is the ONE formula behind both, so an edit can never make them disagree. */
/* ─ MK-PF-F-020 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * portfolioBenchReturn
 *
 * Answers ..... Value-weighted benchmark ("the market, matched to your mix") return across holdings that have one (decimal), or null.
 *
 * Formula .....
 *     started = for each of start values(rows, window total of row): ...each = ...each
 *     bench = window total(row.bench return, row.bench total)
 *     nothing   when started.some((u) => bench = nothing)
 *     m = market split at purchases([row.path])   if row.path.bench
 *     undefined   otherwise
 *     the answer = m ≠ nothing and bench ≠ nothing and size of(m − bench) ≤ 1e − 9 × max(1, size of(bench))
 *     nothing   when between.some((u) => bench = nothing)
 *     same = [...started, ...between]
 *     split = market split at purchases(same.map((u) => row.path!))
 *     split   when split ! = undefined
 *     total = Σ over started of (start)
 *     nothing   when total ≤ 0
 *
 * Called by ... MK-NW-F-088 BENCH · MK-PF-F-044 startValues
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-PF-F-020 portfolioBenchReturn
 *               MK-PF-F-044 startValues
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-020
 * Changed ..... 2026-07-29 (13c9be6)
 */
export function portfolioBenchReturn(rows: PerformanceRow[]): number | null {
  // THE MARKET, MATCHED TO THE MIX HELD WHEN THE WINDOW BEGAN (DEC-1669, DEC-3035b): each yardstick weighed by
  // its holding's value at the start, value now ÷ (1 + its own window total), so a holding that doubled does
  // not double its yardstick's weight (+7.33% → +6.00%). A holding with no return of its own has no start value
  // and is out of the market's average as it is out of the person's, so both speak of the same money (tenet 4)
  // (outside review Claude Performance, 2026-10-11). Home's "market +X%" is this figure.
  const started = startValues(rows, windowTotalOfRow).map((u) => ({ ...u, bench: windowTotal(u.row.benchReturn, u.row.benchTotal) }));
  // A HOLDING IN YOUR RETURN WITH NO YARDSTICK MAKES THE MARKET UNKNOWN (2026-10-21, the lead's decision under DEC-3523
  // tenets 1, 3 and 4; outside re-run OpenAI part 3, MK-PF-F-020): it was left out of the market's average while it stayed
  // in yours, so "market +5.00%" covered $1,100 of $3,400 and the "ahead by" beside it compared different money. No market
  // figure is shown, as when no yardstick can be priced (the figure's own refusal). To reverse: filter those rows out again.
  if (started.some((u) => u.bench == null)) return null;
  // WEIGHED BY THE START THE ROW CARRIES (2026-10-21, MK-PF-F-020, tenet 4): what the holding was worth when the window
  // began, from the shares held then (buildPerformance, startValue). Worked back as value now ÷ (1 + total), a holding
  // with shares bought inside the window weighed as if it held them all along: 20 shares at $121 ÷ 1.21 = $2,000, where
  // 10 shares at $100 = $1,000 were held — market +7.00% where the mix held when the window began gives +6.00%.
  // That start is chosen in ONE place, startValues (MK-PF-F-044); it was chosen a second time here (W-START, 2026-10-22).
  // ON THE SAME DAYS AND WITH THE SAME WEIGHTS AS YOUR RETURN (2026-10-22, the lead's decision under DEC-1669, DEC-7221 and
  // tenets 1 and 7): where every holding counted carries its path and its yardstick on the same days, the market is split at
  // every day money went into or out of a holding, as your return is (marketSplitAtPurchases). With no money moved inside the
  // window that is this same start-weighted figure; with money moved, weighed by the starts alone the market counted a
  // holding bought last week at full weight with a week of the market — your +10.00% read ahead of a +5.00% market by 5.00%
  // where, on the same days and weights, you were level with it. To reverse: delete this branch.
  // (each path must give back its own row's market figure, or the rows were changed after they were built: then the starts)
  const ownMarket = (u: { row: PerformanceRow; bench: number | null }) => {
    const m = u.row.path?.bench ? marketSplitAtPurchases([u.row.path]) : undefined;
    return m != null && u.bench != null && Math.abs(m - u.bench) <= 1e-9 * Math.max(1, Math.abs(u.bench));
  };
  // (bought and sold inside the window, nothing held at either end: it weighed while it was held, as in your return, 2026-10-22)
  const between = (rows ?? []).filter((r) => !started.some((u) => u.row === r) && windowTotalOfRow(r) != null && !!r.path?.marks.some((m) => m.after > 1e-9))
    .map((r) => ({ row: r, bench: windowTotal(r.benchReturn, r.benchTotal) }));
  if (between.some((u) => u.bench == null)) return null;
  const same = [...started, ...between];
  if (same.length && same.every(ownMarket)) {
    const split = marketSplitAtPurchases(same.map((u) => u.row.path!));
    if (split !== undefined) return split;
  }
  const total = started.reduce((t, u) => t + u.start, 0);
  if (total <= 0) return null;
  return started.reduce((t, u) => t + (u.bench as number) * u.start, 0) / total;
}

/** HOW FAR AHEAD OF THE MARKET, OR BEHIND IT — your return less the market's over the same dates, at full precision
 *  (DEC-0264: worked unrounded, rounded once on screen). Above zero is ahead. The one gap: Home's "ahead by" beside
 *  "market +X%", and each holding's own "You are ahead by" (buildPerformance, beatBy). Unknown when either side is.
 *  (outside re-run OpenAI, tax and cross-card part, 2026-10-21: the gap was calculated on the Home screen itself.) */
/* ─ MK-PF-F-066 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * marketGap
 *
 * Answers ..... HOW FAR AHEAD OF THE MARKET, OR BEHIND IT — your return less the market's over the same dates, at full precision (DEC-0264: worked unrounded, rounded once on screen).
 *
 * Formula .....
 *     nothing   when yours = nothing (or market = nothing (or !number.is finite(yours) (or !number.is finite(market) when missing or zero) when missing or zero) when missing or zero)
 *     yours − market
 *
 * Called by ... MK-NW-F-088 BENCH · MK-NW-F-167 COMPARE
 *               MK-PF-F-014 buildPerformance
 *
 * Reaches ..... 30 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-PF-F-070 holdingPath · MK-NW-F-168 holdingRowsIn
 *               … and 12 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-066
 * Changed ..... not in git yet (—)
 */
export function marketGap(yours: number | null | undefined, market: number | null | undefined): number | null {
  if (yours == null || market == null || !Number.isFinite(yours) || !Number.isFinite(market)) return null;
  return yours - market;
}

