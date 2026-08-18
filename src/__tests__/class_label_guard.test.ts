// ONE CLASS, ONE LABEL (founder ruling, 2026-08-17):
//   "we should change ETFs to just Funds to include Mutual funds."
//
// The word is the easy half. The reason this needed a guard is what the rename exposed: the class
// label was hardcoded in EIGHT places instead of read from the one canonical constant, and they had
// already drifted into THREE different forms — "Stocks / ETFs", "Stocks & ETFs" and "Stock / ETF" —
// all on screens a person could reach in the same session.
//
// That is the exact failure the calculation module exists to end: one concept, one name. A sweep
// fixes today; a gate is what stops the next hardcoded copy from drifting again.
//
// Real product names are NOT in scope and must stay: "Vanguard S&P 500 ETF" is what that fund is
// called, and the broker-coverage text ("stocks, ETFs and mutual funds") describes precisely what an
// institution shares. Internal identifiers (the persisted `stocks_etf` key, TBILL_ETF_TICKERS) are
// out of scope too — renaming a key that sits in saved user data needs a migration, not a sweep.
import fs from 'fs';
import path from 'path';
import { ASSET_CLASS_LABEL } from '../domain/assets';

const ROOT = path.join(__dirname, '..');
const SCAN = ['screens', 'components', 'domain'];

// The dead forms. Any of these in user-visible text means a copy drifted away from the constant.
const STALE = [/Stocks\s*[/&]\s*ETFs?\b/i, /\bStock\s*\/\s*ETF\b/i, /Stocks and ETFs\b/];

const files: string[] = [];
const walk = (dir: string) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!/__tests__|__snapshots__/.test(e.name)) walk(p); }
    else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) files.push(p);
  }
};
SCAN.forEach((d) => walk(path.join(ROOT, d)));

/** Lines a person can actually read — JSX text and string literals, never comments. */
const userVisible = (src: string) =>
  src.split('\n').filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line));

test('no screen still says ETFs where it means the asset class', () => {
  const offenders: string[] = [];
  for (const f of files) {
    userVisible(fs.readFileSync(f, 'utf8')).forEach((line, i) => {
      if (STALE.some((re) => re.test(line))) {
        offenders.push(`${path.relative(ROOT, f)}:${i + 1}  ${line.trim().slice(0, 100)}`);
      }
    });
  }
  expect(offenders).toEqual([]);
});

test('the canonical label is the one the founder approved', () => {
  expect(ASSET_CLASS_LABEL.stocks_etf).toBe('Stocks / Funds');
  // and it still covers every class, so a renamed one cannot go missing
  expect(Object.keys(ASSET_CLASS_LABEL).sort()).toEqual(
    ['alternatives', 'bonds', 'cash', 'mixed', 'personal_property', 'real_estate', 'stocks_etf']);
});

test('real fund names keep the word ETF — this guard must never touch them', () => {
  // A guard that over-reaches gets switched off. Pinning the exception keeps it honest.
  const tickers = fs.readFileSync(path.join(ROOT, 'constants/tickers.ts'), 'utf8');
  expect(tickers).toMatch(/Vanguard S&P 500 ETF/);
  expect(STALE.some((re) => re.test('Vanguard S&P 500 ETF'))).toBe(false);
});
