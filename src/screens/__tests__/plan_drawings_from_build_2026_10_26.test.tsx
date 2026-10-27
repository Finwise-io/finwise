/** ROTH CONVERSION, REQUIRED WITHDRAWALS AND THE RETIREMENT COCKPIT, HELD TO THEIR DRAWINGS (2026-10-26, CLEANUP-LEFT; the lead's
 *  round 2, item 6). The three screens had no drawing; each was drawn from the build on 2026-10-26 — no approval on record —
 *  in MoneyKeel/documents/plan/: moneykeel_pres_mock_roth-conversion_v01.html, moneykeel_pres_mock_required-withdrawals_v01.html,
 *  moneykeel_pres_mock_retirement-cockpit_v01.html. Every word of each drawn screen — the bar above it and the tab bar aside, which
 *  the navigator draws, and the chart, whose labels a phone measures — is read off the rendered screen, in order, figures as printed.
 */
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { setHideBalances } from '../../domain/_shared/money';
import { builtLinesWithBoxes, normPrinted, firstDifference } from '../../testing/mockMatch';

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
const holds = (file: string, marker: string, floor: number) => {
  const lines = drawn(file, marker);
  expect(firstDifference(normPrinted(lines), normPrinted(builtLinesWithBoxes(screen.toJSON())))).toBe('');
  expect(lines.length).toBeGreaterThanOrEqual(floor);   // A GUARD MUST PROVE IT LOOKED: the whole screen, not a fragment
};

test('Roth conversion v01 — $20,000 typed: the tax at the exact rate, $3,750 at 18.75%; the growth stated', () => {
  open('RothScreen');
  fireEvent.changeText(screen.getByLabelText('Amount to convert this year'), '20000');
  holds('moneykeel_pres_mock_roth-conversion_v01.html', 'roth-content', 20);
});

test('Required withdrawals v01 — at 60: the first withdrawal ~$50,737 in 2041, the growth stated', () => {
  open('RequiredWithdrawalsScreen');
  holds('moneykeel_pres_mock_required-withdrawals_v01.html', 'rmd-content', 40);
});

test('Retirement cockpit v01 — Where you stand, Advisor mode: every rate to two decimals, the $11,250 catch-up, the 12% bracket', () => {
  open('RetirementCockpit', 'advisor');
  holds('moneykeel_pres_mock_retirement-cockpit_v01.html', 'cockpit-content', 70);
});

test('Retirement cockpit v01 — its what-if page, the second phone: the sliders start from the plan’s own rates, two decimals', () => {
  open('RetirementCockpit', 'advisor');
  fireEvent.press(screen.getByText(/Run scenario analysis/));
  holds('moneykeel_pres_mock_retirement-cockpit_v01.html', 'cockpit-sandbox-content', 40);
});
