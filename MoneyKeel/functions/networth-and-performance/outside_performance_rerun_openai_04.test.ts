/* THE OUTSIDE CASES, RUN AGAINST THE APP — Performance module re-run, OpenAI, part 4 ("pf module final — part 4"):
 * cards MK-PF-F-038 periodTotalReturn · MK-PF-F-039 periodReturnParts · MK-PF-F-040 returnSincePurchases ·
 * MK-PF-F-041 isoDay · MK-PF-F-042 windowTotal · MK-PF-F-043 windowTotalOfRow · MK-PF-F-044 startValues ·
 * MK-PF-F-045 priceHistoryShortSentence · MK-PF-F-046 saleShortOfPurchasesSentence · MK-ST-F-080 isDay ·
 * MK-ST-F-081 timeWeightedReturn · MK-ST-F-082 movementsOf (12 cards).
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/MoneyKeel_Performance_Audit_Package/
 * MoneyKeel_audit_part_4.json — 60 cases, 12 formula checks, 8 still-open items (rules_held, screen_checks and
 * could_not_test are empty, and asserted empty). The tests are GENERATED FROM THAT FILE: every case finds its
 * conversion below by card ID and title, and a case with none fails the run, so none can be dropped silently.
 * Results, case by case: MoneyKeel/documents/audit/outside-test-cases/returned/results/performance_openai_rerun_04_results.json
 *
 * MEASURING ONLY (2026-10-21): no app code, drawing, record or existing test was changed. Every expected answer is
 * OpenAI's, as written; only its plain input names are mapped onto the app's fields.
 *
 * VERDICTS: AGREES (plain test) · APP WRONG (test.failing holding OpenAI's answer, plus a test pinning what the app
 * answers) · REVIEWER WRONG (the same two tests; the reason is a ruling or a code fact) · NEEDS A RULING (the same
 * two tests; no ruling settles it) · BLOCKED (test.skip) — none in this part.
 *
 * INPUT NAMES MAPPED (the app's fields, never the answers):
 *   now / today → a LOCAL Date at noon of that day (noon keeps the calendar day in any zone). points / prices
 *   [[date, close]…] → a PriceSeries in the order given. period → Period ('5Y' handed in as written).
 *   lots [[shares, cost, date]…] → Position.lots { shares, cost_per_share, purchase_date }; a null date → '' (how the
 *   sync stores a tax lot with no date: ingest.ts, `purchase_date: l.purchase_date ?? ''`). firstDay → the function's firstDay; where the case gives none,
 *   the earliest dated purchase, which is what buildPerformance hands it (`bought = earliestPurchaseDate(p) ?? …`).
 *   local_date → new Date(y, m − 1, d, h, mi, s); { instant, timezone } → isoDay run in a separate Node process with
 *   TZ set to that zone (the function reads the device's zone).
 *   windowTotal: total "absent" → undefined, years "absent" → not handed in; rate_basis has no field in the app.
 *   windowTotalOfRow / startValues: a row { value, total } → PerformanceRow { marketValue: value, periodTotal: total,
 *   periodReturn: periodReturn ?? total }; startValues is asked with windowTotalOfRow, as portfolioBenchReturn asks it.
 *   actual_start / purchase_inside have no field on a row: the app cannot be handed them.
 *   saleShortOfPurchasesSentence: kind stock → kind 'stock' (unit shares), crypto → 'crypto', option → 'options';
 *   money "whole dollars" → money() (src/domain/_shared/num.ts); the count writer is the one HoldingDetailScreen.tsx
 *   hands it (quantityText): coinQuantity for a coin, String otherwise.
 *   timeWeightedReturn: days { date: { account: value } } → SnapshotDays with one typed value per account; measured →
 *   accountIds; cash → cashIds; flows / interest → DatedAmounts.
 *   movementsOf records: deposit → DEPOSIT, withdrawal → WITHDRAWAL, interest → INTEREST (reinvested as given),
 *   transfer { from, to } → TRANSFER { account_id: from, counter_account_id: to }, shares_moved → TRANSFER_IN_KIND
 *   { account_id: from, counter_account_id: to, shares, price, amount }. Output account → accountId.
 *   "REFUSES" = null (or a refusal reason). "shown" strings are display only and are not asserted.
 * TOLERANCE: 1e-9 of the figure (OpenAI wrote twelve or more significant digits).
 *
 * FIXED AFTER THE MEASURING, 2026-10-21 (the fix job, not this file's measuring): MK-ST-F-082 · In-kind external security plus
 * missing interest, and the −$500 deposit reversal found while checking. Both were test.failing; both now pass, with the
 * ruling in the test's name. Nothing was deleted: the conversion keeps OpenAI's answer as written, and "what the app
 * answers now" holds the new answer, with the old one in a comment beside it.
 *
 * WORK UNDER WAY ELSEWHERE THE SAME DAY (Net worth launch): time-weighted-return.ts and ingest.ts are being edited
 * (activity the app cannot name refuses the return; a one-sided broker journal keeps its direction). No case here
 * hands in such a record, so no answer depends on that work — but the file is re-run after it lands.
 *
 * Functions the app does not export (periodReturnParts, closeAsOf, dayBefore, returnSincePurchases, isoDay,
 * windowTotalOfRow, startValues, isDay, coinQuantity) are read out of their own source text and compiled as written.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { execFileSync } from 'child_process';
import {
  periodTotalReturn, periodReturn, latestClose, startDateFor, closeOnOrBefore, windowTotal, priceHistoryShortSentence,
  lotCostOnRecord, purchaseDateOnRecord,
  worthWithInterest, portfolioBenchReturn, buildPerformance, type PriceSeries, type Position,
} from '../../../src/domain/performance';
import { saleShortOfPurchasesSentence } from '../../../src/domain/performance/realized';
import { money } from '../../../src/domain/_shared/num';
import { timeWeightedReturn, movementsOf } from '../../../Calculation Module code/engines/time-weighted-return';
import { ingestSync, stAssetId } from '../../../src/services/sync/ingest';

// ── the outside file, read as data ─────────────────────────────────────────────────────────────────
const PKG = path.join(__dirname, '../../documents/audit/outside-test-cases/returned/MoneyKeel_Performance_Audit_Package');
const PART = JSON.parse(fs.readFileSync(path.join(PKG, 'MoneyKeel_audit_part_4.json'), 'utf8'));

// ── the functions the app does not export, compiled from their own source text ──────────────────────
const ROOT = path.join(__dirname, '../../..');
const PERF = 'src/domain/performance/index.ts';
const TWR = 'Calculation Module code/engines/time-weighted-return.ts';
const src = (file: string, start: string, end: string) => {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const at = text.indexOf(start);
  if (at < 0) throw new Error(`${start} not found in ${file}`);
  const to = text.indexOf(end, at);
  if (to < 0) throw new Error(`end of ${start} not found in ${file}`);
  return ts.transpileModule(text.slice(at, to + end.length), { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText;
};
const parts = new Function('latestClose', 'startDateFor',
  `${src(PERF, 'function dayBefore(', '\n}\n')}\n${src(PERF, 'function closeAsOf(', '\n}\n')}\n${src(PERF, 'function periodReturnParts(', '\n}\n')}\nreturn { periodReturnParts };`,
)(latestClose, startDateFor);
const periodReturnParts: (s: PriceSeries | null, p: string, now: Date) => { total: number; years: number } | null = parts.periodReturnParts;
const returnSincePurchases: (p: Position, s: PriceSeries | null, price: number | null, firstDay: string) => number | null =
  // its steps live in purchasePieces since 2026-10-21 (so a holding worth $0 keeps the value it is measured from): both compiled
  // (2026-10-21) purchasePieces reads a cost and a date the one way: lotCostOnRecord, purchaseDateOnRecord — handed over too
  new Function('closeOnOrBefore', 'lotCostOnRecord', 'purchaseDateOnRecord', `${src(PERF, 'function returnSincePurchases(', '\n}\n')}\n${src(PERF, 'function purchasePieces(', '\n}\n')}\nreturn returnSincePurchases;`)(closeOnOrBefore, lotCostOnRecord, purchaseDateOnRecord);
const ISO_DAY_JS = src(PERF, 'function isoDay(', '\n}\n');
const isoDay: (d: Date) => string = new Function(`${ISO_DAY_JS}\nreturn isoDay;`)();
const windowTotalOfRow: (r: any) => number | null =
  new Function('windowTotal', `${src(PERF, 'const windowTotalOfRow = ', ';\n')}\nreturn windowTotalOfRow;`)(windowTotal);
const startValues: (rows: any[], retOf: (r: any) => number | null) => { row: any; ret: number; start: number }[] =
  new Function('worthWithInterest', `${src(PERF, 'function startValues(', '\n}\n')}\nreturn startValues;`)(worthWithInterest);
const isDay: (d: unknown) => boolean = new Function(`${src(TWR, 'const isDay = ', ';\n')}\nreturn isDay;`)();
const coinQuantity: (n: number) => string = new Function(`${src('src/components/useMoney.ts', 'const coinQuantity = ', ';\n')}\nreturn coinQuantity;`)();

// isoDay in another time zone: the same compiled function, in a Node process whose zone is that one
const isoDayIn = (tz: string, instant: string) => execFileSync(process.execPath,
  ['-e', `${ISO_DAY_JS}\nprocess.stdout.write(isoDay(new Date(${JSON.stringify(instant)})));`],
  { env: { ...process.env, TZ: tz } }).toString();

// ── helpers ─────────────────────────────────────────────────────────────────────────────────────────
const D = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const S = (pts: [string, number][] | null | undefined): PriceSeries | null =>
  pts ? { ticker: 'X', points: pts.map(([date, close]) => ({ date, close })) } : null;
const ex = (x: any): number => (x != null && typeof x === 'object' && 'exact' in x ? x.exact : x);
const near = (a: number | null | undefined, e: number) => {
  expect(a).not.toBeNull(); expect(a).not.toBeUndefined();
  expect(Math.abs((a as number) - e)).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(e)));
};
const refuses = (a: unknown) => expect(a ?? null).toBeNull();
const position = (lots: [number, number, string | null][], o: Partial<Position> = {}): Position =>
  ({ position_id: 'p', ticker: 'X', lots: lots.map(([shares, cost, date], i) => ({ lot_id: `l${i}`, shares, cost_per_share: cost, purchase_date: date ?? '' })), ...o }) as any;
const row = (r: any) => ({ position: { ticker: r.ticker ?? 'A' }, marketValue: r.value, periodReturn: r.periodReturn ?? r.total, periodTotal: r.total, ...r.extra });
const snapDay = (date: string, values: Record<string, number>) => ({ date, origin: 'observed', writtenAt: `${date}T00:00:00Z`, holdings: [],
  accounts: Object.entries(values).map(([accountId, v]) => ({ date, accountId, cash: 0, statedTotal: null, typedValue: v, currency: 'USD' })) });
const twrOf = (i: any) => timeWeightedReturn({
  days: Object.entries(i.days).map(([d, v]) => snapDay(d, v as Record<string, number>)) as any,
  accountIds: new Set(i.measured), cashIds: new Set(i.cash ?? []),
  flows: (i.flows ?? []).map((f: any) => ({ date: f.date, accountId: f.account, amount: f.amount })),
  interest: (i.interest ?? []).map((f: any) => ({ date: f.date, accountId: f.account, amount: f.amount })),
  start: i.start, end: i.end,
});
const TYPE: Record<string, string> = { deposit: 'DEPOSIT', withdrawal: 'WITHDRAWAL', interest: 'INTEREST', transfer: 'TRANSFER', shares_moved: 'TRANSFER_IN_KIND' };
const record = (r: any) => ({ type: TYPE[r.kind], date: r.date, amount: r.amount,
  account_id: r.account ?? r.from, ...(r.to ? { counter_account_id: r.to } : {}),
  ...(r.shares != null ? { shares: r.shares, price: r.price } : {}), ...(r.reinvested != null ? { reinvested: r.reinvested } : {}) });
const movesOf = (i: any) => movementsOf(i.records.map(record), new Set(i.measured));
const flowsAre = (got: any[], want: any[]) => {
  expect(got.length).toBe(want.length);
  want.forEach((w, k) => { expect(got[k].date).toBe(w.date); expect(got[k].accountId).toBe(w.account); near(got[k].amount, ex(w.amount)); });
};

// ── what was measured, for the results file (written only when PERF_RERUN_04_DUMP names a path) ─────
const ACTUAL: Record<string, unknown> = {};
const LOG: any[] = [];
afterAll(() => {
  const out = process.env.PERF_RERUN_04_DUMP;
  if (out) fs.writeFileSync(out, JSON.stringify({ cases: LOG.map((l) => ({ ...l, actual: ACTUAL[l.key] ?? null })) }, (_k, v) => (v instanceof Set ? [...v] : v), 1));
});

type Verdict = 'AGREES' | 'APP WRONG' | 'REVIEWER WRONG' | 'NEEDS A RULING' | 'BLOCKED';
interface Conv {
  verdict: Verdict;
  why?: string;                               // under 60 words, IDs first
  act: (i: any) => unknown;                   // the app's answer, from the real function
  reviewer: (a: any, c: any) => void;         // OpenAI's expectation, as written
  pin?: (a: any, c: any) => void;             // what the app answers, where it differs
  /** FIXED after the measuring: the day and the ruling. OpenAI's answer becomes a passing test with this in its name, and
   *  `pin` holds what the app answers now. The verdict stays what was measured. */
  fixed?: string;
}
const num1 = (fn: (i: any) => number | null): Pick<Conv, 'act' | 'reviewer'> => ({
  act: fn, reviewer: (a, c) => (c.expected === 'REFUSES' ? refuses(a) : near(a, ex(c.expected))),
});

// ═════════════════════════════════════════ THE 60 CASES ═══════════════════════════════════════════
const FIRST_PRICE = 'The app measures from the first price, as DEC-4641 rules: closeAsOf falls back to the first close (`return chosen ?? pts[0].close`). '
  + 'OpenAI\'s "formula gives REFUSES" came from the card\'s words, which leave that fallback out.';
const NO_FUTURE_CLOSE = 'Every screen asks with today\'s clock, and a price can never be from the future: a close dated after today is the '
  + 'latest price written under its UTC day (marketData.ts, `toISOString().slice(0, 10)`), e.g. a coin in a US evening. Dropping it would show an older price. App +17.00%.';
const parts1Y = (c: any) => periodReturnParts(S(c.inputs.points), c.inputs.period, D(c.inputs.now));
const partsCheck = (a: any, c: any) => {
  if (c.expected === 'REFUSES') return refuses(a);
  expect(a).not.toBeNull(); near(a.total, ex(c.expected.total)); near(a.years, ex(c.expected.years));
};

const CONV: Record<string, Record<string, Conv>> = {
  'MK-PF-F-038': {
    'One-year price move': { verdict: 'AGREES', ...num1((i) => periodTotalReturn(S(i.points), i.period, D(i.now))) },
    'Two-year total versus yearly pace': { verdict: 'AGREES', ...num1((i) => periodTotalReturn(S(i.points), i.period, D(i.now))) },
    'Short history of five months': { verdict: 'AGREES', why: FIRST_PRICE, ...num1((i) => periodTotalReturn(S(i.points), i.period, D(i.now))) },
    'As-of endpoint excludes future point': {
      verdict: 'REVIEWER WRONG', why: NO_FUTURE_CLOSE, ...num1((i) => periodTotalReturn(S(i.points), i.period, D(i.now))),
      pin: (a) => near(a, 97.31 / 83.17 - 1),
    },
    'Unknown 5Y name': { verdict: 'AGREES', ...num1((i) => periodTotalReturn(S(i.points), i.period, D(i.now))) },
  },
  'MK-PF-F-039': {
    'One-year price move': { verdict: 'AGREES', act: (i) => parts1Y({ inputs: i }), reviewer: partsCheck },
    'Two-year total versus yearly pace': { verdict: 'AGREES', act: (i) => parts1Y({ inputs: i }), reviewer: partsCheck },
    'Short history of five months': { verdict: 'AGREES', why: FIRST_PRICE, act: (i) => parts1Y({ inputs: i }), reviewer: partsCheck },
    'As-of endpoint excludes future point': {
      verdict: 'REVIEWER WRONG', why: NO_FUTURE_CLOSE, act: (i) => parts1Y({ inputs: i }), reviewer: partsCheck,
      pin: (a) => { near(a.total, 97.31 / 83.17 - 1); expect(a.years).toBe(1); },
    },
    'Unknown 5Y name': { verdict: 'AGREES', act: (i) => parts1Y({ inputs: i }), reviewer: partsCheck },
  },
  'MK-PF-F-040': {
    'Single purchase': { verdict: 'AGREES', ...num1((i) => returnSincePurchases(position(i.lots), S(i.prices), i.today_price, i.firstDay)) },
    'Single purchase day loss': { verdict: 'AGREES', ...num1((i) => returnSincePurchases(position(i.lots), S(i.prices), i.today_price, i.firstDay)) },
    'Morning purchase old mark versus new close': {
      verdict: 'APP WRONG',
      why: 'DEC-4439 (a refinement of DEC-1669, which rules every return): money that moves on a day counts for that whole day. The app ends the '
        + 'old piece at that day\'s close and adds the purchase after it — the end-of-day rule DEC-4439 retired. App +26.76%; DEC-4439 +15.24%, '
        + 'what the account reads when the $1,100 is deposited that morning (tenet 4).',
      ...num1((i) => returnSincePurchases(position(i.lots), S(i.prices), i.today_price, '2026-09-01')),
      pin: (a) => near(a, 1.21 * 2420 / 2310 - 1),
    },
    'Unround purchases on same date': { verdict: 'AGREES', ...num1((i) => returnSincePurchases(position(i.lots), S(i.prices), i.today_price, i.firstDay)) },
    'Undated real purchase cannot be placed by guess': {
      verdict: 'APP WRONG',
      why: 'Tenet 3: never a default that looks like an answer. A purchase with no date is put on the first dated purchase day '
        + '(`… : firstDay`), so the app shows +13.60% as if both were bought on Sep 17. A linked broker can send an undated tax lot '
        + 'beside dated ones (snaptrade.ts, `original_purchase_date ?? null`).',
      ...num1((i) => returnSincePurchases(position(i.lots), S(i.prices), i.today_price, i.firstDay)),
      pin: (a) => near(a, (10.375 * 97.31) / (7.25 * 83.17 + 3.125 * 91.43) - 1),
    },
  },
  'MK-PF-F-041': {
    'Two-digit ordinary day': { verdict: 'AGREES', act: (i) => isoDay(new Date(2026, 9, 13, 15, 17, 19)), reviewer: (a, c) => expect(a).toBe(c.expected) },
    'Pad single digits': { verdict: 'AGREES', act: () => isoDay(new Date(2026, 0, 2, 9, 0, 0)), reviewer: (a, c) => expect(a).toBe(c.expected) },
    'UTC instant becomes previous local day': { verdict: 'AGREES', act: (i) => isoDayIn(i.timezone, i.instant), reviewer: (a, c) => expect(a).toBe(c.expected) },
    'UTC instant becomes later local day': { verdict: 'AGREES', act: (i) => isoDayIn(i.timezone, i.instant), reviewer: (a, c) => expect(a).toBe(c.expected) },
    'Leap calendar day': { verdict: 'AGREES', act: () => isoDay(new Date(2024, 1, 29, 0, 0, 0)), reviewer: (a, c) => expect(a).toBe(c.expected) },
  },
  'MK-PF-F-042': {
    'Explicit window total wins': { verdict: 'AGREES', ...num1((i) => windowTotal(i.rate, i.total, i.years)) },
    'Short known total rate': { verdict: 'AGREES', ...num1((i) => windowTotal(i.rate, undefined, i.years)) },
    'Recover two-year total': { verdict: 'AGREES', ...num1((i) => windowTotal(i.rate, undefined, i.years)) },
    'Long unround span': { verdict: 'AGREES', ...num1((i) => windowTotal(i.rate, undefined, i.years)) },
    'Yearly rate with missing duration': {
      verdict: 'REVIEWER WRONG',
      why: 'No caller hands windowTotal a yearly rate without its total or its years: every row buildPerformance writes carries its window '
        + 'total (buildPerformance, `periodTotal: prTotal`; the fact test below checks every kind of row) and gainOfRow passes the years. '
        + 'The input never occurs in the app; asked anyway, it answers +10.00%.',
      ...num1((i) => windowTotal(i.rate, undefined)),
      pin: (a) => near(a, 0.1),
    },
  },
  'MK-PF-F-043': {
    'Explicit one-year total': { verdict: 'AGREES', ...num1((i) => windowTotalOfRow({ periodReturn: i.periodReturn, periodTotal: i.periodTotal })) },
    'Explicit unknown total wins': { verdict: 'AGREES', ...num1((i) => windowTotalOfRow({ periodReturn: i.periodReturn, periodTotal: i.periodTotal })) },
    'Two-year total present': { verdict: 'AGREES', ...num1((i) => windowTotalOfRow({ periodReturn: i.periodReturn, periodTotal: i.periodTotal })) },
    'Long legacy row lacks total': {
      verdict: 'REVIEWER WRONG',
      why: 'There is no legacy row: every screen builds its rows fresh with buildPerformance, which always writes the window total '
        + '(`periodTotal: prTotal`; the fact test below checks every kind of row). Asked about a row that cannot exist, the app answers +2.73%.',
      ...num1((i) => windowTotalOfRow({ periodReturn: i.periodReturn })),
      pin: (a) => near(a, 0.0273),
    },
    'No fields': { verdict: 'AGREES', ...num1(() => windowTotalOfRow({})) },
  },
  'MK-PF-F-044': {
    'Unchanged appreciated holding': { verdict: 'AGREES', act: (i) => startValues(i.rows.map(row), windowTotalOfRow), reviewer: (a, c) => startsAre(a, c.expected) },
    'No qualifying returns': { verdict: 'AGREES', act: (i) => startValues(i.rows.map(row), windowTotalOfRow), reviewer: (a, c) => startsAre(a, c.expected) },
    'Three known unchanged holdings': { verdict: 'AGREES', act: (i) => startValues(i.rows.map(row), windowTotalOfRow), reviewer: (a, c) => startsAre(a, c.expected) },
    'Changed shares invent beginning': {
      verdict: 'NEEDS A RULING',
      why: 'The app does what DEC-5068 approved — start = value now ÷ (1 + its own return) — which is right only when no shares were bought '
        + 'inside the window. Home "market" (MK-PF-M-008): holding A bought 10 more mid-window reads +7.33%; with its real $1,000 start, +6.00%.',
      act: (i) => startValues(i.rows.map(row), windowTotalOfRow), reviewer: (a, c) => startsAre(a, c.expected),
      pin: (a) => { expect(a).toHaveLength(1); near(a[0].start, 2000); near(a[0].ret, 0.21); },
    },
    'Wiped-out holding still had beginning': {
      verdict: 'APP WRONG',
      why: 'Tenet 4, and the function\'s own rule ("out of the market\'s average as it is out of the person\'s"): a holding that lost everything '
        + 'is in the person\'s return but left out of the market\'s. Home "market" (MK-PF-M-008): +2.00% shown, +6.00% with its $1,000 start. '
        + 'Rare: it needs a close of exactly $0.',
      fixed: '2026-10-21 (DEC-5068, tenet 4; a known $0 is $0): a holding worth $0 today counts at the value it was read at when the window began',
      // OpenAI's actual_start is the value buildPerformance now writes on every row (startValue: the shares × the close the
      // window divides by); the row hands it in as the app's own rows do
      act: (i) => startValues(i.rows.map((x: any) => ({ ...row(x), startValue: x.actual_start })), windowTotalOfRow), reviewer: (a, c) => startsAre(a, c.expected),
      // BEFORE 2026-10-21 the app answered: [] — the wiped-out holding left out of the market's average
      pin: (a) => { expect(a).toHaveLength(1); near(a[0].start, 1000); expect(a[0].ret).toBe(-1); },
    },
  },
  'MK-PF-F-045': Object.fromEntries(['Full coverage emits no line', 'Owner five-month example', 'One month singular across several dates',
    'Whole months await anniversary day', 'Unsupported label'].map((t) => [t, {
    verdict: 'AGREES' as Verdict,
    act: (i: any) => priceHistoryShortSentence(i.points, i.windowStart, i.period, i.today),
    reviewer: (a: any, c: any) => expect(a).toBe(c.expected),
  }])),
  'MK-PF-F-046': Object.fromEntries(['Owner partially matched gain', 'None matched', 'Fractional coins and loss', 'Mini option quantity unit',
    'One contract none matched'].map((t) => [t, {
    verdict: 'AGREES' as Verdict,
    act: (i: any) => {
      const kind = i.kind === 'crypto' ? 'crypto' : i.kind === 'option' ? 'options' : 'stock';
      return saleShortOfPurchasesSentence(i.sale, { kind, ...(i.unit ? { unit: i.unit } : {}) } as any, money, kind === 'crypto' ? coinQuantity : String);
    },
    reviewer: (a: any, c: any) => expect(a).toBe(c.expected),
  }])),
  'MK-ST-F-080': {
    'Real ordinary day': { verdict: 'AGREES', act: (i) => isDay(i.day), reviewer: (a, c) => expect(a).toBe(c.expected) },
    'Real leap day': { verdict: 'AGREES', act: (i) => isDay(i.day), reviewer: (a, c) => expect(a).toBe(c.expected) },
    'Timestamp does not equal day': { verdict: 'AGREES', act: (i) => isDay(i.day), reviewer: (a, c) => expect(a).toBe(c.expected) },
    'Broker padded or nontext day': { verdict: 'AGREES', act: (i) => i.values.map(isDay), reviewer: (a, c) => expect(a).toEqual(c.expected) },
    'Nonleap February': { verdict: 'AGREES', act: (i) => isDay(i.day), reviewer: (a, c) => expect(a).toBe(c.expected) },
  },
  'MK-ST-F-081': {
    'Two-day no-flow gain': { verdict: 'AGREES', act: twrOf, reviewer: (a, c) => twrIs(a, c.expected) },
    'Owner deposit into existing account': { verdict: 'AGREES', act: twrOf, reviewer: (a, c) => twrIs(a, c.expected) },
    'Two accounts, cash interest and external movements': { verdict: 'AGREES', act: twrOf, reviewer: (a, c) => twrIs(a, c.expected) },
    'Negative ending cannot be silently floored': {
      verdict: 'NEEDS A RULING',
      why: 'No ruling covers an account worth less than nothing (a margin debt). The app floors the value at $0 and shows −100.00%; the true '
        + 'change is −108.32%; OpenAI wants no figure. Tenet 7 rules out −100% (it looks better than it is); he must choose −108.32% or no figure.',
      act: twrOf, reviewer: (a, c) => twrIs(a, c.expected),
      pin: (a) => { expect(a.rate).toBe(-1); expect(a.measuredFrom).toBe('2026-09-01'); },
    },
    'Positive base below half-cent': {
      verdict: 'REVIEWER WRONG',
      why: 'A value under half a cent shows as $0 on every screen; the app treats it as nothing invested (SAME = 0.005, time-weighted-return.ts), '
        + 'so a screen never reads "$0 → $0, +10.00%" (tenet 4). The app refuses: nothing invested.',
      act: twrOf, reviewer: (a, c) => twrIs(a, c.expected),
      pin: (a) => { expect(a.rate).toBeNull(); expect(a.refused).toBe('NOTHING_INVESTED'); },
    },
  },
  'MK-ST-F-082': {
    'One positive deposit': { verdict: 'AGREES', act: movesOf, reviewer: (a, c) => movesAre(a, c.expected) },
    'Internal transfer cancels': { verdict: 'AGREES', act: movesOf, reviewer: (a, c) => movesAre(a, c.expected) },
    'Signed broker withdrawal must stay outflow': {
      verdict: 'REVIEWER WRONG',
      why: 'A stored withdrawal never carries a minus sign: linked records are written as size plus kind (money.ts readMoney; ingest.ts writes `row.amount`) '
        + 'and typed ones drop the minus (AccountPortfolioScreen.tsx activity sheet strips every non-digit). The test below sends the broker\'s −$3,287.19 through the real '
        + 'sync: it stays $3,287.19 out. Only this raw, never-stored record reads +$3,287.19.',
      act: movesOf, reviewer: (a, c) => movesAre(a, c.expected),
      pin: (a) => { near(a.flows[0].amount, 3287.19); near(a.flows[1].amount, 519.27); near(a.interest[0].amount, 3.17); },
    },
    'In-kind external security plus missing interest': {
      verdict: 'APP WRONG',
      why: 'Tenet 3: interest with no amount is read as $0 (time-weighted-return.ts, Number(amount) || 0). On a cash account that makes the '
        + 'interest look like money paid in, so Net worth\'s "Return on cash + investments" (MK-NW-M-002) leaves it out. The share move '
        + '($304.09 in) and the $83.17 out agree.',
      fixed: '2026-10-21 (DEC-3523 tenet 3, unknown is not zero): the interest is listed as having no amount and the return refuses across Sep 18',
      act: movesOf, reviewer: (a, c) => movesAre(a, c.expected),
      // BEFORE 2026-10-21 the app answered: interest [{ date: '2026-09-18', accountId: 'A', amount: 0 }] — a $0 interest
      pin: (a) => { flowsAre(a.flows, [{ date: '2026-09-17', account: 'A', amount: 304.09375 }, { date: '2026-09-19', account: 'A', amount: -83.17 }]);
        expect(a.interest).toEqual([]);
        expect(a.incomeMissing).toEqual([{ date: '2026-09-18', accountId: 'A', kind: 'INTEREST' }]);
        expect(a.amountMissing).toBeUndefined(); },
    },
    'Missing transfer magnitude crosses scope': { verdict: 'AGREES', act: movesOf, reviewer: (a, c) => movesAre(a, c.expected) },
  },
};

function startsAre(a: { row: any; ret: number; start: number }[], want: any[]) {
  expect(a).toHaveLength(want.length);
  want.forEach((w, k) => { expect(a[k].row.position.ticker).toBe(w.ticker); near(a[k].ret, ex(w.ret)); near(a[k].start, ex(w.start)); });
}
function twrIs(a: any, want: any) {
  if (want === 'REFUSES') { expect(a.rate).toBeNull(); return; }
  near(a.rate, ex(want.rate)); expect(a.measuredFrom).toBe(want.measuredFrom);
}
function movesAre(a: any, want: any) {
  flowsAre(a.flows, want.flows);
  // REFUSES: never a $0 interest — and (since 2026-10-21) the record is listed as having no amount, so the return can refuse
  if (typeof want.interest === 'string') { expect(a.interest.filter((x: any) => x.amount === 0)).toEqual([]); expect(a.incomeMissing?.length ?? 0).toBeGreaterThan(0); }
  else flowsAre(a.interest, want.interest);
  expect(a.sharesMoved).toEqual(want.sharesMoved);
  if (want.amountMissing) expect(a.amountMissing).toEqual(want.amountMissing); else expect(a.amountMissing).toBeUndefined();
}

// ── the cases, generated from the outside file ────────────────────────────────────────────────────
const CASES: any[] = PART.cases;
const converted = new Set<string>();
for (const id of [...new Set(CASES.map((c) => c.id))]) {
  describe(`${id} ${CASES.find((c) => c.id === id).name} — five cases`, () => {
    for (const c of CASES.filter((x) => x.id === id)) {
      const conv = CONV[id]?.[c.title];
      if (!conv) { test(`${c.kind} · ${c.title} — NOT CONVERTED`, () => { throw new Error(`no conversion for ${id} · ${c.title}`); }); continue; }
      const key = `${id} · ${c.title}`;
      converted.add(key);
      const named = conv.fixed ? `${conv.verdict} · FIXED ${conv.fixed}` : conv.verdict;
      LOG.push({ key, id, name: c.name, kind: c.kind, title: c.title, verdict: conv.verdict, why: conv.why ?? '', expected: c.expected,
        formula_gives: c.formula_gives ?? null, ...(conv.fixed ? { fixed: conv.fixed } : {}),
        test: `${id} ${c.name} — five cases › ${c.kind} · ${c.title} — ${named}` });
      const body = () => { const a = conv.act(c.inputs); ACTUAL[key] = a; conv.reviewer(a, c); };
      if (conv.verdict === 'AGREES') test(`${c.kind} · ${c.title} — ${conv.verdict}`, body);
      else if (conv.verdict === 'BLOCKED') test.skip(`${c.kind} · ${c.title} — ${conv.verdict}`, body);
      else if (conv.fixed) {
        // FIXED after the measuring: OpenAI's answer, as written, is now the app's — a passing test, the ruling in its name
        test(`${c.kind} · ${c.title} — ${named}`, body);
        test(`${c.kind} · ${c.title} — what the app answers now`, () => { const a = conv.act(c.inputs); ACTUAL[key] = a; conv.pin!(a, c); });
      } else {
        // OpenAI's answer, kept as written: the app does not give it
        test.failing(`${c.kind} · ${c.title} — ${conv.verdict}`, body);
        test(`${c.kind} · ${c.title} — what the app answers`, () => { const a = conv.act(c.inputs); ACTUAL[key] = a; conv.pin!(a, c); });
      }
    }
  });
}

// ═════════════════════════════ THE CODE FACTS THE VERDICTS REST ON ═════════════════════════════════
describe('the facts behind the verdicts', () => {
  test('MK-PF-F-038 / F-039: both readers start at the first price (DEC-4641) and give the same 1Y total, never made yearly; the sentence names 5 months', () => {
    const s = S([['2026-05-04', 83.17], ['2026-10-10', 91.43]]);
    near(periodTotalReturn(s, '1Y', D('2026-10-10')), 91.43 / 83.17 - 1);
    near(periodReturn(s, '1Y', D('2026-10-10')), 91.43 / 83.17 - 1);
    expect(priceHistoryShortSentence(s!.points, '2025-10-10', '1Y', '2026-10-10'))
      .toBe('Prices for this holding go back 5 months, so the 1-year figure covers 5 months — not a year.');
  });
  test('MK-PF-F-039: the two-year short-history branch IS reached — 14 months up 21% is made yearly over the 426 days the prices cover', () => {
    const s = S([['2025-08-13', 100], ['2026-10-13', 121]]);
    const p = periodReturnParts(s, '2Y', D('2026-10-13'))!;
    near(p.total, 0.21); near(p.years, 426 / 365.25);
    near(periodReturn(s, '2Y', D('2026-10-13')), Math.pow(1.21, 365.25 / 426) - 1);   // +17.80% a year, not +10.00%
  });
  test('MK-PF-F-042 / F-043: every row buildPerformance writes carries its window total and the market\'s — priced, unpriced, bought inside, short history, 2Y', () => {
    const series: Record<string, PriceSeries | null> = {
      LONG: S([['2024-10-01', 100], ['2026-10-13', 121]]), SHORT: S([['2026-05-04', 83.17], ['2026-10-13', 91.43]]),
      SPY: S([['2024-10-01', 400], ['2026-10-13', 500]]), AGG: S([['2024-10-01', 95], ['2026-10-13', 99]]), NONE: null,
    };
    const ps = [
      position([[10, 90, '2023-01-05']], { ticker: 'LONG' }), position([[3, 80, '2026-05-04']], { ticker: 'SHORT' }),
      position([[2, 115, '2026-09-01']], { ticker: 'LONG', position_id: 'p2' } as any), position([[5, 10, null]], { ticker: 'NONE' }),
    ];
    let seen = 0;
    for (const period of ['1M', 'YTD', '1Y', '2Y'] as const) {
      for (const r of buildPerformance(ps, (t) => series[t] ?? null, period, D('2026-10-13'))) {
        expect(Object.prototype.hasOwnProperty.call(r, 'periodTotal')).toBe(true);
        expect(Object.prototype.hasOwnProperty.call(r, 'benchTotal')).toBe(true);
        seen++;
      }
    }
    expect(seen).toBe(16);   // 4 holdings × 4 windows: the guard proves it looked
  });
  test('MK-PF-F-044: a holding bought again inside the window gets exactly that row — total +21%, value $2,420, start read as $2,000', () => {
    const p = position([[10, 100, '2025-06-01'], [10, 110, '2026-09-02']], { ticker: 'A' });
    const [r] = buildPerformance([p], () => S([['2025-10-12', 100], ['2026-09-02', 110], ['2026-10-13', 121]]), '1Y', D('2026-10-13'));
    near(r.periodTotal, 0.21); near(r.marketValue, 2420);
    near(startValues([r], windowTotalOfRow)[0].start, 2000);   // the shares held when the window began were worth $1,000
  });
  test('MK-PF-F-044 → MK-PF-M-008 Home "market": the two on-screen examples, worked through portfolioBenchReturn', () => {
    // A: 10 held at $100, 10 more bought mid-window, now $2,420 (+21%), yardstick +10%; B: $1,000 flat, yardstick +2%
    near(portfolioBenchReturn([row({ ticker: 'A', value: 2420, total: 0.21, extra: { benchTotal: 0.10 } }),
      row({ ticker: 'B', value: 1000, total: 0, extra: { benchTotal: 0.02 } })] as any), (0.10 * 2000 + 0.02 * 1000) / 3000);   // +7.33% shown
    near((0.10 * 1000 + 0.02 * 1000) / 2000, 0.06);                                                                            // +6.00% from the real starts
    // A: $1,000 → $0, yardstick +10%; B: $1,000 → $1,200, yardstick +2%
    // FIXED 2026-10-21 (DEC-5068, tenet 4): with the start every row now carries, +6.00%; BEFORE it read +2.00% (A left out).
    // A row handed in with no start is still left out (the second line) — buildPerformance never writes one without it.
    near(portfolioBenchReturn([row({ ticker: 'A', value: 0, total: -1, extra: { benchTotal: 0.10, startValue: 1000 } }),
      row({ ticker: 'B', value: 1200, total: 0.2, extra: { benchTotal: 0.02, startValue: 1000 } })] as any), 0.06);             // +6.00% shown
    near(portfolioBenchReturn([row({ ticker: 'A', value: 0, total: -1, extra: { benchTotal: 0.10 } }),
      row({ ticker: 'B', value: 1200, total: 0.2, extra: { benchTotal: 0.02 } })] as any), 0.02);
  });
  test('MK-ST-F-081: the floor at zero — an account worth $1,000.17 then −$83.19 reads −100.00%; unfloored it is −108.32%', () => {
    const a = twrOf({ start: '2026-09-01', end: '2026-09-02', measured: ['A'], days: { '2026-09-01': { A: 1000.17 }, '2026-09-02': { A: -83.19 } } });
    expect(a.rate).toBe(-1);
    near(-83.19 / 1000.17 - 1, -1.0831758601037824);
  });
  test('MK-ST-F-081: an account still held is on the last day (built from the live accounts), so only one that is gone reads as leaving', () => {
    const a = twrOf({ start: '2026-09-01', end: '2026-09-03', measured: ['A', 'B'],
      days: { '2026-09-01': { A: 1000, B: 500 }, '2026-09-02': { A: 1010, B: 505 }, '2026-09-03': { A: 1020 } } });
    near(a.rate, (1515 / 1500) * (1020 / (1515 - 505)) - 1);   // B left on Sep 3: its $505 went out, nothing earned or lost by it
  });
  test('MK-ST-F-082: an infinite amount is refused as no amount, never passed through', () => {
    const m = movementsOf([{ type: 'DEPOSIT', account_id: 'A', amount: Infinity, date: '2026-09-17' }], new Set(['A']));
    expect(m.flows).toEqual([]); expect(m.amountMissing).toEqual(['2026-09-17']);
  });
  test('MK-ST-F-082: the broker\'s signed withdrawal through the real sync stays money out — −$3,287.19', () => {
    const r = ingestSync([], {}, [{
      account: { id: 'acc-1', brokerage_authorization: 'c', name: 'Brokerage', number: '1', institution_name: 'Broker', raw_type: 'Individual',
        balance: { total: { amount: 10000, currency: 'USD' } }, sync_status: { holdings: { initial_sync_completed: true } } } as any,
      balancesCash: 10000, positions: [],
      activities: [{ id: 'w1', type: 'WITHDRAWAL', trade_date: '2026-09-17', amount: -3287.19 }] as any,
    }], '2026-10-13T12:00:00.000Z');
    const stored = r.newTransactions.filter((t: any) => t.type === 'WITHDRAWAL');
    expect(stored).toHaveLength(1); near(stored[0].amount as number, 3287.19);
    const m = movementsOf(r.newTransactions, new Set([stAssetId('acc-1')]));
    expect(m.flows).toHaveLength(1); near(m.flows[0].amount, -3287.19);
  });
});

// ═══════════════════ FOUND WHILE CHECKING — not one of OpenAI's items, not in the count ═══════════════
describe('found while checking (not an outside item)', () => {
  // FINDING: a broker's REVERSAL of a deposit (−$500 on a CONTRIBUTION row) is read by the engine as money OUT
  // (money.ts readMoney: "the sign always keeps its meaning"), but the sync stores only the type and the size —
  // DEPOSIT $500, its direction written only for transfers (ingest.ts, the `direction:` line of the transaction write) — so movementsOf counts +$500 IN.
  // The return then reads $1,000 of the person's own money wrongly. Sits in ingest.ts, which is being edited today.
  // FIXED 2026-10-21 (DEC-3523 tenet 1, a wrong number ends trust — kept the way DEC-6623 keeps a journal's direction): the
  // sync writes the deposit's direction, OUT, and every reader reads a stored amount one way (moneyIntoAccount, ledger.ts).
  const reversal = () => {
    const r = ingestSync([], {}, [{
      account: { id: 'acc-2', brokerage_authorization: 'c', name: 'Brokerage', number: '2', institution_name: 'Broker', raw_type: 'Individual',
        balance: { total: { amount: 10000, currency: 'USD' } }, sync_status: { holdings: { initial_sync_completed: true } } } as any,
      balancesCash: 10000, positions: [],
      activities: [{ id: 'r1', type: 'CONTRIBUTION', trade_date: '2026-09-18', amount: -500 }] as any,
    }], '2026-10-13T12:00:00.000Z');
    return { stored: r.newTransactions, m: movementsOf(r.newTransactions, new Set([stAssetId('acc-2')])) };
  };
  test('FIXED 2026-10-21 (DEC-3523 tenet 1, as DEC-6623 keeps a journal\'s direction): a −$500 deposit reversal from the broker stays money out in the return', () => {
    const { m } = reversal();
    expect(m.flows).toHaveLength(1); near(m.flows[0].amount, -500);
  });
  test('what the app does with it now: stored as a $500 deposit with direction OUT, read as $500 OUT — as it was stored before 2026-10-21 (no direction), $500 IN', () => {
    const { stored, m } = reversal();
    expect(stored).toHaveLength(1);
    expect(stored[0].type).toBe('DEPOSIT'); near(stored[0].amount as number, 500); expect((stored[0] as any).direction).toBe('OUT');
    expect(m.flows).toHaveLength(1); near(m.flows[0].amount, -500);
    // BEFORE: the same record with its direction dropped, as the sync wrote it until 2026-10-21, read $500 coming in
    const before = movementsOf([{ ...stored[0], direction: undefined }], new Set([stAssetId('acc-2')]));
    near(before.flows[0].amount, 500);
  });
});

// ═════════════════════ THE 12 FORMULA CHECKS AND THE 8 STILL-OPEN ITEMS ════════════════════════════
const CHECKS: Record<string, { verdict: Verdict; why: string }> = {
  'MK-PF-F-038': { verdict: 'REVIEWER WRONG', why: 'The "refuses short history" claim is false in code: closeAsOf falls back to the first close (DEC-4641), so periodTotalReturn and periodReturn both give +9.93% in the five-month example. The card\'s words for MK-PF-F-039 leave that fallback out: the master file\'s card needs it added (file and code must match).' },
  'MK-PF-F-039': { verdict: 'REVIEWER WRONG', why: 'Same fallback, so the two-year short-history branch is reached: 14 months up 21% reads +17.80% a year (fact test). Card text needs the fallback.' },
  'MK-PF-F-040': { verdict: 'APP WRONG', why: 'Both claims hold: a later purchase is placed at the end of its day, against DEC-4439 (+26.76% where +15.24% is right), and an undated purchase is put on a guessed day (tenet 3).' },
  'MK-PF-F-041': { verdict: 'AGREES', why: 'Five of five cases agree, both time-zone crossings included.' },
  'MK-PF-F-042': { verdict: 'REVIEWER WRONG', why: 'Years defaulting to 0 never turns a yearly rate into a total in the app: every row carries its total and the one caller reading yearly rates (gainOfRow) passes the years. Making periodTotal required on the row type would close the door; no figure is wrong today.' },
  'MK-PF-F-043': { verdict: 'REVIEWER WRONG', why: 'No row without a window total exists (fact test: 16 of 16 rows carry it), so the 2Y "legacy row" cannot reach it.' },
  'MK-PF-F-044': { verdict: 'NEEDS A RULING', why: 'Working the start back from the return is DEC-5068\'s approved formula; it misstates the start when shares were bought inside the window (needs his ruling). Leaving out a holding that lost everything was wrong by tenet 4 (case level) — FIXED 2026-10-21: it counts at the start it was read at.' },
  'MK-PF-F-045': { verdict: 'AGREES', why: 'Five of five cases agree, word for word with DEC-4641\'s line.' },
  'MK-PF-F-046': { verdict: 'AGREES', why: 'Five of five cases agree, word for word with DEC-4643\'s line.' },
  'MK-ST-F-080': { verdict: 'AGREES', why: 'Five of five cases agree.' },
  'MK-ST-F-081': { verdict: 'NEEDS A RULING', why: 'Three claims: the floor at $0 needs his ruling; the half-cent line is right (a value under half a cent shows as $0); a disappearing account is right, since today\'s day is built from the live accounts (thePerformance, buildDayFromAccounts), so only an account that is gone reads as leaving.' },
  'MK-ST-F-082': { verdict: 'APP WRONG', why: 'Interest with no amount is read as $0 (tenet 3). The other two claims are wrong: a stored withdrawal carries no minus sign (fact test through the real sync), and an infinite amount is refused (fact test). FIXED 2026-10-21 (DEC-3523 tenet 3): interest, a dividend or a coupon with no amount is listed as not on record and the return refuses across its day.' },
};
const OPEN: Record<string, { verdict: Verdict; why: string }> = {
  'MK-PF-F-038': { verdict: 'AGREES', why: 'Already so: both readers start at the first price, the line comes from priceHistoryShortSentence, the total is never made yearly (fact test).' },
  'MK-PF-F-039': { verdict: 'AGREES', why: 'Already so: the first close is used, 2Y years are the span the prices cover, and the line says 5 months — never a full window.' },
  'MK-PF-F-040': { verdict: 'APP WRONG', why: 'Not yet so: the morning purchase and the undated purchase (the two failing cases).' },
  'MK-PF-F-042': { verdict: 'REVIEWER WRONG', why: 'An explicit total, an empty one included, already wins; a rate basis is not needed because no row arrives without its total.' },
  'MK-PF-F-043': { verdict: 'REVIEWER WRONG', why: 'No row arrives without its total (fact test), so nothing has to be compounded or refused here.' },
  'MK-PF-F-044': { verdict: 'NEEDS A RULING', why: 'Authentic start weights against DEC-5068\'s approved formula needs his ruling; including a total-loss holding was a plain fix (APP WRONG at case level) — FIXED 2026-10-21.' },
  'MK-ST-F-081': { verdict: 'NEEDS A RULING', why: 'Refuse or show a negative account value needs his ruling. Membership is already known and consistent; under half a cent is $0 as shown.' },
  'MK-ST-F-082': { verdict: 'APP WRONG', why: 'Missing interest amounts still read as $0. Already so: sign set at the sync, sizes positive, infinite refused, transfers net to zero; every stored record is dated, so no date marker can go missing. FIXED 2026-10-21 (DEC-3523 tenet 3): missing interest is kept as not on record, and a broker\'s real 0 is saved as 0.' },
};

describe('coverage — every item in part 4 is converted and classified', () => {
  test('60 of 60 cases converted (a floor: a case the file adds without a conversion fails above)', () => {
    expect(CASES.length).toBeGreaterThanOrEqual(60);
    expect(converted.size).toBe(CASES.length);
    expect(new Set(CASES.map((c) => `${c.id} · ${c.title}`)).size).toBe(CASES.length);   // titles are unique keys
  });
  test('12 of 12 formula checks classified, 8 of 8 still-open items classified', () => {
    expect(PART.formula_checks.length).toBeGreaterThanOrEqual(12);
    for (const f of PART.formula_checks) expect(CHECKS[f.id]?.verdict).toBeTruthy();
    expect(PART.still_open.length).toBeGreaterThanOrEqual(8);
    for (const s of PART.still_open) expect(OPEN[String(s).split(':')[0]]?.verdict).toBeTruthy();
  });
  test('the other lists in the file are empty, and it says it is not ready to close', () => {
    expect(PART.rules_held).toEqual([]); expect(PART.screen_checks).toEqual([]); expect(PART.could_not_test).toEqual([]);
    expect(PART.ready_to_close).toBe(false);
    expect(Object.keys(PART).sort()).toEqual(['batch', 'cases', 'could_not_test', 'formula_checks', 'ready_to_close', 'rules_held', 'screen_checks', 'still_open', 'written_by']);
  });
});
afterAll(() => {
  const out = process.env.PERF_RERUN_04_DUMP;
  if (out) {
    const prev = JSON.parse(fs.readFileSync(out, 'utf8'));
    fs.writeFileSync(out, JSON.stringify({ ...prev, checks: CHECKS, open: OPEN }, null, 1));
  }
});
