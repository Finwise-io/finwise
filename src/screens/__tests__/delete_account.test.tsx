/**
 * Critical journey: delete account (App Store 5.1.1(v)). Confirm dialog → password re-auth →
 * deleteAccount() → local wipe → back to /auth.
 */
import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useStore } from '../../store/useStore';
import { deleteAccount } from '../../services/firebase';
import SettingsScreen from '../SettingsScreen';

beforeEach(() => {
  jest.clearAllMocks();
  useStore.setState({ user: { uid: 'u1', email: 'a@b.com', name: 'A' } } as any);
});

test('delete account: confirm → re-auth → calls deleteAccount and returns to /auth', async () => {
  (deleteAccount as jest.Mock).mockResolvedValue(undefined);
  // Auto-press the destructive "Continue" in the confirmation dialog.
  jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, btns) => {
    (btns as any[])?.find((b) => b.text === 'Continue')?.onPress?.();
  });

  const { getByLabelText } = render(<SettingsScreen />);
  fireEvent.press(getByLabelText('Delete account'));         // opens confirm → reveals re-auth modal
  fireEvent.changeText(getByLabelText('Password'), 'hunter2pass');
  fireEvent.press(getByLabelText('Delete my account'));      // submitDeleteAccount

  await waitFor(() => expect(deleteAccount).toHaveBeenCalledWith('hunter2pass'));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/auth'));
  expect(useStore.getState().user).toBeNull();
});
