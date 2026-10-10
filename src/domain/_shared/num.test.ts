// Numeric helpers — every onboarding amount funnels through toNum, so its edge behavior IS the
// app's input tolerance.
import { toNum, round2, rentFigure } from './num';

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

// DEC-3768c (founder, 2026-10-10): a rent figure is a number. One with words in it is not read — not entered,
// never the digits inside it.
describe('rentFigure — the one strict reader of a rent figure (DEC-3768c)', () => {
  test('a plain number is read, with a leading $, thousands commas and spaces allowed', () => {
    expect(rentFigure('2,000')).toBe(2000);
    expect(rentFigure('$2,000')).toBe(2000);
    expect(rentFigure('1,850.50')).toBe(1850.5);
    expect(rentFigure(' $ 1 200 ')).toBe(1200);
    expect(rentFigure(1800)).toBe(1800);
    expect(rentFigure('0')).toBe(0);
  });
  test('words or other text are not read — not entered, never $2', () => {
    for (const t of ['about 2k', '2k', 'n/a', '-50', '.', '2,000 a month']) expect(rentFigure(t)).toBeNull();
  });
  test('blank is not entered', () => {
    for (const t of ['', '   ', null, undefined, NaN]) expect(rentFigure(t)).toBeNull();
  });
});
