/** GUARD D4 — a published figure names its source (build spec; finding A41).
 *
 *  Every statutory figure in the code — tax bands, the standard deduction, the senior deduction,
 *  contribution limits, the Social Security schedule and factors, the required-withdrawal table and
 *  start ages, the inflation default — is listed in ONE register,
 *  Calculation Module code/scripts/moneykeel_published_sources.json, with its publication, the year it
 *  applies to, when it was last checked, and where it sits in the code. The builder prints that
 *  register on the master's Reference tab, so the FILE names the sources (A41), and this guard fails
 *  the build when a figure is missing from the register, when a register entry points at a symbol
 *  that no longer exists, or when a figure's year has rolled past without a re-check.
 *
 *  What the figures ARE is checked by statutory_constants.test.ts against the published values;
 *  this guard checks that each one SAYS where it came from.
 */
import * as fs from 'fs';

interface Source { symbol: string; file: string; what: string; publication: string; valid_through: number; checked: string; note?: string }
const REGISTER = 'Calculation Module code/scripts/moneykeel_published_sources.json';
const sources: Source[] = JSON.parse(fs.readFileSync(REGISTER, 'utf8'));

/** The statutory symbols the code carries today. Add here when a new published figure lands. */
const STATUTORY: [string, string][] = [
  ['TAX_BRACKETS', 'src/domain/income/tax.ts'], ['TAX_TABLES', 'src/domain/income/tax.ts'],
  ['STANDARD_DEDUCTION', 'src/domain/income/tax.ts'], ['SENIOR_DEDUCTION', 'src/domain/income/tax.ts'], ['TAX_YEAR', 'src/domain/income/tax.ts'],
  ['IRS_LIMITS', 'src/domain/income/limits.ts'], ['annualHsaLimit', 'src/domain/income/limits.ts'], ['ageAttainedInYear', 'src/domain/income/limits.ts'],
  ['fullRetirementAge', 'src/domain/retirement/ssTiming.ts'], ['ssClaimFactorFor', 'src/domain/retirement/ssTiming.ts'],
  ['UNIFORM_LIFETIME', 'Calculation Module code/engines/rmd.ts'], ['rmdStartAge', 'Calculation Module code/engines/rmd.ts'],
  ['INFLATION_DEFAULT', 'src/domain/retirement/inflation.ts'],
  ['SS_WAGE_BASE', 'MoneyKeel/functions/cashflow/base-pay.ts'], ['MEDICARE_ADDITIONAL_THRESHOLD', 'MoneyKeel/functions/cashflow/base-pay.ts'],
];

test('every register entry points at a symbol that exists in the file it names', () => {
  const missing: string[] = [];
  for (const s of sources) {
    const text = fs.existsSync(s.file) ? fs.readFileSync(s.file, 'utf8') : '';
    if (!new RegExp(`\\b(export\\s+)?(const|function|let)\\s+${s.symbol}\\b`).test(text)) missing.push(`${s.symbol} not declared in ${s.file}`);
    for (const k of ['what', 'publication', 'checked'] as const) if (!s[k]) missing.push(`${s.symbol}: ${k} is blank`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.checked)) missing.push(`${s.symbol}: checked is not a date`);
  }
  expect(missing).toEqual([]);
});

test('every statutory figure in the code is in the register — a figure with no source is a defect (A41)', () => {
  const registered = new Set(sources.map((s) => `${s.file}::${s.symbol}`));
  const unregistered = STATUTORY.filter(([sym, file]) => !registered.has(`${file}::${sym}`)).map(([sym, file]) => `${sym} (${file})`);
  expect(unregistered).toEqual([]);
});

test('no figure is used past the year it applies to without a re-check', () => {
  const year = new Date().getFullYear();
  const stale = sources.filter((s) => s.valid_through < year).map((s) => `${s.symbol}: valid through ${s.valid_through}, it is ${year} — re-check against ${s.publication} and update the register`);
  expect(stale).toEqual([]);
});
