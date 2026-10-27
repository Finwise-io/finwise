/* THE OUTSIDE SOURCE CHECKS, RUN AGAINST THE APP — Cash flow module, OpenAI's independent audit of 2026-10-24,
 * MoneyKeel_CashFlow_Source_Checks.json: 10 primary sources, 6 statutory topics with 100 witnesses (the 48 ordinary-tax
 * band-top / one-dollar-above witnesses, 9 standard-deduction, 10 senior-deduction, 17 capital-gains, 9 contribution-limit and
 * 7 payroll witnesses) and 7 cross-card checks. Measured by CFR-4 on 2026-10-25.
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/
 * MoneyKeel_CashFlow_Independent_Audit/audit_results/MoneyKeel_CashFlow_Source_Checks.json. Every expected answer is READ FROM
 * THE PACKAGE, never retyped. Results: returned/results/cashflow_openai_sources_results.json.
 *
 * MEASURED ONLY 2026-10-25: no app code, record or drawing was changed. Measured on b1c659e8 (head-of-household bands fixed to
 * $201,750 / $256,200 and the per-person senior phase-out, both 2026-10-23 — both AGREE below on today's code).
 *
 * Markers as in the part files: AGREE (a plain test on the reviewer's answer) · APP WRONG (test.failing on it; a twin pins the
 * app) · REVIEWER WRONG (the app is right by the ruling named; the app's answer pinned).
 *
 * WITNESS INPUTS MAPPED (the app's own functions, the ones production calls):
 *   taxable_income_after_deductions → MK-CF-F-101 taxOwedFor, which takes a gross and subtracts the deduction itself: it is
 *     handed taxable income + that filing status's standard deduction (TAX_TABLES[status].deduction), nobody 65 or over and no
 *     state rate — so the brackets see exactly the witness's taxable income.
 *   eligible_people65_plus → MK-CF-F-099 deductionFor(status, people, magi) with magi $10,000,000, where the senior deduction is
 *     fully phased out ($0), so the figure is the standard deduction and the age additions alone, as the witness asks.
 *   status / eligible_people / magi → MK-CF-F-187 seniorDeductionFor (tax year: the app's TAX_YEAR, 2026).
 *   taxable_income_at_lookup → MK-CF-F-104 ltcgRateFor(taxable + the standard deduction). The finite-gain witness runs through
 *     the one caller of ltcgRateFor, the draw-order sheet (DrawSteerSheet.tsx:72 → MK-PL-F-010 drawOrderOutcome), as in part 16.
 *   age_attained_in2026 → MK-CF-F-053 annual401kLimit · MK-CF-F-054 annualIraLimit · MK-CF-F-055 annualHsaLimit(age, family,
 *     medicareEnrolled false). The Medicare-midyear witness → annualHsaLimit(65, self-only, medicareEnrolled true): the app holds
 *     only a yes/no answer to "enrolled in Medicare?", no start month.
 *   annual_employee_wages → MK-CF-F-198 payrollTaxWithheld. The two-earner witness → payrollTaxWithheld on each wage.
 * TOLERANCES: money to 1e-6 dollars, rates to 1e-12.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  taxOwedFor, deductionFor, seniorDeductionFor, ltcgRateFor, taxableIncomeFor, marginalBracketFor,
  TAX_TABLES, TAX_YEAR, SENIOR_DEDUCTION, type FilingStatus,
} from '../../../src/domain/income/tax';
import { annual401kLimit, annualIraLimit, annualHsaLimit, IRS_LIMITS } from '../../../src/domain/income/limits';
import { payrollTaxWithheld, SS_WAGE_BASE, MEDICARE_ADDITIONAL_THRESHOLD } from './base-pay';
import { rateInForce, taxedAfterPreTax } from '../../../src/domain/income/tax-rate';
import { drawOrderOutcome } from '../../../src/domain/decumulation';

type Mark = 'AGREE' | 'APP WRONG' | 'REVIEWER WRONG';
const PKG = path.join(__dirname, '../../documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/MoneyKeel_CashFlow_Independent_Audit/audit_results');
const SRC = JSON.parse(fs.readFileSync(path.join(PKG, 'MoneyKeel_CashFlow_Source_Checks.json'), 'utf8'));
const topic = (starts: string): any => {
  const t = SRC.source_checks.find((s: any) => String(s.topic).startsWith(starts));
  if (!t) throw new Error(`no source topic "${starts}"`);
  return t;
};
const RAN: string[] = [];
const ACTUAL: Record<string, unknown> = {};
const runner = (mark: Mark) => (mark === 'APP WRONG' ? test.failing : test);
const witness = (key: string, label: string, mark: Mark, fn: () => void) => {
  RAN.push(key);
  runner(mark)(`${key} · ${label} [${mark}]`, fn);
};
const N = (x: any) => Number(x);
const money = (got: number, exact: string) => expect(got).toBeCloseTo(Number(exact), 6);
const rate = (got: number, exact: string) => expect(got).toBeCloseTo(Number(exact), 12);
const fs_ = (s: string) => s as FilingStatus;

beforeAll(() => {
  jest.useFakeTimers({ now: new Date('2026-10-24T12:00:00'),
    doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask'] });
});
afterAll(() => {
  jest.useRealTimers();
  const out = process.env.CFRSRC_PROBE;
  if (out) fs.writeFileSync(out, JSON.stringify(ACTUAL, null, 1));
});

test('the tax year the app\'s tables are for is the witnesses\' year (2026)', () => expect(TAX_YEAR).toBe(2026));

// ── 1. Federal income tax 2026 — bands by filing status: 48 witnesses ──────────────────────────────
describe('Federal income tax 2026 — bands by filing status (IRS Rev. Proc. 2025-32 §4.01)', () => {
  const T = topic('Federal income tax');
  test('the four band tables the reviewer checked are the app\'s tables, top for top and rate for rate', () => {
    for (const [status, rows] of Object.entries<any[]>(T.amounts_checked)) {
      const app = TAX_TABLES[fs_(status)].brackets.map(([u, r]) => [u === Infinity ? null : u, r]);
      expect(app).toEqual(rows);
    }
  });
  T.witnesses.forEach((w: any, k: number) => {
    const s = fs_(w.input.filing_status), ti = N(w.input.taxable_income_after_deductions);
    witness(`bands-${String(k + 1).padStart(2, '0')}`, `${s} taxable $${ti}`, 'AGREE', () => {
      const got = taxOwedFor(ti + TAX_TABLES[s].deduction, s, 0, 0);
      ACTUAL[`bands-${k + 1}`] = got;
      expect(taxableIncomeFor(ti + TAX_TABLES[s].deduction, s, 0)).toBeCloseTo(ti, 9);
      money(got, w.expected.exact);
    });
  });
});

// ── 2. Standard deduction and age-65 additions 2026: 9 witnesses ───────────────────────────────────
describe('Standard deduction and age-65 additions 2026 (IRS Rev. Proc. 2025-32 §4.14)', () => {
  const T = topic('Standard deduction');
  T.witnesses.forEach((w: any, k: number) => {
    const s = fs_(w.input.filing_status), n = N(w.input.eligible_people65_plus);
    witness(`deduction-${k + 1}`, `${s}, ${n} aged 65+`, 'AGREE', () => {
      expect(seniorDeductionFor(s, n, 10_000_000)).toBe(0);
      const got = deductionFor(s, n, 10_000_000);
      ACTUAL[`deduction-${k + 1}`] = got;
      money(got, w.expected.exact);
    });
  });
});

// ── 3. Enhanced senior deduction 2025–2028: 10 witnesses ───────────────────────────────────────────
describe('Enhanced senior deduction 2025–2028 (P.L. 119-21 §70103; IRS Schedule 1-A Part V)', () => {
  const T = topic('Enhanced senior');
  test('the tax years the deduction runs for are 2025 to 2028, the witnesses\' year inside them', () => {
    expect([SENIOR_DEDUCTION.firstYear, SENIOR_DEDUCTION.lastYear]).toEqual([2025, 2028]);
    for (const w of T.witnesses) expect(w.input.tax_year).toBe(TAX_YEAR);
  });
  T.witnesses.forEach((w: any, k: number) => {
    const s = fs_(w.input.status), n = N(w.input.eligible_people), magi = N(w.input.magi);
    witness(`senior-${String(k + 1).padStart(2, '0')}`, `${s}, ${n} eligible, income $${magi}`, 'AGREE', () => {
      const got = seniorDeductionFor(s, n, magi);
      ACTUAL[`senior-${k + 1}`] = got;
      money(got, w.expected.exact);
    });
  });
});

// ── 4. Long-term capital gains 2026 thresholds: 17 witnesses ───────────────────────────────────────
describe('Long-term capital gains 2026 thresholds (IRS Rev. Proc. 2025-32 §4.03; Schedule D Tax Worksheet)', () => {
  const T = topic('Long-term capital gains');
  T.witnesses.forEach((w: any, k: number) => {
    const key = `gains-${String(k + 1).padStart(2, '0')}`;
    if (w.input.taxable_income_at_lookup != null) {
      const s = fs_(w.input.status), ti = N(w.input.taxable_income_at_lookup);
      witness(key, `${s} taxable $${ti}`, 'AGREE', () => {
        const got = ltcgRateFor(ti + TAX_TABLES[s].deduction, s, 0);
        ACTUAL[key] = got;
        rate(got, w.expected.exact);
      });
    } else {
      // FIXED 2026-10-25 (FIX-TAX) — the same item as part 16's MK-CF-F-104-C03: the one caller of ltcgRateFor, the draw-order
      // sheet (DrawSteerSheet.tsx → MK-PL-F-010 drawOrderOutcome), priced the whole gain at the rate of the year's income; the
      // gain now stacks on that income and is sliced across the bands (ltcgTaxOnGain, Schedule D Tax Worksheet).
      const s = fs_(w.input.status), ord = N(w.input.ordinary_taxable), gain = N(w.input.gain);
      const sheet = () => drawOrderOutcome({ cash: 0, taxable: 2 * gain, preTax: 0, roth: 0 } as any, ['taxable', 'cash', 'preTax', 'roth'] as any,
        { age: 70, horizon: 70, spendAnnual: 2 * gain, guaranteedAnnual: 0, realGrowth: 0, ordinaryRate: 0,
          gainsOn: { ordinaryIncome: ord + TAX_TABLES[s].deduction, status: s, over65: 0 }, gainShare: 0.5 }).totalTaxes as number;
      witness(key, `${s} ordinary taxable $${ord}, a $${gain} gain across the 0%/15% line`, 'AGREE', () => {
        ACTUAL[key] = sheet();
        money(sheet(), w.expected.exact);
      });
      test.failing(`${key} · what the app gave before the fix (pinned, now failing): the whole gain at 0% → $0`, () => expect(sheet()).toBe(0));
    }
  });
});

// ── 5. Contribution limits 2026: 9 witnesses ────────────────────────────────────────────────────────
describe('Contribution limits 2026 (IRS Notice 2025-67; Rev. Proc. 2025-19; Publication 969)', () => {
  const T = topic('Contribution limits');
  T.witnesses.forEach((w: any, k: number) => {
    const key = `limits-${k + 1}`;
    if (w.input.age_attained_in2026 != null) {
      const age = N(w.input.age_attained_in2026);
      witness(key, `age ${age} in 2026, eligible all year`, 'AGREE', () => {
        const got = { k: annual401kLimit(age), ira: annualIraLimit(age), hsa_self: annualHsaLimit(age, false, false), hsa_family: annualHsaLimit(age, true, false) };
        ACTUAL[key] = got;
        money(got.k, w.expected.k.exact);
        money(got.ira, w.expected.ira.exact);
        money(got.hsa_self, w.expected.hsa_self.exact);
        money(got.hsa_family, w.expected.hsa_family_one_person_catchup.exact);
      });
    } else {
      // APP WRONG — the same item as part 13's fix C (MK-CF-F-055): a self-only 65-year-old on Medicare from 1 July had six
      // eligible months; the prorated 2026 ceiling is (4,400 + 1,000) × 6 ÷ 12 = $2,700 (IRS Publication 969, "Enrolled in
      // Medicare"; Rev. Proc. 2025-19 §2.01). The app holds only "enrolled: yes", and yes gives $0 for the whole year.
      witness(key, 'age 65, on Medicare from 2026-07-01, six eligible months self-only', 'APP WRONG', () => {
        const got = annualHsaLimit(N(w.input.age_attained), false, true);
        ACTUAL[key] = got;
        money(got, w.expected.exact);
      });
      test(`${key} · what the app gives today: $0 once Medicare is answered yes, $5,400 if answered no`, () => {
        expect(annualHsaLimit(65, false, true)).toBe(0);
        expect(annualHsaLimit(65, false, false)).toBe(IRS_LIMITS.hsa_self + IRS_LIMITS.hsa_catch_up_55);
      });
    }
  });
});

// ── 6. Social Security and Medicare 2026 withholding: 7 witnesses ──────────────────────────────────
describe('Social Security and Medicare 2026 withholding (SSA 2026 base; IRC §3101(b)(2); IRS Topic 560)', () => {
  const T = topic('Social Security and Medicare');
  test('the wage base and the employer\'s 0.9% threshold are the published ones', () => {
    expect(SS_WAGE_BASE).toBe(184_500);
    expect(MEDICARE_ADDITIONAL_THRESHOLD).toBe(200_000);
  });
  T.witnesses.forEach((w: any, k: number) => {
    const key = `payroll-${k + 1}`;
    if (w.input.annual_employee_wages != null) {
      witness(key, `wages $${w.input.annual_employee_wages}`, 'AGREE', () => {
        const got = payrollTaxWithheld(N(w.input.annual_employee_wages));
        ACTUAL[key] = got;
        money(got, w.expected.exact);
      });
    } else {
      const e1 = N(w.input.earner1), e2 = N(w.input.earner2);
      const extraWithheld = (wage: number) => payrollTaxWithheld(wage) - (Math.min(wage, SS_WAGE_BASE) * 0.062 + wage * 0.0145);
      witness(`${key}a`, 'two $150,000 wages: the extra 0.9% each employer withholds', 'AGREE', () => {
        const got = extraWithheld(e1) + extraWithheld(e2);
        ACTUAL[`${key}a`] = got;
        money(got, w.expected.additional_employer_withholding.exact);
      });
      // REVIEWER WRONG (DEC-0384): the $450 a joint return owes at filing, 0.9% × (300,000 − 250,000), is a fact, and the app
      // never offers a household Medicare figure to put it in: his DEC-0384 keeps the tax estimate to federal income tax and the
      // screen says so ("federal income tax only, assuming the standard deduction"); his DEC-0340 sizes the take-home caveat by
      // what each paycheck withholds. Nothing replaces the withholding rule with the filing rule — the reviewer's acceptance
      // target holds. The test pins the app's answer: no household 0.9% anywhere, and the words that say what the tax covers.
      witness(`${key}b`, 'two $150,000 wages, joint: the household\'s extra $450 — not a figure the app makes, by DEC-0384', 'REVIEWER WRONG', () => {
        const op = { filingStatus: 'married', whoEarns: 'both', salaryFreq: 'annually', baseSalary: e1, partnerWage: { salaryFreq: 'annually', baseSalary: e2 } };
        const r = rateInForce(op as any);
        ACTUAL[`${key}b`] = { covers: r.covers, taxedOn: taxedAfterPreTax(op as any), householdLiabilityShown: null, factCheck: 0.009 * (e1 + e2 - 250_000) };
        expect(r.source).toBe('estimated');
        expect(r.covers).toBe('federal income tax only, assuming the standard deduction');
        expect(0.009 * (e1 + e2 - 250_000)).toBeCloseTo(N(w.expected.additional_household_liability.exact), 6);   // the reviewer's fact, true
      });
    }
  });
});

// ── the cross-card checks: measured by the parts 18–19 measurer (same IDs there); X6 is tax and run here too ──
describe('Cross-card checks X1–X7 (owned by parts 18 and 19, which carry the same IDs)', () => {
  test('the seven cross-card checks are X1–X7, and parts 18–19 carry every one', () => {
    expect(SRC.cross_card_checks.map((x: any) => x.id)).toEqual(['X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7']);
    const p18 = JSON.parse(fs.readFileSync(path.join(PKG, 'MoneyKeel_CashFlow_Audit_Part_18.json'), 'utf8')).cross_card_checks.map((x: any) => x.id);
    const p19 = JSON.parse(fs.readFileSync(path.join(PKG, 'MoneyKeel_CashFlow_Audit_Part_19.json'), 'utf8')).cross_card_checks.map((x: any) => x.id);
    expect([...new Set([...p18, ...p19])].sort()).toEqual(['X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7']);
  });
  test('X6 · $60,000 of wages and a $4,800 401(k), single: taxed on $39,100, the 12% band [AGREE]', () => {
    const x = SRC.cross_card_checks.find((c: any) => c.id === 'X6').case;
    const op = { salaryFreq: 'annually', baseSalary: x.wages, c_401k: x.k / 12, filingStatus: x.status };
    const taxedOn = taxedAfterPreTax(op as any);
    expect(taxedOn).toBeCloseTo(x.wages - x.k, 6);
    expect(taxableIncomeFor(taxedOn, 'single', 0)).toBeCloseTo(x.ordinary_taxable, 6);
    expect(`${Math.round(marginalBracketFor(taxedOn, 'single', 0) * 100)}%`).toBe(x.bracket);
  });
});

// ── a guard that proves it looked: every witness, once ─────────────────────────────────────────────
test('coverage: 6 of 6 topics and 100 of 100 witnesses were run, each once (the two-earner payroll witness as its two halves)', () => {
  expect(SRC.source_checks).toHaveLength(6);
  const total = SRC.source_checks.reduce((t: number, s: any) => t + s.witnesses.length, 0);
  expect(total).toBe(100);
  expect(SRC.source_checks.map((s: any) => s.witnesses.length)).toEqual([48, 9, 10, 17, 9, 7]);
  expect(RAN.filter((k) => k.startsWith('bands-'))).toHaveLength(48);
  expect(new Set(RAN).size).toBe(RAN.length);
  expect(RAN.length).toBe(101);   // 100 witnesses, the last payroll witness checked as two halves (a and b)
  expect(SRC.primary_sources).toHaveLength(10);
});
