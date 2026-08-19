// PHASE 3 — the architecture, generated from the code AND the master file.
//
// The founder's mock-first rule applied to code: the structure is drawn before it is built, and the
// drawing is GENERATED so it can never quietly disagree with what ships. It answers three questions
// a hand-drawn diagram cannot keep answering: what exists, what is proved, and what is still wrong.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = '/Users/palakjain/Vibe_Coding/finwise';
const OUT  = path.join(ROOT, 'docs/architecture/module-map.json');

const walk = (d, out = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p, out) : /\.(ts|tsx)$/.test(e.name) && out.push(p);
  }
  return out;
};

const MODULES = {
  'net-worth':   [/domain\/networth/, /domain\/assets/, /domain\/snapshot/, /domain\/history/, /NetWorthScreen/, /Itemize/],
  'performance': [/domain\/performance/, /domain\/bonds/, /domain\/alternatives/, /PerformanceScreen/, /HoldingDetail/, /LookBack/],
  'plan':        [/domain\/retirement/, /domain\/planning/, /domain\/decumulation/, /WhatIf/, /Plan[A-Z]/],
  'cash-flow':   [/domain\/income/, /domain\/budget/, /domain\/paycheck/, /domain\/transactions/, /domain\/cashflow/],
  'accounts':    [/services\/sync/, /domain\/import/, /AddAccount|ConnectFlow|ImportHoldings|AccountDetail/],
  'debt':        [/domain\/debt/, /Debt[A-Z]/],
  'goals':       [/domain\/goals/, /Goal[A-Z]/],
  'insights':    [/domain\/insights/, /domain\/gaps/, /domain\/completeness/, /milestones/],
  'setup':       [/onboarding/, /domain\/profile/],
  'calculation-module': [/Calculation Module code\/engines/],
  'foundation':  [/domain\/_shared/, /utils\//, /store\//, /services\/firebase/, /services\/marketData/, /services\/economicData/],
};
const moduleOf = (rel) => Object.entries(MODULES).find(([, p]) => p.some((x) => x.test(rel)))?.[0] ?? 'shared-ui';

// ── the code ────────────────────────────────────────────────────────────────────────────────────
const files = [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'Calculation Module code'))];
const mods = {};
for (const f of files) {
  const rel = path.relative(ROOT, f);
  const m = moduleOf(rel);
  (mods[m] ??= { source: 0, tests: 0, engines: [], deps: {} });
  /\.test\.|\/probes\//.test(rel) ? mods[m].tests++ : mods[m].source++;
  if (/engines\/[a-z]+\.ts$/.test(rel)) mods[m].engines.push(path.basename(rel, '.ts'));
  const src = fs.readFileSync(f, 'utf8');
  for (const imp of src.matchAll(/from '([./][^']*)'/g)) {
    const t = moduleOf(path.relative(ROOT, path.normalize(path.join(path.dirname(f), imp[1]))));
    if (t !== m) mods[m].deps[t] = (mods[m].deps[t] ?? 0) + 1;
  }
}

// ── the master file: what is documented, proved, and still wrong ────────────────────────────────
const py = `
import openpyxl, json, collections
ws = openpyxl.load_workbook("${ROOT}/Calculation Module/MoneyKeel-calculation-master-v1.xlsx")["2. Engines"]
h = {ws.cell(2,c).value: c for c in range(1, ws.max_column+1)}
out = collections.defaultdict(lambda: {"engines":0,"defects":0,"yourcall":0,"checked":0})
for r in range(3, ws.max_row+1):
    part = ws.cell(r, h["Part of the app"]).value
    if not part: continue
    st = ws.cell(r, h["How much we know"]).value
    d = out[part]; d["engines"] += 1
    if st in ("DEFECT","UNRESOLVED"): d["defects"] += 1
    elif st == "YOUR CALL": d["yourcall"] += 1
    elif st == "CHECKED vs REAL DATA": d["checked"] += 1
print(json.dumps(out))`;
const doc = JSON.parse(execSync(`python3 -c '${py.replace(/'/g, "'\\''")}'`).toString());

// map a module to the master file's "part of the app" wording
const PART = { 'net-worth': 'Net worth', performance: 'Performance', plan: 'Plan & retirement',
  'cash-flow': 'Cash flow', accounts: 'Accounts & connections', debt: 'Debt', goals: 'Goals',
  insights: 'Insights', setup: 'Setup', foundation: 'Foundation' };

const report = Object.entries(mods)
  .map(([m, v]) => ({
    module: m, source: v.source, tests: v.tests,
    engines: v.engines.sort(),
    dependsOn: Object.entries(v.deps).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => `${k}(${n})`),
    documented: doc[PART[m]]?.engines ?? 0,
    needsFix: doc[PART[m]]?.defects ?? 0,
    yourCall: doc[PART[m]]?.yourcall ?? 0,
  }))
  .sort((a, b) => (b.source + b.tests) - (a.source + a.tests));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString().slice(0, 10), modules: report }, null, 2));

console.log('MODULE                 SRC  TEST   DOCUMENTED  NEEDS FIX  YOUR CALL   DEPENDS ON');
for (const r of report) {
  console.log(`  ${r.module.padEnd(20)} ${String(r.source).padStart(3)}  ${String(r.tests).padStart(4)}` +
    `   ${String(r.documented).padStart(10)}  ${String(r.needsFix).padStart(9)}  ${String(r.yourCall).padStart(9)}   ${r.dependsOn.join(' ')}`);
}
console.log(`\n  written to ${path.relative(ROOT, OUT)}`);
