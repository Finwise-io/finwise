// Numeric helpers — every onboarding amount funnels through toNum, so its edge behavior IS the
// app's input tolerance.
import { toNum, round2 } from './num';

describe('toNum', () => {
  test('parses plain and formatted strings', () => {
    expect(toNum('1234')).toBe(1234);
    expect(toNum('1,234.56')).toBe(1234.56);
    expect(toNum('$2,500')).toBe(2500);
    expect(toNum(' 42 ')).toBe(42);
  });

  test('keeps negatives', () => {
    expect(toNum('-300')).toBe(-300);
  });

  test('numbers pass through', () => {
    expect(toNum(7.5)).toBe(7.5);
  });

  test('null / undefined / garbage → 0 (skipped onboarding answers are safe)', () => {
    expect(toNum(null)).toBe(0);
    expect(toNum(undefined)).toBe(0);
    expect(toNum('')).toBe(0);
    expect(toNum('abc')).toBe(0);
  });

  test('strips non-numeric noise rather than failing', () => {
    expect(toNum('about 1200 dollars')).toBe(1200);
  });
});

describe('round2', () => {
  test('classic float drift: 0.1 + 0.2', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });

  test('rounds half away from zero at 2dp (positive)', () => {
    expect(round2(1.005 * 100) / 100).toBeCloseTo(1.005, 3);
    expect(round2(2.345)).toBeCloseTo(2.35, 2);
  });

  test('negatives round symmetrically enough for money math', () => {
    expect(round2(-1.234)).toBe(-1.23);
  });

  test('idempotent: rounding twice changes nothing', () => {
    const v = round2(123.4567);
    expect(round2(v)).toBe(v);
  });
});
