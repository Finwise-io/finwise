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
/* ─ MK-CF-F-097 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * grossFromNet
 *
 * Answers ..... Invert the schedule: the gross income whose take-home equals `net` (bisection).
 *
 * Formula .....
 *     0   when net ≤ 0
 *     lo = net, hi = net × 3
 *     repeat 50 times: mid = (lo + hi) ÷ 2; if mid − tax owed for(mid, status, 0, over65) < net then lo = mid else hi = mid
 *     the answer = (lo + hi) ÷ 2   — the gross whose take-home equals net, found by halving the interval
 *
 * Called by ... MK-CF-F-186 convertTakeHomeMode
 *
 * Reaches ..... 58 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PL-F-053 buildRetirementState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-186 convertTakeHomeMode · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-NW-F-044 getAssetsState · MK-CF-F-041 getDebtState
 *               … and 40 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
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
  return (lo + hi) / 2;   // Q49: full precision inside; the display rounds
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
 * Reaches ..... 70 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-005 actualMonthFlow
 *               MK-CF-F-012 annualCashflow · MK-CF-F-210 annualOfSource
 *               … and 52 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Decides .....
 *     · Never lets g fall below 0.
 *     · Never lets state rate fall below 0.
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
//   E8: the over-65 ADDITIONAL standard deduction exists — this audience is 55–70 and no function
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

/** The standard deduction with the age-65 additions (E8) and the SENIOR DEDUCTION (G3, founder
 *  ruling 2026-09-08). `over65` = how many people on the return are 65 or older (0, 1, or 2 on a
 *  joint return). `magi` = the income the phase-out is measured against; null = not known, and then
 *  the senior deduction is NOT given (never guessed). */
// SENIOR DEDUCTION — One Big Beautiful Bill Act, P.L. 119-21 §70103 (new IRC §151(d)(5)), tax years
// 2025–2028: $6,000 per qualifying individual aged 65 or older, on top of the standard deduction and
// the 65+ add-on; reduced by 6% of modified adjusted gross income above $75,000 ($150,000 on a joint
// return); a married person must file JOINTLY to claim it (not available when filing separately).
// Source checked 2026-09-08; re-check when the tax year rolls, and it lapses after 2028.
export const SENIOR_DEDUCTION = {
  amount: 6_000,
  phaseOutStart: { single: 75_000, married: 150_000, mfs: 0, hoh: 75_000 } as Record<FilingStatus, number>,
  phaseOutRate: 0.06,
  firstYear: 2025,
  lastYear: 2028,
  eligible: { single: true, married: true, mfs: false, hoh: true } as Record<FilingStatus, boolean>,
} as const;

/** How much of the $6,000-per-person senior deduction does this return get? (P.L. 119-21 §70103, tax years 2025–2028; founder ruling 2026-09-08, G3.) */
/* ─ MK-CF-F-187 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * seniorDeductionFor
 *
 * Answers ..... How much of the $6,000-per-person senior deduction does this return get?
 *
 * Formula .....
 *     0   when the tax year is outside 2025–2028, or filing separately, or nobody on the return is 65+, or the income is not known
 *     people = min(2, over65)
 *     full = people × $6,000
 *     the answer = max(0, full − 6% × max(0, magi − start))   start = $75,000 single / head of household · $150,000 married
 *
 * Called by ... MK-CF-F-099 deductionFor · MK-PL-F-082 taxableIncomeSteps
 *
 * Reaches ..... 142 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-CF-F-202 TAX
 *               MK-NW-F-100 TREND · MK-CF-F-026 actualDebtPayment
 *               MK-CF-F-005 actualMonthFlow · MK-CF-F-012 annualCashflow
 *               … and 124 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Decides .....
 *     · Never lets over65 fall below 0.
 *     · Uses the published figures: $6,000 per person 65+, phased out at 6% above $75,000 ($150,000 joint), 2025–2028 (P.L. 119-21 §70103; checked 2026-09-08; lapses after 2028 — the statutory test fails when the tax year rolls past it).
 *     · Takes the income handed to it as modified adjusted gross income — the untaxed part of Social Security and other adjustments are not modelled.
 *     · Income not known → 0, never a guessed deduction.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-187
 * Changed ..... not in git yet (—)
 */
export function seniorDeductionFor(status: FilingStatus = 'single', over65 = 0, magi: number | null = null): number {
  const S = SENIOR_DEDUCTION;
  if (TAX_YEAR < S.firstYear || TAX_YEAR > S.lastYear) return 0;
  if (!S.eligible[status] || magi == null) return 0;
  const people = Math.min(2, Math.max(0, over65));
  if (people === 0) return 0;
  const full = people * S.amount;
  const excess = Math.max(0, magi - S.phaseOutStart[status]);
  return Math.max(0, full - S.phaseOutRate * excess);
}

/* ─ MK-CF-F-099 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * deductionFor
 *
 * Answers ..... What amount of income is tax-free before the brackets start. Answers: $16,100 single · $32
 *
 * Formula .....
 *     t = TAX_TABLES[status]
 *     the answer = deduction + min(2, max(0, over65)) × over65 add + senior deduction for(status, over65, magi)
 *
 * Called by ... MK-CF-F-100 taxableIncomeFor · MK-PL-F-082 taxableIncomeSteps
 *
 * Reaches ..... 141 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-CF-F-202 TAX
 *               MK-NW-F-100 TREND · MK-CF-F-026 actualDebtPayment
 *               MK-CF-F-005 actualMonthFlow · MK-CF-F-012 annualCashflow
 *               … and 123 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Decides .....
 *     · Never lets over65 fall below 0.
 *     · 2026 standard deduction $16,100 single · $32,200 married · $16,100 filing separately · $24,150 head of household; 65+ add-on $2,050 single / head of household · $1,650 per person married (IRS Rev. Proc. 2025-32 §3.18).
 *     · Plus the senior deduction of MK-CF-F-187 — $6,000 per person 65+, phased out 6% above $75,000 / $150,000, tax years 2025–2028 (P.L. 119-21 §70103).
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-099
 * Changed ..... 2026-08-20 (764ca16)
 */
export function deductionFor(status: FilingStatus = 'single', over65 = 0, magi: number | null = null): number {
  const t = TAX_TABLES[status];
  return t.deduction + Math.min(2, Math.max(0, over65)) * t.over65Add + seniorDeductionFor(status, over65, magi);
}

/* ─ MK-CF-F-100 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * taxableIncomeFor
 *
 * Answers ..... What income is taxed, given how this person files?
 *
 * Formula .....
 *     max(0, gross − deduction for(status, over65, gross))   — gross is handed on as the income the senior deduction phases out against
 *
 * Called by ... MK-CF-F-098 progressiveMonthlyTax · MK-CF-F-101 taxOwedFor
 *               MK-CF-F-103 marginalBracketFor · MK-CF-F-104 ltcgRateFor
 *
 * Reaches ..... 139 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-CF-F-202 TAX
 *               MK-NW-F-100 TREND · MK-CF-F-026 actualDebtPayment
 *               MK-CF-F-005 actualMonthFlow · MK-CF-F-012 annualCashflow
 *               … and 121 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-100
 * Changed ..... 2026-08-20 (764ca16)
 */
export function taxableIncomeFor(gross: number, status: FilingStatus = 'single', over65 = 0): number {
  return Math.max(0, gross - deductionFor(status, over65, gross));
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
 *     federal = Σ over the bands of the filing status, lowest first, while ti is above the band's floor: (min(ti, top of band) − top of the band below) × rate of band
 *     the answer = federal + ti × min(15%, max(0, state rate))
 *
 * Called by ... MK-CF-F-097 grossFromNet · MK-CF-F-098 progressiveMonthlyTax
 *               MK-CF-F-102 effectiveRateOnGrossFor · MK-CF-F-144 takeHomeAsEntered
 *               MK-PL-F-032 rothConversionCost
 *
 * Reaches ..... 135 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-CF-F-202 TAX
 *               MK-NW-F-100 TREND · MK-CF-F-026 actualDebtPayment
 *               MK-CF-F-005 actualMonthFlow · MK-CF-F-012 annualCashflow
 *               … and 117 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Decides .....
 *     · Never lets state rate fall below 0.
 *     · The 2026 bands per filing status are the Reference tab's statutory table (IRS Rev. Proc. 2025-32 §4.01), checked by statutory_constants.test.ts.
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
 * Called by ... MK-CF-F-046 employerMatchAnnual · MK-CF-F-048 effectiveTaxRate
 *               MK-CF-F-181 rateInForce · MK-PL-F-067 willItLastInputs
 *
 * Reaches ..... 79 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-CF-F-202 TAX
 *               MK-NW-F-100 TREND · MK-CF-F-026 actualDebtPayment
 *               MK-CF-F-005 actualMonthFlow · MK-CF-F-012 annualCashflow
 *               … and 61 more — the full list is on functions_from_code
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

/** Which federal band does this person's last dollar fall in? */
/* ─ MK-CF-F-103 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * marginalBracketFor
 *
 * Answers ..... Which federal band does this person's last dollar fall in?
 *
 * Formula .....
 *     ti = taxable income for(gross, status, over65)
 *     the answer = the rate of the FIRST band whose top is ≥ ti, read in order from the table for the filing status (10% · 12% · 22% · 24% · 32% · 35% · 37%)
 *
 * Called by ... MK-CF-F-091 userCapGainsRates · MK-CF-O-001 basePay
 *               MK-CF-O-004 incomeSummary
 *
 * Reaches ..... 22 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-211 DEBTS · MK-CF-F-201 INCOME
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-210 annualOfSource
 *               MK-CF-O-001 basePay · MK-CF-F-036 buildDebtState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-041 getDebtState
 *               MK-CF-O-004 incomeSummary · MK-XS-F-029 monthlySavings
 *               MK-XS-F-032 snapshotFromOnboarding · MK-XS-F-028 surplusByMonth
 *               … and 4 more — the full list is on functions_from_code
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
/* ─ MK-CF-F-104 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
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
