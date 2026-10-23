/** PERFORMANCE FIX ROUND, PF-B (2026-10-21) — ONE FIGURE, ONE NUMBER, ON EVERY SCREEN THAT PRINTS IT.
 *
 *  The cross-screen agreement test for the fixes of the outside Performance re-run (OpenAI) that are about holdings, the
 *  market comparison, weights, rows and the Home figures Performance feeds. Every figure below was worked by hand first
 *  (the working is beside each check) and is then read off the REAL screens, rendered with the household's own data:
 *
 *   1 · MK-PF-M-008 / MK-PF-F-020 — the market, weighed by what each holding was worth when the window began. Home's
 *       "market +X%" is the blend of the two holding pages' own "The market, same dates" figures, weighed by the shares
 *       held when the 1M window began: (10% × 50 × $400 + 4% × 100 × $100) ÷ ($20,000 + $10,000) = 8.00%.
 *       DECIDED 2026-10-22 (W-START, the lead's decision under DEC-1669 and tenets 1 and 7): where money moved inside the
 *       window the market is split on the same days as your return, each piece weighed by what each holding was worth then.
 *       These closes hold the market flat until after Sep 10, when 100 VTI were held: (40,000 × 1.10 + 10,000 × 1.04) ÷
 *       50,000 = 8.80%. The start held is still the 50 shares (startValue $20,000).
 *   2 · Home's "ahead by" is marketGap — the function each holding page's "You are ahead by" reads.
 *   3 · MK-PF-M-003 / M-015 — the walk prints whole dollars that add up to its ending, on the Performance tab and on the
 *       account page alike, and each page's summary Wealth generated is its walk's.
 *   4 · MK-XS-M-004 and MK-PF-M-001 — Home's month: its dollars and percent are the Performance tab's 1M figures, and the
 *       base they are measured on is printed beneath, the Performance tab's own 1M Ending value.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { useStore } from '../../store/useStore';
import { figuresPrinted, resetFiguresPrinted } from '../../components/figure';
import { buildPerformance, portfolioBenchReturn, marketGap } from '../../domain/performance';
import { availableCash } from '../../domain/transactions';

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

// ── reading a screen: every Text in order, and every figure printed under its identifier ─────────────────────────────
const flat = (st: any) => (StyleSheet.flatten(st) ?? {}) as any;
const textOf = (n: any, tt?: string): string => {
  if (n == null) return '';
  if (typeof n === 'string') return tt === 'uppercase' ? n.toUpperCase() : n;
  if (Array.isArray(n)) return n.map((c) => textOf(c, tt)).join('');
  const t2 = flat(n.props?.style).textTransform ?? tt;
  return (n.children ?? []).map((c: any) => textOf(c, t2)).join('');
};
function readLines(): string[] {
  const out: string[] = [];
  const walk = (n: any) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.type === 'Text') { const t = textOf(n).replace(/\s+/g, ' ').trim(); if (t) out.push(t); return; }
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
}
const SCREENS: Record<string, () => any> = {
  invest: () => require('../PerformanceScreen').default, account: () => require('../AccountPortfolioScreen').default,
  holding: () => require('../HoldingDetailScreen').default, home: () => require('../HomeScreen').default,
};
type Shot = { printed: { id: string; text: string }[]; lines: string[] };
const FAKE = ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] as const;
function shoot(name: string, state: any, today: string, params: Record<string, string | undefined> = {}, act?: (s: typeof screen) => void): Shot {
  jest.useFakeTimers({ now: new Date(`${today}T12:00:00`), doNotFake: [...FAKE] });
  try {
    useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
    useStore.setState({ hideBalances: false, ...state } as any);
    mockParams = params;
    const C = SCREENS[name]();
    const r = render(<C />);
    if (act) act(screen);
    resetFiguresPrinted();
    r.rerender(<C />);
    const shot = { printed: figuresPrinted().filter((p) => !p.spoken).map((p) => ({ id: p.id, text: p.text })), lines: readLines() };
    r.unmount();
    return shot;
  } finally { jest.useRealTimers(); }
}
const pick = (label: string) => (s: typeof screen) => {
  const btn = s.getAllByRole('button').find((b) => String(b.props.accessibilityLabel ?? '').startsWith(`Show ${label}`));
  if (!btn) throw new Error(`no window ${label}`);
  fireEvent.press(btn);
};
/** a render made once, on first use inside a test (never while the tests are being collected) */
const once = (f: () => Shot) => { let v: Shot | null = null; return () => (v ??= f()); };
const after = (sh: Shot, label: string, n = 1) => { const i = sh.lines.indexOf(label); return i >= 0 ? sh.lines[i + n] : undefined; };
const printed = (sh: Shot, id: string) => sh.printed.filter((p) => p.id === id).map((p) => p.text);
const dollars = (s: string | undefined) => (s == null ? NaN : Number(s.replace('−', '-').replace(/[^0-9.\-]/g, '')));
const plus = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const closes = (pts: [string, number][]) => ({ points: pts.map(([date, close]) => ({ date, close })) });
const day = (date: string, accountId: string, holdings: [string, number, number][], cash: number) => ({
  date, origin: 'observed', writtenAt: `${date}T00:00:00Z`,
  holdings: holdings.map(([k, units, price]) => ({ date, accountId, securityKey: k, symbol: k, units, price, value: units * price, currency: 'USD' })),
  accounts: [{ date, accountId, currency: 'USD', typedValue: null, cash, statedTotal: holdings.reduce((t, h) => t + h[1] * h[2], 0) + cash }],
});
const txn = (id: string, account_id: string, type: string, amount: number, date: string, extra: any = {}) => ({ id, txn_id: id, account_id, type, amount, date, source: 'connected', ...extra });
void plus;

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 1 · 2 — THE MARKET, WEIGHED BY THE MIX HELD WHEN THE WINDOW BEGAN; THE GAP FROM ONE FUNCTION
// A Schwab brokerage: VTI 50 shares since 2024 and 50 more bought 10 Sep 2026 (inside the 1M window that opens 28 Aug),
// all at $400 — it did not move; BND 100 shares at $100, flat. SPY $500 → $550 (+10%), AGG $100 → $104 (+4%).
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const H_MARKET = {
  assetAccounts: [{ asset_id: 'z', label: 'Brokerage', institution: 'Schwab', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 50000, cash_balance: 0,
    source: 'connected', last_synced: '2026-09-28T08:00:00Z',
    positions: [{ position_id: 's1', ticker: 'VTI', asset_class: 'stock_etf', last_price: 400, lots: [
      { lot_id: 'z1', shares: 50, cost_per_share: 300, purchase_date: '2024-01-01' }, { lot_id: 'z1b', shares: 50, cost_per_share: 400, purchase_date: '2026-09-10' }] },
    { position_id: 's2', ticker: 'BND', asset_class: 'bond', last_price: 100, lots: [{ lot_id: 'z2', shares: 100, cost_per_share: 100, purchase_date: '2024-01-01' }] }] }],
  priceCache: { VTI: closes([['2026-08-27', 400], ['2026-08-28', 400], ['2026-09-10', 400], ['2026-09-28', 400]]),
    BND: closes([['2026-08-27', 100], ['2026-08-28', 100], ['2026-09-28', 100]]),
    SPY: closes([['2026-08-27', 500], ['2026-08-28', 500], ['2026-09-28', 550]]), AGG: closes([['2026-08-27', 100], ['2026-08-28', 100], ['2026-09-28', 104]]) },
  pricesFetchedAt: '2026-09-28T11:00:00Z', transactions: [], snapshotDays: [],
};

describe('1 · MK-PF-M-008 — Home\'s market is the blend of the holding pages\' own market figures, weighed by the start held', () => {
  const HOME = once(() => shoot('home', H_MARKET, '2026-09-28'));
  const VTI = once(() => shoot('holding', H_MARKET, '2026-09-28', { account: 'z', position: 's1' }, pick('1M')));
  const BND = once(() => shoot('holding', H_MARKET, '2026-09-28', { account: 'z', position: 's2' }, pick('1M')));
  test('each holding page: The market, same dates — VTI +10.00% (SPY), BND +4.00% (AGG)', () => {
    expect(after(VTI(), 'The market, same dates')).toBe('+10.00%');
    expect(after(BND(), 'The market, same dates')).toBe('+4.00%');
  });
  // DECIDED 2026-10-22 (W-START): split on the same days as your return, with its weights — the market moved only after the 50
  // VTI were bought (SPY $500 and AGG $100 through Sep 9), so it is weighed by the 100 held then
  test('Home: market +8.80% = (40,000 × 1.10 + 10,000 × 1.04) ÷ 50,000 − 1 on the same days as your return (DECIDED 2026-10-22; on 2026-10-21, weighed by the starts alone, +8.00%)', () => {
    expect(HOME().lines.some((l) => /· market \+8\.80% ·/.test(l))).toBe(true);
    expect((20000 * 1 + 10000 * 1) / 30000 * ((40000 * 1.1 + 10000 * 1.04) / 50000) - 1).toBeCloseTo(0.088, 12);
  });
  test.failing('Home: the app on 2026-10-21, pinned — market +8.00%, weighed by the starts alone; no longer its answer where money moved inside the window (DECIDED 2026-10-22)', () => {
    expect(HOME().lines.some((l) => /· market \+8\.00% ·/.test(l))).toBe(true);
  });
  test('the function Home calls gives the same figure from the rows it builds — one figure, one function; the start held is still the 50 shares', () => {
    const rows = buildPerformance(H_MARKET.assetAccounts[0].positions as any, (t) => (H_MARKET.priceCache as any)[t], '1M', new Date('2026-09-28T12:00:00'));
    expect(rows.map((r) => r.startValue)).toEqual([20000, 10000]);
    expect(portfolioBenchReturn(rows)!).toBeCloseTo(0.088, 12);
  });
  test('2 · "ahead by" on Home is marketGap of the two figures beside it; a holding page\'s "You are … by" is marketGap of its row', () => {
    const line = HOME().lines.find((l) => /· market \+8\.80% ·/.test(l))!;
    const you = Number(/you ([+−-][0-9.]+)%/.exec(line)![1].replace('−', '-')) / 100;
    const gapWords = /(ahead|behind) by ([0-9.]+)%/.exec(line)!;
    // the screen prints you to two decimals; the gap is worked unrounded, so it may differ from the printed difference by a hundredth at most
    expect(Math.abs(Number(gapWords[2]) / 100 - Math.abs(marketGap(you, 0.088)!))).toBeLessThanOrEqual(0.0001 + 1e-12);
    expect(gapWords[1]).toBe(you >= 0.088 ? 'ahead' : 'behind');
    // VTI did not move against a market up 10%: behind by 10.00 points on its own page
    expect(after(VTI(), 'You are')).toBe('behind by 10.00 points');
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 3 · THE WALK ADDS UP AS PRINTED. A linked account: $10,000.50 on 31 Dec 2025, $1,000.50 paid in on 1 Jun, a $100.50
// dividend on 1 Jul, worth $11,500.49 on 28 Sep. By hand: beginning $10,001, ending $11,500; the lines between make
// $1,499 — rounded down $1,000 + $100 + $398 = $1,498, the missing dollar to the change's 99¢ → $399. Wealth generated
// $100 + $399 = $499. $10,001 + $1,000 + $100 + $399 = $11,500.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const linked = (id: string, bal: number) => ({ asset_id: id, label: 'Schwab Brokerage', institution: 'Schwab', kind: 'brokerage', tax_bucket: 'TAXABLE',
  balance: bal, cash_balance: bal, source: 'connected', last_synced: '2026-09-28T08:00:00Z', positions: [] });
const cashDays = (acct: string, pts: [string, number][]) => pts.map(([d, v]) => day(d, acct, [], v));
const H_UNROUND = { assetAccounts: [linked('r1', 11_500.49)], transactions: [txn('c', 'r1', 'DEPOSIT', 1_000.5, '2026-06-01'), txn('d', 'r1', 'DIVIDEND', 100.5, '2026-07-01')],
  snapshotDays: cashDays('r1', [['2025-12-31', 10_000.5], ['2026-05-31', 10_200.5], ['2026-06-01', 11_201], ['2026-09-28', 11_500.49]]), priceCache: {} };

describe('3 · MK-PF-M-003 / MK-PF-M-015 — the walk\'s lines add up to its ending as printed, on both screens', () => {
  const INV = once(() => shoot('invest', H_UNROUND, '2026-09-28', {}, pick('This year')));
  const ACC = once(() => shoot('account', H_UNROUND, '2026-09-28', { id: 'r1', period: 'YTD' }));
  test('Performance tab: $10,001 · $1,000 · $0 · $100 · $0 · $399 → $11,500; Wealth generated $499 in the walk and in the summary', () => {
    expect(printed(INV(), 'MK-PF-M-018')[0]).toBe('$10,001');
    expect(printed(INV(), 'MK-PF-M-019').slice(0, 5)).toEqual(['$1,000', '$0', '$100', '$0', '$399']);
    expect(printed(INV(), 'MK-PF-M-002')).toEqual(['$499', '$499']);
    expect(after(INV(), 'Ending value')).toBe('$11,500');
  });
  test('account page: the same lines, the same total, the same Wealth generated in its trio and its walk', () => {
    expect(printed(ACC(), 'MK-PF-M-013')[0]).toBe('$10,001');
    expect(printed(ACC(), 'MK-PF-M-015').slice(0, 5)).toEqual(['$1,000', '$0', '$100', '$0', '$399']);
    expect(printed(ACC(), 'MK-PF-M-014')).toEqual(['$499', '$499']);
    expect(printed(ACC(), 'MK-PF-M-004').slice(-1)[0]).toBe('$11,500');
  });
  test('both: beginning + contributions − withdrawals + dividends + interest + change = the ending printed', () => {
    for (const [sh, b, l, e] of [[INV(), 'MK-PF-M-018', 'MK-PF-M-019', 'MK-PF-M-001'], [ACC(), 'MK-PF-M-013', 'MK-PF-M-015', 'MK-PF-M-004']] as [Shot, string, string, string][]) {
      const [c, w, d, i, ch] = printed(sh, l).slice(0, 5).map(dollars);
      expect(dollars(printed(sh, b)[0]) + c - w + d + i + ch).toBe(dollars(printed(sh, e).slice(-1)[0]));
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 4 · HOME'S MONTH IS THE PERFORMANCE TAB'S 1M. $30,000 on 31 Dec 2025 (100 VTI at $260 + $4,000 cash), $6,000 paid in on
// 1 Apr, worth $46,600 on 28 Sep with $10,825 of cash in the account. YOUR INVESTMENTS leaves the cash out: $35,775.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const PERF_ACCOUNT = { asset_id: 'a2', label: 'Fidelity Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE',
  balance: 100 * 357.75 + 10_825, cash_balance: 10_825, source: 'connected', last_synced: '2026-09-28T08:00:00Z', target_return: 0.07,
  positions: [{ position_id: 'p1', ticker: 'VTI', asset_class: 'stock_etf', last_price: 357.75, lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 210, purchase_date: '2023-03-15' }] }] };
const H_PERF = {
  assetAccounts: [PERF_ACCOUNT],
  transactions: [txn('c1', 'a2', 'DEPOSIT', 6000, '2026-04-01'), txn('d1', 'a2', 'DIVIDEND', 825, '2026-06-20', { ticker: 'VTI' })],
  snapshotDays: [day('2025-12-31', 'a2', [['VTI', 100, 260]], 4000), day('2026-04-01', 'a2', [['VTI', 100, 284]], 10_000), day('2026-09-28', 'a2', [['VTI', 100, 357.75]], 10_825)],
  priceCache: { VTI: closes([['2025-12-30', 260], ['2025-12-31', 260], ['2026-04-01', 284], ['2026-09-25', 357.75], ['2026-09-28', 357.75]]) },
  pricesFetchedAt: '2026-09-28T11:00:00Z',
};

describe('4 · MK-XS-M-004 / MK-PF-M-001 — Home\'s month and its base are the Performance tab\'s 1M figures', () => {
  const HOME = once(() => shoot('home', H_PERF, '2026-09-28'));
  const INV = once(() => shoot('invest', H_PERF, '2026-09-28', {}, pick('1M')));
  test('the dollars and the percent on Home are the 1M Wealth generated and Return on the Performance tab', () => {
    const line = HOME().lines.find((l) => /this month$/.test(l) && /^▲ up|^▼ down/.test(l))!;
    expect(line).toBe('▲ up $8,200 (21.35%) this month');
    expect(printed(INV(), 'MK-PF-M-002')[0]).toBe('$8,200');
    expect(printed(INV(), 'MK-PF-M-017')[0]).toBe('+21.35%');
    expect(printed(HOME(), 'MK-XS-M-004')).toEqual(['21.35%']);
  });
  test('Home names the base of that change — the Performance tab\'s 1M Ending value, $46,600 — under YOUR INVESTMENTS $35,775', () => {
    expect(after(HOME(), 'YOUR INVESTMENTS', 2)).toBe('$35,775');
    expect(HOME().lines).toContain("This month's change is on $46,600: your investment accounts with the cash in them.");
    expect(printed(HOME(), 'MK-PF-M-001')).toEqual([after(INV(), 'Ending value')]);
  });
});

describe('MK-PF-M-020 · cash never entered is not $0', () => {
  test('a hand-built brokerage with no cash entered: not known (null); one with $0 entered: $0; a savings account: its balance', () => {
    expect(availableCash({ asset_id: 'b', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 5000, derive_balance: true, positions: [] } as any)).toBeNull();
    expect(availableCash({ asset_id: 'b', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 5000, cash_balance: 0, positions: [] } as any)).toBe(0);
    expect(availableCash({ asset_id: 's', label: 'Savings', kind: 'savings', tax_bucket: 'CASH', balance: 1200 } as any)).toBe(1200);
  });
});
