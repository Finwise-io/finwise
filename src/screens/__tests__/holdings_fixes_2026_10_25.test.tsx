/** THE HOLDINGS, FROM FIX-TRADES'S "FOUND AND LEFT" OF 2026-10-25 (six items, fixed by FIX-HOLDINGS) — journey by journey: open the
 *  screen, act on the controls a person touches (found by their label or text), and read what the account page, the Holding page,
 *  the Performance tab and Net worth show. The store is written only to set up the starting household (and, in H4, to stand in for
 *  a sync). The day is Sep 30, 2026, as the sheet drawings'.
 *
 *  WHAT CHANGED IN THE APP (dated READ THIS FIRST rows of 2026-10-25: account page v01 rows 80 to 83, Holding detail v02, holding
 *  editor v02 rows 16 and 17, trade sheet v03 row 19, edit-record sheet v02 row 12):
 *   · H1 · item 1, MK-PF-F-014 buildPerformance — a buy recorded beside a purchase with no date (an imported holding) turned the
 *     window into Beginning $10,000, Wealth generated $0, Return "—". A buy is neither money in nor money earned: $9,500, $500, +5.09%.
 *   · H2 · item 2 — an option listed on the account page read "2 shares · $2.50" while its Holding page read "2 contracts".
 *   · H3 · item 3 — the Cash row of an account whose cash was never entered read "uninvested balance" beside the running figure.
 *   · H4 · item 4 — a holding marked to be asked could not be answered from Edit holding: it opened on Stocks / Funds and saving
 *     never cleared the mark (DEC-2160, step 4). A linked holding too.
 *   · H5 · item 5 — a holding with no price in an account built by hand read "no price today" with its bar at $0 while the total
 *     counted what was paid: $1,000 + $3,650 + $0 under $5,650.
 *   · H6 · item 6 — the trade sheet said "Shares" for an option; it says "Contracts" and shows the shares in each contract.
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
  // a close near each window's start (R19, 2026-11-01): SPY on 2026-09-29 (the evening before today's buy, where the market's second
  // piece starts) at $600, the price each figure measured from (the Aug 29 close the old rule carried)
  SPY: closes([['2025-03-03', 500], ['2026-08-28', 600], ['2026-08-29', 600], ['2026-09-29', 600], ['2026-09-30', 612]]),
  AGG: closes([['2025-03-03', 95], ['2026-08-28', 98], ['2026-08-29', 98], ['2026-09-30', 99]]),
  [CALL]: closes([['2026-08-28', 2], ['2026-09-29', 2.5], ['2026-09-30', 2.5]]),
};
const lot = (id: string, shares: number | null, cost: number | null, date: string) => ({ lot_id: id, shares, cost_per_share: cost, purchase_date: date });
const BND = { position_id: 'bnd', ticker: 'BND', label: 'Vanguard Total Bond Market ETF', kind: 'fixed_income', asset_class: 'bond', lots: [lot('b1', 50, 70, '2025-03-03')] };
const BND_OPENING = { id: 'o-bnd', account_id: 'fid', type: 'OPENING_POSITION', position_id: 'bnd', ticker: 'BND', kind: 'fixed_income', shares: 50, price: 70, date: '2025-03-03', created_at: '2025-03-03T12:00:00Z' };
/** Fidelity, named Brokerage, built from its holdings: `cash` of cash entered and 50 BND bought Mar 3, 2025 at $70 ($73 today) */
const FIDELITY = (cash: number) => ({ asset_id: 'fid', label: 'Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', derive_balance: true,
  balance: cash + 50 * 73, cash_balance: cash, source: 'manual', positions: [BND] });
/** Schwab, named Brokerage, built by Import holdings: 100 VTI at $100.00 with no purchase date (a file gives none); `cash` entered or not */
const IMPORTED = (cash?: number) => ({ asset_id: 'imp', label: 'Brokerage', institution: 'Schwab', kind: 'brokerage', tax_bucket: undefined,
  balance: 10_000 + (cash ?? 0), derive_balance: true, source: 'imported', target_return: 0.08, ...(cash != null ? { cash_balance: cash } : {}),
  positions: [{ position_id: 'vti', ticker: 'VTI', kind: 'stocks_etf', lots: [lot('v1', 100, 100, '')] }] });
function household(state: Record<string, any>) {
  useStore.getState().resetAll();
  mockParams = {}; mockNav.pushes.length = 0; mockNav.backs = 0;
  useStore.setState({ onboardingComplete: true, hideBalances: false, onboardingProfile: { name: 'Pat' }, transactions: [], snapshotDays: [],
    priceCache: PRICES, pricesFetchedAt: new Date().toISOString(), ...state } as any);
  render(React.createElement(SCREENS.home()));
}
const walk1M = (sh: Shot) => [after(sh, 'Beginning market value (Aug 29, 2026)'), after(sh, 'Wealth generated'), after(sh, 'Ending market value (Sep 30, 2026)')];
/** a category's bar and the rows under it, as the account page lists them: [bar figure, …each row's lines] */
const band = (sh: Shot, name: string, n: number) => { const i = sh.lines.indexOf(`▾ ${name}`); return i < 0 ? [] : sh.lines.slice(i, i + n); };
const buyOnAccountPage = (id: string, ticker: string, shares: string, price: string, typeChip?: string) => {
  open('account', { id, period: '1M' });
  press(/^Add a buy or sale for /);
  typeTicker(ticker);
  if (typeChip) press(`Type: ${typeChip}`);
  typeTrade(shares, price);
};
const money0 = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;   // money-mask-ok: test fixture, never rendered — the screens print through fig()

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// H1 · ITEM 1 — MK-PF-F-014 buildPerformance: A BUY BESIDE A PURCHASE WITH NO DATE KEEPS THE WINDOW (DEC-3656, DEC-1669, DEC-7451)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Schwab Brokerage, imported: 100 VTI with no purchase date, $95 at the Aug 29 close, $99 on Sep 29, $100 today. The person buys 20
// more at $100.00 from the account page, paid from the account's own cash. BY HAND, 1M:
//   Beginning (Aug 29)   = 100 × $95 + cash $0                     = $9,500   (the buy came after, and moved nothing in or out)
//   Ending (Sep 30)      = 120 × $100 + cash (0 − 20 × $100)        = $10,000
//   Wealth generated     = $10,000 − $9,500 − $0 put in + $0 taken  = $500     (VTI: $12,000 − $9,500 held − $2,000 paid)
//   Return (VTI's own, the holdings' return where the beginning is worked back, DEC-5068), split at the purchase, which counts
//   from the start of its day at what was paid (DEC-4439, DEC-7451): 9,900 ÷ 9,500 × 12,000 ÷ (9,900 + 2,000) − 1 = +5.09%.
// It read $10,000, $0 and "—": the buy made VTI "bought inside the window" from Sep 30, and its return refused (DEC-7216).
const R1 = 9_900 / 9_500 * 12_000 / 11_900 - 1;
const pct = (r: number) => `+${(r * 100).toFixed(2)}%`;
describe('H1 · item 1 · a buy in an account built from imported holdings keeps its 1M window: Beginning $9,500, Wealth generated $500, Return +5.09%', () => {
  test('bought on the account page: the account page, the Holding page and the Performance tab read one window, and Net worth the one total', () => {
    household({ assetAccounts: [IMPORTED()] });
    const ACC0 = look('account', { id: 'imp', period: '1M' });
    expect([...walk1M(ACC0), after(ACC0, 'Return')]).toEqual(['$9,500', '$500', '$10,000', '+5.26%']);   // before the buy: 100 ÷ 95 − 1
    buyOnAccountPage('imp', 'VTI', '20', '100');
    press('Record buy');
    screen.unmount();
    const ACC = look('account', { id: 'imp', period: '1M' });
    const HOLD = look('holding', { account: 'imp', position: 'vti', period: '1M' });
    const INV = look('invest', {}, pick('1 month'));
    const NW = look('networth');
    expect([...walk1M(ACC), after(ACC, 'Return')]).toEqual(['$9,500', '$500', '$10,000', pct(R1)]);
    expect([after(ACC, 'Contributions'), after(ACC, 'Withdrawals')]).toEqual(['$0', '$0']);      // a buy is not money put in
    // THE HOLDING PAGE: its own return over the same month, never the undated-purchase refusal
    expect(after(HOLD, 'Your return, past month')).toBe(pct(R1));
    expect(HOLD.lines).not.toContain('A purchase of this holding has no date on record, so its return since purchase cannot be measured.');
    // THE PERFORMANCE TAB, and NET WORTH: the same beginning, wealth, return and ending — one account, one window, one figure
    expect([...walk1M(INV), after(INV, 'Return')]).toEqual(walk1M(ACC).concat(pct(R1)));
    expect(after(INV, 'Ending value')).toBe('$10,000');
    expect(after(NW, 'Own $10,000 − Owe $0')).toBe('$10,000');
  });
  test('with cash entered ($5,000) it holds too: Beginning $14,500, Wealth generated $500, the holdings\' return +5.09%, cash $3,000', () => {
    household({ assetAccounts: [IMPORTED(5_000)] });
    expect(walk1M(look('account', { id: 'imp', period: '1M' }))).toEqual(['$14,500', '$500', '$15,000']);
    (useStore.getState() as any).recordTransaction({ type: 'BUY', account_id: 'imp', ticker: 'VTI', shares: 20, price: 100, date: TODAY });
    expect(acct('imp').cash_balance).toBe(3_000);
    const ACC = look('account', { id: 'imp', period: '1M' });
    expect([...walk1M(ACC), after(ACC, 'Return')]).toEqual(['$14,500', '$500', '$15,000', pct(R1)]);
    expect(after(look('invest', {}, pick('1 month')), 'Return')).toBe(pct(R1));
  });
  test('a purchase with no date beside a purchase only typed on the holding, with no buy recorded for it, keeps DEC-7216: no return since purchase', () => {
    // the same 100 imported, and 20 typed on the holding as bought today — no buy record says when they came, so their order is not known
    const typed = { ...IMPORTED(), balance: 12_000, positions: [{ position_id: 'vti', ticker: 'VTI', kind: 'stocks_etf', lots: [lot('v1', 100, 100, ''), lot('v2', 20, 100, TODAY)] }] };
    household({ assetAccounts: [typed] });
    const HOLD = look('holding', { account: 'imp', position: 'vti', period: '1M' });
    expect(HOLD.lines).toContain('A purchase of this holding has no date on record, so its return since purchase cannot be measured.');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// H2 · ITEM 2 and H6 · ITEM 6 — AN OPTION READS IN CONTRACTS WHEREVER IT IS LISTED OR TRADED (DEC-0277, DEC-0274, DEC-4646)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Fidelity Brokerage: $1,000 of cash and 50 BND. The person buys 2 contracts of an SPY call at $2.50 on the account page:
// 2 × 100 × $2.50 = $500, cash $500. Then, from its Holding page, 1 more: 1 × 100 × $2.50 = $250, cash $250.
describe('H2 / H6 · items 2 and 6 · an option: "Contracts" on the trade sheet with its shares per contract shown, "2 contracts · $2.50" on the account page, "2 contracts" on its page', () => {
  test('bought, listed, traded again, offered for sale and corrected — in contracts every time, at 100 shares a contract', () => {
    household({ assetAccounts: [FIDELITY(1_000)], transactions: [BND_OPENING] });
    buyOnAccountPage('fid', CALL, '2', '2.5', 'Options');
    // THE TRADE SHEET (v03 row 19): Contracts, Price / share kept, and the line showing the shares in each contract and the sum
    const sheet = readLines(true);
    expect(sheet).toContain('Contracts');
    expect(sheet).not.toContain('Shares');
    expect(sheet).toContain('Price / share');
    expect(sheet).toContain('Each contract is 100 shares: 2 × 100 × $2.50 = $500.');
    press('Record buy');
    const page = readLines();
    screen.unmount();
    expect(acct('fid').cash_balance).toBe(500);
    const pos = (acct('fid').positions as any[]).find((p) => p.ticker === CALL);
    // THE ACCOUNT PAGE (v01 row 80): the row in contracts at the latest close, worth 2 × 100 × $2.50 = $500; its bar the same
    const alt = page.indexOf('▾ ALTERNATIVES');
    expect(page.slice(alt, alt + 2)).toEqual(['▾ ALTERNATIVES', '$500']);
    const sub = page.indexOf('2 contracts · $2.50');
    expect(sub).toBeGreaterThan(alt);
    expect(page[sub + 1]).toBe('$500');
    expect(page.some((l) => /\b2 shares · \$2\.50/.test(l))).toBe(false);
    // THE HOLDING PAGE: 2 contracts, worth $500 — the account page's row, to the dollar (agreement)
    const HOLD = look('holding', { account: 'fid', position: pos.position_id, period: '1M' });
    expect([after(HOLD, 'Quantity'), after(HOLD, 'Current value')]).toEqual(['2 contracts', page[sub + 1]]);
    // NET WORTH counts the option at the same $500 under Alternatives, and the Performance tab ends at $500 + $3,650 + $500 = $4,650
    expect(after(look('networth'), 'Alternatives')).toBe('$500');
    expect(after(look('invest', {}, pick('1 month')), 'Ending value')).toBe(money0(500 + 3_650 + 500));
    // ONE MORE FROM ITS PAGE: held now, so not asked; still Contracts, the line at 1 × 100 × $2.50 = $250
    open('holding', { account: 'fid', position: pos.position_id, period: '1M' });
    press(`Record a buy or sell for ${CALL}`);
    typeTrade('1', '2.5');
    expect(readLines(true)).toEqual(expect.arrayContaining(['Contracts', 'Each contract is 100 shares: 1 × 100 × $2.50 = $250.']));
    // SELL names the holding's own unit (it read "You own 2 shares")
    press('Transaction type: Sell');
    press(`Holding: ${CALL}`);
    expect(readLines(true)).toContain('You own 2 contracts');
    press('Transaction type: Buy');
    typeTrade('1', '2.5');
    press('Record buy');
    expect(after({ printed: [], lines: readLines() }, 'Quantity')).toBe('3 contracts');
    // ITS ACTIVITY, said in contracts as it is printed
    press(`See ${CALL}’s activity`);
    expect(screen.getAllByLabelText(new RegExp(`^Buy, ${CALL}, 1 contract at`)).length).toBe(1);
    screen.unmount();
    expect(acct('fid').cash_balance).toBe(250);
    // THE ✎ ON THE FIRST BUY (edit-record v02 row 12): its first box reads Contracts
    open('account', { id: 'fid', period: '1M' });
    fireEvent.press(screen.getAllByLabelText(/^Edit or delete your buy of .*, 2 contracts at \$2\.50$/)[0]);
    const edit = readLines(true);
    expect(edit).toContain('Contracts');
    expect(edit).not.toContain('Shares');
    expect(screen.getByLabelText('Contracts').props.value).toBe('2');
  });
  test('a stock still reads in shares on the sheet, its line and the ✎ (no "Each contract" line)', () => {
    household({ assetAccounts: [FIDELITY(2_000)], transactions: [BND_OPENING] });
    buyOnAccountPage('fid', 'VTI', '10', '100', 'Stocks / Funds');
    const sheet = readLines(true);
    expect(sheet).toContain('Shares');
    expect(sheet.some((l) => l.startsWith('Each contract'))).toBe(false);
    press('Record buy');
    const page = readLines();
    expect(page).toContain('10 shares · $100.00');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// H3 · ITEM 3 — CASH NEVER ENTERED READS "not entered" ON THE ACCOUNT PAGE TOO (the lead's ruling, tenet 3; v01 row 81)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('H3 · item 3 · the Cash row of an account whose cash was never entered: "not entered · activity since the import", the rows still adding up to the total', () => {
  test('imported, 10 VTI bought on the account page: Cash in this account · not entered · −$1,000; VTI $11,000; Total $10,000 on the account page, Performance and Net worth', () => {
    household({ assetAccounts: [IMPORTED()] });
    buyOnAccountPage('imp', 'VTI', '10', '100');
    expect(readLines(true).filter((l) => /^Available cash/.test(l))).toEqual(['Available cash: not entered']);
    press('Record buy');
    screen.unmount();
    const ACC = look('account', { id: 'imp', period: '1M' });
    const cash = band(ACC, 'CASH', 6);
    expect(cash).toEqual(['▾ CASH', '−$1,000', '—', 'Cash in this account', 'not entered · activity since the import', '−$1,000']);
    expect(ACC.lines).not.toContain('uninvested balance');
    const sf = band(ACC, 'STOCKS / FUNDS', 2);
    expect(sf).toEqual(['▾ STOCKS / FUNDS', '$11,000']);
    // the rows add up to the total as printed: $11,000 − $1,000 = $10,000, on every screen
    expect(after(ACC, 'Total')).toBe('$10,000');
    expect(after(look('invest', {}, pick('1 month')), 'Ending value')).toBe('$10,000');
    expect(after(look('networth'), 'Own $10,000 − Owe $0')).toBe('$10,000');
  });
  test('an account added by hand with its holdings and no cash: "not entered · activity since it was added"; one with cash entered keeps "uninvested balance"', () => {
    const byHand = { asset_id: 'man', label: 'Brokerage', institution: 'Ally', kind: 'brokerage', tax_bucket: 'TAXABLE', derive_balance: true, source: 'manual',
      balance: 1_000, positions: [{ position_id: 'v', ticker: 'VTI', kind: 'stocks_etf', lots: [lot('v1', 10, 100, '2025-03-03')] }] };
    household({ assetAccounts: [byHand, FIDELITY(1_000)], transactions: [BND_OPENING] });
    (useStore.getState() as any).recordTransaction({ type: 'BUY', account_id: 'man', ticker: 'VTI', shares: 5, price: 100, date: TODAY });
    expect(band(look('account', { id: 'man', period: '1M' }), 'CASH', 6).slice(3)).toEqual(['Cash in this account', 'not entered · activity since it was added', '−$500']);
    expect(band(look('account', { id: 'fid', period: '1M' }), 'CASH', 6).slice(3)).toEqual(['Cash in this account', 'uninvested balance', '$1,000']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// H4 · ITEM 4 — A HOLDING MARKED TO BE ASKED IS ANSWERED FROM EDIT HOLDING (his DEC-2160 "Refuse the line and ask", step 4)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const ASKED_LINE = (t: string) => `The app cannot tell what ${t} is — choose its type to save.`;
const chips = ['Money market', 'CD', 'Stocks / Funds', 'Fixed income', 'Crypto', 'Gold / commodities', 'Options', 'Annuities', 'Other'];
describe('H4 · item 4 · Edit holding answers a holding the app cannot class: nothing pre-picked, Save waits, a type saved clears the mark — a linked holding too, through the next sync', () => {
  test('by hand: 10 UNKNOWN123 recorded with no type → Net worth asks → Edit holding: no chip lit, the line, Save waits → Other → Save: Alternatives on the account page and the Performance tab, and Net worth stops asking', () => {
    household({ assetAccounts: [FIDELITY(2_000)], transactions: [BND_OPENING] });
    (useStore.getState() as any).recordTransaction({ type: 'BUY', account_id: 'fid', ticker: 'UNKNOWN123', shares: 10, price: 100, date: TODAY });
    const p0 = (acct('fid').positions as any[]).find((p) => p.ticker === 'UNKNOWN123');
    expect(p0.class_asked).toBe(true);
    expect(look('networth').lines).toContain('The app cannot tell what UNKNOWN123 in Brokerage is, so it is in no class yet. Open it and say what it is.');
    open('holding', { account: 'fid', position: p0.position_id, period: '1M' });
    press('Edit this holding');
    const ed = readLines(true);
    expect(ed).toContain('Type (sets the benchmark)');
    expect(ed).toContain(ASKED_LINE('UNKNOWN123'));
    expect(chips.every((k) => flat(screen.getByLabelText(`Type: ${k}`).props.style).backgroundColor !== Colors.primaryLight)).toBe(true);   // none chosen
    expect(disabled('Save holding')).toBe(true);
    press('Type: Other');
    expect(readLines(true)).not.toContain(ASKED_LINE('UNKNOWN123'));
    expect(disabled('Save holding')).toBe(false);
    press('Save holding');
    screen.unmount();
    const p1 = (acct('fid').positions as any[]).find((p) => p.ticker === 'UNKNOWN123');
    expect([p1.kind, p1.asset_class, p1.class_source, p1.class_asked]).toEqual(['other_asset', 'other', 'user', undefined]);
    // the account page lists it under Alternatives; the Performance tab's category table has Alternatives and no Unclassified
    const ACC = look('account', { id: 'fid', period: '1M' });
    expect(band(ACC, 'ALTERNATIVES', 4)).toContain('UNKNOWN123');
    expect(ACC.lines).not.toContain('▾ UNCLASSIFIED');
    const INV = look('invest', {}, pick('1 month'));
    const cats = INV.lines.slice(INV.lines.indexOf('WHAT EACH CATEGORY EARNED'), INV.lines.indexOf('All categories'));
    expect(cats).toContain('Alternatives');
    expect(cats).not.toContain('Unclassified');
    expect(look('networth').lines.some((l) => /cannot tell what/.test(l))).toBe(false);
  });
  test('linked: ZZZZ sent with no class (marked asked, filed Stocks / Funds by the sync’s guess) → Edit holding opens with no chip lit → Crypto → Save → the next sync keeps it under Alternatives and nothing asks again', () => {
    const { ingestSync } = require('../../services/sync/ingest');
    const NOWI = '2026-09-30T12:00:00.000Z';
    const pay = () => ({
      account: { id: 'acc-1', brokerage_authorization: 'conn-1', name: 'Robinhood Individual', number: '998877665', institution_name: 'Robinhood', raw_type: 'Individual',
        balance: { total: { amount: 26_250, currency: 'USD' } }, sync_status: { holdings: { initial_sync_completed: true, last_successful_sync: '2026-09-30T06:00:00Z' } } },
      balancesCash: 1_200,
      positions: [
        { symbol: { id: 'u-vti', raw_symbol: 'VTI', description: 'Vanguard Total', type: { code: 'et' } }, units: 250, price: 100, average_purchase_price: 80 },
        { symbol: { id: 'u-zz', raw_symbol: 'ZZZZ', description: '', type: { code: '' } }, units: 10, price: 5, average_purchase_price: 4 },
      ],
      activities: [],
    });
    const first = ingestSync([], {}, [pay()], NOWI);
    household({ assetAccounts: first.accounts });
    const a0: any = useStore.getState().assetAccounts[0];
    const z0 = (a0.positions as any[]).find((p) => p.ticker === 'ZZZZ');
    expect([z0.class_asked, z0.kind]).toEqual([true, 'stocks_etf']);
    expect(look('networth').lines.some((l) => /The app cannot tell what ZZZZ/.test(l))).toBe(true);
    open('holding', { account: a0.asset_id, position: z0.position_id, period: '1M' });
    press('Edit this holding');
    expect(readLines(true)).toContain(ASKED_LINE('ZZZZ'));
    expect(flat(screen.getByLabelText('Type: Stocks / Funds').props.style).backgroundColor).not.toBe(Colors.primaryLight);   // the sync's guess is not chosen for the person
    expect(disabled('Save holding')).toBe(true);
    press('Type: Crypto');
    press('Save holding');
    screen.unmount();
    const z1 = ((useStore.getState().assetAccounts[0] as any).positions as any[]).find((p) => p.ticker === 'ZZZZ');
    expect([z1.asset_class, z1.class_source, z1.class_asked]).toEqual(['other', 'user', undefined]);
    // THE NEXT SYNC keeps the answer (ingest reads the person's class first, DEC-2161)
    const next = ingestSync(useStore.getState().assetAccounts as any, first.seenKeys, [pay()], NOWI);
    useStore.setState({ assetAccounts: next.accounts } as any);
    const z2 = ((useStore.getState().assetAccounts[0] as any).positions as any[]).find((p) => p.ticker === 'ZZZZ');
    expect([z2.asset_class, z2.class_source, z2.class_asked]).toEqual(['other', 'user', undefined]);
    expect(look('networth').lines.some((l) => /cannot tell what/.test(l))).toBe(false);
    expect(band(look('account', { id: a0.asset_id, period: '1M' }), 'ALTERNATIVES', 4)).toContain('ZZZZ');
  });
  test('a holding already classed opens on its own type, as before (Stocks / Funds lit for VTI)', () => {
    household({ assetAccounts: [{ ...FIDELITY(1_000), positions: [BND, { position_id: 'v', ticker: 'VTI', kind: 'stocks_etf', lots: [lot('v1', 10, 80, '2025-03-03')] }] }], transactions: [BND_OPENING] });
    open('holding', { account: 'fid', position: 'v', period: '1M' });
    press('Edit this holding');
    expect(flat(screen.getByLabelText('Type: Stocks / Funds').props.style).backgroundColor).toBe(Colors.primaryLight);
    expect(readLines(true)).toContain('Type (sets the benchmark — SPY)');
    expect(disabled('Save holding')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// H5 · ITEM 5 — ONE VALUE FOR A HOLDING WITH NO PRICE: IN AN ACCOUNT BUILT BY HAND, WHAT WAS PAID (DEC-6926, DEC-6769, DEC-0022)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Fidelity Brokerage: $2,000 of cash, 50 BND ($73 today); 10 UNKNOWN123 bought as Other at $100.00, no price today. By hand: cash
// $2,000 − $1,000 = $1,000; BND 50 × $73 = $3,650; UNKNOWN123 what was paid, 10 × $100 = $1,000; Total $1,000 + $3,650 + $1,000 = $5,650.
describe('H5 · item 5 · a holding with no price in an account built by hand counts what was paid on its row, its bar, its page and Net worth — and the rows add up to the total', () => {
  test('$1,000 + $3,650 + $1,000 = $5,650 on the account page; $1,000 on the Holding page and in Net worth\'s Alternatives', () => {
    household({ assetAccounts: [FIDELITY(2_000)], transactions: [BND_OPENING] });
    buyOnAccountPage('fid', 'UNKNOWN123', '10', '100', 'Other');
    press('Record buy');
    screen.unmount();
    expect([acct('fid').cash_balance, acct('fid').balance]).toEqual([1_000, 5_650]);
    const p = (acct('fid').positions as any[]).find((x) => x.ticker === 'UNKNOWN123');
    const ACC = look('account', { id: 'fid', period: '1M' });
    const alt = band(ACC, 'ALTERNATIVES', 6);
    // BOUGHT TODAY, IT COUNTS AT WHAT WAS PAID WITH 0% GAIN (2026-10-27, FX-PF, PF-4; the lead's ruling R4): 10 × $100.00 = $1,000 paid
    // today, no price since, worth $1,000 → 1,000 ÷ 1,000 − 1 = +0.00% over 1M. It read "—": a holding bought inside the window,
    // dropped from the bar's return with no sentence. (The old answer, "—", is kept in the test.failing below.)
    expect(alt).toEqual(['▾ ALTERNATIVES', '$1,000', '+0.00%', 'UNKNOWN123', '10 shares · no price today — showing what you paid', '$1,000']);
    const parts = [band(ACC, 'CASH', 2)[1], band(ACC, 'BONDS & CDS', 2)[1], alt[1]];
    expect(parts).toEqual(['$1,000', '$3,650', '$1,000']);
    expect(after(ACC, 'Total')).toBe(money0(1_000 + 3_650 + 1_000));
    // the amber box says the same thing the row shows
    expect(ACC.lines).toContain('UNKNOWN123 has no price today. Meanwhile we show what you paid — it stays out of the change line, and we say so.');
    // THE HOLDING PAGE and NET WORTH carry the one value (agreement)
    const HOLD = look('holding', { account: 'fid', position: p.position_id, period: '1M' });
    expect(after(HOLD, 'NO LIVE PRICE — SHOWING WHAT YOU PAID')).toBe(alt[5]);
    const NW = look('networth');
    expect(after(NW, 'Alternatives')).toBe(alt[5]);
    expect(after(NW, 'Bonds & CDs')).toBe(parts[1]);
    expect(after(NW, 'Own $5,650 − Owe $0')).toBe(after(ACC, 'Total'));
    expect(after(look('invest', {}, pick('1 month')), 'Ending value')).toBe(after(ACC, 'Total'));   // the Performance tab, the same $5,650
  });
  test.failing('the answer until 2026-10-27, kept (no longer the app\'s): the bar read "—" for UNKNOWN123 bought today (PF-4, R4)', () => {
    household({ assetAccounts: [FIDELITY(2_000)], transactions: [BND_OPENING] });
    buyOnAccountPage('fid', 'UNKNOWN123', '10', '100', 'Other');
    press('Record buy');
    screen.unmount();
    expect(band(look('account', { id: 'fid', period: '1M' }), 'ALTERNATIVES', 6)[2]).toBe('—');
  });
  test('a linked account keeps its own rule: no price today with nothing left over reads "no price today", no figure (DEC-6926)', () => {
    const linked = { asset_id: 'lnk', label: 'Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', source: 'connected', balance: 1_000, cash_balance: 0,
      positions: [{ position_id: 'v', ticker: 'VTI', asset_class: 'stock_etf', last_price: 100, lots: [lot('v1', 10, 80, '2025-03-03')] },
        { position_id: 'z', ticker: 'ZZ', asset_class: 'stock_etf', lots: [lot('z1', 10, 50, '2025-03-03')] }] };
    household({ assetAccounts: [linked] });
    const ACC = look('account', { id: 'lnk', period: '1M' });
    const i = ACC.lines.indexOf('ZZ');
    expect(ACC.lines.slice(i, i + 3)).toEqual(['ZZ', '10 shares · no price today', 'no price today']);
  });
});
