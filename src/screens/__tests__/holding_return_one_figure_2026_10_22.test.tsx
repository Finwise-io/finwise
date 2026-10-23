/** ONE HOLDING, ONE WINDOW, ONE FIGURE — the account page's holding row and the Holding page (2026-10-22, W-HOLDING; tenet 4,
 *  the founder's rule one concept → one function → one number).
 *
 *  The account page's Return beside a holding (MK-PF-M-023) and the Holding page's "Your return" (issued as MK-NW-M-069 on
 *  2026-10-21, now retired into MK-PF-M-023) answer one question. They were two functions: the account page took the holding's
 *  price move over the whole window (periodReturnSince), and the Holding page built its row without the account's earliest
 *  buy of a linked holding. Both now ask holdingRowsIn (holding.ts) — buildPerformance asked one way — and print one
 *  identifier. Every right figure is worked by hand above its test.
 *
 *  Schwab, today 28 Sep 2026; the past year opens 28 Sep 2025, measured from the close of the day before (26 Sep, a Friday):
 *   · VTI, 100 shares since 2023: $250 → $300 = +20.00%. Over 2Y, $240 on 27 Sep 2024 → $300: +25.00% over 731 days,
 *     1.25^(365 ÷ 731) − 1 = +11.79%/year.
 *   · NEW, bought inside the year: 10 at $100 on 2 Mar 2026, 10 more at $110 on 1 Jun (the close the evening before, 29 May,
 *     $110), $121 today. Time-weighted from its purchases (DEC-1669, DEC-4439): 1,100 ÷ 1,000 × 2,420 ÷ (1,100 + 1,100) − 1 =
 *     +21.00%. The account page read its price over the whole year, $80 → $121 = +51.25%.
 *   · LNK, linked, 50 shares on one average-cost purchase with no date; this account's records say it was bought 5 Jan 2026 at
 *     $40, $44 today: +10.00% since then (invest-v3 FINAL). The Holding page read the whole year, $30 → $44 = +46.67%.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { figuresPrinted, resetFiguresPrinted } from '../../components/figure';
import { figureSpec, FIGURE_REGISTER } from '../../../MoneyKeel/functions/figures';
import { holdingRowsIn } from '../../../MoneyKeel/functions/networth-and-performance/holding';
import * as fs from 'fs';

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

const SCREENS: Record<string, () => any> = {
  account: () => require('../AccountPortfolioScreen').default, holding: () => require('../HoldingDetailScreen').default,
};
const KEEP = ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] as const;
/** the figures a screen printed under MK-PF-M-023, in order */
function returnsOn(name: string, params: Record<string, string>, pick?: string): string[] {
  jest.useFakeTimers({ now: new Date('2026-09-28T12:00:00'), doNotFake: [...KEEP] });
  try {
    useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
    useStore.setState({ hideBalances: false, ...H } as any);
    mockParams = params;
    const C = SCREENS[name]();
    const r = render(<C />);
    if (pick) fireEvent.press(screen.getAllByRole('button').find((b) => String(b.props.accessibilityLabel ?? '').startsWith(`Show ${pick}`))!);
    resetFiguresPrinted();
    r.rerender(<C />);
    const out = figuresPrinted().filter((p) => !p.spoken && p.id === 'MK-PF-M-023').map((p) => p.text);
    r.unmount();
    return out;
  } finally { jest.useRealTimers(); }
}

const closes = (pts: [string, number][]) => ({ points: pts.map(([date, close]) => ({ date, close })) });
const VTI = { position_id: 'pv', ticker: 'VTI', label: 'Vanguard Total Market', asset_class: 'stock_etf', unit: 'shares', last_price: 300,
  lots: [{ lot_id: 'v', shares: 100, cost_per_share: 200, purchase_date: '2023-03-15' }] };
const NEW = { position_id: 'pn', ticker: 'NEW', label: 'New Fund', asset_class: 'stock_etf', unit: 'shares', last_price: 121,
  lots: [{ lot_id: 'n1', shares: 10, cost_per_share: 100, purchase_date: '2026-03-02' }, { lot_id: 'n2', shares: 10, cost_per_share: 110, purchase_date: '2026-06-01' }] };
const LNK = { position_id: 'pl', ticker: 'LNK', label: 'Linked Fund', asset_class: 'stock_etf', unit: 'shares', last_price: 44,
  lots: [{ lot_id: 'l', shares: 50, cost_per_share: 40, purchase_date: '' }] };
const ACCOUNT = { asset_id: 'a1', label: 'Schwab Brokerage', institution: 'Schwab', kind: 'brokerage', tax_bucket: 'TAXABLE',
  balance: 30_000 + 2_420 + 2_200, cash_balance: 0, source: 'connected', last_synced: '2026-09-28T08:00:00Z', positions: [VTI, NEW, LNK] };
const day = (date: string, rows: [string, number, number][]) => ({
  date, origin: 'observed', writtenAt: `${date}T00:00:00Z`,
  holdings: rows.map(([k, units, price]) => ({ date, accountId: 'a1', securityKey: k, symbol: k, units, price, value: units * price, currency: 'USD' })),
  accounts: [{ date, accountId: 'a1', currency: 'USD', typedValue: null, cash: 0, statedTotal: rows.reduce((t, h) => t + h[1] * h[2], 0) }],
});
const H = {
  assetAccounts: [ACCOUNT],
  transactions: [{ id: 'b1', txn_id: 'b1', account_id: 'a1', type: 'BUY', ticker: 'LNK', shares: 50, price: 40, amount: 2000, date: '2026-01-05', source: 'connected' }],
  snapshotDays: [day('2024-09-27', [['VTI', 100, 240]]), day('2025-09-26', [['VTI', 100, 250]]), day('2026-09-28', [['VTI', 100, 300], ['NEW', 20, 121], ['LNK', 50, 44]])],
  priceCache: {
    VTI: closes([['2024-09-27', 240], ['2025-09-26', 250], ['2026-09-25', 287.5], ['2026-09-28', 300]]),
    NEW: closes([['2025-09-26', 80], ['2026-03-02', 100], ['2026-05-29', 110], ['2026-06-01', 112], ['2026-09-28', 121]]),
    LNK: closes([['2025-09-26', 30], ['2026-01-02', 40], ['2026-09-28', 44]]),
    SPY: closes([['2024-09-27', 500], ['2025-09-26', 550], ['2026-09-28', 600]]),
  },
  pricesFetchedAt: '2026-09-28T11:00:00Z',
};

describe('one function: holdingRowsIn gives each holding\'s figure', () => {
  test('VTI +20.00%, NEW +21.00% since its purchases, LNK +10.00% since this account first bought it', () => {
    const rows = holdingRowsIn({ account: ACCOUNT as any, positions: [VTI, NEW, LNK] as any, priceOf: (t) => (H.priceCache as any)[t], period: '1Y',
      transactions: H.transactions, now: new Date('2026-09-28T12:00:00') });
    expect(rows.map((r) => r.periodReturn! * 100)).toEqual([expect.closeTo(20, 10), expect.closeTo(21, 10), expect.closeTo(10, 10)]);
    expect(rows.map((r) => r.cappedSince)).toEqual([null, '2026-03-02', '2026-01-05']);
    // a row does not depend on the holdings built beside it
    const alone = holdingRowsIn({ account: ACCOUNT as any, positions: [LNK] as any, priceOf: (t) => (H.priceCache as any)[t], period: '1Y',
      transactions: H.transactions, now: new Date('2026-09-28T12:00:00') })[0];
    expect(alone.periodReturn).toBe(rows[2].periodReturn);
  });
});

describe('the account page and the Holding page print one figure for one holding and one window (MK-PF-M-023)', () => {
  test('the past year: each holding\'s row on its account\'s page is the figure on its own page — +20.00%, +21.00%, +10.00%', () => {
    const acct = returnsOn('account', { id: 'a1', period: '1Y' });
    const own = ['pv', 'pn', 'pl'].map((p) => returnsOn('holding', { account: 'a1', position: p, period: '1Y' }));
    expect(own).toEqual([['+20.00%'], ['+21.00%'], ['+10.00%']]);
    // the guard counts what it saw: three holding rows, none the whole account (the page prints each row's figure where it is
    // drawn and again where it is said, so each appears at least once)
    expect(acct.length).toBeGreaterThanOrEqual(3);
    expect([...new Set(acct)].sort()).toEqual(['+10.00%', '+20.00%', '+21.00%']);
    // never the two old readings: the whole year's price move for NEW on the account page, or for LNK on its own page
    expect([...acct, ...own.flat()]).not.toEqual(expect.arrayContaining(['+51.25%']));
    expect([...acct, ...own.flat()]).not.toEqual(expect.arrayContaining(['+46.67%']));
  });
  test('two years: VTI is the same yearly rate on both pages, +11.79% (+25.00% over 731 days)', () => {
    expect((Math.pow(1.25, 365 / 731) - 1) * 100).toBeCloseTo(11.79, 2);
    const acct = returnsOn('account', { id: 'a1', period: '2Y' });
    const own = returnsOn('holding', { account: 'a1', position: 'pv', period: '2Y' });
    expect(own).toEqual(['+11.79%', '+25.00%', '+11.79%']);   // the row, then the sentence's total and its yearly rate
    expect(acct).toContain('+11.79%');
    expect(acct).not.toContain('+25.00%');
  });
});

describe('one identifier', () => {
  test('MK-PF-M-023 names both pages; MK-NW-M-069 is retired, never reused, and printed nowhere', () => {
    expect(figureSpec('MK-PF-M-023').screens).toEqual(['/account-detail', '/holding-detail']);
    expect(FIGURE_REGISTER['MK-NW-M-069']).toBeUndefined();
    const reg = JSON.parse(fs.readFileSync('Calculation Module code/scripts/moneykeel_metric_register.json', 'utf8'));
    expect(reg.retired['MK-NW-M-069']).toMatch(/MK-PF-M-023/);
    expect(Object.values(reg.issued)).toContain('MK-NW-M-069');   // the number stays issued, so nothing else gets it
    for (const f of ['src/screens/HoldingDetailScreen.tsx', 'src/screens/AccountPortfolioScreen.tsx']) {
      expect(fs.readFileSync(f, 'utf8')).not.toMatch(/'MK-NW-M-069'/);
    }
  });
  test('both screens ask holdingRowsIn and neither calls buildPerformance itself (read from the disk)', () => {
    for (const f of ['src/screens/HoldingDetailScreen.tsx', 'src/screens/AccountPortfolioScreen.tsx']) {
      const src = fs.readFileSync(f, 'utf8');
      expect(src).toMatch(/holdingRowsIn\(\{/);
      expect(src).not.toMatch(/buildPerformance\(/);
    }
  });
});

/* ═══ A SHARE COUNT NOT ON RECORD — the same words on both pages (the lead's ruling of 2026-10-22, tenet 3) ═════════════════
 *  MISS: 10 shares bought at $40 and a second purchase at $45 whose share count was never entered, $50 today, beside VTI. The
 *  Holding page says the count is not on record on Quantity and Current value. The account page read "10 shares" and $500 —
 *  the known purchase alone — and its Stocks / Funds band added that $500 in. Now the shares line says the Holding page's
 *  words, and the value and the band are not stated. */
const MISS = { position_id: 'pm', ticker: 'MISS', label: 'Missing Count Fund', asset_class: 'stock_etf', unit: 'shares', last_price: 50,
  lots: [{ lot_id: 'm1', shares: 10, cost_per_share: 40, purchase_date: '2024-02-01' }, { lot_id: 'm2', shares: null, cost_per_share: 45, purchase_date: '2024-05-01' }] };
function linesOn(name: string, state: any, params: Record<string, string>): string[] {
  jest.useFakeTimers({ now: new Date('2026-09-28T12:00:00'), doNotFake: [...KEEP] });
  try {
    useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
    useStore.setState({ hideBalances: false, ...state } as any);
    mockParams = params;
    const C = SCREENS[name]();
    const r = render(<C />);
    const out: string[] = [];
    const textOf = (n: any): string => (n == null ? '' : typeof n === 'string' ? n : Array.isArray(n) ? n.map(textOf).join('') : (n.children ?? []).map(textOf).join(''));
    const walk = (n: any) => {
      if (n == null || typeof n === 'string') return;
      if (Array.isArray(n)) { n.forEach(walk); return; }
      if (n.type === 'Text') { const t = textOf(n).replace(/\s+/g, ' ').trim(); if (t) out.push(t); return; }
      (n.children ?? []).forEach(walk);
    };
    walk(screen.toJSON());
    r.unmount();
    return out;
  } finally { jest.useRealTimers(); }
}
describe('a share count not on record: the account page says what the Holding page says (the lead\'s ruling, 2026-10-22)', () => {
  const S = { ...H, assetAccounts: [{ ...ACCOUNT, balance: 30_000 + 500, positions: [VTI, MISS] }],
    priceCache: { ...H.priceCache, MISS: closes([['2025-09-26', 45], ['2026-09-28', 50]]) } };
  const NOT = 'Not stated — a purchase has no share count on record.';
  test('the Holding page: Quantity and Current value say the count is not on record', () => {
    const L = linesOn('holding', S, { account: 'a1', position: 'pm', period: '1Y' });
    expect(L[L.indexOf('Quantity') + 1]).toBe(NOT);
    expect(L[L.indexOf('Current value') + 1]).toBe(NOT);
  });
  test('the account page: the same words under the holding\'s name, its value not stated, and its class not stated — never 10 shares or $500', () => {
    const L = linesOn('account', S, { id: 'a1', period: '1Y' });
    const at = L.indexOf('MISS');   // the row is named by its ticker, as the drawing names VOO
    expect(at).toBeGreaterThan(0);
    expect(L.slice(at, at + 3)).toEqual(['MISS', NOT, 'not stated']);
    expect(L).not.toContain('10 shares · $50.00');
    // the Stocks / Funds band: not stated, as its holding is — VTI's $30,000 alone would leave $500 of the account in no row
    expect(L.some((l) => /Stocks \/ Funds$/.test(l) && L[L.indexOf(l) + 1] === 'not stated')).toBe(true);
  });
});
