/** THE KEPT EDITORS AGAINST THEIR APPROVED DRAWINGS, WORD FOR WORD.
 *
 *  Each of these drawings was made from the build in the first days of October 2026 and approved as
 *  the design, so a gap was unlikely — and unlikely is not measured. Every phone is held whole.
 *  Method and limits: src/testing/mockMatch.ts.
 *
 *    Bill calendar v02 (approved 2026-10-02) ......... 2 phones
 *    Monthly income v02 (approved 2026-10-02) ........ 2 phones
 *    Look back v01 (approved 2026-10-02) ............. 2 phones
 *    Add an account, by hand v02 (approved 2026-10-01)  6 phones
 *    Bonds v02 (approved 2026-10-01) ................. 3 phones
 *    Alternatives v02 (approved 2026-10-01) .......... 3 phones
 *    Itemize v02 (taken as the design 2026-10-01) .... 3 phones
 *    Holding detail v02 (approved 2026-10-01) ........ 3 phones
 *
 *  HIS RULING ON THESE, 2026-10-04 (DEC-1558, DEC-1559, DEC-1560): put to him one by one, he ruled 5 (soonest
 *  maturing first) and 13 ("$0 — nothing sold" stays), and of the rest: "keep it" — 8 and 9 stay as built.
 *
 *  KNOWN DIFFERENCES, each named where it is applied:
 *  1. The drawings write the top bar's wordmark as the words "Money Keel" and its two icons as glyphs.
 *     In the build the wordmark is the logo image and the icons are icons — none of them is text.
 *  2. What a person has typed sits in an input box, which the reader of the built screen does not read.
 *  3. HIS RULING, 2026-10-04: "Add AGG, GLD, BTS, AOR". Look back draws three choices in each row (what
 *     you hold, and SPY). The build offers those and four more yardsticks — bonds, gold, bitcoin (BTC)
 *     and a balanced fund — after them. Held: the drawn choices first and in the drawn order, then the four.
 *  4. The drawings write the info dot as the letter "i"; in the build it is the ⓘ icon.
 *  5. HIS RULING, 2026-10-04: "sort by soonest maturing first". The drawing lists its three bonds in
 *     another order; the ruling is newer. Held: the same three blocks, word for word, soonest first.
 *  6. An empty Bonds or Alternatives screen carries "Nothing entered yet." and its door — his ruling
 *     for every empty state (Q48, 2026-09-09). The two drawings left the line out.
 *  7. Alternatives draws the kind "Commodities"; the app's one name for it is "Gold / commodities"
 *     (the same words Add an account uses).
 *  8. The two EDITORS are drawn in part. The build's form also asks where the holding is kept, its
 *     current value and the date of that value, and ends in Save and Delete. Held for Bonds: every
 *     drawn line is on the form, in the drawn order.
 *  9. HIS RULING, 2026-10-04 (DEC-1560): "Rest - keep it." — the Alternatives editor keeps the kinds the app
 *     offers and its own line under the kind. The drawing offers "Private equity" (not offered in this phase,
 *     DEC-2334), writes "Commodities" (7) and "Annuity" (18), and its own line under the kind. Those five drawn
 *     lines are not on the form, as ruled; they are pinned below, so the form cannot change without this test
 *     saying so. (It was recorded here as open until 2026-10-20, after he had ruled it.)
 * 10. Itemize: a bond's maturity is picked on the phone's own date control, which a test cannot
 *     drive, so the bond is placed without one and the drawn words "· matures 2032-05-15" are not held.
 *     (2026-10-19: the app writes that date in words, "· matures May 15, 2032", through dateShown; the
 *     drawing's READ THIS FIRST note says so.)
 *     The drawing writes that control by its name, "maturity date"; empty, it reads "Tap to pick a date",
 *     as it does on Add an account.
 * 11. Itemize's second and third phones draw a ✕ beside the title that its first phone does not. The
 *     build closes with the top bar's Back in every state.
 * 12. Holding detail draws cents on six totals ($33,857.60, $24,500.00, $134.40 …) and "0.50000000
 *     coins". The precision standard (Q49) prints totals in whole dollars and trims a coin quantity's
 *     trailing zeros; the build follows the standard, and the figures are asserted in that form.
 *     Look back draws its two percents to one decimal ("+2.5%"); the standard prints a percent to two.
 * 13. HIS RULING, 2026-10-04: "$0 — nothing sold" stays. The drawing prints "$0.00" and, under it, the
 *     line about how sales are matched — a line the build keeps for when there is a sale.
 * 14. The short-term gain row. The drawing reads "Gain — short-term (under 1 yr)"; the build reads
 *     "Gain — short-term (held 1 yr or less)". The outside review (2026-10-04) found that "over 1 yr"
 *     and "under 1 yr" leave a holding held exactly one year in neither row; the tax rule puts it in
 *     short-term, and the function always did. Fixed on his instruction the same day to fix its findings.
 * 15. HIS RULING, 2026-10-04 (DEC-1925): "Properties, mortgages, and debt we should ask user to name … no
 *     mortgage without property." On Add an account, Real estate, the drawn "Debt balance (optional)" reads
 *     "Mortgage balance (optional)"; once a balance is typed the form also asks the monthly payment
 *     (not drawn, and not in this frame, which types none), and the mortgage is written on that property.
 * 16. HIS RULE, 2026-10-04 (DEC-1926): "unless rental income is added on the income screen, assume
 *     property is second or vacation home." So Add an account, Real estate, asks one thing the drawing
 *     does not: "Is this the home you live in?" — Yes or No. Nothing else about a property's use is asked.
 * 17. HIS RULING, 2026-10-06: "this phase of app no longer has options for Private Equity and Hedge
 *     fund." Add an account's drawn "Private stake" chip is not offered; Alternatives' first-day
 *     sentence names crypto, commodities, annuities only.
 * 18. HIS RULING, 2026-10-11 (DEC-4529): a drawing's error is corrected by a dated READ THIS FIRST line, not a
 *     redraw. "Annuity", drawn on Add an account and on the Alternatives editor, reads "Annuities" — the one word
 *     for the kind (DEC-0382). Alternatives phone 1's rates, blend and growth are not the app's either; its line
 *     gives the app's figures, and the test below holds those figures to what the screen prints.
 * 19. HELD IN IS THE ONE LIST (DEC-2441, DEC-2484h; each drawing's READ THIS FIRST row of 2026-10-20). Add an account draws
 *     three choices (Taxable · 401(k) / IRA · Roth); the Bonds and Alternatives editors draw Account with three
 *     (Taxable · Trad IRA / 401k · Roth). All four forms now offer the app's one list of six, headed Held in: Taxable ·
 *     401(k) · Traditional IRA · Roth IRA · Roth 401(k) · HSA. Held: the six, in that order, where the drawn three stand.
 * 20. A BOND'S VALUE AND WHAT WAS PAID (DEC-0281; READ THIS FIRST rows of 2026-10-20 on Add an account and on Bonds). Add
 *     an account's bond fields and the Bonds editor ask what you paid (optional); the Bonds editor's value box says blank
 *     is what you paid, else the face value. Held: the box after the face value on Add an account, and the label's words.
 * 21. HOW OFTEN A BOND PAYS (decided 2026-10-20 under DEC-3390; the same rows). A bond — never a CD — is asked Pays
 *     interest · Once a year · Twice a year, under the interest rate. Held: the three lines in that place.
 * 22. SELECTOR CORNERS (DEC-0231, 2026-09-25: rounded corners, not semicircle ends; dated correction lines of 2026-10-20 on
 *     Bonds, Alternatives, Itemize and Net worth v08, the DEC-4529 way). Bonds and Alternatives draw their chips at
 *     border-radius 100px, Itemize at 20px; the app draws every choice at 12. Held: the drawn radius, the line correcting
 *     it, and the rendered chip at 12 — words cannot see a corner, so the appearance is held on its own.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { fireEvent } from '@testing-library/react-native';
import { norm, drawingLines, builtLines, firstDifference, missingInOrder } from '../../testing/mockMatch';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true, setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams, router: { push: jest.fn(), back: jest.fn() },
}));

const D = 'MoneyKeel/documents/';
/** Every phone of a drawing: its words from under the status bar on, the bar's wordmark and icons left out. */
const phones = (file: string, strip: RegExp[] = []) => {
  const L = drawingLines(D + file, [/<svg[\s\S]*?<\/svg>/g, ...strip]).filter((l) => !['◉', '⚙', 'Money', 'Keel', 'i'].includes(l));   // 1, 4
  const st = L.map((l, i) => (l === '9:41' ? i : -1)).filter((i) => i >= 0);
  return st.map((s, n) => L.slice(s + 2, st[n + 1] ?? L.length));
};
const upTo = (seg: string[], last: RegExp) => {
  const end = seg.findIndex((l) => last.test(l));
  expect(end).toBeGreaterThan(3);                      // the phone has a body, and its last line was found
  return seg.slice(0, end + 1);
};
const show = (Screen: any, state: any, params: Record<string, string> = {}) => {
  mockParams = params;
  useStore.getState().resetAll();
  useStore.setState({ onboardingComplete: true, hideBalances: false, ...state } as any);
  render(<Screen />);
  return builtLines(screen.toJSON());
};
const iso = (d: Date) => d.toISOString().slice(0, 10);
/** The drawing's own READ THIS FIRST table, as text — a known difference held below must be written there, dated. */
const noteOf = (file: string) => {
  const html = require('fs').readFileSync(require('path').join(__dirname, '..', '..', '..', 'MoneyKeel/documents/' + file), 'utf8') as string;
  const at = html.indexOf('READ THIS FIRST');
  expect(at).toBeGreaterThan(0);
  return { html, rows: html.slice(at, html.indexOf('</table>', at)).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') };
};
const SIX = ['Taxable', '401(k)', 'Traditional IRA', 'Roth IRA', 'Roth 401(k)', 'HSA'];   // 19: the one list, in its order
const flatStyle = (node: any) => require('react-native').StyleSheet.flatten(node.props.style);

describe('Bill calendar v02', () => {
  const P = phones('cashflow/moneykeel_pres_mock_bill-calendar_v02.html');
  const BillCalendarScreen = require('../BillCalendarScreen').default;
  test('the drawing has its two phones', () => { expect(P).toHaveLength(2); });

  test('phone 1 · a working household, twelve months ahead', () => {
    // $9,000 a month at their own 20% is $7,200 in; $4,220 out, and a $3,600 bill that falls in April
    const built = show(BillCalendarScreen, { onboardingProfile: { status: 'employed', incomeSources: ['employment'], baseSalary: '9000', salaryFreq: 'monthly',
      taxMode: 'manual', manualTaxRate: '20', monthlySpending: '4220',
      spendCats: [{ id: 'everyday', label: 'Everyday', amount: 4220, bucket: 'flexible' }, { id: 'ins', label: 'Home insurance', amount: 3600, bucket: 'nonmonthly', months: [4], dueDay: 10 }] } });
    const want = norm(upTo(P[0], /^A forward plan, not a promise/));
    expect(want.split(' ').length).toBeGreaterThan(120);
    expect(firstDifference(want, norm(built))).toBe('');
    expect(built.filter((l) => l === '+$7,200')).toHaveLength(12);         // the same in every month
    expect(built.filter((l) => l === '−$4,220')).toHaveLength(11);
    expect(built).toContain('−$7,820');                                    // April: $4,220 + the $3,600 bill
    expect(built).toContain('Lowest point $2,980 — Oct.');                 // $7,200 − $4,220, from nothing
  });

  test('phone 2 · the first day, nothing entered', () => {
    const built = show(BillCalendarScreen, { onboardingProfile: {} });
    const want = norm(upTo(P[1], /^A forward plan, not a promise/));
    expect(want.split(' ').length).toBeGreaterThan(100);
    expect(firstDifference(want, norm(built))).toBe('');
  });
});

describe('Monthly income v02', () => {
  const P = phones('cashflow/moneykeel_pres_mock_monthly-income_v02.html');
  const MonthlyIncomeScreen = require('../MonthlyIncomeScreen').default;
  test('the drawing has its two phones', () => { expect(P).toHaveLength(2); });

  test('phone 1 · a retired household', () => {
    const built = show(MonthlyIncomeScreen, { onboardingProfile: { status: 'retired', incomeSources: ['retirement_income'], ri_ss: '2400', ri_pension: '1100' } });
    const want = norm(upTo(P[0], /^Save$/));
    expect(want.split(' ').length).toBeGreaterThan(55);
    expect(firstDifference(want, norm(built))).toBe('');
    expect(built).toContain('$3,500/month');                               // $2,400 + $1,100
  });

  test('phone 2 · the first day, nothing entered', () => {
    const built = show(MonthlyIncomeScreen, { onboardingProfile: { status: 'retired', incomeSources: [] } });
    expect(firstDifference(norm(upTo(P[1], /^Save$/)), norm(built))).toBe('');
    expect(built).toContain('$0/month');
  });
});

describe('Look back v01', () => {
  const P = phones('networth-and-performance/moneykeel_pres_mock_look-back_v01.html');
  const LookBackScreen = require('../LookBackScreen').default;
  const now = new Date(); const back = (m: number) => iso(new Date(now.getFullYear(), now.getMonth() - m, 1));
  const series = (a: number, b: number, from = 14) => ({ points: [{ date: back(from), close: a }, { date: back(Math.floor(from / 2)), close: (a + b) / 2 }, { date: iso(now), close: b }] });
  const HELD = [{ asset_id: 'b', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 60000, positions: ['BND', 'VTI', 'QQQ'].map((t, i) => (
    { position_id: `p${i}`, ticker: t, kind: t === 'BND' ? 'fixed_income' : 'stocks', lots: [{ lot_id: `l${i}`, shares: 100, cost_per_share: 100, purchase_date: '2024-01-01' }] })) }];
  const noTyped = (lines: string[]) => lines.filter((l) => l !== '20,000');                                    // 2: the amount is typed
  const fourMore = (s: string) => s.replace(/ agg gld btc aor/g, '');                                          // 3: the four yardsticks he added
  test('the drawing has its two phones', () => { expect(P).toHaveLength(2); });

  test('state A · with prices — what actually happened, in three lines', () => {
    const built = show(LookBackScreen, { onboardingProfile: {}, assetAccounts: HELD, priceCache: { BND: { ticker: 'BND', ...series(100, 102.5) }, SPY: { ticker: 'SPY', ...series(100, 116) } } });
    const want = norm(noTyped(upTo(P[0], /^Real past prices/)));
    expect(want.split(' ').length).toBeGreaterThan(45);
    expect(firstDifference(want, fourMore(norm(built)))).toBe('');
    expect(built.slice(built.indexOf('From') + 1, built.indexOf('When'))).toEqual(                                // 3
      ['BND', 'VTI', 'QQQ', 'AGG', 'GLD', 'BTC', 'AOR', 'To', 'SPY', 'VTI', 'QQQ', 'AGG', 'GLD', 'BTC', 'AOR']);
    expect(built).toContain('Left in BND it became $20,500 (up $500, +2.50%)');                                 // $20,000 × 1.025 — a percent to two decimals (Q49)
    expect(built).toContain('Moved to SPY it would be $23,200 (up $3,200, +16.00%)');                           // $20,000 × 1.16
    expect(built).toContain('Difference: $2,700 more if you had moved.');
  });

  test('state B · prices that do not reach back that far — it says what is missing and what to do', () => {
    const built = show(LookBackScreen, { onboardingProfile: {}, assetAccounts: HELD, priceCache: { BND: { ticker: 'BND', ...series(100, 102.5, 4) }, SPY: { ticker: 'SPY', ...series(100, 116, 4) } } });
    const want = norm(noTyped(upTo(P[1], /pick a shorter window\.$/)));
    expect(firstDifference(want, fourMore(norm(built)))).toBe('');
    expect(built.join(' ')).not.toMatch(/Difference:/);                                                         // nothing invented
  });
});

const NW = 'networth-and-performance/moneykeel_pres_mock_';

describe('Add an account, by hand v02', () => {
  // 2: what is typed sits in a box — except the date button, which the build prints as words
  const P = phones(NW + 'add-account-by-hand_v02.html', [/<div class="in">(?!Tap to pick a date)[\s\S]*?<\/div>/g]);
  const AddAccountScreen = require('../AddAccountScreen').default;
  test('the drawing has its six phones — one for each kind of account', () => { expect(P).toHaveLength(6); });
  test.each([['Cash', 0], ['Stocks / Funds', 1], ['Bonds', 2], ['Alternatives', 3], ['Real estate', 4], ['Debt', 5]] as [string, number][])(
    'phone %#: %s — the questions that kind asks, and no others', (kind, k) => {
      show(AddAccountScreen, { assetAccounts: [] });
      fireEvent.press(screen.getAllByText(kind)[0]);
      // 17: HIS RULING, 2026-10-06 — the drawn "Private stake" chip is not offered in this phase
      // 18: DEC-4529 — the drawn chip "Annuity" reads "Annuities" (the drawing's READ THIS FIRST line of 2026-10-20)
      const want = norm(upTo(P[k], /^Save$/)).replace('debt balance (optional)', 'mortgage balance (optional)').replace(' private stake', '').replace(' annuity ', ' annuities ')   // 15, 17, 18
        .replace(' held in taxable #(k) / ira roth ', ` held in ${norm(SIX)} `)                                                                // 19
        .replace('face value (optional) interest rate % (optional) matures', 'face value (optional) what you paid (optional) interest rate % (optional) pays interest once a year twice a year matures');   // 20, 21
      expect(want.split(' ').length).toBeGreaterThan(20);
      // 16: HIS RULE, 2026-10-04 (DEC-1926) — the form asks the one thing nothing else can tell it: which
      // property is the home lived in. Everything else about a property's use is read from the rent entered.
      expect(firstDifference(want, norm(builtLines(screen.toJSON())).replace(' is this the home you live in? yes no', ''))).toBe('');
    });
});

// 18: ONE WORD FOR THE KIND (DEC-4529, DEC-0382). Add an account read "Annuity" while the Alternatives screen and the
// list of kinds read "Annuities" — found by the launch check of 2026-10-20. The form now reads its words from that list.
test('Add an account · the Alternatives kinds are the list of kinds\' own words — "Annuities", as the Alternatives editor says', () => {
  const AddAccountScreen = require('../AddAccountScreen').default;
  show(AddAccountScreen, { assetAccounts: [] });
  fireEvent.press(screen.getAllByText('Alternatives')[0]);
  const built = builtLines(screen.toJSON());
  const from = built.indexOf('What kind?');
  expect(from).toBeGreaterThan(0);
  expect(built.slice(from + 1, from + 5)).toEqual(['Crypto', 'Gold / commodities', 'Annuities', 'Other']);
  expect(built).not.toContain('Annuity');
  // the Alternatives editor offers the same word for the same kind
  const OtherInvestmentsScreen = require('../OtherInvestmentsScreen').default;
  show(OtherInvestmentsScreen, { assetAccounts: [] });
  fireEvent.press(screen.getAllByText('＋ Add an investment')[0]);
  expect(builtLines(screen.toJSON())).toContain('Annuities');
  // and the drawing says so on its face, dated
  const note = require('fs').readFileSync(require('path').join(__dirname, '..', '..', '..', 'MoneyKeel/documents/' + NW + 'add-account-by-hand_v02.html'), 'utf8');
  expect(note).toMatch(/the chip “Annuity” should read <b>“Annuities”<\/b>[\s\S]*Line added 2026-10-20\./);
});

describe('Bonds v02', () => {
  const P = phones(NW + 'bonds_v02.html');
  const BondsScreen = require('../BondsScreen').default;
  const BONDS = [
    { asset_id: 'b1', label: 'US Treasury 2027', kind: 'bond', tax_bucket: 'TAXABLE', balance: 24650, face_value: 25000, coupon_rate: 0.0425, maturity_date: '2027-06-30', accrued_interest: 0 },
    { asset_id: 'b2', label: 'Apple Corp 4.5%', kind: 'bond', tax_bucket: 'TAXABLE', balance: 19530, face_value: 20000, coupon_rate: 0.045, maturity_date: '2030-03-15' },
    { asset_id: 'b3', label: 'Chase 12-month CD', kind: 'bond', tax_bucket: 'TAXABLE', balance: 30000, face_value: 30000, coupon_rate: 0.04, maturity_date: '2027-02-01', accrued_interest: 0 },
  ];
  test('the drawing has its three phones', () => { expect(P).toHaveLength(3); });

  test('phone 1 · with bonds — the total, three figures, and a block for each bond', () => {
    const built = show(BondsScreen, { assetAccounts: BONDS });
    const seg = upTo(P[0], /Yield to maturity is an estimate\.$/);
    const at = (name: string) => seg.indexOf(name);
    const [t, a, c, add] = [at('US Treasury 2027'), at('Apple Corp 4.5%'), at('Chase 12-month CD'), at('＋ Add a bond')];
    expect([t, a, c, add].every((i) => i > 0) && t < a && a < c && c < add).toBe(true);
    const star = seg.slice(a, c).filter((l) => l.startsWith('* accrued'));                                   // the note sits under the bond it is about
    // HIS RULING OF 2026-10-09 ON TOP OF THE DRAWING (noted at its top): accrued interest not entered is
    // estimated and ADDED to calculate the yield to maturity, so the star moves from the yield on today's
    // value to the yield to maturity, and the note reads in his words.
    const ruled = (l: string) => /^yield [\d.]+% \*$/.test(l) ? l.replace(/ \*$/, '') : l;
    const apple = seg.slice(a, c).filter((l) => !l.startsWith('* accrued')).map(ruled)
      .map((l) => /^Yield to maturity: /.test(l) ? `${l} *` : l);
    // (the figures in the note are masked by norm; only its words are compared)
    const note = star.map(() => '* Added estimated $193 in accrued interest to bond value at 4.5% coupon for 206 days to calculate YTM. If this is not accurate, enter actual accrued interest');
    const soonestFirst = [...seg.slice(0, t), ...seg.slice(c, add), ...seg.slice(t, a), ...apple, ...note, ...seg.slice(add)];   // 5
    expect(firstDifference(norm(soonestFirst), norm(built))).toBe('');
    expect(built.indexOf('Chase 12-month CD')).toBeLessThan(built.indexOf('US Treasury 2027'));            // Feb 2027, then Jun 2027, then Mar 2030
    expect(built.indexOf('US Treasury 2027')).toBeLessThan(built.indexOf('Apple Corp 4.5%'));
    expect(built).toEqual(expect.arrayContaining(['$74,180', '3 bonds · face $75,000', '$3,163', '4.26%', '$1,063/year coupon', 'yield 4.31%', 'yield 4.61%', 'yield 4.00%']));
  });

  test('phone 2 · the first day — a real $0, what belongs here, and one button', () => {
    const built = show(BondsScreen, { assetAccounts: [] }).filter((l) => l !== 'Nothing entered yet. Add a bond ›');   // 6
    expect(firstDifference(norm(upTo(P[1], /^＋ Add a bond$/)), norm(built))).toBe('');
    expect(show(BondsScreen, { assetAccounts: [] })).toContain('Nothing entered yet. Add a bond ›');
  });

  test('phone 3 · the editor — every drawn line is on the form, in the drawn order', () => {
    show(BondsScreen, { assetAccounts: BONDS });
    fireEvent.press(screen.getByText('US Treasury 2027'));
    const typed = ['US Treasury 2027', '25000', '4.25', 'interest earned since the last coupon, if you know it', 'amount sold (up to $24,650)'];   // 2
    const seg = upTo(P[2], /^Sold the whole position/).filter((l) => !typed.includes(l) && l !== '‹ Back');
    // the drawing's markup breaks two sentences across lines; the build prints each as one
    // his ruling DEC-3390 on top of the drawing (2026-10-09, noted at its top): the value field says it is the
    // statement's market value, without accrued interest
    const joined = [seg.join(' ')
      .replace('When you enter it,', 'When you enter it,')
      .replace('Current value (blank = face value)', 'Market value, as your statement shows it — without accrued interest (blank = what you paid, else face value)')   // 20
      .replace("what it's worth now", 'the value on your statement')
      .replace('Account Taxable Trad IRA / 401k Roth', `Held in ${SIX.join(' ')}`)];                                                     // 19
    const form = builtLines(screen.toJSON()); const from = form.indexOf('Edit bond');
    expect(from).toBeGreaterThan(0);
    const formWords = norm(form.slice(from));
    const drawnWords = norm(joined).split(' ');
    let k = 0; for (const w of formWords.split(' ')) { if (w === drawnWords[k]) k += 1; }
    expect(drawnWords.slice(k, k + 12).join(' ')).toBe('');                                                  // 8: every drawn word, in order
    expect(form).toEqual(expect.arrayContaining(['Institution / account (optional)', 'Market value, as your statement shows it — without accrued interest (blank = what you paid, else face value)', 'Save', 'Delete bond']));
    // 20, 21: the two new questions, in their places — what you paid after the value, how often it pays after the coupon rate
    const at = (l: string) => form.indexOf(l);
    expect(at('Coupon rate (% per year)')).toBeLessThan(at('Pays interest'));
    expect(form.slice(at('Pays interest'), at('Pays interest') + 3)).toEqual(['Pays interest', 'Once a year', 'Twice a year']);
    expect(at('Pays interest')).toBeLessThan(at('Accrued interest (optional)'));
    expect(form[at('Market value, as your statement shows it — without accrued interest (blank = what you paid, else face value)') + 1]).toBe('What you paid (optional)');
    expect(form.slice(at('Held in') + 1, at('Held in') + 7)).toEqual(SIX);                                                               // 19
  });
});

describe('Alternatives v02', () => {
  const P = phones(NW + 'alternatives_v02.html');
  const OtherInvestmentsScreen = require('../OtherInvestmentsScreen').default;
  const ALTS = [
    { asset_id: 'a1', label: 'Bitcoin', institution: 'Coinbase', kind: 'crypto', tax_bucket: 'TAXABLE', balance: 28000 },
    { asset_id: 'a2', label: 'Fund III', kind: 'private_equity', tax_bucket: 'TAXABLE', balance: 25000 },
    { asset_id: 'a3', label: 'Gold', kind: 'commodities', tax_bucket: 'TAXABLE', balance: 8500 },
    { asset_id: 'k', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 451000 },
  ];
  test('the drawing has its three phones', () => { expect(P).toHaveLength(3); });

  test('phone 1 · with holdings — the total, its share, and a row for each', () => {
    const built = show(OtherInvestmentsScreen, { assetAccounts: ALTS });
    const want = norm(upTo(P[0], /not guarantees\.$/)).replace('$# commodities ~#%/year expected', '$# gold / commodities ~#%/year expected');   // 7
    expect(want.split(' ').length).toBeGreaterThan(45);
    expect(firstDifference(want, norm(built))).toBe('');
    expect(built).toEqual(expect.arrayContaining(['$61,500', '3 holdings · 12% of your investable assets', '$28,000', '$25,000', '$8,500']));   // $28,000 + $25,000 + $8,500; ÷ $512,500
  });

  test('phone 2 · the first day', () => {
    const built = show(OtherInvestmentsScreen, { assetAccounts: [] }).filter((l) => l !== 'Nothing entered yet. Add an investment ›');   // 6
    // 17: HIS RULING, 2026-10-06 — private equity and hedge funds are not offered in this phase
    expect(firstDifference(norm(upTo(P[1], /^＋ Add an investment$/)).replace('crypto, private equity, hedge funds, commodities', 'crypto, commodities'), norm(built))).toBe('');
  });

  // 18: THE DRAWING'S PHONE 1 FIGURES ARE NOT THE APP'S (DEC-4529). Its READ THIS FIRST line of 2026-10-20 gives the
  // figures the app prints for the drawing's three holdings — Fund III entered as Other, because private equity is not
  // offered in this phase (DEC-2334), and as a private-equity row saved before it. Each figure in that line is held
  // here against the screen, so the line cannot drift from what the app prints.
  test('phone 1 · the READ THIS FIRST correction gives the figures the screen prints for the drawn holdings', () => {
    const note = require('fs').readFileSync(require('path').join(__dirname, '..', '..', '..', 'MoneyKeel/documents/' + NW + 'alternatives_v02.html'), 'utf8');
    const line = note.slice(note.indexOf('DRAWING ERROR, phone 1'), note.indexOf('Line added 2026-10-20.', note.indexOf('DRAWING ERROR, phone 1')));
    expect(line.length).toBeGreaterThan(500);
    const asOther = ALTS.map((a) => (a.asset_id === 'a2' ? { ...a, kind: 'other_asset' } : a));
    const other = show(OtherInvestmentsScreen, { assetAccounts: asOther });
    const kept = show(OtherInvestmentsScreen, { assetAccounts: ALTS });
    const want = (built: string[], figs: string[]) => { for (const f of figs) { expect(built).toContain(f); expect(line).toContain(f); } };
    // Fund III as Other: (28,000 × 8% + 25,000 × 5% + 8,500 × 8.2%) ÷ 61,500 = 4,187 ÷ 61,500
    want(other, ['$61,500', '6.81%', '$4,187', 'Coinbase · Crypto · ~8.00%/year expected', 'Other · ~5.00%/year expected', 'Gold / commodities · ~8.20%/year expected']);
    // Fund III kept as private equity: (2,240 + 3,250 + 697) ÷ 61,500 = 6,187 ÷ 61,500
    want(kept, ['10.06%', '$6,187', 'Private equity · ~13.00%/year expected']);
    expect(line).toContain('(28,000 × 8.00% + 25,000 × 5.00% + 8,500 × 8.20%) ÷ 61,500 = (2,240 + 1,250 + 697) ÷ 61,500 = 4,187 ÷ 61,500');
  });

  test('phone 3 · the editor — as ruled (DEC-1560): five drawn lines are not on the form, and exactly those five', () => {
    show(OtherInvestmentsScreen, { assetAccounts: ALTS });
    fireEvent.press(screen.getByText('Bitcoin'));
    const typed = ['Bitcoin', 'Coinbase', '28000', 'amount sold (up to $28,000)', '‹ Back'];                 // 2
    const form = builtLines(screen.toJSON()); const from = form.indexOf('Edit investment');
    const drawn = upTo(P[2], /^Sold all of it/).filter((l) => !typed.includes(l));
    const sentence = drawn.slice(drawn.indexOf('🔻 Sell') + 1, drawn.indexOf('Record')).join(' ');           // one sentence in the build
    // 19: the drawn Account and its three choices are the one list, headed Held in (the drawing's READ THIS FIRST row of 2026-10-20)
    const held = (ls: string[]) => { const i = ls.indexOf('Account'); expect(ls.slice(i, i + 4)).toEqual(['Account', 'Taxable', 'Trad IRA / 401k', 'Roth']); return [...ls.slice(0, i), 'Held in', ...SIX, ...ls.slice(i + 4)]; };
    const lines = held([...drawn.slice(0, drawn.indexOf('🔻 Sell') + 1), sentence, ...drawn.slice(drawn.indexOf('Record'))]);
    expect(missingInOrder(lines, form.slice(from))).toEqual([                                               // 9 (DEC-1560)
      'Private equity', 'Commodities', 'Annuity',                                                               // DEC-2334 · 7 · 18
      'Bitcoin, Ether', 'and the rest — held at the value you set. ~9.00%/year historical benchmark.',
    ]);
  });
});

describe('Itemize v02', () => {
  const P = phones(NW + 'itemize_v02.html', [/<div class="input[^"]*">[\s\S]*?<\/div>/g, /<[a-z]+ class="amtIn[^"]*">[\s\S]*?<\/[a-z]+>/g]);   // 2
  const ItemizeScreen = require('../ItemizeScreen').default;
  const start = () => show(ItemizeScreen, { assetAccounts: [{ asset_id: 'chase', label: 'Chase', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 48000 }] }, { accountId: 'chase' });
  const place = (kind: string, placeholder: string, name: string, amount: string) => {
    fireEvent.press(screen.getByLabelText(kind));
    fireEvent.changeText(screen.getByPlaceholderText(placeholder), name);
    fireEvent.changeText(screen.getByPlaceholderText('0'), amount);
    fireEvent.press(screen.getByLabelText('Add this holding'));
  };
  const three = () => {
    place('Stock / Fund', 'Ticker or name (e.g. AAPL)', 'AAPL', '18400');
    place('Bond', 'Bond name (e.g. US Treasury 2032)', 'US Treasury 2032', '12000');
    place('Cash', 'Name', 'Chase sweep', '6000');
  };
  const noMaturity = (s: string) => s.replace('bond matures #-#-# $#', 'bond $#')                            // 10
    .replace('itemize chase ✕ add what', 'itemize chase add what')                                            // 11
    .replace('coupon % (optional) maturity date', 'tap to pick a date');                                      // 2, 10
  test('the drawing has its three phones', () => { expect(P).toHaveLength(3); });

  test('phone 1 · nothing placed — the whole balance is unallocated and Done waits', () => {
    const built = start();
    expect(firstDifference(norm(upTo(P[0], /^Done — replace with 0 holdings$/)), norm(built))).toBe('');
    expect(built).toEqual(expect.arrayContaining(['$48,000', '$0 of $48,000 itemized']));
  });

  test('phone 2 · three holdings placed, money left over — the note says where it goes', () => {
    start(); three();
    fireEvent.press(screen.getByLabelText('Stock / Fund'));
    const built = builtLines(screen.toJSON());
    expect(firstDifference(noMaturity(norm(upTo(P[1], /^Done — replace with 3 holdings$/))), norm(built))).toBe('');
    expect(built).toEqual(expect.arrayContaining(['$11,600', '$36,400 of $48,000 itemized', '$18,400', '$12,000', '$6,000']));   // $48,000 − $36,400
  });

  test('phone 3 · more placed than the account holds — it says the new total rather than correcting silently', () => {
    start(); three();
    place('Stock / Fund', 'Ticker or name (e.g. AAPL)', 'NVDA', '14200');
    fireEvent.press(screen.getByLabelText('Bond'));
    const built = builtLines(screen.toJSON());
    expect(firstDifference(noMaturity(norm(upTo(P[2], /^Done — replace with 4 holdings$/))), norm(built))).toBe('');
    expect(built).toEqual(expect.arrayContaining(['$2,600 over', '$50,600 of $48,000 itemized', '$14,200']));  // $50,600 − $48,000
  });
});

describe('Holding detail v02', () => {
  const P = phones(NW + 'holding-detail_v02.html');
  const HoldingDetailScreen = require('../HoldingDetailScreen').default;
  const day = (n: number) => iso(new Date(Date.now() - n * 86400e3));
  const months = (m: number) => { const n = new Date(); return iso(new Date(n.getFullYear(), n.getMonth() - m, n.getDate())); };
  const SPY = { ticker: 'SPY', points: [{ date: months(26), close: 400 }, { date: months(12), close: 500 }, { date: months(6), close: 560 }, { date: day(1), close: 610 }, { date: day(0), close: 612 }] };
  const live = { pricesFetchedAt: new Date().toISOString() };
  test('the drawing has its three phones', () => { expect(P).toHaveLength(3); });

  test('phone 1 · a priced holding — price, position, the market beside it, what was bought, and the tax if sold today', () => {
    const built = show(HoldingDetailScreen, { ...live,
      assetAccounts: [{ asset_id: 'fid', label: 'Fidelity', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true,
        positions: [{ position_id: 'p1', ticker: 'AAPL', label: 'Apple Inc.', kind: 'stocks_etf', lots: [
          { lot_id: 'l1', shares: 100, cost_per_share: 168, purchase_date: '2023-03-14' }, { lot_id: 'l2', shares: 40, cost_per_share: 192.5, purchase_date: '2026-01-09' }] }] }],
      priceCache: { AAPL: { ticker: 'AAPL', points: [{ date: months(26), close: 150 }, { date: months(12), close: 175 }, { date: months(6), close: 210 }, { date: day(1), close: 239.53 }, { date: day(0), close: 241.84 }] }, SPY },
      transactions: [{ id: 'd1', account_id: 'fid', type: 'DIVIDEND', ticker: 'AAPL', amount: 134.4, date: day(60) }],
    }, { account: 'fid', position: 'p1' });
    const want = norm(upTo(P[0], /^Activity$/))
      .replace('realized from sales $# from your recorded buys and sells (oldest shares sold first).', 'realized from sales $# — nothing sold')   // 13
      .replace('gain — short-term (under # yr)', 'gain — short-term (held # yr or less)')                                                     // 14
      // 15: the drawing's note was false — both figures are read from dividend-adjusted closes (DEC-4645, 2026-10-12;
      // the drawing carries a dated READ THIS FIRST line)
      .replace('price changes only — dividends not included', 'both include dividends and interest')
      // 16: the drawing's live wording — the price is the last close the app holds, so the band says so with its day
      // (2026-10-21, the lead's decision under tenets 1, 2 and 7; the drawing carries a dated READ THIS FIRST line)
      .replace('current price live', 'last close <date>');
    expect(want.split(' ').length).toBeGreaterThan(110);
    expect(firstDifference(want, norm(built))).toBe('');
    // 12: the drawing's own arithmetic, in the standard's precision
    expect(built).toEqual(expect.arrayContaining(['$241.84', '$33,858', '140 shares', '$175.00', '100 sh @ $168.00', '40 sh @ $192.50', '$24,500', '$134']));   // 140 × $241.84 = $33,857.60
    expect(built).toContain('▲ +$9,358 (+38.19%)');                                    // $33,857.60 − $24,500, over $24,500 — two decimals
    expect(built).toContain('▲ up $2.31 (0.96%) today');                               // $241.84 against $239.53
  });

  test('phone 2 · no live price — it shows what was paid, and says so', () => {
    const built = show(HoldingDetailScreen, { ...live,
      assetAccounts: [{ asset_id: 'cb', label: 'Coinbase', institution: 'Coinbase', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true,
        positions: [{ position_id: 'p1', ticker: 'BTC', label: 'Bitcoin', kind: 'crypto', lots: [{ lot_id: 'l1', shares: 0.5, cost_per_share: 56000, purchase_date: '2024-07-02' }] }] }],
      priceCache: {} }, { account: 'cb', position: 'p1' });
    expect(firstDifference(norm(upTo(P[1], /^Activity$/)), norm(built))).toBe('');
    expect(built).toEqual(expect.arrayContaining(['$28,000', '0.5 coins', '$56,000.00']));                    // 12
  });

  test('phone 3 · sold, and a window the prices cannot reach — both said, neither papered over', () => {
    const built = show(HoldingDetailScreen, { ...live,
      assetAccounts: [{ asset_id: 'et', label: 'E*TRADE', institution: 'E*TRADE', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true,
        positions: [{ position_id: 'p1', ticker: 'LCTX', label: 'Lucid Diagnostics', kind: 'stocks_etf', lots: [] }] }],
      priceCache: { LCTX: { ticker: 'LCTX', points: [{ date: months(14), close: 2.1 }, { date: months(6), close: 1.8 }, { date: day(1), close: 1.48 }, { date: day(0), close: 1.42 }] }, SPY },
    }, { account: 'et', position: 'p1', period: '2Y' });
    const want = norm(upTo(P[2], /^Activity$/)).replace('current price live', 'last close <date>');   // 16, as phone 1
    expect(want.split(' ').length).toBeGreaterThan(45);
    expect(firstDifference(want, norm(built))).toBe('');
    expect(built).toContain('Prices for this holding go back 14 months, so the 2-year figure covers 14 months — not two years.');
    expect(built).toContain('▼ down $0.06 (4.05%) today');                             // $1.42 against $1.48
  });
});

// A BOND WITH NO VALUE TODAY IS LEFT OUT OF THE AVERAGE YIELD, AND THE SCREEN SAYS WHICH (outside review,
// 2026-10-04). The drawing's three bonds all have a value, so its phones do not show this line.
test('Bonds · the summary names a bond the average yield leaves out, and says nothing when there is none', () => {
  const Bonds = require('../BondsScreen').default;
  const bondAt = (id: string, label: string, balance: number) => ({ asset_id: id, label, kind: 'bond', tax_bucket: 'TAXABLE', balance, face_value: 10000, coupon_rate: 0.04, maturity_date: '2031-06-15' });
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true, assetAccounts: [bondAt('a', 'Treasury note', 10000), bondAt('b', 'Muni bond', 0)] } as any);
  const first = render(<Bonds />);
  expect(screen.getByText('Average yield leaves out Muni bond — no value today.')).toBeOnTheScreen();
  first.unmount();
  useStore.setState({ assetAccounts: [bondAt('a', 'Treasury note', 10000)] } as any);
  render(<Bonds />);
  expect(screen.queryByText(/Average yield leaves out/)).toBeNull();
});

// 19–22: EVERY LINE HELD ABOVE THAT THE DRAWINGS DO NOT DRAW IS WRITTEN ON THE DRAWING, DATED (2026-10-20). A difference the
// test holds and the drawing does not state would be a difference nobody approved — so each is read off the drawing's own
// READ THIS FIRST table, by the words that carry it.
describe('the drawings say, on their face and dated, what the forms now show (19–22)', () => {
  const rowsOf = (f: string) => noteOf(NW + f).rows;
  test.each([
    ['add-account-by-hand_v02.html', [/2026-10-20 Held in \(phones 2, 3 and 4\) offers the app’s one list of six choices, in this order: Taxable, 401\(k\), Traditional IRA, Roth IRA, Roth 401\(k\), HSA/,
      /2026-10-20 Bonds \(phone 3\): a box for what you paid, marked optional, under the face value/,
      /2026-10-20 Bonds \(phone 3\), for a bond and not a CD: a Pays interest choice under the interest rate, Once a year or Twice a year/]],
    ['bonds_v02.html', [/2026-10-20 Editor \(phone 3\): the drawn Account choices are headed Held in and offer the app’s one list of six, in this order: Taxable, 401\(k\), Traditional IRA, Roth IRA, Roth 401\(k\), HSA/,
      /2026-10-20 DRAWING ERROR, phone 3 — the three Account chips are drawn with semicircle ends \(border-radius 100px\)[\s\S]*corrected to 12/,
      /2026-10-20 Editor \(phone 3\) and the list \(phone 1\)\. \(1\) A market value left blank stays blank[\s\S]*\(2\) A box for what you paid, marked optional[\s\S]*\(3\) Each bond’s heading on the list is the bond’s own name/,
      /2026-10-20 Editor \(phone 3\), for a bond and not a CD: a Pays interest choice under the coupon rate, Once a year or Twice a year/]],
    ['alternatives_v02.html', [/2026-10-20 Editor \(phone 3\): the drawn Account choices are headed Held in and offer the app’s one list of six/,
      /2026-10-20 DRAWING ERROR, phone 3 — the Type chips and the Account chips are drawn with semicircle ends \(border-radius 100px\)[\s\S]*corrected to 12/]],
  ] as [string, RegExp[]][])('%s', (file, lines) => {
    const rows = rowsOf(file);
    for (const l of lines) expect(rows).toMatch(l);
  });

  // 22: THE CORNER, which no word list can see. Each drawing draws its chips with semicircle ends; its line corrects the
  // radius to 12; the built chip is drawn at 12 (Radii.md) — the shape of Add an account's chips, drawn at 12 on its drawing.
  test('Bonds · drawn at 100px, corrected to 12 on the drawing, built at 12', () => {
    expect(noteOf(NW + 'bonds_v02.html').html).toMatch(/border-radius:100px;\s*padding:8px 12px;font-size:13px;font-weight:700;color:var\(--greenD\)">Taxable</);
    show(require('../BondsScreen').default, { assetAccounts: [{ asset_id: 'b1', label: 'US Treasury 2027', kind: 'bond', tax_bucket: 'TAXABLE', balance: 24650, face_value: 25000, coupon_rate: 0.0425, maturity_date: '2027-06-30' }] });
    fireEvent.press(screen.getByText('US Treasury 2027'));
    for (const w of SIX) expect(flatStyle(screen.getByLabelText(`Held in ${w}`)).borderRadius).toBe(12);
    expect(flatStyle(screen.getByLabelText('Pays interest twice a year')).borderRadius).toBe(12);
  });
  test('Alternatives · drawn at 100px, corrected to 12 on the drawing, built at 12', () => {
    expect(noteOf(NW + 'alternatives_v02.html').html).toMatch(/border-radius:100px;\s*padding:8px 12px;font-size:13px;font-weight:700;color:var\(--greenD\)">Taxable</);
    show(require('../OtherInvestmentsScreen').default, { assetAccounts: [] });
    fireEvent.press(screen.getAllByText('＋ Add an investment')[0]);
    for (const w of SIX) expect(flatStyle(screen.getByLabelText(`Held in ${w}`)).borderRadius).toBe(12);
    expect(flatStyle(screen.getByText('Crypto').parent!.parent!).borderRadius).toBe(12);   // the Type chips
  });
  test('Itemize · drawn at 20px, corrected to 12 on the drawing, built at 12', () => {
    const { html } = noteOf(NW + 'itemize_v02.html');
    expect(html).toMatch(/\.chip\s*\{[^}]*border-radius:20px/);
    expect(html).toMatch(/READ THIS FIRST \(2026-10-20, DEC-0231\):<\/b> the kind chips below[\s\S]*The radius is corrected to 12/);
    show(require('../ItemizeScreen').default, { assetAccounts: [{ asset_id: 'chase', label: 'Chase', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 48000 }] }, { accountId: 'chase' });
    for (const k of ['Stock / Fund', 'Bond', 'Option', 'Crypto', 'Cash']) expect(flatStyle(screen.getByLabelText(k)).borderRadius).toBe(12);
  });
  test('Add an account · the standard: drawn at 12 and built at 12', () => {
    expect(noteOf(NW + 'add-account-by-hand_v02.html').html).toMatch(/\.chip\s*\{[^}]*border-radius:12px/);
    show(require('../AddAccountScreen').default, { assetAccounts: [] });
    fireEvent.press(screen.getAllByText('Bonds')[0]);
    for (const w of SIX) expect(flatStyle(screen.getByLabelText(`Held in ${w}`)).borderRadius).toBe(12);
    expect(flatStyle(screen.getByLabelText('Pays interest once a year')).borderRadius).toBe(12);
  });
});

// 23: THE GAINS IF SOLD TODAY AND WHAT WAS PAID (2026-10-21). Four states the drawing does not draw — a purchase with no
// purchase date, a holding in a Roth IRA, an option on a broad-based index, no live price with a purchase whose price paid is
// not on record — and the spoken words. Each is written on the drawing's face as a dated READ THIS FIRST row, read here by
// the words that carry it; and the built page draws each in its own words, in order (src/screens/__tests__/
// holding_gains_if_sold_today.test.tsx holds every figure).
describe('Holding detail v02 · the rows of 2026-10-21, on the drawing and on the page (23)', () => {
  const HoldingDetailScreen = require('../HoldingDetailScreen').default;
  const months = (m: number) => { const n = new Date(); return iso(new Date(n.getFullYear(), n.getMonth() - m, n.getDate())); };
  const day = (n: number) => iso(new Date(Date.now() - n * 86400e3));
  const SPY = { ticker: 'SPY', points: [{ date: months(26), close: 400 }, { date: months(12), close: 500 }, { date: day(1), close: 610 }, { date: day(0), close: 612 }] };
  const px = (t: string, close: number) => ({ ticker: t, points: [{ date: months(26), close: close * 0.6 }, { date: months(12), close: close * 0.7 }, { date: day(1), close: close * 0.99 }, { date: day(0), close }] });
  const acct = (positions: any[], extra: any = {}) => ({ asset_id: 'fid', label: 'Fidelity', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true, positions, ...extra });
  const aapl = (second: string) => ({ position_id: 'p1', ticker: 'AAPL', label: 'Apple Inc.', kind: 'stocks_etf', lots: [
    { lot_id: 'l1', shares: 100, cost_per_share: 168, purchase_date: '2023-03-14' }, { lot_id: 'l2', shares: 40, cost_per_share: 192.5, purchase_date: second }] });
  const live = { pricesFetchedAt: new Date().toISOString() };
  const card = (built: string[]) => built.slice(built.indexOf('IF YOU SOLD TODAY'), built.indexOf('Record buy/sell'));

  test('the drawing carries the five rows, dated 2026-10-21', () => {
    const rows = noteOf(NW + 'holding-detail_v02.html').rows;
    const want = [
      /2026-10-21 IF YOU SOLD TODAY \S+ a purchase with no purchase date on record is in neither the long-term nor the short-term part/,
      /2026-10-21 IF YOU SOLD TODAY, for a holding inside an account taxed as pre-tax or tax-free/,
      /2026-10-21 IF YOU SOLD TODAY, for an option on a broad-based index \S+ SPX, SPXW, XSP, NDX, NDXP, RUT, MRUT, VIX, DJX, OEX or XEO/,
      /2026-10-21 NO LIVE PRICE \(phone B\) \S+ the large figure, what was paid, counts the same purchases as Total paid/,
      /2026-10-21 Spoken words \(what a screen reader says on this page; nothing drawn changes\)/,
    ];
    expect(want.filter((w) => !w.test(rows))).toEqual([]);
    expect(want).toHaveLength(5);
  });

  test('a purchase with no date: the long-term row, then the line for the undated purchase — no short-term row', () => {
    const built = show(HoldingDetailScreen, { ...live, assetAccounts: [acct([aapl('')])], priceCache: { AAPL: px('AAPL', 241.84), SPY } }, { account: 'fid', position: 'p1' });
    expect(card(built)).toEqual(['IF YOU SOLD TODAY', 'Gain — long-term (held over 1 yr)', '+$7,384',
      '$1,974 gain on 40 shares whose purchase date is not on record, so it is neither long-term nor short-term.']);
    expect(built).toContain('Date not on record');
  });

  test('a Roth IRA: one row, Gain, and the line saying why', () => {
    const built = show(HoldingDetailScreen, { ...live, assetAccounts: [acct([aapl('2026-01-09')], { kind: 'roth_ira', tax_bucket: 'ROTH' })], priceCache: { AAPL: px('AAPL', 241.84), SPY } }, { account: 'fid', position: 'p1' });
    expect(card(built)).toEqual(['IF YOU SOLD TODAY', 'Gain', '+$9,358',
      'Gains inside this account are not taxed as capital gains, so they are not split into long-term and short-term.']);
  });

  test('an SPX option: the shares in the brackets, and the line naming IRS Publication 550', () => {
    const spx = { position_id: 'p1', ticker: 'SPX', label: 'SPX call', kind: 'options', lots: [{ lot_id: 'l1', shares: 2, cost_per_share: 50, purchase_date: months(3) }] };
    const built = show(HoldingDetailScreen, { ...live, assetAccounts: [acct([spx])], priceCache: { SPX: px('SPX', 80), SPY } }, { account: 'fid', position: 'p1' });
    expect(card(built)).toEqual(['IF YOU SOLD TODAY', 'Gain — long-term (60%)', '+$3,600', 'Gain — short-term (40%)', '+$2,400',
      'An index option\'s gain is taxed 60% long-term and 40% short-term, however long it was held (IRS Publication 550).']);
  });

  test('no live price, 0.25 coins with no price paid: the large figure and Total paid read the same $28,000', () => {
    const btc = { position_id: 'p1', ticker: 'BTC', label: 'Bitcoin', kind: 'crypto', lots: [
      { lot_id: 'l1', shares: 0.5, cost_per_share: 56000, purchase_date: '2024-07-02' }, { lot_id: 'l2', shares: 0.25, cost_per_share: null, purchase_date: '2024-08-01' }] };
    const built = show(HoldingDetailScreen, { ...live, assetAccounts: [acct([btc], { asset_id: 'cb', label: 'Coinbase', institution: 'Coinbase' })], priceCache: {} }, { account: 'cb', position: 'p1' });
    expect(built[built.indexOf('NO LIVE PRICE — SHOWING WHAT YOU PAID') + 1]).toBe('$28,000');
    expect(built[built.indexOf('Total paid') + 1]).toBe('$28,000');
  });
});
