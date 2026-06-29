// Itemize reconciliation — the account total must NEVER drift (founder rule: a wrong number = lost trust).
import { itemizedTotal, itemizeRemainder, itemizedResultTotal, buildItemizedAccounts, type ItemHolding } from './itemize';
import type { AssetAccount } from './index';

const lump = (over: Partial<AssetAccount> = {}): AssetAccount => ({
  asset_id: 'chase', label: 'Chase', institution: 'Chase', tax_bucket: 'TAXABLE', balance: 2_500_000, target_return: 0, ...over,
});

// 2 stocks (1,000,000) + 4 "options"/alts (300,000) + 5 bonds (800,000) = 2,100,000 → 400,000 remainder
// from a 2.5M lump (the Q2 scenario).
const items: ItemHolding[] = [
  { cls: 'stocks_etf', label: 'AAPL', ticker: 'AAPL', value: 600_000 },
  { cls: 'stocks_etf', label: 'VTI', ticker: 'VTI', value: 400_000 },
  { cls: 'alternatives', label: 'QQQ Put', kind: 'options', value: 75_000 },
  { cls: 'alternatives', label: 'SPY Call', kind: 'options', value: 75_000 },
  { cls: 'alternatives', label: 'TSLA Put', kind: 'options', value: 75_000 },
  { cls: 'alternatives', label: 'NVDA Call', kind: 'options', value: 75_000 },
  { cls: 'bonds', label: 'US Treasury 4% 2032', couponRate: 0.04, maturityDate: '2032-05-15', value: 160_000 },
  { cls: 'bonds', label: 'Muni 2030', value: 160_000 },
  { cls: 'bonds', label: 'Corp 2028', value: 160_000 },
  { cls: 'bonds', label: 'Treasury 2027', value: 160_000 },
  { cls: 'bonds', label: 'Muni 2035', value: 160_000 },
];

describe('itemize — totals & remainder', () => {
  test('itemizedTotal sums holding values', () => {
    expect(itemizedTotal(items)).toBe(2_100_000);
    expect(itemizedTotal([])).toBe(0);
  });
  test('remainder = lump − Σ (positive, zero, negative)', () => {
    expect(itemizeRemainder(2_500_000, items)).toBe(400_000);          // Q2 scenario
    expect(itemizeRemainder(2_100_000, items)).toBe(0);                // exact
    expect(itemizeRemainder(2_000_000, items)).toBe(-100_000);         // holdings exceed the estimate
  });
});

describe('itemize — keep-as-cash preserves the total (THE INVARIANT)', () => {
  test('result total equals the lump exactly when remainder ≥ 0', () => {
    expect(itemizedResultTotal(lump(), items)).toBe(2_500_000);                       // 2.1M + 400k cash
    expect(itemizedResultTotal(lump({ balance: 2_100_000 }), items)).toBe(2_100_000); // exact, no remainder
  });
  test('Σ of the created accounts equals the lump (no money created or lost)', () => {
    const created = buildItemizedAccounts(lump(), items);
    const sum = created.reduce((t, a) => t + a.balance, 0);
    expect(sum).toBe(2_500_000);
    // 11 holdings + 1 remainder-cash sleeve
    expect(created).toHaveLength(12);
    const cash = created.find((a) => a.asset_class === 'cash')!;
    expect(cash.balance).toBe(400_000);
    expect(cash.institution).toBe('Chase');
  });
  test('exact itemization creates no cash sleeve', () => {
    const created = buildItemizedAccounts(lump({ balance: 2_100_000 }), items);
    expect(created).toHaveLength(11);
    expect(created.some((a) => a.label.includes('cash'))).toBe(false);
    expect(created.reduce((t, a) => t + a.balance, 0)).toBe(2_100_000);
  });
  test('when holdings exceed the entered total, the total rises to Σ (estimate was low)', () => {
    expect(itemizedResultTotal(lump({ balance: 2_000_000 }), items)).toBe(2_100_000);
    const created = buildItemizedAccounts(lump({ balance: 2_000_000 }), items);
    expect(created.some((a) => a.asset_class === 'cash')).toBe(false);   // no negative cash sleeve
    expect(created.reduce((t, a) => t + a.balance, 0)).toBe(2_100_000);
  });
});

describe('itemize — holdings inherit institution + wrapper and carry their class', () => {
  test('each holding is tagged with the lump institution + tax bucket', () => {
    const created = buildItemizedAccounts(lump(), items);
    expect(created.every((a) => a.institution === 'Chase')).toBe(true);
    expect(created.every((a) => a.tax_bucket === 'TAXABLE')).toBe(true);
    expect(created.filter((a) => a.asset_class === 'stocks_etf')).toHaveLength(2);
    expect(created.filter((a) => a.asset_class === 'bonds')).toHaveLength(5);
    expect(created.filter((a) => a.asset_class === 'alternatives')).toHaveLength(4);
  });
  test('a 401(k) lump itemizes into PRE_TAX holdings (wrapper inherited)', () => {
    const created = buildItemizedAccounts(lump({ tax_bucket: 'PRE_TAX', balance: 200_000 }), [
      { cls: 'stocks_etf', label: 'VOO', value: 150_000 },
    ]);
    expect(created.every((a) => a.tax_bucket === 'PRE_TAX')).toBe(true);
    expect(created.find((a) => a.asset_class === 'cash')!.tax_bucket).toBe('PRE_TAX');  // the cash sleeve too
  });
  test('bonds carry coupon + maturity + face; options keep their kind', () => {
    const created = buildItemizedAccounts(lump(), items);
    const treasury = created.find((a) => a.label === 'US Treasury 4% 2032')!;
    expect(treasury.coupon_rate).toBe(0.04);
    expect(treasury.maturity_date).toBe('2032-05-15');
    expect(treasury.face_value).toBe(160_000);
    expect(created.find((a) => a.label === 'QQQ Put')!.kind).toBe('options');
  });
  test('institution falls back to the lump label when institution is unset', () => {
    const created = buildItemizedAccounts(lump({ institution: undefined, label: 'My brokerage' }), [
      { cls: 'cash', label: 'cash', value: 1000 },
    ]);
    expect(created[0].institution).toBe('My brokerage');
  });
});
