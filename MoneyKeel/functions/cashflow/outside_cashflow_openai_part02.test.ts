/* THE OUTSIDE CASES, RUN AGAINST THE APP — Cash flow, OpenAI package of 2026-10-24, PART 2 of 19:
 * "Earners, and a salary that varies". Measured 2026-10-25 by CFR-1.
 * Cards: MK-CF-F-172 hasWage · MK-CF-F-173 earnerWages · MK-CF-F-174 hasTwoEarners · MK-CF-F-175 sumOverEarners ·
 * MK-CF-F-176 sumMonthsOverEarners · MK-CF-F-188 householdPreTaxContributionsAnnual (src/domain/income/earners.ts) ·
 * MK-CF-F-163 monthKey · MK-CF-F-164 monthWindow · MK-CF-F-165 salaryMonths · MK-CF-F-166 hasMonthlySalaryTable ·
 * MK-CF-F-167 salaryCalendarYear · MK-CF-F-168 salaryWindow · MK-CF-F-169 withSalaryMonth · MK-CF-F-170
 * salaryYearFromCells (src/domain/income/salary-months.ts).
 *
 * Source, unchanged: …/MoneyKeel_CashFlow_Independent_Audit/audit_results/MoneyKeel_CashFlow_Audit_Part_02.json. Every
 * expected answer is READ FROM THE PACKAGE, never retyped. Results: returned/results/cashflow_openai_part02_results.json.
 * MEASURED ONLY: no app code, record or drawing was changed. Markers as in part 1's file.
 *
 * INPUT NAMES MAPPED:
 *   base / table → baseSalary / salaryByMonth on one wage; who_earns 'spouse' → the app's 'partner' (WhoEarns is
 *     'you' | 'partner' | 'both'); you / spouse → the profile's own block / partnerWage. earnerWages' answer is read as
 *     identities: the profile itself is "you", partnerWage is "spouse".
 *   figures (F-175) → one figure per earner, handed back by the callback for that earner's block; one figure = one earner,
 *     two = whoEarns 'both' with a spouse wage.
 *   earners [{k, paid_months}] (F-188) → each a wage paid $5,000 in its LAST paid_months months of 2026 (July on for six),
 *     $0 before, with c_401k = k.
 *   local_timestamp → a Date built from the timestamp's own wall clock (year, month, day, hour, minute), which is what the
 *     person's device holds in their zone; from (F-164) → that local day.
 *   stored / canonical_table / table → salaryByMonth; year / as_of_year → the year handed in, or the clock "now".
 * hasWage is not exported: it is compiled from its own source text in earners.ts.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { earnerWages, hasTwoEarners, sumOverEarners, sumMonthsOverEarners, householdPreTaxContributionsAnnual } from '../../../src/domain/income/earners';
import { monthKey, monthWindow, salaryMonths, hasMonthlySalaryTable, salaryCalendarYear, salaryWindow, withSalaryMonth, salaryYearFromCells } from '../../../src/domain/income/salary-months';
import { wageGrossByMonth, wageMatchMonthly, householdK401ByMonth } from '../../../src/domain/income/onboarding';
import { taxableIncomeSteps } from '../../../src/domain/planning/index';
import { taxedAfterPreTax } from '../../../src/domain/income/tax-rate';
import { toNum } from '../../../src/domain/_shared/num';

/** FIXED (2026-10-26, FIX-INCOME-A): an APP WRONG case whose fix landed — the reviewer's answer is a plain test, the old pin test.failing.
 *  RULED: a NEEDS A RULING case settled by a lead's ruling — the ruled answer is a plain test, the old pin test.failing. */
type Mark = 'AGREES' | 'APP WRONG' | 'REVIEWER WRONG' | 'NEEDS A RULING' | 'OUTSIDE DOMAIN' | 'FIXED' | 'RULED';
const PKG = path.join(__dirname, '../../documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/MoneyKeel_CashFlow_Independent_Audit/audit_results');
const PART = JSON.parse(fs.readFileSync(path.join(PKG, 'MoneyKeel_CashFlow_Audit_Part_02.json'), 'utf8'));
const C = (id: string): any => { const c = PART.cases.find((x: any) => x.case_id === id); if (!c) throw new Error(`no case ${id}`); return c; };
/** test.failing, or a plain test when the measurer sets CFR_STRICT to read each failure's own message */
const failing: jest.It = process.env.CFR_STRICT ? test : test.failing;
const RAN: string[] = [];
const ACT: Record<string, unknown> = {};
const DUMP = process.env.CFR2_DUMP;
afterAll(() => { if (DUMP) fs.writeFileSync(DUMP, JSON.stringify(ACT, null, 1)); });
const kase = (id: string, mark: Mark, why: string, run: (c: any) => any, check: (c: any, got: any) => void, pin?: (got: any, c: any) => void) => {
  const c = C(id);
  RAN.push(id);
  const r = mark === 'APP WRONG' || mark === 'REVIEWER WRONG' ? failing : test;
  r(`${id} · ${c.kind} · ${c.title} [${mark}] — ${why}`, () => { const got = run(c); ACT[id] = got; check(c, got); });
  if (pin && (mark === 'FIXED' || mark === 'RULED')) test.failing(`${id} · the app until 2026-10-26, pinned (no longer its answer) [${mark}]`, () => pin(run(c), c));
  else if (pin) test(`${id} · the app's answer today, pinned [${mark}]`, () => pin(run(c), c));
};
const X = (s: any): number => { if (typeof s === 'number') return s; const m = /^(-?[\d.]+)\/([\d.]+)$/.exec(String(s)); return m ? Number(m[1]) / Number(m[2]) : Number(s); };
const money = (got: number, exp: any) => expect(got).toBeCloseTo(X(exp?.exact ?? exp), 6);
const months12 = (got: number[], exp: any[]) => { expect(got).toHaveLength(12); exp.forEach((e, i) => expect(got[i]).toBeCloseTo(X(e.exact), 6)); };
const mapOf = (got: Record<string, number>, exp: Record<string, any>) => {
  expect(Object.keys(got).sort()).toEqual(Object.keys(exp).sort());
  for (const k of Object.keys(exp)) expect(got[k]).toBeCloseTo(X(exp[k].exact), 6);
};
const KEYS = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`);
const dated = (arr: any[]) => Object.fromEntries(arr.map((v, i) => [KEYS[i], v]));

const compileConst = (file: string, name: string) => {
  const text = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const at = text.search(new RegExp(`const ${name} = `));
  if (at < 0) throw new Error(`${name} not found in ${file}`);
  const code = text.slice(at, text.indexOf(';\n', at) + 2);
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText;
  return new Function(`${js}\nreturn ${name};`)();
};
const hasWage: (w: any) => boolean = compileConst('../../../src/domain/income/earners.ts', 'hasWage');
const WHO: Record<string, string> = { you: 'you', both: 'both', spouse: 'partner' };
const household = (i: any) => ({ whoEarns: WHO[i.who_earns], baseSalary: i.you?.base, salaryFreq: 'monthly', ...(i.you?.table ? { salaryByMonth: i.you.table } : {}),
  partnerWage: i.spouse ? { baseSalary: i.spouse.base, salaryFreq: 'monthly', ...(i.spouse.table ? { salaryByMonth: i.spouse.table } : {}) } : null });
const names = (op: any, rows: any[]) => rows.map((w) => (w === op ? 'you' : w === op.partnerWage ? 'spouse' : '?'));

beforeAll(() => { jest.useFakeTimers(); jest.setSystemTime(new Date(2026, 9, 24, 12, 0, 0)); });
afterAll(() => { jest.useRealTimers(); });

// ═══════════════════════════════════════════ THE 70 CASES ═══════════════════════════════════════════

describe('MK-CF-F-172 hasWage — five cases (its own source text)', () => {
  const run = (c: any) => hasWage(c.inputs.wage === null ? null : { baseSalary: c.inputs.base, salaryByMonth: c.inputs.table });
  for (const id of ['C01', 'C02', 'C03', 'C04', 'C05']) kase(`MK-CF-F-172-${id}`, 'AGREES', 'a positive base or a stored table', run, (c, g) => expect(g).toBe(c.expected));
});

describe('MK-CF-F-173 earnerWages · MK-CF-F-174 hasTwoEarners — ten cases', () => {
  for (const id of ['C01', 'C02', 'C03', 'C04', 'C05']) {
    kase(`MK-CF-F-173-${id}`, 'AGREES', 'who earns decides; a spouse needs a wage', (c) => { const op = household(c.inputs); return names(op, earnerWages(op as any)); }, (c, g) => expect(g).toEqual(c.expected));
    kase(`MK-CF-F-174-${id}`, 'AGREES', 'two wage rows', (c) => hasTwoEarners(household(c.inputs) as any), (c, g) => expect(g).toBe(c.expected));
  }
});

describe('MK-CF-F-175 sumOverEarners — five cases', () => {
  const op2 = { whoEarns: 'both', baseSalary: 5000, partnerWage: { baseSalary: 3000 } };
  const run = (c: any) => {
    const f = c.inputs.figures;
    const op = f.length === 1 ? { baseSalary: 5000 } : op2;
    return sumOverEarners(op as any, (w) => (w === op ? f[0] : f[1]));
  };
  kase('MK-CF-F-175-C01', 'AGREES', 'one figure', run, (c, g) => money(g, c.expected));
  kase('MK-CF-F-175-C02', 'AGREES', '1000 + 2000', run, (c, g) => money(g, c.expected));
  kase('MK-CF-F-175-C03', 'AGREES', '923.17 + 611.29', (c) => sumOverEarners(op2 as any, (w) => toNum(w === op2 ? c.inputs.figures[0] : c.inputs.figures[1])), (c, g) => money(g, c.expected));
  // OUTSIDE DOMAIN: a household has at most two wages — earnerWages returns the profile and partnerWage, nothing more —
  // so a third amount cannot be handed in. Proved: a profile carrying a third wage block still yields two rows.
  kase('MK-CF-F-175-C04', 'OUTSIDE DOMAIN', 'a household has at most two earners (earnerWages)',
    () => earnerWages({ whoEarns: 'both', baseSalary: 5000, partnerWage: { baseSalary: 3000 }, thirdWage: { baseSalary: 1000 } } as any).length,
    (c, g) => { expect(c.inputs.figures).toHaveLength(3); expect(g).toBe(2); });
  // OUTSIDE DOMAIN: no caller hands sumOverEarners a missing figure. Its two callers (read from the source) pass
  // wageMatchMonthly and (w) => toNum(w.c_401k), and both read a blank as 0 — which for the 401(k) is what Your base pay
  // says a blank means ("Leave blank if you don't contribute", src/screens/BasePayScreen.tsx). The literal answer for a
  // null second figure, pinned: $1,000.
  kase('MK-CF-F-175-C05', 'OUTSIDE DOMAIN', 'both callers read a blank figure as $0, never null',
    (c) => sumOverEarners(op2 as any, (w) => (w === op2 ? c.inputs.figures[0] : c.inputs.figures[1])),
    (c) => {
      expect(c.expected.state).toBe('REFUSES');
      // every call in the app's source (src/, app/, MoneyKeel/functions — tests left out), read from disk: two, and these two
      const ROOT = path.join(__dirname, '../../..');
      const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory()
        ? (e.name === 'node_modules' || e.name === '__tests__' ? [] : walk(path.join(d, e.name)))
        : /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [path.join(d, e.name)] : []));
      const files = ['src', 'app', 'MoneyKeel/functions'].flatMap((d) => walk(path.join(ROOT, d)));
      expect(files.length).toBeGreaterThanOrEqual(250);   // the guard proves it looked
      const calls = files.flatMap((f) => fs.readFileSync(f, 'utf8').split('\n').filter((l) => /sumOverEarners\(op,/.test(l)).map((l) => l.trim()));
      // one since 2026-10-26 (FIX-INCOME-A): MK-CF-F-188 now reads the paid months' 401(k)s from MK-CF-F-206, not sumOverEarners × 12
      expect(calls.sort()).toEqual(['return sumOverEarners(op, wageMatchMonthly);']);
      expect([wageMatchMonthly({}), toNum(undefined)]).toEqual([0, 0]);
      expect(fs.readFileSync(path.join(__dirname, '../../../src/screens/BasePayScreen.tsx'), 'utf8')).toContain('Leave blank if you don’t contribute.');
    },
    (g) => expect(g).toBe(1000));
});

describe('MK-CF-F-176 sumMonthsOverEarners — five cases', () => {
  const run = (c: any) => {
    const op = { whoEarns: 'both', baseSalary: 1, partnerWage: { baseSalary: 1 } };
    return sumMonthsOverEarners(op as any, (w) => (w === op ? c.inputs.earner_1_months : c.inputs.earner_2_months).map(toNum));
  };
  for (const id of ['C01', 'C02', 'C03', 'C04', 'C05']) kase(`MK-CF-F-176-${id}`, 'AGREES', 'slot by slot', run, (c, g) => months12(g, c.expected));
});

describe('MK-CF-F-188 householdPreTaxContributionsAnnual — five cases', () => {
  const wageOf = (e: any) => ({ salaryFreq: 'monthly', c_401k: e.k, salaryByMonth: dated(Array.from({ length: 12 }, (_, i) => (i >= 12 - e.paid_months ? 5000 : 0))) });
  const op = (i: any) => (i.earners.length === 1 ? wageOf(i.earners[0]) : { ...wageOf(i.earners[0]), whoEarns: 'both', partnerWage: wageOf(i.earners[1]) });
  const run = (c: any) => householdPreTaxContributionsAnnual(op(c.inputs) as any);
  kase('MK-CF-F-188-C01', 'AGREES', '500 × 12', run, (c, g) => money(g, c.expected));
  kase('MK-CF-F-188-C02', 'AGREES', '500 × 12 + 300 × 12', run, (c, g) => money(g, c.expected));
  // APP WRONG — real (DEC-0252 "the tax organizer shows gross income, 401(k) contribution, standard deduction and taxable
  // income" — the subtraction must be the household's real contribution; DEC-0376; tenet 4: one 401(k) figure). It adds each
  // earner's monthly 401(k) × 12 although householdK401ByMonth (MK-CF-F-206), which the tax itself is worked on
  // (MK-CF-F-230 taxedAfterPreTax), counts it only in the months that earner is paid. Its one caller is MK-PL-F-082
  // taxableIncomeSteps — the Tax organizer's "401(k) contribution" line — so that line reads $13,340.40 where the tax took
  // off $9,060.78.
  // FIXED 2026-10-26 (FIX-INCOME-A): the 401(k)s of the months each earner is paid — MK-CF-F-206, the count the tax is worked on
  kase('MK-CF-F-188-C03', 'FIXED', 'the 401(k)s of the paid months (DEC-0252, tenet 4; it was × 12)', run, (c, g) => money(g, c.expected),
    (g, c) => { expect(g).toBeCloseTo((713.27 + 398.43) * 12, 6); expect(householdK401ByMonth(op(c.inputs) as any).reduce((t, m) => t + m, 0)).toBeCloseTo(9060.78, 6); });
  kase('MK-CF-F-188-C04', 'FIXED', 'both part-year, the paid months (DEC-0252, tenet 4; it was × 12)', run, (c, g) => money(g, c.expected), (g) => expect(g).toBeCloseTo((821.15 + 233.19) * 12, 6));
  kase('MK-CF-F-188-C05', 'FIXED', 'no paid months, no 401(k) (DEC-0252, tenet 4; it was × 12)', run, (c, g) => money(g, c.expected), (g) => expect(g).toBe(12000));
  test('MK-CF-F-188 · where it reaches: the Tax organizer\'s 401(k) step reads $9,060.78, the paid months the tax is worked on [FIXED 2026-10-26]', () => {
    const o = op(C('MK-CF-F-188-C03').inputs);
    expect(taxableIncomeSteps(o as any, 90000).preTaxContributions).toBeCloseTo(9060.78, 6);
    expect(taxableIncomeSteps(o as any, 90000).preTaxContributions).toBeCloseTo(90000 - taxedAfterPreTax(o as any), 6);
  });
  test.failing('MK-CF-F-188 · the app until 2026-10-26, pinned (no longer its answer): the Tax organizer\'s 401(k) step reads × 12 while the tax is worked on the paid months', () => {
    const o = op(C('MK-CF-F-188-C03').inputs);
    const steps = taxableIncomeSteps(o as any, 90000);
    expect(steps.preTaxContributions).toBeCloseTo(13340.4, 6);
    expect(householdK401ByMonth(o as any).reduce((t, m) => t + m, 0)).toBeCloseTo(9060.78, 6);
    expect(taxedAfterPreTax(o as any)).toBeCloseTo(90000 - 9060.78, 6);   // the wages, $90,000, less the paid months' 401(k)s
  });
});

describe('MK-CF-F-163 monthKey · MK-CF-F-164 monthWindow — ten cases', () => {
  const local = (iso: string) => { const [d, t] = iso.split('T'); const [y, m, dd] = d.split('-').map(Number); const [hh, mm] = t.split(':').map(Number); return new Date(y, m - 1, dd, hh, mm); };
  for (const id of ['C01', 'C02', 'C03', 'C04', 'C05']) {
    kase(`MK-CF-F-163-${id}`, 'AGREES', 'the local year and month', (c) => monthKey(local(c.inputs.local_timestamp)), (c, g) => expect(g).toBe(c.expected));
    kase(`MK-CF-F-164-${id}`, 'AGREES', 'successive calendar months', (c) => { const [y, m, d] = c.inputs.from.split('-').map(Number); return monthWindow(new Date(y, m - 1, d), c.inputs.back, c.inputs.count); }, (c, g) => expect(g).toEqual(c.expected));
  }
});

describe('MK-CF-F-165 salaryMonths · MK-CF-F-166 hasMonthlySalaryTable — ten cases', () => {
  const now = (i: any) => (i.as_of_year ? new Date(i.as_of_year, 0, 15) : i.year ? new Date(i.year, 9, 24) : new Date(2026, 9, 24));
  for (const id of ['C01', 'C02', 'C03', 'C04', 'C05']) {
    kase(`MK-CF-F-165-${id}`, 'AGREES', 'the canonical dated table', (c) => salaryMonths({ salaryByMonth: c.inputs.stored } as any, now(c.inputs)), (c, g) => mapOf(g, c.expected));
    kase(`MK-CF-F-166-${id}`, 'AGREES', 'a table with any row, zero included', (c) => hasMonthlySalaryTable({ salaryByMonth: c.inputs.canonical_table } as any), (c, g) => expect(g).toBe(c.expected));
  }
});

describe('MK-CF-F-167 salaryCalendarYear · MK-CF-F-168 salaryWindow — ten cases', () => {
  for (const id of ['C01', 'C02', 'C03', 'C04', 'C05']) {
    kase(`MK-CF-F-167-${id}`, 'AGREES', 'each dated slot, else the fallback', (c) => salaryCalendarYear({ salaryByMonth: c.inputs.table } as any, c.inputs.year, toNum(c.inputs.fallback)), (c, g) => months12(g, c.expected));
    kase(`MK-CF-F-168-${id}`, 'AGREES', 'each requested key, else the fallback', (c) => Object.fromEntries(salaryWindow({ salaryByMonth: c.inputs.table } as any, c.inputs.window_keys, toNum(c.inputs.fallback))), (c, g) => mapOf(g, c.expected));
  }
});

describe('MK-CF-F-169 withSalaryMonth — five cases', () => {
  const run = (c: any) => withSalaryMonth({ salaryByMonth: c.inputs.table } as any, c.inputs.key, c.inputs.amount);
  kase('MK-CF-F-169-C01', 'AGREES', 'October set', run, (c, g) => mapOf(g, c.expected));
  kase('MK-CF-F-169-C02', 'AGREES', 'October replaced', run, (c, g) => mapOf(g, c.expected));
  kase('MK-CF-F-169-C03', 'AGREES', 'other years untouched', run, (c, g) => mapOf(g, c.expected));
  kase('MK-CF-F-169-C04', 'AGREES', 'a typed zero kept', run, (c, g) => mapOf(g, c.expected));
  // NEEDS A RULING — the reviewer wrote RULE UNCLEAR, and no ruling of his says what clearing a month's cell means. The app
  // reads it as a confirmed $0 (toNum('') = 0). withSalaryMonth itself has no caller. IN FLIGHT (seen 2026-10-25, uncommitted,
  // not yet in the decision log): the lead's drawing check IN-05 (READ THIS FIRST row of income-end-to-end_v07) has Your base
  // pay delete a cleared month, so it counts as the typical month again — reading (a). Until then, and still in the two
  // functions, a stored '' reads as $0 (pinned below). Recommendation in the results file: reading (a), in both functions too
  // (tenet 3; the app's own rule in wageGrossByMonth, "Silence is not $0").
  // RULED 2026-10-25 (the lead's ruling 1 on CFR-1 and CFR-5's F7; tenet 3 "silence is not $0"): a cleared month is not entered, so
  // it counts as the typical month — reading (a). Built in MK-CF-F-165 salaryMonths by CF-MMFIX-B (2026-10-25) and in this function
  // by FIX-INCOME-A (2026-10-26): a blank amount takes the month out. A typed 0 stays $0 (C04).
  kase('MK-CF-F-169-C05', 'RULED', 'a cleared cell is not entered — the reading "unentered" (the lead\'s ruling 1, tenet 3)', run,
    (c, g) => { expect(c.expected.state).toBe('RULE UNCLEAR'); expect(g).toEqual(c.expected.readings.unentered); },
    (g) => expect(g).toEqual({ '2026-10': 0 }));
  test('MK-CF-F-169-C05 · the stored path (RULED, FIXED 2026-10-25 by CF-MMFIX-B in MK-CF-F-165): a month stored as \'\' is not entered, so it counts the typical $5,000', () => {
    const wage = { baseSalary: '5000', salaryFreq: 'monthly', salaryMonthMode: 'months', salaryByMonth: { '2026-10': '' } };
    expect(salaryMonths(wage as any)).toEqual({});
    expect(wageGrossByMonth(wage)[9]).toBe(5000);
  });
  test.failing('MK-CF-F-169-C05 · the stored path, the app until 2026-10-25, pinned (no longer its answer): a month stored as \'\' (a cleared box, as Your base pay saved it at b1c659e8) counts $0, not the typical $5,000', () => {
    const wage = { baseSalary: '5000', salaryFreq: 'monthly', salaryMonthMode: 'months', salaryByMonth: { '2026-10': '' } };
    expect(salaryMonths(wage as any)).toEqual({ '2026-10': 0 });
    expect(wageGrossByMonth(wage)[9]).toBe(0);
    expect(wageGrossByMonth(wage)[8]).toBe(5000);
  });
});

describe('MK-CF-F-170 salaryYearFromCells — five cases', () => {
  for (const id of ['C01', 'C02', 'C03', 'C04', 'C05']) kase(`MK-CF-F-170-${id}`, 'AGREES', 'cell 1 is January; twelve at most', (c) => salaryYearFromCells(c.inputs.cells, c.inputs.year), (c, g) => mapOf(g, c.expected));
});

describe('coverage — part 2', () => {
  test('70 of 70 cases run, each once', () => {
    expect(PART.cases.length).toBe(70);
    expect([...RAN].sort()).toEqual(PART.cases.map((x: any) => x.case_id).sort());
  });
});

// ═══════════════════ FORMULA VERDICTS (3 of 14 not RIGHT) AND RULES (1 of 1 NOT HELD) ═══════════════════
// the reviewer's verdicts, classified as measured (2026-10-25); F-188 FIXED and F-169 RULED on 2026-10-26 (see their cases)
const FORMULA: Record<string, Mark> = { 'MK-CF-F-175': 'OUTSIDE DOMAIN', 'MK-CF-F-188': 'APP WRONG', 'MK-CF-F-169': 'NEEDS A RULING' };
const RULES: Record<string, Mark> = { 'DEC-0252': 'APP WRONG' };
describe('formula verdicts and rules — part 2', () => {
  test('every verdict that is not RIGHT, and every rule NOT HELD, is classified here (3 and 1)', () => {
    expect(Object.keys(FORMULA).sort()).toEqual(PART.formula_checks.filter((f: any) => f.verdict !== 'RIGHT').map((f: any) => f.id).sort());
    expect(Object.keys(RULES).sort()).toEqual(PART.rules_held.filter((r: any) => r.verdict === 'NOT HELD').map((r: any) => r.rule).sort());
    expect(PART.formula_checks.length).toBe(14);
    expect(PART.rules_held.length).toBe(1);
  });
});
