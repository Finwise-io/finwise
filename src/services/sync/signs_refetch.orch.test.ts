// THE ONE-TIME FULL RE-FETCH FOR SIGNS (2026-10-21), through the real sync and the real store. A record saved before
// 2026-10-21 carries no direction (a −$50 dividend read as +$50) and a real $0 was saved as no amount; the weekly overlap
// re-reads only 7 days. The first sync of the updated app reads each linked account's whole history once, hands the
// broker's direction and $0 back to the stored records, imports nothing twice, and then returns to the weekly overlap.
import { runSnapTradeSync, SIGNS_REFETCH, refetchMarkKey } from './snaptradeSync';
import { useStore } from '../../store/useStore';
import { moneyIntoAccount } from '../../../Calculation Module code/engines/ledger';

jest.mock('./snaptradeClient', () => ({
  snaptradeConfigured: () => true,
  usdCash: (b: any[]) => (b ?? []).reduce((t: number, x: any) => t + (x.cash ?? 0), 0),
  snaptradeApi: {
    connections: jest.fn(async () => [{ id: 'conn-1', disabled: false, brokerage: { name: 'Robinhood' } }]),
    accounts: jest.fn(async () => [
      { id: 'acc-1', brokerage_authorization: 'conn-1', name: 'Robinhood Individual', number: '1234', institution_name: 'Robinhood',
        raw_type: 'Individual', balance: { total: { amount: 2455 } }, sync_status: { transactions: { initial_sync_completed: true } } },
    ]),
    holdings: jest.fn(async () => ({ positions: [], optionPositions: [], balances: [{ cash: 2455 }] })),
    activities: jest.fn(async () => ({ activities: [
      { id: 'd-rev', type: 'DIVIDEND', trade_date: '2026-10-05', amount: -50, symbol: { id: 'u-vti', raw_symbol: 'VTI' } },
      { id: 'f-ref', type: 'FEE', trade_date: '2026-10-06', amount: 5 },
      { id: 'i-zero', type: 'INTEREST', trade_date: '2026-10-07', amount: 0 },
    ] })),
  },
}));

const api = jest.requireMock('./snaptradeClient').snaptradeApi;
beforeEach(() => { useStore.getState().resetAll(); jest.clearAllMocks(); });
const rows = () => ((useStore.getState() as any).transactions as any[]).filter((t) => t.source === 'connected');

test('records saved before 2026-10-21 get the broker\'s direction and $0 once, then the sync returns to the weekly overlap', async () => {
  await runSnapTradeSync({ force: true });
  expect(rows()).toHaveLength(3);
  // as an app before 2026-10-21 left them: no direction, the real $0 as no amount, a cursor and no marker
  useStore.setState({
    transactions: (useStore.getState() as any).transactions.map((t: any) =>
      ({ ...t, direction: undefined, ...(t.type === 'INTEREST' ? { amount: undefined } : {}) })),
    snaptradeActivityCursor: { 'acc-1': '2026-10-15T00:00:00.000Z' },
  } as any);
  expect(rows().map((t) => moneyIntoAccount(t))).toEqual(expect.arrayContaining([50, -5, null]));   // the wrong signs, the lost $0

  jest.clearAllMocks();
  await runSnapTradeSync({ force: true });
  // the first sync of the updated app reads the whole history: no start date
  expect(api.activities).toHaveBeenCalledWith('acc-1', expect.objectContaining({ startDate: undefined }));
  expect(rows()).toHaveLength(3);                                                    // nothing imported twice
  const by = (type: string) => rows().find((t) => t.type === type)!;
  expect(by('DIVIDEND')).toMatchObject({ amount: 50, direction: 'OUT' });
  expect(by('FEE')).toMatchObject({ amount: 5, direction: 'IN' });
  expect(by('INTEREST')).toMatchObject({ amount: 0 });
  expect([moneyIntoAccount(by('DIVIDEND')), moneyIntoAccount(by('FEE')), moneyIntoAccount(by('INTEREST'))]).toEqual([-50, 5, 0]);
  expect((useStore.getState() as any).snaptradeActivityCursor[refetchMarkKey('acc-1')]).toBe(SIGNS_REFETCH);

  // runs once: the next sync reads only the weekly overlap
  jest.clearAllMocks();
  await runSnapTradeSync({ force: true });
  const call = api.activities.mock.calls.find((c: any[]) => c[0] === 'acc-1');
  expect(typeof call?.[1]?.startDate).toBe('string');
  expect(rows()).toHaveLength(3);
});

test('an account that cannot be reached keeps no marker, so its re-fetch is still due next time', async () => {
  api.holdings.mockImplementationOnce(async () => { throw new Error('broker maintenance'); });
  await runSnapTradeSync({ force: true });
  expect((useStore.getState() as any).snaptradeActivityCursor[refetchMarkKey('acc-1')]).toBeUndefined();
});
