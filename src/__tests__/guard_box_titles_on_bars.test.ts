/** EVERY BOX TITLE ON A DARK-GREEN BAR, EVERY SUB-TITLE ON A LIGHT-GREEN BAR (his words, 2026-10-27, DEC-8839: "the standard design
 *  says box titles in dark green bar, and sub-titles in light green bar" — said of Contribution room and the Stress test; the lead's
 *  ruling R1 makes it app-wide; the screen-design standard, section 2.3, carries it).
 *
 *  WHY A NEW GUARD (2026-10-27, FX-PLAN). The two bar guards that existed check WHERE a bar sits — guard_bands_edge_to_edge (a bar in
 *  a card reaches the card's edges) and guard_band_never_beside_title (a bar is never in a row). Neither looks at a heading that is
 *  NOT a bar. Contribution room drew each box's title as a bold black line and the Stress test as a plain heading, and both guards
 *  read green, because there was no bar to check. This one reads every heading that is drawn some other way.
 *
 *  WHAT IT READS — the disk, never a list from memory:
 *  - THE SCREENS OF THE THREE MODULES, PLUS THIS ROUND'S FIVE: Net worth, Performance and Cash flow (his scope of 2026-10-01, DEC-0649,
 *    and the screen record), three of the four Plan screens drawn from the build (Roth conversion, Required withdrawals, the Retirement
 *    cockpit — Goals waits, see WAITS) and Contribution room and the Stress test. That list is CHECKED against the figure register: every screen that prints a
 *    Net worth, Performance or Cash flow figure must be in it or named below as waiting for its own round, or the build fails.
 *  - every component and sign-up file those screens import, followed through their imports — a heading drawn by a shared sheet is a
 *    heading on the screen that opens it. The Menu (TopBar.tsx's sheet) waits with the Menu.
 *  - every other screen, component, sign-up and route file, for the ratchet at the bottom.
 *
 *  WHAT COUNTS AS A HEADING DRAWN WITHOUT ITS BAR — four shapes, all read through the TypeScript parser:
 *  1. a quiet label: `<SectionBand quiet …>` — deep-green capitals with no fill, the 2026-08-13 rule (DEC-0132) that DEC-8839 replaces;
 *  2. a `<Text>` drawn as capitals: its style sets textTransform 'uppercase', or is 13 points or less, bold, letter-spaced; or the
 *     words written in it are capitals;
 *  3. a `<Text>` whose style is NAMED as a heading — section, heading, header, hdr, kicker, eyebrow, divider, title (Contribution
 *     room's box titles were `s.title`, 17-point black), and the cockpit's `liK`;
 *  4. a `<SectionHeader>` (src/components/UI.tsx), a heading drawn as a plain line.
 *  Shapes 2 and 3 also catch words that are NOT box titles — a table's column names, the label of a hero figure, a tag, a sheet's own
 *  title. So every one found is given its ROLE below, by file and style, and a heading the table does not name fails the build:
 *  a guard that skips what it does not recognise reports clean while looking at a fraction (the standing order of 2026-09-28).
 *  5. a dark bar on the page of a screen with margins must take the margins back and run edge to edge of the phone, as Net worth's
 *     step-by-step bars do (`marginHorizontal: -Spacing.lg` around the bar). A bar inside a card is guard_bands_edge_to_edge's.
 *
 *  WHAT IT CANNOT SEE, SAID PLAINLY: a box title in mixed case whose style has a name that says nothing (`lbl`, `q`). The rendered
 *  drawings' own tests (src/testing/bandGeometry.ts, on the cockpit) and the drawing-match audits are the check for those.
 *  It does not judge whether a bar is dark where it should be light — which bar is a box's and which a sub-title's is in each drawing.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const ROOT = path.join(__dirname, '..', '..');
const rel = (f: string) => path.relative(ROOT, f);
const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  if (e.isDirectory()) return e.name === '__tests__' || e.name === 'node_modules' ? [] : walk(p);
  return /\.tsx$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
});
const ALL = ['src/screens', 'src/components', 'src/onboarding', 'app'].map((d) => path.join(ROOT, d)).flatMap(walk);

// ── THE SCOPE ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const SCOPE: Record<string, string[]> = {
  'Net worth': ['NetWorthScreen', 'AccountPortfolioScreen', 'ItemizeScreen', 'HoldingDetailScreen', 'BondsScreen', 'OtherInvestmentsScreen', 'AddAccountScreen'],
  'Performance': ['PerformanceScreen', 'LookBackScreen'],   // and the account page, AccountPortfolioScreen, read once under Net worth
  'Cash flow': ['CashFlowScreen', 'BudgetScreen', 'IncomeManagerScreen', 'MonthlyIncomeScreen', 'BillCalendarScreen', 'BasePayScreen',
    'IncomeSummaryScreen', 'IncomeDetailScreen', 'FilingStatusScreen'],
  'Plan — Roth conversion, Required withdrawals and the Retirement cockpit (FX-PLAN, 2026-10-27)': ['RothScreen', 'RequiredWithdrawalsScreen', 'RetirementCockpit'],
  'Contribution room and the Stress test (FX-CF-C, 2026-10-27)': ['ContributionRoomScreen', 'StressTestScreen'],
};
/** Screens that print a figure of the three modules but wait for their own round — Home, Plan and Menu by his order of 2026-10-03;
 *  sign-up is its own flow. Files of theirs are read for the ratchet, not held to zero. */
export const WAITS: Record<string, string> = {
  HomeScreen: 'Home', PlanHubScreen: 'Plan', InsightsScreen: 'Menu', JobSafetyScreen: 'Menu', OnboardingScreen: 'sign-up',
  // the lead, 2026-10-27: Goals shipped in Build 53 from his approved Plan design (v4, August 14th Design/design_handoff_net_worth/
  // Plan.dc.html with PLAN-REDESIGN-BRIEF-v3-2026-08-14.md), so a drawing made from today's code is the wrong starting point
  GoalsScreen: 'waits on the Plan v4 comparison, DEC to follow',
  TopBar: 'Menu (its sheet is the Menu)',
};

const byName = new Map(ALL.map((f) => [path.basename(f, '.tsx'), f]));
/** the scope's files: the screens, then every component or sign-up file they import, followed through, the waiting ones left out */
export function scopeFiles(): string[] {
  const seen = new Set<string>();
  const queue = Object.values(SCOPE).flat().map((n) => { const f = byName.get(n); if (!f) throw new Error(`${n} is in the scope and is not on disk`); return f; });
  while (queue.length) {
    const f = queue.shift()!;
    if (seen.has(f)) continue;
    seen.add(f);
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/from\s+'(\.{1,2}\/[^']+)'/g)) {
      const target = path.resolve(path.dirname(f), m[1]) + '.tsx';
      const base = path.basename(target, '.tsx');
      if (fs.existsSync(target) && !WAITS[base] && ALL.includes(target) && !/\/app\//.test(target)) queue.push(target);
    }
  }
  return [...seen];
}

// ── READING ONE FILE ─────────────────────────────────────────────────────────────────────────────────────────────────────────
type Style = Record<string, string>;
export type Heading = { at: string; file: string; shape: 'quiet' | 'capitals' | 'named' | 'SectionHeader' | 'page bar short' | 'opens a card'; style: string; words: string };
// `cap` (2026-10-31, FX-CF-B, SU3-04): sign-up's bold black card titles were `s.cap`, a name this list did not hold, so six read green
const NAMED = /(section|heading|header|hdr|kicker|eyebrow|divider|title|^cap$|^lik$)/i;
const SIZE: Record<string, number> = { xs: 11, sm: 13, base: 15, md: 17, lg: 20, xl: 24, xxl: 30, hero: 38 };
const SPACE: Record<string, number> = { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32 };
const pts = (v: string | undefined, scale: Record<string, number>): number => {
  if (v == null) return NaN;
  const neg = /^-/.test(v.trim());
  const n = v.match(/^-?\s*(\d+(?:\.\d+)?)$/); if (n) return (neg ? -1 : 1) * Number(n[1]);
  const t = v.match(/\.(\w+)$/); return t && scale[t[1]] != null ? (neg ? -1 : 1) * scale[t[1]] : NaN;
};
const bold = (w: string | undefined) => !!w && (/^['"]?[789]00['"]?$/.test(w) || /bold|heavy|black/.test(w));

export function readFile(f: string): { headings: Heading[]; texts: number; textsWritten: number; bars: number; barsWritten: number } {
  const src = fs.readFileSync(f, 'utf8');
  const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const styles: Record<string, Style> = {};
  const visitStyles = (n: ts.Node) => {
    if (ts.isCallExpression(n) && /StyleSheet\.create$/.test(n.expression.getText(sf)) && n.arguments[0] && ts.isObjectLiteralExpression(n.arguments[0])) {
      for (const p of n.arguments[0].properties) {
        if (!ts.isPropertyAssignment(p) || !ts.isObjectLiteralExpression(p.initializer)) continue;
        const st: Style = {};
        for (const q of p.initializer.properties) if (ts.isPropertyAssignment(q)) st[(q.name as any).text ?? q.name.getText(sf)] = q.initializer.getText(sf).replace(/^['"]|['"]$/g, '');
        styles[(p.name as any).text ?? p.name.getText(sf)] = st;
      }
    }
    ts.forEachChild(n, visitStyles);
  };
  visitStyles(sf);
  const capsLook = (st: Style | undefined) => !!st && (st.textTransform === 'uppercase'
    || (pts(st.fontSize, SIZE) <= 13 && bold(st.fontWeight) && Number(st.letterSpacing) > 0));
  const attr = (el: ts.JsxOpeningLikeElement, name: string) => {
    const a = el.attributes.properties.find((p) => ts.isJsxAttribute(p) && (p.name as any).text === name) as ts.JsxAttribute | undefined;
    return a?.initializer ? a.initializer.getText(sf) : a ? 'true' : undefined;
  };
  const styleName = (el: ts.JsxOpeningLikeElement) => (attr(el, 'style') ?? '').match(/\b[A-Za-z_$][\w$]*\.(\w+)/)?.[1] ?? '';
  const headings: Heading[] = []; let texts = 0; let bars = 0;
  // what is WRITTEN, counted straight off the source, so the reader can be checked against it (2026-10-30): every `<Text` that is not
  // `<TextInput`, every `<SectionBand`
  const textsWritten = (src.match(/<Text[\s>/]/g) ?? []).length;
  const barsWritten = (src.match(/<SectionBand\b/g) ?? []).length;
  const lineOf = (n: ts.Node) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const visit = (n: ts.Node) => {
    const el = ts.isJsxSelfClosingElement(n) ? n : ts.isJsxElement(n) ? n.openingElement : null;
    if (el) {
      const tag = el.tagName.getText(sf);
      const at = `${rel(f)}:${lineOf(n)}`;
      if (tag === 'SectionBand') {
        bars += 1;
        const title = attr(el, 'title') ?? '';
        if (attr(el, 'quiet')) headings.push({ at, file: rel(f), shape: 'quiet', style: 'quiet', words: title });
        else if (!attr(el, 'inCard') && !attr(el, 'light')) {
          // 5. A DARK BAR ON THE PAGE: the margins of the page it is written in, taken back by the wrappers around it
          let p: ts.Node | undefined = n.parent; let bleed = 0; let inSurface = false; let page = NaN;
          while (p && !ts.isSourceFile(p)) {
            const pe = ts.isJsxElement(p) ? p.openingElement : null;
            if (pe) {
              const nm = styleName(pe); const st = styles[nm] ?? {};
              const mh = pts(st.marginHorizontal, SPACE); if (mh < 0) bleed += -mh;
              if (nm && (st.backgroundColor || st.borderTopWidth) && (st.padding || st.paddingHorizontal)) { inSurface = true; break; }
              const cc = (attr(pe, 'contentContainerStyle') ?? '').match(/\.(\w+)/)?.[1];
              if (cc) { const cs = styles[cc] ?? {}; page = pts(cs.paddingHorizontal ?? cs.padding, SPACE); break; }
            }
            p = p.parent;
          }
          if (!inSurface && page > 0 && bleed !== page)
            headings.push({ at, file: rel(f), shape: 'page bar short', style: '', words: `${title} — ${page - bleed} points short of each edge of the phone` });
        }
      }
      if (tag === 'SectionHeader') headings.push({ at, file: rel(f), shape: 'SectionHeader', style: 'SectionHeader', words: attr(el, 'title') ?? '' });
      if (tag === 'Text') texts += 1;   // with words in it or self-closing — every one written is read
      if (tag === 'Text' && ts.isJsxElement(n)) {
        const nm = styleName(el); const inline = attr(el, 'style') ?? '';
        const written = n.children.filter(ts.isJsxText).map((c) => c.getText(sf)).join(' ').replace(/\s+/g, ' ').trim();
        const words = n.children.map((c) => c.getText(sf)).join('').replace(/\s+/g, ' ').trim().slice(0, 70);
        const caps = capsLook(styles[nm]) || /uppercase/.test(inline) || (/[A-Z]{3,}/.test(written) && !/[a-z]/.test(written));
        if (caps) headings.push({ at, file: rel(f), shape: 'capitals', style: nm || '(inline)', words });
        else if (nm && NAMED.test(nm)) headings.push({ at, file: rel(f), shape: 'named', style: nm, words });
        // 6. WHAT OPENS A SIGN-UP CARD (2026-10-31, FX-CF-B, SU3-04): in src/onboarding, a <Text> that is the first thing inside a <Card>
        //    is a heading candidate whatever its style is named — a card's title there was bold black words under a name that says
        //    nothing (`cap`, `label`), so the shapes above could not see it. Each style found is given its role below.
        else if (/^src\/onboarding\//.test(rel(f)) && ts.isJsxElement(n.parent) && n.parent.openingElement.tagName.getText(sf) === 'Card'
          && n.parent.children.find((c) => ts.isJsxElement(c) || ts.isJsxSelfClosingElement(c)) === n)
          headings.push({ at, file: rel(f), shape: 'opens a card', style: nm || '(inline)', words });
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return { headings, texts, textsWritten, bars, barsWritten };
}

// ── WHAT EACH HEADING IS — read from the data on 2026-10-27 (every hit printed, then named one by one) ───────────────────────────
// Two roles break his rule: a BOX TITLE drawn without its dark bar, and a SUB-TITLE drawn without its light bar. Every other role is
// words that are not a heading of a box at all:
//   column header — names a table's columns ("CATEGORY · EARNED · RETURN")
//   figure label  — names the figure printed with it: a hero, a summary cell, a donut's centre ("NEST EGG", "TAKE-HOME / YEAR")
//   tag           — a small marker on a row or a figure ("pay first", "SANDBOX", "PROJECTION — an estimate, not a promise")
//   field label   — names a box to type in ("Amount", "When")
//   screen title  — a screen's or a step's one title, 20 points (the standard 2.2, held by guard_screen_title_size)
//   sheet title   — a sheet's, a dialog's or a pop-up's own title (the standard 2.3: "a sheet uses its sheet title")
//   row name      — the name of one row in a list: an account, a door to another screen, a choice, an insight
//   link          — words that are tapped ("Manage →")
//   notice        — the first words of a notice or a verdict ("OK — you stay ahead", "Nothing this month")
//   the bar       — the bar's own words, inside SectionBand.tsx (each quiet use is counted where it is written) and SectionHeader's
//   light bar by hand — a bar drawn on the light-green fill without the component (the account page's asset classes)
type Role = 'BOX TITLE' | 'SUB-TITLE' | 'column header' | 'figure label' | 'tag' | 'field label' | 'screen title' | 'sheet title'
  | 'row name' | 'link' | 'notice' | 'the bar' | 'light bar by hand';
const BREAKS: Role[] = ['BOX TITLE', 'SUB-TITLE'];
/** `file#style` (or `file#style#first words`, where one style carries two roles) → its role */
export const ROLE: Record<string, Role> = {
  // ── Net worth ──
  // AccountPortfolioScreen#cardHdr2 (BOND FACTS · IF INTEREST RATES MOVE · ABOUT THIS HOLDING · the 12-month return's card): on dark bars since 2026-10-30 (FX-NW)
  'AccountPortfolioScreen#classBandT': 'light bar by hand', // fill bandLight, square corners, the card's padding taken back
  'AccountPortfolioScreen#colHdr': 'column header', 'AccountPortfolioScreen#trioL': 'figure label',
  'AccountPortfolioScreen#maturedTitle': 'notice', 'AccountPortfolioScreen#sheetTitle': 'sheet title', 'AccountPortfolioScreen#title': 'sheet title',
  // ItemizeScreen#formHdr (ADD A HOLDING): on a dark bar since 2026-10-30 (FX-NW)
  'HoldingDetailScreen#kicker': 'figure label',            // NO LIVE PRICE — SHOWING WHAT YOU PAID, said with the value under it
  'BondsScreen#sumCellL': 'figure label', 'OtherInvestmentsScreen#sumCellL': 'figure label',
  // BondsScreen#sellTitle, OtherInvestmentsScreen#sellTitle ("🔻 Sell"): on light bars since 2026-10-30 (FX-NW)
  // NetWorthScreen#pickHdr (WHAT IT IS · A WHOLE ACCOUNT): on light bars since 2026-10-30 (FX-NW)
  'NetWorthScreen#chooserTitle': 'row name', 'NetWorthScreen#rowTitle': 'row name', 'NetWorthScreen#wizTitle': 'screen title',
  // ── Performance ──
  'PerformanceScreen#catHeadL': 'column header', 'PerformanceScreen#catHeadV': 'column header', 'PerformanceScreen#catHeadR': 'column header',
  'PerformanceScreen#chooserTitle': 'row name', 'PerformanceScreen#investTitle': 'screen title',
  'LookBackScreen#pastOnly': 'tag', 'LookBackScreen#pickLabel': 'field label',
  // ── Cash flow ──
  // CashFlowScreen#kicker and #cardHdr, BudgetScreen#kicker, #sectionTitle, #budgetCardTitle, #importTitle, #bucketName and
  // #limitBucketHdr, and BillCalendarScreen#cardTitle came off 2026-10-27 (FX-CF-A): their 21 box titles and sub-titles are on bars now,
  // and Monthly income's four quiet labels with them
  'CashFlowScreen#mTag': 'tag', 'CashFlowScreen#projTag': 'tag',
  'BudgetScreen#emptyTitle': 'notice', 'BudgetScreen#modalTitle': 'sheet title', 'BudgetScreen#payFirstTag': 'tag', 'BudgetScreen#sectionLink': 'link',
  'BillCalendarScreen#hCell': 'column header', 'BillCalendarScreen#verdictTitle': 'notice',
  // IncomeManagerScreen#band and modules#sectionLabel came off 2026-10-27 (FX-CF-B): their seven box titles are on bars now
  'IncomeDetailScreen#heroK': 'figure label',
  // modules#cap came off 2026-10-31 (FX-CF-B, SU3-04): its six card titles are on bars; what opens the other sign-up cards (shape 6),
  // and the two pop-ups' own titles:
  'modules#label': 'field label', 'modules#heroLabel': 'field label', 'modules#note': 'notice', 'modules#sheetTitle': 'sheet title',
  'modules#choiceTitle': 'row name', 'modules#srcTitle': 'row name', 'modules#title': 'screen title', 'modules#drawnTitle': 'screen title',
  // PaycheckCard#kicker (YOUR PAYCHECK, twice) and MoneySheets#catHdr, #allocSectionHdr (EVERYDAY · ONCE IN A WHILE · BILLS & FIXED · MORE,
  // GOALS, ACCOUNTS / INVESTING) came off 2026-10-30 (FX-SHARED): the box titles on dark bars, the sub-titles on light bars
  'MoneySheets#title': 'sheet title',
  'DataGapsBanner#gapTitle': 'row name', 'DataGapsBanner#sheetTitle': 'sheet title', 'DrawSteerSheet#title': 'sheet title',
  'KeyboardAwareSheet#title': 'sheet title', 'UseThisPlanSheet#title': 'sheet title',
  'UI#emptyTitle': 'notice', 'UI#infoTitle': 'sheet title', 'UI#sectionAction': 'link', 'UI#sectionTitle': 'the bar',
  'SectionBand#title': 'the bar', 'SectionBand#quietTitle': 'the bar', 'SectionBand#quietValue': 'the bar',
  'StressTestScreen#vTitle': 'notice',
  // ── Plan, the four drawn from the build ──
  'GoalsScreen#creditTitle': 'row name', 'GoalsScreen#dtiTitle': 'notice',
  'RetirementCockpit#heroK': 'figure label',               // the two hero boxes are themselves dark green; the words name the figure in each
  'RetirementCockpit#heroColLabel': 'figure label', 'RetirementCockpit#donutLab': 'figure label', 'RetirementCockpit#tHL': 'column header',
  'RetirementCockpit#sandboxTag': 'tag', 'RetirementCockpit#cmpTitle': 'sheet title',
  // ── outside the scope: the ratchet ──
  'AppLockGate#title': 'screen title', 'ErrorBoundary#title': 'screen title', 'InputModal#title': 'sheet title', 'RecoveryCodeModal#title': 'sheet title',
  'AuthScreen#cardTitle': 'screen title', 'AuthScreen#restoreTitle': 'sheet title',
  'ConnectFlowScreen#equalHdr': 'BOX TITLE',
  'CreditScreen#cardTitle': 'BOX TITLE', 'CreditScreen#habitTitle': 'row name',
  'EstateScreen#itemTitle': 'row name', 'ExpenseScreen#emptyTitle': 'notice', 'ExpenseScreen#scanTitle': 'row name',
  'HomeScreen#doorTitle': 'row name', 'HomeScreen#heroKicker': 'figure label', 'HomeScreen#needTitle': 'row name',
  'ImportHoldingsScreen#cardTitle': 'BOX TITLE',
  'InsightsScreen#detailHdr': 'SUB-TITLE', 'InsightsScreen#sheetTitle': 'sheet title', 'InsightsScreen#title': 'row name',
  'OnboardingScreen#choiceTitle': 'row name', 'OnboardingScreen#heading': 'screen title',
  'PlanPrepare#title': 'row name',   // PlanGoals' two came off 2026-10-31: the Goals sub-tab is built to goals v03, every heading on a bar (FX-PLAN)
  'PlanHubScreen#nextKicker': 'tag', 'PlanHubScreen#nextTitle': 'row name', 'PlanHubScreen#rowDue': 'tag', 'PlanHubScreen#rowTitle': 'row name',
  'RewardsScreen#sectionTitle': 'BOX TITLE', 'RewardsScreen#subsection': 'SUB-TITLE',
  'SettingsScreen#delTitle': 'sheet title', 'SettingsScreen#modalTitle': 'sheet title', 'SettingsScreen#feedbackTitle': 'row name',
  'SettingsScreen#disclaimerTitle': 'BOX TITLE', 'SettingsScreen#sectionTitle': 'BOX TITLE',
  'SharpenPlanScreen#doorTitle': 'row name', 'SnapTradeConnect#kicker': 'BOX TITLE',
  'SsTimingScreen#th': 'column header', 'SsTimingScreen#label#Effect on will-my-money-last': 'BOX TITLE', 'SsTimingScreen#label': 'field label',
  'Summary#badgeTxt': 'tag', 'Summary#heroTitle': 'screen title', 'Summary#kicker': 'tag', 'Summary#modTitle': 'row name',
  'TipsScreen#sectionTitle': 'BOX TITLE', 'TipsScreen#summaryTitle': 'BOX TITLE', 'TipsScreen#aiTitle': 'BOX TITLE', 'TipsScreen#nudgeTitle': 'BOX TITLE',
  'TipsScreen#tipTitle': 'row name',
  'TopBar#groupHdr': 'SUB-TITLE', 'TopBar#sTitle': 'sheet title',
};

const keyOf = (h: Heading) => `${path.basename(h.file, '.tsx')}#${h.style}`;
const roleOf = (h: Heading): Role | undefined => {
  const k = keyOf(h);
  const named = Object.keys(ROLE).find((r) => r.startsWith(`${k}#`) && h.words.includes(r.slice(k.length + 1)));
  return named ? ROLE[named] : ROLE[k];
};
/** a heading drawn without its bar: a quiet label, a dark bar short of the phone's edges, or a heading whose role breaks the rule */
const breaks = (h: Heading) => h.shape === 'quiet' || h.shape === 'page bar short' || h.shape === 'SectionHeader' || BREAKS.includes(roleOf(h) as Role);
const say = (h: Heading) => `${h.at} — ${h.shape === 'quiet' ? 'a quiet label, no bar' : h.shape === 'page bar short' ? 'a dark bar'
  : h.shape === 'SectionHeader' ? 'a plain-line heading' : `${roleOf(h)} drawn as ${h.shape === 'capitals' ? 'grey capitals' : 'a plain line'}`}: ${h.words}`;

function readAll() {
  const inScope = new Set(scopeFiles());
  const read = ALL.map((f) => ({ f, ...readFile(f) }));
  return { inScope, read, headings: read.flatMap((r) => r.headings) };
}

test('the scope is the disk’s: every screen that prints a Net worth, Performance or Cash flow figure is in it, or named as waiting', () => {
  const figs = JSON.parse(fs.readFileSync(path.join(ROOT, 'Calculation Module code/scripts/moneykeel_figures.json'), 'utf8')).figures;
  const routeFile: Record<string, string> = {};
  for (const f of ALL.filter((x) => /\/app\//.test(x) && !/\/_/.test(x))) {
    const m = fs.readFileSync(f, 'utf8').match(/screens\/([A-Za-z]+)/);
    if (m) routeFile['/' + path.basename(f, '.tsx')] = m[1];
  }
  const printed = new Set<string>(); const unmapped: string[] = [];
  for (const [id, f] of Object.entries<any>(figs)) {
    if (!/^MK-(NW|PF|CF)-/.test(id) || !f || typeof f !== 'object') continue;
    for (const r of f.screens ?? []) (routeFile[r] ? printed.add(routeFile[r]) : unmapped.push(`${id} ${r}`));
  }
  const inScope = new Set(Object.values(SCOPE).flat());
  expect([...printed].filter((s) => !inScope.has(s) && !WAITS[s]).sort()).toEqual([]);
  // the one route the register names that no route file draws: /networth, the Net worth tab's old name (the tab is /analytics)
  // (/goals left the register 2026-11-01: no figure names it since its route file only sends a person to Plan · Goals, goals v03)
  expect([...new Set(unmapped.map((u) => u.split(' ')[1]))].sort()).toEqual(['/networth']);
  // A GUARD MUST PROVE IT LOOKED: the register was read, and the scope reaches what it prints
  expect(printed.size).toBeGreaterThanOrEqual(20);
  expect(Object.values(SCOPE).flat()).toHaveLength(23);
});

test('every heading it finds has its role named — none is skipped (the standing order of 2026-09-28)', () => {
  const { headings } = readAll();
  const unnamed = headings.filter((h) => !['quiet', 'page bar short', 'SectionHeader'].includes(h.shape) && !roleOf(h)).map((h) => `${keyOf(h)} — ${h.at}: ${h.words}`);
  expect(unnamed).toEqual([]);
  // and every role written down is still found on the disk: a name that matches nothing any more is taken out, not left to hide
  const used = new Set(headings.map(keyOf));
  expect(Object.keys(ROLE).map((k) => k.split('#').slice(0, 2).join('#')).filter((k) => !used.has(k))).toEqual([]);
});

/** measured 2026-10-30 off the disk (see the test below), less a margin for headings turned into bars: never typed from memory */
const TEXTS_FLOOR = 1_650; const BARS_FLOOR = 130;   // 2026-10-30: 1,744 texts and 140 bars, read = written in all 48 files
test('what it read in the scope: the 23 screens and every file they open', () => {
  const { inScope, read, headings } = readAll();
  const scoped = read.filter((r) => inScope.has(r.f));
  // A GUARD MUST PROVE IT LOOKED. WHY 1,839 AND NOT 4,000 (2026-10-30): the 4,000 floor of 2026-10-27 was a number typed from memory
  // before anything was counted — the standing order's own failure. Counted off the disk, the 23 screens and the files they open hold
  // 1,744 `<Text>` tags on 2026-10-30 (most screens print their lines through a few dozen tags each, inside .map()s, not one tag per line) and the
  // reader reads every one of them: the check below holds READ against WRITTEN for each file, so a tag the parser misses fails by name.
  // The floors carry the counts measured that day, less a little for the headings this round turns into bars.
  const short = scoped.filter((r) => r.texts !== r.textsWritten || r.bars !== r.barsWritten)
    .map((r) => `${rel(r.f)}: read ${r.texts} of ${r.textsWritten} texts, ${r.bars} of ${r.barsWritten} bars`);
  expect(short).toEqual([]);
  expect(Object.values(SCOPE).flat().every((n) => scoped.some((r) => path.basename(r.f, '.tsx') === n))).toBe(true);
  expect(scoped.length).toBeGreaterThanOrEqual(45);
  expect(scoped.reduce((t, r) => t + r.texts, 0)).toBeGreaterThanOrEqual(TEXTS_FLOOR);
  expect(scoped.reduce((t, r) => t + r.bars, 0)).toBeGreaterThanOrEqual(BARS_FLOOR);
  expect(headings.filter((h) => inScope.has(path.join(ROOT, h.file))).length).toBeGreaterThanOrEqual(80);
});

/** One check per part of the scope, so a red line says whose screens it is. The files the screens open (shared sheets, cards and the
 *  sign-up steps Income manager also shows) are a part of their own. */
const PARTS: [string, (file: string) => boolean][] = [
  ...Object.entries(SCOPE).map(([name, screens]) => [name, (f: string) => screens.includes(path.basename(f, '.tsx'))] as [string, (f: string) => boolean]),
  ['the components and sign-up steps those screens open', (f: string) => !Object.values(SCOPE).flat().includes(path.basename(f, '.tsx'))],
];
test.each(PARTS)('%s: every box title on a dark bar, every sub-title on a light bar, edge to edge (DEC-8839)', (_name, mine) => {
  const { inScope, headings } = readAll();
  expect(headings.filter((h) => inScope.has(path.join(ROOT, h.file)) && mine(h.file) && breaks(h)).map(say)).toEqual([]);
});

/** THE RATCHET — every other screen, component and sign-up file, with how many headings in it break his rule today, each named.
 *  The true number, never zero to stay green (the standing order of 2026-09-28). Home, Plan and Menu wait for their own module round,
 *  by his order of 2026-10-03; the rest are screens outside Build 55. A file fixed comes off this list in the same change; a file
 *  that gains one fails. 2026-10-27: 57 in 22 files. */
export const OWED: Record<string, number> = {
  'src/components/PlanInputs.tsx': 2,           // Plan: FACTS — SAVE AS YOU GO · CHOICES — TRY THEM, NOTHING CHANGES YET (quiet)
  'src/components/PlanOutcome.tsx': 2,          // Plan: WILL MY MONEY LAST? · WHAT ACTUALLY MOVES IT (quiet)
  'src/components/PlanPrepare.tsx': 1,          // Plan: GETTING YOUR AFFAIRS IN ORDER (quiet)
  'src/components/TopBar.tsx': 3,               // Menu: the menu sheet's three groups (grey capitals)
  'src/screens/ConnectFlowScreen.tsx': 2,       // Just as good, no login: · Rather not connect?
  'src/screens/CreditScreen.tsx': 3,            // Credit utilization · Your credit score · WHAT MOVES YOUR SCORE short of the edges
  'src/screens/HomeScreen.tsx': 1,              // Home: WHAT YOU'LL SEE HERE short of the edges
  'src/screens/ImportHoldingsScreen.tsx': 3,    // What we look for · REVIEW YOUR HOLDINGS ×2 short of the edges
  'src/screens/InsightsScreen.tsx': 2,          // Menu: a theme's bar short of the edges · Where this comes from
  'src/screens/MultiGoalScreen.tsx': 1,         // TRY THESE TOGETHER short of the edges
  'src/screens/PlanHubScreen.tsx': 4,           // Plan: four quiet labels
  'src/screens/RewardsScreen.tsx': 5,           // How to earn points · Badges earned · Locked · Savings goals · New goal
  'src/screens/SettingsScreen.tsx': 9,          // seven bars 16 points short of the edges · Financial Disclaimer · Danger zone
  'src/screens/SharpenPlanScreen.tsx': 2,       // THE FAST WAYS IN and one more, short of the edges
  'src/screens/SnapTradeConnect.tsx': 1,        // WHAT IT CAN'T SHARE
  'src/screens/SsTimingScreen.tsx': 1,          // Effect on will-my-money-last
  'src/screens/TaxOrganizerScreen.tsx': 5,      // five bars 20 points short of the edges
  'src/screens/TipsScreen.tsx': 5,              // Expenses by category · Potential monthly savings · This month at a glance · Get personalized tips · Plan for income gaps
  'src/screens/WillItLastScreen.tsx': 1,        // WHAT DRIVES THIS short of the edges
};

test('the ratchet: every other screen that does not meet his rule yet, each named with its true count', () => {
  const { inScope, headings } = readAll();
  const owed: Record<string, number> = {};
  for (const h of headings) if (!inScope.has(path.join(ROOT, h.file)) && breaks(h)) owed[h.file] = (owed[h.file] ?? 0) + 1;
  expect(owed).toEqual(OWED);
  const total = Object.values(owed).reduce((a, b) => a + b, 0);
  expect(total).toBe(53);   // 2026-10-31: less sign-up's last step (2) and its first step's group names (1), on bars (FX-CF-B, SU3-04); less Plan · Goals' quiet label (1), on its bar (FX-PLAN, goals v03)
  // A GUARD MUST PROVE IT LOOKED: the files outside the scope were read too
  expect(ALL.length - inScope.size).toBeGreaterThanOrEqual(90);
});

test('the reader sees each shape it is built to catch (it would go quiet, not red, if one stopped matching)', () => {
  const probe = (code: string) => {
    const f = path.join(ROOT, 'src', 'screens', '__probe__.tsx');
    fs.writeFileSync(f, code);
    try { return readFile(f).headings.map((h) => `${h.shape} ${h.style}`); } finally { fs.unlinkSync(f); }
  };
  const S = `const s = StyleSheet.create({ page: { padding: Spacing.lg }, kick: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
    title: { fontSize: 17, fontWeight: '800' }, bleed: { marginHorizontal: -Spacing.lg }, card: { backgroundColor: Colors.cardBg, padding: Spacing.md } });`;
  expect(probe(`${S} const x = <SectionBand quiet title="A" />;`)).toEqual(['quiet quiet']);
  expect(probe(`${S} const x = <View><Text style={s.kick}>Mixed words</Text></View>;`)).toEqual(['capitals kick']);
  expect(probe(`${S} const x = <View><Text style={s.title}>401(k)</Text></View>;`)).toEqual(['named title']);   // Contribution room's shape
  expect(probe(`${S} const x = <View><Text>WHAT YOU HAVE</Text></View>;`)).toEqual(['capitals (inline)']);
  expect(probe(`${S} const x = <SectionHeader title="Spending" />;`)).toEqual(['SectionHeader SectionHeader']);
  // 6. what opens a sign-up card (2026-10-31): read in src/onboarding only, whatever its style is named
  const probeSignUp = (code: string) => {
    const f = path.join(ROOT, 'src', 'onboarding', '__probe__.tsx');
    fs.writeFileSync(f, code);
    try { return readFile(f).headings.map((h) => `${h.shape} ${h.style}`); } finally { fs.unlinkSync(f); }
  };
  expect(probeSignUp(`${S} const x = <Card><Text style={s.kick2}>Surplus by month</Text><Text style={s.kick2}>a line</Text></Card>;`)).toEqual(['opens a card kick2']);
  expect(probe(`${S} const x = <Card><Text style={s.kick2}>Surplus by month</Text></Card>;`)).toEqual([]);   // outside sign-up: not this shape
  // a dark bar on a page with 20-point margins: short unless the margins are taken back; inside a card it is the edge guard's
  expect(probe(`${S} const x = <ScrollView contentContainerStyle={s.page}><SectionBand title="B" /></ScrollView>;`)).toEqual(['page bar short ']);
  expect(probe(`${S} const x = <ScrollView contentContainerStyle={s.page}><View style={s.bleed}><SectionBand title="B" /></View></ScrollView>;`)).toEqual([]);
  expect(probe(`${S} const x = <ScrollView contentContainerStyle={s.page}><View style={s.card}><SectionBand inCard title="B" /></View></ScrollView>;`)).toEqual([]);
});
