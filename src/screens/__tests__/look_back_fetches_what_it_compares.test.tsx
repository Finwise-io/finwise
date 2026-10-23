/** LOOK BACK FETCHES WHAT IT COMPARES (2026-10-22, the follow-up to gap 27 of the Performance launch audit).
 *
 *  The app fetched prices only for what you hold and the yardstick each holding is compared with, so Look back — opened from
 *  an alternative's page, often with nothing held — could rarely answer: SPY and the four yardsticks he asked for (DEC-1624:
 *  AGG, GLD, BTC, AOR) were never fetched. On opening, and when the pairing changes, Look back now hands its pairing, SPY and
 *  the four to the app's one price refresh (store.maybeRefreshPrices → refreshPrices → fetchPriceSeries: the same source,
 *  the same 10-minute freshness rule, the same failure flag). A ticker the refresh could not get is named.
 *
 *  The price source is replaced here by a stand-in that answers as the test says, so nothing reaches the network.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { norm, drawingLines, builtLines, firstDifference } from '../../testing/mockMatch';

const mockFetch = jest.fn(async (_tickers: string[]) => ({} as Record<string, any>));
jest.mock('../../services/marketData', () => ({ ...jest.requireActual('../../services/marketData'), fetchPriceSeries: (t: string[]) => mockFetch(t) }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), useFocusEffect: () => {}, router: { push: jest.fn(), back: jest.fn() },
}));

const iso = (d: Date) => d.toISOString().slice(0, 10);
const back = (m: number) => { const n = new Date(); return iso(new Date(n.getFullYear(), n.getMonth() - m, n.getDate())); };
/** a year and more of closes, a to b: what the provider sends */
const series = (ticker: string, a: number, b: number) => ({ ticker, points: [{ date: back(14), close: a }, { date: back(7), close: (a + b) / 2 }, { date: iso(new Date()), close: b }] });
const LookBackScreen = require('../LookBackScreen').default;
const FRESH_ACCOUNT = [{ asset_id: 'g', label: 'Gold coins', kind: 'commodities', tax_bucket: 'TAXABLE', balance: 8_000, source: 'manual' }];   // its door: an alternative's page

function open(state: Record<string, any>) {
  useStore.getState().resetAll();
  useStore.setState({ onboardingComplete: true, hideBalances: false, onboardingProfile: {}, assetAccounts: FRESH_ACCOUNT, priceCache: {}, pricesFetchedAt: null, ...state } as any);
  render(<LookBackScreen />);
}
beforeEach(() => mockFetch.mockReset());

test('nothing held, the refresh brings AGG and SPY: the screen answers — and it asked for the pairing, SPY and the four yardsticks', async () => {
  mockFetch.mockImplementation(async () => ({ AGG: series('AGG', 100, 102.5), SPY: series('SPY', 100, 116) }));
  open({});
  await waitFor(() => expect(screen.getByText(/^Left in AGG it became/)).toBeOnTheScreen());
  const asked = mockFetch.mock.calls[0][0].map((t: string) => t.toUpperCase());
  for (const t of ['AGG', 'SPY', 'GLD', 'BTC', 'AOR']) expect(asked).toContain(t);
  expect(screen.getByText('Left in AGG it became $20,500 (up $500, +2.50%)')).toBeOnTheScreen();        // $20,000 × 1.025
  expect(screen.getByText('Moved to SPY it would be $23,200 (up $3,200, +16.00%)')).toBeOnTheScreen();   // $20,000 × 1.16
  expect(screen.getByText('Difference: $2,700 more if you had moved.')).toBeOnTheScreen();
  expect((useStore.getState() as any).priceCache.AGG.points).toHaveLength(3);                            // kept, as any price is
});

// THE APPROVED DRAWING'S STATE A IS NOW REACHABLE WITH NOTHING HELD — held word for word, what an empty account changes aside:
// its choices are the four yardsticks (no holdings of its own), so the line reads "Left in AGG" where the drawing has BND.
test('nothing held, prices brought: Look back v01 phone A, word for word, its own holdings aside', async () => {
  mockFetch.mockImplementation(async () => ({ AGG: series('AGG', 100, 102.5), SPY: series('SPY', 100, 116) }));
  open({});
  await waitFor(() => expect(screen.getByText(/^Left in AGG it became/)).toBeOnTheScreen());
  const L = drawingLines('MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_look-back_v01.html', [/<svg[\s\S]*?<\/svg>/g])
    .filter((l) => !['◉', '⚙', 'Money', 'Keel', 'i'].includes(l));
  const starts = L.map((l, i) => (l === '9:41' ? i : -1)).filter((i) => i >= 0);
  const phoneA = L.slice(starts[0] + 2, starts[1]);
  const drawn = phoneA.slice(0, phoneA.findIndex((l) => /^Real past prices/.test(l)) + 1).filter((l) => l !== '20,000');   // the amount is typed
  const at = (l: string) => drawn.indexOf(l);
  expect(drawn.slice(at('From') + 1, at('To'))).toEqual(['BND', 'VTI', 'QQQ']);                           // the drawing's own holdings
  const want = [...drawn.slice(0, at('From') + 1), 'AGG', 'GLD', 'BTC', 'AOR', 'To', 'SPY', 'GLD', 'BTC', 'AOR', ...drawn.slice(at('When'))]
    .map((l) => l.replace('Left in BND', 'Left in AGG'));
  expect(want.length).toBeGreaterThan(20);
  expect(firstDifference(norm(want), norm(builtLines(screen.toJSON())))).toBe('');
});

test('nothing held, the refresh brings nothing: "getting", then the tickers it could not get — never a figure', async () => {
  mockFetch.mockImplementation(async () => ({}));
  open({});
  expect(screen.getByText('Getting prices for AGG and SPY…')).toBeOnTheScreen();
  await waitFor(() => expect(screen.getByText("Couldn't refresh prices for AGG or SPY, so there is nothing to compare yet. Look back tries again each time it opens.")).toBeOnTheScreen());
  expect(builtLines(screen.toJSON()).filter((l) => /\$\d|%/.test(l))).toEqual([]);
  expect((useStore.getState() as any).priceRefreshFailed).toBe(true);                                      // the one failure flag
});

test('the refresh brings one of the two: the one still missing is named', async () => {
  mockFetch.mockImplementation(async () => ({ AGG: series('AGG', 100, 102.5) }));
  open({});
  await waitFor(() => expect(screen.getByText("Couldn't refresh prices for SPY, so there is nothing to compare yet. Look back tries again each time it opens.")).toBeOnTheScreen());
});

test('the one freshness rule: everything in hand and refreshed within 10 minutes → no fetch; a ticker not in hand → fetched', async () => {
  const all = Object.fromEntries(['AGG', 'SPY', 'GLD', 'BTC', 'AOR'].map((t) => [t, series(t, 100, 110)]));
  open({ priceCache: all, pricesFetchedAt: new Date().toISOString() });
  await waitFor(() => expect(screen.getByText(/^Left in AGG it became/)).toBeOnTheScreen());
  expect(mockFetch).not.toHaveBeenCalled();
  const { GLD: _gone, ...noGold } = all;
  mockFetch.mockImplementation(async () => ({}));
  open({ priceCache: noGold, pricesFetchedAt: new Date().toISOString() });
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
});
