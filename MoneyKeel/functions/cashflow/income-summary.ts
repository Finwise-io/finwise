// Cash flow · Your income — everything coming in, and what reaches your bank.
//
// Built from the approved mock: income-v5, frames 5a and 5b.
//
// TWO TOTALS, NEVER ONE. What LANDS is what you can spend. What you are TAXED ON is a different
// number and is labelled as one. Mixing them is how a take-home figure comes to include a bonus
// nobody has been paid yet — and how interest and dividends came to be counted as spendable when
// they are reinvested where they are earned and never reach the bank.
import { PAY_FREQUENCY_NOT_RECOGNISED, payFrequencyOf, isPayFrequency } from '../../../src/domain/income/pay-frequency';   // R23, 2026-11-01
import { plural } from '../../../src/domain/_shared/plural';   // the one list of words and plurals (DEC-4082, 2026-10-10)
import { declareFigures, percentDigits } from '../_figure-spec';
import { toNum } from '../../../src/domain/_shared/num';
import { salaryAnnual, taxableAnnual, rentalNetAnnual, extraIncome, filingStatusOf,
         over65CountOf, incomeMonthlyGrid } from '../../../src/domain/income';
// the two sources the YOUR SOURCES list needs, from the one place each is calculated
import { rsuAnnual, retirementIncomeMonthly, benefitActiveMonths, salaryGrossByMonth, rentalList, stateRateOf,
         taxedSourcesAnnual, profileWithAccountIncome, retirementIncomeTaxedMonthly, unemploymentMonthly, vestsAreCash, vestsNotEntered,
         landsOnce, socialSecurityNotYetMonthly } from '../../../src/domain/income/onboarding';
import { guaranteedOutsideStreams } from '../../../src/domain/income';
import { incomeFromAccounts } from '../../../src/domain/income/from-accounts';
import { earnerWages } from '../../../src/domain/income/earners';
import { rateInForce, taxedAfterPreTax } from '../../../src/domain/income/tax-rate';
import { marginalBracketFor } from '../../../src/domain/income/tax';
import { basePay, entryFromWage } from './base-pay';
import { inflowLabel } from './this-month';
import { rentalsHeld, guaranteedReceivedNow } from './income-tab';   // the Income tab's two readers (CF-MMFIX-A, 2026-10-25)

export interface Line { label: string; note?: string; amount: number;
  /** On an earner's pay row only: true when the take-home is the app's own estimate — worked with the CALCULATED rate — and
   *  it then wears ≈. A take-home worked from their typed rate is theirs (2026-10-25, IN-03). Only pay rows carry it, so a
   *  screen can find them by it. */
  estimated?: boolean;
  /** On any row: the figure is worked with the calculated rate, so it wears ≈ (rule 9; 2026-10-25, IN-03). */
  approx?: boolean; }

export interface IncomeSummary {
  /** What reaches the bank, per month — the money that can be spent. */
  lands: { lines: Line[]; usualMonth: number;
    /** Any row is the app's estimate, so the total and its band wear ≈ too (2026-10-25, IN-03). */
    approx: boolean;
    /** The Rent row's own amount — 0 with no rental. Named so another function can ask for the rent
     *  that arrives without finding a row by its label (the emergency fund counts it, 2026-10-04). */
    rentMonthly: number;
    /** The words on the total — his one wording for money arriving: "Inflow (income (take-home) + rent)". */
    totalLabel: string;
    /** The month that stands apart, named in full, with why: "December · with the bonus". */
    standoutMonth: { label: string; note: string; amount: number; approx: boolean } | null };
  /** What the year is taxed on — a different number, and said to be one. */
  taxed: {
    lines: Line[];
    grossAnnual: number;
    bracket: number;          // the FEDERAL TAX BRACKET, named
    tax: number;              // the year's tax, at whichever rate is in force
    /** THE RATE IN FORCE (MK-CF-F-181 rateInForce), as a share of the year's taxed income — the one rate sign-up's income
     *  recap and every Cash flow screen use (2026-10-24: sign-up calculated its own, before the 401(k) came off). */
    rate: number;
    /** WHAT THE YEAR IS TAXED ON (MK-CF-M-041, 2026-10-24): the gross (grossAnnual, MK-CF-M-076) less the year's 401(k)s
     *  (k401Annual, MK-CF-M-077) — his DEC-0283: income before tax is gross less the 401(k). The bracket and a calculated
     *  tax are worked on this. */
    taxedOn: number;
    k401Annual: number;
    /** THE LINE UNDER A CALCULATED TAX — what the calculated rate holds (2026-10-24): federal only, or federal plus the state
     *  rate the person entered, which the rate in force adds (DEC-7608). */
    calculatedNote: string;
    /** A state rate entered on the Tax organizer is inside the calculated tax: its row reads "Calculated tax", never "Calculated
     *  federal tax" (2026-10-25, the lead's ruling on MK-CF-M-044 t8; canon row 25). */
    holdsState: boolean;
    whose: string;            // 'your rate, 24%' · 'calculated, 9%'
    estimated: boolean;
    /** How the household files, in the words the filing question uses — "Married filing jointly". */
    filing: string;
    /** The sentence under the tax line when the rate is the person's own (income-end-to-end_v07, frame 16). */
    closing: string;
  };
  /** Money that is taxed but never lands — said on the screen so the gap is never a mystery. */
  taxedNotLanded: number;
  /** The year's stock that vests and is kept as shares — taxed below, not money to spend (the lead's ruling of 2026-10-25, like
   *  DEC-0179); 0 when there is none or the shares are sold when they vest. */
  vestHeldAnnual: number;
  /** What was entered and is counted nowhere yet, each in one sentence that says why (2026-10-25, tenet 3): a vest with no date,
   *  a one-time payment or signing bonus with no year. */
  notCounted: string[];
  /** YOUR SOURCES — every source entered, in its own period, as typed (MK-CF-O-016 incomeSources; 2026-10-25): the Income tab prints
   *  these rows, so a screen asks this door, never the list's function itself. */
  sources: IncomeSource[];
  /** How many earners have a wage entered — so a screen can say whose income a figure rests on. */
  wages: number;
  ready: boolean;             // false on a fresh account: the screen keeps its shape and shows no $0
  /** A WAGE ENTERED THAT CANNOT BE READ (R23a, 2026-11-01): its pay frequency is outside the one table, or it is hourly with no hours
   *  a week. The sentence that says why — or null. Every figure that rests on the wage (the take-home, the bracket, the tax, the
   *  totals) refuses with it; a source that does not rest on it still prints. */
  wageRefusal: string | null;
  /** THE ROWS OF THE WAGE THAT CANNOT BE READ (R27, 2026-11-02): its take-home row and its gross row, by label ('Your pay', 'Your
   *  gross') — a screen leaves out exactly these, and keeps a spouse's gross that does not rest on it, so its rows add to its total. */
  unreadRows: string[];
  /** RENT WAITING FOR ITS PROPERTY (DEC-4059d; R27, 2026-11-02): the rent kept a month that names no property, counted nowhere, or
   *  null. A screen says it — "Your rent of $1,200/month is not counted until you pick its property." — with the figure under MK-CF-M-010. */
  rentWaiting: number | null;
}

/** ── THE FIGURES THIS DOOR HANDS OUT (founder rule 11, 2026-09-14) ───────────────────────────────
 *  Declared beside the code that computes them; the master file's rows for the income screen are
 *  printed from this. TWO TOTALS, NEVER ONE — each figure says which of the two it belongs to.
 */
/** THE WORKED EXAMPLE — ONE HOUSEHOLD (six steps, step 6, 2026-09-28).
 *
 *  The same two earners the base-pay door uses, because it is the same household read one screen
 *  further up: $4,200 every two weeks and $5,000/month, $1,200 and $400 into 401(k)s, filing
 *  jointly, tax rate typed at 22%. Every figure runs `incomeSummary`, the real door.
 *
 *  TWO TOTALS, NEVER ONE — which is what this screen exists to say. $169,200 is what the year is
 *  TAXED on; $9,398/month is what LANDS. They are different numbers about the same wages, and the
 *  screen labels each rather than letting one stand for both.
 *
 *  WHAT THIS EXAMPLE FOUND, 2026-09-28: the two take-home lines add to $9,398, and the total beside
 *  them reads $9,798 — $400 more, which is exactly the spouse's monthly 401(k). The lines come from
 *  the base-pay door; the total comes from `incomeMonthlyGrid`, which reads `c_401k` from the profile
 *  and so only ever sees the FIRST earner's contribution. Two definitions of take-home in one
 *  function. The example below states the total the code gives today, so the row does not pretend
 *  otherwise, and the finding is on the master file rather than in a comment. Not changed here: it
 *  lowers a figure on a screen he reads, and that is his call (rule 10).
 */
const EXAMPLE = {
  taxMode: 'manual', manualTaxRate: 22, filingStatus: 'married', whoEarns: 'both',
  baseSalary: 4200, salaryFreq: 'biweekly', salaryMode: 'gross', c_401k: 1200,
  partnerName: 'Sam',
  partnerWage: { baseSalary: 5000, salaryFreq: 'monthly', salaryMode: 'gross', c_401k: 400 },
};
const GIVEN =
  'Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), '
  + 'paying $1,200 and $400/month into their 401(k)s, with the tax rate typed at 22%.';

/** Example only: runs incomeSummary on the worked example and calculates nothing of its own. */
/* ─ MK-CF-F-201 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * INCOME
 *
 * Answers ..... Example only: runs incomeSummary on the worked example and calculates nothing of its own.
 *
 * Formula .....
 *     income summary(EXAMPLE)
 *
 * Called by ... MK-CF-F-024 totalDebtMonthly · MK-CF-F-207 SOURCE
 *               MK-CF-F-296 LOAD · MK-PL-F-010 drawOrderOutcome
 *
 * Reaches ..... 487 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 469 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-023 salary and other income
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-039 how often each income arrives
 *               MK-XS-I-059 the month a bonus lands
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-201
 * Changed ..... not in git yet (—)
 */
const INCOME = () => incomeSummary(EXAMPLE);

/** THE SAME HOUSEHOLD WITH EVERY KIND OF SOURCE (2026-10-02) — so each source row has an example that
 *  produces it: $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400,
 *  a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security. */
const SOURCES_EXAMPLE = {
  ...EXAMPLE,
  // 'annual', the value the self-employment question writes — 'yearly', which no question writes, read the $24,000 as a month
  // (2026-10-25, FIX-INCOME-B; FOUND F2 by the outside measurement)
  seAmount: 24000, seFreq: 'annual', bonusAnnual: 12000, bonusMonth: 3,
  rsuShares: '50', rsuPrice: '400',
  // the rent entry names its property — an entry with none is not rent (DEC-4059d, 2026-10-10)
  rentals: [{ type: 'long', income: 2000, expenses: 800, property_id: 'rental-house' }],
  ri_ss: '2100', ri_ss_receiving: 'yes', ri_ss_freq: 'monthly',
};
const SOURCES_GIVEN =
  'The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares '
  + 'vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security.';

/** Example only: picks one kind of income source out of the worked example household. */
/* ─ MK-CF-F-207 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * SOURCE
 *
 * Answers ..... Example only: picks one kind of income source out of the worked example household.
 *
 * Formula .....
 *     income sources(SOURCES_EXAMPLE).find((x) => kind = kind)!
 *
 * Called by ... MK-CF-F-201 INCOME · MK-CF-O-016 incomeSources
 *
 * Reaches ..... 487 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 469 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-022 pension monthly amount
 *               MK-XS-I-035 annuity income
 *               MK-XS-I-040 whether a stream is already being received
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-207
 * Changed ..... not in git yet (—)
 */
const SOURCE = (kind: IncomeSource['kind']) => incomeSources(SOURCES_EXAMPLE).find((x) => x.kind === kind)!;

// MK-CF-F-210 annualOfSource — RETIRED 2026-10-25 (FIX-INCOME-B; the outside review's part 5, MK-CF-F-210-C03 to C05). It turned
// a YOUR SOURCES row into a year, and on every salary row returned the household's salary ($138,432.60 on each of an $84,111.17
// and a $54,321.43 earner's rows; a $0 row read the spouse's $60,000). Nothing called it, and nothing should: YOUR SOURCES shows
// each source in the period it was entered, never converted (MK-CF-M-006), and each year figure has its own function
// (taxedSourcesAnnual, salaryAnnual). The number is never reused. To reverse: restore it from git and fix it to read
// wageGrossByMonth of the row's own earner.

export const FIGURES = declareFigures({
  'MK-CF-M-037': {
    label: 'Take-home each month', unit: 'money', per: 'month', screens: ['/income-summary', '/income-manager'],
    answers: 'What reaches the bank in a usual month, from every source of income added together.',
    formula: 'take-home a usual month = Σ of every source’s take-home in a usual month; a source that lands in one month of the year is not spread across twelve',
    inputs: ['MK-CF-M-031 household take-home', 'MK-CF-I-006 other income', 'MK-CF-I-007 rental income', 'MK-CF-I-008 retirement income'],
    decisions: ['A once-a-year source keeps its own month and is shown separately, never averaged in.'],
    ruled: '2026-09-14',
    refusal: 'Shows $0 on a fresh account, with the door to enter income — never a dash.',
    note: 'FOUND BY THE WORKED EXAMPLE AND FIXED THE SAME DAY, 2026-09-28. This total read $9,798/month while the two take-home lines beneath it (MK-CF-M-038) added to $9,398 — $400 apart, exactly the spouse\'s monthly 401(k). MK-CF-F-060 salaryGrossByMonth sums EVERY earner\'s wage (his ruling, 2026-08-27) but the 401(k) taken off that household gross was written as the first earner\'s alone, so a spouse\'s was never subtracted — the take-home read too high by their contribution, and the taxable base too. NOT A NEW QUESTION: he ruled this on 2026-09-12 on income-end-to-end v07 — "one card disagreeing with itself; corrected to the take-home line" — and the correction reached the mock and not the code. Now MK-CF-F-206 householdK401ByMonth counts every earner in the months that earner is paid, and src/__tests__/guard_total_agrees_with_its_lines.test.ts holds the ruling. The six personas all passed throughout because none had a spouse with their own wage AND their own 401(k); twoEarnersBoth401k now does.',
    worked: {
      given: GIVEN,
      answer: '$9,398/month',
      run: () => INCOME().lands.usualMonth,
    },
  },
  'MK-CF-M-038': {
    label: 'each source of take-home', unit: 'money', per: 'month', screens: ['/income-summary'],
    answers: 'What each source of income puts into the bank in a usual month, named and listed.',
    formula: 'one line per source: the earner’s take-home, or the source’s monthly amount',
    inputs: ['MK-CF-M-031 household take-home', 'MK-CF-I-006 other income', 'MK-CF-I-007 rental income'],
    ruled: '2026-09-14',
    refusal: 'The list is replaced by the door to enter income when nothing is entered.',
    worked: {
      given: GIVEN,
      answer: '$5,898/month',
      run: () => INCOME().lands.lines[0].amount,
    },
  },
  'MK-CF-M-039': {
    label: 'its own month, never spread', unit: 'money', screens: ['/income-summary', '/income-manager'],
    // THE ROW'S WORDS NOW SAY WHAT THE SCREEN PRINTS (2026-10-23, CF-FIX; the Cash flow package's check of the declarations):
    // the words said the source and its amount; the figure, and the worked answer $40,316, is the whole of that month's
    // take-home — the usual month plus the $12,000 bonus after tax — which is what "March will look different" shows. No figure moves.
    answers: 'What the month a once-a-year source lands in brings in, all of it — the usual take-home plus that source after tax — shown in its own month rather than divided by twelve.',
    formula: 'the standout month = of the twelve months’ take-home, the largest, when it is more than the usual month by over $1: its amount is that whole month’s take-home (the usual month plus the lump, after tax), its label the month’s name',
    inputs: ['MK-CF-I-009 bonus', 'MK-CF-I-010 equity vesting'],
    decisions: ['A lump that lands once is never averaged across the year (founder, 2026-08-28).'],
    ruled: '2026-09-14',
    refusal: 'The line is hidden when no source behaves this way.',
    // the month the $12,000 bonus lands: the usual month plus the bonus, after tax, as one figure
    // $23,225 since 2026-10-25 (FIX-INCOME-B): the example's self-employment is $24,000 a YEAR as the question writes it ('annual';
    // 'yearly', which no question writes, read as a month — $40,316, FOUND F2), and its Social Security is taxed in the share IRS
    // Publication 915 taxes ($21,420 of $25,200 on this household), so $69 more of it lands each month than at 22% of all of it
    worked: { given: SOURCES_GIVEN, answer: '$23,225', run: () => incomeSummary(SOURCES_EXAMPLE).lands.standoutMonth?.amount ?? null },
  },
  'MK-CF-M-040': {
    label: 'is not here — it is reinvested where it is earned', unit: 'money', per: 'month', screens: ['/income-summary'],
    answers: 'Income that is taxed but never reaches the bank, so the two totals on this screen can be told apart.',
    formula: 'taxed but not landed = interest and dividends earned inside accounts, which stay where they are earned',
    inputs: ['MK-CF-I-011 interest and dividends'],
    ruled: '2026-09-14',
    refusal: 'The sentence is hidden when there is none.',
    worked: { given: 'The two earners above, with $3,600/year of interest and dividends earned inside their accounts and left there.', answer: '$300/month',
      run: () => incomeSummary({ ...EXAMPLE, invAnnual: 3600 }).taxedNotLanded },
  },
  'MK-CF-M-041': {
    label: 'What it is taxed on', unit: 'money', per: 'year', screens: ['/income-summary'],
    // (2026-10-24, CF-FIX; his DEC-0283) the income the tax is worked on is the gross less the 401(k)s: this printed the gross,
    // $169,200, while the bracket and a calculated tax were worked on $150,000. The gross is MK-CF-M-076 now.
    answers: 'The whole year of income the tax is calculated on — the gross less the 401(k)s — a different number from the take-home, and said to be one.',
    formula: 'what it is taxed on = gross a year (MK-CF-M-076) − the year\'s 401(k)s (MK-CF-M-077), never below $0 — his DEC-0283: income before tax is gross less the 401(k)',
    inputs: ['MK-CF-M-076 gross a year', 'MK-CF-M-077 401(k)s a year'],
    decisions: ['Income before tax is gross less the 401(k) and any other deduction; gross is before any deductions (DEC-0283, 2026-09-10).'],
    ruled: '2026-09-14',
    refusal: 'Shows $0 on a fresh account, with the door to enter income.',
    worked: {
      given: GIVEN,
      answer: '$150,000/year',
      run: () => INCOME().taxed.taxedOn,
    },
  },
  'MK-CF-M-076': {
    label: '= Gross /year', unit: 'money', per: 'year', screens: ['/income-summary', '/base-pay'],   // Base pay names it as what its band is read on (2026-10-25, F3)
    answers: 'The whole year of income before any deductions — every taxable source, wages at gross.',
    formula: 'gross a year = Σ of every taxable source over the year, wages included at gross, before any deductions',
    inputs: ['MK-CF-M-030 gross a year', 'MK-CF-I-006 other income', 'MK-CF-I-007 rental income', 'MK-CF-I-011 interest and dividends'],
    decisions: ['Gross is before any deductions (DEC-0283, 2026-09-10). It was printed as MK-CF-M-041 until 2026-10-24, when that became the income after the 401(k)s.'],
    refusal: 'Not shown on a fresh account — the door to enter income stands in the list.',
    worked: {
      given: GIVEN,
      answer: '$169,200/year',
      run: () => INCOME().taxed.grossAnnual,
    },
  },
  'MK-CF-M-077': {
    label: 'Your 401(k)s', unit: 'money', per: 'year', screens: ['/income-summary'],
    answers: 'What every earner puts into their own 401(k) over the year — taken off the gross before tax.',
    formula: '401(k)s a year = each earner\'s own contribution for the months they are paid, added up (the employer\'s match excluded) — as many dollars as the gross is above what it is taxed on',
    inputs: ['MK-CF-I-004 401(k) contribution'],
    decisions: ['A 401(k) comes off the gross before tax (DEC-0283, 2026-09-10; founder audit B05).'],
    refusal: 'A real $0 when no 401(k) is entered; not shown on a fresh account.',
    worked: {
      given: GIVEN,
      answer: '$19,200/year',
      run: () => INCOME().taxed.k401Annual,
    },
  },
  'MK-CF-M-042': {
    label: 'each taxed source', unit: 'money', per: 'year', screens: ['/income-summary'],
    answers: 'What each source contributes to the year the tax is calculated on.',
    // (2026-10-25, FIX-INCOME-B; DEC-0376) every source, signed, from taxedSourcesAnnual — the rows add to "= Gross /year"
    formula: 'one line per source the year is taxed on, at its yearly amount and signed (a rental loss is a loss) — each earner\'s wages, tips, self-employment, a bonus, a signing bonus or one-time payment of this year, the stock that vests this year, the rent net of its costs, interest and dividends, other taxed income, unemployment pay, retirement income received now, and the part of Social Security IRS Publication 915 taxes; the lines add to MK-CF-M-076',
    inputs: ['MK-CF-M-041 gross a year'],
    ruled: '2026-09-14',
    refusal: 'The list is replaced by the door to enter income when nothing is entered.',
    worked: {
      given: GIVEN,
      answer: '$109,200/year',
      run: () => INCOME().taxed.lines[0].amount,
    },
  },
  // ALSO NAMED ON THE DEBTS TAB'S MORTGAGE COMPARISON (2026-10-26, PF-TOOLS): "… after your 24% federal tax bracket" is this figure
  // (federalBracketForComparison reads it from this door, FIX-ROOM 2026-10-25) — one figure, two screens
  'MK-CF-M-043': {
    label: 'Federal tax bracket', unit: 'percent', screens: ['/income-summary', '/cashflow'],
    answers: 'What the next dollar costs in federal income tax, with every source counted, not wages alone.',
    // (2026-10-24, CF-FIX) the bracket of the income the tax is worked on — the 401(k)s are out first (B05) — not of the
    // whole year's gross: single, $70,000 of wages and a $10,000 401(k) is 12%, where the gross alone reads 22%
    // (2026-10-27, PF-TOOLS; the screens measurement, MK-CF-M-043 tenet 2) the 401(k) comes off ONCE, as in the code
    // (taxedAfterPreTax MK-CF-F-230, then marginalBracketFor MK-CF-F-103 through deductionFor MK-CF-F-099): the words took it off
    // twice. No figure moves (22%). To reverse: the old words.
    formula: 'the published bracket of (every source counted − each earner’s own 401(k) − the standard deduction, with the 65-and-over additions when they apply), for their filing status',
    inputs: ['MK-CF-M-041 gross a year', 'MK-XS-I-024 filing status'],
    ruled: '2026-09-14',
    refusal: 'The row is not shown until income is entered.',
    note: 'The same concept as MK-CF-M-032 on the base-pay screen, over a wider base: that one counts wages, this one counts every source. Conflict C-5 on the orchestrator map asks whether they stay two figures.',
    worked: {
      given: GIVEN,
      answer: '22%',
      run: () => INCOME().taxed.bracket,
    },
  },
  // ALSO THE SIGN-UP RECAP'S YEAR TAX (2026-10-26, PF-TOOLS): the card read the year's tax with its own arithmetic, the same as this
  'MK-CF-M-044': {
    label: 'Calculated federal tax', unit: 'money', per: 'year', screens: ['/income-summary', '/onboarding'],
    answers: 'The federal income tax for the year, at whichever rate is in force — theirs if they entered one, ours if not.',
    // (2026-10-24, CF-FIX; the fault fixed on MK-CF-M-033) the worked example ran the household with a typed 22% — the row the
    // screen prints as "Tax", not "Calculated federal tax" — and the words taxed the gross, the 401(k) still in it
    formula: 'tax a year = a rate typed by the person × the year\'s gross (MK-CF-M-076); when it is ours, federal tax on what it is taxed on (MK-CF-M-041: the gross less the 401(k)s) less the standard deduction, at the published bands — plus a state rate the person entered',
    inputs: ['MK-CF-M-041 what it is taxed on', 'MK-CF-M-076 gross a year', 'MK-CF-I-005 tax rate as entered', 'MK-XS-I-024 filing status'],
    decisions: ['When it is ours it assumes the standard deduction and is federal only, plus a state rate entered (MK-CF-D-002, DEC-7608).',
      'The 401(k) comes off before tax (DEC-0283).'],
    ruled: '2026-09-14',
    refusal: 'The row is not shown until income is entered.',
    worked: {
      given: 'The same two earners filing jointly, $169,200 of wages and $19,200 into their 401(k)s, with no tax rate typed. Taxed on '
        + '$150,000; less the $32,200 standard deduction, $117,800 → $2,480 + $9,120 + 22% × $17,000 = $15,340.',
      answer: '$15,340/year',
      run: () => incomeSummary({ ...EXAMPLE, taxMode: undefined, manualTaxRate: undefined }).taxed.tax,
    },
  },
  // ── YOUR SOURCES (2026-10-02): six hand-typed rows of the master became declarations — same identifiers,
  //    same figures, now printed from here with their inputs, formulas and examples. The screen asks
  //    incomeSources for them instead of adding the profile up itself.
  'MK-CF-M-006': {
    label: 'YOUR SOURCES — Base salary', unit: 'money', screens: ['/cashflow'], grain: 'one earner',
    answers: 'Each earner’s base pay, as it was entered, with whether it was entered before tax or as take-home.',
    formula: 'the base salary of each earner, in the period it was entered',
    inputs: ['MK-XS-I-023 salary and other income', 'MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly'],
    decisions: ['NEVER CONVERTED SILENTLY: the amount is shown in the period it was entered, and the period is said beside it.'],
    refusal: 'No salary entered — the row does not appear; the door to enter it does.',
    ruled: '2026-10-02',
    worked: { given: SOURCES_GIVEN, answer: '$4,200', run: () => SOURCE('salary').amount },
  },
  'MK-CF-M-007': {
    label: 'YOUR SOURCES — Self-employment', unit: 'money', screens: ['/cashflow'],
    answers: 'Self-employment income, net, in the period it was entered.',
    formula: 'the self-employment amount as entered, monthly or yearly',
    inputs: ['MK-XS-I-023 salary and other income'],
    refusal: 'None entered — the row does not appear.', ruled: '2026-10-02',
    worked: { given: SOURCES_GIVEN, answer: '$24,000', run: () => SOURCE('self-employment').amount },
  },
  'MK-CF-M-008': {
    label: 'YOUR SOURCES — Bonus', unit: 'money', per: 'year', screens: ['/cashflow', '/income-manager'],
    answers: 'The bonus for the year and the month it lands.',
    formula: 'the bonus as entered, a year; shown in the month it lands, never spread',
    inputs: ['MK-CF-I-009 bonus', 'MK-XS-I-059 the month a bonus lands'],
    decisions: ['A LUMP THAT LANDS ONCE IS NEVER AVERAGED across the year (founder, 2026-08-28).'],
    refusal: 'None entered — the row does not appear.', ruled: '2026-10-02',
    worked: { given: SOURCES_GIVEN, answer: '$12,000/year', run: () => SOURCE('bonus').amount },
  },
  'MK-CF-M-009': {
    label: 'YOUR SOURCES — Stock vesting (equity)', unit: 'money', per: 'year', screens: ['/cashflow', '/income-manager'],
    answers: 'What vests in this calendar year, valued at the price entered.',
    // (2026-10-25, FIX-INCOME-B; DEC-0012) the year's vests, never an average of the years — 75 shares in March 2026 and 25 in March
    // 2027 at $400 read $20,000; 2026 vests $30,000
    formula: 'the vests whose date names this calendar year, each shares × price per share, added up — a vest with a year and no month counted, one with no date not counted ("vest date not entered"); typed as one yearly figure, that figure',
    inputs: ['MK-CF-I-010 equity vesting', 'MK-XS-I-005 holding price'],
    refusal: 'No equity entered — the row does not appear.', ruled: '2026-10-02',
    worked: { given: SOURCES_GIVEN, answer: '$20,000/year', run: () => SOURCE('equity').amount },
  },
  'MK-CF-M-010': {
    label: 'YOUR SOURCES — Rental property', unit: 'money', per: 'month', screens: ['/cashflow', '/income-manager'],
    answers: 'What the rental brings in each month after its running costs.',
    formula: '(rent − running costs) for each rental, added up',
    inputs: ['MK-CF-I-007 rental income'],
    refusal: 'No rental entered — the row does not appear.', ruled: '2026-10-02',
    worked: { given: SOURCES_GIVEN, answer: '$1,200/month', run: () => SOURCE('rental').amount },
  },
  'MK-CF-M-011': {
    label: 'YOUR SOURCES — Social Security · pension', unit: 'money', per: 'month', screens: ['/cashflow'],
    answers: 'Guaranteed income being received now — Social Security, pension, annuity and other — in a month.',
    formula: 'Social Security + pension + annuity + other, each brought to a monthly amount',
    inputs: ['MK-XS-I-020 Social Security monthly amount', 'MK-XS-I-022 pension monthly amount', 'MK-XS-I-035 annuity income', 'MK-XS-I-036 other guaranteed income'],
    refusal: 'None being received — the row does not appear.', ruled: '2026-10-02',
    worked: { given: SOURCES_GIVEN, answer: '$2,100/month', run: () => SOURCE('guaranteed').amount },
  },
  'MK-CF-M-024': {
    label: 'each source of guaranteed income', unit: 'money', per: 'month', screens: ['/monthly-income'], grain: 'one source',
    answers: 'One line per guaranteed source — Social Security, a pension, an annuity, other — and what it pays a month.',
    formula: 'each stream as entered, brought to a monthly amount',
    inputs: ['MK-XS-I-020 Social Security monthly amount', 'MK-XS-I-022 pension monthly amount', 'MK-XS-I-035 annuity income', 'MK-XS-I-036 other guaranteed income'],
    refusal: 'Nothing entered — the list is replaced by the door to enter it.', ruled: '2026-10-02',
    worked: { given: SOURCES_GIVEN, answer: '$2,100/month', run: () => guaranteedOutsideStreams(SOURCES_EXAMPLE as any)[0]?.monthly ?? null },
  },
  'MK-CF-M-069': {
    label: 'Your guaranteed income', unit: 'money', per: 'month', screens: ['/monthly-income'],
    answers: 'All the guaranteed income being received now, added up for a month.',
    formula: 'the sum of each source of guaranteed income (MK-CF-M-024)',
    inputs: ['MK-XS-I-020 Social Security monthly amount', 'MK-XS-I-022 pension monthly amount', 'MK-XS-I-035 annuity income', 'MK-XS-I-036 other guaranteed income'],
    refusal: 'Nothing entered — $0, with the door to enter it.', ruled: '2026-10-02',
    worked: { given: SOURCES_GIVEN, answer: '$2,100/month', run: () => retirementIncomeMonthly(SOURCES_EXAMPLE as any) },
  },
  'MK-CF-M-027': {
    // (2026-10-24, Cash flow journey E2E-70) also the Income tab's row for other income — one-time money among it — which had none
    label: 'each income source and its amount', unit: 'money', screens: ['/income-manager', '/cashflow'], grain: 'one source',
    answers: 'Every source of income that has been entered, one line each, in the period it is counted in — a month or a year, said beside it.',
    formula: 'each source as it was entered: rent after its running costs, in a month; interest and dividends, a bonus, scholarships and loans, in a year; the rest in a month',
    inputs: ['MK-XS-I-023 salary and other income', 'MK-CF-I-009 bonus', 'MK-CF-I-010 equity vesting', 'MK-CF-I-007 rental income'],
    refusal: 'Nothing entered — the list is replaced by the one line "Nothing entered yet. Add your income ›" (Q48), which opens Base pay.', ruled: '2026-10-02',
    worked: { given: SOURCES_GIVEN + ' The line shown is the rental’s: what it brings in a month after its costs.', answer: '$1,200',
              run: () => theIncomeManager(SOURCES_EXAMPLE as any).entered.find((x) => x.key === 'rental')?.amount ?? null },
  },
  'MK-CF-M-066': {
    label: 'Dividends, interest & coupons', unit: 'money', per: 'year', screens: ['/income-manager'],
    answers: 'What your holdings and bonds paid out over the last twelve months, from the records.',
    formula: 'the dividend, interest and coupon records of the last twelve months, added up',
    inputs: ['MK-NW-I-004 the activity records', 'MK-NW-I-001 your accounts'],
    // (2026-10-27, PF-TOOLS; the screens measurement, MK-CF-M-066 tenet 3) with no record the screen prints no figure: the FROM
    // YOUR ACCOUNTS block is not drawn and the box asks "How much, a year" — never a $0. To reverse: the old words.
    refusal: 'No record of any — the figure is not shown, and the box asks “How much, a year”.', ruled: '2026-10-02',
    worked: {
      given: 'One account that recorded a $300 dividend in June and $120 of interest in March.',
      answer: '$420/year',
      run: () => incomeFromAccounts([{ asset_id: 'a1', label: 'Brokerage', balance: 10_000 }] as any,
        [{ id: 'd1', account_id: 'a1', type: 'DIVIDEND', amount: 300, date: '2026-06-01' }, { id: 'i1', account_id: 'a1', type: 'INTEREST', amount: 120, date: '2026-03-01' }],
        new Date('2026-09-01T12:00:00')).annual,
    },
  },
} as const);

/** ── ORCHESTRATOR ────────────────────────────────────────────────────────────────────────────
 *  WHAT IS THIS HOUSEHOLD'S INCOME? The income screen calls THIS and nothing else.
 *
 *  It does no arithmetic beyond adding up what the functions below give it, so the two totals cannot
 *  be built from different sources than the rows above them.
 */
/** YOUR SOURCES — every source of income you have entered, named, with what it brings in.
 *
 *  MOVED OFF THE SCREEN (Cash flow pass 1, 2026-10-01). CashFlowScreen built this list itself: six
 *  `sources.push(...)` calls, each reaching for a different field and formatting its own money. Six
 *  rows stood on the master file for it — MK-CF-M-006 base salary, 007 self-employment, 008 bonus,
 *  009 stock vesting, 010 rental, 011 Social Security and pension — as if they were six figures. They
 *  are ONE: a list with one line per source, exactly as MK-NW-M-008 is one figure though every account
 *  differs. His rule is one figure, one identifier.
 *
 *  WHY IT MATTERS BEYOND TIDINESS: the list is how a person checks that nothing they entered is
 *  missing, and on the screen it had no row, no worked example and nothing able to run it. Three of
 *  those six rows said "NOT ON RECORD — no function" on the master, which was true.
 *
 *  EVERY SOURCE SHOWS ITS OWN PERIOD, because they genuinely differ: a salary is what you entered at
 *  the frequency you entered it at, a bonus and vesting land in the year, rent and guaranteed income
 *  monthly. Saying "per month" over a yearly figure would be a wrong number.
 */
export interface IncomeSource {
  /** The words the screen prints, exactly. */
  label: string;
  /** The quieter second line — what makes this source what it is. */
  note: string;
  /** The amount, and the period it is stated in. Never converted silently. */
  amount: number;
  per: 'month' | 'year' | 'quarter' | 'once' | 'as entered';
  /** On a steady salary row: the pay period it was entered in, in words ("every 2 weeks", "monthly"). */
  every?: string;
  /** Which kind it is, for the row that opens its editor. */
  kind: 'salary' | 'self-employment' | 'bonus' | 'equity' | 'rental' | 'guaranteed' | 'benefits' | 'support' | 'interest' | 'other';
  /** A salary that cannot be read, in words: 'pay frequency not recognised' or 'hours a week not entered' (R27, 2026-11-02). */
  unread?: string;
  /** A salary typed by the hour: its figure is an hourly rate, '$25/hour' (CF6-12). */
  hourly?: boolean;
}

/** Which sources of income has this household entered, and what does each one bring in? */
/* ─ MK-CF-O-016 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * incomeSources
 *
 * Answers ..... Which sources of income has this household entered, and what does each one bring in?
 *
 * Formula .....
 *     o = (op ?? {}) as any
 *     out = []
 *     wages = earner wages(o)
 *     freq word = monthly = 'monthly'
 *     biweekly = 'every 2 weeks'
 *     weekly = 'weekly'
 *     annually = 'yearly'
 *     hourly = 'an hour'
 *     varies = string((w as any).salary mode) = 'varies' (or !!(w as any).salary by month when missing or zero)
 *     whose = 'You'   if w = o
 *     spouse name (or 'Spouse' when missing or zero)   otherwise   if wages.length > 1
 *     nothing   otherwise
 *     basis = 'take − home'   if string((w as any).salary mode) = 'takehome'
 *     'before tax'   otherwise
 *     mo = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
 *     m = bonus month read as a number
 *     f = other freq (or 'monthly' when missing)
 *     once = lands once(o).find((x) => kind = 'other')
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-F-207 SOURCE · MK-CF-O-004 incomeSummary
 *
 * Reaches ..... 487 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 469 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-022 pension monthly amount
 *               MK-XS-I-023 salary and other income
 *               MK-XS-I-039 how often each income arrives
 *               MK-XS-I-040 whether a stream is already being received
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-059 the month a bonus lands
 *               MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly
 *               MK-XS-I-075 hours a week, for a wage paid by the hour
 *
 * Decides .....
 *     · If vesting is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-016
 * Changed ..... 2026-10-01 (23d5415)
 */
export function incomeSources(op: Record<string, any> | null): IncomeSource[] {
  const o = (op ?? {}) as any;
  const out: IncomeSource[] = [];
  const wages = earnerWages(o);
  // the five of the one pay-frequency table, in words (R23/R27, 2026-11-02): 'annual' and 'semimonthly' are not among them, so they are
  // not given a word as if they were known — the row says the frequency is not recognised
  const FREQ_WORD: Record<string, string> = { monthly: 'monthly', biweekly: 'every 2 weeks', weekly: 'weekly', annually: 'yearly', hourly: 'an hour' };
  for (const w of wages) {
    // NOTHING ENTERED IS NOT A SOURCE (his Q48 rule, 2026-09-09). My first draft pushed a row for every
    // earner whether or not they had typed a figure, so a fresh account showed "Salary — steady $0" —
    // an invented row. The screen shows $0 with a sentence and the door to enter income; it never
    // lists a source nobody has.
    if (toNum((w as any).baseSalary) <= 0 && !(w as any).salaryByMonth) continue;
    const varies = String((w as any).salaryMode) === 'varies' || !!(w as any).salaryByMonth;
    const whose = wages.length > 1 ? (w === o ? 'You' : (o.partnerName || 'Spouse')) : null;
    const basis = String((w as any).salaryMode) === 'takehome' ? 'take-home' : 'before tax';
    out.push({
      label: `${whose ? whose + ' · ' : ''}${varies ? 'Salary — varies' : 'Salary — steady'}`,
      note: varies ? 'by-month table' : basis,
      amount: toNum((w as any).baseSalary), per: 'as entered', kind: 'salary',
      every: varies ? undefined : FREQ_WORD[payFrequencyOf((w as any).salaryFreq)],
      // THIS wage, if it cannot be read, and why — on its own row (R27, 2026-11-02; CF6-12): it was guessed from the household
      unread: !isPayFrequency((w as any).salaryFreq) ? 'pay frequency not recognised'
        : payFrequencyOf((w as any).salaryFreq) === 'hourly' && String((w as any).hoursPerWeek ?? '').trim() === '' ? 'hours a week not entered' : undefined,
      hourly: payFrequencyOf((w as any).salaryFreq) === 'hourly' || undefined,
    });
  }
  // EVERY ENTERED SOURCE, IN ITS OWN PERIOD, A LOSS INCLUDED, IN THE INCOME TAB'S DRAWN WORDS AND ORDER (2026-10-25, FIX-INCOME-B; the
  // outside review's MK-CF-O-016-C03/C04; cash-flow_v01 frame 5 and its dated row): the Income tab's YOUR SOURCES reads this list —
  // it built its own, which had no row for benefits, support or interest and dividends. Self-employment reads anything not
  // "annual" as monthly, as every calculator does (MK-CF-M-007).
  if (toNum(o.seAmount) > 0) {
    out.push({ label: 'Self-employment', note: o.seFreq === 'annual' ? 'net · yearly' : 'net · monthly',
               amount: toNum(o.seAmount), per: o.seFreq === 'annual' ? 'year' : 'month', kind: 'self-employment' });
  }
  const MO = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  if (toNum(o.bonusAnnual) > 0) {
    // a bonus lands in ONE month, and the note says which — never divided by twelve (his ruling)
    const m = Number(o.bonusMonth);
    out.push({ label: 'Bonus', note: m ? `lands in ${MO[(m - 1 + 12) % 12]}` : 'month not set',
               amount: toNum(o.bonusAnnual), per: 'year', kind: 'bonus' });
  }
  // OTHER INCOME IS A SOURCE TOO (2026-10-24, E2E-70): a one-time payment says when it lands, or that its month or year is not
  // entered — counted in no year until both are given (landsOnce, 2026-10-25; DEC-0447, DEC-7940)
  if (toNum(o.otherAmount) > 0) {
    const f = o.otherFreq ?? 'monthly';
    const once = landsOnce(o).find((x) => x.kind === 'other');
    const lands = `lands in ${MO[(Number(o.otherMonth || 1) - 1 + 12) % 12]}`;
    out.push({ label: String(o.otherLabel ?? '').trim() || 'Other income',
               note: f === 'onetime' ? (once?.missing ? `one-time · ${once.missing}` : `one-time · ${lands}`) : f === 'annual' ? lands : f === 'quarterly' ? 'every three months' : 'every month',
               amount: toNum(o.otherAmount), per: f === 'onetime' ? 'once' : f === 'annual' ? 'year' : f === 'quarterly' ? 'quarter' : 'month', kind: 'other' });
  }
  // a rental the household HAS is a source whatever it nets — "Rental income · 1 property · −$500" (rentalsHeld)
  const held = rentalsHeld(o);
  if (held) {
    out.push({ label: 'Rental income', note: plural(held.count, 'property'), amount: held.monthlyNet, per: 'month', kind: 'rental' });
  }
  // the stock that vests THIS YEAR (rsuAnnual, 2026-10-25), under the drawn name — grants with no value yet read "—" on the tab, and
  // grants with no date say so: "vest date not entered", never $0
  const vesting = rsuAnnual(o);
  const grants = Array.isArray(o.rsuGrants) ? o.rsuGrants.length : 0;
  if ((vesting ?? 0) > 0 || grants > 0) {
    const kindWords = o.equityType === 'option' ? 'option grants' : 'RSU grants';
    out.push({ label: 'Equity comp', note: vesting == null ? `${kindWords} · vest date not entered` : kindWords,
               amount: vesting ?? 0, per: 'year', kind: 'equity' });
  }
  // THE FIGURE THE SCREEN SHOWS, not a second one: guaranteed income received now, from outside the person's savings, each
  // source answering for itself (guaranteedReceivedNow — a Social Security "Not yet" is not here)
  const guaranteed = guaranteedReceivedNow(o);
  if (guaranteed > 0) {
    out.push({ label: 'Social Security · pension', note: 'guaranteed income', amount: guaranteed, per: 'month', kind: 'guaranteed' });
  }
  if (toNum(o.benefitMonthly) > 0) {
    const n = benefitActiveMonths(o).length;
    out.push({ label: 'Benefits', note: n < 12 ? `${plural(n, 'month')} of the year` : 'every month', amount: toNum(o.benefitMonthly), per: 'month', kind: 'benefits' });
  }
  if (toNum(o.supportMonthly) > 0) out.push({ label: 'Child support or alimony', note: 'not taxed', amount: toNum(o.supportMonthly), per: 'month', kind: 'support' });
  if (toNum(o.invAnnual) > 0) {
    out.push({ label: 'Interest & dividends', note: o.invPaidToBank === 'yes' ? 'paid to your bank' : 'reinvested', amount: toNum(o.invAnnual), per: 'year', kind: 'interest' });
  }
  return out;
}

/** What is this household's income: what reaches the bank each month, and what the year is taxed on? */
/* ─ MK-CF-O-004 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * incomeSummary
 *
 * Answers ..... What is this household's income: what reaches the bank each month, and what the year is taxed on?
 *
 * Formula .....
 *     entered = op
 *     a = op (or none when missing)
 *     wages = earner wages(op as any)
 *     inf = rate in force(op as any)
 *     typed state = state rate of(op as any)
 *     calculated covers = 'federal income tax, plus the ' + percent digits(typed state, 2) + '% state rate you entered'   if typed state > 0
 *     'federal income tax only'   otherwise
 *     r = inf.rate, theirs = inf.mine
 *     after tax = (x: number) => x × (1 − r)
 *     steady pay = salary gross by month(op as any).every((m) => m > 0)
 *     tips = tips monthly read as a number (0 when it is not one)   if steady pay
 *     0   otherwise
 *     self employed = to num(se amount) ÷ 12   if se freq = 'annual'
 *     se amount read as a number (0 when it is not one)   otherwise
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-F-201 INCOME · MK-CF-F-207 SOURCE
 *               MK-CF-F-314 setupEntered · MK-NW-O-004 theEmergencyFund
 *
 * Reaches ..... 487 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 469 more — the full list is on functions_from_code
 *
 * Serves ...... MK-CF-M-006 · MK-CF-M-007 · MK-CF-M-008 · MK-CF-M-009
 *               MK-CF-M-010 · MK-CF-M-011 · MK-CF-M-024 · MK-CF-M-027
 *               MK-CF-M-037 · MK-CF-M-038 · MK-CF-M-039 · MK-CF-M-040
 *               MK-CF-M-041 · MK-CF-M-042 · MK-CF-M-043 · MK-CF-M-044
 *               MK-CF-M-066 · MK-CF-M-069 · MK-CF-M-076 · MK-CF-M-077
 *               MK-MN-M-011 · MK-MN-M-012 · MK-MN-M-013
 * Reads ....... MK-XS-I-022 pension monthly amount
 *               MK-XS-I-023 salary and other income
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-030 tax filing status and age
 *               MK-XS-I-039 how often each income arrives
 *               MK-XS-I-040 whether a stream is already being received
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-059 the month a bonus lands
 * Ruled by .... DEC-0078 · DEC-0108 · DEC-0149 · DEC-0152 · DEC-0165 · DEC-0166
 *               DEC-0178 · DEC-0181 · DEC-0182 · DEC-0184 · DEC-0187 · DEC-0188
 *               DEC-0189 · DEC-0191 · DEC-0194 · DEC-0195 · DEC-0197 · DEC-0207
 *               DEC-0208 · DEC-0209 · DEC-0389 · DEC-0431
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-004
 * Changed ..... not in git yet (—)
 */
export function incomeSummary(op: Record<string, any> | null, from?: { accounts?: any[] | null; transactions?: any[] | null } | null): IncomeSummary {
  // THE ACCOUNTS' INTEREST AND DIVIDENDS ARE COUNTED IN THE TAX (2026-10-25, FIX-INCOME-B; found by CF-MMFIX-B; the lead's ruling
  // from his DEC-0179 and DEC-0198): with the accounts handed in, the year's interest and dividends are the one figure
  // (interestAndDividendsForYear — the year's records, else the figure typed, else calculated from the accounts' rates, ≈), read
  // by every row below; they stay out of the take-home unless they reach the bank. Without them, the figure typed.
  const entered = op;   // the profile as typed: YOUR SOURCES shows what was entered, never a figure calculated from the accounts
  op = from ? (profileWithAccountIncome(op as any, from.accounts, from.transactions) as any) : op;
  const a: any = op ?? {};
  const wages = earnerWages(op as any);
  const pay = basePay({
    earners: wages.map((w, i) => ({ name: i === 0 ? 'Your pay' : `${a.partnerName || 'Spouse'}’s pay`, entry: entryFromWage(w) })),
    filingStatus: filingStatusOf(op as any), over65: over65CountOf(op as any), profile: op,
  });

  // ── the take-home ──────────────────────────────────────────────────────────────────────────────
  // EVERY ROW IS SOMETHING THAT ARRIVES IN A USUAL MONTH, AND THE TOTAL IS THE ROWS ADDED UP.
  // The rows used to be the pay and the rent only, with the total read from the month grid — so a
  // household with tips, a pension, self-employment, or a calculated rate saw a total its own rows
  // did not add up to (found 2026-10-04). Each row follows the rule the month grid follows: a rate
  // the person gave is a rate on their pay and is not laid on rent or on interest and dividends
  // (approved drawing v07, frame 16); a CALCULATED rate is the year's tax over everything taxable, so
  // it is taken from everything taxable — including the tax on dividends that never reach the bank.
  const inf = rateInForce(op as any);
  // what the calculated rate covers, in words: federal income tax, and the state rate when one was typed (2026-10-23)
  const typedState = stateRateOf(op as any);
  const calculatedCovers = typedState > 0 ? 'federal income tax, plus the ' + percentDigits(typedState, 2) + '% state rate you entered' : 'federal income tax only';
  const r = inf.rate, theirs = inf.mine;
  const afterTax = (x: number) => x * (1 - r);
  const landsLines: Line[] = pay.earners
    .filter((e) => e.pay.landsInBank > 0)
    .map((e) => ({ label: e.name, note: 'after tax and 401(k)', amount: (e.pay.landsInBank), estimated: e.approx, approx: e.approx }));
  const steadyPay = salaryGrossByMonth(op as any).every((m) => m > 0);
  const tips = steadyPay ? toNum(a.tipsMonthly) : 0;
  // A ROW WORKED WITH THE CALCULATED RATE IS AN ESTIMATE AND SAYS SO (2026-10-25, IN-03; rule 9): approx = !theirs
  if (tips > 0) landsLines.push({ label: 'Tips', note: 'after tax', amount: afterTax(tips), approx: !theirs });
  const selfEmployed = a.seFreq === 'annual' ? toNum(a.seAmount) / 12 : toNum(a.seAmount);
  if (selfEmployed > 0) landsLines.push({ label: 'Self-employment', note: 'after tax', amount: afterTax(selfEmployed), approx: !theirs });
  // A RENTAL LOSS IS A ROW (2026-10-25, FIX-INCOME-B; the outside review's MK-CF-O-004-C04, MK-CF-M-037/038; tenets 1 and 4;
  // DEC-0376): the running costs are paid from the bank, so a rental losing $319.76 a month takes $319.76 off the month — $5,111.17
  // of pay and the rental read $4,791.41, as the month grid and the Cash flow months read it. It was left out (`rent > 0`).
  const rent = (rentalNetAnnual(op as any) / 12);
  const rentArriving = rent !== 0 ? (theirs ? rent : afterTax(rent)) : 0;
  if (rent !== 0) {
    landsLines.push({ label: 'Rent', note: theirs ? 'after running costs' : 'after running costs and calculated tax', amount: rentArriving, approx: !theirs });
  }
  const invMonthly = toNum(a.invAnnual) / 12;
  const invWorkedOut = !!a.invApprox;   // calculated from the accounts' rates — an estimate, ≈ (2026-10-25)
  if (invMonthly > 0 && a.invPaidToBank === 'yes') {
    landsLines.push(theirs ? { label: 'Interest & dividends', note: 'paid to your bank', amount: invMonthly, approx: invWorkedOut }
                           : { label: 'Interest & dividends', note: 'paid to your bank, after calculated tax', amount: afterTax(invMonthly), approx: true });
  } else if (invMonthly > 0 && !theirs && r > 0) {
    landsLines.push({ label: 'Tax on interest and dividends', note: 'calculated — they are reinvested, and the tax still comes out', amount: -(invMonthly * r), approx: true });
  }
  // SOCIAL SECURITY IS TAXED IN PART (2026-10-25, FIX-INCOME-B; IRS Publication 915): the tax comes off the part that is taxed,
  // and the rest lands whole (retirementIncomeTaxedMonthly) — and a Social Security amount answered "Not yet" is not here at all
  const ret = retirementIncomeTaxedMonthly(op as any);
  if (ret.received > 0) landsLines.push({ label: 'Social Security · pension', note: 'after tax', amount: ret.received - ret.taxed * r, approx: !theirs });
  const otherFreq = a.otherFreq ?? 'monthly';
  const other = otherFreq === 'annual' ? toNum(a.otherAmount) / 12 : otherFreq === 'monthly' ? toNum(a.otherAmount) : 0;
  if (other > 0) {
    landsLines.push(a.otherTaxable !== 'no' ? { label: String(a.otherLabel || '').trim() || 'Other income', note: 'after tax', amount: afterTax(other), approx: !theirs }
                                            : { label: String(a.otherLabel || '').trim() || 'Other income', note: 'not taxed', amount: other });
  }
  // benefits paid in some months only: those months stand out. UNEMPLOYMENT PAY IS TAXED (IRC §85(a), IRS Publication 525;
  // 2026-10-25): its own row, after tax; the rest of the benefits stay "not taxed".
  const allYear = benefitActiveMonths(op as any).length === 12;
  const unemployment = allYear ? unemploymentMonthly(op as any) : 0;
  const benefits = allYear ? toNum(a.benefitMonthly) - unemployment : 0;
  if (benefits > 0) landsLines.push({ label: 'Benefits', note: 'not taxed', amount: benefits });
  if (unemployment > 0) landsLines.push({ label: 'Unemployment', note: 'after tax', amount: afterTax(unemployment), approx: !theirs });
  const support = toNum(a.supportMonthly);
  if (support > 0) landsLines.push({ label: 'Child support or alimony', note: 'not taxed', amount: support });
  const school = (Array.isArray(a.scholarships) ? a.scholarships : [])
    .reduce((t: number, x: any) => t + (x?.freq === 'monthly' ? toNum(x?.amount) : 0), 0);
  if (school > 0) landsLines.push({ label: 'Scholarships, grants, stipend', note: 'not taxed', amount: school });
  const usual = landsLines.reduce((t, l) => t + l.amount, 0);

  // A month stands out only when something arrives in it that does not arrive every month.
  const grid = incomeMonthlyGrid(op as any, 'available');
  const months = grid.map((g) => g.amount);
  const biggest = months.reduce((best, v, i) => (v > months[best] ? i : best), 0);
  const FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const bonusMonth = Math.min(11, Math.max(0, (toNum(a.bonusMonth) || 12) - 1));
  const standout = months.length && (months[biggest]) > usual + 1
    ? { label: FULL[biggest] ?? grid[biggest].label,
        note: toNum(a.bonusAnnual) > 0 && biggest === bonusMonth ? 'with the bonus' : 'its own month, never spread',
        amount: (months[biggest]), approx: !theirs } : null;
  const FILING: Record<string, string> = { single: 'Single', married: 'Married filing jointly', mfs: 'Married filing separately', hoh: 'Head of household' };
  const filing = FILING[String(filingStatusOf(op as any))] ?? 'Single';

  // ── what it is taxed on ─────────────────────────────────────────────────────────────────────
  // ONE ROW FOR EVERY SOURCE THE YEAR IS TAXED ON, SIGNED, AND THEY ADD TO "= Gross /year" (2026-10-25, FIX-INCOME-B; the outside
  // review's MK-CF-O-004, MK-CF-M-042, MK-CF-M-076; DEC-0376, tenet 2): the rows are taxedSourcesAnnual's, the very rows
  // taxableAnnual adds up. They were the wages, the rent above $0, interest and dividends and the bonus — $84,000 of rows under
  // $126,000 (a wage of $7,000/month, $1,000 of self-employment, $2,000 of Social Security and $500 of other income), $195,600
  // under $264,800, and a rental losing $500/month gave one $86,400 row over "= Gross /year" $80,400.
  const taxedLines: Line[] = taxedSourcesAnnual(op as any).map((s) => ({
    label: s.key === 'wages' ? (s.earner === 0 ? 'Your gross' : `${a.partnerName || 'Spouse'}’s gross`) : s.label,
    amount: s.amount,
    ...(s.key === 'interest-dividends' && invWorkedOut ? { approx: true, note: 'calculated from your accounts' } : {}),
  }));

  const grossAnnual = (taxableAnnual(op as any));
  const taxedOn = taxedAfterPreTax(op as any);   // the gross less the year's 401(k)s (DEC-0283; 2026-10-24)

  // ── what is entered and counted nowhere yet, said (tenet 3, 2026-10-25) ───────────────────────────────────────────────
  const notCounted: string[] = [];
  // the wage entered that cannot be read (R23a, 2026-11-01; DEC-0296): no figure rests on it anywhere below
  const wageRefusal: string | null = pay.freqNotRecognised.length ? PAY_FREQUENCY_NOT_RECOGNISED
    : pay.hoursNotEntered.length ? 'Hours a week not entered — your hourly pay is not counted until it is.' : null;
  // an hourly wage with no hours a week is no number (FIX-INCOME-A, 2026-10-26; DEC-0296) — said here in Your base pay's words
  if (pay.hoursNotEntered.length) notCounted.push('Hours a week not entered — your hourly pay is not counted until it is.');
  if (pay.freqNotRecognised.length) notCounted.push(PAY_FREQUENCY_NOT_RECOGNISED);   // a frequency outside the one table (R23, 2026-11-01)
  // RENT TYPED WITH NO PROPERTY NAMED (DEC-4059d) is counted nowhere — and now said (R27, 2026-11-02): it read "Nothing entered yet"
  const unnamedRent = (Array.isArray(a.rentals) ? a.rentals : []).filter((r: any) => !(r?.property_id != null && String(r.property_id).trim() !== '') && toNum(r?.income) > 0);
  const waitingMonthly = unnamedRent.reduce((t: number, r: any) => t + toNum(r?.income) - toNum(r?.expenses), 0);
  const rentWaiting = unnamedRent.length ? waitingMonthly : null;
  const undated = vestsNotEntered(op as any).dateNotEntered;
  if (undated > 0) notCounted.push(`${undated === 1 ? 'A stock grant with no vest date is' : `${undated} stock grants with no vest date are`} not counted — vest date not entered.`);
  for (const o of landsOnce(op as any)) {
    if (o.missing === 'year not entered' || (o.kind === 'other' && o.missing === 'month not entered'))
      notCounted.push(`Your ${o.label.toLowerCase() === 'one-time income' ? 'one-time payment' : o.label} is not counted — ${o.missing}.`);
    if (o.missing === 'date not entered') notCounted.push('Your signing bonus is not counted — date not entered.');
  }
  // SHARES THAT VEST ARE NOT MONEY TO SPEND unless sold when they vest (the lead's ruling of 2026-10-25, like DEC-0179): taxed below
  const vestHeldAnnual = vestsAreCash(op as any) ? 0 : (rsuAnnual(op as any) ?? 0);

  return {
    lands: { lines: landsLines, usualMonth: usual, standoutMonth: standout, approx: landsLines.some((l) => l.approx),
             rentMonthly: rentArriving,
             totalLabel: `= ${inflowLabel('Inflow', ['income (take-home)',
               ...landsLines.filter((l) => l.amount > 0 && !pay.earners.some((e) => e.name === l.label)).map((l) => l.label)])}` },
    taxed: {
      lines: taxedLines,
      grossAnnual,
      // the bracket on the income the tax is worked on — after the 401(k)s (taxedAfterPreTax, B05; 2026-10-24). It was the
      // bracket of the whole year's gross, a band the tax was not worked in near an edge
      bracket: marginalBracketFor(taxedOn, filingStatusOf(op as any), over65CountOf(op as any)),
      tax: (grossAnnual * inf.rate),
      rate: inf.rate,
      taxedOn,
      k401Annual: grossAnnual - taxedOn,   // the rows add up: = Gross /year − Your 401(k)s = What it is taxed on
      calculatedNote: typedState > 0
        ? 'Federal income tax, plus the ' + percentDigits(typedState, 2) + '% state rate you entered — it knows nothing about Social Security or Medicare.'
        : 'Federal only — it knows nothing about your state, and nothing about Social Security or Medicare.',
      holdsState: typedState > 0,
      whose: inf.label,
      estimated: inf.source === 'estimated',
      filing,
      closing: `${filing}, every source counted. Your ${percentDigits(inf.rate, 2)}%, used on every figure built from your take-home. `
        // a state rate typed on the Tax organizer is inside the calculated rate, so the sentence says so (2026-10-23, CF-FIX)
        + 'Without it we show the calculated rate — ' + calculatedCovers + ', assuming the standard deduction.',
    },
    // Taxed, and never landed. The screen says this rather than leaving a gap between two totals
    // that a person would otherwise have to work out for themselves.
    taxedNotLanded: (extraIncome(op as any).reinvestedMonthly),
    vestHeldAnnual,
    notCounted,
    sources: incomeSources(entered),
    wages: pay.earners.filter((e) => e.pay.grossAnnualised > 0).length,
    // SOMETHING ARRIVING IS SOMETHING ENTERED (2026-10-25, FIX-INCOME-B; the outside review's MK-CF-O-004-C05; tenets 1 and 3):
    // $1,000/month of child support and nothing else read "not ready", and the screen printed $0 and "Nothing entered yet."
    ready: salaryAnnual(op as any) > 0 || grossAnnual !== 0 || landsLines.length > 0 || wageRefusal != null,
    wageRefusal,
    unreadRows: pay.earners.flatMap((e, i) => (e.pay.freqNotRecognised || e.pay.hoursNotEntered
      ? [i === 0 ? 'Your pay' : `${a.partnerName || 'Spouse'}’s pay`, i === 0 ? 'Your gross' : `${a.partnerName || 'Spouse'}’s gross`] : [])),
    rentWaiting,
  };
}

/** ONE SOURCE ON THE INCOME MANAGER — what its line says, and whether it has been entered. */
export interface ManagedSource {
  key: 'employment' | 'self_employment' | 'rental' | 'investment_income' | 'retirement_income'
     | 'benefits' | 'support' | 'scholarship' | 'loans' | 'other_income';
  icon: string;
  /** The row's name: short once it is entered ("A job"), the picker's own words while it is not. */
  title: string;
  entered: boolean;
  /** The words before the figure — "You and Sam · take-home", "One property ·". */
  lead: string;
  amount: number;
  per: 'month' | 'year' | 'one-time';
  /** True when the figure is the app's calculation, not the person's own — it then wears ≈. */
  estimated: boolean;
  /** The words after the figure — "net", "· reinvested". */
  tail: string;
  /** No figure: the source was entered but cannot be read (R23a, 2026-11-01) — the line is its lead and its tail, never "≈$0". */
  refused?: boolean;
}
export interface IncomeManager {
  /** The sources that have an amount, in the picker's order. */
  entered: ManagedSource[];
  /** The rest — one tap away, never hidden behind the picker they said no to. */
  notEntered: ManagedSource[];
  /** A bonus and stock belong to a job, so they are reached from the job's row: what is entered for
   *  the year and the words after it. Null while there is no job to attach them to. */
  bonusAndStock: { amount: number; tail: string } | null;
}

/** Which of the ten sources of income has this household entered, what does each one's line say, and which are still one tap away?
 *  ── ORCHESTRATOR ── the one function a screen asks for this.
 *  The Income manager's one door (approved drawing income-end-to-end_v07, frame 3d). */
/* ─ MK-CF-O-019 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * theIncomeManager
 *
 * Answers ..... Which of the ten sources of income has this household entered, what does each one's line say, and which are still one tap away?
 *
 * Formula .....
 *     a = op (or none when missing)
 *     wages = earner wages(op as any) where to num(base salary) > 0 (or salary by month and object.keys(salary by month).length > 0 when missing or zero)
 *     who = for each of pay.earners: name.join(' and ')
 *     rentals = rental list(op as any)
 *     count = ['No', 'One', 'Two', 'Three', 'Four', 'Five']
 *     inv = inv annual read as a number (0 when it is not one)
 *     self per = 'year'   if se freq = 'annual'
 *     'month'   otherwise
 *     benefit months = count of benefit active months(op as any)
 *     other per = 'year'   if other freq = 'annual'
 *     'one − time'   if other freq = 'onetime'
 *     'month'   otherwise   otherwise
 *     mo = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
 *     lumps = to num(bonus annual) + (rsu annual(op as any) ?? 0)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-F-207 SOURCE
 *
 * Reaches ..... 487 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 469 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-023 salary and other income
 *               MK-XS-I-030 tax filing status and age
 *               MK-XS-I-039 how often each income arrives
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-059 the month a bonus lands
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-019
 * Changed ..... not in git yet (—)
 */
export function theIncomeManager(op: Record<string, any> | null): IncomeManager {
  const a: any = op ?? {};
  const wages = earnerWages(op as any).filter((w: any) => toNum(w.baseSalary) > 0 || (w.salaryByMonth && Object.keys(w.salaryByMonth).length > 0));
  const pay = basePay({
    earners: wages.map((w) => ({ name: w === a ? 'You' : String(a.partnerName || 'your spouse'), entry: entryFromWage(w) })),
    filingStatus: filingStatusOf(op as any), over65: over65CountOf(op as any), profile: op,
  });
  const who = pay.earners.map((e) => e.name).join(' and ');
  const rentals = rentalList(op as any);
  const COUNT = ['No', 'One', 'Two', 'Three', 'Four', 'Five'];
  const inv = toNum(a.invAnnual);
  const selfPer: 'month' | 'year' = a.seFreq === 'annual' ? 'year' : 'month';
  const benefitMonths = benefitActiveMonths(op as any).length;
  const schoolYear = (Array.isArray(a.scholarships) ? a.scholarships : [])
    .reduce((t: number, x: any) => t + toNum(x?.amount) * (x?.freq === 'monthly' ? 12 : 1), 0)
    || toNum(a.scholarshipAmount) * (a.scholarshipFreq === 'monthly' ? 12 : 1);
  const loansYear = (Array.isArray(a.loans) ? a.loans : [])
    .reduce((t: number, x: any) => t + toNum(x?.amount) * (Array.isArray(x?.months) && x.months.length ? x.months.length : 1), 0);
  const otherPer: 'month' | 'year' | 'one-time' = a.otherFreq === 'annual' ? 'year' : a.otherFreq === 'onetime' ? 'one-time' : 'month';
  const MO = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const lumps = toNum(a.bonusAnnual) + (rsuAnnual(op as any) ?? 0);
  // ENTERED MEANS RECORDED, NOT "ABOVE $0" (2026-10-25, FIX-INCOME-B; the outside review's MK-CF-O-019-C04, MK-CF-M-027; tenets 3
  // and 5): a property whose rent and costs were typed is entered whatever it nets — a rental losing $300.26 a month sat under
  // "Anything else? · Rent from a property", its −$300.26 never shown. `entered` says so for the row; the others still read their
  // amount, where a source left at $0 has nothing in it.
  const row = (key: ManagedSource['key'], icon: string, short: string, long: string, amount: number,
               per: ManagedSource['per'], lead = '', tail = '', estimated = false, entered = amount > 0): ManagedSource =>
    ({ key, icon, title: entered ? short : long, entered, lead, amount, per, estimated, tail });
  // a one-time payment with no year is counted nowhere until it has one (landsOnce, 2026-10-25): its line says so
  const onceOther = landsOnce(op as any).find((o) => o.kind === 'other');
  // a Social Security amount answered "Not yet" is the Plan's estimate, not money arriving now (2026-10-25): its line says so
  const ssNotYet = socialSecurityNotYetMonthly(op as any) > 0;
  const unreadable = pay.freqNotRecognised.length > 0 || pay.hoursNotEntered.length > 0;   // R23a, 2026-11-01
  const all: ManagedSource[] = [
    // an hourly wage with no hours a week is entered and not counted (FIX-INCOME-A's basePay, DEC-0296; 2026-10-26): the row says so in
    // Your base pay's words, never dropped
    row('employment', '💼', 'A job', 'A job (wages or salary)', pay.landsInBank, 'month', unreadable ? who : `${who} · take-home`,
        pay.freqNotRecognised.length ? '· pay frequency not recognised' : pay.hoursNotEntered.length ? '· hours a week not entered' : '', pay.landsEstimated,
        pay.landsInBank > 0 || pay.hoursNotEntered.length > 0 || pay.freqNotRecognised.length > 0),
    row('self_employment', '🧰', 'Self-employed / side gig', 'Self-employed / side gig', toNum(a.seAmount), selfPer, '', 'net'),
    row('rental', '🏠', 'Rent', 'Rent from a property', rentalNetAnnual(op as any) / 12, 'month',
        `${plural(rentals.length, 'property', COUNT[rentals.length] ?? rentals.length)} ·`, 'net', false, rentals.length > 0),
    row('investment_income', '💵', 'Interest & dividends', 'Interest & dividends', inv, 'year', '',
        a.invPaidToBank === 'yes' ? '· paid to your bank' : '· reinvested'),
    row('retirement_income', '📨', 'Retirement income', 'Retirement income', retirementIncomeMonthly(op as any), 'month', '',
        ssNotYet ? '· Social Security not received yet' : ''),
    row('benefits', '🛟', 'Benefits', 'Benefits', toNum(a.benefitMonthly), 'month', '',
        benefitMonths < 12 ? `· ${plural(benefitMonths, 'month')} of the year` : ''),
    row('support', '👪', 'Child support or alimony', 'Child support or alimony', toNum(a.supportMonthly), 'month'),
    row('scholarship', '🎓', 'Scholarships, grants, stipend', 'Scholarships, grants, stipend', schoolYear, 'year'),
    row('loans', '🏦', 'Student loans', 'Student loans', loansYear, 'year'),
    row('other_income', '🧾', 'Something else', 'Something else', toNum(a.otherAmount), otherPer, '',
        onceOther?.missing ? `· ${onceOther.missing}` : ''),
  ];
  return {
    // a wage that cannot be read prints no figure on its line (R23a, 2026-11-01): "You · pay frequency not recognised"
    ...(() => { if (unreadable) all[0] = { ...all[0], refused: true }; return {}; })(),
    entered: all.filter((x) => x.entered), notEntered: all.filter((x) => !x.entered),
    // STOCK WITH NO JOB IS STILL STOCK (2026-10-25, FIX-INCOME-B; the outside review's MK-CF-O-019-C05; tenets 2 to 4): $10,000 of
    // vesting after a job ends appeared nowhere on the manager — "about 0 sources" — while the Cash flow tab listed it. A bonus or
    // stock is read with the job when there is one, and on its own when there is not.
    bonusAndStock: wages.length || lumps > 0 || vestsNotEntered(op as any).dateNotEntered > 0 ? { amount: lumps,
      tail: toNum(a.bonusAnnual) > 0 ? `· bonus paid in ${MO[Math.min(11, Math.max(0, (toNum(a.bonusMonth) || 12) - 1))]}`
          : vestsNotEntered(op as any).dateNotEntered > 0 && lumps === 0 ? '· vest date not entered'
          : lumps > 0 ? '· vests through the year' : '' } : null,
  };
}
