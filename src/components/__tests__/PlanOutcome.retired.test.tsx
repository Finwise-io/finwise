// A RETIREE IS NOT REACHING FOR A TARGET (audit D8, founder ruling 2026-08-13).
//
// The target block is a "will I get there" framing. Once someone is drawing down, the question is
// "is this covering me", which the paycheck answers — that was adopted when the design handoff came
// in and confirmed again on 2026-08-13, but it was never built. So June saw a Target nest egg, a
// "More than you need $585,000", and four lines below it "~$2,336,000 to spare": two spare figures
// on one screen, measuring different things, neither labelled as which.
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PlanOutcome } from '../PlanOutcome';
import type { RetirementInputs } from '../../domain/retirement';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }), router: { push: jest.fn() } }));

const JUNE: RetirementInputs = {
  current_age: 72, retire_age: 72, horizon_age: 94,
  start_balance: 985_000, annual_contribution: 0,
  retire_monthly_spend_today: 5600, guaranteed_monthly_income: 4000, guaranteed_start_age: 72,
  mean_return: 0.055, vol_return: 0.0935, inflation: 0.025, seed: 42, paths: 400,
} as any;

const PAT: RetirementInputs = {
  current_age: 58, retire_age: 65, horizon_age: 90,
  start_balance: 909_152, annual_contribution: 0,
  retire_monthly_spend_today: 5200, guaranteed_monthly_income: 0,
  mean_return: 0.055, vol_return: 0.0935, inflation: 0.025, seed: 42, paths: 400,
} as any;

describe('the retired lens', () => {
  beforeEach(() => {
    render(<PlanOutcome inputs={JUNE} chance={100} band={{ low: 100, high: 100 }} horizonAge={94}
      retireAge={72} lens="retired" />);
  });

  test('shows no target nest egg', () => {
    expect(screen.queryByText('Target nest egg')).toBeNull();
  });

  test('shows neither a shortfall nor a "more than you need" figure', () => {
    expect(screen.queryByText('More than you need')).toBeNull();
    expect(screen.queryByText('Short')).toBeNull();
  });

  test('is not told to put more away toward a plan it is no longer paying into', () => {
    expect(screen.queryByText(/nothing more to put away/)).toBeNull();
    expect(screen.queryByText(/a year closes it/)).toBeNull();
  });

  test('still gets the odds, which is the number that matters to her', () => {
    expect(screen.getByText('100%')).toBeOnTheScreen();
    expect(screen.getByText(/odds of lasting to age 94/)).toBeOnTheScreen();
  });
});

describe('someone still working is unaffected', () => {
  test('keeps the target dial, the gap and the sentence that closes it', () => {
    // SUPERSEDED 2026-08-14: this asserted the old three-row arithmetic block ("Target nest egg" /
    // "On track for, at 65"). The founder ruled the target is a number the PERSON TYPES, and it now
    // has its own dial beside the odds. What matters for THIS file is unchanged: a working person
    // still gets the target framing that a retiree does not.
    render(<PlanOutcome inputs={PAT} chance={45} band={{ low: 18, high: 78 }} horizonAge={90}
      retireAge={65} lens="working" annualIncome={132000} typedTarget={2_000_000} />);
    expect(screen.getByText('of your target nest egg')).toBeOnTheScreen();
    expect(screen.getAllByText(/target nest egg/).length).toBeGreaterThan(0);   // dial + hero sentence
  });
});
