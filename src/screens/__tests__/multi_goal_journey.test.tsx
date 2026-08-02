// F4 — Afford it all? The pins: capacity = the canonical after-debt surplus (a shortfall here can
// never coexist with a surplus on Cash flow); a trim hint IS a pre-run of the dials (applying it
// reproduces its numbers); adoption writes commitments[] through the ONE sheet and Cash flow's
// working lens then names each commitment and relabels the surplus.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import MultiGoalScreen from '../MultiGoalScreen';
import CashFlowScreen from '../CashFlowScreen';
import { useStore } from '../../store/useStore';
import { weighGoals, trimHints } from '../../domain/planning/multiGoal';
import { monthlySavings } from '../../domain/savings';
import { money } from '../../domain/_shared/num';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

const WORKER = {
  status: 'employed', incomeSources: ['employment'],
  birthYear: String(new Date().getFullYear() - 58),
  baseSalary: '10000', salaryMode: 'gross', salaryFreq: 'monthly',
  taxMode: 'manual', manualTaxRate: '20', monthlySpending: '4000',
  targetRetirementAge: '67', horizonAge: '92',
};

beforeEach(() => {
  useStore.getState().resetAll();
  useStore.setState({
    onboardingProfile: WORKER,
    assetAccounts: [{ asset_id: 'k', label: '401k', kind: '401k', tax_bucket: 'PRE_TAX', balance: 500000 }],
    goals: [
      { id: 'g1', label: 'Help parents', target: 60000, saved: 0, targetDate: '2028-07' },
      { id: 'g2', label: 'College fund', target: 40000, saved: 10000, targetDate: '2031-08' },
    ],
  } as any);
});

describe('the engine (pure pins)', () => {
  const base = { dials: [
    { id: 'g1', label: 'Help parents', on: true, monthlyAmount: 2000, target: 60000, saved: 0 },
    { id: 'g2', label: 'College fund', on: false, monthlyAmount: 800, target: 40000, saved: 10000 },
  ], retirementMonthly: 1000, capacityMonthly: 3400, baseInputs: null };

  test('verdict math: committed sums ON dials + retirement; spare = capacity − committed', () => {
    const r = weighGoals(base as any);
    expect(r.committed).toBe(3000);
    expect(r.spare).toBe(400);
    expect(r.covered).toBe(true);
    const short = weighGoals({ ...base, retirementMonthly: 1600 } as any);
    expect(short.spare).toBe(-200);
    expect(short.covered).toBe(false);
  });

  test('off dials cost nothing; a goal end date only exists for ON dials', () => {
    const r = weighGoals(base as any);
    expect(r.goalEnds['g1']).toBeTruthy();      // 60000 / 2000 = 30 months out
    expect(r.goalEnds['g2']).toBeUndefined();   // off → not weighed
  });

  test('a trim hint IS a pre-run: applying its amounts reproduces its numbers exactly', () => {
    const withSim = { ...base, baseInputs: {
      current_age: 58, retire_age: 67, horizon_age: 92, start_balance: 500000,
      annual_contribution: 12000, retire_monthly_spend_today: 4000, guaranteed_monthly_income: 0,
      inflation: 0.025, mean_return: 0.055, vol_return: 0.0935, paths: 300, seed: 42,
    } } as any;
    const [hint] = trimHints(withSim);
    const freed = 2000 - hint.trimmedAmount;
    const applied = weighGoals({
      ...withSim,
      dials: withSim.dials.map((d: any) => d.id === hint.dialId ? { ...d, monthlyAmount: hint.trimmedAmount } : d),
      retirementMonthly: withSim.retirementMonthly + freed,
    });
    expect(applied.chance).toBe(hint.chance);         // deterministic seeded run — identical
    expect(applied.retireAge).toBe(hint.retireAge);
  });
});

describe('the screen journey', () => {
  test('sandbox banner + verdict against the canonical capacity; nothing writes until adoption', () => {
    render(<MultiGoalScreen />);
    expect(screen.getByText(/Trying it out — nothing changes/)).toBeOnTheScreen();
    expect(screen.getByText(/regular bills, including the mortgage, are already counted/)).toBeOnTheScreen();
    expect(screen.getByText(/Covered|Short/)).toBeOnTheScreen();
    expect((useStore.getState() as any).retirementAssumptions.commitments).toBeUndefined();
  });

  test('adoption writes commitments through the ONE sheet; Cash flow then names them (the walkthrough trust-breaker)', () => {
    render(<MultiGoalScreen />);
    fireEvent(screen.getByLabelText(/Help parents at/), 'valueChange', true);   // toggle the goal on
    fireEvent.press(screen.getByLabelText('Use this plan — see exactly what changes first'));
    expect(screen.getByText(/exactly what changes/)).toBeOnTheScreen();          // the F11 sheet
    fireEvent.press(screen.getByLabelText('Use as my plan: Your goals, together'));

    const A = (useStore.getState() as any).retirementAssumptions;
    expect(A.commitments).toHaveLength(1);
    expect(A.commitments[0].label).toBe('Help parents');
    expect((useStore.getState() as any).planHistory).toHaveLength(1);           // revert is possible

    // Cash flow (working lens) now names the commitment and relabels the surplus
    render(<CashFlowScreen />);
    expect(screen.getByText(/Help parents · from your Plan/)).toBeOnTheScreen();
    expect(screen.getAllByText('Free to spend after your plan').length).toBeGreaterThan(0);   // hero + row
  });

  test('PIN: the capacity figure equals the canonical after-debt surplus to the dollar', () => {
    render(<MultiGoalScreen />);
    fireEvent.press(screen.getByLabelText('Where the money goes'));
    const s = useStore.getState() as any;
    const expected = Math.max(0, Math.round(monthlySavings(s.onboardingProfile, s.liabilities ?? [])));
    expect(screen.getByText(money(expected))).toBeOnTheScreen();
  });
});
