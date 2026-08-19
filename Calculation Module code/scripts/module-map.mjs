// Reads the codebase off disk and reports what a module-first structure would actually contain.
// Generated, never typed: the disk is what ships.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/Users/palakjain/Vibe_Coding/finwise';
const walk = (d, out = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p, out) : /\.(ts|tsx)$/.test(e.name) && out.push(p);
  }
  return out;
};

// The MODULES a person would name — what the app does, not how the code is filed.
const MODULES = {
  'net-worth':      [/networth/i, /assets/i, /snapshot/i, /NetWorthScreen/, /Itemize/, /uberGroup/],
  'performance':    [/performance/i, /PerformanceScreen/, /HoldingDetail/, /LookBack/, /bonds/i, /alternatives/i],
  'accounts-and-connections': [/services\/sync/, /AddAccount|ConnectFlow|ImportHoldings|AccountDetail/, /domain\/import/],
  'plan-and-retirement': [/retirement/i, /planning/i, /decumulation/i, /WhatIf/, /Plan[A-Z]/],
  'cash-flow':      [/cashflow/i, /budget/i, /income/i, /paycheck/i, /transactions/i, /Money[A-Z]|Activity|Budget/],
  'debt':           [/domain\/debt/, /Debt[A-Z]/],
  'goals':          [/domain\/goals/, /Goal[A-Z]/],
  'setup':          [/onboarding/i, /Onboarding/],
  'insights':       [/insights/i, /completeness/i, /gaps/i, /milestones/i, /Insight/],
  'foundation':     [/_shared/, /utils\//, /store\//, /theme/, /services\/firebase/],
};

const files = walk(path.join(ROOT, 'src'));
const assign = (f) => {
  const rel = path.relative(ROOT, f);
  for (const [m, pats] of Object.entries(MODULES)) if (pats.some((p) => p.test(rel))) return m;
  return 'unassigned';
};

const byModule = {};
for (const f of files) {
  const m = assign(f);
  const rel = path.relative(ROOT, f);
  (byModule[m] ??= { src: [], test: [] })[/\.test\./.test(rel) ? 'test' : 'src'].push(rel);
}

console.log('MODULE                        SOURCE  TESTS   TOTAL');
let ts = 0, tt = 0;
for (const [m, v] of Object.entries(byModule).sort((a, b) => (b[1].src.length + b[1].test.length) - (a[1].src.length + a[1].test.length))) {
  console.log(`  ${m.padEnd(28)} ${String(v.src.length).padStart(4)}   ${String(v.test.length).padStart(4)}   ${String(v.src.length + v.test.length).padStart(4)}`);
  ts += v.src.length; tt += v.test.length;
}
console.log(`  ${'TOTAL'.padEnd(28)} ${String(ts).padStart(4)}   ${String(tt).padStart(4)}   ${String(ts + tt).padStart(4)}`);
if (byModule.unassigned?.src.length) {
  console.log(`\n  UNASSIGNED (${byModule.unassigned.src.length}) — would need a home:`);
  byModule.unassigned.src.slice(0, 12).forEach((f) => console.log(`    ${f}`));
}
