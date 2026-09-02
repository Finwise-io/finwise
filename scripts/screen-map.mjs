// SCREEN ARCHITECTURE MAP — generated, never drawn by hand.
//
// Founder, 2026-08-14: "We have built a lot of features but we are missing proper organization."
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
  '(tabs)/tips': 'saved for future use (founder 2026-08-14)',
  '(tabs)/rewards': 'saved for future use (founder 2026-08-14)',
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

/** THE NAME A PERSON SEES. Route keys were deliberately never renamed when the tabs were — `invest`
 *  IS the Performance tab and `analytics` IS Net worth (see constants/tabs.ts). Printing the raw key
 *  makes the page look like the rename was forgotten, so every box shows the human name and keeps
 *  the route underneath it as the technical detail it is. */
const titleOf = (route) => {
  const key = route.replace('(tabs)/', '');
  const tab = tabBar.find((t) => t.key === key && route.startsWith('(tabs)/'));
  if (tab) return `${tab.title} tab`;
  return key.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
};

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

/** SUB-TABS LIVE INSIDE A SCREEN, NOT IN THE ROUTER — so a route-based map is blind to them. The
 *  founder spotted this immediately: Cash flow has four (This month · Income · Spending · Debts) and
 *  the first version of this page showed none of them, which makes the map look thinner than the app.
 *
 *  Which arrays are navigation and which are input controls cannot be told apart automatically — a
 *  screen's ['weekly','biweekly','monthly'] is a frequency picker, not a sub-tab. So the SCREENS are
 *  declared here by hand, and the LABELS are then read out of the code, which means adding a tab
 *  updates this page on the next run. Anything tab-shaped and undeclared is reported at the end. */
/** `true` = the code's array IS the labels, so read them from source and they stay current.
 *  An array = the code holds internal keys and computes the labels, so they are written here. */
const HAS_SUB_TABS = {
  '(tabs)/cashflow': true,
  // NetWorthScreen's array is ['type','account'] and the labels are computed in a ternary beside it —
  // printing the keys would show a reader plumbing instead of what the tabs say.
  '(tabs)/analytics': ['By class', 'By institution'],
};

/** Tab-SHAPED arrays that are not navigation, each judged once so the warning below stays worth
 *  reading. A warning that fires on things already decided is noise, and noise gets muted — which is
 *  how the orphan guard went unheeded three times. */
const NOT_SUB_TABS = {
  AccountDetailScreen: 'asset-class filter chips, not tabs',
  BudgetScreen: 'the embedded Activity/Budget/Debts strip, shown inside Cash flow rather than on its own',
  ConnectFlowScreen: 'update-vs-new branch in the connect flow',
  ExpenseScreen: 'how often the expense repeats',
  IncomeManagerScreen: 'annual-vs-monthly display toggle',
  IncomeScreen: 'how often the income arrives',
  SettingsScreen: 'the Simple / Advisor lens switch',
};
/** Not built — the founder's 2026-08-14 split, shown so the proposal is visible beside what exists. */
const PROPOSED_SUB_TABS = { '(tabs)/plan': ['Retire', 'Goals', 'Prepare'] };

function subTabsOf(route) {
  const decl = HAS_SUB_TABS[route];
  if (!decl) return null;
  if (Array.isArray(decl)) return decl;
  const screen = sources.find((s) => s.name === backingModule(route));
  const m = screen?.src.match(/\(\[((?:\s*'[^']+',?)+)\]\s+as const\)\.map/);
  if (!m) return null;
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

/** Screens holding a tab-shaped array that nobody has declared either way. */
function undeclaredTabCandidates() {
  const out = [];
  for (const s of sources.filter((x) => x.rel.startsWith('src/screens/'))) {
    const m = s.src.match(/\(\[((?:\s*'[^']+',?)+)\]\s+as const\)\.map/);
    if (!m) continue;
    const route = live.find((r) => backingModule(r) === s.name);
    if (!route || HAS_SUB_TABS[route] || NOT_SUB_TABS[s.name]) continue;
    out.push(`${s.name}: [${m[1].replace(/\s+/g, ' ').trim()}]`);
  }
  return out;
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
  return { route: r, doors, health, alias, redirect, subTabs: subTabsOf(r), purpose: purposeOf(r), keep: DELIBERATE_KEEPS[r] ?? null };
});

// ── THE AUTHORED HALF — a recommendation, not a measurement ───────────────────────────────────
// Everything below this line is my proposal for where each screen belongs. It is NOT read from the
// code and must never be presented as if it were.

const ALIASES_KEY = 'Second routes & redirects';
/** WHAT EACH SCREEN DOES, in a sentence a person would say out loud.
 *  AUTHORED, not generated. The script can pull each screen's opening comment automatically, and it
 *  does as a fallback — but those are engineer's notes ("Phase B", "Mock C", "GROUPED BY THEME") and
 *  the founder asked what these screens DO. Anything missing here falls back to the comment and is
 *  reported at the end of a run, so the list cannot silently rot. */
const WHAT_IT_DOES = {
  '(tabs)/home': 'Where you stand today, in two seconds.',
  insights: 'Ranked nudges drawn from your own numbers, grouped by theme.',
  sharpen: "What your plan is still missing, and the three ways to fill it in.",
  '(tabs)/analytics': 'Everything you own minus everything you owe — and where accounts get added.',
  'account-detail': 'One account: what it holds, what it is worth, what has moved through it.',
  'add-account': 'Add or edit an account by hand.',
  bonds: 'Individual bonds and CDs — coupon, maturity, yield.',
  connect: 'Link a bank or brokerage, read-only.',
  'import-holdings': 'Read a brokerage CSV export and add what it finds.',
  itemize: 'Break a lump-sum account into the holdings actually inside it.',
  'other-investments': 'Crypto, private equity, gold, annuities and other alternatives.',
  '(tabs)/invest': 'How each holding has done against the market over the same stretch of time.',
  'holding-detail': 'One ticker: price, graph, what you paid, what it is worth now.',
  'look-back': 'What would have happened if you had moved money earlier.',
  '(tabs)/cashflow': 'Money in and money out, month by month.',
  'bill-calendar': 'Every dated bill across the next twelve months, with a running balance.',
  'month-detail': 'Why one particular month looks the way it does.',
  expense: 'Add an expense, by hand or by scanning the receipt.',
  'income-manager': 'Every income source you have entered, in one place.',
  'monthly-income': 'Social Security, pension and annuity — where a retiree’s income comes from.',
  'paycheck-months': 'The twelve months behind the retirement paycheck.',
  'base-pay': 'Your base pay — a section for each person who earns a wage: how often they are paid, whether it varies, the gross, the 401(k) and what lands in the bank.',
  'filing-status': 'How you file your taxes, and who on the return is 65 or older — the two answers every tax estimate in the app depends on.',
  'income-summary': 'Your income, all of it — what lands in your bank each month, and what the year is taxed on. Two totals, never one.',
  'worth-a-look': 'A calm close-up of one flagged transaction.',
  '(tabs)/plan': 'Will the money last, and the decisions in front of you.',
  '(tabs)/retirement': 'The cockpit — sliders, and two scenarios side by side.',
  'will-it-last': 'Opens the hood on the odds: every input, and where each number came from.',
  'ss-timing': 'Claim Social Security at 62, 67 or 70 — in your own dollars.',
  roth: 'Convert to a Roth: the tax now, against what it saves later.',
  'required-withdrawals': 'What the law forces out of pre-tax accounts, and marking it done.',
  'big-costs': 'One-time costs you know are coming — a roof, a car, a wedding.',
  'what-if': 'What happens to your odds if you put more away.',
  'contribution-room': 'How much room is left in your tax-advantaged accounts this year.',
  '(tabs)/goals': 'Save-by-date goals, and a plan for paying debt down.',
  'multi-goal': 'Weighing several goals against each other when they cannot all win.',
  education: 'What college will cost, and whether you are on track for it.',
  insurance: 'How much life cover would actually protect your family.',
  estate: 'The documents and beneficiary designations to get in order.',
  'tax-organizer': 'A year-end summary and document checklist to hand your accountant.',
  credit: 'Your credit utilisation, your score band, and the habits that move them.',
  'stress-test': 'Could you absorb a sudden bill — and how long would you last.',
  jobsafety: 'How long your money holds if the income stops.',
  '(tabs)/settings': 'Your account, security, connections and data.',
  '(tabs)/tips': 'LEGACY — short money tips. Written for a younger audience.',
  '(tabs)/rewards': 'LEGACY — points and streaks. Written for a younger audience.',
  income: 'LEGACY — the older income-capture screen, replaced by the income manager.',
  'income-detail': 'LEGACY — a full breakdown of captured income.',
  invest: 'LEGACY — the pre-FCC investing screen, replaced by Performance.',
  savings: 'LEGACY — the onboarding "savings engine"; no way in once onboarding is done.',
};

const PROPOSED = {
  Home: { blurb: 'the two-second glance', screens: ['(tabs)/home', 'insights', 'sharpen'] },
  'Net worth': { blurb: 'everything you own and owe', screens: ['(tabs)/analytics', 'account-detail', 'add-account', 'itemize', 'bonds', 'other-investments', 'import-holdings', 'connect'] },
  Performance: { blurb: 'how it is doing', screens: ['(tabs)/invest', 'holding-detail', 'look-back'] },
  'Cash flow': { blurb: 'money in, money out', screens: ['(tabs)/cashflow', 'bill-calendar', 'month-detail', 'expense', 'income-manager', 'monthly-income', 'paycheck-months', 'base-pay', 'filing-status', 'income-summary', 'worth-a-look'] },
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
  ['insights', 'the ☰ menu only', 'Home', 'FOUNDER AGREED 2026-08-14. The app\'s ranked "here is what to look at", currently found only by opening a menu. Home is the two-second glance; this is what it should be glancing at.'],
  ['sharpen', 'the Plan tab', 'Home', 'FOUNDER AGREED 2026-08-14. What your plan is still missing belongs where a person lands, not one tab in. Home links to neither of these today.'],
  ['what-if', 'Performance', 'Plan · Retire', 'It asks what happens to your retirement odds if you save more. It has never been reachable from Plan.'],
  ['contribution-room', 'an insight only', 'Plan · Retire', 'How much 401(k) room is left is useful whether or not an insight noticed.'],
  ['multi-goal', 'Plan (buried)', 'Plan · Goals', 'It is the screen for weighing college against the mortgage — the front door of Goals, not a link off will-it-last.'],
  ['stress-test', 'Plan (top level)', 'Plan · Prepare', 'An emergency-cash question, not a retirement one. Founder agreed 2026-08-14.'],
  ['jobsafety', 'Settings only', 'Plan · Prepare', 'Same family as the insurance check, and its other door (Tips) is dead.'],
  ['credit', 'Goals', 'Plan · Prepare', 'Founder added it 2026-08-14, reversing the August menu trim for this audience.'],
  ['worth-a-look', 'an insight only', 'Cash flow', 'It is a transaction close-up. It belongs with the transactions.'],
  ['monthly-income', 'Plan-side screens', 'BOTH — by lens', 'FOUNDER RULED 2026-08-14. For someone RETIRED this is their actual income, so it belongs in Cash flow › Income. For someone still WORKING it is a future number they are planning around, so it belongs in Plan › Retire. Same screen, two homes, decided by the lens the app already switches on.'],
];

const DECISIONS = [
  ['Tips and Rewards are stranded',
   'TIPS shows short money tips; REWARDS shows points and streaks. Both were written for a younger audience, both were trimmed from the menu on 2026-08-02, and nothing has linked either since. JOB SAFETY — how long your money holds if the income stops — was collateral: Tips was one of its two doors, so Settings is now the only way in.',
   'Retire all three the way /income was (recorded keeps, with the reason), or give them doors. Job safety already has a proposed home in Prepare.'],
  ['/savings can only be opened during onboarding',
   'The "savings engine" from the onboarding summary — a rate-and-target calculator. Its only link is that summary, so once a person finishes onboarding they can never open it again. It is not in the stranded list because a link does exist; it is simply unreachable in practice.',
   'Give it a door, fold what it does into Cash flow, or record it as retired.'],
  ['Where does monthly income belong?',
   'MONTHLY INCOME is where Social Security, a pension and an annuity get entered — the sources behind a retiree’s paycheck. It is linked from four Plan-side screens, but it captures income rather than answering a retirement question.',
   'Cash flow, which is where income lives (my lean), or keep it in Plan · Retire.'],
  ['Does Plan really need three sub-tabs?',
   'Retire is the entire redesign — nine screens. Goals is three, Prepare is six, and both are existing screens being regrouped rather than rebuilt.',
   'Three sub-tabs, or one Retire surface with Goals and Prepare left in the ☰ menu.'],
  ['Eight screens have exactly one door',
   'Big costs, will-it-last, credit, itemize, expense, insights, paycheck-months and settings. Each is one deleted link from being unreachable — precisely how big costs broke last week.',
   'Accept it, now that the guard catches it the moment it happens, or add a second door to the ones that matter most.'],
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
    <div class="bt">${esc(titleOf(s.route))}</div>
    <div class="br">/${esc(s.route)}</div>
    ${tag ? `<div class="tag" style="color:${fg}">${tag}${s.keep ? ` · ${esc(s.keep)}` : ''}</div>` : ''}
    ${s.alias ? `<div class="bp">the same screen as <b>${esc(titleOf(s.alias))}</b></div>`
      : s.redirect ? `<div class="bp">forwards to <b>${esc(s.redirect)}</b></div>`
      : `<div class="bp">${esc(WHAT_IT_DOES[s.route] ?? s.purpose)}</div>`}
    ${s.subTabs ? `<div class="st">${s.subTabs.map((t) => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
    ${PROPOSED_SUB_TABS[s.route] ? `<div class="st prop">${PROPOSED_SUB_TABS[s.route].map((t) => `<span>${esc(t)}</span>`).join('')}<i>proposed</i></div>` : ''}
    <div class="bd">${s.doors.length ? esc(s.doors.join(' · ')) : '&mdash;'}</div>
  </div>`;
};

const ALIASES = ALIASES_KEY;

/** WHERE A PERSON ACTUALLY FINDS THIS SCREEN — measured, and the only thing View A is allowed to be
 *  grouped by. The first version grouped View A by each screen's PROPOSED home so the two views
 *  would line up, which put Insights and Sharpen inside a box headed "Home" in a section labelled
 *  "measured" — and Home links to neither. The founder caught it. A shape that says one thing while
 *  the small print says another is the same defect I flagged in the design handoff's gauges: the eye
 *  believes the shape. If the two views no longer line up, THAT GAP IS THE FINDING. */
const TAB_DOORS = { Home: 'Home', NetWorth: 'Net worth', Performance: 'Performance', CashFlow: 'Cash flow', PlanHub: 'Plan' };
function reachedFrom(s) {
  if (s.health === 'bar') return 'The tab bar itself';
  if (s.health === 'alias' || s.health === 'redirect') return ALIASES;
  if (!s.doors.length) return 'Nowhere — no way in';
  const tab = s.doors.find((d) => TAB_DOORS[d]);
  if (tab) return `From the ${TAB_DOORS[tab]} tab`;
  if (s.doors.includes('the ☰ menu')) return 'From the ☰ menu';
  if (s.doors.every((d) => CONDITIONAL.includes(d))) return 'Only when the data offers it';
  return 'Deeper in — from another screen';
}
const REACH_ORDER = ['The tab bar itself', 'From the Home tab', 'From the Net worth tab',
  'From the Performance tab', 'From the Cash flow tab', 'From the Plan tab', 'From the ☰ menu',
  'Deeper in — from another screen', 'Only when the data offers it', 'Nowhere — no way in', ALIASES];
const REACH_BLURB = {
  'The tab bar itself': 'always one tap away',
  'From the ☰ menu': 'found only by opening the menu',
  'Deeper in — from another screen': 'you have to already be somewhere else',
  'Only when the data offers it': 'an insight, a nudge or onboarding has to offer it — otherwise a person never meets it',
  'Nowhere — no way in': 'built, registered, and unreachable',
};
// VIEW A groups by where a screen is REACHED FROM — measured. Nothing here is arranged by proposal.
const byReach = {};
for (const k of REACH_ORDER) byReach[k] = [];
for (const s of screens) byReach[reachedFrom(s)].push(s);
for (const k of Object.keys(byReach)) if (!byReach[k].length) delete byReach[k];

// the every-screen table still needs each screen's PROPOSED home — that is a separate question
const proposedHome = (route) =>
  Object.entries(PROPOSED).find(([, v]) => v.screens.includes(route))?.[0] ?? ALIASES;

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
 .bt{font-size:12.5px;font-weight:800}
 .br{font-size:10px;color:${T.light};font-family:ui-monospace,Menlo,monospace;margin-top:1px}
 .tag{font-size:9.5px;font-weight:800;letter-spacing:.05em;margin-top:3px}
 .bp{font-size:11px;color:${T.mid};line-height:1.45;margin-top:4px}
 .st{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;align-items:center}
 .st span{font-size:9.5px;font-weight:700;background:${T.bg};border:1px solid ${T.line};border-radius:9px;padding:2px 7px}
 .st.prop span{background:#DFF2E9;border-color:#0850411f;color:${T.deep}}
 .st i{font-size:9px;font-style:normal;color:${T.light}}
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
<p class="sub">Grouped by <b>where a person actually finds it</b> — measured, not proposed. The bottom
  line of each box lists <b>every</b> door that exists today. Where this view and the proposal below
  disagree, that gap is the finding.</p>
${Object.entries(byReach).map(([where, list]) => `
<div class="group">
  <div class="gh">${esc(where)} &nbsp;<span style="font-weight:600;opacity:.7">${list.length}</span></div>
  ${REACH_BLURB[where] ? `<div class="gb">${esc(REACH_BLURB[where])}</div>` : ''}
  <div class="grid">${list.map(card).join('')}</div>
</div>`).join('')}

<h2>B &middot; What should move — a recommendation</h2>
<p class="sub">Not measured. This is my proposal, and each row says why.</p>
<table>
 <tr><th>Screen</th><th>Today</th><th>Proposed</th><th>Why</th></tr>
 ${MOVES.map(([s, from, to, why]) => `<tr><td class="mono">/${esc(s)}</td><td>${esc(from)}</td>
   <td><b>${esc(to)}</b></td><td>${esc(why)}</td></tr>`).join('')}
</table>

<h2>D &middot; Every screen — what it does, and whether it moves</h2>
<p class="sub">The <b>what it does</b> column is written by hand; everything else is measured.
  <b>${REAL.filter((x) => !MOVES.some((m) => m[0] === x.route) && !PROPOSED['Legacy — awaiting a ruling'].screens.includes(x.route)).length} of ${REAL.length} screens stay exactly where they are</b>,
  ${MOVES.length} move, and ${PROPOSED['Legacy — awaiting a ruling'].screens.length} are waiting on a ruling.</p>
<table>
 <tr><th>Screen</th><th>What it does today</th><th>Lives in</th><th>Moving?</th></tr>
 ${screens.map((x) => { const tab = proposedHome(x.route);
   const move = MOVES.find((m) => m[0] === x.route);
   const note = x.alias ? `second route to ${titleOf(x.alias)}`
     : x.redirect ? 'forwards elsewhere'
     : move ? `<b>moves</b> &mdash; ${esc(move[3])}`
     : tab.startsWith('Legacy') ? '<b>awaiting your ruling</b>' : 'stays';
   return `<tr><td class="mono">${esc(titleOf(x.route))}</td>
     <td>${esc(WHAT_IT_DOES[x.route] ?? x.purpose)}</td>
     <td>${esc(tab)}</td>
     <td${move ? ' style="background:#FDF1DC"' : ''}>${note}</td></tr>`;
 }).join('')}
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
const undescribed = REAL.filter((s) => !WHAT_IT_DOES[s.route]).map((s) => s.route);
const cands = undeclaredTabCandidates();
if (cands.length) console.log(`  TAB-SHAPED ARRAYS NOT DECLARED as sub-tabs (check each): ${cands.join(' | ')}`);
if (undescribed.length) console.log(`  NO PLAIN-ENGLISH DESCRIPTION (falling back to the code comment): ${undescribed.join(', ')}`);
