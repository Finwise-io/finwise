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
import { blendedReturn } from '../domain/assets';

const BRIEF = path.join(__dirname, '..', '..', 'August 14th Design', 'PLAN-REDESIGN-BRIEF-v3-2026-08-14.md');
const brief = fs.readFileSync(BRIEF, 'utf8');
const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;   // money-mask-ok: doc text, never rendered

const BASE = { inflation: 0.025, seed: 42, paths: 400, vol_return: 0.0935, mean_return: 0.055 };
const odds = (o: Partial<RetirementInputs>) => simulate({ ...BASE, ...o } as RetirementInputs).chance_of_success;
const projected = (o: Partial<RetirementInputs>) => Math.round(simulate({ ...BASE, ...o } as RetirementInputs).projected_at_retirement);

const PAT = { current_age: 58, horizon_age: 90, retire_age: 65, start_balance: 909_152,
              retire_monthly_spend_today: 5200, guaranteed_monthly_income: 0, guaranteed_start_age: 67 };
const JUNE = { current_age: 72, horizon_age: 94, retire_age: 72, start_balance: 985_000,
               annual_contribution: 0, guaranteed_monthly_income: 4000, guaranteed_start_age: 72 };
const RAY  = { current_age: 64, horizon_age: 92, retire_age: 67, start_balance: 500_000,
               annual_contribution: 6000, retire_monthly_spend_today: 4800 };

/** The brief must literally contain this figure. */
const inBrief = (s: string) => expect(brief.includes(s) ? s : `MISSING FROM BRIEF: ${s}`).toBe(s);

describe('the brief agrees with the engine', () => {
  test("Pat's closing sentence: the saving that reaches his typed target, and where it lands", () => {
    const p = projected({ ...PAT, annual_contribution: 84_500 });
    expect(p).toBeGreaterThanOrEqual(2_000_000);                       // it must actually reach it
    expect(projected({ ...PAT, annual_contribution: 84_000 })).toBeLessThan(2_000_000);   // one step lower misses
    inBrief(money(p));                                                 // $2,021,514
    inBrief('$84,500');
  });

  test('state 6 and its mirror carry the numbers the engine returns', () => {
    inBrief(money(projected({ ...PAT, annual_contribution: 24_000 })));           // $1,506,263 reaches $1.5M
    expect(odds({ ...PAT, annual_contribution: 24_000 })).toBe(64);
    inBrief('4 futures out of 10');                                               // 64% said as a count
    // and the correction that started this file: 45% is NOT presented as an odds figure anywhere
    expect(brief).not.toMatch(/odds (?:sit at|are|read) \*\*45%/);
  });

  test('the claim "saving is no longer the lever" stays deleted — it was false', () => {
    const floor = odds({ ...PAT, annual_contribution: 0 });
    const ceiling = odds({ ...PAT, annual_contribution: 84_500 });
    expect(ceiling - floor).toBeGreaterThan(30);        // 45 -> 90: an enormous lever
    expect(brief).not.toContain('saving more is no longer the lever');
  });

  test("June's paycheck, headroom and the live spend-more curve", () => {
    // solveSafeDraw needs the ages too — BASE alone returns NaN, which this test caught on its first run.
    expect(Math.round(solveSafeDraw(985_000, 4000, { ...BASE, current_age: 72, horizon_age: 94 } as any, 80))).toBe(4155);
    inBrief('$8,155'); inBrief('$2,555'); inBrief('$985,000');
    expect(odds({ ...JUNE, retire_monthly_spend_today: 5600 })).toBe(100);   // at rest
    expect(odds({ ...JUNE, retire_monthly_spend_today: 8155 })).toBe(80);    // at the maximum
    inBrief('4 futures out of 5');
  });

  test("Ray's Social Security figures and the decision that carries him over the line", () => {
    expect(Math.round(ssBenefitAtClaimAge(2600, 70))).toBe(3224);
    inBrief('$3,224'); inBrief('$624');
    const at67 = odds({ ...RAY, guaranteed_monthly_income: 2600, guaranteed_start_age: 67 });
    const at70 = odds({ ...RAY, guaranteed_monthly_income: 3224, guaranteed_start_age: 70 });
    expect([at67, at70]).toEqual([73, 80]);
    inBrief('7 futures out of 10'); inBrief('8 in 10');
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
describe('unresolved provenance', () => {
  test("Pat's 48% does not follow from Pat's own accounts, and the brief says so", () => {
    const patsOwnReturn = blendedReturn([
      { asset_id: 'a', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 355_152 },
      { asset_id: 'b', kind: 'trad_ira',   tax_bucket: 'PRE_TAX', balance: 420_000 },
      { asset_id: 'c', kind: 'roth_ira',   tax_bucket: 'ROTH',    balance: 96_000 },
      { asset_id: 'd', kind: 'savings',    tax_bucket: 'CASH',    balance: 38_000 },
    ] as any);
    // his holdings are growth-heavy; the brief's states were all probed at 5.5%
    expect(patsOwnReturn).toBeGreaterThan(0.08);
    const atHisOwnReturn = odds({ ...PAT, annual_contribution: 0, mean_return: patsOwnReturn });
    expect(atHisOwnReturn).toBeGreaterThan(70);      // ~82%, nowhere near 48%
    // Until the founder rules, the brief MUST carry the warning rather than presenting 48% as solid.
    expect(brief).toContain("PAT'S 48% IS NOT REPRODUCIBLE FROM PAT'S OWN NUMBERS");
  });
});
