/**
 * THE TAX BAND — MK-CF-M-029, produced once by MK-CF-F-090 effectiveRate.
 *
 * A band is set by everything the household is taxed on TOGETHER, at the status they file under.
 * Three things had to be true for that, and each was false until 2026-08-27:
 *   · both wages had to reach the total   — B32, closed by the earners block
 *   · the filing status had to be real     — B31, closed by asking, and by the pre-answer
 *   · one function had to compute it         — closed when the second, single-filer-only one was deleted
 *
 * These are laws, not examples: they must hold for every household, not the one that was tried.
 */
import { taxableAnnual, salaryAnnual, effectiveRate, filingStatusOf, over65CountOf } from './onboarding';
import { marginalBracketFor, taxOwedFor } from './tax';

const ME:  any = { baseSalary: '7000', salaryFreq: 'monthly' };   // $84,000
const SAM: any = { baseSalary: '4500', salaryFreq: 'monthly' };   // $54,000
const band = (op: any) => marginalBracketFor(taxableAnnual(op), filingStatusOf(op), over65CountOf(op));

test('THE LAW: the band is read from every source, not from the wage', () => {
  const wagesOnly = { ...ME, hasPartner: 'yes', whoEarns: 'both', partnerWage: SAM };
  const andMore   = { ...wagesOnly, bonusAnnual: '40000' };
  expect(taxableAnnual(wagesOnly)).toBeCloseTo(salaryAnnual(wagesOnly), 0);
  expect(taxableAnnual(andMore)).toBeCloseTo(taxableAnnual(wagesOnly) + 40_000, 0);
  expect(band(andMore)).toBeGreaterThanOrEqual(band(wagesOnly));
});

test('THE LAW: a second wage counts — the household was read as one person before', () => {
  const alone  = { ...ME };
  const couple = { ...ME, hasPartner: 'yes', whoEarns: 'both', partnerWage: SAM };
  expect(salaryAnnual(alone)).toBeCloseTo(84_000, 0);
  expect(salaryAnnual(couple)).toBeCloseTo(138_000, 0);
  expect(taxableAnnual(couple)).toBeGreaterThan(taxableAnnual(alone));
});

test('THE LAW: a spouse means jointly until they say otherwise — never single by default', () => {
  expect(filingStatusOf({ ...ME } as any)).toBe('single');
  expect(filingStatusOf({ ...ME, hasPartner: 'yes' } as any)).toBe('married');
  // and their own answer always wins over the guess
  expect(filingStatusOf({ ...ME, hasPartner: 'yes', filingStatus: 'mfs' } as any)).toBe('mfs');
});

test('THE LAW: filing jointly is never worse than filing single, on the same income', () => {
  for (const gross of [40_000, 84_000, 138_000, 260_000, 700_000]) {
    expect(taxOwedFor(gross, 'married')).toBeLessThanOrEqual(taxOwedFor(gross, 'single'));
    // and separately is exactly half the joint bands — the statutory rule
    expect(taxOwedFor(gross, 'mfs')).toBeGreaterThanOrEqual(taxOwedFor(gross, 'married') / 2 - 1);
  }
});

test('THE LAW: being 65 or older never raises the tax bill, and a couple can be two', () => {
  const couple: any = { ...ME, hasPartner: 'yes', whoEarns: 'both', partnerWage: SAM, filingStatus: 'married' };
  expect(over65CountOf({ ...couple, over65Who: 'neither' })).toBe(0);
  expect(over65CountOf({ ...couple, over65Who: 'me' })).toBe(1);
  expect(over65CountOf({ ...couple, over65Who: 'both' })).toBe(2);
  const g = taxableAnnual(couple);
  expect(taxOwedFor(g, 'married', 0, 2)).toBeLessThan(taxOwedFor(g, 'married', 0, 0));
});

test('THE LAW: one function — the rate on screen is the rate the brackets give', () => {
  const couple: any = { ...ME, hasPartner: 'yes', whoEarns: 'both', partnerWage: SAM };
  const g = taxableAnnual(couple);
  expect(effectiveRate(couple)).toBeCloseTo(taxOwedFor(g, filingStatusOf(couple), 0, over65CountOf(couple)) / g, 6);
});

test('THE LAW: a rate the person typed themselves always wins', () => {
  const manual: any = { ...ME, taxMode: 'manual', manualTaxRate: '18' };
  expect(effectiveRate(manual)).toBeCloseTo(0.18, 6);
});
