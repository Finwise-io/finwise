/** HIS DECISIONS, READ AGAINST THE CODE AND FILES BEHIND PERFORMANCE — part 4 (PF-DECISIONS, 2026-10-22).
 *
 *  Decisions that govern what no screen render can show on its own: the daily record's arithmetic, a figure's
 *  declaration, a name in the code, a route, a file on disk. Each stood in the decision log as "RECORDED — status not
 *  established" or "RULED": nothing re-ran it. Every test is named by the decision it holds; a decision the code BREAKS is
 *  pinned with test.failing and the word BREACHED in its name, so the pin turns red the day it is fixed.
 */
import * as fs from 'fs';
import * as path from 'path';
import { FIGURE_REGISTER, FIGURE_DOOR } from '../figures';
import { TAB_META } from '../../../src/constants/tabs';
import { fillBetweenObservations } from '../../../Calculation Module code/engines/rebuild-history';
import { typedValueOnItsDate } from '../../../Calculation Module code/engines/snapshots';

const ROOT = path.join(__dirname, '..', '..', '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');
/** the source with its comments taken out — a comment that names a retired thing is history, not code */
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`\w])\/\/.*$/gm, '$1');
function sources(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '__tests__' || e.name.startsWith('.')) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.|\.probe\./.test(e.name)) out.push(p);
    }
  };
  for (const d of ['src', 'app', path.join('MoneyKeel', 'functions'), path.join('Calculation Module code', 'engines')]) walk(path.join(ROOT, d));
  return out;
}

// ── DEC-0046 ─────────────────────────────────────────────────────────────────────────────────────────
// "The Invest tab is renamed PERFORMANCE" — one map, read by the bottom bar, the menu and the desktop sidebar together.
test('DEC-0046 — the tab is named Performance in the one map, and the bottom bar and the menu both read that map', () => {
  expect(TAB_META.invest.title).toBe('Performance');
  expect(Object.values(TAB_META).map((t) => t.title)).not.toContain('Invest');
  expect(code(read('app/(tabs)/_layout.tsx'))).toMatch(/title: TAB_META\[name\]\.title/);
  expect(code(read('src/components/TopBar.tsx'))).toMatch(/TAB_META\[name\]\.title/);
});

// ── DEC-0314 ─────────────────────────────────────────────────────────────────────────────────────────
// "hand-entered revaluations marked; market-priced entries spread evenly across the gap; house/car booked on the day."
// So a single edit never looks like a market movement. (The market move is spread by each day's real close, not an even
// line — the reading his later "Let price history count" ruling gives the same gap, DEC-5291.)
const holdingDay = (date: string, origin: string, close: number | null, cash = 0) => ({
  date, origin, writtenAt: `${date}T00:00:00Z`,
  holdings: close == null ? [] : [{ date, accountId: 'van', securityKey: 'VTI', symbol: 'VTI', units: 10, price: close, value: 10 * close, currency: 'USD' }],
  accounts: close == null ? [] : [{ date, accountId: 'van', cash, statedTotal: null, typedValue: null, currency: 'USD' }],
});
test('DEC-0314 — between two days a priced holding was observed unchanged, the days in the gap carry the market move at each day\'s own close', () => {
  const days = [holdingDay('2026-09-01', 'observed', 100), holdingDay('2026-09-02', 'reconstructed', null),
    holdingDay('2026-09-03', 'reconstructed', null), holdingDay('2026-09-04', 'observed', 103)];
  const closes: Record<string, number> = { '2026-09-02': 101, '2026-09-03': 102 };
  const out = fillBetweenObservations(days as any, (_k, d) => closes[d] ?? null);
  const v = (d: string) => out.find((x) => x.date === d)!.holdings.find((h) => h.accountId === 'van')?.value;
  expect([v('2026-09-01'), v('2026-09-02'), v('2026-09-03'), v('2026-09-04')]).toEqual([1_000, 1_010, 1_020, 1_030]);
});
test('DEC-0314 — a change the person made between the two days (cash moved) is not spread across the gap as if the market made it', () => {
  const days = [holdingDay('2026-09-01', 'observed', 100, 0), holdingDay('2026-09-02', 'reconstructed', null),
    holdingDay('2026-09-04', 'observed', 103, 500)];
  const out = fillBetweenObservations(days as any, () => 101);
  expect(out.find((x) => x.date === '2026-09-02')!.holdings).toEqual([]);   // left unfilled: nobody saw that day
});
test('DEC-0314 — a home\'s value typed by hand is booked on the day its value is as of, not spread and not on the day it was typed', () => {
  const typed = (date: string, value: number) => ({ date, origin: 'observed', writtenAt: `${date}T00:00:00Z`, holdings: [],
    accounts: [{ date, accountId: 'home', cash: 0, statedTotal: null, typedValue: value, currency: 'USD' }] });
  const days = [typed('2026-09-27', 400_000), typed('2026-09-28', 400_000), typed('2026-09-30', 400_000)];
  const home = { asset_id: 'home', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 410_000, value_as_of: '2026-09-28', source: 'manual' };
  const { days: out, moved } = typedValueOnItsDate(days as any, home as any, '2026-09-30', '2026-09-30T09:00:00Z');
  const v = (d: string) => out.find((x) => x.date === d)!.accounts.find((a) => a.accountId === 'home')!.typedValue;
  expect([v('2026-09-27'), v('2026-09-28'), v('2026-09-30')]).toEqual([400_000, 410_000, 410_000]);
  expect(moved[0]).toEqual({ date: '2026-09-28', was: 400_000, now: 410_000 });
});

// ── DEC-0323 ─────────────────────────────────────────────────────────────────────────────────────────
// "'money-weighted' names two things — rename PORTFOLIO_RETURN to value-weighted; reserve money-weighted for the IRR."
test('DEC-0323 — no code anywhere a screen can reach still carries the name PORTFOLIO_RETURN', () => {
  const files = sources();
  expect(files.length).toBeGreaterThanOrEqual(200);                 // the guard looked: the whole app, not a corner
  expect(files.filter((f) => /\bPORTFOLIO_RETURN\b/.test(code(fs.readFileSync(f, 'utf8')))).map((f) => path.relative(ROOT, f))).toEqual([]);
});
test('DEC-0323 — the market blend (MK-PF-M-008) is declared as weighted by what each holding was worth, and never called money-weighted', () => {
  const f = FIGURE_REGISTER['MK-PF-M-008'];
  expect(f).toBeDefined();
  expect(f.formula).toMatch(/weighted by what that holding was worth/);
  expect(JSON.stringify(f)).not.toMatch(/money-weighted/i);
});

// ── DEC-0402 ─────────────────────────────────────────────────────────────────────────────────────────
// "go ahead and execute on step 1, 2, 3." Rule 11: (1) a door declares its figures by identifier; (2) a screen prints a
// figure only from the door, by identifier; (3) the master's rows are printed from the declarations.
test('DEC-0402 (1) — every Performance figure is declared by its door, with the routes it prints on', () => {
  const pf = Object.keys(FIGURE_REGISTER).filter((id) => id.startsWith('MK-PF-M-'));
  expect(pf.length).toBeGreaterThanOrEqual(20);                     // the guard looked: 21 declared on 2026-10-22
  for (const id of pf) {
    expect(`${id}: ${FIGURE_DOOR[id] ? 'has a door' : 'no door'}`).toBe(`${id}: has a door`);
    expect(`${id}: ${(FIGURE_REGISTER[id].screens ?? []).length > 0}`).toBe(`${id}: true`);
  }
  expect(FIGURE_REGISTER['MK-PF-M-008'].screens).toEqual(['/home']);
});
// FIXED 2026-10-22 (W-A11Y). It was BREACHED: Home printed "market +2.83%" with its own local percent writer (HomeScreen.tsx,
// signedPct/pctTwoDp) — never through fig('MK-PF-M-008') — and the same for the "you +X%" and "ahead by" beside it. Each now
// prints through its identifier: your month MK-XS-M-004, the market MK-PF-M-008, the gap MK-PF-M-027 (issued the same day,
// from marketGap, the function the Holding page's gap reads). The account page's, Holding page's and Look back's percents
// (audit row 9) print through theirs too, and the rule-11 guard now counts percent writers as well as money writers.
test('DEC-0402 (2) — Home prints the market figure, your month and the gap through their identifiers, and no percent writer of its own (fixed 2026-10-22)', () => {
  const home = code(read('src/screens/HomeScreen.tsx'));
  expect(home).toMatch(/fig\(\s*'MK-PF-M-008'/);
  expect(home).toMatch(/fig\(\s*'MK-PF-M-027'/);
  expect(home).toMatch(/you \$\{[^`]*fig\(\s*'MK-XS-M-004'/);
  expect(home).not.toMatch(/\b(pctTwoDp|signedPct)\b/);
  expect(FIGURE_REGISTER['MK-PF-M-027'].screens).toEqual(['/home']);
});

// ── DEC-0648 ─────────────────────────────────────────────────────────────────────────────────────────
// "Investment v07 - archive it as it is old version of performance."
test('DEC-0648 — investments v07 sits in the archive with its date, and no live drawing of that name remains beside the designs', () => {
  const dir = 'MoneyKeel/documents/networth-and-performance';
  expect(fs.existsSync(path.join(ROOT, dir, 'archive', '2026-10-01_moneykeel_pres_mock_investments_v07.html'))).toBe(true);
  const live = fs.readdirSync(path.join(ROOT, dir)).filter((f) => /investments_v\d+\.html$/.test(f));
  expect(live).toEqual([]);
  // and the record of which design each screen is built from names it as the design of no screen
  const record = read('MoneyKeel/documents/standards/moneykeel_pres_spec_design-each-screen-was-built-from_v01.md');
  expect(record.length).toBeGreaterThan(5_000);                      // the record was read, not an empty file
  expect(record.split('\n').filter((l) => /investments_v07/.test(l) && /^\| (Bonds|Other investments|Holding detail)/.test(l))).toEqual([]);
});
