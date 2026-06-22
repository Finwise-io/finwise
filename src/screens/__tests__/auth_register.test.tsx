/**
 * AuthScreen is now the SINGLE account-creation screen (L-4). These assert the register-mode UX that
 * used to be duplicated/forked in onboarding: name, confirm-password (kept for zero-knowledge),
 * show/hide, password-strength, and the optional partner invite-code.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import AuthScreen from '../AuthScreen';

function toRegister() {
  const utils = render(<AuthScreen />);
  fireEvent.press(utils.getByText(/Create account/));   // switch login → register
  return utils;
}

describe('AuthScreen register (single account-creation screen)', () => {
  beforeEach(() => useStore.setState({ user: null } as any));

  test('has Name, Confirm password, and the optional Partner invite code fields', () => {
    const { getByText } = toRegister();
    expect(getByText('Your name')).toBeTruthy();
    expect(getByText('Confirm password')).toBeTruthy();
    expect(getByText('Partner invite code (optional)')).toBeTruthy();
  });

  test('offers a Show/Hide password toggle and a strength meter', () => {
    const { getByText } = toRegister();
    expect(getByText(/Show password|Hide password/)).toBeTruthy();
    expect(getByText('Password strength')).toBeTruthy();
  });
});
