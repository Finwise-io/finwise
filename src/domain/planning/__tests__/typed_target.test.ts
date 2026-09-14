// THE TYPED TARGET — the founder's first correction of this engagement, finally in the function.
//
// "Target nest egg is a number entered by user based on what is their target. And odds are simply
// calculated based on target nest egg entered by the user." Until now the app derived it (the pot
// that reaches 80% odds) and labelled it "Target nest egg" — so it showed someone a number, called
// it their target, and never mentioned we picked it.
//
// The two dials answer different questions and must be able to disagree without either looking
// wrong: the target dial is "am I hitting my own number", the odds dial is "will the money last".
import { planTarget, savingToReachTarget, howTheGapCloses } from '../target';
import { blendedReturn, blendedVolatility } from '../../assets';
import type { RetirementInputs } from '../../retirement';

const ACCOUNTS = [
  { asset_id: 'a', kind: 'trad_ira',   tax_bucket: 'PRE_TAX', balance: 380_000 },
  { asset_id: 'b', kind: 'savings',    tax_bucket: 'CASH',    balance: 379_152 },
  { asset_id: 'c', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 90_000  },
  { asset_id: 'd', kind: 'roth_ira',   tax_bucket: 'ROTH',    balance: 60_000  },
] as any;

const PAT: RetirementInputs = {
  current_age: 58, horizon_age: 90, retire_age: 65, start_balance: 909_152,
  annual_contribution: 12_000, retire_monthly_spend_today: 5200,
  guaranteed_monthly_income: 0, guaranteed_start_age: 67,
  mean_return: blendedReturn(ACCOUNTS), vol_return: blendedVolatility(ACCOUNTS),
  inflation: 0.025, seed: 42, paths: 400,
} as any;

test('THE RULE: a typed target cannot move the odds by a single point', () => {
  const a = planTarget(PAT, undefined, undefined, 800_000);
  const b = planTarget(PAT, undefined, undefined, 5_000_000);
  const none = planTarget(PAT);
  expect(a.odds).toBe(b.odds);
  expect(a.odds).toBe(none.odds);          // naming a number changes nothing about survival
  expect(a.odds).toBe(67);
});

test('the dial is THEIR number against TODAY\'s money, and it may pass 100%', () => {
  expect(planTarget(PAT, undefined, undefined, 2_000_000).targetPct).toBe(45);
  expect(planTarget(PAT, undefined, undefined, 2_000_000).shortOfTarget).toBe(1_090_848);
  // past their own target: 114%, and "short" goes negative rather than clamping to zero
  const past = planTarget(PAT, undefined, undefined, 800_000);
  expect(past.targetPct).toBe(114);
  expect(past.shortOfTarget).toBe(-109_152);
});

test('OURS is offered only while THEIRS is blank, and disappears the moment they type', () => {
  const blank = planTarget(PAT);
  expect(blank.typedTarget).toBeNull();
  expect(blank.suggestedTarget).toBe(1_250_000);          // the 80%-odds pot
  const typed = planTarget(PAT, undefined, undefined, 2_000_000);
  expect(typed.typedTarget).toBe(2_000_000);
  expect(typed.suggestedTarget).toBeNull();               // our number stops existing
});

test('our suggestion and their ambition are different numbers — the screen must not blur them', () => {
  const blank = planTarget(PAT);
  expect(blank.suggestedTarget).toBeLessThan(2_000_000);
});

test('the saving that reaches THEIR number actually reaches it, and one step lower misses', () => {
  const s = savingToReachTarget(PAT, 2_000_000)!;
  expect(s.total).toBe(77_500);
  expect(s.extra).toBe(65_500);                            // over the $12,000 he already saves
  const { simulate } = require('../../retirement');
  expect(Math.round(simulate({ ...PAT, annual_contribution: s.total }).projected_at_retirement)).toBeGreaterThanOrEqual(2_000_000);
  expect(Math.round(simulate({ ...PAT, annual_contribution: s.total - 500 }).projected_at_retirement)).toBeLessThan(2_000_000);
});

test('solving beats the formula: the closed-form annuity answer lands SHORT of the target', () => {
  // the defect this function exists to prevent — a sentence promising to reach a number it misses
  const { simulate } = require('../../retirement');
  const formulaish = 70_000;                               // any smooth-curve estimate under the solve
  expect(Math.round(simulate({ ...PAT, annual_contribution: formulaish }).projected_at_retirement)).toBeLessThan(2_000_000);
});

test('the gap breakdown explains itself — growth does nearly half the work', () => {
  const g = howTheGapCloses(PAT, 77_500);
  expect(g.putIn).toBe(542_500);
  // Q49 (2026-09-09): full precision inside — the blended return is no longer rounded to 4 places
  expect(g.growthOnExisting).toBeCloseTo(422_645, 0);
  expect(Math.round(g.growthOnNew)).toBe(134_308);
  expect(g.projectsTo).toBeCloseTo(2_008_606, 0);
  // the three parts plus what he already has equal the projection — nothing unexplained
  expect(909_152 + g.growthOnExisting + g.putIn + g.growthOnNew).toBe(g.projectsTo);
  // and growth is nearly half of the closing, which is why the sentence must say so
  expect((g.growthOnExisting + g.growthOnNew) / (g.projectsTo - 909_152)).toBeGreaterThan(0.45);
});

test('no target typed → no dial, no shortfall, no saving sentence — never a zero', () => {
  const p = planTarget(PAT);
  expect(p.targetPct).toBeNull();
  expect(p.shortOfTarget).toBeNull();
  expect(p.savingToTarget).toBeNull();
});
