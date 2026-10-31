/** GOALS, HELD TO ITS DRAWING — MoneyKeel/documents/plan/moneykeel_pres_mock_goals_v02.html (2026-10-27, FX-PLAN; v01 of 2026-10-26,
 *  CLEANUP-LEFT, is in the folder's archive/ under that date).
 *
 *  v02 — THE BARS OF THE STANDARD DESIGN (his words, 2026-10-27, DEC-8839: "the standard design says box titles in dark green bar, and
 *  sub-titles in light green bar"). Every dark bar takes back the page's 20-point margins and runs edge to edge of the phone; a goal's
 *  name, the suggestion's title and "Payoff order" are light bars across their boxes. The words and figures are v01's.
 *
 *  The Goals screen had no drawing. v01 draws it from the build, on 26 October 2026, with one change: the DEBT PAYOFF PLAN's words
 *  say what the plan pays. Since 2026-10-25 payoffPlan (MK-CF-F-034) pays each debt the payment the person set, never less than its
 *  minimum (his DEC-0641), yet three lines still said it ran on the minimums: "Extra / month (beyond minimums)", "… vs minimums."
 *  and "⚠ Minimum payments don't cover the interest — add extra to make progress." Every word of the drawn screen — top bar and tab
 *  bar aside, which the navigator draws — is read off the rendered screen, in order, figures as printed.
 */
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { Colors } from '../../utils/theme';
import { setHideBalances } from '../../domain/_shared/money';
import { builtLines, builtLinesWithBoxes, normPrinted, firstDifference } from '../../testing/mockMatch';
import { payoffPlan } from '../../domain/debt';
import { barsAndReach } from '../../testing/bandGeometry';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

const FAKE = ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] as const;
const DAY = new Date('2026-10-26T12:00:00');
beforeEach(() => { jest.useFakeTimers({ now: DAY, doNotFake: [...FAKE] }); });
afterEach(() => { setHideBalances(false); jest.useRealTimers(); });

// HELD TO THE ARCHIVED v02 (2026-10-27): the lead moved it to archive/ the same day — it was drawn from today's code, the wrong
// starting point (DEC-8889). GoalsScreen.tsx keeps what was built to it until the lead says otherwise; goals v03, from the approved
// Plan v4 frames, waits on his approval and has no code yet.
const DRAWING = 'MoneyKeel/documents/plan/archive/2026-10-27_moneykeel_pres_mock_goals_v02.html';
/** The drawn screen's own words: the phone's content, between its two markers (the top bar and the tab bar are the navigator's). */
function drawnContent(): string[] {
  const html = fs.readFileSync(path.join(__dirname, '..', '..', '..', DRAWING), 'utf8');
  const from = html.indexOf('id="goals-content"'), to = html.indexOf('id="goals-content-end"');
  expect(from).toBeGreaterThan(0); expect(to).toBeGreaterThan(from);
  return html.slice(html.indexOf('>', from) + 1, html.lastIndexOf('<', to)).replace(/<[^>]+>/g, '\n')
    .replace(/&amp;/g, '&').split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/** The drawing's household (its caption): $6,000 of wages at the 20% typed, a $2,500 budget, a Visa with $300 set on a $200
 *  minimum, a $250 car loan, one emergency-fund goal. */
const PROFILE = { status: 'employed', incomeSources: ['employment'], birthYear: '1975', baseSalary: '6000', salaryMode: 'gross', salaryFreq: 'monthly',
  taxMode: 'manual', manualTaxRate: '20', monthlySpending: '2500', b_fixed: '1500', b_nonmonthly: '200', b_flexible: '800' };
const VISA = { debt_id: 'v', label: 'Visa card', debt_type: 'CREDIT_CARD', remaining_balance: 9000, interest_rate_apr: 0.24, minimum_monthly_payment: 200, monthly_payment: 300 };
const CAR = { debt_id: 'c', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 250 };
const GOAL = { id: 'g1', label: 'Emergency fund', icon: '🛟', target: 10000, saved: 4000, duration: '12', targetDate: '2027-10', color: '#178F6B' };
function open(liabilities: any[] = [VISA, CAR], profile: Record<string, any> = PROFILE) {
  useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
  useStore.setState({ hideBalances: false, onboardingProfile: profile, liabilities, goals: [GOAL] } as any);
  const Goals = require('../GoalsScreen').default;
  return render(<Goals />);
}

test('v02 · the whole screen, word for word and figure for figure, with $100 extra typed', () => {
  open();
  fireEvent.changeText(screen.getByPlaceholderText('0'), '100');
  // THE ROW OF 2026-10-30 ON GOALS v03 (CLEANUP-TESTS; typography only, which DEC-8889's freeze leaves open): every apostrophe
  // inside a word prints as ’ — the archived v02 draws "rent isn't counted", "You're in good shape" with a straight '
  const drawn = normPrinted(drawnContent().map((l) => l.replace(/([A-Za-z])'([A-Za-z])/g, '$1’$2')));
  const built = normPrinted(builtLinesWithBoxes(screen.toJSON()));
  expect(firstDifference(drawn, built)).toBe('');
  // A GUARD MUST PROVE IT LOOKED: the drawn content is the whole screen, not a fragment
  expect(drawnContent().length).toBeGreaterThanOrEqual(60);
});

test('the figures, by hand: $650 a month clears in 44 months with $5,409.45 of interest; $550 in 56 with $7,646.60 — $2,237 saved', () => {
  const withExtra = payoffPlan([VISA, CAR] as any, 100, 'avalanche', DAY), noExtra = payoffPlan([VISA, CAR] as any, 0, 'avalanche', DAY);
  expect([withExtra.months, noExtra.months]).toEqual([44, 56]);
  expect(withExtra.totalInterest).toBeCloseTo(5_409.45, 2);
  expect(noExtra.totalInterest).toBeCloseTo(7_646.60, 2);
  expect(Math.round(noExtra.totalInterest - withExtra.totalInterest)).toBe(2_237);
  // the plan pays the payment set ($300 on the Visa), never the minimums alone ($450 a month would take 84 months, $14,786.87)
  const onMinimums = payoffPlan([{ ...VISA, monthly_payment: undefined }, CAR] as any, 0, 'avalanche', DAY);
  expect(onMinimums.months).toBe(84);
  expect(onMinimums.totalInterest).toBeCloseTo(14_786.87, 2);
});

test.failing('the words until 2026-10-26, pinned: the plan said it ran on the minimums (FIXED 2026-10-26)', () => {
  open();
  fireEvent.changeText(screen.getByPlaceholderText('0'), '100');
  expect(screen.getByText('Extra / month (beyond minimums)')).toBeTruthy();
});

test('payments that cannot cover the interest: the Goals card and the Debts tab print one sentence for one case', () => {
  // $100,000 at 6% with a $400 payment: $500 of interest a month
  const UNDER_WATER = { debt_id: 'u', label: 'Card', debt_type: 'CREDIT_CARD', remaining_balance: 100_000, interest_rate_apr: 0.06, minimum_monthly_payment: 400 };
  expect(payoffPlan([UNDER_WATER] as any, 0, 'avalanche', DAY).neverPaysOff).toBe(true);
  open([UNDER_WATER]);
  const goals = builtLines(screen.toJSON()).filter((l) => /grows faster|cover the interest/.test(l));
  screen.unmount();
  useStore.setState({ hideBalances: false } as any);
  const CashFlow = require('../CashFlowScreen').default;
  render(<CashFlow />);
  fireEvent.press(screen.getByLabelText('Debts tab'));
  const debts = builtLines(screen.toJSON()).filter((l) => /grows faster|cover the interest/.test(l));
  expect(goals).toEqual(['⚠️ At this payment your balance grows faster than you pay it down. Add an extra payment to start getting ahead.']);
  expect(debts).toEqual(goals);
});

test('v02 · every bar on its fill, in its order, and edge to edge — read off the rendered screen (DEC-8839)', () => {
  // the drawing's household with a suggested sinking fund showing: no goal named for it yet
  open();
  fireEvent.changeText(screen.getByPlaceholderText('0'), '100');
  const bars = barsAndReach(screen.toJSON());
  // the five dark bars and three light ones the drawing draws, in its order — none missing, none extra
  expect(bars.map((b) => `${b.kind} ${b.title}`)).toEqual([
    'dark YOUR GOALS', 'light 💡 SUGGESTED: A SINKING FUND', 'light 🛟 Emergency fund',
    'dark DEBT & CREDIT', 'dark DEBT-TO-INCOME', 'dark DEBT PAYOFF PLAN', 'light PAYOFF ORDER', 'dark PREPARE & PROTECT',
  ]);
  // EDGE TO EDGE: each bar reaches both edges of the surface it is drawn on — the phone for a dark bar, its card for a light one
  expect(bars.filter((b) => b.left !== 0 || b.right !== 0).map((b) => `${b.title}: ${b.left} / ${b.right} short`)).toEqual([]);
  expect(bars.filter((b) => b.kind === 'dark').every((b) => b.surface === Colors.bgSecondary)).toBe(true);
  expect(bars.filter((b) => b.kind === 'light').every((b) => b.surface === Colors.cardBg)).toBe(true);
  // the goal's progress rides its bar's right edge; its status opens the card's first line, word and mark together
  expect(screen.getByText('40.00%')).toBeTruthy();
  expect(screen.getByText('🟡 Behind')).toBeTruthy();
});

test.failing('the bars until 2026-10-27, pinned: the dark bars sat inside the page’s 20-point margins (FIXED 2026-10-27)', () => {
  open();
  const dark = barsAndReach(screen.toJSON()).filter((b) => b.kind === 'dark');
  expect(dark.every((b) => b.left === 20 && b.right === 20)).toBe(true);
});
