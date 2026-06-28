import { spendBuckets, budgetFromOnboarding, budgetVsActual, spendByMonth, savingsByMonth, emergencyTest, monthlyEssentials, plannedMonthlySpend, annualCashflow, categoryMonthly, nonMonthlyBasis } from './index';
import { takeHomeMonthly } from '../savings';
import { categoryBucketFor } from '../../constants/categories';
import type { OnboardingProfile } from '../onboardingProfile';
import * as fs from 'fs';
import * as path from 'path';

// #6: the recap's "Surplus / yr" must reconcile with the savings-plan's monthly average × 12.
// Both now derive from the SAME grid (annualCashflow ≡ Σ savingsByMonth), so they agree even with
// non-flat income (a December bonus). They used to disagree because the recap annualized income flatly.
describe('annualCashflow reconciles the recap with the savings plan (#6)', () => {
  const op: OnboardingProfile = {
    taxMode: 'manual', manualTaxRate: '20',
    baseSalary: '8000', salaryFreq: 'monthly',       // $96k/yr gross
    bonusAnnual: '12000', bonusMonth: 12,            // lumpy → only the grid captures its timing
    c_401k: '750',                                   // employee 401(k), locked away
    monthlySpending: '4000',
  };

  test('saveYr === Σ savingsByMonth (free-to-save matches month by month)', () => {
    const cf = annualCashflow(op);
    const byMonthAnnual = savingsByMonth(op).reduce((t, m) => t + m.amount, 0);
    expect(cf.saveYr).toBeCloseTo(byMonthAnnual, 2);
  });
  test('the monthly average (Σ savingsByMonth ÷ 12) × 12 equals the recap yearly — no drift', () => {
    const cf = annualCashflow(op);
    const monthlyAvg = savingsByMonth(op).reduce((t, m) => t + m.amount, 0) / 12;
    expect(monthlyAvg * 12).toBeCloseTo(cf.saveYr, 2);
  });
  test('the waterfall is internally consistent: gross − tax = net, net − 401k = available, available − spend = save', () => {
    const cf = annualCashflow(op);
    expect(cf.grossYr - cf.taxYr).toBeCloseTo(cf.netYr, 2);
    expect(cf.netYr - cf.k401Yr).toBeCloseTo(cf.availableYr, 2);
    expect(cf.availableYr - cf.spendYr).toBeCloseTo(cf.saveYr, 2);
    expect(cf.k401Yr).toBeCloseTo(750 * 12, 2);
  });
  test('T08/B-67: the spending-plan leftover surface (take-home − planned spend) equals the recap surplus', () => {
    const cf = annualCashflow(op);
    const takeHomeMo = cf.availableYr / 12;                         // = takeHomeMonthly (after tax AND 401k)
    const leftoverYr = (takeHomeMo - plannedMonthlySpend(op)) * 12; // the spending-plan screen's leftover
    expect(leftoverYr).toBeCloseTo(cf.saveYr, 2);                   // all three surplus surfaces reconcile (a 401k IS present)
  });
});

describe('emergency stress test', () => {
  const op: OnboardingProfile = {
    taxMode: 'manual', manualTaxRate: '0', monthlySpending: '0',
    spendCats: [
      { id: 'rent', tier: 'critical', bucket: 'fixed', amount: '1500', unit: 'dollar' },
      { id: 'food', tier: 'important', bucket: 'fixed', amount: '500', unit: 'dollar' },
      { id: 'dining', tier: 'flex', bucket: 'flexible', amount: '400', unit: 'dollar' },   // a want — not essential
      { id: 'tuition', tier: 'critical', bucket: 'nonmonthly', amount: '12000', unit: 'dollar', months: [9] }, // lumpy — excluded
    ],
  };
  test('essentials = recurring critical + important only', () => {
    expect(monthlyEssentials(op)).toBe(2000);   // rent 1500 + food 500 (dining + tuition excluded)
  });
  test('absorbing a shock + runway after', () => {
    const r = emergencyTest(op, 5000, 3000);
    expect(r.coversIt).toBe(true);
    expect(r.cashAfter).toBe(2000);
    expect(r.runwayAfter).toBe(1);              // $2k left ÷ $2k/mo
    expect(r.jobLossRunway).toBe(2.5);          // $5k ÷ $2k/mo with no income
    expect(r.recommendedFund).toBe(6000);       // 3 × essentials
    expect(r.gapToFund).toBe(1000);             // 6000 − 5000
  });
  test('a shock bigger than cash goes red', () => {
    const r = emergencyTest(op, 1000, 3000);
    expect(r.coversIt).toBe(false);
    expect(r.cashAfter).toBe(-2000);
  });

  // BUG-LEDGER: B-33 — a user who gave a lump monthlySpending with no itemized categories used to
  // get $0 essentials → "strong cushion" with $0 cash, contradicting "you'd go into the red."
  test('lump monthlySpending with no categories falls back to that total (no $0-essentials)', () => {
    const lump: OnboardingProfile = { taxMode: 'manual', manualTaxRate: '0', monthlySpending: '5000' };
    expect(monthlyEssentials(lump)).toBe(5000);
    const r = emergencyTest(lump, 0, 3000);
    expect(r.coversIt).toBe(false);              // $0 cash can't absorb a $3k hit
    expect(r.recommendedFund).toBe(15000);       // 3 × $5k
    expect(r.gapToFund).toBe(15000);             // and the full fund is the gap — NOT a "strong cushion"
  });
});

describe('spending placed in actual months (not averaged)', () => {
  test('a non-monthly bill lands in its month; monthly bills repeat', () => {
    const op: OnboardingProfile = {
      taxMode: 'manual', manualTaxRate: '0', monthlySpending: '0',
      spendCats: [
        { id: 'tuition', bucket: 'nonmonthly', amount: '12000', unit: 'dollar', months: [8] },  // Aug
        { id: 'rent', bucket: 'fixed', amount: '500', unit: 'dollar' },                          // every month
      ],
    };
    const s = spendByMonth(op);
    expect(s[7]).toBeCloseTo(12500, 0);   // August: tuition $12k + rent $500
    expect(s[6]).toBeCloseTo(500, 0);     // July: just rent
    expect(s.reduce((t, x) => t + x, 0)).toBeCloseTo(12000 + 500 * 12, 0);
  });
  test('savings dips in the month a big bill is due', () => {
    const op: OnboardingProfile = {
      taxMode: 'manual', manualTaxRate: '0',
      baseSalary: '3000', salaryMode: 'gross', salaryFreq: 'monthly', monthlySpending: '0',
      spendCats: [{ id: 'tuition', bucket: 'nonmonthly', amount: '12000', unit: 'dollar', months: [8] }],
    };
    const s = savingsByMonth(op);
    expect(s[7].amount).toBeLessThan(s[6].amount);   // August (tuition due) saves far less than July
    expect(s[7].amount).toBeCloseTo(3000 - 12000, 0);
  });
});

describe('spending categories → buckets', () => {
  test('rolls categories into monthly-normalized buckets ($ amounts)', () => {
    const op: OnboardingProfile = {
      spendCats: [
        { id: 'rent', bucket: 'fixed', amount: '2000', unit: 'dollar' },
        { id: 'groceries', bucket: 'flexible', amount: '500', unit: 'dollar' },
        { id: 'repairs', bucket: 'nonmonthly', amount: '1200', unit: 'dollar' },   // yearly → 100/mo
      ],
    };
    const b = spendBuckets(op);
    expect(b.fixed).toBe(2000);
    expect(b.flexible).toBe(500);
    expect(b.non_monthly).toBe(100);                 // 1200 / 12
    expect(b.monthly_total).toBe(2600);
  });

  test('percent amounts resolve against take-home income', () => {
    // gross 120k salary, 0% manual tax → net = 120k → net monthly 10k; 30% fixed = 3000/mo
    const op: OnboardingProfile = {
      baseSalary: '10000', salaryMode: 'gross', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '0',
      spendCats: [{ id: 'rent', bucket: 'fixed', amount: '30', unit: 'pct' }],
    };
    expect(spendBuckets(op).fixed).toBeCloseTo(3000, 0);
  });

  // ── A-1: the %-of-income base is canonical take-home (after tax AND 401k), == the spending screen ──
  test('A-1: a % category resolves against take-home AFTER 401(k), matching the spending screen', () => {
    // gross 10k/mo, 0% tax, but $1,000/mo into 401(k) → take-home = 9,000 (NOT net-of-tax 10,000)
    const op: any = {
      baseSalary: '10000', salaryMode: 'gross', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '0',
      c_401k: '1000', spendCats: [{ id: 'rent', bucket: 'fixed', amount: '30', unit: 'pct' }],
    };
    expect(spendBuckets(op).fixed).toBeCloseTo(2700, 0);                  // 30% of 9,000 — NOT 3,000
    expect(spendBuckets(op).fixed).toBeCloseTo(0.30 * takeHomeMonthly(op), 1);   // == the screen's base
  });

  test('A-1: raising 401(k) lowers a % category dollar (proves base is take-home, not net-of-tax)', () => {
    const base: any = { baseSalary: '10000', salaryMode: 'gross', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '0',
      spendCats: [{ id: 'r', bucket: 'fixed', amount: '30', unit: 'pct' }] };
    expect(spendBuckets({ ...base, c_401k: '2000' }).fixed).toBeLessThan(spendBuckets(base).fixed);
  });

  test('A-1: the old net-of-tax %-base formula is gone from budget', () => {
    const src = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
    expect(src).not.toMatch(/totalGrossAnnual\(op\) \* \(1 - effectiveRate\(op\)\)/);
    expect(src).toMatch(/function pctBaseMonthly/);
  });

  test('budgetVsActual rolls month-to-date expenses into buckets vs plan', () => {
    const op: OnboardingProfile = { spendCats: [
      { id: 'rent', bucket: 'fixed', amount: '2000', unit: 'dollar' },
      { id: 'groceries', bucket: 'flexible', amount: '600', unit: 'dollar' },
    ] };
    const now = new Date('2026-06-15T12:00:00');
    const expenses = [
      { amount: 50, category: 'Groceries', date: '2026-06-03' },        // flexible
      { amount: 30, category: 'Dining out', date: '2026-06-10' },       // flexible
      { amount: 2000, category: 'Rent / Mortgage', date: '2026-06-01' },// fixed
      { amount: 99, category: 'Groceries', date: '2026-05-28' },        // prior month — excluded
    ];
    const r = budgetVsActual(expenses, op, now);
    expect(r.month).toBe('2026-06');
    expect(r.spent_total).toBe(2080);                              // 50+30+2000
    expect(r.planned_total).toBe(2600);
    expect(r.remaining).toBe(520);
    const flex = r.buckets.find((b) => b.key === 'flexible')!;
    expect(flex.spent).toBe(80);                                   // groceries+dining this month
    expect(categoryBucketFor('Insurance')).toBe('fixed');
    expect(categoryBucketFor('Dining out')).toBe('flexible');
  });

  test('falls back to legacy b_* fields when no categories', () => {
    const b = spendBuckets({ b_fixed: '1500', b_nonmonthly: '200', b_flexible: '800' });
    expect(b.monthly_total).toBe(2500);
    expect(budgetFromOnboarding('u1', { b_fixed: '1500', b_nonmonthly: '200', b_flexible: '800' }).monthly_spending).toBe(2500);
  });
});

// BUG-LEDGER: B-50 — one "monthly spend" definition for budget, runway, and essentials.
describe('plannedMonthlySpend (B-50)', () => {
  const partial: any = { taxMode: 'manual', manualTaxRate: '0', monthlySpending: '5000',
    spendCats: [{ id: 'rent', tier: 'critical', bucket: 'fixed', amount: '2500', unit: 'dollar' }] };
  test('partial-itemizer: max(bucket $2,500, stated $5,000) = $5,000', () => {
    expect(plannedMonthlySpend(partial)).toBe(5000);
    expect(plannedMonthlySpend(partial)).toBe(budgetFromOnboarding('u', partial).monthly_spending); // runway == budget
  });
  test('fully itemized over the stated total → the buckets win', () => {
    const op: any = { monthlySpending: '1000', spendCats: [{ id: 'r', tier: 'critical', bucket: 'fixed', amount: '3000', unit: 'dollar' }] };
    expect(plannedMonthlySpend(op)).toBe(3000);
  });
  test('stated only (no categories) → the stated total', () => {
    expect(plannedMonthlySpend({ monthlySpending: '4200' } as any)).toBe(4200);
  });
});

// build-34 #3: a bucket's header total must equal the SUM of its visible line items. Both now flow through
// ONE helper (categoryMonthly), so % categories resolve against take-home (after tax + 401k) — the screen
// can no longer show net-of-tax items that overshoot the take-home-based bucket header.
describe('budget bucket totals reconcile with their line items (categoryMonthly = one source)', () => {
  const op = {
    taxMode: 'manual', manualTaxRate: '20',
    baseSalary: '10000', salaryFreq: 'monthly',     // $120k/yr gross → net-of-tax 8000/mo
    c_401k: '1000',                                  // 401(k) → take-home < net-of-tax
    spendCats: [
      { label: 'Rent', bucket: 'fixed', amount: '50', unit: 'pct' },             // % of take-home
      { label: 'Utilities', bucket: 'fixed', amount: '500', unit: 'dollar' },
      { label: 'Travel', bucket: 'nonmonthly', amount: '3600', unit: 'dollar' }, // 3600/yr = 300/mo
    ],
  } as any;

  test('a % category resolves against take-home (after tax + 401k), NOT net-of-tax', () => {
    const th = takeHomeMonthly(op);
    expect(categoryMonthly(op.spendCats[0], op)).toBeCloseTo(0.5 * th, 2);        // 50% of TAKE-HOME
    expect(th).toBeLessThan(10000 * (1 - 0.20));                                  // 401(k) subtracted → < net-of-tax
  });

  test('non-monthly $ category is annual ÷ 12', () => {
    expect(categoryMonthly(op.spendCats[2], op)).toBeCloseTo(300, 2);            // 3600 / 12
  });

  test('sum of a bucket\'s line-item limits === the bucket header total', () => {
    const sumFixed = op.spendCats.filter((c: any) => c.bucket === 'fixed')
      .reduce((t: number, c: any) => t + categoryMonthly(c, op), 0);
    expect(sumFixed).toBeCloseTo(spendBuckets(op).fixed, 2);                      // domain header
    const bva = budgetVsActual([], op);
    expect(bva.buckets.find((b) => b.key === 'fixed')!.planned).toBeCloseTo(sumFixed, 2); // on-screen header
  });
});

// pj build-34: a 15%-of-take-home non-monthly bucket showed an annual $ with no stated basis ("15% of what?").
// nonMonthlyBasis() drives the label so the figure is never ambiguous.
describe('nonMonthlyBasis — labels the non-monthly bucket basis', () => {
  const base = (cats: any[]): OnboardingProfile => ({ status: 'employed', spendCats: cats } as any);

  test('all non-monthly categories are %-based → returns the combined %', () => {
    expect(nonMonthlyBasis(base([{ bucket: 'nonmonthly', unit: 'pct', amount: 15 }]))).toEqual({ allPct: true, pct: 15 });
    expect(nonMonthlyBasis(base([
      { bucket: 'nonmonthly', unit: 'pct', amount: 10 },
      { bucket: 'nonmonthly', unit: 'pct', amount: 5 },
      { bucket: 'fixed', unit: 'pct', amount: 30 },            // not counted (different bucket)
    ]))).toEqual({ allPct: true, pct: 15 });
  });

  test('any non-monthly category is a $ amount → allPct false (no % label)', () => {
    expect(nonMonthlyBasis(base([{ bucket: 'nonmonthly', unit: 'dollar', amount: 3673 }])).allPct).toBe(false);
    expect(nonMonthlyBasis(base([
      { bucket: 'nonmonthly', unit: 'pct', amount: 10 },
      { bucket: 'nonmonthly', unit: 'dollar', amount: 1200 },
    ])).allPct).toBe(false);
  });

  test('no non-monthly categories → allPct false', () => {
    expect(nonMonthlyBasis(base([{ bucket: 'fixed', unit: 'pct', amount: 30 }])).allPct).toBe(false);
    expect(nonMonthlyBasis(null).allPct).toBe(false);
  });
});
