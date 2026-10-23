// THE ONE ARTICLE RULE (Performance audit row 30, 2026-10-21). A spoken label on the account page read "Record a interest
// for Brokerage" and "Record a withdraw": an "a" typed in front of whatever word came next. withArticle in
// src/domain/_shared/plural.ts, beside the one list of plurals, now decides "a", "an" or none. This file holds the rule
// to its cases, and holds the code to the rule: no "a" or "an" is typed in front of a value any more, except the lines
// counted below, which may only fall (a guard must prove it looked: it states how many files it read).
import * as fs from 'fs';
import * as path from 'path';
import { withArticle } from './plural';

test.each([
  // the record kinds on the account page's recorder, by their own names (txnLabel)
  ['deposit', 'a deposit'], ['withdrawal', 'a withdrawal'], ['transfer', 'a transfer'], ['dividend', 'a dividend'],
  ['interest', 'interest'], ['coupon', 'a coupon'],
  // a vowel sound, a consonant sound
  ['expense date', 'an expense date'], ['maturity date', 'a maturity date'], ['interest payment', 'an interest payment'],
  ['uninvested balance', 'an uninvested balance'], ['unit', 'a unit'], ['one-time cost', 'a one-time cost'], ['hour', 'an hour'],
  // capitals said letter by letter, and an account named with them
  ['HSA', 'an HSA'], ['IRA', 'an IRA'], ['CD', 'a CD'], ['Roth IRA', 'a Roth IRA'], ['Traditional IRA', 'a Traditional IRA'],
  ['Taxable', 'a Taxable'], ['401(k)', 'a 401(k)'], ['Roth 401(k)', 'a Roth 401(k)'],
  // numbers by how they are said
  ['8% rate', 'an 8% rate'], ['11-month CD', 'an 11-month CD'], ['18,000 limit', 'an 18,000 limit'], ['1,800 limit', 'a 1,800 limit'],
])('withArticle(%j) is %j', (word, said) => {
  expect(withArticle(word)).toBe(said);
});

// ── no "a" or "an" typed in front of a value ───────────────────────────────────────────────────────────────────────────
const ROOT = path.join(__dirname, '..', '..', '..');
const SCAN = ['src', 'MoneyKeel/functions'];
function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== '__tests__') walk(p); }
      else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.(ts|tsx)$/.test(e.name)) out.push(p);
    }
  };
  for (const s of SCAN) walk(path.join(ROOT, s));
  return out;
}
/** "a ${…}" or "an ${…}" in a string, or "a {…}" in JSX text — an article chosen before the word is known. A period is
 *  always "a month" or "a year" (the canon's spoken form), so `a ${spec.per}` is not a guess. Comments are not read. */
const HAND_MADE = /(?:(?<![\w$.'"`-])(?:a|an)|(?<=^|[`'">]|[^\w})\]\s]\s+)(?:A|An)) \$?\{(?!spec\.per\}|per\})/g;   // a capital A only where a sentence starts (an SVG arc is "A ${r}")
function handMade(text: string): number {
  return text.split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l))
    .map((l) => l.replace(/\/\/.*$/, '').replace(/\{\/\*.*?\*\/\}/g, ''))
    .reduce((n, l) => n + (l.match(HAND_MADE) ?? []).length, 0);
}
/** The lines still typed by hand on 2026-10-21, the true count per file. Each is outside the Performance screens and is
 *  listed for its owner: Net worth's empty-section line and its spoken label ("Add a {section} account" — the section names
 *  are plural, so the words need rewriting, not only an article); a money amount in Stress test ("a $500 hit"); a percent in
 *  the Retirement cockpit ("vs a 8.0% benchmark") and in one insight ("Only a 55% odds"); a money amount in the debt editor and
 *  Social Security timing; an institution's name in the connect flow ("a Ally"); a pay frequency on Base pay. */
const STILL_BY_HAND: Record<string, number> = {
  'src/screens/NetWorthScreen.tsx': 2,
  'src/screens/StressTestScreen.tsx': 2,
  'src/screens/RetirementCockpit.tsx': 1,
  'src/domain/insights/index.ts': 1,
  'src/components/DebtEditorSheet.tsx': 1,
  'src/screens/SsTimingScreen.tsx': 1,
  'src/screens/ConnectFlowScreen.tsx': 1,
  'src/screens/BasePayScreen.tsx': 1,
};

test('no "a" or "an" is typed in front of a value — the one article rule decides, and the lines left only fall', () => {
  const files = sourceFiles();
  const found: Record<string, number> = {};
  for (const f of files) {
    const n = handMade(fs.readFileSync(f, 'utf8'));
    if (n) found[path.relative(ROOT, f)] = n;
  }
  const offences: string[] = [];
  for (const [f, n] of Object.entries(found)) {
    const allowed = STILL_BY_HAND[f];
    if (allowed == null) offences.push(`${f}: ${n} article(s) typed in front of a value — use withArticle from src/domain/_shared/plural`);
    else if (n > allowed) offences.push(`${f}: grew from ${allowed} to ${n} articles typed by hand`);
  }
  for (const [f, allowed] of Object.entries(STILL_BY_HAND)) {
    const n = found[f] ?? 0;
    if (n < allowed) offences.push(`${f}: down to ${n} from ${allowed} — lower its line here (delete it at zero)`);
  }
  // what it read: every source file of the app and the functions (219 on 2026-10-21), and the pattern still finds
  // the lines it knows of — a pattern that stops matching goes red here instead of reporting clean
  expect(files.length).toBeGreaterThanOrEqual(200);
  expect(Object.values(found).reduce((t, n) => t + n, 0)).toBeGreaterThanOrEqual(Object.values(STILL_BY_HAND).reduce((t, n) => t + n, 0));
  expect(handMade('const s = `Record a ${kind} for ${name}`;')).toBe(1);
  expect(handMade('const s = `Record ${withArticle(kind)}`; const p = ` a ${spec.per}`; const d = `M ${x} A ${r} ${r}`;')).toBe(0);
  expect(offences).toEqual([]);
});
