/** BACK IN THROUGH THE SPOUSE'S RETURN CODE — held to its drawing, state by state, word for word (2026-11-12, cloud copy R14).
 *
 *  The drawing: MoneyKeel/documents/other/moneykeel_pres_mock_owner-back-in-by-return-code_v01.html — phone 1, Settings on Sam's
 *  phone (states A, B); phone 2, "Restore your data" on Pat's (C, D, E); phone 3, the recovery code screen (F). Each state's words,
 *  read in order out of the drawing, must be the rendered screen's words in order.
 *  Read as one, not a difference: the MoneyKeel bar and the tab bar belong to the navigator, not Settings, so they are taken off the
 *  drawn words; states B shows Settings scrolled to the Household box, so it is compared from there. Settings carries rows the
 *  drawing leaves out, each built before this drawing and named in SETTINGS_ROWS_NOT_DRAWN, taken off the built words.
 *  Behaviour: the return code gets the owner back in; a wrong one saves nothing and says what to do.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import SettingsScreen from '../SettingsScreen';
import AuthScreen from '../AuthScreen';
import { RecoveryCodeModal } from '../../components/RecoveryCodeModal';
import { renderedLines } from '../../testing/drawnLines';
import { drawnStream, streamOf, streamBreak, SETTINGS_ROWS_NOT_DRAWN, CHROME_TOP, CHROME_TABS } from '../../testing/stateLines';
import { useStore } from '../../store/useStore';
import { loginUser, loadHouseholdPeople, leaveReturnCode, restoreOwnerWithReturnCode, restoreWithRecoveryCode, refreshEmailVerified } from '../../services/firebase';

jest.mock('../../services/appLock', () => ({ isLockAvailable: jest.fn(() => Promise.resolve(true)), authenticate: jest.fn(() => Promise.resolve(true)) }));

const FILE = 'MoneyKeel/documents/other/moneykeel_pres_mock_owner-back-in-by-return-code_v01.html';
const drawn = (key: string) => drawnStream(FILE, key).replace(CHROME_TOP, '').replace(CHROME_TABS, '');
const built = () => { let s = streamOf(renderedLines(screen.toJSON())); for (const r of SETTINGS_ROWS_NOT_DRAWN) s = s.replace(r, ''); return s; };
const same = (d: string, b: string) => { if (d !== b) throw new Error(streamBreak(d, b)); };
const NOV14 = new Date(2026, 10, 14, 12).getTime();

beforeEach(() => {
  jest.clearAllMocks();
  (refreshEmailVerified as jest.Mock).mockResolvedValue(true);
});
afterEach(() => jest.restoreAllMocks());

async function samSettings() {
  (loadHouseholdPeople as jest.Mock).mockResolvedValue({ role: 'member', owner: 'pat', ownerName: 'Pat', joinedAt: NOV14 });
  useStore.setState({ user: { uid: 'sam', email: 'sam@email.com', name: 'Sam Rivera' }, householdId: 'pat', budgetFrequency: 'monthly', payFrequency: 'biweekly', hideBalances: false } as any);
  render(<SettingsScreen />);
  await waitFor(() => screen.getByText('You share Pat’s household'));
}

describe('phone 1 — Settings, Sam’s phone (the member)', () => {
  test('state A: the Household box after Security — whose household, since when, and “Make a return code for Pat”', async () => {
    await samSettings();
    same(drawn('STATE A'), built());
  });

  test('state B: the return code in the recovery code’s box, lasting 7 days to Nov 27, 2026', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date(2026, 10, 20, 9, 41).getTime());
    (leaveReturnCode as jest.Mock).mockResolvedValue('M4TX-9QLB-2HRE-W7KD-C3NP');
    await samSettings();
    fireEvent.press(screen.getByText('Make a return code for Pat'));
    await waitFor(() => screen.getByTestId('return-code-sheet'));
    expect(leaveReturnCode).toHaveBeenCalledWith('pat');
    const d = drawn('STATE B');
    const sheet = d.slice(d.indexOf('Return code for Pat'));
    same(sheet, streamOf(renderedLines(screen.getByTestId('return-code-sheet'))));
    const b = built();   // the sheet opens over the box it came from
    same(d.slice(0, d.indexOf(' Return code for Pat')), b.slice(b.indexOf('Household P'), b.indexOf(' Return code for Pat')));
  });
});

async function patNeedsRecovery(member: string | null) {
  (loginUser as jest.Mock).mockResolvedValue({ user: { uid: 'pat', metadata: {} }, needsRecovery: true });
  (loadHouseholdPeople as jest.Mock).mockResolvedValue(member ? { role: 'owner', memberUid: 'sam', memberName: member, joinedAt: NOV14 } : { role: 'solo' });
  useStore.setState({ user: null } as any);
  render(<AuthScreen />);
  fireEvent.changeText(screen.getByPlaceholderText('you@email.com'), 'pat@email.com');
  fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'new-pass-1');
  fireEvent.press(screen.getByText('Sign in'));
  await waitFor(() => screen.getByText('Restore your data'));
  await waitFor(() => expect(loadHouseholdPeople).toHaveBeenCalledWith('pat', null));
}
/** the pop-up alone, from the logo's tagline (which the drawing draws behind it) */
const popUp = () => {
  const lines = renderedLines(screen.toJSON());
  const from = lines.findIndex((l) => l === 'Restore your data' || /^Use .* return code$/.test(l));
  const to = lines.indexOf('Your finance command center');
  return streamOf(['Your finance command center', ...lines.slice(from, to)]);
};

describe('phone 2 — “Restore your data”, Pat’s phone (the owner)', () => {
  test('state C: the door “I have a return code from Sam ›” under Restore my data', async () => {
    await patNeedsRecovery('Sam');
    await waitFor(() => screen.getByText('I have a return code from Sam ›'));
    same(drawnStream(FILE, 'STATE C'), popUp());
  });

  test('state C, a solo account: today’s pop-up, no door', async () => {
    await patNeedsRecovery(null);
    expect(screen.queryByText(/return code from/)).toBeNull();
  });

  test('state D: “Use Sam’s return code” — where Sam finds it, and the way back to the recovery code', async () => {
    await patNeedsRecovery('Sam');
    fireEvent.press(await screen.findByText('I have a return code from Sam ›'));
    fireEvent.changeText(screen.getByLabelText('Return code'), 'M4TX-9QLB-2HRE-W7KD-C3NP');
    same(drawnStream(FILE, 'STATE D'), popUp());
  });

  test('state E: a return code that does not open the data — the refusal, nothing saved, no new recovery code', async () => {
    (restoreOwnerWithReturnCode as jest.Mock).mockRejectedValue(new Error('That return code is incorrect.'));
    await patNeedsRecovery('Sam');
    fireEvent.press(await screen.findByText('I have a return code from Sam ›'));
    fireEvent.changeText(screen.getByLabelText('Return code'), 'M4TX-9QLB-2HRE-W7KD-C3NQ');
    fireEvent.press(screen.getByText('Restore my data'));
    await waitFor(() => screen.getByText('This return code does not open the household’s data. Check it with Sam, or ask Sam to make a new one.'));
    same(drawnStream(FILE, 'STATE E'), popUp());
    expect((useStore.getState() as any).pendingRecoveryCode ?? null).toBeNull();
    expect(router.replace).not.toHaveBeenCalledWith('/(tabs)/home');
  });

  test('behaviour: the return code gets Pat back in — re-locked under the new password, a new recovery code shown, Home', async () => {
    (restoreOwnerWithReturnCode as jest.Mock).mockResolvedValue('H2WN-7FKC-QX4M-R9TB-L6DS');
    await patNeedsRecovery('Sam');
    fireEvent.press(await screen.findByText('I have a return code from Sam ›'));
    fireEvent.changeText(screen.getByLabelText('Return code'), 'M4TX-9QLB-2HRE-W7KD-C3NP');
    fireEvent.press(screen.getByText('Restore my data'));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/(tabs)/home'));
    expect(restoreOwnerWithReturnCode).toHaveBeenCalledWith('M4TX-9QLB-2HRE-W7KD-C3NP', 'new-pass-1');
    expect(restoreWithRecoveryCode).not.toHaveBeenCalled();
    expect((useStore.getState() as any).pendingRecoveryCode).toBe('H2WN-7FKC-QX4M-R9TB-L6DS');
    expect((useStore.getState() as any).pendingRecoveryReturnedBy).toBe('Sam');
    useStore.setState({ pendingRecoveryCode: null, pendingRecoveryReturnedBy: null } as any);
  });

  test('“‹ Use the recovery code instead” goes back to today’s pop-up', async () => {
    await patNeedsRecovery('Sam');
    fireEvent.press(await screen.findByText('I have a return code from Sam ›'));
    fireEvent.press(screen.getByText('‹ Use the recovery code instead'));
    expect(screen.getByText('Restore your data')).toBeTruthy();
  });
});

describe('phone 3 — Save your recovery code, Pat’s phone', () => {
  test('state F: the first sentence says the data is back and the old recovery code no longer works', () => {
    render(<RecoveryCodeModal visible code="H2WN-7FKC-QX4M-R9TB-L6DS" returnedBy="Sam" onDone={() => {}} />);
    fireEvent.press(screen.getByLabelText('I’ve saved my recovery code somewhere safe'));
    // the drawing draws the box ticked: the tick is the app's ✓ inside the box
    same(drawnStream(FILE, 'STATE F'), streamOf(renderedLines(screen.toJSON())));
  });

  test('without a return code the screen reads exactly as built', () => {
    render(<RecoveryCodeModal visible code="H2WN-7FKC-QX4M-R9TB-L6DS" onDone={() => {}} />);
    expect(screen.getByText(/Save it now/)).toBeTruthy();
    expect(screen.queryByText(/return code/)).toBeNull();
  });
});
