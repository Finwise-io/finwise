/* THE STORE ACTIONS FOR ANSWERS (design v02 of 2026-11-12, step 4 and step 8): answerAssetRecordQuestion writes the
 * answer and then asks every kept question again; confirmMyChange writes the C1 correction at once; the broker sync and
 * a typed change ask every kept question again after they write. Called as the app calls them. */
jest.mock('../services/marketData', () => ({ ...jest.requireActual('../services/marketData'), fetchPriceSeries: jest.fn(async () => ({})) }));
import { useStore } from '../store/useStore';
import { openPurchases, questionsOf, confirmMyChangeQuestion } from '../../MoneyKeel/functions/networth-and-performance/asset-record';

const st = () => useStore.getState() as any;
beforeEach(() => {
  useStore.setState({ assetAccounts: [], transactions: [], liabilities: [], priceCache: {}, txnFlags: [], allocatedByMonth: {},
    snaptradeConnections: [], snaptradeSeenKeys: {}, wrapperConfirmQueue: [], assetRecord: [], assetRecordQuestions: {}, assetRecordFaults: [] } as any);
});
afterEach(() => expect(st().assetRecordFaults).toEqual([]));

const sym = (t: string) => ({ id: 'u-' + t, raw_symbol: t, symbol: t, description: t, type: { code: 'cs' } });
const acct = (day: string) => ({ id: 'sa1', brokerage_authorization: 'c1', name: 'X', number: '1', institution_name: 'Robinhood', raw_type: 'Individual',
  balance: { total: { amount: null } }, sync_status: { holdings: { initial_sync_completed: true, last_successful_sync: day } } });
const lot = (d: string, q: number, p: number) => ({ original_purchase_date: d + 'T00:00:00Z', purchase_date: d + 'T00:00:00Z', quantity: q, purchased_price: p, cost_per_share: p });
const pos = (t: string, units: number, price: number, lots: any[]) => ({ symbol: sym(t), units, price, average_purchase_price: lots[0].purchased_price, tax_lots: lots });
const act = (id: string, type: string, t: string, d: string, units: number, price: number) =>
  ({ id, type, trade_date: d, settlement_date: d, units, price, amount: type === 'BUY' ? -units * price : units * price, fee: 0, symbol: sym(t), description: `${type} ${t}` });
const sync = (day: string, positions: any[], activities: any[]) =>
  st().ingestSnapTradeSync([{ account: acct(day), balancesCash: 0, positions, activities }], [{ id: 'c1', brokerage: 'Robinhood', disabled: false }]);
const accountId = () => String(st().assetAccounts.find((a: any) => a.snaptrade_account_id === 'sa1').asset_id);

test('the broker resends 100 NVDA at $101 against $100: answerAssetRecordQuestion "Change" gives $101, switching to "Keep mine" gives $100, and the question is gone from the store', () => {
  const buy = act('nb', 'BUY', 'NVDA', '2025-06-01', 100, 100);
  sync('2026-01-05', [pos('NVDA', 100, 150, [lot('2025-06-01', 100, 100)])], [buy]);
  sync('2026-01-12', [pos('NVDA', 100, 150, [lot('2025-06-01', 100, 100)])], [{ ...buy, price: 101, amount: -10100 }]);
  const id = accountId();
  const q = questionsOf(st().assetRecord, st().assetRecordQuestions, id).find((x) => x.kind === 'E1')!;
  expect(q).toBeDefined();
  expect(st().answerAssetRecordQuestion(id, q, { id: 'change' })).toEqual({ ask: [], told: null });
  expect(openPurchases(st().assetRecord, id, 'NVDA').map((p) => p.price)).toEqual([101]);
  // step 8: the kept question was asked again after the write, and dropped
  expect(st().assetRecordQuestions[id].events).toEqual([]);
  st().answerAssetRecordQuestion(id, q, { id: 'keep-mine' });
  expect(openPurchases(st().assetRecord, id, 'NVDA').map((p) => p.price)).toEqual([100]);
  expect(questionsOf(st().assetRecord, st().assetRecordQuestions, id).filter((x) => x.family === 'event')).toEqual([]);
});

test('confirmMyChange (C1): Robinhood’s $350 for 100 MSFT, he enters $320 — the correction is written at once', () => {
  sync('2026-08-01', [pos('MSFT', 100, 400, [lot('2026-07-30', 100, 350)])], [act('mb', 'BUY', 'MSFT', '2026-07-30', 100, 350)]);
  const id = accountId();
  const row = openPurchases(st().assetRecord, id, 'MSFT')[0];
  const q = confirmMyChangeQuestion(st().assetRecord, row.rowId, { price: 320 }, () => 'Robinhood')!;
  expect(q.sentence).toBe('The information from Robinhood indicates price of 350, you entered 320. Confirm changing price for 100 shares of MSFT to 320.');
  expect(st().confirmMyChange(id, row.rowId, { price: 320 })).toBeNull();
  expect(openPurchases(st().assetRecord, id, 'MSFT').map((p) => p.price)).toEqual([320]);
});
