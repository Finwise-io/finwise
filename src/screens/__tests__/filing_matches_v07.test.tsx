/** HOW DO YOU FILE YOUR TAXES? AGAINST ITS APPROVED DRAWING, WORD FOR WORD (income-end-to-end_v07,
 *  frames 4a to 4c — phones 13 to 15; approved 2026-09-02 as v06). Method and limits:
 *  src/testing/mockMatch.ts.
 *
 *  All three phones are the onboarding frame and each is held whole.
 *
 *  REBUILT 2026-10-25 (CF-MMFIX-B, the drawing check's weak guard): every figure and mark is compared as printed
 *  (`normPrinted`) — figures were a "$#" token — and each change a dated row makes is applied by name (`applyNamed`).
 *  The ONE PHONE for this screen is this drawing's 13 to 15: filing-status-question_v03 carries a dated row naming it (IN-16).
 *
 *  WHICH DRAWING. A second file, `filing-status-question_v03`, draws the same three phones. It is a
 *  wording sweep (2026-09-26) of v02, approved 2026-08-27; v06 of this drawing was approved later
 *  (2026-09-02) and is the design. Where they differ the screen follows this one: v03 still tells the
 *  customer "The app cannot take a spouse’s income yet" — untrue since the two-earner build of
 *  2026-09-01 — and offers "Not sure — use Single for now", which v06 dropped. Retiring v03 is a
 *  workplan row; it is named by three gates and by decisions of his, so it is not moved in passing.
 *
 *  A FIGURE THE DRAWING COULD NOT KNOW: phone 15's "…and both of you over 65 — $5,324/year" was
 *  worked before the senior deduction was ruled (G3, 2026-09-08). By hand, today's tables: $84,000 − $32,200 − 2 × $1,650 −
 *  2 × $6,000 = $36,500; 10% × $24,800 + 12% × $11,700 = $3,884. The month's figures are the printed take-homes' difference
 *  (READ THIS FIRST 2026-10-24): $6,523 − $6,196 = $327 (drawn $328), and both over 65 $480 (drawn $361).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import FilingStatusScreen from '../FilingStatusScreen';
import { useStore } from '../../store/useStore';
import { normPrinted, drawingLines, builtLinesWithBoxes, firstDifference, applyNamed } from '../../testing/mockMatch';
import { TAX_TABLES } from '../../domain/income/tax';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), router: { push: jest.fn(), back: jest.fn() },
}));

// drawingLines writes the entity &rsquo; as a straight mark; this drawing's phones use the curly one throughout (2026-10-25)
const LINES = drawingLines('MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html', [/<svg[\s\S]*?<\/svg>/g])
  .map((l) => l.replace(/'/g, '’'));
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
const built = () => normPrinted(builtLinesWithBoxes(screen.toJSON()));
const AGE_67 = String(new Date().getFullYear() - 67);

test('the drawing still has its seventeen phones — the guard proves it looked', () => { expect(STARTS).toHaveLength(17); });

test('phone 13 · they said "just me" — pre-answered as Single, and it says why', () => {
  show({ hasPartner: 'no' });
  const want = normPrinted(phone(13, /^Continue$/));
  expect(want.split(' ').length).toBeGreaterThan(40);
  expect(firstDifference(want, built())).toBe('');
});

test('phone 14 · they have a spouse — jointly, named, and who is 65 or older', () => {
  show({ hasPartner: 'yes', partnerName: 'Sam', birthYear: AGE_67 });
  const want = normPrinted(phone(14, /^Continue$/));
  expect(want.split(' ').length).toBeGreaterThan(80);
  expect(firstDifference(want, built())).toBe('');
  // the amount in the sentence is the tax table's own, so the two cannot drift apart
  expect(TAX_TABLES.married.over65Add).toBe(1650);
});

test('phone 15 · what it changes — shown once, right after the answer, every figure as printed', () => {
  // THE HOUSEHOLD THE PHONE'S WORDS ARE TRUE OF (2026-10-24, E2E-79): "Taxed as single … what we were assuming" holds where the
  // app was taxing them as single — one person, who now files jointly. A spouse entered with no status on record is already
  // taxed jointly (filingStatusOf), so for them nothing moves and this phone is not shown.
  show({ hasPartner: 'no', baseSalary: '7000', salaryFreq: 'monthly' });
  fireEvent.press(screen.getByLabelText('Married filing jointly'));
  fireEvent.press(screen.getByLabelText('Continue'));
  const want = applyNamed(normPrinted(phone(15, /^Got it$/)), [
    ['…and both of you over 65 $5,324/year', '…and both of you over 65 $3,884/year', 'G3 (2026-09-08): the senior deduction, $6,000 each'],
    ['$328/month more', '$327/month more', 'READ THIS FIRST 2026-10-24: $6,523 − $6,196 as printed'],
    ['— $361 if you are both over 65.', '— $480 if you are both over 65.', 'READ THIS FIRST 2026-10-24'],
  ]);
  expect(want.split(' ').length).toBeGreaterThan(50);
  // by hand: single, $84,000 − $16,100 = $67,900 → $1,240 + $4,560 + 22% × $17,500 = $9,650; jointly, $84,000 − $32,200 =
  // $51,800 → $2,480 + 12% × $27,000 = $5,720
  expect(firstDifference(want, built())).toBe('');
});

test('the bracket line is said only while one wage is entered — with two it would be untrue', () => {
  // two earners who had answered Single, now filing jointly (with no answer on record they are already taxed jointly — E2E-79)
  show({ hasPartner: 'yes', partnerName: 'Sam', filingStatus: 'single', baseSalary: '7000', salaryFreq: 'monthly', whoEarns: 'both', partnerWage: { baseSalary: '4500', salaryFreq: 'monthly' } });
  fireEvent.press(screen.getByLabelText('Married filing jointly'));
  fireEvent.press(screen.getByLabelText('Continue'));
  expect(screen.getByText('That changes your take-home')).toBeOnTheScreen();
  expect(screen.queryByText('Your tax bracket is calculated from your income only.')).toBeNull();
});
