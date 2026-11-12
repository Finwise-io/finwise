/* OUTSIDE CHECK, 2026-11-12 — the store's side of five faults an outside checker reproduced: the price feed valuing a
 * typed account, a deleted account, and one person's master record carried into another person's sign-in. Every case
 * states its numbers so it can be worked by hand. */
let mockPRICES: any = {};
jest.mock('../services/marketData', () => ({ ...jest.requireActual('../services/marketData'), fetchPriceSeries: jest.fn(async () => mockPRICES) }));
import { useStore } from '../store/useStore';
import { rowsInForce, valuesNow } from '../../MoneyKeel/functions/networth-and-performance/asset-record';

const st = () => useStore.getState() as any;
const series = (t: string, pts: [string, number][]) => ({ ticker: t, points: pts.map(([date, close]) => ({ date, close })) });
const lots = [{ lot_id: 'l1', shares: 100, cost_per_share: 80, purchase_date: '2025-03-03' }];

beforeEach(() => {
  mockPRICES = { VTI: series('VTI', [['2026-11-06', 300]]) };
  useStore.setState({ assetAccounts: [], transactions: [], liabilities: [], priceCache: {}, txnFlags: [], allocatedByMonth: {},
    snaptradeConnections: [], wrapperConfirmQueue: [], assetRecord: [], assetRecordQuestions: {}, assetRecordFaults: [], pricesFetchedAt: null } as any);
});

test('an account with no source, typed $40,000 on Nov 1 with 100 VTI tracked: after a refresh at $300 its value is still $40,000, not $30,000', async () => {
  st().addAsset({ label: 'Old', institution: 'Schwab', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 40_000, value_as_of: '2026-11-01',
    positions: [{ position_id: 'p1', ticker: 'VTI', kind: 'stocks_etf', lots }] });
  const id = String(st().assetAccounts[0].asset_id);
  await st().refreshPrices();
  expect(rowsInForce(st().assetRecord).filter((r) => r.source === 'price-feed')).toHaveLength(0);
  expect(valuesNow(st().assetRecord, id)?.total).toBe(40_000);
});

test('a sign-up answer of $50,000 retirement savings with 100 VTI added to track it: after a refresh its value is $50,000, not unknown', async () => {
  st().seedNetWorth({ currentRetirementSavings: 50_000 });
  const id = String(st().assetAccounts[0].asset_id);
  st().addPosition(id, { ticker: 'VTI', kind: 'stocks_etf', lots });
  await st().refreshPrices();
  expect(valuesNow(st().assetRecord, id)?.total).toBe(50_000);
});

test('the $40,000 typed account with 100 VTI is deleted, then prices refresh: no price-feed value is written for it', async () => {
  st().addAsset({ label: 'Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 40_000, source: 'manual', value_as_of: '2026-11-01' });
  const id = String(st().assetAccounts[0].asset_id);
  st().addPosition(id, { ticker: 'VTI', kind: 'stocks_etf', lots });
  // a second account built from its holdings keeps VTI being fetched
  st().addAsset({ label: 'B2', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, source: 'manual', derive_balance: true });
  const id2 = String(st().assetAccounts[0].asset_id);
  st().addPosition(id2, { ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: 'l2', shares: 1, cost_per_share: 80, purchase_date: '2025-03-03' }] });
  st().deleteAsset(id);
  await st().refreshPrices();
  expect(rowsInForce(st().assetRecord).filter((r) => r.source === 'price-feed' && r.accountId === id)).toHaveLength(0);
  // the account built from its holdings is still valued: 1 × $300
  expect(valuesNow(st().assetRecord, id2)?.holdings).toEqual([expect.objectContaining({ holding: 'VTI', shares: 1, value: 300 })]);
});

test('user A (Savings $12,400) signs out and user B signs in with cloud data: the profile from the cloud carries none of A\'s record, questions or faults', () => {
  st().addAsset({ label: 'A savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 12_400, source: 'manual', value_as_of: '2026-09-01' });
  useStore.setState({ assetRecordQuestions: { x: { events: [], lists: [], at: 't' } }, assetRecordFaults: [{ at: 't', where: 'w', message: 'm' }] } as any);
  expect(st().assetRecord.length).toBeGreaterThan(0);
  st().loadFromCloud({ assetAccounts: [{ asset_id: 'b1', label: 'B checking', kind: 'checking', tax_bucket: 'CASH', balance: 900 }], onboardingComplete: true });
  expect(st().assetRecord).toEqual([]);
  expect(st().assetRecordQuestions).toEqual({});
  expect(st().assetRecordFaults).toEqual([]);
  expect(st().assetAccounts.map((a: any) => a.label)).toEqual(['B checking']);
});
