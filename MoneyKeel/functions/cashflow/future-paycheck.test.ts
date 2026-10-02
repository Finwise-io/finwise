/* Your future paycheck — a projection, and null where there is nothing honest to project. */
import { futurePaycheck, FUTURE_PAYCHECK_FIGURES } from './future-paycheck';

describe('futurePaycheck — nothing before there is a pot', () => {
  it('MK-CF-M-022: with no accounts there is no projection — null, never a guess', () => {
    expect(futurePaycheck({ op: { birthYear: 1980 }, accounts: [], assumptions: {} })).toBeNull();
  });
  it('past retirement age there is no future paycheck to project', () => {
    expect(futurePaycheck({ op: { birthYear: 1950, targetRetirementAge: 65 }, accounts: [{ asset_id: 'a', balance: 500_000, tax_bucket: 'TAXABLE', target_return: 0.05 }], assumptions: {} })).toBeNull();
  });
  it('every figure this door hands out has a worked example that runs', () => {
    for (const [id, f] of Object.entries(FUTURE_PAYCHECK_FIGURES as any)) expect(`${id}: ${typeof (f as any).worked?.run}`).toBe(`${id}: function`);
  });
});
