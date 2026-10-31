/* THE OUTSIDE CASES, RUN AGAINST THE APP — Cash flow module, OpenAI package of 2026-10-24, PART 7 of 19.
 * "Essentials, savings by month, budget against spent."
 * Cards (ID first, name in brackets): MK-CF-F-006 (allocatableThisMonth) · MK-CF-F-007 (nonMonthlyBasis) · MK-CF-F-009
 * (monthlyEssentials) · MK-CF-F-010 (emergencyTest) · MK-CF-F-011 (savingsByMonth) · MK-CF-F-012 (annualCashflow) ·
 * MK-CF-F-013 (budgetFromOnboarding) · MK-CF-F-014 (budgetVsActual) · MK-CF-F-017 (publishSurplus) · MK-CF-F-191 (ym) ·
 * MK-CF-F-189 (essentialsFromLoggedSpending) · MK-CF-F-190 (essentialsMonthly).
 * This file's share: part 7's 60 cases, its 4 formula verdicts that are not RIGHT (F-009, F-010, F-013, F-014) and its
 * 2 rules NOT HELD (DEC-7611, DEC-7951). The HELD rule (DEC-0251) and the three CANNOT TELL rules (DEC-0007, DEC-0260,
 * DEC-0493) are recorded in the results file, not tested here.
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/
 * MoneyKeel_CashFlow_Independent_Audit/audit_results/MoneyKeel_CashFlow_Audit_Part_07.json. Every expected answer is READ
 * FROM THE PACKAGE (C(case_id).expected), never retyped; only plain input names are mapped onto the app's fields.
 * Results, case by case: MoneyKeel/documents/audit/outside-test-cases/returned/results/cashflow_openai_part07_results.json
 *
 * MEASURED ONLY (2026-10-25, CFR-2 part 7): no app code, record, drawing or existing test was changed.
 * FIXED 2026-10-25 (FIX-BUDGET) — MK-CF-F-010-C05, MK-CF-F-013-C02, MK-CF-F-014-C02..C05, the F-010 / F-013 / F-014 verdicts and
 * DEC-7611 / DEC-7951 flipped the file's own way: the case passes on the reviewer's answer, marked AGREE with "FIXED 2026-10-25"
 * in its name, and the app's old answer ("app today") is kept beside it as test.failing ("the app until 2026-10-25, pinned"). Measured on the
 * working tree, which carries another agent's uncommitted CF-21 edits (2026-10-25) to budgetVsActual's SPENT side (each
 * expense read on its local day, a per-category list) and to essentials.ts (localDay) — neither touches a planned figure.
 *
 * Markers: AGREE → test on the reviewer's answer · APP WRONG → test.failing on the reviewer's answer (turns red when fixed)
 * plus a twin pinning what the app gives today ("app today") · REVIEWER WRONG → test.failing on the reviewer's answer plus a
 * plain test pinning the app's answer with the decision in its name · NEEDS RULING → the app's answer pinned · BLOCKED /
 * OUTSIDE DOMAIN → test.skip with the reason.
 *
 * INPUT NAMES MAPPED (the app's fields, never the answers):
 *   surplus / allocated_this_month → allocatableThisMonth(surplus, allocatedThisMonth) (GoalsScreen.tsx:62 calls it).
 *   nonmonthly_rows {kind, amount} → op.spendCats [{ bucket:'nonmonthly', unit: 'pct' | 'dollar', amount }]; percent_basis →
 *     allPct, shown_percent → pct (GoalsScreen.tsx:46).
 *   categories {monthly, need} → op.spendCats [{ bucket:'fixed' (needs) | 'flexible' (flexible), tier: 'critical' | 'important'
 *     | 'flex', amount }]; typed_monthly / planned_monthly_average → op.monthlySpending (the one number onboarding writes,
 *     modules.tsx 'monthlySpending'); a dated annual bill → a 'nonmonthly' category with months [bill_month]; "no categories"
 *     → no spendCats at all.
 *   emergencyTest cash / shock / essentials → emergencyTest(null, cash, shock, essentials); cash_after → cashAfter,
 *     months_after → runwayAfter, months_before → jobLossRunway, covers → coversIt, recommended → recommendedFund,
 *     gap → gapToFund. Its one production caller is MK-NW-O-004 theEmergencyFund (emergency-fund.ts:242).
 *   savingsByMonth take_home[12] / expenses[12] and annualCashflow gross / tax / employee_k / planned_expenses: the two
 *     functions' OWN SOURCE TEXT (src/domain/budget/index.ts) is compiled with their two producers handed in under their own
 *     names — incomeMonthlyGrid(op, kind) returning the twelve given months, spendByMonth(op) the twelve given expenses —
 *     because the reviewer gives the producers' outputs as the inputs. annualCashflow's year is twelve equal income rows and
 *     an expense year with a tenth of it as a December bill (its note: "an annual expense in December to test roll-up").
 *     gross → grossYr, after_tax → netYr, take_home → availableYr, expenses → spendYr, tax → taxYr, k → k401Yr, saved → saveYr.
 *   budgetFromOnboarding monthly_spending / fixed / flexible / annual_bill → op.monthlySpending, a 'fixed' and a 'flexible'
 *     category, a 'nonmonthly' bill with months [bill_month] (the categories onboarding's SpendingEditor writes; the legacy
 *     b_fixed / b_flexible fields have no writer left and are probed separately below); recurring_base → doc.fixed +
 *     doc.flexible (the stored every-month parts), annual_average → doc.monthly_spending, annual_total → doc.monthly_spending
 *     × 12 (no reader re-reads a stored doc: saveBudget and loadBudget have no callers — the doc goes straight from
 *     buildSnapshot into buildBudgetState, snapshot.ts:143).
 *   budgetVsActual requested_month / recurring_plan / annual_bill / bill_month / actual_non_debt → now = the 15th of that
 *     month in 2026; op.spendCats [a 'fixed' category of recurring_plan, a 'nonmonthly' bill with months [bill_month]];
 *     one logged 'Groceries' expense of actual_non_debt on the 10th; planned → planned_total, spent → spent_total,
 *     remaining → remaining. Production: BudgetScreen.tsx (`const bva = budgetVsActual(…)`; its planned side is printed in the
 *     "Expenses by bucket" header `fig('MK-CF-M-015', … ba.planned)` of the budget editor the Cash flow tab opens —
 *     CashFlowScreen.tsx BudgetEditor), HomeScreen.tsx and CashFlowScreen.tsx (spent_total only).
 *   publishSurplus supplied_result → its projectedToSave argument; the answer is the payload it emits on the app's event bus
 *     (SURPLUS_CALCULATED), read with the bus's own on(). No production code calls publishSurplus.
 *   ym local_timestamp → the person's device is IN that offset: ym's own source text (essentials.ts) is run in a child node
 *     process whose TZ is that zone, on new Date(local_timestamp). (Jest's sandbox cannot change its own zone.)
 *   logged_month_totals {YYYY-MM: amount} → one logged expense per month on the 15th; typed_fallback → essentialsMonthly's
 *     typed argument (null → 0, the number its caller hands in when nothing is typed); as_of → now = 2026-10-24 12:00 local.
 * TOLERANCES: money to 1e-6 dollars (toBeCloseTo …, 6), months and rates to 1e-9; strings exact. REFUSES = no number
 * (null / undefined), never 0. "shown" strings are screen formatting and are not asserted.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { execFileSync } from 'child_process';
import {
  allocatableThisMonth, nonMonthlyBasis, monthlyEssentials, emergencyTest, budgetFromOnboarding, budgetVsActual,
  publishSurplus, SURPLUS_CALCULATED, spendByMonth, spendByMonthByBucket, plannedMonthlySpend, spendBuckets,
} from '../../../src/domain/budget';
import { on } from '../../../src/domain/_shared/eventBus';
import { essentialsFromLoggedSpending, essentialsMonthly } from './essentials';
import { theEmergencyFund } from '../networth-and-performance/emergency-fund';

// ── the package, read as it came ────────────────────────────────────────────────────────────────────
type Mark = 'AGREE' | 'APP WRONG' | 'REVIEWER WRONG' | 'NEEDS RULING' | 'BLOCKED' | 'OUTSIDE DOMAIN';
const PKG = path.join(__dirname, '../../documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/MoneyKeel_CashFlow_Independent_Audit/audit_results');
const PART = JSON.parse(fs.readFileSync(path.join(PKG, 'MoneyKeel_CashFlow_Audit_Part_07.json'), 'utf8'));
const C = (caseId: string): any => {
  const c = PART.cases.find((x: any) => x.case_id === caseId);
  if (!c) throw new Error(`no case ${caseId} in the package`);
  return c;
};
const RAN: string[] = [];
const runner = (mark: Mark) => (mark === 'APP WRONG' || mark === 'REVIEWER WRONG' ? test.failing : mark === 'BLOCKED' || mark === 'OUTSIDE DOMAIN' ? test.skip : test);
const kase = (caseId: string, mark: Mark, fn: (c: any) => void, note = '') => {
  RAN.push(caseId);
  const c = C(caseId);
  runner(mark)(`${caseId} · ${c.kind} · ${c.title} [${mark}]${note ? ` — ${note}` : ''}`, () => fn(c));
};
/** a twin: the app's answer today, pinned (plain test) */
const today = (caseId: string, what: string, fn: (c: any) => void) => test(`${caseId} · app today — ${what}`, () => fn(C(caseId)));
/** once fixed, the app's OLD answer is kept as test.failing — never deleted (2026-10-25, FIX-BUDGET) */
const was = (caseId: string, what: string, fn: (c: any) => void) =>
  test.failing(`${caseId} · the app until 2026-10-25, pinned: ${what} — no longer its answer (FIXED 2026-10-25)`, () => fn(C(caseId)));

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
const ratio = (got: number, want: any) => expect(got).toBeCloseTo(X(want), 9);
const refuses = (v: unknown) => expect(v == null).toBe(true);
const N = (v: any) => (v == null ? 0 : Number(v));

/** compile a function from its own source text in src/domain/budget/index.ts, its producers handed in under their names */
const BUDGET_SRC = fs.readFileSync(path.join(__dirname, '../../../src/domain/budget/index.ts'), 'utf8');
const compileBudgetFn = (name: string, producers: Record<string, unknown>) => {
  const at = BUDGET_SRC.search(new RegExp(`export function ${name}\\(`));
  if (at < 0) throw new Error(`${name} not found in src/domain/budget/index.ts`);
  const code = BUDGET_SRC.slice(at, BUDGET_SRC.indexOf('\n}\n', at) + 3).replace(/^export /, '');
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText;
  return new Function(...Object.keys(producers), `${js}\nreturn ${name};`)(...Object.values(producers));
};
/** ym's own source text, from essentials.ts */
const ESS_SRC = fs.readFileSync(path.join(__dirname, 'essentials.ts'), 'utf8');
const YM_TEXT = (() => {
  const at = ESS_SRC.search(/const ym = \(d: Date\)/);
  if (at < 0) throw new Error('ym not found in essentials.ts');
  return ts.transpileModule(ESS_SRC.slice(at, ESS_SRC.indexOf(';\n', at) + 2), { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText;
})();
/** the zone a device with that offset is in (POSIX Etc/GMT signs are inverted) */
const ZONE: Record<string, string> = { '-08:00': 'Etc/GMT+8', '+14:00': 'Etc/GMT-14', '-10:00': 'Etc/GMT+10', '+05:30': 'Asia/Kolkata' };
const ymOnDevice = (stamp: string): string => {
  const off = stamp.slice(-6);
  const tz = ZONE[off];
  if (!tz) throw new Error(`no zone mapped for offset ${off}`);
  return execFileSync(process.execPath, ['-e', `${YM_TEXT}\nprocess.stdout.write(ym(new Date(${JSON.stringify(stamp)})))`],
    { env: { ...process.env, TZ: tz } }).toString();
};

const AS_OF = new Date(2026, 9, 24, 12, 0, 0);   // 2026-10-24, the package's as_of, local noon
const logs = (byMonth: Record<string, any>) => Object.entries(byMonth).map(([m, amount]) => ({ amount: Number(amount), date: `${m}-15`, category: 'Groceries' }));

/** categories → spendCats */
const tierOf = (need: string) => (need === 'critical' ? 'critical' : need === 'important' ? 'important' : 'flex');
const catsOf = (rows: { monthly: any; need: string }[]) => rows.map((r, i) => ({
  id: `c${i}`, label: `Category ${i + 1}`, amount: Number(r.monthly), unit: 'dollar',
  bucket: r.need === 'flexible' ? 'flexible' : 'fixed', tier: tierOf(r.need),
}));
const bill = (amount: any, month: number) => ({ id: 'bill', label: 'Insurance', amount: Number(amount), unit: 'dollar', bucket: 'nonmonthly', months: [month], tier: 'critical' });

/** the budget for budgetVsActual's cases: a recurring category and a dated once-a-year bill */
const planOf = (i: any) => ({
  spendCats: [
    ...(N(i.recurring_plan) > 0 ? [{ id: 'rent', label: 'Rent / Mortgage', amount: N(i.recurring_plan), unit: 'dollar', bucket: 'fixed', tier: 'critical' }] : []),
    ...(N(i.annual_bill) > 0 ? [bill(i.annual_bill, i.bill_month)] : []),
  ],
} as any);
const bvaOf = (i: any) => budgetVsActual(
  N(i.actual_non_debt) > 0 ? [{ amount: N(i.actual_non_debt), category: 'Groceries', date: `2026-${String(i.requested_month).padStart(2, '0')}-10` }] : [],
  planOf(i), new Date(2026, i.requested_month - 1, 15, 12));

/** budgetFromOnboarding's household: the typed total, a fixed and a flexible category, a dated bill */
const storedOf = (i: any) => {
  const cats: any[] = [];
  if (N(i.fixed) > 0) cats.push({ id: 'f', label: 'Bills', amount: N(i.fixed), unit: 'dollar', bucket: 'fixed', tier: 'critical' });
  if (N(i.flexible) > 0) cats.push({ id: 'x', label: 'Everyday', amount: N(i.flexible), unit: 'dollar', bucket: 'flexible', tier: 'flex' });
  if (N(i.annual_bill) > 0) cats.push(bill(i.annual_bill, i.bill_month ?? 12));
  const op: any = { monthlySpending: N(i.monthly_spending) };
  if (cats.length) op.spendCats = cats;
  return budgetFromOnboarding('u1' as any, op);
};

// ═══ MK-CF-F-006 allocatableThisMonth ════════════════════════════════════════════════════════════════
describe('MK-CF-F-006 allocatableThisMonth — five cases', () => {
  const run = (c: any) => money(allocatableThisMonth(X(c.inputs.surplus), X(c.inputs.allocated_this_month)), c.expected);
  for (const id of ['C01', 'C02', 'C03', 'C04', 'C05']) kase(`MK-CF-F-006-${id}`, 'AGREE', run);
});

// ═══ MK-CF-F-007 nonMonthlyBasis ═════════════════════════════════════════════════════════════════════
describe('MK-CF-F-007 nonMonthlyBasis — five cases', () => {
  const run = (c: any) => {
    const op: any = { spendCats: c.inputs.nonmonthly_rows.map((r: any, i: number) => ({ id: `n${i}`, label: `N${i}`, bucket: 'nonmonthly', unit: r.kind === 'percent' ? 'pct' : 'dollar', amount: String(r.amount) })) };
    const got = nonMonthlyBasis(op);
    expect(got.allPct).toBe(c.expected.percent_basis);
    expect(got.pct).toBe(X(c.expected.shown_percent));
  };
  for (const id of ['C01', 'C02', 'C04', 'C05']) kase(`MK-CF-F-007-${id}`, 'AGREE', run);
  // REVIEWER WRONG since 2026-10-26 (CLEANUP-LEFT; his Q49, the precision standard): the reviewer's own working says
  // "7.3 + 8.4 + 1.9 = 17.6%; label rounds to 18%" and takes the label's 18 as the exact value. Nothing rounds inside a function:
  // the share is 17.6, and the screen prints it to two decimals, "17.60% of take-home pay" (Goals, goals_v01 row of 2026-10-26)
  kase('MK-CF-F-007-C03', 'REVIEWER WRONG', run, 'settled by Q49 — the share is kept whole and printed 17.60%');
  test('MK-CF-F-007-C03 · app right by Q49 — 7.3 + 8.4 + 1.9 = 17.6, kept whole (FIXED 2026-10-26)', () => {
    const c = C('MK-CF-F-007-C03');
    const op: any = { spendCats: c.inputs.nonmonthly_rows.map((r: any, i: number) => ({ id: `n${i}`, label: `N${i}`, bucket: 'nonmonthly', unit: 'pct', amount: String(r.amount) })) };
    expect(nonMonthlyBasis(op)).toEqual({ allPct: true, pct: expect.closeTo(17.6, 9) });
  });
  was('MK-CF-F-007-C03', 'the share rounded to a whole percent inside the function, 18', (c) => run(c));
});

// ═══ MK-CF-F-009 monthlyEssentials ═══════════════════════════════════════════════════════════════════
describe('MK-CF-F-009 monthlyEssentials — five cases', () => {
  kase('MK-CF-F-009-C01', 'AGREE', (c) => money(monthlyEssentials({ monthlySpending: N(c.inputs.typed_monthly), spendCats: catsOf(c.inputs.categories) } as any), c.expected));
  // REVIEWER WRONG: the reviewer writes RULE UNCLEAR for the no-category fallback; his DEC-0251 settles it — "The typed plan
  // is the fallback for someone who has logged nothing" — and the door labels it "you entered" (essentials.ts:163). The
  // lead's DEC-7951 names the must-pay figure of a household with no monthly category as its typed $2,000.
  kase('MK-CF-F-009-C02', 'REVIEWER WRONG', (c) => {
    const got: any = monthlyEssentials({ monthlySpending: X(c.inputs.planned_monthly_average) } as any);
    expect(typeof got).not.toBe('number');   // the reviewer's answer: no number until the rule is settled
  }, 'settled by DEC-0251');
  test('MK-CF-F-009-C02 · app right by DEC-0251 (typed plan is the fallback) and DEC-7951 — no categories: the planned $2,000, labelled "you entered" at the door', () => {
    const c = C('MK-CF-F-009-C02');
    const op: any = { monthlySpending: X(c.inputs.planned_monthly_average) };
    money(monthlyEssentials(op), c.expected.readings.planned_spend_estimate);
    money(monthlyEssentials(op), c.formula_gives);
    const door = theEmergencyFund({ accounts: [], expenses: [], profile: op, debts: [] });
    expect(door.essentialsMonthly).toBeCloseTo(2000, 6);
    expect(door.essentialsBasis).toBe('you entered');
  });
  kase('MK-CF-F-009-C03', 'AGREE', (c) => money(monthlyEssentials({ monthlySpending: X(c.inputs.typed_monthly), spendCats: catsOf(c.inputs.categories) } as any), c.expected));
  kase('MK-CF-F-009-C04', 'AGREE', (c) => {
    const i = c.inputs;
    const op: any = { monthlySpending: X(i.typed_monthly), spendCats: [...catsOf([{ monthly: i.monthly_need, need: 'critical' }, { monthly: i.monthly_flexible, need: 'flexible' }]), bill(i.annual_bill.amount, i.annual_bill.month)] };
    money(monthlyEssentials(op), c.expected);
  });
  kase('MK-CF-F-009-C05', 'AGREE', (c) => money(monthlyEssentials({ monthlySpending: N(c.inputs.typed_monthly), spendCats: catsOf(c.inputs.categories) } as any), c.expected));
});

// ═══ MK-CF-F-010 emergencyTest ═══════════════════════════════════════════════════════════════════════
describe('MK-CF-F-010 emergencyTest — five cases', () => {
  const run = (c: any) => {
    const t = emergencyTest(null, X(c.inputs.cash), X(c.inputs.shock), X(c.inputs.essentials));
    const e = c.expected;
    money(t.cashAfter, e.cash_after);
    ratio(t.runwayAfter as number, e.months_after);
    ratio(t.jobLossRunway as number, e.months_before);
    expect(t.coversIt).toBe(e.covers);
    money(t.recommendedFund as number, e.recommended);
    money(t.gapToFund as number, e.gap);
  };
  for (const id of ['C01', 'C02', 'C03', 'C04']) kase(`MK-CF-F-010-${id}`, 'AGREE', run);
  // FIXED 2026-10-25 (FIX-BUDGET; tenets 1 and 3, and the app's own door): $0 of essentials a month gives no count of months —
  // cash ÷ 0 has no finite answer — and no target; emergencyTest returned 0 months both ways. The door it serves already refused
  // (emergency-fund.ts: "never divided by nothing … there is no count of months to state", monthsAfter null) — now both agree.
  kase('MK-CF-F-010-C05', 'AGREE', (c) => {
    const t = emergencyTest(null, X(c.inputs.cash), X(c.inputs.shock), X(c.inputs.essentials));
    refuses(t.runwayAfter);
    refuses(t.jobLossRunway);
    refuses(t.recommendedFund); refuses(t.gapToFund);   // a $0 target is no fund, never "no gap" (the Stress test read it as covered)
    expect(t.cashAfter).toBe(5000); expect(t.coversIt).toBe(true);   // the hit itself is a real answer and stands
  }, 'FIXED 2026-10-25: no months and no target with $0 of essentials (it read 0 months, a $0 fund and no gap)');
  was('MK-CF-F-010-C05', '$0 essentials gives 0 months after the hit and 0 months before it (the formula\'s own "Both are 0")', (c) => {
    const t = emergencyTest(null, X(c.inputs.cash), X(c.inputs.shock), X(c.inputs.essentials));
    expect(t.runwayAfter).toBe(0); expect(t.jobLossRunway).toBe(0);
    expect(t.coversIt).toBe(true); expect(t.recommendedFund).toBe(0); expect(t.gapToFund).toBe(0);
    expect(t.runwayAfter).toBe(X(c.formula_gives.months_after));
  });
});

// ═══ MK-CF-F-011 savingsByMonth ══════════════════════════════════════════════════════════════════════
describe('MK-CF-F-011 savingsByMonth — five cases (its own text, its two producers handed in)', () => {
  const run = (c: any) => {
    const takeHome = c.inputs.take_home.map((v: any, i: number) => ({ label: `M${i + 1}`, amount: Number(v) }));
    const fn = compileBudgetFn('savingsByMonth', {
      incomeMonthlyGrid: (_op: any, kind: string) => { expect(kind).toBe('available'); return takeHome; },
      spendByMonth: () => c.inputs.expenses.map(Number),
    });
    const got: { amount: number }[] = fn({});
    expect(got).toHaveLength(12);
    got.forEach((m, i) => money(m.amount, c.expected[i]));
  };
  for (const id of ['C01', 'C02', 'C03', 'C04', 'C05']) kase(`MK-CF-F-011-${id}`, 'AGREE', run);
});

// ═══ MK-CF-F-012 annualCashflow ══════════════════════════════════════════════════════════════════════
describe('MK-CF-F-012 annualCashflow — five cases (its own text, its two producers handed in)', () => {
  const run = (c: any) => {
    const g = X(c.inputs.gross), tax = X(c.inputs.tax), k = X(c.inputs.employee_k), sp = X(c.inputs.planned_expenses);
    const grid = (yr: number) => Array.from({ length: 12 }, (_, i) => ({ label: `M${i + 1}`, amount: yr / 12 }));
    const spend = Array.from({ length: 12 }, (_, i) => (sp * 0.9) / 12 + (i === 11 ? sp * 0.1 : 0));   // a December bill
    const fn = compileBudgetFn('annualCashflow', {
      incomeMonthlyGrid: (_op: any, kind: string) => (kind === 'gross' ? grid(g) : kind === 'net' ? grid(g - tax) : grid(g - tax - k)),
      spendByMonth: () => spend,
    });
    const got = fn({});
    const e = c.expected;
    money(got.grossYr, e.gross); money(got.netYr, e.after_tax); money(got.availableYr, e.take_home);
    money(got.spendYr, e.expenses); money(got.taxYr, e.tax); money(got.k401Yr, e.k); money(got.saveYr, e.saved);
  };
  for (const id of ['C01', 'C02', 'C03', 'C04', 'C05']) kase(`MK-CF-F-012-${id}`, 'AGREE', run);
});

// ═══ MK-CF-F-013 budgetFromOnboarding ════════════════════════════════════════════════════════════════
describe('MK-CF-F-013 budgetFromOnboarding — five cases', () => {
  kase('MK-CF-F-013-C01', 'AGREE', (c) => {
    const d = storedOf(c.inputs);
    money(d.fixed! + d.flexible!, c.expected.recurring_base);
    money(d.monthly_spending!, c.expected.annual_average);
  });
  // APP WRONG (tenet 3, "Unknown is not zero"): with no expense plan at all the stored budget is $0 of expenses, the same
  // as a confirmed $0 plan (C05), and buildBudgetState then calls the whole take-home "projected to save" (MK-CF-F-001,
  // part 6's same finding). It reaches no screen today: buildSnapshot's budget feeds only goal capacity and the retirement
  // spend fallback inside the snapshot, and Home reads the snapshot's net worth alone (HomeScreen.tsx `snap.networth`).
  kase('MK-CF-F-013-C02', 'AGREE', () => {
    const d: any = budgetFromOnboarding('u1' as any, null);
    refuses(d?.monthly_spending);
    refuses(d?.fixed); refuses(d?.non_monthly); refuses(d?.flexible);
    // and a typed $0 plan is still a $0 plan (C05), so the two are told apart
    expect(budgetFromOnboarding('u1' as any, { monthlySpending: 0 } as any).monthly_spending).toBe(0);
  }, 'FIXED 2026-10-25: no plan entered is stored as no plan (it was a $0 plan; tenet 3)');
  was('MK-CF-F-013-C02', 'no plan at all is stored as $0 of expenses, identical to a confirmed $0 plan', () => {
    const none = budgetFromOnboarding('u1' as any, null);
    const zero = budgetFromOnboarding('u1' as any, { monthlySpending: 0 } as any);
    expect(none).toEqual(zero);
    expect(none.monthly_spending).toBe(0);
  });
  // AGREE on the reviewer's three numbers. Its formula_gives "RULE UNCLEAR — if re-added, 1,831.19 counted twice" is not
  // reachable: nothing re-reads a stored budget (saveBudget and loadBudget have no callers; buildBudgetState reads only
  // monthly_spending, once, as the monthly average).
  kase('MK-CF-F-013-C03', 'AGREE', (c) => {
    const d = storedOf(c.inputs);
    money(d.fixed! + d.flexible!, c.expected.recurring_base);
    money(d.monthly_spending!, c.expected.annual_average);
    money(d.monthly_spending! * 12, c.expected.annual_total);
    money(d.fixed! + d.non_monthly! + d.flexible!, c.expected.annual_average);   // the parts add up to the total (2026-10-25, FIX-BUDGET)
  });
  kase('MK-CF-F-013-C04', 'AGREE', (c) => {
    const d = storedOf(c.inputs);
    money(d.fixed! + d.flexible!, c.expected.recurring_base);
    money(d.monthly_spending!, c.expected.annual_average);
    money(d.monthly_spending! * 12, c.expected.annual_total);
    money(d.fixed! + d.non_monthly! + d.flexible!, c.expected.annual_average);   // the parts add up to the total (2026-10-25, FIX-BUDGET)
  });
  kase('MK-CF-F-013-C05', 'AGREE', (c) => {
    const d = storedOf(c.inputs);
    money(d.fixed! + d.flexible!, c.expected.recurring_base);
    money(d.monthly_spending!, c.expected.annual_average);
  });
});

// ═══ MK-CF-F-014 budgetVsActual ══════════════════════════════════════════════════════════════════════
describe('MK-CF-F-014 budgetVsActual — five cases', () => {
  const run = (c: any) => {
    const b = bvaOf(c.inputs);
    money(b.planned_total, c.expected.planned);
    money(b.spent_total, c.expected.spent);
    money(b.remaining, c.expected.remaining);
  };
  kase('MK-CF-F-014-C01', 'AGREE', run);
  // FIXED 2026-10-25 (FIX-BUDGET; DEC-7611, DEC-7951, tenet 4): the month's plan is the dated one — This month and the Expenses
  // tab read it from spendByMonthByBucket (useCashflowModel.ts thisMonthInputs) — and budgetVsActual's planned side now reads it
  // too; it was spendBuckets' monthly average. The budget editor's "Expenses by bucket" header prints it as "spent / planned".
  for (const id of ['C02', 'C03', 'C04', 'C05']) kase(`MK-CF-F-014-${id}`, 'AGREE', (c) => {
    run(c);
    // one month, one plan: the same month on the month table (tenet 4)
    const dated = spendByMonthByBucket(planOf(c.inputs))[c.inputs.requested_month - 1];
    money(bvaOf(c.inputs).planned_total, dated.fixed + dated.nonmonthly + dated.flexible);
  }, 'FIXED 2026-10-25: the month\'s own plan (it read the year\'s average)');
  for (const id of ['C02', 'C03', 'C04', 'C05']) {
    was(`MK-CF-F-014-${id}`, 'planned = the average (recurring + bill ÷ 12) in every month, the reviewer\'s formula_gives', (c) => {
      const b = bvaOf(c.inputs);
      money(b.planned_total, c.formula_gives.planned);
      money(b.remaining, c.formula_gives.remaining);
      // the dated plan the rest of the tab uses for the same month
      const dated = spendByMonthByBucket(planOf(c.inputs))[c.inputs.requested_month - 1];
      money(dated.fixed + dated.nonmonthly + dated.flexible, c.expected.planned);
    });
  }
});

// ═══ MK-CF-F-017 publishSurplus ══════════════════════════════════════════════════════════════════════
describe('MK-CF-F-017 publishSurplus — five cases (the payload on the event bus)', () => {
  const published = (value: any) => {
    const seen: any[] = [];
    const off = on(SURPLUS_CALCULATED, (p: any) => seen.push(p));
    publishSurplus('u1' as any, value);
    off();
    expect(seen).toHaveLength(1);
    return seen[0].calculated_surplus_cash;
  };
  kase('MK-CF-F-017-C01', 'AGREE', (c) => money(published(X(c.inputs.supplied_result.total)), c.expected.total));
  kase('MK-CF-F-017-C02', 'AGREE', (c) => { expect(c.expected).toBeNull(); expect(published(null)).toBeNull(); });
  // OUTSIDE DOMAIN: the event carries one figure (calculated_surplus_cash). A rate or a "known" flag beside it is an input
  // the signature publishSurplus(uid, projectedToSave: number) cannot take, and no production code calls it at all.
  kase('MK-CF-F-017-C03', 'OUTSIDE DOMAIN', () => undefined, 'a second field (rate) has no place in publishSurplus(uid, projectedToSave); no caller');
  test('MK-CF-F-017-C03 · the one figure the event can carry keeps every digit (8311.17391)', () => {
    expect(published(X(C('MK-CF-F-017-C03').inputs.supplied_result.total))).toBe(8311.17391);
  });
  kase('MK-CF-F-017-C04', 'OUTSIDE DOMAIN', () => undefined, 'a "known" flag has no place in publishSurplus(uid, projectedToSave); no caller');
  test('MK-CF-F-017-C04 · the one figure the event can carry keeps its sign and digits (−731.1917)', () => {
    expect(published(X(C('MK-CF-F-017-C04').inputs.supplied_result.total))).toBe(-731.1917);
  });
  kase('MK-CF-F-017-C05', 'AGREE', (c) => { const got = published(X(c.inputs.supplied_result)); expect(got).toBe(0); money(got, c.expected); });
});

// ═══ MK-CF-F-191 ym ══════════════════════════════════════════════════════════════════════════════════
describe('MK-CF-F-191 ym — five cases (its own text, on a device in the timestamp\'s zone)', () => {
  const run = (c: any) => expect(ymOnDevice(c.inputs.local_timestamp)).toBe(c.expected);
  for (const id of ['C01', 'C02', 'C03', 'C04', 'C05']) kase(`MK-CF-F-191-${id}`, 'AGREE', run);
});

// ═══ MK-CF-F-189 essentialsFromLoggedSpending ════════════════════════════════════════════════════════
describe('MK-CF-F-189 essentialsFromLoggedSpending — five cases', () => {
  const COUNT: Record<string, [number, string]> = {
    'MK-CF-F-189-C01': [1, '1 month average'], 'MK-CF-F-189-C02': [2, '2 month average'],
    'MK-CF-F-189-C03': [2, '2 month average'], 'MK-CF-F-189-C04': [1, '1 month average — this month so far'],
  };
  const run = (c: any) => {
    const got = essentialsFromLoggedSpending(logs(c.inputs.logged_month_totals), AS_OF);
    if (c.expected?.state === 'REFUSES') { refuses(got); return; }
    money(got!.monthly, c.expected);
    // the basis travels with the figure (the reviewer's note: "compare source/count labels")
    expect([got!.monthsCounted, got!.label]).toEqual(COUNT[c.case_id]);
  };
  for (const id of ['C01', 'C02', 'C03', 'C04', 'C05']) kase(`MK-CF-F-189-${id}`, 'AGREE', run);
});

// ═══ MK-CF-F-190 essentialsMonthly ═══════════════════════════════════════════════════════════════════
describe('MK-CF-F-190 essentialsMonthly — five cases', () => {
  const run = (c: any) => {
    const got = essentialsMonthly(logs(c.inputs.logged_month_totals), c.inputs.typed_fallback == null ? 0 : X(c.inputs.typed_fallback), AS_OF);
    if (c.expected?.state === 'REFUSES') { refuses(got); return; }
    money(got!.monthly, c.expected);
    expect(got!.basis).toBe('logged');   // a logged month outranks the typed figure (DEC-0251)
  };
  for (const id of ['C01', 'C02', 'C03', 'C04', 'C05']) kase(`MK-CF-F-190-${id}`, 'AGREE', run);
});

// ═══ THE FORMULA VERDICTS THAT ARE NOT RIGHT, AND THE RULES NOT HELD ═════════════════════════════════
const VERDICTS: string[] = [];
/** a verdict test pins the measured fact: test.failing where the reviewer is right (APP WRONG), plain where the app is right */
const verdict = (id: string, mark: Mark, title: string, fn: () => void) => {
  VERDICTS.push(id);
  (mark === 'APP WRONG' ? test.failing : test)(`${id} · ${title} [${mark}]`, fn);
};
/** DEC-7951's household, his own: $2,000 a month typed ($1,100 bills & fixed, $900 everyday) and $1,200 of car insurance in
 *  December — in the typed fields the lead's decision names (b_fixed / b_flexible) */
const DEC7951 = { monthlySpending: 2000, b_fixed: 1100, b_flexible: 900, spendCats: [bill(1200, 12)] } as any;
/** The handoff's example: $2,000 recurring a month and $1,200 insurance due in December, as categories */
const HANDOFF = { spendCats: [{ id: 'rent', label: 'Rent / Mortgage', amount: 2000, unit: 'dollar', bucket: 'fixed', tier: 'critical' }, bill(1200, 12)] } as any;
const plannedIn = (op: any, month: number) => budgetVsActual([], op, new Date(2026, month - 1, 15, 12));

describe('formula verdicts (WRONG / INCOMPLETE / CANNOT TELL) and rules NOT HELD', () => {
  // F-009 INCOMPLETE — REVIEWER WRONG: the no-category fallback is the typed plan by his DEC-0251, labelled "you entered" at
  // the door; a confirmed all-flexible plan stays $0 (C05); debts are added once, at the door (DEC-1923), not inside.
  verdict('MK-CF-F-009', 'REVIEWER WRONG', 'app right by DEC-0251 / DEC-1923: fallback = the typed plan ("you entered"); debts added once at the door', () => {
    expect(monthlyEssentials({ monthlySpending: 2000 } as any)).toBe(2000);
    expect(monthlyEssentials({ monthlySpending: 1000, spendCats: catsOf([{ monthly: 1000, need: 'flexible' }]) } as any)).toBe(0);
    const door = theEmergencyFund({ accounts: [], expenses: [], profile: { monthlySpending: 2000 },
      debts: [{ debt_id: 'd1', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 250 }] as any });
    expect(door.essentialsMonthly).toBeCloseTo(2250, 6);   // 2,000 typed + the $250 minimum, once
    expect(door.debtMinimums).toBeCloseTo(250, 6);
    // $2,000 typed + $250 the app adds is "calculated" since 2026-10-27 (the lead's ruling R7; canon rows 4 and 0b; Net worth v08 row of that
    // date); the $2,000 alone, with no debt, is still "you entered" — C02 above holds that
    expect(door.essentialsBasis).toBe('calculated');
    expect(theEmergencyFund({ accounts: [], expenses: [], profile: { monthlySpending: 2000 }, debts: [] }).essentialsBasis).toBe('you entered');
  });
  // THE OLD ANSWER, KEPT (2026-10-27): before R7 the door tagged $2,000 typed + $250 of debt payment "you entered". It fails now, by design.
  test.failing('MK-CF-F-009 · the old answer: $2,000 typed + the $250 minimum tagged "you entered" (replaced 2026-10-27 by R7)', () => {
    const door = theEmergencyFund({ accounts: [], expenses: [], profile: { monthlySpending: 2000 },
      debts: [{ debt_id: 'd1', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 250 }] as any });
    expect(door.essentialsBasis).toBe('you entered');
  });
  // F-010 WRONG — APP WRONG: $0 essentials → 0 months (the function), and a handed-in $0 is replaced by another estimate.
  // The door guards its own months (null) but the Stress test screen turns that null back into "about 0.0 months of
  // essentials" (StressTestScreen.tsx `runwayAfter: hit.monthsAfter ?? 0`, printed as `about ${r.runwayAfter.toFixed(1)} months`) — MK-MN-M-025, live.
  verdict('MK-CF-F-010', 'AGREE', 'FIXED 2026-10-25: zero essentials: no count of months, and a handed-in $0 is not replaced', () => {
    const t = emergencyTest({ monthlySpending: 2000 } as any, 6000, 1000, 0);
    expect(t.monthlyEssentials).toBe(0);   // the $0 handed in, kept
    refuses(t.runwayAfter);
    // the function and its door give one answer: no months, no target (tenet 4)
    const door = theEmergencyFund({ accounts: [], expenses: [], profile: {}, debts: [], cashOverride: 6000 });
    expect(door.afterAShock(1000).monthsAfter).toBeNull(); expect(door.targetFor(3)).toBeNull();
    refuses(emergencyTest(null, 6000, 1000, 0).gapToFund);
  });
  test.failing('MK-CF-F-010 · the app until 2026-10-25, pinned — a handed-in $0 becomes the typed plan ($2,000) and $0 essentials read 0 months; the door\'s own months are null — no longer its answer (FIXED 2026-10-25)', () => {
    expect(emergencyTest({ monthlySpending: 2000 } as any, 6000, 1000, 0).monthlyEssentials).toBe(2000);
    expect(emergencyTest(null, 6000, 1000, 0).runwayAfter).toBe(0);
    const door = theEmergencyFund({ accounts: [], expenses: [], profile: {}, debts: [], cashOverride: 6000 });
    expect(door.essentialsMonthly).toBe(0);
    expect(door.afterAShock(1000).monthsAfter).toBeNull();   // the screen prints this null as "about 0.0 months"
    expect(door.monthsCovered).toBeNull();
  });
  // F-013 INCOMPLETE — APP WRONG, though not by the route the reviewer feared: the double count cannot happen (no reader
  // re-reads the stored budget — the twin below), but what is stored is incoherent in a form the reviewer's cases did not reach: in his DEC-7951 household (the typed $1,100 / $900 split and a dated bill) the stored
  // three parts are $0 + $100 + $0 = $100 while the stored total is $2,100 (tenet 2: the parts add up to the total).
  verdict('MK-CF-F-013', 'AGREE', 'FIXED 2026-10-25: the stored parts add up to the stored total (DEC-7951 household: 1,100 + 100 + 900 = 2,100)', () => {
    const d = budgetFromOnboarding('u1' as any, DEC7951);
    expect(d.fixed! + d.non_monthly! + d.flexible!).toBeCloseTo(d.monthly_spending!, 6);
    expect([d.fixed, d.non_monthly, d.flexible]).toEqual([1100, 100, 900]);
    // the average is stored once, and the December bill is in it once: the year is $25,200, the twelve months added up
    expect(d.monthly_spending! * 12).toBeCloseTo(spendByMonth(DEC7951).reduce((t, m) => t + m, 0), 6);
    expect(d.monthly_spending! * 12).toBeCloseTo(25200, 6);
    // nothing reads a stored budget back in, so it can never be added to the typed total a second time
    expect(BUDGET_SRC.match(/doc\.monthly_spending/g)).toHaveLength(1);
  });
  test.failing('MK-CF-F-013 · the app until 2026-10-25, pinned — DEC-7951 household stored as total $2,100 with parts $0 / $100 / $0; nothing re-reads it, so the bill is never added twice — no longer its answer (FIXED 2026-10-25)', () => {
    const d = budgetFromOnboarding('u1' as any, DEC7951);
    expect(d.monthly_spending).toBeCloseTo(2100, 6);
    expect([d.fixed, d.non_monthly, d.flexible]).toEqual([0, 100, 0]);
    // the only reader of a stored budget is buildBudgetState, inside buildSnapshot, which reads monthly_spending once
    expect(BUDGET_SRC.match(/doc\.monthly_spending/g)).toHaveLength(1);
    const snapshotSrc = fs.readFileSync(path.join(__dirname, '../../../src/domain/snapshot.ts'), 'utf8');
    expect(snapshotSrc).toMatch(/buildBudgetState\(uid, income\.net_monthly_income, budgetFromOnboarding\(uid, op\)\)/);
  });
  // F-014 WRONG — APP WRONG, live: the handoff's own example and his DEC-7951 household, month by month
  verdict('MK-CF-F-014', 'AGREE', 'FIXED 2026-10-25: the handoff example: $2,000 in September, $3,200 in December; the year $25,200', () => {
    expect(spendByMonth(HANDOFF).reduce((t, m) => t + m, 0)).toBeCloseTo(25200, 6);
    expect(plannedMonthlySpend(HANDOFF)).toBeCloseTo(2100, 6);   // the average, which only a /month-on-average figure may show
    expect(plannedIn(HANDOFF, 9).planned_total).toBeCloseTo(2000, 6);
    expect(plannedIn(HANDOFF, 12).planned_total).toBeCloseTo(3200, 6);
  });
  test.failing('MK-CF-F-014 · the app until 2026-10-25, pinned — handoff example reads $2,100 planned in September AND December (non-monthly bucket $100 both months) — no longer its answer (FIXED 2026-10-25)', () => {
    expect(plannedIn(HANDOFF, 9).planned_total).toBeCloseTo(2100, 6);
    expect(plannedIn(HANDOFF, 12).planned_total).toBeCloseTo(2100, 6);
    expect(plannedIn(HANDOFF, 12).buckets.find((b) => b.key === 'nonmonthly')!.planned).toBeCloseTo(100, 6);
  });
  test.failing('MK-CF-F-014 · the app until 2026-10-25, pinned — the typed total is not in budgetVsActual at all: typed $2,000 and nothing else plans $0; DEC-7951\'s household plans $100 a month — no longer its answer (FIXED 2026-10-25)', () => {
    expect(plannedIn({ monthlySpending: 2000 } as any, 9).planned_total).toBe(0);
    expect(plannedIn(DEC7951, 9).planned_total).toBeCloseTo(100, 6);
    expect(plannedIn(DEC7951, 12).planned_total).toBeCloseTo(100, 6);
    expect(spendBuckets(DEC7951)).toEqual({ fixed: 0, non_monthly: 100, flexible: 0, monthly_total: 100 });
  });
  // DEC-7611 NOT HELD — APP WRONG: its own household, September $700 of groceries and a $1,200 December bill
  const DEC7611 = { spendCats: [{ id: 'g', label: 'Groceries', amount: 700, unit: 'dollar', bucket: 'flexible', tier: 'critical' }, bill(1200, 12)] } as any;
  verdict('DEC-7611', 'AGREE', 'FIXED 2026-10-25: September $700 planned (Once in a while $0), December $1,900 (Once in a while $1,200) on the budget editor too', () => {
    const sep = plannedIn(DEC7611, 9), dec = plannedIn(DEC7611, 12);
    expect(sep.planned_total).toBeCloseTo(700, 6);
    expect(sep.buckets.find((b) => b.key === 'nonmonthly')!.planned).toBeCloseTo(0, 6);
    expect(dec.planned_total).toBeCloseTo(1900, 6);
    expect(dec.buckets.find((b) => b.key === 'nonmonthly')!.planned).toBeCloseTo(1200, 6);
  });
  test.failing('DEC-7611 · the app until 2026-10-25, pinned — the Expenses tab holds it (spendByMonthByBucket: Sep 700, Dec 1,900) but budgetVsActual reads $800 in both months — no longer its answer (FIXED 2026-10-25)', () => {
    const g = spendByMonthByBucket(DEC7611);
    expect(g[8]).toEqual({ fixed: 0, nonmonthly: 0, flexible: 700 });
    expect(g[11]).toEqual({ fixed: 0, nonmonthly: 1200, flexible: 700 });
    expect(plannedIn(DEC7611, 9).planned_total).toBeCloseTo(800, 6);
    expect(plannedIn(DEC7611, 12).planned_total).toBeCloseTo(800, 6);
  });
  // DEC-7951 NOT HELD — APP WRONG: eleven months $2,000 and December $3,200, the $1,100 / $900 split kept
  verdict('DEC-7951', 'AGREE', 'FIXED 2026-10-25: his $2,000 typed ($1,100 / $900) + $1,200 December: budget editor plans $2,000 in September, $3,200 in December', () => {
    const sep = plannedIn(DEC7951, 9), dec = plannedIn(DEC7951, 12);
    expect(monthlyEssentials(DEC7951)).toBeCloseTo(2000, 6);   // DEC-7951's must-pay figure, held (kept live from the old twin)
    expect(sep.planned_total).toBeCloseTo(2000, 6);
    expect(sep.buckets.find((b) => b.key === 'fixed')!.planned).toBeCloseTo(1100, 6);
    expect(sep.buckets.find((b) => b.key === 'flexible')!.planned).toBeCloseTo(900, 6);
    expect(dec.planned_total).toBeCloseTo(3200, 6);
  });
  test.failing('DEC-7951 · the app until 2026-10-25, pinned — the dated producer holds it (Sep 2,000 = 1,100 + 900, Dec 3,200; average 2,100) but budgetVsActual plans $100 in both months — no longer its answer (FIXED 2026-10-25)', () => {
    const g = spendByMonthByBucket(DEC7951);
    expect(g[8]).toEqual({ fixed: 1100, nonmonthly: 0, flexible: 900 });
    expect(g[11]).toEqual({ fixed: 1100, nonmonthly: 1200, flexible: 900 });
    expect(plannedMonthlySpend(DEC7951)).toBeCloseTo(2100, 6);
    expect(monthlyEssentials(DEC7951)).toBeCloseTo(2000, 6);   // DEC-7951's must-pay figure, held
    expect(plannedIn(DEC7951, 9).planned_total).toBeCloseTo(100, 6);
  });
});

// ═══ A GUARD MUST PROVE IT LOOKED ════════════════════════════════════════════════════════════════════
describe('coverage — every case of part 7 run exactly once; every verdict not RIGHT and every rule NOT HELD measured', () => {
  test('60 of 60 cases', () => {
    const ids = PART.cases.map((c: any) => c.case_id);
    expect(ids.length).toBeGreaterThanOrEqual(60);
    expect(RAN.length).toBe(ids.length);
    expect(new Set(RAN).size).toBe(RAN.length);
    expect([...RAN].sort()).toEqual([...ids].sort());
  });
  test('4 of 4 formula verdicts not RIGHT, 2 of 2 rules NOT HELD', () => {
    const notRight = PART.formula_checks.filter((f: any) => f.verdict !== 'RIGHT').map((f: any) => f.id);
    const notHeld = PART.rules_held.filter((r: any) => r.verdict === 'NOT HELD').map((r: any) => r.rule);
    expect(notRight.length + notHeld.length).toBeGreaterThanOrEqual(6);
    expect([...VERDICTS].sort()).toEqual([...notRight, ...notHeld].sort());
    expect(PART.rules_held.length).toBe(6);   // the other four are recorded in the results file (1 HELD, 3 CANNOT TELL)
  });
});
