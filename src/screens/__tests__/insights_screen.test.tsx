/**
 * Screen-level insight checks — the input-construction in useInsights (thresholds, gates, sources)
 * is where the cross-module consistency bugs live, so they're tested through the rendered screen.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import InsightsScreen from '../InsightsScreen';
import { useStore } from '../../store/useStore';

beforeEach(() => {
  useStore.getState().resetAll();
});

// BUG-LEDGER: B-51 — "toxic / high-interest debt" uses the same 7% threshold everywhere; an 8% debt
// that the debt module + Net Worth flag must also fire the Home/Insights "high-interest debt" card.
describe('B-51 toxic-debt threshold', () => {
  test('an 8% debt fires the high-interest-debt insight (was silent at the old 10% cutoff)', () => {
    useStore.setState({
      liabilities: [{ debt_id: 'd1', label: 'Store card', debt_type: 'CREDIT_CARD', remaining_balance: 6000, interest_rate_apr: 0.08, minimum_monthly_payment: 200 }],
    });
    render(<InsightsScreen />);
    expect(screen.getByText('Tackle high-interest debt first')).toBeOnTheScreen();
    expect(screen.getByText(/8% APR/)).toBeOnTheScreen();
  });

  test('a 5% debt does not fire it', () => {
    useStore.setState({
      liabilities: [{ debt_id: 'd1', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.05, minimum_monthly_payment: 420 }],
    });
    render(<InsightsScreen />);
    expect(screen.queryByText('Tackle high-interest debt first')).toBeNull();
  });
});

// Build-46 walk row 3 (audit PRD #6): eye ON → the tapped card's pop-up sheet must mask its
// title and body like every other surface (it leaked "…contribute $9,200…" in plain dollars).
describe('the drill-down sheet respects hide-balances', () => {
  test('with balances hidden, opening a card leaves no dollar amount in the sheet', () => {
    const { fireEvent } = require('@testing-library/react-native');
    useStore.setState({
      hideBalances: true,
      onboardingProfile: { status: 'employed', incomeSources: ['employment'], baseSalary: '9000', salaryMode: 'gross', salaryFreq: 'monthly', monthlySpending: '4000', birthYear: '1970' },
      assetAccounts: [
        { asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 10000 },
        { asset_id: 'brk', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 90000 },
      ],
    } as any);
    render(<InsightsScreen />);
    // the account-concentration card is masked on the list… (the cash-drag card it used to press
    // was CUT by the founder 2026-08-20, brief §C Q24)
    const card = screen.getAllByLabelText(/account/i)[0];
    fireEvent.press(card);
    // …and after opening, NOTHING rendered anywhere carries a plain dollar figure
    const all = screen.toJSON();
    const texts: string[] = [];
    const walk = (n: any) => { if (n == null) return; if (typeof n === 'string') { texts.push(n); return; } (n.children ?? []).forEach(walk); };
    (Array.isArray(all) ? all : [all]).forEach(walk);
    const leaks = texts.filter((t) => /\$\d/.test(t));
    expect(leaks).toEqual([]);
  });
});

// Build-46 walk row 9 (home-v2 mock, audit Home·NW #1): what-needs-you items lead with DOLLARS —
// "$18,400 (31%) … sits in cash", never a bare percent; and the account-concentration card states
// a fact instead of issuing an instruction.
describe('dollar-first what-needs-you wording (walk row 9)', () => {
  test('account-concentration leads with the dollar figure (cash-drag cut, brief §C Q24)', () => {
    useStore.setState({
      hideBalances: false,   // resetAll keeps prefs; the mask test above flipped it on
      onboardingProfile: { status: 'employed', incomeSources: ['employment'], monthlySpending: '4000' },
      assetAccounts: [
        { asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 31000 },
        { asset_id: 'brk', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 69000 },
      ],
    } as any);
    render(<InsightsScreen />);
    expect(screen.queryByText(/sits in cash/)).toBeNull();   // the cut insight stays gone
    // out of the Investments line (2026-10-21, DEC-0457): the $31,000 checking is not invested money — it read (69%), out of
    // $100,000 with the checking counted
    expect(screen.getByText(/\$69,000 \(100%\) of your invested money sits in a single account/)).toBeOnTheScreen();
    // fact, not instruction: the audit-flagged imperative is gone
    expect(screen.queryByText(/add the holdings inside it and spread/)).toBeNull();
  });
});
