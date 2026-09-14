// G21 — Q21/Q47 on screen: every months-of-cash card divides by the ONE logged average and says how
// many months it stands on ("7 month average"); the typed figure appears only when nothing is logged.
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import NetWorthScreen from '../NetWorthScreen';
import JobSafetyScreen from '../JobSafetyScreen';
import StressTestScreen from '../StressTestScreen';
import { useStore } from '../../store/useStore';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }), useLocalSearchParams: () => ({}), useFocusEffect: () => {} }));

const now = new Date();
const monthsAgo = (k: number) => { const d = new Date(now.getFullYear(), now.getMonth() - k, 10); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-10`; };
const SEVEN_MONTHS = [1, 2, 3, 4, 5, 6, 7].map((k) => ({ id: `e${k}`, amount: 3000, category: k === 4 ? 'Debt payment' : 'Groceries', store: 'x', date: monthsAgo(k), createdAt: monthsAgo(k) }));
const PROFILE = { status: 'employed', incomeSources: ['employment'], baseSalary: '6000', salaryFreq: 'monthly', salaryMode: 'gross', monthlySpending: '4200' };

beforeEach(() => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true, onboardingProfile: PROFILE, nwSetupChoice: 'self',
    assetAccounts: [{ asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 21000 }], expenses: SEVEN_MONTHS } as any);
});

test('Net worth emergency fund: cash ÷ the 7-month logged average, and the label says so (not the typed $4,200)', () => {
  render(<NetWorthScreen />);
  expect(screen.getByText(/\$21,000 cash ÷ \$3,000\/month essentials — 7 month average/)).toBeOnTheScreen();
  expect(screen.getByText('7.0 months')).toBeOnTheScreen();
});

test('Job safety: the logged baseline is the 7-month average, said in words', () => {
  render(<JobSafetyScreen />);
  expect(screen.getByText(/Using \$3,000\/month — 7 month average of your logged expenses/)).toBeOnTheScreen();
});

test('Stress test: the essentials line carries the same figure and the same words', () => {
  render(<StressTestScreen />);
  expect(screen.getByText(/\$3,000\/month of essentials \(7 month average\)/)).toBeOnTheScreen();
});

test('nothing logged: the typed figure serves and is labelled "you entered"', () => {
  useStore.setState({ expenses: [] } as any);
  render(<NetWorthScreen />);
  expect(screen.getByText(/\$21,000 cash ÷ \$4,200\/month essentials — you entered/)).toBeOnTheScreen();
});
