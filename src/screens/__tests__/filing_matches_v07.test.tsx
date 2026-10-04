/** HOW DO YOU FILE YOUR TAXES? AGAINST ITS APPROVED DRAWING, WORD FOR WORD (income-end-to-end_v07,
 *  frames 4a to 4c — phones 13 to 15; approved 2026-09-02 as v06). Method and limits:
 *  src/testing/mockMatch.ts.
 *
 *  All three phones are the onboarding frame and each is held whole.
 *
 *  WHICH DRAWING. A second file, `filing-status-question_v03`, draws the same three phones. It is a
 *  wording sweep (2026-09-26) of v02, approved 2026-08-27; v06 of this drawing was approved later
 *  (2026-09-02) and is the design. Where they differ the screen follows this one: v03 still tells the
 *  customer "The app cannot take a spouse’s income yet" — untrue since the two-earner build of
 *  2026-09-01 — and offers "Not sure — use Single for now", which v06 dropped. Retiring v03 is a
 *  workplan row; it is named by three gates and by decisions of his, so it is not moved in passing.
 *
 *  A FIGURE THE DRAWING COULD NOT KNOW: phone 15's "…and both of you over 65 — $5,324/year" was
 *  worked before the senior deduction was ruled (G3, 2026-09-08). The screen shows what the tax
 *  tables give today; the two figures the drawing's arithmetic still supports are asserted by value.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import FilingStatusScreen from '../FilingStatusScreen';
import { useStore } from '../../store/useStore';
import { norm, drawingLines, builtLines, firstDifference } from '../../testing/mockMatch';
import { TAX_TABLES } from '../../domain/income/tax';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), router: { push: jest.fn(), back: jest.fn() },
}));

const LINES = drawingLines('MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html', [/<svg[\s\S]*?<\/svg>/g]);
const STARTS = LINES.map((l, i) => (l === '9:41' ? i : -1)).filter((i) => i >= 0);
const phone = (n: number, last: RegExp): string[] => {
  const seg = LINES.slice(STARTS[n - 1], STARTS[n] ?? LINES.length).filter((l) => !['9:41', '▮▮▮ ⌁'].includes(l));
  const end = seg.findIndex((l) => last.test(l));
  expect(end).toBeGreaterThan(3);
  return seg.slice(0, end + 1);
};
const show = (op: any) => {
  useStore.getState().resetAll();
  useStore.setState({ onboardingProfile: op, onboardingComplete: true, hideBalances: false } as any);
  render(<FilingStatusScreen frame="onboarding" />);
};
const built = () => norm(builtLines(screen.toJSON()));
const AGE_67 = String(new Date().getFullYear() - 67);

test('the drawing still has its seventeen phones — the guard proves it looked', () => { expect(STARTS).toHaveLength(17); });

test('phone 13 · they said "just me" — pre-answered as Single, and it says why', () => {
  show({ hasPartner: 'no' });
  const want = norm(phone(13, /^Continue$/));
  expect(want.split(' ').length).toBeGreaterThan(40);
  expect(firstDifference(want, built())).toBe('');
});

test('phone 14 · they have a spouse — jointly, named, and who is 65 or older', () => {
  show({ hasPartner: 'yes', partnerName: 'Sam', birthYear: AGE_67 });
  const want = norm(phone(14, /^Continue$/));
  expect(want.split(' ').length).toBeGreaterThan(80);
  expect(firstDifference(want, built())).toBe('');
  // the amount in the sentence is the tax table's own, so the two cannot drift apart
  expect(TAX_TABLES.married.over65Add).toBe(1650);
  expect(screen.getByText(/\$1,650 each on a joint return/)).toBeOnTheScreen();
});

test('phone 15 · what it changes — shown once, right after the answer', () => {
  show({ hasPartner: 'yes', partnerName: 'Sam', baseSalary: '7000', salaryFreq: 'monthly' });
  fireEvent.press(screen.getByLabelText('Continue'));
  const want = norm(phone(15, /^Got it$/));
  expect(want.split(' ').length).toBeGreaterThan(50);
  expect(firstDifference(want, built())).toBe('');
  const lines = builtLines(screen.toJSON());
  expect(lines).toContain('On the $84,000 you entered');
  expect(lines).toContain('$9,650/year — what we were assuming');        // single, on $84,000
  expect(lines).toContain('$5,720/year');                                // married filing jointly
  expect(lines).toContain('$328/month more');                            // ($9,650 − $5,720) ÷ 12
});

test('the bracket line is said only while one wage is entered — with two it would be untrue', () => {
  show({ hasPartner: 'yes', partnerName: 'Sam', baseSalary: '7000', salaryFreq: 'monthly', whoEarns: 'both', partnerWage: { baseSalary: '4500', salaryFreq: 'monthly' } });
  fireEvent.press(screen.getByLabelText('Continue'));
  expect(screen.getByText('That changes your take-home')).toBeOnTheScreen();
  expect(screen.queryByText('Your tax bracket is calculated from your income only.')).toBeNull();
});
