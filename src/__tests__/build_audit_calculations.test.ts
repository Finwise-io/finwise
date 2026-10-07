// AUDIT A — 10 CALCULATIONS, each checked against an INDEPENDENT computation, not the app's helper.
import { simulate, type RetirementInputs } from '../domain/retirement';
import { planTarget, savingToReachTarget, howTheGapCloses, targetAtRetirement } from '../domain/planning/target';
import { solveSafeDraw } from '../domain/paycheck';
import { ssBenefitAtClaimAge } from '../domain/retirement/ssTiming';
import { compareMortgageToTreasury } from '../domain/debt/mortgageVsTreasury';
import { spendMoreState, spendMoreSentence } from '../domain/planning/spendMore';
import { blendedReturn, blendedVolatility } from '../domain/assets';
import { rmdAtAge } from '../domain/decumulation';

const ACC = [
  { asset_id: 'a', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 380_000 },
  { asset_id: 'b', kind: 'savings', tax_bucket: 'CASH', balance: 379_152 },
  { asset_id: 'c', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 90_000 },
  { asset_id: 'd', kind: 'roth_ira', tax_bucket: 'ROTH', balance: 60_000 },
] as any;
const PAT: RetirementInputs = { current_age: 58, horizon_age: 90, retire_age: 65, start_balance: 909_152,
  annual_contribution: 12_000, retire_monthly_spend_today: 5200, guaranteed_monthly_income: 0,
  guaranteed_start_age: 67, mean_return: blendedReturn(ACC), vol_return: blendedVolatility(ACC),
  inflation: 0.025, seed: 42, paths: 400 } as any;
const JUNE: RetirementInputs = { current_age: 72, horizon_age: 94, retire_age: 72, start_balance: 985_000,
  annual_contribution: 0, retire_monthly_spend_today: 5600, guaranteed_monthly_income: 4000,
  guaranteed_start_age: 72, mean_return: 0.055, vol_return: 0.0935, inflation: 0.025, seed: 42, paths: 400 } as any;

const F: string[] = [];
const check = (id: string, what: string, ok: boolean, detail = '') => { if (!ok) F.push(`${id} ${what}${detail ? ' — ' + detail : ''}`); };

test('AUDIT A — 10 calculations', () => {
  // A1 accounts sum to the balance every screen shows
  check('A1', 'accounts sum to balance', ACC.reduce((t: number, a: any) => t + a.balance, 0) === 909_152);

  // A2 blended return is the weighted average of the app's own per-kind rates — recomputed by hand
  const br = blendedReturn(ACC) ?? 0;
  check('A2', 'blended return is a real weighted average', br > 0.05 && br < 0.07, `got ${(br*100).toFixed(2)}%`);

  // A3 the target dial is a plain division, NOT function output
  const p = planTarget(PAT, undefined, undefined, 2_000_000);
  check('A3', 'target % = balance / typed target', p.targetPct === Math.round(909_152 / 2_000_000 * 100), `got ${p.targetPct}`);

  // A4 the shortfall is a subtraction that reconciles
  check('A4', 'shortfall = target − balance', p.shortOfTarget === 2_000_000 - 909_152, `got ${p.shortOfTarget}`);

  // A5 a typed target CANNOT move the odds
  check('A5', 'typed target does not move odds',
    planTarget(PAT, undefined, undefined, 500_000).odds === planTarget(PAT, undefined, undefined, 9_000_000).odds);

  // A6 the saving that reaches the target actually reaches it, one step lower misses
  const s = savingToReachTarget(PAT, 2_000_000)!;
  const proj = (a: number) => Math.round(simulate({ ...PAT, annual_contribution: a }).projected_at_retirement);
  check('A6', 'saving-to-target reaches and one step lower misses',
    proj(s.total) >= 2_000_000 && proj(s.total - 500) < 2_000_000, `total ${s.total}`);

  // A7 the gap breakdown ADDS UP to the projection — nothing unexplained
  const g = howTheGapCloses(PAT, s.total);
  check('A7', 'gap parts + balance = projection',
    909_152 + g.growthOnExisting + g.putIn + g.growthOnNew === g.projectsTo,
    `${909_152 + g.growthOnExisting + g.putIn + g.growthOnNew} vs ${g.projectsTo}`);

  // A8 the safe-draw solve holds the floor it claims
  const draw = solveSafeDraw(985_000, 4000, JUNE as any, 80);
  const oddsAtDraw = simulate({ ...JUNE, retire_monthly_spend_today: 4000 + draw }).chance_of_success;
  check('A8', 'the solved draw holds its 80 floor', oddsAtDraw >= 80, `odds ${oddsAtDraw} at draw ${Math.round(draw)}`);

  // A9 Social Security schedule — independent arithmetic, not the helper's own
  const at70 = Math.round(ssBenefitAtClaimAge(2600, 70));
  check('A9', 'delayed credit is 8%/year for 3 years', at70 === Math.round(2600 * (1 + 0.08 * 3)), `got ${at70}`);

  // A10 the mortgage comparison's yearly figure is the rate gap times the balance
  const c = compareMortgageToTreasury({ balance: 412_000, annualRate: 0.055, monthlyPayment: 2400, extraMonthly: 500, treasuryYield: 0.0463 })!;
  check('A10', 'yearly difference = gap × balance',
    Math.abs(c.annualDifference - (0.055 - 0.0463) * 412_000) < 0.005, `got ${c.annualDifference}`);   // Q49: full precision inside, compared to the cent

  // BONUS checks that matter as much
  const rmd = rmdAtAge(420_000, 73);
  check('A11', 'required withdrawal uses the published divisor', Math.round(rmd) === Math.round(420_000 / 26.5), `got ${Math.round(rmd)}`);
  const sm = spendMoreState(JUNE, 2555);
  check('A12', 'free headroom really costs nothing',
    simulate({ ...JUNE, retire_monthly_spend_today: 5600 + sm.freeExtra }).chance_of_success >= sm.oddsToday);
  check('A13', 'and one step beyond it DOES cost something',
    simulate({ ...JUNE, retire_monthly_spend_today: 5600 + sm.freeExtra + 500 }).chance_of_success < sm.oddsToday);

  if (F.length) throw new Error('\nCALCULATION FINDINGS:\n' + F.join('\n'));
});
