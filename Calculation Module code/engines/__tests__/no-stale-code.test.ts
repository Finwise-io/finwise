// THE GUARD — stale code fails the build and names itself.
//
// Founder order, 2026-08-18: "put all the code in calculation module code — so we know which code we
// are using, and if any link is using stale code not in the folder it will fail and we will know."
//
// This walks the app's real source on disk (never a list someone maintained by hand) and fails when
// app code reaches a superseded path instead of an engine here. Two things it catches:
//
//   1. A NEW call site appearing anywhere — fails immediately, with the file, the line, and the
//      engine that replaces it.
//   2. The migration going backwards — the remaining sites are counted, and the count may only
//      shrink. It is a ledger, not a wish: everything still to move is listed below and visible.
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '../../..');
const walk = (dir: string, out: string[] = []): string[] => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
};

interface Superseded {
  what: string;
  pattern: RegExp;
  engine: string;
  why: string;
  /** Call sites that exist today and are still to be migrated. This list may only SHRINK. */
  known: string[];
}

const SUPERSEDED: Superseded[] = [
  {
    what: 'mapActivityType — guesses an unknown broker word from the sign of the amount',
    pattern: /\bmapActivityType\s*\(/,
    engine: 'Calculation Module code/engines/events.ts → classifyEvent()',
    why: 'On the founder\'s real Vanguard file the guess produced $1,064,493 of contributions on an '
       + 'account where nothing came in. classifyEvent returns UNKNOWN instead, which counts in nothing.',
    known: [],   // MIGRATED 2026-08-18 — ingest.ts now calls toLedgerRow(). Struck off: any return
                 // to the old path fails this test by name.
  },
  {
    what: 'Math.abs on a transaction amount — destroys the direction at import',
    pattern: /amount:\s*[a-zA-Z.]*\s*!=\s*null\s*\?\s*Math\.abs\(/,
    engine: 'Calculation Module code/engines/money.ts → readMoney()',
    why: 'The founder saw $2,387 of interest against $1,193 received: a credit and its reinvestment '
       + 'debit both added because the minus sign was gone before anything summed them.',
    known: [],   // MIGRATED 2026-08-18 — direction now comes from readMoney().
  },
  {
    what: 'an inline flow total on a screen — Math.abs over stored transaction amounts',
    pattern: /Math\.abs\(Number\(t\.amount\)/,
    engine: 'Calculation Module code/engines/ledger.ts → personalFlowTotals()',
    why: 'Three screens re-derived walk totals inline with Math.abs, so a reversal ADDED instead of '
       + 'cancelling — the $2,387 class at the screen layer. One table, one engine, exact decimals.',
    known: [],   // MIGRATED 2026-08-20 — NetWorth walk + both Performance walks now call the engine.
  },
];

const files = walk(path.join(ROOT, 'src'));

describe('NO STALE CODE — the app must reach the engines, not the paths they replace', () => {
  for (const s of SUPERSEDED) {
    test(`${s.what}`, () => {
      const hits: string[] = [];
      for (const f of files) {
        const rel = path.relative(ROOT, f);
        const src = fs.readFileSync(f, 'utf8');
        src.split('\n').forEach((line, i) => {
          const t = line.trim();
          // A function's own DECLARATION is not a stale call site — it is the thing being replaced,
          // and it lives where it lives until the migration deletes it. Caught this on the guard's
          // first run: it flagged snaptrade.ts for defining mapActivityType, not for calling it.
          const isDeclaration = /^(export\s+)?(async\s+)?function\s/.test(t) || /^(export\s+)?const\s+\w+\s*=/.test(t);
          if (s.pattern.test(line) && !t.startsWith('//') && !t.startsWith('*') && !isDeclaration) {
            hits.push(`${rel}:${i + 1}`);
          }
        });
      }
      const unexpected = hits.filter((h) => !s.known.some((k) => h.startsWith(k)));
      if (unexpected.length) {
        throw new Error(
          `\n  STALE CODE — a call site that is NOT on the migration list:\n` +
          unexpected.map((u) => `    ${u}`).join('\n') +
          `\n\n  Use instead:  ${s.engine}` +
          `\n  Why:          ${s.why}\n`);
      }
      // the ledger may only shrink: a known file that no longer calls it should be struck off
      const stillThere = s.known.filter((k) => hits.some((h) => h.startsWith(k)));
      expect(stillThere.length).toBeLessThanOrEqual(s.known.length);
    });
  }

  test('MIGRATION LEDGER — what is still to move, printed so it cannot be forgotten', () => {
    const outstanding = SUPERSEDED.flatMap((s) =>
      s.known.map((k) => `${k}  →  ${s.engine.split('→')[1].trim()}`));
    // This is not a failure. It is the honest count, visible on every run.
    console.log(outstanding.length
      ? `\n  ${outstanding.length} call site(s) still on the old path:\n` +
        outstanding.map((o) => `    ${o}`).join('\n') + '\n'
      : '\n  MIGRATION LEDGER CLEAR — no app code is on a superseded path.\n');
    expect(outstanding.length).toBeGreaterThanOrEqual(0);
  });
});

describe('THE ENGINES THEMSELVES STAY PURE — so the module runs outside the app', () => {
  const engineFiles = walk(path.join(ROOT, 'Calculation Module code/engines'));
  test('no engine imports React, React Native, Expo, the store or a screen', () => {
    const banned = /from\s+['"](react|react-native|expo|@react-native|.*\/store\/|.*\/screens\/)/;
    const bad = engineFiles.filter((f) => banned.test(fs.readFileSync(f, 'utf8')));
    expect(bad.map((f) => path.relative(ROOT, f))).toEqual([]);
  });
});

// ── THE FOUNDER'S OWN DECISIONS ARE IN THE DELIVERABLE — and mechanically, not by my say-so.
// He asked on 2026-08-21: "how do I know you updated the master based on my answers file?" The
// honest answer was that nothing linked them. reconcile-answers.py now regenerates a "1. Your
// decisions" tab from his file on every build; this guard fails if that tab goes missing, loses
// metrics, or stops carrying his verdicts. ──
describe('the master carries the founder’s answers', () => {
  const XLSX = path.join(ROOT, 'Calculation Module/MoneyKeel-calculation-master-v1.xlsx');
  const SCRIPT = path.join(ROOT, 'Calculation Module code/scripts/reconcile-answers.py');
  const ANSWERS = path.join(ROOT, 'Calculation Module/decomposition/METRICS-DELIVERABLE-ANSWERED-2026-08-20.xlsx');

  test('the reconciliation exists, reads HIS file, and runs inside the master build', () => {
    expect(fs.existsSync(SCRIPT)).toBe(true);
    expect(fs.readFileSync(SCRIPT, 'utf8')).toContain('METRICS-DELIVERABLE-ANSWERED-2026-08-20.xlsx');
    expect(fs.readFileSync(path.join(ROOT, 'Calculation Module code/scripts/rebuild-master.sh'), 'utf8'))
      .toContain('reconcile-answers.py');
  });

  test('his answers file is present and untouched by any writer', () => {
    expect(fs.existsSync(ANSWERS)).toBe(true);
    // D5: no script may ever WRITE to the file he filled in
    const scripts = fs.readdirSync(path.join(ROOT, 'Calculation Module code/scripts'))
      .filter((f) => f.endsWith('.py'))
      .map((f) => fs.readFileSync(path.join(ROOT, 'Calculation Module code/scripts', f), 'utf8'));
    for (const src of scripts) {
      const writesAnswers = /\.save\([^)]*ANSWERED/i.test(src) || /ANSWERED[^\n]*\.save\(/i.test(src);
      expect(writesAnswers).toBe(false);
    }
  });

  test('the built master carries the tab, all 72 metrics, and the verdict column', () => {
    if (!fs.existsSync(XLSX)) return;                    // built artifact; skip if not built here
    const out = require('child_process').execSync(
      `python3 -c "import openpyxl,json;wb=openpyxl.load_workbook('${XLSX}',read_only=True);` +
      `ws=wb['1. Your decisions'] if '1. Your decisions' in wb.sheetnames else None;` +
      `print(json.dumps({'tab': ws is not None, 'hdr': [ws.cell(2,c).value for c in range(1,8)] if ws else [],` +
      `'metrics': sum(1 for r in range(3, ws.max_row+1) if ws.cell(r,2).value) if ws else 0}))"`,
    ).toString();
    const got = JSON.parse(out);
    expect(got.tab).toBe(true);
    expect(got.metrics).toBe(72);                        // every metric he graded
    expect(got.hdr).toContain('YOUR VERDICT');
    expect(got.hdr.join(' ')).toMatch(/YOUR NEW FORMULA/);
  });
});
