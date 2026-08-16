// TYPING THE TARGET — the field that makes the founder's first correction real.
//
// Before this the app had NO typed target at all. It derived one (the pot that reaches 80% odds),
// printed it under the label "Target nest egg", and never said we picked it. So a person read a
// number, believed it was their goal, and had no way to set their own.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PlanInputs } from '../PlanInputs';
import { useStore } from '../../store/useStore';
import { employedPartner } from '../../testing/personas';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

const DRAFT = { retireAge: 65, horizonAge: 90, extraMonthly: 0 } as any;
const seed = () => useStore.setState({
  onboardingComplete: true,
  onboardingProfile: { ...employedPartner, monthlySpending: '5200' },
  retirementAssumptions: { retireAge: 65, spendMonthly: 5200, targetNestEgg: null },
  assetAccounts: [{ asset_id: 'a', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 909152 }],
} as any);

beforeEach(() => { useStore.getState().resetAll(); seed(); });

const renderInputs = (suggested?: number | null) => render(
  <PlanInputs draft={DRAFT} committed={DRAFT} onDraft={jest.fn()} onCommit={jest.fn()} suggestedTarget={suggested} />,
);

test('the question is asked in the founder\'s words, and it is a field they can type in', () => {
  renderInputs();
  expect(screen.getByText(/What's your target nest egg\?/)).toBeOnTheScreen();
  expect(screen.getByLabelText('Your target nest egg')).toBeOnTheScreen();
});

test('while it is blank we OFFER a figure and say plainly that it is ours', () => {
  renderInputs(1_250_000);
  expect(screen.getByText(/our starting figure, not yours/)).toBeOnTheScreen();
  expect(screen.getByText(/Change it to your own number/)).toBeOnTheScreen();
});

test('typing saves it immediately, and our offer disappears the moment they do', () => {
  renderInputs(1_250_000);
  fireEvent.changeText(screen.getByLabelText('Your target nest egg'), '2000000');
  expect(useStore.getState().retirementAssumptions.targetNestEgg).toBe(2_000_000);
  expect(screen.queryByText(/our starting figure, not yours/)).toBeNull();
});

test('clearing the field returns to null — never a zero target', () => {
  renderInputs(1_250_000);
  const field = screen.getByLabelText('Your target nest egg');
  fireEvent.changeText(field, '2000000');
  fireEvent.changeText(field, '');
  expect(useStore.getState().retirementAssumptions.targetNestEgg).toBeNull();
});

test('it takes digits only — a typed "$2,000,000" does not become NaN', () => {
  renderInputs();
  fireEvent.changeText(screen.getByLabelText('Your target nest egg'), '$2,000,000');
  expect(useStore.getState().retirementAssumptions.targetNestEgg).toBe(2_000_000);
});

// ── THE MORTGAGE THE APP ADDS ON TOP (founder ruling, 2026-08-14) ────────────────────────────────
// "We are telling the user that we will include the mortgage payment for the left duration." So the
// app owns loan payments and takes them from the loan itself. The DANGER is double counting: what a
// person spends today includes their mortgage, so if they answer that way and we add it again, we
// charge it twice — on Pat, $2,400 a month counted double.
describe('spending excludes debt, because the app adds it', () => {
  test('the question says what to leave out, where they answer it', () => {
    renderInputs();
    expect(screen.getByText(/Not counting loan or mortgage payments/)).toBeOnTheScreen();
    expect(screen.getByText(/for as long\s+as they run/)).toBeOnTheScreen();
  });

  test('and it names the loan it is adding, with the year it stops', () => {
    render(<PlanInputs draft={DRAFT} committed={DRAFT} onDraft={jest.fn()} onCommit={jest.fn()}
      mortgageMonthly={2400} mortgagePayoffYear={2054} />);
    expect(screen.getByText(/including your \$2,400\/mo mortgage until it's paid off in 2054/)).toBeOnTheScreen();
  });

  test('with no loan on file it says nothing about one', () => {
    renderInputs();
    expect(screen.queryByText(/mortgage until it's paid off/)).toBeNull();
  });
});
