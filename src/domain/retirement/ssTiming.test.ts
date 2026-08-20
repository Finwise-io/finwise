// Pins the SSA schedule the compare table, adoption patch and info-dot all share.
import { ssClaimFactor, ssBenefitAtClaimAge, ssLifetimeTotal, claimWindow } from './ssTiming';

describe('ssClaimFactor — the standard SSA schedule', () => {
  test('THE pin: the 67 row equals the statement amount exactly (factor 1.0)', () => {
    expect(ssClaimFactor(67)).toBe(1);
    expect(ssBenefitAtClaimAge(2600, 67)).toBe(2600);
  });

  test('62 ≈ 70% (five years early: 3×6.67% + 2×5%)', () => {
    expect(ssClaimFactor(62)).toBeCloseTo(0.70, 10);
    expect(ssBenefitAtClaimAge(2600, 62)).toBe(1820);
  });

  test('70 = 124% (three years of 8% delayed credit)', () => {
    expect(ssClaimFactor(70)).toBeCloseTo(1.24, 10);
    expect(ssBenefitAtClaimAge(2600, 70)).toBe(3224);
  });

  test('every year of waiting raises the check (monotonic 62→70)', () => {
    for (let a = 62; a < 70; a++) expect(ssClaimFactor(a + 1)).toBeGreaterThan(ssClaimFactor(a));
  });

  test('ages outside the window clamp (no invented factors)', () => {
    expect(ssClaimFactor(60)).toBe(ssClaimFactor(62));
    expect(ssClaimFactor(75)).toBe(ssClaimFactor(70));
  });
});

describe('lifetime totals (the design example: statement $2,600, live to 90)', () => {
  test('62: $1,820 × 336 months = $611,520', () => {
    expect(ssLifetimeTotal(2600, 62, 90)).toBe(611_520);
  });
  test('67: $2,600 × 276 months = $717,600', () => {
    expect(ssLifetimeTotal(2600, 67, 90)).toBe(717_600);
  });
  test('70: $3,224 × 240 months = $773,760', () => {
    expect(ssLifetimeTotal(2600, 70, 90)).toBe(773_760);
  });
});

describe('claimWindow', () => {
  test('opens the month they turn 62, closes at 70', () => {
    expect(claimWindow(1964, 9)).toEqual({ opens: '2026-09', closes: '2034-09', opensYear: 2026, opensMonth: 9 });
  });
  test('missing birth month defaults to January; missing year → null', () => {
    expect(claimWindow(1964, null)).toEqual({ opens: '2026-01', closes: '2034-01', opensYear: 2026, opensMonth: 1 });
    expect(claimWindow(null, 6)).toBeNull();
  });
});

// ── B2 (founder brief 2026-08-20): the full-retirement-age table by birth year ──
describe('the FRA table — the oldest third of the audience is not born 1960+', () => {
  const { fullRetirementAge, ssClaimFactorFor } = require('./ssTiming');

  test('the statutory schedule: 66 through 1954, two months per year 1955–1959, 67 from 1960', () => {
    expect(fullRetirementAge(1954)).toBe(66);
    expect(fullRetirementAge(1956)).toBeCloseTo(66 + 4 / 12, 10);
    expect(fullRetirementAge(1957)).toBeCloseTo(66.5, 10);
    expect(fullRetirementAge(1959)).toBeCloseTo(66 + 10 / 12, 10);
    expect(fullRetirementAge(1960)).toBe(67);
    expect(fullRetirementAge(null)).toBe(67);       // no birth year → the 1960+ default
  });

  test('born 1957 (FRA 66y6m): claiming at 67 is six months of DELAYED credit, not the anchor', () => {
    expect(ssClaimFactorFor(67, 1957)).toBeCloseTo(1 + 6 * (2 / 3) / 100, 10);   // 1.04
  });

  test('born 1957 claiming at 62: 54 months early = 36×5⁄9% + 18×5⁄12% = 27.5% reduction', () => {
    expect(ssClaimFactorFor(62, 1957)).toBeCloseTo(1 - 0.275, 10);
  });

  test('born 1960+ reproduces the old anchored-at-67 factors exactly', () => {
    expect(ssClaimFactorFor(62, 1965)).toBeCloseTo(0.70, 10);
    expect(ssClaimFactorFor(70, 1965)).toBeCloseTo(1.24, 10);
  });
});
