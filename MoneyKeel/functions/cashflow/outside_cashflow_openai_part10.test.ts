/* THE OUTSIDE CASES, RUN AGAINST THE APP — Cash flow module, OpenAI package of 2026-10-24, PART 10 of 19 (debts: credit, kinds
 * of debt, a mortgage against a Treasury). Cards: MK-CF-F-031 creditUtilization · F-032 creditScoreBand · F-033 debtToIncome ·
 * F-035 debtKind · F-036 buildDebtState · F-037 inferDebtType · F-038 debtsFromOnboarding · F-041 getDebtState · F-042
 * mortgageOddsEffect · F-125 amortise · F-126 futureValue · F-229 balanceGrownTo · F-043 compareMortgageToTreasury.
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/
 * MoneyKeel_CashFlow_Independent_Audit/audit_results/MoneyKeel_CashFlow_Audit_Part_10.json. Every expected answer is READ FROM
 * THE PACKAGE (C(case_id).expected), never retyped; only the plain input names are mapped onto the app's fields. Results, case
 * by case: MoneyKeel/documents/audit/outside-test-cases/returned/results/cashflow_openai_part10_results.json
 *
 * MEASURED ONLY (2026-10-25): no app code, drawing, record or existing test was changed.
 * FIXED 2026-10-25 (FIX-BILLS) — the APP WRONG pins of MK-CF-F-031 (C03, C04), MK-CF-F-033 (C03, C04 and its caller) and MK-CF-F-042
 * (C04) flipped the file's own way: the case passes with the fix named, the app's old answer kept as test.failing, never deleted.
 *
 * Marks: AGREE (test on the reviewer's answer) · APP WRONG (test.failing on the reviewer's answer — it turns red when fixed,
 * with a twin test pinning what the app gives today) · REVIEWER WRONG (a passing test pinning the app's hand-checked answer,
 * the decision in its name) · NEEDS RULING (the app's answer pinned) · OUTSIDE DOMAIN (an input no caller can send: the app's
 * answer pinned, the caller named) · BLOCKED (test.skip, the missing contract named).
 *
 * INPUT NAMES MAPPED (the app's fields, never the answers):
 *   balance / limit → creditUtilization(balance, limit); debt_monthly / gross_monthly / homeowner → debtToIncome(...).
 *   A share → the function's ratio; status → status; guideline → guideline; REFUSES → no ratio (null).
 *   kind → DebtType (mortgage MORTGAGE, credit_card CREDIT_CARD, heloc HELOC, student STUDENT_LOAN; anything else as typed).
 *   A debt {name, balance, apr, minimum, override} → Debt {debt_id and label = name, remaining_balance (null kept), interest_
 *   rate_apr, minimum_monthly_payment (absent = never entered: undefined), monthly_payment}; buildDebtState's answers:
 *   balance → total_debt_balance, minimum → total_monthly_debt_service, planned_payment → total_actual_payment, highest_rate →
 *   highest_rate_debt.label, high_cost_balance → toxic_debt_balance.
 *   Sign-up answers {balance, apr_percent, minimum, name} → debtsFromOnboarding(uid, { debtBalance, debtRate, debtPayment,
 *   debtName }); apr_decimal → interest_rate_apr.
 *   getDebtState's supplied_result → the debts document storage hands back (the storage read, getUserDoc, is replaced by a
 *   stub that returns it; nothing else is mocked): {total} → one debt with that balance; {rate} → its yearly rate; null → no
 *   document stored; 0 → a stored document with no debts.
 *   mortgageOddsEffect {balance, apr, payment, extra, as_of} → its args with nowYear = as_of's year and a fixed retirement plan
 *   (the PAT plan of src/domain/debt/__tests__/mortgageOdds.test.ts, 200 paths) as base.
 *   amortise / futureValue are not exported: each is compiled from its own source text in mortgageVsTreasury.ts — the app's
 *   text, nothing retyped. compareMortgageToTreasury {balance, mortgage_rate, treasury_yield, payment, extra} → its args;
 *   gap_percentage_points → gapPoints, annual_full_balance_spread → annualDifference, heuristic paydown/treasury → direction
 *   paying-down-wins / treasuries-win.
 * TOLERANCES: money to 1e-6 dollars (toBeCloseTo …, 6), shares to 1e-12 — floating sums only; REFUSES = no number (null).
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

jest.mock('../../../src/domain/_shared/firestore', () => ({
  ...jest.requireActual('../../../src/domain/_shared/firestore'),
  getUserDoc: jest.fn(), setUserDoc: jest.fn(),
}));
import { getUserDoc } from '../../../src/domain/_shared/firestore';
import {
  creditUtilization, creditScoreBand, debtToIncome, debtKind, DEBT_KINDS, buildDebtState, inferDebtType, debtsFromOnboarding,
  getDebtState, monthsToClear, minimumDebtService, totalDebtMonthly, type Debt,
} from '../../../src/domain/debt';
import { mortgageOddsEffect } from '../../../src/domain/debt/mortgageOdds';
import { balanceGrownTo, compareMortgageToTreasury } from '../../../src/domain/debt/mortgageVsTreasury';
import { theCreditLine } from './credit-line';
import { dataGaps } from '../../../src/domain/gaps';
import type { RetirementInputs } from '../../../src/domain/retirement';

// ── the helpers the app does not export, compiled from their own source text ─────────────────────────
const MVT_FILE = path.join(__dirname, '../../../src/domain/debt/mortgageVsTreasury.ts');
const PRIVATE = ['amortise', 'futureValue'] as const;
const compiled = (() => {
  const text = fs.readFileSync(MVT_FILE, 'utf8');
  const pieces = PRIVATE.map((name) => {
    const at = text.search(new RegExp(`^function ${name}\\(`, 'm'));
    if (at < 0) throw new Error(`${name} not found in ${MVT_FILE}`);
    return text.slice(at, text.indexOf('\n}\n', at) + 3);
  });
  const js = ts.transpileModule(pieces.join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText;
  return { pieces, fns: new Function(`${js}\nreturn { ${PRIVATE.join(', ')} };`)() };
})();
const { amortise, futureValue } = compiled.fns as { amortise: (b: number, r: number, p: number) => { months: number; interest: number }; futureValue: (m: number, r: number, n: number) => number };

// ── the package, read as it came ────────────────────────────────────────────────────────────────────
type Mark = 'AGREE' | 'APP WRONG' | 'REVIEWER WRONG' | 'NEEDS RULING' | 'BLOCKED' | 'OUTSIDE DOMAIN' | 'FIXED' | 'DECIDED';   // FIXED / DECIDED (2026-10-25) run as plain tests
interface Meta { mapped: string; rests_on: string; note: string }
const PKG = path.join(__dirname, '../../documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/MoneyKeel_CashFlow_Independent_Audit/audit_results');
const PART = JSON.parse(fs.readFileSync(path.join(PKG, 'MoneyKeel_CashFlow_Audit_Part_10.json'), 'utf8'));
const C = (caseId: string): any => {
  const c = PART.cases.find((x: any) => x.case_id === caseId);
  if (!c) throw new Error(`no case ${caseId} in the package`);
  return c;
};
const plain = (v: unknown) => (v === undefined ? null : JSON.parse(JSON.stringify(v, (_k, x) => (x === undefined ? null : x))));
const RECORD: { cases: any[]; formula: any[]; rules: any[] } = { cases: [], formula: [], rules: [] };
const runner = (mark: Mark) => (mark === 'APP WRONG' ? test.failing : mark === 'BLOCKED' ? test.skip : test);
const kase = (caseId: string, mark: Mark, meta: Meta, fn: (c: any, seen: (v: unknown) => void) => void | Promise<void>) => {
  const c = C(caseId);
  const name = `${caseId} · ${c.kind} · ${c.title} [${mark}]`;
  const row: any = { case_id: caseId, mark, ...meta, test: name, actual: null };
  RECORD.cases.push(row);
  runner(mark)(name, async () => { await fn(c, (v: unknown) => { row.actual = plain(v); }); });
  // a failing or skipped case still records what the app gives
  if (mark !== 'AGREE') beforeAll(async () => { try { await fn(c, (v: unknown) => { row.actual = plain(v); }); } catch { /* recorded */ } });
};
const fcheck = (id: string, mark: Mark, meta: Record<string, unknown>, fn: () => void) => {
  const name = `${id} · formula verdict ${PART.formula_checks.find((f: any) => f.id === id)?.verdict} [${mark}]`;
  RECORD.formula.push({ id, mark, ...meta, test: name });
  runner(mark)(name, fn);
};
const rule = (dec: string, mark: Mark, meta: Record<string, unknown>, fn: () => void) => {
  const name = `${dec} · rule verdict NOT HELD [${mark}]`;
  RECORD.rules.push({ rule: dec, mark, ...meta, test: name });
  runner(mark)(name, fn);
};
afterAll(() => { if (process.env.CFR_OUT) fs.writeFileSync(process.env.CFR_OUT, JSON.stringify(RECORD, null, 1)); });

// ── helpers ─────────────────────────────────────────────────────────────────────────────────────────
const n = (v: any) => (v == null ? null : Number(v));
const ex = (e: any) => Number(e.exact);
const money = (got: unknown, want: any) => expect(got as number).toBeCloseTo(ex(want), 6);
const share = (got: unknown, want: any) => expect(got as number).toBeCloseTo(ex(want), 12);
const refuses = (v: unknown) => expect(v == null).toBe(true);
const KIND: Record<string, string> = { mortgage: 'MORTGAGE', credit_card: 'CREDIT_CARD', heloc: 'HELOC', student: 'STUDENT_LOAN' };
const debt = (x: any): Debt => ({
  debt_id: x.name, label: x.name, debt_type: 'OTHER', remaining_balance: x.balance === null ? (null as any) : n(x.balance)!,
  interest_rate_apr: n(x.apr) ?? 0, minimum_monthly_payment: x.minimum === undefined ? (undefined as any) : n(x.minimum)!,
  ...(x.override !== undefined ? { monthly_payment: n(x.override)! } : {}),
});
const DIRECTION: Record<string, string> = { paydown: 'paying-down-wins', treasury: 'treasuries-win' };
/** the retirement plan both odds runs start from — the PAT plan the app's own mortgage-odds test uses, fewer paths */
const PAT: RetirementInputs = {
  current_age: 58, retire_age: 65, horizon_age: 90, start_balance: 909_152, annual_contribution: 12_000, retire_monthly_spend_today: 5200,
  guaranteed_monthly_income: 0, guaranteed_start_age: 67, mean_return: 0.0585, vol_return: 0.0752, inflation: 0.025, seed: 42, paths: 200, now_year: 2026,
} as any;
const odds = (i: any, asOf: string) => mortgageOddsEffect({ base: PAT, balance: n(i.balance) ?? 10_000, annualRate: n(i.apr) ?? 0.06,
  monthlyPayment: n(i.payment) ?? 300, extraMonthly: n(i.extra)!, nowYear: Number((i.as_of ?? asOf).slice(0, 4)), nowMonth: Number((i.as_of ?? asOf).slice(5, 7)) });
/** once fixed, the app's OLD answer is kept as test.failing — never deleted (2026-10-25, FIX-BILLS) */
const before = (what: string, fn: () => void) => test.failing(`${what} — the app until 2026-10-25, pinned; no longer its answer (FIXED 2026-10-25)`, fn);

// ═════ MK-CF-F-031 creditUtilization ═══════════════════════════════════════════════════════════════
describe('MK-CF-F-031 creditUtilization — five cases', () => {
  const MAPPED = 'creditUtilization(balance, limit); share → ratio, status → status';
  const PRECISION = 'CLAUDE.md PRECISION and the precision-and-display standard §1 (Q49): nothing rounds inside a function; a percent shows to two decimals at display';
  kase('MK-CF-F-031-C01', 'AGREE', { mapped: MAPPED, rests_on: 'ordinary arithmetic', note: '$300 of $1,000 = 30%: good.' },
    (c, seen) => { const r = creditUtilization(n(c.inputs.balance)!, n(c.inputs.limit)!); seen(r); share(r.ratio, c.expected.share); expect(r.status).toBe(c.expected.status); });
  kase('MK-CF-F-031-C02', 'AGREE', { mapped: MAPPED, rests_on: 'ordinary arithmetic', note: '60%: high.' },
    (c, seen) => { const r = creditUtilization(n(c.inputs.balance)!, n(c.inputs.limit)!); seen(r); share(r.ratio, c.expected.share); expect(r.status).toBe(c.expected.status); });
  for (const [id, note] of [['MK-CF-F-031-C03', 'The status is right (caution, judged on 30.01%), but the share comes back rounded inside the function to 0.300 — "30.00%" beside a caution that starts above 30%.'],
    ['MK-CF-F-031-C04', 'The status is right (high), but the share comes back as 0.556 — "55.60%" where 55.64% is right.']] as const)
    kase(id, 'AGREE', { mapped: MAPPED, rests_on: `${PRECISION} — FIXED 2026-10-25 (FIX-BILLS): the share is kept at full precision`, note },
      (c, seen) => { const r = creditUtilization(n(c.inputs.balance)!, n(c.inputs.limit)!); seen(r); expect(r.status).toBe(c.expected.status); share(r.ratio, c.expected.share); });
  test('MK-CF-F-031 · FIXED 2026-10-25 — $364.90 of $1,000 is 0.3649, printed 36% where the Credit screen rounds to a whole percent (it read 37%)', () => {
    expect(creditUtilization(364.9, 1000).ratio).toBeCloseTo(0.3649, 12);
    expect(Math.round(creditUtilization(364.9, 1000).ratio * 100)).toBe(36);
    expect(creditUtilization(300.10, 1000)).toEqual({ ratio: 300.10 / 1000, status: 'caution' });
  });
  before('MK-CF-F-031-C03/C04 · twin — the status right, the share rounded to three decimals', () => {
    expect(creditUtilization(300.10, 1000)).toEqual({ ratio: 0.3, status: 'caution' });
    expect(creditUtilization(1731.17, 3111.43)).toEqual({ ratio: 0.556, status: 'high' });
    // a double rounding that moves the whole percent the Credit screen prints: 36.49% → 0.365 → "37%"
    expect(Math.round(creditUtilization(364.9, 1000).ratio * 100)).toBe(37);
  });
  kase('MK-CF-F-031-C05', 'OUTSIDE DOMAIN', { mapped: MAPPED, rests_on: 'Its only caller, MK-CF-O-006 theCreditLine (credit-line.ts, `if (!(limit > 0)) return { used: null, status: null }`), refuses before calling; CreditScreen.tsx draws nothing without a limit',
    note: 'Handed a $0 limit the helper says 0% and good, but no caller can hand it one: the door refuses with no ratio and no status, which is the reviewer\'s answer.' },
    (c, seen) => { const r = creditUtilization(n(c.inputs.balance)!, n(c.inputs.limit)!); seen(r); expect(r).toEqual({ ratio: 0, status: 'good' });
      expect(c.expected.state).toBe('REFUSES'); const door = theCreditLine({ balance: n(c.inputs.balance)!, limit: n(c.inputs.limit)! }); refuses(door.used); refuses(door.status); });
});

// ═════ MK-CF-F-032 creditScoreBand ═════════════════════════════════════════════════════════════════
describe('MK-CF-F-032 creditScoreBand — five cases', () => {
  for (const id of ['MK-CF-F-032-C01', 'MK-CF-F-032-C02', 'MK-CF-F-032-C03', 'MK-CF-F-032-C04', 'MK-CF-F-032-C05'])
    kase(id, 'AGREE', { mapped: 'creditScoreBand(score); band → label', rests_on: 'the written thresholds', note: 'Excellent 800+, Very good 740+, Good 670+, Fair 580+, Poor below — lower bounds inclusive.' },
      (c, seen) => { const r = creditScoreBand(c.inputs.score); seen(r); expect(r.label).toBe(c.expected.band); expect(r.good).toBe(c.expected.good); });
});

// ═════ MK-CF-F-033 debtToIncome ════════════════════════════════════════════════════════════════════
describe('MK-CF-F-033 debtToIncome — five cases', () => {
  const MAPPED = 'debtToIncome(debt_monthly, gross_monthly, homeowner); share → ratio';
  const run = (c: any) => debtToIncome(n(c.inputs.debt_monthly)!, n(c.inputs.gross_monthly)!, c.inputs.homeowner);
  for (const id of ['MK-CF-F-033-C01', 'MK-CF-F-033-C02'])
    kase(id, 'AGREE', { mapped: MAPPED, rests_on: 'ordinary arithmetic', note: 'At the guideline exactly: good.' },
      (c, seen) => { const r = run(c); seen(r); share(r.ratio, c.expected.share); share(r.guideline, c.expected.guideline); expect(r.status).toBe(c.expected.status); });
  for (const [id, note] of [['MK-CF-F-033-C03', 'Status (caution) and guideline agree; the share comes back rounded inside the function to 0.447 where 0.4468954… is right.'],
    ['MK-CF-F-033-C04', 'Status (high) and guideline agree; the share comes back as 0.378 where 0.3778140… is right.']] as const)
    kase(id, 'AGREE', { mapped: MAPPED, rests_on: 'CLAUDE.md PRECISION and the precision-and-display standard §1 (Q49): nothing rounds inside a function — FIXED 2026-10-25 (FIX-BILLS)', note },
      (c, seen) => { const r = run(c); seen(r); expect(r.status).toBe(c.expected.status); share(r.guideline, c.expected.guideline); share(r.ratio, c.expected.share); });
  before('MK-CF-F-033-C03/C04 · twin — the share rounded to three decimals', () => {
    expect(debtToIncome(2731.17, 6111.43, true)).toMatchObject({ ratio: 0.447, status: 'caution' });
    expect(debtToIncome(1931.17, 5111.43, false)).toMatchObject({ ratio: 0.378, status: 'high' });
  });
  kase('MK-CF-F-033-C05', 'OUTSIDE DOMAIN', { mapped: MAPPED, rests_on: 'Its only caller, GoalsScreen.tsx, draws the DEBT-TO-INCOME card only when `liabilities.length > 0 && grossMonthly > 0`',
    note: 'With no income the helper says 0% and good, but the one screen that calls it shows no card then.' },
    (c, seen) => { const r = run(c); seen(r); expect(r).toMatchObject({ ratio: 0, status: 'good' }); expect(c.expected.state).toBe('REFUSES'); });
});

// ═════ MK-CF-F-035 debtKind ════════════════════════════════════════════════════════════════════════
describe('MK-CF-F-035 debtKind — five cases', () => {
  const MAPPED = 'debtKind(kind) with kind → DebtType (mortgage MORTGAGE, credit_card CREDIT_CARD, heloc HELOC, student STUDENT_LOAN)';
  const BLOCK = 'The card never carried the kind-to-label table, so the reviewer gave no label to compare (records fix: print DEBT_KINDS on MK-CF-F-035\'s card). The app\'s answer is recorded and pinned below.';
  for (const id of ['MK-CF-F-035-C01', 'MK-CF-F-035-C02', 'MK-CF-F-035-C03', 'MK-CF-F-035-C04'])
    kase(id, 'BLOCKED', { mapped: MAPPED, rests_on: 'missing contract: the published kind-to-label/icon table', note: BLOCK },
      (c, seen) => { const r = debtKind(KIND[c.inputs.kind] ?? c.inputs.kind); seen(r); expect(c.expected.state).toBe('RULE UNCLEAR'); expect(r).toEqual(c.expected.readings.known_kind); });
  kase('MK-CF-F-035-C05', 'AGREE', { mapped: MAPPED, rests_on: 'the written rule ("nothing for a kind that is not on the list")', note: 'A kind not on the list gets nothing; its callers fall back (NetWorthScreen 🧾, DebtEditorSheet "Debt").' },
    (c, seen) => { const r = debtKind(c.inputs.kind); seen(r ?? null); expect(r ?? null).toBe(c.expected.readings.unknown_kind); });
  test('MK-CF-F-035 · the app\'s kind table, pinned for the next measurer (eight kinds)', () => {
    expect(DEBT_KINDS.map((k) => `${k.id}=${k.label}`)).toEqual(['MORTGAGE=Mortgage', 'HELOC=HELOC', 'STUDENT_LOAN=Student loan', 'CREDIT_CARD=Credit card',
      'AUTO=Auto loan', 'PERSONAL=Personal loan', 'MEDICAL=Medical', 'OTHER=Other']);
  });
});

// ═════ MK-CF-F-036 buildDebtState ══════════════════════════════════════════════════════════════════
describe('MK-CF-F-036 buildDebtState — five cases', () => {
  const MAPPED = 'buildDebtState(uid, debts); balance → total_debt_balance, minimum → total_monthly_debt_service, planned_payment → total_actual_payment, highest_rate → highest_rate_debt.label, high_cost_balance → toxic_debt_balance';
  const run = (c: any) => buildDebtState('u', (c.inputs.debts as any[]).map(debt));
  const check = (c: any, r: any) => { const e = c.expected;
    money(r.total_debt_balance, e.balance); expect(r.highest_rate_debt?.label).toBe(e.highest_rate); money(r.toxic_debt_balance, e.high_cost_balance);
    if (e.minimum) money(r.total_monthly_debt_service, e.minimum); if (e.planned_payment) money(r.total_actual_payment, e.planned_payment); };
  kase('MK-CF-F-036-C01', 'AGREE', { mapped: MAPPED, rests_on: 'ordinary arithmetic; TOXIC_APR 7%', note: '6% is not above 7%: no high-cost debt.' }, (c, seen) => { const r = run(c); seen(r); check(c, r); });
  kase('MK-CF-F-036-C02', 'AGREE', { mapped: MAPPED, rests_on: 'TOXIC_APR 7% (above, not at)', note: 'Exactly 7% is not above 7%.' }, (c, seen) => { const r = run(c); seen(r); check(c, r); });
  kase('MK-CF-F-036-C03', 'AGREE', { mapped: MAPPED, rests_on: 'ordinary arithmetic', note: '$11,353.79 owed; B at 12% the highest; A + B above 7% = $10,422.60.' }, (c, seen) => { const r = run(c); seen(r); check(c, r); });
  kase('MK-CF-F-036-C04', 'AGREE', { mapped: MAPPED, rests_on: 'the written rule (the first of equals)', note: 'A and B tie at 12%: A, the first.' }, (c, seen) => { const r = run(c); seen(r); check(c, r); });
  kase('MK-CF-F-036-C05', 'REVIEWER WRONG', { mapped: `${MAPPED}; balance null → remaining_balance null`,
    rests_on: 'DEC-3279e: "A missing balance is never $0: it is left out of the total and the amber box names the account" — the naming is MK-XS-F-002 dataGaps\'s, one place (tenet 4), not a flag on every sum',
    note: 'The known $1,000 is the total by DEC-3279e, and Net worth\'s amber box names B ("B has no balance — left out of what you owe until it has one"). The completeness lives in dataGaps, which Net worth reads beside this total.' },
    (c, seen) => { const r = run(c); seen(r); money(r.total_debt_balance, c.expected.known_balance_subtotal);
      const gaps = dataGaps([], null, Date.now(), [], [], (c.inputs.debts as any[]).map(debt));
      expect(gaps.filter((g) => g.kind === 'no-balance').map((g) => g.title)).toEqual(['B has no balance']); });
});

// ═════ MK-CF-F-037 inferDebtType · F-038 debtsFromOnboarding ═══════════════════════════════════════
describe('MK-CF-F-037 inferDebtType — five cases', () => {
  for (const id of ['MK-CF-F-037-C01', 'MK-CF-F-037-C02', 'MK-CF-F-037-C03', 'MK-CF-F-037-C04', 'MK-CF-F-037-C05'])
    kase(id, 'AGREE', { mapped: 'inferDebtType(name); the app\'s DebtType read in lower case (STUDENT_LOAN → student_loan)', rests_on: 'the written first-match order', note: 'Lower-cased, the first matching word wins: home equity before mortgage, a card word before medical.' },
      (c, seen) => { const r = inferDebtType(c.inputs.name); seen(r); expect(r.toLowerCase()).toBe(c.expected); });
});
describe('MK-CF-F-038 debtsFromOnboarding — five cases', () => {
  const MAPPED = 'debtsFromOnboarding(uid, { debtBalance: balance, debtRate: apr_percent, debtPayment: minimum, debtName: name }); apr_decimal → interest_rate_apr';
  for (const id of ['MK-CF-F-038-C01', 'MK-CF-F-038-C02', 'MK-CF-F-038-C03', 'MK-CF-F-038-C04', 'MK-CF-F-038-C05'])
    kase(id, 'AGREE', { mapped: MAPPED, rests_on: 'the written rule', note: 'A positive balance makes one debt, the rate ÷ 100 once, a blank name reads "Debt"; a $0 balance makes none.' },
      (c, seen) => { const i = c.inputs; const r = debtsFromOnboarding('u', { debtBalance: i.balance, debtRate: i.apr_percent, debtPayment: i.minimum, debtName: i.name }).debts; seen(r);
        expect(r).toHaveLength(c.expected.length);
        c.expected.forEach((e: any, k: number) => { money(r[k].remaining_balance, e.balance); share(r[k].interest_rate_apr, e.apr_decimal); money(r[k].minimum_monthly_payment, e.minimum); expect(r[k].label).toBe(e.name); }); });
});

// ═════ MK-CF-F-041 getDebtState ════════════════════════════════════════════════════════════════════
describe('MK-CF-F-041 getDebtState — five cases (storage replaced by a stub; the function is the app\'s)', () => {
  const MAPPED = 'supplied_result → the debts document storage returns (getUserDoc stubbed): {total} → one debt with that balance, {rate} → its rate, null → none stored, 0 → a stored document with no debts';
  const stored = (doc: any) => (getUserDoc as jest.Mock).mockResolvedValueOnce(doc);
  const one = (balance: number, rate = 0.05) => ({ user_id: 'u', debts: [{ debt_id: 'd', label: 'D', debt_type: 'OTHER', remaining_balance: balance, interest_rate_apr: rate, minimum_monthly_payment: 10 }] });
  kase('MK-CF-F-041-C01', 'AGREE', { mapped: MAPPED, rests_on: 'the written rule', note: 'The stored $1,000 comes back as the total.' },
    async (c, seen) => { stored(one(n(c.inputs.supplied_result.total)!)); const r = await getDebtState('u'); seen(r); money(r!.total_debt_balance, c.expected.total); });
  kase('MK-CF-F-041-C02', 'AGREE', { mapped: MAPPED, rests_on: 'the written rule', note: 'Nothing stored: no state (null), never a $0 one.' },
    async (c, seen) => { stored(null); const r = await getDebtState('u'); seen(r); expect(r).toBe(c.expected); });
  kase('MK-CF-F-041-C03', 'AGREE', { mapped: MAPPED, rests_on: 'the written rule', note: 'Every digit kept: $8,311.17391 at 17.3491%.' },
    async (c, seen) => { const s = c.inputs.supplied_result; stored(one(n(s.total)!, n(s.rate)!)); const r = await getDebtState('u'); seen(r);
      money(r!.total_debt_balance, c.expected.total); share(r!.highest_rate_debt!.interest_rate_apr, c.expected.rate); });
  kase('MK-CF-F-041-C04', 'AGREE', { mapped: MAPPED, rests_on: 'the written rule', note: 'A negative stored balance is passed through with its sign and its record (no editor can save one: DebtEditorSheet needs a balance above $0).' },
    async (c, seen) => { stored(one(n(c.inputs.supplied_result.total)!)); const r = await getDebtState('u'); seen(r);
      money(r!.total_debt_balance, c.expected.total); expect(r!.debts).toHaveLength(1); });
  kase('MK-CF-F-041-C05', 'AGREE', { mapped: MAPPED, rests_on: 'the written rule', note: 'A stored document with no debts is a known $0, distinct from nothing stored.' },
    async (c, seen) => { stored({ user_id: 'u', debts: [] }); const r = await getDebtState('u'); seen(r); expect(r).not.toBeNull(); money(r!.total_debt_balance, c.expected); });
});

// ═════ MK-CF-F-042 mortgageOddsEffect ══════════════════════════════════════════════════════════════
describe('MK-CF-F-042 mortgageOddsEffect — five cases', () => {
  const MAPPED = 'mortgageOddsEffect({ base: the PAT plan (200 paths), balance, annualRate: apr, monthlyPayment: payment, extraMonthly: extra, nowYear: as_of\'s year }); C01 gives only extra, so a $10,000 loan at 6% with $300 a month stands in';
  kase('MK-CF-F-042-C01', 'AGREE', { mapped: MAPPED, rests_on: 'the written rule', note: 'No extra: nothing to compare (null).' },
    (c, seen) => { const r = odds(c.inputs, c.as_of); seen(r); expect(r).toBe(c.expected); });
  kase('MK-CF-F-042-C02', 'AGREE', { mapped: MAPPED, rests_on: 'the written rule', note: '$50 and $70 both fall short of the $100 interest: null, no invented payoff year.' },
    (c, seen) => { const r = odds(c.inputs, c.as_of); seen(r); expect(r).toBe(c.expected); });
  kase('MK-CF-F-042-C03', 'AGREE', { mapped: MAPPED, rests_on: 'the reviewer\'s relational assertions', note: 'Two runs on one seed (the same market paths), payoff durations worked separately by monthsToClear, and no assumption that the odds rise.' },
    (c, seen) => { const i = c.inputs; const r = odds(i, c.as_of)!; seen(r); expect(c.expected.assertions).toHaveLength(3);
      // identical market paths: the same inputs give the same two answers
      expect(odds(i, c.as_of)).toEqual(r);
      // payoff durations computed separately
      const slow = monthsToClear(n(i.balance)!, n(i.apr)!, n(i.payment)!)!, fast = monthsToClear(n(i.balance)!, n(i.apr)!, n(i.payment)! + n(i.extra)!)!;
      // the year the LAST payment falls in, counted from this month (October 2026) — since 2026-10-25 (FIX-BILLS, MK-CF-F-042)
      expect(r.payoffYear).toBe(2026 + Math.floor((10 - 1 + slow - 1) / 12)); expect(r.fasterPayoffYear).toBe(2026 + Math.floor((10 - 1 + fast - 1) / 12));
      expect(r.before).toBeGreaterThanOrEqual(0); expect(r.after).toBeGreaterThanOrEqual(0); });
  kase('MK-CF-F-042-C04', 'AGREE', { mapped: `${MAPPED}; as_of 2026-12-24 → nowYear 2026, nowMonth 12 (FIXED 2026-10-25: the function is handed the month)`,
    rests_on: 'Settled by DEC-3523 tenet 1 and the function\'s own stated purpose ("the calendar year the LAST payment falls in", mortgageOdds.ts): the reviewer\'s calendar reading',
    note: 'In December 2026 the extra clears the loan in 11 payments, the last in October 2027 (or November, counting from January); the app says 2026, a year in which only one payment is left. The function is handed only the year, so it treats every start as January.' },
    (c, seen) => { const i = c.inputs; const r = odds(i, c.as_of)!; seen(r); expect(c.expected.state).toBe('RULE UNCLEAR');
      const fast = monthsToClear(n(i.balance)!, n(i.apr)!, n(i.payment)! + n(i.extra)!)!;
      expect(fast).toBe(11);
      expect(r.fasterPayoffYear).toBe(2027); });
  test('MK-CF-F-042 · FIXED 2026-10-25 — October 2026: $3,000 at 6% with $510 a month is 6 payments, October to March: the last falls in 2027', () => {
    expect(monthsToClear(3000, 0.06, 510)).toBe(6);
    expect(mortgageOddsEffect({ base: PAT, balance: 3000, annualRate: 0.06, monthlyPayment: 510, extraMonthly: 250, nowYear: 2026, nowMonth: 10 })!.payoffYear).toBe(2027);
    // counted from January, the same six payments end in June: 2026 (the year handed in is the year of the first payment)
    expect(mortgageOddsEffect({ base: PAT, balance: 3000, annualRate: 0.06, monthlyPayment: 510, extraMonthly: 250, nowYear: 2026, nowMonth: 1 })!.payoffYear).toBe(2026);
  });
  before('MK-CF-F-042-C04 · twin — December 2026 with 11 payments left said "2026", and October\'s 6 payments said 2026', () => {
    const i = C('MK-CF-F-042-C04').inputs;
    const r = mortgageOddsEffect({ base: PAT, balance: n(i.balance) ?? 10_000, annualRate: n(i.apr) ?? 0.06, monthlyPayment: n(i.payment) ?? 300, extraMonthly: n(i.extra)!, nowYear: 2026, nowMonth: 12 })!;
    expect(r.fasterPayoffYear).toBe(2026);
  });
  kase('MK-CF-F-042-C05', 'BLOCKED', { mapped: MAPPED, rests_on: 'missing contract: the retirement simulation\'s published equations (MK-PL simulate), which the outside judge did not have',
    note: 'The app returns two simulated chances; the reviewer declines to certify them without the simulation\'s contract. Nothing to compare until that contract is in the package.' },
    (c, seen) => { const r = odds(c.inputs, c.as_of); seen(r); expect(c.expected.state).toBe('REFUSES'); refuses(r); });
});

// ═════ MK-CF-F-125 amortise ════════════════════════════════════════════════════════════════════════
describe('MK-CF-F-125 amortise — five cases (compiled from the app\'s own text)', () => {
  const MAPPED = 'amortise(principal, apr_decimal, monthly_payment)';
  for (const id of ['MK-CF-F-125-C01', 'MK-CF-F-125-C02', 'MK-CF-F-125-C03', 'MK-CF-F-125-C04'])
    kase(id, 'AGREE', { mapped: MAPPED, rests_on: 'ordinary amortisation arithmetic', note: 'Month by month: interest = balance × rate ÷ 12, until the balance is gone; the interest added up.' },
      (c, seen) => { const i = c.inputs; const r = amortise(n(i.principal)!, n(i.apr_decimal)!, n(i.monthly_payment)!); seen(r);
        expect(r.months).toBe(ex(c.expected.months)); money(r.interest, c.expected.interest); });
  // FIXED 2026-10-25 (FIX-ROOM; tenets 1–2): amortise runs until the loan clears — the 1,200-month stop is gone
  kase('MK-CF-F-125-C05', 'FIXED', { mapped: MAPPED, rests_on: 'Its only caller, MK-CF-F-043 compareMortgageToTreasury, returns null for a rate of 0 or less before calling it (mortgageVsTreasury.ts, `!(annualRate > 0)`); the Debts tab hands it only a loan above 0% (BudgetScreen.tsx bigLoan)',
    note: 'FIXED 2026-10-25: run until the loan clears — 1,201 months, $0 interest (it stopped at 1,200 with $100 still owed). No caller hands it 0%; the same stop was reachable at a positive rate (the formula check).' },
    (c, seen) => { const i = c.inputs; const r = amortise(n(i.principal)!, n(i.apr_decimal)!, n(i.monthly_payment)!); seen(r);
      expect(r.months).toBe(ex(c.expected.months)); money(r.interest, c.expected.interest);
      expect(compareMortgageToTreasury({ balance: n(i.principal)!, annualRate: 0, monthlyPayment: n(i.monthly_payment)!, extraMonthly: 100, treasuryYield: 0.04 })).toBeNull(); });
  test.failing('MK-CF-F-125-C05 · the app until 2026-10-25, pinned: 1,200 months, $100 still owed — no longer its answer (FIXED 2026-10-25)', () => {
    expect(amortise(120_100, 0, 100)).toEqual({ months: 1200, interest: 0 });
  });
  // FIXED 2026-10-25 (FIX-ROOM; tenet 1, MK-CF-F-043's lifetime line): the last payment is only what is left plus that month's
  // interest. By hand: $10,000 at 6%, $501/month — after 21 payments 10,000 × 1.005^21 − 501 × (1.005^21 − 1) ÷ 0.005 = $40.11
  // is left; the 22nd payment is $40.11 × 1.005 = $40.31; the interest is 21 × 501 + 40.31 − 10,000 = $561.31.
  test('MK-CF-F-125 · the last payment is what is left plus its month\'s interest: $10,000 at 6%, $501/month → 22 payments, the last $40.31, interest $561.31 (FIXED 2026-10-25)', () => {
    const r = (amortise as any)(10_000, 0.06, 501) as { months: number; interest: number; lastPayment: number };
    const g = 1.005 ** 21, left = 10_000 * g - 501 * (g - 1) / 0.005;
    expect(r.months).toBe(22);
    expect(r.lastPayment).toBeCloseTo(left * 1.005, 9);
    expect(r.interest).toBeCloseTo(21 * 501 + left * 1.005 - 10_000, 9);
    expect([Math.round(r.lastPayment * 100) / 100, Math.round(r.interest * 100) / 100]).toEqual([40.31, 561.31]);
  });
});

// ═════ MK-CF-F-126 futureValue · F-229 balanceGrownTo ═════════════════════════════════════════════
const ZERO_RATE_CALLERS = 'No caller hands it 0%: sign-up\'s fv (src/onboarding/modules.tsx RetireOutlook) floors the rate at 1% (`Math.max(0.01, 0.07 − inflation)`), and compareMortgageToTreasury\'s Treasury yield is the live ten-year yield, refused at 0 or below (src/services/economicData.ts, `rate <= 0` → the 4.35% fallback)';
describe('MK-CF-F-126 futureValue — five cases (compiled from the app\'s own text)', () => {
  const MAPPED = 'futureValue(monthly_contribution, annual_rate, months)';
  for (const id of ['MK-CF-F-126-C01', 'MK-CF-F-126-C02', 'MK-CF-F-126-C03', 'MK-CF-F-126-C04'])
    kase(id, 'AGREE', { mapped: MAPPED, rests_on: 'ordinary annuity arithmetic', note: 'm × ((1 + r ÷ 12)^n − 1) ÷ (r ÷ 12), deposits at each month\'s end.' },
      (c, seen) => { const i = c.inputs; const r = futureValue(n(i.monthly_contribution)!, n(i.annual_rate)!, n(i.months)!); seen(r); money(r, c.expected); });
  // FIXED 2026-10-25 (FIX-ROOM): a 0% branch — the deposits themselves — though no caller sends 0% today
  kase('MK-CF-F-126-C05', 'FIXED', { mapped: MAPPED, rests_on: ZERO_RATE_CALLERS, note: 'FIXED 2026-10-25: at 0% the deposits themselves, $500 × 12 = $6,000 (it was 0 ÷ 0, NaN); no caller sends 0% today.' },
    (c, seen) => { const i = c.inputs; const r = futureValue(n(i.monthly_contribution)!, n(i.annual_rate)!, n(i.months)!); seen(r); money(r, c.expected); });
  test.failing('MK-CF-F-126-C05 · the app until 2026-10-25, pinned: 0 ÷ 0 at 0%, NaN — no longer its answer (FIXED 2026-10-25)', () => {
    expect(Number.isNaN(futureValue(500, 0, 12))).toBe(true);
  });
});
describe('MK-CF-F-229 balanceGrownTo — five cases', () => {
  const MAPPED = 'balanceGrownTo(initial_balance, monthly_contribution, annual_rate, months)';
  for (const id of ['MK-CF-F-229-C01', 'MK-CF-F-229-C02', 'MK-CF-F-229-C03', 'MK-CF-F-229-C04'])
    kase(id, 'AGREE', { mapped: MAPPED, rests_on: 'ordinary compound-growth arithmetic', note: 'start × (1 + r ÷ 12)^n + the contributions\' future value.' },
      (c, seen) => { const i = c.inputs; const r = balanceGrownTo(n(i.initial_balance)!, n(i.monthly_contribution)!, n(i.annual_rate)!, n(i.months)!); seen(r); money(r, c.expected); });
  kase('MK-CF-F-229-C05', 'FIXED', { mapped: MAPPED, rests_on: ZERO_RATE_CALLERS, note: 'FIXED 2026-10-25: $10,000 + $500 × 12 = $16,000, through futureValue\'s 0% branch (it was NaN); its one caller floors the rate at 1%.' },
    (c, seen) => { const i = c.inputs; const r = balanceGrownTo(n(i.initial_balance)!, n(i.monthly_contribution)!, n(i.annual_rate)!, n(i.months)!); seen(r); money(r, c.expected); });
  test.failing('MK-CF-F-229-C05 · the app until 2026-10-25, pinned: NaN at 0% — no longer its answer (FIXED 2026-10-25)', () => {
    expect(Number.isNaN(balanceGrownTo(10_000, 500, 0, 12))).toBe(true);
  });
});

// ═════ MK-CF-F-043 compareMortgageToTreasury ═══════════════════════════════════════════════════════
describe('MK-CF-F-043 compareMortgageToTreasury — five cases', () => {
  const MAPPED = 'compareMortgageToTreasury({ balance, annualRate: mortgage_rate, monthlyPayment: payment, extraMonthly: extra ?? 0, treasuryYield: treasury_yield }); gap → gapPoints, spread → annualDifference, heuristic → direction';
  const run = (i: any) => compareMortgageToTreasury({ balance: n(i.balance)!, annualRate: n(i.mortgage_rate)!, monthlyPayment: n(i.payment)!, extraMonthly: n(i.extra) ?? 0, treasuryYield: n(i.treasury_yield)! });
  for (const id of ['MK-CF-F-043-C01', 'MK-CF-F-043-C02', 'MK-CF-F-043-C03'])
    kase(id, 'AGREE', { mapped: MAPPED, rests_on: 'ordinary arithmetic; DEC-0160 (his: compare the mortgage rate with the ten-year yield)', note: 'Gap in points, the before-tax yearly spread on the whole balance, and which way it points.' },
      (c, seen) => { const r = run(c.inputs)!; seen(r); const e = c.expected;
        expect(r.gapPoints).toBeCloseTo(ex(e.gap_percentage_points), 12); money(r.annualDifference, e.annual_full_balance_spread); expect(r.direction).toBe(DIRECTION[e.heuristic]); });
  // DECIDED 2026-10-25 (the lead's ruling under tenet 7 and DEC-0160): after federal tax when the bracket is known; before tax,
  // and said so, when it is not. treasury_federal_tax_rate → federalRate (the argument added 2026-10-25); a mortgage interest
  // deduction is not counted (mortgage_interest_deductible false here), and the card says so.
  kase('MK-CF-F-043-C04', 'DECIDED', { mapped: `${MAPPED}; treasury_federal_tax_rate → federalRate (added 2026-10-25); mortgage_interest_deductible false — the mortgage stays at its own rate`,
    rests_on: 'The lead\'s ruling of 2026-10-25 under tenet 7 (DEC-3523) and DEC-0160 (his: "the net saving or cost")',
    note: 'DECIDED 2026-10-25: at the 24% bracket the Treasury keeps 3.268%, below the 4.10% mortgage, so paying down wins by 0.83 points (about $1,440 a year on $173,111). With no bracket known: before tax, −0.20 points, "too close to call", and the card says "before tax".' },
    (c, seen) => { const i = c.inputs;
      const r = compareMortgageToTreasury({ balance: n(i.balance)!, annualRate: n(i.mortgage_rate)!, monthlyPayment: n(i.payment)!, extraMonthly: 0, treasuryYield: n(i.treasury_yield)!, federalRate: n(i.treasury_federal_tax_rate) })!; seen(r);
      expect(r.basis).toBe('after-tax');
      expect(r.treasuryAfterTaxPct! / 100).toBeCloseTo(ex(c.expected.after_tax_treasury_yield), 12);
      expect(r.gapPoints).toBe(0.83); expect(r.direction).toBe('paying-down-wins'); expect(Math.round(r.annualDifference)).toBe(1440);
      const before = run(i)!; expect(before.basis).toBe('before-tax'); expect(before.gapPoints).toBeCloseTo(ex(c.expected.pretax_gap_pp), 12); expect(before.direction).toBe('too-close'); });
  kase('MK-CF-F-043-C05', 'AGREE', { mapped: MAPPED, rests_on: 'the written rule (nothing unless the rate is above zero)', note: 'A 0% mortgage: no comparison (null).' },
    (c, seen) => { const r = run(c.inputs); seen(r); expect(r).toBe(c.expected); });
});

// ═════ the reviewer's formula verdicts in part 10 that are not RIGHT (9 of 13) ══════════════════════
describe('formula checks — the reviewer’s 9 verdicts that are not RIGHT', () => {
  fcheck('MK-CF-F-031', 'OUTSIDE DOMAIN', { records_or_app_fix: 'records fix: the card should say a positive limit is the caller\'s condition (theCreditLine refuses first). Separately, cases C03/C04 found an app fix: the share is rounded to three decimals inside the function (Q49).',
    what_the_code_actually_does: 'Handed a $0 limit it gives 0% and good; its only caller, MK-CF-O-006 theCreditLine, returns no ratio and no status for a limit of $0 or less before calling it, and the Credit screen then says "Enter your total limit to see your utilization."',
    governing_decisions: ['DEC-3523'], plain_example: '$500 owed, no limit entered: the Credit screen shows no percent — the reviewer\'s refusal.' },
  () => { const d = theCreditLine({ balance: 500, limit: 0 }); expect(d.used).toBeNull(); expect(d.status).toBeNull(); });
  fcheck('MK-CF-F-033', 'AGREE', { fixed: '2026-10-25 (FIX-BILLS): GoalsScreen hands debtToIncome minimumDebtService (DEC-0641); the share is not rounded inside', records_or_app_fix: 'app fix at its one caller, GoalsScreen.tsx (`debtToIncome(totalDebtMonthly(liabilities), …)`): hand it minimumDebtService. The zero-income point is outside the domain (the card is drawn only when grossMonthly > 0). Cases C03/C04 add the three-decimal rounding (Q49).',
    what_the_code_actually_does: 'The Plan · Goals DEBT-TO-INCOME card divides the payments the person CHOSE (totalDebtMonthly) by gross income. DEC-0641 keeps the minimum for debt-to-income ("measured on the obligation and not on what someone chooses to pay"), and debt/index.ts itself marks minimumDebtService "Use for DEBT-TO-INCOME".',
    governing_decisions: ['DEC-0641'], plain_example: 'A card with a $200 minimum paid at $600 and $5,000 a month gross: the card reads 12% where the obligation is 4%.' },
  () => {
    const card = [{ debt_id: 'c', label: 'Card', debt_type: 'CREDIT_CARD', remaining_balance: 5000, interest_rate_apr: 0.2, minimum_monthly_payment: 200, monthly_payment: 600 }] as Debt[];
    // what GoalsScreen hands the helper, read from its own text: the minimums (DEC-0641), and the card reads 4%
    const goals = fs.readFileSync(path.join(__dirname, '../../../src/screens/GoalsScreen.tsx'), 'utf8');
    expect(goals).toMatch(/debtToIncome\(minimumDebtService\(liabilities\)/);
    expect(goals).not.toMatch(/debtToIncome\(totalDebtMonthly\(/);
    expect(debtToIncome(minimumDebtService(card), 5000, false).ratio).toBeCloseTo(0.04, 12);
  });
  test.failing('MK-CF-F-033 · the app until 2026-10-25, pinned: the Goals screen handed debtToIncome the chosen payments — 12% where the obligation is 4% — no longer its answer (FIXED 2026-10-25)', () => {
    const goals = fs.readFileSync(path.join(__dirname, '../../../src/screens/GoalsScreen.tsx'), 'utf8');
    expect(goals).toMatch(/debtToIncome\(totalDebtMonthly\(liabilities\)/);
  });
  test('MK-CF-F-033 · the arithmetic on the chosen payments, kept for the record (not what the card uses since 2026-10-25)', () => {
    const card = [{ debt_id: 'c', label: 'Card', debt_type: 'CREDIT_CARD', remaining_balance: 5000, interest_rate_apr: 0.2, minimum_monthly_payment: 200, monthly_payment: 600 }] as Debt[];
    expect(debtToIncome(totalDebtMonthly(card), 5000, false)).toMatchObject({ ratio: 0.12, status: 'good' });
    expect(debtToIncome(minimumDebtService(card), 5000, false)).toMatchObject({ ratio: 0.04, status: 'good' });
    expect(debtToIncome(totalDebtMonthly([{ ...card[0], monthly_payment: 1300 }]), 5000, false).status).toBe('caution');
  });
  fcheck('MK-CF-F-035', 'BLOCKED', { records_or_app_fix: 'records fix: print the eight-kind table (DEBT_KINDS) on the card',
    what_the_code_actually_does: 'debtKind looks a kind up in DEBT_KINDS, eight kinds with a label and an icon, and gives nothing for a kind not on it.',
    governing_decisions: ['DEC-0020'], plain_example: 'AUTO → "Auto loan" 🚗; an unknown kind → nothing (the callers print 🧾 / "Debt").' },
  () => { expect(debtKind('AUTO')?.label).toBe('Auto loan'); });
  fcheck('MK-CF-F-036', 'REVIEWER WRONG', { records_or_app_fix: 'records fix: the code header\'s formula for MK-CF-F-036 says "rate > 10%" and "round(…, 2 dp)"; the code is rate above TOXIC_APR (7%) with no rounding, as the package card says — the header and the code disagree',
    what_the_code_actually_does: 'The total is the known balances (DEC-3279e); a debt with no balance is named by MK-XS-F-002 dataGaps on Net worth. A missing rate cannot reach the ranking: the debt editor writes a blank rate as 0 (DebtEditorSheet: num(apr) ÷ 100).',
    governing_decisions: ['DEC-3279e'], plain_example: '$1,000 known + B with no balance: total $1,000, and Net worth\'s amber box reads "B has no balance".' },
  () => { const g = dataGaps([], null, Date.now(), [], [], [{ debt_id: 'b', label: 'B', remaining_balance: null as any }]); expect(g.map((x) => x.kind)).toEqual(['no-balance']); });
  fcheck('MK-CF-F-042', 'BLOCKED', { records_or_app_fix: 'records: the outside judge needs the retirement simulation\'s published contract (MK-PL simulate). Separately, case C04 is APP WRONG: the payoff year ignores the current month (app fix, mortgageOdds.ts — hand it the month, not only the year).',
    what_the_code_actually_does: 'Two seeded simulation runs; the payoff year = this year + floor((months − 1) ÷ 12), which is right only when the count starts in January.',
    governing_decisions: ['DEC-0364', 'DEC-3523'], plain_example: 'December 2026, 11 payments left with the extra: the screen says the loan clears in 2026; it clears in 2027.' },
  () => { expect(mortgageOddsEffect({ base: PAT, balance: 7311.17, annualRate: 0.0319, monthlyPayment: 611.43, extraMonthly: 0, nowYear: 2026, nowMonth: 10 })).toBeNull(); });
  // FIXED 2026-10-25 (FIX-ROOM; tenets 1–2): amortise runs until the loan clears, 1,247 months; a loan still owing after 12,000
  // months (a thousand years) is reported as never clearing, and the card then says there is no lifetime figure
  fcheck('MK-CF-F-125', 'FIXED', { records_or_app_fix: 'FIXED 2026-10-25: amortise runs to the month the loan clears (1,247 here); the lifetime line is built on it. Records: the card.',
    what_the_code_actually_does: 'At a positive rate a payment just above the interest runs past 1,200 months; amortise stops there and hands back 1,200 as if the loan had cleared, and compareMortgageToTreasury prints a lifetime difference built on it. The 0% case of the package cannot reach it (C05).',
    governing_decisions: ['DEC-3523'], plain_example: '$100,000 at 6% with $501 a month: 1,247 months (monthsToClear); amortise says 1,200, with about $20,700 still owed.' },
  () => { expect(monthsToClear(100_000, 0.06, 501)).toBe(1247); expect(amortise(100_000, 0.06, 501).months).toBe(1247); });
  test.failing('MK-CF-F-125 · twin — what the app gave until 2026-10-25 on that loan, and the lifetime line it fed — no longer its answer (FIXED 2026-10-25)', () => {
    const a = amortise(100_000, 0.06, 501); expect(a.months).toBe(1200);
    // what is still owed after 1,200 payments, worked by the same month-by-month rule
    let b = 100_000; for (let m = 0; m < 1200; m++) b = b * (1 + 0.06 / 12) - 501;
    expect(b).toBeGreaterThan(20_000); expect(b).toBeLessThan(21_000);
    const cmp = compareMortgageToTreasury({ balance: 100_000, annualRate: 0.06, monthlyPayment: 501, extraMonthly: 100, treasuryYield: 0.04 })!;
    const fast = monthsToClear(100_000, 0.06, 601)!;
    expect(cmp.lifetimeDifference).toBeCloseTo(futureValue(601, 0.04, 1200 - fast) - futureValue(100, 0.04, 1200), 6);
  });
  fcheck('MK-CF-F-126', 'OUTSIDE DOMAIN', { records_or_app_fix: 'none needed for any screen today; a 0% branch (m × n) is optional hardening, and the card could state the callers\' rate floor',
    what_the_code_actually_does: `No 0% branch: 0 ÷ 0 at 0%. ${ZERO_RATE_CALLERS}.`,
    governing_decisions: ['DEC-7795'], plain_example: '$500 a month for 12 months at 0% would be NaN; no screen can ask for it.' },
  () => { expect(futureValue(500, 0.01, 12)).toBeGreaterThan(6000); });
  fcheck('MK-CF-F-229', 'OUTSIDE DOMAIN', { records_or_app_fix: 'as MK-CF-F-126',
    what_the_code_actually_does: `Inherits futureValue's 0 ÷ 0 at 0%. ${ZERO_RATE_CALLERS}.`,
    governing_decisions: ['DEC-7795'], plain_example: '$10,000 and $500 a month for a year at 0% would be NaN; sign-up\'s rate is at least 1%.' },
  () => { expect(balanceGrownTo(10_000, 500, 0.01, 12)).toBeGreaterThan(16_000); });
  fcheck('MK-CF-F-043', 'DECIDED', { records_or_app_fix: 'DECIDED 2026-10-25 (the lead, tenet 7, DEC-0160): after federal tax when the bracket is known (the Income summary\'s), before tax and said so otherwise; built in compareMortgageToTreasury and MortgageRateCompare.tsx; records: the card. The last-payment point stays open.',
    what_the_code_actually_does: 'Compares the two rates before tax and says so nowhere; the lifetime line counts the last payment in full (amortise lets the balance go below $0). Treasury interest is federally taxed and state-free; mortgage interest is deductible only for those who itemise.',
    governing_decisions: ['DEC-0160', 'DEC-0161', 'DEC-3523'], plain_example: '4.10% mortgage vs 4.30% Treasury: "too close to call" before tax; after a 24% federal rate the Treasury pays 3.27%, so paying down wins by 0.83 points.' },
  () => { expect(compareMortgageToTreasury({ balance: 173_111.17, annualRate: 0.041, monthlyPayment: 1131.43, extraMonthly: 0, treasuryYield: 0.043 })!.direction).toBe('too-close');
    expect(compareMortgageToTreasury({ balance: 173_111.17, annualRate: 0.041, monthlyPayment: 1131.43, extraMonthly: 0, treasuryYield: 0.043, federalRate: 0.24 })!.direction).toBe('paying-down-wins'); });
});

// ═════ the reviewer's rule verdicts in part 10 that are NOT HELD (1 of 8) ═══════════════════════════
describe('rules — the reviewer’s 1 NOT HELD verdict', () => {
  rule('DEC-7795', 'REVIEWER WRONG', { cards: ['MK-CF-F-126', 'MK-CF-F-229'],
    what_the_code_actually_does: 'DEC-7795 says sign-up reads one growth formula, balanceGrownTo, and it does (src/onboarding/modules.tsx fv). The 0% gap the reviewer names cannot arise there: the rate is floored at 1%. The decision\'s own figure — $300,000 and $1,500 a month at 4.6% for 15 years — comes out of balanceGrownTo by the ordinary formula.',
    governing_decisions: ['DEC-7795', 'DEC-3523'], plain_example: '$300,000 and $1,500 a month at 4.6% for 15 years: start × (1 + r/12)^180 + the contributions\' future value.' },
  () => {
    const r = 0.046 / 12, m = 180;
    expect(balanceGrownTo(300_000, 1_500, 0.046, m)).toBeCloseTo(300_000 * (1 + r) ** m + 1_500 * (((1 + r) ** m - 1) / r), 6);
  });
});

// ═════ a guard must prove it looked ═════════════════════════════════════════════════════════════════
describe('coverage — every item of part 10 was measured', () => {
  test('65 of 65 package cases ran, each once', () => {
    expect(PART.cases.length).toBe(65);
    expect(RECORD.cases.length).toBe(PART.cases.length);
    expect(new Set(RECORD.cases.map((r) => r.case_id))).toEqual(new Set(PART.cases.map((c: any) => c.case_id)));
  });
  test('9 of 9 formula verdicts that are not RIGHT were classified', () => {
    const notRight = PART.formula_checks.filter((f: any) => f.verdict !== 'RIGHT').map((f: any) => f.id);
    expect(notRight.length).toBe(9); expect(PART.formula_checks.length).toBe(13);
    expect(new Set(RECORD.formula.map((f) => f.id))).toEqual(new Set(notRight));
  });
  test('1 of 1 NOT HELD rule verdict was classified', () => {
    const notHeld = PART.rules_held.filter((r: any) => r.verdict === 'NOT HELD').map((r: any) => r.rule);
    expect(notHeld).toEqual(['DEC-7795']); expect(PART.rules_held.length).toBe(8);
    expect(RECORD.rules.map((r) => r.rule)).toEqual(notHeld);
  });
  test('the two private helpers were compiled from the app’s own text', () => {
    expect(compiled.pieces).toHaveLength(2);
    compiled.pieces.forEach((p, i) => expect(p).toMatch(new RegExp(`^function ${PRIVATE[i]}\\(`)));
  });
});
