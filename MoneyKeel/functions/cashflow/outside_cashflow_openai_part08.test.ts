/* THE OUTSIDE CASES, RUN AGAINST THE APP — Cash flow module, OpenAI independent audit of 2026-10-24, PART 8 of 19
 * ("bills ahead, what is coming, the credit line"). Measured by CFR-2 (parts 5–8), part 8 share, 2026-10-25.
 *
 * Cards (ID first, name in brackets): MK-CF-O-008 (whatsComing) · MK-CF-F-212 (receivedInMonth) · MK-CF-F-121 (zero12) ·
 * MK-CF-F-018 (equityByMonth) · MK-CF-F-160 (daysBetweenDates) · MK-CF-F-122 (addDays) · MK-CF-F-124 (nextOccurrence) ·
 * MK-CF-F-019 (upcomingBills) · MK-CF-F-232 (balanceByDay) · MK-CF-F-020 (cashflowYear) · MK-CF-O-006 (theCreditLine).
 * 55 cases, 11 formula checks (7 of them WRONG / INCOMPLETE, classified below), 9 rules_held (8 CANNOT TELL, 1 HELD —
 * recorded in the results file; no NOT HELD in this part).
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/
 * MoneyKeel_CashFlow_Independent_Audit/audit_results/MoneyKeel_CashFlow_Audit_Part_08.json. Every expected answer is READ FROM
 * THE PACKAGE (C(case_id).expected), never retyped; only its plain input names are mapped onto the app's fields. Results, case
 * by case: MoneyKeel/documents/audit/outside-test-cases/returned/results/cashflow_openai_part08_results.json
 *
 * MEASURED ONLY (2026-10-25): no app code, record, drawing or existing test was changed — this file and its results file only.
 *
 * FIXED 2026-10-25 (FIX-BILLS) — every APP WRONG pin of this part flipped the file's own way: the case passes on the reviewer's
 * (or the settled) answer with the ruling in its name, and the app's old answer is kept beside it as test.failing ("the app until
 * 2026-10-25, pinned … no longer its answer"), never deleted. O-008 refuses a projection with no starting balance; F-019 / the
 * month table keep a bill with no month off the dated list and count it a twelfth a month; F-018 lands each vest in its own year
 * and month (no month: "vest month not entered"; no date: "vest date not entered" — the lead's ruling on the open case C05);
 * F-160 / F-122 / F-124 count calendar days; F-020 cashflowYear is RETIRED (its cases run on the month table); O-006's share is
 * kept at full precision (MK-CF-F-031).
 *
 * THE FUNCTIONS PRODUCTION REALLY CALLS:
 *   whatsComing ← BillCalendarScreen (COMING UP, with the screen's own grid from datedGridOf). upcomingBills ← whatsComing only.
 *   balanceByDay ← upcomingBills. nextOccurrence / daysBetweenDates / addDays ← upcomingBills (not exported: compiled from their
 *   own source text in src/domain/cashflow/index.ts, never retyped). zero12 ← equityByMonth, cashflowYear (compiled the same way).
 *   equityByMonth ← buildDatedGrid (MK-XS-F-004, every Cash flow surface through datedGridOf) and cashflowYear.
 *   receivedInMonth ← the Cash flow tab's RECEIVED list. theCreditLine ← CreditScreen.
 *   cashflowYear ← NOTHING in production: 0 callers in src/, app/ or MoneyKeel/functions outside test files (proved by the guard
 *   at the end, which counts the files it read). It is measured as the card names it, and the current household path
 *   (buildDatedGrid) is run on the same inputs beside it.
 *
 * INPUT NAMES MAPPED (the app's fields, never the answers):
 *   bills [{name, amount, date YYYY-MM-DD}] → once-in-a-while budget categories { label: name, amount, bucket 'nonmonthly',
 *   months: [MM], dueDay: DD } — the shape the Bill calendar's own editor saves (BillCalendarScreen months: [form.month]); a date
 *   whose year lies beyond the next twelve months also carries year: YYYY (the editor's one-time year).
 *   independent_available(_by_need_date) X → the month table built by the app's own buildDatedGrid from that budget with a
 *   starting balance of X and nothing else coming in or going out, so what is there by the need-by day is X by construction.
 *   annual_bill with months [] → a once-in-a-while category with no month picked (the sign-up editor allows it: "Yearly",
 *   months left empty, src/onboarding/modules.tsx).
 *   vests [{date, independently_valued_amount}] → rsuGrants [{ shares: 1, price: amount, date }] (the package's own note:
 *   shares = 1, unit price = amount), equityType 'rsu'.
 *   cashflowYear: wage_gross_monthly → baseSalary (salaryFreq 'monthly'); k_monthly → c_401k; household_rate r → a rate the
 *   person gave (taxMode 'manual', manualTaxRate r × 100) — the only way to hand the app an exact rate; other_taxable_monthly →
 *   otherAmount, monthly, taxable; reinvested_monthly → invAnnual = 12 × it with invPaidToBank 'no' (C03: the other taxed
 *   income IS the reinvested money); planned_spend → monthlySpending; debt_due → one instalment debt of that payment, handed
 *   to buildDatedGrid as liabilities (cashflowYear has no input for debts at all). The first month of the twelve (October 2026,
 *   the as_of month) is compared.
 *   prior_month_end / regular_net_this_month / dated_income_by_day / dated_bills_by_day / need_by_date → a two-month DatedGrid
 *   (October 2026, November 2026), the type balanceByDay reads: October's End = prior_month_end; November carries the regular
 *   money as one undated income (or one regular bill when negative), the dated income on day 5 and the dated bill (not regular)
 *   on day 10, both before the need-by day 13.
 *   as_of → now = that day at local noon (America/Los_Angeles on this machine). Dates are compared as the app prints them
 *   (isoLocalDate).
 * TOLERANCES: money to 1e-6 dollars (toBeCloseTo …, 6), shares of a limit to 1e-12; strings and dates exact. REFUSES = no
 * number (null), never 0. "shown" strings are screen formatting and are not asserted.
 *
 * Markers: AGREE → test on the reviewer's answer · APP WRONG → test.failing on the reviewer's (or the settled) answer, plus a
 * plain twin "app today" pinning what the app gives · NEEDS RULING → the app's answer pinned · settled RULE UNCLEAR → named
 * with the decision that settles it.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { whatsComing, receivedInMonth } from './whats-coming';
import { theCreditLine } from './credit-line';
import * as cashflowModule from '../../../src/domain/cashflow';
import { upcomingBills, balanceByDay, equityByMonth, equityVests } from '../../../src/domain/cashflow';
import { buildDatedGrid, type DatedGrid, type GridCell } from '../../../src/domain/grid';
import { spendByMonth, plannedMonthlySpend } from '../../../src/domain/budget';
import { rateInForce } from '../../../src/domain/income/tax-rate';
import { isoLocalDate } from '../../../src/domain/_shared/dates';

// ── the functions the app does not export, compiled from their own source text ──────────────────────
const SRC = path.join(__dirname, '../../../src/domain/cashflow/index.ts');
const DATES = path.join(__dirname, '../../../src/domain/_shared/dates.ts');   // daysInMonth, read from its own text too (2026-10-25)
const compile = (parts: { start: RegExp; end: string; file?: string }[], name: string): any => {
  const code = parts.map(({ start, end, file }) => {
    const text = fs.readFileSync(file ?? SRC, 'utf8');
    const at = text.search(start);
    if (at < 0) throw new Error(`${start} not found in ${path.basename(file ?? SRC)}`);
    return text.slice(at, text.indexOf(end, at) + end.length);
  }).join('\n');
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText;
  return new Function(`${js}\nreturn ${name};`)();
};
const DAY = { start: /const DAY_MS = /, end: ';' };
const zero12: () => number[] = compile([{ start: /function zero12\(/, end: '}\n' }], 'zero12');
const daysBetweenDates: (a: Date, b: Date) => number = compile([DAY, { start: /function daysBetweenDates\(/, end: '}\n' }], 'daysBetweenDates');
const addDays: (d: Date, n: number) => Date = compile([DAY, { start: /function addDays\(/, end: '}\n' }], 'addDays');
const DAYS_IN_MONTH = { start: /function daysInMonth\(/, end: '\n}\n', file: DATES };
const nextOccurrence: (m: number, d: number, now: Date, y?: number) => Date = compile([DAYS_IN_MONTH, { start: /function nextOccurrence\(/, end: '\n}\n' }], 'nextOccurrence');

// ── the package, read as it came ────────────────────────────────────────────────────────────────────
type Mark = 'AGREE' | 'APP WRONG' | 'REVIEWER WRONG' | 'NEEDS RULING' | 'BLOCKED' | 'OUTSIDE DOMAIN';
const PKG = path.join(__dirname, '../../documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/MoneyKeel_CashFlow_Independent_Audit/audit_results');
const PART = JSON.parse(fs.readFileSync(path.join(PKG, 'MoneyKeel_CashFlow_Audit_Part_08.json'), 'utf8'));
const C = (caseId: string): any => {
  const c = PART.cases.find((x: any) => x.case_id === caseId);
  if (!c) throw new Error(`no case ${caseId} in part 8`);
  return c;
};
const RAN: string[] = [];
const MARKS: Record<string, Mark> = {};
const runner = (mark: Mark) => (mark === 'APP WRONG' || mark === 'REVIEWER WRONG' ? test.failing : mark === 'BLOCKED' || mark === 'OUTSIDE DOMAIN' ? test.skip : test);
const kase = (caseId: string, mark: Mark, fn: (c: any) => void, note = '') => {
  RAN.push(caseId); MARKS[caseId] = mark;
  const c = PART.cases.find((x: any) => x.case_id === caseId);
  runner(mark)(`${caseId} · ${c?.kind} · ${c?.title} [${mark}]${note ? ` — ${note}` : ''}`, () => fn(C(caseId)));
};
/** the twin that pins what the app gives today, beside an APP WRONG case */
const today = (caseId: string, what: string, fn: (c: any) => void) => test(`${caseId} · app today — ${what}`, () => fn(C(caseId)));
/** once fixed, the app's OLD answer is kept as test.failing — never deleted (2026-10-25, FIX-BILLS) */
const before = (caseId: string, what: string, fn: (c: any) => void) =>
  test.failing(`${caseId} · the app until 2026-10-25, pinned: ${what} — no longer its answer (FIXED 2026-10-25)`, () => fn(C(caseId)));

// ── helpers ─────────────────────────────────────────────────────────────────────────────────────────
const parse = (s: string): number => { const t = String(s).replace('−', '-'); if (t.includes('/')) { const [a, b] = t.split('/'); return Number(a) / Number(b); } return Number(t); };
const X = (v: any): number => (v != null && typeof v === 'object' && 'exact' in v ? parse(v.exact) : parse(v));
const NOW = new Date(2026, 9, 24, 12, 0, 0);                 // as_of 2026-10-24, local noon
const local = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const billCat = (b: { name: string; amount: any; date: string }) => {
  const [y, m, d] = b.date.split('-').map(Number);
  const beyond = (y * 12 + m - 1) - (NOW.getFullYear() * 12 + NOW.getMonth()) > 11;
  return { id: b.name, label: b.name, amount: X(b.amount), bucket: 'nonmonthly', months: [m], dueDay: d, ...(beyond ? { year: y } : {}) };
};
const billsProfile = (bills: any[]) => ({ monthlySpending: 0, spendCats: bills.map(billCat) });
const rowOf = (b: any) => ({ name: b.label, amount: b.amount, due: b.dueDate, need_by: b.needByDate, ask_by: b.askByDate, available: b.availableByNeed, shortfall: b.shortfall });
/** every key the reviewer gave on a row, compared at full precision (money) or exactly (dates, names) */
const expectRows = (got: any[], want: any[]) => {
  expect(got.length).toBe(want.length);
  want.forEach((w, i) => {
    const g: any = rowOf(got[i]);
    for (const [k, v] of Object.entries(w)) {
      if (k === 'name' || k === 'due' || k === 'need_by' || k === 'ask_by') expect(`${k}: ${g[k]}`).toBe(`${k}: ${v}`);
      else expect(g[k]).toBeCloseTo(X(v), 6);
    }
  });
};
/** the twelve-month table balanceByDay reads: October 2026 then November 2026 */
const twoMonthGrid = (i: any): DatedGrid => {
  const prior = X(i.prior_month_end), reg = X(i.regular_net_this_month), din = X(i.dated_income_by_day), dbill = X(i.dated_bills_by_day);
  const oct: GridCell = { calendarMonth: 10, year: 2026, label: 'Oct', incomeItems: [], billItems: [], inflow: 0, outflow: 0, net: 0, runningBalance: prior };
  const incomeItems: any[] = [], billItems: any[] = [];
  if (reg > 0) incomeItems.push({ source: 'Salary (take-home share)', amount: reg });
  if (reg < 0) billItems.push({ label: 'Everyday expenses', amount: -reg, kind: 'bill', regular: true });
  if (din > 0) incomeItems.push({ source: 'Scholarship', amount: din, day: 5 });
  if (dbill > 0) billItems.push({ label: 'Bill', amount: dbill, day: 10, kind: 'bill' });
  const inflow = incomeItems.reduce((t, x) => t + x.amount, 0), outflow = billItems.reduce((t, x) => t + x.amount, 0);
  const nov: GridCell = { calendarMonth: 11, year: 2026, label: 'Nov', incomeItems, billItems, inflow, outflow, net: inflow - outflow, runningBalance: prior + inflow - outflow };
  return { cells: [oct, nov], later: [], shortMonths: [], lowestBalance: Math.min(prior, nov.runningBalance), totalIn: inflow, totalOut: outflow };
};
/** the cashflowYear household (see INPUT NAMES MAPPED) */
const cfOp = (i: any) => {
  const reinvested = X(i.reinvested_monthly);
  return {
    baseSalary: X(i.wage_gross_monthly), salaryFreq: 'monthly', c_401k: X(i.k_monthly),
    taxMode: 'manual', manualTaxRate: X(i.household_rate) * 100,
    ...(reinvested > 0 ? { invAnnual: reinvested * 12, invPaidToBank: 'no' } : X(i.other_taxable_monthly) > 0 ? { otherAmount: X(i.other_taxable_monthly), otherFreq: 'monthly' } : {}),
    monthlySpending: X(i.planned_spend),
  };
};
const debtOf = (pay: number) => (pay > 0 ? [{ debt_id: 'loan', label: 'Loan', debt_type: 'AUTO_LOAN', remaining_balance: 20000, interest_rate_apr: 0.05, minimum_monthly_payment: pay, due_day: 15 }] : []);
const vestOp = (vests: any[]) => ({ equityType: 'rsu', rsuGrants: vests.map((v) => ({ shares: 1, price: X(v.independently_valued_amount), date: v.date ?? '' })) });
const ACTUAL: Record<string, unknown> = {};

// ════════════════════════════════════════════════════════════════════════════════════════════════════
describe('MK-CF-O-008 whatsComing — five cases (the door the Bill calendar asks)', () => {
  const door = (c: any, extra: any = {}) => {
    const i = c.inputs;
    const avail = X(i.independent_available_by_need_date ?? i.independent_available ?? 0);
    return whatsComing({ profile: billsProfile(i.bills ?? []), startBalance: avail, now: NOW, ...(i.horizon_days ? { horizonDays: i.horizon_days } : {}), ...extra });
  };
  kase('MK-CF-O-008-C01', 'AGREE', (c) => {
    const w = door(c); ACTUAL[c.case_id] = { rows: w.bills.map(rowOf), next: w.next?.label ?? null };
    expectRows(w.bills, c.expected.rows); expect(w.next?.label ?? null).toBe(c.expected.next);
  });
  kase('MK-CF-O-008-C02', 'AGREE', (c) => {
    const profile = billsProfile([]);
    const w = whatsComing({ profile, now: NOW, grid: buildDatedGrid(profile as any, { now: NOW }) });   // grid_supplied
    ACTUAL[c.case_id] = { rows: w.bills.map(rowOf), next: w.next };
    expectRows(w.bills, c.expected.rows); expect(w.next).toBe(c.expected.next);
  });
  kase('MK-CF-O-008-C03', 'AGREE', (c) => {
    const w = door(c); ACTUAL[c.case_id] = { rows: w.bills.map(rowOf), next: w.next?.label ?? null };
    expectRows(w.bills, c.expected.rows); expect(w.next?.label ?? null).toBe(c.expected.next);
  }, 'the same-day tie keeps the input order (a stable sort) and the second bill reads what the first left');
  kase('MK-CF-O-008-C04', 'AGREE', (c) => {
    const w = door(c); ACTUAL[c.case_id] = { rows: w.bills.map(rowOf), next: w.next };
    expectRows(w.bills, c.expected.rows); expect(w.next).toBe(c.expected.next);
  }, 'the recorded year 2028 is kept, so the bill is past the 365-day horizon');
  const undatedProfile = (c: any) => ({ monthlySpending: 0, spendCats: [{ id: 'ins', label: 'Insurance', amount: X(c.inputs.annual_bill), bucket: 'nonmonthly', months: c.inputs.months }] });
  kase('MK-CF-O-008-C05', 'AGREE', (c) => {
    // RULE UNCLEAR to the reviewer; settled by the app's own record and DEC-7611: a once-in-a-while bill with no month is a
    // twelfth a month in the budget (DEC-7611), and "A bill with NO date is not on the calendar — a date nobody gave would be
    // read as one they did. It is still counted in the month's total." (MK-CF-M-028's recorded decision, whats-coming.ts)
    const p = undatedProfile(c);
    spendByMonth(p as any).forEach((m, k) => expect(m).toBeCloseTo(X(c.expected.readings.budget_months[k]), 6));
    const w = whatsComing({ profile: p, startBalance: 0, now: NOW });
    expect(w.bills).toEqual([]); expect(w.next).toBeNull();
  }, 'FIXED 2026-10-25 — settled by DEC-7611 + MK-CF-M-028: no invented January bill');
  before('MK-CF-O-008-C05', 'the budget spreads $100 a month AND the door lists $1,200 due 2027-01-01, a date nobody gave', (c) => {
    const w = whatsComing({ profile: undatedProfile(c), startBalance: 0, now: NOW });
    ACTUAL[c.case_id] = { budget_months: spendByMonth(undatedProfile(c) as any), rows: w.bills.map(rowOf) };
    expect(w.bills.map((b) => [b.dueDate, b.amount])).toEqual([['2027-01-01', X(c.expected.readings.upcoming_bill_january)]]);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════
describe('MK-CF-F-212 receivedInMonth — five cases', () => {
  for (const id of ['C01', 'C02', 'C03', 'C04', 'C05']) {
    kase(`MK-CF-F-212-${id}`, 'AGREE', (c) => {
      const got = receivedInMonth(c.inputs.records, c.inputs.month).map((r: any) => r.id);
      ACTUAL[c.case_id] = got; expect(got).toEqual(c.expected);
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════
describe('MK-CF-F-121 zero12 — five cases (compiled from its own source)', () => {
  const twelveZeros = (c: any) => { const z = zero12(); ACTUAL[c.case_id] = z; expect(z.length).toBe(12); return z; };
  kase('MK-CF-F-121-C01', 'AGREE', (c) => { const z = twelveZeros(c); z.forEach((v, k) => expect(v).toBe(X(c.expected[k]))); });
  kase('MK-CF-F-121-C02', 'AGREE', (c) => { const first = zero12(); first[3] = 99; const z = twelveZeros(c); z.forEach((v, k) => expect(v).toBe(X(c.expected[k]))); });
  kase('MK-CF-F-121-C03', 'AGREE', (c) => { const a = zero12(); a[0] = 7; const b = twelveZeros(c); expect(b).toEqual(c.expected.values); expect(a[0]).toBe(7); });
  kase('MK-CF-F-121-C04', 'AGREE', (c) => { const z = twelveZeros(c); expect(z).toEqual(c.expected.values); for (let k = 0; k < 12; k++) expect(k in z).toBe(true); expect(z[0]).toBe(0); expect(z[11]).toBe(0); });
  kase('MK-CF-F-121-C05', 'AGREE', (c) => { const z = twelveZeros(c); z.forEach((v, k) => expect(v).toBe(X(c.expected[k]))); });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════
describe('MK-CF-F-018 equityByMonth — five cases', () => {
  const run = (c: any) => { const v = equityByMonth(vestOp(c.inputs.vests), c.inputs.requested_year); ACTUAL[c.case_id] = v; return v; };
  kase('MK-CF-F-018-C01', 'AGREE', (c) => { run(c).forEach((v, k) => expect(v).toBeCloseTo(X(c.expected[k]), 6)); });
  kase('MK-CF-F-018-C02', 'AGREE', (c) => { run(c).forEach((v, k) => expect(v).toBeCloseTo(X(c.expected[k]), 6)); });
  // APP WRONG by his DEC-0003 ("Every month you enter carries its own month AND year") and DEC-0187 (months keyed by their
  // date): the function reads only the MONTH of each vest, so a 2027 vest is laid on 2026's months and a level run-rate is
  // handed to a dated table (buildDatedGrid) as if it were what vests that month — and nothing labels it an illustration.
  // FIXED 2026-10-25 (FIX-BILLS): each vest's own value in the month AND year its date names (DEC-0012, DEC-0003, DEC-0187).
  kase('MK-CF-F-018-C03', 'AGREE', (c) => { run(c).forEach((v, k) => expect(v).toBeCloseTo(X(c.expected.actual_2026_values[k]), 6)); }, 'FIXED 2026-10-25 — DEC-0003, DEC-0187');
  before('MK-CF-F-018-C03', 'the level run-rate 13,849.79 ÷ 2 years laid on the vest months, year ignored (= the reviewer\'s formula_gives)', (c) => {
    run(c).forEach((v, k) => expect(v).toBeCloseTo(X(c.formula_gives.unqualified_run_rate_values[k]), 6));
  });
  kase('MK-CF-F-018-C04', 'AGREE', (c) => { run(c).forEach((v, k) => expect(v).toBeCloseTo(X(c.expected.actual_2026_values[k]), 6)); }, 'FIXED 2026-10-25 — DEC-0003, DEC-0187');
  before('MK-CF-F-018-C04', 'the 2030 vests are laid on 2026\'s January and September (= the reviewer\'s formula_gives)', (c) => {
    run(c).forEach((v, k) => expect(v).toBeCloseTo(X(c.formula_gives.unqualified_run_rate_values[k]), 6));
  });
  // RULED 2026-10-25 (the lead's ruling, reading A, under tenet 3 and his DEC-0296 "an unknown input produces no number and a
  // reason — never a default"): a vest with no date is refused — in no month, named "vest date not entered"; a vest with a year
  // and no month counts in that year's total, is in no month and says "vest month not entered". FIXED the same day (FIX-BILLS).
  kase('MK-CF-F-018-C05', 'AGREE', (c) => {
    expect(c.expected.state).toBe('REFUSES');
    expect(run(c).every((x) => x === 0)).toBe(true);
    expect(equityVests(vestOp(c.inputs.vests))).toEqual([{ amount: 1000, year: null, month: null, missing: 'vest date not entered' }]);
    const g = buildDatedGrid({ taxMode: 'manual', manualTaxRate: 0, ...vestOp(c.inputs.vests) } as any, { now: NOW });
    expect(g.cells.some((cell) => cell.incomeItems.some((i) => i.source === 'Equity vesting'))).toBe(false);
    expect(g.notInAMonth).toEqual([{ label: 'Equity vesting', amount: 1000, year: null, reason: 'vest date not entered' }]);
  }, 'RULED + FIXED 2026-10-25 — refused: "vest date not entered" (tenet 3, DEC-0296)');
  before('MK-CF-F-018-C05', 'an undated vest put in December', (c) => {
    const v = run(c);
    expect(v.slice(0, 11).every((x) => x === 0)).toBe(true);
    expect(v[11]).toBeCloseTo(X(c.formula_gives[11]), 6);
  });
  test('MK-CF-F-018 · a vest with a year and no month: in no month, "vest month not entered" — on the table only while its year is one of the twelve months\' (RULED + FIXED 2026-10-25)', () => {
    const op = { taxMode: 'manual', manualTaxRate: 0, equityType: 'rsu', rsuGrants: [{ shares: 1, price: 2500, date: '2027' }, { shares: 1, price: 900, date: '2030' }] };
    expect(equityByMonth(op, 2027).every((x) => x === 0)).toBe(true);
    expect(equityVests(op).map((v) => [v.year, v.month, v.missing])).toEqual([[2027, null, 'vest month not entered'], [2030, null, 'vest month not entered']]);
    const g = buildDatedGrid(op as any, { now: NOW });
    expect(g.notInAMonth).toEqual([{ label: 'Equity vesting', amount: 2500, year: 2027, reason: 'vest month not entered' }]);
    expect(g.totalIn).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════
describe('MK-CF-F-160 daysBetweenDates — five cases (compiled from its own source)', () => {
  for (const id of ['C01', 'C02', 'C03', 'C04']) {
    kase(`MK-CF-F-160-${id}`, 'AGREE', (c) => {
      const d = daysBetweenDates(local(c.inputs.from), local(c.inputs.to)); ACTUAL[c.case_id] = d;
      expect(d).toBe(X(c.expected));
    });
  }
  // RULE UNCLEAR to the reviewer (calendar days or elapsed time). Settled for its one caller: upcomingBills keeps "bills due from
  // today to the horizon" (its card's words) and the day is the person's own calendar day (DEC-0189). Elapsed time rounded
  // drops a bill due today once the clock passes noon (probe P7 below) and reads a bill due tomorrow as 0 days away late at night.
  kase('MK-CF-F-160-C05', 'AGREE', (c) => {
    expect(daysBetweenDates(new Date(c.inputs.from_local), new Date(c.inputs.to_local))).toBe(X(c.expected.readings.calendar_days));
  }, 'FIXED 2026-10-25 — settled by DEC-0189 and the card\'s "due from today": calendar days');
  before('MK-CF-F-160-C05', 'two minutes across midnight round to 0 days', (c) => {
    const d = daysBetweenDates(new Date(c.inputs.from_local), new Date(c.inputs.to_local)); ACTUAL[c.case_id] = d;
    expect(d).toBe(X(c.formula_gives));
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════
describe('MK-CF-F-122 addDays — five cases (compiled from its own source)', () => {
  for (const id of ['C01', 'C02', 'C03', 'C04', 'C05']) {
    kase(`MK-CF-F-122-${id}`, 'AGREE', (c) => {
      const d = isoLocalDate(addDays(local(c.inputs.from), c.inputs.days)); ACTUAL[c.case_id] = d;
      expect(d).toBe(c.expected);
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════
describe('MK-CF-F-124 nextOccurrence — five cases (compiled from its own source)', () => {
  const occ = (c: any) => { const d = isoLocalDate(nextOccurrence(c.inputs.month, c.inputs.day ?? 0, NOW, c.inputs.year)); ACTUAL[c.case_id] = d; return d; };
  for (const id of ['C01', 'C02', 'C03', 'C04']) kase(`MK-CF-F-124-${id}`, 'AGREE', (c) => { expect(occ(c)).toBe(c.expected); });
  // RULE UNCLEAR to the reviewer; settled by DEC-7941 (the lead's decision under his DEC-1923, DEC-0283, DEC-3523): "A yearly
  // bill whose day passed earlier this month has one place, this month's Out and plan, and is not under COMING UP for next year."
  kase('MK-CF-F-124-C05', 'AGREE', (c) => { expect(occ(c)).toBe(c.expected.readings.current_cycle); }, 'settled by DEC-7941: this cycle\'s date');
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════
describe('MK-CF-F-019 upcomingBills — five cases (the month table handed in, as the Bill calendar hands its own)', () => {
  const run = (c: any) => {
    const i = c.inputs; const p = billsProfile(i.bills ?? []);
    const grid = buildDatedGrid(p as any, { startBalance: X(i.independent_available_by_need_date ?? i.independent_available ?? 0), now: NOW });
    const b = upcomingBills(p as any, grid, NOW, i.horizon_days ? { horizonDays: i.horizon_days } : {});
    ACTUAL[c.case_id] = { rows: b.map(rowOf), next: b[0]?.label ?? null };
    return b;
  };
  for (const id of ['C01', 'C02', 'C03', 'C04']) {
    kase(`MK-CF-F-019-${id}`, 'AGREE', (c) => { const b = run(c); expectRows(b, c.expected.rows); expect(b[0]?.label ?? null).toBe(c.expected.next); });
  }
  const undated = (c: any) => ({ monthlySpending: 0, spendCats: [{ id: 'ins', label: 'Insurance', amount: X(c.inputs.annual_bill), bucket: 'nonmonthly', months: c.inputs.months }] });
  kase('MK-CF-F-019-C05', 'AGREE', (c) => {
    const p = undated(c);
    spendByMonth(p as any).forEach((m, k) => expect(m).toBeCloseTo(X(c.expected.readings.budget_months[k]), 6));
    expect(upcomingBills(p as any, buildDatedGrid(p as any, { now: NOW }), NOW)).toEqual([]);
  }, 'FIXED 2026-10-25 — settled by DEC-7611 + MK-CF-M-028: no invented January bill');
  before('MK-CF-F-019-C05', 'a $1,200 bill dated 2027-01-01 (= the reviewer\'s formula_gives)', (c) => {
    const p = undated(c);
    const b = upcomingBills(p as any, buildDatedGrid(p as any, { now: NOW }), NOW);
    ACTUAL[c.case_id] = { budget_months: spendByMonth(p as any), rows: b.map(rowOf) };
    expect(b.map((x) => [x.dueDate, x.amount])).toEqual([[c.formula_gives.bill.date, X(c.formula_gives.bill.amount)]]);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════
describe('MK-CF-F-232 balanceByDay — five cases', () => {
  for (const id of ['C01', 'C02', 'C03', 'C04', 'C05']) {
    kase(`MK-CF-F-232-${id}`, 'AGREE', (c) => {
      const v = balanceByDay(twoMonthGrid(c.inputs), c.inputs.need_by_date); ACTUAL[c.case_id] = v;
      expect(v).toBeCloseTo(X(c.expected), 6);
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════
describe('MK-CF-F-020 cashflowYear — RETIRED 2026-10-25; its five cases run on the one month table (MK-XS-F-004 buildDatedGrid)', () => {
  // RETIRED 2026-10-25 (FIX-BILLS, the register's way: the number is never reused). The legacy reader reached no screen (0
  // production callers — the guard P9 below) and was wrong on four of five cases by DEC-7938 (the wage that lands is after tax AND
  // the 401(k)s; reinvested money is not money arriving), DEC-1923 (a debt is taken from Debts) and DEC-0269 (outflow = expenses +
  // debt). Its cases now run on the month table every Cash flow surface draws. C03 is a calculated rate (its rate_mode), so the
  // reinvested $313.19's tax comes out of the pay at the app's own rate — the reviewer's formula, the app's rate (as probe P6).
  const grid = (c: any) => buildDatedGrid(cfOp(c.inputs) as any, { now: NOW, liabilities: debtOf(X(c.inputs.debt_due)) as any }).cells[0];
  const reviewer = (c: any) => { const m = grid(c); const e = c.expected; ACTUAL[c.case_id] = { take_home: m.inflow, outflow: m.outflow, net: m.net };
    expect(m.inflow).toBeCloseTo(X(e.take_home), 6); expect(m.outflow).toBeCloseTo(X(e.outflow), 6); expect(m.net).toBeCloseTo(X(e.net), 6); };
  for (const id of ['C01', 'C02', 'C04']) kase(`MK-CF-F-020-${id}`, 'AGREE', reviewer, 'FIXED 2026-10-25 — RETIRED; the month table gives the reviewer\'s answer (DEC-7938, DEC-1923, DEC-0269)');
  kase('MK-CF-F-020-C03', 'AGREE', (c) => {
    const i = c.inputs;
    const op = { baseSalary: X(i.wage_gross_monthly), salaryFreq: 'monthly', c_401k: X(i.k_monthly), invAnnual: X(i.reinvested_monthly) * 12, invPaidToBank: 'no', monthlySpending: X(i.planned_spend) };
    const r = rateInForce(op as any).rate;
    const m = buildDatedGrid(op as any, { now: NOW, liabilities: debtOf(X(i.debt_due)) as any }).cells[0];
    ACTUAL[c.case_id] = { rate: r, take_home: m.inflow, outflow: m.outflow };
    expect(m.inflow).toBeCloseTo(X(i.wage_gross_monthly) * (1 - r) - X(i.k_monthly) - X(i.reinvested_monthly) * r, 6);
    expect(m.outflow).toBeCloseTo(X(c.expected.outflow), 6);
  }, 'FIXED 2026-10-25 — RETIRED; the reviewer\'s formula at the app\'s calculated rate (DEC-7938: reinvested money is not money arriving, its tax comes out of the pay)');
  kase('MK-CF-F-020-C05', 'AGREE', reviewer, 'RETIRED 2026-10-25 — nothing in, nothing out: $0, $0, $0 on the month table');
  test('MK-CF-F-020 · RETIRED 2026-10-25: src/domain/cashflow exports no cashflowYear', () => {
    expect((cashflowModule as any).cashflowYear).toBeUndefined();
  });
  test.failing('MK-CF-F-020 · the app until 2026-10-25, pinned: cashflowYear existed and gave C01 $4,500 in (the 401(k) left in) — no longer its answer (RETIRED 2026-10-25)', () => {
    const m = (cashflowModule as any).cashflowYear(cfOp(C('MK-CF-F-020-C01').inputs), 0, NOW).months[0];
    expect(m.inflow).toBeCloseTo(X(C('MK-CF-F-020-C01').formula_gives.take_home), 6);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════
describe('MK-CF-O-006 theCreditLine — five cases (the door CreditScreen asks)', () => {
  const run = (c: any) => { const l = theCreditLine({ balance: X(c.inputs.balance), limit: X(c.inputs.limit) }); ACTUAL[c.case_id] = { used: l.used, status: l.status }; return l; };
  const reviewer = (c: any) => { const l = run(c); expect(l.used).not.toBeNull(); expect(l.used as number).toBeCloseTo(X(c.expected.share), 12); expect(l.status).toBe(c.expected.status); };
  kase('MK-CF-O-006-C01', 'AGREE', reviewer);
  kase('MK-CF-O-006-C02', 'AGREE', reviewer);
  // APP WRONG by his DEC-0264 / Q49 (full precision; nothing rounds inside a function): creditUtilization (src/domain/debt)
  // classifies on the full share — right — but hands the share out rounded to three decimals.
  // FIXED 2026-10-25 (FIX-BILLS, MK-CF-F-031 creditUtilization): the share is kept at full precision, rounded once where it is shown
  kase('MK-CF-O-006-C03', 'AGREE', reviewer, 'FIXED 2026-10-25 — DEC-0264: nothing rounds inside a function');
  before('MK-CF-O-006-C03', 'status caution (classified on the full 0.3001) but the share handed out is 0.300', () => {
    const l = theCreditLine({ balance: 300.10, limit: 1000 }); expect(l.status).toBe('caution'); expect(l.used).toBe(0.3);
  });
  kase('MK-CF-O-006-C04', 'AGREE', reviewer, 'FIXED 2026-10-25 — DEC-0264: nothing rounds inside a function');
  before('MK-CF-O-006-C04', 'status high; share 0.556 where it is 0.556390…', () => {
    const l = theCreditLine({ balance: 1731.17, limit: 3111.43 }); expect(l.status).toBe('high'); expect(l.used).toBe(0.556);
  });
  kase('MK-CF-O-006-C05', 'AGREE', (c) => { const l = run(c); expect(c.expected.state).toBe('REFUSES'); expect(l.used).toBeNull(); expect(l.status).toBeNull(); }, 'no share and no status — a refusal, never 0%');
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════
// THE SEVEN FORMULA VERDICTS (WRONG / INCOMPLETE) — what the code really does, measured
describe('formula verdicts — 7 of 7 WRONG / INCOMPLETE classified', () => {
  const FV: string[] = [];
  const fv = (id: string, mark: Mark, title: string, fn: () => void) => { FV.push(id); runner(mark)(`${id} [${mark}] — ${title}`, fn); };
  const insDec = { monthlySpending: 0, spendCats: [{ id: 'ins', label: 'Insurance', amount: 1200, bucket: 'nonmonthly', months: [12], dueDay: 15 }] };
  fv('MK-CF-O-008', 'AGREE', 'FIXED 2026-10-25 — with no starting balance the door projects from $0 and calls the bill Short; MK-CF-M-063\'s refusal is "No balance to start from — nothing is projected"', () => {
    const w = whatsComing({ profile: insDec, now: NOW });      // startBalance never handed in
    expect(w.bills[0].availableByNeed).toBeNull();
    expect(w.bills[0].shortfall).toBeNull();
    expect(w.refusal).toBe('No balance to start from — nothing is projected.');
    expect(w.bills.map((b) => [b.label, b.amount, b.dueDate])).toEqual([['Insurance', 1200, '2026-12-15']]);   // the bill is a fact; only the projection is refused
    // a balance typed as $0 IS an answer (tenet 5): projected from it
    const z = whatsComing({ profile: insDec, now: NOW, startBalance: 0 });
    expect([z.bills[0].availableByNeed, z.bills[0].shortfall, z.refusal]).toEqual([0, 1200, null]);
  });
  test.failing('MK-CF-O-008 · the app until 2026-10-25, pinned: no starting balance — Short $1,200 by 2026-12-13, read from a $0 the person never entered — no longer its answer (FIXED 2026-10-25)', () => {
    const w = whatsComing({ profile: insDec, now: NOW });
    expect([w.bills[0].availableByNeed, w.bills[0].shortfall, w.bills[0].needByDate]).toEqual([0, 1200, '2026-12-13']);
  });
  fv('MK-CF-F-018', 'AGREE', 'FIXED 2026-10-25 — the dated table lays a vest on the wrong year\'s month: C03\'s vests (Mar 2026, Jun 2027, Dec 2027) give Equity vesting in Dec 2026, Mar 2027, Jun 2027', () => {
    // the shares sold when they vest, so a vest is money in its month (2026-10-25, the lead's ruling; FIX-INCOME-B vestsAreCash)
    const g = buildDatedGrid({ taxMode: 'manual', manualTaxRate: 0, rsuSoldAtVest: 'yes', ...vestOp(C('MK-CF-F-018-C03').inputs.vests) } as any, { now: NOW });
    const eq = g.cells.map((cell) => cell.incomeItems.filter((i) => i.source === 'Equity vesting').reduce((t, i) => t + i.amount, 0));
    // the window is Oct 2026 – Sep 2027: only June 2027's $1,321.19 vests inside it (March 2026 has passed, Dec 2027 is beyond)
    expect(eq.map((v) => +v.toFixed(2))).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 1321.19, 0, 0, 0]);
    // kept as shares (the default): taxed in its year, and in no month's money (the lead's ruling, like DEC-0179)
    const kept = buildDatedGrid({ taxMode: 'manual', manualTaxRate: 0, ...vestOp(C('MK-CF-F-018-C03').inputs.vests) } as any, { now: NOW });
    expect(kept.cells.flatMap((cell) => cell.incomeItems).filter((i) => i.source === 'Equity vesting')).toEqual([]);
  });
  test.failing('MK-CF-F-018 · the app until 2026-10-25, pinned: Dec 2026 $2,105.585, Mar 2027 $4,158.715, Jun 2027 $660.595 on the dated table (rate 0) — no longer its answer (FIXED 2026-10-25)', () => {
    const g = buildDatedGrid({ taxMode: 'manual', manualTaxRate: 0, ...vestOp(C('MK-CF-F-018-C03').inputs.vests) } as any, { now: NOW });
    const eq = g.cells.map((cell) => cell.incomeItems.filter((i) => i.source === 'Equity vesting').reduce((t, i) => t + i.amount, 0));
    expect(eq[2]).toBeCloseTo(2105.585, 6); expect(eq[5]).toBeCloseTo(4158.715, 6); expect(eq[8]).toBeCloseTo(660.595, 6);
    expect(eq.reduce((t, v) => t + v, 0)).toBeCloseTo(6924.895, 6);
  });
  fv('MK-CF-F-160', 'AGREE', 'FIXED 2026-10-25 — elapsed time rounded, not calendar days: a bill due today drops off the list once the clock passes noon', () => {
    const p = { monthlySpending: 0, spendCats: [{ id: 'ins', label: 'Insurance', amount: 1200, bucket: 'nonmonthly', months: [12], dueDay: 15 }] };
    const at = new Date(2026, 11, 15, 13, 0, 0);
    expect(upcomingBills(p as any, buildDatedGrid(p as any, { now: at, startBalance: 5000 }), at).map((b) => b.dueDate)).toEqual(['2026-12-15']);
  });
  test('MK-CF-F-160 · FIXED 2026-10-25 — a bill due today is listed all day: 00:00, 11:00, 13:00 and 23:59 (DEC-0189)', () => {
    const p = { monthlySpending: 0, spendCats: [{ id: 'ins', label: 'Insurance', amount: 1200, bucket: 'nonmonthly', months: [12], dueDay: 15 }] };
    for (const h of [[0, 0], [11, 0], [13, 0], [23, 59]]) {
      const at = new Date(2026, 11, 15, h[0], h[1], 0);
      expect(upcomingBills(p as any, buildDatedGrid(p as any, { now: at }), at).map((b) => [b.dueDate, b.daysAway])).toEqual([['2026-12-15', 0]]);
    }
  });
  test.failing('MK-CF-F-160 · the app until 2026-10-25, pinned: the same bill is listed at 11:00 (0 days away) and gone at 13:00 — no longer its answer (FIXED 2026-10-25)', () => {
    const p = { monthlySpending: 0, spendCats: [{ id: 'ins', label: 'Insurance', amount: 1200, bucket: 'nonmonthly', months: [12], dueDay: 15 }] };
    const at11 = new Date(2026, 11, 15, 11, 0, 0), at13 = new Date(2026, 11, 15, 13, 0, 0);
    expect(upcomingBills(p as any, buildDatedGrid(p as any, { now: at11 }), at11).map((b) => b.dueDate)).toEqual(['2026-12-15']);
    expect(upcomingBills(p as any, buildDatedGrid(p as any, { now: at13 }), at13)).toEqual([]);
  });
  fv('MK-CF-F-124', 'AGREE', 'FIXED 2026-10-25 — a day past the month\'s end rolls into the next month: a bill on Feb 29 is listed Mar 1 2027 while the table counts it in February', () => {
    const p = { monthlySpending: 0, spendCats: [{ id: 'fee', label: 'Fee', amount: 300, bucket: 'nonmonthly', months: [2], dueDay: 29 }] };
    const g = buildDatedGrid(p as any, { now: NOW, startBalance: 5000 });
    const b = upcomingBills(p as any, g, NOW);
    const feb = g.cells.find((cell) => cell.calendarMonth === 2)!;
    expect(feb.billItems.some((x) => x.label === 'Fee')).toBe(true);
    expect(b[0].dueDate.slice(0, 7)).toBe('2027-02');
    expect(b[0].dueDate).toBe('2027-02-28');
    expect(feb.billItems.find((x) => x.label === 'Fee')!.day).toBe(28);   // the table writes the day the list does (tenet 4)
  });
  test('MK-CF-F-124 · FIXED 2026-10-25 — a day past its month\'s end is the month\'s last day: Feb 29 → 2027-02-28, Sep 31 → 2027-09-30, Feb 29 in 2028 stays 2028-02-29', () => {
    expect(isoLocalDate(nextOccurrence(2, 29, NOW))).toBe('2027-02-28');
    expect(isoLocalDate(nextOccurrence(9, 31, NOW))).toBe('2027-09-30');
    expect(isoLocalDate(nextOccurrence(2, 29, NOW, 2028))).toBe('2028-02-29');
  });
  test.failing('MK-CF-F-124 · the app until 2026-10-25, pinned: Feb 29 → 2027-03-01, and a September 31 bill → 2027-10-01 (outside the table\'s twelve months) — no longer its answer (FIXED 2026-10-25)', () => {
    expect(isoLocalDate(nextOccurrence(2, 29, NOW))).toBe('2027-03-01');
    expect(isoLocalDate(nextOccurrence(9, 31, NOW))).toBe('2027-10-01');
  });
  fv('MK-CF-F-019', 'AGREE', 'FIXED 2026-10-25 — an undated once-a-year bill is invented as due 1 January (case C05), and the table it reads counts it twice (probe P2)', () => {
    const p = { monthlySpending: 0, spendCats: [{ id: 'ins', label: 'Insurance', amount: 1200, bucket: 'nonmonthly', months: [] }] };
    expect(upcomingBills(p as any, buildDatedGrid(p as any, { now: NOW }), NOW)).toEqual([]);
  });
  fv('MK-CF-F-020', 'AGREE', 'RETIRED 2026-10-25 — the legacy reader is gone; the month table gives C01 $4,000 in (after tax and the 401(k))', () => {
    expect((cashflowModule as any).cashflowYear).toBeUndefined();
    expect(buildDatedGrid(cfOp(C('MK-CF-F-020-C01').inputs) as any, { now: NOW }).cells[0].inflow).toBeCloseTo(4000, 6);
  });
  fv('MK-CF-O-006', 'AGREE', 'FIXED 2026-10-25 — classification on the full share is right; the share itself is rounded to three decimals inside creditUtilization (DEC-0264)', () => {
    expect(theCreditLine({ balance: 300.10, limit: 1000 }).used).toBeCloseTo(0.3001, 12);
  });
  test('formula verdicts — every WRONG / INCOMPLETE / CANNOT TELL verdict in part 8 was classified (7 of 7)', () => {
    const want = PART.formula_checks.filter((f: any) => ['WRONG', 'INCOMPLETE', 'CANNOT TELL'].includes(f.verdict)).map((f: any) => f.id).sort();
    expect(PART.formula_checks.length).toBe(11);
    expect([...FV].sort()).toEqual(want);
    expect(want.length).toBe(7);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════
// PROBES — the lead's three priority questions, measured (not counted as cases)
describe('probes — the priority findings, with numbers', () => {
  // P1 (b): the handoff's dated example. $2,000 typed a month + $1,200 insurance due Dec 15.
  const dated = { monthlySpending: 2000, spendCats: [{ id: 'ins', label: 'Insurance', amount: 1200, bucket: 'nonmonthly', months: [12], dueDay: 15 }] };
  test('P1 · the dated example: September $2,000, December $3,200, the year $25,200 — budget, table and bill list agree; the bill is counted once', () => {
    const s = spendByMonth(dated as any);
    expect(s[8]).toBeCloseTo(2000, 6); expect(s[11]).toBeCloseTo(3200, 6); expect(s.reduce((t, v) => t + v, 0)).toBeCloseTo(25200, 6);
    expect(plannedMonthlySpend(dated as any)).toBeCloseTo(2100, 6);   // the annual average (DEC-7951), never a month's figure
    const g = buildDatedGrid(dated as any, { now: NOW, startBalance: 5000 });
    expect(g.cells.find((c) => c.calendarMonth === 9)!.outflow).toBeCloseTo(2000, 6);
    expect(g.cells.find((c) => c.calendarMonth === 12)!.outflow).toBeCloseTo(3200, 6);
    expect(g.totalOut).toBeCloseTo(25200, 6);
    const b = upcomingBills(dated as any, g, NOW);
    expect(b.map((x) => [x.label, x.amount, x.dueDate])).toEqual([['Insurance', 1200, '2026-12-15']]);
  });
  // P2 (b): the same bill with no month picked, and nothing else in the budget
  const undatedOnly = { monthlySpending: 0, spendCats: [{ id: 'ins', label: 'Insurance', amount: 1200, bucket: 'nonmonthly', months: [] }] };
  test('P2 · an undated $1,200 bill is counted once on the month table: $100 a month, $1,200 a year (DEC-7611) [FIXED 2026-10-25 — MK-XS-F-004 buildDatedGrid]', () => {
    const g = buildDatedGrid(undatedOnly as any, { now: NOW });
    expect(g.totalOut).toBeCloseTo(1200, 6);
    expect(g.cells.find((c) => c.calendarMonth === 1)!.outflow).toBeCloseTo(100, 6);
    g.cells.forEach((c) => expect(c.outflow).toBeCloseTo(100, 6));
    expect(g.cells.flatMap((c) => c.billItems).some((b) => !b.regular)).toBe(false);   // nothing on a date nobody gave
  });
  test.failing('P2 · the app until 2026-10-25, pinned: the budget says $1,200 a year ($100 a month); the month table says $2,300: $1,200 in January plus $100 in each of the other eleven', () => {
    expect(spendByMonth(undatedOnly as any).reduce((t, v) => t + v, 0)).toBeCloseTo(1200, 6);
    const g = buildDatedGrid(undatedOnly as any, { now: NOW });
    ACTUAL['P2'] = { grid_out_by_month: g.cells.map((c) => [c.label, c.outflow]), grid_year: g.totalOut };
    expect(g.cells.find((c) => c.calendarMonth === 1)!.outflow).toBeCloseTo(1200, 6);
    expect(g.cells.filter((c) => c.calendarMonth !== 1).every((c) => Math.abs(c.outflow - 100) < 1e-9)).toBe(true);
    expect(g.totalOut).toBeCloseTo(2300, 6);
  }); // — no longer its answer (FIXED 2026-10-25)
  // P3 (b): undated, with $2,000 typed a month — the year holds, January moves money from everyday into the bill
  test('P3 · FIXED 2026-10-25 — undated $1,200 beside $2,000 typed: $2,000 every month on the table as in the budget, $24,000 a year, no bill on a date nobody gave', () => {
    const p = { monthlySpending: 2000, spendCats: [{ id: 'ins', label: 'Insurance', amount: 1200, bucket: 'nonmonthly', months: [] }] };
    const g = buildDatedGrid(p as any, { now: NOW });
    g.cells.forEach((c) => expect(c.billItems.map((b) => [b.label, +b.amount.toFixed(2)])).toEqual([['Everyday expenses', 2000]]));
    expect(g.totalOut).toBeCloseTo(24000, 6);
  });
  test.failing('P3 · the app until 2026-10-25, pinned: undated $1,200 beside $2,000 typed — January reads $800 everyday + $1,200 bill — no longer its answer (FIXED 2026-10-25)', () => {
    const p = { monthlySpending: 2000, spendCats: [{ id: 'ins', label: 'Insurance', amount: 1200, bucket: 'nonmonthly', months: [] }] };
    expect(spendByMonth(p as any).every((v) => Math.abs(v - 2000) < 1e-9)).toBe(true);   // DEC-7611: still a twelfth a month, inside the typed total
    const g = buildDatedGrid(p as any, { now: NOW });
    const jan = g.cells.find((c) => c.calendarMonth === 1)!;
    ACTUAL['P3'] = { jan_items: jan.billItems.map((b) => [b.label, b.amount]), grid_year: g.totalOut };
    expect(jan.billItems.map((b) => [b.label, +b.amount.toFixed(2)])).toEqual([['Insurance', 1200], ['Everyday expenses', 800]]);
    expect(g.totalOut).toBeCloseTo(24000, 6);
  });
  // P4 (c): an undated vest lands in December on the table every Cash flow surface reads
  test('P4 · FIXED 2026-10-25 — a $1,000 vest with no date is in no month of the table, named "vest date not entered" (the lead\'s ruling, tenet 3)', () => {
    const g = buildDatedGrid({ taxMode: 'manual', manualTaxRate: 0, ...vestOp([{ date: null, independently_valued_amount: 1000 }]) } as any, { now: NOW });
    expect(g.totalIn).toBe(0);
    expect(g.notInAMonth).toEqual([{ label: 'Equity vesting', amount: 1000, year: null, reason: 'vest date not entered' }]);
  });
  test.failing('P4 · the app until 2026-10-25, pinned: a $1,000 vest with no date is Equity vesting in December 2026 on the month table (rate 0) — no longer its answer (FIXED 2026-10-25)', () => {
    const g = buildDatedGrid({ taxMode: 'manual', manualTaxRate: 0, ...vestOp([{ date: null, independently_valued_amount: 1000 }]) } as any, { now: NOW });
    const eq = g.cells.map((cell) => cell.incomeItems.filter((i) => i.source === 'Equity vesting').reduce((t, i) => t + i.amount, 0));
    expect(g.cells[2].label).toBe('Dec'); expect(eq[2]).toBeCloseTo(1000, 6); expect(eq.reduce((t, v) => t + v, 0)).toBeCloseTo(1000, 6);
  });
  // P6 (a): the current household path on the cashflowYear cases — the dated grid every screen reads
  for (const id of ['C01', 'C02', 'C04']) {
    test(`P6 · MK-CF-F-020-${id} on the current path (buildDatedGrid): the reviewer's take-home, outflow and net`, () => {
      const c = C(`MK-CF-F-020-${id}`);
      const cell = buildDatedGrid(cfOp(c.inputs) as any, { now: NOW, liabilities: debtOf(X(c.inputs.debt_due)) as any }).cells[0];
      ACTUAL[`P6-${id}`] = { take_home: cell.inflow, outflow: cell.outflow, net: cell.net };
      expect(cell.inflow).toBeCloseTo(X(c.expected.take_home), 6);
      expect(cell.outflow).toBeCloseTo(X(c.expected.outflow), 6);
      expect(cell.net).toBeCloseTo(X(c.expected.net), 6);
    });
  }
  test('P6 · MK-CF-F-020-C03 on the current path, calculated rate: reinvested $313.19 not counted in, its tax taken from the pay, the debt out', () => {
    const c = C('MK-CF-F-020-C03'); const i = c.inputs;
    const op = { baseSalary: X(i.wage_gross_monthly), salaryFreq: 'monthly', c_401k: X(i.k_monthly), invAnnual: X(i.reinvested_monthly) * 12, invPaidToBank: 'no', monthlySpending: X(i.planned_spend) };
    const r = rateInForce(op as any).rate;
    const cell = buildDatedGrid(op as any, { now: NOW, liabilities: debtOf(X(i.debt_due)) as any }).cells[0];
    ACTUAL['P6-C03'] = { rate: r, take_home: cell.inflow, outflow: cell.outflow };
    // the reviewer's formula with the app's own calculated rate: wage × (1 − r) − 401(k) − reinvested × r
    expect(cell.inflow).toBeCloseTo(X(i.wage_gross_monthly) * (1 - r) - X(i.k_monthly) - X(i.reinvested_monthly) * r, 6);
    expect(cell.outflow).toBeCloseTo(X(c.expected.outflow), 6);
    // (the legacy reader that counted the reinvested $313.19 as money in was RETIRED on 2026-10-25 — MK-CF-F-020)
  });
  // P8: addDays adds 24-hour blocks, so the need-by day of a bill due just after the clocks go forward is a day early
  const dstZone = new Date(2027, 2, 15).getTimezoneOffset() !== new Date(2027, 2, 13).getTimezoneOffset();
  (dstZone ? test : test.skip)('P8 · a bill due 2027-03-15 (the clocks went forward on Mar 14): need-by 2027-03-13, ask-by 2027-03-03 [FIXED 2026-10-25 — MK-CF-F-122 addDays, calendar days]', () => {
    const p = { monthlySpending: 0, spendCats: [{ id: 'tax', label: 'Tax', amount: 900, bucket: 'nonmonthly', months: [3], dueDay: 15 }] };
    const b = upcomingBills(p as any, buildDatedGrid(p as any, { now: NOW, startBalance: 5000 }), NOW)[0];
    expect([b.needByDate, b.askByDate]).toEqual(['2027-03-13', '2027-03-03']);
  });
  (dstZone ? test.failing : test.skip)('P8 · the app until 2026-10-25, pinned: need-by 2027-03-12 and ask-by 2027-03-02, one day early — no longer its answer (FIXED 2026-10-25)', () => {
    const p = { monthlySpending: 0, spendCats: [{ id: 'tax', label: 'Tax', amount: 900, bucket: 'nonmonthly', months: [3], dueDay: 15 }] };
    const b = upcomingBills(p as any, buildDatedGrid(p as any, { now: NOW, startBalance: 5000 }), NOW)[0];
    ACTUAL['P8'] = { due: b.dueDate, need_by: b.needByDate, ask_by: b.askByDate };
    expect([b.dueDate, b.needByDate, b.askByDate]).toEqual(['2027-03-15', '2027-03-12', '2027-03-02']);
  });
  // P9 (a): who calls cashflowYear — a guard that proves it looked
  test('P9 · cashflowYear is RETIRED (2026-10-25): no file under src/, app/ or MoneyKeel/functions defines, imports or calls it — every .ts/.tsx read', () => {
    const root = path.join(__dirname, '../../..');
    const files: string[] = [];
    const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); } else if (/\.(ts|tsx)$/.test(e.name)) files.push(p);
    } };
    for (const d of ['src', 'app', 'MoneyKeel/functions']) walk(path.join(root, d));
    const isTest = (f: string) => /\.test\.tsx?$/.test(f) || f.includes(`${path.sep}__tests__${path.sep}`);
    // read off each file's syntax tree: an identifier named cashflowYear is a use; a comment, a string or a pattern naming it is not
    const usesIt = (f: string) => {
      const t = fs.readFileSync(f, 'utf8');
      if (!t.includes('cashflowYear')) return false;
      let hit = false;
      (function look(n: ts.Node) { if (ts.isIdentifier(n) && n.text === 'cashflowYear') hit = true; else ts.forEachChild(n, look); })(
        ts.createSourceFile(f, t, ts.ScriptTarget.Latest, true, f.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS));
      return hit;
    };
    const users = files.filter((f) => !f.includes('outside_cashflow_openai_part08') && usesIt(f));
    const prod = users.filter((f) => !isTest(f)).map((f) => path.relative(root, f));
    const tests = users.filter(isTest).map((f) => path.relative(root, f));
    ACTUAL['P9'] = { files_read: files.length, production_users: prod, test_users: tests };
    expect(files.length).toBeGreaterThanOrEqual(400);           // a guard whose walk stops matching goes red, not quiet
    expect(prod).toEqual([]);
    expect(tests).toEqual([]);
  });
});

// ── every case of the part ran exactly once ─────────────────────────────────────────────────────────
test('coverage — 55 of 55 part-8 cases run exactly once', () => {
  const all = PART.cases.map((c: any) => c.case_id);
  expect(all.length).toBe(55);
  expect(new Set(RAN).size).toBe(RAN.length);
  expect([...RAN].sort()).toEqual([...all].sort());
});

if (process.env.CFR_DUMP) afterAll(() => { console.log(`CFRDUMP${JSON.stringify({ ACTUAL, MARKS })}CFRDUMP`); });
