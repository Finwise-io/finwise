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

/** Taxable income after the standard deduction. */
export function taxableIncome(gross: number): number {
  return Math.max(0, gross - STANDARD_DEDUCTION);
}

/** The marginal bracket rate (decimal) for an income (on taxable income, after deduction). */
export function marginalBracket(gross: number): number {
  const ti = taxableIncome(gross);
  for (const [upper, rate] of TAX_BRACKETS) if (ti <= upper) return rate;
  return TAX_BRACKETS[TAX_BRACKETS.length - 1][1];
}

/** Federal tax owed: progressive brackets applied to income after the standard deduction. */
export function taxOwed(gross: number): number {
  const ti = taxableIncome(gross);
  if (ti <= 0) return 0;
  let tax = 0, lower = 0;
  for (const [upper, rate] of TAX_BRACKETS) {
    if (ti <= lower) break;
    tax += (Math.min(ti, upper) - lower) * rate;
    lower = upper;
  }
  return tax;
}

/** Blended effective rate (total tax / gross). */
export function effectiveRateOnGross(gross: number): number {
  return gross > 0 ? taxOwed(gross) / gross : 0;
}

/** Invert the schedule: the gross income whose take-home equals `net` (bisection). */
export function grossFromNet(net: number): number {
  if (net <= 0) return 0;
  let lo = net, hi = net * 3;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (mid - taxOwed(mid) < net) lo = mid; else hi = mid;
  }
  return Math.round((lo + hi) / 2);
}

/** PRD F2#11 — progressive PER-MONTH tax: brackets fill as the year's taxable income accumulates
 *  month by month (Jan→Dec), so tax_m = taxOwed(cumulative through m) − taxOwed(cumulative through
 *  m−1). Telescoping guarantees Σ tax_m === taxOwed(annual) EXACTLY — the annual identity the
 *  sameness contract requires — while a bonus month visibly withholds at its higher bracket. */
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
export type FilingStatus = 'single' | 'married' | 'hoh';
export const TAX_TABLES: Record<FilingStatus, { brackets: [number, number][]; deduction: number; over65Add: number }> = {
  single: { brackets: TAX_BRACKETS, deduction: 16_100, over65Add: 2_050 },
  married: {
    brackets: [[24_800, 0.10], [100_800, 0.12], [211_400, 0.22], [403_550, 0.24], [512_450, 0.32], [768_700, 0.35], [Infinity, 0.37]],
    deduction: 32_200, over65Add: 1_650,
  },
  hoh: {
    brackets: [[17_700, 0.10], [67_450, 0.12], [105_700, 0.22], [201_775, 0.24], [256_225, 0.32], [640_600, 0.35], [Infinity, 0.37]],
    deduction: 24_150, over65Add: 2_050,
  },
};

/** The standard deduction with the age-65 additions (E8). `over65` = how many people on the
 *  return are 65 or older (0, 1, or 2 on a joint return). */
export function deductionFor(status: FilingStatus = 'single', over65 = 0): number {
  const t = TAX_TABLES[status];
  return t.deduction + Math.min(2, Math.max(0, over65)) * t.over65Add;
}

export function taxableIncomeFor(gross: number, status: FilingStatus = 'single', over65 = 0): number {
  return Math.max(0, gross - deductionFor(status, over65));
}

/** Federal tax owed under a filing status, plus an optional user-set FLAT state rate applied to
 *  TAXABLE income (E10) — states differ wildly, so one honest user-entered percent beats fifty
 *  guessed tables, and it never taxes the deduction. */
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

export function effectiveRateOnGrossFor(gross: number, status: FilingStatus = 'single', stateRate = 0, over65 = 0): number {
  return gross > 0 ? taxOwedFor(gross, status, stateRate, over65) / gross : 0;
}

export function marginalBracketFor(gross: number, status: FilingStatus = 'single', over65 = 0): number {
  const ti = taxableIncomeFor(gross, status, over65);
  for (const [upper, rate] of TAX_TABLES[status].brackets) if (ti <= upper) return rate;
  return 0.37;
}

// Long-term capital-gains brackets (0/15/20) by filing status, 2026 (taxable-income thresholds).
const LTCG: Record<FilingStatus, [number, number]> = {
  single: [49_450, 545_500],
  married: [98_900, 613_700],
  hoh: [66_200, 579_600],
};
/** The user's own long-term capital-gains rate, from their income + filing status (federal). */
export function ltcgRateFor(gross: number, status: FilingStatus = 'single', over65 = 0): number {
  const ti = taxableIncomeFor(gross, status, over65);
  const [zeroTop, fifteenTop] = LTCG[status];
  return ti <= zeroTop ? 0 : ti <= fifteenTop ? 0.15 : 0.20;
}
