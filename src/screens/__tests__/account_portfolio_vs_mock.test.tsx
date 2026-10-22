/** THE ACCOUNT PORTFOLIO SCREEN AND ITS APPROVED DESIGN — DEC-0646, then DEC-6457.
 *
 *  DEC-0646, his decision of 2026-10-01: *"Account detail v01 - not approved. Account detail screen should be same as
 *  Account Portfolio screen - use approved screen - Perf v17 #2 Account Portlofio."* One screen, one design.
 *
 *  DEC-6457, 2026-10-19, his word "approved." on the account-page drawing v01: that drawing — v17 frame 2 redrawn so its
 *  figures add up, with every ruling since applied — is now the design of this one screen, and replaces v17 frame 2 for
 *  it. The word-for-word match of all six of its states (F added 2026-10-20) is src/screens/__tests__/account_page_drawing_states.test.tsx.
 *
 *  WHAT THIS FILE GOT WRONG FOR EIGHTEEN DAYS, said plainly: it read the drawing from the first "ACCOUNT PORTFOLIO" in
 *  v17, which is the caption UNDER phone 2, so what it read was PHONE 3 — the Performance tab with one linked account
 *  ($52,704, since Jun 3, 2024). The sections it held the page to — "SUMMARY · SINCE", "Ending value", the rebuilt line,
 *  the value graph, the account's own row, WHAT EACH CATEGORY EARNED — were the Performance tab's, never frame 2's, and
 *  the page was built to them. The approved drawing (its row 18) does not draw them, and the page no longer shows them.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import * as fs from 'fs';
import * as path from 'path';
import AccountPortfolioScreen from '../AccountPortfolioScreen';
import { useStore } from '../../store/useStore';

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

const ROOT = path.join(__dirname, '..', '..', '..');
const DRAWING = 'MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_account-page_v01.html';
const RECORD = 'MoneyKeel/documents/standards/moneykeel_pres_spec_design-each-screen-was-built-from_v01.md';

const LINKED = {
  asset_id: 'etr', label: 'ACCOUNT 1', institution: 'E*TRADE', kind: 'brokerage',
  tax_bucket: 'TAXABLE', balance: 52_704, source: 'connected',
  last_synced: new Date().toISOString(), history_from: '2024-06-03',
  positions: [{ position_id: 'p1', ticker: 'VTI', kind: 'stock',
                lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 260, purchase_date: '2024-06-03' }] }],
};
const LEDGER = [
  { id: 'd1', date: '2024-09-01', type: 'DEPOSIT', account_id: 'etr', amount: 9_000, created_at: 'x' },
  { id: 'v1', date: '2025-06-15', type: 'DIVIDEND', account_id: 'etr', ticker: 'VTI', amount: 1_180, created_at: 'x' },
];
const recordDay = (date: string, value: number) => ({
  date, origin: 'observed', writtenAt: `${date}T00:00:00Z`,
  holdings: [{ accountId: 'etr', securityKey: 'VTI', symbol: 'VTI', units: 100, price: value / 100, value }],
  accounts: [{ date, accountId: 'etr', cash: 0, statedTotal: value, currency: 'USD' }],
});

beforeEach(() => {
  useStore.getState().resetAll();
  mockParams = { id: 'etr' };
  useStore.setState({ assetAccounts: [LINKED], transactions: LEDGER, snapshotDays: [recordDay('2024-06-03', 38_000), recordDay('2024-06-04', 38_000)],
                      priceCache: { VTI: 290 } } as any);
});

test('the record names the account-page drawing v01, approved 2026-10-19, as this screen\'s design (DEC-6457)', () => {
  const record = fs.readFileSync(path.join(ROOT, RECORD), 'utf8');
  const row = record.split('\n').find((l) => l.startsWith('| Account portfolio |'))!;
  expect(row).toBeTruthy();
  expect(row).toContain(DRAWING.split('/').pop());
  expect(row).toMatch(/APPROVED 2026-10-19/);
  expect(row).toMatch(/DEC-6457/);
  expect(fs.existsSync(path.join(ROOT, DRAWING))).toBe(true);
  // the screen's own header says which design it is built to
  expect(fs.readFileSync(path.join(ROOT, 'src', 'screens', 'AccountPortfolioScreen.tsx'), 'utf8')).toMatch(/ACCOUNT-PAGE DRAWING v01, APPROVED 2026-10-19 .*DEC-6457/);
});

test('the sections the Performance tab owns are not on this page (the drawing\'s row 18), and the drawing\'s own are', () => {
  render(<AccountPortfolioScreen />);
  const text = (screen.toJSON() ? JSON.stringify(screen.toJSON()) : '');
  for (const gone of ['WHAT EACH CATEGORY EARNED', 'All categories', 'SUMMARY · ', 'Ending value', '↺ Rebuilt from', 'Value over the window']) {
    expect(text.includes(gone)).toBe(false);
  }
  expect(screen.queryByTestId('account-portfolio-value-line')).toBeNull();
  // the drawing's sections, in its order
  const order = ['THIS ACCOUNT · SINCE', 'HOW $', 'BY CATEGORY & HOLDING', 'ACTIVITY · SINCE'].map((w) => text.indexOf(w));
  expect(order.every((i) => i >= 0)).toBe(true);
  expect([...order].sort((a, b) => a - b)).toEqual(order);
});
