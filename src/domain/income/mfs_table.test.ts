/* Married filing separately — the laws.
 *
 * Added 2026-08-27. MFS is statutorily HALF of married filing jointly (IRC §1), so these are laws
 * about the RELATIONSHIP between two tables, not remembered numbers. If someone updates the joint
 * figures next year and forgets MFS, this fails — which is the point.
 */
import { TAX_TABLES, taxOwedFor, deductionFor } from './tax';

describe('married filing separately', () => {
  it('THE LAW: every band is half the married-filing-jointly band', () => {
    const mfj = TAX_TABLES.married.brackets, mfs = TAX_TABLES.mfs.brackets;
    expect(mfs.length).toBe(mfj.length);
    mfj.forEach(([upper, rate], i) => {
      expect(mfs[i][1]).toBe(rate);                                  // same rates
      expect(mfs[i][0]).toBe(upper === Infinity ? Infinity : upper / 2);
    });
  });

  it('THE LAW: the deduction is half the joint deduction', () => {
    expect(TAX_TABLES.mfs.deduction).toBe(TAX_TABLES.married.deduction / 2);
    expect(deductionFor('mfs')).toBe(TAX_TABLES.married.deduction / 2);
  });

  it('THE LAW: below $384,350 of taxable income it is identical to single, to the cent', () => {
    for (const gross of [40_000, 84_000, 120_000, 200_000, 300_000, 396_000]) {
      expect(taxOwedFor(gross, 'mfs')).toBeCloseTo(taxOwedFor(gross, 'single'), 2);
    }
  });

  it('THE LAW: above it they diverge, and MFS pays more', () => {
    for (const gross of [450_000, 700_000]) {
      expect(taxOwedFor(gross, 'mfs')).toBeGreaterThan(taxOwedFor(gross, 'single'));
    }
  });

  it('THE LAW: the capital-gains thresholds are half the joint ones too', () => {
    // tsc found this second table when the type gained 'mfs'. A law so the next one cannot be missed.
    const { ltcgRateFor } = require('./tax');
    expect(ltcgRateFor(40_000, 'mfs')).toBe(ltcgRateFor(40_000, 'single'));      // both 0%
    expect(ltcgRateFor(400_000, 'mfs')).toBeGreaterThan(ltcgRateFor(400_000, 'single'));
  });

  it('two people filing separately owe the same as one couple filing jointly, on equal incomes', () => {
    // the structural check: halving the bands means splitting the income changes nothing
    for (const each of [60_000, 150_000]) {
      expect(taxOwedFor(each, 'mfs') * 2).toBeCloseTo(taxOwedFor(each * 2, 'married'), 2);
    }
  });
});
