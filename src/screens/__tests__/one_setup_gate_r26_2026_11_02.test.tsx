/** ONE SET-UP GATE — CASH FLOW, HOME, INSIGHTS AND THE SIGN-UP SUMMARY (2026-11-02, the lead's ruling R26; CF6-09, CF6-10, CF6-13, CF6-18).
 *
 *  Before: each screen asked its own "is anything entered yet?". Home counted a wage only when it could be read and never a budget
 *  (HomeScreen.tsx:264); Cash flow left debts out (monthReady); Insights (InsightsScreen.tsx:151) and the summary (Summary.tsx:27)
 *  read salaryAnnual alone. A $600 budget alone showed Home's 'Welcome' doors while Cash flow opened its month; a $9,800 car loan
 *  alone showed Cash flow's set-up doors beside a Debts tab listing it.
 *
 *  Now: one function, setupEntered (MoneyKeel/functions/cashflow/setup-gate.ts), read by all four. ANY entry opens — an inflow
 *  (a wage that cannot be read among them), an expense, a budget, a debt or a setup loan. Each kind below is RENDERED on every
 *  screen it moves, and the empty case on all four:
 *    Cash flow — the set-up doors 'SET UP YOUR MONTH — 2 STEPS' show exactly when nothing is entered;
 *    Home — the first-day doors 'Let’s get your real numbers in.' show exactly when nothing is entered (an account also opens it);
 *    Insights — 'Room left in your 401(k)' needs a wage entered AND read (a wage not read gives no room figure: R23);
 *    Summary — Income Tracker is SYNCED exactly when an inflow is entered; 'salary' is named when a wage is entered.
 *  Worked by hand, the fixtures: support $500/month; a $100,000 wage with frequency 'annual' (not recognised); a $40 expense; a $600
 *  Groceries budget; a $9,800 car loan at $250/month; a $30,000 student loan from setup, first paid Sep 2027.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import * as fs from 'fs';
import * as path from 'path';
import { useStore } from '../../store/useStore';
import { setupEntered } from '../../../MoneyKeel/functions/cashflow/setup-gate';
import Summary from '../../onboarding/Summary';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

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
const TODAY = '2026-09-28';
function shoot(name: 'home' | 'cashflow' | 'insights', state: any): { lines: string[]; labels: string[] } {
  jest.useFakeTimers({ now: new Date(`${TODAY}T12:00:00`), doNotFake: [...FAKE] });
  try {
    useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
    useStore.setState({ hideBalances: false, nwSetupChoice: 'self', ...state } as any);
    const C = name === 'home' ? require('../HomeScreen').default : name === 'cashflow' ? require('../CashFlowScreen').default : require('../InsightsScreen').default;
    const r = render(<C />);
    const lines = readLines();
    const labels: string[] = [];
    const walk = (n: any) => { if (n == null || typeof n === 'string') return; if (Array.isArray(n)) { n.forEach(walk); return; }
      if (typeof n.props?.accessibilityLabel === 'string') labels.push(n.props.accessibilityLabel); (n.children ?? []).forEach(walk); };
    walk(screen.toJSON());
    r.unmount();
    return { lines, labels };
  } finally { jest.useRealTimers(); }
}
function summaryLines(op: any): string[] {
  const r = render(<Summary status={null} tracks={[]} answers={op} name="Sam" />);
  const L = readLines(); r.unmount(); return L;
}

const BASE = { status: 'employed', birthYear: '1975' };
const SAID = 'Pay frequency not recognised — open Base pay to choose one.';
const CF_DOORS = 'SET UP YOUR MONTH — 2 STEPS';
const HOME_DOORS = 'Let’s get your real numbers in.';
const ROOM = 'Room left in your 401(k)';
const KINDS: Record<string, { state: any; inflow: boolean; wageEntered: boolean; wageRead: boolean }> = {
  'nothing entered': { state: { onboardingProfile: { ...BASE } }, inflow: false, wageEntered: false, wageRead: false },
  'an inflow: support $500/month': { state: { onboardingProfile: { ...BASE, incomeSources: ['support'], supportMonthly: '500' } }, inflow: true, wageEntered: false, wageRead: false },
  'a wage that cannot be read: $100,000, frequency annual': { state: { onboardingProfile: { ...BASE, incomeSources: ['employment'], baseSalary: '100000', salaryFreq: 'annual', salaryMode: 'gross' } }, inflow: true, wageEntered: true, wageRead: false },
  'a wage read: $5,000 a month': { state: { onboardingProfile: { ...BASE, incomeSources: ['employment'], baseSalary: '5000', salaryFreq: 'monthly', salaryMode: 'gross' } }, inflow: true, wageEntered: true, wageRead: true },
  'an expense: $40 logged': { state: { onboardingProfile: { ...BASE }, expenses: [{ id: 'x', amount: 40, category: 'Groceries', store: 'Grocer', date: '2026-09-07', createdAt: '2026-09-07' }] }, inflow: false, wageEntered: false, wageRead: false },
  'a budget: $600 Groceries': { state: { onboardingProfile: { ...BASE, monthlySpending: '600', spendCats: [{ id: 'groceries', label: 'Groceries', amount: 600, bucket: 'flexible', tier: 'need' }] } }, inflow: false, wageEntered: false, wageRead: false },
  'a debt alone: $9,800 car loan (CF6-10)': { state: { onboardingProfile: { ...BASE }, liabilities: [{ debt_id: 'c', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 9800, interest_rate_apr: 0.069, minimum_monthly_payment: 250, payment_type: 'installment' }] }, inflow: false, wageEntered: false, wageRead: false },
  'a setup loan alone: $30,000 student loan from Sep 2027': { state: { onboardingProfile: { ...BASE, loans: [{ label: 'Student loan', amount: '30000', months: [9], year: '2027', apr: '5', termYears: '10' }] } }, inflow: false, wageEntered: false, wageRead: false },
};

describe('R26 · one set-up gate: every screen opens on the same entries', () => {
  test('the guard looked: eight states, the empty one among them, each on all four screens', () => {
    expect(Object.keys(KINDS)).toHaveLength(8);
  });
  for (const [name, k] of Object.entries(KINDS)) {
    const empty = name === 'nothing entered';
    test(`${name}: the one function says ${empty ? 'nothing' : 'something'} is entered, and Cash flow, Home, Insights and Summary agree`, () => {
      const g = setupEntered({ op: k.state.onboardingProfile, expenses: k.state.expenses, debts: k.state.liabilities });
      expect([g.entered, g.inflow, g.wageEntered, g.wageRead]).toEqual([!empty, k.inflow, k.wageEntered, k.wageRead]);
      // Cash flow: the set-up doors exactly when nothing is entered
      expect(shoot('cashflow', k.state).lines.includes(CF_DOORS)).toBe(!g.entered);
      // Home: the first-day doors exactly when nothing is entered; otherwise its THIS MONTH'S CASH FLOW box
      const home = shoot('home', k.state).lines;
      expect(home.includes(HOME_DOORS)).toBe(!g.entered);
      expect(home.includes('THIS MONTH’S CASH FLOW')).toBe(g.entered);
      // Insights: the 401(k) room only on a wage entered and read
      expect(shoot('insights', k.state).lines.includes(ROOM)).toBe(g.wageRead);
      // Summary: Income Tracker SYNCED exactly when an inflow is entered; the salary named when a wage is entered
      const s = summaryLines(k.state.onboardingProfile);
      expect(s.includes('Capture salary, bonus, equity and rental inflows.')).toBe(!g.inflow);
      expect(s.some((l) => /Monitoring your salary/.test(l))).toBe(g.wageEntered);
    });
  }
});

describe('a debt alone opens the month, and the missing pieces are offered in words (CF6-10)', () => {
  test('a $9,800 car loan alone: the debts-but-no-budget sentence, the pay door, and no surplus', () => {
    const cf = shoot('cashflow', KINDS['a debt alone: $9,800 car loan (CF6-10)'].state).lines;
    expect(cf).toContain('Your debts are here, but you haven’t set your budget. Until you do there is no planned surplus — we won’t guess one.');
    expect(cf).toContain('Your pay is not entered yet — add it ›');
    expect(cf[cf.indexOf('ACTUAL · SO FAR') + 1]).toBe('—');
  });
});

describe('the old answers, kept', () => {
  test.failing('CF6-10 · before: a $9,800 car loan alone showed Cash flow\'s set-up doors', () => {
    expect(shoot('cashflow', KINDS['a debt alone: $9,800 car loan (CF6-10)'].state).lines).toContain(CF_DOORS);
  });
  test.failing('CF6-09 · before: a $600 budget alone showed Home\'s Welcome doors while Cash flow opened its month', () => {
    expect(shoot('home', KINDS['a budget: $600 Groceries'].state).lines).toContain(HOME_DOORS);
  });
  test.failing('CF6-09 · before: a wage that cannot be read showed the summary\'s "Capture salary, …" to a person who entered a salary', () => {
    expect(summaryLines(KINDS['a wage that cannot be read: $100,000, frequency annual'].state.onboardingProfile)).toContain('Capture salary, bonus, equity and rental inflows.');
  });
});

describe('Home\'s box beside a wage that cannot be read tells what is true (CF6-09, CF6-13)', () => {
  // rent $1,800 less $600 = $1,200 a month on a property held, beside a $100,000 wage whose frequency is not recognised
  const STATE = { onboardingProfile: { ...BASE, incomeSources: ['employment', 'rental'], baseSalary: '100000', salaryFreq: 'annual', salaryMode: 'gross', hoursPerWeek: '40',
    rentals: [{ type: 'long', income: '1800', expenses: '600', property_id: 'h' }] },
    assetAccounts: [{ asset_id: 'h', label: 'Rental', asset_class: 'real_estate', balance: 300000 }] };
  test('the box prints what Cash flow prints, the wage\'s sentence under Income, Left —, and says the same aloud', () => {
    const cf = shoot('cashflow', STATE).lines;
    expect(cf).not.toContain(CF_DOORS);
    expect(cf).toContain(SAID);
    const { lines, labels } = shoot('home', STATE);
    const i = lines.indexOf('THIS MONTH’S CASH FLOW');
    const box = lines.slice(i, i + 10);
    const inc = box[box.indexOf('Income') + 1];
    expect(box[box.indexOf('Income') + 2]).toBe(SAID);
    expect(box[box.indexOf('Left') + 1]).toBe('—');
    const spoken = labels.find((l) => l.startsWith('This month’s cash flow'))!;
    expect(spoken).toContain(SAID.replace(/\.$/, ''));
    expect(spoken).not.toMatch(/\.,/);
    expect(spoken).not.toMatch(/income not entered/);
    expect(spoken).toMatch(/nothing left is shown until your pay can be read/);
    // the Income figure is the rent, $1,800 − $600 = $1,200 by hand — the inflow Cash flow's ACTUAL block prints on its own row
    expect(inc).toBe('$1,200');
    const a = cf.indexOf('ACTUAL · SO FAR');
    expect(cf.slice(a, a + 4)).toEqual(['ACTUAL · SO FAR', '—', 'Actual inflow (rent)', '$1,200']);
  });
  test.failing('CF6-13 · before: the spoken label said "income not entered" with a wage entered', () => {
    const spoken = shoot('home', STATE).labels.find((l) => l.startsWith('This month’s cash flow'))!;
    expect(spoken).toMatch(/income not entered/);
  });
});

describe('a Left worked from a calculated take-home wears the same mark as its Income (CF6-18)', () => {
  // $5,000 a month gross, no frequency saved (read as Monthly), the take-home the app's calculation
  const STATE = { onboardingProfile: { ...BASE, incomeSources: ['employment'], baseSalary: '5000', salaryMode: 'gross' } };
  test('Income ~$X · Left ~$Y, and Y = X − the outflow', () => {
    const { lines, labels } = shoot('home', STATE);
    const i = lines.indexOf('THIS MONTH’S CASH FLOW');
    const box = lines.slice(i, i + 10);
    const inc = box[box.indexOf('Income') + 1], out = box[box.indexOf('Outflow (expenses + debt)') + 1], left = box[box.indexOf('Left') + 1];
    expect(inc).toMatch(/^~\$[\d,]+$/);
    expect(left).toMatch(/^~\$[\d,]+$/);
    const n = (s: string) => Number(s.replace(/[^0-9]/g, ''));
    expect(n(left)).toBe(n(inc) - n(out));
    const spoken = labels.find((l) => l.startsWith('This month’s cash flow'))!;
    expect(spoken).toMatch(/income about .*, about .* left/);
  });
  test.failing('CF6-18 · before: Left printed without the mark its Income wears', () => {
    const lines = shoot('home', STATE).lines;
    const i = lines.indexOf('THIS MONTH’S CASH FLOW');
    const box = lines.slice(i, i + 10);
    expect(box[box.indexOf('Left') + 1]).toMatch(/^\$[\d,]+$/);
  });
});

describe('one function, four readers', () => {
  test('each screen reads setupEntered, and none asks its own question', () => {
    const read = (p: string) => fs.readFileSync(path.join(__dirname, '..', '..', '..', p), 'utf8');
    const files = ['src/screens/CashFlowScreen.tsx', 'src/screens/HomeScreen.tsx', 'src/screens/InsightsScreen.tsx', 'src/onboarding/Summary.tsx'];
    for (const f of files) expect([f, /setupEntered\(/.test(read(f))]).toEqual([f, true]);
    expect(files).toHaveLength(4);
    expect(read('src/screens/HomeScreen.tsx')).not.toMatch(/\|\| salaryAnnual\(op\) > 0 \|\| currentRetirementIncomeMonthly\(op\) > 0/);
    expect(read('src/screens/InsightsScreen.tsx')).not.toMatch(/hasEarnedIncome: salaryAnnual\(op\) > 0/);
    expect(read('src/onboarding/Summary.tsx')).not.toMatch(/if \(salaryAnnual\(a as any\) > 0\) p\.push\('salary'\)/);
    // the debt part is Net worth's own rule (FX-NW, 2026-11-02), not a second one
    expect(read('MoneyKeel/functions/cashflow/setup-gate.ts')).toMatch(/debtsEntered\(op, debts\)/);
  });
});
