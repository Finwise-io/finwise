/* Income summary — the door the Income screen, Income manager, Monthly income and Log income read. */
import * as fs from 'fs';
import * as path from 'path';
import { incomeSources, incomeSummary, FIGURES } from './income-summary';
import * as SUMMARY from './income-summary';

const op = {
  taxMode: 'manual', manualTaxRate: 22, filingStatus: 'married', whoEarns: 'both',
  baseSalary: 4200, salaryFreq: 'biweekly', salaryMode: 'gross', c_401k: 1200,
  partnerName: 'Sam', partnerWage: { baseSalary: 5000, salaryFreq: 'monthly', salaryMode: 'gross', c_401k: 400 },
  seAmount: 24000, seFreq: 'annual', bonusAnnual: 12000, bonusMonth: 3, rsuShares: '50', rsuPrice: '400',
  rentals: [{ type: 'long', income: 2000, expenses: 800, property_id: 'p' }], ri_ss: '2100', ri_ss_receiving: 'yes', ri_ss_freq: 'monthly',
};

describe('MK-CF-O-004 incomeSummary — every source, named, never converted silently', () => {
  it('MK-CF-M-006 to 011: one row per kind, each in the period it was entered', () => {
    const kinds = incomeSources(op).map((s) => `${s.kind}:${s.per}`);
    // in the Income tab's drawn order (2026-10-25, FIX-INCOME-B: the tab reads this list) — the rentals, then the equity
    expect(kinds).toEqual(['salary:as entered', 'salary:as entered', 'self-employment:year', 'bonus:year', 'rental:month', 'equity:year', 'guaranteed:month']);
    expect(incomeSources(op).find((s) => s.kind === 'rental')!.amount).toBe(1200);   // (2,000 − 800) a month
    expect(incomeSources(op).find((s) => s.kind === 'equity')!.amount).toBe(20_000);  // 50 × $400
  });
  it('MK-CF-M-037: the usual month is one figure from every source together', () => {
    expect(incomeSummary(op).lands.usualMonth).toBeGreaterThan(0);
  });
  // MK-CF-F-210 annualOfSource RETIRED 2026-10-25 (FIX-INCOME-B): nothing called it, and YOUR SOURCES never converts a row's period
  it('MK-CF-F-210 annualOfSource is retired: income-summary.ts no longer defines it and nothing calls it', () => {
    expect((SUMMARY as any).annualOfSource).toBeUndefined();
    expect(fs.readFileSync(path.join(__dirname, 'income-summary.ts'), 'utf8')).not.toMatch(/export function annualOfSource\(/);
  });
  it('every figure this door hands out has a worked example that runs', () => {
    for (const [id, f] of Object.entries(FIGURES as any)) expect(`${id}: ${typeof (f as any).worked?.run}`).toBe(`${id}: function`);
  });
});
