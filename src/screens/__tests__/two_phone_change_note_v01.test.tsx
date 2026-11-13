/** THE NOTE WHEN ONE ITEM WAS CHANGED ON TWO PHONES — held to its drawing (two-phone change note v01, 2026-11-12, cloud copy R9;
 *  his confirmation form, DEC-10471).
 *
 *  The drawing: MoneyKeel/documents/cashflow/moneykeel_pres_mock_two-phone-change-note_v01.html — Cash flow · Expenses on Pat's
 *  phone, back online on Aug 20, 2026 at 10:31: state A the note waiting under Grocery, state B after "Keep $950/month". Below and
 *  above the note each state is cash-flow v01 frame C as approved, which cashflow_matches_v01 holds word for word; so this file
 *  holds PLANNED EXPENSES exactly as drawn, and that the note adds its words under Grocery and nothing else moves.
 *  The household is the approved drawing's (cashflowDrawing.ts), Grocery changed from $900: Sam's phone $950 at 10:20 (kept, the
 *  later), Pat's $1,000 at 10:00 offline (the note). $200 + $950 + $200 + $700 = $2,050; with $1,000, $2,100.
 *  Behaviour: Keep leaves the budget as it is and gives way to one quiet line; "Change ›" brings the note back; "Change to
 *  $1,000/month" saves Pat's value as a new change; Sam's phone, whose change counted, shows nothing.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import CashFlowScreen from '../CashFlowScreen';
import { renderedLines } from '../../testing/drawnLines';
import { drawnStream, streamOf, streamBreak } from '../../testing/stateLines';
import * as H from '../../testing/cashflowDrawing';
import { useStore } from '../../store/useStore';
import { loadHouseholdPeople } from '../../services/firebase';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }), useLocalSearchParams: () => ({}),
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

const FILE = 'MoneyKeel/documents/cashflow/moneykeel_pres_mock_two-phone-change-note_v01.html';
// Other stays $700, as the drawing's arithmetic keeps it: the typed monthly total moves with Grocery
const withGrocery = (amount: number) => ({ ...H.WORKER, ...H.BUDGET_BY_CATEGORY, monthlySpending: String(1100 + amount),
  spendCats: H.BUDGET_BY_CATEGORY.spendCats.map((c) => (c.id === 'grocery' ? { ...c, amount } : c)) });
const NOTE = { item: 'onboardingProfile', kept: withGrocery(950), other: withGrocery(1000),
  otherAt: new Date(2026, 7, 20, 10, 0).toISOString(), keptAt: new Date(2026, 7, 20, 10, 20).toISOString(), at: new Date(2026, 7, 20, 10, 31).toISOString(), lost: true };

beforeEach(() => {
  jest.useFakeTimers({ now: H.DRAWN_NOW, doNotFake: [...H.ONLY_THE_CLOCK] });
  (loadHouseholdPeople as jest.Mock).mockResolvedValue({ role: 'owner', memberUid: 'sam', memberName: 'Sam', joinedAt: null });
});
afterEach(() => { jest.useRealTimers(); });

function patsPhone(notes: any[]) {
  H.householdWithData();
  useStore.setState({ user: { uid: 'pat', email: 'pat@email.com', name: 'Pat Rivera' }, onboardingProfile: withGrocery(950),
    profileSync: { owner: 'pat', base: {}, pending: {}, notes } } as any);
  render(<CashFlowScreen />);
  fireEvent.press(screen.getByLabelText(/^Expenses tab/));
}
const built = () => streamOf(renderedLines(screen.toJSON()));
const planned = (s: string) => s.slice(s.indexOf('Planned expenses $2,050'), s.indexOf('= Total $2,050') + '= Total $2,050'.length);
const plannedBuilt = (s: string) => s.slice(s.indexOf('PLANNED EXPENSES $2,050'), s.indexOf('= Total $2,050') + '= Total $2,050'.length).replace('PLANNED EXPENSES', 'Planned expenses');
const same = (d: string, b: string) => { if (d !== b) throw new Error(streamBreak(d, b)); };

test('state A: the note under Grocery — his confirmation form, the two choices with what each makes, and nothing is lost', async () => {
  patsPhone([NOTE]);
  await waitFor(() => screen.getByText(/The information from Sam’s phone/));
  same(planned(drawnStream(FILE, 'STATE A')), plannedBuilt(built()));
});

test('state A: the note adds its words under Grocery and nothing else on the screen moves', async () => {
  patsPhone([]);
  const without = built();
  screen.unmount();
  patsPhone([NOTE]);
  await waitFor(() => screen.getByText(/The information from Sam’s phone/));
  const d = drawnStream(FILE, 'STATE A');
  const note = d.slice(d.indexOf('Grocery was changed'), d.indexOf(' Utilities $200'));
  same(without.replace('Grocery $950 ', `Grocery $950 ${note} `), built());
});

test('state B: after “Keep $950/month” — one quiet line, Sam’s change of Aug 20 at 10:20, with “Change ›”; the budget is as it was', async () => {
  patsPhone([NOTE]);
  await waitFor(() => screen.getByText(/The information from Sam’s phone/));
  fireEvent.press(screen.getByText('Keep $950/month'));
  same(planned(drawnStream(FILE, 'STATE B')), plannedBuilt(built()));
  expect((useStore.getState() as any).onboardingProfile.spendCats.find((c: any) => c.id === 'grocery').amount).toBe(950);
  fireEvent.press(screen.getByText('Change ›'));
  expect(screen.getByText('Grocery was changed on two phones')).toBeTruthy();
});

test('“Change to $1,000/month” saves Pat’s value as a new change: Planned expenses become $2,100, and the note is gone', async () => {
  patsPhone([NOTE]);
  await waitFor(() => screen.getByText(/The information from Sam’s phone/));
  await act(async () => { fireEvent.press(screen.getByText('Change to $1,000/month')); });
  expect((useStore.getState() as any).onboardingProfile.spendCats.find((c: any) => c.id === 'grocery').amount).toBe(1000);
  expect(screen.queryByText('Grocery was changed on two phones')).toBeNull();
  expect(built()).toContain('PLANNED EXPENSES $2,100');
});

test('Sam’s phone, whose change counted, shows nothing; and the same person on two phones reads “your other phone”', async () => {
  patsPhone([{ ...NOTE, lost: undefined }]);
  expect(screen.queryByText('Grocery was changed on two phones')).toBeNull();
  screen.unmount();
  (loadHouseholdPeople as jest.Mock).mockResolvedValue({ role: 'solo' });
  patsPhone([NOTE]);
  await waitFor(() => screen.getByText(/The information from your other phone indicates Grocery \$950\/month, set Aug 20 at 10:20; you entered \$1,000\/month on this phone at 10:00/));
});
