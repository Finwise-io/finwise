// DATA GAPS pins (founder-approved final mocks, 2026-08-04). The rule being protected: say nothing
// when the numbers are complete; speak ONLY when a promised calculation is missing an input, and
// name the exact gap with the fix that cures it.
import { dataGaps, gapsHeadline } from './index';
import type { AssetAccount } from '../assets';
import { ingestSync, stAssetId, type AccountSyncPayload } from '../../services/sync/ingest';
import { useStore } from '../../store/useStore';

const NOW = Date.parse('2026-08-04T12:00:00Z');
const a = (over: Partial<AssetAccount>): AssetAccount => ({
  asset_id: 'x' as any, label: 'Account', tax_bucket: 'TAXABLE', balance: 1000, target_return: 0, ...over,
} as AssetAccount);

test('complete data → NO gaps, so the screen shows nothing at all', () => {
  const clean = [a({
    asset_id: 'c1' as any, source: 'connected', last_synced: '2026-08-04T09:00:00Z', history_from: '2025-01-01',
    // THE HOLDING AS IT IS STORED (R7, 2026-10-20): the quantity on the purchases, the broker's mark as last_price
    positions: [{ position_id: 'p1', ticker: 'VTI', last_price: 250, lots: [{ lot_id: 'l1', shares: 10, cost_per_share: 200, purchase_date: '2025-01-02' }] }] as any,
  })];
  const gaps = dataGaps(clean, '2026-08-03', NOW, [{ account_id: 'c1', type: 'DIVIDEND' }]);
  expect(gaps).toEqual([]);
  expect(gapsHeadline(gaps)).toBeNull();
});

// R7 (2026-10-20): the reader read `p.price` and `p.shares`, which NOTHING writes — so on a real account this gap never
// fired, and these tests passed only because they handed it a made-up holding. The holdings below are what the REAL
// writers store: the sync (ingestSync, from a SnapTrade payload) and the store's own addPosition for a holding added by hand.
const SYNC_NOW = '2026-08-04T12:00:00.000Z';
const syncPayload = (positions: AccountSyncPayload['positions']): AccountSyncPayload => ({
  account: { id: 'acc-lctx', brokerage_authorization: 'conn-1', name: 'E*TRADE Individual', number: '12345678', institution_name: 'E*TRADE',
    raw_type: 'Individual', balance: { total: { amount: 40000, currency: 'USD' } },
    sync_status: { holdings: { initial_sync_completed: true, last_successful_sync: '2026-08-04T09:00:00Z' } } } as any,
  balancesCash: 0, positions,
  activities: [{ id: 'd1', type: 'DIVIDEND', trade_date: '2026-07-10', amount: 12, symbol: { id: 'u-lctx', raw_symbol: 'LCTX' } as any }],
});
const LCTX = (price: number | null) => ({ symbol: { id: 'u-lctx', raw_symbol: 'LCTX', description: 'Lineage Cell', type: { code: 'cs' } } as any,
  units: 965, price, average_purchase_price: 1.2 });

test('an unpriced holding names itself and says what we show meanwhile — the holding as the sync stores it', () => {
  const r = ingestSync([], {}, [syncPayload([LCTX(null)])], SYNC_NOW);
  const acct = r.accounts.find((x) => x.asset_id === stAssetId('acc-lctx'))!;
  // the guard looked: this is the writer's shape — no `price`, no `shares`; the quantity is on the purchases
  const pos = acct.positions![0] as any;
  expect(pos.price).toBeUndefined(); expect(pos.shares).toBeUndefined();
  expect(pos.lots.reduce((t: number, l: any) => t + l.shares, 0)).toBe(965);
  expect(pos.last_price).toBeUndefined();
  const gaps = dataGaps(r.accounts, '2026-08-03', NOW, r.newTransactions as any);
  const g = gaps.find((x) => x.kind === 'no-price')!;
  expect(g.title).toBe('LCTX has no price today');
  // linked, no price at all: counted as the rest of the broker's total, as the account page's row shows it (2026-10-21; it read
  // "what you paid", which no screen showed for a linked holding — one built by hand still reads so)
  expect(g.meanwhile).toBe("Meanwhile it counts as the rest of " + (acct.institution?.trim() || 'your broker') + "'s total — what the other holdings and the cash leave over. It stays out of the change line, and we say so.");
  expect(g.route).toBe(`/holding-detail?account=${acct.asset_id}&position=${pos.position_id}`);   // lands on the exact cure
});

test('the same holding with the broker\'s price: no gap — and a holding sold to zero is not named', () => {
  const priced = ingestSync([], {}, [syncPayload([LCTX(41.45)])], SYNC_NOW);
  expect((priced.accounts[0].positions![0] as any).last_price).toBe(41.45);
  expect(dataGaps(priced.accounts, '2026-08-03', NOW, priced.newTransactions as any).some((x) => x.kind === 'no-price')).toBe(false);
  const soldOut = ingestSync([], {}, [syncPayload([LCTX(null)])], SYNC_NOW);
  const zero = soldOut.accounts.map((acc) => ({ ...acc, positions: (acc.positions ?? []).map((q: any) => ({ ...q, lots: q.lots.map((l: any) => ({ ...l, shares: 0 })) })) }));
  expect(dataGaps(zero as any, '2026-08-03', NOW, soldOut.newTransactions as any).some((x) => x.kind === 'no-price')).toBe(false);
});

test('a holding added by hand (the store\'s addPosition) is judged against the price history the screen hands in', () => {
  useStore.getState().resetAll();
  useStore.setState({ assetAccounts: [{ asset_id: 'm1', label: 'My brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, source: 'manual' }] as any, priceCache: {} } as any);
  useStore.getState().addPosition('m1' as any, { ticker: 'ABCD', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 10, cost_per_share: 5, purchase_date: '2026-01-02' }] } as any);
  const accounts = useStore.getState().assetAccounts;
  const held = (accounts[0].positions ?? [])[0] as any;
  expect(held.last_price).toBeUndefined();   // a hand-added holding carries its purchases only
  const none = dataGaps(accounts, null, NOW, [], [], [], () => null);
  expect(none.find((x) => x.kind === 'no-price')?.title).toBe('ABCD has no price today');
  expect(dataGaps(accounts, null, NOW, [], [], [], () => 12.5).some((x) => x.kind === 'no-price')).toBe(false);
  // without a price lookup handed in, a hand-added holding is not judged (Net worth hands none in today)
  expect(dataGaps(accounts, null, NOW, []).some((x) => x.kind === 'no-price')).toBe(false);
});

test('a stale connection is dated, and a fresh one is silent', () => {
  const stale = dataGaps([a({ asset_id: 'e1' as any, institution: 'E*TRADE', source: 'connected', last_synced: '2026-07-28T09:00:00Z' })], null, NOW, []);
  expect(stale.some((g) => g.kind === 'stale-account' && /E\*TRADE .*last updated Jul 28/.test(g.title))).toBe(true);
  const fresh = dataGaps([a({ asset_id: 'e1' as any, institution: 'E*TRADE', source: 'connected', last_synced: '2026-08-03T09:00:00Z' })], null, NOW, []);
  expect(fresh.some((g) => g.kind === 'stale-account')).toBe(false);
});

test('a broker with holdings but no income records offers the enter-it-yourself fix', () => {
  const gaps = dataGaps([a({
    asset_id: 'e1' as any, institution: 'E*TRADE', source: 'connected', last_synced: '2026-08-04T09:00:00Z',
    positions: [{ position_id: 'p1', ticker: 'VTI', last_price: 200, lots: [{ lot_id: 'l1', shares: 5, cost_per_share: 150, purchase_date: '2025-01-02' }] }] as any,
  })], null, NOW, []);
  const g = gaps.find((x) => x.kind === 'no-activity')!;
  expect(g.title).toMatch(/hasn't shared dividend records/);
  expect(g.fixLabel).toBe('Enter dividends yourself');
  // corrected 2026-10-12 (DEC-4645): the return is not "price change only" — the dividends are in it, unnamed
  expect(g.meanwhile).toBe('Its dividends sit inside the change in investment value, not on a line of their own — we never estimate income we were not given.');
  expect(g.meanwhile).not.toMatch(/price change only/);
});

test('history depth speaks only when the window predates what the source shared', () => {
  const acct = a({ asset_id: 'e1' as any, institution: 'E*TRADE', source: 'connected', last_synced: '2026-08-04T09:00:00Z', history_from: '2026-05-04',
    positions: [{ position_id: 'p1', ticker: 'VTI', last_price: 200, lots: [{ lot_id: 'l1', shares: 5, cost_per_share: 150, purchase_date: '2025-01-02' }] }] as any });
  const ledger = [{ account_id: 'e1', type: 'DIVIDEND' }];
  expect(dataGaps([acct], '2026-08-03', NOW, ledger).some((g) => g.kind === 'history-depth')).toBe(false);   // 1-day change line: silent
  expect(dataGaps([acct], '2025-08-04', NOW, ledger).some((g) => g.kind === 'history-depth')).toBe(true);    // 12-month figure: speaks
});

test('a hand-entered property value untouched for a year asks to be refreshed', () => {
  const gaps = dataGaps([a({ asset_id: 'h1' as any, label: 'Home', tax_bucket: 'PROPERTY', source: 'manual', value_as_of: '2025-01-02' })], null, NOW, []);
  const g = gaps.find((x) => x.kind === 'stale-value')!;
  expect(g.title).toMatch(/Home hasn't been updated in 1 year/);
  expect(g.fixLabel).toBe('Update the value');
});

test('the headline counts and is plural-correct', () => {
  expect(gapsHeadline([{ kind: 'no-price' } as any])).toBe('1 number needs more information');
  expect(gapsHeadline([{ kind: 'no-price' } as any, { kind: 'stale-account' } as any])).toBe('2 numbers need more information');
});
