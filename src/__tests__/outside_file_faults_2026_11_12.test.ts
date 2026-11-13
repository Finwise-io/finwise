/* THE OUTSIDE CHECKERS' FIVE FAULTS (2026-11-12), each with the numbers they reproduced. The owner's rules: one master record,
 * every event its own row with its own date, nothing counted twice, re-importing the same file adds nothing; a gain is
 * computed oldest purchase first (DEC-10385, DEC-10471). Every figure here can be worked by hand. */
jest.mock('../services/marketData', () => ({ ...jest.requireActual('../services/marketData'), fetchPriceSeries: jest.fn(async () => ({})) }));
import { useStore } from '../store/useStore';
import { importHoldings, importedAccountOf, valueOnlyAccountsOf } from '../domain/import/holdingsImport';
import { applyTransaction, openingRecordsOf, type Transaction } from '../domain/transactions';
import { realizedFromLedger } from '../domain/performance/realized';
import { fileRowsToSave } from '../../MoneyKeel/functions/networth-and-performance/asset-record-from-file';
import { moveOldCopies } from '../../MoneyKeel/functions/networth-and-performance/asset-record-move';
import { addRows, sharesOnRecord, valueBatchesOf, factsOf } from '../../MoneyKeel/functions/networth-and-performance/asset-record';

const st = () => useStore.getState() as any;
beforeEach(() => useStore.setState({ assetAccounts: [], transactions: [], liabilities: [], priceCache: {}, txnFlags: [], allocatedByMonth: {},
  snaptradeConnections: [], wrapperConfirmQueue: [], assetRecord: [], assetRecordQuestions: {}, assetRecordFaults: [] } as any));

test('fault 1: the Aug 21 file imported, then the same file with its rows in reversed order, adds nothing — one set of values for Aug 21', () => {
  const hdr = 'Symbol,Quantity,Price Paid $,Value $';
  const file = (rows: string[]) => [hdr, ...rows, 'CASH,,,1000', 'Generated at Aug 21 2026 03:37 PM ET'].join('\n');
  const inOrder = file(['AAPL,10,150,2200', 'MSFT,2,300,950', 'GOOG,4,100,500', 'VTI,20,210,5200']);
  const reversed = file(['VTI,20,210,5200', 'GOOG,4,100,500', 'MSFT,2,300,950', 'AAPL,10,150,2200']);
  const rec = addRows([], fileRowsToSave([], importHoldings(inOrder), 'A').rows, '2026-11-12T00:00:00.000Z');
  const again = fileRowsToSave(rec, importHoldings(reversed), 'A');
  expect(again.rows).toHaveLength(0);
  const after = addRows(rec, again.rows, '2026-11-12T01:00:00.000Z');
  expect(valueBatchesOf(after, 'A').filter((b) => b.date === '2026-08-21')).toHaveLength(1);
  expect(valueBatchesOf(after, 'A')[0].total).toBe(9850);
});

describe('fault 2: 40 VTI in account B, 15 of them transferred to account A, then A sells 5', () => {
  let n = 0;
  const txn = (o: any): Transaction => ({ id: `t${++n}`, created_at: `2026-11-01T00:00:${String(n).padStart(2, '0')}.000Z`, source: 'manual', ...o });
  const accounts = () => [
    { asset_id: 'A', label: 'A', kind: 'brokerage', balance: 0, cash_balance: 0, source: 'manual', positions: [] },
    { asset_id: 'B', label: 'B', kind: 'brokerage', balance: 0, cash_balance: 0, source: 'manual', positions: [] },
  ] as any[];
  const shown = (accts: any[], id: string) => (accts.find((a) => a.asset_id === id)?.positions ?? [])
    .filter((p: any) => p.ticker === 'VTI').reduce((t: number, p: any) => t + p.lots.reduce((k: number, l: any) => k + l.shares, 0), 0);

  test('a transfer that states 15 shares moves 15: the phone shows A 10 and B 25, and the record agrees — 35 in all, never more', () => {
    const tx = [
      txn({ type: 'OPENING_POSITION', account_id: 'B', ticker: 'VTI', shares: 40, price: 100, date: '2024-05-05', lot_id: 'l2' }),
      txn({ type: 'TRANSFER_IN_KIND', account_id: 'B', counter_account_id: 'A', ticker: 'VTI', shares: 15, date: '2026-02-05' }),
      txn({ type: 'SELL', account_id: 'A', ticker: 'VTI', shares: 5, price: 150, date: '2026-03-05' }),
    ];
    let accts = accounts();
    accts = applyTransaction(accts, tx[0]);
    const lots = accts.find((a) => a.asset_id === 'B').positions[0].lots;
    for (const t of tx.slice(1)) accts = applyTransaction(accts, t);
    expect(shown(accts, 'A')).toBe(10);
    expect(shown(accts, 'B')).toBe(25);
    // the 15 that moved keep their purchase day and price
    expect(accts.find((a) => a.asset_id === 'A').positions[0].lots.map((l: any) => [l.shares, l.cost_per_share, l.purchase_date])).toEqual([[10, 100, '2024-05-05']]);
    expect(lots).toHaveLength(1);
    const out = moveOldCopies([], accts, tx, '2026-11-12T00:00:00.000Z');
    expect(sharesOnRecord(out.record, 'A', 'VTI')).toBe(10);
    expect(sharesOnRecord(out.record, 'B', 'VTI')).toBe(25);
  });

  test('a transfer that states no share count moves the whole holding: A 35, B 0 on the phone and on the record', () => {
    const tx = [
      txn({ type: 'OPENING_POSITION', account_id: 'B', ticker: 'VTI', shares: 40, price: 100, date: '2024-05-05', lot_id: 'l3' }),
      txn({ type: 'TRANSFER_IN_KIND', account_id: 'B', counter_account_id: 'A', ticker: 'VTI', date: '2026-02-05' }),
      txn({ type: 'SELL', account_id: 'A', ticker: 'VTI', shares: 5, price: 150, date: '2026-03-05' }),
    ];
    let accts = accounts();
    for (const t of tx) accts = applyTransaction(accts, t);
    expect([shown(accts, 'A'), shown(accts, 'B')]).toEqual([35, 0]);
    const out = moveOldCopies([], accts, tx, '2026-11-12T00:00:00.000Z');
    expect([sharesOnRecord(out.record, 'A', 'VTI'), sharesOnRecord(out.record, 'B', 'VTI')]).toEqual([35, 0]);
  });
});

test('fault 4: the $5,000 bond row with no quantity keeps the import\'s name and its 4.25% rate and May 15, 2030 maturity when moved', () => {
  const F = ['Symbol,Description,Quantity,Price Paid $,Last Price $,Value $,Acquired',
    'AAPL,Apple,10,100,200,2000,01/05/2026',
    'US TREASURY BOND 4.25% 05/15/2030,Treasury bond,,,,5000,',
    'CASH,,,,,300,', 'Generated at Jul 01 2026 03:37 PM ET'].join('\n');
  const r = importHoldings(F);
  const now = '2026-11-04T18:00:00.000Z';
  const acct: any = { ...importedAccountOf(r, { institution: 'X', name: '', nowIso: now }), asset_id: 'A' };
  const vo: any[] = valueOnlyAccountsOf(r, { institution: 'X', nowIso: now }).map((a, i) => ({ ...a, asset_id: `VO${i}` }));
  const tx = acct.positions.flatMap((p: any) => openingRecordsOf('A', p)).map((t: any) => ({ ...t, created_at: now }));
  const viaImport = addRows([], fileRowsToSave([], r, 'A', ['VO0']).rows, now);
  const viaMove = moveOldCopies([], [acct, ...vo], tx, now).record;
  const NAME = 'US TREASURY BOND 4.25% 05/15/2030';
  for (const rec of [viaImport, viaMove]) {
    expect(valueBatchesOf(rec, 'VO0').map((b) => [b.date, b.total, b.holdings.map((h) => h.holding)])).toEqual([['2026-07-01', 5000, [NAME]]]);
    expect(factsOf(rec, 'VO0', NAME)).toMatchObject({ coupon_rate: 0.0425, maturity_date: '2030-05-15' });
  }
});

test('fault 5: VTI 10 at $100, 10 at $110, 10 at $120; 15 sold at $150; the holding editor saved unchanged; 5 bought at $130; 3 sold at $140 — the gains are $700 and $90', () => {
  st().addAsset({ label: 'T', institution: 'X', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, cash_balance: 0, source: 'manual', positions: [], derive_balance: true });
  const T = String(st().assetAccounts[0].asset_id);
  st().addPosition(T, { ticker: 'VTI', kind: 'stocks_etf', lots: [
    { lot_id: 'a', shares: 10, cost_per_share: 100, purchase_date: '2024-01-10' },
    { lot_id: 'b', shares: 10, cost_per_share: 110, purchase_date: '2024-06-10' },
    { lot_id: 'c', shares: 10, cost_per_share: 120, purchase_date: '2025-01-10' }] });
  st().recordTransaction({ type: 'SELL', account_id: T, ticker: 'VTI', shares: 15, price: 150, date: '2025-06-01' });
  const gainNow = () => realizedFromLedger(st().transactions, { ticker: 'VTI', accountId: T }).realizedAllTime;
  expect(gainNow()).toBeCloseTo(700, 6);
  const p = st().assetAccounts[0].positions.find((x: any) => x.ticker === 'VTI');
  const before = st().transactions;
  st().updatePosition(T, p.position_id, { lots: p.lots.map((l: any) => ({ ...l })) });
  // an unchanged save writes nothing
  expect(st().transactions).toEqual(before);
  expect(gainNow()).toBeCloseTo(700, 6);
  st().recordTransaction({ type: 'BUY', account_id: T, ticker: 'VTI', shares: 5, price: 130, date: '2025-08-01' });
  st().recordTransaction({ type: 'SELL', account_id: T, ticker: 'VTI', shares: 3, price: 140, date: '2025-09-01' });
  // the second sale sells 3 of the 5 left of the $110 purchase: 3 × ($140 − $110) = $90
  expect(gainNow() - 700).toBeCloseTo(90, 6);
});

test('fault 5, a real edit: the $120 purchase re-typed as 12 shares keeps the first sale at $700 and the second sale at $90', () => {
  st().addAsset({ label: 'T', institution: 'X', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, cash_balance: 0, source: 'manual', positions: [], derive_balance: true });
  const T = String(st().assetAccounts[0].asset_id);
  st().addPosition(T, { ticker: 'VTI', kind: 'stocks_etf', lots: [
    { lot_id: 'a', shares: 10, cost_per_share: 100, purchase_date: '2024-01-10' },
    { lot_id: 'b', shares: 10, cost_per_share: 110, purchase_date: '2024-06-10' },
    { lot_id: 'c', shares: 10, cost_per_share: 120, purchase_date: '2025-01-10' }] });
  st().recordTransaction({ type: 'SELL', account_id: T, ticker: 'VTI', shares: 15, price: 150, date: '2025-06-01' });
  const gainNow = () => realizedFromLedger(st().transactions, { ticker: 'VTI', accountId: T }).realizedAllTime;
  const p = st().assetAccounts[0].positions.find((x: any) => x.ticker === 'VTI');
  st().updatePosition(T, p.position_id, { lots: p.lots.map((l: any) => (l.lot_id === 'c' ? { ...l, shares: 12 } : { ...l })) });
  expect(gainNow()).toBeCloseTo(700, 6);
  st().recordTransaction({ type: 'SELL', account_id: T, ticker: 'VTI', shares: 3, price: 140, date: '2025-09-01' });
  expect(gainNow() - 700).toBeCloseTo(90, 6);
  // the phone and the purchases on record less the sales agree: 2 at $110 and 12 at $120
  const lots = st().assetAccounts[0].positions.find((x: any) => x.ticker === 'VTI').lots.map((l: any) => [l.shares, l.cost_per_share]);
  expect(lots).toEqual([[2, 110], [12, 120]]);
});
