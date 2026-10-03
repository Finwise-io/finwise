/** THE FIGURE CENSUS — Orchestrator rule 9 (2026-09-13): every figure rendered on a screen is claimed by one row.
 *
 *  The list of what a person can read must come from the screens themselves, never from reading them by
 *  hand. This test renders every routed screen for three data states — a worker with a spouse, a retiree,
 *  and a brand-new account — and records, in order, every visible string and every spoken label. The map
 *  builder (build-orchestrator-map.py) matches that record against the master's figure rows and lists what
 *  no row claims. The record is written to the scripts folder like the function categories: an input the
 *  build reads, generated, never typed.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as fs from 'fs';
import * as path from 'path';
import { useStore } from '../store/useStore';
import { figuresPrinted, resetFiguresPrinted } from '../components/figure';
import { employedPartner, retiree75 } from '../testing/personas';

jest.mock('../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
const PARAMS: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => PARAMS,
  useFocusEffect: (cb: () => void) => { const React = require('react'); React.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link: ({ children }: any) => children,
}));

/** THE CALL-SITE RECORD — the accurate half of the census.
 *
 *  Every dollar figure in the app is printed by one of three functions at the bottom of the money
 *  module. Wrapping them during the render records WHERE each figure was printed: the file and line
 *  of the code that printed it. A place in the code that prints a figure is ONE figure, however many
 *  times it renders — so the bill calendar's twelve month rows are one figure, not twelve, and the
 *  record is read from the code rather than guessed from the words on screen.
 */
const CALLSITES = new Map<string, { values: Set<string>; states: Set<string>; count: number }>();
const FORMATTER = /_shared\/(money|num)|components\/useMoney|__tests__/;   // the formatters themselves, and this file
function callSite(): string {
  const stack = String(new Error().stack).split('\n').slice(2);
  for (const line of stack) {
    if (FORMATTER.test(line)) continue;
    const m = line.match(/((?:src\/(?:screens|components|onboarding|domain|hooks)|app|MoneyKeel)\/[A-Za-z0-9_.\/-]+\.tsx?):(\d+)/);
    if (m) return `${m[1]}:${m[2]}`;
  }
  return 'unknown';
}
let CURRENT_STATE = '';
{
  const mod: any = require('../domain/_shared/money');
  for (const name of ['formatMoney', 'formatMoneyCents', 'moneyCompact']) {
    const orig = mod[name];
    if (typeof orig !== 'function') continue;
    Object.defineProperty(mod, name, { configurable: true, writable: true, value: (...a: any[]) => {
      const out = orig(...a);
      const site = callSite();
      const rec = CALLSITES.get(site) ?? { values: new Set<string>(), states: new Set<string>(), count: 0 };
      rec.values.add(String(out)); rec.states.add(CURRENT_STATE); rec.count += 1;
      CALLSITES.set(site, rec);
      return out;
    } });
  }
}
/** The line of code at a call site, and the component it sits in — so a row proposal carries its evidence. */
const SRC = new Map<string, string[]>();
function sourceAt(site: string): { line: string; inside: string } {
  const [file, no] = [site.slice(0, site.lastIndexOf(':')), Number(site.slice(site.lastIndexOf(':') + 1))];
  let lines = SRC.get(file);
  if (!lines) { try { lines = fs.readFileSync(path.join(process.cwd(), file), 'utf8').split('\n'); } catch { lines = []; } SRC.set(file, lines); }
  const line = (lines[no - 1] ?? '').trim().slice(0, 200);
  let inside = '';
  for (let i = no - 1; i >= 0; i--) {
    const m = (lines[i] ?? '').match(/^(?:export\s+)?(?:default\s+)?function\s+([A-Za-z0-9_]+)|^(?:export\s+)?const\s+([A-Za-z0-9_]+)\s*[:=].*(?:=>|function)/);
    if (m) { inside = m[1] || m[2]; break; }
  }
  return { line, inside };
}

const OUT = 'Calculation Module code/scripts/moneykeel_figure_census.json';
/** route → screen file, read from app/ on 2026-09-13 (auth, onboarding, connect and add-account excluded: forms and sign-in, no figures). */
const ROUTES: [string, string][] = [
  ['/home', 'HomeScreen'], ['/analytics', 'NetWorthScreen'], ['/invest', 'PerformanceScreen'], ['/plan', 'PlanHubScreen'], ['/cashflow', 'CashFlowScreen'],
  ['/goals', 'GoalsScreen'], ['/retirement', 'RetirementCockpit'], ['/rewards', 'RewardsScreen'], ['/settings', 'SettingsScreen'], ['/tips', 'TipsScreen'],
  ['/account-detail', 'AccountPortfolioScreen'], ['/big-costs', 'BigCostsScreen'], ['/bill-calendar', 'BillCalendarScreen'], ['/bonds', 'BondsScreen'],
  ['/contribution-room', 'ContributionRoomScreen'], ['/credit', 'CreditScreen'], ['/education', 'EducationScreen'], ['/estate', 'EstateScreen'],
  ['/expense', 'ExpenseScreen'], ['/first-run', 'FirstRunScreen'], ['/holding-detail', 'HoldingDetailScreen'], ['/import-holdings', 'ImportHoldingsScreen'],
  ['/income-detail', 'IncomeDetailScreen'], ['/income-manager', 'IncomeManagerScreen'], ['/income', 'IncomeScreen'], ['/insights', 'InsightsScreen'],
  ['/insurance', 'InsuranceScreen'], ['/itemize', 'ItemizeScreen'], ['/jobsafety', 'JobSafetyScreen'], ['/look-back', 'LookBackScreen'],
  ['/monthly-income', 'MonthlyIncomeScreen'], ['/multi-goal', 'MultiGoalScreen'], ['/other-investments', 'OtherInvestmentsScreen'],
  ['/required-withdrawals', 'RequiredWithdrawalsScreen'], ['/roth', 'RothScreen'], ['/sharpen', 'SharpenPlanScreen'],
  ['/ss-timing', 'SsTimingScreen'], ['/stress-test', 'StressTestScreen'], ['/tax-organizer', 'TaxOrganizerScreen'], ['/what-if', 'WhatIfScreen'],
  ['/will-it-last', 'WillItLastScreen'], ['/worth-a-look', 'WorthALookScreen'], ['/income-summary', 'IncomeSummaryScreen'], ['/base-pay', 'BasePayScreen'],
];

/** The rich state: a worker whose accounts carry a holding with lots, a bond, an IRA and a debt — so the holding, bond and debt rows can be seen. */
const RICH_ACCOUNTS = [
  { asset_id: 'van', label: 'Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 300000, target_return: 0.07, source: 'connected', last_synced: '2026-09-12T12:00:00.000Z',
    positions: [{ position_id: 'p1', ticker: 'VTI', name: 'VANGUARD TOTAL STOCK MARKET ETF', asset_class: 'stock_etf', last_price: 100, price: 100, shares: 3000, lots: [{ lot_id: 'l1', shares: 3000, cost_per_share: 90, purchase_date: '2024-01-02' }] }] },
  { asset_id: 'sav', label: 'Ally Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 20000, target_return: 0.01 },
  { asset_id: 'ira', label: 'Traditional IRA', institution: 'Fidelity', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 400000, target_return: 0.06 },
  { asset_id: 'bnd', label: 'Treasury note', institution: 'TreasuryDirect', kind: 'bond', asset_class: 'bonds', tax_bucket: 'TAXABLE', balance: 9800, face_value: 10000, coupon_rate: 0.04, maturity_date: '2031-05-15', purchase_date: '2024-05-15', target_return: 0.04 },
];
const RICH_DEBTS = [{ debt_id: 'd1', label: 'Chase Sapphire', institution: 'Chase', debt_type: 'credit_card', remaining_balance: 4200, interest_rate_apr: 0.24, minimum_monthly_payment: 120, monthly_payment: 300, due_day: 15, credit_limit: 12000 },
  { debt_id: 'd2', label: 'Mortgage', institution: 'Wells Fargo', debt_type: 'mortgage', remaining_balance: 280000, interest_rate_apr: 0.0625, minimum_monthly_payment: 1900, monthly_payment: 1900, due_day: 1, payoff_date: '2051-06-01' }];
function seed(state: string) {
  const s = useStore.getState(); s.resetAll();
  if (state === 'new') return;
  const p = state === 'retiree' ? retiree75 : employedPartner;
  s.setOnboardingProfile(p as any); s.setOnboardingComplete(true); s.seedNetWorth(p as any);
  if (state === 'worker') {
    s.addExpense({ amount: 120, category: 'Groceries', store: 'Costco', date: '2026-06-05' });
    s.addExpense({ amount: 60, category: 'Dining', store: 'Thai place', date: '2026-06-08' });
  }
  if (state === 'rich') useStore.setState({ assetAccounts: RICH_ACCOUNTS, liabilities: RICH_DEBTS, nwSeeded: true, nwSetupChoice: 'self', bigCosts: [{ id: 'b1', label: 'New roof', amount: 25000, year: 2028 }] } as any);
  useStore.setState({ hideBalances: false } as any);
}
function paramsFor(route: string) {
  for (const k of Object.keys(PARAMS)) delete PARAMS[k];
  const st = useStore.getState() as any;
  const acct = (st.assetAccounts ?? [])[0];
  if (route === '/account-detail' && acct) PARAMS.id = acct.asset_id;
  if (route === '/itemize' && acct) PARAMS.accountId = acct.asset_id;
  if (route === '/holding-detail') { const a = (st.assetAccounts ?? []).find((x: any) => x.positions?.length); if (a) { PARAMS.account = a.asset_id; PARAMS.position = a.positions[0].position_id; } }
}
/** Every string a person could read or hear, in render order. */
function strings(): { k: 't' | 'a'; s: string }[] {
  const out: { k: 't' | 'a'; s: string }[] = [];
  const walk = (n: any) => {
    if (n == null) return;
    if (typeof n === 'string') { const t = n.replace(/\s+/g, ' ').trim(); if (t) out.push({ k: 't', s: t }); return; }
    if (n.props?.accessibilityLabel) out.push({ k: 'a', s: String(n.props.accessibilityLabel).replace(/\s+/g, ' ').trim() });
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
}

/** In-screen sections a person reaches by a tap: a button whose spoken label ends in " tab", or one of these chip words. */
const CHIP = new Set(['Income', 'Expenses', 'Debts', 'This month', 'By institution', 'By type', 'By class', 'Institution', 'Type', 'Class', 'All', 'Top', 'By account', 'Chart', 'Table', 'All accounts', 'Each account']);
function textOf(n: any): string { return typeof n === 'string' ? n : n?.children ? n.children.map(textOf).join('') : ''; }
function sectionButtons(): { label: string; node: any }[] {
  const out: { label: string; node: any }[] = [];
  let nodes: any[] = [];
  try { nodes = screen.getAllByRole('button'); } catch { nodes = []; }
  for (const n of nodes) {
    const a = String(n.props?.accessibilityLabel ?? '');
    const txt = textOf(n).trim();
    if (/ tab$/.test(a)) out.push({ label: a.replace(/ tab$/, ''), node: n });
    else if (CHIP.has(txt)) out.push({ label: txt, node: n });
  }
  return out;
}
/** The names a person entered — so the map can fold "Ally Savings $20,000" and "Brokerage $300,000" into one figure. */
function entities(): string[] {
  const st = useStore.getState() as any; const out = new Set<string>();
  for (const a of st.assetAccounts ?? []) { if (a.label) out.add(a.label); if (a.institution) out.add(a.institution); for (const p of a.positions ?? []) { if (p.ticker) out.add(p.ticker); if (p.name) out.add(p.name); } }
  for (const d of st.liabilities ?? []) { if (d.label) out.add(d.label); if (d.institution) out.add(d.institution); }
  for (const g of st.goals ?? []) if (g.name ?? g.label) out.add(g.name ?? g.label);
  for (const b of st.bigCosts ?? []) if (b.label) out.add(b.label);
  return [...out].filter((x) => x.length >= 3);
}
function capture(route: string, file: string, state: string, rec: any) {
  CURRENT_STATE = `${route}|${state}`;
  const C = require(`../screens/${file}`).default;
  resetFiguresPrinted();
  render(<C />);
  rec[state] = strings();
  // the figures this screen printed BY IDENTIFIER (rule 11) — read from the code, not from the words
  const ids = [...new Set(figuresPrinted().map((f) => f.id))].sort();
  if (ids.length) (DECLARED_SEEN[route] ??= {})[state] = ids;
  const labels = sectionButtons().map((b) => b.label);
  screen.unmount();
  // every in-screen section, from a fresh render each time
  for (const label of labels) {
    seed(state); paramsFor(route);
    render(<C />);
    const b = sectionButtons().find((x) => x.label === label);
    if (b) { try { fireEvent.press(b.node); rec[`${state}|${label}`] = strings(); } catch { /* a section that will not open in a test is skipped */ } }
    screen.unmount();
  }
}

const DECLARED_SEEN: Record<string, Record<string, string[]>> = {};
const census: any = { generated: new Date().toISOString().slice(0, 10), states: ['worker', 'rich', 'retiree', 'new'], entities: {}, screens: {} };
describe.each(['worker', 'rich', 'retiree', 'new'])('census — %s', (state) => {
  test.each(ROUTES)('%s', (route, file) => {
    seed(state); paramsFor(route);
    census.entities[state] = entities();
    const rec = (census.screens[route] ??= { file: `src/screens/${file}.tsx` });
    try {
      capture(route, file, state, rec);
      // the account page, once per account, so bond, IRA and brokerage rows can all be seen
      if (route === '/account-detail' && state === 'rich') {
        for (const a of (useStore.getState() as any).assetAccounts ?? []) {
          seed(state); for (const k of Object.keys(PARAMS)) delete PARAMS[k]; PARAMS.id = a.asset_id;
          const C = require(`../screens/${file}`).default; render(<C />); rec[`${state}|account:${a.kind}`] = strings(); screen.unmount();
        }
      }
    } catch (e: any) {
      try { screen.unmount(); } catch { /* nothing mounted */ }
      rec[state] = [{ k: 't', s: `RENDER FAILED: ${String(e?.message ?? e).slice(0, 160)}` }];
    }
    expect(rec[state].length).toBeGreaterThan(0);
  });
});
afterAll(() => {
  census.declared = DECLARED_SEEN;
  census.callsites = [...CALLSITES.entries()].sort().map(([site, r]) => {
    const { line, inside } = sourceAt(site);
    const routes = [...new Set([...r.states].map((s) => s.split('|')[0]))].sort();
    return { site, routes, states: [...r.states].sort(), inside, line, values: [...r.values].slice(0, 8), renders: r.count };
  });
  fs.writeFileSync(OUT, JSON.stringify(census, null, 1));
});
