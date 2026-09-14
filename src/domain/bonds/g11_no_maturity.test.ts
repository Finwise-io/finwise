/** G11 (founder, 2026-09-12): a missing maturity date is unknown, never "due now". */
import { yearsToMaturity, approxYTM, bondRateSensitivity } from './index';

const b = { face: 10_000, couponRate: 0.05, maturity: '', value: 9_800 };
const NOW = new Date(2026, 8, 12);

test('no date → no years, no yield, no rate sensitivity; the price stands as entered', () => {
  expect(yearsToMaturity('', NOW)).toBeNull();
  expect(yearsToMaturity('not a date', NOW)).toBeNull();
  expect(approxYTM(b, NOW)).toBeNull();
  expect(bondRateSensitivity(b, NOW)).toBeNull();
});

test('a real date still gives the years and the yield', () => {
  const dated = { ...b, maturity: '2032-09-12' };
  expect(yearsToMaturity(dated.maturity, NOW)).toBeCloseTo(6, 1);
  expect(approxYTM(dated, NOW)).not.toBeNull();
});
