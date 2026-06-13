/**
 * Deep interaction tests for the highest-impact screens: the values a user sees must equal the
 * domain's single-source numbers (cockpit basis, debt plan, retired framing).
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import RetirementCockpit from '../RetirementCockpit';
import GoalsScreen from '../GoalsScreen';
import { useStore } from '../../store/useStore';
import { employedPartner, retiree75 } from '../../testing/personas';

function complete(op: Record<string, any>) {
  const s = useStore.getState();
  s.setOnboardingProfile(op);
  s.setOnboardingComplete(true);
  s.seedNetWorth(op);
}

beforeEach(() => {
  useStore.getState().resetAll();
});

describe('RetirementCockpit — where you stand', () => {
  test('employed user sees the accumulation cockpit', () => {
    complete(employedPartner);
    render(<RetirementCockpit />);
    expect(screen.getByText(/RETIREMENT · WHERE YOU STAND/i)).toBeOnTheScreen();
  });

  test('retired user gets the decumulation framing (no accumulation-only labels crash)', () => {
    useStore.setState({ employmentStatus: 'retired' });
    complete(retiree75);
    render(<RetirementCockpit />);
    expect(screen.getByText(/WHERE YOU STAND/i)).toBeOnTheScreen();
  });

  // BUG-LEDGER: B-31 — guaranteed income (SS + pension) captured in onboarding must show on the
  // cockpit without the user re-entering it; the row must not say "Are you eligible? Tap to set up".
  test('SS + pension from onboarding surface as guaranteed income (no "set up" prompt)', () => {
    complete(retiree75);   // ri_ss 2200 + ri_pension 1300, no on-screen ssEligible set
    render(<RetirementCockpit />);
    expect(screen.getByText('Social Security & pension')).toBeOnTheScreen();   // pension named
    expect(screen.getByText(/\$3,500\/mo/)).toBeOnTheScreen();                 // 2200 + 1300
    expect(screen.queryByText(/Are you eligible\? Tap to set up/)).toBeNull();
  });

  test('user who has not entered any retirement income still sees the set-up prompt', () => {
    complete({ ...employedPartner, ri_ss: undefined, ri_pension: undefined });
    render(<RetirementCockpit />);
    expect(screen.getByText(/Are you eligible\? Tap to set up/)).toBeOnTheScreen();
  });
});

describe('GoalsScreen — debt payoff plan', () => {
  test('the seeded car loan appears in the payoff plan', () => {
    complete(employedPartner);
    render(<GoalsScreen />);
    expect(screen.getByText('DEBT PAYOFF PLAN')).toBeOnTheScreen();
    expect(screen.getAllByText(/Car loan/).length).toBeGreaterThan(0);
  });

  test('debt-free user sees no payoff plan', () => {
    complete({ ...employedPartner, debtBalance: '0' });
    render(<GoalsScreen />);
    expect(screen.queryByText('DEBT PAYOFF PLAN')).toBeNull();
  });

  // BUG-LEDGER: B-28 — "free cash to save" must be income AFTER spending, not gross income.
  test('free-cash figure reflects savings (income − spend), not raw income', () => {
    // $5,000/mo income, $3,000/mo rent → $2,000/mo free cash (not $5,000)
    complete({
      taxMode: 'manual', manualTaxRate: '0', status: 'employed',
      baseSalary: '5000', salaryMode: 'gross', salaryFreq: 'monthly',
      spendCats: [{ id: 'rent', tier: 'critical', bucket: 'fixed', amount: '3000', unit: 'dollar' }],
    });
    render(<GoalsScreen />);
    expect(screen.getByText(/\$2,000\/mo/)).toBeOnTheScreen();
    expect(screen.queryByText(/\$5,000\/mo/)).toBeNull();   // not the gross income
  });

  test('a household running a deficit shows no "free cash to save" card', () => {
    complete({
      taxMode: 'manual', manualTaxRate: '0', status: 'employed',
      baseSalary: '3000', salaryMode: 'gross', salaryFreq: 'monthly', monthlySpending: '4500',
    });
    render(<GoalsScreen />);
    expect(screen.queryByText(/typical free cash to save/)).toBeNull();
  });
});
