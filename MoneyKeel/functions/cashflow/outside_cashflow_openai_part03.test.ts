/* THE OUTSIDE CASES, RUN AGAINST THE APP — Cash flow, OpenAI package of 2026-10-24, PART 3 of 19:
 * "Stock that vests, and rent from a property". Measured 2026-10-25 by CFR-1.
 * Cards: MK-CF-F-062 equityRowValue · MK-CF-F-063 rowVestYear · MK-CF-F-064 equityCashFlow · MK-CF-F-065
 * equityVestWeights · MK-CF-F-066 rsuAnnual · MK-CF-F-219 rentEntryMonthly · MK-CF-F-067 rentalList · MK-CF-F-068
 * rentalNetAnnual (src/domain/income/onboarding.ts) · MK-CF-F-216 typed · MK-CF-F-217 hasOldRentFigure · MK-CF-F-218
 * moveOldRentFigure (src/domain/income/old-rent-migration.ts).
 *
 * Source, unchanged: …/MoneyKeel_CashFlow_Independent_Audit/audit_results/MoneyKeel_CashFlow_Audit_Part_03.json. Every
 * expected answer is READ FROM THE PACKAGE, never retyped. Results: returned/results/cashflow_openai_part03_results.json.
 * MEASURED ONLY: no app code, record or drawing was changed. Markers as in part 1's file.
 *
 * INPUT NAMES MAPPED:
 *   kind / shares / price / strike (F-062) → a grant row { shares, price } read as an RSU, or { shares } read as an option
 *     with the grant's strike and market price (price → optMarket).
 *   vesting_date (F-063) → the row's date. current_year → the clock, held at the cases' as_of, 2026-10-24.
 *   vests [{date, independently_valued_amount}] (F-064–F-066) → RSU rows { shares: 1, price: amount, date }, as the
 *     case's note says; requested_year 2026 → the clock's year.
 *   "actual 2026 values" (F-065, F-066) → what the app counts for 2026's months: MK-CF-F-088 taxableByCalendarMonth on a
 *     profile with only the grant — the production reader that lays rsuAnnual over the vest weights, as the income grid
 *     and the tax do.
 *   rent / cost (F-219) → a rent entry { income, expenses } as typed; entries {property, rent, cost, kind} (F-067) →
 *     rentals { property_id, income, expenses, type }; properties (F-068) → named rentals P1, P2…
 *   old_profile {rent, cost, kind} (F-216–F-218) → the old fields rentalIncome, rentalExpenses, rentalType; list → rentals,
 *     its rows mapped the same way.
 * typed is not exported: it is compiled from its own source text in old-rent-migration.ts.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { equityRowValue, rowVestYear, equityCashFlow, equityVestWeights, rsuAnnual, rentEntryMonthly, rentalList, rentalNetAnnual, taxableByCalendarMonth, incomeMonthlyGrid } from '../../../src/domain/income/onboarding';
import { hasOldRentFigure, moveOldRentFigure } from '../../../src/domain/income/old-rent-migration';

type Mark = 'AGREES' | 'APP WRONG' | 'REVIEWER WRONG' | 'NEEDS A RULING' | 'OUTSIDE DOMAIN';
const PKG = path.join(__dirname, '../../documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/MoneyKeel_CashFlow_Independent_Audit/audit_results');
const PART = JSON.parse(fs.readFileSync(path.join(PKG, 'MoneyKeel_CashFlow_Audit_Part_03.json'), 'utf8'));
const C = (id: string): any => { const c = PART.cases.find((x: any) => x.case_id === id); if (!c) throw new Error(`no case ${id}`); return c; };
/** test.failing, or a plain test when the measurer sets CFR_STRICT to read each failure's own message */
const failing: jest.It = process.env.CFR_STRICT ? test : test.failing;
const RAN: string[] = [];
const ACT: Record<string, unknown> = {};
const DUMP = process.env.CFR3_DUMP;
afterAll(() => { if (DUMP) fs.writeFileSync(DUMP, JSON.stringify(ACT, null, 1)); });
const kase = (id: string, mark: Mark, why: string, run: (c: any) => any, check: (c: any, got: any) => void, pin?: (got: any, c: any) => void) => {
  const c = C(id);
  RAN.push(id);
  const r = mark === 'APP WRONG' || mark === 'REVIEWER WRONG' ? failing : test;
  r(`${id} · ${c.kind} · ${c.title} [${mark}] — ${why}`, () => { const got = run(c); ACT[id] = got; check(c, got); });
  if (pin) test(`${id} · the app's answer today, pinned [${mark}]`, () => pin(run(c), c));
};
const X = (s: any): number => { if (typeof s === 'number') return s; const m = /^(-?[\d.]+)\/([\d.]+)$/.exec(String(s)); return m ? Number(m[1]) / Number(m[2]) : Number(s); };
const money = (got: number, exp: any) => expect(got).toBeCloseTo(X(exp?.exact ?? exp), 6);
const refuses = (v: unknown) => expect(v == null).toBe(true);
const typed: (v: unknown) => boolean = (() => {
  const text = fs.readFileSync(path.join(__dirname, '../../../src/domain/income/old-rent-migration.ts'), 'utf8');
  const at = text.search(/const typed = /);
  if (at < 0) throw new Error('typed not found');
  const js = ts.transpileModule(text.slice(at, text.indexOf(';\n', at) + 2), { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText;
  return new Function(`${js}\nreturn typed;`)();
})();
const grants = (i: any) => ({ equityType: 'rsu', rsuGrants: i.vests.map((v: any) => ({ shares: 1, price: v.independently_valued_amount, date: v.date })) });
/** what the app counts for each month of 2026 from the grants alone — the reader the tax and the income grid share */
const months2026 = (op: any) => taxableByCalendarMonth(op as any, new Date(2026, 9, 24));

beforeAll(() => { jest.useFakeTimers(); jest.setSystemTime(new Date(2026, 9, 24, 12, 0, 0)); });
afterAll(() => { jest.useRealTimers(); });

// ═══════════════════════════════════════════ THE 55 CASES ═══════════════════════════════════════════

describe('MK-CF-F-062 equityRowValue — five cases', () => {
  const run = (c: any) => (c.inputs.kind === 'option'
    ? equityRowValue({ shares: c.inputs.shares }, 'option', c.inputs.strike, c.inputs.price)
    : equityRowValue({ shares: c.inputs.shares, price: c.inputs.price }, 'rsu'));
  for (const id of ['C01', 'C02', 'C03', 'C04', 'C05']) kase(`MK-CF-F-062-${id}`, 'AGREES', 'shares × price, or × the spread floored at $0', run, (c, g) => money(g, c.expected));
});

describe('MK-CF-F-063 rowVestYear — five cases', () => {
  const run = (c: any) => rowVestYear({ date: c.inputs.vesting_date });
  for (const id of ['C01', 'C02', 'C03', 'C04']) kase(`MK-CF-F-063-${id}`, 'AGREES', 'the date\'s own year', run, (c, g) => expect(g).toBe(X(c.expected.exact)));
  // APP WRONG — THE PRIORITY FINDING, REAL (DEC-0296 "an unknown input produces no number and a reason — never a default";
  // DEC-0003 every month carries its own month AND year; tenet 3). A vest with no date is given this year. Reachable: the
  // vesting schedule (src/onboarding/modules.tsx RsuEditor) saves a row's shares and price with its "Vest date" cell
  // left empty — nothing asks for it.
  kase('MK-CF-F-063-C05', 'AGREES', 'FIXED 2026-10-25 (FIX-INCOME-B): no date is no year — "vest date not entered" (DEC-0296, DEC-0003)', run,
    (c, g) => { expect(c.expected.state).toBe('REFUSES'); refuses(g); });
  test.failing('MK-CF-F-063-C05 · what the app gave before the fix (pinned, now failing): this year, 2026', () => {
    expect(run(C('MK-CF-F-063-C05'))).toBe(2026);
  });
});

describe('MK-CF-F-064 equityCashFlow — five cases', () => {
  const run = (c: any) => Object.fromEntries(equityCashFlow(grants(c.inputs) as any).map((r) => [String(r.year), r.amount]));
  const check = (c: any, g: any) => { expect(Object.keys(g).sort()).toEqual(Object.keys(c.expected).sort()); for (const k of Object.keys(c.expected)) money(g[k], c.expected[k]); };
  for (const id of ['C01', 'C02', 'C03', 'C04']) kase(`MK-CF-F-064-${id}`, 'AGREES', 'known vests grouped by their own year', run, check);
  // APP WRONG (DEC-0296, DEC-0003; tenet 3) — the undated $1,000 is filed under 2026 through rowVestYear.
  kase('MK-CF-F-064-C05', 'AGREES', 'FIXED 2026-10-25 (FIX-INCOME-B): an undated vest is in no year (DEC-0296)', run,
    (c, g) => { expect(c.expected.state).toBe('REFUSES'); refuses(g['2026']); expect(g).toEqual({}); });
  test.failing('MK-CF-F-064-C05 · what the app gave before the fix (pinned, now failing): $1,000 filed under 2026', () => {
    expect(run(C('MK-CF-F-064-C05'))).toEqual({ 2026: 1000 });
  });
});

describe('MK-CF-F-065 equityVestWeights — five cases', () => {
  const run = (c: any) => equityVestWeights(grants(c.inputs) as any);
  const weights = (c: any, g: any) => { expect(g).toHaveLength(12); c.expected.forEach((e: any, i: number) => expect(g[i]).toBeCloseTo(X(e.exact), 12)); };
  kase('MK-CF-F-065-C01', 'AGREES', 'all of it in March', run, weights);
  kase('MK-CF-F-065-C02', 'AGREES', 'a quarter in March, three quarters in June', run, weights);
  // APP WRONG — THE PRIORITY FINDING, REAL (DEC-0012, his "build all 16": "shares that vest land in the month they vest on
  // every screen"; DEC-0003; tenet 1). The weights ignore the year, so 2026's months receive vests of 2027, at the run-rate:
  // each vest at half its value (the two-year run-rate is exactly half the total), so March reads $4,158.72, June $660.60 and
// December $2,105.59, where 2026 really vests $8,317.43 in March and nothing else.
  // The months (MK-CF-F-088, the tax) and the income grid (MK-CF-F-092) both read this.
  const actual = (c: any, g: any) => { const exp = c.expected.actual_2026_values; exp.forEach((e: any, i: number) => expect(g[i]).toBeCloseTo(X(e.exact), 6)); };
  // FIXED 2026-10-25 (FIX-INCOME-B): the months read each vest in its own year and month through the one reader of the vests
  // (MK-CF-F-018 equityByMonth over equityVests, FIX-BILLS) — 2026 holds March's $8,317.43 and nothing else
  kase('MK-CF-F-065-C03', 'AGREES', 'FIXED 2026-10-25: each vest in its own year and month (DEC-0012)', (c) => months2026(grants(c.inputs)), actual);
  test.failing('MK-CF-F-065-C03 · what the app gave before the fix (pinned, now failing): 2027 vests in 2026\'s months at the run-rate', () => {
    const g = months2026(grants(C('MK-CF-F-065-C03').inputs));
    expect(g[2]).toBeCloseTo(6924.895 * 8317.43 / 13849.79, 6); expect(g[5]).toBeCloseTo(6924.895 * 1321.19 / 13849.79, 6); expect(g[11]).toBeCloseTo(6924.895 * 4211.17 / 13849.79, 6);
  });
  kase('MK-CF-F-065-C04', 'AGREES', 'FIXED 2026-10-25: each vest in its own year and month (DEC-0012)', (c) => months2026(grants(c.inputs)), actual);
  test.failing('MK-CF-F-065-C04 · what the app gave before the fix (pinned, now failing): 2030 vests in 2026\'s months at the run-rate', () => {
    const g = months2026(grants(C('MK-CF-F-065-C04').inputs));
    expect(g[0]).toBeCloseTo(6111.895 * 3299.43 / 12223.79, 6); expect(g[8]).toBeCloseTo(6111.895 * (7113.17 + 1811.19) / 12223.79, 6);
  });
  // APP WRONG (DEC-0296, DEC-0012; tenet 3) — no date is filed in December (weight 1 in slot 12).
  kase('MK-CF-F-065-C05', 'AGREES', 'FIXED 2026-10-25 (FIX-INCOME-B): no date is in no month (DEC-0296)', run,
    (c, g) => { expect(c.expected.state).toBe('REFUSES'); refuses(g); });
  test.failing('MK-CF-F-065-C05 · what the app gave before the fix (pinned, now failing): filed in December', () => {
    expect(run(C('MK-CF-F-065-C05'))![11]).toBe(1);
  });
  test('MK-CF-F-065 · where it reaches: the income grid\'s 2026 June carries no June-2027 vest, and March holds 2026\'s — sold when they vest (FIXED 2026-10-25)', () => {
    const g = incomeMonthlyGrid({ ...grants(C('MK-CF-F-065-C03').inputs), rsuSoldAtVest: 'yes' } as any, 'gross', new Date(2026, 9, 24));
    expect(g[5].amount).toBe(0);
    expect(g[2].amount).toBeCloseTo(8317.43, 6);
  });
  test.failing('MK-CF-F-065 · what the app gave before the fix (pinned, now failing): the income grid\'s 2026 June carried a June-2027 vest', () => {
    const g = incomeMonthlyGrid({ ...grants(C('MK-CF-F-065-C03').inputs), rsuSoldAtVest: 'yes' } as any, 'gross', new Date(2026, 9, 24));
    expect(g[5].amount).toBeCloseTo(6924.895 * 1321.19 / 13849.79, 6);
  });
});

describe('MK-CF-F-066 rsuAnnual — five cases', () => {
  const run = (c: any) => { const op = grants(c.inputs); return { runRate: rsuAnnual(op as any), counted2026: months2026(op).reduce((t, v) => t + v, 0) }; };
  const both = (c: any, g: any) => { money(g.runRate, c.expected.documented_run_rate); money(g.counted2026, c.expected.actual_2026_vesting); };
  kase('MK-CF-F-066-C01', 'AGREES', 'one year: the run-rate is the year', run, both);
  kase('MK-CF-F-066-C02', 'AGREES', 'one year: the run-rate is the year', run, both);
  // APP WRONG — THE PRIORITY FINDING, REAL (DEC-0012; tenet 1 "a wrong number ends trust"; tenet 2 "a figure that is an
  // estimate says so"). The run-rate itself is right and labelled as one in the code ($13,849.79 over two years =
  // $6,924.895); the fault is that it is the ONLY figure, so the tax and the months count $6,924.90 as 2026's income where
  // 2026 actually vests $8,317.43. rsuAnnual's callers (MK-CF-F-083, -084, -088, -092, MK-PL-F-031) read it as the year.
  // FIXED 2026-10-25 (FIX-INCOME-B; DEC-0012; tenet 1): rsuAnnual is the year's vests — the reviewer's "documented run-rate" is no
  // longer a figure the app prints or counts (an average of the years was the fault). The year's figure and the months both read
  // 2026's $8,317.43, as the reviewer's actual_2026_vesting says.
  const year = (c: any, g: any) => { money(g.counted2026, c.expected.actual_2026_vesting); money(g.runRate, c.expected.actual_2026_vesting); };
  kase('MK-CF-F-066-C03', 'AGREES', 'FIXED 2026-10-25: the year is the year\'s vests, never an average of the years (DEC-0012, tenet 1)', run, year);
  test.failing('MK-CF-F-066-C03 · what the app gave before the fix (pinned, now failing): the run-rate $6,924.895 counted as 2026', () => {
    const g = run(C('MK-CF-F-066-C03')); expect(g.runRate).toBeCloseTo(6924.895, 6); expect(g.counted2026).toBeCloseTo(6924.895, 6);
  });
  kase('MK-CF-F-066-C04', 'AGREES', 'FIXED 2026-10-25: the year is the year\'s vests, never an average of the years (DEC-0012, tenet 1)', run, year);
  test.failing('MK-CF-F-066-C04 · what the app gave before the fix (pinned, now failing): the run-rate $6,111.895 counted as 2026', () => {
    const g = run(C('MK-CF-F-066-C04')); expect(g.runRate).toBeCloseTo(6111.895, 6); expect(g.counted2026).toBeCloseTo(6111.895, 6);
  });
  kase('MK-CF-F-066-C05', 'AGREES', 'FIXED 2026-10-25: an undated vest answers nothing — "vest date not entered" (DEC-0296)', (c) => rsuAnnual(grants(c.inputs) as any),
    (c, g) => { expect(c.expected.state).toBe('REFUSES'); refuses(g); });
  test.failing('MK-CF-F-066-C05 · what the app gave before the fix (pinned, now failing): $1,000 counted as this year\'s income', () => {
    expect(rsuAnnual(grants(C('MK-CF-F-066-C05').inputs) as any)).toBe(1000);
  });
});

describe('MK-CF-F-219 rentEntryMonthly — five cases', () => {
  const run = (c: any) => rentEntryMonthly({ income: c.inputs.rent, expenses: c.inputs.cost });
  const check = (c: any, g: any) => { money(g.income, c.expected.rent); money(g.expenses, c.expected.cost); money(g.net, c.expected.net); };
  for (const id of ['C01', 'C02', 'C03', 'C04']) kase(`MK-CF-F-219-${id}`, 'AGREES', 'rent − running costs, as typed', run, check);
  // APP WRONG (tenet 3 "unknown is not zero"; DEC-3768c "it counts as not entered"; DEC-0296). The strict reader refuses
  // "about 2k" (right, DEC-3768c), but then the net is worked with the rent as $0: −$600 a month — and rentalList counts
  // that entry as a rental losing $7,200 a year in income and tax. A blank rent beside a typed cost does the same.
  kase('MK-CF-F-219-C05', 'AGREES', 'FIXED 2026-10-25 (FIX-INCOME-B): rent not entered gives no net and counts nothing (tenet 3, DEC-3768c)', run,
    (c, g) => {
      expect(c.expected.state).toBe('REFUSES'); refuses(g.net);
      expect(rentalNetAnnual({ rentals: [{ property_id: 'A', income: 'about 2k', expenses: '600' }] } as any)).toBe(0);   // counted nowhere
      expect(rentalNetAnnual({ rentals: [{ property_id: 'A', income: '', expenses: '600' }] } as any)).toBe(0);
      expect(rentEntryMonthly({ income: '0', expenses: '600' }).net).toBe(-600);                                         // a typed 0 is an answer
    });
  test.failing('MK-CF-F-219-C05 · what the app gave before the fix (pinned, now failing): −$600 a month, a $7,200 rental loss counted', () => {
    expect(run(C('MK-CF-F-219-C05'))).toEqual({ income: 0, expenses: 600, net: -600 });
    expect(rentalNetAnnual({ rentals: [{ property_id: 'A', income: 'about 2k', expenses: '600' }] } as any)).toBe(-7200);
  });
});

describe('MK-CF-F-067 rentalList — five cases', () => {
  const op = (i: any) => ({ rentals: i.entries == null ? null : i.entries.map((e: any) => ({ property_id: e.property, income: e.rent, expenses: e.cost, type: e.kind })),
    ...(i.legacy_rent != null ? { rentalIncome: i.legacy_rent } : {}) });
  const run = (c: any) => rentalList(op(c.inputs) as any);
  kase('MK-CF-F-067-C01', 'AGREES', 'a named rental', run, (c, g) => {
    expect(g).toHaveLength(1); const e = c.expected[0];
    money(g[0].income, e.rent); money(g[0].expenses, e.cost); expect(g[0].type).toBe(e.kind);
  });
  kase('MK-CF-F-067-C02', 'AGREES', 'no property, not counted (DEC-4059d)', run, (c, g) => expect(g).toEqual(c.expected));
  // AGREES: both named properties, in order, B kept with its loss. (The app's rows carry type, rent and costs, not the
  // property's name; the count, order and kinds are what it can be held to.)
  kase('MK-CF-F-067-C03', 'AGREES', 'two properties, a loss kept', run, (c, g) => {
    expect(g).toHaveLength(c.expected.length);
    expect(g.map((r: any) => r.type)).toEqual(['long', 'short']);
    expect(g[1].income - g[1].expenses).toBeCloseTo(821.19 - 999.31, 6);
  });
  kase('MK-CF-F-067-C04', 'AGREES', 'unnamed and all-zero rows left out', run, (c, g) => { expect(g).toHaveLength(c.expected.length); expect(g[0].income).toBe(1101.13); });
  kase('MK-CF-F-067-C05', 'AGREES', 'the old unnamed figure is not a rental', run, (c, g) => expect(g).toEqual(c.expected));
});

describe('MK-CF-F-068 rentalNetAnnual — five cases', () => {
  const run = (c: any) => rentalNetAnnual({ rentals: c.inputs.properties.map((p: any, n: number) => ({ property_id: `P${n + 1}`, income: p.rent, expenses: p.operating_cost })) } as any);
  for (const id of ['C01', 'C02', 'C03', 'C04', 'C05']) kase(`MK-CF-F-068-${id}`, 'AGREES', '(rent − costs) × 12, losses kept', run, (c, g) => money(g, c.expected));
});

describe('MK-CF-F-216 typed · MK-CF-F-217 hasOldRentFigure — ten cases', () => {
  const old = (p: any) => (p == null ? p : Object.fromEntries(Object.entries(p).map(([k, v]) => [({ rent: 'rentalIncome', cost: 'rentalExpenses', kind: 'rentalType' } as any)[k], v])));
  for (const id of ['C01', 'C02', 'C03', 'C04', 'C05']) {
    kase(`MK-CF-F-216-${id}`, 'AGREES', 'present and not blank; zero is present', (c) => typed(old(c.inputs.old_profile)?.rentalIncome), (c, g) => expect(g).toBe(c.expected));
    kase(`MK-CF-F-217-${id}`, 'AGREES', 'any old rent field, even its kind', (c) => hasOldRentFigure(old(c.inputs.old_profile)), (c, g) => expect(g).toBe(c.expected));
  }
});

describe('MK-CF-F-218 moveOldRentFigure — five cases', () => {
  const OLD: Record<string, string> = { rent: 'rentalIncome', cost: 'rentalExpenses', kind: 'rentalType' };
  const row = (r: any) => ({ ...(r.property !== undefined ? { property_id: r.property } : {}), ...(r.rent !== undefined ? { income: r.rent } : {}), ...(r.cost !== undefined ? { expenses: r.cost } : {}) });
  const op = (i: any) => ({ ...(i.old ? Object.fromEntries(Object.entries(i.old).map(([k, v]) => [OLD[k], v])) : {}),
    ...(i.list === null ? {} : { rentals: Array.isArray(i.list) ? i.list.map(row) : i.list }) });
  const run = (c: any) => { const before = op(c.inputs); return { before, after: moveOldRentFigure(before as any) as any }; };
  const back = (r: any) => ({ property: r.property_id ?? '', rent: r.income, ...(r.expenses !== undefined ? { cost: r.expenses } : {}), ...(r.type ? { kind: r.type } : {}) });
  const check = (c: any, g: any) => {
    expect((g.after.rentals ?? []).map(back)).toEqual(c.expected.list);
    if (c.expected.old_removed) expect(['rentalIncome', 'rentalExpenses', 'rentalType'].some((k) => k in g.after)).toBe(false);
  };
  kase('MK-CF-F-218-C01', 'AGREES', 'moved once, as typed, with no property', run, check);
  kase('MK-CF-F-218-C02', 'AGREES', 'nothing to move', run, check);
  kase('MK-CF-F-218-C03', 'AGREES', 'an existing named list wins', run, check);
  kase('MK-CF-F-218-C04', 'AGREES', 'the words kept, not parsed', run, check);
  kase('MK-CF-F-218-C05', 'AGREES', 'an unreadable list leaves everything alone', run, (c, g) => { expect(c.expected.unchanged).toBe(true); expect(g.after).toBe(g.before); });
});

describe('coverage — part 3', () => {
  test('55 of 55 cases run, each once', () => {
    expect(PART.cases.length).toBe(55);
    expect([...RAN].sort()).toEqual(PART.cases.map((x: any) => x.case_id).sort());
  });
});

// ═══════════════════ FORMULA VERDICTS (5 of 11 not RIGHT) AND RULES (2 of 18 NOT HELD) ═══════════════════
// MK-CF-F-064's second point — "vesting is not cash unless a sale pays it" — is NEEDS A RULING (results file); its first,
// the undated year, is APP WRONG (C05). The card is classified by its worse half.
const FORMULA: Record<string, Mark> = {
  'MK-CF-F-063': 'APP WRONG', 'MK-CF-F-064': 'APP WRONG', 'MK-CF-F-065': 'APP WRONG', 'MK-CF-F-066': 'APP WRONG', 'MK-CF-F-219': 'APP WRONG',
};
const RULES: Record<string, Mark> = { 'DEC-0003': 'APP WRONG', 'DEC-0296': 'APP WRONG' };
describe('formula verdicts and rules — part 3', () => {
  test('every verdict that is not RIGHT, and every rule NOT HELD, is classified here (5 and 2)', () => {
    expect(Object.keys(FORMULA).sort()).toEqual(PART.formula_checks.filter((f: any) => f.verdict !== 'RIGHT').map((f: any) => f.id).sort());
    expect(Object.keys(RULES).sort()).toEqual(PART.rules_held.filter((r: any) => r.verdict === 'NOT HELD').map((r: any) => r.rule).sort());
    expect(PART.formula_checks.length).toBe(11);
    expect(PART.rules_held.length).toBe(18);
  });
  // RULED 2026-10-25 (the lead's ruling, the same shape as his DEC-0179 and DEC-0198; FIX-INCOME-B vestsAreCash): a vest is taxed
  // in its year; kept as shares it is no month's money; sold when it vests ("Do you sell the shares when they vest?") it lands
  test('MK-CF-F-064 · RULED 2026-10-25: a vest kept as shares is not money to spend; sold when it vests, it lands in its month', () => {
    const op: any = { equityType: 'rsu', rsuGrants: [{ shares: 10, price: 100, date: '2026-03' }] };
    expect(incomeMonthlyGrid(op, 'gross', new Date(2026, 9, 24))[2].amount).toBe(0);
    expect(incomeMonthlyGrid({ ...op, rsuSoldAtVest: 'yes' }, 'gross', new Date(2026, 9, 24))[2].amount).toBe(1000);
  });
  test.failing('MK-CF-F-064 · what the app gave before the ruling (pinned, now failing): a vest landed as money to spend', () => {
    const g = incomeMonthlyGrid({ equityType: 'rsu', rsuGrants: [{ shares: 10, price: 100, date: '2026-03' }] } as any, 'gross', new Date(2026, 9, 24));
    expect(g[2].amount).toBe(1000);
  });
});
