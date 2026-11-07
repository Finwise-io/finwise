/** FX-PF, 2026-11-01 — round 4 (common_fx4.md): the lead's rulings R18, R19, R20, and PF4-1, PF4-2, each held on the screen production
 *  shows, every expected figure worked by hand beside it.
 *
 *   R18  a typed-total account's Return is its walk's own, for every record kind, read by ONE function (MK-NW-O-008 thePerformance) on
 *        every caller — the account page, the Performance tab's card and its summary, Home. Coverage: 4 of 4 callers.
 *   R19  a window never starts from a close more than 7 days before it; it says so, naming the close it has.
 *   R20  the 2Y window chip, a yearly rate, says "/year".
 *   PF4-1 the Performance add sheet wears Net worth's frame (v08 frame G): the handle, 10 / 16 / 30.
 *   PF4-2 opening cash prints the cash entered, $5,000, and is said so.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import * as fs from 'fs';
import * as path from 'path';
import { useStore } from '../../store/useStore';
import { builtLines } from '../../testing/mockMatch';
import { EDIT_RECORD_SHEET, SHEET_DAY } from '../../testing/sheetStates';
import { START_CLOSE_DAYS, staleStartClose } from '../../domain/performance';
import { thePerformance, windowStartKey } from '../../../MoneyKeel/functions/networth-and-performance/performance';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true, setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams, useSegments: () => [], useFocusEffect: () => {}, router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 1) }));

beforeEach(() => { jest.useFakeTimers({ now: new Date(`${SHEET_DAY}T12:00:00`), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] }); });
afterEach(() => jest.useRealTimers());
const pick = (w: string) => {
  const b = screen.getAllByRole('button').find((x: any) => String(x.props.accessibilityLabel ?? '').startsWith(`Show ${w}`));
  expect(b).toBeDefined();
  fireEvent.press(b!);
};
const after = (l: string[], t: string, from = 0) => { const i = l.indexOf(t, from); expect(i).toBeGreaterThanOrEqual(0); return l[i + 1]; };
const state = (key: string) => {
  const st: any = EDIT_RECORD_SHEET.states.find((s) => s.key === key)!;
  useStore.getState().resetAll();
  useStore.setState({ onboardingComplete: true, hideBalances: false, ...st.store } as any);
  return st;
};
const pct = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(2)}%`;

// ═══ R18 ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Vanguard Brokerage (edit-record F's household): its total typed at $50,000 with $5,000 cash and 100 VTI ($90 at the Aug 28 close,
// $100 today), $35 of interest to its cash on Sep 5. By hand, 1M: the beginning $50,000 − $1,000 (VTI) − $35 = $48,965; wealth
// generated $1,035; Return 50,000 ÷ 48,965 − 1 = +2.11% — VTI's own +11.11% was printed beside that walk.
describe('R18 · a typed-total account\'s Return is its walk\'s own — one function, every caller (4 of 4)', () => {
  const F = 50_000 / 48_965 - 1;
  test('the account page, 1M: walk $48,965 → $50,000, wealth generated $1,035, interest $35, change in investment value $1,000, Return +2.11%', () => {
    const st = state('F'); mockParams = st.params;
    render(React.createElement(require('../AccountPortfolioScreen').default));
    pick('1 month');
    const l = builtLines(screen.toJSON());
    expect(l).toContain('HOW $48,965 BECAME $50,000 · THIS ACCOUNT');
    expect([after(l, 'Interest'), after(l, 'Change in investment value')]).toEqual(['$35', '$1,000']);
    const sum = l.findIndex((x) => x.startsWith('THIS ACCOUNT ·'));
    expect([after(l, 'Wealth generated', sum), after(l, 'Return', sum)]).toEqual(['$1,035', pct(F)]);
  });
  test('the Performance tab, 1M: Vanguard\'s card and the summary read the same +2.11% (PF4-3: the summary read VTI\'s own)', () => {
    state('F'); mockParams = {};
    render(React.createElement(require('../PerformanceScreen').default));
    pick('1 month');
    const l = builtLines(screen.toJSON());
    const sum = l.findIndex((x) => x.startsWith('SUMMARY ·'));
    expect(after(l, 'Return', sum)).toBe(pct(F));                                      // the Treasury, no price history, left out
    // Vanguard's own card: open (the first of two accounts), its Return under its walk — the holding and category rows keep VTI's own
    const bar = l.indexOf('▾ Vanguard Brokerage');
    expect(bar).toBeGreaterThan(sum);
    expect(after(l, 'Return', bar)).toBe(pct(F));
  });
  test('Home, this month (Sep 1 → Sep 30, its start read on the Aug 28 close): ▲ up $1,035 (2.11%), the walk\'s own', () => {
    state('F'); mockParams = {};
    render(React.createElement(require('../HomeScreen').default));
    const l = builtLines(screen.toJSON());
    expect(l.some((x) => /^▲ up \$1,035 \(2\.11%\) this month$/.test(x) || /up \$1,035, 2\.11 percent this month/.test(x))).toBe(true);
  });
  test('money moved inside the window is split at its day: D, $200 taken out Sep 3 — 49,200 ÷ 49,200 × 50,000 ÷ 49,000 − 1 = +2.04%', () => {
    const st = state('D'); mockParams = st.params;
    render(React.createElement(require('../AccountPortfolioScreen').default));
    pick('1 month');
    const l = builtLines(screen.toJSON());
    expect(after(l, 'Return', l.findIndex((x) => x.startsWith('THIS ACCOUNT ·')))).toBe(pct(49_200 / 49_200 * (50_000 / 49_000) - 1));
  });
  // R19b (2026-11-01): a day inside the window takes its own day's close, however old — $500 put in Sep 15 is valued from VTI's Aug 28
  // close, $90: just before it $50,000 − $1,000 (VTI since) − $500 = $48,500, the beginning; after $49,000; 50,000 ÷ 49,000 − 1 = +2.04%.
  // Until R19b this refused (kept below as test.failing); a refusal stands where shares traded inside the window (fxpf3, NW3-02).
  test('R19b: a deposit valued from the close before its day, inside the window — 48,500 ÷ 48,500 × 50,000 ÷ 49,000 − 1 = +2.04%', () => {
    const st = state('D'); mockParams = st.params;
    const s: any = useStore.getState();
    useStore.setState({ priceCache: { ...s.priceCache, VTI: { ...s.priceCache.VTI, points: s.priceCache.VTI.points.filter((p: any) => p.date !== '2026-09-04') } },
      transactions: [{ id: 'd1', account_id: 'van', source: 'manual', created_at: '', type: 'DEPOSIT', amount: 500, date: '2026-09-15' }] } as any);
    render(React.createElement(require('../AccountPortfolioScreen').default));
    pick('1 month');
    const l = builtLines(screen.toJSON());
    expect(after(l, 'Return', l.findIndex((x) => x.startsWith('THIS ACCOUNT ·')))).toBe(pct(48_500 / 48_500 * (50_000 / 49_000) - 1));
  });
  test.failing('the answer until R19b, kept (no longer the app\'s): the deposit\'s day, 17 days after the last close, refused', () => {
    const st = state('D'); mockParams = st.params;
    const s: any = useStore.getState();
    useStore.setState({ priceCache: { ...s.priceCache, VTI: { ...s.priceCache.VTI, points: s.priceCache.VTI.points.filter((p: any) => p.date !== '2026-09-04') } },
      transactions: [{ id: 'd1', account_id: 'van', source: 'manual', created_at: '', type: 'DEPOSIT', amount: 500, date: '2026-09-15' }] } as any);
    render(React.createElement(require('../AccountPortfolioScreen').default));
    pick('1 month');
    const l = builtLines(screen.toJSON());
    expect(after(l, 'Return', l.findIndex((x) => x.startsWith('THIS ACCOUNT ·')))).toBe('—');
    expect(l).toContain('Money moved in or out on Sep 15, 2026 and no value was recorded that day, so a return cannot be measured across it. The dollar figures here are still right.');
  });
});

// ═══ R19 ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('R19 · a window never starts from a stale price', () => {
  const S = (pts: [string, number][]) => ({ ticker: 'VTI', points: pts.map(([date, close]) => ({ date, close })) });
  test('the one limit is 7 calendar days, written once and held equal where closeAsOf writes it out', () => {
    expect(START_CLOSE_DAYS).toBe(7);
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'domain', 'performance', 'index.ts'), 'utf8');
    const body = src.slice(src.indexOf('function closeAsOf('), src.indexOf('\n}\n', src.indexOf('function closeAsOf(')));
    expect(body).toMatch(/\/ 86_400_000 > 7\) return null;/);
  });
  test('a long weekend counts (Fri close for a Mon start, 3 days); a close 8 days back is no start, and its day is named', () => {
    expect(staleStartClose(S([['2026-08-28', 90]]), '2026-08-31')).toBeNull();
    expect(staleStartClose(S([['2026-08-28', 90]]), '2026-09-04')).toBeNull();       // 7 days: still a start
    expect(staleStartClose(S([['2026-08-28', 90]]), '2026-09-05')).toEqual({ day: '2026-08-28', close: 90 });
  });
  test('NW4-02: 1Y from Sep 29, 2025 with only VTI\'s Aug 1, 2024 close — no Return, and the sentence names that close', () => {
    const T = '2026-09-30';
    const acct = { asset_id: 'van', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 10_000, derive_balance: true,
      positions: [{ position_id: 'v', ticker: 'VTI', label: 'VTI', lots: [{ lot_id: 'l', shares: 100, cost_per_share: 50, purchase_date: '2023-01-02' }] }] };
    const series = S([['2024-08-01', 70], ['2026-09-29', 99], ['2026-09-30', 100]]);
    const { buildPerformance } = require('../../domain/performance');
    const rows = buildPerformance(acct.positions, () => series, '1Y', new Date(`${T}T12:00:00`), () => null, undefined, { transactions: [], accounts: [acct] });
    const f = thePerformance({ windowStart: windowStartKey('1Y', [], T), windowLabel: 'the past year', today: T, holdings: rows, priceOf: () => series as any,
      transactions: [], snapshotDays: [], investmentAccountIds: new Set(['van']), accounts: [acct] });
    expect(f.cumulative).toBeNull();                                                 // 100 ÷ 70 − 1 = +42.86% was printed
    expect(f.notIncluded).toBe('VTI ($10,000) has no price near the window’s start: its last close before it is Aug 1, 2024, so its gains are not included.');
  });
});

// ═══ R20 ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('R20 · the 2Y chip is a yearly rate and says so', () => {
  test('edit-record H\'s account page: 2Y reads "+2.06%/year" — (50,000 ÷ 48,000)^(365 ÷ 731) − 1 — and is said "a year"', () => {
    const st = state('H'); mockParams = st.params;
    render(React.createElement(require('../AccountPortfolioScreen').default));
    const chip = screen.getAllByRole('button').find((x: any) => String(x.props.accessibilityLabel ?? '').startsWith('Show 2 years'))!;
    expect(String(chip.props.accessibilityLabel)).toMatch(/a year/);
    const l = builtLines(screen.toJSON());
    expect(after(l, '2 years')).toBe(`${pct((50_000 / 48_000) ** (365 / 731) - 1)}/year`);
  });
});

// ═══ PF4-1 · PF4-2 ══════════════════════════════════════════════════════════════════════════════════════════════════════
describe('PF4-1 · PF4-2', () => {
  test('PF4-1: the Performance add sheet: a handle 36 × 4, 10 above, 16 at the sides, 30 below, the title 14 above the doors', () => {
    useStore.getState().resetAll(); useStore.setState({ onboardingComplete: true, assetAccounts: [], transactions: [], snapshotDays: [] } as any);
    render(React.createElement(require('../PerformanceScreen').default));
    fireEvent.press(screen.getByLabelText(/^Nothing entered yet\./));
    const head = screen.getAllByText(/./).find((t: any) => StyleSheet.flatten(t.props.style)?.fontSize === 20 && StyleSheet.flatten(t.props.style)?.textAlign === 'center')!;
    expect(StyleSheet.flatten(head.props.style).marginBottom).toBe(14);
    const card: any = head.parent?.parent;
    const st = StyleSheet.flatten(card.props.style);
    expect([st.paddingTop, st.paddingHorizontal, st.paddingBottom, st.borderTopLeftRadius]).toEqual([10, 16, 30, 24]);
    const grab = StyleSheet.flatten(card.props.children[0].props.style);
    expect([grab.width, grab.height, grab.marginBottom]).toEqual([36, 4, 10]);
  });
  test('PF4-2: edit-record H: the opening-cash row prints "$5,000", the cash entered — it printed "$0"', () => {
    const st = state('H'); mockParams = st.params;
    render(React.createElement(require('../AccountPortfolioScreen').default));
    const l = builtLines(screen.toJSON());
    const at = l.indexOf('Opening cash');
    expect(l.slice(at, at + 3)).toEqual(['Opening cash', 'Sep 1 · you entered this', '$5,000']);
  });
});

// ═══ STATE I, 1M AND 1Y, BY HAND (the lead's check of 2026-11-01) ═══════════════════════════════════════════════════════
// Vanguard Brokerage, typed $50,000, 100 VTI listed; 10 sold Sep 8 at $100.00 (no fee). Held when a window began: today's 100 + the 10
// sold since = 110. 1M starts on the Aug 28, 2026 close, $90: 110 × $90 = $9,900; now 100 × $100 + the $1,000 the sale paid = $11,000;
// gained $1,100; beginning $48,900; Return 50,000 ÷ 48,900 − 1 = +2.25%. 1Y starts on the Sep 29, 2025 close, also $90 — the same
// $9,900, so the same +2.25%. In round 3 the year began from the Aug 1, 2024 close of $70, 424 days back (110 × $70 = $7,700; 50,000 ÷
// 46,700 − 1 = +7.07%), which R19 no longer starts from. The summary folds Vanguard as one row and leaves out the Treasury (no price
// history): the same +2.25%. The account page, the tab's card and the tab's summary print it alike.
describe('state I · 1M and 1Y agree on the account page, the tab\'s card and the tab\'s summary (R18, R19)', () => {
  const I = 50_000 / 48_900 - 1;
  test.each([['1 month'], ['1 year']])('%s: +2.25% on all three', (w) => {
    let st = state('I'); mockParams = st.params;
    render(React.createElement(require('../AccountPortfolioScreen').default));
    pick(w);
    let l = builtLines(screen.toJSON());
    expect(l).toContain('HOW $48,900 BECAME $50,000 · THIS ACCOUNT');
    expect(after(l, 'Return', l.findIndex((x) => x.startsWith('THIS ACCOUNT ·')))).toBe(pct(I));
    screen.unmount();
    st = state('I'); mockParams = {};
    render(React.createElement(require('../PerformanceScreen').default));
    pick(w);
    l = builtLines(screen.toJSON());
    const sum = l.findIndex((x) => x.startsWith('SUMMARY ·'));
    expect(after(l, 'Return', sum)).toBe(pct(I));
    expect(after(l, 'Return', l.indexOf('▾ Vanguard Brokerage'))).toBe(pct(I));       // the card prints what the summary prints
    // one true sentence in his shape (DEC-6076): the whole the Return is worked on and its two parts, from the state's own figures —
    // VTI 100 × $100 = $10,000 with a price history; Vanguard's typed $50,000 − $10,000 = $40,000; 10,000 + 40,000 = 50,000
    expect(l).toContain('Return is on the $50,000: $10,000 with a price history and $40,000 of an account whose total was typed, worked back from its records. US Treasury 4.00% 2030 ($9,850) has no price history, so its gains are not included.');
  });
});

// ═══ R19a ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('R19a · a holding priced by hand starts from its last value, however old, and names its day', () => {
  const { valuedByYouWords } = require('../../domain/performance');
  const { dateShown } = require('../../domain/_shared/dates');
  const marks = { ticker: 'FUND', byHand: true, points: [{ date: '2026-04-30', close: 10.412 }, { date: '2026-05-29', close: 10.538 }, { date: '2026-07-31', close: 10.701 }] };
  test('a start on Jun 30 is the May 29 value — never stale, never a value between two of theirs (DEC-0296)', () => {
    expect(staleStartClose(marks as any, '2026-06-30')).toBeNull();
    expect(valuedByYouWords(marks, '2026-06-30', dateShown)).toBe('valued by you on May 29, 2026');
    expect(valuedByYouWords({ ...marks, byHand: undefined }, '2026-06-30', dateShown)).toBeNull();   // a market series says nothing of the kind
  });
});

// ═══ A MONEY DAY WITH A TRADE SINCE (the lead's note on R18, 2026-11-01; account-page v01 row 96) ══════════════════════
describe('a money day after which shares traded: worked back by undoing each trade — refused only where a trade is not on record', () => {
  // a sale with no price and no amount: what VTI made is not known, so his ruling DEC-5068 reads it — the Return is on the holdings with
  // what they made known (here none of VTI's sold part), and the sentence names the sale with no amount; flowTwr is never reached
  test('a sale with no price and no amount after the deposit: the sale is named, as DEC-5068 has it (never a figure for that day)', () => {
    const st = state('D'); mockParams = st.params;
    useStore.setState({ transactions: [
      { id: 'd1', account_id: 'van', source: 'manual', created_at: '', type: 'DEPOSIT', amount: 500, date: '2026-09-15' },
      { id: 's1', account_id: 'van', source: 'manual', created_at: '', type: 'SELL', ticker: 'VTI', shares: 10, date: '2026-09-20' }] } as any);
    render(React.createElement(require('../AccountPortfolioScreen').default));
    pick('1 month');
    const l = builtLines(screen.toJSON());
    expect(l.some((x) => /a sale with no amount in your records/.test(x))).toBe(true);
  });
});

// ═══ PF6-1 · THE HOLDING PAGE UNDER ACTIVITY A, PAST YEAR, WORKED BY HAND (2026-11-02) ══════════════════════════════════
// Apple in Fidelity: bought 100 (Mar 14, 2023, $168) and 40 (Jan 9, 2026, $192.50); 10 sold Sep 15 at $230.00 (no fee), taken off the
// oldest first, as the trade sheet does (the test below) — 90 and 40 today, 130 shares, worth 130 × $241.84 = $31,439. The year starts
// on the Sep 29, 2025 close, $175; held then 130 + 10 − 40 = 100 (DEC-3656, DEC-7221):
//   piece 1, to the evening before the buy (the Dec 31 close, $175): 100 × 175 ÷ 100 × 175 = 1
//   piece 2, from the buy at $192.50 to the evening before the sale (the Aug 28 close, $175): 140 × 175 ÷ (100 × 175 + 40 × 192.50) = 24,500 ÷ 25,200
//   piece 3, the sale day: (130 × 175 + 10 × 230) ÷ (140 × 175) = 25,050 ÷ 24,500
//   piece 4, to today: 241.84 ÷ 175
// = 1.37372 − 1 = +37.37% — the outside working. The page read +37.43% from a fixture holding 140 beside the sale, a state the app
// cannot make (fixed 2026-11-02; activity v02's row of that date); that answer is kept below as test.failing.
describe('PF6-1 · the Holding page under activity A, past year: +37.37%, every piece by hand', () => {
  const open = () => {
    const { ACTIVITY_SHEET } = require('../../testing/sheetStates');
    const st: any = ACTIVITY_SHEET.states.find((s: any) => s.key === 'A');
    useStore.getState().resetAll(); useStore.setState({ onboardingComplete: true, hideBalances: false, ...st.store } as any);
    mockParams = { ...st.params, period: '1Y' };
    render(React.createElement(require('../HoldingDetailScreen').default));
    return builtLines(screen.toJSON());
  };
  test('Your return, past year: 24,500 ÷ 25,200 × 25,050 ÷ 24,500 × 241.84 ÷ 175 − 1 = +37.37%', () => {
    const l = open();
    const exact = 1 * (24_500 / 25_200) * ((130 * 175 + 2_300) / (140 * 175)) * (241.84 / 175) - 1;
    expect(pct(exact)).toBe('+37.37%');
    expect([after(l, 'Quantity'), after(l, 'Current value')]).toEqual(['130 shares', '$31,439']);
    expect(after(l, 'Your return, past year')).toBe(pct(exact));
  });
  test.failing('the answer until 2026-11-02, kept (no longer the app\'s): +37.43%, read from 140 shares held beside the sale', () => {
    expect(after(open(), 'Your return, past year')).toBe('+37.43%');
  });
});

// ═══ NW6-01 · A TRADE WITH NO PRICE ON A TYPED-TOTAL ACCOUNT (2026-11-02; account-page v01's row of that date) ══════════
// Vanguard, $50,000 typed with 100 VTI; 10 more VTI bought Sep 20, saved without a price. What VTI made over 1M cannot be known (the
// 10 began at an unknown cost), so the walk's own change cannot be either: Return '—', and the sentence names the purchase. It read
// +11.11% (VTI's own $90 → $100) beside wealth generated $0.
describe('NW6-01 · a buy saved without its price: Return "—", the purchase named — never VTI\'s own move', () => {
  test('the account page, 1M', () => {
    const st = state('H'); mockParams = st.params;
    const s: any = useStore.getState();
    const accts = s.assetAccounts.map((a: any) => a.asset_id !== 'van' ? a : { ...a, positions: a.positions.map((p: any) => ({ ...p,
      lots: [...p.lots, { lot_id: 'np', shares: 10, purchase_date: '2026-09-20' }] })) });
    useStore.setState({ assetAccounts: accts, transactions: [{ id: 'b1', account_id: 'van', source: 'manual', created_at: '', type: 'BUY', ticker: 'VTI', shares: 10, date: '2026-09-20' }] } as any);
    render(React.createElement(require('../AccountPortfolioScreen').default));
    pick('1 month');
    const l = builtLines(screen.toJSON());
    expect(after(l, 'Return', l.findIndex((x) => x.startsWith('THIS ACCOUNT ·')))).toBe('—');
    expect(l.some((x) => /has a purchase with no price paid on record, so its gains are not included\./.test(x))).toBe(true);
    expect(l.join(' ')).not.toMatch(/Return \+11\.11%/);
  });
});

// ═══ PF6-1 FOLLOW-UP · CAN THE APP PRODUCE ACTIVITY A'S STATE? (2026-11-02) ════════════════════════════════════════════
describe('PF6-1 · a sale recorded through the real trade sheet takes its shares off the holding', () => {
  test('lots of 100 and 40, sell 10 at $230 from the Holding page: the holding reads 130 shares afterwards', () => {
    const { TRADE_SHEET } = require('../../testing/sheetStates');
    const st: any = TRADE_SHEET.states.find((s: any) => s.key === 'L');
    useStore.getState().resetAll(); useStore.setState({ onboardingComplete: true, hideBalances: false, ...st.store } as any);
    mockParams = st.params;
    render(React.createElement(require('../HoldingDetailScreen').default));
    fireEvent.press(screen.getByLabelText('Record a buy or sell for AAPL'));
    fireEvent.press(screen.getByLabelText('Transaction type: Sell'));
    const boxes = screen.getAllByLabelText(/^(Shares|Contracts|Price per share|Amount)$/);
    fireEvent.changeText(boxes[0], '10'); fireEvent.changeText(boxes[1], '230');
    fireEvent.press(screen.getByText('Record sell'));
    const pos = (useStore.getState() as any).assetAccounts.find((a: any) => a.asset_id === 'fid').positions.find((p: any) => p.ticker === 'AAPL');
    const held = pos.lots.reduce((t: number, l: any) => t + Number(l.shares), 0);
    expect(held).toBe(130);
  });
});
