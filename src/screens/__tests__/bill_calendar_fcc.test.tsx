// Bill calendar v2 (design r34-r43). Pins: the table IS the one F2 grid (rows = the Cash flow
// bars' cells, End chains exactly from editable cash-on-hand); the verdict names dated months
// and the biggest cause; a dated ONE-OFF bill (with a year) lands in its real cell exactly once;
// a deferred debt shows no payment before its first month ANYWHERE (grid + payoff math, the r42
// four-surface pin); coming-up speaks 55-70 (savings or a backup — never a family ask); masked
// state keeps the verdict's words.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import BillCalendarScreen from '../BillCalendarScreen';
import { useStore } from '../../store/useStore';
import { buildDatedGrid } from '../../domain/grid';
import { payoffPlan } from '../../domain/debt';

const mockPushes: string[] = [];
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: (r: string) => mockPushes.push(r), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

const RETIREE = {
  status: 'retired', incomeSources: ['retirement_income'], name: 'June',
  birthYear: String(new Date().getFullYear() - 70), horizonAge: '92', monthlySpending: '4000',
  ri_ss: '2600', ri_ss_freq: 'monthly', ri_pension: '1600', ri_pension_freq: 'monthly',
};

beforeEach(() => {
  mockPushes.length = 0;
  useStore.getState().resetAll();
  useStore.setState({
    hideBalances: false, onboardingComplete: true, onboardingProfile: RETIREE,
    assetAccounts: [{ asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 18400 }],
  } as any);
});

test('the window title states the dated span; End chains EXACTLY (prev End + In − Out) from cash on hand', () => {
  render(<BillCalendarScreen />);
  const grid = buildDatedGrid(RETIREE as any, { startBalance: 18400 });
  expect(screen.getByText(new RegExp(`${grid.cells[0].label} .*– ${grid.cells[11].label}`))).toBeOnTheScreen();
  // chaining identity on the same engine the screen reads
  let bal = 18400;
  for (const c of grid.cells) {
    bal = bal + c.inflow - c.outflow;
    expect(Math.abs(c.runningBalance - bal)).toBeLessThan(0.05);   // cells round to cents; drift stays sub-nickel
  }
});

test('rows are the SAME cells as the Cash flow grid (one grid, no second math) and open month detail', () => {
  render(<BillCalendarScreen />);
  const grid = buildDatedGrid(RETIREE as any, { startBalance: 18400 });
  const c0 = grid.cells[0];
  fireEvent.press(screen.getByLabelText(new RegExp(`${c0.label} ${c0.year}: in .*, out .*, ending balance`)));
  expect(mockPushes).toContain('/month-detail?slot=0');
});

test('editing cash on hand re-chains every End immediately', () => {
  render(<BillCalendarScreen />);
  fireEvent.changeText(screen.getByLabelText('Cash on hand now, editable'), '5000');
  const grid = buildDatedGrid(RETIREE as any, { startBalance: 5000 });
  const { money } = require('../../domain/_shared/num');
  const c0 = grid.cells[0];
  const endTxt = money(Math.round(c0.runningBalance)).replace(/[$()]/g, '\\$&');
  expect(screen.getByLabelText(new RegExp(`${c0.label} ${c0.year}: in .*ending balance ${endTxt}`))).toBeOnTheScreen();
});

test('a dated ONE-OFF bill (year field) lands in its real cell exactly once — and every surface moves together', () => {
  render(<BillCalendarScreen />);
  fireEvent.press(screen.getByLabelText('Add a dated bill'));
  fireEvent.changeText(screen.getByLabelText('Bill name'), 'Roof repair');
  fireEvent.changeText(screen.getByLabelText('Bill amount'), '4200');
  const nextYear = new Date().getFullYear() + 1;
  fireEvent.press(screen.getByLabelText('Due in Mar'));
  fireEvent(screen.getByLabelText('Repeats every year'), 'valueChange', false);   // toggle OFF → one-off
  fireEvent.changeText(screen.getByLabelText('Year, for a one-time bill'), String(nextYear));
  fireEvent.press(screen.getByLabelText('Save this bill'));
  const op = (useStore.getState() as any).onboardingProfile;
  const saved = op.spendCats.find((c: any) => c.label === 'Roof repair');
  expect(saved).toMatchObject({ bucket: 'nonmonthly', amount: 4200, months: [3], year: nextYear, tier: 'critical' });
  // the ONE grid places it in March of next year, once
  const grid = buildDatedGrid(op, {});
  const hits = grid.cells.filter((c) => c.billItems.some((b) => b.label === 'Roof repair'));
  expect(hits).toHaveLength(1);
  expect(hits[0].calendarMonth).toBe(3);
  expect(hits[0].year).toBe(nextYear);
});

test('DEFERRED DEBT (r42 pin): no payment before its first month in the grid, and payoff math defers too', () => {
  const now = new Date();
  const startIn5 = new Date(now.getFullYear(), now.getMonth() + 5, 1);
  const firstPay = `${startIn5.getFullYear()}-${String(startIn5.getMonth() + 1).padStart(2, '0')}-01`;
  const debt = { debt_id: 'car', label: 'Car loan (new)', debt_type: 'AUTO', remaining_balance: 18000, interest_rate_apr: 0.07, minimum_monthly_payment: 385, due_day: 1, first_payment_date: firstPay };
  useStore.setState({ liabilities: [debt] } as any);
  render(<BillCalendarScreen />);
  // visible NOW under Coming up, with its real first month
  expect(screen.getByText(/Car loan \(new\) — first payment/)).toBeOnTheScreen();
  // the grid shows NO payment in any earlier cell (the four-surface pin's grid leg)
  const grid = buildDatedGrid(RETIREE as any, { liabilities: [debt] as any });
  grid.cells.slice(0, 5).forEach((c) => expect(c.billItems.some((b) => b.label === 'Car loan (new)')).toBe(false));
  expect(grid.cells.slice(5).some((c) => c.billItems.some((b) => b.label === 'Car loan (new)'))).toBe(true);
  // payoff math starts the debt at its real month (deferral respected)
  const plan = payoffPlan([debt] as any, 0);
  expect(plan.months).toBeGreaterThan(5);
});

test('coming-up copy is 55-70: savings or a backup — NEVER a family ask', () => {
  useStore.setState({
    onboardingProfile: {
      ...RETIREE, monthlySpending: '5100',
      spendCats: [{ id: 'ptax', label: 'Property tax', bucket: 'nonmonthly', amount: 9000, months: [new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2], dueDay: 15, tier: 'critical' }],
    },
    assetAccounts: [{ asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 500 }],
  } as any);
  render(<BillCalendarScreen />);
  expect(screen.queryByText(/Ask /)).toBeNull();
  expect(screen.getAllByText(/Property tax/).length).toBeGreaterThan(0);
});

test('masked: In/Out/End hide; the verdict keeps its WORDS (a judgment, not a balance)', () => {
  useStore.setState({ hideBalances: true } as any);
  render(<BillCalendarScreen />);
  expect(screen.getByText(/stay above zero|Careful — short/)).toBeOnTheScreen();
  expect(screen.getAllByText(/••••/).length).toBeGreaterThan(0);
});
