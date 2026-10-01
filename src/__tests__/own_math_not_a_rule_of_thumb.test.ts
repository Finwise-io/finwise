/** HIS REWORD OF THE DRAWING-TOO-MUCH HEADS-UP — DEC-0036, swept to every screen by DEC-0215.
 *
 *  DEC-0036: the warning about drawing more than about 4% a year is reworded to be about YOUR
 *  numbers rather than a rule of thumb — *"above what your own numbers support long-term"*.
 *  DEC-0215, his one-door-one-term rule: *"so change on all."*
 *
 *  The Net worth compliance validation of 2026-10-01 found the ruling applied nowhere. Three screens
 *  each carried their own hand-typed copy — the Plan hub and the retirement cockpit twice — all still
 *  saying "within the ~4% guideline" and "above 5% — high risk of running short", and the Plan hub
 *  carried a comment saying the sweep was left for later. A deferral inside a comment is invisible to
 *  every gate, which is exactly why this one reads the shipped strings instead.
 *
 *  It asserts the count of files it read, so a pattern that stops matching goes red rather than quiet.
 */
import fs from 'fs';
import path from 'path';
import { rateBandWords, withdrawalPlan } from '../domain/decumulation';

const SRC = path.join(__dirname, '..');

function filesUnder(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === '__tests__' || e.name === '__snapshots__' || e.name === 'node_modules') return [];
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return filesUnder(p);
    return /\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
  });
}

/** Copy only: his wording is quoted in the comments that explain the rule, and a comment is not
 *  something a person reads on a screen. */
const copyOf = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[\s;,)}])\/\/.*$/gm, '$1 ');   // trailing comments too — the first pass missed those

describe('own-math framing, not a rule of thumb (DEC-0036 · DEC-0215)', () => {
  const files = filesUnder(SRC);

  it('reads the whole of src — and says how much', () => {
    expect(files.length).toBeGreaterThanOrEqual(120);
  });

  it('says it in his words, for every band', () => {
    expect(rateBandWords('high')).toBe('above what your own numbers support long-term');
    expect(rateBandWords('moderate')).toBe('near the edge of what your own numbers support long-term');
    expect(rateBandWords('safe')).toBe('within what your own numbers support long-term');
    // and the bracketed form that sits inside a sentence says the same thing
    expect(rateBandWords('high', { short: true })).toBe('above what your own numbers support');
  });

  it('no screen cites the published guideline as the verdict', () => {
    const offenders: string[] = [];
    let examined = 0;
    for (const f of files) {
      examined += 1;
      const copy = copyOf(fs.readFileSync(f, 'utf8'));
      for (const bad of [/~?4% guideline/, /above 5%\s*[—-]/, /a bit above 4%/, /high risk of running short/]) {
        const m = copy.match(bad);
        if (m) offenders.push(`${path.relative(SRC, f)} — ${JSON.stringify(m[0])}`);
      }
    }
    expect(examined).toBeGreaterThanOrEqual(120);
    expect(offenders).toEqual([]);
  });

  it('the band reads one way, from one place — nothing types it a second time', () => {
    const home = path.join(SRC, 'domain', 'decumulation', 'index.ts');
    const offenders: string[] = [];
    for (const f of files) {
      if (f === home) continue;
      const copy = copyOf(fs.readFileSync(f, 'utf8'));
      if (/your own numbers support/.test(copy) && !/rateBandWords/.test(copy)) {
        offenders.push(path.relative(SRC, f));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('a real plan reaches the verdict it should', () => {
    // spends 60,000 a year, nothing guaranteed, a 1,000,000 portfolio → 6%, above what it supports
    expect(rateBandWords(withdrawalPlan(5_000, 0, 1_000_000).rateBand))
      .toBe('above what your own numbers support long-term');
    // the same spending against 2,000,000 → 3%, within it
    expect(rateBandWords(withdrawalPlan(5_000, 0, 2_000_000).rateBand))
      .toBe('within what your own numbers support long-term');
  });
});
