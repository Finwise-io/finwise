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
