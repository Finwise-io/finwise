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
  value_now?: number;           // a hand-built holding's value at the price its account balance was last built from (2026-10-07)
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
 * Called by ... MK-NW-F-128 heldValueOf · MK-NW-O-006 theHolding
 *               MK-PF-F-002 costBasis · MK-PF-F-003 avgCost
 *               MK-PF-F-004 marketValue · MK-PF-F-006 capGains
 *               MK-PF-F-028 realizedFromLedger
 *
 * Reaches ..... 78 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-088 BENCH
 *               MK-NW-F-080 HOLD · MK-NW-F-082 NW
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-100 TREND · MK-NW-F-040 assetsFromOnboarding
 *               MK-NW-F-111 assetsStateFrom · MK-PF-F-003 avgCost
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               … and 60 more — the full list is on functions_from_code
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
 *     nothing   when qty = nothing (or !number.is finite(qty) (or qty < 0 when missing or zero) when missing or zero)
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
export function quantityWithUnit(p: Pick<Position, 'kind' | 'unit'>, qty: number | null, format: (n: number) => string = String): string | null {
  // NO "−1 contracts": a quantity below zero (a written, short position) has no words in the app to say so, and a
  // quantity not on record has no number — both refuse rather than print something that reads wrong (tenet 3,
  // DEC-3523; outside review Claude Performance, 2026-10-11)
  if (qty == null || !Number.isFinite(qty) || qty < 0) return null;
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
 * Called by ... MK-CF-F-111 applyTransaction · MK-NW-F-128 heldValueOf
 *               MK-NW-O-006 theHolding · MK-PF-F-003 avgCost
 *               MK-PF-F-004 marketValue · MK-PF-F-018 portfolioTrend
 *
 * Reaches ..... 77 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-088 BENCH
 *               MK-NW-F-080 HOLD · MK-NW-F-082 NW
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-100 TREND · MK-CF-F-111 applyTransaction
 *               MK-NW-F-040 assetsFromOnboarding · MK-NW-F-111 assetsStateFrom
 *               MK-PF-F-003 avgCost · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               … and 59 more — the full list is on functions_from_code
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
/* ─ MK-PF-F-035 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * unknownFigure
 *
 * Answers ..... Whether a purchase's figure was never entered — missing or not a number.
 *
 * Formula .....
 *     v = nothing (or v is not a number (or !number.is finite(v) when missing or zero) when missing or zero)
 *
 * Called by ... MK-PF-F-002 costBasis · MK-PF-F-006 capGains
 *
 * Reaches ..... 72 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-080 HOLD
 *               MK-NW-F-082 NW · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-100 TREND
 *               MK-NW-F-040 assetsFromOnboarding · MK-NW-F-111 assetsStateFrom
 *               MK-PF-F-003 avgCost · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PF-F-014 buildPerformance
 *               … and 54 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-035
 * Changed ..... not in git yet (—)
 */
const unknownFigure = (v: unknown): boolean => v == null || typeof v !== 'number' || !Number.isFinite(v);
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
 * Reaches ..... 70 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-080 HOLD
 *               MK-NW-F-082 NW · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-100 TREND
 *               MK-NW-F-040 assetsFromOnboarding · MK-NW-F-111 assetsStateFrom
 *               MK-PF-F-003 avgCost · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PF-F-014 buildPerformance
 *               … and 52 more — the full list is on functions_from_code
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
    t += l.shares * l.cost_per_share;
  }
  return t * contractMultiplier(p);
}

/** The average price paid per share of a holding: its total cost divided by the shares held, or nothing when no shares are held or a figure is not entered. */
/* ─ MK-PF-F-003 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * avgCost
 *
 * Answers ..... The average price paid per share of a holding: its total cost divided by the shares held, or nothing when no shares are held or a figure is not entered.
 *
 * Formula .....
 *     sh = total shares(p)
 *     basis = cost basis(p)
 *     nothing   when sh = nothing (or not (sh > 0) (or basis = nothing when missing or zero) when missing or zero)
 *     the answer = basis ÷ (sh × contract multiplier(p))
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
export function avgCost(p: Position): number | null {
  const sh = totalShares(p);
  const basis = costBasis(p);
  // with no shares held there is no average price — $0.00 read as "paid nothing"; and an unknown count or cost
  // gives an unknown average (tenet 3, DEC-3523; outside review Claude Performance, 2026-10-11)
  if (sh == null || !(sh > 0) || basis == null) return null;
  // per share, the unit a price is quoted in: the cost carries an option's contract multiplier, so it comes back out here
  return basis / (sh * contractMultiplier(p));
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
 *               MK-PL-F-081 taxableGainShare · MK-XS-F-174 recomputeBalances
 *
 * Reaches ..... 70 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-088 BENCH
 *               MK-NW-F-080 HOLD · MK-NW-F-082 NW
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-100 TREND · MK-NW-F-040 assetsFromOnboarding
 *               MK-NW-F-111 assetsStateFrom · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PF-F-014 buildPerformance
 *               … and 52 more — the full list is on functions_from_code
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
 *     mv = nothing   if price = nothing
 *     market value(p, price)   otherwise
 *     basis = cost basis(p)
 *     the answer:
 *     nothing   if mv = nothing (or basis = nothing when missing or zero)
 *     mv − basis   otherwise
 *
 * Called by ... MK-PF-F-007 totalROI · MK-PF-F-014 buildPerformance
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-PF-F-014 buildPerformance · MK-NW-O-008 thePerformance
 *               MK-PF-F-007 totalROI
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-007 purchase price and date (per lot)
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-005
 * Changed ..... 2026-08-20 (77eea92)
 */
export function unrealizedGain(p: Position, price: number | null | undefined): number | null {
  // with no price the gain is unknown — $0 said "no gain" (tenet 3, DEC-3523; outside review Claude Performance, 2026-10-11)
  const mv = price == null ? null : marketValue(p, price);
  const basis = costBasis(p);
  return mv == null || basis == null ? null : mv - basis;
}
/** Unrealized capital gains split by holding period — long-term (held MORE than one year, the
 *  IRS line, day-precise) vs short-term. Computed per lot from its purchase date; lots without a
 *  cost basis are skipped.
 *  E7 (founder brief 2026-08-20): the old rule counted CALENDAR MONTHS — bought Jan 31, sold
 *  Jan 1 was 335 days yet read as long-term, always erring toward the LOWER tax. Day-precise now:
 *  long-term begins the day AFTER the one-year anniversary; exactly one year is still short.
 *  An unparseable purchase date stays SHORT-term — the cautious side (understating a tax bill is
 *  the worse mistake). */
export interface CapGains { longGain: number | null; shortGain: number | null; totalGain: number | null; }
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
  if (price == null) return { longGain: null, shortGain: null, totalGain: null };
  let lg = 0, sg = 0, lgKnown = true, sgKnown = true;
  for (const lot of (p.lots ?? [])) {
    if (!unknownFigure(lot.shares) && !(lot.shares > 0)) continue;   // no shares held in this lot
    // A LOT WITH NO COST ON RECORD (none, or the 0 a sync writes when the broker sends none) or no share count is
    // not skipped: its part of the split is unknown, and so is the total — its shares used to vanish and the total
    // disagreed with the gain above it (tenet 3; tenet 4) (outside review Claude Performance, 2026-10-11)
    const unknownLot = unknownFigure(lot.shares) || unknownFigure(lot.cost_per_share) || !(lot.cost_per_share > 0);
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
    if (unknownLot) { if (longTerm) lgKnown = false; else sgKnown = false; continue; }
    if (longTerm) lg += gain; else sg += gain;
  }
  const longGain = lgKnown ? lg : null, shortGain = sgKnown ? sg : null;
  return { longGain, shortGain, totalGain: longGain == null || shortGain == null ? null : longGain + shortGain };
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
 *     gain = unrealized gain(p, price)
 *     nothing   when price = nothing (or basis = nothing (or basis ≤ 0 (or gain = nothing when missing or zero) when missing or zero) when missing or zero)
 *     the answer = gain ÷ basis
 *
 * Called by ... MK-PF-F-014 buildPerformance
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-PF-F-014 buildPerformance · MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-007 purchase price and date (per lot)
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-007
 * Changed ..... 2026-08-01 (84a3ba5)
 */
export function totalROI(p: Position, price: number | null | undefined): number | null {
  const basis = costBasis(p);
  const gain = unrealizedGain(p, price);
  if (price == null || basis == null || basis <= 0 || gain == null) return null;
  return gain / basis;
}

// ---- period returns from a price series (price return of the security itself) ----

/** The date a period starts from, counted back from today: one, three or six months, the start of this year, one year or two years. */
/* ─ MK-PF-F-008 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * startDateFor
 *
 * Answers ..... The date a period starts from, counted back from today: one, three or six months, the start of this year, one year or two years.
 *
 * Formula .....
 *     the date now.get full year(), 0, 1   when period = 'YTD'
 *     back = '1 m': 1 = '1 m': 1
 *     '3 m': 3 = '3 m': 3
 *     '6 m': 6 = '6 m': 6
 *     '1 y': 12 = '1 y': 12
 *     '2 y': 24 = '2 y': 24
 *     the date now   when back[period] = nothing
 *     the answer = months before(now, back[period])
 *
 * Called by ... MK-PF-F-014 buildPerformance · MK-PF-F-018 portfolioTrend
 *               MK-PF-F-039 periodReturnParts
 *
 * Reaches ..... 20 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-PF-F-016 attribution · MK-PF-F-014 buildPerformance
 *               MK-NW-F-084 categoryEarnings · MK-NW-F-127 gainOfRow
 *               MK-PF-F-021 periodDollarDelta · MK-PF-F-010 periodReturn
 *               MK-PF-F-039 periodReturnParts · MK-PF-F-038 periodTotalReturn
 *               MK-PF-F-020 portfolioBenchReturn · MK-PF-F-019 portfolioPeriodReturn
 *               MK-PF-F-018 portfolioTrend · MK-NW-F-091 pricedGainOf
 *               … and 2 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-008
 * Changed ..... 2026-08-18 (98a342a)
 */
export function startDateFor(period: Period, now: Date): Date {
  if (period === 'YTD') return new Date(now.getFullYear(), 0, 1);
  const back: Record<string, number> = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12, '2Y': 24 };
  if (back[period] == null) return new Date(now);
  return monthsBefore(now, back[period]);
}

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
 * Called by ... MK-NW-F-090 windowStartKey · MK-PF-F-008 startDateFor
 *               MK-PF-F-022 factorOverMonths
 *
 * Reaches ..... 26 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-081 LB
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-PF-F-016 attribution
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-PF-F-022 factorOverMonths · MK-NW-F-127 gainOfRow
 *               MK-PF-F-023 lookBack · MK-PF-F-021 periodDollarDelta
 *               MK-PF-F-010 periodReturn · MK-PF-F-039 periodReturnParts
 *               MK-PF-F-038 periodTotalReturn · MK-PF-F-020 portfolioBenchReturn
 *               … and 8 more — the full list is on functions_from_code
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
 * Reaches ..... 19 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-PF-F-016 attribution · MK-PF-F-014 buildPerformance
 *               MK-NW-F-084 categoryEarnings · MK-NW-F-127 gainOfRow
 *               MK-PF-F-021 periodDollarDelta · MK-PF-F-010 periodReturn
 *               MK-PF-F-039 periodReturnParts · MK-PF-F-038 periodTotalReturn
 *               MK-PF-F-020 portfolioBenchReturn · MK-PF-F-019 portfolioPeriodReturn
 *               MK-NW-F-091 pricedGainOf · MK-NW-O-008 thePerformance
 *               … and 1 more — the full list is on functions_from_code
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
 * Called by ... MK-PF-F-011 periodReturnSince · MK-PF-F-018 portfolioTrend
 *               MK-PF-F-039 periodReturnParts
 *
 * Reaches ..... 21 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-PF-F-016 attribution · MK-PF-F-014 buildPerformance
 *               MK-NW-F-084 categoryEarnings · MK-NW-F-127 gainOfRow
 *               MK-PF-F-021 periodDollarDelta · MK-PF-F-010 periodReturn
 *               MK-PF-F-039 periodReturnParts · MK-PF-F-011 periodReturnSince
 *               MK-PF-F-038 periodTotalReturn · MK-PF-F-020 portfolioBenchReturn
 *               MK-PF-F-019 portfolioPeriodReturn · MK-PF-F-018 portfolioTrend
 *               … and 3 more — the full list is on functions_from_code
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
 * Called by ... MK-PF-F-040 returnSincePurchases · MK-XS-F-175 uid
 *
 * Reaches ..... 65 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-082 NW
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-100 TREND · MK-NW-F-040 assetsFromOnboarding
 *               MK-NW-F-111 assetsStateFrom · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PF-F-014 buildPerformance
 *               MK-PL-F-053 buildRetirementState · MK-XS-F-031 buildSnapshot
 *               … and 47 more — the full list is on functions_from_code
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
 * Called by ... MK-PF-F-011 periodReturnSince · MK-PF-F-014 buildPerformance
 *               MK-PF-F-039 periodReturnParts · MK-XS-F-174 recomputeBalances
 *
 * Reaches ..... 78 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-082 NW
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-100 TREND · MK-NW-F-040 assetsFromOnboarding
 *               MK-NW-F-111 assetsStateFrom · MK-PF-F-016 attribution
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               … and 60 more — the full list is on functions_from_code
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
 *     p = period return parts(series, period, now)
 *     nothing   when p is missing
 *     the answer:
 *     (1 + total)^(1 ÷ years) − 1   if years > 1
 *     total   otherwise
 *
 * Called by ... MK-NW-F-084 categoryEarnings · MK-NW-F-127 gainOfRow
 *               MK-PF-F-014 buildPerformance · MK-PF-F-021 periodDollarDelta
 *               MK-PF-F-043 windowTotalOfRow
 *
 * Reaches ..... 16 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-PF-F-016 attribution · MK-PF-F-014 buildPerformance
 *               MK-NW-F-084 categoryEarnings · MK-NW-F-127 gainOfRow
 *               MK-PF-F-021 periodDollarDelta · MK-PF-F-020 portfolioBenchReturn
 *               MK-PF-F-019 portfolioPeriodReturn · MK-NW-F-091 pricedGainOf
 *               MK-NW-O-008 thePerformance · MK-PF-F-043 windowTotalOfRow
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
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-PF-F-014 buildPerformance · MK-NW-O-008 thePerformance
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
 *     beginning = day before(start date for(period, now))
 *     start = close as of(series, beginning)
 *     nothing   when end = nothing (or start = nothing (or start ≤ 0 when missing or zero) when missing or zero)
 *     total = end ÷ start − 1
 *     total = total
 *     years = 1   when period ! = '2Y'
 *     first = the date series.points[0].date), last = new date(series.points[series.points.length − 1].date
 *     reaches = first.get time() ≤ beginning.get time()
 *     years = 2   if reaches
 *     (last.get time() − first.get time()) ÷ (365.25 × 86400000)   otherwise
 *     the answer = { total, years }
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-PF-F-010 periodReturn · MK-PF-F-014 buildPerformance
 *               MK-PF-F-038 periodTotalReturn
 *
 * Reaches ..... 18 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-PF-F-016 attribution · MK-PF-F-014 buildPerformance
 *               MK-NW-F-084 categoryEarnings · MK-NW-F-127 gainOfRow
 *               MK-PF-F-021 periodDollarDelta · MK-PF-F-010 periodReturn
 *               MK-PF-F-038 periodTotalReturn · MK-PF-F-020 portfolioBenchReturn
 *               MK-PF-F-019 portfolioPeriodReturn · MK-NW-F-091 pricedGainOf
 *               MK-NW-O-008 thePerformance · MK-PF-F-043 windowTotalOfRow
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
  const beginning = dayBefore(startDateFor(period, now));
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
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-PF-F-014 buildPerformance · MK-NW-O-008 thePerformance
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
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-PF-F-014 buildPerformance · MK-NW-O-008 thePerformance
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
 * Reaches ..... 64 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-082 NW
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-100 TREND · MK-NW-F-040 assetsFromOnboarding
 *               MK-NW-F-111 assetsStateFrom · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PF-F-014 buildPerformance
 *               MK-PL-F-053 buildRetirementState · MK-XS-F-031 buildSnapshot
 *               … and 46 more — the full list is on functions_from_code
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
  costBasis: number | null;       // null: a share count or a cost not entered
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
 *     period start = iso day(start date for(period, now))
 *     series = price of(ticker)
 *     price = latest close(series)
 *     bought = earliest purchase date(p) (or purchase date of.(p) (or nothing when missing) when missing)
 *     capped = bought ≠ nothing and bought ≥ period start
 *     pr = return since purchases(p, series, price, bought!)   if capped
 *     period return(series, period, now)   otherwise
 *     pr total = pr   if capped
 *     period total return(series, period, now)   otherwise
 *     bench ticker = benchmark ticker(p)
 *     bench series = price of(bench ticker)   if bench ticker
 *     nothing   otherwise
 *     pts = series.points (or none when missing)
 *     first iso = pts[0].date   if count of pts
 *     nothing   otherwise
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-O-008 thePerformance
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-005 holding price
 *               MK-XS-I-007 purchase price and date (per lot)
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
  // the period's first day as the person's own calendar day (TZ-1) — never through UTC
  const periodStart = isoDay(startDateFor(period, now));
  return (positions ?? []).map((p) => {
    const series = priceOf(p.ticker);
    const price = latestClose(series);
    const bought = earliestPurchaseDate(p) ?? purchaseDateOf?.(p) ?? null;
    // A PURCHASE ON THE PERIOD'S FIRST DAY IS INSIDE IT (DEC-0315, Q3: both boundary days are inside, and the
    // beginning is the close of the day before, when this money was not yet held) — it read '>' (outside
    // review Claude Performance, 2026-10-11)
    const capped = bought != null && bought >= periodStart;
    // A HOLDING BOUGHT INSIDE THE WINDOW IS TIME-WEIGHTED FROM ITS PURCHASES (DEC-1669): split at each purchase,
    // each piece's growth multiplied — bought at $200 and again at $250, now $260, is +30.00%, not the +15.56%
    // return on cost (outside review Claude Performance, 2026-10-11). One purchase day gives the return on cost.
    const pr = capped ? returnSincePurchases(p, series, price, bought!) : periodReturn(series, period, now);
    const prTotal = capped ? pr : periodTotalReturn(series, period, now);
    const benchTicker = benchmarkTicker(p);
    const benchSeries = benchTicker ? priceOf(benchTicker) : null;
    // THE MARKET OVER THE SAME DATES WHEN THIS HOLDING'S PRICES DO NOT REACH BACK. The holding is then measured from
    // its first close on record (periodReturnParts), so the market is measured from that same day, and over 2Y made
    // yearly over the same span. It was measured over the whole window: a holding with two days of prices read
    // "Your return, past year +0.96%" beside "The market, same dates +22.40%", a year of the market (mock-match
    // audit v02, 2026-10-11 — Holding detail v02 draws "VS THE STOCK MARKET · SAME DATES").
    const pts = series?.points ?? [];
    const firstISO = pts.length ? pts[0].date : null;
    const short = !capped && firstISO != null && new Date(firstISO).getTime() > dayBefore(startDateFor(period, now)).getTime();
    const benchSameDays = short && benchTicker != null ? periodReturnSince(benchSeries, firstISO!, now) : null;
    const spanYears = short ? (new Date(pts[pts.length - 1].date).getTime() - new Date(firstISO!).getTime()) / (365.25 * 86_400_000) : 1;
    const benchReturn = benchTicker == null ? null : capped
      ? periodReturnSince(benchSeries, bought!, now)
      : short ? (benchSameDays == null ? null : period === '2Y' && spanYears > 1 ? Math.pow(1 + benchSameDays, 1 / spanYears) - 1 : benchSameDays)
      : periodReturn(benchSeries, period, now);
    const benchTotal = benchTicker == null ? null : capped ? benchReturn : short ? benchSameDays : periodTotalReturn(benchSeries, period, now);
    return {
      position: p, price,
      marketValue: marketValue(p, price), costBasis: costBasis(p), gain: unrealizedGain(p, price),
      totalROI: totalROI(p, price), periodReturn: pr, periodTotal: prTotal,
      benchTicker, benchReturn, benchTotal,
      beatBy: pr != null && benchReturn != null ? ((pr - benchReturn)) : null,
      cappedSince: capped ? bought : null,
    };
  });
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
 *     by day = new map<string, { shares: number; paid: number }>()
 *     sh = shares as number | nothing | undefined, c = cost per share as number | nothing | undefined
 *     nothing   when sh = nothing (or !number.is finite(sh) (or c = nothing (or !number.is finite(c) when missing or zero) when missing or zero) when missing or zero)
 *     d = the first 10 of purchase date   if ÷ ^\d{4}-\d{2}-\d{2} ÷ .test(purchase date ?? '')
 *     first day   otherwise
 *     g = by day.get(d) (or shares = 0
 *     paid = 0 when missing)
 *     days = [...by day.keys()], in order
 *     nothing   when count of days is missing
 *     held = 0, after = 0, growth = 1
 *     g = by day.get(d)!
 *     close = close on or before(series, d)
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-PF-F-014 buildPerformance
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-PF-F-014 buildPerformance · MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-007 purchase price and date (per lot)
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-040
 * Changed ..... not in git yet (—)
 */
function returnSincePurchases(p: Position, series: PriceSeries | null | undefined, price: number | null, firstDay: string): number | null {
  if (price == null) return null;
  const byDay = new Map<string, { shares: number; paid: number }>();
  for (const l of p.lots ?? []) {
    const sh = l?.shares as number | null | undefined, c = l?.cost_per_share as number | null | undefined;
    if (sh == null || !Number.isFinite(sh) || c == null || !Number.isFinite(c)) return null;
    if (!(sh > 0)) continue;
    const d = /^\d{4}-\d{2}-\d{2}/.test(l.purchase_date ?? '') ? l.purchase_date.slice(0, 10) : firstDay;
    const g = byDay.get(d) ?? { shares: 0, paid: 0 };
    g.shares += sh; g.paid += sh * c;
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
  return growth * (held * price) / after - 1;
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
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-PF-F-014 buildPerformance · MK-NW-O-008 thePerformance
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

/** Per-holding contribution to the portfolio's period return = weight × the holding's return (pts).
 *  The contributions sum (approx) to the portfolio return; sorted best→worst for winners/detractors. */
/* ─ MK-PF-F-016 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * attribution
 *
 * Answers ..... Per-holding contribution to the portfolio's period return = weight × the holding's return (pts).
 *
 * Formula .....
 *     usable = start values(rows, window total of row)
 *     total = Σ over usable of (start)
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
  // WEIGHED BY WHAT EACH HOLDING WAS WORTH WHEN THE WINDOW BEGAN — value now ÷ (1 + its window total) — so the
  // contributions add up to the portfolio's own growth, Σ now ÷ Σ start − 1 (DEC-1669, DEC-3035b; the same fix
  // as MK-NW-F-084). Weighed by today's values, $6,000 at +20% and $5,000 flat read +10.91% where $10,000 became
  // $11,000 = +10% (outside review Claude Performance, 2026-10-11). A holding with no return has no start
  // value, so it is out of the weights, never in them as 0.
  const usable = startValues(rows, windowTotalOfRow);
  const total = usable.reduce((t, u) => t + u.start, 0);
  if (total <= 0) return [];
  return usable
    .map((u) => ({ position: u.row.position, weight: u.start / total, contribution: (u.start / total) * u.ret }))
    .sort((a, b) => b.contribution - a.contribution);
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
 *               MK-PF-F-020 portfolioBenchReturn · MK-PF-F-043 windowTotalOfRow
 *
 * Reaches ..... 14 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-PF-F-016 attribution · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-127 gainOfRow · MK-PF-F-020 portfolioBenchReturn
 *               MK-PF-F-019 portfolioPeriodReturn · MK-NW-F-091 pricedGainOf
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
 * Called by ... MK-PF-F-016 attribution · MK-PF-F-019 portfolioPeriodReturn
 *               MK-PF-F-020 portfolioBenchReturn
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-PF-F-016 attribution
 *               MK-PF-F-020 portfolioBenchReturn · MK-PF-F-019 portfolioPeriodReturn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-043
 * Changed ..... not in git yet (—)
 */
const windowTotalOfRow = (r: PerformanceRow): number | null => windowTotal(r.periodReturn, r.periodTotal);

/** Each holding that has a window total above −100% and a value today, with its value when the window began. */
/* ─ MK-PF-F-044 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * startValues
 *
 * Answers ..... Each holding that has a window total above −100% and a value today, with its value when the window began.
 *
 * Formula .....
 *     out = []
 *     ret = ret of(r)
 *     the answer = out
 *
 * Called by ... MK-PF-F-016 attribution · MK-PF-F-019 portfolioPeriodReturn
 *               MK-PF-F-020 portfolioBenchReturn
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-PF-F-016 attribution
 *               MK-PF-F-020 portfolioBenchReturn · MK-PF-F-019 portfolioPeriodReturn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-044
 * Changed ..... not in git yet (—)
 */
function startValues(rows: PerformanceRow[], retOf: (r: PerformanceRow) => number | null): { row: PerformanceRow; ret: number; start: number }[] {
  const out: { row: PerformanceRow; ret: number; start: number }[] = [];
  for (const r of rows ?? []) {
    const ret = retOf(r);
    if (ret == null || !(ret > -1) || !((r.marketValue as number) > 0)) continue;
    out.push({ row: r, ret, start: (r.marketValue as number) / (1 + ret) });
  }
  return out;
}

/** Current allocation by asset kind (+ a cash slice), as value + % of the portfolio. */
export interface AllocSlice { key: string; value: number; pct: number; }
/* ─ MK-PF-F-017 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * allocation
 *
 * Answers ..... How is my invested money spread?
 *
 * Formula .....
 *     []   when rows.some((r) => market value = nothing)
 *     by kind = {}
 *     total = Σ over object.values(by kind) of (each)+ max(0, cash)
 *     []   when total ≤ 0
 *     slices = for each of object.entries(by kind): [key, v]) => ({ key, value: (v), pct: (v ÷ total) × 100 }
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
  // a holding worth something unknown leaves every slice's share unknown: no split is drawn (tenet 3, DEC-3523)
  if (rows.some((r) => r.marketValue == null)) return [];
  const byKind: Record<string, number> = {};
  rows.forEach((r) => { const k = r.position.kind ?? 'other_asset'; byKind[k] = (byKind[k] || 0) + (r.marketValue as number); });
  const total = Object.values(byKind).reduce((t, v) => t + v, 0) + Math.max(0, cash);
  if (total <= 0) return [];
  // each share at full precision — rounded once, where it is shown (DEC-0300); it was rounded to one decimal
  // here (outside review Claude Performance, 2026-10-11)
  const slices: AllocSlice[] = Object.entries(byKind).map(([key, v]) => ({ key, value: (v), pct: (v / total) * 100 }));
  if (cash > 0) slices.push({ key: 'cash', value: (cash), pct: (cash / total) * 100 });
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
 *     []   when positions.some((p) => total shares(p) = nothing)
 *     value at = (d: date) => positions.reduce((t, p) => { const c = close as of(price of(ticker), d); return t + (c = nothing ? 0 : (total shares(p) as number) × c); }, 0)
 *     v0 = value at(dates[0])
 *     b0 = close as of(bench series, dates[0])
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
  // a holding whose share count is not on record cannot be drawn: no line rather than a line without it (tenet 3)
  if (positions.some((p) => totalShares(p) == null)) return [];
  const valueAt = (d: Date) => positions.reduce((t, p) => { const c = closeAsOf(priceOf(p.ticker), d); return t + (c == null ? 0 : (totalShares(p) as number) * c); }, 0);
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
 *     usable = start values(rows, window total of row)
 *     start = Σ over usable of (start)
 *     now = Σ over usable of (row.market value as number)
 *     nothing   when start ≤ 0
 *     the answer = now ÷ start − 1
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
  // Σ now ÷ Σ start − 1, each holding's start = value now ÷ (1 + its window total) — weighed by what each was
  // worth when the window began (DEC-1669, DEC-3035b, the MK-NW-F-084 fix): $1,000 + $1,000 became $2,000 +
  // $1,000 = +50%; weighed by today's values it read +66.67% (outside review Claude Performance, 2026-10-11).
  // Still value-weighted (DEC-0248), by the value at the start. The window's own total, never a yearly rate.
  const usable = startValues(rows, windowTotalOfRow);
  const start = usable.reduce((t, u) => t + u.start, 0);
  const now = usable.reduce((t, u) => t + (u.row.marketValue as number), 0);
  if (start <= 0) return null;
  return now / start - 1;
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
 *     nothing   when period return = nothing (or !number.is finite(current total) (or !number.is finite(period return) (or period return ≤ -1 when missing or zero) when missing or zero) when missing or zero)
 *     current total × period return ÷ (1 + period return)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-021
 * Changed ..... 2026-07-19 (aa0b14c)
 */
export function periodDollarDelta(currentTotal: number, periodReturn: number | null): number | null {
  // UNKNOWN IS NOT ZERO (tenet 3, DEC-3523): a return that is not a number gives no dollars, never a flat $0; and
  // nothing rounds inside (DEC-0300) — both read otherwise until the outside review (Claude Performance, 2026-10-11).
  if (periodReturn == null || !Number.isFinite(currentTotal) || !Number.isFinite(periodReturn) || periodReturn <= -1) return null;
  return currentTotal * periodReturn / (1 + periodReturn);
}
