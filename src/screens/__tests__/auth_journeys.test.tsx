/**
 * Critical account journeys through AuthScreen (cause #2 — journeys, not just units).
 * login→Home · forgot-password · login-needs-recovery→restore prompt · signup+spouse-invite→join.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useStore } from '../../store/useStore';
import AuthScreen from '../AuthScreen';
import {
  loginUser, registerUser, resetPassword, checkInviteCodes, joinHouseholdWithKeyCode,
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

test('signup + spouse-invite (R13, 2026-11-12): the invite code AND the key code are checked, then the household is joined and routes Home', async () => {
  (registerUser as jest.Mock).mockResolvedValue({ user: { uid: 'u2' }, recoveryCode: 'REC-CODE' });
  (checkInviteCodes as jest.Mock).mockResolvedValue({ status: 'ok', householdId: 'h1', inviterName: 'Sam', expiresAt: null });
  const { getByText, getByPlaceholderText } = render(<AuthScreen />);
  fireEvent.press(getByText(/Create account/));   // switch login → register
  fireEvent.changeText(getByPlaceholderText('Alex Johnson'), 'Pat');
  fireEvent.changeText(getByPlaceholderText('you@email.com'), 'pat@b.com');
  fireEvent.changeText(getByPlaceholderText('At least 8 characters'), 'hunter2pass');
  fireEvent.changeText(getByPlaceholderText('Repeat your password'), 'hunter2pass');
  fireEvent.changeText(getByPlaceholderText('Have a code from your spouse?'), 'k7m2qx');
  fireEvent.changeText(getByPlaceholderText('XXXX-XXXX-XXXX-XXXX-XXXX'), 'q7rm-k2xd-8wpa-hn4c-t6vj');
  fireEvent.press(getByText('Create account'));    // submit (register button)
  await waitFor(() => expect(registerUser).toHaveBeenCalled());
  await waitFor(() => expect(joinHouseholdWithKeyCode).toHaveBeenCalledWith('u2', 'K7M2QX', 'Q7RM-K2XD-8WPA-HN4C-T6VJ', 'hunter2pass', 'REC-CODE', 'Pat'));
  expect(checkInviteCodes).toHaveBeenCalledWith('K7M2QX', 'Q7RM-K2XD-8WPA-HN4C-T6VJ');
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/(tabs)/home'));
});

// ── B45 founder findings (2026-07-24) ────────────────────────────────────────────────────────────

test('B45: sign-in shows the DESIGNED wordmark art — the name is never typed (was black text)', () => {
  const { getByLabelText, queryByText } = render(<AuthScreen />);
  const wm = getByLabelText('MoneyKeel');
  expect(wm.props.source).toEqual(require('../../../assets/brand/wordmark.png'));
  expect(queryByText('MoneyKeel')).toBeNull();
});

// 2026-10-30, his words: "change the logo to attached" — drawing brand-wordmark v02, phone 3. His mark above his lettering,
// at the sizes they have to each other in his full logo; the tagline under them stays typed words.
const logoSizes = (root: any) => {
  const { Image, StyleSheet } = require('react-native');
  return root.UNSAFE_getAllByType(Image).map((i: any) => {
    const st = StyleSheet.flatten(i.props.style);
    return [i.props.source, st.width, st.height];
  });
};
test('sign-in draws his mark at 89 × 43.7 and his lettering at 150 × 30.6, the tagline as words', () => {
  const r = render(<AuthScreen />);
  expect(logoSizes(r)).toEqual([
    [require('../../../assets/brand/mark.png'), 89, 43.7],
    [require('../../../assets/brand/wordmark.png'), 150, 30.6],
  ]);
  expect(r.getByText('Your finance command center')).toBeTruthy();
});
test.failing('sign-in until 2026-10-30, pinned: the K mark as a square 84 × 84 over the lettering at 150 × 30 (REPLACED 2026-10-30, brand-wordmark v02)', () => {
  const r = render(<AuthScreen />);
  expect(logoSizes(r)).toEqual([
    [require('../../../assets/brand/mark.png'), 84, 84],
    [require('../../../assets/brand/wordmark.png'), 150, 30],
  ]);
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
