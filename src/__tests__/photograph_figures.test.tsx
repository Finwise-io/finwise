/** THE PHOTOGRAPH — step 2 of the one-door architecture (moneykeel_calc_spec_one-door-per-question_v01.md).
 *
 *  "For real profiles and test ones, record every figure the current screens show from this function.
 *  This is the 'before' record that proves the door changed nothing it should not have."
 *
 *  Two people — one still working, one retired — are rendered on every screen that shows money or
 *  odds, and every figure a person could read (dollar amounts, percents, months, ages) is recorded
 *  as a jest snapshot under __snapshots__/. Moving a caller behind a door must leave this file
 *  byte-identical; a difference is a number that changed, and a difference has no winner — it stops
 *  the work and goes to the founder. Update the photograph only with `jest -u` and a ruling.
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

const TODAY = '2026-09-12T12:00:00.000Z';
const brokerage = { asset_id: 'van', label: 'Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 300000, target_return: 0.07, source: 'connected', last_synced: TODAY,
  positions: [{ position_id: 'p1', ticker: 'VTI', name: 'VANGUARD TOTAL STOCK MARKET ETF', asset_class: 'stock_etf', last_price: 100, price: 100, shares: 3000, lots: [{ lot_id: 'l1', shares: 3000, cost_per_share: 90, purchase_date: '2024-01-02' }] }] };
const savings = { asset_id: 'sav', label: 'Ally Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 20000, target_return: 0.01 };
const ira = { asset_id: 'ira', label: 'Traditional IRA', institution: 'Fidelity', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 400000, target_return: 0.06 };
const PEOPLE: Record<string, any> = {
  worker: { onboardingProfile: { status: 'employed', incomeSources: ['employment'], name: 'Pat', birthYear: '1971', birthMonth: '3', baseSalary: '9000', salaryMode: 'gross', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '20', monthlySpending: '4500', targetRetirementAge: '65', horizonAge: '92' },
            assetAccounts: [brokerage, savings], liabilities: [] },
  retiree: { onboardingProfile: { status: 'retired', name: 'Lee', birthYear: '1958', birthMonth: '5', ri_ss: '2400', monthlySpending: '4000', horizonAge: '92', filingStatus: 'single' },
             assetAccounts: [ira, savings], liabilities: [] },
};
const SCREENS = ['HomeScreen', 'NetWorthScreen', 'CashFlowScreen', 'PlanHubScreen', 'PerformanceScreen', 'RetirementCockpit', 'WillItLastScreen', 'IncomeSummaryScreen'];

/** Every figure a person could read, in order: money, percents, months, ages, odds. */
function figures(): string[] {
  const out: string[] = [];
  const walk = (n: any) => {
    if (n == null) return;
    if (typeof n === 'string') { const t = n.trim(); if (/\$[\d,]|\d%|\d{1,3} percent|out of 100|\bage \d|\d+ months?\b|\d+ years?\b/.test(t)) out.push(t.replace(/\s+/g, ' ').slice(0, 140)); return; }
    if (n.props?.accessibilityLabel && /\$[\d,]|\d%|percent|out of 100/.test(String(n.props.accessibilityLabel))) out.push('[spoken] ' + String(n.props.accessibilityLabel).replace(/\s+/g, ' ').slice(0, 140));
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
}

describe.each(Object.keys(PEOPLE))('photograph — %s', (who) => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(TODAY) });   // the photograph must not change overnight
    useStore.getState().resetAll();
    useStore.setState({ hideBalances: false, onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self', ...PEOPLE[who] } as any);
  });
  afterEach(() => { jest.useRealTimers(); });
  test.each(SCREENS)('%s', (file) => {
    const C = require(`../screens/${file}`).default;
    render(<C />);
    expect(figures()).toMatchSnapshot();
    screen.unmount();
  });
});
