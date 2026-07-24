/**
 * Critical account journeys through AuthScreen (cause #2 — journeys, not just units).
 * login→Home · forgot-password · login-needs-recovery→restore prompt · signup+partner-invite→join.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
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
  await waitFor(() => expect(loginUser).toHaveBeenCalledWith('a@b.com', 'hunter2pass', expect.any(Function)));
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

// ── B45 founder findings (2026-07-24) ────────────────────────────────────────────────────────────

test('B45: sign-in shows the DESIGNED wordmark art — the name is never typed (was black text)', () => {
  const { getByLabelText, queryByText } = render(<AuthScreen />);
  const wm = getByLabelText('MoneyKeel');
  expect(wm.props.source).toEqual(require('../../../assets/brand/wordmark.png'));
  expect(queryByText('MoneyKeel')).toBeNull();
});

test('B45: legacy sign-in surfaces the recovery code + "Securing…" IMMEDIATELY, not after ~30s of key-wrapping', async () => {
  let finishEnvelope!: (v: any) => void;
  (loginUser as jest.Mock).mockImplementation((_e: any, _p: any, onCode: any) => {
    onCode?.('AAAA-BBBB-CCCC');                              // fired before the slow wrap, like the real service
    return new Promise((res) => { finishEnvelope = res; });  // envelope still building…
  });
  const { getByPlaceholderText, getByText } = render(<AuthScreen />);
  fireEvent.changeText(getByPlaceholderText('you@email.com'), 'legacy@b.com');
  fireEvent.changeText(getByPlaceholderText('••••••••'), 'hunter2pass');
  fireEvent.press(getByText('Sign in'));
  // WHILE the envelope is still being built: the code is up at the root, with the honest securing state
  await waitFor(() => expect((useStore.getState() as any).pendingRecoveryCode).toBe('AAAA-BBBB-CCCC'));
  expect((useStore.getState() as any).securingAccount).toBe(true);
  await act(async () => { finishEnvelope({ user: { uid: 'u9', metadata: {} }, needsRecovery: false, recoveryCode: 'AAAA-BBBB-CCCC' }); });
  await waitFor(() => expect((useStore.getState() as any).securingAccount).toBe(false));
  expect(router.replace).toHaveBeenCalledWith('/(tabs)/home');
});

test('B45: loginUser surfaces the code BEFORE the slow envelope wrap (static order pin)', () => {
  const fs = require('fs');
  const src = fs.readFileSync(require.resolve('../../services/firebase.ts'), 'utf8');
  const start = src.indexOf('export async function loginUser');
  const end = src.indexOf('\nexport ', start + 1);
  const fn = src.slice(start, end === -1 ? undefined : end);
  expect(fn.indexOf('onCodeReady?.(recoveryCode)')).toBeGreaterThan(-1);
  expect(fn.indexOf('onCodeReady?.(recoveryCode)')).toBeLessThan(fn.indexOf('makeEnvelope'));
});
