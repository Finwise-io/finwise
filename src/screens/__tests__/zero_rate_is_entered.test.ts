/* DEC-2748b — a typed 0% is 0%, an empty box is unknown. Every form that saves a bond or CD rate must read the
 * BOX (empty or not), never the number's size: `num(coupon) > 0` turned a typed 0 into "no rate".
 * Found 2026-10-12 on Add account and the Bonds editor, and 2026-10-13 on Itemize. This reads every screen. */
import * as fs from 'fs';
import * as path from 'path';

const dir = path.join(__dirname, '..');
const screens = fs.readdirSync(dir).filter((f) => f.endsWith('.tsx'));

test('no screen saves a rate only when it is above zero', () => {
  expect(screens.length).toBeGreaterThanOrEqual(30);   // the guard saw the screens it says it read
  const offenders = screens.filter((f) => /num\(coupon\)\s*>\s*0\s*\)?\s*\??\s*[^;]*couponRate|num\(coupon\)\s*>\s*0\s*\?\s*num\(coupon\)/.test(fs.readFileSync(path.join(dir, f), 'utf8')));
  expect(offenders).toEqual([]);
});

test('the three bond-rate forms each read the box itself', () => {
  for (const f of ['AddAccountScreen.tsx', 'BondsScreen.tsx', 'ItemizeScreen.tsx']) {
    expect(fs.readFileSync(path.join(dir, f), 'utf8')).toMatch(/coupon\.trim\(\)\s*(!==|===)\s*''/);
  }
});
