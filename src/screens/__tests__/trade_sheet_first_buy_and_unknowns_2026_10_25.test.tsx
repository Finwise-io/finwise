/** THE TRADE SHEET, FROM THE OUTSIDE REVIEW OF 2026-10-25 (CFR-3: MK-CF-F-223, MK-CF-F-138, MK-CF-F-139 and the open question on
 *  an imported account's cash) — journey by journey: open the sheet, act, and read what the account page, the Holding page, the
 *  Performance tab and Net worth show. Real screens, real taps and typing on the controls a person touches (found by their label
 *  or text); the store is written only to set up the starting household. The day is Sep 30, 2026, as the sheet drawings'.
 *
 *  WHAT CHANGED IN THE APP (trade-sheet drawing v03, READ THIS FIRST rows 16 to 18, dated 2026-10-25):
 *   · J1 · MK-CF-F-223 tradeMultiplierOf — a first buy of 1 option contract at $2.50 in an account holding $1,000 cash moved $2.50
 *     (cash read $997.50). The sheet now asks the type of a ticker the account does not hold, in the holding editor's question,
 *     chips and words, and an option's shares per contract (100 unless changed); the record carries both, and the cash moves
 *     1 × 100 × $2.50 = $250 (cash $750). The holding opened keeps its 100 a contract, so the next buy counts it too.
 *   · J2 · MK-CF-F-138 addLot — 10 UNKNOWN123 were filed under Stocks / Funds by the classifier's last-resort default. On the sheet
 *     the person is asked and the buy waits until they say; a record that names no type opens the holding in no class, marked
 *     asked, and Net worth asks what it is (DEC-2160). DEC-7605's own example stays: 10 VTI chosen as Stocks / Funds list there.
 *   · J3 · MK-CF-F-139 removeShares — a sale of 4 against a purchase whose share count is not on record erased the purchase and the
 *     holding disappeared. The sheet refuses such a sale and says why; a sale recorded another way (the ✎) keeps the purchase.
 *   · J4 · the open question, ruled by the lead (tenet 3) — in an account built from imported holdings with no cash entered, a
 *     $1,000 buy turned "Available cash: not entered" into "−$1,000 ⚠ not enough" and the next buy was refused. It reads "not
 *     entered" and refuses nothing until a cash figure is entered; the stored figure stays, so the total stays right.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { Colors } from '../../utils/theme';
import { figuresPrinted, resetFiguresPrinted } from '../../components/figure';

let mockParams: Record<string, string | undefined> = {};
const mockNav = { pushes: [] as string[], backs: 0 };
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: () => { mockNav.backs += 1; }, push: (r: string) => mockNav.pushes.push(r), replace: (r: string) => mockNav.pushes.push(r),
    setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

const TODAY = '2026-09-30';
beforeAll(() => {
  jest.useFakeTimers({ now: new Date(`${TODAY}T12:00:00`), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
});
afterAll(() => jest.useRealTimers());

// ═══ READING A SCREEN: every Text in order (and, inside an open sheet, what its boxes show) ═══════════════════════════════
const flat = (st: any) => (StyleSheet.flatten(st) ?? {}) as any;
const textOf = (n: any, tt?: string): string => {
  if (n == null) return '';
  if (typeof n === 'string') return tt === 'uppercase' ? n.toUpperCase() : n;
  if (Array.isArray(n)) return n.map((c) => textOf(c, tt)).join('');
  const t2 = flat(n.props?.style).textTransform ?? tt;
  return (n.children ?? []).map((c: any) => textOf(c, t2)).join('');
};
function readLines(inSheet = false): string[] {
  const out: string[] = [];
  const walk = (n: any, sheet: boolean) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach((c) => walk(c, sheet)); return; }
    if (n.type === 'Modal') { (n.children ?? []).forEach((c: any) => walk(c, true)); return; }
    if (n.type === 'Text') { const t = textOf(n).replace(/\s+/g, ' ').trim(); if (t && (!inSheet || sheet)) out.push(t); return; }
    if (n.type === 'TextInput' && inSheet && sheet) { const t = String(n.props.value || n.props.placeholder || '').trim(); if (t) out.push(t); return; }
    (n.children ?? []).forEach((c: any) => walk(c, sheet));
  };
  walk(screen.toJSON(), false);
  return out;
}
const SCREENS: Record<string, () => any> = {
  invest: () => require('../PerformanceScreen').default, account: () => require('../AccountPortfolioScreen').default,
  holding: () => require('../HoldingDetailScreen').default, home: () => require('../HomeScreen').default,
  networth: () => require('../NetWorthScreen').default,
};
type Shot = { printed: { id: string; text: string }[]; lines: string[] };
function look(name: string, params: Record<string, string | undefined> = {}, act?: () => void): Shot {
  mockParams = params;
  const C = SCREENS[name]();
  const r = render(<C />);
  if (act) act();
  resetFiguresPrinted();
  r.rerender(<C />);
  const shot = { printed: figuresPrinted().filter((p) => !p.spoken).map((p) => ({ id: p.id, text: p.text })), lines: readLines() };
  r.unmount();
  return shot;
}
function open(name: string, params: Record<string, string | undefined> = {}) {
  mockParams = params;
  const C = SCREENS[name]();
  return render(<C />);
}
const pick = (label: string) => () => {
  const btn = screen.getAllByRole('button').find((b) => String(b.props.accessibilityLabel ?? '').startsWith(`Show ${label}`));
  if (!btn) throw new Error(`no window ${label}`);
  fireEvent.press(btn);
};
const after = (sh: Shot, label: string, n = 1) => { const i = sh.lines.indexOf(label); return i >= 0 ? sh.lines[i + n] : undefined; };
const press = (label: string | RegExp) => fireEvent.press(screen.getByLabelText(label));
const type = (label: string | RegExp, v: string) => fireEvent.changeText(screen.getByLabelText(label), v);
const disabled = (label: string) => screen.getByLabelText(label).props.accessibilityState?.disabled === true;
const acct = (id: string) => (useStore.getState().assetAccounts as any[]).find((a) => a.asset_id === id);
const typeTicker = (t: string) => fireEvent.changeText(screen.getByPlaceholderText('e.g. AAPL'), t);
const typeTrade = (shares: string, price: string) => { const [s, p] = screen.getAllByLabelText(/^(Shares|Contracts|Price per share|Amount)$/); fireEvent.changeText(s, shares); fireEvent.changeText(p, price); };   // the boxes by name — their grey ‘0’ is gone (R16, 2026-11-01)

// ═══ THE PRICES AND THE HOUSEHOLDS ═══════════════════════════════════════════════════════════════════════════════════════
const closes = (pts: [string, number][]) => ({ points: pts.map(([date, close]) => ({ date, close })) });
const CALL = 'SPY261218C00600000';
const PRICES = {
  VTI: closes([['2025-03-03', 80], ['2026-08-28', 95], ['2026-08-29', 95], ['2026-09-29', 99], ['2026-09-30', 100]]),
  BND: closes([['2025-03-03', 70], ['2026-08-28', 72], ['2026-08-29', 72], ['2026-09-30', 73]]),
  SPY: closes([['2025-03-03', 500], ['2026-08-28', 600], ['2026-08-29', 600], ['2026-09-30', 612]]),
  AGG: closes([['2025-03-03', 95], ['2026-08-28', 98], ['2026-08-29', 98], ['2026-09-30', 99]]),
  [CALL]: closes([['2026-08-28', 2], ['2026-09-29', 2.5], ['2026-09-30', 2.5]]),
};
const lot = (id: string, shares: number | null, cost: number | null, date: string) => ({ lot_id: id, shares, cost_per_share: cost, purchase_date: date });
const BND = { position_id: 'bnd', ticker: 'BND', label: 'Vanguard Total Bond Market ETF', kind: 'fixed_income', asset_class: 'bond', lots: [lot('b1', 50, 70, '2025-03-03')] };
const BND_OPENING = { id: 'o-bnd', account_id: 'fid', type: 'OPENING_POSITION', position_id: 'bnd', ticker: 'BND', kind: 'fixed_income', shares: 50, price: 70, date: '2025-03-03', created_at: '2025-03-03T12:00:00Z' };
/** Fidelity, named Brokerage, built from its holdings: `cash` of cash entered and 50 BND bought Mar 3, 2025 at $70 ($73 today) */
const FIDELITY = (cash: number) => ({ asset_id: 'fid', label: 'Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', derive_balance: true,
  balance: cash + 50 * 73, cash_balance: cash, source: 'manual', positions: [BND] });
function household(state: Record<string, any>) {
  useStore.getState().resetAll();
  mockParams = {}; mockNav.pushes.length = 0; mockNav.backs = 0;
  useStore.setState({ onboardingComplete: true, hideBalances: false, onboardingProfile: { name: 'Pat' }, transactions: [], snapshotDays: [],
    priceCache: PRICES, pricesFetchedAt: new Date().toISOString(), ...state } as any);
  render(React.createElement(SCREENS.home()));
}

const walk1M = (sh: Shot) => [after(sh, 'Beginning market value (Aug 29, 2026)'), after(sh, 'Wealth generated'), after(sh, 'Ending market value (Sep 30, 2026)')];
const TYPE_CHIPS = ['Money market', 'CD', 'Stocks / Funds', 'Fixed income', 'Crypto', 'Gold / commodities', 'Options', 'Annuities', 'Other'];
const OPTION_HINT = '100 for a standard option; 10 for a mini option. Value and cost are multiplied by it.';
const notHeld = (t: string) => `${t} isn’t held in this account yet — choose its type to record the buy.`;

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// J1 · MK-CF-F-223 tradeMultiplierOf — THE FIRST BUY OF AN OPTION (DEC-0274: contracts × 100 × price; DEC-4646)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Fidelity Brokerage, built from its holdings: $1,000 of cash and 50 BND ($73 today, $72 at the Aug 29 close). It holds no
// option. The person buys 1 contract of an SPY call at $2.50 from the account page. By hand: 1 × 100 × $2.50 = $250 leaves the
// cash, $1,000 − $250 = $750 (it moved $2.50 and read $997.50); the total stays $750 + 50 × $73 + 1 × 100 × $2.50 = $4,650.
describe('J1 · MK-CF-F-223 · the first buy of an option the account does not hold: the sheet asks its type and shares per contract, and 1 contract at $2.50 moves $250', () => {
  test('asked in the holding editor’s words → Options → 5 contracts refused against $1,000 → 1 contract recorded: cash $750 on the account page, the window unchanged on the Performance tab, 1 contract worth $250 on its page', () => {
    household({ assetAccounts: [FIDELITY(1_000)], transactions: [BND_OPENING] });
    const ACC0 = look('account', { id: 'fid', period: '1M' });
    const INV0 = look('invest', {}, pick('1 month'));
    open('account', { id: 'fid', period: '1M' });
    press(/^Add a buy or sale for /);
    typeTicker(CALL);
    typeTrade('1', '2.5');
    // the question, word for word (trade-sheet v03 row 16): the editor's label, its nine chips, nothing chosen, and why the buy waits
    const asked = readLines(true);
    const at = asked.indexOf('Ticker');
    expect(asked.slice(at, at + 13)).toEqual(['Ticker', CALL, 'Type (sets the benchmark)', ...TYPE_CHIPS, notHeld(CALL)]);
    expect(TYPE_CHIPS.every((k) => flat(screen.getByLabelText(`Type: ${k}`).props.style).backgroundColor !== Colors.primaryLight)).toBe(true);   // none chosen
    expect(disabled('Record buy')).toBe(true);
    press('Type: Options');
    const opt = readLines(true);
    // an option's first box reads Contracts (2026-10-25, FIX-HOLDINGS item 6, drawing v03 row 19 — it read Shares)
    expect(opt.slice(opt.indexOf('Ticker'), opt.indexOf('Ticker') + 16)).toEqual(['Ticker', CALL, 'Type (sets the benchmark — SPY)', ...TYPE_CHIPS, 'Shares per contract', '100', OPTION_HINT, 'Contracts']);
    expect(opt).not.toContain(notHeld(CALL));
    // the cash check counts contracts × 100 × price: 5 × 100 × $2.50 = $1,250 is more than $1,000 (at one share a contract it was $12.50)
    typeTrade('5', '2.5');
    expect(readLines(true)).toContain('Available cash: $1,000 ⚠ not enough — deposit or transfer cash in first');
    expect(disabled('Record buy')).toBe(true);
    typeTrade('1', '2.5');
    expect(readLines(true)).toContain('Available cash: $1,000');
    expect(disabled('Record buy')).toBe(false);
    press('Record buy');
    expect((useStore.getState().transactions as any[])[0]).toMatchObject({ type: 'BUY', ticker: CALL, shares: 1, price: 2.5, kind: 'options', multiplier: 100 });
    // THE ACCOUNT PAGE: the record in contracts at what it moved; the cash $750; the option under Alternatives at 1 × 100 × $2.50
    const page = readLines();
    const row = page.indexOf(`Buy · ${CALL} · 1 contract @ $2.50`);
    expect(page.slice(row, row + 3)).toEqual([`Buy · ${CALL} · 1 contract @ $2.50`, 'Sep 30 · you entered this', '−$250']);
    expect(page.slice(page.indexOf('▾ CASH'), page.indexOf('▾ CASH') + 2)).toEqual(['▾ CASH', '$750']);
    expect(page.slice(page.indexOf('▾ ALTERNATIVES'), page.indexOf('▾ ALTERNATIVES') + 2)).toEqual(['▾ ALTERNATIVES', '$250']);
    screen.unmount();
    expect([acct('fid').cash_balance, acct('fid').balance]).toEqual([750, 4_650]);
    const opened = (acct('fid').positions as any[]).find((p) => p.ticker === CALL);
    expect([opened.kind, opened.multiplier]).toEqual(['options', 100]);
    // THE WINDOW, 1M, on the account page and the Performance tab: a buy is neither money in nor money earned — Beginning
    // 1,000 + 50 × $72 = $4,600, Wealth generated 50 × ($73 − $72) = $50, Ending $4,650, before the buy and after it, on both
    const ACC = look('account', { id: 'fid', period: '1M' });
    const INV = look('invest', {}, pick('1 month'));
    expect(walk1M(ACC0)).toEqual(['$4,600', '$50', '$4,650']);
    for (const sh of [ACC, INV0, INV]) expect(walk1M(sh)).toEqual(walk1M(ACC0));
    expect(after(INV, 'Ending market value')).toBe('$4,650');
    expect(INV.lines.slice(INV.lines.indexOf('WHAT EACH CATEGORY EARNED'))).toContain('Alternatives');   // the option's category, on the tab
    // THE HOLDING PAGE: 1 contract, worth 1 × 100 × $2.50 = $250, paid $250
    const HOLD = look('holding', { account: 'fid', position: opened.position_id, period: '1M' });
    expect([after(HOLD, 'Quantity'), after(HOLD, 'Current value'), after(HOLD, 'Total paid')]).toEqual(['1 contract', '$250', '$250']);
    // THE NEXT BUY, from its page: it is held now, so nothing is asked, and its 100 a contract counts — $750 − $250 = $500
    open('holding', { account: 'fid', position: opened.position_id, period: '1M' });
    press(`Record a buy or sell for ${CALL}`);
    expect(readLines(true).some((l) => l.startsWith('Type (sets the benchmark'))).toBe(false);
    typeTrade('1', '2.5');
    press('Record buy');
    expect(after({ printed: [], lines: readLines() }, 'Quantity')).toBe('2 contracts');
    screen.unmount();
    expect(acct('fid').cash_balance).toBe(500);
  });

  test('a mini option: "Shares per contract" typed as 10 — 1 contract at $2.50 moves $25, and its page reads 1 contract worth $25', () => {
    household({ assetAccounts: [FIDELITY(1_000)], transactions: [BND_OPENING] });
    open('account', { id: 'fid', period: '1M' });
    press(/^Add a buy or sale for /);
    typeTicker(CALL);
    press('Type: Options');
    type('Shares per contract', '10');
    typeTrade('1', '2.5');
    press('Record buy');
    screen.unmount();
    expect((useStore.getState().transactions as any[])[0]).toMatchObject({ kind: 'options', multiplier: 10 });
    expect(acct('fid').cash_balance).toBe(975);                                   // $1,000 − 1 × 10 × $2.50
    const opened = (acct('fid').positions as any[]).find((p) => p.ticker === CALL);
    const HOLD = look('holding', { account: 'fid', position: opened.position_id, period: '1M' });
    expect([after(HOLD, 'Quantity'), after(HOLD, 'Current value')]).toEqual(['1 contract', '$25']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// J2 · MK-CF-F-138 addLot — A TICKER NOTHING IDENTIFIES IS ASKED, NEVER FILED BY THE CLASSIFIER'S DEFAULT (DEC-2160)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('J2 · MK-CF-F-138 · a ticker nothing identifies: the sheet asks and waits; a record that names no type opens it in no class and Net worth asks', () => {
  test('on the sheet: UNKNOWN123, 10 at $100.00 — Record buy waits until a type is chosen; chosen as Other, it lists under Alternatives, never under Stocks / Funds', () => {
    household({ assetAccounts: [FIDELITY(2_000)], transactions: [BND_OPENING] });
    open('account', { id: 'fid', period: '1M' });
    press(/^Add a buy or sale for /);
    typeTicker('unknown123');                                                     // typed in small letters: one ticker, in capitals
    typeTrade('10', '100');
    expect(readLines(true)).toContain(notHeld('UNKNOWN123'));
    expect(disabled('Record buy')).toBe(true);                                    // "Refuse the line and ask" (DEC-2160)
    press('Type: Other');
    press('Record buy');
    const page = readLines();
    screen.unmount();
    expect((acct('fid').positions as any[]).find((p) => p.ticker === 'UNKNOWN123')).toMatchObject({ kind: 'other_asset' });
    const alt = page.indexOf('▾ ALTERNATIVES');
    expect(page.slice(alt, alt + 8)).toContain('UNKNOWN123');
    expect(page.slice(page.indexOf('▸ STOCKS / FUNDS'), page.indexOf('▸ STOCKS / FUNDS') + 4)).toEqual(['▸ STOCKS / FUNDS', '$0', '—', 'Nothing held in this account']);
    expect(look('networth').lines.some((l) => /cannot tell what/.test(l))).toBe(false);   // answered on the sheet: nothing left to ask
  });

  test('a buy recorded before 2026-10-25 (no type on the record), corrected on its ✎ from $100.00 to $98.00: UNKNOWN123 reopens in no class — Unclassified on the account page and the Performance tab, and Net worth asks what it is', () => {
    // the household as the app left it before this fix: 10 UNKNOWN123 bought Sep 20 at $100.00, filed under Stocks / Funds by the
    // classifier's default, and its record, which names no type, with the account as it was before the buy (undo_prev)
    const before = FIDELITY(2_000);
    const held = { position_id: 'unk', ticker: 'UNKNOWN123', asset_class: 'stock_etf', lots: [lot('u1', 10, 100, '2026-09-20')] };
    const buy = { id: 'b-unk', account_id: 'fid', type: 'BUY', ticker: 'UNKNOWN123', shares: 10, price: 100, date: '2026-09-20', created_at: '2026-09-20T12:00:00Z', undo_prev: [before] };
    household({ assetAccounts: [{ ...before, cash_balance: 1_000, balance: 1_000 + 3_650 + 1_000, positions: [BND, held] }], transactions: [buy, BND_OPENING] });
    open('account', { id: 'fid', period: '1M' });
    press('Edit or delete your buy of UNKNOWN123, 10 shares at $100.00');
    type('Price per share', '98');
    press('Save this correction');
    const page = readLines();
    screen.unmount();
    // by hand: the cash $2,000 − 10 × $98 = $1,020; the purchase is the record's, its class asked
    expect(acct('fid').cash_balance).toBe(1_020);
    const p = (acct('fid').positions as any[]).find((x) => x.ticker === 'UNKNOWN123');
    expect([p.asset_class ?? null, p.class_asked]).toEqual([null, true]);
    // THE ACCOUNT PAGE: under Unclassified, and Stocks / Funds holds nothing (before this fix it went back under Stocks / Funds)
    const un = page.indexOf('▾ UNCLASSIFIED');
    expect(un).toBeGreaterThan(page.indexOf('BY CATEGORY & HOLDING'));
    expect(page.slice(un, un + 4)).toContain('UNKNOWN123');
    expect(page.slice(page.indexOf('▸ STOCKS / FUNDS'), page.indexOf('▸ STOCKS / FUNDS') + 4)).toEqual(['▸ STOCKS / FUNDS', '$0', '—', 'Nothing held in this account']);
    expect(page.slice(page.indexOf('Buy · UNKNOWN123 · 10 shares @ $98.00'), page.indexOf('Buy · UNKNOWN123 · 10 shares @ $98.00') + 3)).toEqual(['Buy · UNKNOWN123 · 10 shares @ $98.00', 'Sep 20 · you entered this', '−$980']);
    // NET WORTH asks, in its own sentence (DEC-2160), and counts it Unclassified
    const NW = look('networth');
    expect(NW.lines).toContain('The app cannot tell what UNKNOWN123 in Brokerage is, so it is in no class yet. Open it and say what it is.');
    expect(NW.lines).toContain('Unclassified');
    // THE PERFORMANCE TAB'S CATEGORY TABLE: an Unclassified row, no Stocks / Funds row
    const INV = look('invest', {}, pick('1 month'));
    const cats = INV.lines.slice(INV.lines.indexOf('WHAT EACH CATEGORY EARNED'), INV.lines.indexOf('All categories'));
    expect(cats).toContain('Unclassified');
    expect(cats).not.toContain('Stocks / Funds');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// J3 · MK-CF-F-139 removeShares — A PURCHASE WHOSE SHARE COUNT IS NOT ON RECORD IS NEVER ERASED BY A SALE (tenets 3 and 5)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Fidelity Brokerage: $2,000 of cash, 50 BND, and AAA — one purchase on Jan 2, 2026 at $100.00 whose share count is not on
// record (as a broker can send one). AAA is $110 today.
describe('J3 · MK-CF-F-139 · a sale against a purchase whose share count is not on record: refused on the sheet with the reason; corrected on the ✎, the purchase is kept', () => {
  const AAA = { position_id: 'aaa', ticker: 'AAA', label: 'AAA Corp', kind: 'stocks_etf', lots: [lot('a1', null, 100, '2026-01-02')] };
  const AAA_PRICES = { ...PRICES, AAA: closes([['2026-01-02', 100], ['2026-08-29', 105], ['2026-09-29', 110], ['2026-09-30', 110]]) };
  test('the sheet: Sell → AAA reads "You own: Not stated — a purchase has no share count on record. ⚠ add the share count in Edit holding before recording a sale", in red, and Record sell waits', () => {
    household({ assetAccounts: [{ ...FIDELITY(2_000), positions: [BND, AAA] }], transactions: [BND_OPENING], priceCache: AAA_PRICES });
    open('holding', { account: 'fid', position: 'aaa', period: '1M' });
    expect(after({ printed: [], lines: readLines() }, 'Quantity')).toBe('Not stated — a purchase has no share count on record.');
    press('Record a buy or sell for AAA');
    press('Transaction type: Sell');
    typeTrade('4', '10');
    const words = 'You own: Not stated — a purchase has no share count on record. ⚠ add the share count in Edit holding before recording a sale';
    expect(readLines(true)).toContain(words);
    expect(readLines(true).some((l) => /can’t sell more than you own|You own shares/.test(l))).toBe(false);   // the old, wrong reason
    const line = screen.getByText(/^You own: Not stated/);
    expect([flat(line.props.style).color, flat(line.props.style).fontWeight]).toEqual([Colors.red, '700']);
    expect(disabled('Record sell')).toBe(true);
  });

  test('a sale of 4 at $10.00 recorded on AAA, corrected on its ✎ to $12.00: AAA stays on the account page and its own page, its count still not stated; the cash takes the sale\'s $48', () => {
    household({ assetAccounts: [{ ...FIDELITY(2_000), positions: [BND, AAA] }], transactions: [BND_OPENING], priceCache: AAA_PRICES });
    // a sale already on record (the store records what it is handed; the ✎ re-records it the same way)
    (useStore.getState() as any).recordTransaction({ type: 'SELL', account_id: 'fid', ticker: 'AAA', shares: 4, price: 10, date: TODAY });
    expect(acct('fid').cash_balance).toBe(2_040);                                 // $2,000 + 4 × $10
    open('account', { id: 'fid', period: '1M' });
    press('Edit or delete your sell of AAA, 4 shares at $10.00');
    type('Price per share', '12');
    press('Save this correction');
    const page = readLines();
    screen.unmount();
    // by hand: $2,000 + 4 × $12 = $2,048; the purchase of unknown size is still there, as it was (it was erased, and AAA gone)
    expect(acct('fid').cash_balance).toBe(2_048);
    expect((acct('fid').positions as any[]).find((p) => p.ticker === 'AAA')?.lots).toEqual([lot('a1', null, 100, '2026-01-02')]);
    const sf = page.indexOf('▾ STOCKS / FUNDS');
    expect(page.slice(sf, sf + 8)).toContain('AAA');
    const sale = page.indexOf('Sell · AAA · 4 shares @ $12.00');
    expect(page.slice(sale, sale + 3)).toEqual(['Sell · AAA · 4 shares @ $12.00', 'Sep 30 · you entered this', '$48']);
    const HOLD = look('holding', { account: 'fid', position: 'aaa', period: '1M' });
    expect(after(HOLD, 'Quantity')).toBe('Not stated — a purchase has no share count on record.');
    // the one total, on the account page and the Performance tab
    const ACC = look('account', { id: 'fid', period: '1M' });
    const INV = look('invest', {}, pick('1 month'));
    expect(after(INV, 'Ending market value')).toBe(after(ACC, 'Ending market value (Sep 30, 2026)'));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// J4 · THE OPEN QUESTION, RULED BY THE LEAD (tenet 3) — AVAILABLE CASH IN AN ACCOUNT WHOSE CASH WAS NEVER ENTERED
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Schwab Brokerage, built by Import holdings: 100 VTI at $100.00 (no purchase date — a file gives none), no cash entered,
// $10,000. The person buys 10 VTI at $100.00, then 10 more. By hand: the stored cash runs 0 − $1,000 − $1,000 = −$2,000 so the
// total stays 120 × $100 − $2,000 = $10,000; the cash itself was never entered, so it is not known, and nothing is refused on it.
const IMPORTED = () => ({ asset_id: 'imp', label: 'Brokerage', institution: 'Schwab', kind: 'brokerage', tax_bucket: undefined, balance: 10_000, derive_balance: true,
  source: 'imported', target_return: 0.08, positions: [{ position_id: 'vti', ticker: 'VTI', kind: 'stocks_etf', lots: [lot('v1', 100, 100, '')] }] });
describe('J4 · an account built from imported holdings, cash never entered: Available cash reads "not entered" before a buy and after it, and the next buy is not refused', () => {
  test('10 VTI, then 10 more: the sheet reads "Available cash: not entered" each time (it read "−$1,000 ⚠ not enough" and refused); the total reads $10,000 on the account page, the Performance tab and Net worth', () => {
    household({ assetAccounts: [IMPORTED()] });
    open('account', { id: 'imp', period: '1M' });
    for (const n of [1, 2]) {
      press(/^Add a buy or sale for /);
      expect(readLines(true).filter((l) => /^Available cash/.test(l))).toEqual(['Available cash: not entered']);
      typeTicker('VTI');
      typeTrade('10', '100');
      expect(readLines(true).filter((l) => /^Available cash/.test(l))).toEqual(['Available cash: not entered']);
      expect(disabled('Record buy')).toBe(false);
      press('Record buy');
      expect((acct('imp').positions[0].lots as any[]).length).toBe(1 + n);
    }
    screen.unmount();
    // the stored figure is kept (the total stays right), marked as never entered
    expect([acct('imp').cash_balance, acct('imp').cash_not_entered, acct('imp').balance]).toEqual([-2_000, true, 10_000]);
    const ACC = look('account', { id: 'imp', period: '1M' });
    const INV = look('invest', {}, pick('1 month'));
    const NW = look('networth');
    expect(after(ACC, 'Ending market value', -1)).toBe('$10,000');
    expect(after(INV, 'Ending market value')).toBe('$10,000');
    expect(after(NW, 'Own $10,000 − Owe $0')).toBe('$10,000');
    // the account page lists the stored running figure as the cash row, so its rows add up to the total: 120 × $100 − $2,000
    const cash = ACC.lines.indexOf('▾ CASH');
    expect(ACC.lines.slice(cash, cash + 2)).toEqual(['▾ CASH', '−$2,000']);
  });

  // FOUND HERE 2026-10-25 by FIX-TRADES; FIXED 2026-10-25 by FIX-HOLDINGS (buildPerformance, MK-PF-F-014 — the window's method).
  // Before the buys the 1M window read Beginning $9,500 (100 × $95), Wealth generated $500, Return +5.26%. After them it read
  // Beginning $10,000, Wealth generated $0, Return "—": the imported purchase has no date, and a dated buy beside it made the holding
  // "bought inside the window" from that buy. A buy is neither money in nor money earned, so by hand Beginning stays $9,500 and Wealth
  // generated $500; the return, a purchase counted from the start of its day at what was paid (DEC-7451): 9,900 ÷ 9,500 × 12,000 ÷
  // (9,900 + 2,000) − 1 = +5.09% — what the app gives when the imported purchase carries a date. The undated purchase beside buys this
  // account recorded is now read as held when the window began, as it was before them. The app's old answer is kept below, failing.
  test('FIXED 2026-10-25 (FIX-HOLDINGS item 1; DEC-3656, DEC-7451) · a buy in an imported account whose purchase has no date keeps its 1M window: Beginning $9,500, Wealth generated $500, Return +5.09%', () => {
    household({ assetAccounts: [IMPORTED()] });
    expect(walk1M(look('account', { id: 'imp', period: '1M' }))).toEqual(['$9,500', '$500', '$10,000']);
    (useStore.getState() as any).recordTransaction({ type: 'BUY', account_id: 'imp', ticker: 'VTI', shares: 20, price: 100, date: TODAY });
    const ACC = look('account', { id: 'imp', period: '1M' });
    expect([...walk1M(ACC), after(ACC, 'Return')]).toEqual(['$9,500', '$500', '$10,000', `+${((9_900 / 9_500 * 12_000 / 11_900 - 1) * 100).toFixed(2)}%`]);
  });
  test.failing('· app until 2026-10-25: Beginning $10,000, Wealth generated $0, Return "—" after the buy — no longer its answer (FIXED 2026-10-25)', () => {
    household({ assetAccounts: [IMPORTED()] });
    (useStore.getState() as any).recordTransaction({ type: 'BUY', account_id: 'imp', ticker: 'VTI', shares: 20, price: 100, date: TODAY });
    const ACC = look('account', { id: 'imp', period: '1M' });
    expect([...walk1M(ACC), after(ACC, 'Return')]).toEqual(['$10,000', '$0', '$10,000', '—']);
  });
});
