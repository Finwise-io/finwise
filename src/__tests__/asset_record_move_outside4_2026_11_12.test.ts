/* THE ONE-TIME MOVE, OUTSIDE CHECK 4 (2026-11-12). Six faults an outside checker reproduced, each built through the store
 * as a phone holds it before the update (no record), then the update's own typing, then the move. The rule is DEC-10749
 * (asset-record-move.ts). Every figure here can be worked by hand. */
jest.mock('../services/marketData', () => ({ ...jest.requireActual('../services/marketData'), fetchPriceSeries: jest.fn(async () => ({})) }));
import { useStore, holdTheSwitch, SCREENS_READ_THE_RECORD } from '../store/useStore';
import { importHoldings, importedAccountOf } from '../domain/import/holdingsImport';
import { sharesOnRecord, rowsInForce, saleGain, factsOf, valueBatchesOf } from '../../MoneyKeel/functions/networth-and-performance/asset-record';
import { realizedFromLedger } from '../domain/performance/realized';

const st = () => useStore.getState() as any;
// what a phone from before the update holds is built with the switch held (that build had none); oldPhone() lets it go
beforeEach(() => holdTheSwitch(true));
afterEach(() => holdTheSwitch(false));
beforeEach(() => useStore.setState({ assetAccounts: [], transactions: [], liabilities: [], priceCache: {}, txnFlags: [], allocatedByMonth: {},
  snaptradeConnections: [], wrapperConfirmQueue: [], assetRecord: [], assetRecordQuestions: {}, assetRecordFaults: [] } as any));
const acct = (label: string, extra: any = {}) => {
  st().addAsset({ label, institution: 'X', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, cash_balance: 0, source: 'manual', ...extra });
  return String(st().assetAccounts[0].asset_id);
};
const pos = (id: string, ticker: string) => (st().assetAccounts.find((a: any) => a.asset_id === id)?.positions ?? []).find((p: any) => p.ticker === ticker);
const txn = (o: any) => st().recordTransaction({ source: 'manual', ...o });
// the update opens: with the screens reading the record the phone's accounts are moved at once, before anything is typed
// (the app moves them on its first save after opening); without the switch the move waits for moveTwiceSame below
const oldPhone = () => {
  useStore.setState({ assetRecord: [], assetRecordQuestions: {} } as any);
  holdTheSwitch(false);
  if (SCREENS_READ_THE_RECORD) st().moveOldCopiesToRecordOnce();
};
const rows = (id: string, kind?: string) => rowsInForce(st().assetRecord).filter((r) => r.accountId === id && (kind == null || r.kind === kind));
const gains = (id: string, h: string) => rows(id, 'SALE').filter((r) => r.holding === h).map((r) => saleGain(st().assetRecord, r.rowId));
const H = 'Symbol,Quantity,Price Paid $,Last Price $,Value $,Date Acquired\n';
const moveTwiceSame = () => { st().moveOldCopiesToRecordOnce(); const n = st().assetRecord.length; st().moveOldCopiesToRecordOnce(); expect(st().assetRecord.length).toBe(n); };

test('fault 1 (H10): NVDA sold out with an $800 gain and a $3 dividend, then 5 VOO bought after the update — the move still saves the sale and the dividend', () => {
  const A = acct('H10');
  st().addPosition(A, { ticker: 'NVDA', kind: 'stocks_etf', lots: [{ lot_id: 'h1', shares: 10, cost_per_share: 100, purchase_date: '2024-01-01' }] });
  txn({ type: 'SELL', account_id: A, ticker: 'NVDA', shares: 10, price: 180, date: '2025-01-01', amount: 1800 });
  txn({ type: 'DIVIDEND', account_id: A, ticker: 'NVDA', amount: 3, date: '2024-12-01' });
  oldPhone();
  txn({ type: 'BUY', account_id: A, ticker: 'VOO', shares: 5, price: 500, date: '2026-11-10', amount: 2500 });
  moveTwiceSame();
  expect(gains(A, 'NVDA')).toEqual([800]);                       // 10 × ($180 − $100)
  expect(rows(A, 'DIVIDEND').map((r) => [r.date, r.amount])).toEqual([['2024-12-01', 3]]);
  expect(sharesOnRecord(st().assetRecord, A, 'NVDA')).toBe(0);
  expect(sharesOnRecord(st().assetRecord, A, 'VOO')).toBe(5);    // the buy typed after the update, once
  expect(rows(A, 'PURCHASE').filter((r) => r.holding === 'VOO')).toHaveLength(1);
});

test('fault 1 (H13): the holding editor saved $200 → $205 after the update — the sale keeps $550 and the $25 dividend is saved', () => {
  const A = acct('H13');
  st().addPosition(A, { ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: 'j1', shares: 50, cost_per_share: 200, purchase_date: '2024-01-01' }] });
  txn({ type: 'SELL', account_id: A, ticker: 'VTI', shares: 10, price: 260, date: '2025-01-01', amount: 2600 });
  txn({ type: 'DIVIDEND', account_id: A, ticker: 'VTI', amount: 25, date: '2025-03-01' });
  oldPhone();
  const p = pos(A, 'VTI');
  st().updatePosition(A, p.position_id, { lots: p.lots.map((l: any) => ({ ...l, cost_per_share: 205 })) });
  moveTwiceSame();
  expect(gains(A, 'VTI')).toEqual([550]);                        // 10 × ($260 − $205)
  expect(rows(A, 'DIVIDEND').map((r) => r.amount)).toEqual([25]);
  expect(sharesOnRecord(st().assetRecord, A, 'VTI')).toBe(40);
});

test('fault 1 (H14): a savings balance typed after the update — the $1,000 deposit and the $200 withdrawal are saved, the $6,100 value once', () => {
  const S = acct('H14 savings', { kind: 'savings', balance: 5000, value_as_of: '2025-01-01' });
  txn({ type: 'DEPOSIT', account_id: S, amount: 1000, date: '2025-05-01' });
  txn({ type: 'WITHDRAWAL', account_id: S, amount: 200, date: '2025-08-01' });
  oldPhone();
  st().updateAsset(S, { balance: 6100, value_as_of: '2026-11-10' });
  moveTwiceSame();
  expect(rows(S, 'DEPOSIT').map((r) => [r.date, r.amount])).toEqual([['2025-05-01', 1000]]);
  expect(rows(S, 'WITHDRAWAL').map((r) => [r.date, r.amount])).toEqual([['2025-08-01', 200]]);
  // with the screens reading the record the phone's accounts are moved the moment it opens, before anything is typed: the
  // $5,800 it shows ($5,000 + $1,000 − $200) is saved as of Aug 1, 2025, the last money recorded inside it — the account
  // never held $5,800 on Jan 1. Without the switch the move comes after the $6,100 was typed, and saves that once
  // with the switch the phone's $5,800 ($5,000 + $1,000 − $200) is moved first, as of Aug 1, 2025, the last money recorded
  // inside it (it never held $5,800 on Jan 1); the $6,100 typed after it is its own value. Without it, $6,100 once
  expect(valueBatchesOf(st().assetRecord, S).map((b) => [b.date, b.total]))
    .toEqual(SCREENS_READ_THE_RECORD ? [['2025-08-01', 5000 + 1000 - 200], ['2026-11-10', 6100]] : [['2026-11-10', 6100]]);
});

test('fault 2 (H12): a file re-imported after the update — the move saves the $320 sale and the $2.40 dividend, and not the file twice', () => {
  const r = importHoldings(H + 'AAPL,10,150,200,2000,01/05/2026\nCASH,,,,1000,\nGenerated at Jun 21 2026 03:37 PM ET\n');
  st().addAsset(importedAccountOf(r, { institution: 'Fid', name: 'Ind' }));
  const I = String(st().assetAccounts[0].asset_id);
  txn({ type: 'SELL', account_id: I, ticker: 'AAPL', shares: 4, price: 230, date: '2026-07-10', amount: 920 });
  txn({ type: 'DIVIDEND', account_id: I, ticker: 'AAPL', amount: 2.4, date: '2026-08-10' });
  oldPhone();
  const r2 = importHoldings(H + 'AAPL,6,150,240,1440,01/05/2026\nCASH,,,,1922.4,\nGenerated at Nov 10 2026 03:37 PM ET\n');
  st().updateAsset(I, importedAccountOf(r2, { institution: 'Fid', name: 'Ind' }));
  st().recordFileImport(r2, I, []);
  const filed = st().assetRecord.length;
  moveTwiceSame();
  // the move ran once: without the switch at the line below; with it, on the first save after the update (the file's)
  expect(rows(I, 'FACT').filter((x) => x.ref === `moved-from-phone:${I}`)).toHaveLength(1);
  expect(st().assetRecord.length).toBeGreaterThanOrEqual(filed);
  expect(gains(I, 'AAPL')).toEqual([320]);                       // 4 × ($230 − $150)
  expect(rows(I, 'DIVIDEND').map((r) => r.amount)).toEqual([2.4]);
  expect(sharesOnRecord(st().assetRecord, I, 'AAPL')).toBe(6);
  expect(valueBatchesOf(st().assetRecord, I).map((b) => [b.date, b.total])).toEqual([['2026-11-10', 3362.4]]);   // 6 × $240 + $1,922.40, once
  // with the switch the move came before the second file: the Jun 21 file's values are not known (the account was traded
  // after it) and none were moved — the Nov 10 file's own values are on record beside that note. Without it, no note
  if (SCREENS_READ_THE_RECORD) expect(String(factsOf(st().assetRecord, I, null).fileValuesNotMoved)).toContain('2026-06-21');
  else expect(factsOf(st().assetRecord, I, null).fileValuesNotMoved).toBeUndefined();
});

test('fault 3 (H15): a file of 10 AAPL at $150 on Jun 21, edited to 12 at $140 — no value is saved under Jun 21, and the $140 lot is typed', () => {
  const r = importHoldings(H + 'AAPL,10,150,200,2000,01/05/2026\nCASH,,,,1000,\nGenerated at Jun 21 2026 03:37 PM ET\n');
  st().addAsset(importedAccountOf(r, { institution: 'Fid', name: 'Ind' }));
  const I = String(st().assetAccounts[0].asset_id);
  const p = pos(I, 'AAPL');
  st().updatePosition(I, p.position_id, { lots: p.lots.map((l: any) => ({ ...l, shares: 12, cost_per_share: 140 })) });
  oldPhone();
  moveTwiceSame();
  expect(valueBatchesOf(st().assetRecord, I)).toEqual([]);
  expect(String(factsOf(st().assetRecord, I, null).fileValuesNotMoved)).toContain('2026-06-21');
  expect(rows(I, 'PURCHASE').map((x) => [x.date, x.shares, x.price, x.source, x.stillHeldOn ?? null])).toEqual([['2026-01-05', 12, 140, 'typed', null]]);
});

test('fault 3, the other side (H8): a file never touched keeps its Jun 21 values and its lots as the file’s', () => {
  const r = importHoldings(H + 'AAPL,10,150,200,2000,01/05/2026\nCASH,,,,1000,\nGenerated at Jun 21 2026 03:37 PM ET\n');
  st().addAsset(importedAccountOf(r, { institution: 'Fid', name: 'Ind' }));
  const I = String(st().assetAccounts[0].asset_id);
  oldPhone();
  moveTwiceSame();
  expect(valueBatchesOf(st().assetRecord, I).map((b) => [b.date, b.total])).toEqual([['2026-06-21', 3000]]);
  expect(rows(I, 'PURCHASE').map((x) => [x.shares, x.price, x.source, x.stillHeldOn])).toEqual([[10, 150, 'file', '2026-06-21']]);
});

test('fault 4 (H2): a sale of 8 where the app matches 3 shares and counts $120 — the record keeps the $120 and asks only about the other 5', () => {
  const A = acct('H2');
  st().addPosition(A, { ticker: 'AAPL', kind: 'stocks_etf', lots: [{ lot_id: 'b1', shares: 10, cost_per_share: 150, purchase_date: '2024-03-01' }] });
  txn({ type: 'BUY', account_id: A, ticker: 'AAPL', shares: 5, price: 170, date: '2024-08-01', amount: 850 });
  txn({ type: 'SELL', account_id: A, ticker: 'AAPL', shares: 6, price: 200, date: '2025-01-10', amount: 1200 });
  const p = pos(A, 'AAPL');
  st().updatePosition(A, p.position_id, { lots: p.lots.map((l: any) => ({ ...l })) });
  // a phone that ran the holding editor before 2026-11-12: its unchanged save rewrote the part-sold purchase's opening
  // record to the 4 shares left (the editor no longer does; outside check, 2026-11-12), so the app matches 3 of the 8
  useStore.setState({ transactions: st().transactions.map((t: any) => (t.type === 'OPENING_POSITION' && t.lot_id === 'b1' ? { ...t, shares: 4 } : t)) } as any);
  txn({ type: 'SELL', account_id: A, ticker: 'AAPL', shares: 8, price: 210, date: '2025-05-10', amount: 1680 });
  oldPhone();
  moveTwiceSame();
  const app = realizedFromLedger(st().transactions, { ticker: 'AAPL', accountId: A, holding: pos(A, 'AAPL') });
  expect(app.realizedAllTime).toBe(380);
  const may = rows(A, 'SALE').filter((r) => r.date === '2025-05-10');
  expect(may.map((r) => [r.shares, saleGain(st().assetRecord, r.rowId)])).toEqual([[3, 120], [5, null]]);
  expect(gains(A, 'AAPL').reduce((t: number, g) => t + (g ?? 0), 0)).toBeCloseTo(380, 9);
  expect(sharesOnRecord(st().assetRecord, A, 'AAPL')).toBe(sharesOfPhone(A, 'AAPL'));
  const said = st().assetRecordQuestions[`${A}#moved`].unexplained as string[];
  expect(said).toHaveLength(1);
  expect(said[0]).toContain('5 of the shares');
});
const sharesOfPhone = (id: string, h: string) => (pos(id, h)?.lots ?? []).reduce((t: number, l: any) => t + l.shares, 0);

test('fault 5 (H5): a bond sale of $4,000 face at 101 is saved in the lots’ units — 4,000 at $1.01, $120 gained', () => {
  const A = acct('H5');
  st().addPosition(A, { ticker: 'UST 4% 2030', kind: 'bonds', price_quote: 'per_100_of_face', face_value: 10000, lots: [{ lot_id: 'd1', shares: 10000, cost_per_share: 98, purchase_date: '2025-01-15' }] });
  txn({ type: 'SELL', account_id: A, ticker: 'UST 4% 2030', kind: 'bonds', shares: 4000, price: 101, date: '2026-02-01', amount: 4040 });
  oldPhone();
  moveTwiceSame();
  const sale = rows(A, 'SALE')[0];
  expect([sale.shares, sale.price]).toEqual([4000, 1.01]);
  expect(saleGain(st().assetRecord, sale.rowId)).toBeCloseTo(120, 9);   // 4,000 × ($1.01 − $0.98)
  expect(sharesOnRecord(st().assetRecord, A, 'UST 4% 2030')).toBe(6000);
});

test('fault 6 (H6): 15 QQQ moved A → B whole, then B sold 4 — the transfer is 15, A holds 15 before May 1, B 11 after its sale', () => {
  const A = acct('H6a'), B = acct('H6b');
  st().addPosition(A, { ticker: 'QQQ', kind: 'stocks_etf', lots: [{ lot_id: 'e1', shares: 10, cost_per_share: 300, purchase_date: '2024-01-10' }, { lot_id: 'e2', shares: 5, cost_per_share: 350, purchase_date: '2024-07-10' }] });
  txn({ type: 'TRANSFER_IN_KIND', account_id: A, counter_account_id: B, ticker: 'QQQ', date: '2025-05-01', position_id: pos(A, 'QQQ').position_id });
  txn({ type: 'SELL', account_id: B, ticker: 'QQQ', shares: 4, price: 450, date: '2025-08-01', amount: 1800 });
  oldPhone();
  moveTwiceSame();
  const rec = st().assetRecord;
  expect(rows(A, 'TRANSFER').map((r) => r.shares)).toEqual([15]);
  expect(sharesOnRecord(rec, A, 'QQQ', '2025-04-30')).toBe(15);
  expect(sharesOnRecord(rec, A, 'QQQ')).toBe(0);
  expect(sharesOnRecord(rec, B, 'QQQ')).toBe(11);
  const app = realizedFromLedger(st().transactions, { ticker: 'QQQ', accountId: B, holding: pos(B, 'QQQ') });
  // the app has no purchase of QQQ in B behind the sale (the shares came by the transfer), so it counts no gain: the
  // record shows none either, and asks
  expect([app.realizedAllTime, app.shortOfPurchases.map((x: any) => [x.sold, x.matched])]).toEqual([0, [[4, 0]]]);
  expect(gains(B, 'QQQ')).toEqual([null]);
});

test('fault 1, the other side: an account typed whole after the update (20 KO at $50, 5 sold at $60) is moved with nothing saved twice — 15 shares, $50', () => {
  oldPhone();
  const A = acct('typed after');
  st().addPosition(A, { ticker: 'KO', kind: 'stocks_etf', lots: [{ lot_id: 'k1', shares: 20, cost_per_share: 50, purchase_date: '2024-01-01' }] });
  txn({ type: 'SELL', account_id: A, ticker: 'KO', shares: 5, price: 60, date: '2025-01-01', amount: 300 });
  moveTwiceSame();
  expect(sharesOnRecord(st().assetRecord, A, 'KO')).toBe(15);
  expect(gains(A, 'KO')).toEqual([50]);                          // 5 × ($60 − $50)
  expect(rows(A, 'PURCHASE')).toHaveLength(1);
});

test('fault 1: 6 KO bought and 6 sold after the update, the phone selling the older 20 first — 20 left, the sale’s gain the app’s $60', () => {
  const A = acct('mixed');
  st().addPosition(A, { ticker: 'KO', kind: 'stocks_etf', lots: [{ lot_id: 'k1', shares: 20, cost_per_share: 50, purchase_date: '2024-01-01' }] });
  oldPhone();
  txn({ type: 'BUY', account_id: A, ticker: 'KO', shares: 6, price: 55, date: '2026-11-05', amount: 330 });
  txn({ type: 'SELL', account_id: A, ticker: 'KO', shares: 6, price: 60, date: '2026-11-06', amount: 360 });
  moveTwiceSame();
  expect(sharesOfPhone(A, 'KO')).toBe(20);
  expect(sharesOnRecord(st().assetRecord, A, 'KO')).toBe(20);
  expect(gains(A, 'KO')).toEqual([60]);                          // 6 × ($60 − $50), oldest first
});
