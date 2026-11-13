/** INVITE YOUR SPOUSE, AND JOIN — held to its drawing, state by state, word for word (2026-11-12, cloud copy R13).
 *
 *  The drawing: MoneyKeel/documents/other/moneykeel_pres_mock_household-invite-and-join_v01.html — phone 1, setup's invite step
 *  (states A, B), phone 2, sign-up (states C, D, E). Each state's words are read out of the drawing in order (stateLines.ts) and the
 *  rendered screen's words are read off the tree in order (renderedLines); the two streams must be the same.
 *  Read as one, not a difference: setup's crumb line above the step follows the tracks the person picked (the drawing draws one
 *  person's), so phone 1 is compared from the step's own ✉️ down; a password box shows its dots on the phone, its typed value here.
 *  Behaviour: invite → join with the key code → the member reads the household; a wrong key code is refused and nothing is joined;
 *  an invite past 7 days is refused naming the day.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import OnboardingScreen from '../OnboardingScreen';
import AuthScreen from '../AuthScreen';
import SettingsScreen from '../SettingsScreen';
import { buildSteps } from '../../onboarding/steps';
import { renderedLines } from '../../testing/drawnLines';
import { drawnStream, streamOf, streamBreak } from '../../testing/stateLines';
import { useStore } from '../../store/useStore';
import {
  registerUser, checkInviteCodes, joinHouseholdWithKeyCode, deleteAccount, createInviteWithKeyCode, withdrawInvite,
  loadHouseholdPeople, refreshEmailVerified, loadUserData,
} from '../../services/firebase';

const FILE = 'MoneyKeel/documents/other/moneykeel_pres_mock_household-invite-and-join_v01.html';
const PASSWORD = 'abcdefghij';
const NOV12 = new Date(2026, 10, 12, 9, 41).getTime();
const NOV19 = new Date(2026, 10, 19, 9, 41).getTime();

const built = () => streamOf(renderedLines(screen.toJSON()).map((l) => (l === PASSWORD ? '••••••••••' : l)));
const fromStep = (s: string) => s.slice(s.indexOf('✉️ Invite your spouse'));
const same = (drawn: string, got: string) => { if (drawn !== got) throw new Error(streamBreak(drawn, got)); };

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(NOV12);
});
afterEach(() => jest.restoreAllMocks());

function atInviteStep(answers: Record<string, any> = {}) {
  const a = { hasPartner: 'yes', ...answers };
  const steps = buildSteps('employed' as any, ['partner'] as any, a);
  useStore.getState().resetAll();
  useStore.setState({ user: { uid: 'pat', email: 'pat@email.com', name: 'Pat Rivera' }, onboardingComplete: false,
    onboardingDraft: { stepIndex: steps.indexOf('invitePartner'), status: 'employed', tracks: ['partner'], name: 'Pat', answers: a } } as any);
  return render(<OnboardingScreen />);
}

function signUpTyped(keyCode = 'Q7RM-K2XD-8WPA-HN4C-T6VJ') {
  useStore.setState({ user: null, householdId: null } as any);
  render(<AuthScreen />);
  fireEvent.press(screen.getByText(/Create account/));
  fireEvent.changeText(screen.getByPlaceholderText('Alex Johnson'), 'Sam Rivera');
  fireEvent.changeText(screen.getByPlaceholderText('you@email.com'), 'sam@email.com');
  fireEvent.changeText(screen.getByPlaceholderText('At least 8 characters'), PASSWORD);
  fireEvent.changeText(screen.getByPlaceholderText('Repeat your password'), PASSWORD);
  fireEvent.changeText(screen.getByPlaceholderText('Have a code from your spouse?'), 'K7MQ2D');
  if (keyCode) fireEvent.changeText(screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX-XXXX'), keyCode);
}

describe('phone 1 — the invite step, Pat’s phone', () => {
  test('state A: no invite made yet — the line names both codes and how long they last, and the button reads “Create the two codes”', () => {
    atInviteStep();
    same(fromStep(drawnStream(FILE, 'STATE A')), fromStep(built()));
  });

  test('state B: the two codes made — the invite code, the key code in five groups of four, each with its own Share, 7 days to Nov 19, 2026, no Skip', async () => {
    atInviteStep();
    fireEvent.press(screen.getByText('✉️ Create the two codes'));
    await waitFor(() => screen.getByText('Their key code'));
    same(fromStep(drawnStream(FILE, 'STATE B')), fromStep(built()));
    expect(createInviteWithKeyCode).toHaveBeenCalledWith('pat', 'Pat');   // the inviter's first name, which Sam's refusals say
    expect((useStore.getState() as any).onboardingDraft?.answers?.keyCode).toBeUndefined();   // the key code is kept nowhere
  });

  test('coming back to the step: the invite code, and the key code was shown once — “Create the two codes again” stops the first pair', async () => {
    atInviteStep({ inviteCode: 'K7MQ2D' });
    expect(screen.getByText('The key code was shown once. To see a key code again, create the two codes again.')).toBeTruthy();
    expect(screen.queryByText('Their key code')).toBeNull();
    fireEvent.press(screen.getByText('Create the two codes again'));
    await waitFor(() => screen.getByText('Their key code'));
    expect(withdrawInvite).toHaveBeenCalledWith('K7MQ2D');
  });
});

describe('phone 2 — sign-up, Sam’s phone', () => {
  test('first day: with the invite code empty, sign-up looks exactly as today — no key code field', () => {
    useStore.setState({ user: null } as any);
    render(<AuthScreen />);
    fireEvent.press(screen.getByText(/Create account/));
    expect(screen.queryByText('Spouse key code')).toBeNull();
  });

  test('state C: both codes typed — the key code field under the invite code, and its hint', () => {
    signUpTyped();
    same(drawnStream(FILE, 'STATE C'), built());
  });

  test('state D: one letter wrong — refused under the key code, naming the invite code and Pat; nothing is joined and the account is undone', async () => {
    (registerUser as jest.Mock).mockResolvedValue({ user: { uid: 'sam' }, recoveryCode: 'SAMR-ECOV-ERYC-ODE1-2345' });
    (checkInviteCodes as jest.Mock).mockResolvedValue({ status: 'wrong-key-code', inviterName: 'Pat', expiresAt: NOV19 });
    signUpTyped('Q7RM-K2XD-8WPA-HN4C-T6VK');
    fireEvent.press(screen.getByText('Create account'));
    await waitFor(() => screen.getByText('This key code does not match invite code K7MQ2D. Ask Pat for the key code shown beside it.'));
    same(drawnStream(FILE, 'STATE D'), built());
    expect(joinHouseholdWithKeyCode).not.toHaveBeenCalled();
    expect(deleteAccount).toHaveBeenCalledWith(PASSWORD);
    expect((useStore.getState() as any).pendingRecoveryCode ?? null).toBeNull();   // no recovery code for an account that is undone
  });

  test('state E: Nov 20 is past Nov 19 — refused under the invite code, naming the day it ran out', async () => {
    (Date.now as jest.Mock).mockReturnValue(new Date(2026, 10, 20, 9, 41).getTime());
    (registerUser as jest.Mock).mockResolvedValue({ user: { uid: 'sam' }, recoveryCode: 'R' });
    (checkInviteCodes as jest.Mock).mockResolvedValue({ status: 'expired', inviterName: 'Pat', expiresAt: NOV19 });
    signUpTyped();
    fireEvent.press(screen.getByText('Create account'));
    await waitFor(() => screen.getByText('Invite code K7MQ2D ran out on Nov 19, 2026. Ask Pat to create the two codes again.'));
    same(drawnStream(FILE, 'STATE E'), built());
    expect(joinHouseholdWithKeyCode).not.toHaveBeenCalled();
  });

  test('an invite code with no key code: “Enter the key code too. It is on Pat’s phone, beside the invite code.”', async () => {
    (registerUser as jest.Mock).mockResolvedValue({ user: { uid: 'sam' }, recoveryCode: 'R' });
    (checkInviteCodes as jest.Mock).mockResolvedValue({ status: 'no-key-code', inviterName: 'Pat', expiresAt: NOV19 });
    signUpTyped('');
    fireEvent.press(screen.getByText('Create account'));
    await waitFor(() => screen.getByText('Enter the key code too. It is on Pat’s phone, beside the invite code.'));
    expect(joinHouseholdWithKeyCode).not.toHaveBeenCalled();
  });
});

test('behaviour: invite → join with the key code → Sam reads the household, and Settings says whose it is', async () => {
  (registerUser as jest.Mock).mockResolvedValue({ user: { uid: 'sam' }, recoveryCode: 'SAMR-ECOV-ERYC-ODE1-2345' });
  (checkInviteCodes as jest.Mock).mockResolvedValue({ status: 'ok', householdId: 'pat', inviterName: 'Pat', expiresAt: NOV19 });
  (joinHouseholdWithKeyCode as jest.Mock).mockResolvedValue('pat');
  (loadUserData as jest.Mock).mockResolvedValue({ assetAccounts: [{ asset_id: 'brk', label: 'Brokerage', balance: 30000 }] });
  signUpTyped();
  fireEvent.press(screen.getByText('Create account'));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/(tabs)/home'));
  // checked before anything is joined, then joined with Sam's own password, recovery code and first name
  expect((checkInviteCodes as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan((joinHouseholdWithKeyCode as jest.Mock).mock.invocationCallOrder[0]);
  expect(joinHouseholdWithKeyCode).toHaveBeenCalledWith('sam', 'K7MQ2D', 'Q7RM-K2XD-8WPA-HN4C-T6VJ', PASSWORD, 'SAMR-ECOV-ERYC-ODE1-2345', 'Sam Rivera');
  expect(useStore.getState().householdId).toBe('pat');
  expect((useStore.getState() as any).assetAccounts.map((a: any) => a.balance)).toEqual([30000]);   // Pat's Brokerage $30,000
  expect((useStore.getState() as any).pendingRecoveryCode).toBe('SAMR-ECOV-ERYC-ODE1-2345');
  expect(deleteAccount).not.toHaveBeenCalled();

  screen.unmount();
  (refreshEmailVerified as jest.Mock).mockResolvedValue(true);
  (loadHouseholdPeople as jest.Mock).mockResolvedValue({ role: 'member', owner: 'pat', ownerName: 'Pat', joinedAt: new Date(2026, 10, 14, 12).getTime() });
  render(<SettingsScreen />);
  await waitFor(() => screen.getByText('You share Pat’s household'));
  expect(loadHouseholdPeople).toHaveBeenCalledWith('sam', 'pat');
  expect(screen.getByText('Since Nov 14, 2026 · you both see the same accounts, plans and goals')).toBeTruthy();
});

test('a refusal that comes after sign-up has left the screen is carried to the screen the sign-in listener shows again (state D, remounted)', async () => {
  let finishDelete: () => void = () => {};
  (registerUser as jest.Mock).mockResolvedValue({ user: { uid: 'sam' }, recoveryCode: 'R' });
  (checkInviteCodes as jest.Mock).mockResolvedValue({ status: 'wrong-key-code', inviterName: 'Pat', expiresAt: NOV19 });
  (deleteAccount as jest.Mock).mockImplementation(() => new Promise<void>((done) => { finishDelete = done; }));
  signUpTyped('Q7RM-K2XD-8WPA-HN4C-T6VK');
  fireEvent.press(screen.getByText('Create account'));
  await waitFor(() => expect(deleteAccount).toHaveBeenCalled());
  screen.unmount();   // the listener moved on to setup when the account was made
  finishDelete();
  await new Promise((r) => setTimeout(r, 0));
  render(<AuthScreen />);   // the account is gone: back on sign-up
  same(drawnStream(FILE, 'STATE D'), built());
});
