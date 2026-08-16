// PLAN'S THREE SUB-TABS — Retire · Goals · Prepare (founder ruling 2026-08-02, built 2026-08-14).
//
// The bar is CHROME: it appears on every state, including the ones where Retire itself can compute
// nothing. A person on day one must still be able to reach Prepare — otherwise the tab silently
// claims Plan has one screen, which is what the v3 design did.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PlanHubScreen from '../PlanHubScreen';
import { useStore } from '../../store/useStore';
import { employedPartner } from '../../testing/personas';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

const seedWorking = () => useStore.setState({
  onboardingComplete: true,
  onboardingProfile: { ...employedPartner, monthlySpending: '5200' },
  retirementAssumptions: { retireAge: 65, contribMonthly: 1000, spendMonthly: 5200 },
  assetAccounts: [{ asset_id: 'b1', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 400000 }],
} as any);

beforeEach(() => { useStore.getState().resetAll(); });

test('all three sub-tabs are present, and Retire is the one selected', () => {
  seedWorking();
  render(<PlanHubScreen />);
  expect(screen.getByText('Retire')).toBeOnTheScreen();
  expect(screen.getByText('Goals')).toBeOnTheScreen();
  expect(screen.getByText('Prepare')).toBeOnTheScreen();
  expect(screen.getByLabelText('Retire, selected')).toBeOnTheScreen();
});

test('the bar is CHROME — it shows on day one, when Retire can compute nothing', () => {
  useStore.setState({ onboardingComplete: true, onboardingProfile: { status: 'employed' } } as any);
  render(<PlanHubScreen />);
  expect(screen.getByTestId('plan-subtabs')).toBeOnTheScreen();
  expect(screen.getByText('Prepare')).toBeOnTheScreen();
});

test('Prepare gathers the six, each saying done-or-not rather than a number', () => {
  seedWorking();
  render(<PlanHubScreen />);
  fireEvent.press(screen.getByLabelText('Prepare'));
  expect(screen.getByTestId('plan-prepare')).toBeOnTheScreen();
  for (const row of ['Insurance check', 'Estate & legacy', 'Tax organiser', 'Build credit',
                     'Stress test — a surprise expense', 'Job safety check']) {
    expect(screen.getByText(row)).toBeOnTheScreen();
  }
  // "not started" is a fact, not a telling-off
  expect(screen.getAllByText('not started').length).toBe(6);
});

test('Goals with nothing set is an ON-RAMP, not a brochure about what the screen will do', () => {
  seedWorking();
  render(<PlanHubScreen />);
  fireEvent.press(screen.getByLabelText('Goals'));
  expect(screen.getByText('Nothing here yet')).toBeOnTheScreen();
  expect(screen.getByText(/A goal is anything you're putting money aside for/)).toBeOnTheScreen();
  expect(screen.getByText('+ Add a goal')).toBeOnTheScreen();
});

test('Goals with goals set leads with "Can I afford it all?" — the real question once there are two', () => {
  seedWorking();
  useStore.setState({ goals: [
    { goal_id: 'g1', label: 'New car', target_amount: 28000, saved: 4000, target_year: 2027 },
    { goal_id: 'g2', label: 'College — one child', target_amount: 120000, saved: 10000, target_year: 2029 },
  ] } as any);
  render(<PlanHubScreen />);
  fireEvent.press(screen.getByLabelText('Goals'));
  expect(screen.getByText('Can I afford it all?')).toBeOnTheScreen();
  expect(screen.getByText('all of them together, not one at a time')).toBeOnTheScreen();
  expect(screen.getByText('New car')).toBeOnTheScreen();
  expect(screen.getByText('College — one child')).toBeOnTheScreen();
});

test('switching sub-tabs swaps the panel and nothing else — Retire content is gone, not stacked', () => {
  seedWorking();
  render(<PlanHubScreen />);
  expect(screen.getByText('DECISIONS YOU CAN MAKE TODAY')).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Prepare'));
  expect(screen.queryByText('DECISIONS YOU CAN MAKE TODAY')).toBeNull();
  fireEvent.press(screen.getByLabelText('Retire'));
  expect(screen.getByText('DECISIONS YOU CAN MAKE TODAY')).toBeOnTheScreen();
});
