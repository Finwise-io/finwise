// AUDIT C — 10 FLOWS, each walked end to end and driven, not asserted from a static render.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PlanHubScreen from '../screens/PlanHubScreen';
import { PlanInputs } from '../components/PlanInputs';
import { SpendMoreControl } from '../components/SpendMoreControl';
import { ClaimAgeRow } from '../components/ClaimAgeRow';
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
const yr = new Date().getFullYear();
const ACCOUNTS = [
  { asset_id: 'a', label: 'Fidelity Traditional IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 380_000 },
  { asset_id: 'b', label: 'Ally Savings', kind: 'savings', tax_bucket: 'CASH', balance: 379_152 },
  { asset_id: 'c', label: 'Vanguard Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 90_000 },
  { asset_id: 'd', label: 'Vanguard Roth IRA', kind: 'roth_ira', tax_bucket: 'ROTH', balance: 60_000 },
];
const JUNE_IN = { current_age: 72, horizon_age: 94, retire_age: 72, start_balance: 985_000,
  annual_contribution: 0, retire_monthly_spend_today: 5600, guaranteed_monthly_income: 4000,
  guaranteed_start_age: 72, mean_return: 0.055, vol_return: 0.0935, inflation: 0.025, seed: 42, paths: 400 } as any;

beforeEach(() => { useStore.getState().resetAll(); });

test('AUDIT C — 10 flows', () => {
  // C1 DAY ONE → the seven questions are all visible and none is a fake zero
  useStore.setState({ onboardingComplete: true, onboardingProfile: { status: 'employed' } } as any);
  render(<PlanHubScreen />);
  check('C1', 'day one: all seven questions, each asked ONCE, no fake zero', () => {
    // the seven live in one component; asking any of them twice is the defect this check exists for
    expect(screen.getAllByText(/What's your target nest egg\?/).length).toBe(1);
    expect(screen.getByLabelText('Your age in years')).toBeOnTheScreen();
    expect(screen.getByLabelText('Monthly spending in retirement')).toBeOnTheScreen();
    expect(screen.getByLabelText('Your target nest egg')).toBeOnTheScreen();
    expect(screen.getByLabelText('Raise Retire at')).toBeOnTheScreen();
    expect(screen.getByLabelText('Raise Plan to age')).toBeOnTheScreen();
    expect(screen.getByText(/WHAT COUNTS TOWARD RETIREMENT/)).toBeOnTheScreen();
    expect(screen.queryByText('$0')).toBeNull();
  });
  check('C1b', 'day one: the values we assumed say they are ours', () => {
    expect(screen.getAllByText(/ours until you change it/).length).toBe(2);   // retire at, plan to
  });
  check('C2', 'day one: the other two tabs are still reachable', () => {
    fireEvent.press(screen.getByLabelText('Prepare'));
    expect(screen.getByTestId('plan-prepare')).toBeOnTheScreen();
  });
  screen.unmount(); useStore.getState().resetAll();

  // C3 TYPE A TARGET → it saves, and our suggestion disappears
  useStore.setState({ onboardingComplete: true,
    onboardingProfile: { ...employedPartner, birthYear: String(yr - 58), monthlySpending: '5200' },
    retirementAssumptions: { retireAge: 65, horizonAge: 90, spendMonthly: 5200, targetNestEgg: null },
    assetAccounts: ACCOUNTS } as any);
  const D = { retireAge: 65, horizonAge: 90, extraMonthly: 0 } as any;
  render(<PlanInputs draft={D} committed={D} onDraft={jest.fn()} onCommit={jest.fn()} suggestedTarget={1_250_000} />);
  check('C3', 'typing a target saves it and drops our offer', () => {
    expect(screen.getByText(/our starting figure, not yours/)).toBeOnTheScreen();
    fireEvent.changeText(screen.getByLabelText('Your target nest egg'), '2000000');
    expect(useStore.getState().retirementAssumptions.targetNestEgg).toBe(2_000_000);
    expect(screen.queryByText(/our starting figure, not yours/)).toBeNull();
  });
  screen.unmount();

  // C4 → the typed target now drives the second dial on the plan screen
  render(<PlanHubScreen />);
  check('C4', 'the typed target reaches the dial', () => {
    expect(screen.getByText('of your target nest egg')).toBeOnTheScreen();
    expect(screen.getByText('45%')).toBeOnTheScreen();
  });
  check('C5', 'and the odds are unmoved by it', () => {
    expect(screen.getByText(/odds of lasting to age 90/)).toBeOnTheScreen();
  });
  screen.unmount(); useStore.getState().resetAll();

  // C6 SPEND MORE → drive the stepper to the end and back
  render(<SpendMoreControl inputs={JUNE_IN} maxExtra={2555} horizonAge={94} />);
  check('C6', 'spend-more: stepping up changes the sentence', () => {
    expect(screen.getByText(/in every future simulation we tested/)).toBeOnTheScreen();
    const up = screen.getByLabelText('Spend more extra');
    for (let i = 0; i < 6; i++) fireEvent.press(up);
    expect(screen.getByText(/runs out before 94/)).toBeOnTheScreen();
  });
  check('C7', 'spend-more: stepping back down returns to the true starting state', () => {
    const down = screen.getByLabelText('Spend less extra');
    for (let i = 0; i < 8; i++) fireEvent.press(down);
    expect(screen.getByText(/the same as now/)).toBeOnTheScreen();
    expect(screen.getByText(/in every future simulation we tested/)).toBeOnTheScreen();
  });
  screen.unmount();

  // C8 CLAIM AGE → choose 70 and adopt it
  const onAdopt = jest.fn();
  render(<ClaimAgeRow statementMonthly={2600} adoptedAge={67} onAdopt={onAdopt} />);
  check('C8', 'claim age: choosing 70 offers to adopt, and adopting reports it', () => {
    fireEvent.press(screen.getByLabelText('Claiming at 70 pays $3,224 a month'));
    fireEvent.press(screen.getByText('Plan on claiming at 70'));
    expect(onAdopt).toHaveBeenCalledWith(70);
  });
  screen.unmount(); useStore.getState().resetAll();

  // C9 RETIREE → the whole retire panel holds together
  useStore.setState({ onboardingComplete: true,
    onboardingProfile: { ...retiree75, birthYear: String(yr - 75), monthlySpending: '5600', ri_ss: '2600', ri_pension: '1400' },
    retirementAssumptions: { horizonAge: 94, spendMonthly: 5600, ssClaimAge: 67 },
    assetAccounts: [{ asset_id: 'ira', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 985_000 }] } as any);
  render(<PlanHubScreen />);
  check('C9', 'retiree: paycheck, dated row and spend-more all present together', () => {
    expect(screen.getByText(/YOUR RETIREMENT PAYCHECK/)).toBeOnTheScreen();
    expect(screen.getByText('DUE DEC 31')).toBeOnTheScreen();
    expect(screen.getByTestId('spend-more')).toBeOnTheScreen();
  });
  check('C10', 'retiree: no target dial and no saving sentence — wrong question for them', () => {
    expect(screen.queryByText('of your target nest egg')).toBeNull();
    expect(screen.queryByText(/projects to/)).toBeNull();
  });

  if (F.length) throw new Error('\nFLOW FINDINGS:\n' + F.join('\n'));
});
