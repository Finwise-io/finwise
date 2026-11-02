/* THE OUTSIDE CASES, RUN AGAINST THE APP — Cash flow module, OpenAI package of 2026-10-24, PART 5 of 19.
 * "The income summary, the income manager, and income paid by accounts."
 * Cards (ID first, name in brackets): MK-CF-O-004 (incomeSummary) · MK-CF-O-016 (incomeSources) · MK-CF-O-019
 * (theIncomeManager) · MK-CF-F-210 (annualOfSource) · MK-CF-F-182 (asPercent) · MK-CF-F-183 (paidOutByAccount) · MK-CF-F-184
 * (incomeFromAccounts) · MK-CF-F-127 (isRental) · MK-CF-F-044 (annualNet) · MK-CF-F-045 (grossAnnualBaseline) · MK-CF-F-046
 * (employerMatchAnnual) · MK-CF-F-161 (monthlyGrossOfSource) · MK-CF-F-049 (buildIncomeState) · MK-CF-F-129 (round4) ·
 * MK-CF-F-052 (getIncomeState).
 * This file's share: part 5's 75 cases, its 7 formula verdicts that are not RIGHT (O-004, O-016, O-019, F-210, F-183, F-184,
 * F-049) and its 9 rules NOT HELD (DEC-0181, DEC-0184, DEC-0188, DEC-0196, DEC-0207, DEC-0376, DEC-7797, DEC-7798, DEC-7887).
 * The 3 HELD rules (DEC-0279, DEC-6796, DEC-7933) and the 29 CANNOT TELL rules are recorded in the results file.
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/
 * MoneyKeel_CashFlow_Independent_Audit/audit_results/MoneyKeel_CashFlow_Audit_Part_05.json. Every expected answer is READ
 * FROM THE PACKAGE (C(case_id).expected), never retyped; only plain input names are mapped onto the app's fields.
 * Results, case by case: MoneyKeel/documents/audit/outside-test-cases/returned/results/cashflow_openai_part05_results.json
 *
 * MEASURED ONLY (2026-10-25, CFR-2 part 5): no app code, record, drawing or existing test was changed.
 *
 * Markers: AGREE → test on the reviewer's answer · APP WRONG → test.failing on the reviewer's answer (turns red when fixed)
 * plus a twin pinning what the app gives today ("app today") · REVIEWER WRONG → none in this part · NEEDS RULING → none ·
 * OUTSIDE DOMAIN → test.skip with the reason, and a plain probe beside it recording what the function does.
 *
 * WHO CALLS WHAT IN PRODUCTION (read from the disk by the "reach" tests at the bottom, never typed from memory):
 *   incomeSummary — IncomeSummaryScreen, IncomeManagerScreen, CashFlowScreen, FilingStatusScreen, onboarding/modules.tsx (live).
 *   theIncomeManager — IncomeManagerScreen (live, /income-manager).
 *   incomeFromAccounts (and inside it paidOutByAccount, asPercent) — IncomeManagerScreen, IncomeDetailScreen, onboarding
 *     modules.tsx, MK-CF-O-007 theTaxOrganizer (live).
 *   buildIncomeState (and inside it effectiveTaxRate, grossAnnualBaseline, annualNet, employerMatchAnnual, monthlyGrossOfSource,
 *     isRental, round4) — MK-XS-F-031 buildSnapshot ← HomeScreen (Home reads ONLY snap.networth from it) and IncomeDetailScreen
 *     (/income-detail: NO WAY IN on the screen map). Live code whose figures reach no screen a person can open.
 *   incomeSources, annualOfSource, getIncomeState — no production caller at all.
 *
 * INPUT NAMES MAPPED (the app's fields, never the answers):
 *   An earner's gross_annual → baseSalary with salaryFreq 'annually'; take_home_monthly → landsTypical (the take-home typed
 *     each month, base-pay.ts entryFromWage); k_monthly → c_401k; a second earner → whoEarns 'both' + partnerWage {same fields}.
 *     A "job" in a sources list given only its take-home gets a gross of twelve take-homes, because the income manager and
 *     incomeSources list a job only once it has a wage (only the kinds and the rent are compared there). O-004-C04 is run as
 *     given — a take-home and no gross; its agreement probe adds a $7,000/month gross so both month grids hold a wage.
 *   rent / cost (or rent_monthly / rent_cost) → rentals [{ type 'long', income, expenses, property_id }] (a rent entry must
 *     name its property, DEC-4059d). dividends_annual → invAnnual; dividends_to_bank false → invPaidToBank unset (reinvested).
 *     bonus {amount, date} → bonusAnnual + bonusMonth (the date's month). support_monthly → supportMonthly. benefits monthly →
 *     benefitMonthly (all twelve months). interest yearly → invAnnual. stock_vest {amount, date} → rsuGrants [{ shares 25,
 *     price 400, date }] ($10,000), no wage when current_job is false.
 *   rate_mode 'typed' + rate → taxMode 'manual' + manualTaxRate (percent). For MK-CF-F-049 a "household_rate" with rate_mode
 *     'calculated' cannot be dictated to a calculated rate, so it is handed in as that same rate typed — both paths then hold
 *     the reviewer's rate and the difference isolates the arithmetic; C03 (married, 5% state) is run in calculated mode.
 *     other_taxable_monthly → otherAmount, otherFreq 'monthly'. planned_spend / debt_due have no input on buildIncomeState
 *     (it carries no outflow) and are not handed in.
 *   Reviewer kinds → the app's: job ↔ salary (incomeSources) / employment (manager); rent ↔ rental; stock ↔ equity; interest
 *     ↔ investment_income; benefits ↔ benefits; support ↔ support. Kind lists are compared as sets (the manager orders by the
 *     picker, which its card states).
 *   payout records {date, signed_cash, account, reinvested} → transactions { type 'DIVIDEND', amount signed_cash, account_id,
 *     reinvested, date }, read by the app's own ledger rule (moneyIntoAccount). now = 2026-10-24 12:00 local (the as_of).
 *   accounts for incomeFromAccounts → AssetAccount rows: cash → kind 'savings' asset_class 'cash' coupon_rate; bond →
 *     kind 'bond' asset_class 'bonds' face_value / coupon_rate / maturity_date / balance; bank_cd → kind 'cd' cd_bought 'bank'
 *     asset_class 'bonds'. recorded_ttm {A: 400} → one INTEREST record of $400 dated 2026-06-01.
 *   annualNet / grossAnnualBaseline / employerMatchAnnual {amount, rent_cost, periods} → IncomeSource { income_type
 *     LONG_TERM_RENTAL when rent_cost > 0 else W2_JOB, gross_amount, operating_expenses, frequency by periods (12 MONTHLY, 1
 *     ANNUAL, 4 QUARTERLY, 26 BIWEEKLY) }; employerMatchAnnual reads each amount as employer_match_amount (the package note).
 *   monthlyGrossOfSource {amount, cost, kind, frequency, month, weights} → IncomeSource { frequency, landing_month,
 *     landing_months [{month, share}] }. isRental source_kind → rental_long 'LONG_TERM_RENTAL', rental_short
 *     'SHORT_TERM_RENTAL', salary 'W2_JOB', interest 'INVESTMENT'.
 *   getIncomeState supplied_result → the stored income document (the storage read is replaced by a mock in this file only);
 *     total → total_gross_annual, rate → effective_tax_rate; the domain result must come back unchanged.
 *   asPercent, paidOutByAccount, isRental, monthlyGrossOfSource and round4 are not exported: each is compiled from its own
 *     source text with the functions it imports handed in under their own names — the app's text, nothing retyped.
 * TOLERANCES: money to 1e-6 dollars (toBeCloseTo …, 6), rates to 1e-9; strings exact. REFUSES = no number (null), never 0.
 * "shown" strings are screen formatting and are not asserted.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

jest.mock('../../../src/domain/_shared/firestore', () => ({ getUserDoc: jest.fn(), setUserDoc: jest.fn() }));
import { getUserDoc } from '../../../src/domain/_shared/firestore';
import { incomeSummary, incomeSources, theIncomeManager } from './income-summary';
import * as SUMMARY from './income-summary';
import { taxedSourcesAnnual } from '../../../src/domain/income/onboarding';
import { incomeFromAccounts } from '../../../src/domain/income/from-accounts';
import {
  annualNet, grossAnnualBaseline, employerMatchAnnual, buildIncomeState, getIncomeState, incomeFromOnboarding,
  incomeMonthlyGrid, taxableAnnual,
} from '../../../src/domain/income';
import * as INCOME from '../../../src/domain/income';
import { rateInForce } from '../../../src/domain/income/tax-rate';
import { buildDatedGrid } from '../../../src/domain/grid';
import { isoLocalDate } from '../../../src/domain/_shared/dates';
import { moneyIntoAccount } from '../../../Calculation Module code/engines/ledger';
import { debtPaymentsByDebt } from './this-month';
import { DEBT_CATEGORY } from './logged-expenses';

// ── the package, read as it came ────────────────────────────────────────────────────────────────────
type Mark = 'AGREE' | 'APP WRONG' | 'REVIEWER WRONG' | 'NEEDS RULING' | 'BLOCKED' | 'OUTSIDE DOMAIN';
const PKG = path.join(__dirname, '../../documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/MoneyKeel_CashFlow_Independent_Audit/audit_results');
const PART = JSON.parse(fs.readFileSync(path.join(PKG, 'MoneyKeel_CashFlow_Audit_Part_05.json'), 'utf8'));
const C = (caseId: string): any => {
  const c = PART.cases.find((x: any) => x.case_id === caseId);
  if (!c) throw new Error(`no case ${caseId} in the package`);
  return c;
};
const RAN: string[] = [];
/** CFR_FLIP=1 runs every test.failing as a plain test, to see that each fails on its own check (the wrong number), not on a crash */
const FLIP = process.env.CFR_FLIP === '1';
const runner = (mark: Mark) => (mark === 'APP WRONG' || mark === 'REVIEWER WRONG' ? (FLIP ? test : test.failing) : mark === 'BLOCKED' || mark === 'OUTSIDE DOMAIN' ? test.skip : test);
const kase = (caseId: string, mark: Mark, fn: (c: any) => void, note = '') => {
  RAN.push(caseId);
  const c = C(caseId);
  runner(mark)(`${caseId} · ${c.kind} · ${c.title} [${mark}]${note ? ` — ${note}` : ''}`, () => fn(c));
};
/** a twin: the app's answer today, pinned (plain test) */
const today = (caseId: string, what: string, fn: (c: any) => void) => test(`${caseId} · app today — ${what}`, () => fn(C(caseId)));
/** the app's answer before the fix, pinned as test.failing so it goes red if the fault comes back (2026-10-25, FIX-INCOME-B) */
const before = (caseId: string, what: string, fn: (c: any) => void) => test.failing(`${caseId} · what the app gave before the fix (pinned, now failing) — ${what}`, () => fn(C(caseId)));
const VERDICTS: string[] = [];
const verdict = (id: string, mark: Mark, title: string, fn: () => void) => {
  VERDICTS.push(id);
  runner(mark)(`${id} · ${title} [${mark}]`, fn);
};

// ── helpers ─────────────────────────────────────────────────────────────────────────────────────────
/** the package's exact value as a number: {exact} objects, decimal strings, "a/b" rationals */
const X = (v: any): number => {
  const e = v != null && typeof v === 'object' && 'exact' in v ? v.exact : v;
  if (typeof e === 'number') return e;
  const s = String(e).replace('−', '-');
  if (s.includes('/')) { const [a, b] = s.split('/'); return Number(a) / Number(b); }
  return Number(s);
};
const money = (got: number, want: any) => expect(got).toBeCloseTo(X(want), 6);
const moneys = (got: number[], want: any[]) => { expect(got).toHaveLength(want.length); got.forEach((g, i) => money(g, want[i])); };
const N = (v: any) => (v == null ? 0 : X(v));
const NOW = new Date(2026, 9, 24, 12, 0, 0);   // 2026-10-24, the package's as_of, local noon

/** compile a function that is not exported from its own source text, its imports handed in under their own names */
const compile = (file: string, start: RegExp, end: string, name: string, imports: Record<string, unknown> = {}) => {
  const text = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const at = text.search(start);
  if (at < 0) throw new Error(`${start} not found in ${file}`);
  const code = text.slice(at, text.indexOf(end, at) + end.length);
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText;
  return new Function(...Object.keys(imports), `${js}\nreturn ${name};`)(...Object.values(imports));
};
import { percentDigits } from '../_figure-spec';   // the one percent writer (R24, 2026-11-01)
const FROM_ACCOUNTS = '../../../src/domain/income/from-accounts.ts';
const CALC = '../../../src/domain/income/calc.ts';
// since 2026-11-01 (FX-CF-C, R24) asPercent writes through the one percent writer, handed in under its own name
const asPercent: (r: number) => string = compile(FROM_ACCOUNTS, /const asPercent = \(r: number\)/, ';', 'asPercent', { percentDigits });
const paidOutByAccount: (t: any[], now: Date) => Map<string, number> =
  compile(FROM_ACCOUNTS, /function paidOutByAccount\(/, '\n}\n', 'paidOutByAccount', { isoLocalDate, moneyIntoAccount });
const isRental: (t: any) => boolean = compile(CALC, /const isRental = \(t: string\)/, ';', 'isRental');
const monthlyGrossOfSource: (s: any) => number[] = compile(CALC, /function monthlyGrossOfSource\(/, '\n}\n', 'monthlyGrossOfSource', { isRental });
const round4: (n: number) => number = compile(CALC, /const round4 = \(n: number\)/, ';', 'round4');

// ── adapters ────────────────────────────────────────────────────────────────────────────────────────
const typed = (rate: any) => ({ taxMode: 'manual', manualTaxRate: X(rate) * 100 });
const rental = (income: any, expenses: any, property = 'A') => ({ type: 'long', income: X(income), expenses: X(expenses), property_id: property });
/** a list of plain sources → the profile the income screens read */
const profileOf = (sources: any[], currentJob = true): any => {
  const op: any = {};
  for (const s of sources) {
    if (s.kind === 'job' && currentJob) {
      if (s.gross != null) { op.baseSalary = X(s.gross); op.salaryFreq = 'annually'; }
      if (s.take_home_monthly != null) op.landsTypical = X(s.take_home_monthly);
      if (op.baseSalary == null) { op.baseSalary = X(s.take_home_monthly) * 12; op.salaryFreq = 'annually'; }   // a job has a wage
    }
    if (s.kind === 'benefits') op.benefitMonthly = X(s.monthly);
    if (s.kind === 'support') op.supportMonthly = X(s.monthly);
    if (s.kind === 'interest') op.invAnnual = X(s.yearly);
    if (s.kind === 'rent') op.rentals = [...(op.rentals ?? []), rental(s.rent, s.cost, s.property)];
  }
  return op;
};
const stockOnly = (i: any) => ({ rsuGrants: [{ shares: 25, price: X(i.stock_vest.amount) / 25, date: i.stock_vest.date }] });
const KIND_SOURCES: Record<string, string> = { salary: 'job', rental: 'rent', equity: 'stock' };
const KIND_MANAGER: Record<string, string> = { employment: 'job', rental: 'rent', investment_income: 'interest', benefits: 'benefits', support: 'support' };
const sorted = (xs: string[]) => [...xs].sort();

const FREQ: Record<number, string> = { 12: 'MONTHLY', 1: 'ANNUAL', 4: 'QUARTERLY', 26: 'BIWEEKLY', 52: 'WEEKLY' };
const sourceOf = (s: any, match = false): any => ({
  income_source_id: 'x', income_type: N(s.rent_cost) > 0 ? 'LONG_TERM_RENTAL' : 'W2_JOB',
  gross_amount: match ? 0 : X(s.amount), operating_expenses: N(s.rent_cost), frequency: FREQ[s.periods],
  ...(match ? { employer_match_amount: X(s.amount) } : {}),
});

/** buildIncomeState as production reaches it: the profile → incomeFromOnboarding → buildIncomeState (snapshot.ts:134-135).
 *  FIXED 2026-10-25 (FIX-TAX): both production callers hand it the profile too, and it reads the one take-home and the one
 *  rate (MK-CF-F-181) from the household path; the record read without a profile (getIncomeState) is `recordState`. */
const legacyState = (op: any) => { const doc = incomeFromOnboarding('u1', op); return buildIncomeState('u1', doc.sources, doc.tax, op); };
const recordState = (op: any) => { const doc = incomeFromOnboarding('u1', op); return buildIncomeState('u1', doc.sources, doc.tax); };
/** the household path: the dated month grid every Cash flow screen reads — this month's take-home */
const gridInflow = (op: any) => buildDatedGrid(op, { now: NOW }).cells[0].inflow;
/** the F-049 households: one wage, its 401(k), the reviewer's rate (typed), other taxable income */
const f049op = (i: any) => ({
  baseSalary: X(i.wage_gross_monthly), salaryFreq: 'monthly', c_401k: X(i.k_monthly), ...typed(i.household_rate),
  ...(N(i.other_taxable_monthly) > 0 ? { otherAmount: X(i.other_taxable_monthly), otherFreq: 'monthly' } : {}),
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
describe('MK-CF-O-004 incomeSummary — five cases', () => {
  kase('MK-CF-O-004-C01', 'AGREE', (c) => {
    const s = incomeSummary({ baseSalary: X(c.inputs.gross_annual), salaryFreq: 'annually', landsTypical: X(c.inputs.take_home_monthly), c_401k: X(c.inputs.k_monthly) });
    moneys(s.lands.lines.map((l) => l.amount), c.expected.take_home_rows);
    money(s.lands.usualMonth, c.expected.usual_month);
    money(s.taxed.grossAnnual, c.expected.gross);
    money(s.taxed.k401Annual, c.expected.k);
    money(s.taxed.taxedOn, c.expected.before_standard_deduction);
  });
  kase('MK-CF-O-004-C02', 'AGREE', (c) => {
    const s = incomeSummary({ rentals: [rental(c.inputs.rent, c.inputs.cost)], ...typed(c.inputs.rate) });
    moneys(s.lands.lines.map((l) => l.amount), c.expected.rows);
    money(s.lands.usualMonth, c.expected.usual_month);
    money(s.taxed.grossAnnual, c.expected.gross_annual);
  });
  // THE APPROVED DRAWING'S HOUSEHOLD (income-end-to-end v07, frame 16), exactly as the card describes it. The reviewer's RULE UNCLEAR
  // on "what it is taxed on" is settled by the drawing's own dated READ THIS FIRST row of 2026-10-24 (DEC-7887, under his DEC-0283):
  // "Your 401(k)s ... (“−$14,400” for frame 5a’s household, $800 and $400 a month) ... ($167,400 − $14,400 = $153,000)". Both
  // readings are run: with no 401(k), as the card's household is described, and with the row's $800 and $400.
  const frame16 = (i: any, k?: [number, number]) => ({
    baseSalary: X(i.earner_1.gross_annual), salaryFreq: 'annually', landsTypical: X(i.earner_1.take_home_monthly),
    whoEarns: 'both', partnerName: 'Sam',
    partnerWage: { baseSalary: X(i.earner_2.gross_annual), salaryFreq: 'annually', landsTypical: X(i.earner_2.take_home_monthly), ...(k ? { c_401k: k[1] } : {}) },
    ...(k ? { c_401k: k[0] } : {}),
    rentals: [rental(i.rent_monthly, i.rent_cost, 'house')], invAnnual: X(i.dividends_annual),
    bonusAnnual: X(i.bonus.amount), bonusMonth: Number(String(i.bonus.date).slice(5, 7)), ...typed('0.24'),
  });
  kase('MK-CF-O-004-C03', 'AGREE', (c) => {
    const s = incomeSummary(frame16(c.inputs));
    moneys(s.lands.lines.map((l) => l.amount), c.expected.take_home_rows);
    money(s.lands.usualMonth, c.expected.usual_month);
    money(s.taxed.grossAnnual, c.expected.taxed_gross_before_k);
    money(s.taxed.taxedOn, c.expected.taxed_after_k.readings.no_k);                         // the household as the card describes it
    const withK = incomeSummary(frame16(c.inputs, [800, 400]));                             // the drawing's READ THIS FIRST row (DEC-7887)
    money(withK.taxed.k401Annual, 14400);
    money(withK.taxed.taxedOn, c.expected.taxed_after_k.readings.if_k_14400);
    money(withK.lands.usualMonth, c.expected.usual_month);                                  // entered take-homes are used as typed
  }, 'RULE UNCLEAR settled by the drawing\'s READ THIS FIRST row, DEC-7887 under DEC-0283');
  // A RENTAL THAT LOSES MONEY IS DROPPED FROM THE TAKE-HOME ROWS (income-summary.ts: `if (rent > 0)`). The app holds two answers
  // for this household's month: incomeMonthlyGrid (sign-up's income recap, the Budget and Goals screens, a percent-of-income
  // budget) counts the loss, $4,791.41; this door and the dated month grid of the Cash flow tab (MK-XS-F-004 buildDatedGrid,
  // `if (rentalM > 0)`) drop it, $5,111.17. The running costs are paid from the household's bank, so the loss is real money out.
  // Tenet 1, tenet 4 (one thing, one number) and DEC-0376 (a total agrees with its lines).
  kase('MK-CF-O-004-C04', 'AGREE', (c) => {
    const s = incomeSummary({ landsTypical: X(c.inputs.wage_take_home_monthly), rentals: [rental(c.inputs.rent, c.inputs.rent_cost)], ...typed(c.inputs.rate) });
    moneys(s.lands.lines.map((l) => l.amount), c.expected.rows);
    money(s.lands.usualMonth, c.expected.usual_month);
  }, 'FIXED 2026-10-25 (FIX-INCOME-B): a rental loss is a row, as incomeMonthlyGrid counts it (tenets 1, 4; DEC-0376)');
  before('MK-CF-O-004-C04', 'rows [5111.17], usual month 5111.17, rent row left out', (c) => {
    const s = incomeSummary({ landsTypical: X(c.inputs.wage_take_home_monthly), rentals: [rental(c.inputs.rent, c.inputs.rent_cost)], ...typed(c.inputs.rate) });
    moneys(s.lands.lines.map((l) => l.amount), [5111.17]);
    money(s.lands.usualMonth, 5111.17);
  });
  // SUPPORT ONLY: the take-home rows hold the $1,000, but `ready` is false (it asks only for a salary or taxed income), and the
  // Income summary then prints "$0" and "Nothing entered yet." (IncomeSummaryScreen.tsx: `sum.ready ? … : 0`). Tenets 1 and 3.
  kase('MK-CF-O-004-C05', 'AGREE', (c) => {
    const s = incomeSummary({ supportMonthly: X(c.inputs.support_monthly) });
    expect(s.ready).toBe(c.expected.ready);
    moneys(s.lands.lines.map((l) => l.amount), c.expected.take_home_rows);
    money(s.lands.usualMonth, c.expected.usual_month);
    money(s.taxed.grossAnnual, c.expected.taxable_annual);
  }, 'FIXED 2026-10-25 (FIX-INCOME-B): something arriving is something entered — the screen prints the $1,000 (tenets 1, 3)');
  before('MK-CF-O-004-C05', 'ready false; rows [1000], usual 1000, taxable 0', (c) => {
    const s = incomeSummary({ supportMonthly: X(c.inputs.support_monthly) });
    expect(s.ready).toBe(false);
    money(s.lands.usualMonth, 1000);
    money(s.taxed.grossAnnual, 0);
  });
});

describe('MK-CF-O-016 incomeSources — five cases (no production caller: CashFlowScreen builds its own list)', () => {
  const kinds = (op: any) => incomeSources(op).map((x) => KIND_SOURCES[x.kind] ?? x.kind);
  kase('MK-CF-O-016-C01', 'AGREE', (c) => { expect(sorted(kinds(profileOf(c.inputs.sources)))).toEqual(sorted(c.expected.entered_kinds)); });
  kase('MK-CF-O-016-C02', 'AGREE', (c) => { expect(kinds(profileOf(c.inputs.sources))).toEqual(c.expected.entered_kinds); });
  kase('MK-CF-O-016-C03', 'AGREE', (c) => {
    expect(sorted(kinds(profileOf(c.inputs.sources)))).toEqual(sorted(c.expected.entered_kinds));
    const by = (k: string) => incomeSources(profileOf(c.inputs.sources)).find((x) => x.kind === k)!;
    money(by('benefits').amount, c.expected.period_values[0].monthly); expect(by('benefits').per).toBe('month');
    money(by('support').amount, c.expected.period_values[1].monthly); expect(by('support').per).toBe('month');
    money(by('interest').amount, c.expected.period_values[2].yearly); expect(by('interest').per).toBe('year');
  }, 'FIXED 2026-10-25 (FIX-INCOME-B): benefits, support and interest each have a row, in their own period');
  before('MK-CF-O-016-C03', 'no rows at all for $731.17 benefits, $511.43 support, $1,831.19 interest', (c) => { expect(incomeSources(profileOf(c.inputs.sources))).toEqual([]); });
  kase('MK-CF-O-016-C04', 'AGREE', (c) => {
    const op = profileOf(c.inputs.sources);
    expect(sorted(kinds(op))).toEqual(sorted(c.expected.entered_kinds));
    money(incomeSources(op).find((x) => x.kind === 'rental')!.amount, c.expected.rent_monthly_net);
  }, 'FIXED 2026-10-25 (FIX-INCOME-B): a rental the household has is a row whatever it nets');
  before('MK-CF-O-016-C04', 'only the salary row; the rental is left out', (c) => { expect(kinds(profileOf(c.inputs.sources))).toEqual(['job']); });
  kase('MK-CF-O-016-C05', 'AGREE', (c) => {
    const rows = incomeSources(stockOnly(c.inputs));
    expect(rows.map((x) => KIND_SOURCES[x.kind] ?? x.kind)).toEqual(c.expected.entered_kinds);
    money(rows[0].amount, c.expected.vest_annual);
  });
});

describe('MK-CF-O-019 theIncomeManager — five cases (live: /income-manager)', () => {
  const entered = (op: any) => theIncomeManager(op).entered.map((x) => KIND_MANAGER[x.key] ?? x.key);
  kase('MK-CF-O-019-C01', 'AGREE', (c) => { expect(entered(profileOf(c.inputs.sources))).toEqual(c.expected.entered_kinds); });
  kase('MK-CF-O-019-C02', 'AGREE', (c) => { expect(entered(profileOf(c.inputs.sources))).toEqual(c.expected.entered_kinds); });
  kase('MK-CF-O-019-C03', 'AGREE', (c) => {
    const m = theIncomeManager(profileOf(c.inputs.sources));
    expect(sorted(m.entered.map((x) => KIND_MANAGER[x.key] ?? x.key))).toEqual(sorted(c.expected.entered_kinds));
    const by = (k: string) => m.entered.find((x) => x.key === k)!;
    money(by('benefits').amount, c.expected.period_values[0].monthly); expect(by('benefits').per).toBe('month');
    money(by('support').amount, c.expected.period_values[1].monthly); expect(by('support').per).toBe('month');
    money(by('investment_income').amount, c.expected.period_values[2].yearly); expect(by('investment_income').per).toBe('year');
  }, 'kinds compared as a set: the manager lists them in the picker\'s order, as its card says');
  // A RENTAL LOSING MONEY IS LISTED AS NOT ENTERED ("Anything else? · Rent from a property"): `entered: amount > 0`. The person
  // typed the property, its rent and its costs. Tenets 3 and 5.
  kase('MK-CF-O-019-C04', 'AGREE', (c) => {
    const m = theIncomeManager(profileOf(c.inputs.sources));
    expect(sorted(m.entered.map((x) => KIND_MANAGER[x.key] ?? x.key))).toEqual(sorted(c.expected.entered_kinds));
    money(m.entered.find((x) => x.key === 'rental')!.amount, c.expected.rent_monthly_net);
    expect(m.entered.find((x) => x.key === 'rental')!.title).toBe('Rent');
  }, 'FIXED 2026-10-25 (FIX-INCOME-B): entered means recorded — the rental and its loss are listed (tenets 3, 5)');
  before('MK-CF-O-019-C04', 'the rental row carries −300.26 but is marked not entered', (c) => {
    const m = theIncomeManager(profileOf(c.inputs.sources));
    expect(m.entered.map((x) => x.key)).toEqual(['employment']);
    const r = m.notEntered.find((x) => x.key === 'rental')!;
    money(r.amount, -300.26); expect(r.title).toBe('Rent from a property');
  });
  // STOCK WITH NO JOB IS HIDDEN: bonusAndStock is null without a wage, and no other row carries equity — "You entered about 0
  // sources" while the Cash flow tab's YOUR SOURCES lists "Equity comp · $10,000/year" (CashFlowScreen.tsx rsuTotal). Tenets 2-4.
  kase('MK-CF-O-019-C05', 'AGREE', (c) => {
    const m = theIncomeManager(stockOnly(c.inputs));
    const shown = [...m.entered.map((x) => KIND_MANAGER[x.key] ?? x.key), ...(m.bonusAndStock && m.bonusAndStock.amount > 0 ? ['stock'] : [])];
    expect(shown).toEqual(c.expected.entered_kinds);
    money(m.bonusAndStock!.amount, c.expected.vest_annual);
  }, 'FIXED 2026-10-25 (FIX-INCOME-B): stock with no job is shown, as its own row (tenets 2, 3, 4)');
  before('MK-CF-O-019-C05', 'nothing entered, bonusAndStock null', (c) => {
    const m = theIncomeManager(stockOnly(c.inputs));
    expect(m.entered).toEqual([]); expect(m.bonusAndStock).toBeNull();
  });
});

// MK-CF-F-210 annualOfSource RETIRED 2026-10-25 (FIX-INCOME-B): nothing called it and nothing should — YOUR SOURCES shows each row in
// its own period, never converted (MK-CF-M-006). A source's year is read from the one function that names every taxed source,
// MK-CF-F-084's rows taxedSourcesAnnual — each earner's wage row is that earner's own year (the reviewer's point).
describe('MK-CF-F-210 annualOfSource — RETIRED 2026-10-25; each case read from taxedSourcesAnnual, the one producer of a source\'s year', () => {
  const yearOf = (op: any, key: string, earner?: number) => taxedSourcesAnnual(op).find((r) => r.key === key && (earner == null || r.earner === earner))?.amount ?? 0;
  kase('MK-CF-F-210-C01', 'AGREE', (c) => { money(yearOf({ rentals: [rental(c.inputs.amount, 0)] }, 'rent'), c.expected); });
  kase('MK-CF-F-210-C02', 'AGREE', (c) => { money(yearOf({ bonusAnnual: X(c.inputs.amount), bonusMonth: 12 }, 'bonus'), c.expected); });
  const twoEarners = (mine: any, other: any) => ({ baseSalary: X(mine), salaryFreq: 'annually', whoEarns: 'both', partnerWage: { baseSalary: X(other), salaryFreq: 'annually' } });
  kase('MK-CF-F-210-C03', 'AGREE', (c) => {
    money(yearOf(twoEarners(c.inputs.source_annual_salary, c.inputs.other_earner_annual), 'wages', 0), c.expected);
  }, 'RETIRED 2026-10-25: each earner\'s own year, from taxedSourcesAnnual');
  test.failing('MK-CF-F-210-C03 · what the app gave before the fix (pinned, now failing): annualOfSource, 138,432.60 on the first earner\'s row', () => {
    expect((SUMMARY as any).annualOfSource).toBeDefined();
  });
  kase('MK-CF-F-210-C04', 'AGREE', (c) => {
    money(yearOf(twoEarners(c.inputs.other_earner_annual, c.inputs.source_annual_salary), 'wages', 1), c.expected);   // the source is the second earner
  }, 'RETIRED 2026-10-25: each earner\'s own year, from taxedSourcesAnnual');
  // a salary row of $0 (an earner with a by-month table and nothing in it) beside a $60,000 spouse
  const zeroRow = (c: any) => ({ baseSalary: 0, salaryByMonth: {}, whoEarns: 'both', partnerWage: { baseSalary: X(c.inputs.other_earner_annual), salaryFreq: 'annually' } });
  kase('MK-CF-F-210-C05', 'AGREE', (c) => { money(yearOf(zeroRow(c), 'wages', 0), c.expected); },
    'RETIRED 2026-10-25: the $0 earner has no wage row — $0, never the spouse\'s $60,000');
  test('MK-CF-F-210 is gone: income-summary.ts no longer defines annualOfSource', () => {
    expect((SUMMARY as any).annualOfSource).toBeUndefined();
    expect(fs.readFileSync(path.join(__dirname, 'income-summary.ts'), 'utf8')).not.toMatch(/export function annualOfSource\(/);
  });
});

describe('MK-CF-F-182 asPercent — five cases (its own text)', () => {
  for (const id of ['C03', 'C04']) {
    kase(`MK-CF-F-182-${id}`, 'AGREE', (c) => { expect(asPercent(X(c.inputs.rate))).toBe(c.expected); });
  }
  // CHANGED 2026-10-31 (FX-CF-B, IN3-04; his Q49 and DEC-0221 "Return on cash - use 2 decimals"; v07 row of that day): a rate prints with
  // two decimals always, so three of the reviewer's answers — worked to the function's old text, "at most two decimals" — are the old
  // form. By hand: 0.24 × 100 = 24 → "24.00%"; 0.038 × 100 = 3.8 → "3.80%"; 0 → "0.00%". The reviewer's answers are pinned below.
  const TWO: Record<string, string> = { C01: '24.00%', C02: '3.80%', C05: '0.00%' };
  for (const id of ['C01', 'C02', 'C05']) {
    kase(`MK-CF-F-182-${id}`, 'AGREE', (c) => { expect(asPercent(X(c.inputs.rate))).toBe(TWO[id]); },
      `CHANGED 2026-10-31: two decimals always (Q49, DEC-0221) — ${TWO[id]}, where the reviewer worked the old text`);
    test.failing(`MK-CF-F-182-${id} · the reviewer's answer to the old text, pinned (now failing): two decimals at most`, () => {
      expect(asPercent(X(C(`MK-CF-F-182-${id}`).inputs.rate))).toBe(C(`MK-CF-F-182-${id}`).expected);
    });
  }
});

describe('MK-CF-F-183 paidOutByAccount — five cases (its own text, the ledger rule handed in)', () => {
  const txns = (records: any[]) => records.map((r) => ({ type: 'DIVIDEND', amount: X(r.signed_cash), account_id: r.account, reinvested: r.reinvested, date: r.date }));
  const asObject = (m: Map<string, number>) => Object.fromEntries([...m.entries()]);
  const same = (got: Map<string, number>, want: Record<string, any>) => {
    expect(sorted([...got.keys()])).toEqual(sorted(Object.keys(want)));
    for (const [k, v] of Object.entries(want)) money(got.get(k)!, v);
  };
  kase('MK-CF-F-183-C01', 'AGREE', (c) => same(paidOutByAccount(txns(c.inputs.records), NOW), c.expected));
  // REVIEWER WRONG by his DEC-0179 clause 2 ("the tax on them still comes out") and DEC-0198 (2026-10-25, FIX-TAX, the lead's
  // instruction on the screens check MK-CF-M-066): a reinvested payout is income — Interest & dividends says these are
  // counted as income you are taxed on — so it is counted; the package's {} drops it. Pinned: the app's {A: 100}.
  kase('MK-CF-F-183-C02', 'REVIEWER WRONG', (c) => same(paidOutByAccount(txns(c.inputs.records), NOW), c.expected),
    'DEC-0179 #2, DEC-0198: a reinvested $100 counts (the package leaves it out)');
  today('MK-CF-F-183-C02', '{A: 100} — the reinvested dividend counted (DEC-0179)', (c) => { expect(asObject(paidOutByAccount(txns(c.inputs.records), NOW))).toEqual({ A: 100 }); });
  kase('MK-CF-F-183-C03', 'AGREE', (c) => same(paidOutByAccount(txns(c.inputs.records), NOW), c.expected));
  kase('MK-CF-F-183-C04', 'AGREE', (c) => same(paidOutByAccount(txns(c.inputs.records), NOW), c.expected));
  // FIXED 2026-10-25: the window ends today (DEC-7171 "the twelve months ending today"); a payout dated tomorrow is not paid.
  kase('MK-CF-F-183-C05', 'AGREE', (c) => same(paidOutByAccount(txns(c.inputs.records), NOW), c.expected),
    'FIXED 2026-10-25: a payout dated after today is not counted (it was; tenets 1, 3; DEC-7171)');
  test.failing('MK-CF-F-183-C05 · what the app gave before the fix (pinned, now failing): {A: 1000} for a payout dated 2026-10-25', () => {
    expect(asObject(paidOutByAccount(txns(C('MK-CF-F-183-C05').inputs.records), NOW))).toEqual({ A: 1000 });
  });
});

describe('MK-CF-F-184 incomeFromAccounts — five cases (live: Interest & dividends, the Tax organizer)', () => {
  const cash = (id: string, balance: any, rate: any) => ({ asset_id: id, label: id, kind: 'savings', asset_class: 'cash', balance: X(balance), coupon_rate: X(rate) });
  const bond = (a: any) => ({ asset_id: a.id, label: a.id, kind: a.kind === 'bank_cd' ? 'cd' : 'bond', asset_class: 'bonds',
    ...(a.kind === 'bank_cd' ? { cd_bought: 'bank' } : {}), balance: a.balance == null ? 0 : X(a.balance),
    coupon_rate: a.rate == null ? null : X(a.rate), ...(a.face != null ? { face_value: X(a.face) } : {}), ...(a.maturity ? { maturity_date: a.maturity } : {}) });
  kase('MK-CF-F-184-C01', 'AGREE', (c) => {
    const a = c.inputs.accounts[0];
    const r = incomeFromAccounts([cash(a.id, a.balance, a.rate)] as any, [{ type: 'INTEREST', amount: X(c.inputs.recorded_ttm.A), account_id: 'A', date: '2026-06-01' }], NOW);
    expect(r.lines).toHaveLength(1);
    money(r.lines[0].annual, c.expected.rows[0].amount);
    expect(r.lines[0].why).toBe('paid out over the trailing twelve months');                // the reviewer's "recorded trailing payouts"
    money(r.annual, c.expected.total);
  });
  kase('MK-CF-F-184-C02', 'AGREE', (c) => {
    const r = incomeFromAccounts(c.inputs.accounts.map(bond) as any, [], NOW);
    money(r.lines[0].annual, c.expected.rows[0].amount);
    expect(r.lines[0].assumed).toBe(true);                                                  // "rate not entered; assumed" (DEC-0279)
    expect(r.lines[0].why).toMatch(/^no coupon rate entered/);
    money(r.annual, c.expected.total);
  });
  kase('MK-CF-F-184-C03', 'AGREE', (c) => {
    const r = incomeFromAccounts(c.inputs.accounts.map(bond) as any, [], NOW);
    money(r.lines[0].annual, c.expected.rows[0].amount);
    money(r.lines[1].annual, c.expected.rows[1].amount);
    money(r.annual, c.expected.total);
  });
  kase('MK-CF-F-184-C04', 'AGREE', (c) => {
    const r = incomeFromAccounts(c.inputs.accounts.map(bond) as any, [], NOW);
    money(r.lines[0].annual, c.expected.rows[0].amount); expect(r.lines[0].why).toMatch(/^matured /);
    money(r.lines[1].annual, c.expected.rows[1].amount); expect(r.lines[1].why).toMatch(/face value not entered/);
    money(r.annual, c.expected.known_income_subtotal);
    expect(r.lines.some((l) => l.assumed)).toBe(!c.expected.complete);                      // "complete: false" ↔ a line marked assumed
  }, 'complete:false read as a line marked assumed, its reason on the line (DEC-7933)');
  // FIXED 2026-10-25 (with MK-CF-F-183): the $1,000 dated tomorrow is not paid, so the $500 the rate gives is shown, said as
  // the rate on the balance.
  kase('MK-CF-F-184-C05', 'AGREE', (c) => {
    const a = c.inputs.accounts[0], rec = c.inputs.records[0];
    const r = incomeFromAccounts([cash(a.id, a.balance, a.rate)] as any, [{ type: 'INTEREST', amount: X(rec.amount), account_id: rec.account, date: rec.date }], NOW);
    expect(r.lines[0].why).not.toBe('paid out over the trailing twelve months');
    money(r.annual, c.expected.forward_estimate);
    expect(r.lines[0].why).toBe('5.00% on $10,000');   // two decimals (FX-CF-B 2026-10-31, IN3-04; the figure is unchanged)
  }, 'FIXED 2026-10-25: the payout dated tomorrow is not paid; the $500 estimate shows (it read $1,000 as paid)');
  test.failing('MK-CF-F-184-C05 · what the app gave before the fix (pinned, now failing): $1,000 "paid out over the trailing twelve months"', () => {
    const c = C('MK-CF-F-184-C05');
    const a = c.inputs.accounts[0], rec = c.inputs.records[0];
    const r = incomeFromAccounts([cash(a.id, a.balance, a.rate)] as any, [{ type: 'INTEREST', amount: X(rec.amount), account_id: rec.account, date: rec.date }], NOW);
    money(r.annual, 1000); expect(r.lines[0].why).toBe('paid out over the trailing twelve months');
  });
});

describe('MK-CF-F-127 isRental — five cases (its own text)', () => {
  const KIND: Record<string, string> = { rental_long: 'LONG_TERM_RENTAL', rental_short: 'SHORT_TERM_RENTAL', salary: 'W2_JOB', interest: 'INVESTMENT' };
  for (const id of ['C01', 'C02', 'C03', 'C04', 'C05']) {
    kase(`MK-CF-F-127-${id}`, 'AGREE', (c) => { expect(isRental(c.inputs.source_kind == null ? null : KIND[c.inputs.source_kind])).toBe(c.expected); });
  }
});

describe('MK-CF-F-044 annualNet, MK-CF-F-045 grossAnnualBaseline, MK-CF-F-046 employerMatchAnnual — fifteen cases', () => {
  for (const id of ['C01', 'C02', 'C03', 'C04', 'C05']) {
    kase(`MK-CF-F-044-${id}`, 'AGREE', (c) => { money(c.inputs.sources.reduce((t: number, s: any) => t + annualNet(sourceOf(s)), 0), c.expected); },
      'independent source calls plus the asserted subtotal, as the package note says');
    kase(`MK-CF-F-045-${id}`, 'AGREE', (c) => { money(grossAnnualBaseline(c.inputs.sources.map((s: any) => sourceOf(s))), c.expected); });
    kase(`MK-CF-F-046-${id}`, 'AGREE', (c) => { money(employerMatchAnnual(c.inputs.sources.map((s: any) => sourceOf(s, true))), c.expected); });
  }
});

describe('MK-CF-F-161 monthlyGrossOfSource — five cases (its own text)', () => {
  const FR: Record<string, string> = { monthly: 'MONTHLY', yearly: 'ANNUAL', quarterly: 'QUARTERLY', once: 'ONETIME' };
  const src = (i: any) => ({
    income_type: i.kind === 'rent' ? 'LONG_TERM_RENTAL' : 'W2_JOB', gross_amount: X(i.amount), operating_expenses: N(i.cost), frequency: FR[i.frequency],
    ...(i.month != null ? { landing_month: i.month } : {}),
    ...(i.weights ? { landing_months: Object.entries(i.weights).map(([m, s]) => ({ month: Number(m), share: X(s) })) } : {}),
  });
  for (const id of ['C01', 'C02', 'C03', 'C04', 'C05']) {
    kase(`MK-CF-F-161-${id}`, 'AGREE', (c) => { moneys(monthlyGrossOfSource(src(c.inputs)), c.expected); });
  }
});

describe('MK-CF-F-049 buildIncomeState — five cases (production path: profile → incomeFromOnboarding → buildIncomeState)', () => {
  // THE LEGACY READER NEVER TAKES THE 401(k) OFF: its take-home is gross × (1 − rate). The household path (the dated month grid,
  // MK-XS-F-004 buildDatedGrid, which every Cash flow screen reads) gives the reviewer's take-home on the same profile.
  // FIXED 2026-10-25 (FIX-TAX): with the profile handed in, each month is the household month grid's — the cell's net is that
  // month's TAKE-HOME, after tax AND the 401(k) (CLAUDE.md money convention), so the month's tax is gross − take-home − 401(k).
  for (const id of ['C01', 'C02', 'C04']) {
    kase(`MK-CF-F-049-${id}`, 'AGREE', (c) => {
      const op = f049op(c.inputs), st = legacyState(op), m = st.monthly_cash_flow_grid[0];
      money(m.gross, c.expected.gross);
      money(m.gross - m.net - X(c.inputs.k_monthly), c.expected.tax);
      money(st.net_monthly_income, c.expected.take_home);
      money(gridInflow(op), c.expected.take_home);                                             // the one take-home Cash flow reads
    }, 'FIXED 2026-10-25: the 401(k) comes off — the one take-home the month grid reads (DEC-0283; tenet 4)');
    test.failing(`MK-CF-F-049-${id} · what the app gave before the fix (pinned, now failing): take-home = gross × (1 − rate)`, () => {
      const c = C(`MK-CF-F-049-${id}`), st = legacyState(f049op(c.inputs));
      money(st.net_monthly_income, X(c.expected.gross) - X(c.expected.tax));
    });
  }
  // MARRIED, A 5% STATE RATE, NO RATE TYPED: incomeFromOnboarding hands buildIncomeState DEFAULT_TAX (no filing status, no state),
  // so the year and the months are both single and federal only: $21,957.82 where the rate in force gives $18,106.80.
  const c03op = (i: any) => ({ baseSalary: X(i.monthly_sources[0].amount), salaryFreq: 'monthly', filingStatus: i.status, stateTaxRate: X(i.state_rate) * 100 });
  kase('MK-CF-F-049-C03', 'AGREE', (c) => {
    const op = c03op(c.inputs), st = legacyState(op);
    money(st.total_gross_annual - st.total_net_annual, c.expected.tax_annual);
    money(st.total_net_annual, c.expected.take_home_annual);
    money(st.monthly_cash_flow_grid.reduce((t, m) => t + (m.gross - m.net), 0), c.expected.monthly_tax_sum);
    money(incomeSummary(op).taxed.tax, c.expected.tax_annual);                                // the Income summary agrees
  }, 'FIXED 2026-10-25: jointly, 5% state on taxable income, in the year and the months (DEC-0184, DEC-7798, DEC-0327)');
  test.failing('MK-CF-F-049-C03 · what the app gave before the fix (pinned, now failing): 21,957.824 a year and in the months', () => {
    const st = legacyState(c03op(C('MK-CF-F-049-C03').inputs));
    money(st.total_gross_annual - st.total_net_annual, 21957.824);
  });
  kase('MK-CF-F-049-C05', 'AGREE', (c) => {
    const st = legacyState(f049op(c.inputs)), m = st.monthly_cash_flow_grid[0];
    money(m.gross, c.expected.gross); money(m.gross - m.net, c.expected.tax); money(st.net_monthly_income, c.expected.take_home);
    money(0, c.expected.k);                                                                    // IncomeState carries no 401(k): nothing is taken off
  }, 'IncomeState has no 401(k) field; with $0 nothing differs');
});

describe('MK-CF-F-129 round4 — five cases (its own text)', () => {
  for (const id of ['C01', 'C02', 'C03', 'C04', 'C05']) {
    kase(`MK-CF-F-129-${id}`, 'AGREE', (c) => { expect(round4(X(c.inputs.number))).toBe(X(c.expected)); });
  }
});

describe('MK-CF-F-052 getIncomeState — five cases (no production caller; the storage read is mocked here)', () => {
  const stored = (total: number, rate?: number) => ({ user_id: 'u1',
    sources: [{ income_source_id: 'x', income_type: 'W2_JOB', gross_amount: total, frequency: 'ANNUAL', operating_expenses: 0 }],
    tax: rate == null ? { use_manual_tax_override: false, manual_effective_tax_rate: null } : { use_manual_tax_override: true, manual_effective_tax_rate: rate } });
  const load = async (doc: any) => { (getUserDoc as jest.Mock).mockResolvedValueOnce(doc); return getIncomeState('u1'); };
  kase('MK-CF-F-052-C01', 'AGREE', async (c) => {
    const doc = stored(X(c.inputs.supplied_result.total));
    const got = await load(doc);
    expect(got).toEqual(buildIncomeState('u1', doc.sources as any, doc.tax as any));            // the domain result, unchanged
    money(got!.total_gross_annual, c.expected.total);
  });
  kase('MK-CF-F-052-C02', 'AGREE', async (c) => { expect(await load(c.inputs.supplied_result)).toBe(c.expected); });
  kase('MK-CF-F-052-C03', 'AGREE', async (c) => {
    const got = await load(stored(X(c.inputs.supplied_result.total), X(c.inputs.supplied_result.rate)));
    expect(got!.total_gross_annual).toBe(X(c.expected.total));                                 // every digit kept
    expect(got!.effective_tax_rate).toBe(X(c.expected.rate));
  });
  kase('MK-CF-F-052-C04', 'OUTSIDE DOMAIN', () => undefined,
    'no writer stores a negative income source or a "known" flag: saveIncome has no caller, incomeFromOnboarding adds only sources above $0');
  test('MK-CF-F-052-C04 · probe — a stored negative total comes back unchanged (the "known" flag is not a field of IncomeState)', async () => {
    const c = C('MK-CF-F-052-C04');
    const got = await load(stored(X(c.inputs.supplied_result.total)));
    expect(got!.total_gross_annual).toBe(X(c.expected.total));
  });
  kase('MK-CF-F-052-C05', 'OUTSIDE DOMAIN', () => undefined,
    'storage holds a document or nothing — never the number 0 (getUserDoc returns a document or null)');
  test('MK-CF-F-052-C05 · probe — a stored document with $0 of income is a zero-valued result, not "nothing"', async () => {
    const got = await load({ user_id: 'u1', sources: [], tax: { use_manual_tax_override: false, manual_effective_tax_rate: null } });
    expect(got).not.toBeNull(); expect(got!.total_gross_annual).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
describe('formula verdicts (WRONG / INCOMPLETE / CANNOT TELL) and rules NOT HELD — what the code really does', () => {
  // ── MK-CF-O-004 WRONG ─────────────────────────────────────────────────────────────────────────────
  // (a) the taxed rows omit sources the total holds: a wage of $7,000/month, $1,000/month of self-employment, $2,000/month of Social
  // Security and $500/month of other taxable income — "= Gross /year" $126,000, rows printed $84,000. DEC-0376: a total agrees with its lines.
  const mixed = { baseSalary: 7000, salaryFreq: 'monthly', seAmount: 1000, seFreq: 'monthly', ri_ss: 2000, ri_ss_freq: 'monthly', ri_ss_receiving: 'yes',
    otherAmount: 500, otherFreq: 'monthly', taxMode: 'manual', manualTaxRate: 22 };
  verdict('MK-CF-O-004', 'AGREE', 'FIXED 2026-10-25 (FIX-INCOME-B): taxed rows add up to "= Gross /year" (DEC-0376, tenet 2) — and a rental loss stays in the take-home (tenet 4)', () => {
    const s = incomeSummary(mixed);
    expect(s.taxed.lines.reduce((t, l) => t + l.amount, 0)).toBeCloseTo(s.taxed.grossAnnual, 6);
    const loss = { baseSalary: 7000, salaryFreq: 'monthly', landsTypical: 5111.17, rentals: [rental(1111.43, 1431.19)], ...typed('0.24') };
    expect(incomeSummary(loss).lands.usualMonth).toBeCloseTo(incomeMonthlyGrid(loss as any, 'available')[0].amount, 6);
    expect(gridInflow(loss)).toBeCloseTo(4791.41, 6);                                             // the Cash flow tab's month too
  });
  test.failing('MK-CF-O-004 · what the app gave before the fix (pinned, now failing) — rows $84,000 under a $126,000 gross; a rental loss: $5,111.17 here and on the Cash flow tab\'s grid, $4,791.41 in incomeMonthlyGrid', () => {
    const s = incomeSummary(mixed);
    expect(s.taxed.lines.map((l) => [l.label, l.amount])).toEqual([['Your gross', 84000]]);
    money(s.taxed.grossAnnual, 126000);
    money(taxableAnnual(mixed as any), 126000);
    const loss = { baseSalary: 7000, salaryFreq: 'monthly', landsTypical: 5111.17, rentals: [rental(1111.43, 1431.19)], ...typed('0.24') };
    money(incomeSummary(loss).lands.usualMonth, 5111.17);
    money(gridInflow(loss), 5111.17);                                                             // MK-XS-F-004 buildDatedGrid drops it too
    money(incomeMonthlyGrid(loss as any, 'available')[0].amount, 4791.41);                       // sign-up's recap, Budget, Goals count it
    money(incomeSummary(loss).taxed.grossAnnual, 84000 - 319.76 * 12);                          // the total holds the loss; no row prints it
    expect(incomeSummary(loss).taxed.lines.map((l) => l.label)).toEqual(['Your gross']);
  });
  // ── MK-CF-O-016 INCOMPLETE — real, latent: no caller ─────────────────────────────────────────────
  verdict('MK-CF-O-016', 'AGREE', 'FIXED 2026-10-25 (FIX-INCOME-B): every entered source is listed, a loss included (the function the Income tab\'s YOUR SOURCES is to call)', () => {
    const kinds = incomeSources({ benefitMonthly: 731.17, supportMonthly: 511.43, invAnnual: 1831.19, rentals: [rental(1131.17, 1431.43)] }).map((x) => x.kind);
    expect(kinds.length).toBe(4);
  });
  // ── MK-CF-O-019 WRONG — real, live ────────────────────────────────────────────────────────────────
  verdict('MK-CF-O-019', 'AGREE', 'FIXED 2026-10-25 (FIX-INCOME-B): entered means recorded, not "above $0"; stock with no job is shown', () => {
    const m = theIncomeManager({ baseSalary: 6000, salaryFreq: 'monthly', rentals: [rental(1131.17, 1431.43)] });
    expect(m.entered.map((x) => x.key)).toContain('rental');
    expect(theIncomeManager({ rsuGrants: [{ shares: 25, price: 400, date: '2026-12-15' }] }).bonusAndStock).not.toBeNull();
  });
  // ── MK-CF-F-210 WRONG — real, latent ──────────────────────────────────────────────────────────────
  verdict('MK-CF-F-210', 'AGREE', 'RETIRED 2026-10-25 (FIX-INCOME-B): annualOfSource is gone; each earner\'s own year is a row of taxedSourcesAnnual', () => {
    const op = { baseSalary: 84000, salaryFreq: 'annually', whoEarns: 'both', partnerWage: { baseSalary: 54000, salaryFreq: 'annually' } };
    expect((SUMMARY as any).annualOfSource).toBeUndefined();
    expect(taxedSourcesAnnual(op as any).filter((r) => r.key === 'wages').map((r) => r.amount)).toEqual([84000, 54000]);
  });
  // ── MK-CF-F-183 INCOMPLETE — real, live ──────────────────────────────────────────────────────────
  verdict('MK-CF-F-183', 'AGREE', 'FIXED 2026-10-25: the window ends today, and a payout whose amount is not on record is said, never counted as $0', () => {
    expect(paidOutByAccount([{ type: 'DIVIDEND', amount: 50, account_id: 'A', date: '2026-11-30' }], NOW).get('A') ?? null).toBeNull();
    // an amount not on record must not disappear into a total that reads as complete
    const r = incomeFromAccounts([{ asset_id: 'A', label: 'A', kind: 'brokerage', balance: 10000 }] as any,
      [{ type: 'DIVIDEND', amount: 100, account_id: 'A', date: '2026-03-01' }, { type: 'DIVIDEND', amount: null, account_id: 'A', date: '2026-06-01' }], NOW);
    expect(r.missing ?? r.lines[0].why).toMatch(/not on record|not known|missing/i);
  });
  test.failing('MK-CF-F-183 · what the app gave before the fix (pinned, now failing) — a dividend dated next month counts; a dividend with no amount adds $0', () => {
    money(paidOutByAccount([{ type: 'DIVIDEND', amount: 50, account_id: 'A', date: '2026-11-30' }], NOW).get('A')!, 50);
    const r = incomeFromAccounts([{ asset_id: 'A', label: 'A', kind: 'brokerage', balance: 10000 }] as any,
      [{ type: 'DIVIDEND', amount: 100, account_id: 'A', date: '2026-03-01' }, { type: 'DIVIDEND', amount: null, account_id: 'A', date: '2026-06-01' }], NOW);
    money(r.annual, 100); expect(r.lines[0].why).toBe('paid out over the trailing twelve months'); expect(r.missing).toBeNull();
  });
  // ── MK-CF-F-184 INCOMPLETE — the future payout is the app's (inherited from F-183); the "mixed sum" is a records fix ───────────
  verdict('MK-CF-F-184', 'AGREE', 'FIXED 2026-10-25: paid and estimated kept apart: a future payout is not "paid"; each line already names its basis', () => {
    const r = incomeFromAccounts([{ asset_id: 'A', label: 'A', kind: 'savings', asset_class: 'cash', balance: 10000, coupon_rate: 0.05 }] as any,
      [{ type: 'INTEREST', amount: 1000, account_id: 'A', date: '2026-10-25' }], NOW);
    money(r.annual, 500);
  });
  test('MK-CF-F-184 · app today — each line says its basis (paid / coupon on face / rate on balance / matured / not entered); the screen prints the sum as "= We calculate"', () => {
    const r = incomeFromAccounts([
      { asset_id: 'A', label: 'Paid', kind: 'savings', asset_class: 'cash', balance: 10000, coupon_rate: 0.05 },
      { asset_id: 'B', label: 'Est', kind: 'savings', asset_class: 'cash', balance: 10000, coupon_rate: 0.04 },
    ] as any, [{ type: 'INTEREST', amount: 300, account_id: 'A', date: '2026-05-01' }], NOW);
    expect(r.lines.map((l) => l.why)).toEqual(['paid out over the trailing twelve months', '4.00% on $10,000']);   // two decimals (IN3-04, 2026-10-31)
    money(r.annual, 700);                                                                         // $300 paid + $400 estimated, in one total
    const SCREEN = fs.readFileSync(path.join(__dirname, '../../../src/screens/IncomeManagerScreen.tsx'), 'utf8');
    expect(SCREEN).toContain('label="= We calculate"');
  });
  // ── MK-CF-F-049 WRONG — real, in a legacy reader whose figures reach no screen a person can open ──────────────────
  verdict('MK-CF-F-049', 'AGREE', 'FIXED 2026-10-25: one take-home: the legacy reader agrees with the household path (401(k) off, filing status, state rate)', () => {
    const op = { baseSalary: 5000, salaryFreq: 'monthly', c_401k: 500, taxMode: 'manual', manualTaxRate: 10 };
    expect(legacyState(op).net_monthly_income).toBeCloseTo(gridInflow(op), 6);
    const married = { baseSalary: 11536.05, salaryFreq: 'monthly', filingStatus: 'married', stateTaxRate: 5 };
    const st = legacyState(married);
    expect(st.total_gross_annual - st.total_net_annual).toBeCloseTo(incomeSummary(married).taxed.tax, 6);
  });
  test('MK-CF-F-049 · the stored record read without a profile (getIncomeState only, no screen) — its own figures, one rate on every month', () => {
    const op = { baseSalary: 5000, salaryFreq: 'monthly', c_401k: 500, taxMode: 'manual', manualTaxRate: 10 };
    money(recordState(op).net_monthly_income, 4500); money(gridInflow(op), 4000); money(legacyState(op).net_monthly_income, 4000);
    const married = { baseSalary: 11536.05, salaryFreq: 'monthly', filingStatus: 'married', stateTaxRate: 5 };
    money(recordState(married).total_gross_annual - recordState(married).total_net_annual, 21957.824);   // the record holds no status
    money(rateInForce(married as any).rate * 138432.60, 18106.802);
    // a record that carries the filing status: the year and the months now agree — one rate on every month (MK-CF-F-098 retired)
    const direct = buildIncomeState('u1', incomeFromOnboarding('u1', married as any).sources, { use_manual_tax_override: false, manual_effective_tax_rate: null, filing_status: 'married' });
    money(direct.total_gross_annual - direct.total_net_annual, 12795.172);
    money(direct.monthly_cash_flow_grid.reduce((t, m) => t + (m.gross - m.net), 0), 12795.172);
    expect((INCOME as any).effectiveTaxRate).toBeUndefined();                                  // MK-CF-F-048 retired
  });

  // ── rules NOT HELD ────────────────────────────────────────────────────────────────────────────────
  const legacyAgrees = () => {
    const married = { baseSalary: 11536.05, salaryFreq: 'monthly', filingStatus: 'married', stateTaxRate: 5 };
    const st = legacyState(married);
    expect(st.total_gross_annual - st.total_net_annual).toBeCloseTo(incomeSummary(married).taxed.tax, 6);
    expect(st.monthly_cash_flow_grid.reduce((t, m) => t + (m.gross - m.net), 0)).toBeCloseTo(incomeSummary(married).taxed.tax, 6);
  };
  verdict('DEC-0181', 'AGREE', 'FIXED 2026-10-25: no two functions doing the same thing — buildIncomeState reads the household take-home', legacyAgrees);
  verdict('DEC-0184', 'AGREE', 'FIXED 2026-10-25: one tax function — buildIncomeState\'s single-filer monthly path (progressiveMonthlyTax) is retired', legacyAgrees);
  verdict('DEC-0196', 'AGREE', 'FIXED 2026-10-25: one rate everywhere take-home matters — the legacy rate is the rate in force', () => {
    const married = { baseSalary: 11536.05, salaryFreq: 'monthly', filingStatus: 'married', stateTaxRate: 5 };
    const st = legacyState(married);
    expect(st.effective_tax_rate).toBeCloseTo(rateInForce(married as any).rate, 9);
  });
  verdict('DEC-7798', 'AGREE', 'FIXED 2026-10-25: the calculated rate holds the state rate entered — effectiveTaxRate (which handed stateRate 0) is retired', () => {
    const married = { baseSalary: 11536.05, salaryFreq: 'monthly', filingStatus: 'married', stateTaxRate: 5 };
    expect(legacyState(married).effective_tax_rate * 138432.60).toBeCloseTo(18106.802, 6);
  });
  verdict('DEC-7797', 'AGREE', 'FIXED 2026-10-25: every place reads income after the 401(k) — the legacy reader too', () => {
    const op = { baseSalary: 5000, salaryFreq: 'monthly', c_401k: 500, taxMode: 'manual', manualTaxRate: 10 };
    expect(legacyState(op).net_monthly_income).toBeCloseTo(4000, 6);
  });
  verdict('DEC-7887', 'AGREE', 'FIXED 2026-10-25: gross − 401(k)s = what it is taxed on — held on the Income summary and in the legacy reader', () => {
    const op = { baseSalary: 5000, salaryFreq: 'monthly', c_401k: 500 };
    expect(incomeSummary(op).taxed.taxedOn).toBeCloseTo(54000, 6);                               // held here
    const st = legacyState(op);
    expect(st.total_gross_annual - 6000).toBeCloseTo(incomeSummary(op).taxed.taxedOn, 6);
    expect(st.effective_tax_rate * st.total_gross_annual).toBeCloseTo(incomeSummary(op).taxed.tax, 6);   // legacy taxes the 401(k)
  });
  verdict('DEC-0188', 'AGREE', 'FIXED 2026-10-25 (FIX-INCOME-B): two earners, each row its own wage — annualOfSource retired; the taxed rows carry each', () => {
    const op = { baseSalary: 84111.17, salaryFreq: 'annually', whoEarns: 'both', partnerWage: { baseSalary: 54321.43, salaryFreq: 'annually' } };
    moneys(incomeSummary(op).taxed.lines.map((l) => l.amount), [84111.17, 54321.43]);
  });
  verdict('DEC-0376', 'AGREE', 'FIXED 2026-10-25 (FIX-INCOME-B): a total agrees with the lines printed above it — the taxed rows of a wage, self-employment, Social Security and other income', () => {
    const s = incomeSummary(mixed);
    expect(s.taxed.lines.reduce((t, l) => t + l.amount, 0)).toBeCloseTo(s.taxed.grossAnnual, 6);
  });
  verdict('DEC-0207', 'AGREE', 'FIXED 2026-10-25 (FIX-INCOME-B): the card\'s rows add up — part 5\'s cases O-004-C04 (a rental loss) and O-004-C05 (support only)', () => {
    const loss = { landsTypical: 5111.17, rentals: [rental(1111.43, 1431.19)], baseSalary: 7000, salaryFreq: 'monthly', ...typed('0.24') };
    const s = incomeSummary(loss);
    expect(s.taxed.lines.reduce((t, l) => t + l.amount, 0)).toBeCloseTo(s.taxed.grossAnnual, 6);
    expect(incomeSummary({ supportMonthly: 1000 }).ready).toBe(true);
  });

  // ── the lead's priority list: the same class in the cards other runners hold, probed here so each can be called real or not ──
  // FIXED 2026-10-25 (FIX-MONTH; DEC-1923): matched by the debt itself — a name two debts share is given to neither (part 14 holds the
  // row that says so); the answer before the fix, the second one credited, is kept beside it
  test('cross-part probe (not counted) · MK-CF-F-157 debtPaymentsByDebt — two debts called "Loan": the $250 is given to neither (FIXED 2026-10-25)', () => {
    const got = debtPaymentsByDebt({ ym: '2026-10', takeHomeMonthly: 0, plannedExpenses: 0,
      debts: [{ debt_id: 'd1', label: 'Loan' }, { debt_id: 'd2', label: ' loan ' }] as any[],
      expenses: [{ amount: 250, category: DEBT_CATEGORY, store: 'Loan', date: '2026-10-12' }] as any[] });
    expect(Object.fromEntries([...got.entries()])).toEqual({});
  });
  test.failing('cross-part probe · what the app gave before the fix (kept): the $250 to the second "Loan" only', () => {
    const got = debtPaymentsByDebt({ ym: '2026-10', takeHomeMonthly: 0, plannedExpenses: 0,
      debts: [{ debt_id: 'd1', label: 'Loan' }, { debt_id: 'd2', label: ' loan ' }] as any[],
      expenses: [{ amount: 250, category: DEBT_CATEGORY, store: 'Loan', date: '2026-10-12' }] as any[] });
    expect(Object.fromEntries([...got.entries()])).toEqual({ d2: 250 });
  });
  test('cross-part probe (not counted) · MK-CF-F-084 taxableAnnual — Social Security taxed per IRS Pub 915 on the Income summary (FIXED 2026-10-25)', () => {
    // a single 67-year-old: $3,000/month Social Security and $4,000/month pension. IRS Pub 915: provisional income 48,000 + 18,000 =
    // 66,000; taxable Social Security = min(0.85 × 36,000, 0.85 × (66,000 − 34,000) + min(4,500, 18,000)) = 30,600 → 78,600 taxable.
    const op = { birthYear: '1959', filingStatus: 'single', ri_ss: 3000, ri_ss_freq: 'monthly', ri_pension: 4000, ri_pension_freq: 'monthly' };
    money(incomeSummary(op).taxed.grossAnnual, 78600);
    money(incomeSummary(op).taxed.taxedOn, 78600);
    expect(incomeSummary(op).taxed.lines.map((l) => [l.label, l.amount])).toEqual([['Retirement income', 48000], ['Social Security, the part that is taxed', 30600]]);
  });
  test.failing('cross-part probe · what the app gave before the fix (pinned, now failing): Social Security counted in full, $84,000', () => {
    const op = { birthYear: '1959', filingStatus: 'single', ri_ss: 3000, ri_ss_freq: 'monthly', ri_pension: 4000, ri_pension_freq: 'monthly' };
    money(incomeSummary(op).taxed.grossAnnual, 84000);
  });
  test('cross-part probe (not counted) · MK-CF-O-007 theTaxOrganizer — FIXED 2026-10-25: full precision, and the tax year it names', () => {
    const SRC = fs.readFileSync(path.join(__dirname, 'tax-organizer.ts'), 'utf8');
    expect(SRC).not.toMatch(/Math\.round\(/);
    expect(SRC).toMatch(/interestAndDividendsForYear\(input\.profile, input\.accounts \?\? \[\], input\.transactions \?\? \[\], year\)/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
describe('reach — who calls each legacy or dead function in production, read from the disk', () => {
  const ROOT = path.join(__dirname, '../../..');
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) && !p.includes(`${path.sep}__tests__${path.sep}`) && !p.includes(`${path.sep}testing${path.sep}`)) out.push(p);
    }
    return out;
  };
  const FILES = ['src', 'app', 'MoneyKeel/functions'].flatMap((d) => walk(path.join(ROOT, d)));
  const TEXT = new Map(FILES.map((f) => [path.relative(ROOT, f), fs.readFileSync(f, 'utf8')]));
  /** files that CALL name( outside comments, other than where it is defined */
  const callers = (name: string, definedIn: string) => [...TEXT.entries()]
    .filter(([f, t]) => f !== definedIn && t.split('\n').some((l) => !/^\s*(\*|\/\/|\/\*)/.test(l) && new RegExp(`\\b${name}\\(`).test(l)))
    .map(([f]) => f).sort();
  test('the scan read the whole tree (a floor, so a broken walk goes red)', () => { expect(FILES.length).toBeGreaterThanOrEqual(250); });
  test('MK-CF-F-049 buildIncomeState is called by buildSnapshot and IncomeDetailScreen only', () => {
    expect(callers('buildIncomeState', 'src/domain/income/calc.ts')).toEqual(['src/domain/income/index.ts', 'src/domain/snapshot.ts', 'src/screens/IncomeDetailScreen.tsx']);
  });
  test('buildSnapshot is called by HomeScreen only, and Home reads nothing from it but the net worth', () => {
    expect(callers('buildSnapshot', 'src/domain/snapshot.ts')).toEqual(['src/screens/HomeScreen.tsx']);
    const home = TEXT.get('src/screens/HomeScreen.tsx')!;
    const uses = [...home.matchAll(/\bsnap\b(?:\s+as\s+any\))?\s*\??\.\s*(\w+)/g)].map((m) => m[1]);
    expect(uses.length).toBeGreaterThanOrEqual(2);
    expect([...new Set(uses)]).toEqual(['networth']);
  });
  test('/income-detail has no way in: only the route table and the route guard name it', () => {
    const naming = [...TEXT.entries()].filter(([, t]) => t.includes('income-detail')).map(([f]) => f).sort();
    expect(naming).toEqual(['app/_layout.tsx', 'src/navigation/routeGuard.ts']);
  });
  test('MK-CF-F-048 effectiveTaxRate is RETIRED (2026-10-25): nothing calls it and calc.ts no longer defines it', () => {
    expect(callers('effectiveTaxRate', 'src/domain/income/calc.ts')).toEqual([]);
    expect(TEXT.get('src/domain/income/calc.ts')!).not.toMatch(/export function effectiveTaxRate\(/);
  });
  // since 2026-10-25 (FIX-INCOME-B) the Cash flow Income tab's YOUR SOURCES prints incomeSources' rows, through the Income summary's
  // door (incomeSummary(op).sources — a screen asks the orchestrator, guard D1); annualOfSource is retired
  test('MK-CF-O-016 incomeSources is read through incomeSummary (the Income tab prints it); MK-CF-F-210 annualOfSource (retired) and MK-CF-F-052 getIncomeState by nothing', () => {
    expect(callers('incomeSources', 'MoneyKeel/functions/cashflow/income-summary.ts')).toEqual([]);
    expect(fs.readFileSync(path.join(ROOT, 'src/screens/CashFlowScreen.tsx'), 'utf8')).toMatch(/for \(const x of sum\.sources\)/);
    expect(callers('annualOfSource', 'MoneyKeel/functions/cashflow/income-summary.ts')).toEqual([]);
    expect(callers('getIncomeState', 'src/domain/income/index.ts')).toEqual([]);
  });
  test('MK-CF-O-019 theIncomeManager and MK-CF-F-184 incomeFromAccounts are live', () => {
    expect(callers('theIncomeManager', 'MoneyKeel/functions/cashflow/income-summary.ts')).toEqual(['src/screens/IncomeManagerScreen.tsx']);
    expect(callers('incomeFromAccounts', 'src/domain/income/from-accounts.ts')).toEqual(expect.arrayContaining(
      ['src/screens/IncomeManagerScreen.tsx', 'src/onboarding/modules.tsx']));
    // the Tax organizer reads the same records rule (paidOutByAccount) for its tax year since 2026-10-25
    // the one interest-and-dividends figure for a tax year (2026-10-25): the Tax organizer reads it (FIX-INCOME-B adds the Income summary)
    expect(callers('interestAndDividendsForYear', 'src/domain/income/from-accounts.ts')).toEqual(expect.arrayContaining(['MoneyKeel/functions/cashflow/tax-organizer.ts']));
  });
});

describe('coverage — every case of part 5 run exactly once; every verdict not RIGHT and every rule NOT HELD measured', () => {
  test('75 of 75 cases', () => {
    const ids = PART.cases.map((c: any) => c.case_id);
    expect(ids.length).toBe(75);
    expect(RAN.length).toBe(ids.length);
    expect(new Set(RAN).size).toBe(RAN.length);
    expect([...RAN].sort()).toEqual([...ids].sort());
  });
  test('7 of 7 formula verdicts not RIGHT, 9 of 9 rules NOT HELD', () => {
    const notRight = PART.formula_checks.filter((f: any) => f.verdict !== 'RIGHT').map((f: any) => f.id);
    const notHeld = PART.rules_held.filter((r: any) => r.verdict === 'NOT HELD').map((r: any) => r.rule);
    expect(notRight.length).toBe(7); expect(notHeld.length).toBe(9);
    expect(sorted(VERDICTS)).toEqual(sorted([...notRight, ...notHeld]));
    expect(PART.rules_held.length).toBe(41);                                   // 9 NOT HELD + 3 HELD + 29 CANNOT TELL, recorded in the results
  });
});
