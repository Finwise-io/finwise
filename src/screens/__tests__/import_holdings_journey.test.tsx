/**
 * Critical journey: add holdings by importing a brokerage CSV. Pick file → parse/preview →
 * confirm → a new asset account with the parsed positions lands in Net Worth.
 */
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
