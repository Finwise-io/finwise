/** THE RATE IN FORCE, MK-CF-M-081, ONE FIGURE WRITTEN ONE WAY: TWO DECIMALS (2026-10-26, CLEANUP-LEFT; his Q49; the lead's item on
 *  PF-TOOLS's finding; income-end-to-end_v07, READ THIS FIRST row of 2026-10-26). The sign-up recap printed it whole ("~7%") while
 *  the sentence under the same card wrote it to two decimals; Your base pay, the Income summary and the Tax organizer printed it
 *  whole too. Every screen that prints it now writes it the same way.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { builtLines } from '../../testing/mockMatch';
import { renderStep } from '../../onboarding/modules';
import { writeFigure } from '../../../MoneyKeel/functions/_figure-spec';
import { figureSpec } from '../../../MoneyKeel/functions/figures';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));
const FAKE = ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] as const;
beforeEach(() => { jest.useFakeTimers({ now: new Date('2026-10-26T12:00:00'), doNotFake: [...FAKE] }); });
afterEach(() => { jest.useRealTimers(); });

const PAT = { status: 'employed', incomeSources: ['employment'], name: 'Pat', birthYear: '1975', baseSalary: '5000', salaryMode: 'gross',
  salaryFreq: 'monthly', c_401k: '400', filingStatus: 'single', taxMode: 'system', monthlySpending: '3000' };
const OWN = { ...PAT, taxMode: 'manual', manualTaxRate: '24' };
const lines = (name: string, op: any) => {
  useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
  useStore.setState({ hideBalances: false, onboardingProfile: op, assetAccounts: [], transactions: [] } as any);
  const r = render(React.createElement(require(`../${name}`).default)); const L = builtLines(screen.toJSON()).join(' '); r.unmount(); return L;
};
const recap = (op: any) => {
  useStore.getState().resetAll();
  const r = render(<>{renderStep('recap_income' as any, { status: 'employed', tracks: [], answers: op, setAnswer: jest.fn() } as any)}</>);
  const L = builtLines(screen.toJSON()).join(' '); r.unmount(); return L;
};

test('the declaration writes it to two decimals: 0.24 → "24.00%", 4,444 ÷ 60,000 → "7.41%"', () => {
  expect(writeFigure(figureSpec('MK-CF-M-081'), 0.24)).toBe('24.00%');
  expect(writeFigure(figureSpec('MK-CF-M-081'), 4_444 / 60_000)).toBe('7.41%');
});

test('a rate of his own, 24%: Your base pay, the Income summary, the Tax organizer and the sign-up recap all write "24.00%"', () => {
  const base = lines('BasePayScreen', OWN);
  expect(base).toContain('Tax your rate, 24.00%');
  expect(base).toContain('using the 24.00% rate you entered');
  const sum = lines('IncomeSummaryScreen', OWN);
  expect(sum).toContain('your rate, 24.00% (edit on Your base pay screen)');
  expect(sum).toContain('Your 24.00%, used on every figure built from your take-home.');
  expect(lines('TaxOrganizerScreen', OWN)).toContain('Tax · your rate, 24.00%.');
  expect(recap(OWN)).toContain('Tax (~24.00% on taxable income)');
  for (const L of [base, sum]) expect(L).not.toMatch(/\b24%/);
});

test('the calculated rate, Pat: the sign-up recap and its Taxes step write "7.41%" ($4,444 ÷ $60,000 = 7.4067%), never "~7%"', () => {
  expect(recap(PAT)).toContain('Tax (~7.41% on taxable income)');
  useStore.getState().resetAll();
  const r = render(<>{renderStep('income_tax' as any, { status: 'employed', tracks: [], answers: PAT, setAnswer: jest.fn() } as any)}</>);
  const L = builtLines(screen.toJSON()).join(' '); r.unmount();
  expect(L).toContain('~7.41% federal income tax · 12% bracket (2026)');
  expect(L).toContain('Use the calculated rate (~7.41%)');
  expect(L).not.toMatch(/~7%/);
});

test.failing('the recap until 2026-10-26, pinned: "Tax (~7% on taxable income)" (FIXED 2026-10-26)', () => {
  expect(recap(PAT)).toContain('Tax (~7% on taxable income)');
});
