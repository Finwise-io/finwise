/** PLAN · GOALS, HELD TO goals v03 WORD FOR WORD, IN EVERY DRAWN STATE, BOTH DIRECTIONS (2026-10-31, FX-PLAN; built under his DEC-9228:
 *  he judges the built screen on TestFlight). Drawing: MoneyKeel/documents/plan/moneykeel_pres_mock_goals_v03.html — phone 1 with goals,
 *  phone 2 adding a goal (pay off a debt), phone 3 the first day. Each phone's words, from 'Plan' to its last line, against the rendered
 *  Plan tab with Goals selected: a drawn word the screen lacks fails, and a built word the drawing lacks fails (firstDifference walks
 *  both streams to their ends). The top bar and the tab bar are the navigator's.
 *  Every figure is then worked by hand and pinned against the engine.
 */
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { setHideBalances } from '../../domain/_shared/money';
import { builtLinesWithBoxes, normPrinted, firstDifference } from '../../testing/mockMatch';
import { barsAndReach } from '../../testing/bandGeometry';
import { goalsCapacity, debtGoalPlan } from '../../domain/goals/planGoals';
import { requiredMonthly } from '../../domain/goals';

let mockParams: Record<string, string> = {};
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: mockPush, replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, Link: ({ children }: any) => children,
  Redirect: () => null,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

const FAKE = ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] as const;
const DAY = new Date('2026-10-27T12:00:00');
beforeEach(() => { jest.useFakeTimers({ now: DAY, doNotFake: [...FAKE] }); mockParams = { sub: 'goals' }; mockPush.mockClear(); });
afterEach(() => { setHideBalances(false); jest.useRealTimers(); });

const DRAWING = 'MoneyKeel/documents/plan/moneykeel_pres_mock_goals_v03.html';
function drawn(marker: string): string[] {
  const html = fs.readFileSync(path.join(__dirname, '..', '..', '..', DRAWING), 'utf8');
  const from = html.indexOf(`id="${marker}"`), to = html.indexOf(`id="${marker}-end"`);
  expect(from).toBeGreaterThan(0); expect(to).toBeGreaterThan(from);
  return html.slice(html.indexOf('>', from) + 1, html.lastIndexOf('<', to)).replace(/<[^>]+>/g, '\n')
    .replace(/&amp;/g, '&').split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/** the drawing's household (its captions): $6,000/month of wages at the 20% typed, a $2,500 budget, a Visa with $300 set on a $200
 *  minimum, a $250 car loan; an emergency fund, and paying off the Visa by December 2027 */
const PROFILE = { status: 'employed', incomeSources: ['employment'], birthYear: '1975', baseSalary: '6000', salaryMode: 'gross', salaryFreq: 'monthly',
  taxMode: 'manual', manualTaxRate: '20', monthlySpending: '2500', b_fixed: '1500', b_nonmonthly: '200', b_flexible: '800' };
const VISA = { debt_id: 'v', label: 'Visa card', debt_type: 'CREDIT_CARD', remaining_balance: 9000, interest_rate_apr: 0.24, minimum_monthly_payment: 200, monthly_payment: 300 };
const CAR = { debt_id: 'c', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 250 };
const FUND = { id: 'g1', label: 'Emergency fund', icon: '🛟', target: 10000, saved: 4000, duration: '12', targetDate: '2027-10', color: '#178F6B' };
const PAY_VISA = { id: 'g2', label: 'Pay off Visa card', icon: '💳', target: 9000, saved: 0, targetDate: '2027-12', color: '#178F6B', kind: 'debt', debtId: 'v' };

function openPlan(state: Record<string, any>) {
  useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
  useStore.setState({ hideBalances: false, ...state } as any);
  const PlanHubScreen = require('../PlanHubScreen').default;
  return render(<PlanHubScreen />);
}
const holds = (marker: string, floor: number) => {
  const d = drawn(marker);
  expect(firstDifference(normPrinted(d), normPrinted(builtLinesWithBoxes(screen.toJSON())))).toBe('');
  expect(d.length).toBeGreaterThanOrEqual(floor);   // A GUARD MUST PROVE IT LOOKED: the whole phone, not a fragment
};

test('v03 phone 1 — with goals: the surplus and its working, each goal and what a month needs, the door to Cash flow · Debts', () => {
  openPlan({ onboardingProfile: PROFILE, liabilities: [VISA, CAR], goals: [FUND, PAY_VISA] });
  holds('goals-content', 25);
  // the bars: every box's dark bar runs end to end across the phone (DEC-8839, DEC-8890)
  const bars = barsAndReach(screen.toJSON());
  expect(bars.map((b) => `${b.kind} ${b.title}`)).toEqual(['dark What you can put toward goals', 'dark What you’re saving for']);
  expect(bars.filter((b) => b.screenLeft !== 0 || b.screenRight !== 0)).toEqual([]);
  fireEvent.press(screen.getByText(/Your debts — the payoff plan/));
  expect(mockPush).toHaveBeenCalledWith('/(tabs)/cashflow?tab=debts');   // opens the Debts tab itself (2026-11-01, FX-CF-A)
});

test('v03 phone 2 — adding a goal under the Plan bar: pay off the Visa card by December 2027', () => {
  openPlan({ onboardingProfile: PROFILE, liabilities: [VISA, CAR], goals: [FUND, PAY_VISA] });
  fireEvent.press(screen.getByText('+ Add a goal'));
  fireEvent.press(screen.getByText('Pay off a debt'));
  fireEvent.press(screen.getByLabelText('Visa card'));
  fireEvent.changeText(screen.getByLabelText('Month, 1 to 12'), '12');
  fireEvent.changeText(screen.getByLabelText('Year'), '2027');
  holds('goals-add-content', 25);
  // the bar stays at the top while the form is open: the screen is still Plan, with Goals selected
  expect(screen.getByLabelText('Goals, selected')).toBeTruthy();
  const bars = barsAndReach(screen.toJSON());
  expect(bars.map((b) => `${b.kind} ${b.title}`)).toEqual(['dark Add a goal', 'light Which debt', 'light Paid off by']);
  expect(bars.filter((b) => b.screenLeft !== 0 || b.screenRight !== 0)).toEqual([]);
});

test('v03 phone 3 — the first day: $0 with nothing behind it, its door, and v4’s on-ramp', () => {
  openPlan({ onboardingProfile: {}, liabilities: [], goals: [] });
  holds('goals-empty-content', 8);
});

test('the figures, by hand: $4,800 − $2,500 − $550 = $1,750; $6,000 ÷ 12 = $500; $9,000 in 14 payments at 2% = $743.42', () => {
  const cap = goalsCapacity(PROFILE, [VISA, CAR] as any);
  expect([cap.takeHome, cap.expenses, cap.debt, cap.surplus, cap.lumpy]).toEqual([4_800, 2_500, 550, 1_750, false]);
  expect(cap.takeHome - cap.expenses - cap.debt).toBe(cap.surplus);   // the rows add up to the total, as printed
  expect(requiredMonthly(FUND as any, DAY)).toBe(500);                // ($10,000 − $4,000) ÷ 12 months to October 2027
  const p = debtGoalPlan(VISA as any, '2027-12', DAY);
  if (p.kind !== 'plan') throw new Error(p.kind);
  // 24% ÷ 12 = 2% a month; $9,000 × 0.02 ÷ (1 − 1.02⁻¹⁴) = $743.42; 14 × $743.42 − $9,000 = $1,407.85 of interest
  expect([p.months, p.firstMonth, p.lastMonth, p.monthlyRate]).toEqual([14, 'Nov 2026', 'Dec 2027', 0.02]);
  expect(p.need).toBeCloseTo(9000 * 0.02 / (1 - 1.02 ** -14), 9);
  expect(Math.round(p.need * 100) / 100).toBe(743.42);
  expect(Math.round(p.interest * 100) / 100).toBe(1_407.85);
  expect([p.payment, Math.round(p.extra * 100) / 100]).toEqual([300, 443.42]);
  // at the $300 set: the walk clears it in month 47 (September 2030) with $4,881.94 of interest; $3,474.09 less by December 2027
  expect(p.clears?.when).toBe('Sep 2030');
  expect(Math.round((p.clears?.interest ?? 0) * 100) / 100).toBe(4_881.94);
  expect(Math.round((p.saved ?? 0) * 100) / 100).toBe(3_474.09);
});

test('a debt with no rate entered is not worked: the form says so, and nothing is printed from a missing rate (R6)', () => {
  const NO_RATE = { ...VISA, interest_rate_apr: null };
  expect(debtGoalPlan(NO_RATE as any, '2027-12', DAY).kind).toBe('no-rate');
  openPlan({ onboardingProfile: PROFILE, liabilities: [NO_RATE], goals: [] });
  fireEvent.press(screen.getByText('+ Add a goal'));
  fireEvent.press(screen.getByText('Pay off a debt'));
  fireEvent.press(screen.getByLabelText('Visa card'));
  fireEvent.changeText(screen.getByLabelText('Month, 1 to 12'), '12');
  fireEvent.changeText(screen.getByLabelText('Year'), '2027');
  expect(screen.getByText('Its rate is not entered — enter it on Cash flow, under Debts.')).toBeTruthy();
  expect(screen.queryByText(/^Needs /)).toBeNull();
});

test('save toward something: the goal is saved under the Plan bar, and lists with what a month needs', () => {
  openPlan({ onboardingProfile: PROFILE, liabilities: [VISA, CAR], goals: [] });
  fireEvent.press(screen.getByText('+ Add a goal'));
  fireEvent.changeText(screen.getByLabelText('What the goal is for'), 'New car');
  const boxes = [screen.getByLabelText('Target amount'), screen.getByLabelText('Saved so far')];   // by name: their grey ‘0’ is gone (R16, 2026-11-01)
  fireEvent.changeText(boxes[0], '28000');
  fireEvent.changeText(boxes[1], '4000');
  fireEvent.changeText(screen.getByLabelText('Month, 1 to 12'), '10');
  fireEvent.changeText(screen.getByLabelText('Year'), '2027');
  expect(screen.getByText('Needs $2,000/month')).toBeTruthy();                 // ($28,000 − $4,000) ÷ 12
  expect(screen.getByText('$24,000 to go ÷ 12 months, by Oct 2027.')).toBeTruthy();
  fireEvent.press(screen.getByText('Add this goal'));
  expect(useStore.getState().goals.map((g: any) => [g.label, g.target, g.saved, g.targetDate, g.kind])).toEqual([['New car', 28000, 4000, '2027-10', 'save']]);
  expect(screen.getByText('$4,000 saved · needs $2,000/month: $24,000 to go ÷ 12 months')).toBeTruthy();
});

test('the Menu’s Goals and every ‘Add a goal ›’ land on Plan with Goals selected — never the old full screen', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'app', '(tabs)', 'goals.tsx'), 'utf8');
  expect(src).toMatch(/Redirect href=\{\(add === '1' \? '\/\(tabs\)\/plan\?sub=goals&add=1' : '\/\(tabs\)\/plan\?sub=goals'\)/);
  expect(src).not.toMatch(/GoalsScreen/);
  mockParams = { sub: 'goals', add: '1' };
  openPlan({ onboardingProfile: PROFILE, liabilities: [VISA, CAR], goals: [FUND] });
  expect(screen.getByText('What is it for?')).toBeTruthy();   // the form, open under the bar
  expect(screen.getByLabelText('Goals, selected')).toBeTruthy();
});

test.failing('Goals until 2026-10-31, pinned: ‘+ Add a goal’ opened the old full Goals screen, with no Plan bar (FIXED 2026-10-31)', () => {
  openPlan({ onboardingProfile: PROFILE, liabilities: [VISA, CAR], goals: [FUND] });
  fireEvent.press(screen.getByText('+ Add a goal'));
  expect(mockPush).toHaveBeenCalledWith('/(tabs)/goals');
});
