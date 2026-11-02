/** FX-PF, 2026-10-31 — the Performance fixes of the drawing match of 2026-10-31 (round 3), each held on the screen production
 *  shows, every expected figure worked by hand beside it.
 *
 *   NW3-02 (R11)  a typed total that sold inside a window: its Return is its walk's own change (1M and 1Y by hand)
 *   NW3-03 / PF3-5  a saved price opens its box with its cents: "$192.50", never "$192.5" (holding editor and the ✎ sheet)
 *   NW3-04        a day's move only between two closes a market day apart — never "(60.00%) today" for a quarter
 *   PF3-2 / PF3-3 the account bar's "›" at 13, 800; "All categories" flush with CATEGORY
 *   R16 (2026-11-01) a box nobody filled opens empty on the five sheets — no grey ‘0’, ‘100’, ‘$10,000’ or ‘4.5’ in it
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { useStore } from '../../store/useStore';
import { builtLines } from '../../testing/mockMatch';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true, setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams, useSegments: () => [], useFocusEffect: () => {}, router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 1) }));

const DAY = () => jest.useFakeTimers({ now: new Date('2026-09-30T12:00:00'), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
beforeEach(() => { DAY(); useStore.getState().resetAll(); useStore.setState({ onboardingComplete: true, hideBalances: false, transactions: [], snapshotDays: [] } as any); });
afterEach(() => jest.useRealTimers());
const series = (ticker: string, pts: [string, number][]) => ({ ticker, points: pts.map(([date, close]) => ({ date, close })) });
const pick = (w: string) => {
  const b = screen.getAllByRole('button').find((x: any) => String(x.props.accessibilityLabel ?? '').startsWith(`Show ${w}`));
  expect(b).toBeDefined();
  fireEvent.press(b!);
};
const after = (l: string[], t: string, from = 0) => { const i = l.indexOf(t, from); expect(i).toBeGreaterThanOrEqual(0); return l[i + 1]; };

// ═══ NW3-02 · R11 ═════════════════════════════════════════════════════════════════════════════════════════════════════════
// Vanguard Brokerage, its total typed: $50,000, $5,000 of it cash, 100 VTI bought Mar 3, 2025 at $80.00. VTI closed $70.00 on
// Aug 1, 2024, $90.00 on Sep 30, 2025, $99.00 on Sep 29, 2026 and $100.00 today. 10 VTI sold today at $120.00 with a $5 fee:
// $1,195 into the cash ($6,195), the total $49,995 (only the fee leaves a typed total). By hand:
//   1M: VTI's 100 shares at the close the month is measured from ($90.00) were $9,000; it has $9,000 and $1,195 to show, so it gained
//       $1,195 and the walk is $49,995 − $1,195 = $48,800 → $49,995: Return 49,995 ÷ 48,800 − 1 = +2.45% (VTI's own +13.28% read here)
//   1Y: from the $70.00 close, $7,000: gained 9,000 + 1,195 − 7,000 = $3,195, walk $46,800 → $49,995: 49,995 ÷ 46,800 − 1 = +6.83%
const VANGUARD = () => ({ asset_id: 'van', label: 'Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 50_000, cash_balance: 5_000,
  source: 'manual', value_as_of: '2026-09-01', positions: [{ position_id: 'vti', ticker: 'VTI', label: 'Vanguard Total Stock Market ETF', kind: 'stocks_etf',
    lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 80, purchase_date: '2025-03-03' }] }] });
// a close on Aug 28, 2026 at the $90.00 the month is measured from (R19, 2026-11-01: a window starts only from a close at most 7 days
// before it; the month began from Sep 30, 2025). The year keeps only its Aug 1, 2024 close, 14 months back — R19's own case below.
const VTI = series('VTI', [['2024-08-01', 70], ['2025-09-30', 90], ['2026-08-28', 90], ['2026-09-29', 99], ['2026-09-30', 100]]);
const sold = () => {
  useStore.setState({ assetAccounts: [VANGUARD()], priceCache: { VTI } } as any);
  useStore.getState().recordTransaction({ date: '2026-09-30', type: 'SELL', account_id: 'van', ticker: 'VTI', shares: 10, price: 120, fee: 5, fee_in_price: false } as any);
};
describe('NW3-02 · R11: a typed total that sold inside the window — its Return is its walk\'s own change', () => {
  test.each([['1M', '$48,800', '$1,195', '+2.45%', 49_995 / 48_800 - 1]] as [string, string, string, string, number][])(
    'the account page on %s: walk %s → $49,995, wealth generated %s, Return %s, and the Total row the same', (w, begin, gained, ret, exact) => {
      sold();
      expect(Math.abs(exact * 100 - parseFloat(ret)) < 0.005).toBe(true);           // the printed figure is the hand-worked one
      mockParams = { id: 'van' };
      render(<>{React.createElement(require('../AccountPortfolioScreen').default)}</>);
      pick(w);
      const l = builtLines(screen.toJSON());
      expect(l).toContain(`HOW ${begin} BECAME $49,995 · THIS ACCOUNT`);
      const sum = l.findIndex((x) => x.startsWith('THIS ACCOUNT ·'));
      expect([after(l, 'Wealth generated', sum), after(l, 'Return', sum)]).toEqual([gained, ret]);
      const total = l.lastIndexOf('Total');
      expect(l.slice(total, total + 3)).toEqual(['Total', '$49,995', ret]);
    });
  // 1Y (R19, 2026-11-01): the year opens Sep 30, 2025, so its start is read on Sep 29, 2025; VTI's last close on or before it is Aug 1,
  // 2024, 424 days back — no start, so no Return, and the sentence names that close. It read +6.83% from that $70 (kept below).
  test('the account page on 1Y: no price near the year\'s start, so no Return — the sentence names VTI\'s Aug 1, 2024 close (R19)', () => {
    sold();
    mockParams = { id: 'van' };
    render(<>{React.createElement(require('../AccountPortfolioScreen').default)}</>);
    pick('1Y');
    const l = builtLines(screen.toJSON());
    expect(after(l, 'Return', l.findIndex((x) => x.startsWith('THIS ACCOUNT ·')))).toBe('—');
    expect(l.some((x) => /^VTI \(\$9,000\) has no price near the window’s start: its last close before it is Aug 1, 2024, so its gains are not included\.$/.test(x))).toBe(true);
  });
  test.failing('the answer until 2026-11-01, kept (no longer the app\'s): 1Y read +6.83% from VTI\'s $70 close of Aug 1, 2024', () => {
    sold();
    mockParams = { id: 'van' };
    render(<>{React.createElement(require('../AccountPortfolioScreen').default)}</>);
    pick('1Y');
    const l = builtLines(screen.toJSON());
    expect(after(l, 'Return', l.findIndex((x) => x.startsWith('THIS ACCOUNT ·')))).toBe('+6.83%');
  });
  test('the Performance tab, this one account, agrees on 1M: +2.45% on the summary and on its card', () => {
    sold();
    render(React.createElement(require('../PerformanceScreen').default));
    pick('1M');
    const l = builtLines(screen.toJSON());
    const sum = l.findIndex((x) => x.startsWith('SUMMARY ·'));
    expect(after(l, 'Return', sum)).toBe('+2.45%');
    expect(l).toContain('· wealth generated $1,195 · return +2.45%');                    // its card, closed
  });
  test.failing('the answer until 2026-10-31, kept (no longer the app\'s): 1M read +13.28%, VTI\'s own return beside the account\'s walk', () => {
    sold();
    mockParams = { id: 'van' };
    render(React.createElement(require('../AccountPortfolioScreen').default));
    pick('1M');
    const l = builtLines(screen.toJSON());
    expect(after(l, 'Return', l.findIndex((x) => x.startsWith('THIS ACCOUNT ·')))).toBe('+13.28%');
  });
  // MONEY IN, THEN A SALE (2026-11-01, the lead's note on R18; account-page v01 row 96): the trades are recorded, so Sep 14's holding is
  // worked back by undoing the sale — 90 + 10 = 100 VTI at the Aug 28 close, $90 = $9,000. Today $50,995 (50,000 + 1,000 − the $5 fee).
  // Just before Sep 15: $50,995 − $9,000 (today's 90 × $100) + $9,000 − $1,000 put in − $1,195 the sale paid = $48,800, the beginning;
  // just after $49,800; Return 50,995 ÷ 49,800 − 1 = +2.40%. Until then it refused (kept below as test.failing).
  test('the same account with a deposit inside the window, then a sale: the sale undone, 48,800 ÷ 48,800 × 50,995 ÷ 49,800 − 1 = +2.40%', () => {
    useStore.setState({ assetAccounts: [VANGUARD()], priceCache: { VTI } } as any);
    useStore.getState().recordTransaction({ date: '2026-09-15', type: 'DEPOSIT', account_id: 'van', amount: 1_000 } as any);
    useStore.getState().recordTransaction({ date: '2026-09-30', type: 'SELL', account_id: 'van', ticker: 'VTI', shares: 10, price: 120, fee: 5, fee_in_price: false } as any);
    mockParams = { id: 'van' };
    render(React.createElement(require('../AccountPortfolioScreen').default));
    pick('1M');
    const l = builtLines(screen.toJSON());
    expect(l).toContain('HOW $48,800 BECAME $50,995 · THIS ACCOUNT');
    expect(after(l, 'Return', l.findIndex((x) => x.startsWith('THIS ACCOUNT ·')))).toBe(`+${((50_995 / 49_800 - 1) * 100).toFixed(2)}%`);
  });  test.failing('the answer until 2026-11-01, kept (no longer the app\'s): the deposit then the sale refused, with the sentence', () => {
    useStore.setState({ assetAccounts: [VANGUARD()], priceCache: { VTI } } as any);
    useStore.getState().recordTransaction({ date: '2026-09-15', type: 'DEPOSIT', account_id: 'van', amount: 1_000 } as any);
    useStore.getState().recordTransaction({ date: '2026-09-30', type: 'SELL', account_id: 'van', ticker: 'VTI', shares: 10, price: 120, fee: 5, fee_in_price: false } as any);
    mockParams = { id: 'van' };
    render(React.createElement(require('../AccountPortfolioScreen').default));
    pick('1M');
    const l = builtLines(screen.toJSON());
    expect(after(l, 'Return', l.findIndex((x) => x.startsWith('THIS ACCOUNT ·')))).toBe('—');
    expect(l).toContain('Money moved in or out on Sep 15, 2026 and no value was recorded that day, so a return cannot be measured across it. The dollar figures here are still right.');
  });
});

// ═══ NW3-03 / PF3-5 ═══════════════════════════════════════════════════════════════════════════════════════════════════════
describe('NW3-03 · a saved price opens with its cents', () => {
  const AAPL = { position_id: 'p1', ticker: 'AAPL', label: 'Apple Inc.', kind: 'stocks_etf', lots: [
    { lot_id: 'l1', shares: 100, cost_per_share: 168, purchase_date: '2023-03-14' }, { lot_id: 'l2', shares: 40, cost_per_share: 192.5, purchase_date: '2026-01-09' }] };
  test('the holding editor: "$168" and "$192.50" — it showed "$192.5" (40 × $192.50 = $7,700, as the page prints it)', () => {
    useStore.setState({ assetAccounts: [{ asset_id: 'fid', label: 'Fidelity', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true, positions: [AAPL] }],
      priceCache: { AAPL: series('AAPL', [['2026-09-29', 239.53], ['2026-09-30', 241.84]]) } } as any);
    mockParams = { account: 'fid', position: 'p1' };
    render(React.createElement(require('../HoldingDetailScreen').default));
    fireEvent.press(screen.getByLabelText('Edit this holding'));
    const boxes = screen.UNSAFE_root.findAll((n: any) => n.type === 'TextInput').map((n: any) => String(n.props.value ?? ''));
    expect(boxes).toEqual(expect.arrayContaining(['$168', '$192.50']));
    expect(boxes).not.toContain('$192.5');
  });
  test('the ✎ sheet on a buy you entered at $192.50 with a $2.50 fee: "$192.50" and "$2.50"', () => {
    useStore.setState({ assetAccounts: [VANGUARD()], priceCache: { VTI },
      transactions: [{ id: 'b1', date: '2026-09-02', type: 'BUY', account_id: 'van', ticker: 'VTI', shares: 2, price: 192.5, fee: 2.5, fee_in_price: false, source: 'manual', created_at: '' }] } as any);
    mockParams = { id: 'van' };
    render(React.createElement(require('../AccountPortfolioScreen').default));
    fireEvent.press(screen.getAllByText('✎')[0]);
    const boxes = screen.UNSAFE_root.findAll((n: any) => n.type === 'TextInput').map((n: any) => String(n.props.value ?? ''));
    expect(boxes).toEqual(expect.arrayContaining(['$192.50', '$2.50']));
  });
});

// ═══ NW3-04 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('NW3-04 · a day\'s move is between two closes a market day apart', () => {
  const page = (pts: [string, number][]) => {
    useStore.setState({ pricesFetchedAt: '2026-09-30T11:00:00Z',
      assetAccounts: [{ asset_id: 'fid', label: 'Fidelity', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true,
        positions: [{ position_id: 'p1', ticker: 'XYZ', label: 'XYZ Corp', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 10, cost_per_share: 40, purchase_date: '2025-01-02' }] }] }],
      priceCache: { XYZ: series('XYZ', pts) } } as any);
    mockParams = { account: 'fid', position: 'p1' };
    render(React.createElement(require('../HoldingDetailScreen').default));
    return builtLines(screen.toJSON());
  };
  test('closes on Jul 1 and Sep 30 ($50 → $80): no move is printed — it read "▲ up $30.00 (60.00%) today", a quarter called a day', () => {
    const l = page([['2026-07-01', 50], ['2026-09-30', 80]]);
    expect(l.some((x) => /today|last market day/.test(x) && /[▲▼]/.test(x))).toBe(false);
    expect(l).toContain('$80.00');                                                       // the last close itself stands
  });
  test('closes a day apart, Sep 29 and 30 ($79.20 → $80.00): "▲ up $0.80 (1.01%) today" — 0.80 ÷ 79.20 = 1.01%', () => {
    const l = page([['2026-07-01', 50], ['2026-09-29', 79.2], ['2026-09-30', 80]]);
    expect(l).toContain('▲ up $0.80 (1.01%) today');
  });
  test('a long weekend, Friday Sep 25 to Tuesday Sep 29, still counts as one market day (4 calendar days)', () => {
    jest.useFakeTimers({ now: new Date('2026-09-29T12:00:00'), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    useStore.setState({ pricesFetchedAt: '2026-09-29T11:00:00Z' } as any);
    const l = page([['2026-09-25', 100], ['2026-09-29', 98]]);
    expect(l.some((x) => x.startsWith('▼ down $2.00 (2.00%)'))).toBe(true);               // 2 ÷ 100 (its label follows the fetch)
  });
});

// ═══ PF3-2 / PF3-3 ════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('PF3-2 · PF3-3 · the account bar\'s arrow, and All categories flush (v17)', () => {
  test('one typed account on 1M: its bar\'s "›" at 13 and 800; "All categories" with no indent', () => {
    sold();
    render(React.createElement(require('../PerformanceScreen').default));
    pick('1M');
    // the arrow itself (its 'Open …' name moved to the touchable around it with NW4-04's Tap.slop, 2026-11-01)
    const arrows = screen.UNSAFE_root.findAll((n: any) => n.type === 'Text' && n.props?.children === '›');
    expect(arrows.length).toBeGreaterThanOrEqual(1);                                       // the guard looked: the account bar's arrow
    for (const a of arrows) expect(StyleSheet.flatten(a.props.style)).toMatchObject({ fontSize: 13, fontWeight: '800' });
    const all = screen.getByText('All categories');
    expect(StyleSheet.flatten(all.props.style).marginLeft ?? 0).toBe(0);
  });
});

// ═══ R16 · EMPTY MEANS EMPTY (2026-11-01; the lead's ruling of 2026-10-31, DEC-0296) ═══════════════════════════════════════
// “an unknown input produces no number and a reason — never a default” (DEC-0296): a box nobody filled shows no figure that could be
// read as an entry. The rows of 2026-11-01 on record-activity v01, edit-record v03, trade v04 and holding-editor v02. The ‘—’ of an
// optional figure and the ‘e.g. AAPL’ words are not figures and stay; the 100 a Shares per contract box opens with is a value (DEC-0274).
describe('R16 · a box nobody filled opens empty, on the five sheets', () => {
  const { SHEETS } = require('../../testing/sheetStates');
  const FIG = /^\$?[\d,.]+$/;
  const open = (st: any, more: () => void = () => {}) => {
    useStore.getState().resetAll(); mockParams = st.params;
    useStore.setState({ onboardingComplete: true, hideBalances: false, ...st.store } as any);
    render(React.createElement(require(st.page === 'account' ? '../AccountPortfolioScreen' : '../HoldingDetailScreen').default));
    st.steps(); more();
  };
  const inputs = () => screen.UNSAFE_root.findAll((n: any) => n.type === 'TextInput');
  const greyFigures = () => inputs().filter((n: any) => !n.props.value && FIG.test(String(n.props.placeholder ?? '')))
    .map((n: any) => `${n.props.accessibilityLabel}: ${n.props.placeholder}`);
  const box = (label: string) => { const b = screen.getByLabelText(label); return [String(b.props.value ?? ''), String(b.props.placeholder ?? '')]; };
  const clear = (label: string) => { fireEvent.changeText(screen.getByLabelText(label), ''); return box(label); };
  const state = (id: string, key: string) => SHEETS.find((x: any) => x.id === id).states.find((x: any) => x.key === key);
  const ALL: [string, any][] = SHEETS.flatMap((x: any) => x.states.map((st: any) => [`${x.id} ${st.key}`, st]));
  let seen = 0;
  test('a guard must prove it looked: 46 states — trade 15, holding editor 9, activity 3, record activity 9, ✎ sheet 10', () => {
    expect(SHEETS.map((x: any) => `${x.id} ${x.states.length}`)).toEqual(['trade 15', 'holding-editor 9', 'activity 3', 'record-activity 9', 'edit-record 10']);
    expect(ALL).toHaveLength(46);
  });
  test.each(ALL)('%s: no empty box shows a grey figure', (_k, st) => {
    open(st);
    seen += inputs().length;
    expect(greyFigures()).toEqual([]);
  });
  test('…and the states held boxes to look at: more than one per state (the count read the boxes, not an empty tree)', () => {
    expect(seen).toBeGreaterThan(46);
  });
  test('record activity A: the amount opens empty — it held a grey ‘0’ beside its $', () => {
    open(state('record-activity', 'A'));
    expect(box('Amount')).toEqual(['', '']);
  });
  test('the trade sheet: a deposit\'s amount, emptied, stays empty; Shares and Price per share open empty', () => {
    open(state('trade', 'A'));
    expect([box('Shares'), box('Price per share')]).toEqual([['', ''], ['', '']]);
    open(state('trade', 'F'));
    expect(clear('Amount')).toEqual(['', '']);
  });
  test('the trade sheet N: Shares per contract opens with its 100, the standard contract; emptied, no grey ‘100’ stands in it', () => {
    open(state('trade', 'N'));
    expect(box('Shares per contract')).toEqual(['100', '']);
    expect(clear('Shares per contract')).toEqual(['', '']);
  });
  test('the holding editor: a bond\'s Face value and Interest rate %, emptied, show no grey ‘$10,000’ or ‘4.5’; an option\'s 100, emptied, no ‘100’', () => {
    open(state('holding-editor', 'D'));
    expect([clear('Face value'), clear('Coupon percent')]).toEqual([['', ''], ['', '']]);
    open(state('holding-editor', 'C'));
    expect(box('Shares per contract')).toEqual(['100', '']);
    expect(clear('Shares per contract')).toEqual(['', '']);
    open(state('holding-editor', 'H'));
    expect(box('Shares')).toEqual(['', '']);                                         // a holding with no purchase: its Shares box, empty
  });
  test('the ✎ sheet I, a sale: Shares and Price per share, emptied, show no grey ‘0’; the fee keeps its ‘—’', () => {
    open(state('edit-record', 'I'));
    expect([clear('Shares'), clear('Price per share')]).toEqual([['', ''], ['', '']]);
    expect(box('Fee')[1]).toBe('—');
  });
});
