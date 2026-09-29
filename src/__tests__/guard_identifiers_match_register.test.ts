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
  for (const dir of ['MoneyKeel/functions', 'src']) {
    for (const file of walk(path.join(ROOT, dir))) {
      const text = fs.readFileSync(file, 'utf8');
      for (const m of text.matchAll(/(MK-[A-Z]{2}-[OF]-\d{3})\s+([A-Za-z][A-Za-z0-9_]*)\b/g)) {
        const [, claimed, name] = m;
        const real = issued[name];
        if (real && real !== claimed) {
          offences.push(`${path.relative(ROOT, file)} calls ${name} ${claimed} — the register issued ${real}`);
        }
      }
    }
  }
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
