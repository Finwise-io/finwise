/* THE OUTSIDE CASES, RUN AGAINST THE APP — Cash flow module, OpenAI package of 2026-10-24, PART 15 of 19 (base pay —
 * gross, take-home, the rate in force).
 * Cards: MK-CF-O-001 basePay · MK-CF-F-140 periodsAYear · MK-CF-F-141 perMonth · MK-CF-F-142 monthsOf · MK-CF-F-128
 * grossByMonth · MK-CF-F-143 annualisedGross · MK-CF-F-144 takeHomeAsEntered · MK-CF-F-145 deductionsFromPay · MK-CF-F-146
 * payFiguresAgree · MK-CF-F-171 earnerPay · MK-CF-F-198 payrollTaxWithheld · MK-CF-F-179 entryFromWage (all in
 * MoneyKeel/functions/cashflow/base-pay.ts) · MK-CF-F-180 enteredLandsAnnual · MK-CF-F-181 rateInForce (both in
 * src/domain/income/tax-rate.ts).
 *
 * THIS FILE'S SHARE (CFR-4, 2026-10-25): part 15's 70 cases, its 14 formula checks, its 36 rules_held and the 7 payroll
 * witnesses of its "Social Security and Medicare 2026 withholding" source check (the lead runs the whole Source_Checks
 * file, the 48 band witnesses included, in its own file).
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/
 * MoneyKeel_CashFlow_Independent_Audit/audit_results/MoneyKeel_CashFlow_Audit_Part_15.json. Every expected answer is READ
 * FROM THE PACKAGE (C(case_id).expected), never retyped; only its plain input names are mapped onto the app's fields.
 * Results, case by case: MoneyKeel/documents/audit/outside-test-cases/returned/results/cashflow_openai_part15_results.json
 *
 * MEASURED ONLY 2026-10-25: no app code, record, drawing or other test was changed. Measured on the tree at b1c659e8
 * (2026-10-24), which already carries the 2026-10-23/24 fixes: head-of-household bands, the per-person senior deduction,
 * the bracket and "What it is taxed on" after the 401(k) ($169,200 → $150,000), the month take-home after the 401(k).
 * RE-MEASURED the same day after CF-MMFIX-B changed base-pay.ts in the working tree (uncommitted: annualisedGross reads the
 * calendar year with the typical for a month not typed, IN-05; the ≈ on a typed-rate take-home, IN-03). Items it moved say
 * IN-FLIGHT on their line: F-143-C03 (APP WRONG → AGREE), F-143-C04 (REVIEWER WRONG → NEEDS RULING), O-001-C04's note.
 *
 * Markers (the kase helper): AGREE → test on the reviewer's answer · APP WRONG → test.failing on the reviewer's answer
 * (turns red when fixed) · REVIEWER WRONG → a plain test pinning the app's hand-checked answer, the ruling or code fact in
 * its name · NEEDS RULING → a plain test pinning the app's current answer · BLOCKED → test.skip naming what is missing ·
 * OUTSIDE DOMAIN → a plain test recording what the app does for an input no caller can send, the caller cited.
 *
 * INPUT NAMES MAPPED (the app's fields, never the answers):
 *   frequency → BasePayEntry.freq / profile salaryFreq ('biweekly' as is; "yearly" → 'annually', PAY_PERIODS' own word —
 *   no screen offers it: BasePayScreen FREQS is hourly · weekly · biweekly · monthly). hours_per_week → hoursPerWeek
 *   (no screen asks it). amount / gross → grossTypical (baseSalary). varies → salaryMonthMode 'months' | 'same'. table →
 *   salaryByMonth, keyed 'YYYY-MM', handed in AS STORED (strings and "" as typed) and read through MK-CF-F-179
 *   entryFromWage → MK-CF-F-165 salaryMonths, the path every caller takes; monthsOf alone is handed the raw table.
 *   unlisted_months_confirmed_zero (with gross 0) → nothing more typed: by DEC-0187 a month the table does not give reads as
 *   the typical month, the typed $0, which is how the app's tax path (MK-CF-F-082 salaryAnnual) already reads it.
 *   yearly_gross over paid_months / dated_paid_months → a 2026 month table: each paid month yearly_gross ÷ paid_months,
 *   each unpaid month a typed 0 (a full year is a steady monthly wage of yearly_gross ÷ 12). k_per_paid_month → c_401k
 *   (monthly401k; the app holds ONE monthly figure). take_home_entered_per_paid_month → landsTypical ("take-home each
 *   month", the screen's one field). household_rate_for_calculated_fallback → estRate, the household rate basePay injects.
 *   payFiguresAgree months[] → grossByMonth per month, landsByMonth per month (the entry's own field), and the ONE
 *   monthly401k the entry can carry: the failing / boundary month's own (named on each case).
 *   typed_rate_percent → taxMode 'manual' + manualTaxRate (null → no rate typed). taxable_annual / k_annual / state_rate →
 *   a steady monthly wage, c_401k = k_annual ÷ 12, stateTaxRate in percent. status → filingStatus.
 *   basePay households → the profile and earners exactly as BasePayScreen builds them (lines 69–73): earners =
 *   wages.map(entryFromWage), filingStatus = filingStatusOf(profile), over65 = over65CountOf(profile). household_rate 0.15
 *   → a typed 15%. taxable_net_rent_annual → one rent entry naming its property (DEC-4059d), income ÷ 12 a month.
 *   The reviewer's "calculated" mode → the app's code value 'estimated'.
 *   periodsAYear, perMonth and monthsOf are not exported: each is compiled from its own source text in base-pay.ts with the
 *   names it uses (PAY_PERIODS, toNum) handed in — the app's text, nothing retyped.
 * TOLERANCES: money to 1e-6 dollars (toBeCloseTo(Number(exact), 6)); rates to 1e-12; strings exact; REFUSES / null =
 * the app returns no number, never 0. "shown" strings are screen formatting and are not asserted. The clock is held at
 * 2026-10-24 12:00 local (the package's as_of), because the month readers read this calendar year.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import {
  PAY_PERIODS, grossByMonth, annualisedGross, takeHomeAsEntered, deductionsFromPay, payFiguresAgree, earnerPay, basePay,
  payrollTaxWithheld, entryFromWage, SS_WAGE_BASE, MEDICARE_ADDITIONAL_THRESHOLD, type BasePayEntry,
} from './base-pay';
import { incomeSummary } from './income-summary';
import { enteredLandsAnnual, rateInForce } from '../../../src/domain/income/tax-rate';
import { filingStatusOf, over65CountOf, salaryAnnual, householdK401ByMonth } from '../../../src/domain/income/onboarding';
import { toNum } from '../../../src/domain/_shared/num';
import { TAX_TABLES, deductionFor } from '../../../src/domain/income/tax';

// ── the functions the app does not export, compiled from their own source text ──────────────────────
const IMPORTED: Record<string, unknown> = { PAY_PERIODS, toNum };
const compile = (file: string, parts: { start: RegExp; end: string }[], name: string) => {
  const text = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const code = parts.map(({ start, end }) => {
    const at = text.search(start);
    if (at < 0) throw new Error(`${start} not found in ${file}`);
    return text.slice(at, text.indexOf(end, at) + end.length);
  }).join('\n');
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText;
  return new Function(...Object.keys(IMPORTED), `${js}\nreturn ${name};`)(...Object.values(IMPORTED));
};
const PERIODS_SRC = { start: /const periodsAYear = /, end: ';\n' };
const periodsAYear: (e: any) => number = compile('base-pay.ts', [PERIODS_SRC], 'periodsAYear');
const perMonth: (amount: any, e: any) => number = compile('base-pay.ts',
  [PERIODS_SRC, { start: /function perMonth\(/, end: '\n}\n' }], 'perMonth');
const monthsOf: (t: any) => [string, number][] = compile('base-pay.ts', [{ start: /function monthsOf\(/, end: '\n}\n' }], 'monthsOf');

// ── the package, read as it came ────────────────────────────────────────────────────────────────────
/** FIXED (2026-10-26, FIX-INCOME-A): an APP WRONG case whose fix landed — a plain test on the reviewer's answer, the app's old
 *  answer kept beside it as test.failing (`before`). */
type Mark = 'AGREE' | 'APP WRONG' | 'REVIEWER WRONG' | 'NEEDS RULING' | 'BLOCKED' | 'OUTSIDE DOMAIN' | 'FIXED';
const PKG = path.join(__dirname, '../../documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/'
  + 'MoneyKeel_CashFlow_Independent_Audit/audit_results/MoneyKeel_CashFlow_Audit_Part_15.json');
const PART = JSON.parse(fs.readFileSync(PKG, 'utf8'));
const C = (caseId: string): any => {
  const c = PART.cases.find((x: any) => x.case_id === caseId);
  if (!c) throw new Error(`no case ${caseId} in the package`);
  return c;
};
const RAN: string[] = [];
const ACTUAL: Record<string, unknown> = {};
/** what the app gave, kept for the results file when CFR15_PROBE names a path (never written otherwise) */
const got = <T>(caseId: string, v: T): T => { ACTUAL[caseId] = v; return v; };
const runner = (mark: Mark) => (mark === 'APP WRONG' ? test.failing : mark === 'BLOCKED' ? test.skip : test);
const kase = (caseId: string, mark: Mark, fn: (c: any) => void, note = '') => {
  RAN.push(caseId);
  const c = C(caseId);
  runner(mark)(`${caseId} · ${c.kind} · ${c.title} [${mark}]${note ? ` — ${note}` : ''}`, () => fn(c));
};
/** the app's answer before a fix, kept as test.failing — never deleted (2026-10-26, FIX-INCOME-A) */
const before = (caseId: string, what: string, fn: () => void) => test.failing(`${caseId} · the app until 2026-10-26, pinned (no longer its answer) — ${what}`, fn);

// ── helpers ─────────────────────────────────────────────────────────────────────────────────────────
/** an exact decimal or rational string from the package, as a number ("13000/3" → 4333.33…) */
const num = (exact: string | number): number => {
  const s = String(exact);
  if (s.includes('/')) { const [a, b] = s.split('/'); return Number(a) / Number(b); }
  return Number(s);
};
const money = (actual: number | null | undefined, expected: any) => {
  expect(actual).not.toBeNull();
  expect(actual as number).toBeCloseTo(num(expected.exact ?? expected), 6);
};
const rate = (actual: number, expected: any) => expect(actual).toBeCloseTo(num(expected.exact ?? expected), 12);
const FREQ = (f: string) => (f === 'yearly' ? 'annually' : f);
const MONTHS_2026 = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`);

/** a wage as BasePayScreen stores it, from the paid-months inputs */
const storedWage = (i: any): Record<string, any> => {
  const gross = num(i.yearly_gross);
  const paid: string[] = i.dated_paid_months ?? [];
  const full = (i.paid_months ?? 12) === 12;
  const w: Record<string, any> = { salaryFreq: 'monthly', c_401k: i.k_per_paid_month, landsTypical: i.take_home_entered_per_paid_month };
  if (full) return { ...w, baseSalary: gross / 12, salaryMonthMode: 'same' };
  const perPaid = gross / paid.length;
  return { ...w, baseSalary: perPaid, salaryMonthMode: 'months',
    salaryByMonth: Object.fromEntries(MONTHS_2026.map((k) => [k, paid.includes(k) ? perPaid : 0])) };
};
/** the entry every base-pay function reads, built the way basePay builds it (entryFromWage + the injected rate) */
const entryOf = (i: any): BasePayEntry => ({ ...entryFromWage(storedWage(i)),
  estRate: i.household_rate_for_calculated_fallback != null ? num(i.household_rate_for_calculated_fallback) : undefined });
/** a wage's month table from the "frequency / gross / varies / table" inputs, as stored */
const storedTableWage = (i: any): Record<string, any> => {
  const table = { ...(i.table ?? {}) };
  return { salaryFreq: i.frequency, baseSalary: i.gross, salaryMonthMode: i.varies ? 'months' : 'same',
    salaryByMonth: Object.keys(table).length ? table : undefined };
};
const rows = (expected: [string, any][]) => expected.map(([k, v]) => [k, v == null || v === '' ? v : num(v.exact)]);
/** the household exactly as BasePayScreen builds it (src/screens/BasePayScreen.tsx lines 69–73) */
const household = (mine: Record<string, any>, theirs: Record<string, any> | null, op: Record<string, any> = {}) => {
  const who = theirs ? 'both' : 'you';
  const profile = { ...op, ...mine, whoEarns: who, partnerWage: theirs ?? undefined };
  const wages = [{ name: 'You', w: mine }, ...(theirs ? [{ name: 'Sam', w: theirs }] : [])];
  return basePay({ earners: wages.map((e) => ({ name: e.name, entry: entryFromWage(e.w) })),
    filingStatus: filingStatusOf(profile as any), over65: over65CountOf(profile as any), profile });
};

beforeAll(() => {
  jest.useFakeTimers({ now: new Date('2026-10-24T12:00:00'),
    doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask'] });
});
afterAll(() => {
  jest.useRealTimers();
  const out = process.env.CFR15_PROBE;
  if (out) fs.writeFileSync(out, JSON.stringify(ACTUAL, null, 1));
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════
describe('MK-CF-O-001 basePay — five cases', () => {
  kase('MK-CF-O-001-C01', 'AGREE', (c) => {
    const i = c.inputs, e = c.expected;
    const p = got(c.case_id, household({ salaryFreq: 'monthly', baseSalary: num(i.gross_annual) / 12, c_401k: i.k_monthly, landsTypical: i.take_home_entered }, null));
    money(p.grossAnnual / 12, e.gross_monthly);
    money(p.monthly401k, e.k_monthly);
    money(p.landsInBank, e.take_home);
    money(p.otherTakenMonthly, e.other_deductions);
    expect(p.tax.mode).toBe(e.mode);
  });
  kase('MK-CF-O-001-C02', 'AGREE', (c) => {
    const i = c.inputs, e = c.expected;
    const p = got(c.case_id, household({ salaryFreq: 'monthly', baseSalary: num(i.gross_annual) / 12, c_401k: i.k_monthly }, null, { filingStatus: i.filing_status }));
    money(p.tax.monthly * 12, e.tax_annual);
    money(p.landsInBank, e.take_home_monthly);
    expect(p.tax.mode).toBe(e.mode === 'calculated' ? 'estimated' : e.mode);
  });
  kase('MK-CF-O-001-C03', 'AGREE', (c) => {
    // the approved Base pay drawing's household (income-end-to-end v07): $84,000 + $54,000, $800 + $400 of 401(k)s, jointly
    const i = c.inputs, e = c.expected;
    const p = got(c.case_id, household({ salaryFreq: 'monthly', baseSalary: 7000, c_401k: 800 }, { salaryFreq: 'monthly', baseSalary: 4500, c_401k: 400 },
      { filingStatus: i.filing_status }));
    expect(p.grossAnnual).toBe(i.earner_gross_annual_total);
    money(p.grossAnnual / 12, e.gross_monthly);
    money(p.monthly401k, e.k_monthly);
    money(p.tax.monthly * 12, e.current_table_tax_annual);
    money(p.tax.monthly, e.current_table_tax_monthly);
    money(p.landsInBank, e.current_table_take_home_monthly);
    // the drawing's own sum is the drawing's (11,500 − 1,058 − 1,200); DEC-1625 names the corrected $873 / $9,427 sentence
    expect(11500 - i.drawing_tax_monthly - 1200).toBe(num(e.drawing_reconciliation_take_home.exact));
    expect(p.landsNote).toBe('$11,500 gross − $873 tax − $1,200 of 401(k)s = $9,427.');
  }, 'the drawn $1,058 is the drawing’s; DEC-1625 names $873 / $9,427');
  kase('MK-CF-O-001-C04', 'AGREE', (c) => {
    const i = c.inputs, e = c.expected;
    const p = got(c.case_id, household(
      { salaryFreq: 'monthly', baseSalary: num(i.earner1.gross_annual) / 12, c_401k: i.earner1.k_monthly, landsTypical: i.earner1.take_home },
      { salaryFreq: 'monthly', baseSalary: num(i.earner2.gross_annual) / 12, c_401k: i.earner2.k_monthly },
      { taxMode: 'manual', manualTaxRate: num(i.household_rate) * 100 }));
    money(p.earners[0].pay.landsInBank, e.take_home_rows[0]);
    money(p.earners[1].pay.landsInBank, e.take_home_rows[1]);
    money(p.landsInBank, e.household_take_home);
    expect(p.tax.mode).toBe(e.mode);
    // the reviewer's tax_label point: in a mixed household the card shows NO household tax row (DEC-0207, frame 2a-iii) —
    // the take-home sentence names each person's figure instead
    // (the ≈ before Sam's figure is being changed in the working tree by CF-MMFIX-B, drawing check IN-03 — not asserted here)
    expect(p.landsNote).toMatch(/^Your take-home: \$5,000 \(you entered\)\nSam’s take-home: ≈?\$3,336 \(calculated at your 15\.00% rate, less 401\(k\)\)$/);   // two decimals since 2026-10-26 (MK-CF-M-081)
  }, 'mixed: no household tax row (DEC-0207 frame 2a-iii)');
  kase('MK-CF-O-001-C05', 'FIXED', (c) => {
    // DEC-0178: the band is worked out ONCE from everything taxed together; the Base pay card reads the wages alone
    const i = c.inputs, e = c.expected;
    const p = got(c.case_id, household({ salaryFreq: 'monthly', baseSalary: i.wages_annual / 12, c_401k: i.k_annual / 12 }, null,
      { filingStatus: i.filing_status, rentals: [{ property_id: 'h1', type: 'long', income: i.taxable_net_rent_annual / 12, expenses: 0 }] }));
    expect(p.bandOnOneWage).toBe(num(e.wage_only_bracket.exact));
    expect(p.tax.bracket).toBe(num(e.authoritative_all_income_bracket.exact));
  }, 'FIXED 2026-10-26 (FIX-INCOME-A): DEC-0178 — the band is read on everything taxed, as the Income summary reads it');
  before('MK-CF-O-001-C05', 'the band read on the wages alone, 12%', () => {
    const p = household({ salaryFreq: 'monthly', baseSalary: 5000, c_401k: 0 }, null,
      { filingStatus: 'single', rentals: [{ property_id: 'h1', type: 'long', income: 50000 / 12, expenses: 0 }] });
    expect(p.tax.bracket).toBe(0.12);
  });
});

describe('MK-CF-F-140 periodsAYear — five cases', () => {
  for (const id of ['MK-CF-F-140-C01', 'MK-CF-F-140-C02', 'MK-CF-F-140-C03', 'MK-CF-F-140-C05']) {
    kase(id, 'AGREE', (c) => expect(got(id, periodsAYear({ freq: FREQ(c.inputs.frequency) }))).toBe(num(c.expected.exact)));
  }
  kase('MK-CF-F-140-C04', 'OUTSIDE DOMAIN', (c) =>
    expect(got(c.case_id, periodsAYear({ freq: FREQ(c.inputs.frequency) }))).toBe(num(c.expected.exact)),
  'no screen offers a yearly rhythm (BasePayScreen FREQS: hourly · weekly · biweekly · monthly); the table’s own "annually" answers 1');
});

describe('MK-CF-F-141 perMonth — five cases', () => {
  for (const id of ['MK-CF-F-141-C01', 'MK-CF-F-141-C02', 'MK-CF-F-141-C04']) {
    kase(id, 'AGREE', (c) => money(got(id, perMonth(c.inputs.amount, { freq: FREQ(c.inputs.frequency) })), c.expected));
  }
  kase('MK-CF-F-141-C03', 'OUTSIDE DOMAIN', (c) =>
    money(got(c.case_id, perMonth(c.inputs.amount, { freq: c.inputs.frequency, hoursPerWeek: c.inputs.hours_per_week })), c.expected),
  'no screen asks hours per week (BasePayScreen has no hours field) — the arithmetic agrees when hours are given');
  kase('MK-CF-F-141-C05', 'FIXED', (c) => {
    const v = got(c.case_id, perMonth(c.inputs.amount, { freq: c.inputs.frequency, hoursPerWeek: c.inputs.hours_per_week }));
    expect(c.expected.state).toBe('REFUSES');
    expect(v).toBeNull();   // until 2026-10-26: $4,333.33, a silent 40-hour week (DEC-0296: an unknown input gives no number and a reason)
  }, 'FIXED 2026-10-26 (FIX-INCOME-A): DEC-0296 — no hours a week, no number; Your base pay asks "Hours a week" and says it is not entered');
  before('MK-CF-F-141-C05', '$4,333.33, a 40-hour week nobody entered', () => expect(perMonth(25, { freq: 'hourly' })).toBeCloseTo(4333.333333, 5));
});

describe('MK-CF-F-142 monthsOf — five cases', () => {
  for (const id of ['MK-CF-F-142-C01', 'MK-CF-F-142-C02', 'MK-CF-F-142-C03', 'MK-CF-F-142-C04']) {
    kase(id, 'AGREE', (c) => {
      const v = got(id, monthsOf(c.inputs.table));
      expect(v.map(([k]) => k)).toEqual(c.expected.map(([k]: any) => k));
      v.forEach(([, x], n) => money(x, c.expected[n][1]));
    });
  }
  kase('MK-CF-F-142-C05', 'OUTSIDE DOMAIN', (c) => {
    // monthsOf is only ever handed the table entryFromWage made through MK-CF-F-165 salaryMonths, which has already turned
    // every cell into a number — a "" never reaches it. The cleared cell is measured where it is turned into $0: F-179-C05.
    expect(got(c.case_id, monthsOf(c.inputs.table))).toEqual([['2026-10', 0], ['2026-11', 0]]);
  }, 'caller MK-CF-F-179 entryFromWage → MK-CF-F-165 salaryMonths hands numbers only; see F-179-C05');
});

describe('MK-CF-F-128 grossByMonth — five cases', () => {
  kase('MK-CF-F-128-C01', 'REVIEWER WRONG', (c) => {
    // code fact: steady pay is ONE typical row standing for every month; every caller reads it so (annualisedGross
    // averages it → $60,000, payFiguresAgree checks it once, nothing sums it). The card's "Answers" line promising twelve
    // rows is the records fix.
    const e = entryFromWage(storedTableWage(c.inputs));
    expect(got(c.case_id, grossByMonth(e))).toEqual([['typical', 5000]]);
    expect(annualisedGross(e)).toBe(c.expected.calendar_rows.reduce((t: number, [, v]: any) => t + num(v.exact), 0));
  }, 'code fact: one typical row, read as every month by every caller; records fix to the Answers line');
  for (const id of ['MK-CF-F-128-C02', 'MK-CF-F-128-C03', 'MK-CF-F-128-C04']) {
    kase(id, 'AGREE', (c) => {
      const v = got(id, grossByMonth(entryFromWage(storedTableWage(c.inputs))));
      expect(v.map(([k]) => k)).toEqual(c.expected.dated_rows.map(([k]: any) => k));
      v.forEach(([, x], n) => money(x, c.expected.dated_rows[n][1]));
    });
  }
  kase('MK-CF-F-128-C05', 'FIXED', (c) => {
    // a cleared cell is stored as "" (BasePayScreen writes the text as typed) and salaryMonths reads it as a typed $0 month
    const v = got(c.case_id, grossByMonth(entryFromWage(storedTableWage(c.inputs))));
    const oct = v.find(([k]) => k === '2026-10');
    expect(oct === undefined || oct[1] !== 0).toBe(true);   // blank differs from zero: not a confirmed $0 month
    expect(v.find(([k]) => k === '2026-11')).toEqual(['2026-11', 0]);
  }, 'FIXED 2026-10-25 in MK-CF-F-165 salaryMonths (CF-MMFIX-B; re-measured 2026-10-26 by FIX-INCOME-A) — tenet 3, DEC-0187, the lead\'s ruling 1');
  before('MK-CF-F-128-C05', 'the cleared October read as a typed $0', () => {
    expect(grossByMonth(entryFromWage(storedTableWage(C('MK-CF-F-128-C05').inputs))).find(([k]) => k === '2026-10')).toEqual(['2026-10', 0]);
  });
});

describe('MK-CF-F-143 annualisedGross — five cases', () => {
  for (const id of ['MK-CF-F-143-C01', 'MK-CF-F-143-C02']) {
    kase(id, 'AGREE', (c) => money(got(id, annualisedGross(entryFromWage(storedTableWage(c.inputs)))), c.expected));
  }
  kase('MK-CF-F-143-C03', 'AGREE', (c) => {
    // IN-FLIGHT: APP WRONG at b1c659e8 — $73,335.16, the three cells typed averaged × 12, as if every other month were their
    // average (DEC-0187: a month the table does not give reads as the typical month; the drawing: "Every month below starts
    // from this"). Fixed in the working tree on 2026-10-25 by CF-MMFIX-B (drawing check IN-05): the calendar year, a month not
    // typed read as the typical — $18,333.79, what the tax path (MK-CF-F-082 salaryAnnual) reads for the same stored wage.
    const w = storedTableWage(c.inputs);
    expect(salaryAnnual({ ...w, whoEarns: 'you' } as any)).toBeCloseTo(num(c.expected.exact), 6);   // MK-CF-F-082, the tax path
    money(got(c.case_id, annualisedGross(entryFromWage(w))), c.expected);
  }, 'IN-FLIGHT (CF-MMFIX-B): APP WRONG at b1c659e8 ($73,335.16); DEC-0187, tenet 4');
  // SETTLED 2026-10-25 by CF-MMFIX-B's decision (its report, "Varying pay is read as this calendar year, through the same helper
  // every Cash flow month uses"; re-marked by FIX-INCOME-A 2026-10-26): reading (b), the reviewer's answer. Rule 6 still holds —
  // the average month × 12, never a window's total — because this year's twelve months are the year. Reading (a) is pinned below.
  kase('MK-CF-F-143-C04', 'AGREE', (c) => {
    // TWO READINGS OF ONE TABLE THAT CROSSES A YEAR. (a) Approved drawing income-end-to-end v07 rule 6 ([Founder 2026-08-27]):
    // "average month × 12, never the total of a fourteen-month window" — 14 cells $53,696.51 ÷ 14 × 12 = $46,025.58, what the
    // app gave at b1c659e8 (REVIEWER WRONG there). (b) This tax year's twelve months, a month not typed read as the typical —
    // $13,113.26, the reviewer's answer and what the tax path (salaryAnnual) reads; the working tree gives it since CF-MMFIX-B
    // (IN-05, 2026-10-25). Pinned: the app's answer today.
    const v = got(c.case_id, annualisedGross(entryFromWage(storedTableWage(c.inputs))));
    const cells = Object.values(c.inputs.table).map((x: any) => num(x));
    expect(cells.reduce((t, x) => t + x, 0) / 14 * 12).toBeCloseTo(46025.58, 6);   // reading (a), rule 6
    expect(v).toBeCloseTo(num(c.expected.exact), 6);                                 // the app today: reading (b), $13,113.26
  }, 'SETTLED 2026-10-25 (CF-MMFIX-B: varying pay is read as this calendar year): the tax year’s months, $13,113.26 — b1c659e8 gave (a), $46,025.58');
  test.failing('MK-CF-F-143-C04 · the app at b1c659e8, pinned (no longer its answer) — reading (a), the fourteen typed cells averaged × 12: $46,025.58',
    () => expect(annualisedGross(entryFromWage(storedTableWage(C('MK-CF-F-143-C04').inputs)))).toBeCloseTo(46025.58, 6));
  kase('MK-CF-F-143-C05', 'REVIEWER WRONG', (c) => {
    // DEC-0187: a month the table does not give reads as the typical month — here the typed $0 — and the one month given
    // is $0, so the year is $0: a typed $0 is an answer (tenet 5), not a refusal
    expect(got(c.case_id, annualisedGross(entryFromWage(storedTableWage(c.inputs))))).toBe(0);
  }, 'DEC-0187, tenet 5: the months given are $0, so the year is $0');
});

describe('MK-CF-F-144 takeHomeAsEntered — five cases', () => {
  for (const id of ['MK-CF-F-144-C01', 'MK-CF-F-144-C02', 'MK-CF-F-144-C03', 'MK-CF-F-144-C04']) {
    kase(id, 'AGREE', (c) => {
      const t = got(id, takeHomeAsEntered(entryOf(c.inputs)));
      money(t.monthly, c.expected.take_home_per_paid_month);
      expect(t.estimated).toBe(c.expected.calculated);
    });
  }
  kase('MK-CF-F-144-C05', 'FIXED', (c) => {
    const t = got(c.case_id, takeHomeAsEntered(entryOf(c.inputs)));   // until 2026-10-26: calculated $3,500 in place of the typed $0
    expect(t.estimated).toBe(c.expected.calculated);
    money(t.monthly, c.expected.take_home_per_paid_month);
  }, 'FIXED 2026-10-26 (FIX-INCOME-A): tenet 5 — a typed $0 is the person’s word');
  before('MK-CF-F-144-C05', 'a calculated $3,500 in place of the typed $0', () => {
    const t = takeHomeAsEntered(entryOf(C('MK-CF-F-144-C05').inputs));
    expect(t).toMatchObject({ estimated: true, monthly: 3500 });
  });
});

describe('MK-CF-F-145 deductionsFromPay — five cases', () => {
  for (const id of ['MK-CF-F-145-C01', 'MK-CF-F-145-C02']) {
    kase(id, 'AGREE', (c) => money(got(id, deductionsFromPay(entryOf(c.inputs))), c.expected));
  }
  for (const id of ['MK-CF-F-145-C03', 'MK-CF-F-145-C04']) {
    kase(id, 'FIXED', (c) => money(got(id, deductionsFromPay(entryOf(c.inputs))), c.expected),
      'FIXED 2026-10-26 (FIX-INCOME-A): DEC-0376 (a 401(k) only in the months paid, MK-CF-F-206) and tenet 1 — the take-home and 401(k) of the six / four paid months');
  }
  kase('MK-CF-F-145-C05', 'FIXED', (c) => money(got(c.case_id, deductionsFromPay(entryOf(c.inputs))), c.expected), 'FIXED 2026-10-26 (FIX-INCOME-A): tenet 5 — a typed $0 take-home');
  before('MK-CF-F-145-C03', '$8,396.70 — twelve months of take-home and 401(k) against six paid',
    () => expect(deductionsFromPay(entryOf(C('MK-CF-F-145-C03').inputs))).toBeCloseTo(60000.30 - 501.13 * 12 - 3799.17 * 12, 6));
  before('MK-CF-F-145-C05', 'nothing (null) — the typed $0 read as not entered', () => expect(deductionsFromPay(entryOf(C('MK-CF-F-145-C05').inputs))).toBeNull());
});

describe('MK-CF-F-146 payFiguresAgree — five cases', () => {
  kase('MK-CF-F-146-C01', 'AGREE', (c) => {
    const m = c.inputs.months[0];
    const v = got(c.case_id, payFiguresAgree({ freq: 'monthly', varies: false, grossTypical: m.gross, monthly401k: m.k, landsTypical: m.take_home }));
    expect(v.ok).toBe(c.expected.passes);
    expect(v.warn).toBe(c.expected.warning);
  });
  kase('MK-CF-F-146-C02', 'AGREE', (c) => {
    // calculated: no take-home typed, nothing to reconcile
    const v = got(c.case_id, payFiguresAgree({ freq: 'monthly', varies: false, grossTypical: 5000, monthly401k: 0 }));
    expect(v).toEqual({ ok: c.expected.passes, warn: false, say: '' });
  });
  kase('MK-CF-F-146-C03', 'FIXED', (c) => {
    // the entry holds ONE monthly401k: February's own $500.13, so February is exactly the case's (−$300.15); January then
    // leaves $7,499.85 of $10,000.17 (75%) — still the early warning the case is about
    const [jan, feb] = c.inputs.months;
    const v = got(c.case_id, payFiguresAgree({ freq: 'monthly', varies: true, grossTypical: 0, monthly401k: feb.k,
      grossByMonth: { [jan.date]: jan.gross, [feb.date]: feb.gross }, landsByMonth: { [jan.date]: jan.take_home, [feb.date]: feb.take_home } }));
    expect(v.ok).toBe(c.expected.passes);   // until 2026-10-26: ok true, warn true — January's warning returned before February was read
    // the case's failure month "2026-02", in the words the screen prints it (CF-MMFIX-B's F6, 2026-10-25: "in February 2026")
    const [y, m] = String(c.expected.failure_month).split('-').map(Number);
    expect(v.say).toContain(`in ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1]} ${y}`);
    expect(v.say).toContain('$300');
  }, 'FIXED 2026-10-26 (FIX-INCOME-A): tenet 1 — a later impossible month fails the check; a warning no longer stops the reading');
  before('MK-CF-F-146-C03', 'January\'s warning, and the check passed', () => {
    const [jan, feb] = C('MK-CF-F-146-C03').inputs.months;
    expect(payFiguresAgree({ freq: 'monthly', varies: true, grossTypical: 0, monthly401k: feb.k,
      grossByMonth: { [jan.date]: jan.gross, [feb.date]: feb.gross }, landsByMonth: { [jan.date]: jan.take_home, [feb.date]: feb.take_home } })).toMatchObject({ ok: true, warn: true });
  });
  kase('MK-CF-F-146-C04', 'AGREE', (c) => {
    const [mar, apr] = c.inputs.months;   // one monthly401k: March's $611.43, so March sits exactly on −$5.00
    const v = got(c.case_id, payFiguresAgree({ freq: 'monthly', varies: true, grossTypical: 0, monthly401k: mar.k,
      grossByMonth: { [mar.date]: mar.gross, [apr.date]: apr.gross }, landsByMonth: { [mar.date]: mar.take_home, [apr.date]: apr.take_home } }));
    expect(v.ok).toBe(c.expected.passes);
  }, 'March’s 401(k) on both months: March exactly −$5.00, April still $499.63');
  kase('MK-CF-F-146-C05', 'AGREE', (c) => {
    const m = c.inputs.months[0];
    const v = got(c.case_id, payFiguresAgree({ freq: 'monthly', varies: false, grossTypical: m.gross, monthly401k: m.k, landsTypical: m.take_home }));
    expect(v.ok).toBe(c.expected.passes);
    expect(v.warn).toBe(c.expected.warning);
  });
});

describe('MK-CF-F-171 earnerPay — five cases', () => {
  const check = (c: any) => {
    const p = got(c.case_id, earnerPay(entryOf(c.inputs)));
    const e = c.expected;
    money(p.grossAnnualised, e.gross_annual);
    money(p.grossMonthly, e.gross_calendar_month_average);
    expect(p.landsIsEstimated).toBe(false);
    money(p.landsInBank, e.take_home_per_paid_month);
    // earnerPay returns the 401(k) a month and the take-home a month — each a PAID month's — and the months paid (2026-10-26,
    // FIX-INCOME-A); the year of each is that month × the months paid, which is what deductionsFromPay subtracts
    money(num(e.gross_annual.exact) - (p.everythingElse as number) - p.landsInBank * p.paidMonths, e.actual_k_annual);
    money(num(e.gross_annual.exact) - (p.everythingElse as number) - p.monthly401k * p.paidMonths, e.take_home_annual);
    money(p.everythingElse, e.other_deductions_annual);
  };
  kase('MK-CF-F-171-C01', 'AGREE', check);
  kase('MK-CF-F-171-C02', 'AGREE', check);
  kase('MK-CF-F-171-C03', 'FIXED', check, 'FIXED 2026-10-26 (FIX-INCOME-A): DEC-0376, tenet 1 — the year of 401(k) and take-home counts the paid months');
  kase('MK-CF-F-171-C04', 'FIXED', check, 'FIXED 2026-10-26 (FIX-INCOME-A): DEC-0376, tenet 1 — everything else taken out $8,020.69 (it read −$64,160.27)');
  kase('MK-CF-F-171-C05', 'FIXED', check, 'FIXED 2026-10-26 (FIX-INCOME-A): tenet 5 — a typed $0 take-home');
  before('MK-CF-F-171-C04', 'everything else taken out −$64,160.27', () => expect(earnerPay(entryOf(C('MK-CF-F-171-C04').inputs)).everythingElse).toBeCloseTo(-64160.27, 2));
});

describe('MK-CF-F-198 payrollTaxWithheld — five cases', () => {
  for (const id of ['MK-CF-F-198-C01', 'MK-CF-F-198-C02', 'MK-CF-F-198-C03', 'MK-CF-F-198-C04', 'MK-CF-F-198-C05']) {
    kase(id, 'AGREE', (c) => {
      // the function returns the one total; its three parts are the formula's three terms, checked here from the same wage
      const w = num(c.inputs.annual_payroll_tax_wages);
      money(got(id, payrollTaxWithheld(w)), c.expected.total);
      money(Math.min(w, SS_WAGE_BASE) * 0.062, c.expected.social_security);
      money(w * 0.0145, c.expected.medicare);
      money(Math.max(0, w - MEDICARE_ADDITIONAL_THRESHOLD) * 0.009, c.expected.additional_medicare_withheld);
    });
  }
});

describe('MK-CF-F-179 entryFromWage — five cases', () => {
  for (const id of ['MK-CF-F-179-C01', 'MK-CF-F-179-C02', 'MK-CF-F-179-C03', 'MK-CF-F-179-C04']) {
    kase(id, 'AGREE', (c) => {
      const e = got(id, entryFromWage(storedTableWage(c.inputs)));
      const x = c.expected;
      expect(e.freq).toBe(x.frequency);
      expect(e.varies).toBe(x.varies);
      money(toNum(e.grossTypical), x.gross);
      const table = e.grossByMonth ?? {};
      expect(Object.keys(table).sort()).toEqual(Object.keys(x.table).sort());
      for (const k of Object.keys(x.table)) money(table[k], x.table[k]);
    });
  }
  kase('MK-CF-F-179-C05', 'FIXED', (c) => {
    const e = got(c.case_id, entryFromWage(storedTableWage(c.inputs)));   // today: { '2026-10': 0, '2026-11': 0 }
    const table = e.grossByMonth ?? {};
    expect(table['2026-10'] === undefined || table['2026-10'] === '').toBe(true);   // the cleared cell is not a typed $0
    expect(table['2026-11']).toBe(0);
  }, 'FIXED 2026-10-25 in MK-CF-F-165 salaryMonths (CF-MMFIX-B; re-measured 2026-10-26 by FIX-INCOME-A) — tenet 3, DEC-0187: the cleared cell is not a typed $0');
  before('MK-CF-F-179-C05', 'the cleared cell as a typed $0', () => expect((entryFromWage(storedTableWage(C('MK-CF-F-179-C05').inputs)).grossByMonth ?? {})['2026-10']).toBe(0));
});

describe('MK-CF-F-180 enteredLandsAnnual — five cases', () => {
  const op = (i: any) => ({ ...storedWage(i), whoEarns: 'you' });
  for (const id of ['MK-CF-F-180-C01', 'MK-CF-F-180-C02']) {
    kase(id, 'AGREE', (c) => money(got(id, enteredLandsAnnual(op(c.inputs) as any)), c.expected));
  }
  for (const id of ['MK-CF-F-180-C03', 'MK-CF-F-180-C04']) {
    kase(id, 'FIXED', (c) => money(got(id, enteredLandsAnnual(op(c.inputs) as any)), c.expected),
      'FIXED 2026-10-26 (FIX-INCOME-A): tenet 1 — the take-home × the months paid');
  }
  kase('MK-CF-F-180-C05', 'FIXED', (c) => money(got(c.case_id, enteredLandsAnnual(op(c.inputs) as any)), c.expected), 'FIXED 2026-10-26 (FIX-INCOME-A): tenet 5 — a typed $0 take-home is not silence');
  before('MK-CF-F-180-C03', '$45,590.04, the take-home × 12', () => expect(enteredLandsAnnual(op(C('MK-CF-F-180-C03').inputs) as any)).toBeCloseTo(45590.04, 6));
  before('MK-CF-F-180-C05', 'nothing (null) — the typed $0 read as silence', () => expect(enteredLandsAnnual(op(C('MK-CF-F-180-C05').inputs) as any)).toBeNull());
});

describe('MK-CF-F-181 rateInForce — five cases', () => {
  const op = (i: any) => {
    const typed = i.typed_rate_percent != null ? { taxMode: 'manual', manualTaxRate: i.typed_rate_percent } : {};
    if (i.paid_months != null) {
      return { ...storedWage({ yearly_gross: i.taxable_annual, k_per_paid_month: i.k_per_paid_month,
        take_home_entered_per_paid_month: i.take_home_per_paid_month, paid_months: i.paid_months,
        dated_paid_months: MONTHS_2026.slice(12 - i.paid_months) }), whoEarns: 'you', filingStatus: 'single', ...typed };
    }
    return { salaryFreq: 'monthly', baseSalary: num(i.taxable_annual) / 12, salaryMonthMode: 'same', c_401k: num(i.k_annual) / 12,
      whoEarns: 'you', filingStatus: i.status, stateTaxRate: i.state_rate != null ? num(i.state_rate) * 100 : undefined, ...typed };
  };
  for (const id of ['MK-CF-F-181-C01', 'MK-CF-F-181-C02', 'MK-CF-F-181-C03', 'MK-CF-F-181-C05']) {
    kase(id, 'AGREE', (c) => rate(got(id, rateInForce(op(c.inputs) as any)).rate, c.expected));
  }
  kase('MK-CF-F-181-C04', 'FIXED', (c) => rate(got(c.case_id, rateInForce(op(c.inputs) as any)).rate, c.expected),
    'FIXED 2026-10-26 (FIX-INCOME-A): tenet 1 — the implied rate counts the six paid months of take-home and 401(k)');
  before('MK-CF-F-181-C04', '13.99% — twelve months of take-home and 401(k) against six paid',
    () => expect(rateInForce(op(C('MK-CF-F-181-C04').inputs) as any).rate).toBeCloseTo((60000.30 - 501.13 * 12 - 3799.17 * 12) / 60000.30, 12));
});

// ── WITNESSES BEHIND THE FORMULA AND RULE VERDICTS (not package cases; each names the verdict it settles) ─────────────
describe('formula and rule verdicts — the measurements behind them', () => {
  test('MK-CF-F-146 [FIXED 2026-10-26] the production shape (one take-home, one 401(k)): January warns, February is −$300.15 — the check fails on February', () => {
    const v = payFiguresAgree(entryFromWage({ salaryFreq: 'monthly', baseSalary: 0, salaryMonthMode: 'months', c_401k: 500.13,
      landsTypical: 2800.19, salaryByMonth: { '2026-01': 10000.17, '2026-02': 3000.17 } }));
    expect(v.ok).toBe(false);
    expect(v.say).toContain('These three cannot all be right in February 2026');
    expect(v.say).toContain('$300');
  });
  test.failing('MK-CF-F-146 · the app until 2026-10-26, pinned (no longer its answer): the production shape — January warns, February is never read, the check passes', () => {
    const v = payFiguresAgree(entryFromWage({ salaryFreq: 'monthly', baseSalary: 0, salaryMonthMode: 'months', c_401k: 500.13,
      landsTypical: 2800.19, salaryByMonth: { '2026-01': 10000.17, '2026-02': 3000.17 } }));
    expect(v).toMatchObject({ ok: true, warn: true });                     // what the app says today
    expect(v.say).toContain('in 2026-01');
    expect(10000.17 - 500.13 - 2800.19).toBeCloseTo(6699.85, 6);           // 67% of January's gross
    expect(3000.17 - 500.13 - 2800.19).toBeCloseTo(-300.15, 6);            // February, never read
  });
  test('MK-CF-F-146 [FIXED 2026-10-25, CF-MMFIX-B\'s F6] a part-year wage: the unpaid $0 months are not reconciled, and the paid months agree', () => {
    expect(payFiguresAgree(entryOf({ yearly_gross: '60000.30', k_per_paid_month: '501.13', take_home_entered_per_paid_month: '3799.17',
      paid_months: 6, dated_paid_months: MONTHS_2026.slice(6) }))).toEqual({ ok: true, warn: false, say: '' });
  });
  test.failing('MK-CF-F-146 · the app until 2026-10-25, pinned (no longer its answer): a part-year wage — an unpaid $0 month is charged the take-home and the 401(k) and fails the check', () => {
    const v = payFiguresAgree(entryOf({ yearly_gross: '60000.30', k_per_paid_month: '501.13', take_home_entered_per_paid_month: '3799.17',
      paid_months: 6, dated_paid_months: MONTHS_2026.slice(6) }));
    expect(v.ok).toBe(false);
    expect(v.say).toContain('in 2026-01');                                 // $0 − $501.13 − $3,799.17 = −$4,300.30
  });
  test('MK-CF-F-143 [FIXED IN THE WORKING TREE, IN-FLIGHT — CF-MMFIX-B] typical $5,000, one month typed $8,000: Base pay read $96,000 a year at b1c659e8; it now reads the tax path’s $63,000', () => {
    const w = { salaryFreq: 'monthly', baseSalary: 5000, salaryMonthMode: 'months', salaryByMonth: { '2026-11': 8000 } };
    expect(salaryAnnual({ ...w, whoEarns: 'you' } as any)).toBe(63000);     // MK-CF-F-082, every other month the typical (DEC-0187)
    expect(annualisedGross(entryFromWage(w))).toBe(63000);                  // b1c659e8: 8,000 × 12 = 96,000
  });
  test('MK-CF-F-165 [FIXED 2026-10-25, CF-MMFIX-B; re-measured 2026-10-26] a cleared month is not entered: typical $5,000, October cleared → October is the typical month, the year $60,000', () => {
    const cleared = { salaryFreq: 'monthly', baseSalary: 5000, salaryMonthMode: 'months', salaryByMonth: { '2026-10': '', '2026-11': '5000' } };
    expect(entryFromWage(cleared).grossByMonth).toEqual({ '2026-11': 5000 });
    expect(annualisedGross(entryFromWage(cleared))).toBe(60000);
    expect(salaryAnnual({ ...cleared, whoEarns: 'you' } as any)).toBe(60000);   // the tax path reads it the same way (tenet 4)
  });
  test.failing('MK-CF-F-165 · the app until 2026-10-25, pinned (no longer its answer): a cleared month counts as a typed $0 → the year loses October', () => {
    const cleared = { salaryFreq: 'monthly', baseSalary: 5000, salaryMonthMode: 'months', salaryByMonth: { '2026-10': '', '2026-11': '5000' } };
    const untouched = { ...cleared, salaryByMonth: { '2026-11': '5000' } };
    expect(entryFromWage(cleared).grossByMonth).toEqual({ '2026-10': 0, '2026-11': 5000 });
    expect(annualisedGross(entryFromWage(untouched))).toBe(60000);          // October read as the typical (DEC-0187)
    // b1c659e8: $30,000 (the two cells averaged × 12); the working tree (CF-MMFIX-B): $55,000 — October still $0 either way
    expect(annualisedGross(entryFromWage(cleared))).toBeLessThan(60000);
    expect(salaryAnnual({ ...cleared, whoEarns: 'you' } as any)).toBe(55000);   // the tax path counts October as $0 too
  });
  test('MK-CF-F-143 [SETTLED 2026-10-25, CF-MMFIX-B: this calendar year] one wage, one reading: 14 cells from Sep 2026 → $13,113.26, the tax year the tax path reads (b1c659e8 gave $46,025.58 by averaging the cells)', () => {
    const w = storedTableWage(C('MK-CF-F-143-C04').inputs);
    expect(salaryAnnual({ ...w, whoEarns: 'you' } as any)).toBeCloseTo(13113.26, 6);
    expect(annualisedGross(entryFromWage(w))).toBeCloseTo(13113.26, 6);     // b1c659e8: 46,025.58
  });
  test('MK-CF-F-144 [FIXED 2026-10-26] a part-year wage with no take-home typed: the calculated take-home is a paid month\'s, after that month\'s 401(k)', () => {
    const e = entryOf({ yearly_gross: '60000.30', k_per_paid_month: '501.13', take_home_entered_per_paid_month: null,
      paid_months: 6, dated_paid_months: MONTHS_2026.slice(6), household_rate_for_calculated_fallback: '0.2' });
    const t = takeHomeAsEntered(e);
    expect(t.estimated).toBe(true);
    expect(t.monthly).toBeCloseTo((60000.30 * 0.8 - 501.13 * 6) / 6, 6);   // $10,000.05 × 0.8 − $501.13 = $7,498.91 a paid month
    expect(t.monthly).toBeCloseTo(10000.05 * 0.8 - 501.13, 6);
  });
  test.failing('MK-CF-F-144 · the app until 2026-10-26, pinned (no longer its answer): the calculated take-home takes twelve months of 401(k)', () => {
    const t = takeHomeAsEntered(entryOf({ yearly_gross: '60000.30', k_per_paid_month: '501.13', take_home_entered_per_paid_month: null,
      paid_months: 6, dated_paid_months: MONTHS_2026.slice(6), household_rate_for_calculated_fallback: '0.2' }));
    expect(t.estimated).toBe(true);
    expect(t.monthly).toBeCloseTo((60000.30 * 0.8 - 501.13 * 12) / 12, 6);   // $3,499.21 — six months of 401(k) give $3,749.79
  });
  test('DEC-0376 [FIXED 2026-10-26] one part-year household, one 401(k) year: the Income summary and Base pay both count the six paid months ($3,006.78)', () => {
    const op = { ...storedWage({ yearly_gross: '60000.30', k_per_paid_month: '501.13', paid_months: 6, dated_paid_months: MONTHS_2026.slice(6) }),
      whoEarns: 'you', filingStatus: 'single' };
    expect(incomeSummary(op).taxed.k401Annual).toBeCloseTo(3006.78, 6);
    const p = household(storedWage({ yearly_gross: '60000.30', k_per_paid_month: '501.13', paid_months: 6, dated_paid_months: MONTHS_2026.slice(6) }), null, { filingStatus: 'single' });
    expect(p.earners[0].pay.paidMonths).toBe(6);
    expect(p.monthly401k * p.earners[0].pay.paidMonths).toBeCloseTo(3006.78, 6);
    // the calculated take-home on Base pay is a paid month's: (gross × (1 − rate) − 3,006.78) ÷ 6
    expect(p.landsInBank).toBeCloseTo((60000.30 * (1 - p.tax.rate) - 501.13 * 6) / 6, 6);
  });
  test.failing('DEC-0376 · the app until 2026-10-26, pinned (no longer its answer): the Income summary counts six months ($3,006.78), Base pay twelve ($6,013.56)', () => {
    const op = { ...storedWage({ yearly_gross: '60000.30', k_per_paid_month: '501.13', paid_months: 6, dated_paid_months: MONTHS_2026.slice(6) }),
      whoEarns: 'you', filingStatus: 'single' };
    expect(householdK401ByMonth(op as any).reduce((t, x) => t + x, 0)).toBeCloseTo(3006.78, 6);
    expect(incomeSummary(op).taxed.k401Annual).toBeCloseTo(3006.78, 6);
    const p = household(storedWage({ yearly_gross: '60000.30', k_per_paid_month: '501.13', paid_months: 6, dated_paid_months: MONTHS_2026.slice(6) }), null, { filingStatus: 'single' });
    expect(p.monthly401k * 12).toBeCloseTo(6013.56, 6);
    // the calculated take-home on Base pay subtracts the twelve-month figure: (gross × (1 − rate) − 6,013.56) ÷ 12
    expect(p.landsInBank).toBeCloseTo((60000.30 * (1 - p.tax.rate) - 501.13 * 12) / 12, 6);
  });
  test('DEC-0207 / DEC-0380 [the card adds up in every mode] gross − tax − 401(k)s = take-home, and everything else = gross − 401(k) − take-home', () => {
    const est = household({ salaryFreq: 'monthly', baseSalary: 7000, c_401k: 800 }, { salaryFreq: 'monthly', baseSalary: 4500, c_401k: 400 }, { filingStatus: 'married' });
    expect(est.grossAnnual / 12 - est.tax.monthly - est.monthly401k).toBeCloseTo(est.landsInBank, 9);
    const ent = household({ salaryFreq: 'monthly', baseSalary: 5000, c_401k: 500, landsTypical: 4000 }, null);
    expect(ent.grossAnnual / 12 - (ent.otherTakenMonthly as number) - ent.monthly401k).toBeCloseTo(ent.landsInBank, 9);
  });
  test('MK-CF-F-141 [FIXED 2026-10-26] Your base pay asks the hours a week; with none entered $25 an hour is no number, and the screen says so', () => {
    expect(perMonth(25, { freq: 'hourly' })).toBeNull();
    expect(perMonth(25, { freq: 'hourly', hoursPerWeek: '40' })).toBeCloseTo(4333.333333, 5);
    const screen = fs.readFileSync(path.join(__dirname, '../../../src/screens/BasePayScreen.tsx'), 'utf8');
    expect(screen).toMatch(/set\('hoursPerWeek', v\)/);
    expect(screen).toContain('Hours a week not entered');
  });
  test.failing('MK-CF-F-141 · the app until 2026-10-26, pinned (no longer its answer): no screen asks the hours — $25 an hour read as a 40-hour week, $4,333.33 a month', () => {
    expect(perMonth(25, { freq: 'hourly' })).toBeCloseTo(4333.333333, 5);
    const screen = fs.readFileSync(path.join(__dirname, '../../../src/screens/BasePayScreen.tsx'), 'utf8');
    expect(/hoursPerWeek|hours per week/i.test(screen)).toBe(false);
  });
  test('MK-CF-F-198 [withholding kept apart from the household bill] two $150,000 wages: $0 extra Medicare withheld on either, and no app path works out the $450 a joint return owes', () => {
    const extra = (w: number) => payrollTaxWithheld(w) - (Math.min(w, SS_WAGE_BASE) * 0.062 + w * 0.0145);
    expect(extra(150000)).toBe(0);
    expect(extra(150000) + extra(150000)).toBe(0);
    expect(0.009 * (300000 - 250000)).toBeCloseTo(450, 9);                  // the household liability the reviewer names
    // payrollTaxWithheld has one caller, basePay's shortBy, which sizes the sentence about the paycheck (DEC-0340); the
    // calculated tax is federal income tax only (DEC-0384), so nothing replaces the withholding rule with the filing rule
    const callers = ['base-pay.ts', 'income-summary.ts', 'this-month.ts', 'the-month.ts', 'tax-organizer.ts']
      .map((f) => fs.readFileSync(path.join(__dirname, f), 'utf8'))
      .reduce((t, s) => t + (s.match(/payrollTaxWithheld\(/g) ?? []).length, 0);
    expect(callers).toBe(2);   // its definition and basePay's one call
  });
});

// ── the part's own payroll source check: its seven witnesses against MK-CF-F-198 ─────────────────────────────────────
describe('source check — Social Security and Medicare 2026 withholding (7 witnesses)', () => {
  const src = PART.source_checks.find((s: any) => /Social Security and Medicare/.test(s.topic));
  test('the source check is in the part and carries seven witnesses', () => expect(src.witnesses).toHaveLength(7));
  for (const [n, w] of (src?.witnesses ?? []).entries()) {
    if (w.input.annual_employee_wages != null) {
      test(`witness ${n + 1}: $${w.input.annual_employee_wages} of wages → ${w.expected.exact} [AGREE]`, () =>
        money(payrollTaxWithheld(num(w.input.annual_employee_wages)), w.expected));
    } else {
      test(`witness ${n + 1}: two $150,000 wages, joint → $0 extra withheld [AGREE]; $450 owed at filing [OUTSIDE DOMAIN: no app function works out the household's Additional Medicare tax]`, () => {
        const extra = (x: number) => payrollTaxWithheld(x) - (Math.min(x, SS_WAGE_BASE) * 0.062 + x * 0.0145);
        expect(extra(w.input.earner1) + extra(w.input.earner2)).toBe(num(w.expected.additional_employer_withholding.exact));
      });
    }
  }
});

// ── the part's two other source checks, as constants: the band tops and the deductions the app's tables hold ──────────
describe('source checks — the 2026 bands and standard deductions, as the app holds them', () => {
  test('bands: all four filing statuses’ band tops and rates equal the published table (IRS Rev. Proc. 2025-32 §4.01) [AGREE]', () => {
    const src = PART.source_checks.find((x: any) => /bands by filing status/.test(x.topic));
    const statuses = Object.keys(src.amounts_checked);
    expect(statuses.sort()).toEqual(['hoh', 'married', 'mfs', 'single']);
    for (const st of statuses) {
      const app = (TAX_TABLES as any)[st].brackets.map(([top, r]: [number, number]) => [top === Infinity ? null : top, r]);
      expect(app).toEqual(src.amounts_checked[st]);
    }
  });
  test('deductions: 9 of 9 standard-deduction witnesses (with the 65+ additions) [AGREE]', () => {
    const src = PART.source_checks.find((x: any) => /Standard deduction/.test(x.topic));
    expect(src.witnesses).toHaveLength(9);
    for (const w of src.witnesses) expect(deductionFor(w.input.filing_status, w.input.eligible_people65_plus, null)).toBe(num(w.expected.exact));
  });
});

// ── coverage: every case in the part ran here, once ─────────────────────────────────────────────────────────────────
test('coverage: all 70 of 70 part-15 cases were run, each once', () => {
  const ids = PART.cases.map((c: any) => c.case_id);
  expect(ids).toHaveLength(70);
  expect(RAN).toHaveLength(70);
  expect(new Set(RAN).size).toBe(70);
  expect([...RAN].sort()).toEqual([...ids].sort());
});
