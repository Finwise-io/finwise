/** NET WORTH'S OWN ADD AND EDIT SHEET — TWO GAPS CLOSED ON 2026-10-20.
 *
 *  1. A CD ADDED HERE ASKS ITS INTEREST RATE. His ruling DEC-3837 (2026-10-10): a bank CD's yield to maturity is its
 *     interest rate. Add an account asks the rate of a bond or a CD in one box (its words, its placeholder, its spoken
 *     name); this sheet's Cash → CD path asked where the CD was bought and no rate, so a CD added here read its yield as
 *     not entered. It asks now, in Add an account's order (the rate, then where it was bought, then when it matures). An
 *     empty box is not entered; a typed 0 is 0% (DEC-2748b). No drawing shows this path: a dated READ THIS FIRST row on
 *     the Net worth drawing v08 (frame G) says so.
 *  2. A NEW BALANCE SAVED IN THE EDITOR IS DATED TODAY, as Add an account and the account page's Update value date it.
 *     The editor saved the new value and kept the old date, so the account page printed the old day beside the new value.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { theBonds } from '../../../MoneyKeel/functions/networth-and-performance/bonds';
import { isoLocalDate, dateShown } from '../../domain/_shared/dates';

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
  router: { push: jest.fn(), back: jest.fn(), setParams: jest.fn() },
  useFocusEffect: () => {},
  useSegments: () => [],
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));

const NetWorthScreen = require('../NetWorthScreen').default;
const AccountPortfolioScreen = require('../AccountPortfolioScreen').default;
const st = () => useStore.getState() as any;
const today = isoLocalDate(new Date());
const daysAgo = (n: number) => isoLocalDate(new Date(Date.now() - n * 86_400_000));
beforeEach(() => {
  useStore.getState().resetAll();
  mockParams = {};
  useStore.setState({ hideBalances: false, nwSeeded: true, nwSetupChoice: 'guided', onboardingComplete: true } as any);
});

/** Cash → CD on the Net worth add sheet: Chase, $10,000, the rate typed as given (or left empty). */
const addChaseCd = (rate?: string) => {
  render(<NetWorthScreen />);
  fireEvent.press(screen.getByLabelText('Add to Cash'));
  expect(screen.queryByLabelText('Coupon percent')).toBeNull();          // checking is picked first: no rate box
  fireEvent.press(screen.getByLabelText('CD'));
  expect(screen.getByText('Interest rate % (optional)')).toBeOnTheScreen();
  const box = screen.getByLabelText('Coupon percent');
  expect(box.props.placeholder).toBe('4.5');                             // Add an account's box, word for word
  if (rate != null) fireEvent.changeText(box, rate);
  fireEvent.changeText(screen.getByPlaceholderText('Institution / name (e.g. Chase)'), 'Chase');
  fireEvent.changeText(screen.getByPlaceholderText('0'), '10000');
  fireEvent.press(screen.getByLabelText('Add account'));
  return st().assetAccounts.find((a: any) => a.institution === 'Chase');
};

test('Cash → CD with 4.2 typed: saved at 4.2%, and a bank CD\'s yield to maturity is its rate — 4.20%, not "not entered"', () => {
  const cd = addChaseCd('4.2');
  expect(cd).toMatchObject({ kind: 'cd', cd_bought: 'bank' });
  expect(cd.coupon_rate).toBeCloseTo(0.042, 12);
  // with the maturity date picked on the same sheet (a yield needs a date to run to), the account page reads its yield
  const dated = { ...cd, maturity_date: `${new Date().getFullYear() + 2}-06-30` };
  expect(theBonds({ accounts: [dated], accountId: String(cd.asset_id) }).one!.yieldToMaturity).toBeCloseTo(0.042, 12);
  // the same CD without the rate — what this sheet saved until 2026-10-20 — has no yield to show
  expect(theBonds({ accounts: [{ ...dated, coupon_rate: undefined }], accountId: String(cd.asset_id) }).one!.yieldToMaturity).toBeNull();
});

test('the rate box comes before where it was bought, as on Add an account', () => {
  render(<NetWorthScreen />);
  fireEvent.press(screen.getByLabelText('Add to Cash'));
  fireEvent.press(screen.getByLabelText('CD'));
  const words = JSON.stringify(screen.toJSON());
  const rateAt = words.indexOf('Interest rate % (optional)');
  const boughtAt = words.indexOf('Bought from the bank, or through a broker?');
  const maturesAt = words.indexOf('Matures (optional)');
  expect(rateAt).toBeGreaterThan(0);
  expect(rateAt).toBeLessThan(boughtAt);
  expect(boughtAt).toBeLessThan(maturesAt);
});

test('left empty, the rate is not entered — never 0% (DEC-2748b); a typed 0 is 0%', () => {
  expect(addChaseCd().coupon_rate).toBeUndefined();
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, nwSeeded: true, nwSetupChoice: 'guided', onboardingComplete: true } as any);
  screen.unmount();
  expect(addChaseCd('0').coupon_rate).toBe(0);
});

test('a cash kind that is not a CD is never asked a rate here, and saves none', () => {
  render(<NetWorthScreen />);
  fireEvent.press(screen.getByLabelText('Add to Cash'));
  fireEvent.press(screen.getByLabelText('Savings'));
  expect(screen.queryByLabelText('Coupon percent')).toBeNull();
  fireEvent.changeText(screen.getByPlaceholderText('Institution / name (e.g. Chase)'), 'Ally');
  fireEvent.changeText(screen.getByPlaceholderText('0'), '5000');
  fireEvent.press(screen.getByLabelText('Add account'));
  expect(st().assetAccounts.find((a: any) => a.institution === 'Ally').coupon_rate).toBeUndefined();
});

test('the edit sheet of a CD shows its saved rate and can change it', () => {
  useStore.setState({ nwSetupChoice: 'self', assetAccounts: [{ asset_id: 'cd1', label: 'Chase', institution: 'Chase', kind: 'cd', asset_class: 'bonds',
    balance: 10000, coupon_rate: 0.045, cd_bought: 'bank' }] } as any);
  mockParams = { edit: 'cd1' };
  render(<NetWorthScreen />);
  expect(screen.getByLabelText('Coupon percent').props.value).toBe('4.5');
  fireEvent.changeText(screen.getByLabelText('Coupon percent'), '4.75');
  fireEvent.press(screen.getByLabelText('Save account'));
  expect(st().assetAccounts[0].coupon_rate).toBeCloseTo(0.0475, 12);
});

test('editing a balance from $8,000 (as of 49 days ago) to $8,400: the account page shows $8,400, valued as of today', () => {
  const was = daysAgo(49);
  useStore.setState({ nwSetupChoice: 'self', assetAccounts: [{ asset_id: 'chk', label: 'Chase Checking', institution: 'Chase', kind: 'checking',
    tax_bucket: 'CASH', balance: 8000, target_return: 0, value_as_of: was, source: 'manual' }] } as any);
  mockParams = { edit: 'chk' };
  render(<NetWorthScreen />);
  fireEvent.changeText(screen.getByPlaceholderText('0'), '8400');
  fireEvent.press(screen.getByLabelText('Save account'));
  expect(st().assetAccounts[0]).toMatchObject({ balance: 8400, value_as_of: today });
  screen.unmount();
  mockParams = { id: 'chk' };
  render(<AccountPortfolioScreen />);
  expect(screen.getByText(`Value as of ${dateShown(today)}`)).toBeOnTheScreen();
  expect(screen.queryByText(`Value as of ${dateShown(was)}`)).toBeNull();
  expect(screen.getAllByText(/\$8,400/).length).toBeGreaterThan(0);
});

test('a save that does not change the value keeps its date; a balance never entered opens empty and stays not entered', () => {
  const was = daysAgo(49);
  useStore.setState({ nwSetupChoice: 'self', assetAccounts: [
    { asset_id: 'chk', label: 'Chase Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 8000, target_return: 0, value_as_of: was, source: 'manual' },
    { asset_id: 'cd', label: 'Ally CD', institution: 'Ally', kind: 'cd', asset_class: 'bonds', balance: undefined },
  ] } as any);
  mockParams = { edit: 'chk' };
  render(<NetWorthScreen />);
  fireEvent.changeText(screen.getByPlaceholderText('Institution / name (e.g. Chase)'), 'JPMorgan Chase');
  fireEvent.press(screen.getByLabelText('Save account'));
  expect(st().assetAccounts.find((a: any) => a.asset_id === 'chk')).toMatchObject({ balance: 8000, value_as_of: was, institution: 'JPMorgan Chase' });
  screen.unmount();
  mockParams = { edit: 'cd' };
  render(<NetWorthScreen />);
  expect(screen.getByPlaceholderText('0').props.value).toBe('');      // it read "undefined" before, saved as $0
  fireEvent.press(screen.getByLabelText('Save account'));
  const cd = st().assetAccounts.find((a: any) => a.asset_id === 'cd');
  expect(cd.balance).toBeUndefined();                                  // still "Value not entered" (DEC-3657), never $0
  expect(cd.value_as_of).toBeUndefined();
});
