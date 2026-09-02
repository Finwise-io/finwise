// IRS federal income-tax schedule (single filer, 2026 — public domain, IRS Rev. Proc. 2025-32).
// Stored as data so the UI can compute tax owed, an effective rate, the marginal bracket, or
// back out gross from take-home. Update yearly. Bracket = [upper bound, marginal rate].
export const TAX_BRACKETS: [number, number][] = [
  [12_400, 0.10],
  [50_400, 0.12],
  [105_700, 0.22],
  [201_775, 0.24],
  [256_225, 0.32],
  [640_600, 0.35],
  [Infinity, 0.37],
];
export const TAX_YEAR = 2026;
export const STANDARD_DEDUCTION = 16_100;   // 2026 single-filer standard deduction (IRS)





/** Invert the schedule: the gross income whose take-home equals `net` (bisection). */
/* ─ MK-CF-F-097 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * grossFromNet
 *
 * Answers ..... Invert the schedule: the gross income whose take-home equals `net` (bisection).
 *
 * Formula .....
 *     0   when net ≤ 0
 *     lo = net, hi = net × 3
 *     mid = (lo + hi) ÷ 2
 *     the answer = round((lo + hi) ÷ 2)
 *
 * Called by ... MK-CF-F-186 convertTakeHomeMode
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-F-186 convertTakeHomeMode
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Decides .....
 *     · Uses a built-in i of 0.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-097
 * Changed ..... 2026-07-14 (cf50737)
 */
export function grossFromNet(net: number, status: FilingStatus = 'single', over65 = 0): number {
  if (net <= 0) return 0;
  let lo = net, hi = net * 3;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (mid - taxOwedFor(mid, status, 0, over65) < net) lo = mid; else hi = mid;
  }
  return Math.round((lo + hi) / 2);
}

/** PRD F2#11 — progressive PER-MONTH tax: brackets fill as the year's taxable income accumulates
 *  month by month (Jan→Dec), so tax_m = taxOwedFor(cumulative through m) − taxOwedFor(cumulative through
 *  m−1). Telescoping guarantees Σ tax_m === taxOwedFor(annual) EXACTLY — the annual identity the
 *  sameness contract requires — while a bonus month visibly withholds at its higher bracket. */
/* ─ MK-CF-F-098 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * progressiveMonthlyTax
 *
 * Answers ..... PRD F2#11 — progressive PER-MONTH tax: brackets fill as the year's taxable income accumulates month by month (Jan→Dec), so tax_m = taxOwedFor(cumulative through m) − taxOwedFor(cumulative through m−1).
 *
 * Formula .....
 *     cum = 0, prev tax = 0, prev ti = 0
 *     t = tax owed for(cum, status, 0, over65)
 *     m = t − prev tax
 *     ti = taxable income for(cum, status, over65)
 *     state m = (ti − prev ti) × min(0.15, max(0, state rate))
 *     the answer = m + state m
 *
 * Called by ... MK-CF-F-049 buildIncomeState · MK-CF-F-087 monthlyTaxRates
 *
 * Reaches ..... 26 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-012 annualCashflow · MK-CF-F-013 budgetFromOnboarding
 *               MK-CF-F-014 budgetVsActual · MK-XS-F-004 buildDatedGrid
 *               MK-CF-F-049 buildIncomeState · MK-CF-F-107 buildPaycheckYear
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-020 cashflowYear
 *               MK-CF-F-003 categoryMonthly · MK-XS-F-030 effectiveAnnualContribution
 *               MK-CF-F-010 emergencyTest · MK-CF-F-052 getIncomeState
 *               MK-CF-F-092 incomeMonthlyGrid · MK-CF-O-004 incomeSummary
 *               MK-CF-F-009 monthlyEssentials · MK-XS-F-029 monthlySavings
 *               MK-CF-F-087 monthlyTaxRates · MK-CF-F-120 pctBaseMonthly
 *               … and 8 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-098
 * Changed ..... 2026-08-20 (764ca16)
 */
export function progressiveMonthlyTax(taxableByMonth: number[], status: FilingStatus = 'single', stateRate = 0, over65 = 0): number[] {
  let cum = 0, prevTax = 0, prevTi = 0;
  return taxableByMonth.map((g) => {
    cum += Math.max(0, g);
    const t = taxOwedFor(cum, status, 0, over65);
    const m = t - prevTax;
    prevTax = t;
    // E10: state rides TAXABLE income, telescoped the same way — the annual identity holds:
    // Σ months = stateRate × taxableIncomeFor(annual), and the deduction is never taxed.
    const ti = taxableIncomeFor(cum, status, over65);
    const stateM = (ti - prevTi) * Math.min(0.15, Math.max(0, stateRate));
    prevTi = ti;
    return m + stateM;
  });
}

// ── PRD F9#14 / F3#17: filing status + optional flat state rate ─────────────────────────────
// TRACK 3 (founder brief 2026-08-20) — one dated, sourced table per status, and three fixes:
//   E9: the married table is EXPLICIT, never derived by doubling — the 37% threshold for married
//       filers is $768,700, not 2 × $640,600 = $1,281,200. The doubling shortcut was wrong by half
//       a million dollars exactly where the rate is highest. Head-of-household likewise explicit.
//   E8: the over-65 ADDITIONAL standard deduction exists — this audience is 55–70 and no engine
//       took an age. Per person 65+; a spouse's age is not captured, so married counts the person
//       only (the error direction overstates tax slightly — conservative for a plan).
//   E10: the user's flat state rate applies to TAXABLE income, never to gross — applying it to
//       gross taxed the standard deduction itself. Federal taxable income is the stated, honest
//       base for the estimate (states differ; the label says estimate).
// 2026 figures (IRS Rev. Proc. 2025-32 — directional until the founder confirms against IRS
// guidance, per the brief's convention on statutory numbers).
export type FilingStatus = 'single' | 'married' | 'mfs' | 'hoh';
export const TAX_TABLES: Record<FilingStatus, { brackets: [number, number][]; deduction: number; over65Add: number }> = {
  single: { brackets: TAX_BRACKETS, deduction: STANDARD_DEDUCTION, over65Add: 2_050 },
  married: {
    brackets: [[24_800, 0.10], [100_800, 0.12], [211_400, 0.22], [403_550, 0.24], [512_450, 0.32], [768_700, 0.35], [Infinity, 0.37]],
    deduction: 32_200, over65Add: 1_650,
  },
  // MARRIED FILING SEPARATELY — its own table, added 2026-08-27 at the founder's ruling.
  // Every band and the deduction are HALF the married-filing-jointly figures. That is the statutory
  // rule (IRC §1), not an estimate: the joint figures above come from Rev. Proc. 2025-32 and these
  // are derived from them, so the two can never drift apart.
  //
  // Worth knowing when reading a number: MFS and SINGLE give the same tax to the cent until taxable
  // income passes $384,350 — every band below the 35% one is identical, and so is the deduction.
  // It is a separate table because the top band really does differ, and because the LABEL matters:
  // filing separately also blocks a Roth contribution above $10,000 of income and changes how much
  // Social Security is taxed. The app does not model those yet; when it does, it must know.
  mfs: {
    brackets: [[12_400, 0.10], [50_400, 0.12], [105_700, 0.22], [201_775, 0.24], [256_225, 0.32], [384_350, 0.35], [Infinity, 0.37]],
    deduction: 16_100, over65Add: 1_650,
  },
  hoh: {
    brackets: [[17_700, 0.10], [67_450, 0.12], [105_700, 0.22], [201_775, 0.24], [256_225, 0.32], [640_600, 0.35], [Infinity, 0.37]],
    deduction: 24_150, over65Add: 2_050,
  },
};

/** The standard deduction with the age-65 additions (E8). `over65` = how many people on the
 *  return are 65 or older (0, 1, or 2 on a joint return). */
/* ─ MK-CF-F-099 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * deductionFor
 *
 * Answers ..... The standard deduction with the age-65 additions (E8).
 *
 * Formula .....
 *     t = TAX_TABLES[status]
 *     the answer = deduction + min(2, max(0, over65)) × over65 add
 *
 * Called by ... MK-CF-F-100 taxableIncomeFor
 *
 * Reaches ..... 47 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-012 annualCashflow · MK-CF-O-001 basePay
 *               MK-CF-F-013 budgetFromOnboarding · MK-CF-F-014 budgetVsActual
 *               MK-XS-F-004 buildDatedGrid · MK-CF-F-049 buildIncomeState
 *               MK-CF-F-107 buildPaycheckYear · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-020 cashflowYear · MK-CF-F-003 categoryMonthly
 *               MK-CF-F-186 convertTakeHomeMode · MK-CF-F-145 deductionsFromPay
 *               MK-CF-F-171 earnerPay · MK-XS-F-030 effectiveAnnualContribution
 *               MK-CF-F-090 effectiveRate · MK-CF-F-102 effectiveRateOnGrossFor
 *               MK-CF-F-048 effectiveTaxRate · MK-CF-F-010 emergencyTest
 *               … and 29 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-099
 * Changed ..... 2026-08-20 (764ca16)
 */
export function deductionFor(status: FilingStatus = 'single', over65 = 0): number {
  const t = TAX_TABLES[status];
  return t.deduction + Math.min(2, Math.max(0, over65)) * t.over65Add;
}

/* ─ MK-CF-F-100 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * taxableIncomeFor
 *
 * Answers ..... What income is taxed, given how this person files?
 *
 * Formula .....
 *     max(0, gross − deduction for(status, over65))
 *
 * Called by ... MK-CF-F-098 progressiveMonthlyTax · MK-CF-F-101 taxOwedFor
 *               MK-CF-F-103 marginalBracketFor · MK-CF-F-104 ltcgRateFor
 *
 * Reaches ..... 46 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-012 annualCashflow · MK-CF-O-001 basePay
 *               MK-CF-F-013 budgetFromOnboarding · MK-CF-F-014 budgetVsActual
 *               MK-XS-F-004 buildDatedGrid · MK-CF-F-049 buildIncomeState
 *               MK-CF-F-107 buildPaycheckYear · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-020 cashflowYear · MK-CF-F-003 categoryMonthly
 *               MK-CF-F-186 convertTakeHomeMode · MK-CF-F-145 deductionsFromPay
 *               MK-CF-F-171 earnerPay · MK-XS-F-030 effectiveAnnualContribution
 *               MK-CF-F-090 effectiveRate · MK-CF-F-102 effectiveRateOnGrossFor
 *               MK-CF-F-048 effectiveTaxRate · MK-CF-F-010 emergencyTest
 *               … and 28 more — the full list is on functions_from_code
 *
 * Serves ...... MK-MN-M-027 · MK-MN-M-028
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-100
 * Changed ..... 2026-08-20 (764ca16)
 */
export function taxableIncomeFor(gross: number, status: FilingStatus = 'single', over65 = 0): number {
  return Math.max(0, gross - deductionFor(status, over65));
}

/** Federal tax owed under a filing status, plus an optional user-set FLAT state rate applied to
 *  TAXABLE income (E10) — states differ wildly, so one honest user-entered percent beats fifty
 *  guessed tables, and it never taxes the deduction. */
/* ─ MK-CF-F-101 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * taxOwedFor
 *
 * Answers ..... Federal tax owed under a filing status, plus an optional user-set FLAT state rate applied to TAXABLE income (E10) — states differ wildly, so one honest user-entered percent beats fifty guessed tables, and it never taxes the deduction.
 *
 * Formula .....
 *     ti = taxable income for(gross, status, over65)
 *     tax = 0, lower = 0
 *     the answer = tax + ti × min(0.15, max(0, state rate))
 *
 * Called by ... MK-CF-F-097 grossFromNet · MK-CF-F-098 progressiveMonthlyTax
 *               MK-CF-F-102 effectiveRateOnGrossFor · MK-CF-F-144 takeHomeAsEntered
 *               MK-PL-F-032 rothConversionCost
 *
 * Reaches ..... 42 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-012 annualCashflow · MK-CF-O-001 basePay
 *               MK-CF-F-013 budgetFromOnboarding · MK-CF-F-014 budgetVsActual
 *               MK-XS-F-004 buildDatedGrid · MK-CF-F-049 buildIncomeState
 *               MK-CF-F-107 buildPaycheckYear · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-020 cashflowYear · MK-CF-F-003 categoryMonthly
 *               MK-CF-F-186 convertTakeHomeMode · MK-CF-F-145 deductionsFromPay
 *               MK-CF-F-171 earnerPay · MK-XS-F-030 effectiveAnnualContribution
 *               MK-CF-F-090 effectiveRate · MK-CF-F-102 effectiveRateOnGrossFor
 *               MK-CF-F-048 effectiveTaxRate · MK-CF-F-010 emergencyTest
 *               … and 24 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-101
 * Changed ..... 2026-08-20 (764ca16)
 */
export function taxOwedFor(gross: number, status: FilingStatus = 'single', stateRate = 0, over65 = 0): number {
  const ti = taxableIncomeFor(gross, status, over65);
  let tax = 0, lower = 0;
  if (ti > 0) {
    for (const [upper, rate] of TAX_TABLES[status].brackets) {
      if (ti <= lower) break;
      tax += (Math.min(ti, upper) - lower) * rate;
      lower = upper;
    }
  }
  return tax + ti * Math.min(0.15, Math.max(0, stateRate));
}

/* ─ MK-CF-F-102 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * effectiveRateOnGrossFor
 *
 * Answers ..... What share of my income actually goes in tax?
 *
 * Formula .....
 *     tax owed for(gross, status, state rate, over65) ÷ gross   if gross > 0
 *     0   otherwise
 *
 * Called by ... MK-CF-F-048 effectiveTaxRate · MK-CF-F-181 rateInForce
 *               MK-PL-F-067 willItLastInputs
 *
 * Reaches ..... 33 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-012 annualCashflow · MK-CF-O-001 basePay
 *               MK-CF-F-013 budgetFromOnboarding · MK-CF-F-014 budgetVsActual
 *               MK-XS-F-004 buildDatedGrid · MK-CF-F-049 buildIncomeState
 *               MK-CF-F-107 buildPaycheckYear · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-020 cashflowYear · MK-CF-F-003 categoryMonthly
 *               MK-XS-F-030 effectiveAnnualContribution · MK-CF-F-090 effectiveRate
 *               MK-CF-F-048 effectiveTaxRate · MK-CF-F-010 emergencyTest
 *               MK-CF-F-052 getIncomeState · MK-CF-F-092 incomeMonthlyGrid
 *               MK-CF-O-004 incomeSummary · MK-CF-F-009 monthlyEssentials
 *               … and 15 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-102
 * Changed ..... 2026-08-20 (764ca16)
 */
export function effectiveRateOnGrossFor(gross: number, status: FilingStatus = 'single', stateRate = 0, over65 = 0): number {
  return gross > 0 ? taxOwedFor(gross, status, stateRate, over65) / gross : 0;
}

/* ─ MK-CF-F-103 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * marginalBracketFor
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     ti = taxable income for(gross, status, over65)
 *     the answer = 0.37
 *
 * Called by ... MK-CF-F-091 userCapGainsRates · MK-CF-O-001 basePay
 *               MK-CF-O-004 incomeSummary
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-CF-O-001 basePay · MK-CF-O-004 incomeSummary
 *               MK-CF-F-091 userCapGainsRates
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-103
 * Changed ..... 2026-08-20 (764ca16)
 */
export function marginalBracketFor(gross: number, status: FilingStatus = 'single', over65 = 0): number {
  const ti = taxableIncomeFor(gross, status, over65);
  for (const [upper, rate] of TAX_TABLES[status].brackets) if (ti <= upper) return rate;
  return 0.37;
}

// Long-term capital-gains brackets (0/15/20) by filing status, 2026 (taxable-income thresholds).
const LTCG: Record<FilingStatus, [number, number]> = {
  single: [49_450, 545_500],
  married: [98_900, 613_700],
  // MFS: half the joint thresholds, the same statutory rule as the income bands above.
  mfs: [49_450, 306_850],
  hoh: [66_200, 579_600],
};
/** The user's own long-term capital-gains rate, from their income + filing status (federal). */
/* ─ MK-CF-F-104 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * ltcgRateFor
 *
 * Answers ..... The user's own long-term capital-gains rate, from their income + filing status (federal).
 *
 * Formula .....
 *     ti = taxable income for(gross, status, over65)
 *     the answer:
 *     0   if ti ≤ zero top
 *     0.15   if ti ≤ fifteen top
 *     0.20   otherwise   otherwise
 *
 * Called by ... MK-CF-F-091 userCapGainsRates
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-F-091 userCapGainsRates
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-104
 * Changed ..... 2026-08-20 (764ca16)
 */
export function ltcgRateFor(gross: number, status: FilingStatus = 'single', over65 = 0): number {
  const ti = taxableIncomeFor(gross, status, over65);
  const [zeroTop, fifteenTop] = LTCG[status];
  return ti <= zeroTop ? 0 : ti <= fifteenTop ? 0.15 : 0.20;
}
