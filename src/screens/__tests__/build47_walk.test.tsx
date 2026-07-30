// Build-47 walk pins — one test per approved row (founder: "Approve all 25", 2026-07-30).
// Group A: honesty rows 1-5.
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  router: { push: jest.fn(), back: jest.fn(), setParams: jest.fn() },
}));

beforeEach(() => { useStore.getState().resetAll(); mockParams = {}; });

test('row 1: the HSA card says "up to $X" and the honest not-tracked note — never "$X left" it cannot know', () => {
  useStore.setState({ onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: '1970' } } as any);
  const ContributionRoomScreen = require('../ContributionRoomScreen').default;
  render(<ContributionRoomScreen />);
  expect(screen.getAllByText(/up to \$/).length).toBeGreaterThan(0);
  expect(screen.getByText(/We don't track your HSA contributions yet/)).toBeOnTheScreen();
});

test('row 2: a 68-year-old sees claim NOW (68) vs 70 — never a table of greyed-out "passed" rows', () => {
  const yr = new Date().getFullYear();
  useStore.setState({ onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: String(yr - 68), monthlySpending: '4000' } } as any);
  const SsTimingScreen = require('../SsTimingScreen').default;
  render(<SsTimingScreen />);
  expect(screen.getByText(/at 68 \(now\)/)).toBeOnTheScreen();
  expect(screen.getAllByText(/at 70/).length).toBeGreaterThan(0);
  expect(screen.queryByText(/at 62/)).toBeNull();          // dead choices are not shown
  expect(screen.queryByText(/\(passed\)/)).toBeNull();
});

test('row 3: the required-withdrawal card reads taken-vs-due — marking it taken silences the card', () => {
  const yr = new Date().getFullYear();
  const seed = () => useStore.setState({
    onboardingProfile: { status: 'retired', incomeSources: ['retirement_income'], birthYear: String(yr - 75), monthlySpending: '4000' },
    assetAccounts: [{ asset_id: 'ira', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 500000 }],
  } as any);
  seed();
  const InsightsScreen = require('../InsightsScreen').default;
  const r1 = render(<InsightsScreen />);
  expect(screen.getByText('Required withdrawal due')).toBeOnTheScreen();
  r1.unmount();
  // take the full required amount → the card goes quiet (same rule the dedicated screen uses)
  const { rmdAtAge } = require('../../domain/decumulation');
  const due = rmdAtAge(500000, 75);
  useStore.setState({
    transactions: [{ id: 't1', type: 'WITHDRAWAL', account_id: 'ira', amount: due, date: `${yr}-03-01`, created_at: new Date().toISOString() }],
  } as any);
  render(<InsightsScreen />);
  expect(screen.queryByText('Required withdrawal due')).toBeNull();
});

test('row 5: an undated hand-entered value gets the confirm-it-once nudge', () => {
  useStore.setState({
    assetAccounts: [{ asset_id: 'gold', label: 'Gold coins', kind: 'commodities', tax_bucket: 'TAXABLE', balance: 9000 }],
  } as any);
  mockParams = { id: 'gold' };
  const AccountDetailScreen = require('../AccountDetailScreen').default;
  render(<AccountDetailScreen />);
  expect(screen.getByText(/Value date unknown — confirm it once/)).toBeOnTheScreen();
});

test('row 4: the bond and alternatives editors both carry the Value-as-of field', () => {
  const { BondEditor } = require('../BondsScreen');
  const r = render(<BondEditor bond={null} open onClose={() => {}} onSave={() => {}} />);
  expect(screen.getAllByText('Value as of').length).toBe(1);
  r.unmount();
  const fs = require('fs'); const path = require('path');
  const alt = fs.readFileSync(path.join(__dirname, '..', 'OtherInvestmentsScreen.tsx'), 'utf8');
  expect(alt).toMatch(/Value as of/);
  expect(alt).toMatch(/value_as_of: valueAsOf/);
});
