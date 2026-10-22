/** NET WORTH'S STEP-BY-STEP ADD ASKS A CD WHERE IT WAS BOUGHT (DEC-3837, 2026-10-10) — launch check of 2026-10-20.
 *
 *  His ruling: "Interest rate % is the coupon, and yield to maturity could be different from coupon/interest rate % for
 *  CD bought in secondary market … #4 - yes". Add an account and the Bonds editor ask "Bought from the bank, or through a
 *  broker?". Net worth's own add sheet (Cash → CD) never asked, and saved the CD as kind 'fixed_income' named by its
 *  institution — so "Chase" was read as a bond, not a CD: priced like one, with a rates-move estimate a bank CD does not
 *  have. It now saves kind 'cd', asks the question in the same words, and saves the answer; its edit sheet shows it.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { theBonds, isCertificateOfDeposit } from '../../../MoneyKeel/functions/networth-and-performance/bonds';

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
const st = () => useStore.getState() as any;
beforeEach(() => {
  useStore.getState().resetAll();
  mockParams = {};
  useStore.setState({ hideBalances: false, nwSeeded: true, nwSetupChoice: 'guided', onboardingComplete: true } as any);
});
const QUESTION = 'Bought from the bank, or through a broker?';

/** Cash → CD on the Net worth add sheet, institution "Chase", $10,000. */
const addChaseCd = (answer?: 'CD bought from the bank' | 'CD bought through a broker') => {
  render(<NetWorthScreen />);
  fireEvent.press(screen.getByLabelText('Add to Cash'));
  expect(screen.queryByText(QUESTION)).toBeNull();                       // checking is picked first: no question
  fireEvent.press(screen.getByLabelText('CD'));
  expect(screen.getByText(QUESTION)).toBeOnTheScreen();
  expect(screen.getByLabelText('CD bought from the bank').props.accessibilityState).toEqual({ selected: true });   // not answered = bank
  if (answer) fireEvent.press(screen.getByLabelText(answer));
  fireEvent.changeText(screen.getByPlaceholderText('Institution / name (e.g. Chase)'), 'Chase');
  fireEvent.changeText(screen.getByPlaceholderText('0'), '10000');
  fireEvent.press(screen.getByLabelText('Add account'));
  return st().assetAccounts.find((a: any) => a.institution === 'Chase');
};
/** The rate and face the person adds afterwards (on Bonds or the account page), and what the bonds door then says. */
const asTheAccountPageReadsIt = (cd: any) => {
  const withRate = { ...cd, face_value: 10000, coupon_rate: 0.042, maturity_date: `${new Date().getFullYear() + 2}-06-30` };
  return theBonds({ accounts: [withRate], accountId: String(cd.asset_id) });
};

test('Cash → CD, institution "Chase", left unanswered: saved as a CD bought from the bank — its yield is its rate, no rates-move card', () => {
  const cd = addChaseCd();
  expect(cd).toMatchObject({ kind: 'cd', asset_class: 'bonds', label: 'Chase', cd_bought: 'bank' });
  expect(isCertificateOfDeposit(cd)).toBe(true);                         // it used to be kind 'fixed_income' named "Chase": a bond
  const b = asTheAccountPageReadsIt(cd);
  expect(b.rows[0].isCD).toBe(true);
  expect(b.rows[0].pricedLikeBond).toBe(false);
  expect(b.one!.yieldToMaturity).toBe(0.042);                            // a bank CD yields its rate
  expect(b.one!.ratesMove).toBeNull();                                    // no if-rates-move card
  expect(b.one!.ratesMoveRefusal).toMatch(/^Nothing happens to this CD\./);
});

test('Cash → CD, "Through a broker": saved as broker-bought — priced like a bond, with the rates-move estimate', () => {
  const cd = addChaseCd('CD bought through a broker');
  expect(cd).toMatchObject({ kind: 'cd', cd_bought: 'broker' });
  const b = asTheAccountPageReadsIt(cd);
  expect(b.rows[0].pricedLikeBond).toBe(true);
  expect(b.one!.ratesMove).not.toBeNull();
  expect(b.one!.ratesMoveRefusal).toBe('');
});

test('a cash kind that is not a CD is never asked, and saves no answer', () => {
  render(<NetWorthScreen />);
  fireEvent.press(screen.getByLabelText('Add to Cash'));
  fireEvent.press(screen.getByLabelText('Savings'));
  expect(screen.queryByText(QUESTION)).toBeNull();
  fireEvent.changeText(screen.getByPlaceholderText('Institution / name (e.g. Chase)'), 'Ally');
  fireEvent.changeText(screen.getByPlaceholderText('0'), '5000');
  fireEvent.press(screen.getByLabelText('Add account'));
  expect(st().assetAccounts.find((a: any) => a.institution === 'Ally').cd_bought).toBeUndefined();
});

test('the edit sheet of a CD shows the saved answer and can change it', () => {
  useStore.setState({ nwSetupChoice: 'self', assetAccounts: [{ asset_id: 'cd1', label: 'Chase', institution: 'Chase', kind: 'cd', asset_class: 'bonds',
    balance: 10000, target_return: 0.042, cd_bought: 'broker' }] } as any);
  mockParams = { edit: 'cd1' };
  render(<NetWorthScreen />);
  expect(screen.getByText(QUESTION)).toBeOnTheScreen();
  expect(screen.getByLabelText('CD bought through a broker').props.accessibilityState).toEqual({ selected: true });
  fireEvent.press(screen.getByLabelText('CD bought from the bank'));
  fireEvent.press(screen.getByLabelText('Save account'));
  expect(st().assetAccounts[0].cd_bought).toBe('bank');
});
