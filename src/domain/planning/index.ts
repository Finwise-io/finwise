// Life-stage planning calculators (529 education, life-insurance need, estate checklist, Roth conversion).
import type { OnboardingProfile } from '../onboardingProfile';
// Pure functions — no I/O — so they're easy to test and reuse across screens.
import { round2, toNum } from '../_shared/num';

import { salaryAnnual, tipsAnnual, rsuAnnual, rentalNetAnnual, currentRetirementIncomeMonthly, effectiveRate, benefitAnnual } from '../income';

// ───────────────────────── Tax organizer (the "give this to your CPA" summary) ─────────────────────────
// A year-end summary + a tailored document checklist. NOT a tax return — an organizer. Pure: the
// screen passes live accounts/liabilities and actual passive income.
export interface TaxLine { label: string; amount: number; taxable: boolean }
export interface TaxOrganizer {
  year: number;
  income: TaxLine[];
  taxableTotal: number;
  nonTaxableTotal: number;
  estTaxRate: number;
  contributions: TaxLine[];
  accounts: { label: string; kind: string; balance: number }[];
  documents: string[];
}
/* ─ MK-PL-F-031 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * taxOrganizer
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     a = op (or none when missing)
 *     accounts = opts.accounts (or [], liabilities = opts.liabilities (or none when missing) when missing)
 *     se annual = se amount read as a number (0 when it is not one)   if se freq = 'annual'
 *     to num(se amount) × 12   otherwise
 *     other annual = other amount read as a number (0 when it is not one)   if other freq = 'annual'
 *     other amount read as a number (0 when it is not one)   if other freq = 'onetime'
 *     to num(other amount) × 12   otherwise   otherwise
 *     inv div = opts.actual passive   if opts.actual passive and opts.actual passive > 0
 *     inv annual read as a number (0 when it is not one)   otherwise
 *     ret inc = current retirement income monthly(op) × 12
 *     taxable total = round(Σ over income where taxable of (amount), 2 dp)
 *     non taxable total = round(Σ over income where taxable is missing of (amount), 2 dp)
 *     acct = for each of accounts: label = institution.trim() (or label (or kind (or 'Account' when missing or zero) when missing or zero) when missing or zero)
 *     kind = kind (or tax bucket (or 'account' when missing) when missing)
 *     balance = balance (or 0 when missing or zero)
 *     has = (k: string) => accounts.some((x: any) => (kind ?? '') = k)
 *     docs = ["last year's tax return", 'SSN ÷ ID for you and any dependents']
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-003 institution name
 *               MK-XS-I-022 pension monthly amount
 *               MK-XS-I-023 salary and other income
 *               MK-XS-I-043 their own retirement contribution
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · If balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *     · Multiplies by 100 — a percentage, or an option contract treated as 100 shares. Worth checking which.
 *     · Rounds the answer to a whole number.
 *     · Leaves some rows out of the answer — check which.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-031
 * Changed ..... 2026-06-13 (41698dd)
 */
export function taxOrganizer(op: OnboardingProfile | null, opts: { accounts?: any[]; liabilities?: any[]; actualPassive?: number; year: number }): TaxOrganizer {
  const a = op ?? {};
  const accounts = opts.accounts ?? [], liabilities = opts.liabilities ?? [];
  const seAnnual = a.seFreq === 'annual' ? toNum(a.seAmount) : toNum(a.seAmount) * 12;
  const otherAnnual = a.otherFreq === 'annual' ? toNum(a.otherAmount) : a.otherFreq === 'onetime' ? toNum(a.otherAmount) : toNum(a.otherAmount) * 12;
  const invDiv = opts.actualPassive && opts.actualPassive > 0 ? opts.actualPassive : toNum(a.invAnnual);
  // B-35: only tax retirement income the user actually RECEIVES this year (gated) — a working
  // 40-year-old's future Social Security must not land in today's taxable income.
  const retInc = currentRetirementIncomeMonthly(op) * 12;

  const income: TaxLine[] = [
    { label: 'Wages (W-2)', amount: round2(salaryAnnual(op)), taxable: true },
    { label: 'Tips', amount: round2(tipsAnnual(op)), taxable: true },
    { label: 'Bonus', amount: toNum(a.bonusAnnual), taxable: true },
    { label: 'Signing bonus', amount: toNum(a.signingOnetime), taxable: true },
    { label: 'Equity / RSUs vested', amount: round2(rsuAnnual(op)), taxable: true },
    { label: 'Self-employment', amount: round2(seAnnual), taxable: true },
    { label: 'Interest & dividends', amount: round2(invDiv), taxable: true },
    { label: 'Rental (net)', amount: round2(rentalNetAnnual(op)), taxable: true },
    { label: 'Retirement income (SS / pension / withdrawals)', amount: round2(retInc), taxable: true },
    { label: 'Other income', amount: round2(otherAnnual), taxable: (a.otherTaxable !== 'no') },
    { label: 'Benefits (SNAP/TANF/disability/UI/housing)', amount: round2(benefitAnnual(op)), taxable: false },
    { label: 'Child support / alimony', amount: toNum(a.supportMonthly) * 12, taxable: false },
    { label: 'Scholarships / grants', amount: round2((Array.isArray(a.scholarships) ? a.scholarships : []).reduce((t: number, s: any) => t + (s?.freq === 'monthly' ? toNum(s.amount) * 12 : toNum(s.amount)), 0)), taxable: false },
  ].filter((l) => l.amount > 0);

  const taxableTotal = round2(income.filter((l) => l.taxable).reduce((t, l) => t + l.amount, 0));
  const nonTaxableTotal = round2(income.filter((l) => !l.taxable).reduce((t, l) => t + l.amount, 0));
  const contributions: TaxLine[] = [
    { label: '401(k) — pre-tax', amount: toNum(a.c_401k) * 12, taxable: false },
    { label: 'Roth IRA', amount: toNum(a.c_roth) * 12, taxable: false },
  ].filter((l) => l.amount > 0);

  const acct = accounts.map((x: any) => ({ label: x.institution?.trim() || x.label || x.kind || 'Account', kind: x.kind ?? x.tax_bucket ?? 'account', balance: x.balance || 0 }));
  const has = (k: string) => accounts.some((x: any) => (x.kind ?? '') === k);
  const docs: string[] = ["Last year's tax return", 'SSN/ID for you and any dependents'];
  if (salaryAnnual(op) > 0 || tipsAnnual(op) > 0) docs.push('W-2 from each employer');
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
    year: opts.year, income, taxableTotal, nonTaxableTotal,
    estTaxRate: Math.round(effectiveRate(op) * 100) / 100,
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
 *     round(tax owed for(gross + amount, status, state rate) − tax owed for(gross, status, state rate), 2 dp)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-032
 * Changed ..... 2026-07-30 (a85874e)
 */
export function rothConversionCost(gross: number, amount: number, status: import('../income/tax').FilingStatus, stateRate: number): number {
  const { taxOwedFor } = require('../income/tax');
  return round2(taxOwedFor(gross + amount, status, stateRate) - taxOwedFor(gross, status, stateRate));
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
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses a built-in future total cost of 0.
 *     · Uses a built-in y of 0.
 *     · Treats a year as twelve equal months.
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *     · Multiplies by 100 — a percentage, or an option contract treated as 100 shares. Worth checking which.
 *     · Rounds the answer to a whole number.
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
    futureTotalCost: round2(futureTotalCost),
    savingsAtStart: round2(savingsAtStart),
    gap: round2(gap),
    monthlyNeeded: round2(monthlyNeeded),
    onTrackPct: futureTotalCost > 0 ? Math.round((savingsAtStart / futureTotalCost) * 100) : 0,
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
 * Formula also on the master file · functions_from_code · MK-PL-F-034
 * Changed ..... 2026-06-08 (eceb40c)
 */
export function lifeInsuranceNeed(inp: InsuranceInput): InsuranceNeed {
  const incomeReplacement = Math.max(0, inp.annualIncome) * Math.max(0, inp.yearsToReplace);
  const totalNeed = incomeReplacement + Math.max(0, inp.debts) + Math.max(0, inp.futureGoals) + Math.max(0, inp.finalExpenses);
  const covered = Math.max(0, inp.liquidSavings) + Math.max(0, inp.existingCoverage);
  return {
    incomeReplacement: round2(incomeReplacement),
    totalNeed: round2(totalNeed),
    covered: round2(covered),
    gap: round2(Math.max(0, totalNeed - covered)),
  };
}
