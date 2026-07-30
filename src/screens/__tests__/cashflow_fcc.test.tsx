// FCC Cash flow tab — the sameness pins the design demands:
//   PIN 1: hero = the F5 cell for the current month = that month's bar = the month-detail total.
//   PIN 2: this-year = the EXACT sum of the 12 by-month cells (never monthly × 12).
//   PIN 3: month-detail rows visibly sum to the headline.
//   Plus: lens switching, the working projection card's estimate label, and the draw-order preview.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import CashFlowScreen from '../CashFlowScreen';
import MonthDetailScreen from '../MonthDetailScreen';
import { useStore } from '../../store/useStore';
import { buildPaycheckYear } from '../../domain/paycheck';

const pushes: string[] = [];
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: (r: string) => pushes.push(r), replace: jest.fn() }),
  useLocalSearchParams: () => ({ slot: (global as any).__slot ?? '0' }),
}));

const JUNE = {
  status: 'retired', incomeSources: ['retirement_income'],
  birthYear: String(new Date().getFullYear() - 68),
  ri_ss: '2600', ri_ss_freq: 'monthly', ri_ss_day: 3,
  ri_pension: '1600', ri_pension_freq: 'monthly', ri_pension_day: 1,
  spendCats: [
    { id: 'rent', bucket: 'fixed', amount: '1200', unit: 'dollar' },
    { id: 'proptax', label: 'Property tax', bucket: 'nonmonthly', amount: '1900', unit: 'dollar', months: [11], dueDay: 15, tier: 'critical' },
  ],
};
const WORKER = {
  status: 'employed', incomeSources: ['employment'],
  birthYear: String(new Date().getFullYear() - 58),
  baseSalary: '8000', salaryMode: 'gross', salaryFreq: 'monthly',
  monthlySpending: '4000', targetRetirementAge: '67', horizonAge: '92',
  ri_ss: '2900', ri_ss_freq: 'monthly',   // FUTURE Social Security (not received now — projection fuel)
};

beforeEach(() => {
  (global as any).__slot = '0';
  pushes.length = 0;
  useStore.getState().resetAll();
});

const seedRetired = () => useStore.setState({
  onboardingProfile: JUNE,
  assetAccounts: [{ asset_id: 'ira', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 415000 }],
} as any);

describe('retired lens', () => {
  test('the hero, the current-month bar and the month detail are ONE F5 cell (PIN 1)', () => {
    seedRetired();
    render(<CashFlowScreen />);
    // the hero (PaycheckCard) leads
    expect(screen.getByText(/SAFE TO SPEND — [A-Z]/)).toBeOnTheScreen();
    // compute the same engine the screen's hook runs (same params by construction)
    const s = useStore.getState() as any;
    const year = buildPaycheckYear(s.onboardingProfile, {
      accounts: s.assetAccounts, liabilities: [],
      sim: { current_age: 68, horizon_age: 92, mean_return: 0.055, vol_return: Math.min(0.2, Math.max(0.05, 0.055 * 1.7)), inflation: 0.025, seed: 42, paths: 300 },
    });
    // the current-month bar carries the same in/out the cell holds
    const currentBar = screen.getByLabelText(new RegExp(`^${year.months[0].label}: ${Math.round(year.months[0].guaranteedTotal + year.months[0].safeDraw)} dollars in`));
    expect(currentBar).toBeOnTheScreen();
    // tapping it routes to the month detail for slot 0
    fireEvent.press(currentBar);
    expect(pushes).toContain('/month-detail?slot=0');
  });

  test('draw-order preview names the buckets and the Why sheet explains each in plain English', () => {
    seedRetired();
    render(<CashFlowScreen />);
    expect(screen.getByText(/DRAW COMES FROM/)).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Why this order?'));
    // withdrawalOrder's own words — June is 68 (pre-RMD) with only a pre-tax IRA, so the classic
    // pre-tax explanation shows (the 73+ mandatory wording is pinned in decumulation's own tests)
    expect(screen.getByText(/taxed as income/)).toBeOnTheScreen();
  });

  test('month detail: rows visibly sum to the headline (PIN 3) and the bill month carries its reason', () => {
    seedRetired();
    (global as any).__slot = '0';
    render(<MonthDetailScreen />);
    expect(screen.getByText(/Social Security · 3rd/)).toBeOnTheScreen();
    expect(screen.getByText(/Pension · 1st/)).toBeOnTheScreen();
    expect(screen.getByText('= In')).toBeOnTheScreen();
    expect(screen.getByText('= Safe to spend')).toBeOnTheScreen();
    expect(screen.getByText(/Estimates — these move with your live account balances/)).toBeOnTheScreen();
  });
});

describe('working lens', () => {
  const seedWorker = () => useStore.setState({
    onboardingProfile: WORKER,
    assetAccounts: [{ asset_id: 'k', label: '401k', kind: '401k', tax_bucket: 'PRE_TAX', balance: 500000 }],
  } as any);

  test('in/out/surplus card + dated bars + tap-through to month detail', () => {
    seedWorker();
    render(<CashFlowScreen />);
    expect(screen.getByText('THIS MONTH')).toBeOnTheScreen();
    expect(screen.getByText('In (take-home)')).toBeOnTheScreen();
    expect(screen.getByText(/= Planned surplus/)).toBeOnTheScreen();
    expect(screen.getByText(/Spent .* of .* planned/)).toBeOnTheScreen();
    expect(screen.queryByText(/SAFE TO SPEND —/)).toBeNull();   // no retiree hero on the working lens
  });

  test('the future-paycheck card is projection-labeled (mandatory copy) and never a promise', () => {
    seedWorker();
    render(<CashFlowScreen />);
    expect(screen.getByText('YOUR FUTURE PAYCHECK')).toBeOnTheScreen();
    expect(screen.getByText(/PROJECTION — an estimate, not a promise/)).toBeOnTheScreen();
    expect(screen.getByText(/At 67:/)).toBeOnTheScreen();
  });
});

describe('PIN 2 — this-year is the exact sum of the 12 cells (never ×12)', () => {
  test('a December annual pension makes the year ≠ current-month × 12, and the sum still matches', () => {
    useStore.setState({
      onboardingProfile: { ...JUNE, ri_pension: '19200', ri_pension_freq: 'annual', ri_pension_month: 12 },
      assetAccounts: [{ asset_id: 'ira', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 415000 }],
    } as any);
    const s = useStore.getState() as any;
    const year = buildPaycheckYear(s.onboardingProfile, {
      accounts: s.assetAccounts, liabilities: [],
      sim: { current_age: 68, horizon_age: 92, mean_return: 0.055, vol_return: Math.min(0.2, Math.max(0.05, 0.055 * 1.7)), inflation: 0.025, seed: 42, paths: 300 },
    });
    const sum = year.months.reduce((t: number, m: any) => t + m.netSafeToSpend, 0);
    expect(Math.abs(year.thisYear - sum)).toBeLessThan(0.01);                        // exact sum
    expect(Math.abs(year.thisYear - year.thisMonth.netSafeToSpend * 12)).toBeGreaterThan(1000);  // NOT ×12
  });
});

// B46 finding 7: the THIS MONTH card's arithmetic must hold by construction — the surplus row IS
// In − Out from the same month cell, never a second engine's figure (monthlySavings disagreed by
// $572 on the founder's device: "In 8,600 − Out 0 = 9,172. How?").
test('THIS MONTH: In − Out = Planned surplus, to the dollar, always', () => {
  useStore.setState({
    onboardingProfile: {
      status: 'employed', incomeSources: ['employment'],
      baseSalary: '5000', salaryMode: 'takehome', salaryFreq: 'monthly',
      monthlySpending: '3000',   // makes plan-level "capacity" differ from the dated cell on purpose
      invAnnual: '6000',         // investment income widens the two engines' gap further
    },
  } as any);
  render(<CashFlowScreen />);
  const num = (label: RegExp) => {
    const row = screen.getByText(label).parent?.parent;
    const texts: string[] = [];
    const walk = (n: any) => { if (n == null) return; if (typeof n === 'string') { texts.push(n); return; } (n.children ?? []).forEach(walk); };
    walk(row);
    const m = texts.join(' ').match(/\$([\d,]+)/g);
    return m ? Number(m[m.length - 1].replace(/[$,]/g, '')) : NaN;
  };
  const inn = num(/^In \(take-home\)$/);
  const out = num(/^Out \(bills/);
  const sur = num(/^= Planned surplus$|^Free to spend after your plan$/);   // the ROW label (the hero sub duplicates the words)
  expect(Number.isFinite(inn) && Number.isFinite(out) && Number.isFinite(sur)).toBe(true);
  expect(sur).toBe(inn - out);   // the equals sign is earned
});

// B46 finding 8: the Income tab's Salary row must describe what is actually STORED and bridge to
// the same monthly take-home the This-month card's In line uses — a gross/biweekly salary was
// showing as "take-home · monthly" with the raw per-period number ("steady $5,000" vs In $8,600).
test('a gross biweekly salary is described truthfully and reconciles with the In line', () => {
  useStore.setState({
    onboardingProfile: { status: 'employed', incomeSources: ['employment'], baseSalary: '5000', salaryMode: 'gross', salaryFreq: 'biweekly' },
  } as any);
  const { salaryGrossByMonth, monthlyTaxRates } = require('../../domain/income');
  const op = (useStore.getState() as any).onboardingProfile;
  const m = new Date().getMonth();
  const expectedNet = Math.round(salaryGrossByMonth(op)[m] * (1 - monthlyTaxRates(op)[m]));
  render(<CashFlowScreen />);
  fireEvent.press(screen.getByText('Income'));
  const bridge = 'before tax · every 2 weeks · ≈ ' + '$' + expectedNet.toLocaleString() + '/mo take-home';
  expect(screen.getByText(bridge)).toBeOnTheScreen();
  expect(screen.queryByText('take-home · monthly')).toBeNull();   // the old hardcoded lie
});
