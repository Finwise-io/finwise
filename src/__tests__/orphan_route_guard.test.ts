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
};

/** FOUNDER RULING 2026-08-02: "keep ALL orphans" — these serve age groups this build does not
 *  target, and they are kept deliberately rather than left by accident. They were surfaced in
 *  primary-flows-v1 and the founder chose to hold them. Deleting one is a founder call, not a
 *  tidy-up, so the guard records them by name instead of pretending they are linked. Kept separate
 *  from the list above because "unreachable on purpose" and "reached without a tap" are different
 *  things, and the screen map cross-check below needs to tell them apart. */
const DELIBERATE_KEEPS: Record<string, string> = {
  '(tabs)/tips': 'saved for future use (founder 2026-08-14) — written for a younger audience',
  '(tabs)/rewards': 'saved for future use (founder 2026-08-14) — written for a younger audience',
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
  // EMPTY, and that is the point. Tips and Rewards sat here for one day and the founder ruled on
  // 2026-08-14 to save them for future use, so they moved to the deliberate keeps above. An entry
  // here means "nobody can reach this and nobody has decided whether that is on purpose" — a
  // question, not a resting place.
};

/** Every route the app has — READ FROM THE FILESYSTEM, because routing here is file-based: a file in
 *  app/ IS a route whether or not _layout declares a <Stack.Screen> for it (those entries only set
 *  headers and options).
 *
 *  This guard has now been built too narrow three times, and each time it reported clean while the
 *  thing it exists to find sat in plain sight: first it could not see src/domain (insight routes),
 *  then it skipped (tabs)/ entirely (where Tips and Rewards were stranded), and then it turned out
 *  to be reading _layout's declarations — which cover only about half the live routes. Read the
 *  disk. The disk is what ships. */
function registeredRoutes(): string[] {
  const stack = fs.readdirSync(appDir)
    .filter((f) => /\.tsx$/.test(f) && f !== '_layout.tsx')
    .map((f) => f.replace(/\.tsx$/, ''));
  const tabFiles = fs.existsSync(path.join(appDir, '(tabs)'))
    ? fs.readdirSync(path.join(appDir, '(tabs)')).filter((f) => /\.tsx$/.test(f) && f !== '_layout.tsx')
      .map((f) => `(tabs)/${f.replace(/\.tsx$/, '')}`)
    : [];
  // the five in the tab bar need no link — the bar itself is the way in
  const meta = fs.readFileSync(path.join(root, 'constants', 'tabs.ts'), 'utf8');
  const inBar = (r: string) => new RegExp(`\\b${r.replace('(tabs)/', '')}\\s*:\\s*\\{`).test(meta);
  return [...stack, ...tabFiles].filter((n) =>
    !NO_INBOUND_LINK_EXPECTED[n] && !DELIBERATE_KEEPS[n] && !STRANDED_AWAITING_RULING[n] && !inBar(n));
}

test('every registered screen has a way in', () => {
  const orphans: string[] = [];
  for (const route of registeredRoutes()) {
    const leaf = route.replace('(tabs)/', '');
    // A tab route and a stack route can share a leaf name — /invest is a dead legacy screen while
    // /(tabs)/invest is the live Performance tab. Matching both spellings for both would credit the
    // dead one with the live one's doors, so each shape is matched only by its own spelling.
    const forms = route.startsWith('(tabs)/') ? [`/(tabs)/${leaf}`] : [`/${leaf}`];
    const patterns = forms.flatMap((f) => [`'${f}'`, `"${f}"`, `\`${f}`, `'${f}?`]);
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

// THE MAP AND THE GUARD MUST AGREE (founder ruling 2026-08-14 — the living screen map).
//
// docs/FCC-core-55-70/screen-architecture.html is generated by scripts/screen-map.mjs, and this
// guard is a second, independent reading of the same question. Forcing them to match does two jobs:
// it catches a stale committed map, and it catches either reader going narrow — which has now
// happened twice (the guard could not see the domain layer, then could not see tab routes).
test('the generated screen map agrees with this guard about what is unreachable', () => {
  const page = path.join(__dirname, '..', '..', 'docs/FCC-core-55-70/screen-architecture.html');
  if (!fs.existsSync(page)) throw new Error('screen-architecture.html missing — run: node scripts/screen-map.mjs');
  const html = fs.readFileSync(page, 'utf8');

  // every box the map marks NO WAY IN, read back out of the page it published. The box shows the
  // human name first and the route beneath it in `.br` — route keys were never renamed when the tabs
  // were, so a page that led with `(tabs)/invest` read as if the rename had been forgotten.
  const mapSays = new Set(
    [...html.matchAll(/<div class="br">\/([^<]+)<\/div>\s*<div class="tag"[^>]*>NO WAY IN/g)].map((m) => m[1]),
  );
  const guardSays = new Set([...Object.keys(STRANDED_AWAITING_RULING), ...Object.keys(DELIBERATE_KEEPS)]);

  const onlyMap = [...mapSays].filter((r) => !guardSays.has(r));
  const onlyGuard = [...guardSays].filter((r) => !mapSays.has(r));
  expect({ theMapFoundButTheGuardDidNot: onlyMap, theGuardListsButTheMapDoesNot: onlyGuard })
    .toEqual({ theMapFoundButTheGuardDidNot: [], theGuardListsButTheMapDoesNot: [] });
});
