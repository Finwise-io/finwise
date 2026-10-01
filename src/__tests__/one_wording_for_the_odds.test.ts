/** HIS ONE WORDING FOR THE ODDS — DEC-0104 and DEC-0109, and nothing may write it a second way.
 *
 *  His words: *"make sure when we are using same language everywhere to convey same message. We
 *  should have the same language on home, NW and Plan for retirement — xx% odds of lasting to age
 *  abc."* He said it twice, three weeks apart, because the first fix reached three screens and
 *  missed the fourth.
 *
 *  The compliance validation of the Net worth module on 2026-10-01 found it split again: the Cash
 *  flow screen printed *"{chance}% odds of lasting"* and stopped, with no age on it — so the one
 *  number a person meets on Home, Net worth and Plan as "78% odds of lasting to age 90" read on a
 *  fourth screen as a shorter, different claim. The gauge under the Plan outcome hand-typed its own
 *  half of the sentence as well, which meant a change to the helper could not reach the screen he
 *  actually looks at.
 *
 *  So this does not test that the sentence is right somewhere. It reads EVERY file that ships and
 *  asserts the words only ever come from `oddsLine` / `oddsTail`, and it says how many files it
 *  read — because a guard that stops matching must go red rather than quiet (standing order,
 *  2026-09-28).
 */
import fs from 'fs';
import path from 'path';
import { oddsLine, oddsTail } from '../domain/planning/hub';

const SRC = path.join(__dirname, '..');
const GLOSSARY = path.join(SRC, 'domain', 'glossary.ts');

function filesUnder(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === '__tests__' || e.name === '__snapshots__' || e.name === 'node_modules') return [];
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return filesUnder(p);
    return /\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
  });
}

describe('one wording for the odds (DEC-0104 · DEC-0109)', () => {
  const files = filesUnder(SRC);

  it('reads the whole of src — and says how much', () => {
    expect(files.length).toBeGreaterThanOrEqual(120);
  });

  it('the sentence is written in ONE place', () => {
    expect(oddsLine('retired', 78, 90)).toBe('78% odds of lasting to age 90');
    expect(oddsLine('retired', 78, 90)).toContain(oddsTail(90));
  });

  it('the glossary explains the odds with the REAL sentence, so it cannot drift from it', () => {
    const body = fs.readFileSync(GLOSSARY, 'utf8');
    // it teaches by example, with 78% to age 90 — the same characters the helper writes
    expect(body).toContain(oddsLine('retired', 78, 90));
  });

  it('nothing hand-types the words — every screen asks the helper', () => {
    const hub = path.join(SRC, 'domain', 'planning', 'hub.ts');
    const offenders: string[] = [];
    let examined = 0;
    for (const f of files) {
      if (f === hub) continue;
      const text = fs.readFileSync(f, 'utf8');
      // strip comments: this very rule is quoted in several of them, and a comment is not copy
      const code = text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
      examined += 1;
      // the spoken accessibility form says "percent" in words and is allowed (the canon's ruling on
      // spoken labels); anything else that writes these words is writing the sentence itself
      for (const m of code.matchAll(/odds of last\w*/g)) {
        const around = code.slice(Math.max(0, m.index! - 90), m.index! + 40);
        if (/oddsTail|oddsLine|percent odds of lasting/.test(around)) continue;
        // THE GLOSSARY QUOTES THE SENTENCE TO TEACH IT, which is the one wording reinforcing itself,
        // not a second version of it. It is allowed here and pinned below instead, so it cannot drift.
        // the test above pins its sentence to the helper character for character, so a drift there
        // goes red by that route rather than this one
        if (f === GLOSSARY) continue;
        offenders.push(`${path.relative(SRC, f)} — ${JSON.stringify(around.slice(-70))}`);
      }
    }
    expect(examined).toBeGreaterThanOrEqual(120);
    expect(offenders).toEqual([]);
  });

  it('every screen that shows the odds imports the helper rather than its own wording', () => {
    const shows = files.filter((f) => /odds of last/.test(
      fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')));
    expect(shows.length).toBeGreaterThanOrEqual(3);
    for (const f of shows) {
      if (f.endsWith(path.join('planning', 'hub.ts')) || f === GLOSSARY) continue;
      expect(fs.readFileSync(f, 'utf8')).toMatch(/from '.*planning\/hub'/);
    }
  });
});
