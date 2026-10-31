/** THE PLAN TAB'S GOALS SUB-TAB LISTS THE GOALS AS THE APP SAVES THEM (2026-10-30, FX-PLAN; the lead's order, under his approved Plan v4
 *  frames 'Goals — populated' and 'Goals — empty', August 14th Design/design_handoff_net_worth/Plan.dc.html, shipped in Build 53).
 *
 *  The sub-tab read each goal as goal_id, target_amount and target_year; the app saves id, target, saved and targetDate. Every goal read
 *  $0, the list's own rule (a goal still to fund: saved < target) dropped it, and the tab showed 'Nothing here yet' with goals entered —
 *  in Build 53 and until today. A household with two goals, read off the rendered tab, in order, with their real amounts and years.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { builtLines } from '../../testing/mockMatch';
import { planGoalRows } from '../../domain/goals';
import { employedPartner } from '../../testing/personas';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

/** two goals, as the Goals screen saves them (src/store/useStore.ts, Goal) */
const GOALS = [
  { id: 'g1', label: 'Emergency fund', icon: '🛟', target: 10_000, saved: 4_000, color: '#178F6B', duration: '12', targetDate: '2027-10' },
  { id: 'g2', label: 'New car', icon: '🚗', target: 28_000, saved: 5_000, color: '#178F6B', targetDate: '2027-06' },
];
function openGoalsTab(goals: any[]) {
  useStore.getState().resetAll();
  useStore.setState({ onboardingComplete: true, onboardingProfile: { ...employedPartner, monthlySpending: '4500' }, goals, hideBalances: false } as any);
  const PlanHubScreen = require('../PlanHubScreen').default;
  render(<PlanHubScreen />);
  fireEvent.press(screen.getByLabelText('Goals'));
  return builtLines(screen.toJSON());
}

test('two saved goals: the Goals sub-tab lists both, in the order saved, with their real amounts and years (v4 ‘$28,000 by 2027’)', () => {
  const L = openGoalsTab(GOALS);
  const i = L.indexOf('Emergency fund'), j = L.indexOf('New car');
  expect([i >= 0, j > i]).toEqual([true, true]);
  expect(L[i + 1]).toBe('$10,000 by 2027');
  expect(L[j + 1]).toBe('$28,000 by 2027');
  expect(L).not.toContain('Nothing here yet');
  expect(L).toContain('Can I afford it all?');
});

test('the one reader takes the saved shape and the goals service’s shape alike, and reads the year from either', () => {
  expect(planGoalRows(GOALS)).toEqual([
    { id: 'g1', label: 'Emergency fund', target: 10_000, saved: 4_000, targetDate: '2027' },
    { id: 'g2', label: 'New car', target: 28_000, saved: 5_000, targetDate: '2027' },
  ]);
  // the service's record (goalsFromOnboarding): goal_id, target_amount, target_year, nothing saved
  expect(planGoalRows([{ goal_id: 'x', label: 'House', target_amount: 60_000, target_year: 2030 }]))
    .toEqual([{ id: 'x', label: 'House', target: 60_000, saved: 0, targetDate: '2030' }]);
  // no date entered, no saved amount: the row has no year, never a made-up one
  expect(planGoalRows([{ id: 'y', label: 'Trip', target: 3_000 }])).toEqual([{ id: 'y', label: 'Trip', target: 3_000, saved: 0, targetDate: null }]);
  expect(planGoalRows(undefined)).toEqual([]);
});

test('no goal saved: the v4 on-ramp, word for word', () => {
  const L = openGoalsTab([]);
  expect(L).toContain('Nothing here yet');
  expect(L).toContain('A goal is anything you’re putting money aside for: a car, a wedding, helping a grandchild.');
});

test.failing('the sub-tab until 2026-10-30, pinned: two goals entered and it showed ‘Nothing here yet’ (FIXED 2026-10-30)', () => {
  const L = openGoalsTab(GOALS);
  expect(L).toContain('Nothing here yet');
});
