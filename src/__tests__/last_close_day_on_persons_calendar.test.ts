/** THE DAY ON THE HOLDING PAGE'S PRICE BAND IS NEVER AFTER THE PERSON'S OWN TODAY (2026-10-21, W-HOLDING; DEC-0189, DEC-0282).
 *
 *  The price feed dates each close by the day in London (src/services/marketData.ts writes toISOString().slice(0, 10)), so at
 *  8 pm in California a coin's latest price — taken that evening — arrives dated tomorrow. MK-NW-F-148 lastCloseLabel names the
 *  person's today for it instead. A test cannot change its own time zone, so each witness runs lastCloseLabel, compiled from
 *  its own text with the day readers it asks, in a Node process set to that zone (the pattern of the closeAsOf witnesses in
 *  outside_performance_rerun_openai_03.test.ts). Every place a close's day is shown was searched: the Holding page's band is
 *  the only one — the account page and the Performance tab show the age of the prices ("2h ago"), never a close's day. */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { execFileSync } from 'child_process';
import { lastCloseLabel } from '../../MoneyKeel/functions/networth-and-performance/performance';

const ROOT = path.join(__dirname, '..', '..');
const PIECES: [string, string][] = [
  ['src/domain/_shared/dates.ts', 'const MONTH_SHORT ='], ['src/domain/_shared/dates.ts', 'function isoLocalDate('],
  ['src/domain/_shared/dates.ts', 'function dateShown('], ['src/domain/_shared/dates.ts', 'function maturityParts('],
  ['src/domain/performance/index.ts', 'function calendarDay('],
  ['MoneyKeel/functions/networth-and-performance/performance.ts', 'function lastCloseLabel('],
];
const CODE = PIECES.map(([file, start]) => {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const at = text.indexOf(start);
  const to = start.startsWith('const') ? text.indexOf('\n', at) : text.indexOf('\n}\n', at) + 2;
  if (at < 0 || to < at) throw new Error(`${start} not found in ${file}`);
  return ts.transpileModule(text.slice(at, to + 1), { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText;
}).join('\n');
const POINTS = { ticker: 'BTC', points: [{ date: '2026-10-20', close: 100000 }, { date: '2026-10-21', close: 101000 }, { date: '2026-10-22', close: 101500 }] };
/** the band, in that zone, at that instant — today read on that zone's calendar, as the screen's default does */
const bandIn = (tz: string, instant: number): string => execFileSync(process.execPath,
  ['-e', `${CODE}\nprocess.stdout.write(lastCloseLabel(${JSON.stringify(POINTS)}, isoLocalDate(new Date(${instant}))));`],
  { env: { ...process.env, TZ: tz } }).toString();

test('the witness compiled every piece it asks (a guard that proves it looked)', () => {
  expect(PIECES).toHaveLength(6);
  for (const name of ['MONTH_SHORT', 'isoLocalDate', 'dateShown', 'maturityParts', 'calendarDay', 'lastCloseLabel']) expect(CODE).toContain(name);
});
test('8 pm in California on 21 Oct: LAST CLOSE · OCT 21, 2026 — the price dated 22 Oct by London\'s day was taken on the person\'s 21st', () => {
  expect(bandIn('America/Los_Angeles', Date.UTC(2026, 9, 22, 3, 0))).toBe('LAST CLOSE · OCT 21, 2026');
});
test('the same instant in Tokyo, where it is already 22 Oct: LAST CLOSE · OCT 22, 2026', () => {
  expect(bandIn('Asia/Tokyo', Date.UTC(2026, 9, 22, 3, 0))).toBe('LAST CLOSE · OCT 22, 2026');
});
test('a close dated before today keeps its own day; no price, no day', () => {
  expect(lastCloseLabel({ ticker: 'VTI', points: [{ date: '2026-09-25', close: 287.69 }, { date: '2026-09-28', close: 290 }] }, '2026-10-01')).toBe('LAST CLOSE · SEP 28, 2026');
  expect(lastCloseLabel({ ticker: 'BTC', points: POINTS.points }, '2026-10-21')).toBe('LAST CLOSE · OCT 21, 2026');
  expect(lastCloseLabel(null, '2026-10-21')).toBe('LAST CLOSE');
});
test.failing('the band until 2026-10-21 · 8 pm in California read the London day, OCT 22 — no longer its answer (FIXED 2026-10-21)', () => {
  expect(bandIn('America/Los_Angeles', Date.UTC(2026, 9, 22, 3, 0))).toBe('LAST CLOSE · OCT 22, 2026');
});
