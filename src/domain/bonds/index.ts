// Individual bonds (Phase B). A bond is held as an AssetAccount with bond fields (face_value,
// coupon_rate, maturity_date); its `balance` is the current value, so it flows into Net Worth and the
// nest egg via the existing balance machinery. These pure helpers compute the bond-specific metrics.
import type { AssetAccount } from '../assets';
import { assetClassOf } from '../assets';

export interface BondInfo { face: number; couponRate: number; maturity: string; value: number; accruedInterest?: number | null; }

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
 * Called by ... MK-NW-F-062 couponIncomeAnnual · MK-NW-O-001 theBonds
 *
 * Reaches ..... 73 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-077 ALL · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-NW-F-078 ONE · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               … and 55 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-055
 * Changed ..... 2026-06-28 (91bdb1b)
 */
export function isBond(a: AssetAccount): boolean {
  return assetClassOf(a) === 'bonds';
}
/* ─ MK-NW-F-056 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * bondInfo
 *
 * Answers ..... What are this holding's bond facts?
 *
 * Formula .....
 *     face = face value or 0
 *     coupon rate = coupon rate or 0
 *     maturity = maturity date or ''
 *     value = balance or 0
 *     accrued interest = the entered figure, or nothing when not entered
 *
 * Called by ... MK-NW-F-062 couponIncomeAnnual · MK-NW-F-072 rowOf
 *               MK-NW-O-001 theBonds
 *
 * Reaches ..... 74 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-077 ALL · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-NW-F-078 ONE · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               … and 56 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-049 bond price — what the bond is worth today
 *               MK-XS-I-065 accrued interest on a bond — interest earned since the last coupon
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
  return { face: a.face_value || 0, couponRate: a.coupon_rate || 0, maturity: a.maturity_date || '', value: a.balance || 0,
           accruedInterest: a.accrued_interest == null ? null : a.accrued_interest };
}

/** Annual coupon income = face value × coupon rate (paid as cash). */
/* ─ MK-NW-F-057 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * annualCoupon
 *
 * Answers ..... Annual coupon income = face value × coupon rate (paid as cash).
 *
 * Formula .....
 *     annual coupon = face value × coupon rate
 *
 * Called by ... MK-NW-F-059 currentYield · MK-NW-F-060 approxYTM
 *               MK-NW-F-061 bondSummary · MK-NW-F-062 couponIncomeAnnual
 *               MK-NW-F-069 priceAtYield · MK-NW-F-072 rowOf
 *               MK-NW-O-001 theBonds
 *
 * Reaches ..... 79 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-077 ALL · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-NW-F-078 ONE · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               … and 61 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-049 bond price — what the bond is worth today
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-057
 * Changed ..... 2026-06-06 (2c5ce55)
 */
export function annualCoupon(b: BondInfo): number {
  return (b.face * b.couponRate);
}
/* ─ MK-NW-F-058 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * yearsToMaturity
 *
 * Answers ..... How long until this bond pays back?
 *
 * Formula .....
 *     years to maturity = max(0, (maturity date − today) ÷ 365.25 days)
 *
 * Called by ... MK-NW-F-060 approxYTM · MK-NW-F-069 priceAtYield
 *               MK-NW-F-072 rowOf
 *
 * Reaches ..... 76 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-077 ALL · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-NW-F-078 ONE · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               … and 58 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-013 bond maturity date
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · No maturity date, or an unreadable one, gives NO answer — not zero and not "due now" (G11, founder 2026-09-12); the yield to maturity and the rate sensitivity then refuse too.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-058
 * Changed ..... 2026-06-06 (2c5ce55)
 */
export function yearsToMaturity(maturity: string, now: Date = new Date()): number | null {
  // G11 (founder, 2026-09-12): no date, or an unreadable one, is NOT "due now" — it is unknown, and
  // everything that needs the years (yield to maturity, rate sensitivity) says so instead of inventing 0.
  if (!maturity || Number.isNaN(new Date(maturity).getTime())) return null;
  return Math.max(0, (new Date(maturity).getTime() - now.getTime()) / (365.25 * 86400000));
}
/** Current yield = annual coupon ÷ current price/value. */
/* ─ MK-NW-F-059 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * currentYield
 *
 * Answers ..... Current yield = annual coupon ÷ current price/value.
 *
 * Formula .....
 *     current yield = annual coupon ÷ current value
 *
 * Called by ... MK-NW-F-072 rowOf · MK-NW-F-078 ONE
 *
 * Reaches ..... 73 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-077 ALL · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-NW-F-078 ONE · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               … and 55 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-049 bond price — what the bond is worth today
 *               MK-XS-I-065 accrued interest on a bond — interest earned since the last coupon
 *
 * Decides .....
 *     · If accrued interest is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-059
 * Changed ..... 2026-06-06 (2c5ce55)
 */
export function currentYield(b: BondInfo): number | null {
  const clean = b.value - (b.accruedInterest ?? 0);   // A47 (founder, 2026-08-26): accrued interest is subtracted when known
  return clean > 0 ? ((annualCoupon(b) / clean)) : null;
}

/** A47 (founder, 2026-08-26): subtract accrued interest when known; say so when not. */
/* ─ MK-NW-F-070 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * accruedInterestCaveat
 *
 * Answers ..... A47 (founder, 2026-08-26): subtract accrued interest when known; say so when not.
 *
 * Formula .....
 *     'accrued interest not entered — the yield uses the price as you entered it'   if accrued interest = nothing
 *     nothing   otherwise
 *
 * Called by ... MK-NW-F-072 rowOf
 *
 * Reaches ..... 73 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-077 ALL · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-NW-F-078 ONE · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               … and 55 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-049 bond price — what the bond is worth today
 *               MK-XS-I-065 accrued interest on a bond — interest earned since the last coupon
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-070
 * Changed ..... not in git yet (—)
 */
export function accruedInterestCaveat(b: BondInfo): string | null {
  return b.accruedInterest == null ? 'accrued interest not entered — the yield uses the price as you entered it' : null;
}
/** Approximate yield to maturity (standard approximation), decimal. null if matured / no value. */
/* ─ MK-NW-F-060 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * approxYTM
 *
 * Answers ..... Approximate yield to maturity (standard approximation), decimal.
 *
 * Formula .....
 *     yield to maturity ≈ round( (annual coupon + (face − value) ÷ years left)
 *                                ÷ ((face + value) ÷ 2), 4 dp )
 *
 * Called by ... MK-NW-F-064 bondRateSensitivity · MK-NW-F-072 rowOf
 *
 * Reaches ..... 74 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-077 ALL · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-NW-F-078 ONE · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               … and 56 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-011 bond face value
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-049 bond price — what the bond is worth today
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · 'value' is the bond's current value as entered (the balance) — the SAME total basis as face, not a price per $100 (founder question G20, 2026-09-08).
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-060
 * Changed ..... 2026-06-06 (2c5ce55)
 */
export function approxYTM(b: BondInfo, now: Date = new Date()): number | null {
  const n = yearsToMaturity(b.maturity, now);
  if (n == null || n <= 0 || b.value <= 0) return null;
  const c = annualCoupon(b);
  const ytm = (c + (b.face - b.value) / n) / ((b.face + b.value) / 2);
  return (ytm);
}

export interface BondSummary { count: number; totalValue: number; totalFace: number; annualCoupon: number; avgYield: number | null; nextMaturity: string | null; }
/* ─ MK-NW-F-061 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * bondSummary
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     list = bonds (or none when missing)
 *     total value = Σ over list of (value)
 *     total face = Σ over list of (face)
 *     coupon = Σ over list of (annual coupon(each))
 *     avg yield = coupon ÷ total value   if total value > 0
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
 * Called by ... MK-NW-O-001 theBonds
 *
 * Reaches ..... 72 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-077 ALL · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-NW-F-078 ONE · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               … and 54 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-011 bond face value
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-049 bond price — what the bond is worth today
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-061
 * Changed ..... 2026-06-22 (2a41cac)
 */
export function bondSummary(bonds: BondInfo[], now: Date = new Date()): BondSummary {
  const list = bonds ?? [];
  const totalValue = (list.reduce((t, b) => t + b.value, 0));
  const totalFace = (list.reduce((t, b) => t + b.face, 0));
  const coupon = (list.reduce((t, b) => t + annualCoupon(b), 0));
  const avgYield = totalValue > 0 ? ((coupon / totalValue)) : null;
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
 *     Σ over accounts (or none when missing) where is bond of (annual coupon(bond info(each)))
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-062
 * Changed ..... 2026-08-04 (abb4c23)
 */
export function couponIncomeAnnual(accounts: AssetAccount[]): number {
  return ((accounts ?? []).filter(isBond).reduce((t, a) => t + annualCoupon(bondInfo(a)), 0));
}

/** Canonical annual INTEREST income across all interest-bearing holdings (Term #6). Individual
 *  bonds: face × coupon. A CD (class 'bonds', founder rule 2026-08-04) or a rate-stated cash account
 *  (HYSA) contributes balance × its stated rate. A bond FUND with no coupon rate contributes $0 —
 *  A46 (founder, 2026-08-26): if the coupon rate is not available use 0, never a built-in yield. */
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
 *     the answer = t
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
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
  return ((accounts ?? []).reduce((t, a) => {
    const cls = assetClassOf(a);
    if (cls === 'bonds') {
      const coupon = (a.coupon_rate || 0) * (a.face_value || 0);
      if (coupon > 0) return t + coupon;                                   // individual bond (face × coupon)
      if ((a.coupon_rate || 0) > 0) return t + (a.balance || 0) * (a.coupon_rate as number);   // CD / rate-stated bond, no face (founder rule 2026-08-04: CDs are bonds)
      return t;                                                            // A46 (founder, 2026-08-26): no coupon rate → $0, never a built-in yield
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
 *     years = years to maturity(maturity, now)
 *     value   when years = nothing
 *     n = max(1, round(years))
 *     c = annual coupon(b)
 *     pv = 0
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-NW-F-064 bondRateSensitivity
 *
 * Reaches ..... 73 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-077 ALL · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-NW-F-078 ONE · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               … and 55 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-011 bond face value
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-049 bond price — what the bond is worth today
 *
 * Decides .....
 *     · Uses a built-in pv of 0.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-069
 * Changed ..... not in git yet (—)
 */
function priceAtYield(b: BondInfo, y: number, now: Date): number {
  const years = yearsToMaturity(b.maturity, now);
  if (years == null) return b.value;   // G11: no maturity date → the price cannot be moved; the value as entered stands
  const n = Math.max(1, Math.round(years));
  const c = annualCoupon(b);
  let pv = 0;
  for (let t = 1; t <= n; t++) pv += c / Math.pow(1 + y, t);
  pv += b.face / Math.pow(1 + y, n);
  return pv;
}

/* ─ MK-NW-F-064 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
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
 * Called by ... MK-NW-O-001 theBonds
 *
 * Reaches ..... 72 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-077 ALL · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-NW-F-078 ONE · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               … and 54 more — the full list is on functions_from_code
 *
 * Serves ...... MK-NW-M-028
 * Reads ....... MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-049 bond price — what the bond is worth today
 * Ruled by .... DEC-0071
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
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
