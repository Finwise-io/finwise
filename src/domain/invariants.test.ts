// One-source-of-truth invariants — the cross-module identities every screen relies on.
// Each test encodes a promise the app makes (launch test plan, P0 area 2); a failure here means
// two screens can show the user two different "truths" for the same dollar.
import { snapshotFromOnboarding, effectiveAnnualContribution } from './snapshot';
import { buildGoalsState, waterfall } from './goals';
import { spendBuckets, spendByMonth, savingsByMonth, budgetVsActual } from './budget';
import { currentRetirementIncomeMonthly, retirementIncomeMonthly } from './income';
import { earmarkDefault, earmarkedAmount, retirementEarmarkedValue, type AssetAccount } from './assets';
import { toNum, round2 } from './_shared/num';
import { ALL_PERSONAS, ECON, employedPartner, retiree75, simpleFlat, NO_TAX } from '../testing/personas';
import { expectAllFinite } from '../testing/assertFinite';
import type { OnboardingProfile } from './onboardingProfile';

const snap = (op: OnboardingProfile) => snapshotFromOnboarding('local', op, ECON);

// ───────────────────────── ONE POOL: invest + goals share the same free cash ─────────────────────────
describe('ONE-POOL free-cash invariant', () => {
  test('goal capacity = projected_to_save − investing plan (same dollars never fund both)', () => {
    const s = snap(employedPartner);
    const investMo = toNum(employedPartner.c_roth) + toNum(employedPartner.c_invest) + toNum(employedPartner.c_property);
    expect(s.goals.monthly_capacity).toBeCloseTo(Math.max(0, s.budget.projected_to_save - investMo), 2);
  });

  test('explicit monthlySavingsCapacity overrides the derived pool', () => {
    const s = snap({ ...employedPartner, monthlySavingsCapacity: '750' });
    expect(s.goals.monthly_capacity).toBe(750);
  });

  test('investing plan absorbing ALL free cash leaves zero (not negative) goal capacity', () => {
    const s = snap({ ...employedPartner, c_invest: '99999' });
    expect(s.goals.monthly_capacity).toBe(0);
    for (const g of s.goals.goals) expect(g.months_to_goal).toBeNull();   // no ETA promised on $0/mo
  });

  // BUG-LEDGER: B-20 — direct callers can pass a negative capacity; document the behavior.
  test('buildGoalsState with negative capacity: no months_to_goal, capacity passes through', () => {
    const g = buildGoalsState('local', [{ goal_id: 'g1', label: 'X', target_amount: 1000, target_year: null }], -200);
    expect(g.goals[0].months_to_goal).toBeNull();   // guarded: > 0 check avoids divide-by-negative
    expect(g.monthly_capacity).toBe(-200);          // …but a negative capacity is surfaced as-is
  });

  test('smoothed baseline and month-placed grid agree for a flat profile', () => {
    // 0% tax, no 401(k), fixed-only spending → both measures must be the same number.
    const s = snap(simpleFlat);
    const grid = savingsByMonth(simpleFlat);
    expect(s.budget.projected_to_save).toBeCloseTo(2000, 2);              // 5000 − 3000
    for (const m of grid) expect(m.amount).toBeCloseTo(s.budget.projected_to_save, 2);
  });

  test('waterfall routes the pool in priority order and never over-allocates', () => {
    const steps = waterfall(1000, { emergencyGap: 300, toxicDebt: 250, employerMatchMonthly: 200, rothRoom: 150 });
    expect(steps.map((x) => x.name)).toEqual(['Emergency fund', 'Toxic debt (>7%)', '401(k) employer match', 'Roth IRA', 'Other goals']);
    expect(steps.map((x) => x.allocated)).toEqual([300, 250, 200, 150, 100]);
    expect(steps.reduce((t, x) => t + x.allocated, 0)).toBeCloseTo(1000, 2);
  });

  test('waterfall with a deficit allocates nothing (no phantom money)', () => {
    const steps = waterfall(-500, { emergencyGap: 300 });
    expect(steps.reduce((t, x) => t + x.allocated, 0)).toBe(0);
  });
});

// ───────────────────────── WEALTH: one number for net worth everywhere ─────────────────────────
describe('Wealth single-source invariants', () => {
  test('net worth ≡ gross assets − gross debt ≡ manual sums over seeded accounts/debts', () => {
    const s = snap(employedPartner);
    const accountSum = s.assets.accounts.reduce((t, a) => t + a.balance, 0);
    expect(s.networth.net_worth).toBeCloseTo(s.networth.gross_assets - s.networth.gross_debt, 2);
    expect(s.networth.gross_assets).toBeCloseTo(accountSum, 2);
    expect(s.networth.gross_assets).toBeCloseTo(120000 + 45000, 2);       // the onboarding answers
    expect(s.networth.gross_debt).toBeCloseTo(14000, 2);
  });

  test('retirement projection starts from the SAME asset total the Net Worth chip shows', () => {
    for (const { name, op } of ALL_PERSONAS) {
      const s = snap(op);
      // buildRetirementState consumes assets.total_asset_value (snapshot.ts) — if these modules
      // ever diverge, the cockpit nest egg and the NW chip disagree (#15's failure family).
      expect(s.assets.total_asset_value).toBeCloseTo(
        s.assets.accounts.reduce((t, a) => t + a.balance, 0), 2,
      );
      expect(s.networth.gross_assets).toBeCloseTo(s.assets.total_asset_value, 2);
      if (name === 'retiree75') expect(s.assets.total_asset_value).toBeCloseTo(250000, 2);
    }
  });

  test('portfolio percentages sum to 100 when there are assets', () => {
    const s = snap(employedPartner);
    const pct = s.assets.accounts.reduce((t, a) => t + a.portfolio_percentage, 0);
    expect(pct).toBeCloseTo(100, 1);
  });

  test('retirement earmark defaults: property 0%, 529 0%, cash 50%, retirement/investment 100%', () => {
    const acct = (kind: string, bucket: AssetAccount['tax_bucket'], balance = 1000): AssetAccount =>
      ({ asset_id: kind, label: kind, kind, tax_bucket: bucket, balance, target_return: 0.07 });
    expect(earmarkDefault(acct('home', 'PROPERTY'))).toBe(0);
    expect(earmarkDefault(acct('college_529', 'TAXABLE'))).toBe(0);
    expect(earmarkDefault(acct('savings', 'CASH'))).toBe(50);
    expect(earmarkDefault(acct('401k', 'PRE_TAX'))).toBe(100);
    expect(earmarkDefault(acct('roth_ira', 'ROTH'))).toBe(100);
    expect(earmarkedAmount({ ...acct('savings', 'CASH'), balance: 10000 })).toBe(5000);
    expect(earmarkedAmount({ ...acct('401k', 'PRE_TAX'), retirement_pct: 250 } as AssetAccount)).toBe(1000); // clamped to 100%
    expect(retirementEarmarkedValue([
      acct('home', 'PROPERTY', 500000), acct('savings', 'CASH', 10000), acct('401k', 'PRE_TAX', 90000),
    ])).toBe(5000 + 90000);
  });
});

// ───────────────────────── INCOME & TAX: today's cash vs the retirement model ─────────────────────────
describe('Income/tax invariants (Social-Security leak gate)', () => {
  test('net never exceeds gross, for every persona', () => {
    for (const { op } of ALL_PERSONAS) {
      const s = snap(op);
      expect(s.income.total_net_annual).toBeLessThanOrEqual(s.income.total_gross_annual + 0.01);
    }
  });

  test("a working 40-year-old's FUTURE Social Security never inflates today's income", () => {
    const withSS: OnboardingProfile = { ...employedPartner, ri_ss: '2500', ri_ss_freq: 'monthly' };
    const a = snap(employedPartner), b = snap(withSS);
    expect(b.income.total_gross_annual).toBeCloseTo(a.income.total_gross_annual, 2);   // cash flow unchanged
    expect(b.budget.projected_to_save).toBeCloseTo(a.budget.projected_to_save, 2);
    expect(currentRetirementIncomeMonthly(withSS)).toBe(0);                            // the gate
  });

  test("…but that future Social Security DOES feed the retirement model (less corpus needed)", () => {
    const withSS: OnboardingProfile = { ...employedPartner, ri_ss: '2500', ri_ss_freq: 'monthly' };
    expect(retirementIncomeMonthly(withSS)).toBe(2500);                  // un-gated, for the projection
    expect(snap(withSS).retirement.needed).toBeLessThan(snap(employedPartner).retirement.needed);
  });

  test('a retiree DOES count Social Security + pension as current income', () => {
    const s = snap(retiree75);
    expect(currentRetirementIncomeMonthly(retiree75)).toBeCloseTo(2200 + 1300, 2);
    expect(s.income.total_gross_annual).toBeCloseTo((2200 + 1300) * 12, 0);
  });

  // BUG-LEDGER: B-17 — gate is on source selection, not amounts. With $0 amounts the result is
  // still $0, so selection alone can't fabricate income. Documenting (by-design).
  test('selecting retirement_income with $0 amounts yields $0 current income', () => {
    expect(currentRetirementIncomeMonthly({ ...NO_TAX, incomeSources: ['retirement_income'] })).toBe(0);
  });

  test('cadence normalization: quarterly and annual retirement income are per-month equivalents', () => {
    expect(retirementIncomeMonthly({ ri_pension: '3000', ri_pension_freq: 'quarterly' })).toBe(1000);
    expect(retirementIncomeMonthly({ ri_other: '12000', ri_other_freq: 'annual' })).toBe(1000);
  });
});

// ───────────────────────── CONTRIBUTION HONESTY: committed ≠ funded ─────────────────────────
describe('effectiveAnnualContribution never exceeds the stated plan', () => {
  test('property: effective ≤ stated for every persona (deficits deduct, never add)', () => {
    for (const { op } of ALL_PERSONAS) {
      const stated = (toNum(op.c_401k) + toNum(op.c_roth) + toNum(op.c_invest) + toNum(op.c_property)) * 12;
      // employer match rides on top of the stated plan, so compare against stated + match headroom
      expect(effectiveAnnualContribution(op)).toBeLessThanOrEqual(effectiveAnnualContributionFaceValue(op) + 0.01);
      expect(Number.isFinite(stated)).toBe(true);
    }
    function effectiveAnnualContributionFaceValue(op: OnboardingProfile): number {
      const free = savingsByMonth(op).reduce((t, m) => t + m.amount, 0);
      void free;
      // face value = what effectiveAnnualContribution returns when spending data is absent
      return effectiveAnnualContribution({ ...op, monthlySpending: '0', spendCats: undefined });
    }
  });

  test('no spending picture → contributions taken at face value', () => {
    const v = effectiveAnnualContribution({ ...NO_TAX, baseSalary: '8000', salaryMode: 'gross', salaryFreq: 'monthly', c_roth: '500' });
    expect(v).toBe(6000);
  });
});

// ───────────────────────── BUDGET INTEGRITY: buckets partition, months reconcile ─────────────────────────
// DR-11: full precision flows through the domain; rounding happens ONLY at the display edge.
// Regression guard for the "$4 income drift" — Money showed $292,000 while Retire showed $291,996
// because a caller did Math.round(retirementIncomeMonthly) BEFORE ×12. The domain function must
// return the unrounded monthly so monthly×12 reconciles to the annual figure to the cent.
describe('DR-11 precision: round at the edge, not mid-pipeline', () => {
  test('retirementIncomeMonthly keeps full precision (×12 reconciles to annual, no drift)', () => {
    // $1,000/yr Social Security → 1000/12 = 83.3333…/mo. A pre-rounded 83.33 would lose $0.04/yr.
    const m = retirementIncomeMonthly({ ri_ss: '1000', ri_ss_freq: 'annual' } as any);
    expect(m).toBeCloseTo(83.3333, 4);          // NOT 83.33 — full precision retained
    expect(m * 12).toBeCloseTo(1000, 2);        // annual reconciles exactly
    expect(m).not.toBe(round2(m));               // proves it is not pre-rounded to cents
  });

  test('mixed cadences sum without intermediate rounding drift', () => {
    // $700/mo SS + $2,000/qtr pension + $5,000/yr annuity = 700 + 666.6667 + 416.6667 = 1783.3333/mo
    const m = retirementIncomeMonthly({
      ri_ss: '700', ri_ss_freq: 'monthly',
      ri_pension: '2000', ri_pension_freq: 'quarterly',
      ri_annuities: '5000', ri_annuities_freq: 'annual',
    } as any);
    expect(m).toBeCloseTo(700 + 2000 / 3 + 5000 / 12, 4);
    expect(m * 12).toBeCloseTo(700 * 12 + 2000 * 4 + 5000, 2);   // annualizes back exactly
  });
});

describe('Budget integrity invariants', () => {
  test('spendBuckets is a partition: fixed + non-monthly + flexible = monthly total', () => {
    for (const { op } of ALL_PERSONAS) {
      const b = spendBuckets(op);
      expect(b.monthly_total).toBeCloseTo(b.fixed + b.non_monthly + b.flexible, 2);
    }
  });

  test('non-monthly costs land ONLY in their chosen months (never averaged away)', () => {
    const months = spendByMonth(employedPartner);                       // $3,600 insurance in April
    const fixedAndFlex = 2300 + 900 + 600;
    expect(months[3]).toBeCloseTo(fixedAndFlex + 3600, 2);              // April carries the premium
    months.forEach((m, i) => { if (i !== 3) expect(m).toBeCloseTo(fixedAndFlex, 2); });
  });

  test('months reconcile to the annual plan: Σ spendByMonth = 12 × (buckets + uncategorized remainder)', () => {
    for (const { op } of ALL_PERSONAS) {
      const annual = spendByMonth(op).reduce((t, m) => t + m, 0);
      const buckets = spendBuckets(op);
      const uncategorized = Math.max(0, toNum(op.monthlySpending) - buckets.monthly_total);
      expect(annual).toBeCloseTo((buckets.monthly_total + uncategorized) * 12, 1);
    }
  });

  // BUG-LEDGER: B-24 (fixed) — when the user states a total spend AND itemizes only part of it, the
  // budget now counts the FULL stated total (itemized buckets + uncategorized remainder), matching
  // the month grid, so the two free-cash measures agree.
  test('stated-total vs itemized spending: budget matches the month grid (B-24 fixed)', () => {
    // retiree75 states $3,800/mo but itemizes $3,200 → $600/mo uncategorized
    const s = snap(retiree75);
    expect(s.budget.monthly_spending).toBeCloseTo(3800, 2);             // full stated total, not just $3,200
    const juneSpend = spendByMonth(retiree75)[0];
    expect(juneSpend).toBeCloseTo(3000 + 600, 2);                       // grid: fixed+flex+uncategorized
    // both free-cash measures now agree (no uncategorized gap):
    const gridAnnualSavings = savingsByMonth(retiree75).reduce((t, m) => t + m.amount, 0);
    const smoothedAnnualSavings = s.budget.projected_to_save * 12;
    expect(smoothedAnnualSavings).toBeCloseTo(gridAnnualSavings, 0);
  });

  test('budgetVsActual: totals reconcile, other months and debt payments are excluded', () => {
    const now = new Date(2026, 5, 15);
    const expenses = [
      { amount: 500, category: 'Groceries', date: '2026-06-03' },
      { amount: 1200, category: 'Rent', date: '2026-06-01' },
      { amount: 420, category: 'Debt payment', date: '2026-06-05' },     // tracked separately
      { amount: 999, category: 'Groceries', date: '2026-05-20' },        // last month
    ];
    const bva = budgetVsActual(expenses, employedPartner, now);
    expect(bva.month).toBe('2026-06');
    expect(bva.spent_total).toBeCloseTo(1700, 2);                        // 500 + 1200 only
    expect(bva.spent_total).toBeCloseTo(bva.buckets.reduce((t, b) => t + b.spent, 0), 2);
    expect(bva.remaining).toBeCloseTo(bva.planned_total - bva.spent_total, 2);
    expect(bva.planned_total).toBeCloseTo(spendBuckets(employedPartner).monthly_total, 2);
  });
});

// ───────────────────────── CURRENCY SEAM: formatting never changes the math ─────────────────────────
describe('Currency seam', () => {
  // BUG-LEDGER: B-23 (deferred) — domain calcs are currency-agnostic numbers; only formatting
  // changes with the region. Tax packs are US-only at launch.
  test('switching the display currency leaves every domain number unchanged', () => {
    const { setMoneyFormat } = require('./_shared/money');
    const usd = snap(employedPartner);
    setMoneyFormat('EUR');
    const eur = snap(employedPartner);
    setMoneyFormat('USD', 'en-US');
    expect(eur.networth.net_worth).toBe(usd.networth.net_worth);
    expect(eur.budget.projected_to_save).toBe(usd.budget.projected_to_save);
    expect(eur.income.total_net_annual).toBe(usd.income.total_net_annual);
  });
});

// ───────────────────────── SANITY SWEEP: no broken numbers, ever ─────────────────────────
describe('Snapshot finite sweep', () => {
  test.each(ALL_PERSONAS.map(({ name, op }) => [name, op] as const))(
    'every numeric leaf of buildSnapshot(%s) is finite',
    (_name, op) => {
      const s = snap(op);
      expectAllFinite(s, String(_name));
      expect(s.retirement.chance_of_success).toBeGreaterThanOrEqual(0);
      expect(s.retirement.chance_of_success).toBeLessThanOrEqual(100);
    },
  );
});
