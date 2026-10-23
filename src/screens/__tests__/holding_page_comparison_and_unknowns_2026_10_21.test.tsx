/** THE HOLDING PAGE — what its market comparison is measured against, what it says when a figure is not on record, and every
 *  percent printed by its identifier (2026-10-21, W-HOLDING; Performance launch audit gaps 4, 5, 6, 9, 10 and 34, the outside
 *  re-run's leftovers MK-NW-M-030#3, 031#3, 034#3, 061#8 and F3, and the day on the price band). Each change is described by a
 *  dated READ THIS FIRST row on holding-detail v02 (2026-10-21).
 *
 *  4.  The band names the yardstick the holding is measured against: the stock market (SPY) for a stock or fund, the bond
 *      market (AGG) for a bond, gold (GLD), bitcoin (BTC) — DEC-0458, DEC-1624, DEC-6614. An Unclassified holding has none
 *      (DEC-2160) and the card says that is why. It said VS THE STOCK MARKET for every holding.
 *  5.  A purchase with no share count: Current value and Quantity say the count is not on record (tenet 3); the purchase line
 *      says so too. They printed their rows' refusals ("No price — …", "All sold — …").
 *  6.  No dividend record names the holding: no Dividends line (the row's own refusal). It printed $0.
 *  9/10. Every percent on the page prints through fig() under MK-NW-M-067, 068, 070, 071 and MK-PF-M-023 (the holding's return,
 *      one figure with the account page's since 2026-10-22; MK-NW-M-069 was retired into it).
 *  34. Over 2Y the two returns are yearly rates, written /year, with each window's own total in the Performance tab's sentence.
 *  061#8. A purchase line carries the holding's own unit: 2 contracts @ $5.00, not 2 sh @ $5.00; shares stay "100 sh".
 *  F3. Prices younger than a month: the coverage line counts days, never "0 months".
 *  Day. The price band never names a day after the person's own today (8 pm in California).
 */
import React from 'react';
import * as fs from 'fs';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import HoldingDetailScreen from '../HoldingDetailScreen';
import { figuresPrinted, resetFiguresPrinted } from '../../components/figure';
import { figureSpec } from '../../../MoneyKeel/functions/figures';
import { BENCHMARK_TICKER, priceHistoryShortSentence } from '../../domain/performance';
import { yardstickName, gapWords, purchaseQuantityWords } from '../../../MoneyKeel/functions/networth-and-performance/holding';
import { isoLocalDate, dateShown } from '../../domain/_shared/dates';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

const KEEP = ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] as const;
const at = (now: Date) => jest.useFakeTimers({ now, doNotFake: [...KEEP] });
afterEach(() => { jest.useRealTimers(); mockParams = {}; });
const series = (ticker: string, pts: [string, number][]) => ({ ticker, points: pts.map(([date, close]) => ({ date, close })) });

// the worked example of the comparison rows (holding.ts COMPARE): VTI $240 (27 Sep 2024) → $250 (26 Sep 2025) → $290 today,
// the stock market (SPY) $500 → $550 → $616, today 28 Sep 2026
const DAYS: [string, number, number][] = [['2024-09-27', 240, 500], ['2025-09-26', 250, 550], ['2026-09-25', 287.69, 610], ['2026-09-28', 290, 616]];
const PRICES = (ticker: string, yard: string) => ({ [ticker]: series(ticker, DAYS.map(([d, a]) => [d, a])), [yard]: series(yard, DAYS.map(([d, , b]) => [d, b])) });
const LOTS = [{ lot_id: 'l1', shares: 100, cost_per_share: 210, purchase_date: '2023-03-15' }, { lot_id: 'l2', shares: 40, cost_per_share: 265, purchase_date: '2023-06-01' }];
const holding = (extra: any) => ({ position_id: 'p1', ticker: 'VTI', label: 'Vanguard Total Market', lots: LOTS, ...extra });
const account = (positions: any[]) => ({ asset_id: 'fid', label: 'Fidelity', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE',
  balance: 0, derive_balance: true, positions });

function open(pos: any, prices: Record<string, any>, transactions: any[] = [], period?: string) {
  mockParams = { account: 'fid', position: pos.position_id, ...(period ? { period } : {}) };
  useStore.getState().resetAll();
  useStore.setState({ onboardingComplete: true, hideBalances: false, assetAccounts: [account([pos])], transactions, priceCache: prices,
    pricesFetchedAt: new Date().toISOString() } as any);
  resetFiguresPrinted();
  render(<HoldingDetailScreen />);
}
/** Every visible line of the rendered screen, in order. */
function lines(): string[] {
  const out: string[] = [];
  const text = (n: any): string => (n == null ? '' : typeof n === 'string' ? n : Array.isArray(n) ? n.map(text).join('') : (n.children ?? []).map(text).join(''));
  const walk = (n: any) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.type === 'Text') { const t = text(n).replace(/\s+/g, ' ').trim(); if (t) out.push(t); return; }
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
}
const after = (label: string, n = 1) => { const L = lines(); const i = L.indexOf(label); return i >= 0 ? L[i + n] : undefined; };
/** the comparison card's lines, from its band to the next card */
const card = () => { const L = lines(); const i = L.findIndex((l) => l.startsWith('VS ')); expect(i).toBeGreaterThan(0); return L.slice(i, L.indexOf('WHAT YOU BOUGHT')); };
const NOON_SEP28 = new Date(2026, 8, 28, 12);

// ═══ 4 · THE YARDSTICK, NAMED ═══════════════════════════════════════════════════════════════════════════════════════
describe('4 · the band names what the holding is compared with', () => {
  test('a stock or fund: VS THE STOCK MARKET · SAME DATES, as drawn — +16.00% beside the stock market +12.00%, ahead by 4.00 points', () => {
    at(NOON_SEP28);
    open(holding({ asset_class: 'stock_etf' }), PRICES('VTI', 'SPY'));
    expect(card()).toEqual(['VS THE STOCK MARKET · SAME DATES', 'Your return, past year', '+16.00%', 'The market, same dates', '+12.00%',
      'You are', 'ahead by 4.00 points', 'both include dividends and interest', 'ⓘ']);
    expect(screen.getByLabelText('Versus the stock market, same dates: your return up 16.00 percent, the market up 12.00 percent, you are ahead by 4.00 points')).toBeOnTheScreen();
  });
  test('a bond (the class the broker sends, or the person\'s): VS THE BOND MARKET · SAME DATES, measured against AGG — never "the stock market"', () => {
    at(NOON_SEP28);
    // the same closes under the bond yardstick: AGG $500 → $550 → $616, so the same +12.00% — and the band says which market
    open(holding({ ticker: 'BND', label: 'Total Bond', asset_class: 'bond' }), PRICES('BND', 'AGG'));
    const c = card();
    expect(c[0]).toBe('VS THE BOND MARKET · SAME DATES');
    expect(c.slice(1, 7)).toEqual(['Your return, past year', '+16.00%', 'The market, same dates', '+12.00%', 'You are', 'ahead by 4.00 points']);
    expect(lines().some((l) => /STOCK MARKET/.test(l))).toBe(false);
    expect(screen.getByLabelText(/^Versus the bond market, same dates: /)).toBeOnTheScreen();
  });
  test('gold and bitcoin are named as themselves', () => {
    at(NOON_SEP28);
    open(holding({ ticker: 'IAU', label: 'Gold trust', kind: 'commodities' }), PRICES('IAU', 'GLD'));
    expect(card()[0]).toBe('VS GOLD · SAME DATES');
    at(NOON_SEP28);
    open(holding({ ticker: 'ETH', label: 'Ether', kind: 'crypto' }), PRICES('ETH', 'BTC'));
    expect(card()[0]).toBe('VS BITCOIN · SAME DATES');
  });
  test('an Unclassified holding has no yardstick: the card says that is why, never "not enough price history"', () => {
    at(NOON_SEP28);
    open(holding({ ticker: 'XYZ', label: 'Something' }), PRICES('XYZ', 'SPY'));
    expect(card()).toEqual(['VS THE MARKET', 'This holding is Unclassified, so there is no market to compare it with.']);
  });
  test('every yardstick the app can pick has its own words — a guard that counts what it looked at', () => {
    const tickers = [...new Set(Object.values(BENCHMARK_TICKER))];
    expect(tickers.length).toBeGreaterThanOrEqual(7);
    for (const t of tickers) expect(yardstickName(t)).not.toBe(t);   // named, never the bare ticker
    expect(yardstickName('SPY')).toBe('the stock market');
    expect(yardstickName('AGG')).toBe('the bond market');
    expect(yardstickName(null)).toBeNull();
  });
});

// ═══ 5 · A SHARE COUNT NOT ON RECORD ════════════════════════════════════════════════════════════════════════════════
describe('5 · a purchase with no share count: every row says the count is not on record (tenet 3)', () => {
  const NOT = 'Not stated — a purchase has no share count on record.';
  test('Current value, Quantity, Price paid (average) and Total paid say one thing; the purchase line says it too', () => {
    at(NOON_SEP28);
    open(holding({ asset_class: 'stock_etf', lots: [{ lot_id: 'x', cost_per_share: 210, purchase_date: '2023-03-15' }] }), PRICES('VTI', 'SPY'));
    expect(after('Current value')).toBe(NOT);
    expect(after('Quantity')).toBe(NOT);
    expect(after('Price paid (average)', 2)).toBe(NOT);
    expect(after('Total paid')).toBe(NOT);
    expect(lines()).toContain('no share count on record @ $210.00');
    // never the rows' refusals, which blamed a missing price under $290.00 and called unentered shares sold
    expect(lines().some((l) => /^No price —|^All sold/.test(l))).toBe(false);
    expect(lines()).not.toContain('Holding liquidated — all shares sold. Its history is kept below.');
  });
  test('with no price as well, the large figure gives the reason at the size of a line', () => {
    at(NOON_SEP28);
    open(holding({ asset_class: 'stock_etf', lots: [{ lot_id: 'x', cost_per_share: 210, purchase_date: '2023-03-15' }] }), {});
    const L = lines();
    expect(L[L.indexOf('NO LIVE PRICE — SHOWING WHAT YOU PAID') + 1]).toBe(NOT);
  });
});

// ═══ 6 · DIVIDENDS ══════════════════════════════════════════════════════════════════════════════════════════════════
describe('6 · Dividends received is drawn only when a dividend record names the holding', () => {
  test('no record: no line — the card keeps Realized from sales', () => {
    at(NOON_SEP28);
    open(holding({ asset_class: 'stock_etf' }), PRICES('VTI', 'SPY'));
    const L = lines();
    expect(L.some((l) => l.startsWith('Dividends received'))).toBe(false);
    expect(after('Realized from sales')).toBe('$0 — nothing sold');
  });
  test('one record naming it, in this account: the line, $420; one older than twelve months: the line at a real $0', () => {
    at(NOON_SEP28);
    open(holding({ asset_class: 'stock_etf' }), PRICES('VTI', 'SPY'), [{ txn_id: 'd1', account_id: 'fid', ticker: 'VTI', type: 'DIVIDEND', amount: 420, date: '2026-06-20' }]);
    expect(after('Dividends received (trailing twelve months)')).toBe('$420');
    at(NOON_SEP28);
    open(holding({ asset_class: 'stock_etf' }), PRICES('VTI', 'SPY'), [{ txn_id: 'd1', account_id: 'fid', ticker: 'VTI', type: 'DIVIDEND', amount: 420, date: '2025-06-20' }]);
    expect(after('Dividends received (trailing twelve months)')).toBe('$0');
  });
});

// ═══ 061#8 · THE PURCHASE LINE'S UNIT ═══════════════════════════════════════════════════════════════════════════════
describe('061#8 · a purchase line carries the holding\'s own unit (DEC-0277)', () => {
  test('shares as drawn ("100 sh"), contracts and coins in full, a missing count said', () => {
    expect(purchaseQuantityWords({ kind: 'stocks_etf' }, 100)).toBe('100 sh');
    expect(purchaseQuantityWords({ kind: 'options' }, 2)).toBe('2 contracts');
    expect(purchaseQuantityWords({ kind: 'options' }, 1)).toBe('1 contract');
    expect(purchaseQuantityWords({ kind: 'crypto' }, 0.5)).toBe('0.5 coins');
    expect(purchaseQuantityWords({ kind: 'commodities' }, 10)).toBe('10 ounces');
    expect(purchaseQuantityWords({ kind: 'stocks_etf' }, null)).toBe('no share count on record');
  });
  test('on screen: an option reads 2 contracts @ $5.00 beside Quantity 2 contracts; shares read 100 sh @ $210.00', () => {
    at(NOON_SEP28);
    open({ position_id: 'o1', ticker: 'AAPL261218C250', kind: 'options', multiplier: 10, lots: [{ lot_id: 'x', shares: 2, cost_per_share: 5, purchase_date: '2026-05-01' }] },
      { AAPL261218C250: series('AAPL261218C250', [['2026-09-25', 7], ['2026-09-28', 8]]) });
    expect(after('Quantity')).toBe('2 contracts');
    expect(lines()).toContain('2 contracts @ $5.00');
    expect(lines()).not.toContain('2 sh @ $5.00');
    at(NOON_SEP28);
    open(holding({ asset_class: 'stock_etf' }), PRICES('VTI', 'SPY'));
    expect(lines()).toEqual(expect.arrayContaining(['100 sh @ $210.00', '40 sh @ $265.00']));
  });
});

// ═══ 9 · 10 · EVERY PERCENT BY ITS IDENTIFIER ═══════════════════════════════════════════════════════════════════════
describe('9 · 10 · every percent on the page is printed by its identifier', () => {
  test('each line with a percent holds a figure printed under MK-NW-M-067, 068, 070 or MK-PF-M-023; the gap is MK-NW-M-071 — and the guard counts what it saw', () => {
    at(NOON_SEP28);
    open(holding({ asset_class: 'stock_etf' }), PRICES('VTI', 'SPY'));
    const printed = figuresPrinted().filter((p) => !p.spoken);
    const pctLines = lines().filter((l) => /\d%/.test(l));
    // the day's move, the change since purchase, your return, the market: four lines at least
    expect(pctLines.length).toBeGreaterThanOrEqual(4);
    for (const l of pctLines) {
      const by = printed.filter((p) => /%$/.test(p.text) && l.includes(p.text));
      expect({ l, ids: by.map((p) => p.id).filter((id) => /^(MK-NW-M-0(67|68|70)|MK-PF-M-023)$/.test(id)).length > 0 }).toEqual({ l, ids: true });
    }
    expect(printed.find((p) => p.id === 'MK-NW-M-067')?.text).toBe('+28.48%');
    expect(printed.find((p) => p.id === 'MK-NW-M-068')?.text).toBe('0.80%');
    expect(printed.find((p) => p.id === 'MK-PF-M-023')?.text).toBe('+16.00%');
    expect(printed.find((p) => p.id === 'MK-NW-M-070')?.text).toBe('+12.00%');
    expect(printed.find((p) => p.id === 'MK-NW-M-071')?.text).toBe('ahead by 4.00 points');
    // the five are declared rows, so the master file and the census see them
    for (const id of ['MK-NW-M-067', 'MK-NW-M-068', 'MK-PF-M-023', 'MK-NW-M-070', 'MK-NW-M-071']) expect(figureSpec(id).screens).toContain('/holding-detail');
  });
  test('the screen keeps no percent formatter of its own (read from the disk)', () => {
    const src = fs.readFileSync('src/screens/HoldingDetailScreen.tsx', 'utf8');
    expect(src).not.toMatch(/\*\s*100\)\.toFixed\(/);
    expect(src).not.toMatch(/const pct\b|pctDigits|pctSaid/);
  });
});

// ═══ 34 · 2Y IS A YEARLY RATE, WITH THE WINDOW'S OWN TOTAL ═════════════════════════════════════════════════════════
describe('34 · over 2Y the returns are yearly rates with /year, and each window\'s own total is said in the Performance tab\'s sentence', () => {
  test('VTI $240 → $290 over the 731 days from 27 Sep 2024: +20.83% in all, +9.91%/year; SPY $500 → $616: +23.20%, +10.98%/year', () => {
    at(NOON_SEP28);
    open(holding({ asset_class: 'stock_etf' }), PRICES('VTI', 'SPY'));
    fireEvent.press(screen.getByLabelText('Show 2Y'));
    expect(card()).toEqual(['VS THE STOCK MARKET · SAME DATES',
      'Your return, past 2 years', '+9.91%/year', 'The market, same dates', '+10.98%/year', 'You are', 'behind by 1.07 points/year',
      'Your return: +20.83% over the two years, which is +9.91%/year — a yearly rate, so it sits fairly beside a one-year window.',
      'The market: +23.20% over the two years, which is +10.98%/year.',   // the one writer's words (2026-10-22): "the same" went
      'both include dividends and interest', 'ⓘ']);
    expect((Math.pow(290 / 240, 365 / 731) - 1) * 100).toBeCloseTo(9.91, 2);
    expect((Math.pow(616 / 500, 365 / 731) - 1) * 100).toBeCloseTo(10.98, 2);
    expect(screen.getByLabelText('Versus the stock market, same dates: your return up 9.91 percent a year, the market up 10.98 percent a year, you are behind by 1.07 points a year')).toBeOnTheScreen();
  });
  test('the sentence is the Performance tab\'s, word for word after its subject (read from both screens on the disk)', () => {
    const perf = fs.readFileSync('src/screens/PerformanceScreen.tsx', 'utf8');
    const mine = fs.readFileSync('src/screens/HoldingDetailScreen.tsx', 'utf8');
    const TAIL = '} — a yearly rate, so it sits fairly beside a one-year window.';   // after the one writer's sentence
    expect(mine).toContain(TAIL);
    // (2026-10-22, PF-A, DEC-0237 · DEC-0404) the Performance tab says the sentence through the one writer it now shares with the
    // account page and every account row (overTheYearsSentence, performance.ts): its total, "over the" years, "which is" the
    // rate with "/year" on screen — then the same tail
    const door = fs.readFileSync('MoneyKeel/functions/networth-and-performance/performance.ts', 'utf8');
    expect(door).toContain("return `${write(f.cumulative)} over the ${yearsWords(f.years)}, which is ${write(f.perYear, 'year')}`;");
    expect(perf).toContain("overTheYearsSentence(f, (v, per) => (per ? `${fig(id, v)}/year` : fig(id, v)))");
    expect(perf).toContain("${yearsShown('MK-PF-M-017', now)} — a yearly rate, so it sits fairly beside a one-year window.");
    // one writer for the sentence on all three screens (overTheYearsSentence, 2026-10-22)
    for (const src of [perf, mine, fs.readFileSync('src/screens/AccountPortfolioScreen.tsx', 'utf8')]) expect(src).toMatch(/overTheYearsSentence\(/);
  });
  test('a year or less is never written per year', () => {
    at(NOON_SEP28);
    open(holding({ asset_class: 'stock_etf' }), PRICES('VTI', 'SPY'));
    expect(card().some((l) => l.includes('/year'))).toBe(false);
    expect(gapWords(0.04)).toBe('ahead by 4.00 points');
    expect(gapWords(-0.0107, true)).toBe('behind by 1.07 points/year');
    expect(gapWords(null)).toBeNull();
  });
});

// ═══ F3 · UNDER A MONTH, THE DAYS ═══════════════════════════════════════════════════════════════════════════════════
describe('F3 · prices younger than a month are counted in days', () => {
  test('three days of prices: "go back 3 days … covers 3 days"; one day: "1 day"; prices from today: "begin today"', () => {
    const pts = (days: string[]) => days.map((date) => ({ date }));
    expect(priceHistoryShortSentence(pts(['2026-09-25', '2026-09-28']), '2025-09-28', '1Y', '2026-09-28'))
      .toBe('Prices for this holding go back 3 days, so the 1-year figure covers 3 days — not a year.');
    expect(priceHistoryShortSentence(pts(['2026-09-27', '2026-09-28']), '2026-08-28', '1M', '2026-09-28'))
      .toBe('Prices for this holding go back 1 day, so the 1-month figure covers 1 day — not a month.');
    expect(priceHistoryShortSentence(pts(['2026-09-28']), '2025-09-28', '1Y', '2026-09-28'))
      .toBe('Prices for this holding begin today, so the 1-year figure covers today only — not a year.');
    // a month or more keeps the approved words (DEC-4641)
    expect(priceHistoryShortSentence(pts(['2025-07-20', '2026-09-28']), '2024-09-28', '2Y', '2026-09-28'))
      .toBe('Prices for this holding go back 14 months, so the 2-year figure covers 14 months — not two years.');
  });
});

// ═══ THE DAY ON THE PRICE BAND ═════════════════════════════════════════════════════════════════════════════════════
describe('the price band never names a day after the person\'s own today', () => {
  test('8 pm in California on 21 Oct: the feed has dated a coin\'s latest price 22 Oct (London\'s day); the band reads the person\'s today', () => {
    const eightPmCalifornia = new Date(Date.UTC(2026, 9, 22, 3, 0));   // 21 Oct 2026, 20:00 in Los Angeles
    at(eightPmCalifornia);
    const coin = { position_id: 'c1', ticker: 'BTC', label: 'Bitcoin', kind: 'crypto', lots: [{ lot_id: 'b', shares: 0.5, cost_per_share: 56000, purchase_date: '2024-07-02' }] };
    open(coin, { BTC: series('BTC', [['2026-10-20', 100000], ['2026-10-21', 101000], ['2026-10-22', 101500]]) });
    const today = isoLocalDate(new Date());
    const band = lines().find((l) => l.startsWith('LAST CLOSE'))!;
    expect(band).toBe(`LAST CLOSE · ${dateShown(today < '2026-10-22' ? today : '2026-10-22').toUpperCase()}`);
    if (Intl.DateTimeFormat().resolvedOptions().timeZone === 'America/Los_Angeles') expect(band).toBe('LAST CLOSE · OCT 21, 2026');
    // the price is the latest one, taken that evening
    expect(lines()).toContain('$101,500.00');
  });
});
