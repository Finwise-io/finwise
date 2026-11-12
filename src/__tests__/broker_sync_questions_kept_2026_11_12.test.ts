/* OUTSIDE CHECK, 2026-11-12 — the broker sync, called as the app calls it (ingestSnapTradeSync), with the payloads stated
 * in each test: a question still unanswered is kept by the next sync (never put in place of), asked once, and dropped
 * once the record shows it settled; a sale that may have sold a purchase with no date is asked about. */
jest.mock('../services/marketData', () => ({ ...jest.requireActual('../services/marketData'), fetchPriceSeries: jest.fn(async () => ({})) }));
import { useStore } from '../store/useStore';
import { answerEventQuestion, correctRow, rowsInForce, saleGain } from '../../MoneyKeel/functions/networth-and-performance/asset-record';

const st = () => useStore.getState() as any;
beforeEach(() => {
  useStore.setState({ assetAccounts: [], transactions: [], liabilities: [], priceCache: {}, txnFlags: [], allocatedByMonth: {},
    snaptradeConnections: [], snaptradeSeenKeys: {}, wrapperConfirmQueue: [], assetRecord: [], assetRecordQuestions: {}, assetRecordFaults: [] } as any);
});
afterEach(() => expect(st().assetRecordFaults).toEqual([]));

const sym = (t: string) => ({ id: 'u-' + t, raw_symbol: t, symbol: t, description: t, type: { code: 'cs' } });
const acct = (day: string) => ({ id: 'sa1', brokerage_authorization: 'c1', name: 'X', number: '1', institution_name: 'B', raw_type: 'Individual',
  balance: { total: { amount: null } }, sync_status: { holdings: { initial_sync_completed: true, last_successful_sync: day } } });
const lot = (d: string, q: number, p: number) => ({ original_purchase_date: d + 'T00:00:00Z', purchase_date: d + 'T00:00:00Z', quantity: q, purchased_price: p, cost_per_share: p });
const pos = (t: string, units: number, price: number, lots: any[] | null, avg?: number) =>
  ({ symbol: sym(t), units, price, average_purchase_price: avg ?? (lots?.length ? lots[0].purchased_price : price), ...(lots ? { tax_lots: lots } : {}) });
const act = (id: string, type: string, t: string, d: string, units: number, price: number) =>
  ({ id, type, trade_date: d, settlement_date: d, units, price, amount: type === 'BUY' ? -units * price : units * price, fee: 0, symbol: sym(t), description: `${type} ${t}` });
const sync = (day: string, positions: any[], activities: any[]) =>
  st().ingestSnapTradeSync([{ account: acct(day), balancesCash: 0, positions, activities }], [{ id: 'c1', brokerage: 'B', disabled: false }]);
const accountId = () => String(st().assetAccounts.find((a: any) => a.snaptrade_account_id === 'sa1').asset_id);
const asked = () => st().assetRecordQuestions[accountId()] ?? { events: [], lists: [], sales: [] };

test('100 NVDA bought Jun 1, 2025 at $100; the broker resends the buy at $101, then its window moves on: the $101 question is still asked once, and gone once answered', () => {
  const buy = act('nb', 'BUY', 'NVDA', '2025-06-01', 100, 100);
  sync('2026-01-05', [pos('NVDA', 100, 150, [lot('2025-06-01', 100, 100)])], [buy]);
  expect(asked().events).toHaveLength(0);
  sync('2026-01-12', [pos('NVDA', 100, 150, [lot('2025-06-01', 100, 100)])], [{ ...buy, price: 101, amount: -10100 }]);
  expect(asked().events.map((q: any) => [q.why, q.arriving.price, q.onRecord.price])).toEqual([['price', 101, 100]]);
  sync('2026-01-19', [pos('NVDA', 100, 150, [lot('2025-06-01', 100, 100)])], []);
  expect(asked().events.map((q: any) => [q.why, q.arriving.price, q.onRecord.price])).toEqual([['price', 101, 100]]);
  // the broker sends the $101 again: still one question
  sync('2026-01-26', [pos('NVDA', 100, 150, [lot('2025-06-01', 100, 100)])], [{ ...buy, price: 101, amount: -10100 }]);
  expect(asked().events).toHaveLength(1);
  // answered "mine is correct": the next sync drops it
  st().saveToAssetRecord(answerEventQuestion(asked().events[0], 'mine', st().assetRecord));
  sync('2026-02-02', [pos('NVDA', 100, 150, [lot('2025-06-01', 100, 100)])], []);
  expect(asked().events).toHaveLength(0);
});

test('VTI with no tax lots (100 shares, $150 average, no date), a buy of 50 on Feb 1, 2026, then a sale of 60 on Mar 1: the sale is asked about once, and dropped once answered', () => {
  sync('2026-01-05', [pos('VTI', 100, 200, null, 150)], []);
  const buy = act('cb', 'BUY', 'VTI', '2026-02-01', 50, 210);
  sync('2026-02-05', [pos('VTI', 150, 210, null, 170)], [buy]);
  expect(asked().sales ?? []).toHaveLength(0);
  const sale = act('cx', 'SELL', 'VTI', '2026-03-01', 60, 220);
  sync('2026-03-05', [pos('VTI', 90, 220, null, 170)], [buy, sale]);
  expect((asked().sales ?? []).map((q: any) => [q.holding, q.shares, q.choices.map((c: any) => [c.date, c.shares])]))
    .toEqual([['VTI', 60, [[null, 100], ['2026-02-01', 50]]]]);
  sync('2026-04-05', [pos('VTI', 90, 220, null, 170)], [sale]);
  sync('2026-05-05', [pos('VTI', 90, 230, null, 170)], []);
  expect(asked().sales).toHaveLength(1);
  // answered: the 60 came from the undated 100 → the gain is 60 × ($220 − $150) = $4,200, and the question goes
  const q = asked().sales[0];
  const undated = q.choices.find((c: any) => c.date == null);
  const out = correctRow(st().assetRecord, q.rowId, { sells: [{ rowId: undated.firstRowId, shares: 60 }] } as any, 'typed', '2026-05-06T00:00:00.000Z');
  expect(out.problem ?? null).toBeNull();
  useStore.setState({ assetRecord: out.record } as any);
  const saleRow = rowsInForce(st().assetRecord).find((r: any) => r.kind === 'SALE' && r.holding === 'VTI');
  expect(saleGain(st().assetRecord, saleRow!.rowId)).toBe(4200);
  sync('2026-06-05', [pos('VTI', 90, 230, null, 170)], []);
  expect(asked().sales).toHaveLength(0);
});
