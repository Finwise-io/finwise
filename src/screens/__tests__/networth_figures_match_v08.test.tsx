/** THE NET WORTH SCREEN AGAINST ITS APPROVED DRAWING, FIGURE FOR FIGURE (Quiet Instrument v08) — every state it draws.
 *
 *  networth_matches_v08 holds the WORDS of each state and reads every figure and date as a placeholder ("$#", "<date>"),
 *  so it cannot see a wrong number. This file holds the other half: every figure and every date of each state, in the
 *  drawn order, exactly as drawn. The figures were last compared one by one on 2026-10-11 (audit
 *  MoneyKeel/documents/audit/moneykeel_audit_mock-match_networth_2026-10-11_v02.md); this makes that comparison run
 *  on every build. The method is Performance's (perf_mock_match_2026_10_12.test.tsx): render the real screen ON THE
 *  DRAWING'S OWN DAY with the household whose accounts give the drawn figures.
 *
 *  THE HOUSEHOLD, worked from the drawing's own numbers (they add up):
 *    own   Chase Checking $8,000 + Vanguard's cash $838 + Vanguard's VTI 3,319 × $105 = $348,495 + E*TRADE bonds $5,819
 *          + Home $450,000 = $813,152 (Cash $8,838 · Investments $354,314 · Personal property $450,000)
 *    owe   Home mortgage $412,000 + Chase Visa $6,000 = $418,000          net worth $813,152 − $418,000 = $395,152
 *    bar   Real estate 450,000 ÷ 813,152 = 55% · Stocks / Funds 348,495 ÷ 813,152 = 43% · Cash 1% · Bonds & CDs 1%;
 *          debts 412,000 ÷ 418,000 = 99% · 6,000 ÷ 418,000 = 1%
 *    since Aug 3, 2026 (the drawing is dated Aug 11, 2026): $393,042 → $395,152 = +$2,110; the walk (state E):
 *          $393,042 + $500 − $500 + ($1,220 + $430 + $260 = $1,910) + $200 principal = $395,152
 *    return on cash + investments, time-weighted: Aug 3 $8,000 + $838 + $346,585 + $5,819 = $361,242; today
 *          $8,000 + $349,333 + $5,819 = $363,152; 363,152 ÷ 361,242 − 1 = +0.53% (the $500 in and out cancel, DEC-4439)
 *    down case (state B): Aug 3 $396,632 → −$1,480; VTI $349,975 that day, $364,632 in all; 363,152 ÷ 364,632 − 1 = −0.41%
 *    retirement: the onboarding household of persona employedPartner, retiring at 65, to 92 — 872 of 1,000 futures (87.2%)
 *
 *  A DIFFERENCE IS EITHER A ROW OF THE DRAWING'S "READ THIS FIRST" TABLE, CITED BY ITS DATE AND RECORD, OR A FAILURE.
 *  Each KNOWN entry must still be found in the drawing (a correction that stops matching goes red, it does not go quiet),
 *  and each state asserts a floor on how many figures it compared on both sides (A GUARD MUST PROVE IT LOOKED).
 *  What this cannot see: colour, size, spacing — networth_matches_v08's appearance tests hold those.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { recordedDay } from '../../testing/recordedDay';
import { useStore } from '../../store/useStore';
import { employedPartner } from '../../testing/personas';
import { drawingLines, builtLines } from '../../testing/mockMatch';

jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}), router: { push: jest.fn() }, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
}));
const NetWorth = () => { const C = require('../NetWorthScreen').default; return <C />; };

// ── figures: every amount, percent, count and date of a line, in order ─────────────────────────────────────────────
const MONTH = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const FIGURE = new RegExp([
  '\\d{4}-\\d{2}-\\d{2}',                                   // a date written 2032-05-15
  `\\b${MONTH}\\.? \\d{1,2}(?:, \\d{4})?\\b`,                // a date written Aug 11, 2026 / Jul 28
  '~?[+−-]?\\$\\d+(?:,\\d{3})*(?:\\.\\d+)?',                 // an amount, its sign and its "~"
  '~?[+−-]?\\d+(?:\\.\\d+)?%',                               // a percent, its sign and its "~"
  '\\d+(?:,\\d{3})*(?:\\.\\d+)?',                            // any other number: months, counts, ages, years
].join('|'), 'g');
type Fig = { f: string; line: string };
/** The figures of a list of lines, in order; case does not count ("AUG 11" is "Aug 11"), every digit and sign does. */
const figures = (lines: string[]): Fig[] =>
  lines.flatMap((line) => (line.toLowerCase().match(FIGURE) ?? []).map((f) => ({ f, line })));

/** [state, drawn figures, figures the app shows instead, the READ THIS FIRST row that says so] */
type Known = [state: string, drawn: string[], built: string[], row: string];
const replaceRun = (xs: string[], from: string[], to: string[]): string[] | null => {
  for (let i = 0; i + from.length <= xs.length; i += 1) {
    if (from.every((f, k) => xs[i + k] === f)) return [...xs.slice(0, i), ...to, ...xs.slice(i + from.length)];
  }
  return null;
};
/** Where two figure lists part: an edit script (longest common run), each step with the line it sits on. */
type Step = { op: 'same' | 'diff'; drawn: Fig[]; built: Fig[] };
function align(a: Fig[], b: Fig[]): Step[] {
  const n = a.length, m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) for (let j = m - 1; j >= 0; j -= 1) L[i][j] = a[i].f === b[j].f ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const steps: Step[] = [];
  const push = (op: Step['op'], d: Fig[], g: Fig[]) => {
    const last = steps[steps.length - 1];
    if (last && last.op === op) { last.drawn.push(...d); last.built.push(...g); } else steps.push({ op, drawn: [...d], built: [...g] });
  };
  let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i].f === b[j].f) { push('same', [a[i]], [b[j]]); i += 1; j += 1; }
    else if (j < m && (i === n || L[i][j + 1] >= L[i + 1][j])) { push('diff', [], [b[j]]); j += 1; }
    else { push('diff', [a[i]], []); i += 1; }
  }
  return steps;
}
const REPORT: string[] = [];
/** Compare one state: the drawn figures, with the KNOWN rows applied, must be the shown figures exactly, in order. */
function compare(state: string, drawnLines: string[], shownLines: string[], floor: number, known: Known[]) {
  const drawn = figures(drawnLines), shown = figures(shownLines);
  expect(drawn.length).toBeGreaterThanOrEqual(floor);           // the guard proves it looked: the drawing's figures were read
  expect(shown.length).toBeGreaterThanOrEqual(floor);           // and the screen's
  let want = drawn.map((x) => x.f);
  for (const [, from, to, row] of known.filter((k) => k[0] === state)) {
    const next = replaceRun(want, from, to);
    expect(next ? 'found' : `KNOWN (${row}) no longer matches the drawing: ${from.join(' | ')}`).toBe('found');
    if (next) want = next;
  }
  // the coverage line, figure by figure against the drawing as drawn
  const steps = align(drawn, shown);
  const same = steps.filter((s) => s.op === 'same').reduce((t, s) => t + s.drawn.length, 0);
  // a step is KNOWN when every figure in it, drawn and shown, is one a row of this state names (the union of the rows,
  // because one drawn figure can be replaced by two rows in turn); the strict check below is the exact list
  const rowDrawn = new Set(known.filter((k) => k[0] === state).flatMap((k) => k[1]));
  const rowShown = new Set(known.filter((k) => k[0] === state).flatMap((k) => k[2]));
  const isKnown = (s: Step) => s.drawn.every((d) => rowDrawn.has(d.f)) && s.built.every((b) => rowShown.has(b.f));
  // a step of as many shown figures as drawn is read pair by pair, so one explained figure beside one that is not is
  // counted as one of each
  const diffs = steps.filter((s) => s.op === 'diff').flatMap((s) => (s.drawn.length === s.built.length && s.drawn.length > 1
    ? s.drawn.map((d, k): Step => ({ op: 'diff', drawn: [d], built: [s.built[k]] })) : [s]));
  const drawnIn = (ss: Step[]) => ss.reduce((t, s) => t + s.drawn.length, 0);
  const moreShown = (ss: Step[]) => ss.reduce((t, s) => t + Math.max(0, s.built.length - s.drawn.length), 0);
  const knownSteps = diffs.filter(isKnown), otherSteps = diffs.filter((s) => !isKnown(s));
  const detail = diffs.map((s) => `   ${isKnown(s) ? 'KNOWN' : 'DIFFERENT'} drawn [${s.drawn.map((d) => d.f).join(' | ')}] shown [${s.built.map((b) => b.f).join(' | ')}]`
    + `\n      drawn on: ${[...new Set(s.drawn.map((d) => d.line))].join(' ⏎ ') || '—'}\n      shown on: ${[...new Set(s.built.map((b) => b.line))].join(' ⏎ ') || '—'}`);
  const line = `${state}: ${same} of ${drawn.length} figures identical; ${drawnIn(otherSteps)} different; ${drawnIn(knownSteps)} known`
    + ` (${shown.length} shown: ${moreShown(knownSteps)} more by a row, ${moreShown(otherSteps)} more with no row)`;
  const otherN = otherSteps.length;
  REPORT.push([line, ...detail].join('\n'));
  const OK = 'every difference is a READ THIS FIRST row';
  expect(otherN === 0 ? OK : [line, ...detail].join('\n')).toBe(OK);
  expect(shown.map((x) => x.f)).toEqual(want);
}
/** The instrument is checked before anything it reports is believed: lines that trip a careless reader — a comma after an
 *  amount, a range, a word that starts like a month, a minus sign, a year inside a name. */
test('the figure reader reads what a person reads, and nothing else', () => {
  expect(figures([
    '· retire at 65 with ~$4,124,000, lasting past 92 with ~$12,711,000 to spare ›', 'YOUR NET WORTH · AUG 11, 2026',
    '3–6 months is the usual guide', 'Bond · matures 2032-05-15', 'Market value 4.5', 'March 14, 2023', 'Sep 30',
    '▼ Change in net worth −$1,480 · Return on cash + investments −0.41% ›', 'Coinbase · Crypto · ~8.00%/year expected', 'Roth 401(k)',
  ]).map((x) => x.f)).toEqual(['65', '~$4,124,000', '92', '~$12,711,000', 'aug 11, 2026', '3', '6', '2032-05-15', '4.5', 'march 14, 2023', 'sep 30',
    '−$1,480', '−0.41%', '~8.00%', '401']);
});
afterAll(() => { if (process.env.FIGURE_REPORT) console.log(REPORT.join('\n')); });   // eslint-disable-line no-console

// ── the drawing, state by state (the same reading as networth_matches_v08) ─────────────────────────────────────────
const DRAWING = 'MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_net-worth-quiet-instrument_v08.html';
const LINES = drawingLines(DRAWING, [/<span class="pn">[^<]*<\/span>/g, /<span class="idot"[^>]*>i<\/span>/g, /<svg[\s\S]*?<\/svg>/g]);
const STARTS = LINES.map((l, i) => (l === '9:41' ? i : -1)).filter((i) => i >= 0);
const CHROME = new Set(['9:41', '▮▮▮ ⌁ ▐', '▦ Menu', 'MoneyKeel', '◉', '⚙']);
const phone = (n: number): string[] => {
  const seg = LINES.slice(STARTS[n - 1], STARTS[n] ?? LINES.length);
  let end = seg.findIndex((l, k) => l === 'Home' && seg[k + 1] === 'Net worth');
  if (end < 0) end = seg.findIndex((l) => /^STATE [A-G]/.test(l));
  return seg.slice(0, end).filter((l) => !CHROME.has(l));
};
const between = (from: RegExp, to: RegExp): string[] => {
  const a = LINES.findIndex((l) => from.test(l)); const b = LINES.findIndex((l, i) => i > a && to.test(l));
  expect(a).toBeGreaterThan(0); expect(b).toBeGreaterThan(a);
  return LINES.slice(a, b + 1);
};
const from = (lines: string[], start: RegExp, nth = 0) => { const hits = lines.map((l, i) => (start.test(l) ? i : -1)).filter((i) => i >= 0); expect(hits.length).toBeGreaterThan(nth); return lines.slice(hits[nth]); };
const upTo = (lines: string[], stop: RegExp) => { const i = lines.findIndex((l) => stop.test(l)); expect(i).toBeGreaterThan(0); return lines.slice(0, i); };
const through = (lines: string[], last: RegExp) => { const i = lines.findIndex((l) => last.test(l)); expect(i).toBeGreaterThan(0); return lines.slice(0, i + 1); };
test('the drawing still has its six phones and its READ THIS FIRST table — the guard proves it looked', () => {
  expect(STARTS).toHaveLength(6);
  expect(require('fs').readFileSync(DRAWING, 'utf8')).toMatch(/READ THIS FIRST — ADDED AFTER THIS MOCKUP/);
});

// ── the household the drawing draws, on its own day ────────────────────────────────────────────────────────────────
const TODAY = '2026-08-11', SINCE = '2026-08-03', E_TRADE_SYNC = '2026-07-28';
const START_DAY = (vti: number) => recordedDay(SINCE, [['chk', 8000, 'cash'], ['van', 838, 'cash'], ['van', vti], ['etr', 5819, 'typed']]);
const DATA = (over: any = {}) => ({
  onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self', hideBalances: false,
  onboardingProfile: { ...employedPartner, monthlySpending: '4500' },
  retirementAssumptions: { retireAge: 65, contribMonthly: 1200, spendMonthly: 4500, horizonAge: 92 },
  assetAccounts: [
    { asset_id: 'chk', label: 'Chase Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 8000, target_return: 0 },
    { asset_id: 'van', label: 'Vanguard Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 349333,
      target_return: 0.07, source: 'connected', last_synced: `${TODAY}T09:00:00Z`, cash_balance: 838,
      positions: [{ position_id: 'p1', ticker: 'VTI', asset_class: 'stock_etf', last_price: 105, price: 105, shares: 3319,
        lots: [{ lot_id: 'l1', shares: 3319, cost_per_share: 84, purchase_date: '2024-01-02' }] }] },
    { asset_id: 'etr', label: 'E*TRADE Brokerage', institution: 'E*TRADE', kind: 'fixed_income', tax_bucket: 'TAXABLE',
      asset_class: 'bonds', balance: 5819, target_return: 0.042, source: 'connected', last_synced: `${TODAY}T09:00:00Z`,
      maturity_date: '2027-08-24', coupon_rate: 0.04 },
    { asset_id: 'hme', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 450000, target_return: 0, value_as_of: TODAY },
  ],
  liabilities: [
    { debt_id: 'mtg', label: 'Home mortgage', debt_type: 'MORTGAGE', remaining_balance: 412000, interest_rate_apr: 0.055, minimum_monthly_payment: 2400 },
    { debt_id: 'cc', label: 'Chase Visa', debt_type: 'CREDIT_CARD', remaining_balance: 6000, interest_rate_apr: 0.229, minimum_monthly_payment: 150 },
  ],
  transactions: [
    { id: 'c', account_id: 'van', type: 'DEPOSIT', amount: 500, date: TODAY },
    { id: 'w', account_id: 'van', type: 'WITHDRAWAL', amount: 500, date: TODAY },
    { id: 'd', account_id: 'van', type: 'DIVIDEND', ticker: 'VTI', amount: 1220, date: TODAY },
    { id: 'i', account_id: 'etr', type: 'INTEREST', amount: 430, date: TODAY },
    { id: 'p', account_id: 'mtg', type: 'DEBT_PAYMENT', amount: 200, date: TODAY },
  ],
  nwDaily: { [SINCE]: 393042, [TODAY]: 395152 },
  snapshotDays: [START_DAY(346585)],
  ...over,
});
/** State D and F: LCTX has no price today (965 shares, $965 paid), and E*TRADE last updated Jul 28 — the drawn date. */
const GAPS = () => ({
  assetAccounts: DATA().assetAccounts.map((a: any) => a.asset_id === 'etr' ? { ...a, last_synced: `${E_TRADE_SYNC}T09:00:00Z` }
    : a.asset_id === 'van' ? { ...a, positions: [...a.positions, { position_id: 'p2', ticker: 'LCTX', asset_class: 'stock_etf', shares: 965, price: null,
      lots: [{ lot_id: 'l2', shares: 965, cost_per_share: 1, purchase_date: '2024-01-02' }] }] } : a),
});
beforeEach(() => {
  jest.useFakeTimers({ now: new Date(`${TODAY}T12:00:00`), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
});
afterEach(() => { jest.useRealTimers(); });
const setup = (over: any = {}) => { useStore.getState().resetAll(); useStore.setState(DATA(over) as any); render(<NetWorth />); };
const shownNow = () => builtLines(screen.toJSON());
const collapseAll = () => { for (const g of [/^▾ 💵 Cash/, /^▾ 📈 Investments/, /^▾ 🏠 Personal property/]) fireEvent.press(screen.getByText(g)); };

// ── what the READ THIS FIRST table changed, row by row ─────────────────────────────────────────────────────────────
const R0928 = 'READ THIS FIRST 2026-09-28 (MK-NW-M-046 · MK-NW-M-047): two lines under the emergency fund — the months at the planned level of expenses, and "Both include $X/month of debt payments you cannot stop."';
const R1923 = 'READ THIS FIRST 2026-10-04 (DEC-1923): every debt\'s minimum payment from Debts, the Rent / Mortgage line not counted — "For the household drawn below the figure reads 2.3 months … $8,838 ÷ ($1,300 + $2,400 mortgage + $150 card)"';
const R4529B = 'READ THIS FIRST 2026-10-11 (DEC-4529 · MK-NW-M-001): DRAWING ERROR, state B — "−0.40%" should read −0.41%';
const R4529E = 'READ THIS FIRST 2026-10-11 (DEC-4529 · MK-NW-M-001): DRAWING ERROR, state E — "Ending net worth (Aug 4)" and "Aug 3 → Aug 4, 2026" should read Aug 11';
const R4529F = 'READ THIS FIRST 2026-10-11 (DEC-4529 · MK-NW-F-045): DRAWING ERROR, state F — "in 7 days" should read "in 14 days"';
/** The emergency fund, as the two rows have it: $8,838 ÷ ($1,300 + $2,400 + $150 = $3,850) = 2.3 months; at the planned
 *  spend $8,838 ÷ $4,750 = 1.9 months; both include $2,400 + $150 = $2,550 of debt payments. */
const FUND: Known[] = ['A', 'A2', 'B'].flatMap((s) => [
  [s, ['2.0', '$8,838', '$4,500'], ['2.3', '$8,838', '$3,850'], R1923],
  [s, ['2.3', '$8,838', '$3,850'], ['2.3', '$8,838', '$3,850', '1.9', '$8,838', '$4,750', '$2,550'], R0928],
] as Known[]);
const KNOWN: Known[] = [
  ...FUND,
  ['B', ['−0.40%'], ['−0.41%'], R4529B],
  ['E', ['aug 4', '$395,152', 'aug 3', 'aug 4, 2026'], ['aug 11', '$395,152', 'aug 3', 'aug 11, 2026'], R4529E],
  ['F', ['7'], ['14'], R4529F],
];
test('the rows\' own arithmetic: the figures KNOWN puts in place of the drawn ones are worked from the drawing\'s household', () => {
  expect((8838 / (1300 + 2400 + 150)).toFixed(1)).toBe('2.3');                 // DEC-1923
  expect((8838 / (4500 - 2300 + 2400 + 150)).toFixed(1)).toBe('1.9');           // 2026-09-28: $4,500 planned, less the $2,300 Rent line, plus the debts
  expect(2400 + 150).toBe(2550);
  expect((((363152 / 364632) - 1) * 100).toFixed(2)).toBe('-0.41');             // B: −0.406%
  expect((Date.UTC(2026, 7, 11) - Date.UTC(2026, 6, 28)) / 86_400_000).toBe(14); // F: Jul 28 → Aug 11
});

// ── the states ─────────────────────────────────────────────────────────────────────────────────────────────────────
describe('Net worth v08 — every figure and date, in each data state', () => {
  test('A — with data, by category', () => { setup(); compare('A', phone(1), shownNow(), 36, KNOWN); });
  test('A2 — by institution', () => { setup(); fireEvent.press(screen.getByText('By institution')); compare('A2', phone(2), shownNow(), 36, KNOWN); });
  test('B — all collapsed, and the down case', () => {
    setup({ nwDaily: { [SINCE]: 396632, [TODAY]: 395152 }, snapshotDays: [START_DAY(349975)] });
    collapseAll(); compare('B', phone(3), shownNow(), 34, KNOWN);
  });
  // state C draws "3 answers make it yours": the person has given none of the three, so it is read with no age (as
  // networth_matches_v08 reads it)
  test('C — first day', () => {
    useStore.getState().resetAll();
    useStore.getState().setOnboardingProfile({ ...employedPartner, birthYear: undefined, birthMonth: undefined } as any);
    render(<NetWorth />); compare('C', phone(4), shownNow(), 11, KNOWN);
  });
  test('D — the missing-data banner (the frame stops below the debts)', () => {
    setup(GAPS()); collapseAll(); compare('D', phone(5), upTo(shownNow(), /^EMERGENCY FUND/), 31, KNOWN);
  });
  test('E — the change walk', () => {
    setup(); fireEvent.press(screen.getByText(/Change in net worth/));
    compare('E', between(/^How \$393,042 became/, /^Contributions are not a gain/), through(from(shownNow(), /^How .* became/i), /Contributions are not a gain/), 15, KNOWN);
  });
  test('F — the fix sheet', () => {
    setup(GAPS()); fireEvent.press(screen.getByText(/numbers? needs? more information/));
    compare('F', between(/^2 numbers need more information$/, /^Nothing here is a nag/), through(from(shownNow(), /numbers? needs? more information/, 1), /^Nothing here is a nag/), 3, KNOWN);
  });
  // state G draws the sheet over the screen from under the retirement line: the hero and the plan line above it, then
  // the sheet's own lines (none of which is a figure)
  test('G — the add sheet', () => {
    setup(); fireEvent.press(screen.getByText(/Add an account/));
    const shown = shownNow();
    compare('G', phone(6), [...upTo(shown, /^By category$/), ...from(shown, /^How do you want to add an account/)], 13, KNOWN);
  });
});
