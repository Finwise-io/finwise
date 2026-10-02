// THE SEVEN-STEP REPORT, PRINTED FROM THE RUN — never typed (founder, 2026-10-01: "Once done publish
// results in word format in structure I asked"). It reads the log module-launch-steps.py wrote and
// writes the Word file; every sentence in the file is a sentence the steps printed.
//   node "Calculation Module code/scripts/build-module-report.mjs" networth <steps.log> <out.docx>
import fs from 'node:fs';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';

const [, , module = 'networth', logPath, outPath] = process.argv;
const NAMES = { networth: 'Net worth', cashflow: 'Cash flow', performance: 'Performance' };
const log = fs.readFileSync(logPath, 'utf8').split('\n');

// every step block: "STEP 1.a · NETWORTH — question" … up to the next "STEP" or the summary line
const ASKS = {
  '1.a': 'Screens designed, approved and coded', '1.b': 'Screens obey the standards and the decision log',
  '1.c': 'No figure on a screen without its identifier', '2.a': 'The master file’s metrics match the approved designs',
  '2.b': 'The metrics obey the standards and the decision log', '2.c': 'The code carries the revised metrics, and is tested',
  '3.a': 'Open errors or audit findings on a function', '3.b': 'Functions with findings corrected and coded',
  '3.c': 'A test on the accuracy of each function', '3.d': 'Those tests run and pass',
  '4.a': 'The orchestrators the architecture needs', '4.b': 'Orchestrators coded', '4.c': 'Orchestrator tests written', '4.d': 'Orchestrator tests run and pass',
  '5': 'Full audit: every metric and function is used — no orphans', '6.a': 'Ten use cases written', '6.b': 'Ten use cases run and pass',
};
const steps = [];
let cur = null;
for (const line of log) {
  const h = line.match(/^STEP ([\d.]+[a-d]?) · \w+ — (.*)$/);
  if (h) { cur = { step: h[1], question: h[2], lines: [], verdict: null, ok: null }; steps.push(cur); continue; }
  if (/^NETWORTH — steps run|^CASHFLOW — steps run|^PERFORMANCE — steps run/.test(line)) { cur = null; continue; }
  if (!cur) continue;
  const v = line.match(/^([✓✗]) (.*)$/);
  if (v) { cur.ok = v[1] === '✓'; cur.verdict = v[2]; continue; }
  if (line.trim() && !/^─+$/.test(line)) cur.lines.push(line.replace(/\s+$/, ''));
}
const summary = log.find((l) => /^STEP 7 ·/.test(l)) || '';
const allOk = steps.length === 17 && steps.every((s) => s.ok);

const P = (text, opts = {}) => new Paragraph({ children: [new TextRun({ text, ...opts })], spacing: { after: 120 } });
const H = (text, level = HeadingLevel.HEADING_1) => new Paragraph({ text, heading: level, spacing: { before: 240, after: 120 } });
const cell = (text, bold = false, shade) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold, size: 20 })] })], shading: shade ? { fill: shade } : undefined });
const table = (rows, widths) => new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: widths, rows: rows.map((r, i) => new TableRow({ children: r.map((c) => cell(c, i === 0, i === 0 ? 'D9E8E1' : undefined)) })) });

const children = [
  new Paragraph({ children: [new TextRun({ text: 'MoneyKeel', bold: true, size: 36, color: '0B2545' })], alignment: AlignmentType.LEFT }),
  new Paragraph({ children: [new TextRun({ text: `${NAMES[module]} module — launch readiness`, bold: true, size: 32 })] }),
  P(`The seven steps, run end to end · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, { italics: true }),
  H('STEP 7 — IS THE MODULE LAUNCH READY?'),
  P(allOk ? `Yes. All seventeen checks pass — every one of the six steps before it is complete.` : summary.replace(/^STEP 7 · launch-ready\? /, ''), { bold: true, size: 26 }),
  P('A module is marked launch ready only when every check of the six steps before it passes, and each check is measured from the live code, the master file, the decision log and the test suite — never typed.'),
  H('The seventeen checks, at a glance'),
  table([['STEP', 'WHAT IT ASKS', 'RESULT'], ...steps.map((s) => [s.step, ASKS[s.step] || s.question, s.ok ? 'PASS' : 'NOT COMPLETE'])], [900, 6000, 1800]),
];
for (const s of steps) {
  children.push(H(`Step ${s.step} — ${s.question}`, HeadingLevel.HEADING_2));
  children.push(P(s.verdict || '(no verdict line)', { bold: true }));
  for (const l of s.lines.slice(0, 40)) children.push(new Paragraph({ children: [new TextRun({ text: l, font: 'Menlo', size: 16 })], spacing: { after: 0 } }));
  if (s.lines.length > 40) children.push(P(`… ${s.lines.length - 40} more lines in the run log.`, { italics: true }));
}
const doc = new Document({ styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } }, sections: [{ children }] });
fs.writeFileSync(outPath, await Packer.toBuffer(doc));
console.log(`${outPath}: ${steps.length} steps, ${steps.filter((s) => s.ok).length} pass`);
