// CONTRIBUTION ROOM, HELD TO ITS DRAWING — MoneyKeel/documents/cashflow/moneykeel_pres_mock_contribution-room_v01.html, states
// A to E (2026-10-25, FIX-ROOM). Every sentence the drawing prints for a state is read off the rendered screen, in the drawing's
// words, on the drawing's day (25 October 2026, three months left). The figures are MK-CF-O-005 theContributionRoom's.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ContributionRoomScreen from '../ContributionRoomScreen';
import { useStore } from '../../store/useStore';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, Link: ({ children }: any) => children,
}));

const DAY = new Date(2026, 9, 25, 12);
beforeEach(() => {
  jest.useFakeTimers({ now: DAY, doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'queueMicrotask'] });
  useStore.getState().resetAll();
});
afterEach(() => { jest.useRealTimers(); });
const open = (profile: Record<string, any>) => {
  useStore.setState({ hideBalances: false, onboardingProfile: profile, onboardingComplete: true } as any);
  return render(<ContributionRoomScreen />);
};
const words = (re: RegExp | string) => expect(screen.getByText(re)).toBeOnTheScreen();

test('A · the usual: the year at the monthly amount, said as a plan — "room for $21,350"', () => {
  open({ birthYear: '1965', c_401k: '1200', c_roth: '300', c_hsa: '150', medicareEnrolled: 'no' });
  words('How much more you can still put into tax-advantaged accounts this year. Limits are set by the IRS for your age (61).');
  words('room for $21,350');
  words('At $1,200/month you will put in $14,400 this year — room for $21,350 more. Calculated from the monthly amount you entered — check it against your latest statement. (Includes the age 60–63 catch-up.)');
  words('Try it in a what-if — about $7,100/month ›');
  words('room for $5,000');
  words('At $300/month you will put in $3,600 this year — room for $5,000 more. Calculated from the monthly amount you entered — check it against your latest statement. (Includes the age-50+ catch-up.)');
  words('up to $5,400');
  words('The 2026 limit is $5,400. (Includes the age-55+ catch-up.)');
  expect(screen.queryByText(/left$/)).toBeNull();
  expect(screen.queryByText(/That is about/)).toBeNull();
});

test('B · over the limit: "$4,250 over", and what the law does with the excess — never cut to the limit', () => {
  open({ birthYear: '1966', c_401k: '3333.33', c_roth: '800' });
  words('$4,250 over');
  words('At $3,333/month you will put in $40,000 this year — $4,250 over the $35,750 limit. Money over the limit has to come out by April 15 next year, or it is taxed twice. Calculated from the monthly amount you entered — check it against your latest statement. (Includes the age 60–63 catch-up.)');
  words('$1,000 over');
  words('At $800/month you will put in $9,600 this year — $1,000 over the $8,600 limit. Money over the limit has to come out by your tax-filing deadline, or it is taxed 6% for each year it stays. Calculated from the monthly amount you entered — check it against your latest statement. (Includes the age-50+ catch-up.)');
  expect(screen.queryByText(/Try it in a what-if/)).toBeNull();   // no room to fill
});
test.failing('B · the screen until 2026-10-25, pinned: "$0 left" and "about $35,750 of the $35,750 limit" — no longer its words (FIXED 2026-10-25)', () => {
  open({ birthYear: '1966', c_401k: '3333.33' });
  words(/That is about \$35,750 of the \$35,750 limit/);
});

test('C · no birth year: the limits say they are the base ones, and the year can be entered right here', () => {
  open({ c_401k: '1000' });
  words('How much more you can still put into tax-advantaged accounts this year. Limits are set by the IRS. Your birth year is not entered, so each limit below is the one before any catch-up.');
  words('Your birth year');
  words('room for $12,500');
  words('At $1,000/month you will put in $12,000 this year — room for $12,500 more. Calculated from the monthly amount you entered — check it against your latest statement.');
  words('Try it in a what-if — about $4,200/month ›');
  words('up to $7,500');
  words('up to $4,400');
  // typing the year moves every limit to the person's age at once — the same answer sign-up asks for (MK-XS-I-017)
  fireEvent.changeText(screen.getByLabelText('Your birth year'), '1976');
  expect((useStore.getState() as any).onboardingProfile.birthYear).toBe('1976');
  words('room for $20,500');
  words('up to $8,600');
  expect(screen.queryByText(/Your birth year is not entered/)).toBeNull();
});

test('D · 66, enrolled in Medicare from July 2026: $5,400 × 6 ÷ 12 = $2,700, and the month can be picked', () => {
  open({ birthYear: '1960', medicareEnrolled: 'yes', medicareStart: '2026-07' });
  words('How much more you can still put into tax-advantaged accounts this year. Limits are set by the IRS for your age (66).');
  words('up to $32,500');
  words('The 2026 limit is $32,500. (Includes the age-50+ catch-up.)');
  words('Try it in a what-if — about $10,800/month ›');
  words('up to $8,600');
  words('up to $2,700');
  words('The 2026 limit is $2,700. (Includes the age-55+ catch-up.)');
  words('You are enrolled in Medicare from July 2026, so HSA money counts for January to June only: $5,400 × 6 ÷ 12 = $2,700 (IRS Publication 969).');
  words('When did your Medicare start?');
  for (const c of ['Before 2026', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']) words(c);
  expect(screen.getByLabelText('July 2026').props.accessibilityState).toEqual({ selected: true });
  // picking "Before 2026" takes it to $0, stored as the answer
  fireEvent.press(screen.getByLabelText('Before 2026'));
  expect((useStore.getState() as any).onboardingProfile.medicareStart).toBe('before-2026');
  words('up to $0');
  words('You are enrolled in Medicare, so no HSA contribution is allowed this year (IRS Publication 969). Not enrolled? Update it below.');
});
test('D · enrolled with no month picked: $0 (his G10), and the month is asked for', () => {
  open({ birthYear: '1960', medicareEnrolled: 'yes' });
  words('up to $0');
  words('You are enrolled in Medicare, so no HSA contribution is allowed from its first month (IRS Publication 969). If it began this year, pick the month below — the months before it still count.');
  fireEvent.press(screen.getByLabelText('July 2026'));
  words('up to $2,700');
});
test.failing('D · the screen until 2026-10-25, pinned: enrolled from July read $0 for the whole year — no longer its answer (FIXED 2026-10-25)', () => {
  open({ birthYear: '1960', medicareEnrolled: 'yes', medicareStart: '2026-07' });
  words('up to $0');
});

test('E · the first day: nothing entered — every card reads "up to" its base limit', () => {
  open({});
  words('up to $24,500');
  words('The 2026 limit is $24,500.');
  words('Try it in a what-if — about $8,200/month ›');
  words('up to $7,500');
  words('up to $4,400');
  words('Your birth year');
  expect(screen.queryByText(/a month you will put in/)).toBeNull();
});
test.failing('E · the screen until 2026-10-25, pinned: "$24,500 left" and "about $0 of the $24,500 limit" for a person who had entered nothing (FIXED 2026-10-25)', () => {
  open({});
  words('$24,500 left');
});

// ONE EXCESS ON BOTH SCREENS (agreement, tenet 4): sign-up's 401(k) step says "over the 2026 limit by $X" for the same person;
// it works the difference itself (src/onboarding/modules.tsx, income_401k), so this pins it to MK-CF-F-056 k401Headroom's excess.
test('agreement: sign-up\'s "over the 2026 limit by $4,250" is Contribution room\'s "$4,250 over" — one excess', () => {
  const { renderStep } = require('../../onboarding/modules');
  const { theContributionRoom } = require('../../../MoneyKeel/functions/cashflow/contribution-room');
  const person = { status: 'employed', birthYear: '1966', c_401k: '3333.33' };
  const r = render(<>{renderStep('income_401k', { status: 'employed', tracks: [], answers: person, setAnswer: jest.fn() } as any)}</>);
  const excess = theContributionRoom({ profile: person, today: DAY }).k401.excess;
  expect(screen.getByText(new RegExp(`over the 2026 limit by \\$${Math.round(excess).toLocaleString('en-US')}$`))).toBeOnTheScreen();   // money-mask-ok: test expectation, never rendered
  r.unmount();
  open(person);
  words(`$${Math.round(excess).toLocaleString('en-US')} over`);   // money-mask-ok: test expectation, never rendered
  expect(Math.round(excess)).toBe(4_250);
});
