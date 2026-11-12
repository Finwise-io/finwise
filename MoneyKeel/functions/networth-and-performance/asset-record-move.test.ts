/* WHAT A PHONE ALREADY HOLDS, MOVED ONTO THE MASTER RECORD ONCE (phase 2, step 6, 2026-11-11). Each case states the old
 * copies — the account, its tax lots and its activity — so every share count and gain can be worked by hand. */
import { moveOldCopies } from './asset-record-move';
import { openPurchases, rowsInForce, saleGain, sharesOnRecord, valuesNow } from './asset-record';

const AT = '2026-11-11T10:00:00.000Z', AT2 = '2026-11-11T11:00:00.000Z';
const txn = (o: Record<string, unknown>) => ({ created_at: '2026-11-01T00:00:00.000Z', source: 'manual', ...o }) as any;

test('Savings typed at $12,400 as of Sep 1: moved as one value on Sep 1; opening again moves nothing', () => {
  const sav = { asset_id: 'sav', label: 'Savings', kind: 'savings', balance: 12_400, source: 'manual', value_as_of: '2026-09-01' } as any;
  const once = moveOldCopies([], [sav], [], AT);
  expect(once.moved).toEqual(['sav']);
  expect(valuesNow(once.record, 'sav')).toMatchObject({ date: '2026-09-01', total: 12_400, source: 'typed' });
  const twice = moveOldCopies(once.record, [sav], [], AT2);
  expect(twice.moved).toEqual([]);
  expect(twice.record).toEqual(once.record);
});

test('100 VTI first entered at $80, then bought 20 at $100, sold 5 at $120 — the phone shows 95 + 20 = 115: the activity is moved, not the lots', () => {
  const acct = { asset_id: 'van', label: 'Brokerage', kind: 'brokerage', balance: 0, source: 'manual', positions: [{ position_id: 'p', ticker: 'VTI', kind: 'stocks_etf',
    lots: [{ lot_id: 'l1', shares: 95, cost_per_share: 80, purchase_date: '2025-03-03' }, { lot_id: 'l2', shares: 20, cost_per_share: 100, purchase_date: '2026-10-01' }] }] } as any;
  const ledger = [
    txn({ id: 'o1', type: 'OPENING_POSITION', account_id: 'van', ticker: 'VTI', shares: 100, price: 80, date: '2025-03-03', lot_id: 'l1' }),
    txn({ id: 'b1', type: 'BUY', account_id: 'van', ticker: 'VTI', shares: 20, price: 100, date: '2026-10-01' }),
    txn({ id: 's1', type: 'SELL', account_id: 'van', ticker: 'VTI', shares: 5, price: 120, date: '2026-10-15' }),
  ];
  const out = moveOldCopies([], [acct], ledger, AT);
  expect(out.problems).toEqual([]);
  expect(sharesOnRecord(out.record, 'van', 'VTI')).toBe(115);
  expect(rowsInForce(out.record).filter((r) => r.kind === 'PURCHASE').map((r) => [r.date, r.shares, r.price])).toEqual([['2025-03-03', 100, 80], ['2026-10-01', 20, 100]]);
  // the sale keeps what it made: 5 × ($120 − $80) = $200, sold from the oldest purchase
  const sale = rowsInForce(out.record).find((r) => r.kind === 'SALE')!;
  expect(saleGain(out.record, sale.rowId)).toBe(200);
});

test('lots entered before opening records were kept: 100 VTI at $80 with no opening record, and a buy of 20 — the phone shows 120: the lots are moved, the buy is not, and a sentence says so', () => {
  const acct = { asset_id: 'van', label: 'Brokerage', kind: 'brokerage', balance: 0, source: 'manual', positions: [{ position_id: 'p', ticker: 'VTI', kind: 'stocks_etf',
    lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 80, purchase_date: '2025-03-03' }, { lot_id: 'l2', shares: 20, cost_per_share: 100, purchase_date: '2026-10-01' }] }] } as any;
  const out = moveOldCopies([], [acct], [txn({ id: 'b1', type: 'BUY', account_id: 'van', ticker: 'VTI', shares: 20, price: 100, date: '2026-10-01' })], AT);
  expect(sharesOnRecord(out.record, 'van', 'VTI')).toBe(120);
  expect(out.problems).toEqual(['The activity of VTI did not add up to its 120 shares, so its tax lots as they stand were moved and its 1 recorded purchases and sales were not.']);
});

test('a dividend of $12.50 on Oct 2 is moved on its own date', () => {
  const acct = { asset_id: 'van', label: 'Brokerage', kind: 'brokerage', balance: 0, source: 'manual', positions: [] } as any;
  const out = moveOldCopies([], [acct], [txn({ id: 'd1', type: 'DIVIDEND', account_id: 'van', ticker: 'VTI', amount: 12.5, date: '2026-10-02' })], AT);
  expect(rowsInForce(out.record).filter((r) => r.kind === 'DIVIDEND').map((r) => [r.amount, r.date])).toEqual([[12.5, '2026-10-02']]);
});

test('an imported account: 50 LCTX bought Jan 2 at $10, file dated Jun 21, price $12, cash $100 — saved as the file\'s list and values on Jun 21, total $700', () => {
  const acct = { asset_id: 'imp', label: 'Individual', kind: 'brokerage', balance: 700, cash_balance: 100, source: 'imported', value_as_of: '2026-06-21',
    positions: [{ position_id: 'p', ticker: 'LCTX', kind: 'stocks_etf', last_price: 12, lots: [{ lot_id: 'l1', shares: 50, cost_per_share: 10, purchase_date: '2026-01-02' }] }] } as any;
  const ledger = [txn({ id: 'o1', type: 'OPENING_POSITION', account_id: 'imp', ticker: 'LCTX', shares: 50, price: 10, date: '2026-01-02', lot_id: 'l1' })];
  const out = moveOldCopies([], [acct], ledger, AT);
  expect(openPurchases(out.record, 'imp', 'LCTX')).toEqual([expect.objectContaining({ date: '2026-01-02', shares: 50, price: 10, source: 'file', stillHeldOn: '2026-06-21' })]);
  expect(valuesNow(out.record, 'imp')).toMatchObject({ date: '2026-06-21', source: 'file', total: 700 });
  expect(sharesOnRecord(out.record, 'imp', 'LCTX')).toBe(50);
});

test('an account linked to a broker is not moved: its next update reads the broker\'s whole history', () => {
  const acct = { asset_id: 'rh', label: 'Robinhood', kind: 'brokerage', balance: 9_000, source: 'connected', positions: [] } as any;
  expect(moveOldCopies([], [acct], [], AT)).toMatchObject({ moved: [], record: [] });
});
