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
});
