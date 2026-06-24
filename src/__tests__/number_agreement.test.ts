/**
 * NUMBER-AGREEMENT guards (Wave 1, Theme 2): the audit found canonical domain selectors that exist but
 * are used by ZERO screens — screens re-derive money inline and disagree. Each fix wires a screen to the
 * ONE canonical selector; these static-source guards stop a screen from re-introducing a bespoke calc.
 */
import * as fs from 'fs';
import * as path from 'path';
const screen = (f: string) => fs.readFileSync(path.join(__dirname, '..', 'screens', f), 'utf8');

test('B-68: savings rate uses canonical savingsRateCash (not a bespoke (income−spend)/income)', () => {
  const src = screen('AnalyticsScreen.tsx');
  expect(src).toMatch(/savingsRateCash\(/);
  expect(src).not.toMatch(/monthIncome \|\| 0\) - \(monthSpend/);   // the old inline calc must be gone
});
