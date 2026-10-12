/** HIS PERFORMANCE DECISIONS OF 2026-10-12 ("1, 2 - approved" · "3,4, 8-approved"), held on the screens.
 *
 *  DEC-4641 — a holding whose prices begin after the window opens is measured from its first price, and wherever its
 *               window figure is shown the row says so, in the Holding page's own words (now one function).
 *  DEC-4643 — a sale bigger than the purchases on record is counted ONCE: its matched part's gain, and how many shares
 *               have no price paid on record.
 *  DEC-4645 — the Holding page's market note no longer says "price changes only": both figures include dividends.
 *  DEC-4646 — an option typed by hand states its shares per contract (default 100), saved to the holding.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import HoldingDetailScreen from '../HoldingDetailScreen';
import AccountPortfolioScreen from '../AccountPortfolioScreen';
import { HoldingEditor } from '../PerformanceScreen';
import { useStore } from '../../store/useStore';
import { isoLocalDate } from '../../domain/_shared/dates';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

const daysAgo = (n: number) => isoLocalDate(new Date(Date.now() - n * 86_400_000));
const thisYear = new Date().getFullYear();

describe('DEC-4643 · a sale bigger than the purchases on record reads as ONE sale', () => {
  beforeEach(() => {
    mockParams = { account: 'brk', position: 'p1' };
    useStore.getState().resetAll();
    useStore.setState({
      hideBalances: false,
      assetAccounts: [{ asset_id: 'brk', label: 'Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true,
        positions: [{ position_id: 'p1', ticker: 'T', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 5, cost_per_share: 50, purchase_date: `${thisYear}-01-02` }] }] }],
      transactions: [
        { id: 'b1', account_id: 'brk', type: 'BUY', ticker: 'T', shares: 10, price: 50, amount: 500, date: `${thisYear}-01-05` },
        { id: 's1', account_id: 'brk', type: 'SELL', ticker: 'T', shares: 15, price: 70, amount: 1050, date: `${thisYear}-01-06` },
      ],
      priceCache: { T: { ticker: 'T', points: [{ date: daysAgo(400), close: 60 }, { date: daysAgo(0), close: 72 }] } },
      pricesFetchedAt: new Date().toISOString(),
    } as any);
  });
  test('the gain on the matched 10 shares, and the 5 with no price paid on record — never "1 sale had no recorded purchase"', () => {
    render(<HoldingDetailScreen />);
    expect(screen.getByText('$200 gain on 10 of 15 shares sold; what you paid for the other 5 is not on record.')).toBeOnTheScreen();
    expect(screen.queryByText(/had no recorded purchase/)).toBeNull();
    expect(screen.getByText('+$200 all time')).toBeOnTheScreen();
  });
  test('DEC-4645 · the market note says both figures include dividends and interest', () => {
    render(<HoldingDetailScreen />);
    expect(screen.queryByText(/price changes only/)).toBeNull();
  });
});

describe('DEC-4646 · Shares per contract on an option typed by hand', () => {
  const OPT = { position_id: 'o1', ticker: 'AAPL  270116C00220000', kind: 'options',
    lots: [{ lot_id: 'l1', shares: 2, cost_per_share: 4.1, purchase_date: '2026-01-05' }] };
  const accounts = [{ asset_id: 'brk', label: 'Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true, positions: [OPT] }] as any;
  test('shown for an option, 100 by default, saved to the holding as typed', () => {
    const onSave = jest.fn();
    render(<HoldingEditor open accounts={accounts} existing={{ accountId: 'brk', position: OPT as any }} onClose={jest.fn()} onSave={onSave} />);
    expect(screen.getByText('Shares per contract')).toBeOnTheScreen();
    expect(screen.getByText('Contracts you hold')).toBeOnTheScreen();
    const field = screen.getByLabelText('Shares per contract');
    expect(field.props.value).toBe('100');
    fireEvent.changeText(field, '10');
    fireEvent.press(screen.getByLabelText('Save holding'));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][1]).toMatchObject({ kind: 'options', multiplier: 10 });
  });
  test('a holding that already states 10 opens on 10', () => {
    render(<HoldingEditor open accounts={accounts} existing={{ accountId: 'brk', position: { ...OPT, multiplier: 10 } as any }} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByLabelText('Shares per contract').props.value).toBe('10');
  });
  test('never shown for a stock, and a stock saves no multiplier', () => {
    const onSave = jest.fn();
    const STOCK = { position_id: 'p1', ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 3, cost_per_share: 200, purchase_date: '2026-01-05' }] };
    render(<HoldingEditor open accounts={accounts} existing={{ accountId: 'brk', position: STOCK as any }} onClose={jest.fn()} onSave={onSave} />);
    expect(screen.queryByText('Shares per contract')).toBeNull();
    expect(screen.getByText('Shares you hold')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Save holding'));
    expect(onSave.mock.calls[0][1].multiplier).toBeUndefined();
  });
});

describe('DEC-4641 · the Account page names a holding whose prices begin after the window opens', () => {
  const BEGAN = daysAgo(200);
  beforeEach(() => {
    mockParams = { id: 'e1' } as any;
    useStore.getState().resetAll();
    useStore.setState({
      hideBalances: false,
      assetAccounts: [{ asset_id: 'e1', label: 'Account 1', institution: 'E*TRADE', kind: 'brokerage', tax_bucket: 'TAXABLE',
        balance: 50000, target_return: 0.05, source: 'connected', last_synced: new Date().toISOString(), cash_balance: 10000,
        positions: [{ position_id: 'p1', ticker: 'LCTX', asset_class: 'stock_etf', last_price: 50, lots: [{ lot_id: 'l1', shares: 800, cost_per_share: 30 }] }] }],
      transactions: [],
      snapshotDays: [{ date: BEGAN, origin: 'observed', writtenAt: `${BEGAN}T21:00:00.000Z`,
        holdings: [{ date: BEGAN, accountId: 'e1', securityKey: 'LCTX', units: 800, price: 48, value: 38400, currency: 'USD' }],
        accounts: [{ date: BEGAN, accountId: 'e1', cash: 10000, statedTotal: 48400, typedValue: null, currency: 'USD' }] }],
      // LCTX's prices begin 100 days ago — after the Since window opens, 200 days ago
      priceCache: { LCTX: { ticker: 'LCTX', points: [{ date: daysAgo(100), close: 45 }, { date: daysAgo(0), close: 50 }] } },
    } as any);
  });
  test('the row carries the Holding page sentence, from the same function', () => {
    const { priceHistoryShortSentence } = require('../../domain/performance');
    render(<AccountPortfolioScreen />);
    const line = screen.getByText(/^Prices for this holding go back \d+ months?, so the Since figure covers \d+ months? — not since /);
    const { windowStartKey } = require('../../../MoneyKeel/functions/networth-and-performance/performance');
    const start = windowStartKey('SINCE', [BEGAN], isoLocalDate(new Date()));
    expect(line.props.children).toBe(priceHistoryShortSentence(
      useStore.getState().priceCache!.LCTX.points, start, 'SINCE', isoLocalDate(new Date())));
  });
});
