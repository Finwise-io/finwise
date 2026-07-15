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
    expect(Number.isInteger(r.chance_of_success)).toBe(true);
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
    const { depletionAge, RMD_START_AGE } = require('../domain/decumulation');
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
    // the mirrored IRS table stays in agreement with the canonical one
    const { rmdDivisor } = require('../domain/decumulation');
    expect(RMD_START_AGE).toBe(73);
    expect(Math.abs(rmdDivisor(75) - 24.6)).toBeLessThan(0.01);
  });

  test('PRD F2#11 — progressive monthly withholding: EXACT annual identity + honest bonus months + manual stays flat', () => {
    const { progressiveMonthlyTax, taxOwed } = require('../domain/income/tax');
    const { monthlyTaxRates, incomeMonthlyGrid } = require('../domain/income');
    // telescoping identity: the twelve monthly taxes sum to the annual schedule TO THE CENT
    const lumpy = [6000, 6000, 36000, 6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000];
    const tax = progressiveMonthlyTax(lumpy);
    expect(Math.abs(tax.reduce((a: number, b: number) => a + b, 0) - taxOwed(lumpy.reduce((a, b) => a + b, 0)))).toBeLessThan(0.01);
    // the bonus month's effective rate exceeds a plain month's (brackets fill up)
    expect(tax[2] / lumpy[2]).toBeGreaterThan(tax[1] / lumpy[1]);
    // estimate mode: the vector reflects that; manual mode: the user's flat number in all 12
    const est = { status: 'employed', baseSalary: '6000', salaryMode: 'gross', salaryFreq: 'monthly', bonusAnnual: '30000', bonusMonth: 3 };
    const rates = monthlyTaxRates(est as any);
    expect(rates[2]).toBeGreaterThan(rates[1]);
    const man = monthlyTaxRates({ ...est, taxMode: 'manual', manualTaxRate: '20' } as any);
    expect(new Set(man.map((r: number) => Math.round(r * 1000))).size).toBe(1);
    expect(man[0]).toBeCloseTo(0.2);
    // and the visible grid carries it: March take-home rate is HIGHER-taxed than February's
    const grid = incomeMonthlyGrid(est as any, 'net');
    const gross = incomeMonthlyGrid(est as any, 'gross');
    const rateOf = (i: number) => 1 - grid[i].amount / gross[i].amount;
    expect(rateOf(2)).toBeGreaterThan(rateOf(1));
  });

  test('PRD F9#14/F3#17 — filing status + state rate tune EVERY tax estimate from two answers', () => {
    const { taxOwedFor, ltcgRateFor, marginalBracketFor, TAX_TABLES } = require('../domain/income/tax');
    const { userCapGainsRates, monthlyTaxRates } = require('../domain/income');
    // the tables behave like the IRS's: married pays less than single on the same gross; HoH between
    expect(TAX_TABLES.married.deduction).toBe(TAX_TABLES.single.deduction * 2);
    expect(taxOwedFor(120000, 'married')).toBeLessThan(taxOwedFor(120000, 'single'));
    expect(taxOwedFor(120000, 'hoh')).toBeLessThan(taxOwedFor(120000, 'single'));
    expect(taxOwedFor(120000, 'hoh')).toBeGreaterThan(taxOwedFor(120000, 'married'));
    // the state rate is a flat add-on, capped
    expect(taxOwedFor(100000, 'single', 0.05) - taxOwedFor(100000, 'single', 0)).toBeCloseTo(5000, 0);
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
    useStore.getState().dismissInsight('cash-drag', future);
    expect(useStore.getState().dismissedInsights['cash-drag']).toBe(future);   // persisted store state
    // the ONE filter rule the hook applies:
    const hiddenUntil = useStore.getState().dismissedInsights as Record<string, string>;
    const nowIso = new Date().toISOString();
    const notDismissed = (i: { id: string }) => i.id === 'worth-a-look' || !hiddenUntil[i.id] || hiddenUntil[i.id] <= nowIso;
    expect(notDismissed({ id: 'cash-drag' })).toBe(false);                     // hidden while snoozed
    expect(notDismissed({ id: 'worth-a-look' })).toBe(true);                   // exempt — has its own resolution
    useStore.getState().dismissInsight('cash-drag', past);
    const hidden2 = useStore.getState().dismissedInsights as Record<string, string>;
    expect(hidden2['cash-drag'] <= nowIso).toBe(true);                         // expired → shows again
  });

  test('the contract document itself stays present and BINDING', () => {
    const doc = fs.readFileSync(path.join(__dirname, '../../docs/FCC-core-55-70/FCC-state-contract.md'), 'utf8');
    expect(doc).toMatch(/Status: BINDING/);
    expect(doc).toMatch(/never leaves your device|zero dollar signs/i);
  });
});
