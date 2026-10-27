// F5 paycheck function — pins the LOCKED guaranteed definition, real month placement (never a flat
// average), the solved safe draw (deterministic, ≥80% chance, never overstated), and the exact
// this-year sum. Drives the real simulate() — no stub.
import { guaranteedRows, solveSafeDraw, buildPaycheckYear } from './index';
import { simulate } from '../retirement';

const NOW = new Date('2026-07-15T12:00:00');   // window Jul 2026 … Jun 2027
const SIM = { current_age: 68, horizon_age: 92, mean_return: 0.055, vol_return: 0.11, inflation: 0.025, seed: 42, paths: 300 };

const june: Record<string, any> = {
  status: 'retired', incomeSources: ['retirement_income'],
  ri_ss: '2600', ri_ss_freq: 'monthly', ri_ss_day: 3,
  ri_pension: '19200', ri_pension_freq: 'annual', ri_pension_month: 12, ri_pension_day: 1,
  ri_withdrawals: '800', ri_withdrawals_freq: 'monthly',    // must be EXCLUDED (locked definition)
  ri_rmd: '15660', ri_rmd_freq: 'annual',                   // must be EXCLUDED
  taxMode: 'flat', flatRate: '10',
  spendCats: [
    { id: 'rent', bucket: 'fixed', amount: '1200', unit: 'dollar' },
    { id: 'proptax', label: 'Property tax', bucket: 'nonmonthly', amount: '1900', unit: 'dollar', months: [11], dueDay: 15, tier: 'critical' },
  ],
};

describe('guaranteedRows — the LOCKED definition', () => {
  const rows = guaranteedRows(june, NOW);
  test('ri_withdrawals and ri_rmd are EXCLUDED — the safe draw replaces them (no double counting)', () => {
    const sources = new Set(rows.map((r) => r.source));
    expect(sources).toEqual(new Set(['Social Security', 'Pension']));
  });
  test('monthly Social Security lands every month with its arrival day', () => {
    const ss = rows.filter((r) => r.source === 'Social Security');
    expect(ss).toHaveLength(12);
    expect(ss.every((r) => r.amount === 2600 && r.day === 3)).toBe(true);
  });
  test('annual pension lands ONCE, in ITS month (December), full amount — never smeared /12', () => {
    const p = rows.filter((r) => r.source === 'Pension');
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({ amount: 19200, month: 12, year: 2026, day: 1 });
  });
  test('received-now gate: a working profile with future-SS fields gets NO rows', () => {
    const working = { ...june, incomeSources: ['employment'] };
    expect(guaranteedRows(working, NOW)).toHaveLength(0);
  });
  test('quarterly rhythm anchors to its stated month', () => {
    const op = { status: 'retired', incomeSources: ['retirement_income'], ri_annuities: '3000', ri_annuities_freq: 'quarterly', ri_annuities_month: 9 };
    const rows = guaranteedRows(op as any, NOW);
    expect(rows.map((r) => r.month).sort((a, b) => a - b)).toEqual([3, 6, 9, 12]);
  });
});

describe('solveSafeDraw — deterministic, honest, monotonic', () => {
  test('no nest egg → no draw (never an invented number)', () => {
    expect(solveSafeDraw(0, 2600, SIM)).toBe(0);
  });
  test('the solved draw actually holds the Likely line (chance ≥ 80 when re-simulated)', () => {
    const draw = solveSafeDraw(415000, 4200, SIM);
    expect(draw).toBeGreaterThan(0);
    const chance = simulate({
      current_age: SIM.current_age, retire_age: SIM.current_age, horizon_age: SIM.horizon_age,
      start_balance: 415000, annual_contribution: 0,
      retire_monthly_spend_today: 4200 + draw, guaranteed_monthly_income: 4200,
      guaranteed_start_age: SIM.current_age,
      inflation: SIM.inflation, mean_return: SIM.mean_return, vol_return: SIM.vol_return,
      paths: 300, seed: 42,
    }).chance_of_success;
    expect(chance).toBeGreaterThanOrEqual(80);
  });
  test('bigger nest egg → bigger (or equal) draw; same seed → identical result', () => {
    const small = solveSafeDraw(200000, 4200, SIM);
    const big = solveSafeDraw(600000, 4200, SIM);
    expect(big).toBeGreaterThan(small);
    expect(solveSafeDraw(415000, 4200, SIM)).toBe(solveSafeDraw(415000, 4200, SIM));
  });
});

describe('buildPaycheckYear — the month-by-month truth', () => {
  const y = buildPaycheckYear(june, { nestEgg: 415000, sim: SIM, now: NOW });
  test('December carries the pension lump; ordinary months carry Social Security only', () => {
    const dec = y.months.find((m) => m.calendarMonth === 12)!;
    expect(dec.guaranteedTotal).toBe(2600 + 19200);
    const aug = y.months.find((m) => m.calendarMonth === 8)!;
    expect(aug.guaranteedTotal).toBe(2600);
    expect(dec.netSafeToSpend).toBeGreaterThan(aug.netSafeToSpend);   // visibly NOT a flat average
  });
  test('November’s property tax dents November only — the rows sum to the number', () => {
    const nov = y.months.find((m) => m.calendarMonth === 11)!;
    expect(nov.bills).toContainEqual(expect.objectContaining({ label: 'Property tax', amount: 1900, day: 15 }));
    expect(nov.netSafeToSpend).toBeCloseTo(nov.guaranteedTotal + nov.safeDraw - 1900, 2);
    const oct = y.months.find((m) => m.calendarMonth === 10)!;
    expect(oct.billsTotal).toBe(0);                                    // everyday rent is NOT subtracted
  });
  test('this-year = the EXACT sum of the 12 months (never monthly × 12)', () => {
    expect(y.thisYear).toBeCloseTo(y.months.reduce((t, m) => t + m.netSafeToSpend, 0), 2);
    expect(Math.abs(y.thisYear - y.thisMonth.netSafeToSpend * 12)).toBeGreaterThan(1000);   // pension+tax make them differ
  });
  test('labels are dated across the wrap', () => {
    expect(y.months[0].label).toBe('Jul');
    expect(y.months[6].label).toBe('Jan ’27');
  });
  test('no guaranteed income → guaranteedMissing, draw-only paycheck, never a fake $0 guaranteed line', () => {
    const noRi = buildPaycheckYear({ status: 'retired', incomeSources: ['retirement_income'] } as any, { nestEgg: 300000, sim: SIM, now: NOW });
    expect(noRi.guaranteedMissing).toBe(true);
    expect(noRi.thisMonth.guaranteed).toHaveLength(0);
    expect(noRi.safeDrawMonthly).toBeGreaterThan(0);
  });
  test('drawRateFlag: a short horizon that solves above the 4% guideline is flagged, not hidden', () => {
    const shortHorizon = buildPaycheckYear(june, { nestEgg: 415000, sim: { ...SIM, current_age: 86, horizon_age: 90 }, now: NOW });
    expect((shortHorizon.safeDrawMonthly * 12) / 415000).toBeGreaterThan(0.045);
    expect(shortHorizon.drawRateFlag).toBe('high');
  });
});

// ── THE RETURN THE PAYCHECK RUNS ON IS THE COCKPIT'S (2026-10-25, FIX-ROOM; the lead's ruling on CFR-4's second question) ──
// One number on both screens: for every basis the cockpit offers, paycheckReturn gives exactly the return and volatility
// MK-PL-F-067 willItLastInputs hands the Retirement cockpit's simulation — read from the cockpit's own function, never retyped.
import { paycheckReturn } from './index';
import { willItLastInputs } from '../retirement/willItLast';

describe('paycheckReturn — the Retirement cockpit\'s return, one number on both screens (agreement)', () => {
  const op = { birthYear: 1958, status: 'retired', monthlySpending: 4000 };
  const STOCKS = { asset_id: 's', kind: 'stocks_etf', label: 'Stocks / Funds', tax_bucket: 'TAXABLE', balance: 300_000, retirement_pct: 100 };
  const BONDS = { asset_id: 'b', kind: 'fixed_income', label: 'Fixed income', tax_bucket: 'TAXABLE', balance: 100_000, retirement_pct: 100 };
  const CASES: [string, any[], Record<string, any>][] = [
    ['nothing set aside, nothing set', [], {}],
    ['nothing set aside, the store\'s nulls', [], { expectedReturn: null, returnBasis: null }],
    ['accounts, no return set (the blended benchmark)', [STOCKS, BONDS], {}],
    ['accounts, a return set on the Plan (scenario)', [STOCKS, BONDS], { expectedReturn: 0.1, returnBasis: 'scenario' }],
    ['accounts, the 12-month basis', [STOCKS, BONDS], { returnBasis: 'actual' }],
    ['no accounts, a return set on the Plan', [], { expectedReturn: 0.07, returnBasis: 'scenario' }],
  ];
  test.each(CASES)('%s', (_name, accounts, assumptions) => {
    const cockpit = willItLastInputs({ op, accounts, assumptions } as any)!;
    const pay = paycheckReturn(accounts as any, assumptions, op);
    expect(pay.mean_return).toBe(cockpit.mean_return);
    expect(pay.vol_return).toBe(cockpit.vol_return);
  });
  test('with nothing set aside and nothing set: 6.00% a year, volatility 10.2% — and the figure is stated, not hidden', () => {
    const r = paycheckReturn([], {}, op);
    expect([r.mean_return, r.vol_return, r.basis]).toEqual([0.06, expect.any(Number), 'typical']);
    expect(r.vol_return).toBeCloseTo(0.102, 12);   // volOf(6%) = 6% × 1.7
    expect(r.said).toBe('6.00%/year — the typical return, with nothing set aside for retirement');   // canon row 14 (2026-10-26)
  });
  test('a return set on the Plan is named as such; the blended benchmark as such', () => {
    expect(paycheckReturn([], { expectedReturn: 0.07, returnBasis: 'scenario' }, op).said).toBe('7.00%/year — your scenario return');
    const blended = paycheckReturn([STOCKS, BONDS] as any, {}, op);
    expect(blended.basis).toBe('benchmark');
    // the agreement above is not two 6% stand-ins agreeing: these accounts blend to their own rate
    expect(blended.mean_return).not.toBe(0.06);
    expect(blended.said).toBe(`${(blended.mean_return * 100).toFixed(2)}%/year — the blended benchmark`);
    // the paycheck ran 5.5% here until now (useCashflowModel, `A.expectedReturn ?? 0.055`): the two screens disagreed
    expect(blended.mean_return).not.toBe(0.055);
  });
});
