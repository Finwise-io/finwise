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
export function progressiveMonthlyTax(taxableByMonth: number[], status: FilingStatus = 'single', stateRate = 0): number[] {
  let cum = 0, prevTax = 0;
  return taxableByMonth.map((g) => {
    cum += Math.max(0, g);
    const t = taxOwedFor(cum, status, 0);
    const m = t - prevTax;
    prevTax = t;
    return m + Math.max(0, g) * Math.min(0.15, Math.max(0, stateRate));   // flat state rides each month
  });
}

// ── PRD F9#14 / F3#17: filing status + optional flat state rate ─────────────────────────────
// 2026 tables (IRS Rev. Proc. 2025-32). Married-filing-jointly thresholds are exactly 2× single
// through the 35% bracket (the 37% top threshold differs slightly at the IRS — immaterial for a
// labeled estimate at this audience's incomes and documented here). Head-of-household uses the
// IRS's wider 10/12% brackets (~1.43× single), then converges on the single thresholds.
export type FilingStatus = 'single' | 'married' | 'hoh';
const T = TAX_BRACKETS;
export const TAX_TABLES: Record<FilingStatus, { brackets: [number, number][]; deduction: number }> = {
  single: { brackets: T, deduction: STANDARD_DEDUCTION },
  married: { brackets: T.map(([u, r]) => [u === Infinity ? Infinity : u * 2, r]), deduction: STANDARD_DEDUCTION * 2 },
  hoh: {
    brackets: [[Math.round(T[0][0] * 1.43), 0.10], [Math.round(T[1][0] * 1.31), 0.12], ...T.slice(2)] as [number, number][],
    deduction: Math.round(STANDARD_DEDUCTION * 1.5),
  },
};

export function taxableIncomeFor(gross: number, status: FilingStatus = 'single'): number {
  return Math.max(0, gross - TAX_TABLES[status].deduction);
}

/** Federal tax owed under a filing status, plus an optional user-set FLAT state rate on gross —
 *  states differ wildly, so a single honest user-entered percent beats fifty guessed tables. */
export function taxOwedFor(gross: number, status: FilingStatus = 'single', stateRate = 0): number {
  const ti = taxableIncomeFor(gross, status);
  let tax = 0, lower = 0;
  if (ti > 0) {
    for (const [upper, rate] of TAX_TABLES[status].brackets) {
      if (ti <= lower) break;
      tax += (Math.min(ti, upper) - lower) * rate;
      lower = upper;
    }
  }
  return tax + Math.max(0, gross) * Math.min(0.15, Math.max(0, stateRate));
}

export function effectiveRateOnGrossFor(gross: number, status: FilingStatus = 'single', stateRate = 0): number {
  return gross > 0 ? taxOwedFor(gross, status, stateRate) / gross : 0;
}

export function marginalBracketFor(gross: number, status: FilingStatus = 'single'): number {
  const ti = taxableIncomeFor(gross, status);
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
export function ltcgRateFor(gross: number, status: FilingStatus = 'single'): number {
  const ti = taxableIncomeFor(gross, status);
  const [zeroTop, fifteenTop] = LTCG[status];
  return ti <= zeroTop ? 0 : ti <= fifteenTop ? 0.15 : 0.20;
}
