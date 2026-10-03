/** GUARD — every screen title is 20 points (founder ruling, 2026-09-14: "standard size 20").
 *
 *  Before this, 31 screens set their title at 24 points, Cash flow at 30, and Will it last and Look back at
 *  20, and the design standard named a type scale but never a title size. The founder saw it in a mock and
 *  asked whether the standards were being followed; they were not written down.
 *
 *  A screen's title is any style named h1, or one of the named title styles below. Each must be 20 points
 *  (Typography.sizes.lg). A bold style of 22 points or more whose name says it is a title or heading fails
 *  too, unless it is listed as a FIGURE — so a new title cannot come in at 24 unnoticed.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = 'src/screens';
/** h1 is a title on every screen; these other names are titles only on the screen named (elsewhere cardTitle is a card's label). */
const NAMED_TITLES: Record<string, string[]> = {
  'PerformanceScreen.tsx': ['investTitle'],
  'NetWorthScreen.tsx': ['introTitle', 'wizTitle'],
  'OnboardingScreen.tsx': ['heading'],
  'FirstRunScreen.tsx': ['introH1'],
  'AuthScreen.tsx': ['cardTitle'],
};
/** Large bold styles whose names look like titles but which show a number, not a title. */
const FIGURES: Record<string, string> = {
  'WillItLastScreen.tsx:headline': 'the odds, a percentage',
};
const TITLE_LIKE = /^(h1|title|heading|headline|[a-z]+Title|[a-z]+H1)$/;

function styles(text: string): { name: string; size: number | null; bold: boolean }[] {
  const flat = text.replace(/\n/g, ' ');
  const out: { name: string; size: number | null; bold: boolean }[] = [];
  for (const m of flat.matchAll(/\b([a-zA-Z0-9_]+):\s*\{([^{}]*)\}/g)) {
    const fs = m[2].match(/fontSize:\s*(?:Typography\.sizes\.([a-z]+)|([0-9.]+))/);
    if (!fs) continue;
    const TOK: Record<string, number> = { xs: 11, sm: 13, base: 15, md: 17, lg: 20, xl: 24, xxl: 30, hero: 38 };
    out.push({ name: m[1], size: fs[1] ? TOK[fs[1]] ?? null : Number(fs[2]), bold: /fontWeight:\s*'(700|800)'/.test(m[2]) });
  }
  return out;
}

test('every screen title is 20 points', () => {
  const offences: string[] = [];
  const screens = fs.readdirSync(ROOT).filter((x) => /\.tsx$/.test(x));
  let titlesChecked = 0;
  for (const f of screens) {
    for (const s of styles(fs.readFileSync(path.join(ROOT, f), 'utf8'))) {
      const named = s.name === 'h1' || (NAMED_TITLES[f] ?? []).includes(s.name);
      const looksLikeTitle = TITLE_LIKE.test(s.name) && s.bold && (s.size ?? 0) >= 22 && !FIGURES[`${f}:${s.name}`];
      if (named || looksLikeTitle) titlesChecked++;
      if ((named || looksLikeTitle) && s.size !== 20) offences.push(`${f} · ${s.name} is ${s.size} points — every screen title is 20 (Typography.sizes.lg)`);
    }
  }
  expect(offences).toEqual([]);
  // COVERAGE — this guard must have actually looked at something (2026-09-28). It filters screen files
  // and style names with typed patterns and asserted nothing about how many it saw, so a pattern that
  // stopped matching would have left a test that passes by looking at nothing. That is how step B6 came
  // to read 42 of 251 rows and report itself clean, and how the orphan-route guard was built too narrow
  // three times. A guard that cannot prove it looked is not a guard.
  expect(screens.length).toBeGreaterThanOrEqual(20);
  expect(titlesChecked).toBeGreaterThanOrEqual(15);
});
