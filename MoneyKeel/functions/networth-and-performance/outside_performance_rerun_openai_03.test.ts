/* THE OUTSIDE CASES, RUN AGAINST THE APP — Performance module re-run, OpenAI, part 3 of 4: cards MK-PF-F-015, 020, 022,
 * 023, 028, 029, 031 to 037 (13 cards).
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/MoneyKeel_Performance_Audit_Package/
 * MoneyKeel_audit_part_3.json — 65 cases (five per card), 13 formula checks, 9 still-open lines; its run brief is
 * MoneyKeel_Claude_Code_Brief.md beside it. Every expected answer is OpenAI's, copied as written; only its plain input
 * names are mapped onto the app's fields. A case the app answers differently is marked, never fixed by changing the
 * answer here. Results, case by case, each with its classification:
 * MoneyKeel/documents/audit/outside-test-cases/returned/results/performance_openai_rerun_03_results.json
 *
 * MEASURING ONLY (2026-10-21): no app code is changed by this file. Net worth agents are editing code at the same time;
 * an item whose answer or fix touches what they are editing is marked IN-FLIGHT and is re-run after they land:
 * MK-PF-F-031 contractMultiplier (the bond quoted per $100 of face now runs through it, MK-XS-I-068) and the purchase
 * with no price paid on record in MK-PF-F-028 realizedFromLedger (addPosition now writes such a row with no price).
 *
 * Markers: `// FINDING:` the app fails a correct expectation and a decision makes the reviewer right (test.failing) ·
 * `// REVIEWER WRONG:` the expectation needs an input the app can never be handed, evidence given (test.failing, its
 * answer kept, plus a `pin ·` test of the app's answer) · `// NEEDS A RULING:` no decision settles it — where OpenAI gave
 * an answer it is kept as test.failing beside a `pin ·`; where OpenAI wrote RULE UNCLEAR the app's answer is asserted ·
 * `// BLOCKED:` none in this part · `witness ·` a test that measures a path the classification rests on ·
 * `// FOUND ON THE WAY:` a fault outside OpenAI's items, recorded but not counted in the 87.
 *
 * INPUT NAMES MAPPED (OpenAI's names → the app's fields):
 *   Days: "today"/"now" → a LOCAL Date at noon of that day (noon keeps the calendar day in any zone); a time written
 *   with it ("2026-10-13T15:17:19") → that local clock time. A case with no date runs on 2026-09-30 (the date the
 *   other cases of its card use). Prices [[day, close]…] → PriceSeries { ticker, points: [{date, close}] } in the order
 *   written. A look-back case with only two prices per fund ("from_prices": [100, 110]) → a close on the window's first
 *   day and one today, as "full_coverage: true" says.
 *   Look back: stayed/moved end → stayed/moved.endValue, change → .delta, percent (a share, 0.1) → .pct ÷ 100 (the app
 *   writes 10 for 10%), difference → difference.
 *   Concentration rows {ticker, value} → PerformanceRow with marketValue = value. Benchmark rows: value → marketValue,
 *   periodTotal / own_total → periodReturn and periodTotal, benchTotal / bench_total → benchReturn and benchTotal, a
 *   span that starts after the window → cappedSince.
 *   Ledger records [type, date, shares, price] → Transaction { type 'BUY' | 'SELL', date, shares, price, ticker,
 *   account_id }, of the ticker and account the case asks about; a record naming another account carries it. The last
 *   case names no ticker or account, so its sale is a VTI sale in account A, asked about VTI in A. "kind: option,
 *   multiplier: 10" → the holding asked about { kind 'options', multiplier 10 }; no kind → no holding named.
 *   Kinds: "stock" 'stocks_etf', "crypto" 'crypto', "option" 'options', "commodity" 'commodities'. "Infinity" → the
 *   number Infinity.
 *   "REFUSES" = null. "shown" strings are screen formatting, not these functions' output, and are not asserted.
 * NOT EXPORTED: closeAsOf (MK-PF-F-029), dayBefore (MK-PF-F-037) and unknownFigure (MK-PF-F-035) are read out of
 * src/domain/performance/index.ts and compiled as written — the app's own text, nothing re-typed.
 * TOLERANCES: money and factors to 1e-9 (floating-point products only); OpenAI's exact decimals were re-worked by hand
 * with exact decimal arithmetic before this file was written — one slip in a working line (MK-PF-F-028, basis written
 * $718.27 where 7.25 × 83.17 + 1.25 × 91.43 = $717.27); its expected gain, $109.865, is right.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { execFileSync } from 'child_process';
import {
  topHoldingConcentration, portfolioBenchReturn, monthsBefore, startDateFor, closeOnOrBefore, firstClose, calendarDay, contractMultiplier,
  quantityUnit, quantityWithUnit, buildPerformance, marketValue, type PriceSeries, type PerformanceRow, type Position,
} from '../../../src/domain/performance';
import { factorOverMonths, lookBack } from '../../../src/domain/performance/lookBack';
import { realizedFromLedger } from '../../../src/domain/performance/realized';
import { importHoldings } from '../../../src/domain/import/holdingsImport';

// the store is required inside the one witness that needs it; its storage is a plain object here
const _storage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((k: string) => Promise.resolve(_storage[k] ?? null)),
    setItem: jest.fn((k: string, v: string) => { _storage[k] = v; return Promise.resolve(); }),
    removeItem: jest.fn((k: string) => { delete _storage[k]; return Promise.resolve(); }),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve(Object.keys(_storage))),
    multiGet: jest.fn((keys: string[]) => Promise.resolve(keys.map((k) => [k, _storage[k] ?? null]))),
    multiSet: jest.fn((pairs: [string, string][]) => { pairs.forEach(([k, v]) => { _storage[k] = v; }); return Promise.resolve(); }),
  },
}));

// ── the functions the app does not export, compiled from their own source text ──────────────────────
const ROOT = path.join(__dirname, '../../..');
const sourceSlice = (file: string, start: string, end: string) => {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const at = text.indexOf(start);
  const to = text.indexOf(end, at);
  if (at < 0 || to < 0 || text.indexOf(start, at + 1) >= 0) throw new Error(`${start} not found once in ${file}`);
  return ts.transpileModule(text.slice(at, to), { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText;
};
const PERF = 'src/domain/performance/index.ts';
// (2026-10-21) closeAsOf compares days on the person's own calendar, by the app's one day readers — handed over
const closeAsOf: (s: PriceSeries | null | undefined, target: Date | string) => number | null =
  new Function('closeOnOrBefore', 'firstClose', 'calendarDay', `${sourceSlice(PERF, 'function closeAsOf(', '/** The close ON OR BEFORE a day')}\nreturn closeAsOf;`)(closeOnOrBefore, firstClose, calendarDay);
const dayBefore: (d: Date) => Date =
  new Function(`${sourceSlice(PERF, 'function dayBefore(', '/** Close on/just-before a target date')}\nreturn dayBefore;`)();
const unknownFigure: (v: unknown) => boolean =
  new Function(`${sourceSlice(PERF, 'const unknownFigure = ', '\n')}\nreturn unknownFigure;`)();

// ── helpers ─────────────────────────────────────────────────────────────────────────────────────────
const L = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const LT = (s: string) => {
  const [day, clock = '12:00:00'] = s.split('T');
  const [y, m, d] = day.split('-').map(Number); const [hh, mm, ss] = clock.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, ss);
};
const p2 = (n: number) => String(n).padStart(2, '0');
const localStamp = (d: Date) =>
  `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
const series = (pts: [string, number][], ticker = 'X'): PriceSeries => ({ ticker, points: pts.map(([date, close]) => ({ date, close })) });
const refuses = (v: unknown) => expect(v == null).toBe(true);
const near = (a: number | null | undefined, e: number, dp = 9) => {
  expect(a).not.toBeNull(); expect(a).not.toBeUndefined();
  expect(Math.abs((a as number) - e)).toBeLessThanOrEqual(0.5 * 10 ** -dp + 1e-12);
};
const pos = (o: Record<string, unknown>) => ({ position_id: String(o.ticker ?? 'p'), ticker: 'X', lots: [], ...o }) as unknown as Position;
const concRow = (ticker: string, value: number): PerformanceRow => ({
  position: pos({ ticker }), price: null, marketValue: value, costBasis: null, gain: null, totalROI: null,
  periodReturn: null, benchTicker: null, benchReturn: null, beatBy: null, cappedSince: null,
});
const benchRow = (value: number, own: number | null, bench: number | null, cappedSince: string | null = null): PerformanceRow => ({
  position: pos({ ticker: 'X' }), price: null, marketValue: value, costBasis: null, gain: null, totalROI: null,
  periodReturn: own, periodTotal: own, benchTicker: bench == null ? null : 'SPY', benchReturn: bench, benchTotal: bench,
  beatBy: null, cappedSince,
});
let txnN = 0;
const txn = (type: 'buy' | 'sale', date: string, shares: number, price: number | undefined, ticker = 'VTI', account = 'A') =>
  ({ id: `t${++txnN}`, created_at: `${date}T00:00:00Z`, type: type === 'buy' ? 'BUY' : 'SELL', date, shares, price, ticker, account_id: account }) as any;
const KIND: Record<string, string> = { stock: 'stocks_etf', crypto: 'crypto', option: 'options', commodity: 'commodities' };

// every case run here is registered, so the last test can prove all 65 were turned into tests. PF3_SHOW=1 runs every
// marked case as a plain test, to print the app's own answer beside OpenAI's.
const fails = process.env.PF3_SHOW === '1' ? test : test.failing;
const RUN = new Set<string>();
// `why`: a case the app was fixed to answer carries the reason after its title in the test's name; the registered key
// stays OpenAI's title, so the coverage check still finds it
const kase = (id: string, kind: string, title: string, fn: () => void, failing = false, why = '') => {
  RUN.add(`${id}|${kind}|${title}`);
  (failing ? fails : test)(`${kind} · ${title}${why ? ` — ${why}` : ''}`, fn);
};

/* ═══ MK-PF-F-023 lookBack ════════════════════════════════════════════════════════════════════════ */
describe('MK-PF-F-023 lookBack — five cases', () => {
  const NOW = L('2026-09-30');
  kase('MK-PF-F-023', 'easy', 'Round positive counterfactual', () => {
    const r = lookBack(10000, series([['2025-09-30', 100], ['2026-09-30', 110]]), series([['2025-09-30', 100], ['2026-09-30', 120]]), 12, NOW)!;
    near(r.stayed.endValue, 11000); near(r.stayed.delta, 1000); near(r.stayed.pct / 100, 0.1);
    near(r.moved.endValue, 12000); near(r.moved.delta, 2000); near(r.moved.pct / 100, 0.2);
    near(r.difference, 1000);
  });
  kase('MK-PF-F-023', 'easy', 'Alternative would lose more', () => {
    const r = lookBack(1000, series([['2025-09-30', 100], ['2026-09-30', 95]]), series([['2025-09-30', 100], ['2026-09-30', 90]]), 12, NOW)!;
    near(r.stayed.endValue, 950); near(r.moved.endValue, 900); near(r.difference, -50);
  });
  kase('MK-PF-F-023', 'complex', 'Realistic BND and VTI', () => {
    const r = lookBack(12345.67, series([['2025-09-28', 72], ['2026-09-28', 73.8]], 'BND'), series([['2025-09-28', 250], ['2026-09-28', 290]], 'VTI'), 12, L('2026-09-28'))!;
    near(r.stayed.endValue, 12654.311749999999, 6); near(r.stayed.delta, 308.64175, 6);
    near(r.moved.endValue, 14320.9772, 6); near(r.moved.delta, 1975.3072, 6); near(r.difference, 1666.6654500000002, 6);
  });
  // NEEDS A RULING: the three figures agree to the cent; the caption does not. The Look back card puts the stayed leg
  // under "WHAT ACTUALLY HAPPENED" (src/screens/LookBackScreen.tsx) and the register says MK-PF-M-010 answers "What your
  // money actually did, where it actually was." (look-back.ts). It is a lump sum left still: a person who added $319.17
  // inside the window did something else with their money. The heading is drawn on the approved Look back drawing v01
  // (DEC-1069, 2026-10-02), so tenet 6 keeps it until he rules; no decision says what the heading should be.
  // DECIDED 2026-10-21 (PF-B, the lead's decision under tenet 6, which outranks tenet 7): the heading stays as his approved
  // Look back drawing v01 draws it — the card's own line already says the result is real past prices, not a prediction.
  // OpenAI's refusal is kept, failing. To reverse: LookBackScreen.tsx, rename the band (a drawing row first).
  kase('MK-PF-F-023', 'complex', 'Lump sum differs from actual cash-flow path', () => {
    const r = lookBack(2871.43, series([['2026-06-30', 83.27], ['2026-09-30', 85.91]]), series([['2026-06-30', 191.73], ['2026-09-30', 187.26]]), 3, NOW)!;
    near(r.stayed.endValue, 2962.466089828269, 6); near(r.moved.endValue, 2804.4853794398373, 6); near(r.difference, -157.98071038843207, 6);
    const screen = fs.readFileSync(path.join(ROOT, 'src/screens/LookBackScreen.tsx'), 'utf8');
    const door = fs.readFileSync(path.join(__dirname, 'look-back.ts'), 'utf8');
    expect(screen).not.toMatch(/WHAT ACTUALLY HAPPENED/);          // actual_money_path: REFUSES — not called what actually happened
    expect(door).not.toMatch(/What your money actually did/);
  }, true);
  test('pin · Lump sum differs from actual cash-flow path — the app\'s figures, and the caption it prints today', () => {
    const r = lookBack(2871.43, series([['2026-06-30', 83.27], ['2026-09-30', 85.91]]), series([['2026-06-30', 191.73], ['2026-09-30', 187.26]]), 3, NOW)!;
    near(r.difference, -157.98071038843207, 6);
    expect(fs.readFileSync(path.join(ROOT, 'src/screens/LookBackScreen.tsx'), 'utf8')).toMatch(/<SectionBand title="WHAT ACTUALLY HAPPENED" \/>/);
  });
  kase('MK-PF-F-023', 'edge', 'One fund has no full-window history', () => {
    refuses(lookBack(10000, series([['2025-09-30', 100], ['2026-09-30', 110]]), series([['2026-01-01', 100], ['2026-09-30', 120]]), 12, NOW));
  });
});

/* ═══ MK-PF-F-036 monthsBefore ════════════════════════════════════════════════════════════════════ */
describe('MK-PF-F-036 monthsBefore — five cases', () => {
  kase('MK-PF-F-036', 'easy', 'Ordinary month back', () => { expect(localStamp(monthsBefore(LT('2026-10-13T15:17:19'), 1))).toBe('2026-09-13T15:17:19'); });
  kase('MK-PF-F-036', 'easy', 'Across year end', () => { expect(localStamp(monthsBefore(LT('2026-01-15T09:00:00'), 3))).toBe('2025-10-15T09:00:00'); });
  kase('MK-PF-F-036', 'complex', 'Three-month clamp', () => { expect(localStamp(monthsBefore(LT('2026-05-31T16:23:41'), 3))).toBe('2026-02-28T16:23:41'); });
  kase('MK-PF-F-036', 'complex', 'Leap-year annual clamp', () => { expect(localStamp(monthsBefore(LT('2024-02-29T17:43:29'), 12))).toBe('2023-02-28T17:43:29'); });
  // AGREES, at the one door that turns a window name into months: the case's window is "5Y", which the app does not
  // have, so it gives no start (DEC-4640, startDateFor). monthsBefore is never handed 1.5: its callers pass the window
  // table (WINDOW_MONTHS: 1, 3, 6, 12, 24) and the Look back's 12, 24 or 36 (LookBackScreen.tsx WINDOWS). The pin
  // below records what monthsBefore itself would do with 1.5 — a value no caller can send.
  kase('MK-PF-F-036', 'edge', 'Fractional months have no calendar definition', () => {
    refuses(startDateFor('5Y' as any, L('2026-10-13')));
  });
  test('pin · monthsBefore handed 1.5 directly (no caller can) reads it as 1 month', () => {
    expect(localStamp(monthsBefore(L('2026-10-13'), 1.5))).toBe('2026-08-13T12:00:00');
  });
  test('witness · a clock time that does not exist on the day reached (clocks going forward) keeps the calendar day', () => {
    // 2026-04-08 02:30 less one month is 2026-03-08 02:30, an hour the US Pacific clock skips; the day stays 8 March
    const d = monthsBefore(new Date(2026, 3, 8, 2, 30), 1);
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2026, 3, 8]);
    const e = dayBefore(new Date(2026, 2, 9, 2, 30));
    expect([e.getFullYear(), e.getMonth() + 1, e.getDate()]).toEqual([2026, 3, 8]);
  });
});

/* ═══ MK-PF-F-015 topHoldingConcentration ═════════════════════════════════════════════════════════ */
describe('MK-PF-F-015 topHoldingConcentration — five cases', () => {
  const rows = (v: [string, number][]) => v.map(([t, x]) => concRow(t, x));
  // NEEDS A RULING (OpenAI: RULE UNCLEAR): two holdings of equal value — the app names the one listed first (the
  // largest is replaced only by a strictly larger one, index.ts topHoldingConcentration). Share and value are settled.
  // DECIDED 2026-10-21 (PF-B, the lead's decision): the first one listed is named — the share stated is the same either way,
  // and the order is the account's own. To reverse: topHoldingConcentration, name every holding of the top value.
  kase('MK-PF-F-015', 'easy', 'Two equal holdings', () => {
    expect(topHoldingConcentration(rows([['A', 1000], ['B', 1000]]))).toEqual({ ticker: 'A', pct: 50, value: 1000 });
  });
  kase('MK-PF-F-015', 'easy', 'One holding has no concentration card', () => { refuses(topHoldingConcentration(rows([['A', 1000]]))); });
  kase('MK-PF-F-015', 'complex', 'Unround largest across three holdings', () => {
    const t = topHoldingConcentration(rows([['A', 12345.67], ['B', 4567.89], ['C', 3210.98]]))!;
    expect(t.ticker).toBe('A'); near(t.value, 12345.67); expect(t.pct).toBe(61);
    near(t.value / (12345.67 + 4567.89 + 3210.98), 0.6134634630158006);   // unrounded share, from the app's own value
  });
  // NEEDS A RULING (OpenAI: RULE UNCLEAR): a short position counts negative, so the share is of the NET total: 112%.
  // Reachable: a linked broker's short sends negative units, kept as a negative lot (snaptrade.ts mapPosition).
  // DECIDED 2026-10-21 (PF-B, the lead's decision under tenet 1): with a holding below $0, "a share of your invested money"
  // has no plain meaning, so no card — as with a holding of unknown worth. To reverse: topHoldingConcentration, drop that line.
  kase('MK-PF-F-015', 'complex', 'Signed positions give impossible net concentration', () => {
    refuses(topHoldingConcentration(rows([['A', 12345.67], ['B', -4567.89], ['C', 3210.98]])));
  }, false, 'decided 2026-10-21: a holding below $0 means no concentration card (tenet 1)');
  test.failing('pin · Signed positions — the app until 2026-10-21: A at 112% of the net total — no longer its answer (DECIDED 2026-10-21)', () => {
    const t = topHoldingConcentration(rows([['A', 12345.67], ['B', -4567.89], ['C', 3210.98]]))!;
    expect(t.ticker).toBe('A'); expect(t.pct).toBe(112); near(t.value, 12345.67);
  });
  // NEEDS A RULING (OpenAI: RULE UNCLEAR): the 25% line includes 25% (settled, card); four equal holdings — the first listed is named.
  // DECIDED 2026-10-21 (PF-B): the first listed is named, as for two equal holdings above.
  kase('MK-PF-F-015', 'edge', 'Exactly 25% threshold', () => {
    expect(topHoldingConcentration(rows([['A', 1000], ['B', 1000], ['C', 1000], ['D', 1000]]))).toEqual({ ticker: 'A', pct: 25, value: 1000 });
  });
  // DECIDED 2026-10-21 (PF-B, the lead's decision under tenets 1 and 4; the still-open "define aggregation by holding"):
  // one ticker held in two accounts is one holding — its rows are added together before the largest is picked. To reverse:
  // topHoldingConcentration, key each row by itself again.
  test('witness, after 2026-10-21 · one ticker held in two accounts is one holding: VTI $60,000 of $110,000 = 55% (DECIDED, tenets 1 and 4)', () => {
    // Insights hands every account's positions as separate rows (InsightsScreen.tsx: accounts.flatMap(positions))
    expect(topHoldingConcentration(rows([['VTI', 30000], ['vti', 30000], ['SCHD', 50000]]))).toEqual({ ticker: 'VTI', pct: 55, value: 60000 });
  });
  test.failing('witness · one ticker held in two accounts is two rows — still open: "define aggregation by holding" — no longer the app\'s answer (DECIDED 2026-10-21)', () => {
    expect(topHoldingConcentration(rows([['VTI', 30000], ['VTI', 30000], ['SCHD', 50000]]))).toEqual({ ticker: 'SCHD', pct: 45, value: 50000 });
  });
});

/* ═══ MK-PF-F-020 portfolioBenchReturn ════════════════════════════════════════════════════════════ */
describe('MK-PF-F-020 portfolioBenchReturn — five cases', () => {
  kase('MK-PF-F-020', 'easy', 'Same starting weights', () => {
    near(portfolioBenchReturn([benchRow(40000, 0, 0.1), benchRow(10000, 0, 0.04)]), 0.088);
  });
  kase('MK-PF-F-020', 'easy', 'Own growth does not increase benchmark weight', () => {
    near(portfolioBenchReturn([benchRow(44000, 0.1, 0.1), benchRow(10000, 0, 0.04)]), 0.088);
  });
  // NEEDS A RULING: a full-year yardstick and a three-month one (a holding bought 2026-07-19, capped) are blended into
  // one "market" figure: +5.70%. OpenAI: refuse. No decision says how the market is matched when holdings were bought
  // inside the window (the same question as the money added in the next case).
  // DECIDED 2026-10-21 (PF-B, the lead's decision under tenet 6): the blend stands. His approved rule (invest-v3 FINAL,
  // 2026-07-19; MK-PF-M-008's first decision) is that a holding bought inside the window counts from its purchase and its
  // yardstick "over those SAME dates" — the person's own return blends that holding the same way, so each holding is set
  // beside the market over the days its money was there. Refusing would blank the market line for anyone who bought
  // anything this year. OpenAI's refusal is kept, failing. To reverse: portfolioBenchReturn, refuse when rows' cappedSince differ.
  kase('MK-PF-F-020', 'complex', 'Different capped periods cannot be one window', () => {
    refuses(portfolioBenchReturn([benchRow(12345.67, 0.0831, 0.0731), benchRow(4567.89, 0.0273, 0.0157, '2026-07-19')]));
  }, true);
  test('pin · Different capped periods — the app blends them (DECIDED 2026-10-21: each holding beside the market over its own dates, invest-v3 FINAL)', () => {
    near(portfolioBenchReturn([benchRow(12345.67, 0.0831, 0.0731), benchRow(4567.89, 0.0273, 0.0157, '2026-07-19')]), 0.0569920923601018, 12);
  });
  // FINDING: app gives +7.00%, expected +6.00% for the mix held when the window began. The start value is worked back as
  // value now ÷ (1 + own return) = $2,420 ÷ 1.21 = $2,000, but $1,000 was held when the window began; $1,100 was added
  // inside it. The function's own rule (index.ts: "THE MARKET, MATCHED TO THE MIX HELD WHEN THE WINDOW BEGAN", DEC-1669,
  // DEC-3035b — weigh by what was held when the period began) makes OpenAI right. How the comparator should count the
  // $1,100 added (its "flow_adjusted_benchmark", RULE UNCLEAR) is a separate open question — see the case above.
  // FIXED 2026-10-21 (DEC-1669, DEC-3035b, tenet 4): OpenAI's start_actual is the value buildPerformance now writes on every
  // row (startValue: the shares held when the window began × the close the window divides by); the rows hand it in as the
  // app's own rows do, and the market is weighed by it. The flow-adjusted comparator stays RULE UNCLEAR — not asked of the app.
  kase('MK-PF-F-020', 'complex', 'Authentic beginning weights with share addition', () => {
    near(portfolioBenchReturn([{ ...benchRow(2420, 0.21, 0.1), startValue: 1000 }, { ...benchRow(2000, 0, 0.04), startValue: 2000 }]), 0.06);
  }, false, 'fixed 2026-10-21: weighed by the start held when the window began (startValue), DEC-1669 / DEC-3035b');
  test('pin · Authentic beginning weights — a row that carries no start (no row the app builds) is still worked back, $2,420 ÷ 1.21 = $2,000', () => {
    near(portfolioBenchReturn([benchRow(2420, 0.21, 0.1), benchRow(2000, 0, 0.04)]), 0.07, 12);
  });
  test('witness · the same holding built by buildPerformance (the rows Home hands in) carries the start held when the window began — FIXED 2026-10-21', () => {
    const now = L('2026-10-13');
    const prices: Record<string, PriceSeries> = {
      A: series([['2025-10-10', 100], ['2026-09-02', 110], ['2026-10-12', 121]], 'A'),
      SPY: series([['2025-10-10', 600], ['2026-10-12', 660]], 'SPY'),
      B: series([['2025-10-10', 100], ['2026-10-12', 100]], 'B'),
      BTC: series([['2025-10-10', 100], ['2026-10-12', 104]], 'BTC'),
    };
    const rowsBuilt = buildPerformance([
      pos({ ticker: 'A', kind: 'stocks_etf', lots: [{ lot_id: 'a1', shares: 10, cost_per_share: 100, purchase_date: '2025-01-02' }, { lot_id: 'a2', shares: 10, cost_per_share: 110, purchase_date: '2026-09-02' }] }),
      pos({ ticker: 'B', kind: 'crypto', lots: [{ lot_id: 'b1', shares: 20, cost_per_share: 100, purchase_date: '2024-01-02' }] }),
    ], (t) => prices[t] ?? null, '1Y', now);
    expect(rowsBuilt.map((r) => [r.marketValue, r.cappedSince])).toEqual([[2420, null], [2000, null]]);
    near(rowsBuilt[0].periodTotal, 0.21); near(rowsBuilt[0].benchTotal, 0.1); near(rowsBuilt[1].benchTotal, 0.04);
    // FIXED 2026-10-21: the row carries the $1,000 held when the window began, and the market reads (10% × $1,000 + 4% ×
    // $2,000) ÷ $3,000 = +6.00% (it read +7.00% from a false $2,000 start)
    expect(rowsBuilt.map((r) => r.startValue)).toEqual([1000, 2000]);
    // DECIDED 2026-10-22 (W-START, the lead's decision under DEC-1669 and tenets 1 and 7; MK-PF-M-008): the market beside your
    // return is split on the same days as your return, each piece weighed by what each holding was worth then. These closes
    // hold SPY and BTC flat until A bought more on Sep 2 and rising after it: piece 1, A $1,000 + B $2,000, flat; piece 2,
    // A 20 × $100 = $2,000 + B $2,000, SPY ×1.10 and BTC ×1.04 → (2,200 + 2,080) ÷ 4,000 − 1 = +7.00%. Weighed by the
    // starts alone it was +6.00% — the figure with no money moved, and still what rows without a path give (the case above).
    near(portfolioBenchReturn(rowsBuilt), (1000 * 600 / 600 + 2000 * 100 / 100) / 3000 * ((2000 * 660 / 600 + 2000 * 104 / 100) / 4000) - 1, 12);
  });
  test.failing('witness · the app on 2026-10-21, pinned: the market weighed by the starts alone, +6.00% — no longer its answer where money moved inside the window (DECIDED 2026-10-22)', () => {
    const now = L('2026-10-13');
    const prices: Record<string, PriceSeries> = {
      A: series([['2025-10-10', 100], ['2026-09-02', 110], ['2026-10-12', 121]], 'A'), SPY: series([['2025-10-10', 600], ['2026-10-12', 660]], 'SPY'),
      B: series([['2025-10-10', 100], ['2026-10-12', 100]], 'B'), BTC: series([['2025-10-10', 100], ['2026-10-12', 104]], 'BTC'),
    };
    near(portfolioBenchReturn(buildPerformance([
      pos({ ticker: 'A', kind: 'stocks_etf', lots: [{ lot_id: 'a1', shares: 10, cost_per_share: 100, purchase_date: '2025-01-02' }, { lot_id: 'a2', shares: 10, cost_per_share: 110, purchase_date: '2026-09-02' }] }),
      pos({ ticker: 'B', kind: 'crypto', lots: [{ lot_id: 'b1', shares: 20, cost_per_share: 100, purchase_date: '2024-01-02' }] }),
    ], (t) => prices[t] ?? null, '1Y', now)), 0.06);
  });
  // NEEDS A RULING: a holding with its own return and no yardstick (nothing says what it is, DEC-2160, or no yardstick
  // prices) is in the person's return but out of the market's: "market +5.00%" covers $1,100 of $3,400. OpenAI: refuse
  // (or label the covered part). No decision says which.
  // DECIDED 2026-10-21 (PF-B, the lead's decision under tenets 1, 3 and 4): refuse. The market figure claims to be the
  // market matched to the person's mix, and "ahead by" beside it compares the two; with part of the mix unmatched it would
  // compare different money. No market figure is shown — the figure's own refusal ("No benchmark can be priced over this
  // window, so none is shown"). To reverse: portfolioBenchReturn, drop the refusal and filter those rows out again.
  kase('MK-PF-F-020', 'edge', 'Missing comparator in one holding', () => {
    refuses(portfolioBenchReturn([benchRow(1100, 0.1, 0.05), benchRow(2300, 0.15, null)]));
  }, false, 'decided 2026-10-21: a holding in your return with no yardstick makes the market unknown (tenets 1, 3, 4)');
  test.failing('pin · Missing comparator — the app gave the covered holding\'s yardstick alone — no longer its answer (DECIDED 2026-10-21)', () => {
    near(portfolioBenchReturn([benchRow(1100, 0.1, 0.05), benchRow(2300, 0.15, null)]), 0.05, 12);
  });
});

/* ═══ MK-PF-F-022 factorOverMonths ════════════════════════════════════════════════════════════════ */
describe('MK-PF-F-022 factorOverMonths — five cases', () => {
  const NOW = L('2026-09-30');
  kase('MK-PF-F-022', 'easy', 'Full trailing year', () => { near(factorOverMonths(series([['2025-09-30', 100], ['2026-09-30', 110]]), 12, NOW), 1.1); });
  kase('MK-PF-F-022', 'easy', 'Short history refuses', () => { refuses(factorOverMonths(series([['2026-01-01', 100], ['2026-09-30', 110]]), 12, NOW)); });
  // REVIEWER WRONG (outside the input domain): every price list the app holds is put oldest-first at the one place it
  // is written (src/services/marketData.ts fetchPriceSeries, the sort before the cache; useStore refreshPrices is the
  // only writer of priceCache), so "the first price on record" is the earliest. The app refuses this unsorted list.
  kase('MK-PF-F-022', 'complex', 'Unsorted record still covers', () => {
    near(factorOverMonths(series([['2026-09-30', 97.31], ['2025-09-29', 83.17], ['2026-05-19', 91.43]]), 12, NOW), 1.1700132259228087);
  }, true);
  test('pin · Unsorted record — refused; the same prices oldest-first give OpenAI\'s factor', () => {
    refuses(factorOverMonths(series([['2026-09-30', 97.31], ['2025-09-29', 83.17], ['2026-05-19', 91.43]]), 12, NOW));
    near(factorOverMonths(series([['2025-09-29', 83.17], ['2026-05-19', 91.43], ['2026-09-30', 97.31]]), 12, NOW), 1.1700132259228087);
  });
  // REVIEWER WRONG (outside the input domain): the look-back is only ever asked about this moment — LookBackScreen calls
  // theLookBack with no date and the door uses the device clock (look-back.ts) — so the latest close on record is the
  // latest price there is; a close from after "now" cannot exist. The card says "latest close ÷ start close". The
  // month-end clamp (cut-off Feb 28, start $87.29) agrees.
  kase('MK-PF-F-022', 'complex', 'Leap month end and future point', () => {
    near(factorOverMonths(series([['2026-02-27', 83.17], ['2026-02-28', 87.29], ['2026-03-31', 91.43], ['2026-04-01', 97.31]]), 1, L('2026-03-31')), 1.047428113185932);
  }, true);
  test('pin · Leap month end and future point — the app takes the latest close on record', () => {
    near(factorOverMonths(series([['2026-02-27', 83.17], ['2026-02-28', 87.29], ['2026-03-31', 91.43], ['2026-04-01', 97.31]]), 1, L('2026-03-31')), 1.1147897811891396);
  });
  kase('MK-PF-F-022', 'edge', 'Zero start cannot form factor', () => { refuses(factorOverMonths(series([['2025-09-30', 0], ['2026-09-30', 110]]), 12, NOW)); });
});

/* ═══ MK-PF-F-028 realizedFromLedger ══════════════════════════════════════════════════════════════ */
describe('MK-PF-F-028 realizedFromLedger — five cases', () => {
  const NOW = L('2026-09-30');
  kase('MK-PF-F-028', 'easy', 'Round fully matched sale', () => {
    const r = realizedFromLedger([txn('buy', '2026-01-02', 10, 50), txn('sale', '2026-02-03', 10, 70)], { ticker: 'VTI', accountId: 'A', now: NOW });
    expect(r).toEqual({ realizedAllTime: 200, realizedThisYear: 200, sellsCounted: 1, sellsWithoutBasis: 0, shortOfPurchases: [] });
  });
  kase('MK-PF-F-028', 'easy', 'Owner partial match example', () => {
    const r = realizedFromLedger([txn('buy', '2026-01-02', 10, 50), txn('sale', '2026-02-03', 15, 70)], { ticker: 'VTI', accountId: 'A', now: NOW });
    expect(r).toEqual({ realizedAllTime: 200, realizedThisYear: 200, sellsCounted: 1, sellsWithoutBasis: 0,
      shortOfPurchases: [{ date: '2026-02-03', sold: 15, matched: 10, gain: 200 }] });
  });
  kase('MK-PF-F-028', 'complex', 'FIFO lots and another account ignored', () => {
    const r = realizedFromLedger([txn('buy', '2025-11-03', 7.25, 83.17), txn('buy', '2026-02-11', 3.125, 91.43),
      txn('sale', '2026-04-19', 8.5, 97.31), txn('sale', '2026-04-19', 4.2, 105.18, 'VTI', 'B')], { ticker: 'VTI', accountId: 'A', now: NOW });
    near(r.realizedAllTime, 109.865); near(r.realizedThisYear, 109.865);
    expect([r.sellsCounted, r.sellsWithoutBasis]).toEqual([1, 0]);
  });
  // NEEDS A RULING: a sale dated tomorrow counts today — +$48.40 (2.75 × ($4.13 − $2.37) × 10). OpenAI: $0, not yet
  // sold. Reachable: the transaction form's date picker sets no latest day (PerformanceScreen.tsx, DateField with no
  // maximumDate), and recording the sale takes the shares out of the holding at once (transactions applyTransaction
  // SELL) — so leaving the gain out until the day comes would drop it from both realized and unrealized meanwhile.
  // DECIDED 2026-10-21 (PF-B, the lead's decision under DEC-3523 tenets 1 and 4, the rule MK-NW-O-008 already follows): a
  // record dated after today is read ON today — the sale counts, in this year's figure too. The trade sheet no longer
  // takes a date after today (maximumDate, NW work 2026-10-21), so only a record saved before that reaches here. OpenAI's
  // $0 is kept, failing. To reverse: realized.ts realizedFromLedger, drop sales with t.date > today.
  kase('MK-PF-F-028', 'complex', 'Future mini-option sale should not count today', () => {
    const r = realizedFromLedger([txn('buy', '2026-09-17', 3.25, 2.37, 'OPTION_A'), txn('sale', '2026-10-01', 2.75, 4.13, 'OPTION_A')],
      { ticker: 'OPTION_A', accountId: 'A', now: NOW, holding: { kind: 'options', multiplier: 10 } });
    expect([r.realizedAllTime, r.realizedThisYear, r.sellsCounted, r.sellsWithoutBasis]).toEqual([0, 0, 0, 0]);
  }, true);
  test('pin · Future mini-option sale — the app counts it today (DECIDED 2026-10-21: a record dated after today is read on today, tenets 1 and 4)', () => {
    const r = realizedFromLedger([txn('buy', '2026-09-17', 3.25, 2.37, 'OPTION_A'), txn('sale', '2026-10-01', 2.75, 4.13, 'OPTION_A')],
      { ticker: 'OPTION_A', accountId: 'A', now: NOW, holding: { kind: 'options', multiplier: 10 } });
    near(r.realizedAllTime, 48.4); near(r.realizedThisYear, 48.4); expect(r.sellsCounted).toBe(1);
  });
  kase('MK-PF-F-028', 'edge', 'No purchase supports sale', () => {
    const r = realizedFromLedger([txn('sale', '2026-09-17', 3, 97.31)], { ticker: 'VTI', accountId: 'A', now: NOW });
    expect(r).toEqual({ realizedAllTime: 0, realizedThisYear: 0, sellsCounted: 0, sellsWithoutBasis: 1,
      shortOfPurchases: [{ date: '2026-09-17', sold: 3, matched: 0, gain: null }] });
  });
  // FINDING (still open: "refuse missing basis rather than silently drop unknown lots") · IN-FLIGHT. A purchase whose
  // price paid is not on record is filtered out before first-in-first-out matching (realized.ts: `t.price != null`), so
  // a sale is matched to a LATER purchase and a gain the app cannot know is counted. First in, first out, the 10 shares
  // sold are the opening 10 with no price paid: DEC-4643's line — "what you paid for them is not on record, so no gain is
  // counted" — and tenet 3. Since 2026-10-20 (in the tree, not committed) a holding added by hand with a blank cost
  // writes its opening row with no price (useStore addPosition), so this is the path a blank cost now takes.
  // FIXED 2026-10-21 (DEC-4643, tenet 3): the purchase with no price paid stays first in line, so the 10 shares sold are its
  // shares — not on record, named on the sale, no gain counted. The app's answer until then is kept below, failing.
  test('witness · a purchase with no price paid on record keeps its place first in line — FIXED 2026-10-21 (DEC-4643, tenet 3)', () => {
    const r = realizedFromLedger([{ ...txn('buy', '2026-01-02', 10, undefined), type: 'OPENING_POSITION' }, txn('buy', '2026-03-02', 10, 50),
      txn('sale', '2026-04-01', 10, 70)], { ticker: 'VTI', accountId: 'A', now: NOW });
    expect(r).toEqual({ realizedAllTime: 0, realizedThisYear: 0, sellsCounted: 0, sellsWithoutBasis: 1,
      shortOfPurchases: [{ date: '2026-04-01', sold: 10, matched: 0, gain: null }] });
  });
  test.failing('pin · a purchase with no price paid — the app matches the sale to the $50 purchase and counts $200 — no longer its answer (FIXED 2026-10-21)', () => {
    const r = realizedFromLedger([{ ...txn('buy', '2026-01-02', 10, undefined), type: 'OPENING_POSITION' }, txn('buy', '2026-03-02', 10, 50),
      txn('sale', '2026-04-01', 10, 70)], { ticker: 'VTI', accountId: 'A', now: NOW });
    expect([r.realizedAllTime, r.sellsCounted, r.sellsWithoutBasis, r.shortOfPurchases.length]).toEqual([200, 1, 0, 0]);
  });
});

/* ═══ MK-PF-F-029 closeAsOf ═══════════════════════════════════════════════════════════════════════ */
describe('MK-PF-F-029 closeAsOf — five cases', () => {
  kase('MK-PF-F-029', 'easy', 'Exact day', () => { expect(closeAsOf(series([['2026-09-19', 100], ['2026-09-20', 110]]), L('2026-09-19'))).toBe(100); });
  kase('MK-PF-F-029', 'easy', 'Earlier than all prices', () => { expect(closeAsOf(series([['2026-05-04', 100], ['2026-09-20', 110]]), L('2026-01-01'))).toBe(100); });
  kase('MK-PF-F-029', 'complex', 'Weekend target on ordered prices', () => {
    expect(closeAsOf(series([['2026-09-17', 83.17], ['2026-09-18', 87.29], ['2026-09-21', 91.43]]), L('2026-09-20'))).toBe(87.29);
  });
  kase('MK-PF-F-029', 'complex', 'Ordered month-end boundaries', () => {
    expect(closeAsOf(series([['2026-02-26', 83.17], ['2026-02-27', 87.29], ['2026-03-02', 91.43]]), L('2026-02-28'))).toBe(87.29);
  });
  kase('MK-PF-F-029', 'edge', 'Empty series', () => { refuses(closeAsOf(series([]), L('2026-09-20'))); });
  // FOUND ON THE WAY (not one of OpenAI's items): closeAsOf compares moments, and a price's day is read as midnight in
  // London (new Date('2026-09-18')). A person east of London asks with their own clock: in Tokyo at 08:00 on 18 Sep the
  // moment is 23:00 on 17 Sep in London, so the 18 Sep close is "later" and the 17 Sep close is taken — the window's
  // beginning a day early. DEC-0189 / DEC-0282: every day in the app is the person's own calendar day.
  // FIXED 2026-10-21 (DEC-0189, DEC-0282): closeAsOf reads a Date as its local calendar day and compares days. The same fault
  // ran the other way west of London — in California after 5 pm the window's FIRST day's close was taken as the beginning,
  // so one 1Y window read +21.00% at 9 am and +10.00% at 8 pm. Each witness runs closeAsOf, compiled from its own text with
  // the day readers it asks, in a Node process set to that zone (a test cannot change its own zone).
  const DAY_READERS = [['src/domain/_shared/dates.ts', 'function maturityParts('], [PERF, 'function calendarDay('], [PERF, 'function closeDayOnOrBefore('],
    [PERF, 'function closeOnOrBefore('], [PERF, 'function firstClose('], [PERF, 'function closeAsOf(']].map(([file, start]) => {
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8'); const at = text.indexOf(start); const to = text.indexOf('\n}\n', at);
    if (at < 0 || to < 0) throw new Error(`${start} not found in ${file}`);
    return ts.transpileModule(text.slice(at, to + 3), { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText;
  }).join('\n');
  const closeAsOfIn = (tz: string, pts: [string, number][], instant: number): number | null => JSON.parse(execFileSync(process.execPath,
    ['-e', `${DAY_READERS}\nprocess.stdout.write(JSON.stringify(closeAsOf(${JSON.stringify(series(pts))}, new Date(${instant}))));`],
    { env: { ...process.env, TZ: tz } }).toString());
  const SEP = [['2026-09-17', 100], ['2026-09-18', 102]] as [string, number][];
  test('witness · the person\'s own day decides, wherever they are (Tokyo, 08:00 on 18 Sep) — FIXED 2026-10-21 (DEC-0189, DEC-0282)', () => {
    expect(closeAsOfIn('Asia/Tokyo', SEP, Date.UTC(2026, 8, 17, 23, 0))).toBe(102);
  });
  test('witness · the person\'s own day decides in California at 8 pm on 17 Sep — the 17 Sep close, never the 18th — FIXED 2026-10-21', () => {
    expect(closeAsOfIn('America/Los_Angeles', SEP, Date.UTC(2026, 8, 18, 3, 0))).toBe(100);
  });
  // the app until 2026-10-21, kept as it was found: in Tokyo at 08:00 on 18 Sep the 17 Sep close — no longer its answer
  test.failing('witness, until 2026-10-21 · Tokyo at 08:00 on 18 Sep read the 17 Sep close — no longer its answer (FIXED 2026-10-21)', () => {
    expect(closeAsOfIn('Asia/Tokyo', SEP, Date.UTC(2026, 8, 17, 23, 0))).toBe(100);
  });
});

/* ═══ MK-PF-F-031 contractMultiplier ══════════════════════════════════════════════════════════════ */
describe('MK-PF-F-031 contractMultiplier — five cases (IN-FLIGHT: the bond quoted per $100 of face runs through it)', () => {
  kase('MK-PF-F-031', 'easy', 'Default option', () => { expect(contractMultiplier({ kind: 'options' })).toBe(100); });
  kase('MK-PF-F-031', 'easy', 'Ordinary stock', () => { expect(contractMultiplier({ kind: KIND.stock })).toBe(1); });
  kase('MK-PF-F-031', 'complex', 'Broker mini option', () => { expect(contractMultiplier({ kind: 'options', multiplier: 10 })).toBe(10); });
  // FINDING (OpenAI: RULE UNCLEAR, purpose 1 against formula 37.5): shares per contract are an option's figure —
  // DEC-0274 ("options: value = contracts × 100 × price unless the broker or the person states otherwise") and DEC-4646
  // (the hand-typed option's "Shares per contract" box); the card's purpose says 1 for everything else. Reachable: an
  // option changed to a stock in the holding editor kept the figure (witness below). FIXED 2026-10-21: the function counts
  // a stated figure only for an option, and the editor clears it when a holding stops being one.
  kase('MK-PF-F-031', 'complex', 'Custom nonoption multiplier conflicts with purpose', () => {
    expect(contractMultiplier({ kind: KIND.stock, multiplier: 37.5 })).toBe(1);
  }, false, 'fixed 2026-10-21: a stated shares-per-contract counts only for an option (DEC-0274, DEC-4646)');
  test('pin · Custom nonoption multiplier — the app no longer uses the stated 37.5: a stated figure counts only for an option (2026-10-21; it was 37.5)', () => {
    expect(contractMultiplier({ kind: KIND.stock, multiplier: 37.5 })).toBe(1);
  });
  test('witness · an option changed to a stock in the holding editor: its shares per contract are cleared, and a stock never reads one — 10 shares at $50 are $500, not $50,000 (2026-10-21)', () => {
    const { useStore } = require('../../../src/store/useStore');
    useStore.getState().resetAll();
    const lots = [{ lot_id: 'l1', shares: 10, cost_per_share: 50, purchase_date: '2026-01-02' }];
    const seed = () => useStore.setState({ assetAccounts: [{ asset_id: 'b', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0,
      target_return: 0.08, derive_balance: true, positions: [{ position_id: 'p1', ticker: 'XYZ', kind: 'options', multiplier: 100, lots }] }] });
    // what the holding editor saves for a stock since 2026-10-21 — the multiplier key, cleared (PerformanceScreen.tsx save:
    // `multiplier: isOption ? perContractN : undefined`); before, the key was left out and the store's merge kept the 100
    seed();
    useStore.getState().updatePosition('b', 'p1', { position_id: 'p1', ticker: 'XYZ', label: undefined, kind: 'stocks_etf', lots, multiplier: undefined });
    const p = useStore.getState().assetAccounts[0].positions[0];
    expect([p.kind, p.multiplier, contractMultiplier(p), marketValue(p, 50)]).toEqual(['stocks_etf', undefined, 1, 500]);
    // a stock saved before the fix, its 100 still stored: the function no longer reads it — before: 100 and $50,000
    seed();
    useStore.getState().updatePosition('b', 'p1', { position_id: 'p1', ticker: 'XYZ', label: undefined, kind: 'stocks_etf', lots });
    const old = useStore.getState().assetAccounts[0].positions[0];
    expect([old.kind, old.multiplier, contractMultiplier(old), marketValue(old, 50)]).toEqual(['stocks_etf', 100, 1, 500]);
  });
  // FINDING: a stated multiplier of Infinity is used — every value it touches becomes infinite. DEC-0274 (a contract is a
  // number of shares) and tenet 1 (DEC-3523). Reachable only by typing a number of 309 digits into "Shares per
  // contract" (the editor keeps digits and parses them; Infinity passed its "above zero" check); a broker cannot send it.
  // FIXED 2026-10-21 AT BOTH ENDS, NOT AS OPENAI ASKS: the editor's Save stays off for a figure that is not a real number,
  // so it is never saved; and the function reads a figure that is not finite as no statement — as it always read 0 or a
  // negative — so DEC-0274's 100 stands. OpenAI's REFUSES is kept and still fails: an unknown answer here would have to be
  // carried by every one of the function's eleven callers in five files, and × an unknown in JavaScript is $0.
  kase('MK-PF-F-031', 'edge', 'Invalid entered infinity', () => { refuses(contractMultiplier({ kind: 'options', multiplier: Infinity })); }, true);
  test('pin · Invalid entered infinity — the app no longer returns Infinity: a figure that is not finite is no statement, so the option\'s 100 stands (2026-10-21; it was Infinity)', () => {
    expect(contractMultiplier({ kind: 'options', multiplier: Infinity })).toBe(100);
    expect(marketValue(pos({ kind: 'options', multiplier: Infinity, lots: [{ lot_id: 'l', shares: 2, cost_per_share: 1, purchase_date: '2026-01-02' }] }), 3)).toBe(600);
  });
});

/* ═══ MK-PF-F-032 quantityUnit ════════════════════════════════════════════════════════════════════ */
describe('MK-PF-F-032 quantityUnit — five cases', () => {
  kase('MK-PF-F-032', 'easy', 'Stock shares', () => { expect(quantityUnit({ kind: KIND.stock })).toBe('shares'); });
  kase('MK-PF-F-032', 'easy', 'One crypto coin', () => { expect(quantityUnit({ kind: KIND.crypto })).toBe('coins'); });
  kase('MK-PF-F-032', 'complex', 'Written mini option', () => { expect(quantityUnit({ kind: KIND.option, unit: 'contracts' })).toBe('contracts'); });
  kase('MK-PF-F-032', 'complex', 'Own fractional commodity unit', () => { expect(quantityUnit({ kind: KIND.commodity, unit: 'units' })).toBe('units'); });
  kase('MK-PF-F-032', 'edge', 'No quantity', () => { expect(quantityUnit({ kind: KIND.stock })).toBe('shares'); });
});

/* ═══ MK-PF-F-033 quantityWithUnit ════════════════════════════════════════════════════════════════ */
describe('MK-PF-F-033 quantityWithUnit — five cases', () => {
  kase('MK-PF-F-033', 'easy', 'Stock shares', () => { expect(quantityWithUnit({ kind: KIND.stock }, 3)).toBe('3 shares'); });
  kase('MK-PF-F-033', 'easy', 'One crypto coin', () => { expect(quantityWithUnit({ kind: KIND.crypto }, 1)).toBe('1 coin'); });
  kase('MK-PF-F-033', 'complex', 'Written mini option', () => { expect(quantityWithUnit({ kind: KIND.option, unit: 'contracts' }, -1)).toBe('-1 contract'); });
  kase('MK-PF-F-033', 'complex', 'Own fractional commodity unit', () => { expect(quantityWithUnit({ kind: KIND.commodity, unit: 'units' }, 3.125)).toBe('3.125 units'); });
  kase('MK-PF-F-033', 'edge', 'Nonfinite quantity', () => { refuses(quantityWithUnit({ kind: KIND.stock }, Infinity)); });
  // FIXED 2026-10-21 (DEC-4082, the one list of words and plurals): coin, ounce and unit are on the list, and the unit's
  // singular is the list's — the witness as it was is kept, failing, beside the new one
  test('witness, after 2026-10-21 · the singular comes from the one plural list (DEC-4082): coin, ounce and unit are on it, and no final s is dropped by hand', () => {
    const list = fs.readFileSync(path.join(ROOT, 'src/domain/_shared/plural.ts'), 'utf8');
    expect(list).toMatch(/\bcoin: 'coins'/); expect(list).toMatch(/\bounce: 'ounces'/); expect(list).toMatch(/\bunit: 'units'/);
    expect(fs.readFileSync(path.join(ROOT, PERF), 'utf8')).not.toMatch(/unit\.replace\(\/s\$\/, ''\)/);
    expect([quantityWithUnit({ kind: KIND.commodity }, 1), quantityWithUnit({ kind: KIND.commodity, unit: 'units' }, -1), quantityWithUnit({ kind: KIND.crypto }, 0.5)])
      .toEqual(['1 ounce', '-1 unit', '0.5 coins']);
  });
  test.failing('witness · the singular is made by dropping the final s, not from the one plural list (DEC-4082): coin, ounce and unit are not on it — no longer the app\'s answer (FIXED 2026-10-21)', () => {
    const list = fs.readFileSync(path.join(ROOT, 'src/domain/_shared/plural.ts'), 'utf8');
    expect(list).not.toMatch(/\bcoin: 'coins'/); expect(list).not.toMatch(/\bounce: 'ounces'/); expect(list).not.toMatch(/\bunit: 'units'/);
    expect(fs.readFileSync(path.join(ROOT, PERF), 'utf8')).toMatch(/unit\.replace\(\/s\$\/, ''\)/);
  });
});

/* ═══ MK-PF-F-034 closeOnOrBefore ═════════════════════════════════════════════════════════════════ */
describe('MK-PF-F-034 closeOnOrBefore — five cases', () => {
  kase('MK-PF-F-034', 'easy', 'Exact close', () => { expect(closeOnOrBefore(series([['2026-09-19', 100]]), '2026-09-19')).toBe(100); });
  kase('MK-PF-F-034', 'easy', 'No backward fallback', () => { refuses(closeOnOrBefore(series([['2026-05-04', 100]]), '2026-01-01')); });
  kase('MK-PF-F-034', 'complex', 'Unsorted day selection', () => {
    expect(closeOnOrBefore(series([['2026-09-21', 91.43], ['2026-09-17', 83.17], ['2026-09-18', 87.29]]), '2026-09-20')).toBe(87.29);
  });
  kase('MK-PF-F-034', 'complex', 'Real day and unround closes', () => {
    expect(closeOnOrBefore(series([['2024-02-27', 83.17], ['2024-02-28', 87.29], ['2024-03-01', 91.43]]), '2024-02-29')).toBe(87.29);
  });
  // FINDING: 31 February is written like a day and is not one; the app prices it at the last February close. Tenet 3 (a
  // day that cannot be read is unknown, DEC-3523) and tenet 4: the app already has one rule for "is this a real day"
  // (MK-ST-F-080 isDay, outside review 2026-10-11), which this reader does not use. Reachable: an import file (witness).
  // FIXED 2026-10-21 (DEC-3523 tenet 3, DEC-6773): the reader asks the app's one reader of a written day (calendarDay →
  // maturityParts), and passes over a close that is not a number
  kase('MK-PF-F-034', 'edge', 'Impossible calendar target', () => { refuses(closeOnOrBefore(series([['2026-02-27', 87.29]]), '2026-02-31')); }, false,
    'fixed 2026-10-21: 31 February is no day, in this reader too (DEC-3523 tenet 3, DEC-6773)');
  test.failing('pin, until 2026-10-21 · Impossible calendar target — the app gave $87.29 — no longer its answer (FIXED 2026-10-21)', () => { expect(closeOnOrBefore(series([['2026-02-27', 87.29]]), '2026-02-31')).toBe(87.29); });
  test('fixed 2026-10-21 · a close that is not a number is passed over, never read as a price (tenet 3): the close before it stands', () => {
    expect(closeOnOrBefore({ ticker: 'X', points: [{ date: '2026-09-17', close: 83.17 }, { date: '2026-09-18', close: NaN }] }, '2026-09-18')).toBe(83.17);
    expect(closeOnOrBefore({ ticker: 'X', points: [{ date: '2026-09-18', close: Infinity }] }, '2026-09-18')).toBeNull();
  });
  // the import half of this witness was fixed on 2026-10-21 (the gains job): a file's 31 February is kept as no purchase date,
  // by the one reading of a purchase date (purchaseDateOnRecord). The witness as it was is kept, failing, beside the new one.
  test('witness, after 2026-10-21 (FIXED) · an import file\'s 31 February is no purchase date, and neither reader prices 31 February', () => {
    expect(importHoldings('Symbol,Quantity,Purchase Date\nVOO,1,02/31/2026\n').holdings[0].date).toBeUndefined();
    const s = series([['2026-02-27', 87.29], ['2026-03-02', 91.43], ['2026-03-04', 93]]);
    expect(closeOnOrBefore(s, '2026-02-31')).toBeNull();
    expect(closeAsOf(s, '2026-02-31')).toBeNull();                  // the yardstick's reader is handed the day as written now
  });
  test.failing('witness, until the closeOnOrBefore fix of 2026-10-21 · the two readers priced 31 February two ways — no longer their answer', () => {
    const s = series([['2026-02-27', 87.29], ['2026-03-02', 91.43], ['2026-03-04', 93]]);
    expect(closeOnOrBefore(s, '2026-02-31')).toBe(87.29);
  });
  test.failing('witness · an import file carries 31 February into a purchase date, and two readers price it two ways — no longer the import\'s answer (FIXED 2026-10-21)', () => {
    expect(importHoldings('Symbol,Quantity,Purchase Date\nVOO,1,02/31/2026\n').holdings[0].date).toBe('2026-02-31');
    const s = series([['2026-02-27', 87.29], ['2026-03-02', 91.43], ['2026-03-04', 93]]);
    expect(closeOnOrBefore(s, '2026-02-31')).toBe(87.29);          // the holding's reader: the last close of February
    expect(closeAsOf(s, new Date('2026-02-31'))).toBe(91.43);      // the yardstick's reader (periodReturnSince): 3 March
  });
});

/* ═══ MK-PF-F-035 unknownFigure ═══════════════════════════════════════════════════════════════════ */
describe('MK-PF-F-035 unknownFigure — five cases', () => {
  kase('MK-PF-F-035', 'easy', 'Explicit zero', () => { expect(unknownFigure(0)).toBe(false); });
  kase('MK-PF-F-035', 'easy', 'Missing figure', () => { expect(unknownFigure(null)).toBe(true); });
  kase('MK-PF-F-035', 'complex', 'Unround positive', () => { expect(unknownFigure(83.173125)).toBe(false); });
  kase('MK-PF-F-035', 'complex', 'Broker textual figure', () => { expect(unknownFigure(' 83.17 ')).toBe(true); });
  kase('MK-PF-F-035', 'edge', 'Infinity', () => { expect(unknownFigure(Infinity)).toBe(true); });
});

/* ═══ MK-PF-F-037 dayBefore ═══════════════════════════════════════════════════════════════════════ */
describe('MK-PF-F-037 dayBefore — five cases', () => {
  kase('MK-PF-F-037', 'easy', 'Ordinary day', () => { expect(localStamp(dayBefore(LT('2026-10-13T15:17:19')))).toBe('2026-10-12T15:17:19'); });
  kase('MK-PF-F-037', 'easy', 'New year', () => { expect(localStamp(dayBefore(LT('2026-01-01T09:00:00')))).toBe('2025-12-31T09:00:00'); });
  kase('MK-PF-F-037', 'complex', 'Leap February', () => { expect(localStamp(dayBefore(LT('2024-03-01T17:43:29')))).toBe('2024-02-29T17:43:29'); });
  kase('MK-PF-F-037', 'complex', 'Clock preserved across month', () => { expect(localStamp(dayBefore(LT('2026-06-01T16:23:41')))).toBe('2026-05-31T16:23:41'); });
  kase('MK-PF-F-037', 'edge', 'Leap day itself', () => { expect(localStamp(dayBefore(LT('2024-02-29T23:59:59')))).toBe('2024-02-28T23:59:59'); });
});

/* ═══ COVERAGE — every item of part 3 is here and classified ══════════════════════════════════════ */
describe('coverage — part 3, all of it', () => {
  const AUDIT = path.join(__dirname, '../../documents/audit/outside-test-cases/returned/MoneyKeel_Performance_Audit_Package/MoneyKeel_audit_part_3.json');
  const RESULTS = path.join(__dirname, '../../documents/audit/outside-test-cases/returned/results/performance_openai_rerun_03_results.json');
  const CLASSES = ['AGREES', 'APP WRONG', 'REVIEWER WRONG', 'NEEDS A RULING', 'BLOCKED'];
  test('65 of 65 cases turned into tests here; 13 of 13 formula checks and 9 of 9 still-open lines classified in the results', () => {
    const audit = JSON.parse(fs.readFileSync(AUDIT, 'utf8'));
    expect(audit.batch).toBe('pf module final — part 3');
    expect(audit.cases).toHaveLength(65); expect(audit.formula_checks).toHaveLength(13); expect(audit.still_open).toHaveLength(9);
    // the counts OpenAI wrote for the other lists: nothing in them to run
    expect([audit.rules_held, audit.screen_checks, audit.could_not_test]).toEqual([[], [], []]);
    const keys = audit.cases.map((c: any) => `${c.id}|${c.kind}|${c.title}`);
    expect(new Set(keys).size).toBe(65);
    expect(keys.filter((k: string) => !RUN.has(k))).toEqual([]);           // none dropped
    expect(RUN.size).toBeGreaterThanOrEqual(65);                            // a floor: a renamed case cannot hide
    const res = JSON.parse(fs.readFileSync(RESULTS, 'utf8'));
    expect(res.cases.map((c: any) => `${c.id}|${c.kind}|${c.title}`).sort()).toEqual([...keys].sort());
    for (const c of [...res.cases, ...res.formula_checks, ...res.still_open]) expect(CLASSES).toContain(c.classification);
    expect(res.formula_checks.map((f: any) => f.id).sort()).toEqual(audit.formula_checks.map((f: any) => f.id).sort());
    expect(res.still_open.map((s: any) => s.text)).toEqual(audit.still_open);
  });
});
