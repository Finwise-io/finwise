// DEC-3837 (2026-10-10), his words: "Interest rate % is the coupon, and yield to maturity could be
// different from coupon/interest rate % for CD bought in secondary market. … #4 - yes".
// A CD bought from the bank yields its rate; a CD bought through a broker is priced like a bond.
import { bondInfo, approxYTM, bondRateSensitivity, accruedInterestCaveat, estimatedAccrued, pricedLikeBond } from './index';
import { theBonds } from '../../../MoneyKeel/functions/networth-and-performance/bonds';

const cd = (extra: any) => ({ asset_id: 'cd1', label: 'Schwab CD', kind: 'cd', asset_class: 'bonds', tax_bucket: 'TAXABLE',
  target_return: 0.042, balance: 10_000, face_value: 10_000, coupon_rate: 0.042, maturity_date: '2028-10-10', ...extra } as any);
const ON_COUPON_DAY = new Date(2026, 9, 10);      // exactly two years before 2028-10-10
const MID_YEAR = new Date(2027, 3, 10);           // half-way between coupons

describe('DEC-3837 · where a CD was bought', () => {
  test('not answered reads as bought from the bank (today’s behaviour)', () => {
    expect(bondInfo(cd({})).cdBought).toBe('bank');
    expect(pricedLikeBond(bondInfo(cd({})))).toBe(false);
    expect(pricedLikeBond(bondInfo(cd({ cd_bought: 'broker' })))).toBe(true);
    expect(pricedLikeBond(bondInfo({ ...cd({}), label: 'US Treasury', kind: 'bond' }))).toBe(true);   // a bond always is
  });

  test('a bank CD: $10,000 at 4.2% → yield to maturity 4.20%', () => {
    expect(approxYTM(bondInfo(cd({ cd_bought: 'bank' })), ON_COUPON_DAY)).toBe(0.042);
  });

  test('a bank CD with no face value but a rate → its rate (settles MK-NW-F-060)', () => {
    expect(approxYTM(bondInfo(cd({ face_value: undefined })), ON_COUPON_DAY)).toBe(0.042);
  });

  test('a broker CD: $10,000 face, 4.2%, worth $9,850, two years left on a coupon day → about 5.007%', () => {
    const y = approxYTM(bondInfo(cd({ cd_bought: 'broker', balance: 9_850 })), ON_COUPON_DAY)!;
    // check: 420/(1+y) + 10,420/(1+y)² = 9,850 → y ≈ 5.007%; tolerance ±0.001 percentage point
    expect(Math.abs(y - 0.05007)).toBeLessThan(0.00001);
    expect(420 / (1 + y) + 10_420 / (1 + y) ** 2).toBeCloseTo(9_850, 2);
  });

  test('a broker CD with no face value: no yield to maturity (as a bond)', () => {
    expect(approxYTM(bondInfo(cd({ cd_bought: 'broker', face_value: undefined })), ON_COUPON_DAY)).toBeNull();
  });

  test('a broker CD gets the if-rates-move estimate and the accrued-interest note', () => {
    const b = bondInfo(cd({ cd_bought: 'broker', balance: 9_850 }));
    expect(bondRateSensitivity(b, MID_YEAR)).not.toBeNull();
    expect(estimatedAccrued(b, MID_YEAR)).not.toBeNull();
    expect(accruedInterestCaveat(b, MID_YEAR)).toMatch(/^Added estimated \$\d[\d,]* in accrued interest/);
    const one = theBonds({ accounts: [cd({ cd_bought: 'broker', balance: 9_850 })], accountId: 'cd1', today: MID_YEAR }).one!;
    expect(one.ratesMove).not.toBeNull();
    expect(one.ratesMoveRefusal).toBe('');
    expect(one.accruedCaveat).not.toBeNull();
  });

  test('a bank CD gets neither — and the door says why', () => {
    const b = bondInfo(cd({ cd_bought: 'bank' }));
    expect(bondRateSensitivity(b, MID_YEAR)).toBeNull();
    expect(accruedInterestCaveat(b, MID_YEAR)).toBeNull();
    const one = theBonds({ accounts: [cd({})], accountId: 'cd1', today: MID_YEAR }).one!;
    expect(one.ratesMove).toBeNull();
    expect(one.accruedCaveat).toBeNull();
    expect(one.ratesMoveRefusal).toMatch(/^Nothing happens to this CD\. It is not traded/);
    expect(one.ratesMoveRefusal).toMatch(/marked as bought from the bank/);
  });
});
