/* THE OUTSIDE CASES, RUN AGAINST THE APP — Cash flow module, OpenAI package of 2026-10-24, PART 12 of 19 (transactions: undo,
 * labels, cash effect, income from holdings, review flags). Cards: MK-CF-F-114 undoSnapshot · F-115 restoreUndo · F-116
 * inverseOf · F-117 txnLabel · F-118 cashEffect · F-119 investmentIncomeAnnual · F-108 isMoneyOut · F-131 normPayee ·
 * F-162 daysApart · F-109 reviewTransactions · F-110 flagComparisonText.
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/
 * MoneyKeel_CashFlow_Independent_Audit/audit_results/MoneyKeel_CashFlow_Audit_Part_12.json. Every expected answer is READ FROM
 * THE PACKAGE (C(case_id).expected), never retyped; only the plain input names are mapped onto the app's fields. Results, case
 * by case: MoneyKeel/documents/audit/outside-test-cases/returned/results/cashflow_openai_part12_results.json
 *
 * MEASURED ONLY (2026-10-25): no app code, drawing, record or existing test was changed.
 *
 * Marks: as in outside_cashflow_openai_part11.test.ts — AGREE (test on the reviewer's answer) · APP WRONG (test.failing on the
 * reviewer's answer) · REVIEWER WRONG (a passing pin of the app's answer, the decision in its name, the reviewer's answer shown
 * to differ) · NEEDS RULING (the app's answer pinned) · OUTSIDE DOMAIN (an input no caller can send, the caller named, the
 * app's answer pinned) · BLOCKED (test.skip, the missing contract named).
 *
 * INPUT NAMES MAPPED (the app's fields, never the answers):
 *   kind → TxnType in capitals (deposit DEPOSIT, transfer TRANSFER, fee FEE, dividend DIVIDEND, withdrawal WITHDRAWAL, buy BUY,
 *   sale SELL, interest INTEREST, opening_position OPENING_POSITION); direction in/out → 'IN'/'OUT', null → absent; primary →
 *   account_id, counter / counter_account → counter_account_id; amount → amount (null → absent: not on record); signed_cash →
 *   a DIVIDEND's stored amount, its sign kept; payee → the record's note; linked true → source 'connected', otherwise a
 *   hand-typed record (no source); history / prior_money_outs → earlier WITHDRAWAL records on account A (prior amounts dated
 *   2026-10-01 onward, as the case notes say); known_payees → knownPayees for A. as_of → now = the as-of day at midnight UTC,
 *   the instant the function reads every record's date-only string as. A snapshot's accounts get one lot each, so the deep
 *   copy can be tested.
 *   normPayee and daysApart are not exported: each is compiled from its own source text in src/domain/transactions/flags.ts.
 * TOLERANCES: money to 1e-6 dollars (toBeCloseTo …, 6); REFUSES = no number (null), never 0.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import {
  applyTransaction, undoSnapshot, restoreUndo, inverseOf, txnLabel, cashEffect, investmentIncomeAnnual,
} from '../../../src/domain/transactions';
import { isMoneyOut, reviewTransactions, flagComparisonText } from '../../../src/domain/transactions/flags';
import { median } from '../../../src/domain/_shared/num';
import { amountNotOnRecord } from '../../../Calculation Module code/engines/ledger';

// ── the helpers the app does not export, compiled from their own source text ─────────────────────────
const FLAGS_FILE = path.join(__dirname, '../../../src/domain/transactions/flags.ts');
const PRIVATE = ['normPayee', 'daysApart'] as const;
const compiled = (() => {
  const text = fs.readFileSync(FLAGS_FILE, 'utf8');
  const pieces = PRIVATE.map((name) => {
    const at = text.search(new RegExp(`^const ${name} = `, 'm'));
    if (at < 0) throw new Error(`${name} not found in ${FLAGS_FILE}`);
    return text.slice(at, text.indexOf(';\n', at) + 2);
  });
  const js = ts.transpileModule(pieces.join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText;
  return { pieces, fns: new Function(`${js}\nreturn { ${PRIVATE.join(', ')} };`)() };
})();
const { normPayee, daysApart } = compiled.fns as Record<string, (...a: any[]) => any>;

// ── the package, read as it came ────────────────────────────────────────────────────────────────────
type Mark = 'AGREE' | 'APP WRONG' | 'REVIEWER WRONG' | 'NEEDS RULING' | 'BLOCKED' | 'OUTSIDE DOMAIN';
interface Meta { mapped: string; rests_on: string; note: string }
const PKG = path.join(__dirname, '../../documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/MoneyKeel_CashFlow_Independent_Audit/audit_results');
const PART = JSON.parse(fs.readFileSync(path.join(PKG, 'MoneyKeel_CashFlow_Audit_Part_12.json'), 'utf8'));
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
  if (mark === 'BLOCKED') { try { fn(c, seen); } catch { /* the answer is recorded; the case cannot be asserted */ } }
  runner(mark)(name, () => fn(c, seen));
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
const TYPE = (k: string) => (k === 'sale' ? 'SELL' : String(k).toUpperCase());
const DIR = (d: any) => (d ? String(d).toUpperCase() : undefined);
let seq = 0;
const rec = (o: any): any => ({ id: `T${++seq}`, created_at: '2026-10-24T12:00:00.000Z', date: '2026-10-17', account_id: 'A', ...o });
const fromCase = (i: any): any => rec({ type: TYPE(i.kind), ...(i.amount != null ? { amount: n(i.amount) } : {}), ...(DIR(i.direction) ? { direction: DIR(i.direction) } : {}),
  ...(i.primary ? { account_id: i.primary } : {}), ...(i.counter ?? i.counter_account ? { counter_account_id: i.counter ?? i.counter_account } : {}),
  ...(i.shares != null ? { ticker: 'XYZ', shares: n(i.shares), price: n(i.price) } : {}), ...(i.fee != null ? { fee: n(i.fee), fee_in_price: false } : {}) });
const withLots = (accts: any[]) => accts.map((a, i) => ({ asset_id: a.id, label: a.id, kind: 'brokerage', tax_bucket: 'TAXABLE', target_return: 0, balance: n(a.balance),
  positions: [{ position_id: `p${i}`, ticker: 'AAA', lots: [{ lot_id: `L${i}`, shares: 10, cost_per_share: 100, purchase_date: '2026-01-02' }] }] }));
const MAP_SNAP = 'accounts [{id, balance}] → AssetAccounts with one lot each (10 AAA at $100) so the copy’s depth can be tested; primary → account_id, counter → counter_account_id';

// ═════ MK-CF-F-114 undoSnapshot ════════════════════════════════════════════════════════════════════
describe('MK-CF-F-114 undoSnapshot — five cases', () => {
  for (const id of ['MK-CF-F-114-C01', 'MK-CF-F-114-C02', 'MK-CF-F-114-C03', 'MK-CF-F-114-C04', 'MK-CF-F-114-C05'])
    kase(id, 'AGREE', { mapped: MAP_SNAP, rests_on: 'written formula', note: 'Deep copies of the touched accounts only, taken before the change; a transfer to the same account is copied once (a Set).' },
      (c, seen) => {
        const accts = withLots(c.inputs.accounts);
        const snap = undoSnapshot(accts as any, rec({ type: 'TRANSFER', amount: 1, account_id: c.inputs.primary, ...(c.inputs.counter ? { counter_account_id: c.inputs.counter } : {}) }));
        seen({ affected_ids: snap.map((a: any) => a.asset_id) });
        expect(snap.map((a: any) => a.asset_id)).toEqual(c.expected.affected_ids);
        // deep: changing the original's lot afterwards leaves the copy as it was
        const before = JSON.stringify(snap);
        accts.forEach((a) => { a.positions[0].lots[0].shares = 999; a.balance = -1; });
        expect(JSON.stringify(snap)).toBe(before);
      });
});

// ═════ MK-CF-F-115 restoreUndo ═════════════════════════════════════════════════════════════════════
describe('MK-CF-F-115 restoreUndo — five cases', () => {
  for (const id of ['MK-CF-F-115-C01', 'MK-CF-F-115-C02', 'MK-CF-F-115-C03', 'MK-CF-F-115-C04', 'MK-CF-F-115-C05'])
    kase(id, 'AGREE', { mapped: `${MAP_SNAP}; the record carries undo_prev = undoSnapshot before; then every account is changed`, rests_on: 'written formula', note: 'The touched accounts come back exactly as saved; every other account is left as it now is.' },
      (c, seen) => {
        const accts = withLots(c.inputs.accounts);
        const t = rec({ type: 'TRANSFER', amount: 1, account_id: c.inputs.primary, ...(c.inputs.counter ? { counter_account_id: c.inputs.counter } : {}) });
        t.undo_prev = undoSnapshot(accts as any, t);
        const changed = accts.map((a) => ({ ...a, balance: a.balance! + 7.31, positions: [{ ...a.positions[0], lots: [{ ...a.positions[0].lots[0], shares: 3 }] }] }));
        const back: any[] = restoreUndo(changed as any, t);
        const ids = new Set(c.expected.affected_ids);
        seen({ affected_ids: back.filter((a, i) => JSON.stringify(a) === JSON.stringify(accts[i])).map((a) => a.asset_id) });
        back.forEach((a, i) => expect(a).toEqual(ids.has(a.asset_id) ? accts[i] : changed[i]));
      });
});

// ═════ MK-CF-F-116 inverseOf ═══════════════════════════════════════════════════════════════════════
describe('MK-CF-F-116 inverseOf — five cases', () => {
  const MAPPED = 'kind/amount/direction/primary/counter → a record; the undo is inverseOf(record); its signed cash is cashEffect (moneyIntoAccount, the one rule for a stored amount)';
  const shape = (u: any) => ({ kind: String(u.type).toLowerCase(), primary: u.account_id, counter: u.counter_account_id ?? null, amount: u.amount, direction: u.direction ? String(u.direction).toLowerCase() : null });
  kase('MK-CF-F-116-C01', 'AGREE', { mapped: MAPPED, rests_on: 'DEC-6993; DEC-6796', note: 'A $500 deposit that came in is undone by a $500 withdrawal going out.' },
    (c, seen) => { const u = inverseOf(fromCase(c.inputs))!; seen(shape(u)); expect(String(u.type).toLowerCase()).toBe(c.expected.kind); money(u.amount, c.expected.amount); expect(String(u.direction).toLowerCase()).toBe(c.expected.direction); });
  kase('MK-CF-F-116-C02', 'AGREE', { mapped: MAPPED, rests_on: 'DEC-6993', note: 'A transfer is undone by swapping its two accounts and keeping its direction.' },
    (c, seen) => {
      const u = inverseOf(fromCase(c.inputs))!; seen(shape(u));
      expect(String(u.type).toLowerCase()).toBe(c.expected.kind); expect(u.account_id).toBe(c.expected.primary); expect(u.counter_account_id).toBe(c.expected.counter);
      money(u.amount, c.expected.amount); expect(String(u.direction).toLowerCase()).toBe(c.expected.direction);
    });
  kase('MK-CF-F-116-C03', 'AGREE', { mapped: MAPPED, rests_on: 'DEC-6796', note: 'A $7.31 fee refund that came in is undone by $7.31 going out.' },
    (c, seen) => { const u = inverseOf(fromCase(c.inputs))!; seen({ ...shape(u), signed_cash_effect: cashEffect(u) }); money(cashEffect(u), c.expected.signed_cash_effect); });
  kase('MK-CF-F-116-C04', 'AGREE', { mapped: MAPPED, rests_on: 'DEC-6796 (a stored sign is kept); ledger.ts moneyIntoAccount',
    note: 'The reviewer feared a double reversal. Measured: a −$51.43 dividend with no direction is undone by a −$51.43 withdrawal, which the one rule reads as +$51.43 — once. Applied then undone, the cash is back to the cent.' },
  (c, seen) => {
    const t = fromCase(c.inputs); const u = inverseOf(t)!;
    const acct: any = { asset_id: 'A', label: 'A', kind: 'brokerage', tax_bucket: 'TAXABLE', target_return: 0, balance: 1000, cash_balance: 1000, source: 'manual' };
    const after: any = applyTransaction(applyTransaction([acct], t), u)[0];
    seen({ ...shape(u), signed_cash_effect: cashEffect(u), cash_after_apply_and_undo: after.cash_balance });
    money(cashEffect(u), c.expected.signed_cash_effect);
    expect(after.cash_balance).toBeCloseTo(1000, 6);
  });
  kase('MK-CF-F-116-C05', 'AGREE', { mapped: `${MAPPED}; buy 10 at $100 with a $5 fee`, rests_on: 'written formula', note: 'A buy has no made-up opposite; only its saved snapshot can undo it.' },
    (c, seen) => { const u = inverseOf(fromCase(c.inputs)); seen(u); expect(c.expected).toBeNull(); refuses(u); });
});

// ═════ MK-CF-F-117 txnLabel ════════════════════════════════════════════════════════════════════════
describe('MK-CF-F-117 txnLabel — five cases', () => {
  const MAPPED = 'transaction_kind → TxnType in capitals';
  const BLOCK = 'The missing contract is an approved label list. txnLabel’s 13 labels are in the code (transactions/index.ts:965); only "Buy" and "Dividend" print as activity rows on an approved drawing (account page v01, DEC-6457). "Deposit" and "Transfer" are drawn on the trade sheet v03 and record-activity v01, both NOT APPROVED (design record rows 70 and 73); "Interest" as a row only on record-activity v01; "Opening holding" on no drawing.';
  for (const id of ['MK-CF-F-117-C01', 'MK-CF-F-117-C02', 'MK-CF-F-117-C03', 'MK-CF-F-117-C04'])
    kase(id, 'BLOCKED', { mapped: MAPPED, rests_on: 'missing contract: his approval of the activity labels', note: BLOCK },
      (c, seen) => { const got = txnLabel(TYPE(c.inputs.transaction_kind) as any); seen(got); expect(c.expected.state).toBe('RULE UNCLEAR'); expect(got).toBe('approved label'); });
  kase('MK-CF-F-117-C05', 'OUTSIDE DOMAIN', { mapped: 'transaction_kind passed as given', rests_on: 'caller domain: TxnType is a closed list (index.ts:12-23); a broker word the app does not know is stored as ADJUSTMENT with its own word (index.ts:58-60)',
    note: 'App gives the kind back as written (the reviewer’s fallback reading); no stored record can carry a kind outside the list.' },
  (c, seen) => { const got = txnLabel(c.inputs.transaction_kind); seen(got); expect(got).toBe(c.expected.readings.fallback); });
});

// ═════ MK-CF-F-118 cashEffect ══════════════════════════════════════════════════════════════════════
describe('MK-CF-F-118 cashEffect — five cases', () => {
  const MAPPED = 'transaction → a record {type, amount (null → absent), shares, price, multiplier (stamped), fee (fee_in_price false), direction}';
  const one = (t: any) => rec({ type: TYPE(t.kind), ...(t.amount != null ? { amount: n(t.amount) } : {}), ...(n(t.shares) ? { ticker: 'XYZ', shares: n(t.shares), price: n(t.price) } : {}),
    ...(n(t.multiplier) && n(t.multiplier) !== 1 ? { multiplier: n(t.multiplier) } : {}), ...(n(t.fee_not_in_price) ? { fee: n(t.fee_not_in_price), fee_in_price: false } : {}), ...(DIR(t.direction) ? { direction: DIR(t.direction) } : {}) });
  for (const id of ['MK-CF-F-118-C01', 'MK-CF-F-118-C02', 'MK-CF-F-118-C03', 'MK-CF-F-118-C04'])
    kase(id, 'AGREE', { mapped: MAPPED, rests_on: 'DEC-6796; DEC-7596; DEC-7602', note: 'A deposit +$1,000; a −$50 dividend −$50; a mini-option buy −(3.17 × 2.43 × 10 + 1.19); a sale 7.31 × 98.17 − 3.43.' },
      (c, seen) => { const got = cashEffect(one(c.inputs.transaction)); seen(got); money(got, c.expected); });
  kase('MK-CF-F-118-C05', 'REVIEWER WRONG', { mapped: MAPPED, rests_on: 'DEC-6674 (under his DEC-3523 tenet 3); account.ts:195 (noAmount = amountNotOnRecord)',
    note: 'cashEffect gives 0 — "no effect on the totals" — and the door names the amount as not on record beside it (theAccount’s noAmount, account.ts:195), so the account page shows a dash, never $0 (DEC-6674). The holding’s activity sheet prints no amount for 0 (PerformanceScreen.tsx:1146) and tradesAfter reads 0 as no proceeds (performance/index.ts:2672).' },
  (c, seen) => {
    const t = one(c.inputs.transaction); const got = cashEffect(t); seen({ cash_effect: got, amount_not_on_record: amountNotOnRecord(t) });
    expect(got).toBe(0); expect(amountNotOnRecord(t)).toBe(true);
    expect(c.expected.state).toBe('REFUSES');   // the reviewer's answer differs in form, not on any screen
  });
});

// ═════ MK-CF-F-119 investmentIncomeAnnual ══════════════════════════════════════════════════════════
describe('MK-CF-F-119 investmentIncomeAnnual — five cases (a function nothing calls)', () => {
  const MAPPED = 'records [{date, signed_cash, account, reinvested}] → DIVIDEND records {date, amount = signed_cash, account_id, reinvested}; as_of → now = new Date(as_of) (midnight UTC, the instant a date-only record is read as)';
  const run = (c: any) => investmentIncomeAnnual(c.inputs.records.map((r: any) => rec({ type: 'DIVIDEND', date: r.date, amount: n(r.signed_cash), account_id: r.account, reinvested: r.reinvested })), new Date(c.as_of));
  const NO_CALLER = 'investmentIncomeAnnual has no call site: TaxOrganizerScreen.tsx:11 and IncomeDetailScreen.tsx:12 import it and never call it (its own record: "Called by … nothing").';
  for (const id of ['MK-CF-F-119-C01', 'MK-CF-F-119-C02', 'MK-CF-F-119-C03'])
    kase(id, 'AGREE', { mapped: MAPPED, rests_on: 'DEC-6796 (a −$51.43 reversal cancels)', note: `Cash payouts in the year, reinvested ones left out, a reversal subtracted. ${NO_CALLER}` },
      (c, seen) => { const got = run(c); seen(got); money(got, c.expected); });
  kase('MK-CF-F-119-C04', 'AGREE', { mapped: MAPPED, rests_on: 'written formula', note: `With now at the as-of day’s midnight UTC the window starts on 2025-10-24 and the payout of that day counts: $424.62. With the device clock at 3 pm in California the start moves past that payout — the first day depends on the hour. ${NO_CALLER}` },
    (c, seen) => { const got = run(c); seen(got); money(got, c.expected); });
  kase('MK-CF-F-119-C05', 'OUTSIDE DOMAIN', { mapped: MAPPED, rests_on: 'no caller (see note)', note: `App counts a payout dated tomorrow, $1,000 — the window has no end at today. ${NO_CALLER}` },
    (c, seen) => { const got = run(c); seen(got); money(got, c.formula_gives); expect(ex(c.expected)).toBe(0); });
});

// ═════ MK-CF-F-108 isMoneyOut ══════════════════════════════════════════════════════════════════════
describe('MK-CF-F-108 isMoneyOut — five cases', () => {
  const MAPPED = 'kind/amount/direction/counter_account → a record';
  for (const id of ['MK-CF-F-108-C01', 'MK-CF-F-108-C02', 'MK-CF-F-108-C03', 'MK-CF-F-108-C04', 'MK-CF-F-108-C05'])
    kase(id, 'AGREE', { mapped: MAPPED, rests_on: 'DEC-6796', note: 'Money out unless the one rule reads money in: a fee refund and a −$51.43 withdrawal are not money out; a transfer between two of the person’s accounts is not; no amount reads by its kind.' },
      (c, seen) => { const got = isMoneyOut(fromCase(c.inputs)); seen(got); expect(got).toBe(c.expected); });
});

// ═════ MK-CF-F-131 normPayee · MK-CF-F-162 daysApart ═══════════════════════════════════════════════
describe('MK-CF-F-131 normPayee — five cases', () => {
  for (const id of ['MK-CF-F-131-C01', 'MK-CF-F-131-C02', 'MK-CF-F-131-C03', 'MK-CF-F-131-C04', 'MK-CF-F-131-C05'])
    kase(id, 'AGREE', { mapped: 'payee → the note', rests_on: 'written formula', note: 'Outer spaces trimmed, lower case, inner spacing kept, nothing becomes empty.' },
      (c, seen) => { const got = normPayee(c.inputs.payee); seen(got); expect(got).toBe(c.expected); });
});
describe('MK-CF-F-162 daysApart — five cases', () => {
  for (const id of ['MK-CF-F-162-C01', 'MK-CF-F-162-C02', 'MK-CF-F-162-C03', 'MK-CF-F-162-C04', 'MK-CF-F-162-C05'])
    kase(id, 'AGREE', { mapped: 'from, to → the two dates', rests_on: 'written formula', note: 'Whole calendar days between two dates, whichever comes first (leap day counted).' },
      (c, seen) => { const got = daysApart(c.inputs.from, c.inputs.to); seen(got); money(got, c.expected); });
});

// ═════ MK-CF-F-109 reviewTransactions ══════════════════════════════════════════════════════════════
describe('MK-CF-F-109 reviewTransactions — five cases', () => {
  const MAPPED = 'new / history → WITHDRAWAL records on A with the payee as the note; linked → source connected; prior_money_outs → earlier WITHDRAWALs on A dated 2026-10-01 onward with no payee; known_payees → knownPayees for A';
  const out = (x: any, linked: boolean) => rec({ type: 'WITHDRAWAL', account_id: x.account ?? 'A', date: x.date, amount: n(x.amount), note: x.payee, ...(linked ? { source: 'connected' } : {}) });
  const run = (c: any) => {
    const i = c.inputs; let k = 0;
    const history = [...(i.history ?? []).map((h: any) => out({ account: 'A', ...h }, !!i.linked)),
      ...(i.prior_money_outs ?? []).map((a: any) => out({ account: 'A', date: `2026-10-0${++k}`, amount: a }, !!i.linked))];
    return reviewTransactions([out({ account: 'A', ...i.new }, !!i.linked)], { history, knownPayees: i.known_payees ? { A: i.known_payees } : {}, makeId: () => 'flag', now: new Date('2026-10-24T12:00:00Z') });
  };
  const brief = (f: any[]) => f.map((x) => ({ reason: x.reason, comparison: x.comparison, amount: x.amount }));
  kase('MK-CF-F-109-C01', 'AGREE', { mapped: MAPPED, rests_on: 'Build-47 walk row 19 (flags.ts:219-224)', note: 'Same account, same $100, same payee once tidied, a day apart: a possible duplicate — hand-typed rows included.' },
    (c, seen) => { const f = run(c); seen(brief(f)); expect(f[0]?.reason).toBe(c.expected.flag); });
  kase('MK-CF-F-109-C02', 'AGREE', { mapped: MAPPED, rests_on: 'FCC detailed design v1.1, F10 rule 1', note: 'Under five past withdrawals, the flat $1,000 line: $1,200 is unusually large.' },
    (c, seen) => { const f = run(c); seen(brief(f)); expect(f[0]?.reason).toBe(c.expected.flag); });
  kase('MK-CF-F-109-C03', 'AGREE', { mapped: MAPPED, rests_on: 'FCC detailed design v1.1, F10 rule 1', note: 'Middle of five is $151.43; $831.17 is at least 3 × that and at least $500.' },
    (c, seen) => { const f = run(c); seen(brief(f)); expect(f[0]?.reason).toBe(c.expected.flag); money(f[0]?.comparison, c.expected.median); });
  kase('MK-CF-F-109-C04', 'REVIEWER WRONG', { mapped: MAPPED, rests_on: 'FCC detailed design v1.1 (2026-07-06), F10 row: "MANUAL-ENTRY RULE … transactions the user typed by hand are NEVER flagged"; DEC-1134 (his) retired the Worth a look screen',
    note: 'A hand-typed $311.17 to a new payee gets no flag: his approved F10 design never questions a number the person typed; only a possible duplicate covers hand-typed rows. The card’s words (rule 2 "LINKED account only", then "otherwise") read as if rule 3 covered hand-typed rows — a records fix.' },
  (c, seen) => { const f = run(c); seen(brief(f)); expect(f).toEqual([]); expect(c.expected.flag).toBe('first_time_payee'); });
  kase('MK-CF-F-109-C05', 'AGREE', { mapped: MAPPED, rests_on: 'the ordinary median (the mean of the two middle values of an even count — the reviewer’s own "ordinary median 250")',
    note: 'The reviewer wrote RULE UNCLEAR on the even median. The app’s median of 100…500 is $250, so $600 is under 3 × 250 and not unusually large (the reviewer’s "mean_middle_250" reading). The record is then flagged as a first-time payee, because the case gives no earlier payee named Known.' },
  (c, seen) => {
    const f = run(c); const m = median(c.inputs.prior_money_outs.map(Number)); seen({ flags: brief(f), median_used: m });
    expect(c.expected.state).toBe('RULE UNCLEAR');
    money(m, c.formula_gives.readings.mean);
    expect(f.some((x) => x.reason === 'unusually_large')).toBe(false);
  });
});

// ═════ MK-CF-F-110 flagComparisonText ══════════════════════════════════════════════════════════════
describe('MK-CF-F-110 flagComparisonText — five cases (a function nothing calls)', () => {
  const MAPPED = 'flag → a TxnFlag {reason, comparison = typical, amount, transaction_ids (count of them for odd_pattern)}';
  const NO_CALLER = 'flagComparisonText has no caller: the Worth a look screen was retired by his DEC-1134 and its Insights card on 2026-10-02 (insights/index.ts:118).';
  const flag = (i: any): any => ({ flag_id: 'f', transaction_ids: Array.from({ length: i.count ?? 1 }, (_v, k) => `T${k}`), account_id: 'A', reason: i.flag,
    comparison: n(i.typical), amount: n(i.amount ?? i.total ?? 0), payee: null, date: '2026-10-17', status: 'open', created_at: '2026-10-24T00:00:00Z' });
  kase('MK-CF-F-110-C01', 'AGREE', { mapped: MAPPED, rests_on: 'fixed template (flags.ts)', note: `One fixed sentence for a possible duplicate. ${NO_CALLER}` },
    (c, seen) => { const s = flagComparisonText(flag(c.inputs)); seen(s); expect(s).toBe(flagComparisonText(flag(c.inputs))); expect(s).toMatch(/same charge twice/); });
  kase('MK-CF-F-110-C02', 'AGREE', { mapped: MAPPED, rests_on: 'fixed template (flags.ts)', note: `One fixed sentence for a first-time payee. ${NO_CALLER}` },
    (c, seen) => { const s = flagComparisonText(flag(c.inputs)); seen(s); expect(s).toBe('First time we’ve seen this payee on this account.'); });   // ’ since 2026-10-30 (DEC-8336 carried to src/domain)
  kase('MK-CF-F-110-C03', 'AGREE', { mapped: MAPPED, rests_on: 'rounding once, at display', note: `$831.43 ÷ $173.17 = 4.80, said as 5 times about $173. ${NO_CALLER}` },
    (c, seen) => { const s = flagComparisonText(flag(c.inputs)); seen(s); expect(s).toContain(c.expected.typical_shown); expect(s).toContain(`${c.expected.times_shown.exact} times`); });
  kase('MK-CF-F-110-C04', 'AGREE', { mapped: MAPPED, rests_on: 'rounding once, at display', note: `3 withdrawals, $1,731 together. ${NO_CALLER}` },
    (c, seen) => { const s = flagComparisonText(flag(c.inputs)); seen(s); expect(s).toContain(`${c.expected.count_shown.exact} withdrawals`); expect(s).toContain(c.expected.total_shown); });
  kase('MK-CF-F-110-C05', 'OUTSIDE DOMAIN', { mapped: MAPPED, rests_on: 'no caller (see note)', note: `The words say "over $1,000" where the rule flags $1,000 exactly (flags.ts LARGE_COLD_START, amount >= 1000) — wrong words, shown nowhere. ${NO_CALLER}` },
    (c, seen) => { const s = flagComparisonText(flag(c.inputs)); seen(s); expect(s).toContain(c.formula_gives.text_says); expect(s).not.toContain(c.expected.text_must_say); });
});

// ═════ the reviewer's formula verdicts in part 12 (6 of 11 not RIGHT) ══════════════════════════════
const SRC = (rel: string) => fs.readFileSync(path.join(__dirname, '../../../', rel), 'utf8');
describe('formula checks — the reviewer’s 6 card verdicts that are not RIGHT', () => {
  fcheck('MK-CF-F-116', 'REVIEWER WRONG', { records_or_app_fix: 'records fix: the rule text',
    what_the_code_actually_does: 'A record with no direction keeps its stored sign and is read by its kind’s way (moneyIntoAccount); its undo is the opposite kind with the same stored amount, so it moves the money back once. A transfer swaps its accounts and keeps its direction (DEC-6993).',
    governing_decisions: ['DEC-6796', 'DEC-6993'], plain_example: 'A −$51.43 dividend on $1,000 cash: $948.57; undone: $1,000.00 — not $896.86.' },
  () => {
    const acct: any = { asset_id: 'A', label: 'A', kind: 'brokerage', tax_bucket: 'TAXABLE', target_return: 0, balance: 1000, cash_balance: 1000, source: 'manual' };
    const t = rec({ type: 'DIVIDEND', amount: -51.43 });
    const once: any = applyTransaction([acct], t)[0]; const back: any = applyTransaction([once], inverseOf(t)!)[0];
    expect(once.cash_balance).toBeCloseTo(948.57, 6); expect(back.cash_balance).toBeCloseTo(1000, 6);
  });
  fcheck('MK-CF-F-117', 'BLOCKED', { records_or_app_fix: 'records fix: the rule text (put the 13 labels on the card) — then his approval of the labels not yet drawn on an approved screen',
    what_the_code_actually_does: 'txnLabel reads a fixed table of 13 labels (Opening holding, Opening cash, Buy, Sell, Deposit, Withdrawal, Transfer, Transfer shares, Broker adjustment, Dividend, Interest, Coupon, Fee) and gives an unknown kind back as written.',
    governing_decisions: ['DEC-6457'], plain_example: 'DEPOSIT reads "Deposit" — on the trade sheet v03 drawing, which is not approved.' },
  () => { expect(txnLabel('DEPOSIT')).toBe('approved label'); });
  fcheck('MK-CF-F-118', 'REVIEWER WRONG', { records_or_app_fix: 'records fix: the rule text (0 is "no effect on the totals"; the missing amount is named at the door)',
    what_the_code_actually_does: 'cashEffect gives 0 for an amount not on record; the account page’s door marks the same row noAmount (amountNotOnRecord) and shows a dash (DEC-6674). An amount-only sale comes only from bond, CD and other-investment sales, which record no fee; a fee on record is taken off where a sale’s proceeds are counted (tradesAfter, DEC-6873).',
    governing_decisions: ['DEC-6674', 'DEC-3523 tenet 3', 'DEC-7596'], plain_example: 'Interest sent with no amount: the activity row shows a dash, not $0.' },
  () => { const t = rec({ type: 'INTEREST' }); expect(cashEffect(t)).toBe(0); expect(amountNotOnRecord(t)).toBe(true); });
  fcheck('MK-CF-F-119', 'OUTSIDE DOMAIN', { records_or_app_fix: 'records fix: the rule text (and drop the two unused imports, or bound the window at today and name missing amounts before anything calls it)',
    what_the_code_actually_does: 'It counts cash payouts from a year before now with no end at today and drops a missing amount silently — and nothing calls it.',
    governing_decisions: ['DEC-6796', 'DEC-7171', 'DEC-3523 tenet 3'], plain_example: 'A $1,000 payout dated tomorrow counts as this year’s income — on no screen.' },
  () => {
    for (const f of ['src/screens/TaxOrganizerScreen.tsx', 'src/screens/IncomeDetailScreen.tsx']) {
      const s = SRC(f); expect(s).toMatch(/import \{ investmentIncomeAnnual \}/); expect(s).not.toMatch(/investmentIncomeAnnual\(/);
    }
  });
  fcheck('MK-CF-F-109', 'REVIEWER WRONG', { records_or_app_fix: 'records fix: the rule text (rules 2–4 run on linked accounts only; the middle value of an even count is the mean of the two middle ones)',
    what_the_code_actually_does: 'Duplicates are checked on every record; size, first-time payee and odd pattern on linked records only, as his F10 design says; the middle value is the ordinary median. The flags are stored and shown nowhere since his DEC-1134 retired Worth a look.',
    governing_decisions: ['FCC detailed design v1.1 F10', 'DEC-1134', 'DEC-0317'], plain_example: 'A hand-typed $311.17 to a new payee: no flag. Earlier $100–$500 withdrawals: middle value $250.' },
  () => {
    const f = reviewTransactions([rec({ type: 'WITHDRAWAL', amount: 311.17, note: 'New' })], { history: [], makeId: () => 'x' });
    expect(f).toEqual([]); expect(median([100, 150, 200, 300, 400, 500])).toBe(250);
  });
  fcheck('MK-CF-F-110', 'OUTSIDE DOMAIN', { records_or_app_fix: 'records fix: the rule text (if the screen returns, the words must say "$1,000 or more")',
    what_the_code_actually_does: 'The cold-start sentence says "over $1,000" while the rule flags $1,000 exactly — and nothing calls the function.',
    governing_decisions: ['DEC-1134', 'DEC-3523 tenet 8'], plain_example: 'A $1,000 withdrawal flagged with the words "anything over $1,000".' },
  () => {
    const callers = ['src/screens', 'src/components', 'app'].flatMap((d) => {
      const walk = (p: string): string[] => fs.statSync(p).isDirectory() ? fs.readdirSync(p).flatMap((x) => walk(path.join(p, x))) : [p];
      return walk(path.join(__dirname, '../../../', d)).filter((p) => /\.tsx?$/.test(p) && !/__tests__|\.test\./.test(p));
    });
    expect(callers.length).toBeGreaterThan(50);   // a guard must prove it looked
    expect(callers.filter((p) => /flagComparisonText\(/.test(fs.readFileSync(p, 'utf8')))).toEqual([]);
  });
});

// ═════ a guard must prove it looked ═════════════════════════════════════════════════════════════════
describe('coverage — every item of part 12 was measured', () => {
  test('55 of 55 package cases ran, each once', () => {
    expect(PART.cases.length).toBe(55);
    expect(RECORD.cases.length).toBe(PART.cases.length);
    expect(new Set(RECORD.cases.map((r) => r.case_id))).toEqual(new Set(PART.cases.map((c: any) => c.case_id)));
  });
  test('6 of 6 formula verdicts that are not RIGHT were classified', () => {
    const notRight = PART.formula_checks.filter((f: any) => f.verdict !== 'RIGHT').map((f: any) => f.id);
    expect(notRight.length).toBe(6); expect(PART.formula_checks.length).toBe(11);
    expect(new Set(RECORD.formula.map((f) => f.id))).toEqual(new Set(notRight));
  });
  test('0 of 0 NOT HELD rule verdicts — part 12 has none (9 rules: 3 HELD, 6 CANNOT TELL)', () => {
    expect(PART.rules_held.length).toBe(9);
    expect(PART.rules_held.filter((r: any) => r.verdict === 'NOT HELD').length).toBe(0);
    expect(RECORD.rules.length).toBe(0);
  });
  test('the two private helpers were compiled from the app’s own text', () => {
    expect(compiled.pieces.length).toBe(2);
    compiled.pieces.forEach((p, i) => expect(p).toMatch(new RegExp(`^const ${PRIVATE[i]} = `)));
  });
});
