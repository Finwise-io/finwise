// Cash flow · Your income — everything coming in, and what reaches your bank.
//
// Built from the approved mock: income-v5, frames 5a and 5b.
//
// TWO TOTALS, NEVER ONE. What LANDS is what you can spend. What you are TAXED ON is a different
// number and is labelled as one. Mixing them is how a take-home figure comes to include a bonus
// nobody has been paid yet — and how interest and dividends came to be counted as spendable when
// they are reinvested where they are earned and never reach the bank.
import { declareFigures } from '../_figure-spec';
import { toNum } from '../../../src/domain/_shared/num';
import { salaryAnnual, taxableAnnual, rentalNetAnnual, extraIncome, filingStatusOf,
         over65CountOf, incomeMonthlyGrid } from '../../../src/domain/income';
// the two sources the YOUR SOURCES list needs, from the one place each is calculated
import { rsuAnnual, retirementIncomeMonthly, currentRetirementIncomeMonthly, benefitActiveMonths, salaryGrossByMonth, rentalList } from '../../../src/domain/income/onboarding';
import { guaranteedOutsideStreams, totalGrossAnnual } from '../../../src/domain/income';
import { incomeFromAccounts } from '../../../src/domain/income/from-accounts';
import { earnerWages } from '../../../src/domain/income/earners';
import { rateInForce } from '../../../src/domain/income/tax-rate';
import { marginalBracketFor } from '../../../src/domain/income/tax';
import { basePay, entryFromWage } from './base-pay';
import { inflowLabel } from './this-month';

export interface Line { label: string; note?: string; amount: number;
  /** On an earner's pay row: true when the take-home is the app's calculation, not theirs — it then wears ≈. */
  estimated?: boolean; }

export interface IncomeSummary {
  /** What reaches the bank, per month — the money that can be spent. */
  lands: { lines: Line[]; usualMonth: number;
    /** The words on the total — his one wording for money arriving: "Inflow (income (take-home) + rent)". */
    totalLabel: string;
    /** The month that stands apart, named in full, with why: "December · with the bonus". */
    standoutMonth: { label: string; note: string; amount: number } | null };
  /** What the year is taxed on — a different number, and said to be one. */
  taxed: {
    lines: Line[];
    grossAnnual: number;
    bracket: number;          // the FEDERAL TAX BRACKET, named
    tax: number;              // the year's tax, at whichever rate is in force
    whose: string;            // 'your rate, 24%' · 'calculated, 9%'
    estimated: boolean;
    /** How the household files, in the words the filing question uses — "Married filing jointly". */
    filing: string;
    /** The sentence under the tax line when the rate is the person's own (income-end-to-end_v07, frame 16). */
    closing: string;
  };
  /** Money that is taxed but never lands — said on the screen so the gap is never a mystery. */
  taxedNotLanded: number;
  /** How many earners have a wage entered — so a screen can say whose income a figure rests on. */
  wages: number;
  ready: boolean;             // false on a fresh account: the screen keeps its shape and shows no $0
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
 * Called by ... MK-CF-F-024 totalDebtMonthly · MK-CF-F-210 annualOfSource
 *
 * Reaches ..... 15 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-211 DEBTS · MK-NW-F-082 NW
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-210 annualOfSource
 *               MK-CF-F-036 buildDebtState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-041 getDebtState · MK-XS-F-029 monthlySavings
 *               MK-XS-F-032 snapshotFromOnboarding · MK-XS-F-028 surplusByMonth
 *               MK-CF-O-018 theDebts · MK-NW-O-003 theNetWorth
 *               MK-CF-F-024 totalDebtMonthly
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-023 salary and other income
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
  seAmount: 24000, seFreq: 'yearly', bonusAnnual: 12000, bonusMonth: 3,
  rsuShares: '50', rsuPrice: '400',
  rentalIncome: 2000, rentalExpenses: 800,
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
 * Called by ... MK-CF-F-201 INCOME · MK-CF-F-210 annualOfSource
 *               MK-CF-O-016 incomeSources
 *
 * Reaches ..... 18 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-211 DEBTS · MK-CF-F-201 INCOME
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-CF-F-207 SOURCE · MK-NW-F-100 TREND
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-210 annualOfSource
 *               MK-CF-F-036 buildDebtState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-041 getDebtState · MK-CF-O-016 incomeSources
 *               MK-XS-F-029 monthlySavings · MK-XS-F-032 snapshotFromOnboarding
 *               MK-XS-F-028 surplusByMonth · MK-CF-O-018 theDebts
 *               MK-NW-O-003 theNetWorth · MK-CF-F-024 totalDebtMonthly
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-040 whether a stream is already being received
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-207
 * Changed ..... not in git yet (—)
 */
const SOURCE = (kind: IncomeSource['kind']) => incomeSources(SOURCES_EXAMPLE).find((x) => x.kind === kind)!;

/** A source's yearly amount: a monthly one × 12, a yearly one as it is, a salary from its pay period. */
/* ─ MK-CF-F-210 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * annualOfSource
 *
 * Answers ..... A source's yearly amount: a monthly one × 12, a yearly one as it is, a salary from its pay period.
 *
 * Formula .....
 *     amount × 12   when per = 'month'
 *     amount   when per = 'year'
 *     salary annual((op ?? {}) as any) (or amount when missing or zero)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-022 pension monthly amount
 *               MK-XS-I-023 salary and other income
 *               MK-XS-I-035 annuity income
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Decides .....
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-210
 * Changed ..... not in git yet (—)
 */
export function annualOfSource(x: IncomeSource, op?: Record<string, any> | null): number {
  if (x.per === 'month') return x.amount * 12;
  if (x.per === 'year') return x.amount;
  return salaryAnnual((op ?? {}) as any) || x.amount;
}

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
    answers: 'A source that arrives in one month of the year, shown in that month rather than divided by twelve.',
    formula: 'the standout month = the source whose whole year lands in a single month, with that amount and that month',
    inputs: ['MK-CF-I-009 bonus', 'MK-CF-I-010 equity vesting'],
    decisions: ['A lump that lands once is never averaged across the year (founder, 2026-08-28).'],
    ruled: '2026-09-14',
    refusal: 'The line is hidden when no source behaves this way.',
    // the month the $12,000 bonus lands: the usual month plus the bonus, after tax, as one figure
    worked: { given: SOURCES_GIVEN, answer: '$40,316', run: () => incomeSummary(SOURCES_EXAMPLE).lands.standoutMonth?.amount ?? null },
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
    answers: 'The whole year of income the tax is calculated on — a different number from the take-home, and said to be one.',
    formula: 'gross a year = Σ of every taxable source over the year, wages included at gross',
    inputs: ['MK-CF-M-030 gross a year', 'MK-CF-I-006 other income', 'MK-CF-I-007 rental income', 'MK-CF-I-011 interest and dividends'],
    ruled: '2026-09-14',
    refusal: 'Shows $0 on a fresh account, with the door to enter income.',
    worked: {
      given: GIVEN,
      answer: '$169,200/year',
      run: () => INCOME().taxed.grossAnnual,
    },
  },
  'MK-CF-M-042': {
    label: 'each taxed source', unit: 'money', per: 'year', screens: ['/income-summary'],
    answers: 'What each source contributes to the year the tax is calculated on.',
    formula: 'one line per taxable source, at its yearly amount',
    inputs: ['MK-CF-M-041 gross a year'],
    ruled: '2026-09-14',
    refusal: 'The list is replaced by the door to enter income when nothing is entered.',
    worked: {
      given: GIVEN,
      answer: '$109,200/year',
      run: () => INCOME().taxed.lines[0].amount,
    },
  },
  'MK-CF-M-043': {
    label: 'Federal tax bracket', unit: 'percent', screens: ['/income-summary'],
    answers: 'What the next dollar costs in federal income tax, with every source counted, not wages alone.',
    formula: 'the published bracket that the whole year’s gross falls in, for their filing status',
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
  'MK-CF-M-044': {
    label: 'Calculated federal tax', unit: 'money', per: 'year', screens: ['/income-summary'],
    answers: 'The federal income tax for the year, at whichever rate is in force — theirs if they entered one, ours if not.',
    formula: 'tax a year = the rate in force × the year’s gross; when it is ours, federal tax on gross less the standard deduction at the published bands',
    inputs: ['MK-CF-M-041 gross a year', 'MK-CF-I-005 tax rate as entered', 'MK-XS-I-024 filing status'],
    decisions: ['When it is ours it assumes the standard deduction and is federal only (MK-CF-D-002).'],
    ruled: '2026-09-14',
    refusal: 'The row is not shown until income is entered.',
    worked: {
      given: GIVEN,
      answer: '$37,224/year',
      run: () => INCOME().taxed.tax,
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
    answers: 'What vests in a year, valued at the price entered.',
    formula: 'shares vesting × price per share; with a grant schedule, the total ÷ the years it vests over',
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
    label: 'each income source and its amount', unit: 'money', screens: ['/income-manager'], grain: 'one source',
    answers: 'Every source of income that has been entered, one line each, in the period it is counted in — a month or a year, said beside it.',
    formula: 'each source as it was entered: rent after its running costs, in a month; interest and dividends, a bonus, scholarships and loans, in a year; the rest in a month',
    inputs: ['MK-XS-I-023 salary and other income', 'MK-CF-I-009 bonus', 'MK-CF-I-010 equity vesting', 'MK-CF-I-007 rental income'],
    refusal: 'Nothing entered — the list is replaced by the door to enter income.', ruled: '2026-10-02',
    worked: { given: SOURCES_GIVEN + ' The line shown is the rental’s: what it brings in a month after its costs.', answer: '$1,200',
              run: () => theIncomeManager(SOURCES_EXAMPLE as any).entered.find((x) => x.key === 'rental')?.amount ?? null },
  },
  'MK-CF-M-066': {
    label: 'Dividends, interest & coupons', unit: 'money', per: 'year', screens: ['/income-manager'],
    answers: 'What your holdings and bonds paid out over the last twelve months, from the records.',
    formula: 'the dividend, interest and coupon records of the last twelve months, added up',
    inputs: ['MK-NW-I-004 the activity records', 'MK-NW-I-001 your accounts'],
    refusal: 'No record of any — $0, never an estimate.', ruled: '2026-10-02',
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
  per: 'month' | 'year' | 'as entered';
  /** Which kind it is, for the row that opens its editor. */
  kind: 'salary' | 'self-employment' | 'bonus' | 'equity' | 'rental' | 'guaranteed';
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
 *     varies = string((w as any).salary mode) = 'varies' (or !!(w as any).salary by month when missing or zero)
 *     whose = 'You'   if w = o
 *     spouse name (or 'Spouse' when missing or zero)   otherwise   if wages.length > 1
 *     nothing   otherwise
 *     m = bonus month read as a number
 *     vesting = rsu annual(o)
 *     rent = rental net annual(o)
 *     guaranteed = retirement income monthly(o)
 *     the answer = out
 *
 * Called by ... MK-CF-F-207 SOURCE
 *
 * Reaches ..... 18 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-211 DEBTS · MK-CF-F-201 INCOME
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-CF-F-207 SOURCE · MK-NW-F-100 TREND
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-210 annualOfSource
 *               MK-CF-F-036 buildDebtState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-041 getDebtState · MK-CF-O-016 incomeSources
 *               MK-XS-F-029 monthlySavings · MK-XS-F-032 snapshotFromOnboarding
 *               MK-XS-F-028 surplusByMonth · MK-CF-O-018 theDebts
 *               MK-NW-O-003 theNetWorth · MK-CF-F-024 totalDebtMonthly
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-022 pension monthly amount
 *               MK-XS-I-023 salary and other income
 *               MK-XS-I-039 how often each income arrives
 *               MK-XS-I-040 whether a stream is already being received
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-059 the month a bonus lands
 *               MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-016
 * Changed ..... 2026-10-01 (23d5415)
 */
export function incomeSources(op: Record<string, any> | null): IncomeSource[] {
  const o = (op ?? {}) as any;
  const out: IncomeSource[] = [];
  const wages = earnerWages(o);
  for (const w of wages) {
    // NOTHING ENTERED IS NOT A SOURCE (his Q48 rule, 2026-09-09). My first draft pushed a row for every
    // earner whether or not they had typed a figure, so a fresh account showed "Salary — steady $0" —
    // an invented row. The screen shows $0 with a sentence and the door to enter income; it never
    // lists a source nobody has.
    if (toNum((w as any).baseSalary) <= 0 && !(w as any).salaryByMonth) continue;
    const varies = String((w as any).salaryMode) === 'varies' || !!(w as any).salaryByMonth;
    const whose = wages.length > 1 ? (w === o ? 'You' : (o.partnerName || 'Spouse')) : null;
    out.push({
      label: `${whose ? whose + ' · ' : ''}${varies ? 'Salary — varies' : 'Salary — steady'}`,
      note: varies ? 'by-month table' : (String((w as any).salaryMode) === 'takehome' ? 'take-home' : 'before tax'),
      amount: toNum((w as any).baseSalary), per: 'as entered', kind: 'salary',
    });
  }
  if (toNum(o.seAmount) > 0) {
    out.push({ label: 'Self-employment', note: o.seFreq === 'monthly' ? 'net · monthly' : 'net · yearly',
               amount: toNum(o.seAmount), per: o.seFreq === 'monthly' ? 'month' : 'year', kind: 'self-employment' });
  }
  if (toNum(o.bonusAnnual) > 0) {
    // a bonus lands in ONE month, and the note says which — never divided by twelve (his ruling)
    const MO = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
                'September', 'October', 'November', 'December'];
    const m = Number(o.bonusMonth);
    out.push({ label: 'Bonus',
               note: m ? `lands in ${MO[(m - 1 + 12) % 12]}` : 'month not set',
               amount: toNum(o.bonusAnnual), per: 'year', kind: 'bonus' });
  }
  const vesting = rsuAnnual(o);
  if (vesting > 0) {
    out.push({ label: 'Stock vesting (equity)', note: 'vests through the year',
               amount: vesting, per: 'year', kind: 'equity' });
  }
  const rent = rentalNetAnnual(o);
  if (rent > 0) {
    out.push({ label: 'Rental property', note: 'net, after running costs',
               amount: rent / 12, per: 'month', kind: 'rental' });
  }
  // THE FIGURE THE SCREEN SHOWS, not a second one (found 2026-10-01 building this). The master's row
  // for this line named currentRetirementIncomeMonthly, which returns 0 unless the person has said
  // they have retirement income; CashFlowScreen has always used retirementIncomeMonthly, with no such
  // gate. Two figures under one row. The screen is the one a person reads, so the door reads it too,
  // and the row on the master now names it.
  const guaranteed = retirementIncomeMonthly(o);
  if (guaranteed > 0) {
    out.push({ label: 'Social Security · pension', note: 'guaranteed income',
               amount: guaranteed, per: 'month', kind: 'guaranteed' });
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
 *     a = op (or none when missing)
 *     wages = earner wages(op as any)
 *     inf = rate in force(op as any)
 *     r = inf.rate, theirs = inf.mine
 *     after tax = (x: number) => x × (1 − r)
 *     steady pay = salary gross by month(op as any).every((m) => m > 0)
 *     tips = tips monthly read as a number (0 when it is not one)   if steady pay
 *     0   otherwise
 *     self employed = to num(se amount) ÷ 12   if se freq = 'annual'
 *     se amount read as a number (0 when it is not one)   otherwise
 *     rent = rental net annual(op as any) ÷ 12
 *     inv monthly = to num(inv annual) ÷ 12
 *     guaranteed = current retirement income monthly(op as any)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-F-201 INCOME · MK-CF-F-210 annualOfSource
 *
 * Reaches ..... 16 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-211 DEBTS · MK-CF-F-201 INCOME
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-CF-F-026 actualDebtPayment
 *               MK-CF-F-210 annualOfSource · MK-CF-F-036 buildDebtState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-041 getDebtState
 *               MK-XS-F-029 monthlySavings · MK-XS-F-032 snapshotFromOnboarding
 *               MK-XS-F-028 surplusByMonth · MK-CF-O-018 theDebts
 *               MK-NW-O-003 theNetWorth · MK-CF-F-024 totalDebtMonthly
 *
 * Serves ...... MK-CF-M-006 · MK-CF-M-007 · MK-CF-M-008 · MK-CF-M-009
 *               MK-CF-M-010 · MK-CF-M-011 · MK-CF-M-024 · MK-CF-M-027
 *               MK-CF-M-037 · MK-CF-M-038 · MK-CF-M-039 · MK-CF-M-040
 *               MK-CF-M-041 · MK-CF-M-042 · MK-CF-M-043 · MK-CF-M-044
 *               MK-CF-M-065 · MK-CF-M-066 · MK-CF-M-069 · MK-MN-M-011
 *               MK-MN-M-012 · MK-MN-M-013
 * Reads ....... MK-XS-I-022 pension monthly amount
 *               MK-XS-I-023 salary and other income
 *               MK-XS-I-030 tax filing status and age
 *               MK-XS-I-039 how often each income arrives
 *               MK-XS-I-059 the month a bonus lands
 * Ruled by .... DEC-0078 · DEC-0108 · DEC-0149 · DEC-0152 · DEC-0165 · DEC-0166
 *               DEC-0178 · DEC-0181 · DEC-0182 · DEC-0184 · DEC-0187 · DEC-0188
 *               DEC-0189 · DEC-0191 · DEC-0194 · DEC-0195 · DEC-0197 · DEC-0207
 *               DEC-0208 · DEC-0209 · DEC-0347 · DEC-0389 · DEC-0431
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
 *
 * Decides .....
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-004
 * Changed ..... not in git yet (—)
 */
export function incomeSummary(op: Record<string, any> | null): IncomeSummary {
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
  const r = inf.rate, theirs = inf.mine;
  const afterTax = (x: number) => x * (1 - r);
  const landsLines: Line[] = pay.earners
    .filter((e) => e.pay.landsInBank > 0)
    .map((e) => ({ label: e.name, note: 'after tax and 401(k)', amount: (e.pay.landsInBank), estimated: e.pay.landsIsEstimated }));
  const steadyPay = salaryGrossByMonth(op as any).every((m) => m > 0);
  const tips = steadyPay ? toNum(a.tipsMonthly) : 0;
  if (tips > 0) landsLines.push({ label: 'Tips', note: 'after tax', amount: afterTax(tips) });
  const selfEmployed = a.seFreq === 'annual' ? toNum(a.seAmount) / 12 : toNum(a.seAmount);
  if (selfEmployed > 0) landsLines.push({ label: 'Self-employment', note: 'after tax', amount: afterTax(selfEmployed) });
  const rent = (rentalNetAnnual(op as any) / 12);
  if (rent > 0) {
    landsLines.push(theirs ? { label: 'Rent', note: 'after running costs', amount: rent }
                           : { label: 'Rent', note: 'after running costs and calculated tax', amount: afterTax(rent) });
  }
  const invMonthly = toNum(a.invAnnual) / 12;
  if (invMonthly > 0 && a.invPaidToBank === 'yes') {
    landsLines.push(theirs ? { label: 'Interest & dividends', note: 'paid to your bank', amount: invMonthly }
                           : { label: 'Interest & dividends', note: 'paid to your bank, after calculated tax', amount: afterTax(invMonthly) });
  } else if (invMonthly > 0 && !theirs && r > 0) {
    landsLines.push({ label: 'Tax on interest and dividends', note: 'calculated — they are reinvested, and the tax still comes out', amount: -(invMonthly * r) });
  }
  const guaranteed = currentRetirementIncomeMonthly(op as any);
  if (guaranteed > 0) landsLines.push({ label: 'Social Security · pension', note: 'after tax', amount: afterTax(guaranteed) });
  const otherFreq = a.otherFreq ?? 'monthly';
  const other = otherFreq === 'annual' ? toNum(a.otherAmount) / 12 : otherFreq === 'monthly' ? toNum(a.otherAmount) : 0;
  if (other > 0) {
    landsLines.push(a.otherTaxable !== 'no' ? { label: String(a.otherLabel || '').trim() || 'Other income', note: 'after tax', amount: afterTax(other) }
                                            : { label: String(a.otherLabel || '').trim() || 'Other income', note: 'not taxed', amount: other });
  }
  const benefits = benefitActiveMonths(op as any).length === 12 ? toNum(a.benefitMonthly) : 0;   // paid in some months only: those months stand out
  if (benefits > 0) landsLines.push({ label: 'Benefits', note: 'not taxed', amount: benefits });
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
        amount: (months[biggest]) } : null;
  const FILING: Record<string, string> = { single: 'Single', married: 'Married filing jointly', mfs: 'Married filing separately', hoh: 'Head of household' };
  const filing = FILING[String(filingStatusOf(op as any))] ?? 'Single';

  // ── what it is taxed on ─────────────────────────────────────────────────────────────────────
  const taxedLines: Line[] = [];
  pay.earners.forEach((e) => {
    if (e.pay.grossAnnualised > 0) {
      taxedLines.push({ label: e.name.replace('’s pay', '’s gross').replace('Your pay', 'Your gross'),
                        amount: (e.pay.grossAnnualised) });
    }
  });
  const rentAnnual = (rentalNetAnnual(op as any));
  if (rentAnnual > 0) taxedLines.push({ label: 'Rent, net', amount: rentAnnual });
  const inv = (toNum(a.invAnnual));
  if (inv > 0) taxedLines.push({ label: 'Interest & dividends', amount: inv });
  const bonus = (toNum(a.bonusAnnual));
  if (bonus > 0) taxedLines.push({ label: 'Bonus', amount: bonus });

  const grossAnnual = (taxableAnnual(op as any));

  return {
    lands: { lines: landsLines, usualMonth: usual, standoutMonth: standout,
             totalLabel: `= ${inflowLabel('Inflow', ['income (take-home)',
               ...landsLines.filter((l) => l.amount > 0 && !pay.earners.some((e) => e.name === l.label)).map((l) => l.label)])}` },
    taxed: {
      lines: taxedLines,
      grossAnnual,
      bracket: marginalBracketFor(grossAnnual, filingStatusOf(op as any), over65CountOf(op as any)),
      tax: (grossAnnual * inf.rate),
      whose: inf.label,
      estimated: inf.source === 'estimated',
      filing,
      closing: `${filing}, every source counted. Your ${Math.round(inf.rate * 100)}%, used on every figure built from your take-home. `
        + 'Without it we show the calculated rate — federal income tax only, assuming the standard deduction.',
    },
    // Taxed, and never landed. The screen says this rather than leaving a gap between two totals
    // that a person would otherwise have to work out for themselves.
    taxedNotLanded: (extraIncome(op as any).reinvestedMonthly),
    wages: pay.earners.filter((e) => e.pay.grossAnnualised > 0).length,
    ready: salaryAnnual(op as any) > 0 || grossAnnual > 0,
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
 *     lumps = to num(bonus annual) + rsu annual(op as any)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-F-210 annualOfSource
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-F-210 annualOfSource
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-023 salary and other income
 *               MK-XS-I-030 tax filing status and age
 *               MK-XS-I-039 how often each income arrives
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
  const lumps = toNum(a.bonusAnnual) + rsuAnnual(op as any);
  const row = (key: ManagedSource['key'], icon: string, short: string, long: string, amount: number,
               per: ManagedSource['per'], lead = '', tail = '', estimated = false): ManagedSource =>
    ({ key, icon, title: amount > 0 ? short : long, entered: amount > 0, lead, amount, per, estimated, tail });
  const all: ManagedSource[] = [
    row('employment', '💼', 'A job', 'A job (wages or salary)', pay.landsInBank, 'month', `${who} · take-home`, '', pay.landsEstimated),
    row('self_employment', '🧰', 'Self-employed / side gig', 'Self-employed / side gig', toNum(a.seAmount), selfPer, '', 'net'),
    row('rental', '🏠', 'Rent', 'Rent from a property', rentalNetAnnual(op as any) / 12, 'month',
        `${COUNT[rentals.length] ?? rentals.length} ${rentals.length === 1 ? 'property' : 'properties'} ·`, 'net'),
    row('investment_income', '💵', 'Interest & dividends', 'Interest & dividends', inv, 'year', '',
        a.invPaidToBank === 'yes' ? '· paid to your bank' : '· reinvested'),
    row('retirement_income', '📨', 'Retirement income', 'Retirement income', retirementIncomeMonthly(op as any), 'month'),
    row('benefits', '🛟', 'Benefits', 'Benefits', toNum(a.benefitMonthly), 'month', '',
        benefitMonths < 12 ? `· ${benefitMonths} months of the year` : ''),
    row('support', '👪', 'Child support or alimony', 'Child support or alimony', toNum(a.supportMonthly), 'month'),
    row('scholarship', '🎓', 'Scholarships, grants, stipend', 'Scholarships, grants, stipend', schoolYear, 'year'),
    row('loans', '🏦', 'Student loans', 'Student loans', loansYear, 'year'),
    row('other_income', '🧾', 'Something else', 'Something else', toNum(a.otherAmount), otherPer),
  ];
  return {
    entered: all.filter((x) => x.entered), notEntered: all.filter((x) => !x.entered),
    bonusAndStock: wages.length ? { amount: lumps,
      tail: toNum(a.bonusAnnual) > 0 ? `· bonus paid in ${MO[Math.min(11, Math.max(0, (toNum(a.bonusMonth) || 12) - 1))]}`
          : lumps > 0 ? '· vests through the year' : '' } : null,
  };
}
