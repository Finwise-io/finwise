/* OUTSIDE CHECK, 2026-11-12 — two store actions, called as the screens call them, from the holdings stated in each test:
 * a file's questions are added to the ones still unanswered (never put in their place), and a ticker corrected in the
 * holding editor is recorded. */
jest.mock('../services/marketData', () => ({ ...jest.requireActual('../services/marketData'), fetchPriceSeries: jest.fn(async () => ({})) }));
import { useStore } from '../store/useStore';
import { importHoldings } from '../domain/import/holdingsImport';
import { sharesOnRecord, openPurchases } from '../../MoneyKeel/functions/networth-and-performance/asset-record';

const st = () => useStore.getState() as any;
beforeEach(() => {
  useStore.setState({ assetAccounts: [], transactions: [], liabilities: [], priceCache: {}, txnFlags: [], allocatedByMonth: {},
    snaptradeConnections: [], wrapperConfirmQueue: [], assetRecord: [], assetRecordQuestions: {}, assetRecordFaults: [] } as any);
});
afterEach(() => expect(st().assetRecordFaults).toEqual([]));

const H = 'Symbol,Quantity,Price Paid $,Last Price $,Value $,Date Acquired\n';

test('a file\'s questions are kept when the next file of the account is imported: Jun 21 10 AAPL, Jul 21 6 AAPL (asked), then an undated file — the AAPL question is still there, and the date is asked', () => {
  st().recordFileImport(importHoldings(H + 'AAPL,10,150,200,2000,01/05/2026\nCASH,,,,1000,\nGenerated at Jun 21 2026 03:37 PM ET\n'), 'acc');
  st().recordFileImport(importHoldings(H + 'AAPL,6,150,210,1260,01/05/2026\nCASH,,,,1000,\nGenerated at Jul 21 2026 03:37 PM ET\n'), 'acc');
  const asked = st().assetRecordQuestions.acc.lists;
  expect(asked.map((q: any) => [q.holding, q.sharesOnRecord, q.sharesListed])).toEqual([['AAPL', 10, 6]]);
  st().recordFileImport(importHoldings(H + 'AAPL,10,150,200,2000,01/05/2026\nCASH,,,,1000,\n'), 'acc');
  const q = st().assetRecordQuestions.acc;
  expect(q.lists.map((x: any) => x.signature)).toEqual(asked.map((x: any) => x.signature));
  expect(q.needsADate).toBe(true);
  // the same file again asks nothing twice
  st().recordFileImport(importHoldings(H + 'AAPL,6,150,210,1260,01/05/2026\nCASH,,,,1000,\nGenerated at Jul 21 2026 03:37 PM ET\n'), 'acc');
  expect(st().assetRecordQuestions.acc.lists).toHaveLength(1);
});

test('10 APPL bought Mar 3, 2025 at $150, ticker corrected to AAPL in the holding editor: the record holds 0 APPL and 10 AAPL', () => {
  st().addAsset({ label: 'Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, source: 'manual' });
  const id = String(st().assetAccounts[0].asset_id);
  st().addPosition(id, { ticker: 'APPL', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 10, cost_per_share: 150, purchase_date: '2025-03-03' }] });
  const pid = st().assetAccounts[0].positions[0].position_id;
  st().updatePosition(id, pid, { ticker: 'AAPL' });
  expect(sharesOnRecord(st().assetRecord, id, 'APPL')).toBe(0);
  expect(sharesOnRecord(st().assetRecord, id, 'AAPL')).toBe(10);
  expect(openPurchases(st().assetRecord, id, 'AAPL')).toEqual([expect.objectContaining({ date: '2025-03-03', shares: 10, price: 150 })]);
});

test('step 6 for a file, through the store: a file of Feb 21 still lists 2 AAPL $260 calls that expired Feb 20 — a sale of 200 at $0 on Feb 20 is saved, nothing asked', () => {
  const { rowsInForce } = require('../../MoneyKeel/functions/networth-and-performance/asset-record');
  const F = 'Symbol,Quantity,Price Paid $,Value $,Date Acquired\n';
  useStore.setState({ assetRecord: [], assetRecordQuestions: {} } as any);
  st().recordFileImport(importHoldings(F + "AAPL Feb 20 '26 $260 Call,2,4,0,02/01/2026\nGenerated at Feb 1 2026 03:37 PM ET\n"), 'acc');
  st().recordFileImport(importHoldings(F + "AAPL Feb 20 '26 $260 Call,2,4,0,02/01/2026\nGenerated at Feb 21 2026 03:37 PM ET\n"), 'acc');
  const sales = rowsInForce(st().assetRecord).filter((r: any) => r.kind === 'SALE');
  expect(sales.map((r: any) => [r.date, r.shares, r.price])).toEqual([['2026-02-20', 200, 0]]);
  expect(st().assetRecordQuestions.acc?.lists ?? []).toEqual([]);
});
