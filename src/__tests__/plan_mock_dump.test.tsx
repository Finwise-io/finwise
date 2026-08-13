// PLAN MOCK-MATCH HARNESS (founder standing order 2026-08-10, applied to the Plan surface).
// The approved picture is `A-instructions for claude/Plan screen/Plan.dc.html` — seven drawn states.
// This renders the BUILT Plan tab in the same seven states with the personas the mock draws (Pat 58
// working, June 72 retired) and dumps every visible string IN RENDER ORDER to /tmp/plan-dumps.json,
// so the audit diffs what the screen SHOWS against what the mock SHOWS. Never a presence check.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as fs from 'fs';
import { useStore } from '../store/useStore';

let mockParams: any = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  router: { push: jest.fn() },
  useSegments: () => [],
}));

const YEAR = new Date().getFullYear();

// ── the mock's own numbers, as accounts (the counted total is $909,152 exactly, home excluded) ──
const PAT_ACCOUNTS = [
  { asset_id: 'van', label: 'Vanguard Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 355152, target_return: 0.07 },
  { asset_id: 'fid', label: 'Traditional IRA', institution: 'Fidelity', kind: 'ira', tax_bucket: 'PRE_TAX', balance: 420000, target_return: 0.07 },
  { asset_id: 'rot', label: 'Roth IRA', institution: 'Vanguard', kind: 'roth_ira', tax_bucket: 'ROTH', balance: 96000, target_return: 0.07 },
  { asset_id: 'ally', label: 'Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 38000, target_return: 0.01 },
  { asset_id: 'hme', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 620000, target_return: 0, value_as_of: new Date().toISOString().slice(0, 10) },
];

const PAT = {
  onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self',
  onboardingProfile: {
    taxMode: 'manual', manualTaxRate: '20', status: 'employed', name: 'Pat',
    birthYear: String(YEAR - 58), birthMonth: '4', targetRetirementAge: '65',
    incomeSources: ['employment'], baseSalary: '11000', salaryMode: 'gross', salaryFreq: 'monthly',
    monthlySpending: '5200',
  },
  retirementAssumptions: { retireAge: 65, horizonAge: 90, contribMonthly: 0, spendMonthly: 5200 },
  assetAccounts: PAT_ACCOUNTS,
  liabilities: [],
  bigCosts: [{ id: 'bc_1_2028', label: 'Roof', amount: 18000, year: 2028 }],
};

// June: the mock's paycheck is SS $2,600 + pension $1,400 = $4,000 guaranteed, safe draw $4,155,
// paycheck $8,155/mo against $5,600/mo spending, odds 100% to 94.
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
    { asset_id: 'jbrok', label: 'Brokerage', institution: 'Schwab', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 1_100_000, target_return: 0.06 },
    { asset_id: 'jira', label: 'Traditional IRA', institution: 'Fidelity', kind: 'ira', tax_bucket: 'PRE_TAX', balance: 480000, target_return: 0.06 },
    { asset_id: 'jcash', label: 'Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 51000, target_return: 0.01 },
  ],
  liabilities: [],
  bigCosts: [],
};

const dumpStrings = (): string[] => {
  const out: string[] = [];
  const walk = (node: any) => {
    if (node == null) return;
    if (typeof node === 'string') { const t = node.trim(); if (t) out.push(t); return; }
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.children) node.children.forEach(walk);
  };
  const tree = screen.toJSON();
  if (tree) walk(tree);
  return out;
};

const dumps: Record<string, string[]> = {};

const renderPlan = () => {
  const Plan = require('../screens/PlanHubScreen').default;
  render(<Plan />);
};

describe('Plan mock-match harness — every visible string, in render order, per drawn state', () => {
  beforeEach(() => { mockParams = {}; useStore.getState().resetAll(); });

  test('dump: Plan tab — Pat (58, working, everything answered)', () => {
    useStore.setState(PAT as any);
    renderPlan();
    dumps['Plan tab — Pat'] = dumpStrings();
    expect(dumps['Plan tab — Pat'].length).toBeGreaterThan(0);
  });

  test('dump: Plan tab — June (72, retired)', () => {
    useStore.setState(JUNE as any);
    renderPlan();
    dumps['Plan tab — June'] = dumpStrings();
    expect(dumps['Plan tab — June'].length).toBeGreaterThan(0);
  });

  test('dump: Section 1 — Missing Age (deep-linked from Home / Net worth)', () => {
    const { birthYear, birthMonth, ...noAge } = PAT.onboardingProfile as any;
    useStore.setState({ ...PAT, onboardingProfile: noAge } as any);
    mockParams = { focus: 'your age' };
    renderPlan();
    dumps['Section 1 — Missing Age'] = dumpStrings();
    expect(dumps['Section 1 — Missing Age'].length).toBeGreaterThan(0);
  });

  test('dump: Section 1 — Empty Sample (nothing answered)', () => {
    renderPlan();
    dumps['Section 1 — Empty Sample'] = dumpStrings();
    expect(dumps['Section 1 — Empty Sample'].length).toBeGreaterThan(0);
  });

  test('dump: Section 1 — Mid-change (a draft in play)', () => {
    useStore.setState(PAT as any);
    renderPlan();
    fireEvent.press(screen.getByLabelText('Raise Retire at'));
    fireEvent.press(screen.getByLabelText('Raise Extra saving each month'));
    dumps['Section 1 — Mid-change'] = dumpStrings();
    expect(dumps['Section 1 — Mid-change'].length).toBeGreaterThan(0);
  });

  test('dump: Section 1 — Impossible Saving (the required saving exceeds what they earn)', () => {
    useStore.setState({
      ...PAT,
      onboardingProfile: { ...PAT.onboardingProfile, baseSalary: '4200' },
      retirementAssumptions: { retireAge: 65, horizonAge: 90, contribMonthly: 0, spendMonthly: 7000 },
      assetAccounts: [
        { asset_id: 'van', label: 'Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 312000, target_return: 0.07 },
      ],
      bigCosts: [],
    } as any);
    renderPlan();
    dumps['Section 1 — Impossible Saving'] = dumpStrings();
    expect(dumps['Section 1 — Impossible Saving'].length).toBeGreaterThan(0);
  });

  test('dump: outcome block — STRONG (cleared the target)', () => {
    useStore.setState({
      ...PAT,
      assetAccounts: [{ asset_id: 'big', label: 'Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 2_400_000, target_return: 0.07 }],
      bigCosts: [],
    } as any);
    renderPlan();
    dumps['Outcome — STRONG'] = dumpStrings();
    expect(dumps['Outcome — STRONG'].length).toBeGreaterThan(0);
  });

  afterAll(() => { fs.writeFileSync('/tmp/plan-dumps.json', JSON.stringify(dumps, null, 1)); });
});
