/** CASH FLOW FIX WAVE, 2026-10-27 (FX-CF-A) — the round-2 drawing match's Cash flow defects, the lead's rulings R1, R3, R5, R6, and
 *  workplan rows 106, 360 and 363. Each case is rendered on the day it is worked, in the household it is worked in, and compared with
 *  every figure as printed. Where an answer moved, the old answer is kept beside it as test.failing, so the change is on record.
 *  Every figure below is worked by hand in the comment beside it. The dated rows are on cash-flow_v01, bill-calendar_v02,
 *  monthly-income_v02 and the new cash-flow-retired_v01 (READ THIS FIRST, 2026-10-27).
 */
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { useStore } from '../../store/useStore';
import { builtLines, drawingLines, normExact, firstDifference } from '../../testing/mockMatch';
import * as H from '../../testing/cashflowDrawing';
import { encryptWithKey, decryptWithKey } from '../../services/dataCrypto';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

const ROOT = path.join(__dirname, '..', '..', '..');
const CLOCK = ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] as const;
afterEach(() => { jest.useRealTimers(); mockParams = {}; });
const on = (day: string) => jest.useFakeTimers({ now: new Date(`${day}T12:00:00`), doNotFake: [...CLOCK] });
const set = (state: any) => { useStore.getState().resetAll(); useStore.setState({ onboardingComplete: true, hideBalances: false, ...state } as any); };
const show = (name = 'CashFlowScreen') => { const C = require(`../${name}`).default; render(<C />); };
const tab = (t: string) => fireEvent.press(screen.getByLabelText(new RegExp(`^${t} tab`)));
const lines = () => builtLines(screen.toJSON());
const after = (L: string[], label: string, k = 1) => { const i = L.indexOf(label); expect([label, i >= 0]).toEqual([label, true]); return L[i + k]; };
const flat = (n: any) => StyleSheet.flatten(n?.props?.style) ?? {};
const textNode = (t: string) => screen.getAllByText(t)[0];
const money = (s: string) => Number(s.replace(/[^0-9.]/g, ''));
const cents = (xs: string[]) => Math.round(xs.reduce((t, x) => t + money(x) * 100, 0));

// ── the households ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** cash-flow_v01 frame A's household, with a $6.50 coffee and the HELOC and card payments logged as $200.40 each (Aug 20, 2026). */
const CENTS_HOUSEHOLD = { onboardingProfile: { ...H.WORKER, ...H.BUDGET_BY_CATEGORY }, liabilities: [...H.DEBTS, ...H.RADAR],
  expenses: ([['Mortgage', 2000, 'Debt payment'], ['HELOC', 200.4, 'Debt payment'], ['Credit card debt payment', 200.4, 'Debt payment'],
    ['Amazon', 300, 'Other'], ['Coffee', 6.5, 'Other'], ['Shell', 200, 'Other'], ['Target', 700, 'Other', 'imported'], ['Costco', 500, 'Other', 'imported']] as any[])
    .map(([st, a, c, o], i) => ({ id: `x${i}`, amount: a, category: c, store: st, date: '2026-08-20', createdAt: '2026-08-20', ...(o ? { origin: o } : {}) })) };
/** The register's September household (cash-flow_v01, 2026-10-25 lines): $7,200 take-home; a $3,400 budget, $2,300 of it Rent / Mortgage;
 *  a $2,400 mortgage the person never placed on a property; a $250 car loan. */
const REGISTER: any = { nwSetupChoice: 'self',
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
/** The same household with a rental house losing $500/month ($1,000 rent, $1,500 running costs) — the 2026-10-25 line's household. */
const RENTAL = { asset_id: 'rh', label: 'Rental house', kind: 'real_estate', tax_bucket: 'PROPERTY', balance: 300000, re_use: 'rental' };
const LOSS = { ...REGISTER, onboardingProfile: { ...REGISTER.onboardingProfile, incomeSources: ['employment', 'rental'], rentals: [{ type: 'long', income: 1000, expenses: 1500, property_id: 'rh' }] },
  assetAccounts: [...REGISTER.assetAccounts, RENTAL] };
/** The same, with the person having put the mortgage on the rental themselves (the mortgage names its property). */
const LOSS_PLACED = { ...LOSS, liabilities: [{ ...REGISTER.liabilities[0], property_id: 'rh' }, REGISTER.liabilities[1]] };
/** The 2026-10-25 line's rate-never-entered household: a Lake house mortgage, no rate, $1,900/month; a $14,000 car loan at 6.90%, $250. */
const LAKE = { onboardingProfile: REGISTER.onboardingProfile, assetAccounts: [{ asset_id: 'lh', label: 'Lake house', kind: 'real_estate', tax_bucket: 'PROPERTY', balance: 400000, re_use: 'second' }],
  liabilities: [{ debt_id: 'lm', label: 'Lake house mortgage', debt_type: 'MORTGAGE', remaining_balance: 300000, minimum_monthly_payment: 1900, property_id: 'lh', payment_type: 'installment' },
    { debt_id: 'car', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 250, payment_type: 'installment' }] };

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('CF2-06 (R5) · rows round once: rows to the cent, and the totals over them to the cent, adding up as printed', () => {
  const expensesTab = () => { on('2026-08-20'); set(CENTS_HOUSEHOLD); show(); tab('Expenses'); return lines(); };
  test('two $200.40 payments read $200.40 + $200.40 = $400.80; by hand $300.00 + $6.50 + $200.00 = $506.50; all sources $2,107.30', () => {
    const L = expensesTab();
    expect(after(L, 'DEBT PAYMENTS COUNTED AS EXPENSES')).toBe('$400.80');
    expect(after(L, 'HELOC payment', 2)).toBe('$200.40');
    expect(after(L, 'ENTERED BY HAND')).toBe('$506.50');
    expect(after(L, '= Entered by hand · 3 items')).toBe('$506.50');
    expect(after(L, 'IMPORTED FROM YOUR CARD')).toBe('$1,200.00');
    expect(after(L, 'ACTUAL EXPENSES')).toBe('$2,107.30');
    expect(after(L, '= Actual expenses, all sources')).toBe('$2,107.30');
    // as printed, both ways: the rows make each total, and the three totals make all sources
    const at = (label: string) => L.indexOf(label);
    const block = (from: string, to: string) => L.slice(at(from) + 2, at(to)).filter((x) => /^\$[\d,]+\.\d\d$/.test(x));
    expect(cents(block('ENTERED BY HAND', '= Entered by hand · 3 items'))).toBe(50650);
    expect(cents(block('DEBT PAYMENTS COUNTED AS EXPENSES', '= Actual expenses, all sources'))).toBe(40080);
    expect(50650 + 120000 + 40080).toBe(cents(['$2,107.30']));
    // the radar's two payments are the payments above, to the cent
    const radar = L.slice(at('BIG-TICKET RADAR'));
    expect(radar.filter((x) => x === '$200.40')).toHaveLength(2);
  });
  test.failing('the old answer, kept: each payment rounded to the dollar alone — $200 + $200 under $401', () => {
    const L = expensesTab();
    expect(after(L, 'DEBT PAYMENTS COUNTED AS EXPENSES')).toBe('$401');
    expect(after(L, 'HELOC payment', 2)).toBe('$200');
  });
  test('This month keeps whole dollars that add up to its surplus: by hand −$507 (the $6.50 shares the dollar), and Home is not touched', () => {
    on('2026-08-20'); set(CENTS_HOUSEHOLD); show();
    const L = lines();
    expect(after(L, 'Expenses entered by hand')).toBe('−$507');
  });
});

describe('CF2-02 · a payment received prints to the cent from its full value, and bold', () => {
  test('$3,100.40 reads +$3,100.40 at weight 700 — it read +$3,100.00, rounded to the dollar then given cents', () => {
    on('2026-08-20'); H.householdIncome();
    useStore.setState({ incomes: [{ id: 'i2', date: '2026-08-15', source: 'Paycheck', amount: 3100.4 }, { id: 'i1', date: '2026-08-01', source: 'Paycheck', amount: 3100 }] } as any);
    show(); tab('Income');
    const L = lines();
    expect(after(L, 'Aug 15 · Paycheck')).toBe('+$3,100.40');
    expect(after(L, 'Aug 1 · Paycheck')).toBe('+$3,100.00');
    expect(flat(textNode('+$3,100.40')).fontWeight).toBe('700');
  });
});

describe('CF2-13 (R3) · every dollar once: a mortgage the person never placed beside a Rent / Mortgage line', () => {
  const planned = (state: any) => { on('2026-09-28'); set(state); show(); return lines(); };
  test('the rental household: 6,700 − 2,400 − 250 − 1,100 = +$2,950; actual 6,700 − 2,300 − 250 − 698 = +$3,452', () => {
    const L = planned(LOSS);
    expect(after(L, 'PLANNED · SEPTEMBER')).toBe('+$2,950');
    expect(after(L, 'your budget')).toBe('−$1,100');
    expect(after(L, '= Planned surplus')).toBe('+$2,950');
    expect(L).toContain('Your Rent / Mortgage budget line is not counted here: your mortgage, Mortgage, is in Debts and is counted from there. Place it on your home in Net worth, so we know they are the same.');
    expect(after(L, 'ACTUAL · SO FAR')).toBe('+$3,452');
    expect(after(L, 'Expenses entered by hand')).toBe('−$698');
  });
  test.failing('the old answer, kept: the app put the mortgage on the rental by itself, and the line came back — +$650', () => {
    const L = planned(LOSS);
    expect(after(L, 'PLANNED · SEPTEMBER')).toBe('+$650');
  });
  test('placed on the rental by the person, the mortgage is the rental’s and the line is rent again: 6,700 − 2,400 − 250 − 3,400 = +$650', () => {
    const L = planned(LOSS_PLACED);
    expect(after(L, 'PLANNED · SEPTEMBER')).toBe('+$650');
    expect(L.join(' ')).not.toMatch(/Rent \/ Mortgage budget line is not counted/);
  });
  test('the register household itself (no property at all) is unchanged: +$3,450', () => {
    const L = planned(REGISTER);
    expect(after(L, 'PLANNED · SEPTEMBER')).toBe('+$3,450');
  });
});

describe('CF2-12 (R6) · nothing ranked on a rate that is not entered', () => {
  const debts = (snowball = false) => { on('2026-09-28'); set(LAKE); show(); tab('Debts'); if (snowball) fireEvent.press(screen.getByText('Snowball')); return lines(); };
  test('highest rate first: the car loan, then the Lake house mortgage; no “pay first”, no “the costliest”', () => {
    const L = debts();
    const at = L.indexOf('YOUR DEBTS');
    expect(L.slice(at + 1, at + 3)).toEqual(['Car loan', '6.90% · $250/month min · ~$81/month interest']);   // 14,000 × 6.90% ÷ 12 = $80.50
    expect(L.slice(at + 4, at + 6)).toEqual(['Lake house mortgage', 'rate not entered · on Lake house · $1,900/month min']);
    expect(L).not.toContain('pay first');
    expect(L.join(' ')).not.toMatch(/the costliest/);
  });
  test.failing('the old answer, kept: the mortgage with no rate ranked first and marked “pay first”', () => {
    const L = debts();
    const at = L.indexOf('YOUR DEBTS');
    expect(L.slice(at + 1, at + 3)).toEqual(['Lake house mortgage', 'pay first']);
  });
  test('smallest balance first ranks on balances, which are entered: the car loan reads “pay first”, still not “the costliest”', () => {
    const L = debts(true);
    const at = L.indexOf('YOUR DEBTS');
    expect(L.slice(at + 1, at + 3)).toEqual(['Car loan', 'pay first']);
    expect(L.join(' ')).not.toMatch(/the costliest/);
  });
});

describe('CF2-08 · a past month with no record says one line, never two that disagree', () => {
  test('July, before anything was logged (frame A’s household, all logged on Aug 20): $0 · $0 · +$0 and only “predates your tracking”', () => {
    on('2026-08-20'); set(CENTS_HOUSEHOLD); show();
    fireEvent.press(screen.getByLabelText('Previous month'));
    const L = lines();
    expect(L).toContain('Nothing recorded for this month — it predates your tracking.');
    expect(L).not.toContain('Added up from what is logged for this month — it changes if more is logged.');
    // nothing recorded is not $0 (R27, 2026-11-02, FX-CF-B; cash-flow_v01 row of that day): each line reads —
    expect(after(L, 'Actual inflow')).toBe('—');
    expect(after(L, '= Surplus')).toBe('—');
  });
  test.failing('CF2-08, as it read until 2026-11-02: "$0 · $0 · +$0" for a month nothing was recorded in', () => {
    on('2026-08-20'); set(CENTS_HOUSEHOLD); show();
    fireEvent.press(screen.getByLabelText('Previous month'));
    expect(after(lines(), '= Surplus')).toBe('+$0');
  });
  test('August seen from September, logged but never saved: only “Added up from what is logged …”', () => {
    on('2026-09-10'); set(CENTS_HOUSEHOLD); show();
    fireEvent.press(screen.getByLabelText('Previous month'));
    const L = lines();
    expect(L).toContain('Added up from what is logged for this month — it changes if more is logged.');
    expect(L).not.toContain('Nothing recorded for this month — it predates your tracking.');
  });
  test.failing('the old answer, kept: both lines on July', () => {
    on('2026-08-20'); set(CENTS_HOUSEHOLD); show();
    fireEvent.press(screen.getByLabelText('Previous month'));
    expect(lines()).toContain('Added up from what is logged for this month — it changes if more is logged.');
  });
});

describe('CF2-07 · a later month’s surplus carries its sign, as This month’s does', () => {
  test('the register household’s October: = Planned surplus +$3,450 (7,200 − 3,750)', () => {
    on('2026-09-28'); set(REGISTER); show();
    fireEvent.press(screen.getByLabelText('Next month'));
    const L = lines();
    expect(after(L, 'Planned outflow (expenses + debt)')).toBe('$3,750');
    expect(after(L, '= Planned surplus')).toBe('+$3,450');
  });
  test.failing('the old answer, kept: no sign — “= Planned surplus $3,450”', () => {
    on('2026-09-28'); set(REGISTER); show();
    fireEvent.press(screen.getByLabelText('Next month'));
    expect(after(lines(), '= Planned surplus')).toBe('$3,450');
  });
});

describe('CF2-09 · YOUR FUTURE PAYCHECK writes each rate with “/year” (canon row 14)', () => {
  test('“assumes a 5.91%/year return and 2.50%/year inflation” — never “… inflation a year”', () => {
    on('2026-09-28'); set(REGISTER); show();
    const line = lines().find((l) => /^In today’s dollars · assumes/.test(l));
    expect(line).toMatch(/^In today’s dollars · assumes an? \d+\.\d\d%\/year return and \d+\.\d\d%\/year inflation$/);
  });
});

describe('CF2-01 · the month switcher as drawn: ‹ › at 17, the month at 13', () => {
  test('both sizes on the scale, read off the rendered style', () => {
    on('2026-08-20'); H.householdWithData(); show();
    expect(flat(screen.getAllByText('‹')[0]).fontSize).toBe(17);
    expect(flat(screen.getAllByText('August 2026').find((n: any) => flat(n).fontWeight === '800')).fontSize).toBe(13);
  });
});

describe('CF2-03, CF2-04, CF2-05 · Debts as frame 6 draws it', () => {
  test('the total line is payments only; “+ Add debt account” is under the list, before PROGRESS; no edit hint', () => {
    on('2026-08-20'); H.householdDebts(); show(); tab('Debts');
    const L = lines();
    expect(L).toContain('across 2 debts · $410/month in payments');
    expect(L.join(' ')).not.toMatch(/~\$113\/month interest/);
    expect(L.indexOf('+ Add debt account')).toBe(L.indexOf('Log a payment ›') + 1);
    expect(L.indexOf('+ Add debt account')).toBeLessThan(L.indexOf('PROGRESS'));
    expect(L.join(' ')).not.toMatch(/Tap a debt to edit/);
  });
  test.failing('the old answer, kept: “· ~$113/month interest” on the total, the door after PROGRESS, and the edit hint', () => {
    on('2026-08-20'); H.householdDebts(); show(); tab('Debts');
    expect(lines()).toContain('across 2 debts · $410/month in payments · ~$113/month interest');
  });
});

describe('CF2-11 · the budget editor: its share to two decimals, its doors in ›, its marks typographic', () => {
  test('frame A’s household: 2,000 ÷ 5,000 = 40.00% of take-home; “Set your budget ›”, “+ Add ›”', () => {
    on('2026-08-20'); H.householdWithData();
    const Budget = require('../BudgetScreen').default; render(<Budget embedded initialTab="Budget" />);
    const L = lines();
    expect(L).toContain('Your expense budget is 40.00% of take-home pay.');
    expect(L).toContain('Set your budget ›');
    expect(L).toContain('+ Add ›');
    expect(L.join(' ')).not.toMatch(/→/);
  });
});

describe('BC2-01, BC2-02 · the Bill calendar’s box and month names', () => {
  test('the first day: the cash on hand box is empty, with no grey “$0” sample; the month names are 15 regular', () => {
    on('2026-10-02'); set({ onboardingProfile: {} }); show('BillCalendarScreen');
    const box = screen.getByLabelText('Cash on hand now, editable');
    expect(box.props.value).toBe('');
    expect(box.props.placeholder).toBeUndefined();
    expect(flat(screen.getByText('Oct')).fontSize).toBe(15);
    expect(flat(screen.getByText('Oct')).fontWeight).toBe('400');
  });
});

describe('R1 (DEC-8839) · every Cash flow box title on a dark-green bar', () => {
  test('Income: THIS MONTH, YOUR SOURCES and RECEIVED THIS MONTH print on the dark-green fill', () => {
    on('2026-08-20'); H.householdIncome(); show(); tab('Income');
    for (const t of ['THIS MONTH', 'YOUR SOURCES', 'RECEIVED THIS MONTH']) {
      const n: any = screen.getByText(t);
      expect([t, flat(n).color]).toEqual([t, '#FFFFFF']);
      let p = n.parent; let fill = '';
      while (p && !fill) { fill = flat(p).backgroundColor ?? ''; p = p.parent; }
      expect([t, fill]).toEqual([t, '#085041']);
    }
  });
});

describe('Workplan row 106 · the expense door has its own words (canon row 27)', () => {
  test('no Cash flow tab prints “Add by hand” — the account door’s words — and the expense door reads “Log an expense”', () => {
    on('2026-08-20'); H.householdFreshD(); show();
    const seen: string[] = [];
    for (const t of ['This month', 'Income', 'Expenses', 'Debts']) { tab(t); seen.push(...lines()); }
    expect(seen.length).toBeGreaterThan(60);   // it looked at the four tabs
    expect(seen.filter((l) => /\bAdd by hand\b/i.test(l))).toEqual([]);
    expect(seen).toContain('Log an expense');
    expect(seen).toContain('＋ Expense');
  });
  test('the canon carries row 27, and its retired wording is read by the guard', () => {
    const md = fs.readFileSync(path.join(ROOT, 'MoneyKeel/documents/standards/moneykeel_naming_spec_calculation-vocabulary_v01.md'), 'utf8');
    expect(md).toMatch(/^\| 27 \| The door to add an expense yourself/m);
    // its Retired column, read as the canon guard reads it (entries split by " · "; a dash entry is a note, not a phrase)
    const cells = md.split('\n').find((l) => l.startsWith('| 27 |'))!.split('|').slice(1, -1).map((c) => c.trim());
    expect(cells).toHaveLength(7);
    expect(cells[4].split(' · ')[0]).toBe('Add an expense by hand');
  });
});

describe('Workplan row 363 · the Bill calendar’s typed cash on hand round-trips through the cloud copy', () => {
  test('it is a synced field, and a cloud copy brings back the figure and its day', () => {
    // the list the app writes to the cloud, read from the file, never from memory (moved beside the profile's merge,
    // design v02 of the cloud copy of the master record, 2026-11-12)
    const src = fs.readFileSync(path.join(ROOT, 'src/services/sync/profileMerge.ts'), 'utf8');
    const list = src.slice(src.indexOf('const SYNC_FIELDS = ['), src.indexOf('] as const;', src.indexOf('const SYNC_FIELDS')));
    const fields = [...list.matchAll(/'([A-Za-z]+)'/g)].map((m) => m[1]);
    expect(fields.length).toBeGreaterThanOrEqual(45);
    expect(fields).toContain('billCalendarStart');
    // what saveUserData sends: the picked fields, JSON-cleaned and encrypted; what loadUserData hands back: decrypted
    on('2026-10-25');
    set({ onboardingProfile: { status: 'employed', incomeSources: ['employment'], baseSalary: '6000', salaryMode: 'takehome', salaryFreq: 'monthly', monthlySpending: '3000' },
      assetAccounts: [{ asset_id: 'c', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 5000, asset_class: 'cash' }] });
    useStore.getState().setBillCalendarStart({ amount: '12000', date: '2026-10-25' });
    const state = useStore.getState() as any;
    const picked: Record<string, any> = {}; for (const k of fields) picked[k] = state[k];
    const KEY = 'c'.repeat(64);
    const back = decryptWithKey(encryptWithKey(JSON.parse(JSON.stringify(picked)), KEY), KEY);
    expect(back.billCalendarStart).toEqual({ amount: '12000', date: '2026-10-25' });
    // a fresh phone: the store starts empty, then the cloud copy lands
    useStore.getState().resetAll();
    expect((useStore.getState() as any).billCalendarStart).toBeNull();
    useStore.getState().loadFromCloud(back);
    useStore.setState({ onboardingComplete: true } as any);
    jest.useRealTimers(); on('2026-10-27');
    show('BillCalendarScreen');
    expect(screen.getByLabelText('Cash on hand now, editable').props.value).toBe('$12,000');   // the money box's own form (MI2-01, FX-SHARED, 2026-10-27)
    expect(lines()).toContain('You entered this on Oct 25, 2026; your accounts hold $5,000. The table carries forward what you entered — edit it and the End column recalculates from there.');
  });
});

describe('Workplan row 360 · Cash flow when retired, drawn from the build (cash-flow-retired_v01)', () => {
  const RETIRED = { onboardingProfile: { status: 'retired', birthYear: '1956', incomeSources: ['retirement_income'], ri_ss: '2400', ri_ss_receiving: 'yes', ri_ss_freq: 'monthly', monthlySpending: '3000',
      spendCats: [{ id: 'ins', label: 'Car insurance', amount: 1200, bucket: 'nonmonthly', months: [12], tier: 'critical', custom: true }] },
    assetAccounts: [{ asset_id: 'b', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 100000, retirement_pct: 100 },
      { asset_id: 'k', label: '401(k)', kind: '401k', tax_bucket: 'PRE_TAX', balance: 300000, retirement_pct: 100 },
      { asset_id: 'c', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 20000, asset_class: 'cash' }],
    expenses: [{ id: 'e1', amount: 640, category: 'Groceries', store: 'Grocer', date: '2026-10-10', createdAt: '2026-10-10' }, { id: 'e2', amount: 410, category: 'Other', store: 'Pharmacy', date: '2026-10-20', createdAt: '2026-10-20' }] };
  const FILE = 'MoneyKeel/documents/cashflow/moneykeel_pres_mock_cash-flow-retired_v01.html';
  const CHROME = new Set(['9:41', '▮▮▮ ⌁', '▦ Menu', 'Money', 'Keel', '◉', '⚙', 'i']);
  const phone = (n: number) => {
    const L = drawingLines(FILE);
    const st = L.map((l, i) => (l === '9:41' ? i : -1)).filter((i) => i >= 0);
    expect(st).toHaveLength(2);
    const seg = L.slice(st[n], st[n + 1] ?? L.length);
    return seg.slice(0, seg.indexOf('Home')).filter((l) => !CHROME.has(l));
  };
  test('the drawing opens with what he approved before, his words, and what is new (DEC-8891: “I do not want to reviews screens in blind.”)', () => {
    const html = fs.readFileSync(path.join(ROOT, FILE), 'utf8');
    const top = html.slice(html.indexOf('READ THIS FIRST'), html.indexOf('<div class="eyebrow">'));
    expect(top.indexOf('1 · WHAT HE APPROVED BEFORE FOR THIS SCREEN')).toBeGreaterThan(0);
    expect(top.indexOf('2 · HIS FEEDBACK, IN HIS WORDS')).toBeGreaterThan(top.indexOf('1 · WHAT HE APPROVED'));
    expect(top.indexOf('3 · EXACTLY WHAT IS NEW')).toBeGreaterThan(top.indexOf('2 · HIS FEEDBACK'));
    for (const d of ['DEC-0440', 'DEC-2164', 'DEC-4105', 'DEC-8839', 'DEC-8891']) expect(top).toContain(d);
  });
  test('phone A · every drawn line and figure is the build’s, in order, both ways (Oct 27, 2026)', () => {
    on('2026-10-27'); set(RETIRED); show();
    expect(firstDifference(normExact(phone(0)), normExact(lines()))).toBe('');
    // the figures add up: $2,400 + $2,025 = $4,425; $640 + $410 = $1,050 spent, 24% of it; the 27th of 31 days, 87% gone
    expect(lines()).toContain('Spent $1,050 of your $4,425 paycheck this month');
  });
  test('phone B · retired, nothing entered: every section keeps its heading, says why and offers its door', () => {
    on('2026-10-27'); set({ onboardingProfile: { status: 'retired', incomeSources: [] } }); show();
    const L = lines();
    expect(firstDifference(normExact(phone(1)), normExact(L))).toBe('');
    expect(L).toContain('Nothing entered yet. Add your accounts ›');
    expect(L).toContain('Nothing entered yet. Add your guaranteed income ›');
    expect(L.join(' ')).not.toMatch(/tap a month for detail/);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// ROUND 3, 2026-10-31 (FX-CF-A) — BC3-01 (R12), CF3-01 to CF3-08. Dated rows: cash-flow_v01 and bill-calendar_v02, 2026-10-31.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('BC3-01 (R12) · nothing projected from a $0 nobody typed', () => {
  // $7,200 in at 0% and $4,220 out a month, and NO cash account: the box is empty
  const PLAN = { onboardingProfile: { status: 'employed', incomeSources: ['employment'], baseSalary: '7200', salaryMode: 'takehome', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '0', monthlySpending: '4220' } };
  const months = () => { const L = lines(); const at = L.indexOf('Oct'); return L.slice(at, at + 4); };
  test('box empty: October In +$7,200 · Out −$4,220 · End “—”; no month flagged short; the refusal is said', () => {
    on('2026-10-02'); set(PLAN); show('BillCalendarScreen');
    expect(screen.getByLabelText('Cash on hand now, editable').props.value).toBe('');
    expect(months()).toEqual(['Oct', '+$7,200', '−$4,220', '—']);
    expect(lines().filter((l) => /^\$[\d,]+$/.test(l))).toEqual([]);                 // not one End printed
    expect(lines().join(' ')).not.toMatch(/ short|IF YOU CAN/);
    expect(lines()).toContain('No balance to start from — nothing is projected.');
  });
  test.failing('the old answer, kept: Ends projected from the empty box — October $2,980 (0 + 7,200 − 4,220)', () => {
    on('2026-10-02'); set(PLAN); show('BillCalendarScreen');
    expect(months()).toEqual(['Oct', '+$7,200', '−$4,220', '$2,980']);
  });
  test('a $0 typed is an answer: 0 + 7,200 − 4,220 = $2,980, then $5,960 in November', () => {
    on('2026-10-02'); set(PLAN); show('BillCalendarScreen');
    fireEvent.changeText(screen.getByLabelText('Cash on hand now, editable'), '0');
    const L = lines();
    expect(months()).toEqual(['Oct', '+$7,200', '−$4,220', '$2,980']);
    expect(L.slice(L.indexOf('Nov'), L.indexOf('Nov') + 4)).toEqual(['Nov', '+$7,200', '−$4,220', '$5,960']);
  });
});

describe('CF3-01, CF3-02, CF3-03, CF3-08 · the budget editor', () => {
  const editor = () => { const Budget = require('../BudgetScreen').default; render(<Budget embedded initialTab="Budget" />); return lines(); };
  test('frame A: the card under This month’s bar, “PLANNED · AUGUST +$350”; the surplus 15/800 in the gain green; $300 left in the gain green', () => {
    on('2026-08-20'); H.householdWithData();
    const L = editor();
    expect(after(L, 'PLANNED · AUGUST')).toBe('+$350');                                 // 5,000 − 2,000 − 2,650
    expect(L).not.toContain('YOUR BUDGET');
    const plus = screen.getAllByText('+$350').map((n: any) => flat(n));
    expect(plus).toHaveLength(2);                                                       // the bar's total and the closing row
    const total = plus.find((st: any) => st.color !== '#FFFFFF')!;
    expect([total.fontSize, total.fontWeight, total.color]).toEqual([15, '800', '#006300']);
    const left = screen.getByText(/left · of \$2,000 plan$/);
    expect([String(left.props.children).length > 0, flat(left).color]).toEqual([true, '#006300']);
    expect(L.some((l) => /^\$300 left · of \$2,000 plan$/.test(l))).toBe(true);        // 2,000 − 500 − 1,200
  });
  test('the register household: the $2,300 Rent / Mortgage line that stood down says so, in This month’s words', () => {
    on('2026-09-28'); set(REGISTER);
    const L = editor();
    expect(after(L, '− Expenses (plan)')).toBe('$1,100');                              // 700 + 400
    expect(L).toContain('Your Rent / Mortgage budget line is not counted here: your mortgage, Mortgage, is in Debts and is counted from there. Place it on your home in Net worth, so we know they are the same.');
  });
  test('DEBT THIS MONTH: “$2,000/month min”, no space before /month', () => {
    on('2026-08-20'); H.householdWithData();
    const L = editor();
    expect(L).toContain('$2,000/month min');
    expect(L.join(' ')).not.toMatch(/ \/month min/);
  });
});

describe('CF3-04, CF3-05 · the expense sheet', () => {
  test('the amount box opens empty; the button reads “Log an expense”, then “Log $6.50”', () => {
    on('2026-08-20'); H.householdWithData(); show();
    fireEvent.press(screen.getByLabelText('Log an expense from any tab'));
    const box = screen.getByLabelText('Expense amount');
    expect([box.props.value, box.props.placeholder]).toEqual(['', undefined]);
    expect(lines().filter((l) => l === 'Log an expense')).toHaveLength(2);           // the title and the button
    expect(lines().join(' ')).not.toMatch(/Add expense/);
    fireEvent.changeText(box, '6.50');
    expect(lines()).toContain('Log $6.50');
  });
});

describe('CF3-06 · the budget editor’s sheets are titled at 20/800', () => {
  test('“Monthly limits”, opened by “Set your budget ›”', () => {
    on('2026-08-20'); H.householdWithData();
    const Budget = require('../BudgetScreen').default; render(<Budget embedded initialTab="Budget" />);
    fireEvent.press(screen.getByText('Set your budget ›'));
    const t = flat(screen.getByText('Monthly limits'));
    expect([t.fontSize, t.fontWeight]).toEqual([20, '800']);
  });
});

describe('CF3-07 · YOUR FUTURE PAYCHECK: one space after the colon', () => {
  test('“At 67: ~$…/month”', () => {
    on('2026-09-28'); set(REGISTER); show();
    // an age nobody entered carries the Plan tab's words for it since 2026-10-31 (R10, cash-flow v01's row of that date) — one space after the colon still
    const line = lines().find((l) => /^At \d+( \(ours until you change it\))?:/.test(l))!;
    expect(line).toMatch(/^At \d+( \(ours until you change it\))?: ~\$[\d,]+\/month$/);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// ONE INFLATION ON THE FUTURE PAYCHECK (2026-10-31, FX-CF-A; found by BRIEF-94). The card was handed the store's economic feed, 3.2%,
// while the simulation behind it ran at 2.5%. The single source, by his DEC-0259 ("inflation defaults to the dated 30-year average,
// adjustable; no feed"), is inflationRateInForce: the Plan's own rate, else 2.5%. The card's sentence, its figures and the simulation
// must name that one rate.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('the future paycheck states the inflation its simulation ran on (BRIEF-94)', () => {
  const { futurePaycheck } = require('../../../MoneyKeel/functions/cashflow/future-paycheck');
  const { willItLastInputs } = require('../../domain/retirement/willItLast');
  const { inflationRateInForce } = require('../../domain/retirement/inflation');
  // born 1981 (45 in 2026), retiring at 67; $200,000 in a 401(k); $2,000/month of Social Security from 67; nothing more saved
  const SAVER = { onboardingProfile: { status: 'employed', birthYear: 1981, targetRetirementAge: 67, ri_ss: '2000', ri_ss_receiving: 'no', ri_ss_freq: 'monthly', monthlySpending: 3000,
      incomeSources: ['employment'], baseSalary: '6000', salaryMode: 'takehome', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '0' },
    assetAccounts: [{ asset_id: 'k', label: '401(k)', kind: '401k', tax_bucket: 'PRE_TAX', balance: 200_000, target_return: 0.06, retirement_pct: 100 }],
    retirementAssumptions: { expectedReturn: 0.06 }, inflationRate: 3.2 };   // the store's feed, as the app holds it
  const run = (A: any, feed?: number) => futurePaycheck({ op: SAVER.onboardingProfile, accounts: SAVER.assetAccounts, assumptions: A, inflationRate: feed, employmentStatus: null, transactions: [] });
  const sim = (A: any) => willItLastInputs({ op: SAVER.onboardingProfile, accounts: SAVER.assetAccounts, assumptions: A, employmentStatus: null, transactions: [] });

  test('no rate set: card, simulation and the one reader all read 2.50% — the 3.2% feed is never used', () => {
    on('2026-09-28');
    const p = run(SAVER.retirementAssumptions, 3.2);
    expect(p.assumes.yearlyInflation).toBe(0.025);
    expect(sim(SAVER.retirementAssumptions).inflation).toBe(0.025);
    expect(inflationRateInForce(null).rate).toBe(0.025);
    expect(run(SAVER.retirementAssumptions, undefined)).toEqual(p);                    // handing the feed in or not changes nothing
    // the paycheck, by hand: what lands is Social Security plus the level draw, in today's dollars
    expect(p.monthly).toBe(p.guaranteed + p.draw);
    expect(p.guaranteed).toBe(2000);
    // the pot it draws from, by hand: $200,000 grown 22 years (45 → 67) at the blended 7.90% with its 11% swing has a median of
    // 200,000 × e^(22 × (ln 1.079 − 0.11² ÷ 2)) = 200,000 × e^1.53966 = $932,604; the seeded 1,000-path run the card draws from lands
    // within 2% of it, at the same 2.50%
    const i = sim(SAVER.retirementAssumptions);
    expect([i.mean_return, i.vol_return, i.retire_age - i.current_age, i.inflation]).toEqual([0.079, 0.11, 22, 0.025]);
    const byHand = Math.round(200_000 * Math.exp(22 * (Math.log(1.079) - 0.11 ** 2 / 2)));
    expect(byHand).toBe(932_604);
    const { simulate } = require('../../domain/retirement');
    const pot = simulate(i).projected_at_retirement;
    expect(Math.abs(pot - byHand) / byHand).toBeLessThan(0.02);
  });
  test('a rate set on the Plan, 3.20%: the card says it and the simulation runs on it', () => {
    on('2026-09-28');
    const A = { ...SAVER.retirementAssumptions, inflation: 0.032 };
    expect(run(A, 3.2).assumes.yearlyInflation).toBe(0.032);
    expect(sim(A).inflation).toBe(0.032);
  });
  test('on Cash flow, with the store holding the 3.2% feed, the card prints 2.50%/year — the rate its odds ran on', () => {
    on('2026-09-28'); set(SAVER); show();
    const line = lines().find((l) => /^In today’s dollars · assumes/.test(l))!;
    expect(line).toMatch(/ 2\.50%\/year inflation$/);
    expect(line).not.toMatch(/3\.20%/);
    const L = lines();
    const at = L.findIndex((l) => /^At 67: ~\$[\d,]+\/month$/.test(l));
    expect(at).toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 2026-11-01 (FX-CF-A) — DEBT-TO-INCOME and STUDENT LOAN OUTLOOK on Debts, moved from Goals with their figures unchanged; and the door
// that opens Cash flow on Debts. cash-flow_v01's row of 2026-11-01.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('Debts: what the debts ask of the income (moved from Goals, 2026-11-01)', () => {
  const debtsTab = (extra: any = {}) => { on('2026-08-20'); H.householdDebts(); useStore.setState(extra as any); show(); tab('Debts'); return lines(); };
  test('frame 6: $110 + $300 = $410 of minimums on $5,000 a month → 8.20%, healthy for a renter', () => {
    const L = debtsTab();
    const at = L.indexOf('DEBT-TO-INCOME');
    expect(at).toBeGreaterThan(L.indexOf('PROGRESS'));
    expect(L.slice(at, at + 5)).toEqual(['DEBT-TO-INCOME', '8.20%', 'Healthy', '$410.00/month in minimum debt payments ÷ $5,000/month income',
      'Aim for 20% or less (renters; rent isn’t counted). You’re in good shape.']);
    expect(flat(screen.getByText('DEBT-TO-INCOME')).color).toBe('#FFFFFF');            // the title on its dark-green bar
    expect(L).not.toContain('STUDENT LOAN OUTLOOK');                                    // no student loan entered: no box
  });
  test('the obligation, not the payment chosen: a $110 Visa minimum paid at $300 still counts $110 (DEC-0641)', () => {
    const st = useStore.getState() as any;
    on('2026-08-20'); H.householdDebts();
    useStore.setState({ liabilities: (useStore.getState() as any).liabilities.map((d: any) => (d.debt_id === 'v' ? { ...d, monthly_payment: 300 } : d)) } as any);
    show(); tab('Debts');
    expect(lines()).toContain('$410.00/month in minimum debt payments ÷ $5,000/month income');
    void st;
  });
  test('no income entered: no ratio, and the box says why', () => {
    on('2026-08-20'); H.householdDebts();
    useStore.setState({ onboardingProfile: { status: 'employed', incomeSources: [], monthlySpending: '2000' } } as any);
    show(); tab('Debts');
    const L = lines();
    expect(L[L.indexOf('DEBT-TO-INCOME') + 1]).toBe('Your income is not entered, so there is no debt-to-income figure — we won’t guess one.');
  });
  test('student loans: $30,000 at 5.50% over 10 years → $325.58 a month ($326), $9,069.46 of interest, 6.51% of $5,000', () => {
    on('2026-08-20'); H.householdDebts();
    const op = (useStore.getState() as any).onboardingProfile;
    useStore.setState({ onboardingProfile: { ...op, loans: [{ label: 'Student loan', amount: 30000, apr: 5.5, termYears: 10 }] } } as any);
    show(); tab('Debts');
    const L = lines();
    const at = L.indexOf('STUDENT LOAN OUTLOOK');
    expect(at).toBeGreaterThan(L.indexOf('DEBT-TO-INCOME'));
    // R22d (2026-11-02): the estimate says it is one, between the repayment and its share — the figures are unchanged
    expect(L.slice(at, at + 5)).toEqual(['STUDENT LOAN OUTLOOK', '$30,000 borrowed', '~$326/month once you’re repaying · $9,069 total interest',
      'An estimate from the rate and term entered in setup — not in your payments until repayment starts.',
      'That’s ~6.51% of today’s income — keeping total debt under 20% keeps you comfortable.']);
  });
  test('a student loan with no rate or term: what to add, no repayment guessed', () => {
    on('2026-08-20'); H.householdDebts();
    const op = (useStore.getState() as any).onboardingProfile;
    useStore.setState({ onboardingProfile: { ...op, loans: [{ label: 'Student loan', amount: 12000 }] } } as any);
    show(); tab('Debts');
    const L = lines();
    const at = L.indexOf('STUDENT LOAN OUTLOOK');
    expect(L.slice(at, at + 3)).toEqual(['STUDENT LOAN OUTLOOK', '$12,000 borrowed', 'Add an interest rate and term to each loan (in setup) to see the monthly repayment.']);
  });
  test('the same figures the Goals screen printed: its functions, run on the same household', () => {
    const { debtToIncome, minimumDebtService, loanPayment } = require('../../domain/debt');
    const debts = [{ debt_id: 'v', debt_type: 'CREDIT_CARD', remaining_balance: 3200, minimum_monthly_payment: 110 }, { debt_id: 'c', debt_type: 'AUTO', remaining_balance: 9800, minimum_monthly_payment: 300 }];
    expect(debtToIncome(minimumDebtService(debts as any), 5000, false).ratio).toBeCloseTo(0.082, 12);
    const p = loanPayment(30000, 5.5, 10);
    expect([p.monthly.toFixed(2), p.totalInterest.toFixed(2), (p.monthly / 5000 * 100).toFixed(2)]).toEqual(['325.58', '9069.46', '6.51']);
  });
});

describe('the door “Your debts … are on Cash flow, under Debts ›” opens the Debts tab (2026-11-01)', () => {
  test('/(tabs)/cashflow?tab=debts lands on Debts, not This month', () => {
    mockParams = { tab: 'debts' };
    on('2026-08-20'); H.householdDebts(); show();
    expect(screen.getByLabelText('Debts tab, selected')).toBeTruthy();
    expect(lines()).toContain('YOUR DEBT');
    expect(lines()).not.toContain('PLANNED · AUGUST');
  });
  test('with no tab named, Cash flow opens on This month as before', () => {
    on('2026-08-20'); H.householdDebts(); show();
    expect(screen.getByLabelText('This month tab, selected')).toBeTruthy();
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// ROUND 4, 2026-11-01 (FX-CF-A) — CF4-01/06 (R21), CF4-03 (R22), CF4-04, CF4-05, CF4-10. Rows: cash-flow_v01 and goals_v03, 2026-11-01.
// CF4-02 is held by src/__tests__/approx_mark_one_form.test.ts.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('round 4 · Debts', () => {
  const CAR_CENTS = { debt_id: 'c', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 9800, interest_rate_apr: 0.064, minimum_monthly_payment: 386.42 };
  test('CF4-01 (R21): the sum works as printed — $386.42 ÷ $5,000 = 7.73%, the payment to the cent', () => {
    on('2026-08-20'); H.householdDebts(); useStore.setState({ liabilities: [CAR_CENTS] } as any); show(); tab('Debts');
    const L = lines(); const d = L.indexOf('DEBT-TO-INCOME');
    expect(L.slice(d + 1, d + 4)).toEqual(['7.73%', 'Healthy', '$386.42/month in minimum debt payments ÷ $5,000/month income']);   // 386.42 ÷ 5,000 = 7.7284%
  });
  test.failing('CF4-01 · the old answer, kept: the payment rounded to the dollar beside a ratio worked on the cents', () => {
    on('2026-08-20'); H.householdDebts(); useStore.setState({ liabilities: [CAR_CENTS] } as any); show(); tab('Debts');
    expect(lines()).toContain('$386/month in minimum debt payments ÷ $5,000/month income');
  });
  const LOAN = [{ label: 'Student loan', amount: 30000, apr: 5.5, termYears: 10 }];
  test('CF4-03 (R22): a setup student loan alone — YOUR DEBT $30,000, said, and no “Nothing entered yet”', () => {
    on('2026-08-20'); H.householdDebts();
    const op = (useStore.getState() as any).onboardingProfile;
    useStore.setState({ liabilities: [], monthlySnapshots: {}, onboardingProfile: { ...op, loans: LOAN } } as any); show(); tab('Debts');
    // RE-WORKED 2026-11-01 (round 5, NW5-02 and MM5-NW): the loan is one debt with Net worth's $325.58 repayment ($326 to the dollar),
    // and the sentence says only what was entered — setup never asks when repayment starts
    const L = lines(); const y = L.indexOf('YOUR DEBT');
    // R22d (2026-11-02): the balance counts, the payment is not assumed — $0 counted, and why
    expect(L.slice(y, y + 4)).toEqual(['YOUR DEBT', '$30,000', 'across 1 debt · $0/month in payments · the student loan’s payment is not counted: when repayment starts is not entered', 'Includes $30,000 of student loans entered in setup. When repayment starts is not entered.']);
    expect(L.join(' ')).not.toMatch(/Nothing entered yet\. Add your debts/);
    expect(L).toContain('$30,000 borrowed');                                                   // the outlook's borrowed is the same $30,000
  });
  test.failing('CF4-03 · the round-4 answer, kept: “repayment starts after you graduate”, said of nothing entered', () => {
    on('2026-08-20'); H.householdDebts();
    const op = (useStore.getState() as any).onboardingProfile;
    useStore.setState({ liabilities: [], monthlySnapshots: {}, onboardingProfile: { ...op, loans: LOAN } } as any); show(); tab('Debts');
    expect(lines()).toContain('Includes $30,000 of student loans entered in setup — repayment starts after you graduate.');
  });
  test('CF4-03 (R22): beside a $3,200 Visa and a $9,800 car loan, 3,200 + 9,800 + 30,000 = $43,000 — one total, from the one reader', () => {
    on('2026-08-20'); H.householdDebts();
    const op = (useStore.getState() as any).onboardingProfile;
    useStore.setState({ onboardingProfile: { ...op, loans: LOAN } } as any); show(); tab('Debts');
    expect(after(lines(), 'YOUR DEBT')).toBe('$43,000');
    const { setupStudentLoans } = require('../../domain/debt');
    const liabilities = (useStore.getState() as any).liabilities;
    expect(liabilities.reduce((t: number, d: any) => t + d.remaining_balance, 0) + setupStudentLoans({ loans: LOAN }).owed).toBe(43000);
  });
  test.failing('CF4-03 · the old answer, kept: YOUR DEBT $0 and “Nothing entered yet” above $30,000 borrowed', () => {
    on('2026-08-20'); H.householdDebts();
    const op = (useStore.getState() as any).onboardingProfile;
    useStore.setState({ liabilities: [], monthlySnapshots: {}, onboardingProfile: { ...op, loans: LOAN } } as any); show(); tab('Debts');
    expect(after(lines(), 'YOUR DEBT')).toBe('$0');
  });
  test('CF4-04: a $0 YOUR DEBT is grey (#6B6B66), never the brand green; a debt above $0 is red', () => {
    on('2026-08-20'); H.householdBrandNew(); show(); tab('Debts');
    expect(flat(screen.getAllByText('$0').find((n: any) => flat(n).fontSize === 30)).color).toBe('#6B6B66');
    jest.useRealTimers(); on('2026-08-20'); H.householdDebts(); show(); tab('Debts');
    expect(flat(screen.getByText('$13,000')).color).toBe('#A32D2D');
  });
});

describe('round 5 · Debts — a setup loan is a debt everywhere debts are counted (R22b, NW5-02, MM5-NW)', () => {
  // The household: a $3,200 Visa at $110/month and a $9,800 car loan at $300/month (householdDebts), and a $30,000 student loan
  // entered in setup at 5.50% over 10 years. By hand: r = 0.055 ÷ 12 = 0.0045833; payment = 30,000 × r ÷ (1 − (1 + r)^−120) = $325.58;
  // payments $110 + $300 + $325.58 = $735.58 → $736; total 3,200 + 9,800 + 30,000 = $43,000; interest 325.58 × 120 − 30,000 = $9,069.
  const LOAN = [{ label: 'Student loan', amount: 30000, apr: 5.5, termYears: 10 }];
  const LATER = [{ label: 'Student loan', amount: 30000, apr: 5.5, termYears: 10, months: [9], year: 2027 }];
  const withLoans = (loans: any[], extra: any = {}) => {
    on('2026-08-20'); H.householdDebts();
    const op = (useStore.getState() as any).onboardingProfile;
    useStore.setState({ ...extra, onboardingProfile: { ...op, loans } } as any);
  };
  // R22d (2026-11-02, round 6): the loan's $30,000 is owed and counts; its $325.58 is not assumed — when repayment starts is never asked
  test.failing('CF5-01 · the round-5 answer, kept: “across 3 debts · $736/month in payments”, the loan’s $325.58 assumed', () => {
    withLoans(LOAN); show(); tab('Debts');
    expect(lines()).toContain('across 3 debts · $736/month in payments');
  });
  test('CF5-01 (R22d): across 3 debts · $410/month in payments ($110 + $300), and the loan’s payment said not counted', () => {
    withLoans(LOAN); show(); tab('Debts');
    const L = lines(); const y = L.indexOf('YOUR DEBT');
    expect(L.slice(y, y + 4)).toEqual(['YOUR DEBT', '$43,000', 'across 3 debts · $410/month in payments · the student loan’s payment is not counted: when repayment starts is not entered',
      'Includes $30,000 of student loans entered in setup. When repayment starts is not entered.']);
  });
  test('CF5-01 (NW5-02): Debts and Net worth agree — one total, one count, one payment total, from one function', () => {
    withLoans(LOAN);
    const { netWorthInputs } = require('../../hooks/useNetWorthInputs');
    const { theNetWorth } = require('../../../MoneyKeel/functions/networth-and-performance/net-worth');
    const worth = theNetWorth(netWorthInputs(useStore.getState()));
    expect(worth.debts).toBe(43000);
    expect(worth.debtLines.length).toBe(3);
    expect(Math.round(worth.monthlyDebtPayments * 100)).toBe(41000);                       // 110 + 300; the loan's payment not assumed (R22d)
    show(); tab('Debts');
    const L = lines(); const y = L.indexOf('YOUR DEBT');
    expect(money(L[y + 1])).toBe(worth.debts);
    expect(L[y + 2]).toBe(`across ${worth.debtLines.length} debts · $${Math.round(worth.monthlyDebtPayments)}/month in payments · the student loan’s payment is not counted: when repayment starts is not entered`);
    expect(after(L, 'debt-free')).toBe(`$${Math.round(worth.monthlyDebtPayments)}`);                   // the plan's /month total, the same $410 (R22d)
  });
  // THE PAYOFF PLAN, BY HAND (round 5b, the lead's ruling on the 'Left' item): highest rate first, nothing extra, from Aug 2026. Each
  // month pays every minimum; what a cleared debt paid goes to the highest rate left. The car loan clears in month 36 ($996.61 of
  // interest), the Visa in month 38 ($1,479.14), and with $735.58 a month the loan in month 71 ($6,317.98): Aug 2026 + 71 = Jul 2032,
  // interest $8,793.73 → $8,794. Without the loan: month 38 = Oct 2029, $2,475.75 → $2,476, $410/month.
  test.failing('CF5-04 · the round-5b answer, kept: the plan paid the loan’s assumed $325.58 — $736/month total, Jul 2032, $8,794', () => {
    withLoans(LOAN); show(); tab('Debts');
    const L = lines(); const d = L.indexOf('debt-free');
    expect(L.slice(d - 1, d + 5)).toEqual(['Jul 2032', 'debt-free', '$736', '/month total', '$8,794', 'total interest']);
  });
  // R22d, by hand: the plan pays the debts entered — the car loan clears in month 36 ($996.61), the Visa in month 38 ($1,479.14):
  // Aug 2026 + 38 = Oct 2029, $2,475.75 → $2,476, $110 + $300 = $410/month; and it names the loan as not in the plan
  test('CF5-04 (R22d): the plan pays the debts entered — $410/month total, Oct 2029, $2,476 — and names the setup loan', () => {
    withLoans(LOAN); show(); tab('Debts');
    const L = lines(); const d = L.indexOf('debt-free');
    expect(L.slice(d - 1, d + 5)).toEqual(['Oct 2029', 'debt-free', '$410', '/month total', '$2,476', 'total interest']);
    expect(L.slice(L.indexOf('PAYOFF PLAN'), d)).toContain('The student loan (from setup) is not in the plan until its repayment start is entered.');
  });
  test('R22d: debt-to-income divides the $410.00 counted, and says the loan’s payment is not among them', () => {
    withLoans(LOAN); show(); tab('Debts');
    const L = lines(); const d = L.indexOf('DEBT-TO-INCOME');
    expect(L[d + 3]).toBe('$410.00/month in minimum debt payments ÷ $5,000/month income');           // 410 ÷ 5,000 = 8.20%
    expect(L[d + 1]).toBe('8.20%');
    expect(L[d + 4]).toBe('The student loan’s payment is not counted here: when repayment starts is not entered.');
  });
  // THE ROWS ADD UP TO THE TOTAL (round 5c, tenet 2): Visa 3,200 × 22.90% ÷ 12 = $61.07 → ~$61; car 9,800 × 6.40% ÷ 12 = $52.27 → ~$52,
  // 36 months = 3 years left; loan 30,000 × 5.50% ÷ 12 = $137.50 → ~$138, month 71 ÷ 12 = 5.9 → 6 years left. $110 + $300 + $325.58 = $735.58 → $736.
  test.failing('CF5-05 · the round-5c answer, kept: the loan’s row at an assumed $326/month min, the rows making $736', () => {
    withLoans(LOAN); show(); tab('Debts');
    const L = lines(); const y = L.indexOf('YOUR DEBTS'); const e = L.indexOf('Log a payment ›');
    expect(L.slice(y, e)).toEqual(['YOUR DEBTS',
      'Visa card', 'pay first', '22.90% — the costliest · $110/month min · ~$61/month interest', '−$3,200 ›',
      'Car loan', '6.40% · 3 years left · $300/month min · ~$52/month interest', '−$9,800 ›',
      'Student loan (from setup)', '5.50% · 6 years left · $326/month min · ~$138/month interest', '−$30,000']);
    const { netWorthInputs } = require('../../hooks/useNetWorthInputs');
    const { requiredPayment } = require('../../domain/debt');
    const rows = netWorthInputs(useStore.getState()).debts.filter((d: any) => d.remaining_balance > 0);
    expect(Math.round(rows.reduce((t: number, d: any) => t + requiredPayment(d), 0) * 100)).toBe(73558);   // the rows' own payments, to the cent
    expect(after(L, 'debt-free')).toBe('$736');                                                          // = the plan's total
  });
  test.failing('CF5-05 · the old answer, kept: the rows held only the debts entered ($110 + $300 = $410) under a $736 total', () => {
    withLoans(LOAN); show(); tab('Debts');
    expect(lines()).not.toContain('Student loan (from setup)');
  });
  // R22d, by hand: the loan's row says its payment is not entered; its interest is its own, 30,000 × 5.50% ÷ 12 = $137.50 → ~$138;
  // no time left (it is not in the plan). The rows' payments are $110 + $300 = $410, the plan's total.
  test('CF5-05 (R22d): the loan’s row reads “payment not entered”, and the rows’ $410 is the plan’s total', () => {
    withLoans(LOAN); show(); tab('Debts');
    const L = lines(); const y = L.indexOf('YOUR DEBTS'); const e = L.indexOf('Log a payment ›');
    expect(L.slice(y, e)).toEqual(['YOUR DEBTS',
      'Visa card', 'pay first', '22.90% — the costliest · $110/month min · ~$61/month interest', '−$3,200 ›',
      'Car loan', '6.40% · 3 years left · $300/month min · ~$52/month interest', '−$9,800 ›',
      'Student loan (from setup)', '5.50% · payment not entered · ~$138/month interest', '−$30,000']);
    expect(after(L, 'debt-free')).toBe('$410');
  });
  test('CF5-04: a loan paid out later stays out of the plan, and the plan names it', () => {
    withLoans(LATER); show(); tab('Debts');
    const L = lines(); const d = L.indexOf('debt-free');
    expect(L.slice(d - 1, d + 5)).toEqual(['Oct 2029', 'debt-free', '$410', '/month total', '$2,476', 'total interest']);
    const p = L.indexOf('PAYOFF PLAN');
    expect(L.slice(p, d).filter((t) => t === 'A $30,000 student loan starts in Sep 2027, not counted until then.')).toHaveLength(1);
  });
  test.failing('CF5-01 · the old answer, kept: “across 2 debts · $410/month in payments” under a $43,000 that holds the loan', () => {
    withLoans(LOAN); show(); tab('Debts');
    expect(lines()).toContain('across 2 debts · $410/month in payments');
  });
  test('CF5-02: a loan paid out from Sep 2027 has its outlook, saying only its payout month', () => {
    withLoans(LATER); show(); tab('Debts');
    const L = lines(); const at = L.indexOf('STUDENT LOAN OUTLOOK');
    expect(at).toBeGreaterThan(-1);
    expect(L.slice(at + 1, at + 3)).toEqual(['$30,000 borrowed', '~$326/month once you’re repaying · $9,069 total interest']);
    expect(L).toContain('Paid out from Sep 2027. When repayment starts is not entered.');
    expect(L.slice(L.indexOf('YOUR DEBT'), L.indexOf('YOUR DEBT') + 3)).toEqual(['YOUR DEBT', '$13,000', 'across 2 debts · $410/month in payments']);   // not owed yet: not counted
  });
  test('CF5-03: only a loan paid out later — $0, the later loan’s sentence, never “Nothing entered yet”', () => {
    withLoans(LATER, { liabilities: [], monthlySnapshots: {} }); show(); tab('Debts');
    const L = lines(); const y = L.indexOf('YOUR DEBT');
    expect(L.slice(y, y + 3)).toEqual(['YOUR DEBT', '$0', 'A $30,000 student loan starts in Sep 2027, not counted until then.']);
    expect(L.join(' ')).not.toMatch(/Nothing entered yet/);
  });
  test('MM5-NW: a loan paid out Sep 2026 is owed — and nothing says “after you graduate”', () => {
    withLoans([{ ...LATER[0], year: 2026 }]); on('2026-11-01'); show(); tab('Debts');
    const L = lines();
    expect(L).toContain('Includes $30,000 of student loans entered in setup. When repayment starts is not entered.');
    expect(L.join(' ')).not.toMatch(/graduate/);
  });
});

describe('round 5d · a wage whose pay frequency cannot be read is entered — the tab shows what it can (R23a follow-on)', () => {
  // The household, by hand: a $100,000 wage saved with frequency 'annual' (no frequency the app has — 'annually' is), and one rental
  // at $1,800 a month less $600 = $1,200 a month net. The rent does not rest on the wage, so it prints; every surplus and the expected
  // take-home rest on it, so each reads '—' and R23's sentence stands where the wage would be.
  const SAID = 'Pay frequency not recognised — open Base pay to choose one.';
  const OP = { status: 'employed', incomeSources: ['employment', 'rental'], baseSalary: '100000', salaryFreq: 'annual', salaryMode: 'gross', hoursPerWeek: '40',
    rentals: [{ type: 'long', income: '1800', expenses: '600', property_id: 'h' }] };
  const HOUSE = [{ asset_id: 'h', label: 'Rental', asset_class: 'real_estate', balance: 300000 }];
  const open = (op: any = OP) => { on('2026-08-20'); set({ onboardingProfile: op, assetAccounts: HOUSE }); show(); };
  test('This month: the rent, the sentence where the wage would be, and no surplus — never the set-up doors', () => {
    open();
    const L = lines(); const p = L.indexOf('PLANNED · AUGUST'); const a = L.indexOf('ACTUAL · SO FAR');
    expect(L).not.toContain('SET UP YOUR MONTH — 2 STEPS');
    expect(L.slice(p, p + 7)).toEqual(['PLANNED · AUGUST', '—', 'Inflow (rent)', '$1,200', SAID, 'Expenses', '— not set']);
    expect(L.slice(a, a + 9)).toEqual(['ACTUAL · SO FAR', '—', 'Actual inflow (rent)', '$1,200', SAID, 'Expenses entered by hand', '$0', '= Actual surplus so far', '—']);
  });
  test('with a budget set, “= Planned surplus” reads “—”: it rests on the wage', () => {
    open({ ...OP, ...H.BUDGET_BY_CATEGORY });
    const L = lines();
    expect(after(L, '= Planned surplus')).toBe('—');
    expect(after(L, 'PLANNED · AUGUST')).toBe('—');
  });
  test.failing('the old answer, kept: the set-up doors hid the $1,200 of rent the person entered', () => {
    open();
    expect(lines()).toContain('SET UP YOUR MONTH — 2 STEPS');
  });
  test('the Income tab: no expected take-home, no “yearly · ~$0/month take-home”; the $100,000 entered and the rent print', () => {
    open(); tab('Income');
    const L = lines(); const t = L.indexOf('THIS MONTH');
    expect(L.slice(t, t + 4)).toEqual(['THIS MONTH', '—', 'expected take-home', SAID]);
    const y = L.indexOf('YOUR SOURCES');
    expect(L.slice(y, y + 7)).toEqual(['YOUR SOURCES', 'Salary — steady', 'before tax · pay frequency not recognised', '$100,000 ›', 'Rental income', '1 property', '$1,200 ›']);
    expect(L.join(' ')).not.toMatch(/[~≈]\$0\b/);
  });
  test('choose a frequency and the figures are back: “annually” gives a surplus and a take-home again', () => {
    open({ ...OP, salaryFreq: 'annually' });
    const L = lines();
    expect(L).not.toContain(SAID);
    expect(after(L, 'ACTUAL · SO FAR')).toMatch(/^~\+\$[\d,]+$/);   // calculated take-home: the mark before the sign (R25a, 2026-11-02)
  });
});

describe('round 5e · the set-up doors only when nothing at all is entered (the lead’s ruling on the 5d “Left”)', () => {
  // A rent-only household, by hand: one rental at $1,800 a month less $600 = $1,200 a month net; no pay, no budget, nothing logged.
  // The totals are what is entered: $1,200 in − $0 out = +$1,200 so far; no budget, so no planned surplus. The pay is offered in words.
  const PAY = 'Your pay is not entered yet — add it ›';
  const RENT_ONLY = { status: 'employed', incomeSources: ['rental'], rentals: [{ type: 'long', income: '1800', expenses: '600', property_id: 'h' }] };
  const HOUSE = [{ asset_id: 'h', label: 'Rental', asset_class: 'real_estate', balance: 300000 }];
  test('rent only: the month shows the $1,200, +$1,200 so far, and offers the pay where it would be', () => {
    on('2026-08-20'); set({ onboardingProfile: RENT_ONLY, assetAccounts: HOUSE }); show();
    const L = lines(); const p = L.indexOf('PLANNED · AUGUST'); const a = L.indexOf('ACTUAL · SO FAR');
    expect(L).not.toContain('SET UP YOUR MONTH — 2 STEPS');
    expect(L.slice(p, p + 7)).toEqual(['PLANNED · AUGUST', '—', 'Inflow (rent)', '$1,200', PAY, 'Expenses', '— not set']);
    expect(L.slice(a, a + 8)).toEqual(['ACTUAL · SO FAR', '+$1,200', 'Actual inflow (rent)', '$1,200', 'Expenses entered by hand', '$0', '= Actual surplus so far', '+$1,200']);
    expect(L.filter((l) => l === PAY)).toHaveLength(1);
  });
  test.failing('rent only · the old answer, kept: the set-up doors hid the $1,200 of rent', () => {
    on('2026-08-20'); set({ onboardingProfile: RENT_ONLY, assetAccounts: HOUSE }); show();
    expect(lines()).toContain('SET UP YOUR MONTH — 2 STEPS');
  });
  test('a budget and nothing coming in: the month opens, and no surplus rests on an income nobody entered', () => {
    on('2026-08-20'); set({ onboardingProfile: { status: 'employed', ...H.BUDGET_BY_CATEGORY } }); show();
    const L = lines();
    expect(L).not.toContain('SET UP YOUR MONTH — 2 STEPS');
    expect(L).toContain(PAY);
    expect(after(L, 'PLANNED · AUGUST')).toBe('—');
    expect(after(L, 'ACTUAL · SO FAR')).toBe('—');
    expect(after(L, '= Actual surplus so far')).toBe('—');
  });
  test('nothing entered: the two set-up doors, as the first-open frame draws them', () => {
    on('2026-08-20'); set({ onboardingProfile: { status: 'employed' } }); show();
    const L = lines();
    expect(L).toContain('SET UP YOUR MONTH — 2 STEPS');
    expect(L).not.toContain(PAY);
  });
});

describe('round 6 · Debts under R22d (CF6-01, CF6-03, CF6-04, CF6-05, the payoff dates)', () => {
  const LOAN = [{ label: 'Student loan', amount: 30000, apr: 5.5, termYears: 10 }];
  const LATER = [{ ...LOAN[0], months: [9], year: 2027 }];
  const at = (L: string[], t: string) => { const i = L.indexOf(t); expect([t, i >= 0]).toEqual([t, true]); return i; };
  const loanOnly = (loans: any[] = LOAN) => { on('2026-08-20'); H.householdDebts(); const op = (useStore.getState() as any).onboardingProfile;
    useStore.setState({ liabilities: [], monthlySnapshots: {}, onboardingProfile: { ...op, loans } } as any); show(); tab('Debts'); return lines(); };
  test('CF6-01: only a setup loan — DEBT-TO-INCOME stays, and says why it has no figure', () => {
    const L = loanOnly(); const d = at(L, 'DEBT-TO-INCOME');
    expect(L[d + 1]).toBe('The student loan’s payment is not counted: when repayment starts is not entered, so there is no debt-to-income figure — we won’t guess one.');
  });
  test.failing('CF6-01 · the old answer, kept: with only a setup loan the debt-to-income box was missing', () => {
    expect(loanOnly()).not.toContain('DEBT-TO-INCOME');
  });
  test('CF6-01: the same loan typed in as a debt at $325.58 is an entered debt — (110 + 300 + 325.58) ÷ 5,000 = 14.71%', () => {
    on('2026-08-20'); H.householdDebts();
    const st = useStore.getState() as any;
    useStore.setState({ liabilities: [...st.liabilities, { debt_id: 'sl', label: 'Student loan', debt_type: 'STUDENT_LOAN', remaining_balance: 30000, interest_rate_apr: 0.055, minimum_monthly_payment: 325.58 }],
      onboardingProfile: { ...st.onboardingProfile, loans: LOAN } } as any); show(); tab('Debts');
    const L = lines(); const d = at(L, 'DEBT-TO-INCOME');
    expect(L.slice(d + 1, d + 4)).toEqual(['14.71%', 'Healthy', '$735.58/month in minimum debt payments ÷ $5,000/month income']);   // 735.58 ÷ 5,000 = 14.7116%
    expect(after(L, 'YOUR DEBT')).toBe('$43,000');                                           // counted once: 3,200 + 9,800 + 30,000
    // CF6-05: the outlook still shows, once, its estimate line without 'not in your payments'
    expect(L.filter((l) => l === 'STUDENT LOAN OUTLOOK')).toHaveLength(1);
    expect(L).toContain('An estimate from the rate and term entered in setup.');
  });
  test.failing('CF6-05 · the old answer, kept: a setup loan also entered as a debt lost its outlook', () => {
    on('2026-08-20'); H.householdDebts();
    const st = useStore.getState() as any;
    useStore.setState({ liabilities: [...st.liabilities, { debt_id: 'sl', label: 'Student loan', debt_type: 'STUDENT_LOAN', remaining_balance: 30000, interest_rate_apr: 0.055, minimum_monthly_payment: 325.58 }],
      onboardingProfile: { ...st.onboardingProfile, loans: LOAN } } as any); show(); tab('Debts');
    expect(lines()).not.toContain('STUDENT LOAN OUTLOOK');
  });
  test('CF6-03: only a setup loan — YOUR DEBTS keeps “+ Add debt account”', () => {
    const L = loanOnly();
    expect(L).toContain('Student loan (from setup)');
    expect(L).toContain('+ Add debt account');
  });
  test.failing('CF6-03 · the old answer, kept: with only a setup loan there was no way to add a debt', () => {
    expect(loanOnly()).not.toContain('+ Add debt account');
  });
  test('CF6-04: the later loan’s outlook prints exactly the five lines its row lists', () => {
    on('2026-08-20'); H.householdDebts(); const op = (useStore.getState() as any).onboardingProfile;
    useStore.setState({ onboardingProfile: { ...op, loans: LATER } } as any); show(); tab('Debts');
    const L = lines(); const o = at(L, 'STUDENT LOAN OUTLOOK');
    // by hand: 325.58 ÷ 5,000 = 6.51%
    expect(L.slice(o + 1, o + 6)).toEqual(['$30,000 borrowed', '~$326/month once you’re repaying · $9,069 total interest',
      'An estimate from the rate and term entered in setup — not in your payments until repayment starts.',
      'That’s ~6.51% of today’s income — keeping total debt under 20% keeps you comfortable.',
      'Paid out from Sep 2027. When repayment starts is not entered.']);
  });
  test('the payoff dates count from the month the plan is read in: Nov 2026 + 38 months = Jan 2030', () => {
    on('2026-11-01'); H.householdDebts(); const op = (useStore.getState() as any).onboardingProfile;
    useStore.setState({ onboardingProfile: { ...op, loans: LOAN } } as any); show(); tab('Debts');
    const L = lines(); const d = at(L, 'debt-free');
    expect(L.slice(d - 1, d + 3)).toEqual(['Jan 2030', 'debt-free', '$410', '/month total']);
  });
});

describe('round 4 · Goals and the Tax organizer', () => {
  // RE-MEASURED 2026-11-01 (CLEANUP-TESTS): the minus stays against its figure (CF4-10). The $0 401(k) line comes back: his DEC-0252
  // (Q46) names it one of the four lines the organizer shows, so with nothing put in it reads "$0" — a line he asked for never vanishes.
  test('CF4-10: the Tax organizer writes a minus against its figure, and keeps the 401(k) line at $0 (DEC-0252)', () => {
    on('2026-08-20'); set({ onboardingProfile: { status: 'employed', incomeSources: ['employment'], baseSalary: '60000', salaryFreq: 'annually', salaryMode: 'gross', filingStatus: 'single' } });
    show('TaxOrganizerScreen');
    const L = lines();
    expect(L.filter((l) => /^− /.test(l))).toEqual([]);
    expect(L.some((l) => /^−\$[\d,]+$/.test(l))).toBe(true);
    expect(L[L.indexOf('401(k) contribution') + 1]).toBe('$0');
    // THE HOUSEHOLD'S OWN FIGURES, BY HAND (2026-11-01, CLEANUP-TESTS): a $60,000 yearly salary is salaryFreq 'annually', the app's
    // word (SALARY_PERIODS, × 1). It was typed 'annual', a value the app does not have, read as a month: wages $720,000.
    // $60,000 − $0 − $16,100 = $43,900 taxable; tax 10% of $12,400 + 12% of ($43,900 − $12,400) = $1,240 + $3,780 = $5,020;
    // $5,020 ÷ $60,000 = 8.3667% → ≈8.37%.
    expect(L[L.indexOf('Wages (W-2)') + 1]).toBe('$60,000');
    expect(L[L.indexOf('Gross income') + 1]).toBe('$60,000');
    expect(L[L.indexOf('Standard deduction') + 1]).toBe('−$16,100');
    expect(L[L.indexOf('Taxable income') + 1]).toBe('$43,900');
    expect(L.some((l) => /^Calculated federal tax ~8\.37% of the year’s income/.test(l))).toBe(true);
  });
  test.failing('CF4-10 as FX-CF-A built it, pinned (no longer its answer): a $0 401(k) line left out', () => {
    on('2026-08-20'); set({ onboardingProfile: { status: 'employed', incomeSources: ['employment'], baseSalary: '60000', salaryFreq: 'annually', salaryMode: 'gross', filingStatus: 'single' } });
    show('TaxOrganizerScreen');
    expect(lines()).not.toContain('401(k) contribution');
  });
});
