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

  test('the brand wordmark shows MoneyKeel', () => {
    render(<TopBar />);
    expect(screen.getByText('MoneyKeel')).toBeOnTheScreen();
  });

  test('the settings gear opens Settings from every tab', () => {
    render(<TopBar />);
    fireEvent.press(screen.getByLabelText('Settings'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/settings');
  });

  test('the Menu opens the grouped module grid and tiles navigate', () => {
    render(<TopBar />);
    fireEvent.press(screen.getByText('Menu'));
    expect(screen.getByText('All modules')).toBeOnTheScreen();
    expect(screen.getByText('Everyday money')).toBeOnTheScreen();   // group header
    expect(screen.getByText('Plan ahead')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Retirement'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/retirement');
  });

  test('the Menu shows the 4 intent groups; App & account is a footer, not a section', () => {
    render(<TopBar />);
    fireEvent.press(screen.getByText('Menu'));
    expect(screen.getByText('Track your wealth')).toBeOnTheScreen();
    expect(screen.getByText('Protect & optimize')).toBeOnTheScreen();
    expect(screen.queryByText('App & account')).toBeNull();   // footer, no header
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
    fireEvent.press(screen.getByText('Invest'));
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
