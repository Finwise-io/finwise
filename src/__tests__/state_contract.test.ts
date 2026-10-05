// The state-contract meta-pin (docs/FCC-core-55-70/FCC-state-contract.md — BINDING).
// Pins the contract's load-bearing helpers and thresholds by NAME, so a change that would
// silently weaken the contract fails here and points at the document.
import * as fs from 'fs';
import * as path from 'path';
import { priceFreshness } from '../services/marketData';
import { connectionFreshness } from '../services/sync';
import { valueFreshness } from '../domain/assets';
import { money } from '../domain/_shared/num';

describe('state contract (FCC-state-contract.md)', () => {
  test('rule 2 — the three staleness clocks hold their thresholds', () => {
    // connections: stale AFTER 3 days, in words
    const days = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
    expect(connectionFreshness(days(2))!.stale).toBe(false);
    expect(connectionFreshness(days(4))!.stale).toBe(true);
    expect(connectionFreshness(days(9))!.label).toBe('9 days old');
    expect(connectionFreshness(null)).toBeNull();                       // manual rows never flagged

    // manual values: the 6-month nudge
    const monthsAgo = (n: number) => {
      const d = new Date(); d.setMonth(d.getMonth() - n);
      return d.toISOString().slice(0, 10);
    };
    expect(valueFreshness({ value_as_of: monthsAgo(2) } as any)?.stale).toBe(false);
    expect(valueFreshness({ value_as_of: monthsAgo(7) } as any)?.stale).toBe(true);

    // prices: stale wording exists and flips
    expect(priceFreshness(new Date().toISOString(), Date.now()).stale).toBe(false);
    expect(priceFreshness(days(6), Date.now()).stale).toBe(true);
  });

  test('rule 3 — money() stays PURE (masking lives at the component layer, one concept)', () => {
    // the pure formatter must never mask on its own — maskedMoney wraps it with store state
    expect(money(1234)).toBe('$1,234');
  });

  test('rule 3 — the runtime mask walk covers all four money tabs', () => {
    const src = fs.readFileSync(path.join(__dirname, '../screens/__tests__/fcc_agreement.test.tsx'), 'utf8');
    for (const name of ['Home', 'CashFlow', 'PlanHub', 'NetWorth']) {
      expect(src.includes(`'${name}'`)).toBe(true);                     // dropping a screen from the walk fails HERE
    }
  });

  test('AUDIT r94 — success-chance units are 0-100 percent END TO END (never a 100x display bug)', () => {
    const { simulate } = require('../domain/retirement');
    const { selectWillItLast } = require('../domain/retirement/willItLast');
    const r = simulate({
      current_age: 60, retire_age: 67, horizon_age: 92, start_balance: 500000,
      annual_contribution: 12000, contribution_growth: 0, retire_monthly_spend_today: 4500,
      guaranteed_monthly_income: 2000, guaranteed_start_age: 67, mean_return: 0.055,
      vol_return: 0.11, inflation: 0.025, seed: 42, paths: 200,
    });
    // exact odds (founder 2026-09-14): a share of 1,000 futures — a tenth at most, never a 100x value
    expect(Number.isInteger(Math.round(r.chance_of_success * 10 * 1e6) / 1e6)).toBe(true);
    expect(r.chance_of_success).toBeGreaterThanOrEqual(0);
    expect(r.chance_of_success).toBeLessThanOrEqual(100);
    const wil = selectWillItLast({
      op: { status: 'employed', birthYear: String(new Date().getFullYear() - 60), baseSalary: '9000', salaryMode: 'gross', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '20', monthlySpending: '4500', targetRetirementAge: '67', horizonAge: '92' },
      accounts: [{ asset_id: 'k', label: '401k', kind: '401k', tax_bucket: 'PRE_TAX', balance: 500000 }],
      assumptions: {}, inflationRate: 2.5, employmentStatus: null,
    });
    if (wil.chance != null) { expect(wil.chance).toBeGreaterThanOrEqual(0); expect(wil.chance).toBeLessThanOrEqual(100); }
  });

  test('AUDIT r14/F2#16 — a lumpy bonus lands in the SAME month on BOTH grids (the drift is dead)', () => {
    const { incomeFromOnboarding, buildIncomeState, incomeMonthlyGrid } = require('../domain/income');
    const op = { status: 'employed', baseSalary: '6000', salaryMode: 'gross', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '20', bonusAnnual: '12000', bonusMonth: 3 };
    const doc = incomeFromOnboarding('u1', op as any);
    const state = buildIncomeState('u1', doc.sources, doc.tax);
    const onboardingGrid = incomeMonthlyGrid(op as any, 'gross');
    // March carries the bonus on BOTH; December carries it on NEITHER
    expect(state.monthly_cash_flow_grid[2].gross).toBeGreaterThan(state.monthly_cash_flow_grid[11].gross);
    expect(onboardingGrid[2].amount).toBeGreaterThan(onboardingGrid[11].amount);
    expect(Math.round(state.monthly_cash_flow_grid[2].gross)).toBe(Math.round(onboardingGrid[2].amount));
  });

  test('PRD F9#12 — the RMD tax drag is real in BOTH drawdown models (and off when no pre-tax)', () => {
    const { simulate } = require('../domain/retirement');
    const { depletionAge, rmdStartAgeFor } = require('../domain/decumulation');
    const base = {
      current_age: 70, retire_age: 70, horizon_age: 95, start_balance: 800000,
      annual_contribution: 0, contribution_growth: 0, retire_monthly_spend_today: 5200,
      guaranteed_monthly_income: 2500, guaranteed_start_age: 67, mean_return: 0.05,
      vol_return: 0.1, inflation: 0.025, seed: 42, paths: 300,
    };
    const noDrag = simulate(base as any).chance_of_success;
    const withDrag = simulate({ ...base, pre_tax_share: 0.8, rmd_tax_rate: 0.24 } as any).chance_of_success;
    expect(withDrag).toBeLessThanOrEqual(noDrag);                 // forced taxes never HELP the odds
    const dBase = { age: 74, horizon: 95, nestEgg: 600000, netWithdrawalNow: 30000, returnRate: 0.03, inflation: 0.025 };
    const dNo = depletionAge(dBase);
    const dDrag = depletionAge({ ...dBase, preTaxShare: 0.8, rmdTaxRate: 0.24 });
    expect((dDrag ?? 200)).toBeLessThanOrEqual(dNo ?? 200);       // and never extend the money
    // B4: the mirror is GONE — one dated, sourced table in the Calculation Module; the domain
    // adapter and the simulation both read it, so agreement holds by construction.
    const { rmdDivisorAtAge } = require('../domain/decumulation');
    const rmdTable = require('../../Calculation Module code/engines/rmd');
    expect(rmdStartAgeFor(74, 2026)).toBe(73);                       // born ~1952
    expect(rmdStartAgeFor(60, 2026)).toBe(75);                       // born ~1966 (SECURE 2.0 §107)
    expect(Math.abs(rmdDivisorAtAge(75) - rmdTable.UNIFORM_LIFETIME[75])).toBeLessThan(0.01);
  });

  test('PRD F2#11, as his later rulings left it — ONE rate every month, the year exact, the 401(k) before tax', () => {
    // WHAT CHANGED, 2026-10-04. F2#11 laid a calculated rate on the months by filling the tax bands as the
    // year went on: a steady $6,000 salary showed no tax in January and the top band in December. No
    // payslip does that, the base-pay card showed a level "≈/month" beside it, and the Income summary's
    // rows stopped adding up. His rulings since: the rate is used "everywhere your take-home matters —
    // cash flow, budget, the surplus" (G46, 2026-08-28), and a 401(k) comes off before tax (B05).
    const { progressiveMonthlyTax, taxOwedFor } = require('../domain/income/tax');
    const { monthlyTaxRates, incomeMonthlyGrid } = require('../domain/income');
    // the band-filling function itself still sums to the year TO THE CENT (the stored income record uses it)
    const lumpy = [6000, 6000, 36000, 6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000];
    const tax = progressiveMonthlyTax(lumpy);
    expect(Math.abs(tax.reduce((a: number, b: number) => a + b, 0) - taxOwedFor(lumpy.reduce((a, b) => a + b, 0)))).toBeLessThan(0.01);
    // calculated or typed, the rate is one number in all twelve months
    const est = { status: 'employed', baseSalary: '6000', salaryMode: 'gross', salaryFreq: 'monthly', c_401k: '500', bonusAnnual: '30000', bonusMonth: 3 };
    for (const op of [est, { ...est, taxMode: 'manual', manualTaxRate: '20' }]) {
      expect(new Set(monthlyTaxRates(op as any).map((r: number) => Math.round(r * 1e6))).size).toBe(1);
    }
    expect(monthlyTaxRates({ ...est, taxMode: 'manual', manualTaxRate: '20' } as any)[0]).toBeCloseTo(0.2);
    // the year's tax in the grid is the schedule's tax on what is left after the 401(k) — exactly
    const gross = incomeMonthlyGrid(est as any, 'gross').reduce((t: number, m: any) => t + m.amount, 0);
    const net = incomeMonthlyGrid(est as any, 'net').reduce((t: number, m: any) => t + m.amount, 0);
    expect(gross).toBeCloseTo(6000 * 12 + 30000, 6);
    expect(gross - net).toBeCloseTo(taxOwedFor(6000 * 12 + 30000 - 500 * 12), 6);
    // eleven equal months, and the bonus in its own month
    const lands = incomeMonthlyGrid(est as any, 'available').map((m: any) => m.amount);
    expect(new Set(lands.filter((_: number, i: number) => i !== 2).map((x: number) => Math.round(x * 100))).size).toBe(1);
    expect(lands[2]).toBeGreaterThan(lands[1] + 20000);
  });

  test('PRD F9#14/F3#17 — filing status + state rate tune EVERY tax estimate from two answers', () => {
    const { taxOwedFor, ltcgRateFor, marginalBracketFor, TAX_TABLES } = require('../domain/income/tax');
    const { userCapGainsRates, monthlyTaxRates } = require('../domain/income');
    // the tables behave like the IRS's: married pays less than single on the same gross; HoH between
    expect(TAX_TABLES.married.deduction).toBe(TAX_TABLES.single.deduction * 2);
    expect(taxOwedFor(120000, 'married')).toBeLessThan(taxOwedFor(120000, 'single'));
    expect(taxOwedFor(120000, 'hoh')).toBeLessThan(taxOwedFor(120000, 'single'));
    expect(taxOwedFor(120000, 'hoh')).toBeGreaterThan(taxOwedFor(120000, 'married'));
    // the state rate is a flat add-on ON TAXABLE INCOME (E10, 2026-08-20) — the deduction is
    // never taxed: 5% × (100,000 − 16,100) = 4,195
    expect(taxOwedFor(100000, 'single', 0.05) - taxOwedFor(100000, 'single', 0)).toBeCloseTo(4195, 0);
    // capital gains: the 0/15/20 ladder moves with income AND status
    expect(ltcgRateFor(40000, 'single')).toBe(0);
    expect(ltcgRateFor(120000, 'single')).toBe(0.15);
    expect(ltcgRateFor(120000, 'married')).toBe(0);        // \$120k gross married = taxable \$87.8k ≤ the \$98.9k 0% band
    expect(ltcgRateFor(160000, 'married')).toBe(0.15);      // …and above the band the 15% kicks in
    expect(ltcgRateFor(700000, 'single')).toBe(0.20);
    // the op-level rates: a married filer with a state rate gets THEIR numbers, not 15/24 flat
    const op = { status: 'employed', baseSalary: '10000', salaryMode: 'gross', salaryFreq: 'monthly', filingStatus: 'married', stateTaxRate: '5' };
    const r = userCapGainsRates(op as any);
    expect(r.lt).toBeCloseTo(0 + 0.05, 5);                  // married at this income: 0% federal LTCG + the state rate
    expect(r.st).toBeCloseTo(marginalBracketFor(120000, 'married') + 0.05, 5);
    // and the withholding vector shifts with status (married withholds less per month)
    const single = monthlyTaxRates({ ...op, filingStatus: 'single' } as any);
    const married = monthlyTaxRates(op as any);
    expect(married[5]).toBeLessThan(single[5]);
  });

  test('PRD F10#16 — a dismissed nudge stays hidden until its date, persists in the store, and expiry re-shows it', () => {
    const { useStore } = require('../store/useStore');
    useStore.getState().resetAll();
    const future = new Date(Date.now() + 7 * 86400000).toISOString();
    const past = new Date(Date.now() - 1 * 86400000).toISOString();
    useStore.getState().dismissInsight('concentration', future);
    expect(useStore.getState().dismissedInsights['concentration']).toBe(future);   // persisted store state
    // the ONE filter rule the hook applies:
    const hiddenUntil = useStore.getState().dismissedInsights as Record<string, string>;
    const nowIso = new Date().toISOString();
    const notDismissed = (i: { id: string }) => i.id === 'worth-a-look' || !hiddenUntil[i.id] || hiddenUntil[i.id] <= nowIso;
    expect(notDismissed({ id: 'concentration' })).toBe(false);                     // hidden while snoozed
    expect(notDismissed({ id: 'worth-a-look' })).toBe(true);                   // exempt — has its own resolution
    useStore.getState().dismissInsight('concentration', past);
    const hidden2 = useStore.getState().dismissedInsights as Record<string, string>;
    expect(hidden2['concentration'] <= nowIso).toBe(true);                         // expired → shows again
  });

  test('UX Type r7 — every FCC-mandated glossary term exists with plain-English body', () => {
    const { GLOSSARY } = require('../domain/glossary');
    for (const term of ['safeDraw', 'guaranteedIncome', 'rateSensitivity', 'provenance', 'estimate', 'timeWeighted', 'capitalGains', 'rmd']) {
      expect(GLOSSARY[term]?.title?.length).toBeGreaterThan(2);
      expect(GLOSSARY[term]?.body?.length).toBeGreaterThan(40);
      expect(GLOSSARY[term].body).not.toMatch(/\b(HYSA|TTM|SWR)\b/);   // no bare acronyms in the definitions
    }
  });

  test('the contract document itself stays present and BINDING', () => {
    const doc = fs.readFileSync(path.join(__dirname, '../../docs/FCC-core-55-70/FCC-state-contract.md'), 'utf8');
    expect(doc).toMatch(/Status: BINDING/);
    expect(doc).toMatch(/never leaves your device|zero dollar signs/i);
  });
});

// ── Track 1 step 6: the snapshot store — beginning values are READ, never back-solved ──
describe('the daily snapshot record', () => {
  const { useStore } = require('../store/useStore');
  test('the once-a-day write records the FULL day, and a same-day rewrite supersedes it', () => {
    useStore.setState({
      assetAccounts: [{
        asset_id: 'vg', source: 'connected', balance: 100000, cash_balance: 500,
        positions: [{ position_id: 'p1', ticker: 'VTI', last_price: 250, lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 200, purchase_date: '2024-01-01' }] }],
      }] as any,
    });
    useStore.getState().captureDailyNw('2026-08-20', 100000, 100000);
    let days = (useStore.getState() as any).snapshotDays;
    expect(days).toHaveLength(1);
    expect(days[0].holdings[0]).toMatchObject({ securityKey: 'VTI', units: 100, price: 250, value: 25000 });
    expect(days[0].accounts[0]).toMatchObject({ cash: 500, statedTotal: 100000 });

    // the account changes and the same day is captured again — superseded, not duplicated
    useStore.setState({ assetAccounts: [{ asset_id: 'vg', source: 'connected', balance: 99000, cash_balance: 400, positions: [] }] as any });
    useStore.getState().captureDailyNw('2026-08-20', 99000, 99000);
    days = (useStore.getState() as any).snapshotDays;
    expect(days).toHaveLength(1);
    expect(days[0].accounts[0].cash).toBe(400);
  });
});
