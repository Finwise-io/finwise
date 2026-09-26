/** A PERCENT SHOWS TWO DECIMALS (founder ruling Q49, 2026-09-09) — and the places that still show
 *  one may only get fewer.
 *
 *  WHY THIS EXISTS (2026-09-26). The founder asked what each module still owed against the new
 *  standards. Measuring it — rather than remembering it — found the hero return on Home printing
 *  +0.5% where the figure is +0.54%, the debt APR on Net worth printing 6.4% for a 6.35% loan, and
 *  46 more places across six screens. The first two were fixed the day they were found; the rest sit
 *  on screens whose own designs are still being settled (the Retirement cockpit alone has 26, and
 *  its odds disagree with Home and Plan, so it is being reworked anyway).
 *
 *  Rather than leave 48 places uncounted until someone trips over one, this holds the count still:
 *  a file may print FEWER one-decimal percentages, never more, and a file at zero has its line
 *  deleted. The same shape as the undeclared-figures ratchet, for the same reason — a gate finds
 *  what careful reading does not.
 *
 *  A figure that genuinely wants one decimal is not a defect: it needs one line on its master row
 *  saying so ("What comes out — unit and rounding"), and then its file's number here comes down.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const LEDGER = path.join(ROOT, 'Calculation Module code', 'scripts', 'moneykeel_one_decimal_percents.json');
const ONE_DECIMAL = /toFixed\(1\)\}?\s*%|\* 100\)\.toFixed\(1\)/g;

const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  const p = path.join(dir, d.name);
  if (d.isDirectory()) return d.name === '__tests__' ? [] : walk(p);
  return /\.tsx?$/.test(d.name) && !/\.test\./.test(d.name) ? [p] : [];
});

test('a percent shows two decimals — and the places that still show one may only get fewer', () => {
  const allowed = JSON.parse(fs.readFileSync(LEDGER, 'utf8')).baseline as Record<string, number>;
  const now: Record<string, number> = {};
  for (const file of walk(path.join(ROOT, 'src'))) {
    const rel = path.relative(ROOT, file);
    const n = (fs.readFileSync(file, 'utf8').match(ONE_DECIMAL) ?? []).length;
    if (n) now[rel] = n;
  }
  const offences: string[] = [];
  for (const [file, n] of Object.entries(now)) {
    const cap = allowed[file] ?? 0;
    if (n > cap) offences.push(`${file} prints ${n} percentages to one decimal, was ${cap} — Q49 says two, or state the exception on the figure's row`);
  }
  for (const [file, cap] of Object.entries(allowed)) {
    const n = now[file] ?? 0;
    if (n < cap) offences.push(`${file} is down to ${n} from ${cap} — lower its line in moneykeel_one_decimal_percents.json so the ratchet holds (delete it at zero)`);
  }
  expect(offences).toEqual([]);
});
