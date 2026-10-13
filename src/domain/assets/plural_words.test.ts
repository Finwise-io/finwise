// ONE LIST OF WORDS AND PLURALS (DEC-4082, 2026-10-10). His words: "15 - why not go ahead and make a list of words
// and plurals." MK-NW-F-067 plural takes its plural from PLURAL_WORDS and nowhere else. This guard reads the code
// (src + MoneyKeel/functions, tests left out), finds every plural( call, and checks:
//   1 · every call names its word as a plain quoted word, and that word is on the list;
//   2 · the scan found at least the calls counted on 2026-10-10 (a guard must prove it looked);
//   3 · the list's plurals are spelled right — regular words add "s", the irregular ones are named here;
//   4 · no count is pluralised by hand any more (`=== 1 ? '' : 's'` and its cousins), so nothing bypasses the list.
import * as fs from 'fs';
import * as path from 'path';
import { plural, PLURAL_WORDS } from './index';

const ROOT = path.join(__dirname, '..', '..', '..');
const SCAN = ['src', 'MoneyKeel/functions'];

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== '__tests__') walk(p); }
      else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.(ts|tsx)$/.test(e.name)) out.push(p);
    }
  };
  for (const s of SCAN) walk(path.join(ROOT, s));
  return out;
}

/** every plural( call: where it is and the text of its second argument */
function pluralCalls() {
  const calls: { at: string; word: string }[] = [];
  for (const f of sourceFiles()) {
    const s = fs.readFileSync(f, 'utf8');
    const re = /(?<![\w.])plural\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s))) {
      if (s.slice(Math.max(0, m.index - 9), m.index) === 'function ') continue;   // the definition itself
      let i = m.index + m[0].length, depth = 1, cur = '';
      const args: string[] = [];
      while (depth > 0 && i < s.length) {
        const c = s[i];
        if ('([{'.includes(c)) depth += 1;
        if (')]}'.includes(c)) depth -= 1;
        if (depth === 1 && c === ',') { args.push(cur); cur = ''; } else if (depth > 0) cur += c;
        i += 1;
      }
      args.push(cur);
      calls.push({ at: `${path.relative(ROOT, f)}:${s.slice(0, m.index).split('\n').length}`, word: (args[1] ?? '').trim() });
    }
  }
  return calls;
}

const calls = pluralCalls();

test('DEC-4082 · the scan found every plural( call counted on 2026-10-10 (at least 60)', () => {
  // 212 files and 67 calls on 2026-10-10, counting the ones written in generated formula headers; the floor stops a scan that stops matching
  expect(sourceFiles().length).toBeGreaterThanOrEqual(200);
  expect(calls.length).toBeGreaterThanOrEqual(60);
});

test('DEC-4082 · every plural( call names a word on the one list', () => {
  const notLiteral = calls.filter((c) => !/^'[A-Za-z]+'$/.test(c.word));
  expect(notLiteral).toEqual([]);
  const offList = calls.filter((c) => !(c.word.slice(1, -1) in PLURAL_WORDS));
  expect(offList).toEqual([]);
  // and every word on the list is counted somewhere — a list entry nothing uses is a word nobody checked
  const used = new Set(calls.map((c) => c.word.slice(1, -1)));
  expect(Object.keys(PLURAL_WORDS).filter((w) => !used.has(w))).toEqual([]);
});

test('DEC-4082 · the plurals on the list are spelled right', () => {
  const IRREGULAR: Record<string, string> = { Treasury: 'Treasuries', property: 'properties', has: 'have' };   // has: a verb (MK-NW-F-130, 2026-10-13)
  for (const [one, many] of Object.entries(PLURAL_WORDS)) {
    expect([one, many]).toEqual([one, IRREGULAR[one] ?? `${one}s`]);
  }
  expect(Object.keys(PLURAL_WORDS).length).toBeGreaterThanOrEqual(20);
  expect(plural(2, 'Treasury')).toBe('2 Treasuries');
  expect(plural(1, 'Treasury')).toBe('1 Treasury');
  expect(plural(0, 'property')).toBe('0 properties');
  expect(plural(3, 'CD')).toBe('3 CDs');
  expect(plural(2, 'record', '2 more')).toBe('2 more records');   // the count as the caller writes it
});

test('DEC-4082 · a word not on the list is refused, never given a guessed "s"', () => {
  expect(() => plural(2, 'person' as any)).toThrow(/not on PLURAL_WORDS/);
});

test('DEC-4082 · no count is pluralised by hand outside the list', () => {
  const HAND = [/\? '' : 's'/, /\? 's' : ''/, /\? 'y' : 'ies'/, /\? 'ies' : 'y'/, /propert\$\{/,
    /=== ?1 \? '([A-Za-z]+)' : '\1s'/];
  const hits: string[] = [];
  const files = sourceFiles();
  for (const f of files) {
    if (f.endsWith(path.join('_shared', 'plural.ts'))) continue;   // its own comment quotes the old pattern
    fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      if (HAND.some((r) => r.test(line))) hits.push(`${path.relative(ROOT, f)}:${i + 1}`);
    });
  }
  expect(files.length).toBeGreaterThanOrEqual(200);
  expect(hits).toEqual([]);
});
