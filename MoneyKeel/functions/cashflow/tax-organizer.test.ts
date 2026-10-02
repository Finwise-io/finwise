/* The tax organizer's door — the year's taxable lines, and the figures the Menu screen prints. */
import { theTaxOrganizer, TAX_ORGANIZER_FIGURES } from './tax-organizer';

const op = {
  taxMode: 'manual', manualTaxRate: 22, filingStatus: 'married', whoEarns: 'both',
  baseSalary: 4200, salaryFreq: 'biweekly', salaryMode: 'gross', c_401k: 1200,
  partnerName: 'Sam', partnerWage: { baseSalary: 5000, salaryFreq: 'monthly', salaryMode: 'gross', c_401k: 400 },
};

describe('MK-CF-F-202 TAX — the organizer on its own example', () => {
  it('MK-MN-M-028: gross − 401(k) − the standard deduction = taxable income, and the steps add up', () => {
    const t = theTaxOrganizer({ profile: op, accounts: [], debts: [], transactions: [], year: 2026 } as any);
    const s = t.steps;
    expect(s.grossIncome).toBeGreaterThan(0);
    expect(s.taxableIncome).toBeCloseTo(Math.max(0, s.grossIncome - s.preTaxContributions - s.standardDeduction), 0);
  });
  it('every figure this door hands out has a worked example that runs', () => {
    for (const [id, f] of Object.entries(TAX_ORGANIZER_FIGURES as any)) expect(`${id}: ${typeof (f as any).worked?.run}`).toBe(`${id}: function`);
  });
});
