/**
 * HIS BUILD 55 FEEDBACK, 2026-11-04 — walked as he walked it: his own file (MoneyKeel/documents/feedback/
 * Build55-nov4-26-jj.csv), imported through the screen, then Net worth and the account page read as a person reads them.
 *   (1) "Import your holdings - text 'upload csv ...' should be left justified."
 *   (2) "The file imported is not imported accurately." It became four accounts (three "Robinhood Brokerage · 1/2/3" and
 *       "Robinhood Savings"), the CD lost its face value, rate and maturity, and every value was dated the day of import.
 * No live prices in this test: what is shown is what the file says, so it must add up to the file's own $169,664.71.
 */
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useStore } from '../../store/useStore';
import ImportHoldingsScreen from '../ImportHoldingsScreen';

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (cb: any) => { const R = require('react'); R.useEffect(() => cb(), []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link: ({ children }: any) => children,
}));

// his file as E*TRADE exported it (frozen here: the copy in MoneyKeel/documents/feedback was re-saved from a spreadsheet at 23:38)
const HIS_FILE = fs.readFileSync(path.join(__dirname, '__fixtures__/build55-nov4-26-jj_as-exported.csv'), 'utf8');
// the same file after that re-save: "$" and thousands commas on every figure, the price cut to $99.99, the "Generated at" line gone
const RESAVED = fs.readFileSync(path.join(__dirname, '__fixtures__/build55-nov4-26-jj_resaved-2338.csv'), 'utf8');
const textOf = (t: any): string => (Array.isArray(t) ? t.map(textOf).join('') : typeof t === 'string' || typeof t === 'number' ? String(t) : t?.props ? textOf(t.props.children) : '');
const lines = () => screen.UNSAFE_getAllByType(require('react-native').Text).map((t: any) => textOf(t.props.children)).filter(Boolean);

beforeEach(() => {
  jest.clearAllMocks();
  useStore.setState({ assetAccounts: [], transactions: [], priceCache: {}, refreshPrices: async () => {} } as any);
});

test('(1) the "Upload a CSV export …" text is left-aligned', () => {
  render(<ImportHoldingsScreen />);
  const el = screen.getByText(/Upload a CSV export from your brokerage/);
  expect(StyleSheet.flatten(el.props.style).textAlign).toBe('left');
});

async function importHisFile(institution: string, file = HIS_FILE) {
  (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: 'file://Build55-nov4-26-jj.csv' }] });
  (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(file);
  render(<ImportHoldingsScreen />);
  fireEvent.press(screen.getByText('Choose a file'));
  await waitFor(() => expect(screen.getByLabelText('Which institution is this file from')).toBeTruthy());
  fireEvent.changeText(screen.getByLabelText('Which institution is this file from'), institution);
  fireEvent.press(screen.getByLabelText(/Import 5 holdings/));
  await waitFor(() => expect(useStore.getState().assetAccounts.length).toBe(1));
  screen.unmount();
  return useStore.getState().assetAccounts[0] as any;
}

test('(2) his file is ONE account, $169,664.71, dated Jun 21, 2026 — on Net worth and on its own page', async () => {
  const acct = await importHisFile('Robinhood');
  expect([acct.label, acct.mask, acct.value_as_of, acct.recon_break]).toEqual(['Individual Brokerage', '••2203', '2026-06-21', undefined]);

  // Net worth: one account, the file's own total, each class its own share of it
  const NetWorthScreen = require('../NetWorthScreen').default;
  render(<NetWorthScreen />);
  const nw = lines();
  expect(nw).toContain('$169,665');
  expect(nw.filter((l) => /Robinhood (Brokerage|Savings)/.test(l))).toEqual([]);     // was four accounts
  expect(nw.some((l) => /Bonds & CDs 65%/.test(l))).toBe(true);
  screen.unmount();

  // the account page: named and dated as the file is; the CD keeps its face, rate and maturity
  mockParams = { id: acct.asset_id };
  const AccountPortfolioScreen = require('../AccountPortfolioScreen').default;
  render(<AccountPortfolioScreen />);
  const page = lines();
  expect(page.some((l) => /Value as of Jun 21, 2026/.test(l))).toBe(true);
  expect(page.some((l) => /Value as of Nov/.test(l))).toBe(false);
  expect(page.some((l) => /\$110,000 face · 3\.85%/.test(l))).toBe(true);
  expect(page.some((l) => /Aug 24, 2026/.test(l))).toBe(true);
  expect(page).toContain('$169,665');
});

test('(2b) the CD\'s own page agrees with the account page: $109,993 (the file\'s value), not $110,000 (what was paid)', async () => {
  const acct = await importHisFile('Robinhood');
  const cd = acct.positions.find((p: any) => /^KEY BANK/.test(p.ticker));
  mockParams = { account: acct.asset_id, position: cd.position_id };
  const HoldingDetailScreen = require('../HoldingDetailScreen').default;
  render(<HoldingDetailScreen />);
  const page = lines();
  expect(page).toContain('$109,993');
  expect(page.some((l) => /NO LIVE PRICE — SHOWING WHAT YOU PAID/.test(l))).toBe(false);
});

test('(2c) the same file re-saved from a spreadsheet imports the same account; it states no date, so it is dated the day of import', async () => {
  const acct = await importHisFile('Robinhood', RESAVED);
  const cd = acct.positions.find((p: any) => /^KEY BANK/.test(p.ticker));
  expect([acct.label, acct.mask, acct.cash_balance, acct.recon_break]).toEqual(['Individual Brokerage', '••2203', 7096.82, undefined]);
  expect(acct.balance).toBeCloseTo(169664.71, 6);
  expect([cd.face_value, cd.coupon_rate, cd.maturity_date, cd.price_quote]).toEqual([110000, 0.0385, '2026-08-24', 'per_100_of_face']);
  expect(acct.value_as_of).toBe(require('../../domain/_shared/dates').isoLocalDate(new Date()));   // the person's day, not UTC's
});
