// Individual bonds (Phase B). A bond is held as an AssetAccount with bond fields (face_value,
// coupon_rate, maturity_date); its `balance` is the current value, so it flows into Net Worth and the
// nest egg via the existing balance machinery. These pure helpers compute the bond-specific metrics.
import { round2 } from '../_shared/num';
import type { AssetAccount } from '../assets';
import { assetClassOf } from '../assets';

export interface BondInfo { face: number; couponRate: number; maturity: string; value: number; }

/** An AssetAccount is a bond if its ASSET CLASS is bonds (spec §2: "detected by assetClass, NOT maturity
 *  date"). So a bond FUND/ETF with no maturity counts, and a CD/T-bill (cash) with a maturity does NOT.
 *  Existing bonds entered with a maturity but no explicit class still resolve to 'bonds' via assetClassOf. */
/* ─ MK-NW-F-055 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * isBond
 *
 * Answers ..... An AssetAccount is a bond if its ASSET CLASS is bonds (spec §2: "detected by assetClass, NOT maturity date").
 *
 * Formula .....
 *     asset class of(a) = 'bonds'
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-055
 * Changed ..... 2026-06-28 (91bdb1b)
 */
export function isBond(a: AssetAccount): boolean {
  return assetClassOf(a) === 'bonds';
}
/* ─ MK-NW-F-056 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * bondInfo
 *
 * Answers ..... What are this holding's bond facts?
 *
 * Formula .....
 *     face = face value (or 0 when missing or zero)
 *     coupon rate = coupon rate (or 0 when missing or zero)
 *     maturity = maturity date (or '' when missing or zero)
 *     value = balance (or 0 when missing or zero)
 *
 * Called by ... MK-NW-F-062 couponIncomeAnnual
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-062 couponIncomeAnnual
 *
 * Serves ...... MK-NW-M-023 · MK-NW-M-041 · MK-NW-M-042 · MK-NW-M-045
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-049 bond price — what the bond is worth today
 *
 * Decides .....
 *     · If face value is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If coupon rate is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-056
 * Changed ..... 2026-06-06 (2c5ce55)
 */
export function bondInfo(a: AssetAccount): BondInfo {
  return { face: a.face_value || 0, couponRate: a.coupon_rate || 0, maturity: a.maturity_date || '', value: a.balance || 0 };
}

/** Annual coupon income = face value × coupon rate (paid as cash). */
/* ─ MK-NW-F-057 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * annualCoupon
 *
 * Answers ..... Annual coupon income = face value × coupon rate (paid as cash).
 *
 * Formula .....
 *     annual coupon = round(face value × coupon rate, 2 dp)
 *
 * Called by ... MK-NW-F-059 currentYield · MK-NW-F-060 approxYTM
 *               MK-NW-F-061 bondSummary · MK-NW-F-062 couponIncomeAnnual
 *               MK-NW-F-069 priceAtYield
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-060 approxYTM · MK-NW-F-064 bondRateSensitivity
 *               MK-NW-F-061 bondSummary · MK-NW-F-062 couponIncomeAnnual
 *               MK-NW-F-059 currentYield · MK-NW-F-069 priceAtYield
 *
 * Serves ...... MK-NW-M-024 · MK-NW-M-043 · MK-NW-M-045
 * Reads ....... MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-049 bond price — what the bond is worth today
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-057
 * Changed ..... 2026-06-06 (2c5ce55)
 */
export function annualCoupon(b: BondInfo): number {
  return round2(b.face * b.couponRate);
}
/* ─ MK-NW-F-058 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * yearsToMaturity
 *
 * Answers ..... How long until this bond pays back?
 *
 * Formula .....
 *     years to maturity = max(0, (maturity date − today) ÷ 365.25 days)
 *
 * Called by ... MK-NW-F-060 approxYTM · MK-NW-F-069 priceAtYield
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-060 approxYTM · MK-NW-F-064 bondRateSensitivity
 *               MK-NW-F-069 priceAtYield
 *
 * Serves ...... MK-NW-M-025
 * Reads ....... MK-XS-I-013 bond maturity date
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-058
 * Changed ..... 2026-06-06 (2c5ce55)
 */
export function yearsToMaturity(maturity: string, now: Date = new Date()): number {
  if (!maturity) return 0;
  return Math.max(0, (new Date(maturity).getTime() - now.getTime()) / (365.25 * 86400000));
}
/** Current yield = annual coupon ÷ current price/value. */
/* ─ MK-NW-F-059 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * currentYield
 *
 * Answers ..... Current yield = annual coupon ÷ current price/value.
 *
 * Formula .....
 *     current yield = round(annual coupon ÷ current value, 4 dp)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... MK-NW-M-027 · MK-NW-M-044
 * Reads ....... MK-XS-I-049 bond price — what the bond is worth today
 *
 * Decides .....
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-059
 * Changed ..... 2026-06-06 (2c5ce55)
 */
export function currentYield(b: BondInfo): number | null {
  return b.value > 0 ? Math.round((annualCoupon(b) / b.value) * 1e4) / 1e4 : null;
}
/** Approximate yield to maturity (standard approximation), decimal. null if matured / no value. */
/* ─ MK-NW-F-060 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * approxYTM
 *
 * Answers ..... Approximate yield to maturity (standard approximation), decimal.
 *
 * Formula .....
 *     yield to maturity ≈ round( (annual coupon + (face − value) ÷ years left)
 *                                ÷ ((face + value) ÷ 2), 4 dp )
 *
 * Called by ... MK-NW-F-064 bondRateSensitivity
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-064 bondRateSensitivity
 *
 * Serves ...... MK-NW-M-026
 * Reads ....... MK-XS-I-011 bond face value
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-049 bond price — what the bond is worth today
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-060
 * Changed ..... 2026-06-06 (2c5ce55)
 */
export function approxYTM(b: BondInfo, now: Date = new Date()): number | null {
  const n = yearsToMaturity(b.maturity, now);
  if (n <= 0 || b.value <= 0) return null;
  const c = annualCoupon(b);
  const ytm = (c + (b.face - b.value) / n) / ((b.face + b.value) / 2);
  return Math.round(ytm * 1e4) / 1e4;
}

export interface BondSummary { count: number; totalValue: number; totalFace: number; annualCoupon: number; avgYield: number | null; nextMaturity: string | null; }
/* ─ MK-NW-F-061 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * bondSummary
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     list = bonds (or none when missing)
 *     total value = round(Σ over list of (value), 2 dp)
 *     total face = round(Σ over list of (face), 2 dp)
 *     coupon = round(Σ over list of (annual coupon(each)), 2 dp)
 *     avg yield = round(coupon ÷ total value, 4 dp)   if total value > 0
 *     nothing   otherwise
 *     future = for each of list: maturity where boolean where the date each).get time() ≥ now.get time(, in order
 *     the answer:
 *     count = count of list
 *     total value = total value
 *     total face = total face
 *     annual coupon = coupon
 *     avg yield = avg yield
 *     next maturity = the first of future (or nothing when missing)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-011 bond face value
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-049 bond price — what the bond is worth today
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · Rounds the answer to a whole number.
 *     · Leaves some rows out of the answer — check which.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-061
 * Changed ..... 2026-06-22 (2a41cac)
 */
export function bondSummary(bonds: BondInfo[], now: Date = new Date()): BondSummary {
  const list = bonds ?? [];
  const totalValue = round2(list.reduce((t, b) => t + b.value, 0));
  const totalFace = round2(list.reduce((t, b) => t + b.face, 0));
  const coupon = round2(list.reduce((t, b) => t + annualCoupon(b), 0));
  const avgYield = totalValue > 0 ? Math.round((coupon / totalValue) * 1e4) / 1e4 : null;
  const future = list.map((b) => b.maturity).filter(Boolean).filter((m) => new Date(m).getTime() >= now.getTime()).sort();
  return { count: list.length, totalValue, totalFace, annualCoupon: coupon, avgYield, nextMaturity: future[0] ?? null };
}
/** Total annual coupon income across the user's INDIVIDUAL bonds (kept for the Bonds screen summary). */
/* ─ MK-NW-F-062 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * couponIncomeAnnual
 *
 * Answers ..... Total annual coupon income across the user's INDIVIDUAL bonds (kept for the Bonds screen summary).
 *
 * Formula .....
 *     round(Σ over accounts (or none when missing) where is bond of (annual coupon(bond info(each))), 2 dp)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses a built-in d e f a u l t b o n d y i e l d of 4.2%.
 *     · Leaves some rows out of the answer — check which.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-062
 * Changed ..... 2026-08-04 (abb4c23)
 */
export function couponIncomeAnnual(accounts: AssetAccount[]): number {
  return round2((accounts ?? []).filter(isBond).reduce((t, a) => t + annualCoupon(bondInfo(a)), 0));
}

const DEFAULT_BOND_YIELD = 0.042;   // US Aggregate Bond ~yield; used when a bond fund carries no rate

/** Canonical annual INTEREST income across all interest-bearing holdings (Term #6). Fixes the
 *  silent-$0 bug: a bond FUND (asset class 'bonds', no maturity/coupon) now earns value × yield, and
 *  a CD (now class 'bonds', founder rule 2026-08-04) or a rate-stated cash account (HYSA) keeps contributing its interest — both
 *  of which the old isBond-only `couponIncomeAnnual` dropped. Individual bonds: face × coupon. */
/* ─ MK-NW-F-063 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * interestIncomeAnnual
 *
 * Answers ..... Canonical annual INTEREST income across all interest-bearing holdings (Term #6).
 *
 * Formula .....
 *     cls = asset class of(a)
 *     coupon = (coupon rate or 0) × (face value or 0)
 *     t + coupon   when coupon > 0
 *     t + (balance or 0) × (coupon rate as number)   when (coupon rate or 0) > 0
 *     yld = target return   if target return and target return > 0
 *     DEFAULT_BOND_YIELD   otherwise
 *     the answer = t + (balance or 0) × yld
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-028 assumed return
 *
 * Decides .....
 *     · If coupon rate is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If face value is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-063
 * Changed ..... 2026-08-04 (abb4c23)
 */
export function interestIncomeAnnual(accounts: AssetAccount[]): number {
  return round2((accounts ?? []).reduce((t, a) => {
    const cls = assetClassOf(a);
    if (cls === 'bonds') {
      const coupon = (a.coupon_rate || 0) * (a.face_value || 0);
      if (coupon > 0) return t + coupon;                                   // individual bond (face × coupon)
      if ((a.coupon_rate || 0) > 0) return t + (a.balance || 0) * (a.coupon_rate as number);   // CD / rate-stated bond, no face (founder rule 2026-08-04: CDs are bonds)
      const yld = (a.target_return && a.target_return > 0) ? a.target_return : DEFAULT_BOND_YIELD;
      return t + (a.balance || 0) * yld;                                   // bond fund (no coupon/face)
    }
    if (cls === 'cash' && (a.coupon_rate || 0) > 0) {
      return t + (a.balance || 0) * (a.coupon_rate as number);            // CD / money-market with a stated rate
    }
    return t;
  }, 0));
}

// ── FCC: the if-interest-rates-move ESTIMATE (detailed design v1.1, Invest sheet) ────────────────
// Reprices the bond's remaining payments at approxYTM ± 1% — the SAME starting yield the detail
// page shows, so the card can never contradict the yield line. Shown as a rough RANGE (±1% around
// the repriced value), always titled 'Estimate, not a prediction'. null when no honest math is
// possible (no coupon/face/maturity, or matured) — never a guessed number.
export interface RateMove { low: number; high: number; delta: number }
export interface RateSensitivity { ratesUp: RateMove; ratesDown: RateMove }

/** Price the bond's future cash flows at a given annual yield (yearly approximation). */
/* ─ MK-NW-F-069 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * priceAtYield
 *
 * Answers ..... Price the bond's future cash flows at a given annual yield (yearly approximation).
 *
 * Formula .....
 *     n = max(1, round(years to maturity(maturity, now)))
 *     c = annual coupon(b)
 *     pv = 0
 *     the answer = pv
 *
 * Called by ... MK-NW-F-064 bondRateSensitivity
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-064 bondRateSensitivity
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-011 bond face value
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-049 bond price — what the bond is worth today
 *
 * Decides .....
 *     · Uses a built-in pv of 0.
 *     · Uses a built-in t of 1.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-069
 * Changed ..... not in git yet (—)
 */
function priceAtYield(b: BondInfo, y: number, now: Date): number {
  const n = Math.max(1, Math.round(yearsToMaturity(b.maturity, now)));
  const c = annualCoupon(b);
  let pv = 0;
  for (let t = 1; t <= n; t++) pv += c / Math.pow(1 + y, t);
  pv += b.face / Math.pow(1 + y, n);
  return pv;
}

/* ─ MK-NW-F-064 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * bondRateSensitivity
 *
 * Answers ..... What happens to this bond if interest rates move?
 *
 * Formula .....
 *     ytm = approx ytm(b, now)
 *     nothing   when ytm = nothing (or face ≤ 0 (or coupon rate ≤ 0 when missing or zero) when missing or zero)
 *     v = price at yield(b, math.max(0.0001, ytm + delta), now)
 *     the answer:
 *     rates up = move(0.01)
 *     rates down = move(-0.01)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-049 bond price — what the bond is worth today
 *
 * Decides .....
 *     · Applies a built-in rate of 99% to v.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-064
 * Changed ..... 2026-07-13 (d058ce1)
 */
export function bondRateSensitivity(b: BondInfo, now: Date = new Date()): RateSensitivity | null {
  const ytm = approxYTM(b, now);
  if (ytm == null || b.face <= 0 || b.couponRate <= 0) return null;
  const move = (delta: number): RateMove => {
    const v = priceAtYield(b, Math.max(0.0001, ytm + delta), now);
    return {
      low: Math.round((v * 0.99) / 1000) * 1000,      // a rough, honest band — not a fake-precise number
      high: Math.round((v * 1.01) / 1000) * 1000,
      delta: Math.round((v - b.value) / 1000) * 1000,
    };
  };
  return { ratesUp: move(0.01), ratesDown: move(-0.01) };
}
