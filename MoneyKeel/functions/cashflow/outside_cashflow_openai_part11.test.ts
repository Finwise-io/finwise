/* THE OUTSIDE CASES, RUN AGAINST THE APP — Cash flow module, OpenAI package of 2026-10-24, PART 11 of 19 (recording a
 * transaction: cash, holdings, undo). Cards: MK-CF-F-132 map · F-133 cashOf · F-134 usesSleeve · F-135 availableCash ·
 * F-136 bumpCash · F-137 findPos · F-138 addLot · F-139 removeShares · F-111 applyTransaction · F-222 tradeCash ·
 * F-223 tradeMultiplierOf · F-224 openingRecordsOf · F-112 makeTransaction · F-113 affectedAccountIds.
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/
 * MoneyKeel_CashFlow_Independent_Audit/audit_results/MoneyKeel_CashFlow_Audit_Part_11.json. Every expected answer is READ FROM
 * THE PACKAGE (C(case_id).expected), never retyped; only the plain input names are mapped onto the app's fields. Results, case
 * by case: MoneyKeel/documents/audit/outside-test-cases/returned/results/cashflow_openai_part11_results.json
 *
 * MEASURED ONLY (2026-10-25): no app code, drawing, record or existing test was changed.
 *
 * FIXED 2026-10-25 (FIX-TRADES) — every APP WRONG pin of this part flipped the file's own way: the case passes on the reviewer's
 * (or the settled) answer with the ruling in its name, and the app's old answer is kept beside it as test.failing ("the app until
 * 2026-10-25, pinned … no longer its answer"), never deleted. F-223 reads a ticker the account does not hold from the record's
 * type and shares per contract (the trade sheet asks them); F-138 files a holding nothing identifies in no class and marks it
 * asked (DEC-2160); F-139 never erases a purchase whose share count is not on record; the open question (Available cash after a
 * buy in an imported account whose cash was never entered) is ruled by the lead: "not entered", never refused on (tenet 3).
 *
 * Marks: AGREE (test on the reviewer's answer) · APP WRONG (test.failing on the reviewer's answer — it turns red when fixed) ·
 * REVIEWER WRONG (a passing test pinning the app's hand-checked answer, the decision in its name, and proving the reviewer's
 * answer differs) · NEEDS RULING (the app's answer pinned) · OUTSIDE DOMAIN (an input no caller can send: the app's answer
 * pinned, the caller named) · BLOCKED (test.skip, the missing contract named).
 *
 * INPUT NAMES MAPPED (the app's fields, never the answers):
 *   An account {kind, balance, cash, typed_total | derived} → AssetAccount: kind "cash" → kind 'checking', tax_bucket 'CASH';
 *   "investment" → 'brokerage', 'TAXABLE'; "property" → 'home', 'PROPERTY'; cash → cash_balance (null = never entered, the
 *   field absent, as the app stores it); derived → derive_balance true; typed_total → a hand-typed total (source 'manual').
 *   cash_delta → the money moved (bumpCash's delta, tradeCash's gross); fee_not_in_price → the trade's fee the price does not
 *   carry (tradeCash's fee; on a record: fee, fee_in_price false). A holding {id, ticker} → a Position {position_id, ticker}.
 *   A lot {date, shares, price} → {purchase_date, shares, cost_per_share}; old_basis → one lot whose cost per share is
 *   old_basis ÷ old_shares. A transaction kind → the TxnType (deposit DEPOSIT, dividend DIVIDEND, buy BUY, sale SELL);
 *   multiplier → the record's stamped multiplier (recordTransaction stamps tradeMultiplierOf's answer).
 *   holding_kind stock → Position kind 'stocks_etf'; option → kind 'options', shares_per_contract → multiplier.
 *   The private helpers (map, cashOf, usesSleeve, bumpCash, tradeCash, findPos, addLot, removeShares) are not exported: each is
 *   compiled from its own source text in src/domain/transactions/index.ts with the functions it imports handed in under their
 *   own names — the app's text, nothing retyped.
 * TOLERANCES: money to 1e-6 dollars (toBeCloseTo …, 6) — floating sums only; REFUSES = no number (null), never 0.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import {
  applyTransaction, availableCash, tradeMultiplierOf, openingRecordsOf, makeTransaction, affectedAccountIds,
} from '../../../src/domain/transactions';
import { newEntityId } from '../../../src/domain/_shared/ids';
import { assetClassOf, holdingTagFor, holdingClassOf, accountAllowsTicker } from '../../../src/domain/assets';
import { assetClassForSymbol } from '../../../src/domain/import/holdingsImport';
import { purchaseDateOnRecord, totalShares } from '../../../src/domain/performance';
import { classifyHoldingClass } from '../../../Calculation Module code/engines/holding-class';

// ── the helpers the app does not export, compiled from their own source text ─────────────────────────
const TXN_FILE = path.join(__dirname, '../../../src/domain/transactions/index.ts');
const IMPORTED: Record<string, unknown> = { newEntityId, holdingTagFor, holdingClassOf, assetClassForSymbol, purchaseDateOnRecord, assetClassOf };
const PRIVATE = ['map', 'cashOf', 'usesSleeve', 'bumpCash', 'tradeCash', 'findPos', 'addLot', 'removeShares'] as const;
const compiled = (() => {
  const text = fs.readFileSync(TXN_FILE, 'utf8');
  const pieces = PRIVATE.map((name) => {
    const start = new RegExp(`^(const ${name} = |function ${name}\\()`, 'm');
    const at = text.search(start);
    if (at < 0) throw new Error(`${name} not found in ${TXN_FILE}`);
    const end = text.startsWith('function', at) ? '\n}\n' : ';\n';
    return text.slice(at, text.indexOf(end, at) + end.length);
  });
  const js = ts.transpileModule(pieces.join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText;
  return { pieces, fns: new Function(...Object.keys(IMPORTED), `${js}\nreturn { ${PRIVATE.join(', ')} };`)(...Object.values(IMPORTED)) };
})();
const { map, cashOf, usesSleeve, bumpCash, tradeCash, findPos, addLot, removeShares } = compiled.fns as Record<string, (...a: any[]) => any>;

// ── the package, read as it came ────────────────────────────────────────────────────────────────────
type Mark = 'AGREE' | 'APP WRONG' | 'REVIEWER WRONG' | 'NEEDS RULING' | 'BLOCKED' | 'OUTSIDE DOMAIN';
interface Meta { mapped: string; rests_on: string; note: string; fixed?: string }
const PKG = path.join(__dirname, '../../documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/MoneyKeel_CashFlow_Independent_Audit/audit_results');
const PART = JSON.parse(fs.readFileSync(path.join(PKG, 'MoneyKeel_CashFlow_Audit_Part_11.json'), 'utf8'));
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
  const name = `${caseId} · ${c.kind} · ${c.title} [${mark}]${meta.fixed ? ` — ${meta.fixed}` : ''}`;
  const row: any = { case_id: caseId, mark, ...meta, test: name, actual: null };
  RECORD.cases.push(row);
  const seen = (v: unknown) => { row.actual = plain(v); };
  if (mark === 'BLOCKED') { try { fn(c, seen); } catch { /* the answer is recorded; the case cannot be asserted */ } }
  runner(mark)(name, () => fn(c, seen));
};
const fcheck = (id: string, mark: Mark, meta: Record<string, unknown>, fn: () => void) => {
  const name = `${id} · formula verdict ${PART.formula_checks.find((f: any) => f.id === id)?.verdict} [${mark}]${meta.fixed ? ` — ${meta.fixed}` : ''}`;
  RECORD.formula.push({ id, mark, ...meta, test: name });
  runner(mark)(name, fn);
};
const rule = (dec: string, mark: Mark, meta: Record<string, unknown>, fn: () => void) => {
  const name = `${dec} · rule verdict NOT HELD [${mark}]${meta.fixed ? ` — ${meta.fixed}` : ''}`;
  RECORD.rules.push({ rule: dec, mark, ...meta, test: name });
  runner(mark)(name, fn);
};
afterAll(() => { if (process.env.CFR_OUT) fs.writeFileSync(process.env.CFR_OUT, JSON.stringify(RECORD, null, 1)); });
/** once fixed, the app's OLD answer is kept as test.failing — never deleted (2026-10-25, FIX-TRADES; part 8's way) */
const before = (id: string, what: string, fn: () => void) =>
  test.failing(`${id} · the app until 2026-10-25, pinned: ${what} — no longer its answer (FIXED 2026-10-25)`, fn);

// ── helpers ─────────────────────────────────────────────────────────────────────────────────────────
const n = (v: any) => (v == null ? null : Number(v));
const ex = (e: any) => Number(e.exact);
const money = (got: unknown, want: any) => expect(got as number).toBeCloseTo(ex(want), 6);
const refuses = (v: unknown) => expect(v == null).toBe(true);
/** the reviewer's plain account, as the app stores one */
const account = (x: any, id = 'A'): any => {
  const bucket = x.kind === 'cash' ? 'CASH' : x.kind === 'property' ? 'PROPERTY' : 'TAXABLE';
  const kind = x.kind === 'cash' ? 'checking' : x.kind === 'property' ? 'home' : 'brokerage';
  return { asset_id: id, label: id, kind, tax_bucket: bucket, balance: n(x.balance), target_return: 0, source: 'manual',
    ...(x.cash != null ? { cash_balance: n(x.cash) } : {}), ...(x.derived ? { derive_balance: true } : {}) };
};
const txn = (o: any): any => ({ id: 'T1', created_at: '2026-10-25T00:00:00.000Z', account_id: 'A', date: '2026-10-17', ...o });
const lotOf = (l: any, i = 0) => ({ lot_id: `L${i}`, shares: n(l.shares), cost_per_share: n(l.price), purchase_date: l.date });
const basis = (p: any) => (p.lots as any[]).reduce((t, l) => t + l.shares * l.cost_per_share, 0);
const MAP_A = 'account {kind, balance, cash, typed_total|derived} → AssetAccount (cash → checking/CASH, investment → brokerage/TAXABLE, property → home/PROPERTY; cash null → cash_balance absent; derived → derive_balance true)';

// ═════ MK-CF-F-132 map ═════════════════════════════════════════════════════════════════════════════
describe('MK-CF-F-132 map — five cases', () => {
  const MAPPED = 'accounts [{id, balance, cash}] → [{asset_id, balance, cash_balance}]; the change → a function adding delta to balance (or to cash_balance when field is cash), handed to map with the target id';
  const run = (c: any) => map(c.inputs.accounts.map((a: any) => ({ asset_id: a.id, balance: n(a.balance), ...(a.cash != null ? { cash_balance: n(a.cash) } : {}) })),
    c.inputs.target, (a: any) => (c.inputs.field === 'cash' ? { ...a, cash_balance: a.cash_balance + n(c.inputs.delta)! } : { ...a, balance: a.balance + n(c.inputs.delta)! }));
  const check = (got: any[], want: any[]) => {
    expect(got.map((a) => a.asset_id)).toEqual(want.map((w) => w.id));
    want.forEach((w, i) => { money(got[i].balance, w.balance); if (w.cash) money(got[i].cash_balance, w.cash); });
  };
  for (const id of ['MK-CF-F-132-C01', 'MK-CF-F-132-C02', 'MK-CF-F-132-C03', 'MK-CF-F-132-C04', 'MK-CF-F-132-C05'])
    kase(id, 'AGREE', { mapped: MAPPED, rests_on: 'ordinary arithmetic', note: 'Only the named account changes, by the delta; the others come back as they were.' },
      (c, seen) => { const got = run(c); seen(got); check(got, c.expected); });
});

// ═════ MK-CF-F-133 cashOf ══════════════════════════════════════════════════════════════════════════
describe('MK-CF-F-133 cashOf — five cases (a helper nothing calls)', () => {
  const NO_CALLER = 'cashOf has no caller: transactions/index.ts:203 defines it and nothing reads it (grep of src/, app/, MoneyKeel/functions and Calculation Module code/engines). Its record says "Called by MK-ST-F-073 rebuildDays" — a word match with a local Map also named cashOf in rebuild-history.ts:439.';
  kase('MK-CF-F-133-C01', 'OUTSIDE DOMAIN', { mapped: MAP_A, rests_on: 'no caller (see note)', note: `App gives 0 where the reviewer refuses; ${NO_CALLER}` },
    (c, seen) => { const got = cashOf(account(c.inputs.account)); seen(got); expect(got).toBe(0); expect(c.expected.state).toBe('REFUSES'); });
  kase('MK-CF-F-133-C02', 'AGREE', { mapped: MAP_A, rests_on: 'ordinary arithmetic', note: 'A cash figure on record is returned as it is.' },
    (c, seen) => { const got = cashOf(account(c.inputs.account)); seen(got); money(got, c.expected); });
  kase('MK-CF-F-133-C03', 'AGREE', { mapped: MAP_A, rests_on: 'ordinary arithmetic', note: 'A cash figure on record is returned as it is.' },
    (c, seen) => { const got = cashOf(account(c.inputs.account)); seen(got); money(got, c.expected); });
  kase('MK-CF-F-133-C04', 'OUTSIDE DOMAIN', { mapped: MAP_A, rests_on: 'no caller (see note)', note: `App gives 0 for a property with no cash figure; ${NO_CALLER}` },
    (c, seen) => { const got = cashOf(account(c.inputs.account)); seen(got); expect(got).toBe(0); expect(c.expected.state).toBe('REFUSES'); });
  kase('MK-CF-F-133-C05', 'OUTSIDE DOMAIN', { mapped: MAP_A, rests_on: 'no caller (see note)', note: `App gives 0 for investment cash never entered; ${NO_CALLER}` },
    (c, seen) => { const got = cashOf(account(c.inputs.account)); seen(got); expect(got).toBe(0); expect(c.expected.state).toBe('REFUSES'); });
});

// ═════ MK-CF-F-134 usesSleeve ══════════════════════════════════════════════════════════════════════
describe('MK-CF-F-134 usesSleeve — five cases', () => {
  for (const id of ['MK-CF-F-134-C01', 'MK-CF-F-134-C02', 'MK-CF-F-134-C03', 'MK-CF-F-134-C04', 'MK-CF-F-134-C05'])
    kase(id, 'AGREE', { mapped: MAP_A, rests_on: 'written formula', note: 'Bank and property money lives in the balance; an investment account keeps its own cash when it is built from holdings or has a cash figure.' },
      (c, seen) => { const got = usesSleeve(account(c.inputs.account)); seen(got); expect(got).toBe(c.expected); });
});

// ═════ MK-CF-F-135 availableCash ═══════════════════════════════════════════════════════════════════
describe('MK-CF-F-135 availableCash — five cases', () => {
  const agree = { mapped: MAP_A, rests_on: 'DEC-3279e; tenet 3', note: 'Bank balance, or the investment account’s own cash figure.' };
  for (const id of ['MK-CF-F-135-C01', 'MK-CF-F-135-C02', 'MK-CF-F-135-C03'])
    kase(id, 'AGREE', agree, (c, seen) => { const got = availableCash(account(c.inputs.account)); seen(got); money(got, c.expected); });
  kase('MK-CF-F-135-C04', 'OUTSIDE DOMAIN', { mapped: MAP_A, rests_on: 'caller domain: PerformanceScreen.tsx:929-955; assets/index.ts:273 and :665',
    note: 'App gives the property’s $400,731.17 as available cash, but its one caller, the trade sheet (PerformanceScreen.tsx:955), only offers accounts that take a ticker (accountAllowsTicker refuses PROPERTY, assets/index.ts:273) or whose class is cash — a property’s class is Real estate or Personal property (assets/index.ts:665). No screen can show it.' },
  (c, seen) => { const got = availableCash(account(c.inputs.account)); seen(got); money(got, c.formula_gives); expect(c.expected.state).toBe('REFUSES'); });
  kase('MK-CF-F-135-C05', 'AGREE', { ...agree, note: 'Investment cash never entered is unknown (null), never $0 (fixed 2026-10-21, MK-PF-M-020).' },
    (c, seen) => { const got = availableCash(account(c.inputs.account)); seen(got); expect(c.expected.state).toBe('REFUSES'); refuses(got); });
});

// ═════ MK-CF-F-136 bumpCash ════════════════════════════════════════════════════════════════════════
describe('MK-CF-F-136 bumpCash — five cases', () => {
  const run = (c: any) => bumpCash(account(c.inputs.account), n(c.inputs.cash_delta));
  const check = (got: any, want: any) => { if (want.cash) money(got.cash_balance, want.cash); money(got.balance, want.balance); };
  for (const id of ['MK-CF-F-136-C01', 'MK-CF-F-136-C02', 'MK-CF-F-136-C03', 'MK-CF-F-136-C04'])
    kase(id, 'AGREE', { mapped: `${MAP_A}; cash_delta → delta`, rests_on: 'DEC-7595; DEC-0096', note: 'Bank and property: the balance moves; an investment account: its cash moves, and a typed total with it; a total built from holdings is rebuilt from them.' },
      (c, seen) => { const got = run(c); seen({ cash: got.cash_balance, balance: got.balance }); check(got, c.expected); });
  kase('MK-CF-F-136-C05', 'REVIEWER WRONG', { mapped: `${MAP_A}; cash_delta → delta`, rests_on: 'DEC-0096 (his); recomputeBalances useStore.ts:57',
    note: 'App opens the cash at $100; the reviewer keeps it not entered. An account built from its holdings is rebuilt as cash (missing read as $0) plus holdings (useStore.ts:57-92), so a $100 deposit kept off the cash would vanish from the balance — the fault his DEC-0096 ($500 deposit to Vanguard) fixed.' },
  (c, seen) => {
    const got = run(c); seen({ cash: got.cash_balance, balance: got.balance });
    expect(got.cash_balance).toBe(100); expect(got.balance).toBe(10000);
    expect(c.expected.cash).toBeNull();   // the reviewer's answer differs
  });
});

// ═════ MK-CF-F-137 findPos ═════════════════════════════════════════════════════════════════════════
describe('MK-CF-F-137 findPos — five cases', () => {
  const MAPPED = 'holdings [{id, ticker}] → positions [{position_id, ticker}]; id/ticker → the transaction’s position_id/ticker';
  for (const id of ['MK-CF-F-137-C01', 'MK-CF-F-137-C02', 'MK-CF-F-137-C03', 'MK-CF-F-137-C04', 'MK-CF-F-137-C05'])
    kase(id, 'AGREE', { mapped: MAPPED, rests_on: 'written formula', note: 'The holding with the id, or the ticker in capitals; none found gives no holding.' },
      (c, seen) => {
        const a = { asset_id: 'A', positions: c.inputs.holdings.map((h: any) => ({ position_id: h.id, ticker: h.ticker, lots: [] })) };
        const got = findPos(a, { position_id: c.inputs.id, ticker: c.inputs.ticker });
        seen(got?.position_id ?? null);
        if (c.expected == null) refuses(got); else expect(got.position_id).toBe(c.expected);
      });
});

// ═════ MK-CF-F-138 addLot ══════════════════════════════════════════════════════════════════════════
describe('MK-CF-F-138 addLot — five cases', () => {
  const MAPPED = 'old_lots / old_shares+old_basis → the existing holding AAA (one lot at old_basis ÷ old_shares); shares, price, date → addLot’s shares, cost per share and the transaction date; ticker → the transaction ticker';
  kase('MK-CF-F-138-C01', 'AGREE', { mapped: MAPPED, rests_on: 'written formula', note: 'A new holding in capitals with one lot of 10 at $100 on Oct 1.' },
    (c, seen) => {
      const got = addLot({ asset_id: 'A', positions: [] }, txn({ type: 'BUY', ticker: c.inputs.ticker, date: c.inputs.date }), c.inputs.shares, c.inputs.price);
      const p = got.positions[0]; seen({ ticker: p.ticker, lots: p.lots.map((l: any) => ({ shares: l.shares, price: l.cost_per_share, date: l.purchase_date })) });
      expect(p.ticker).toBe(c.expected.ticker);
      expect(p.lots.length).toBe(1); money(p.lots[0].shares, c.expected.lots[0].shares); money(p.lots[0].cost_per_share, c.expected.lots[0].price);
      expect(p.lots[0].purchase_date).toBe(c.expected.lots[0].date);
    });
  kase('MK-CF-F-138-C02', 'AGREE', { mapped: MAPPED, rests_on: 'ordinary arithmetic', note: '10 × $100 + 5 × $110 = $1,550 over 15 shares.' },
    (c, seen) => {
      const a = { asset_id: 'A', positions: [{ position_id: 'p1', ticker: 'AAA', lots: c.inputs.old_lots.map(lotOf) }] };
      const p = addLot(a, txn({ type: 'BUY', ticker: 'AAA', date: c.inputs.date }), c.inputs.shares, c.inputs.price).positions[0];
      seen({ total_shares: totalShares(p), total_basis: basis(p) });
      money(totalShares(p), c.expected.total_shares); money(basis(p), c.expected.total_basis);
    });
  kase('MK-CF-F-138-C03', 'AGREE', { mapped: MAPPED, rests_on: 'ordinary arithmetic', note: '731.19 + 3.43 × 83.17 = 1,016.4631 over 14.60 shares, kept unrounded.' },
    (c, seen) => {
      const a = { asset_id: 'A', positions: [{ position_id: 'p1', ticker: 'AAA', lots: [lotOf({ shares: c.inputs.old_shares, price: n(c.inputs.old_basis)! / n(c.inputs.old_shares)!, date: '2026-01-01' })] }] };
      const p = addLot(a, txn({ type: 'BUY', ticker: 'AAA', date: c.inputs.date }), n(c.inputs.shares), n(c.inputs.price)).positions[0];
      seen({ total_shares: totalShares(p), total_basis: basis(p) });
      money(totalShares(p), c.expected.total_shares); money(basis(p), c.expected.total_basis);
    });
  kase('MK-CF-F-138-C04', 'AGREE', { mapped: `${MAPPED}; old_kind bond → the holding’s kind 'bond' and class 'bond'`, rests_on: 'tenet 5', note: 'The holding keeps its own class; only its lots grow.' },
    (c, seen) => {
      const a = { asset_id: 'A', positions: [{ position_id: 'p1', ticker: 'AAA', kind: c.inputs.old_kind, asset_class: 'bond', lots: [lotOf({ shares: c.inputs.old_shares, price: n(c.inputs.old_basis)! / n(c.inputs.old_shares)!, date: '2026-01-01' })] }] };
      const p = addLot(a, txn({ type: 'BUY', ticker: 'AAA', date: c.inputs.date }), n(c.inputs.shares), n(c.inputs.price)).positions[0];
      seen({ kind: p.kind, asset_class: p.asset_class, total_shares: totalShares(p), total_basis: basis(p) });
      expect(p.kind).toBe(c.expected.kind); expect(p.asset_class).toBe('bond');
      money(totalShares(p), c.expected.total_shares); money(basis(p), c.expected.total_basis);
    });
  kase('MK-CF-F-138-C05', 'AGREE', { mapped: `${MAPPED}; date null → the transaction date null`, rests_on: 'DEC-2160 (his, Q11: "Refuse the line and ask" — when nothing says what a holding is, the app does not guess); tenet 4',
    fixed: 'FIXED 2026-10-25 — DEC-2160: in no class, marked asked',
    note: 'The reviewer wrote RULE UNCLEAR. The date is kept as handed (null stays null). The class is not: a ticker nothing identifies, bought on the trade sheet, is filed under Stocks / Funds by the classifier’s last-resort default (holding-class.ts:346, source security-default), while the same holding from a sync is asked (ingest.ts:495, DEC-2160). His DEC-2160 gives the reviewer’s "pending" reading: no class until the person says.' },
  (c, seen) => {
    const got = addLot({ asset_id: 'A', positions: [] }, txn({ type: 'BUY', ticker: c.inputs.ticker, date: c.inputs.date }), c.inputs.shares, c.inputs.price);
    const p = got.positions[0];
    const verdict = classifyHoldingClass({ ticker: 'UNKNOWN123', name: '', brokerTag: null, hasSecurityIdentity: true } as any);
    const vti = classifyHoldingClass({ ticker: 'VTI', name: '', brokerTag: null, hasSecurityIdentity: true } as any);   // DEC-7605's own example
    seen({ ticker: p.ticker, asset_class: p.asset_class ?? null, class_asked: p.class_asked ?? null, classifier: { cls: verdict.cls, source: verdict.source }, vti_classifier: { cls: vti.cls, source: vti.source }, lot_date: p.lots[0].purchase_date });
    expect(c.expected.state).toBe('RULE UNCLEAR');
    expect(p.lots[0].purchase_date).toBeNull();
    // the "pending" reading, as DEC-2160 has it: the new holding is in no class until the person says
    expect(p.asset_class ?? null).toBeNull();
    // FIXED 2026-10-25: marked asked, as a synced holding nothing identifies is (ingest.ts), so Net worth asks what it is;
    // every screen reads it Unclassified (holdingClassOf 'mixed'); the classifier still answers its default, which is not stored
    expect(p.class_asked).toBe(true);
    expect(holdingClassOf(p)).toBe('mixed');
    expect([verdict.cls, verdict.source]).toEqual(['stocks_etf', 'security-default']);
  });
  before('MK-CF-F-138-C05', '10 UNKNOWN123 bought were filed under Stocks / Funds (asset_class stock_etf) by the classifier’s last-resort default', () => {
    const p = addLot({ asset_id: 'A', positions: [] }, txn({ type: 'BUY', ticker: 'UNKNOWN123', date: null }), 10, 100).positions[0];
    expect(p.asset_class).toBe('stock_etf');
  });
  // DEC-7605's own example, kept (the lead's brief, 2026-10-25): 10 VTI → Stocks / Funds through the one classifier, never by its
  // default. The trade sheet asks the type of a ticker the account does not hold; the record names it (kind stocks_etf), and the
  // classifier reads it as the class the holding was given (source "stored"), not its last-resort default.
  test('DEC-7605 · 10 VTI bought with its type chosen as Stocks / Funds list under Stocks / Funds, read by the one classifier as the class it was given — never by its default (FIXED 2026-10-25)', () => {
    const p = addLot({ asset_id: 'A', positions: [] }, txn({ type: 'BUY', ticker: 'vti', kind: 'stocks_etf', date: '2026-10-17' }), 10, 100).positions[0];
    expect([p.ticker, p.kind, p.asset_class ?? null, p.class_asked ?? null]).toEqual(['VTI', 'stocks_etf', null, null]);
    expect(holdingClassOf(p)).toBe('stocks_etf');
    const v = classifyHoldingClass({ ticker: 'VTI', name: '', storedClass: 'stocks_etf', hasSecurityIdentity: true } as any);
    expect([v.cls, v.source]).toEqual(['stocks_etf', 'stored']);
    // with no type on the record, VTI too is asked: nothing but the default says what it is
    const bare = addLot({ asset_id: 'A', positions: [] }, txn({ type: 'BUY', ticker: 'VTI' }), 10, 100).positions[0];
    expect([bare.asset_class ?? null, bare.class_asked, holdingClassOf(bare)]).toEqual([null, true, 'mixed']);
  });
});

// ═════ MK-CF-F-139 removeShares ════════════════════════════════════════════════════════════════════
describe('MK-CF-F-139 removeShares — five cases', () => {
  const MAPPED = 'lots [{date, shares, price}] → the holding AAA’s lots {purchase_date, shares, cost_per_share} in the order given; sell_shares → shares';
  const run = (c: any) => removeShares({ asset_id: 'A', positions: [{ position_id: 'p1', ticker: 'AAA', lots: c.inputs.lots.map(lotOf) }] }, txn({ type: 'SELL', ticker: 'AAA' }), n(c.inputs.sell_shares));
  const left = (a: any) => (a.positions.find((p: any) => p.ticker === 'AAA')?.lots ?? null);
  const checkLots = (got: any[], want: any[]) => {
    expect(got.length).toBe(want.length);
    want.forEach((w, i) => { expect(got[i].purchase_date).toBe(w.date); money(got[i].shares, w.shares); money(got[i].cost_per_share, w.price); });
  };
  kase('MK-CF-F-139-C01', 'AGREE', { mapped: MAPPED, rests_on: 'ordinary arithmetic', note: '10 − 4 = 6 left in the one lot.' },
    (c, seen) => { const l = left(run(c)); seen(l); checkLots(l, c.expected.remaining_lots); });
  kase('MK-CF-F-139-C02', 'AGREE', { mapped: MAPPED, rests_on: 'ordinary arithmetic', note: 'Every share sold: the holding leaves the account.' },
    (c, seen) => { const l = left(run(c)); seen({ holding_removed: l == null }); expect(l == null).toBe(c.expected.holding_removed); });
  kase('MK-CF-F-139-C03', 'AGREE', { mapped: MAPPED, rests_on: 'first in, first out by purchase day; an undated lot goes last (index.ts:626-632)', note: 'January’s 5.17 go first, then 3.26 of September’s; the undated 2.19 stay.' },
    (c, seen) => { const l = left(run(c)); seen(l); checkLots(l, c.expected.remaining_lots); });
  kase('MK-CF-F-139-C04', 'AGREE', { mapped: MAPPED, rests_on: 'first in, first out', note: '3.19 + 5.43 go whole; 1.51 of September’s 7.11 leave 5.60.' },
    (c, seen) => { const l = left(run(c)); seen(l); checkLots(l, c.expected.remaining_lots); });
  kase('MK-CF-F-139-C05', 'AGREE', { mapped: MAPPED, rests_on: 'tenet 3 (unknown is not zero); tenet 5 (the person’s entry is never overwritten)',
    fixed: 'FIXED 2026-10-25 — DEC-3523 tenets 3 and 5: the purchase of unknown size is kept',
    note: 'A purchase whose share count is not on record is ERASED by a sale of 4: Math.min(null, 4) reads it as 0 shares, then the empty lot and the holding are dropped. Reached through applyTransaction’s SELL, which lets a sale on an unknown count stand (index.ts:719-722) — the edit sheet (AccountPortfolioScreen.tsx:1657) and the delete replay (useStore.ts:992) re-apply sales without the trade sheet’s check.' },
  (c, seen) => {
    const l = left(run(c)); seen(l);
    expect(c.expected.state).toBe('REFUSES');
    // the refusal, as an account: the purchase of unknown size is still there, untouched
    expect(l).not.toBeNull(); expect(l.length).toBe(1); expect(l[0].shares).toBeNull();
    expect([l[0].cost_per_share, l[0].purchase_date]).toEqual([c.inputs.lots[0].price != null ? n(c.inputs.lots[0].price) : null, c.inputs.lots[0].date]);
  });
  before('MK-CF-F-139-C05', 'a sale of 4 erased the purchase of unknown size and the holding left the account', () => {
    expect(left(run(C('MK-CF-F-139-C05')))).toBeNull();
  });
  // the walk, oldest first, stops at the purchase with no count and keeps it and every later one; earlier ones are taken as before
  test('MK-CF-F-139 · FIXED 2026-10-25 — oldest first up to the purchase with no count: 10 (Jan) + unknown (Mar) + 5 (Sep), a sale of 12 takes the 10, keeps the unknown and the 5 whole (tenets 3, 5)', () => {
    const a = { asset_id: 'A', positions: [{ position_id: 'p1', ticker: 'AAA', lots: [
      { lot_id: 'j', shares: 10, cost_per_share: 50, purchase_date: '2026-01-05' }, { lot_id: 'm', shares: null, cost_per_share: 60, purchase_date: '2026-03-05' },
      { lot_id: 's', shares: 5, cost_per_share: 70, purchase_date: '2026-09-05' }] }] };
    const l = left(removeShares(a, txn({ type: 'SELL', ticker: 'AAA' }), 12));
    expect(l.map((x: any) => [x.lot_id, x.shares])).toEqual([['m', null], ['s', 5]]);
    // a sale of 4 is met by January alone: the unknown purchase is never reached
    expect(left(removeShares(a, txn({ type: 'SELL', ticker: 'AAA' }), 4)).map((x: any) => [x.lot_id, x.shares])).toEqual([['j', 6], ['m', null], ['s', 5]]);
  });
});

// ═════ MK-CF-F-111 applyTransaction ════════════════════════════════════════════════════════════════
describe('MK-CF-F-111 applyTransaction — five cases', () => {
  const MAPPED = 'account {cash, balance, typed_total} → a hand-typed TAXABLE brokerage A (cash_balance, balance); transaction → a record {type, amount, shares, price, multiplier, fee (fee_in_price false), date, direction}; a sale’s shares are held (holding XYZ, 10 shares) so the sale is not clamped';
  const acc = (x: any, held = 0) => ({ asset_id: 'A', label: 'A', kind: 'brokerage', tax_bucket: 'TAXABLE', source: 'manual', target_return: 0,
    balance: n(x.balance), cash_balance: n(x.cash), positions: held ? [{ position_id: 'p1', ticker: 'XYZ', lots: [{ lot_id: 'L0', shares: held, cost_per_share: 50, purchase_date: '2026-01-02' }] }] : [] });
  const TYPE: Record<string, string> = { deposit: 'DEPOSIT', dividend: 'DIVIDEND', buy: 'BUY', sale: 'SELL' };
  const rec = (t: any) => txn({ type: TYPE[t.kind], date: t.date, ...(t.amount != null ? { amount: n(t.amount) } : {}),
    ...(n(t.shares) ? { ticker: 'XYZ', shares: n(t.shares), price: n(t.price) } : {}), ...(n(t.multiplier) && n(t.multiplier) !== 1 ? { multiplier: n(t.multiplier) } : {}),
    ...(n(t.fee_not_in_price) ? { fee: n(t.fee_not_in_price), fee_in_price: false } : {}), ...(t.direction ? { direction: String(t.direction).toUpperCase() } : {}) });
  const go = (c: any) => applyTransaction([acc(c.inputs.account, c.inputs.transaction.kind === 'sale' && n(c.inputs.transaction.shares) ? 10 : 0)] as any, rec(c.inputs.transaction))[0] as any;
  for (const id of ['MK-CF-F-111-C01', 'MK-CF-F-111-C02', 'MK-CF-F-111-C03', 'MK-CF-F-111-C04'])
    kase(id, 'AGREE', { mapped: MAPPED, rests_on: 'DEC-6796 (signed reversals); DEC-7595 (a typed total moves only by the fee); DEC-7596 (fee once); DEC-7602 (contracts × multiplier)',
      note: 'Deposit +$1,000 and a −$50 dividend move cash and the typed total alike; a buy or a sale moves cash by shares × price × multiplier ∓ fee and the typed total by the fee only.' },
    (c, seen) => { const a = go(c); seen({ cash: a.cash_balance, typed_total: a.balance }); money(a.cash_balance, c.expected.cash); money(a.balance, c.expected.typed_total); });
  kase('MK-CF-F-111-C05', 'AGREE', { mapped: `${MAPPED}; no shares → an amount-only sale`, rests_on: 'caller domain: BondsScreen.tsx:247, OtherInvestmentsScreen.tsx:155, AccountPortfolioScreen.tsx:959',
    note: 'The reviewer wrote RULE UNCLEAR (sale or disposal?). Every amount-only sale the app records is a bond, CD or other investment sold or paid out to the bank — money that leaves that account — so the callers settle it: the app gives the reviewer’s "external disposal" reading, total $9,500, cash $1,000.' },
  (c, seen) => {
    const a = go(c); seen({ cash: a.cash_balance, typed_total: a.balance });
    expect(c.expected.state).toBe('RULE UNCLEAR');
    money(a.balance, c.expected.readings.external_disposal.typed_total); money(a.cash_balance, c.expected.readings.external_disposal.cash);
  });
});

// ═════ MK-CF-F-222 tradeCash ═══════════════════════════════════════════════════════════════════════
describe('MK-CF-F-222 tradeCash — five cases', () => {
  const MAPPED = `${MAP_A}; cash_delta → gross (what the shares cost or brought in); fee_not_in_price → fee`;
  const run = (c: any) => tradeCash(account(c.inputs.account), n(c.inputs.cash_delta), n(c.inputs.fee_not_in_price));
  for (const id of ['MK-CF-F-222-C01', 'MK-CF-F-222-C02', 'MK-CF-F-222-C03', 'MK-CF-F-222-C04'])
    kase(id, 'AGREE', { mapped: MAPPED, rests_on: 'DEC-7595 (his ruling DEC-3523 tenets 1 and 5)', note: 'Cash moves by gross − fee where the account keeps cash; a typed total moves by the fee only; cash never entered stays not entered.' },
      (c, seen) => {
        const a = run(c); seen({ cash: a.cash_balance ?? null, stored_total: a.balance });
        if (c.expected.cash == null) refuses(a.cash_balance); else money(a.cash_balance, c.expected.cash);
        money(a.balance, c.expected.stored_total);
      });
  kase('MK-CF-F-222-C05', 'REVIEWER WRONG', { mapped: MAPPED, rests_on: 'DEC-0096 (his); DEC-7595; recomputeBalances useStore.ts:57',
    note: 'App opens the cash at $96.83 on an account built from its holdings; the reviewer keeps it not entered. That account is rebuilt as cash (missing read as $0) plus holdings, so a sale’s $96.83 kept off the cash would vanish from the balance — the fault DEC-0096 fixed. A typed account with no cash keeps it not entered (C01–C04, rule DEC-7595 below).' },
  (c, seen) => {
    const a = run(c); seen({ cash: a.cash_balance, stored_total: a.balance });
    money(a.cash_balance, c.formula_gives.cash); money(a.balance, c.expected.stored_total);
    expect(c.expected.cash).toBeNull();   // the reviewer's answer differs
  });
});

// ═════ MK-CF-F-223 tradeMultiplierOf ═══════════════════════════════════════════════════════════════
describe('MK-CF-F-223 tradeMultiplierOf — five cases', () => {
  const MAPPED = 'transaction_kind → type; holding_kind stock → a held position kind stocks_etf, option → kind options; shares_per_contract → the position’s multiplier; holding_exists false → the account holds nothing and the record names the kind (Transaction.kind, "instrument kind … for new positions")';
  const TYPE: Record<string, string> = { buy: 'BUY', sell: 'SELL', dividend: 'DIVIDEND' };
  const KIND: Record<string, string> = { stock: 'stocks_etf', option: 'options' };
  const run = (c: any) => {
    const i = c.inputs; const kind = KIND[i.holding_kind];
    const pos = { position_id: 'p1', ticker: 'XYZ', kind, ...(i.shares_per_contract != null ? { multiplier: i.shares_per_contract } : {}), lots: [] };
    const accounts = [{ asset_id: 'A', label: 'A', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, target_return: 0, positions: i.holding_exists ? [pos] : [] }];
    return tradeMultiplierOf(accounts as any, { type: TYPE[i.transaction_kind], account_id: 'A', ticker: 'XYZ', ...(i.holding_exists ? {} : { kind }) } as any);
  };
  for (const id of ['MK-CF-F-223-C01', 'MK-CF-F-223-C02', 'MK-CF-F-223-C03', 'MK-CF-F-223-C04'])
    kase(id, 'AGREE', { mapped: MAPPED, rests_on: 'DEC-0274 (his); DEC-4646 (his); DEC-7602', note: 'A held stock 1, a held option 100, a mini option its own 10, anything but a trade 1.' },
      (c, seen) => { const got = run(c); seen(got); money(got, c.expected); });
  kase('MK-CF-F-223-C05', 'AGREE', { mapped: MAPPED, rests_on: 'DEC-0274 (his): "options: value = contracts × 100 × price unless the broker or the person states otherwise"',
    fixed: 'FIXED 2026-10-25 — DEC-0274, DEC-4646: the record’s type and shares per contract are read',
    note: 'A first buy of an option the account does not hold yet counts ×1: 1 contract at $2.50 moves $2.50, not $250. tradeMultiplierOf reads only a held position and ignores the record’s kind; the trade sheet does not ask the type (DEC-7602 records this as a limit, not a ruling). The holding addLot opens then carries no kind, so it stays ×1 afterwards too.' },
  (c, seen) => { const got = run(c); seen(got); money(got, c.expected); });
  before('MK-CF-F-223-C05', 'a first buy of an option the account does not hold counted 1 share a contract', () => {
    expect(run(C('MK-CF-F-223-C05'))).toBe(1);
  });
  test('MK-CF-F-223 · FIXED 2026-10-25 — a ticker not held: a mini option’s stated 10 counts; a stock, or a record naming no type, counts 1; a held holding’s own figure wins over the record’s (DEC-4646)', () => {
    const none = [{ asset_id: 'A', positions: [] }] as any;
    expect(tradeMultiplierOf(none, { type: 'BUY', account_id: 'A', ticker: 'XYZ', kind: 'options', multiplier: 10 } as any)).toBe(10);
    expect(tradeMultiplierOf(none, { type: 'BUY', account_id: 'A', ticker: 'XYZ', kind: 'stocks_etf' } as any)).toBe(1);
    expect(tradeMultiplierOf(none, { type: 'BUY', account_id: 'A', ticker: 'XYZ' } as any)).toBe(1);
    const held = [{ asset_id: 'A', positions: [{ position_id: 'p', ticker: 'XYZ', kind: 'options', multiplier: 10, lots: [] }] }] as any;
    expect(tradeMultiplierOf(held, { type: 'BUY', account_id: 'A', ticker: 'XYZ', kind: 'options', multiplier: 100 } as any)).toBe(10);
  });
});

// ═════ MK-CF-F-224 openingRecordsOf and MK-CF-F-112 makeTransaction ════════════════════════════════
const checkRecords = (got: any[], c: any) => {
  const want = c.expected.economic_records;
  expect(got.length).toBe(want.length);
  want.forEach((w: any, i: number) => {
    const g = got[i];
    money(g.shares, w.shares); expect(g.ticker).toBe(w.ticker); expect(g.date ?? null).toBe(w.date);
    if (w.price == null) refuses(g.price); else money(g.price, w.price);
    // the package's assertions: a fresh unique id each, a creation time that is a timestamp, not the purchase date
    expect(typeof g.id).toBe('string'); expect(g.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/); expect(g.created_at).not.toBe(g.date);
  });
  expect(new Set(got.map((g) => g.id)).size).toBe(got.length);
};
const recShown = (got: any[]) => got.map((g) => ({ shares: g.shares, price: g.price ?? null, date: g.date ?? null, ticker: g.ticker, id_unique: true, created_at_is_timestamp: /T/.test(g.created_at) }));
describe('MK-CF-F-224 openingRecordsOf — five cases', () => {
  const MAPPED = 'purchases_or_partial_records → one holding (ticker = the first record’s spelling) whose lots are the records {shares, cost_per_share = price, purchase_date = date}; openingRecordsOf(account A, that holding)';
  for (const id of ['MK-CF-F-224-C01', 'MK-CF-F-224-C02', 'MK-CF-F-224-C03', 'MK-CF-F-224-C04', 'MK-CF-F-224-C05'])
    kase(id, 'AGREE', { mapped: MAPPED, rests_on: 'DEC-7601', note: 'One opening record per purchase, its shares, price paid and date as on record (a missing price stays missing, a $0 stays $0, a missing date stays missing), the ticker in capitals.' },
      (c, seen) => {
        const recs = c.inputs.purchases_or_partial_records;
        const pos = { position_id: 'p1', ticker: recs[0]?.ticker ?? 'AAA', lots: recs.map((r: any, i: number) => ({ lot_id: `L${i}`, shares: n(r.shares), cost_per_share: n(r.price), purchase_date: r.date })) };
        const got = openingRecordsOf('A', pos as any); seen(recShown(got)); checkRecords(got, c);
      });
});
describe('MK-CF-F-112 makeTransaction — five cases', () => {
  const MAPPED = 'each partial record → one makeTransaction({date, type OPENING_POSITION, account_id A, ticker, shares, price}) call';
  for (const id of ['MK-CF-F-112-C01', 'MK-CF-F-112-C02', 'MK-CF-F-112-C03', 'MK-CF-F-112-C04', 'MK-CF-F-112-C05'])
    kase(id, 'AGREE', { mapped: MAPPED, rests_on: 'written formula', note: 'Keeps every field handed in, puts the ticker in capitals, adds a fresh id and the creation time.' },
      (c, seen) => {
        const got = c.inputs.purchases_or_partial_records.map((r: any) => makeTransaction({ date: r.date, type: 'OPENING_POSITION', account_id: 'A', ticker: r.ticker, shares: n(r.shares), price: n(r.price) } as any));
        seen(recShown(got)); checkRecords(got, c);
      });
});

// ═════ MK-CF-F-113 affectedAccountIds ══════════════════════════════════════════════════════════════
describe('MK-CF-F-113 affectedAccountIds — five cases', () => {
  const MAPPED = 'primary → account_id; counter → counter_account_id (null → absent)';
  const run = (c: any) => affectedAccountIds({ account_id: c.inputs.primary, ...(c.inputs.counter ? { counter_account_id: c.inputs.counter } : {}) } as any);
  for (const id of ['MK-CF-F-113-C01', 'MK-CF-F-113-C02', 'MK-CF-F-113-C03', 'MK-CF-F-113-C05'])
    kase(id, 'AGREE', { mapped: MAPPED, rests_on: 'written formula', note: 'The account, and the other account of a transfer.' },
      (c, seen) => { const got = run(c); seen(got); expect(got).toEqual(c.expected); });
  kase('MK-CF-F-113-C04', 'OUTSIDE DOMAIN', { mapped: MAPPED, rests_on: 'caller domain: PerformanceScreen.tsx (valid needs counterId !== accountId); AccountPortfolioScreen.tsx:1347 (the other accounts exclude this one); undoSnapshot index.ts:859 (a Set)',
    note: 'App gives [A, A] for a transfer from A to A; no sheet can record one (the trade sheet needs another account, the record sheet lists only others), and the one caller, undoSnapshot, reads the ids as a set, so A is copied once.' },
  (c, seen) => { const got = run(c); seen(got); expect(got).toEqual(['A', 'A']); expect(new Set(got).size).toBe(c.expected.length); });
});

// ═════ the reviewer's formula verdicts in part 11 (8 of 14 not RIGHT) ══════════════════════════════
describe('formula checks — the reviewer’s 8 card verdicts that are not RIGHT', () => {
  fcheck('MK-CF-F-133', 'OUTSIDE DOMAIN', { records_or_app_fix: 'records fix: the rule text',
    what_the_code_actually_does: 'cashOf returns cash_balance or 0 — and nothing calls it. Its record’s "Called by MK-ST-F-073 rebuildDays" is a word match with rebuild-history.ts’s own Map named cashOf.',
    governing_decisions: ['DEC-3523 tenet 3'], plain_example: 'No cash entered: cashOf gives $0 — on no screen, because no function reads it.' },
  () => {
    const src = fs.readFileSync(TXN_FILE, 'utf8');
    expect((src.match(/\bcashOf\(/g) ?? []).length).toBe(0);   // defined, never called
    expect(cashOf({ cash_balance: undefined })).toBe(0);
  });
  fcheck('MK-CF-F-135', 'OUTSIDE DOMAIN', { records_or_app_fix: 'records fix: the rule text (and, optionally, drop PROPERTY from the branch — no screen figure moves)',
    what_the_code_actually_does: 'availableCash reads a property’s balance as cash, but its one caller (the trade sheet, PerformanceScreen.tsx:955) never offers a property: accountAllowsTicker refuses PROPERTY and a property’s class is never cash. Unknown investment cash is already null (fixed 2026-10-21).',
    governing_decisions: ['DEC-3279e', 'DEC-3523 tenets 1 and 3'], plain_example: 'A $400,731.17 home: availableCash gives $400,731.17, but no sheet lists a home to trade or move cash from.' },
  () => {
    const home: any = { asset_id: 'H', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 400731.17, target_return: 0 };
    expect(accountAllowsTicker(home)).toBe(false);
    expect(assetClassOf(home)).not.toBe('cash');
    expect(availableCash(home)).toBeCloseTo(400731.17, 6);
  });
  fcheck('MK-CF-F-136', 'REVIEWER WRONG', { records_or_app_fix: 'records fix: the rule text',
    what_the_code_actually_does: 'A deposit into an investment account with no cash figure opens the cash at the deposit, because an account built from holdings is rebuilt as cash + holdings and the money would otherwise vanish (DEC-0096). A typed total keeps its own figure and moves by the money.',
    governing_decisions: ['DEC-0096', 'DEC-7595'], plain_example: '$100 deposited into an imported $10,000 account with no cash entered: cash $100, total $10,100 after the rebuild — not cash unknown and $10,000.' },
  () => { const a = bumpCash({ tax_bucket: 'TAXABLE', balance: 10000, derive_balance: true, positions: [] }, 100); expect(a.cash_balance).toBe(100); });
  fcheck('MK-CF-F-138', 'AGREE', { records_or_app_fix: 'app fix (the class of a holding a trade opens) and records fix: the rule text (dates and an existing class are already kept)',
    fixed: 'FIXED 2026-10-25 — DEC-2160',
    what_the_code_actually_does: 'addLot keeps the date it is handed (null stays null) and an existing holding’s class. A holding a trade opens is classed by assetClassForSymbol (DEC-7605), whose last step files a ticker nothing identifies under Stocks / Funds — the guess his DEC-2160 forbids, and the one the sync already refuses (ingest.ts:495).',
    governing_decisions: ['DEC-2160', 'DEC-7605', 'DEC-7601'], plain_example: '10 UNKNOWN123 bought at $100 on the trade sheet: filed under Stocks / Funds. Right: Unclassified, and Net worth asks what it is — as a synced UNKNOWN123 is.' },
  () => {
    const p = addLot({ positions: [] }, { date: null, ticker: 'UNKNOWN123' }, 1, 1).positions[0];
    expect(p.lots[0].purchase_date).toBeNull();
    expect(p.asset_class ?? null).toBeNull();
    expect(p.class_asked).toBe(true);
  });
  fcheck('MK-CF-F-139', 'AGREE', { records_or_app_fix: 'app fix', fixed: 'FIXED 2026-10-25 — DEC-3523 tenets 3 and 5',
    what_the_code_actually_does: 'A lot whose share count is not on record is read as 0 by Math.min and dropped, so a sale erases a purchase of unknown size.',
    governing_decisions: ['DEC-3523 tenets 3 and 5'], plain_example: 'Holding AAA with one purchase of unknown shares at $100; a sale of 4 recorded through the edit sheet: the holding disappears. Right: the purchase stays, unknown.' },
  () => {
    const a = removeShares({ positions: [{ position_id: 'p', ticker: 'AAA', lots: [{ lot_id: 'x', shares: null, cost_per_share: 100, purchase_date: '2026-01-01' }] }] }, { ticker: 'AAA' }, 4);
    expect(a.positions.length).toBe(1);
  });
  before('MK-CF-F-139 formula', 'Math.min(null, 4) read the unknown count as 0 and dropped the purchase', () => {
    const a = removeShares({ positions: [{ position_id: 'p', ticker: 'AAA', lots: [{ lot_id: 'x', shares: null, cost_per_share: 100, purchase_date: '2026-01-01' }] }] }, { ticker: 'AAA' }, 4);
    expect(a.positions.length).toBe(0);
  });
  fcheck('MK-CF-F-111', 'AGREE', { records_or_app_fix: 'app fix (in MK-CF-F-139 removeShares) — the amount-only sale point is settled by the callers',
    fixed: 'FIXED 2026-10-25 — in MK-CF-F-139 removeShares',
    what_the_code_actually_does: 'Amount-only sales come only from bond, CD and other-investment sales and a matured bond’s payout, so the value drops by the sale (the reviewer’s own formula reading). A sale on a holding whose count is unknown stands (index.ts:719-721) and removeShares then erases that purchase.',
    governing_decisions: ['DEC-7595', 'DEC-7596', 'DEC-3523 tenet 3'], plain_example: 'XYZ held as one purchase of unknown shares; a recorded sale of 4 at $10: cash +$40 and XYZ gone. Right: XYZ stays, its count unknown.' },
  () => {
    const acc: any = { asset_id: 'A', label: 'A', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 1000, cash_balance: 0, target_return: 0, positions: [{ position_id: 'p', ticker: 'XYZ', lots: [{ lot_id: 'x', shares: null, cost_per_share: 9, purchase_date: '2026-01-01' }] }] };
    const out: any = applyTransaction([acc], txn({ type: 'SELL', ticker: 'XYZ', shares: 4, price: 10 }) as any)[0];
    expect(out.positions.length).toBe(1);
    // the sale stands for its money, as recorded: $0 + 4 × $10 = $40 of cash; the purchase stays, its count not stated
    expect(out.cash_balance).toBe(40); expect(out.positions[0].lots[0].shares).toBeNull();
  });
  before('MK-CF-F-111 formula', 'a recorded sale of 4 against one purchase of unknown size took the holding out of the account', () => {
    const acc: any = { asset_id: 'A', label: 'A', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 1000, cash_balance: 0, target_return: 0, positions: [{ position_id: 'p', ticker: 'XYZ', lots: [{ lot_id: 'x', shares: null, cost_per_share: 9, purchase_date: '2026-01-01' }] }] };
    expect((applyTransaction([acc], txn({ type: 'SELL', ticker: 'XYZ', shares: 4, price: 10 }) as any)[0] as any).positions.length).toBe(0);
  });
  fcheck('MK-CF-F-222', 'REVIEWER WRONG', { records_or_app_fix: 'records fix: the rule text',
    what_the_code_actually_does: 'tradeCash keeps cash not entered on a typed account (it moves the typed total by the fee only — DEC-7595) and opens the cash only on an account built from holdings, whose rebuilt total would otherwise lose the trade’s money (DEC-0096).',
    governing_decisions: ['DEC-7595', 'DEC-0096'], plain_example: 'Typed $40,000 account, 100 VTI, no cash entered, 10 VTI bought at $100 with a $5 fee: total $39,995, cash still not entered.' },
  () => {
    const a = tradeCash({ tax_bucket: 'TAXABLE', balance: 40000, source: 'manual', positions: [{}] }, -1000, 5);
    expect(a.cash_balance).toBeUndefined(); expect(a.balance).toBe(39995);
  });
  fcheck('MK-CF-F-223', 'AGREE', { records_or_app_fix: 'app fix', fixed: 'FIXED 2026-10-25 — DEC-0274, DEC-4646',
    what_the_code_actually_does: 'Only a held position gives a contract multiplier; a first buy of an option counts ×1 and the new holding carries no kind.',
    governing_decisions: ['DEC-0274', 'DEC-4646', 'DEC-7602'], plain_example: '1 contract of a new option bought at $2.50: cash moves $2.50; right $250.' },
  () => { expect(tradeMultiplierOf([{ asset_id: 'A', positions: [] }] as any, { type: 'BUY', account_id: 'A', ticker: 'XYZ', kind: 'options' } as any)).toBe(100); });
  before('MK-CF-F-223 formula', 'only a held holding gave a contract multiplier; a first buy of an option counted 1', () => {
    expect(tradeMultiplierOf([{ asset_id: 'A', positions: [] }] as any, { type: 'BUY', account_id: 'A', ticker: 'XYZ', kind: 'options' } as any)).toBe(1);
  });
});

// ═════ the reviewer's rule verdicts in part 11 that are NOT HELD (2 of 9) ═══════════════════════════
describe('rules — the reviewer’s 2 NOT HELD verdicts', () => {
  rule('DEC-7595', 'REVIEWER WRONG', { cards: ['MK-CF-F-222'],
    what_the_code_actually_does: 'The typed-total rule holds: a trade on a typed account with no cash entered moves the total by the fee and leaves the cash not entered. The case the reviewer cites (F-222-C05) is an account built from holdings, where opening the cash keeps the trade’s money in the total (DEC-0096).',
    governing_decisions: ['DEC-7595', 'DEC-0096'], plain_example: '$40,000 typed, 100 VTI, 10 more bought at $100 with a $5 fee: $39,995 and 110 VTI; cash not entered.' },
  () => {
    const acc: any = { asset_id: 'A', label: 'A', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 40000, source: 'manual', target_return: 0,
      positions: [{ position_id: 'p', ticker: 'VTI', lots: [{ lot_id: 'x', shares: 100, cost_per_share: 80, purchase_date: '2026-01-02' }] }] };
    const out: any = applyTransaction([acc], txn({ type: 'BUY', ticker: 'VTI', shares: 10, price: 100, fee: 5, fee_in_price: false }) as any)[0];
    expect(out.balance).toBe(39995); expect(out.cash_balance).toBeUndefined();
    expect(totalShares(out.positions[0])).toBe(110);
  });
  rule('DEC-7602', 'AGREE', { cards: ['MK-CF-F-223'], fixed: 'FIXED 2026-10-25 — DEC-0274: the limit is gone',
    what_the_code_actually_does: 'The limit DEC-7602 records is real: a ticker bought before it is held counts ×1, against his DEC-0274.',
    governing_decisions: ['DEC-0274', 'DEC-4646', 'DEC-7602'], plain_example: 'A first buy of 1 option contract at $2.50 in an account holding $1,000 cash: cash reads $997.50; right $750.' },
  () => {
    const acc: any = { asset_id: 'A', label: 'A', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 1000, cash_balance: 1000, source: 'manual', target_return: 0, positions: [] };
    const t: any = txn({ type: 'BUY', ticker: 'XYZ 261120C00150000', kind: 'options', shares: 1, price: 2.5 });
    const per = tradeMultiplierOf([acc], t); if (per !== 1 && t.multiplier == null) t.multiplier = per;   // as recordTransaction stamps it
    const out: any = applyTransaction([acc], t)[0];
    expect(out.cash_balance).toBeCloseTo(750, 6);
    // the holding it opens keeps its kind, so it stays 100 a contract afterwards (it carried none and stayed ×1)
    expect(out.positions[0].kind).toBe('options');
    expect(tradeMultiplierOf([out], { type: 'SELL', account_id: 'A', ticker: 'XYZ 261120C00150000' } as any)).toBe(100);
  });
  before('DEC-7602 rule', '1 contract at $2.50 bought before it was held moved $2.50: cash read $997.50', () => {
    const acc: any = { asset_id: 'A', label: 'A', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 1000, cash_balance: 1000, source: 'manual', target_return: 0, positions: [] };
    const t: any = txn({ type: 'BUY', ticker: 'XYZ 261120C00150000', kind: 'options', shares: 1, price: 2.5 });
    const per = tradeMultiplierOf([acc], t); if (per !== 1 && t.multiplier == null) t.multiplier = per;
    expect((applyTransaction([acc], t)[0] as any).cash_balance).toBeCloseTo(997.5, 6);
  });
});

// ═════ beyond the package: what the F-222 / F-135 priority finding touches that no case covers ══════
describe('observation — RULED 2026-10-25 by the lead (not a package case)', () => {
  // Import holdings writes derive_balance true and no cash figure (ImportHoldingsScreen.tsx:136). Before the buy the trade sheet
  // reads the cash as not entered and does not refuse; the buy opens the cash at −$1,000 so the rebuilt total stays right
  // (−$1,000 + $11,000 = $10,000). THE LEAD'S RULING (tenet 3): keep that stored figure, but read it as not entered until a cash
  // figure is actually entered, and never refuse a buy on a cash figure the person never gave (cash_not_entered).
  const acc: any = { asset_id: 'A', label: 'Imported', kind: 'brokerage', tax_bucket: undefined, balance: 10000, derive_balance: true, source: 'imported', target_return: 0.08,
    positions: [{ position_id: 'p', ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: 'x', shares: 100, cost_per_share: 100, purchase_date: '' }] }] };
  test('a buy in an account built from imported holdings, cash never entered: the stored −$1,000 is kept and Available cash reads not entered (RULED + FIXED 2026-10-25 — tenet 3)', () => {
    expect(availableCash(acc)).toBeNull();
    const out: any = applyTransaction([acc], txn({ type: 'BUY', ticker: 'VTI', shares: 10, price: 100 }) as any)[0];
    expect([out.cash_balance, out.cash_not_entered]).toEqual([-1000, true]);
    expect(availableCash(out)).toBeNull();
    // a deposit afterwards does not make the cash known: it started from nothing on record (−$1,000 + $2,000 = $1,000 stored)
    const dep: any = applyTransaction([out], txn({ type: 'DEPOSIT', amount: 2000 }) as any)[0];
    expect([dep.cash_balance, availableCash(dep)]).toEqual([1000, null]);
    // a cash figure entered (an opening cash record) is known from then on
    const entered: any = applyTransaction([dep], txn({ type: 'OPENING_CASH', amount: 3000 }) as any)[0];
    expect([entered.cash_balance, entered.cash_not_entered, availableCash(entered)]).toEqual([3000, undefined, 3000]);
  });
  before('the open question', 'after the buy the sheet read "Available cash: −$1,000 ⚠ not enough" and refused the next buy', () => {
    const out: any = applyTransaction([acc], txn({ type: 'BUY', ticker: 'VTI', shares: 10, price: 100 }) as any)[0];
    expect(availableCash(out)).toBe(-1000);
  });
});

// ═════ a guard must prove it looked ═════════════════════════════════════════════════════════════════
describe('coverage — every item of part 11 was measured', () => {
  test('70 of 70 package cases ran, each once', () => {
    expect(PART.cases.length).toBe(70);
    expect(RECORD.cases.length).toBe(PART.cases.length);
    expect(new Set(RECORD.cases.map((r) => r.case_id))).toEqual(new Set(PART.cases.map((c: any) => c.case_id)));
  });
  test('8 of 8 formula verdicts that are not RIGHT were classified', () => {
    const notRight = PART.formula_checks.filter((f: any) => f.verdict !== 'RIGHT').map((f: any) => f.id);
    expect(notRight.length).toBe(8); expect(PART.formula_checks.length).toBe(14);
    expect(new Set(RECORD.formula.map((f) => f.id))).toEqual(new Set(notRight));
  });
  test('2 of 2 NOT HELD rule verdicts were classified', () => {
    const notHeld = PART.rules_held.filter((r: any) => r.verdict === 'NOT HELD').map((r: any) => r.rule);
    expect(notHeld.length).toBe(2); expect(PART.rules_held.length).toBe(9);
    expect(new Set(RECORD.rules.map((r) => r.rule))).toEqual(new Set(notHeld));
  });
  test('the eight private helpers were compiled from the app’s own text', () => {
    expect(compiled.pieces.length).toBe(PRIVATE.length);
    compiled.pieces.forEach((p, i) => expect(p).toMatch(new RegExp(`^(const ${PRIVATE[i]} = |function ${PRIVATE[i]}\\()`)));
  });
});
