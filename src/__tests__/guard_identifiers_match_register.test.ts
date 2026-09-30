/** WHAT THE CODE SAYS AN IDENTIFIER IS, AND WHAT THE REGISTER ISSUED, ARE THE SAME THING.
 *
 *  WHY (2026-09-28). I wrote the identifiers into the doors' prose by hand — "THE DOOR for Q-NW-4,
 *  MK-NW-O-001" — and the register issued different ones. 26 references across 20 files named numbers
 *  that had never been issued to those functions. Nothing caught it: the generated headers are
 *  rewritten from the register on every build and so always agreed, while the prose beside them
 *  quietly did not.
 *
 *  Two faults sat underneath it, both now fixed and both worth remembering:
 *    · the ORCHESTRATOR marker was written as a plain block comment, which the header generator owns
 *      and overwrites — so all twelve doors lost it on the first build and two were typed F, not O;
 *    · the register is keyed by NAME, so renaming a function minted a NEW number and stranded the old
 *      one on a dead name. A rename is recorded now, and the number follows the function.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const REGISTER = path.join(ROOT, 'Calculation Module code', 'scripts', 'moneykeel_function_register.json');

const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  const p = path.join(dir, d.name);
  if (d.isDirectory()) return d.name === 'node_modules' ? [] : walk(p);
  return /\.tsx?$/.test(d.name) ? [p] : [];
});

test('every "MK-…-… name" in the code names the identifier the register issued', () => {
  const reg = JSON.parse(fs.readFileSync(REGISTER, 'utf8'));
  const issued: Record<string, string> = reg.issued;
  const offences: string[] = [];
  let seen = 0;
  for (const dir of ['MoneyKeel/functions', 'src']) {
    for (const file of walk(path.join(ROOT, dir))) {
      const text = fs.readFileSync(file, 'utf8');
      for (const m of text.matchAll(/(MK-[A-Z]{2}-[OF]-\d{3})\s+([A-Za-z][A-Za-z0-9_]*)\b/g)) {
        const [, claimed, name] = m;
        const real = issued[name];
        seen++;
        if (real && real !== claimed) {
          offences.push(`${path.relative(ROOT, file)} calls ${name} ${claimed} — the register issued ${real}`);
        }
      }
    }
  }
  // A GUARD MUST PROVE IT LOOKED (standing order). This one passes on an empty sweep, so it says how
  // many identifier-and-name pairs it actually read. If the walk stops finding files, it goes red.
  expect(seen).toBeGreaterThanOrEqual(600);
  expect([...new Set(offences)]).toEqual([]);
});

/** THE SHAPE THE TEST ABOVE CANNOT SEE (2026-09-30).
 *
 *  It matches an identifier followed by a NAME. A function's own doc header writes the identifier
 *  followed by a MIDDLE DOT — `MK-NW-F-090 · The first day of a window` — so a header claiming a
 *  number that belongs to a different function is invisible to it. That is how three of mine got in
 *  on one afternoon: windowStartKey, pricedGainOf and investmentAccountIdsOf were written by hand as
 *  MK-PF-F-031/032/033, which are three OTHER live functions in src/domain/performance. Only the one
 *  reference that happened to be followed by a name was caught; the three headers were not.
 *
 *  So this reads every doc block that opens with an identifier and pairs it with the function
 *  declared underneath it.
 */
test('a doc header claims the number the register issued to the function beneath it', () => {
  const reg = JSON.parse(fs.readFileSync(REGISTER, 'utf8'));
  const issued: Record<string, string> = reg.issued;
  const offences: string[] = [];
  let pairs = 0;
  for (const dir of ['MoneyKeel/functions', 'src', 'Calculation Module code/engines']) {
    for (const file of walk(path.join(ROOT, dir))) {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      for (let i = 0; i < lines.length; i++) {
        const head = lines[i].match(/^\s*\/\*[*\s\u2500-]*(MK-[A-Z]{2}-[OF]-\d{3})\b/);
        if (!head) continue;
        // the first function declared after this header, within the block it heads
        let name: string | null = null;
        for (let j = i + 1; j < Math.min(i + 60, lines.length); j++) {
          const d = lines[j].match(/^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z][A-Za-z0-9_]*)/)
            ?? lines[j].match(/^\s*(?:export\s+)?const\s+([A-Za-z][A-Za-z0-9_]*)\s*[:=]\s*(?:\([^)]*\)|async)/);
          if (d) { name = d[1]; break; }
          if (/^\s*(?:export\s+)?(?:interface|type|class)\s/.test(lines[j])) break;
        }
        if (!name) continue;
        const real = issued[name];
        if (!real) continue;                       // not in the register: another guard's business
        pairs++;
        if (real !== head[1]) {
          offences.push(`${path.relative(ROOT, file)}:${i + 1} — the header over ${name} says ${head[1]}, `
            + `but the register issued ${real} to it (and ${head[1]} belongs to something else)`);
        }
      }
    }
  }
  expect(pairs).toBeGreaterThanOrEqual(400);       // it read this many headers, not zero
  expect([...new Set(offences)]).toEqual([]);
});

test('a renamed function keeps its number, and the old name is gone', () => {
  const reg = JSON.parse(fs.readFileSync(REGISTER, 'utf8'));
  for (const [was, now] of Object.entries(reg.renamed ?? {})) {
    expect(reg.issued[was]).toBeUndefined();      // the dead name holds nothing
    expect(reg.issued[now as string]).toBeTruthy();  // and the live one holds the number
  }
});

test('every door is typed O — an orchestrator is identifiable at a glance', () => {
  const reg = JSON.parse(fs.readFileSync(REGISTER, 'utf8'));
  const doors = ['basePay', 'incomeSummary', 'thisMonth', 'expenses', 'theMonth', 'theContributionRoom',
    'theCreditLine', 'theTaxOrganizer', 'whatsComing', 'theBonds', 'theAccount', 'theNetWorth',
    'theEmergencyFund', 'theHolding', 'theAlternativesOutlook', 'thePerformance', 'theLookBack'];
  const wrong = doors.filter((d) => !String(reg.issued[d] ?? '').includes('-O-'));
  expect(wrong.map((d) => `${d} is ${reg.issued[d]} — a door must be type O (founder ruling, 2026-08-27)`)).toEqual([]);
});
