/** DEC-3656 (founder, 2026-10-09: "MK-NW-F-091 - recommend #1 and 2 approved") — ON THE SCREENS.
 *
 *  Where the daily record does not reach the window's first day, the beginning is worked back from today.
 *  (1) A CD stating its rate gains by it; (2) a holding with no price history and no rate has an unknown
 *  gain — no beginning, no wealth generated, no walk, and the sentence
 *  "The beginning can't be worked back: <name> has no price history." Every other account keeps its page;
 *  the approved day-one page is untouched; its walk title reads "HOW $8,000 BECAME $8,000 · THIS ACCOUNT" since DEC-5136
 *  (2026-10-13) retired "HOW TODAY'S VALUE STANDS".
 *  SETTLED 2026-10-13 by DEC-5068, which replaces (2): the walk is drawn from the gains that are known, a holding
 *  with no history adds $0, and below the summary: "Wealth generated and Return do not include <name>'s gains, as it
 *  has no price history." The cases below that pinned the refusal now pin that.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import AccountPortfolioScreen from '../AccountPortfolioScreen';
import PerformanceScreen from '../PerformanceScreen';
import { useStore } from '../../store/useStore';
import { isoLocalDate, dateShown } from '../../domain/_shared/dates';

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
/** 364 days back: the window from that day to today, both counted, is 365 days — exactly one year. */
const YEAR_START = daysAgo(364);

const CD = { asset_id: 'cd1', label: 'Ally CD', institution: 'Ally', kind: 'cd', asset_class: 'bonds', tax_bucket: 'TAXABLE',
  balance: 10500, coupon_rate: 0.05, face_value: 10000, target_return: 0 };
const BOND = { asset_id: 'b1', label: 'Treasury 2031', institution: 'Fidelity', kind: 'fixed_income', asset_class: 'bonds', tax_bucket: 'TAXABLE',
  balance: 8000, coupon_rate: 0.04, face_value: 8000, maturity_date: '2031-05-15', target_return: 0 };
/** a $100 interest record a year ago opens the account page's "Since" window on that day (no daily record) */
const interest = (account_id: string) => ({ id: `i-${account_id}`, account_id, type: 'INTEREST', amount: 100, date: YEAR_START });

function seed(accounts: any[], extra: Record<string, unknown> = {}) {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, assetAccounts: accounts, transactions: [], snapshotDays: [], invDaily: {}, priceCache: {}, ...extra } as any);
}

describe('the account page (DEC-3656, 2026-10-09)', () => {
  test('(1) a CD at 5%: $10,500 today, one year back → beginning $10,000, wealth generated $500', () => {
    mockParams = { id: 'cd1' };
    seed([CD], { transactions: [interest('cd1')] });
    render(<AccountPortfolioScreen />);
    // 10,500 × (1 − 1 ÷ 1.05^(365 ÷ 365)) = 500; beginning = 10,500 − 500 − 0 moved = 10,000
    expect(screen.getByText(`Beginning market value (${dateShown(YEAR_START)})`)).toBeOnTheScreen();
    expect(screen.getAllByText('$10,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$500').length).toBeGreaterThan(0);
    expect(screen.queryByText(/can't be worked back/)).toBeNull();
  });

  test('(2) a bond typed by hand — SETTLED 2026-10-13 by DEC-5068: the walk stands at $0 gained, and the sentence under SUMMARY names it', () => {
    mockParams = { id: 'b1' };
    seed([BOND], { transactions: [interest('b1')] });
    render(<AccountPortfolioScreen />);
    expect(screen.getByText("Wealth generated and Return do not include Fidelity Brokerage's gains, as it has no price history.")).toBeOnTheScreen();
    // its value taken as unchanged: beginning $8,000 − $0 gained − $0 moved = $8,000, and the walk is drawn
    expect(screen.getByText(`Beginning market value (${dateShown(YEAR_START)})`)).toBeOnTheScreen();
    expect(screen.getByText('HOW $8,000 BECAME $8,000 · THIS ACCOUNT')).toBeOnTheScreen();
    expect(screen.queryByText(/can't be worked back/)).toBeNull();
  });

  test('unchanged · day one (no record, nothing moved): the bond keeps the approved day-one page', () => {
    mockParams = { id: 'b1' };
    seed([BOND]);
    render(<AccountPortfolioScreen />);
    expect(screen.getByText('HOW $8,000 BECAME $8,000 · THIS ACCOUNT')).toBeOnTheScreen();   // DEC-5136: one title, day one included
    expect(screen.getByText('Beginning market value (today)')).toBeOnTheScreen();
    expect(screen.getByText(/Day one: your value is real/)).toBeOnTheScreen();
    expect(screen.queryByText(/can't be worked back/)).toBeNull();
    expect(screen.queryByText(/^Wealth generated and Return do not include/)).toBeNull();   // nothing worked back on day one (DEC-5068)
  });

  test('unchanged · day one on every window: picking another window never works a beginning back', () => {
    mockParams = { id: 'b1' };
    seed([BOND]);
    render(<AccountPortfolioScreen />);
    const others = screen.getAllByRole('button').filter((b) => b.props.accessibilityState?.selected === false && /, no figure$/.test(b.props.accessibilityLabel ?? ''));
    expect(others.length).toBeGreaterThanOrEqual(4);   // the guard proves it looked: every other window was pressed
    for (const btn of others) {
      fireEvent.press(btn);
      expect(screen.getByText('HOW $8,000 BECAME $8,000 · THIS ACCOUNT')).toBeOnTheScreen();   // DEC-5136: one title, day one included
      expect(screen.queryByText(/can't be worked back/)).toBeNull();
      expect(screen.queryByText(/^Wealth generated and Return do not include/)).toBeNull();
    }
  });
});

describe('the Performance tab, one account at a time (DEC-3656, 2026-10-09)', () => {
  test('a hand-typed bond outside the daily record — SETTLED 2026-10-13 by DEC-5068: its card names it below the figures; the linked account keeps its page', () => {
    const start = daysAgo(200);
    const rec = (date: string, value: number) => ({ date, origin: 'observed', writtenAt: `${date}T00:00:00Z`,
      holdings: [{ date, accountId: 'van', securityKey: 'VTI', symbol: 'VTI', units: 100, price: value / 100, value, currency: 'USD' }],
      accounts: [{ date, accountId: 'van', cash: 0, statedTotal: value, typedValue: null, currency: 'USD' }] });
    const VAN = { asset_id: 'van', label: 'BROKERAGE', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 33000,
      target_return: 0.05, source: 'connected', last_synced: new Date().toISOString(),
      positions: [{ position_id: 'p1', ticker: 'VTI', asset_class: 'stock_etf', last_price: 330, lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 260, purchase_date: daysAgo(300) }] }] };
    seed([VAN, BOND], {
      snapshotDays: [rec(start, 30000), rec(daysAgo(100), 31500), rec(TODAY, 33000)],
      priceCache: { VTI: { ticker: 'VTI', points: [{ date: start, close: 300 }, { date: TODAY, close: 330 }] } },
      pricesFetchedAt: new Date().toISOString(),
    });
    render(<PerformanceScreen />);
    const toggles = screen.queryAllByLabelText(/Expands its walk/);
    for (const t of toggles) fireEvent.press(t);
    expect(screen.getAllByText("Wealth generated and Return do not include Fidelity Brokerage's gains, as it has no price history.").length).toBeGreaterThan(0);
    // the linked account's walk is still drawn: its beginning is READ from the record
    expect(screen.getAllByText(/^Beginning market value/).length).toBeGreaterThan(0);
  });
});
