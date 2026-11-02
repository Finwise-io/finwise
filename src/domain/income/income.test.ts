import {
  annualNet, grossAnnualBaseline,
  buildIncomeState, employerMatchAnnual,
} from './calc';
import * as CALC from './calc';
import { rateInForce } from './tax-rate';
import { incomeFromOnboarding, employerMatchMonthly, grossSalaryMonthly, rsuAnnual, incomeMonthlyGrid, extraIncome, salaryAnnual, totalGrossAnnual, taxableAnnual } from './onboarding';
import { grossFromNet, taxOwedFor, effectiveRateOnGrossFor } from './tax';
import { IncomeSource } from './types';
import type { OnboardingProfile } from '../onboardingProfile';

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
    expect(effectiveRateOnGrossFor(100000)).toBeCloseTo(0.1317, 4);
    expect(effectiveRateOnGrossFor(0)).toBe(0);
  });

  test('manual tax override wins (the stored record, read without a profile)', () => {
    // MK-CF-F-048 effectiveTaxRate is RETIRED (2026-10-25); the stored record keeps its own typed rate or the schedule's share
    expect((CALC as any).effectiveTaxRate).toBeUndefined();
    const src = [job({ gross_amount: 100000, frequency: 'ANNUAL' })];
    expect(buildIncomeState('u1', src, { use_manual_tax_override: true, manual_effective_tax_rate: 0.25 }).effective_tax_rate).toBe(0.25);
    expect(buildIncomeState('u1', src, { use_manual_tax_override: false, manual_effective_tax_rate: 0.25 }).effective_tax_rate)
      .toBeCloseTo(0.1317, 4);
  });

  test('read with the profile: the one rate (MK-CF-F-181) and the one take-home, after tax AND the 401(k) (MK-CF-F-049, 2026-10-25)', () => {
    // $5,000 a month, $500 into a 401(k), a 10% rate typed: $4,000 lands — it read $4,500 (gross × (1 − rate), no 401(k))
    const op: OnboardingProfile = { baseSalary: '5000', salaryFreq: 'monthly', c_401k: '500', taxMode: 'manual', manualTaxRate: '10' } as any;
    const doc = incomeFromOnboarding('u1', op);
    const st = buildIncomeState('u1', doc.sources, doc.tax, op);
    expect(st.effective_tax_rate).toBe(rateInForce(op).rate);
    expect(st.net_monthly_income).toBeCloseTo(4000, 6);
    expect(st.monthly_cash_flow_grid[0].gross).toBeCloseTo(5000, 6);
    expect(st.monthly_cash_flow_grid[0].net).toBeCloseTo(4000, 6);
    expect(st.total_net_annual).toBeCloseTo(st.monthly_cash_flow_grid.reduce((t, m) => t + m.net, 0), 6);   // months add to the year
    // married, 5% state, nothing typed: the rate in force's tax, $18,106.80 — it read $21,957.82, single and federal only
    const married: OnboardingProfile = { baseSalary: '11536.05', salaryFreq: 'monthly', filingStatus: 'married', stateTaxRate: '5' } as any;
    const m = buildIncomeState('u1', incomeFromOnboarding('u1', married).sources, incomeFromOnboarding('u1', married).tax, married);
    expect(m.total_gross_annual - m.total_net_annual).toBeCloseTo(18106.802, 6);
    expect(m.effective_tax_rate).toBeCloseTo(18106.802 / 138432.6, 12);
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
      // a signing bonus lands once, in the month its date names (2026-10-25, FIX-INCOME-B; landsOnce): January of this year
      signingDate: `${new Date().getFullYear()}-01`,
      taxMode: 'manual', manualTaxRate: '25',
    } as any);
    expect(doc.sources).toHaveLength(4);                                   // salary, bonus, rsu, signing
    // with no date it is in no year, so it is stored nowhere — "date not entered" (DEC-0447, DEC-7940)
    expect(incomeFromOnboarding('u1', { baseSalary: '6500', signingOnetime: '10000' } as any).sources.map((x) => x.label)).toEqual(['Base salary']);
    expect(doc.tax).toEqual({ use_manual_tax_override: true, manual_effective_tax_rate: 0.25 });
    const st = buildIncomeState('u1', doc.sources, doc.tax);
    // 6500×12 + 12000 + (50×400) + 10000 = 78000+12000+20000+10000
    expect(st.total_gross_annual).toBe(120000);
    expect(st.employer_match_annual).toBe(3000);                          // $250/month × 12
    const g = st.monthly_cash_flow_grid.map((c) => c.gross);
    expect(g[0]).toBeGreaterThan(g[1]);                                    // Jan carries the one-time signing bonus
    expect(g[11]).toBeGreaterThan(g[10]);                                  // Dec carries annual bonus + RSUs
  });

  test('employer match as a % of YOUR contribution resolves to $/month', () => {
    expect(employerMatchMonthly({ c_401k: '1000', employerMatchMode: 'pct', employerMatchValue: '50' }))
      .toBeCloseTo(500, 2);                                                // 50% match of $1,000/month contribution
  });

  test('RSUs sum across multiple grants (refreshers stack), with legacy single-grant fallback', () => {
    // each grant counts in the year its date names (2026-10-25, FIX-INCOME-B; DEC-0012) — two grants vesting this year
    const Y = new Date().getFullYear();
    const grantsThisYear = [{ shares: '100', price: '400', date: `${Y}-06` }, { shares: '50', price: '380', date: `${Y}-09` }];
    expect(rsuAnnual({ rsuGrants: grantsThisYear } as any))
      .toBe(100 * 400 + 50 * 380);                                   // 40,000 + 19,000 = 59,000
    expect(rsuAnnual({ rsuShares: '50', rsuPrice: '400' })).toBe(20000);  // falls back when no grants
    expect(rsuAnnual({})).toBe(0);
    // grants with no date answer nothing: "vest date not entered" (tenet 3, DEC-0296) — they were counted as this year's
    expect(rsuAnnual({ rsuGrants: [{ shares: '100', price: '400' }, { shares: '50', price: '380' }] })).toBeNull();
    const doc = incomeFromOnboarding('u1', { rsuGrants: grantsThisYear } as any);
    expect(doc.sources).toHaveLength(1);                             // one combined RSU source
    expect(doc.sources[0].gross_amount).toBe(59000);
  });

  test('rental nets operating expenses; system-calculated tax by default', () => {
    // the entry names its property: rent with no property is not counted (DEC-4059d, 2026-10-10)
    expect(incomeFromOnboarding('u1', { rentalIncome: '2000', rentalExpenses: '800', rentalType: 'long' }).sources).toHaveLength(0);
    expect(incomeFromOnboarding('u1', { rentals: [{ type: 'long', income: '2000', expenses: '800' }] }).sources).toHaveLength(0);
    const doc = incomeFromOnboarding('u1', { rentals: [{ type: 'long', income: '2000', expenses: '800', property_id: 'p1' }] });
    expect(doc.tax.use_manual_tax_override).toBe(false);
    expect(doc.sources[0].income_type).toBe('LONG_TERM_RENTAL');
    expect(buildIncomeState('u1', doc.sources, doc.tax).total_gross_annual).toBe((2000 - 800) * 12);
  });

  // build-34 #7: the Income manager maps these exact source labels → their editors. Pin the contract
  // so a rename can't silently make Equity / Rental / Self-employment uneditable again.
  test('source labels match the income-manager editor mapping', () => {
    const doc = incomeFromOnboarding('u1', {
      baseSalary: '100000', salaryFreq: 'annually',   // the app's word for a yearly salary (SALARY_PERIODS); 'annual' read as a month, $1.2M (2026-11-01)
      equityType: 'rsu', rsuGrants: [{ shares: '100', price: '400', date: `${new Date().getFullYear()}-06` }],   // a vest of this year (2026-10-25)
      rentals: [{ type: 'long', income: '2000', expenses: '500', property_id: 'p1' }],
      seAmount: '30000', seFreq: 'annual',
    } as any);
    const labels = doc.sources.map((s) => s.label);
    expect(labels).toEqual(expect.arrayContaining(['Base salary', 'Equity comp', 'Rental property', 'Self-employment']));
  });

  test('multiple rental properties each become a source, netting their own expenses', () => {
    const doc = incomeFromOnboarding('u1', { rentals: [
      { type: 'long', income: '2000', expenses: '800', property_id: 'p1' },
      { type: 'short', income: '3000', expenses: '1200', property_id: 'p2' },
    ] });
    expect(doc.sources).toHaveLength(2);
    expect(doc.sources.map((s) => s.income_type)).toEqual(['LONG_TERM_RENTAL', 'SHORT_TERM_RENTAL']);
    expect(buildIncomeState('u1', doc.sources, doc.tax).total_gross_annual)
      .toBe(((2000 - 800) + (3000 - 1200)) * 12);
  });

  test('monthly cash flow is lumpy: signing in Jan, bonus in Dec, equity on its vest month', () => {
    const op: OnboardingProfile = {
      baseSalary: '6000', salaryMode: 'gross', salaryFreq: 'monthly',
      bonusAnnual: '12000', signingOnetime: '10000', taxMode: 'manual', manualTaxRate: '0',
      // dated this year, and the shares sold when they vest so the vest is money (2026-10-25, FIX-INCOME-B: landsOnce; vestsAreCash)
      signingDate: `${new Date().getFullYear()}-01`, rsuSoldAtVest: 'yes',
      equityType: 'rsu', rsuGrants: [{ shares: '100', price: '400', date: `${new Date().getFullYear()}-03` }],  // $40k vests in March
    } as any;
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

  test('hourly annualizes by the entered hours/week, not a fixed 40', () => {
    const at20 = incomeMonthlyGrid({ baseSalary: '20', salaryMode: 'gross', salaryFreq: 'hourly', hoursPerWeek: '20', taxMode: 'manual', manualTaxRate: '0' }, 'gross');
    expect(at20[0].amount).toBeCloseTo(20 * 20 * 52 / 12, 2);     // $20/hr × 20 hrs/wk
    // HOURS A WEEK NOT ENTERED: NO NUMBER, NEVER A 40-HOUR WEEK (2026-10-26, FIX-INCOME-A; his DEC-0296, tenet 3) — it read
    // $20 × 40 × 52 ÷ 12 = $3,466.67 a month that nobody entered; the wage counts $0 until the hours are typed
    const blank = incomeMonthlyGrid({ baseSalary: '20', salaryMode: 'gross', salaryFreq: 'hourly', taxMode: 'manual', manualTaxRate: '0' }, 'gross');
    expect(blank[0].amount).toBe(0);
    const at40 = incomeMonthlyGrid({ baseSalary: '20', salaryMode: 'gross', salaryFreq: 'hourly', hoursPerWeek: '40', taxMode: 'manual', manualTaxRate: '0' }, 'gross');
    expect(at40[0].amount).toBeCloseTo(20 * 40 * 52 / 12, 2);     // forty hours, when forty are entered
  });
  test.failing('hourly · the app until 2026-10-26, pinned (no longer its answer): blank hours read as a 40-hour week', () => {
    const at40 = incomeMonthlyGrid({ baseSalary: '20', salaryMode: 'gross', salaryFreq: 'hourly', taxMode: 'manual', manualTaxRate: '0' }, 'gross');
    expect(at40[0].amount).toBeCloseTo(20 * 40 * 52 / 12, 2);
  });

  // per-month base-salary table — set $0 in months you're not paid
  const monthsArr = (active: number[], amt = '3000') => Array.from({ length: 12 }, (_, i) => (active.includes(i) ? amt : '0'));

  test('per-month table: salary only in the months you set (a gap = $0)', () => {
    const op: OnboardingProfile = { salaryByMonth: monthsArr([0, 1, 2, 3, 4, 5]), salaryMode: 'gross', taxMode: 'manual', manualTaxRate: '0' };  // Jan–Jun
    const g = incomeMonthlyGrid(op, 'gross');
    expect(g[5].amount).toBe(3000);   // Jun — paid
    expect(g[6].amount).toBe(0);      // Jul — $0 month
    expect(g[11].amount).toBe(0);     // Dec — $0
  });

  test('per-month table: arbitrary worked range + prorated annual', () => {
    const op: OnboardingProfile = { salaryByMonth: monthsArr([2, 3, 4, 5, 6, 7, 8]), salaryMode: 'gross', taxMode: 'manual', manualTaxRate: '0' };  // Mar–Sep
    const g = incomeMonthlyGrid(op, 'gross');
    expect(g[0].amount).toBe(0);    // Jan — $0
    expect(g[2].amount).toBe(3000); // Mar
    expect(g[8].amount).toBe(3000); // Sep
    expect(g[9].amount).toBe(0);    // Oct — $0
    expect(salaryAnnual(op)).toBe(3000 * 7);   // 7 paid months
  });

  // BUG-LEDGER: B-34 — IncomeState booked salary as max-month × 12, ignoring $0 gap months,
  // so total_gross_annual was inflated for anyone with uneven pay (and disagreed with
  // totalGrossAnnual / the bill calendar / tax organizer). Booking must equal the real table sum.
  test('B-34: gapped salary total equals the table sum, not max-month × 12', () => {
    const op: OnboardingProfile = { salaryByMonth: monthsArr([0, 1, 2, 3, 4, 5]), salaryMode: 'gross', taxMode: 'manual', manualTaxRate: '0' };  // 6 paid months @ 3000
    const st = buildIncomeState('u1', incomeFromOnboarding('u1', op).sources, { use_manual_tax_override: true, manual_effective_tax_rate: 0 });
    expect(st.total_gross_annual).toBe(3000 * 6);            // $18,000, NOT 3000×12
    expect(st.total_gross_annual).toBe(totalGrossAnnual(op)); // IncomeState agrees with the canonical total
  });

  test('B-34: tips on a gapped job count only in worked months', () => {
    const op: OnboardingProfile = {
      salaryByMonth: monthsArr([0, 1, 2, 3, 4, 5], '2000'), salaryMode: 'gross', tipsMonthly: '300',
      taxMode: 'manual', manualTaxRate: '0',
    };
    const st = buildIncomeState('u1', incomeFromOnboarding('u1', op).sources, { use_manual_tax_override: true, manual_effective_tax_rate: 0 });
    expect(st.total_gross_annual).toBe((2000 + 300) * 6);    // salary + tips, 6 worked months
    expect(st.total_gross_annual).toBe(totalGrossAnnual(op));
  });

  test('B-34: flat salary unaffected (regression guard)', () => {
    const op: OnboardingProfile = { baseSalary: '5000', salaryMode: 'gross', taxMode: 'manual', manualTaxRate: '0' };
    const st = buildIncomeState('u1', incomeFromOnboarding('u1', op).sources, { use_manual_tax_override: true, manual_effective_tax_rate: 0 });
    expect(st.total_gross_annual).toBe(60000);
  });

  test('multiple scholarships sum (non-taxable) into monthly income', () => {
    const op: OnboardingProfile = { scholarships: [{ label: 'Pell', amount: '6000', freq: 'annual' }, { label: 'Stipend', amount: '200', freq: 'monthly' }] };
    expect(extraIncome(op).nontaxMonthly).toBeCloseTo(6000 / 12 + 200, 2);   // 500 + 200 = 700
    // each scholarship becomes its own labeled source
    const labels = incomeFromOnboarding('u1', op).sources.filter((s) => s.income_type === 'SCHOLARSHIP').map((s) => s.label);
    expect(labels).toEqual(['Pell', 'Stipend']);
  });

  test('bonus lands in its chosen month (not always December)', () => {
    const op: OnboardingProfile = { baseSalary: '0', salaryMode: 'gross', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '0', bonusAnnual: '12000', bonusMonth: '6' };
    const g = incomeMonthlyGrid(op, 'gross');
    expect(g[5].amount).toBe(12000);   // June
    expect(g[11].amount).toBe(0);      // not December
  });

  test('retirement income (SS/pension/withdrawals) counts as monthly income', () => {
    const op: OnboardingProfile = { taxMode: 'manual', manualTaxRate: '0', ri_ss: '2000', ri_pension: '1500', ri_withdrawals: '500' };
    const g = incomeMonthlyGrid(op, 'gross');
    expect(g[3].amount).toBe(4000);                 // any month: SS + pension + withdrawals
    expect(g[3].amount).toBe(g[7].amount);          // steady every month
  });

  test('tips ride with the job — counted only in months you draw a salary', () => {
    const ongoing = incomeMonthlyGrid({ baseSalary: '2000', salaryMode: 'gross', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '0', tipsMonthly: '800' }, 'gross');
    expect(ongoing[0].amount).toBe(2800);           // wage + tips every month
    // per-month table with Jan–Mar only → April has no salary AND no tips
    const temp = incomeMonthlyGrid({ salaryByMonth: monthsArr([0, 1, 2], '2000'), salaryMode: 'gross', taxMode: 'manual', manualTaxRate: '0', tipsMonthly: '800' }, 'gross');
    expect(temp[1].amount).toBe(2800);              // Feb: paid → wage + tips
    expect(temp[3].amount).toBe(0);                 // Apr: $0 month → no wage, no tips
  });

  test('no income entered → no sources', () => {
    expect(incomeFromOnboarding('u1', {}).sources).toHaveLength(0);
  });

  test('take-home salary is grossed up via the IRS schedule (round-trips)', () => {
    const grossAnnual = grossFromNet(60_000);
    expect(grossAnnual).toBeGreaterThan(60_000);                 // gross exceeds take-home
    expect(grossAnnual - taxOwedFor(grossAnnual)).toBeCloseTo(60_000, -1);  // net ≈ entered take-home
    // The conversion happens once, on the way into the store — not on every read (build step 2).
    const { convertTakeHomeMode } = require('./take-home-mode-migration');
    const converted = convertTakeHomeMode({ baseSalary: '5000', salaryMode: 'takehome', salaryFreq: 'monthly' });
    expect(grossSalaryMonthly(converted as any) * 12).toBeCloseTo(grossAnnual, -1);
    // entering it as gross stores it as-is, and the conversion leaves it alone
    expect(grossSalaryMonthly({ baseSalary: '5000', salaryMode: 'gross' })).toBe(5000);
    expect(convertTakeHomeMode({ baseSalary: '5000', salaryMode: 'gross' }).baseSalary).toBe('5000');
  });
});

describe('benefit months (unemployment after a job ends)', () => {
  test('benefits land only in their chosen months; annual honors the count', () => {
    const op: OnboardingProfile = {
      taxMode: 'manual', manualTaxRate: '0',
      salaryByMonth: ['3000', '3000', '3000', '3000', '3000', '3000', '0', '0', '0', '0', '0', '0'],
      salaryMode: 'gross',
      benefitMonthly: '1800', benefitMonths: [7, 8, 9, 10, 11, 12],
    };
    const g = incomeMonthlyGrid(op, 'gross');
    expect(g[0].amount).toBe(3000);          // Jan: salary, no benefits yet
    expect(g[5].amount).toBe(3000);          // Jun: last salary month
    expect(g[6].amount).toBe(1800);          // Jul: unemployment starts, salary done
    expect(g[11].amount).toBe(1800);         // Dec: still on benefits
    expect(totalGrossAnnual(op)).toBe(3000 * 6 + 1800 * 6);
  });
  test('no months set = ongoing all year (back-compat)', () => {
    const op: OnboardingProfile = { taxMode: 'manual', manualTaxRate: '0', benefitMonthly: '500' };
    const g = incomeMonthlyGrid(op, 'gross');
    expect(g[0].amount).toBe(500);
    expect(g[11].amount).toBe(500);
    expect(totalGrossAnnual(op)).toBe(6000);
  });
});

describe('one-time other income: month placement + gift taxability', () => {
  const base: OnboardingProfile = {
    taxMode: 'manual', manualTaxRate: '20',
    baseSalary: '5000', salaryMode: 'gross', salaryFreq: 'monthly',
    // its year on record: a one-time payment with no year is counted in no year (2026-10-25, FIX-INCOME-B; DEC-0447, DEC-7940)
    otherAmount: '19000', otherFreq: 'onetime', otherMonth: 9, otherIncomeYear: new Date().getFullYear(),
  };
  test('with no year it is in no year, and no month — "year not entered"', () => {
    const noYear = { ...base, otherIncomeYear: undefined };
    expect(incomeMonthlyGrid({ ...noYear, manualTaxRate: '0' }, 'gross')[8].amount).toBe(5000);
    expect(taxableAnnual(noYear)).toBe(5000 * 12);
  });
  test('lands in ITS month, not January', () => {
    const g = incomeMonthlyGrid({ ...base, manualTaxRate: '0' }, 'gross');
    expect(g[0].amount).toBe(5000);            // Jan: salary only
    expect(g[8].amount).toBe(5000 + 19000);    // Sep: gift lands here
  });
  test('gift (otherTaxable=no) counts in gross but NOT in taxable income', () => {
    const gift: OnboardingProfile = { ...base, otherTaxable: 'no' };
    expect(totalGrossAnnual(gift)).toBe(5000 * 12 + 19000);
    expect(taxableAnnual(gift)).toBe(5000 * 12);             // gift excluded from the tax base
    expect(taxableAnnual(base)).toBe(5000 * 12 + 19000);     // default 'taxable' unchanged
    // net mode: gift lands untaxed even at 20% manual rate
    const g = incomeMonthlyGrid(gift, 'net');
    expect(g[8].amount).toBeCloseTo(5000 * 0.8 + 19000, 2);
  });
});

describe('future retirement income must not leak into CURRENT income', () => {
  test('an employed person entering future Social Security keeps today\'s income unchanged', () => {
    const working: OnboardingProfile = {
      taxMode: 'manual', manualTaxRate: '0', incomeSources: ['employment'],
      baseSalary: '5000', salaryMode: 'gross', salaryFreq: 'monthly',
      ri_ss: '3500',                                   // future SS from the outlook editor
    };
    expect(totalGrossAnnual(working)).toBe(60000);     // SS NOT counted today
    expect(incomeMonthlyGrid(working, 'gross')[0].amount).toBe(5000);
  });
  test('a retiree (retirement_income source, or legacy no-source flow) still counts it', () => {
    const retiree: OnboardingProfile = { taxMode: 'manual', manualTaxRate: '0', incomeSources: ['retirement_income'], ri_ss: '3500' };
    expect(totalGrossAnnual(retiree)).toBe(42000);
    const legacy: OnboardingProfile = { taxMode: 'manual', manualTaxRate: '0', ri_ss: '3500' };   // no source list
    expect(totalGrossAnnual(legacy)).toBe(42000);
  });
});

// Build-46 walk row 6 (audit PRD #4): $24,000/year vesting in March + September must land $12,000 in
// Mar and $12,000 in Sep on EVERY surface — the income function's year view used to park it all in
// December while the cash-flow grid placed it right, so a vesting user saw two different years.
describe('equity vesting months agree across the function (walk row 6)', () => {
  const yr = new Date().getFullYear();
  const op: any = {
    equityType: 'rsu', rsuSoldAtVest: 'yes',   // sold when they vest, so the vests are money in their months (2026-10-25)
    rsuGrants: [
      { date: `${yr}-03-15`, shares: 100, price: 120 },   // $12,000 in March
      { date: `${yr}-09-15`, shares: 100, price: 120 },   // $12,000 in September
    ],
  };

  test('the income-state grid lands the vests in Mar and Sep — December carries nothing', () => {
    const { incomeFromOnboarding, buildIncomeState } = require('./index');
    const doc = incomeFromOnboarding('u1', op);
    const st = buildIncomeState('u1', doc.sources, doc.tax);
    const grossByM = st.monthly_cash_flow_grid.map((c: any) => c.gross);
    expect(grossByM[2]).toBeCloseTo(12000, 0);   // March
    expect(grossByM[8]).toBeCloseTo(12000, 0);   // September
    expect(grossByM[11]).toBe(0);                // December — no phantom lump
  });

  test('…and matches the cash-flow grid month for month (one shared placement rule)', () => {
    const { incomeMonthlyGrid, incomeFromOnboarding, buildIncomeState } = require('./index');
    const grid = incomeMonthlyGrid(op, 'gross');
    const doc = incomeFromOnboarding('u1', op);
    const st = buildIncomeState('u1', doc.sources, doc.tax);
    for (let i = 0; i < 12; i++) expect(st.monthly_cash_flow_grid[i].gross).toBeCloseTo(grid[i].amount, 0);
  });
});
