/**
 * Account-creation module fixes (1.1–1.4) — behavioural assertions, not just "doesn't crash".
 * 1.4 (verify-email is a popup, no longer a step) is covered by the step-order tests in
 * src/onboarding/engine.test.ts (verifyEmail is absent from buildSteps).
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import OnboardingScreen from '../OnboardingScreen';

describe('Onboarding account step (account-creation module)', () => {
  beforeEach(() => {
    // Fresh + unauthenticated → the first step renders the account screen.
    useStore.setState({ user: null, onboardingDraft: undefined, onboardingComplete: false } as any);
  });

  test('1.1: the FIRST onboarding screen is "Create your free account"', () => {
    const { getByText } = render(<OnboardingScreen />);
    expect(getByText('Create your free account')).toBeTruthy();
  });

  test('1.3: the password field offers a Show/Hide toggle', () => {
    const { getByText } = render(<OnboardingScreen />);
    expect(getByText('Show')).toBeTruthy();
  });

  test('1.2: signup password minimum is 8 characters (placeholder), matching AuthScreen', () => {
    const { getByPlaceholderText } = render(<OnboardingScreen />);
    expect(getByPlaceholderText('8+ characters')).toBeTruthy();
  });
});
