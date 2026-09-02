/** ONE TERM PER CONCEPT — founder standing order, 2026-09-02.
 *
 *  "Always use same words to describe same thing in the app. There is no score for creative
 *  writing use different terms to describe same thing."
 *
 *  The base-pay card once said "lands", its note said "take-home", its row said "Estimated" and
 *  its sentence said "calculated" — four words, two concepts, and a person must re-derive that
 *  they are the same thing. In a finance app two words read as two different numbers.
 *
 *  The canon, and the words each one RETIRED:
 *    take-home   — money after tax and everything taken out (retired: "lands in your bank",
 *                  "what lands", "takes home" as a label)
 *    calculated  — any figure the app computed rather than the person entered (retired:
 *                  "worked out", "estimated" as a row label, "our estimate")
 *
 *  This guard reads the DISK — ALL of src/ and every cash-flow function, comments included,
 *  because a comment that uses the retired word is how it creeps back into copy. A new synonym
 *  is added here the day its concept gets a canonical word.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOTS = ['src', 'MoneyKeel/functions'];
const RETIRED: [RegExp, string][] = [
  [/lands in (your|the|their|[A-Z][a-z]+’s) bank/, 'use "take-home"'],
  [/worked out/, 'use "calculated"'],
  [/\bour estimate/, 'use "the calculated rate"'],
  [/Estimated federal tax/, 'use "Calculated federal tax"'],
  [/takes home ≈?\$/, 'use "take-home $…"'],
  [/work (it|them|this|these) out/, 'use "calculated"'],
  [/what lands/, 'use "take-home"'],
  [/lands in (your|the|their|[A-Z][a-z]+’s) account/, 'use "take-home" or "arrives"'],
  [/estimated from your/, 'use "calculated from your"'],
  [/~400/, 'the simulation runs 1,000 paths (willItLast.ts) — a run-count on screen must say 1,000'],
];

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === '__tests__' ? [] : walk(p);
    return /\.(ts|tsx)$/.test(d.name) && !/\.test\./.test(d.name) ? [p] : [];
  });
}

test('THE LAW: a retired word appears nowhere a person could meet it', () => {
  const offences: string[] = [];
  for (const root of ROOTS) {
    for (const file of walk(root)) {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        for (const [re, fix] of RETIRED) {
          if (re.test(line)) offences.push(`${file}:${i + 1} — ${re} → ${fix}`);
        }
      });
    }
  }
  expect(offences).toEqual([]);
});
