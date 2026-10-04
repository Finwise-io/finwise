/**
 * THE TAKE-HOME MODE, CONVERTED ONCE — build step 2.
 *
 * `salaryMode: 'takehome'` let someone type the amount that reaches their bank, and the app inverted
 * the tax schedule on EVERY READ to find a gross that would produce it: a guess laid on an estimate,
 * re-run forever. The approved screen asks for gross AND what lands as two figures that reconcile,
 * so the branch is gone — but a profile saved before today still carries the mode, and reading that
 * number as gross would overstate someone's income by their whole tax bill.
 */
import { convertTakeHomeMode, needsTakeHomeConversion } from './take-home-mode-migration';
import { salaryAnnual, grossSalaryMonthly } from './onboarding';
import { taxOwedFor } from './tax';

test('THE LAW: what they typed becomes what LANDS — it is never read as gross', () => {
  const out: any = convertTakeHomeMode({ baseSalary: '5000', salaryMode: 'takehome', salaryFreq: 'monthly' } as any);
  expect(out.landsTypical).toBe('5000');
  expect(Number(out.baseSalary)).toBeGreaterThan(5_000);
  expect(out.salaryMode).toBe('gross');
});

test('THE LAW: the gross it works back still nets to what they typed', () => {
  const out = convertTakeHomeMode({ baseSalary: '5000', salaryMode: 'takehome', salaryFreq: 'monthly' });
  const gross = salaryAnnual(out as any);
  expect(gross - taxOwedFor(gross, 'single')).toBeCloseTo(60_000, -1);
});

test('THE LAW: converting twice changes nothing', () => {
  const once = convertTakeHomeMode({ baseSalary: '5000', salaryMode: 'takehome', salaryFreq: 'monthly' });
  expect(convertTakeHomeMode(once)).toEqual(once);
  expect(needsTakeHomeConversion(once as any)).toBe(false);
});

test('THE LAW: a gross entry is never touched', () => {
  const gross: any = { baseSalary: '5000', salaryMode: 'gross', salaryFreq: 'monthly' };
  expect(convertTakeHomeMode(gross)).toEqual(gross);
  expect(grossSalaryMonthly(gross)).toBe(5_000);
});

test('THE LAW: every pay frequency converts on its own period', () => {
  for (const [freq, periods] of [['monthly', 12], ['biweekly', 26], ['weekly', 52]] as [string, number][]) {
    const out = convertTakeHomeMode({ baseSalary: '2000', salaryMode: 'takehome', salaryFreq: freq });
    const gross = Number(out.baseSalary) * periods;
    expect(gross - taxOwedFor(gross, 'single')).toBeCloseTo(2_000 * periods, -1);
  }
});

test('THE LAW: what they typed is kept as the MONTH every screen now asks for', () => {
  // $1,500 a fortnight, typed the old way, is $3,250 a month
  const out: any = convertTakeHomeMode({ baseSalary: '1500', salaryMode: 'takehome', salaryFreq: 'biweekly' });
  expect(Number(out.landsTypical)).toBeCloseTo((1500 * 26) / 12, 6);
});

test('nothing to convert when there is no salary', () => {
  expect(needsTakeHomeConversion({ salaryMode: 'takehome' } as any)).toBe(false);
  expect(needsTakeHomeConversion({} as any)).toBe(false);
});
