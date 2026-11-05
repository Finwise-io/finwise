/** DEC-0403 — "held as a float, decimals shown only for prices" (master Q49, 2026-09-09): the holdings import saves
 *  each figure exactly as the file gives it. Until 2026-10-20 it cut the cost per share, the account's value and each
 *  row's value to cents before storing them: a $1,500 cost over 7 shares was kept as $214.29 a share (which adds back
 *  to $1,500.03), and a $250.125 cash line as $250.13. This fails on that code. */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useStore } from '../../store/useStore';
import ImportHoldingsScreen from '../ImportHoldingsScreen';

beforeEach(() => {
  jest.clearAllMocks();
  useStore.setState({ assetAccounts: [] } as any);
});

test('DEC-0403 — an imported cost per share and an imported value are saved exact, not cut to cents', async () => {
  (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: 'file://x.csv' }] });
  (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('Symbol,Quantity,Cost Basis,Value\nAAPL,7,1500,1600.005\nCASH,,,250.125\n');

  const { getByText, getByLabelText } = render(<ImportHoldingsScreen />);
  fireEvent.press(getByText('Choose a file'));
  await waitFor(() => expect(getByLabelText('Which institution is this file from')).toBeTruthy());
  fireEvent.changeText(getByLabelText('Which institution is this file from'), 'Fidelity');
  fireEvent.press(getByLabelText(/Import \d+ holdings?/));

  // one file, one account since 2026-11-04 (his Build 55 feedback): the cash line is the account's own cash
  await waitFor(() => expect(useStore.getState().assetAccounts.length).toBe(1));
  const brokerage: any = useStore.getState().assetAccounts[0];
  expect(brokerage.positions[0].lots[0].cost_per_share).toBe(1500 / 7);   // 214.2857142857…, was 214.29
  expect(brokerage.cash_balance).toBe(250.125);                           // was 250.13
});

// A goal is now held at full precision, so the goal editor must show it to the cent — it printed String(saved), which a
// third of $100 funded from the surplus turns into "33.333333333333336" (2026-10-20).
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));
test('DEC-0403 — a goal held exact opens in its editor to the cent, never as a long decimal', () => {
  const GoalsScreen = require('../GoalsScreen').default;
  useStore.setState({ goals: [{ id: 'g1', label: 'Trip', icon: '✈️', target: 1000, saved: 100 / 3, color: '#000' }] } as any);
  const sc = render(<GoalsScreen />);
  fireEvent.press(sc.getByText(/Trip$/));   // the goal's name rides its card's light bar with its icon since 2026-10-27
  // the boxes print their figure as money since 2026-10-27 (DEC-8385, every money box is a MoneyBox): the figure is the same cent
  expect(sc.getByDisplayValue('$33.33')).toBeTruthy();
  expect(sc.getByDisplayValue('$1,000')).toBeTruthy();
  expect(sc.queryByDisplayValue(/33\.3333/)).toBeNull();
});
