/** PRECISION ON THE ACCOUNT PAGE (his ruling Q49, 2026-09-09: every calculation runs at full precision; rounding happens
 *  once, where a figure is printed). Until 2026-10-20 the page cut two figures to cents before using them: each holding's
 *  value before the rows were added up and weighed, and the last part of the income sum under the table. The holding's
 *  value is now asked of its own door (MK-NW-O-006 theHolding) and the income remainder is subtracted exactly, in
 *  decimals. Both were carried as "kept" by src/__tests__/precision_guard.test.ts and are struck off its list.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import AccountPortfolioScreen from '../AccountPortfolioScreen';
import { useStore } from '../../store/useStore';
import { figuresPrinted, resetFiguresPrinted } from '../../components/figure';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'p1' }),
}));

const linked = (positions: any[]) => ({
  asset_id: 'p1', label: 'Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', source: 'connected',
  last_synced: new Date().toISOString(), balance: 0, positions,
});
const open = (account: any, transactions: any[] = []) => {
  useStore.getState().resetAll();
  account.balance = account.positions.reduce((t: number, p: any) => t + p.lots[0].shares * p.last_price, 0);
  useStore.setState({ hideBalances: false, assetAccounts: [account], transactions } as any);
  resetFiguresPrinted();
  render(<AccountPortfolioScreen />);
};

test('a holding of 3 shares at $33.3333 is worth $99.9999 on the page — printed $100, never cut to $100.00 first', () => {
  open(linked([{ position_id: 'v', ticker: 'VTI', asset_class: 'stock_etf', last_price: 33.3333, lots: [{ lot_id: 'l', shares: 3, cost_per_share: 30, purchase_date: '2025-01-02' }] }]));
  const rows = figuresPrinted().filter((f) => f.id === 'MK-NW-M-030');
  expect(rows.length).toBeGreaterThan(0);                       // the guard looked: the row's value was printed
  for (const f of rows) {
    expect(f.value).toBe(3 * 33.3333);                          // 99.9999, the full figure
    expect(f.value).not.toBe(100);                              // the cents cut it read until 2026-10-20
    expect(f.text).toBe('$100');                                // rounded once, as it is printed
  }
});

test('the income sum\'s parts are subtracted exactly: $0.10 + $0.20 of the account\'s $0.30 leaves no third part', () => {
  const ledger = [
    { id: 'd1', date: '2026-09-01', type: 'DIVIDEND', amount: 0.1, ticker: 'VTI', account_id: 'p1', source: 'connected' },
    { id: 'd2', date: '2026-09-02', type: 'DIVIDEND', amount: 0.2, ticker: 'BND', account_id: 'p1', source: 'connected' },
  ];
  open(linked([
    { position_id: 'v', ticker: 'VTI', asset_class: 'stock_etf', last_price: 250, lots: [{ lot_id: 'l1', shares: 10, cost_per_share: 200, purchase_date: '2025-01-02' }] },
    { position_id: 'b', ticker: 'BND', asset_class: 'stock_etf', last_price: 72, lots: [{ lot_id: 'l2', shares: 10, cost_per_share: 70, purchase_date: '2025-01-02' }] },
  ]), ledger);
  // 0.1 + 0.2 is 0.30000000000000004 in binary fractions: subtracted that way, a stray part would read below the table
  const sum = screen.getByText(/Income sits with the holding that earned it/);
  const words = String((sum.props.children as any[]).join(''));
  expect(words).toMatch(/\(0 ＋ 0 = \$0 for this account\)/);   // two parts, no third
});
