// EVERY DOOR MUST OPEN (2026-08-10, after two dead links were found on the Net worth surface).
//
// routeGuard.test.ts already checks the other direction — that every route file a user can reach is
// whitelisted so the guard doesn't bounce them Home. Nothing checked that a route a screen actually
// PUSHES exists at all, so two buttons shipped pointing at nothing:
//   · first-day "Connect a brokerage ›" pushed '/connect-account' — the file is app/connect.tsx
//   · the missing-data sheet's "Update the value ›" pushed '/(tabs)/networth' — the Net worth tab's
//     route key is 'analytics', so that path matches no screen either
// Both landed on an unmatched route and bounced the user Home — the exact opposite of the promise
// that every fix button lands on the exact cure. This test walks the literal push targets in the
// app and fails if any of them names a screen that does not exist.
import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..', '..');
const appDir = path.join(root, '..', 'app');

function walk(d: string): string[] {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.tsx?$/.test(p) && !p.includes('__tests__') ? [p] : [];
  });
}

/** Every route this app can serve: app/x.tsx → '/x', app/(tabs)/x.tsx → '/(tabs)/x'. */
function knownRoutes(): Set<string> {
  const out = new Set<string>();
  for (const f of fs.readdirSync(appDir, { withFileTypes: true })) {
    if (f.isDirectory()) {
      for (const g of fs.readdirSync(path.join(appDir, f.name))) {
        if (g.endsWith('.tsx') && g !== '_layout.tsx') out.add(`/${f.name}/${g.replace(/\.tsx$/, '')}`);
      }
    } else if (f.name.endsWith('.tsx') && f.name !== '_layout.tsx') {
      const r = f.name.replace(/\.tsx$/, '');
      out.add(r === 'index' ? '/' : `/${r}`);
    }
  }
  return out;
}

/** The route literals a screen navigates to — router.push('/x'), route: `/x?id=${…}`, href: '/x'.
 *  A template's interpolations sit in the query string, so the screen name is the part before the
 *  first '?', '#' or '${' — that prefix is what has to name a real file. */
function pushTargets(src: string): string[] {
  const out: string[] = [];
  const re = /(?:router\.push|router\.replace|\broute:|\bhref:)\s*\(?\s*(['"`])([^'"`]*)\1/g;
  for (const m of src.matchAll(re)) {
    const raw = m[2];
    if (!raw.startsWith('/')) continue;                       // relative / fully dynamic — not a literal
    const name = raw.split(/[?#]|\$\{/)[0];
    if (name === '/' || name.endsWith('/')) continue;         // the path itself is interpolated
    out.push(name);
  }
  return out;
}

test('every route a screen pushes actually exists (no button can land on nothing)', () => {
  const routes = knownRoutes();
  const dead: string[] = [];
  for (const f of [...walk(path.join(root, 'screens')), ...walk(path.join(root, 'components')), ...walk(path.join(root, 'domain'))]) {
    const rel = path.relative(root, f);
    for (const t of pushTargets(fs.readFileSync(f, 'utf8'))) {
      if (!routes.has(t)) dead.push(`${rel} → ${t} (no such screen)`);
    }
  }
  expect(dead).toEqual([]);
});

test('the Net worth tab is reached by its real route key', () => {
  // 'networth' reads like the right path and is not one — the tab file is app/(tabs)/analytics.tsx.
  expect(knownRoutes().has('/(tabs)/analytics')).toBe(true);
  expect(knownRoutes().has('/(tabs)/networth')).toBe(false);
});
