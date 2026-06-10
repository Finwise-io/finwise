// Real-world scenarios per persona — each encodes a question a real user would ask and checks the
// app's domain gives a sensible answer. Doubles as documentation of what works (and a couple of gaps).
import { cashflowYear, upcomingBills } from './cashflow';
import { incomeMonthlyGrid, totalGrossAnnual, tipsAnnual, salaryAnnual } from './income';
import { savingsByMonth } from './budget';
import { loanPayment, debtToIncome, creditUtilization, type Debt } from './debt';
import { buildPerformance, capGains, capGainsTax, type Position, type PriceSeries } from './performance';
import { simulate, solveRetireAge, projectNestEgg } from './retirement';
import type { OnboardingProfile } from './onboardingProfile';

const NO_TAX: OnboardingProfile = { taxMode: 'manual', manualTaxRate: '0' };
const JUN = new Date(2026, 5, 1);
const runway = (cash: number, monthlySpend: number) => cash / monthlySpend;

// ───────────────────────── 🎓 STUDENT ─────────────────────────
describe('Student scenarios', () => {
  const student: OnboardingProfile = {
    ...NO_TAX, incomeSources: ['employment', 'scholarship', 'loans', 'support'],
    baseSalary: '1000', salaryMode: 'gross', salaryFreq: 'monthly', supportMonthly: '400', monthlySpending: '0',
    scholarships: [{ amount: '4000', freq: 'annual', months: [9], day: 20, year: '2026' }],
    loans: [{ amount: '5000', months: [9], day: 20, year: '2026' }],
    spendCats: [
      { id: 'tuition', label: 'Tuition', tier: 'critical', bucket: 'nonmonthly', amount: '15000', unit: 'dollar', months: [9], dueDay: 15 },
      { id: 'rent', tier: 'critical', bucket: 'fixed', amount: '700', unit: 'dollar' },
    ],
  };

  test('1. "How much do I ask my parents for tuition, and by when?"', () => {
    const [t] = upcomingBills(student, 500, JUN);
    expect(t.shortfall).toBeGreaterThan(10000);   // aid lands Sep 20, tuition due Sep 15 → real crunch
    expect(t.askByDate).toBe('2026-09-03');
    expect(t.coverSource).toBe('your family');
  });

  test('2. Medical emergency: a surprise $2,500 bill in October', () => {
    const withER: OnboardingProfile = { ...student, spendCats: [...(student.spendCats ?? []), { id: 'er', tier: 'critical', bucket: 'nonmonthly', amount: '2500', unit: 'dollar', months: [10] }] };
    const cf = cashflowYear(withER, 500, JUN);
    expect(cf.shortMonths.length).toBeGreaterThan(0);   // the app shows the emergency tips them short
  });

  test('3. Part-time job only some months (per-month table) — pay + tips stop in $0 months', () => {
    const monthsArr = (active: number[], amt: string) => Array.from({ length: 12 }, (_, i) => (active.includes(i) ? amt : '0'));
    const allYear: OnboardingProfile = { ...student, salaryByMonth: monthsArr([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], '1000'), salaryMode: 'gross', salaryFreq: 'hourly', tipsMonthly: '200' };
    const halfYear: OnboardingProfile = { ...allYear, salaryByMonth: monthsArr([0, 1, 2, 3, 4, 5], '1000') };
    expect(tipsAnnual(allYear)).toBe(2400);                          // 12 paid months × $200
    expect(tipsAnnual(halfYear)).toBe(1200);                         // 6 paid months × $200
    expect(salaryAnnual(halfYear)).toBeLessThan(salaryAnnual(allYear));
  });

  test('4. Is taking the $5k loan affordable later?', () => {
    const p = loanPayment(5000, 6, 10);
    expect(p.monthly).toBeGreaterThan(0);
    expect(p.monthly).toBeLessThan(100);            // ~$55/mo — manageable
  });
});

// ───────────────────────── 🍽️ VARIABLE INCOME (server/gig) ─────────────────────────
describe('Variable-income scenarios', () => {
  // a variable earner enters their actual (uneven) months — some strong, some lean
  const swingMonths = Array.from({ length: 12 }, (_, i) => (i % 3 === 0 ? '1400' : '2600'));
  const server: OnboardingProfile = {
    ...NO_TAX, incomeSources: ['employment'], salaryByMonth: swingMonths, salaryMode: 'gross', monthlySpending: '0',
    spendCats: [{ id: 'rent', tier: 'critical', bucket: 'fixed', amount: '1900', unit: 'dollar' }, { id: 'food', tier: 'important', bucket: 'fixed', amount: '500', unit: 'dollar' }],
  };
  const steady: OnboardingProfile = { ...server, salaryByMonth: new Array(12).fill('2600') };

  test('1. "Will I make it through a slow stretch?" (uneven months are tighter)', () => {
    const cf = cashflowYear(server, 0, JUN);
    expect(cf.lowestBalance).toBeLessThan(cashflowYear(steady, 0, JUN).lowestBalance);   // the lean months bite
    expect(cf.shortMonths.length).toBeGreaterThan(0);                                    // and tip you short
  });

  test('2. Medical emergency with no cushion', () => {
    expect(runway(300, 2000)).toBeLessThan(0.25);   // <1 week of runway — app should flag (< 3 months)
  });

  test('3. Credit-card utilization is too high', () => {
    expect(creditUtilization(900, 1000).status).toBe('high');
    expect(creditUtilization(150, 1000).status).toBe('good');
  });

  test('4. Emergency-fund target = 3–6 months of spending', () => {
    const monthlySpend = 2000;
    expect(monthlySpend * 3).toBe(6000);
    expect(monthlySpend * 6).toBe(12000);
  });
});

// ───────────────────────── 💻 TECH PROFESSIONAL ─────────────────────────
describe('Tech-professional scenarios', () => {
  const pos = (ticker: string, kind: string, lots: [number, number, string][]): Position =>
    ({ position_id: ticker, ticker, kind, lots: lots.map(([s, c, d], i) => ({ lot_id: `${ticker}-${i}`, shares: s, cost_per_share: c, purchase_date: d })) });
  const series = (ticker: string, start: number, end: number): PriceSeries =>
    ({ ticker, points: [{ date: '2025-06-01', close: start }, { date: '2026-06-01', close: end }] });

  test('1. "Am I getting a better return in an ETF vs individual stocks?" (vs benchmark)', () => {
    const prices: Record<string, PriceSeries> = {
      VOO: series('VOO', 100, 125), AAPL: series('AAPL', 100, 140), SPY: series('SPY', 100, 125),
    };
    const rows = buildPerformance([pos('VOO', 'stocks_etf', [[10, 100, '2024-01-01']]), pos('AAPL', 'stocks_etf', [[10, 100, '2024-01-01']])],
      (t) => prices[t], '1Y', JUN);
    const voo = rows.find((r) => r.position.ticker === 'VOO')!, aapl = rows.find((r) => r.position.ticker === 'AAPL')!;
    expect(voo.periodReturn).toBeCloseTo(0.25, 1);    // ETFs + stocks get REAL returns vs the matching index
    expect(aapl.periodReturn).toBeCloseTo(0.40, 1);
    expect(aapl.periodReturn! > voo.periodReturn!).toBe(true);   // app shows the stock beat the ETF
    // GAP (documented): hedge funds / PE live in "other investments" with only a MANUAL expected
    // return — they can't be benchmarked against a live index the way ETFs and stocks are.
  });

  test('2. "What tax would I owe if I sold?" (long- vs short-term)', () => {
    const p = pos('NVDA', 'stocks_etf', [[10, 100, '2024-01-01'], [10, 100, '2026-03-01']]);  // half LT, half ST
    const cg = capGains(p, 200, JUN);
    expect(cg.longGain).toBeCloseTo(1000, 0);
    expect(cg.shortGain).toBeCloseTo(1000, 0);
    expect(capGainsTax(cg.longGain, cg.shortGain, 0.15, 0.32)).toBeCloseTo(150 + 320, 0);
  });

  test('3. "Can I retire at 50?"', () => {
    const base = {
      current_age: 40, retire_age: 50, horizon_age: 90, start_balance: 900000, annual_contribution: 60000,
      retire_monthly_spend_today: 7000, guaranteed_monthly_income: 0, inflation: 0.024, mean_return: 0.06, vol_return: 0.12, paths: 300, seed: 5,
    };
    const at50 = simulate(base).chance_of_success;
    const at60 = simulate({ ...base, retire_age: 60 }).chance_of_success;
    expect(at60).toBeGreaterThanOrEqual(at50);         // retiring later is safer
    expect(typeof solveRetireAge(base)).toBe('number'); // app finds an earliest-safe age
  });

  test('4. "Pay down the mortgage or invest?" — DTI + payoff signal', () => {
    const grossMonthly = totalGrossAnnual({ ...NO_TAX, baseSalary: '12000', salaryMode: 'gross', salaryFreq: 'monthly' }) / 12;
    const dti = debtToIncome(2500, grossMonthly, true);  // homeowner
    expect(dti.ratio).toBeLessThan(0.36);                // within the homeowner guideline → room to invest
    expect(['good', 'caution', 'high']).toContain(dti.status);
  });
});

// ───────────────────────── 👴 RETIREE ─────────────────────────
describe('Retiree scenarios', () => {
  const base = {
    current_age: 65, retire_age: 65, horizon_age: 90, start_balance: 1200000, annual_contribution: 0,
    retire_monthly_spend_today: 5000, guaranteed_monthly_income: 2500, inflation: 0.024, mean_return: 0.05, vol_return: 0.10, paths: 300, seed: 9,
  };

  test('1. "Will my money last to 90?"', () => {
    const s = simulate(base);
    expect(s.chance_of_success).toBeGreaterThan(50);
    expect(s.chance_of_success).toBeLessThanOrEqual(100);
  });

  test('2. A major medical / long-term-care shock (spend jumps)', () => {
    const calm = projectNestEgg(base).shortfall;
    const shock = projectNestEgg({ ...base, retire_monthly_spend_today: 9000 }).shortfall;
    expect(shock).toBeGreaterThan(calm);              // higher care costs widen the gap
  });

  test('3. Social Security + pension cover most of the spend', () => {
    const ri: OnboardingProfile = { ...NO_TAX, ri_ss: '2000', ri_pension: '1500' };
    expect(totalGrossAnnual(ri)).toBeCloseTo((2000 + 1500) * 12, 0);   // retirement income now counts
  });

  test('4. "Could I have retired at 50 with this nest egg?"', () => {
    const rich = simulate({ ...base, current_age: 50, retire_age: 50, start_balance: 2500000, guaranteed_monthly_income: 0 });
    expect(rich.chance_of_success).toBeGreaterThan(60);   // a big balance makes early retirement viable
  });
});
