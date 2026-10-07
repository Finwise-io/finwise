/* A STANDARD THAT NAMES SOMETHING THAT IS GONE IS OUT OF DATE (founder, 2026-10-07, DEC-2634: "I do not
 * want to end up in mess like before where files are outdated ... two files disagree with each other").
 *
 * Every standard in MoneyKeel/documents/standards names the functions it governs by identifier and the
 * files that hold them by path. This reads every one and checks each against the register and the disk.
 * A GUARD MUST PROVE IT LOOKED: it asserts how many standards, identifiers and paths it read.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const STANDARDS = path.join(ROOT, 'MoneyKeel', 'documents', 'standards');
const register = JSON.parse(fs.readFileSync(path.join(ROOT, 'Calculation Module code/scripts/moneykeel_function_register.json'), 'utf8'));
const issued = new Set<string>(Object.values(register.issued as Record<string, string>));
const retired = new Set<string>(Object.keys(register.retired ?? {}));
const files = fs.readdirSync(STANDARDS).filter((f) => f.endsWith('.md') && f.startsWith('moneykeel_'));

test('the guard looked: every standard was read', () => {
  expect(files.length).toBeGreaterThanOrEqual(10);
});

test('every function identifier a standard names is issued and live', () => {
  const offences: string[] = [];
  let seen = 0;
  for (const f of files) {
    const lines = fs.readFileSync(path.join(STANDARDS, f), 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const id of line.match(/MK-[A-Z]{2}-[OF]-\d{3}/g) ?? []) {
        seen += 1;
        // a row that says in words that the thing is planned may name the identifier it will get
        if (/\bplanned\b|\bnot yet built\b|\bwill (get|move|be)\b|\bmove behind\b/i.test(line)) continue;
        if (retired.has(id)) offences.push(`${f}:${i + 1} names ${id}, which is RETIRED`);
        else if (!issued.has(id)) offences.push(`${f}:${i + 1} names ${id}, which is not in the register`);
      }
    });
  }
  expect(seen).toBeGreaterThanOrEqual(30);
  expect(offences).toEqual([]);
});

test('every repository path a standard names exists', () => {
  const offences: string[] = [];
  let seen = 0;
  for (const f of files) {
    const lines = fs.readFileSync(path.join(STANDARDS, f), 'utf8').split('\n');
    lines.forEach((line, i) => {
      // a path in backticks: starts at a known top folder, has a slash, ends in a file extension
      for (const m of line.matchAll(/`((?:src|app|docs|MoneyKeel|Calculation Module code|scripts)\/[^`*?<>]+?\.(?:ts|tsx|md|json|html|xlsx|py|sh|mjs))`/g)) {
        seen += 1;
        // an archived file is named by what it was called; "(v03 archived)" style mentions skip
        if (/archived|retired|deleted|was called|used to be|renamed|\bplanned\b/i.test(line)) continue;
        if (!fs.existsSync(path.join(ROOT, m[1]))) offences.push(`${f}:${i + 1} names ${m[1]}, which is not on disk`);
      }
    });
  }
  expect(seen).toBeGreaterThanOrEqual(40);
  expect(offences).toEqual([]);
});
