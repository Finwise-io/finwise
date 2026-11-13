/** PERFORMANCE PHASE 4, ITEMS 5 AND 6, ON THE TAB ITSELF (2026-11-12). The account cards under the total add up to it.
 *
 *  Item 5 — an account sold to $0 and withdrawn inside the window stays on the list: A $60,000 sold and $61,500 taken out Aug 14,
 *           B $40,000 → $41,300. The total read Wealth generated $2,800 and only B's card was listed, at $1,300. Now A's card is
 *           listed at $0 with wealth generated $1,500: $1,500 + $1,300 = $2,800. An account emptied before the window is not listed.
 *  Item 6 — the cards share each printed line of the total (MK-XS-F-194 partsShown): three accounts $1,000.40 → $1,100.80 read
 *           $101 × 3 = $303 against a total of $301; they read $100 + $101 + $100 = $301, and their endings $3,302 as the total's.
 *  Nothing new is drawn: a card at $0 is the same card (Performance v17 frames 1 and 3), its figures are data.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import PerformanceScreen from '../PerformanceScreen';
import { useStore } from '../../store/useStore';

jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));
const TODAY = '2026-10-10';
beforeAll(() => { jest.useFakeTimers({ now: new Date(`${TODAY}T12:00:00`), doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'hrtime'] }); });
afterAll(() => { jest.useRealTimers(); });

const day = (date: string, values: Record<string, number>) => ({ date, origin: 'observed', writtenAt: `${date}T00:00:00Z`, holdings: [],
  accounts: Object.entries(values).map(([accountId, v]) => ({ date, accountId, cash: 0, statedTotal: null, typedValue: v, currency: 'USD' })) });
const linked = (id: string, balance: number) => ({ asset_id: id, label: id, institution: `Bank ${id}`, kind: 'brokerage', asset_class: 'stocks_etf', tax_bucket: 'TAXABLE',
  source: 'connected', last_synced: `${TODAY}T09:00:00Z`, balance, cash_balance: 0, positions: [], target_return: 0.06 });
const textOf = (t: any): string => (Array.isArray(t) ? t.map(textOf).join('') : typeof t === 'string' || typeof t === 'number' ? String(t) : t?.props ? textOf(t.props.children) : '');
const lines = () => screen.UNSAFE_getAllByType(Text).map((t: any) => textOf(t.props.children)).filter(Boolean);
/** each account card's bar and its closed line's wealth generated, in order, read off the screen */
function cardsOnScreen(names: string[]) {
  const all = lines();
  return names.map((n) => {
    const at = all.findIndex((l) => l === `▸ ${n}` || l === `▾ ${n}`);
    return { name: n, at, bar: at < 0 ? null : all[at + 1] };
  });
}
/** the tab opens on Since — here the record's first day, Jul 9, 2026 */
function show(accounts: any[], days: any[], transactions: any[]) {
  useStore.setState({ assetAccounts: accounts, transactions, snapshotDays: days, priceCache: {}, pricesFetchedAt: new Date().toISOString(), refreshPrices: async () => {} } as any);
  render(<PerformanceScreen />);
}

test('item 5: A sold to $0 and withdrawn Aug 14 is listed — $1,500 + $1,300 = $2,800 (only B, $1,300, was listed)', () => {
  show([linked('A', 0), linked('B', 41_300), linked('Z', 0)],
    [day('2026-07-09', { A: 60_000, B: 40_000, Z: 0 }), day('2026-08-14', { A: 0, B: 41_000, Z: 0 })],
    [{ id: 'w', type: 'WITHDRAWAL', account_id: 'A', date: '2026-08-14', amount: 61_500, created_at: 'x', source: 'connected' }]);
  const all = lines();
  const [a, b, z] = cardsOnScreen(['Bank A Brokerage', 'Bank B Brokerage', 'Bank Z Brokerage']);
  expect(a.at).toBeGreaterThan(0);
  expect(b.at).toBeGreaterThan(a.at);
  expect(z.at).toBe(-1);                                               // Z held nothing before or inside the window: not listed
  expect(a.bar).toBe('$0');
  // A is open (the first of several); its walk reads $60,000 − $61,500 + $1,500 = $0
  const walkA = all.slice(a.at, b.at);
  expect(walkA).toEqual(expect.arrayContaining(['$60,000', '−$61,500', '$1,500', '$0']));
  expect(all.slice(b.at).some((l) => l.startsWith('· wealth generated $1,300 '))).toBe(true);
  // the total above: $2,800
  expect(all).toContain('$2,800');
});

test('item 6: three accounts $1,000.40 → $1,100.80 — cards $100 + $101 + $100 = $301 and endings $3,302 (they read $303 and $3,303)', () => {
  show([linked('A', 1100.8), linked('B', 1100.8), linked('C', 1100.8)], [day('2026-07-09', { A: 1000.4, B: 1000.4, C: 1000.4 })], []);
  const all = lines();
  const [a, b, c] = cardsOnScreen(['Bank A Brokerage', 'Bank B Brokerage', 'Bank C Brokerage']);
  expect([a.bar, b.bar, c.bar]).toEqual(['$1,101', '$1,101', '$1,100']);   // each bar is its card's own ending, shared out of $3,302
  // A open: beginning $1,001, wealth generated $100, ending $1,101
  const walkA = all.slice(a.at, b.at);
  expect(walkA).toEqual(expect.arrayContaining(['$1,001', '$100', '$1,101']));
  expect(walkA).not.toContain('$101');
  expect(all.slice(b.at, c.at).some((l) => l.startsWith('· wealth generated $101 '))).toBe(true);
  expect(all.slice(c.at).some((l) => l.startsWith('· wealth generated $100 '))).toBe(true);
  // the total: HOW $3,001 BECAME $3,302, wealth generated $301
  expect(all.some((l) => /HOW \$3,001 BECAME \$3,302/.test(l))).toBe(true);
  expect(all).toContain('$301');
});
