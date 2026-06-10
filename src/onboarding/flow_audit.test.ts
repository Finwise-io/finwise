// Exhaustive onboarding-flow audit (Tier 1). buildSteps() is pure, so we enumerate EVERY
// persona × track-subset (powerset) × income-source-subset (powerset, incl. empty = "not yet
// answered" and the retired legacy no-answer variant) and check each generated flow against the
// scorecard rules — far faster + more complete than manual sim. Render-case + validator coverage
// are extracted from modules.tsx source text (the node test env can't import the RN component
// module). Rule violations are collected in ONE pass and asserted per-rule below.
//
// Source-subset space: the full powerset is ~850k flows (~50s). Default = none + every singleton +
// every pair + all (~150k flows, catches all single- and pairwise-source interactions); run with
// FLOW_AUDIT=full for the exhaustive sweep.
import fs from 'fs';
import path from 'path';
import {
  buildSteps, goalOptionsFor, incomeSourceOptionsFor, OPTIONAL_STEPS,
  type Status, type Track, type StepId, type IncomeSourceKey,
} from './engine';

const STATUSES: Status[] = ['employed', 'retired', 'partial', 'student'];
const META: StepId[] = ['status', 'goals', 'account', 'name'];
const META_SET = new Set<string>([...META, 'summary']);
const RECAPS = new Set<string>(['recap_income', 'recap_spend', 'recap_retire', 'recap_invest', 'recap_goals']);

const src = fs.readFileSync(path.join(__dirname, 'modules.tsx'), 'utf8');
const RENDER_CASES = new Set([...src.matchAll(/case '([a-zA-Z0-9_]+)':/g)].map((m) => m[1]));
const VALIDATORS = new Set([...src.matchAll(/^\s*([a-zA-Z0-9_]+): a =>/gm)].map((m) => m[1]));

// ——— scorecard budgets ("not too long") ———
// Question screens = everything the user must look at except meta (status/goals/account/name/summary)
// and recaps. Required = questions without a "Skip for now".
const MAX_REQUIRED_QUESTIONS = 19;  // hard ceiling — worst legal flow today; ratchet DOWN, never up
const MAX_TOTAL_QUESTIONS = 36;     // incl. optional/skippable — worst today; ratchet down

// Semantic-duplicate groups — at most ONE of each should ever appear in a single flow.
const DUP_GROUPS: Record<string, StepId[]> = {
  'retirement income': ['income_retirement', 'retirementIncomeSources'],
};
// Steps that should never be emitted any more (dead/placeholder).
const DEAD: StepId[] = ['investRefine'];

// Income-detail step each source gates ON (presence required when the income block ran with sources).
const SOURCE_STEP: Record<IncomeSourceKey, StepId> = {
  employment: 'income_salary', self_employment: 'income_self', investment_income: 'income_investment',
  rental: 'income_rental', benefits: 'income_benefits', support: 'income_support',
  scholarship: 'income_scholarship', loans: 'income_loans', retirement_income: 'retirementIncomeSources',
  other_income: 'income_other',
};
// Steps whose ONLY producer is its income source (absence required when source not picked).
// retirementIncomeSources excluded (also produced by retire_dec / retired-legacy);
// income_401k excluded (also produced by retire_acc).
const SOURCE_ONLY: [IncomeSourceKey, StepId][] = [
  ['employment', 'income_salary'], ['self_employment', 'income_self'],
  ['investment_income', 'income_investment'], ['rental', 'income_rental'],
  ['benefits', 'income_benefits'], ['support', 'income_support'],
  ['scholarship', 'income_scholarship'], ['loans', 'income_loans'], ['other_income', 'income_other'],
];
const TAXABLE: Set<IncomeSourceKey> = new Set(['employment', 'self_employment', 'investment_income', 'rental', 'retirement_income', 'other_income']);
const INCOME_BEARING: Track[] = ['spend', 'partner', 'family'];  // tracks that embed the income block
// Questions another track may legitimately ABSORB (the fact is computed, not lost):
// retire_dec absorbs the invest total; spend absorbs savings capacity (income − spending).
const ABSORBED = new Set<string>(['investmentHoldings', 'monthlySavingsCapacity']);

// Per-track required steps (completeness).
const NEED: Partial<Record<Track, StepId[]>> = {
  spend: ['monthlySpending'],
  retire_dec: ['birth', 'currentSavingsPortfolio', 'retirementIncomeSources', 'monthlySpending', 'horizonAge'],
  retire_acc: ['birth', 'currentRetirementSavings', 'income_401k', 'contributionsByType', 'targetRetirementAge', 'expectedRetirementSpending'],
  invest: ['investObjective', 'trackingLevel'],
  goals: ['goals_detail'],
  debt: ['debts'],
  legacy: ['legacyTarget'],
  partner: ['hasPartner'],
  family: ['dependentsCount'],
  networth: ['networthIntro'],
  property: ['networthIntro'],
};

// Recap → the section steps it summarizes; a recap must appear AFTER at least one of them.
const RECAP_SECTION: Record<string, StepId[]> = {
  recap_income: ['income_sources', 'income_salary', 'income_401k', 'income_bonus', 'income_rsu', 'income_self',
    'income_investment', 'income_rental', 'income_benefits', 'income_support', 'income_scholarship',
    'income_loans', 'income_retirement', 'income_other', 'income_tax', 'retirementIncomeSources'],
  recap_spend: ['monthlySpending', 'flexBuckets', 'savingsRateTarget'],
  recap_retire: ['currentRetirementSavings', 'contributionsByType', 'targetRetirementAge',
    'expectedRetirementSpending', 'currentSavingsPortfolio', 'retirementIncomeSources', 'horizonAge'],
  recap_invest: ['investObjective', 'trackingLevel', 'investmentHoldings'],
  recap_goals: ['goals_detail', 'monthlySavingsCapacity'],
};

function powerset<T>(arr: T[]): T[][] {
  return arr.reduce<T[][]>((acc, x) => acc.concat(acc.map((s) => [...s, x])), [[]]);
}
const FULL = process.env.FLOW_AUDIT === 'full';
// none + singletons + pairs + all — every single- and pairwise-source interaction.
function sourceSubsets<T>(arr: T[]): T[][] {
  if (FULL) return powerset(arr);
  const out: T[][] = [[], arr];
  for (let i = 0; i < arr.length; i++) {
    out.push([arr[i]]);
    for (let j = i + 1; j < arr.length; j++) out.push([arr[i], arr[j]]);
  }
  return out;
}
// FNV-1a — cheap sequence fingerprint for the unique-flow count (report only).
function fnv(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

interface Audit {
  flows: number;
  uniqueSeqs: number;
  violations: Record<string, { count: number; examples: string[] }>;
  maxRequired: Record<string, number>;
  maxTotal: Record<string, number>;
  longest: { label: string; required: number; total: number }[];
}

let cached: Audit | null = null;
function audit(): Audit {
  if (cached) return cached;
  const violations: Record<string, { count: number; examples: string[] }> = {};
  const add = (rule: string, msg: string) => {
    const v = (violations[rule] ??= { count: 0, examples: [] });
    v.count++;
    if (v.examples.length < 8 && !v.examples.includes(msg)) v.examples.push(msg);
  };

  let flows = 0;
  const seqHashes = new Set<number>();
  const maxRequired: Record<string, number> = {};
  const maxTotal: Record<string, number> = {};
  let longest: { label: string; required: number; total: number }[] = [];
  // step-sets for the {no sources, all sources} slices — reused by the monotonicity pass
  const monoSets = new Map<string, Set<string>>();

  for (const status of STATUSES) {
    const tracks = goalOptionsFor(status).map((o) => o.value);
    const sources = incomeSourceOptionsFor(status).map((o) => o.value);
    const trackSubsets = powerset(tracks).filter((s) => s.length > 0);
    // answer variants: source subsets + (retired only) the legacy "never asked" variant
    const variants: { key: string; srcs: IncomeSourceKey[] | null; ans: Record<string, any> }[] =
      sourceSubsets(sources).map((s) => ({ key: s.join('+') || 'none', srcs: s, ans: { incomeSources: s } }));
    if (status === 'retired') variants.push({ key: 'legacy', srcs: null, ans: {} });
    const allKey = sources.join('+');

    for (const v of variants) {
      // leakage reference: union of every single-track flow under these answers
      const singleUnion = new Set<string>(META_SET);
      for (const t of tracks) for (const s of buildSteps(status, [t], v.ans)) singleUnion.add(s);

      for (const subset of trackSubsets) {
        const steps = buildSteps(status, subset, v.ans);
        flows++;
        seqHashes.add(fnv(status + '|' + steps.join(',')));
        const stepSet = new Set<string>(steps);
        const idx = new Map<string, number>();
        steps.forEach((s, i) => { if (!idx.has(s)) idx.set(s, i); });
        const label = `[${status}] tracks{${subset.join(',')}} src{${v.key}}`;

        if (v.key === 'none' || v.key === allKey) monoSets.set(`${status}|${subset.join(',')}|${v.key}`, stepSet);

        // — structure —
        if (stepSet.size !== steps.length) add('exact duplicates', label);
        for (const s of steps) if (!META_SET.has(s) && !RENDER_CASES.has(s)) add('no render case', `'${s}'`);
        for (const s of steps)
          if (!META_SET.has(s) && !RECAPS.has(s) && !OPTIONAL_STEPS.has(s as StepId) && !VALIDATORS.has(s))
            add('required step without validator', `'${s}'`);
        for (const d of DEAD) if (stepSet.has(d)) add('dead step emitted', `'${d}' in ${label}`);
        for (const [name, group] of Object.entries(DUP_GROUPS)) {
          const hits = group.filter((g) => stepSet.has(g));
          if (hits.length > 1) add('semantic duplicate', `"${name}" asked twice (${hits.join(' + ')}) in ${label}`);
        }
        META.forEach((m, i) => { if (steps[i] !== m) add('meta header order', label); });
        if (steps[steps.length - 1] !== 'summary') add('summary not last', label);

        // — persona fit —
        if (status === 'retired' && stepSet.has('savingsRateTarget')) add('retiree gets savings-rate', label);

        // — ordering —
        const before = (a: StepId, b: StepId, why: string) => {
          if (stepSet.has(a) && stepSet.has(b) && idx.get(a)! > idx.get(b)!) add(`ordering: ${why}`, label);
        };
        before('birth', 'retirementIncomeSources', 'birth before retirement income');
        before('birth', 'income_401k', 'birth before 401(k) (limits are age-based)');
        if (stepSet.has('income_sources'))
          for (const s of Object.values(SOURCE_STEP).concat(['income_tax', 'income_401k', 'income_bonus', 'income_rsu']))
            before('income_sources', s as StepId, 'source picker before income details');
        if (stepSet.has('recap_income'))
          for (const s of RECAP_SECTION.recap_income) {
            if (s === 'retirementIncomeSources') continue;  // retire_dec re-asks nothing; its copy may legitimately follow
            // 401k contributed by retire_acc (no employment income) belongs to the retirement section
            if (s === 'income_401k' && !v.srcs?.includes('employment')) continue;
            before(s as StepId, 'recap_income', 'income details before income recap');
          }

        // — recap placement: never summarize a section that asked nothing —
        for (const r of RECAPS) {
          if (!stepSet.has(r)) continue;
          const members = RECAP_SECTION[r].filter((s) => stepSet.has(s));
          if (!members.length) add('empty recap', `${r} with no section steps in ${label}`);
          else if (Math.min(...members.map((s) => idx.get(s)!)) > idx.get(r)!)
            add('recap before its section', `${r} in ${label}`);
        }

        // — completeness: each selected track contributes its required steps —
        for (const t of subset) for (const need of (NEED[t] ?? []))
          if (!stepSet.has(need)) add('track missing required step', `'${t}' missing '${need}' in ${label}`);
        if (subset.includes('invest') && !subset.includes('retire_dec') && !stepSet.has('investmentHoldings'))
          add('track missing required step', `'invest' missing 'investmentHoldings' in ${label}`);

        // — source gating (only meaningful when the source-driven income block ran) —
        if (stepSet.has('income_sources') && v.srcs && v.srcs.length) {
          for (const s of v.srcs) {
            if (!stepSet.has(SOURCE_STEP[s])) add('selected source asks nothing', `'${s}' → no '${SOURCE_STEP[s]}' in ${label}`);
          }
          if (v.srcs.includes('employment'))
            for (const s of ['birth', 'income_401k', 'income_bonus', 'income_rsu'] as StepId[])
              if (!stepSet.has(s)) add('employment extras missing', `'${s}' in ${label}`);
          if (v.srcs.includes('retirement_income') && !stepSet.has('birth'))
            add('retirement income without age', label);
          for (const [s, step] of SOURCE_ONLY)
            if (!v.srcs.includes(s) && stepSet.has(step)) add('unselected source asked', `'${step}' without '${s}' in ${label}`);
          const taxable = v.srcs.some((s) => TAXABLE.has(s));
          if (taxable !== stepSet.has('income_tax')) add('tax screen gating', `taxable=${taxable} but income_tax ${stepSet.has('income_tax') ? 'shown' : 'missing'} in ${label}`);
          if (!stepSet.has('recap_income')) add('income asked but never recapped', label);
        }
        // transient "sources not yet picked" state: picker only, no details
        if (stepSet.has('income_sources') && v.srcs && !v.srcs.length) {
          for (const [, step] of SOURCE_ONLY) if (stepSet.has(step)) add('income detail before sources picked', `'${step}' in ${label}`);
        }
        // no income-bearing track and not retired-legacy → no income picker at all
        if (!subset.some((t) => INCOME_BEARING.includes(t)) && stepSet.has('income_sources'))
          add('income picker without income-bearing track', label);

        // — relevance / leakage: every step attributable to baseline or a selected track —
        for (const s of steps) if (!singleUnion.has(s)) add('step leaks from unselected track', `'${s}' in ${label}`);

        // — length budget —
        const qs = steps.filter((s) => !META_SET.has(s) && !RECAPS.has(s));
        const req = qs.filter((s) => !OPTIONAL_STEPS.has(s as StepId));
        maxRequired[status] = Math.max(maxRequired[status] ?? 0, req.length);
        maxTotal[status] = Math.max(maxTotal[status] ?? 0, qs.length);
        if (req.length > MAX_REQUIRED_QUESTIONS) add('over required-question budget', `${req.length} required in ${label}`);
        if (qs.length > MAX_TOTAL_QUESTIONS) add('over total-question budget', `${qs.length} questions in ${label}`);
        if (longest.length < 5 || req.length > longest[longest.length - 1].required) {
          longest.push({ label, required: req.length, total: qs.length });
          longest = longest.sort((a, b) => b.required - a.required).slice(0, 5);
        }
      }
    }

    // — monotonicity: adding a goal never REMOVES a question (checked on the none/all source slices) —
    for (const key of ['none', allKey]) {
      for (const subset of trackSubsets) {
        const base = monoSets.get(`${status}|${subset.join(',')}|${key}`)!;
        for (const t of tracks) {
          if (subset.includes(t)) continue;
          const grown = [...subset, t].sort((a, b) => tracks.indexOf(a) - tracks.indexOf(b));
          const sup = monoSets.get(`${status}|${grown.join(',')}|${key}`);
          if (!sup) continue;
          for (const s of base) if (!sup.has(s) && !ABSORBED.has(s))
            add('adding a goal removed a question', `'${s}' lost adding '${t}' to {${subset.join(',')}} [${status}] src{${key}}`);
        }
      }
    }
    monoSets.clear();
  }

  cached = { flows, uniqueSeqs: seqHashes.size, violations, maxRequired, maxTotal, longest };
  return cached;
}

const expectClean = (rule: string) => {
  const v = audit().violations[rule];
  expect(v ? { rule, count: v.count, examples: v.examples } : null).toBeNull();
};

describe('onboarding flow audit — every persona × track-subset × source-subset', () => {
  test(`enumerates a large flow space (${FULL ? 'full ~850k' : 'default ~150k'})`, () => {
    expect(audit().flows).toBeGreaterThan(FULL ? 800_000 : 100_000);
  });

  // structure
  test('every emitted step has a render case (no blank screens)', () => expectClean('no render case'));
  test('every required step has a validator', () => expectClean('required step without validator'));
  test('no exact-duplicate steps in any flow', () => expectClean('exact duplicates'));
  test('no semantic duplicates (same fact asked twice)', () => expectClean('semantic duplicate'));
  test('no dead/placeholder steps are emitted', () => expectClean('dead step emitted'));
  test('meta header order + summary last', () => { expectClean('meta header order'); expectClean('summary not last'); });

  // persona fit + ordering
  test('retirees never get the savings-rate step', () => expectClean('retiree gets savings-rate'));
  test('birth precedes retirement income', () => expectClean('ordering: birth before retirement income'));
  test('birth precedes 401(k)', () => expectClean('ordering: birth before 401(k) (limits are age-based)'));
  test('source picker precedes income details', () => expectClean('ordering: source picker before income details'));
  test('income details precede the income recap', () => expectClean('ordering: income details before income recap'));

  // recaps
  test('no empty recaps; recaps follow their section', () => {
    expectClean('empty recap'); expectClean('recap before its section');
  });

  // completeness + relevance
  test('each selected track contributes its required steps', () => expectClean('track missing required step'));
  test('no step leaks in from an unselected track', () => expectClean('step leaks from unselected track'));
  test('adding a goal never removes a question (monotonic)', () => expectClean('adding a goal removed a question'));

  // source gating
  test('every selected income source is asked about', () => expectClean('selected source asks nothing'));
  test('employment brings birth + 401k/bonus/RSU extras', () => expectClean('employment extras missing'));
  test('retirement income always asks age first', () => expectClean('retirement income without age'));
  test('no income screen for an unselected source', () => expectClean('unselected source asked'));
  test('tax screen iff a taxable source is selected', () => expectClean('tax screen gating'));
  test('income, once asked, is always recapped', () => expectClean('income asked but never recapped'));
  test('no income details before sources are picked', () => expectClean('income detail before sources picked'));
  test('no income picker without an income-bearing goal', () => expectClean('income picker without income-bearing track'));

  // length budget
  test(`no flow exceeds ${MAX_REQUIRED_QUESTIONS} required questions`, () => expectClean('over required-question budget'));
  test(`no flow exceeds ${MAX_TOTAL_QUESTIONS} total questions`, () => expectClean('over total-question budget'));

  // REPORT (never fails) — coverage + length distribution for review.
  test('REPORT — coverage + length', () => {
    const a = audit();
    console.log(`\n  Flows audited: ${a.flows.toLocaleString()} | unique step sequences: ${a.uniqueSeqs.toLocaleString()}`);
    console.log('  max REQUIRED questions per persona:', a.maxRequired);
    console.log('  max TOTAL questions per persona:   ', a.maxTotal);
    console.log('  longest flows (by required):');
    for (const l of a.longest) console.log(`    ${l.required} req / ${l.total} total — ${l.label}`);
    expect(true).toBe(true);
  });
});
