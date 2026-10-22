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
import { TBILL_ETF_TICKERS } from '../../../Calculation Module code/engines/holding-class';
import { moneyIntoAccount } from '../../../Calculation Module code/engines/ledger';
import { holdingClassOf, assetClassOf } from '../assets';
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
 *               MK-PF-F-028 realizedFromLedger · MK-PF-F-051 paidOnRecord
 *               MK-PL-F-081 taxableGainShare · MK-XS-F-102 ingestSync
 *
 * Reaches ..... 270 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-NW-F-080 HOLD
 *               MK-CF-F-201 INCOME · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               … and 252 more — the full list is on functions_from_code
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
 * Called by ... MK-PF-F-033 quantityWithUnit
 *
 * Reaches ..... 270 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-NW-F-080 HOLD
 *               MK-CF-F-201 INCOME · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               … and 252 more — the full list is on functions_from_code
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
 *     unit = quantity unit(p)
 *     the answer = `${format(qty)} ${math.abs(qty) = 1 ? unit.replace( ÷ s$ ÷ , '') : unit}`
 *
 * Called by ... MK-NW-F-146 undatedGainSentence · MK-PF-F-058 gainOnPartSentence
 *
 * Reaches ..... 269 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-NW-F-080 HOLD
 *               MK-CF-F-201 INCOME · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               … and 251 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-005 holding price
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
  const unit = quantityUnit(p);
  return `${format(qty)} ${Math.abs(qty) === 1 ? unit.replace(/s$/, '') : unit}`;
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
 *               MK-NW-F-128 heldValueOf · MK-NW-O-006 theHolding
 *               MK-PF-F-004 marketValue
 *
 * Reaches ..... 269 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-NW-F-080 HOLD
 *               MK-CF-F-201 INCOME · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               … and 251 more — the full list is on functions_from_code
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
 *               MK-PF-F-051 paidOnRecord
 *
 * Reaches ..... 266 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-NW-F-080 HOLD
 *               MK-CF-F-201 INCOME · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               … and 248 more — the full list is on functions_from_code
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
 *               MK-NW-F-144 beforeTheRecordSentence · MK-NW-O-006 theHolding
 *               MK-PF-F-005 unrealizedGain · MK-PF-F-007 totalROI
 *               MK-PF-F-013 benchmarkTicker · MK-PF-F-014 buildPerformance
 *               MK-PL-F-081 taxableGainShare · MK-XS-F-174 recomputeBalances
 *
 * Reaches ..... 266 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-NW-F-080 HOLD
 *               MK-CF-F-201 INCOME · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               … and 248 more — the full list is on functions_from_code
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
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-080 HOLD · MK-XS-F-102 ingestSync
 *               MK-NW-O-006 theHolding
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
 *               MK-NW-O-006 theHolding · MK-PF-F-005 unrealizedGain
 *               MK-PF-F-014 buildPerformance · MK-PF-F-055 valueAtClose
 *               MK-PL-F-081 taxableGainShare · MK-XS-F-174 recomputeBalances
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
 * Reaches ..... 11 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-080 HOLD
 *               MK-NW-F-140 LEFT_OUT · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-PF-F-014 buildPerformance · MK-NW-F-091 pricedGainOf
 *               MK-NW-O-006 theHolding · MK-NW-O-008 thePerformance
 *               MK-PF-F-007 totalROI
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
 *               MK-PF-F-053 isBroadIndexOption · MK-PF-F-056 purchasePieces
 *               MK-XS-F-127 toIsoDate
 *
 * Reaches ..... 73 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-080 HOLD
 *               MK-NW-F-140 LEFT_OUT · MK-NW-F-082 NW
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               MK-CF-F-111 applyTransaction · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PF-F-014 buildPerformance · MK-PL-F-053 buildRetirementState
 *               … and 55 more — the full list is on functions_from_code
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
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-080 HOLD · MK-PF-F-006 capGains
 *               MK-NW-O-006 theHolding
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
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-080 HOLD · MK-NW-O-006 theHolding
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
 * Called by ... MK-NW-O-006 theHolding · MK-PF-F-014 buildPerformance
 *
 * Reaches ..... 10 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-080 HOLD
 *               MK-NW-F-140 LEFT_OUT · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-PF-F-014 buildPerformance · MK-NW-F-091 pricedGainOf
 *               MK-NW-O-006 theHolding · MK-NW-O-008 thePerformance
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
 * Reaches ..... 23 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-127 gainOfRow · MK-NW-F-143 gainRowBetween
 *               MK-NW-F-138 knownHoldingsReturn · MK-NW-F-130 notIncludedSentence
 *               MK-PF-F-010 periodReturn · MK-PF-F-039 periodReturnParts
 *               MK-PF-F-038 periodTotalReturn · MK-PF-F-020 portfolioBenchReturn
 *               … and 5 more — the full list is on functions_from_code
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
 *     the answer = `prices for this holding go back ${plural(months, 'month')}, so the ${label} figure covers ${plural(months, 'month')} — not ${words}.`
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Turns a monthly figure into a year by multiplying by twelve.
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
 * Reaches ..... 28 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-081 LB
 *               MK-NW-F-140 LEFT_OUT · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-144 beforeTheRecordSentence · MK-PF-F-014 buildPerformance
 *               MK-NW-F-084 categoryEarnings · MK-PF-F-022 factorOverMonths
 *               MK-NW-F-127 gainOfRow · MK-NW-F-143 gainRowBetween
 *               MK-NW-F-138 knownHoldingsReturn · MK-PF-F-023 lookBack
 *               MK-NW-F-130 notIncludedSentence · MK-PF-F-010 periodReturn
 *               … and 10 more — the full list is on functions_from_code
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
 * Reaches ..... 20 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-127 gainOfRow · MK-NW-F-138 knownHoldingsReturn
 *               MK-NW-F-130 notIncludedSentence · MK-PF-F-010 periodReturn
 *               MK-PF-F-039 periodReturnParts · MK-PF-F-038 periodTotalReturn
 *               MK-PF-F-020 portfolioBenchReturn · MK-NW-F-091 pricedGainOf
 *               … and 2 more — the full list is on functions_from_code
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
/** Close on/just-before a target date (series oldest→newest). */
/* ─ MK-PF-F-029 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * closeAsOf
 *
 * Answers ..... Close on/just-before a target date (series oldest→newest).
 *
 * Formula .....
 *     pts = series.points (or none when missing)
 *     nothing   when count of pts is missing
 *     t = target.get time()
 *     chosen = nothing
 *     the answer = chosen (or pts[0].close when missing)
 *
 * Called by ... MK-PF-F-011 periodReturnSince · MK-PF-F-039 periodReturnParts
 *               MK-PF-F-055 valueAtClose
 *
 * Reaches ..... 22 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-127 gainOfRow · MK-NW-F-138 knownHoldingsReturn
 *               MK-NW-F-130 notIncludedSentence · MK-PF-F-010 periodReturn
 *               MK-PF-F-039 periodReturnParts · MK-PF-F-011 periodReturnSince
 *               MK-PF-F-038 periodTotalReturn · MK-PF-F-020 portfolioBenchReturn
 *               … and 4 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-005 holding price
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-029
 * Changed ..... not in git yet (—)
 */
function closeAsOf(series: PriceSeries | null | undefined, target: Date): number | null {
  const pts = series?.points ?? [];
  if (!pts.length) return null;
  const t = target.getTime();
  let chosen: number | null = null;
  for (const p of pts) { if (new Date(p.date).getTime() <= t) chosen = p.close; else break; }
  return chosen ?? pts[0].close;   // target predates the series → first available
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
 *     pts = series.points (or none when missing)
 *     nothing   when count of pts is missing (or ! ÷ ^\d{4}-\d{2}-\d{2}$ ÷ .test(iso date) when missing or zero)
 *     chosen = nothing
 *     day = the first 10 of string(date)
 *     the answer:
 *     chosen.close   if chosen
 *     nothing   otherwise
 *
 * Called by ... MK-NW-F-143 gainRowBetween · MK-PF-F-056 purchasePieces
 *               MK-XS-F-175 uid
 *
 * Reaches ..... 64 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-082 NW · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PF-F-014 buildPerformance · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               … and 46 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-005 holding price
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-034
 * Changed ..... not in git yet (—)
 */
export function closeOnOrBefore(series: PriceSeries | null | undefined, isoDate: string): number | null {
  const pts = series?.points ?? [];
  if (!pts.length || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  // the latest close on or before the date, whatever order the list arrived in (outside review Claude Performance, 2026-10-12)
  let chosen: { day: string; close: number } | null = null;
  for (const p of pts) {
    const day = String(p.date).slice(0, 10);
    if (day <= isoDate && (chosen == null || day >= chosen.day)) chosen = { day, close: p.close };
  }
  return chosen ? chosen.close : null;
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
 *               MK-PF-F-054 latestCloseLookup
 *
 * Reaches ..... 275 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-NW-F-080 HOLD
 *               MK-CF-F-201 INCOME · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               … and 257 more — the full list is on functions_from_code
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
 * Reaches ..... 266 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-NW-F-080 HOLD
 *               MK-CF-F-201 INCOME · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               … and 248 more — the full list is on functions_from_code
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
 * Called by ... MK-NW-F-084 categoryEarnings · MK-NW-F-127 gainOfRow
 *               MK-NW-F-138 knownHoldingsReturn · MK-NW-O-008 thePerformance
 *               MK-PF-F-014 buildPerformance · MK-PF-F-043 windowTotalOfRow
 *
 * Reaches ..... 17 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-127 gainOfRow · MK-NW-F-138 knownHoldingsReturn
 *               MK-NW-F-130 notIncludedSentence · MK-PF-F-020 portfolioBenchReturn
 *               MK-NW-F-091 pricedGainOf · MK-NW-O-008 thePerformance
 *               MK-PF-F-043 windowTotalOfRow
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
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-PF-F-014 buildPerformance
 *               MK-NW-F-091 pricedGainOf · MK-NW-O-008 thePerformance
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
 *     beginning = day before(opens)
 *     start = close as of(series, beginning)
 *     nothing   when end = nothing (or start = nothing (or start ≤ 0 when missing or zero) when missing or zero)
 *     total = end ÷ start − 1
 *     total = total
 *     years = 1   when period ! = '2Y'
 *     first = the date series.points[0].date), last = new date(series.points[series.points.length − 1].date
 *     reaches = first.get time() ≤ beginning.get time()
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-PF-F-010 periodReturn · MK-PF-F-014 buildPerformance
 *               MK-PF-F-038 periodTotalReturn
 *
 * Reaches ..... 19 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-127 gainOfRow · MK-NW-F-138 knownHoldingsReturn
 *               MK-NW-F-130 notIncludedSentence · MK-PF-F-010 periodReturn
 *               MK-PF-F-038 periodTotalReturn · MK-PF-F-020 portfolioBenchReturn
 *               MK-NW-F-091 pricedGainOf · MK-NW-O-008 thePerformance
 *               … and 1 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-005 holding price
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
  const beginning = dayBefore(opens);
  const start = closeAsOf(series, beginning);
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
  const first = new Date(series.points[0].date), last = new Date(series.points[series.points.length - 1].date);
  const reaches = first.getTime() <= beginning.getTime();
  const years = reaches ? 2 : (last.getTime() - first.getTime()) / (365.25 * 86_400_000);
  return { total, years };
}

/** Price return from an explicit start DATE to now (for purchase-capped windows). */
/* ─ MK-PF-F-011 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * periodReturnSince
 *
 * Answers ..... Price return from an explicit start DATE to now (for purchase-capped windows).
 *
 * Formula .....
 *     nothing   when series is missing (or not (count of series.points) when missing or zero)
 *     end = latest close(series)
 *     start = close as of(series, new date(since iso))
 *     nothing   when end = nothing (or start = nothing (or start ≤ 0 when missing or zero) when missing or zero)
 *     the answer = end ÷ start − 1
 *
 * Called by ... MK-PF-F-014 buildPerformance
 *
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-PF-F-014 buildPerformance
 *               MK-NW-F-091 pricedGainOf · MK-NW-O-008 thePerformance
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
  const end = latestClose(series);
  const start = closeAsOf(series, new Date(sinceISO));
  if (end == null || start == null || start <= 0) return null;
  return ((end / start - 1));
}

/** WHAT A HOLDING WAS WORTH AT THE CLOSE A WINDOW FIGURE IS MEASURED FROM (2026-10-21; DEC-5068, tenet 4): the shares it
 *  holds × the close on or before that day (its first close where its prices begin later — the close periodReturnSince and
 *  periodReturnParts divide by) × its multiplier. A day written YYYY-MM-DD is read as periodReturnSince reads it. Unknown
 *  where no close above $0 is held for it, or the share count is unknown. The one start a holding worth $0 today has. */
/* ─ MK-PF-F-055 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * valueAtClose
 *
 * Answers ..... WHAT A HOLDING WAS WORTH AT THE CLOSE A WINDOW FIGURE IS MEASURED FROM (2026-10-21; DEC-5068, tenet 4): the shares it holds × the close on or before that day (its first close where its prices begin later — the close periodReturnSince and periodReturnParts divide by) × its multiplier.
 *
 * Formula .....
 *     close = close as of(series, typeof from = 'string' ? new date(from) : from)
 *     the answer:
 *     nothing   if close = nothing (or not (close > 0) when missing or zero)
 *     market value(p, close)   otherwise
 *
 * Called by ... MK-PF-F-014 buildPerformance
 *
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-PF-F-014 buildPerformance
 *               MK-NW-F-091 pricedGainOf · MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-005 holding price
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-055
 * Changed ..... not in git yet (—)
 */
export function valueAtClose(p: Position, series: PriceSeries | null | undefined, from: Date | string): number | null {
  const close = closeAsOf(series, typeof from === 'string' ? new Date(from) : from);
  return close == null || !(close > 0) ? null : marketValue(p, close);
}

/** Earliest dated lot — the day this holding became YOUR money. null when no lot carries a date. */
/* ─ MK-PF-F-012 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * earliestPurchaseDate
 *
 * Answers ..... Earliest dated lot — the day this holding became YOUR money.
 *
 * Formula .....
 *     dates = for each of lots (or none when missing): purchase date on record(purchase date) where (d): d is string => d ≠ nothing
 *     the answer:
 *     dates.sort()[0]!   if count of dates
 *     nothing   otherwise
 *
 * Called by ... MK-PF-F-014 buildPerformance
 *
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-PF-F-014 buildPerformance
 *               MK-NW-F-091 pricedGainOf · MK-NW-O-008 thePerformance
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
  const dates = (p.lots ?? []).map((l) => purchaseDateOnRecord(l.purchase_date)).filter((d): d is string => d != null);
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
 *     h = { kind: of ?? undefined } as pick<position, 'kind' | 'asset_class' | 'class_source'>   if of is a string (or of = nothing when missing or zero)
 *     of   otherwise
 *     kind = kind (or undefined when missing or zero)
 *     by class = 'AGG'   if asset class = 'bond'
 *     'SPY'   if asset class = 'stock_etf'
 *     nothing   otherwise   otherwise
 *     by class   when by class and (class source = 'user' or !kind or !BENCHMARK_TICKER[kind])
 *     BENCHMARK_TICKER[kind]   when kind and BENCHMARK_TICKER[kind]
 *     'SPY'   when kind (or asset class when missing or zero)
 *     the answer = nothing
 *
 * Called by ... MK-PF-F-014 buildPerformance · MK-XS-F-175 uid
 *
 * Reaches ..... 61 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-082 NW · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PF-F-014 buildPerformance · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               … and 43 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-056 how a holding was classified, and by whom
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-013
 * Changed ..... 2026-06-05 (d925b9e)
 */
export function benchmarkTicker(of?: string | Pick<Position, 'kind' | 'asset_class' | 'class_source'>): string | null {
  const h = typeof of === 'string' || of == null ? { kind: of ?? undefined } as Pick<Position, 'kind' | 'asset_class' | 'class_source'> : of;
  const kind = h.kind || undefined;
  // THE PERSON'S CLASS DECIDES (tenet 5, DEC-3523; DEC-0309 a class they set is kept): a holding they called a
  // bond is set beside the bond market, whatever kind it was first given. A class with no kind beside it
  // decides too. (outside review Claude Performance, 2026-10-11)
  const byClass = h.asset_class === 'bond' ? 'AGG' : h.asset_class === 'stock_etf' ? 'SPY' : null;
  if (byClass && (h.class_source === 'user' || !kind || !BENCHMARK_TICKER[kind])) return byClass;
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
  /** WHAT THE HOLDING WAS WORTH WHEN ITS WINDOW FIGURE BEGAN (2026-10-21; DEC-5068, tenet 4): the shares it holds × the
   *  close its window figure is measured from × its multiplier — for a holding bought inside the window, the value its
   *  return since its purchases is measured from. Its value today ÷ (1 + its window total) is this same figure whenever
   *  it is worth more than $0; worth $0 today, this is the only way to read it, so the readers that work a window back
   *  count what it lost instead of leaving it out. A known $0 is $0. Null where that close or share count is unknown. */
  startValue?: number | null;
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
 *     series = price of(ticker)
 *     price = latest close(series)
 *     lot date = earliest purchase date(p)
 *     bought = lot date (or purchase date of.(p) (or nothing when missing) when missing)
 *     capped = bought ≠ nothing and period start ≠ nothing and (given and lot date = nothing ? bought > period start : bought ≥ period start)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-091 pricedGainOf · MK-NW-O-008 thePerformance
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-091 pricedGainOf
 *               MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-005 holding price
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-024 logged expenses
 *
 * Decides .....
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
  return (positions ?? []).map((p) => {
    const series = priceOf(p.ticker);
    const price = latestClose(series);
    const lotDate = earliestPurchaseDate(p);
    const bought = lotDate ?? purchaseDateOf?.(p) ?? null;
    // A PURCHASE ON THE PERIOD'S FIRST DAY IS INSIDE IT (DEC-0315, Q3: both boundary days are inside, and the
    // beginning is the close of the day before, when this money was not yet held) — it read '>' (outside
    // review Claude Performance, 2026-10-11)
    // For "Since" (a window handed over), a stand-in date the caller supplies for a holding with no dated purchase is
    // the record's own first day — the holding is part of the beginning value, not bought inside the window — so only a
    // stand-in AFTER the first day caps it.
    const capped = bought != null && periodStart != null && (given && lotDate == null ? bought > periodStart : bought >= periodStart);
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
    const pts = series?.points ?? [];
    const firstISO = pts.length ? pts[0].date : null;
    const short = !capped && firstISO != null && opens != null && new Date(firstISO).getTime() > dayBefore(opens).getTime();
    const benchSameDays = short && benchTicker != null ? periodReturnSince(benchSeries, firstISO!, now) : null;
    const spanYears = short ? (new Date(pts[pts.length - 1].date).getTime() - new Date(firstISO!).getTime()) / (365.25 * 86_400_000) : 1;
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
    const startValue = priceTotal == null ? null
      : capped ? (pieces && pieces.growth > 0 ? marketValue(p, pieces.after / (pieces.growth * pieces.held)) : null)
      : valueAtClose(p, series, given ? beginISO! : dayBefore(opens!));
    // worth $0 today, its interest is counted on that start (returnWithInterest, 2026-10-21)
    const prTotal = returnWithInterest(priceTotal, mv, interest, startValue);
    // over a window longer than a year the figure shown is a yearly rate over the span the prices cover (MK-PF-F-039)
    // (periodReturn's own rule, applied to the total with its interest; a purchase cap or a handed-over first day is
    // never made yearly)
    const parts = !capped && !given ? periodReturnParts(series, period, now) : null;
    const pr = parts && parts.years > 1 && prTotal != null ? Math.pow(1 + prTotal, 1 / parts.years) - 1 : prTotal;
    return {
      position: p, price,
      // what was paid and the gain over the purchases whose price paid is on record — the holding page's Total paid (2026-10-20)
      marketValue: mv, costBasis: paidOnRecord(p).paid, gain: unrealizedGain(p, price),
      totalROI: totalROI(p, price), periodReturn: pr, periodTotal: prTotal,
      benchTicker, benchReturn, benchTotal,
      beatBy: pr != null && benchReturn != null ? ((pr - benchReturn)) : null,
      cappedSince: capped ? bought : null,
      interest, startValue,
    };
  });
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
 * Reaches ..... 11 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-PF-F-048 bondInterestInWindow
 *               MK-PF-F-014 buildPerformance · MK-NW-F-143 gainRowBetween
 *               MK-XS-F-102 ingestSync · MK-NW-F-091 pricedGainOf
 *               MK-NW-O-008 thePerformance
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
/* ─ MK-PF-F-048 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
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
 * Reaches ..... 9 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-PF-F-014 buildPerformance
 *               MK-NW-F-143 gainRowBetween · MK-NW-F-091 pricedGainOf
 *               MK-NW-O-008 thePerformance
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
/* ─ MK-PF-F-049 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * returnWithInterest
 *
 * Answers ..... A RETURN WITH THE INTEREST PAID ADDED (DEC-6212): (1 + the price return) × (1 + interest ÷ value today) − 1.
 *
 * Formula .....
 *     interest ÷ start − 1   when price total ≠ nothing and interest and value now = 0 and start ≠ nothing and start > 0
 *     price total   when price total = nothing (or interest is missing (or value now = nothing (or not (value now > 0) when missing or zero) when missing or zero) when missing or zero)
 *     (1 + price total) × (1 + interest ÷ value now) − 1
 *
 * Called by ... MK-NW-F-143 gainRowBetween · MK-PF-F-014 buildPerformance
 *
 * Reaches ..... 9 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-PF-F-014 buildPerformance
 *               MK-NW-F-143 gainRowBetween · MK-NW-F-091 pricedGainOf
 *               MK-NW-O-008 thePerformance
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
 * Called by ... MK-NW-F-127 gainOfRow · MK-NW-F-138 knownHoldingsReturn
 *               MK-NW-F-142 classReturnOf · MK-PF-F-044 startValues
 *
 * Reaches ..... 17 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-NW-F-084 categoryEarnings · MK-NW-F-142 classReturnOf
 *               MK-NW-F-127 gainOfRow · MK-NW-F-138 knownHoldingsReturn
 *               MK-NW-F-130 notIncludedSentence · MK-PF-F-020 portfolioBenchReturn
 *               MK-NW-F-091 pricedGainOf · MK-PF-F-044 startValues
 *               MK-NW-O-008 thePerformance
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
 *  The purchases are grouped by day, oldest first; an undated purchase counts from the first day. The first
 *  piece starts at what was paid; at each later purchase the piece ends at the shares then held × that day's
 *  close, and the next starts there plus what was paid; the last ends at today's value. Unknown when a share
 *  count or a cost is missing, or a purchase day has no close on or before it — never a guess (tenet 3). */
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
 * Called by ... MK-PF-F-014 buildPerformance
 *
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-PF-F-014 buildPerformance
 *               MK-NW-F-091 pricedGainOf · MK-NW-O-008 thePerformance
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
 *     by day = new map<string, { shares: number; paid: number }>()
 *     sh = shares as number | nothing | undefined, c = cost per share as number | nothing | undefined
 *     nothing   when sh = nothing (or !number.is finite(sh) (or sh > 0 and !lot cost on record(l) when missing or zero) when missing or zero)
 *     d = purchase date on record(purchase date) (or first day when missing)
 *     g = by day.get(d) (or shares = 0
 *     paid = 0 when missing)
 *     days = [...by day.keys()], in order
 *     nothing   when count of days is missing
 *     held = 0, after = 0, growth = 1
 *     g = by day.get(d)!
 *     close = close on or before(series, d)
 *     nothing   when close = nothing (or not (after > 0) when missing or zero)
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-PF-F-014 buildPerformance · MK-PF-F-040 returnSincePurchases
 *
 * Reaches ..... 9 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-PF-F-014 buildPerformance
 *               MK-NW-F-091 pricedGainOf · MK-PF-F-040 returnSincePurchases
 *               MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-007 purchase price and date (per lot)
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-056
 * Changed ..... not in git yet (—)
 */
function purchasePieces(p: Position, series: PriceSeries | null | undefined, firstDay: string): { held: number; after: number; growth: number } | null {
  const byDay = new Map<string, { shares: number; paid: number }>();
  for (const l of p.lots ?? []) {
    const sh = l?.shares as number | null | undefined, c = l?.cost_per_share as number | null | undefined;
    // a cost is read ONE way (lotCostOnRecord, 2026-10-21): a stored $0 is not on record, as a missing one is — it was a
    // purchase that cost nothing, so its piece began at $0
    if (sh == null || !Number.isFinite(sh) || (sh > 0 && !lotCostOnRecord(l))) return null;
    if (!(sh > 0)) continue;
    // the one reading of a purchase date (purchaseDateOnRecord, 2026-10-21): a day that does not exist (31 February) is not on
    // record, as a missing one is — it was read by its shape and priced at a close that is not that day's
    const d = purchaseDateOnRecord(l.purchase_date) ?? firstDay;
    const g = byDay.get(d) ?? { shares: 0, paid: 0 };
    g.shares += sh; g.paid += sh * (c as number);   // on record: checked above
    byDay.set(d, g);
  }
  const days = [...byDay.keys()].sort();
  if (!days.length) return null;
  let held = 0, after = 0, growth = 1;
  for (const d of days) {
    const g = byDay.get(d)!;
    if (held > 0) {
      const close = closeOnOrBefore(series, d);
      if (close == null || !(after > 0)) return null;
      growth *= (held * close) / after;   // the piece ends just before this purchase
      after = held * close + g.paid;      // the next starts with this purchase added
    } else {
      after = g.paid;
    }
    held += g.shares;
  }
  if (!(after > 0)) return null;
  return { held, after, growth };
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
 * Called by ... MK-PF-F-014 buildPerformance
 *
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-PF-F-014 buildPerformance
 *               MK-NW-F-091 pricedGainOf · MK-NW-O-008 thePerformance
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
 *     vals = for each of rows: market value as number
 *     invested = Σ over vals of (each)
 *     nothing   when invested ≤ 0 (or rows.length < 2 when missing or zero)
 *     at = 0
 *     top = rows[at], top value = vals[at]
 *     share = (top value ÷ invested) × 100
 *     the answer:
 *     ticker = top.position.ticker
 *     pct = round(share)
 *     value = top value   if share ≥ 25
 *     nothing   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses a built-in at of 0.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-015
 * Changed ..... 2026-07-29 (13c9be6)
 */
export function topHoldingConcentration(rows: PerformanceRow[]): { ticker: string; pct: number; value: number } | null {
  // a holding worth something unknown (shares, no price) makes every share of the whole unknown — no fact to state (tenet 3)
  if (rows.some((r) => r.marketValue == null)) return null;
  const vals = rows.map((r) => r.marketValue as number);
  const invested = vals.reduce((t, v) => t + v, 0);
  if (invested <= 0 || rows.length < 2) return null;
  let at = 0;
  vals.forEach((v, i) => { if (v > vals[at]) at = i; });
  const top = rows[at], topValue = vals[at];
  const share = (topValue / invested) * 100;
  // THE 25% LINE IS TESTED ON THE UNROUNDED SHARE, and the value is not rounded (DEC-0300: nothing rounds inside a
  // calculation): 24.6% is under the line, it read 25 and was reported (outside review Claude Performance,
  // 2026-10-11). `pct` stays the whole percent the card states it returns — the figure as shown.
  return share >= 25 ? { ticker: top.position.ticker, pct: Math.round(share), value: topValue } : null;
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
 * Reaches ..... 16 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-NW-F-084 categoryEarnings · MK-NW-F-127 gainOfRow
 *               MK-NW-F-138 knownHoldingsReturn · MK-NW-F-130 notIncludedSentence
 *               MK-PF-F-020 portfolioBenchReturn · MK-NW-F-091 pricedGainOf
 *               MK-NW-O-008 thePerformance · MK-PF-F-043 windowTotalOfRow
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
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-PF-F-020 portfolioBenchReturn
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
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-PF-F-020 portfolioBenchReturn
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
    // a bond's window total holds its interest, so its start is its value today plus that interest ÷ (1 + total) (DEC-6212)
    out.push({ row: r, ret, start: worthWithInterest(r) / (1 + ret) });
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
 *     total = Σ over usable of (start)
 *     nothing   when total ≤ 0
 *     the answer = Σ over usable of ((bench as number) × start)÷ total
 *
 * Called by ... MK-NW-F-088 BENCH
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH
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
  const usable = startValues(rows, windowTotalOfRow)
    .map((u) => ({ ...u, bench: windowTotal(u.row.benchReturn, u.row.benchTotal) }))
    .filter((u) => u.bench != null);
  const total = usable.reduce((t, u) => t + u.start, 0);
  if (total <= 0) return null;
  return usable.reduce((t, u) => t + (u.bench as number) * u.start, 0) / total;
}

