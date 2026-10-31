/** THE INCOME MANAGER AND ITS EDITORS AGAINST THEIR APPROVED DRAWING, WORD FOR WORD
 *  (income-end-to-end_v07, frames 1 and 3a to 3d — phones 1 and 9 to 12; approved 2026-09-02 as v06).
 *  Method and limits: src/testing/mockMatch.ts. Each phone is held whole.
 *
 *  REBUILT 2026-10-25 (CF-MMFIX-B, the drawing check's weak guard): every figure, mark and money box is compared as printed
 *  (`normPrinted`, `builtLinesWithBoxes`) — it compared figures as a "$#" token and left the boxes out, so "12000" in a box drawn
 *  "$12,000" passed (IN-06). Each change a dated row or ruling makes is applied by name and must be found (`applyNamed`).
 *
 *  HIS RULING ON THESE, 2026-10-04 (DEC-1560, "Rest - keep it"): 3 (twelve months), 4 ("by $600/month") and 8 (the
 *  picker) were put to him by name and stay as built.
 *
 *  KNOWN DIFFERENCES, each named where it is applied:
 *  1. "‹ Back" heads each screen where the drawing writes "‹ Income" (DEC-0354: the top bar carries the
 *     way back on every pushed screen).
 *  2. RETIRED 2026-10-25: the boxes are read now, and show their figures as drawn — "$12,000", "$1,800" (IN-06).
 *  3. Phone 9 draws four months to pick a bonus month from (Mar, Jun, Sep, Dec). The build offers all
 *     twelve: a bonus paid in February has to be placeable, because a bonus counted in the wrong month
 *     is the wrong number this screen exists to prevent.
 *  4. Phone 10 says the rent alone would overstate what reaches you "by half" — true of its own
 *     figures ($1,800 against $1,200) and of no others. The build says by how much, in money.
 *  5. Phone 11 reads "= We work out"; the drawing's own change block retires that phrase for "we
 *     calculate" (canon, 2026-09-10) and missed this line. The build uses the canon word.
 *  6. Phone 11's third account reads "1.3% dividend yield". The app holds no yield for shares and
 *     funds and invents none (MK-CF-F-184); it shows what the account actually paid out over the
 *     trailing twelve months, and says so — in those words since 2026-10-21 (Q35, canon row 23; the
 *     drawing carries a dated READ THIS FIRST row).
 *  7. Phone 11 says dividends "never land in your bank account"; the build says "never reach", the
 *     word the Income summary already uses for the same fact (canon: one word a concept).
 *  8. Phone 10's hint under "What it costs to run each month" reads "Mortgage interest, tax, insurance,
 *     repairs, management." HIS RULING, 2026-10-04 (DEC-1859): "remove langage to include interest on
 *     mortgage in maintenance expenses, as that is not standard practice." The build reads "Tax,
 *     insurance, repairs, management." — a mortgage belongs in Debts, where its whole payment is counted.
 *  8. Phone 1 lists all ten sources. The picker offers the ones that fit the person's situation (eight for someone employed) —
 *     his DEC-1560 — in the drawing's order (IN2-07, 2026-10-27; a dated row on the drawing): it had ordered each list by life
 *     stage. Held: the question and its line, and each person's list exactly as drawn — the same words, marks and order, with
 *     the sources his ruling leaves out of it removed and nothing else.
 *  9. Phone 10 gains a question the drawing does not have: "Which property is it?" — and, once a
 *     property is picked, "Monthly mortgage payment on this property, if any". HIS RULINGS, 2026-10-04
 *     (DEC-1924: "mortgage should not costs to run. We should ask to add monthly mortgage payment …
 *     And automatically add it to debt"; DEC-1925: "no mortgage without property").
 *  10. 2026-10-25 READ THIS FIRST row (IN-10; the app is right): December with the bonus is $9,500 + $12,000 × (1 − 24%) =
 *     $18,620 at the household's own 24% (the drawing's phone 16: "your rate, 24%"); the drawn $18,860 is the bonus at 22%.
 *  11. Phone 11 draws the box empty ("use $3,000", greyed): nothing typed over what the accounts pay. Its household types no
 *     yearly figure; the other phones' household types $3,000, the figure phone 12 reads back.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import IncomeManagerScreen from '../IncomeManagerScreen';
import { useStore } from '../../store/useStore';
import { normPrinted, drawingLines, builtLines, builtLinesWithBoxes, firstDifference, applyNamed } from '../../testing/mockMatch';
import { renderStep } from '../../onboarding/modules';
import { incomeSourceOptionsFor } from '../../onboarding/steps';

let mockOpen: string | undefined;
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true, setParams: jest.fn() }),
  useLocalSearchParams: () => ({ open: mockOpen }), router: { push: jest.fn(), back: jest.fn() },
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
const BACK: [string, string, string] = ['‹ Income ', '‹ Back ', 'difference 1 (DEC-0354)'];
const drawn = (n: number, last: RegExp, changes: [string, string, string, number?][] = []) =>
  applyNamed(normPrinted(phone(n, last)), [BACK, ...changes]);
const built = () => normPrinted(builtLinesWithBoxes(screen.toJSON()));

/** The household the drawing draws on every phone: $167,400 taxed a year, $9,500 arriving in a month, a rate of its own, 24%. */
const HOUSE = {
  baseSalary: '7000', salaryFreq: 'monthly', c_401k: '800', landsTypical: '5000',
  hasPartner: 'yes', partnerName: 'Sam', whoEarns: 'both', filingStatus: 'married', taxMode: 'manual', manualTaxRate: '24',
  partnerWage: { baseSalary: '4500', salaryFreq: 'monthly', c_401k: '400', landsTypical: '3300' },
  rentals: [{ type: 'long', income: '1800', expenses: '600', property_id: 'house' }], invAnnual: '3000', bonusAnnual: '12000', bonusMonth: 12,
  incomeSources: ['employment', 'rental', 'investment_income'],
};
const lastMonth = new Date(Date.now() - 40 * 86400_000).toISOString().slice(0, 10);
const ACCOUNTS = [
  { asset_id: 'c', label: 'Chase savings', tax_bucket: 'CASH', kind: 'savings', balance: 18_400, coupon_rate: 0.038 },
  { asset_id: 't', label: 'Treasury bonds', asset_class: 'bonds', tax_bucket: 'TAXABLE', balance: 30_000, coupon_rate: 0.042 },
  { asset_id: 'v', label: 'VTI and holdings', asset_class: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 80_000 },
];
const PAID = [{ id: 'd1', account_id: 'v', type: 'DIVIDEND', amount: 1_041, date: lastMonth }];
const show = (open?: string, op: any = HOUSE) => {
  mockOpen = open;
  useStore.getState().resetAll();
  useStore.setState({ onboardingProfile: op, onboardingComplete: true, hideBalances: false, assetAccounts: ACCOUNTS, transactions: PAID } as any);
  render(<IncomeManagerScreen />);
};

test('the drawing still has its seventeen phones — the guard proves it looked', () => { expect(STARTS).toHaveLength(17); });

test('phone 12 · Your income — what is entered, one line each, and the seven not picked one tap away', () => {
  show();
  const want = drawn(12, /^Done$/);
  expect(want.split(' ').length).toBeGreaterThan(55);
  // by hand: $5,000 + $3,300 = $8,300 a month; $1,800 − $600 = $1,200 a month net; $3,000 a year
  expect(firstDifference(want, built())).toBe('');
});

test('phone 12 · a job holds two things — its row opens the pay and what is paid on top of it', () => {
  show();
  fireEvent.press(screen.getAllByText('Edit ⌄')[0]);
  expect(screen.getByText('Your base pay')).toBeOnTheScreen();
  expect(screen.getByText('$12,000/year · bonus paid in December')).toBeOnTheScreen();
  fireEvent.press(screen.getByText('Bonus and stock'));
  expect(screen.getByText('Paid on top of base pay')).toBeOnTheScreen();        // phone 9
});

test('phone 9 · Bonus and stock — who, how much, which month, and what December will look like', () => {
  show('bonus');
  const want = drawn(9, /^Save$/, [
    ['Mar Jun Sep Dec', 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec', 'difference 3: all twelve months'],
    ['bonus, after tax $18,860', 'bonus, after tax $18,620', 'difference 10: $9,500 + $12,000 × 76% = $18,620'],
  ]);
  expect(want.split(' ').length).toBeGreaterThan(90);
  // the boxes as drawn: "$12,000" typed, "$0" greyed in the stock box left blank
  expect(firstDifference(want, built())).toBe('');
});

test('phone 10 · Rent from a property — two figures, and what is kept', () => {
  show('rental');
  const want = drawn(10, /^Add another property$/, [
    ['by half.', 'by $600/month.', 'difference 4: $1,800 − $1,200 = $600'],
    ['Mortgage interest, tax, insurance, repairs, management.', 'Tax, insurance, repairs, management.', 'difference 8 (DEC-1859)'],
    ['the rent alone would overstate what reaches you by $600/month. Add another property',
     'the rent alone would overstate what reaches you by $600/month. Which property is it? Add the property in Net worth first Add another property',
     'difference 9 (DEC-1924, DEC-1925, DEC-4059d): the drawn household has no property in Net worth'],
  ]);
  expect(want.split(' ').length).toBeGreaterThan(55);
  expect(firstDifference(want, built())).toBe('');
});

test('phone 11 · Interest & dividends — calculated from the accounts, taxed, and not spendable', () => {
  show('dividends', { ...HOUSE, invAnnual: undefined });                                            // 11
  const want = drawn(11, /^Save$/, [
    ['= We work out', '= We calculate', 'difference 5 (canon)'],
    ['VTI and holdings 1.3% dividend yield', 'VTI and holdings paid out over the trailing twelve months', 'difference 6 (MK-CF-F-184, Q35)'],
    ['never land in your bank account', 'never reach your bank account', 'difference 7 (canon)'],
  ]);
  expect(want.split(' ').length).toBeGreaterThan(95);
  // by hand: 3.8% × $18,400 = $699.20; 4.2% × $30,000 = $1,260; $1,041 paid; $699 + $1,260 + $1,041 = $3,000 on the band and the sum
  expect(firstDifference(want, built())).toBe('');
});

test('phone 1 · Where does your money come from? — the question, and each person’s list in the drawing’s words, marks and order', () => {
  const lines = phone(1, /^Continue$/);
  // the drawn sources, in order: each is a mark followed by its title and its line
  const drawnList: string[] = [];
  lines.forEach((l, i) => { if (/\p{Extended_Pictographic}/u.test(l)) drawnList.push(`${l} ${lines[i + 1]} | ${lines[i + 2]}`); });
  expect(drawnList).toHaveLength(10);                                              // the guard proves it looked: ten drawn
  const offeredAll = new Set<string>();
  for (const status of ['student', 'employed', 'partial', 'retired'] as const) {
    const offered = incomeSourceOptionsFor(status).map((o) => `${o.icon} ${o.title} | ${o.sub}`);
    offered.forEach((o) => offeredAll.add(o));
    // BOTH DIRECTIONS, IN ORDER: every offered source is a drawn one (words and mark), and the list is the drawn list with only
    // the sources DEC-1560 leaves out removed — so a source out of its drawn place, or one the drawing does not have, fails
    expect(offered.filter((o) => !drawnList.includes(o))).toEqual([]);
    expect(offered).toEqual(drawnList.filter((d) => offered.includes(d)));
    // ON THE SCREEN, the same list in the same order (the rendered lines, mark, title and line)
    useStore.getState().resetAll();
    const ctx: any = { status, tracks: [], answers: {}, setAnswer: jest.fn() };
    render(<>{renderStep('income_sources' as any, ctx)}</>);
    const shown = builtLines(screen.toJSON());
    // the question and its line, mark for mark — "We’ll", the curly mark the drawing draws (IN-20) — and no coin or 💰 above it
    expect(normPrinted(shown.slice(0, 2))).toBe(normPrinted(lines.slice(0, 2)));
    const rows: string[] = [];
    shown.forEach((l, i) => { if (/\p{Extended_Pictographic}/u.test(l)) rows.push(`${l} ${shown[i + 1]} | ${shown[i + 2]}`); });
    expect(rows).toEqual(offered);
    screen.unmount();
  }
  expect([...offeredAll].sort()).toEqual([...drawnList].sort());                  // all ten are offered to someone
  // his DEC-1560, by name: eight for someone employed — no Retirement income, no Scholarships — Rent before Interest & dividends
  expect(incomeSourceOptionsFor('employed').map((o) => o.title)).toEqual([
    'A job (wages or salary)', 'Self-employed / side gig', 'Rent from a property', 'Interest & dividends',
    'Benefits', 'Child support or alimony', 'Student loans', 'Something else']);
});

// DEC-3768c (founder, 2026-10-10): the rent fields keep digits and one decimal point only, as the person types.
// Every money field on this screen is a plain amount, so the one Money field applies it to all of them.
test('phone 10 · the rent fields keep digits and one decimal point only (DEC-3768c), and show the figure as drawn', () => {
  show('rental');
  const typed = (label: string, text: string) => {
    fireEvent.changeText(screen.getByLabelText(label), text);
    return (useStore.getState().onboardingProfile as any).rentals[0];
  };
  expect(typed('Rent you receive each month, property 1', '$1,850.50').income).toBe('1850.50');
  expect(screen.getByLabelText('Rent you receive each month, property 1').props.value).toBe('$1,850.50');   // IN-06
  // words are refused whole: the field keeps $1,850.50 — stripping letters would have left "2", the $2 the decision forbids
  expect(typed('Rent you receive each month, property 1', 'about 2k').income).toBe('1850.50');
  expect(typed('What it costs to run each month, property 1', '1.2.3').expenses).toBe('1.23');
});
