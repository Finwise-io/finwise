/** A LOSS IS NEVER PROJECTED FORWARD, AND THE LINE SAYS SO (2026-10-26, CLEANUP-LEFT; the lead's round 2, item 5; tenet 1 of
 *  DEC-3523 — the rate stated is the rate used). Roth conversion and Required withdrawals grow pre-tax money to the first required
 *  withdrawal at the Plan's one return (paycheckReturn), never below 0% (rmdSchedule's floor). A negative 12-month return was stated
 *  as it was ("−4.20%/year — your 12-month return") while the balance grew at 0%. growthUsed (src/domain/paycheck) gives both the
 *  rate and the words, and both screens print them: 3 of 3 places (Roth, Required withdrawals, and rmdSchedule's one caller).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { builtLines } from '../../testing/mockMatch';
import { paycheckReturn, growthUsed } from '../../domain/paycheck';
import { rmdSchedule, rmdAtAge } from '../../domain/decumulation';

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

const OP: any = { status: 'employed', incomeSources: ['employment'], birthYear: '1966', filingStatus: 'single', whoEarns: 'you',
  baseSalary: '5000', salaryFreq: 'monthly', salaryMode: 'gross', monthlySpending: '4000' };
/** an IRA whose last 12 months were −4.20%, and the Plan set to grow on the 12-month return */
const IRA: any = { asset_id: 'ira', label: 'IRA', institution: 'Fidelity', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 415_000, actual_ttm: -0.042 };
const A = { returnBasis: 'actual' };
const FLOOR = '0.00%/year — your last 12 months were −4.20%; we don’t project a loss forward';
const open = (name: string) => {
  useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
  useStore.setState({ hideBalances: false, onboardingProfile: OP, assetAccounts: [IRA], retirementAssumptions: A, transactions: [] } as any);
  return render(React.createElement(require(`../${name}`).default));
};

test('the function: −4.20% gives a 0% rate and the words that say so; a 7.90% benchmark is itself', () => {
  const ret = paycheckReturn([IRA], A, OP);
  expect(ret.basis).toBe('actual');
  expect(ret.mean_return).toBeCloseTo(-0.042, 12);
  expect(growthUsed(ret)).toEqual({ rate: 0, said: FLOOR });
  const bench = paycheckReturn([{ ...IRA, actual_ttm: undefined }], {}, OP);
  expect(growthUsed(bench)).toEqual({ rate: bench.mean_return, said: bench.said });
});

test('Required withdrawals: the rows grow at 0% — $415,000 ÷ 24.6 = $16,870 at 75 — and the line says the floor is used', () => {
  open('RequiredWithdrawalsScreen');
  const L = builtLines(screen.toJSON());
  expect(L).toContain(`Growth used: ${FLOOR}.`);
  // by hand: no growth for 15 years, so the first withdrawal is today's $415,000 ÷ the age-75 divisor 24.6 = $16,869.92
  expect(rmdSchedule(415_000, 60, growthUsed(paycheckReturn([IRA], A, OP)).rate, 12)[0].amount).toBeCloseTo(rmdAtAge(415_000, 75), 9);
  expect(L.join(' ')).toContain('~$16,870');
  expect(L.join(' ')).not.toMatch(/−4\.20%\/year — your 12-month return/);
});

test('Roth conversion: the smaller withdrawals are worked at 0%, and the line says so — $20,000 ÷ 24.6 = $813/year', () => {
  open('RothScreen');
  fireEvent.changeText(screen.getByLabelText('Amount to convert this year'), '20000');
  const L = builtLines(screen.toJSON());
  // since 2026-10-30 the growth is said inside the line that works the $813 out (roth-conversion_v02, DEC-8890) — the floor, word for word
  expect(L.some((l: string) => l.includes(`would grow at ${FLOOR} — for 15 years, to $20,000. ÷ 24.6, the IRS factor at 75 = $813/year less`))).toBe(true);   // 20,000 ÷ 24.6 = 813.01
  expect(L).toContain('about $813');
});
