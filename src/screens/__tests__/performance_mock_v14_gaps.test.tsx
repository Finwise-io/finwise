/** THE APPROVED DESIGN, BUILT — the four lines mock v14 draws that the build did not have.
 *
 *  WHY (2026-09-26). The founder asked for an audit of Net worth and Performance "per standards and
 *  rulings". Comparing every static string the approved mock draws against every string the app can
 *  render found seven; four are pure copy and are built here, and each gets a test so the next edit
 *  cannot quietly drop it again. (Mock v14 was approved and built on 2026-09-25 — "approved. save and
 *  built it" — so these were gaps in that build, not new design.)
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';

const LINKED = {
  asset_id: 'et1', label: 'E*TRADE Account 1', institution: 'E*TRADE', kind: 'brokerage',
  tax_bucket: 'TAXABLE', balance: 52704, source: 'connected', last_synced: new Date().toISOString(),
  positions: [{ position_id: 'p1', ticker: 'LCTX', name: 'Lineage Cell', asset_class: 'stock', last_price: 41.45,
    lots: [{ shares: 100, cost_per_share: 38 }] }],
} as any;

beforeEach(() => {
  jest.spyOn(require('expo-router'), 'useLocalSearchParams').mockReturnValue({ id: 'et1' });
  // the walk only exists when the daily record reaches back before today — the same rule the screen
  // states on its face ("—" when it cannot read a beginning), so the fixture writes two real days
  const d = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
  const day = (date: string, value: number) => ({
    date, origin: 'observed' as const, writtenAt: `${date}T12:00:00.000Z`,
    holdings: [{ date, accountId: 'et1', securityKey: 'LCTX', units: 100, price: value / 100, value, currency: 'USD' }],
    accounts: [{ date, accountId: 'et1', cash: 0, statedTotal: value, currency: 'USD' }],
  });
  useStore.setState({
    assetAccounts: [LINKED],
    transactions: [{ id: 't1', account_id: 'et1', date: d(1), type: 'DIVIDEND', amount: 120, source: 'connected' }],
    invDaily: { [d(9)]: 50000, [d(1)]: 52000 },
    snapshotDays: [day(d(9), 50000), day(d(1), 52000)],
  } as any);
});

test('a class with nothing in it keeps its heading and says so', () => {
  const AccountPortfolioScreen = require('../AccountPortfolioScreen').default;
  render(<AccountPortfolioScreen />);
  // the account holds only a stock: Bonds, Cash and Alternatives are empty and still drawn
  expect(screen.getAllByText('Nothing held in this account').length).toBeGreaterThan(0);
});

test('the activity list says which records can be edited and which cannot', () => {
  const AccountPortfolioScreen = require('../AccountPortfolioScreen').default;
  render(<AccountPortfolioScreen />);
  expect(screen.getByText(/Records from E\*TRADE can’t be edited/)).toBeOnTheScreen();
});

test('a linked account’s walk says where its lines come from', () => {
  const AccountPortfolioScreen = require('../AccountPortfolioScreen').default;
  render(<AccountPortfolioScreen />);
  expect(screen.getByText(/Every line here comes from E\*TRADE’s own records/)).toBeOnTheScreen();
});

/** THE FIFTH LINE — the one I left unbuilt on 2026-09-26 because it promised a tap the screen did not
 *  have. The founder, 2026-09-27: "build it". The bar over each account walk now does two things: the
 *  NAME opens that account's own page, everything else on the bar collapses the walk — and only now
 *  does the screen print the line that says so. */
test('the account band: the name opens the account, the bar collapses the walk', () => {
  const { fireEvent } = require('@testing-library/react-native');
  const router = require('expo-router').router;
  const push = jest.spyOn(router, 'push').mockImplementation(() => {});
  const SectionBand = require('../../components/SectionBand').SectionBand;
  const toggle = jest.fn();
  const { TouchableOpacity } = require('react-native');
  render(
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="collapse" onPress={toggle}>
      <SectionBand inCard title="▾ E*TRADE Account 1" value="$52,704"
        onTitlePress={() => router.push('/account-detail?id=et1')}
        titleHint="Open E*TRADE Account 1 — this account's own page" />
    </TouchableOpacity>,
  );
  // the name is its own door, with its own spoken label
  fireEvent.press(screen.getByLabelText("Open E*TRADE Account 1 — this account's own page"));
  expect(push).toHaveBeenCalledWith('/account-detail?id=et1');
  expect(toggle).not.toHaveBeenCalled();     // opening the account must NOT also collapse the walk
  // the rest of the bar still collapses
  fireEvent.press(screen.getByLabelText('collapse'));
  expect(toggle).toHaveBeenCalledTimes(1);
  push.mockRestore();
});

test('a band with no door on its title is unchanged — the title is plain text', () => {
  const SectionBand = require('../../components/SectionBand').SectionBand;
  render(<SectionBand inCard title="WHAT YOU OWN" value="$354,314" />);
  expect(screen.getByText('WHAT YOU OWN')).toBeOnTheScreen();
  expect(screen.queryByLabelText('WHAT YOU OWN')).toBeNull();   // no button wrapped around it
});

/** A CD IS NOT A TRADEABLE BOND (founder, 2026-09-27: "CD rates don't move and one can do nothing if
 *  CD rates move"). The screen was showing a CD holder "Rates rise 1% → value roughly $X–$Y (down
 *  about $Z)" — a bank CD is not marked to market, cannot be sold, and is worth its balance until it
 *  matures. The only way out is an early withdrawal at the penalty the contract fixes. */
describe('a CD is told the truth about rates', () => {
  const inYears = (n: number) => new Date(Date.now() + n * 365 * 864e5).toISOString().slice(0, 10);
  const fixed = (label: string) => ({
    asset_id: 'cd1', label, institution: 'KeyBank', kind: 'fixed_income', tax_bucket: 'TAXABLE',
    balance: 10000, face_value: 10000, coupon_rate: 0.04, maturity_date: inYears(2), source: 'manual',
  } as any);

  beforeEach(() => jest.spyOn(require('expo-router'), 'useLocalSearchParams').mockReturnValue({ id: 'cd1' }));

  test('a CD is never told its value falls when rates rise', () => {
    useStore.setState({ assetAccounts: [fixed('KeyBank CD 4.00%')] } as any);
    render(require('react').createElement(require('../AccountPortfolioScreen').default));
    expect(screen.queryByText(/Rates rise 1%/)).toBeNull();
    expect(screen.getByText(/Nothing happens to this CD/)).toBeOnTheScreen();
    expect(screen.getByText(/fixed penalty/)).toBeOnTheScreen();
  });

  test('a real bond still gets the rates-move estimate', () => {
    useStore.setState({ assetAccounts: [fixed('US Treasury 4.25% 2028')] } as any);
    render(require('react').createElement(require('../AccountPortfolioScreen').default));
    expect(screen.getByText(/Rates rise 1%/)).toBeOnTheScreen();
  });
});
