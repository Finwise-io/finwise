// Founder ruling 2026-09-08 (second verification, G17 / C2): ONE simulation count — 1,000 —
// behind every surface, and the function's own default equal to it. Before this, will-it-last ran
// 1,000, the snapshot 500, the paycheck 300 and the cockpit's scenarios 400, while every screen
// and the glossary said 1,000. This guard reads the source and fails on any other number.
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..');
const RULED = 1000;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) { if (name !== '__tests__' && name !== 'node_modules') walk(p, out); }
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

test('every simulation caller and the function default use 1,000 paths (MK-PL-F-050, MK-XS-M-002)', () => {
  const offenders: string[] = [];
  for (const file of walk(ROOT)) {
    const src = fs.readFileSync(file, 'utf8');
    const re = /paths(?:\s*:\s*|\s*\?\?\s*|\s*=\s*inp\.paths\s*\(or\s*|\s*is missing it uses\s*)(\d[\d_,]*)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      const n = Number(m[1].replace(/[_,]/g, ''));
      if (n !== RULED) offenders.push(`${path.relative(ROOT, file)}: paths ${n}`);
    }
  }
  expect(offenders).toEqual([]);
});
