/** GUARD — a figure a person reads is DECLARED (founder rule 11, 2026-09-14).
 *
 *  A screen prints a figure through `fig(identifier, value)`, so the place that prints carries the
 *  identifier and the master file's row is printed from the declaration. Formatting a number directly
 *  — `money(x)`, `maskedMoney(x)`, `moneyCompact(x)` — puts a figure in front of a person that the
 *  file knows nothing about, which is the defect that cost two months.
 *
 *  THE BASELINE. On 2026-09-14, 673 such places stood in 57 screen and component files — two files
 *  (the base-pay screen and the income screen) were already at zero, their 17 figures declared. This guard is
 *  a RATCHET: a file may only print fewer, and no new file may appear. When a file reaches zero its
 *  line is deleted, and when the list is empty the ratchet becomes the wall.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOTS = ['src/screens', 'src/components'];
/** The formatters that put a number in front of a person without an identifier. */
const RAW = /\b(money|money2|moneyCompact|maskedMoney|maskedMoney2|maskedPrice|spokenMoney|spokenMoney2|formatMoney|formatMoneyCents)\s*\(/g;
const BASELINE: Record<string, number> = JSON.parse(fs.readFileSync('Calculation Module code/scripts/moneykeel_undeclared_figures.json', 'utf8')).baseline;

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === '__tests__' ? [] : walk(p);
    return /\.(ts|tsx)$/.test(d.name) && !/\.test\./.test(d.name) ? [p] : [];
  });
}
/** How many places in this file print a figure with no identifier. The formatters' own module is not a screen. */
export function undeclaredIn(file: string, text: string): number {
  if (/useMoney\.ts$|figure\.ts$/.test(file)) return 0;
  return (text.match(RAW) ?? []).filter((m) => !/^import/.test(m)).length;
}

test('rule 11: no screen starts printing a figure the file knows nothing about, and the 2026-09-14 debt only shrinks', () => {
  const found: Record<string, number> = {};
  for (const root of ROOTS) for (const f of walk(root)) {
    const n = undeclaredIn(f, fs.readFileSync(f, 'utf8'));
    if (n) found[f] = n;
  }
  const offences: string[] = [];
  for (const [file, n] of Object.entries(found)) {
    const allowed = BASELINE[file];
    if (allowed == null) offences.push(`${file} is NEW to this list — ${n} figure(s) printed with no identifier. Declare them on the door and print with fig('MK-…-M-…', value).`);
    else if (n > allowed) offences.push(`${file} grew from ${allowed} to ${n} places printing a figure with no identifier.`);
  }
  for (const [file, allowed] of Object.entries(BASELINE)) {
    const now = found[file] ?? 0;
    if (now < allowed) offences.push(`${file} is down to ${now} from ${allowed} — lower its line in moneykeel_undeclared_figures.json so the ratchet holds (delete it at zero).`);
  }
  expect(offences).toEqual([]);
});

/** THE SAME RULE FOR PERCENTS (Performance audit row 9, 2026-10-21).
 *
 *  The test above counts the money formatters only, so a percent printed by hand was invisible to it: the account page's
 *  Return column, Look back's "+2.50%" and the Holding page's market comparison were on screen with no identifier while this
 *  guard reported their files clean. A percent is a figure too. This counts, in the same screens and components:
 *    · every value written straight before a percent sign or the word "percent" — `${x}%`, `{x}%`, `${x} percent`;
 *    · every call of a helper whose own body writes one (a `const pct = (v) => …%` in the file, or an exported one such as
 *      maskedPct), because each call is a figure printed by hand — the helper's own line is not counted;
 *  and leaves out a percent that is a size, not a figure (`width: \`${x}%\``, height, left, top …) and one written inside
 *  figWords(identifier, …), which carries its identifier. A sentence a function composes in src/domain or MoneyKeel/functions
 *  is out of its reach, as it is for the money test above — said here so the count is not read as more than it is.
 *  The baseline is a ratchet like the money one: each file holds its true count, may only fall, and is deleted at zero. */
const WRITES = /\}\s?%|\} percent\b/g;
const GEOMETRY = /(width|height|left|right|top|bottom|flexBasis|maxWidth|minWidth)\s*:\s*`[^`]*$/;
const HELPER_DEF = /(?:export\s+)?const\s+([A-Za-z_]\w*)\s*=\s*\(([^()]|\([^()]*\))*\)\s*(?::\s*[\w|<> ]+)?\s*=>/g;
const stripComments = (t: string) => t.split('\n').map((l) => (/^\s*(\/\/|\*|\/\*)/.test(l) ? '' : l.replace(/\s\/\/ .*$/, ''))).join('\n');
function insideFigWords(t: string, i: number): boolean {
  const j = t.lastIndexOf('figWords(', i);
  if (j < 0 || i - j > 600) return false;
  let depth = 0;
  for (let k = j + 8; k < i; k++) { if (t[k] === '(') depth++; else if (t[k] === ')') depth--; }
  return depth > 0 || (depth === 0 && /\)\s*$/.test(t.slice(j, i).replace(/\}$/, '')));   // inside the call, or `figWords(…)}%`
}
/** The helpers in a file whose body writes a percent, with where each one's body runs. */
function percentHelpers(t: string): { name: string; from: number; to: number; exported: boolean }[] {
  const out: { name: string; from: number; to: number; exported: boolean }[] = [];
  for (const m of t.matchAll(HELPER_DEF)) {
    const semi = t.indexOf(';\n', m.index!);
    const to = semi < 0 ? t.length : semi + 1;
    WRITES.lastIndex = 0;
    if (WRITES.test(t.slice(m.index!, to))) out.push({ name: m[1], from: m.index!, to, exported: /^export/.test(m[0]) });
  }
  return out;
}
/** How many places in this file print a percent with no identifier, and how many percent-writing places it read in all. */
export function percentsIn(file: string, raw: string, exported: string[]): { undeclared: number; read: number } {
  if (/figure\.ts$/.test(file)) return { undeclared: 0, read: 0 };
  const t = stripComments(raw);
  const hs = percentHelpers(t);
  const inHelper = (i: number) => hs.some((h) => i >= h.from && i < h.to);
  let undeclared = 0, read = 0;
  for (const m of t.matchAll(WRITES)) {
    read++;
    const i = m.index!;
    if (inHelper(i) || insideFigWords(t, i) || GEOMETRY.test(t.slice(Math.max(0, i - 120), i).split('\n').pop() ?? '')) continue;
    undeclared++;
  }
  for (const name of new Set([...hs.map((h) => h.name), ...exported])) {
    for (const m of t.matchAll(new RegExp(`(?<![\\w.])${name}\\(`, 'g'))) {
      read++;
      if (inHelper(m.index!) || insideFigWords(t, m.index!)) continue;
      undeclared++;
    }
  }
  return { undeclared, read };
}

test('rule 11 for percents: no screen prints a percent the file knows nothing about, and the 2026-10-21 debt only shrinks', () => {
  const PCT_BASELINE: Record<string, number> = JSON.parse(fs.readFileSync('Calculation Module code/scripts/moneykeel_undeclared_figures.json', 'utf8')).percent_baseline;
  const files = ROOTS.flatMap((r) => walk(r));
  const texts = files.map((f) => [f, fs.readFileSync(f, 'utf8')] as const);
  const exported = [...new Set(texts.flatMap(([, t]) => percentHelpers(stripComments(t)).filter((h) => h.exported).map((h) => h.name)))];
  const found: Record<string, number> = {};
  let read = 0;
  for (const [f, t] of texts) {
    const r = percentsIn(f, t, exported);
    read += r.read;
    if (r.undeclared) found[f] = r.undeclared;
  }
  const offences: string[] = [];
  for (const [file, n] of Object.entries(found)) {
    const allowed = PCT_BASELINE[file];
    if (allowed == null) offences.push(`${file} is NEW to this list — ${n} percent(s) printed with no identifier. Declare them on the door and print with fig('MK-…-M-…', value).`);
    else if (n > allowed) offences.push(`${file} grew from ${allowed} to ${n} places printing a percent with no identifier.`);
  }
  for (const [file, allowed] of Object.entries(PCT_BASELINE)) {
    const now = found[file] ?? 0;
    if (now < allowed) offences.push(`${file} is down to ${now} percent(s) from ${allowed} — lower its line in percent_baseline (delete it at zero).`);
  }
  // A GUARD MUST PROVE IT LOOKED: the files and the percent-writing places it read (89 files and 159 places on 2026-10-21),
  // and that it still sees a percent written by hand, a helper's call, and the two things it must not count.
  expect(files.length).toBeGreaterThanOrEqual(85);
  expect(read).toBeGreaterThanOrEqual(150);
  expect(exported).toContain('maskedPct');
  expect(percentsIn('x.tsx', 'const a = <Text>{(r * 100).toFixed(2)}%</Text>;\nconst pct = (v: number) => `${v}%`;\nconst b = pct(1);\n', []).undeclared).toBe(2);
  expect(percentsIn('x.tsx', 'const a = <View style={{ width: `${w}%` }} />;\nconst b = figWords(\'MK-NW-M-024\', `${r}%`);\n', []).undeclared).toBe(0);
  expect(offences).toEqual([]);
});
