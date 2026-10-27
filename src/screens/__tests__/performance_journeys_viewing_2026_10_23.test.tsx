/** PERFORMANCE JOURNEYS — VIEWING (2026-10-23, E2E-63 to E2E-68). A person moves through Performance and reads it.
 *
 *  Each flow renders the real screens, taps the controls a person touches (found by their words or their spoken label), follows
 *  every push to the screen it names with the parameters it carried, and checks the outcome where the person looks next — on
 *  the Performance tab (/invest), the account page (/account-detail), the Holding page (/holding-detail) and Home. Every figure
 *  is worked by hand beside its check. The household of E2E-63, E2E-64 and E2E-68 is the founder's shape, Performance v17 phone 1:
 *  two linked accounts (Vanguard Brokerage holding VTI and cash, E*TRADE holding VOO), a daily record that begins Oct 1, 2025,
 *  $15,000 paid in, dividends and interest — on the drawing's own day, Sep 30, 2026.
 *
 *  What the flows found wrong in the app, each fixed the same day (2026-10-23) and named where it is checked:
 *   · E2E-63 — the account page opened a holding's page on 1Y whatever window was picked (2Y: the row +16.00%, the page +7.69%);
 *     over 2Y the category figures printed the two years' total beside yearly rates (account page Stocks / Funds +34.62% over
 *     its one holding's +16.00%; Performance tab Stocks / Funds +35.20% under "2Y is shown per year").
 *   · E2E-65 — on a first day with an account typed as one total, the day-one line said its figures came from each holding's
 *     past prices while every window read "—".
 *   · E2E-67 — an account built from its holdings entered today's record at what was paid, not at today's price: worth $29,000,
 *     it read Return −25.00% beside Wealth generated +$1,000.
 *   · E2E-68 — the Performance tab's account bar could not be opened by a screen reader (its door sat inside the bar's own
 *     button); the Holding page's card was one element, so its window chips could not be reached; the account page said its
 *     2Y returns without "a year" and its walk's last line as "today" under a printed date.
 */
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import * as fs from 'fs';
import * as path from 'path';
import { useStore } from '../../store/useStore';
import { setHideBalances } from '../../domain/_shared/money';
import { builtLines, drawingLines, norm as mmNorm, firstDifference as mmFirstDifference } from '../../testing/mockMatch';

let mockParams: Record<string, string | undefined> = {};
const mockPushes: string[] = [];
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: (r: string) => mockPushes.push(r), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: (r: string) => mockPushes.push(r), replace: jest.fn(), back: jest.fn() },
  Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));
/** The price source, replaced by a stand-in that answers as each flow says — by default it never answers, so a screen that
 *  refreshes on opening changes nothing until a flow lets it. Nothing reaches the network. */
const mockFetch = jest.fn((_t: string[]) => new Promise<Record<string, any>>(() => {}));
jest.mock('../../services/marketData', () => ({ ...jest.requireActual('../../services/marketData'), fetchPriceSeries: (t: string[]) => mockFetch(t) }));

// ── the day, and the record ─────────────────────────────────────────────────────────────────────────────────────────────
const TODAY = '2026-09-30';   // Performance v17's own date, "Sep 30, 2026"
const FAKE = ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] as const;
const closes = (pts: [string, number][]) => ({ points: pts.map(([date, close]) => ({ date, close })) });
/** One recorded day: each holding's units at that day's close, and each account's cash. */
const day = (date: string, rows: [string, string, number, number][], cash: Record<string, number>) => ({
  date, origin: 'observed', writtenAt: `${date}T00:00:00Z`,
  holdings: rows.map(([accountId, k, units, price]) => ({ date, accountId, securityKey: k, symbol: k, units, price, value: units * price, currency: 'USD' })),
  accounts: Object.keys(cash).map((accountId) => ({ date, accountId, currency: 'USD', typedValue: null, cash: cash[accountId],
    statedTotal: rows.filter((r) => r[0] === accountId).reduce((t, r) => t + r[2] * r[3], 0) + cash[accountId] })),
});

// ── THE FOUNDER'S HOUSEHOLD (Performance v17 phone 1's shape) ──────────────────────────────────────────────────────────────
// Vanguard Brokerage: 300 VTI and cash; $15,000 paid in on Dec 2, 2025; a $1,500 VTI dividend and $200 of interest on Jun 30.
// E*TRADE Account 1: 40 VOO; a $300 dividend and $200 of interest on Jun 30. Both bought Jun 1, 2023 (held all of every window).
// Each recorded day, by hand (VTI close, VOO close, Vanguard cash, E*TRADE cash → Vanguard, E*TRADE, together):
//   Oct 1, 2025   260, 500,  2,000,   0 → 300×260+2,000 = 80,000 · 40×500 = 20,000          · 100,000
//   Dec 1, 2025   270, 510,  2,000,   0 →              83,000 ·         20,400              · 103,400
//   Dec 2, 2025   270, 510, 17,000,   0 → (+15,000 in) 98,000 ·         20,400              · 118,400
//   Dec 31, 2025  265, 505, 17,000,   0 →              96,500 ·         20,200              · 116,700
//   Jun 30, 2026  270, 520, 18,700, 500 → (+1,700 div+int) 99,700 · 20,800+500 = 21,300     · 121,000
//   Aug 28, 2026  275, 540, 18,700, 500 →             101,200 ·         22,100              · 123,300
//   Sep 30, 2026  280, 550, 18,700, 500 →             102,700 ·         22,500              · 125,200
const P1_DAYS: [string, number, number, number, number][] = [
  ['2025-10-01', 260, 500, 2_000, 0], ['2025-12-01', 270, 510, 2_000, 0], ['2025-12-02', 270, 510, 17_000, 0], ['2025-12-31', 265, 505, 17_000, 0],
  ['2026-06-30', 270, 520, 18_700, 500], ['2026-08-28', 275, 540, 18_700, 500], ['2026-09-30', 280, 550, 18_700, 500],
];
const VANGUARD = { asset_id: 'van', label: 'BROKERAGE', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 102_700, cash_balance: 18_700,
  target_return: 0.05, source: 'connected', last_synced: `${TODAY}T08:00:00Z`,
  positions: [{ position_id: 'p1', ticker: 'VTI', asset_class: 'stock_etf', last_price: 280, lots: [{ lot_id: 'p1l', shares: 300, cost_per_share: 180, purchase_date: '2023-06-01' }] }] };
const ETRADE = { asset_id: 'etr', label: 'ACCOUNT 1', institution: 'E*TRADE', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 22_500, cash_balance: 500,
  target_return: 0.05, source: 'connected', last_synced: `${TODAY}T08:00:00Z`,
  positions: [{ position_id: 'p2', ticker: 'VOO', asset_class: 'stock_etf', last_price: 550, lots: [{ lot_id: 'p2l', shares: 40, cost_per_share: 380, purchase_date: '2023-06-01' }] }] };
const P1 = {
  assetAccounts: [VANGUARD, ETRADE],
  transactions: [
    { id: 'd1', txn_id: 'd1', date: '2025-12-02', type: 'DEPOSIT', account_id: 'van', amount: 15_000, source: 'connected' },
    { id: 'v1', txn_id: 'v1', date: '2026-06-30', type: 'DIVIDEND', account_id: 'van', ticker: 'VTI', amount: 1_500, source: 'connected' },
    { id: 'i1', txn_id: 'i1', date: '2026-06-30', type: 'INTEREST', account_id: 'van', amount: 200, source: 'connected' },
    { id: 'v2', txn_id: 'v2', date: '2026-06-30', type: 'DIVIDEND', account_id: 'etr', ticker: 'VOO', amount: 300, source: 'connected' },
    { id: 'i2', txn_id: 'i2', date: '2026-06-30', type: 'INTEREST', account_id: 'etr', amount: 200, source: 'connected' },
  ],
  snapshotDays: P1_DAYS.map(([d, vti, voo, vc, ec]) => day(d, [['van', 'VTI', 300, vti], ['etr', 'VOO', 40, voo]], { van: vc, etr: ec })),
  // each holding's price history: two years back (Sep 27, 2024, the last close before 2Y's beginning on Sep 29), the close
  // before 1Y's beginning (Sep 29, 2025 — unchanged to Oct 1), and every recorded day; SPY is the stock market
  priceCache: {
    VTI: closes([['2024-09-27', 208], ['2025-09-29', 260], ...P1_DAYS.map(([d, v]) => [d, v] as [string, number])]),
    VOO: closes([['2024-09-27', 400], ['2025-09-29', 500], ...P1_DAYS.map(([d, , v]) => [d, v] as [string, number])]),
    SPY: closes([['2024-09-27', 500], ['2025-09-29', 560], ['2025-10-01', 560], ['2025-12-31', 580], ['2026-08-28', 590], ['2026-09-30', 600]]),
  },
  pricesFetchedAt: new Date(`${TODAY}T04:00:00`).toISOString(),
};

// ── reading a screen ────────────────────────────────────────────────────────────────────────────────────────────────────
const lines = () => builtLines(screen.toJSON());
const after = (label: string, n = 1, ls = lines()) => { const i = ls.indexOf(label); return i >= 0 ? ls[i + n] : undefined; };
const squash = (s: string) => s.replace(/\s+/g, ' ').trim();
const textOf = (n: any): string => (n == null ? '' : typeof n === 'string' ? n : Array.isArray(n) ? n.map(textOf).join('') : (n.children ?? []).map(textOf).join(''));
/** WHAT A SCREEN READER REACHES, in order: each element marked accessible (a Text is one of its own), with what it says — its
 *  label, or with none its printed words — and what it prints. Anything inside an accessible element is not reached on its
 *  own: VoiceOver reads the outer element and goes on. A subtree hidden from accessibility is skipped. */
type Reached = { said: string; printed: string; node: any };
function reachable(): Reached[] {
  const out: Reached[] = [];
  const walk = (n: any) => {
    if (n == null || typeof n === 'string') { if (typeof n === 'string' && squash(n)) out.push({ said: squash(n), printed: squash(n), node: null }); return; }
    if (Array.isArray(n)) { n.forEach(walk); return; }
    const p = n.props ?? {};
    if (p.accessibilityElementsHidden || p.importantForAccessibility === 'no-hide-descendants') return;
    if (p.accessible || n.type === 'Text') {
      const printed = squash(textOf(n));
      const said = squash(p.accessibilityLabel ? String(p.accessibilityLabel) : printed);
      if (said) out.push({ said, printed, node: n });
      return;
    }
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
}
const heard = () => reachable().map((r) => r.said);
/** the marks a screen reader spells out, never words (the spoken writers' own list: performance_spoken_and_agree, part G) */
const MARKS = /[▲▼⚠⏱›•~→＋▾▸]|\d%?\/(year|month)|\d{4}-\d{2}-\d{2}/;

// ── following a push to the screen it names ─────────────────────────────────────────────────────────────────────────────
const SCREENS: Record<string, () => any> = {
  '/(tabs)/invest': () => require('../PerformanceScreen').default,
  '/account-detail': () => require('../AccountPortfolioScreen').default,
  '/holding-detail': () => require('../HoldingDetailScreen').default,
  '/(tabs)/home': () => require('../HomeScreen').default,
  '/(tabs)/analytics': () => require('../NetWorthScreen').default,
  '/add-account': () => require('../AddAccountScreen').default,
  '/look-back': () => require('../LookBackScreen').default,
};
/** THE APP'S OWN FRAME, as app/_layout.tsx draws it: the root writes the hide-balances flag every money writer reads and
 *  remounts on it; a tab screen carries the shared top bar (app/(tabs)/_layout.tsx: header: () => <TopBar />). */
function Root({ children }: { children: React.ReactNode }) {
  const hidden = useStore((s: any) => s.hideBalances);
  setHideBalances(!!hidden);
  return <React.Fragment key={String(!!hidden)}>{children}</React.Fragment>;
}
function open(route: string) {
  const [where, q] = route.split('?');
  mockParams = Object.fromEntries(new URLSearchParams(q ?? '').entries());
  const make = SCREENS[where];
  if (!make) throw new Error(`no screen for ${where}`);
  const C = make();
  const TopBar = require('../../components/TopBar').default;
  return render(<Root>{where.startsWith('/(tabs)/') && <TopBar />}<C /></Root>);
}
/** follow the last push: unmount what is open and open where it points */
function follow(): string {
  const to = mockPushes[mockPushes.length - 1];
  if (!to) throw new Error('nothing was pushed');
  screen.unmount();
  open(to);
  return to;
}
const windowButton = (label: string) => {
  const b = screen.getAllByRole('button').find((x) => String(x.props.accessibilityLabel ?? '').startsWith(`Show ${label}`));
  if (!b) throw new Error(`no window ${label}`);
  return b;
};
const tapWindow = (label: string) => fireEvent.press(windowButton(label));
const settle = () => act(async () => { await Promise.resolve(); });

function start(state: Record<string, any>) {
  useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
  useStore.setState({ hideBalances: false, ...state } as any);
  mockPushes.length = 0;
}
beforeEach(() => {
  jest.useFakeTimers({ now: new Date(`${TODAY}T12:00:00`), doNotFake: [...FAKE] });
  mockFetch.mockReset();
  mockFetch.mockImplementation(() => new Promise(() => {}));
});
afterEach(() => { setHideBalances(false); jest.useRealTimers(); });

// ── Performance v17, word for word — the method and the dated differences of perf_matches_v17.test.tsx, kept with it ───────
const MON = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*';
const v17norm = (ls: string[]) => ls.join(' ').toLowerCase()
  .replace(/[’‘]/g, "'")
  .replace(/\p{Extended_Pictographic}|️|[ⓘ›↺·]/gu, ' ')
  .replace(/vanguard brokerage|e\*trade account 1|e\*trade brokerage|fidelity brokerage/g, '<account>')
  .replace(new RegExp(`${MON} \\d{1,2}(, \\d{4})?`, 'g'), '<date>')
  .replace(/[−-]?\$[\d,]+(\.\d+)?/g, '$#').replace(/[+−-]?\d+(\.\d+)?%/g, '#%').replace(/\d+/g, '#')
  .replace(/\s+/g, ' ').trim();
const MARK_16 = 'money moved in and out in amounts where when it moved would decide a window return, so this is your rate per year, counting when you added money';
/** the READ THIS FIRST rows of Performance v17 that change what phones 1 and 5 say (perf_matches_v17's KNOWN, 1 to 10) */
const v17known = (s: string) => s
  .replace(/(bonds & cds|cash in this account) \$# (#%\/year|—)/g, '$1 $# <rate or dash>')
  .replace(/linked wealth generated \$# since <date>/g, 'linked wealth generated $# return #%')
  .replace(/money-weighted, so money you added/g, 'time-weighted, so money you added')
  .replace(MARK_16, 'return is for the window you picked (<date> → <date>) — not a yearly rate time-weighted, so money you added never counts as return')
  .replace(new RegExp(` ${MARK_16.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), '')
  .replace(/since <date> #%\/year/g, 'since <date> #%').replace(/\breturn #%\/year/g, 'return #%')
  .replace(/how today's value stands all accounts \$#/g, 'how $# became $# all accounts')
  .replace(/^(performance <date> since <date> #% #m #% this year #% )#y — #y — summary/, '$1#y #% #y #% #y is shown per year, so it sits fairly beside #y summary');
const CHROME = new Set(['9:41', '▦ Menu', 'Money', 'Keel', '◉', '⚙', '🏠', 'Home', '💎', 'Net worth', '📈', '💵', 'Cash flow', '🧭', 'Plan']);
function v17phone(n: number): string[] {
  const p = path.join(__dirname, '..', '..', '..', 'MoneyKeel', 'documents', 'networth-and-performance', 'moneykeel_pres_mock_performance_v17.html');
  let body = fs.readFileSync(p, 'utf8').replace(/^[\s\S]*<body/, '<body').replace(/<(script|style)[\s\S]*?<\/\1>/g, '');
  body = body.replace(/<svg[\s\S]*?<\/svg>/g, (svg) => (/your line starts/.test(svg) ? svg : ''));
  const ls = body.replace(/<[^>]+>/g, '\n').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const starts = ls.map((l, i) => (l === '9:41' ? i : -1)).filter((i) => i >= 0);
  expect(starts.length).toBe(5);                                        // the guard looked: five phones
  const seg = ls.slice(starts[n - 1], starts[n] ?? ls.length);
  const end = seg.findIndex((l, k) => /^🏠/.test(l) && k > 10);
  expect(end).toBeGreaterThan(20);
  return seg.slice(0, end).filter((l) => !CHROME.has(l));
}
function v17difference(n: number, built: string[]): string {
  let want = v17known(v17norm(v17phone(n)));
  if (n === 1) want = want.replace(/<date> ?<date> (?=how \$# became)/, '');   // the graph's axis dates (SVG, after layout)
  const got = v17known(v17norm(built));
  expect(want.split(' ').length).toBeGreaterThan(60);
  const x = want.split(' '), y = got.split(' ');
  let i = 0; while (i < x.length && i < y.length && x[i] === y[i]) i += 1;
  if (i === x.length && i === y.length) return '';
  return `at word ${i}:\n  DRAWN … ${x.slice(Math.max(0, i - 8), i + 14).join(' ')}\n  BUILT … ${y.slice(Math.max(0, i - 8), i + 14).join(' ')}`;
}
/** the Performance tab as built, without the shared top bar's own words (the drawing's CHROME) — its "Menu", and its icons, which
 *  print as icon-font glyphs (private-use characters) once the font has loaded */
const tabLines = () => lines().filter((l) => !['Menu', '‹ Back'].includes(l) && !/^[\uE000-\uF8FF\s]+$/.test(l));

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E2E-63 · THE WINDOW JOURNEY — the founder taps Since → 1M → This year → 1Y → 2Y on the Performance tab, then opens Vanguard
// on 2Y, then VTI on 2Y. The summary follows each window; the account page and the Holding page open on the window picked and
// print the figures the tab printed for them.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('E2E-63 · the window journey in the founder\'s household (Performance v17 phone 1)', () => {
  test('E2E-63 · Since is drawn as v17 phone 1 draws it, word for word; each window then changes the summary to its own figures', () => {
    start(P1);
    open('/(tabs)/invest');
    expect(v17difference(1, tabLines())).toBe('');

    // SINCE OCT 1, 2025 — beginning $100,000 (the record's first day). Time-weighted, split at the $15,000 of Dec 2:
    // 103,400 ÷ 100,000 = 1.034; Dec 2: 118,400 ÷ (103,400 + 15,000) = 1; then 125,200 ÷ 118,400 = 1.057432 → 1.034 × 1.057432 − 1 = +9.34%.
    // Wealth generated 125,200 − 100,000 − 15,000 = $10,200 = dividends 1,800 + interest 400 + change 8,000.
    let ls = lines();
    expect(ls).toContain('SUMMARY · SINCE OCT 1, 2025');
    expect([after('Ending value', 1, ls), after('Wealth generated', 1, ls), after('Return', 1, ls)]).toEqual(['$125,200', '$10,200', '+9.34%']);
    expect(ls).toContain('HOW $100,000 BECAME $125,200 · ALL ACCOUNTS');
    expect(ls.slice(ls.indexOf('Beginning market value (Oct 1, 2025)'), ls.indexOf('Beginning market value (Oct 1, 2025)') + 16)).toEqual([
      'Beginning market value (Oct 1, 2025)', '$100,000', 'Contributions', '$15,000', 'Withdrawals', '$0', 'Wealth generated', '$10,200',
      'Dividends', '$1,800', 'Interest', '$400', 'Change in investment value', '$8,000', 'Ending market value (Sep 30, 2026)', '$125,200']);
    // every window's own figure on its button: 1M 125,200 ÷ 123,300 − 1 = +1.54%; This year 125,200 ÷ 116,700 − 1 = +7.28%;
    // 1Y the same as Since — VTI and VOO closed at $260 and $500 on Sep 29 and Oct 1, 2025, so the days before the record add
    // (1 + 0) — +9.34%; 2Y (1.25 × 1.093385)^(365 ÷ 731) − 1 = +16.88% a year (worked below)
    expect(['Since Oct 1, 2025', '1M', 'This year', '1Y', '2Y'].map((w) => after(w, 1, ls))).toEqual(['+9.34%', '+1.54%', '+7.28%', '+9.34%', '+16.88%']);

    // 1M — Aug 30 to Sep 30; its beginning is the evening before, Aug 29, read from the record's Aug 28: $123,300.
    // 125,200 − 123,300 = $1,900, all change in value; 1,900 ÷ 123,300 = +1.54%. Never a yearly rate.
    tapWindow('1M'); ls = lines();
    expect(ls).toContain('SUMMARY · PAST MONTH');
    expect([after('Ending value', 1, ls), after('Wealth generated', 1, ls), after('Return', 1, ls)]).toEqual(['$125,200', '$1,900', '+1.54%']);
    expect(ls).toContain('Return is for the window you picked (Aug 29, 2026 → Sep 30, 2026) — not a yearly rate');
    expect(ls).toContain('HOW $123,300 BECAME $125,200 · ALL ACCOUNTS');

    // THIS YEAR — from Dec 31, 2025's $116,700: $8,500 = dividends 1,800 + interest 400 + change 6,300; 8,500 ÷ 116,700 = +7.28%
    tapWindow('This year'); ls = lines();
    expect(ls).toContain('SUMMARY · THIS YEAR');
    expect([after('Wealth generated', 1, ls), after('Return', 1, ls)]).toEqual(['$8,500', '+7.28%']);
    expect(ls).toContain('HOW $116,700 BECAME $125,200 · ALL ACCOUNTS');
    expect(after('Change in investment value', 1, ls)).toBe('$6,300');

    // 1Y — its beginning, Sep 29, 2025, is before the record's first day: joined there (DEC-6412), the same $10,200 and +9.34%
    tapWindow('1Y'); ls = lines();
    expect(ls).toContain('SUMMARY · PAST YEAR');
    expect([after('Wealth generated', 1, ls), after('Return', 1, ls)]).toEqual(['$10,200', '+9.34%']);
    expect(ls).toContain("Your daily record begins Oct 1, 2025, so the days before it are worked back from each holding’s price history.");
    expect(ls).toContain('Beginning market value (Sep 29, 2025)');

    // 2Y — beginning Sep 29, 2024 (closes of Sep 27): 300 × $208 + 40 × $400 + $2,000 cash = 62,400 + 16,000 + 2,000 = $80,400.
    // The days before the record, holdings with a history: (78,000 + 20,000) ÷ (62,400 + 16,000) = 1.25 (cash gains $0, not counted).
    // Joined: 1.25 × 1.093385 = 1.366731 → +36.67% over the two years; Sep 29, 2024 → Sep 30, 2026 is 731 days:
    // 1.366731^(365 ÷ 731) − 1 = +16.88% a year. Wealth generated 125,200 − 80,400 − 15,000 = $29,800; change 29,800 − 2,200 = $27,600.
    tapWindow('2Y'); ls = lines();
    expect(1.25 * 1.034 * (125_200 / 118_400) - 1).toBeCloseTo(0.366731, 6);
    expect(Math.pow(1.366731, 365 / 731) - 1).toBeCloseTo(0.168823, 5);
    expect(ls).toContain('SUMMARY · PAST 2 YEARS');
    expect([after('Ending value', 1, ls), after('Wealth generated', 1, ls), after('Return', 1, ls)]).toEqual(['$125,200', '$29,800', '+16.88%']);
    expect(ls).toContain('2Y is shown per year, so it sits fairly beside 1Y');
    const note = ls.indexOf("Your daily record begins Oct 1, 2025, so the days before it are worked back from each holding’s price history.");
    expect(ls[note + 1]).toBe('+36.67% over the two years, which is +16.88%/year — a yearly rate, so it sits fairly beside a one-year window.');
    expect(ls).toContain('HOW $80,400 BECAME $125,200 · ALL ACCOUNTS');
    expect(after('Change in investment value', 1, ls)).toBe('$27,600');
    // each account in the same words. Vanguard (open): 1.25 × (83,000 ÷ 80,000) × (98,000 ÷ 98,000) × (102,700 ÷ 98,000) =
    // 1.359072 → +35.91%, a year +16.55%. E*TRADE (closed): 1.25 × 22,500 ÷ 20,000 = 1.40625 → +40.63%, a year +18.56%;
    // its wealth generated 22,500 − 16,000 = $6,500.
    expect(ls).toContain('+35.91% over the two years, which is +16.55%/year — a yearly rate, so it sits fairly beside a one-year window.');
    // the source label, then the rest of the closed line beside it (2026-10-25, MM-PF D4)
    expect(ls.join('\n')).toContain('🔗 Linked\n· wealth generated $6,500 · return +40.63% over the two years, which is +18.56%/year');
    // WHAT EACH CATEGORY EARNED, 2Y: Stocks / Funds grew (84,000 + 22,000) ÷ (62,400 + 16,000) − 1 = +35.20% in all, which is
    // 1.352^(365 ÷ 731) − 1 = +16.25% a year — the yearly rate, as the summary above it, saying it is yearly (FIXED 2026-10-23:
    // it printed +35.20%; the lead's ruling the same day: "/year" on it)
    expect(Math.pow(106_000 / 78_400, 365 / 731) - 1).toBeCloseTo(0.162533, 5);
    expect(ls.slice(ls.indexOf('Stocks / Funds'), ls.indexOf('Stocks / Funds') + 3)).toEqual(['Stocks / Funds', '$1,800', '+16.25%/year']);
    expect(screen.getByLabelText('Stocks / Funds, earned $1,800, return +16.25% a year')).toBeOnTheScreen();
  });

  test('E2E-63 · on 2Y, tapping Vanguard opens its page on 2Y with the figures the tab printed; tapping VTI opens its page on 2Y, and it agrees', () => {
    start(P1);
    open('/(tabs)/invest');
    tapWindow('2Y');
    const tab = lines();
    // what the tab printed for Vanguard on 2Y: its walk and its Return row
    const vStart = tab.indexOf('▾ Vanguard Brokerage');
    const vanguard = tab.slice(vStart, tab.indexOf('Tap ▾ to collapse · tap the name to open this account’s portfolio ›', vStart));
    expect(vanguard).toEqual(['▾ Vanguard Brokerage', '$102,700', '›', '🔗 Linked',
      'Beginning market value (Sep 29, 2024)', '$64,400', 'Contributions', '$15,000', 'Withdrawals', '$0', 'Wealth generated', '$23,300',
      'Dividends', '$1,500', 'Interest', '$200', 'Change in investment value', '$21,600', 'Ending market value (Sep 30, 2026)', '$102,700',
      'Return', '+16.55%', '+35.91% over the two years, which is +16.55%/year — a yearly rate, so it sits fairly beside a one-year window.']);

    // the person taps Vanguard's name
    fireEvent.press(screen.getAllByLabelText("Open Vanguard Brokerage — this account’s own page")[0]);
    expect(follow()).toBe('/account-detail?id=van&period=2Y');
    // the account page opens ON 2Y (the drawing's row 18): the 2Y button is the chosen one
    expect(windowButton('2Y').props.accessibilityState.selected).toBe(true);
    let ls = lines();
    expect(ls).toContain('THIS ACCOUNT · THE PAST 2 YEARS');
    // the same figures: Market value $102,700, Wealth generated 102,700 − 64,400 − 15,000 = $23,300, Return +16.55%
    expect([after('Market value', 1, ls), after('Wealth generated', 1, ls), after('Return', 1, ls)]).toEqual(['$102,700', '$23,300', '+16.55%']);
    expect(ls).toContain('+35.91% over the two years, which is +16.55%/year — a yearly rate, so it sits fairly beside a one-year window.');
    expect(ls).toContain('HOW $64,400 BECAME $102,700 · THIS ACCOUNT');
    const walk = ls.slice(ls.indexOf('Beginning market value (Sep 29, 2024)'), ls.indexOf('Beginning market value (Sep 29, 2024)') + 16);
    expect(walk).toEqual(vanguard.slice(4, 20));                         // line for line the walk the tab drew for Vanguard
    // the window bar is the account's own: Since 1.0375 × 1.047959 − 1 = +8.73%; 1M 102,700 ÷ 101,200 − 1 = +1.48%;
    // This year 102,700 ÷ 96,500 − 1 = +6.42%; 1Y the same as Since; 2Y +16.55%
    expect(['Since Oct 1, 2025', '1M', 'This year', '1Y', '2Y'].map((w) => after(w, 1, ls))).toEqual(['+8.73%', '+1.48%', '+6.42%', '+8.73%', '+16.55%']);
    // BY CATEGORY & HOLDING on 2Y: VTI $208 → $280, 280 ÷ 208 − 1 = +34.62% in all, 1.346154^(365 ÷ 731) − 1 = +16.00% a year.
    // VTI is all of Stocks / Funds, so the class bar is the same yearly rate (FIXED 2026-10-23: it read +34.62%), and every
    // return in the column says it is yearly (the lead's ruling the same day: they printed the yearly rate bare)
    expect(Math.pow(280 / 208, 365 / 731) - 1).toBeCloseTo(0.160003, 5);
    const cls = ls.indexOf('▾ Stocks / Funds');
    expect(ls.slice(cls, cls + 7)).toEqual(['▾ Stocks / Funds', '$84,000', '+16.00%/year', 'VTI', '300 shares · $280.00', '$84,000', '+16.00%/year']);
    expect(ls.slice(ls.indexOf('Total'), ls.indexOf('Total') + 3)).toEqual(['Total', '$102,700', '+16.55%/year']);

    // the person taps VTI
    fireEvent.press(screen.getAllByRole('button').find((b) => /^VTI, /.test(String(b.props.accessibilityLabel)))!);
    // FIXED 2026-10-23: the route carries the window; it opened on 1Y, where "Your return, past year" read +7.69%
    expect(follow()).toBe('/holding-detail?account=van&position=p1&period=2Y');
    expect(screen.getByLabelText('Show 2Y').props.accessibilityState.selected).toBe(true);
    ls = lines();
    // the same holding, the same window, the same figure: +16.00%/year; the market SPY $500 → $600, +20.00% in all,
    // 1.2^(365 ÷ 731) − 1 = +9.53% a year; ahead by 16.0003 − 9.5309 = 6.47 points a year
    expect(Math.pow(1.2, 365 / 731) - 1).toBeCloseTo(0.095309, 5);
    expect([after('Your return, past 2 years', 1, ls), after('The market, same dates', 1, ls), after('You are', 1, ls)])
      .toEqual(['+16.00%/year', '+9.53%/year', 'ahead by 6.47 points/year']);
    expect(ls).toContain('Your return: +34.62% over the two years, which is +16.00%/year — a yearly rate, so it sits fairly beside a one-year window.');
    expect(ls).toContain('The market: +20.00% over the two years, which is +9.53%/year.');
    // and its value is the row's: 300 × $280 = $84,000
    expect(after('Current value', 1, ls)).toBe('$84,000');
  });

  test('E2E-63 · Since, opened from the account page, is not a Holding-page window: the page opens on its own 1Y, as its drawing has it', () => {
    start(P1);
    open('/account-detail?id=van&period=SINCE');
    fireEvent.press(screen.getAllByRole('button').find((b) => /^VTI, /.test(String(b.props.accessibilityLabel)))!);
    expect(follow()).toBe('/holding-detail?account=van&position=p1');
    expect(screen.getByLabelText('Show 1Y').props.accessibilityState.selected).toBe(true);
    // 1Y: from Sep 29, 2025's $260 to $280: +7.69%; the market SPY $560 → $600: +7.14%
    expect(after('Your return, past year')).toBe('+7.69%');
    expect(after('The market, same dates')).toBe('+7.14%');
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E2E-64 · HIDE BALANCES — the person taps the eye on the Performance tab; every dollar is dots on the tab, the account page,
// the Holding page and Home; every percent stays; a screen reader says "hidden", never the dots.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('E2E-64 · hide balances, from the eye on the Performance tab', () => {
  const noDollars = () => lines().filter((l) => /\$\s?\d/.test(l));
  const dotsHeard = () => heard().filter((l) => l.includes('•'));
  test('E2E-64 · the eye hides every dollar on four screens; percents stay; VoiceOver hears "hidden"', () => {
    start(P1);
    open('/(tabs)/invest');
    expect(lines()).toContain('$125,200');
    fireEvent.press(screen.getByLabelText('Hide balances'));
    expect((useStore.getState() as any).hideBalances).toBe(true);

    // THE PERFORMANCE TAB, on 2Y
    tapWindow('2Y');
    let ls = lines();
    expect(screen.getByLabelText('Show balances')).toBeOnTheScreen();          // the eye now offers to show them
    expect(ls).toContain('Balances hidden — tap the eye to show');
    expect(noDollars()).toEqual([]);
    expect([after('Ending value', 1, ls), after('Wealth generated', 1, ls), after('Return', 1, ls)]).toEqual(['••••', '••••', '+16.88%']);
    expect(ls).toContain('HOW •••• BECAME •••• · ALL ACCOUNTS');
    expect(ls).toContain('+36.67% over the two years, which is +16.88%/year — a yearly rate, so it sits fairly beside a one-year window.');
    expect(ls.join('\n')).toContain('🔗 Linked\n· wealth generated •••• · return +40.63% over the two years, which is +18.56%/year');
    let h = heard();
    expect(dotsHeard()).toEqual([]);
    for (const said of ['Ending value, hidden', 'Wealth generated, hidden', 'Return, +16.88% a year', 'How hidden became hidden, all accounts',
      'Beginning market value (Sep 29, 2024), hidden', 'Contributions, hidden', 'Vanguard Brokerage, hidden. Collapses its walk.',
      'Linked, wealth generated hidden, return +40.63% over the two years, which is +18.56% a year']) expect(h).toContain(said);

    // THE ACCOUNT PAGE, opened from Vanguard's name
    fireEvent.press(screen.getAllByLabelText("Open Vanguard Brokerage — this account’s own page")[0]);
    follow();
    ls = lines();
    expect(noDollars()).toEqual([]);
    expect([after('Market value', 1, ls), after('Wealth generated', 1, ls), after('Return', 1, ls)]).toEqual(['••••', '••••', '+16.55%']);
    expect(ls).toContain('HOW •••• BECAME •••• · THIS ACCOUNT');
    expect(ls).toContain('300 shares · ••••');
    h = heard();
    expect(dotsHeard()).toEqual([]);
    for (const said of ['HOW hidden BECAME hidden · THIS ACCOUNT', 'Contributions, hidden', 'Ending market value (Sep 30, 2026), hidden',
      'Stocks / Funds, hidden, return +16.00% a year', 'VTI, 300 shares · hidden, hidden, return +16.00% a year, hidden dividends. Opens its page.',
      'Total, hidden, return +16.55% a year']) expect(h).toContain(said);

    // THE HOLDING PAGE, opened from VTI
    fireEvent.press(screen.getAllByRole('button').find((b) => /^VTI, /.test(String(b.props.accessibilityLabel)))!);
    follow();
    ls = lines();
    expect(noDollars()).toEqual([]);
    expect(ls).toContain('▲ up •••• (1.82%) today');                   // the day's move: $5.00 hidden, 5 ÷ 275 = 1.82% kept
    expect(ls).toContain('+16.00%/year');
    h = heard();
    expect(dotsHeard()).toEqual([]);
    expect(h).toContain('LAST CLOSE · SEP 30, 2026: hidden, up hidden, 1.82 percent today');
    expect(h).toContain('VTI, worth hidden, up hidden, 55.56 percent since purchase');   // 300 × (280 − 180) = $30,000 on $54,000

    // HOME
    screen.unmount();
    open('/(tabs)/home');
    ls = lines();
    expect(noDollars()).toEqual([]);
    expect(ls).toContain('▲ up •••• (1.54%) this month');
    expect(dotsHeard()).toEqual([]);
    expect(heard().find((l) => l.startsWith('Your investments:'))).toMatch(/^Your investments: hidden\. up hidden, 1\.54 percent this month\. This month's change is on hidden:/);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E2E-65 · A BRAND-NEW PERSON — nothing entered. The tab's first-day state as v17 phone 5 draws it; its one door; Add by hand;
// a Stocks / Funds account saved; back on the tab, phone 4's first day; a holding bought into it shows.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('E2E-65 · a brand-new person adds an account by hand, then a holding', () => {
  test('E2E-65 · phone 5 word for word → "Add your accounts ›" → Add by hand → saved → phone 4\'s first day → a holding bought shows', async () => {
    start({ assetAccounts: [], transactions: [], snapshotDays: [], priceCache: {}, pricesFetchedAt: null });
    open('/(tabs)/invest');
    expect(v17difference(5, tabLines())).toBe('');                        // v17 phone 5, word for word
    expect(lines()).toContain('Nothing entered yet. Add your accounts ›');

    // the one door opens the three ways to add an account, in the one list's words
    fireEvent.press(screen.getByText('Add your accounts ›'));
    const chooser = lines();
    expect(chooser.slice(chooser.indexOf('How do you want to add an account?'))).toEqual(['How do you want to add an account?',
      '🔗 Link it (read-only)', 'We can look, never touch your money.', '✍️ Add by hand', 'Your home, savings, or any account with no login.',
      '📄 Import from a file', 'The CSV export from your brokerage.']);
    fireEvent.press(screen.getByLabelText('Add by hand. Your home, savings, or any account with no login.'));
    expect(follow()).toBe('/add-account');

    // Add an account (add-account-by-hand v02): Stocks / Funds, Fidelity, Brokerage, $28,000, held in Taxable
    expect(lines()).toContain('Add an account');
    fireEvent.press(screen.getByLabelText('Stocks / Funds'));
    fireEvent.changeText(screen.getByLabelText('Account name'), 'Brokerage');
    fireEvent.changeText(screen.getByLabelText('Institution'), 'Fidelity');
    fireEvent.changeText(screen.getByLabelText('Balance'), '28000');
    fireEvent.press(screen.getByLabelText('Held in Taxable'));
    expect(lines()).toContain('Save $28,000');
    fireEvent.press(screen.getByLabelText('Save this account'));
    const acct = (useStore.getState() as any).assetAccounts.find((a: any) => a.label === 'Brokerage');
    expect(acct).toMatchObject({ institution: 'Fidelity', balance: 28_000, source: 'manual', tax_bucket: 'TAXABLE', asset_class: 'stocks_etf' });

    // back on the Performance tab: v17 phone 4's first day, one account typed as one total
    screen.unmount();
    open('/(tabs)/invest');
    let ls = tabLines();
    // every window a dash — nothing it holds has a price history
    expect(['Since today', '1M', 'This year', '1Y', '2Y'].map((w) => after(w, 1, ls))).toEqual(['—', '—', '—', '—', '—']);
    expect(ls.slice(ls.indexOf('SUMMARY · SINCE TODAY'), ls.indexOf('SUMMARY · SINCE TODAY') + 9)).toEqual(['SUMMARY · SINCE TODAY', 'ⓘ',
      'Ending value', '$28,000', 'Wealth generated', '$0', 'Return', '—',
      // phone 4's drawn line (FIXED 2026-10-23: it read "You added your accounts today. Figures for 1M, 1Y and longer come from
      // each holding's past prices." — and no figure came from any price)
      "Day one: your value is real, your return starts measuring from today. We never back-fill a year we didn’t see."]);
    const card = ls.indexOf('Fidelity Brokerage');
    expect(ls.slice(card, card + 21)).toEqual(['Fidelity Brokerage', '$28,000', '›', '✍️ By hand · you update it',
      'Beginning market value (today)', '$28,000', 'Contributions', '$0', 'Withdrawals', '$0', 'Wealth generated', '$0',
      'Dividends', '$0', 'Interest', '$0', 'Change in investment value', '$0', 'Ending market value (today)', '$28,000',
      'Every line fills in as days pass — the structure never changes.']);
    expect(ls.slice(ls.indexOf('WHAT EACH CATEGORY EARNED'))).toEqual(['WHAT EACH CATEGORY EARNED', 'SINCE TODAY', 'CATEGORY', 'EARNED', 'RETURN',
      'Stocks / Funds', '$0', '—', 'Bonds & CDs', '$0', '—', 'Cash in this account', '$0', '—', 'All categories', '$0',
      'Fills in with your first dividend or interest record. A file import carries no activity — that line will say so rather than show a false $0.', 'ⓘ']);

    // the person opens the account and records what it holds: a buy of 100 VTI at $280.00 today
    fireEvent.press(screen.getAllByLabelText("Open Fidelity Brokerage — this account’s own page")[0]);
    expect(follow()).toBe(`/account-detail?id=${acct.asset_id}&period=SINCE`);
    // the door names the account as its page does (FIXED 2026-10-23: "Add a buy or sale for Brokerage", the stored label)
    fireEvent.press(screen.getByLabelText('Add a buy or sale for Fidelity Brokerage'));
    fireEvent.changeText(screen.getByPlaceholderText('e.g. AAPL'), 'VTI');
    fireEvent.press(screen.getByLabelText('Type: Stocks / Funds'));   // a first holding: its type is asked (2026-10-25, trade-sheet v03 row 16)
    const [shares, price] = screen.getAllByPlaceholderText('0');
    fireEvent.changeText(shares, '100');
    fireEvent.changeText(price, '280');
    fireEvent.press(screen.getByLabelText('Record buy'));
    // the holding is on the account's page: 100 shares at $280.00 = $28,000, and the account's total stays $28,000 — the money
    // moved from the account's typed total into the holding (the trade rule, tradeCash)
    expect(lines()).toContain('Buy · VTI · 100 shares @ $280.00');
    expect((useStore.getState() as any).assetAccounts.find((a: any) => a.asset_id === acct.asset_id).balance).toBe(28_000);

    // back on the Performance tab, which fetches the new holding's prices on opening: VTI's history comes back
    mockFetch.mockImplementation(async () => ({ VTI: closes([['2024-09-27', 208], ['2025-09-29', 260], ['2026-08-28', 275], ['2026-09-29', 278], [TODAY, 280]]) }));
    screen.unmount();
    open('/(tabs)/invest');
    await settle();
    ls = tabLines();
    // the holding shows: its account still carries $28,000 — 100 VTI at today's close, $280.00 — and Stocks / Funds is its row.
    // Bought today at $280.00 and closing at $280.00 today, it has gained nothing in any window: 280 ÷ 280 − 1 = +0.00%,
    // each window's figure worked from VTI's own price history (DEC-5291), so the day-one line says so (DEC-5425, his words).
    expect(['Since today', '1M', 'This year', '1Y', '2Y'].map((w) => after(w, 1, ls))).toEqual(['—', '+0.00%', '+0.00%', '+0.00%', '+0.00%']);
    expect(ls).toContain("You added your accounts today. Figures for 1M, 1Y and longer come from each holding’s past prices.");
    expect(after('Ending value', 1, ls)).toBe('$28,000');
    expect(ls.slice(ls.indexOf('Fidelity Brokerage'), ls.indexOf('Fidelity Brokerage') + 2)).toEqual(['Fidelity Brokerage', '$28,000']);
    expect(ls.slice(ls.indexOf('CATEGORY'), ls.indexOf('CATEGORY') + 6)).toEqual(['CATEGORY', 'EARNED', 'RETURN', 'Stocks / Funds', '$0', '—']);

    // the holding has a door: the account's page lists it under the total entered, at its latest close, 100 × $280.00 = $28,000,
    // with the line saying the rows need not add up to it (FIXED 2026-10-23: an account typed as one total listed nothing, so
    // the holding bought into it had no way to its own page — READ THIS FIRST row 70 of the account-page drawing)
    fireEvent.press(screen.getAllByLabelText("Open Fidelity Brokerage — this account’s own page")[0]);
    follow();
    ls = lines();
    const tbl = ls.indexOf('BY CATEGORY & HOLDING');
    expect(tbl).toBeGreaterThanOrEqual(0);
    // its row: the class band it sits under is the class the trade sheet saved with it (the recording flows' part)
    const vtiRow = ls.indexOf('VTI', tbl);
    expect(ls.slice(vtiRow, vtiRow + 5)).toEqual(['VTI', '100 shares · $280.00', '$28,000', '—', '›']);
    expect(ls.slice(ls.indexOf('Total'), ls.indexOf('Total') + 3)).toEqual(['Total', '$28,000', '—']);
    expect(ls).toContain('The total is the one you entered, $28,000. Its holdings are listed at their latest close and need not add up to it.');
    fireEvent.press(screen.getAllByRole('button').find((b) => /^VTI, /.test(String(b.props.accessibilityLabel)))!);
    expect(follow()).toBe(`/holding-detail?account=${acct.asset_id}&position=${(useStore.getState() as any).assetAccounts.find((a: any) => a.asset_id === acct.asset_id).positions[0].position_id}`);
    ls = lines();
    // its own page: last close $280.00, 100 shares, bought today at $280.00 — worth $28,000
    expect(ls).toContain('VTI');
    expect([after('Current value', 1, ls), after('Quantity', 1, ls)]).toEqual(['$28,000', '100 shares']);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E2E-66 · LOOK BACK WITH NOTHING HELD, from an account page's door — gold coins typed by hand. It fetches what it compares;
// with prices, the answer worked by hand; with the fetch failing, no figure and the words of its drawing's dated row.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('E2E-66 · Look back, opened from an alternative\'s page, with nothing held', () => {
  const GOLD = { asset_id: 'g', label: 'Gold coins', kind: 'commodities', tax_bucket: 'TAXABLE', asset_class: 'alternatives', balance: 8_000, source: 'manual', value_as_of: '2026-09-01' };
  const openFromGold = () => {
    start({ onboardingProfile: {}, assetAccounts: [GOLD], transactions: [], snapshotDays: [], priceCache: {}, pricesFetchedAt: null });
    open('/account-detail?id=g');
    expect(lines()).toContain('Look back: what if this had been in the stock market? ›');
    fireEvent.press(screen.getByLabelText('Look back: what if this had been in the stock market?'));
  };
  test('E2E-66 · "Getting prices for AGG and SPY…", then with prices fetched: left in $20,500, moved to $23,200, $2,700 more', async () => {
    let answer: (v: Record<string, any>) => void = () => {};
    mockFetch.mockImplementation(() => new Promise((r) => { answer = r; }));
    openFromGold();
    expect(follow()).toBe('/look-back');
    expect(lines()).toContain('Getting prices for AGG and SPY…');
    // it asked the app's one price refresh for the pairing, SPY and the four yardsticks (DEC-1624)
    for (const t of ['AGG', 'SPY', 'GLD', 'BTC', 'AOR']) expect(mockFetch.mock.calls[0][0]).toContain(t);
    // twelve months back, AGG $100.00 → $102.50 and SPY $500.00 → $580.00
    await act(async () => { answer({ AGG: closes([['2025-09-29', 100], ['2026-03-31', 101], [TODAY, 102.5]]), SPY: closes([['2025-09-29', 500], ['2026-03-31', 540], [TODAY, 580]]) }); });
    // $20,000 × 102.5 ÷ 100 = $20,500 (up $500, +2.50%); $20,000 × 580 ÷ 500 = $23,200 (up $3,200, +16.00%); 23,200 − 20,500 = $2,700
    const ls = lines();
    expect(ls.slice(ls.indexOf('WHAT ACTUALLY HAPPENED'))).toEqual(['WHAT ACTUALLY HAPPENED',
      'Left in AGG it became $20,500 (up $500, +2.50%)', 'Moved to SPY it would be $23,200 (up $3,200, +16.00%)',
      'Difference: $2,700 more if you had moved.', 'Real past prices; not a prediction of what happens next.']);
    // Look back v01 phone A, word for word (its own holdings aside: nothing is held, so its choices are the four yardsticks)
    const L = drawingLines('MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_look-back_v01.html', [/<svg[\s\S]*?<\/svg>/g])
      .filter((l) => !['◉', '⚙', 'Money', 'Keel', 'i'].includes(l));
    const starts = L.map((l, i) => (l === '9:41' ? i : -1)).filter((i) => i >= 0);
    const phoneA = L.slice(starts[0] + 2, starts[1]);
    const drawn = phoneA.slice(0, phoneA.findIndex((l) => /^Real past prices/.test(l)) + 1).filter((l) => l !== '20,000');
    const at = (l: string) => drawn.indexOf(l);
    const want = [...drawn.slice(0, at('From') + 1), 'AGG', 'GLD', 'BTC', 'AOR', 'To', 'SPY', 'GLD', 'BTC', 'AOR', ...drawn.slice(at('When'))]
      .map((l) => l.replace('Left in BND', 'Left in AGG'));
    expect(want.length).toBeGreaterThan(20);
    expect(mmFirstDifference(mmNorm(want), mmNorm(lines()))).toBe('');
  });
  test('E2E-66 · with the fetch failing: "Getting prices…", then "Couldn\'t refresh prices for AGG or SPY …" and no figure', async () => {
    mockFetch.mockImplementation(async () => ({}));
    openFromGold();
    follow();
    expect(lines()).toContain('Getting prices for AGG and SPY…');
    await waitFor(() => expect(lines()).toContain("Couldn't refresh prices for AGG or SPY, so there is nothing to compare yet. Look back tries again each time it opens."));
    expect(lines().filter((l) => /\$\d|%/.test(l))).toEqual([]);           // no figure anywhere on the screen
    expect((useStore.getState() as any).priceRefreshFailed).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E2E-67 · PRICES THAT ARE OLD — a Fidelity brokerage built from its holdings, prices last fetched six days ago. The tab and
// the Holding page say so; a refresh fails and Home says "Couldn't refresh"; a pull to refresh that works moves every figure,
// and every screen agrees.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('E2E-67 · old prices, a failed refresh, then a pull to refresh that works', () => {
  // 100 VTI bought Jan 2, 2024 at $200.00 and $1,000 of cash; built from its holdings, its balance is cash + 100 × the latest
  // close the app holds: Sep 24's $280.00 → $29,000 (value_now $28,000, as the last refresh built it)
  const FID = { asset_id: 'fid', label: 'Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 29_000, cash_balance: 1_000,
    derive_balance: true, source: 'manual', value_as_of: '2026-09-24',
    positions: [{ position_id: 'q1', ticker: 'VTI', kind: 'stocks_etf', value_now: 28_000, lots: [{ lot_id: 'a', shares: 100, cost_per_share: 200, purchase_date: '2024-01-02' }] }] };
  const OLD = {
    assetAccounts: [FID], transactions: [],
    snapshotDays: [day('2026-08-28', [['fid', 'VTI', 100, 270]], { fid: 1_000 }), day('2026-09-24', [['fid', 'VTI', 100, 280]], { fid: 1_000 })],
    priceCache: { VTI: closes([['2025-09-29', 250], ['2026-08-28', 270], ['2026-09-23', 270], ['2026-09-24', 280]]),
      SPY: closes([['2025-09-29', 500], ['2026-08-28', 560], ['2026-09-24', 580]]) },
    pricesFetchedAt: new Date('2026-09-24T09:00:00').toISOString(),
  };
  const FRESH = { VTI: closes([['2025-09-29', 250], ['2026-08-28', 270], ['2026-09-23', 270], ['2026-09-24', 280], ['2026-09-29', 285], [TODAY, 290]]),
    SPY: closes([['2025-09-29', 500], ['2026-08-28', 560], ['2026-09-24', 580], [TODAY, 590]]) };

  test('E2E-67 · stale → "Couldn\'t refresh" → a pull that works → the tab, the account page, the Holding page and Home agree', async () => {
    start(OLD);
    mockFetch.mockImplementation(async () => ({}));                       // the refresh the tab asks for on opening fails
    open('/(tabs)/invest');
    await settle();
    let ls = tabLines();
    expect(ls).toContain('⚠ Prices may be out of date · updated 6 days ago — pull down to refresh');
    expect((useStore.getState() as any).priceRefreshFailed).toBe(true);
    // Since Aug 28, 2026: $28,000 (270 × 100 + 1,000) to today's $29,000, nothing moved in or out: +$1,000, 1,000 ÷ 28,000 = +3.57%
    // (FIXED 2026-10-23: today's record wrote VTI at what was paid, 100 × $200 + $1,000 = $21,000, and Return read −25.00%)
    expect([after('Ending value', 1, ls), after('Wealth generated', 1, ls), after('Return', 1, ls)]).toEqual(['$29,000', '$1,000', '+3.57%']);

    // the Holding page says the prices are old, and the day's move is the last market day's: 280 − 270 = $10.00, 10 ÷ 270 = 3.70%
    screen.unmount();
    open('/holding-detail?account=fid&position=q1');
    ls = lines();
    expect(ls).toContain('LAST CLOSE · SEP 24, 2026');
    expect(ls).toContain('▲ up $10.00 (3.70%) last market day');
    expect(ls).toContain('prices may be out of date (6 days ago)');

    // Home: the failed refresh says so, with the moment the numbers are from
    screen.unmount();
    open('/(tabs)/home');
    ls = lines();
    expect(ls).toContain("📡 Couldn't refresh — showing your numbers from Sep 24, 9:00 AM.");
    expect(ls).toContain('⚠ prices may be out of date — updated 6 days ago');
    // Home's month is the tab's 1M: Aug 29's beginning (the record's Aug 28) $28,000 → $29,000: up $1,000 (3.57%)
    expect(ls).toContain('▲ up $1,000 (3.57%) this month');

    // the person pulls down to refresh, and this time the prices come: VTI $290.00 today
    mockFetch.mockImplementation(async () => FRESH);
    const pull = screen.UNSAFE_getAllByType(ScrollView)[0];
    await act(async () => { await pull.props.refreshControl.props.onRefresh(); });
    ls = lines();
    expect(ls.some((l) => l.startsWith("📡 Couldn't refresh"))).toBe(false);
    expect(ls).toContain('prices updated just now');
    // YOUR INVESTMENTS leaves the cash out: 100 × $290 = $29,000; the month: $28,000 → $30,000 = up $2,000, 2,000 ÷ 28,000 = 7.14%,
    // on $30,000 — the account with its cash; Net worth $30,000
    expect(after('YOUR INVESTMENTS', 2, ls)).toBe('$29,000');
    expect(ls).toContain('▲ up $2,000 (7.14%) this month');
    expect(ls).toContain("This month's change is on $30,000: your investment accounts with the cash in them.");
    expect(after('Net worth', 2, ls)).toBe('$30,000');

    // the Performance tab: no warning; the same $30,000, $2,000 and +7.14%
    screen.unmount();
    open('/(tabs)/invest');
    ls = tabLines();
    expect(ls.some((l) => l.startsWith('⚠ Prices may be out of date'))).toBe(false);
    expect([after('Ending value', 1, ls), after('Wealth generated', 1, ls), after('Return', 1, ls)]).toEqual(['$30,000', '$2,000', '+7.14%']);
    tapWindow('1M');
    expect([after('Wealth generated'), after('Return')]).toEqual(['$2,000', '+7.14%']);    // Home's month, the same figures

    // the account page: the same three figures
    fireEvent.press(screen.getAllByLabelText("Open Fidelity Brokerage — this account’s own page")[0]);
    follow();
    ls = lines();
    expect([after('Market value', 1, ls), after('Wealth generated', 1, ls), after('Return', 1, ls)]).toEqual(['$30,000', '$2,000', '+7.14%']);
    // what it holds, listed at the close its balance was built from (FIXED 2026-10-23: an account built from its holdings listed
    // nothing, so its holding's page could not be reached): 100 × $290 = $29,000, on 1M 290 ÷ 270 − 1 = +7.41% (Aug 28's close
    // the evening before the window); cash $1,000; Total $30,000 at the account's +7.14%
    const tbl = ls.indexOf('BY CATEGORY & HOLDING');
    expect(ls.slice(tbl, tbl + 12)).toEqual(['BY CATEGORY & HOLDING', 'CATEGORY / HOLDING', 'MARKET VALUE', 'RETURN',
      '▾ Stocks / Funds', '$29,000', '+7.41%', 'VTI', '100 shares · $290.00', '$29,000', '+7.41%', '›']);
    expect(ls.slice(ls.indexOf('Cash in this account'), ls.indexOf('Cash in this account') + 4)).toEqual(['Cash in this account', 'uninvested balance', '$1,000', '—']);
    expect(ls.slice(ls.indexOf('Total'), ls.indexOf('Total') + 3)).toEqual(['Total', '$30,000', '+7.14%']);

    // the Holding page: today's close, today's move 290 − 285 = $5.00, 5 ÷ 285 = 1.75%; 100 × 290 = $29,000, up
    // 29,000 − 20,000 = $9,000, 9,000 ÷ 20,000 = +45.00%
    fireEvent.press(screen.getAllByRole('button').find((b) => /^VTI, /.test(String(b.props.accessibilityLabel)))!);
    follow();
    ls = lines();
    expect(ls).toContain('LAST CLOSE · SEP 30, 2026');
    expect(after('LAST CLOSE · SEP 30, 2026', 1, ls)).toBe('$290.00');
    expect(ls).toContain('▲ up $5.00 (1.75%) today');
    expect(ls.some((l) => l.startsWith('prices may be out of date'))).toBe(false);
    expect([after('Current value', 1, ls), after('Change since purchase', 1, ls)]).toEqual(['$29,000', '▲ +$9,000 (+45.00%)']);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E2E-68 · A SCREEN-READER USER — Home's card read in printed order, its spoken action to the Net worth tab where the line
// shows; on the Performance tab an account reached and opened; on its page a holding reached and opened; every label says
// what is printed, with no marks heard.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('E2E-68 · a screen-reader user', () => {
  // the household, with a Schwab IRA whose balance was never entered: Home's card names it, and offers it as a spoken action
  const IRA = { asset_id: 'ira', label: 'IRA', institution: 'Schwab', kind: 'trad_ira', tax_bucket: 'PRE_TAX', asset_class: 'stocks_etf', balance: null, source: 'manual' };
  const markHeard = () => reachable().filter((r) => MARKS.test(r.said)).map((r) => r.said);

  test('E2E-68 · Home\'s card is heard in printed order, without marks; its spoken action opens the Net worth tab, where the line shows', () => {
    start({ ...P1, assetAccounts: [VANGUARD, ETRADE, IRA] });
    open('/(tabs)/home');
    const card = reachable().find((r) => r.said.startsWith('Your investments:'))!;
    // printed, in order: YOUR INVESTMENTS · $106,000 (84,000 + 22,000, the cash left out) · ⚠ Schwab Traditional IRA has no
    // balance › · ▲ up $1,900 (1.54%) this month · This month's change is on $125,200 … · you +1.54% … · market +1.69%
    // (SPY 590 → 600) · behind by 0.15% · prices updated 8h ago · See your growth ›
    expect(card.said).toBe("Your investments: $106,000. Schwab Traditional IRA has no balance. up $1,900, 1.54 percent this month. "
      + "This month's change is on $125,200: your investment accounts with the cash in them. you plus 1.54% (including dividends and interest), "
      + 'market plus 1.69%, behind by 0.15%. prices updated 8h ago. See your growth.');
    const printedOrder = ['$106,000', 'Schwab Traditional IRA has no balance', '$1,900', "This month's change is on $125,200", '1.69%', 'prices updated 8h ago', 'See your growth'];
    const at = printedOrder.map((p) => card.said.indexOf(p));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((x, y) => x - y)).toEqual(at);                  // in the order the card prints them
    expect(MARKS.test(card.said)).toBe(false);
    expect(markHeard()).toEqual([]);
    // the card's action, named with the line's own words
    const action = card.node.props.accessibilityActions[0];
    expect(action.label).toBe('Schwab Traditional IRA has no balance. Opens the Net worth tab');
    fireEvent(screen.getByLabelText(card.said), 'accessibilityAction', { nativeEvent: { actionName: action.name } });
    expect(follow()).toBe('/(tabs)/analytics');
    // the Net worth tab: the line shows in its amber box, and is heard
    expect(lines()).toContain('Schwab Traditional IRA has no balance');
    expect(heard()).toContain('1 number needs more information. Schwab Traditional IRA has no balance. Opens how to fix them.');
  });

  test('E2E-68 · on the Performance tab the account bar is reached and its page opened by its spoken action; on that page VTI is reached and opened; the Holding page\'s windows are reached', () => {
    start(P1);
    open('/(tabs)/invest');
    const r = reachable();
    // the bar is one element: what it prints is the account and its value, said in words, without ▾
    const bar = r.find((x) => x.said.startsWith('Vanguard Brokerage, '))!;
    expect(bar.printed).toBe('▾ Vanguard Brokerage$102,700›');
    expect(bar.said).toBe('Vanguard Brokerage, $102,700. Collapses its walk.');
    // nothing on the tab is heard as a mark: ▾ ▸ › ⚠ are said as words or not at all
    expect(markHeard()).toEqual([]);
    // its door to the account's own page sits inside it, so a screen reader cannot reach the door itself …
    expect(r.some((x) => x.said === "Open Vanguard Brokerage — this account’s own page")).toBe(false);
    // … and reaches the page as the bar's action (FIXED 2026-10-23: there was none, so the page could not be opened)
    const open1 = bar.node.props.accessibilityActions?.find((a: any) => a.label === "Open Vanguard Brokerage — this account’s own page");
    expect(open1).toBeDefined();
    fireEvent(screen.getByLabelText(bar.said), 'accessibilityAction', { nativeEvent: { actionName: open1.name } });
    expect(follow()).toBe('/account-detail?id=van&period=SINCE');

    // the account page: VTI is reached as one element that says its row, in words
    const vti = reachable().find((x) => x.said.startsWith('VTI, '))!;
    // Since: VTI $260 → $280, 280 ÷ 260 − 1 = +7.69%; its $1,500 dividend beneath it
    expect(vti.printed).toBe('VTI300 shares · $280.00$84,000+7.69%›');
    expect(vti.said).toBe('VTI, 300 shares · $280.00, $84,000, return +7.69%, $1,500 dividends. Opens its page.');
    expect(markHeard()).toEqual([]);
    // its walk's last line says the date it prints (FIXED 2026-10-23: it said "today" under "(Sep 30, 2026)")
    expect(heard()).toContain('Ending market value (Sep 30, 2026), $102,700');
    fireEvent.press(screen.getByLabelText(vti.said));
    expect(follow()).toBe('/holding-detail?account=van&position=p1');

    // the Holding page, heard in its parts: the price and the day's move (275 → 280, $5.00, 5 ÷ 275 = 1.82%), the window
    // chips — each reached (FIXED 2026-10-23: the card was one element and they could not be) — then the value and the change
    const h = heard();
    for (const said of ['LAST CLOSE · SEP 30, 2026: $280.00, up $5.00, 1.82 percent today', 'Show 1M', 'Show 3M', 'Show 6M', 'Show YTD', 'Show 1Y', 'Show 2Y',
      'VTI, worth $84,000, up $30,000, 55.56 percent since purchase', 'Price paid (average)', '$180.00']) expect(h).toContain(said);
    expect(h.indexOf('LAST CLOSE · SEP 30, 2026: $280.00, up $5.00, 1.82 percent today')).toBeLessThan(h.indexOf('Show 1M'));
    expect(h.indexOf('Show 2Y')).toBeLessThan(h.indexOf('VTI, worth $84,000, up $30,000, 55.56 percent since purchase'));
    expect(markHeard()).toEqual([]);
    // a chip reached is a chip that works: 2Y, said with "a year"
    fireEvent.press(screen.getByLabelText('Show 2Y'));
    expect(heard()).toContain('Versus the stock market, same dates: your return up 16.00 percent a year, the market up 9.53 percent a year, you are ahead by 6.47 points a year');
  });

  test('E2E-68 · two holdings entered by hand: each ✎ names its own holding and its own opening figures, "hidden" under hide-balances', () => {
    // Fidelity Brokerage, typed $15,000: 100 VTI bought at $80.00 and 50 BND whose price paid is not on record, each entered as an
    // opening holding. Both ✎ read "Edit or delete your opening holding of $0" (FIXED 2026-10-23, from the recording flows): VTI
    // could not be told from BND, and $0 — the cash the record moved — is not what either holding was.
    const FIDH = { asset_id: 'fid', label: 'Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 15_000, source: 'manual', value_as_of: '2026-09-01',
      positions: [{ position_id: 'vti', ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 80, purchase_date: '2025-03-03' }] },
        { position_id: 'bnd', ticker: 'BND', kind: 'fixed_income', asset_class: 'bond', lots: [{ lot_id: 'l2', shares: 50, cost_per_share: null, purchase_date: '2025-03-03' }] }] };
    const OPENINGS = [
      { id: 'o-vti', account_id: 'fid', type: 'OPENING_POSITION', position_id: 'vti', ticker: 'VTI', kind: 'stocks_etf', shares: 100, price: 80, date: '2025-03-03', created_at: '2025-03-03T12:00:00Z' },
      { id: 'o-bnd', account_id: 'fid', type: 'OPENING_POSITION', position_id: 'bnd', ticker: 'BND', kind: 'fixed_income', shares: 50, date: '2025-03-03', created_at: '2025-03-03T12:00:00Z' },
    ];
    start({ assetAccounts: [FIDH], transactions: OPENINGS, snapshotDays: [], priceCache: {}, pricesFetchedAt: null });
    open('/account-detail?id=fid');
    const pencils = () => reachable().filter((r) => r.said.startsWith('Edit or delete your')).map((r) => r.said);
    expect(pencils().sort()).toEqual(['Edit or delete your opening holding of BND, 50 shares, no price paid on record',
      'Edit or delete your opening holding of VTI, 100 shares at $80.00']);
    screen.unmount();
    useStore.setState({ hideBalances: true } as any);
    open('/account-detail?id=fid');
    expect(pencils().sort()).toEqual(['Edit or delete your opening holding of BND, 50 shares, no price paid on record',
      'Edit or delete your opening holding of VTI, 100 shares at hidden']);
    expect(markHeard()).toEqual([]);
  });

  test('E2E-68 · on 2Y the account page says every yearly rate with "a year", as the Performance tab does', () => {
    start(P1);
    open('/account-detail?id=van&period=2Y');
    const h = heard();
    // the trio's Return, the class bar, the holding and the Total row (FIXED 2026-10-23: each was said without "a year")
    for (const said of ['+16.55% a year', 'Stocks / Funds, $84,000, return +16.00% a year',
      'VTI, 300 shares · $280.00, $84,000, return +16.00% a year, $1,500 dividends. Opens its page.', 'Total, $102,700, return +16.55% a year']) expect(h).toContain(said);
    expect(markHeard()).toEqual([]);
  });
});
