/**
 * HIS BUILD 55 FEEDBACK, 2026-11-04 (screenshots IMG_0894 to IMG_0897), walked as he walked it:
 *   "bond facts section show not entered but no intuitive way to enter those values. User should be able to click on it and enter."
 *   "When I clicked edit, there was no way to edit, only actionable thing was to click on Add a bond."
 *   "When I clicked add a bond … I cannot see top, cannot go back."
 * His state: the KEY BANK CD as a bond account of its own (how Build 55 imported it), no face, no rate, no maturity.
 */
import React from 'react';
import { render, fireEvent, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { useStore } from '../../store/useStore';

let mockParams: Record<string, string | undefined> = {};
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: mockPush, replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (cb: any) => { const R = require('react'); R.useEffect(() => cb(), []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link: ({ children }: any) => children,
}));

const CD = { asset_id: 'cd1', label: 'KEY BANK CD CLEVELAND OH CD 3.85% 08/24/2026', kind: 'fixed_income', asset_class: 'bonds',
  balance: 109992.74, target_return: 0.042, institution: 'Robinhood', source: 'imported', value_as_of: '2026-11-04' };

beforeEach(() => {
  jest.clearAllMocks();
  useStore.setState({ assetAccounts: [{ ...CD }], transactions: [], priceCache: {} } as any);
  mockParams = { id: 'cd1' };
});

const AccountPortfolioScreen = () => { const C = require('../AccountPortfolioScreen').default; return <C />; };

test('a BOND FACTS row that reads "not entered" opens this bond\'s editor, and what is typed there shows on the page', () => {
  render(<AccountPortfolioScreen />);
  const facts = within(screen.getByTestId('card-bond-facts'));
  fireEvent.press(facts.getByLabelText(/^Face value: .*Opens the editor to enter it\./));
  expect(screen.getByText('Edit bond')).toBeTruthy();
  fireEvent.changeText(screen.getByLabelText(/^Face \(par\) value/), '110000');
  fireEvent.press(screen.getByText('Save'));
  expect((useStore.getState().assetAccounts[0] as any).face_value).toBe(110000);
  expect(within(screen.getByTestId('card-bond-facts')).getByText('$110,000')).toBeTruthy();
});

test('the rate and the maturity date, not entered, open the same editor', () => {
  render(<AccountPortfolioScreen />);
  const facts = within(screen.getByTestId('card-bond-facts'));
  fireEvent.press(facts.getByLabelText(/^Interest payments: .*Opens the editor/));
  expect(screen.getByText('Edit bond')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Close'));
  fireEvent.press(facts.getByLabelText(/^Matures: .*Opens the editor/));
  expect(screen.getByText('Edit bond')).toBeTruthy();
});

test('Edit on the bond\'s page opens THIS bond\'s editor — not the list of bonds', () => {
  render(<AccountPortfolioScreen />);
  fireEvent.press(within(screen.getByTestId('account-buttons')).getByText('Edit'));
  expect(mockPush).not.toHaveBeenCalledWith('/bonds');
  expect(screen.getByText('Edit bond')).toBeTruthy();
});

test('the Bonds list: each card shows it opens, and the Add a bond sheet fits the screen and has a ✕', () => {
  const BondsScreen = require('../BondsScreen').default;
  render(<BondsScreen />);
  expect(screen.getByLabelText(/KEY BANK CD.*Opens the editor\./)).toBeTruthy();
  expect(screen.getAllByText('›').length).toBeGreaterThanOrEqual(1);
  fireEvent.press(screen.getAllByLabelText('Add a bond')[0]);
  expect(screen.getByText('Add a bond', { selector: undefined } as any)).toBeTruthy();
  // the sheet is limited to a share of the screen; the ScrollView inside is free to shrink
  let node: any = screen.getByLabelText('Close');
  while (node && !(StyleSheet.flatten(node.props?.style ?? {}) as any).maxHeight) node = node.parent;
  expect((StyleSheet.flatten(node.props.style) as any).maxHeight).toBe('90%');
  fireEvent.press(screen.getByLabelText('Close'));
  expect(screen.queryByText('Add bond')).toBeNull();
});
