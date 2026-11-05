/**
 * DEC-2159 / his 2026-10-20 words: "always the class broker sends." A holdings file that carries its own type column
 * (Schwab's "Security Type") is the broker sending the class. The importer reads it, and the Import screen keeps it on
 * each saved holding, so every reader — Net worth's class rows, the account split, the emergency fund, Performance's
 * categories, the account page — files the holding where the file put it, on every read (MK-NW-F-109 holdingClassOf).
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useStore } from '../../store/useStore';
import { holdingClassOf, accountClassBreakdown } from '../../domain/assets';
import ImportHoldingsScreen from '../ImportHoldingsScreen';

beforeEach(() => {
  jest.clearAllMocks();
  useStore.setState({ assetAccounts: [] } as any);
});

test('DEC-2159 / his 2026-10-20 words: a bond ETF the file types as an ETF is saved with that type and read as Stocks / Funds; a fund the file types as cash is Cash', async () => {
  (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: 'file://schwab.csv' }] });
  (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('Symbol,Description,Quantity,Cost Basis,Market Value,Security Type\n'
    + 'VTI,VANGUARD TOTAL STOCK MARKET ETF,10,2000,2500,ETFs & Closed End Funds\n'
    + 'BND,VANGUARD TOTAL BOND MARKET ETF,100,7000,7200,ETFs & Closed End Funds\n'
    + 'SWVXX,SCHWAB VALUE ADVANTAGE MONEY FUND,5000,5000,5000,Cash and Money Market\n');

  const { getByText, getByLabelText } = render(<ImportHoldingsScreen />);
  fireEvent.press(getByText('Choose a file'));
  await waitFor(() => expect(getByLabelText(/Name the institution first/)).toBeTruthy());
  fireEvent.changeText(getByLabelText('Which institution is this file from'), 'Schwab');
  fireEvent.press(getByLabelText(/Import \d+ holdings?/));

  // one file, one account since 2026-11-04 (his Build 55 feedback): the money fund is a holding of the account, in Cash
  await waitFor(() => expect(useStore.getState().assetAccounts.length).toBe(1));
  const brokerage: any = useStore.getState().assetAccounts[0];
  const bnd = brokerage.positions.find((p: any) => p.ticker === 'BND');
  expect(bnd.broker_type).toBe('ETFs & Closed End Funds');           // kept exactly as the file wrote it
  expect(holdingClassOf(bnd)).toBe('stocks_etf');                    // was Bonds & CDs by its name
  expect(accountClassBreakdown(brokerage)?.bonds ?? 0).toBe(0);
  const mmf = brokerage.positions.find((p: any) => p.ticker === 'SWVXX');
  expect([mmf.broker_type, holdingClassOf(mmf)]).toEqual(['Cash and Money Market', 'cash']);   // was Stocks / Funds by its name
  expect(accountClassBreakdown(brokerage)?.cash).toBe(5000);
});
