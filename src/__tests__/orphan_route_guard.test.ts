// ORPHAN-ROUTE GUARD (founder ruling 2026-08-13, audit D7).
//
// There is already a guard for the forward direction: a button must not point at a route that does
// not exist. Nothing guarded the reverse — a screen that EXISTS, is registered, works, and that
// nothing in the app points at. That is how /big-costs came to be fully built and reachable from
// nowhere: the only door was removed on 2026-08-12 and never replaced, and no test noticed.
//
// A registered route must have at least one inbound reference from somewhere a person could tap.
import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..');
const appDir = path.join(root, '..', 'app');

/** Reached without a tap, so an inbound link is not expected. Each one needs a stated reason. */
const NO_INBOUND_LINK_EXPECTED: Record<string, string> = {
  index: 'the entry file itself — the app opens here',
  auth: 'the route guard sends unauthenticated people here',
  'first-run': 'the route guard sends new accounts here',
  onboarding: 'the by-hand door, reached through the guard',
  'connect-done': 'a deep link back from the broker portal, not a tap',
  _layout: 'the navigation registry, not a screen',
  // FOUNDER RULING 2026-08-02: "keep ALL orphans" — these serve age groups this build does not
  // target, and they are kept deliberately rather than left by accident. They were surfaced in
  // primary-flows-v1 and the founder chose to hold them. Deleting one is a founder call, not a
  // tidy-up, so the guard records them by name instead of pretending they are linked.
  income: 'kept on purpose (founder 2026-08-02) — serves a future age group',
  invest: 'kept on purpose (founder 2026-08-02) — superseded by Performance for 55-70',
  'income-detail': 'kept on purpose (founder 2026-08-02) — serves a future age group',
};

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.tsx?$/.test(e.name) ? [p] : [];
  });
}

/** EVERY file that could hold a link. The first version of this guard scanned only screens and
 *  components and reported three false orphans — insight cards carry their own `route` and live in
 *  src/domain, and the onboarding summary carries routes too. A guard that looks in too few places
 *  is worse than none: it cries wolf and gets muted. */
const sourceText = (() => {
  const files = [...walk(root), ...walk(appDir)]
    .filter((f) => !f.includes('__tests__') && !/\.test\.tsx?$/.test(f));
  return files.map((f) => ({ rel: path.relative(root, f), src: fs.readFileSync(f, 'utf8') }));
})();

/** STRANDED — reachable from nowhere, and nobody has decided whether that is on purpose.
 *  These are DEBT, not design. Listed so they are visible and countable rather than silently
 *  excluded; the founder rules on each and it either gets a door or joins the list above. */
const STRANDED_AWAITING_RULING: Record<string, string> = {
  '(tabs)/tips': 'trimmed from the menu 2026-08-02 and nothing else links it — found 2026-08-13',
  '(tabs)/rewards': 'trimmed from the menu 2026-08-02 and nothing else links it — found 2026-08-13',
};

/** Every route the app registers: the stack screens AND the tab screens. The first version of this
 *  guard skipped anything under (tabs)/, which is exactly where Tips and Rewards were stranded —
 *  the second time this guard was built too narrow to see the thing it exists to find. */
function registeredRoutes(): string[] {
  const layout = fs.readFileSync(path.join(appDir, '_layout.tsx'), 'utf8');
  const stack = [...layout.matchAll(/<Stack\.Screen\s+name="([^"]+)"/g)].map((m) => m[1])
    .filter((n) => !n.startsWith('('));
  const tabFiles = fs.existsSync(path.join(appDir, '(tabs)'))
    ? fs.readdirSync(path.join(appDir, '(tabs)')).filter((f) => /\.tsx$/.test(f) && f !== '_layout.tsx')
      .map((f) => `(tabs)/${f.replace(/\.tsx$/, '')}`)
    : [];
  // the five in the tab bar need no link — the bar itself is the way in
  const meta = fs.readFileSync(path.join(root, 'constants', 'tabs.ts'), 'utf8');
  const inBar = (r: string) => new RegExp(`\\b${r.replace('(tabs)/', '')}\\s*:\\s*\\{`).test(meta);
  return [...stack, ...tabFiles].filter((n) =>
    !NO_INBOUND_LINK_EXPECTED[n] && !STRANDED_AWAITING_RULING[n] && !inBar(n));
}

test('every registered screen has a way in', () => {
  const orphans: string[] = [];
  for (const route of registeredRoutes()) {
    const leaf = route.replace('(tabs)/', '');
    // a link can be written '/route', '/(tabs)/route', or with a ?param suffix
    const patterns = [`'/${route}'`, `"/${route}"`, `\`/${route}`, `'/${route}?`,
      `'/(tabs)/${leaf}'`, `"/(tabs)/${leaf}"`, `\`/(tabs)/${leaf}`, `'/(tabs)/${leaf}?`];
    const linked = sourceText.some(({ rel, src }) =>
      // the screen file for a route does not count as its own way in
      !rel.endsWith(`${leaf}.tsx`) && patterns.some((p) => src.includes(p)));
    if (!linked) orphans.push(`/${route} — registered and built, but nothing in the app links to it`);
  }
  expect(orphans).toEqual([]);
});

test('the stranded list is documented, dated, and stays visible', () => {
  // Not an exclusion — a debt register. Every entry needs a reason and the date it was found, so
  // "nobody can reach this" can never quietly become "that is just how it is".
  for (const [route, why] of Object.entries(STRANDED_AWAITING_RULING)) {
    expect(why).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(why.length).toBeGreaterThan(20);
    expect(route).toBeTruthy();
  }
  // eslint-disable-next-line no-console
  console.log(`STRANDED, awaiting a founder ruling: ${Object.keys(STRANDED_AWAITING_RULING).join(', ') || 'none'}`);
});

test('the big-costs door is back on the Plan tab specifically', () => {
  const inputs = fs.readFileSync(path.join(root, 'components', 'PlanInputs.tsx'), 'utf8');
  expect(inputs).toContain("'/big-costs'");
  expect(inputs).toMatch(/Add a big cost/);
});
