/**
 * Critical journey: add holdings by importing a brokerage CSV. Pick file → parse/preview →
 * confirm → a new asset account with the parsed positions lands in Net Worth.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useStore } from '../../store/useStore';
import { assetClassOf } from '../../domain/assets';
import ImportHoldingsScreen from '../ImportHoldingsScreen';

beforeEach(() => {
  jest.clearAllMocks();
  useStore.setState({ assetAccounts: [] } as any);
});

test('import holdings: pick CSV → preview → adds positions to Net Worth', async () => {
  (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: 'file://x.csv' }] });
  (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('Ticker,Shares,Cost Basis\nAAPL,10,1500\nMSFT,5,1500\n');

  const { getByText, getByLabelText } = render(<ImportHoldingsScreen />);
  fireEvent.press(getByText('Choose a file'));                       // pickFile → parse → preview
  await waitFor(() => expect(getByLabelText(/Add \d+ holdings?/)).toBeTruthy());
  fireEvent.press(getByLabelText(/Add \d+ holdings?/));              // confirmImport → store.addAsset

  await waitFor(() => expect(useStore.getState().assetAccounts.length).toBe(1));
  const acct: any = useStore.getState().assetAccounts[0];
  expect(acct.positions.map((p: any) => p.ticker).sort()).toEqual(['AAPL', 'MSFT']);
});

test('import a REAL E*TRADE export → accounts sorted by asset class through the screen (#13)', async () => {
  const csv = [
    'Account Summary',
    'Account,Net Account Value,Total Gain $',
    '"Individual Brokerage -2203",169664.71,-4146.87',
    '',
    'Symbol,Last Price $,Change $,Change %,Quantity,Price Paid $,Day\'s Gain $,Total Gain $,Total Gain %,Value $',
    'KEY BANK CD CLEVELAND OH CD 3.85% 08/24/2026,99.9934,--,--,110000.0000,100.00,3.7400,-7.2600,-.0066,109992.7400',
    'LCTX,1.21,-0.04,-3.20,965.0000,1.74,-38.6000,-511.4500,-30.4598,1167.6500',
    "QQQ Dec 31 '26 $600 Put,14.16,0.00,0.00,1.0000,50.35,.0000,-3628.1600,-72.0493,1407.5000",
    'VMFXX,1.00,0.00,0.00,50000.0000,1.00,.0000,.0000,.0000,50000.0000',
    'CASH,,,,,,,,,7096.82,',
    'TOTAL,,,,166714.76,-34.86,-4146.87,-2.49,169664.71,',
  ].join('\n');
  (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: 'file://etrade.csv' }] });
  (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(csv);

  const { getByText, getByLabelText } = render(<ImportHoldingsScreen />);
  fireEvent.press(getByText('Choose a file'));
  await waitFor(() => expect(getByLabelText(/Add \d+ holdings?/)).toBeTruthy());
  fireEvent.press(getByLabelText(/Add \d+ holdings?/));

  await waitFor(() => expect(useStore.getState().assetAccounts.length).toBe(5));
  const accts = useStore.getState().assetAccounts as any[];
  const cls = (c: string) => accts.filter((a) => assetClassOf(a) === c);

  // one equity brokerage (LCTX position) + 3 cash (CD, VMFXX, CASH) + 1 alternatives (the option)
  expect(cls('stocks_etf').length).toBe(1);
  expect(cls('stocks_etf')[0].positions.map((p: any) => p.ticker)).toEqual(['LCTX']);
  expect(cls('cash').length).toBe(3);
  expect(cls('alternatives').length).toBe(1);
  // the option is NOT a fake stock position
  expect(cls('alternatives')[0].positions ?? []).toHaveLength(0);
});
