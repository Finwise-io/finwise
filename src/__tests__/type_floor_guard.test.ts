// TYPE-FLOOR RATCHET (design audit 2026-07-16, approved by the founder): no text in the app may
// render below 11pt — the scale's smallest step (the tab-bar labels sat at 10.5 until 2026-10-27, and moved onto it). Every
// P0 in the audit was some flavor of "essential text at 6-10pt gray"; this guard makes the whole
// class unrepresentable. Same philosophy as a11y_guard: scan source, fail on regression.
// (kickers, footnotes and the tab-bar labels sit at 11; body 13+; money 15-17+.)
import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..');

function walk(d: string): string[] {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return walk(p);
    return p.endsWith('.tsx') ? [p] : [];
  });
}

test('no screen or component sets a fontSize below 11 (styles and SVG alike)', () => {
  const files = [...walk(path.join(root, 'screens')), ...walk(path.join(root, 'components'))]
    .filter((f) => !f.includes('__tests__'));
  const offenders: string[] = [];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    // style objects: `fontSize: 9.5` — and SVG props: `fontSize={9.5}`
    for (const m of src.matchAll(/fontSize[:=][{ ]*([\d.]+)/g)) {
      const size = parseFloat(m[1]);
      if (size < 11) {
        const line = src.slice(0, m.index).split('\n').length;
        offenders.push(`${path.relative(root, f)}:${line} fontSize ${size}`);
      }
    }
    // a size passed by name — `const vfs = 10; … fontSize={vfs}` — was read by nothing above: the cockpit's chart values printed
    // at 10 through it until 2026-10-27 (FX-PLAN, retirement-cockpit_v02). The name is read back to its number in the same file.
    for (const m of src.matchAll(/fontSize=\{([A-Za-z_]\w*)\}/g)) {
      const def = src.match(new RegExp(`\\bconst ${m[1]}\\s*=\\s*([\\d.]+)`));
      const size = def ? parseFloat(def[1]) : NaN;
      if (!(size >= 11)) offenders.push(`${path.relative(root, f)}:${src.slice(0, m.index).split('\n').length} fontSize ${m[1]} = ${def ? size : 'not a number in this file'}`);
    }
  }
  expect(offenders).toEqual([]);
});
