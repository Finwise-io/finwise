/** YOUR BASE PAY AGAINST ITS APPROVED DRAWING, WORD FOR WORD AND FIGURE FOR FIGURE (income-end-to-end_v07, frames 2a to 2e —
 *  phones 2 to 8; approved 2026-09-02 as v06, v07 is its canon-word edition).
 *
 *  REBUILT 2026-10-25 (CF-MMFIX-B, the drawing check's weak guard): every figure, every box and every mark is compared as
 *  printed — `normPrinted` keeps "$9,427", "12%", "We’ll" and the "·"; `builtLinesWithBoxes` reads what each money box shows.
 *  Until today figures were compared as a token ("$#") and boxes were left out, so a wrong figure, "7000" in a box drawn
 *  "$7,000", and the fortnight figure "2077" in a month's box all passed (IN-01 to IN-06). Every change the drawing's own READ
 *  THIS FIRST rows make is applied by name below (`applyNamed`), and each must be found exactly where it is named, or the test
 *  goes red. Rendered on the drawing's own day, Aug 20 2026, because phone 6's months (Jul 26 to Aug 27) are dates.
 *
 *  Phone 2 and phone 8 are drawn whole and held whole. Phones 3 to 7 each draw PART of the screen (the card or the section the
 *  frame is about); for those, the drawn run is held exactly, from its first line to its last, and phone 2 holds the rest.
 *
 *  KNOWN DIFFERENCES, each named where it is applied:
 *  1. "‹ Back" heads the screen where the drawing writes "‹ Income" (DEC-0354: every pushed screen carries the top bar).
 *  3. The drawing writes a closed section's line three ways ("the same each month" / "the same"; "take-home $3,300/month" /
 *     "take-home $3,300"). The build uses phone 2's, the first and fullest.
 *  4. Phone 4 draws no tick beside either person; every other phone ticks a closed, finished section. The build ticks them.
 *  5. Phone 3 shows the rate question before AND after a rate is typed, in one frame; it is held as two states. Before a rate
 *     is typed the box shows, greyed, the rate it would use — "calculated, 8%" — which the phone does not draw.
 *  6. HIS RULING, 2026-10-04 (DEC-1625): "remove second sentence" — the card states its own sum and stops.
 *  7. "Everything else taken out" reads "$1,200/month" where phone 5 draws "$1,200" — a monthly figure says so (canon row 15).
 *  9. Phone 8 (sign-up) does not draw the employer's-match question; the drawing's rule 2b says the questions are identical in
 *     both frames, and the build asks it in both.
 *  10. 2026-10-24 READ THIS FIRST row (DEC-0283, DEC-0185): the bracket is read after each earner's 401(k) — phone 2's household,
 *     $138,000 − $14,400 − $32,200 = $91,400, is in the 12% band (drawn 22%), so the two-band sentence is not printed.
 *  11. 2026-10-25 READ THIS FIRST rows (the drawing check IN-01, IN-02, IN-03, IN-07; the app is right, the phones are not
 *     redrawn): phone 2's "$4,700/month · 24%" is $11,500 − $8,300 − $1,200 = $2,000/month, 17%; phones 3 and 4 after the
 *     401(k)s ≈$9,427, ≈$873, ≈$3,759, ≈$8,759; phone 3's "$8,740" leaves the 401(k)s in: $11,500 − $2,760 − $1,200 = $7,540;
 *     phone 6's band counts its September $6,000: $84,000 + $55,502 = $139,502; phone 8 has a spouse, so it is taxed jointly
 *     until asked: ≈$6,523 (drawn ≈$6,196, the single figure).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import BasePayScreen from '../BasePayScreen';
import { useStore } from '../../store/useStore';
import { normPrinted, drawingLines, builtLinesWithBoxes, firstDifference, applyNamed } from '../../testing/mockMatch';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), router: { push: jest.fn(), back: jest.fn() },
}));

/** The drawing's day: phone 6's fourteen months run Jul 26 to Aug 27, last month to twelve ahead of August 2026. */
beforeAll(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  jest.setSystemTime(new Date(2026, 7, 20, 12));
});
afterAll(() => jest.useRealTimers());

// drawingLines writes the entity &rsquo; as a straight mark; this drawing's phones use the curly one throughout (no straight mark
// in any phone, checked 2026-10-25), so the entity is read back as the mark it draws
const LINES = drawingLines('MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html', [/<svg[\s\S]*?<\/svg>/g])
  .map((l) => l.replace(/'/g, '’'));
const STARTS = LINES.map((l, i) => (l === '9:41' ? i : -1)).filter((i) => i >= 0);
/** A phone's own lines, from the line matching `first` to the line matching `last`. */
const phone = (n: number, first: RegExp, last: RegExp): string[] => {
  const seg = LINES.slice(STARTS[n - 1], STARTS[n] ?? LINES.length).filter((l) => !['9:41', '▮▮▮ ⌁'].includes(l));
  const a = seg.findIndex((l) => first.test(l)), b = seg.findIndex((l, i) => i >= a && last.test(l));
  expect(a).toBeGreaterThanOrEqual(0); expect(b).toBeGreaterThan(a + 3);        // the run was found, and it has a body
  return seg.slice(a, b + 1);
};
/** The built screen's lines, boxes included, from the line matching `first` to the line matching `last` (or to the end). */
const builtRun = (first: RegExp, last?: RegExp): string[] => {
  const all = builtLinesWithBoxes(screen.toJSON());
  const a = all.findIndex((l) => first.test(l));
  expect(a).toBeGreaterThanOrEqual(0);
  const b = last ? all.findIndex((l, i) => i > a && last.test(l)) : all.length - 1;
  expect(b).toBeGreaterThan(a);
  return all.slice(a, b + 1);
};
const AS_PHONE_2: [string, string, string][] = [                                                                       // 3
  ['Monthly · the same · take-home $5,000', 'Monthly · the same each month · take-home $5,000', 'difference 3: phone 2’s closed line'],
];

const YOU = { baseSalary: '7000', salaryFreq: 'monthly', c_401k: '800', landsTypical: '5000', employerMatchMode: 'pct', employerMatchValue: '50' };
/** Sam, paid $2,077 a fortnight, his pay varying, every month of 2026 typed at $4,500 — so this year is the drawing's $54,000
 *  (12 × $4,500; the year is the calendar year every Cash flow month reads) — putting $400 a month in his 401(k), $150 a month
 *  matched, taking home $3,300 a month. */
const Y2026 = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`2026-${String(i + 1).padStart(2, '0')}`, '4500']));
const SAM_FORTNIGHTLY = { baseSalary: '2077', salaryFreq: 'biweekly', salaryMonthMode: 'months', salaryByMonth: Y2026,
  c_401k: '400', landsTypical: '3300', employerMatchMode: 'dollar', employerMatchValue: '150' };
/** Phone 6's Sam: September 2026 and March 2027 typed at $6,000, every other month left to start from the fortnight. */
const SAM_PHONE_6 = { ...SAM_FORTNIGHTLY, salaryByMonth: { '2026-09': '6000', '2027-03': '6000' } };
const COUPLE = { hasPartner: 'yes', partnerName: 'Sam', whoEarns: 'both' };
const show = (op: any, frame: 'screen' | 'onboarding' = 'screen') => {
  useStore.getState().resetAll();
  useStore.setState({ onboardingProfile: op, onboardingComplete: true, hideBalances: false } as any);
  render(<BasePayScreen frame={frame} />);
};
const closeYours = () => fireEvent.press(screen.getByText('Done ⌃'));
const openSams = () => fireEvent.press(screen.getAllByText('Edit ⌄').slice(-1)[0]);

test('the drawing still has its seventeen phones — the guard proves it looked', () => { expect(STARTS).toHaveLength(17); });

test('phone 2 · both sections closed, both take-homes entered — the whole screen, every figure as printed', () => {
  show({ ...YOU, ...COUPLE, filingStatus: 'married', partnerWage: SAM_FORTNIGHTLY });
  closeYours();
  const want = applyNamed(normPrinted(phone(2, /^‹ Income$/, /^Save$/)), [
    ['‹ Income', '‹ Back', 'difference 1 (DEC-0354)'],
    ['on both wages, filing jointly 22%', 'on both wages, filing jointly 12%', 'difference 10: $138,000 − $14,400 − $32,200 = $91,400, the 12% band'],
    ['$4,700/month · 24%', '$2,000/month · 17.39%', 'difference 11: $11,500 − $8,300 − $1,200 = $2,000; $24,000 ÷ $138,000 = 17.39% (two decimals, difference 12, the v07 row of 2026-10-26)'],
    [' Filing jointly, the band comes from what you earn together. On your pay alone we would have read 12% and shown about $168/month more than your real take-home. The 24% is your own figures',
     ' The 17.39% is your own figures', 'differences 10, 11 and 12: the two bands agree, and the share is 17.39%'],
  ]);
  const got = normPrinted(builtLinesWithBoxes(screen.toJSON()));
  expect(want.split(' ').length).toBeGreaterThan(90);
  expect(firstDifference(want, got)).toBe('');
  // by hand: $84,000 + $54,000 (12 × $4,500) = $138,000 a year; $5,000 + $3,300 = $8,300 a month, twice (band and = Take-home)
  expect(got).toContain('Each person’s pay $138,000/year');
  expect(got.split('$8,300/month').length - 1).toBe(2);
});

const PHONE_3 = { baseSalary: '7000', salaryFreq: 'monthly', c_401k: '800', ...COUPLE, partnerWage: { baseSalary: '4500', salaryFreq: 'monthly', c_401k: '400' } };

test('phone 3 · nobody entered a take-home — the household card, before a rate is typed', () => {
  show(PHONE_3);
  const want = applyNamed(normPrinted(phone(3, /^Your household$/, /^Everything that comes out, as a share of your gross/)), [
    ['≈$9,242/month', '≈$9,427/month', 'difference 11 (DEC-0283): $11,500 − $873 − $1,200 = $9,427', 2],
    ['both of you earn 22%', 'both of you earn 12%', 'difference 10: $138,000 − $14,400 − $32,200 = $91,400'],
    ['≈$1,058/month', '≈$873/month', 'difference 11: the year’s tax on $91,400, $10,472, ÷ 12 = $873'],
    ['$11,500 gross − $1,058 tax − $1,200 of 401(k)s = $9,242. The rows on this card always add up — a card whose own rows disagree is a wrong number wearing a layout.',
     '$11,500 gross − $873 tax − $1,200 of 401(k)s = $9,427.', 'differences 6 (DEC-1625) and 11'],
  ]) + ' calculated, 7.59% Save';   // $10,472 ÷ $138,000 = 7.588% — two decimals (difference 12, 2026-10-26)                                                                                       // 5
  const got = normPrinted(builtRun(/^Your household$/));
  expect(want.split(' ').length).toBeGreaterThan(130);
  expect(firstDifference(want, got)).toBe('');
});

test('phone 3 · once a rate is typed — where it is used, and the take-home under it', () => {
  show({ ...PHONE_3, taxMode: 'manual', manualTaxRate: '24' });
  const want = applyNamed(normPrinted(phone(3, /^The tax rate you want us to use$/, /^Save$/)), [
    ['= Take-home $8,740/month', '= Take-home $7,540/month', 'difference 11 (IN-03): $11,500 − 24% × $11,500 − $1,200 = $7,540'],
    ['We’ll use 24% everywhere', 'We’ll use 24.00% everywhere', 'difference 12: the rate in force, MK-CF-M-081, to two decimals (the v07 row of 2026-10-26)'],
  ]);
  const got = normPrinted(builtRun(/^The tax rate you want us to use$/));
  expect(want.split(' ').length).toBeGreaterThan(55);
  expect(firstDifference(want, got)).toBe('');
});

test('phone 3, a rate typed (READ THIS FIRST 2026-10-25, IN-03) · the rate is his: "Tax · your rate, 24%", and no ≈ on his figures', () => {
  show({ ...PHONE_3, taxMode: 'manual', manualTaxRate: '24' });
  // by hand: 24% × $11,500 = $2,760; $11,500 − $2,760 − $1,200 = $7,540; You $7,000 × 76% − $800 = $4,520; Sam $4,500 × 76% − $400 = $3,020
  expect(normPrinted(builtRun(/^Your household$/, /^\$11,500 gross/))).toBe(
    'Your household $7,540/month Gross /year both wages $138,000 Federal tax bracket assumed filing jointly — both of you earn 12% '
    + 'Tax your rate, 24.00% $2,760/month Your 401(k)s $1,200/month = Take-home $7,540/month $11,500 gross − $2,760 tax − $1,200 of 401(k)s = $7,540.');
  const all = builtLinesWithBoxes(screen.toJSON());
  expect(all).toContain('We’ll calculate $4,520/month, using the 24.00% rate you entered.');   // difference 12 (2026-10-26)
  expect(all).toContain('Monthly · the same each month · take-home $3,020 (calculated)');
  expect(all.join(' ')).not.toMatch(/Calculated federal tax|≈/);
});

test('phone 4 · one entered, one calculated — a labelled fact per person and no tax row', () => {
  show({ ...YOU, ...COUPLE, partnerWage: { baseSalary: '4500', salaryFreq: 'monthly', c_401k: '400' } });
  closeYours();
  const want = applyNamed(normPrinted(phone(4, /^Each person’s pay$/, /^Save$/)), [
    ...AS_PHONE_2,
    ['Monthly · the same · take-home ≈$3,686 (calculated)', 'Monthly · the same each month · take-home ≈$3,759 (calculated)', 'differences 3 and 11: $4,500 less 7.59% tax less $400'],
    ['≈$8,686/month', '≈$8,759/month', 'difference 11: $5,000 + $3,759', 2],
    ['both of you earn 22%', 'both of you earn 12%', 'difference 10'],
    ['≈$3,686', '≈$3,759', 'difference 11'],
  ]);
  const got = normPrinted(builtRun(/^Each person’s pay$/)).replace(/ ✓/g, '');                                       // 4
  expect(want.split(' ').length).toBeGreaterThan(55);
  expect(firstDifference(want, got)).toBe('');
});

test('phone 5 · your section open — every question, every box as drawn, then everything else taken out', () => {
  show({ ...YOU, ...COUPLE, filingStatus: 'married', partnerWage: SAM_FORTNIGHTLY });
  const want = applyNamed(normPrinted(phone(5, /^Each person’s pay$/, /^Edit ⌄$/)), [
    ['Everything else taken out $1,200 ', 'Everything else taken out $1,200/month ', 'difference 7 (canon row 15)'],
    ['Fortnightly · varies · take-home $3,300 ', 'Fortnightly · varies · take-home $3,300/month ', 'difference 3'],
  ]);
  const got = normPrinted(builtRun(/^Each person’s pay$/, /^Edit ⌄$/));
  expect(want.split(' ').length).toBeGreaterThan(110);
  expect(firstDifference(want, got)).toBe('');
  // by hand: the boxes as drawn — "$7,000", "$800", the match 50% × $800 = $400 a month, "$5,000"; $7,000 − $800 − $5,000 = $1,200
  expect(got).toContain('$7,000 Into your 401(k) each month');
  expect(got).toContain('50% · $400/month');
});

test('phone 6 · Sam’s section, paid fortnightly, pay varies — fourteen months, each one a month', () => {
  show({ ...YOU, ...COUPLE, filingStatus: 'married', partnerWage: SAM_PHONE_6 });
  closeYours(); openSams();
  const want = applyNamed(normPrinted(phone(6, /^Each person’s pay$/, /the mistake this prevents\.$/)), [
    ...AS_PHONE_2,
    ['$138,000/year', '$139,502/year', 'difference 11: $84,000 + (11 × $2,077 × 26 ÷ 12 + $6,000 = $55,502, this calendar year)'],
  ]);
  const got = normPrinted(builtRun(/^Each person’s pay$/, /the mistake this prevents\.$/));
  expect(screen.getAllByLabelText(/gross pay$/)).toHaveLength(14);                                                     // fourteen built
  expect(firstDifference(want, got)).toBe('');
  // a month not typed shows the month the app counts: $2,077 × 26 ÷ 12 = $4,500.17 → "$4,500" — never "2077" (IN-05)
  expect(got).toContain('Jul 26 $4,500 Aug 26 $4,500 Sep 26 $6,000 Oct 26 $4,500');
  expect(got).not.toContain('2077 ');
});

test('phone 7 · the three do not agree — the boxes marked, the sentence that says by how much, and Save waits', () => {
  show({ ...YOU, baseSalary: '5500', ...COUPLE, filingStatus: 'married', partnerWage: SAM_FORTNIGHTLY });
  const want = normPrinted(phone(7, /^You$/, /^Most likely the gross figure/));
  const got = normPrinted(builtRun(/^You$/, /or the 401\(k\) is a yearly amount\.$/));
  expect(want.split(' ').length).toBeGreaterThan(80);
  expect(firstDifference(want, got)).toBe('');
  expect(screen.getByLabelText('Save your base pay')).toBeDisabled();
});

test('phone 8 · the same screen inside sign-up — the title, its own hints, the boxes, and what we will calculate', () => {
  show({ baseSalary: '7000', salaryFreq: 'monthly', hasPartner: 'yes', partnerName: 'Sam', whoEarns: 'you' }, 'onboarding');
  const want = applyNamed(normPrinted(phone(8, /^Your base pay$/, /higher than it will really be\.$/)), [
    ['401(k) , because', '401(k), because', 'the space a bold tag leaves before a comma in the drawing’s markup'],
    ['≈$6,196', '≈$6,523', 'difference 11: a spouse entered, taxed jointly until asked — $7,000 − $477 = $6,523', 2],
  ]);
  const got = applyNamed(normPrinted(builtLinesWithBoxes(screen.toJSON())), [
    [' Your employer’s match A share of what you put in, or a flat amount. % of theirs A set amount %', '', 'difference 9'],
  ]);
  expect(want.split(' ').length).toBeGreaterThan(120);
  expect(firstDifference(want, got)).toBe('');                                                                         // whole: no household card in sign-up (IN-07)
});
