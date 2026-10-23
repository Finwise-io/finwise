/** SHARES ADDED INSIDE THE WINDOW — ONE START, ONE GAIN, ONE RETURN ON EVERY SCREEN (W-START, 2026-10-22).
 *
 *  The cross-screen agreement test for three fixes of the outside Performance re-run (OpenAI, part 1):
 *   · DEC-3656 (MK-NW-F-091 pricedGainOf, MK-NW-F-127 gainOfRow): a holding held when the window began that bought more inside
 *     it gained its value today less what it was worth then less what it paid — never today's shares worked back.
 *   · DEC-1669 (MK-PF-M-006 WHAT EACH CATEGORY EARNED, MK-PF-M-024 the account page's class rows, MK-PF-M-016/017 Return where
 *     the beginning is worked back): the return is split at every day money went into the holdings, each piece measured.
 *   · MK-PF-F-044 / MK-PF-M-008 (authentic start weights, decided 2026-10-21): Home's market is weighed by the same starts.
 *  Every figure was worked by hand first (the working is beside each check) and is read off the REAL screens — the Performance
 *  tab, the account page, Home and the Holding page — rendered with the household's own data.
 *
 *  THE HOUSEHOLD (today Sep 30, 2026; the 1M window opens Aug 30, so it begins at the Aug 29 close; no daily record, so every
 *  window is worked back from price history): one Schwab brokerage —
 *    AAA  10 shares held since January, $100 on Aug 29; 90 more bought Sep 15 for $105 each ($9,450, paid in that day); $105 at
 *         the Sep 14 close; $110 today → 100 × $110 = $11,000
 *    BBB  100 shares, $100 on Aug 29 and on Sep 14, $50 today → $5,000
 *    BND  100 shares of a bond fund, $100 throughout → $10,000
 *  Worth $26,000 today. Yardsticks: SPY $500 → $520 at the Sep 14 close → $550 (+10%), AGG $100 → $102 → $104 (+4%).
 *  By hand —
 *    starts (what each was worth when the window began): AAA 10 × $100 = $1,000 · BBB $10,000 · BND $10,000 = $21,000
 *    gains: AAA $11,000 − $1,000 − $9,450 = $550 · BBB $5,000 − $10,000 = −$5,000 · BND $0 → Wealth generated −$4,450
 *    Beginning = $26,000 − (−$4,450) − $9,450 paid in = $21,000
 *    Return, split on Sep 15: (AAA 10 × $105 + $10,000 + $10,000) ÷ $21,000 × $26,000 ÷ (100 × $105 + $10,000 + $10,000) − 1
 *           = 21,050 ÷ 21,000 × 26,000 ÷ 30,500 − 1 = −14.55%
 *    Stocks / Funds alone: 11,050 ÷ 11,000 × 16,000 ÷ 20,500 − 1 = −21.60%
 *    Home's market, split on the same day as your return and weighed as it is (2026-10-22): piece 1 AAA $1,000, BBB $10,000, BND
 *    $10,000, SPY ×520/500, AGG ×102/100; piece 2 AAA $10,500, BBB $10,000, BND $10,000, SPY ×550/520, AGG ×104/102 → +7.71%
 *    (weighed by the starts alone, +7.14%)
 *  Before the fix (today's shares worked back: AAA $11,000 ÷ 1.1 = $10,000): Wealth generated −$4,000, Beginning $20,550,
 *  Return −13.33%, Stocks / Funds −20.00%, market +8.00%.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { useStore } from '../../store/useStore';
import { figuresPrinted, resetFiguresPrinted } from '../../components/figure';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));
let mockParams: Record<string, string | undefined> = {};

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
const once = (f: () => Shot) => { let v: Shot | null = null; return () => (v ??= f()); };
const after = (sh: Shot, label: string, n = 1) => { const i = sh.lines.indexOf(label); return i >= 0 ? sh.lines[i + n] : undefined; };
const printed = (sh: Shot, id: string) => sh.printed.filter((p) => p.id === id).map((p) => p.text);
const closes = (pts: [string, number][]) => ({ points: pts.map(([date, close]) => ({ date, close })) });
const lot = (id: string, shares: number, cost: number, date: string) => ({ lot_id: id, shares, cost_per_share: cost, purchase_date: date });
const pct = (x: number) => `${x < 0 ? '−' : '+'}${Math.abs(x * 100).toFixed(2)}%`;

const TODAY = '2026-09-30';
const RETURN = (21050 / 21000) * (26000 / 30500) - 1;   // −14.55%
const STOCKS = (11050 / 11000) * (16000 / 20500) - 1;   // −21.60%
const MARKET = ((1000 * 520 / 500 + 10000 * 520 / 500 + 10000 * 102 / 100) / 21000)
  * ((10500 * 550 / 520 + 10000 * 550 / 520 + 10000 * 104 / 102) / 30500) - 1;   // +7.71%
const YARD = {
  SPY: closes([['2026-08-28', 500], ['2026-08-29', 500], ['2026-09-14', 520], ['2026-09-30', 550]]),
  AGG: closes([['2026-08-28', 100], ['2026-08-29', 100], ['2026-09-14', 102], ['2026-09-30', 104]]),
};
const household = (dividend: number) => ({
  assetAccounts: [{ asset_id: 'z', label: 'Brokerage', institution: 'Schwab', kind: 'brokerage', tax_bucket: 'TAXABLE', asset_class: 'stocks_etf',
    balance: 26000 + dividend, cash_balance: dividend, source: 'connected', last_synced: '2026-09-30T08:00:00Z',
    positions: [
      { position_id: 'pa', ticker: 'AAA', asset_class: 'stock_etf', last_price: 110, lots: [lot('a1', 10, 95, '2026-01-02'), lot('a2', 90, 105, '2026-09-15')] },
      { position_id: 'pb', ticker: 'BBB', asset_class: 'stock_etf', last_price: 50, lots: [lot('b1', 100, 80, '2026-01-02')] },
      { position_id: 'pd', ticker: 'BND', asset_class: 'bond', last_price: 100, lots: [lot('d1', 100, 100, '2024-01-02')] }] }],
  priceCache: {
    AAA: closes([['2026-08-28', 100], ['2026-08-29', 100], ['2026-09-14', 105], ['2026-09-15', 105], ['2026-09-30', 110]]),
    BBB: closes([['2026-08-28', 100], ['2026-08-29', 100], ['2026-09-14', 100], ['2026-09-30', 50]]),
    BND: closes([['2026-08-28', 100], ['2026-08-29', 100], ['2026-09-30', 100]]),
    SPY: YARD.SPY, AGG: YARD.AGG,
  },
  pricesFetchedAt: '2026-09-30T11:00:00Z', snapshotDays: [],
  transactions: [{ id: 'c', txn_id: 'c', account_id: 'z', type: 'DEPOSIT', amount: 9450, date: '2026-09-15', source: 'connected' },
    ...(dividend ? [{ id: 'v', txn_id: 'v', account_id: 'z', type: 'DIVIDEND', ticker: 'AAA', amount: dividend, date: '2026-09-20', source: 'connected' }] : [])],
});
const H = household(0);
const H_DIV = household(50);   // the same, with a $50 dividend, so the category table is drawn (it lists only what earned)

describe('the hand-worked figures themselves', () => {
  test('−14.55%, −21.60%, +7.71% — and the figures before the fix were −13.33%, −20.00%, +8.00%', () => {
    expect([pct(RETURN), pct(STOCKS), pct(MARKET)]).toEqual(['−14.55%', '−21.60%', '+7.71%']);
    expect([pct(26000 / 30000 - 1), pct(16000 / 20000 - 1), pct((0.10 * 10000 + 0.10 * 10000 + 0.04 * 10000) / 30000)]).toEqual(['−13.33%', '−20.00%', '+8.00%']);
  });
});

describe('1 · DEC-3656 — the beginning and what the holdings gained: one figure on the Performance tab, the account page and Home', () => {
  const INV = once(() => shoot('invest', H, TODAY, {}, pick('1M')));
  const ACC = once(() => shoot('account', H, TODAY, { id: 'z', period: '1M' }));
  const HOME = once(() => shoot('home', H, TODAY));
  test('Performance tab, 1M: Beginning $21,000 (it read $20,550), Wealth generated −$4,450 (it read −$4,000), Return −14.55% (it read −13.33%)', () => {
    // (the tab writes a loss's minus beside the figure, so the line is read as the person reads it)
    expect(after(INV(), 'Beginning market value (Aug 29, 2026)')).toBe('$21,000');
    expect(printed(INV(), 'MK-PF-M-018')[0]).toBe('$21,000');
    expect(after(INV(), 'Wealth generated')).toBe('−$4,450');
    expect(printed(INV(), 'MK-PF-M-002')[0]).toBe('$4,450');
    expect(after(INV(), 'Return')).toBe(pct(RETURN));
    expect(printed(INV(), 'MK-PF-M-017')[0]).toBe(pct(RETURN));
    expect(INV().lines).toContain(`🔗 Linked · wealth generated −$4,450 · return ${pct(RETURN)}`);
  });
  test('account page, 1M: the same Beginning, Wealth generated and Return', () => {
    expect(printed(ACC(), 'MK-PF-M-013')[0]).toBe('$21,000');
    expect(printed(ACC(), 'MK-PF-M-014')[0]).toBe('−$4,450');
    expect(printed(ACC(), 'MK-PF-M-016')[0]).toBe(pct(RETURN));
  });
  test('Home: the month is the Performance tab\'s 1M — down $4,450 (14.55%)', () => {
    const line = HOME().lines.find((l) => /this month$/.test(l) && /^▲ up|^▼ down/.test(l));
    expect(line).toBe(`▼ down $4,450 (${pct(RETURN).slice(1)}) this month`);
  });
});

describe('2 · DEC-1669 — a category is split at every day money went into it: the Performance tab and the account page agree', () => {
  const INV = once(() => shoot('invest', H_DIV, TODAY, {}, pick('1M')));
  const ACC = once(() => shoot('account', H_DIV, TODAY, { id: 'z', period: '1M' }));
  test('Performance tab, WHAT EACH CATEGORY EARNED: Stocks / Funds −21.60% (it read −20.00%)', () => {
    expect(printed(INV(), 'MK-PF-M-006')).toContain(pct(STOCKS));
    expect(after(INV(), 'Stocks / Funds', 2)).toBe(pct(STOCKS));
  });
  test('account page, the Stocks / Funds class row: −21.60% — the same figure', () => {
    expect(printed(ACC(), 'MK-PF-M-024')).toContain(pct(STOCKS));
  });
});

describe('3 · MK-PF-M-008 — Home\'s market is split on the same day as your return, with the same weights (decided 2026-10-22)', () => {
  const HOME = once(() => shoot('home', H, TODAY));
  const AAA = once(() => shoot('holding', H, TODAY, { account: 'z', position: 'pa' }, pick('1M')));
  test('Home: you −14.55% · market +7.71% · behind by 22.26% — the gap from the two unrounded figures (the market weighed by the starts alone read +7.14%; from today\'s shares +8.00%)', () => {
    const line = HOME().lines.find((l) => l.includes(`· market ${pct(MARKET)} ·`));
    expect(line).toBeDefined();
    expect(line).toContain(`behind by ${Math.abs((RETURN - MARKET) * 100).toFixed(2)}%`);
    expect(Math.abs((RETURN - MARKET) * 100).toFixed(2)).toBe('22.26');
  });
  test('the Holding page: AAA\'s own return is its price move, +10.00% ($100 → $110), beside the market +10.00%', () => {
    expect(after(AAA(), 'The market, same dates')).toBe('+10.00%');
    expect(AAA().lines).toContain('+10.00%');
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 4 · DEC-3656 — SHARES SOLD INSIDE THE WINDOW. The same Schwab brokerage, another month: AAA 20 shares held since January
// ($100 on Aug 29), 10 sold Sep 15 at $105 (the sale took the oldest purchase first, so today's lot holds 10), $110 today;
// BND 100 shares at $100 throughout; the $1,050 the sale brought in is cash in the account. Worth $1,100 + $10,000 + $1,050 =
// $12,150. By hand — start AAA 20 × $100 = $2,000 + BND $10,000 = $12,000; AAA gained $1,100 − $2,000 + $1,050 = $150;
// Beginning $12,150 − $150 = $12,000; Return (2,100 + 10,000) ÷ 12,000 × (1,100 + 10,000) ÷ (1,050 + 10,000) − 1 = +1.29%.
// Before (from today's 10 shares): gained $100, Beginning $12,050, Return 11,100 ÷ 11,000 − 1 = +0.91%.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const SOLD_RETURN = ((2100 + 10000) / 12000) * ((1100 + 10000) / (1050 + 10000)) - 1;
const SOLD_MARKET = ((2000 * 520 / 500 + 10000 * 102 / 100) / 12000) * ((1050 * 550 / 520 + 10000 * 104 / 102) / 11050) - 1;
const H_SOLD = {
  assetAccounts: [{ asset_id: 's', label: 'Brokerage', institution: 'Schwab', kind: 'brokerage', tax_bucket: 'TAXABLE', asset_class: 'stocks_etf',
    balance: 1100 + 10000 + 1050, cash_balance: 1050, source: 'connected', last_synced: '2026-09-30T08:00:00Z',
    positions: [
      { position_id: 'pa', ticker: 'AAA', asset_class: 'stock_etf', last_price: 110, lots: [lot('a1', 10, 80, '2026-01-02')] },
      { position_id: 'pd', ticker: 'BND', asset_class: 'bond', last_price: 100, lots: [lot('d1', 100, 100, '2024-01-02')] }] }],
  priceCache: {
    AAA: closes([['2026-08-28', 100], ['2026-08-29', 100], ['2026-09-14', 105], ['2026-09-15', 105], ['2026-09-30', 110]]),
    BND: closes([['2026-08-28', 100], ['2026-08-29', 100], ['2026-09-30', 100]]), SPY: YARD.SPY, AGG: YARD.AGG,
  },
  pricesFetchedAt: '2026-09-30T11:00:00Z', snapshotDays: [],
  transactions: [{ id: 'x', txn_id: 'x', account_id: 's', type: 'SELL', ticker: 'AAA', shares: 10, price: 105, amount: 1050, date: '2026-09-15', source: 'connected' }],
};

describe('4 · DEC-3656 — a holding that sold shares inside the window: one start, one gain, one return on every screen', () => {
  const INV = once(() => shoot('invest', H_SOLD, TODAY, {}, pick('1M')));
  const ACC = once(() => shoot('account', H_SOLD, TODAY, { id: 's', period: '1M' }));
  const HOME = once(() => shoot('home', H_SOLD, TODAY));
  const AAA = once(() => shoot('holding', H_SOLD, TODAY, { account: 's', position: 'pa' }, pick('1M')));
  test('the hand-worked figures: +1.29% (before +0.91%), the market +4.71%', () => {
    expect([pct(SOLD_RETURN), pct(11100 / 11000 - 1), pct(SOLD_MARKET)]).toEqual(['+1.29%', '+0.91%', '+4.71%']);
  });
  test('Performance tab, 1M: Beginning $12,000 (it read $12,050), Wealth generated $150 (it read $100), Return +1.29% (it read +0.91%)', () => {
    expect(after(INV(), 'Beginning market value (Aug 29, 2026)')).toBe('$12,000');
    expect(after(INV(), 'Wealth generated')).toBe('$150');
    expect(after(INV(), 'Return')).toBe(pct(SOLD_RETURN));
  });
  test('account page, 1M: the same Beginning, Wealth generated and Return', () => {
    expect(printed(ACC(), 'MK-PF-M-013')[0]).toBe('$12,000');
    expect(printed(ACC(), 'MK-PF-M-014')[0]).toBe('$150');
    expect(printed(ACC(), 'MK-PF-M-016')[0]).toBe(pct(SOLD_RETURN));
  });
  test('Home: up $150 (1.29%) this month, beside the market on the same days and weights, +4.71%', () => {
    expect(HOME().lines).toContain(`▲ up $150 (${pct(SOLD_RETURN).slice(1)}) this month`);
    expect(HOME().lines.some((l) => l.includes(`· market ${pct(SOLD_MARKET)} ·`))).toBe(true);
  });
  test('the Holding page and the account page give AAA one figure for the month: +10.00% ($100 → $110), the market +10.00%', () => {
    expect(after(AAA(), 'The market, same dates')).toBe('+10.00%');
    expect(printed(ACC(), 'MK-PF-M-023')).toContain('+10.00%');
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 5 · THE TRUE REASON (2026-10-22; canon row 24, tenets 1 and 3). VTI 10 shares held since 2025, 10 more bought Sep 15 with no
// price paid on record; $110 today ($2,200). Its return is known from its prices, so Return counts it; what it gained is not
// known, so Wealth generated leaves it out — and the line names it for the purchase, not for a price history it has.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const H_NOPAID = {
  assetAccounts: [{ asset_id: 'n', label: 'Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', asset_class: 'stocks_etf',
    balance: 2200, cash_balance: 0, source: 'connected', last_synced: '2026-09-30T08:00:00Z',
    positions: [{ position_id: 'pv', ticker: 'VTI', asset_class: 'stock_etf', last_price: 110,
      lots: [lot('v1', 10, 90, '2025-01-02'), { lot_id: 'v2', shares: 10, cost_per_share: null, purchase_date: '2026-09-15' }] }] }],
  priceCache: { VTI: closes([['2026-08-28', 100], ['2026-08-29', 100], ['2026-09-30', 110]]), SPY: YARD.SPY },
  pricesFetchedAt: '2026-09-30T11:00:00Z', transactions: [],
  // the daily record Home writes the day an account is linked (the account page's state D): it begins today, so 1M is worked
  // back from price history on both pages
  snapshotDays: [{ date: TODAY, origin: 'observed', writtenAt: `${TODAY}T00:00:00Z`,
    holdings: [{ date: TODAY, accountId: 'n', securityKey: 'VTI', symbol: 'VTI', units: 20, price: 110, value: 2200, currency: 'USD' }],
    accounts: [{ date: TODAY, accountId: 'n', currency: 'USD', typedValue: null, cash: 0, statedTotal: 2200 }] }],
};
const NOPAID = 'Return is on the $2,200 with a price history. VTI ($2,200) has a purchase with no price paid on record, so its gains are not included.';

describe('5 · the left-out line gives the true reason, on the Performance tab and the account page', () => {
  const INV = once(() => shoot('invest', H_NOPAID, TODAY, {}, pick('1M')));
  const ACC = once(() => shoot('account', H_NOPAID, TODAY, { id: 'n', period: '1M' }));
  test('Performance tab: the purchase with no price paid on record is the reason given — never "no price history"', () => {
    expect(INV().lines).toContain(NOPAID);
    expect(INV().lines.some((l) => /VTI \(\$2,200\) has no price history/.test(l))).toBe(false);
  });
  test('account page: the same sentence', () => {
    expect(ACC().lines).toContain(NOPAID);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 6 · DEC-3656 — A HOLDING SOLD IN FULL INSIDE THE WINDOW. A Schwab stocks account: AAA 20 shares held since January ($100 on
// Aug 29), all 20 sold Sep 15 at $105 — the $2,100 is cash in the account; BND 100 at $100 throughout. Worth $10,000 + $2,100 =
// $12,100. By hand — start AAA 20 × $100 = $2,000 + BND $10,000 = $12,000; AAA gained $0 − $2,000 + $2,100 = $100; Beginning
// $12,100 − $100 = $12,000; Return (2,100 + 10,000) ÷ 12,000 × 10,000 ÷ 10,000 − 1 = +0.83%. Before: AAA had no row, so the
// walk began at $12,100 with $0 gained and +0.00%. The market on the same days: piece 1 AAA $2,000 (SPY ×520/500) + BND $10,000
// (AGG ×102/100); piece 2 BND $10,000 (AGG ×104/102) → +4.34%.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const GONE_RETURN = (2100 + 10000) / 12000 - 1;
const GONE_MARKET = ((2000 * 520 / 500 + 10000 * 102 / 100) / 12000) * (10000 * 104 / 102 / 10000) - 1;
const H_GONE = {
  assetAccounts: [{ asset_id: 'g', label: 'Brokerage', institution: 'Schwab', kind: 'brokerage', tax_bucket: 'TAXABLE', asset_class: 'stocks_etf',
    balance: 10000 + 2100, cash_balance: 2100, source: 'connected', last_synced: '2026-09-30T08:00:00Z',
    positions: [{ position_id: 'pd', ticker: 'BND', asset_class: 'bond', last_price: 100, lots: [lot('d1', 100, 100, '2024-01-02')] }] }],
  priceCache: {
    AAA: closes([['2026-08-28', 100], ['2026-08-29', 100], ['2026-09-14', 105], ['2026-09-15', 105], ['2026-09-30', 110]]),
    BND: closes([['2026-08-28', 100], ['2026-08-29', 100], ['2026-09-30', 100]]), SPY: YARD.SPY, AGG: YARD.AGG,
  },
  pricesFetchedAt: '2026-09-30T11:00:00Z', snapshotDays: [],
  transactions: [{ id: 'y', txn_id: 'y', account_id: 'g', type: 'SELL', ticker: 'AAA', shares: 20, price: 105, amount: 2100, date: '2026-09-15', source: 'connected' }],
};

describe('6 · DEC-3656 — a holding sold in full inside the window: the same beginning, gain and return on the Performance tab, the account page and Home', () => {
  const INV = once(() => shoot('invest', H_GONE, TODAY, {}, pick('1M')));
  const ACC = once(() => shoot('account', H_GONE, TODAY, { id: 'g', period: '1M' }));
  const HOME = once(() => shoot('home', H_GONE, TODAY));
  test('the hand-worked figures: +0.83%, the market +4.34%', () => {
    expect([pct(GONE_RETURN), pct(GONE_MARKET)]).toEqual(['+0.83%', '+4.34%']);
  });
  test('Performance tab, 1M: Beginning $12,000 (it read $12,100), Wealth generated $100 (it read $0), Return +0.83% (it read +0.00%)', () => {
    expect(after(INV(), 'Beginning market value (Aug 29, 2026)')).toBe('$12,000');
    expect(after(INV(), 'Wealth generated')).toBe('$100');
    expect(after(INV(), 'Return')).toBe(pct(GONE_RETURN));
    expect(INV().lines).toContain(`🔗 Linked · wealth generated $100 · return ${pct(GONE_RETURN)}`);
  });
  test('account page, 1M: the same Beginning, Wealth generated and Return', () => {
    expect(printed(ACC(), 'MK-PF-M-013')[0]).toBe('$12,000');
    expect(printed(ACC(), 'MK-PF-M-014')[0]).toBe('$100');
    expect(printed(ACC(), 'MK-PF-M-016')[0]).toBe(pct(GONE_RETURN));
  });
  test('Home: up $100 (0.83%) this month, beside the market on the same days and weights, +4.34%', () => {
    expect(HOME().lines).toContain(`▲ up $100 (${pct(GONE_RETURN).slice(1)}) this month`);
    expect(HOME().lines.some((l) => l.includes(`· market ${pct(GONE_MARKET)} ·`))).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 7 · DEC-1669 — A HOLDING BOUGHT INSIDE THE WINDOW THAT ALSO SOLD. This year to Sep 30: 10 CCC bought Aug 3 at $100, 10 more
// Sep 1 at $110 (Aug 31 close $110), the first 10 sold Sep 15 at $120 (Sep 14 close $120), $130 today; the account's records
// hold all three. By hand: 1,100 ÷ 1,000 × 2,400 ÷ 2,200 × 1,300 ÷ 1,200 − 1 = +30.00% (from the 10 still held, +18.18%).
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const H_CAP = {
  assetAccounts: [{ asset_id: 'c', label: 'Brokerage', institution: 'Schwab', kind: 'brokerage', tax_bucket: 'TAXABLE', asset_class: 'stocks_etf',
    balance: 1300 + 1200 + 5000, cash_balance: 1200, source: 'connected', last_synced: '2026-09-30T08:00:00Z',
    positions: [{ position_id: 'pc', ticker: 'CCC', asset_class: 'stock_etf', last_price: 130, lots: [lot('c2', 10, 110, '2026-09-01')] },
      { position_id: 'pd', ticker: 'BND', asset_class: 'bond', last_price: 100, lots: [lot('d1', 50, 100, '2024-01-02')] }] }],
  priceCache: {
    CCC: closes([['2026-08-03', 100], ['2026-08-31', 110], ['2026-09-01', 110], ['2026-09-14', 120], ['2026-09-30', 130]]),
    BND: closes([['2025-12-31', 100], ['2026-09-30', 100]]),
    SPY: closes([['2025-12-31', 480], ['2026-08-03', 500], ['2026-08-31', 520], ['2026-09-14', 540], ['2026-09-30', 560]]),
    AGG: closes([['2025-12-31', 100], ['2026-09-30', 104]]),
  },
  pricesFetchedAt: '2026-09-30T11:00:00Z', snapshotDays: [],
  transactions: [
    { id: 'b1', txn_id: 'b1', account_id: 'c', type: 'BUY', ticker: 'CCC', shares: 10, price: 100, amount: 1000, date: '2026-08-03', source: 'connected' },
    { id: 'b2', txn_id: 'b2', account_id: 'c', type: 'BUY', ticker: 'CCC', shares: 10, price: 110, amount: 1100, date: '2026-09-01', source: 'connected' },
    { id: 's2', txn_id: 's2', account_id: 'c', type: 'SELL', ticker: 'CCC', shares: 10, price: 120, amount: 1200, date: '2026-09-15', source: 'connected' }],
};

describe('7 · DEC-1669 — a holding bought inside the window that also sold: one return on its own page and its account\'s', () => {
  const HOLD = once(() => shoot('holding', H_CAP, TODAY, { account: 'c', position: 'pc', period: 'YTD' }));
  const ACC = once(() => shoot('account', H_CAP, TODAY, { id: 'c', period: 'YTD' }));
  test('the Holding page: Your return since purchase +30.00% (it read +18.18%), the market on the same days +12.00% (560 ÷ 500 − 1)', () => {
    expect(after(HOLD(), 'Your return since purchase')).toBe('+30.00%');
    expect(after(HOLD(), 'The market, same dates')).toBe(pct(560 / 500 - 1));
  });
  test('the account page prints the same figure for it', () => {
    expect(printed(ACC(), 'MK-PF-M-023')).toContain('+30.00%');
  });
});
