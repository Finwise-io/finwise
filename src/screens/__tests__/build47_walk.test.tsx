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

// ── Group D: accessibility rows 20-21 ──
test('row 20: every sliding sheet honors Reduce Motion — no literal slide remains, and the helper flips', () => {
  const fs = require('fs'); const path = require('path'); const glob = (d: string) => fs.readdirSync(path.join(__dirname, '..', '..', d)).filter((f: string) => f.endsWith('.tsx')).map((f: string) => `${d}/${f}`);
  for (const rel of [...glob('screens'), ...glob('components')]) {
    if (rel.includes('__tests__')) continue;
    const src = fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');
    expect({ rel, hasLiteral: /animationType="slide"/.test(src) }).toEqual({ rel, hasLiteral: false });
  }
  const { modalAnimation, __setReducedMotionForTesting } = require('../../hooks/reducedMotion');
  __setReducedMotionForTesting(false);
  expect(modalAnimation()).toBe('slide');
  __setReducedMotionForTesting(true);
  expect(modalAnimation()).toBe('none');
  __setReducedMotionForTesting(false);
});

test('row 21: the shared money component speaks its label — masked dots are spoken as "hidden"', () => {
  const { HeroAmount } = require('../../components/HeroAmount');
  const r1 = render(<HeroAmount>{'••••'}</HeroAmount>);
  expect(r1.getByLabelText('hidden')).toBeTruthy();
  r1.unmount();
  const r2 = render(<HeroAmount>{'$1,234'}</HeroAmount>);
  expect(r2.getByLabelText('$1,234')).toBeTruthy();
  r2.unmount();
  const r3 = render(<HeroAmount accessibilityLabel="net worth hidden">{'••••'}</HeroAmount>);
  expect(r3.getByLabelText('net worth hidden')).toBeTruthy();   // an explicit label always wins
});

// ── Group E: the founder's finding rows 22-25 ──
test('rows 22-25: finding fixes hold at the source', () => {
  const fs = require('fs'); const path = require('path');
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');
  // row 22: the transaction picker uses THE shared naming; local account naming is banned
  expect(read('screens/PerformanceScreen.tsx')).toMatch(/const displayNames = accountDisplayNames\(accounts\)/);
  expect(read('screens/PerformanceScreen.tsx')).not.toMatch(/assetKind\(a\.kind\)\?\.label \?\? a\.asset_id\.slice\(-4\)/);
  // row 23: Remove confirms first and names the money leaving — both accounts and debts
  // (the debt half moved into the shared DebtEditorSheet with B47 finding 11 — same behavior)
  const nw = read('screens/NetWorthScreen.tsx');
  expect(nw).toMatch(/Remove \$\{editing\.label\}\?/);
  expect(nw).toMatch(/leaves your net worth/);
  expect(read('components/DebtEditorSheet.tsx')).toMatch(/debt comes off your list/);
  // row 24 → SUPERSEDED by B47 finding 10 (founder): ONE add entry, no explanations at all
  const cf = read('screens/CashFlowScreen.tsx');
  expect(cf).toMatch(/＋ Add income ›/);
  expect(cf).not.toMatch(/Rich editors \(equity comp, rental\) live in the income manager/);
  // row 25: every income source can be ADDED
  const im = read('screens/IncomeManagerScreen.tsx');
  expect(im).toMatch(/＋ Add an income source/);
  expect(im).toMatch(/Stock vesting \(equity comp\)/);
});

// ── Palette adoption (mock #2, founder YES 2026-07-30): the validated set is pinned exactly ──
test('the validated colorblind-safe palette is adopted, fixed order, same class everywhere', () => {
  const { ChartPalette, ClassMarkColors } = require('../../utils/theme');
  expect([...ChartPalette]).toEqual(['#2a78d6', '#1baf7a', '#eda100', '#4a3aa7', '#eb6834', '#e87ba4', '#898781']);
  expect(ClassMarkColors).toEqual({
    stocks_etf: '#2a78d6', cash: '#1baf7a', real_estate: '#eda100', bonds: '#4a3aa7',
    alternatives: '#eb6834', personal_property: '#e87ba4', mixed: '#898781',
  });
  // both screens read the ONE map (source pin — same class can never wear two colors again);
  // pre-48 audit A7: rows order by LIQUIDITY (CLASS_ORDER, Cash first) while colors still come
  // from the one ClassMarkColors map
  const fs = require('fs'); const path = require('path');
  const nw = fs.readFileSync(path.join(__dirname, '..', 'NetWorthScreen.tsx'), 'utf8');
  expect(nw).toMatch(/CLASS_ORDER: AssetClass\[\] = \['cash', 'bonds', 'stocks_etf'/);
  expect(nw).toMatch(/\(ClassMarkColors as any\)\[key\]/);
  // the second consumer today is Account detail's WHAT'S-INSIDE section (Invest's grouped list
  // carries no class dots in the approved v7 build — colors-only change, per the mock's own rule)
  const ad = fs.readFileSync(path.join(__dirname, '..', 'AccountDetailScreen.tsx'), 'utf8');
  expect(ad).toMatch(/ClassMarkColors/);
});

// ── Staleness stamps (mock #4 approved with the founder's left-justified change, 2026-07-31) ──
test('a 3-day-old connection stamps the Home hero and the Net worth hero; fresh connections stamp nothing', () => {
  const old = new Date(Date.now() - 4 * 86400000).toISOString();
  useStore.setState({
    onboardingProfile: { status: 'employed', incomeSources: ['employment'], baseSalary: '5000', salaryMode: 'takehome', salaryFreq: 'monthly' },
    assetAccounts: [{ asset_id: 'e1', label: 'Individual Brokerage', institution: 'E*TRADE', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 100000, source: 'connected', last_synced: old }],
    nwSetupChoice: 'self',
  } as any);
  const HomeScreen = require('../HomeScreen').default;
  const r1 = render(<HomeScreen />);
  expect(screen.getAllByText(/⏱ E\*TRADE part as of .* — 4 days old · pull to refresh/).length).toBeGreaterThan(0);
  r1.unmount();
  const NetWorthScreen = require('../NetWorthScreen').default;
  const r2 = render(<NetWorthScreen />);
  expect(screen.getByText(/⏱ E\*TRADE part as of .* — 4 days old · pull to refresh/)).toBeOnTheScreen();
  r2.unmount();
  // fresh: no stamp anywhere
  useStore.setState({ assetAccounts: [{ asset_id: 'e1', label: 'Individual Brokerage', institution: 'E*TRADE', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 100000, source: 'connected', last_synced: new Date().toISOString() }] } as any);
  render(<HomeScreen />);
  expect(screen.queryByText(/pull to refresh/)).toBeNull();
});

// ── Separator dots (founder pick C — darker, 2026-07-31) + source chips (mock #3 approved) ──
test('separator dots render the dark designed glyph on the marquee lines', () => {
  const { SEP_DOT_COLOR } = require('../../components/SepDot');
  expect(SEP_DOT_COLOR).toBe('#3A3A36');
  const fs = require('fs'); const path = require('path');
  for (const f of ['screens/HomeScreen.tsx', 'screens/NetWorthScreen.tsx', 'screens/CashFlowScreen.tsx', 'screens/BondsScreen.tsx']) {
    expect(fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8')).toMatch(/DotJoined/);
  }
});

test('source chips: connected/imported/by-hand pills on NW account rows; paused goes amber', () => {
  const { SourceChip } = require('../../components/SourceChip');
  const r1 = render(<SourceChip account={{ asset_id: 'a', label: 'x', tax_bucket: 'TAXABLE', balance: 1, source: 'connected', last_synced: new Date().toISOString() } as any} />);
  expect(r1.getByText(/🔗 Connected · updated/)).toBeTruthy();
  r1.unmount();
  const r2 = render(<SourceChip account={{ asset_id: 'a', label: 'x', tax_bucket: 'TAXABLE', balance: 1, source: 'imported', last_synced: '2026-06-12T00:00:00Z' } as any} />);
  expect(r2.getByText('📄 Imported · 2026-06-12')).toBeTruthy();
  r2.unmount();
  const r3 = render(<SourceChip account={{ asset_id: 'a', label: 'x', tax_bucket: 'TAXABLE', balance: 1 } as any} />);
  expect(r3.getByText('✍️ By hand · you update it')).toBeTruthy();
  r3.unmount();
  const r4 = render(<SourceChip paused account={{ asset_id: 'a', label: 'x', tax_bucket: 'TAXABLE', balance: 1, source: 'connected' } as any} />);
  expect(r4.getByText('⏸ Connection paused · reconnect ›')).toBeTruthy();
  r4.unmount();
  // and the NW rows actually render it
  // a lone class auto-expands, so the member row (and its chip) is visible without a tap
  useStore.setState({
    assetAccounts: [
      { asset_id: 'h1', label: 'HYSA at Marcus', kind: 'savings', tax_bucket: 'CASH', balance: 8000, source: 'connected', last_synced: new Date().toISOString() },
    ],
    nwSetupChoice: 'self',
  } as any);
  const NetWorthScreen = require('../NetWorthScreen').default;
  render(<NetWorthScreen />);
  expect(screen.getAllByText(/🔗 Connected · updated/).length).toBeGreaterThan(0);
});

// ── Mock approvals built 2026-07-31: cushion · matured banner · router · path-ahead "how" ──
test('cushion card: months + word on the real engine numbers; the door when spending is unknown', () => {
  useStore.setState({
    onboardingProfile: { status: 'employed', incomeSources: ['employment'], monthlySpending: '4200' },
    assetAccounts: [{ asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 56130 }],
    nwSetupChoice: 'self',
  } as any);
  const NetWorthScreen = require('../NetWorthScreen').default;
  const r1 = render(<NetWorthScreen />);
  expect(screen.getByText('13.4 months')).toBeOnTheScreen();       // 56130 ÷ 4200 = 13.36 → 13.4
  expect(screen.getByText('Comfortable ✓')).toBeOnTheScreen();
  expect(screen.getByText(/\$56,130 cash ÷ \$4,200\/mo essentials/)).toBeOnTheScreen();
  r1.unmount();
  useStore.setState({ onboardingProfile: { status: 'employed', incomeSources: ['employment'] } } as any);
  render(<NetWorthScreen />);
  expect(screen.getByText('Answer one question in Cash flow ›')).toBeOnTheScreen();
});

test('path-ahead row carries the how ⓘ (your approved nest-egg explanation)', () => {
  const yr = new Date().getFullYear();
  useStore.setState({
    onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: String(yr - 55), targetRetirementAge: '67', monthlySpending: '5000', horizonAge: '92' },
    assetAccounts: [{ asset_id: 'ira', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 400000 }],
    nwSetupChoice: 'self',
  } as any);
  const NetWorthScreen = require('../NetWorthScreen').default;
  render(<NetWorthScreen />);
  expect(screen.getByText(/on course for/)).toBeOnTheScreen();
  expect(screen.getByLabelText('What is How we estimate this?')).toBeOnTheScreen();
});

test('matured bond: the dated banner with the three outcomes; paid-out writes the ledger row', () => {
  const past = '2026-06-30';
  useStore.setState({
    assetAccounts: [{ asset_id: 'cd1', label: 'Chase CD 4.0%', kind: 'fixed_income', tax_bucket: 'TAXABLE', balance: 10000, face_value: 10000, coupon_rate: 0.04, maturity_date: past, asset_class: 'bonds' }],
  } as any);
  mockParams = { id: 'cd1' };
  const { Alert } = require('react-native');
  jest.spyOn(Alert, 'alert').mockImplementation((_t: any, _m: any, btns: any) => {
    (btns ?? []).find((b: any) => b.text === 'Paid out to my bank')?.onPress?.();
  });
  const { fireEvent } = require('@testing-library/react-native');
  const AccountDetailScreen = require('../AccountDetailScreen').default;
  render(<AccountDetailScreen />);
  expect(screen.getByText(/⏰ This bond matured Jun 30/)).toBeOnTheScreen();
  // pre-48 audit A8: the three outcomes are VISIBLE on the card (approved mock) — no popup detour
  fireEvent.press(screen.getByLabelText('Paid out to my bank — records the payout'));
  const st = useStore.getState() as any;
  const sell = (st.transactions ?? []).find((t: any) => t.type === 'SELL' && t.account_id === 'cd1');
  expect(sell?.amount).toBe(10000);
  expect(st.assetAccounts.find((a: any) => a.asset_id === 'cd1').balance).toBe(0);
  (Alert.alert as jest.Mock).mockRestore();
});

test('router: bond/alt type chips leave the ticker sheet for their own editors; Record gains the doors', () => {
  const fs = require('fs'); const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'PerformanceScreen.tsx'), 'utf8');
  expect(src).toMatch(/if \(k\.id === 'fixed_income'\) \{ onRoute\?\.\('bond'\); return; \}/);
  expect(src).toMatch(/ALT_ROUTE_KINDS\.includes\(k\.id\)/);
  expect(src).toMatch(/<BondEditor bond=\{null\} open=\{bondAddOpen\}/);
  expect(src).toMatch(/<AltEditor item=\{null\} open=\{altAddKind != null\} presetKind/);
  expect(src).toMatch(/Bonds & alternatives — recorded on their own pages/);
});

// ── Loading & offline (verdict 2026-07-31): banner approved; grey bars REPLACED by the hydration
// hold — the founder's "is that right?" was right: device-local numbers load in a blink, so the
// honest treatment is holding the screen, never fake structure.
test("couldn't-refresh: the banner shows the honest as-of time and clears on success", () => {
  useStore.setState({
    onboardingProfile: { status: 'employed', incomeSources: ['employment'], baseSalary: '5000', salaryMode: 'takehome', salaryFreq: 'monthly' },
    priceRefreshFailed: true, pricesFetchedAt: '2026-07-28T21:14:00Z',
  } as any);
  const HomeScreen = require('../HomeScreen').default;
  const r1 = render(<HomeScreen />);
  expect(screen.getByText(/📡 Couldn't refresh — showing your numbers from Jul 28/)).toBeOnTheScreen();
  r1.unmount();
  useStore.setState({ priceRefreshFailed: false } as any);
  render(<HomeScreen />);
  expect(screen.queryByText(/Couldn't refresh/)).toBeNull();
});

test('the hydration hold exists at the root — no screen renders before the store is ready', () => {
  const fs = require('fs'); const path = require('path');
  const layout = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'app', '_layout.tsx'), 'utf8');
  expect(layout).toMatch(/if \(!isReady\) return <View style=\{\{ flex: 1, backgroundColor: Colors\.bgSecondary \}\} \/>;/);
});

// ── Build 47 walk findings 1-2 (2026-07-31): equity symbol field + a real bottom Done ──
test('B47 finding 1: the equity editor captures the stock symbol and seeds new rows from a live price', () => {
  useStore.setState({ priceCache: { NVDA: { ticker: 'NVDA', points: [{ date: '2026-07-30', close: 423 }] } } } as any);
  const { RsuEditor } = require('../../onboarding/modules');
  const answers: Record<string, any> = { equityType: 'rsu', equityTicker: 'NVDA' };
  const ctx = { answers, setAnswer: (k: string, v: any) => { answers[k] = v; } };
  const { getByLabelText, getAllByPlaceholderText } = render(<RsuEditor ctx={ctx as any} />);
  expect(getByLabelText('Company stock symbol')).toBeTruthy();
  // typing shares into a fresh row seeds its price from the live NVDA close
  const { fireEvent } = require('@testing-library/react-native');
  fireEvent.changeText(getAllByPlaceholderText('100')[0], '50');
  expect(answers.rsuGrants[0].price).toBe('423');
  expect(answers.rsuGrants[0].shares).toBe('50');
});

test('B47 finding 2: the editor modal has a real bottom Done (the top link was invisible from a long form)', () => {
  const fs = require('fs'); const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'IncomeManagerScreen.tsx'), 'utf8');
  expect(src).toMatch(/richDoneBtn/);
  expect(src).toMatch(/Your changes save as you type — Done just closes\./);
  expect(src).toMatch(/minHeight: 48/);
});

// B47 finding 4: deleting a holding must exit silently — the deletion worked but the not-found
// screen flashed as an "error" during the back transition.
test('B47 finding 4: the delete path leaves quietly (leaving-guard before the not-found branch)', () => {
  const fs = require('fs'); const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'HoldingDetailScreen.tsx'), 'utf8');
  expect(src).toMatch(/if \(leaving\) return null;/);
  expect(src.indexOf('if (leaving) return null;')).toBeLessThan(src.indexOf("This holding isn't here any more"));
  expect(src).toMatch(/setLeaving\(true\); store\.deletePosition/);
});

// B47 finding 8: prices in the activity sheet are cents-precise, and the button matches the sheet.
test('B47 finding 8: activity prices show cents; the button and the sheet share one word', () => {
  const fs = require('fs'); const path = require('path');
  const perf = fs.readFileSync(path.join(__dirname, '..', 'PerformanceScreen.tsx'), 'utf8');
  expect(perf).toMatch(/@ \$\{money2\(t\.price\)\}/);
  const hd = fs.readFileSync(path.join(__dirname, '..', 'HoldingDetailScreen.tsx'), 'utf8');
  expect(hd).toMatch(/>Activity<\/Text>/);
  expect(hd).not.toMatch(/>History<\/Text>/);
});

// B47 finding 7 (APPROVED): the class slice lands on the class-only view; whole account one tap away.
test('B47 finding 7: arriving with ?class= renders the class-only view with the summed holdings', () => {
  useStore.setState({
    assetAccounts: [{
      asset_id: 'vg1', label: 'Vanguard Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE',
      balance: 150000, source: 'connected', last_synced: new Date().toISOString(), cash_balance: 18000,
      positions: [
        { position_id: 'p1', ticker: 'VTI', label: 'Vanguard Total Market', kind: 'stocks_etf', last_price: 250, lots: [{ lot_id: 'l1', shares: 400, cost_per_share: 200, purchase_date: '2024-01-02' }] },
        { position_id: 'p2', ticker: 'CUSIP9', label: 'KEYBANK NA 4.00% CD', kind: 'fixed_income', asset_class: 'bond', last_price: 100, lots: [{ lot_id: 'l2', shares: 320, cost_per_share: 100, purchase_date: '2024-01-02' }] },
      ],
    }],
  } as any);
  mockParams = { id: 'vg1', class: 'stocks_etf' };
  const AccountDetailScreen = require('../AccountDetailScreen').default;
  render(<AccountDetailScreen />);
  expect(screen.getByText(/IN THIS ACCOUNT/)).toBeOnTheScreen();
  expect(screen.getByText(/part of Vanguard Brokerage/)).toBeOnTheScreen();
  expect(screen.getByText('See the whole account ›')).toBeOnTheScreen();
  expect(screen.getByText(/VTI · 400 shares/)).toBeOnTheScreen();          // the stocks row (ticker naming)
  expect(screen.queryByText(/CUSIP9/)).toBeNull();                          // the CD stays out of the stocks view
  // and the NW slice passes the class for split accounts
  const fs = require('fs'); const path = require('path');
  expect(fs.readFileSync(path.join(__dirname, '..', 'NetWorthScreen.tsx'), 'utf8')).toMatch(/&class=\$\{r\.key\}/);
});

// B47 finding 10: ONE add-income entry on the Cash-flow Income tab — no meta-explanations, the
// chooser's labels carry the meaning; vesting/rental/self deep-link into their editors.
test('B47 finding 10: one Add income entry, zero explanatory sentences, deep-linked chooser', () => {
  const fs = require('fs'); const path = require('path');
  const cf = fs.readFileSync(path.join(__dirname, '..', 'CashFlowScreen.tsx'), 'utf8');
  expect(cf).toMatch(/＋ Add income ›/);
  expect(cf).not.toMatch(/＋ Add or set up income/);
  expect(cf).not.toMatch(/Asks whether your pay is the same every month or varies/);
  expect(cf).not.toMatch(/Pay from stock vesting or a rental\? Open Income/);
  expect(cf).toMatch(/income-manager\?open=equity/);
  const im = fs.readFileSync(path.join(__dirname, '..', 'IncomeManagerScreen.tsx'), 'utf8');
  expect(im).toMatch(/openParam === 'equity'\) setRich\('equity'\)/);
});

// ── B47 finding 11 (founder "approved.", 2026-07-31): ONE debt editor, shaped by repayment ──
// mock debt-editor-v1-2026-07-31: installment = real payment ↔ paid-off-by (either computed);
// cards keep min + you-pay; due-in-full = amount + date, landing as a dated big-ticket.
describe('B47 finding 11 — the one repayment-shaped debt editor', () => {
  const fs = require('fs'); const path = require('path');
  const src = (f: string) => fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8');

  test('Net worth AND Cash flow both mount the SAME DebtEditorSheet — the drifted forms are gone', () => {
    for (const f of ['screens/NetWorthScreen.tsx', 'screens/BudgetScreen.tsx']) {
      expect(src(f)).toMatch(/<DebtEditorSheet state=\{debtSheet\}/);
    }
    // neither screen keeps a private debt form (fields must not drift again)
    expect(src('screens/NetWorthScreen.tsx')).not.toMatch(/function DebtSheet/);
    expect(src('screens/BudgetScreen.tsx')).not.toMatch(/Min payment \(\$\)/);
  });

  test('the editor asks "How is it repaid?" with all three shapes', () => {
    const { fireEvent } = require('@testing-library/react-native');
    const { DebtEditorSheet } = require('../../components/DebtEditorSheet');
    render(<DebtEditorSheet state={{ open: true }} onClose={() => {}} />);
    expect(screen.getByText('How is it repaid?')).toBeOnTheScreen();
    for (const s of ['Monthly payments', 'Card / revolving', 'Due in full']) {
      expect(screen.getByText(s)).toBeOnTheScreen();
    }
    // picking Mortgage flips the default shape to installment → the two-way fields appear
    fireEvent.press(screen.getByLabelText('Mortgage'));
    expect(screen.getByText('Monthly payment (what you pay)')).toBeOnTheScreen();
    expect(screen.getByText('Or: paid off by')).toBeOnTheScreen();
    expect(screen.queryByText('Min payment /mo')).toBeNull();    // no fake "minimum" on a mortgage
  });

  test('installment: entering the payment computes the paid-off-by date (and saves BOTH)', () => {
    const { fireEvent } = require('@testing-library/react-native');
    const { DebtEditorSheet } = require('../../components/DebtEditorSheet');
    render(<DebtEditorSheet state={{ open: true }} onClose={() => {}} />);
    fireEvent.press(screen.getByLabelText('Mortgage'));
    fireEvent.changeText(screen.getByPlaceholderText('0'), '412000');
    fireEvent.changeText(screen.getByPlaceholderText('6.5'), '6.25');
    fireEvent.changeText(screen.getByPlaceholderText('$0'), '2850');
    expect(screen.getByText(/paid off by .* — computed from your balance, rate and payment/)).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Add debt'));
    const d = (useStore.getState() as any).liabilities.find((x: any) => x.debt_type === 'MORTGAGE');
    expect(d.payment_type).toBe('installment');
    expect(d.monthly_payment).toBe(2850);
    expect(d.minimum_monthly_payment).toBe(2850);                // the real payment IS the obligation
    expect(d.payoff_date).toMatch(/^20(4[5-9])-/);               // ~21 years out
  });

  test('a payment that only covers interest warns "never pays off" instead of lying', () => {
    const { fireEvent } = require('@testing-library/react-native');
    const { DebtEditorSheet } = require('../../components/DebtEditorSheet');
    render(<DebtEditorSheet state={{ open: true }} onClose={() => {}} />);
    fireEvent.press(screen.getByLabelText('Mortgage'));
    fireEvent.changeText(screen.getByPlaceholderText('0'), '100000');
    fireEvent.changeText(screen.getByPlaceholderText('6.5'), '6');
    fireEvent.changeText(screen.getByPlaceholderText('$0'), '400');
    expect(screen.getByText(/doesn't cover the interest — this never pays off/)).toBeOnTheScreen();
  });

  test('due in full: amount + date save with NO monthly payment; the save button gates on the date', () => {
    const { fireEvent } = require('@testing-library/react-native');
    const { DebtEditorSheet } = require('../../components/DebtEditorSheet');
    render(<DebtEditorSheet state={{ open: true }} onClose={() => {}} />);
    fireEvent.press(screen.getByLabelText('Personal loan'));
    fireEvent.press(screen.getByText('Due in full'));
    fireEvent.changeText(screen.getByPlaceholderText('0'), '15000');
    fireEvent.press(screen.getByLabelText('Add debt'));          // no date yet → must NOT save
    expect((useStore.getState() as any).liabilities.filter((x: any) => x.debt_type === 'PERSONAL')).toHaveLength(0);
    fireEvent.changeText(screen.getByPlaceholderText('12/2026'), '12/2026');
    expect(screen.getByText(/big-ticket in December 2026's cash flow and on the bill calendar/)).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Add debt'));
    const d = (useStore.getState() as any).liabilities.find((x: any) => x.debt_type === 'PERSONAL');
    expect(d.payment_type).toBe('due_in_full');
    expect(d.minimum_monthly_payment).toBe(0);                   // a lump is not a monthly bill
    expect(d.payoff_date).toBe('2026-12-01');
  });

  test('cards keep the familiar fields — min payment AND you-pay', () => {
    const { DebtEditorSheet } = require('../../components/DebtEditorSheet');
    render(<DebtEditorSheet state={{ open: true }} onClose={() => {}} />);   // default kind = card
    expect(screen.getByText('Min payment /mo')).toBeOnTheScreen();
    expect(screen.getByText('You pay /mo')).toBeOnTheScreen();
  });
});

// ── B47 findings 12+13 (founder device walk, 2026-07-31): scenario sliders + the coasting box ──
describe('B47 finding 12 — scenario sliders ride the ONE drag engine', () => {
  const fs = require('fs'); const path = require('path');
  const src = (f: string) => fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8');

  test('PanResponder.create exists in sliderGesture.ts ONLY — no screen or component rolls its own drag', () => {
    const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e: any) =>
      e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
    const offenders = walk(path.join(__dirname, '..', '..'))
      .filter((f: string) => /\.(ts|tsx)$/.test(f) && !f.includes('__tests__'))
      .filter((f: string) => fs.readFileSync(f, 'utf8').includes('PanResponder.create'))
      .filter((f: string) => !f.endsWith('sliderGesture.ts'));
    expect(offenders).toEqual([]);
  });

  test('the engine carries every device lesson: capture claim, termination refusal, native block, pageX anchor', () => {
    const eng = src('components/sliderGesture.ts');
    expect(eng).toMatch(/onStartShouldSetPanResponderCapture: \(\) => true/);
    expect(eng).toMatch(/onPanResponderTerminationRequest: \(\) => false/);
    expect(eng).toMatch(/onShouldBlockNativeResponder: \(\) => true/);
    expect(eng).toMatch(/pageX - e\.nativeEvent\.locationX/);
  });

  test('the scenario page stands its scrolling down during a drag (the What-if fix, applied here)', () => {
    const rc = src('screens/RetirementCockpit.tsx');
    expect(rc).toMatch(/scrollEnabled=\{!sliding\}/);
    expect(rc).toMatch(/SlidingCtx\.Provider value=\{setSliding\}/);
    expect(rc).toMatch(/useSliderPan/);
    // and What-if keeps its stand-down too — the pair can't drift apart again
    expect(src('screens/WhatIfScreen.tsx')).toMatch(/scrollEnabled=\{!sliding\}/);
  });

  test('cockpit sliders are spoken: adjustable role with increment/decrement by step', () => {
    const rc = src('screens/RetirementCockpit.tsx');
    expect(rc).toMatch(/accessibilityRole="adjustable"/);
    expect(rc).toMatch(/accessibilityActions=\{\[\{ name: 'increment' \}, \{ name: 'decrement' \}\]\}/);
  });
});

describe('B47 finding 13 — the coasting box reads as one honest sentence', () => {
  const seedWorker = (balance: number) => useStore.setState({
    hideBalances: false, onboardingComplete: true,
    onboardingProfile: {
      status: 'employed', incomeSources: ['employment'], name: 'Pat',
      birthYear: String(new Date().getFullYear() - 58),
      baseSalary: '9000', salaryMode: 'gross', salaryFreq: 'monthly',
      taxMode: 'manual', manualTaxRate: '20', monthlySpending: '4500',
      targetRetirementAge: '67', horizonAge: '92',
    },
    assetAccounts: [{ asset_id: 'k', label: '401k', kind: '401k', tax_bucket: 'PRE_TAX', balance }],
  } as any);

  test('small nest egg: "Keep saving" is explained — the money alone does not get there, even by 80', () => {
    seedWorker(162000);
    const RetirementCockpit = require('../RetirementCockpit').default;
    render(<RetirementCockpit />);
    expect(screen.getByText(/alone doesn't get there — even by 80/)).toBeOnTheScreen();
    expect(screen.queryByText(/^on today's/)).toBeNull();        // the old dangling fragment is gone
  });

  test('big nest egg: coasting works and the sentence names the age it works at', () => {
    seedWorker(3000000);
    const RetirementCockpit = require('../RetirementCockpit').default;
    render(<RetirementCockpit />);
    expect(screen.getByText(/Retire \d+/)).toBeOnTheScreen();
    expect(screen.getByText(/alone gets there by \d+/)).toBeOnTheScreen();
  });
});

// ── B47 finding 14 (founder, 2026-08-01): "by type, cash and cash equivalents is called Savings" ──
test('finding 14: Net worth By-type rolls every cash-bucket account under "Cash and cash equivalents"', () => {
  const { fireEvent } = require('@testing-library/react-native');
  useStore.setState({
    hideBalances: false,
    assetAccounts: [
      { asset_id: 's1', label: 'E*TRADE Savings', institution: 'E*TRADE', kind: 'savings', tax_bucket: 'CASH', balance: 20000 },
      { asset_id: 'c1', label: 'Chase Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 3000 },
      { asset_id: 'cd1', label: 'Key Bank CD', institution: 'E*TRADE', kind: 'cd', tax_bucket: 'CASH', balance: 10000 },
      { asset_id: 'b1', label: 'Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 50000 },
    ],
  } as any);
  const NetWorthScreen = require('../NetWorthScreen').default;
  render(<NetWorthScreen />);
  fireEvent.press(screen.getByText('By type'));
  // ONE merged group carrying the accountant's term, with the summed total
  expect(screen.getByText('Cash and cash equivalents')).toBeOnTheScreen();
  expect(screen.getByLabelText(/Cash and cash equivalents, \$33,000, 3 accounts/)).toBeOnTheScreen();
  // no "Savings" / "Checking" / "CD" group headers — the kinds merged (row names still show)
  expect(screen.queryByLabelText(/^Savings, \$/)).toBeNull();
  expect(screen.queryByLabelText(/^Checking, \$/)).toBeNull();
});

// ── Pre-48 audit A3 (PRD F2#2): bonus & one-time income visible and month-editable ──
test('A3: Cash flow sources list shows the bonus WITH its landing month; the chooser offers Bonus / one-time', () => {
  useStore.setState({
    onboardingProfile: { status: 'employed', incomeSources: ['employment'], baseSalary: '8000', salaryMode: 'gross', salaryFreq: 'monthly', taxMode: 'flat', flatRate: '25', monthlySpending: '4000', bonusAnnual: '12000', bonusMonth: 3 },
  } as any);
  const CashFlowScreen = require('../CashFlowScreen').default;
  render(<CashFlowScreen />);
  const fs = require('fs'); const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'CashFlowScreen.tsx'), 'utf8');
  expect(src).toMatch(/Bonus \/ one-time/);                       // the chooser entry exists
  expect(src).toMatch(/income-manager\?open=bonus/);              // and deep-links to the editor
});

test('A3: the bonus editor carries the 12 month chips writing bonusMonth (no more onboarding-only)', () => {
  const fs = require('fs'); const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'IncomeManagerScreen.tsx'), 'utf8');
  expect(src).toMatch(/monthKey=\{editKey === 'bonusAnnual' \? 'bonusMonth' : 'otherMonth'\}/);
  expect(src).toMatch(/Which month does it land\?/);
});

// ── Pre-48 audit C4: the two approved rows the July triage missed, now built ──
test('C4a: a dated goal funded below its needed pace fires the months-behind insight, quantified', () => {
  const { buildInsights } = require('../../domain/insights');
  const hit = buildInsights({ cashMonths: 6, toxicDebt: null, k401Remaining: 0, hasEarnedIncome: true, retireChance: 90,
    cashDragPct: 10, topAccountPct: 20, planPct: 100, beatBy: 0.01, investRate: 0.2,
    goalOffTrack: { label: 'College fund', monthsBehind: 4 } } as any).find((i: any) => i.id === 'goal-offtrack');
  expect(hit.body).toMatch(/^College fund is about 4 months behind at this month's funding pace/);
  expect(hit.theme).toBe('protect');
});

test('C4c: the add-expense sheet carries the three-door escape hatch (bill · account · money in)', () => {
  const fs = require('fs'); const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'components/MoneySheets.tsx'), 'utf8');
  expect(src).toMatch(/Adding something else\? A bill · an account · money in ›/);
  expect(src).toMatch(/bill-calendar|add-account|income-manager/);
});

// ── DESKTOP shell (founder-approved mock shell-home-plan-desktop-v1, 2026-08-03) ──
test('desktop: the web sidebar exists, reads the ONE TAB_META map, and the phone bar is untouched', () => {
  const fs = require('fs'); const path = require('path');
  const side = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'desktop/platform/DesktopSidebar.tsx'), 'utf8');
  expect(side).toMatch(/TAB_META\[tab\]\.title/);                    // one nav map — no drift possible
  expect(side).toMatch(/Sign out/);                                  // shared-computer safety in the foot
  expect(side).toMatch(/Hide balances/);
  const layout = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'app/(tabs)/_layout.tsx'), 'utf8');
  expect(layout).toMatch(/Platform\.OS === 'web'/);                  // web-only branch
  expect(layout).toMatch(/<DesktopSidebar order=\{order\} \/>/);     // lens order carries to desktop
});
