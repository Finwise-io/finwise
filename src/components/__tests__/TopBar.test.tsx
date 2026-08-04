// FCC top bar (M4, decided 2026-07-12): the net-worth chip is GONE (it duplicated Home's line and the
// Net worth tab); the right side keeps only modes — the hide-balances eye + the settings gear. The
// ☰ Menu stays as the long-tail escape hatch, now including the Cash flow and Plan tabs.
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import TopBar from '../TopBar';
import { useStore } from '../../store/useStore';

beforeEach(() => {
  useStore.getState().resetAll();
  (router.push as jest.Mock).mockClear();
});

describe('TopBar', () => {
  test('M4: the net-worth chip is removed — no NW pill, no dollar figure in the header', () => {
    useStore.setState({
      assetAccounts: [{ asset_id: 'a1', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 60000, target_return: 0.07 }],
      liabilities: [],
    });
    render(<TopBar />);
    expect(screen.queryByText('NW')).toBeNull();
    expect(screen.queryByText('$60,000')).toBeNull();
  });

  test('the brand wordmark is the designed logo ART, never typed text (B45 founder finding)', () => {
    render(<TopBar />);
    const wm = screen.getByLabelText('MoneyKeel');
    expect(wm.props.source).toEqual(require('../../../assets/brand/wordmark.png'));
    expect(screen.queryByText('MoneyKeel')).toBeNull();
  });

  test('the settings gear opens Settings from every tab', () => {
    render(<TopBar />);
    fireEvent.press(screen.getByLabelText('Settings'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/settings');
  });

  test('the Menu mirrors the tab bar: the five-tab strip leads, deeper pages group under their tab', () => {
    render(<TopBar />);
    fireEvent.press(screen.getByText('Menu'));
    expect(screen.getByText('Everything in MoneyKeel')).toBeOnTheScreen();
    expect(screen.getByText(/YOUR FIVE TABS — same order as the bar below/)).toBeOnTheScreen();
    expect(screen.getByText('MORE IN CASH FLOW')).toBeOnTheScreen();   // group = the tab it lives in
    expect(screen.getByText('MORE IN PLAN')).toBeOnTheScreen();
    expect(screen.getByText('TOOLS & CHECK-UPS')).toBeOnTheScreen();
    // the old intent groups are gone — they didn't map to the button bar
    expect(screen.queryByText('Plan ahead')).toBeNull();
    expect(screen.queryByText('Everyday money')).toBeNull();
    fireEvent.press(screen.getByText('Retirement'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/retirement');
  });

  test('the five-tab strip follows the LENS order — a retiree sees Cash flow right after Home, like the bar', () => {
    useStore.setState({ onboardingProfile: { status: 'retired' } } as any);
    render(<TopBar />);
    fireEvent.press(screen.getByText('Menu'));
    const strip = screen.getAllByLabelText(/^Go to /).map((n) => n.props.accessibilityLabel);
    expect(strip).toEqual(['Go to Home', 'Go to Cash flow', 'Go to Net worth', 'Go to Plan', 'Go to Performance']);
  });

  test('the working-lens strip matches the working bar order', () => {
    render(<TopBar />);
    fireEvent.press(screen.getByText('Menu'));
    const strip = screen.getAllByLabelText(/^Go to /).map((n) => n.props.accessibilityLabel);
    expect(strip).toEqual(['Go to Home', 'Go to Net worth', 'Go to Performance', 'Go to Cash flow', 'Go to Plan']);
  });

  test('the five FCC tabs are all reachable from the Menu (Cash flow · Plan · Net worth · Invest)', () => {
    render(<TopBar />);
    fireEvent.press(screen.getByText('Menu'));
    fireEvent.press(screen.getByText('Cash flow'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/cashflow');
    fireEvent.press(screen.getByText('Menu'));
    fireEvent.press(screen.getByText('Plan'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/plan');
    fireEvent.press(screen.getByText('Menu'));
    fireEvent.press(screen.getByText('Performance'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/invest');
    fireEvent.press(screen.getByText('Menu'));
    fireEvent.press(screen.getByText('Net worth'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/analytics');
  });

  test('Settings stays reachable from the Menu footer too', () => {
    render(<TopBar />);
    fireEvent.press(screen.getByText('Menu'));
    fireEvent.press(screen.getByText('Settings'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/settings');
  });

  test('the eye toggle flips the global hide-balances flag', () => {
    render(<TopBar />);
    expect(useStore.getState().hideBalances).toBe(false);
    fireEvent.press(screen.getByLabelText('Hide balances'));
    expect(useStore.getState().hideBalances).toBe(true);
    fireEvent.press(screen.getByLabelText('Show balances'));
    expect(useStore.getState().hideBalances).toBe(false);
  });
});
