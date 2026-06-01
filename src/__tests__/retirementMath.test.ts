/**
 * Tests for the retirement calculator math used in RetirementScreen.tsx.
 * These formulas are extracted here to verify correctness in isolation.
 */

function calcFutureValue(
  currentNestEgg: number,
  monthlyContrib: number,
  employerMatch: number,
  annualReturnPct: number,
  yearsToRetire: number,
): number {
  const monthsToRetire = yearsToRetire * 12;
  const r = annualReturnPct / 100 / 12;
  const effectiveMonthly = monthlyContrib + employerMatch;
  if (monthsToRetire <= 0 || r <= 0) return currentNestEgg;
  return (
    currentNestEgg * Math.pow(1 + r, monthsToRetire) +
    effectiveMonthly * ((Math.pow(1 + r, monthsToRetire) - 1) / r)
  );
}

function calcRealFutureValue(nominalFV: number, inflationPct: number, years: number): number {
  if (years <= 0) return nominalFV;
  return nominalFV / Math.pow(1 + inflationPct / 100, years);
}

function calcRetirementTarget(monthlyIncome: number, nestEggYears: number): number {
  return monthlyIncome * 12 * nestEggYears;
}

function calcMonthlyNeeded(
  retirementTarget: number,
  currentNestEgg: number,
  annualReturnPct: number,
  yearsToRetire: number,
  employerMatch: number,
): number {
  const monthsToRetire = yearsToRetire * 12;
  const r = annualReturnPct / 100 / 12;
  const fv = calcFutureValue(currentNestEgg, 0, 0, annualReturnPct, yearsToRetire);
  if (retirementTarget <= fv) return 0;
  return Math.max(
    0,
    (retirementTarget - currentNestEgg * Math.pow(1 + r, monthsToRetire)) /
      ((Math.pow(1 + r, monthsToRetire) - 1) / r) - employerMatch,
  );
}

describe('Retirement calculator — future value', () => {
  it('returns currentNestEgg when years = 0', () => {
    expect(calcFutureValue(50000, 500, 0, 7, 0)).toBe(50000);
  });

  it('returns currentNestEgg when return rate = 0', () => {
    expect(calcFutureValue(50000, 500, 0, 0, 30)).toBe(50000);
  });

  it('grows a lump sum correctly at 7% over 30 years', () => {
    const fv = calcFutureValue(100000, 0, 0, 7, 30);
    // 100k * (1 + 0.07/12)^360
    const expected = 100000 * Math.pow(1 + 0.07 / 12, 360);
    expect(fv).toBeCloseTo(expected, 0);
  });

  it('larger contributions produce a larger future value', () => {
    const low  = calcFutureValue(0, 300, 0, 7, 30);
    const high = calcFutureValue(0, 600, 0, 7, 30);
    expect(high).toBeGreaterThan(low);
  });

  it('adds employer match to monthly contribution', () => {
    const noMatch    = calcFutureValue(0, 500, 0,   7, 30);
    const withMatch  = calcFutureValue(0, 500, 200, 7, 30);
    expect(withMatch).toBeGreaterThan(noMatch);
  });
});

describe('Retirement calculator — inflation adjustment', () => {
  it('returns nominalFV unchanged when years = 0', () => {
    expect(calcRealFutureValue(500000, 3.2, 0)).toBe(500000);
  });

  it('real value is always less than nominal when inflation > 0', () => {
    const nominal = calcFutureValue(50000, 500, 0, 7, 30);
    const real    = calcRealFutureValue(nominal, 3.2, 30);
    expect(real).toBeLessThan(nominal);
  });

  it('higher inflation produces a lower real future value', () => {
    const nominal = calcFutureValue(50000, 500, 0, 7, 30);
    const lowInfl  = calcRealFutureValue(nominal, 2, 30);
    const highInfl = calcRealFutureValue(nominal, 5, 30);
    expect(highInfl).toBeLessThan(lowInfl);
  });
});

describe('Retirement calculator — target & shortfall', () => {
  it('calculates retirement target as annual income × nest egg years', () => {
    expect(calcRetirementTarget(5000, 20)).toBe(5000 * 12 * 20);
    expect(calcRetirementTarget(3000, 25)).toBe(3000 * 12 * 25);
  });

  it('returns 0 monthly needed when already on track', () => {
    const target  = calcRetirementTarget(2000, 20);  // $480,000
    const fv      = calcFutureValue(1000000, 0, 0, 7, 30); // well over target
    expect(calcMonthlyNeeded(target, 1000000, 7, 30, 0)).toBe(0);
  });

  it('returns a positive amount when there is a shortfall', () => {
    const needed = calcMonthlyNeeded(2000000, 0, 7, 30, 0);
    expect(needed).toBeGreaterThan(0);
  });

  it('employer match reduces monthly needed', () => {
    const noMatch   = calcMonthlyNeeded(2000000, 10000, 7, 30, 0);
    const withMatch = calcMonthlyNeeded(2000000, 10000, 7, 30, 300);
    expect(withMatch).toBeLessThan(noMatch);
  });
});
