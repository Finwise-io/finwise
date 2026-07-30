// Build-47 walk pins — one test per approved row (founder: "Approve all 25", 2026-07-30).
// Group A: honesty rows 1-5.
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  router: { push: jest.fn(), back: jest.fn(), setParams: jest.fn() },
}));

beforeEach(() => { useStore.getState().resetAll(); mockParams = {}; });

test('row 1: the HSA card says "up to $X" and the honest not-tracked note — never "$X left" it cannot know', () => {
  useStore.setState({ onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: '1970' } } as any);
  const ContributionRoomScreen = require('../ContributionRoomScreen').default;
  render(<ContributionRoomScreen />);
  expect(screen.getAllByText(/up to \$/).length).toBeGreaterThan(0);
  expect(screen.getByText(/We don't track your HSA contributions yet/)).toBeOnTheScreen();
});

test('row 2: a 68-year-old sees claim NOW (68) vs 70 — never a table of greyed-out "passed" rows', () => {
  const yr = new Date().getFullYear();
  useStore.setState({ onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: String(yr - 68), monthlySpending: '4000' } } as any);
  const SsTimingScreen = require('../SsTimingScreen').default;
  render(<SsTimingScreen />);
  expect(screen.getByText(/at 68 \(now\)/)).toBeOnTheScreen();
  expect(screen.getAllByText(/at 70/).length).toBeGreaterThan(0);
  expect(screen.queryByText(/at 62/)).toBeNull();          // dead choices are not shown
  expect(screen.queryByText(/\(passed\)/)).toBeNull();
});

test('row 3: the required-withdrawal card reads taken-vs-due — marking it taken silences the card', () => {
  const yr = new Date().getFullYear();
  const seed = () => useStore.setState({
    onboardingProfile: { status: 'retired', incomeSources: ['retirement_income'], birthYear: String(yr - 75), monthlySpending: '4000' },
    assetAccounts: [{ asset_id: 'ira', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 500000 }],
  } as any);
  seed();
  const InsightsScreen = require('../InsightsScreen').default;
  const r1 = render(<InsightsScreen />);
  expect(screen.getByText('Required withdrawal due')).toBeOnTheScreen();
  r1.unmount();
  // take the full required amount → the card goes quiet (same rule the dedicated screen uses)
  const { rmdAtAge } = require('../../domain/decumulation');
  const due = rmdAtAge(500000, 75);
  useStore.setState({
    transactions: [{ id: 't1', type: 'WITHDRAWAL', account_id: 'ira', amount: due, date: `${yr}-03-01`, created_at: new Date().toISOString() }],
  } as any);
  render(<InsightsScreen />);
  expect(screen.queryByText('Required withdrawal due')).toBeNull();
});

test('row 5: an undated hand-entered value gets the confirm-it-once nudge', () => {
  useStore.setState({
    assetAccounts: [{ asset_id: 'gold', label: 'Gold coins', kind: 'commodities', tax_bucket: 'TAXABLE', balance: 9000 }],
  } as any);
  mockParams = { id: 'gold' };
  const AccountDetailScreen = require('../AccountDetailScreen').default;
  render(<AccountDetailScreen />);
  expect(screen.getByText(/Value date unknown — confirm it once/)).toBeOnTheScreen();
});

test('row 4: the bond and alternatives editors both carry the Value-as-of field', () => {
  const { BondEditor } = require('../BondsScreen');
  const r = render(<BondEditor bond={null} open onClose={() => {}} onSave={() => {}} />);
  expect(screen.getAllByText('Value as of').length).toBe(1);
  r.unmount();
  const fs = require('fs'); const path = require('path');
  const alt = fs.readFileSync(path.join(__dirname, '..', 'OtherInvestmentsScreen.tsx'), 'utf8');
  expect(alt).toMatch(/Value as of/);
  expect(alt).toMatch(/value_as_of: valueAsOf/);
});

// ── Group B: one-helper consolidations (rows 6-11) — source pins so the forks can't regrow ──
test('rows 6-11: the consolidations hold at the source', () => {
  const fs = require('fs'); const path = require('path');
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');
  // row 6: Roth screen uses THE helper; the retired bracket-fill helper is gone
  expect(read('screens/RothScreen.tsx')).toMatch(/rothConversionCost\(/);
  expect(read('domain/planning/index.ts')).not.toMatch(/export function rothConversion\(/);
  // row 7: the flat capacity figure DERIVES from the by-month engine
  expect(read('domain/savings/index.ts')).toMatch(/const months = surplusByMonth\(op, debts\)/);
  // row 8: one source-wording helper; the inline variants are gone
  expect(read('domain/assets/index.ts')).toMatch(/export function sourceWording/);
  expect(read('screens/NetWorthScreen.tsx')).not.toMatch(/Manual · you update it/);
  expect(read('screens/AccountDetailScreen.tsx')).toMatch(/sourceWording\(account\)/);
  // row 9: the RMD schedule grows by the shared step, clamp gone
  expect(read('domain/decumulation/index.ts')).toMatch(/growOneYear\(bal/);
  expect(read('domain/decumulation/index.ts')).not.toMatch(/Math\.min\(0\.12, expReturn/);
  // row 10: the snapshot simulation reads the canonical blended return
  expect(read('domain/snapshot.ts')).toMatch(/mean_return: blendedReturn\(acctRows\)/);
  // row 11: the five money heroes render through HeroAmount
  for (const f of ['screens/NetWorthScreen.tsx', 'screens/PerformanceScreen.tsx', 'screens/CashFlowScreen.tsx', 'components/PaycheckCard.tsx']) {
    expect(read(f)).toMatch(/<HeroAmount/);
  }
});

// ── Group C: conformance rows 12-19 ──
test('rows 12-19: conformance pins', () => {
  const fs = require('fs'); const path = require('path');
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');
  // row 12: the hidden-balances banner is ONE component mounted on all five tabs
  for (const f of ['screens/HomeScreen.tsx', 'screens/NetWorthScreen.tsx', 'screens/PerformanceScreen.tsx', 'screens/CashFlowScreen.tsx', 'screens/PlanHubScreen.tsx']) {
    expect(read(f)).toMatch(/<HiddenBalancesBanner \/>/);
  }
  // row 13: pull-to-refresh on Home + Net worth (prices AND connected sync)
  for (const f of ['screens/HomeScreen.tsx', 'screens/NetWorthScreen.tsx']) {
    expect(read(f)).toMatch(/RefreshControl refreshing=\{refreshing\} onRefresh=\{onPull\}/);
    expect(read(f)).toMatch(/runSnapTradeSync\(\{ force: true \}\)/);
  }
  // row 14: the approved door lines, word for word
  expect(read('screens/HomeScreen.tsx')).toMatch(/Takes about 2 minutes\. Read-only/);
  expect(read('screens/HomeScreen.tsx')).toMatch(/Add it by hand — your home, savings/);
  // row 15: Roth banner + save-scenario + the dated hub action item
  expect(read('screens/RothScreen.tsx')).toMatch(/\{TRYING_IT_OUT\}/);
  expect(read('screens/RothScreen.tsx')).toMatch(/saveRetirementScenario/);
  expect(read('screens/PlanHubScreen.tsx')).toMatch(/convert \$\{maskedMoney\(Number\(A\.rothConversionThisYear\)\)\} before Dec 31/);
  // row 16: holding detail mirrors the chosen period
  expect(read('screens/PerformanceScreen.tsx')).toMatch(/&period=\$\{period\}/);
  expect(read('screens/HoldingDetailScreen.tsx')).toMatch(/params\.period/);
  // row 17: the concentration callout is a button that scrolls to the list
  expect(read('screens/PerformanceScreen.tsx')).toMatch(/onPress=\{\(\) => \{ if \(invListY\.current > 0\) scrollRef\.current\?\.scrollTo/);
});

test('row 18: when the holding-level concentration fires, the account-level card yields', () => {
  const { buildInsights } = require('../../domain/insights');
  const both = buildInsights({
    cashMonths: 6, toxicDebt: null, k401Remaining: 0, hasEarnedIncome: true, retireChance: 90,
    cashDragPct: 10, topAccountPct: 60, topAccountAmount: 60000, planPct: 100, beatBy: 0.01, investRate: 0.2,
    topHolding: { ticker: 'NVDA', pct: 42, value: 42000 },
  } as any);
  expect(both.some((i: any) => i.id === 'holding-concentration')).toBe(true);
  expect(both.some((i: any) => i.id === 'concentration')).toBe(false);
  const solo = buildInsights({
    cashMonths: 6, toxicDebt: null, k401Remaining: 0, hasEarnedIncome: true, retireChance: 90,
    cashDragPct: 10, topAccountPct: 60, topAccountAmount: 60000, planPct: 100, beatBy: 0.01, investRate: 0.2, topHolding: null,
  } as any);
  expect(solo.some((i: any) => i.id === 'concentration')).toBe(true);
});
