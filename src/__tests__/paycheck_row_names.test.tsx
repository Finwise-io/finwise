// THE PAYCHECK ROWS MUST SAY WHOSE MONEY THEY ARE (audit D5, fixed 2026-08-13).
//
// The Plan tab read `.label` off each guaranteed-income row; the engine's field is `source`. So
// June's paycheck rendered two bare amounts with no names beside them — a bill with the line items
// blanked out — directly above a note claiming "the same paycheck as Home's card". Three of the four
// screens that show these rows were always right; only Plan was wrong.
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import * as fs from 'fs';
import * as path from 'path';
import { useStore } from '../store/useStore';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}),
  router: { push: jest.fn() },
  useSegments: () => [],
}));

const YEAR = new Date().getFullYear();
// June's pinned figures (see june_numbers_probe.test.ts): $985,000 across three accounts.
const JUNE = {
  onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self',
  onboardingProfile: {
    taxMode: 'manual', manualTaxRate: '0', status: 'retired', name: 'June',
    birthYear: String(YEAR - 72), birthMonth: '2', horizonAge: '94',
    incomeSources: ['retirement_income'],
    ri_ss: '2600', ri_ss_freq: 'monthly', ri_pension: '1400', ri_pension_freq: 'monthly',
    monthlySpending: '5600',
  },
  retirementAssumptions: { retireAge: 72, horizonAge: 94, contribMonthly: 0, spendMonthly: 5600 },
  assetAccounts: [
    { asset_id: 'jira', label: 'Traditional IRA', institution: 'Fidelity', kind: 'ira', tax_bucket: 'PRE_TAX', balance: 420000, target_return: 0.055 },
    { asset_id: 'jbrok', label: 'Brokerage', institution: 'Schwab', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 448000, target_return: 0.055 },
    { asset_id: 'jcash', label: 'Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 117000, target_return: 0.01 },
  ],
  liabilities: [], bigCosts: [],
};

test('the Plan tab names every guaranteed-income row', () => {
  useStore.getState().resetAll();
  useStore.setState(JUNE as any);
  const Plan = require('../screens/PlanHubScreen').default;
  render(<Plan />);
  expect(screen.getByText('Social Security')).toBeOnTheScreen();
  expect(screen.getByText('Pension')).toBeOnTheScreen();
});

test('and it names them the same way Home does — the note under it says one set of numbers', () => {
  useStore.getState().resetAll();
  useStore.setState(JUNE as any);
  const { PaycheckCard } = require('../components/PaycheckCard');
  const { useCashflowModel } = require('../hooks/useCashflowModel');
  // render Home's card through a probe so both screens read the one engine
  const Probe = () => { const { year } = useCashflowModel(); return <PaycheckCard year={year} />; };
  render(<Probe />);
  expect(screen.getByText(/Social Security/)).toBeOnTheScreen();
  expect(screen.getByText(/Pension/)).toBeOnTheScreen();
});

test('GUARD: no screen reads .label off a guaranteed-income row again', () => {
  const root = path.join(__dirname, '..');
  const files = [
    'screens/PlanHubScreen.tsx', 'screens/MonthDetailScreen.tsx',
    'screens/PaycheckMonthsScreen.tsx', 'components/PaycheckCard.tsx',
  ];
  const offenders: string[] = [];
  for (const rel of files) {
    const src = fs.readFileSync(path.join(root, rel), 'utf8');
    // the map callback over `guaranteed` must not reach for `.label`
    for (const m of src.matchAll(/guaranteed\s*\?\?\s*\[\]\)?\.map\([\s\S]{0,400}?\)\)/g)) {
      if (/\bg\.label\b/.test(m[0])) offenders.push(`${rel}: reads g.label — the engine's field is g.source`);
    }
    if (/\.guaranteed\.map\([\s\S]{0,400}?g\.label/.test(src)) {
      offenders.push(`${rel}: reads g.label — the engine's field is g.source`);
    }
  }
  expect(offenders).toEqual([]);
});
