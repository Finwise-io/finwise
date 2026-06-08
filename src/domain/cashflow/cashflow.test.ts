import { cashflowYear } from './index';

const NO_TAX = { taxMode: 'manual', manualTaxRate: '0' };

describe('cashflow / bill calendar', () => {
  test('scholarship lands in its months; tuition due in its months; balance dips then recovers', () => {
    const op = {
      ...NO_TAX,
      incomeSources: ['scholarship'],
      scholarships: [{ label: 'Aid', amount: '12000', freq: 'annual', months: [1, 8] }],   // $6k Jan, $6k Aug
      monthlySpending: '0',
      spendCats: [{ id: 'tuition', tier: 'critical', bucket: 'nonmonthly', amount: '10000', unit: 'dollar', months: [1, 8] }], // $5k Jan, $5k Aug
    };
    const cf = cashflowYear(op, 0);
    expect(cf.months[0].inflow).toBeCloseTo(6000, 0);   // Jan scholarship
    expect(cf.months[0].outflow).toBeCloseTo(5000, 0);  // Jan tuition
    expect(cf.months[7].inflow).toBeCloseTo(6000, 0);   // Aug scholarship
    expect(cf.months[1].inflow).toBe(0);                // Feb: nothing lands
    expect(cf.totalIn).toBeCloseTo(12000, 0);
    expect(cf.totalOut).toBeCloseTo(10000, 0);
    expect(cf.months[11].balance).toBeCloseTo(2000, 0); // ends +$2k for the year
  });

  test('flags short months when bills outrun cash on hand', () => {
    const op = {
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

  test('lean (slow-month) scenario drops earned income to the low figure', () => {
    const op = { ...NO_TAX, baseSalary: '4000', salaryMode: 'gross', salaryFreq: 'monthly', incomeSources: ['employment'], monthlySpending: '0', lowMonthly: '1500' };
    expect(cashflowYear(op, 0, undefined, false).months[0].inflow).toBeCloseTo(4000, 0);
    expect(cashflowYear(op, 0, undefined, true).months[0].inflow).toBeCloseTo(1500, 0);   // slow month
  });

  test('loan disbursement shows as cash in (per-occurrence in each chosen month)', () => {
    const op = { ...NO_TAX, incomeSources: ['loans'], loans: [{ amount: '5000', months: [1, 8] }], monthlySpending: '0' };
    const cf = cashflowYear(op, 0);
    expect(cf.months[0].inflow).toBeCloseTo(5000, 0);
    expect(cf.months[7].inflow).toBeCloseTo(5000, 0);
    expect(cf.totalIn).toBeCloseTo(10000, 0);
  });
});
