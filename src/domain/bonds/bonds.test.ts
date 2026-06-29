import { annualCoupon, yearsToMaturity, currentYield, approxYTM, bondSummary, couponIncomeAnnual, isBond, type BondInfo } from './index';
import type { AssetAccount } from '../assets';

const b = (face: number, rate: number, maturity: string, value: number): BondInfo => ({ face, couponRate: rate, maturity, value });

describe('bonds', () => {
  const now = new Date('2025-06-01');

  test('annual coupon = face × rate', () => {
    expect(annualCoupon(b(10000, 0.045, '2030-06-01', 9800))).toBe(450);
  });
  test('years to maturity', () => {
    expect(yearsToMaturity('2030-06-01', now)).toBeCloseTo(5, 1);
    expect(yearsToMaturity('2024-01-01', now)).toBe(0);   // matured → 0
  });
  test('current yield = coupon / value', () => {
    expect(currentYield(b(10000, 0.05, '2030-06-01', 10000))).toBeCloseTo(0.05, 4);
    expect(currentYield(b(10000, 0.05, '2030-06-01', 9000))).toBeCloseTo(0.0556, 3);  // discount → higher yield
  });
  test('approx YTM > current yield when bought at a discount', () => {
    const bond = b(10000, 0.05, '2030-06-01', 9000);   // discount
    const ytm = approxYTM(bond, now)!;
    expect(ytm).toBeGreaterThan(currentYield(bond)!);    // pull-to-par adds return
  });
  test('summary aggregates value, coupon, weighted yield, next maturity', () => {
    const s = bondSummary([b(10000, 0.04, '2027-06-01', 10000), b(20000, 0.05, '2031-06-01', 19000)], now);
    expect(s.count).toBe(2);
    expect(s.totalValue).toBe(29000);
    expect(s.annualCoupon).toBe(400 + 1000);
    expect(s.avgYield).toBeCloseTo(1400 / 29000, 4);
    expect(s.nextMaturity).toBe('2027-06-01');
  });
  test('couponIncomeAnnual sums only bond accounts', () => {
    const accts: AssetAccount[] = [
      { asset_id: 'b1', label: 'Treasury', tax_bucket: 'TAXABLE', balance: 10000, target_return: 0.04, face_value: 10000, coupon_rate: 0.045, maturity_date: '2030-06-01' },
      { asset_id: 's1', label: 'Stocks', tax_bucket: 'TAXABLE', balance: 50000, target_return: 0.1 },
    ];
    expect(isBond(accts[0])).toBe(true);
    expect(isBond(accts[1])).toBe(false);
    expect(couponIncomeAnnual(accts)).toBe(450);
  });

  test('NW-1: bond detection is by asset CLASS not maturity (spec §2)', () => {
    // a bond FUND/ETF has NO maturity date but IS a bond
    expect(isBond({ asset_id: 'bf', label: 'BND', tax_bucket: 'TAXABLE', balance: 20000, target_return: 0.04, asset_class: 'bonds' } as any)).toBe(true);
    // a CD has a maturity but is CASH — must NOT count as a bond
    expect(isBond({ asset_id: 'cd', label: 'Ally 12-mo CD', tax_bucket: 'CASH', balance: 10000, target_return: 0.05, maturity_date: '2027-01-01', asset_class: 'cash' } as any)).toBe(false);
    // a CD detected by label (no explicit class) is cash, not a bond, even with a maturity
    expect(isBond({ asset_id: 'cd2', label: 'KeyBank CD 4%', tax_bucket: 'CASH', balance: 5000, target_return: 0.04, maturity_date: '2028-01-01' } as any)).toBe(false);
  });
});
