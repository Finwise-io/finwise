/** THE DOOR FOR "what is this one account worth" — MK-NW-O-002 theAccount (Q-NW-2, ruled 2026-09-27).
 *
 *  The two findings this door exists to hold are the ones that were paid for once already: income
 *  belongs to a holding only when the record NAMES it, and a hand-entered lump has no inside to read.
 */
import { theAccount, itemising } from './account';

const linked = (over: any = {}) => ({
  asset_id: 'a1', label: 'E*TRADE Brokerage', institution: 'E*TRADE', kind: 'brokerage',
  tax_bucket: 'TAXABLE', balance: 52704, source: 'connected', cash_balance: 704,
  positions: [{ position_id: 'p1', ticker: 'LCTX', asset_class: 'stock', last_price: 40, lots: [{ shares: 1300, cost_per_share: 38 }] }],
  ...over,
} as any);
const byHand = (over: any = {}) => ({
  asset_id: 'h1', label: 'Old IRA', kind: 'ira', tax_bucket: 'PRE_TAX', balance: 20000, ...over,
} as any);
const txns = [
  { id: 't1', account_id: 'a1', type: 'DIVIDEND', amount: 120, ticker: 'LCTX', date: '2026-08-01' },
  { id: 't2', account_id: 'a1', type: 'INTEREST', amount: 40, ticker: null, date: '2026-08-02' },   // names no holding
  { id: 't3', account_id: 'other', type: 'DIVIDEND', amount: 999, ticker: 'LCTX', date: '2026-08-03' },
];

test('market value is the account’s balance, and the income is what its records show', () => {
  const a = theAccount({ account: linked(), transactions: txns });
  expect(a.marketValue).toBe(52704);
  expect(a.income).toBe(160);            // 120 dividends + 40 interest, this account only
  expect(a.activityCount).toBe(2);       // the third row belongs to another account
});

test('AN UNTICKERED RECORD NAMES NO HOLDING (founder finding, 2026-08-11)', () => {
  const a = theAccount({ account: linked(), transactions: txns });
  expect(a.incomeOfHolding('LCTX').dividends).toBe(120);
  expect(a.incomeOfHolding('LCTX').interest).toBe(0);     // the $40 has no ticker: it is not LCTX's
  expect(a.incomeOfHolding('KEYCD').words).toBe('');      // and it is not some other holding's either
  expect(a.incomeOfHolding(null).words).toBe('');
  expect(a.income).toBe(160);                             // but it IS counted, at the account level
});

test('a linked account has an inside; one entered by hand does not', () => {
  expect(theAccount({ account: linked(), transactions: [] }).inside).not.toBeNull();
  expect(theAccount({ account: byHand(), transactions: [] }).inside).toBeNull();
});

test('the inside adds up to the account, cash sleeve included', () => {
  const a = theAccount({ account: linked(), transactions: [] });
  const sum = a.inside!.reduce((t, s) => t + s.value, 0);
  expect(Math.round(sum)).toBe(1300 * 40 + 704);
});

test('itemising never moves what the account is worth', () => {
  const it = itemising(20000, [{ value: 12000 } as any, { value: 3000 } as any]);
  expect(it.keepTotalAt).toBe(20000);
  expect(it.itemised).toBe(15000);
  expect(it.remainder).toBe(5000);
});

test('nothing entered → zeros that are true, never a guess', () => {
  const a = theAccount({ account: byHand({ balance: 0 }), transactions: [] });
  expect(a.marketValue).toBe(0);
  expect(a.income).toBe(0);
  expect(a.activityCount).toBe(0);
});
