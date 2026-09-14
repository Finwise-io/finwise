// FACTS SAVE · CHOICES COMMIT — the rule that let the answers screen and the sandbox become one.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PlanInputs, type PlanDraft } from '../PlanInputs';
import { useStore } from '../../store/useStore';

const YEAR = new Date().getFullYear();
const COMMITTED: PlanDraft = { retireAge: 65, horizonAge: 90, extraMonthly: 0 };

const seed = () => {
  useStore.getState().resetAll();
  useStore.setState({
    hideBalances: false,
    onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: String(YEAR - 58), monthlySpending: '5200' },
    assetAccounts: [
      { asset_id: 'v1', label: 'Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 355152, target_return: 0.07 },
      { asset_id: 'h1', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 620000, target_return: 0 },
    ],
    bigCosts: [], liabilities: [],
  } as any);
};

const harness = (over: Partial<PlanDraft> = {}) => {
  const draft = { ...COMMITTED, ...over };
  const onDraft = jest.fn();
  const onCommit = jest.fn();
  render(<PlanInputs draft={draft} committed={COMMITTED} onDraft={onDraft} onCommit={onCommit} />);
  return { onDraft, onCommit };
};

beforeEach(seed);

test('a FACT writes the moment it changes — there is nothing to remember to save', () => {
  harness();
  fireEvent.changeText(screen.getByLabelText('Your age in years'), '61');
  expect((useStore.getState() as any).onboardingProfile.birthYear).toBe(String(YEAR - 61));
  fireEvent.changeText(screen.getByLabelText('Monthly expenses in retirement'), '4800');
  expect((useStore.getState() as any).retirementAssumptions.spendMonthly).toBe(4800);
});

test('spending in retirement is ASKED, not derived — and it is the figure the odds then use', () => {
  harness();
  // CHANGED 2026-08-14 (founder ruling: we tell the person we include their mortgage for as long as
  // it runs). The hint used to read "What your savings actually have to cover. Prefilled from what
  // you spend now." — and what a person spends now INCLUDES their mortgage, because it is money
  // leaving their account. Once the app also adds the loan on top, that answer charges it twice.
  // The question now says what to leave out, at the point of answering.
  expect(screen.getByText(/Not counting loan or mortgage payments/)).toBeOnTheScreen();
  expect(screen.getByText(/we add those ourselves, from your loans/)).toBeOnTheScreen();
  fireEvent.changeText(screen.getByLabelText('Monthly expenses in retirement'), '6100');
  const { selectWillItLast } = require('../../domain/retirement/willItLast');
  const s: any = useStore.getState();
  const wil = selectWillItLast({ op: s.onboardingProfile, accounts: s.assetAccounts, assumptions: s.retirementAssumptions, employmentStatus: s.employmentStatus });
  expect(wil.inputs.retire_monthly_spend_today).toBe(6100);
});

test('a CHOICE never touches the live plan — it only moves the draft', () => {
  const { onDraft } = harness();
  const before = JSON.stringify((useStore.getState() as any).retirementAssumptions);
  fireEvent.press(screen.getByLabelText('Raise Retire at'));
  expect(onDraft).toHaveBeenCalledWith({ retireAge: 66, horizonAge: 90, extraMonthly: 0 });
  expect(JSON.stringify((useStore.getState() as any).retirementAssumptions)).toBe(before);   // untouched
});

test('the commit button only appears when there IS something to commit', () => {
  harness();
  expect(screen.queryByLabelText('Use this as my plan')).toBeNull();
  expect(screen.getByText(/nothing to commit/)).toBeOnTheScreen();
  screen.unmount();
  const { onCommit } = harness({ retireAge: 67 });
  fireEvent.press(screen.getByLabelText('Use this as my plan'));
  expect(onCommit).toHaveBeenCalled();
  expect(screen.getByText(/nothing changes until you tap Use as my plan/)).toBeOnTheScreen();
});

test('facts and choices are told apart at a glance — FACT chips and DRAFT chips', () => {
  harness();
  expect(screen.getAllByText(/FACT/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/DRAFT/).length).toBe(3);     // retire at · plan to · extra saving
});

test('the home does not count by default, and one tap changes that — the choice always wins', () => {
  harness();
  expect(screen.getByLabelText(/Vanguard.*Counts toward retirement/)).toBeOnTheScreen();
  const home = screen.getByLabelText(/Home.*Doesn't count/);
  fireEvent.press(home);
  expect((useStore.getState() as any).assetAccounts.find((a: any) => a.asset_id === 'h1').retirement_pct).toBe(100);
});

test('with no big costs the screen says what that silently assumes', () => {
  harness();
  expect(screen.getByText(/quietly assumes the roof never needs doing/)).toBeOnTheScreen();
});

test('plan-to age can never fall below the retire age — an impossible plan is not offered', () => {
  const { onDraft } = harness({ retireAge: 70, horizonAge: 71 });
  fireEvent.press(screen.getByLabelText('Lower Plan to age'));
  expect(onDraft).toHaveBeenCalledWith(expect.objectContaining({ horizonAge: 71 }));
});

test('every control clears the 44pt touch floor', () => {
  harness({ retireAge: 67 });
  const flat = (n: any) => Object.assign({}, ...[n.props.style].flat(Infinity).filter(Boolean));
  const small: string[] = [];
  const walk = (n: any) => {
    if (!n || typeof n === 'string') return;
    if (n.props?.accessibilityRole === 'button') {
      const h = flat(n).minHeight ?? flat(n).height ?? 0;
      if (h < 44) small.push(`${n.props.accessibilityLabel}: ${h}`);
    }
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  expect(small).toEqual([]);
});
