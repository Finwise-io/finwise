/** GUARD D3 — the screens must agree (build spec moneykeel_build_spec_guards-before-a-build_v01.md).
 *
 *  "For one test person, every metric shown on more than one screen rendered on each and compared.
 *  The guard that does not rely on discipline, because it looks at what a person would see."
 *
 *  One person — a 55-year-old still working, $9,000 a month gross, $4,500 a month of expenses, a
 *  $300,000 brokerage and $20,000 of savings — is rendered on every screen that shows a shared
 *  figure, and the figure is read off each screen the way a person (or VoiceOver) reads it. The
 *  figures compared, by identifier:
 *    MK-NW-M-017 net worth        — Home glance card · Net worth tab
 *    MK-XS-M-002 will-it-last odds — Home · Plan hub
 *  A figure added to a third screen is added here the same day.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useStore } from '../store/useStore';

jest.mock('../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}),
  router: { push: jest.fn() },
}));

const YEAR = new Date().getFullYear();
const TODAY = new Date().toISOString();
const WORKER = {
  status: 'employed', incomeSources: ['employment'], name: 'Pat',
  birthYear: String(YEAR - 55), baseSalary: '9000', salaryMode: 'gross', salaryFreq: 'monthly',
  taxMode: 'manual', manualTaxRate: '20', monthlySpending: '4500',
  targetRetirementAge: '65', horizonAge: '92',
};
const brokerage = {
  asset_id: 'van', label: 'Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE',
  balance: 300000, target_return: 0.07, source: 'connected', last_synced: TODAY,
  positions: [{ position_id: 'p1', ticker: 'VTI', name: 'VANGUARD TOTAL STOCK MARKET ETF', asset_class: 'stock_etf',
    last_price: 100, price: 100, shares: 3000, lots: [{ lot_id: 'l1', shares: 3000, cost_per_share: 90, purchase_date: '2024-01-02' }] }],
};
const savings = { asset_id: 'sav', label: 'Ally Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 20000, target_return: 0.01 };

/** Every accessibility label and every visible string on the rendered screen. */
function readable(): string[] {
  const out: string[] = [];
  const walk = (n: any) => {
    if (n == null) return;
    if (typeof n === 'string') { const t = n.trim(); if (t) out.push(t); return; }
    if (n.props?.accessibilityLabel) out.push(String(n.props.accessibilityLabel));
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
}
const firstMatch = (re: RegExp): string | null => {
  for (const s of readable()) { const m = s.match(re); if (m) return m[1]; }
  return null;
};
const renderScreen = (file: string) => { const C = require(`../screens/${file}`).default; render(<C />); };

beforeEach(() => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self',
    onboardingProfile: WORKER, assetAccounts: [brokerage, savings], liabilities: [] } as any);
});

test('MK-NW-M-017 — net worth reads the same on Home and on the Net worth tab', () => {
  renderScreen('HomeScreen');
  const home = firstMatch(/^Net worth \$?(\d{1,3}(?:,\d{3})*)/);   // Home speaks it (spokenMoney), Net worth prints it (maskedMoney)
  screen.unmount();
  renderScreen('NetWorthScreen');
  const nw = firstMatch(/^Net worth \$?(\d{1,3}(?:,\d{3})*)/);
  expect(home).not.toBeNull();
  expect(nw).not.toBeNull();
  expect(home).toBe(nw);
  expect(home).toBe('320,000');   // the seed adds up: 300,000 + 20,000 — a person can check it
});

test('MK-XS-M-002 — the will-it-last odds read the same on Home and on the Plan hub', () => {
  renderScreen('HomeScreen');
  const home = firstMatch(/Will my money last: (\d{1,3}(?:\.\d+)?) percent odds/);   // exact odds (2026-09-14)
  screen.unmount();
  renderScreen('PlanHubScreen');
  const plan = firstMatch(/Will my money last: [^0-9]*?(\d{1,3}(?:\.\d+)?)(?: percent| out of 100|%)/);
  expect(home).not.toBeNull();
  expect(plan).not.toBeNull();
  expect(home).toBe(plan);
});
