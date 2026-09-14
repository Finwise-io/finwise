// G30 — founder ruling brief Q-50 (2026-08-20), executed 2026-09-08: ONE dated inflation default, the
// 30-year average, adjustable by the person; no live feed feeds a calculation.
import { INFLATION_DEFAULT, inflationRateInForce } from '../domain/retirement/inflation';
import { willItLastInputs } from '../domain/retirement/willItLast';
import { snapshotFromOnboarding } from '../domain/snapshot';

test('the default is 2.5% a year, dated and sourced', () => {
  expect(INFLATION_DEFAULT.rate).toBe(0.025);
  expect(INFLATION_DEFAULT.source).toMatch(/Bureau of Labor Statistics/);
  expect(INFLATION_DEFAULT.checked).toBe('2026-09-08');
  expect(inflationRateInForce(null)).toEqual({ rate: 0.025, basis: 'default', label: '2.5% — the 30-year average of consumer prices (Bureau of Labor Statistics, CPI-U, 1996–2025)' });
  expect(inflationRateInForce(0.03)).toEqual({ rate: 0.03, basis: 'entered', label: 'you entered' });
});

const op: any = { status: 'employed', incomeSources: ['employment'], birthYear: String(new Date().getFullYear() - 55), baseSalary: '8000', salaryFreq: 'monthly', salaryMode: 'gross', monthlySpending: '4000', targetRetirementAge: '67', horizonAge: '92' };
const accounts: any = [{ asset_id: 'ira', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 300000 }];

test('the feed no longer reaches the odds: a fed rate of 9% is ignored, the person\'s own 3% is not', () => {
  const fed = willItLastInputs({ op, accounts, assumptions: {}, inflationRate: 9, employmentStatus: 'employed' } as any)!;
  expect(fed.inflation).toBe(0.025);
  const own = willItLastInputs({ op, accounts, assumptions: { inflation: 0.03 }, inflationRate: 9, employmentStatus: 'employed' } as any)!;
  expect(own.inflation).toBe(0.03);
});

test('the snapshot runs on the same default, whatever the feed says (was 2.4 here)', () => {
  const snap = snapshotFromOnboarding('u1', op, { inflationRate: 7.7, treasuryYield: 4.3 } as any);
  expect(snap.retirement.assumptions.inflation).toBe(0.025);
});
