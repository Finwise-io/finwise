// Term #6: interest income from ALL interest-bearing holdings. Regression for the silent-$0 bug —
// a bond FUND (no maturity) and a CD (class 'bonds' — founder rule 2026-08-04) used to contribute nothing.
import { interestIncomeAnnual } from './index';
import type { AssetAccount } from '../assets';

const a = (over: Partial<AssetAccount>): AssetAccount => ({
  asset_id: 'x' as any, label: 'acct', tax_bucket: 'TAXABLE', balance: 0, target_return: 0, ...over,
});

describe('interestIncomeAnnual', () => {
  test('individual bond = face × coupon', () => {
    expect(interestIncomeAnnual([
      a({ label: 'US Treasury 4.5%', maturity_date: '2032-01-01', coupon_rate: 0.045, face_value: 100000, balance: 98000 }),
    ])).toBe(4500);
  });

  test('A46 (founder, 2026-08-26): a bond FUND with no coupon rate contributes $0 — never a built-in yield', () => {
    // an assumed return is a growth guess, not a coupon: the ruling says 0 whenever the coupon rate is missing
    expect(interestIncomeAnnual([a({ label: 'AGG bond fund', kind: 'fixed_income', balance: 50000, target_return: 0.03 })])).toBe(0);
    expect(interestIncomeAnnual([a({ label: 'BND', kind: 'fixed_income', balance: 50000, target_return: 0 })])).toBe(0);
    // a stated coupon rate on a fund still counts
    expect(interestIncomeAnnual([a({ label: 'BND 3%', kind: 'fixed_income', balance: 50000, coupon_rate: 0.03 })])).toBe(1500);
  });

  test('CD interest is kept — balance × its stated rate (CDs are Bonds & CDs, founder rule 2026-08-04)', () => {
    expect(interestIncomeAnnual([
      a({ label: 'KEY BANK CD 3.85%', maturity_date: '2026-08-24', coupon_rate: 0.0385, balance: 109992 }),
    ])).toBeCloseTo(4234.69, 1);
  });

  test('equities contribute no interest income', () => {
    expect(interestIncomeAnnual([a({ label: 'AAPL', kind: 'stocks_etf', balance: 50000 })])).toBe(0);
  });

  test('sums across a mixed portfolio', () => {
    const port: AssetAccount[] = [
      a({ label: 'US Treasury 4.5%', coupon_rate: 0.045, face_value: 100000, maturity_date: '2032-01-01', balance: 98000 }), // 4500
      a({ label: 'AGG fund', kind: 'fixed_income', balance: 50000, target_return: 0.03 }),                                    // 0 — A46: no coupon rate
      a({ label: 'AAPL', kind: 'stocks_etf', balance: 30000 }),                                                              // 0
    ];
    expect(interestIncomeAnnual(port)).toBe(4500);
  });
});
