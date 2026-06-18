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
  test('shows the Net Worth chip from live accounts (assets − debts)', () => {
    useStore.setState({
      assetAccounts: [{ asset_id: 'a1', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 60000, target_return: 0.07 }],
      liabilities: [{ debt_id: 'd1', label: 'Loan', debt_type: 'OTHER', remaining_balance: 10000, interest_rate_apr: 0.06, minimum_monthly_payment: 200 }],
    });
    render(<TopBar />);
    expect(screen.getByText('$50,000')).toBeOnTheScreen();
  });

  test('with no accounts, falls back to the onboarding snapshot net worth', () => {
    useStore.setState({ onboardingProfile: { currentRetirementSavings: '80000', taxMode: 'manual', manualTaxRate: '0' } });
    render(<TopBar />);
    expect(screen.getByText('$80,000')).toBeOnTheScreen();
  });

  test('tapping the chip navigates to the Net Worth tab', () => {
    render(<TopBar />);
    fireEvent.press(screen.getByText('NW'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/analytics');
  });

  test('the Tax organizer chip (below NW) navigates to the tax organizer', () => {
    render(<TopBar />);
    // index 0 is the header chip (the Modal grid tile renders later in the tree)
    fireEvent.press(screen.getAllByText('Tax organizer')[0]);
    expect(router.push).toHaveBeenCalledWith('/tax-organizer');
  });

  test('the Menu opens the module grid and tiles navigate', () => {
    render(<TopBar />);
    fireEvent.press(screen.getByText('Menu'));
    expect(screen.getByText('All modules')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Retirement'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/retirement');
  });
});
