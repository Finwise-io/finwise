/**
 * NUMBER-AGREEMENT guards (Wave 1, Theme 2): the audit found canonical domain selectors that exist but
 * are used by ZERO screens — screens re-derive money inline and disagree. Each fix wires a screen to the
 * ONE canonical selector; these static-source guards stop a screen from re-introducing a bespoke calc.
 */
import * as fs from 'fs';
import * as path from 'path';
const screen = (f: string) => fs.readFileSync(path.join(__dirname, '..', 'screens', f), 'utf8');

test('B-68: no screen re-derives a savings rate inline — the canonical helper lives in domain/savings', () => {
  // AnalyticsScreen (the one offender) was deleted 2026-07-16 as dead code; guard the whole folder
  // so the bespoke (income−spend)/income pattern never comes back on any screen.
  const dir = path.join(__dirname, '..', 'screens');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.tsx'))) {
    expect(fs.readFileSync(path.join(dir, f), 'utf8')).not.toMatch(/monthIncome \|\| 0\) - \(monthSpend/);
  }
});

test('B-70: one investable selector — investableValue is gone; screens use investableAssets', () => {
  const assets = fs.readFileSync(path.join(__dirname, '..', 'domain', 'assets', 'index.ts'), 'utf8');
  expect(assets).not.toMatch(/export function investableValue/);
  for (const f of ['InsightsScreen.tsx', 'InsuranceScreen.tsx', 'OtherInvestmentsScreen.tsx']) {
    expect(screen(f)).not.toMatch(/investableValue/);
  }
});

test('walk row 5: ONE market-average formula — no screen re-derives the value-weighted bench return inline', () => {
  // Home says "the market: up X%" and must call portfolioBenchReturn (domain/performance).
  // Performance no longer makes that comparison at all: the Honest comparison card is not in the
  // design the founder approved (mock v14, 2026-09-25), so the screen states no market average —
  // and a screen that states none must not derive one either.
  expect(screen('HomeScreen.tsx')).toMatch(/portfolioBenchReturn\(/);
  for (const f of ['HomeScreen.tsx', 'PerformanceScreen.tsx']) {
    expect(screen(f)).not.toMatch(/benchReturn != null && r\.marketValue > 0/);   // the old inline copy
  }
  expect(screen('PerformanceScreen.tsx')).not.toMatch(/portfolioBenchReturn\(/);
});
