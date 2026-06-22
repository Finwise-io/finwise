/**
 * L-4 regression: onboarding is questions-only. Account creation lives on AuthScreen, so onboarding
 * must NOT render an account form or the old "You're signed in" dead-end — the first screen the user
 * sees is the first QUESTION.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import OnboardingScreen from '../OnboardingScreen';

describe('Onboarding flow (post-auth, questions-only)', () => {
  beforeEach(() => {
    // Onboarding now always runs AFTER auth → a user is present, setup unfinished.
    useStore.setState({
      user: { uid: 't', email: 't@t.com', name: 'T' },
      onboardingDraft: undefined,
      onboardingComplete: false,
    } as any);
  });

  test('the FIRST onboarding screen is the status question, not an account form', () => {
    const { getByText } = render(<OnboardingScreen />);
    expect(getByText('Which best describes you?')).toBeTruthy();
  });

  test('no signup form inside onboarding', () => {
    const { queryByText } = render(<OnboardingScreen />);
    expect(queryByText('Create your free account')).toBeNull();
  });

  test('no "You\'re signed in" dead-end', () => {
    const { queryByText } = render(<OnboardingScreen />);
    expect(queryByText("You're signed in")).toBeNull();
  });
});
