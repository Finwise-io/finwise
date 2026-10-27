/** A LOGGED EXPENSE'S OR INCOME'S DAY IS READ WHERE THE PERSON IS — ONE READER, AND NO OTHER (2026-10-25, Cash flow drawing match
 *  CF-21).
 *
 *  WHAT WENT WRONG. The budget editor's rows read each expense's day with `new Date("2026-08-01")`, which is midnight in London —
 *  Jul 31 in California — so every expense dated the 1st dropped out of its row: Flexible read $1,678 over rows that made $1,256.
 *  The Expenses screen opened an Aug 1 expense for editing as Jul 31, and saved it there. The other way round, a reader that
 *  takes the first seven characters of an instant ("2026-09-01T01:30:00.000Z", the Expenses screen's stamp) filed a purchase made
 *  at 6:30pm on Aug 31 in California under September, and a repeating bill whose next date was a calendar day landed a day
 *  early. Twelve readers in nine files; the class, not one line.
 *
 *  THE RULE. A stored day is read through `localDay` (its day) or `localMoment` (its moment), src/domain/_shared/dates.ts; and the
 *  money a person logs is written as the day or the clock time they typed, with no zone. This guard reads every file that reads or
 *  writes a logged expense or income and fails on a `new Date(<record>.date)`, a first-seven-characters month test on a record's
 *  date, or a record's date written from `toISOString()`. It proves it looked: it counts the files and the reads it saw.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const CASHFLOW_FUNCTIONS = path.join(ROOT, 'MoneyKeel', 'functions', 'cashflow');
const FILES = [
  ...fs.readdirSync(CASHFLOW_FUNCTIONS).filter((f) => f.endsWith('.ts') && !f.includes('.test.')).map((f) => path.join(CASHFLOW_FUNCTIONS, f)),
  ...['src/domain/budget/index.ts', 'src/store/useStore.ts', 'src/hooks/useCashflowModel.ts', 'src/components/MoneySheets.tsx',
    'src/screens/CashFlowScreen.tsx', 'src/screens/BudgetScreen.tsx', 'src/screens/ExpenseScreen.tsx', 'src/screens/HomeScreen.tsx',
    'src/screens/GoalsScreen.tsx', 'src/screens/TipsScreen.tsx', 'src/screens/BillCalendarScreen.tsx', 'src/screens/MonthlyIncomeScreen.tsx']
    .map((f) => path.join(ROOT, f)),
];

/** The ways a record's day has been read or written in the wrong zone, as they were written in the code. */
const WRONG: [string, RegExp][] = [
  ['a record’s date read as a moment in London', /new Date\(\s*(?:[A-Za-z_$][\w$]*\??\.)+(?:date|nextDate)\s*\)/],
  ['a parameter named date read as a moment in London', /new Date\(\s*date\s*\)/],
  ['a month or day read from the first characters of a record’s date', /String\(\s*(?:[A-Za-z_$][\w$]*\??\.)+date\b[^)]*\)\s*\.(?:startsWith|slice)\(/],
  ['a month or day read from the first characters of a record’s date', /(?:[A-Za-z_$][\w$]*\??\.)+date\s*\.(?:startsWith|slice)\(/],
  ['a record’s date written in London’s day', /\bdate:\s*[^,\n}]*toISOString\(\)/],
];

/** Lines that read a date which is NOT a logged expense's or income's, each with its reason — counted, never silent. */
const NOT_A_LOGGED_DAY: [string, string][] = [
  ['x.date === String(t.date).slice(0, 10)', 'useStore: a brokerage transaction’s own date, as the provider dated it, matched to the day it moved'],
];
/** Every line of one file's code that reads or writes a record's day the wrong way. Comments are not code. */
export function wrongReads(src: string, spared: string[] = []): string[] {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/\/\/.*$/gm, '');
  const out: string[] = [];
  code.split('\n').forEach((line, i) => {
    const hits = WRONG.filter(([, re]) => re.test(line));
    if (!hits.length) return;
    const allowed = NOT_A_LOGGED_DAY.find(([text]) => line.includes(text));
    if (allowed) { spared.push(allowed[1]); return; }
    out.push(`${i + 1}: ${hits[0][0]} — ${line.trim()}`);
  });
  return out;
}

test('the guard reads every file that reads or writes a logged expense or income, and sees the reads in them', () => {
  // 27 files on 2026-10-25: the 15 cash-flow function files and the 12 named here; a floor, so a walk that stops finding them goes red
  for (const f of FILES) expect([f, fs.existsSync(f)]).toEqual([f, true]);
  expect(FILES.length).toBeGreaterThanOrEqual(27);
  const all = FILES.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  // the one reader is used: 29 calls on 2026-10-25 (localDay and localMoment) — if it stops being called, the reads went elsewhere
  expect((all.match(/\blocal(?:Day|Moment)\(/g) ?? []).length).toBeGreaterThanOrEqual(29);
  // and the record dates are there to be read: 48 mentions of `.date` on 2026-10-25
  expect((all.match(/\.date\b/g) ?? []).length).toBeGreaterThanOrEqual(48);
});

test('the guard catches each shape it is for, written as it stood, and leaves the one reader alone', () => {
  expect(wrongReads('    const d = new Date(e.date);')).toHaveLength(1);                                         // useCategorySpend
  expect(wrongReads('          let next = new Date(r.nextDate);')).toHaveLength(1);                             // the repeating bills
  expect(wrongReads('    const d = new Date(date);')).toHaveLength(1);                                          // useMonthlyStats
  expect(wrongReads("  const inSelMonth = (e: any) => String(e.date ?? '').startsWith(selYm);")).toHaveLength(1);
  expect(wrongReads("    if (!String(e?.date ?? '').startsWith(ym)) continue;")).toHaveLength(1);              // budgetVsActual
  expect(wrongReads("      store: store.trim(), date: dateTime.toISOString(),")).toHaveLength(1);              // the Expenses screen
  expect(wrongReads("              date: next.toISOString(),")).toHaveLength(1);
  expect(wrongReads('    if (!localDay(e?.date).startsWith(ym)) continue;')).toEqual([]);
  expect(wrongReads('    const d = localMoment(e.date) ?? new Date(NaN);')).toEqual([]);
  expect(wrongReads('  // new Date(e.date) read Jul 31')).toEqual([]);                                        // a comment is not code
  expect(wrongReads('      createdAt: new Date().toISOString(),')).toEqual([]);                               // an instant that IS an instant
});

test('no file reads or writes a logged expense’s or income’s day in the wrong zone — and every line spared is named', () => {
  const spared: string[] = [];
  const found = FILES.flatMap((f) => wrongReads(fs.readFileSync(f, 'utf8'), spared).map((l) => `${path.relative(ROOT, f)}:${l}`));
  expect(found).toEqual([]);
  // each spared line was seen, once: a spared reading that is no longer in the code is a stale exception
  expect(spared).toEqual(NOT_A_LOGGED_DAY.map(([, why]) => why));
});
