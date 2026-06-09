// Exhaustive onboarding-flow audit. buildSteps() is pure, so we enumerate EVERY persona × track-subset
// (powerset) × {no sources, all sources} and check each generated flow against the scorecard rules —
// far faster + more complete than manual sim. Render-case + validator coverage are extracted from
// modules.tsx source text (the node test env can't import the RN component module).
import fs from 'fs';
import path from 'path';
import { buildSteps, goalOptionsFor, incomeSourceOptionsFor, OPTIONAL_STEPS, type Status, type Track, type StepId } from './engine';

const STATUSES: Status[] = ['employed', 'retired', 'partial', 'student'];
const META = new Set<string>(['status', 'goals', 'account', 'name', 'summary']);
const RECAPS = new Set<string>(['recap_income', 'recap_spend', 'recap_retire', 'recap_invest', 'recap_goals']);

const src = fs.readFileSync(path.join(__dirname, 'modules.tsx'), 'utf8');
const RENDER_CASES = new Set([...src.matchAll(/case '([a-zA-Z0-9_]+)':/g)].map((m) => m[1]));
const VALIDATORS = new Set([...src.matchAll(/^\s*([a-zA-Z0-9_]+): a =>/gm)].map((m) => m[1]));

// Semantic-duplicate groups — at most ONE of each should ever appear in a single flow.
const DUP_GROUPS: Record<string, StepId[]> = {
  'retirement income': ['income_retirement', 'retirementIncomeSources'],
};
// Steps that should never be emitted any more (dead/placeholder).
const DEAD: StepId[] = ['investRefine'];

function powerset<T>(arr: T[]): T[][] {
  return arr.reduce<T[][]>((acc, x) => acc.concat(acc.map((s) => [...s, x])), [[]]);
}

interface Flow { status: Status; label: string; tracks: Track[]; steps: StepId[] }
function allFlows(): Flow[] {
  const flows: Flow[] = [];
  for (const status of STATUSES) {
    const tracks = goalOptionsFor(status).map((o) => o.value);
    const sources = incomeSourceOptionsFor(status).map((o) => o.value);
    for (const subset of powerset(tracks)) {
      if (!subset.length) continue;
      for (const [sLabel, ans] of [['no-src', {}], ['all-src', { incomeSources: sources }]] as const) {
        flows.push({ status, label: `[${status}] {${subset.join(',')}} ${sLabel}`, tracks: subset,
          steps: buildSteps(status, subset, ans) });
      }
    }
  }
  return flows;
}

const FLOWS = allFlows();

describe('onboarding flow audit — every persona × track-subset × sources', () => {
  test(`enumerated a lot of flows (coverage)`, () => {
    expect(FLOWS.length).toBeGreaterThan(2000);
  });

  test('every emitted step has a render case (no blank screens)', () => {
    const bad: string[] = [];
    for (const f of FLOWS) for (const s of f.steps)
      if (!META.has(s) && !RENDER_CASES.has(s)) bad.push(`${f.label}: '${s}' has no render case`);
    expect([...new Set(bad)]).toEqual([]);
  });

  test('every required (non-optional, non-recap, non-meta) step has a validator', () => {
    const bad: string[] = [];
    for (const f of FLOWS) for (const s of f.steps)
      if (!META.has(s) && !RECAPS.has(s) && !OPTIONAL_STEPS.has(s) && !VALIDATORS.has(s))
        bad.push(`'${s}' is required in ${f.label} but has no validator`);
    expect([...new Set(bad)]).toEqual([]);
  });

  test('no exact-duplicate steps in any flow', () => {
    const bad = FLOWS.filter((f) => new Set(f.steps).size !== f.steps.length).map((f) => f.label);
    expect(bad).toEqual([]);
  });

  test('no SEMANTIC duplicates (same fact asked twice)', () => {
    const bad: string[] = [];
    for (const f of FLOWS) for (const [name, group] of Object.entries(DUP_GROUPS)) {
      const hits = group.filter((g) => f.steps.includes(g));
      if (hits.length > 1) bad.push(`${f.label}: asks "${name}" twice (${hits.join(' + ')})`);
    }
    expect([...new Set(bad.map((b) => b.replace(/\{[^}]*\}/, '{…}')))]).toEqual([]);
  });

  test('no dead/placeholder steps are emitted', () => {
    const bad: string[] = [];
    for (const f of FLOWS) for (const d of DEAD) if (f.steps.includes(d)) bad.push(`${f.label}: emits dead step '${d}'`);
    expect([...new Set(bad.map((b) => b.replace(/\{[^}]*\}/, '{…}')))]).toEqual([]);
  });

  test('persona fit: retirees never get the savings-rate step', () => {
    const bad = FLOWS.filter((f) => f.status === 'retired' && f.steps.includes('savingsRateTarget')).map((f) => f.label);
    expect(bad).toEqual([]);
  });

  test('ordering: birth precedes retirement income when both present', () => {
    const bad: string[] = [];
    for (const f of FLOWS) {
      const b = f.steps.indexOf('birth'), r = f.steps.indexOf('retirementIncomeSources');
      if (b >= 0 && r >= 0 && b > r) bad.push(f.label);
    }
    expect([...new Set(bad.map((x) => x.replace(/\{[^}]*\}/, '{…}')))]).toEqual([]);
  });

  // SOFT report (does not fail) — surfaces curation nits + per-persona coverage for review.
  test('REPORT — coverage + soft warnings', () => {
    const longest: Record<string, number> = {};
    for (const f of FLOWS) longest[f.status] = Math.max(longest[f.status] ?? 0, f.steps.length);
    console.log('\n  Flows audited:', FLOWS.length, '| longest flow per persona:', longest);
    // overlapping "how much have you saved" totals (accumulation vs decumulation vs invest)
    const TOTALS: StepId[] = ['currentRetirementSavings', 'currentSavingsPortfolio', 'investmentHoldings'];
    const overlaps = new Set<string>();
    for (const f of FLOWS) {
      const hits = TOTALS.filter((t) => f.steps.includes(t));
      if (hits.length > 1) overlaps.add(`${f.status}: ${hits.join(' + ')}`);
    }
    if (overlaps.size) console.log('  ⚠️  asset-total overlaps to review:', [...overlaps]);
    expect(true).toBe(true);
  });

  test('completeness: each track contributes its required steps', () => {
    const NEED: Partial<Record<Track, StepId[]>> = {
      spend: ['monthlySpending'],
      retire_dec: ['birth', 'currentSavingsPortfolio', 'retirementIncomeSources', 'horizonAge'],
      retire_acc: ['birth', 'currentRetirementSavings', 'targetRetirementAge', 'expectedRetirementSpending'],
      invest: ['investObjective', 'trackingLevel'],
      goals: ['goals_detail'],
      debt: ['debts'],
      legacy: ['legacyTarget'],
    };
    const bad: string[] = [];
    for (const f of FLOWS) for (const t of f.tracks) for (const need of (NEED[t] ?? []))
      if (!f.steps.includes(need)) bad.push(`${f.label}: track '${t}' missing '${need}'`);
    expect([...new Set(bad.map((b) => b.replace(/\{[^}]*\}/, '{…}')))]).toEqual([]);
  });
});
