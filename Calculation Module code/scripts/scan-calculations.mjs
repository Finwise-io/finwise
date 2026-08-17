// SCANS THE CODE FOR EVERY CALCULATION IN PHASE-1 SCOPE. Never hand-maintained.
//
// WHY THIS IS GENERATED AND NOT TYPED. Every mistake that cost time this week came from reading
// something that DESCRIBED the code instead of reading the code: the orphan-route guard was built
// too narrow three times, a route trace missed template-literal routes, a design file was labelled
// v4 when it was v3, and a persona's headline number survived four reviews because it looked
// plausible. A typed inventory would rot the same way. This reads the disk, because the disk is
// what ships.
//
// It emits the SKELETON only — name, module, file, line, signature, callers, screens. The columns a
// scanner cannot know (the formula, the variables, the derivation rule applied to raw data) are
// written by hand and then PROVED by a probe that executes the real function. A row is not
// documented until its probe passes.
//
// Usage:  node "Calculation Module code/scripts/scan-calculations.mjs"
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();
const DOMAIN = path.join(ROOT, 'src/domain');

// PHASE 1 SCOPE (founder-agreed 2026-08-16): Net worth, Performance, and the eight screens they
// open. Cash flow and Plan are deliberately excluded — they are separate surfaces with their own
// walkthroughs, and including them makes this the whole app again.
const SCOPE_SCREENS = [
  'NetWorthScreen', 'PerformanceScreen', 'AccountDetailScreen', 'HoldingDetailScreen',
  'AddAccountScreen', 'ConnectFlowScreen', 'ImportHoldingsScreen', 'ItemizeScreen',
  'LookBackScreen', 'WhatIfScreen',
];

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  if (e.isDirectory()) return walk(p);
  return e.name.endsWith('.ts') && !e.name.includes('.test.') ? [p] : [];
});

// ── every exported function in the domain, with where it lives ──────────────────────────────────
const defs = new Map();          // name -> { name, module, file, line, signature, returns }
for (const file of walk(DOMAIN)) {
  const rel = path.relative(ROOT, file);
  const mod = path.relative(DOMAIN, file).split(path.sep)[0].replace(/\.ts$/, '');
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((ln, i) => {
    // `export function name(args): Return {`  and  `export const name = (args): Return =>`
    const m = ln.match(/^export (?:async )?function (\w+)\s*(\([^;]*)/)
           || ln.match(/^export const (\w+)\s*=\s*(\([^;]*=>)/);
    if (!m) return;
    // the signature can run over several lines; take until the opening brace or arrow
    let sig = m[2];
    for (let j = i + 1; j < lines.length && !/[{=]>?\s*$/.test(sig) && j < i + 12; j++) sig += ' ' + lines[j].trim();
    sig = sig.replace(/\s+/g, ' ').replace(/\s*\{\s*$/, '').slice(0, 400);
    const ret = sig.match(/\)\s*:\s*([^={]+)/);
    defs.set(m[1], {
      name: m[1], module: mod, file: rel, line: i + 1, signature: `${m[1]}${sig}`,
      returns: (ret ? ret[1] : '').trim().replace(/\s*=>$/, '') || '(inferred)',
    });
  });
}

// ── what each screen in scope imports from the domain ───────────────────────────────────────────
const screenUses = new Map();    // fn name -> Set(screen)
for (const s of SCOPE_SCREENS) {
  const p = path.join(ROOT, 'src/screens', `${s}.tsx`);
  if (!fs.existsSync(p)) continue;
  const src = fs.readFileSync(p, 'utf8');
  for (const m of src.matchAll(/import \{([^}]+)\} from '(?:\.\.\/)+domain\/?([\w/]*)'/g)) {
    for (const raw of m[1].split(',')) {
      const n = raw.trim().split(' as ')[0].replace(/^type /, '').trim();
      if (n && defs.has(n)) (screenUses.get(n) ?? screenUses.set(n, new Set()).get(n)).add(s.replace('Screen', ''));
    }
  }
}

// ── walk INWARD: anything those functions call is also in scope ─────────────────────────────────
// A number a person sees is only as good as the numbers underneath it, so the intermediates count.
// THE BODY, BY BRACE MATCHING — not a fixed window.
// The first version took 120 lines from the definition and called it the body. For any function
// shorter than that it swallowed the NEXT few functions, and attributed their calls to it: the scan
// claimed loanPayment called creditUtilization, which it never does. A tool that reports confidently
// and is wrong is worse than no tool, so the body now ends where the function ends.
const fileCache = new Map();
const bodyOf = (d) => {
  if (!fileCache.has(d.file)) fileCache.set(d.file, fs.readFileSync(path.join(ROOT, d.file), 'utf8'));
  const src = fileCache.get(d.file);
  const lines = src.split('\n');
  const start = src.split('\n').slice(0, d.line - 1).join('\n').length + (d.line > 1 ? 1 : 0);
  // A single-expression arrow export has no braces at all (`export const volOf = (r) => clamp(...)`).
  // Returning '' for those would silently drop everything they call — under-capturing is the same
  // failure as over-capturing, just quieter. Take the statement up to its semicolon instead.
  const arrow = src.indexOf('=>', start);
  const brace = src.indexOf('{', start);
  if (brace < 0 || (arrow >= 0 && arrow < brace && src.slice(arrow, brace < 0 ? undefined : brace).includes(';'))) {
    const semi = src.indexOf(';', start);
    return semi < 0 ? '' : src.slice(start, semi + 1);
  }
  let i = brace;
  if (i < 0) return '';
  let depth = 0, j = i;
  for (; j < src.length; j++) {
    const c = src[j];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) break; }
  }
  return src.slice(i, j + 1);
};
const inScope = new Set(screenUses.keys());
const queue = [...inScope];
const calledBy = new Map();      // callee -> Set(caller)
while (queue.length) {
  const cur = queue.shift();
  const d = defs.get(cur);
  if (!d) continue;
  const body = bodyOf(d);
  for (const [name] of defs) {
    if (name === cur) continue;
    if (new RegExp(`\\b${name}\\s*\\(`).test(body)) {
      (calledBy.get(name) ?? calledBy.set(name, new Set()).get(name)).add(cur);
      if (!inScope.has(name)) { inScope.add(name); queue.push(name); }
    }
  }
}

// ── formatters are calculations too, but on their own tab so they do not drown the rest ─────────
const FORMATTER = /^(money|money2|moneyCompact|currencySymbol|round2|pct|fmt|label|txnLabel|spoken|masked|display|name|title|word|words|sentence|line|text)/i;
const isFormatter = (d) => FORMATTER.test(d.name) || /string$/i.test(d.returns);

const sha = execSync('git rev-parse --short HEAD').toString().trim();
const dirty = execSync('git status --porcelain').toString().trim().length > 0;

const rows = [...inScope].map((n) => defs.get(n)).filter(Boolean).map((d) => ({
  ...d,
  screens: [...(screenUses.get(d.name) ?? [])].sort().join(', '),
  calledBy: [...(calledBy.get(d.name) ?? [])].sort().join(', '),
  tab: isFormatter(d) ? 'helpers' : 'calculations',
})).sort((a, b) => a.module.localeCompare(b.module) || a.name.localeCompare(b.name));

const out = { generatedFrom: sha, treeDirty: dirty, generatedAt: null, scope: SCOPE_SCREENS, rows };
fs.writeFileSync(path.join(ROOT, 'Calculation Module code/scripts/inventory.json'), JSON.stringify(out, null, 2));

const calcs = rows.filter((r) => r.tab === 'calculations');
console.log(`commit ${sha}${dirty ? '  (WORKING TREE DIRTY — regenerate on a clean tree before trusting this)' : ''}`);
console.log(`${rows.length} in scope: ${calcs.length} calculations + ${rows.length - calcs.length} formatting helpers`);
console.log(`  reached directly by a screen: ${[...screenUses.keys()].length}`);
console.log(`  reached only as an intermediate: ${inScope.size - screenUses.size}`);
const byMod = {};
for (const r of calcs) byMod[r.module] = (byMod[r.module] || 0) + 1;
console.log('  by module: ' + Object.entries(byMod).sort((a, b) => b[1] - a[1]).map(([m, n]) => `${m} ${n}`).join(' · '));
