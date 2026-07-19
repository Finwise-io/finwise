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

// SELF-HEAL (build-43 device finding #3): Build 43 advanced the activity cursor while the envelope
// bug ingested ZERO rows. A cursor with no ledger rows behind it is a lie — the next sync must
// refetch the FULL history, not cursor-minus-a-week.
test('a cursor with NO connected ledger rows behind it is ignored — full history refetch', async () => {
  useStore.setState({ snaptradeActivityCursor: { 'acc-1': '2026-07-19T00:00:00.000Z' } } as any);
  await runSnapTradeSync({ force: true });
  // no startDate passed → full history from the beginning
  expect(api.activities).toHaveBeenCalledWith('acc-1', expect.objectContaining({ startDate: undefined }));
  const s = useStore.getState() as any;
  expect(s.transactions.some((t: any) => t.source === 'connected')).toBe(true);   // history landed this time
});

test('a cursor WITH ledger rows behind it is honored (overlap window, no full refetch)', async () => {
  await runSnapTradeSync({ force: true });                     // first sync lands rows + sets cursor? (sync_status empty → no cursor)
  useStore.setState({ snaptradeActivityCursor: { 'acc-1': '2026-07-10T00:00:00.000Z' } } as any);
  jest.clearAllMocks();
  await runSnapTradeSync({ force: true });
  const call = api.activities.mock.calls.find((c: any[]) => c[0] === 'acc-1');
  expect(call?.[1]?.startDate).toBe('2026-07-03');             // cursor − 7-day overlap, not undefined
});

// LIVE-VERIFIED 2026-07-19 (real E*TRADE): production wraps activities in {data, pagination:{total}}
// — the docs' bare-array examples do not happen live. The old Array.isArray guard silently dropped
// the WHOLE envelope → every connected account synced with an empty ledger. Never again.
test('the real pagination envelope {data, pagination} still lands history (live shape, 2026-07-19)', async () => {
  api.activities.mockResolvedValue({
    activities: {
      data: [
        { id: 'e1', type: 'DIVIDEND', trade_date: '2026-06-15', amount: 12.4 },
        { id: 'e2', type: 'CONTRIBUTION', trade_date: '2026-06-01', amount: 250 },
      ],
      pagination: { offset: 0, limit: 1000, total: 2 },
    },
  });
  await runSnapTradeSync({ force: true });
  const s = useStore.getState() as any;
  expect(s.transactions.some((t: any) => t.type === 'DIVIDEND' && t.amount === 12.4)).toBe(true);
  expect(s.transactions.some((t: any) => t.type === 'DEPOSIT' && t.amount === 250)).toBe(true);
  expect(api.activities).toHaveBeenCalledTimes(1);       // total satisfied on page one → no extra calls
});
