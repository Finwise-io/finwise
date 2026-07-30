// The Social Security claim-timing decision journey (FCC Plan tab): statement in → three-way compare
// in the user's dollars → adoption through the shared Use-this-plan sheet (the ONE write path) →
// hub shows the chip + Back-to-previous-plan restores everything exactly (F11).
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import SsTimingScreen from '../SsTimingScreen';
import { useStore } from '../../store/useStore';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }) }));

const PRE_RETIREE = {
  status: 'employed', incomeSources: ['employment'], baseSalary: '9000',
  birthYear: String(new Date().getFullYear() - 60),   // age 60: every claim age still live
  monthlySpending: '5000', targetRetirementAge: '66', horizonAge: '90',
};

beforeEach(() => {
  useStore.getState().resetAll();
  useStore.setState({
    onboardingProfile: PRE_RETIREE,
    assetAccounts: [{ asset_id: 'ira', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 600000 }],
  } as any);
});

test('worked example until a statement is typed; typing shows YOUR numbers (67 row = statement exactly)', () => {
  render(<SsTimingScreen />);
  expect(screen.getByText(/Showing example numbers/)).toBeOnTheScreen();
  fireEvent.changeText(screen.getByLabelText(/Monthly amount from your Social Security statement/), '2600');
  expect(screen.queryByText(/Showing example numbers/)).toBeNull();
  expect(screen.getByText(/Trying it out/)).toBeOnTheScreen();          // sandbox banner
  expect(screen.getByText('$2,600')).toBeOnTheScreen();                 // the 67 row = the statement, exactly
  expect(screen.getByText('$1,820')).toBeOnTheScreen();                 // 62 = 70%
  expect(screen.getByText('$3,224')).toBeOnTheScreen();                 // 70 = 124%
  expect(screen.getByText('$717,600')).toBeOnTheScreen();               // 67 lifetime by 90
});

test('the live-to stepper recomputes lifetime totals (your assumption, not our prediction)', () => {
  render(<SsTimingScreen />);
  fireEvent.changeText(screen.getByLabelText(/Monthly amount from your Social Security statement/), '2600');
  fireEvent.press(screen.getByLabelText('Lower the live-to age by one year'));
  expect(screen.getByText('age 89')).toBeOnTheScreen();
  expect(screen.getByText('$686,400')).toBeOnTheScreen();               // 2600 × (89−67)×12
});

test('adoption goes through the Use-this-plan sheet: old → new list, then ONE write + history', () => {
  render(<SsTimingScreen />);
  fireEvent.changeText(screen.getByLabelText(/Monthly amount from your Social Security statement/), '2600');
  expect(useStore.getState().retirementAssumptions.ssClaimAge).toBeNull();   // sandbox wrote nothing

  fireEvent.press(screen.getByLabelText('Use claim at 67 as my plan'));
  expect(screen.getByText(/exactly what changes/)).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Use this plan: Claim Social Security at 67'));

  const A = useStore.getState().retirementAssumptions;
  expect(A.ssClaimAge).toBe(67);
  expect(A.ssMonthly).toBe(2600);
  expect(A.guaranteedMonthly).toBe(2600);
  expect(useStore.getState().planHistory).toHaveLength(1);   // the previous plan is kept
});

test('Back to previous plan restores the pre-adoption assumptions exactly (F11 revert pin)', () => {
  const before = { ...useStore.getState().retirementAssumptions };
  useStore.getState().adoptPlan({ ssClaimAge: 70, ssMonthly: 2600, guaranteedMonthly: 3224 }, 'before claiming at 70');
  expect(useStore.getState().retirementAssumptions.ssClaimAge).toBe(70);
  useStore.getState().revertPlan();
  expect(useStore.getState().retirementAssumptions).toEqual(before);
  expect(useStore.getState().planHistory).toHaveLength(0);
});

test('already receiving: never asked for a statement, sent to Monthly income instead', () => {
  useStore.setState({ onboardingProfile: { ...PRE_RETIREE, status: 'retired', incomeSources: ['retirement_income'], ri_ss: '2600' } } as any);
  render(<SsTimingScreen />);
  expect(screen.getByText(/You receive \$2,600\/mo/)).toBeOnTheScreen();
  expect(screen.queryByLabelText(/Monthly amount from your Social Security statement/)).toBeNull();
});

test('claim ages already passed grey out — a choice that no longer exists is never live', () => {
  useStore.setState({ onboardingProfile: { ...PRE_RETIREE, birthYear: String(new Date().getFullYear() - 68) } } as any);
  render(<SsTimingScreen />);
  // Build-47 walk row 2: past full retirement age the table RE-CENTERS — claim NOW vs 70,
    // never a dead list of greyed 'passed' rows (a 68-year-old's real choices).
    expect(screen.getByText(/at 68 \(now\)/)).toBeOnTheScreen();
    expect(screen.queryByText(/at 62/)).toBeNull();
  expect(screen.queryByLabelText('Use claim at 62 as my plan')).toBeNull();
  expect(screen.getByLabelText('Use claim at 70 as my plan')).toBeOnTheScreen();
});

test('adoption buttons stay disabled on example numbers (never adopt a number the user did not give)', () => {
  render(<SsTimingScreen />);
  fireEvent.press(screen.getByLabelText('Use claim at 67 as my plan'));
  expect(screen.queryByText(/exactly what changes/)).toBeNull();   // sheet never opened
  expect(useStore.getState().retirementAssumptions.ssClaimAge).toBeNull();
});
