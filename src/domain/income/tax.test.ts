
// ── TRACK 3 (founder brief 2026-08-20): E8 · E9 · E10, and the expiry gate ──
describe('the tax tables — dated, explicit, age-aware', () => {
  const { TAX_TABLES, TAX_YEAR, deductionFor, taxableIncomeFor, taxOwedFor, progressiveMonthlyTax } = require('./tax');

  test('EXPIRY GATE: this test FAILS the year the tables go stale — update them, then this line', () => {
    // The brief's rule: a statutory table carries its year, and the build refuses to coast past it.
    expect(new Date().getFullYear()).toBeLessThanOrEqual(TAX_YEAR);
  });

  test('E9: the married top threshold is the statute number, NOT double the single one', () => {
    const marriedTop = TAX_TABLES.married.brackets[5][0];
    const singleTop = TAX_TABLES.single.brackets[5][0];
    expect(marriedTop).toBe(768_700);
    expect(marriedTop).not.toBe(singleTop * 2);      // the doubling shortcut was wrong by ~$512k
  });

  test('E8: the over-65 additional deduction exists and counts per person', () => {
    expect(deductionFor('single', 0)).toBe(16_100);
    expect(deductionFor('single', 1)).toBe(16_100 + 2_050);
    expect(deductionFor('married', 2)).toBe(32_200 + 2 * 1_650);
    // and it flows into the tax: a 66-year-old owes less than a 60-year-old on the same income
    expect(taxOwedFor(60_000, 'single', 0, 1)).toBeLessThan(taxOwedFor(60_000, 'single', 0, 0));
  });

  test('E10: the state rate applies to TAXABLE income — the deduction is never taxed', () => {
    // gross $50,000, single: taxable = 33,900. At 5% state: 1,695 — not 2,500.
    const withState = taxOwedFor(50_000, 'single', 0.05);
    const federalOnly = taxOwedFor(50_000, 'single', 0);
    expect(Math.round(withState - federalOnly)).toBe(Math.round(taxableIncomeFor(50_000, 'single') * 0.05));
  });

  test('E10 monthly: the state part telescopes — twelve months sum to the annual state tax exactly', () => {
    const months = new Array(12).fill(5_000);        // $60k year
    const tax = progressiveMonthlyTax(months, 'single', 0.05);
    const annual = taxOwedFor(60_000, 'single', 0.05);
    expect(Math.abs(tax.reduce((t: number, m: number) => t + m, 0) - annual)).toBeLessThan(0.01);
  });
});
