/** HOW OFTEN A BOND PAYS ITS INTEREST (2026-10-20, the lead's decision under DEC-3390; MK-XS-I-069 coupons_per_year).
 *
 *  DEC-3390 adds the interest built up since the last coupon to a bond's value for its yield to maturity, and estimates it
 *  when it was not entered. The estimate counts the days since the last payment date, the payment dates stepping back from
 *  the maturity date by 12 ÷ payments a year months. Not entered, it keeps the once-a-year assumption it has always made,
 *  and the screen's sentence stays his words.
 */
import { bondInfo, estimatedAccrued, accruedInterestCaveat, approxYTM } from './index';

const TODAY = new Date('2026-09-28T12:00:00');
const treasury = (extra: Record<string, unknown> = {}) => bondInfo({
  asset_id: 't', label: 'US Treasury 2029', kind: 'bond', tax_bucket: 'TAXABLE', target_return: 0,
  balance: 24_200, face_value: 25_000, coupon_rate: 0.045, maturity_date: '2029-09-30', ...extra,
} as any);

test('$25,000 face, 4.5%, maturing 30 Sep 2029, on 28 Sep 2026 — once a year: $25,000 × 4.5% × 363 ÷ 365 = $1,118.84 over 363 days (last paid 30 Sep 2025)', () => {
  const e = estimatedAccrued(treasury({ coupons_per_year: 1 }), TODAY)!;
  expect(e.days).toBe(363);
  expect(e.amount).toBeCloseTo((25_000 * 0.045 * 363) / 365, 9);
  expect(e.amount.toFixed(2)).toBe('1118.84');
});

test('$25,000 face, 4.5%, maturing 30 Sep 2029, on 28 Sep 2026 — twice a year: $25,000 × 4.5% ÷ 2 × 182 ÷ 184 = $556.39 over 182 days (last paid 30 Mar 2026)', () => {
  const e = estimatedAccrued(treasury({ coupons_per_year: 2 }), TODAY)!;
  expect(e.days).toBe(182);
  expect(e.amount).toBeCloseTo(((25_000 * 0.045) / 2) * 182 / 184, 9);
  expect(e.amount.toFixed(2)).toBe('556.39');
});

test('not entered: once a year, exactly as before — and BondInfo carries no frequency it was not given', () => {
  const none = treasury();
  expect('couponsPerYear' in none).toBe(false);
  expect(treasury({ coupons_per_year: 2 }).couponsPerYear).toBe(2);
  expect(estimatedAccrued(none, TODAY)).toEqual(estimatedAccrued(treasury({ coupons_per_year: 1 }), TODAY));
});

test('the sentence stays his words (DEC-3390), with the estimate and the days of the bond\'s own schedule', () => {
  expect(accruedInterestCaveat(treasury(), TODAY)).toBe(
    'Added estimated $1,119 in accrued interest to bond value at 4.5% coupon for 363 days to calculate YTM. If this is not accurate, enter actual accrued interest');
  expect(accruedInterestCaveat(treasury({ coupons_per_year: 2 }), TODAY)).toBe(
    'Added estimated $556 in accrued interest to bond value at 4.5% coupon for 182 days to calculate YTM. If this is not accurate, enter actual accrued interest');
});

// FIXED 2026-10-24 (NW-BONDS, under DEC-3390 and DEC-6625; the re-run of MK-NW-M-026): the full price read the half-year
// schedule while the price it was matched to still paid one whole $1,125 coupon a year — so in two days, on Sep 30, it paid
// $1,125 where a twice-a-year Treasury pays $562.50, and the yield read 6.56%. The test below held that as "a smaller full
// price, a higher yield"; it is kept, failing. Now a twice-a-year bond is priced on $562.50 every six months, its yield
// compounded twice a year (y ÷ 2 a half year), the way a Treasury quotes it.
test.failing('the app until 2026-10-24, pinned: twice a year read a HIGHER yield than once a year (6.56% against 5.69%) — no longer its answer', () => {
  const once = approxYTM(treasury(), TODAY)!;
  const twice = approxYTM(treasury({ coupons_per_year: 2 }), TODAY)!;
  expect(twice).toBeGreaterThan(once);
});

test('the yield to maturity is solved on the value plus that estimate: once a year $24,200 + $1,118.84 → 5.69%; twice a year $24,200 + $556.39 → 5.67%, on half coupons of $562.50 every six months', () => {
  const once = approxYTM(treasury(), TODAY)!;
  const twice = approxYTM(treasury({ coupons_per_year: 2 }), TODAY)!;
  expect(once).toBeCloseTo(0.05688, 5);                       // his DEC-3390 Treasury, unchanged
  // by hand, twice a year: payments of $562.50 at 2/365 of a year from today and every half year after, to Sep 30, 2029
  // (seven of them), and $25,000 then; the y at which Σ 562.50 ÷ (1 + y/2)^(2t) + 25,000 ÷ (1 + y/2)^(2 × (3 + 2/365))
  // equals the full price $24,756.39 — solved by halving here too, as the app does, from the arithmetic alone
  const full = 24_200 + ((25_000 * 0.045) / 2) * 182 / 184;
  const times = Array.from({ length: 7 }, (_, k) => 2 / 365 + 0.5 * k);
  const price = (y: number) => times.reduce((t, x) => t + 562.5 / (1 + y / 2) ** (2 * x), 0) + 25_000 / (1 + y / 2) ** (2 * times[6]);
  let lo = 0, hi = 1;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (price(mid) > full) lo = mid; else hi = mid; }
  expect(twice).toBeCloseTo(lo, 9);
  expect(+(twice * 100).toFixed(2)).toBe(5.67);
  // a smaller full price than once a year AND half its coupon two days away: the two nearly agree, as the same bond should
  expect(Math.abs(twice - once)).toBeLessThan(0.0005);
});

test('a payment date the month does not have is that month\'s last day: maturing 31 Mar 2030, twice a year, pays 30 Sep — on 1 Oct 2026, 1 day after it', () => {
  const b = treasury({ maturity_date: '2030-03-31', coupons_per_year: 2 });
  const e = estimatedAccrued(b, new Date('2026-10-01T12:00:00'))!;
  expect(e.days).toBe(1);
  // 30 Sep 2026 → 31 Mar 2027 is 182 days; one day of a half-year payment of $562.50
  expect(e.amount).toBeCloseTo(((25_000 * 0.045) / 2) * 1 / 182, 9);
});

test('a payment made today leaves nothing built up, either way (the account page\'s state E: Sep 30, 2030 bond on Sep 30, 2026)', () => {
  const e = (n: 1 | 2) => estimatedAccrued(treasury({ maturity_date: '2030-09-30', coupons_per_year: n }), new Date('2026-09-30T12:00:00'));
  expect(e(1)).toBeNull();
  expect(e(2)).toBeNull();
});
