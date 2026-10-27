/** ONE PAYOFF DATE ON EVERY SCREEN THAT PRINTS ONE (2026-10-25, FIX-BILLS; MK-CF-F-034 payoffPlan, MK-CF-M-058 debt-free).
 *
 *  The Cash flow tab's Debts tab and the Plan tab's DEBT PAYOFF PLAN both print when the debts are paid off, from the one
 *  function, payoffPlan. It stopped at 600 months and called whatever was still owed "never": a $60,100 family loan at 0% with
 *  $100/month — a balance that falls $100 every month — read "never at this rate" on the Debts tab, with "your balance grows faster
 *  than you pay it down", and "Minimum payments don't cover the interest" on the Plan tab. It clears in month 601: both screens now
 *  print that month, and the same one. A payment that does not cover the interest is still never, on both.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { setHideBalances } from '../../domain/_shared/money';
import { builtLines } from '../../testing/mockMatch';
import { payoffPlan } from '../../domain/debt';

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

const FAKE = ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] as const;
const onDay = (iso: string) => jest.useFakeTimers({ now: new Date(`${iso}T12:00:00`), doNotFake: [...FAKE] });
afterEach(() => { setHideBalances(false); jest.useRealTimers(); });

const WORKER = { status: 'employed', incomeSources: ['employment'], birthYear: '1975', baseSalary: '5000', salaryMode: 'gross', salaryFreq: 'monthly',
  taxMode: 'manual', manualTaxRate: '0', monthlySpending: '2000' };
const FAMILY_LOAN = { debt_id: 'f', label: 'Family loan', debt_type: 'PERSONAL', remaining_balance: 60_100, interest_rate_apr: 0, minimum_monthly_payment: 100 };
const CARD_UNDER_WATER = { debt_id: 'c', label: 'Card', debt_type: 'CREDIT_CARD', remaining_balance: 100_000, interest_rate_apr: 0.06, minimum_monthly_payment: 400 };
function start(liabilities: any[]) {
  useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
  useStore.setState({ hideBalances: false, onboardingProfile: WORKER, liabilities } as any);
}
/** the Debts tab's "debt-free" stat, as printed */
function debtsTabDebtFree(): string {
  const CashFlow = require('../CashFlowScreen').default;
  render(<CashFlow />);
  fireEvent.press(screen.getByLabelText('Debts tab'));
  const L = builtLines(screen.toJSON());
  const i = L.indexOf('debt-free');
  expect(i).toBeGreaterThan(0);
  const said = L[i - 1];
  screen.unmount();
  return said;
}
/** the Plan tab's payoff box, as printed: "Debt-free in N mo" and "around <Mon YYYY> · …" */
function planTabDebtFree(): string[] {
  const Goals = require('../GoalsScreen').default;
  render(<Goals />);
  const L = builtLines(screen.toJSON());
  screen.unmount();
  return L.filter((l) => /^Debt-free in |^around |don't cover the interest|grows faster than you pay it down|Not paid off within/.test(l));
}

describe('MK-CF-M-058 debt-free — the Debts tab and the Plan tab print the same payoff (2026-10-25)', () => {
  test('a $60,100 loan at 0% with $100/month clears in month 601 — Nov 2076 on both screens, "never" on neither', () => {
    onDay('2026-10-25');
    start([FAMILY_LOAN]);
    const plan = payoffPlan([FAMILY_LOAN] as any, 0);
    expect([plan.months, plan.neverPaysOff, plan.pastHorizon, plan.stillOwed]).toEqual([601, false, false, 0]);
    const end = new Date(2026, 9 + 601, 25).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    expect(end).toBe('Nov 2076');
    expect(debtsTabDebtFree()).toBe(end);
    const plans = planTabDebtFree();
    expect(plans[0]).toBe('Debt-free in 601 mo');
    expect(plans[1].startsWith(`around ${end} · `)).toBe(true);
    expect(plans.join(' ')).not.toMatch(/don't cover the interest|grows faster/);
  });

  test('a payment that does not cover the interest is never — on both screens ($100,000 at 6% with $400/month: $500 of interest)', () => {
    onDay('2026-10-25');
    start([CARD_UNDER_WATER]);
    expect(payoffPlan([CARD_UNDER_WATER] as any, 0).neverPaysOff).toBe(true);
    expect(debtsTabDebtFree()).toBe('never at this rate');
    // the Debts tab's own sentence for the same case since 2026-10-26 (CLEANUP-LEFT; drawing plan/moneykeel_pres_mock_goals_v01.html):
    // it read "⚠ Minimum payments don't cover the interest — add extra to make progress.", blaming the minimums for a payment set
    expect(planTabDebtFree()).toEqual(['⚠️ At this payment your balance grows faster than you pay it down. Add an extra payment to start getting ahead.']);
  });
});
