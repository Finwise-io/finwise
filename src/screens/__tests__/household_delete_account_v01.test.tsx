/** DELETE ACCOUNT WITH A SPOUSE IN THE HOUSEHOLD — held to its drawing, state by state, word for word (2026-11-12, cloud copy R16).
 *
 *  The drawing: MoneyKeel/documents/other/moneykeel_pres_mock_delete-account-household_v01.html — one phone, Settings: A the owner
 *  with a spouse, B the alert, C the pop-up, D the spouse deleting, E a solo first day, F its pop-up. Each state's words, in order
 *  out of the drawing, must be the rendered words in order. Read as one, not a difference: the MoneyKeel bar and the tab bar are the
 *  navigator's; rows built before the drawing that it leaves out are named in SETTINGS_ROWS_NOT_DRAWN; states B to F draw Settings
 *  scrolled to the Household box with the alert or pop-up over it, so those are compared box first, then the alert or pop-up.
 *  Behaviour: delete warns with the member's name, before the password is typed.
 */
import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import SettingsScreen from '../SettingsScreen';
import { renderedLines } from '../../testing/drawnLines';
import { drawnStream, streamOf, streamBreak, SETTINGS_ROWS_NOT_DRAWN, CHROME_TOP, CHROME_TABS } from '../../testing/stateLines';
import { useStore } from '../../store/useStore';
import { loadHouseholdPeople, refreshEmailVerified, deleteAccount } from '../../services/firebase';

jest.mock('../../services/appLock', () => ({ isLockAvailable: jest.fn(() => Promise.resolve(true)), authenticate: jest.fn(() => Promise.resolve(true)) }));

const FILE = 'MoneyKeel/documents/other/moneykeel_pres_mock_delete-account-household_v01.html';
const NOV14 = new Date(2026, 10, 14, 12).getTime();
const drawn = (key: string) => drawnStream(FILE, key).replace(CHROME_TOP, '').replace(CHROME_TABS, '');
const built = () => { let s = streamOf(renderedLines(screen.toJSON())); for (const r of SETTINGS_ROWS_NOT_DRAWN) s = s.replace(r, ''); return s; };
const same = (d: string, b: string) => { if (d !== b) throw new Error(streamBreak(d, b)); };
/** the Household box's words as rendered */
const box = () => { const b = built(); return b.slice(b.indexOf('Household '), b.indexOf(' Account ⚙️')); };

const PEOPLE: Record<string, any> = {
  pat: { user: { uid: 'pat', email: 'pat@email.com', name: 'Pat Rivera' }, householdId: null, people: { role: 'owner', memberUid: 'sam', memberName: 'Sam', joinedAt: NOV14 } },
  sam: { user: { uid: 'sam', email: 'sam@email.com', name: 'Sam Rivera' }, householdId: 'pat', people: { role: 'member', owner: 'pat', ownerName: 'Pat', joinedAt: NOV14 } },
  alex: { user: { uid: 'alex', email: 'alex@email.com', name: 'Alex Johnson' }, householdId: null, people: { role: 'solo' } },
};
let alerts: { title: string; message: string; buttons: any[] }[] = [];
beforeEach(() => {
  jest.clearAllMocks();
  alerts = [];
  (refreshEmailVerified as jest.Mock).mockResolvedValue(true);
  jest.spyOn(Alert, 'alert').mockImplementation((title: any, message: any, buttons: any) => { alerts.push({ title, message, buttons: buttons ?? [] }); });
});
afterEach(() => jest.restoreAllMocks());

async function settingsOf(who: 'pat' | 'sam' | 'alex') {
  const p = PEOPLE[who];
  (loadHouseholdPeople as jest.Mock).mockResolvedValue(p.people);
  // the drawing's account: ruled hidden balances off, as on every Settings phone
  useStore.setState({ user: p.user, householdId: p.householdId, budgetFrequency: 'monthly', payFrequency: 'biweekly', hideBalances: false } as any);
  render(<SettingsScreen />);
  await waitFor(() => screen.getByText(who === 'pat' ? 'Sam shares your household' : who === 'sam' ? 'You share Pat’s household' : 'Invite your spouse'));
}
/** the alert as the phone draws it: title, message, its buttons */
const alertWords = () => { const a = alerts[alerts.length - 1]; return streamOf([a.title, a.message, ...a.buttons.map((b) => b.text)]); };
const openPopUp = () => { fireEvent.press(screen.getByLabelText('Delete account')); alerts[alerts.length - 1].buttons.find((b) => b.text === 'Continue').onPress(); };
const popUpWords = () => streamOf(renderedLines(screen.toJSON())).replace(/^.*?(?=Confirm account deletion)/, '').replace(/ 💡 Share feedback.*$/, '');

test('state A: Pat’s Settings — the Household box after Security names Sam and since when', async () => {
  await settingsOf('pat');
  same(drawn('STATE A'), built());
});

test('state B: the alert names Sam and says the household’s data stays with Sam', async () => {
  await settingsOf('pat');
  fireEvent.press(screen.getByLabelText('Delete account'));
  const d = drawn('STATE B');
  same(d.slice(0, d.indexOf(' Delete account?')), box());
  same(d.slice(d.indexOf('Delete account?')), alertWords());
});

test('state C: the pop-up — “⚠ Sam keeps the household” before the password, and the sentence without “and all its MoneyKeel data”', async () => {
  await settingsOf('pat');
  openPopUp();
  await waitFor(() => screen.getByTestId('delete-household-warning'));
  const d = drawn('STATE C');
  same(d.slice(0, d.indexOf(' Confirm account deletion')), box());
  same(d.slice(d.indexOf('Confirm account deletion')), popUpWords());
});

test('state D: Sam deletes instead — “⚠ The household stays with Pat”', async () => {
  await settingsOf('sam');
  openPopUp();
  await waitFor(() => screen.getByTestId('delete-household-warning'));
  const d = drawn('STATE D');
  // Sam's box also carries Sam's door to the return code (return code v01), which this drawing does not draw
  const b = box().replace(' 🔑 Make a return code for Pat If Pat has lost both the password and the recovery code, this code lets Pat back in. ›', '');
  same(d.slice(0, d.indexOf(' Confirm account deletion')), b);
  same(d.slice(d.indexOf('Confirm account deletion')), popUpWords());
});

test('state E: a solo first day — the box holds one door, “Invite your spouse ›”', async () => {
  await settingsOf('alex');
  same(drawn('STATE E'), built());
});

test('state F: a solo account’s pop-up reads exactly as built, no warning', async () => {
  await settingsOf('alex');
  fireEvent.press(screen.getByLabelText('Delete account'));
  expect(alertWords()).toBe('Delete account? This permanently deletes alex@email.com and all its MoneyKeel data from our servers. This cannot be undone. Cancel Continue');
  alerts[alerts.length - 1].buttons.find((b) => b.text === 'Continue').onPress();
  await waitFor(() => screen.getByText('Confirm account deletion'));
  expect(screen.queryByTestId('delete-household-warning')).toBeNull();
  const d = drawn('STATE F');
  same(d.slice(0, d.indexOf(' Confirm account deletion')), box());
  same(d.slice(d.indexOf('Confirm account deletion')), popUpWords());
});

test('“Invite your spouse ›” opens the invite step’s own card', async () => {
  await settingsOf('alex');
  fireEvent.press(screen.getByText('Invite your spouse'));
  await waitFor(() => screen.getByText('✉️ Create the two codes'));
  expect(screen.getByText('Invite your spouse (optional)')).toBeTruthy();
});

test('behaviour: the warning names the member before the password is typed, and delete then runs as before', async () => {
  (deleteAccount as jest.Mock).mockResolvedValue(undefined);
  await settingsOf('pat');
  openPopUp();
  await waitFor(() => screen.getByText('⚠ Sam keeps the household'));
  const lines = renderedLines(screen.toJSON());
  expect(lines.indexOf('⚠ Sam keeps the household')).toBeLessThan(lines.indexOf('Password for pat@email.com'));
  fireEvent.changeText(screen.getByLabelText('Password'), 'hunter2pass');
  fireEvent.press(screen.getByLabelText('Delete my account'));
  await waitFor(() => expect(deleteAccount).toHaveBeenCalledWith('hunter2pass'));
});
