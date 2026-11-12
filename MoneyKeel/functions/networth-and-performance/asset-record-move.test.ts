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
  expect(out.problems).toEqual(['The activity of VTI did not leave the tax lots it shows (120 shares), so its tax lots as they stand were moved and its 1 recorded purchases and sales were not.']);
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

describe('outside check, 2026-11-12', () => {
  const { applyTransaction } = require('../../../src/domain/transactions');
  const { importHoldings, importedAccountOf, valueOnlyAccountsOf } = require('../../../src/domain/import/holdingsImport');
  const typed = (id: string, extra: Record<string, unknown> = {}) => ({ asset_id: id, label: id, kind: 'brokerage', balance: 0, cash_balance: 0, source: 'manual', positions: [], ...extra }) as any;

  test('3 MSFT first entered in account A, then moved to account B with "transfer shares": 3 MSFT on record, all in B, bought Jan 2, 2025 at $100', () => {
    let accs: any[] = [typed('A'), typed('B')];
    const o = txn({ id: 'o1', type: 'OPENING_POSITION', account_id: 'A', ticker: 'MSFT', shares: 3, price: 100, date: '2025-01-02' });
    accs = applyTransaction(accs, o); o.lot_id = accs[0].positions[0].lots[0].lot_id;
    const t = txn({ id: 'k1', type: 'TRANSFER_IN_KIND', account_id: 'A', counter_account_id: 'B', ticker: 'MSFT', date: '2026-03-01' });
    accs = applyTransaction(accs, t);
    const out = moveOldCopies([], accs, [o, t], AT);
    expect(out.problems).toEqual([]);
    expect(sharesOnRecord(out.record, 'A', 'MSFT')).toBe(0);
    expect(sharesOnRecord(out.record, 'B', 'MSFT')).toBe(3);
    expect(openPurchases(out.record, 'B', 'MSFT')).toEqual([expect.objectContaining({ date: '2025-01-02', shares: 3, price: 100 })]);
    expect(rowsInForce(out.record).filter((r) => r.kind === 'TRANSFER')).toEqual([expect.objectContaining({ accountId: 'A', toAccountId: 'B', shares: 3, date: '2026-03-01' })]);
    expect(moveOldCopies(out.record, accs, [o, t], AT2).record).toEqual(out.record);
  });

  test('20 QQQ bought Jan 10 at $100, the lot edited to $95, 5 sold Mar 10 at $120: the purchase of 20 is kept and corrected to $95, and the sale made 5 × ($120 − $95) = $125', () => {
    let accs: any[] = [typed('E')];
    const b = txn({ id: 'b1', type: 'BUY', account_id: 'E', ticker: 'QQQ', shares: 20, price: 100, date: '2026-01-10' });
    accs = applyTransaction(accs, b);
    accs[0].positions[0].lots[0].cost_per_share = 95;
    const s = txn({ id: 's1', type: 'SELL', account_id: 'E', ticker: 'QQQ', shares: 5, price: 120, date: '2026-03-10' });
    accs = applyTransaction(accs, s);
    const out = moveOldCopies([], accs, [b, s], AT);
    expect(out.problems).toEqual([]);
    expect(sharesOnRecord(out.record, 'E', 'QQQ')).toBe(15);
    expect(rowsInForce(out.record).filter((r) => r.kind === 'PURCHASE').map((r) => [r.date, r.shares, r.price, r.replacesRowId != null])).toEqual([['2026-01-10', 20, 95, true]]);
    const sale = rowsInForce(out.record).find((r) => r.kind === 'SALE')!;
    expect(saleGain(out.record, sale.rowId)).toBe(125);
  });

  test('an old option buy of 2 contracts at $5 with no shares-per-contract figure, 1 sold at $8: counted as 200 shares bought and 100 sold, the sale made $300', () => {
    let accs: any[] = [typed('O')];
    const b = txn({ id: 'b', type: 'BUY', account_id: 'O', ticker: 'SPY 261218C600', kind: 'options', shares: 2, price: 5, date: '2026-05-01' });
    const s = txn({ id: 's', type: 'SELL', account_id: 'O', ticker: 'SPY 261218C600', kind: 'options', shares: 1, price: 8, date: '2026-06-01' });
    accs = applyTransaction(accs, b); accs = applyTransaction(accs, s);
    const out = moveOldCopies([], accs, [b, s], AT);
    expect(out.problems).toEqual([]);
    expect(sharesOnRecord(out.record, 'O', 'SPY 261218C600')).toBe(100);
    expect(rowsInForce(out.record).filter((r) => r.kind === 'PURCHASE').map((r) => [r.shares, r.price])).toEqual([[200, 5]]);
    expect(saleGain(out.record, rowsInForce(out.record).find((r) => r.kind === 'SALE')!.rowId)).toBe(300);
  });

  const H = 'Symbol,Quantity,Price Paid $,Last Price $,Value $,Date Acquired\n';
  test('a phone holding a file of 10 AAPL, a $5,000 bond with no quantity and $1,000 cash, dated Jun 21: moved as $3,000 on the file\'s account and $5,000 on the bond\'s own, both on Jun 21', () => {
    const r = importHoldings(H + 'AAPL,10,150,200,2000,01/05/2026\nUS TREASURY BOND 4% 2030,,,,5000,\nCASH,,,,1000,\nGenerated at Jun 21 2026 03:37 PM ET\n');
    const main = { ...importedAccountOf(r, { institution: 'Fid', name: '', nowIso: '2026-06-22T10:00:00Z' }), asset_id: 'main' };
    const bond = { ...valueOnlyAccountsOf(r, { institution: 'Fid', nowIso: '2026-06-22T10:00:00Z' })[0], asset_id: 'bond' };
    const out = moveOldCopies([], [main, bond], [], AT);
    expect(valuesNow(out.record, 'main')).toMatchObject({ date: '2026-06-21', total: 3000 });
    expect(valuesNow(out.record, 'bond')).toMatchObject({ date: '2026-06-21', total: 5000, source: 'file' });
  });

  test('a file with no date, imported Jun 22: its values and tax lots are moved undated, never on Jun 22 — and an account saved before the file\'s date was kept apart from the import day reads the same', () => {
    const r = importHoldings(H + 'AAPL,10,150,200,2000,01/05/2026\nCASH,,,,1000,\n');
    const acct = { ...importedAccountOf(r, { institution: 'Fid', name: '', nowIso: '2026-06-22T10:00:00Z' }), asset_id: 'nd' } as any;
    // the old copy still shows the import day (phase 2 changes no screen) and says it is not the file's own
    expect([acct.value_as_of, acct.value_as_of_from_file]).toEqual(['2026-06-22', false]);
    const out = moveOldCopies([], [acct], [], AT);
    const dates = rowsInForce(out.record).filter((x) => x.kind === 'VALUE').map((x) => x.date);
    expect(dates.length).toBeGreaterThan(0);
    expect(dates.every((d) => d == null)).toBe(true);
    expect(rowsInForce(out.record).filter((x) => x.kind === 'PURCHASE').map((x) => x.stillHeldOn ?? null)).toEqual([null]);
    // an older phone's account: "Value as of" filled with the import day, and no word on where it came from
    const old = { ...acct, value_as_of: '2026-06-22', value_as_of_from_file: undefined, last_synced: '2026-06-22T10:00:00Z' };
    const outOld = moveOldCopies([], [old], [], AT);
    expect(rowsInForce(outOld.record).filter((x) => x.kind === 'VALUE').every((x) => x.date == null)).toBe(true);
    // the same older account whose "Value as of" is not its import day kept the file's date: it is trusted
    const dated = moveOldCopies([], [{ ...old, value_as_of: '2026-06-21' }], [], AT);
    expect(valuesNow(dated.record, 'nd')?.date).toBe('2026-06-21');
  });
});
