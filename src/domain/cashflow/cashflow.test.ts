import { cashflowYear, upcomingBills } from './index';
import type { OnboardingProfile } from '../onboardingProfile';

const NO_TAX: OnboardingProfile = { taxMode: 'manual', manualTaxRate: '0' };
const JAN = new Date(2026, 0, 1);   // pin "now" to January so slot index == calendar month - 1

describe('cashflow / bill calendar', () => {
  test('scholarship lands in its months; tuition due in its months; balance dips then recovers', () => {
    const op: OnboardingProfile = {
      ...NO_TAX,
      incomeSources: ['scholarship'],
      scholarships: [{ label: 'Aid', amount: '12000', freq: 'annual', months: [1, 8] }],   // $6k Jan, $6k Aug
      monthlySpending: '0',
      spendCats: [{ id: 'tuition', tier: 'critical', bucket: 'nonmonthly', amount: '10000', unit: 'dollar', months: [1, 8] }], // $5k Jan, $5k Aug
    };
    const cf = cashflowYear(op, 0, JAN);
    expect(cf.months[0].inflow).toBeCloseTo(6000, 0);   // Jan scholarship
    expect(cf.months[0].outflow).toBeCloseTo(5000, 0);  // Jan tuition
    expect(cf.months[7].inflow).toBeCloseTo(6000, 0);   // Aug scholarship
    expect(cf.months[1].inflow).toBe(0);                // Feb: nothing lands
    expect(cf.totalIn).toBeCloseTo(12000, 0);
    expect(cf.totalOut).toBeCloseTo(10000, 0);
    expect(cf.months[11].balance).toBeCloseTo(2000, 0); // ends +$2k for the year
  });

  test('flags short months when bills outrun cash on hand', () => {
    const op: OnboardingProfile = {
      ...NO_TAX,
      incomeSources: ['scholarship'],
      scholarships: [{ amount: '6000', freq: 'annual', months: [8] }],   // all aid in Aug
      monthlySpending: '0',
      spendCats: [{ id: 'rent', tier: 'critical', bucket: 'fixed', amount: '500', unit: 'dollar' }], // $500/mo rent
    };
    const cf = cashflowYear(op, 0);
    expect(cf.shortMonths.length).toBeGreaterThan(0);   // negative before Aug aid arrives
    expect(cf.lowestBalance).toBeLessThan(0);
  });

  test('per-month salary table drives cash flow (a $0 month shows no pay)', () => {
    const salaryByMonth = Array.from({ length: 12 }, (_, i) => (i === 0 ? '4000' : '1500'));   // Jan 4000, rest 1500
    const op: OnboardingProfile = { ...NO_TAX, salaryByMonth, salaryMode: 'gross', incomeSources: ['employment'], monthlySpending: '0' };
    const cf = cashflowYear(op, 0, JAN);
    expect(cf.months[0].inflow).toBeCloseTo(4000, 0);   // Jan
    expect(cf.months[1].inflow).toBeCloseTo(1500, 0);   // Feb
  });

  test('loan disbursement shows as cash in (per-occurrence in each chosen month)', () => {
    const op: OnboardingProfile = { ...NO_TAX, incomeSources: ['loans'], loans: [{ amount: '5000', months: [1, 8] }], monthlySpending: '0' };
    const cf = cashflowYear(op, 0, JAN);
    expect(cf.months[0].inflow).toBeCloseTo(5000, 0);
    expect(cf.months[7].inflow).toBeCloseTo(5000, 0);
    expect(cf.totalIn).toBeCloseTo(10000, 0);
  });

  test('rolling-from-now: a January award lands AFTER this September (real timeline)', () => {
    // "now" = June 2026. Two $7k scholarships (Sept + Jan) and $15k tuition due Sept.
    const op: OnboardingProfile = {
      ...NO_TAX,
      incomeSources: ['scholarship'],
      scholarships: [{ amount: '7000', freq: 'annual', months: [9] }, { amount: '7000', freq: 'annual', months: [1] }],
      monthlySpending: '0',
      spendCats: [{ id: 'tuition', tier: 'critical', bucket: 'nonmonthly', amount: '15000', unit: 'dollar', months: [9] }],
    };
    const cf = cashflowYear(op, 0, new Date(2026, 5, 1));   // June
    const sep = cf.months.findIndex((m) => m.label.startsWith('Sep'));
    const jan = cf.months.findIndex((m) => m.label.startsWith('Jan'));
    expect(jan).toBeGreaterThan(sep);                       // Jan 2027 comes AFTER Sept 2026
    expect(cf.months[sep].balance).toBeCloseTo(-8000, 0);   // Sept: +7k aid − 15k tuition = short $8k
    expect(cf.months[jan].label).toContain('’27');          // labelled as next year
    expect(cf.shortMonths.length).toBeGreaterThan(0);
  });
});

describe('day-level bill planner — "how much to ask, by when"', () => {
  const base: OnboardingProfile = {
    ...NO_TAX, incomeSources: ['employment', 'support'],
    baseSalary: '1000', salaryMode: 'gross', salaryFreq: 'monthly',
    supportMonthly: '400', monthlySpending: '0',
    spendCats: [
      { id: 'tuition', tier: 'critical', bucket: 'nonmonthly', amount: '15000', unit: 'dollar', months: [9], dueDay: 15 },
      { id: 'rent', tier: 'critical', bucket: 'fixed', amount: '700', unit: 'dollar' },
      { id: 'food', tier: 'critical', bucket: 'fixed', amount: '300', unit: 'dollar' },
    ],
  };
  const JUN = new Date(2026, 5, 1);

  test('aid that arrives AFTER the due date does not help — big shortfall', () => {
    const op: OnboardingProfile = { ...base, scholarships: [{ amount: '7000', freq: 'annual', months: [9], day: 20, year: '2026' }], loans: [{ amount: '5000', months: [9], day: 20, year: '2026' }] };
    const [t] = upcomingBills(op, 500, JUN);
    expect(t.dueDate).toBe('2026-09-15');
    expect(t.needByDate).toBe('2026-09-13');     // 2-day buffer
    expect(t.askByDate).toBe('2026-09-03');      // 10-day lead
    expect(t.shortfall).toBeGreaterThan(12000);  // $12k aid lands Sep 20 — not in time
    expect(t.coverSource).toBe('your family');
  });

  test('same aid arriving BEFORE the need-by date slashes the shortfall', () => {
    const op: OnboardingProfile = { ...base, scholarships: [{ amount: '7000', freq: 'annual', months: [9], day: 5, year: '2026' }], loans: [{ amount: '5000', months: [9], day: 5, year: '2026' }] };
    const [t] = upcomingBills(op, 500, JUN);
    expect(t.shortfall).toBeLessThan(2500);      // aid (Sep 5) is available by Sep 13
  });
});
