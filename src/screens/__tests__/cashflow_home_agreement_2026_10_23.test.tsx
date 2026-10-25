/** ONE MONTH, ONE NUMBER — HOME'S CASH-FLOW BOX AND THE CASH FLOW TAB (2026-10-23).
 *
 *  The outside re-run of Performance (OpenAI, gap list item 38; screen checks MK-CF-M-052 tenet 4, MK-CF-M-053 tenets 3 and
 *  4) rendered one September on both screens: Home read "Actual expenses so far $2,998 · Left $4,202", Cash flow one tap
 *  away read "= Actual surplus so far +$3,952". Home calculated the month on the screen itself and left out the $250 car
 *  loan already paid. With nothing entered Home also showed the red "Over".
 *
 *  THE FIX: one assembly of the month's inputs (useThisMonthInputs / thisMonthInputs, src/hooks/useCashflowModel.ts, his
 *  rule DEC-0345) handed to one door (MK-CF-O-010 theMonth). Home prints that door's actual block — what came in, what
 *  went out (expenses + the debt paid), what is left — and calculates nothing. A past month's surplus is one producer too
 *  (pastMonthFlow), read by the Cash flow tab's past-month card and by Home's "where did last month's surplus go?" sheet.
 *
 *  Every check below RENDERS both real screens with one household and reads the words a person sees. The households, and
 *  the hand working each one is checked against:
 *    A · the worked September: $7,200 take-home; mortgage $2,400 not paid yet; car loan $250 paid; $2,998 logged.
 *        Out = 250 + 2,998 = $3,248; left = 7,200 − 3,248 = $3,952.
 *    B · A, plus $500 recorded as received. Cash flow's Actual inflow is the take-home (whether a recorded payment counts is
 *        his open ruling, MK-CF-M-051 tenet 1); Home added it on top, $7,700. Both now read $7,200 — one number.
 *    C · A, plus a $6,000 trip: out $9,248, over by $2,048 — "Over $2,048" on Home, "−$2,048" on Cash flow.
 *    D · A, plus $300 paid on a card no longer held ("Other debt payments"): out $3,548, left $3,652.
 *    E · A, plus $150 imported from a card: out $3,398, left $3,802.
 *    F · no income entered, nothing logged: Cash flow shows its two set-up steps; Home shows no pace word and no Left figure.
 *    G · 3 Oct, September's record frozen ($7,200 in, $2,998 expenses, $250 debt paid): September's surplus $3,952 on the
 *        Cash flow tab's past-month card and on Home's sheet ("$3,952 of $3,952 left to assign"); Home offered $4,202.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import * as fs from 'fs';
import * as path from 'path';
import { useStore } from '../../store/useStore';
import { makeMonthlySnapshot } from '../../domain/history';
import { pastMonthFlow, thisMonth, monthOutflow } from '../../../MoneyKeel/functions/cashflow/this-month';
import { money } from '../../domain/_shared/num';   // the app's money writer — the one the hide-balances guard expects

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

// ── reading a screen: every Text in order, as a person reads one line ──────────────────────────────────────────────────
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
const FAKE = ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] as const;
function shoot(name: 'home' | 'cashflow', state: any, today: string, act?: () => void): string[] {
  jest.useFakeTimers({ now: new Date(`${today}T12:00:00`), doNotFake: [...FAKE] });
  try {
    useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
    useStore.setState({ hideBalances: false, ...state } as any);
    const C = name === 'home' ? require('../HomeScreen').default : require('../CashFlowScreen').default;
    const r = render(<C />);
    if (act) act();
    const lines = readLines();
    r.unmount();
    return lines;
  } finally { jest.useRealTimers(); }
}
const after = (L: string[], label: string, n = 1, anchor?: string): string | undefined => {
  const from = anchor ? L.indexOf(anchor) : 0; if (from < 0) return undefined;
  const i = L.indexOf(label, from); return i >= 0 ? L[i + n] : undefined;
};
const dollars = (s: string | undefined) => (s == null ? NaN : Number(s.replace('−', '-').replace(/[^0-9.\-]/g, '')));
/** Home's box, from its band to its last cell */
const homeBox = (L: string[]) => { const i = L.indexOf("THIS MONTH'S CASH FLOW"); expect(i).toBeGreaterThanOrEqual(0); return L.slice(i, i + 12); };

// ── the household (the worked September of MK-CF-O-003 and the re-run's register) ───────────────────────────────────────
const SEPT: any = { nwSetupChoice: 'self',
  onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: '1975', baseSalary: '7200', salaryMode: 'takehome', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '0',
    monthlySpending: '3400', spendCats: [{ id: 'rent', label: 'Rent / Mortgage', amount: 2300, bucket: 'fixed', tier: 'need' },
      { id: 'groceries', label: 'Groceries', amount: 700, bucket: 'flexible', tier: 'need' }, { id: 'dining', label: 'Eating out', amount: 400, bucket: 'flexible', tier: 'flex' }] },
  liabilities: [{ debt_id: 'd1', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 228000, interest_rate_apr: 0.0625, minimum_monthly_payment: 2400, payment_type: 'installment' },
    { debt_id: 'd2', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 250, payment_type: 'installment' }],
  expenses: [{ id: 'e1', amount: 2300, category: 'Rent / Mortgage', store: 'Rent', date: '2026-09-01', createdAt: '2026-09-01' },
    { id: 'e2', amount: 512, category: 'Groceries', store: 'Grocer', date: '2026-09-07', createdAt: '2026-09-07' },
    { id: 'e3', amount: 186, category: 'Eating out', store: 'Diner', date: '2026-09-12', createdAt: '2026-09-12' },
    { id: 'e4', amount: 250, category: 'Debt payment', store: 'Car loan', date: '2026-09-12', createdAt: '2026-09-12' }],
  assetAccounts: [{ asset_id: 'a1', label: 'Checking', kind: 'checking', tax_bucket: 'TAXABLE', balance: 5000, asset_class: 'cash' }] };
const plus = (extra: any[]) => ({ ...SEPT, expenses: [...SEPT.expenses, ...extra] });
const HOUSEHOLDS: Record<string, { state: any; inflow: number; out: number; left: number }> = {
  'A · the worked September': { state: SEPT, inflow: 7200, out: 3248, left: 3952 },
  'B · $500 recorded as received': { state: { ...SEPT, incomes: [{ id: 'i1', amount: 500, date: '2026-09-15', source: 'Gift', createdAt: '2026-09-15' }] }, inflow: 7200, out: 3248, left: 3952 },
  'C · a $6,000 trip — over': { state: plus([{ id: 'e5', amount: 6000, category: 'Travel', store: 'Airline', date: '2026-09-20', createdAt: '2026-09-20' }]), inflow: 7200, out: 9248, left: -2048 },
  'D · $300 paid on a card no longer held': { state: plus([{ id: 'e6', amount: 300, category: 'Debt payment', store: 'Old card', date: '2026-09-14', createdAt: '2026-09-14' }]), inflow: 7200, out: 3548, left: 3652 },
  'E · $150 imported from a card': { state: plus([{ id: 'e7', amount: 150, category: 'Groceries', store: 'Market', date: '2026-09-16', createdAt: '2026-09-16', origin: 'imported' }]), inflow: 7200, out: 3398, left: 3802 },
};

describe('this month: Home prints the Cash flow tab\'s own three figures', () => {
  test('the guard looked: five households, each rendered on both screens', () => {
    expect(Object.keys(HOUSEHOLDS)).toHaveLength(5);
  });
  for (const [name, h] of Object.entries(HOUSEHOLDS)) {
    test(`${name}: in ${money(h.inflow)} · out ${money(h.out)} · left ${h.left < 0 ? '−' : ''}${money(Math.abs(h.left))} on both`, () => {
      const cf = shoot('cashflow', h.state, '2026-09-28');
      const home = shoot('home', h.state, '2026-09-28');
      const box = homeBox(home);
      // Cash flow, as the drawing spells it out: the inflow, each row, = Actual surplus so far
      const cfIn = dollars(after(cf, 'Actual inflow (income (take-home))', 1, 'ACTUAL · SO FAR'));
      const cfLeft = dollars(after(cf, '= Actual surplus so far'));
      expect([cfIn, cfLeft]).toEqual([h.inflow, h.left]);
      // the rows under ACTUAL add up to the surplus (every row shown is a row deducted)
      const a = cf.indexOf('ACTUAL · SO FAR'), z = cf.indexOf('= Actual surplus so far');
      const rowAmounts = cf.slice(a + 2, z).filter((l) => /^[−+]?\$[\d,]+$/.test(l)).map(dollars);
      expect(rowAmounts.reduce((t, v) => t + v, 0)).toBe(h.left);
      // Home: the same three, under its own words
      expect(after(box, 'Income')).toBe(`${money(h.inflow)}`);
      expect(after(box, 'Outflow (expenses + debt)')).toBe(`${money(h.out)}`);
      expect(dollars(after(box, 'Outflow (expenses + debt)'))).toBe(cfIn - cfLeft);
      expect(after(box, h.left >= 0 ? 'Left' : 'Over', 1, 'Outflow (expenses + debt)')).toBe(`${money(Math.abs(h.left))}`);
      // and the old words are gone
      expect(box).not.toContain('Actual expenses so far');
    });
  }
  test('C · an overspent month carries one verdict on both: Home\'s pace word is Over, Cash flow\'s surplus reads −$2,048', () => {
    const h = HOUSEHOLDS['C · a $6,000 trip — over'];
    expect(homeBox(shoot('home', h.state, '2026-09-28'))[1]).toBe('Over');
    expect(after(shoot('cashflow', h.state, '2026-09-28'), '= Actual surplus so far')).toBe('−$2,048');
  });
  test('the function behind both, run on its own: thisMonth gives in $7,200 · out $3,248 · left $3,952 for A', () => {
    const m = thisMonth({ ym: '2026-09', takeHomeMonthly: 7200, debts: SEPT.liabilities, plannedExpenses: 3400, expenses: SEPT.expenses } as any).actual;
    expect([m.inflow, m.outflow, m.surplus]).toEqual([7200, 3248, 3952]);
    expect(m.inflow - m.outflow).toBe(m.surplus);
  });
});

describe('nothing entered: no answer where nothing is known', () => {
  const NOINCOME = { ...SEPT, onboardingProfile: { ...SEPT.onboardingProfile, baseSalary: '' }, expenses: [] };
  test('F · Cash flow shows its two set-up steps, and Home shows no pace word, no share spent and no Left figure — never Over', () => {
    const cf = shoot('cashflow', NOINCOME, '2026-09-28');
    expect(cf).toContain('SET UP YOUR MONTH — 2 STEPS');
    expect(cf).not.toContain('= Actual surplus so far');
    const box = homeBox(shoot('home', NOINCOME, '2026-09-28'));
    expect(box.slice(0, 10)).toEqual(["THIS MONTH'S CASH FLOW", 'day 28 of 30', 'Income', '$0', 'Nothing entered yet. Add your income ›',
      'Outflow (expenses + debt)', '$0', 'Left', '—', box[9]]);
    for (const w of ['Over', '✓ On pace', 'Expenses running fast']) expect(box).not.toContain(w);
    expect(box.some((l) => /% spent/.test(l))).toBe(false);
  });
  test('F, with $500 logged and still no income: Left reads — and the box says no verdict', () => {
    const state = { ...NOINCOME, expenses: [{ id: 'x', amount: 500, category: 'Groceries', store: 'Grocer', date: '2026-09-07', createdAt: '2026-09-07' }] };
    const box = homeBox(shoot('home', state, '2026-09-28'));
    expect(after(box, 'Outflow (expenses + debt)')).toBe('$500');
    expect(after(box, 'Left')).toBe('—');
    expect(box).not.toContain('Over');
  });
});

describe('last month: the surplus Home offers to assign is the one Cash flow shows for that month', () => {
  const OCT = { ...SEPT, monthlySnapshots: { '2026-09': makeMonthlySnapshot({ month: '2026-09', gross_assets: 5000, gross_debt: 242000, income_net: 7200,
    spending: 2998, debt_paid: 250, savings: 3952, allocated: 0, planned_budget: 3400, savings_rate: 54.89, by_category: {}, assets: [], debts: [], captured_at: '2026-09-28T12:00:00Z' }) } };
  test('G · September on 3 Oct: Cash flow\'s past-month card reads $3,952, and Home\'s sheet reads "$3,952 of $3,952 left to assign" (it offered $4,202)', () => {
    const cf = shoot('cashflow', OCT, '2026-10-03', () => fireEvent.press(screen.getByLabelText('Previous month')));
    expect(cf.some((l) => /^SEPTEMBER 2026 .*WHAT ACTUALLY HAPPENED$/.test(l))).toBe(true);
    expect([after(cf, 'Actual inflow'), after(cf, 'Outflow (expenses + debt)'), after(cf, '= Surplus')]).toEqual(['$7,200', '$3,248', '$3,952']);
    const home = shoot('home', OCT, '2026-10-03');
    expect(home).toContain('$3,952 of $3,952 left to assign');
    expect(home.join(' ')).not.toMatch(/\$4,202/);
  });
  test('G · the producer both read: pastMonthFlow gives $7,200 in, $3,248 out, $3,952 left', () => {
    const f = pastMonthFlow(OCT.monthlySnapshots['2026-09'], [], SEPT.expenses, '2026-09');
    expect([f.inflow, f.outflow, f.surplus]).toEqual([7200, 3248, 3952]);
    // no record frozen: the income recorded as received and everything logged in the month
    expect(pastMonthFlow(undefined, [{ amount: 100, date: '2026-09-02' }], SEPT.expenses, '2026-09')).toEqual({ inflow: 100, outflow: 3248, surplus: -3148 });
  });
});

describe('Home calculates the month nowhere', () => {
  test('HomeScreen reads the month from the door and the one assembly; its own month sums are gone', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'HomeScreen.tsx'), 'utf8');
    expect(src).toMatch(/useThisMonthInputs\(\)/);
    expect(src).toMatch(/theMonth\(monthIn\)\.actual/);
    expect(src).toMatch(/pastMonthFlow\(/);
    for (const gone of ['thisMonthNet', 'extraIncome', 'incomeMonthlyGrid', 'Actual expenses so far']) expect([gone, src.includes(gone)]).toEqual([gone, false]);
    const cfSrc = fs.readFileSync(path.join(__dirname, '..', 'CashFlowScreen.tsx'), 'utf8');
    expect(cfSrc).toMatch(/theMonth\(thisMonthInputs\(/);
    expect(cfSrc).toMatch(/pastMonthFlow\(/);
  });
});

/** THE MONTH'S PLANNED EXPENSES — ONE PRODUCER FOR THIS MONTH, THE EXPENSES TAB AND HOME'S RECORD (2026-10-23).
 *  His rules: a bill that lands once a year has its own month (DEC-0002, DEC-0447) — never a twelfth. The household: $700 a
 *  month of groceries and a $1,200 car insurance bill in December. September: This month −$700, Expenses $700 (Everyday
 *  expenses $700, no Once in a while row), Home's frozen September plans $700. It read −$700 on This month and $800 on Expenses
 *  ($100 a month of the December bill). December: $1,900 on both, Once in a while $1,200. A budget whose only line falls in
 *  December reads $0 in September — a set budget, not "not set". */
describe('the month\'s planned expenses: This month, the Expenses tab and Home\'s record read one figure', () => {
  const PLAN = (cats: any[]) => ({ ...SEPT, liabilities: [], expenses: [], monthlySnapshots: {},
    onboardingProfile: { ...SEPT.onboardingProfile, monthlySpending: '0', spendCats: cats } });
  const GROCERIES = { id: 'groceries', label: 'Groceries', amount: 700, bucket: 'flexible', tier: 'need' };
  const INSURANCE = { id: 'ins', label: 'Car insurance', amount: 1200, bucket: 'nonmonthly', months: [12], tier: 'need' };
  const expensesTab = () => fireEvent.press(screen.getByLabelText('Expenses tab'));
  const plannedBlock = (L: string[]) => { const i = L.indexOf('PLANNED EXPENSES'); expect(i).toBeGreaterThanOrEqual(0); return L.slice(i, L.indexOf('ACTUAL EXPENSES')); };
  for (const [when, today, total, rows] of [
    ['September', '2026-09-28', 700, ['Everyday expenses', '$700']],
    ['December', '2026-12-15', 1900, ['Once in a while', '$1,200', 'Everyday expenses', '$700']],
  ] as const) {
    test(`${when}: This month −${money(total)} · Expenses ${money(total)} · Home's record ${money(total)}`, () => {
      const state = PLAN([GROCERIES, INSURANCE]);
      const tm = shoot('cashflow', state, today);
      expect(after(tm, 'your budget', 1, 'Expenses')).toBe(`−${money(total)}`);
      const ex = plannedBlock(shoot('cashflow', state, today, expensesTab));
      expect(ex).toEqual(['PLANNED EXPENSES', `${money(total)}`, ...rows, '= Total', `${money(total)}`]);
      shoot('home', state, today);
      const ym = today.slice(0, 7);
      expect((useStore.getState() as any).monthlySnapshots?.[ym]?.planned_budget).toBe(total);
    });
  }
  test('September with a budget whose only line is the December bill: $0 planned on both tabs — set, never "not set"', () => {
    const state = PLAN([INSURANCE]);
    const tm = shoot('cashflow', state, '2026-09-28');
    expect(after(tm, 'your budget', 1, 'Expenses')).toBe('$0');
    expect(tm.join(' ')).not.toMatch(/haven’t set your budget/);
    const ex = plannedBlock(shoot('cashflow', state, '2026-09-28', expensesTab));
    expect(ex).toEqual(['PLANNED EXPENSES', '$0', '= Total', '$0']);
  });
  test('the producer both read: spendByMonthByBucket puts the $1,200 in December only, and spendByMonth is its sum', () => {
    const { spendByMonthByBucket, spendByMonth } = require('../../domain/budget');
    const op = PLAN([GROCERIES, INSURANCE]).onboardingProfile;
    const g = spendByMonthByBucket(op);
    expect([g[8], g[11]]).toEqual([{ fixed: 0, nonmonthly: 0, flexible: 700 }, { fixed: 0, nonmonthly: 1200, flexible: 700 }]);
    expect(spendByMonth(op)).toEqual(g.map((b: any) => b.fixed + b.nonmonthly + b.flexible));
  });
});

/** THE MONTH'S OUTFLOW COMES FROM ONE FUNCTION — his DEC-0333 (2026-09-12): "agree; ensure compliance with the synonym ruling".
 *  What it means: the month's outflow (expenses + debt paid) is MK-CF-F-194 monthOutflow's, labelled "Outflow (expenses + debt)"
 *  (MK-CF-M-052). Until 2026-10-24 that function made only a past month's (pastMonthFlow); this month's was summed inside
 *  actualMonthFlow, and Home re-added the rows itself. Now this month's comes through monthOutflow too, and Home prints it.
 *  Worked by hand from each household's September: the expenses logged other than debt payments, plus the debt payments logged.
 *  A: (2,300 + 512 + 186) + 250 = $3,248. C: + 6,000 = $9,248. D: + 300 paid on a card no longer held = $3,548. E: + 150 = $3,398. */
describe("DEC-0333: the outflow Cash flow and Home print is monthOutflow's", () => {
  const byHand = (state: any) => {
    const sept = state.expenses.filter((e: any) => String(e.date).startsWith('2026-09'));
    const debt = sept.filter((e: any) => e.category === 'Debt payment').reduce((t: number, e: any) => t + e.amount, 0);
    return { spending: sept.reduce((t: number, e: any) => t + e.amount, 0) - debt, debt_paid: debt };
  };
  test('the guard looked: five households, each on both screens', () => { expect(Object.keys(HOUSEHOLDS)).toHaveLength(5); });
  for (const [name, h] of Object.entries(HOUSEHOLDS)) {
    test(`${name}: monthOutflow gives ${money(h.out)} — the door hands it out, Home prints it, and Cash flow's inflow less its surplus is it`, () => {
      const parts = byHand(h.state);
      const want = monthOutflow(parts, parts.spending + parts.debt_paid);
      expect(want).toBe(h.out);
      const door = thisMonth({ ym: '2026-09', takeHomeMonthly: 7200, debts: SEPT.liabilities, plannedExpenses: 3400, expenses: h.state.expenses } as any).actual;
      expect(door.outflow).toBe(want);
      expect(after(homeBox(shoot('home', h.state, '2026-09-28')), 'Outflow (expenses + debt)')).toBe(money(want));
      const cf = shoot('cashflow', h.state, '2026-09-28');
      expect(dollars(after(cf, 'Actual inflow (income (take-home))', 1, 'ACTUAL · SO FAR')) - dollars(after(cf, '= Actual surplus so far'))).toBe(want);
    });
  }
  test('a past month: the Cash flow tab prints "Outflow (expenses + debt)" as monthOutflow of its frozen record — $2,998 + $250 = $3,248', () => {
    const rec = makeMonthlySnapshot({ month: '2026-09', gross_assets: 5000, gross_debt: 242000, income_net: 7200, spending: 2998, debt_paid: 250,
      savings: 3952, allocated: 0, planned_budget: 3400, savings_rate: 54.89, by_category: {}, assets: [], debts: [], captured_at: '2026-09-28T12:00:00Z' });
    const want = monthOutflow(rec, 0);
    expect(want).toBe(3248);
    const cf = shoot('cashflow', { ...SEPT, monthlySnapshots: { '2026-09': rec } }, '2026-10-03', () => fireEvent.press(screen.getByLabelText('Previous month')));
    expect(after(cf, 'Outflow (expenses + debt)')).toBe(money(want));
  });
  test('the code says so: actualMonthFlow and pastMonthFlow hand the month\'s outflow to monthOutflow, and Home sums no rows', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../../MoneyKeel/functions/cashflow/this-month.ts'), 'utf8');
    const body = (name: string) => { const i = src.indexOf(`export function ${name}(`); return src.slice(i, src.indexOf('\n}\n', i)); };
    expect(body('actualMonthFlow')).toMatch(/const outflow = cash\(monthOutflow\(/);
    expect(body('pastMonthFlow')).toMatch(/const outflow = monthOutflow\(/);
    const home = fs.readFileSync(path.join(__dirname, '..', 'HomeScreen.tsx'), 'utf8');
    expect(home).toMatch(/const shown = flowShown\(cf\.inflow, cf\.outflow\)/);
    expect(home).not.toMatch(/monthShown\(cf\.lines\)/);
  });
});

/** A DEBT COUNTS IN A MONTH ONLY IF A PAYMENT FALLS IN IT — THIS MONTH AND THE GRID, ONE RULE (2026-10-24, CF-FIX; PF-TOOLS,
 *  settling MK-CF-M-001 to 004). This month's planned surplus (MK-CF-M-002) counted every debt's payment; the dated grid —
 *  the later-month card (MK-CF-M-049) and the Bill calendar — counts a debt from its first payment to its payoff, and a
 *  balance due in full once, in its month. The household, 28 Sep 2026: the worked September (take-home $7,200; a $3,400
 *  budget — the mortgage names no property, so the Rent / Mortgage line stays; mortgage $2,400), and
 *    · the $250 car loan's first payment on Oct 28 — next month,
 *    · a $300 personal loan paid off in August,
 *    · a $1,000 tax bill due in full on Sep 20.
 *  September by hand: 7,200 − 3,400 − 2,400 − 1,000 = $400. It read 7,200 − 3,400 − 2,400 − 250 − 300 = +$850 on This month
 *  while the grid's September was $400. October: 7,200 − 3,400 − 2,400 − 250 = $1,150. */
describe('a debt counts in a month only if a payment falls in it: This month\'s planned surplus is the grid\'s month', () => {
  const STARTS = { ...SEPT, liabilities: [
    SEPT.liabilities[0],
    { ...SEPT.liabilities[1], first_payment_date: '2026-10-28', due_day: 28 },
    { debt_id: 'd3', label: 'Personal loan', debt_type: 'PERSONAL', remaining_balance: 0, interest_rate_apr: 0.09, minimum_monthly_payment: 300, payment_type: 'installment', payoff_date: '2026-08-15' },
    { debt_id: 'd4', label: 'Tax bill', debt_type: 'OTHER', remaining_balance: 1000, interest_rate_apr: 0, minimum_monthly_payment: 0, payment_type: 'due_in_full', payoff_date: '2026-09-20' },
  ] };
  const gridOf = (state: any, today: string) => {
    const { theBudgetCounted } = require('../../../MoneyKeel/functions/cashflow/budget-counted');
    const { datedGridOf } = require('../../hooks/useCashflowModel');
    jest.useFakeTimers({ now: new Date(`${today}T12:00:00`), doNotFake: [...FAKE] });
    try {
      const counted = theBudgetCounted({ profile: state.onboardingProfile, accounts: state.assetAccounts ?? [], debts: state.liabilities }).profile;
      return datedGridOf(counted, state.liabilities, undefined, 0);
    } finally { jest.useRealTimers(); }
  };
  test('September: This month\'s planned surplus +$400 = the grid\'s September; October\'s card $1,150 = the grid\'s October', () => {
    const tm = shoot('cashflow', STARTS, '2026-09-28');
    const planned = tm.slice(tm.indexOf('PLANNED · SEPTEMBER'), tm.indexOf('= Planned surplus') + 2);
    expect(planned[1]).toBe('+$400');
    expect(after(tm, '= Planned surplus')).toBe('+$400');
    // the rows: the mortgage and the tax bill; no car loan (its first payment is next month) and no personal loan (paid off)
    expect(planned).toContain('Tax bill — due in full');
    expect(planned).toContain('−$1,000');
    expect(planned.filter((l) => /^(Car loan|Personal loan)$/.test(l))).toEqual([]);
    const grid = gridOf(STARTS, '2026-09-28');
    expect(grid.cells[0].net).toBe(7_200 - 3_400 - 2_400 - 1_000);
    expect(dollars(after(tm, '= Planned surplus'))).toBe(grid.cells[0].net);
    // the later-month card, one tap on: October's plan, from the grid — the car loan's first payment is in it
    const oct = shoot('cashflow', STARTS, '2026-09-28', () => fireEvent.press(screen.getByLabelText('Next month')));
    expect(after(oct, '= Planned surplus')).toBe('$1,150');
    expect(grid.cells[1].net).toBe(7_200 - 3_400 - 2_400 - 250);
    expect(dollars(after(oct, '= Planned surplus'))).toBe(grid.cells[1].net);
  });
  test('the Expenses tab, September: the recurring rows and the radar follow the same rule', () => {
    const ex = shoot('cashflow', STARTS, '2026-09-28', () => fireEvent.press(screen.getByLabelText('Expenses tab')));
    // the recurring rows: the mortgage only — the car loan's first payment is in October (it read $2,650: Mortgage, Car loan)
    const rec = ex.indexOf('MONTHLY RECURRING EXPENSES');
    expect(ex.slice(rec, rec + 5)).toEqual(['MONTHLY RECURRING EXPENSES', '$2,400', 'Mortgage', 'same every month', '$2,400']);
    // the radar: the tax bill due in full this month, at its balance (it was not listed: a lump has no monthly payment)
    const r = ex.indexOf('BIG-TICKET RADAR');
    expect(ex.slice(r, r + 6)).toEqual(['BIG-TICKET RADAR', 'Tax bill payment', 'DEBT', 'entered on the Debts tab · counted as an expense', '$1,000',
      'Your mortgage never appears here. It is the same every month, and a warning you see every month stops being a warning.']);
  });
  test('the rule itself, month by month: paysInMonth and paymentInMonth on the four debts (4 of 4)', () => {
    const { paysInMonth, paymentInMonth } = require('../../domain/debt');
    const [mortgage, car, personal, tax] = STARTS.liabilities;
    expect([mortgage, car, personal, tax].map((d: any) => [paymentInMonth(d, '2026-09'), paymentInMonth(d, '2026-10')]))
      .toEqual([[2_400, 2_400], [0, 250], [0, 0], [1_000, 0]]);
    expect([paysInMonth(car, '2026-09'), paysInMonth(personal, '2026-08'), paysInMonth(tax, '2026-09')]).toEqual([false, true, true]);
  });
});

/** THE RETIRED VIEW'S SURPLUS HAS ITS OWN NUMBER (2026-10-24, CF-FIX; PF-TOOLS, settling MK-CF-M-001 to 004). The pace line's
 *  "Spent $X of $Y surplus this month" printed $Y — the paycheck's surplus this month — under MK-CF-M-049, the later-month
 *  card's planned surplus. It is MK-CF-M-078 now, the same number the paycheck card's hero prints: $2,400 of Social Security,
 *  nothing to draw on, no big bill this month — $2,400 in both places. */
test('retired, this month: the paycheck card and the pace line print one surplus, MK-CF-M-078, and nothing under MK-CF-M-049', () => {
  const { figuresPrinted, resetFiguresPrinted } = require('../../components/figure');
  resetFiguresPrinted();
  const RETIRED = { nwSetupChoice: 'self', onboardingProfile: { status: 'retired', birthYear: '1956', incomeSources: ['retirement_income'],
    ri_ss: '2400', ri_ss_freq: 'monthly', monthlySpending: '1500' }, liabilities: [], assetAccounts: [],
    expenses: [{ id: 'r1', amount: 600, category: 'Groceries', store: 'Grocer', date: '2026-09-10', createdAt: '2026-09-10' }] };
  const L = shoot('cashflow', RETIRED, '2026-09-28');
  expect(L).toContain('Spent $600 of $2,400 surplus this month');
  const printed = figuresPrinted().filter((p: any) => !p.spoken);
  const ours = printed.filter((p: any) => p.id === 'MK-CF-M-078').map((p: any) => p.text);
  expect(ours.length).toBeGreaterThanOrEqual(2);                     // the guard looked: the hero and the pace line
  expect(new Set(ours)).toEqual(new Set(['$2,400']));
  expect(printed.filter((p: any) => p.id === 'MK-CF-M-049')).toEqual([]);
});
