// SCREEN ARCHITECTURE MAP — generated, never drawn by hand.
//
// Founder, 2026-08-13: "We have built a lot of features but we are missing proper organization."
// He is right, and the evidence kept arriving one accident at a time: /big-costs fully built and
// reachable from nowhere; Tips and Rewards stranded since the August menu trim; "What if I save
// more?" — a retirement question — reached only from the Performance tab; three screens that exist
// only when an insight happens to fire.
//
// So this reads the CODE and renders the page. The design docs have drifted from reality twice this
// week; a hand-drawn map would have joined them by the next screen. Re-run it and it tells the truth
// again:  node scripts/screen-map.mjs
//
// TWO HALVES, DELIBERATELY SEPARATED:
//   · WHAT IS   — measured. Every route, every inbound link, read from app/ and src/.
//   · WHAT SHOULD BE — authored (see PROPOSED below). A recommendation, labelled as one, so nobody
//     mistakes my opinion for a fact about the codebase.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/FCC-core-55-70/screen-architecture.html');

// ── reading the code ──────────────────────────────────────────────────────────────────────────

/** Reached without a tap — the guard's own list, kept in step with orphan_route_guard.test.ts. */
const NO_DOOR_NEEDED = {
  index: 'the app opens here',
  auth: 'the route guard sends unauthenticated people here',
  'first-run': 'the route guard sends new accounts here',
  onboarding: 'the by-hand door, through the guard',
  'connect-done': 'a deep link back from the broker, not a tap',
};

/** Founder ruling 2026-08-02: "keep ALL orphans" — they serve age groups this build does not target. */
const DELIBERATE_KEEPS = {
  income: 'kept for a future age group',
  invest: 'superseded by Performance for 55-70',
  'income-detail': 'kept for a future age group',
};

const walk = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name) && !p.includes('__tests__') && !/\.test\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
};

const sources = [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'app'))]
  .map((p) => ({ rel: path.relative(ROOT, p), name: path.basename(p).replace(/\.tsx?$/, ''), src: fs.readFileSync(p, 'utf8') }));

const routes = [
  ...fs.readdirSync(path.join(ROOT, 'app')).filter((f) => /\.tsx$/.test(f) && f !== '_layout.tsx')
    .map((f) => f.replace(/\.tsx$/, '')),
  ...fs.readdirSync(path.join(ROOT, 'app/(tabs)')).filter((f) => /\.tsx$/.test(f) && f !== '_layout.tsx')
    .map((f) => `(tabs)/${f.replace(/\.tsx$/, '')}`),
].sort();

const tabMeta = fs.readFileSync(path.join(ROOT, 'src/constants/tabs.ts'), 'utf8');
const tabBar = [...tabMeta.matchAll(/^\s{2}(\w+):\s*\{\s*title:\s*'([^']+)'/gm)].map((m) => ({ key: m[1], title: m[2] }));
// ONLY a (tabs)/ route can be in the bar. app/invest.tsx is a legacy stack screen that happens to
// share a name with the Performance tab's route key — treating it as "in the bar" hid the fact that
// nothing links to it.
const inBar = (r) => r.startsWith('(tabs)/') && tabBar.some((t) => t.key === r.slice('(tabs)/'.length));

/** The route file itself, whichever folder it lives in. */
const routeFileOf = (route) => sources.find((s) => s.rel === `app/${route}.tsx`);

/** A route that only forwards somewhere else is not a screen — say so rather than counting it. */
function redirectOf(route) {
  const f = routeFileOf(route);
  const m = f?.src.match(/<Redirect\s+href=["']([^"']+)["']/);
  return m ? m[1] : null;
}

/** Which screen module backs a route. Two routes can back onto the SAME module — /performance and
 *  the Performance tab are one screen behind two doors — and a map that hides that is lying. */
function backingModule(route) {
  const leaf = route.replace('(tabs)/', '');
  const f = routeFileOf(route);
  const imported = f?.src.match(/from\s+'[^']*screens\/(\w+)'/)?.[1];
  if (imported) return imported;
  const guess = sources.find((s) => s.rel.startsWith('src/screens/') && s.name.toLowerCase() === `${leaf.replace(/-/g, '')}screen`);
  return guess ? guess.name : `app/${route}`;   // legacy screens live in app/ with no src counterpart
}

function purposeOf(route) {
  const mod = backingModule(route);
  const screen = sources.find((s) => s.name === mod) ?? routeFileOf(route);
  if (!screen) return '';
  const first = screen.src.split('\n').find((l) => l.startsWith('//') && l.length > 6);
  return (first ?? '').replace(/^\/\/\s*/, '').replace(/\s*\(FCC.*$/, '').trim().slice(0, 120);
}

/** Every place a person can be sent to this route. */
function doorsTo(route) {
  const leaf = route.replace('(tabs)/', '');
  // A tab route and a stack route can share a leaf name — /invest is a legacy screen, /(tabs)/invest
  // is the Performance tab. Matching both spellings for both routes credited the dead screen with
  // the live tab's doors and hid a genuine orphan. Each shape is matched only by its own spelling.
  const forms = route.startsWith('(tabs)/') ? [`/(tabs)/${leaf}`] : [`/${leaf}`];
  const pats = forms.flatMap((f) => [`'${f}'`, `"${f}"`, `\`${f}`, `'${f}?`]);
  const found = [];
  for (const s of sources) {
    if (s.rel === `app/${route}.tsx` || s.rel === `app/(tabs)/${leaf}.tsx`) continue;   // not its own door
    // the route guard is an ALLOWLIST of legal destinations, not a way in — counting it would
    // report a door that no person can tap
    if (s.rel.includes('routeGuard')) continue;
    if (!pats.some((p) => s.src.includes(p))) continue;
    const label = s.name === 'TopBar' ? 'the ☰ menu'
      : s.name === 'doors' ? 'the three doors'
      : s.rel.includes('/insights/') ? 'an insight card'
      : s.rel.includes('/gaps/') ? 'a fix-this nudge'
      : s.name === 'Summary' ? 'onboarding'
      // never label a door with a bare filename — "index" or "hub" tells a reader nothing about how
      // they arrived. A door out of the domain layer is an engine deciding to offer something.
      : s.rel.startsWith('src/domain/') ? `the ${s.rel.split('/')[2]} engine`
      : s.name.replace(/Screen$/, '');
    if (!found.includes(label)) found.push(label);
  }
  return found;
}

/** Doors that only open when the data says so — the screen exists, but a person may never meet it. */
const CONDITIONAL = ['an insight card', 'a fix-this nudge', 'onboarding'];

const live = routes.filter((r) => !NO_DOOR_NEEDED[r]);
// a module reached by more than one route: the first (preferring the tab) is the screen, the rest
// are aliases of it
const moduleRoutes = {};
for (const r of live) (moduleRoutes[backingModule(r)] ??= []).push(r);
const primaryOf = (mod) => moduleRoutes[mod].find((r) => inBar(r)) ?? moduleRoutes[mod][0];

const screens = live.map((r) => {
  const doors = doorsTo(r);
  const mod = backingModule(r);
  const redirect = redirectOf(r);
  const alias = !redirect && moduleRoutes[mod].length > 1 && primaryOf(mod) !== r ? primaryOf(mod) : null;
  const onlyConditional = doors.length > 0 && doors.every((d) => CONDITIONAL.includes(d));
  const health = redirect ? 'redirect'
    : alias ? 'alias'
    : inBar(r) ? 'bar'
    : doors.length === 0 ? 'stranded'
    : onlyConditional ? 'conditional'
    : doors.length === 1 ? 'single'
    : 'ok';
  return { route: r, doors, health, alias, redirect, purpose: purposeOf(r), keep: DELIBERATE_KEEPS[r] ?? null };
});

// ── THE AUTHORED HALF — a recommendation, not a measurement ───────────────────────────────────
// Everything below this line is my proposal for where each screen belongs. It is NOT read from the
// code and must never be presented as if it were.

const ALIASES_KEY = 'Second routes & redirects';
const PROPOSED = {
  Home: { blurb: 'the two-second glance', screens: ['(tabs)/home', 'insights', 'sharpen'] },
  'Net worth': { blurb: 'everything you own and owe', screens: ['(tabs)/analytics', 'account-detail', 'add-account', 'itemize', 'bonds', 'other-investments', 'import-holdings', 'connect'] },
  Performance: { blurb: 'how it is doing', screens: ['(tabs)/invest', 'holding-detail', 'look-back', 'idle-cash'] },
  'Cash flow': { blurb: 'money in, money out', screens: ['(tabs)/cashflow', 'bill-calendar', 'month-detail', 'expense', 'income-manager', 'monthly-income', 'paycheck-months', 'worth-a-look'] },
  'Plan · Retire': { blurb: 'the long game', screens: ['(tabs)/plan', '(tabs)/retirement', 'will-it-last', 'ss-timing', 'roth', 'required-withdrawals', 'big-costs', 'what-if', 'contribution-room'] },
  'Plan · Goals': { blurb: 'everything else you are saving for', screens: ['(tabs)/goals', 'multi-goal', 'education'] },
  'Plan · Prepare': { blurb: 'getting your affairs in order', screens: ['insurance', 'estate', 'tax-organizer', 'credit', 'stress-test', 'jobsafety'] },
  Settings: { blurb: '', screens: ['(tabs)/settings'] },
  [ALIASES_KEY]: { blurb: 'one screen behind two routes, and one route that only forwards. Not extra screens — just extra doors.', screens: [] },
  'Legacy — awaiting a ruling': {
    blurb: 'built, still registered, and reachable by nobody. Each needs a door, a retirement, or a recorded reason.',
    screens: ['(tabs)/tips', '(tabs)/rewards', 'income', 'income-detail', 'invest', 'savings'],
  },
};

const MOVES = [
  ['what-if', 'Performance', 'Plan · Retire', 'It asks what happens to your retirement odds if you save more. It has never been reachable from Plan.'],
  ['contribution-room', 'an insight only', 'Plan · Retire', 'How much 401(k) room is left is useful whether or not an insight noticed.'],
  ['multi-goal', 'Plan (buried)', 'Plan · Goals', 'It is the screen for weighing college against the mortgage — the front door of Goals, not a link off will-it-last.'],
  ['stress-test', 'Plan (top level)', 'Plan · Prepare', 'An emergency-cash question, not a retirement one. Founder agreed 2026-08-13.'],
  ['jobsafety', 'Settings only', 'Plan · Prepare', 'Same family as the insurance check, and its other door (Tips) is dead.'],
  ['credit', 'Goals', 'Plan · Prepare', 'Founder added it 2026-08-13, reversing the August menu trim for this audience.'],
  ['idle-cash', 'an insight only', 'Performance', 'Cash earning nothing is a performance question; give it a permanent door.'],
  ['worth-a-look', 'an insight only', 'Cash flow', 'It is a transaction close-up. It belongs with the transactions.'],
  ['monthly-income', 'Plan-side screens', 'Cash flow', 'FLAGGED, not decided — it is an income screen, but four Plan screens link it.'],
];

const DECISIONS = [
  ['Tips and Rewards are stranded', 'Nothing links either. Trimmed from the menu 2026-08-02 and left behind.', 'Retire them like /income (recorded keeps), or give them a door.'],
  ['/savings can only be opened during onboarding', 'Its only link is the onboarding summary, so no existing user can reach it.', 'Give it a door, fold it into Cash flow, or record it as retired.'],
  ['Where does monthly income belong?', 'An income screen, but four Plan-side screens link to it.', 'Cash flow (my lean) or Plan · Retire.'],
  ['Does Plan really need three sub-tabs?', 'Retire is the whole redesign; Goals and Prepare are existing screens.', 'Three sub-tabs, or one Retire surface with the rest in the ☰ menu.'],
  ['Nine screens have exactly one door', 'Each is one deleted link away from being unreachable — how /big-costs broke.', 'Accept it (the guard now catches it), or add second doors to the important ones.'],
];

// ── rendering ─────────────────────────────────────────────────────────────────────────────────

const T = { deep: '#085041', primary: '#178F6B', amber: '#854F0B', amberLt: '#FAEEDA', red: '#A32D2D',
  redLt: '#FCEBEB', ink: '#1A1A18', mid: '#6B6B66', light: '#76766F', bg: '#F6F7F5', line: 'rgba(0,0,0,.10)' };

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const HEALTH = {
  bar: ['IN THE TAB BAR', T.deep, '#DFF2E9'],
  ok: ['', T.ink, '#fff'],
  single: ['ONE DOOR', T.amber, T.amberLt],
  conditional: ['ONLY IF IT FIRES', T.amber, T.amberLt],
  stranded: ['NO WAY IN', T.red, T.redLt],
  alias: ['SAME SCREEN, SECOND ROUTE', T.light, '#EEEEE9'],
  redirect: ['REDIRECT — NOT A SCREEN', T.light, '#EEEEE9'],
};

const REAL = screens.filter((s) => s.health !== 'alias' && s.health !== 'redirect');
const counts = screens.reduce((a, s) => ({ ...a, [s.health]: (a[s.health] ?? 0) + 1 }), {});
const card = (s) => {
  const [tag, fg, bg] = HEALTH[s.health];
  return `<div class="box" style="background:${bg};border-color:${s.health === 'ok' ? T.line : fg}33">
    <div class="bt">/${esc(s.route)}</div>
    ${tag ? `<div class="tag" style="color:${fg}">${tag}${s.keep ? ` · ${esc(s.keep)}` : ''}</div>` : ''}
    ${s.alias ? `<div class="bp">the same screen as <b>/${esc(s.alias)}</b></div>`
      : s.redirect ? `<div class="bp">forwards to <b>${esc(s.redirect)}</b></div>`
      : s.purpose ? `<div class="bp">${esc(s.purpose)}</div>` : ''}
    <div class="bd">${s.doors.length ? esc(s.doors.join(' · ')) : '&mdash;'}</div>
  </div>`;
};

const ALIASES = ALIASES_KEY;
const byTab = {};
// render in the order a person reads the tab bar, not in whatever order the data arrived
for (const k of [...Object.keys(PROPOSED), ALIASES]) byTab[k] = [];
for (const s of screens) {
  const home = Object.entries(PROPOSED).find(([, v]) => v.screens.includes(s.route))?.[0] ?? ALIASES;
  byTab[home].push(s);
}
for (const k of Object.keys(byTab)) if (!byTab[k].length) delete byTab[k];

const html = `<!doctype html>
<meta charset="utf-8">
<title>Screen architecture — MoneyKeel</title>
<style>
 *{box-sizing:border-box}
 body{margin:0;background:#E7E9E5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
      color:${T.ink};padding:30px 26px 70px}
 h1{font-size:21px;margin:0 0 6px}
 h2{font-size:15px;margin:34px 0 4px;color:${T.deep};letter-spacing:.02em}
 .sub{font-size:13.5px;color:#44443f;line-height:1.6;max-width:1050px;margin:0 0 4px}
 .sub b{color:#000}
 .stamp{font-size:11.5px;color:${T.light};margin:8px 0 0}
 .legend{display:flex;gap:16px;flex-wrap:wrap;margin:14px 0 0;font-size:12px}
 .chip{padding:3px 9px;border-radius:4px;font-weight:700}
 .grid{display:flex;flex-wrap:wrap;gap:10px;margin-top:8px}
 .group{background:#fff;border-radius:12px;padding:12px 14px 14px;margin-top:12px;border:1px solid ${T.line}}
 .gh{font-size:11px;font-weight:800;letter-spacing:.06em;color:${T.deep};text-transform:uppercase}
 .gb{font-size:12px;color:${T.mid};margin-top:2px}
 .box{width:250px;border:1px solid;border-radius:9px;padding:9px 11px}
 .bt{font-size:12.5px;font-weight:800;font-family:ui-monospace,Menlo,monospace}
 .tag{font-size:9.5px;font-weight:800;letter-spacing:.05em;margin-top:3px}
 .bp{font-size:11px;color:${T.mid};line-height:1.45;margin-top:4px}
 .bd{font-size:10.5px;color:${T.light};margin-top:6px;border-top:1px solid ${T.line};padding-top:5px;line-height:1.4}
 table{width:100%;border-collapse:collapse;font-size:12.5px;background:#fff;margin-top:10px;
       border-radius:10px;overflow:hidden}
 th{background:${T.deep};color:#fff;text-align:left;padding:8px 10px;font-size:11px;letter-spacing:.04em}
 td{padding:8px 10px;border-bottom:1px solid ${T.line};vertical-align:top}
 td.mono{font-family:ui-monospace,Menlo,monospace;font-weight:700;white-space:nowrap}
 .banner{border-left:4px solid ${T.primary};background:#fff;padding:12px 15px;border-radius:0 9px 9px 0;
         font-size:13px;line-height:1.6;margin:10px 0 0;max-width:1050px}
 .banner.warn{border-left-color:${T.amber}}
 .banner b{color:#000}
</style>

<h1>Screen architecture</h1>
<p class="sub">
  <b>${REAL.length} screens</b>, plus ${screens.length - REAL.length} aliases and redirects. The top half is <b>measured from the code</b> — every route, every
  inbound link, read from <code>app/</code> and <code>src/</code>. The bottom half is <b>a
  recommendation</b> and is labelled as one. Regenerate any time with
  <code>node scripts/screen-map.mjs</code>.
</p>
<p class="stamp">Generated ${new Date().toISOString().slice(0, 10)} · ${counts.stranded ?? 0} with no way in ·
  ${counts.single ?? 0} with a single door · ${counts.conditional ?? 0} conditional</p>

<div class="legend">
  <span class="chip" style="background:#DFF2E9;color:${T.deep}">IN THE TAB BAR</span>
  <span class="chip" style="background:#fff;color:${T.ink};border:1px solid ${T.line}">well connected</span>
  <span class="chip" style="background:${T.amberLt};color:${T.amber}">ONE DOOR &middot; fragile</span>
  <span class="chip" style="background:${T.amberLt};color:${T.amber}">ONLY IF IT FIRES</span>
  <span class="chip" style="background:${T.redLt};color:${T.red}">NO WAY IN</span>
</div>

<div class="banner warn">
  <b>Why this document exists.</b> Every reachability problem so far was found by accident, one at a
  time, while looking for something else: <code>/big-costs</code> was fully built and reachable from
  nowhere; Tips and Rewards have been stranded since the August menu trim; three screens appear only
  if an insight fires. A map that regenerates itself turns those from discoveries into a number at the
  top of a page.
</div>

<h2>A &middot; As it is today — measured</h2>
<p class="sub">Grouped by where each screen would live under the proposal, so the two views line up.
  The bottom line of each box is <b>every door that exists today</b>.</p>
${Object.entries(byTab).map(([tab, list]) => `
<div class="group">
  <div class="gh">${esc(tab)}</div>
  ${PROPOSED[tab]?.blurb ? `<div class="gb">${esc(PROPOSED[tab].blurb)}</div>` : ''}
  <div class="grid">${list.map(card).join('')}</div>
</div>`).join('')}

<h2>B &middot; What should move — a recommendation</h2>
<p class="sub">Not measured. This is my proposal, and each row says why.</p>
<table>
 <tr><th>Screen</th><th>Today</th><th>Proposed</th><th>Why</th></tr>
 ${MOVES.map(([s, from, to, why]) => `<tr><td class="mono">/${esc(s)}</td><td>${esc(from)}</td>
   <td><b>${esc(to)}</b></td><td>${esc(why)}</td></tr>`).join('')}
</table>

<h2>C &middot; Decisions for the founder</h2>
<table>
 <tr><th>The question</th><th>What is true today</th><th>The choice</th></tr>
 ${DECISIONS.map(([q, now, choice]) => `<tr><td><b>${esc(q)}</b></td><td>${esc(now)}</td>
   <td>${esc(choice)}</td></tr>`).join('')}
</table>

<div class="banner">
  <b>How to trust this page.</b> The top half is generated, so it cannot drift from the code — if a
  screen loses its last door, this page says so the next time it is run. The middle and bottom halves
  are written by hand and change only when someone decides something.
</div>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
const placed = new Set(Object.values(PROPOSED).flatMap((v) => v.screens));
const unplaced = REAL.filter((s) => !placed.has(s.route)).map((s) => s.route);
console.log(`screen-architecture.html · ${REAL.length} screens + ${screens.length - REAL.length} aliases/redirects`);
console.log(`  no way in     : ${REAL.filter((s) => s.health === 'stranded').map((s) => s.route).join(', ') || 'none'}`);
console.log(`  only if fires : ${REAL.filter((s) => s.health === 'conditional').map((s) => s.route).join(', ') || 'none'}`);
console.log(`  single door   : ${REAL.filter((s) => s.health === 'single').map((s) => s.route).join(', ') || 'none'}`);
if (unplaced.length) console.log(`  NOT PLACED in the proposal: ${unplaced.join(', ')}`);
