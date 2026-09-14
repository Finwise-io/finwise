/** A46 (founder, 2026-08-26): if the coupon rate is not available use 0.
 *  A47 (founder, 2026-08-26): subtract accrued interest when known; say so when not. */
import { bondInfo, currentYield, accruedInterestCaveat, interestIncomeAnnual, couponIncomeAnnual } from './index';

const acct = (over: any) => ({ asset_id: 'b1', label: 'Treasury 2032', tax_bucket: 'TAXABLE', balance: 0, target_return: 0, ...over });

describe('A47 — accrued interest', () => {
  const base = { maturity_date: '2032-01-01', coupon_rate: 0.05, face_value: 10_000, balance: 10_200 };

  test('entered → it is read into the bond record and subtracted before the yield', () => {
    const b = bondInfo(acct({ ...base, accrued_interest: 200 }) as any);
    expect(b.accruedInterest).toBe(200);
    expect(currentYield(b)).toBeCloseTo(500 / 10_000, 12);   // coupon ÷ (price − accrued)
    expect(accruedInterestCaveat(b)).toBeNull();
  });

  test('not entered → the yield uses the price as entered, and says so', () => {
    const b = bondInfo(acct(base) as any);
    expect(b.accruedInterest).toBeNull();
    expect(currentYield(b)).toBeCloseTo(500 / 10_200, 12);
    expect(accruedInterestCaveat(b)).toMatch(/accrued interest not entered/);
  });

  test('a zero entered is known, not missing', () => {
    const b = bondInfo(acct({ ...base, accrued_interest: 0 }) as any);
    expect(b.accruedInterest).toBe(0);
    expect(accruedInterestCaveat(b)).toBeNull();
  });

  test('accrued interest equal to the whole price leaves nothing to divide by → no yield', () => {
    expect(currentYield({ face: 100, couponRate: 0.05, maturity: '2032-01-01', value: 100, accruedInterest: 100 })).toBeNull();
  });
});

describe('A46 — no coupon rate means $0, never a built-in yield', () => {
  test('a bond fund without a coupon rate contributes nothing to interest income', () => {
    expect(interestIncomeAnnual([acct({ kind: 'fixed_income', balance: 50_000 }) as any])).toBe(0);
    expect(interestIncomeAnnual([acct({ kind: 'fixed_income', balance: 50_000, target_return: 0.05 }) as any])).toBe(0);
  });
  test('an individual bond without a coupon rate contributes nothing', () => {
    expect(couponIncomeAnnual([acct({ maturity_date: '2032-01-01', face_value: 10_000, balance: 9_900 }) as any])).toBe(0);
    expect(interestIncomeAnnual([acct({ maturity_date: '2032-01-01', face_value: 10_000, balance: 9_900 }) as any])).toBe(0);
  });
  test('a stated coupon rate is used as stated', () => {
    expect(interestIncomeAnnual([acct({ maturity_date: '2032-01-01', coupon_rate: 0.04, face_value: 10_000, balance: 9_900 }) as any])).toBe(400);
  });
});
