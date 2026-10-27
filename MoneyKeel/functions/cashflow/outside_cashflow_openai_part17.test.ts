/* THE OUTSIDE CASES, RUN AGAINST THE APP — Cash flow module, OpenAI's independent audit of 2026-10-24, PART 17 of 19
 * ("tax on the household"). Measured by CFR-4 (part-17 measurer) on 2026-10-25.
 *
 * Cards: MK-CF-O-007 theTaxOrganizer · MK-CF-F-084 taxableAnnual · MK-CF-F-230 taxedAfterPreTax · MK-CF-F-085
 * filingStatusOf · MK-CF-F-086 stateRateOf · MK-CF-F-087 monthlyTaxRates · MK-CF-F-088 taxableByCalendarMonth ·
 * MK-CF-F-089 over65CountOf · MK-CF-F-090 effectiveRate · MK-CF-F-048 effectiveTaxRate.
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/
 * MoneyKeel_CashFlow_Independent_Audit/audit_results/MoneyKeel_CashFlow_Audit_Part_17.json (50 cases, 10 formula checks,
 * 19 rules held, 5 source checks). Every expected answer is READ FROM THE PACKAGE (C(case_id).expected), never retyped;
 * only the plain input names are mapped onto the app's own profile fields. Results, case by case:
 * MoneyKeel/documents/audit/outside-test-cases/returned/results/cashflow_openai_part17_results.json
 *
 * MEASURED ONLY 2026-10-25: no app code, record, drawing or existing test was changed. Measured on b1c659e8 (the commit
 * that already moved the tax code on 2026-10-23/24: head-of-household bands, the per-person senior deduction, the bracket
 * and "What it is taxed on" after the 401(k), the state-rate sentences, DEC-0321 capital gains federal only).
 *
 * Markers: AGREE — the app gives the reviewer's answer (a plain test on it) · APP WRONG — the reviewer is right by the
 * ruling or source named (test.failing on the reviewer's answer, so it turns red when fixed) · REVIEWER WRONG — a ruling
 * makes the app right (none in this part) · NEEDS RULING — no ruling settles it, the app's answer is pinned · BLOCKED —
 * test.skip naming what is missing (none) · OUTSIDE DOMAIN — an input no caller can send; what the app does with it is
 * recorded, the caller cited. "SETTLED BY DEC-…" — the reviewer wrote RULE UNCLEAR and a decision answers it; AGREE when
 * the app follows it. WITNESS W1–W6 — reachable twins of a case the reviewer could only state outside the domain, or
 * the household numbers behind a formula verdict; not among the 50.
 *
 * INPUT NAMES MAPPED (the app's own fields, never the answers):
 *   wage_annual / gross_wages / wages / taxable_annual → the wage as the base-pay screen stores it: salaryFreq 'annually',
 *     baseSalary = the year; with paid_months, a dated pay table (salaryByMonth 'YYYY-MM', DEC-0187) paying the year ÷
 *     paid_months in the first paid_months months and $0 after. pre_tax_401k / k / k_annual / employee_k_actual_annual →
 *     c_401k = the year ÷ 12 (the screen asks it a month); k_per_paid_month / employee_k_monthly → c_401k as given.
 *   take_home_per_paid_month → landsTypical (typed each month, approved drawing v07 frame 2c).
 *   rental_net_annual / rent_net → one rent entry naming its property (DEC-4059d), income or running costs a month.
 *   interest_annual / interest (a month) → invAnnual (the entered estimate). untaxed_support_annual → supportMonthly.
 *   bonus {amount, date} → bonusAnnual + bonusMonth. vesting {amount, date} → one rsuGrants row (1 share at the amount).
 *   social_security_annual → ri_ss a month (no incomeSources list: received now, MK-CF-F-072).
 *   filing_status / status → filingStatus; spouse_present → hasPartner 'yes'; state_percent → stateTaxRate as the Tax
 *     organizer's box stores it (the typed text); state_rate 0.05 → stateTaxRate 5; typed_rate_percent → taxMode
 *     'manual' + manualTaxRate. age_question 'one' → over65Who 'me' (FilingStatusScreen's value for one person).
 *   Account income records → one account and its DIVIDEND / INTEREST records, as the sync stores them (account_id,
 *     amount, date, reinvested), handed to theTaxOrganizer exactly as TaxOrganizerScreen.tsx:29 hands them.
 *   "independently_resolved_rate" (F-087-C04, F-090-C04) → the household the reviewer resolved it from, F-048-C04:
 *     $60,000.30 over six paid months, $501.13 into the 401(k) and $3,799.17 take-home each paid month.
 *   MK-CF-F-048 runs through its one production chain: incomeFromOnboarding → grossAnnualBaseline → effectiveTaxRate, the
 *     path buildIncomeState takes for IncomeDetailScreen.tsx:39 and buildSnapshot (HomeScreen.tsx:95).
 *   The clock is held at 2026-10-24 12:00 (the cases' as_of): the wage table, the trailing account window and the age test
 *   read the device clock.
 * TOLERANCES: money to 1e-6 dollars (toBeCloseTo(Number(exact), 6)), rates to 1e-12; strings exact; REFUSES = no number
 * (null), never 0. "shown" strings are screen formatting and are not asserted.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  taxableAnnual, filingStatusOf, stateRateOf, monthlyTaxRates, taxableByCalendarMonth, over65CountOf, effectiveRate,
  incomeMonthlyGrid, incomeFromOnboarding,
} from '../../../src/domain/income/onboarding';
import { taxedAfterPreTax, rateInForce } from '../../../src/domain/income/tax-rate';
import { buildIncomeState } from '../../../src/domain/income/calc';
import * as CALC from '../../../src/domain/income/calc';
import { taxOwedFor, TAX_TABLES } from '../../../src/domain/income/tax';
import { payrollTaxWithheld } from './base-pay';
import { theTaxOrganizer } from './tax-organizer';

// ── the package, read as it came ────────────────────────────────────────────────────────────────────
type Mark = 'AGREE' | 'APP WRONG' | 'REVIEWER WRONG' | 'NEEDS RULING' | 'BLOCKED' | 'OUTSIDE DOMAIN';
const PKG = path.join(__dirname, '../../documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/MoneyKeel_CashFlow_Independent_Audit/audit_results');
const PART = JSON.parse(fs.readFileSync(path.join(PKG, 'MoneyKeel_CashFlow_Audit_Part_17.json'), 'utf8'));
const C = (caseId: string): any => {
  const c = PART.cases.find((x: any) => x.case_id === caseId);
  if (!c) throw new Error(`no case ${caseId} in part 17`);
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
const N = (x: any): number | null => (x == null || x === '' ? null : Number(x));
const money = (got: number | null | undefined, exact: string) => { expect(got).not.toBeNull(); expect(got as number).toBeCloseTo(Number(exact), 6); };
const rate = (got: number | null | undefined, exact: string) => { expect(got).not.toBeNull(); expect(got as number).toBeCloseTo(Number(exact), 12); };
const refuses = (v: unknown) => expect(v == null).toBe(true);
const Y = 2026;
/** a dated pay table (DEC-0187): `perMonth` in the first `paid` months of 2026, $0 after */
const payTable = (perMonth: number, paid: number) => Object.fromEntries(
  Array.from({ length: 12 }, (_, i) => [`${Y}-${String(i + 1).padStart(2, '0')}`, i < paid ? perMonth : 0]));

/** F-084 / F-230's household: the named sources of one year, in the app's profile fields */
const fromSources = (i: any): any => {
  const op: any = {};
  const wage = N(i.wage_annual) ?? 0;
  if (wage) {
    if (i.paid_months) { op.salaryFreq = 'monthly'; op.baseSalary = wage / i.paid_months; op.salaryByMonth = payTable(wage / i.paid_months, i.paid_months); }
    else { op.salaryFreq = 'annually'; op.baseSalary = wage; }
  }
  const rent = N(i.rental_net_annual) ?? 0;
  if (rent) op.rentals = [{ property_id: 'home-1', type: 'long', income: rent > 0 ? rent / 12 : 0, expenses: rent < 0 ? -rent / 12 : 0 }];
  if (N(i.interest_annual)) op.invAnnual = N(i.interest_annual);
  if (N(i.untaxed_support_annual)) op.supportMonthly = (N(i.untaxed_support_annual) as number) / 12;
  if (N(i.bonus?.amount)) { op.bonusAnnual = N(i.bonus.amount); op.bonusMonth = Number(String(i.bonus.date).slice(5, 7)); }
  if (N(i.vesting?.amount)) op.rsuGrants = [{ shares: 1, price: N(i.vesting.amount), date: i.vesting.date }];
  if (N(i.social_security_annual)) op.ri_ss = (N(i.social_security_annual) as number) / 12;
  const k = i.employee_k_monthly != null ? N(i.employee_k_monthly) : (N(i.employee_k_actual_annual) ?? 0) / 12;
  if (k) op.c_401k = k;
  return op;
};
/** the part-year household of F-048-C04 (the rate F-087-C04 and F-090-C04 "resolved independently") */
const PART_YEAR = (): any => {
  const i = C('MK-CF-F-048-C04').inputs;
  const perMonth = (N(i.taxable_annual) as number) / i.paid_months;
  return { salaryFreq: 'monthly', baseSalary: perMonth, salaryByMonth: payTable(perMonth, i.paid_months),
    c_401k: N(i.k_per_paid_month), landsTypical: N(i.take_home_per_paid_month), filingStatus: 'single' };
};
/** F-087 / F-090 / F-048's household: a year of wages, the 401(k), the filing status, a typed rate or a state rate */
const rateHousehold = (i: any): any => {
  if (i.independently_resolved_rate != null || i.paid_months) return PART_YEAR();
  const op: any = { salaryFreq: 'annually', baseSalary: N(i.taxable_annual), filingStatus: i.status ?? 'single' };
  if (i.typed_rate_percent != null) { op.taxMode = 'manual'; op.manualTaxRate = i.typed_rate_percent; }
  if (i.k_annual != null) op.c_401k = (N(i.k_annual) as number) / 12;
  if (i.state_rate != null) op.stateTaxRate = (N(i.state_rate) as number) * 100;
  return op;
};
/** MK-CF-F-048 through its one production chain (IncomeDetailScreen.tsx, buildSnapshot): profile → buildIncomeState → rate.
 *  FIXED 2026-10-25 (FIX-TAX): effectiveTaxRate is RETIRED into MK-CF-F-181 rateInForce — the chain hands buildIncomeState the
 *  profile and it reads the rate in force (it read effectiveTaxRate on the legacy sources: single, no 401(k), no state). */
const legacyRate = (op: any) => {
  const doc = incomeFromOnboarding('u', op);
  const r = buildIncomeState('u', doc.sources, doc.tax, op).effective_tax_rate;   // the figure Income detail prints
  expect((CALC as any).effectiveTaxRate).toBeUndefined();
  expect(r).toBe(rateInForce(op).rate);
  return r;
};
const organizer = (profile: any, accounts: any[] = [], transactions: any[] = [], year = Y) =>
  theTaxOrganizer({ profile, accounts, debts: [], transactions, year });
const lineOf = (org: any, label: string): number | null => org.income.find((l: any) => l.label === label)?.amount ?? null;
const BROKERAGE = { asset_id: 'brk-1', label: 'Brokerage', kind: 'brokerage', asset_class: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 50_000 };
const SAVINGS = { asset_id: 'sav-1', label: 'Savings', kind: 'savings', asset_class: 'cash', tax_bucket: 'TAXABLE', balance: 40_000 };

beforeAll(() => { jest.useFakeTimers(); jest.setSystemTime(new Date('2026-10-24T12:00:00')); });
afterAll(() => {
  jest.useRealTimers();
  if (process.env.CFR4_P17_DUMP) fs.writeFileSync(process.env.CFR4_P17_DUMP, JSON.stringify(ACTUAL, null, 1));
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════
describe('MK-CF-O-007 theTaxOrganizer — five cases', () => {
  kase('MK-CF-O-007-C01', 'AGREE', (c) => {
    const i = c.inputs, e = c.expected;
    const org = organizer({ salaryFreq: 'annually', baseSalary: i.gross_wages, c_401k: i.pre_tax_401k / 12, filingStatus: i.filing_status });
    // federal_tax: the screen prints only the rate ("Est. effective federal rate ~7%"); the dollars are that rate × gross
    const s = seen(c.case_id, { ...org.steps!, federal_tax: org.estTaxRate! * org.steps!.grossIncome });
    money(s.grossIncome, e.gross.exact); money(s.preTaxContributions, e.k.exact); money(s.standardDeduction, e.standard.exact);
    money(s.taxableIncome, e.taxable.exact); money(s.federal_tax, e.federal_tax.exact);
  });
  // FIXED 2026-10-25 (tenet 3, DEC-0296; the figure's own declared refusal for MK-MN-M-028 "No income entered yet."): with no
  // profile the door handed back Gross income $0, Standard deduction $16,100, Taxable income $0 and a 0% rate — the screen
  // printed them. Now no walk and no rate: the refusal, and the screen's one line and door.
  kase('MK-CF-O-007-C02', 'AGREE', (c) => {
    const org: any = seen(c.case_id, organizer(c.inputs.profile, [], c.inputs.income_records));
    refuses(org.steps?.taxableIncome); refuses(org.estTaxRate);
    expect(org.refusal).toBe('Nothing entered yet.');   // Q48's words (DEC-0431); the screen keeps Gross income $0 above it
    expect(org.grossIncome).toBe(0);
  }, 'FIXED 2026-10-25: refuses (tenet 3, DEC-0296, MK-MN-M-028 refusal) — it printed $0 taxable and ~0%');
  test.failing('MK-CF-O-007-C02 · what the app gave before the fix (pinned, now failing): $0 taxable, a $16,100 deduction, 0%', () => {
    const org: any = organizer(null, [], []);
    expect(org.steps.taxableIncome).toBe(0); expect(org.steps.standardDeduction).toBe(16_100); expect(org.estTaxRate).toBe(0);
  });
  // FIXED 2026-10-25 (DEC-0179 #2 "the tax on them still comes out", DEC-0198; IRS Pub 550): paidOutByAccount skipped a
  // reinvested record, so a reinvested taxable dividend left the organizer's income altogether. It is counted now.
  kase('MK-CF-O-007-C03', 'AGREE', (c) => {
    const i = c.inputs, d = i.taxable_brokerage_dividend;
    const org = organizer({ salaryFreq: 'annually', baseSalary: N(i.wages), c_401k: (N(i.k) as number) / 12, filingStatus: 'single' },
      [BROKERAGE], [{ account_id: 'brk-1', type: 'DIVIDEND', amount: N(d.amount), date: d.date, reinvested: d.reinvested }]);
    const got = seen(c.case_id, { taxable_distribution: lineOf(org, 'Interest & dividends'), gross_before_k: org.steps!.grossIncome });
    money(got.taxable_distribution, c.expected.taxable_distribution.exact); money(got.gross_before_k, c.expected.gross_before_k.exact);
  }, 'FIXED 2026-10-25: the reinvested $731.17 dividend counts — gross $83,842.60 (it read $83,111.43; DEC-0179, DEC-0198)');
  test.failing('MK-CF-O-007-C03 · what the app gave before the fix (pinned, now failing): gross $83,111.43, the dividend dropped', () => {
    const i = C('MK-CF-O-007-C03').inputs, d = i.taxable_brokerage_dividend;
    const org = organizer({ salaryFreq: 'annually', baseSalary: N(i.wages), c_401k: (N(i.k) as number) / 12, filingStatus: 'single' },
      [BROKERAGE], [{ account_id: 'brk-1', type: 'DIVIDEND', amount: N(d.amount), date: d.date, reinvested: d.reinvested }]);
    expect(org.steps!.grossIncome).toBeCloseTo(83_111.43, 6);
  });
  // FIXED 2026-10-25 (DEC-0264, the precision rule): theTaxOrganizer rounded the accounts' income before the tax walk.
  kase('MK-CF-O-007-C04', 'AGREE', (c) => {
    const i = c.inputs;
    const org = organizer({ salaryFreq: 'annually', baseSalary: N(i.wages), filingStatus: 'single' }, [SAVINGS],
      i.taxable_interest_records.map((r: any) => ({ account_id: 'sav-1', type: 'INTEREST', amount: N(r.amount), date: r.date })));
    const got = seen(c.case_id, { interest: lineOf(org, 'Interest & dividends'), gross_before_deductions: org.steps!.grossIncome });
    money(got.interest, c.expected.interest.exact); money(got.gross_before_deductions, c.expected.gross_before_deductions.exact);
  }, 'FIXED 2026-10-25: $1,342.60 kept to the cent until it is shown (it was rounded to $1,343 inside the door; DEC-0264)');
  test.failing('MK-CF-O-007-C04 · what the app gave before the fix (pinned, now failing): $1,343', () => {
    const i = C('MK-CF-O-007-C04').inputs;
    const org = organizer({ salaryFreq: 'annually', baseSalary: N(i.wages), filingStatus: 'single' }, [SAVINGS],
      i.taxable_interest_records.map((r: any) => ({ account_id: 'sav-1', type: 'INTEREST', amount: N(r.amount), date: r.date })));
    expect(lineOf(org, 'Interest & dividends')).toBe(1343);
  });
  // OUTSIDE DOMAIN still (the one caller, TaxOrganizerScreen.tsx, passes `new Date().getFullYear()` — no screen asks for 2025),
  // but FIXED 2026-10-25 with W1: handed 2025, the door counts calendar 2025's records ($1,000), the reviewer's answer; it
  // counted the twelve months ending today ($2,000).
  kase('MK-CF-O-007-C05', 'OUTSIDE DOMAIN', (c) => {
    const org = organizer({ filingStatus: 'single' }, [SAVINGS],
      c.inputs.records.map((r: any) => ({ account_id: 'sav-1', type: 'INTEREST', amount: r.amount, date: r.date })), c.inputs.year);
    const got = seen(c.case_id, { year: org.year, tax_year_income: lineOf(org, 'Interest & dividends') });
    expect(got.year).toBe(2025);
    money(got.tax_year_income, c.expected.tax_year_income.exact);   // $1,000, calendar 2025 (DEC-0298)
  }, 'no caller sends a past year (TaxOrganizerScreen.tsx); FIXED 2026-10-25: calendar 2025, $1,000 (it read the trailing $2,000)');
});

describe('MK-CF-F-084 taxableAnnual — five cases', () => {
  for (const id of ['MK-CF-F-084-C01', 'MK-CF-F-084-C02', 'MK-CF-F-084-C03', 'MK-CF-F-084-C04']) {
    kase(id, 'AGREE', (c) => money(seen(c.case_id, taxableAnnual(fromSources(c.inputs))), c.expected.exact));
  }
  // APP WRONG (IRS Publication 915, tenets 1 and 7): all $24,000 of Social Security is counted as taxable. With nothing else,
  // combined income is ½ × $24,000 = $12,000, under the $25,000 base: none of it is taxable.
  // FIXED 2026-10-25 (FIX-INCOME-B; socialSecurityTaxedAnnual, IRS Publication 915 Worksheet 1): $12,000 is under the $25,000 base
  kase('MK-CF-F-084-C05', 'AGREE', (c) => money(seen(c.case_id, taxableAnnual(fromSources(c.inputs))), c.expected.exact),
    'FIXED 2026-10-25: Social Security taxed per IRS Pub 915 — $0');
  test.failing('MK-CF-F-084-C05 · what the app gave before the fix (pinned, now failing): Social Security counted in full, $24,000', () => {
    money(taxableAnnual(fromSources(C('MK-CF-F-084-C05').inputs)), '24000');
  });
});

describe('MK-CF-F-230 taxedAfterPreTax — five cases', () => {
  for (const id of ['MK-CF-F-230-C01', 'MK-CF-F-230-C02', 'MK-CF-F-230-C03']) {
    kase(id, 'AGREE', (c) => money(seen(c.case_id, taxedAfterPreTax(fromSources(c.inputs))), c.expected.exact));
  }
  // AGREE: the code takes the 401(k) for the six paid months only (MK-CF-F-206 householdK401ByMonth) — $66,490.91. The
  // reviewer's formula_gives ($59,359.72, twelve months) is not what the code does.
  kase('MK-CF-F-230-C04', 'AGREE', (c) => money(seen(c.case_id, taxedAfterPreTax(fromSources(c.inputs))), c.expected.exact),
    'paid months only, as MK-CF-F-206 counts them');
  // AGREE on the package's $24,000 — but that number carries the F-084-C05 fault (IRS Pub 915 gives $0) and contradicts the
  // reviewer's own F-084-C05. When taxableAnnual is fixed this case reads $0 and its expected $24,000 goes red: correct.
  // REVIEWER WRONG since 2026-10-25 (FIX-INCOME-B): the package's $24,000 carries the F-084-C05 fault; IRS Publication 915 taxes none
  // of $24,000 of Social Security with nothing else, so what the year is taxed on is $0 — the reviewer's own F-084-C05
  kase('MK-CF-F-230-C05', 'REVIEWER WRONG', (c) => money(seen(c.case_id, taxedAfterPreTax(fromSources(c.inputs))), c.expected.exact),
    'the package\'s $24,000 counts all of Social Security; IRS Pub 915 gives $0 (its own F-084-C05)');
  test('MK-CF-F-230-C05 · the app\'s answer, IRS Pub 915: $0', () => { money(taxedAfterPreTax(fromSources(C('MK-CF-F-230-C05').inputs)), '0'); });
});

describe('MK-CF-F-085 filingStatusOf — five cases', () => {
  const op = (i: any) => ({ ...(i.status != null ? { filingStatus: i.status } : {}), ...(i.spouse_present ? { hasPartner: 'yes' } : {}) });
  for (const id of ['MK-CF-F-085-C01', 'MK-CF-F-085-C02', 'MK-CF-F-085-C03']) {
    kase(id, 'AGREE', (c) => expect(seen(c.case_id, filingStatusOf(op(c.inputs) as any))).toBe(c.expected));
  }
  // SETTLED BY DEC-7944 and MK-CF-D-004 (under DEC-0176 #4 and the B31 ruling of 2026-08-27): with a spouse entered and no
  // answer, the status in force is jointly; the screen asks and the answer wins. The app gives the reviewer's "estimate".
  kase('MK-CF-F-085-C04', 'AGREE', (c) => expect(seen(c.case_id, filingStatusOf(op(c.inputs) as any))).toBe(c.expected.readings.estimate),
    'SETTLED BY DEC-7944 / MK-CF-D-004: jointly assumed, stated "Assumed — we have never asked"');
  kase('MK-CF-F-085-C05', 'AGREE', (c) => expect(seen(c.case_id, filingStatusOf(op(c.inputs) as any))).toBe(c.expected.readings.estimate),
    'SETTLED BY MK-CF-D-004 / base-pay.ts:41: absent means single, stated as assumed');
});

describe('MK-CF-F-086 stateRateOf — five cases', () => {
  for (const id of ['MK-CF-F-086-C01', 'MK-CF-F-086-C02', 'MK-CF-F-086-C03', 'MK-CF-F-086-C04', 'MK-CF-F-086-C05']) {
    kase(id, 'AGREE', (c) => rate(seen(c.case_id, stateRateOf({ stateTaxRate: c.inputs.state_percent } as any)), c.expected.exact));
  }
});

describe('MK-CF-F-087 monthlyTaxRates — five cases', () => {
  const twelve = (got: number[], e: any[]) => { expect(got).toHaveLength(12); got.forEach((g, m) => rate(g, e[m].exact)); };
  for (const id of ['MK-CF-F-087-C01', 'MK-CF-F-087-C02', 'MK-CF-F-087-C03', 'MK-CF-F-087-C05']) {
    kase(id, 'AGREE', (c) => twelve(seen(c.case_id, monthlyTaxRates(rateHousehold(c.inputs))), c.expected));
  }
  // FIXED 2026-10-26 by FIX-INCOME-A's part-year fix upstream, in MK-CF-F-180 enteredLandsAnnual and MK-CF-F-181 rateInForce: the
  // six paid months' own take-home and 401(k) — 57.00% (it read 13.99%, six paid months read as twelve; DEC-7938: "a take-home
  // typed as $6,200 reads $6,200"). monthlyTaxRates itself lays the one rate on every month, as ruled.
  kase('MK-CF-F-087-C04', 'AGREE', (c) => twelve(seen(c.case_id, monthlyTaxRates(rateHousehold(c.inputs))), c.expected),
    'FIXED 2026-10-26 upstream (F-180/F-181, FIX-INCOME-A): 57.00% (it read 13.99%, six paid months read as twelve; DEC-7938)');
  test.failing('MK-CF-F-087-C04 · what the app gave before the fix (pinned, now failing): 13.99% in every month', () => {
    expect(monthlyTaxRates(rateHousehold(C('MK-CF-F-087-C04').inputs))[6]).toBeCloseTo(0.1399, 4);
  });
});

describe('MK-CF-F-088 taxableByCalendarMonth — five cases', () => {
  const month = (i: any) => Number(String(i.month).slice(5, 7)) - 1;
  const op = (i: any): any => {
    const o: any = { salaryFreq: 'monthly', baseSalary: N(i.wages) ?? 0, c_401k: N(i.k) ?? 0 };
    const rent = N(i.rent_net) ?? 0;
    if (rent) o.rentals = [{ property_id: 'home-1', type: 'long', income: rent > 0 ? rent : 0, expenses: rent < 0 ? -rent : 0 }];
    if (N(i.interest)) o.invAnnual = (N(i.interest) as number) * 12;
    if (i.bonus) { o.bonusAnnual = N(i.bonus.amount); o.bonusMonth = Number(String(i.bonus.date).slice(5, 7)); }
    return o;
  };
  for (const id of ['MK-CF-F-088-C01', 'MK-CF-F-088-C02', 'MK-CF-F-088-C03', 'MK-CF-F-088-C05']) {
    kase(id, 'AGREE', (c) => money(seen(c.case_id, taxableByCalendarMonth(op(c.inputs))[month(c.inputs)]), c.expected.exact));
  }
  // APP WRONG (tenets 1 and 4): the month is floored at $0, so a rent loss bigger than the month's pay vanishes — and
  // incomeMonthlyGrid rebuilds the month's pay from this figure (taxable + 401(k)), so the month reads $311.43 gross and
  // $0 take-home where the money was $1,311.17 − $311.43 − $1,731.19 = −$731.45 (WITNESS W4).
  kase('MK-CF-F-088-C04', 'AGREE', (c) => money(seen(c.case_id, taxableByCalendarMonth(op(c.inputs))[month(c.inputs)]), c.expected.exact),
    'FIXED 2026-10-25 (FIX-INCOME-B): a rent loss is kept, never floored — −$731.45');
  test.failing('MK-CF-F-088-C04 · what the app gave before the fix (pinned, now failing): floored at $0', () => {
    const c = C('MK-CF-F-088-C04'); money(taxableByCalendarMonth(op(c.inputs))[month(c.inputs)], '0');
  });
});

describe('MK-CF-F-089 over65CountOf — five cases', () => {
  const WHO: Record<string, string> = { neither: 'neither', both: 'both', one: 'me' };
  const op = (i: any): any => ({ filingStatus: i.status, ...(i.age_question ? { over65Who: WHO[i.age_question] } : {}),
    ...(i.birth_year ? { birthYear: i.birth_year } : {}) });
  for (const id of ['MK-CF-F-089-C01', 'MK-CF-F-089-C02', 'MK-CF-F-089-C03']) {
    kase(id, 'AGREE', (c) => expect(seen(c.case_id, over65CountOf(op(c.inputs)))).toBe(Number(c.expected.exact)));
  }
  // RULED 2026-10-25 (the lead's ruling on CFR-4's needs-ruling 4, made without asking him): a joint return, the spouse's 65+
  // question unanswered, the person 66 — keep counting the person only (1), and say so where the deduction is shown: the Tax
  // organizer's line "Your spouse counted as under 65 — not entered ›", a door to the question (TaxableIncomeSteps
  // .spouseAgeNotEntered). The reviewer's refusal is answered by the line, not by withholding the deduction.
  kase('MK-CF-F-089-C04', 'NEEDS RULING', (c) => {
    expect(seen(c.case_id, over65CountOf(op(c.inputs)))).toBe(1);
    expect(organizer({ ...op(c.inputs), salaryFreq: 'annually', baseSalary: 60_000 }).steps!.spouseAgeNotEntered).toBe(true);
  }, 'RULED 2026-10-25 (lead): counted as under 65 (1), said on the Tax organizer with a door to the question');
  // OUTSIDE DOMAIN: the profile holds birthYear and birthMonth, never the day (src/domain/onboardingProfile.ts:61), so a
  // 1 January birthday cannot be sent. Recorded: born 1962 reads 64 in 2026 → 0, right for everyone born 2 Jan 1962 or later.
  kase('MK-CF-F-089-C05', 'OUTSIDE DOMAIN', (c) => {
    const got = seen(c.case_id, over65CountOf({ filingStatus: c.inputs.status, birthYear: c.inputs.birth_year, birthMonth: 1 } as any));
    expect(got).toBe(0);
  }, 'no birth day is captured (onboardingProfile.ts:61); birth year 1962 → 0');
});

describe('MK-CF-F-090 effectiveRate — five cases', () => {
  for (const id of ['MK-CF-F-090-C01', 'MK-CF-F-090-C02', 'MK-CF-F-090-C03', 'MK-CF-F-090-C05']) {
    kase(id, 'AGREE', (c) => {
      const op = rateHousehold(c.inputs);
      const got = seen(c.case_id, effectiveRate(op));
      expect(got).toBe(rateInForce(op).rate);   // one rate, delegated — no second calculation
      rate(got, c.expected.exact);
    });
  }
  kase('MK-CF-F-090-C04', 'AGREE', (c) => {
    const op = rateHousehold(c.inputs);
    const got = seen(c.case_id, effectiveRate(op));
    expect(got).toBe(rateInForce(op).rate);
    rate(got, c.expected.exact);
  }, 'FIXED 2026-10-26 upstream (F-180/F-181, FIX-INCOME-A): delegates faithfully, and the rate in force counts the six paid months — 57.00% (it read 13.99%)');
  test.failing('MK-CF-F-090-C04 · what the app gave before the fix (pinned, now failing): 13.99%', () => {
    expect(effectiveRate(rateHousehold(C('MK-CF-F-090-C04').inputs))).toBeCloseTo(0.1399, 4);
  });
});

describe('MK-CF-F-048 effectiveTaxRate — five cases (the legacy reader, through its one production chain)', () => {
  for (const id of ['MK-CF-F-048-C01', 'MK-CF-F-048-C05']) {
    kase(id, 'AGREE', (c) => rate(seen(c.case_id, legacyRate(rateHousehold(c.inputs))), c.expected.exact));
  }
  // FIXED 2026-10-25 by retirement (DEC-0184 one tax function, DEC-0196 one rate everywhere, DEC-0283 the 401(k) is not taxed,
  // DEC-0327 / DEC-7608 state on taxable income, tenet 4): the legacy chain never handed effectiveTaxRate a filing status, a
  // 401(k) or a state rate, and had no implied branch. effectiveTaxRate is gone; the chain reads MK-CF-F-181 rateInForce.
  kase('MK-CF-F-048-C02', 'AGREE', (c) => rate(seen(c.case_id, legacyRate(rateHousehold(c.inputs))), c.expected.exact),
    'FIXED 2026-10-25: the 401(k) comes off — 7.41% (it read 8.37%)');
  kase('MK-CF-F-048-C03', 'AGREE', (c) => rate(seen(c.case_id, legacyRate(rateHousehold(c.inputs))), c.expected.exact),
    'FIXED 2026-10-25: jointly, after the 401(k), with the 5% state rate — 10.93% (it read 15.86%)');
  // FIXED 2026-10-25 with FIX-INCOME's part-year fix of MK-CF-F-180/F-181: the chain reads F-181 now, and F-181 counts the six
  // paid months — 57.00% (it read 13.99%, six paid months read as twelve).
  kase('MK-CF-F-048-C04', 'AGREE', (c) => rate(seen(c.case_id, legacyRate(rateHousehold(c.inputs))), c.expected.exact),
    'FIXED 2026-10-25: reads MK-CF-F-181, which counts the six paid months — 57.00% (it read 13.99%)');
  test.failing('MK-CF-F-048-C02/C03 · what the app gave before the fix (pinned, now failing): 8.37% and 15.86%', () => {
    rate(legacyRate(rateHousehold(C('MK-CF-F-048-C02').inputs)), '0.08366666666666666666666666667');
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════
describe('witnesses — the reachable twins and the household numbers behind the formula verdicts (not among the 50)', () => {
  // W1 · MK-CF-O-007 · DEC-0298 "a tax figure requires a YEAR": the door counts the trailing twelve months for the year the
  // screen names. Tax organizer · 2026 on 2026-10-24: $500 paid 2025-11-14 and $700 paid 2026-03-13 → 2026's is $700.
  test('W1 · MK-CF-O-007 · "Tax organizer · 2026" counts only 2026\'s payments [FIXED 2026-10-25] — $700 (it read $1,200)', () => {
    const org = organizer({ filingStatus: 'single' }, [SAVINGS], [
      { account_id: 'sav-1', type: 'INTEREST', amount: 500, date: '2025-11-14' },
      { account_id: 'sav-1', type: 'INTEREST', amount: 700, date: '2026-03-13' }]);
    ACTUAL['W1'] = lineOf(org, 'Interest & dividends');
    expect(lineOf(org, 'Interest & dividends')).toBe(700);
  });
  test.failing('W1 · what the app gave before the fix (pinned, now failing): $1,200', () => {
    const org = organizer({ filingStatus: 'single' }, [SAVINGS], [
      { account_id: 'sav-1', type: 'INTEREST', amount: 500, date: '2025-11-14' },
      { account_id: 'sav-1', type: 'INTEREST', amount: 700, date: '2026-03-13' }]);
    expect(lineOf(org, 'Interest & dividends')).toBe(1200);
  });

  // W2 · MK-CF-O-007's 401(k) line reads MK-CF-F-188 (× 12) while MK-CF-F-230 counts paid months (DEC-7797; cross-card X5).
  // $8,000 a month for six months, $1,000 a month into the 401(k), single: $6,000 went in; the organizer subtracts $12,000.
  const SIX: any = { salaryFreq: 'monthly', baseSalary: 8000, salaryByMonth: payTable(8000, 6), c_401k: 1000, filingStatus: 'single' };
  // FIXED 2026-10-25 by FIX-INCOME's MK-CF-F-188 (the 401(k) of the paid months only), which the organizer's walk reads
  test('W2 · MK-CF-O-007 / MK-CF-F-188 · six paid months, the 401(k) line reads six [FIXED 2026-10-25] — $6,000 (it read $12,000)', () => {
    const org = organizer(SIX);
    ACTUAL['W2'] = { organizer401k: org.steps!.preTaxContributions, organizerTaxable: org.steps!.taxableIncome, taxedAfterPreTax: taxedAfterPreTax(SIX) };
    expect(org.steps!.preTaxContributions).toBe(6000);
  });
  test.failing('W2 · what the app gave before the fix (pinned, now failing): organizer 401(k) $12,000 and taxable $19,900', () => {
    const org = organizer(SIX);
    expect(org.steps!.preTaxContributions).toBe(12000);
    expect(org.steps!.taxableIncome).toBe(48000 - 12000 - 16100);
    expect(taxedAfterPreTax(SIX)).toBe(48000 - 6000);
  });

  // W3 · MK-CF-F-085 filingStatusOf, on the Tax organizer screen: TaxOrganizerScreen.tsx printed the raw answer (`filingStatus ?? 'single'`) as
  // "Single — Assumed — we have never asked", while the walk under it used filingStatusOf's jointly (DEC-7944): the $32,200
  // deduction. FIXED 2026-10-25: the line reads filingStatusOf — "Married, filing jointly", assumed — rendered in
  // src/screens/__tests__/tax_organizer_q46.test.tsx. Pinned here are the two facts the screen now puts side by side.
  test('W3 · MK-CF-F-085 · a spouse, no answer: the walk is joint ($32,200) and the line reads the status in force [FIXED — screen]', () => {
    const op: any = { hasPartner: 'yes', salaryFreq: 'annually', baseSalary: 90000 };
    expect(op.filingStatus ?? 'single').toBe('single');            // what TaxOrganizerScreen.tsx:68 prints from
    expect(filingStatusOf(op)).toBe('married');                    // what the tax is worked on
    expect(organizer(op).steps!.standardDeduction).toBe(32200);
    expect(organizer(op).steps!.spouseAgeNotEntered).toBe(true);   // the lead's ruling of 2026-10-25: said, with a door
  });

  // W4 · MK-CF-F-088 → MK-CF-F-092 incomeMonthlyGrid: the floored month rebuilds pay as taxable + 401(k).
  // FIXED 2026-10-25 (FIX-INCOME-B): the month is no longer floored, so the month grid rebuilds the real month — a loss included
  test('W4 · MK-CF-F-088 · F-088-C04\'s month in the month grid: gross $1,311.17 − $1,731.19 = −$420.02, take-home −$731.45 [FIXED 2026-10-25]', () => {
    const op: any = { salaryFreq: 'monthly', baseSalary: 1311.17, c_401k: 311.43, taxMode: 'manual', manualTaxRate: 0, rentals: [{ property_id: 'home-1', type: 'long', income: 0, expenses: 1731.19 }] };
    expect(incomeMonthlyGrid(op, 'gross')[9].amount).toBeCloseTo(1311.17 - 1731.19, 6);
    expect(incomeMonthlyGrid(op, 'available')[9].amount).toBeCloseTo(1311.17 - 311.43 - 1731.19, 6);
    ACTUAL['W4'] = { gross: incomeMonthlyGrid(op, 'gross')[9].amount, available: incomeMonthlyGrid(op, 'available')[9].amount, right_available: 1311.17 - 311.43 - 1731.19 };
  });
  test.failing('W4 · what the app gave before the fix (pinned, now failing): gross $311.43, take-home $0', () => {
    const op: any = { salaryFreq: 'monthly', baseSalary: 1311.17, c_401k: 311.43, rentals: [{ property_id: 'home-1', type: 'long', income: 0, expenses: 1731.19 }] };
    expect(incomeMonthlyGrid(op, 'gross')[9].amount).toBeCloseTo(311.43, 6);
  });
  test('W4b · MK-CF-F-088 · pay stops after June, rent loses $200 a month: July to December read −$200, not $0 [FIXED 2026-10-25]', () => {
    const op: any = { salaryFreq: 'monthly', baseSalary: 6000, salaryByMonth: payTable(6000, 6), c_401k: 500,
      rentals: [{ property_id: 'home-1', type: 'long', income: 1000, expenses: 1200 }] };
    const t = taxableByCalendarMonth(op);
    expect(t[6]).toBeCloseTo(-200, 6);                             // July: −$200 of rent, kept
    expect(t[0]).toBeCloseTo(6000 - 500 - 200, 6);                 // January: the loss is kept while there is pay
    expect(incomeMonthlyGrid(op, 'gross')[6].amount).toBeCloseTo(-200, 6);
    ACTUAL['W4b'] = { julyTaxable: t[6], julyGross: incomeMonthlyGrid(op, 'gross')[6].amount, right: -200 };
  });
  test.failing('W4b · what the app gave before the fix (pinned, now failing): July read $0', () => {
    const op: any = { salaryFreq: 'monthly', baseSalary: 6000, salaryByMonth: payTable(6000, 6), c_401k: 500,
      rentals: [{ property_id: 'home-1', type: 'long', income: 1000, expenses: 1200 }] };
    expect(taxableByCalendarMonth(op)[6]).toBe(0);
  });

  // W5 · Additional Medicare (the handoff's priority finding): two $150,000 wages filing jointly.
  test('W5 · MK-CF-F-198 payrollTaxWithheld · each $150,000 wage withholds $0 of Additional Medicare [AGREE]; the household path computes none of the $450 by DEC-0384', () => {
    const extra = (w: number) => payrollTaxWithheld(w) - (Math.min(w, 184_500) * 0.062 + w * 0.0145);
    expect(extra(150_000)).toBeCloseTo(0, 9);                      // per employer, above $200,000 only (IRC §3101(b)(2))
    expect(extra(150_000) + extra(150_000)).toBeCloseTo(0, 9);    // basePay's shortBy sums per earner (base-pay.ts:973)
    // the household tax path is federal income tax (+ the typed state rate) only — DEC-0384: no payroll tax, said on screen
    const op: any = { whoEarns: 'both', filingStatus: 'married', salaryFreq: 'annually', baseSalary: 150_000,
      partnerWage: { salaryFreq: 'annually', baseSalary: 150_000 } };
    const t = taxOwedFor(taxedAfterPreTax(op), 'married', 0, 0);
    expect(t).toBeCloseTo(taxOwedFor(300_000, 'married'), 6);      // ordinary bands only: no 0.9% × $50,000 = $450 inside
    expect(rateInForce(op).covers).toBe('federal income tax only, assuming the standard deduction');
    ACTUAL['W5'] = { withholdingExtraEach: extra(150_000), householdFederal: t, householdAdditionalMedicareModelled: 0, statutory: 0.009 * (300_000 - 250_000) };
  });

  // W6 · MK-CF-F-084 → MK-CF-F-181: a 63-year-old, single, $2,000 a month of Social Security and nothing else.
  test('W6 · MK-CF-F-084 · Social Security only, 63, single: calculated tax $0 a year, as IRS Pub 915 gives [FIXED 2026-10-25]', () => {
    const op: any = { ri_ss: 2000, filingStatus: 'single', birthYear: 1963 };
    const yearly = rateInForce(op).rate * taxableAnnual(op);
    expect(yearly).toBe(0);
    expect(incomeMonthlyGrid(op, 'available')[0].amount).toBeCloseTo(2000, 6);   // the whole $2,000 lands, untaxed
    ACTUAL['W6'] = { yearly, monthly: yearly / 12, right: 0 };
  });
  test.failing('W6 · what the app gave before the fix (pinned, now failing): $790 a year of calculated tax', () => {
    const op: any = { ri_ss: 2000, filingStatus: 'single', birthYear: 1963 };
    expect(rateInForce(op).rate * taxableAnnual(op)).toBeCloseTo((24000 - 16100) * 0.10, 6);
  });
});

describe("part 17's own source checks — five topics, byte-identical to MoneyKeel_CashFlow_Source_Checks.json", () => {
  test('the five topics are the Source_Checks file\'s own (every witness is run in the lead\'s sources file)', () => {
    const SRC = JSON.parse(fs.readFileSync(path.join(PKG, 'MoneyKeel_CashFlow_Source_Checks.json'), 'utf8'));
    expect(PART.source_checks).toHaveLength(5);
    for (const s of PART.source_checks) expect(SRC.source_checks.find((x: any) => x.topic === s.topic)).toEqual(s);
  });
  test('the printed 2026 bands equal TAX_TABLES for all four filing statuses (constants only)', () => {
    const bands = PART.source_checks.find((s: any) => /bands/.test(s.topic)).amounts_checked;
    for (const st of ['single', 'married', 'mfs', 'hoh'] as const) {
      expect(TAX_TABLES[st].brackets.map(([top, r]) => [top === Infinity ? null : top, r])).toEqual(bands[st]);
    }
  });
});

// ── coverage: every case in the part, once ──────────────────────────────────────────────────────────
test('coverage — 50 of 50 part-17 cases were handed to the app, each once', () => {
  const pkg = PART.cases.map((c: any) => c.case_id);
  expect(pkg).toHaveLength(50);
  expect(new Set(pkg).size).toBe(50);
  expect([...RAN].sort()).toEqual([...pkg].sort());
});
