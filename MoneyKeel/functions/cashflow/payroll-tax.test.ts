/** G4 (founder, 2026-09-12): the caveat under the federal-only take-home says how much the paycheck will
 *  also withhold — per earner, Social Security only up to the wage base. Never deducted from the estimate. */
import { payrollTaxWithheld, SS_WAGE_BASE, MEDICARE_ADDITIONAL_THRESHOLD } from './base-pay';

test('the mock household — $84,000 + $54,000 — is short by about $880 a month', () => {
  const yearly = payrollTaxWithheld(84_000) + payrollTaxWithheld(54_000);
  expect(yearly / 12).toBeCloseTo(879.75, 2);
});

test('a $250,000 wage: 6.2% stops at the wage base, 1.45% runs on, 0.9% more above $200,000', () => {
  expect(SS_WAGE_BASE).toBe(184_500);
  expect(MEDICARE_ADDITIONAL_THRESHOLD).toBe(200_000);
  expect(payrollTaxWithheld(250_000)).toBeCloseTo(184_500 * 0.062 + 250_000 * 0.0145 + 50_000 * 0.009, 6);   // $15,514 a year
  expect(payrollTaxWithheld(250_000) / 12).toBeCloseTo(1292.83, 2);
  // the old flat 7.65% would have said $1,593.75 — about $300 a month too high
  expect(250_000 * 0.0765 / 12 - payrollTaxWithheld(250_000) / 12).toBeGreaterThan(300);
});

test('nothing below zero', () => { expect(payrollTaxWithheld(-5)).toBe(0); });
