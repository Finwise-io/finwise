// Net worth · What are my bonds worth, what do they pay, and what happens if rates move.
//
// THE DOOR for Q-NW-4, which the founder ruled on 2026-09-27: "Yes - for bonds question only. Is
// there a similar question for CDs as CD rates don't move and one can do nothing if CD rates move."
// Both halves of his answer are built in here:
//   · the question is one question, so the Bonds screen and an account's own page read the SAME
//     figures from the SAME place and can never disagree;
//   · a CD bought from the bank is NOT a tradeable bond. It is not marked to market, it cannot be sold,
//     and it is worth its balance until it matures. A CD bought through a broker trades, so it is priced
//     like a bond and gets the estimate (DEC-3837, 2026-10-10). The rates-move estimate is refused for a
//     bank CD, and the door says why in words the screen prints rather than leaving each screen to remember.
//
// Two grains, one door: `theBonds({ accounts })` answers for every bond a person holds, and
// `theBonds({ accounts, accountId })` also answers for the one they opened.
import { declareFigures } from '../_figure-spec';
import { formatMoney } from '../../../src/domain/_shared/money';
import type { AssetAccount } from '../../../src/domain/assets';
import {
  isBond, bondInfo, yearlyInterest, yearlyInterestNow, yearsToMaturity, currentYield, approxYTM,
  bondSummary, accruedInterestCaveat, bondRateSensitivity, pricedLikeBond, maturityParts,
  bondValueNote, pricePer100OfFace,
  type BondInfo, type RateSensitivity, type BondValueBasis,
} from '../../../src/domain/bonds';

/** THE ONE VALUE RULE, WRITTEN ONTO A BOND OR CD WHEN IT IS SAVED (DEC-0281, 2026-08-26): the market value entered, else
 *  what was paid, else the face value, marked with where it came from. The store asks it of this door, as every screen
 *  asks what a bond is worth here, so the balance every screen adds up is the value the Bonds list shows. */
export { settleBondValue } from '../../../src/domain/bonds';

/** Whether an account is a certificate of deposit, judged from its name. */
/* ─ MK-NW-F-071 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * isCertificateOfDeposit
 *
 * Answers ..... Whether an account is a certificate of deposit, judged from its name.
 *
 * Formula .....
 *     !!bond info(a as any).is cd
 *
 * Called by ... MK-NW-O-008 thePerformance
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-003 institution name
 *               MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-071
 * Changed ..... not in git yet (—)
 */
export function isCertificateOfDeposit(a: Pick<AssetAccount, 'label'> & { institution?: string; kind?: string }): boolean {
  return !!bondInfo(a as any).isCd;   // one test, in bondInfo, so the function that reprices a bond refuses a CD itself
}

/** (DEC-4036b, 2026-10-10) What a bond or CD with no maturity date shows where its date would be — on the Bonds
 *  screen's row and on the account page's bond facts — in place of a dash. Its interest still counts. */
export const MATURITY_NOT_ENTERED = 'maturity date not entered';

export interface BondRow {
  accountId: string;
  label: string;
  /** What the person calls the place it is held (the account's name when none was typed). The Bonds screen's heading is the
   *  bond's own name, `label`, as its approved drawing draws it (DEC-0281: the issuer is shown, 2026-10-20). */
  institution: string;
  face: number | null;
  couponRate: number | null;
  couponPerYear: number | null;
  maturity: string;
  yearsLeft: number | null;
  currentYield: number | null;
  yieldToMaturity: number | null;
  /** By the one value rule (DEC-0281, bondValue): the market value, else what was paid, else the face value; null when
   *  none was entered — "Value not entered", left out of the total, as Net worth leaves it out. */
  value: number | null;
  /** Where `value` comes from (DEC-0281). */
  valueBasis: BondValueBasis;
  /** The sentence beside a value that is what was paid or the face value; null for a market value or none. */
  valueNote: string | null;
  /** What the person paid for it (MK-XS-I-067), as entered; null when not entered. */
  paid: number | null;
  /** Its price per $100 of face (pricePer100OfFace): market value ÷ face × 100; null without both. */
  pricePer100: number | null;
  isCD: boolean;
  /** (DEC-3837, 2026-10-10) A bond, or a CD bought through a broker: its yield is solved from its price
   *  and a move in rates changes its value. False for a CD bought from the bank. */
  pricedLikeBond: boolean;
  /** The note about accrued interest, when the figures need one. Null when they do not. */
  accruedCaveat: string | null;
}

export interface OneBond extends BondRow {
  matured: boolean;
  /** Null for a bank CD, and for anything the maths cannot answer honestly. */
  ratesMove: RateSensitivity | null;
  /** Why the rates-move estimate is not shown, when it is not. Empty when it is. */
  ratesMoveRefusal: string;
  /** A CD WHOSE QUESTION WAS NEVER ANSWERED — bought from the bank, or through a broker (DEC-3837 asks it once). True only
   *  for a CD with no answer stored: the page asks it there, with the two answers, instead of saying it "is marked as bought
   *  from the bank" when nobody marked it (2026-10-21, DEC-3523 tenet 3). */
  cdBoughtNotEntered: boolean;
}

export interface Bonds {
  count: number;
  totalValue: number;
  totalFace: number;
  couponPerYear: number;   // the total of what is known
  avgYield: number | null;
  /** The bonds the average yield leaves out, by name: the ones with no value today. A screen that
   *  shows the average names them, so nobody reads it as an average of every bond listed. */
  leftOutOfAverage: string[];
  /** WHY EACH OF THEM IS LEFT OUT (2026-10-21, by the one value rule, DEC-0281). A yield needs a market value, so the average
   *  leaves out a bond whose value was not entered at all, whose market value is $0, or whose value shown is what was paid or
   *  its face value (no market value entered) — the screen says which, one line each. Every name in leftOutOfAverage is in
   *  exactly one of the four. A value that is what was paid or the face value used to be called "no value today". */
  averageLeavesOut: { notEntered: string[]; noValueToday: string[]; valueIsPaid: string[]; valueIsFace: string[] };
  /** The bonds the average yield and the year's interest leave out because no rate was entered — named
   *  the same way (outside review, 2026-10-07: they had counted as paying 0%). */
  leftOutNoRate: string[];
  /** The bonds the total face value leaves out because none was entered — named, never counted as $0. */
  faceNotEntered: string[];
  /** (DEC-0281, DEC-3657) The bonds the total value leaves out because no value of any kind was entered — no market
   *  value, nothing paid, no face value — named, never counted as $0, as Net worth leaves them out. */
  valueNotEntered: string[];
  /** The soonest maturity date among them, so the screen need not sort for itself. */
  nextMaturity: string | null;
  rows: BondRow[];
  /** Present only when an account was named. */
  one: OneBond | null;
}

export interface BondsInput {
  accounts: AssetAccount[];
  /** The account whose own page is open, when one is. */
  accountId?: string;
  today?: Date;
}

/** One bond's row for the Bonds screen: its face value, yearly interest rate, interest paid in a year, maturity date and years left. */
/* ─ MK-NW-F-072 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * rowOf
 *
 * Answers ..... One bond's row for the Bonds screen: its face value, yearly interest rate, interest paid in a year, maturity date and years left.
 *
 * Formula .....
 *     b = bond info(a)
 *
 * Called by ... MK-NW-F-141 holdingBondFacts · MK-NW-O-001 theBonds
 *               MK-ST-F-093 typedValueOnItsDate
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
 * Reads ....... MK-XS-I-003 institution name
 *               MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-049 bond price — what the bond is worth today
 *               MK-XS-I-065 accrued interest on a bond — interest earned since the last coupon
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-072
 * Changed ..... not in git yet (—)
 */
export const rowOf = (a: AssetAccount, now: Date): BondRow => {
  const b: BondInfo = bondInfo(a);
  return {
    accountId: String(a.asset_id),
    label: a.label,
    institution: (a as any).institution?.trim() || a.label,
    face: b.face,
    couponRate: b.couponRate,
    // face × rate; a CD by its balance, balance × rate; nothing without a rate; $0 once matured, so the rows add up
    // to COUPON /year (outside review OpenAI final, 2026-10-09, DEC-2748d, tenet 2)
    couponPerYear: yearlyInterestNow(b, now),
    maturity: b.maturity,
    yearsLeft: yearsToMaturity(b.maturity, now),
    currentYield: currentYield(b),
    yieldToMaturity: approxYTM(b, now),
    // THE ONE VALUE RULE (DEC-0281, 2026-08-26): the value shown, with where it came from — never $0 for a value not entered
    value: b.shown !== undefined ? b.shown : b.value,
    valueBasis: b.basis ?? 'market',
    valueNote: bondValueNote(b.basis ?? 'market'),
    paid: b.paid ?? null,
    pricePer100: pricePer100OfFace(b),
    isCD: !!b.isCd,
    pricedLikeBond: pricedLikeBond(b),   // the one test (DEC-3837, 2026-10-10)
    accruedCaveat: accruedInterestCaveat(b, now),
  };
};

/** A BOND OR CD HELD AS A HOLDING, its facts for the line under its name (DEC-6212, 2026-10-19): face value, coupon rate,
 *  yield to maturity and maturity date (DEC-6323, 2026-10-19), with whether it has matured — read by the same rules as a
 *  bond held as its own account (rowOf), with the holding's value today as its value. A bank CD's yield to maturity is its
 *  rate. Each is null where it was not given or cannot be calculated, and the line then leaves that part out. */
/* ─ MK-NW-F-141 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * holdingBondFacts
 *
 * Answers ..... A BOND OR CD HELD AS A HOLDING, its facts for the line under its name (DEC-6212, 2026-10-19): face value, coupon rate, yield to maturity and maturity date (DEC-6323, 2026-10-19), with whether it has matured — read by the same rules as a bond held as its own account (rowOf), with the holding's value today as its value.
 *
 * Formula .....
 *     units = Σ over lots (or none when missing) of (shares read as a number (or 0 when missing or zero))
 *     face = face value (or units   if price quote = 'per_100_of_face' and units > 0
 *     undefined   otherwise when missing)
 *     parts = maturity parts(row.maturity)
 *     maturity = `${parts[0]}-${string(parts[1]).pad start(2, '0')}-${string(parts[2]).pad start(2, '0')}`   if parts
 *     nothing   otherwise
 *     the answer:
 *     face = row.face
 *     coupon rate = row.coupon rate
 *     yield to maturity = row.yield to maturity
 *     maturity = maturity
 *     matured = maturity ≠ nothing and row.years left = 0
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-068 how a linked bond's price is quoted — per $100 of face value, or per unit like a share
 *               MK-XS-I-069 how many times a year a bond or CD pays its interest — once or twice
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-141
 * Changed ..... not in git yet (—)
 */
export function holdingBondFacts(p: { position_id?: string | number; ticker?: string; label?: string; kind?: string;
  face_value?: number; coupon_rate?: number; maturity_date?: string; coupons_per_year?: 1 | 2; price_quote?: string; lots?: { shares?: number }[] }, value: number, now: Date = new Date()):
  { face: number | null; couponRate: number | null; yieldToMaturity: number | null; maturity: string | null; matured: boolean } {
  // A BOND QUOTED PER $100 OF FACE IS HELD IN FACE DOLLARS (MK-XS-I-068, 2026-10-20; Q38 part 1, a bond's quantity is its
  // face amount): with no face value given, its quantity is its face value. A face the person entered comes first.
  const units = (p.lots ?? []).reduce((t, l) => t + (Number(l?.shares) || 0), 0);
  const face = p.face_value ?? (p.price_quote === 'per_100_of_face' && units > 0 ? units : undefined);
  const row = rowOf({ asset_id: String(p.position_id ?? p.ticker ?? ''), label: p.label ?? p.ticker ?? '', kind: p.kind,
    face_value: face, coupon_rate: p.coupon_rate, maturity_date: p.maturity_date, coupons_per_year: p.coupons_per_year, balance: value } as any, now);
  // THE MATURITY DATE, the fourth part of the line (owner, 2026-10-19: "Line under a bond - new line missing maturity
  // date."): read by the one reading of a maturity date (MK-NW-F-124), so a date that is missing, written another way or
  // impossible is not known and is left out; matured is the Bonds door's own rule, years left is zero (MK-NW-O-001).
  const parts = maturityParts(row.maturity);
  const maturity = parts ? `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}` : null;
  return { face: row.face, couponRate: row.couponRate, yieldToMaturity: row.yieldToMaturity, maturity, matured: maturity != null && row.yearsLeft === 0 };
}

/** What bonds and CDs do I hold, what do they pay, and when do they mature?
 *  ── ORCHESTRATOR ── the one function a screen asks for this.
 *  The one function a screen calls for this question. Written as a DOC comment on purpose: the
 *  header generator owns the plain block comment below and rewrites it on every build, which is how
 *  all twelve doors lost this marker once and two were typed F instead of O (2026-09-28). */
/* ─ MK-NW-O-001 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * theBonds
 *
 * Answers ..... What bonds and CDs do I hold, what do they pay, and when do they mature?
 *
 * Formula .....
 *     now = input.today (or new date() when missing)
 *     held = input.accounts (or none when missing) where is bond
 *     maturity day = (m: string) => { const p = maturity parts(m); return p ? date.UTC(p[0], p[1] − 1, p[2]) : infinity; }
 *     sum = bond summary(held.map(bond info), now)
 *     one = nothing
 *     b = bond info(opened)
 *     row = row of(opened, now)
 *     matured today = row.years left = 0
 *     not answered = row.is cd and opened.cd bought ! = 'bank' and opened.cd bought ! = 'broker'
 *     out = not entered = [] as string[]
 *     no value today = [] as string[]
 *     value is paid = [] as string[]
 *     value is face = [] as string[]
 *     the answer = out
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-077 ALL · MK-NW-F-078 ONE
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
 * Serves ...... MK-NW-M-023 · MK-NW-M-024 · MK-NW-M-025 · MK-NW-M-026
 *               MK-NW-M-027 · MK-NW-M-041 · MK-NW-M-042 · MK-NW-M-043
 *               MK-NW-M-044 · MK-NW-M-045 · MK-NW-M-053 · MK-NW-M-054
 *               MK-NW-M-055 · MK-NW-M-056 · MK-NW-M-057 · MK-NW-M-058
 *               MK-NW-M-065 · MK-NW-M-066
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-003 institution name
 *               MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-028 assumed return
 *               MK-XS-I-049 bond price — what the bond is worth today
 * Ruled by .... DEC-0108 · DEC-0280
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-NW-O-001
 * Changed ..... not in git yet (—)
 */
export function theBonds(input: BondsInput): Bonds {
  const now = input.today ?? new Date();
  const held = (input.accounts ?? []).filter(isBond);
  const maturityDay = (m: string) => { const p = maturityParts(m); return p ? Date.UTC(p[0], p[1] - 1, p[2]) : Infinity; };
  // SOONEST-MATURING FIRST — his ruling, 2026-10-04: "sort by soonest maturing first". The approved
  // drawing (bonds v02) lists its three in another order; the ruling is newer and is the design.
  // Sorted once, in the door, so the Bonds screen and any other reader show the same list.
  const rows = held.map((a) => rowOf(a, now))
    // by the one reading of a maturity date (MK-NW-F-124, 2026-10-13): a text that is no date sorts with the dateless, last
    .sort((x, y) => (maturityDay(x.maturity) - maturityDay(y.maturity)) || 0);
  const sum = bondSummary(held.map(bondInfo), now);

  let one: OneBond | null = null;
  const opened = input.accountId != null
    ? held.find((a) => String(a.asset_id) === String(input.accountId))
    : undefined;
  if (opened) {
    const b = bondInfo(opened);
    const row = rowOf(opened, now);
    // MATURED IS A FACT ABOUT THE DATE, NOT THE CLOCK — and a bond with no date has not matured, it is
    // unknown (G11). It read years-left ≤ 0 with "no date" counted as 0, so an undated bond was called
    // matured, and a bond's maturity day depended on the hour and the time zone (outside review, 2026-10-04).
    // an impossible date (2026-02-30) is unknown too, not matured: years left is nothing for it (outside review OpenAI final, 2026-10-09, DEC-0332)
    const maturedToday = row.yearsLeft === 0;
    // A BANK CD IS NOT MARKED TO MARKET — the founder's ruling (2026-09-27), built into the door so no
    // screen has to remember it. The app now asks where a CD was bought (DEC-3837, 2026-10-10): a CD
    // bought through a broker trades, so it gets the estimate like a bond and this sentence is not shown.
    // WHERE THE CD WAS BOUGHT IS NOT ENTERED (2026-10-21, DEC-3523 tenet 3, DEC-3837): no answer is not "from the bank". The
    // card says what each answer means and asks it; the bank sentence below is for a CD marked as bought from the bank.
    const notAnswered = row.isCD && opened.cd_bought !== 'bank' && opened.cd_bought !== 'broker';
    const refusal = notAnswered
      ? 'Where this CD was bought is not entered. A CD bought from the bank is not traded, so its value does not move with '
        + 'rates. A CD bought through a broker is traded, and its value does move with rates.'
      : row.isCD && !row.pricedLikeBond
      ? 'Nothing happens to this CD. It is not traded, so its value does not move with rates — it is worth '
        + 'its balance until it matures, when the face value above comes back. '
        + 'The only way out early is to break it, and your bank charges a fixed penalty for that, usually some '
        + 'months of interest. A CD bought through a broker does trade and does move with rates; this one '
        + 'is marked as bought from the bank.'
      : '';
    one = {
      ...row,
      matured: maturedToday,
      ratesMove: !row.pricedLikeBond || maturedToday ? null : bondRateSensitivity(b, now),
      yieldToMaturity: maturedToday ? null : row.yieldToMaturity,
      ratesMoveRefusal: refusal,
      cdBoughtNotEntered: notAnswered,
    };
  }

  return {
    count: sum.count,
    totalValue: sum.totalValue,
    totalFace: sum.totalFace,
    couponPerYear: sum.annualCoupon,
    avgYield: sum.avgYield,
    // the same test the average itself uses: a value today, after accrued interest, above zero
    leftOutOfAverage: held.filter((a) => { const b = bondInfo(a); return !(b.value > 0); }).map((a) => a.label),
    // the same bonds, by why (2026-10-21): where the value shown came from, as the one value rule stored it (bondInfo's basis)
    averageLeavesOut: (() => {
      const out = { notEntered: [] as string[], noValueToday: [] as string[], valueIsPaid: [] as string[], valueIsFace: [] as string[] };
      for (const a of held) {
        const b = bondInfo(a);
        if (b.value > 0) continue;
        (b.basis === 'paid' ? out.valueIsPaid : b.basis === 'face' ? out.valueIsFace : b.basis === 'none' ? out.notEntered : out.noValueToday).push(a.label);
      }
      return out;
    })(),
    leftOutNoRate: held.filter((a) => { const b = bondInfo(a); return b.value > 0 && yearlyInterest(b) == null; }).map((a) => a.label),
    faceNotEntered: held.filter((a) => bondInfo(a).face == null).map((a) => a.label),
    valueNotEntered: rows.filter((r) => r.value == null).map((r) => r.label),
    nextMaturity: (sum as any).nextMaturity ?? null,
    rows,
    one,
  };
}

/** THE WORKED EXAMPLE — ONE HOLDING, EVERY FIGURE ON THIS DOOR (six steps, step 6, 2026-09-28).
 *
 *  Two bonds held on 28 September 2026: a Treasury bought below face, and a bank CD. Each figure's
 *  `worked.given` says this in words and its `run` calls `theBonds` — the real door — so the example
 *  printed on the master file's row is the answer the code gives, not one typed beside it.
 *
 *  The CD is in the example on purpose. It is the founder's KEEP ruling (2026-09-27): a bank CD is
 *  not marked to market, so the door refuses the rates question for it rather than printing a number
 *  that would be wrong. An example without a CD would never exercise that.
 */
const TODAY = new Date('2026-09-28T12:00:00');
const EXAMPLE = [
  { asset_id: 'b1', label: 'US Treasury 2029', institution: 'Fidelity', kind: 'bond', tax_bucket: 'TAXABLE',
    balance: 24200, target_return: 0, face_value: 25000, coupon_rate: 0.045, maturity_date: '2029-09-30', amount_paid: 23900 },
  { asset_id: 'b2', label: 'Ally 12-month CD', institution: 'Ally', kind: 'bond', tax_bucket: 'TAXABLE',
    balance: 10000, target_return: 0, face_value: 10000, coupon_rate: 0.0505, maturity_date: '2027-03-15' },
] as any[];
const GIVEN =
  'Two bonds on 28 Sep 2026: a $25,000-face Treasury paying 4.5%, maturing 30 Sep 2029, worth $24,200 today, bought for $23,900; '
  + 'and a $10,000 Ally CD paying 5.05%, maturing 15 Mar 2027, worth its $10,000.';

/** Example only: runs theBonds on the worked example and calculates nothing of its own. */
/* ─ MK-NW-F-077 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * ALL
 *
 * Answers ..... Example only: runs theBonds on the worked example and calculates nothing of its own.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-179 balanceWithBondTakenOut
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-179 balanceWithBondTakenOut
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-077
 * Changed ..... not in git yet (—)
 */
const ALL = () => theBonds({ accounts: EXAMPLE, today: TODAY });

/** Example only: runs theBonds for one bond of the worked example and calculates nothing of its own. */
/* ─ MK-NW-F-078 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * ONE
 *
 * Answers ..... Example only: runs theBonds for one bond of the worked example and calculates nothing of its own.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-CF-F-005 actualMonthFlow · MK-NW-F-127 gainOfRow
 *               MK-NW-F-179 balanceWithBondTakenOut · MK-NW-O-003 theNetWorth
 *               MK-PF-F-044 startValues
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
 * Formula also on the master file · functions_from_code · MK-NW-F-078
 * Changed ..... not in git yet (—)
 */
const ONE = () => theBonds({ accounts: EXAMPLE, accountId: 'b1', today: TODAY }).one!;

/** AN ACCOUNT'S BALANCE ONCE A BOND ADDED AS PART OF IT IS TAKEN OUT (2026-10-22; DEC-0346: the Bonds screen calculated it) — "Part
 *  of it" lowers the account by what the bond is worth, so nothing is counted twice, and never below $0. $50,000 holding a
 *  $10,000 bond: $40,000. */
/* ─ MK-NW-F-179 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * balanceWithBondTakenOut
 *
 * Answers ..... AN ACCOUNT'S BALANCE ONCE A BOND ADDED AS PART OF IT IS TAKEN OUT (2026-10-22; DEC-0346: the Bonds screen calculated it) — "Part of it" lowers the account by what the bond is worth, so nothing is counted twice, and never below $0.
 *
 * Formula .....
 *     max(0, (account balance or 0) − bond worth)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Decides .....
 *     · If face is missing it uses 0.
 *     · If coupon per year is missing it uses 0.
 *     · If current yield is missing it uses 0.
 *     · If coupon rate is missing it uses 0.
 *     · If years left is missing it uses 0.
 *     · If account balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · Shows 2 decimal places.
 *     · Shows 1 decimal place.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-179
 * Changed ..... not in git yet (—)
 */
export function balanceWithBondTakenOut(accountBalance: number | null | undefined, bondWorth: number): number {
  return Math.max(0, (accountBalance || 0) - bondWorth);
}

/** THE FIGURES THIS DOOR HANDS OUT (rule 11). The master file's rows are printed from here. */
export const BOND_FIGURES = declareFigures({
  // ISSUED AND DECLARED 2026-10-01, working rule 11 across this screen. Six figures a person reads
  // on the Bonds screen had no identifier: the face total under the hero, and the five that make up
  // a bond's own row. They were printing through money() and pct(), which is a figure in front of a
  // person that the master file knows nothing about — the defect rule 11 exists to stop.
  'MK-NW-M-053': {
    label: 'face', unit: 'money', screens: ['/bonds'], grain: 'the household',
    answers: 'The face value of every bond and CD added up \u2014 what they pay back at maturity, which is '
      + 'not what they are worth today.',
    formula: 'the sum of each bond\u2019s face value',
    inputs: ['MK-XS-I-001 account balance'],
    decisions: [
      'FACE AND VALUE ARE SHOWN SIDE BY SIDE because they differ, and the difference is the whole '
      + 'point: a bond bought below face pays back more than it is worth today.',
    ],
    refusal: 'No bonds entered yet, so no face total either.',
    ruled: '2026-10-01',
    worked: { given: GIVEN, answer: '$35,000', run: () => ALL().totalFace },
  },
  'MK-NW-M-054': {
    label: 'one bond\u2019s value', unit: 'money', screens: ['/bonds'], grain: 'one bond',
    answers: 'What this one bond or CD is worth today.',
    // DEC-0281 (2026-08-26): "Current Value if available, if not, cost value, if not face value" \u2014 the one value rule, bondValue
    formula: 'the market value entered; else what you paid; else the face value; else Value not entered (left out of the total)',
    inputs: ['MK-XS-I-001 account balance', 'MK-XS-I-067 what was paid for a bond or CD', 'MK-XS-I-011 bond face value'],
    decisions: ['DEC-0281: a value that is what was paid or the face value says so beside it, so nobody reads it as a market value.',
      'DEC-3657: no market value, nothing paid and no face value \u2014 the row reads Value not entered and the bond is left out of the total, as Net worth leaves it out.'],
    // printed as it stands when there is no value (the words the canon gives a balance never entered, DEC-3657)
    refusal: 'Value not entered',
    ruled: '2026-10-01',
    worked: { given: GIVEN, answer: '$10,000', run: () => ALL().rows.find((r) => r.label === 'Ally 12-month CD')!.value },
  },
  'MK-NW-M-055': {
    label: 'one bond\u2019s face', unit: 'money', screens: ['/bonds'], grain: 'one bond',
    answers: 'What this one bond pays back at maturity.',
    // the declaration said a face never entered fell back to the value; the code never did (outside review OpenAI final, 2026-10-09, DEC-2748b)
    formula: 'the face value as entered; a face never entered stays blank, never the balance and never $0',
    inputs: ['MK-XS-I-011 bond face value'],
    refusal: 'No face value entered \u2014 the row says \u201cface value not entered\u201d.',
    ruled: '2026-10-01',
    worked: { given: GIVEN, answer: '$10,000', run: () => ALL().rows.find((r) => r.label === 'Ally 12-month CD')!.face },
  },
  'MK-NW-M-056': {
    label: 'coupon', unit: 'money', per: 'year', screens: ['/bonds'], grain: 'one bond',
    answers: 'What this one bond pays in a year, in cash.',
    formula: 'its face value \u00d7 its coupon rate',
    inputs: ['MK-XS-I-001 account balance'],
    decisions: [
      'IT IS PAID ON FACE, NOT ON VALUE. A $25,000 bond worth $24,200 still pays 4.5% of $25,000 \u2014 '
      + 'computing it on the market value understates the income.',
    ],
    refusal: 'No coupon rate entered \u2014 the figure is left out rather than shown as $0.',
    ruled: '2026-10-01',
    worked: { given: GIVEN, answer: '$505/year', run: () => ALL().rows.find((r) => r.label === 'Ally 12-month CD')!.couponPerYear },
  },
  'MK-NW-M-057': {
    label: 'yield', unit: 'percent-2dp', screens: ['/bonds'], grain: 'one bond',
    answers: 'What this bond pays in a year as a share of what it is worth today.',
    formula: 'its coupon a year \u00f7 its value today, less accrued interest where that was entered',
    inputs: ['MK-XS-I-001 account balance', 'MK-XS-I-065 accrued interest'],
    decisions: [
      'WHERE ACCRUED INTEREST WAS NOT ENTERED the row says so beneath the figures rather than quietly '
      + 'leaving it in the price (his ruling, DEC-0280).',
    ],
    refusal: '\u2014 when there is no coupon rate or no value to divide by.',
    ruled: '2026-10-01',
    worked: { given: GIVEN, answer: '5.05%', run: () => ALL().rows.find((r) => r.label === 'Ally 12-month CD')!.currentYield },
  },
  'MK-NW-M-058': {
    label: 'Yield to maturity', unit: 'percent-2dp', screens: ['/bonds'], grain: 'one bond',
    answers: 'What this bond would earn a year if held to maturity, counting the gain or loss between '
      + 'what it is worth now and what it pays back.',
    // the solved yield since 2026-10-07; how often the bond pays since 2026-10-20 (DEC-3390). The words read the old
    // approximation until 2026-10-20, a disagreement between this row and the code.
    formula: 'the yield at which the coupons still to come and the face value, discounted, equal the full price: the value today plus the interest built up since the last coupon — as entered, else estimated as face × rate ÷ payments a year × days since the last payment ÷ days between payments, the payments stepping back from the maturity date (once a year when how often it pays was not entered)',
    inputs: ['MK-XS-I-001 account balance', 'MK-XS-I-011 bond face value', 'MK-XS-I-012 bond coupon rate', 'MK-XS-I-013 bond maturity date',
      'MK-XS-I-065 accrued interest', 'MK-XS-I-069 how many times a year it pays'],
    decisions: ['AN ESTIMATE, and the foot of the screen says so in those words.',
      'DEC-3390, 2026-10-09: the interest built up since the last coupon is added to the value; estimated when not entered, '
      + 'and the screen says so. Since 2026-10-20 the estimate counts from the last payment by how often the bond pays.',
      'DEC-3837, 2026-10-10: a CD bought from the bank yields its interest rate; a CD bought through a broker '
      + 'is priced like a bond, its yield solved from its face value, rate, value and maturity date. '
      + 'A CD whose answer was never given is read as bought from the bank.'],
    refusal: '\u2014 with no maturity date there are no years to spread the difference over.',
    ruled: '2026-10-01',
    worked: { given: GIVEN, answer: '5.05%', run: () => ALL().rows.find((r) => r.label === 'Ally 12-month CD')!.yieldToMaturity },
  },
  'MK-NW-M-041': {
    label: 'total value of your bonds', unit: 'money', screens: ['/bonds'],
    answers: 'What every bond and CD you hold is worth today, added up.',
    // each bond by the one value rule (DEC-0281, bondValue); a bond whose value was not entered adds nothing and is named
    formula: 'the sum of each bond’s value (the market value, else what you paid, else the face value); a bond with none is left out and named',
    inputs: ['MK-NW-I-001 your accounts'],
    refusal: 'No bonds entered yet, so it says so rather than showing $0.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$34,200',
      run: () => ALL().totalValue,
    },
  },
  'MK-NW-M-042': {
    label: 'n bonds · face $X', unit: 'words', screens: ['/bonds'],
    answers: 'How many you hold, and what they pay back at maturity in total.',
    formula: 'count of bond accounts, and the sum of their face values',
    inputs: ['MK-NW-I-001 your accounts'],
    refusal: 'Nothing entered yet.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '2 bonds · face $35,000',
      run: () => `${ALL().count} bonds · face ${formatMoney(ALL().totalFace)}`,
    },
  },
  'MK-NW-M-043': {
    label: 'COUPON', unit: 'money', per: 'year', screens: ['/bonds'],
    answers: 'The interest all your bonds pay in a year, in money.',
    // a bond past its maturity date pays no more interest (outside review OpenAI final, 2026-10-09, DEC-2748d)
    formula: 'for each bond: face value × coupon rate, and $0 once past its maturity date; then added up',
    inputs: ['MK-NW-I-001 your accounts'],
    refusal: 'Nothing entered yet.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$1,630/year',
      run: () => ALL().couponPerYear,
    },
  },
  'MK-NW-M-044': {
    label: 'AVG YIELD', unit: 'percent-2dp', screens: ['/bonds'],
    answers: 'What your bonds yield on what they are worth today, weighted by value.',
    formula: 'the coupon each pays ÷ what each is worth today, weighted by value',
    inputs: ['MK-NW-I-001 your accounts'],
    refusal: 'A bond with no price today is left out rather than counted at zero.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '4.77%',
      run: () => ALL().avgYield,
    },
  },
  'MK-NW-M-045': {
    label: 'each bond — face, coupon, yield', unit: 'words', screens: ['/bonds'], grain: 'one bond',
    answers: 'One line per bond: what it pays back, what it pays you, and what that is worth today.',
    formula: 'face value · coupon rate · coupon ÷ today’s value',
    inputs: ['MK-NW-I-001 your accounts'],
    refusal: 'A bond fund has no face value or maturity, so it shows none.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: 'Ally 12-month CD — face $10,000, $505/year, 5.05%',
      run: () => (() => { const r = ALL().rows.find((r) => r.label === 'Ally 12-month CD')!; return `${r.label} — face ${formatMoney(r.face ?? 0)}, ${formatMoney(r.couponPerYear ?? 0)}/year, ${((r.currentYield ?? 0) * 100).toFixed(2)}%`; })(),
    },
  },
  'MK-NW-M-023': {
    label: 'Face value', unit: 'money', screens: ['/account-detail'], grain: 'one bond',
    answers: 'What this bond pays back on the day it matures.',
    formula: 'the face value you entered',
    inputs: ['MK-NW-I-001 your accounts'],
    refusal: 'Not entered, so nothing is shown.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$25,000',
      run: () => ONE().face,
    },
  },
  'MK-NW-M-024': {
    label: 'Interest payments', unit: 'words', screens: ['/account-detail'], grain: 'one bond',
    answers: 'The rate it pays, and what that comes to in a year.',
    formula: 'coupon rate, and face value × coupon rate',
    inputs: ['MK-NW-I-001 your accounts'],
    refusal: 'No coupon rate entered.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$1,125/year — 4.50% of $25,000 face',
      run: () => `${formatMoney(ONE().couponPerYear ?? 0)}/year — ${((ONE().couponRate ?? 0) * 100).toFixed(2)}% of ${formatMoney(ONE().face ?? 0)} face`,
    },
  },
  'MK-NW-M-025': {
    label: 'Matures', unit: 'words', screens: ['/account-detail'], grain: 'one bond',
    answers: 'The day it pays back, and how long that is away.',
    formula: 'the maturity date, and the years between today and it',
    inputs: ['MK-NW-I-001 your accounts'],
    refusal: 'No maturity date entered — the yields refuse rather than guess one.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '2029-09-30 — 3.0 years away',
      run: () => `${ONE().maturity} — ${(ONE().yearsLeft ?? 0).toFixed(1)} years away`,
    },
  },
  'MK-NW-M-026': {
    label: 'Yield if held to maturity', unit: 'percent-2dp', screens: ['/account-detail'], grain: 'one bond',
    answers: 'What it earns a year if you hold it to the end, counting the gap between its price and its face value.',
    // the solved yield since 2026-10-07; the words read the old approximation until 2026-10-20 (row and code disagreed)
    formula: 'the yield at which the coupons still to come and the face value, discounted, equal the full price: the value today plus the interest built up since the last coupon — as entered, else estimated as face × rate ÷ payments a year × days since the last payment ÷ days between payments, the payments stepping back from the maturity date (once a year when how often it pays was not entered)',
    inputs: ['MK-NW-I-001 your accounts', 'MK-XS-I-065 accrued interest', 'MK-XS-I-069 how many times a year it pays'],
    decisions: ['An estimate, and labelled an estimate on screen.',
      'DEC-3390, 2026-10-09: the interest built up since the last coupon is added to the value. Since 2026-10-20 the '
      + 'estimate counts from the last payment by how often the bond pays; not entered, once a year.'],
    refusal: 'Matured, or no maturity date — it refuses rather than divide by nothing.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      // 5.69%, hand-checked (2026-10-09, his ruling DEC-3390): $1,118.84 of accrued interest estimated for
      // 363 days and added to the $24,200 statement value, so the full price is $25,318.84. It read 7.44%
      // on $24,200 alone, and 5.65% under the old approximation.
      answer: '5.69%',
      run: () => ONE().yieldToMaturity,
    },
  },
  'MK-NW-M-027': {
    label: "Yield on today's value", unit: 'percent-2dp', screens: ['/account-detail'], grain: 'one bond',
    answers: 'What the interest comes to against what the bond is worth today.',
    formula: 'coupon ÷ today’s value',
    inputs: ['MK-NW-I-001 your accounts'],
    refusal: 'No value today.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '4.65%',
      run: () => ONE().currentYield,
    },
  },
  // ISSUED 2026-10-20 under DEC-0281 (his words, 2026-08-26: "Information to display on screen for Bond is Maturity, Face
  // Value, Issuer, coupon rate, cost, current price, quantity, accrued interest, earned interest"): the cost and the
  // current price, the two of the nine a bond's own page did not show. Quantity is the face value (Q38 part 1).
  'MK-NW-M-065': {
    label: 'What you paid', unit: 'money', screens: ['/account-detail'], grain: 'one bond',
    answers: 'What you paid for this bond or CD, as you entered it.',
    formula: 'the amount you entered as what you paid',
    inputs: ['MK-XS-I-067 what was paid for a bond or CD'],
    decisions: ['DEC-0281: cost is one of the nine facts a bond shows; it is step 2 of the one value rule.',
      'Optional: not entered, the row is not shown; a typed 0 is $0 (DEC-2748b).'],
    refusal: 'Not entered — the row is not shown.',
    ruled: '2026-10-20',
    worked: { given: GIVEN, answer: '$23,900', run: () => ONE().paid },
  },
  'MK-NW-M-066': {
    label: 'Price', unit: 'money-cents', screens: ['/account-detail'], grain: 'one bond',
    answers: 'What this bond costs per $100 of its face value today — the way a broker quotes a bond.',
    formula: 'its market value ÷ its face value × 100',
    inputs: ['MK-XS-I-001 account balance', 'MK-XS-I-011 bond face value'],
    decisions: ['Q38 part 3, decided 2026-10-20 under DEC-0281: the price is calculated from the value and the face, not a box to fill in.',
      'Only with a market value: a value that is what you paid or the face value is not a price.'],
    refusal: 'No market value or no face value — the row is not shown.',
    ruled: '2026-10-20',
    // $24,200 ÷ $25,000 × 100 = $96.80, printed "$96.80 per $100 of face"
    worked: { given: GIVEN, answer: '$96.80', run: () => ONE().pricePer100 },
  },
  'MK-NW-M-028': {
    // MONEY, NOT WORDS (2026-10-14): each amount on the two lines is printed through this figure, so it masks with
    // the other balances; until then they printed as MK-NW-M-023, the face value (inputs-and-use audit, 2026-10-11).
    label: 'Rates rise 1% → value roughly $X–$Y', unit: 'money', screens: ['/account-detail'], grain: 'one bond',
    answers: 'Roughly what this bond would be worth if interest rates moved one percent either way.',
    formula: 'price it again at (yield to maturity ± 1%), and show a band of ±1% around that',
    inputs: ['MK-NW-I-001 your accounts'],
    decisions: [
      'An estimate, and it wears the estimate label.',
      'FOUNDER 2026-09-27: a CD bought from the bank gets no estimate. It is not traded, so its value does not '
      + 'move with rates; the screen says that instead.',
      'DEC-3837, 2026-10-10: a CD bought through a broker trades, so it gets the estimate like a bond. '
      + 'A CD whose answer was never given is read as bought from the bank.',
    ],
    refusal: 'Refused for a CD bought from the bank, for a matured bond, and for anything with no coupon or no '
      + 'maturity — and for a bank CD it says plainly why nothing happens.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$23,300–$23,800',
      run: () => `${formatMoney(ONE().ratesMove!.ratesUp.low)}–${formatMoney(ONE().ratesMove!.ratesUp.high)}`,
    },
  },
});
