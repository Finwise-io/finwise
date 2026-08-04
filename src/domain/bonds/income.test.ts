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

  test('bond FUND (no coupon/maturity) earns value × yield — NOT silently $0', () => {
    expect(interestIncomeAnnual([a({ label: 'AGG bond fund', kind: 'fixed_income', balance: 50000, target_return: 0.03 })])).toBe(1500);
    // no explicit yield → falls back to the default bond yield (4.2%)
    expect(interestIncomeAnnual([a({ label: 'BND', kind: 'fixed_income', balance: 50000, target_return: 0 })])).toBe(2100);
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
      a({ label: 'AGG fund', kind: 'fixed_income', balance: 50000, target_return: 0.03 }),                                    // 1500
      a({ label: 'AAPL', kind: 'stocks_etf', balance: 30000 }),                                                              // 0
    ];
    expect(interestIncomeAnnual(port)).toBe(6000);
  });
});
