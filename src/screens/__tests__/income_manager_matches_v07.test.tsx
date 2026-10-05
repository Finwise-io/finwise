/** THE INCOME MANAGER AND ITS EDITORS AGAINST THEIR APPROVED DRAWING, WORD FOR WORD
 *  (income-end-to-end_v07, frames 1 and 3a to 3d — phones 1 and 9 to 12; approved 2026-09-02 as v06).
 *  Method and limits: src/testing/mockMatch.ts. Each phone is held whole. Figures are compared as
 *  tokens there, so the drawing's own household is also asserted by value, phone by phone.
 *
 *  HIS RULING ON THESE, 2026-10-04 (DEC-1560, "Rest - keep it"): 3 (twelve months), 4 ("by $600/month") and 8 (the
 *  picker) were put to him by name and stay as built.
 *
 *  KNOWN DIFFERENCES, each named where it is applied:
 *  1. "‹ Back" heads each screen where the drawing writes "‹ Income" (DEC-0354: the top bar carries the
 *     way back on every pushed screen).
 *  2. What a person has typed sits in an input box, which the reader of the built screen does not read.
 *  3. Phone 9 draws four months to pick a bonus month from (Mar, Jun, Sep, Dec). The build offers all
 *     twelve: a bonus paid in February has to be placeable, because a bonus counted in the wrong month
 *     is the wrong number this screen exists to prevent.
 *  4. Phone 10 says the rent alone would overstate what reaches you "by half" — true of its own
 *     figures ($1,800 against $1,200) and of no others. The build says by how much, in money.
 *  5. Phone 11 reads "= We work out"; the drawing's own change block retires that phrase for "we
 *     calculate" (canon, 2026-09-10) and missed this line. The build uses the canon word.
 *  6. Phone 11's third account reads "1.3% dividend yield". The app holds no yield for shares and
 *     funds and invents none (MK-CF-F-184); it shows what the account actually paid out over the last
 *     year, and says so.
 *  7. Phone 11 says dividends "never land in your bank account"; the build says "never reach", the
 *     word the Income summary already uses for the same fact (canon: one word a concept).
 *  8. Phone 10's hint under "What it costs to run each month" reads "Mortgage interest, tax, insurance,
 *     repairs, management." HIS RULING, 2026-10-04 (DEC-1859): "remove langage to include interest on
 *     mortgage in maintenance expenses, as that is not standard practice." The build reads "Tax,
 *     insurance, repairs, management." — a mortgage belongs in Debts, where its whole payment is counted.
 *  8. Phone 1 lists all ten sources. The picker offers the ones that fit the person's situation, in an
 *     order of its own (eight for someone employed) — the onboarding design, which this drawing calls
 *     "unchanged". Held: the question, its line, and every offered source's words exactly as drawn.
 *  9. Phone 10 gains a question the drawing does not have: "Which property is it?" — and, once a
 *     property is picked, "Monthly mortgage payment on this property, if any". HIS RULINGS, 2026-10-04
 *     (DEC-1924: "mortgage should not costs to run. We should ask to add monthly mortgage payment …
 *     And automatically add it to debt"; DEC-1925: "no mortgage without property").
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import IncomeManagerScreen from '../IncomeManagerScreen';
import { useStore } from '../../store/useStore';
import { norm, drawingLines, builtLines, firstDifference } from '../../testing/mockMatch';
import { renderStep } from '../../onboarding/modules';
import { incomeSourceOptionsFor } from '../../onboarding/steps';

let mockOpen: string | undefined;
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true, setParams: jest.fn() }),
  useLocalSearchParams: () => ({ open: mockOpen }), router: { push: jest.fn(), back: jest.fn() },
}));

const LINES = drawingLines('MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html',
  [/<svg[\s\S]*?<\/svg>/g, /<div class="inp[^"]*">[\s\S]*?<\/div>/g]);                                    // 2
const STARTS = LINES.map((l, i) => (l === '9:41' ? i : -1)).filter((i) => i >= 0);
const phone = (n: number, last: RegExp): string[] => {
  const seg = LINES.slice(STARTS[n - 1], STARTS[n] ?? LINES.length).filter((l) => !['9:41', '▮▮▮ ⌁'].includes(l));
  const end = seg.findIndex((l) => last.test(l));
  expect(end).toBeGreaterThan(3);
  return seg.slice(0, end + 1);
};
const drawn = (n: number, last: RegExp) => norm(phone(n, last)).replace(/^‹ income /, '');                 // 1
const built = () => norm(builtLines(screen.toJSON())).replace(/^‹ back /, '');

/** The household the drawing draws on every phone: $167,400 taxed a year, $9,500 arriving in a month. */
const HOUSE = {
  baseSalary: '7000', salaryFreq: 'monthly', c_401k: '800', landsTypical: '5000',
  hasPartner: 'yes', partnerName: 'Sam', whoEarns: 'both', filingStatus: 'married',
  partnerWage: { baseSalary: '4500', salaryFreq: 'monthly', c_401k: '400', landsTypical: '3300' },
  rentalIncome: '1800', rentalExpenses: '600', invAnnual: '3000', bonusAnnual: '12000', bonusMonth: 12,
  incomeSources: ['employment', 'rental', 'investment_income'],
};
const lastMonth = new Date(Date.now() - 40 * 86400_000).toISOString().slice(0, 10);
const ACCOUNTS = [
  { asset_id: 'c', label: 'Chase savings', tax_bucket: 'CASH', kind: 'savings', balance: 18_400, coupon_rate: 0.038 },
  { asset_id: 't', label: 'Treasury bonds', asset_class: 'bonds', tax_bucket: 'TAXABLE', balance: 30_000, coupon_rate: 0.042 },
  { asset_id: 'v', label: 'VTI and holdings', asset_class: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 80_000 },
];
const PAID = [{ id: 'd1', account_id: 'v', type: 'DIVIDEND', amount: 1_041, date: lastMonth }];
const show = (open?: string) => {
  mockOpen = open;
  useStore.getState().resetAll();
  useStore.setState({ onboardingProfile: HOUSE, onboardingComplete: true, hideBalances: false, assetAccounts: ACCOUNTS, transactions: PAID } as any);
  render(<IncomeManagerScreen />);
};

test('the drawing still has its seventeen phones — the guard proves it looked', () => { expect(STARTS).toHaveLength(17); });

test('phone 12 · Your income — what is entered, one line each, and the seven not picked one tap away', () => {
  show();
  const want = drawn(12, /^Done$/);
  expect(want.split(' ').length).toBeGreaterThan(55);
  expect(firstDifference(want, built())).toBe('');
  const lines = builtLines(screen.toJSON());
  expect(lines).toContain('3 sources');
  expect(lines).toContain('You and Sam · take-home $8,300/month');
  expect(lines).toContain('One property · $1,200/month net');
  expect(lines).toContain('$3,000/year · reinvested');
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
  const want = drawn(9, /^Save$/);
  const got = built().replace('jan feb mar apr may jun jul aug sep oct nov dec', 'mar jun sep dec');          // 3
  expect(want.split(' ').length).toBeGreaterThan(90);
  expect(firstDifference(want, got)).toBe('');
  const lines = builtLines(screen.toJSON());
  expect(lines).toContain('$12,000/year');
  expect(lines).toContain('Inflow (income (take-home) + rent)');
  expect(lines).toContain('$9,500');                                              // $5,000 + $3,300 + $1,200
});

test('phone 10 · Rent from a property — two figures, and what is kept', () => {
  show('rental');
  const want = drawn(10, /^Add another property$/).replace('by half.', 'by $#/month.')                       // 4
    .replace('mortgage interest, tax, insurance, repairs, management.', 'tax, insurance, repairs, management.');   // 8
  expect(want.split(' ').length).toBeGreaterThan(55);
  // 9: HIS RULINGS, 2026-10-04 (DEC-1924, DEC-1925) — each rent entry says which property it is, so its
  // mortgage can be asked for and sent to Debts. The drawn household has no property in Net worth, so
  // the screen says to add it first.
  expect(firstDifference(want, built().replace(' which property is it? add this property first, on the net worth page. then its mortgage can be recorded here.', ''))).toBe('');
  const lines = builtLines(screen.toJSON());
  expect(lines).toContain('$1,200/month net');
  expect(lines).toContain('$1,200/month');
  expect(lines.join(' ')).toContain('$14,400/year. This is the figure every other screen uses — the rent alone would overstate what reaches you by $600/month.');
});

test('phone 11 · Interest & dividends — calculated from the accounts, taxed, and not spendable', () => {
  show('dividends');
  const want = drawn(11, /^Save$/)
    .replace('= we work out', '= we calculate')                                                            // 5
    .replace('vti and holdings #% dividend yield', 'vti and holdings paid out over the last year')           // 6
    .replace('never land in your bank account', 'never reach your bank account');                            // 7
  expect(want.split(' ').length).toBeGreaterThan(95);
  expect(firstDifference(want, built())).toBe('');
  const lines = builtLines(screen.toJSON());
  expect(lines).toEqual(expect.arrayContaining(['3.8% on $18,400', '$699', '4.2% on $30,000', '$1,260', '$1,041']));
  expect(lines.filter((l) => l === '$3,000/year')).toHaveLength(2);                // $699 + $1,260 + $1,041, on the band and on the sum row
});

test('phone 1 · Where does your money come from? — the question, and every offered source in the drawing’s words', () => {
  const lines = phone(1, /^Continue$/);
  const drawnPairs = new Set<string>();
  lines.forEach((l, i) => { if (/\p{Extended_Pictographic}/u.test(l)) drawnPairs.add(`${lines[i + 1]} | ${lines[i + 2]}`); });
  expect(drawnPairs.size).toBe(10);                                                // ten sources drawn
  useStore.getState().resetAll();
  const ctx: any = { status: 'employed', tracks: [], answers: {}, setAnswer: jest.fn() };
  render(<>{renderStep('income_sources' as any, ctx)}</>);
  const shown = builtLines(screen.toJSON());
  expect(norm(shown.slice(0, 3))).toBe(norm(lines.slice(0, 2)));                    // the question and its line (the build's first line is its icon)
  const offered = new Set<string>();
  for (const status of ['student', 'employed', 'partial', 'retired'] as const) {
    for (const o of incomeSourceOptionsFor(status)) {
      offered.add(o.value);
      expect([...drawnPairs]).toContain(`${o.title} | ${o.sub}`);                    // 8: every offered source, word for word
    }
  }
  expect(offered.size).toBe(10);                                                   // and all ten are offered to someone
  expect(incomeSourceOptionsFor('employed')).toHaveLength(8);
});
