// Orchestrator pins (design v2 §3): daily debounce, one store write, broken accounts never sink
// the sync, connections meta carries the disabled flag for the Home fix line.
import { runSnapTradeSync, shouldDailySync } from './snaptradeSync';
import { useStore } from '../../store/useStore';

jest.mock('./snaptradeClient', () => ({
  snaptradeConfigured: () => true,
  usdCash: (b: any[]) => (b ?? []).reduce((t: number, x: any) => t + (x.cash ?? 0), 0),
  snaptradeApi: {
    connections: jest.fn(async () => [{ id: 'conn-1', disabled: false, brokerage: { name: 'Robinhood' } }, { id: 'conn-2', disabled: true, brokerage: { name: 'Vanguard' } }]),
    accounts: jest.fn(async () => [
      { id: 'acc-1', brokerage_authorization: 'conn-1', name: 'Robinhood Individual', number: '1234', institution_name: 'Robinhood', raw_type: 'Individual', balance: { total: { amount: 9000 } }, sync_status: {} },
      { id: 'acc-bad', brokerage_authorization: 'conn-2', name: 'Vanguard IRA', institution_name: 'Vanguard', raw_type: 'Traditional IRA', balance: { total: { amount: 5000 } }, sync_status: {} },
    ]),
    holdings: jest.fn(async (id: string) => {
      if (id === 'acc-bad') throw new Error('broker maintenance');
      return { positions: [], optionPositions: [], balances: [{ cash: 9000 }] };
    }),
    activities: jest.fn(async () => ({ activities: [{ id: 'a1', type: 'CONTRIBUTION', trade_date: '2026-07-01', amount: 500 }] })),
  },
}));

const api = jest.requireMock('./snaptradeClient').snaptradeApi;
beforeEach(() => { useStore.getState().resetAll(); jest.clearAllMocks(); });

test('daily debounce: a sync in the last 20 hours means no second pull', () => {
  expect(shouldDailySync(null)).toBe(true);
  expect(shouldDailySync(new Date(Date.now() - 2 * 3600_000).toISOString())).toBe(false);
  expect(shouldDailySync(new Date(Date.now() - 26 * 3600_000).toISOString())).toBe(true);
});

test('one failing account never sinks the sync — the healthy one lands, meta carries the broken flag', async () => {
  const n = await runSnapTradeSync({ force: true });
  expect(n).toBe(1);                                   // acc-bad failed, acc-1 landed
  const s = useStore.getState() as any;
  expect(s.assetAccounts.find((a: any) => a.asset_id === 'st-acc-1')).toBeTruthy();
  expect(s.snaptradeConnections).toEqual([
    { id: 'conn-1', brokerage: 'Robinhood', disabled: false },
    { id: 'conn-2', brokerage: 'Vanguard', disabled: true },
  ]);
  expect(s.transactions.some((t: any) => t.type === 'DEPOSIT' && t.source === 'connected')).toBe(true);
  expect(s.snaptradeLastSyncAt).toBeTruthy();
});

test('a second forced sync of the same window adds no duplicate history', async () => {
  await runSnapTradeSync({ force: true });
  const before = (useStore.getState() as any).transactions.length;
  await runSnapTradeSync({ force: true });
  expect((useStore.getState() as any).transactions.length).toBe(before);
});

test('without force, a fresh lastSyncAt short-circuits (no API calls at all)', async () => {
  await runSnapTradeSync({ force: true });
  jest.clearAllMocks();
  const n = await runSnapTradeSync();
  expect(n).toBe(0);
  expect(api.connections).not.toHaveBeenCalled();
});
