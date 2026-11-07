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
 *
 *  UPDATED 2026-10-30 (CLEANUP-TESTS; checked by hand, line by line): two changes, each under a ruling, and no dollar figure moved.
 *  (1) His precision order Q49 (percents to two decimals; FX-PF, 2026-10-27, src/domain/insights percent2): Home's concentration
 *  notice reads "$300,000 (100.00%)" for the worker and "$400,000 (100.00%)" for the retiree — one account holds all of each
 *  person's invested money, $300,000 ÷ $300,000 and $400,000 ÷ $400,000 — where it read "(100%)". (2) The apostrophe rule DEC-8336
 *  carried to Home and the cockpit: "This month’s cash flow" (spoken, both people), "today’s $320K alone gets there by 72" (worker's
 *  cockpit), "today’s $ · from your setup" (retiree's cockpit) and Home's 401(k) notice "this year’s tax-advantaged room" (worker)
 *  print ’ where they printed '. Every number is unchanged.
 *  UPDATED 2026-10-25 (CF-MMFIX-B; the income drawing check IN-03, rule 9 — an estimate says so): the retiree's Income summary
 *  prints her Social Security after the CALCULATED rate as "≈$2,361" — the row, the total and the band — where it printed
 *  "$2,361". The figure did not move; only the ≈ that says it is the app's estimate. Every other figure is unchanged.
 *  UPDATED 2026-10-23 (CF-FIX; outside re-run of Performance, gap list item 38): Home's cash-flow box says its middle figure as
 *  "expenses and debt paid so far" — it prints the Cash flow tab's Outflow (expenses + debt), the one word for money leaving
 *  (DEC-0269, canon row 3) — where it said "spent so far". Words only, in the spoken label, for both people: every figure
 *  recorded here ($7,200 · $0 · $7,200 and $2,361 · $0 · $2,361) is unchanged.
 *  UPDATED 2026-10-24 (CF-FIX; his DEC-0283): the Income summary shows what it is taxed on being made — under "= Gross /year",
 *  "Your 401(k)s" and "= What it is taxed on" (a READ THIS FIRST row on income-end-to-end_v07). Neither person has a 401(k),
 *  so the new rows read $0 and the gross again ($108,000; $28,800); every figure recorded before is unchanged.
 *  UPDATED 2026-10-24 (CJB, Cash flow journey E2E-78): the Cash flow tab's rows are each one element with a spoken label — "hidden"
 *  under hide-balances, never the dots — so the worker's photograph gains six "[spoken]" lines that repeat figures already printed
 *  ($7,200 in, +$2,700 planned, $0 by hand, +$7,200 so far, ~$2,455 from savings). Spoken labels only: no printed figure moved,
 *  and none was removed.
 *  UPDATED 2026-11-01 (FX-CF-B, R25 — one 'about' mark; checked by hand before re-recording): the retiree's Income summary prints
 *    its calculated figures with '~' where it printed '≈' — the band, the row and '= Inflow' all '~$2,400', the tax '~$0/year' (a real
 *    $0: Social Security under the standard deduction, not a refused wage) — and the band's figure is now said aloud as figure.ts says
 *    '~': '[spoken] about $2,400'. No dollar figure moved: $2,400 and $0 are the same as before.
 *  UPDATED 2026-11-01 (FX-CF-C, R24 — the one percent writer; worked by hand before re-recording):
 *  · Will my money last, worker: "Yearly growth assumed" 7.6% → 7.7%. The blend is (300,000 × 8% + 20,000 × 2.4%) ÷ 320,000 =
 *    24,480 ÷ 320,000 = 7.65% exactly; half up at one decimal is 7.7%. toFixed wrote 7.6 because the computer holds 7.6499…
 *    The retiree's 7.638…% stays 7.6%.
 *  · Net worth, both people: one new "[spoken] $320,000" (worker: 300,000 + 20,000) and "[spoken] $420,000" (retiree: 400,000 +
 *    20,000) on the hero. FX-NW's NW5-09 change (2026-11-01) dropped the hero's second text piece ('  (negative)'), so its text is one
 *    string and HeroAmount speaks it by its own default (walk row 21) — "hidden" under hide-balances. Right: the figure printed is the
 *    figure said. No printed figure moved.
 *  UPDATED 2026-11-06 (his ruling 'all' — the window buttons spelled out; checked by hand before re-recording): Performance's window
 *    buttons read "1 month", "1 year", "2 years" where they read "1M", "1Y", "2Y". The new words name a number of months or years, so
 *    this reader now records them: three new lines at the top of PerformanceScreen, for both people. They are labels, not figures —
 *    no figure moved, none was removed.
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
