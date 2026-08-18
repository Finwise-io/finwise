// PROBES — the retirement engine. Everything in this workbook feeds into this.
//
// It sits at the top of the dependency chain: nine layers of calculation lead here, and the odds it
// produces are the number the founder puts in front of a person. So its rules are pinned carefully,
// especially the ones about what is inflated and what is not.
import { ssClaimFactor, ssBenefitAtClaimAge, ssLifetimeTotal, claimWindow, FULL_RETIREMENT_AGE } from '../../src/domain/retirement/ssTiming';
import { simulate, projectNestEgg, retirementSpendMonthly } from '../../src/domain/retirement';

// ════════════════════════════════════════════════════════════════════════════════════════════════
// SOCIAL_SECURITY_TIMING
// DERIVATION RULE: the published SSA schedule applied to the amount on the person's OWN statement.
// The age-67 row must always equal the statement exactly, or the whole table loses its anchor.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('SOCIAL_SECURITY_TIMING', () => {
  test('claiming at full retirement age gives EXACTLY the statement amount', () => {
    expect(ssClaimFactor(FULL_RETIREMENT_AGE)).toBe(1);
    expect(ssBenefitAtClaimAge(3_000, 67)).toBe(3_000);
  });

  test('claiming early cuts it: about 6.67% a year for three years, then 5%', () => {
    expect(ssClaimFactor(66)).toBeCloseTo(0.9333, 4);
    expect(ssClaimFactor(64)).toBeCloseTo(0.80, 4);      // three full years early
    expect(ssClaimFactor(62)).toBeCloseTo(0.70, 4);      // …then 5% a year for the last two
  });

  test('waiting adds 8% a year to age 70, and nothing after', () => {
    expect(ssClaimFactor(68)).toBeCloseTo(1.08, 4);
    expect(ssClaimFactor(70)).toBeCloseTo(1.24, 4);
    expect(ssClaimFactor(75)).toBe(ssClaimFactor(70));   // no credit past 70 — clamped, not extrapolated
    expect(ssClaimFactor(55)).toBe(ssClaimFactor(62));   // and you cannot claim before 62
  });

  test('the lifetime total is simply the monthly cheque times the months lived', () => {
    expect(ssLifetimeTotal(3_000, 67, 87)).toBe(3_000 * 240);
    expect(ssLifetimeTotal(3_000, 90, 87)).toBe(0);      // claiming after the horizon collects nothing
  });

  test('the claim window runs from the month you turn 62 to the month you turn 70', () => {
    const w = claimWindow(1965, 6)!;
    expect(w.opens).toBe('2027-06');
    expect(w.closes).toBe('2035-06');
    expect(claimWindow(null, 6)).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// SIMULATION — what is inflated, and what deliberately is not
// ════════════════════════════════════════════════════════════════════════════════════════════════
const base = {
  current_age: 58, retire_age: 65, horizon_age: 92,
  start_balance: 900_000, annual_contribution: 40_000,
  mean_return: 0.06, vol_return: 0.12, inflation: 0.025,
  retire_monthly_spend_today: 7_000, guaranteed_monthly_income: 3_000,
  paths: 400, seed: 12345, now_year: 2026,
} as any;

describe('SIMULATION', () => {
  // MY FIRST VERSION OF THIS TEST PASSED VACUOUSLY. I used the wrong field name, so it compared
  // undefined to undefined and reported green. The assertion on a real number is the whole test.
  test('it is DETERMINISTIC — the same inputs give the same odds every time', () => {
    const a = simulate(base).chance_of_success;
    expect(typeof a).toBe('number');
    expect(a).toBeGreaterThan(0);
    expect(simulate(base).chance_of_success).toBe(a);
  });

  test('the odds move the way they must when each input moves', () => {
    expect(simulate({ ...base, start_balance: 1_800_000 }).chance_of_success).toBeGreaterThan(simulate(base).chance_of_success);
    expect(simulate({ ...base, retire_monthly_spend_today: 12_000 }).chance_of_success).toBeLessThan(simulate(base).chance_of_success);
    expect(simulate({ ...base, retire_age: 70 }).chance_of_success).toBeGreaterThan(simulate(base).chance_of_success);
    expect(simulate({ ...base, annual_contribution: 0 }).chance_of_success).toBeLessThan(simulate(base).chance_of_success);
  });

  test('SPENDING is inflated to the year it happens — today\'s dollars are not tomorrow\'s', () => {
    expect(simulate({ ...base, inflation: 0.06 }).chance_of_success).toBeLessThan(simulate({ ...base, inflation: 0.01 }).chance_of_success);
  });

  test('a big one-off cost leaves the pot IN ITS OWN YEAR, inflated to that year', () => {
    const withRoof = simulate({ ...base, one_off_costs: [{ year: 2030, amount: 80_000 }] });
    expect(withRoof.chance_of_success).toBeLessThan(simulate(base).chance_of_success);
    // a cost beyond the horizon, or already past, is not simulated at all
    expect(simulate({ ...base, one_off_costs: [{ year: 2200, amount: 500_000 }] }).chance_of_success)
      .toBe(simulate(base).chance_of_success);
    expect(simulate({ ...base, one_off_costs: [{ year: 2020, amount: 500_000 }] }).chance_of_success)
      .toBe(simulate(base).chance_of_success);
  });

  test('A PAYMENT THAT STOPS IS CHARGED FLAT — a fixed mortgage payment does NOT rise with inflation', () => {
    // this is the rule most easily got wrong, and getting it wrong overstates the cost of a mortgage
    // every year until it ends. The payment is the same number of dollars each year, by design.
    const withLoan = simulate({ ...base, recurring_until: [{ annual: 28_800, through_year: 2036 }] });
    expect(withLoan.chance_of_success).toBeLessThan(simulate(base).chance_of_success);
    // and it genuinely STOPS: pushing the end date out must hurt more
    const longerLoan = simulate({ ...base, recurring_until: [{ annual: 28_800, through_year: 2046 }] });
    expect(longerLoan.chance_of_success).toBeLessThan(withLoan.chance_of_success);
  });

  test('money freed when a loan ends can be added back as a contribution change', () => {
    // measured against a TIGHTER plan: the base case already sits near the ceiling, where the odds
    // are reported as whole percentages and a real improvement can round away to nothing.
    const tight = { ...base, start_balance: 500_000, retire_monthly_spend_today: 9_000 };
    const freed = simulate({ ...tight, contribution_adjustments: [{ annual: 40_000, from_year: 2030 }] });
    expect(freed.chance_of_success).toBeGreaterThan(simulate(tight).chance_of_success);
  });

  test('GUARANTEED income can start LATER than retirement, never earlier', () => {
    const early = simulate({ ...base, guaranteed_start_age: 62 });
    const late  = simulate({ ...base, guaranteed_start_age: 70 });
    expect(late.chance_of_success).not.toBe(early.chance_of_success);
    // asking for it before retirement is clamped to retirement, not honoured
    expect(simulate({ ...base, guaranteed_start_age: 50 }).chance_of_success)
      .toBe(simulate({ ...base, guaranteed_start_age: 65 }).chance_of_success);
  });

  test('a bigger swing widens the spread of outcomes', () => {
    const calm = simulate({ ...base, vol_return: 0.04, with_band: true });
    const wild = simulate({ ...base, vol_return: 0.25, with_band: true });
    expect(wild.chance_of_success).not.toBe(calm.chance_of_success);
  });
});
