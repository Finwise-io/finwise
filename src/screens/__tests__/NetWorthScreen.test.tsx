/**
 * NetWorthScreen — the seeding seam (B-15's home) plus the manager view's single-source totals.
 */
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import NetWorthScreen, { assetSheetReady } from '../NetWorthScreen';
import { useStore } from '../../store/useStore';
import { employedPartner } from '../../testing/personas';

beforeEach(() => {
  useStore.getState().resetAll();
});

describe('NetWorthScreen first-run intro', () => {
  test('fresh user sees the setup choice, and "I\'ll add my own" seeds from onboarding', () => {
    useStore.getState().setOnboardingProfile(employedPartner as any);
    render(<NetWorthScreen />);

    expect(screen.getByText("Let's build your net worth")).toBeOnTheScreen();
    expect(screen.getByText('We\'ll start from what you shared in setup.')).toBeOnTheScreen();

    fireEvent.press(screen.getByText("I'll add my own"));

    const st = useStore.getState();
    expect(st.nwSetupChoice).toBe('self');
    expect(st.assetAccounts.map((a) => a.label).sort()).toEqual(['Investments', 'Retirement savings']);
    expect(st.liabilities.map((d) => d.label)).toEqual(['Car loan']);
  });

  test('an already-seeded user skips the intro and lands in the manager', () => {
    useStore.getState().setOnboardingProfile(employedPartner as any);
    useStore.getState().seedNetWorth(employedPartner as any);
    render(<NetWorthScreen />);
    expect(screen.queryByText("Let's build your net worth")).toBeNull();
  });
});

describe('NetWorthScreen manager totals (single source of wealth)', () => {
  test('seeded accounts and debts render with their onboarding balances', () => {
    useStore.getState().setOnboardingProfile(employedPartner as any);
    useStore.getState().seedNetWorth(employedPartner as any);
    render(<NetWorthScreen />);

    expect(screen.getAllByText('$120,000').length).toBeGreaterThan(0);   // retirement savings row
    expect(screen.getAllByText('$45,000').length).toBeGreaterThan(0);    // investments row
    expect(screen.getAllByText(/\$14,000/).length).toBeGreaterThan(0);   // car loan
  });

  // UI-level B-15 regression: after a restart + new answers, the intro returns and re-seeding
  // picks up the NEW numbers (this whole journey was impossible before the fix).
  test('restart → new answers → intro reappears → seeding uses the new balances', () => {
    useStore.getState().setOnboardingProfile(employedPartner as any);
    useStore.getState().seedNetWorth(employedPartner as any);
    useStore.getState().restartOnboarding();

    const newAnswers = { ...employedPartner, currentRetirementSavings: '200000', investmentHoldings: '0' };
    useStore.getState().setOnboardingProfile(newAnswers as any);

    render(<NetWorthScreen />);
    expect(screen.getByText("Let's build your net worth")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("I'll add my own"));

    const accounts = useStore.getState().assetAccounts;
    // B-21: '200000' retirement + explicit '0' holdings → a $0 Investments placeholder too.
    expect(accounts).toHaveLength(2);
    expect(accounts.find((a) => a.label === 'Retirement savings')!.balance).toBe(200000);
    expect(accounts.find((a) => a.label === 'Investments')!.balance).toBe(0);
  });
});

// B-21: the add/edit sheet allows a $0 balance, but only when the amount field is actually filled in —
// a blank field must NOT create an account (prevents accidental empty adds); a typed "0" may.
describe('AssetSheet $0 add guard (B-21)', () => {
  test('needs a kind and a typed amount; allows "0", blocks blank/whitespace', () => {
    expect(assetSheetReady('brokerage', '')).toBe(false);     // blank → no add
    expect(assetSheetReady('brokerage', '   ')).toBe(false);  // whitespace → no add
    expect(assetSheetReady('', '5000')).toBe(false);          // no kind → no add
    expect(assetSheetReady('brokerage', '0')).toBe(true);     // explicit $0 → allowed
    expect(assetSheetReady('brokerage', '5000')).toBe(true);
  });
});
