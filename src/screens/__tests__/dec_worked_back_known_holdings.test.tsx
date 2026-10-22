/** DEC-5068 (owner, 2026-10-13) ON THE SCREENS: "Wealth Generated and Return should be calculated and displayed for
 *  every asset with history. Below it display "Wealth Generated and Return does not include treasury gains as no
 *  price history available."" Replaces part (2) of DEC-3656.
 *
 *  THE EXAMPLE, worked by hand. An account of $50,000 = 160 VTI at $250 = $40,000 (its close a year ago $227.27…, so
 *  its own return over the past year is 250 ÷ (250 ÷ 1.1) − 1 = +10.00%) + Treasury 2031 $10,000 typed by hand, with
 *  no price history. No money moved; no daily record for this account.
 *    VTI gained 40,000 × (1 − 1 ÷ 1.10) = $3,636.36 → Wealth generated $3,636
 *    beginning 50,000 − 3,636.36 = $46,363.64 → $46,364
 *    Return +10.00% (VTI only; the Treasury is left out, never counted at 0%)
 *    below the summary: "Wealth generated and Return do not include Treasury 2031's gains, as it has no price history."
 *  Screens: the account page (/account-detail) on the 1Y window, and that account's card on the Performance tab
 *  (/invest) beside a linked account whose daily record exists.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import AccountPortfolioScreen from '../AccountPortfolioScreen';
import PerformanceScreen from '../PerformanceScreen';
import HomeScreen from '../HomeScreen';
import { employedPartner } from '../../testing/personas';
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
/** one year back to the day, then the day before it — on the calendar, so a leap year cannot shift it */
const yearAndADayBack = () => { const d = new Date(`${TODAY}T12:00:00`); d.setFullYear(d.getFullYear() - 1); d.setDate(d.getDate() - 1); return isoLocalDate(d); };
const SENTENCE = "Return is on the $40,000 with a price history. Treasury 2031 ($10,000) has no price history, so its gains are not included.";   // reworded 2026-10-19 by DEC-6076

/** the $50,000 account, typed by hand, holding VTI (priced) and Treasury 2031 (no price history) */
const SCHWAB = {
  asset_id: 'sch', label: 'Brokerage', institution: 'Schwab', kind: 'brokerage', asset_class: 'stocks_etf', tax_bucket: 'TAXABLE',
  balance: 50000, target_return: 0.05,
  positions: [
    { position_id: 'p-vti', ticker: 'VTI', asset_class: 'stock_etf', lots: [{ lot_id: 'l1', shares: 160, cost_per_share: 200, purchase_date: daysAgo(700) }] },
    { position_id: 'p-t31', ticker: '912810TM0', label: 'Treasury 2031', asset_class: 'bond', kind: 'fixed_income',
      lots: [{ lot_id: 'l2', shares: 10000, cost_per_share: 1, purchase_date: daysAgo(700) }] },
  ],
};
/** VTI's closes: $227.27… well before the window, $250 today → +10.00% over any window that opens after the first */
const VTI_SERIES = { ticker: 'VTI', points: [{ date: daysAgo(600), close: 250 / 1.1 }, { date: TODAY, close: 250 }] };

function seed(accounts: any[], extra: Record<string, unknown> = {}) {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, assetAccounts: accounts, transactions: [], snapshotDays: [], invDaily: {},
    priceCache: { VTI: VTI_SERIES }, pricesFetchedAt: new Date().toISOString(), ...extra } as any);
}

describe('the account page, past year (DEC-5068, 2026-10-13)', () => {
  test('$50,000 = VTI $40,000 (+10%) + Treasury 2031 $10,000: Wealth generated $3,636, Return +10.00%, the walk, and the sentence below', () => {
    mockParams = { id: 'sch' };
    // the account's only record: the VTI purchase, 700 days ago — it opens the account's history, and moves no money
    seed([SCHWAB], { transactions: [{ id: 'b1', account_id: 'sch', type: 'BUY', ticker: 'VTI', shares: 160, price: 200, amount: 32000, date: daysAgo(700) }] });
    render(<AccountPortfolioScreen />);
    // the account page prints the Performance tab's own control since DEC-6079 (2026-10-19): its labels say Show …
    const oneYear = screen.getAllByRole('button').find((b) => /^Show 1Y, /.test(b.props.accessibilityLabel ?? ''));
    expect(oneYear).toBeTruthy();
    // the chip itself carries the return: +10.00% (it read "no figure" before DEC-5068)
    expect(oneYear!.props.accessibilityLabel).toBe('Show 1Y, +10.00%');
    fireEvent.press(oneYear!);

    // THE SUMMARY TRIO
    expect(screen.getByText('THIS ACCOUNT · THE PAST YEAR')).toBeOnTheScreen();   // the account-page drawing v01's band (state D)
    expect(screen.getAllByText('$50,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$3,636').length).toBeGreaterThan(0);          // Wealth generated
    expect(screen.getAllByText('+10.00%').length).toBeGreaterThan(0);         // Return
    // the sentence below it, in his words with the holding's name
    expect(screen.getByText(SENTENCE)).toBeOnTheScreen();
    // the worked-back note says how the beginning was found, and no longer that "no return is measured"
    expect(screen.getByText(/so the beginning is worked back from today's values and each holding's price history\.$/)).toBeOnTheScreen();
    expect(screen.queryByText(/no return is measured/)).toBeNull();
    expect(screen.queryByText(/can't be worked back/)).toBeNull();

    // THE WALK, every row, adding up: 46,364 + 0 − 0 + 3,636 = 50,000
    expect(screen.getByText('HOW $46,364 BECAME $50,000 · THIS ACCOUNT')).toBeOnTheScreen();
    for (const row of ['Contributions', 'Withdrawals', 'Wealth generated', 'Dividends', 'Interest', 'Change in investment value']) {
      expect(screen.getAllByText(row).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText(/^Beginning market value \(/).length).toBe(1);
    expect(screen.getAllByText('$46,364').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^Ending market value/).length).toBe(1);
  });
});

describe('the Performance tab, that account\'s card (DEC-5068, 2026-10-13)', () => {
  test('beside a linked account with a record: the card shows wealth generated $3,636 · return +10.00% and the sentence; open, the walk and Return', () => {
    const start = daysAgo(400);
    const rec = (date: string, value: number) => ({ date, origin: 'observed', writtenAt: `${date}T00:00:00Z`,
      holdings: [{ date, accountId: 'van', securityKey: 'VXUS', symbol: 'VXUS', units: 100, price: value / 100, value, currency: 'USD' }],
      accounts: [{ date, accountId: 'van', cash: 0, statedTotal: value, typedValue: null, currency: 'USD' }] });
    const VAN = { asset_id: 'van', label: 'BROKERAGE', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 33000,
      target_return: 0.05, source: 'connected', last_synced: new Date().toISOString(),
      positions: [{ position_id: 'p1', ticker: 'VXUS', asset_class: 'stock_etf', last_price: 330, lots: [{ lot_id: 'l9', shares: 100, cost_per_share: 260, purchase_date: daysAgo(700) }] }] };
    seed([VAN, SCHWAB], {
      snapshotDays: [rec(start, 30000), rec(daysAgo(100), 31500), rec(TODAY, 33000)],
      priceCache: { VTI: VTI_SERIES, VXUS: { ticker: 'VXUS', points: [{ date: daysAgo(600), close: 300 }, { date: TODAY, close: 330 }] } },
    });
    render(<PerformanceScreen />);
    // closed: the one quiet line carries the figures, and the sentence sits below it
    expect(screen.getByText(/· wealth generated \$3,636 · return \+10\.00%$/)).toBeOnTheScreen();
    // SETTLED 2026-10-13 by DEC-5291: some accounts reach (Vanguard), one does not (Schwab) — the summary is the
    // cards added up, so the sentence is under the summary too (it was once, on the card: Schwab arrived as money put in).
    // Summary: $30,000 + $46,364 = $76,364 became $33,000 + $50,000 = $83,000; wealth generated $3,000 + $3,636 = $6,636.
    // DEC-6076 (2026-10-19): each sentence names the dollars ITS return is on — the card Schwab's VTI $40,000, the
    // summary Vanguard's measured $33,000 + VTI's $40,000 = $73,000
    const SUMMARY_SENTENCE = 'Return is on the $73,000 with a price history. Treasury 2031 ($10,000) has no price history, so its gains are not included.';
    expect(screen.getAllByText(SENTENCE).length).toBe(1);
    expect(screen.getAllByText(SUMMARY_SENTENCE).length).toBe(1);
    expect(screen.getByText('HOW $76,364 BECAME $83,000 · ALL ACCOUNTS')).toBeOnTheScreen();
    expect(screen.getAllByText('$6,636').length).toBeGreaterThan(0);
    // open the card: the walk rows, its Return row, and the sentence below them
    const toggle = screen.getAllByLabelText(/Expands its walk/).find((t) => /^Schwab/.test(t.props.accessibilityLabel ?? ''));
    expect(toggle).toBeTruthy();
    fireEvent.press(toggle!);
    expect(screen.getAllByText(SENTENCE).length).toBe(1);
    expect(screen.getAllByText(SUMMARY_SENTENCE).length).toBe(1);
    expect(screen.getAllByText('$46,364').length).toBeGreaterThan(0);          // its beginning
    expect(screen.getAllByText('$3,636').length).toBeGreaterThan(0);           // its wealth generated
    expect(screen.getAllByText('+10.00%').length).toBeGreaterThan(0);          // its Return row
    expect(screen.getAllByText('Change in investment value').length).toBeGreaterThan(0);
    expect(screen.getAllByText(`Beginning market value (${dateShown(start)})`).length).toBeGreaterThan(0);
  });
});

describe('the Performance tab, all accounts together, worked back (DEC-5068 — the summary agrees with the card)', () => {
  test('the single $50,000 account, no daily record, past year: summary $3,636 / +10.00%, the sentence, the walk, and the card the same', () => {
    seed([SCHWAB]);
    render(<PerformanceScreen />);
    // the past-year window is worked back, so it is not greyed: it carries the return and can be picked
    const oneYear = screen.getAllByRole('button').find((b) => /^Show 1Y, /.test(b.props.accessibilityLabel ?? ''));
    expect(oneYear).toBeTruthy();
    expect(oneYear!.props.accessibilityLabel).toBe('Show 1Y, +10.00%');
    expect(oneYear!.props.accessibilityState?.disabled).toBe(false);
    fireEvent.press(oneYear!);

    // THE SUMMARY: Ending value $50,000 · Wealth generated $3,636 · Return +10.00%, then the note and the sentence
    expect(screen.getByText('SUMMARY · PAST YEAR')).toBeOnTheScreen();
    expect(screen.getAllByText('$3,636').length).toBeGreaterThanOrEqual(3);   // summary, the walk's Wealth generated and its change in value
    expect(screen.getAllByText('+10.00%').length).toBeGreaterThanOrEqual(2);  // the summary's Return and the window's chip
    expect(screen.getByText(/so the beginning is worked back from today's values and each holding's price history\.$/)).toBeOnTheScreen();
    expect(screen.queryByText(/^Day one:/)).toBeNull();                       // a worked-back window is not day one
    // the sentence: once under the summary, once under the account's card
    expect(screen.getAllByText(SENTENCE).length).toBe(2);

    // THE WALK, all accounts: titled by DEC-5136, beginning $46,364
    expect(screen.getByText('HOW $46,364 BECAME $50,000 · ALL ACCOUNTS')).toBeOnTheScreen();
    // the beginning is read for the day BEFORE the window opens (DEC-0315), a year and a day back
    expect(screen.getByText(`Beginning market value (${dateShown(yearAndADayBack())})`)).toBeOnTheScreen();
    expect(screen.getAllByText('$46,364').length).toBeGreaterThanOrEqual(1);

    // THE CARD (one account, so it is the whole): the same $3,636 and +10.00% — the summary is the sum of the cards
    expect(screen.getByText(/· wealth generated \$3,636 · return \+10\.00%$/)).toBeOnTheScreen();
  });

  // SETTLED 2026-10-13 by DEC-5291 ("approved."): the month is a window the record exists for but cannot reach, and
  // it is now WORKED BACK from VTI's price history on both screens. Was: no figure on either (DEC-3035i).
  test('Home and Performance agree for the same household: Home writes today\'s record on opening, and BOTH work the month back from price history (DEC-5291)', () => {
    useStore.getState().resetAll();
    useStore.setState({ onboardingComplete: true, onboardingProfile: { ...employedPartner, monthlySpending: '4500' }, hideBalances: false,
      assetAccounts: [SCHWAB], transactions: [], snapshotDays: [], invDaily: {}, priceCache: { VTI: VTI_SERIES },
      pricesFetchedAt: new Date().toISOString() } as any);
    render(<HomeScreen />);
    // Home records today's values the moment it opens (captureDailyNw): the record now begins today
    expect(((useStore.getState() as any).snapshotDays ?? []).map((d: any) => d.date)).toEqual([TODAY]);
    // VTI's close before the month opened is $227.27…, today $250: +10.00%, $3,636; the Treasury named below
    expect(screen.getByText(/▲ up \$3,636 \(10\.00%\)/)).toBeOnTheScreen();
    expect(screen.getByText(SENTENCE)).toBeOnTheScreen();
    screen.unmount();
    // the same store on Performance: the month window carries the same +10.00%, and can be picked
    render(<PerformanceScreen />);
    const oneMonth = screen.getAllByRole('button').find((b) => /^Show 1M, /.test(b.props.accessibilityLabel ?? ''));
    expect(oneMonth!.props.accessibilityLabel).toBe('Show 1M, +10.00%');
    expect(oneMonth!.props.accessibilityState?.disabled).toBe(false);
  });
});
