// MOCK-MATCH HARNESS (founder standing order, 2026-08-10). Renders each screen with a realistic
// data shape and DUMPS every visible string in render order to /tmp/screen-dumps.json, so the audit
// diffs what the screen SHOWS against what the mock SHOWS — never a presence check again.
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import * as fs from 'fs';
import { useStore } from '../store/useStore';
import { employedPartner } from '../testing/personas';

let mockParams: any = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  router: { push: jest.fn() },
  useSegments: () => [],
}));

const today = new Date().toISOString().slice(0, 10);
const REAL_DATA = {
  onboardingComplete: true,
  nwSeeded: true,
  nwSetupChoice: 'self',
  onboardingProfile: { ...employedPartner, monthlySpending: '4500' },
  retirementAssumptions: { retireAge: 65, contribMonthly: 1200, spendMonthly: 4500, horizonAge: 92 },
  assetAccounts: [
    { asset_id: 'chk', label: 'Chase Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 8000, target_return: 0 },
    { asset_id: 'van', label: 'Vanguard Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 348495,
      target_return: 0.07, source: 'connected', last_synced: `${today}T09:00:00Z`, cash_balance: 838,
      positions: [{ position_id: 'p1', ticker: 'VTI', asset_class: 'stock_etf', last_price: 250, price: 250, shares: 1394,
        lots: [{ lot_id: 'l1', shares: 1394, cost_per_share: 200, purchase_date: '2024-01-02' }] }] },
    { asset_id: 'etr', label: 'E*TRADE Treasuries & CDs', institution: 'E*TRADE', kind: 'fixed_income', tax_bucket: 'TAXABLE',
      asset_class: 'bonds', balance: 5819, target_return: 0.042, source: 'connected', last_synced: `${today}T09:00:00Z`,
      maturity_date: '2026-08-24', coupon_rate: 0.04 },
    { asset_id: 'hme', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 450000, target_return: 0, value_as_of: today },
  ],
  liabilities: [
    { debt_id: 'mtg', label: 'Home mortgage', kind: 'mortgage', balance: 412000, interest_rate_apr: 0.055, minimum_payment: 2400 },
    { debt_id: 'cc', label: 'Chase Visa', kind: 'credit_card', balance: 6000, interest_rate_apr: 0.229, minimum_payment: 150 },
  ],
  transactions: [
    { account_id: 'van', type: 'DIVIDEND', ticker: 'VTI', amount: 1220, date: today },
    { account_id: 'etr', type: 'INTEREST', amount: 430, date: today },
  ],
  nwDaily: { '2026-08-03': 393042, [today]: 395152 },
  invDaily: { '2026-08-03': 361242, [today]: 363152 },
};

const dumpStrings = (): string[] => {
  const out: string[] = [];
  const walk = (node: any) => {
    if (node == null) return;
    if (typeof node === 'string') { const t = node.trim(); if (t) out.push(t); return; }
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.children) node.children.forEach(walk);
  };
  screen.toJSON() && walk(screen.toJSON());
  return out;
};

const SCREENS: { key: string; file: string; params?: any }[] = [
  { key: 'NW main', file: 'NetWorthScreen' },
  { key: 'Performance main', file: 'PerformanceScreen' },
  { key: 'Account detail (portfolio)', file: 'AccountDetailScreen', params: { id: 'van' } },
  { key: 'Account detail - class slice', file: 'AccountDetailScreen', params: { id: 'van', class: 'stocks_etf' } },
  { key: 'Account detail - matured CD', file: 'AccountDetailScreen', params: { id: 'etr' } },
  { key: 'Itemize', file: 'ItemizeScreen', params: { id: 'van' } },
  { key: 'Import holdings', file: 'ImportHoldingsScreen' },
  { key: 'Connect flow', file: 'ConnectFlowScreen' },
  { key: 'Add account', file: 'AddAccountScreen' },
  { key: 'Bond & alternatives editors', file: 'BondsScreen' },
];

const dumps: Record<string, string[]> = {};

describe('mock-match harness — dump every visible string per screen', () => {
  beforeEach(() => { useStore.getState().resetAll(); useStore.setState(REAL_DATA as any); });

  for (const s of SCREENS) {
    test(`dump: ${s.key}`, () => {
      mockParams = s.params ?? {};
      let Comp: any;
      try { Comp = require(`../screens/${s.file}`).default; } catch { dumps[s.key] = ['<screen not found>']; return; }
      try { render(<Comp />); dumps[s.key] = dumpStrings(); }
      catch (e: any) { dumps[s.key] = [`<render failed: ${String(e?.message ?? e).slice(0, 120)}>`]; }
      expect(dumps[s.key].length).toBeGreaterThan(0);
    });
  }

  afterAll(() => { fs.writeFileSync('/tmp/screen-dumps.json', JSON.stringify(dumps, null, 1)); });
});

// first-day states get their own dump — the founder's empty-state rule lives or dies here
describe('mock-match harness — first-day dumps', () => {
  test('dump: NW first-day + Performance day-one', () => {
    useStore.getState().resetAll();
    mockParams = {};
    const NW = require('../screens/NetWorthScreen').default;
    render(<NW />);
    const nw = dumpStrings();
    useStore.getState().resetAll();
    const PF = require('../screens/PerformanceScreen').default;
    render(<PF />);
    const pf = dumpStrings();
    const prev = fs.existsSync('/tmp/screen-dumps.json') ? JSON.parse(fs.readFileSync('/tmp/screen-dumps.json', 'utf8')) : {};
    fs.writeFileSync('/tmp/screen-dumps.json', JSON.stringify({ ...prev, ...dumps, 'NW first-day': nw, 'Performance day-one': pf }, null, 1));
    expect(nw.length + pf.length).toBeGreaterThan(0);
  });
});
