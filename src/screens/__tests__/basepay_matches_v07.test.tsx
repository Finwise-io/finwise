/** YOUR BASE PAY AGAINST ITS APPROVED DRAWING, WORD FOR WORD (income-end-to-end_v07, frames 2a to 2e —
 *  phones 2 to 8; approved 2026-09-02 as v06, v07 is its canon-word edition).
 *  Method and limits: src/testing/mockMatch.ts. Figures are compared as tokens there, so the figures
 *  the drawing's own arithmetic supports are asserted by value at the foot of this file.
 *
 *  Phone 2 is drawn whole and is held whole. Phones 3 to 8 each draw PART of the screen (the card or
 *  the section the frame is about); for those, every drawn word is held in order and unbroken inside
 *  the built screen — what the build prints before and after that run is held by phone 2.
 *
 *  KNOWN DIFFERENCES, each named where it is applied:
 *  1. "‹ Back" heads the screen where the drawing writes "‹ Income". The drawing predates the rule that
 *     every pushed screen carries the top bar and its way back (DEC-0354).
 *  2. What a person has typed sits in an input box. The reader of the built screen reads words, not
 *     the contents of boxes, so the drawing's typed values are left out of the comparison.
 *  3. The drawing writes a closed section's line three ways across its phones ("the same each month" /
 *     "the same"; "take-home $3,300/month" / "take-home $3,300"). The build uses phone 2's, the first
 *     and fullest; the other phones are read as phone 2 writes it.
 *  4. Phone 4 draws no tick beside either person; every other phone ticks a closed, finished section.
 *     The build ticks them.
 *  5. Phone 3 shows the rate question before AND after a rate is typed, in one frame. A screen is in
 *     one state at a time, so it is held as two: before (the warning, the question) and after (the
 *     sentence that says where the rate is used, and the take-home under it).
 *  6. Phone 3's card ends "The rows on this card always add up — a card whose own rows disagree is a
 *     wrong number wearing a layout." That is a remark to the reader of the drawing about the rule,
 *     not a sentence for a customer. The build prints the sum itself and stops there.
 *  7. "Everything else taken out" reads "$1,200/month" in the build and "$1,200" on phone 5. A monthly
 *     figure says it is monthly (canon row 15).
 *  8. Phones 6 and 7 leave out the grey line under a question that phone 5 draws for the same
 *     questions. The build keeps it in every state.
 *  9. Phone 8 (onboarding) does not draw the employer's-match question; the drawing's own rule 2b says
 *     the questions are identical in both frames, and the build asks it in both. The title and
 *     Continue belong to the onboarding shell around this screen.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import BasePayScreen from '../BasePayScreen';
import { useStore } from '../../store/useStore';
import { norm, drawingLines, builtLines, firstDifference, firstBreakInside } from '../../testing/mockMatch';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), router: { push: jest.fn(), back: jest.fn() },
}));

const LINES = drawingLines('MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html',
  [/<svg[\s\S]*?<\/svg>/g, /<div class="inp[^"]*">[\s\S]*?<\/div>/g]);                                    // 2
const STARTS = LINES.map((l, i) => (l === '9:41' ? i : -1)).filter((i) => i >= 0);
/** A phone's own words, from `first` to `last`. */
const phone = (n: number, first: RegExp, last: RegExp): string[] => {
  const seg = LINES.slice(STARTS[n - 1], STARTS[n] ?? LINES.length).filter((l) => !['9:41', '▮▮▮ ⌁'].includes(l));
  const a = seg.findIndex((l) => first.test(l)), b = seg.findIndex((l, i) => i >= a && last.test(l));
  expect(a).toBeGreaterThanOrEqual(0); expect(b).toBeGreaterThan(a + 3);        // the run was found, and it has a body
  return seg.slice(a, b + 1);
};
const AS_PHONE_2 = (s: string) => s                                                                       // 3
  .replace(/the same take-home/g, 'the same each month take-home')
  .replace(/varies take-home \$#(?!\/month)/g, 'varies take-home $#/month');
const HINTS = (s: string) => s                                                                            // 8
  .replace(/ before anything comes out\./g, '')
  .replace(/ (your|sam's) own contribution, not (your|their) employer's match\./g, '')
  .replace(/ after tax and everything else taken out of (your|their) pay\./g, '');

const YOU = { baseSalary: '7000', salaryFreq: 'monthly', c_401k: '800', landsTypical: '5000', employerMatchMode: 'pct', employerMatchValue: '50' };
const SAM_FORTNIGHTLY = { baseSalary: '2077', salaryFreq: 'biweekly', salaryMonthMode: 'months',
  salaryByMonth: { '2026-09': '4500', '2026-10': '4500', '2026-11': '4500' }, c_401k: '400', landsTypical: '3300',
  employerMatchMode: 'dollar', employerMatchValue: '150' };
const COUPLE = { hasPartner: 'yes', partnerName: 'Sam', whoEarns: 'both' };
const show = (op: any, frame: 'screen' | 'onboarding' = 'screen') => {
  useStore.getState().resetAll();
  useStore.setState({ onboardingProfile: op, onboardingComplete: true, hideBalances: false } as any);
  render(<BasePayScreen frame={frame} />);
};
const built = () => norm(builtLines(screen.toJSON()));
const closeYours = () => fireEvent.press(screen.getByText('Done ⌃'));
const openSams = () => fireEvent.press(screen.getAllByText('Edit ⌄').slice(-1)[0]);

test('the drawing still has its seventeen phones — the guard proves it looked', () => { expect(STARTS).toHaveLength(17); });

test('phone 2 · both sections closed, both take-homes entered — the whole screen', () => {
  show({ ...YOU, ...COUPLE, filingStatus: 'married', partnerWage: SAM_FORTNIGHTLY });
  closeYours();
  const want = norm(phone(2, /^‹ Income$/, /^Save$/)).replace(/^‹ income /, '');                          // 1
  const got = built().replace(/^‹ back /, '');
  expect(want.split(' ').length).toBeGreaterThan(110);
  expect(firstDifference(want, got)).toBe('');
});

test('phone 3 · nobody entered a take-home — the household card, before a rate is typed', () => {
  show({ baseSalary: '7000', salaryFreq: 'monthly', c_401k: '800', ...COUPLE, partnerWage: { baseSalary: '4500', salaryFreq: 'monthly', c_401k: '400' } });
  const want = norm(phone(3, /^Your household$/, /^Save$/))
    .replace(/ the rows on this card always add up — a card whose own rows disagree is a wrong number wearing a layout\./, '')   // 6
    .replace(/ we'll use #% everywhere your take-home matters — cash flow, budget, the surplus\. one-time events like a roth conversion still use the tax tables\. = take-home \$#\/month/, '');   // 5
  expect(want.split(' ').length).toBeGreaterThan(130);
  expect(firstBreakInside(want, built())).toBe('');
});

test('phone 3 · the same card once a rate is typed — where it is used, and the take-home under it', () => {
  show({ baseSalary: '7000', salaryFreq: 'monthly', c_401k: '800', ...COUPLE, partnerWage: { baseSalary: '4500', salaryFreq: 'monthly', c_401k: '400' }, taxMode: 'manual', manualTaxRate: '24' });
  const want = norm(phone(3, /^The tax rate you want us to use$/, /^Save$/));                             // 5
  expect(want.split(' ').length).toBeGreaterThan(60);
  expect(firstBreakInside(want, built())).toBe('');
});

test('phone 4 · one entered, one calculated — a labelled fact per person and no tax row', () => {
  show({ ...YOU, ...COUPLE, partnerWage: { baseSalary: '4500', salaryFreq: 'monthly', c_401k: '400' } });
  closeYours();
  const want = AS_PHONE_2(norm(phone(4, /^Each person’s pay$/, /^Save$/)));
  expect(want.split(' ').length).toBeGreaterThan(55);
  expect(firstBreakInside(want, built().replace(/ ✓/g, ''))).toBe('');                                    // 4
});

test('phone 5 · your section open — every question, then everything else taken out', () => {
  show({ ...YOU, ...COUPLE, filingStatus: 'married', partnerWage: SAM_FORTNIGHTLY });
  const want = AS_PHONE_2(norm(phone(5, /^Each person’s pay$/, /^Edit ⌄$/)));
  expect(want.split(' ').length).toBeGreaterThan(110);
  expect(firstBreakInside(want, built().replace('everything else taken out $#/month', 'everything else taken out $#'))).toBe('');   // 7
});

test('phone 6 · Sam’s section, paid fortnightly, pay varies — fourteen months, asked as months', () => {
  show({ ...YOU, ...COUPLE, filingStatus: 'married', partnerWage: SAM_FORTNIGHTLY });
  closeYours(); openSams();
  const lines = phone(6, /^Each person’s pay$/, /the mistake this prevents\.$/);
  const noCells = lines.filter((l, i) => !(/^\$[\d,]+$/.test(l) && /^[A-Z][a-z]{2} \d{2}$/.test(lines[i - 1] ?? '')));   // 2: a cell's amount is typed
  expect(lines.length - noCells.length).toBe(14);                                                         // fourteen months drawn
  expect(screen.getAllByLabelText(/gross pay$/)).toHaveLength(14);                                         // and fourteen built
  const want = AS_PHONE_2(norm(noCells));
  expect(firstBreakInside(want, HINTS(built()))).toBe('');
});

test('phone 7 · the three do not agree — the sentence that says by how much, and Save waits', () => {
  show({ ...YOU, baseSalary: '5500', ...COUPLE, filingStatus: 'married', partnerWage: SAM_FORTNIGHTLY });
  const want = norm(phone(7, /^You$/, /^Most likely the gross figure/));
  expect(want.split(' ').length).toBeGreaterThan(80);
  expect(firstBreakInside(want, HINTS(built()))).toBe('');
  expect(screen.getByLabelText('Save your base pay')).toBeDisabled();
});

test('phone 8 · the same screen inside onboarding — its own hints, and what we will calculate', () => {
  show({ baseSalary: '7000', salaryFreq: 'monthly', hasPartner: 'yes', partnerName: 'Sam', whoEarns: 'you' }, 'onboarding');
  const want = norm(phone(8, /^Bonus, stocks and other income come next$/, /higher than it will really be\.$/))
    .replace(/ ,/g, ',');   // the space a bold tag leaves before a comma in the drawing's markup
  const got = built().replace(/ your employer's match a share of what you put in, or a flat amount\. % of theirs a set amount/, '');   // 9
  expect(want.split(' ').length).toBeGreaterThan(120);
  expect(firstBreakInside(want, got)).toBe('');
});

test('the figures the drawing’s own arithmetic supports are the figures the screen shows (phone 2)', () => {
  show({ ...YOU, ...COUPLE, filingStatus: 'married', partnerWage: SAM_FORTNIGHTLY });
  closeYours();
  const lines = builtLines(screen.toJSON());
  expect(lines).toContain('$138,000/year');                                            // $84,000 + $54,000
  expect(lines).toContain('Monthly · the same each month · take-home $5,000');
  expect(lines).toContain('Fortnightly · varies · take-home $3,300/month');            // typed as a month, shown as that month
  expect(lines.filter((l) => l === '$8,300/month')).toHaveLength(2);                   // the band and the = Take-home row
  expect(lines).toContain('22%');
});
