/**
 * THE RATE IN FORCE — whose rate the app is using, and what it is a share of.
 *
 * Three answers, in order: what they TYPED off a payslip · what their own figures IMPLY, when they
 * told us what lands in the bank · our own ESTIMATE, federal income tax only.
 *
 * The second one is new. Until 2026-08-28 a person could tell the base-pay screen exactly what lands
 * in their bank and every other screen would still estimate it — $572/month apart on the founder's
 * own persona. Closing that exposed a second, quieter half: a payslip rate is a share of GROSS, and
 * the income grid applied it to gross-minus-the-401(k), which left $137/month.
 */
import { rateInForce, enteredLandsAnnual } from './tax-rate';
import { incomeMonthlyGrid, effectiveRate } from './onboarding';
import { basePay, entryFromWage } from '../../../MoneyKeel/functions/cashflow/base-pay';

const TOLD: any = { baseSalary: '7000', salaryFreq: 'monthly', c_401k: '800', landsTypical: '5000' };
const SILENT: any = { baseSalary: '7000', salaryFreq: 'monthly', c_401k: '800' };

test('THE LAW: what they typed beats everything', () => {
  const r = rateInForce({ ...TOLD, taxMode: 'manual', manualTaxRate: '24' });
  expect(r.source).toBe('typed');
  expect(r.mine).toBe(true);
  expect(r.rate).toBeCloseTo(0.24, 6);
  expect(r.label).toBe('your rate, 24%');
});

test('THE LAW: 0% is a real answer, not a missing one', () => {
  const r = rateInForce({ taxMode: 'manual', manualTaxRate: '0' } as any);
  expect(r.mine).toBe(true);
  expect(r.rate).toBe(0);
});

test('THE LAW: what they told us lands is their figure, not our guess', () => {
  const r = rateInForce(TOLD);
  expect(r.source).toBe('implied');
  expect(r.mine).toBe(true);
  // gross 84,000 less 401(k) 9,600 less what lands 60,000 = 14,400 out, of 84,000
  expect(r.rate).toBeCloseTo(14_400 / 84_000, 6);
});

test('THE LAW: one silence and the household figure is ours again', () => {
  const half: any = { ...TOLD, whoEarns: 'both',
                      partnerWage: { baseSalary: '4500', salaryFreq: 'monthly' } };   // no landsTypical
  expect(enteredLandsAnnual(half)).toBeNull();
  expect(rateInForce(half).source).toBe('estimated');
});

test('THE LAW: the calculated rate says it is ours, and what it covers', () => {
  const r = rateInForce(SILENT);
  expect(r.source).toBe('estimated');
  expect(r.mine).toBe(false);
  expect(r.covers).toMatch(/federal income tax only/);
  expect(r.label).toMatch(/^calculated, \d+%$/);
});

test('THE LAW: effectiveRate IS the rate in force — never a second opinion', () => {
  for (const op of [TOLD, SILENT, { ...TOLD, taxMode: 'manual', manualTaxRate: '31' }]) {
    expect(effectiveRate(op)).toBeCloseTo(rateInForce(op).rate, 9);
  }
});

// ── the agreement that started all this ────────────────────────────────────────────────────────
test('THE LAW: when they told us what lands, EVERY screen says the same number', () => {
  const cases: any[] = [
    { baseSalary: '7000', salaryFreq: 'monthly',  c_401k: '800', landsTypical: '5000' },
    { baseSalary: '7000', salaryFreq: 'monthly',  c_401k: '0',   landsTypical: '5200' },
    { baseSalary: '4500', salaryFreq: 'biweekly', c_401k: '400', landsTypical: '3300' },
    { baseSalary: '2000', salaryFreq: 'weekly',   c_401k: '100', landsTypical: '1500' },
  ];
  for (const op of cases) {
    const told = basePay({ earners: [{ name: 'You', entry: entryFromWage(op) }], profile: op }).landsInBank;
    const grid = incomeMonthlyGrid(op, 'available').reduce((t, g) => t + g.amount, 0) / 12;
    expect(grid).toBeCloseTo(told, 2);
  }
});

test('THE LAW: a rate of gross is applied to gross — the 401(k) does not shrink it', () => {
  // same wage, same take-home, different contribution: the tax the grid charges must not move
  const a: any = { baseSalary: '7000', salaryFreq: 'monthly', c_401k: '0',    taxMode: 'manual', manualTaxRate: '20' };
  const b: any = { ...a, c_401k: '1000' };
  const taxOf = (op: any) => incomeMonthlyGrid(op, 'gross')[0].amount - incomeMonthlyGrid(op, 'net')[0].amount;
  expect(taxOf(b)).toBeCloseTo(taxOf(a), 2);
});
