// Life-stage planning calculators (529 education, life-insurance need, estate checklist, Roth conversion).
// Pure functions — no I/O — so they're easy to test and reuse across screens.
import { round2 } from '../_shared/num';
import { TAX_BRACKETS, STANDARD_DEDUCTION, taxableIncome, taxOwed } from '../income/tax';

// ───────────────────────── Roth conversion (fill a low bracket) ─────────────────────────
// In a low-income year (e.g. early retirement, before Social Security / RMDs), move pre-tax
// 401(k)/IRA money to Roth, paying tax now at a low rate so it grows tax-free and dodges future RMDs.
// The classic move: convert just enough to "fill up" a target tax bracket without spilling into the next.
export interface RothInput {
  preTaxBalance: number;    // Traditional 401(k)/IRA you could convert
  otherIncome: number;      // this year's other taxable income (gross), before the conversion
  fillToRate: number;       // the marginal bracket you're willing to pay up to (e.g. 0.12, 0.22, 0.24)
}
export interface RothPlan {
  roomToConvert: number;    // how much you can convert staying within the target bracket
  taxCost: number;          // federal tax on that conversion
  effectiveRate: number;    // taxCost / roomToConvert
  bracketTopGross: number;  // the gross-income level that fills the bracket
}
export function rothConversion(inp: RothInput): RothPlan {
  const target = TAX_BRACKETS.find(([, r]) => r === inp.fillToRate) ?? TAX_BRACKETS[1];
  const ceilingTaxable = target[0];                       // upper bound of that bracket (taxable terms)
  const currentTI = taxableIncome(Math.max(0, inp.otherIncome));
  const room = Math.max(0, Math.min(Math.max(0, inp.preTaxBalance), ceilingTaxable - currentTI));
  const taxCost = taxOwed(inp.otherIncome + room) - taxOwed(inp.otherIncome);
  return {
    roomToConvert: round2(room),
    taxCost: round2(taxCost),
    effectiveRate: room > 0 ? Math.round((taxCost / room) * 1000) / 1000 : 0,
    bracketTopGross: ceilingTaxable + STANDARD_DEDUCTION,
  };
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
