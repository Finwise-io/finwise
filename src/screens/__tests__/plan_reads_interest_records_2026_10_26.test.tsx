/** THE PLAN READS THE YEAR'S INTEREST THE WAY THE INCOME SUMMARY DOES: RECORDS → TYPED → CALCULATED (2026-10-26, CLEANUP-LEFT).
 *
 *  willItLastInputs (MK-PL-F-067) works the tax rate on required withdrawals from the profile every tax figure reads
 *  (profileWithAccountIncome). It reads the year's interest records only if they are handed in, and none of its 16 callers handed
 *  them in: with a savings account at 4% and $3,000 of interest on record, the Income summary counted the $3,000 and the plan
 *  the $2,000 the rate gives. All 16 callers now hand in the store's records. Two checks: the source of every call (16 of 16),
 *  and one screen — Will my money last — beside the Income summary for the same household.
 */
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { render, screen } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { builtLines } from '../../testing/mockMatch';
import { money } from '../../domain/_shared/num';
import { effectiveRateOnGrossFor } from '../../domain/income/tax';

const mockCaptured: any[] = [];
jest.mock('../../domain/retirement/willItLast', () => {
  const actual = jest.requireActual('../../domain/retirement/willItLast');
  return { ...actual, selectWillItLast: (a: any) => { mockCaptured.push(a); return actual.selectWillItLast(a); } };
});
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

const FAKE = ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] as const;
beforeEach(() => { jest.useFakeTimers({ now: new Date('2026-10-26T12:00:00'), doNotFake: [...FAKE] }); mockCaptured.length = 0; });
afterEach(() => { jest.useRealTimers(); });

const OP: any = { status: 'employed', incomeSources: ['employment'], birthYear: '1966', filingStatus: 'single', whoEarns: 'you',
  baseSalary: '10000', salaryFreq: 'monthly', salaryMode: 'gross', monthlySpending: '5000' };
const SAVINGS: any = { asset_id: 'sav', label: 'Savings', kind: 'savings', tax_bucket: 'TAXABLE', balance: 50_000, coupon_rate: 0.04, asset_class: 'cash' };
const IRA: any = { asset_id: 'ira', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 415_000 };
const RECORDS = [{ id: 'i1', account_id: 'sav', type: 'INTEREST', amount: 3_000, date: '2026-06-30' }];
const setUp = () => {
  useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
  useStore.setState({ hideBalances: false, onboardingProfile: OP, assetAccounts: [SAVINGS, IRA], transactions: RECORDS, nwSetupChoice: 'self' } as any);
};

test('Will my money last, beside the Income summary: one gross a year, $123,000 — the $3,000 on record, not the $2,000 the rate gives', () => {
  setUp();
  const Summary = require('../IncomeSummaryScreen').default;
  render(<Summary />);
  const L = builtLines(screen.toJSON());
  const gross = L[L.indexOf('= Gross /year') + 1];
  screen.unmount();
  // by hand: $120,000 of wages + the year's records, $3,000 (records win over the 4% × $50,000 = $2,000 calculated)
  expect(gross).toBe(money(123_000));

  const Wil = require('../WillItLastScreen').default;
  render(<Wil />);
  expect(mockCaptured.length).toBeGreaterThanOrEqual(1);
  const args = mockCaptured[mockCaptured.length - 1];
  expect(args.transactions).toEqual(RECORDS);
  const { willItLastInputs } = jest.requireActual('../../domain/retirement/willItLast');
  const inputs = willItLastInputs(args);
  // by hand: $123,000 − $16,100 = $106,900 → $1,240 + $4,560 + 22% × $55,300 + 24% × $1,200 = $18,254; ÷ $123,000 = 14.8407%
  expect(inputs.rmd_tax_rate).toBeCloseTo(18_254 / 123_000, 9);
  expect(inputs.rmd_tax_rate).toBeCloseTo(effectiveRateOnGrossFor(123_000, 'single', 0, 0), 12);
  // without the records the plan read the $2,000 the rate gives: $122,000 → 14.7656%
  expect(willItLastInputs({ ...args, transactions: undefined }).rmd_tax_rate).toBeCloseTo(18_014 / 122_000, 9);
});

/** every call of the plan's two doors in the app, read from the source — each hands in the records */
function callSites(): { file: string; text: string }[] {
  const ROOT = path.join(__dirname, '..', '..', '..');
  const out: { file: string; text: string }[] = [];
  const walk = (dir: string) => {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, d.name);
      if (d.isDirectory()) { if (d.name !== '__tests__' && d.name !== 'node_modules') walk(p); continue; }
      if (!/\.(ts|tsx)$/.test(d.name) || /\.test\./.test(d.name)) continue;
      const src = fs.readFileSync(p, 'utf8');
      for (const m of src.matchAll(/\b(selectWillItLast|willItLastInputs)\(/g)) {
        const before = src.slice(Math.max(0, m.index! - 20), m.index!);
        if (/function\s+$/.test(before) || /\*\s*$/.test(src.slice(src.lastIndexOf('\n', m.index!) + 1, m.index!))) continue;   // the definition, a header line
        // the call's own argument text, to its closing parenthesis
        let depth = 0, i = m.index! + m[0].length - 1;
        for (; i < src.length; i++) { if (src[i] === '(') depth++; else if (src[i] === ')') { depth--; if (depth === 0) break; } }
        out.push({ file: path.relative(ROOT, p), text: src.slice(m.index!, i + 1) });
      }
    }
  };
  walk(path.join(ROOT, 'src')); walk(path.join(ROOT, 'MoneyKeel', 'functions'));
  return out;
}

test('16 of 16 calls hand the plan the records (the one inside willItLast.ts passes its own argument on)', () => {
  const sites = callSites().filter((c) => !/src\/domain\/retirement\/willItLast\.ts$/.test(c.file) && !/^\s*(selectWillItLast|willItLastInputs)\(a\)/.test(c.text));
  const rothArgs = fs.readFileSync(path.join(__dirname, '..', 'RothScreen.tsx'), 'utf8').match(/const wilArgs = \{[^\n]*\}/)?.[0] ?? '';
  expect(rothArgs).toMatch(/transactions: store\.transactions/);
  const missing = sites.filter((c) => !/transactions/.test(c.text) && !/wilArgs/.test(c.text));
  // THE WORKED EXAMPLE (2026-10-30, PF-TOOLS: src/domain/planning/rothConversion.ts runs Roth conversion's figures on a fixed
  // household, ROTH_OP, before and after a conversion): two more calls, each handing in that household's records — none, [] —
  // so the app's 16 callers stand and the file reads 18 in all. Counted apart, so a new caller in the app still shows here.
  const example = sites.filter((c) => /src\/domain\/planning\/rothConversion\.ts$/.test(c.file));
  console.log(`plan calls read: ${sites.length} — ${sites.length - example.length} in the app, ${example.length} in the worked example`);
  // A GUARD MUST PROVE IT LOOKED: the calls it read, by file
  expect(sites.length - example.length).toBe(16);
  expect(example.every((c) => /transactions: \[\]/.test(c.text) && /ROTH_OP/.test(c.text))).toBe(true);
  expect(missing.map((c) => c.file)).toEqual([]);
});
