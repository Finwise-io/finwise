/** THE CASH FLOW DRAWING MATCH, FIXED (2026-10-25, CF-MMFIX-A) — each finding of the drawing match MM-CF held where a person sees it.
 *
 *  Every figure is worked by hand in the drawing's own household (src/testing/cashflowDrawing.ts) on the drawing's own day, Aug 20,
 *  2026, unless a test says otherwise. The finding each test holds is in its name (CF-01 … CF-24, BC-01/02, MI-01, HM-01/02).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import CashFlowScreen from '../CashFlowScreen';
import { useStore } from '../../store/useStore';
import { builtLines } from '../../testing/mockMatch';
import * as H from '../../testing/cashflowDrawing';
import { localDay, localMoment } from '../../domain/_shared/dates';
import { inMonth } from '../../../MoneyKeel/functions/cashflow/logged-expenses';
import { budgetEditorBuckets, spendByMonthByCategory, spendByMonthByBucket } from '../../domain/budget';
import { Colors } from '../../utils/theme';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

/** West of London (every US zone, and this machine's, America/Los_Angeles): London's midnight is still the day before here. */
const WEST = new Date(2026, 7, 1).getTimezoneOffset() > 0;
beforeEach(() => { jest.useFakeTimers({ now: H.DRAWN_NOW, doNotFake: [...H.ONLY_THE_CLOCK] }); });
afterEach(() => { jest.useRealTimers(); });
const lines = () => builtLines(screen.toJSON());
const tab = (t: string) => fireEvent.press(screen.getByLabelText(new RegExp(`^${t} tab`)));
const block = (L: string[], from: string, to: string) => { const i = L.indexOf(from), j = L.indexOf(to, i + 1); expect([from, i >= 0, to, j > i]).toEqual([from, true, to, true]); return L.slice(i, j + 1); };
const flat = (n: any) => StyleSheet.flatten(n?.props?.style) ?? {};
/** a box title's words, their colour, and the fill of the bar they sit on (R1, DEC-8839 — 2026-10-27) */
const onBar = (t: string) => { const n: any = screen.getByText(t); let p = n.parent; let fill: any; while (p && !fill) { fill = flat(p).backgroundColor; p = p.parent; } return [t, flat(n).color, fill]; };

// ── CF-21 · THE WHOLE CLASS OF READING A STORED DAY ───────────────────────────────────────────────────────────────────────────
describe('CF-21 · a stored day is read where the person is', () => {
  test('a calendar day is that day and a clock time its own day, in every zone; an instant is the day it was where the person is', () => {
    expect(localDay('2026-08-01')).toBe('2026-08-01');
    expect(localMoment('2026-08-01')!.getDate()).toBe(1);
    expect(localDay('2026-08-31T18:30:00')).toBe('2026-08-31');               // the Expenses screen's clock time, no zone
    const at = new Date('2026-09-01T01:30:00.000Z');
    expect(localDay('2026-09-01T01:30:00.000Z')).toBe(`${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`);
    expect(localDay('not a day')).toBe('');
    expect(inMonth({ amount: 5, category: 'Other', date: '2026-08-01' }, '2026-08')).toBe(true);
  });
  test('west of London (a US zone — this machine runs in America/Los_Angeles): the trap, and the reader that steps round it', () => {
    if (!WEST) return;                                                      // east of London the calendar-day trap cannot happen
    expect(new Date('2026-08-01').getDate()).toBe(31);                       // London's midnight is Jul 31 here
    expect(localDay('2026-09-01T01:30:00.000Z')).toBe('2026-08-31');          // 6:30pm on Aug 31 in California, stamped as an instant
    // the month test every Cash flow figure reads: that Aug 31 evening purchase is August's (it was September's)
    expect(inMonth({ amount: 5, category: 'Other', date: '2026-09-01T01:30:00.000Z' }, '2026-08')).toBe(true);
  });
});

// ── CF-21 · CF-20 · CF-22 · THE BUDGET EDITOR ────────────────────────────────────────────────────────────────────────────────
describe('CF-20 · CF-21 · CF-22 · the budget editor in the drawing’s household', () => {
  test('CF-21 · the rows add up to their bucket, and the buckets to the plan — the sixteen purchases of Aug 1 counted', () => {
    H.householdWithData();
    render(<CashFlowScreen />);
    fireEvent.press(screen.getAllByLabelText(/Opens your budget/)[0]);
    const L = lines();
    // spent, by hand: Utilities 22 (PG&E); Other = typed 100 + 42 + 38 + 30 = 210, card 15 + 315 + 95 + 18 + (32 + 15 × 26 = 422) = 865,
    // 1,075 in all; Grocery 65 + 88 + 145 + 120 = 418; Gas 60 + 55 + 70 = 185 → Flexible 1,075 + 418 + 185 = 1,678. Planned this month:
    // Utilities 200; Other the rest of 2,000, 2,000 − 200 − 900 − 200 = 700; Grocery 900; Gas 200 → Flexible 1,800; 200 + 1,800 = 2,000
    expect(block(L, 'Fixed', '$185 / $200')).toEqual(['Fixed', '$22 / $200', '⚡', 'Utilities', '$22 / $200',
      'Flexible', '$1,678 / $1,800', '📦', 'Other', '$1,075 / $700', '📦', 'Grocery', '$418 / $900', '📦', 'Gas', '$185 / $200']);
    expect(L).not.toContain('Debt payment');                               // a debt payment is under Debt this month, not an expense row
    // CF-22: "Your budget" once — the editor's title — and the surplus with its sign, as This month prints it
    expect(L.filter((l) => l === 'Your budget')).toHaveLength(1);
    const card = block(L, 'Income (take-home)', '= Planned surplus');
    expect(card.concat(L[L.indexOf('Income (take-home)') + card.length + 1])).toEqual(
      ['Income (take-home)', '$5,000', '− Expenses (plan)', '$2,000', '− Debt payments', '$2,650', '= Planned surplus', '+$350']);
  });
  test('CF-21 · the one function behind it, run on its own: rows add up to each bucket and the buckets to the month’s plan', () => {
    const op = { ...H.WORKER, ...H.BUDGET_BY_CATEGORY } as any;
    const b = budgetEditorBuckets(H.FRAME_C_EXPENSES as any, op, H.DRAWN_NOW);
    for (const k of b) {
      expect(k.rows.reduce((t, r) => t + r.spent, 0)).toBeCloseTo(k.spent, 9);
      expect(k.rows.reduce((t, r) => t + r.spentShown, 0)).toBe(Math.round(k.spent));
    }
    expect(b.reduce((t, k) => t + k.planned, 0)).toBe(2000);
    // and the Expenses tab's planned rows are the same plan, by category, in the order entered
    expect(spendByMonthByCategory(op)[7].map((r) => [r.label, r.monthly])).toEqual([['Gas', 200], ['Grocery', 900], ['Utilities', 200], ['Other', 700]]);
    const g = spendByMonthByBucket(op)[7];
    expect(g.fixed + g.nonmonthly + g.flexible).toBe(2000);
  });
  test('CF-20 · no budget: no bar, and never “$0 spent so far · $0 left · of $0 plan”', () => {
    H.householdFreshB();
    render(<CashFlowScreen />);
    fireEvent.press(screen.getAllByLabelText('Set your budget')[0]);
    const L = lines();
    expect(block(L, 'Income (take-home)', '—')).toEqual(['Income (take-home)', '$5,000', '− Expenses (plan)', '— not set', '− Debt payments', '$2,250', '= Planned surplus', 'ⓘ', '—']);
    expect(L.filter((l) => /spent so far|of \$0 plan|left · of/.test(l))).toEqual([]);
  });
});

// ── CF-16 · CF-17 · CF-18 · CF-19 · A PERSON WHO HAS ENTERED NOTHING ─────────────────────────────────────────────────────────
describe('CF-16 to CF-19 · a brand-new person: one line and its door, never $0 dressed as an answer (DEC-0260, DEC-0431)', () => {
  const tabOf = (t: string) => { H.householdBrandNew(); render(<CashFlowScreen />); tab(t); const L = lines(); screen.unmount(); return L.slice(L.indexOf('Debts') + 1); };
  // every box title on a dark-green bar (his words, DEC-8839; the lead's R1) (2026-10-27, FX-CF-A — cash-flow_v01’s rows of that date; the old answer is kept beside it as test.failing)
  test('CF-19 · This month: the two steps under their box title, on its dark-green bar (R1)', () => {
    H.householdBrandNew();
    render(<CashFlowScreen />);
    expect(onBar('SET UP YOUR MONTH — 2 STEPS')).toEqual(['SET UP YOUR MONTH — 2 STEPS', Colors.white, Colors.primaryDeep]);
  });
  test.failing('CF-19 · the old answer, kept: a quiet grey label, not a dark-green bar', () => {
    H.householdBrandNew();
    render(<CashFlowScreen />);
    const label = screen.getByText('SET UP YOUR MONTH — 2 STEPS');
    expect([flat(label).color, flat(label).backgroundColor, flat(label).fontWeight]).toEqual([Colors.textSecondary, undefined, '800']);
  });
  test('CF-16 · Income: “Nothing entered yet. Add your income ›” once — the line is the door', () => {
    expect(tabOf('Income')).toEqual(['THIS MONTH', '$0', 'expected take-home', 'YOUR SOURCES', 'Nothing entered yet. Add your income ›',
      'RECEIVED THIS MONTH', 'Nothing received yet this month.', 'Your income, all of it', 'the take-home, and what it is taxed on', 'Open ›', '＋ Expense']);
  });
  test('CF-17 · Expenses: MONTHLY RECURRING EXPENSES $0 says why, and its door', () => {
    expect(tabOf('Expenses').slice(0, 3)).toEqual(['MONTHLY RECURRING EXPENSES', '$0', 'Nothing entered yet. Add your debts ›']);
  });
  test('CF-18 · Debts: $0 and its door — no “across 0 debts”, no 🎉, no edit hint, no second door', () => {
    expect(tabOf('Debts')).toEqual(['YOUR DEBT', '$0', 'Nothing entered yet. Add your debts ›', '＋ Expense']);
  });
});

// ── CF-09 · CF-11 · CF-12 · CF-23 · CF-24 · WORDS AND FIGURES ────────────────────────────────────────────────────────────────
describe('CF-09 · CF-11 · CF-12 · CF-23 · CF-24', () => {
  test('CF-09 · a budget typed by group reads by group; a budget entered by category reads by category', () => {
    H.householdWithData();
    useStore.setState({ onboardingProfile: { ...H.WORKER, monthlySpending: '2000', b_fixed: '1100', b_flexible: '900' } } as any);
    render(<CashFlowScreen />);
    tab('Expenses');
    expect(block(lines(), 'PLANNED EXPENSES', '$2,000')).toEqual(['PLANNED EXPENSES', '$2,000']);
    expect(block(lines(), 'Bills & fixed', '= Total')).toEqual(['Bills & fixed', '$1,100', 'Everyday expenses', '$900', '= Total']);
  });
  test('CF-11 · with no budget, no “after tax and 401(k)” under the inflow and no “same every month” under the recurring rows', () => {
    H.householdFreshD();
    render(<CashFlowScreen />);
    expect(lines()).not.toContain('after tax and 401(k)');
    tab('Expenses');
    expect(lines()).not.toContain('same every month');
  });
  test('CF-23 · a mortgage names its property; one on no property says so in amber, as Net worth does (DEC-1925)', () => {
    H.householdDebts();
    useStore.setState({ assetAccounts: [{ asset_id: 'lh', label: 'Lake house', kind: 'real_estate', asset_class: 'real_estate', balance: 450000 }],
      liabilities: [...(useStore.getState() as any).liabilities,
        { debt_id: 'mm', label: 'Lake house mortgage', debt_type: 'MORTGAGE', remaining_balance: 200000, interest_rate_apr: 0.05, minimum_monthly_payment: 1300, property_id: 'lh' },
        { debt_id: 'ch', label: 'Chase', debt_type: 'MORTGAGE', remaining_balance: 120000, interest_rate_apr: 0.045, minimum_monthly_payment: 900 }] } as any);
    render(<CashFlowScreen />);
    tab('Debts');
    const L = lines();
    // 200,000 × 5% ÷ 12 = 833.33 → ~$833; 120,000 × 4.5% ÷ 12 = $450
    expect(L).toContain('5.00% · on Lake house · 15 years left · $1,300/month min · ~$833/month interest');
    const amber = screen.getByText('Your mortgage “Chase” is not on a property. A mortgage is always on a property — open it and say which one.');
    expect(flat(amber).color).toBe(Colors.amber);
  });
  test('CF-24 · a calculated take-home wears ≈ on This month, the Income tab and Home; a typed one never does', () => {
    // $8,000 a month, $1,000 into a 401(k), single (E2E-79 worked it): ≈$6,196
    H.householdFreshD();
    useStore.setState({ onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: '1981', baseSalary: '8000', salaryFreq: 'monthly', c_401k: '1000', hasPartner: 'no' } } as any);
    render(<CashFlowScreen />);
    let L = lines();
    expect([L[L.indexOf('Inflow (income (take-home))') + 1], L[L.indexOf('Actual inflow (income (take-home))') + 1]]).toEqual(['≈$6,196', '≈$6,196']);
    tab('Income');
    L = lines();
    expect([L[L.indexOf('THIS MONTH') + 1], L[L.indexOf('Salary — steady') + 1]]).toEqual(['≈$6,196', 'before tax · monthly · ≈$6,196/month take-home']);
    screen.unmount();
    const HomeScreen = require('../HomeScreen').default;
    render(<HomeScreen />);
    L = lines();
    expect(L[L.indexOf('Income', L.indexOf("THIS MONTH’S CASH FLOW")) + 1]).toBe('≈$6,196');
    screen.unmount();
    H.householdWithData();
    render(<CashFlowScreen />);
    L = lines();
    expect(L[L.indexOf('Inflow (income (take-home))') + 2]).toBe('$5,000');       // typed: no ≈
  });
});

// ── HM-01 · HM-02 · HOME'S BOX ───────────────────────────────────────────────────────────────────────────────────────────────
describe('HM-01 · HM-02 · Home’s THIS MONTH’S CASH FLOW box', () => {
  test('HM-02 · an expense alone brings the box — Income $0 · its door · Outflow $40 · Left —; HM-01 · no “day 20 of 31” before income', () => {
    H.householdBrandNew();
    useStore.setState({ expenses: [{ id: 'e', amount: 40, category: 'Groceries', store: 'Market', date: '2026-08-18', createdAt: '2026-08-18T09:00:00' }] } as any);
    const HomeScreen = require('../HomeScreen').default;
    render(<HomeScreen />);
    const L = lines();
    const i = L.indexOf("THIS MONTH’S CASH FLOW");
    expect(i).toBeGreaterThanOrEqual(0);
    expect(L.slice(i, i + 8)).toEqual(["THIS MONTH’S CASH FLOW", 'Income', '$0', 'Nothing entered yet. Add your income ›', 'Outflow (expenses + debt)', '$40', 'Left', '—']);
    expect(L.some((l) => /^day \d+ of \d+$|% spent/.test(l))).toBe(false);
  });
});

// ── BC-01 · BC-02 · MI-01 ────────────────────────────────────────────────────────────────────────────────────────────────────
describe('BC-01 · BC-02 · MI-01', () => {
  test('BC-01 · In, Out and End are black at 800; BC-02 · a month with nothing in or out is heard as printed, “—”', () => {
    H.householdBrandNew();
    const BillCalendarScreen = require('../BillCalendarScreen').default;
    render(<BillCalendarScreen />);
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(24);                       // twelve months, In and Out
    for (const d of dashes.slice(0, 24)) expect([flat(d).fontWeight, flat(d).color]).toEqual(['800', Colors.textPrimary]);
    const said = screen.getByLabelText(/^Aug 2026: in /).props.accessibilityLabel;
    expect(said).toMatch(/^Aug 2026: in —, out —, ending balance /);
  });
  test('MI-01 · Monthly income’s boxes show no sample amount that looks entered', () => {
    H.householdBrandNew();
    const MonthlyIncomeScreen = require('../MonthlyIncomeScreen').default;
    render(<MonthlyIncomeScreen />);
    const boxes = screen.UNSAFE_root.findAll((n: any) => n.type === 'TextInput' || n.props?.placeholder != null).filter((n: any) => typeof n.props?.placeholder === 'string');
    expect(boxes.length).toBeGreaterThanOrEqual(3);
    expect(boxes.map((b: any) => b.props.placeholder).filter((p: string) => /\d/.test(p))).toEqual([]);
  });
});

// ── CF-01 · CF-02 · CF-03 · CF-05 · CF-06 · CF-07 · CF-14 · CF-15 · APPEARANCE, FROM THE RENDERED STYLES ────────────────────────
/** how far a text sits from the right edge of the screen's content: every padding, margin and border on its way down */
const side = (st: any, k: 'padding' | 'margin', d: 'Right' | 'Left') => Number(st[`${k}${d}`] ?? st[`${k}Horizontal`] ?? st[k] ?? 0) || 0;
function rightInsets(): { text: string; right: number }[] {
  const out: { text: string; right: number }[] = [];
  const textOf = (n: any): string => (n == null ? '' : typeof n === 'string' ? n : Array.isArray(n) ? n.map(textOf).join('') : (n.children ?? []).map(textOf).join(''));
  const walk = (n: any, acc: number) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach((c) => walk(c, acc)); return; }
    const st = StyleSheet.flatten(n.props?.style) ?? {};
    const here = acc + side(st, 'padding', 'Right') + side(st, 'margin', 'Right') + (Number(st.borderRightWidth ?? st.borderWidth ?? 0) || 0);
    if (n.type === 'Text') { out.push({ text: textOf(n).trim(), right: acc + side(st, 'margin', 'Right') }); return; }
    (n.children ?? []).forEach((c: any) => walk(c, here));
  };
  walk(screen.toJSON(), 0);
  return out;
}
describe('appearance, as drawn', () => {
  test('CF-01 · every band total sits on the rows’ one right edge (This month and Expenses)', () => {
    H.householdWithData();
    render(<CashFlowScreen />);
    const money = (r: { text: string }) => /^[+−]?\$[\d,]+$/.test(r.text);
    let edges = new Set(rightInsets().filter(money).map((r) => r.right));
    expect([...edges]).toHaveLength(1);                                     // +$350 on the band and −$2,000 on its row: one edge
    tab('Expenses');
    edges = new Set(rightInsets().filter(money).map((r) => r.right));
    expect([...edges]).toHaveLength(1);                                     // $2,250 · $2,000 · $2,100 · $500 and every row under them
  });
  test.failing('CF-02 · the old answer, kept: YOUR DEBT, YOUR DEBTS and PROGRESS as quiet grey labels', () => {
    H.householdDebts();
    render(<CashFlowScreen />);
    tab('Debts');
    for (const k of ['YOUR DEBT', 'YOUR DEBTS', 'PROGRESS']) {
      const t = flat(screen.getByText(k));
      expect([k, t.color, t.backgroundColor, t.fontWeight]).toEqual([k, Colors.textSecondary, undefined, '800']);
    }
  });
  test('CF-02 · CF-03 · CF-05 · CF-06 · CF-07 · CF-14 · the Debts tab as frame 6 draws it', () => {
    H.householdDebts();
    render(<CashFlowScreen />);
    tab('Debts');
    // the three box titles on dark-green bars (R1, DEC-8839) (2026-10-27, FX-CF-A — cash-flow_v01’s rows of that date; the old answer is kept beside it as test.failing) — they were quiet grey labels
    for (const k of ['YOUR DEBT', 'YOUR DEBTS', 'PROGRESS']) expect(onBar(k)).toEqual([k, Colors.white, Colors.primaryDeep]);
    // the bar, filled to the share paid down: 4,100 ÷ 17,100 = 23.98%
    const fills = screen.UNSAFE_root.findAll((n: any) => n.type === 'View' && /%$/.test(String(flat(n).width ?? '')));
    expect(fills.map((f: any) => Number(String(flat(f).width).replace('%', '')).toFixed(2))).toContain('23.98');
    const L = lines();
    expect(L.filter((l) => /[💳🚗🏡🏠]/u.test(l))).toEqual([]);                            // no icons
    expect(L).toContain('22.90% — the costliest · $110/month min · ~$61/month interest');  // a card: no time left; "· " with its space
    expect(L).toContain('6.40% · 3 years left · $300/month min · ~$52/month interest');
    const tag = flat(screen.getByText('pay first'));
    expect([tag.backgroundColor, tag.color]).toEqual([undefined, Colors.textPrimary]);       // no fill
    expect(flat(screen.getByText('Log a payment ›')).fontWeight).toBe('700');
  });
  test('CF-14 · the IMPORTED tag is grey; “Show all …” is dark green at 800; a row figure is 700 and a total 800', () => {
    H.householdWithData();
    render(<CashFlowScreen />);
    const imp = flat(screen.getByText('imported'));
    expect([imp.backgroundColor, imp.color]).toEqual([Colors.bgTertiary, Colors.sepDot]);
    expect(screen.getAllByText('$5,000').map((t) => flat(t).fontWeight)).toEqual(['700', '700']);   // the inflow rows, the drawing's <b>
    tab('Expenses');
    const more = flat(screen.getByText('Show all 9 · $195.00 more ›'));
    expect([more.color, more.fontWeight]).toEqual([Colors.primaryDark, '800']);
  });
  test('CF-15 · a sub-tab’s corner is 12 (DEC-0231); each card runs edge to edge with square corners', () => {
    H.householdWithData();
    render(<CashFlowScreen />);
    const chip = screen.getByLabelText('This month tab, selected');
    expect(flat(chip).borderRadius).toBe(12);
    const card = screen.UNSAFE_root.findAll((n: any) => n.type === 'View' && flat(n).backgroundColor === Colors.white && flat(n).marginHorizontal === -16);
    expect(card.length).toBeGreaterThanOrEqual(2);
    for (const c of card) expect(flat(c).borderRadius ?? 0).toBe(0);
  });
});

// ── THE OUTSIDE MEASUREMENT'S SCREEN ITEMS FOR THESE TABS (2026-10-25, the coordinator's list from CFR-5) ──────────────────────
describe('the outside measurement’s Cash flow screen items', () => {
  test('MK-CF-M-049 · a later month with no budget: “— not set” and This month’s sentence, never a planned surplus (DEC-7939)', () => {
    H.householdFreshD();
    render(<CashFlowScreen />);
    fireEvent.press(screen.getByLabelText('Next month'));
    const L = lines();
    const i = L.indexOf('SEPTEMBER 2026 — THE PLAN (AN ESTIMATE)');
    expect(L.slice(i, i + 7)).toEqual(['SEPTEMBER 2026 — THE PLAN (AN ESTIMATE)', 'Planned inflow', '$5,000', 'Planned outflow (expenses + debt)', '— not set',
      'Your debts are here, but you haven’t set your budget. Until you do there is no planned surplus — we won’t guess one.', 'Set your budget']);
    expect(L).not.toContain('= Planned surplus');
  });
  test('MK-CF-M-011 · MK-CF-M-007 · guaranteed income is what arrives now from outside your savings; a monthly figure reads monthly', () => {
    // $2,400 of Social Security received and $1,500/month taken from a 401(k): the withdrawal is a draw, not guaranteed → $2,400
    H.householdBrandNew();
    useStore.setState({ onboardingProfile: { status: 'retired', birthYear: '1956', incomeSources: ['retirement_income'], ri_ss: '2400', ri_ss_freq: 'monthly',
      ri_withdrawals: '1500', ri_withdrawals_freq: 'monthly', monthlySpending: '3000' } } as any);
    render(<CashFlowScreen />);
    tab('Income');
    let L = lines();
    expect(L.slice(L.indexOf('Social Security · pension'), L.indexOf('Social Security · pension') + 3)).toEqual(['Social Security · pension', 'guaranteed income', '$2,400/month ›']);
    screen.unmount();
    // a worker's $2,900 ssa.gov estimate typed in the Plan, retirement income not among their sources: not listed as received
    H.householdBrandNew();
    useStore.setState({ onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: '1968', baseSalary: '8000', salaryMode: 'gross', salaryFreq: 'monthly',
      monthlySpending: '4000', ri_ss: '2900', ri_ss_freq: 'monthly', seAmount: '2000' } } as any);
    render(<CashFlowScreen />);
    tab('Income');
    L = lines();
    expect(L).not.toContain('Social Security · pension');
    expect(L.slice(L.indexOf('Self-employment'), L.indexOf('Self-employment') + 3)).toEqual(['Self-employment', 'net · monthly', '$2,000 ›']);
  });
  test('MK-CF-M-073 · F1 · a payment chosen above the minimum is the person’s payment, and the total counts what is paid', () => {
    // a $9,000 card at 24% with a $200 minimum and $300 chosen, a $14,000 car loan at 6.9% paying $250: 300 + 250 = $550 a month;
    // the card's interest 9,000 × 24% ÷ 12 = $180, under the interest's own figure
    H.householdDebts();
    useStore.setState({ liabilities: [
      { debt_id: 'c', label: 'Card', debt_type: 'CREDIT_CARD', remaining_balance: 9000, interest_rate_apr: 0.24, minimum_monthly_payment: 200, monthly_payment: 300 },
      { debt_id: 'a', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 250 }] } as any);
    render(<CashFlowScreen />);
    tab('Debts');
    const L = lines();
    expect(L.find((l) => l.startsWith('across 2 debts'))).toBe('across 2 debts · $550/month in payments');   // the interest is on each line (CF2-03) (2026-10-27, FX-CF-A — cash-flow_v01’s rows of that date; the old answer is kept beside it as test.failing)
    expect(L).toContain('24.00% — the costliest · $300/month · your payment · ~$180/month interest');
    expect(L.join(' ')).not.toMatch(/\$300\/month min/);
  });
  test('F5 · with no budget set, a bucket reads “· no limit”, never “/ $0”', () => {
    H.householdFreshB();
    useStore.setState({ expenses: [...(useStore.getState() as any).expenses, { id: 'u', amount: 120, category: 'Utilities', store: 'PG&E', date: '2026-08-10', createdAt: '2026-08-10T09:00:00' }] } as any);
    render(<CashFlowScreen />);
    fireEvent.press(screen.getAllByLabelText('Set your budget')[0]);
    const L = lines();
    expect(L.slice(L.indexOf('Fixed'), L.indexOf('Fixed') + 2)).toEqual(['Fixed', '$120 · no limit']);
    expect(L.join(' ')).not.toMatch(/\/ \$0\b/);
  });
  test('MK-CF-M-022 · MK-CF-M-023 · the future paycheck says it is in today’s dollars and what return and inflation it assumes', () => {
    H.householdBrandNew();
    useStore.setState({ onboardingProfile: { status: 'employed', birthYear: 1981, targetRetirementAge: 67, ri_ss: '2000', ri_ss_receiving: 'no', ri_ss_freq: 'monthly', monthlySpending: 3000,
        incomeSources: ['employment', 'retirement_income'], baseSalary: '6000', salaryMode: 'takehome', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '0' },
      assetAccounts: [{ asset_id: 'k', label: '401(k)', kind: '401k', tax_bucket: 'PRE_TAX', balance: 200_000, target_return: 0.06, retirement_pct: 100 }],
      retirementAssumptions: { expectedReturn: 0.06 } } as any);
    const { futurePaycheck } = require('../../../MoneyKeel/functions/cashflow/future-paycheck');
    const st = useStore.getState() as any;
    const p = futurePaycheck({ op: st.onboardingProfile, accounts: st.assetAccounts, assumptions: st.retirementAssumptions, inflationRate: st.inflationRate, employmentStatus: st.employmentStatus });
    render(<CashFlowScreen />);
    // the line prints the projection's own figures, as the precision standard writes a percent
    // each rate with "/year", the canon's way (canon row 14; CF2-09) (2026-10-27, FX-CF-A — cash-flow_v01’s rows of that date; the old answer is kept beside it as test.failing)
    expect(lines()).toContain(`In today’s dollars · assumes a ${(p.assumes.yearlyReturn * 100).toFixed(2)}%/year return and ${(p.assumes.yearlyInflation * 100).toFixed(2)}%/year inflation`);
    expect(p.assumes.yearlyReturn).toBeGreaterThan(0);
  });
  test('MK-CF-M-078 · retired: the card is YOUR PAYCHECK — OCT, and the pace line spends “your paycheck”, never a surplus (canon row 26)', () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 15, 12), doNotFake: [...H.ONLY_THE_CLOCK] });
    H.householdBrandNew();
    useStore.setState({ onboardingProfile: { status: 'retired', birthYear: '1956', incomeSources: ['retirement_income'], ri_ss: '2400', ri_ss_freq: 'monthly', monthlySpending: '1500',
      spendCats: [{ id: 'ins', label: 'Car insurance', amount: 1_200, bucket: 'nonmonthly', months: [10], tier: 'critical', custom: true }] } } as any);
    render(<CashFlowScreen />);
    const L = lines();
    expect(L).toContain('YOUR PAYCHECK — OCT');
    expect(L.join(' ')).not.toMatch(/SURPLUS — |surplus this month/);
  });
  test('MK-CF-M-060 · BC-02 · the Bill calendar on a first day gives no verdict; a cash on hand typed there is kept, with its day', () => {
    H.householdBrandNew();
    const BillCalendarScreen = require('../BillCalendarScreen').default;
    render(<BillCalendarScreen />);
    expect(lines().join(' ')).not.toMatch(/you stay above zero|Careful — short/);
    fireEvent.changeText(screen.getByLabelText('Cash on hand now, editable'), '3000');
    expect((useStore.getState() as any).billCalendarStart).toEqual({ amount: '3000', date: '2026-08-20' });
    screen.unmount();
    render(<BillCalendarScreen />);
    expect(screen.getByLabelText('Cash on hand now, editable').props.value).toBe('$3,000');   // the money form since 2026-10-27 (DEC-8385); stored 3000 above
    expect(lines().some((l) => l.startsWith('You entered this on Aug 20, 2026; your accounts hold $0.'))).toBe(true);
  });
  test('HM-02 · two expenses logged and no answers at all: Home shows its box', () => {
    useStore.getState().resetAll();
    useStore.setState({ onboardingComplete: true, hideBalances: false, onboardingProfile: null,
      expenses: [{ id: 'a', amount: 40, category: 'Groceries', store: 'Market', date: '2026-08-18', createdAt: '2026-08-18T09:00:00' },
        { id: 'b', amount: 25, category: 'Dining out', store: 'Cafe', date: '2026-08-19', createdAt: '2026-08-19T09:00:00' }] } as any);
    const HomeScreen = require('../HomeScreen').default;
    render(<HomeScreen />);
    const L = lines();
    const i = L.indexOf("THIS MONTH’S CASH FLOW");
    expect(i).toBeGreaterThanOrEqual(0);
    expect(L.slice(i + 4, i + 6)).toEqual(['Outflow (expenses + debt)', '$65']);   // 40 + 25
  });
});

// ── THE LEAD'S FOUR FOLLOW-UPS ON FIX-BILLS' FINDINGS (2026-10-26) ──────────────────────────────────────────────────────────────
describe('2026-10-26 · the Bill calendar’s start, the payoff horizon and one reader of a month’s dated bills', () => {
  const PAY = { status: 'employed', incomeSources: ['employment'], birthYear: '1981', baseSalary: '5000', salaryMode: 'takehome', salaryFreq: 'monthly',
    taxMode: 'manual', manualTaxRate: '0', monthlySpending: '5600' };
  test('1 · no balance given: the verdict says only the refusal — no “Careful — short” worked from a $0 nobody entered', () => {
    // $5,000 in and $5,600 out a month: from $0 every month would read short; no cash is on record, so nothing is projected
    H.householdBrandNew();
    useStore.setState({ onboardingProfile: PAY } as any);
    const BillCalendarScreen = require('../BillCalendarScreen').default;
    render(<BillCalendarScreen />);
    const L = lines();
    expect(screen.getByLabelText('Cash on hand now, editable').props.value).toBe('');
    expect(L).toContain('No balance to start from — nothing is projected.');
    expect(L).toContain('No cash balance on record yet — enter what you have, and the table starts from it.');
    expect(L.join(' ')).not.toMatch(/Careful — short|you stay above zero/);
  });
  test('2 · a checking account holding $0 is an answer: the box reads 0 and the verdict is projected from it', () => {
    // from $0: Aug +5,000 − 5,600 = −600 → short in every month, worked from the $0 on record
    H.householdBrandNew();
    useStore.setState({ onboardingProfile: PAY, assetAccounts: [{ asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'TAXABLE', balance: 0, asset_class: 'cash' }] } as any);
    const BillCalendarScreen = require('../BillCalendarScreen').default;
    render(<BillCalendarScreen />);
    expect(screen.getByLabelText('Cash on hand now, editable').props.value).toBe('$0');   // a $0 balance is an answer, in the money form since 2026-10-27
    const L = lines();
    expect(L.some((l) => l.startsWith('Careful — short in Aug'))).toBe(true);
    expect(L).not.toContain('No balance to start from — nothing is projected.');
  });
  test('3 · payments that get ahead but are still owing after a thousand years: said in words, with what is still owed — never a date', () => {
    // $10,000,000 at 0%, $1 a month: after 12,000 months $10,000,000 − 12,000 = $9,988,000 is still owed
    H.householdDebts();
    useStore.setState({ liabilities: [{ debt_id: 'f', label: 'Family loan', debt_type: 'PERSONAL', remaining_balance: 10_000_000, interest_rate_apr: 0, minimum_monthly_payment: 1 }] } as any);
    render(<CashFlowScreen />);
    tab('Debts');
    const L = lines();
    expect(L.slice(L.indexOf('not within 1,000 years'), L.indexOf('not within 1,000 years') + 2)).toEqual(['not within 1,000 years', 'debt-free']);
    expect(L).toContain('⚠ Not paid off within 1,000 years at this rate — $9,988,000 still owed then. Add extra to make progress.');
    expect(L.join(' ')).not.toMatch(/never at this rate|[A-Z][a-z]{2} \d{4} debt-free/);
  });
  test('4 · the retired card names only the month’s dated bills (datedBillsIn) — never a monthly category', () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 15, 12), doNotFake: [...H.ONLY_THE_CLOCK] });
    H.householdBrandNew();
    useStore.setState({ onboardingProfile: { status: 'retired', birthYear: '1956', incomeSources: ['retirement_income'], ri_ss: '2400', ri_ss_freq: 'monthly', monthlySpending: '1500',
      spendCats: [{ id: 'groc', label: 'Groceries', amount: 400, bucket: 'flexible' },
        { id: 'ins', label: 'Car insurance', amount: 1_200, bucket: 'nonmonthly', months: [10], tier: 'critical', custom: true }] } } as any);
    render(<CashFlowScreen />);
    const L = lines();
    const big = L.find((l) => l.startsWith('− Big bills this month'));
    expect(big).toBe('− Big bills this month (Car insurance)');
  });
  test('4 · a later month’s outflow names a dated bill only — a balance due in full is a debt and is not named as one', () => {
    // September: the $5,000 take-home, the $2,000 budget, and a $1,000 tax bill due in full on Sep 20 — a debt, counted from Debts
    H.householdBrandNew();
    useStore.setState({ onboardingProfile: { ...H.WORKER, monthlySpending: '2000' },
      liabilities: [{ debt_id: 't', label: 'Tax bill', debt_type: 'OTHER', remaining_balance: 1000, interest_rate_apr: 0, minimum_monthly_payment: 0, payment_type: 'due_in_full', payoff_date: '2026-09-20' }] } as any);
    render(<CashFlowScreen />);
    fireEvent.press(screen.getByLabelText('Next month'));
    const L = lines();
    // 2,000 + 1,000 = $3,000 planned out; 5,000 − 3,000 = +$2,000; the outflow's words name no bill
    expect(L.slice(L.indexOf('Planned outflow (expenses + debt)'), L.indexOf('Planned outflow (expenses + debt)') + 2)).toEqual(['Planned outflow (expenses + debt)', '$3,000']);
    expect(L.join(' ')).not.toMatch(/incl\. Tax bill/);
  });
});
