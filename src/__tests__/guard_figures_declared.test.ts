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
