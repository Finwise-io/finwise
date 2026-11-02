/** ROTH CONVERSION, REQUIRED WITHDRAWALS AND THE RETIREMENT COCKPIT, HELD TO THEIR DRAWINGS (2026-10-26, CLEANUP-LEFT; the lead's
 *  round 2, item 6). The three screens had no drawing; each was drawn from the build on 2026-10-26 — no approval on record —
 *  in MoneyKeel/documents/plan/: moneykeel_pres_mock_roth-conversion_v01.html, moneykeel_pres_mock_required-withdrawals_v01.html,
 *  moneykeel_pres_mock_retirement-cockpit_v01.html. Every word of each drawn screen — the bar above it and the tab bar aside, which
 *  the navigator draws, and the chart, whose labels a phone measures — is read off the rendered screen, in order, figures as printed.
 *
 *  2026-10-27 (FX-PLAN): the cockpit is held to moneykeel_pres_mock_retirement-cockpit_v02.html — THE BARS OF THE STANDARD DESIGN (his
 *  words that day, DEC-8839: "the standard design says box titles in dark green bar, and sub-titles in light green bar"). v01 is in
 *  the folder's archive/ under that date. Roth conversion and Required withdrawals were checked against the same words and already
 *  met them: every box title on a dark bar across its card, no sub-title; their drawings carry a dated row saying so.
 */
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { setHideBalances } from '../../domain/_shared/money';
import { builtLinesWithBoxes, normPrinted, firstDifference } from '../../testing/mockMatch';
import { barsAndReach } from '../../testing/bandGeometry';
import { Colors } from '../../utils/theme';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

const FAKE = ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] as const;
beforeEach(() => { jest.useFakeTimers({ now: new Date('2026-10-26T12:00:00'), doNotFake: [...FAKE] }); });
afterEach(() => { setHideBalances(false); jest.useRealTimers(); });

/** the drawings' household (each caption): born 1966, single, $70,000 of wages, $10,000 of it into a 401(k) */
const OP: any = { status: 'employed', incomeSources: ['employment'], birthYear: '1966', filingStatus: 'single', whoEarns: 'you',
  baseSalary: String(70_000 / 12), salaryFreq: 'monthly', salaryMode: 'gross', c_401k: String(10_000 / 12), monthlySpending: '4500' };
const ACCOUNTS: any[] = [
  { asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 20000 },
  { asset_id: 'ira', label: 'IRA', institution: 'Fidelity', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 415000 },
  { asset_id: 'roth', label: 'Roth IRA', kind: 'roth_ira', tax_bucket: 'ROTH', balance: 88000 },
];
function open(name: string, mode: 'simple' | 'advisor' = 'simple') {
  useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
  useStore.setState({ hideBalances: false, displayMode: mode, onboardingProfile: OP, assetAccounts: ACCOUNTS, transactions: [], nwSetupChoice: 'self' } as any);
  const C = require(`../${name}`).default;
  return render(<C />);
}
/** a drawing's own words: the phone's content between its two markers, the chart taken out */
function drawn(file: string, marker: string): string[] {
  const html = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'MoneyKeel/documents/plan', file), 'utf8');
  const from = html.indexOf(`id="${marker}"`), to = html.indexOf(`id="${marker}-end"`);
  expect(from).toBeGreaterThan(0); expect(to).toBeGreaterThan(from);
  return html.slice(html.indexOf('>', from) + 1, html.lastIndexOf('<', to)).replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '\n')
    .replace(/&amp;/g, '&').replace(/&#39;/g, "'").split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
}
/** THE ROWS OF 2026-10-30 ON ALL THREE DRAWINGS (CLEANUP-TESTS; DEC-8336 carried to the Plan screens): every apostrophe inside a
 *  word prints as ’ — the phones, drawn from the build before that day, draw a straight ' ("you'd need about", "today's $523K") */
const applyRows = (lines: string[]) => lines.map((l) => l.replace(/([A-Za-z])'([A-Za-z])/g, '$1’$2'));
const holds = (file: string, marker: string, floor: number) => {
  const lines = applyRows(drawn(file, marker));
  expect(firstDifference(normPrinted(lines), normPrinted(builtLinesWithBoxes(screen.toJSON())))).toBe('');
  expect(lines.length).toBeGreaterThanOrEqual(floor);   // A GUARD MUST PROVE IT LOOKED: the whole screen, not a fragment
};

test('Roth conversion v02 — $20,000 typed: the tax at the exact rate, what it buys row by row, the odds in his shape (DEC-8890)', () => {
  open('RothScreen');
  fireEvent.changeText(screen.getByLabelText('Amount to convert this year'), '20000');
  holds('moneykeel_pres_mock_roth-conversion_v02.html', 'roth-content', 30);
  // every box runs end to end across the screen, so its dark bar does (his words of 2026-10-27)
  const bars = barsAndReach(screen.toJSON());
  expect(bars.map((b) => `${b.kind} ${b.title}`)).toEqual(['dark CONVERT THIS YEAR', 'dark THE COST NOW', 'dark WHAT IT BUYS LATER', 'dark WILL MY MONEY LAST?']);
  expect(bars.filter((b) => b.screenLeft !== 0 || b.screenRight !== 0).map((b) => `${b.title}: ${b.screenLeft} / ${b.screenRight} short of the phone's edges`)).toEqual([]);
});

test('Roth conversion v02 — every figure the drawing prints is the engine’s, worked here and not typed', () => {
  const { rmdAtAge, rmdDivisorAtAge, rmdStartAgeFor } = require('../../domain/decumulation');
  const { paycheckReturn, growthUsed } = require('../../domain/paycheck');
  const { resolveNetWorthRows } = require('../../domain/snapshot');
  const { selectWillItLast } = require('../../domain/retirement/willItLast');
  const rows = resolveNetWorthRows('local', OP, false, ACCOUNTS, []);
  const g = growthUsed(paycheckReturn(rows.accounts, {}, OP)).rate;
  const years = rmdStartAgeFor(60) - 60;
  const before = rmdAtAge(415_000 * (1 + g) ** years, 75), after = rmdAtAge(395_000 * (1 + g) ** years, 75);
  expect([years, rmdDivisorAtAge(75), Math.round(before), Math.round(after), Math.round(before - after)]).toEqual([15, 24.6, 50_737, 48_292, 2_445]);
  expect(Math.round(before) - Math.round(after)).toBe(Math.round(before - after));   // the rows add up as printed
  expect(Math.round(20_000 * (1 + g) ** years)).toBe(60_151);
  // the odds, run twice on the same 1,000 futures: as you are; and converted — $20,000 from the IRA to the Roth, $3,750 tax from Checking
  const args: any = { op: OP, accounts: rows.accounts, assumptions: {}, transactions: [] };
  const now = selectWillItLast(args);
  const converted = selectWillItLast({ ...args, accounts: rows.accounts.map((a: any) => ({ ...a,
    balance: a.asset_id === 'chk' ? 16_250 : a.asset_id === 'ira' ? 395_000 : a.asset_id === 'roth' ? 108_000 : a.balance })) });
  expect([now.inputs.start_balance, now.horizonAge, now.inputs.retire_age, now.chance, converted.chance]).toEqual([523_000, 90, 65, 35.3, 36.2]);
  // ONE NEST EGG (2026-10-30): the cockpit's own figure — today's $523,000 grown 5 years at 7.617% with $10,000 added each year —
  // through the one function (MK-PL-F-055 projectNestEgg), before and after; never the simulation's middle future ($789,749 → $783,830)
  const { projectNestEgg } = require('../../domain/retirement');
  expect([Math.round(now.nestEggAtRetirement), Math.round(converted.nestEggAtRetirement)]).toEqual([813_149, 809_588]);
  expect(now.nestEggAtRetirement).toBe(projectNestEgg(now.inputs).will_have);
  // the cockpit's year-by-year walk to 65, as the cockpit writes it: balance × (1 + return) + a year's saving, five times
  let walk = 523_000; for (let y = 0; y < 5; y += 1) walk = walk * (1 + g) + 10_000;
  expect(Math.round(walk)).toBe(813_149);
  expect(converted.inputs.mean_return).toBeCloseTo((395_000 * 0.079 + 108_000 * 0.079 + 16_250 * 0.005) / 519_250, 10);   // less cash in the mix
});

test('Roth and the cockpit print one nest egg at 65 for one household: $813,149 is the cockpit’s $813K', () => {
  open('RothScreen');
  fireEvent.changeText(screen.getByLabelText('Amount to convert this year'), '20000');
  expect(screen.getByText(/changes your nest egg at 65 to about \$809,588 \(from \$813,149\)/)).toBeTruthy();
  screen.unmount();
  open('RetirementCockpit', 'advisor');
  expect(screen.getByText('$813K by 2031')).toBeTruthy();
});

test.failing('Roth until 2026-10-30, pinned: the nest egg at 65 was the middle of 1,000 futures, $789,749 beside the cockpit’s $813K (FIXED 2026-10-30)', () => {
  open('RothScreen');
  fireEvent.changeText(screen.getByLabelText('Amount to convert this year'), '20000');
  expect(screen.getByText(/\(from \$789,749\)/)).toBeTruthy();
});

test.failing('Roth until 2026-10-27, pinned: the second run took out only the tax and read 35.9% (FIXED 2026-10-27)', () => {
  open('RothScreen');
  fireEvent.changeText(screen.getByLabelText('Amount to convert this year'), '20000');
  expect(screen.getByText(/the odds to 35\.9%/)).toBeTruthy();
});

test('Required withdrawals v02 — at 60: the first withdrawal ~$50,737 in 2041, the growth stated; every box end to end across the screen', () => {
  open('RequiredWithdrawalsScreen');
  holds('moneykeel_pres_mock_required-withdrawals_v02.html', 'rmd-content', 40);
  const bars = barsAndReach(screen.toJSON());
  expect(bars.map((b) => `${b.kind} ${b.title}`)).toEqual(['dark WHAT THIS IS', 'dark GETTING READY FOR 75', 'dark YEAR BY YEAR (ESTIMATES)', 'dark BASED ON THESE ACCOUNTS']);
  expect(bars.filter((b) => b.screenLeft !== 0 || b.screenRight !== 0).map((b) => `${b.title}: ${b.screenLeft} / ${b.screenRight} short of the phone's edges`)).toEqual([]);
});

test.failing('Required withdrawals until 2026-10-27, pinned: each bar stopped 20 points short of the phone’s edges (FIXED 2026-10-27)', () => {
  open('RequiredWithdrawalsScreen');
  expect(barsAndReach(screen.toJSON()).every((b) => b.screenLeft === 20 && b.screenRight === 20)).toBe(true);
});

test('Retirement cockpit v02 — Where you stand, Advisor mode: every rate to two decimals, the $11,250 catch-up, the 12% bracket', () => {
  open('RetirementCockpit', 'advisor');
  holds('moneykeel_pres_mock_retirement-cockpit_v02.html', 'cockpit-content', 70);
});

test('Retirement cockpit v02 — its what-if page, the second phone: the sliders start from the plan’s own rates, two decimals', () => {
  open('RetirementCockpit', 'advisor');
  fireEvent.press(screen.getByText(/Run scenario analysis/));
  // the drawing's row of 2026-11-01: the shortfall wears the one 'about' mark, ~ — $905K − $813K = $92K, the figure unchanged
  const lines = applyRows(drawn('moneykeel_pres_mock_retirement-cockpit_v02.html', 'cockpit-sandbox-content')).map((l) => l.replace('(≈$92K short)', '(~$92K short)'));
  expect(lines.filter((l) => l.includes('(~$92K short)'))).toHaveLength(1);   // the named change found, once
  expect(firstDifference(normPrinted(lines), normPrinted(builtLinesWithBoxes(screen.toJSON())))).toBe('');
  expect(lines.length).toBeGreaterThanOrEqual(40);
});

/** every bar of a rendered phone: on its fill, in its order, and reaching both edges of what it is drawn on (DEC-8839) */
const barsHold = (expected: string[]) => {
  const bars = barsAndReach(screen.toJSON());
  expect(bars.map((b) => `${b.kind} ${b.title}`)).toEqual(expected);
  expect(bars.filter((b) => b.left !== 0 || b.right !== 0).map((b) => `${b.title}: ${b.left} / ${b.right} short`)).toEqual([]);
  expect(bars.filter((b) => b.kind === 'dark').every((b) => b.surface === Colors.bgSecondary)).toBe(true);   // the page: edge to edge of the phone
  expect(bars.filter((b) => b.kind === 'light').every((b) => b.surface === Colors.cardBg)).toBe(true);       // a box: edge to edge of the box
};

test('Retirement cockpit v02 — phone 1: section names on dark bars edge to edge, each box’s title on a light bar across its box', () => {
  open('RetirementCockpit', 'advisor');
  barsHold(['dark RETIREMENT · WHERE YOU STAND', 'dark WHAT YOU HAVE', 'light YOUR INVESTMENTS', 'dark YOUR PLAN · ASSUMES AGE 65',
    'light GROW MY NEST EGG USING', 'light PROJECTED NEST EGG', 'light IN RETIREMENT (FROM 65)', 'light TAX-SMART MOVES']);
  // the projection's total rides its bar, on the box's right edge: the same $813,149 the breakdown adds up to ($523K + $50K + $240K)
  expect(screen.getByText('$813K by 2031')).toBeTruthy();
});

test('Retirement cockpit v02 — phone 2: the what-if’s dark bar edge to edge; HOW CONFIDENT IS THIS? and, once run, RANGE OF OUTCOMES BY AGE on light bars', () => {
  open('RetirementCockpit', 'advisor');
  fireEvent.press(screen.getByText(/Run scenario analysis/));
  barsHold(['dark WHAT IF? — DRAG TO EXPLORE', 'light HOW CONFIDENT IS THIS?']);
  fireEvent.press(screen.getByText('Run Monte Carlo simulation'));
  barsHold(['dark WHAT IF? — DRAG TO EXPLORE', 'light HOW CONFIDENT IS THIS?', 'light RANGE OF OUTCOMES BY AGE']);
});

test('Retirement cockpit v02 — not drawn: retired, Advisor mode — WILL YOUR MONEY LAST? and THE DETAILS on dark bars, their boxes titled on light bars', () => {
  useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
  useStore.setState({ hideBalances: false, displayMode: 'advisor', onboardingProfile: { ...OP, status: 'retired', birthYear: '1956' },
    assetAccounts: ACCOUNTS, transactions: [], nwSetupChoice: 'self', employmentStatus: 'retired' } as any);
  const C = require('../RetirementCockpit').default;
  render(<C />);
  const bars = barsAndReach(screen.toJSON());
  expect(bars.filter((b) => b.left !== 0 || b.right !== 0).map((b) => `${b.title}: ${b.left} / ${b.right} short`)).toEqual([]);
  const titles = bars.map((b) => `${b.kind} ${b.title}`);
  for (const t of ['dark RETIREMENT · WHERE YOU STAND', 'dark WILL YOUR MONEY LAST?', 'dark THE DETAILS', 'light WHERE YOUR MONEY SITS',
    'light SUGGESTED WITHDRAWAL ORDER', 'light HEADS-UP', 'dark YOUR PLAN · IN RETIREMENT', 'light ASSUMED RETURN ON YOUR REMAINING NEST EGG']) {
    expect(titles).toContain(t);
  }
});

test.failing('the cockpit until 2026-10-27, pinned: WHAT YOU HAVE was grey capitals with no bar (FIXED 2026-10-27)', () => {
  open('RetirementCockpit', 'advisor');
  expect(barsAndReach(screen.toJSON()).map((b) => b.title)).not.toContain('WHAT YOU HAVE');
});
