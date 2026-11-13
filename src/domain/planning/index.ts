// Life-stage planning calculators (529 education, life-insurance need, estate checklist, Roth conversion).
import { wageRefusalOf } from '../income/pay-frequency';   // R23a, 2026-11-01
import type { OnboardingProfile } from '../onboardingProfile';
// Pure functions — no I/O — so they're easy to test and reuse across screens.
import { toNum } from '../_shared/num';
import { plural } from '../_shared/plural';

import { salaryAnnual, tipsAnnual, rsuAnnual, rentalNetAnnual, currentRetirementIncomeMonthly, effectiveRate, benefitAnnual, filingStatusOf, over65CountOf, householdPreTaxContributionsAnnual, stateRateOf } from '../income';
import { deductionFor, seniorDeductionFor, TAX_TABLES } from '../income/tax';
import { rateInForce } from '../income/tax-rate';
import type { InterestAndDividendsForYear } from '../income/from-accounts';
import { percentDigits, percentValue } from '../../../MoneyKeel/functions/_figure-spec';   // the one percent writer (R24, 2026-11-01)

// ───────────────────────── Tax organizer (the "give this to your CPA" summary) ─────────────────────────
// A year-end summary + a tailored document checklist. NOT a tax return — an organizer. Pure: the
// screen passes live accounts/liabilities and actual passive income.
export interface TaxLine {
  label: string; amount: number; taxable: boolean;
  /** printed with ≈ — a figure calculated from the accounts' rates, not recorded or entered (2026-10-25) */
  approx?: boolean;
  /** where the figure came from, beside it — the interest line's basis and working (2026-10-25) */
  note?: string;
}
/** The four lines a return shows, in order (founder ruling brief Q-46 (2026-08-20), 2026-09-08). */
export interface TaxableIncomeSteps {
  grossIncome: number;             // every income line of a taxable type, added up
  preTaxContributions: number;     // the household's 401(k) contributions (MK-CF-F-188)
  standardDeduction: number;       // for the filing status, age count and income (MK-CF-F-099)
  deductionIncludes: string[];     // what sits inside that deduction beyond the base figure
  taxableIncome: number;           // gross − contributions − deduction, never below zero
  /** a joint return whose spouse's 65-or-older answer was never given: the spouse is counted as under 65 (the person only),
   *  and the screen says so with a door to the question (the lead's ruling of 2026-10-25 on CFR-4's needs-ruling 4) */
  spouseAgeNotEntered: boolean;
}
export interface TaxOrganizer {
  year: number;
  income: TaxLine[];
  /** null when nothing is entered: no income line at all, so there is nothing to subtract from and no taxable income to
   *  show — tenet 3 (DEC-3523) and his DEC-0296, the figure's own refusal (MK-MN-M-028), never $0 and a deduction */
  steps: TaxableIncomeSteps | null;
  /** the refusal's words when steps is null */
  refusal: string | null;
  /** payouts in the year whose amount is not on record, said under the income lines — never counted as $0 (tenet 3) */
  notCounted: string | null;
  /** a wage entered that cannot be read (R23a, 2026-11-01): the walk and the rate are not given, and this says why */
  wageRefusal: string | null;
  taxableTotal: number | null;     // = steps.taxableIncome (kept for callers that read the one figure)
  nonTaxableTotal: number;
  estTaxRate: number | null;
  /** the rate's own words, as Base pay and the Income summary say it (canon row 25; 2026-10-25): calculated — federal only,
   *  or holding the state rate entered — or the person's own ("your rate, 24%", "your figures, 28%"). Null with nothing entered. */
  rate: { estimated: boolean; stateWords: string | null; whose: string } | null;
  /** every income line of a taxable type, added up — $0 with nothing entered (Q48), the figure the empty screen prints */
  grossIncome: number;
  contributions: TaxLine[];
  accounts: { label: string; kind: string; balance: number }[];
  documents: string[];
}
/** From everything earned to what is actually taxed — the four lines a return shows (founder ruling brief Q-46 (2026-08-20), 2026-09-08). */
/* ─ MK-PL-F-082 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * taxableIncomeSteps
 *
 * Answers ..... From everything earned to what is actually taxed — the four lines a return shows (founder ruling brief Q-46 (2026-08-20), 2026-09-08).
 *
 * Formula .....
 *     gross income = Σ of the organizer's income lines of a taxable type
 *     401(k) contribution = household pre-tax contributions annual(op)
 *     standard deduction = deduction for(filing status, people 65+, gross − 401(k))   — base figure + 65+ add-on + senior deduction
 *     taxable income = max(0, gross income − 401(k) contribution − standard deduction)
 *
 * Called by ... MK-PL-F-031 taxOrganizer
 *
 * Reaches ..... 689 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 671 more — the full list is on functions_from_code
 *
 * Serves ...... MK-MN-M-027 · MK-MN-M-028
 * Reads ....... MK-XS-I-030 tax filing status and age
 * Ruled by .... DEC-0184
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
 *
 * Decides .....
 *     · Never lets over65 fall below 0.
 *     · Founder ruling brief Q-46 (2026-08-20) (2026-09-08): the organizer shows gross income, the 401(k) contribution, the standard deduction and taxable income — not one unexplained total.
 *     · The senior deduction phases out on gross income less the 401(k) contribution (the nearest figure the app holds to modified adjusted gross income).
 *     · Only pre-tax 401(k) contributions come off; a Roth contribution does not reduce taxable income.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-082
 * Changed ..... not in git yet (—)
 */
export function taxableIncomeSteps(op: OnboardingProfile | null, grossIncome: number): TaxableIncomeSteps {
  const status = filingStatusOf(op), over65 = over65CountOf(op);
  const preTaxContributions = (householdPreTaxContributionsAnnual(op));
  const magi = Math.max(0, grossIncome - preTaxContributions);
  const standardDeduction = (deductionFor(status, over65, magi));
  const deductionIncludes: string[] = [];
  const people = Math.min(2, Math.max(0, over65));
  if (people > 0) deductionIncludes.push(`the 65+ add-on (${people === 2 ? 'both of you' : 'one person'})`);
  if (seniorDeductionFor(status, over65, magi) > 0) deductionIncludes.push('the senior deduction (2025–2028)');
  void TAX_TABLES;
  // the spouse's age: on a joint return the 65-or-older question is the spouse's answer too (over65Who); not given, the spouse
  // is counted as under 65 and the person by their birth year (MK-CF-F-089) — said on the screen, never silent. Read as the
  // count reads it: the answer counts only on a filing status answered jointly, so a joint status assumed from a spouse
  // entered has the spouse counted as under 65 too
  const a: any = op ?? {};
  const spouseAgeNotEntered = status === 'married' && !(a.filingStatus === 'married' && a.over65Who);
  return { grossIncome: (grossIncome), preTaxContributions, standardDeduction, deductionIncludes, taxableIncome: (Math.max(0, grossIncome - preTaxContributions - standardDeduction)), spouseAgeNotEntered };
}

/** What it is for: the Tax organizer's rate in the words Base pay and the Income summary use for the same rate (canon row 25,
 *  2026-10-25): the rate in force (MK-CF-F-181) calculated — "Calculated federal tax" while it is federal only, "Calculated
 *  tax" once it holds the state rate entered — or the person's own, "your rate, 24%" typed or "your figures, 28%" from the
 *  take-home entered. It read "Est. effective federal rate" whatever the rate held. */
/* ─ MK-PL-F-090 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * rateWordsOf
 *
 * Answers ..... What it is for: the Tax organizer's rate in the words Base pay and the Income summary use for the same rate (canon row 25, 2026-10-25): the rate in force (MK-CF-F-181) calculated — "Calculated federal tax" while it is federal only, "Calculated tax" once it holds the state rate entered — or the person's own, "your rate, 24%" typed or "your figures, 28%" from the take-home entered.
 *
 * Formula .....
 *     r = rate in force(op)
 *     state = state rate of(op)
 *     the answer:
 *     estimated = source = 'estimated'
 *     state words = `the ${percent digits(state, 2)}% state rate you entered`   if source = 'estimated' and state > 0
 *     nothing   otherwise
 *     whose = label
 *
 * Called by ... MK-PL-F-031 taxOrganizer
 *
 * Reaches ..... 689 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 671 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-090
 * Changed ..... not in git yet (—)
 */
function rateWordsOf(op: OnboardingProfile | null): { estimated: boolean; stateWords: string | null; whose: string } {
  const r = rateInForce(op);
  const state = stateRateOf(op);   // the one reader of the state rate entered (MK-CF-F-086)
  return { estimated: r.source === 'estimated', stateWords: r.source === 'estimated' && state > 0 ? `the ${percentDigits(state, 2)}% state rate you entered` : null, whose: r.label };
}

/** The year-end summary for the accountant: income lines, the four taxable-income steps, contributions, accounts, documents to gather. */
/* ─ MK-PL-F-031 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * taxOrganizer
 *
 * Answers ..... The year-end summary for the accountant: income lines, the four taxable-income steps, contributions, accounts, documents to gather.
 *
 * Formula .....
 *     a = op (or none when missing)
 *     accounts = opts.accounts (or [], liabilities = opts.liabilities (or none when missing) when missing)
 *     se annual = se amount read as a number (0 when it is not one)   if se freq = 'annual'
 *     to num(se amount) × 12   otherwise
 *     other annual = other amount read as a number (0 when it is not one)   if other freq = 'annual'
 *     other amount read as a number (0 when it is not one)   if other freq = 'onetime'
 *     to num(other amount) × 12   otherwise   otherwise
 *     i = opts.interest
 *     inv div = I.amount (or 0 when missing)   if I
 *     opts.actual passive   if opts.actual passive ≠ nothing
 *     inv annual read as a number (0 when it is not one)   otherwise   otherwise
 *     not on record = I.not on record   if I
 *     opts.not on record (or 0 when missing)   otherwise
 *     ret inc = current retirement income monthly(op) × 12
 *     rsu = rsu annual(op, opts.year)
 *     gross income = Σ over income where taxable of (amount)
 *     nothing entered = income.length = 0
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-O-007 theTaxOrganizer
 *
 * Reaches ..... 689 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 671 more — the full list is on functions_from_code
 *
 * Serves ...... MK-MN-M-027 · MK-MN-M-028
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-003 institution name
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-022 pension monthly amount
 *               MK-XS-I-023 salary and other income
 *               MK-XS-I-039 how often each income arrives
 *               MK-XS-I-043 their own retirement contribution
 * Ruled by .... DEC-0184
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
 *
 * Decides .....
 *     · If amount is missing it uses 0.
 *     · If not on record is missing it uses 0.
 *     · If rsu is missing it uses 0.
 *     · If balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-031
 * Changed ..... 2026-06-13 (41698dd)
 */
export function taxOrganizer(op: OnboardingProfile | null, opts: { accounts?: any[]; liabilities?: any[]; actualPassive?: number; notOnRecord?: number; interest?: InterestAndDividendsForYear; year: number }): TaxOrganizer {
  const a = op ?? {};
  const accounts = opts.accounts ?? [], liabilities = opts.liabilities ?? [];
  const seAnnual = a.seFreq === 'annual' ? toNum(a.seAmount) : toNum(a.seAmount) * 12;
  const otherAnnual = a.otherFreq === 'annual' ? toNum(a.otherAmount) : a.otherFreq === 'onetime' ? toNum(a.otherAmount) : toNum(a.otherAmount) * 12;
  // THE RECORDS OF THE YEAR WIN WHERE THERE ARE ANY (2026-10-25): actualPassive is the year's recorded interest and dividends
  // (interestAndDividendsForYear's records step) — null when the year has no record, and then the figure the person entered stands. A record
  // total of $0 (a payout and its reversal) is a real $0, not a reason to fall back.
  // THE ONE FIGURE FOR THE YEAR (2026-10-25, the lead's ruling): the door hands in interestAndDividendsForYear — records →
  // entered → calculated ≈ → not entered — and its basis is said beside the line. A caller with no `interest` keeps the old
  // reading (records handed in as actualPassive, else the figure entered).
  const I = opts.interest;
  const invDiv = I ? (I.amount ?? 0) : opts.actualPassive != null ? opts.actualPassive : toNum(a.invAnnual);
  const notOnRecord = I ? I.notOnRecord : (opts.notOnRecord ?? 0);
  // B-35: only tax retirement income the user actually RECEIVES this year (gated) — a working
  // 40-year-old's future Social Security must not land in today's taxable income.
  const retInc = currentRetirementIncomeMonthly(op) * 12;
  // the shares that vest IN THE TAX YEAR NAMED (FIX-INCOME-B's rsuAnnual, 2026-10-25): null when a grant has no vest date —
  // then nothing is counted and the line under the income says so (tenet 3), never a silent $0
  const rsu = rsuAnnual(op, opts.year);

  const income: TaxLine[] = [
    { label: 'Wages (W-2)', amount: (salaryAnnual(op)), taxable: true },
    { label: 'Tips', amount: (tipsAnnual(op)), taxable: true },
    { label: 'Bonus', amount: toNum(a.bonusAnnual), taxable: true },
    { label: 'Signing bonus', amount: toNum(a.signingOnetime), taxable: true },
    { label: 'Equity / RSUs vested', amount: (rsu ?? 0), taxable: true },
    { label: 'Self-employment', amount: (seAnnual), taxable: true },
    { label: 'Interest & dividends', amount: (invDiv), taxable: true, ...(I ? { approx: I.approx, note: I.said } : {}) },
    { label: 'Rental (net)', amount: (rentalNetAnnual(op)), taxable: true },
    { label: 'Retirement income (SS / pension / withdrawals)', amount: (retInc), taxable: true },
    { label: 'Other income', amount: (otherAnnual), taxable: (a.otherTaxable !== 'no') },
    { label: 'Benefits (SNAP/TANF/disability/UI/housing)', amount: (benefitAnnual(op)), taxable: false },
    { label: 'Child support / alimony', amount: toNum(a.supportMonthly) * 12, taxable: false },
    { label: 'Scholarships / grants', amount: ((Array.isArray(a.scholarships) ? a.scholarships : []).reduce((t: number, s: any) => t + (s?.freq === 'monthly' ? toNum(s.amount) * 12 : toNum(s.amount)), 0)), taxable: false },
  ].filter((l) => l.amount > 0);

  // Q46 (founder ruling 2026-09-08): gross income of taxable types → less the 401(k) → less the
  // standard deduction → taxable income. Before this the screen printed the first figure under the
  // last figure's name ($120,000 shown as taxable income where a return says $83,900).
  const grossIncome = (income.filter((l) => l.taxable).reduce((t, l) => t + l.amount, 0));
  // NOTHING ENTERED → NO WALK (2026-10-25, outside audit part 17, MK-CF-O-007-C02; tenet 3, DEC-0296): with no income line at
  // all the screen printed Gross income $0, Standard deduction −$16,100, Taxable income $0 and a ~0% rate — a tax answer for
  // nobody. Now the walk and the rate are not given, and the screen shows its one empty line and the door (Q48).
  const nothingEntered = income.length === 0;
  // A WAGE ENTERED THAT CANNOT BE READ (R23a, 2026-11-01): no walk and no rate are worked on it as if it were $0 — the screen says why
  const wageRefusal = wageRefusalOf(op);
  const steps = nothingEntered || wageRefusal ? null : taxableIncomeSteps(op, grossIncome);
  const taxableTotal = steps ? steps.taxableIncome : null;
  const nonTaxableTotal = (income.filter((l) => !l.taxable).reduce((t, l) => t + l.amount, 0));
  const contributions: TaxLine[] = [
    { label: '401(k) — pre-tax', amount: householdPreTaxContributionsAnnual(op), taxable: false },   // the ONE producer (MK-CF-F-188), every earner
    { label: 'Roth IRA', amount: toNum(a.c_roth) * 12, taxable: false },
  ].filter((l) => l.amount > 0);

  const acct = accounts.map((x: any) => ({ label: x.institution?.trim() || x.label || x.kind || 'Account', kind: x.kind ?? x.tax_bucket ?? 'account', balance: x.balance || 0 }));
  const has = (k: string) => accounts.some((x: any) => (x.kind ?? '') === k);
  const docs: string[] = ["Last year’s tax return", 'SSN/ID for you and any dependents'];
  // a wage entered that cannot be read is still a job: its W-2 is still to gather (CF6-14, R27, 2026-11-02 — it was dropped)
  if (salaryAnnual(op) > 0 || tipsAnnual(op) > 0 || wageRefusal != null) docs.push('W-2 from each employer');
  if (seAnnual > 0) docs.push('1099-NEC / business income & expense records (Schedule C)');
  if (invDiv > 0 || has('brokerage')) docs.push('1099-INT, 1099-DIV, and 1099-B (brokerage)');
  if (rentalNetAnnual(op) > 0) docs.push('Rental income & expense records (Schedule E)');
  if (retInc > 0) docs.push('1099-R (withdrawals/pension) and SSA-1099 (Social Security)');
  if ((Array.isArray(a.scholarships) && a.scholarships.length) || has('college_529')) docs.push('1098-T (tuition) and any 529 records');
  if (Array.isArray(a.loans) && a.loans.length) docs.push('1098-E (student-loan interest)');
  if (liabilities.some((d: any) => d.debt_type === 'MORTGAGE') || has('home')) docs.push('1098 (mortgage interest) and property-tax records');
  if (has('hsa')) docs.push('1099-SA / 5498-SA (HSA)');
  if (toNum(a.c_401k) > 0) docs.push('401(k) contributions (shown on your W-2, box 12)');

  return {
    year: opts.year, income, steps, refusal: nothingEntered ? 'Nothing entered yet.' : null,   // Q48's words (DEC-0431)
    // the words Interest & dividends uses for the same records (MK-CF-F-184)
    notCounted: [notOnRecord > 0 ? `Not counted: ${plural(notOnRecord, 'payment')} — amount not on record.` : '',
                 rsu == null ? 'Not counted: shares that vest — vest date not entered.' : ''].filter(Boolean).join(' ') || null,
    taxableTotal, nonTaxableTotal,
    estTaxRate: nothingEntered || wageRefusal ? null : (effectiveRate(op)),
    rate: nothingEntered || wageRefusal ? null : rateWordsOf(op),
    wageRefusal,
    grossIncome,
    contributions, accounts: acct, documents: docs,
  };
}

// ───────────────────────── Roth conversion (fill a low bracket) ─────────────────────────
// In a low-income year (e.g. early retirement, before Social Security / RMDs), move pre-tax
// 401(k)/IRA money to Roth, paying tax now at a low rate so it grows tax-free and dodges future RMDs.
// The classic move: convert just enough to "fill up" a target tax bracket without spilling into the next.
/** THE Roth-conversion tax figure (Build-47 walk row 6): the cost of converting `amount` this
 *  year on top of `gross` income — progressive, filing-status + state aware, the SAME taxOwedFor
 *  every other tax figure uses. The old bracket-fill rothConversion helper (flat federal math,
 *  zero product callers) is retired — one concept, one helper. */
/* ─ MK-PL-F-032 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * rothConversionCost
 *
 * Answers ..... ───────────────────────── Roth conversion (fill a low bracket) ───────────────────────── In a low-income year (e.g.
 *
 * Formula .....
 *     tax owed for(gross + amount, status, state rate) − tax owed for(gross, status, state rate)
 *
 * Called by ... MK-PL-F-096 accountsAfterRothConversion
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-PL-F-096 accountsAfterRothConversion
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Decides .....
 *     · The conversion is stacked on top of the year's other ordinary income and taxed through the brackets from there (A42). Not modelled: the Medicare income-related premium surcharge (IRMAA) two years later and the net-investment-income tax — both can change whether a conversion is worth doing at 55–70.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-032
 * Changed ..... 2026-07-30 (a85874e)
 */
export function rothConversionCost(gross: number, amount: number, status: import('../income/tax').FilingStatus, stateRate: number): number {
  const { taxOwedFor } = require('../income/tax');
  return (taxOwedFor(gross + amount, status, stateRate) - taxOwedFor(gross, status, stateRate));
}

// ───────────────────────── 529 / education savings ─────────────────────────
export interface EduPlanInput {
  currentAnnualCost: number;   // today's cost of one year (tuition + room/board)
  yearsUntilStart: number;     // years until school begins
  yearsOfSchool: number;       // e.g. 4
  currentSavings: number;      // already set aside
  returnRate: number;          // expected annual return on savings (decimal)
  costInflation: number;       // education cost inflation (decimal, ~0.05)
}
export interface EduPlan {
  futureTotalCost: number;     // all years, inflated to when they're paid
  savingsAtStart: number;      // current savings grown to start of school
  gap: number;                 // shortfall to fund
  monthlyNeeded: number;       // level monthly contribution to close the gap by start
  onTrackPct: number;          // savingsAtStart / futureTotalCost (0–100+)
}
/* ─ MK-PL-F-033 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * educationPlan
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     yrs = max(0, round down(inp.years until start))
 *     n school = max(1, round down(inp.years of school))
 *     future total cost = 0
 *     savings at start = inp.current savings × (1 + inp.return rate)^(yrs)
 *     gap = max(0, future total cost − savings at start)
 *     n = yrs × 12, r = inp.return rate ÷ 12
 *     factor = (math.pow(1 + r, n) − 1) ÷ r   if r > 0
 *     n   otherwise
 *     monthly needed = gap ÷ factor   if n > 0 and factor > 0
 *     gap   otherwise
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... MK-PL-M-036 · MK-PL-M-037
 *
 * Decides .....
 *     · Uses a built-in future total cost of 0.
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-033
 * Changed ..... 2026-06-08 (8770420)
 */
export function educationPlan(inp: EduPlanInput): EduPlan {
  const yrs = Math.max(0, Math.floor(inp.yearsUntilStart));
  const nSchool = Math.max(1, Math.floor(inp.yearsOfSchool));
  // total cost = each school year's cost, inflated to the year it's actually paid
  let futureTotalCost = 0;
  for (let y = 0; y < nSchool; y++) futureTotalCost += inp.currentAnnualCost * Math.pow(1 + inp.costInflation, yrs + y);
  const savingsAtStart = inp.currentSavings * Math.pow(1 + inp.returnRate, yrs);
  const gap = Math.max(0, futureTotalCost - savingsAtStart);
  // level monthly contribution whose future value (at start) equals the gap
  const n = yrs * 12, r = inp.returnRate / 12;
  const factor = r > 0 ? (Math.pow(1 + r, n) - 1) / r : n;
  const monthlyNeeded = n > 0 && factor > 0 ? gap / factor : gap;   // n=0 → need it all now
  return {
    futureTotalCost: (futureTotalCost),
    savingsAtStart: (savingsAtStart),
    gap: (gap),
    monthlyNeeded: (monthlyNeeded),
    onTrackPct: futureTotalCost > 0 ? percentValue(savingsAtStart / futureTotalCost, 0) : 0,
  };
}

// ───────────────────────── Life-insurance need (DIME-style) ─────────────────────────
export interface InsuranceInput {
  annualIncome: number;     // income your family would lose
  yearsToReplace: number;   // how many years to replace it (e.g. until kids are independent)
  debts: number;            // mortgage + other debts to clear
  futureGoals: number;      // e.g. kids' college fund
  finalExpenses: number;    // funeral / estate settling (~$15k default)
  liquidSavings: number;    // assets your family could use
  existingCoverage: number; // life insurance you already have
}
export interface InsuranceNeed {
  incomeReplacement: number;
  totalNeed: number;        // income replacement + debts + goals + final expenses
  covered: number;          // savings + existing coverage
  gap: number;              // additional coverage to buy
}
/* ─ MK-PL-F-034 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * lifeInsuranceNeed
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     income replacement = max(0, inp.annual income) × math.max(0, inp.years to replace)
 *     total need = income replacement + max(0, inp.debts) + max(0, inp.future goals) + max(0, inp.final expenses)
 *     covered = max(0, inp.liquid savings) + math.max(0, inp.existing coverage)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Never lets annual income fall below 0.
 *     · Never lets years to replace fall below 0.
 *     · Never lets debts fall below 0.
 *     · Never lets future goals fall below 0.
 *     · Never lets final expenses fall below 0.
 *     · Never lets liquid savings fall below 0.
 *     · Never lets existing coverage fall below 0.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-034
 * Changed ..... 2026-06-08 (eceb40c)
 */
export function lifeInsuranceNeed(inp: InsuranceInput): InsuranceNeed {
  const incomeReplacement = Math.max(0, inp.annualIncome) * Math.max(0, inp.yearsToReplace);
  const totalNeed = incomeReplacement + Math.max(0, inp.debts) + Math.max(0, inp.futureGoals) + Math.max(0, inp.finalExpenses);
  const covered = Math.max(0, inp.liquidSavings) + Math.max(0, inp.existingCoverage);
  return {
    incomeReplacement: (incomeReplacement),
    totalNeed: (totalNeed),
    covered: (covered),
    gap: (Math.max(0, totalNeed - covered)),
  };
}

