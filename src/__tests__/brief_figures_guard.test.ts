// EVERY NUMBER IN THE DESIGN BRIEF MUST COME FROM THE ENGINE — OR SAY WHERE IT CAME FROM.
//
// WHY THIS EXISTS (2026-08-14). Three errors were caught in the Plan brief in a single day, and all
// three were the same kind of thing: a figure or a claim that nobody had run:
//
//   1. State 6 said Pat's odds were 45%. That is his assets-versus-target figure — the OTHER dial —
//      on the one state whose whole purpose is stopping those two numbers being confused.
//   2. The brief instructed the designer to write "saving is no longer the lever". Measured, saving
//      takes Pat from 45% to 90%. It was reasoned, not run.
//   3. The day-one guidance contradicted what the shipped app already does.
//
// The founder asked how to stop this happening in the next brief. The answer is not more care — I
// was reading carefully and still wrote all three. It is that a brief is a document full of claims
// the code can settle, and until now nothing settled them. So: the engine recomputes every persona
// figure here, and the build fails when the brief and the engine disagree.
//
// The same lesson as the orphan-route guard and the banned-word guard, both of which caught real
// defects within minutes of existing: enforce with a gate, not an intention.
import fs from 'fs';
import path from 'path';
import { simulate, type RetirementInputs } from '../domain/retirement';
import { solveSafeDraw } from '../domain/paycheck';
import { ssBenefitAtClaimAge } from '../domain/retirement/ssTiming';
import { blendedReturn, blendedVolatility } from '../domain/assets';
import { targetAtRetirement } from '../domain/planning/target';

const BRIEF = path.join(__dirname, '..', '..', 'August 14th Design', 'PLAN-REDESIGN-BRIEF-v3-2026-08-14.md');
const brief = fs.readFileSync(BRIEF, 'utf8');
const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;   // money-mask-ok: doc text, never rendered

const BASE = { inflation: 0.025, seed: 42, paths: 400, vol_return: 0.0935, mean_return: 0.055 };
const odds = (o: Partial<RetirementInputs>) => simulate({ ...BASE, ...o } as RetirementInputs).chance_of_success;
const projected = (o: Partial<RetirementInputs>) => Math.round(simulate({ ...BASE, ...o } as RetirementInputs).projected_at_retirement);

// PAT'S HOLDINGS ARE THE INPUT, AND HIS RETURN COMES OUT OF THEM — corrected 2026-08-14.
// The brief used to give him growth-heavy accounts and print 48% odds. Those blend to 8.65%, which
// puts him at 82%; the 48% only existed at a 5.5% return nobody had written down. His holdings now
// produce his number, and the two inputs that were never stated — his expected growth and what he
// currently saves — are in his table where the rest of his inputs already were.
const PAT_ACCOUNTS = [
  { asset_id: 'a', kind: 'trad_ira',   tax_bucket: 'PRE_TAX', balance: 380_000 },
  { asset_id: 'b', kind: 'savings',    tax_bucket: 'CASH',    balance: 379_152 },   // 42% in plain savings
  { asset_id: 'c', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 90_000  },
  { asset_id: 'd', kind: 'roth_ira',   tax_bucket: 'ROTH',    balance: 60_000  },
] as any;
const PAT_SAVES = 12_000;                          // a year — a STATED input now, not a silent one
const PAT = { current_age: 58, horizon_age: 90, retire_age: 65, start_balance: 909_152,
              retire_monthly_spend_today: 5200, guaranteed_monthly_income: 0, guaranteed_start_age: 67,
              mean_return: blendedReturn(PAT_ACCOUNTS), vol_return: blendedVolatility(PAT_ACCOUNTS) };
const JUNE = { current_age: 72, horizon_age: 94, retire_age: 72, start_balance: 985_000,
               annual_contribution: 0, guaranteed_monthly_income: 4000, guaranteed_start_age: 72 };
const RAY  = { current_age: 64, horizon_age: 92, retire_age: 67, start_balance: 500_000,
               annual_contribution: 6000, retire_monthly_spend_today: 4800 };

/** The brief must literally contain this figure. */
const inBrief = (s: string) => expect(brief.includes(s) ? s : `MISSING FROM BRIEF: ${s}`).toBe(s);

describe('the brief agrees with the engine', () => {
  test("Pat's accounts sum to his balance, and they are what produce his odds", () => {
    expect(PAT_ACCOUNTS.reduce((t: number, a: any) => t + a.balance, 0)).toBe(909_152);
    inBrief('$380,000'); inBrief('$379,152'); inBrief('$90,000'); inBrief('$60,000');
    inBrief(`${(PAT.mean_return * 100).toFixed(2)}%`);                 // 5.85% — stated in his table
    expect(odds({ ...PAT, annual_contribution: PAT_SAVES })).toBe(67);
    inBrief('**67%** of lasting to 90');
    inBrief('$12,000 a year');                                         // what he saves — was never stated
  });

  test('the target we SUGGEST is the engine\'s 80% pot, and it differs from what Pat typed', () => {
    // BASE carries inflation/seed/paths — omitting it silently solves a different simulation and
    // returned $70,000 instead of $1,250,000. The guard caught that; I would not have.
    const suggested = targetAtRetirement({ ...BASE, ...PAT, annual_contribution: PAT_SAVES } as any);
    expect(suggested).toBe(1_250_000);
    inBrief(money(suggested!));
    // the whole point of the qualifier: our figure and his ambition are different numbers
    expect(suggested).toBeLessThan(2_000_000);
    inBrief('our starting figure, not yours');
  });

  test("Pat's closing sentence: the saving that reaches his typed target, and where it lands", () => {
    const p = projected({ ...PAT, annual_contribution: 77_500 });
    expect(p).toBeGreaterThanOrEqual(2_000_000);                       // it must actually reach it
    expect(projected({ ...PAT, annual_contribution: 77_000 })).toBeLessThan(2_000_000);   // one step lower misses
    inBrief(money(p));                                                 // $2,008,196
    inBrief('$77,500');
    // and the growth breakdown that stops the reader subtracting and finding a mismatch
    const noSaving = projected({ ...PAT, annual_contribution: 0 });
    inBrief(money(noSaving - 909_152));                                // growth on what he already has
    inBrief(money(77_500 * 7));                                        // what he puts in
    inBrief(money(p - noSaving - 77_500 * 7));                         // growth on the new money
  });

  test('state 6 and its mirror carry the numbers the engine returns', () => {
    const mirror = projected({ ...PAT, annual_contribution: 17_500 });
    expect(mirror).toBeGreaterThanOrEqual(1_500_000);
    inBrief(money(mirror));                                                       // $1,505,001
    expect(odds({ ...PAT, annual_contribution: 17_500 })).toBe(74);               // on target, still short of 80
    inBrief('1 future simulation in 4');                                                     // 74% said as a count
    inBrief('1 future simulation in 3');                                                     // 67% said as a count
    // the correction that started this file: 45% is never presented as an odds figure
    expect(brief).not.toMatch(/odds (?:sit at|are|read) \*\*45%/);
  });

  test('the claim "saving is no longer the lever" stays deleted — it was false', () => {
    const floor = odds({ ...PAT, annual_contribution: 0 });
    const ceiling = odds({ ...PAT, annual_contribution: 77_500 });
    expect(ceiling - floor).toBeGreaterThan(30);        // 56 -> 98: an enormous lever
    expect(brief).not.toContain('saving more is no longer the lever');
  });

  test('the mortgage consequence is a second honest run, not a subtracted penalty', () => {
    // $500/mo extra on the mortgage = $6,000/yr that stops going into savings
    expect(odds({ ...PAT, annual_contribution: PAT_SAVES })).toBe(67);
    expect(odds({ ...PAT, annual_contribution: PAT_SAVES - 6_000 })).toBe(65);
    inBrief('67 future simulations out of 100'); inBrief('65 out of 100');
  });

  test("June's paycheck, headroom and the live spend-more curve", () => {
    // solveSafeDraw needs the ages too — BASE alone returns NaN, which this test caught on its first run.
    expect(Math.round(solveSafeDraw(985_000, 4000, { ...BASE, current_age: 72, horizon_age: 94 } as any, 80))).toBe(4155);
    inBrief('$8,155'); inBrief('$2,555'); inBrief('$985,000');
    expect(odds({ ...JUNE, retire_monthly_spend_today: 5600 })).toBe(100);   // at rest
    expect(odds({ ...JUNE, retire_monthly_spend_today: 8155 })).toBe(80);    // at the maximum
    inBrief('4 future simulations out of 5');
    // founder 2026-08-14: "futures" alone reads as a prediction about her life; these are model runs
    expect(brief).not.toMatch(/\d+ futures out of/);
  });

  test("Ray's Social Security figures and the decision that carries him over the line", () => {
    expect(Math.round(ssBenefitAtClaimAge(2600, 70))).toBe(3224);
    inBrief('$3,224'); inBrief('$624');
    const at67 = odds({ ...RAY, guaranteed_monthly_income: 2600, guaranteed_start_age: 67 });
    const at70 = odds({ ...RAY, guaranteed_monthly_income: 3224, guaranteed_start_age: 70 });
    expect([at67, at70]).toEqual([73, 80]);
    inBrief('7 future simulations out of 10'); inBrief('8 in 10');
  });

  test('the mortgage comparison is drawn in BOTH directions, with the losing case the bigger number', () => {
    inBrief('$36,577');    // above the yield — paying down wins
    inBrief('$40,217');    // below the yield — paying down LOSES, and by more
    inBrief('4.63%');      // the live ten-year
    // 4.35% may appear ONLY in the note explaining the dead feed — never as the yield in screen copy.
    // (The first version of this assertion banned the string outright and failed on that note, which
    //  is the guard working: a rule that cannot tell prose from copy is too blunt to keep.)
    for (const m of brief.matchAll(/4\.35%/g)) {
      const around = brief.slice(Math.max(0, m.index! - 400), m.index! + 200);
      expect(around).toMatch(/fallback|dead|404/i);
    }
    expect(brief).not.toMatch(/Treasury pays 4\.35%/);
  });
});

// ── the figures we CANNOT yet reproduce, kept visible so they cannot be forgotten ────────────────
// ── v4 handoff, 2026-08-14: two number defects found in the returned design ─────────────────────
describe('handoff v4 defects — pinned so a corrected file can be checked mechanically', () => {
  const TSY = 0.0463;   // the live ten-year, per the Federal Reserve series

  test('V1 — the below-yield frame changed the balance but kept the old balance\'s figures', () => {
    // the design draws "$380,000 at 3.1%" while printing $6,304/yr and $40,217, both computed for
    // the brief's $412,000 example. Either restore the balance or recompute — these are the two
    // values a corrected frame must land on.
    expect(Math.round((TSY - 0.031) * 412_000)).toBe(6_304);      // correct AT $412,000
    expect(Math.round((TSY - 0.031) * 380_000)).toBe(5_814);      // correct AT $380,000
    expect(6_304).not.toBe(5_814);                                 // so the drawn pair cannot both hold
  });

  test('V2 — the spend-more bucket overstates at the $2,500 stepper position', () => {
    const oddsAt = (spend: number) => simulate({
      ...BASE, ...JUNE, retire_monthly_spend_today: spend,
    } as RetirementInputs).chance_of_success;
    expect(oddsAt(5600 + 2000)).toBe(90);        // "9 in 10" — true here
    expect(oddsAt(5600 + 2500)).toBe(81);        // the design still says "9 in 10" — it is 4 in 5
    expect(oddsAt(5600 + 2555)).toBe(80);
    // the bucket boundary has to sit below $2,500, not at $2,555
    expect(oddsAt(5600 + 2500)).toBeLessThan(85);
  });
});

describe('the defect that built this file cannot come back', () => {
  test("the OLD growth-heavy holdings would have put Pat at 82%, and they are gone", () => {
    const oldReturn = blendedReturn([
      { asset_id: 'a', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 355_152 },
      { asset_id: 'b', kind: 'trad_ira',   tax_bucket: 'PRE_TAX', balance: 420_000 },
      { asset_id: 'c', kind: 'roth_ira',   tax_bucket: 'ROTH',    balance: 96_000 },
      { asset_id: 'd', kind: 'savings',    tax_bucket: 'CASH',    balance: 38_000 },
    ] as any);
    expect(oldReturn).toBeGreaterThan(0.08);                                    // 8.65%
    expect(odds({ ...PAT, annual_contribution: 0, mean_return: oldReturn })).toBeGreaterThan(70);
    // The old balance may appear ONLY in the note explaining what changed and why — never as one of
    // Pat's holdings. (Banning the string outright failed on that note; a rule that cannot tell
    // history from a live figure is too blunt to keep. Same lesson as the 4.35% assertion above.)
    for (const m of brief.matchAll(/\$355,152/g)) {
      const around = brief.slice(Math.max(0, m.index! - 300), m.index! + 300);
      expect(around).toMatch(/used to hold|What was broken|Note what changed/i);
    }
    expect(brief).not.toMatch(/— Vanguard Brokerage \| \$355,152/);
    expect(brief).toMatch(/RESOLVED 2026-08-14 — Pat's odds now follow from Pat's holdings/);
  });
});
