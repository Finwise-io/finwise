/**
 * EVERY OUTSIDE CASE THAT DOES NOT PASS AS WRITTEN CARRIES A SETTLED LINE (FX-AUDITS, 2026-10-27).
 *
 * Two outside audits stood open before Build 55: OpenAI's final audit of Net worth (workplan #230, 505 cases) and
 * Claude's audit of Performance (workplan #234, 225 cases). Each case sits in a results file with the status it had on
 * the day it was run. Since then the app was fixed, rulings came in and some cases' answers moved, so the status alone
 * no longer says where a case stands. This guard reads each results file and its test file and requires a settled
 * line on every case that needs one:
 *   · its status is not PASS (FINDING, BRIEF_WRONG, UNCLEAR, BLOCKED), or
 *   · its own test is now kept failing or skipped (the auditor's answer no longer the app's), or
 *   · it carries a re-check line, or
 *   · the auditor wrote RULE UNCLEAR on it (a ruling settled it, and the line says which), or
 *   · its test is gone (a function removed by his decision).
 * It proves it looked: it counts every case it read and every case that needed a line, and both counts are the true
 * numbers of 2026-10-27 — a change to either is a change someone must explain here.
 */
import * as fs from 'fs';
import * as path from 'path';

const RESULTS = path.join(__dirname, '../../documents/audit/outside-test-cases/returned/results');

type Case = { id: string; kind: string; title: string; status: string; settled?: string; [k: string]: unknown };

/** every test declared in a file: the function it sits under (its describe's ID), its title (escapes undone), its mark */
const declared = (file: string): { fn: string; title: string; mark: 'plain' | 'failing' | 'skip' }[] => {
  const src = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const blocks: { at: number; fn: string }[] = [];
  const d = /\bdescribe\(\s*['"`](MK-[A-Z]{2}-[A-Z]-\d{3})/g;
  for (let m = d.exec(src); m; m = d.exec(src)) blocks.push({ at: m.index, fn: m[1] });
  const out: { fn: string; title: string; mark: 'plain' | 'failing' | 'skip' }[] = [];
  const re = /\b(?:test|it)(\.failing|\.skip)?\(\s*(['"`])((?:\\.|(?!\2)[^\\])*)\2/g;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    const at = m.index;
    const fn = [...blocks].reverse().find((b) => b.at < at)?.fn ?? '';
    out.push({ fn, title: m[3].replace(/\\(.)/g, '$1'), mark: m[1] === '.failing' ? 'failing' : m[1] === '.skip' ? 'skip' : 'plain' });
  }
  return out;
};

const audit = (pairs: [string, string][], handed?: Case[]) => {
  let read = 0;
  const needing: string[] = [];
  const unsettled: string[] = [];
  for (const [results, testFile] of pairs) {
    const cases: Case[] = handed ?? JSON.parse(fs.readFileSync(path.join(RESULTS, results), 'utf8')).cases;
    const tests = declared(testFile);
    expect(tests.length).toBeGreaterThan(25);   // the reader found the file's tests, not none (the fewest: 28)
    for (const c of cases) {
      read++;
      const key = `${c.kind} · ${c.title}`;
      const own = tests.filter((t) => t.fn === c.id && (t.title === key || t.title.startsWith(`${key} —`)));
      const needs = c.status !== 'PASS' || own.length === 0 || own.some((t) => t.mark !== 'plain')
        || Object.keys(c).some((k) => k.startsWith('recheck_')) || JSON.stringify(c.expected ?? '').includes('UNCLEAR');
      if (!needs) continue;
      const name = `${results} · ${c.id} · ${key}`;
      needing.push(name);
      if (!(typeof c.settled === 'string' && c.settled.trim().length > 20)) unsettled.push(name);
    }
  }
  return { read, needing, unsettled };
};

describe('the outside audits are settled case by case', () => {
  test('#230 · Net worth, OpenAI final audit: every case not passing as written has a settled line', () => {
    const r = audit([1, 2, 3, 4].map((p) => [`moneykeel_nw_final_openai_part${p}_results.json`, `outside_networth_final_openai_part${p}.test.ts`] as [string, string]));
    expect(r.read).toBe(505);
    expect(r.unsettled).toEqual([]);
    expect(r.needing.length).toBe(128);   // 72 not PASS · 43 whose function was removed · 5 kept failing since their run · 8 RULE UNCLEAR
  });
  test('#234 · Performance, Claude audit: every case not passing as written has a settled line', () => {
    const r = audit([1, 2, 3, 4].map((p) => [`performance_claude_0${p}_results.json`, `outside_performance_claude_0${p}.test.ts`] as [string, string]));
    expect(r.read).toBe(225);
    expect(r.unsettled).toEqual([]);
    // 82 since 2026-11-01: MK-PF-F-029's 'two sparse marks' case is kept failing under the lead's ruling R19 (no start close older than 7
    // days), and carries its settled line (CLEANUP-TESTS)
    expect(r.needing.length).toBe(82);    // 55 not PASS · 12 whose function was removed · 14 kept failing since their run · 1 RULE UNCLEAR
  });
  test('the guard fires: each of the five reasons, with no settled line, is caught; a plain pass is not', () => {
    const base = { id: 'MK-PF-F-001', kind: 'easy', title: 'Two purchases of one stock', status: 'PASS' };
    const r = audit([['performance_claude_02_results.json', 'outside_performance_claude_02.test.ts']], [
      base,                                                                         // a plain pass: needs nothing
      { ...base, status: 'FINDING' },                                               // not PASS
      { ...base, title: 'A case with no test' },                                    // no test of its own
      { ...base, id: 'MK-PF-F-007', kind: 'complex', title: 'Bought twice at different prices' },   // its test kept failing
      { ...base, recheck_2026_10_21: 'BRIEF WRONG since …' },                       // a re-check line
      { ...base, expected: 'RULE UNCLEAR — …' },                                     // the auditor's RULE UNCLEAR
    ] as Case[]);
    expect([r.read, r.needing.length, r.unsettled.length]).toEqual([6, 5, 5]);
  });
});
