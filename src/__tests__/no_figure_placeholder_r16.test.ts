/** EMPTY MEANS EMPTY, EVERY SCREEN (2026-11-01, FX-PF; the lead's ruling R16 of 2026-10-31, DEC-0296: “an unknown input produces no
 *  number and a reason — never a default”). A box nobody filled shows no grey figure that could be read as an entry — ‘0’, ‘$0’, ‘0.0’,
 *  ‘$2,800’. Word examples (‘e.g. AAPL’, ‘New roof’) and the ‘—’ of an optional figure are not figures and are allowed.
 *  This guard reads every .tsx under src/ and app/ (tests excluded) for a placeholder whose text is a figure, in any of the three ways
 *  the code writes one: placeholder="0", placeholder={'0'}, placeholder: '0'. It is a ratchet at the true count — it may only fall.
 *  The 4 left on 2026-11-01 are all in src/screens/GoalsScreen.tsx, which no route mounts (the Goals route redirects to Plan · Goals,
 *  PlanGoals); they go when that file goes. */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) return e.name === '__tests__' || e.name === 'node_modules' || e.name === 'testing' ? [] : walk(p);
  return /\.tsx$/.test(e.name) && !/\.test\.tsx$/.test(e.name) ? [p] : [];
});
const FILES = [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'app'))];
const ANY = /\b(?:placeholder|ph)(?:=\{?\s*["'`]|:\s*["'`])([^"'`]*)["'`]/g;   // ph: onboarding's own name for it
const FIGURE = /^\s*[$€£]?\s*[\d][\d,.]*\s*%?\s*$/;
const seen: { file: string; line: number; text: string }[] = [];
for (const f of FILES) {
  fs.readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
    for (const m of l.matchAll(ANY)) seen.push({ file: path.relative(ROOT, f), line: i + 1, text: m[1] });
  });
}
const figures = seen.filter((p) => FIGURE.test(p.text));
/** a placeholder written as an expression — `${currencySymbol()}0`, fig(…, 0), a calculated figure — which this reader cannot judge
 *  by its text; each is listed so a new one is seen, and the count may only fall */
const EXPR = /placeholder=\{(?!\s*["'])/;
const expressions: string[] = [];
for (const f of FILES) fs.readFileSync(f, 'utf8').split('\n').forEach((l, i) => { if (EXPR.test(l)) expressions.push(`${path.relative(ROOT, f)}:${i + 1}`); });

/** the true number on 2026-11-01: GoalsScreen.tsx 241, 326, 377, 379 (dead) — it may only fall */
const RATCHET = 4;

test('a guard must prove it looked: it read the app\'s screens and found their placeholders', () => {
  expect(FILES.length).toBeGreaterThanOrEqual(147);                          // 147 on 2026-11-01
  expect(FILES.some((f) => f.endsWith(path.join('src', 'screens', 'PerformanceScreen.tsx')))).toBe(true);
  expect(seen.length).toBeGreaterThan(60);                                   // word examples included: it saw them, not nothing
  expect(seen.some((p) => p.text === 'e.g. AAPL')).toBe(true);
});

test('no placeholder shows a figure, outside the dead Goals screen — ratchet at the true count', () => {
  const live = figures.filter((p) => p.file !== path.join('src', 'screens', 'GoalsScreen.tsx'));
  expect(live.map((p) => `${p.file}:${p.line} ${p.text}`)).toEqual([]);
  expect(figures.length).toBeLessThanOrEqual(RATCHET);
  expect(figures.length).toBe(RATCHET);                                      // lower RATCHET when the count falls
});

/** the true number of placeholders written as expressions — 35 on 2026-11-01 (33 after NW4-05, below), after the R16 sweep cleared 22 of the 50 (onboarding's
 *  grey `${currencySymbol()}0`, ‘0’ and ‘50’, its stock-grant ‘100’ and ‘$0’, MoneySheets' ‘$0’ and ‘0%’, Your base pay's ‘$0’). What
 *  remains, and why it stays:
 *   · pass-throughs that print what their caller hands them (MoneyBox ×2, InputModal ×2, AddAccount's field ×2, BasePay's and
 *     IncomeManager's Money, AuthScreen's field, onboarding's helpers `ph ?? ''` ×6 and the stock-grant row's c.ph ×2) — their callers
 *     are read by the figure ratchet above;
 *   · words, some with a figure inside a sentence (Itemize, Budget's 'No limit', Auth, Required withdrawals, Settings, Net worth, IncomeManager's 'use $X', onboarding's 'e.g. 80' and '$ target');
 *   · a figure the app uses when the box is blank, said in words beside it: JobSafety's monthly spend, Roth's rate, Plan's target nest
 *     egg ('our starting figure, not yours'), Social Security timing's example ('Showing example numbers'), Your base pay's tax rate
 *     ('Leave it blank to use the calculated rate') and its month table's typical month (as Income v07 phone 6 draws it), and the
 *     savings months under 'Use suggested'.
 *  It may only fall. */
const RATCHET_EXPRESSIONS = 33;   // 33 on 2026-11-01 (FX-NW, NW4-05): Bonds' and Other investments' 'amount sold (up to $X)' are the words 'amount sold' now, the limit said in the line above
test('placeholders written as expressions: listed, and a ratchet at the true count', () => {
  expect(expressions.length).toBeLessThanOrEqual(RATCHET_EXPRESSIONS);
  expect(expressions.length).toBe(RATCHET_EXPRESSIONS);                     // lower it when the count falls
});
