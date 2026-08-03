// Big one-time costs (founder-approved mock big-costs-v1 + "What big costs are coming - approved").
// Pins: the sim subtracts each cost in ITS year (inflated); the screen's delta uses the SAME
// selector; empty state is the honest default; the hub rows exist on both lenses.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { simulate } from '../../domain/retirement';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

beforeEach(() => { useStore.getState().resetAll(); });

const BASE = {
  current_age: 60, retire_age: 67, horizon_age: 92, start_balance: 800000,
  annual_contribution: 12000, retire_monthly_spend_today: 4500, guaranteed_monthly_income: 2600,
  inflation: 0.025, mean_return: 0.055, vol_return: 0.09, paths: 300, seed: 42, now_year: 2026,
} as any;

test('engine: a big cost lowers the odds; the same cost past the horizon changes nothing', () => {
  const base = simulate(BASE).chance_of_success;
  const withRoof = simulate({ ...BASE, one_off_costs: [{ amount: 120000, year: 2030 }] }).chance_of_success;
  expect(withRoof).toBeLessThan(base);                               // real money leaves in 2030
  const beyond = simulate({ ...BASE, one_off_costs: [{ amount: 120000, year: 2140 }] }).chance_of_success;
  expect(beyond).toBe(base);                                         // beyond the horizon: not simulated
});

test('engine: no one_off_costs is byte-identical to the legacy behavior (old pins safe)', () => {
  expect(simulate(BASE).chance_of_success).toBe(simulate({ ...BASE, one_off_costs: [] }).chance_of_success);
});

test('screen: empty state states the honest default and offers ONE action', () => {
  const BigCostsScreen = require('../BigCostsScreen').default;
  render(<BigCostsScreen />);
  expect(screen.getByText(/your odds currently assume no big one-time costs/)).toBeOnTheScreen();
  expect(screen.getByLabelText('Add your first big cost')).toBeOnTheScreen();
});

test('screen: add via the sheet → row + total render; store carries the entry', () => {
  const BigCostsScreen = require('../BigCostsScreen').default;
  render(<BigCostsScreen />);
  fireEvent.press(screen.getByLabelText('Add your first big cost'));
  fireEvent.changeText(screen.getByPlaceholderText('New roof'), 'New roof');
  fireEvent.changeText(screen.getByPlaceholderText('$28,000'), '28000');
  fireEvent.changeText(screen.getByPlaceholderText(String(new Date().getFullYear() + 2)), String(new Date().getFullYear() + 2));
  fireEvent.press(screen.getByLabelText('Add it — the odds will account for it'));
  const c = (useStore.getState() as any).bigCosts;
  expect(c).toHaveLength(1);
  expect(c[0]).toMatchObject({ label: 'New roof', amount: 28000 });
  expect(screen.getByText('Total planned')).toBeOnTheScreen();
});

test('hub: the approved question row exists on BOTH lenses and routes to /big-costs', () => {
  const fs = require('fs'); const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'PlanHubScreen.tsx'), 'utf8');
  expect((src.match(/What big costs are coming\?/g) || []).length).toBeGreaterThanOrEqual(2);
  expect(src).toMatch(/big-costs/);
});

test('sameness: the will-it-last selector passes store bigCosts into the inputs', () => {
  const fs = require('fs'); const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'domain/retirement/willItLast.ts'), 'utf8');
  expect(src).toMatch(/one_off_costs: \(a\.bigCosts \?\? \[\]\)/);
});
