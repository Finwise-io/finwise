/** A HOLDING THAT FELL TO $0 INSIDE A WINDOW COUNTS WITH WHAT IT WAS WORTH WHEN THE WINDOW BEGAN (2026-10-21; DEC-5068,
 *  tenet 4 — and tenet 3 read the right way round: unknown is not zero, but a known $0 IS $0).
 *
 *  Found by two parts of the Performance re-run (OpenAI, the tax-and-acceptance file case 6 and part 4's MK-PF-F-044 case
 *  "Wiped-out holding still had beginning"). Where no daily record reaches back and the window is worked back from price
 *  history, a holding worth $0 today was dropped: "no start to divide by". Its loss vanished.
 *
 *  THE EXAMPLE, worked by hand. One account, Brokerage at Schwab, no daily record, the past month:
 *    AAA: 10 shares, $100 the evening before the month opened → $0 today; its yardstick (SPY) +10%
 *    BBB: 10 shares, $100 → $120 today, $1,200;                    its yardstick (AGG) +2%
 *    beginning   10 × 100 + 10 × 100 = $2,000            (before the fix: $1,000 — AAA left out)
 *    Wealth generated   (0 − 1,000) + (1,200 − 1,000) = −$800   (before: +$200)
 *    Return   1,200 ÷ 2,000 − 1 = −40.00%               (before: +20.00%)
 *    market   (0.10 × 1,000 + 0.02 × 1,000) ÷ 2,000 = +6.00%   (before: +2.00%)
 *  The same −40.00% the app already gives when a daily record reaches back (the tax file's case 6, first test).
 *
 *  THE THREE SCREENS AGREE, through the real screens: the account page (/account-detail), the Performance tab (/invest)
 *  and Home. Each figure is read off the rendered screen, not off a function. The account is linked, so the account
 *  page draws BY CATEGORY & HOLDING (a by-hand account has no table): AAA's class is AAA alone, −100.00% (it read "—", AAA
 *  left out of its own class), and BBB's class and row show BBB's own +20.00% (they read the account's −40.00%, as if
 *  BBB were the whole account — AAA, worth $0 today, was not counted as being there).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import AccountPortfolioScreen from '../AccountPortfolioScreen';
import PerformanceScreen from '../PerformanceScreen';
import HomeScreen from '../HomeScreen';
import { employedPartner } from '../../testing/personas';
import { useStore } from '../../store/useStore';
import { isoLocalDate } from '../../domain/_shared/dates';
import { buildPerformance, returnWithInterest } from '../../domain/performance';
import { dataGaps } from '../../domain/gaps';

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

/** Brokerage at Schwab, linked: AAA worth $0 today (10 shares at the broker's $0), BBB $1,200 (10 at $120). Bought 700
 *  days ago. BBB is a bond fund, so the two sit in two classes of the account page's table. */
const BROKERAGE = {
  asset_id: 'brk', label: 'Brokerage', institution: 'Schwab', kind: 'brokerage', asset_class: 'stocks_etf', tax_bucket: 'TAXABLE',
  source: 'connected', last_synced: new Date().toISOString(), balance: 1200, target_return: 0.05,
  positions: [
    { position_id: 'p-a', ticker: 'AAA', label: 'Alpha', asset_class: 'stock_etf', last_price: 0,
      lots: [{ lot_id: 'la', shares: 10, cost_per_share: 90, purchase_date: daysAgo(700) }] },
    { position_id: 'p-b', ticker: 'BBB', label: 'Beta', asset_class: 'bond', kind: 'fixed_income', last_price: 120,
      lots: [{ lot_id: 'lb', shares: 10, cost_per_share: 90, purchase_date: daysAgo(700) }] },
  ],
};
/** closes: each holding's and each yardstick's, long before the month and today — so any month reads the same move. AAA's
 *  close today is $0, as the feed sends it (a day with no close is skipped, never written as $0). */
const PRICES = {
  AAA: { ticker: 'AAA', points: [{ date: daysAgo(600), close: 100 }, { date: TODAY, close: 0 }] },
  BBB: { ticker: 'BBB', points: [{ date: daysAgo(600), close: 100 }, { date: TODAY, close: 120 }] },
  SPY: { ticker: 'SPY', points: [{ date: daysAgo(600), close: 100 }, { date: TODAY, close: 110 }] },
  AGG: { ticker: 'AGG', points: [{ date: daysAgo(600), close: 100 }, { date: TODAY, close: 102 }] },
};
/** the two purchases open the account's history (so no window is day one) and move no money */
const BUYS = [
  { id: 'ba', account_id: 'brk', type: 'BUY', ticker: 'AAA', shares: 10, price: 90, amount: 900, date: daysAgo(700) },
  { id: 'bb', account_id: 'brk', type: 'BUY', ticker: 'BBB', shares: 10, price: 90, amount: 900, date: daysAgo(700) },
];

function seed() {
  useStore.getState().resetAll();
  useStore.setState({ onboardingComplete: true, onboardingProfile: { ...employedPartner, monthlySpending: '4500' }, hideBalances: false,
    assetAccounts: [BROKERAGE], transactions: BUYS, snapshotDays: [], invDaily: {}, priceCache: PRICES,
    pricesFetchedAt: new Date().toISOString() } as any);
}
const minus = (s: string) => new RegExp(`^[−-]${s.replace(/[$.()]/g, (c) => `\\${c}`)}$`);
const pickMonth = () => {
  const oneMonth = screen.getAllByRole('button').find((b) => /^Show 1M, /.test(b.props.accessibilityLabel ?? ''));
  expect(oneMonth).toBeTruthy();
  // the chip carries the window's return: −40.00% (it read +20.00%)
  expect(oneMonth!.props.accessibilityLabel).toMatch(/^Show 1M, [−-]40\.00%$/);
  fireEvent.press(oneMonth!);
};
/** The day the walk's beginning is read for, as the screen prints it beside "Beginning market value". */
const beginningDay = (): string => {
  const row = screen.getAllByText(/^Beginning market value \(/);
  expect(row.length).toBe(1);
  const words = [row[0].props.children].flat().join('');
  return words.replace(/^Beginning market value \(/, '').replace(/\)$/, '');
};

describe('the example on each screen — Return −40.00%, Wealth generated −$800, beginning $2,000', () => {
  test('the account page, past month: −$800 · −40.00% from $2,000; AAA\'s class −100.00%, BBB\'s class and row its own +20.00%', () => {
    mockParams = { id: 'brk' };
    seed();
    render(<AccountPortfolioScreen />);
    pickMonth();
    expect(screen.getAllByText(minus('$800')).length).toBeGreaterThan(0);          // Wealth generated, trio and walk
    expect(screen.getAllByText(minus('40.00%')).length).toBeGreaterThan(0);        // Return
    expect(screen.getByLabelText('Wealth generated, minus $800')).toBeOnTheScreen();
    expect(screen.getByText('HOW $2,000 BECAME $1,200 · THIS ACCOUNT')).toBeOnTheScreen();
    // BY CATEGORY & HOLDING — read off each row's own words
    expect(screen.getByLabelText('Stocks / Funds, $0, return −100.00%')).toBeOnTheScreen();             // read "—"
    expect(screen.getByLabelText(/^AAA, 10 shares · \$0\.00, \$0, return −100\.00%\. Opens its page\.$/)).toBeOnTheScreen();
    expect(screen.getByLabelText('Bonds & CDs, $1,200, return +20.00%')).toBeOnTheScreen();             // read −40.00%
    expect(screen.getByLabelText(/^BBB, .*, \$1,200, return \+20\.00%\. Opens its page\.$/)).toBeOnTheScreen(); // read −40.00%
    expect(screen.getByLabelText('Total, $1,200, return −40.00%')).toBeOnTheScreen();
    // nothing is said to be left out or unpriced: both holdings have a price history, and AAA's close today is $0 — a price
    expect(screen.queryByText(/has no price history/)).toBeNull();
    expect(screen.queryByText(/has no price today/)).toBeNull();
  });

  test('the Performance tab, past month: the summary, the walk and the account\'s card — −$800 · −40.00% from $2,000', () => {
    seed();
    render(<PerformanceScreen />);
    pickMonth();
    expect(screen.getByText('SUMMARY · PAST MONTH')).toBeOnTheScreen();
    expect(screen.getAllByText(minus('$800')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(minus('40.00%')).length).toBeGreaterThan(0);
    expect(screen.getByText('HOW $2,000 BECAME $1,200 · ALL ACCOUNTS')).toBeOnTheScreen();
    // the account's card, closed: the same two figures on its one line
    expect(screen.getByText(/· wealth generated [−-]\$800 · return [−-]40\.00%$/)).toBeOnTheScreen();
    expect(screen.queryByText(/has no price history/)).toBeNull();
    expect(screen.queryByText(/has no price today/)).toBeNull();
  });

  test('Home, this month: ▼ down $800 (40.00%), you −40.00% · market +6.00% — then, on the record Home wrote, the Performance tab and the account page say the same month from the same day', () => {
    seed();
    render(<HomeScreen />);
    expect(screen.getByText(/▼ down \$800 \(40\.00%\)/)).toBeOnTheScreen();
    // the market, matched to the mix held when the month began: AAA's $1,000 start weighs SPY's +10% (it read +2.00%)
    expect(screen.getByText(/you [−-]40\.00% \(including dividends and interest\)/)).toBeOnTheScreen();
    expect(screen.getByText(/market \+6\.00%/)).toBeOnTheScreen();
    expect(screen.getByText(/behind by 46\.00%/)).toBeOnTheScreen();
    screen.unmount();
    // Home has written today's record (the state every person is in once Home has opened): the record begins today, so
    // the month is still worked back from price history (DEC-5291) — the same answer, from the same beginning day
    expect(((useStore.getState() as any).snapshotDays ?? []).length).toBeGreaterThan(0);
    render(<PerformanceScreen />);
    pickMonth();
    expect(screen.getAllByText(minus('$800')).length).toBeGreaterThan(0);
    expect(screen.getByText('HOW $2,000 BECAME $1,200 · ALL ACCOUNTS')).toBeOnTheScreen();
    const onPerformance = beginningDay();
    screen.unmount();
    mockParams = { id: 'brk' };
    render(<AccountPortfolioScreen />);
    pickMonth();
    expect(screen.getByLabelText('Wealth generated, minus $800')).toBeOnTheScreen();
    expect(screen.getByLabelText('Total, $1,200, return −40.00%')).toBeOnTheScreen();
    expect(beginningDay()).toBe(onPerformance);
  });
});

describe('the pieces the screens read', () => {
  test('buildPerformance writes each holding\'s value when the month began — AAA $1,000 though worth $0 today, BBB $1,000', () => {
    const rows = buildPerformance(BROKERAGE.positions as any, (t) => (PRICES as any)[t], '1M', new Date());
    expect(rows.map((r) => [r.position.ticker, r.marketValue, r.periodTotal, r.startValue])).toEqual([
      ['AAA', 0, -1, 1000],
      ['BBB', 1200, expect.closeTo(0.2, 12), 1000],
    ]);
  });
  test('a bond worth $0 today that paid $50 of interest on a $1,000 start: −95.00%, its interest counted (it read −100.00%)', () => {
    expect(returnWithInterest(-1, 0, 50, 1000)).toBeCloseTo(-0.95, 12);
    expect(returnWithInterest(-1, 0, 50)).toBe(-1);                       // no start handed in: the price move, as before
    expect(returnWithInterest(0, 5000, 100, 4000)).toBeCloseTo(0.02, 12);   // worth something today: unchanged
  });
  test('the amber box: a close of $0 in the price history is a price; a broker\'s $0 with no close behind it is not', () => {
    const acct = [BROKERAGE] as any;
    expect(dataGaps(acct, null, Date.now(), [], [], [], () => 0).some((g) => g.kind === 'no-price')).toBe(false);
    const none = dataGaps(acct, null, Date.now(), [], [], [], () => null).filter((g) => g.kind === 'no-price');
    expect(none.map((g) => g.title)).toEqual(['AAA has no price today']);   // BBB has the broker's $120
  });
});
