// BUILD THE BENCH — bundle the REAL engines for the browser and inline them into one HTML file
// the founder double-clicks. No server, no app build, no simulator.
//
//   entry    bench/bench-entry.ts          (imports the actual engine modules — never copies)
//   shell    bench/bench-template.html     (the typed-input interface)
//   output   bench/MoneyKeel-engine-bench.html
//
// The output embeds the REAL Vanguard ledger as a preset when the local file exists, so it is
// GITIGNORED — real statements never reach git (the standing rule for real-downloads applies to
// anything built from them).
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import esbuild from 'esbuild';

const ROOT = '/Users/palakjain/Vibe_Coding/finwise';
const BENCH = path.join(ROOT, 'Calculation Module code/bench');
const OUT = path.join(BENCH, 'MoneyKeel-engine-bench.html');

// ── the Vanguard preset, read from the real download when present ───────────────────────────────
const VG_FILE = path.join(ROOT, 'Calculation Module/real-downloads/tes-vk.csv');
let vgLines = '';
if (fs.existsSync(VG_FILE)) {
  const lines = fs.readFileSync(VG_FILE, 'utf8').split('\n').map((l) => l.split(','));
  const txStart = lines.findIndex((l) => l[1] === 'Trade Date');
  vgLines = lines.slice(txStart + 1)
    .filter((l) => l.length > 11 && l[3])
    .map((l) => `${l[3]} | ${l[4]} | ${l[11]}`)
    .join('\n');
}

// ── bundle the engines ──────────────────────────────────────────────────────────────────────────
const result = await esbuild.build({
  entryPoints: [path.join(BENCH, 'bench-entry.ts')],
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  define: { __VANGUARD_LEDGER__: JSON.stringify(vgLines) },
  logLevel: 'silent',
});
const bundle = result.outputFiles[0].text;

// ── inline into the shell ───────────────────────────────────────────────────────────────────────
const sha = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
const dirty = execSync('git status --porcelain', { cwd: ROOT }).toString().trim() ? ' (uncommitted changes)' : '';
let html = fs.readFileSync(path.join(BENCH, 'bench-template.html'), 'utf8');
html = html.replace('__BUILT_STAMP__', `${new Date().toISOString().slice(0, 10)} from commit ${sha}${dirty}`);
html = html.replace('/*__BUNDLE__*/', () => bundle);
fs.writeFileSync(OUT, html);

console.log(`bench built: ${path.relative(ROOT, OUT)}`);
console.log(`  bundle ${(bundle.length / 1024).toFixed(0)} KB · Vanguard preset ${vgLines ? 'embedded (' + vgLines.split('\n').length + ' rows)' : 'absent'} · commit ${sha}${dirty}`);
