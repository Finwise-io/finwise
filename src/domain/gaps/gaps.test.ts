// DATA GAPS pins (founder-approved final mocks, 2026-08-04). The rule being protected: say nothing
// when the numbers are complete; speak ONLY when a promised calculation is missing an input, and
// name the exact gap with the fix that cures it.
import { dataGaps, gapsHeadline } from './index';
import type { AssetAccount } from '../assets';

const NOW = Date.parse('2026-08-04T12:00:00Z');
const a = (over: Partial<AssetAccount>): AssetAccount => ({
  asset_id: 'x' as any, label: 'Account', tax_bucket: 'TAXABLE', balance: 1000, target_return: 0, ...over,
} as AssetAccount);

test('complete data → NO gaps, so the screen shows nothing at all', () => {
  const clean = [a({
    asset_id: 'c1' as any, source: 'connected', last_synced: '2026-08-04T09:00:00Z', history_from: '2025-01-01',
    positions: [{ position_id: 'p1', ticker: 'VTI', shares: 10, price: 250 }] as any,
  })];
  const gaps = dataGaps(clean, '2026-08-03', NOW, [{ account_id: 'c1', type: 'DIVIDEND' }]);
  expect(gaps).toEqual([]);
  expect(gapsHeadline(gaps)).toBeNull();
});

test('an unpriced holding names itself and says what we show meanwhile', () => {
  const gaps = dataGaps([a({
    asset_id: 'c1' as any, source: 'connected', last_synced: '2026-08-04T09:00:00Z',
    positions: [{ position_id: 'p1', ticker: 'LCTX', shares: 965, price: null }] as any,
  })], '2026-08-03', NOW, [{ account_id: 'c1', type: 'DIVIDEND' }]);
  const g = gaps.find((x) => x.kind === 'no-price')!;
  expect(g.title).toMatch(/LCTX has no price today/);
  expect(g.meanwhile).toMatch(/what you paid/);
  expect(g.route).toMatch(/holding-detail\?account=c1&position=p1/);   // lands on the exact cure
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
    positions: [{ position_id: 'p1', ticker: 'VTI', shares: 5, price: 200 }] as any,
  })], null, NOW, []);
  const g = gaps.find((x) => x.kind === 'no-activity')!;
  expect(g.title).toMatch(/hasn't shared dividend records/);
  expect(g.fixLabel).toBe('Enter dividends yourself');
});

test('history depth speaks only when the window predates what the source shared', () => {
  const acct = a({ asset_id: 'e1' as any, institution: 'E*TRADE', source: 'connected', last_synced: '2026-08-04T09:00:00Z', history_from: '2026-05-04',
    positions: [{ position_id: 'p1', ticker: 'VTI', shares: 5, price: 200 }] as any });
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
