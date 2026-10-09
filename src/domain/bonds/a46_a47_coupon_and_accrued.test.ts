/** A46 (founder, 2026-08-26): if the coupon rate is not available use 0.
 *  A47 (founder, 2026-08-26): subtract accrued interest when known; say so when not — REPLACED by his ruling of
 *  2026-10-09: accrued interest (entered, or estimated and said so) is ADDED to the statement value for the yield to maturity. */
import { bondInfo, currentYield, accruedInterestCaveat, estimatedAccrued, interestIncomeAnnual, couponIncomeAnnual } from './index';

const acct = (over: any) => ({ asset_id: 'b1', label: 'Treasury 2032', tax_bucket: 'TAXABLE', balance: 0, target_return: 0, ...over });

describe('A47, AS REPLACED BY HIS RULING OF 2026-10-09 — accrued interest is ADDED to the statement value for the yield to maturity', () => {
  // His words: "Added estimated $1,119 in accrued interest to bond value at 4.5% coupon for 363 days to calculate
  // YTM. If this is not accurate, enter actual accrued interest". The value typed is the statement's market
  // value, which leaves accrued interest out; the yield on today's value is on that value as entered.
  const base = { maturity_date: '2032-01-01', coupon_rate: 0.05, face_value: 10_000, balance: 10_200 };
  const NOW = new Date(2026, 9, 9);

  test('entered → read into the bond record; the yield on today\'s value is on the value as entered; no note', () => {
    const b = bondInfo(acct({ ...base, accrued_interest: 200 }) as any);
    expect(b.accruedInterest).toBe(200);
    expect(currentYield(b)).toBeCloseTo(500 / 10_200, 12);
    expect(accruedInterestCaveat(b, NOW)).toBeNull();
  });

  test('not entered → it is estimated from the coupon schedule and the screen says so, in his words', () => {
    const b = bondInfo(acct(base) as any);
    expect(b.accruedInterest).toBeNull();
    const est = estimatedAccrued(b, NOW)!;
    expect(est.days).toBe(281);                                   // Jan 1, 2026 → Oct 9, 2026
    expect(est.amount).toBeCloseTo(500 * 281 / 365, 9);
    expect(accruedInterestCaveat(b, NOW)).toBe('Added estimated $385 in accrued interest to bond value at 5% coupon for 281 days to calculate YTM. If this is not accurate, enter actual accrued interest');
  });

  test('a zero entered is known, not missing — nothing is estimated', () => {
    const b = bondInfo(acct({ ...base, accrued_interest: 0 }) as any);
    expect(b.accruedInterest).toBe(0);
    expect(accruedInterestCaveat(b, NOW)).toBeNull();
  });

  test('a CD (its yield is its stated rate) and a zero-coupon bond get no estimate', () => {
    expect(estimatedAccrued(bondInfo(acct({ ...base, label: 'Ally 12-month CD' }) as any), NOW)).toBeNull();
    expect(estimatedAccrued(bondInfo(acct({ ...base, coupon_rate: 0 }) as any), NOW)).toBeNull();
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
