import { isAlternative, alternativesSummary } from './index';
import type { AssetAccount } from '../assets';

const a = (kind: string, balance: number, extra: Partial<AssetAccount> = {}): AssetAccount =>
  ({ asset_id: kind, label: kind, kind, tax_bucket: 'TAXABLE', balance, target_return: 0.08, ...extra });

describe('alternatives', () => {
  test('classifies alternatives, excludes stocks/bonds/cash/property', () => {
    expect(isAlternative(a('crypto', 5000))).toBe(true);
    expect(isAlternative(a('private_equity', 10000))).toBe(true);
    expect(isAlternative(a('stocks_etf', 10000))).toBe(false);
    expect(isAlternative(a('fixed_income', 10000, { maturity_date: '2030-01-01' }))).toBe(false); // a bond
    expect(isAlternative(a('home', 500000, { tax_bucket: 'PROPERTY' }))).toBe(false);
  });

  test('summary totals value + value-weighted benchmark + est growth', () => {
    // crypto 0.08, commodities 0.082 (gold) per ASSET_KINDS
    const s = alternativesSummary([a('crypto', 10000), a('commodities', 10000), a('stocks_etf', 99999)]);
    expect(s.count).toBe(2);                       // stock excluded
    expect(s.totalValue).toBe(20000);
    expect(s.blendedReturn).toBeCloseTo((0.08 + 0.082) / 2, 4);
    expect(s.estAnnualGrowth).toBeCloseTo(20000 * ((0.08 + 0.082) / 2), 0);
  });
});
