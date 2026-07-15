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
export function progressiveMonthlyTax(taxableByMonth: number[]): number[] {
  let cum = 0, prevTax = 0;
  return taxableByMonth.map((g) => {
    cum += Math.max(0, g);
    const t = taxOwed(cum);
    const m = t - prevTax;
    prevTax = t;
    return m;
  });
}
