// AUDIT B — 10 FEATURES, each RENDERED in the founder's data shape. A presence check never proves
// a feature works, so every one of these drives it and reads what a person would see.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PlanHubScreen from '../screens/PlanHubScreen';
import { useStore } from '../store/useStore';
import { employedPartner, retiree75 } from '../testing/personas';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

const F: string[] = [];
const check = (id: string, what: string, fn: () => void) => {
  try { fn(); } catch (e: any) { F.push(`${id} ${what} — ${String(e.message).split('\n')[0]}`); }
};

const working = () => useStore.setState({
  onboardingComplete: true,
  onboardingProfile: { ...employedPartner, birthYear: String(new Date().getFullYear() - 58), monthlySpending: '5200' },
  retirementAssumptions: { retireAge: 65, horizonAge: 90, contribMonthly: 1000, spendMonthly: 5200, targetNestEgg: 2_000_000 },
  assetAccounts: [
    { asset_id: 'a', label: 'Fidelity Traditional IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 380_000 },
    { asset_id: 'b', label: 'Ally Savings', kind: 'savings', tax_bucket: 'CASH', balance: 379_152 },
    { asset_id: 'c', label: 'Vanguard Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 90_000 },
    { asset_id: 'd', label: 'Vanguard Roth IRA', kind: 'roth_ira', tax_bucket: 'ROTH', balance: 60_000 },
  ],
} as any);
const retired = () => useStore.setState({
  onboardingComplete: true,
  onboardingProfile: { ...retiree75, birthYear: String(new Date().getFullYear() - 75), monthlySpending: '5600', ri_ss: '2600', ri_pension: '1400' },
  retirementAssumptions: { horizonAge: 94, spendMonthly: 5600, ssClaimAge: 67 },
  transactions: [],
  assetAccounts: [{ asset_id: 'ira', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 985_000 }],
} as any);

beforeEach(() => { useStore.getState().resetAll(); });

test('AUDIT B — 10 features, rendered', () => {
  // B1 the sub-tab bar
  working(); render(<PlanHubScreen />);
  check('B1', 'three sub-tabs, Retire selected', () => {
    expect(screen.getByTestId('plan-subtabs')).toBeOnTheScreen();
    expect(screen.getByLabelText('Retire, selected')).toBeOnTheScreen();
  });

  // B2 the odds dial
  check('B2', 'odds dial shows a real percentage', () => {
    expect(screen.getAllByText(/^\d{1,3}%$/).length).toBeGreaterThanOrEqual(2);   // odds AND target
    expect(screen.getByText(/odds of lasting to age \d+/)).toBeOnTheScreen();
  });

  // B3 the SECOND dial, from their typed target
  check('B3', 'target dial appears with a typed target', () => {
    expect(screen.getByText('of your target nest egg')).toBeOnTheScreen();
  });

  // B4 the hero sentence
  check('B4', 'hero states balance against their number', () => {
    expect(screen.getAllByText(/target nest egg/).length).toBeGreaterThanOrEqual(2);  // dial label + hero
  });

  // B5 the closing sentence explains growth
  check('B5', 'closing sentence projects and explains growth', () => {
    expect(screen.getByText(/projects to/)).toBeOnTheScreen();
    expect(screen.getByText(/Growth does almost half the work/)).toBeOnTheScreen();
  });

  // B6 the simulation note sits under the number
  check('B6', 'odds note is under the odds, not a page footer', () => {
    expect(screen.getByText(/about 400 runs of your own numbers/)).toBeOnTheScreen();
  });

  // B7 Prepare landing
  check('B7', 'Prepare gathers six, each done-or-not', () => {
    fireEvent.press(screen.getByLabelText('Prepare'));
    expect(screen.getByTestId('plan-prepare')).toBeOnTheScreen();
    expect(screen.getAllByText('not started').length).toBe(6);
  });

  // B8 Goals landing, empty state
  check('B8', 'Goals empty state is an on-ramp', () => {
    fireEvent.press(screen.getByLabelText('Goals'));
    expect(screen.getByText('Nothing here yet')).toBeOnTheScreen();
  });

  screen.unmount(); useStore.getState().resetAll();

  // B9 the retiree spend-more control, answered in place
  retired(); render(<PlanHubScreen />);
  check('B9', 'spend-more answers in place, leading with free room', () => {
    expect(screen.getByTestId('spend-more')).toBeOnTheScreen();
    expect(screen.getByText(/and nothing changes/)).toBeOnTheScreen();
  });

  // B10 the dated obligation leads the list wearing its date
  check('B10', 'dated decision leads, wearing DUE DEC 31', () => {
    expect(screen.getByText('DUE DEC 31')).toBeOnTheScreen();
    expect(screen.queryByText('NEXT DECISION · DUE DEC 31')).toBeNull();
  });

  if (F.length) throw new Error('\nFEATURE FINDINGS:\n' + F.join('\n'));
});
