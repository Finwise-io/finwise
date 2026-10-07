// Portfolio Performance Analysis — pure core.
// A holding is a ticker + one or more cost-basis LOTS (shares bought at a price on a date).
// Market value, unrealized gain, total ROI, and period returns all derive from lots + live price.
// Price data comes from a swappable PriceProvider (see services/marketData.ts) so the model and UI
// never need rework if we change data source later.
import type { EntityId } from '../_shared/ids';

/** One purchase lot — shares bought at a price on a date (enables true cost-basis ROI). */
export interface Lot {
  lot_id: EntityId;
  shares: number;
  cost_per_share: number;       // purchase price per share, in account currency
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
  last_price?: number;          // broker's daily mark (connected accounts — no live feed needed)
  multiplier?: number;          // Q06 (founder, 2026-08-26): an option contract is 100 shares unless the broker or the person states otherwise
  unit?: QuantityUnit;          // Q09 (founder, 2026-08-26): a quantity is never shown without its unit
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
 *     multiplier   when multiplier ≠ nothing and multiplier > 0
 *     OPTION_CONTRACT_MULTIPLIER   if kind = 'options'
 *     1   otherwise
 *
 * Called by ... MK-NW-O-006 theHolding · MK-PF-F-002 costBasis
 *               MK-PF-F-003 avgCost · MK-PF-F-004 marketValue
 *               MK-PF-F-006 capGains
 *
 * Reaches ..... 73 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-088 BENCH
 *               MK-NW-F-080 HOLD · MK-NW-F-082 NW
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-NW-F-040 assetsFromOnboarding · MK-PF-F-016 attribution
 *               MK-PF-F-003 avgCost · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PF-F-014 buildPerformance
 *               MK-PL-F-053 buildRetirementState · MK-XS-F-031 buildSnapshot
 *               … and 55 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-031
 * Changed ..... not in git yet (—)
 */
export function contractMultiplier(p: Pick<Position, 'kind' | 'multiplier'>): number {
  if (p.multiplier != null && p.multiplier > 0) return p.multiplier;
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
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-PF-F-033 quantityWithUnit
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
 *     unit = quantity unit(p)
 *     the answer = `${format(qty)} ${qty = 1 ? unit.replace( ÷ s$ ÷ , '') : unit}`
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-005 holding price
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-033
 * Changed ..... not in git yet (—)
 */
export function quantityWithUnit(p: Pick<Position, 'kind' | 'unit'>, qty: number, format: (n: number) => string = String): string {
  const unit = quantityUnit(p);
  return `${format(qty)} ${qty === 1 ? unit.replace(/s$/, '') : unit}`;
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
 * Called by ... MK-CF-F-111 applyTransaction · MK-NW-O-006 theHolding
 *               MK-PF-F-003 avgCost · MK-PF-F-004 marketValue
 *               MK-PF-F-018 portfolioTrend
 *
 * Reaches ..... 73 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-088 BENCH
 *               MK-NW-F-080 HOLD · MK-NW-F-082 NW
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-CF-F-111 applyTransaction · MK-NW-F-040 assetsFromOnboarding
 *               MK-PF-F-016 attribution · MK-PF-F-003 avgCost
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PF-F-014 buildPerformance · MK-PL-F-053 buildRetirementState
 *               … and 55 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Decides .....
 *     · If shares is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-001
 * Changed ..... 2026-06-05 (d925b9e)
 */
export function totalShares(p: Position): number {
  return (p.lots ?? []).reduce((t, l) => t + (l.shares || 0), 0);
}
/* ─ MK-PF-F-002 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * costBasis
 *
 * Answers ..... What did I pay for this in total?
 *
 * Formula .....
 *     cost basis(holding) = Σ over every lot of (shares × cost per share)
 *
 * Called by ... MK-NW-O-006 theHolding · MK-PF-F-003 avgCost
 *               MK-PF-F-005 unrealizedGain · MK-PF-F-007 totalROI
 *               MK-PF-F-014 buildPerformance · MK-PL-F-081 taxableGainShare
 *               MK-XS-F-174 recomputeBalances
 *
 * Reaches ..... 64 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-080 HOLD · MK-NW-F-082 NW
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-NW-F-040 assetsFromOnboarding · MK-PF-F-003 avgCost
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PF-F-014 buildPerformance · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               … and 46 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Decides .....
 *     · If shares is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If cost per share is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-002
 * Changed ..... 2026-06-05 (d925b9e)
 */
export function costBasis(p: Position): number {
  return ((p.lots ?? []).reduce((t, l) => t + (l.shares || 0) * (l.cost_per_share || 0), 0) * contractMultiplier(p));
}

/** The average price paid per share of a holding: its total cost divided by the shares held, or zero when no shares are held. */
/* ─ MK-PF-F-003 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * avgCost
 *
 * Answers ..... The average price paid per share of a holding: its total cost divided by the shares held, or zero when no shares are held.
 *
 * Formula .....
 *     sh = total shares(p)
 *     the answer:
 *     cost basis(p) ÷ (sh × contract multiplier(p))   if sh > 0
 *     0   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... MK-NW-M-032
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 * Ruled by .... DEC-0264 · DEC-0310
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-003
 * Changed ..... 2026-06-05 (d925b9e)
 */
export function avgCost(p: Position): number {
  const sh = totalShares(p);
  // per share, the unit a price is quoted in: the cost carries an option's contract multiplier, so it comes back out here
  return sh > 0 ? (costBasis(p) / (sh * contractMultiplier(p))) : 0;
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
 * Called by ... MK-NW-F-075 ACC · MK-NW-O-006 theHolding
 *               MK-PF-F-005 unrealizedGain · MK-PF-F-014 buildPerformance
 *               MK-PF-F-015 topHoldingConcentration · MK-PF-F-016 attribution
 *               MK-PF-F-019 portfolioPeriodReturn · MK-PF-F-020 portfolioBenchReturn
 *               MK-PL-F-081 taxableGainShare · MK-XS-F-174 recomputeBalances
 *
 * Reaches ..... 69 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-088 BENCH
 *               MK-NW-F-080 HOLD · MK-NW-F-082 NW
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-NW-F-040 assetsFromOnboarding · MK-PF-F-016 attribution
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PF-F-014 buildPerformance · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               … and 51 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-004
 * Changed ..... 2026-08-20 (77eea92)
 */
export function marketValue(p: Position, price: number | null | undefined): number {
  return price == null ? 0 : (totalShares(p) * price * contractMultiplier(p));
}
/** Unrealized gain = market value − cost basis (null price → 0). */
/* ─ MK-PF-F-005 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * unrealizedGain
 *
 * Answers ..... Unrealized gain = market value − cost basis (null price → 0).
 *
 * Formula .....
 *     0   if price = nothing
 *     market value(p, price) − cost basis(p)   otherwise
 *
 * Called by ... MK-PF-F-007 totalROI · MK-PF-F-014 buildPerformance
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-PF-F-014 buildPerformance · MK-PF-F-007 totalROI
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-007 purchase price and date (per lot)
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-005
 * Changed ..... 2026-08-20 (77eea92)
 */
export function unrealizedGain(p: Position, price: number | null | undefined): number {
  return price == null ? 0 : (marketValue(p, price) - costBasis(p));
}
/** Unrealized capital gains split by holding period — long-term (held MORE than one year, the
 *  IRS line, day-precise) vs short-term. Computed per lot from its purchase date; lots without a
 *  cost basis are skipped.
 *  E7 (founder brief 2026-08-20): the old rule counted CALENDAR MONTHS — bought Jan 31, sold
 *  Jan 1 was 335 days yet read as long-term, always erring toward the LOWER tax. Day-precise now:
 *  long-term begins the day AFTER the one-year anniversary; exactly one year is still short.
 *  An unparseable purchase date stays SHORT-term — the cautious side (understating a tax bill is
 *  the worse mistake). */
export interface CapGains { longGain: number; shortGain: number; totalGain: number; }
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
  if (price == null) return { longGain: 0, shortGain: 0, totalGain: 0 };
  let lg = 0, sg = 0;
  for (const lot of (p.lots ?? [])) {
    if (!(lot.cost_per_share > 0) || !(lot.shares > 0)) continue;
    // × the contract multiplier, as cost and value are (Q06): an option's long/short split was 100 times
    // too small, so its two parts did not add up to the gain above them (outside review, 2026-10-04)
    const gain = lot.shares * (price - lot.cost_per_share) * contractMultiplier(p);
    const bought = new Date(lot.purchase_date);
    let longTerm = false;
    if (!isNaN(bought.getTime())) {
      // compare CALENDAR DAYS, not instants — a date-only string parses as UTC while `now` is
      // local, and mixing the two moved the line by a timezone's worth of hours
      const anniversary = new Date(bought);
      anniversary.setUTCFullYear(anniversary.getUTCFullYear() + 1);
      // bought on 29 February: the next year has no such day, and the date rolled to 1 March, which
      // put the line one day late. The anniversary is the last day of February (Gemini, 2026-10-05).
      if (anniversary.getUTCMonth() !== bought.getUTCMonth()) anniversary.setUTCDate(0);
      const annKey = anniversary.toISOString().slice(0, 10);
      const p2 = (n: number) => String(n).padStart(2, '0');
      const nowKey = `${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())}`;
      longTerm = nowKey > annKey;
    }
    if (longTerm) lg += gain; else sg += gain;
  }
  return { longGain: (lg), shortGain: (sg), totalGain: (lg + sg) };
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
 *     basis = cost basis(p)
 *     nothing   when price = nothing (or basis ≤ 0 when missing or zero)
 *     the answer = unrealized gain(p, price) ÷ basis
 *
 * Called by ... MK-PF-F-014 buildPerformance
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-PF-F-014 buildPerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-007 purchase price and date (per lot)
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-007
 * Changed ..... 2026-08-01 (84a3ba5)
 */
export function totalROI(p: Position, price: number | null | undefined): number | null {
  const basis = costBasis(p);
  if (price == null || basis <= 0) return null;
  return ((unrealizedGain(p, price) / basis));
}

// ---- period returns from a price series (price return of the security itself) ----

/** The date a period starts from, counted back from today: one, three or six months, the start of this year, one year or two years. */
/* ─ MK-PF-F-008 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * startDateFor
 *
 * Answers ..... The date a period starts from, counted back from today: one, three or six months, the start of this year, one year or two years.
 *
 * Formula .....
 *     d = the date now
 *     the answer = d
 *
 * Called by ... MK-PF-F-010 periodReturn · MK-PF-F-014 buildPerformance
 *               MK-PF-F-018 portfolioTrend
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-PF-F-014 buildPerformance · MK-PF-F-021 periodDollarDelta
 *               MK-PF-F-010 periodReturn · MK-PF-F-018 portfolioTrend
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-008
 * Changed ..... 2026-08-18 (98a342a)
 */
export function startDateFor(period: Period, now: Date): Date {
  const d = new Date(now);
  switch (period) {
    case '1M': d.setMonth(d.getMonth() - 1); break;
    case '3M': d.setMonth(d.getMonth() - 3); break;
    case '6M': d.setMonth(d.getMonth() - 6); break;
    case '1Y': d.setFullYear(d.getFullYear() - 1); break;
    case '2Y': d.setFullYear(d.getFullYear() - 2); break;
    case 'YTD': return new Date(now.getFullYear(), 0, 1);
  }
  return d;
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
 * Called by ... MK-PF-F-010 periodReturn · MK-PF-F-011 periodReturnSince
 *               MK-PF-F-018 portfolioTrend
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-PF-F-014 buildPerformance · MK-PF-F-021 periodDollarDelta
 *               MK-PF-F-010 periodReturn · MK-PF-F-011 periodReturnSince
 *               MK-PF-F-018 portfolioTrend
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
 *     the answer = chosen
 *
 * Called by ... MK-XS-F-175 uid
 *
 * Reaches ..... 57 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PL-F-053 buildRetirementState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-038 debtsFromOnboarding · MK-XS-F-072 deleteAccount
 *               MK-XS-F-138 deriveKeyFromSecret · MK-NW-F-044 getAssetsState
 *               MK-CF-F-041 getDebtState · MK-CF-F-052 getIncomeState
 *               … and 39 more — the full list is on functions_from_code
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
  let chosen: number | null = null;
  for (const p of pts) { if (String(p.date).slice(0, 10) <= isoDate) chosen = p.close; else break; }
  return chosen;
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
 * Called by ... MK-PF-F-010 periodReturn · MK-PF-F-011 periodReturnSince
 *               MK-PF-F-014 buildPerformance · MK-XS-F-174 recomputeBalances
 *
 * Reaches ..... 61 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PF-F-014 buildPerformance · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-NW-F-044 getAssetsState · MK-CF-F-041 getDebtState
 *               … and 43 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-005 holding price
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-009
 * Changed ..... 2026-06-05 (d925b9e)
 */
export function latestClose(series: PriceSeries | null | undefined): number | null {
  const pts = series?.points ?? [];
  return pts.length ? pts[pts.length - 1].close : null;
}
/** Price return of a ticker over a period (decimal). null if insufficient data. */
/* ─ MK-PF-F-010 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * periodReturn
 *
 * Answers ..... Price return of a ticker over a period (decimal).
 *
 * Formula .....
 *     nothing   when series is missing (or not (count of series.points) when missing or zero)
 *     end = latest close(series)
 *     start = close as of(series, start date for(period, now))
 *     nothing   when end = nothing (or start = nothing (or start ≤ 0 when missing or zero) when missing or zero)
 *     raw = end ÷ start − 1
 *     first = the date series.points[0].date), last = new date(series.points[series.points.length − 1].date
 *     reaches = first.get time() ≤ start date for(period, now).get time()
 *     years = 2   if reaches
 *     (last.get time() − first.get time()) ÷ (365.25 × 86400000)   otherwise
 *     the answer:
 *     (end ÷ start)^(1 ÷ years) − 1   if years > 1
 *     raw   otherwise
 *
 * Called by ... MK-PF-F-014 buildPerformance · MK-PF-F-021 periodDollarDelta
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-PF-F-014 buildPerformance · MK-PF-F-021 periodDollarDelta
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-005 holding price
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-010
 * Changed ..... 2026-08-18 (98a342a)
 */
export function periodReturn(series: PriceSeries | null | undefined, period: Period, now = new Date()): number | null {
  if (!series || !(series.points?.length)) return null;
  const end = latestClose(series);
  const start = closeAsOf(series, startDateFor(period, now));
  if (end == null || start == null || start <= 0) return null;
  // annualize multi-year so 3Y is comparable to 1Y
  const raw = end / start - 1;
  // FOUNDER DECISION 2026-08-18: two years is the longest window offered, because two years is
  // exactly how much daily history the app keeps. Offering three would draw a line from a date
  // we have no record of. Multi-year returns are still shown per year, so 2Y sits fairly beside 1Y.
  if (period === '2Y') {
    // WHEN THE PRICES DO NOT REACH BACK TWO YEARS the start is the first price on record, and the
    // figure covers only that span. It was still turned into a yearly rate as though it covered two
    // years — fourteen months of a holding that rose 21% read as +10% a year instead of +17.8%
    // (found 2026-10-04 holding the Holding page to its drawing, which says the window out loud).
    // The yearly rate is over the span the prices do cover; a span of a year or less is never made
    // yearly (founder ruling 2026-09-25).
    const first = new Date(series.points[0].date), last = new Date(series.points[series.points.length - 1].date);
    const reaches = first.getTime() <= startDateFor(period, now).getTime();
    const years = reaches ? 2 : (last.getTime() - first.getTime()) / (365.25 * 86_400_000);
    return years > 1 ? Math.pow(end / start, 1 / years) - 1 : raw;
  }
  return (raw);
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
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-PF-F-014 buildPerformance
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

/** Earliest dated lot — the day this holding became YOUR money. null when no lot carries a date. */
/* ─ MK-PF-F-012 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * earliestPurchaseDate
 *
 * Answers ..... Earliest dated lot — the day this holding became YOUR money.
 *
 * Formula .....
 *     dates = for each of lots (or none when missing): purchase date where ÷ ^\each{4}-\each{2}-\each{2} ÷ .test(each ?? '')
 *     the answer:
 *     the first 10 of dates.sort()[0]!   if count of dates
 *     nothing   otherwise
 *
 * Called by ... MK-PF-F-014 buildPerformance
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-PF-F-014 buildPerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-007 purchase price and date (per lot)
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-012
 * Changed ..... 2026-07-20 (8f9b9f1)
 */
export function earliestPurchaseDate(p: Position): string | null {
  const dates = (p.lots ?? []).map((l) => l.purchase_date).filter((d) => /^\d{4}-\d{2}-\d{2}/.test(d ?? ''));
  return dates.length ? dates.sort()[0]!.slice(0, 10) : null;
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
 *     BENCHMARK_TICKER[kind ?? ''] (or 'SPY' when missing)
 *
 * Called by ... MK-PF-F-014 buildPerformance · MK-XS-F-175 uid
 *
 * Reaches ..... 58 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PF-F-014 buildPerformance · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-NW-F-044 getAssetsState · MK-CF-F-041 getDebtState
 *               … and 40 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-013
 * Changed ..... 2026-06-05 (d925b9e)
 */
export function benchmarkTicker(kind?: string): string {
  return BENCHMARK_TICKER[kind ?? ''] ?? 'SPY';
}

/** One row of the per-holding performance table. */
export interface PerformanceRow {
  position: Position;
  price: number | null;
  marketValue: number;
  costBasis: number;
  gain: number;
  totalROI: number | null;        // since purchase
  periodReturn: number | null;    // YOUR return over the window (capped at purchase — see cappedSince)
  benchTicker: string;
  benchReturn: number | null;     // benchmark over the SAME dates — honest comparison
  beatBy: number | null;          // periodReturn − benchReturn
  cappedSince: string | null;     // 'YYYY-MM-DD' when the window starts at YOUR purchase, else null
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
 *     period start = the first 10 of start date for(period, now).to isostring()
 *     series = price of(ticker)
 *     price = latest close(series)
 *     bought = earliest purchase date(p) (or purchase date of.(p) (or nothing when missing) when missing)
 *     capped = bought ≠ nothing and bought > period start
 *     pr = total roi(p, price)   if capped
 *     period return(series, period, now)   otherwise
 *     bench ticker = benchmark ticker(kind)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-005 holding price
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
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
): PerformanceRow[] {
  const periodStart = startDateFor(period, now).toISOString().slice(0, 10);
  return (positions ?? []).map((p) => {
    const series = priceOf(p.ticker);
    const price = latestClose(series);
    const bought = earliestPurchaseDate(p) ?? purchaseDateOf?.(p) ?? null;
    const capped = bought != null && bought > periodStart;
    const pr = capped ? totalROI(p, price) : periodReturn(series, period, now);
    const benchTicker = benchmarkTicker(p.kind);
    const benchReturn = capped
      ? periodReturnSince(priceOf(benchTicker), bought!, now)
      : periodReturn(priceOf(benchTicker), period, now);
    return {
      position: p, price,
      marketValue: marketValue(p, price), costBasis: costBasis(p), gain: unrealizedGain(p, price),
      totalROI: totalROI(p, price), periodReturn: pr,
      benchTicker, benchReturn,
      beatBy: pr != null && benchReturn != null ? ((pr - benchReturn)) : null,
      cappedSince: capped ? bought : null,
    };
  });
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
 *     invested = Σ over rows of (market value)
 *     nothing   when invested ≤ 0 (or rows.length < 2 when missing or zero)
 *     top = rows.reduce((m, r) => (market value > market value ? r : m), rows[0])
 *     pct = round((top.market value ÷ invested) × 100)
 *     the answer:
 *     ticker = top.position.ticker
 *     pct = pct
 *     value = round(top.market value)   if pct ≥ 25
 *     nothing   otherwise
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
  const invested = rows.reduce((t, r) => t + r.marketValue, 0);
  if (invested <= 0 || rows.length < 2) return null;
  const top = rows.reduce((m, r) => (r.marketValue > m.marketValue ? r : m), rows[0]);
  const pct = Math.round((top.marketValue / invested) * 100);
  return pct >= 25 ? { ticker: top.position.ticker, pct, value: Math.round(top.marketValue) } : null;
}

/** Per-holding contribution to the portfolio's period return = weight × the holding's return (pts).
 *  The contributions sum (approx) to the portfolio return; sorted best→worst for winners/detractors. */
/* ─ MK-PF-F-016 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * attribution
 *
 * Answers ..... Per-holding contribution to the portfolio's period return = weight × the holding's return (pts).
 *
 * Formula .....
 *     total = Σ over rows of (market value)
 *     []   when total ≤ 0
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-016
 * Changed ..... 2026-06-06 (780f80d)
 */
export function attribution(rows: PerformanceRow[]): { position: Position; contribution: number; weight: number }[] {
  const total = rows.reduce((t, r) => t + r.marketValue, 0);
  if (total <= 0) return [];
  return rows
    .filter((r) => r.periodReturn != null && r.marketValue > 0)
    .map((r) => ({ position: r.position, weight: r.marketValue / total, contribution: ((r.marketValue / total) * (r.periodReturn as number)) }))
    .sort((a, b) => b.contribution - a.contribution);
}

/** Current allocation by asset kind (+ a cash slice), as value + % of the portfolio. */
export interface AllocSlice { key: string; value: number; pct: number; }
/* ─ MK-PF-F-017 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * allocation
 *
 * Answers ..... How is my invested money spread?
 *
 * Formula .....
 *     by kind = {}
 *     total = Σ over object.values(by kind) of (each)+ max(0, cash)
 *     []   when total ≤ 0
 *     slices = for each of object.entries(by kind): [key, v]) => ({ key, value: (v), pct: math.round((v ÷ total) × 1000) ÷ 10 }
 *     the answer = slices.sort((a, b) => value − value)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-049 bond price — what the bond is worth today
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · If by kind[k] is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · Never lets cash fall below 0.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-017
 * Changed ..... 2026-06-06 (91a665e)
 */
export function allocation(rows: PerformanceRow[], cash = 0): AllocSlice[] {
  const byKind: Record<string, number> = {};
  rows.forEach((r) => { const k = r.position.kind ?? 'other_asset'; byKind[k] = (byKind[k] || 0) + r.marketValue; });
  const total = Object.values(byKind).reduce((t, v) => t + v, 0) + Math.max(0, cash);
  if (total <= 0) return [];
  const slices: AllocSlice[] = Object.entries(byKind).map(([key, v]) => ({ key, value: (v), pct: Math.round((v / total) * 1000) / 10 }));
  if (cash > 0) slices.push({ key: 'cash', value: (cash), pct: Math.round((cash / total) * 1000) / 10 });
  return slices.sort((a, b) => b.value - a.value);
}

/** Portfolio value over time vs a benchmark rebased to the same starting value.
 *  Uses CURRENT holdings across the window (growth-of-holdings view; ignores past buys/sells). */
export interface TrendPoint { date: string; value: number; bench: number; }
/* ─ MK-PF-F-018 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * portfolioTrend
 *
 * Answers ..... How has my portfolio moved over the period, against its benchmark?
 *
 * Formula .....
 *     []   when count of !positions?
 *     start = start date for(period, now)
 *     span = now.get time() − start.get time()
 *     []   when span ≤ 0
 *     n = 12
 *     dates = array.from({ length: N + 1 }, (_, i) => new date(start.get time() + (span × i) ÷ N))
 *     bench series = price of(bench ticker sym)
 *     value at = (d: date) => positions.reduce((t, p) => { const c = close as of(price of(ticker), d); return t + (c = nothing ? 0 : total shares(p) × c); }, 0)
 *     v0 = value at(dates[0])
 *     b0 = close as of(bench series, dates[0])
 *     value = value at(d)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *
 * Decides .....
 *     · Uses a built-in n of 12.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-018
 * Changed ..... 2026-06-06 (91a665e)
 */
export function portfolioTrend(
  positions: Position[],
  priceOf: (t: string) => PriceSeries | null | undefined,
  period: Period,
  benchTickerSym = 'SPY',
  now = new Date(),
): TrendPoint[] {
  if (!positions?.length) return [];
  const start = startDateFor(period, now);
  const span = now.getTime() - start.getTime();
  if (span <= 0) return [];
  const N = 12;
  const dates = Array.from({ length: N + 1 }, (_, i) => new Date(start.getTime() + (span * i) / N));
  const benchSeries = priceOf(benchTickerSym);
  const valueAt = (d: Date) => positions.reduce((t, p) => { const c = closeAsOf(priceOf(p.ticker), d); return t + (c == null ? 0 : totalShares(p) * c); }, 0);
  const v0 = valueAt(dates[0]);
  const b0 = closeAsOf(benchSeries, dates[0]);
  return dates.map((d) => {
    const value = (valueAt(d));
    const braw = closeAsOf(benchSeries, d);
    const bench = (b0 && braw != null && v0 > 0) ? (v0 * (braw / b0)) : value;
    return { date: d.toISOString().slice(0, 10), value, bench };
  });
}

/** Value-weighted portfolio period return across holdings that have one (decimal), or null. */
/* ─ MK-PF-F-019 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * portfolioPeriodReturn
 *
 * Answers ..... Value-weighted portfolio period return across holdings that have one (decimal), or null.
 *
 * Formula .....
 *     usable = rows where period return ≠ nothing and market value > 0
 *     total = Σ over usable of (market value)
 *     nothing   when total ≤ 0
 *     the answer = Σ over usable of ((period return as number) × market value)÷ total
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Second verification G18, 2026-09-08: this is the value-weighted average of holding returns, not a Dietz return.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-019
 * Changed ..... 2026-07-29 (13c9be6)
 */
export function portfolioPeriodReturn(rows: PerformanceRow[]): number | null {
  const usable = rows.filter((r) => r.periodReturn != null && r.marketValue > 0);
  const total = usable.reduce((t, r) => t + r.marketValue, 0);
  if (total <= 0) return null;
  return ((usable.reduce((t, r) => t + (r.periodReturn as number) * r.marketValue, 0) / total));
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
 *     usable = rows where bench return ≠ nothing and market value > 0
 *     total = Σ over usable of (market value)
 *     nothing   when total ≤ 0
 *     the answer = Σ over usable of ((bench return as number) × market value)÷ total
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
  const usable = rows.filter((r) => r.benchReturn != null && r.marketValue > 0);
  const total = usable.reduce((t, r) => t + r.marketValue, 0);
  if (total <= 0) return null;
  return usable.reduce((t, r) => t + (r.benchReturn as number) * r.marketValue, 0) / total;
}

/** The DOLLAR change implied by a period return on today's total — the approved Home hero shows
 *  "up $11,200 (1.4%) this month": dollars AND percent from the SAME measured return, so the two
 *  figures can never disagree (one concept, one source). currentTotal / (1+ret) is the period-start
 *  value; the delta is what that grew (or shrank) by. */
/* ─ MK-PF-F-021 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * periodDollarDelta
 *
 * Answers ..... The DOLLAR change implied by a period return on today's total — the approved Home hero shows "up $11,200 (1.4%) this month": dollars AND percent from the SAME measured return, so the two figures can never disagree (one concept, one source).
 *
 * Formula .....
 *     0   when !number.is finite(current total) (or !number.is finite(period return) (or period return ≤ -1 when missing or zero) when missing or zero)
 *     round(current total × period return ÷ (1 + period return))
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-021
 * Changed ..... 2026-07-19 (aa0b14c)
 */
export function periodDollarDelta(currentTotal: number, periodReturn: number): number {
  if (!Number.isFinite(currentTotal) || !Number.isFinite(periodReturn) || periodReturn <= -1) return 0;
  return Math.round(currentTotal * periodReturn / (1 + periodReturn));
}
