/** ROTH CONVERSION'S WORKED EXAMPLES, RUN (2026-10-31, PF-TOOLS; the lead's ruling the same day).
 *
 *  The Roth figures MK-PL-M-008, 022 to 024, 026 and 038 to 044 are not declared: no orchestrator hands them, and the Plan doors wait
 *  on his Q-PL-5 (workplan #121). Their numbers stay reserved on the metric register for the ruling they serve, DEC-8890. The worked
 *  examples written for them on 2026-10-30 are kept here, so the numbers are still proved: each one asks the functions RothScreen
 *  asks, on the accounts as resolveNetWorthRows hands them to it, and is written the way the screen writes money (money(), whole
 *  dollars, rounded once).
 *
 *  The household is the Roth v02 drawing's own, worked by hand in src/screens/__tests__/plan_drawings_from_build_2026_10_26.test.tsx:
 *  born 1966 and so 60 in 2026, single, $70,000 of wages with $10,000 of it into a 401(k), $4,500/month of expenses; Checking
 *  $20,000, a traditional IRA $415,000, a Roth IRA $88,000; $20,000 converted in 2026. The age and the year are stated, not read off
 *  the clock, so an example never moves overnight.
 *
 *  MK-PL-M-022, the amount converted, has no example: its cap at the pre-tax balance is worked on RothScreen itself, in no function.
 */
import { resolveNetWorthRows } from '../snapshot';
import { taxBucketSplit } from '../decumulation';
import { paycheckReturn, growthUsed } from '../paycheck';
import { taxedAfterPreTax } from '../income/tax-rate';
import { profileWithAccountIncome } from '../income/onboarding';
import { selectWillItLast } from '../retirement/willItLast';
import { projectNestEgg } from '../retirement';
import { rothConversionCost } from './index';
import { rothConversionLater, accountsAfterRothConversion } from './rothConversion';
import { money } from '../_shared/num';

const OP: Record<string, any> = { status: 'employed', incomeSources: ['employment'], birthYear: '1966', filingStatus: 'single', whoEarns: 'you',
  baseSalary: String(70_000 / 12), salaryFreq: 'monthly', salaryMode: 'gross', c_401k: String(10_000 / 12), monthlySpending: '4500' };
const ACCOUNTS: any[] = [
  { asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 20_000 },
  { asset_id: 'ira', label: 'IRA', institution: 'Fidelity', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 415_000 },
  { asset_id: 'roth', label: 'Roth IRA', kind: 'roth_ira', tax_bucket: 'ROTH', balance: 88_000 },
];
const AMOUNT = 20_000, AGE = 60, YEAR = 2026;

const accounts = resolveNetWorthRows('local', OP as any, false, ACCOUNTS, []).accounts;
const split = taxBucketSplit(accounts);
const growth = growthUsed(paycheckReturn(accounts, {}, OP));
const later = rothConversionLater({ preTax: split.preTax, roth: split.roth, amount: AMOUNT, age: AGE, growthRate: growth.rate, nowYear: YEAR });
const tax = rothConversionCost(taxedAfterPreTax(profileWithAccountIncome(OP as any, accounts, [])), AMOUNT, 'single', 0);
const before = selectWillItLast({ op: OP, accounts, assumptions: {}, transactions: [] } as any);
// the nest egg at 65 on the inputs the odds run on, at the stated age: five years of growth from 2026 (MK-PL-F-055 projectNestEgg)
const at65 = (r: any) => (r?.inputs ? projectNestEgg({ ...r.inputs, current_age: AGE, now_year: YEAR }).will_have : null);

const CASES: [string, string, () => number | null, string][] = [
  ['MK-PL-M-008', 'the nest egg the odds run on', () => before.inputs?.start_balance ?? null, '$523,000'],
  ['MK-PL-M-023', 'the tax on the conversion — on $60,000 taxed, $20,000 more: 12% on $6,500 and 22% on $13,500', () => tax, '$3,750'],
  ['MK-PL-M-024', 'your pre-tax money', () => split.preTax, '$415,000'],
  ['MK-PL-M-038', 'your pre-tax money after converting — $415,000 − $20,000', () => later.preTaxAfter, '$395,000'],
  ['MK-PL-M-039', 'your Roth money', () => split.roth, '$88,000'],
  ['MK-PL-M-040', 'your Roth money after converting — $88,000 + $20,000', () => later.rothAfter, '$108,000'],
  ['MK-PL-M-041', 'the first required withdrawal at 75, 15 years on, as you are', () => later.rmdBefore, '$50,737'],
  ['MK-PL-M-042', 'the first required withdrawal at 75, after converting', () => later.rmdAfter, '$48,292'],
  ['MK-PL-M-043', 'how much smaller each required withdrawal is, a year', () => later.smaller, '$2,445'],
  ['MK-PL-M-044', 'the amount converted, grown to the first required withdrawal', () => later.grown, '$60,151'],
  ['MK-PL-M-026', 'your nest egg at 65, five years on, adding $10,000/year', () => at65(before), '$813,149'],
];

describe('Roth conversion — the worked examples of its reserved figures (DEC-8890), run on the drawing’s household', () => {
  test.each(CASES)('%s %s: %s', (_id, _what, run, answer) => {
    const v = run();
    expect(v).not.toBeNull();
    expect(money(v as number)).toBe(answer);
  });

  test('the cases cover the eleven figures that can be worked — every reserved one but MK-PL-M-022', () => {
    expect(CASES.map((c) => c[0]).sort()).toEqual(['MK-PL-M-008', 'MK-PL-M-023', 'MK-PL-M-024', 'MK-PL-M-026', 'MK-PL-M-038', 'MK-PL-M-039',
      'MK-PL-M-040', 'MK-PL-M-041', 'MK-PL-M-042', 'MK-PL-M-043', 'MK-PL-M-044']);
  });

  test('the conversion as it is done: $20,000 from the IRA to the Roth, the $3,750 tax from Checking', () => {
    const after = accountsAfterRothConversion(accounts, AMOUNT, tax);
    const bal = (id: string) => after.find((a: any) => a.asset_id === id)?.balance;
    expect([bal('ira'), bal('roth')]).toEqual([395_000, 108_000]);
    // $20,000 − $3,750 = $16,250; the tax is held at full precision (Q49), so the cash is that to within a millionth of a cent
    expect(bal('chk')).toBeCloseTo(16_250, 6);
  });
});
