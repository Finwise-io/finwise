/** PERFORMANCE PHASE 4, THE TWO PAGES THE TAB OPENS (2026-11-12): the account page and the Holding page say what the tab says.
 *
 *  DEC-10558 (his words, 2026-11-11: "if price is stale, app just state so. but still display it and use it.") — the Holding page.
 *    VTI held since Jan 2, 2023, its only close before the past year's start (Sep 29, 2025) is Aug 1, 2024's $70; today $100. The page
 *    said "VTI has no price near the window’s start: its last close before it is Aug 1, 2024." Now it prints Your return, past year
 *    100 ÷ 70 − 1 = +42.86% and the Performance tab's own sentence, from the same function (MK-NW-F-344 staleStartSentences, through
 *    staleStartSentence): "VTI’s starting price is its last close before the window, Aug 1, 2024, so its return runs from that day and
 *    covers more than the window." The market's old start says the same words with its own ticker.
 *
 *  Fix 6 (MK-XS-F-194 partsShown through MK-NW-F-345 accountWalksShown) — the account page. Three accounts $1,000.40 → $1,100.80:
 *    the tab's cards read A $1,001 → $1,101 ($100), B $1,000 → $1,101 ($101), C $1,000 → $1,100 ($100) = $301. Each account page
 *    read $1,000 → $1,101 and $101 (each rounded on its own: $303). Each page now prints its card's figures.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { builtLines } from '../../testing/mockMatch';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true, setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams, useSegments: () => [], useFocusEffect: () => {}, router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 1) }));

const at = (day: string) => jest.useFakeTimers({ now: new Date(`${day}T12:00:00`), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
afterEach(() => jest.useRealTimers());
const after = (l: string[], t: string, from = 0) => { const i = l.indexOf(t, from); expect(i).toBeGreaterThanOrEqual(0); return l[i + 1]; };
const series = (ticker: string, pts: [string, number][]) => ({ ticker, points: pts.map(([date, close]) => ({ date, close })) });

// ═══ DEC-10558 · the Holding page ═══════════════════════════════════════════════════════════════════════════════════════
describe('DEC-10558 · the Holding page uses an old start close and states it in the Performance tab\'s words', () => {
  const VANGUARD = () => ({ asset_id: 'van', label: 'Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 10_000,
    derive_balance: true, source: 'manual', positions: [{ position_id: 'vti', ticker: 'VTI', label: 'Vanguard Total Stock Market ETF', kind: 'stocks_etf',
      lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 50, purchase_date: '2023-01-02' }] }] });
  const VTI = series('VTI', [['2024-08-01', 70], ['2026-09-29', 99], ['2026-09-30', 100]]);
  const open = (SPY: any) => {
    at('2026-09-30');
    useStore.getState().resetAll();
    useStore.setState({ onboardingComplete: true, hideBalances: false, transactions: [], snapshotDays: [], assetAccounts: [VANGUARD()], priceCache: { VTI, SPY } } as any);
    mockParams = { account: 'van', position: 'vti', period: '1Y' };
    render(React.createElement(require('../HoldingDetailScreen').default));
    return builtLines(screen.toJSON());
  };
  test('VTI\'s Aug 1, 2024 close: Your return, past year 100 ÷ 70 − 1 = +42.86%, and the sentence names that close', () => {
    const l = open(series('SPY', [['2025-09-26', 500], ['2025-09-29', 500], ['2026-09-30', 550]]));
    expect(`+${((100 / 70 - 1) * 100).toFixed(2)}%`).toBe('+42.86%');
    expect(after(l, 'Your return, past year')).toBe('+42.86%');
    expect(after(l, 'The market, same dates')).toBe('+10.00%');
    expect(l).toContain('VTI’s starting price is its last close before the window, Aug 1, 2024, so its return runs from that day and covers more than the window.');
    expect(l.join(' ')).not.toMatch(/has no price near the window’s start/);
  });
  test('the market\'s old start (SPY last closed Sep 1, 2025) says the same words with its own ticker', () => {
    const l = open(series('SPY', [['2025-09-01', 500], ['2026-09-30', 550]]));
    expect(after(l, 'The market, same dates')).toBe('+10.00%');
    expect(l).toContain('SPY’s starting price is its last close before the window, Sep 1, 2025, so its return runs from that day and covers more than the window.');
    expect(l.join(' ')).not.toMatch(/has no price near the window’s start/);
  });
  test('a start close within 7 days says nothing of the kind', () => {
    const l = open(series('SPY', [['2025-09-26', 500], ['2026-09-30', 550]]));
    expect(l.filter((x) => /SPY’s starting price/.test(x))).toEqual([]);
  });
});

// ═══ Fix 6 · the account page ═══════════════════════════════════════════════════════════════════════════════════════════
describe('Fix 6 · each account page prints its card\'s shared figures (MK-XS-F-194 partsShown)', () => {
  const TODAY = '2026-10-10';
  const day = (date: string, values: Record<string, number>) => ({ date, origin: 'observed', writtenAt: `${date}T00:00:00Z`, holdings: [],
    accounts: Object.entries(values).map(([accountId, v]) => ({ date, accountId, cash: 0, statedTotal: null, typedValue: v, currency: 'USD' })) });
  const linked = (id: string, balance: number) => ({ asset_id: id, label: id, institution: `Bank ${id}`, kind: 'brokerage', asset_class: 'stocks_etf', tax_bucket: 'TAXABLE',
    source: 'connected', last_synced: `${TODAY}T09:00:00Z`, balance, cash_balance: 0, positions: [], target_return: 0.06 });
  const page = (id: string) => {
    at(TODAY);
    useStore.getState().resetAll();
    useStore.setState({ onboardingComplete: true, hideBalances: false, transactions: [], priceCache: {}, pricesFetchedAt: new Date().toISOString(),
      assetAccounts: [linked('A', 1100.8), linked('B', 1100.8), linked('C', 1100.8)], snapshotDays: [day('2026-07-09', { A: 1000.4, B: 1000.4, C: 1000.4 })] } as any);
    mockParams = { id };
    render(React.createElement(require('../AccountPortfolioScreen').default));
    return builtLines(screen.toJSON());
  };
  test.each([
    ['A', '$1,001', '$1,101', '$100'],
    ['B', '$1,000', '$1,101', '$101'],
    ['C', '$1,000', '$1,100', '$100'],
  ])('account %s: HOW %s BECAME %s, wealth generated %s — its card on Performance; the three add to $301', (id, begin, end, gained) => {
    const l = page(id);
    expect(l).toContain(`HOW ${begin} BECAME ${end} · THIS ACCOUNT`);
    expect(after(l, 'Wealth generated', l.findIndex((x) => x.startsWith('THIS ACCOUNT ·')))).toBe(gained);   // the trio
    const walkAt = l.findIndex((x) => x.startsWith('HOW '));
    expect(after(l, 'Wealth generated', walkAt)).toBe(gained);                                             // the walk's own line
    expect(l.slice(walkAt)).toContain(begin);
    expect(l.slice(walkAt)).toContain(end);
  });
});
