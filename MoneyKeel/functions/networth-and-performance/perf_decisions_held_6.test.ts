/** HIS DECISIONS, HELD IN THE CODE ITSELF — part 6 (PF-DECISIONS, 2026-10-21).
 *
 *  DEC-4642 was "TESTED" in the log only by comments that say the six functions were removed; no test failed if one
 *  came back. This one does. Every test is named by the decision it holds.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..', '..', '..');

/** every source file a screen can reach — the app, the doors, the engines — never a test */
function sources(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '__tests__' || e.name.startsWith('.')) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.|\.probe\./.test(e.name)) out.push(p);
    }
  };
  for (const d of ['src', path.join('MoneyKeel', 'functions'), path.join('Calculation Module code', 'engines')]) walk(path.join(ROOT, d));
  return out;
}
/** the source with its comments taken out — a comment that names a removed function is history, not code */
const code = (p: string) => fs.readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`\w])\/\/.*$/gm, '$1');

// ── DEC-4642 ─────────────────────────────────────────────────────────────────────────────────────────
// "3,4, 8-approved." Six functions no screen used were deleted, each replaced by one that is used, and their numbers
// are retired, never reused: MK-PF-F-003 avgCost, MK-PF-F-016 attribution, MK-PF-F-017 allocation,
// MK-PF-F-018 portfolioTrend, MK-PF-F-019 portfolioPeriodReturn, MK-PF-F-021 periodDollarDelta.
const GONE: [string, string][] = [
  ['MK-PF-F-003', 'avgCost'], ['MK-PF-F-016', 'attribution'], ['MK-PF-F-017', 'allocation'],
  ['MK-PF-F-018', 'portfolioTrend'], ['MK-PF-F-019', 'portfolioPeriodReturn'], ['MK-PF-F-021', 'periodDollarDelta'],
];

test('DEC-4642 — the six removed Performance functions are defined nowhere a screen can reach, and nothing calls them', () => {
  const files = sources();
  expect(files.length).toBeGreaterThanOrEqual(200);                 // the guard proves it looked: 232 files on 2026-10-21, the whole app
  const back: string[] = [];
  for (const f of files) {
    const src = code(f);
    for (const [, name] of GONE) {
      // a function of that name, or one exported under it — a local variable that happens to share a common word is not it
      const defined = new RegExp(`\\b(function\\s+${name}\\s*[(<]|export\\s+(?:const|let|var)\\s+${name}\\s*[=:])`);
      const called = new RegExp(`(^|[^\\w.'"\`])${name}\\s*\\(`);
      if (defined.test(src) || called.test(src)) back.push(`${path.relative(ROOT, f)}: ${name}`);
    }
  }
  expect(back).toEqual([]);
});

test('DEC-4642 — their numbers are retired in the function register and never issued again', () => {
  const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'Calculation Module code', 'scripts', 'moneykeel_function_register.json'), 'utf8'));
  const retired = JSON.stringify(reg.retired ?? {});
  const issued = JSON.stringify(reg.issued ?? {});
  expect(retired.length).toBeGreaterThan(100);                      // the register was read, not an empty object
  for (const [id, name] of GONE) {
    expect(`${id}: ${new RegExp(`"${id}":\\s*"${name}\\b`).test(retired)}`).toBe(`${id}: true`);
    expect(`${id} issued: ${new RegExp(`"${id}"`).test(issued)}`).toBe(`${id} issued: false`);
  }
});
