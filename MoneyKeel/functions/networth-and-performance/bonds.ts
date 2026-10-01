// Net worth · What are my bonds worth, what do they pay, and what happens if rates move.
//
// THE DOOR for Q-NW-4, which the founder ruled on 2026-09-27: "Yes - for bonds question only. Is
// there a similar question for CDs as CD rates don't move and one can do nothing if CD rates move."
// Both halves of his answer are built in here:
//   · the question is one question, so the Bonds screen and an account's own page read the SAME
//     figures from the SAME place and can never disagree;
//   · a CD is NOT a tradeable bond. It is not marked to market, it cannot be sold, and it is worth
//     its balance until it matures. The rates-move estimate is refused for one, and the door says
//     why in words the screen prints rather than leaving each screen to remember.
//
// Two grains, one door: `theBonds({ accounts })` answers for every bond a person holds, and
// `theBonds({ accounts, accountId })` also answers for the one they opened.
import { declareFigures } from '../_figure-spec';
import { formatMoney } from '../../../src/domain/_shared/money';
import type { AssetAccount } from '../../../src/domain/assets';
import {
  isBond, bondInfo, annualCoupon, yearsToMaturity, currentYield, approxYTM,
  bondSummary, accruedInterestCaveat, bondRateSensitivity,
  type BondInfo, type RateSensitivity,
} from '../../../src/domain/bonds';

/** A CD is recognised by its name, the same rule the asset classifier uses (CD_RE). */
const CD_RE = /\b(cd|certificate of deposit)\b/i;
/* ─ MK-NW-F-071 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * isCertificateOfDeposit
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     CD_RE.test(`${label ?? ''} ${institution ?? ''}`)
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
 * Reads ....... MK-XS-I-003 institution name
 *               MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-013 bond maturity date
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-071
 * Changed ..... not in git yet (—)
 */
export function isCertificateOfDeposit(a: Pick<AssetAccount, 'label'> & { institution?: string }): boolean {
  return CD_RE.test(`${a.label ?? ''} ${a.institution ?? ''}`);
}

export interface BondRow {
  accountId: string;
  label: string;
  /** What the person calls the place it is held — the row's heading on the Bonds screen. */
  institution: string;
  face: number;
  couponRate: number;
  couponPerYear: number;
  maturity: string;
  yearsLeft: number | null;
  currentYield: number | null;
  yieldToMaturity: number | null;
  value: number;
  isCD: boolean;
  /** The note about accrued interest, when the figures need one. Null when they do not. */
  accruedCaveat: string | null;
}

export interface OneBond extends BondRow {
  matured: boolean;
  /** Null for a CD, and for anything the maths cannot answer honestly. */
  ratesMove: RateSensitivity | null;
  /** Why the rates-move estimate is not shown, when it is not. Empty when it is. */
  ratesMoveRefusal: string;
}

export interface Bonds {
  count: number;
  totalValue: number;
  totalFace: number;
  couponPerYear: number;
  avgYield: number | null;
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

/* ─ MK-NW-F-072 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * rowOf
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     b = bond info(a)
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
const rowOf = (a: AssetAccount, now: Date): BondRow => {
  const b: BondInfo = bondInfo(a);
  return {
    accountId: String(a.asset_id),
    label: a.label,
    institution: (a as any).institution?.trim() || a.label,
    face: b.face,
    couponRate: b.couponRate,
    couponPerYear: annualCoupon(b),
    maturity: b.maturity,
    yearsLeft: yearsToMaturity(b.maturity, now),
    currentYield: currentYield(b),
    yieldToMaturity: approxYTM(b, now),
    value: b.value,
    isCD: isCertificateOfDeposit(a as any),
    accruedCaveat: accruedInterestCaveat(b),
  };
};

/* ─ MK-NW-O-001 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * theBonds
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     now = input.today (or new date() when missing)
 *     held = input.accounts (or none when missing) where is bond
 *     sum = bond summary(held.map(bond info), now)
 *     one = nothing
 *     b = bond info(opened)
 *     row = row of(opened, now)
 *     years = row.years left (or 0 when missing)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... MK-NW-M-023 · MK-NW-M-024 · MK-NW-M-025 · MK-NW-M-026
 *               MK-NW-M-027 · MK-NW-M-041 · MK-NW-M-042 · MK-NW-M-043
 *               MK-NW-M-044 · MK-NW-M-045
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-011 bond face value
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Decides .....
 *     · If years left is missing it uses 0.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-NW-O-001
 * Changed ..... not in git yet (—)
 */
/** ── ORCHESTRATOR ─────────────────────────────────────────────────────────────────────
 *  The one function a screen calls for this question. Written as a DOC comment on purpose: the
 *  header generator owns the plain block comment below and rewrites it on every build, which is how
 *  all twelve doors lost this marker once and two were typed F instead of O (2026-09-28). */
/* ─ MK-NW-O-001 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * theBonds
 *
 * Answers ..... ── ORCHESTRATOR ───────────────────────────────────────────────────────────────────── The one function a screen calls for this question.
 *
 * Formula .....
 *     now = input.today (or new date() when missing)
 *     held = input.accounts (or none when missing) where is bond
 *     sum = bond summary(held.map(bond info), now)
 *     one = nothing
 *     b = bond info(opened)
 *     row = row of(opened, now)
 *     years = row.years left (or 0 when missing)
 *
 * Called by ... MK-NW-F-077 ALL · MK-NW-F-078 ONE
 *
 * Reaches ..... 71 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-077 ALL · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-NW-F-078 ONE · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               … and 53 more — the full list is on functions_from_code
 *
 * Serves ...... MK-NW-M-023 · MK-NW-M-024 · MK-NW-M-025 · MK-NW-M-026
 *               MK-NW-M-027 · MK-NW-M-041 · MK-NW-M-042 · MK-NW-M-043
 *               MK-NW-M-044 · MK-NW-M-045 · MK-NW-M-053 · MK-NW-M-054
 *               MK-NW-M-055 · MK-NW-M-056 · MK-NW-M-057 · MK-NW-M-058
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-003 institution name
 *               MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-028 assumed return
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 * Ruled by .... DEC-0108
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
 *
 * Decides .....
 *     · If years left is missing it uses 0.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-NW-O-001
 * Changed ..... not in git yet (—)
 */
export function theBonds(input: BondsInput): Bonds {
  const now = input.today ?? new Date();
  const held = (input.accounts ?? []).filter(isBond);
  // SORTED BY MATURITY, once, in the door — so the Bonds screen and any other reader show the same
  // list in the same order without each sorting for itself.
  const rows = held.map((a) => rowOf(a, now))
    .sort((x, y) => (Date.parse(x.maturity) || Infinity) - (Date.parse(y.maturity) || Infinity));
  const sum = bondSummary(held.map(bondInfo), now);

  let one: OneBond | null = null;
  const opened = input.accountId != null
    ? held.find((a) => String(a.asset_id) === String(input.accountId))
    : undefined;
  if (opened) {
    const b = bondInfo(opened);
    const row = rowOf(opened, now);
    const years = row.yearsLeft ?? 0;
    // A CD IS NOT MARKED TO MARKET — the founder's ruling, built into the door so no screen has to
    // remember it. KEEP (2026-09-27): the app does not ask whether a CD is a bank one or a brokered
    // one; it says the true thing for a bank CD, which is what almost everyone holds, and names the
    // difference rather than pretending it does not exist.
    const refusal = row.isCD
      ? 'Nothing happens to this CD. It is not traded, so its value does not move with rates — it is worth '
        + 'its balance until it matures, when the face value above comes back. '
        + 'The only way out early is to break it, and your bank charges a fixed penalty for that, usually some '
        + 'months of interest. A brokered CD, bought through a brokerage rather than a bank, does trade and does '
        + 'move with rates; we do not ask which yours is, so we say the safe thing.'
      : '';
    one = {
      ...row,
      matured: years <= 0,
      ratesMove: row.isCD ? null : bondRateSensitivity(b, now),
      ratesMoveRefusal: refusal,
    };
  }

  return {
    count: sum.count,
    totalValue: sum.totalValue,
    totalFace: sum.totalFace,
    couponPerYear: sum.annualCoupon,
    avgYield: sum.avgYield,
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
    balance: 24200, target_return: 0, face_value: 25000, coupon_rate: 0.045, maturity_date: '2029-09-30' },
  { asset_id: 'b2', label: 'Ally 12-month CD', institution: 'Ally', kind: 'bond', tax_bucket: 'TAXABLE',
    balance: 10000, target_return: 0, face_value: 10000, coupon_rate: 0.0505, maturity_date: '2027-03-15' },
] as any[];
const GIVEN =
  'Two bonds on 28 Sep 2026: a $25,000-face Treasury paying 4.5%, maturing 30 Sep 2029, worth $24,200 today; '
  + 'and a $10,000 Ally CD paying 5.05%, maturing 15 Mar 2027, worth its $10,000.';
/* ─ MK-NW-F-077 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * ALL
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-078 ONE
 *
 * Reaches ..... 70 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-CF-F-205 COMING
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-NW-F-078 ONE
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-100 TREND
 *               … and 52 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-077
 * Changed ..... not in git yet (—)
 */
const ALL = () => theBonds({ accounts: EXAMPLE, today: TODAY });
/* ─ MK-NW-F-078 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * ONE
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-CF-F-005 actualMonthFlow · MK-NW-F-102 rateWhereItRefuses
 *               MK-NW-O-003 theNetWorth
 *
 * Reaches ..... 69 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-CF-F-205 COMING
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-100 TREND · MK-CF-F-026 actualDebtPayment
 *               … and 51 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Decides .....
 *     · If current yield is missing it uses 0.
 *     · If years left is missing it uses 0.
 *     · Shows 2 decimal places.
 *     · Shows 1 decimal place.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-078
 * Changed ..... not in git yet (—)
 */
const ONE = () => theBonds({ accounts: EXAMPLE, accountId: 'b1', today: TODAY }).one!;

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
    formula: 'the bond account\u2019s own balance',
    inputs: ['MK-XS-I-001 account balance'],
    refusal: '\u2014 the row is not drawn at all when there is no bond.',
    ruled: '2026-10-01',
    worked: { given: GIVEN, answer: '$10,000', run: () => ALL().rows[0].value },
  },
  'MK-NW-M-055': {
    label: 'one bond\u2019s face', unit: 'money', screens: ['/bonds'], grain: 'one bond',
    answers: 'What this one bond pays back at maturity.',
    formula: 'the face value as entered, or the balance when no face was given',
    inputs: ['MK-XS-I-001 account balance'],
    refusal: 'Falls back to the value entered, and the row says face with that figure.',
    ruled: '2026-10-01',
    worked: { given: GIVEN, answer: '$10,000', run: () => ALL().rows[0].face },
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
    worked: { given: GIVEN, answer: '$505/year', run: () => ALL().rows[0].couponPerYear },
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
    worked: { given: GIVEN, answer: '5.05%', run: () => ALL().rows[0].currentYield },
  },
  'MK-NW-M-058': {
    label: 'Yield to maturity', unit: 'percent-2dp', screens: ['/bonds'], grain: 'one bond',
    answers: 'What this bond would earn a year if held to maturity, counting the gain or loss between '
      + 'what it is worth now and what it pays back.',
    formula: 'the coupon a year plus (face \u2212 value) spread over the years left, \u00f7 the value today',
    inputs: ['MK-XS-I-001 account balance'],
    decisions: ['AN ESTIMATE, and the foot of the screen says so in those words.'],
    refusal: '\u2014 with no maturity date there are no years to spread the difference over.',
    ruled: '2026-10-01',
    worked: { given: GIVEN, answer: '5.05%', run: () => ALL().rows[0].yieldToMaturity },
  },
  'MK-NW-M-041': {
    label: 'total value of your bonds', unit: 'money', screens: ['/bonds'],
    answers: 'What every bond and CD you hold is worth today, added up.',
    formula: 'the sum of each bond account’s balance',
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
    formula: 'for each bond: face value × coupon rate; then added up',
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
      run: () => (() => { const r = ALL().rows[0]; return `${r.label} — face ${formatMoney(r.face)}, ${formatMoney(r.couponPerYear)}/year, ${((r.currentYield ?? 0) * 100).toFixed(2)}%`; })(),
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
      run: () => `${formatMoney(ONE().couponPerYear)}/year — ${(ONE().couponRate * 100).toFixed(2)}% of ${formatMoney(ONE().face)} face`,
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
    formula: '(coupon + (face − value) ÷ years left) ÷ ((face + value) ÷ 2) — the standard approximation',
    inputs: ['MK-NW-I-001 your accounts'],
    decisions: ['An approximation, and labelled an estimate on screen.'],
    refusal: 'Matured, or no maturity date — it refuses rather than divide by nothing.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '5.66%',
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
  'MK-NW-M-028': {
    label: 'Rates rise 1% → value roughly $X–$Y', unit: 'words', screens: ['/account-detail'], grain: 'one bond',
    answers: 'Roughly what this bond would be worth if interest rates moved one percent either way.',
    formula: 'price it again at (yield to maturity ± 1%), and show a band of ±1% around that',
    inputs: ['MK-NW-I-001 your accounts'],
    decisions: [
      'An estimate, and it wears the estimate label.',
      'FOUNDER 2026-09-27: a CD gets no estimate. It is not traded, so its value does not move with rates; '
      + 'the screen says that instead. KEEP — the app does not ask whether a CD is a bank one or a brokered one.',
    ],
    refusal: 'Refused for a CD, for a matured bond, and for anything with no coupon or no maturity — '
      + 'and for a CD it says plainly why nothing happens.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$23,000–$24,000',
      run: () => `${formatMoney(ONE().ratesMove!.ratesUp.low)}–${formatMoney(ONE().ratesMove!.ratesUp.high)}`,
    },
  },
});
