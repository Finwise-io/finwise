/* THE OUTSIDE CASES, RUN AGAINST THE APP — Cash flow module, OpenAI's independent audit of 2026-10-24, PART 16 of 19
 * ("federal tax — the 2026 tables, deductions, bands"). Measured by CFR-4 on 2026-10-25.
 *
 * Cards: MK-CF-F-097 grossFromNet · MK-CF-F-098 progressiveMonthlyTax · MK-CF-F-187 seniorDeductionFor · MK-CF-F-099
 * deductionFor · MK-CF-F-100 taxableIncomeFor · MK-CF-F-101 taxOwedFor · MK-CF-F-102 effectiveRateOnGrossFor · MK-CF-F-103
 * marginalBracketFor · MK-CF-F-104 ltcgRateFor (all src/domain/income/tax.ts) · MK-CF-F-185 needsTakeHomeConversion ·
 * MK-CF-F-186 convertTakeHomeMode (src/domain/income/take-home-mode-migration.ts).
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/
 * MoneyKeel_CashFlow_Independent_Audit/audit_results/MoneyKeel_CashFlow_Audit_Part_16.json (55 cases, 11 formula checks,
 * 7 rules held, 4 source checks — the source checks' witnesses are run in outside_cashflow_openai_sources.test.ts).
 * Every expected answer is READ FROM THE PACKAGE (C(case_id).expected), never retyped; only the plain input names are mapped
 * onto the app's own arguments and profile fields. Results, case by case:
 * MoneyKeel/documents/audit/outside-test-cases/returned/results/cashflow_openai_part16_results.json
 *
 * MEASURED ONLY 2026-10-25: no app code, record, drawing or existing test was changed. Measured on b1c659e8, the commit that
 * already moved this code on 2026-10-23/24: head-of-household 24% and 32% bands end at $201,750 / $256,200 (they had copied the
 * single filer's), the senior deduction's 6% comes off EACH person's $6,000 (it came off the couple's $12,000 once), and the
 * callers hand these functions the income after the 401(k). Each of those is AGREE below on today's code.
 *
 * Markers: AGREE — the app gives the reviewer's answer (a plain test on it) · APP WRONG — the reviewer is right by the ruling or
 * source named (test.failing on the reviewer's answer, so it turns red when fixed; a twin pins what the app gives today) ·
 * REVIEWER WRONG — none in this part · NEEDS RULING — none · BLOCKED — none · OUTSIDE DOMAIN — an input no caller can send; what
 * the app does with it is recorded and the callers are cited.
 *
 * INPUT NAMES MAPPED (the app's own arguments, never the answers):
 *   net_annual / gross_or_magi / ordinary_gross → the function's `gross` / `net` argument, a year; status / filing_status →
 *     FilingStatus ('single' | 'married' | 'mfs' | 'hoh'); over65 → the count of people 65 or over (0–2); state_rate 0.05 → the
 *     stateRate argument as a share (taxOwedFor takes 0.05 for 5%); year → the app's TAX_YEAR, 2026 (no year argument exists).
 *   magi → seniorDeductionFor / deductionFor's `magi` argument. taxableIncomeFor has no MAGI argument: it uses the gross it is
 *     handed, and every Cash flow caller hands it the income after the 401(k) (rateInForce → taxedAfterPreTax, tax-rate.ts:164;
 *     incomeSummary's taxedOn, income-summary.ts:756). So F-100-C05's $20,000 "above-the-line adjustment" is mapped to the one
 *     such amount the app holds, a pre-tax 401(k): a profile paid $90,000 a year (salaryFreq 'annually') with c_401k $20,000 ÷ 12.
 *   months (F-098) → progressiveMonthlyTax's taxableByMonth, Jan→Dec. Its one caller, buildIncomeState (calc.ts:244), passes each
 *     month's gross where a rent's running costs come off first (monthlyGrossOfSource, calc.ts:161), so a month can be negative.
 *   ordinary_taxable_income + gain (F-104 C03/C04) → no app function returns the tax on a finite gain. The one caller of
 *     ltcgRateFor is the draw-order sheet on the Cash flow screen (DrawSteerSheet.tsx:72, opened from CashFlowScreen.tsx:682): it
 *     takes ONE rate from the year's income and hands it to MK-PL-F-010 drawOrderOutcome, which taxes every dollar of gain drawn
 *     at that rate. Those cases run through that pair: ordinary gross = ordinary taxable + the standard deduction; a taxable
 *     bucket holding twice the gain with a gain share of 0.5, a one-year plan (age = horizon = 70) spending exactly the bucket.
 *   mode / amount / frequency / manual_rate / k_monthly (F-185, F-186) → the stored profile those functions read: salaryMode
 *     'takehome' or 'gross', baseSalary the amount as typed (a string), salaryFreq, taxMode 'manual' + manualTaxRate in percent
 *     when a rate is given (0.22 → '22'; null → no taxMode, the calculated rate), c_401k the 401(k) a month.
 *   F-186's outputs: annual_gross_estimate → baseSalary × the pay periods in a year; monthly_take_home_preserved → landsTypical;
 *     new_mode → salaryMode; estimated_gross_label_required → grossWorkedBack; unchanged → the same object handed back.
 * The clock is held at 2026-10-24 12:00 (the cases' as_of).
 * TOLERANCES: money to 1e-6 dollars (toBeCloseTo(Number(exact), 6)), rates to 1e-12; strings exact; REFUSES = no number (null),
 * never 0. "shown" strings are screen formatting and are not asserted.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  grossFromNet, seniorDeductionFor, deductionFor, taxableIncomeFor, taxOwedFor,
  effectiveRateOnGrossFor, marginalBracketFor, ltcgRateFor, ltcgTaxOnGain, TAX_TABLES, TAX_YEAR, type FilingStatus,
} from '../../../src/domain/income/tax';
import * as TAX from '../../../src/domain/income/tax';
import { needsTakeHomeConversion, convertTakeHomeMode } from '../../../src/domain/income/take-home-mode-migration';
import { taxedAfterPreTax, rateInForce } from '../../../src/domain/income/tax-rate';
import { drawOrderOutcome } from '../../../src/domain/decumulation';

// ── the package, read as it came ────────────────────────────────────────────────────────────────────
type Mark = 'AGREE' | 'APP WRONG' | 'REVIEWER WRONG' | 'NEEDS RULING' | 'BLOCKED' | 'OUTSIDE DOMAIN';
const PKG = path.join(__dirname, '../../documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/MoneyKeel_CashFlow_Independent_Audit/audit_results');
const PART = JSON.parse(fs.readFileSync(path.join(PKG, 'MoneyKeel_CashFlow_Audit_Part_16.json'), 'utf8'));
const C = (caseId: string): any => {
  const c = PART.cases.find((x: any) => x.case_id === caseId);
  if (!c) throw new Error(`no case ${caseId} in part 16`);
  return c;
};
const RAN: string[] = [];
const ACTUAL: Record<string, unknown> = {};
const seen = <T>(caseId: string, v: T): T => { ACTUAL[caseId] = v; return v; };
const runner = (mark: Mark) => (mark === 'APP WRONG' || mark === 'REVIEWER WRONG' ? test.failing : mark === 'BLOCKED' ? test.skip : test);
const kase = (caseId: string, mark: Mark, fn: (c: any) => void, note = '') => {
  RAN.push(caseId);
  const c = C(caseId);
  runner(mark)(`${caseId} · ${c.kind} · ${c.title} [${mark}]${note ? ` — ${note}` : ''}`, () => fn(c));
};

// ── helpers ─────────────────────────────────────────────────────────────────────────────────────────
const N = (x: any): number => Number(x);
const money = (got: number | null | undefined, exact: string) => { expect(got).not.toBeNull(); expect(got as number).toBeCloseTo(Number(exact), 6); };
const rate = (got: number | null | undefined, exact: string) => { expect(got).not.toBeNull(); expect(got as number).toBeCloseTo(Number(exact), 12); };
const st = (i: any): FilingStatus => (i.status ?? i.filing_status ?? 'single') as FilingStatus;
const ov = (i: any): number => N(i.over65 ?? 0);
const PERIODS: Record<string, number> = { hourly: 12, weekly: 52, biweekly: 26, monthly: 12 };
/** the stored profile F-185 / F-186 read, from the case's plain inputs */
const legacyProfile = (i: any): Record<string, any> => {
  const op: Record<string, any> = { salaryMode: i.mode === 'take_home' ? 'takehome' : 'gross', baseSalary: String(i.amount), salaryFreq: i.frequency };
  if (i.manual_rate != null) { op.taxMode = 'manual'; op.manualTaxRate = String(N(i.manual_rate) * 100); }
  if (i.k_monthly != null) op.c_401k = String(i.k_monthly);
  return op;
};
const converted = (op: Record<string, any>) => {
  const out: any = convertTakeHomeMode(op);
  return { out, annualGross: Number(out.baseSalary) * (PERIODS[String(out.salaryFreq ?? 'monthly')] ?? 12), landsTypical: Number(out.landsTypical) };
};
/** the draw-order sheet's capital-gains tax on one finite gain, as DrawSteerSheet.tsx hands it in: the year's income the
 *  gains stack on (FIXED 2026-10-25 — it handed in one rate, ltcgRateFor on the year's income, and every dollar of gain was
 *  taxed at it) to MK-PL-F-010 drawOrderOutcome — one year, a taxable bucket of twice the gain at a 0.5 gain share, spending
 *  the whole bucket. capGainsRate is the marginal lookup the sheet still prints as the first band's rate. */
const sheetGainTax = (ordinaryGross: number, status: FilingStatus, gain: number) => {
  const capGainsRate = ltcgRateFor(ordinaryGross, status, 0);
  const r = drawOrderOutcome({ cash: 0, taxable: 2 * gain, preTax: 0, roth: 0 } as any, ['taxable', 'cash', 'preTax', 'roth'] as any,
    { age: 70, horizon: 70, spendAnnual: 2 * gain, guaranteedAnnual: 0, realGrowth: 0, ordinaryRate: 0,
      gainsOn: { ordinaryIncome: ordinaryGross, status, over65: 0 }, gainShare: 0.5 });
  return { capGainsRate, tax: r.totalTaxes as number };
};

beforeAll(() => {
  jest.useFakeTimers({ now: new Date('2026-10-24T12:00:00'),
    doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask'] });
});
afterAll(() => {
  jest.useRealTimers();
  const out = process.env.CFR16_PROBE;
  if (out) fs.writeFileSync(out, JSON.stringify(ACTUAL, null, 1));
});

test('the tax year the tables are for is the cases\' year (2026)', () => { expect(TAX_YEAR).toBe(2026); });

// ── MK-CF-F-097 grossFromNet ────────────────────────────────────────────────────────────────────────
describe('MK-CF-F-097 grossFromNet — five cases', () => {
  for (const id of ['MK-CF-F-097-C01', 'MK-CF-F-097-C02', 'MK-CF-F-097-C03', 'MK-CF-F-097-C04', 'MK-CF-F-097-C05']) {
    kase(id, 'AGREE', (c) => money(seen(id, grossFromNet(N(c.inputs.net_annual), st(c.inputs), ov(c.inputs))), c.expected.exact));
  }
});

// ── MK-CF-F-098 progressiveMonthlyTax — RETIRED 2026-10-25 (FIX-TAX) ─────────────────────────────────────────────
// The band-filling month function is gone: his rulings put ONE rate on every month (DEC-0196) and the month grid reads it
// (MK-CF-F-087 monthlyTaxRates — rate = the year's tax ÷ the year's taxable income), and its last caller, the stored income
// record (MK-CF-F-049 buildIncomeState), reads that one rate too. What every case still holds is the year: the twelve months'
// tax adds to the schedule's tax on the year's income — taxOwedFor on the sum of the months, the one tax function the rate is
// worked from. The month-by-month split the cases list (band filling) is no longer the app's: each month carries the one rate.
// C04, the loss month: the year's base is $63,110.93 (the loss lowers it), $5,393.31 of tax — it read $7,938.92, the loss
// month clipped to $0.
describe('MK-CF-F-098 progressiveMonthlyTax — five cases (RETIRED: the year\'s tax, by the one rate every month)', () => {
  const yearTax = (c: any) => taxOwedFor(c.inputs.months.map(N).reduce((t: number, x: number) => t + x, 0), st(c.inputs), N(c.inputs.state_rate ?? 0), 0);
  for (const id of ['MK-CF-F-098-C01', 'MK-CF-F-098-C02', 'MK-CF-F-098-C03', 'MK-CF-F-098-C04', 'MK-CF-F-098-C05']) {
    kase(id, 'AGREE', (c) => {
      expect((TAX as any).progressiveMonthlyTax).toBeUndefined();
      money(seen(id, yearTax(c)), c.expected.annual_tax.exact);
    }, id === 'MK-CF-F-098-C04' ? 'FIXED 2026-10-25 by retirement: the loss lowers the year — $5,393.31, it read $7,938.92' : 'the year\'s tax holds; the months carry the one rate (DEC-0196)');
  }
  test.failing('MK-CF-F-098-C04 · what the app gave before the fix (pinned, now failing): $7,938.92, the loss month counted as $0', () => {
    expect(yearTax(C('MK-CF-F-098-C04'))).toBeCloseTo(N(C('MK-CF-F-098-C04').formula_gives.annual_tax.exact), 6);   // 7,938.9192
  });
});

// ── MK-CF-F-187 seniorDeductionFor / MK-CF-F-099 deductionFor / MK-CF-F-100 taxableIncomeFor ───────────
describe('MK-CF-F-187 seniorDeductionFor — five cases', () => {
  for (const id of ['MK-CF-F-187-C01', 'MK-CF-F-187-C02', 'MK-CF-F-187-C03', 'MK-CF-F-187-C04']) {
    kase(id, 'AGREE', (c) => money(seen(id, seniorDeductionFor(st(c.inputs), ov(c.inputs), N(c.inputs.gross_or_magi))), c.expected.exact));
  }
  // OUTSIDE DOMAIN: no caller hands it an unknown income. deductionFor's two callers pass a number: taxableIncomeFor passes the
  // gross it was handed (tax.ts:308), taxableIncomeSteps passes max(0, gross − 401(k)) (planning/index.ts:66). Income never
  // entered is refused upstream or not (part 17, MK-CF-O-007-C02), not here. What the app does with null: $0.
  kase('MK-CF-F-187-C05', 'OUTSIDE DOMAIN', (c) => {
    expect(seen('MK-CF-F-187-C05', seniorDeductionFor(st(c.inputs), ov(c.inputs), c.inputs.magi))).toBe(0);
  }, 'no caller sends an unknown income (tax.ts:308, planning/index.ts:66); the app returns $0 for it');
});
describe('MK-CF-F-099 deductionFor — five cases', () => {
  for (const id of ['MK-CF-F-099-C01', 'MK-CF-F-099-C02', 'MK-CF-F-099-C03', 'MK-CF-F-099-C04']) {
    kase(id, 'AGREE', (c) => money(seen(id, deductionFor(st(c.inputs), ov(c.inputs), N(c.inputs.gross_or_magi))), c.expected.exact));
  }
  kase('MK-CF-F-099-C05', 'OUTSIDE DOMAIN', (c) => {
    expect(seen('MK-CF-F-099-C05', deductionFor(st(c.inputs), ov(c.inputs), c.inputs.magi))).toBe(35_500);   // 32,200 + 2 × 1,650, no senior part
  }, 'no caller sends an unknown income (tax.ts:308, planning/index.ts:66); the app returns $35,500 (no senior part)');
});
describe('MK-CF-F-100 taxableIncomeFor — five cases', () => {
  for (const id of ['MK-CF-F-100-C01', 'MK-CF-F-100-C02', 'MK-CF-F-100-C03', 'MK-CF-F-100-C04']) {
    kase(id, 'AGREE', (c) => money(seen(id, taxableIncomeFor(N(c.inputs.gross_or_magi), st(c.inputs), ov(c.inputs))), c.expected.exact));
  }
  // AGREE through the real caller: the adjustment the app holds is a pre-tax 401(k), and every Cash flow caller takes it off
  // before handing the income in (taxedAfterPreTax), so the senior deduction phases on $70,000, not on $90,000.
  kase('MK-CF-F-100-C05', 'AGREE', (c) => {
    const i = c.inputs;
    const op = { salaryFreq: 'annually', baseSalary: N(i.gross_receipts), c_401k: N(i.above_line_adjustment) / 12, filingStatus: i.filing_status };
    const taxedOn = taxedAfterPreTax(op as any);
    expect(taxedOn).toBeCloseTo(N(i.actual_magi), 6);
    const got = seen('MK-CF-F-100-C05', { taxedOn, taxable: taxableIncomeFor(taxedOn, st(i), ov(i)), deduction: deductionFor(st(i), ov(i), taxedOn) });
    money(got.taxable, c.expected.taxable_after_adjustments.exact);
    money(got.deduction, c.expected.deduction.exact);
  }, 'the adjustment mapped to a $20,000 pre-tax 401(k), the one the app holds; callers hand in the income after it');
});

// ── MK-CF-F-101 taxOwedFor · MK-CF-F-102 effectiveRateOnGrossFor · MK-CF-F-103 marginalBracketFor ──────
describe('MK-CF-F-101 taxOwedFor — five cases', () => {
  for (const k of [1, 2, 3, 4, 5]) {
    const id = `MK-CF-F-101-C0${k}`;
    kase(id, 'AGREE', (c) => money(seen(id, taxOwedFor(N(c.inputs.gross_or_magi), st(c.inputs), N(c.inputs.state_rate ?? 0), ov(c.inputs))), c.expected.exact));
  }
});
describe('MK-CF-F-102 effectiveRateOnGrossFor — five cases', () => {
  for (const k of [1, 2, 3, 4, 5]) {
    const id = `MK-CF-F-102-C0${k}`;
    kase(id, 'AGREE', (c) => rate(seen(id, effectiveRateOnGrossFor(N(c.inputs.gross_or_magi), st(c.inputs), N(c.inputs.state_rate ?? 0), ov(c.inputs))), c.expected.exact));
  }
});
describe('MK-CF-F-103 marginalBracketFor — five cases', () => {
  for (const k of [1, 2, 3, 4, 5]) {
    const id = `MK-CF-F-103-C0${k}`;
    kase(id, 'AGREE', (c) => rate(seen(id, marginalBracketFor(N(c.inputs.gross_or_magi), st(c.inputs), ov(c.inputs))), c.expected.exact));
  }
});

// ── MK-CF-F-104 ltcgRateFor ─────────────────────────────────────────────────────────────────────────
describe('MK-CF-F-104 ltcgRateFor — five cases', () => {
  kase('MK-CF-F-104-C01', 'AGREE', (c) => rate(seen('MK-CF-F-104-C01', ltcgRateFor(N(c.inputs.ordinary_gross), st(c.inputs), ov(c.inputs))), c.expected.marginal_baseline_rate.exact));
  kase('MK-CF-F-104-C02', 'AGREE', (c) => rate(seen('MK-CF-F-104-C02', ltcgRateFor(N(c.inputs.ordinary_gross), st(c.inputs), ov(c.inputs))), c.expected.marginal_baseline_rate.exact));
  kase('MK-CF-F-104-C05', 'AGREE', (c) => {
    const g = N(c.inputs.ordinary_gross);
    const got = seen('MK-CF-F-104-C05', { atTop: ltcgRateFor(g, st(c.inputs), ov(c.inputs)), oneDollarMore: ltcgRateFor(g + 1, st(c.inputs), ov(c.inputs)) });
    rate(got.atTop, c.expected.marginal_baseline_rate.exact);
    rate(got.oneDollarMore, c.expected.next_positive_gain_rate.exact);
  });
  // FIXED 2026-10-25 (FIX-TAX) — the fault was not in ltcgRateFor, which is a correct marginal lookup and stays one (labelled
  // so), but in its one caller: the draw-order sheet on the Cash flow screen (DrawSteerSheet.tsx → MK-PL-F-010
  // drawOrderOutcome) priced EVERY dollar of gain drawn at the one rate of the year's income. The gain now stacks on top of the
  // ordinary income and is sliced across the 0/15/20 bands by the new ltcgTaxOnGain (IRS Schedule D Tax Worksheet; Rev. Proc.
  // 2025-32 §4.03 tops; tenets 1 and 7). Run through the sheet's pair, as before.
  kase('MK-CF-F-104-C03', 'AGREE', (c) => {
    const i = c.inputs;
    const got = seen('MK-CF-F-104-C03', sheetGainTax(N(i.ordinary_taxable_income) + TAX_TABLES.single.deduction, 'single', N(i.gain)));
    money(got.tax, c.expected.gain_tax.exact);
    money(ltcgTaxOnGain(N(i.ordinary_taxable_income) + TAX_TABLES.single.deduction, N(i.gain), 'single'), c.expected.gain_tax.exact);
  }, 'FIXED 2026-10-25: $1,338.83 at 0% and $1,972.60 at 15% — $295.89 (it read $0)');
  kase('MK-CF-F-104-C04', 'AGREE', (c) => {
    const i = c.inputs;
    const got = seen('MK-CF-F-104-C04', sheetGainTax(N(i.ordinary_taxable_income) + TAX_TABLES.married.deduction, 'married', N(i.gain)));
    money(got.tax, c.expected.gain_tax.exact);
    money(ltcgTaxOnGain(N(i.ordinary_taxable_income) + TAX_TABLES.married.deduction, N(i.gain), 'married'), c.expected.gain_tax.exact);
  }, 'FIXED 2026-10-25: $2,588.83 at 15% and $4,722.60 at 20% — $1,332.84 (it read $1,096.71)');
  test('MK-CF-F-104-C03/C04 · the marginal lookup the sheet prints stays the rate on the first dollar of gain: 0% and 15%', () => {
    expect(sheetGainTax(N(C('MK-CF-F-104-C03').inputs.ordinary_taxable_income) + 16_100, 'single', N(C('MK-CF-F-104-C03').inputs.gain)).capGainsRate).toBe(0);
    expect(sheetGainTax(N(C('MK-CF-F-104-C04').inputs.ordinary_taxable_income) + 32_200, 'married', N(C('MK-CF-F-104-C04').inputs.gain)).capGainsRate).toBe(0.15);
  });
  test.failing('MK-CF-F-104-C03/C04 · what the app gave before the fix (pinned, now failing): one rate on the whole gain — $0 and $1,096.71', () => {
    const a = sheetGainTax(N(C('MK-CF-F-104-C03').inputs.ordinary_taxable_income) + 16_100, 'single', N(C('MK-CF-F-104-C03').inputs.gain));
    expect(a.tax).toBeCloseTo(N(C('MK-CF-F-104-C03').formula_gives.if_applied_to_whole_gain_tax.exact), 6);
    const b = sheetGainTax(N(C('MK-CF-F-104-C04').inputs.ordinary_taxable_income) + 32_200, 'married', N(C('MK-CF-F-104-C04').inputs.gain));
    expect(b.tax).toBeCloseTo(N(C('MK-CF-F-104-C04').formula_gives.one_rate_tax.exact), 6);
  });
});

// ── MK-CF-F-185 needsTakeHomeConversion ─────────────────────────────────────────────────────────────
describe('MK-CF-F-185 needsTakeHomeConversion — five cases', () => {
  for (const k of [1, 2, 3, 4, 5]) {
    const id = `MK-CF-F-185-C0${k}`;
    kase(id, 'AGREE', (c) => expect(seen(id, needsTakeHomeConversion(legacyProfile(c.inputs) as any))).toBe(c.expected));
  }
});

// ── MK-CF-F-186 convertTakeHomeMode ─────────────────────────────────────────────────────────────────
describe('MK-CF-F-186 convertTakeHomeMode — five cases', () => {
  const asConverted = (c: any, id: string) => {
    const got = converted(legacyProfile(c.inputs));
    seen(id, { annual_gross_estimate: got.annualGross, monthly_take_home_preserved: got.landsTypical, new_mode: got.out.salaryMode, grossWorkedBack: got.out.grossWorkedBack });
    money(got.annualGross, c.expected.annual_gross_estimate.exact);
    money(got.landsTypical, c.expected.monthly_take_home_preserved.exact);
    expect(got.out.salaryMode).toBe(c.expected.new_mode);
    expect(got.out.grossWorkedBack === true).toBe(c.expected.estimated_gross_label_required);
  };
  kase('MK-CF-F-186-C01', 'AGREE', (c) => asConverted(c, 'MK-CF-F-186-C01'));
  kase('MK-CF-F-186-C03', 'AGREE', (c) => asConverted(c, 'MK-CF-F-186-C03'));
  for (const id of ['MK-CF-F-186-C02', 'MK-CF-F-186-C05']) {
    kase(id, 'AGREE', (c) => {
      const op = legacyProfile(c.inputs);
      const out = convertTakeHomeMode(op);
      seen(id, { unchanged: out === op });
      expect(out === op).toBe(c.expected.unchanged);
    });
  }
  // APP WRONG: the calculated branch works the gross back from the take-home with grossFromNet and never adds the 401(k) back
  // (take-home-mode-migration.ts:108), so gross − 401(k) − tax on (gross − 401(k)) cannot equal the take-home typed. Rules: his
  // DEC-0200 (convert once, honestly) and DEC-0283 (a 401(k) comes off before tax); the lead's DEC-7942 fixed only the typed-rate
  // branch. Right: grossFromNet(net a year) + the 401(k) a year.
  // FIXED 2026-10-26 (FIX-INCOME-A): the calculated branch adds the year's 401(k) back — grossFromNet(take-home × 12) + 401(k) × 12
  kase('MK-CF-F-186-C04', 'AGREE', (c) => asConverted(c, 'MK-CF-F-186-C04'),
    'FIXED 2026-10-26 (FIX-INCOME-A): the $6,137.16 of 401(k) added back — gross $61,084.93 (it read $54,947.77)');
  test.failing('MK-CF-F-186-C04 · what the app gave before the fix (pinned, now failing): the gross worked back without the 401(k), $54,947.77 a year', () => {
    const c = C('MK-CF-F-186-C04');
    const got = converted(legacyProfile(c.inputs));
    expect(got.annualGross).toBeCloseTo(N(c.formula_gives.gross_without_k_added_back.exact), 6);
    expect(got.landsTypical).toBeCloseTo(4211.17, 6);
    // the right gross is the app's own inverse plus the 401(k): x − tax(x) = $50,534.04 at x = $54,947.77, gross = x + $6,137.16
    expect(grossFromNet(4211.17 * 12, 'single', 0) + 511.43 * 12).toBeCloseTo(N(c.expected.annual_gross_estimate.exact), 6);
  });
  // WITNESS (not among the 55): what the short gross does next. The converted profile reads, on Base pay's rate in force
  // (MK-CF-F-181, implied branch), "your figures, 0%": gross $54,947.77 − 401(k) $6,137.16 − take-home $50,534.04 is −$1,723.43,
  // floored to $0 taken out. With the right gross, $4,413.73 a year is taken out, 7.23% of gross.
  test('WITNESS F-186-W1 · the converted profile\'s rate in force is the share its own figures imply (7.23%), not 0% [FIXED 2026-10-26]', () => {
    const got = converted(legacyProfile(C('MK-CF-F-186-C04').inputs)).out;
    const r = rateInForce(got);
    ACTUAL['F-186-W1'] = { rate: r.rate, source: r.source, label: r.label };
    expect(r.source).toBe('implied');
    expect(r.rate).toBeCloseTo((61_084.9327272727 - 6_137.16 - 50_534.04) / 61_084.9327272727, 6);
  });
  test.failing('WITNESS F-186-W1 · what the app gave before the fix (pinned, now failing): "your figures, 0%"', () => {
    const r = rateInForce(converted(legacyProfile(C('MK-CF-F-186-C04').inputs)).out);
    expect(r.source).toBe('implied');
    expect(r.rate).toBe(0);
  });
});

// ── a guard that proves it looked: every case in the part, once ────────────────────────────────────
test('coverage: all 55 of 55 part-16 cases were run, each once', () => {
  const ids: string[] = PART.cases.map((c: any) => c.case_id);
  expect(ids).toHaveLength(55);
  expect(RAN).toHaveLength(55);
  expect(new Set(RAN).size).toBe(55);
  expect([...RAN].sort()).toEqual([...ids].sort());
});
test('coverage: all 11 formula checks and 7 rules of part 16 are the ones the results file classifies', () => {
  expect(PART.formula_checks).toHaveLength(11);
  expect(PART.rules_held).toHaveLength(7);
  expect(PART.formula_checks.filter((f: any) => f.verdict !== 'RIGHT').map((f: any) => f.id).sort())
    .toEqual(['MK-CF-F-098', 'MK-CF-F-099', 'MK-CF-F-100', 'MK-CF-F-104', 'MK-CF-F-186', 'MK-CF-F-187']);
  expect(PART.rules_held.filter((r: any) => r.verdict === 'NOT HELD').map((r: any) => r.rule).sort()).toEqual(['DEC-0200', 'DEC-7942']);
});
