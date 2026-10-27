/** THE INCOME SCREENS AGAINST THEIR APPROVED DRAWING, WORD FOR WORD AND FIGURE FOR FIGURE (income-end-to-end_v07, approved
 *  2026-09-02 as v06; v07 is its canon-word edition). Method and limits: src/testing/mockMatch.ts.
 *
 *  REBUILT 2026-10-25 (CF-MMFIX-B, the drawing check's weak guard): figures are compared as printed (`normPrinted`), not as a
 *  "$#" token, and each change a dated row makes is applied by name and must be found (`applyNamed`). The household is the
 *  drawing's own: take-homes typed $5,000 and $3,300, a 24% rate of their own (frame 16 reads "your rate, 24%").
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
 *  4. 2026-10-25 READ THIS FIRST row (IN-10; the app is right): December with the bonus is $9,500 + $12,000 × (1 − 24%) =
 *     $18,620 at the household's own 24%; the drawn $18,860 is the bonus at 22%.
 *  5. 2026-10-25 READ THIS FIRST row (IN-11): a fresh account shows each line's door once — the second "Add your income ›" is gone.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import IncomeSummaryScreen from '../IncomeSummaryScreen';
import { useStore } from '../../store/useStore';
import { normPrinted, drawingLines, builtLines, firstDifference, applyNamed } from '../../testing/mockMatch';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), router: { push: jest.fn(), back: jest.fn() },
}));

// drawingLines writes the entity &rsquo; as a straight mark; this drawing's phones use the curly one throughout (2026-10-25)
const LINES = drawingLines('MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html', [/<svg[\s\S]*?<\/svg>/g])
  .map((l) => l.replace(/'/g, '’'));
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
const BACK: [string, string, string] = ['‹ Back ', '', 'difference 1 (DEC-0354): the top bar’s way back'];

test('the drawing still has its seventeen phones — the guard proves it looked', () => { expect(STARTS).toHaveLength(17); });

test('frame 16 · Your income, with data — the take-home, row by row, then what it is taxed on, every figure as printed', () => {
  // the household the drawing draws: two earners who typed their take-homes, rent after its running costs, dividends left
  // where they are earned, a December bonus, and a rate of their own
  const built = show({
    baseSalary: '7000', salaryFreq: 'monthly', c_401k: '800', landsTypical: '5000', hasPartner: 'yes', partnerName: 'Sam', whoEarns: 'both',
    partnerWage: { baseSalary: '4500', salaryFreq: 'monthly', c_401k: '400', landsTypical: '3300' },
    invAnnual: '3000', bonusAnnual: '12000', bonusMonth: 12, taxMode: 'manual', manualTaxRate: '24',
    incomeSources: ['employment', 'rental', 'investment'], rentals: [{ type: 'long', income: '1800', expenses: '600', property_id: 'house' }],   // names its property (DEC-4059d, 2026-10-10)
  });
  const want = applyNamed(normPrinted(phone(16, /^Edit your income$/)), [
    ['December with the bonus $18,860', 'December with the bonus $18,620', 'difference 4: $9,500 + $12,000 × 76% = $18,620'],
    ['What it is taxed on $167,400 Your gross', 'What it is taxed on $153,000 Your gross', 'difference 3: the band is $167,400 − $14,400'],
    ['= Gross /year $167,400 Federal tax bracket', '= Gross /year $167,400 Your 401(k)s −$14,400 = What it is taxed on $153,000 Federal tax bracket',
     'difference 3: $800 + $400 = $1,200 a month, $14,400 a year, off the gross'],
    ['Tax your rate, 24% (edit', 'Tax your rate, 24.00% (edit', 'the rate in force to two decimals (MK-CF-M-081; the v07 row of 2026-10-26)'],
    ['every source counted. Your 24%, used', 'every source counted. Your 24.00%, used', 'the same figure, the same way (the v07 row of 2026-10-26)'],
  ]);
  const got = applyNamed(normPrinted(built), [BACK]);
  expect(want.split(' ').length).toBeGreaterThan(90);
  expect(firstDifference(want, got)).toBe('');
  // by hand: $5,000 + $3,300 + ($1,800 − $600) = $9,500; $84,000 + $54,000 + $14,400 + $3,000 + $12,000 = $167,400;
  // 24% × $167,400 = $40,176; $3,000 ÷ 12 = $250 reinvested
  expect(got).toContain('= Inflow (income (take-home) + rent) $9,500');
  expect(got).toContain('Tax your rate, 24.00% (edit on Your base pay screen) $40,176/year');
});

test('frame 17 · Your income, a fresh account — both sections keep their heading, each with its one line and door', () => {
  const built = show({});
  const want = applyNamed(normPrinted(phone(17, /^We will calculate this once you enter a wage\.$/)), [
    ['Take-home each month — Nothing yet. Tell us where your money comes from and this fills in — it is what every other screen measures against. Add your income',
     'Take-home each month $0 Nothing entered yet. Add your income', 'difference 2 (Q48): $0, the one line and its door'],
    ['What it is taxed on — We will calculate this once you enter a wage.', 'What it is taxed on $0 Nothing entered yet. Add your income',
     'difference 2 (Q48)'],
  ]);
  const got = applyNamed(normPrinted(built), [BACK]);
  expect(want.split(' ').length).toBeGreaterThan(20);
  expect(firstDifference(want, got)).toBe('');                                            // the door once, not twice (difference 5)
});
