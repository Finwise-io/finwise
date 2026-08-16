// ADVERSARIAL PASS on the Plan redesign, before any build (release gate step 3).
// Written to BREAK the new work, not to confirm it. Existing journey suites all predate this change,
// so they cannot have exercised the typed target, the two dials, a loan that ends, or the sub-tabs.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PlanHubScreen from '../screens/PlanHubScreen';
import { PlanInputs } from '../components/PlanInputs';
import { SpendMoreControl } from '../components/SpendMoreControl';
import { ClaimAgeRow } from '../components/ClaimAgeRow';
import { MortgageRateCompare } from '../components/MortgageRateCompare';
import { useStore } from '../store/useStore';
import { planTarget, savingToReachTarget } from '../domain/planning/target';
import { mortgageOddsEffect } from '../domain/debt/mortgageOdds';
import { simulate } from '../domain/retirement';
import { employedPartner, retiree75 } from '../testing/personas';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

const yr = new Date().getFullYear();
const PAT: any = { current_age: 58, retire_age: 65, horizon_age: 90, start_balance: 909_152,
  annual_contribution: 12_000, retire_monthly_spend_today: 5200, guaranteed_monthly_income: 0,
  guaranteed_start_age: 67, mean_return: 0.0585, vol_return: 0.0752, inflation: 0.025,
  seed: 42, paths: 400, now_year: 2026 };
const D = { retireAge: 65, horizonAge: 90, extraMonthly: 0 } as any;

beforeEach(() => { useStore.getState().resetAll(); useStore.setState({ hideBalances: false } as any); });

describe('hostile numbers on the typed target', () => {
  test('a target of $1 does not break the dial or produce nonsense', () => {
    const p = planTarget(PAT, undefined, undefined, 1);
    expect(p.targetPct).toBeGreaterThan(100);          // wildly past it, and that is true
    expect(Number.isFinite(p.targetPct!)).toBe(true);
    expect(p.shortOfTarget).toBeLessThan(0);
  });

  test('an absurd target does not hang the solver or invent an answer', () => {
    const p = planTarget(PAT, undefined, undefined, 999_000_000_000);
    expect(p.targetPct).toBe(0);
    expect(p.savingToTarget).toBeNull();               // no saving reaches it — say nothing, never guess
  });

  test('a target EXACTLY equal to the balance reads 100% and zero short', () => {
    const p = planTarget(PAT, undefined, undefined, 909_152);
    expect(p.targetPct).toBe(100);
    expect(p.shortOfTarget).toBe(0);
  });

  test('a negative or zero target is treated as no target at all', () => {
    expect(planTarget(PAT, undefined, undefined, 0).typedTarget).toBeNull();
    expect(planTarget(PAT, undefined, undefined, -5).typedTarget).toBeNull();
  });

  test('the target field refuses junk rather than storing NaN', () => {
    useStore.setState({ onboardingProfile: { ...employedPartner, birthYear: String(yr - 58) } } as any);
    render(<PlanInputs draft={D} committed={D} onDraft={jest.fn()} onCommit={jest.fn()} />);
    fireEvent.changeText(screen.getByLabelText('Your target nest egg'), 'abc');
    expect(useStore.getState().retirementAssumptions.targetNestEgg).toBeNull();
  });
});

describe('hostile loans', () => {
  test('a loan bigger than everything they own still produces a real answer or none', () => {
    const e = mortgageOddsEffect({ base: PAT, balance: 5_000_000, annualRate: 0.055,
      monthlyPayment: 2400, extraMonthly: 500, nowYear: 2026 });
    expect(e).toBeNull();          // that payment never clears it — say nothing rather than guess
  });

  test('a loan already finished this year does not distort the plan', () => {
    const base = simulate(PAT).chance_of_success;
    const withDead = simulate({ ...PAT, recurring_until: [{ annual: 28_800, through_year: 2025 }] }).chance_of_success;
    expect(withDead).toBe(base);
  });

  test('a zero-interest loan does not divide by zero', () => {
    expect(() => mortgageOddsEffect({ base: PAT, balance: 100_000, annualRate: 0,
      monthlyPayment: 1000, extraMonthly: 100, nowYear: 2026 })).not.toThrow();
  });

  test('an extra payment larger than the balance does not invent a negative year', () => {
    const e = mortgageOddsEffect({ base: PAT, balance: 10_000, annualRate: 0.055,
      monthlyPayment: 2400, extraMonthly: 50_000, nowYear: 2026 })!;
    expect(e.fasterPayoffYear).toBeGreaterThanOrEqual(2026);
  });

  test('the rate comparison survives a loan with no payment on file', () => {
    render(<MortgageRateCompare balance={412_000} annualRate={0.055} monthlyPayment={0}
      extraMonthly={500} treasuryYield={0.0463} />);
    expect(screen.queryByTestId('mortgage-rate-compare')).toBeNull();   // nothing rather than nonsense
  });
});

describe('hostile ages and boundaries', () => {
  test('exactly 60 and exactly 70 both get the Social Security decision', () => {
    const { SS_DECISION_FROM, SS_DECISION_TO } = require('../domain/planning/hub');
    expect(60).toBeGreaterThanOrEqual(SS_DECISION_FROM);
    expect(70).toBeLessThanOrEqual(SS_DECISION_TO);
  });

  test('a 71-year-old who never claimed is not offered a decision that has expired', () => {
    useStore.setState({ onboardingComplete: true,
      onboardingProfile: { ...retiree75, birthYear: String(yr - 71), monthlySpending: '5600' },
      retirementAssumptions: { horizonAge: 94, spendMonthly: 5600 },
      assetAccounts: [{ asset_id: 'i', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 500_000 }] } as any);
    render(<PlanHubScreen />);
    expect(screen.queryByTestId('claim-age-row')).toBeNull();
  });

  test('a claim-age row with a zero statement is never shown a $0 benefit', () => {
    render(<ClaimAgeRow statementMonthly={0} />);
    expect(screen.queryByText('67 · $0')).toBeNull();
  });
});

describe('hostile retiree states', () => {
  test('a retiree with nothing saved is not offered spending room that does not exist', () => {
    useStore.setState({ onboardingComplete: true,
      onboardingProfile: { ...retiree75, birthYear: String(yr - 75), monthlySpending: '5600', ri_ss: '2600' },
      retirementAssumptions: { horizonAge: 94, spendMonthly: 5600 },
      assetAccounts: [] } as any);
    render(<PlanHubScreen />);
    expect(screen.queryByTestId('spend-more')).toBeNull();
  });

  test('spend-more with no room at all says so rather than offering nothing', () => {
    const broke: any = { ...PAT, current_age: 72, retire_age: 72, horizon_age: 94,
      start_balance: 50_000, annual_contribution: 0, retire_monthly_spend_today: 5600,
      guaranteed_monthly_income: 1000, guaranteed_start_age: 72 };
    render(<SpendMoreControl inputs={broke} maxExtra={0} horizonAge={94} />);
    expect(screen.getByText(/Not without it changing how long your money lasts/)).toBeOnTheScreen();
  });
});

describe('hide balances, everywhere at once', () => {
  test('no dollar figure survives the eye on the plan screen', () => {
    useStore.setState({ onboardingComplete: true, hideBalances: true,
      onboardingProfile: { ...employedPartner, birthYear: String(yr - 58), monthlySpending: '5200' },
      retirementAssumptions: { retireAge: 65, horizonAge: 90, spendMonthly: 5200, targetNestEgg: 2_000_000 },
      assetAccounts: [{ asset_id: 'a', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 909_152 }] } as any);
    render(<PlanHubScreen />);
    const dollars = screen.queryAllByText(/\$[\d,]{3,}/);
    expect(dollars).toEqual([]);
  });

  test('…but the odds stay visible, because they are not money', () => {
    useStore.setState({ onboardingComplete: true, hideBalances: true,
      onboardingProfile: { ...employedPartner, birthYear: String(yr - 58), monthlySpending: '5200' },
      retirementAssumptions: { retireAge: 65, horizonAge: 90, spendMonthly: 5200, targetNestEgg: 2_000_000 },
      assetAccounts: [{ asset_id: 'a', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 909_152 }] } as any);
    render(<PlanHubScreen />);
    expect(screen.getByText(/odds of lasting to age 90/)).toBeOnTheScreen();
  });
});

describe('the sub-tabs under stress', () => {
  test('switching tabs repeatedly never stacks two panels', () => {
    useStore.setState({ onboardingComplete: true,
      onboardingProfile: { ...employedPartner, birthYear: String(yr - 58), monthlySpending: '5200' },
      retirementAssumptions: { retireAge: 65, spendMonthly: 5200 },
      assetAccounts: [{ asset_id: 'a', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 500_000 }] } as any);
    render(<PlanHubScreen />);
    for (let i = 0; i < 4; i++) {
      fireEvent.press(screen.getByLabelText('Goals'));
      fireEvent.press(screen.getByLabelText('Prepare'));
      fireEvent.press(screen.getByLabelText('Retire'));
    }
    expect(screen.queryAllByTestId('plan-prepare')).toHaveLength(0);
    expect(screen.getAllByText('DECISIONS YOU CAN MAKE TODAY')).toHaveLength(1);
  });
});
