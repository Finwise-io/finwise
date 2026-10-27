/** THE EMPLOYER MATCH AND THE 401(k) A YEAR — the part-year rule, one figure on every screen that prints it (2026-10-26, FIX-INCOME-A).
 *
 *  A 401(k) and an employer's match come out of pay cheques, so their year is a month × the months the wage is paid (DEC-7938,
 *  DEC-0376, tenet 4). The lead's worked example, by hand: $10,000 a month paid July to December, $1,000 a month into a 401(k), a
 *  50% match → the match is $500 a paid month, $500 × 6 = $3,000 a year (× 12 read $6,000); the 401(k) is $6,000 (× 12 read $12,000).
 *
 *  Where each figure is printed or used, and the function it is read from:
 *    · Your base pay — the match a month, "50% · $500/month" (MK-CF-M-079, MK-CF-F-178 through MK-CF-O-001), and its months paid.
 *    · Sign-up's "Employer match" step — "≈ $500/month of free money" and "About $3,000/year your employer adds".
 *    · The stored income record (MK-CF-F-049, read by IncomeDetailScreen as "Employer 401(k) match $X/year").
 *    · The retirement projection's year of saving (MK-XS-F-030 effectiveAnnualContribution, through the snapshot).
 *    · The Plan cockpit's 401(k) room (k401Headroom on ownK401Annual).
 *  No Net worth screen prints the match or this year: Net worth's Home box reads only the snapshot's net worth (HomeScreen.tsx), and
 *  MK-NW-F-041 monthlyContributionsFromOnboarding is a month — checked below by reading the screens from disk.
 */
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { useStore } from '../store/useStore';
import { renderStep } from './modules';
import { householdEmployerMatchAnnual, ownK401Annual, payrollMonths, householdPreTaxContributionsAnnual } from '../domain/income/earners';
import { wageMatchMonthly, employerMatchMonthly, incomeFromOnboarding } from '../domain/income/onboarding';
import { buildIncomeState } from '../domain/income/calc';
import { effectiveAnnualContribution } from '../domain/snapshot';
import { monthlyContributionsFromOnboarding } from '../domain/assets';
import { basePay, entryFromWage } from '../../MoneyKeel/functions/cashflow/base-pay';
import { k401Headroom, ageAttainedInYear } from '../domain/income/limits';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, Link: ({ children }: any) => children,
}));

const flat = (st: any) => (StyleSheet.flatten(st) ?? {}) as any;
const textOf = (n: any): string => (n == null ? '' : typeof n === 'string' ? n : Array.isArray(n) ? n.map(textOf).join('') : (n.children ?? []).map(textOf).join(''));
const readLines = (): string[] => {
  const out: string[] = [];
  const walk = (n: any) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.type === 'Text') { const t = textOf(n).replace(/\s+/g, ' ').trim(); if (t) out.push(t); return; }
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  void flat;
  return out;
};
const KEYS = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`);
/** the lead's worked example: $10,000 a month paid July to December, $1,000 into a 401(k), a 50% match */
const JULY: any = { status: 'employed', incomeSources: ['employment'], whoEarns: 'you', filingStatus: 'single', birthYear: '1975',
  salaryFreq: 'monthly', salaryMonthMode: 'months', baseSalary: '10000', salaryByMonth: Object.fromEntries(KEYS.map((k, i) => [k, i >= 6 ? 10000 : 0])),
  c_401k: '1000', employerMatchMode: 'pct', employerMatchValue: '50' };
const FULL: any = { ...JULY, salaryMonthMode: 'same', salaryByMonth: undefined };
const signUp = (step: string, answers: any): string[] => {
  useStore.getState().resetAll();
  const r = render(<>{renderStep(step as any, { status: 'employed', tracks: [], answers, setAnswer: jest.fn() } as any)}</>);
  const lines = readLines(); r.unmount(); return lines;
};

beforeAll(() => { jest.useFakeTimers({ now: new Date('2026-10-15T12:00:00'), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] }); });
afterAll(() => { jest.useRealTimers(); });

describe('the worked example: the match is $3,000 a year and the 401(k) $6,000, everywhere', () => {
  test('by hand: $500 a paid month × 6 paid months = $3,000; the 401(k) $1,000 × 6 = $6,000', () => {
    expect(wageMatchMonthly(JULY)).toBe(500);
    expect(payrollMonths(JULY)).toBe(6);
    expect(householdEmployerMatchAnnual(JULY)).toBe(3000);
    expect(ownK401Annual(JULY)).toBe(6000);
    expect(householdPreTaxContributionsAnnual(JULY)).toBe(6000);
  });
  test('Your base pay: the match a month is $500 and the wage is paid six months — $3,000, the same year', () => {
    const p = basePay({ earners: [{ name: 'You', entry: entryFromWage(JULY) }], profile: JULY });
    expect(p.earners[0].pay.matchMonthly).toBe(500);
    expect(p.earners[0].pay.matchMonthly * p.earners[0].pay.paidMonths).toBe(householdEmployerMatchAnnual(JULY));
  });
  test('sign-up\'s "Employer match" step: "≈ $500/month of free money" and "About $3,000/year" (it read $6,000)', () => {
    const L = signUp('employerContribution', JULY);
    expect(L).toContain('≈ $500/month of free money');
    expect(L).toContain('About $3,000/year your employer adds on top of your own savings.');
  });
  test('the stored income record (what IncomeDetailScreen prints as "Employer 401(k) match $X/year"): $3,000', () => {
    const doc = incomeFromOnboarding('u' as any, JULY);
    expect(buildIncomeState('u', doc.sources, doc.tax, JULY).employer_match_annual).toBeCloseTo(3000, 6);
  });
  test('the retirement projection\'s year of saving: $6,000 + $3,000 = $9,000 (it read $1,500 × 12 = $18,000)', () => {
    expect(monthlyContributionsFromOnboarding(JULY)).toBe(1500);
    expect(effectiveAnnualContribution(JULY)).toBe(9000);
  });
  test('the Plan cockpit\'s 401(k) room is worked on the $6,000 put in this year', () => {
    const age = ageAttainedInYear(1975);
    expect(k401Headroom(age, ownK401Annual(JULY)).used).toBe(6000);
  });
});

describe('a full year is exactly × 12 — nothing moves for a wage paid every month', () => {
  const HOUSEHOLDS: any[] = [
    FULL,
    { ...FULL, employerMatchMode: 'dollar', employerMatchValue: '300' },
    { ...FULL, c_401k: '3200', employerMatchMode: 'pct', employerMatchValue: '50' },            // held at the 401(k) limit
    { ...FULL, c_roth: '500', c_invest: '250' },
    { ...FULL, employerMatchMode: undefined, employerMatchValue: '50' },                       // no choice tapped: a percent
    { ...FULL, whoEarns: 'both', employerMatchMode: 'dollar', employerMatchValue: '200',
      partnerWage: { salaryFreq: 'monthly', baseSalary: '4500', c_401k: '400', employerMatchMode: 'dollar', employerMatchValue: '150' } },
  ];
  test('six households: the projection\'s year = MK-NW-F-041\'s month × 12, and the match a year = MK-CF-F-078 × 12', () => {
    expect(HOUSEHOLDS).toHaveLength(6);
    for (const op of HOUSEHOLDS) {
      expect(effectiveAnnualContribution(op)).toBeCloseTo((monthlyContributionsFromOnboarding(op) as number) * 12, 6);
      expect(householdEmployerMatchAnnual(op)).toBeCloseTo(employerMatchMonthly(op) * 12, 6);
      expect(ownK401Annual(op)).toBeCloseTo(Number(op.c_401k) * 12, 6);
    }
  });
});

describe('no wage on record: a payroll amount is read as entered, every month (tenet 3)', () => {
  test('a $200 match a month typed with no salary is $2,400 a year, as before — never $0', () => {
    const op: any = { c_401k: '500', employerMatchMode: 'dollar', employerMatchValue: '200' };
    expect(payrollMonths(op)).toBe(12);
    expect(householdEmployerMatchAnnual(op)).toBe(2400);
    expect(ownK401Annual(op)).toBe(6000);
    expect(effectiveAnnualContribution(op)).toBe(8400);
  });
  test('an hourly wage with no hours a week has no paid month, so none of its match is counted (DEC-0296)', () => {
    expect(payrollMonths({ salaryFreq: 'hourly', baseSalary: '25', c_401k: '500' })).toBe(0);
  });
});

describe('the 401(k)-room insight (InsightsScreen) — the old reading kept', () => {
  test('July-to-December worker: the room is worked on the $6,000 put in this year', () => {
    const age = ageAttainedInYear(1975);
    expect(k401Headroom(age, ownK401Annual(JULY)).remaining).toBe(k401Headroom(age, 6000).remaining);
  });
  test.failing('the app until 2026-10-26, pinned (no longer its answer): the insight read num(op.c_401k) × 12 — $12,000 put in', () => {
    const insights = fs.readFileSync(path.join(__dirname, '..', 'screens', 'InsightsScreen.tsx'), 'utf8');
    expect(insights).toMatch(/k401Headroom\(age, num\(op\.c_401k\) \* 12\)/);
  });
});

describe('the screens that print it, read from disk — a guard that proves it looked', () => {
  test('every screen printing the match a year, or the 401(k) a year, reads the one rule; Net worth prints neither', () => {
    const ROOT = path.join(__dirname, '..', '..');
    const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory()
      ? (e.name === '__tests__' || e.name === 'node_modules' ? [] : walk(path.join(d, e.name)))
      : /\.tsx$/.test(e.name) && !/\.test\./.test(e.name) ? [path.join(d, e.name)] : []));
    const files = ['src/screens', 'src/components', 'src/onboarding', 'app'].flatMap((d) => walk(path.join(ROOT, d)));
    expect(files.length).toBeGreaterThanOrEqual(140);   // 147 on 2026-10-26
    const read = (f: string) => fs.readFileSync(f, 'utf8');
    // a match or a 401(k) turned into a year on a screen by × 12
    const offenders = files.filter((f) => /(match\w*|c_401k\)?)\s*\*\s*12\b/i.test(read(f).split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n')));
    // NONE LEFT (2026-10-26): InsightsScreen's 401(k)-room insight read num(op.c_401k) × 12 in two places; it reads ownK401Annual now,
    // per person, as the cockpit does (the lead, accepted). The Plan's own monthly-saving arithmetic (planSave × 12) and sign-up's
    // 401(k) step ("the plan's year", FIX-ROOM's ruling 1, written as monthly401k × 12) are not read off pay.
    expect(offenders.map((f) => path.relative(ROOT, f))).toEqual([]);
    const insights = read(path.join(ROOT, 'src/screens/InsightsScreen.tsx'));
    expect(insights.match(/k401Headroom\(age, ownK401Annual\(op\)\)/g) ?? []).toHaveLength(2);
    expect(read(path.join(ROOT, 'src/onboarding/modules.tsx'))).toMatch(/householdEmployerMatchAnnual\(a as any\)/);
    expect(read(path.join(ROOT, 'src/screens/RetirementCockpit.tsx'))).toMatch(/const annual401k = ownK401Annual\(op\);/);
    for (const nw of files.filter((f) => /NetWorth|Account(Portfolio|Detail)|AddAccount/.test(path.basename(f)))) {
      expect(read(nw)).not.toMatch(/employerMatch|matchMonthly|effectiveAnnualContribution|monthlyContributionsFromOnboarding/);
    }
  });
});
