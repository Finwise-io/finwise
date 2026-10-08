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

import { accountClassBreakdown } from '../../../src/domain/assets';
test('a hand-built account splits at today’s values, not at what was paid', () => {
  // VTI bought at $100, worth $300 today; a T-bill bought and worth $1,000 — the balance was built at today's prices
  const b = accountClassBreakdown({ asset_id: 'h', label: 'My brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', derive_balance: true, cash_balance: 0, balance: 4000,
    positions: [{ position_id: 'v', ticker: 'VTI', kind: 'stocks_etf', value_now: 3000, lots: [{ lot_id: 'a', shares: 10, cost_per_share: 100, purchase_date: '2020-01-02' }] },
      { position_id: 't', ticker: '', label: 'US Treasury bill', value_now: 1000, lots: [{ lot_id: 'b', shares: 1, cost_per_share: 1000, purchase_date: '2026-01-02' }] }] } as any)!;
  expect(b.stocks_etf).toBeCloseTo(3000, 2);   // by what was paid it read 2,000
  expect(b.bonds).toBeCloseTo(1000, 2);        // and 2,000
});
