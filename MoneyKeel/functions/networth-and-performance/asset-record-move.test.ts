/* WHAT A PHONE ALREADY HOLDS, MOVED ONTO THE MASTER RECORD ONCE (phase 2, step 6, 2026-11-11; the rule of DEC-10749,
 * 2026-11-12: what is held now is the tax lots as the phone shows them, and each past sale is saved on its own date with
 * the gain the app shows, selling a purchase saved behind it). Each case states the old copies — the account, its tax
 * lots and its activity — so every share count and gain can be worked by hand. */
jest.mock('../../../src/services/marketData', () => ({ ...jest.requireActual('../../../src/services/marketData'), fetchPriceSeries: jest.fn(async () => ({})) }));
import { moveOldCopies } from './asset-record-move';
import { factsOf, openPurchases, rowsInForce, saleGain, sharesOnRecord, valueBatchesOf, valuesNow, valuesOn, type AssetRow } from './asset-record';
import { realizedFromLedger } from '../../../src/domain/performance/realized';

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

test('100 VTI first entered at $80, then bought 20 at $100, sold 5 at $120 — the phone shows 95 + 20 = 115: the lots are moved as they stand, and the sale sells 5 bought behind it, keeping its $200', () => {
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
  expect(rowsInForce(out.record).filter((r) => r.kind === 'PURCHASE').map((r) => [r.date, r.shares, r.price, r.facts?.behindSaleBeforeRecord ?? false]))
    .toEqual([['2025-03-03', 95, 80, false], ['2026-10-01', 20, 100, false], [null, 5, 80, true]]);
  // the sale keeps what the app shows it made: 5 × ($120 − $80) = $200, on its own date
  const sale = rowsInForce(out.record).find((r) => r.kind === 'SALE')!;
  expect([sale.date, sale.shares, saleGain(out.record, sale.rowId)]).toEqual(['2026-10-15', 5, 200]);
  expect(realizedFromLedger(ledger, { ticker: 'VTI', accountId: 'van' }).realizedAllTime).toBe(200);
});

test('lots entered before opening records were kept: 100 VTI at $80 with no opening record, and a buy of 20 — the phone shows 120: the two lots are moved, once each', () => {
  const acct = { asset_id: 'van', label: 'Brokerage', kind: 'brokerage', balance: 0, source: 'manual', positions: [{ position_id: 'p', ticker: 'VTI', kind: 'stocks_etf',
    lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 80, purchase_date: '2025-03-03' }, { lot_id: 'l2', shares: 20, cost_per_share: 100, purchase_date: '2026-10-01' }] }] } as any;
  const out = moveOldCopies([], [acct], [txn({ id: 'b1', type: 'BUY', account_id: 'van', ticker: 'VTI', shares: 20, price: 100, date: '2026-10-01' })], AT);
  expect(sharesOnRecord(out.record, 'van', 'VTI')).toBe(120);
  expect(rowsInForce(out.record).filter((r) => r.kind === 'PURCHASE').map((r) => [r.date, r.shares, r.price])).toEqual([['2025-03-03', 100, 80], ['2026-10-01', 20, 100]]);
  expect(out.problems).toEqual([]);
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

  test('20 QQQ bought Jan 10 at $100, the lot edited to $95, 5 sold Mar 10 at $120: the 15 held are moved at $95, and the sale keeps the $100 the app shows (its purchase record still says $100)', () => {
    let accs: any[] = [typed('E')];
    const b = txn({ id: 'b1', type: 'BUY', account_id: 'E', ticker: 'QQQ', shares: 20, price: 100, date: '2026-01-10' });
    accs = applyTransaction(accs, b);
    accs[0].positions[0].lots[0].cost_per_share = 95;
    const s = txn({ id: 's1', type: 'SELL', account_id: 'E', ticker: 'QQQ', shares: 5, price: 120, date: '2026-03-10' });
    accs = applyTransaction(accs, s);
    const out = moveOldCopies([], accs, [b, s], AT);
    expect(out.problems).toEqual([]);
    expect(sharesOnRecord(out.record, 'E', 'QQQ')).toBe(15);
    expect(openPurchases(out.record, 'E', 'QQQ').map((p) => [p.date, p.shares, p.price])).toEqual([['2026-01-10', 15, 95]]);
    const sale = rowsInForce(out.record).find((r) => r.kind === 'SALE')!;
    expect(realizedFromLedger([b, s], { ticker: 'QQQ', accountId: 'E' }).realizedAllTime).toBe(100);
    expect(saleGain(out.record, sale.rowId)).toBe(100);
  });

  test('an old option buy of 2 contracts at $5 with no shares-per-contract figure, 1 sold at $8: counted as 200 shares bought and 100 sold, the sale made $300', () => {
    let accs: any[] = [typed('O')];
    const b = txn({ id: 'b', type: 'BUY', account_id: 'O', ticker: 'SPY 261218C600', kind: 'options', shares: 2, price: 5, date: '2026-05-01' });
    const s = txn({ id: 's', type: 'SELL', account_id: 'O', ticker: 'SPY 261218C600', kind: 'options', shares: 1, price: 8, date: '2026-06-01' });
    accs = applyTransaction(accs, b); accs = applyTransaction(accs, s);
    const out = moveOldCopies([], accs, [b, s], AT);
    expect(out.problems).toEqual([]);
    expect(sharesOnRecord(out.record, 'O', 'SPY 261218C600')).toBe(100);
    // the contract held (100 shares at $5) and the contract sold, bought behind the sale at $5
    expect(rowsInForce(out.record).filter((r) => r.kind === 'PURCHASE').map((r) => [r.shares, r.price, r.facts?.behindSaleBeforeRecord ?? false])).toEqual([[100, 5, false], [100, 5, true]]);
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

describe('outside check 2, 2026-11-12', () => {
  const { importHoldings, importedAccountOf } = require('../../../src/domain/import/holdingsImport');
  const { openingRecordsOf } = require('../../../src/domain/transactions');
  const { typedChangeToRecord } = require('./asset-record-from-typed');

  test('a file with two lots of AAPL — 5 at $100 bought Jan 2, 2025 and 5 at $120 bought Jun 1, 2025, dated Jul 1, 2026: both lots moved, 10 held, $1,100 paid', () => {
    const F = ['Symbol,Quantity,Price Paid $,Value $,Acquired', 'AAPL,5,100,1000,01/02/2025', 'AAPL,5,120,1000,06/01/2025', 'CASH,,,300,', 'Generated at Jul 01 2026 03:37 PM ET'].join('\n');
    const acct = { ...importedAccountOf(importHoldings(F), { institution: 'X', name: '', nowIso: '2026-11-04T18:00:00.000Z' }), asset_id: 'imp' } as any;
    const openings = acct.positions.flatMap((p: any) => openingRecordsOf('imp', p)).map((t: any) => ({ ...t, created_at: t.created_at ?? '2026-11-04T18:00:00.000Z' }));
    for (const ledger of [openings, []]) {
      const out = moveOldCopies([], [acct], ledger, AT);
      expect(sharesOnRecord(out.record, 'imp', 'AAPL')).toBe(10);
      expect(openPurchases(out.record, 'imp', 'AAPL').map((p) => [p.date, p.shares, p.price])).toEqual([['2025-01-02', 5, 100], ['2025-06-01', 5, 120]]);
      expect(out.problems).toEqual([]);
    }
  });

  describe('10 MSFT first entered Jan 2, 2025 at $200, bought 5 Jun 1 at $250, sold 4 Sep 1 at $300 (the sale made 4 × $100 = $400)', () => {
    let n = 0;
    const t = (o: Record<string, unknown>) => txn({ id: `m${++n}`, created_at: `2026-11-01T00:00:0${n}.000Z`, ...o });
    const ledger = [
      t({ type: 'OPENING_POSITION', account_id: 'M', ticker: 'MSFT', shares: 10, price: 200, date: '2025-01-02', lot_id: 'l1' }),
      t({ type: 'BUY', account_id: 'M', ticker: 'MSFT', shares: 5, price: 250, date: '2025-06-01' }),
      t({ type: 'SELL', account_id: 'M', ticker: 'MSFT', shares: 4, price: 300, date: '2025-09-01' }),
    ];
    const acct = (lots: any[]) => [{ asset_id: 'M', label: 'M', kind: 'brokerage', balance: 0, source: 'manual', positions: [{ position_id: 'p', ticker: 'MSFT', kind: 'stocks_etf', lots }] }] as any;
    const gains = (rec: AssetRow[]) => rowsInForce(rec).filter((r) => r.kind === 'SALE').map((s) => [s.date, s.shares, saleGain(rec, s.rowId)]);

    test('the phone\'s first lot dated Jan 3: the lots are moved as the phone shows them, and the sale keeps its $400', () => {
      const out = moveOldCopies([], acct([{ lot_id: 'l1', shares: 6, cost_per_share: 200, purchase_date: '2025-01-03' }, { lot_id: 'l2', shares: 5, cost_per_share: 250, purchase_date: '2025-06-01' }]), ledger, AT);
      expect(out.problems).toEqual([]);
      expect(sharesOnRecord(out.record, 'M', 'MSFT')).toBe(11);
      expect(gains(out.record)).toEqual([['2025-09-01', 4, 400]]);
      expect(openPurchases(out.record, 'M', 'MSFT').map((p) => [p.date, p.shares, p.price])).toEqual([['2025-01-03', 6, 200], ['2025-06-01', 5, 250]]);
    });

    test('the phone\'s first lot with no date: the lot is moved with no date, never one the phone did not show, and the sale keeps its $400', () => {
      const out = moveOldCopies([], acct([{ lot_id: 'l1', shares: 6, cost_per_share: 200, purchase_date: '' }, { lot_id: 'l2', shares: 5, cost_per_share: 250, purchase_date: '2025-06-01' }]), ledger, AT);
      expect(out.problems).toEqual([]);
      expect(gains(out.record)).toEqual([['2025-09-01', 4, 400]]);
      expect(openPurchases(out.record, 'M', 'MSFT').map((p) => [p.date, p.shares, p.price])).toEqual([[null, 6, 200], ['2025-06-01', 5, 250]]);
    });

    test('a 2-for-1 split typed as lot edits (12 at $100, 10 at $125): the 22 shares the phone shows are moved, and the sale keeps its $400', () => {
      const out = moveOldCopies([], acct([{ lot_id: 'l1', shares: 12, cost_per_share: 100, purchase_date: '2025-01-02' }, { lot_id: 'l2', shares: 10, cost_per_share: 125, purchase_date: '2025-06-01' }]), ledger, AT);
      expect(gains(out.record)).toEqual([['2025-09-01', 4, 400]]);
      expect(sharesOnRecord(out.record, 'M', 'MSFT')).toBe(22);
      expect(out.ask.flatMap((a) => a.lists)).toEqual([]);
      expect(out.problems).toEqual([]);
    });
  });

  test('100 VTI typed by hand, and a $25 dividend saved to the record before the move ran: the move still moves the account — 100 VTI held, the dividend saved once — and opening again moves nothing', () => {
    const acct = { asset_id: 'A', label: 'A', kind: 'brokerage', balance: 10_000, source: 'manual', value_as_of: '2026-09-01',
      positions: [{ position_id: 'p', ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 80, purchase_date: '2025-03-03' }] }] } as any;
    const opening = txn({ id: 'o1', type: 'OPENING_POSITION', account_id: 'A', ticker: 'VTI', shares: 100, price: 80, date: '2025-03-03', lot_id: 'l1' });
    const div = txn({ id: 'd1', type: 'DIVIDEND', account_id: 'A', ticker: 'VTI', amount: 25, date: '2026-11-12', created_at: '2026-11-12T08:00:00Z' });
    const before = typedChangeToRecord([], { kind: 'transaction-recorded', transaction: div }, AT).record;
    const out = moveOldCopies(before, [acct], [opening, div], AT2);
    expect(out.moved).toEqual(['A']);
    expect(sharesOnRecord(out.record, 'A', 'VTI')).toBe(100);
    expect(rowsInForce(out.record).filter((r) => r.kind === 'DIVIDEND').map((r) => r.amount)).toEqual([25]);
    const again = moveOldCopies(out.record, [acct], [opening, div], '2026-11-12T12:00:00.000Z');
    expect(again.moved).toEqual([]);
    expect(again.record).toEqual(out.record);
  });

  test('an account moved before the move wrote its own mark (its 100 VTI and its value already on record): it is not moved again', () => {
    const acct = { asset_id: 'A', label: 'A', kind: 'brokerage', balance: 10_000, source: 'manual', value_as_of: '2026-09-01',
      positions: [{ position_id: 'p', ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 80, purchase_date: '2025-03-03' }] }] } as any;
    const opening = txn({ id: 'o1', type: 'OPENING_POSITION', account_id: 'A', ticker: 'VTI', shares: 100, price: 80, date: '2025-03-03', lot_id: 'l1' });
    const moved = moveOldCopies([], [acct], [opening], AT).record;
    const unmarked = moved.filter((r) => !(r.kind === 'FACT' && r.ref === 'moved-from-phone:A'));
    expect(unmarked.length).toBeLessThan(moved.length);
    const again = moveOldCopies(unmarked, [acct], [opening], AT2);
    expect(again.moved).toEqual([]);
    expect(again.record).toEqual(unmarked);
  });
});

describe('the rule of DEC-10749, 2026-11-12: the lots as the phone shows them, and each sale with the gain the app shows', () => {
  const { useStore } = require('../../../src/store/useStore');
  const { importHoldings, importedAccountOf } = require('../../../src/domain/import/holdingsImport');
  const st = () => useStore.getState() as any;
  beforeEach(() => useStore.setState({ assetAccounts: [], transactions: [], liabilities: [], priceCache: {}, txnFlags: [], allocatedByMonth: {},
    snaptradeConnections: [], wrapperConfirmQueue: [], assetRecord: [], assetRecordQuestions: {}, assetRecordFaults: [] } as any));
  // a phone from before the record: everything typed, then the record emptied, as an old copy arrives
  const oldPhone = () => useStore.setState({ assetRecord: [], assetRecordQuestions: {}, assetRecordFaults: [] } as any);
  const typed = (label: string) => { st().addAsset({ label, kind: 'brokerage', balance: 0, cash_balance: 0, source: 'manual', positions: [], derive_balance: true }); return String(st().assetAccounts.find((a: any) => a.label === label).asset_id); };
  const lotsShown = (id: string, h: string) => (st().assetAccounts.find((a: any) => String(a.asset_id) === id)?.positions ?? []).filter((p: any) => p.ticker === h)
    .flatMap((p: any) => p.lots).reduce((t: number, l: any) => t + l.shares, 0);
  const sales = (id: string) => rowsInForce(st().assetRecord).filter((r) => r.kind === 'SALE' && r.accountId === id).map((r) => [r.date, r.shares, saleGain(st().assetRecord, r.rowId)]);
  const F4800 = ['Symbol,Quantity,Price Paid $,Last Price $,Value $,Acquired', 'AAPL,10,150,180,1800,01/02/2025', 'MSFT,5,300,400,2000,03/01/2025', 'CASH,,,,1000,', 'Generated at Jun 21 2026 03:37 PM ET'].join('\n');

  test('(a) VTI typed as 10 at $100 (2024-01-10), 10 at $110 (2024-06-10), 10 at $120 (2025-01-10); 15 sold at $150; the holding editor saved unchanged; 5 bought at $130; 3 sold at $140: the 17 shares the phone shows, and two sales with the gains the app shows', () => {
    const T = typed('T');
    st().addPosition(T, { ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: 'a', shares: 10, cost_per_share: 100, purchase_date: '2024-01-10' },
      { lot_id: 'b', shares: 10, cost_per_share: 110, purchase_date: '2024-06-10' }, { lot_id: 'c', shares: 10, cost_per_share: 120, purchase_date: '2025-01-10' }] });
    st().recordTransaction({ type: 'SELL', account_id: T, ticker: 'VTI', shares: 15, price: 150, date: '2025-06-01' });
    const p = st().assetAccounts[0].positions[0];
    st().updatePosition(T, p.position_id, { lots: p.lots });
    st().recordTransaction({ type: 'BUY', account_id: T, ticker: 'VTI', shares: 5, price: 130, date: '2025-08-01' });
    st().recordTransaction({ type: 'SELL', account_id: T, ticker: 'VTI', shares: 3, price: 140, date: '2025-09-01' });
    oldPhone();
    st().moveOldCopiesToRecordOnce();
    expect(lotsShown(T, 'VTI')).toBe(17);
    expect(sharesOnRecord(st().assetRecord, T, 'VTI')).toBe(17);
    expect(openPurchases(st().assetRecord, T, 'VTI').map((x) => [x.date, x.shares, x.price])).toEqual([['2024-06-10', 2, 110], ['2025-01-10', 10, 120], ['2025-08-01', 5, 130]]);
    // the app's reading (the editor's save rewrote the opening records, so its second sale reads $60, not $90): $700 and $60
    expect(realizedFromLedger(st().transactions, { ticker: 'VTI', accountId: T }).realizedAllTime).toBeCloseTo(760, 9);
    const got = sales(T);
    expect(got.map(([d, n]) => [d, n])).toEqual([['2025-06-01', 15], ['2025-09-01', 3]]);
    expect(got[0][2]).toBeCloseTo(700, 9);
    expect(got[1][2]).toBeCloseTo(60, 9);
    expect(st().assetRecordFaults).toEqual([]);
    const n = st().assetRecord.length;
    st().moveOldCopiesToRecordOnce();
    expect(st().assetRecord).toHaveLength(n);
  });

  test('(b) a file dated Jun 21 listing 100 VTI bought 2025-03-03 at $80, then 20 bought and 5 sold at $120, and 10 bought after the update but before the move: 125 shares, the sale\'s $200 as the app shows it, and no file value on Jun 21', () => {
    const F = ['Symbol,Quantity,Price Paid $,Last Price $,Value $,Acquired', 'VTI,100,80,100,10000,03/03/2025', 'CASH,,,,500,', 'Generated at Jun 21 2026 03:37 PM ET'].join('\n');
    st().addAsset(importedAccountOf(importHoldings(F), { institution: 'Fido', name: 'Imp' }));
    const I = String(st().assetAccounts[0].asset_id);
    st().recordTransaction({ type: 'BUY', account_id: I, ticker: 'VTI', shares: 20, price: 100, date: '2026-07-01' });
    st().recordTransaction({ type: 'SELL', account_id: I, ticker: 'VTI', shares: 5, price: 120, date: '2026-08-15' });
    oldPhone();
    st().recordTransaction({ type: 'BUY', account_id: I, ticker: 'VTI', shares: 10, price: 110, date: '2026-10-01' });
    st().moveOldCopiesToRecordOnce();
    expect(lotsShown(I, 'VTI')).toBe(125);
    expect(sharesOnRecord(st().assetRecord, I, 'VTI')).toBe(125);
    expect(openPurchases(st().assetRecord, I, 'VTI').map((x) => [x.date, x.shares, x.price, x.source])).toEqual([['2025-03-03', 95, 80, 'file'], ['2026-07-01', 20, 100, 'typed'], ['2026-10-01', 10, 110, 'typed']]);
    expect(realizedFromLedger(st().transactions, { ticker: 'VTI', accountId: I }).realizedAllTime).toBe(200);
    expect(sales(I)).toEqual([['2026-08-15', 5, 200]]);
    expect(valuesOn(st().assetRecord, I, '2026-06-21')).toBeNull();
    expect(st().assetRecordFaults).toEqual([]);
  });

  test('(c) the $4,800 file of Jun 21, traded after its date (4 AAPL sold at $200): no $4,980 — no value at all — on Jun 21, and a fact says why', () => {
    st().addAsset(importedAccountOf(importHoldings(F4800), { institution: 'Fido', name: 'Imp' }));
    const I = String(st().assetAccounts[0].asset_id);
    st().recordTransaction({ type: 'SELL', account_id: I, ticker: 'AAPL', shares: 4, price: 200, date: '2026-07-10' });
    oldPhone();
    st().moveOldCopiesToRecordOnce();
    expect(valueBatchesOf(st().assetRecord, I)).toEqual([]);
    expect(String(factsOf(st().assetRecord, I, null).fileValuesNotMoved)).toContain('2026-06-21');
    expect(sharesOnRecord(st().assetRecord, I, 'AAPL')).toBe(6);
    expect(sales(I)).toEqual([['2026-07-10', 4, 200]]);
  });

  test('(c, untouched) the same $4,800 file, not traded since: $4,800 on Jun 21', () => {
    st().addAsset(importedAccountOf(importHoldings(F4800), { institution: 'Fido', name: 'Imp' }));
    const I = String(st().assetAccounts[0].asset_id);
    oldPhone();
    st().moveOldCopiesToRecordOnce();
    expect(valuesNow(st().assetRecord, I)).toMatchObject({ date: '2026-06-21', source: 'file', total: 4800 });
  });

  test('(d) an account deleted before the move — 10 QQQ at $400, 2 sold at $450, a $9 dividend: its rows are moved with the accountRemoved fact, and the sale keeps its $100', () => {
    const D = typed('D');
    st().addPosition(D, { ticker: 'QQQ', kind: 'stocks_etf', lots: [{ lot_id: 'q1', shares: 10, cost_per_share: 400, purchase_date: '2025-02-03' }] });
    st().recordTransaction({ type: 'SELL', account_id: D, ticker: 'QQQ', shares: 2, price: 450, date: '2025-05-01' });
    st().recordTransaction({ type: 'DIVIDEND', account_id: D, ticker: 'QQQ', amount: 9, date: '2025-08-01' });
    st().deleteAsset(D);
    oldPhone();
    st().moveOldCopiesToRecordOnce();
    expect(factsOf(st().assetRecord, D, null).accountRemoved).toBe(true);
    expect(rowsInForce(st().assetRecord).filter((r) => r.accountId === D && r.kind === 'DIVIDEND').map((r) => [r.date, r.amount])).toEqual([['2025-08-01', 9]]);
    expect(sales(D)).toEqual([['2025-05-01', 2, 100]]);
    expect(sharesOnRecord(st().assetRecord, D, 'QQQ')).toBe(0);
  });

  test('a sale the app shows no gain for (5 VTI sold, nothing bought on record): marked on the holding and asked once, never rebuilt — the shares still match the phone', () => {
    const acct = { asset_id: 'U', label: 'U', kind: 'brokerage', balance: 0, source: 'manual', positions: [{ position_id: 'p', ticker: 'VTI', kind: 'stocks_etf',
      lots: [{ lot_id: 'l1', shares: 10, cost_per_share: 80, purchase_date: '2025-03-03' }] }] } as any;
    const out = moveOldCopies([], [acct], [txn({ id: 's1', type: 'SELL', account_id: 'U', ticker: 'VTI', shares: 5, price: 120, date: '2026-10-15' })], AT);
    expect(sharesOnRecord(out.record, 'U', 'VTI')).toBe(10);
    expect(saleGain(out.record, rowsInForce(out.record).find((r) => r.kind === 'SALE')!.rowId)).toBeNull();
    expect(factsOf(out.record, 'U', 'VTI').notExplainedBeforeRecord).toHaveLength(1);
    expect(out.ask).toEqual([expect.objectContaining({ accountId: 'U', unexplained: [expect.stringContaining('The sale of 5 VTI on 2026-10-15')] })]);
  });
});
