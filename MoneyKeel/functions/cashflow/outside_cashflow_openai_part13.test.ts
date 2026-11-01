/* THE OUTSIDE CASES, RUN AGAINST THE APP — Cash flow module, OpenAI package of 2026-10-24, PART 13 of 19.
 * Cards: MK-CF-O-005 theContributionRoom · MK-CF-F-197 ageAttainedInYear · MK-CF-F-195 monthsLeftInYear · MK-CF-F-196
 * perMonthToFill · MK-CF-F-053 annual401kLimit · MK-CF-F-054 annualIraLimit · MK-CF-F-055 annualHsaLimit · MK-CF-F-056
 * k401Headroom · MK-CF-F-057 rothVsTraditional · MK-CF-F-058 rothConversionWindow · MK-CF-O-017 futurePaycheck ·
 * MK-CF-F-105 guaranteedRows · MK-CF-F-106 solveSafeDraw · MK-CF-F-107 buildPaycheckYear.
 *
 * THIS FILE'S SHARE (CFR-4, 2026-10-25): part 13's 70 cases, plus the 9 witnesses of its one source check (contribution
 * limits 2026), plus — at the lead's request, in its own block and NOT counted in the 70 — the zero-return branch of
 * MK-CF-F-126 futureValue / MK-CF-F-229 balanceGrownTo, whose cards are part 10's (another measurer owns those cases).
 * Formula checks, rules held, could-not-test: classified in the results file, not here.
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/
 * MoneyKeel_CashFlow_Independent_Audit/audit_results/MoneyKeel_CashFlow_Audit_Part_13.json. Every expected answer is READ
 * FROM THE PACKAGE (C(id).expected), never retyped; only its plain input names are mapped onto the app's fields. Results,
 * case by case: MoneyKeel/documents/audit/outside-test-cases/returned/results/cashflow_openai_part13_results.json
 *
 * MEASURED ONLY 2026-10-25: no app code, drawing, record or existing test was changed.
 * FIXED 2026-10-25 (FIX-ROOM): every APP WRONG case of this part, the witness beyond the 70, source witness 9 and the lead's
 * zero-return check now pass on the reviewer's answer, marked FIXED; the app's old answer is kept beside each as test.failing,
 * never deleted. MK-CF-O-005-C01 (NEEDS RULING) is DECIDED by the lead's ruling: the plan arithmetic stays and is said in words.
 *
 * Markers: AGREE → test on the reviewer's answer · APP WRONG → test.failing on the reviewer's answer (turns red when the
 * fix lands) · NEEDS RULING → a plain test pinning the app's current, hand-checked answer (both readings in the results
 * file) · BLOCKED → test.skip naming the input the app does not have · OUTSIDE DOMAIN → a plain test recording what the app
 * does, the caller that can never send it named in the test's title.
 *
 * INPUT NAMES MAPPED (the app's fields, never the answers):
 *   Contribution room (MK-CF-O-005): birth_year → profile.birthYear; a monthly 401(k) plan (monthly_plan_401k,
 *   k_monthly_plan, monthly_k) → profile.c_401k, the only 401(k) amount the app stores (MK-XS-I-043, a MONTHLY amount);
 *   a Roth IRA amount → profile.c_roth; medicare → profile.medicareEnrolled 'yes'/'no'. The app has NO input for money
 *   already contributed this year, for a Traditional IRA, or for HSA cover (self / family) — a case that needs one is
 *   BLOCKED or NEEDS RULING, never fed a stand-in. SINCE 2026-10-27 (#361): hsa_coverage → profile.hsaCover ('self' / 'family'),
 *   and one IRA amount a month for Traditional and Roth together → profile.c_ira; money already in this year still has none (DEC-8406). as_of → the `today` the door takes AND the clock (jest fake timers),
 *   because the door reads the age from the device clock, not from `today`.
 *   Limits (F-053/054/055/056/197): age_attained_2026 / age → the age argument; family_cover → family; medicare →
 *   medicareEnrolled; contributed_ytd → k401Headroom's annual contribution. An HSA eligible-months count or a Medicare
 *   start date has no argument to go to.
 *   Months (F-195/196): date → a local Date at noon on that day; room → roomLeft.
 *   Roth (F-057/058): marginal rates as decimals; claim_age null → 0, which the function reads as "not given".
 *   Paycheck (F-105/107): a stream {kind, amount, frequency, month} → profile ri_<key>, ri_<key>_freq, ri_<key>_month with
 *   incomeSources ['retirement_income'] (ss → ri_ss, pension → ri_pension, annuity → ri_annuities, other → ri_other;
 *   "yearly" → 'annual', the word the app stores); a dated big bill → a non-monthly spendCats row in its month with its
 *   due day; existing_withdrawal_monthly → ri_withdrawals. "independent_supported_draw" is a number the reviewer supplies
 *   instead of a simulation: futurePaycheck is COMPILED FROM ITS OWN SOURCE TEXT with only the simulation-side calls
 *   (simulate / willItLastInputs / ageFromProfile / guaranteedOutsideStreams / buildPaycheckYear) handed the reviewer's
 *   numbers. buildPaycheckYear is the REAL MODULE, loaded on its own with only the simulation (simulate) replaced by the
 *   reviewer's oracle: a draw holds below the next $5 step above the reviewer's draw and fails at or beyond it, so the app's
 *   own search (MK-CF-F-106) hands back the reviewer's draw (CLEANUP-TESTS, 2026-10-26: the source-text copy broke when
 *   buildPaycheckYear began calling datedBillsIn — a copy needs every callee listed by hand; the real module does not).
 *   Safe draw (F-106): pot → nestEgg, guaranteed → guaranteedMonthlyAvg, years → horizon_age − current_age. The reviewer
 *   gives no return, volatility or inflation, so these ASSUMED plan figures are used and named: current age 67, mean
 *   return 6%, volatility 12%, inflation 2.5%, 1,000 paths, seed 42 (DEC-0247). C04's "independent chance oracle" is
 *   handed to a copy of solveSafeDraw compiled from its own source with that oracle in place of simulate.
 * TOLERANCES: money to 1e-6 dollars (toBeCloseTo …, 6); strings exact; REFUSES / expected null = no number (null), never 0.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { theContributionRoom } from './contribution-room';
import { futurePaycheck } from './future-paycheck';
import {
  ageAttainedInYear, monthsLeftInYear, perMonthToFill, annual401kLimit, annualIraLimit, annualHsaLimit, k401Headroom,
  rothVsTraditional, rothConversionWindow,
} from '../../../src/domain/income/limits';
import { guaranteedRows, solveSafeDraw, buildPaycheckYear } from '../../../src/domain/paycheck';
import { simulate } from '../../../src/domain/retirement';
import { balanceGrownTo } from '../../../src/domain/debt/mortgageVsTreasury';

// ── the package, read as it came ────────────────────────────────────────────────────────────────────
type Mark = 'AGREE' | 'APP WRONG' | 'REVIEWER WRONG' | 'NEEDS RULING' | 'BLOCKED' | 'OUTSIDE DOMAIN' | 'FIXED' | 'DECIDED';
const PKG = path.join(__dirname, '../../documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/MoneyKeel_CashFlow_Independent_Audit/audit_results');
const PART = JSON.parse(fs.readFileSync(path.join(PKG, 'MoneyKeel_CashFlow_Audit_Part_13.json'), 'utf8'));
const C = (caseId: string): any => {
  const c = PART.cases.find((x: any) => x.case_id === caseId);
  if (!c) throw new Error(`no case ${caseId} in the package`);
  return c;
};
const X = (e: any): number => Number(e.exact);   // an exact decimal string from the package, as a number

// what each case actually returned, written out only when CFR13_DUMP names a file (the results file is built from it)
const RAN: string[] = [];
const DUMP: Record<string, { mark: Mark; mapped: string; note: string; actual?: any }> = {};
const runner = (mark: Mark) => (mark === 'APP WRONG' ? test.failing : mark === 'BLOCKED' ? test.skip : test);   // FIXED and DECIDED run as plain tests
const kase = (caseId: string, mark: Mark, mapped: string, fn: (c: any, rec: (a: any) => void) => void, note = '', record?: () => any) => {
  RAN.push(caseId);
  DUMP[caseId] = { mark, mapped, note };
  if (record) { try { DUMP[caseId].actual = record(); } catch (e: any) { DUMP[caseId].actual = `threw: ${e?.message}`; } }
  const c = C(caseId);
  runner(mark)(`${caseId} · ${c.kind} · ${c.title} [${mark}]${note ? ` — ${note}` : ''}`, () => fn(c, (a) => { DUMP[caseId].actual = a; }));
};
afterAll(() => {
  const out = process.env.CFR13_DUMP;
  if (out) fs.writeFileSync(out, JSON.stringify(DUMP, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v), 1));
});

// ── helpers ─────────────────────────────────────────────────────────────────────────────────────────
const day = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, 12); };
/** run with the device clock at the case's own day: the room door and ageFromProfile read the clock for the age */
function onDay<T>(iso: string, fn: () => T): T {
  jest.useFakeTimers({ now: day(iso), doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'queueMicrotask'] });
  try { return fn(); } finally { jest.useRealTimers(); }
}
const room = (c: any, profile: Record<string, any>) => onDay(c.as_of, () => theContributionRoom({ profile, today: day(c.as_of) }));

/** compile an app function from its own source text, with the functions it calls handed in under their own names */
const compile = (absFile: string, parts: { start: RegExp; end: string }[], name: string, imported: Record<string, unknown>) => {
  const text = fs.readFileSync(absFile, 'utf8');
  const code = parts.map(({ start, end }) => {
    const at = text.search(start);
    if (at < 0) throw new Error(`${start} not found in ${absFile}`);
    return text.slice(at, text.indexOf(end, at) + end.length);
  }).join('\n');
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText;
  return new Function(...Object.keys(imported), `${js}\nreturn ${name};`)(...Object.values(imported));
};
const PAYCHECK_TS = path.join(__dirname, '../../../src/domain/paycheck/index.ts');
const FUTURE_TS = path.join(__dirname, 'future-paycheck.ts');
/** buildPaycheckYear, THE REAL MODULE, loaded on its own with the simulation replaced by the reviewer's draw: the chance is
 *  100 for a draw below the next $5 step above it and 0 from there up, so the app's own search (largest $5 step that holds)
 *  returns exactly the reviewer's draw. Nothing of the app's text is copied, so a new callee cannot go missing. */
const paycheckWithDraw = (draw: number): ((op: any, opts: any) => any) => {   // typed loosely, as the cases hand it the package's own shapes
  let real: ((op: any, opts: any) => any) | undefined;
  const RETIREMENT = '../../../src/domain/retirement';
  jest.isolateModules(() => {
    jest.doMock(RETIREMENT, () => ({
      ...jest.requireActual(RETIREMENT),
      simulate: (inp: any) => ({ chance_of_success: inp.retire_monthly_spend_today - inp.guaranteed_monthly_income < draw + 5 ? 100 : 0 }),
    }));
    real = require('../../../src/domain/paycheck').buildPaycheckYear;
    jest.dontMock(RETIREMENT);
  });
  return real!;
};
/** futurePaycheck, the app's own text, with the simulation side handed the reviewer's witnesses */
const futureWith = (stubs: { age: number | null; guaranteed: number; inputs: any; projected: number | null; draw: number }) =>
  compile(FUTURE_TS, [{ start: /function futurePaycheck\(/, end: '\n}\n' }], 'futurePaycheck', {
    ageFromProfile: () => stubs.age,
    guaranteedOutsideStreams: () => (stubs.guaranteed > 0 ? [{ kind: 'ss', monthly: stubs.guaranteed, inflates: true }] : []),
    willItLastInputs: () => stubs.inputs,
    simulate: () => ({ projected_at_retirement: stubs.projected }),
    buildPaycheckYear: () => ({ safeDrawMonthly: stubs.draw }),
    // the one retirement age (R10, 2026-10-31) is the app's own reader, not a stub: an age handed in is read as it is
    planRetireAgeOf: require('../../../src/domain/retirement/retireAge').planRetireAgeOf,
  });
/** solveSafeDraw, the app's own text, with the reviewer's chance oracle in place of simulate */
const safeDrawWithOracle = (oracle: (netDraw: number) => number) => compile(PAYCHECK_TS,
  [{ start: /function solveSafeDraw\(/, end: '\n}\n' }], 'solveSafeDraw',
  { simulate: (inp: any) => ({ chance_of_success: oracle(inp.retire_monthly_spend_today - inp.guaranteed_monthly_income) }) });

const SIM = (years: number, over: Record<string, number> = {}) =>
  ({ current_age: 67, horizon_age: 67 + years, mean_return: 0.06, vol_return: 0.12, inflation: 0.025, seed: 42, paths: 1000, ...over });
/** the chance solveSafeDraw tests a draw at — the same inputs it builds, so the property is checked on its own terms */
const chanceAt = (egg: number, g: number, sim: any, draw: number) => simulate({
  current_age: sim.current_age, retire_age: sim.current_age, horizon_age: sim.horizon_age, start_balance: egg, annual_contribution: 0,
  retire_monthly_spend_today: g + draw, guaranteed_monthly_income: g, guaranteed_start_age: sim.current_age,
  inflation: sim.inflation, mean_return: sim.mean_return, vol_return: sim.vol_return, paths: sim.paths, seed: sim.seed,
} as any).chance_of_success;

const RI_KEY: Record<string, string> = { ss: 'ss', pension: 'pension', annuity: 'annuities', other: 'other' };
const RI_FREQ: Record<string, string> = { monthly: 'monthly', quarterly: 'quarterly', yearly: 'annual', annual: 'annual' };
const streamsProfile = (streams: any[]) => {
  const op: Record<string, any> = { incomeSources: ['retirement_income'] };
  for (const s of streams) {
    const k = RI_KEY[s.kind];
    op['ri_' + k] = Number(s.amount); op['ri_' + k + '_freq'] = RI_FREQ[s.frequency];
    if (s.month) op['ri_' + k + '_month'] = s.month;
  }
  return op;
};
const ym = (r: { year: number; month: number }) => `${r.year}-${String(r.month).padStart(2, '0')}`;

const MAP_ROOM = 'theContributionRoom({ profile: { birthYear, c_401k = the monthly 401(k) plan, c_roth, medicareEnrolled }, today = as_of }), clock pinned to as_of';
const MAP_LIMIT = 'the limit function called with the case\'s age (and family / Medicare where given)';
const MAP_PAY = 'guaranteedRows(profile with ri_<key>, ri_<key>_freq, ri_<key>_month; incomeSources [retirement_income]), now = as_of';

// ══ MK-CF-O-005 theContributionRoom ═════════════════════════════════════════════════════════════════
describe('MK-CF-O-005 theContributionRoom — five cases', () => {
  kase('MK-CF-O-005-C01', 'DECIDED', MAP_ROOM + ' (contributed_ytd_401k 0 has no input; c_401k = 1000)', (c, rec) => {
    const r = room(c, { birthYear: c.inputs.birth_year, c_401k: c.inputs.monthly_plan_401k, c_roth: 0 });
    rec({ age: r.age, k_limit: r.k401.limit, k_used: r.k401.used, k_room: r.k401.remaining, ira_limit: r.ira.limit, months_left: r.monthsLeft });
    // what the app and the reviewer agree on
    expect(r.age).toBe(X(c.expected.age));
    expect(r.k401.limit).toBe(X(c.expected.k_limit));
    expect(r.ira.limit).toBe(X(c.expected.ira_limit));
    expect(r.monthsLeft).toBe(X(c.expected.months_left));
    // the app's reading, hand-checked: the year's plan at $1,000 a month = $12,000, so $32,500 − $12,000 = $20,500 more room
    expect(r.k401.used).toBe(12_000);
    expect(r.k401.remaining).toBe(20_500);
  }, 'DECIDED 2026-10-25 (the lead\'s ruling on CFR-4\'s first question, the DEC-0013 pattern): the year at the monthly plan stays, and the screen says it is a plan — "At $1,000 a month you will put in $12,000 this year — room for $20,500 more" (src/screens/__tests__/contribution_room_drawing_v01.test.tsx)');

  kase('MK-CF-O-005-C02', 'AGREE', MAP_ROOM + ' (c_401k = 2500; contributed_ytd 30000 has no input — 2,500 × 12 = 30,000 coincides)', (c, rec) => {
    const r = room(c, { birthYear: c.inputs.birth_year, c_401k: c.inputs.monthly_plan_401k, c_roth: 0 });
    rec({ age: r.age, k_limit: r.k401.limit, k_used: r.k401.used, k_room: r.k401.remaining, months_left: r.monthsLeft, per_month_display: r.perMonthToFill401k });
    expect(r.age).toBe(X(c.expected.age));
    expect(r.k401.limit).toBe(X(c.expected.k_limit));
    expect(r.k401.used).toBeCloseTo(X(c.expected.k_used), 6);
    expect(r.k401.remaining).toBeCloseTo(X(c.expected.k_room), 6);
    expect(r.monthsLeft).toBe(X(c.expected.months_left));
    expect(r.perMonthToFill401k).toBe(X(c.expected.per_month_display));
  });

  // UNBLOCKED 2026-10-27 (FX-CF-C; workplan #361; drawing contribution-room v02, rows 3 and 4): the two inputs CFR-4 named now exist —
  // HSA cover, self-only or family (hsaCover), and one IRA amount for Traditional and Roth together (c_ira). The third, money already
  // in this year, has none by the lead's ruling of 2026-10-25 (DEC-8406, the C01 pattern): the room is the year at the monthly amount,
  // and the screen says it is a plan. So the case runs as DECIDED: the limits on the reviewer's answer, the rooms on the app's reading,
  // each worked by hand with the 2026 IRS limits (IRS_LIMITS). The case's IRA and HSA amounts are year-to-date only, with no monthly
  // amount, so none is typed: no stand-in is fed (this file's rule).
  kase('MK-CF-O-005-C03', 'DECIDED', MAP_ROOM + ' + hsaCover = hsa_coverage ("family"); c_401k = k_monthly_plan 1731.43; the year-to-date amounts (k_ytd, traditional_ira_ytd, roth_ira_ytd, hsa_ytd) have no input (DEC-8406) and the case gives no monthly IRA or HSA amount, so c_ira is not typed', (c, rec) => {
    const r = room(c, { birthYear: c.inputs.birth_year, c_401k: Number(c.inputs.k_monthly_plan), hsaCover: c.inputs.hsa_coverage });
    rec({ age: r.age, k_limit: r.k401.limit, k_used: r.k401.used, k_room: r.k401.remaining, ira_limit: r.ira.limit, ira_used: r.ira.used, ira_room: r.ira.remaining,
      hsa_cover: r.hsaCover, hsa_limit: r.hsa.limit });
    // what the app and the reviewer agree on — the family limit is new: 8,750 + 1,000 (55 and over) = 9,750, where it read 5,400 self-only
    expect(r.age).toBe(X(c.expected.age));                   // 2026 − 1971 = 55
    expect(r.k401.limit).toBe(X(c.expected.k_limit));        // 24,500 + 8,000 = 32,500
    expect(r.ira.limit).toBe(X(c.expected.ira_limit));       // 7,500 + 1,100 = 8,600, one limit for Traditional and Roth together
    expect(r.hsaCover).toBe('family');
    expect(r.hsa.limit).toBe(X(c.expected.hsa_limit));       // 8,750 + 1,000 = 9,750
    // the app's reading, hand-checked: the year's plan at $1,731.43 a month = $20,777.16, so $32,500 − $20,777.16 = $11,722.84 more room
    // (the reviewer's $15,188.83 = $32,500 − $17,311.17 already in — money already in has no input, DEC-8406)
    expect(r.k401.used).toBeCloseTo(1731.43 * 12, 6);
    expect(r.k401.remaining).toBeCloseTo(32_500 - 20_777.16, 6);
    // no monthly IRA amount in the case: nothing typed, so the card reads "up to $8,600" (the reviewer's $5,422.56 is year-to-date)
    expect([r.ira.used, r.ira.remaining]).toEqual([0, 8_600]);
  }, 'DECIDED 2026-10-27 (#361; DEC-8406): the two inputs exist — HSA cover takes the family limit $9,750, and one IRA amount counts Traditional and Roth together against $8,600; money already in this year stays a plan by the lead\'s ruling');
  test.failing('MK-CF-O-005-C03 · the app until 2026-10-27, pinned: HSA cover always self-only — $5,400 for a family plan (FIXED 2026-10-27, #361)', () => {
    const c = C('MK-CF-O-005-C03');
    const r = room(c, { birthYear: c.inputs.birth_year, c_401k: Number(c.inputs.k_monthly_plan), hsaCover: c.inputs.hsa_coverage });
    expect(r.hsa.limit).toBe(5_400);
  });
  // the combined IRA input, the case's own rule worked with a monthly amount: Traditional and Roth share one limit, so one amount a
  // month for both is all the room needs — $450 a month (say $250 Traditional + $200 Roth) is $5,400 this year, $8,600 − $5,400 = $3,200
  test('MK-CF-O-005-C03 · the combined IRA input: $450 a month for Traditional and Roth together → $5,400 used, $3,200 room, against the one $8,600 limit', () => {
    const c = C('MK-CF-O-005-C03');
    const r = room(c, { birthYear: c.inputs.birth_year, c_ira: '450', c_roth: '200' });   // once c_ira is typed, the old Roth amount is not read again
    expect([r.ira.monthly, r.ira.used, r.ira.remaining, r.ira.limit]).toEqual([450, 5_400, 3_200, 8_600]);
  });

  kase('MK-CF-O-005-C04', 'FIXED', MAP_ROOM + ' (c_401k = 3333.33…; 3,333.33 × 12 = 40,000 — the k_ytd 40,000 has no input but coincides)', (c, rec) => {
    const r = room(c, { birthYear: c.inputs.birth_year, c_401k: Number(c.inputs.monthly_k), c_roth: 0 });
    rec({ k_limit: r.k401.limit, k_used: r.k401.used, k_room: r.k401.remaining, excess: (r.k401 as any).excess ?? 'no excess figure' });
    expect(r.k401.limit).toBe(X(c.expected.k_limit));
    expect(r.k401.remaining).toBeCloseTo(X(c.expected.k_room), 6);
    expect(r.k401.used).toBeCloseTo(X(c.expected.k_used), 6);           // was 35,750 — capped at the limit
    expect((r.k401 as any).excess).toBeCloseTo(X(c.expected.excess), 6); // was no excess figure at all
  }, 'FIXED 2026-10-25 (tenets 1, 5, 7; IRC §402(g)): $40,000 put in, $4,250 over — never cut to the limit (MK-CF-F-056)');
  test.failing('MK-CF-O-005-C04 · the app until 2026-10-25, pinned: "used" $35,750 — cut to the limit, no excess — no longer its answer (FIXED 2026-10-25)', () => {
    const c = C('MK-CF-O-005-C04');
    const r = room(c, { birthYear: c.inputs.birth_year, c_401k: Number(c.inputs.monthly_k), c_roth: 0 });
    expect(r.k401.used).toBe(35_750);
  });

  kase('MK-CF-O-005-C05', 'FIXED', MAP_ROOM + ' (no birthYear)', (c, rec) => {
    const r = room(c, { c_401k: c.inputs.monthly_k });
    rec({ age: r.age, k_limit: r.k401.limit, k_room: r.k401.remaining, ira_limit: r.ira.limit, hsa_limit: r.hsa.limit, base_limit_only: r.baseLimitOnly });
    // the reviewer refuses ("base-only ceiling may be separately labeled"); the brief allows either: the door LABELS it — the
    // figure's own refusal line, MK-MN-M-003: "the limit says it is the base one" — and the screen says so beside the year's box
    expect(c.expected).toBeNull();
    expect(r.age).toBeNull();
    expect(r.baseLimitOnly).toBe(true);
    expect([r.k401.limit, r.ira.limit, r.hsa.limit]).toEqual([24_500, 7_500, 4_400]);
    expect([r.k401.catchUp, r.ira.catchUp, r.hsa.catchUp]).toEqual([false, false, false]);
  }, 'FIXED 2026-10-25 (tenet 3; MK-MN-M-003\'s refusal line): the base limits come back marked as the base ones, and the screen says so');
  test.failing('MK-CF-O-005-C05 · the app until 2026-10-25, pinned: a $24,500 base limit with nothing saying it is the base one — no longer its answer (FIXED 2026-10-25)', () => {
    const c = C('MK-CF-O-005-C05');
    expect((room(c, { c_401k: c.inputs.monthly_k }) as any).baseLimitOnly).toBeUndefined();
  });
});

// ══ MK-CF-F-197 ageAttainedInYear ════════════════════════════════════════════════════════════════════
describe('MK-CF-F-197 ageAttainedInYear — five cases', () => {
  for (const id of ['MK-CF-F-197-C01', 'MK-CF-F-197-C02', 'MK-CF-F-197-C03', 'MK-CF-F-197-C04']) {
    kase(id, 'AGREE', 'ageAttainedInYear(birth_year, a day in the case\'s year)', (c, rec) => {
      const a = ageAttainedInYear(c.inputs.birth_year, new Date(c.inputs.year, 9, 24, 12)); rec(a);
      expect(a).toBe(X(c.expected));
    });
  }
  kase('MK-CF-F-197-C05', 'AGREE', 'ageAttainedInYear(null, 2026)', (c, rec) => {
    const a = ageAttainedInYear(c.inputs.birth_year, new Date(c.inputs.year, 9, 24, 12)); rec(a);
    expect(c.expected).toBeNull();
    expect(a).toBeNull();
  });
});

// ══ MK-CF-F-195 monthsLeftInYear ═════════════════════════════════════════════════════════════════════
describe('MK-CF-F-195 monthsLeftInYear — five cases', () => {
  for (const n of ['01', '02', '03', '04', '05']) {
    kase(`MK-CF-F-195-C${n}`, 'AGREE', 'monthsLeftInYear(local date at noon)', (c, rec) => {
      const m = monthsLeftInYear(day(c.inputs.date)); rec(m);
      expect(m).toBe(X(c.expected));
    });
  }
});

// ══ MK-CF-F-196 perMonthToFill ═══════════════════════════════════════════════════════════════════════
describe('MK-CF-F-196 perMonthToFill — five cases', () => {
  for (const n of ['01', '02', '03', '04', '05']) {
    kase(`MK-CF-F-196-C${n}`, 'AGREE', 'perMonthToFill(room, date); the unrounded figure is room ÷ monthsLeftInYear(date), the two pieces the function divides', (c, rec) => {
      const d = day(c.inputs.date), roomLeft = Number(c.inputs.room);
      const shown = perMonthToFill(roomLeft, d), unrounded = roomLeft / monthsLeftInYear(d);
      rec({ unrounded, shown_nearest_100: shown });
      expect(unrounded).toBeCloseTo(X(c.expected.unrounded), 6);
      expect(shown).toBe(X(c.expected.shown_nearest_100));
    });
  }
});

// ══ MK-CF-F-053 annual401kLimit / MK-CF-F-054 annualIraLimit ═════════════════════════════════════════
describe('MK-CF-F-053 annual401kLimit — five cases', () => {
  for (const n of ['01', '02', '03', '04', '05']) {
    kase(`MK-CF-F-053-C${n}`, 'AGREE', MAP_LIMIT, (c, rec) => {
      const v = annual401kLimit(c.inputs.age_attained_2026); rec(v);
      expect(v).toBe(X(c.expected));
    });
  }
});
describe('MK-CF-F-054 annualIraLimit — five cases', () => {
  for (const n of ['01', '02', '03', '04', '05']) {
    kase(`MK-CF-F-054-C${n}`, 'AGREE', MAP_LIMIT, (c, rec) => {
      const v = annualIraLimit(c.inputs.age_attained_2026); rec(v);
      expect(v).toBe(X(c.expected));
    });
  }
});

// ══ MK-CF-F-055 annualHsaLimit ═══════════════════════════════════════════════════════════════════════
describe('MK-CF-F-055 annualHsaLimit — five cases', () => {
  for (const n of ['01', '02', '03', '04']) {
    kase(`MK-CF-F-055-C${n}`, 'AGREE', MAP_LIMIT + ' (a full eligible year)', (c, rec) => {
      const v = annualHsaLimit(c.inputs.age_attained_2026, c.inputs.family_cover, c.inputs.medicare); rec(v);
      expect(v).toBe(X(c.expected));
    });
  }
  kase('MK-CF-F-055-C05', 'FIXED', 'annualHsaLimit(65, self-only, enrolled in Medicare, first month 7) — medicare_start 2026-07-01 → its first month, July (the argument added 2026-10-25)', (c, rec) => {
    const firstMonth = Number(String(c.inputs.medicare_start).slice(5, 7));
    expect(firstMonth - 1).toBe(c.inputs.eligible_months);
    const v = annualHsaLimit(c.inputs.age_attained_2026, c.inputs.family_cover, c.inputs.medicare, firstMonth); rec(v);
    expect(v).toBe(X(c.expected));   // was 0 for the whole year
  }, 'FIXED 2026-10-25 (IRS Publication 969, DEC-0378): enrolled from July 1 leaves six eligible months, (4,400 + 1,000) × 6 ÷ 12 = $2,700');
  test.failing('MK-CF-F-055-C05 · the app until 2026-10-25, pinned: Medicare from July 1 gave $0 for the whole year — no longer its answer (FIXED 2026-10-25)', () => {
    expect(annualHsaLimit(65, false, true, 7)).toBe(0);
  });
});

// ══ MK-CF-F-056 k401Headroom ═════════════════════════════════════════════════════════════════════════
describe('MK-CF-F-056 k401Headroom — five cases', () => {
  for (const n of ['01', '02', '03', '04']) {
    kase(`MK-CF-F-056-C${n}`, 'AGREE', 'k401Headroom(age, contributed as the year\'s amount); the app returns no excess figure, so excess = none shown', (c, rec) => {
      const h = k401Headroom(c.inputs.age, Number(c.inputs.contributed_ytd));
      rec({ limit: h.limit, actual_used: h.used, room: h.remaining, excess: (h as any).excess ?? 'no excess figure' });
      expect(h.limit).toBe(X(c.expected.limit));
      expect(h.used).toBeCloseTo(X(c.expected.actual_used), 6);
      expect(h.remaining).toBeCloseTo(X(c.expected.room), 6);
      expect(X(c.expected.excess)).toBe(0);
      expect(Number(c.inputs.contributed_ytd)).toBeLessThanOrEqual(h.limit);   // nothing over, so nothing hidden
    });
  }
  kase('MK-CF-F-056-C05', 'FIXED', 'k401Headroom(60, 40000)', (c, rec) => {
    const h = k401Headroom(c.inputs.age, Number(c.inputs.contributed_ytd));
    rec({ limit: h.limit, actual_used: h.used, room: h.remaining, excess: (h as any).excess ?? 'no excess figure' });
    expect(h.limit).toBe(X(c.expected.limit));
    expect(h.remaining).toBe(X(c.expected.room));
    expect(h.used).toBe(X(c.expected.actual_used));               // was 35,750
    expect((h as any).excess).toBe(X(c.expected.excess));          // was none
  }, 'FIXED 2026-10-25 (tenets 1, 5, 7; IRC §402(g)): $40,000 put in is reported as $40,000, and the $4,250 excess is its own figure');
  test.failing('MK-CF-F-056-C05 · the app until 2026-10-25, pinned: $40,000 put in reported as $35,750, no excess — no longer its answer (FIXED 2026-10-25)', () => {
    expect(k401Headroom(60, 40_000).used).toBe(35_750);
  });
});

// ══ MK-CF-F-057 rothVsTraditional / MK-CF-F-058 rothConversionWindow ═════════════════════════════════
describe('MK-CF-F-057 rothVsTraditional — five cases', () => {
  for (const n of ['01', '02', '03', '04', '05']) {
    kase(`MK-CF-F-057-C${n}`, 'AGREE', 'rothVsTraditional(current, retirement); the lean is a code value (roth / traditional / either), compared without case', (c, rec) => {
      const r = rothVsTraditional(Number(c.inputs.current_marginal), Number(c.inputs.retirement_marginal)); rec(r.lean);
      expect(r.lean).toBe(String(c.expected).toLowerCase());
    });
  }
});
describe('MK-CF-F-058 rothConversionWindow — five cases', () => {
  for (const n of ['01', '02', '03', '05']) {
    kase(`MK-CF-F-058-C${n}`, 'AGREE', 'rothConversionWindow(age, retirement_age, claim_age ?? 0)', (c, rec) => {
      const v = rothConversionWindow(c.inputs.age, c.inputs.retirement_age, c.inputs.claim_age ?? 0); rec(v);
      expect(v).toBe(c.expected);
    });
  }
  kase('MK-CF-F-058-C04', 'AGREE', 'rothConversionWindow(68, 65, 67) — the benefit and other income have no argument', (c, rec) => {
    const v = rothConversionWindow(c.inputs.age, c.inputs.retirement_age, c.inputs.claim_age); rec(v);
    expect(c.expected.state).toBe('RULE UNCLEAR');
    expect(v).toBe(c.expected.readings.heuristic);   // the app's stated rule is the heuristic one: false
  }, 'the reviewer left it RULE UNCLEAR; the app gives its heuristic reading, false, and its one sentence (Retirement cockpit) names that premise');
});

// ══ MK-CF-O-017 futurePaycheck ═══════════════════════════════════════════════════════════════════════
describe('MK-CF-O-017 futurePaycheck — five cases', () => {
  kase('MK-CF-O-017-C01', 'AGREE', 'futurePaycheck({ op: no birth year, accounts: [one $100,000 401(k)], assumptions: {} })', (c, rec) => {
    const r = onDay(c.as_of, () => futurePaycheck({ op: {}, accounts: [{ asset_id: 'k', label: '401(k)', tax_bucket: 'PRE_TAX', balance: c.inputs.savings, target_return: 0.06, retirement_pct: 100 }], assumptions: {} })); rec(r);
    expect(c.expected).toBeNull();
    expect(r).toBeNull();
  });
  kase('MK-CF-O-017-C02', 'AGREE', 'futurePaycheck({ op: { birthYear = clock year − 67, targetRetirementAge 67 }, a $100,000 401(k) })', (c, rec) => {
    const r = onDay(c.as_of, () => futurePaycheck({ op: { birthYear: 2026 - c.inputs.age, targetRetirementAge: c.inputs.retirement_age }, accounts: [{ asset_id: 'k', label: '401(k)', tax_bucket: 'PRE_TAX', balance: c.inputs.savings, target_return: 0.06, retirement_pct: 100 }], assumptions: {} })); rec(r);
    expect(c.expected).toBeNull();
    expect(r).toBeNull();
  });
  kase('MK-CF-O-017-C03', 'AGREE', 'futurePaycheck({ op: { birthYear 1966, targetRetirementAge 67 }, accounts: [] })', (c, rec) => {
    const r = onDay(c.as_of, () => futurePaycheck({ op: { birthYear: 2026 - c.inputs.age, targetRetirementAge: c.inputs.retirement_age }, accounts: [], assumptions: {} })); rec(r);
    expect(c.expected).toBeNull();
    expect(r).toBeNull();
  });
  kase('MK-CF-O-017-C04', 'FIXED', 'futurePaycheck compiled from its own source; age 61.5, guaranteed $2,731.17, projected pot $497,311.43 and draw $1,730 handed in as the reviewer\'s witnesses', (c, rec) => {
    const fp = futureWith({ age: Number(c.inputs.age), guaranteed: Number(c.inputs.guaranteed_monthly),
      inputs: { start_balance: Number(c.inputs.savings), horizon_age: 95, mean_return: 0.06, vol_return: 0.12, inflation: 0.025 },
      projected: Number(c.inputs.independent_projected_pot), draw: Number(c.inputs.independent_supported_draw) });
    const r = fp({ op: {}, accounts: [], assumptions: { retireAge: c.inputs.retirement_age } }); rec(r);
    // every figure as shown agrees …
    expect(Math.round(r.guaranteed)).toBe(X(c.expected.guaranteed_shown));
    expect(Math.round(r.draw)).toBe(X(c.expected.draw_shown));
    expect(Math.round(r.monthly)).toBe(X(c.expected.total_shown));
    // … but the door rounds before the screen: the full-precision total is not returned
    expect(r.monthly).toBeCloseTo(X(c.expected.unrounded_total), 6);   // was 4,461
  }, 'FIXED 2026-10-25 (PRECISION order, Q49): the door returns $4,461.17 and the card rounds it once, through fig() — every shown figure agrees');
  test.failing('MK-CF-O-017-C04 · the app until 2026-10-25, pinned: the door returned 4,461 and 2,731, rounded inside — no longer its answer (FIXED 2026-10-25)', () => {
    const c = C('MK-CF-O-017-C04');
    const fp = futureWith({ age: Number(c.inputs.age), guaranteed: Number(c.inputs.guaranteed_monthly),
      inputs: { start_balance: Number(c.inputs.savings), horizon_age: 95, mean_return: 0.06, vol_return: 0.12, inflation: 0.025 },
      projected: Number(c.inputs.independent_projected_pot), draw: Number(c.inputs.independent_supported_draw) });
    expect(fp({ op: {}, accounts: [], assumptions: { retireAge: c.inputs.retirement_age } }).monthly).toBe(4_461);
  });
  kase('MK-CF-O-017-C05', 'AGREE', 'futurePaycheck compiled from its own source; the projection handed in as none', (c, rec) => {
    const fp = futureWith({ age: c.inputs.age, guaranteed: 0,
      inputs: { start_balance: Number(c.inputs.savings), horizon_age: 95, mean_return: 0.06, vol_return: 0.12, inflation: 0.025 },
      projected: c.inputs.projection, draw: 0 });
    const r = fp({ op: {}, accounts: [], assumptions: { retireAge: c.inputs.retirement_age } }); rec(r);
    expect(c.expected).toBeNull();
    expect(r).toBeNull();
  });
});

// ══ MK-CF-F-105 guaranteedRows ═══════════════════════════════════════════════════════════════════════
describe('MK-CF-F-105 guaranteedRows — five cases', () => {
  for (const n of ['01', '02', '03']) {
    kase(`MK-CF-F-105-C${n}`, 'AGREE', MAP_PAY, (c, rec) => {
      const rows = guaranteedRows(streamsProfile([c.inputs.stream]) as any, day(c.as_of));
      const got = rows.map((r) => ({ month: ym(r), amount: r.amount })); rec(got);
      expect(got.map((r) => r.month)).toEqual(c.expected.map((e: any) => e.month));
      got.forEach((r, i) => expect(r.amount).toBeCloseTo(X(c.expected[i].amount), 6));
    });
  }
  kase('MK-CF-F-105-C04', 'AGREE', MAP_PAY + ' (two streams)', (c, rec) => {
    const rows = guaranteedRows(streamsProfile(c.inputs.streams) as any, day(c.as_of));
    const october = rows.filter((r) => r.year === 2026 && r.month === 10).reduce((t, r) => t + r.amount, 0);
    const annual = rows.reduce((t, r) => t + r.amount, 0); rec({ october_total: october, annual_total: annual });
    expect(october).toBeCloseTo(X(c.expected.october_total), 6);
    expect(annual).toBeCloseTo(X(c.expected.annual_total), 6);
  });
  kase('MK-CF-F-105-C05', 'AGREE', MAP_PAY + ' (ri_ss_inflates true; next year\'s increase has no input)', (c, rec) => {
    const op = { ...streamsProfile([c.inputs.stream]), ri_ss_inflates: true };
    const jan = guaranteedRows(op as any, day(c.as_of)).find((r) => r.year === 2027 && r.month === 1); rec({ january_2027: jan?.amount });
    expect(c.expected.state).toBe('RULE UNCLEAR');
    expect(jan!.amount).toBeCloseTo(X(c.expected.readings.fixed_input), 6);
  }, 'SETTLED BY DEC-2164 with DEC-0303: the paycheck is in today\'s dollars, where a check that rises with inflation stays $2,000');
});

// ══ MK-CF-F-106 solveSafeDraw ════════════════════════════════════════════════════════════════════════
describe('MK-CF-F-106 solveSafeDraw — five cases', () => {
  for (const n of ['01', '02']) {
    kase(`MK-CF-F-106-C${n}`, 'AGREE', 'solveSafeDraw(pot, guaranteed, assumed plan 30 years)', (c, rec) => {
      const d = solveSafeDraw(c.inputs.pot, c.inputs.guaranteed, SIM(30)); rec(d);
      expect(d).toBe(X(c.expected));
    });
  }
  kase('MK-CF-F-106-C03', 'AGREE', 'solveSafeDraw($311,731.17, $2,731.43, 30 years, floor 80) on the ASSUMED plan (67, 6%, 12% volatility, 2.5% inflation)', (c, rec) => {
    const sim = SIM(c.inputs.years); const egg = Number(c.inputs.pot), g = Number(c.inputs.guaranteed);
    const d = solveSafeDraw(egg, g, sim, c.inputs.floor); const at = chanceAt(egg, g, sim, d); rec({ draw: d, chance_at_draw: at });
    expect(c.expected.assertions).toHaveLength(4);
    expect(d % 5).toBe(0);                         // a multiple of $5
    expect(at).toBeGreaterThanOrEqual(c.inputs.floor);   // the tested chance at the draw returned holds the floor
  }, 'the four properties hold on this plan: $955 a month, a multiple of $5, chance 80.3; the same seed and paths for every candidate (read in the code)');
  kase('MK-CF-F-106-C04', 'FIXED', 'solveSafeDraw compiled from its own source with the reviewer\'s oracle (chance 100 up to the starting top, 95 up to twice it, 0 beyond)', (c, rec) => {
    const egg = Number(c.inputs.pot), g = Number(c.inputs.guaranteed), years = c.inputs.years;
    const top = Math.max(100, (egg / years / 12) * 2);
    const oracle = (draw: number) => (draw <= top ? c.inputs.independent_chance_oracle.at_initial_upper : draw <= 2 * top ? c.inputs.independent_chance_oracle.at_twice_upper : 0);
    const d = safeDrawWithOracle(oracle)(egg, g, SIM(years), 80); rec({ draw: d, starting_top: top });
    expect(c.expected.state).toBe('RULE UNCLEAR');
    expect(d % 5).toBe(0);                          // was $961.73 — the top itself, never rounded down
    expect(d).toBeGreaterThanOrEqual(2 * top - 5);  // the largest draw still at 95 is near twice the top; it stopped at the top
    expect(d).toBeLessThanOrEqual(2 * top);
  }, 'FIXED 2026-10-25 (tenet 1; "largest", "round DOWN to $5"): the top is raised until a draw fails — $1,920 a month, a multiple of $5, the largest the oracle allows');
  test.failing('MK-CF-F-106-C04 · the app until 2026-10-25, pinned: the starting top handed back, $961.73, unrounded — no longer its answer (FIXED 2026-10-25)', () => {
    const c = C('MK-CF-F-106-C04');
    const egg = Number(c.inputs.pot), years = c.inputs.years, top = Math.max(100, (egg / years / 12) * 2);
    const oracle = (draw: number) => (draw <= top ? 100 : draw <= 2 * top ? 95 : 0);
    expect(safeDrawWithOracle(oracle)(egg, Number(c.inputs.guaranteed), SIM(years), 80)).toBeCloseTo(top, 9);
  });
  kase('MK-CF-F-106-C05', 'FIXED', 'solveSafeDraw($231,731.17, $1,311.43, 27 years, floor 95) on the ASSUMED plan; chance re-tested at the draw returned', (c, rec) => {
    const sim = SIM(c.inputs.years); const egg = Number(c.inputs.pot), g = Number(c.inputs.guaranteed);
    const d = solveSafeDraw(egg, g, sim, c.inputs.chance_floor); const at = chanceAt(egg, g, sim, d); rec({ draw: d, chance_at_draw: at });
    expect(at).toBeGreaterThanOrEqual(c.inputs.chance_floor);   // was $580 at 94.7
    expect(d % 5).toBe(0);
  }, 'FIXED 2026-10-25 (tenet 1): the $5 round-down is re-tested, stepping down $5 until the draw holds the floor of 95');
  test.failing('MK-CF-F-106-C05 · the app until 2026-10-25, pinned: $580 a month, which tests at 94.7 against a floor of 95 — no longer its answer (FIXED 2026-10-25)', () => {
    const c = C('MK-CF-F-106-C05');
    expect(solveSafeDraw(Number(c.inputs.pot), Number(c.inputs.guaranteed), SIM(c.inputs.years), c.inputs.chance_floor)).toBe(580);
  });
});

// ══ MK-CF-F-107 buildPaycheckYear ════════════════════════════════════════════════════════════════════
describe('MK-CF-F-107 buildPaycheckYear — five cases', () => {
  kase('MK-CF-F-107-C01', 'AGREE', 'buildPaycheckYear(Social Security $2,000 a month, { nestEgg: 0, now: as_of })', (c, rec) => {
    const y = buildPaycheckYear(streamsProfile([{ kind: 'ss', amount: c.inputs.guaranteed, frequency: 'monthly' }]) as any,
      { nestEgg: c.inputs.pot, now: day(c.as_of), sim: SIM(30) } as any);
    rec({ draw: y.safeDrawMonthly, monthly_total: y.thisMonth.netSafeToSpend });
    expect(y.safeDrawMonthly).toBe(X(c.expected.draw));
    expect(y.thisMonth.netSafeToSpend).toBeCloseTo(X(c.expected.monthly_total), 6);
  });
  kase('MK-CF-F-107-C02', 'AGREE', 'buildPaycheckYear, the real module, the simulation answering with the reviewer\'s $1,000 draw; Social Security $2,000 a month, no bills', (c, rec) => {
    const y = paycheckWithDraw(Number(c.inputs.independent_supported_draw))(streamsProfile([{ kind: 'ss', amount: c.inputs.guaranteed, frequency: 'monthly' }]),
      { nestEgg: 100_000, now: day(c.as_of), sim: SIM(30) });
    rec({ monthly_total: y.thisMonth.netSafeToSpend, twelve_month_total: y.thisYear });
    expect(y.thisMonth.netSafeToSpend).toBeCloseTo(X(c.expected.monthly_total), 6);
    expect(y.thisYear).toBeCloseTo(X(c.expected.twelve_month_total), 6);
  });
  kase('MK-CF-F-107-C03', 'AGREE', 'run as C02 with the $1,730 draw; a $1,831.43 bill due Dec 15 as a non-monthly spendCats row', (c, rec) => {
    const bill = c.inputs.big_bills[0]; const [, bm, bd] = bill.date.split('-').map(Number);
    const op = { ...streamsProfile([{ kind: 'ss', amount: c.inputs.guaranteed, frequency: 'monthly' }]),
      spendCats: [{ id: 'bill', label: 'Big bill', amount: Number(bill.amount), bucket: 'nonmonthly', months: [bm], dueDay: bd, tier: 'critical', custom: true }] };
    const y = paycheckWithDraw(Number(c.inputs.independent_supported_draw))(op, { nestEgg: 100_000, now: day(c.as_of), sim: SIM(30) });
    const dec = y.months.find((m: any) => m.calendarMonth === bm && m.year === 2026);
    rec({ regular_month: y.thisMonth.netSafeToSpend, bill_month: dec.netSafeToSpend, twelve_month_total: y.thisYear });
    expect(y.thisMonth.netSafeToSpend).toBeCloseTo(X(c.expected.regular_month), 6);
    expect(dec.netSafeToSpend).toBeCloseTo(X(c.expected.bill_month), 6);
    expect(y.thisYear).toBeCloseTo(X(c.expected.twelve_month_total), 6);
  });
  kase('MK-CF-F-107-C04', 'AGREE', 'run as C02 with the $1,730 draw; ri_withdrawals $511.43 a month on the profile', (c, rec) => {
    const op = { ...streamsProfile([{ kind: 'ss', amount: c.inputs.guaranteed, frequency: 'monthly' }]), ri_withdrawals: Number(c.inputs.existing_withdrawal_monthly), ri_withdrawals_freq: 'monthly' };
    const y = paycheckWithDraw(Number(c.inputs.independent_supported_draw))(op, { nestEgg: Number(c.inputs.pot), now: day(c.as_of), sim: SIM(30) });
    rec({ monthly_total: y.thisMonth.netSafeToSpend });
    expect(y.thisMonth.netSafeToSpend).toBeCloseTo(X(c.expected.monthly_total), 6);
  }, 'DEC-0244 / DEC-0307: the own-savings withdrawal is not counted again');
  kase('MK-CF-F-107-C05', 'BLOCKED', 'buildPaycheckYear($100,000 pot, $2,000 guaranteed) — the reviewer has no simulation contract to give an answer', () => {
    throw new Error('BLOCKED: the package carries no expected number (could_not_test MK-CF-O-017); the simulation is MK-PL-F-050, not in this part');
  }, 'no expected number exists; the app\'s answer on the assumed plan is recorded', () => {
    const y = buildPaycheckYear(streamsProfile([{ kind: 'ss', amount: 2000, frequency: 'monthly' }]) as any, { nestEgg: 100_000, now: day('2026-10-24'), sim: SIM(30) } as any);
    return { draw_on_assumed_plan: y.safeDrawMonthly, monthly_total: y.thisMonth.netSafeToSpend };
  });
});

// ══ witnesses beyond the 70 (not counted in the coverage line) ═══════════════════════════════════════
describe('witness — MK-CF-F-106 in the app\'s own domain (not one of the 70)', () => {
  // A plan return typed on the Retirement cockpit slider (2–14%, committed as the plan, RetirementCockpit.tsx:360/296) runs on
  // the accounts' own volatility (willItLast.ts:279). A 10% plan on a 6%-volatility pot, $173,111.19 over 30 years:
  // FIXED 2026-10-25 (FIX-ROOM; tenet 1): the top is raised until a draw fails; the answer is a multiple of $5 that holds 80
  test('the starting top passes the 80 floor, so the search goes higher: a multiple of $5, above the top, that holds 80 [FIXED 2026-10-25]', () => {
    const sim = SIM(30, { mean_return: 0.10, vol_return: 0.06 });
    const egg = 173_111.19, g = 7_311.43, top = (egg / 30 / 12) * 2;
    const d = solveSafeDraw(egg, g, sim, 80);
    expect(chanceAt(egg, g, sim, top)).toBeGreaterThanOrEqual(80);
    expect(d % 5).toBe(0);
    expect(d).toBeGreaterThan(top);
    expect(chanceAt(egg, g, sim, d)).toBeGreaterThanOrEqual(80);
  });
  test.failing('the app until 2026-10-25, pinned: it returned that top, $961.73, unrounded — no longer its answer (FIXED 2026-10-25)', () => {
    const sim = SIM(30, { mean_return: 0.10, vol_return: 0.06 });
    expect(solveSafeDraw(173_111.19, 7_311.43, sim, 80)).toBeCloseTo((173_111.19 / 30 / 12) * 2, 9);
  });
});

describe('the source check of part 13 — contribution limits 2026, nine witnesses', () => {
  const SRC = PART.source_checks[0];
  test('the package holds one source check with nine witnesses', () => {
    expect(PART.source_checks).toHaveLength(1);
    expect(SRC.witnesses).toHaveLength(9);
  });
  SRC.witnesses.slice(0, 8).forEach((w: any) => {
    test(`age ${w.input.age_attained_in2026}, full year: 401(k) ${w.expected.k.exact} · IRA ${w.expected.ira.exact} · HSA self ${w.expected.hsa_self.exact} · HSA family ${w.expected.hsa_family_one_person_catchup.exact} [AGREE]`, () => {
      const a = w.input.age_attained_in2026;
      expect(annual401kLimit(a)).toBe(X(w.expected.k));
      expect(annualIraLimit(a)).toBe(X(w.expected.ira));
      expect(annualHsaLimit(a, false, false)).toBe(X(w.expected.hsa_self));
      expect(annualHsaLimit(a, true, false)).toBe(X(w.expected.hsa_family_one_person_catchup));
    });
  });
  test('65, Medicare from 2026-07-01, six self-only eligible months: $2,700 [FIXED 2026-10-25 — as MK-CF-F-055-C05; Medicare\'s first month, July, is handed in]', () => {
    const w = SRC.witnesses[8];
    expect(w.input.self_only_eligible_months).toBe(6);
    const firstMonth = Number(String(w.input.medicare_start).slice(5, 7));
    expect(annualHsaLimit(w.input.age_attained, false, true, firstMonth)).toBe(X(w.expected));
  });
  test.failing('65, Medicare from 2026-07-01 — the app until 2026-10-25, pinned: $0 for the whole year — no longer its answer (FIXED 2026-10-25)', () => {
    expect(annualHsaLimit(65, false, true, 7)).toBe(0);
  });
});

describe('lead\'s priority check — card in part 10: the zero-return branch of MK-CF-F-126 futureValue through MK-CF-F-229 balanceGrownTo', () => {
  // Every caller, read 2026-10-25: (1) sign-up's retirement outlook, src/onboarding/modules.tsx:1838 → fv → balanceGrownTo, at
  // realAcc = max(0.01, 0.07 − inflation): floored at 1%, never 0; (2) MK-CF-F-043 compareMortgageToTreasury (Cash flow · Debt,
  // BudgetScreen.tsx:759 → MortgageRateCompare) calls futureValue at the ten-year Treasury yield from the live feed or its
  // typical fallback — not a number anyone types. No caller can send 0% today, so the NaN below is recorded, not pinned wrong.
  // FIXED 2026-10-25 (FIX-ROOM): a 0% branch in futureValue — the deposits themselves — though no caller sends 0% today
  test('$500 a month for 12 months at 0% gives $6,000 [FIXED 2026-10-25 — was NaN; sign-up floors the rate at 1% (modules.tsx:1838); the mortgage comparison reads the live Treasury yield]', () => {
    expect(balanceGrownTo(0, 500, 0, 12)).toBe(6000);
  });
  test('with a $10,000 opening pot: $16,000 [FIXED 2026-10-25 — was NaN]', () => {
    expect(balanceGrownTo(10_000, 500, 0, 12)).toBe(16_000);
  });
  test.failing('the app until 2026-10-25, pinned: NaN at 0%, with and without the opening pot — no longer its answer (FIXED 2026-10-25)', () => {
    expect(Number.isNaN(balanceGrownTo(0, 500, 0, 12)) || Number.isNaN(balanceGrownTo(10_000, 500, 0, 12))).toBe(true);
  });
  test('a near-zero rate the formula can take: 0.0001% a year gives $6,000.00 and $16,000.01, so only the exact 0 breaks', () => {
    expect(balanceGrownTo(0, 500, 0.000001, 12)).toBeCloseTo(6000, 2);
    expect(balanceGrownTo(10_000, 500, 0.000001, 12)).toBeCloseTo(16000, 1);
  });
});

// ══ A GUARD MUST PROVE IT LOOKED ═════════════════════════════════════════════════════════════════════
test('coverage: all 70 of the package\'s part 13 cases were run, each once, and nothing else was counted', () => {
  const inPackage = PART.cases.map((c: any) => c.case_id);
  expect(inPackage).toHaveLength(70);
  expect(new Set(inPackage).size).toBe(70);
  expect(RAN).toHaveLength(70);
  expect([...RAN].sort()).toEqual([...inPackage].sort());
});
