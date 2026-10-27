/**
 * YOUR BASE PAY — the four READ THIS FIRST rows of 2026-10-26 on income-end-to-end_v07 (FIX-INCOME-A), held on the rendered
 * screen in the household each row describes. Every figure here is the one MK-CF-O-001 basePay gives, worked by hand beside it.
 *
 *  1. Paid by the hour: "Hours a week" is asked; with none entered the pay is no number and the screen says so (DEC-0296).
 *  2. Pay for part of the year: every "/month" is a month the wage is paid (DEC-7938, DEC-0376).
 *  3. The bracket is read on every source (DEC-0178).
 *  4. A take-home typed as $0 is the person's answer (tenet 5).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import BasePayScreen from '../BasePayScreen';
import { useStore } from '../../store/useStore';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), useSegments: () => [],
}));

const setProfile = (op: any) => { useStore.getState().resetAll?.(); useStore.setState({ onboardingProfile: op, onboardingComplete: true, hideBalances: false } as any); };
const lines = () => {
  const out: string[] = [];
  const walk = (n: any) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.type === 'Text') {
      const t = (function txt(x: any): string { return x == null ? '' : typeof x === 'string' ? x : Array.isArray(x) ? x.map(txt).join('') : (x.children ?? []).map(txt).join(''); })(n).replace(/\s+/g, ' ').trim();
      if (t) out.push(t); return;
    }
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
};
const KEYS = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`);
const fromJuly = (v: number) => Object.fromEntries(KEYS.map((k, i) => [k, i >= 6 ? v : 0]));

beforeAll(() => { jest.useFakeTimers({ now: new Date('2026-10-15T12:00:00'), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] }); });
afterAll(() => { jest.useRealTimers(); });

describe('row 1 — paid by the hour', () => {
  test('Hourly with no hours: the box is asked, the section and the household card say what is missing, and no total is shown', () => {
    setProfile({ whoEarns: 'you', filingStatus: 'single', salaryFreq: 'hourly', baseSalary: '25' });
    render(<BasePayScreen />);
    expect(screen.getByText('Hours a week')).toBeOnTheScreen();
    expect(screen.getByText('The hours you are usually paid for.')).toBeOnTheScreen();
    expect(screen.getByLabelText('You hours a week')).toBeOnTheScreen();
    const said = lines().filter((l) => l === 'Hours a week not entered — your hourly pay is not counted until it is.');
    expect(said).toHaveLength(2);                        // in the section, and in place of the household card's figures
    expect(screen.queryByText('Gross /year')).toBeNull();
    expect(screen.queryByText('= Take-home')).toBeNull();
    expect(lines().some((l) => /\$4,333/.test(l))).toBe(false);   // never a 40-hour week nobody entered
  });
  test('typing 40 hours: the warning goes and $25 × 40 × 52 = $52,000 a year is counted', () => {
    setProfile({ whoEarns: 'you', filingStatus: 'single', salaryFreq: 'hourly', baseSalary: '25' });
    render(<BasePayScreen />);
    fireEvent.changeText(screen.getByLabelText('You hours a week'), '40');
    expect(lines().filter((l) => /^Hours a week not entered/.test(l))).toHaveLength(0);
    expect(screen.getByText('$52,000')).toBeOnTheScreen();
    expect((useStore.getState() as any).onboardingProfile.hoursPerWeek).toBe('40');
  });
  test('a wage not paid by the hour is never asked the hours', () => {
    setProfile({ whoEarns: 'you', filingStatus: 'single', salaryFreq: 'monthly', baseSalary: '5000' });
    render(<BasePayScreen />);
    expect(screen.queryByText('Hours a week')).toBeNull();
  });
  test('closed, the section reads "Hourly · hours a week not entered" and carries no tick', () => {
    setProfile({ whoEarns: 'both', filingStatus: 'married', partnerName: 'Sam', salaryFreq: 'monthly', baseSalary: '5000',
      partnerWage: { salaryFreq: 'hourly', baseSalary: '30' } });
    render(<BasePayScreen />);
    expect(screen.getByText('Hourly · hours a week not entered')).toBeOnTheScreen();
    expect(lines()).toContain('Hours a week not entered — Sam’s hourly pay is not counted until it is.');
  });
});

describe('row 2 — pay for part of the year: every "/month" is a month the wage is paid', () => {
  test('paid $10,000.05 a month July to December, $501.13 into a 401(k), take-home typed $3,799.17: everything else $5,700/month · 57%', () => {
    setProfile({ whoEarns: 'you', filingStatus: 'single', birthYear: '1975', salaryFreq: 'monthly', salaryMonthMode: 'months', baseSalary: '10000.05',
      salaryByMonth: fromJuly(10000.05), c_401k: '501.13', landsTypical: '3799.17' });
    render(<BasePayScreen />);
    const all = lines();
    expect(all).toContain('$5,700/month · 57.00%');   // the rate in force to two decimals since 2026-10-26 (MK-CF-M-081; Q49)           // $10,000.05 − $501.13 − $3,799.17 = $5,699.75 a paid month
    expect(all).toContain('$3,799/month');                 // = Take-home, as typed
    expect(all.some((l) => /cannot all be right/.test(l))).toBe(false);   // the unpaid months are not reconciled
  });
  test('the take-home calculated, $10,000 a month from July, $1,000 into a 401(k): $10,000 gross − $717 tax − $1,000 of 401(k)s = $8,283', () => {
    setProfile({ whoEarns: 'you', filingStatus: 'single', birthYear: '1975', salaryFreq: 'monthly', salaryMonthMode: 'months', baseSalary: '10000',
      salaryByMonth: fromJuly(10000), c_401k: '1000' });
    render(<BasePayScreen />);
    expect(lines()).toContain('$10,000 gross − $717 tax − $1,000 of 401(k)s = $8,283.');
  });
});

describe('row 3 — the bracket reads every source', () => {
  test('$60,000 of wages and $50,000 of rent kept, single: 22%', () => {
    setProfile({ whoEarns: 'you', filingStatus: 'single', salaryFreq: 'monthly', baseSalary: '5000',
      rentals: [{ property_id: 'h1', type: 'long', income: 50000 / 12, expenses: 0 }] });
    render(<BasePayScreen />);
    const all = lines();
    expect(all[all.indexOf('Federal tax bracket') + 2]).toBe('22%');
  });
  test('two wages and other income: the note says so', () => {
    setProfile({ whoEarns: 'both', filingStatus: 'married', partnerName: 'Sam', salaryFreq: 'monthly', baseSalary: '7000', landsTypical: '5000',
      invAnnual: '12000', partnerWage: { salaryFreq: 'monthly', baseSalary: '4500', landsTypical: '3300' } });
    render(<BasePayScreen />);
    expect(screen.getByText('on both wages and your other income, filing jointly')).toBeOnTheScreen();
  });
});

describe('row 4 — a take-home typed as $0 is the person\'s answer', () => {
  test('$5,000 a month, $500 into a 401(k), take-home 0: take-home $0, everything else $4,500/month · 90%', () => {
    setProfile({ whoEarns: 'you', filingStatus: 'single', salaryFreq: 'monthly', baseSalary: '5000', c_401k: '500', landsTypical: '0' });
    render(<BasePayScreen />);
    const all = lines();
    expect(all).toContain('$4,500/month · 90.00%');   // $4,500 ÷ $5,000 = 90.00% (MK-CF-M-081, two decimals since 2026-10-26)
    expect(all).toContain('$0/month');
    expect(all.some((l) => /≈/.test(l))).toBe(false);      // nothing calculated
  });
});
