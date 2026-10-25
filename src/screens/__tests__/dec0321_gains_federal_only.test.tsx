/** HIS DEC-0321 (2026-08-20): "state tax in the capital-gains figure — one tab said missing, one said included". Settled in one
 *  place, 2026-10-24: the Holding page's two gains, MK-NW-M-036 (long-term) and MK-NW-M-037 (short-term), are FEDERAL ONLY —
 *  each is the gain itself, split by the federal holding-period rule; no tax is taken from either, and no state tax is in
 *  either. Both declarations say so in plain words; the function that splits the gain (capGains) applies no rate of any kind;
 *  and the page's IF YOU SOLD TODAY card prints the two gains and no tax figure.
 *
 *  The household, by hand (Sep 28, 2026, VTI last close $290.00):
 *    100 shares bought Mar 15, 2023 at $210.00 — held over a year: 100 × ($290 − $210) = $8,000 long-term
 *     40 shares bought Jun 1, 2026 at $265.00 — held under a year: 40 × ($290 − $265) = $1,000 short-term
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import HoldingDetailScreen from '../HoldingDetailScreen';
import { useStore } from '../../store/useStore';
import { builtLines } from '../../testing/mockMatch';
import { figureSpec } from '../../../MoneyKeel/functions/figures';
import { capGains } from '../../domain/performance';

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

const TODAY = '2026-09-28';
const VTI = { position_id: 'p1', ticker: 'VTI', asset_class: 'stock_etf', label: 'Vanguard Total Market', unit: 'shares', last_price: 290,
  lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 210, purchase_date: '2023-03-15' }, { lot_id: 'l2', shares: 40, cost_per_share: 265, purchase_date: '2026-06-01' }] };
const ACCOUNT = { asset_id: 'a2', label: 'Fidelity Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 46_600,
  source: 'connected', last_synced: '2026-09-28T08:00:00Z', cash_balance: 6000, positions: [VTI] };
const closes = (pts: [string, number][]) => ({ points: pts.map(([date, close]) => ({ date, close })) });

test('both declarations say federal only, in plain words, and name his DEC-0321', () => {
  for (const id of ['MK-NW-M-036', 'MK-NW-M-037']) {
    const spec = figureSpec(id);
    expect(spec.answers).toMatch(/\(federal only: no state tax is in it\)\.$/);
    const said = (spec.decisions ?? []).join(' ');
    expect(said).toMatch(/^.*FEDERAL ONLY \(his DEC-0321, 2026-08-20/);
    expect(said).toMatch(/no tax is taken from it, and no state tax is in it/);
  }
});

test('the split applies no rate of any kind: $8,000 long-term and $1,000 short-term are the gain itself, to the dollar', () => {
  const g = capGains(VTI as any, 290, new Date(`${TODAY}T12:00:00`));
  expect(g.longGain).toBe(100 * (290 - 210));     // $8,000
  expect(g.shortGain).toBe(40 * (290 - 265));     // $1,000
  expect(g.totalGain).toBe(8000 + 1000);
});

test('the Holding page\'s IF YOU SOLD TODAY card prints the two gains and no tax figure, state or federal', () => {
  jest.useFakeTimers({ now: new Date(`${TODAY}T12:00:00`), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  try {
    useStore.getState().resetAll();
    useStore.setState({ onboardingComplete: true, hideBalances: false, assetAccounts: [ACCOUNT], transactions: [],
      priceCache: { VTI: closes([['2025-09-26', 250], ['2026-09-25', 287.69], ['2026-09-28', 290]]) }, pricesFetchedAt: '2026-09-28T11:00:00Z' } as any);
    mockParams = { account: 'a2', position: 'p1' };
    render(<HoldingDetailScreen />);
    const L = builtLines(screen.toJSON());
    const at = L.indexOf('IF YOU SOLD TODAY');
    expect(at).toBeGreaterThan(0);                                   // the guard looked: the card is on the page
    const card = L.slice(at, at + 6);
    expect(card).toEqual(expect.arrayContaining(['Gain — long-term (held over 1 yr)', '+$8,000', 'Gain — short-term (held 1 yr or less)', '+$1,000']));
    expect(card.join(' ')).not.toMatch(/\btax\b|\bstate\b|%/i);       // no tax figure and no rate beside the gains
  } finally { jest.useRealTimers(); mockParams = {}; }
});
