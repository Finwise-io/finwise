/** NO FILE BUILT FOR HIM EVER ASKS ABOUT A DECISION HE HAS ALREADY SUPERSEDED.
 *
 *  Founder, 2026-09-30, opening the wording-asks file: *"decision log-ask-v01 still has DEC004. Have
 *  you update the file?"* He was right. DEC-0004 — the Spending tab, which his Expenses-tab decision
 *  (DEC-0440) replaced — was marked OLD in the decision log and still had a row on the asks file
 *  asking him to confirm its wording. So did DEC-0037 (SnapTrade, replaced by DEC-0038 for Plaid).
 *  The launch answer list carried both as well.
 *
 *  The cause was the same in every builder: they selected rows on CONFIDENCE and never read whether
 *  the decision is still in force. It is the PFS failure in miniature — the ruling reached the
 *  decision log and not the files built beside it. And it is not merely wasted time: an answer from
 *  him to a superseded row would rule a dead decision back into life.
 *
 *  This guard reads the FILES THEMSELVES, as he opens them, and states how many rows it read.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const DECISIONS = path.join(ROOT, 'Calculation Module code', 'scripts', 'moneykeel_decisions.json');

/** The files that put decisions in front of him, and the sheets that carry the rows. */
const FILES = [
  { file: 'MoneyKeel/documents/decision-log/moneykeel_log_wording-asks_v01.xlsx', sheets: ['Wording asks'] },
  { file: 'MoneyKeel/documents/other/moneykeel_calc_plan_launch-answer-list_v01.xlsx',
    sheets: ['EVERYTHING', 'Net worth', 'Cash flow', 'Performance'] },
];

const superseded = (): string[] => {
  const rows = JSON.parse(fs.readFileSync(DECISIONS, 'utf8')).rows as any[];
  return rows
    .filter((r) => String(r.in_use ?? '').includes('OLD') || String(r.status ?? '') === 'SUPERSEDED')
    .map((r) => r.id as string);
};

/** Every cell of every named sheet, as text. */
const cellsOf = (file: string, sheets: string[]): string[] => {
  const XLSX = require('xlsx');
  const wb = XLSX.readFile(path.join(ROOT, file));
  const out: string[] = [];
  for (const name of sheets) {
    const ws = wb.Sheets[name];
    if (!ws) throw new Error(`${file} has no sheet "${name}" — the guard is reading the wrong file`);
    for (const row of XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }) as any[][]) {
      for (const cell of row ?? []) if (cell != null) out.push(String(cell));
    }
  }
  return out;
};

test('no file built for the founder asks about a decision he has superseded', () => {
  const dead = superseded();
  expect(dead.length).toBeGreaterThanOrEqual(1);          // it read the ledger, not an empty list

  const offences: string[] = [];
  let cellsRead = 0;
  for (const { file, sheets } of FILES) {
    const cells = cellsOf(file, sheets);
    cellsRead += cells.length;
    for (const id of dead) {
      // an identifier standing alone in a cell, or listed among others, is being ASKED about
      const hit = cells.find((c) => new RegExp(`\\b${id}\\b`).test(c));
      if (hit) offences.push(`${path.basename(file)} still asks about ${id} — "${hit.slice(0, 90)}"`);
    }
  }
  // A GUARD MUST PROVE IT LOOKED: without this the whole test passes on two empty workbooks.
  expect(cellsRead).toBeGreaterThanOrEqual(300);
  expect(offences).toEqual([]);
});
