// BUILD-43 FOUNDER FEEDBACK PINS (2026-07-19) — the workbook lives at
// docs/FCC-core-55-70/build43-feedback-v1-2026-07-19.xlsx. Each # here matches a row there.
// #2: "YOUR INVESTMENTS" needs an info dot saying how investments differ from net worth.
// #3: the approved mock shows a CHANGE line and a DATE under the hero ALWAYS — the build hid both
//     whenever the account was new/empty (exactly the founder's device state). Never again: the
//     empty state renders honest words in the same slots.
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import HomeScreen from '../HomeScreen';
import NetWorthScreen from '../NetWorthScreen';
import { useStore } from '../../store/useStore';
import { GLOSSARY } from '../../domain/glossary';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

beforeEach(() => useStore.getState().resetAll());

const freshWorker = () => useStore.setState({
  onboardingProfile: { status: 'employed', incomeSources: ['employment'], baseSalary: '5000', salaryMode: 'gross', salaryFreq: 'monthly', monthlySpending: '3500' },
  onboardingComplete: true,
} as any);

test('#2 · the investments info dot exists and the glossary says the difference in plain English', () => {
  freshWorker();
  useStore.setState({ assetAccounts: [{ asset_id: 'a1', label: 'Checking', kind: 'cash', tax_bucket: 'TAXABLE', balance: 1500, target_return: 0 }] } as any);
  render(<HomeScreen />);
  expect(screen.getByLabelText('What is Investments?')).toBeOnTheScreen();
  expect(GLOSSARY.investments.body).toMatch(/net worth/i);
  expect(GLOSSARY.investments.body).toMatch(/\$0 in investments/);
});

test('#3 · Home: $0 invested still shows a change-slot line and a date line under the hero', () => {
  freshWorker();
  render(<HomeScreen />);
  expect(screen.getByText(/nothing invested yet — connect or add an account to start/)).toBeOnTheScreen();
  expect(screen.getByText(/as of \w{3} \d/)).toBeOnTheScreen();
});

test('#3 · Home: holdings without prices say so instead of hiding the line', () => {
  freshWorker();
  useStore.setState({ assetAccounts: [{ asset_id: 'b1', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 10000, target_return: 0.08 }] } as any);
  render(<HomeScreen />);
  expect(screen.getByText(/change shows once your holdings have prices|▲ up|▼ down/)).toBeOnTheScreen();
  expect(screen.getByText(/as of \w{3} \d|updated/)).toBeOnTheScreen();
});

test('#3 · Net worth: first-day account shows the tracking line AND the as-of date, not a bare number', () => {
  freshWorker();
  useStore.setState({ assetAccounts: [{ asset_id: 'a1', label: 'Checking', kind: 'cash', tax_bucket: 'TAXABLE', balance: 1500, target_return: 0 }] } as any);
  render(<NetWorthScreen />);
  expect(screen.getByText(/tracking starts today — change shows as history builds|▲ up|▼ down/)).toBeOnTheScreen();
  expect(screen.getByText(/as of \w{3} \d/)).toBeOnTheScreen();
});
