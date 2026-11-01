/** ONE RETIREMENT AGE — THE ENGINE'S AGE IS THE AGE EVERY SCREEN PRINTS (the lead's ruling R10, 2026-10-31; NW3-01; tenet 2, DEC-3523).
 *
 *  Net worth's plan line read "retire at 67 with ~$19,000, running short around age 66" for a household with no retirement age entered,
 *  while the plan retired them at 65: the $19,000 was the pot at 65, and the money ran out at 66. The 67 was the screen's own fallback;
 *  the Plan tab carried the same one, and the future paycheck and What-if another two. Now one reader (planRetireAgeOf,
 *  src/domain/retirement/retireAge.ts) answers for all of them, and a sentence that names an age nobody entered says it is ours.
 *  This test renders each screen that prints the age and holds it to the engine's, both ways: with nothing entered, and with 67 typed.
 *  It then reads the disk for any retirement-age fallback written outside the reader, so a new one fails here.
 */
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../store/useStore';
import { builtLines } from '../testing/mockMatch';
import { willItLastInputs, planRetireAgeOf, RETIRE_AGE_ASSUMED } from '../domain/retirement/willItLast';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, Link: ({ children }: any) => children, Redirect: () => null,
}));
jest.mock('../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

const FAKE = ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] as const;
beforeEach(() => { jest.useFakeTimers({ now: new Date('2026-10-31T12:00:00'), doNotFake: [...FAKE] }); });
afterEach(() => { jest.useRealTimers(); });

const ROOT = path.join(__dirname, '..', '..');
/** NW3-01's household: born 1970, working, $18,000 of cash, a $450,000 home, $3,200 a month; no retirement age entered */
const OP: any = { status: 'employed', incomeSources: ['employment'], birthYear: '1970', baseSalary: '5000', salaryMode: 'takehome', salaryFreq: 'monthly',
  taxMode: 'manual', manualTaxRate: '0', monthlySpending: '3200' };
const ACCOUNTS: any[] = [
  { asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 18_000 },
  { asset_id: 'home', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 450_000 },
];
function seed(extra: Record<string, any> = {}, assumptions: Record<string, any> = {}) {
  useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
  useStore.setState({ hideBalances: false, onboardingProfile: { ...OP, ...extra }, assetAccounts: ACCOUNTS, liabilities: [], transactions: [],
    retirementAssumptions: assumptions, nwSetupChoice: 'self' } as any);
}
const linesOf = (name: string) => {
  const C = require(`../screens/${name}`).default;
  const r = render(<C />);
  const L = builtLines(screen.toJSON());
  r.unmount();
  return L;
};

describe.each([
  ['nothing entered', {}, {}, 65, ' (ours until you change it)'],
  ['67 typed in sign-up', { targetRetirementAge: '67' }, {}, 67, ''],
  ['66 set on the Plan', {}, { retireAge: 66 }, 66, ''],
])('%s', (_name, extra, assumptions, age, mark) => {
  test(`the engine retires at ${age}, and the reader says so${mark ? ', ours' : ''}`, () => {
    seed(extra, assumptions);
    const st = useStore.getState() as any;
    const inputs = willItLastInputs({ op: st.onboardingProfile, accounts: st.assetAccounts, assumptions: st.retirementAssumptions, employmentStatus: st.employmentStatus, transactions: [] } as any);
    expect(inputs?.retire_age).toBe(age);
    expect(planRetireAgeOf({ assumptions: st.retirementAssumptions, op: st.onboardingProfile, age: 56 })).toEqual({ age, ours: mark !== '' });
  });
  test(`Net worth's plan line names ${age}${mark}`, () => {
    seed(extra, assumptions);
    const L = linesOf('NetWorthScreen');
    const line = L.find((l) => /retire at \d+/.test(l));
    expect(line).toMatch(new RegExp(`retire at ${age}${mark.replace(/[()]/g, '\\$&')} with ~\\$`));
    expect(L.join(' ')).not.toMatch(new RegExp(`retire at (?!${age})\\d+`));
  });
  test(`the Plan tab's Retire at row reads ${age}${mark ? ', ours until you change it' : ''}`, () => {
    seed(extra, assumptions);
    const L = linesOf('PlanHubScreen');
    const i = L.findIndex((l) => l.startsWith('Retire at'));
    expect(i).toBeGreaterThanOrEqual(0);
    expect(L.slice(i, i + 4)).toContain(String(age));
    expect(L[i].includes('ours until you change it')).toBe(mark !== '');
  });
  test(`the Retirement cockpit's plan line names ${age}`, () => {
    seed(extra, assumptions);
    const L = linesOf('RetirementCockpit');
    expect(L).toContain(`AT YOUR TARGET, ${age}`);
    expect(L.find((l) => l.startsWith('▸ Everything below assumes your plan'))).toMatch(new RegExp(`retire at ${age}\\b`));
  });
  test(`Cash flow's future paycheck names ${age}${mark}`, () => {
    seed(extra, assumptions);
    const C = require('../screens/CashFlowScreen').default;
    render(<C />);
    const L = builtLines(screen.toJSON());
    const at = L.find((l) => /^At \d+/.test(l));
    expect(at).toMatch(new RegExp(`^At ${age}${mark.replace(/[()]/g, '\\$&')}: ~\\$[\\d,]+/month$`));
  });
  test(`What-if starts from ${age}`, () => {
    seed(extra, assumptions);
    const L = linesOf('WhatIfScreen');
    expect(L.join(' ')).toMatch(new RegExp(`AT ${age} \\(ESTIMATES\\)`));
  });
});

test('no retirement-age fallback is written outside the one reader — the disk, read; every caller named', () => {
  const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return ['__tests__', 'node_modules'].includes(e.name) ? [] : walk(p);
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
  });
  const files = ['src', 'MoneyKeel/functions', 'app'].map((d) => path.join(ROOT, d)).flatMap(walk);
  const fallback = /(retireAge|targetRetirementAge|target_retirement_age|targetRetireAge)\)?\s*(\?\?|\|\|)\s*\(?\s*6\d\b/;
  const offences = files.filter((f) => !/retireAge\.ts$/.test(f)).flatMap((f) => fs.readFileSync(f, 'utf8').split('\n')
    .map((l, i) => (fallback.test(l) && !/^\s*(\/\/|\*)/.test(l) ? `${path.relative(ROOT, f)}:${i + 1}: ${l.trim().slice(0, 120)}` : null)).filter(Boolean));
  expect(offences).toEqual([]);
  // COVERAGE — the callers that read the one age, by name: the engine, the cockpit, Net worth, the Plan tab (twice), What-if, the
  // future paycheck, sign-up's step, the snapshot and the persona. A guard must prove it looked: the files it read, and these found.
  // a reader CALLS the one age: a generated header's "Reaches" line that names MK-PL-F-102 planRetireAgeOf is not a call (2026-11-01,
  // CLEANUP-TESTS: write-headers put it in old-rent-migration.ts's header, which reads no age), so comment lines are not read here
  const code = (f: string) => fs.readFileSync(f, 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const readers = files.filter((f) => /planRetireAgeOf|RETIRE_AGE_ASSUMED/.test(code(f)) && !/retireAge\.ts$/.test(f)).map((f) => path.relative(ROOT, f)).sort();
  expect(readers).toEqual([
    'MoneyKeel/functions/cashflow/future-paycheck.ts',
    'src/domain/retirement/willItLast.ts',
    'src/domain/snapshot.ts',
    'src/onboarding/modules.tsx',
    'src/screens/NetWorthScreen.tsx',
    'src/screens/PlanHubScreen.tsx',
    'src/screens/RetirementCockpit.tsx',
    'src/screens/WhatIfScreen.tsx',
    'src/utils/persona.ts',
  ]);
  expect(files.length).toBeGreaterThanOrEqual(280);   // 288 source files read on 2026-10-31
  expect(RETIRE_AGE_ASSUMED).toBe(65);
});

test.failing('Net worth until 2026-10-31, pinned: the plan line said 67 while the plan retired the person at 65 (FIXED 2026-10-31)', () => {
  seed();
  expect(linesOf('NetWorthScreen').join(' ')).toMatch(/retire at 67 with/);
});

test.failing('Cash flow until 2026-10-31, pinned: the future paycheck said ‘At 67’ for a person with no age entered, beside odds worked at 65 (FIXED 2026-10-31)', () => {
  seed();
  const C = require('../screens/CashFlowScreen').default;
  render(<C />);
  expect(builtLines(screen.toJSON()).some((l) => /^At 67: ~\$/.test(l))).toBe(true);
});
