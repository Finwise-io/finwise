/** A WINDOW NEVER STARTS FROM A STALE PRICE — THE GUARD (2026-11-01, FX-PF; the lead's rulings R19 and R19a, NW4-02, tenet 2).
 *
 *  1. Every read of "the close on or before a day" in the app's code is listed here with what it is. A WINDOW'S START is read only
 *     through closeAsOf (MK-PF-F-029) or behind staleStartClose; every other read is named for what it is instead (the end of a
 *     piece inside a window, a value on a recorded day). A new read that is in neither list fails, so a start cannot slip past R19.
 *     A guard must prove it looked: it counts the files it read and the reads it found, and a planted start must be caught.
 *  2. The 7-day limit is START_CLOSE_DAYS alone: staleStartClose reads it, and closeAsOf's written-out 7 is held equal to it.
 *  3. A series the person typed by hand (byHand) is exempt (R19a): its window starts from their last value, however old.
 *  4. R19 RULES ONLY A WINDOW'S START, AND ALWAYS SPEAKS (R19b, PF5-1, PF5-2): each call of the start reader (closeAsOf) and of the
 *     inside reader (closeAsOfInside) is classified; a start refused names its holding and the day of its last close, on the
 *     Performance tab and on the Holding page — a refusal without its sentence fails.
 */
import * as fs from 'fs';
import * as path from 'path';
import { START_CLOSE_DAYS, staleStartClose, periodReturnSince } from '../domain/performance';

const ROOT = path.join(__dirname, '..', '..');
const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) return ['__tests__', 'node_modules', 'testing'].includes(e.name) ? [] : walk(p);
  return /\.(ts|tsx)$/.test(e.name) && !/\.test\.(ts|tsx)$/.test(e.name) ? [p] : [];
});
const FILES = [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'MoneyKeel', 'functions')), ...walk(path.join(ROOT, 'Calculation Module code'))];
const READ = /\b(closeOnOrBefore|closeDayOnOrBefore)\(/;

/** each known read: the file, words its line carries, and what it is */
const KNOWN: [string, string, string][] = [
  // the readers themselves
  ['src/domain/performance/index.ts', 'return closeOnOrBefore(series, day) ?? firstClose(series)?.close ?? null;', 'closeAsOf, the one start reader — its 7-day check written out above it'],
  ['src/domain/performance/index.ts', 'return closeDayOnOrBefore(series, isoDate)?.close ?? null;', 'closeOnOrBefore is closeDayOnOrBefore\'s close'],
  ['src/domain/performance/index.ts', 'return closeOnOrBefore(series, day) ?? firstClose(series)?.close ?? null;', 'closeAsOfInside, the one INSIDE reader (R19b): a day inside a window takes its own close'],
  ['src/domain/performance/index.ts', 'if (!on || series?.byHand === true) return null;', 'staleStartClose, the start check (byHand exempt, R19a)'],
  ['src/domain/performance/index.ts', 'return on ? `valued by you on ${dateShown(on.day)}` : null;', 'valuedByYouWords: names a hand value\'s day (R19a)'],
  // the end of a piece inside a window — bounded by the piece's own first day, never a window's start
  ['src/domain/performance/index.ts', 'const close = mark != null && mark.day >= pieceFrom ? mark.close : null;', 'a purchase piece\'s end, only from inside the piece'],
  ['src/domain/performance/index.ts', 'before = mark != null && mark.day >= from ? held * mark.close * mult : began;', 'a holding path\'s day, only from inside the window'],
  ['src/domain/performance/index.ts', 'before = mark != null && mark.day >= from ? held * mark.close * mult : began;', 'its twin, the market path weighed by the same holdings — the same bound'],
  ['src/domain/performance/index.ts', 'const close = eve == null ? null : closeOnOrBefore(x.series, eve);', 'the market path\'s day inside the window (each grid day is in it)'],
  // a value on a recorded day — the daily record's own fill, not a window's start
  ['src/store/useStore.ts', 'priceOn: (key: string, day: string) => closeOnOrBefore(', 'the daily record\'s price on a day it records'],
  ['src/store/useStore.ts', 'fillBetweenObservations(days, (key: string, day: string) => closeOnOrBefore(', 'filling the record between two observed days'],
  // the engine's days between two dates: the end, and the start behind staleStartClose on the same line
  ['MoneyKeel/functions/networth-and-performance/performance.ts', 'const closeTo = closeOnOrBefore(series, to);', 'the END of those days (today, or the record\'s first day)'],
  ['MoneyKeel/functions/networth-and-performance/performance.ts', 'const cNow = latestClose(series), cEve = closeOnOrBefore(series, ev);', 'a money-moved day inside the window, its trades undone (R18, R19b): its own day\'s close'],
  ['MoneyKeel/functions/networth-and-performance/performance.ts', 'const closeFrom = !insideDay && staleStartClose(series, from) ? null : closeOnOrBefore(series, from)', 'a START behind staleStartClose; a money-moved day inside the window (insideDay, R19b) takes its own close'],
];

type Hit = { file: string; line: number; text: string };
/** every read in a body of code, with the line it sits on and the two lines after it (a mark's bound is on the next line) */
function readsIn(file: string, code: string): Hit[] {
  const lines = code.split('\n');
  return lines.flatMap((l, i) => (READ.test(l) && !/export function (closeOnOrBefore|closeDayOnOrBefore)\(/.test(l) && !/^\s*(\/\/|\*)/.test(l)
    ? [{ file, line: i + 1, text: lines.slice(i, i + 3).join('\n') }] : []));
}
const known = (h: Hit) => KNOWN.find(([f, words]) => h.file === f && h.text.includes(words));

const HITS = FILES.flatMap((f) => readsIn(path.relative(ROOT, f).split(path.sep).join('/'), fs.readFileSync(f, 'utf8')));

test('it looked: the app\'s code read, and every read of a close on or before a day found — 14 on 2026-11-01', () => {
  expect(FILES.length).toBeGreaterThanOrEqual(239);                                 // 239 on 2026-11-01: src, MoneyKeel/functions, the engines
  expect(FILES.some((f) => f.endsWith(path.join('networth-and-performance', 'performance.ts')))).toBe(true);
  expect(HITS.length).toBe(KNOWN.length);                                            // 14: a new read must be listed with what it is
});

test('every read is a known one — a window\'s start only through closeAsOf or behind staleStartClose', () => {
  expect(HITS.filter((h) => !known(h)).map((h) => `${h.file}:${h.line}`)).toEqual([]);
  expect(KNOWN.filter(([f, words]) => !HITS.some((h) => h.file === f && h.text.includes(words))).map(([f, w]) => `${f}: ${w}`)).toEqual([]);
});

test('the probe: a start read straight off the closes is caught', () => {
  const planted = readsIn('src/domain/performance/index.ts', 'function x() {\n  const start = closeOnOrBefore(series, windowStart);\n}\n');
  expect(planted).toHaveLength(1);
  expect(known(planted[0])).toBeUndefined();                                         // in neither list: it would fail the test above
});

test('the 7-day limit is START_CLOSE_DAYS alone: staleStartClose reads it, and closeAsOf\'s written-out 7 equals it', () => {
  expect(START_CLOSE_DAYS).toBe(7);
  const src = fs.readFileSync(path.join(ROOT, 'src/domain/performance/index.ts'), 'utf8');
  const body = (name: string) => { const at = src.indexOf(`function ${name}(`); return src.slice(at, src.indexOf('\n}\n', at)); };
  expect(body('staleStartClose')).toMatch(/gap > START_CLOSE_DAYS/);
  expect(body('closeAsOf')).toMatch(new RegExp(`/ 86_400_000 > ${START_CLOSE_DAYS}\\) return null;`));
  // no other day-gap limit over closes in the start readers' files
  for (const f of ['src/domain/performance/index.ts', 'MoneyKeel/functions/networth-and-performance/performance.ts', 'MoneyKeel/functions/networth-and-performance/holding.ts']) {
    const code = fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\/\/.*$/gm, '');
    expect([f, (code.match(/86_400_000 > \d+\)/g) ?? []).length]).toEqual([f, f.endsWith('index.ts') ? 1 : 0]);
  }
  // and it behaves so: 7 days is a start, 8 is not
  const S = (d: string) => ({ ticker: 'X', points: [{ date: d, close: 10 }] });
  expect(staleStartClose(S('2026-08-28'), '2026-09-04')).toBeNull();
  expect(staleStartClose(S('2026-08-28'), '2026-09-05')).not.toBeNull();
});

test('a series typed by hand is exempt (R19a): a month-old value starts the window; the same marks as market closes do not', () => {
  const marks = [{ date: '2026-04-30', close: 10.412 }, { date: '2026-05-29', close: 10.538 }, { date: '2026-09-30', close: 10.701 }];
  const now = new Date('2026-09-30T12:00:00');
  // a window from Jul 1, 2026: its start is read on Jul 1 — the last value is May 29's $10.538, 33 days back
  expect(periodReturnSince({ ticker: 'F', points: marks, byHand: true } as any, '2026-07-01', now)).toBeCloseTo(10.701 / 10.538 - 1, 12);
  expect(periodReturnSince({ ticker: 'F', points: marks } as any, '2026-07-01', now)).toBeNull();
  expect(staleStartClose({ ticker: 'F', points: marks, byHand: true } as any, '2026-07-01')).toBeNull();
});

// ═══ R19b ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
/** each call of the two readers, by its words: a window's START (closeAsOf) or a day INSIDE the window (closeAsOfInside) */
const CALLS: [string, 'start' | 'inside', string][] = [
  ['const start = closeAsOf(series, beginDay);', 'start', 'periodReturnParts: the close before the period\'s first day'],
  ['const start = inside ? closeAsOfInside(series, since) : closeAsOf(series, since);', 'start', 'periodReturnSince: a start, or a purchase inside the window when asked so'],
  ['const close = closeAsOf(series, from);', 'start', 'valueAtClose: what a holding was worth at the close its window figure starts from'],
  ['const startClose = beginISO == null ? null : closeAsOf(series, given ? beginISO : dayBefore(opens!));', 'start', 'buildPerformance: a holding\'s window start'],
  ['[enters == null && from != null ? closeAsOf(bench, from) : null]', 'start', 'the market path\'s start'],
  ['closeAsOfInside(bench, g) : eve == null ? null : closeAsOfInside(bench, eve)', 'inside', 'the market path\'s days inside the window'],
];
test('R19b: every call of the start reader and the inside reader is classified — 6 lines on 2026-11-01', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/domain/performance/index.ts'), 'utf8').split('\n')
    .filter((l) => /\bcloseAsOf(Inside)?\(/.test(l) && !/^\s*(\/\/|\*)/.test(l) && !/^function closeAsOf/.test(l));
  expect(src.length).toBe(CALLS.length);
  expect(src.filter((l) => !CALLS.some(([w]) => l.includes(w)))).toEqual([]);
  // the inside reader is never a window's start: its line carries no start word
  for (const [w, kind] of CALLS) if (kind === 'inside') expect(w).not.toMatch(/start|begin|opens/i);
  // and only these two files may read a purchase or a flow day inside a window with the stale check switched off
  const engine = fs.readFileSync(path.join(ROOT, 'MoneyKeel/functions/networth-and-performance/performance.ts'), 'utf8');
  expect((engine.match(/cEve = closeOnOrBefore\(series, ev\)/g) ?? []).length).toBe(1);    // flowTwr's money-moved day, its trades undone
  expect(engine).toMatch(/const closeFrom = !insideDay && staleStartClose\(series, from\)/);
});

test('R19b: a start refused always speaks — the Performance tab\'s sentence names the holding and its last close (PF5-2)', () => {
  const { thePerformance, windowStartKey } = require('../../MoneyKeel/functions/networth-and-performance/performance');
  const { buildPerformance } = require('../domain/performance');
  const T = '2026-09-30';
  const acct = { asset_id: 'van', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 10_000, derive_balance: true,
    positions: [{ position_id: 'v', ticker: 'VTI', label: 'VTI', lots: [{ lot_id: 'l', shares: 100, cost_per_share: 50, purchase_date: '2023-01-02' }] }] };
  const series = { ticker: 'VTI', points: [{ date: '2024-08-01', close: 70 }, { date: '2026-09-29', close: 99 }, { date: T, close: 100 }] };
  for (const w of ['1M', 'YTD', '1Y', '2Y']) {
    const rows = buildPerformance(acct.positions, () => series, w, new Date(`${T}T12:00:00`), () => null, undefined, { transactions: [], accounts: [acct] });
    // a record that begins today, as the app has it once Home opens — the case that read as day one
    const f = thePerformance({ windowStart: windowStartKey(w, [], T), windowLabel: w, today: T, holdings: rows, priceOf: () => series,
      transactions: [], snapshotDays: [{ date: T, accounts: [{ date: T, accountId: 'van', cash: 0, statedTotal: 10_000, currency: 'USD' }], holdings: [] }],
      investmentAccountIds: new Set(['van']), accounts: [acct] });
    expect([w, f.cumulative, f.workedBack]).toEqual([w, null, true]);                 // worked back, not greyed, not day one
    expect(f.notIncluded).toMatch(/^VTI \(\$10,000\) has no price near the window’s start: its last close before it is Aug 1, 2024, so its gains are not included\.$/);
  }
});

test('R19b: the Holding page\'s refusal names the close before its words for prices that have not filled in (PF5-1, NW5-04)', () => {
  const screen = fs.readFileSync(path.join(ROOT, 'src/screens/HoldingDetailScreen.tsx'), 'utf8');
  const at = (t: string) => screen.indexOf(t);
  expect(at('staleWindowStart(series, period as any, now)')).toBeGreaterThan(0);
  expect(at('has no price near the window’s start: its last close before it is')).toBeGreaterThan(0);
  expect(at('has no price near the window’s start: its last close before it is')).toBeLessThan(screen.lastIndexOf("'Not enough price history for a fair comparison — check back as prices fill in.'"));
});
