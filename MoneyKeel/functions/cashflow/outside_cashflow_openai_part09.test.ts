/* THE OUTSIDE CASES, RUN AGAINST THE APP — Cash flow module, OpenAI package of 2026-10-24, PART 9 of 19 (debts: payments,
 * balances and paying them off). Cards: MK-CF-O-018 theDebts · F-021 defaultPaymentType · F-022 paymentShape · F-023
 * requiredPayment · F-024 totalDebtMonthly · F-025 minimumDebtService · F-026 actualDebtPayment · F-027 totalDebtBalance ·
 * F-028 loanPayment · F-029 monthsToClear · F-030 paymentToClearBy · F-034 payoffPlan · F-159 isRecurringDebt · F-235
 * paysInMonth · F-236 paymentInMonth.
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/
 * MoneyKeel_CashFlow_Independent_Audit/audit_results/MoneyKeel_CashFlow_Audit_Part_09.json. Every expected answer is READ FROM
 * THE PACKAGE (C(case_id).expected), never retyped; only the plain input names are mapped onto the app's fields. Results, case
 * by case: MoneyKeel/documents/audit/outside-test-cases/returned/results/cashflow_openai_part09_results.json
 *
 * MEASURED ONLY (2026-10-25): no app code, drawing, record or existing test was changed.
 * FIXED 2026-10-25 (FIX-MONTH): MK-CF-O-018-C03 and its formula check (no plan from a payment never entered); C01 and C04's payoff
 * budget are REVIEWER WRONG under his DEC-0641 ("what actually leaves"): the plan pays the payment set, never less than the minimum.
 *
 * Marks: AGREE (test on the reviewer's answer) · APP WRONG (test.failing on the reviewer's answer — it turns red when fixed,
 * with a twin test pinning what the app gives today) · REVIEWER WRONG (a passing test pinning the app's hand-checked answer,
 * the decision in its name) · NEEDS RULING (the app's answer pinned) · OUTSIDE DOMAIN (an input no caller can send: the app's
 * answer pinned, the caller named) · BLOCKED (test.skip, the missing contract named).
 *
 * INPUT NAMES MAPPED (the app's fields, never the answers):
 *   A debt {name, balance, minimum, override | payment_override, apr, shape, due_date, first_payment_date, payoff_date,
 *   required_payment} → Debt {debt_id and label = name, remaining_balance = balance (null kept as null), minimum_monthly_payment
 *   = minimum (absent = never entered, the field left undefined exactly as DebtEditorSheet.tsx:144-146 saves a blank payment),
 *   monthly_payment = override, interest_rate_apr = apr (a decimal), payment_type from shape (instalment 'installment',
 *   revolving 'revolving', due_full 'due_in_full'; absent = the kind's default), payoff_date = due_date | payoff_date,
 *   first_payment_date as given; required_payment → minimum_monthly_payment (the payment requiredPayment reads)}.
 *   kind → DebtType (mortgage MORTGAGE, credit_card CREDIT_CARD, personal PERSONAL, heloc HELOC; none given → OTHER).
 *   The reviewer's spellings "instalment" / "due_full" are the app's 'installment' / 'due_in_full'.
 *   theDebts {debts, extra, recorded_start_balance} → theDebts({ debts, extraMonthly: extra, startOfYearDebt:
 *   recorded_start_balance, now: as_of at noon }); its answers: balance/total → totalBalance, minimum → minimumMonthly,
 *   planned_payment / planned_monthly_payment → paymentsMonthly, payoff_budget → planMonthly, monthly_interest →
 *   interestMonthly, paid_down / paid_down_share → progress.paidDown / progress.share, payoff → plan.
 *   payoffPlan {debts, extra, method} → payoffPlan(debts, extra, method ?? 'avalanche', as_of at noon): months → months,
 *   interest → totalInterest, order[].month → order[].payoffMonth; "never" → neverPaysOff.
 *   A per-debt card handed a list (requiredPayment) → the function on each debt; an empty list → nothing to add (0).
 * TOLERANCES: money to 1e-6 dollars (toBeCloseTo …, 6) — floating sums only; counts exact; REFUSES = no number (null), never 0.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  defaultPaymentType, paymentShape, requiredPayment, totalDebtMonthly, minimumDebtService, actualDebtPayment,
  totalDebtBalance, loanPayment, monthsToClear, paymentToClearBy, payoffPlan, paysInMonth, paymentInMonth, type Debt,
} from '../../../src/domain/debt';
import { theDebts } from './the-debts';
import { isRecurringDebt } from './this-month';
import { surplusByMonth } from '../../../src/domain/savings';
import { weighGoals } from '../../../src/domain/planning/multiGoal';

// ── the package, read as it came ────────────────────────────────────────────────────────────────────
type Mark = 'AGREE' | 'APP WRONG' | 'REVIEWER WRONG' | 'NEEDS RULING' | 'BLOCKED' | 'OUTSIDE DOMAIN';
interface Meta { mapped: string; rests_on: string; note: string }
const PKG = path.join(__dirname, '../../documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/MoneyKeel_CashFlow_Independent_Audit/audit_results');
const PART = JSON.parse(fs.readFileSync(path.join(PKG, 'MoneyKeel_CashFlow_Audit_Part_09.json'), 'utf8'));
const C = (caseId: string): any => {
  const c = PART.cases.find((x: any) => x.case_id === caseId);
  if (!c) throw new Error(`no case ${caseId} in the package`);
  return c;
};
const plain = (v: unknown) => (v === undefined ? null : JSON.parse(JSON.stringify(v, (_k, x) => (x === undefined ? null : x))));
const RECORD: { cases: any[]; formula: any[]; rules: any[] } = { cases: [], formula: [], rules: [] };
const runner = (mark: Mark) => (mark === 'APP WRONG' ? test.failing : mark === 'BLOCKED' ? test.skip : test);
const kase = (caseId: string, mark: Mark, meta: Meta, fn: (c: any, seen: (v: unknown) => void) => void) => {
  const c = C(caseId);
  const name = `${caseId} · ${c.kind} · ${c.title} [${mark}]`;
  const row: any = { case_id: caseId, mark, ...meta, test: name, actual: null };
  RECORD.cases.push(row);
  const seen = (v: unknown) => { row.actual = plain(v); };
  // the app's answer is recorded for every mark, the failing and skipped ones included
  try { fn(c, seen); } catch { /* recorded above; the assertion's verdict is the test's */ }
  runner(mark)(name, () => fn(c, () => {}));
};
const fcheck = (id: string, mark: Mark, meta: Record<string, unknown>, fn: () => void) => {
  const name = `${id} · formula verdict ${PART.formula_checks.find((f: any) => f.id === id)?.verdict} [${mark}]`;
  RECORD.formula.push({ id, mark, ...meta, test: name });
  runner(mark)(name, fn);
};
afterAll(() => { if (process.env.CFR_OUT) fs.writeFileSync(process.env.CFR_OUT, JSON.stringify(RECORD, null, 1)); });

// ── helpers ─────────────────────────────────────────────────────────────────────────────────────────
const n = (v: any) => (v == null ? null : Number(v));
const ex = (e: any) => Number(e.exact);
const money = (got: unknown, want: any) => expect(got as number).toBeCloseTo(ex(want), 6);
const refuses = (v: unknown) => expect(v == null).toBe(true);
const SHAPE: Record<string, Debt['payment_type']> = { instalment: 'installment', revolving: 'revolving', due_full: 'due_in_full' };
const KIND: Record<string, Debt['debt_type']> = { mortgage: 'MORTGAGE', credit_card: 'CREDIT_CARD', personal: 'PERSONAL', heloc: 'HELOC' };
const APP_SHAPE: Record<string, string> = { installment: 'instalment', revolving: 'revolving', due_in_full: 'due_full' };
/** the reviewer's plain debt, as the app stores one (a payment never entered stays undefined, as the debt editor saves it) */
const debt = (x: any, i = 0): Debt => {
  const minimum = x.minimum ?? x.required_payment;
  const override = x.override ?? x.payment_override;
  return {
    debt_id: x.name ?? `D${i}`, label: x.name ?? `D${i}`, debt_type: KIND[x.kind] ?? 'OTHER',
    remaining_balance: x.balance === null ? (null as any) : n(x.balance)!, interest_rate_apr: n(x.apr) ?? 0,
    minimum_monthly_payment: minimum === undefined ? (undefined as any) : n(minimum)!,
    ...(override !== undefined ? { monthly_payment: n(override)! } : {}),
    ...(x.shape ? { payment_type: SHAPE[x.shape] } : {}),
    ...(x.due_date || x.payoff_date ? { payoff_date: x.due_date ?? x.payoff_date } : {}),
    ...(x.first_payment_date ? { first_payment_date: x.first_payment_date } : {}),
  };
};
const debts = (c: any) => (c.inputs.debts as any[]).map(debt);
const asOf = (c: any) => new Date(`${c.as_of}T12:00:00`);
const MAP_DEBT = 'debt {name, balance, minimum, override, apr, shape, due/payoff/first dates} → Debt (minimum absent = never entered: undefined; shape instalment/revolving/due_full → installment/revolving/due_in_full)';
const kindDebt = (c: any): Debt => ({ debt_id: 'k', label: 'k', debt_type: KIND[c.inputs.kind], remaining_balance: 1000, interest_rate_apr: 0, minimum_monthly_payment: 10,
  ...(c.inputs.payment_type ? { payment_type: SHAPE[c.inputs.payment_type] } : {}) });
const MAP_KIND = 'kind → DebtType (mortgage MORTGAGE, credit_card CREDIT_CARD, personal PERSONAL, heloc HELOC); payment_type → the debt\'s payment_type (null = not given); the app\'s installment/due_in_full read as the reviewer\'s instalment/due_full';

// ═════ MK-CF-O-018 theDebts ════════════════════════════════════════════════════════════════════════
describe('MK-CF-O-018 theDebts — five cases', () => {
  const MAPPED = `theDebts({ debts, extraMonthly: extra, startOfYearDebt: recorded_start_balance, now: as_of }) · ${MAP_DEBT}`;
  const run = (c: any) => theDebts({ debts: debts(c), extraMonthly: n(c.inputs.extra) ?? 0, startOfYearDebt: n(c.inputs.recorded_start_balance), now: asOf(c) });
  // REVIEWER WRONG on one figure (2026-10-25, FIX-MONTH): the payoff budget is what is paid plus the extra — his DEC-0641 (Q53, "what
  // actually leaves"), the lead's ruling on CFR-5's MK-CF-M-073: 200 + 50 = $250, not the minimum's 100 + 50 = $150. The rest agrees.
  kase('MK-CF-O-018-C01', 'REVIEWER WRONG', { mapped: MAPPED, rests_on: 'DEC-0641 ("what actually leaves"); ordinary arithmetic', note: 'Balance $10,000, minimum $100, payments $200, interest $50 — as the reviewer worked; the plan $250 = the $200 paid + $50 extra (DEC-0641), not $150.' },
    (c, seen) => { const r = run(c); seen(r); const e = c.expected;
      money(r.totalBalance, e.balance); money(r.minimumMonthly, e.minimum); money(r.paymentsMonthly, e.planned_payment);
      money(r.interestMonthly, e.monthly_interest);
      expect(r.planMonthly).toBe(200 + 50); });   // DEC-0641: the $200 paid, plus the $50 extra
  test.failing('MK-CF-O-018-C01 · the reviewer’s payoff budget (and the app’s until 2026-10-25), kept: the $100 minimum + $50 = $150', () => {
    const c = C('MK-CF-O-018-C01'); money(run(c).planMonthly, c.expected.payoff_budget);
  });
  kase('MK-CF-O-018-C02', 'AGREE', { mapped: MAPPED, rests_on: 'ordinary arithmetic', note: 'No debts: every total is a known $0.' },
    (c, seen) => { const r = run(c); seen(r); const e = c.expected;
      money(r.totalBalance, e.balance); money(r.minimumMonthly, e.minimum); money(r.paymentsMonthly, e.planned_payment); money(r.interestMonthly, e.monthly_interest); });
  const C03_NOTE = 'Six of seven figures agree ($3,200 + $9,800 = $13,000; $4,100 paid down = 41/171; $113.33 interest). The payoff does not: with no payment entered the plan says "never" (neverPaysOff, 600 months), and the Debts tab prints "never at this rate" and "At this payment your balance grows faster than you pay it down" (BudgetScreen.tsx, debtFreeLabel and the ⚠️ line under the payoff plan) — a claim made from a payment nobody entered.';
  kase('MK-CF-O-018-C03', 'AGREE', { mapped: `${MAPPED}; the drawing's debts with no minimum → minimum_monthly_payment undefined (a payment not entered)`, rests_on: 'DEC-3523 tenet 3 (unknown is not zero); the same rule DEC-7682 applies to This month ("we won\'t guess one")', note: `${C03_NOTE} FIXED 2026-10-25 (FIX-MONTH): no plan, no "never" — "Visa and Car payments are not entered, so there is no payoff date — we won’t guess one."` },
    (c, seen) => { const r = run(c); seen(r); const e = c.expected;
      e.balance_rows.forEach((row: any, i: number) => money(debts(c)[i].remaining_balance, row));
      money(r.totalBalance, e.total); money(r.progress?.paidDown, e.paid_down);
      expect(r.progress!.share).toBeCloseTo(41 / 171, 12); money(r.interestMonthly, e.monthly_interest);
      expect(e.payoff.state).toBe('REFUSES');
      // a refusal: no months and no "never" claim made from a payment never entered
      expect((r.plan as any)?.neverPaysOff ?? false).toBe(false); expect((r.plan as any)?.months ?? null).toBeNull(); });
  test('MK-CF-O-018-C03 · the refusal names both debts (FIXED 2026-10-25 (FIX-MONTH))', () => {
    expect(run(C('MK-CF-O-018-C03')).refusal).toBe('Visa and Car payments are not entered, so there is no payoff date — we won’t guess one.');
  });
  test.failing('MK-CF-O-018-C03 · twin — what the app gave until 2026-10-25: six figures right, the payoff "never" (kept)', () => {
    const c = C('MK-CF-O-018-C03'); const r: any = run(c);
    expect(r.totalBalance).toBe(13000); expect(r.progress!.paidDown).toBe(4100); expect(r.interestMonthly).toBeCloseTo(113.333333333333, 9);
    // months: the month the walk stopped — the first, as a payment that is not a number proves nothing (600 until 2026-10-25, the
    // old walk's stop; FIX-BILLS, MK-CF-F-034). The "never" itself is still this case's fault, which is MK-CF-O-018's to fix.
    expect(r.plan.neverPaysOff).toBe(true); expect(r.plan.months).toBe(1);
  });
  // REVIEWER WRONG on one figure (2026-10-25, FIX-MONTH; DEC-0641): the plan puts what is paid to the debts, 311.19 + 71.13 = $382.32,
  // not the minimum's 231.43 + 71.13 = $302.56. The rest agrees.
  kase('MK-CF-O-018-C04', 'REVIEWER WRONG', { mapped: MAPPED, rests_on: 'DEC-0641 ("what actually leaves"); ordinary arithmetic', note: 'Balance $10,422.60, minimum $231.43 (the lump has none), payments $311.19, interest $55.2457155 — as the reviewer worked; the plan $382.32 = $311.19 paid + $71.13 extra (DEC-0641), not $302.56.' },
    (c, seen) => { const r = run(c); seen(r); const e = c.expected;
      money(r.totalBalance, e.balance); money(r.minimumMonthly, e.minimum); money(r.paymentsMonthly, e.planned_monthly_payment);
      money(r.interestMonthly, e.monthly_interest);
      expect(r.planMonthly).toBeCloseTo(311.19 + 71.13, 6); });
  test.failing('MK-CF-O-018-C04 · the reviewer’s payoff budget (and the app’s until 2026-10-25), kept: the $231.43 minimum + $71.13 = $302.56', () => {
    const c = C('MK-CF-O-018-C04'); money(run(c).planMonthly, c.expected.payoff_budget);
  });
  kase('MK-CF-O-018-C05', 'OUTSIDE DOMAIN', { mapped: `${MAPPED}; balance null → remaining_balance null`,
    rests_on: 'No writer saves a debt without a balance: DebtEditorSheet.tsx:126 (ready needs amt > 0), MK-CF-F-038 debtsFromOnboarding (balance > 0), AddAccountScreen.tsx:127 (num() writes a number)',
    note: 'The known $1,000 agrees with DEC-3279e; the Debts tab has no box naming debt B, but no screen can save a debt with no balance, so the "complete: false" flag has no reachable input. (A blank balance from AddAccountScreen is saved as $0 — a different writer, recorded in the report.)' },
    (c, seen) => { const r = run(c); seen(r); money(r.totalBalance, c.expected.known_balance_subtotal); expect(c.expected.complete).toBe(false);
      expect((r as any).complete).toBeUndefined(); });
});

// ═════ MK-CF-F-021 defaultPaymentType · F-022 paymentShape · F-159 isRecurringDebt ════════════════════
describe('MK-CF-F-021 defaultPaymentType — five cases', () => {
  for (const id of ['MK-CF-F-021-C01', 'MK-CF-F-021-C02', 'MK-CF-F-021-C03', 'MK-CF-F-021-C04', 'MK-CF-F-021-C05'])
    kase(id, 'AGREE', { mapped: `defaultPaymentType(kind) · ${MAP_KIND}`, rests_on: 'the written rule', note: 'The kind alone decides: a card or credit line revolves, any other kind is an instalment loan, whatever payment_type says.' },
      (c, seen) => { const got = defaultPaymentType(KIND[c.inputs.kind]); seen(got); expect(APP_SHAPE[got]).toBe(c.expected); });
});
describe('MK-CF-F-022 paymentShape — five cases', () => {
  for (const id of ['MK-CF-F-022-C01', 'MK-CF-F-022-C02', 'MK-CF-F-022-C03', 'MK-CF-F-022-C04', 'MK-CF-F-022-C05'])
    kase(id, 'AGREE', { mapped: `paymentShape(debt) · ${MAP_KIND}`, rests_on: 'the written rule', note: 'The shape the person chose wins; the kind\'s default fills in when none was chosen.' },
      (c, seen) => { const got = paymentShape(kindDebt(c)); seen(got); expect(APP_SHAPE[got]).toBe(c.expected); });
});
describe('MK-CF-F-159 isRecurringDebt — five cases', () => {
  for (const id of ['MK-CF-F-159-C01', 'MK-CF-F-159-C02', 'MK-CF-F-159-C03', 'MK-CF-F-159-C04', 'MK-CF-F-159-C05'])
    kase(id, 'AGREE', { mapped: `isRecurringDebt(debt) · ${MAP_KIND}`, rests_on: 'the written rule', note: 'Only an instalment loan repeats unchanged every month.' },
      (c, seen) => { const got = isRecurringDebt(kindDebt(c)); seen(got); expect(got).toBe(c.expected); });
});

// ═════ MK-CF-F-023 requiredPayment · F-024 totalDebtMonthly · F-025 minimumDebtService · F-026 · F-027 ══════
describe('MK-CF-F-023 requiredPayment — five cases (one debt at a time)', () => {
  const MAPPED = `requiredPayment(each debt) · ${MAP_DEBT}; an empty list → nothing to add (0)`;
  const each = (c: any) => debts(c).map(requiredPayment);
  kase('MK-CF-F-023-C01', 'AGREE', { mapped: MAPPED, rests_on: 'ordinary arithmetic', note: 'max($100, $200) = $200.' },
    (c, seen) => { const got = each(c); seen(got); money(got[0], c.expected); });
  kase('MK-CF-F-023-C02', 'AGREE', { mapped: MAPPED, rests_on: 'ordinary arithmetic', note: 'A debt due in full has no monthly payment: $0.' },
    (c, seen) => { const got = each(c); seen(got); money(got[0], c.expected); });
  for (const id of ['MK-CF-F-023-C03', 'MK-CF-F-023-C04'])
    kase(id, 'AGREE', { mapped: MAPPED, rests_on: 'ordinary arithmetic', note: 'Each debt: the larger of minimum and chosen payment; a lump $0; the sum is compared only.' },
      (c, seen) => { const got = each(c); seen(got); c.expected.per_debt.forEach((w: any, i: number) => money(got[i], w));
        money(got.reduce((t, v) => t + v, 0), c.expected.sum_for_comparison); });
  kase('MK-CF-F-023-C05', 'AGREE', { mapped: MAPPED, rests_on: 'ordinary arithmetic', note: 'No debts: nothing to add.' },
    (c, seen) => { const got = each(c); seen(got); money(got.reduce((t, v) => t + v, 0), c.expected); });
});
const listCard = (id: string, name: string, fn: (d: Debt[]) => number, note: string, edge?: { mark: Mark; meta: Meta; check: (c: any, got: number) => void }) =>
  describe(`${id} ${name} — five cases`, () => {
    const MAPPED = `${name}(debts) · ${MAP_DEBT}`;
    for (const k of ['C01', 'C02', 'C03', 'C04'])
      kase(`${id}-${k}`, 'AGREE', { mapped: MAPPED, rests_on: 'ordinary arithmetic', note }, (c, seen) => { const got = fn(debts(c)); seen(got); money(got, c.expected); });
    if (edge) kase(`${id}-C05`, edge.mark, edge.meta, (c, seen) => { const got = fn(debts(c)); seen(got); edge.check(c, got); });
    else kase(`${id}-C05`, 'AGREE', { mapped: MAPPED, rests_on: 'ordinary arithmetic', note: 'No debts: a known $0.' }, (c, seen) => { const got = fn(debts(c)); seen(got); money(got, c.expected); });
  });
listCard('MK-CF-F-024', 'totalDebtMonthly', totalDebtMonthly, 'Each debt\'s required payment added: $200; $0 for a lump; $311.19 + $93.19 = $404.38; + $171.13 = $482.32.');
listCard('MK-CF-F-025', 'minimumDebtService', minimumDebtService, 'The minimums added, a lump counting $0: $100; $0; $231.43 + $93.19 = $324.62.');
listCard('MK-CF-F-026', 'actualDebtPayment', actualDebtPayment, 'The same as totalDebtMonthly: the chosen payment, else the minimum.', {
  mark: 'AGREE',
  meta: { mapped: 'actualDebtPayment(debts) — payments_logged_this_month is not an input the function takes',
    rests_on: 'Settled by DEC-0641 ("what actually leaves" = the payment the person chose, $600 on a $200 minimum) and DEC-1923 (the ACTUAL month counts only a logged payment — MK-CF-F-005 actualMonthFlow does that, not this function)',
    note: 'The reviewer wrote RULE UNCLEAR with two readings; his rulings settle it: this function is the planned monthly payment ($200), and no actual-month figure reads it (its callers are MK-XS-F-028 surplusByMonth, a plan built from the profile, and buildDebtState.total_actual_payment, which nothing reads). The name "actual" is a records fix.' },
  check: (c, got) => { expect(c.expected.state).toBe('RULE UNCLEAR'); money(got, c.expected.readings.planned_monthly); },
});
listCard('MK-CF-F-027', 'totalDebtBalance', totalDebtBalance, 'The known balances added: $10,000; $10,000 for a lump; $15,422.34; $25,133.47.');

// ═════ MK-CF-F-028 loanPayment · F-029 monthsToClear · F-030 paymentToClearBy ═══════════════════════
describe('MK-CF-F-028 loanPayment — five cases', () => {
  const MAPPED = 'loanPayment(principal, apr_percent, years) — the rate as a percent, as the card says';
  for (const id of ['MK-CF-F-028-C01', 'MK-CF-F-028-C02', 'MK-CF-F-028-C03', 'MK-CF-F-028-C04', 'MK-CF-F-028-C05'])
    kase(id, 'AGREE', { mapped: MAPPED, rests_on: 'ordinary amortisation arithmetic', note: 'P × r ÷ (1 − (1 + r)^−n), or P ÷ n at 0%; total paid = payment × n; interest = total − P — at full precision.' },
      (c, seen) => { const i = c.inputs; const got = loanPayment(n(i.principal)!, n(i.apr_percent)!, n(i.years)!); seen(got);
        money(got.monthly, c.expected.payment); money(got.totalPaid, c.expected.total_paid); money(got.totalInterest, c.expected.interest); });
});
describe('MK-CF-F-029 monthsToClear — five cases', () => {
  const MAPPED = 'monthsToClear(principal, apr_decimal, monthly_payment)';
  for (const id of ['MK-CF-F-029-C01', 'MK-CF-F-029-C02', 'MK-CF-F-029-C03', 'MK-CF-F-029-C04'])
    kase(id, 'AGREE', { mapped: MAPPED, rests_on: 'ordinary amortisation arithmetic', note: 'Months = round up(ln(p ÷ (p − P × r)) ÷ ln(1 + r)), or round up(P ÷ p) at 0%.' },
      (c, seen) => { const i = c.inputs; const got = monthsToClear(n(i.principal)!, n(i.apr_decimal)!, n(i.monthly_payment)!); seen(got); expect(got).toBe(ex(c.expected)); });
  kase('MK-CF-F-029-C05', 'AGREE', { mapped: MAPPED, rests_on: 'ordinary arithmetic', note: 'A payment equal to the month\'s $100 interest never clears: no number.' },
    (c, seen) => { const i = c.inputs; const got = monthsToClear(n(i.principal)!, n(i.apr_decimal)!, n(i.monthly_payment)!); seen(got); expect(c.expected.state).toBe('REFUSES'); refuses(got); });
});
describe('MK-CF-F-030 paymentToClearBy — five cases', () => {
  for (const id of ['MK-CF-F-030-C01', 'MK-CF-F-030-C02', 'MK-CF-F-030-C03', 'MK-CF-F-030-C04', 'MK-CF-F-030-C05'])
    kase(id, 'AGREE', { mapped: 'paymentToClearBy(principal, apr_decimal, months)', rests_on: 'ordinary amortisation arithmetic; the cent rounded UP is the rule (the stated payment must meet the stated date)', note: 'The amortising payment, rounded up to the next cent.' },
      (c, seen) => { const i = c.inputs; const got = paymentToClearBy(n(i.principal)!, n(i.apr_decimal)!, n(i.months)!); seen(got); money(got, c.expected); });
});

// ═════ MK-CF-F-034 payoffPlan ══════════════════════════════════════════════════════════════════════
describe('MK-CF-F-034 payoffPlan — five cases', () => {
  const MAPPED = `payoffPlan(debts, extra, method ?? 'avalanche', as_of at noon) · ${MAP_DEBT}`;
  const run = (c: any) => payoffPlan(debts(c), n(c.inputs.extra) ?? 0, c.inputs.method ?? 'avalanche', asOf(c));
  const check = (c: any, r: any) => {
    expect(r.months).toBe(ex(c.expected.months)); money(r.totalInterest, c.expected.interest);
    expect(r.order.map((o: any) => o.label)).toEqual(c.expected.order.map((o: any) => o.name));
    c.expected.order.forEach((o: any, i: number) => expect(r.order[i].payoffMonth).toBe(ex(o.month)));
  };
  kase('MK-CF-F-034-C01', 'AGREE', { mapped: MAPPED, rests_on: 'ordinary arithmetic', note: '$1,000 at 0% and $100 a month: 10 months.' }, (c, seen) => { const r = run(c); seen(r); check(c, r); });
  kase('MK-CF-F-034-C02', 'AGREE', { mapped: MAPPED, rests_on: 'ordinary arithmetic', note: '$100 extra halves it: 5 months.' }, (c, seen) => { const r = run(c); seen(r); check(c, r); });
  kase('MK-CF-F-034-C03', 'AGREE', { mapped: MAPPED, rests_on: 'ordinary arithmetic', note: 'Snowball: A cleared in month 1, its $100.13 rolls on, B cleared in month 2.' }, (c, seen) => { const r = run(c); seen(r); check(c, r); });
  kase('MK-CF-F-034-C04', 'AGREE', { mapped: MAPPED, rests_on: 'ordinary arithmetic; month 1 is the month of as_of', note: 'First payment in December (month 3): $400.13, then $331.04 in month 4.' }, (c, seen) => { const r = run(c); seen(r); check(c, r); });
  // FIXED 2026-10-25 (FIX-BILLS): "never" is proven (the payments cannot get ahead of the interest), never read off a stop
  kase('MK-CF-F-034-C05', 'AGREE', { mapped: MAPPED, rests_on: 'Ordinary arithmetic ($60,100 ÷ $100 = 601 months) and DEC-3523 tenet 1 — FIXED 2026-10-25: an iteration cap is never "never"',
    note: 'The app says never (neverPaysOff true, months 600) for a debt that clears in month 601; the Debts tab prints "never at this rate" and "your balance grows faster than you pay it down" for a balance that falls $100 every month.' },
    (c, seen) => { const r = run(c); seen(r); expect(c.expected.state).toBe('HORIZON EXHAUSTED');
      expect(r.neverPaysOff).toBe(false);
      const any = r as any;
      expect(any.months === ex(c.expected.actual_payoff_month) || any.actualPayoffMonth === ex(c.expected.actual_payoff_month) || any.state === 'HORIZON EXHAUSTED').toBe(true);
      expect([r.months, r.pastHorizon, r.stillOwed]).toEqual([601, false, 0]); });
  test.failing('MK-CF-F-034-C05 · the app until 2026-10-25, pinned: "never", 600 months — no longer its answer (FIXED 2026-10-25)', () => {
    const r = run(C('MK-CF-F-034-C05')); expect(r.neverPaysOff).toBe(true); expect(r.months).toBe(600);
  });
});

// ═════ MK-CF-F-235 paysInMonth · F-236 paymentInMonth ═════════════════════════════════════════════
describe('MK-CF-F-235 paysInMonth — five cases', () => {
  for (const id of ['MK-CF-F-235-C01', 'MK-CF-F-235-C02', 'MK-CF-F-235-C03', 'MK-CF-F-235-C04', 'MK-CF-F-235-C05'])
    kase(id, 'AGREE', { mapped: `paysInMonth(debt, month) · ${MAP_DEBT}; required_payment → the payment`, rests_on: 'DEC-8153 (the lead\'s, under DEC-1923)', note: 'From its first payment month to its payoff month, inclusive; a lump only in its due month while owed.' },
      (c, seen) => { const got = paysInMonth(debt(c.inputs.debt), c.inputs.month); seen(got); expect(got).toBe(c.expected); });
});
describe('MK-CF-F-236 paymentInMonth — five cases', () => {
  for (const id of ['MK-CF-F-236-C01', 'MK-CF-F-236-C02', 'MK-CF-F-236-C03', 'MK-CF-F-236-C04', 'MK-CF-F-236-C05'])
    kase(id, 'AGREE', { mapped: `paymentInMonth(debt, month) · ${MAP_DEBT}; required_payment → the payment`, rests_on: 'DEC-8153 (the lead\'s, under DEC-1923)', note: 'The payment in a month it falls in; a lump\'s whole balance in its month; $0 otherwise.' },
      (c, seen) => { const got = paymentInMonth(debt(c.inputs.debt), c.inputs.month); seen(got); money(got, c.expected); });
});

// ═════ the reviewer's formula verdicts in part 9 that are not RIGHT (3 of 15) ═══════════════════════
describe('formula checks — the reviewer’s 3 verdicts that are not RIGHT', () => {
  const NOW = new Date('2026-10-24T12:00:00');
  const D = (o: Partial<Debt> & { remaining_balance: number }): Debt => ({ debt_id: o.label ?? 'A', label: 'A', debt_type: 'OTHER', interest_rate_apr: 0, minimum_monthly_payment: undefined as any, ...o });
  fcheck('MK-CF-O-018', 'AGREE', { fixed: '2026-10-25 (FIX-MONTH): a payment or a rate never entered gives no plan and no "never" — theDebts.plan is null and its refusal names the debt; payoffPlan refuses for every caller', records_or_app_fix: 'app fix (theDebts / payoffPlan) and records (MK-CF-M-058\'s refusal words)',
    what_the_code_actually_does: 'One debt whose payment was never entered (the debt editor saves a blank payment as not entered since 2026-10-21) turns the whole plan into "never": the minimums become NaN, the walk stops in month 1 and neverPaysOff is set. The /month min total silently adds nothing for it, and paymentsMonthly (what leaves each month) comes back NaN. A missing BALANCE has no reachable writer (OUTSIDE DOMAIN, case C05).',
    governing_decisions: ['DEC-3523', 'DEC-7682', 'DEC-3279e'],
    plain_example: 'Visa $3,200 at 22.90% with $110 entered and a car loan $9,800 at 6.40% with its payment not entered: Debts reads "debt-free never at this rate" and "$110/month in payments". Right: no payoff date, and the car loan named as having no payment entered.' },
  () => {
    const r = theDebts({ debts: [D({ label: 'Visa', debt_type: 'CREDIT_CARD', remaining_balance: 3200, interest_rate_apr: 0.229, minimum_monthly_payment: 110 }),
      D({ label: 'Car loan', debt_type: 'AUTO', remaining_balance: 9800, interest_rate_apr: 0.064 })], now: NOW });
    expect(r.plan?.neverPaysOff ?? false).toBe(false);
    expect(r.plan).toBeNull();
    expect(r.refusal).toBe('Car loan’s payment is not entered, so there is no payoff date — we won’t guess one.');
  });
  fcheck('MK-CF-F-026', 'REVIEWER WRONG', { records_or_app_fix: 'records fix: the rule text — the card and the code header call it "Σ ACTUAL payments … what actually leaves your account"; it is the planned monthly payment (the chosen payment, else the minimum)',
    what_the_code_actually_does: 'Returns totalDebtMonthly, the chosen payment (DEC-0641). Its two readers are planned: MK-XS-F-028 surplusByMonth (a plan from the profile) and buildDebtState.total_actual_payment, which nothing reads (grep of src/, app/, MoneyKeel/functions). The ACTUAL month counts logged payments in MK-CF-F-005 actualMonthFlow (DEC-1923).',
    governing_decisions: ['DEC-0641', 'DEC-1923'],
    plain_example: 'A $200 minimum paid at $600: actualDebtPayment $600 — the plan; a month with no payment logged still shows $0 paid on This month\'s ACTUAL side.' },
  () => {
    const ds = [{ debt_id: 'c', label: 'Card', debt_type: 'CREDIT_CARD', remaining_balance: 3000, interest_rate_apr: 0.2, minimum_monthly_payment: 200, monthly_payment: 600 }] as Debt[];
    expect(actualDebtPayment(ds)).toBe(600);
    // the plan reader: the profile's surplus by month takes the planned $600 off every month
    const op: any = { baseSalary: '6000', monthlySpending: '2000' };
    const withDebt = surplusByMonth(op, ds), without = surplusByMonth(op, []);
    expect(withDebt).toHaveLength(12);
    withDebt.forEach((m, i) => expect(m.amount).toBeCloseTo(without[i].amount - 600, 6));
  });
  fcheck('MK-CF-F-034', 'AGREE', { fixed: '2026-10-25 (FIX-BILLS): never is proven, the walk goes to 12,000 months, still owed then and falling is past the horizon with what is still owed; weighGoals gives no payoff month for a plan that does not clear', records_or_app_fix: 'app fix (payoffPlan; its readers the Debts tab, BudgetScreen.tsx debtFreeLabel and its ⚠️ line, and MK-PL-F-036 weighGoals multiGoal.ts:137-140) and records (the card: "it never pays off when anything is still owed at month 600")',
    what_the_code_actually_does: 'Walks at most 600 months and reports anything still owed then as "never pays off". A debt that is shrinking every month, at 0% or at a positive rate, is called never. weighGoals then prints a payoff month 600 months out as if it were an answer.',
    governing_decisions: ['DEC-3523', 'DEC-0454'],
    plain_example: '$60,100 at 0% with $100 a month: 601 months, app says never. $100,000 at 6% with $501 a month: monthsToClear says 1,247 months, payoffPlan says never — and the Debts tab says the balance "grows faster than you pay it down" while it falls every month.' },
  () => {
    const big = [D({ remaining_balance: 100_000, interest_rate_apr: 0.06, minimum_monthly_payment: 501 })];
    expect(monthsToClear(100_000, 0.06, 501)).toBe(1247);
    expect(payoffPlan(big, 0, 'avalanche', NOW).neverPaysOff).toBe(false);
    expect(payoffPlan(big, 0, 'avalanche', NOW)).toMatchObject({ months: 1247, pastHorizon: false, stillOwed: 0 });
    // a payment that does not cover the interest IS never — proven in its first month, not at a stop
    expect(payoffPlan([D({ remaining_balance: 100_000, interest_rate_apr: 0.06, minimum_monthly_payment: 400 })], 0, 'avalanche', NOW)).toMatchObject({ neverPaysOff: true, months: 1 });
    // and the Plan's weigh-goals reader gives no payoff month for a plan that does not clear (it printed Oct 2076)
    const w = weighGoals({ dials: [], retirementMonthly: 0, extraDebtMonthly: 1, capacityMonthly: 0, baseInputs: null,
      liabilities: [D({ remaining_balance: 100_000, interest_rate_apr: 0.06, minimum_monthly_payment: 400 })], now: NOW });
    expect(w.debtPayoff).toBeNull();
  });
  test.failing('MK-CF-F-034 · the app until 2026-10-25, pinned: both witnesses "never", and weigh-goals printed Oct 2076 — no longer its answer (FIXED 2026-10-25)', () => {
    expect(payoffPlan([D({ remaining_balance: 100_000, interest_rate_apr: 0.06, minimum_monthly_payment: 501 })], 0, 'avalanche', NOW).neverPaysOff).toBe(true);
    expect(payoffPlan([D({ remaining_balance: 60_100, minimum_monthly_payment: 100 })], 0, 'avalanche', NOW)).toMatchObject({ neverPaysOff: true, months: 600 });
    // the Plan's weigh-goals reader then prints a payoff month 600 months out (Oct 2076) for a plan that "never" pays off
    const w = weighGoals({ dials: [], retirementMonthly: 0, extraDebtMonthly: 1, capacityMonthly: 0, baseInputs: null,
      liabilities: [D({ remaining_balance: 100_000, interest_rate_apr: 0.06, minimum_monthly_payment: 400 })], now: NOW });
    expect(w.debtPayoff?.month).toBe('Oct 2076');
  });
  test.failing('MK-CF-O-018 · twin — what the app gave until 2026-10-25 on the not-entered payment (kept)', () => {
    const r: any = theDebts({ debts: [D({ label: 'Visa', debt_type: 'CREDIT_CARD', remaining_balance: 3200, interest_rate_apr: 0.229, minimum_monthly_payment: 110 }),
      D({ label: 'Car loan', debt_type: 'AUTO', remaining_balance: 9800, interest_rate_apr: 0.064 })], now: NOW });
    expect(r.plan.neverPaysOff).toBe(true); expect(r.minimumMonthly).toBe(110); expect(Number.isNaN(r.paymentsMonthly)).toBe(true);
  });
});

// ═════ rules: part 9 has no NOT HELD verdict ═══════════════════════════════════════════════════════
// ═════ a guard must prove it looked ═════════════════════════════════════════════════════════════════
describe('coverage — every item of part 9 was measured', () => {
  test('75 of 75 package cases ran, each once', () => {
    expect(PART.cases.length).toBe(75);
    expect(RECORD.cases.length).toBe(PART.cases.length);
    expect(new Set(RECORD.cases.map((r) => r.case_id))).toEqual(new Set(PART.cases.map((c: any) => c.case_id)));
  });
  test('3 of 3 formula verdicts that are not RIGHT were classified', () => {
    const notRight = PART.formula_checks.filter((f: any) => f.verdict !== 'RIGHT').map((f: any) => f.id);
    expect(notRight.length).toBe(3); expect(PART.formula_checks.length).toBe(15);
    expect(new Set(RECORD.formula.map((f) => f.id))).toEqual(new Set(notRight));
  });
  test('0 of 0 NOT HELD rule verdicts: the part\'s 14 rule lines are 13 CANNOT TELL and 1 HELD', () => {
    expect(PART.rules_held.length).toBe(14);
    expect(PART.rules_held.filter((r: any) => r.verdict === 'NOT HELD')).toHaveLength(0);
    expect(PART.rules_held.filter((r: any) => r.verdict === 'CANNOT TELL')).toHaveLength(13);
  });
});
