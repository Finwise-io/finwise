/** EVERY FUNCTION SAYS WHAT IT IS FOR (founder, 2026-10-04).
 *
 *  His question: "what does it mean functions with no purpose? If no purpose where and how are you
 *  using these functions?" 102 of the 361 functions in Net worth, Performance and Cash flow carried a
 *  record reading "NOT DETERMINED" where the sentence saying what the function answers should be, and
 *  16 orchestrators carried one stock sentence that said nothing. All were in use. A function with no
 *  description cannot be tested by anyone outside, and cannot be traced from a wrong number.
 *
 *  This reads every record in the code and holds two things:
 *    · the three modules of this build carry NO record without a description — none may return;
 *    · the other modules carry a debt, counted truly, and it may only fall.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const CODE = ['src', 'MoneyKeel/functions', 'Calculation Module code/engines'];

function records(): { id: string; family: string; answers: string; file: string }[] {
  const out: { id: string; family: string; answers: string; file: string }[] = [];
  const walk = (dir: string) => {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      if (f.name === 'node_modules') continue;
      const p = path.join(dir, f.name);
      if (f.isDirectory()) { walk(p); continue; }
      if (!/\.tsx?$/.test(f.name) || /\.test\./.test(f.name)) continue;
      const text = fs.readFileSync(p, 'utf8');
      for (const m of text.matchAll(/\/\* ─ (MK-([A-Z]{2})-[FO]-\d{3}) ─[\s\S]*?\*\//g)) {
        const a = /^ \* Answers \.\.\.\.\. (.*)$/m.exec(m[0]);
        out.push({ id: m[1], family: m[2], answers: (a ? a[1] : '').trim(), file: path.relative(ROOT, p) });
      }
    }
  };
  for (const c of CODE) walk(path.join(ROOT, c));
  return out;
}

const THIS_BUILD = ['NW', 'PF', 'CF'];
const missing = (r: { answers: string }) => r.answers === '' || r.answers.startsWith('NOT DETERMINED');
/** The stock sentence sixteen orchestrators carried instead of the question they answer. */
const stock = (r: { answers: string }) => /^── ORCHESTRATOR/.test(r.answers) || /^The one function a screen calls for this question\.?$/.test(r.answers);

test('the guard looked: it read every record in the code', () => {
  const all = records();
  expect(all.length).toBeGreaterThanOrEqual(690);
  expect(all.filter((r) => THIS_BUILD.includes(r.family)).length).toBeGreaterThanOrEqual(360);
});

test('Net worth, Performance and Cash flow: every function and orchestrator says what it is for', () => {
  const mine = records().filter((r) => THIS_BUILD.includes(r.family));
  expect(mine.filter(missing).map((r) => `${r.id} in ${r.file}`)).toEqual([]);
  expect(mine.filter(stock).map((r) => `${r.id} in ${r.file}`)).toEqual([]);
});

test('one record a function: no stale copy of a record is left behind in the code', () => {
  const seen = new Map<string, number>();
  for (const r of records()) seen.set(r.id, (seen.get(r.id) ?? 0) + 1);
  expect([...seen].filter(([, n]) => n > 1).map(([id, n]) => `${id} ×${n}`)).toEqual([]);
});

test('the other modules: the functions still without a description are counted, and the count may only fall', () => {
  const debt = records().filter((r) => !THIS_BUILD.includes(r.family) && missing(r)).length;
  const OWED = 97;   // the true number on 2026-10-04: Shared 49 · Storage 26 · Plan 20 · Home 2
  expect(debt).toBeLessThanOrEqual(OWED);
  // lower the number when it falls, so it cannot creep back up
  if (debt < OWED) throw new Error(`the debt is down to ${debt} — lower OWED in this test to hold it there`);
});
