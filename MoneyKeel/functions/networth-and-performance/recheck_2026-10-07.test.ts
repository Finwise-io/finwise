// RE-CHECK OF ALL FIVE BATCHES AGAINST HIS TWO RULES (2026-10-07): can the person see how each number
// was made; and no rule of mine kept against an approved drawing. One defect found that I introduced
// the same day: the Other investments total counted alternatives held inside a brokerage, but the rows
// under it listed only whole alternatives accounts — the rows no longer added to the total.
import { theAlternativesOutlook } from './alternatives-outlook';

test('Other investments: the rows add up to the total, and a brokerage holding a bitcoin fund is a row saying so', () => {
  const accounts: any[] = [
    { asset_id: 's', label: 'Schwab', kind: 'brokerage', tax_bucket: 'TAXABLE', source: 'connected', balance: 70218.61, cash_balance: 4206.11,
      positions: [{ position_id: 'v', ticker: 'VTI', asset_class: 'stock_etf', last_price: 287.43, lots: [{ lot_id: 'l1', shares: 210, cost_per_share: 200, purchase_date: '2024-01-02' }] },
        { position_id: 'i', ticker: 'IBIT', name: 'ISHARES BITCOIN TRUST ETF', asset_class: 'other', last_price: 52.31, lots: [{ lot_id: 'l2', shares: 80, cost_per_share: 40, purchase_date: '2024-01-02' }] }],
      option_holdings: [{ value: 1455 }] },
    { asset_id: 'c', label: 'Coinbase', kind: 'crypto', tax_bucket: 'TAXABLE', derive_balance: true, cash_balance: 1250, balance: 18640.9, positions: [] },
  ];
  const o = theAlternativesOutlook({ accounts } as any);
  expect(o.rows.reduce((t: number, r: any) => t + r.value, 0)).toBeCloseTo(o.totalValue, 2);
  expect(o.totalValue).toBeCloseTo(23030.7, 2);
  const schwab = o.rows.find((r: any) => r.accountId === 's')!;
  expect(schwab.value).toBeCloseTo(5639.8, 2);                  // the bitcoin fund and the options, not the whole account
  expect(schwab.inside).toMatch(/in this account$/);            // and it says which part of the account it is
  expect(o.rows.find((r: any) => r.accountId === 'c')!.inside).toBeNull();
});
