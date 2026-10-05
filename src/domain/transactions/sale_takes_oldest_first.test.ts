/** A SALE TAKES THE OLDEST SHARES FIRST — by the day each purchase was made.
 *
 *  Outside review, 2026-10-04 (MK-NW-O-006): "'shares of every purchase added up' is only right if sold
 *  shares are removed from the lots first, and the method is not stated." The Holding detail drawing
 *  states it: "oldest shares sold first". The code took from whichever purchase was STORED first, so
 *  purchases entered out of date order left the wrong ones behind — and the long-term / short-term
 *  split of what was left moved with them.
 */
import { applyTransaction } from './index';

const account = (lots: any[]) => [{ asset_id: 'a', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, cash_balance: 0,
  positions: [{ position_id: 'p', ticker: 'ABC', last_price: 50, lots }] }] as any;
const sell = (shares: number) => ({ id: 's', account_id: 'a', type: 'SELL', ticker: 'ABC', shares, price: 50, date: '2026-10-04', created_at: 'x' }) as any;
const left = (accounts: any[]) => (accounts[0].positions?.[0]?.lots ?? []).map((l: any) => [l.lot_id, l.shares]);

test('the oldest purchase goes first, even when it was entered last', () => {
  const lots = [{ lot_id: 'new', shares: 10, cost_per_share: 40, purchase_date: '2026-06-01' },
                { lot_id: 'old', shares: 10, cost_per_share: 20, purchase_date: '2023-01-15' }];
  expect(left(applyTransaction(account(lots), sell(10)))).toEqual([['new', 10]]);      // it used to leave ['old', 10]
  expect(left(applyTransaction(account(lots), sell(14)))).toEqual([['new', 6]]);
});

test('entered in date order, nothing changes', () => {
  const lots = [{ lot_id: 'old', shares: 10, cost_per_share: 20, purchase_date: '2023-01-15' },
                { lot_id: 'new', shares: 10, cost_per_share: 40, purchase_date: '2026-06-01' }];
  expect(left(applyTransaction(account(lots), sell(4)))).toEqual([['old', 6], ['new', 10]]);
});

test('a purchase with no date is not assumed to be the oldest: it goes last', () => {
  const lots = [{ lot_id: 'undated', shares: 5, cost_per_share: 30 },
                { lot_id: 'dated', shares: 5, cost_per_share: 20, purchase_date: '2024-02-02' }];
  expect(left(applyTransaction(account(lots), sell(5)))).toEqual([['undated', 5]]);
});

test('selling everything closes the holding', () => {
  const lots = [{ lot_id: 'a', shares: 3, cost_per_share: 20, purchase_date: '2024-02-02' }];
  expect(applyTransaction(account(lots), sell(3))[0].positions).toEqual([]);
});
