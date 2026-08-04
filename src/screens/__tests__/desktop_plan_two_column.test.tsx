// DESKTOP Plan hub — two-column pins (approved shell mock, Plan window, 2026-08-03).
// LEFT: verdict + next + decisions (no sandbox door) · RIGHT: the INLINE sandbox + meter.
// One-brain pins: at rest the sandbox % IS the hub %; adoption goes through store.adoptPlan
// with an exact preview (F11 #16) — never a silent write.
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react-native';
import { Platform, Alert } from 'react-native';
import PlanHubScreen from '../PlanHubScreen';
import { DesktopPlanSandbox } from '../../../desktop/platform/DesktopPlanSandbox';
import { useStore } from '../../store/useStore';
import { employedPartner } from '../../testing/personas';
import { simulate, RetirementInputs } from '../../domain/retirement';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

const seedWorking = () => useStore.setState({
  onboardingComplete: true,
  onboardingProfile: { ...employedPartner, monthlySpending: '4500' },
  retirementAssumptions: { retireAge: 67, contribMonthly: 1200, spendMonthly: 4500 },
  assetAccounts: [{ asset_id: 'b1', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 400000 }],
} as any);

const INPUTS: RetirementInputs = {
  current_age: 55, retire_age: 67, horizon_age: 92, start_balance: 400000,
  annual_contribution: 14400, retire_monthly_spend_today: 4500, guaranteed_monthly_income: 2000,
  inflation: 0.025, mean_return: 0.06, vol_return: 0.102, paths: 200, seed: 7,
};

const origOS = Platform.OS;
afterEach(() => { (Platform as any).OS = origOS; });
beforeEach(() => { useStore.getState().resetAll(); });

describe('desktop two-column Plan hub (web only)', () => {
  test('web renders columns: verdict LEFT, inline sandbox RIGHT, and the phone sandbox door is GONE', () => {
    (Platform as any).OS = 'web';
    seedWorking();
    render(<PlanHubScreen />);
    expect(screen.getByTestId('plan-desktop-columns')).toBeOnTheScreen();
    const left = screen.getByTestId('plan-desktop-left');
    const right = screen.getByTestId('plan-desktop-right');
    // verdict lives left, sandbox lives right — checked by traversal, not position guesswork
    expect(within(left).getByText(/WILL MY MONEY LAST\? — to \d+/)).toBeTruthy();
    expect(within(right).getByTestId('desktop-plan-sandbox')).toBeTruthy();
    expect(within(right).getByText(/Sharpen your plan/)).toBeTruthy();
    expect(screen.queryByText('Try what-ifs — a sandbox ›')).toBeNull();   // the door is phone-only
  });

  test('phone keeps the single column and the sandbox DOOR (no desktop artifacts)', () => {
    seedWorking();
    render(<PlanHubScreen />);
    expect(screen.queryByTestId('plan-desktop-columns')).toBeNull();
    expect(screen.getByText('Try what-ifs — a sandbox ›')).toBeOnTheScreen();
    expect(screen.queryByTestId('desktop-plan-sandbox')).toBeNull();
  });
});

describe('inline desktop sandbox — one brain with the verdict', () => {
  test('at rest the sandbox shows EXACTLY the plan chance (no drift possible)', () => {
    render(<DesktopPlanSandbox lens="preretired" inputs={INPUTS} planChance={83} />);
    expect(screen.getByText(/ — 83% · estimate/)).toBeOnTheScreen();
    expect(screen.queryByText('Use as my plan')).toBeNull();               // nothing to adopt at rest
    expect(screen.getByText('move a dial — the odds re-run live')).toBeOnTheScreen();
  });

  test('moving a dial re-runs the REAL engine and names the trade before deciding', () => {
    const real = simulate({ ...INPUTS, retire_age: 65 }).chance_of_success;
    render(<DesktopPlanSandbox lens="preretired" inputs={INPUTS} planChance={83} />);
    fireEvent.press(screen.getByLabelText('Retire at age down'));
    fireEvent.press(screen.getByLabelText('Retire at age down'));
    expect(screen.getByText(new RegExp(` — ${real}% · estimate`))).toBeOnTheScreen();
    expect(screen.getByText(/retiring at 65 (costs|adds|moves)/)).toBeOnTheScreen();
    expect(screen.getByText('Use as my plan')).toBeOnTheScreen();
  });

  test('Use as my plan previews the exact change, then writes through the ONE shared adoptPlan', () => {
    const spy = jest.spyOn(Alert, 'alert');
    const adopt = jest.fn();
    useStore.setState({ adoptPlan: adopt } as any);
    render(<DesktopPlanSandbox lens="preretired" inputs={INPUTS} planChance={83} />);
    fireEvent.press(screen.getByLabelText('Retire at age down'));
    fireEvent.press(screen.getByText('Use as my plan'));
    expect(spy).toHaveBeenCalled();
    const [title, body, buttons] = spy.mock.calls[spy.mock.calls.length - 1];
    expect(title).toBe('Use this as your plan?');
    expect(body).toMatch(/Retire at: 67 → 66/);                            // the exact numbers, previewed
    (buttons as any[]).find((b) => b.text === 'Use as my plan').onPress();
    expect(adopt).toHaveBeenCalledWith({ retireAge: 66 }, 'Plan-page sandbox');
    spy.mockRestore();
  });

  test('retired lens dials are spending + plan-to age (no retire-age dial exists)', () => {
    render(<DesktopPlanSandbox lens="retired" inputs={{ ...INPUTS, current_age: 75, retire_age: 75 }} planChance={88} />);
    expect(screen.getByText('Spend / month')).toBeOnTheScreen();
    expect(screen.getByText('Plan-to age')).toBeOnTheScreen();
    expect(screen.queryByText('Retire at age')).toBeNull();
  });
});
