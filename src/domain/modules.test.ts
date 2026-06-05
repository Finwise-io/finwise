import { buildAssetsState, assetsFromOnboarding, monthlyContributionsFromOnboarding, benchmarkInfo, blendedReturn, type AssetAccount } from './assets';
import { buildDebtState, debtsFromOnboarding } from './debt';
import { buildNetWorth } from './networth';
import { buildBudgetState, budgetFromOnboarding } from './budget';
import { buildGoalsState, goalsFromOnboarding, waterfall } from './goals';
import { simulate, buildRetirementState } from './retirement';
import { buildSnapshot } from './snapshot';

describe('assets', () => {
  test('totals, allocation %, weighted avg return', () => {
    const d = assetsFromOnboarding('u', { currentRetirementSavings: '300000', investmentHoldings: '100000' });
    const s = buildAssetsState('u', d.accounts);
    expect(s.total_asset_value).toBe(400000);
    expect(s.accounts[0].portfolio_percentage).toBe(75);
    expect(s.average_target_return).toBeCloseTo(0.07, 4);
  });
  test('monthly contributions sum types + employer match', () => {
    expect(monthlyContributionsFromOnboarding({ c_401k: '1000', c_roth: '500', employerMatchMode: 'dollar', employerMatchValue: '250' })).toBe(1750);
  });
  test('benchmarkInfo: default carries source + period; override flags edited', () => {
    const def = benchmarkInfo('stocks_etf');
    expect(def.ret).toBeCloseTo(0.07, 4);
    expect(def.source).toMatch(/S&P 500/);
    expect(def.period).toBe('30-yr');
    expect(def.edited).toBe(false);
    const ov = benchmarkInfo('stocks_etf', { stocks_etf: 0.05 });
    expect(ov.ret).toBeCloseTo(0.05, 4);
    expect(ov.edited).toBe(true);
    expect(ov.source).toMatch(/custom/i);
  });
  test('blendedReturn: value-weighted across earmarked holdings, property excluded', () => {
    const accts: AssetAccount[] = [
      { asset_id: 'a1', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 100000, target_return: 0.07, retirement_pct: 100 },
      { asset_id: 'a2', label: 'Bonds', kind: 'fixed_income', tax_bucket: 'TAXABLE', balance: 100000, target_return: 0.04, retirement_pct: 100 },
      { asset_id: 'a3', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 500000, target_return: 0.03, retirement_pct: 0 },
    ];
    expect(blendedReturn(accts)).toBeCloseTo(0.055, 4);   // (7%+4%)/2, home ignored
  });
});

describe('debt', () => {
  test('aggregate + highest-rate + toxic', () => {
    const s = buildDebtState('u', [
      { debt_id: 'd1', label: 'Card', debt_type: 'CREDIT_CARD', remaining_balance: 10000, interest_rate_apr: 0.19, minimum_monthly_payment: 300 },
      { debt_id: 'd2', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 300000, interest_rate_apr: 0.045, minimum_monthly_payment: 1800 },
    ]);
    expect(s.total_debt_balance).toBe(310000);
    expect(s.total_monthly_debt_service).toBe(2100);
    expect(s.highest_rate_debt?.label).toBe('Card');
    expect(s.toxic_debt_balance).toBe(10000);          // only the 19% card
  });
  test('from onboarding', () => {
    const d = debtsFromOnboarding('u', { debtName: 'Loan', debtBalance: '5000', debtRate: '6.5', debtPayment: '100' });
    expect(d.debts[0].remaining_balance).toBe(5000);
    expect(d.debts[0].interest_rate_apr).toBeCloseTo(0.065, 4);
  });
});

describe('net worth', () => {
  test('assets − debt', () => {
    expect(buildNetWorth('u', 400000, 310000).net_worth).toBe(90000);
  });
});

describe('budget', () => {
  test('projected_to_save = income − spending', () => {
    const s = buildBudgetState('u', 8000, budgetFromOnboarding('u', { monthlySpending: '5000' }));
    expect(s.projected_to_save).toBe(3000);
    expect(s.savings_rate_pct).toBeCloseTo(37.5, 1);
  });
});

describe('goals', () => {
  test('months to goal', () => {
    const d = goalsFromOnboarding('u', { goals: [{ label: 'House', target: '60000', year: '2030' }] });
    const s = buildGoalsState('u', d.goals, 2000);
    expect(s.goals[0].months_to_goal).toBe(30);
  });
  test('waterfall routes by priority', () => {
    const steps = waterfall(2000, { emergencyGap: 500, toxicDebt: 800, employerMatchMonthly: 300 });
    expect(steps.find(s => s.name === 'Emergency fund')?.allocated).toBe(500);
    expect(steps.find(s => s.name === 'Toxic debt (>7%)')?.allocated).toBe(800);
    expect(steps.find(s => s.name === 'Roth IRA')?.allocated).toBe(400);   // remainder
  });
});

describe('retirement Monte Carlo', () => {
  const base = {
    current_age: 40, retire_age: 65, horizon_age: 90, start_balance: 200000,
    annual_contribution: 20000, retire_monthly_spend_today: 5000, guaranteed_monthly_income: 0,
    inflation: 0.024, mean_return: 0.07, vol_return: 0.12, paths: 400, seed: 7,
  };
  test('well-funded → high chance; under-funded → low chance', () => {
    const rich = simulate({ ...base, start_balance: 2_000_000, annual_contribution: 40000, retire_monthly_spend_today: 3000 });
    const poor = simulate({ ...base, start_balance: 0, annual_contribution: 0, retire_monthly_spend_today: 9000 });
    expect(rich.chance_of_success).toBeGreaterThan(85);
    expect(poor.chance_of_success).toBeLessThan(20);
  });
  test('reproducible with a seed; gap suggests extra contribution', () => {
    expect(simulate(base).chance_of_success).toBe(simulate(base).chance_of_success);
    const st = buildRetirementState('u', base);
    expect(st.chance_of_success).toBeGreaterThanOrEqual(0);
    if (st.gap > 0) expect(st.suggested_extra_monthly).toBeGreaterThan(0);
  });
});

describe('snapshot', () => {
  test('assembles all read-models from one onboarding blob', () => {
    const op = {
      name: 'Alex', status: 'employed', birthMonth: '3', birthYear: '1990', targetRetirementAge: '65',
      baseSalary: '8000', employerMatchMode: 'dollar', employerMatchValue: '300', bonusAnnual: '20000',
      currentRetirementSavings: '250000', investmentHoldings: '120000', c_401k: '1500', c_roth: '500',
      debtName: 'Card', debtBalance: '12000', debtRate: '19', debtPayment: '400',
      monthlySpending: '4500', expectedRetirementSpending: '5000',
      goals: [{ label: 'House', target: '80000', year: '2032' }],
    };
    const s = buildSnapshot('u', op, { inflationRate: 2.4, treasuryYield: 4.3 });
    expect(s.networth.net_worth).toBe(370000 - 12000);          // assets 250k+120k − debt 12k
    expect(s.budget.projected_to_save).toBe(s.income.net_monthly_income - 4500);
    expect(s.debt.highest_rate_debt?.label).toBe('Card');
    expect(s.retirement.chance_of_success).toBeGreaterThanOrEqual(0);
    expect(s.goals.goals[0].months_to_goal).toBeGreaterThan(0);
  });
});
