/**
 * DEC-0474 (2026-07-01) — his words: "import from a file - do we need specific format if yes, we should
 * specify. May be have a info dot to explain file type and must have columns?" — approved "yes".
 * Holds: the import screen names the file type and the must-have columns BEFORE a file is picked, and the
 * columns it calls required are the ones the reader actually needs.
 * The fourth test is KNOWN, not a rule: the reader also takes a Value column in place of Quantity, so the card is stricter than the reader.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useStore } from '../../store/useStore';
import ImportHoldingsScreen from '../ImportHoldingsScreen';
import { importHoldings } from '../../domain/import/holdingsImport';

const flat = (c: any): string => (Array.isArray(c) ? c.map(flat).join('') : c == null || typeof c === 'boolean' ? '' : typeof c === 'object' ? flat(c.props?.children) : String(c));

beforeEach(() => {
  jest.clearAllMocks();
  useStore.setState({ assetAccounts: [] } as any);
});

test('DEC-0474 — before a file is picked, the import screen names the file type and the columns a file must have, in this order', () => {
  const { UNSAFE_getAllByType } = render(<ImportHoldingsScreen />);
  // every Text, as the words a person reads (a bullet nests a bold Text inside it; the inner one is a fragment and matches no full line)
  const lines = UNSAFE_getAllByType(Text).map((n: any) => flat(n.props.children).trim());
  const want = [
    'Upload a CSV export from your brokerage (Fidelity, Schwab, Vanguard, Robinhood, and most others). We\'ll read your tickers, shares, and cost — no logins or passwords.',
    'What we look for',
    '• A Symbol / Ticker column',
    '• A Quantity / Shares column',
    '• A Cost basis column (optional — we\'ll still import without it)',
    'Choose a file',
  ];
  const at = want.map((w) => lines.indexOf(w));
  expect(at.every((i) => i >= 0)).toBe(true);                 // every line is on the screen, word for word
  expect([...at].sort((a, b) => a - b)).toEqual(at);          // and in this order
});

test('DEC-0474 — the columns the screen calls required are what the reader needs: Symbol + Quantity import; cost is optional; no Symbol imports nothing', () => {
  const both = importHoldings('Symbol,Quantity\nVTI,10\n');
  expect(both.holdings).toHaveLength(1);
  expect(both.holdings[0]).toMatchObject({ ticker: 'VTI', shares: 10, costPerShare: 0 });   // no cost column → still imports, cost 0

  const withCost = importHoldings('Symbol,Quantity,Cost Basis\nVTI,10,2000\n');
  expect(withCost.holdings[0]).toMatchObject({ ticker: 'VTI', shares: 10, costPerShare: 200 });   // $2,000 ÷ 10 shares

  const aliases = importHoldings('Ticker,Shares\nVTI,10\n');     // the card's other names for the two columns
  expect(aliases.holdings).toHaveLength(1);
  expect(aliases.holdings[0]).toMatchObject({ ticker: 'VTI', shares: 10 });

  const noSymbol = importHoldings('Description,Quantity\nVanguard Total Stock,10\n');
  expect(noSymbol.holdings).toHaveLength(0);
});

test('DEC-0474 — a file missing the must-have columns is refused with the same two columns named', async () => {
  (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: 'file://no-symbol.csv' }] });
  (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('Description,Quantity\nVanguard Total Stock,10\n');
  const { getByText } = render(<ImportHoldingsScreen />);
  fireEvent.press(getByText('Choose a file'));
  await waitFor(() => expect(getByText('We couldn\'t find any holdings in that file. Make sure it\'s a CSV with a symbol/ticker column and a quantity/shares column.')).toBeTruthy());
  expect(useStore.getState().assetAccounts).toHaveLength(0);
});

// KNOWN: the reader accepts a file the card calls incomplete (a value in place of shares, holdingsImport.ts).
test('KNOWN — a Symbol + Value file with NO Quantity column still imports (the card calls Quantity required)', () => {
  const r = importHoldings('Symbol,Value\nKEYBANK CD,5819\n');
  expect(r.holdings).toHaveLength(1);
  expect(r.holdings[0]).toMatchObject({ value: 5819, shares: 0 });
});
