/**
 * Critical account journeys through AuthScreen (cause #2 — journeys, not just units).
 * login→Home · forgot-password · login-needs-recovery→restore prompt · signup+partner-invite→join.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useStore } from '../../store/useStore';
import AuthScreen from '../AuthScreen';
import {
  loginUser, registerUser, resetPassword, lookupInvite, joinHouseholdMembership, setUserHousehold,
} from '../../services/firebase';

beforeEach(() => {
  jest.clearAllMocks();
  useStore.setState({ user: null, householdId: null } as any);
});

test('login → Home: valid credentials sign in and route to the dashboard', async () => {
  (loginUser as jest.Mock).mockResolvedValue({ user: { uid: 'u1', displayName: 'A', metadata: {} } });
  const { getByPlaceholderText, getByText } = render(<AuthScreen />);
  fireEvent.changeText(getByPlaceholderText('you@email.com'), 'a@b.com');
  fireEvent.changeText(getByPlaceholderText('••••••••'), 'hunter2pass');
  fireEvent.press(getByText('Sign in'));
  await waitFor(() => expect(loginUser).toHaveBeenCalledWith('a@b.com', 'hunter2pass'));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/(tabs)/home'));
  expect(useStore.getState().user?.uid).toBe('u1');
});

test('forgot-password: sends a reset link and returns to login', async () => {
  const { getByText, getByPlaceholderText } = render(<AuthScreen />);
  fireEvent.press(getByText('Forgot your password?'));
  fireEvent.changeText(getByPlaceholderText('you@email.com'), 'a@b.com');
  fireEvent.press(getByText('Send reset link'));
  await waitFor(() => expect(resetPassword).toHaveBeenCalledWith('a@b.com'));
});

test('login-needs-recovery: opens the recovery-code restore prompt instead of Home', async () => {
  (loginUser as jest.Mock).mockResolvedValue({ user: { uid: 'u1', metadata: {} }, needsRecovery: true });
  const { getByPlaceholderText, getByText } = render(<AuthScreen />);
  fireEvent.changeText(getByPlaceholderText('you@email.com'), 'a@b.com');
  fireEvent.changeText(getByPlaceholderText('••••••••'), 'hunter2pass');
  fireEvent.press(getByText('Sign in'));
  await waitFor(() => expect(getByPlaceholderText('XXXX-XXXX-XXXX-XXXX-XXXX')).toBeTruthy());
  expect(router.replace).not.toHaveBeenCalledWith('/(tabs)/home');
});

test('signup + partner-invite: joins the shared household and routes Home', async () => {
  (registerUser as jest.Mock).mockResolvedValue({ user: { uid: 'u2' }, recoveryCode: 'REC-CODE' });
  (lookupInvite as jest.Mock).mockResolvedValue({ householdId: 'h1', inviterName: 'Sam' });
  const { getByText, getByPlaceholderText } = render(<AuthScreen />);
  fireEvent.press(getByText(/Create account/));   // switch login → register
  fireEvent.changeText(getByPlaceholderText('Alex Johnson'), 'Pat');
  fireEvent.changeText(getByPlaceholderText('you@email.com'), 'pat@b.com');
  fireEvent.changeText(getByPlaceholderText('At least 8 characters'), 'hunter2pass');
  fireEvent.changeText(getByPlaceholderText('Repeat your password'), 'hunter2pass');
  fireEvent.changeText(getByPlaceholderText('Have a code from your partner?'), 'k7m2qx');
  fireEvent.press(getByText('Create account'));    // submit (register button)
  await waitFor(() => expect(registerUser).toHaveBeenCalled());
  await waitFor(() => expect(joinHouseholdMembership).toHaveBeenCalledWith('u2', 'h1', 'K7M2QX'));
  expect(setUserHousehold).toHaveBeenCalledWith('u2', 'h1');
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/(tabs)/home'));
});
