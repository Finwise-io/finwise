/** THE PERFORMANCE TAB, HEARD AND CROSS-CHECKED — W-A11Y, the Performance launch audit of 2026-10-21, rows 28 to 33.
 *
 *  A · what VoiceOver says (rows 28 and 29). Every figure the tab prints also has a spoken form, written by the one spoken
 *      writer (figSaid): "−$" for money that went out, a percent, "a year" on a yearly rate, "hidden" under hide-balances.
 *      The value line says the window, where it starts and ends, and the change. The reading below walks the rendered
 *      screen the way VoiceOver does: an element marked accessible is read as its label and its children are not read;
 *      any other text is read as it stands.
 *  B · the recorder's spoken names (row 30): "Record interest", "Record a withdrawal", "Record a coupon" — the record's own
 *      name with the one article rule.
 *  C · one household, three screens (row 32): every Performance figure printed on two or more screens — MK-PF-M-001, 004,
 *      013, 015, 016, 021 and 022 — reads the same on each of them, through the real screens.
 *  D · Net worth's Investments line and Performance's Ending value (row 33), Since window, one household.
 */
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { useStore } from '../../store/useStore';
import { figuresPrinted, resetFiguresPrinted } from '../../components/figure';
import { figureSpec } from '../../../MoneyKeel/functions/figures';

let mockParams: Record<string, string | undefined> = {};
const mockPushes: string[] = [];
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: (r: string) => mockPushes.push(r), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

// ── reading a screen ────────────────────────────────────────────────────────────────────────────────────────────────
const flat = (st: any) => (StyleSheet.flatten(st) ?? {}) as any;
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
const textOf = (n: any, tt?: string): string => {
  if (n == null) return '';
  if (typeof n === 'string') return tt === 'uppercase' ? n.toUpperCase() : n;
  if (Array.isArray(n)) return n.map((c) => textOf(c, tt)).join('');
  const t2 = flat(n.props?.style).textTransform ?? tt;
  return (n.children ?? []).map((c: any) => textOf(c, t2)).join('');
};
/** Every Text in order, as a person reads the screen. */
function readLines(): string[] {
  const out: string[] = [];
  const walk = (n: any) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.type === 'Text') { const t = norm(textOf(n)); if (t) out.push(t); return; }
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
}
/** WHAT VOICEOVER SAYS, element by element: an accessible element is its label (or, with none, its text) and its children
 *  are not read separately; a Text outside one is its label if it has one, else its text. Hidden subtrees are skipped. */
function heard(): string[] {
  const out: string[] = [];
  const walk = (n: any) => {
    if (n == null) return;
    if (typeof n === 'string') { const t = norm(n); if (t) out.push(t); return; }
    if (Array.isArray(n)) { n.forEach(walk); return; }
    const p = n.props ?? {};
    if (p.accessibilityElementsHidden || p.importantForAccessibility === 'no-hide-descendants') return;
    if (p.accessible || n.type === 'Text') {
      const said = norm(p.accessibilityLabel ? String(p.accessibilityLabel) : textOf(n));
      if (said) out.push(said);
      return;
    }
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
}
const SCREENS: Record<string, () => any> = {
  invest: () => require('../PerformanceScreen').default, account: () => require('../AccountPortfolioScreen').default,
  home: () => require('../HomeScreen').default, networth: () => require('../NetWorthScreen').default,
};
type Shot = { printed: { id: string; text: string; spoken: boolean }[]; lines: string[]; heard: string[] };
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
    // what the screen prints and says in the state the person left it in — not what the first render printed
    resetFiguresPrinted();
    r.rerender(<C />);
    const shot = { printed: figuresPrinted().map((p) => ({ id: p.id, text: p.text, spoken: p.spoken })), lines: readLines(), heard: heard() };
    screen.unmount();
    return shot;
  } finally { jest.useRealTimers(); }
}
const pick = (label: string) => (s: typeof screen) => {
  const btn = s.getAllByRole('button').find((b) => String(b.props.accessibilityLabel ?? '').startsWith(`Show ${label}`));
  if (!btn) throw new Error(`no window ${label}`);
  fireEvent.press(btn);
};
const once = (f: () => Shot) => { let v: Shot | null = null; return () => (v ??= f()); };
const shown = (sh: Shot, id: string) => sh.printed.filter((p) => p.id === id && !p.spoken).map((p) => p.text);
const closes = (pts: [string, number][]) => ({ points: pts.map(([date, close]) => ({ date, close })) });
const day = (date: string, accountId: string, holdings: [string, number, number][], cash: number) => ({
  date, origin: 'observed', writtenAt: `${date}T00:00:00Z`,
  holdings: holdings.map(([k, units, price]) => ({ date, accountId, securityKey: k, symbol: k, units, price, value: units * price, currency: 'USD' })),
  accounts: [{ date, accountId, currency: 'USD', typedValue: null, cash, statedTotal: holdings.reduce((t, h) => t + h[1] * h[2], 0) + cash }],
});
const linkedDay = (id: string, date: string, total: number) => ({
  date, origin: 'observed', writtenAt: `${date}T00:00:00Z`, holdings: [],
  accounts: [{ date, accountId: id, cash: 0, statedTotal: total, currency: 'USD' }],
});
const txn = (id: string, account_id: string, type: string, amount: number, date: string, extra: any = {}) => ({ id, txn_id: id, account_id, type, amount, date, source: 'connected', ...extra });

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// A · THE PERFORMANCE TAB, HEARD. Fidelity: $30,000 on 31 Dec 2025 (100 VTI at $260 + $4,000 cash), $6,000 paid in on
// 1 Apr, an $825 dividend on 20 Jun, worth $46,600 on 28 Sep (100 VTI at $357.75 + $10,825 cash).
// Worked by hand: Wealth generated $46,600 − $30,000 − $6,000 = $10,600; of it $825 dividends, $9,775 change in value.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const FIDELITY = { asset_id: 'a2', label: 'Fidelity Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE',
  balance: 100 * 357.75 + 10_825, cash_balance: 10_825, source: 'connected', last_synced: '2026-09-28T08:00:00Z', target_return: 0.07,
  positions: [{ position_id: 'p1', ticker: 'VTI', asset_class: 'stock_etf', last_price: 357.75, lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 210, purchase_date: '2023-03-15' }] }] };
const H_PERF = {
  assetAccounts: [FIDELITY],
  transactions: [txn('c1', 'a2', 'DEPOSIT', 6000, '2026-04-01'), txn('d1', 'a2', 'DIVIDEND', 825, '2026-06-20', { ticker: 'VTI' })],
  snapshotDays: [day('2025-12-31', 'a2', [['VTI', 100, 260]], 4000), day('2026-04-01', 'a2', [['VTI', 100, 284]], 10_000), day('2026-09-28', 'a2', [['VTI', 100, 357.75]], 10_825)],
  priceCache: { VTI: closes([['2025-12-30', 260], ['2025-12-31', 260], ['2026-04-01', 284], ['2026-09-25', 357.75], ['2026-09-28', 357.75]]) },
  pricesFetchedAt: '2026-09-28T11:00:00Z',
};
// The two-year household: VTI $100 → $121 over 731 days, nothing moved — +21.00% in the window, +9.99% a year.
const VTI2 = { position_id: 'pv', ticker: 'VTI', label: 'Vanguard Total Market', asset_class: 'stock_etf', kind: 'stocks_etf', unit: 'shares', last_price: 121,
  lots: [{ lot_id: 'v1', shares: 1000, cost_per_share: 80, purchase_date: '2023-03-15' }] };
const H_TWO = {
  assetAccounts: [{ asset_id: 'a1', label: 'Schwab Brokerage', institution: 'Schwab', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 121_000, cash_balance: 0,
    source: 'connected', last_synced: '2026-10-13T08:00:00Z', positions: [VTI2] }],
  transactions: [],
  snapshotDays: [day('2024-10-12', 'a1', [['VTI', 1000, 100]], 0), day('2025-10-12', 'a1', [['VTI', 1000, 110]], 0), day('2026-10-12', 'a1', [['VTI', 1000, 121]], 0)],
  priceCache: { VTI: closes([['2024-10-11', 100], ['2024-10-12', 100], ['2025-10-12', 110], ['2026-10-12', 121], ['2026-10-13', 121]]),
    SPY: closes([['2024-10-12', 500], ['2026-10-13', 550]]) },
  pricesFetchedAt: '2026-10-13T11:00:00Z',
};

describe('A · rows 28 and 29 — every figure on the Performance tab has a spoken form, and the line is described', () => {
  const SINCE = once(() => shoot('invest', H_PERF, '2026-09-28'));
  const HIDDEN = once(() => shoot('invest', { ...H_PERF, hideBalances: true }, '2026-09-28'));
  const TWO_Y = once(() => shoot('invest', H_TWO, '2026-10-13', {}, pick('2Y')));

  test('every figure printed on the tab is also said, under the same identifier, through the one spoken writer', () => {
    for (const sh of [SINCE(), TWO_Y()]) {
      const visible = new Set(sh.printed.filter((p) => !p.spoken && figureSpec(p.id).unit !== 'words').map((p) => p.id));
      const said = new Set(sh.printed.filter((p) => p.spoken).map((p) => p.id));
      // a guard must prove it looked: the tab prints at least these, in the Since state
      expect(visible.size).toBeGreaterThanOrEqual(8);
      expect([...visible].filter((id) => !said.has(id))).toEqual([]);
    }
    // the identifiers the Since state prints and says, read off the render (2026-10-21)
    expect([...new Set(SINCE().printed.filter((p) => p.spoken).map((p) => p.id))].sort()).toEqual(expect.arrayContaining(
      ['MK-PF-M-001', 'MK-PF-M-002', 'MK-PF-M-005', 'MK-PF-M-006', 'MK-PF-M-007', 'MK-PF-M-014', 'MK-PF-M-016', 'MK-PF-M-017', 'MK-PF-M-018', 'MK-PF-M-019']));
  });

  test('what VoiceOver says for the summary, the walk and the totals — each line with its figure, worked by hand', () => {
    const h = SINCE().heard;
    expect(h).toContain('Ending value, $46,600');
    expect(h).toContain('Wealth generated, $10,600');
    expect(h.find((l) => l.startsWith('Return, '))).toMatch(/^Return, [+−]\d+\.\d\d%$/);
    expect(h).toContain('How $30,000 became $46,600, all accounts');
    for (const l of ['Contributions, $6,000', 'Withdrawals, $0', 'Dividends, $825', 'Interest, $0', 'Change in investment value, $9,775']) expect(h).toContain(l);
    expect(h.find((l) => l.startsWith('Beginning market value ('))).toMatch(/^Beginning market value \(.+\), \$30,000$/);
    expect(h.find((l) => l.startsWith('Ending market value ('))).toMatch(/^Ending market value \(Sep 28, 2026\), \$46,600$/);
    expect(h).toContain('All categories, earned $825');
    // the one account, closed: its source, what it made and its return, with each figure said
    expect(h.find((l) => /, wealth generated \$10,600, return [+−]\d+\.\d\d%$/.test(l))).toBeTruthy();
  });

  test('row 28 — the value line says its window, where it starts and ends, and the change, from the figures printed beside it', () => {
    const line = SINCE().heard.find((l) => l.startsWith('Value of your investments'));
    expect(line).toMatch(/^Value of your investments since .+: \$30,000 on .+, up to \$46,600 on Sep 28, 2026, a return of [+−]\d+\.\d\d%\.$/);
    // the return it names is the Return the summary prints
    const ret = SINCE().heard.find((l) => l.startsWith('Return, '))!.replace('Return, ', '');
    expect(line!.endsWith(`a return of ${ret}.`)).toBe(true);
  });

  test('nothing is read as "/year" or "/month", and under hide-balances every amount is "hidden", never the dots', () => {
    for (const sh of [SINCE(), TWO_Y(), HIDDEN()]) {
      // a figure is never heard with "/year" after it (a note that names the notation, "a /year figure is …", is words)
      expect(sh.heard.filter((l) => /\d%?\/(year|month)\b/.test(l))).toEqual([]);
    }
    const h = HIDDEN().heard;
    expect(h.filter((l) => l.includes('•'))).toEqual([]);
    expect(h).toContain('Ending value, hidden');
    expect(h).toContain('How hidden became hidden, all accounts');
    expect(h).toContain('Contributions, hidden');
    expect(h.find((l) => l.startsWith('Value of your investments'))).toMatch(/: hidden on .+, up to hidden on Sep 28, 2026, a return of [+−]\d+\.\d\d%\.$/);
    // no dollar figure is heard under the eye
    expect(h.filter((l) => /\$\d/.test(l))).toEqual([]);
  });

  test('a window longer than a year: the trio, the sentence, the window button and the line say "a year" on the yearly rate', () => {
    const h = TWO_Y().heard;
    expect(h).toContain('Return, +9.99% a year');
    expect(h.find((l) => l.startsWith('+21.00% over the'))).toBe('+21.00% over the two years, which is +9.99% a year — a yearly rate, so it sits fairly beside a one-year window.');
    expect(h.find((l) => l.startsWith('Show 2Y'))).toBe('Show 2Y, +9.99% a year');
    expect(h.find((l) => l.startsWith('Value of your investments'))).toMatch(/a return of \+9\.99% a year\.$/);
    // what is printed is unchanged: the window's total and its yearly rate with "/year" (his ruling of 2026-09-25)
    expect(TWO_Y().lines.some((l) => l.startsWith('+21.00% over the two years, which is +9.99%/year'))).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// B · ROW 30 — THE RECORDER'S SPOKEN NAMES. A linked Treasury held as its own account: its income door offers interest
// and coupons. Each is said by the record's own name, with the one article rule.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('B · row 30 — "Record interest", never "Record a interest"', () => {
  test('a brokerage: Record a dividend, Record interest; money in and out: Record a deposit, a withdrawal, a transfer', () => {
    jest.useFakeTimers({ now: new Date('2026-09-28T12:00:00'), doNotFake: [...FAKE] });
    try {
      useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
      useStore.setState({ hideBalances: false, ...H_PERF, assetAccounts: [FIDELITY, { asset_id: 's', label: 'Ally Savings', kind: 'savings', tax_bucket: 'CASH', balance: 8000 }] } as any);
      mockParams = { id: 'a2' };
      const C = SCREENS.account();
      render(<C />);
      fireEvent.press(screen.getByLabelText('Add a dividend or interest for Fidelity Brokerage'));
      const income = screen.getAllByRole('button').map((b) => String(b.props.accessibilityLabel ?? '')).filter((l) => l.startsWith('Record '));
      expect(income).toEqual(expect.arrayContaining(['Record a dividend for Fidelity Brokerage', 'Record interest for Fidelity Brokerage']));
      expect(income.filter((l) => /Record a interest|Record a coupon received/.test(l))).toEqual([]);
      screen.unmount();
      render(<C />);
      fireEvent.press(screen.getByLabelText('Add a contribution or withdrawal for Fidelity Brokerage'));
      const money = screen.getAllByRole('button').map((b) => String(b.props.accessibilityLabel ?? '')).filter((l) => l.startsWith('Record '));
      expect(money).toEqual(['Record a deposit for Fidelity Brokerage', 'Record a withdrawal for Fidelity Brokerage', 'Record a transfer for Fidelity Brokerage']);
      screen.unmount();
    } finally { jest.useRealTimers(); }
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// C · ROW 32 — ONE HOUSEHOLD, THREE SCREENS, THE PAST MONTH. Fidelity, linked today (the account-page drawing's state D):
// 128 VTI at $312.50 = $40,000 with a price history ($305.00 on Aug 29), Treasury 2031 $10,000 typed with none, $2,000
// of cash. The record holds today only, so the month is worked back from VTI's prices.
// Worked by hand: the return is on VTI's $40,000; Treasury 2031 ($10,000) is left out; Home, the Performance tab and the
// account page each print that sentence. VTI's month: $312.50 ÷ $305.00 − 1 = +2.46%.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const TODAY_C = '2026-09-30';
const FID = {
  asset_id: 'fid', label: 'Fidelity Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE',
  balance: 52_000, cash_balance: 2_000, source: 'connected', last_synced: `${TODAY_C}T08:00:00Z`,
  positions: [
    { position_id: 'vti', ticker: 'VTI', asset_class: 'stock_etf', last_price: 312.5, lots: [{ lot_id: 't1', shares: 128, cost_per_share: 250 }] },
    { position_id: 't31', ticker: '912810TM0', name: 'Treasury 2031', label: 'Treasury 2031', asset_class: 'bond', last_price: 100,
      face_value: 10_000, maturity_date: '2031-11-15', lots: [{ lot_id: 't2', shares: 100 }] },
  ],
};
const H_LEFT = {
  assetAccounts: [FID, { asset_id: 's', label: 'Ally Savings', kind: 'savings', tax_bucket: 'CASH', balance: 8000 }],
  transactions: [], snapshotDays: [linkedDay('fid', TODAY_C, 52_000)],
  priceCache: { VTI: closes([['2024-09-29', 250], ['2025-09-29', 312.5 / 1.1], ['2025-12-31', 295], ['2026-08-29', 305], ['2026-09-30', 312.5]]) },
  pricesFetchedAt: `${TODAY_C}T11:00:00Z`,
};
const openCard = (s: typeof screen) => {
  pick('1M')(s);
  // a lone account's card opens with a tap on its bar, so its walk prints (v17 phone 3)
  const bar = s.getAllByRole('button').find((b) => /^Fidelity Brokerage, .*Expands its walk\.$/.test(String(b.props.accessibilityLabel ?? '')));
  if (bar) fireEvent.press(bar);
};
const LEFT_SENTENCE = /Return is on the (\$[\d,]+) with a price history\. Treasury 2031 \((\$[\d,]+)\) has no price history/;

describe('C · row 32 — every Performance figure printed on two or more screens reads the same on each', () => {
  const HOME = once(() => shoot('home', H_LEFT, TODAY_C));
  const INV = once(() => shoot('invest', H_LEFT, TODAY_C, {}, openCard));
  const ACC = once(() => shoot('account', H_LEFT, TODAY_C, { id: 'fid', period: '1M' }));
  const sentence = (sh: Shot) => sh.lines.map((l) => l.match(LEFT_SENTENCE)).filter(Boolean) as RegExpMatchArray[];

  test('MK-PF-M-021 and MK-PF-M-022 — Home, the Performance tab and the account page say the return is on $40,000 and leave out Treasury 2031 ($10,000)', () => {
    for (const sh of [HOME(), INV(), ACC()]) {
      const found = sentence(sh);
      expect(found.length).toBeGreaterThanOrEqual(1);
      for (const m of found) { expect(m[1]).toBe('$40,000'); expect(m[2]).toBe('$10,000'); }
    }
  });

  test('MK-PF-M-001 — the Performance tab\'s month Ending value is the base Home names for its month ($52,000, the account whole)', () => {
    expect(shown(INV(), 'MK-PF-M-001')[0]).toBe('$52,000');
    expect(HOME().lines).toContain("This month's change is on $52,000: your investment accounts with the cash in them.");
  });

  test('MK-PF-M-004, 013, 015 and 016 — the account\'s walk and return on its Performance card are its own page\'s, line for line', () => {
    const inv = INV(), acc = ACC();
    expect(shown(inv, 'MK-PF-M-004')).not.toEqual([]);
    expect(shown(inv, 'MK-PF-M-004').slice(-1)).toEqual(shown(acc, 'MK-PF-M-004').slice(-1));
    expect(shown(inv, 'MK-PF-M-013')).not.toEqual([]);
    expect(shown(inv, 'MK-PF-M-013')[0]).toBe(shown(acc, 'MK-PF-M-013')[0]);
    expect(shown(inv, 'MK-PF-M-015').slice(0, 5)).toEqual(shown(acc, 'MK-PF-M-015').slice(0, 5));
    expect(shown(inv, 'MK-PF-M-016')[0]).toBe(shown(acc, 'MK-PF-M-016')[0]);
    // one account is every account: the card's figures are the tab's own totals
    expect(shown(inv, 'MK-PF-M-004').slice(-1)[0]).toBe(shown(inv, 'MK-PF-M-001')[0]);
    expect(shown(inv, 'MK-PF-M-016')[0]).toBe(shown(inv, 'MK-PF-M-017')[0]);
  });

  test('the seven figures the register lists on two or more screens are the seven this file holds', () => {
    const { FIGURE_REGISTER } = require('../../../MoneyKeel/functions/figures');
    const many = Object.entries(FIGURE_REGISTER as Record<string, any>).filter(([id, f]) => id.startsWith('MK-PF-M-') && f.screens.length >= 2).map(([id]) => id).sort();
    // MK-PF-M-023 joined on 2026-10-22, when W-HOLDING made the Holding page's "Your return" and the account page's holding
    // row one figure: held by the test below
    // MK-PF-M-002 joined the same day: Home's month dollars are the 1M Wealth generated (held below and by pfb section 4)
    expect(many).toEqual(['MK-PF-M-001', 'MK-PF-M-002', 'MK-PF-M-004', 'MK-PF-M-013', 'MK-PF-M-015', 'MK-PF-M-016', 'MK-PF-M-021', 'MK-PF-M-022', 'MK-PF-M-023']);
  });

  test('MK-PF-M-002 — Home\'s month dollars are the Performance tab\'s 1M Wealth generated: $46,600 − $38,400 = $8,200 (H_PERF)', () => {
    const home = shoot('home', H_PERF, '2026-09-28');
    const inv = shoot('invest', H_PERF, '2026-09-28', {}, pick('1M'));
    expect(shown(home, 'MK-PF-M-002')).toEqual(['$8,200']);
    expect(shown(inv, 'MK-PF-M-002')[0]).toBe('$8,200');
  });

  test('MK-PF-M-023 — VTI\'s month on its row of the account page is its month on its own page: $312.50 ÷ $305.00 − 1 = +2.46%', () => {
    SCREENS.holding = () => require('../HoldingDetailScreen').default;
    const withMarket = { ...H_LEFT, priceCache: { ...H_LEFT.priceCache, SPY: closes([['2026-08-29', 500], ['2026-09-30', 510]]) } };
    const acc = shoot('account', withMarket, TODAY_C, { id: 'fid', period: '1M' });
    const hold = shoot('holding', withMarket, TODAY_C, { account: 'fid', position: 'vti', period: '1M' });
    expect(shown(acc, 'MK-PF-M-023')).toContain('+2.46%');
    expect(shown(hold, 'MK-PF-M-023')[0]).toBe('+2.46%');
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// D · ROW 33 — NET WORTH'S INVESTMENTS LINE AND PERFORMANCE'S ENDING VALUE, SINCE, ONE HOUSEHOLD.
// They are one figure where no cash sits in an investment account. Where it does, Net worth shows that cash on its Cash
// line (DEC-0457) and Performance counts the account whole (Q-PF-1, DEC-7222), so Investments + that cash = Ending value.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const investmentsLine = (sh: Shot) => {
  const i = sh.lines.findIndex((l) => /^▾ 📈 Investments$/i.test(l));
  return i >= 0 ? sh.lines[i + 1] : undefined;
};
const cashLine = (sh: Shot) => {
  const i = sh.lines.findIndex((l) => /^▾ 💵 Cash$/i.test(l));
  return i >= 0 ? sh.lines[i + 1] : undefined;
};
const dollars = (s: string | undefined) => (s == null ? NaN : Number(s.replace('−', '-').replace(/[^0-9.\-]/g, '')));

describe('D · row 33 — Net worth\'s Investments line and Performance\'s Ending value (Since)', () => {
  test('no cash inside an investment account: one figure, $121,000 on both', () => {
    const nw = shoot('networth', { ...H_TWO, nwSeeded: true, nwSetupChoice: 'self' }, '2026-10-13');
    const inv = shoot('invest', H_TWO, '2026-10-13');
    expect(investmentsLine(nw)).toBe('$121,000');
    expect(shown(inv, 'MK-PF-M-001')[0]).toBe('$121,000');
  });
  test('$2,000 of cash in the brokerage: Investments $50,000 + that $2,000 on the Cash line = Ending value $52,000', () => {
    const state = { ...H_LEFT, nwSeeded: true, nwSetupChoice: 'self' };
    const nw = shoot('networth', state, TODAY_C);
    const inv = shoot('invest', H_LEFT, TODAY_C);
    expect(investmentsLine(nw)).toBe('$50,000');
    expect(cashLine(nw)).toBe('$10,000');                       // Ally $8,000 + the brokerage's $2,000
    expect(shown(inv, 'MK-PF-M-001')[0]).toBe('$52,000');
    expect(dollars(investmentsLine(nw)) + 2_000).toBe(dollars(shown(inv, 'MK-PF-M-001')[0]));
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// A (continued) · THE SHEETS THIS FILE HOLDS, opened from the Holding page and the account page: each record of the
// history is said as one thing with its price, and its amount with its sign — "plus $500", "−$500" (said "minus") — through the
// one spoken writer; under hide-balances, "hidden".
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('A · row 29 — the history sheet says each record and its amount', () => {
  const ACCTS = [{ asset_id: 'a2', label: 'Fidelity Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 10_000 }];
  const TXNS = [
    { id: 't1', account_id: 'a2', type: 'DEPOSIT', amount: 500, date: '2026-08-02', source: 'manual' },
    { id: 't2', account_id: 'a2', type: 'BUY', ticker: 'VTI', shares: 2, price: 250.1, amount: 500.2, date: '2026-08-03', source: 'manual' },
  ];
  const sayHistory = (hide: boolean) => {
    useStore.getState().resetAll(); useStore.setState({ hideBalances: hide } as any);
    const { HistorySheet } = require('../PerformanceScreen');
    render(<HistorySheet open transactions={TXNS as any} accounts={ACCTS as any} onClose={() => {}} onDelete={() => true} />);
    const h = heard(); screen.unmount(); return h;
  };
  test('a deposit and a buy: the record, its day, and its amount with the sign said in words', () => {
    const h = sayHistory(false);
    expect(h).toContain('Deposit, Fidelity, Aug 2, 2026');
    expect(h).toContain('plus $500');
    expect(h).toContain('Buy, VTI, 2 shares at $250.10, Aug 3, 2026');
    expect(h).toContain('−$500');
  });
  test('under hide-balances: "hidden", never the dots', () => {
    const h = sayHistory(true);
    expect(h.filter((l) => l.includes('•'))).toEqual([]);
    expect(h).toContain('plus hidden');
    expect(h).toContain('Buy, VTI, 2 shares at hidden, Aug 3, 2026');
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E · THE SAME CLASS ON THE ACCOUNT PAGE AND THE HOLDING PAGE (2026-10-22, the lead's follow-up). Nothing a screen reader
// hears is "4.00%/year", "~8.20%", "→", "＋", an ISO date or the dots of a hidden balance: a line of figures is said through
// saidSentence (figure.ts, beside figSaid), so "a year", "about", "to", "plus", "Sep 26, 2026" and "hidden".
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const SYMBOLS = (l: string) => /\d%?\/(year|month)|•|~|→|＋|\d{4}-\d{2}-\d{2}/.test(l);
const VAN_E = { asset_id: 'van', label: 'Vanguard Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 101_000, cash_balance: 2_000,
  source: 'connected', last_synced: `${TODAY_C}T08:00:00Z`,
  positions: [{ position_id: 'voo', ticker: 'VOO', asset_class: 'stock_etf', last_price: 562.5, lots: [{ lot_id: 'v1', shares: 160, cost_per_share: 531.33, purchase_date: '2024-01-02' }] },
    { position_id: 'kcd', ticker: '49306SAB2', name: 'KeyBank CD', label: 'KeyBank CD', kind: 'cd', asset_class: 'bond', last_price: 100, face_value: 5_000, coupon_rate: 0.04,
      maturity_date: '2027-03-31', lots: [{ lot_id: 'k1', shares: 50, cost_per_share: 100, purchase_date: '2026-04-02' }] }] };
const VOO_E = closes([['2024-09-29', 460], ['2025-09-29', 522.4], ['2025-12-31', 545], ['2026-08-29', 556], ['2026-09-30', 562.5]]);
const FLAT = closes([['2024-09-29', 100], ['2025-09-29', 100], ['2026-08-29', 100], ['2026-09-30', 100]]);
const H_VAN = { assetAccounts: [VAN_E], snapshotDays: [linkedDay('van', '2025-10-01', 80_000), linkedDay('van', '2026-08-29', 100_000)],
  priceCache: { VOO: VOO_E, '49306SAB2': FLAT, SPY: VOO_E, AGG: FLAT }, pricesFetchedAt: `${TODAY_C}T11:00:00Z`,
  transactions: [txn('d1', 'van', 'DIVIDEND', 400, '2026-09-26', { ticker: 'VOO' })] };
const TSY_E = { asset_id: 'tsy30', label: 'US Treasury 4.00% 2030', kind: 'fixed_income', asset_class: 'bonds', tax_bucket: 'TAXABLE', balance: 9_850, face_value: 10_000,
  coupon_rate: 0.04, maturity_date: '2030-09-30', source: 'manual', value_as_of: '2026-06-02', amount_paid: 9_700, actual_ttm: 0.021 };
const GOLD_E = { asset_id: 'gld', label: 'Gold bars', kind: 'commodities', asset_class: 'alternatives', tax_bucket: 'TAXABLE', balance: 9000, source: 'manual' };

describe('E · the account page and the Holding page say their figures in words, never symbols', () => {
  const STATES: [string, string, any, string, Record<string, string>][] = [
    ['brokerage', 'account', H_VAN, TODAY_C, { id: 'van' }],
    ['bond account', 'account', { assetAccounts: [TSY_E], snapshotDays: [], priceCache: {}, transactions: [] }, TODAY_C, { id: 'tsy30' }],
    ['alternative', 'account', { assetAccounts: [GOLD_E], snapshotDays: [], priceCache: {}, transactions: [] }, TODAY_C, { id: 'gld' }],
    ['two years', 'account', H_TWO, '2026-10-13', { id: 'a1', period: '2Y' }],
    ['a holding', 'holding', H_VAN, TODAY_C, { account: 'van', position: 'voo' }],
    ['a CD held', 'holding', H_VAN, TODAY_C, { account: 'van', position: 'kcd' }],
    ['a holding over two years', 'holding', H_TWO, '2026-10-13', { account: 'a1', position: 'pv', period: '2Y' }],
  ];
  SCREENS.holding = () => require('../HoldingDetailScreen').default;
  const SHOTS = new Map<string, () => Shot>();
  for (const [name, scr, st, day, params] of STATES) for (const hide of [false, true]) {
    SHOTS.set(`${name}|${hide}`, once(() => shoot(scr, { ...st, hideBalances: hide }, day, params)));
  }
  test.each(STATES.flatMap(([name]) => [[name, false], [name, true]]) as [string, boolean][])('%s (hide-balances %s): nothing is heard as a symbol', (name, hide) => {
    const h = SHOTS.get(`${name}|${hide}`)!().heard;
    expect(h.length).toBeGreaterThan(15);   // it read the screen
    expect(h.filter(SYMBOLS)).toEqual([]);
  });
  test('the words heard, worked by hand: a bond\'s rate, an alternative\'s estimate, a dividend\'s day, a two-year sentence', () => {
    expect(SHOTS.get('bond account|false')!().heard).toContain('Interest payments: 4.00% a year · $400 a year');
    expect(SHOTS.get('bond account|false')!().lines).toContain('4.00%/year · $400/year');            // printed as before
    expect(SHOTS.get('alternative|false')!().heard).toContain('Typical yearly return for this type: about 8.20% · estimate from history');
    expect(SHOTS.get('brokerage|false')!().heard.find((l) => l.startsWith('Sep 26, 2026: Dividend'))).toBeTruthy();
    expect(SHOTS.get('two years|false')!().heard.some((l) => l.includes('+21.00% over the two years, which is +9.99% a year'))).toBe(true);
    expect(SHOTS.get('a holding over two years|false')!().heard.some((l) => /^Versus .*a year/.test(l))).toBe(true);
  });
  test('under hide-balances every amount is "hidden": the trio, the walk\'s title, the rows, the fact rows and the Holding page\'s lines', () => {
    const acct = SHOTS.get('brokerage|true')!().heard;
    expect(acct.some((l) => /^HOW hidden BECAME hidden · THIS ACCOUNT$/.test(l))).toBe(true);
    expect(acct).toContain('hidden');                                            // Market value in the trio
    expect(SHOTS.get('bond account|true')!().heard).toContain('Face value: hidden');
    expect(SHOTS.get('a holding|true')!().heard.some((l) => /^hidden — nothing sold$/.test(l))).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// F · HIDE-BALANCES HIDES EVERY DOLLAR (2026-10-22): the sentence naming the holding left out of the month's figures showed
// "$40,000" and "$10,000" on Home, the Performance tab and the account page with the balances hidden.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('F · the left-out sentence under hide-balances — dots on screen, "hidden" spoken, on all three screens', () => {
  test.each([['home', {}], ['invest', {}], ['account', { id: 'fid', period: '1M' }]] as [string, Record<string, string>][])('%s', (name, params) => {
    const sh = shoot(name, { ...H_LEFT, hideBalances: true }, TODAY_C, params, name === 'invest' ? pick('1M') : undefined);
    const shownLine = sh.lines.find((l) => /^Return is on the /.test(l));
    expect(shownLine).toMatch(/^Return is on the •••• with a price history\. Treasury 2031 \(••••\) has no price history/);
    expect(sh.lines.filter((l) => /\$\d/.test(l) && /price history/.test(l))).toEqual([]);
    if (name !== 'home') expect(sh.heard.some((l) => /^Return is on the hidden with a price history\. Treasury 2031 \(hidden\)/.test(l))).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// G · HOME'S HERO CARD SAYS WHAT IT PRINTS (2026-10-22). The card is one button, so VoiceOver reads its label and nothing in
// it: it never heard the base of the month, the holding left out, the market line or a stale connection. The label is now
// built from the same lines, in printed order, through the spoken writers — and with none of the marks the card prints.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const MARKS = (l: string) => /[▲▼⚠⏱›•~→＋]|\d%?\/(year|month)|\d{4}-\d{2}-\d{2}/.test(l);
const heroLabel = (sh: Shot) => sh.heard.find((l) => l.startsWith('Your investments: '));
const inOrder = (said: string, parts: string[]) => {
  let at = 0;
  for (const p of parts) { const i = said.indexOf(p, at); if (i < 0) return `missing or out of order: ${p}`; at = i + p.length; }
  return 'in order';
};
describe('G · Home\'s hero card is heard line by line, in printed order', () => {
  const STALE = { ...H_PERF, assetAccounts: [{ ...FIDELITY, last_synced: '2026-09-20T08:00:00Z' }] };
  const SAVINGS_ONLY = { assetAccounts: [{ asset_id: 's', label: 'Ally Savings', kind: 'savings', tax_bucket: 'CASH', balance: 8000 }], transactions: [], snapshotDays: [], priceCache: {} };
  const WITH_MARKET = { ...H_LEFT, priceCache: { ...H_LEFT.priceCache, SPY: closes([['2026-08-29', 500], ['2026-09-30', 510]]) } };
  const STATES: [string, any, string][] = [
    ['the month, its base', H_PERF, '2026-09-28'], ['a holding left out', H_LEFT, TODAY_C], ['the market line', WITH_MARKET, TODAY_C],
    // nothing invested: a savings account only (with no account at all Home shows the ways to add one, not this card)
    ['a stale connection', STALE, '2026-09-28'], ['nothing invested', SAVINGS_ONLY, TODAY_C],
  ];
  test.each(STATES.flatMap(([n]) => [[n, false], [n, true]]) as [string, boolean][])('%s (hide-balances %s): every line is said, none as a mark', (name, hide) => {
    const [, st, day] = STATES.find((s) => s[0] === name)!;
    const said = heroLabel(shoot('home', { ...st, hideBalances: hide }, day))!;
    expect(said).toBeTruthy();
    expect(MARKS(said) ? said : 'no marks').toBe('no marks');
    if (hide) expect(said.match(/\$\d/g) ?? []).toEqual([]);
    expect(said.endsWith('See your growth.')).toBe(true);
  });
  test('worked by hand: what the card prints, said in the same order', () => {
    // H_PERF: $35,775 invested (the $10,825 of cash is on Net worth's Cash line), up $8,200 = 21.35% on the $46,600 the month is on
    expect(inOrder(heroLabel(shoot('home', H_PERF, '2026-09-28'))!, ['Your investments: $35,775', 'up $8,200, 21.35 percent this month',
      "This month's change is on $46,600: your investment accounts with the cash in them", 'prices ', 'See your growth.'])).toBe('in order');
    expect(inOrder(heroLabel(shoot('home', H_LEFT, TODAY_C))!, ['Your investments: $50,000', 'this month', "This month's change is on $52,000",
      'Return is on the $40,000 with a price history. Treasury 2031 ($10,000) has no price history'])).toBe('in order');
    expect(heroLabel(shoot('home', WITH_MARKET, TODAY_C))).toMatch(/you plus \d+\.\d\d% \(including dividends and interest\), market plus 2\.00%, (ahead|behind) by \d+\.\d\d%/);
    expect(heroLabel(shoot('home', STALE, '2026-09-28'))).toMatch(/Fidelity part as of Sep 20, \d+ days old, pull to refresh\. See your growth\.$/);
    expect(heroLabel(shoot('home', SAVINGS_ONLY, TODAY_C))).toMatch(/^Your investments: \$0\. Nothing entered yet\. Add your accounts\. nothing invested yet/);
    // hidden: the dollars are "hidden", the percents stay (a rate is not a balance)
    expect(inOrder(heroLabel(shoot('home', { ...H_LEFT, hideBalances: true }, TODAY_C))!, ['Your investments: hidden', 'up hidden', "This month's change is on hidden",
      'Return is on the hidden with a price history. Treasury 2031 (hidden)'])).toBe('in order');
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// H · EVERY DOOR A FINGER CAN REACH, A SCREEN READER CAN TOO (2026-10-22). Inside Home's hero card — one button — the
// "balance not entered" line is its own door to the Net worth tab. The card offers it as a spoken action, named with the
// line's printed words, opening the same route; with no such line, no action.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('H · the hero card\'s spoken action for the "balance not entered" door', () => {
  const NO_BALANCE = { assetAccounts: [{ asset_id: 'f', label: 'Fidelity Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: null, source: 'manual' },
    { asset_id: 's', label: 'Ally Savings', kind: 'savings', tax_bucket: 'CASH', balance: 8000 }], transactions: [], snapshotDays: [], priceCache: {} };
  const openHome = (state: any) => {
    useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
    useStore.setState({ hideBalances: false, ...state } as any);
    mockParams = {};
    const C = require('../HomeScreen').default;
    render(<C />);
    return screen.getAllByRole('button').find((b) => String(b.props.accessibilityLabel ?? '').startsWith('Your investments: '))!;
  };
  test('with the line: the card offers the door by its printed words, and firing it opens the route the touch press opens', () => {
    jest.useFakeTimers({ now: new Date(`${TODAY_C}T12:00:00`), doNotFake: [...FAKE] });
    try {
      const card = openHome(NO_BALANCE);
      const { HERO_GAP_ACTION } = require('../HomeScreen');
      // the line's own printed words, read off the card: "⚠ Fidelity Brokerage has no balance ›" without its marks
      const words = readLines().find((l) => /^⚠ .* ›$/.test(l))!.replace(/^⚠ /, '').replace(/ ›$/, '');
      expect(words).toBe('Fidelity Brokerage has no balance');
      expect(card.props.accessibilityActions).toEqual([{ name: HERO_GAP_ACTION, label: `${words}. Opens the Net worth tab` }]);
      mockPushes.length = 0;
      fireEvent(card, 'accessibilityAction', { nativeEvent: { actionName: HERO_GAP_ACTION } });
      const spoken = mockPushes.slice();
      mockPushes.length = 0;
      fireEvent.press(within(card).getByLabelText(/Opens the Net worth tab\.$/));   // the line inside the card, pressed
      expect(spoken).toEqual(['/(tabs)/analytics']);
      expect(spoken).toEqual(mockPushes);
      screen.unmount();
    } finally { jest.useRealTimers(); }
  });
  test('without the line: no action is offered', () => {
    jest.useFakeTimers({ now: new Date('2026-09-28T12:00:00'), doNotFake: [...FAKE] });
    try {
      const card = openHome(H_PERF);
      expect(screen.queryAllByText(/^⚠ .* ›$/)).toEqual([]);
      expect(card.props.accessibilityActions ?? []).toEqual([]);
      screen.unmount();
    } finally { jest.useRealTimers(); }
  });
});
