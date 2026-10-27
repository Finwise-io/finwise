/* THE OUTSIDE CASES, RUN AGAINST THE APP — Cash flow module, OpenAI independent audit of 2026-10-24, PART 6 of 19
 * (the budget and the Expenses tab). Measured 2026-10-25 by CFR-2's part-6 runner.
 *
 * Cards (ID first, name in brackets): MK-CF-F-001 (buildBudgetState) · MK-CF-F-002 (plannedMonthlySpend) · MK-CF-F-120
 * (pctBaseMonthly) · MK-CF-F-003 (categoryMonthly) · MK-CF-F-004 (spendBuckets) · MK-CF-F-221 (spendByMonthByBucket) ·
 * MK-CF-F-008 (spendByMonth) · MK-CF-O-002 (expenses) · MK-CF-F-149 (recurringDebtPayments) · MK-CF-F-150
 * (debtPaymentsCountedAsExpenses) · MK-CF-F-151 (actualSpending) · MK-CF-F-152 (isRadarItem) · MK-CF-F-153 (radar) ·
 * MK-CF-O-020 (theBudgetCounted). 70 cases, 5 formula verdicts to classify (F-001 WRONG; O-002, F-150, F-153, O-020
 * INCOMPLETE), 3 decisions the reviewer says are NOT HELD (DEC-2440, DEC-7611, DEC-7951).
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/
 * MoneyKeel_CashFlow_Independent_Audit/audit_results/MoneyKeel_CashFlow_Audit_Part_06.json. Every expected answer is READ
 * FROM THE PACKAGE (C(caseId).expected), never retyped; only the plain input names are mapped onto the app's fields.
 * Results, case by case: MoneyKeel/documents/audit/outside-test-cases/returned/results/cashflow_openai_part06_results.json
 *
 * MEASURED ONLY (2026-10-25): no app code, record, drawing or existing test was changed — only this file and its results.
 * FIXED 2026-10-25 (FIX-MONTH): F-150-C05, O-002-C05 (one matcher, by the debt itself — debtPaymentsMatched), O-020-C05 and DEC-2440
 * (a budget line that is a debt in Debts stands down, DEC-1923), F-153-C05 (the lead's ruling, reading A: the production door hands the
 * radar the month's own dated bills). Each old answer is kept beside it as test.failing.
 * FIXED 2026-10-25 (FIX-BUDGET) — MK-CF-F-001-C05, MK-CF-F-004-C02, the verdict on MK-CF-F-001 and DEC-7611 / DEC-7951 flipped the
 * file's own way: the case passes on the reviewer's answer, marked AGREE with "FIXED 2026-10-25" in its name, and the app's old
 * answer is kept beside it as test.failing ("the app until 2026-10-25, pinned: … — no longer its answer").
 *
 * Markers: AGREE → test on the reviewer's answer · APP WRONG → test.failing on the reviewer's answer (it turns red when the
 * fix lands) plus a plain twin "app today" · REVIEWER WRONG → none in this part · NEEDS RULING → none as a case (one item is
 * raised from a formula verdict) · OUTSIDE DOMAIN → test.skip with the caller named, plus a plain test pinning what the
 * function and the production door give.
 *
 * INPUT NAMES MAPPED (the app's fields, never the answers):
 *   typed / fixed / everyday / annual_bill / bill_months → the profile the budget editor writes (BudgetScreen, SpendingEditor:
 *     spendCats only — no screen writes the legacy b_fixed / b_flexible totals): monthlySpending = typed; a 'fixed' dollar
 *     category = fixed; a 'flexible' dollar category = everyday; a 'nonmonthly' dollar category with months = the dated bill.
 *   take_home / expenses (F-001) → buildBudgetState(uid, take-home, { monthly_spending }); "expenses: null" → the doc its only
 *     caller (MK-CF-F-013 budgetFromOnboarding) builds for a profile with no budget — monthly_spending 0.
 *   take_home_by_month (F-120) / take_home_monthly_average (F-003) → pctBaseMonthly and categoryMonthly are run from their own
 *     source text in src/domain/budget/index.ts with incomeMonthlyGrid (F-120) or pctBaseMonthly (F-003) handed the case's
 *     take-home — the case's input IS that function's output. Dollar categories are also run through the real export.
 *   monthly_normalized_rows (F-004) → spendCats; a 'nonmonthly' row's monthly figure m is the category's yearly amount 12·m
 *     (categoryMonthly divides it by 12); typed_buckets → b_fixed / b_nonmonthly / b_flexible.
 *   debts → Debt { debt_id, label, debt_type, remaining_balance, minimum_monthly_payment, payment_type, first_payment_date,
 *     payoff_date }; shape instalment → 'installment', revolving → 'revolving', due_full → 'due_in_full'; kind mortgage →
 *     MORTGAGE, credit_card → CREDIT_CARD, personal → PERSONAL, heloc → HELOC; required / payment → minimum_monthly_payment.
 *   logs / logged / paid → LoggedExpense { category 'Debt payment', store = payee (the app logs a debt payment with
 *     store = the debt's label and NO debt id: BudgetScreen.tsx addExpense, MoneySheets.tsx), date, amount }.
 *   source manual / imported → origin absent / 'imported'; source_filter manual → actualSpending(s, 'by-hand').
 *   purchases_captured true → the purchasesCaptured set holding that debt's id (no production caller builds one today:
 *     MK-CF-O-010 theMonth calls expenses(input) with the default empty set).
 *   big_bills → ExpensesInput.bigBills { label, amount, dueLabel } (no production caller hands any: MK-CF-F-227
 *     thisMonthInputs builds no bigBills).
 *   A row's "name" on the radar / counted-as-expense list → the app's label "<debt name> payment" (the drawing's own
 *     wording, cash-flow_v01 frame C: "HELOC payment").
 *   home / home_mortgage / mortgage_property (O-020) → real-estate accounts (kind 'home', the home marked re_use 'primary')
 *     and a MORTGAGE debt whose property_id names its property; budget_rent_mortgage → the 'rent' category; typed_total →
 *     monthlySpending.
 * TOLERANCES: money to 1e-6 dollars (toBeCloseTo …, 6) — floating sums only; strings exact; REFUSES is never 0.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import {
  buildBudgetState, plannedMonthlySpend, categoryMonthly, spendBuckets, spendByMonthByBucket, spendByMonth,
  budgetFromOnboarding, budgetVsActual,
} from '../../../src/domain/budget';
import { toNum } from '../../../src/domain/_shared/num';
import {
  expenses, recurringDebtPayments, debtPaymentsCountedAsExpenses, actualSpending, isRadarItem, radar,
} from './expenses';
import { theBudgetCounted } from './budget-counted';
import { plannedMonthFlow, actualMonthFlow, debtPaymentsByDebt } from './this-month';
import { thisMonthInputs, datedGridOf } from '../../../src/hooks/useCashflowModel';
import { theMonth } from './the-month';

// ── the package, read as it came ────────────────────────────────────────────────────────────────────
type Mark = 'AGREE' | 'APP WRONG' | 'REVIEWER WRONG' | 'NEEDS RULING' | 'BLOCKED' | 'OUTSIDE DOMAIN';
const PKG = path.join(__dirname, '../../documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/MoneyKeel_CashFlow_Independent_Audit/audit_results');
const PART = JSON.parse(fs.readFileSync(path.join(PKG, 'MoneyKeel_CashFlow_Audit_Part_06.json'), 'utf8'));
const C = (caseId: string): any => {
  const c = PART.cases.find((x: any) => x.case_id === caseId);
  if (!c) throw new Error(`no case ${caseId} in the package`);
  return c;
};
const RAN: string[] = [];
const ACT: Record<string, any> = {};
/** CFR_SHOW_FAILS=1 runs every test.failing as a plain test, so each one can be seen to fail on its assertion, not on a crash */
const failing: typeof test.failing = process.env.CFR_SHOW_FAILS ? (test as any) : test.failing;
const runner = (mark: Mark) => (mark === 'APP WRONG' || mark === 'REVIEWER WRONG' ? failing
  : mark === 'BLOCKED' || mark === 'OUTSIDE DOMAIN' ? test.skip : test);
const kase = (caseId: string, mark: Mark, fn: (c: any, put: (a: any) => void) => void, note = '') => {
  RAN.push(caseId);
  const c = C(caseId);
  runner(mark)(`${caseId} · ${c.kind} · ${c.title} [${mark}]${note ? ` — ${note}` : ''}`, () => fn(c, (a) => { ACT[caseId] = a; }));
};
afterAll(() => {
  if (process.env.CFR_DUMP) fs.writeFileSync(process.env.CFR_DUMP, JSON.stringify(ACT, null, 1));
});

// ── helpers ─────────────────────────────────────────────────────────────────────────────────────────
/** an exact value as the package writes it: {exact}, a decimal string, a rational "a/b", or a number */
const X = (v: any): number => {
  const s = v && typeof v === 'object' && 'exact' in v ? v.exact : v;
  if (typeof s === 'number') return s;
  const t = String(s);
  if (t.includes('/')) { const [a, b] = t.split('/'); return Number(a) / Number(b); }
  return Number(t);
};
const close = (got: number, want: any) => expect(got).toBeCloseTo(X(want), 6);
const UID = 'u-cfr2-part6' as any;
const SHAPE: Record<string, any> = { instalment: 'installment', revolving: 'revolving', due_full: 'due_in_full' };
const KIND: Record<string, string> = { mortgage: 'MORTGAGE', credit_card: 'CREDIT_CARD', personal: 'PERSONAL', heloc: 'HELOC' };
const debt = (o: Record<string, any>): any => ({
  debt_id: o.id ?? o.name, label: o.name, debt_type: o.debt_type ?? (o.shape === 'revolving' ? 'CREDIT_CARD' : 'OTHER'),
  remaining_balance: o.balance != null ? X(o.balance) : 1000, interest_rate_apr: 0,
  minimum_monthly_payment: o.required != null ? X(o.required) : o.required_payment != null ? X(o.required_payment) : o.payment != null ? X(o.payment) : 0,
  ...(o.shape ? { payment_type: SHAPE[o.shape] } : {}),
  ...(o.first_payment_date ? { first_payment_date: o.first_payment_date } : {}),
  ...(o.payoff_date ? { payoff_date: o.payoff_date } : {}),
  ...(o.due_date ? { payoff_date: o.due_date } : {}),
});
const paid = (payee: string, amount: any, date = '2026-10-17') => ({ category: 'Debt payment', store: payee, date, amount: X(amount) });
/** the budget editor's profile for typed / fixed / everyday / a dated bill */
const plan = (i: any): any => ({
  monthlySpending: String(X(i.typed)),
  spendCats: [
    ...(X(i.fixed) > 0 ? [{ id: 'bills', label: 'Bills', bucket: 'fixed', unit: 'dollar', amount: String(X(i.fixed)) }] : []),
    ...(X(i.everyday) > 0 ? [{ id: 'everyday', label: 'Everyday', bucket: 'flexible', unit: 'dollar', amount: String(X(i.everyday)) }] : []),
    ...(X(i.annual_bill) > 0 ? [{ id: 'insurance', label: 'Insurance', bucket: 'nonmonthly', unit: 'dollar', amount: String(X(i.annual_bill)), months: i.bill_months }] : []),
  ],
});
const sum = (xs: number[]) => xs.reduce((t, x) => t + x, 0);

// ── the functions the app does not export, run from their own source text ──────────────────────────
const BUDGET_SRC = fs.readFileSync(path.join(__dirname, '../../../src/domain/budget/index.ts'), 'utf8');
const compile = (src: string, start: RegExp, name: string, imported: Record<string, unknown>) => {
  const at = src.search(start);
  if (at < 0) throw new Error(`${start} not found`);
  const code = src.slice(at, src.indexOf('\n}\n', at) + 3);
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText;
  return new Function(...Object.keys(imported), `${js}\nreturn ${name};`)(...Object.values(imported));
};
/** MK-CF-F-120 pctBaseMonthly, its own text, with incomeMonthlyGrid answering the case's twelve take-home months */
const pctBaseMonthlyOf = (months: any[]): number => compile(BUDGET_SRC, /function pctBaseMonthly\(/, 'pctBaseMonthly',
  { incomeMonthlyGrid: () => months.map((m) => ({ amount: X(m) })) })(null);
/** MK-CF-F-003 categoryMonthly, its own text, with pctBaseMonthly answering the case's average take-home */
const categoryMonthlyAt = (avg: any) => compile(BUDGET_SRC, /function categoryMonthly\(/, 'categoryMonthly',
  { toNum, pctBaseMonthly: () => X(avg) });

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
describe('MK-CF-F-001 buildBudgetState — five cases', () => {
  const save = (c: any, put: (a: any) => void) => {
    const doc = c.inputs.expenses == null ? budgetFromOnboarding(UID, {} as any) : { user_id: UID, monthly_spending: X(c.inputs.expenses), fixed: 0, non_monthly: 0, flexible: 0 };
    const s = buildBudgetState(UID, X(c.inputs.take_home), doc as any);
    put({ projected_to_save: s.projected_to_save, monthly_spending: s.monthly_spending });
    return s.projected_to_save as number;   // null when no budget is set (C05)
  };
  kase('MK-CF-F-001-C01', 'AGREE', (c, put) => close(save(c, put), c.expected));
  kase('MK-CF-F-001-C02', 'AGREE', (c, put) => close(save(c, put), c.expected));
  kase('MK-CF-F-001-C03', 'AGREE', (c, put) => close(save(c, put), c.expected));
  kase('MK-CF-F-001-C04', 'AGREE', (c, put) => close(save(c, put), c.expected));
  // FIXED 2026-10-25 (FIX-BUDGET): tenet 3 and DEC-7939 (no planned surplus without a budget) — no plan entered is stored as no
  // plan (budgetFromOnboarding, MK-CF-F-013) and buildBudgetState gives no projected saving; a typed $0 plan still gives the take-home (C04)
  kase('MK-CF-F-001-C05', 'AGREE', (c, put) => {
    const v = save(c, put);
    expect(c.expected.state).toBe('REFUSES');
    expect(v == null || Number.isNaN(v)).toBe(true);
  }, 'FIXED 2026-10-25: no budget set, no projected saving (it was the whole $5,000 take-home; DEC-7939, tenet 3)');
  failing('MK-CF-F-001-C05 · the app until 2026-10-25, pinned: no budget set → projected_to_save $5,000 (budgetFromOnboarding handed 0, read as nothing spent) — no longer its answer (FIXED 2026-10-25)', () => {
    const doc = budgetFromOnboarding(UID, {} as any);
    expect(doc.monthly_spending).toBe(0);
    expect(buildBudgetState(UID, 5000, doc).projected_to_save).toBe(5000);
  });
});

describe('MK-CF-F-002 plannedMonthlySpend — five cases', () => {
  for (const n of [1, 2, 3, 4, 5]) {
    kase(`MK-CF-F-002-C0${n}`, 'AGREE', (c, put) => { const v = plannedMonthlySpend(plan(c.inputs)); put(v); close(v, c.expected); });
  }
});

describe('MK-CF-F-120 pctBaseMonthly — five cases (its own text, the grid handed the case)', () => {
  for (const n of [1, 2, 3, 4, 5]) {
    kase(`MK-CF-F-120-C0${n}`, 'AGREE', (c, put) => { const v = pctBaseMonthlyOf(c.inputs.take_home_by_month); put(v); close(v, c.expected); });
  }
});

describe('MK-CF-F-003 categoryMonthly — five cases', () => {
  const cat = (i: any) => ({ amount: String(X(i.amount)), unit: i.kind === 'percent' ? 'pct' : 'dollar', bucket: i.nonmonthly ? 'nonmonthly' : 'fixed' });
  for (const n of [1, 2, 3, 4, 5]) {
    kase(`MK-CF-F-003-C0${n}`, 'AGREE', (c, put) => {
      const v = categoryMonthlyAt(c.inputs.take_home_monthly_average)(cat(c.inputs), null);
      put(v); close(v, c.expected);
      // a dollar category never reads the take-home: the real export, handed no profile, gives the same
      if (c.inputs.kind === 'dollars') close(categoryMonthly(cat(c.inputs), null), c.expected);
    });
  }
});

describe('MK-CF-F-004 spendBuckets — five cases', () => {
  const profile = (i: any): any => ({
    ...(i.monthly_normalized_rows ? { spendCats: i.monthly_normalized_rows.map(([b, m]: [string, any], k: number) =>
      ({ id: `r${k}`, label: `Row ${k}`, bucket: b, unit: 'dollar', amount: String(b === 'nonmonthly' ? X(m) * 12 : X(m)) })) } : {}),
    ...(i.categories ? { spendCats: i.categories } : {}),
    ...(i.typed_buckets ? { b_fixed: String(i.typed_buckets[0]), b_nonmonthly: String(i.typed_buckets[1]), b_flexible: String(i.typed_buckets[2]) } : {}),
  });
  const check = (c: any, put: (a: any) => void, p = profile(c.inputs)) => {
    const b = spendBuckets(p);
    put(b);
    close(b.fixed, c.expected.fixed); close(b.non_monthly, c.expected.nonmonthly);
    close(b.flexible, c.expected.flexible); close(b.monthly_total, c.expected.total);
  };
  kase('MK-CF-F-004-C01', 'AGREE', (c, put) => check(c, put));
  // FIXED 2026-10-25 (FIX-BUDGET): the card's own rule ("with no categories: the three typed bucket totals") and DEC-7951 (the
  // typed split stands while no category replaces it). An EMPTY category list read as categories: $0, while spendByMonthByBucket
  // read the same profile as $1,000 + $900 a month — two readers, two answers (tenet 4). Both now ask categoriesInForce.
  kase('MK-CF-F-004-C02', 'AGREE', (c, put) => check(c, put), 'FIXED 2026-10-25: an empty category list keeps the typed totals (it read $0; DEC-7951, tenet 4)');
  test('MK-CF-F-004-C02 · one budget, one reading (FIXED 2026-10-25): spendCats [] and spendCats absent both give the typed $1,000 / $100 / $900, on spendBuckets and on every month of spendByMonthByBucket', () => {
    const typed = { b_fixed: '1000', b_nonmonthly: '100', b_flexible: '900' };
    expect(spendBuckets({ ...typed, spendCats: [] } as any)).toEqual({ fixed: 1000, non_monthly: 100, flexible: 900, monthly_total: 2000 });
    expect(spendBuckets(typed as any)).toEqual({ fixed: 1000, non_monthly: 100, flexible: 900, monthly_total: 2000 });
    for (const m of spendByMonthByBucket({ ...typed, spendCats: [] } as any)) expect(m).toEqual({ fixed: 1000, nonmonthly: 100, flexible: 900 });
    // a list holding only a category left at $0 is no categories too (C05's shape, with typed totals)
    expect(spendBuckets({ ...typed, spendCats: [{ id: 'r', label: 'Rent', bucket: 'fixed', unit: 'dollar', amount: '0' }] } as any).monthly_total).toBe(2000);
  });
  failing('MK-CF-F-004-C02 · the app until 2026-10-25, pinned: spendCats [] → $0 in every group, and spendByMonthByBucket on [] → fixed 1,000, once in a while 0, everyday 900 — no longer its answer (FIXED 2026-10-25)', () => {
    const typed = { b_fixed: '1000', b_nonmonthly: '100', b_flexible: '900' };
    expect(spendBuckets({ ...typed, spendCats: [] } as any)).toEqual({ fixed: 0, non_monthly: 0, flexible: 0, monthly_total: 0 });
    expect(spendByMonthByBucket({ ...typed, spendCats: [] } as any)[0]).toEqual({ fixed: 1000, nonmonthly: 0, flexible: 900 });
  });
  kase('MK-CF-F-004-C03', 'AGREE', (c, put) => check(c, put));
  kase('MK-CF-F-004-C04', 'AGREE', (c, put) => check(c, put));
  kase('MK-CF-F-004-C05', 'AGREE', (c, put) => check(c, put));
});

describe('MK-CF-F-221 spendByMonthByBucket — five cases', () => {
  for (const n of [1, 2, 3, 4, 5]) {
    kase(`MK-CF-F-221-C0${n}`, 'AGREE', (c, put) => {
      const g = spendByMonthByBucket(plan(c.inputs));
      put(g);
      expect(g).toHaveLength(12);
      c.expected.forEach(([f, nm, fl]: any[], k: number) => { close(g[k].fixed, f); close(g[k].nonmonthly, nm); close(g[k].flexible, fl); });
    });
  }
});

describe('MK-CF-F-008 spendByMonth — five cases (the handoff\'s dated-budget example is C02)', () => {
  for (const n of [1, 2, 3, 4, 5]) {
    kase(`MK-CF-F-008-C0${n}`, 'AGREE', (c, put) => {
      const m = spendByMonth(plan(c.inputs));
      put(m);
      expect(m).toHaveLength(12);
      c.expected.forEach((e: any, k: number) => close(m[k], e));
    });
  }
  test('the handoff\'s worked example: $2,000/month + $1,200 insurance in December → $2,000 September, $3,200 December, $25,200 /year, $2,100 the average — the bill counted once', () => {
    const p = plan({ typed: 2000, fixed: 1100, everyday: 900, annual_bill: 1200, bill_months: [12] });
    const m = spendByMonth(p);
    expect([m[8], m[11], sum(m)]).toEqual([2000, 3200, 25200]);
    expect(plannedMonthlySpend(p)).toBe(2100);
    // the stored budget doc carries the average and the buckets that make it (1,100 + 100 + 900) — the same $2,100, not
    // $2,100 + a second $100; buildBudgetState takes it once. saveBudget / loadBudget have no caller, so it is never re-read
    // into monthlySpending, where it would be added again.
    const doc = budgetFromOnboarding(UID, p);
    expect([doc.monthly_spending, doc.fixed! + doc.non_monthly! + doc.flexible!]).toEqual([2100, 2100]);
    expect([doc.fixed, doc.non_monthly, doc.flexible]).toEqual([1100, 100, 900]);
    expect(doc.monthly_spending! * 12).toBe(25200);   // the year stored once: the December bill is in it once (2026-10-25, FIX-BUDGET)
    expect(buildBudgetState(UID, 5000, doc).projected_to_save).toBe(2900);
    // the budget editor plans each month the same way (budgetVsActual, MK-CF-F-014, FIXED 2026-10-25): $2,000 in September, $3,200 in December
    expect([budgetVsActual([], p, new Date(2026, 8, 15)).planned_total, budgetVsActual([], p, new Date(2026, 11, 15)).planned_total]).toEqual([2000, 3200]);
  });
});

// ── the Expenses tab ────────────────────────────────────────────────────────────────────────────────
describe('MK-CF-O-002 expenses — five cases', () => {
  kase('MK-CF-O-002-C01', 'AGREE', (c, put) => {
    const i = c.inputs;
    const e = expenses({ ym: '2026-10', debts: [debt({ name: 'Car loan', shape: 'instalment', payment: i.recurring_debt, debt_type: 'AUTO' })],
      plannedByCategory: [{ label: 'Planned', monthly: X(i.planned) }],
      expenses: [{ category: 'Other', store: 'Shop', date: '2026-10-10', amount: X(i.manual) }] });
    put({ recurringDebtTotal: e.recurringDebtTotal, plannedTotal: e.plannedTotal, actualTotal: e.actualTotal });
    close(e.recurringDebtTotal, c.expected.recurring_total); close(e.plannedTotal, c.expected.planned_total); close(e.actualTotal, c.expected.actual_total);
  });
  kase('MK-CF-O-002-C02', 'AGREE', (c, put) => {
    const i = c.inputs;
    const e = expenses({ ym: '2026-10', debts: [debt({ name: 'Car loan', shape: 'instalment', payment: i.recurring_debt, debt_type: 'AUTO' })],
      plannedByCategory: [{ label: 'Planned', monthly: X(i.planned) }], expenses: [] });
    put({ recurringDebtTotal: e.recurringDebtTotal, plannedTotal: e.plannedTotal, actualTotal: e.actualTotal });
    close(e.recurringDebtTotal, c.expected.recurring_total); close(e.plannedTotal, c.expected.planned_total); close(e.actualTotal, c.expected.actual_total);
  });
  /** the approved drawing's household, cash-flow_v01 frame C: 9 typed purchases ($500), 23 imported ($1,200), HELOC and card
   *  payments of $200 entered on the Debts tab */
  kase('MK-CF-O-002-C03', 'AGREE', (c, put) => {
    const i = c.inputs;
    const typed = [...Array(8).fill(50), 100].map((a, k) => ({ category: 'Other', store: `Shop ${k}`, date: `2026-10-${String(k + 1).padStart(2, '0')}`, amount: a }));
    const imported = [...Array(22).fill(50), 100].map((a, k) => ({ category: 'Other', store: `Card ${k}`, date: `2026-10-${String((k % 28) + 1).padStart(2, '0')}`, amount: a, origin: 'imported' as const }));
    const debts = [
      ...i.recurring_debts.map((d: any) => debt({ name: d.name, shape: 'instalment', payment: d.payment, debt_type: d.name === 'Mortgage' ? 'MORTGAGE' : 'AUTO' })),
      debt({ id: 'h', name: 'HELOC', debt_type: 'HELOC', required: 200 }),
      debt({ id: 'v', name: 'Credit card debt payment', debt_type: 'CREDIT_CARD', required: 200 }),
    ];
    const e = expenses({ ym: i.month, debts, expenses: [...typed, ...imported, paid('HELOC', i.heloc_paid, '2026-10-05'), paid('Credit card debt payment', i.card_paid, '2026-10-06')],
      plannedByCategory: Object.entries(i.planned_categories).map(([label, m]) => ({ label, monthly: X(m) })) });
    const got = { recurring_rows: e.recurringDebt.map((r) => r.monthly), recurring_total: e.recurringDebtTotal,
      planned_rows: e.planned.map((r) => r.monthly), planned_total: e.plannedTotal, nondebt_actual_rows: [e.byHand.total, e.imported.total],
      debt_expense_rows: e.debtCountedAsExpense.map((r) => r.amount), actual_total: e.actualTotal,
      counts: [e.byHand.items.length, e.imported.items.length], debt_labels: e.debtCountedAsExpense.map((r) => r.label) };
    put(got);
    expect(got.counts).toEqual([i.manual_count, i.imported_count]);
    (['recurring_rows', 'planned_rows', 'nondebt_actual_rows', 'debt_expense_rows'] as const).forEach((k) =>
      c.expected[k].forEach((x: any, n: number) => close((got as any)[k][n], x)));
    close(got.recurring_total, c.expected.recurring_total); close(got.planned_total, c.expected.planned_total); close(got.actual_total, c.expected.actual_total);
  });
  kase('MK-CF-O-002-C04', 'AGREE', (c, put) => {
    const i = c.inputs;
    const e = expenses({ ym: '2026-10', debts: [debt({ id: 'v', name: 'Visa', debt_type: 'CREDIT_CARD', required: 25 })], plannedByCategory: [],
      expenses: [{ category: 'Other', store: 'Shop', date: '2026-10-03', amount: X(i.manual) },
        { category: 'Other', store: 'Card', date: '2026-10-04', amount: X(i.imported), origin: 'imported' }, paid('Visa', i.card_paid)] },
    new Set(i.purchases_captured ? ['v'] : []));
    const got = { nondebt_actual: e.actual.total, card_payment_extra_expense: sum(e.debtCountedAsExpense.map((d) => d.amount)), actual_total: e.actualTotal };
    put(got);
    close(got.nondebt_actual, c.expected.nondebt_actual); close(got.card_payment_extra_expense, c.expected.card_payment_extra_expense); close(got.actual_total, c.expected.actual_total);
  }, 'no production caller marks a card captured today (theMonth hands the default empty set)');
  // APP WRONG: tenet 1 (one $250 payment counted twice) and tenet 4 (This month counts it once, the Expenses tab twice)
  kase('MK-CF-O-002-C05', 'AGREE', (c, put) => {
    const i = c.inputs;
    const ds = i.debts.map((d: any) => debt({ ...d, shape: 'revolving' }));
    const e = expenses({ ym: '2026-10', debts: ds, plannedByCategory: [], expenses: i.logged.map((l: any) => paid(l.payee, l.amount, l.date)) });
    put({ actualTotal: e.actualTotal, debtCountedAsExpense: e.debtCountedAsExpense });
    expect(c.expected.complete).toBe(false);
    close(e.actualTotal, c.expected.payment_counted_once);
  }, 'FIXED 2026-10-25 (FIX-MONTH): two debts named "Loan" — the $250 counted once, given to neither (DEC-1923)');
  test.failing('MK-CF-O-002-C05 the app until 2026-10-25, kept: the Expenses tab counts $500 (Loan payment $250 + " loan  payment" $250); This month\'s actual counts the $250 once, all against B', () => {
    const ds = [debt({ id: 'A', name: 'Loan', shape: 'revolving' }), debt({ id: 'B', name: ' loan ', shape: 'revolving' })];
    const s = { ym: '2026-10', debts: ds, plannedByCategory: [], expenses: [paid('Loan', 250)], takeHomeMonthly: 5000, plannedExpenses: 0 } as any;
    expect(expenses(s).actualTotal).toBe(500);
    expect(expenses(s).debtCountedAsExpense.map((d) => d.amount)).toEqual([250, 250]);
    expect([...debtPaymentsByDebt(s)]).toEqual([['B', 250]]);
    expect(actualMonthFlow(s).outflow).toBe(250);
  });
});

describe('MK-CF-F-149 recurringDebtPayments — five cases', () => {
  for (const n of [1, 2, 3, 4, 5]) {
    kase(`MK-CF-F-149-C0${n}`, 'AGREE', (c, put) => {
      const rows = recurringDebtPayments({ ym: c.inputs.month, debts: [debt(c.inputs.debt)], plannedByCategory: [], expenses: [] });
      put(rows);
      expect(rows.map((r) => r.label)).toEqual(c.expected.map((r: any) => r.name));
      c.expected.forEach((r: any, k: number) => close(rows[k].monthly, r.payment));
    });
  }
});

describe('MK-CF-F-150 debtPaymentsCountedAsExpenses — five cases', () => {
  const run = (c: any) => {
    const i = c.inputs;
    const ds = i.debts.map((d: any) => debt(d));
    const rows = debtPaymentsCountedAsExpenses({ ym: '2026-10', debts: ds, plannedByCategory: [], expenses: i.logs.map((l: any) => paid(l.payee, l.amount, l.date)) },
      new Set(i.purchases_captured ? ds.map((d: any) => String(d.debt_id)) : []));
    // a row is named "<debt> payment"; read it back to the debt it was counted for
    const byId: Record<string, number> = {};
    rows.forEach((r) => { const d = ds.find((x: any) => `${x.label} payment` === r.label || x.label === r.label); byId[d.debt_id] = r.amount; });
    return { rows, byId };
  };
  for (const n of [1, 2, 3, 4]) {
    kase(`MK-CF-F-150-C0${n}`, 'AGREE', (c, put) => {
      const { rows, byId } = run(c); put(rows);
      expect(Object.keys(byId).sort()).toEqual(Object.keys(c.expected).sort());
      Object.entries(c.expected).forEach(([id, v]) => close(byId[id], v));
    }, n === 4 ? 'no production caller marks a card captured today' : '');
  }
  // APP WRONG: tenets 1 and 3 — one logged $250 is given to both debts; the app has no debt id to tell them apart
  kase('MK-CF-F-150-C05', 'AGREE', (c, put) => {
    const { rows } = run(c); put(rows);
    expect(c.expected.state).toBe('REFUSES');
    // the payment is not given to both debts, and it is still accounted for once
    expect(rows.filter((r) => r.amount > 0).length).toBeLessThanOrEqual(1);
    expect(sum(rows.map((r) => r.amount))).toBeLessThanOrEqual(X(c.expected.unallocated_payment));
  }, 'FIXED 2026-10-25 (FIX-MONTH): one row, the $250 once — "two of your debts have that name — counted once"');
  test('MK-CF-F-150-C05 · the one row says why (FIXED 2026-10-25 (FIX-MONTH))', () => {
    const ds = [debt({ id: 'A', name: 'Loan', shape: 'revolving' }), debt({ id: 'B', name: ' loan ', shape: 'revolving' })];
    const s = { ym: '2026-10', debts: ds, plannedByCategory: [], expenses: [paid('Loan', 250)] };
    expect(debtPaymentsCountedAsExpenses(s)).toEqual([{ label: 'Loan payment', amount: 250, note: 'two of your debts have that name — counted once' }]);
    expect(radar(s).map((r) => [r.label, r.amount])).toEqual([['Loan payment', 250]]);
    // logged with the debt's id ("Log a payment" writes it since 2026-10-25): it is B's, and only B's
    expect(debtPaymentsCountedAsExpenses({ ...s, expenses: [{ ...paid('Loan', 250), debtId: 'B' }] })).toEqual([{ label: ' loan  payment', amount: 250 }]);
  });
  test.failing('MK-CF-F-150-C05 the app until 2026-10-25, kept: Loan payment $250 and " loan  payment" $250; the radar also lists both', () => {
    const ds = [debt({ id: 'A', name: 'Loan', shape: 'revolving' }), debt({ id: 'B', name: ' loan ', shape: 'revolving' })];
    const s = { ym: '2026-10', debts: ds, plannedByCategory: [], expenses: [paid('Loan', 250)] };
    expect(debtPaymentsCountedAsExpenses(s)).toEqual([{ label: 'Loan payment', amount: 250 }, { label: ' loan  payment', amount: 250 }]);
    expect(radar(s).map((r) => r.amount)).toEqual([250, 250]);
  });
});

describe('MK-CF-F-151 actualSpending — five cases', () => {
  for (const n of [1, 2, 3, 4, 5]) {
    kase(`MK-CF-F-151-C0${n}`, 'AGREE', (c, put) => {
      const i = c.inputs;
      const s = { ym: '2026-10', debts: [], plannedByCategory: [], expenses: i.expenses.map((e: any) =>
        ({ id: e.id, category: e.category, store: e.id, date: e.date, amount: X(e.amount), ...(e.source === 'imported' ? { origin: 'imported' } : {}) })) };
      const l = actualSpending(s as any, i.source_filter === 'manual' ? 'by-hand' : i.source_filter === 'imported' ? 'imported' : undefined);
      const got = { shown_ids: l.shown.map((e: any) => e.id), total: l.total, hidden_count: l.hidden, hidden_total: l.hiddenTotal };
      put(got);
      expect(got.shown_ids).toEqual(c.expected.shown_ids);
      close(got.total, c.expected.total); expect(got.hidden_count).toBe(X(c.expected.hidden_count)); close(got.hidden_total, c.expected.hidden_total);
    });
  }
});

describe('MK-CF-F-152 isRadarItem — five cases', () => {
  const WORD: Record<string, string> = { 'revolving-debt': 'revolving', 'lump-debt': 'lump_sum' };
  for (const n of [1, 2, 3, 4, 5]) {
    kase(`MK-CF-F-152-C0${n}`, 'AGREE', (c, put) => {
      const i = c.inputs;
      const r = isRadarItem({ debt_id: 'd', label: 'D', debt_type: KIND[i.kind], remaining_balance: 1000, interest_rate_apr: 0, minimum_monthly_payment: 50,
        ...(i.payment_type ? { payment_type: SHAPE[i.payment_type] } : {}) } as any);
      put(r);
      expect(r == null ? false : WORD[r]).toBe(c.expected);
    });
  }
});

describe('MK-CF-F-153 radar — five cases', () => {
  const run = (c: any) => {
    const i = c.inputs;
    const ds = (i.debts ?? []).map((d: any, k: number) => debt({ id: `d${k}`, ...d, debt_type: d.name === 'HELOC' ? 'HELOC' : d.shape === 'revolving' ? 'CREDIT_CARD' : d.shape === 'due_full' ? 'OTHER' : 'AUTO' }));
    const logs = (i.debts ?? []).filter((d: any) => d.paid != null && X(d.paid) > 0).map((d: any) => paid(d.name, d.paid));
    const captured = new Set<string>((i.debts ?? []).map((d: any, k: number) => (d.purchases_captured ? `d${k}` : '')).filter(Boolean));
    return radar({ ym: i.month ?? '2026-10', debts: ds, plannedByCategory: [], expenses: logs,
      bigBills: (i.big_bills ?? []).map((b: any) => ({ label: b.name, amount: X(b.amount), dueLabel: `due ${b.date}` })) }, captured);
  };
  const named = (r: any, name: string) => r.label === name || r.label === `${name} payment`;
  for (const n of [1, 2, 3, 4]) {
    kase(`MK-CF-F-153-C0${n}`, 'AGREE', (c, put) => {
      const out = run(c); put(out);
      expect(out).toHaveLength(c.expected.length);
      c.expected.forEach((e: any, k: number) => {
        expect(named(out[k], e.name)).toBe(true);
        close(out[k].amount, e.amount);
        if (e.counted_as_expense != null) expect(out[k].countedAsExpense).toBe(e.counted_as_expense);
      });
    }, n === 4 ? 'the Insurance big bill is an input no production caller hands' : '');
  }
  // OUTSIDE DOMAIN: no production caller hands bigBills — MK-CF-O-010 theMonth calls expenses(input), and that input comes
  // from MK-CF-F-227 thisMonthInputs, which builds none (src/hooks/useCashflowModel.ts). Recorded below, not dropped.
  // THE LEAD'S RULING, READING A (2026-10-25): the production door hands the radar the month's own dated bills (thisMonthInputs ←
  // datedBillsIn, the grid's one reader) — October's radar holds nothing for a December bill; December's holds it
  kase('MK-CF-F-153-C05', 'AGREE', (c, put) => {
    const i = c.inputs;
    const bill = i.big_bills[0];
    const profile = { status: 'employed', incomeSources: ['employment'], baseSalary: '5000', salaryMode: 'takehome', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '0',
      spendCats: [{ id: 'ins', label: bill.name, bucket: 'nonmonthly', unit: 'dollar', amount: String(X(bill.amount)), months: [Number(String(bill.date).slice(5, 7))], dueDay: Number(String(bill.date).slice(8, 10)) }] };
    jest.useFakeTimers({ now: new Date(`${i.month}-15T12:00:00`), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    try {
      const grid = datedGridOf(profile, [], 0);
      const door = (ym: string) => theMonth(thisMonthInputs({ grid, bva: null, profile, liabilities: [], expenses: [], ym })).expenses.radar;
      const oct = door(i.month), dec = door(String(bill.date).slice(0, 7));
      put({ production_door_radar: oct, december_radar: dec });
      expect(oct).toEqual(c.expected.readings.filtered);
      expect(dec.map((r) => [r.label, r.amount, r.note])).toEqual([[bill.name, X(bill.amount), 'due Dec 15']]);
    } finally { jest.useRealTimers(); }
  }, 'FIXED 2026-10-25 (FIX-MONTH): reading A, ruled — a bill on the radar in its own month only (DEC-0002)');
  test('MK-CF-F-153-C05 recorded: the function lists whatever bill it is handed (the "unfiltered" reading); the door hands it only the month\'s own (the "filtered" reading, ruled)', () => {
    const c = C('MK-CF-F-153-C05');
    const fn = run(c);
    expect(fn.map((r) => [r.label, r.amount])).toEqual([['Insurance', 1200]]);
    // until 2026-10-25 the input thisMonthInputs returned carried no bigBills at all (its own text); it now carries the month's
    // dated bills (datedBillsIn), so the radar is filtered by the door — the kase above holds that
    const hook = fs.readFileSync(path.join(__dirname, '../../../src/hooks/useCashflowModel.ts'), 'utf8');
    const body = hook.slice(hook.indexOf('export function thisMonthInputs('), hook.indexOf('export function useThisMonthInputs('));
    expect(body.length).toBeGreaterThan(500);
    expect(body).toMatch(/bigBills: datedBillsIn\(cell\)/);
  });
});

/** a $250 car loan in Debts, and a budget profile: the planned outflow This month deducts (theBudgetCounted → plannedMonthFlow) */
const carLoan = { outflow: (profile: any) => {
  const b = theBudgetCounted({ profile, accounts: [], debts: [debt({ id: 'car', name: 'Car loan', shape: 'instalment', payment: 250, debt_type: 'AUTO' })] });
  return plannedMonthFlow({ ym: '2026-10', takeHomeMonthly: 5000, debts: [debt({ id: 'car', name: 'Car loan', shape: 'instalment', payment: 250, debt_type: 'AUTO' })],
    plannedExpenses: spendByMonth(b.profile)[9], budgetSet: true, expenses: [] }).outflow;
} };
describe('MK-CF-O-020 theBudgetCounted — five cases', () => {
  const homeAcct = (id: string, primary: boolean) => ({ asset_id: id, label: `House ${id}`, kind: 'home', tax_bucket: 'PROPERTY', balance: 400000, ...(primary ? { re_use: 'primary' } : {}) }) as any;
  const mortgage = (label: string, propertyId: string, payment = 2400) =>
    ({ debt_id: `m-${label}`, label, debt_type: 'MORTGAGE', remaining_balance: 300000, interest_rate_apr: 0.06, minimum_monthly_payment: payment, property_id: propertyId }) as any;
  const budget = (rent: any, typed: any) => ({ monthlySpending: X(typed), spendCats: [{ id: 'rent', label: 'Rent / Mortgage', bucket: 'fixed', unit: 'dollar', amount: X(rent) }] });
  const counted = (c: any, put: (a: any) => void, accounts: any[], debts: any[]) => {
    const profile = budget(c.inputs.budget_rent_mortgage, c.inputs.typed_total);
    const b = theBudgetCounted({ profile, accounts, debts });
    const got = { counted_rent_mortgage: b.profile.spendCats.find((x: any) => x.id === 'rent').amount, counted_typed_total: Number(b.profile.monthlySpending),
      original_typed_total: profile.monthlySpending, original_rent: profile.spendCats[0].amount, named_mortgage: b.homeMortgage, sentence: b.sentence };
    put(got);
    close(got.counted_rent_mortgage, c.expected.counted_rent_mortgage); close(got.counted_typed_total, c.expected.counted_typed_total);
    if (c.expected.original_typed_total) close(got.original_typed_total, c.expected.original_typed_total);
    if (c.expected.named_mortgage) expect(got.named_mortgage).toBe(c.expected.named_mortgage);
    close(got.original_rent, c.inputs.budget_rent_mortgage);   // what the person typed is never rewritten
  };
  kase('MK-CF-O-020-C01', 'AGREE', (c, put) => counted(c, put, [homeAcct('A', true)], [mortgage(c.inputs.home_mortgage, 'A', c.inputs.debt_payment)]));
  kase('MK-CF-O-020-C02', 'AGREE', (c, put) => counted(c, put, [], []));
  kase('MK-CF-O-020-C03', 'AGREE', (c, put) => counted(c, put, [homeAcct('B', false), homeAcct('A', true)], [mortgage('Lake loan', 'B')]));
  kase('MK-CF-O-020-C04', 'AGREE', (c, put) => counted(c, put, [homeAcct('A', true)], [mortgage(c.inputs.home_mortgage, 'A')]));
  // APP WRONG — SETTLED BY DEC-1923: the reviewer wrote RULE UNCLEAR; his rule "Once user enters mortgage or any debt - the app
  // deduct it directly ... instead of leaving it for user to add it to planned expenses" says the $250 counts once, from Debts
  kase('MK-CF-O-020-C05', 'AGREE', (c, put) => {
    const profile = { spendCats: c.inputs.budget_categories.map((x: any) => ({ id: 'c-car', label: x.name, bucket: 'fixed', unit: 'dollar', amount: X(x.amount), custom: true })) };
    const out = carLoan.outflow(profile);
    put({ planned_outflow: out });
    expect(c.expected.state).toBe('RULE UNCLEAR');
    close(out, c.expected.readings.deduplicated_outflow);
  }, 'FIXED 2026-10-25 (FIX-MONTH), SETTLED BY DEC-1923: a budget line for a debt in Debts stands down — counted once');
  test('MK-CF-O-020-C05 · the line is said not counted (FIXED 2026-10-25 (FIX-MONTH))', () => {
    const b = theBudgetCounted({ profile: { spendCats: [{ id: 'c-car', label: 'Car loan', bucket: 'fixed', unit: 'dollar', amount: 250, custom: true }] }, accounts: [],
      debts: [debt({ id: 'car', name: 'Car loan', shape: 'instalment', payment: 250, debt_type: 'AUTO' })] });
    expect(b.sentence).toBe('Your Car loan budget line is not counted here: Car loan is in Debts and is counted from there.');
    expect(b.debtLinesInDebts).toEqual([{ label: 'Car loan', budgeted: 250, debt: 'Car loan' }]);
    expect(carLoan.outflow({ spendCats: [{ id: 'debt', label: 'Debt payment', bucket: 'fixed', unit: 'dollar', amount: 250 }] })).toBe(250);
  });
  test.failing('MK-CF-O-020-C05 the app until 2026-10-25, kept: planned outflow $500 for one $250 car loan — a custom "Car loan" line, and the budget\'s own "Debt payment" category (BUDGET_CATEGORIES id debt, offered in the budget editor), both stay counted', () => {
    expect(carLoan.outflow({ spendCats: [{ id: 'c-car', label: 'Car loan', bucket: 'fixed', unit: 'dollar', amount: 250, custom: true }] })).toBe(500);
    expect(carLoan.outflow({ spendCats: [{ id: 'debt', label: 'Debt payment', bucket: 'fixed', unit: 'dollar', amount: 250 }] })).toBe(500);
  });
});

// ── the reviewer's formula verdicts (WRONG / INCOMPLETE / CANNOT TELL) and the decisions it says are NOT HELD ──────
const VERDICTS_RAN: string[] = [];
const RULES_RAN: string[] = [];
describe('formula verdicts — what the code really does', () => {
  const v = (id: string, mark: Mark, title: string, fn: () => void) => {
    VERDICTS_RAN.push(id);
    (mark === 'APP WRONG' ? failing : test)(`${id} [${mark}] ${title}`, fn);
  };
  v('MK-CF-F-001', 'AGREE', 'FIXED 2026-10-25: refuse a projected saving until a budget is known (DEC-7939, tenet 3)', () => {
    const s = buildBudgetState(UID, 5000, budgetFromOnboarding(UID, {} as any));
    expect(s.projected_to_save == null || Number.isNaN(s.projected_to_save)).toBe(true);
  });
  failing('MK-CF-F-001 · the app until 2026-10-25, pinned: with no budget, $5,000 of take-home is $5,000 projected to save — no longer its answer (FIXED 2026-10-25)', () => {
    expect(buildBudgetState(UID, 5000, budgetFromOnboarding(UID, {} as any)).projected_to_save).toBe(5000);
  });
  v('MK-CF-O-002', 'AGREE', 'FIXED 2026-10-25 (FIX-MONTH) — one logged payment is never counted against two debts (the linked-card part is not live: no caller marks a card captured)', () => {
    const s = { ym: '2026-10', debts: [debt({ id: 'A', name: 'Loan', shape: 'revolving' }), debt({ id: 'B', name: 'Loan', shape: 'revolving' })], plannedByCategory: [], expenses: [paid('Loan', 250)] };
    expect(expenses(s).actualTotal).toBe(250);
  });
  v('MK-CF-F-150', 'AGREE', 'FIXED 2026-10-25 (FIX-MONTH) — a logged payment with two same-named debts is refused or counted once (no debt id is stored with a payment)', () => {
    const s = { ym: '2026-10', debts: [debt({ id: 'A', name: 'Loan', shape: 'revolving' }), debt({ id: 'B', name: 'LOAN ', shape: 'revolving' })], plannedByCategory: [], expenses: [paid('loan', 250)] };
    expect(sum(debtPaymentsCountedAsExpenses(s).map((r) => r.amount))).toBe(250);
  });
  v('MK-CF-F-153', 'AGREE', 'records fix (rule text): radar lists the bigBills its caller hands, with no date to filter on; until 2026-10-25 no production caller handed any; since then the door hands the month\'s own dated bills (FIX-MONTH, reading A ruled), so no future bill reaches this month\'s radar', () => {
    const s = { ym: '2026-10', debts: [], plannedByCategory: [], expenses: [], bigBills: [{ label: 'Insurance', amount: 1200, dueLabel: 'due Dec 15' }] };
    expect(radar(s).map((r) => r.label)).toEqual(['Insurance']);
    expect(radar({ ...s, bigBills: undefined }).length).toBe(0);
    // the radar never deducts: theMonth's planned surplus is plannedMonthFlow's, whatever the radar holds
    const m = { ym: '2026-10', takeHomeMonthly: 5000, debts: [], plannedExpenses: 1000, budgetSet: true, expenses: [], plannedByCategory: [] } as any;
    expect(theMonth({ ...m, bigBills: s.bigBills }).planned.surplus).toBe(theMonth(m).planned.surplus);
  });
  v('MK-CF-O-020', 'AGREE', 'FIXED 2026-10-25 (FIX-MONTH) — a debt in Debts that is also a budget line is counted once (DEC-1923 "any debt"); only the home\'s Rent / Mortgage line stands down today', () => {
    expect(carLoan.outflow({ spendCats: [{ id: 'debt', label: 'Debt payment', bucket: 'fixed', unit: 'dollar', amount: 250 }] })).toBe(250);
  });
  test('formula verdicts: every WRONG / INCOMPLETE / CANNOT TELL card of part 6 was classified', () => {
    const want = PART.formula_checks.filter((f: any) => f.verdict !== 'RIGHT').map((f: any) => f.id).sort();
    expect(PART.formula_checks.length).toBe(14);
    expect(want.length).toBeGreaterThanOrEqual(5);
    expect([...VERDICTS_RAN].sort()).toEqual(want);
  });
});

describe('decisions the reviewer says are NOT HELD', () => {
  const r = (id: string, mark: Mark, title: string, fn: () => void) => {
    RULES_RAN.push(id);
    (mark === 'APP WRONG' ? failing : test)(`${id} [${mark}] ${title}`, fn);
  };
  // DEC-2440's first claim (legacy cashflowYear omits debt) is MK-CF-F-020's, part 8 — measured there. Its second is O-020's.
  r('DEC-2440', 'AGREE', 'FIXED 2026-10-25 (FIX-MONTH) — every debt counted from Debts: a budget line that is a debt is not counted again (cashflowYear: part 8)', () => {
    expect(carLoan.outflow({ spendCats: [{ id: 'c-car', label: 'Car loan', bucket: 'fixed', unit: 'dollar', amount: 250, custom: true }] })).toBe(250);
  });
  const decBill = () => plan({ typed: 2000, fixed: 1100, everyday: 900, annual_bill: 1200, bill_months: [12] });
  const onceInAWhile = (month0: number) => budgetVsActual([], decBill(), new Date(2026, month0, 15)).buckets.find((b) => b.key === 'nonmonthly')!.planned;
  r('DEC-7611', 'AGREE', 'FIXED 2026-10-25: the budget editor\'s bucket cards plan the month: September once in a while $0, December $1,200 (budgetVsActual read the average)', () => {
    expect([onceInAWhile(8), onceInAWhile(11)]).toEqual([0, 1200]);
  });
  r('DEC-7951', 'AGREE', 'FIXED 2026-10-25: a bill with its own month counts in that month: December\'s planned total $3,200 on every reader (budgetVsActual gave $2,100)', () => {
    expect(budgetVsActual([], decBill(), new Date(2026, 11, 15)).planned_total).toBe(3200);
    expect(budgetVsActual([], decBill(), new Date(2026, 8, 15)).planned_total).toBe(spendByMonth(decBill())[8]);
  });
  failing('DEC-7611 / DEC-7951 · the app until 2026-10-25, pinned: budgetVsActual plans once in a while $100 in September and in December, total $2,100 — while This month and the Expenses tab read $2,000 / $3,200 — no longer its answer (FIXED 2026-10-25)', () => {
    expect([onceInAWhile(8), onceInAWhile(11)]).toEqual([100, 100]);
    expect(budgetVsActual([], decBill(), new Date(2026, 11, 15)).planned_total).toBe(2100);
    expect([spendByMonth(decBill())[8], spendByMonth(decBill())[11]]).toEqual([2000, 3200]);
    // the budget editor ("Your budget", CashFlowScreen BudgetEditor → BudgetScreen embedded initialTab="Budget") prints each
    // bucket card as "spent / planned" from budgetVsActual's buckets
    const screen = fs.readFileSync(path.join(__dirname, '../../../src/screens/BudgetScreen.tsx'), 'utf8');
    // (another agent was editing this screen during the run: the profile it hands changed from op to the counted one)
    expect(screen).toMatch(/const bva = budgetVsActual\(expenses, [\w.]+, new Date\(\)\)/);
    expect(screen).toMatch(/Math\.round\(ba\.planned\)/);
  });
  test('rules: every NOT HELD decision of part 6 was classified, and every rules_held line was seen', () => {
    expect(PART.rules_held.length).toBe(7);
    const notHeld = PART.rules_held.filter((x: any) => x.verdict === 'NOT HELD').map((x: any) => x.rule).sort();
    expect([...RULES_RAN].sort()).toEqual(notHeld);
    const seen = new Set(PART.rules_held.map((x: any) => x.verdict));
    for (const s of seen) expect(['NOT HELD', 'CANNOT TELL', 'HELD']).toContain(s);
  });
});

// ── a guard must prove it looked ────────────────────────────────────────────────────────────────────
test('coverage: every one of part 6\'s cases was run exactly once', () => {
  const ids = PART.cases.map((c: any) => c.case_id);
  expect(ids.length).toBe(70);
  expect(RAN.length).toBe(ids.length);
  expect(new Set(RAN).size).toBe(RAN.length);
  expect([...RAN].sort()).toEqual([...ids].sort());
});
