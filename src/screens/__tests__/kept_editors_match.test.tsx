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
 *  9. NOT MATCHED, AND RECORDED AS OPEN: the Alternatives editor's drawing offers "Private equity" and
 *     writes its own line under the kind. The build offers the kinds his ruling of 2026-08-04 left
 *     ("PE/HF out of phase 1") and its own line. The five drawn lines that are not on the form are
 *     pinned below, so the gap cannot change without this test saying so; it is a workplan row.
 * 10. Itemize: a bond's maturity is picked on the phone's own date control, which a test cannot
 *     drive, so the bond is placed without one and the drawn words "· matures 2032-05-15" are not held.
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
      const want = norm(upTo(P[k], /^Save$/)).replace('debt balance (optional)', 'mortgage balance (optional)');   // 15
      expect(want.split(' ').length).toBeGreaterThan(20);
      // 16: HIS RULE, 2026-10-04 (DEC-1926) — the form asks the one thing nothing else can tell it: which
      // property is the home lived in. Everything else about a property's use is read from the rent entered.
      expect(firstDifference(want, norm(builtLines(screen.toJSON())).replace(' is this the home you live in? yes no', ''))).toBe('');
    });
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
    const soonestFirst = [...seg.slice(0, t), ...seg.slice(c, add), ...seg.slice(t, a), ...seg.slice(a, c).filter((l) => !l.startsWith('* accrued')), ...star, ...seg.slice(add)];   // 5
    expect(firstDifference(norm(soonestFirst), norm(built))).toBe('');
    expect(built.indexOf('Chase 12-month CD')).toBeLessThan(built.indexOf('US Treasury 2027'));            // Feb 2027, then Jun 2027, then Mar 2030
    expect(built.indexOf('US Treasury 2027')).toBeLessThan(built.indexOf('Apple Corp 4.5%'));
    expect(built).toEqual(expect.arrayContaining(['$74,180', '3 bonds · face $75,000', '$3,163', '4.26%', '$1,063/year coupon', 'yield 4.31%', 'yield 4.61% *', 'yield 4.00%']));
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
    const joined = [seg.join(' ')
      .replace('When you enter it,', 'When you enter it,')];
    const form = builtLines(screen.toJSON()); const from = form.indexOf('Edit bond');
    expect(from).toBeGreaterThan(0);
    const formWords = norm(form.slice(from));
    const drawnWords = norm(joined).split(' ');
    let k = 0; for (const w of formWords.split(' ')) { if (w === drawnWords[k]) k += 1; }
    expect(drawnWords.slice(k, k + 12).join(' ')).toBe('');                                                  // 8: every drawn word, in order
    expect(form).toEqual(expect.arrayContaining(['Institution / account (optional)', 'Current value (blank = face value)', 'Save', 'Delete bond']));
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
    expect(firstDifference(norm(upTo(P[1], /^＋ Add an investment$/)), norm(built))).toBe('');
  });

  test('phone 3 · the editor — OPEN: five drawn lines are not on the form, and exactly those five', () => {
    show(OtherInvestmentsScreen, { assetAccounts: ALTS });
    fireEvent.press(screen.getByText('Bitcoin'));
    const typed = ['Bitcoin', 'Coinbase', '28000', 'amount sold (up to $28,000)', '‹ Back'];                 // 2
    const form = builtLines(screen.toJSON()); const from = form.indexOf('Edit investment');
    const drawn = upTo(P[2], /^Sold all of it/).filter((l) => !typed.includes(l));
    const sentence = drawn.slice(drawn.indexOf('🔻 Sell') + 1, drawn.indexOf('Record')).join(' ');           // one sentence in the build
    const lines = [...drawn.slice(0, drawn.indexOf('🔻 Sell') + 1), sentence, ...drawn.slice(drawn.indexOf('Record'))];
    expect(missingInOrder(lines, form.slice(from))).toEqual([                                               // 9
      'Private equity', 'Commodities', 'Annuity',
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
      .replace('gain — short-term (under # yr)', 'gain — short-term (held # yr or less)');                                                    // 14
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
    const want = norm(upTo(P[2], /^Activity$/));
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
