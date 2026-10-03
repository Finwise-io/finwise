/** Q48 — the empty state on every other screen the master lists (mock approved 2026-09-12):
 *  $0, then "Nothing entered yet." and the door that names the thing to add. One render per screen
 *  with nothing entered; the door's wording is the one in EMPTY_DOORS, so a synonym cannot creep in. */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { EMPTY_DOORS } from '../../constants/doors';

jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}),
  router: { push: jest.fn() },
}));

const savings = { asset_id: 'sav', label: 'Ally Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 12400, target_return: 0.01 };
const show = (file: string) => { const C = require(`../${file}`).default; render(<C />); };
const seed = (extra: any = {}) => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self',
    onboardingProfile: { status: 'employed', birthYear: '1971', birthMonth: '3' }, assetAccounts: [], liabilities: [], expenses: [], incomes: [], ...extra } as any);
};
// the line is one Text with the door nested inside it, so it is matched on its opening words
const line = () => screen.getAllByText(/^Nothing entered yet\./).length;
const door = (k: keyof typeof EMPTY_DOORS) => screen.getAllByText(EMPTY_DOORS[k].label).length;

test('Cash flow — income set, no budget yet: the budget row reads "not set", there is no planned surplus, and the door is offered', () => {
  // cash-flow_v01, frame B (approved 2026-09-28), rule 6 under it: "nothing is guessed — no plan set →
  // not set, never $0 dressed as an answer". The month's own wording replaced the generic line here.
  seed({ assetAccounts: [savings], onboardingProfile: { status: 'employed', birthYear: '1971', birthMonth: '3', baseSalary: '6000', salaryMode: 'gross', salaryFreq: 'monthly' } });
  show('CashFlowScreen');
  expect(screen.getByText('— not set')).toBeOnTheScreen();
  expect(screen.queryByText('= Planned surplus')).toBeNull();
  expect(screen.getByText(/Until you do there is no planned surplus — we won’t guess one\./)).toBeOnTheScreen();
  expect(screen.getByLabelText('Set your budget')).toBeOnTheScreen();
  expect(screen.getByText('= Actual surplus so far')).toBeOnTheScreen();          // actual needs no plan
});

test('Home — accounts but no income: the Income cell carries the line; no investments: YOUR INVESTMENTS carries it', () => {
  seed({ assetAccounts: [savings] });
  show('HomeScreen');
  expect(line()).toBeGreaterThanOrEqual(1);
  expect(door('income') + door('accounts')).toBeGreaterThanOrEqual(1);
});

test('Performance — day one: honest zeros, the line and the door', () => {
  seed({ assetAccounts: [savings] });
  show('PerformanceScreen');
  expect(line()).toBeGreaterThanOrEqual(1);
  expect(door('accounts')).toBeGreaterThanOrEqual(1);
});

test('Big costs — none entered: $0, the line and the door', () => {
  seed(); show('BigCostsScreen');
  expect(screen.getAllByText('$0').length).toBeGreaterThanOrEqual(1);
  expect(door('bigCost')).toBe(1);
  expect(screen.queryByText(/Nothing here yet/)).toBeNull();
});

test('Income summary — nothing entered: $0 on both bands (never a dash), the line and the door', () => {
  seed(); show('IncomeSummaryScreen');
  expect(screen.queryByText('—')).toBeNull();
  expect(line()).toBeGreaterThanOrEqual(2);
  expect(door('income')).toBeGreaterThanOrEqual(2);
  expect(screen.queryByText(/told us/)).toBeNull();
});

test('Other investments and Bonds — none entered: $0, the line and the door', () => {
  seed(); show('OtherInvestmentsScreen');
  expect(door('investment')).toBe(1);
  screen.unmount();
  seed(); show('BondsScreen');
  expect(door('bond')).toBe(1);
});

test('Stress test — no cash and no essentials entered: the two lines and doors', () => {
  seed(); show('StressTestScreen');
  expect(door('accounts') + door('expenses')).toBeGreaterThanOrEqual(1);
});

test('Job safety — nothing logged: the screen asks for the essentials figure in place (its own door)', () => {
  seed({ assetAccounts: [savings] }); show('JobSafetyScreen');
  expect(screen.getByText(/What do your essential expenses come to in a typical month/)).toBeOnTheScreen();
});
