/* PHASE 2, 2026-11-11 — EVERY WAY THE ACCOUNT HOLDER ADDS OR CHANGES SOMETHING ALSO SAVES ROWS IN THE MASTER RECORD,
 * beside the old copies. Each store action is called as the screens call it, from the holdings stated in the test. The
 * guard proves it looked: it counts the actions it called and fails if one was skipped. */
jest.mock('../services/marketData', () => ({ ...jest.requireActual('../services/marketData'),
  fetchPriceSeries: jest.fn(async () => ({ VTI: { ticker: 'VTI', points: [{ date: '2026-11-05', close: 295 }, { date: '2026-11-06', close: 300 }] } })) }));
import { useStore } from '../store/useStore';
import { rowsInForce, sharesOnRecord, valuesNow, factsOf } from '../../MoneyKeel/functions/networth-and-performance/asset-record';

const st = () => useStore.getState() as any;
const rows = () => rowsInForce(st().assetRecord ?? []);
const called = new Set<string>();
const ACTIONS = ['addAsset', 'updateAsset', 'deleteAsset', 'addPosition', 'updatePosition', 'deletePosition', 'recordTransaction',
  'deleteTransaction', 'seedNetWorth', 'allocateSavings', 'removeConnectionAccounts'];

beforeEach(() => {
  useStore.setState({ assetAccounts: [], transactions: [], liabilities: [], priceCache: {}, txnFlags: [], allocatedByMonth: {},
    snaptradeConnections: [], wrapperConfirmQueue: [], assetRecord: [], assetRecordQuestions: {}, assetRecordFaults: [] } as any);
});
afterEach(() => expect(st().assetRecordFaults).toEqual([]));

test('addAsset, updateAsset, deleteAsset: Savings $12,400 as of Sep 1 → $13,000 as of Oct 1 → removed, history kept', () => {
  st().addAsset({ label: 'Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 12_400, source: 'manual', value_as_of: '2026-09-01' }); called.add('addAsset');
  const id = String(st().assetAccounts[0].asset_id);
  expect(valuesNow(st().assetRecord, id)).toMatchObject({ date: '2026-09-01', total: 12_400 });
  st().updateAsset(id, { balance: 13_000, value_as_of: '2026-10-01' }); called.add('updateAsset');
  expect(valuesNow(st().assetRecord, id)).toMatchObject({ date: '2026-10-01', total: 13_000 });
  st().deleteAsset(id); called.add('deleteAsset');
  expect(st().assetAccounts).toHaveLength(0);
  expect(factsOf(st().assetRecord, id, null)).toMatchObject({ accountRemoved: true });
  expect(rows().filter((r) => r.kind === 'VALUE')).toHaveLength(2);
});

test('addPosition, updatePosition, deletePosition: 100 VTI at $80 → price changed to $90 → holding removed', () => {
  st().addAsset({ label: 'Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, source: 'manual' });
  const id = String(st().assetAccounts[0].asset_id);
  st().addPosition(id, { ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 80, purchase_date: '2025-03-03' }] }); called.add('addPosition');
  expect(sharesOnRecord(st().assetRecord, id, 'VTI')).toBe(100);
  const pid = st().assetAccounts[0].positions[0].position_id;
  st().updatePosition(id, pid, { lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 90, purchase_date: '2025-03-03' }] }); called.add('updatePosition');
  expect(rows().find((r) => r.kind === 'PURCHASE')).toMatchObject({ price: 90, source: 'typed', replacesRowId: expect.any(String) });
  st().deletePosition(id, pid); called.add('deletePosition');
  expect(sharesOnRecord(st().assetRecord, id, 'VTI')).toBe(0);
});

test('recordTransaction, deleteTransaction: bought 20 VTI at $100 on Oct 1, sold 5 at $120 on Oct 15, sale deleted → 20', () => {
  st().addAsset({ label: 'Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 5_000, source: 'manual' });
  const id = String(st().assetAccounts[0].asset_id);
  st().recordTransaction({ type: 'BUY', account_id: id, ticker: 'VTI', shares: 20, price: 100, date: '2026-10-01' }); called.add('recordTransaction');
  st().recordTransaction({ type: 'SELL', account_id: id, ticker: 'VTI', shares: 5, price: 120, date: '2026-10-15' });
  expect(sharesOnRecord(st().assetRecord, id, 'VTI')).toBe(15);
  const sale = st().transactions.find((t: any) => t.type === 'SELL');
  expect(st().deleteTransaction(sale.id)).toBe(true); called.add('deleteTransaction');
  expect(sharesOnRecord(st().assetRecord, id, 'VTI')).toBe(20);
});

test('seedNetWorth: sign-up answers of $50,000 (Traditional) and $20,000 (Roth) → two undated typed values', () => {
  st().seedNetWorth({ currentRetirementSavings: 50_000, currentRetirementSavingsRoth: 20_000 }); called.add('seedNetWorth');
  const vals = rows().filter((r) => r.kind === 'VALUE');
  expect(vals.map((r) => [r.typedValue, r.date, r.source]).sort()).toEqual([[20_000, null, 'typed'], [50_000, null, 'typed']]);
  // redone: the two old sign-up accounts are marked removed and two new ones are written
  st().seedNetWorth({ currentRetirementSavings: 55_000, currentRetirementSavingsRoth: 20_000 });
  expect(rows().filter((r) => r.kind === 'FACT' && r.facts?.accountRemoved)).toHaveLength(2);
});

test('allocateSavings: $500 moved into Savings → a $500 deposit dated today', () => {
  st().addAsset({ label: 'Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 1_000, source: 'manual' });
  const id = String(st().assetAccounts[0].asset_id);
  st().allocateSavings('2026-11', [{ assetId: id, amount: 500 }]); called.add('allocateSavings');
  const today = require('../domain/_shared/dates').isoLocalDate(new Date());
  expect(rows().filter((r) => r.kind === 'DEPOSIT')).toEqual([expect.objectContaining({ accountId: id, amount: 500, date: today })]);
});

test('removeConnectionAccounts: a linked account unlinked and kept → a fact saying so; a linked account adds no typed values', () => {
  useStore.setState({ assetAccounts: [{ asset_id: 'rh', label: 'Robinhood', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 9_000, source: 'connected', connection_id: 'c1' }], snaptradeConnections: [{ id: 'c1', brokerage: 'Robinhood', disabled: false }] } as any);
  st().removeConnectionAccounts('c1', true); called.add('removeConnectionAccounts');
  expect(factsOf(st().assetRecord, 'rh', null)).toEqual({ unlinked: true });
  expect(rows().filter((r) => r.kind === 'VALUE')).toHaveLength(0);
});

test('refreshPrices: 100 VTI, closes to Fri Nov 6 at $300 → a price-feed value of $30,000 dated Nov 6; a second refresh adds nothing', async () => {
  st().addAsset({ label: 'Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, source: 'manual' });
  const id = String(st().assetAccounts[0].asset_id);
  st().addPosition(id, { ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 80, purchase_date: '2025-03-03' }] });
  await st().refreshPrices();
  const feed = rows().filter((r) => r.kind === 'VALUE' && r.source === 'price-feed');
  expect(feed.find((r) => r.holding === 'VTI')).toMatchObject({ date: '2026-11-06', shares: 100, price: 300, amount: 30_000 });
  await st().refreshPrices();
  expect(rows().filter((r) => r.kind === 'VALUE' && r.source === 'price-feed')).toHaveLength(feed.length);
});

test('the guard looked: every one of the 11 store actions was called', () => {
  expect([...called].sort()).toEqual([...ACTIONS].sort());
});
