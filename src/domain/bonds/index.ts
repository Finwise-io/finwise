// Individual bonds (Phase B). A bond is held as an AssetAccount with bond fields (face_value,
// coupon_rate, maturity_date); its `balance` is the current value, so it flows into Net Worth and the
// nest egg via the existing balance machinery. These pure helpers compute the bond-specific metrics.
import { plural } from '../_shared/plural';   // the one list of words and plurals (DEC-4082, 2026-10-10)
import type { AssetAccount } from '../assets';
import { assetClassOf } from '../assets';
import { isoLocalDate, maturityParts } from '../_shared/dates';
// THE ONE READING OF A MATURITY DATE lives beside the other date helpers, so the class of an account (assets) and
// the holding-class rules read it too; it is still offered from here, where it always was (MK-NW-F-124, 2026-10-13)
export { maturityParts };

export interface BondInfo {
  /** What it pays back at maturity — as entered, or null when never entered (outside review, 2026-10-07: a face read as $0 made a −274% yield). */
  face: number | null;
  /** The yearly rate — as entered, or null when never entered; a typed 0 is a zero-coupon bond. */
  couponRate: number | null;
  maturity: string;
  /** Its MARKET value — what every yield is worked on. 0 when no market value was entered (DEC-0281): a yield worked on
   *  what was paid or on the face value would be printed as a yield on today's value, which it is not. */
  value: number;
  /** (DEC-0281) The value the screens show and the totals add, by the one value rule (bondValue), WHEN IT IS NOT THE
   *  MARKET VALUE: what was paid, or the face value; null = Value not entered, left out of every total. Absent = the
   *  market value, `value` — so a bond with a market value reads exactly as it always has. */
  shown?: number | null;
  /** (DEC-0281) Where the value shown comes from. Absent reads as 'market'. */
  basis?: BondValueBasis;
  /** (DEC-0281, MK-XS-I-067) What the person paid for it, as entered. Absent = not entered. */
  paid?: number;
  accruedInterest?: number | null;
  /** A certificate of deposit: not traded, so its value does not move with rates (owner, 2026-09-27). */
  isCd?: boolean;
  /** (DEC-3837, 2026-10-10) Where a CD was bought — 'bank' or 'broker'; not answered reads as 'bank'. */
  cdBought?: 'bank' | 'broker';
  /** (2026-10-20, under DEC-3390; MK-XS-I-069) How many times a year it pays its interest, as entered: 1 or 2. Absent = not
   *  entered, read as once a year. */
  couponsPerYear?: 1 | 2;
}

/** (DEC-3837, 2026-10-10) THE ONE TEST of whether a holding is priced like a bond: every bond is, and a CD
 *  only when it was bought through a broker. A bank CD yields its stated rate and does not move with
 *  rates; a broker CD trades, so its yield is solved from its price and it gets the if-rates-move estimate. */
/* ─ MK-NW-F-131 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * pricedLikeBond
 *
 * Answers ..... (DEC-3837, 2026-10-10) THE ONE TEST of whether a holding is priced like a bond: every bond is, and a CD only when it was bought through a broker.
 *
 * Formula .....
 *     is cd is missing (or cd bought = 'broker' when missing or zero)
 *
 * Called by ... MK-NW-F-060 approxYTM · MK-NW-F-064 bondRateSensitivity
 *               MK-NW-F-072 rowOf · MK-NW-F-119 estimatedAccrued
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
 * Reads ....... MK-XS-I-011 bond face value
 *               MK-XS-I-049 bond price — what the bond is worth today
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-131
 * Changed ..... not in git yet (—)
 */
export function pricedLikeBond(b: BondInfo): boolean {
  return !b.isCd || b.cdBought === 'broker';
}

/** (DEC-0281, 2026-08-26) Where a bond's or CD's value comes from: the market value entered, what was paid, its face value,
 *  or nothing at all. */
export type BondValueBasis = 'market' | 'paid' | 'face' | 'none';
/** Whether a figure is an amount: a number that is finite. Nothing, text and not-a-number are not amounts. */
/* ─ MK-NW-F-155 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * knownAmount
 *
 * Answers ..... Whether a figure is an amount: a number that is finite.
 *
 * Formula .....
 *     typeof v = 'number' and number.is finite(v)
 *
 * Called by ... MK-NW-F-056 bondInfo · MK-NW-F-156 bondValue
 *               MK-NW-F-157 bondValueOf · MK-NW-F-159 settleBondValue
 *               MK-NW-F-160 pricePer100OfFace
 *
 * Reaches ..... 268 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-NW-F-080 HOLD
 *               MK-CF-F-201 INCOME · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               … and 250 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-155
 * Changed ..... not in git yet (—)
 */
const knownAmount = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** THE ONE VALUE RULE FOR A BOND OR CD HELD AS ITS OWN ACCOUNT (DEC-0281, 2026-08-26, his words: "the Value of Bond
 *  displayed should be Current Value if available, if not, cost value, if not face value"): the market value entered;
 *  else what was paid; else the face value; else nothing — "Value not entered" (DEC-3657), left out of every total.
 *  A typed 0 is a value of $0 (DEC-2748b); a face value of 0 or less is not a face value. */
/* ─ MK-NW-F-156 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * bondValue
 *
 * Answers ..... THE ONE VALUE RULE FOR A BOND OR CD HELD AS ITS OWN ACCOUNT (DEC-0281, 2026-08-26, his words: "the Value of Bond displayed should be Current Value if available, if not, cost value, if not face value"): the market value entered; else what was paid; else the face value; else nothing — "Value not entered" (DEC-3657), left out of every total.
 *
 * Formula .....
 *     value = market
 *     basis = 'market'   when known amount(market)
 *     value = paid
 *     basis = 'paid'   when known amount(paid)
 *     value = face
 *     basis = 'face'   when known amount(face) and face > 0
 *     value = nothing
 *     basis = 'none'
 *
 * Called by ... MK-NW-F-071 isCertificateOfDeposit · MK-NW-F-078 ONE
 *               MK-NW-F-159 settleBondValue
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
 * Reads ....... MK-XS-I-011 bond face value
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-156
 * Changed ..... not in git yet (—)
 */
export function bondValue(f: { market?: number | null; paid?: number | null; face?: number | null }): { value: number | null; basis: BondValueBasis } {
  if (knownAmount(f.market)) return { value: f.market, basis: 'market' };
  if (knownAmount(f.paid)) return { value: f.paid, basis: 'paid' };
  if (knownAmount(f.face) && f.face > 0) return { value: f.face, basis: 'face' };
  return { value: null, basis: 'none' };
}

/** What a bond or CD held as its own account is worth, and where that figure came from — read off the account as the one
 *  value rule stored it (settleBondValue): its balance, from the market unless the account says it is what was
 *  paid or its face value; nothing when it has no balance. The same balance every other screen reads, so they agree. */
/* ─ MK-NW-F-157 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * bondValueOf
 *
 * Answers ..... What a bond or CD held as its own account is worth, and where that figure came from — read off the account as the one value rule stored it (settleBondValue): its balance, from the market unless the account says it is what was paid or its face value; nothing when it has no balance.
 *
 * Formula .....
 *     value = nothing
 *     basis = 'none'   when !known amount(balance)
 *     value = balance
 *     basis = value basis (or 'market' when missing)
 *
 * Called by ... MK-NW-F-056 bondInfo
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
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-011 bond face value
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-157
 * Changed ..... not in git yet (—)
 */
export function bondValueOf(a: { balance?: number | null; value_basis?: 'paid' | 'face' }): { value: number | null; basis: BondValueBasis } {
  if (!knownAmount(a.balance)) return { value: null, basis: 'none' };
  return { value: a.balance, basis: a.value_basis ?? 'market' };
}

/** THE SENTENCE BESIDE A BOND'S OR CD'S VALUE when it is not a market value (DEC-0281), so the person can see how the figure
 *  was made: what was paid, or the face value, because no market value was entered. Nothing for a market value or none. */
/* ─ MK-NW-F-158 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * bondValueNote
 *
 * Answers ..... THE SENTENCE BESIDE A BOND'S OR CD'S VALUE when it is not a market value (DEC-0281), so the person can see how the figure was made: what was paid, or the face value, because no market value was entered.
 *
 * Formula .....
 *     'the value shown is what you paid — no market value entered.'   when basis = 'paid'
 *     'the value shown is the face value — no market value entered.'   when basis = 'face'
 *     nothing
 *
 * Called by ... MK-NW-F-072 rowOf
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
 * Reads ....... MK-XS-I-011 bond face value
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-158
 * Changed ..... not in git yet (—)
 */
export function bondValueNote(basis: BondValueBasis): string | null {
  if (basis === 'paid') return 'The value shown is what you paid — no market value entered.';
  if (basis === 'face') return 'The value shown is the face value — no market value entered.';
  return null;
}

/** THE ONE VALUE RULE, WRITTEN ONTO THE ACCOUNT (DEC-0281). Every screen that adds up money reads an account's balance, so
 *  a bond or CD with no market value entered is given the balance the rule picks — what was paid, else its face value —
 *  marked with where it came from, and the market-value box stays blank when it is opened again. A balance written
 *  without a basis (a value typed in any editor, or sent by a broker) is a market value, and clears the mark. With no
 *  market value, nothing paid and no face value it keeps no balance: Value not entered, left out of every total.
 *  `update` is the change being saved; the answer is the account as it should be stored. Not a bond: unchanged.
 *  `before` is the account as it was: an editor that saves every box hands back the balance it was opened with, and that
 *  same figure is not a market value someone entered — a face value saved again stays a face value, and says so. */
/* ─ MK-NW-F-159 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * settleBondValue
 *
 * Answers ..... THE ONE VALUE RULE, WRITTEN ONTO THE ACCOUNT (DEC-0281).
 *
 * Formula .....
 *     resaved = before.value basis ≠ nothing and update ≠ nothing and update.balance = before.balance
 *     typed market = update ≠ nothing and 'balance' in update and !('value_basis' in update) and !resaved
 *     basis now = undefined   if typed market
 *     merged.value basis   otherwise
 *     merged   when basis now = nothing and !is bond(merged as asset account)
 *     market = nothing   if basis now ≠ nothing
 *     merged.balance   otherwise
 *     merged   when merged.value basis = nothing
 *     out = { ...merged }; delete (out as any).value basis; return out
 *     r = bond value({ market, paid: merged.amount paid, face: merged.face value })
 *     out = ...merged = ...merged
 *     balance = value (or undefined when missing)
 *     the answer = out
 *
 * Called by ... MK-NW-F-156 bondValue · MK-XS-F-102 ingestSync
 *               MK-XS-F-175 uid
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
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-011 bond face value
 *               MK-XS-I-067 what was paid for a bond or CD held as its own account
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-159
 * Changed ..... not in git yet (—)
 */
export function settleBondValue<T extends Partial<AssetAccount>>(merged: T, update?: Partial<AssetAccount>, before?: Partial<AssetAccount>): T {
  const resaved = before?.value_basis != null && update != null && update.balance === before.balance;
  const typedMarket = update != null && 'balance' in update && !('value_basis' in update) && !resaved;
  const basisNow = typedMarket ? undefined : merged.value_basis;
  // a bond or CD by the one test of a bond (MK-NW-F-055 isBond: its asset class is Bonds & CDs)
  if (basisNow == null && !isBond(merged as AssetAccount)) return merged;
  const market = basisNow != null ? null : merged.balance;
  if (basisNow == null && knownAmount(market)) {
    if (merged.value_basis == null) return merged;
    const out = { ...merged }; delete (out as any).value_basis; return out;
  }
  const r = bondValue({ market, paid: merged.amount_paid, face: merged.face_value });
  const out: any = { ...merged, balance: r.value ?? undefined };
  if (r.basis === 'paid' || r.basis === 'face') out.value_basis = r.basis; else delete out.value_basis;
  if (r.value == null) delete out.balance;
  return out;
}
// whole words, capitals ignored: CD(s), certificate(s) of deposit, share certificate(s) — 'ABCD Growth Fund' is not one
const CD_WORDS = /\b(cds?|certificates? of deposit|share certificates?)\b/i;

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
 * Called by ... MK-NW-F-062 couponIncomeAnnual · MK-NW-F-159 settleBondValue
 *               MK-NW-O-001 theBonds
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
 *     face = face value   when it is above 0;   nothing otherwise
 *     coupon rate = coupon rate as entered (a typed 0 kept);   nothing when not entered
 *     maturity = maturity date or ''
 *     value = balance or 0
 *     accrued interest = the entered figure, or nothing when not entered
 *     is a CD = kind is 'cd', or the name or institution says CD or certificate of deposit
 *     where a CD was bought = 'broker'   when the person said so;   'bank' otherwise (DEC-3837, 2026-10-10)
 *
 * Called by ... MK-NW-F-062 couponIncomeAnnual · MK-NW-F-063 interestIncomeAnnual
 *               MK-NW-F-071 isCertificateOfDeposit · MK-NW-F-072 rowOf
 *               MK-NW-O-001 theBonds
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
 * Reads ....... MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-049 bond price — what the bond is worth today
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-065 accrued interest on a bond — interest earned since the last coupon
 *               MK-XS-I-067 what was paid for a bond or CD held as its own account
 *               MK-XS-I-069 how many times a year a bond or CD pays its interest — once or twice
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-056
 * Changed ..... 2026-06-06 (2c5ce55)
 */
export function bondInfo(a: AssetAccount): BondInfo {
  // THE VALUE BY THE ONE VALUE RULE (DEC-0281, 2026-08-26): shown = the account's balance as the rule stored it, with where
  // it came from; the yields are worked on a MARKET value only, so a value that is what was paid or the face value gives
  // them nothing to work on and they refuse (0 below), as a bond with no value always has.
  const v = bondValueOf(a);
  const ruled = v.basis === 'market' ? {} : { shown: v.value, basis: v.basis };
  // EACH FIGURE AS ENTERED, AND NOT ENTERED WHEN IT WAS NOT (outside review, 2026-10-07). A face value
  // or a rate read as $0 flowed into every figure below: a CD typed with only its balance showed a yield
  // to maturity of −274%, and a bond with no rate showed a current yield of 0.00% instead of nothing.
  return { ...ruled, ...(knownAmount(a.amount_paid) ? { paid: a.amount_paid } : {}),
           face: a.face_value != null && a.face_value > 0 ? a.face_value : null,
           couponRate: a.coupon_rate == null ? null : a.coupon_rate,
           // THE MATURITY DATE BY THE ONE READING (MK-NW-F-124, 2026-10-13): a real day, written year-month-day, or
           // nothing — so a text that is no date reads "maturity date not entered" on every screen, never as written
           maturity: ((p) => (p ? `${p[0]}-${String(p[1]).padStart(2, '0')}-${String(p[2]).padStart(2, '0')}` : ''))(maturityParts(a.maturity_date)),
           value: v.basis === 'market' ? (v.value as number) : 0,
           accruedInterest: a.accrued_interest == null ? null : a.accrued_interest,
           // A CD IS TOLD BY THE ACCOUNT'S OWN NAME OR TYPE, NEVER ITS INSTITUTION (DEC-4036c, 2026-10-10): a
           // brokerage account at "CD Capital" is not a CD — the institution names the firm, not what is held.
           isCd: (a.kind as string) === 'cd' || CD_WORDS.test(a.label ?? ''),
           // (DEC-3837, 2026-10-10) bought through a broker only when the person said so; anything else is a bank CD
           cdBought: a.cd_bought === 'broker' ? 'broker' : 'bank',
           // how often it pays, only when entered — not entered reads as once a year (the estimate's own assumption)
           ...(a.coupons_per_year === 1 || a.coupons_per_year === 2 ? { couponsPerYear: a.coupons_per_year } : {}) };
}

/** A BOND'S PRICE PER $100 OF FACE — the way a broker quotes one (Q38 part 3, decided 2026-10-20 under DEC-0281: calculated,
 *  not a field): its market value ÷ its face value × 100. Worth $9,850 on $10,000 of face is $98.50. Nothing unless both a
 *  market value and a face value were entered — a value that is what was paid or the face itself is no price. */
/* ─ MK-NW-F-160 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * pricePer100OfFace
 *
 * Answers ..... A BOND'S PRICE PER $100 OF FACE — the way a broker quotes one (Q38 part 3, decided 2026-10-20 under DEC-0281: calculated, not a field): its market value ÷ its face value × 100.
 *
 * Formula .....
 *     nothing   when (basis ?? 'market') ! = 'market' (or face = nothing when missing or zero)
 *     market = shown   if shown ! = undefined
 *     value   otherwise
 *     the answer:
 *     (market ÷ face) × 100   if known amount(market)
 *     nothing   otherwise
 *
 * Called by ... MK-NW-F-071 isCertificateOfDeposit · MK-NW-F-072 rowOf
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
 * Reads ....... MK-XS-I-011 bond face value
 *               MK-XS-I-049 bond price — what the bond is worth today
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-160
 * Changed ..... not in git yet (—)
 */
export function pricePer100OfFace(b: BondInfo): number | null {
  if ((b.basis ?? 'market') !== 'market' || b.face == null) return null;
  const market = b.shown !== undefined ? b.shown : b.value;
  return knownAmount(market) ? (market / b.face) * 100 : null;
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
 * Called by ... MK-NW-F-069 priceAtYield · MK-NW-O-001 theBonds
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
 *     shown of(b) × coupon rate   otherwise
 *
 * Called by ... MK-NW-F-059 currentYield · MK-NW-F-061 bondSummary
 *               MK-NW-F-126 yearlyInterestNow · MK-NW-O-001 theBonds
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
 * Reads ....... MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-049 bond price — what the bond is worth today
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-112
 * Changed ..... not in git yet (—)
 */
export function yearlyInterest(b: BondInfo): number | null {
  if (b.couponRate == null) return null;
  // with no face, the value shown (DEC-0281: a CD typed with what was paid and no market value pays on what was paid).
  // HIS RULING DEC-2748c (2026-10-07, TESTED): "face × rate; with no face, value × rate" — kept on 2026-10-21 against the
  // Performance re-run's point that a bond with no face should have no figure: a ruling of his decides it; the conflict
  // with tenet 3 is the lead's to put to the record.
  return b.face != null ? b.face * b.couponRate : shownOf(b) * b.couponRate;
}
/** The value a bond's figures are added up on: the one value rule's answer (DEC-0281), 0 when Value not entered — so it adds
 *  nothing and is named as left out; a BondInfo built by hand, with no rule's answer on it, adds its value. */
/* ─ MK-NW-F-161 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * shownOf
 *
 * Answers ..... The value a bond's figures are added up on: the one value rule's answer (DEC-0281), 0 when Value not entered — so it adds nothing and is named as left out; a BondInfo built by hand, with no rule's answer on it, adds its value.
 *
 * Formula .....
 *     shown (or 0 when missing)   if shown ! = undefined
 *     value   otherwise
 *
 * Called by ... MK-NW-F-061 bondSummary · MK-NW-F-112 yearlyInterest
 *
 * Reaches ..... 268 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-NW-F-080 HOLD
 *               MK-CF-F-201 INCOME · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               … and 250 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-049 bond price — what the bond is worth today
 *
 * Decides .....
 *     · If shown is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-161
 * Changed ..... not in git yet (—)
 */
const shownOf = (b: BondInfo): number => (b.shown !== undefined ? (b.shown ?? 0) : b.value);
/** Whether a bond or CD is past its maturity date — the day after it, by the calendar. No date, or an impossible one, is unknown, not matured. */
/* ─ MK-NW-F-125 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * isPastMaturity
 *
 * Answers ..... Whether a bond or CD is past its maturity date — the day after it, by the calendar.
 *
 * Formula .....
 *     p = maturity parts(maturity)
 *     false   when p = nothing
 *     iso = `${p[0]}-${string(p[1]).pad start(2, '0')}-${string(p[2]).pad start(2, '0')}`
 *     the answer = iso < iso local date(now)
 *
 * Called by ... MK-NW-F-061 bondSummary · MK-NW-F-126 yearlyInterestNow
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
 * Reads ....... MK-XS-I-013 bond maturity date
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-125
 * Changed ..... not in git yet (—)
 */
export function isPastMaturity(maturity: string, now: Date = new Date()): boolean {
  // the one test every interest figure uses (outside review OpenAI final, 2026-10-09, DEC-2748d + DEC-2748c)
  const p = maturityParts(maturity);
  if (p == null) return false;
  const iso = `${p[0]}-${String(p[1]).padStart(2, '0')}-${String(p[2]).padStart(2, '0')}`;
  return iso < isoLocalDate(now);
}

/** A year's interest from one bond or CD as it pays today: its yearly interest, and $0 once it is past its maturity date. */
/* ─ MK-NW-F-126 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * yearlyInterestNow
 *
 * Answers ..... A year's interest from one bond or CD as it pays today: its yearly interest, and $0 once it is past its maturity date.
 *
 * Formula .....
 *     0   if is past maturity(maturity, now)
 *     yearly interest(b)   otherwise
 *
 * Called by ... MK-NW-F-061 bondSummary · MK-NW-F-062 couponIncomeAnnual
 *               MK-NW-F-063 interestIncomeAnnual · MK-NW-F-072 rowOf
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
 * Reads ....... MK-XS-I-013 bond maturity date
 *               MK-XS-I-049 bond price — what the bond is worth today
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-126
 * Changed ..... not in git yet (—)
 */
export function yearlyInterestNow(b: BondInfo, now: Date = new Date()): number | null {
  // a matured bond pays no more interest, by one rule for every figure (outside review OpenAI final, 2026-10-09, DEC-2748d + DEC-2748c)
  return isPastMaturity(b.maturity, now) ? 0 : yearlyInterest(b);
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
 * Reads ....... MK-XS-I-013 bond maturity date
 *
 * Decides .....
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
  const parts = maturityParts(maturity);   // an impossible date such as 2026-02-30 is unknown too (outside review OpenAI final, 2026-10-09, DEC-0332)
  if (parts == null) return null;
  // EXACT YEARS, BY ANNIVERSARIES (outside review batch 06, 2026-10-07): the whole years counted back
  // from the maturity date while still on or after today, plus the days left to the first of those
  // anniversaries ÷ the days in that year. 2026-10-07 → 2028-10-07 is exactly 2.0, and 2029-04-15 is
  // 2 + 190/365. It was days ÷ 365.25, which put a bond exactly one year away at 0.9993 years. By the
  // calendar date, never the time of day.
  const [y, m, d] = parts;
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const at = (yy: number) => Date.UTC(yy, (m || 1) - 1, d || 1);
  if (at(y) <= today) return 0;
  let n = 0;
  while (at(y - n - 1) >= today) n++;
  const first = at(y - n);
  const days = Math.round((first - today) / 86400000);
  const yearDays = Math.round((first - at(y - n - 1)) / 86400000);
  return n + days / yearDays;
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
 * Reads ....... MK-XS-I-049 bond price — what the bond is worth today
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-059
 * Changed ..... 2026-06-06 (2c5ce55)
 */
export function currentYield(b: BondInfo): number | null {
  // HIS RULING, 2026-10-09 (replacing A47): the value typed is the statement's market value, which does
  // NOT include accrued interest — so the yield on today's value is on that value as entered.
  const clean = b.value;
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
 *     nothing   when accrued interest ≠ nothing
 *     est = estimated accrued(b, now)
 *     nothing   when est = nothing
 *     pct = `${+((coupon rate as number) × 100).to fixed(3)}%`
 *     the answer = `added estimated $${math.round(est.amount).to locale string('en − US')} in accrued interest to bond value at ${pct} coupon for ${plural(est.days, 'day')} to calculate YTM. if this is not accurate, enter actual accrued interest`
 *
 * Called by ... MK-NW-F-072 rowOf
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
 * Reads ....... MK-XS-I-012 bond coupon rate
 *               MK-XS-I-049 bond price — what the bond is worth today
 *               MK-XS-I-065 accrued interest on a bond — interest earned since the last coupon
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · Rounds the answer to a whole number.
 *     · Shows 3 decimal places.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-070
 * Changed ..... not in git yet (—)
 */
export function accruedInterestCaveat(b: BondInfo, now: Date = new Date()): string | null {
  // HIS WORDS, 2026-10-09: when accrued interest is not entered, the estimate is added and the screen says
  // so — "Added estimated $1,119 in accrued interest to bond value at 4.5% coupon for 363 days to
  // calculate YTM. If this is not accurate, enter actual accrued interest". Only where an estimate was
  // used: a bond that pays interest, not a bank CD (its yield is its stated rate), not matured. A CD bought
  // through a broker is priced like a bond and carries the note too (DEC-3837, 2026-10-10).
  if (b.accruedInterest != null) return null;
  const est = estimatedAccrued(b, now);
  if (est == null) return null;
  const pct = `${+((b.couponRate as number) * 100).toFixed(3)}%`;
  return `Added estimated $${Math.round(est.amount).toLocaleString('en-US')} in accrued interest to bond value at ${pct} coupon for ${plural(est.days, 'day')} to calculate YTM. If this is not accurate, enter actual accrued interest`;
}

/** The interest a bond has earned since its last coupon, estimated from the coupon schedule — face × rate ÷ payments a year × days since the last payment ÷ days between payments, the payments stepping back from the maturity date (once a year when how often it pays was not entered); nothing for a bank CD, a matured or undated bond, or one with no face or rate. */
/* ─ MK-NW-F-119 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * estimatedAccrued
 *
 * Answers ..... The interest a bond has earned since its last coupon, estimated from the coupon schedule — face × rate ÷ payments a year × days since the last payment ÷ days between payments, the payments stepping back from the maturity date (once a year when how often it pays was not entered); nothing for a bank CD, a matured or undated bond, or one with no face or rate.
 *
 * Formula .....
 *     nothing   when !priced like bond(b) (or face = nothing (or not (coupon rate ≠ nothing and coupon rate > 0) (or maturity is missing when missing or zero) when missing or zero) when missing or zero)
 *     parts = maturity parts(maturity)
 *     nothing   when parts = nothing
 *     today = date.UTC(now.get full year(), now.get month(), now.get date())
 *     per year = 2   if coupons per year = 2
 *     1   otherwise
 *     step months = 12 ÷ per year
 *     mm = (m or 1) − 1 − k × step months
 *     yy = y + round down(mm ÷ 12), mo = ((mm % 12) + 12) % 12
 *     last day = the date date.UTC(yy, mo + 1, 0)).get utcdate(
 *     nothing   when at(0) ≤ today
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-060 approxYTM · MK-NW-F-070 accruedInterestCaveat
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
 * Reads ....... MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-049 bond price — what the bond is worth today
 *               MK-XS-I-069 how many times a year a bond or CD pays its interest — once or twice
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-119
 * Changed ..... not in git yet (—)
 */
export function estimatedAccrued(b: BondInfo, now: Date = new Date()): { amount: number; days: number } | null {
  // a bank CD has no accrued-interest estimate; a broker CD is priced like a bond and does (DEC-3837, 2026-10-10)
  if (!pricedLikeBond(b) || b.face == null || !(b.couponRate != null && b.couponRate > 0) || !b.maturity) return null;
  const parts = maturityParts(b.maturity);   // an impossible date gives no estimate (outside review OpenAI final, 2026-10-09, DEC-0332)
  if (parts == null) return null;
  const [y, m, d] = parts;
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  // HOW OFTEN IT PAYS (2026-10-20, under DEC-3390; MK-XS-I-069). The payment dates step back from the maturity date by
  // 12 ÷ payments a year months: once a year, every 12 months; twice a year, every 6. Not entered: once a year, the
  // estimate's assumption until now. A day the month does not have is that month's last day (a Mar 31 bond pays Sep 30).
  const perYear = b.couponsPerYear === 2 ? 2 : 1;
  const stepMonths = 12 / perYear;
  const at = (k: number) => {
    const mm = (m || 1) - 1 - k * stepMonths;
    const yy = y + Math.floor(mm / 12), mo = ((mm % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(yy, mo + 1, 0)).getUTCDate();
    return Date.UTC(yy, mo, Math.min(d || 1, lastDay));
  };
  if (at(0) <= today) return null;
  let n = 0;
  while (at(n + 1) >= today) n++;
  const next = at(n), last = at(n + 1);
  if (next === today) return null;            // a payment made today leaves nothing accrued
  const days = Math.round((today - last) / 86400000);
  const periodDays = Math.round((next - last) / 86400000);
  // one payment is face × rate ÷ payments a year; the part of it earned is the days since the last payment ÷ the days
  // between the two payments
  return { amount: b.face * b.couponRate / perYear * days / periodDays, days };
}
/** Yield to maturity, solved from the price, decimal; a CD bought from the bank yields its rate (DEC-3837, 2026-10-10). null if matured / no value. */
/* ─ MK-NW-F-060 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * approxYTM
 *
 * Answers ..... Yield to maturity, solved from the price, decimal; a CD bought from the bank yields its rate (DEC-3837, 2026-10-10).
 *
 * Formula .....
 *     nothing   when there is no maturity date or it has passed
 *     a CD bought from the bank (not priced like a bond): the answer = its interest rate (DEC-3837, 2026-10-10)
 *     nothing   when no face value or no rate was entered, or the value is 0 or less
 *     full price = value + accrued interest (as entered, else estimated accrued)
 *     the answer = the yield y at which price at yield(y) = full price, found by halving the interval
 *
 * Called by ... MK-NW-F-064 bondRateSensitivity · MK-NW-F-072 rowOf
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
 * Reads ....... MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-049 bond price — what the bond is worth today
 *               MK-XS-I-065 accrued interest on a bond — interest earned since the last coupon
 *
 * Decides .....
 *     · If amount is missing it uses 0.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · 'value' is the bond's current value as entered (the balance) — the SAME total basis as face, not a price per $100 (founder question G20, 2026-09-08).
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-060
 * Changed ..... 2026-06-06 (2c5ce55)
 */
export function approxYTM(b: BondInfo, now: Date = new Date()): number | null {
  // THE YIELD THAT PRICES THE BOND AT WHAT IT IS WORTH, SOLVED (outside review batch 06, 2026-10-07). It
  // was the textbook approximation, which breaks down for a short bond: a $10,000 4% note five months
  // from maturity, worth $10,180, read −0.69% where 5.73% is right. Now the yield y at which
  // priceAtYield equals the clean price (value less accrued interest when entered — his rule A47),
  // found by halving the interval to well under 0.0001. Nothing when matured, with no date, no face, no
  // rate, or a clean price of zero or less.
  const n = yearsToMaturity(b.maturity, now);
  if (n == null || n <= 0) return null;
  // A BANK CD HELD TO MATURITY YIELDS ITS STATED RATE. It is not bought at a market price, and its balance
  // is principal plus interest credited; priced as a yearly-coupon bond, a $10,000 CD at 5.05% five
  // months from maturity read 11.30%. (2026-10-08) It needs no face value: a bank CD with a rate and no
  // face yields its rate. A CD BOUGHT THROUGH A BROKER is priced like a bond below — its rate is the
  // coupon and its yield can differ ($10,000 face, 4.2%, worth $9,850, two years left: about 5.0%).
  // (DEC-3837, 2026-10-10)
  if (!pricedLikeBond(b)) return b.couponRate;
  if (b.face == null || b.couponRate == null) return null;
  // THE FULL PRICE = THE VALUE AS ENTERED + ACCRUED INTEREST (his ruling, 2026-10-09). A statement's
  // market value leaves out the interest earned since the last coupon, but a buyer pays it; what the
  // bond will still pay, discounted, equals that full price. Accrued interest as entered, else estimated
  // from the coupon schedule (and the screen says so). A $25,000 4.5% Treasury worth $24,200 two days
  // before its coupon read 7.44% on $24,200; on $25,319 it is 5.69%.
  if (b.value <= 0) return null;
  const full = b.value + (b.accruedInterest ?? estimatedAccrued(b, now)?.amount ?? 0);
  let lo = -0.99, hi = 10;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const p = priceAtYield(b, mid, now);
    if (p == null) return null;
    if (p > full) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
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
 *     total value = Σ over list of (shown of(each))
 *     total face = Σ over list of (face (or 0 when missing))
 *     coupon = Σ over list of (yearly interest now(each, now) (or 0 when missing))
 *     clean = (b: bond info) => value
 *     priced = list where clean(each) > 0 and yearly interest(each) ≠ nothing and !is past maturity(maturity, now)
 *     clean value = Σ over priced of (clean(each))
 *     avg yield = Σ over clean value > 0 ? priced of (yearly interest(each) (or 0 when missing))÷ clean value : nothing
 *     today = iso local date(now)
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
 * Reads ....... MK-XS-I-011 bond face value
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-049 bond price — what the bond is worth today
 *
 * Decides .....
 *     · If face is missing it uses 0.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-061
 * Changed ..... 2026-06-22 (2a41cac)
 */
export function bondSummary(bonds: BondInfo[], now: Date = new Date()): BondSummary {
  const list = bonds ?? [];
  // the value each bond SHOWS, by the one value rule (DEC-0281): a market value, what was paid, or the face value; a bond
  // whose value was not entered adds nothing and is named as left out (MK-NW-O-001), the way Net worth leaves it out
  const totalValue = (list.reduce((t, b) => t + shownOf(b), 0));
  const totalFace = (list.reduce((t, b) => t + (b.face ?? 0), 0));
  // a CD by its balance counts its balance × rate; a matured bond counts $0 (outside review OpenAI final, 2026-10-09, DEC-2748d)
  const coupon = (list.reduce((t, b) => t + (yearlyInterestNow(b, now) ?? 0), 0));
  // THE AVERAGE YIELD IS OVER THE BONDS THAT HAVE A VALUE TODAY, ON THAT VALUE LESS ACCRUED INTEREST.
  // Found by the outside review, 2026-10-04 (batch networth 01): a bond with no value still added its
  // coupon to the top and nothing to the bottom, and accrued interest — which one bond's own yield
  // subtracts when it is known (his ruling A47, 2026-08-26) — was left in. Three bonds of which one was
  // unpriced read 6.09% where 4.22% is right.
  const clean = (b: BondInfo) => b.value;   // the statement value, without accrued interest (his ruling, 2026-10-09)
  // a bond with no rate is in neither half; nor is a matured one, which pays nothing more (outside review OpenAI final, 2026-10-09, DEC-2748d)
  const priced = list.filter((b) => clean(b) > 0 && yearlyInterest(b) != null && !isPastMaturity(b.maturity, now));
  const cleanValue = priced.reduce((t, b) => t + clean(b), 0);
  const avgYield = cleanValue > 0 ? priced.reduce((t, b) => t + (yearlyInterest(b) ?? 0), 0) / cleanValue : null;
  // NEXT TO MATURE IS THE EARLIEST DATE AFTER TODAY — by the calendar, not the clock. A bond maturing
  // today has matured; it cannot also be next (the same review).
  const today = isoLocalDate(now);
  // read by the one reading of a maturity date (MK-NW-F-124, 2026-10-13): a text that is no date is not next, and
  // the date is written back the one way, year-month-day
  const future = list.map((b) => maturityParts(b.maturity)).filter((p): p is [number, number, number] => p != null)
    .map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`).filter((m) => m > today).sort();
  return { count: list.length, totalValue, totalFace, annualCoupon: coupon, avgYield, nextMaturity: future[0] ?? null };
}
/** Total annual coupon income across the user's INDIVIDUAL bonds (kept for the Bonds screen summary). */
/* ─ MK-NW-F-062 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * couponIncomeAnnual
 *
 * Answers ..... Total annual coupon income across the user's INDIVIDUAL bonds (kept for the Bonds screen summary).
 *
 * Formula .....
 *     Σ over accounts (or none when missing) where is bond of (yearly interest now(bond info(each), now) (or 0 when missing))
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-062
 * Changed ..... 2026-08-04 (abb4c23)
 */
export function couponIncomeAnnual(accounts: AssetAccount[], now: Date = new Date()): number {
  // the same per-account rule as interestIncomeAnnual, so the Bonds screen and the income figure agree:
  // a CD typed by its balance used to count $0 here and balance × rate there (outside review, 2026-10-07);
  // a matured bond counted a year's coupon here and $0 there (outside review OpenAI final, 2026-10-09, DEC-2748d)
  return ((accounts ?? []).filter(isBond).reduce((t, a) => t + (yearlyInterestNow(bondInfo(a), now) ?? 0), 0));
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
 *     cls = asset class of(a)
 *     the answer = t + (yearly interest now(bond info(a), now) ?? 0)
 *
 * Called by ... MK-NW-F-062 couponIncomeAnnual
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-062 couponIncomeAnnual
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-012 bond coupon rate
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
  return ((accounts ?? []).reduce((t, a) => {
    const cls = assetClassOf(a);
    if (cls === 'bonds') {
      // a bond or CD whose maturity date has passed pays no further interest; it used to keep counting
      // a year's coupon (outside review, 2026-10-07) — now by the one shared test (outside review OpenAI final, 2026-10-09, DEC-2748c)
      // face × rate; a CD with no face, balance × rate (founder rule 2026-08-04: CDs are bonds);
      // A46 (founder, 2026-08-26): no coupon rate → $0, never a built-in yield
      return t + (yearlyInterestNow(bondInfo(a), now) ?? 0);
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
 *     t = years to maturity(maturity, now)
 *     nothing   when t = nothing (or t ≤ 0 when missing or zero)
 *     nothing   when face = nothing (or not (face > 0) or !(1 + y > 0) when missing or zero)
 *     c = annual coupon(b) (or 0 when missing)
 *     pv = 0
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-NW-F-060 approxYTM · MK-NW-F-064 bondRateSensitivity
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
 * Reads ....... MK-XS-I-011 bond face value
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-049 bond price — what the bond is worth today
 *
 * Decides .....
 *     · Uses a built-in pv of 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-069
 * Changed ..... not in git yet (—)
 */
export function priceAtYield(b: BondInfo, y: number, now: Date): number | null {
  // EXACT TIMING (outside review batch 06, 2026-10-07 — HIGH): years were rounded to a whole number, at
  // least 1, so a bond with 0.38 years left was priced as if a year remained and a matured bond as if it
  // still paid. Now t is exact; the yearly coupons fall on the maturity anniversaries, at t, t−1, … down
  // to the last above 0; price = Σ coupon ÷ (1 + y)^time + face ÷ (1 + y)^t. At a whole-number t this is
  // the old answer. Nothing when matured or with no date — no yield search runs on it.
  const t = yearsToMaturity(b.maturity, now);
  if (t == null || t <= 0) return null;
  // no face entered prices nothing, never $0; a yield at or below −100% has no price, not Infinity
  // (outside review OpenAI final, 2026-10-09, DEC-2748b)
  if (b.face == null || !(b.face > 0) || !(1 + y > 0)) return null;
  const c = annualCoupon(b) ?? 0;
  let pv = 0;
  for (let k = t; k > 1e-9; k -= 1) pv += c / Math.pow(1 + y, k);
  pv += b.face / Math.pow(1 + y, t);
  return pv;
}

/* ─ MK-NW-F-064 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * bondRateSensitivity
 *
 * Answers ..... What happens to this bond if interest rates move?
 *
 * Formula .....
 *     ytm = approx ytm(b, now)
 *     nothing   when !priced like bond(b) (or ytm = nothing (or face = nothing (or face ≤ 0 (or not (coupon rate ≠ nothing and coupon rate > 0) when missing or zero) when missing or zero) when missing or zero) when missing or zero)
 *     step = (10)^(max(0, round down(math.log10(math.max(value, 1))) − 2))
 *     base = price at yield(b, ytm, now)
 *     nothing   when base = nothing
 *     change = (price at yield(b, math.max(0.0001, ytm + delta), now) ?? base) − base
 *     v = value + change
 *     the answer:
 *     rates up = move(0.01)
 *     rates down = move(-0.01)
 *
 * Called by ... MK-NW-O-001 theBonds
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
  // a broker CD trades, so it gets the estimate like a bond (DEC-3837, 2026-10-10)
  if (!pricedLikeBond(b) || ytm == null || b.face == null || b.face <= 0 || !(b.couponRate != null && b.couponRate > 0)) return null;
  // three figures of the bond's own size: $1,000 from $100,000, $100 from $10,000, $10 below that
  const step = Math.pow(10, Math.max(0, Math.floor(Math.log10(Math.max(b.value, 1))) - 2));
  // THE CHANGE IS MEASURED WITHIN ONE MODEL (outside review, 2026-10-07): the price at the moved yield
  // less the price at today's yield, both on the same whole-year grid, then applied to today's value.
  // Taking the moved price less today's value mixed the rate effect with the grid's own error.
  const base = priceAtYield(b, ytm, now);
  if (base == null) return null;
  const move = (delta: number): RateMove => {
    const change = (priceAtYield(b, Math.max(0.0001, ytm + delta), now) ?? base) - base;
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
  // THE SIZE OF THE MOVE, 1 percentage point each way, is his decision DEC-6074 (2026-10-19, his words "rate rise 1% -
  // approved."): the card estimates what the bond would sell for if market rates moved 1 point up or down today.
  return { ratesUp: move(0.01), ratesDown: move(-0.01) };
}
