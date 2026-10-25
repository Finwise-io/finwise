/** THE INCOME SCREENS AGAINST THEIR APPROVED DRAWING, WORD FOR WORD (income-end-to-end_v07, approved
 *  2026-09-02 as v06; v07 is its canon-word edition). Method and limits: src/testing/mockMatch.ts.
 *
 *  HELD HERE SO FAR: "Your income, all of it" — frames 16 (with data) and 17 (a fresh account).
 *  NOT YET HELD: the picker (1), Your base pay (2 to 8), bonus and stock (9), rent (10), interest and
 *  dividends (11), the income manager (12) and the filing question (13 to 15) — tracked on the workplan.
 *
 *  KNOWN DIFFERENCES on the summary, each named where it is applied:
 *  1. "‹ Back" heads the screen. The drawing predates the rule that every pushed screen carries the top
 *     bar and its way back (DEC-0354).
 *  2. A fresh account reads "$0" and "Nothing entered yet." with its door, in each of the two sections.
 *     The drawing's frame shows an em-dash and a sentence of its own in each; his empty-state ruling
 *     (Q48, 2026-09-09, built here on 2026-09-12) came a week after that frame was drawn (2026-09-02),
 *     and the newer ruling is the design. What the frame still decides is the SHAPE: both headings stay.
 *  3. 2026-10-24 (his DEC-0283; a dated READ THIS FIRST row on the drawing): under "= Gross /year" two rows the frame does not
 *     draw — "Your 401(k)s" with the year's contributions taken off, and "= What it is taxed on", the total the bracket and a
 *     calculated tax are worked on — and the band beside "What it is taxed on" shows that total. Frame 16's household, $14,400
 *     into 401(k)s: $167,400 − $14,400 = $153,000.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import IncomeSummaryScreen from '../IncomeSummaryScreen';
import { useStore } from '../../store/useStore';
import { norm, drawingLines, builtLines, firstDifference } from '../../testing/mockMatch';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), router: { push: jest.fn(), back: jest.fn() },
}));

const LINES = drawingLines('MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html', [/<svg[\s\S]*?<\/svg>/g]);
const STARTS = LINES.map((l, i) => (l === '9:41' ? i : -1)).filter((i) => i >= 0);
/** A phone's own words: from under its status bar to the last line of the screen (`last`). */
const phone = (n: number, last: RegExp): string[] => {
  const seg = LINES.slice(STARTS[n - 1], STARTS[n] ?? LINES.length).filter((l) => !['9:41', '▮▮▮ ⌁'].includes(l));
  const end = seg.findIndex((l) => last.test(l));
  expect(end).toBeGreaterThan(3);                                  // the phone has a body, and its last line was found
  return seg.slice(0, end + 1);
};
const show = (op: any) => {
  useStore.getState().resetAll();
  useStore.setState({ onboardingProfile: op, onboardingComplete: true, hideBalances: false } as any);
  render(<IncomeSummaryScreen />);
  return builtLines(screen.toJSON());
};
const month = (s: string) => s.replace(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/g, '<month>');
const BACK = (s: string) => s.replace(/^‹ back\s+/, '');                                                  // 1

test('the drawing still has its seventeen phones — the guard proves it looked', () => { expect(STARTS).toHaveLength(17); });

test('frame 16 · Your income, with data — the take-home, row by row, then what it is taxed on', () => {
  // the household the drawing draws: two earners, rent after its running costs, dividends left where
  // they are earned, a December bonus, and a rate of their own
  const built = show({
    baseSalary: '7000', salaryFreq: 'monthly', c_401k: '800', hasPartner: 'yes', partnerName: 'Sam', whoEarns: 'both',
    partnerWage: { baseSalary: '4500', salaryFreq: 'monthly', c_401k: '400' },
    invAnnual: '3000', bonusAnnual: '12000', bonusMonth: 12, taxMode: 'manual', manualTaxRate: '24',
    incomeSources: ['employment', 'rental', 'investment'], rentals: [{ type: 'long', income: '1800', expenses: '600', property_id: 'house' }],   // names its property (DEC-4059d, 2026-10-10)
  });
  const want = month(norm(phone(16, /^Edit your income$/)))
    .replace(/ = gross \/year \$# federal tax bracket/, ' = gross /year $# your #(k)s $# = what it is taxed on $# federal tax bracket'), got = BACK(month(norm(built)));   // 3
  expect(want.split(' ').length).toBeGreaterThan(90);
  expect(firstDifference(want, got)).toBe('');
  // 3: the band and the new total are the gross less the 401(k)s — $167,400 − $14,400 — and the gross row stays before deductions
  const L = built;
  expect(L[L.indexOf('= Gross /year') + 1]).toBe('$167,400');
  expect(L[L.indexOf('Your 401(k)s') + 1]).toBe('−$14,400');
  expect(L[L.indexOf('= What it is taxed on') + 1]).toBe('$153,000');
  expect(L[L.findIndex((l) => /^what it is taxed on$/i.test(l)) + 1]).toBe('$153,000');   // the band (its words as the reader gives them)
});

test('frame 17 · Your income, a fresh account — both sections keep their heading', () => {
  const built = show({});
  const EMPTY = (s: string) => s                                                                       // 2
    .replace(/— nothing yet\. tell us where your money comes from and this fills in — it is what every other screen measures against\. add your income/, '<nothing entered, and the door>')
    .replace(/\$# nothing entered yet\. add your income add your income/, '<nothing entered, and the door>')
    .replace(/what it is taxed on — we will calculate this once you enter a wage\./, 'what it is taxed on <nothing entered, and the door>')
    .replace(/what it is taxed on \$# nothing entered yet\. add your income/, 'what it is taxed on <nothing entered, and the door>');
  const want = EMPTY(norm(phone(17, /^We will calculate this once you enter a wage\.$/))), got = EMPTY(BACK(norm(built)));
  expect(want.split(' ').length).toBeGreaterThan(20);
  expect(firstDifference(want, got)).toBe('');
});
