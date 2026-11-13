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
 *     repeat 50 times: mid = (lo + hi) ÷ 2; if mid − tax owed for(mid, status, 0, over65) < net then lo = mid else hi = mid
 *     the answer = (lo + hi) ÷ 2   — the gross whose take-home equals net, found by halving the interval
 *
 * Called by ... MK-CF-F-186 convertTakeHomeMode · MK-CF-F-310 repairHourlyTakeHome
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-186 convertTakeHomeMode · MK-XS-F-199 profileOnTheWayIn
 *               MK-CF-F-310 repairHourlyTakeHome
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 * Ruled by .... DEC-0184
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
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

// MK-CF-F-098 progressiveMonthlyTax — RETIRED 2026-10-25 (FIX-TAX, outside audit part 16, MK-CF-F-098-C04). It filled the
// tax bands month by month as the year's income built up (PRD F2#11), so January read no tax and December the top band.
// His rulings since put ONE rate on every month — the one rate everywhere the take-home matters, cash flow and budget
// included (DEC-0196) — and the month grid reads that one rate (MK-CF-F-087 monthlyTaxRates). Its last caller, the stored
// income record (MK-CF-F-049 buildIncomeState), now reads the same one rate, so nothing should call it. It also clipped a
// month that lost money to $0: $73,111.17, −$13,111.43 and $3,111.19 read $7,938.92 of tax where the year's $63,110.93 owes
// $5,393.31. To reverse: restore the function from git (b1c659e8) and point buildIncomeState's months back at it.

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
  // HEAD OF HOUSEHOLD — IRS Rev. Proc. 2025-32 §4.01 TABLE 2, read from the IRS text on 2026-10-23: "Over $105,700 but
  // not over $201,750 … Over $201,750 but not over $256,200 … $39,207 plus 32% of the excess over $201,750". Its 24% and 32%
  // bands end $25 below the single filer's. Until 2026-10-23 this table copied the single filer's $201,775 and $256,225
  // (outside re-run of Performance, OpenAI, gap list item 35; DEC-0378: every figure set by law is typed from its source).
  hoh: {
    brackets: [[17_700, 0.10], [67_450, 0.12], [105_700, 0.22], [201_750, 0.24], [256_200, 0.32], [640_600, 0.35], [Infinity, 0.37]],
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
// THE 6% COMES OFF EACH PERSON'S $6,000, NOT OFF THE COUPLE'S $12,000 (read 2026-10-23). 26 U.S.C. §151(d)(5)(C)(iii)(I):
// "the $6,000 amount in clause (i) shall be reduced (but not below zero) by 6 percent of so much of the taxpayer's modified
// adjusted gross income as exceeds $75,000 ($150,000 in the case of a joint return)" — clause (i) is "$6,000 for each
// qualified individual". IRS Schedule 1-A (Form 1040) 2025, Part V: line 35 "Subtract line 34 from $6,000. If zero or less,
// enter -0-", entered once for you (36a) and once for your spouse (36b), and line 37 adds them. A joint return at $200,000
// with both 65 or over: each keeps $6,000 − 6% × $50,000 = $3,000, $6,000 in all, and nothing is left at $250,000. Until
// 2026-10-23 the 6% came off $12,000 once: $9,000 at $200,000, gone only at $350,000 (outside re-run, gap list item 36).
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
 *     each = max(0, $6,000 − 6% × max(0, magi − start))   start = $75,000 single / head of household · $150,000 married
 *     the answer = people × each
 *
 * Called by ... MK-CF-F-099 deductionFor · MK-PL-F-082 taxableIncomeSteps
 *
 * Reaches ..... 576 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 558 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Decides .....
 *     · Never lets over65 fall below 0.
 *     · Uses the published figures: $6,000 per person 65+, each person's $6,000 phased out at 6% above $75,000 ($150,000 joint), 2025–2028 (P.L. 119-21 §70103, IRC §151(d)(5)(C)(iii)(I); IRS Schedule 1-A (2025) Part V lines 35–37; checked 2026-10-23; lapses after 2028 — the statutory test fails when the tax year rolls past it).
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
  const excess = Math.max(0, magi - S.phaseOutStart[status]);
  const each = Math.max(0, S.amount - S.phaseOutRate * excess);   // each person's $6,000, reduced (IRC §151(d)(5)(C)(iii)(I))
  return people * each;
}


/** The amount of income that is free of tax before the brackets start: the standard deduction for the way the person files, plus the extra amounts for anyone 65 or older. */
/* ─ MK-CF-F-099 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * deductionFor
 *
 * Answers ..... The amount of income that is free of tax before the brackets start: the standard deduction for the way the person files, plus the extra amounts for anyone 65 or older.
 *
 * Formula .....
 *     t = TAX_TABLES[status]
 *     the answer = deduction + min(2, max(0, over65)) × over65 add + senior deduction for(status, over65, magi)
 *
 * Called by ... MK-CF-F-100 taxableIncomeFor · MK-PL-F-082 taxableIncomeSteps
 *
 * Reaches ..... 575 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 557 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Decides .....
 *     · Never lets over65 fall below 0.
 *     · 2026 standard deduction $16,100 single · $32,200 married · $16,100 filing separately · $24,150 head of household; 65+ add-on $2,050 single / head of household · $1,650 per person married (IRS Rev. Proc. 2025-32 §4.14).
 *     · Plus the senior deduction of MK-CF-F-187 — $6,000 per person 65+, each person's $6,000 phased out 6% above $75,000 / $150,000, tax years 2025–2028 (P.L. 119-21 §70103).
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
 * Called by ... MK-CF-F-101 taxOwedFor · MK-CF-F-103 marginalBracketFor
 *               MK-CF-F-104 ltcgRateFor · MK-CF-F-278 ltcgTaxOnGain
 *
 * Reaches ..... 574 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 556 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 * Ruled by .... DEC-0184
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
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
 * Called by ... MK-CF-F-097 grossFromNet · MK-CF-F-102 effectiveRateOnGrossFor
 *               MK-CF-F-144 takeHomeAsEntered · MK-CF-F-181 rateInForce
 *               MK-CF-F-240 PAY_LANDS_TYPED · MK-PL-F-032 rothConversionCost
 *
 * Reaches ..... 571 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 553 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 * Ruled by .... DEC-0184
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
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

/* ─ MK-CF-F-102 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * effectiveRateOnGrossFor
 *
 * Answers ..... What share of my income actually goes in tax?
 *
 * Formula .....
 *     tax owed for(gross, status, state rate, over65) ÷ gross   if gross > 0
 *     0   otherwise
 *
 * Called by ... MK-CF-F-049 buildIncomeState · MK-PL-F-067 willItLastInputs
 *
 * Reaches ..... 11 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-049 buildIncomeState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-186 convertTakeHomeMode · MK-CF-O-017 futurePaycheck
 *               MK-CF-F-052 getIncomeState · MK-CF-F-097 grossFromNet
 *               MK-XS-F-199 profileOnTheWayIn · MK-CF-F-310 repairHourlyTakeHome
 *               MK-PL-F-068 selectWillItLast · MK-XS-F-032 snapshotFromOnboarding
 *               MK-PL-F-067 willItLastInputs
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 * Ruled by .... DEC-0184
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
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
 * Called by ... MK-CF-O-001 basePay · MK-CF-O-004 incomeSummary
 *
 * Reaches ..... 568 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 550 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 * Ruled by .... DEC-0184
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
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
// SOURCE: IRS Rev. Proc. 2025-32 §4.03 (§1(h), §1(j)(5)), read from the IRS text 2026-10-23 — the maximum zero-rate and 15%-rate
// amounts: joint $98,900 / $613,700 · separate $49,450 / $306,850 · head of household $66,200 / $579,600 · all other
// individuals $49,450 / $545,500. Registered as LTCG in Calculation Module code/scripts/moneykeel_published_sources.json.
export const LTCG: Record<FilingStatus, [number, number]> = {
  single: [49_450, 545_500],
  married: [98_900, 613_700],
  // MFS: half the joint thresholds, the same statutory rule as the income bands above.
  mfs: [49_450, 306_850],
  hoh: [66_200, 579_600],
};
/** The rate on the NEXT dollar of long-term gain on top of this income + filing status (federal) — a marginal lookup; the tax on a gain of any size is ltcgTaxOnGain. */
/* ─ MK-CF-F-104 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * ltcgRateFor
 *
 * Answers ..... The rate on the NEXT dollar of long-term gain on top of this income + filing status (federal) — a marginal lookup; the tax on a gain of any size is ltcgTaxOnGain.
 *
 * Formula .....
 *     ti = taxable income for(gross, status, over65)
 *     the answer:
 *     0   if ti ≤ zero top
 *     0.15   if ti ≤ fifteen top
 *     0.20   otherwise   otherwise
 *
 * Called by ... MK-PL-F-089 drawAssumptionsSaid · MK-PL-F-091 drawAssumptionFigures
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-PL-F-091 drawAssumptionFigures · MK-PL-F-089 drawAssumptionsSaid
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Decides .....
 *     · The 2026 0% and 15% tops of taxable income are the published ones — IRS Rev. Proc. 2025-32 §4.03: $49,450 / $545,500 single · $98,900 / $613,700 married filing jointly · $49,450 / $306,850 married filing separately · $66,200 / $579,600 head of household; 20% above (register: LTCG, read 2026-10-23).
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-104
 * Changed ..... 2026-08-20 (764ca16)
 */
export function ltcgRateFor(gross: number, status: FilingStatus = 'single', over65 = 0): number {
  // A MARGINAL LOOKUP, LABELLED AS ONE (2026-10-25, outside audit part 16, MK-CF-F-104-C03/C04): the rate on the NEXT dollar
  // of gain on top of this income. It cannot price a gain of any size — a gain stacks on top of ordinary income and is sliced
  // across the 0/15/20 bands — so the tax on a gain is ltcgTaxOnGain below, never this rate × the gain.
  const ti = taxableIncomeFor(gross, status, over65);
  const [zeroTop, fifteenTop] = LTCG[status];
  return ti <= zeroTop ? 0 : ti <= fifteenTop ? 0.15 : 0.20;
}

/** What it is for: the federal tax on a long-term capital gain of any size. The gain stacks on top of the year's ordinary
 *  income and is cut across the 0%, 15% and 20% bands — the part that fits under the 0% top costs nothing, the part between
 *  the two tops 15%, the rest 20%.
 *
 *  THE IRS SCHEDULE D TAX WORKSHEET (lines 1–21 in short), with the 2026 tops of IRS Rev. Proc. 2025-32 §4.03 (LTCG above):
 *    taxable income  TI = taxableIncomeFor(ordinary + gain)   — the deduction comes off the whole income, gain included,
 *                                                               and the gain is counted in the income the senior deduction
 *                                                               phases out against (it is in modified adjusted gross income)
 *    gain taxed       G = min(gain, TI)                       — a deduction larger than the ordinary income shelters gain
 *    ordinary part    O = TI − G
 *    at 0%            Z = max(0, min(TI, zero top) − O)
 *    at 15%           F = min(G − Z, max(0, fifteen top − max(O, zero top)))
 *    at 20%           T = G − Z − F
 *    the answer       0.15 × F + 0.20 × T
 *  Worked: single, $48,111.17 of ordinary taxable income ($64,211.17 before the $16,100 deduction) and a $3,311.43 gain —
 *  $1,338.83 fits under the $49,450 top at 0%, $1,972.60 is taxed at 15%: $295.89. Joint, $611,111.17 taxable and a $7,311.43
 *  gain: $2,588.83 at 15% under the $613,700 top, $4,722.60 at 20%: $1,332.84. Federal only (DEC-0321, DEC-7935); full
 *  precision, rounded only where it is shown (DEC-0264). A gain of $0 or less costs $0. */
/* ─ MK-CF-F-278 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * ltcgTaxOnGain
 *
 * Answers ..... What it is for: the federal tax on a long-term capital gain of any size.
 *
 * Formula .....
 *     0   when not (gain > 0)
 *     ti = taxable income for(math.max(0, ordinary gross) + gain, status, over65)
 *     g = min(gain, ti)
 *     0   when g ≤ 0
 *     o = ti − g
 *     at zero = max(0, min(ti, zero top) − o)
 *     at fifteen = min(g − at zero, max(0, fifteen top − max(o, zero top)))
 *     at twenty = g − at zero − at fifteen
 *     the answer = 0.15 × at fifteen + 0.20 × at twenty
 *
 * Called by ... MK-PL-F-010 drawOrderOutcome
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-PL-F-010 drawOrderOutcome
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Decides .....
 *     · Never lets ordinary gross fall below 0.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-278
 * Changed ..... not in git yet (—)
 */
export function ltcgTaxOnGain(ordinaryGross: number, gain: number, status: FilingStatus = 'single', over65 = 0): number {
  if (!(gain > 0)) return 0;
  const ti = taxableIncomeFor(Math.max(0, ordinaryGross) + gain, status, over65);
  const g = Math.min(gain, ti);
  if (g <= 0) return 0;
  const o = ti - g;
  const [zeroTop, fifteenTop] = LTCG[status];
  const atZero = Math.max(0, Math.min(ti, zeroTop) - o);
  const atFifteen = Math.min(g - atZero, Math.max(0, fifteenTop - Math.max(o, zeroTop)));
  const atTwenty = g - atZero - atFifteen;
  return 0.15 * atFifteen + 0.20 * atTwenty;
}
