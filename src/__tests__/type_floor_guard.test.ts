// TYPE-FLOOR RATCHET (design audit 2026-07-16, approved by the founder): no text in the app may
// render below 10.5pt — the size of the tab-bar labels, the app's smallest sanctioned text. Every
// P0 in the audit was some flavor of "essential text at 6-10pt gray"; this guard makes the whole
// class unrepresentable. Same philosophy as a11y_guard: scan source, fail on regression.
// (10.5 is reserved for tab labels; kickers sit at 11; footnotes at 11.5; body 13+; money 15-17+.)
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

test('no screen or component sets a fontSize below 10.5 (styles and SVG alike)', () => {
  const files = [...walk(path.join(root, 'screens')), ...walk(path.join(root, 'components'))]
    .filter((f) => !f.includes('__tests__'));
  const offenders: string[] = [];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    // style objects: `fontSize: 9.5` — and SVG props: `fontSize={9.5}`
    for (const m of src.matchAll(/fontSize[:=][{ ]*([\d.]+)/g)) {
      const size = parseFloat(m[1]);
      if (size < 10.5) {
        const line = src.slice(0, m.index).split('\n').length;
        offenders.push(`${path.relative(root, f)}:${line} fontSize ${size}`);
      }
    }
  }
  expect(offenders).toEqual([]);
});
