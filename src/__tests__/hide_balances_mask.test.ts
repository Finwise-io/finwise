// GUARD: "Hide balances" must mask EVERY money amount shown to the user. Masking lives in ONE place —
// the money formatters (formatMoney / formatMoneyCents / moneyCompact in domain/_shared/money.ts), which
// return •••• when hide-balances is on. Any screen that renders a currency value with a RAW
// `$${x.toFixed(...)}` / `$${x.toLocaleString(...)}` bypasses the formatter and LEAKS the balance.
//
// This test scans every screen/component for that bypass signature and fails on any unmarked occurrence.
// Legitimately-unmasked spots (a transient input echo of what the user is typing, an export document,
// a non-money percentage) must carry an inline `// money-mask-ok: <reason>` marker so the choice is
// explicit and reviewed. Real on-screen amounts must go through money() / money2() / moneyCompact().
import * as fs from 'fs';
import * as path from 'path';

const ROOTS = ['screens', 'components'].map((d) => path.join(__dirname, '..', d));

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return e.name.endsWith('.tsx') || e.name.endsWith('.ts') ? [p] : [];
  });
}

// money bypass: a currency '$' adjacent to an interpolation that calls toFixed/toLocaleString.
//  TWO_DOLLAR: template-literal money `$${amt.toFixed(2)}` (literal '$' + interpolation) — always money.
//  DOLLAR_INTERP: a single `${...toFixed/toLocaleString...}`. Ambiguous: it's a currency '$' + JSX
//    expression (money) OR a template-literal interpolation sigil (could be a % or a coordinate). We
//    only treat it as money when the line has NO backtick (so it's JSX, not a template literal) and the
//    value isn't a percentage (doesn't end in `}%`). Percentages/coords/return-rates use template
//    literals, so they're excluded.
const TWO_DOLLAR    = /\$\$\{[^}]*\.(toFixed|toLocaleString)\s*\(/;
const DOLLAR_INTERP = /\$\{[^}]*\.(toFixed|toLocaleString)\s*\(/;
const PERCENT       = /\.(toFixed|toLocaleString)\s*\([^)]*\)\s*\}\s*%/;
const OK = /money-mask-ok/;
const isMoneyLeak = (line: string): boolean =>
  TWO_DOLLAR.test(line) || (DOLLAR_INTERP.test(line) && !line.includes('`') && !PERCENT.test(line));

describe('hide-balances masks every money display (no formatter bypass)', () => {
  const files = ROOTS.flatMap(walk);

  test('there are screen files to scan', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  test('no screen renders money outside the masked formatters', () => {
    const violations: string[] = [];
    for (const f of files) {
      fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        if (OK.test(line)) return;
        if (isMoneyLeak(line)) {
          violations.push(`${path.relative(path.join(__dirname, '..', '..'), f)}:${i + 1}  ${line.trim().slice(0, 90)}`);
        }
      });
    }
    expect(violations).toEqual([]);
  });
});
