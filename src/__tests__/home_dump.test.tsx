// Ground truth for the Home redesign brief: what the shipping screen actually says, both lenses,
// rich and first-day. Never write a brief from memory (mock-fidelity lesson, 2026-07-31).
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import * as fs from 'fs';
import { useStore } from '../store/useStore';
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}), router: { push: jest.fn() }, useSegments: () => [] }));
const Y = new Date().getFullYear();
const PAT = { onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self',
  onboardingProfile: { taxMode: 'manual', manualTaxRate: '20', status: 'employed', name: 'Pat',
    birthYear: String(Y - 58), birthMonth: '4', targetRetirementAge: '65', incomeSources: ['employment'],
    baseSalary: '11000', salaryMode: 'gross', salaryFreq: 'monthly', monthlySpending: '5200' },
  retirementAssumptions: { retireAge: 65, horizonAge: 90, contribMonthly: 0, spendMonthly: 5200 },
  assetAccounts: [
    { asset_id: 'van', label: 'Vanguard Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 355152, target_return: 0.07 },
    { asset_id: 'fid', label: 'Traditional IRA', institution: 'Fidelity', kind: 'ira', tax_bucket: 'PRE_TAX', balance: 420000, target_return: 0.07 },
    { asset_id: 'ally', label: 'Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 38000, target_return: 0.01 },
    { asset_id: 'hme', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 620000, target_return: 0 }],
  liabilities: [{ debt_id: 'mtg', label: 'Home mortgage', debt_type: 'MORTGAGE', remaining_balance: 412000, interest_rate_apr: 0.055, minimum_monthly_payment: 2400 }],
  bigCosts: [] };
const JUNE = { ...PAT,
  onboardingProfile: { taxMode: 'manual', manualTaxRate: '0', status: 'retired', name: 'June',
    birthYear: String(Y - 72), birthMonth: '2', horizonAge: '94', incomeSources: ['retirement_income'],
    ri_ss: '2600', ri_ss_freq: 'monthly', ri_pension: '1400', ri_pension_freq: 'monthly', monthlySpending: '5600' },
  retirementAssumptions: { retireAge: 72, horizonAge: 94, contribMonthly: 0, spendMonthly: 5600 },
  assetAccounts: [
    { asset_id: 'jira', label: 'Traditional IRA', institution: 'Fidelity', kind: 'ira', tax_bucket: 'PRE_TAX', balance: 420000, target_return: 0.055 },
    { asset_id: 'jbrok', label: 'Brokerage', institution: 'Schwab', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 448000, target_return: 0.055 },
    { asset_id: 'jcash', label: 'Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 117000, target_return: 0.01 }],
  liabilities: [] };
const dump = () => { const o: string[] = []; const w = (n: any) => { if (n == null) return;
  if (typeof n === 'string') { const t = n.trim(); if (t) o.push(t); return; }
  if (Array.isArray(n)) return n.forEach(w); if (n.children) n.children.forEach(w); };
  const t = screen.toJSON(); if (t) w(t); return o; };
const out: Record<string, string[]> = {};
test.each([['Home — Pat, working', PAT], ['Home — June, retired', JUNE], ['Home — first day', null]])
  ('%s', (name, state) => {
    useStore.getState().resetAll();
    if (state) useStore.setState(state as any);
    render(React.createElement(require('../screens/HomeScreen').default));
    out[name as string] = dump();
    expect(out[name as string].length).toBeGreaterThan(0);
  });
afterAll(() => fs.writeFileSync('/tmp/home-dump.json', JSON.stringify(out, null, 1)));
