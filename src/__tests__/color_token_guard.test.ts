// COLOR-TOKEN RATCHET (design audit 2026-07-16, systemic fix 4): screens and components use the
// theme's tokens — raw hex colors live ONLY in src/utils/theme.ts. Pure white/black literals are
// allowed (buttons on colored grounds, shadows). Two named exemptions carry a fixed budget:
// TaxOrganizer's exported PDF stylesheet (an HTML document, not app UI) and Budget's custom-category
// background DEFAULT (a data value matching constants/categories.ts options). Budgets only go DOWN.
import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..');
const EXEMPT_BUDGET: Record<string, number> = {
  'screens/TaxOrganizerScreen.tsx': 6,   // the accountant-PDF inline stylesheet
  'screens/BudgetScreen.tsx': 2,         // '#F5F5F5' custom-category default (data, not style)
};

function walk(d: string): string[] {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return walk(p);
    return p.endsWith('.tsx') ? [p] : [];
  });
}

test('no raw hex colors on screens/components — the palette lives in theme.ts', () => {
  const files = [...walk(path.join(root, 'screens')), ...walk(path.join(root, 'components'))]
    .filter((f) => !f.includes('__tests__'));
  const regressions: string[] = [];
  for (const f of files) {
    const rel = path.relative(root, f);
    const src = fs.readFileSync(f, 'utf8');
    const hexes = [...src.matchAll(/#[0-9A-Fa-f]{3,8}\b/g)]
      .map((m) => m[0].toLowerCase())
      .filter((h) => !['#fff', '#ffffff', '#000', '#000000'].includes(h));
    const allowed = EXEMPT_BUDGET[rel] ?? 0;
    if (hexes.length > allowed) {
      regressions.push(`${rel}: ${hexes.length} raw hex literals (budget ${allowed}) — use Colors/ChartPalette tokens`);
    }
  }
  expect(regressions).toEqual([]);
});
