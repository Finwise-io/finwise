/**
 * NetWorthScreen — the seeding seam (B-15's home) plus the manager view's single-source totals.
 */
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
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
    expect(st.assetAccounts.map((a) => a.label).sort()).toEqual(['Investments', 'Retirement (Traditional)']);
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

  test('the donut exposes a VoiceOver summary, and Hide-balances masks the center figure', () => {
    useStore.getState().setOnboardingProfile(employedPartner as any);
    useStore.getState().seedNetWorth(employedPartner as any);
    useStore.setState({ hideBalances: false });
    const { rerender } = render(<NetWorthScreen />);
    expect(screen.getByLabelText(/Net worth .* By asset class/)).toBeOnTheScreen();
    useStore.setState({ hideBalances: true });
    rerender(<NetWorthScreen />);
    expect(screen.getByLabelText('Net worth hidden')).toBeOnTheScreen();   // donut + center both masked
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
    expect(accounts.find((a) => a.label === 'Retirement (Traditional)')!.balance).toBe(200000);
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

test('the hero donut is grouped by ASSET CLASS, not the old section axis (#19)', () => {
  useStore.setState({
    nwSeeded: true,
    assetAccounts: [
      { asset_id: 'a1', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 20000, target_return: 0 },
      { asset_id: 'a2', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 80000, target_return: 0.07 },
    ],
    liabilities: [],
  } as any);
  render(<NetWorthScreen />);
  expect(screen.getByText('Cash')).toBeOnTheScreen();          // asset-class legend label (not the "CASH" section header)
  expect(screen.getAllByText('Stocks / ETFs').length).toBeGreaterThan(0); // class slice (also a row)
  expect(screen.getByText('net worth')).toBeOnTheScreen();     // donut center total
});

test('#14/#10: a wrapper account can be classified by what it HOLDS (no parallel double-counting account)', () => {
  useStore.setState({
    nwSeeded: true,
    assetAccounts: [
      { asset_id: 'k1', label: 'My 401(k)', kind: '401k', tax_bucket: 'PRE_TAX', balance: 200000, target_return: 0.07 },
    ],
    liabilities: [],
  } as any);
  render(<NetWorthScreen />);
  fireEvent.press(screen.getByText('My 401(k)'));                       // open the edit sheet
  expect(screen.getByText("What's it invested in?")).toBeOnTheScreen(); // the wrapper class selector (#14 affordance)
  fireEvent.press(screen.getByText('Bonds'));                           // classify the existing account…
  fireEvent.press(screen.getByText(/Save \$/));                         // …instead of adding a separate bond account
  const acct = useStore.getState().assetAccounts.find((a: any) => a.asset_id === 'k1') as any;
  expect(acct.asset_class).toBe('bonds');                               // now counts as bonds, balance unchanged (200k)
  expect(acct.balance).toBe(200000);
});

test('#10: a 401(k) with unspecified holdings is "Unclassified", NOT assumed Stocks/ETFs', () => {
  useStore.setState({
    nwSeeded: true,
    assetAccounts: [
      { asset_id: 'a1', label: 'My 401(k)', kind: '401k', tax_bucket: 'PRE_TAX', balance: 200000, target_return: 0.07 },
    ],
    liabilities: [],
  } as any);
  render(<NetWorthScreen />);
  expect(screen.getByText('Unclassified')).toBeOnTheScreen();              // honest slice — the spec fix
  expect(screen.queryByText('Stocks / ETFs')).toBeNull();                  // NOT pretended to be stocks
  expect(screen.getByText(/holdings aren't set yet/)).toBeOnTheScreen();   // the nudge to classify
});

test('#9: the guided-setup running total carries the Assets − Debts identity (not a bare aggregate)', () => {
  useStore.setState({
    nwSeeded: true, nwSetupChoice: 'guided',
    assetAccounts: [
      { asset_id: 'a1', label: 'Cash', kind: 'savings', tax_bucket: 'CASH', balance: 5000, target_return: 0 },
      { asset_id: 'a2', label: 'My 401(k)', kind: '401k', tax_bucket: 'PRE_TAX', balance: 200000, target_return: 0.07 },
    ],
    liabilities: [{ debt_id: 'd1', label: 'Card', debt_type: 'OTHER', remaining_balance: 15000, interest_rate_apr: 0.2, minimum_monthly_payment: 100 }],
  } as any);
  render(<NetWorthScreen />);
  expect(screen.getByText('Net worth so far')).toBeOnTheScreen();
  // the total is shown WITH its components, so the number is never unexplained
  expect(screen.getByText(/Assets .*− Debts /)).toBeOnTheScreen();
});

test('#13: import is reachable from Net Worth (not buried in Performance)', () => {
  (router.push as jest.Mock).mockClear();
  useStore.setState({ nwSeeded: true, assetAccounts: [
    { asset_id: 'a1', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 50000, target_return: 0.07 },
  ], liabilities: [] } as any);
  render(<NetWorthScreen />);
  fireEvent.press(screen.getByLabelText('Import holdings from a brokerage file'));
  expect(router.push).toHaveBeenCalledWith('/import-holdings');
});
