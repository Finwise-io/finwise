/** DEC-5291 (owner, 2026-10-13, his word: "approved.") ON THE SCREENS — "Let price history count. When a period
 *  starts before the daily record, work it back from each holding's price history and name what's left out, rather than
 *  greying it."
 *
 *  THE APPROVED EXAMPLE, end to end, in the state the app is really in: Vanguard linked today (VTI $40,000 = 160 × $250,
 *  a year of prices: $227.27… a year ago, $245 forty days ago, $250 today) and Treasury 2031 $10,000 typed by hand as its
 *  own account. Home opens first and writes today's daily record, so the record begins TODAY.
 *    Home, the month:   VTI 40,000 × (1 − 245 ÷ 250) = $800, +2.04%; the Treasury named below
 *    Performance, 1Y:   button +10.00% (not greyed); Wealth generated $3,636; Return +10.00%;
 *                       "Wealth generated and Return do not include Treasury 2031's gains, as it has no price history."
 *    Performance, day one (Since today): "You added your accounts today. Figures for 1M, 1Y and longer come from each
 *                       holding's past prices." (his words, DEC-5425, 2026-10-14: "approved.")
 *    Vanguard's page, 1Y: 1Y +10.00%, Wealth generated $3,636, Return +10.00%, nothing named
 *  Before: every window but Since greyed "—" and "The record begins Oct 13, 2026, so it cannot say what these accounts
 *  were worth on Oct 12, 2025."; Home "change shows once your holdings have prices".
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import HomeScreen from '../HomeScreen';
import PerformanceScreen from '../PerformanceScreen';
import AccountPortfolioScreen from '../AccountPortfolioScreen';
import { employedPartner } from '../../testing/personas';
import { useStore } from '../../store/useStore';
import { isoLocalDate } from '../../domain/_shared/dates';

let mockParams: Record<string, string | undefined> = {};
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (cb: () => void) => { const React = require('react'); React.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

const TODAY = isoLocalDate(new Date());
const daysAgo = (n: number) => { const d = new Date(`${TODAY}T12:00:00`); d.setDate(d.getDate() - n); return isoLocalDate(d); };
const SENTENCE = "Wealth generated and Return do not include Treasury 2031's gains, as it has no price history.";

const VANGUARD = { asset_id: 'van', label: 'BROKERAGE', institution: 'Vanguard', kind: 'brokerage', asset_class: 'stocks_etf', tax_bucket: 'TAXABLE',
  balance: 40000, target_return: 0.05, source: 'connected', last_synced: new Date().toISOString(),
  positions: [{ position_id: 'p-vti', ticker: 'VTI', asset_class: 'stock_etf', last_price: 250, lots: [{ lot_id: 'l1', shares: 160, cost_per_share: 200, purchase_date: daysAgo(900) }] }] };
const TREASURY = { asset_id: 't31', label: 'Treasury 2031', kind: 'fixed_income', asset_class: 'bonds', tax_bucket: 'TAXABLE', balance: 10000, target_return: 0.04, positions: [] };
const VTI_SERIES = { ticker: 'VTI', points: [{ date: daysAgo(800), close: 250 / 1.1 }, { date: daysAgo(40), close: 245 }, { date: TODAY, close: 250 }] };

function openHomeFirst() {
  useStore.getState().resetAll();
  useStore.setState({ onboardingComplete: true, onboardingProfile: { ...employedPartner, monthlySpending: '4500' }, hideBalances: false,
    assetAccounts: [VANGUARD, TREASURY], transactions: [], snapshotDays: [], invDaily: {}, priceCache: { VTI: VTI_SERIES },
    pricesFetchedAt: new Date().toISOString() } as any);
  render(<HomeScreen />);
}

describe('the approved example: Vanguard linked today + Treasury 2031 by hand, the record begins today (DEC-5291)', () => {
  test('Home: the month is worked back from VTI\'s prices — ▲ up $800 (2.04%), the Treasury named below', () => {
    openHomeFirst();
    expect(((useStore.getState() as any).snapshotDays ?? []).map((d: any) => d.date)).toEqual([TODAY]);   // the record begins today
    expect(screen.getByText(/▲ up \$800 \(2\.04%\)/)).toBeOnTheScreen();
    expect(screen.getByText(SENTENCE)).toBeOnTheScreen();
    expect(screen.queryByText('change shows once your holdings have prices')).toBeNull();
  });

  test('Performance: day one says the longer windows come from price history; 1Y +10.00% is not greyed; summary $3,636 · +10.00% and the sentence', () => {
    openHomeFirst();
    screen.unmount();
    render(<PerformanceScreen />);
    // the window picked first is "Since today" — day one — and its line now says where the other windows come from
    // DEC-5425 (2026-10-14, "approved."): his words; the proposed "Day one: your value is real and your daily record …" is gone
    expect(screen.getByText("You added your accounts today. Figures for 1M, 1Y and longer come from each holding's past prices.")).toBeOnTheScreen();
    expect(screen.queryByText(/your value is real and your daily record/)).toBeNull();
    expect(screen.queryByText(/We never back-fill a year we didn't see/)).toBeNull();
    for (const [k, v] of [['1M', '+2.04%'], ['1Y', '+10.00%']]) {
      const b = screen.getAllByRole('button').find((x) => new RegExp(`^Show ${k}, `).test(x.props.accessibilityLabel ?? ''));
      expect(b!.props.accessibilityLabel).toBe(`Show ${k}, ${v}`);
      expect(b!.props.accessibilityState?.disabled).toBe(false);
    }
    fireEvent.press(screen.getAllByRole('button').find((x) => /^Show 1Y, /.test(x.props.accessibilityLabel ?? ''))!);
    expect(screen.getByText('SUMMARY · PAST YEAR')).toBeOnTheScreen();
    expect(screen.getAllByText('$3,636').length).toBeGreaterThanOrEqual(2);   // the summary's Wealth generated and the walk's
    expect(screen.getAllByText('+10.00%').length).toBeGreaterThanOrEqual(2);  // the summary's Return and the window's button
    expect(screen.getAllByText(SENTENCE).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/^The record begins /)).toBeNull();
    expect(screen.getByText('HOW $46,364 BECAME $50,000 · ALL ACCOUNTS')).toBeOnTheScreen();
    // Vanguard's card (open: the first of two): beginning $36,364, the same $3,636 and +10.00%; the summary is that card
    // plus Treasury 2031 at its $10,000, unchanged — $36,364 + $10,000 = $46,364
    expect(screen.getAllByText('$36,364').length).toBe(1);
    expect(screen.getAllByText('$3,636').length).toBeGreaterThanOrEqual(4);   // summary, walk, Vanguard's walk (wealth generated, change in value)
    // Treasury 2031's card has no history: closed, its one quiet line carries no figure (DEC-3035i's case)
    expect(screen.queryByText(/Treasury 2031.*wealth generated/)).toBeNull();
  });

  test('Vanguard\'s own page, 1Y: +10.00% on the button, Wealth generated $3,636, Return +10.00%, nothing named', () => {
    openHomeFirst();
    screen.unmount();
    mockParams = { id: 'van' };
    render(<AccountPortfolioScreen />);
    const oneYear = screen.getAllByRole('button').find((b) => /^1Y, /.test(b.props.accessibilityLabel ?? ''));
    expect(oneYear!.props.accessibilityLabel).toBe('1Y, +10.00%');
    fireEvent.press(oneYear!);
    expect(screen.getAllByText('$3,636').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+10.00%').length).toBeGreaterThan(0);
    expect(screen.getByText('HOW $36,364 BECAME $40,000 · THIS ACCOUNT')).toBeOnTheScreen();
    expect(screen.getByText(/so the beginning is worked back from today's values and each holding's price history\.$/)).toBeOnTheScreen();
    expect(screen.queryByText(/Wealth generated and Return start once the daily record reaches back/)).toBeNull();
    expect(screen.queryByText(SENTENCE)).toBeNull();
    // the broker's records do not reach a worked-back window's beginning, so no "Rebuilt … back to" line claims they do
    expect(screen.queryByText(/Rebuilt from .* back to/)).toBeNull();
  });

  test('Treasury 2031\'s own page, 1Y: no holding has a history, so the refusal stands and nothing is carried back', () => {
    openHomeFirst();
    screen.unmount();
    mockParams = { id: 't31' };
    render(<AccountPortfolioScreen />);
    const oneYear = screen.getAllByRole('button').find((b) => /^1Y, /.test(b.props.accessibilityLabel ?? ''));
    expect(oneYear!.props.accessibilityLabel).toBe('1Y, no figure');
    fireEvent.press(oneYear!);
    expect(screen.getByText(/Wealth generated and Return start once the daily record reaches back far enough/)).toBeOnTheScreen();
  });
});
