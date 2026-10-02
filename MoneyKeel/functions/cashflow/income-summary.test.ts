/* Income summary — the door the Income screen, Income manager, Monthly income and Log income read. */
import { incomeSources, incomeSummary, hourlyEarned, monthlyEquivalent, annualOfSource, FIGURES } from './income-summary';

const op = {
  taxMode: 'manual', manualTaxRate: 22, filingStatus: 'married', whoEarns: 'both',
  baseSalary: 4200, salaryFreq: 'biweekly', salaryMode: 'gross', c_401k: 1200,
  partnerName: 'Sam', partnerWage: { baseSalary: 5000, salaryFreq: 'monthly', salaryMode: 'gross', c_401k: 400 },
  seAmount: 24000, seFreq: 'yearly', bonusAnnual: 12000, bonusMonth: 3, rsuShares: '50', rsuPrice: '400',
  rentalIncome: 2000, rentalExpenses: 800, ri_ss: '2100', ri_ss_receiving: 'yes', ri_ss_freq: 'monthly',
};

describe('MK-CF-O-004 incomeSummary — every source, named, never converted silently', () => {
  it('MK-CF-M-006 to 011: one row per kind, each in the period it was entered', () => {
    const kinds = incomeSources(op).map((s) => `${s.kind}:${s.per}`);
    expect(kinds).toEqual(['salary:as entered', 'salary:as entered', 'self-employment:year', 'bonus:year', 'equity:year', 'rental:month', 'guaranteed:month']);
    expect(incomeSources(op).find((s) => s.kind === 'rental')!.amount).toBe(1200);   // (2,000 − 800) a month
    expect(incomeSources(op).find((s) => s.kind === 'equity')!.amount).toBe(20_000);  // 50 × $400
  });
  it('MK-CF-M-037: the usual month is one figure from every source together', () => {
    expect(incomeSummary(op).lands.usualMonth).toBeGreaterThan(0);
  });
  it('MK-CF-M-067 / 068: log income arithmetic — hours × rate, and a month at the frequency picked', () => {
    expect(hourlyEarned(37.5, 24)).toBe(900);
    expect(monthlyEquivalent(900, 'weekly')).toBeCloseTo(3897, 0);
    expect(monthlyEquivalent(5000, 'annually')).toBeCloseTo(416.67, 1);
    expect(monthlyEquivalent(1200, 'weekly', 'lump')).toBe(1200);            // a one-off is itself
  });
  it('MK-CF-M-027: a yearly amount for every source — monthly × 12, yearly as it is', () => {
    expect(annualOfSource({ label: 'x', note: '', amount: 1200, per: 'month', kind: 'rental' })).toBe(14_400);
    expect(annualOfSource({ label: 'x', note: '', amount: 12_000, per: 'year', kind: 'bonus' })).toBe(12_000);
  });
  it('every figure this door hands out has a worked example that runs', () => {
    for (const [id, f] of Object.entries(FIGURES as any)) expect(`${id}: ${typeof (f as any).worked?.run}`).toBe(`${id}: function`);
  });
});
