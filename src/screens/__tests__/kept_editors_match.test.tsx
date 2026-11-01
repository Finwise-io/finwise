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
 *  EVERY FIGURE, AND EVERY BOX (2026-10-27, FX-PF; the round-2 drawing match NW2-25 and G-1): each phone is compared word for word AND
 *  figure for figure (normExact, both ways), on the drawing's own day where a figure depends on it, and each drawn box is read against
 *  the box on screen. Until then the comparisons ran through norm(), which writes every figure as "$#": Holding detail matched its
 *  drawing while its household gave +61.23% beside +53.00%.
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
 * 10. Itemize: a bond's maturity is picked on the phone's own date control. SINCE 2026-10-27 (FX-PF, NW2-25) the test picks it on that
 *     control, as the phone does (its onChange), and the drawn maturity is held: "· matures May 15, 2032". Until then the bond was
 *     placed without one and the drawn words "· matures 2032-05-15" were not held.
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
 * 23. A MONTH ROW OPENS NOTHING (2026-10-24, Cash flow journey E2E-80; the Bill calendar drawing's READ THIS FIRST row of that
 *     date). Both phones end their foot line "Tap any row for that month's full detail." — month detail was retired on
 *     2026-10-02 and no row has a tap, so the sentence is not printed. Held: the foot line without it.
 * 24. ONE YEAR IN THE SPAN (2026-10-24, the lead's ruling on E2E-80; the same drawing's READ THIS FIRST row). Both phones head the
 *     table "Oct 2026 – Sep ’27 2027", the year twice — a typo copied from the build. The span is written as the one date writer
 *     writes a month (monthYearShown): "Oct 2026 – Sep 2027". Held: the drawn line with the year once.
 * 25. THE SELL SENTENCE NAMES THE BOX BY ITS LABEL (2026-10-25; Bonds v02's READ THIS FIRST row of that date). Phone 3's Sell box
 *     says edit “Current value” above; the box has been “Market value, as your statement shows it …” since 2026-10-09 (DEC-3390),
 *     so the sentence names it Market value. Held: the drawn sentence with Market value.
 * 26. THE TITLE, THEN THE BAR (2026-10-25; the Bonds and Alternatives rows of that date). Both drawings draw the title on its own
 *     line and the dark-green bar under it, edge to edge, square corners, the info dot white inside it. Words cannot see that, so
 *     the appearance is held on its own below. The rows on the drawings for 6, 8, 10 and 11 (and the top bar's 38 points, the
 *     one info dot, the yields to maturity on phone 1) are read off each drawing's face, dated 2026-10-25.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { norm, normExact, drawingLines, builtLines, firstDifference, missingInOrder } from '../../testing/mockMatch';

let mockParams: Record<string, string> = {};
// Look back fetches what it compares (2026-10-22): the price source answers nothing in this file, so no test reaches the network
jest.mock('../../services/marketData', () => ({ ...jest.requireActual('../../services/marketData'), fetchPriceSeries: async () => ({}) }));
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
/** WHAT EACH BOX ON SCREEN SHOWS, in order: its typed value, else its placeholder (2026-10-27, FX-PF; NW2-25 — the drawn boxes were
 *  stripped and never read). A drawn box is held by being found among these, in the drawn order. */
const boxesShown = (): string[] => screen.UNSAFE_root.findAll((n: any) => n.type === 'TextInput')
  .map((n: any) => String(n.props?.value || n.props?.placeholder || '').trim()).filter(Boolean);
const inOrder = (want: string[], got: string[]) => { let k = 0; for (const g of got) if (g === want[k]) k += 1; return want.slice(k); };
/** EVERY TEXT AND EVERY BOX ON SCREEN, IN ORDER, a box as what it shows in brackets (2026-10-31, FX-PF, NW3-32 / NW3-33): so an editor is
 *  compared whole — every line, every figure and every box — and not as a subset with its figures masked. */
const formLines = (): string[] => {
  const out: string[] = [];
  const text = (n: any): string => (n == null ? '' : typeof n === 'string' ? n : Array.isArray(n) ? n.map(text).join('') : (n.children ?? []).map(text).join(''));
  const walk = (n: any) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.type === 'TextInput') { const t = String(n.props?.value || n.props?.placeholder || '').trim(); if (t) out.push(`[${t}]`); return; }
    if (n.type === 'Text') { const t = text(n).replace(/\s+/g, ' ').trim(); if (t) out.push(t); return; }
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
};
const SIX = ['Taxable', '401(k)', 'Traditional IRA', 'Roth IRA', 'Roth 401(k)', 'HSA'];   // 19: the one list, in its order
const flatStyle = (node: any) => require('react-native').StyleSheet.flatten(node.props.style);

/** EXACT FIGURES, ON THE DRAWINGS' OWN DAY (2026-10-27, FX-CF-A; the round-2 drawing match, REC2-03): these two drawings were held
 *  through norm(), which writes every figure as "$#" — so a table whose Out read $4,200 where the drawing says $4,220 still matched,
 *  and only four figures were spot-checked beside it. Each phone is now held word for word AND figure for figure (normExact), both
 *  ways (firstDifference reads the whole stream, so a line dropped or added fails as surely as one changed), on 2026-10-02, the day
 *  both were approved: the Bill calendar's twelve months are Oct 2026 – Sep 2027 only on that day. */
const DRAWN_DAY = () => jest.useFakeTimers({ now: new Date('2026-10-02T12:00:00'),
  doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
describe('Bill calendar v02', () => {
  const yearOnce = (l: string) => l.replace(/ – (\w{3}) [’'](\d\d) (\d{4})/, ' – $1 $3');   // 24
  const P = phones('cashflow/moneykeel_pres_mock_bill-calendar_v02.html');
  const BillCalendarScreen = require('../BillCalendarScreen').default;
  beforeEach(DRAWN_DAY);
  afterEach(() => jest.useRealTimers());
  test('the drawing has its two phones', () => { expect(P).toHaveLength(2); });

  test('phone 1 · a working household, twelve months ahead — every figure as drawn', () => {
    // $9,000 a month at their own 20% is $7,200 in; $4,220 out, and a $3,600 bill that falls in April
    // the drawing auto-fills the box from the accounts, so its household holds a checking account — at $0, a balance on record, from
    // which the table and the verdict are projected (the drawing's row of 2026-10-26: with no cash on record nothing is projected)
    const built = show(BillCalendarScreen, { onboardingProfile: { status: 'employed', incomeSources: ['employment'], baseSalary: '9000', salaryFreq: 'monthly',
      taxMode: 'manual', manualTaxRate: '20', monthlySpending: '4220',
      spendCats: [{ id: 'everyday', label: 'Everyday', amount: 4220, bucket: 'flexible' }, { id: 'ins', label: 'Home insurance', amount: 3600, bucket: 'nonmonthly', months: [4], dueDay: 10 }] },
      assetAccounts: [{ asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'TAXABLE', balance: 0, asset_class: 'cash' }] });
    const want = normExact(upTo(P[0], /^A forward plan, not a promise/).map(yearOnce)).replace(/ tap any row for that month's full detail\.$/, '');   // 23
    expect(want.split(' ').length).toBeGreaterThan(120);
    expect(want).toContain('$32,160');                                    // the stream holds the figures, not "$#"
    expect(firstDifference(want, normExact(built))).toBe('');
    // worked by hand: each End is the last + $7,200 − Out — Oct 0 + 7,200 − 4,220 = 2,980 … Apr 17,880 + 7,200 − 7,820 = 17,260 … Sep 32,160
    expect(built.filter((l) => l === '+$7,200')).toHaveLength(12);
    expect(built.filter((l) => l === '−$4,220')).toHaveLength(11);
    expect(built).toContain('−$7,820');                                    // April: $4,220 + the $3,600 bill
    expect(built).toContain('Lowest point $2,980 — Oct.');
  });

  test('phone 2 · the first day, nothing entered — every figure as drawn', () => {
    const built = show(BillCalendarScreen, { onboardingProfile: {} });
    // the drawing's READ THIS FIRST row of 2026-10-25 (BC-02, tenet 3): with nothing entered there is no verdict — the drawn "OK — you
    // stay above zero in all 12 months · Lowest point $0" is a verdict on nothing, and the table's "Nothing entered yet" stands instead
    const want = normExact(upTo(P[1], /^A forward plan, not a promise/).map(yearOnce)).replace(/ tap any row for that month's full detail\.$/, '')   // 23
      .replace(/ ok — you stay above zero in all 12 months lowest point \$0 — oct\./, '')
      // and its row of 2026-10-26: with no cash balance on record the line under the box says so (it said "Auto-filled … ($0)")
      .replace("auto-filled from your accounts ($0) — the starting balance the table carries forward. edit it and the end column recalculates from there.",
        'no cash balance on record yet — enter what you have, and the table starts from it.')
      // and its row of 2026-10-31 (R12, BC3-01 — DRAWING ERROR, phone 2): with no cash on record no End is projected, so each drawn
      // "$0" End reads "—"; the twelve are counted, so the edit found every one
      .replace(/(\b(?:oct|nov|dec|jan '27|feb '27|mar '27|apr '27|may '27|jun '27|jul '27|aug '27|sep '27) — — )\$0\b/g, '$1—');
    expect(want.split(' ').length).toBeGreaterThan(100);
    expect(want).not.toMatch(/ok — you stay above zero|auto-filled/);   // both named changes found their drawn lines
    expect((normExact(upTo(P[1], /^A forward plan, not a promise/)).match(/ — — \$0\b/g) ?? []).length).toBe(12);   // the drawn Ends it replaced
    expect(firstDifference(want, normExact(built))).toBe('');
    // twelve months, each — in, — out, — at the end: nothing behind them (Q48), and nothing projected (R12)
    expect(built.filter((l) => l === '$0')).toHaveLength(0);
    expect(built.filter((l) => l === '—')).toHaveLength(36);
  });
});

describe('Monthly income v02', () => {
  const P = phones('cashflow/moneykeel_pres_mock_monthly-income_v02.html');
  const MonthlyIncomeScreen = require('../MonthlyIncomeScreen').default;
  beforeEach(DRAWN_DAY);
  afterEach(() => jest.useRealTimers());
  test('the drawing has its two phones', () => { expect(P).toHaveLength(2); });

  test('phone 1 · a retired household — every figure as drawn', () => {
    const built = show(MonthlyIncomeScreen, { onboardingProfile: { status: 'retired', incomeSources: ['retirement_income'], ri_ss: '2400', ri_pension: '1100' } });
    const want = normExact(upTo(P[0], /^Save$/));
    expect(want.split(' ').length).toBeGreaterThan(55);
    expect(want).toContain('$3,500/month');                               // $2,400 + $1,100, held as a figure
    expect(firstDifference(want, normExact(built))).toBe('');
  });

  test('phone 2 · the first day, nothing entered — every figure as drawn', () => {
    const built = show(MonthlyIncomeScreen, { onboardingProfile: { status: 'retired', incomeSources: [] } });
    const want = normExact(upTo(P[1], /^Save$/));
    expect(want).toContain('$0/month');
    expect(firstDifference(want, normExact(built))).toBe('');
  });
});

describe('Look back v01', () => {
  const P = phones('networth-and-performance/moneykeel_pres_mock_look-back_v01.html');
  const LookBackScreen = require('../LookBackScreen').default;
  const now = new Date(); const back = (m: number) => iso(new Date(now.getFullYear(), now.getMonth() - m, 1));
  const series = (a: number, b: number, from = 14) => ({ points: [{ date: back(from), close: a }, { date: back(Math.floor(from / 2)), close: (a + b) / 2 }, { date: iso(now), close: b }] });
  const HELD = [{ asset_id: 'b', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 60000, positions: ['BND', 'VTI', 'QQQ'].map((t, i) => (
    { position_id: `p${i}`, ticker: t, kind: t === 'BND' ? 'fixed_income' : 'stocks', lots: [{ lot_id: `l${i}`, shares: 100, cost_per_share: 100, purchase_date: '2024-01-01' }] })) }];
  // 2: the amount sits in an input box, which the reader does not read — so the drawn "20,000" is taken out of the words and
  // held on the box itself: since 2026-10-25 (MM-PF D16) the box reads "20,000" with its separator, as drawn (it read "20000")
  // (the money-box row of 2026-10-27, DEC-8385: nothing seen changes — the $ beside the box, '20,000' in it)
  const noTyped = (lines: string[]) => lines.filter((l) => l !== '20,000');
  const amountBox = () => screen.getByLabelText('Amount to look back on');
  const fourMore = (s: string) => s.replace(/ agg gld btc aor/g, '');                                          // 3: the four yardsticks he added
  test('the drawing has its two phones', () => { expect(P).toHaveLength(2); });

  test('state A · with prices — what actually happened, in three lines', () => {
    const built = show(LookBackScreen, { onboardingProfile: {}, assetAccounts: HELD, priceCache: { BND: { ticker: 'BND', ...series(100, 102.5) }, SPY: { ticker: 'SPY', ...series(100, 116) } } });
    // EVERY FIGURE AS DRAWN (2026-10-27, FX-PF; NW2-25 — it was norm(), "$#" for every figure): $20,000 × 1.025 = $20,500, × 1.16 =
    // $23,200, $2,700 apart; the two percents to two decimals, as the drawing's row of 2026-10-25 writes them (+2.50%, +16.00%)
    const want = normExact(noTyped(upTo(P[0], /^Real past prices/))).replace('(up $500, +2.5%)', '(up $500, +2.50%)').replace('(up $3,200, +16.0%)', '(up $3,200, +16.00%)');
    expect(want.split(' ').length).toBeGreaterThan(45);
    expect(want).toContain('$20,500');
    expect(want).toContain('+16.00%');                                                                         // both replacements found their drawn words
    expect(firstDifference(want, fourMore(normExact(built)))).toBe('');
    expect(built.slice(built.indexOf('From') + 1, built.indexOf('When'))).toEqual(                                // 3
      ['BND', 'VTI', 'QQQ', 'AGG', 'GLD', 'BTC', 'AOR', 'To', 'SPY', 'VTI', 'QQQ', 'AGG', 'GLD', 'BTC', 'AOR']);
    expect(built).toContain('Left in BND it became $20,500 (up $500, +2.50%)');                                 // $20,000 × 1.025 — a percent to two decimals (Q49)
    expect(built).toContain('Moved to SPY it would be $23,200 (up $3,200, +16.00%)');                           // $20,000 × 1.16
    expect(built).toContain('Difference: $2,700 more if you had moved.');
    expect(P[0]).toContain('20,000');                                                                        // what the drawing's box reads
    expect(amountBox().props.value).toBe('20,000');                                                          // D16: and the box, as drawn
  });

  test('state A · the amount box takes typing and keeps its separator; the figures follow what was typed (MM-PF D16)', () => {
    show(LookBackScreen, { onboardingProfile: {}, assetAccounts: HELD, priceCache: { BND: { ticker: 'BND', ...series(100, 102.5) }, SPY: { ticker: 'SPY', ...series(100, 116) } } });
    fireEvent.changeText(amountBox(), '35000');
    expect(amountBox().props.value).toBe('35,000');
    // $35,000 × 1.025 = $35,875; × 1.16 = $40,600; the difference $4,725
    expect(builtLines(screen.toJSON())).toContain('Left in BND it became $35,875 (up $875, +2.50%)');
    fireEvent.changeText(amountBox(), '35,0001');                                                            // a digit typed after the comma
    expect(amountBox().props.value).toBe('350,001');
    fireEvent.changeText(amountBox(), '');
    expect(amountBox().props.value).toBe('');
    expect(builtLines(screen.toJSON())).toContain('Enter an amount to look back on.');
  });

  test('state B · prices that do not reach back that far — it says what is missing and what to do', () => {
    const built = show(LookBackScreen, { onboardingProfile: {}, assetAccounts: HELD, priceCache: { BND: { ticker: 'BND', ...series(100, 102.5, 4) }, SPY: { ticker: 'SPY', ...series(100, 116, 4) } } });
    const want = normExact(noTyped(upTo(P[1], /pick a shorter window\.$/)));
    expect(firstDifference(want, fourMore(normExact(built)))).toBe('');
    expect(built.join(' ')).not.toMatch(/Difference:/);                                                         // nothing invented
  });
});

const NW = 'networth-and-performance/moneykeel_pres_mock_';

describe('Add an account, by hand v02', () => {
  // 2: what is typed sits in a box — except the date button, which the build prints as words
  const P = phones(NW + 'add-account-by-hand_v02.html', [/<div class="in">(?!Tap to pick a date)[\s\S]*?<\/div>/g]);
  const AddAccountScreen = require('../AddAccountScreen').default;
  /** each phone's drawn boxes, as drawn (what each box shows), phone by phone */
  const BOXES = ((html: string) => {
    const segs = html.split('<span>9:41</span>').slice(1);
    return segs.map((seg) => [...seg.matchAll(/<div class="in">(?!Tap to pick a date)([\s\S]*?)<\/div>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()).filter(Boolean));
  })(require('fs').readFileSync(require('path').join(__dirname, '..', '..', '..', 'MoneyKeel/documents/' + NW + 'add-account-by-hand_v02.html'), 'utf8'));
  // on the drawn day: its "Value as of" reads Sep 14, 2026, a figure that depends on today's date (normExact, 2026-10-27)
  beforeEach(() => jest.useFakeTimers({ now: new Date('2026-09-14T12:00:00'),
    doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] }));
  afterEach(() => jest.useRealTimers());
  test('the drawing has its six phones — one for each kind of account', () => { expect(P).toHaveLength(6); });
  test.each([['Cash', 0], ['Stocks / Funds', 1], ['Bonds', 2], ['Alternatives', 3], ['Real estate', 4], ['Debt', 5]] as [string, number][])(
    'phone %#: %s — the questions that kind asks, and no others', (kind, k) => {
      show(AddAccountScreen, { assetAccounts: [] });
      fireEvent.press(screen.getAllByText(kind)[0]);
      // 17: HIS RULING, 2026-10-06 — the drawn "Private stake" chip is not offered in this phase
      // 18: DEC-4529 — the drawn chip "Annuity" reads "Annuities" (the drawing's READ THIS FIRST line of 2026-10-20)
      // NW2-25 (2026-10-27, FX-PF): the drawn boxes, read against the boxes on screen, in order — they were stripped and never read
      // THE ROW OF 2026-10-31 (R16, NW3-07, FX-NW): a box nobody filled opens empty, so the grey figures the phones draw are not on screen —
      // '$0', '0.0', '100', '$10,000', '4.5', '7.0', '$150'; the named examples ('Chase checking', 'Chase', 'Car loan') stay
      const R16 = new Set(['$0', '0.0', '100', '$10,000', '4.5', '7.0', '$150']);
      const drawnBoxes = BOXES[k].filter((b) => !R16.has(b));
      expect(drawnBoxes.length).toBeGreaterThanOrEqual(1);
      expect(inOrder(drawnBoxes, boxesShown())).toEqual([]);
      expect(boxesShown().filter((b) => R16.has(b) || /^\$?[\d,.]+$/.test(b))).toEqual([]);   // and no figure stands in an empty box
      // and every drawn word and figure, exact (normExact; it was norm(), "$#" for every figure)
      const want = normExact(upTo(P[k], /^Save$/)).replace('debt balance (optional)', 'mortgage balance (optional)').replace(' private stake', '').replace(' annuity ', ' annuities ')   // 15, 17, 18
        .replace(' held in taxable 401(k) / ira roth ', ` held in ${normExact(SIX)} `)                                                       // 19
        .replace('face value (optional) interest rate % (optional) matures', 'face value (optional) what you paid (optional) interest rate % (optional) pays interest once a year twice a year matures')   // 20, 21
        .replace(' annuities other held in', ' annuities options other held in');   // the one list of five kinds (the row of 2026-10-31, NW3-08, FX-NW)
      expect(want.split(' ').length).toBeGreaterThan(20);
      // 16: HIS RULE, 2026-10-04 (DEC-1926) — the form asks the one thing nothing else can tell it: which
      // property is the home lived in. Everything else about a property's use is read from the rent entered.
      expect(firstDifference(want, normExact(builtLines(screen.toJSON())).replace(' is this the home you live in? yes no', ''))).toBe('');
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
  // the one list of five (the row of 2026-10-31 on Add an account v02, NW3-08, FX-NW): Options joins, in the editor's order
  expect(built.slice(from + 1, from + 6)).toEqual(['Crypto', 'Gold / commodities', 'Annuities', 'Options', 'Other']);
  expect(built).not.toContain('Annuity');
  // the Alternatives editor offers the same word for the same kind
  const OtherInvestmentsScreen = require('../OtherInvestmentsScreen').default;
  show(OtherInvestmentsScreen, { assetAccounts: [] });
  fireEvent.press(screen.getAllByText('＋ Add an investment')[0]);
  expect(builtLines(screen.toJSON())).toContain('Annuities');
  // and the drawing says so on its face, dated
  const note = require('fs').readFileSync(require('path').join(__dirname, '..', '..', '..', 'MoneyKeel/documents/' + NW + 'add-account-by-hand_v02.html'), 'utf8');
  expect(note).toMatch(/the chip [“‘]Annuity[”’] should read <b>[“‘]Annuities[”’]<\/b>[\s\S]*Line added 2026-10-20\./);   // either mark (R17, 2026-10-31)
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
    // THE ROW OF 2026-10-27 (NW2-14, Bonds v02 READ THIS FIRST): Apple Corp's Pays interest was never chosen, so the note says the estimate
    // takes it as once a year, after his sentence (DEC-3390, kept word for word)
    const note = star.map(() => '* Added estimated $193 in accrued interest to bond value at 4.5% coupon for 206 days to calculate YTM. If this is not accurate, enter actual accrued interest. How often it pays is not entered, so the estimate takes it as once a year.');
    const soonestFirst = [...seg.slice(0, t), ...seg.slice(c, add), ...seg.slice(t, a), ...apple, ...note, ...seg.slice(add)];   // 5
    expect(firstDifference(norm(soonestFirst), norm(built))).toBe('');
    expect(built.indexOf('Chase 12-month CD')).toBeLessThan(built.indexOf('US Treasury 2027'));            // Feb 2027, then Jun 2027, then Mar 2030
    expect(built.indexOf('US Treasury 2027')).toBeLessThan(built.indexOf('Apple Corp 4.5%'));
    expect(built).toEqual(expect.arrayContaining(['$74,180', '3 bonds · face $75,000', '$3,163', '4.26%', '$1,063/year coupon', 'yield 4.31%', 'yield 4.61%', 'yield 4.00%']));
  });

  test('phone 1 · ON THE DRAWN DAY, Oct 1, 2026 — every figure as drawn, or as its rows give it (2026-10-27, FX-PF; NW2-25)', () => {
    jest.useFakeTimers({ now: new Date('2026-10-01T12:00:00'), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    try {
      const built = show(BondsScreen, { assetAccounts: BONDS });
      const seg = upTo(P[0], /Yield to maturity is an estimate\.$/);
      const at = (name: string) => seg.indexOf(name);
      const [t, a, c, add] = [at('US Treasury 2027'), at('Apple Corp 4.5%'), at('Chase 12-month CD'), at('＋ Add a bond')];
      // each place the drawing is not the design, by its dated row — every one must find its drawn line:
      //   5 (DEC-1558) soonest maturity first · 2026-10-11 whole years left on Oct 1, 2026: the CD 123 days → 0y, the Treasury 272 → 1y,
      //   Apple 1,261 → 3y · 2026-10-25 the yields to maturity on the drawn day: Treasury ((25,000 + 1,062.50) ÷ 24,650)^(1 ÷ 0.745) − 1 =
      //   7.76%, Apple 5.25% · DEC-3390 the star moves to the yield to maturity, with his sentence: Apple's accrued 20,000 × 4.5% × 200 ÷
      //   365 = $493 for the 200 days since Mar 15 · NW2-14 (2026-10-27) how often it pays, not chosen, is said
      const LINE: Record<string, string> = {
        'face $25,000 · 4.25% coupon · matures Jun 30, 2027 · 2y': 'face $25,000 · 4.25% coupon · matures Jun 30, 2027 · 1y',
        'face $20,000 · 4.50% coupon · matures Mar 15, 2030 · 4y': 'face $20,000 · 4.50% coupon · matures Mar 15, 2030 · 3y',
        'face $30,000 · 4.00% coupon · matures Feb 1, 2027 · 1y': 'face $30,000 · 4.00% coupon · matures Feb 1, 2027 · 0y',
        'Yield to maturity: 4.95%': 'Yield to maturity: 7.76%', 'Yield to maturity: 5.12%': 'Yield to maturity: 5.25% *', 'yield 4.61% *': 'yield 4.61%',
        '* accrued interest not entered — the yield uses the price as you entered it': '* Added estimated $493 in accrued interest to bond value at 4.5% coupon for 200 days to calculate YTM. If this is not accurate, enter actual accrued interest. How often it pays is not entered, so the estimate takes it as once a year.',
      };
      for (const k of Object.keys(LINE)) expect(seg.includes(k) ? k : `NOT FOUND: ${k}`).toBe(k);
      const apple = seg.slice(a, c).map((l) => LINE[l] ?? l);
      const designed = [...seg.slice(0, t), ...seg.slice(c, add), ...seg.slice(t, a), ...apple, ...seg.slice(add)].map((l) => LINE[l] ?? l);   // 5
      expect(firstDifference(normExact(designed), normExact(built))).toBe('');
    } finally { jest.useRealTimers(); }
  });

  test('phone 2 · the first day — a real $0, what belongs here, and one button', () => {
    const built = show(BondsScreen, { assetAccounts: [] }).filter((l) => l !== 'Nothing entered yet. Add a bond ›');   // 6
    expect(firstDifference(normExact(upTo(P[1], /^＋ Add a bond$/)), normExact(built))).toBe('');   // exact: its $0 as drawn (2026-10-27)
    expect(show(BondsScreen, { assetAccounts: [] })).toContain('Nothing entered yet. Add a bond ›');
  });

  test('phone 3 · the editor — every drawn line is on the form, in the drawn order', () => {
    // the drawn editor's accrued-interest box is empty (its placeholder shows), so the Treasury opened here has none typed — the 0
    // the list's household types for phone 1 would show as "0" in the box (NW2-25: the boxes are read now, not stripped)
    show(BondsScreen, { assetAccounts: BONDS.map((b) => (b.asset_id === 'b1' ? (({ accrued_interest: _typed, ...rest }) => rest)(b) : b)) });
    fireEvent.press(screen.getByText('US Treasury 2027'));
    const typed = ['US Treasury 2027', '25000', '4.25', 'interest earned since the last coupon, if you know it', 'amount sold (up to $24,650)'];   // 2
    // NW2-25: each drawn box, read, in order — a money box as its row of 2026-10-27 says it is shown (DEC-8385: '$25,000' where
    // '25000' is drawn); the rate box keeps its plain 4.25
    expect(noteOf(NW + 'bonds_v02.html').rows).toMatch(/Every money box on this screen shows its figure the way a figure is printed/);
    expect(inOrder(typed.map((t) => (t === '25000' ? '$25,000' : t)), boxesShown())).toEqual([]);
    const seg = upTo(P[2], /^Sold the whole position/).filter((l) => !typed.includes(l) && l !== '‹ Back');
    // the drawing's markup breaks two sentences across lines; the build prints each as one
    // his ruling DEC-3390 on top of the drawing (2026-10-09, noted at its top): the value field says it is the
    // statement's market value, without accrued interest
    const joined = [seg.join(' ')
      .replace('When you enter it,', 'When you enter it,')
      .replace('Current value (blank = face value)', 'Market value, as your statement shows it — without accrued interest (blank = what you paid, else face value)')   // 20
      .replace("what it's worth now", 'the value on your statement')
      .replace('Account Taxable Trad IRA / 401k Roth', `Held in ${SIX.join(' ')}`)                                                       // 19
      .replace('edit “Current value” above.', 'edit “Market value” above.')];                                                             // 25
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

  // THE EDITOR WHOLE, EVERY LINE, FIGURE AND BOX (2026-10-31, FX-PF, NW3-32 / NW3-33): the drawn phone with each dated row applied, in
  // its place, compared both ways, exact. A box is in brackets as it shows: the money boxes per the row of 2026-10-27 (DEC-8385),
  // ‘$25,000’ where ‘25000’; the face value, the coupon rate and the market value as the Treasury holds them (25,000; 4.25%; $24,650).
  test('phone 3 · the editor, whole — every line, every figure and every box, exact, both ways', () => {
    show(BondsScreen, { assetAccounts: BONDS.map((b) => (b.asset_id === 'b1' ? (({ accrued_interest: _typed, ...rest }) => rest)(b) : b)) });
    fireEvent.press(screen.getByText('US Treasury 2027'));
    const rows = noteOf(NW + 'bonds_v02.html').rows;
    const ROW: [RegExp, string][] = [
      [/the form also asks Institution \/ account \(optional\) and Value as of, and ends in Save \(Add bond for a new bond\) and Delete bond/, 'Institution, Value as of, Save, Delete bond (2026-10-25)'],
      [/one line the phone does not draw: ‘Held inside a brokerage or bank account\?/, 'the line under Institution (2026-10-27)'],
      [/a Pays interest choice under the coupon rate, Once a year or Twice a year/, 'Pays interest (2026-10-20)'],
      [/Every money box on this screen shows its figure the way a figure is printed/, 'money boxes (2026-10-27)'],
    ];
    for (const [r, what] of ROW) expect(r.test(rows) ? what : `NO ROW: ${what}`).toBe(what);
    const sentence = (from: string, to: string, d: string[]) => d.slice(d.indexOf(from), d.indexOf(to) + 1).join(' ');
    const d = upTo(P[2], /^Sold the whole position/);
    const designed = [
      'Edit bond', 'Name / issuer', '[US Treasury 2027]',
      'Institution / account (optional)', '[e.g. Chase, Fidelity, Schwab]',
      'Held inside a brokerage or bank account? Add it here — if that account already has a balance, we’ll ask whether this bond is part of it so nothing is double-counted.',
      'Face (par) value', '[$25,000]', 'Coupon rate (% per year)', '[4.25]', 'Pays interest', 'Once a year', 'Twice a year',
      'Accrued interest (optional)', `[${d[d.indexOf('Accrued interest (optional)') + 1]}]`, sentence('When you enter', 'as you entered it — and says so.', d),
      'Maturity date', 'Jun 30, 2027',
      // 20 (DEC-3390, DEC-0281): the market value box, blank meaning what you paid, then what you paid; Value as of (2026-10-25)
      'Market value, as your statement shows it — without accrued interest (blank = what you paid, else face value)', '[$24,650]', 'What you paid (optional)',
      'Value as of', 'Tap to pick a date',
      '~$1,063/year in coupon income.',                                                                                         // 25,000 × 4.25%
      'Held in', ...SIX,                                                                                                          // 19
      '🔻 Sell', sentence('Sold this bond', 'close the position. To just re-mark its price, edit “Current value” above.', d).replace('edit “Current value” above.', 'edit “Market value” above.'),   // 25
      `[${d[d.indexOf('Record') - 1]}]`, 'Record', 'Sold the whole position →',
      'Save', 'Delete bond',
    ];
    expect(designed).toContain('[amount sold (up to $24,650)]');                                                                // the drawn box, read from the drawing
    const form = formLines(); const from = form.indexOf('Edit bond');
    expect(from).toBeGreaterThan(0);
    expect(firstDifference(normExact(designed), normExact(form.slice(from)))).toBe('');
  });
});

// 26: THE TITLE, THEN THE BAR, EDGE TO EDGE, THE DOT WHITE INSIDE IT — read off each drawing's own CSS and the rendered styles.
describe('Bonds v02 and Alternatives v02 · the title on its own line, the bar under it edge to edge, the dot inside it (26)', () => {
  const { Colors } = require('../../utils/theme');
  const cases: [string, string, string, string, any[]][] = [
    ['bonds_v02.html', 'Bonds', 'BONDS & CDS', '../BondsScreen', [{ asset_id: 'b1', label: 'US Treasury 2027', kind: 'bond', tax_bucket: 'TAXABLE', balance: 24650, face_value: 25000, coupon_rate: 0.0425, maturity_date: '2027-06-30' }]],
    ['alternatives_v02.html', 'Alternatives', 'ALTERNATIVES', '../OtherInvestmentsScreen', [{ asset_id: 'a1', label: 'Bitcoin', institution: 'Coinbase', kind: 'crypto', tax_bucket: 'TAXABLE', balance: 28000 }]],
  ];
  test.each(cases.flatMap(([f, t, b, m, accts]) => [[f, t, b, m, accts, 'with holdings'], [f, t, b, m, [], 'the first day']]) as any[])(
    '%s · %s · %s', (file: string, title: string, bar: string, mod: string, accts: any[]) => {
      const { html } = noteOf(NW + file);
      // the drawing: content padded 20, the bar taken back 20 on each side, square corners, its dot white
      expect(html).toMatch(/\.content\{padding:20px\}/);
      expect(html).toMatch(/\.band\{background:var\(--greenDeep\);padding:8px 12px;margin:0 -20px 4px;/);
      expect(html).toMatch(/<p class="h1s">[^<]+<\/p>\s*<div class="band"><span class="bandT">[^<]+<\/span><span class="dot">i<\/span><\/div>/);
      show(require(mod).default, { assetAccounts: accts });
      const built = builtLines(screen.toJSON());
      expect(built.indexOf(title)).toBeGreaterThanOrEqual(0);
      expect(built.indexOf(title)).toBeLessThan(built.indexOf(bar));                                    // the title, then the bar
      const st = (n: any) => flatStyle(n) ?? {};
      const titleNode = screen.getAllByText(title).find((n: any) => st(n).fontSize === 20)!;
      expect(st(titleNode)).toMatchObject({ fontSize: 20, fontWeight: '800' });
      for (let a: any = titleNode.parent, k = 0; a && k < 4; a = a.parent, k += 1) expect(st(a).flexDirection).not.toBe('row');   // on its own line
      let band: any = screen.getByText(bar);
      while (band && st(band).backgroundColor !== Colors.primaryDeep) band = band.parent;
      expect(band).toBeTruthy();
      expect(st(band)).toMatchObject({ paddingHorizontal: 12, borderTopLeftRadius: 0, borderTopRightRadius: 0 });
      expect(st(band).borderRadius ?? 0).toBe(0);                                                        // square corners
      let wrap: any = band.parent; while (wrap && st(wrap).marginHorizontal == null) wrap = wrap.parent;
      expect(st(wrap).marginHorizontal).toBe(-20);                                                       // out through the content's 20
      const dot = screen.getByLabelText(/^About /);
      let up: any = dot; while (up && up !== band) up = up.parent;
      expect(up).toBe(band);                                                                             // the dot is inside the bar
      expect(st(dot).color).toBe(Colors.white);
    });
});

describe('Bonds v02 · phone 1, the yields to maturity on the drawing’s own day, as its row of 2026-10-25 gives them', () => {
  const { theBonds } = require('../../../MoneyKeel/functions/networth-and-performance/bonds');
  const DRAWN = [
    { asset_id: 'b1', label: 'US Treasury 2027', kind: 'bond', tax_bucket: 'TAXABLE', balance: 24650, face_value: 25000, coupon_rate: 0.0425, maturity_date: '2027-06-30', accrued_interest: 0 },
    { asset_id: 'b2', label: 'Apple Corp 4.5%', kind: 'bond', tax_bucket: 'TAXABLE', balance: 19530, face_value: 20000, coupon_rate: 0.045, maturity_date: '2030-03-15' },
    { asset_id: 'b3', label: 'Chase 12-month CD', kind: 'bond', tax_bucket: 'TAXABLE', balance: 30000, face_value: 30000, coupon_rate: 0.04, maturity_date: '2027-02-01', accrued_interest: 0 },
  ];
  const ytm = (label: string, d: string) => `${(theBonds({ accounts: DRAWN, today: new Date(`${d}T12:00:00`) }).rows.find((r: any) => r.label === label).yieldToMaturity * 100).toFixed(2)}%`;
  test('Treasury 7.76% on Oct 1, 2026 (8.51% on Oct 24, 8.55% on Oct 25), Apple 5.25%, the CD 4.00% — the figures the row writes', () => {
    const { rows } = noteOf(NW + 'bonds_v02.html');
    const line = rows.slice(rows.indexOf('2026-10-25 DRAWING ERROR, phone 1 — the yields to maturity'));
    expect(line.length).toBeGreaterThan(400);
    // (($25,000 + $1,062.50) ÷ $24,650)^(1 ÷ (272 ÷ 365)) − 1: the coupon at maturity, $0 accrued entered
    expect(ytm('US Treasury 2027', '2026-10-01')).toBe('7.76%');
    expect(((26062.5 / 24650) ** (365 / 272) - 1) * 100).toBeCloseTo(7.764, 2);
    expect(ytm('US Treasury 2027', '2026-10-24')).toBe('8.51%');
    expect(ytm('US Treasury 2027', '2026-10-25')).toBe('8.55%');
    expect(ytm('Apple Corp 4.5%', '2026-10-01')).toBe('5.25%');
    expect(ytm('Chase 12-month CD', '2026-10-01')).toBe('4.00%');
    for (const f of ['7.76%', '8.51%', '8.55%', '5.25%', '4.00%', '4.95%', '5.12%']) expect(line).toContain(f);
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

  test('phone 1 · with holdings — the total, its share, and a row for each — every figure as drawn, or as its row of 2026-10-20 gives it', () => {
    // EXACT (2026-10-27, FX-PF; NW2-25 — it was norm(), "$#" for every figure). Fund III saved before private equity left the app keeps
    // its kind, so the drawn figures stand where they are the app's: $61,500 = 28,000 + 25,000 + 8,500, 12% of $512,500. The rates,
    // the blend and the growth are the row's (18, DEC-4529): (28,000 × 8.00% + 25,000 × 13.00% + 8,500 × 8.20%) ÷ 61,500 = 6,187 ÷ 61,500
    // = 10.06%, $6,187 — the row's own figures for the holding kept as private equity.
    const built = show(OtherInvestmentsScreen, { assetAccounts: ALTS });
    const fix: [string, string][] = [['exp. return 7.32% est. growth /year $4,502', 'exp. return 10.06% est. growth /year $6,187'],
      ['crypto ~9.00%/year expected', 'crypto ~8.00%/year expected'], ['private equity ~7.00%/year expected', 'private equity ~13.00%/year expected'],
      ['commodities ~3.50%/year expected', 'gold / commodities ~8.20%/year expected'],                                        // 7, 18
      // the share to two decimals, worked by the door (the row of 2026-10-31, NW3-06, FX-NW): $61,500 ÷ $512,500 = 12.00%
      ['3 holdings 12% of your investable assets', '3 holdings 12.00% of your investable assets']];   // as normExact reads it: lower case, no ·
    let want = normExact(upTo(P[0], /not guarantees\.$/));
    for (const [d, w] of fix) { expect(want.includes(d) ? d : `NOT FOUND: ${d}`).toBe(d); want = want.split(d).join(w); }
    expect(want.split(' ').length).toBeGreaterThan(45);
    expect(firstDifference(want, normExact(built))).toBe('');
    expect(built).toEqual(expect.arrayContaining(['$61,500', '3 holdings · 12.00% of your investable assets', '$28,000', '$25,000', '$8,500']));   // $28,000 + $25,000 + $8,500; ÷ $512,500 = 12.00%
  });

  test('phone 2 · the first day', () => {
    const built = show(OtherInvestmentsScreen, { assetAccounts: [] }).filter((l) => l !== 'Nothing entered yet. Add an investment ›');   // 6
    // 17: HIS RULING, 2026-10-06 — private equity and hedge funds are not offered in this phase
    expect(firstDifference(normExact(upTo(P[1], /^＋ Add an investment$/)).replace('crypto, private equity, hedge funds, commodities', 'crypto, commodities'), normExact(built))).toBe('');   // exact: its $0 as drawn (2026-10-27)
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
    // NW2-25: each drawn box, read, in order — the value box as its row of 2026-10-27 says a money box is shown ('$28,000')
    expect(noteOf(NW + 'alternatives_v02.html').rows).toMatch(/Every money box on this screen shows its figure the way a figure is printed/);
    expect(inOrder(typed.slice(0, 4).map((t) => (t === '28000' ? '$28,000' : t)), boxesShown())).toEqual([]);
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

  // THE EDITOR WHOLE, EVERY LINE, FIGURE AND BOX (2026-10-31, FX-PF, NW3-32 / NW3-33): the drawn phone with each ruling and dated row
  // applied in its place, compared both ways, exact — it was held as a subset with its figures masked.
  test('phone 3 · the editor, whole — every line, every figure and every box, exact, both ways', () => {
    show(OtherInvestmentsScreen, { assetAccounts: ALTS });
    fireEvent.press(screen.getByText('Bitcoin'));
    const rows = noteOf(NW + 'alternatives_v02.html').rows;
    for (const [r, what] of [[/DEC-1560 keeps the kinds and the line under the kind/, 'the kinds and the hint (DEC-1560)'],
      [/Held in and offer the app’s one list of six/, 'Held in (19)'], [/the form also asks Value as of, and ends in Save \(Add for a new holding\) and Delete/, 'Value as of, Save, Delete (2026-10-25)'],
      [/Every money box on this screen shows its figure the way a figure is printed/, 'money boxes (2026-10-27)']] as [RegExp, string][]) expect(r.test(rows) ? what : `NO ROW: ${what}`).toBe(what);
    const d = upTo(P[2], /^Sold all of it/);
    const sentence = d.slice(d.indexOf('Sold this (or'), d.indexOf('lower or close the position. To re-mark its price, edit “Current value” above.') + 1).join(' ');
    const designed = [
      'Edit investment', 'Type',
      // 9 (DEC-1560, "Rest - keep it"): the kinds the app offers — crypto, then Gold / commodities (7) and Annuities (18) as the list of
      // kinds names them, Options and Other; no Private equity (DEC-2334) — and the app's own line under the kind, with crypto's 8.00%
      'Crypto', 'Gold / commodities', 'Annuities', 'Options', 'Other', 'Highly volatile — size it accordingly. ~8.00%/year historical benchmark.',
      'Name', '[Bitcoin]', 'Where it’s held (institution)', '[Coinbase]', 'Current value', '[$28,000]',
      'Value as of', 'Tap to pick a date',                                                                                    // 2026-10-25
      'Held in', ...SIX,                                                                                                      // 19
      '🔻 Sell', sentence, `[${d[d.indexOf('Record') - 1]}]`, 'Record', 'Sold all of it →',
      'Save', 'Delete',                                                                                                       // 2026-10-25
    ];
    expect(designed).toContain('[amount sold (up to $28,000)]');                                                            // the drawn box
    const form = formLines(); const from = form.indexOf('Edit investment');
    expect(from).toBeGreaterThan(0);
    expect(firstDifference(normExact(designed), normExact(form.slice(from)))).toBe('');
  });
});

/** ITEMIZE v02, FIGURE FOR FIGURE, ITS BOXES READ, ITS BOND'S MATURITY PICKED (2026-10-27, FX-PF; the round-2 drawing match NW2-25). It
 *  was held through norm() ("$#" for every figure), with every drawn box stripped out, and the bond placed with no maturity because
 *  the date is picked on the phone's own control — so "· matures May 15, 2032" was never checked. Now: the maturity is picked on that
 *  control (its onChange, as the phone calls it), every drawn word and figure is compared both ways, and each drawn box is read
 *  against the box on screen — what it shows, its typed value or its placeholder, in its place. By hand: 18,400 + 12,000 + 6,000 =
 *  36,400 of 48,000, $11,600 left; with NVDA's 14,200, 50,600 — $2,600 over. */
describe('Itemize v02', () => {
  const P = phones(NW + 'itemize_v02.html');
  const ItemizeScreen = require('../ItemizeScreen').default;
  const start = () => show(ItemizeScreen, { assetAccounts: [{ asset_id: 'chase', label: 'Chase', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 48000 }] }, { accountId: 'chase' });
  /** every Text and every box, in order — a box as what it shows: its typed value, else its placeholder */
  const withBoxes = (): string[] => {
    const out: string[] = [];
    const text = (n: any): string => (n == null ? '' : typeof n === 'string' ? n : Array.isArray(n) ? n.map(text).join('') : (n.children ?? []).map(text).join(''));
    const walk = (n: any) => {
      if (n == null || typeof n === 'string') return;
      if (Array.isArray(n)) { n.forEach(walk); return; }
      if (n.type === 'TextInput') { const t = String(n.props?.value || n.props?.placeholder || '').trim(); if (t) out.push(t); return; }
      if (n.type === 'Text') { const t = text(n).replace(/\s+/g, ' ').trim(); if (t) out.push(t); return; }
      (n.children ?? []).forEach(walk);
    };
    walk(screen.toJSON());
    return out;
  };
  const pickMaturity = (y: number, m: number, d: number) => {
    fireEvent.press(screen.getByLabelText('Pick a maturity date'));
    const pickers = screen.UNSAFE_root.findAll((n: any) => n.props?.mode === 'date' && typeof n.props?.onChange === 'function');
    expect(pickers.length).toBeGreaterThanOrEqual(1);                                       // the phone's own control is there
    act(() => { pickers[0].props.onChange({ type: 'set' }, new Date(y, m - 1, d)); });
  };
  const place = (kind: string, placeholder: string, name: string, amount: string, maturity?: [number, number, number]) => {
    fireEvent.press(screen.getByLabelText(kind));
    fireEvent.changeText(screen.getByPlaceholderText(placeholder), name);
    if (maturity) pickMaturity(...maturity);
    fireEvent.changeText(screen.getByLabelText('Amount'), amount);   // the box opens empty, found by its label (R16, 2026-10-31)
    fireEvent.press(screen.getByLabelText('Add this holding'));
  };
  const three = () => {
    place('Stock / Fund', 'Ticker or name (e.g. AAPL)', 'AAPL', '18400');
    place('Bond', 'Bond name (e.g. US Treasury 2032)', 'US Treasury 2032', '12000', [2032, 5, 15]);   // the drawn maturity
    place('Cash', 'Name', 'Chase sweep', '6000');
  };
  /** 11: no ✕ beside the title (the build closes with Back); the maturity in words (the row of 2026-10-19); 10: an empty date box reads
   *  "Tap to pick a date". Each must find its drawn words. */
  const KNOWN: [string, string][] = [['itemize chase ✕ add what', 'itemize chase add what'], ['bond matures 2032-05-15', 'bond matures may 15, 2032'],
    // R16 (the row of 2026-10-31 on Itemize v02, NW3-07, FX-NW): the amount box opens empty — the phones draw a grey 0 in it
    ['$ 0 add holding', '$ add holding']];
  const asDesigned = (drawn: string, extra: [string, string][] = []) => {
    let w = drawn;
    for (const [d, b] of [...KNOWN, ...extra]) { expect(w.includes(d) ? d : `NOT FOUND: ${d}`).toBe(d); w = w.split(d).join(b); }
    return w;
  };
  test('the drawing records 10 and 11 on its face, dated 2026-10-25 — it is not approved, so the notes say what the screen does', () => {
    const { html } = noteOf(NW + 'itemize_v02.html');
    expect(html).toMatch(/READ THIS FIRST \(2026-10-25, DEC-0651\):<\/b> this drawing was taken as the design on 2026-10-01 on my decision, not his/);
    expect(html).toMatch(/the screen has no ✕, and in every state it closes with the top bar’s ‹ Back/);
    expect(html).toMatch(/an empty date box reads [“‘]Tap to pick a date[”’], as it does on Add an account/);   // screen words in single marks since 2026-10-31 (R17)
  });
  test('the drawing has its three phones', () => { expect(P).toHaveLength(3); });

  test('phone 1 · nothing placed — the whole balance is unallocated and Done waits — every figure and box as drawn', () => {
    start();
    const drawn1 = normExact(upTo(P[0], /^Done — replace with 0 holdings$/));
    expect(drawn1.includes('$ 0 add holding')).toBe(true);                                     // the drawn grey 0, which R16 empties (2026-10-31)
    expect(firstDifference(drawn1.split('$ 0 add holding').join('$ add holding'), normExact(withBoxes()))).toBe('');
    expect(withBoxes()).toEqual(expect.arrayContaining(['$48,000', '$0 of $48,000 itemized', 'Ticker or name (e.g. AAPL)']));
    expect(withBoxes()).not.toContain('0');                                                     // no grey 0 in the empty amount box
  });

  test('phone 2 · three holdings placed, money left over — the maturity picked and printed, every figure and box as drawn', () => {
    start(); three();
    fireEvent.press(screen.getByLabelText('Stock / Fund'));
    const built = withBoxes();
    expect(firstDifference(asDesigned(normExact(upTo(P[1], /^Done — replace with 3 holdings$/))), normExact(built))).toBe('');
    expect(built).toContain('Bond · matures May 15, 2032');                                   // NW2-25: the drawn maturity, held
    expect(built).toEqual(expect.arrayContaining(['$11,600', '$36,400 of $48,000 itemized', '$18,400', '$12,000', '$6,000']));   // $48,000 − $36,400
  });

  test('phone 3 · more placed than the account holds — it says the new total; the bond form\'s boxes as drawn, and one more', () => {
    start(); three();
    place('Stock / Fund', 'Ticker or name (e.g. AAPL)', 'NVDA', '14200');
    fireEvent.press(screen.getByLabelText('Bond'));
    const built = withBoxes();
    // NW2-13 (open with FX-NW on 2026-10-27): the form asks one box the drawing does not draw and no Itemize row names. It is held as
    // the one extra line, in its place, so the day it is drawn or ruled this test says so.
    const FACE = 'Face value (optional) — what it pays back';
    expect(built.filter((l) => l === FACE)).toHaveLength(1);
    const want = asDesigned(normExact(upTo(P[2], /^Done — replace with 4 holdings$/)), [['coupon % (optional) maturity date', 'coupon % (optional) tap to pick a date']]);
    expect(firstDifference(want, normExact(built.filter((l) => l !== FACE)))).toBe('');
    expect(built).toEqual(expect.arrayContaining(['$2,600 over', '$50,600 of $48,000 itemized', '$14,200', 'Bond name (e.g. US Treasury 2032)', 'Coupon % (optional)', 'Tap to pick a date']));  // $50,600 − $48,000
  });
});

/** HOLDING DETAIL v02, FIGURE FOR FIGURE ON THE DRAWING'S OWN DAY (2026-10-27, FX-PF; the round-2 drawing match, G-1 and NW2-25).
 *  It was held through norm(), which writes every figure as "$#", on a household with no close on the evening before the past year
 *  began or on Jan 8: the screen read Your return +61.23% and the market +53.00% and still matched. It is now rendered on Sep 30, 2026
 *  (the drawing's LAST CLOSE · SEP 30, 2026) with the closes the drawing's own arithmetic uses — AAPL $175.00 the evening before the
 *  past year began, $192.50 the evening before the Jan 9 purchase, $239.53 and $241.84; the market $500 and $612 — and every drawn
 *  word AND figure is compared, both ways (firstDifference reads the whole stream). Each place the drawing is not the design is
 *  replaced by what its dated READ THIS FIRST row says, and each replacement must find its drawn words. By hand, phone A:
 *    Your return (100 × 192.50 ÷ 100 × 175.00) × (140 × 241.84 ÷ (100 × 192.50 + 7,700)) − 1 = 1.1 × 33,857.60 ÷ 26,950 − 1 = +38.19%
 *    the market 612 ÷ 500 − 1 = +22.40% (the same days, split at the purchase), ahead by 38.19 − 22.40 = 15.79 points
 *    value 140 × $241.84 = $33,857.60 → $33,858; paid $16,800 + $7,700 = $24,500; gain $9,357.60 → $9,358, +38.19% of $24,500
 *    long-term 100 × ($241.84 − $168.00) = $7,384; short-term 40 × ($241.84 − $192.50) = $1,973.60 → $1,974; the day $2.31 on $239.53 = 0.96% */
describe('Holding detail v02', () => {
  const P = phones(NW + 'holding-detail_v02.html');
  const HoldingDetailScreen = require('../HoldingDetailScreen').default;
  beforeEach(() => jest.useFakeTimers({ now: new Date('2026-09-30T12:00:00'),
    doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] }));
  afterEach(() => jest.useRealTimers());
  /** A CLOSE ON EVERY DAY (2026-10-31, FX-PF; the round-3 note N-3): the household held six closes, so This year and 1M read from a
   *  close months old — "Your return, this year" printed the past year's +38.19%. Each day's close lies on a straight line between the
   *  drawing's own closes (the evening before the past year began, Jan 8, Sep 29 and Sep 30), so every drawn figure stands. */
  const ANCHOR_AAPL: [string, number][] = [['2024-09-27', 150], ['2025-09-29', 175], ['2026-01-08', 192.5], ['2026-09-29', 239.53], ['2026-09-30', 241.84]];
  const ANCHOR_SPY: [string, number][] = [['2024-09-27', 420], ['2025-09-29', 500], ['2026-01-08', 540], ['2026-09-29', 610], ['2026-09-30', 612]];
  const dayMs = 86_400_000, t0 = (d: string) => Date.parse(`${d}T00:00:00Z`);
  const closeAt = (anchors: [string, number][], d: string) => {
    for (let i = 0; i + 1 < anchors.length; i += 1) {
      const [d0, v0] = anchors[i], [d1, v1] = anchors[i + 1];
      if (d >= d0 && d <= d1) return v0 + (v1 - v0) * (t0(d) - t0(d0)) / (t0(d1) - t0(d0));
    }
    return anchors[anchors.length - 1][1];
  };
  const daily = (ticker: string, anchors: [string, number][]) => {
    const points: { date: string; close: number }[] = [];
    for (let t = t0(anchors[0][0]); t <= t0(anchors[anchors.length - 1][0]); t += dayMs) { const d = new Date(t).toISOString().slice(0, 10); points.push({ date: d, close: closeAt(anchors, d) }); }
    return { ticker, points };
  };
  const SPY = daily('SPY', ANCHOR_SPY);
  const AAPL_HOUSE = (period?: string) => [{ ...live,
    assetAccounts: [{ asset_id: 'fid', label: 'Fidelity', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true,
      positions: [{ position_id: 'p1', ticker: 'AAPL', label: 'Apple Inc.', kind: 'stocks_etf', lots: [
        { lot_id: 'l1', shares: 100, cost_per_share: 168, purchase_date: '2023-03-14' }, { lot_id: 'l2', shares: 40, cost_per_share: 192.5, purchase_date: '2026-01-09' }] }] }],
    priceCache: { AAPL: daily('AAPL', ANCHOR_AAPL), SPY },
    transactions: [{ id: 'd1', account_id: 'fid', type: 'DIVIDEND', ticker: 'AAPL', amount: 134.4, date: '2026-08-01' }],
  }, { account: 'fid', position: 'p1', ...(period ? { period } : {}) }] as const;
  const live = { pricesFetchedAt: '2026-09-30T11:00:00Z' };
  /** [drawn, built, the row that says so] — every drawn piece must be found, or the test fails rather than going quiet */
  const apply = (drawn: string, known: [string, string, string][]) => {
    let s = drawn;
    for (const [d, b, row] of known) { expect(s.includes(d) ? d : `NOT FOUND (${row}): ${d}\n IN: ${s}`).toBe(d); s = s.split(d).join(b); }
    return s;
  };
  // PF-8 (row of 2026-10-27): the account's one name. 16 (row of 2026-10-21): the band names the last close and its day.
  const NAME = (who: string): [string, string, string] => [`in ${who} `, `in ${who} brokerage `, 'PF-8, 2026-10-27'];
  const CLOSE: [string, string, string] = ['current price live', 'last close sep 30, 2026', '16, 2026-10-21'];
  test('the drawing has its three phones', () => { expect(P).toHaveLength(3); });

  test('phone 1 · a priced holding — price, position, the market beside it, what was bought, and the tax if sold today — every figure as drawn', () => {
    const built = show(HoldingDetailScreen, ...AAPL_HOUSE());
    const want = apply(normExact(upTo(P[0], /^Activity$/)), [
      NAME('fidelity'), CLOSE,
      ['(1.0%) today', '(0.96%) today', '12 · 2026-10-21, fifteen figures: a percent to two decimals'],
      ['current value $33,857.60', 'current value $33,858', '12 · a balance in whole dollars'],
      ['▲ +$9,357.60 (38.19%)', '▲ +$9,358 (+38.19%)', '12 · whole dollars, the sign on the percent'],
      ['your return, past year 38.19% the market, same dates 22.40% you are ahead by 15.8 points', 'your return, past year +38.19% the market, same dates +22.40% you are ahead by 15.79 points', '12 · 2026-10-21: two decimals, with their signs'],
      ['price changes only — dividends not included', 'both include dividends and interest', '15 · DEC-4645'],
      ['march 14, 2023', 'mar 14, 2023', '12 · the one date writer'], ['january 9, 2026', 'jan 9, 2026', '12 · the one date writer'],
      ['total paid $24,500.00', 'total paid $24,500', '12 · a total in whole dollars'],
      ['dividends received (12 mo) $134.40', 'dividends received (trailing twelve months) $134', '24 · Q35; 12 · whole dollars'],
      ['realized from sales $0.00 from your recorded buys and sells (oldest shares sold first).', 'realized from sales $0 — nothing sold', '13 · DEC-1559'],
      ['gain — long-term (held over 1 yr) +$7,400.00 gain — short-term (under 1 yr) +$1,957.60', 'gain — long-term (held over 1 yr) +$7,384 gain — short-term (held 1 yr or less) +$1,974', '14 · 2026-10-11 drawing error, DEC-0324'],
    ]);
    expect(want).toContain('+38.19%');                                                    // the stream holds the figures, not "$#"
    expect(firstDifference(want, normExact(built))).toBe('');
    expect(built).toContain('Your return, past year'); expect(built).toContain('+38.19%'); expect(built).toContain('+22.40%');
    expect(built).toContain('ahead by 15.79 points');
  });

  // THIS YEAR AND 1M, BY HAND FROM THE DAILY CLOSES (N-3). This year measures from Dec 31, 2025: AAPL then 175 + 17.50 × 93 ÷ 101 =
  // $191.14 (93 of the 101 days from Sep 29 to Jan 8), and its 40 bought Jan 9 at $192.50 count from that day, so
  // (100 × 192.50 ÷ 100 × 191.14) × (140 × 241.84 ÷ (19,250 + 7,700)) − 1; the market 612 ÷ (500 + 40 × 93 ÷ 101) − 1. 1M measures
  // from Aug 29, 2026 (the close of the day before Aug 30, N-2): 140 shares held through it, 241.84 ÷ AAPL's Aug 29 close − 1.
  test.each([['YTD', 'Your return, this year', '2025-12-31'], ['1M', 'Your return, past month', '2026-08-29']])('phone 1 on %s: %s, worked by hand from the closes', (period, label, eve) => {
    const built = show(HoldingDetailScreen, ...AAPL_HOUSE(period));
    const a = closeAt(ANCHOR_AAPL, eve), m = closeAt(ANCHOR_SPY, eve);
    const yours = period === 'YTD' ? (192.5 / a) * ((140 * 241.84) / (100 * 192.5 + 7_700)) - 1 : 241.84 / a - 1;
    const market = 612 / m - 1;
    const pct = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(2)}%`;
    const at = built.indexOf(label);
    expect(at).toBeGreaterThan(0);
    expect([built[at + 1], built[built.indexOf('The market, same dates') + 1]]).toEqual([pct(yours), pct(market)]);
    expect(built[at + 1]).not.toBe('+38.19%');                                           // it read the past year's figure
  });

  test('phone 2 · no live price — it shows what was paid, and says so — every figure as drawn', () => {
    const built = show(HoldingDetailScreen, { ...live,
      assetAccounts: [{ asset_id: 'cb', label: 'Coinbase', institution: 'Coinbase', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true,
        positions: [{ position_id: 'p1', ticker: 'BTC', label: 'Bitcoin', kind: 'crypto', lots: [{ lot_id: 'l1', shares: 0.5, cost_per_share: 56000, purchase_date: '2024-07-02' }] }] }],
      priceCache: {} }, { account: 'cb', position: 'p1' });
    // 0.5 × $56,000 = $28,000; the coin quantity trimmed of its trailing zeros (12); the purchase in the holding's own unit (2026-10-21)
    const want = apply(normExact(upTo(P[1], /^Activity$/)), [
      NAME('coinbase'),
      ['what you paid $28,000.00', 'what you paid $28,000', '12 · a total in whole dollars'],
      ['quantity 0.50000000 coins', 'quantity 0.5 coins', '12 · a coin quantity, its trailing zeros trimmed'],
      ['july 2, 2024 0.5 sh @ $56,000.00', 'jul 2, 2024 0.5 coins @ $56,000.00', '12 · the date writer; DEC-0277, the unit (2026-10-21)'],
      ['total paid $28,000.00', 'total paid $28,000', '12 · a total in whole dollars'],
    ]);
    expect(firstDifference(want, normExact(built))).toBe('');
  });

  test('phone 3 · sold, and a window the prices cannot reach — both said, neither papered over — every figure as drawn', () => {
    const built = show(HoldingDetailScreen, { ...live,
      assetAccounts: [{ asset_id: 'et', label: 'E*TRADE', institution: 'E*TRADE', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true,
        positions: [{ position_id: 'p1', ticker: 'LCTX', label: 'Lucid Diagnostics', kind: 'stocks_etf', lots: [] }] }],
      priceCache: { LCTX: { ticker: 'LCTX', points: [{ date: '2025-07-30', close: 2.1 }, { date: '2026-03-30', close: 1.8 }, { date: '2026-09-29', close: 1.48 }, { date: '2026-09-30', close: 1.42 }] }, SPY },
    }, { account: 'et', position: 'p1', period: '2Y' });
    // $1.42 against $1.48: down $0.06, 4.05%; prices from Jul 30, 2025: 14 months
    const want = apply(normExact(upTo(P[2], /^Activity$/)), [NAME('e*trade'), CLOSE, ['(4.1%) today', '(4.05%) today', '12 · a percent to two decimals']]);
    expect(firstDifference(want, normExact(built))).toBe('');
    expect(built).toContain('Prices for this holding go back 14 months, so the 2-year figure covers 14 months — not two years.');
  });

  test('the drawing carries every row the replacements above name: 2026-10-11, 2026-10-21 (fifteen figures, the last close), 2026-10-27 (one name)', () => {
    const { rows } = noteOf(NW + 'holding-detail_v02.html');
    expect(rows).toMatch(/DRAWING ERROR — the gain split/);
    expect(rows).toMatch(/DRAWING ERROR — fifteen figures on the three phones/);
    expect(rows).toMatch(/One thing named one way \(tenet 4, DEC-3523\); his naming rule \(DEC-0083\)/);
    expect(rows).toMatch(/‘in Fidelity Brokerage’, ‘in Coinbase Brokerage’, ‘in E\*TRADE Brokerage’/);
  });
});

/** THE OLD HOUSEHOLD, KEPT (G-1): no close on the evening before the past year began, nor on Jan 8 — the screen read +61.23% beside
 *  +53.00%, figures the drawing never had, and norm() let it pass. Held here as no longer matching the drawing's figures. */
test.failing('Holding detail v02 · the household until 2026-10-27, pinned: its closes do not give the drawing\'s +38.19% (G-1)', () => {
  const months = (m: number) => { const n = new Date(); return iso(new Date(n.getFullYear(), n.getMonth() - m, n.getDate())); };
  const day = (n: number) => iso(new Date(Date.now() - n * 86400e3));
  const built = show(require('../HoldingDetailScreen').default, { pricesFetchedAt: new Date().toISOString(),
    assetAccounts: [{ asset_id: 'fid', label: 'Fidelity', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true,
      positions: [{ position_id: 'p1', ticker: 'AAPL', label: 'Apple Inc.', kind: 'stocks_etf', lots: [
        { lot_id: 'l1', shares: 100, cost_per_share: 168, purchase_date: '2023-03-14' }, { lot_id: 'l2', shares: 40, cost_per_share: 192.5, purchase_date: '2026-01-09' }] }] }],
    priceCache: { AAPL: { ticker: 'AAPL', points: [{ date: months(26), close: 150 }, { date: months(12), close: 175 }, { date: months(6), close: 210 }, { date: day(1), close: 239.53 }, { date: day(0), close: 241.84 }] },
      SPY: { ticker: 'SPY', points: [{ date: months(26), close: 400 }, { date: months(12), close: 500 }, { date: months(6), close: 560 }, { date: day(1), close: 610 }, { date: day(0), close: 612 }] } },
  }, { account: 'fid', position: 'p1' });
  expect(built).toContain('+38.19%'); expect(built).toContain('+22.40%');
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
    ['bonds_v02.html', [/2026-10-25 Phones 1 and 2 — the title Bonds stands on its own line and the dark-green BONDS &amp; CDS bar runs under it, edge to edge with square corners/,
      /2026-10-25 DRAWING ERROR, phones 1 and 2 — the info dot inside the bar is drawn as a 10-point i in a 15-point ring/,
      /2026-10-25 Editor \(phone 3\): the Sell box’s sentence names the value box by the label it now has — it ends: To just re-mark its price, edit [“‘]Market value[”’] above\./,
      /2026-10-25 First day \(phone 2\): under Total value \$0 the card reads [“‘]Nothing entered yet\. Add a bond ›[”’][\s\S]*DEC-0260/,
      /2026-10-25 Editor \(phone 3\): the form also asks Institution \/ account \(optional\) and Value as of, and ends in Save \(Add bond for a new bond\) and Delete bond/,
      /2026-10-25 DRAWING ERROR, every phone — the top bar’s buttons are drawn 32 points tall\. The app draws them 38 points tall/]],
    ['alternatives_v02.html', [/2026-10-25 Phones 1 and 2 — the title Alternatives stands on its own line and the dark-green ALTERNATIVES bar runs under it/,
      /2026-10-25 First day \(phone 2\): under Total value \$0 the card reads [“‘]Nothing entered yet\. Add an investment ›[”’][\s\S]*DEC-0260/,
      /2026-10-25 Editor \(phone 3\): the form also asks Value as of, and ends in Save \(Add for a new holding\) and Delete/,
      /2026-10-25 DRAWING ERROR, every phone — the top bar’s buttons are drawn 32 points tall/]],
    ['add-account-by-hand_v02.html', [/2026-10-25 DRAWING ERROR, every phone — the top bar’s buttons are drawn 32 points tall/,
      /2026-10-25 DRAWING ERROR, every phone — the title Add an account is drawn at 24 points\. Every screen title in the app is 20 points/,
      /2026-10-25 DRAWING ERROR, phones 2, 3 and 4 — the info dot beside Retirement earmark % \(optional\) is drawn green, 11 points/]],
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
      'An index option’s gain is taxed 60% long-term and 40% short-term, however long it was held (IRS Publication 550).']);
  });

  test('no live price, 0.25 coins with no price paid: the large figure and Total paid read the same $28,000', () => {
    const btc = { position_id: 'p1', ticker: 'BTC', label: 'Bitcoin', kind: 'crypto', lots: [
      { lot_id: 'l1', shares: 0.5, cost_per_share: 56000, purchase_date: '2024-07-02' }, { lot_id: 'l2', shares: 0.25, cost_per_share: null, purchase_date: '2024-08-01' }] };
    const built = show(HoldingDetailScreen, { ...live, assetAccounts: [acct([btc], { asset_id: 'cb', label: 'Coinbase', institution: 'Coinbase' })], priceCache: {} }, { account: 'cb', position: 'p1' });
    expect(built[built.indexOf('NO LIVE PRICE — SHOWING WHAT YOU PAID') + 1]).toBe('$28,000');
    expect(built[built.indexOf('Total paid') + 1]).toBe('$28,000');
  });
});

// 25: THE WHOLE PHONE, TO ITS LAST LINE, AND WHAT ITS TWO DOORS OPEN (2026-10-21, gap 25 of the Performance launch audit). The
// three phone tests above read each phone through "Activity" and the built screen to its end, so the last two lines were in
// the word-for-word match — but nothing said so, nothing held how the two buttons look, and nothing pressed them. Here: each
// phone's last two lines on the drawing and on the screen are the two doors, and nothing follows them (3 of 3 phones); the
// buttons are drawn as .btnRow / .btn and built to that (a 1-point edge in the line colour, 12 corners, 13/700 in the green);
// each door opens its sheet (sheet_doors_2026_10_21.test.tsx walks each sheet; the sheets' own drawings hold their words).
describe('Holding detail v02 · the last line of each phone, the two doors as drawn, and what they open (25)', () => {
  const P = phones(NW + 'holding-detail_v02.html');
  const HoldingDetailScreen = require('../HoldingDetailScreen').default;
  const months = (m: number) => { const n = new Date(); return iso(new Date(n.getFullYear(), n.getMonth() - m, n.getDate())); };
  const day = (n: number) => iso(new Date(Date.now() - n * 86400e3));
  const SPY = { ticker: 'SPY', points: [{ date: months(26), close: 400 }, { date: months(12), close: 500 }, { date: day(1), close: 610 }, { date: day(0), close: 612 }] };
  const live = { pricesFetchedAt: new Date().toISOString() };
  const acct = (id: string, name: string, positions: any[]) => ({ asset_id: id, label: name, institution: name, kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true, positions });
  const PHONES: [string, any, Record<string, string>][] = [
    ['A · a priced holding', { ...live, assetAccounts: [acct('fid', 'Fidelity', [{ position_id: 'p1', ticker: 'AAPL', label: 'Apple Inc.', kind: 'stocks_etf', lots: [
      { lot_id: 'l1', shares: 100, cost_per_share: 168, purchase_date: '2023-03-14' }, { lot_id: 'l2', shares: 40, cost_per_share: 192.5, purchase_date: '2026-01-09' }] }])],
    priceCache: { AAPL: { ticker: 'AAPL', points: [{ date: months(26), close: 150 }, { date: months(12), close: 175 }, { date: day(1), close: 239.53 }, { date: day(0), close: 241.84 }] }, SPY } }, { account: 'fid', position: 'p1' }],
    ['B · no live price', { ...live, assetAccounts: [acct('cb', 'Coinbase', [{ position_id: 'p1', ticker: 'BTC', label: 'Bitcoin', kind: 'crypto', lots: [{ lot_id: 'l1', shares: 0.5, cost_per_share: 56000, purchase_date: '2024-07-02' }] }])], priceCache: {} },
      { account: 'cb', position: 'p1' }],
    ['C · sold', { ...live, assetAccounts: [acct('et', 'E*TRADE', [{ position_id: 'p1', ticker: 'LCTX', label: 'Lucid Diagnostics', kind: 'stocks_etf', lots: [] }])],
      priceCache: { LCTX: { ticker: 'LCTX', points: [{ date: months(14), close: 2.1 }, { date: day(1), close: 1.48 }, { date: day(0), close: 1.42 }] }, SPY } }, { account: 'et', position: 'p1', period: '2Y' }],
  ];
  const html = noteOf(NW + 'holding-detail_v02.html').html;
  const cssOf = (cls: string) => Object.fromEntries((new RegExp(`\\.${cls}\\{([^}]*)\\}`).exec(html)?.[1] ?? '').split(';').map((d) => d.split(':').map((x) => x.trim())).filter((x) => x.length === 2));
  const tokens = Object.fromEntries([...html.matchAll(/--([a-zA-Z0-9]+):([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
  const colour = (v: string) => (/^var\(--(\w+)\)$/.test(v) ? tokens[/^var\(--(\w+)\)$/.exec(v)![1]] : v).replace(/\s+/g, '').replace(/\.10\)/, '0.10)').toUpperCase();

  test.each(PHONES.map((p, i) => [p[0], i] as [string, number]))('phone %s · its last two lines are the two doors, on the drawing and on the screen, and nothing follows', (_n, i) => {
    const drawn = upTo(P[i], /^Activity$/);
    const built = show(HoldingDetailScreen, PHONES[i][1], PHONES[i][2]);
    expect(drawn.slice(-2)).toEqual(['Record buy/sell', 'Activity']);
    expect(built.slice(-2)).toEqual(['Record buy/sell', 'Activity']);
    expect(built.filter((l) => l === 'Record buy/sell')).toHaveLength(1);
  });

  test('the two buttons as drawn (.btnRow, .btn) are the buttons as built', () => {
    const row = cssOf('btnRow'); const btn = cssOf('btn');
    expect([row.gap, row['margin-top'], btn['border-radius'], btn.padding, btn['font-size'], btn['font-weight']]).toEqual(['8px', '4px', '12px', '12px 0', '13px', '700']);
    show(HoldingDetailScreen, PHONES[0][1], PHONES[0][2]);
    for (const label of ['Record a buy or sell for AAPL', "See AAPL’s activity"]) {
      const b = screen.getByLabelText(label);
      const st = flatStyle(b);
      const words = require('react-native').StyleSheet.flatten(b.findByType(require('react-native').Text).props.style);
      expect({ edge: `${st.borderWidth}px solid ${String(st.borderColor).replace(/\s+/g, '').toUpperCase()}`, bg: String(st.backgroundColor).toUpperCase(), r: st.borderRadius, py: st.paddingVertical,
        size: words.fontSize, weight: words.fontWeight, colour: String(words.color).toUpperCase() })
        .toEqual({ edge: `1px solid ${colour(btn.border.replace(/^1px solid /, ''))}`, bg: colour(btn.background), r: 12, py: 12, size: 13, weight: '700', colour: colour(btn.color) });
      let row: any = b.parent; while (row && !(row.props?.style && flatStyle(row).flexDirection === 'row')) row = row.parent;
      expect(row).toBeTruthy();                                                   // the row the two doors sit in was found
      expect([flatStyle(row).gap, flatStyle(row).marginTop]).toEqual([8, 4]);
    }
  });

  test('each door opens its sheet: Record buy/sell the trade sheet, with AAPL; Activity the holding\'s records', () => {
    show(HoldingDetailScreen, PHONES[0][1], PHONES[0][2]);
    fireEvent.press(screen.getByLabelText('Record a buy or sell for AAPL'));
    expect(screen.getByText('Record activity')).toBeOnTheScreen();
    expect(screen.getByPlaceholderText('e.g. AAPL').props.value).toBe('AAPL');
    show(HoldingDetailScreen, PHONES[0][1], PHONES[0][2]);
    fireEvent.press(screen.getByLabelText("See AAPL’s activity"));
    expect(screen.getByText('Every record of this holding, newest first.')).toBeOnTheScreen();
  });
});

// 27: LOOK BACK WITH NOTHING BEHIND IT (2026-10-21, gap 27 of the Performance launch audit). The drawing draws two phones,
// both with holdings. Its rule for missing data is state B's caption: "Nothing is invented; the screen says what is missing
// and what to do." Held here on an account with no holdings and no prices at all — a fresh account — and with the amount
// cleared: the same screen as phone B, word for word, but for what an empty account changes (its own holdings are not among
// the choices, only the four yardsticks; and the missing prices are named, with what is true for them);
// no figure is printed, not even $0, and the WHAT ACTUALLY HAPPENED card is not drawn.
describe('Look back v01 · the empty state: no holdings, no prices (27)', () => {
  const P = phones('networth-and-performance/moneykeel_pres_mock_look-back_v01.html');
  const LookBackScreen = require('../LookBackScreen').default;
  const EMPTY = [{ asset_id: 'v', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, positions: [] }];
  const YARDSTICKS = ['AGG', 'GLD', 'BTC', 'AOR'];
  // Look back fetches what it compares (2026-10-22, the drawing's dated row): here the price source brings nothing (this file
  // replaces it with one that answers nothing), so the line names the two tickers the refresh could not get — it read "prices
  // for that pairing yet … or pick a shorter window", which brings no price that is missing altogether
  const NO_PRICES = "Couldn’t refresh prices for AGG or SPY, so there is nothing to compare yet. Look back tries again each time it opens.";
  test('phone B\'s screen, with an empty account\'s choices and the missing prices named — and no figure at all', async () => {
    show(LookBackScreen, { onboardingProfile: {}, assetAccounts: EMPTY, priceCache: {} });
    expect(screen.getByText('Getting prices for AGG and SPY…')).toBeOnTheScreen();                             // while the refresh runs
    await waitFor(() => expect(screen.getByText(NO_PRICES)).toBeOnTheScreen());
    const built = builtLines(screen.toJSON());
    const drawn = upTo(P[1], /pick a shorter window\.$/).filter((l) => l !== '20,000');                        // 2: the amount is typed
    const at = (ls: string[], l: string) => ls.indexOf(l);
    // what an empty account changes, and only that: the choices, and the missing thing named
    const want = [...drawn.slice(0, at(drawn, 'From') + 1), ...YARDSTICKS.filter((t) => t !== 'SPY'),
      'To', 'SPY', ...YARDSTICKS.filter((t) => t !== 'AGG'), ...drawn.slice(at(drawn, 'When'))]
      .map((l) => (/pick a shorter window\.$/.test(l) ? NO_PRICES : l));
    expect(drawn).toContain('BND');                                                                           // the drawing's own holdings were there to replace
    expect(firstDifference(normExact(want), normExact(built))).toBe('');
    expect(built[built.length - 1]).toBe(NO_PRICES);
    expect(built.filter((l) => /\$\d|%/.test(l))).toEqual([]);                                                 // nothing invented: no $0, no 0%
    expect(built).not.toContain('WHAT ACTUALLY HAPPENED');
  });
  test('with the amount cleared: one sentence saying what is missing, and still no figure', () => {
    show(LookBackScreen, { onboardingProfile: {}, assetAccounts: EMPTY, priceCache: {} });
    fireEvent.changeText(screen.getByLabelText('Amount to look back on'), '');
    const built = builtLines(screen.toJSON());
    expect(built[built.length - 1]).toBe('Enter an amount to look back on.');
    expect(built.filter((l) => /\$\d|%/.test(l))).toEqual([]);
    expect(built).not.toContain('WHAT ACTUALLY HAPPENED');
  });
});

// THE OLD ANSWER, KEPT (2026-10-27, FX-NW; Bonds v02 row of that date, NW2-14): the note ended at his sentence, with no word that the
// estimate took Apple Corp as paying once a year. It fails now, by design.
test.failing('Bonds v02 · the old answer: Apple Corp’s note is his sentence alone', () => {
  const built = show(require('../BondsScreen').default, { assetAccounts: [
    { asset_id: 'b2', label: 'Apple Corp 4.5%', kind: 'bond', tax_bucket: 'TAXABLE', balance: 19530, face_value: 20000, coupon_rate: 0.045, maturity_date: '2030-03-15' }] });
  expect(built.some((l: string) => /^\* Added estimated \$[\d,]+ in accrued interest .* enter actual accrued interest$/.test(l))).toBe(true);
});

// THE OLD ANSWER, KEPT (2026-10-31, FX-NW; Alternatives v02 row of that date, NW3-06): the share printed as the screen rounded it, a whole
// or one-decimal percent. It fails now, by design.
test.failing('Alternatives v02 · the old answer: "3 holdings · 12% of your investable assets"', () => {
  const built = show(require('../OtherInvestmentsScreen').default, { assetAccounts: [
    { asset_id: 'a1', label: 'Bitcoin', institution: 'Coinbase', kind: 'crypto', tax_bucket: 'TAXABLE', balance: 28000 },
    { asset_id: 'a2', label: 'Fund III', kind: 'private_equity', tax_bucket: 'TAXABLE', balance: 25000 },
    { asset_id: 'a3', label: 'Gold', kind: 'commodities', tax_bucket: 'TAXABLE', balance: 8500 },
    { asset_id: 'k', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 451000 }] });
  expect(built).toContain('3 holdings · 12% of your investable assets');
});
