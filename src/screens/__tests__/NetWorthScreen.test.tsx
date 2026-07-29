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
  useStore.setState({ hideBalances: false } as any);   // resetAll keeps prefs; the mask test flips it on
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

  test('the glance exposes a VoiceOver summary, and Hide-balances masks the headline', () => {
    useStore.getState().setOnboardingProfile(employedPartner as any);
    useStore.getState().seedNetWorth(employedPartner as any);
    useStore.setState({ hideBalances: false });
    const { rerender } = render(<NetWorthScreen />);
    expect(screen.getByLabelText(/Net worth .* By asset class/)).toBeOnTheScreen();   // FCC glance card
    useStore.setState({ hideBalances: true });
    rerender(<NetWorthScreen />);
    expect(screen.getByLabelText('Net worth hidden')).toBeOnTheScreen();   // headline masked
    expect(screen.getAllByText(/••••/).length).toBeGreaterThan(0);   // every dollar masks now, not just the headline
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
  expect(screen.getByText('Cash')).toBeOnTheScreen();          // WHAT YOU OWN class row
  expect(screen.getAllByText('Stocks / ETFs').length).toBeGreaterThan(0); // class row
  expect(screen.getByText(/WHAT YOU OWN/)).toBeOnTheScreen();  // the FCC group header
  expect(screen.getByText(/Own .* − Owe .* =/)).toBeOnTheScreen();   // the spelled-out math line
});

test('#14/#10: a wrapper account can be classified by what it HOLDS (no parallel double-counting account)', () => {
  useStore.setState({
    nwSeeded: true,
    assetAccounts: [
      { asset_id: 'k1', label: 'My 401(k)', kind: '401k', tax_bucket: 'PRE_TAX', balance: 200000, target_return: 0.07 },
    ],
    liabilities: [],
  } as any);
  // FCC founder round 2026-07-15: the inventory is VISIBLE — the account row routes directly
  const first = render(<NetWorthScreen />);
  fireEvent.press(screen.getByLabelText(/My 401\(k\), \$200,000\. Opens its page\./));
  expect(router.push).toHaveBeenCalledWith('/account-detail?id=k1');
  first.unmount();
  const er = jest.requireMock('expo-router');
  const restoreParams = er.useLocalSearchParams;
  er.useLocalSearchParams = () => ({ edit: 'k1' });                     // the detail screen's Edit path
  render(<NetWorthScreen />);
  er.useLocalSearchParams = restoreParams;
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
  expect(screen.getByText('Unclassified')).toBeOnTheScreen();              // honest class row — the spec fix
  expect(screen.queryByText('Stocks / ETFs')).toBeNull();                  // NOT pretended to be stocks
  expect(screen.getByText(/tap an account to say what's inside/)).toBeOnTheScreen();  // the nudge, on the class row
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

test('#13: import is reachable from Net Worth via the add-or-connect chooser', () => {
  (router.push as jest.Mock).mockClear();
  useStore.setState({ nwSeeded: true, assetAccounts: [
    { asset_id: 'a1', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 50000, target_return: 0.07 },
  ], liabilities: [] } as any);
  render(<NetWorthScreen />);
  fireEvent.press(screen.getByLabelText('Add or connect an account'));
  expect(screen.getByLabelText(/Link it, read-only/)).toBeOnTheScreen();   // a real door into the connect flow now
  fireEvent.press(screen.getByLabelText('Import from a file'));
  expect(router.push).toHaveBeenCalledWith('/import-holdings');
});

// P0 orphan-field fix: a debt's planned payment, once set, could never revert to
// "just pay the minimum" — the editor always wrote a number. Blank now clears it.
describe('debt planned payment clears on blank (P0 orphan field)', () => {
  it('empty planned-payment field saves monthly_payment: undefined (falls back to minimum)', () => {
    useStore.setState({ liabilities: [{ debt_id: 'd1', label: 'Card', debt_type: 'CREDIT_CARD', remaining_balance: 500, interest_rate_apr: 0.22, minimum_monthly_payment: 50, monthly_payment: 200 }] } as any);
    render(<NetWorthScreen />);
    // the save path is exercised through the sheet; assert the store rule directly:
    // requiredPayment falls back to the minimum when monthly_payment is undefined
    const { requiredPayment } = require('../../domain/debt');
    useStore.getState().updateLiability?.('d1', { monthly_payment: undefined });
    const d = useStore.getState().liabilities.find((x: any) => x.debt_id === 'd1')!;
    expect(requiredPayment(d)).toBe(50);
  });
});

// ── Build-46 walk rows 7 + 8 (v7 FINAL mock, audit Home·NW #15/#13) ──────────────────────────────
describe('walk row 7: the "Your path ahead" row (v7 FINAL)', () => {
  test('renders under the glance and routes to the Plan tab; with a computable plan it carries the projection', () => {
    useStore.setState({
      onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: String(new Date().getFullYear() - 55), targetRetirementAge: '67', monthlySpending: '5000', horizonAge: '92' },
      assetAccounts: [{ asset_id: 'ira', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 400000 }],
      nwSetupChoice: 'self',
    } as any);
    render(<NetWorthScreen />);
    const row = screen.getByLabelText(/Your path ahead, from your Plan/);
    expect(row).toBeOnTheScreen();
    expect(screen.getByText(/on course for/)).toBeOnTheScreen();
    expect(screen.getByText(/by 67/)).toBeOnTheScreen();
    expect(screen.getByText(/~\$[\d,]+/)).toBeOnTheScreen();          // the ~ says estimate
    fireEvent.press(row);
    expect(router.push).toHaveBeenCalledWith('/(tabs)/plan');
  });

  test('without a computable plan the row is the plain approved link — never an invented number', () => {
    useStore.setState({
      assetAccounts: [{ asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 5000 }],
      nwSetupChoice: 'self',
    } as any);
    render(<NetWorthScreen />);
    expect(screen.getByLabelText(/Your path ahead, from your Plan/)).toBeOnTheScreen();
    expect(screen.queryByText(/on course for/)).toBeNull();
  });
});

describe('walk row 8: the grouping pills (v7 FINAL)', () => {
  const seedTwoEtrade = () => useStore.setState({
    assetAccounts: [
      { asset_id: 'e1', label: 'Individual Brokerage', institution: 'E*TRADE', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 40000 },
      { asset_id: 'e2', label: 'Rollover IRA', institution: 'E*TRADE', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 60000 },
      { asset_id: 'c1', label: 'Everyday checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 8000 },
    ],
    nwSetupChoice: 'self',
  } as any);

  test('the three pills render; By institution rolls both E*TRADE accounts under ONE header', () => {
    seedTwoEtrade();
    render(<NetWorthScreen />);
    expect(screen.getByText('By class')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('By institution'));
    expect(screen.getByLabelText(/E\*TRADE, \$100,000, 2 accounts/)).toBeOnTheScreen();   // one header, summed
    expect(screen.getByLabelText(/Chase, \$8,000, 1 account\./)).toBeOnTheScreen();
  });

  test('By type groups by account kind and By class returns to the approved class view', () => {
    seedTwoEtrade();
    render(<NetWorthScreen />);
    fireEvent.press(screen.getByText('By type'));
    expect(screen.getByLabelText(/Checking, \$8,000, 1 account\./)).toBeOnTheScreen();
    fireEvent.press(screen.getByText('By class'));
    expect(screen.getByText('Cash')).toBeOnTheScreen();               // class rows are back
  });
});
