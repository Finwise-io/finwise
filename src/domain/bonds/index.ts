// Individual bonds (Phase B). A bond is held as an AssetAccount with bond fields (face_value,
// coupon_rate, maturity_date); its `balance` is the current value, so it flows into Net Worth and the
// nest egg via the existing balance machinery. These pure helpers compute the bond-specific metrics.
import type { AssetAccount } from '../assets';
import { assetClassOf } from '../assets';
import { isoLocalDate } from '../_shared/dates';

export interface BondInfo {
  /** What it pays back at maturity — as entered, or null when never entered (outside review, 2026-10-07: a face read as $0 made a −274% yield). */
  face: number | null;
  /** The yearly rate — as entered, or null when never entered; a typed 0 is a zero-coupon bond. */
  couponRate: number | null;
  maturity: string;
  value: number;
  accruedInterest?: number | null;
  /** A certificate of deposit: not traded, so its value does not move with rates (owner, 2026-09-27). */
  isCd?: boolean;
}
const CD_WORDS = /\b(cd|certificate of deposit)\b/i;

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
 * Reaches ..... 83 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-077 ALL · MK-NW-F-076 ALT
 *               MK-NW-F-088 BENCH · MK-CF-F-205 COMING
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-NW-F-078 ONE · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               … and 65 more — the full list is on functions_from_code
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
 * Called by ... MK-NW-F-062 couponIncomeAnnual · MK-NW-F-063 interestIncomeAnnual
 *               MK-NW-F-071 isCertificateOfDeposit · MK-NW-F-072 rowOf
 *               MK-NW-O-001 theBonds
 *
 * Reaches ..... 86 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-077 ALL · MK-NW-F-076 ALT
 *               MK-NW-F-088 BENCH · MK-CF-F-205 COMING
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-NW-F-078 ONE · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               … and 68 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-003 institution name
 *               MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-049 bond price — what the bond is worth today
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-065 accrued interest on a bond — interest earned since the last coupon
 *
 * Decides .....
 *     · If balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-056
 * Changed ..... 2026-06-06 (2c5ce55)
 */
export function bondInfo(a: AssetAccount): BondInfo {
  // EACH FIGURE AS ENTERED, AND NOT ENTERED WHEN IT WAS NOT (outside review, 2026-10-07). A face value
  // or a rate read as $0 flowed into every figure below: a CD typed with only its balance showed a yield
  // to maturity of −274%, and a bond with no rate showed a current yield of 0.00% instead of nothing.
  return { face: a.face_value != null && a.face_value > 0 ? a.face_value : null,
           couponRate: a.coupon_rate == null ? null : a.coupon_rate,
           maturity: a.maturity_date || '', value: a.balance || 0,
           accruedInterest: a.accrued_interest == null ? null : a.accrued_interest,
           isCd: (a.kind as string) === 'cd' || CD_WORDS.test(`${a.label ?? ''} ${(a as any).institution ?? ''}`) };
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
 * Called by ... MK-NW-F-060 approxYTM · MK-NW-F-069 priceAtYield
 *               MK-NW-O-001 theBonds
 *
 * Reaches ..... 86 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-077 ALL · MK-NW-F-076 ALT
 *               MK-NW-F-088 BENCH · MK-CF-F-205 COMING
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-NW-F-078 ONE · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               … and 68 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-049 bond price — what the bond is worth today
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-057
 * Changed ..... 2026-06-06 (2c5ce55)
 */
export function annualCoupon(b: BondInfo): number | null {
  // face × rate, and nothing when either was never entered — a $0 here is a zero-coupon bond, not a blank
  return b.face != null && b.couponRate != null ? (b.face * b.couponRate) : null;
}

/** A year's interest from one bond or CD, by the one rule both income figures use: face × rate; with no face entered, today's value × rate (a CD typed by its balance); with no rate, nothing (owner A46: counted as $0, said so). */
/* ─ MK-NW-F-112 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * yearlyInterest
 *
 * Answers ..... A year's interest from one bond or CD, by the one rule both income figures use: face × rate; with no face entered, today's value × rate (a CD typed by its balance); with no rate, nothing (owner A46: counted as $0, said so).
 *
 * Formula .....
 *     nothing   when coupon rate = nothing
 *     face × coupon rate   if face ≠ nothing
 *     value × coupon rate   otherwise
 *
 * Called by ... MK-NW-F-059 currentYield · MK-NW-F-061 bondSummary
 *               MK-NW-F-062 couponIncomeAnnual · MK-NW-F-063 interestIncomeAnnual
 *               MK-NW-F-072 rowOf · MK-NW-O-001 theBonds
 *
 * Reaches ..... 87 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-077 ALL · MK-NW-F-076 ALT
 *               MK-NW-F-088 BENCH · MK-CF-F-205 COMING
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-NW-F-078 ONE · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               … and 69 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-049 bond price — what the bond is worth today
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-112
 * Changed ..... not in git yet (—)
 */
export function yearlyInterest(b: BondInfo): number | null {
  if (b.couponRate == null) return null;
  return b.face != null ? b.face * b.couponRate : b.value * b.couponRate;
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
 * Reaches ..... 86 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-077 ALL · MK-NW-F-076 ALT
 *               MK-NW-F-088 BENCH · MK-CF-F-205 COMING
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-NW-F-078 ONE · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               … and 68 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-013 bond maturity date
 *
 * Decides .....
 *     · Treats a year as 365 days.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · Rounds the answer to a whole number.
 *     · No maturity date, or an unreadable one, gives NO answer — not zero and not "due now" (G11, founder 2026-09-12); the yield to maturity and the rate sensitivity then refuse too.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-058
 * Changed ..... 2026-06-06 (2c5ce55)
 */
export function yearsToMaturity(maturity: string, now: Date = new Date()): number | null {
  // G11 (founder, 2026-09-12): no date, or an unreadable one, is NOT "due now" — it is unknown, and
  // everything that needs the years (yield to maturity, rate sensitivity) says so instead of inventing 0.
  if (!maturity || Number.isNaN(new Date(maturity).getTime())) return null;
  // BY THE CALENDAR, NOT THE CLOCK: whole days from today's date to the maturity date, ÷ 365.25. The
  // hour of the day used to shave part of a day off (outside review, 2026-10-07).
  const [y, m, d] = String(maturity).slice(0, 10).split('-').map(Number);
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((Date.UTC(y, (m || 1) - 1, d || 1) - todayUtc) / 86400000);
  return Math.max(0, days / 365.25);
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
 * Reaches ..... 83 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-077 ALL · MK-NW-F-076 ALT
 *               MK-NW-F-088 BENCH · MK-CF-F-205 COMING
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-NW-F-078 ONE · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               … and 65 more — the full list is on functions_from_code
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
  const interest = yearlyInterest(b);                 // nothing without a rate — a dash, never 0.00% (outside review, 2026-10-07)
  return interest != null && clean > 0 ? ((interest / clean)) : null;
}

/** A47 (founder, 2026-08-26): subtract accrued interest when known; say so when not. */

/** The note shown beside a bond's yield when its accrued interest was not entered, or nothing when it was. */
/* ─ MK-NW-F-070 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * accruedInterestCaveat
 *
 * Answers ..... The note shown beside a bond's yield when its accrued interest was not entered, or nothing when it was.
 *
 * Formula .....
 *     'accrued interest not entered — the yield uses the price as you entered it'   if accrued interest = nothing
 *     nothing   otherwise
 *
 * Called by ... MK-NW-F-072 rowOf
 *
 * Reaches ..... 83 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-077 ALL · MK-NW-F-076 ALT
 *               MK-NW-F-088 BENCH · MK-CF-F-205 COMING
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-NW-F-078 ONE · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               … and 65 more — the full list is on functions_from_code
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
 * Reaches ..... 84 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-077 ALL · MK-NW-F-076 ALT
 *               MK-NW-F-088 BENCH · MK-CF-F-205 COMING
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-NW-F-078 ONE · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               … and 66 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-011 bond face value
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-049 bond price — what the bond is worth today
 *               MK-XS-I-065 accrued interest on a bond — interest earned since the last coupon
 *
 * Decides .....
 *     · If accrued interest is missing it uses 0.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · 'value' is the bond's current value as entered (the balance) — the SAME total basis as face, not a price per $100 (founder question G20, 2026-09-08).
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-060
 * Changed ..... 2026-06-06 (2c5ce55)
 */
export function approxYTM(b: BondInfo, now: Date = new Date()): number | null {
  const n = yearsToMaturity(b.maturity, now);
  // no face value or no rate, no yield to maturity: with the face read as $0 the formula gave a large
  // negative yield for a bond whose face was never entered (2026-10-07)
  const c = annualCoupon(b);
  if (n == null || n <= 0 || b.face == null || c == null) return null;
  // ON THE CLEAN PRICE — the value less accrued interest when it is known — the same price the current
  // yield uses; on the dirty value a bond with accrued interest read its yield too low (outside review,
  // 2026-10-07)
  const clean = b.value - (b.accruedInterest ?? 0);
  if (clean <= 0) return null;
  const ytm = (c + (b.face - clean) / n) / ((b.face + clean) / 2);
  return (ytm);
}

export interface BondSummary { count: number; totalValue: number; totalFace: number; annualCoupon: number; avgYield: number | null; nextMaturity: string | null; }

/** Adds up every bond and CD held: how many there are, what they are worth, their face value, the interest they pay in a year, their average yield and the next one to mature. */
/* ─ MK-NW-F-061 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * bondSummary
 *
 * Answers ..... Adds up every bond and CD held: how many there are, what they are worth, their face value, the interest they pay in a year, their average yield and the next one to mature.
 *
 * Formula .....
 *     list = bonds (or none when missing)
 *     total value = Σ over list of (value)
 *     total face = Σ over list of (face (or 0 when missing))
 *     coupon = Σ over list of (yearly interest(each) (or 0 when missing))
 *     clean = (b: bond info) => value − (accrued interest ?? 0)
 *     priced = list where clean(each) > 0 and yearly interest(each) ≠ nothing
 *     clean value = Σ over priced of (clean(each))
 *     avg yield = Σ over clean value > 0 ? priced of (yearly interest(each) (or 0 when missing))÷ clean value : nothing
 *     today = iso local date(now)
 *     future = for each of list: maturity where boolean where string(each).slice(0, 10) > today, in order
 *     the answer:
 *     count = count of list
 *     total value = total value
 *     total face = total face
 *     annual coupon = coupon
 *     avg yield = avg yield
 *     next maturity = the first of future (or nothing when missing)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-O-001 theBonds
 *
 * Reaches ..... 82 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-077 ALL · MK-NW-F-076 ALT
 *               MK-NW-F-088 BENCH · MK-CF-F-205 COMING
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-NW-F-078 ONE · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               … and 64 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-011 bond face value
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-049 bond price — what the bond is worth today
 *               MK-XS-I-065 accrued interest on a bond — interest earned since the last coupon
 *
 * Decides .....
 *     · If face is missing it uses 0.
 *     · If accrued interest is missing it uses 0.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-061
 * Changed ..... 2026-06-22 (2a41cac)
 */
export function bondSummary(bonds: BondInfo[], now: Date = new Date()): BondSummary {
  const list = bonds ?? [];
  const totalValue = (list.reduce((t, b) => t + b.value, 0));
  const totalFace = (list.reduce((t, b) => t + (b.face ?? 0), 0));
  const coupon = (list.reduce((t, b) => t + (yearlyInterest(b) ?? 0), 0));   // a CD by its balance counts its balance × rate
  // THE AVERAGE YIELD IS OVER THE BONDS THAT HAVE A VALUE TODAY, ON THAT VALUE LESS ACCRUED INTEREST.
  // Found by the outside review, 2026-10-04 (batch networth 01): a bond with no value still added its
  // coupon to the top and nothing to the bottom, and accrued interest — which one bond's own yield
  // subtracts when it is known (his ruling A47, 2026-08-26) — was left in. Three bonds of which one was
  // unpriced read 6.09% where 4.22% is right.
  const clean = (b: BondInfo) => b.value - (b.accruedInterest ?? 0);
  const priced = list.filter((b) => clean(b) > 0 && yearlyInterest(b) != null);   // a bond with no rate is in neither half
  const cleanValue = priced.reduce((t, b) => t + clean(b), 0);
  const avgYield = cleanValue > 0 ? priced.reduce((t, b) => t + (yearlyInterest(b) ?? 0), 0) / cleanValue : null;
  // NEXT TO MATURE IS THE EARLIEST DATE AFTER TODAY — by the calendar, not the clock. A bond maturing
  // today has matured; it cannot also be next (the same review).
  const today = isoLocalDate(now);
  const future = list.map((b) => b.maturity).filter(Boolean).filter((m) => String(m).slice(0, 10) > today).sort();
  return { count: list.length, totalValue, totalFace, annualCoupon: coupon, avgYield, nextMaturity: future[0] ?? null };
}
/** Total annual coupon income across the user's INDIVIDUAL bonds (kept for the Bonds screen summary). */
/* ─ MK-NW-F-062 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * couponIncomeAnnual
 *
 * Answers ..... Total annual coupon income across the user's INDIVIDUAL bonds (kept for the Bonds screen summary).
 *
 * Formula .....
 *     Σ over accounts (or none when missing) where is bond of (yearly interest(bond info(each)) (or 0 when missing))
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-062
 * Changed ..... 2026-08-04 (abb4c23)
 */
export function couponIncomeAnnual(accounts: AssetAccount[]): number {
  // the same per-account rule as interestIncomeAnnual, so the Bonds screen and the income figure agree:
  // a CD typed by its balance used to count $0 here and balance × rate there (outside review, 2026-10-07)
  return ((accounts ?? []).filter(isBond).reduce((t, a) => t + (yearlyInterest(bondInfo(a)) ?? 0), 0));
}

/** Canonical annual INTEREST income across all interest-bearing holdings (Term #6). Individual
 *  bonds: face × coupon. A CD (class 'bonds', founder rule 2026-08-04) or a rate-stated cash account
 *  (HYSA) contributes balance × its stated rate. A bond FUND with no coupon rate contributes $0 —
 *  A46 (founder, 2026-08-26): if the coupon rate is not available use 0, never a built-in yield. */

/** The interest every bond, CD and rate-paying cash account pays in a year, added up, counting nothing for a holding that states no rate. */
/* ─ MK-NW-F-063 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * interestIncomeAnnual
 *
 * Answers ..... The interest every bond, CD and rate-paying cash account pays in a year, added up, counting nothing for a holding that states no rate.
 *
 * Formula .....
 *     today = iso local date(now)
 *     cls = asset class of(a)
 *     t   when maturity date and string(maturity date).slice(0, 10) < today
 *     the answer = t + (yearly interest(bond info(a)) ?? 0)
 *
 * Called by ... MK-NW-F-062 couponIncomeAnnual
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-062 couponIncomeAnnual
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-013 bond maturity date
 *
 * Decides .....
 *     · If coupon rate is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-063
 * Changed ..... 2026-08-04 (abb4c23)
 */
export function interestIncomeAnnual(accounts: AssetAccount[], now: Date = new Date()): number {
  const today = isoLocalDate(now);
  return ((accounts ?? []).reduce((t, a) => {
    const cls = assetClassOf(a);
    if (cls === 'bonds') {
      // a bond or CD whose maturity date has passed pays no further interest; it used to keep counting
      // a year's coupon (outside review, 2026-10-07)
      if (a.maturity_date && String(a.maturity_date).slice(0, 10) < today) return t;
      // face × rate; a CD with no face, balance × rate (founder rule 2026-08-04: CDs are bonds);
      // A46 (founder, 2026-08-26): no coupon rate → $0, never a built-in yield
      return t + (yearlyInterest(bondInfo(a)) ?? 0);
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
 *     c = annual coupon(b) (or 0 when missing)
 *     pv = 0
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-NW-F-064 bondRateSensitivity
 *
 * Reaches ..... 83 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-077 ALL · MK-NW-F-076 ALT
 *               MK-NW-F-088 BENCH · MK-CF-F-205 COMING
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-NW-F-078 ONE · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               … and 65 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-011 bond face value
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-049 bond price — what the bond is worth today
 *
 * Decides .....
 *     · If face is missing it uses 0.
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
  const c = annualCoupon(b) ?? 0;
  let pv = 0;
  for (let t = 1; t <= n; t++) pv += c / Math.pow(1 + y, t);
  pv += (b.face ?? 0) / Math.pow(1 + y, n);
  return pv;
}

/* ─ MK-NW-F-064 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * bondRateSensitivity
 *
 * Answers ..... What happens to this bond if interest rates move?
 *
 * Formula .....
 *     ytm = approx ytm(b, now)
 *     nothing   when is cd (or ytm = nothing (or face = nothing (or face ≤ 0 (or not (coupon rate ≠ nothing and coupon rate > 0) when missing or zero) when missing or zero) when missing or zero) when missing or zero)
 *     step = (10)^(max(0, round down(math.log10(math.max(value, 1))) − 2))
 *     base = price at yield(b, ytm, now)
 *     change = price at yield(b, math.max(0.0001, ytm + delta), now) − base
 *     v = value + change
 *     the answer:
 *     rates up = move(0.01)
 *     rates down = move(-0.01)
 *
 * Called by ... MK-NW-O-001 theBonds
 *
 * Reaches ..... 82 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-077 ALL · MK-NW-F-076 ALT
 *               MK-NW-F-088 BENCH · MK-CF-F-205 COMING
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-NW-F-078 ONE · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               … and 64 more — the full list is on functions_from_code
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
 *     · Never lets value fall below 1.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-064
 * Changed ..... 2026-07-13 (d058ce1)
 */
export function bondRateSensitivity(b: BondInfo, now: Date = new Date()): RateSensitivity | null {
  const ytm = approxYTM(b, now);
  // a CD is not traded, so its value does not move with rates (owner, 2026-09-27) — refused here, not
  // only by the screen (outside review, 2026-10-07); no coupon or no face, nothing to reprice
  if (b.isCd || ytm == null || b.face == null || b.face <= 0 || !(b.couponRate != null && b.couponRate > 0)) return null;
  // three figures of the bond's own size: $1,000 from $100,000, $100 from $10,000, $10 below that
  const step = Math.pow(10, Math.max(0, Math.floor(Math.log10(Math.max(b.value, 1))) - 2));
  // THE CHANGE IS MEASURED WITHIN ONE MODEL (outside review, 2026-10-07): the price at the moved yield
  // less the price at today's yield, both on the same whole-year grid, then applied to today's value.
  // Taking the moved price less today's value mixed the rate effect with the grid's own error.
  const base = priceAtYield(b, ytm, now);
  const move = (delta: number): RateMove => {
    const change = priceAtYield(b, Math.max(0.0001, ytm + delta), now) - base;
    const v = b.value + change;
    return {
      // a rough, honest band — not a fake-precise number. It was rounded to the nearest $1,000 whatever
      // the bond's size, so a $10,000 bond read "$10,000 to $10,000" whichever way rates moved (the
      // outside review, 2026-10-04). Rounded now in proportion to the bond.
      low: Math.round((v * 0.99) / step) * step,
      high: Math.round((v * 1.01) / step) * step,
      delta: Math.round(change / step) * step,
    };
  };
  return { ratesUp: move(0.01), ratesDown: move(-0.01) };
}
