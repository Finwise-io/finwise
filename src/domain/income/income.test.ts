import {
  annualNet, grossAnnualBaseline, estimateEffectiveTaxRate, effectiveTaxRate,
  buildIncomeState, employerMatchAnnual,
} from './calc';
import { incomeFromOnboarding, employerMatchMonthly, grossSalaryMonthly, rsuAnnual, incomeMonthlyGrid } from './onboarding';
import { grossFromNet, taxOwed } from './tax';
import { IncomeSource } from './types';

const job = (over: Partial<IncomeSource> = {}): IncomeSource => ({
  income_source_id: 'i1', income_type: 'W2_JOB', gross_amount: 5000,
  frequency: 'MONTHLY', operating_expenses: 0, ...over,
});

describe('income calc', () => {
  test('annualNet: job annualizes gross; rental nets operating expenses', () => {
    expect(annualNet(job({ gross_amount: 5000, frequency: 'MONTHLY' }))).toBe(60000);
    expect(annualNet(job({ income_type: 'LONG_TERM_RENTAL', gross_amount: 2000, operating_expenses: 800, frequency: 'MONTHLY' })))
      .toBe((2000 - 800) * 12);
  });

  test('grossAnnualBaseline sums all sources', () => {
    expect(grossAnnualBaseline([
      job({ gross_amount: 5000, frequency: 'MONTHLY' }),
      job({ income_type: 'OTHER', gross_amount: 10000, frequency: 'ANNUAL' }),
    ])).toBe(70000);
  });

  test('progressive tax estimate (single filer, federal)', () => {
    expect(estimateEffectiveTaxRate(100000)).toBeCloseTo(0.1317, 4);
    expect(estimateEffectiveTaxRate(0)).toBe(0);
  });

  test('manual tax override wins', () => {
    expect(effectiveTaxRate(100000, { use_manual_tax_override: true, manual_effective_tax_rate: 0.25 })).toBe(0.25);
    expect(effectiveTaxRate(100000, { use_manual_tax_override: false, manual_effective_tax_rate: 0.25 }))
      .toBeCloseTo(0.1317, 4);
  });

  test('buildIncomeState: totals, smoothed monthly, full grid', () => {
    const st = buildIncomeState('u1', [job({ gross_amount: 5000, frequency: 'MONTHLY' })],
      { use_manual_tax_override: false, manual_effective_tax_rate: null });
    expect(st.total_gross_annual).toBe(60000);
    expect(st.monthly_cash_flow_grid).toHaveLength(12);
    expect(st.monthly_cash_flow_grid[0].gross).toBe(5000);
    expect(st.net_monthly_income).toBeCloseTo(st.total_net_annual / 12, 2);
  });

  test('quarterly income lands on Mar/Jun/Sep/Dec only', () => {
    const st = buildIncomeState('u1', [job({ gross_amount: 9000, frequency: 'QUARTERLY' })],
      { use_manual_tax_override: true, manual_effective_tax_rate: 0 });
    const g = st.monthly_cash_flow_grid.map((c) => c.gross);
    expect(g[2]).toBe(9000); expect(g[5]).toBe(9000); expect(g[8]).toBe(9000); expect(g[11]).toBe(9000);
    expect(g[0]).toBe(0); expect(g[1]).toBe(0);
  });

  test('employer match annualizes correctly regardless of source frequency', () => {
    expect(employerMatchAnnual([job({ frequency: 'MONTHLY', employer_match_amount: 250 })])).toBe(3000);
  });
});

describe('income from onboarding (full job inflows + rental + tax config)', () => {
  test('salary/bonus/RSU(shares×price)/signing + manual tax + $ employer match', () => {
    const doc = incomeFromOnboarding('u1', {
      baseSalary: '6500', employerMatchMode: 'dollar', employerMatchValue: '250',
      bonusAnnual: '12000', rsuShares: '50', rsuPrice: '400', signingOnetime: '10000',
      taxMode: 'manual', manualTaxRate: '25',
    });
    expect(doc.sources).toHaveLength(4);                                   // salary, bonus, rsu, signing
    expect(doc.tax).toEqual({ use_manual_tax_override: true, manual_effective_tax_rate: 0.25 });
    const st = buildIncomeState('u1', doc.sources, doc.tax);
    // 6500×12 + 12000 + (50×400) + 10000 = 78000+12000+20000+10000
    expect(st.total_gross_annual).toBe(120000);
    expect(st.employer_match_annual).toBe(3000);                          // $250/mo × 12
    const g = st.monthly_cash_flow_grid.map((c) => c.gross);
    expect(g[0]).toBeGreaterThan(g[1]);                                    // Jan carries the one-time signing bonus
    expect(g[11]).toBeGreaterThan(g[10]);                                  // Dec carries annual bonus + RSUs
  });

  test('employer match as a % of YOUR contribution resolves to $/month', () => {
    expect(employerMatchMonthly({ c_401k: '1000', employerMatchMode: 'pct', employerMatchValue: '50' }))
      .toBeCloseTo(500, 2);                                                // 50% match of $1,000/mo contribution
  });

  test('RSUs sum across multiple grants (refreshers stack), with legacy single-grant fallback', () => {
    expect(rsuAnnual({ rsuGrants: [{ shares: '100', price: '400' }, { shares: '50', price: '380' }] }))
      .toBe(100 * 400 + 50 * 380);                                   // 40,000 + 19,000 = 59,000
    expect(rsuAnnual({ rsuShares: '50', rsuPrice: '400' })).toBe(20000);  // falls back when no grants
    expect(rsuAnnual({})).toBe(0);
    const doc = incomeFromOnboarding('u1', { rsuGrants: [{ shares: '100', price: '400' }, { shares: '50', price: '380' }] });
    expect(doc.sources).toHaveLength(1);                             // one combined RSU source
    expect(doc.sources[0].gross_amount).toBe(59000);
  });

  test('rental nets operating expenses; system-calculated tax by default', () => {
    const doc = incomeFromOnboarding('u1', { rentalIncome: '2000', rentalExpenses: '800', rentalType: 'long' });
    expect(doc.tax.use_manual_tax_override).toBe(false);
    expect(doc.sources[0].income_type).toBe('LONG_TERM_RENTAL');
    expect(buildIncomeState('u1', doc.sources, doc.tax).total_gross_annual).toBe((2000 - 800) * 12);
  });

  test('multiple rental properties each become a source, netting their own expenses', () => {
    const doc = incomeFromOnboarding('u1', { rentals: [
      { type: 'long', income: '2000', expenses: '800' },
      { type: 'short', income: '3000', expenses: '1200' },
    ] });
    expect(doc.sources).toHaveLength(2);
    expect(doc.sources.map((s) => s.income_type)).toEqual(['LONG_TERM_RENTAL', 'SHORT_TERM_RENTAL']);
    expect(buildIncomeState('u1', doc.sources, doc.tax).total_gross_annual)
      .toBe(((2000 - 800) + (3000 - 1200)) * 12);
  });

  test('monthly cash flow is lumpy: signing in Jan, bonus in Dec, equity on its vest month', () => {
    const op = {
      baseSalary: '6000', salaryMode: 'gross', salaryFreq: 'monthly',
      bonusAnnual: '12000', signingOnetime: '10000', taxMode: 'manual', manualTaxRate: '0',
      equityType: 'rsu', rsuGrants: [{ shares: '100', price: '400', date: '2026-03' }],  // $40k vests in March
    };
    const g = incomeMonthlyGrid(op, 'gross');
    expect(g).toHaveLength(12);
    expect(g[0].amount).toBe(6000 + 10000);          // Jan: salary + signing
    expect(g[2].amount).toBe(6000 + 40000);          // Mar: salary + equity vest
    expect(g[11].amount).toBe(6000 + 12000);         // Dec: salary + bonus
    expect(g[1].amount).toBe(6000);                  // Feb: just salary
    // available subtracts the monthly 401(k)
    const avail = incomeMonthlyGrid({ ...op, c_401k: '500' }, 'available');
    expect(avail[1].amount).toBe(6000 - 500);        // Feb, 0% tax: salary − 401k
  });

  test('no income entered → no sources', () => {
    expect(incomeFromOnboarding('u1', {}).sources).toHaveLength(0);
  });

  test('take-home salary is grossed up via the IRS schedule (round-trips)', () => {
    const grossAnnual = grossFromNet(60_000);
    expect(grossAnnual).toBeGreaterThan(60_000);                 // gross exceeds take-home
    expect(grossAnnual - taxOwed(grossAnnual)).toBeCloseTo(60_000, -1);  // net ≈ entered take-home
    // mapping: entering $5,000/mo as take-home stores a higher gross salary
    expect(grossSalaryMonthly({ baseSalary: '5000', salaryMode: 'takehome' }) * 12).toBeCloseTo(grossAnnual, -1);
    // entering it as gross stores it as-is
    expect(grossSalaryMonthly({ baseSalary: '5000', salaryMode: 'gross' })).toBe(5000);
  });
});
