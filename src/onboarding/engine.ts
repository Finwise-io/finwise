// Adaptive onboarding engine — DATA-DRIVEN from docs/onboarding-data-matrix.md (v3).
// The flow is computed: steps = baseline ∪ (per selected service: must-have + optional fields,
// given life stage), service-ordered, de-duplicated, with a recap after each of S1–S4, then summary.

export type Status = 'employed' | 'retired' | 'partial' | 'student';

// Q2 service selections (tracks). Retirement/legacy/debt are stage-gated in Q2.
export type Track =
  | 'spend' | 'invest' | 'goals' | 'partner' | 'family'
  | 'retire_acc' | 'retire_dec' | 'legacy' | 'debt';

// Field/step ids. Meta steps + per-field question steps + recaps + summary.
export type StepId =
  // meta
  | 'status' | 'goals' | 'account' | 'name'
  // S1
  | 'income' | 'monthlySpending' | 'flexBuckets' | 'savingsRateTarget' | 'categoryBudgets' | 'bills'
  // S2 accumulation
  | 'birth' | 'currentRetirementSavings' | 'contributionsByType' | 'employerContribution'
  | 'targetRetirementAge' | 'expectedRetirementSpending'
  // S2 decumulation
  | 'currentSavingsPortfolio' | 'retirementIncomeSources' | 'horizonAge'
  // S2 optional
  | 'retLocation' | 'travelBudget' | 'medicalBudget' | 'spendingChangeLater'
  // S3
  | 'investObjective' | 'trackingLevel' | 'investmentHoldings' | 'investRefine'
  // S4
  | 'goals_detail' | 'monthlySavingsCapacity'
  // S5 / S6 / S7
  | 'hasPartner' | 'invitePartner' | 'dependentsCount' | 'debts' | 'legacyTarget'
  // recaps + end
  | 'recap_spend' | 'recap_retire' | 'recap_invest' | 'recap_goals' | 'summary';

export const STATUS_OPTIONS: { value: Status; icon: string; title: string; sub: string }[] = [
  { value: 'employed', icon: '🧑‍💼', title: 'Employed',           sub: 'Working a job' },
  { value: 'retired',  icon: '🌴',   title: 'Retired',            sub: 'No longer working' },
  { value: 'partial',  icon: '🕐',   title: 'Partially employed', sub: 'Part-time or semi-retired' },
  { value: 'student',  icon: '🎓',   title: 'Student',            sub: 'Studying' },
];

export function goalOptionsFor(status: Status | null): { value: Track; icon: string; title: string }[] {
  const core: { value: Track; icon: string; title: string }[] = [
    { value: 'spend',  icon: '📊', title: 'Track income & spending' },
    { value: 'invest', icon: '📈', title: 'Track my investments' },
    { value: 'goals',  icon: '🎯', title: 'Save for big purchases & goals' },
  ];
  const retire: { value: Track; icon: string; title: string }[] = [];
  if (status === 'employed' || status === 'partial' || status === 'student')
    retire.push({ value: 'retire_acc', icon: '🏖️', title: 'Plan for retirement / when can I retire' });
  if (status === 'retired' || status === 'partial')
    retire.push({ value: 'retire_dec', icon: '🛟', title: 'Make my money last' });
  if (status === 'retired')
    retire.push({ value: 'legacy', icon: '🎁', title: 'Leave a legacy / estate' });
  if (status === 'student')
    retire.push({ value: 'debt', icon: '🎓', title: 'Pay down student debt' });
  const manage: { value: Track; icon: string; title: string }[] = [
    { value: 'partner', icon: '👫',   title: 'Manage money with a partner' },
    { value: 'family',  icon: '👨‍👩‍👧', title: 'Manage money with family' },
  ];
  return [...core, ...retire, ...manage];
}

// Optional (skippable) field steps — rendered with a "Skip for now".
export const OPTIONAL_STEPS = new Set<StepId>([
  'flexBuckets', 'savingsRateTarget', 'categoryBudgets', 'bills',
  'retLocation', 'travelBudget', 'medicalBudget', 'spendingChangeLater',
  'investRefine', 'invitePartner',
]);

const RECAP_OF: Partial<Record<Track, StepId>> = {
  spend: 'recap_spend',
  retire_acc: 'recap_retire',
  retire_dec: 'recap_retire',
  invest: 'recap_invest',
  goals: 'recap_goals',
};

// Service order for emission (so recaps land in a sensible sequence).
const SERVICE_ORDER: Track[] = [
  'spend', 'retire_acc', 'retire_dec', 'invest', 'goals', 'debt', 'legacy', 'partner', 'family',
];

// Per-service field requirements, given life stage + the full track set (for reuse logic).
function requirements(track: Track, _status: Status | null, tracks: Track[]): { must: StepId[]; optional: StepId[] } {
  const hasSpend = tracks.includes('spend');
  switch (track) {
    case 'spend':
      return { must: ['income', 'monthlySpending'],
               optional: ['flexBuckets', 'savingsRateTarget', 'categoryBudgets', 'bills'] };
    case 'retire_acc':
      // No income needed: contributions + spending are captured directly.
      return { must: ['birth', 'currentRetirementSavings', 'contributionsByType', 'employerContribution',
                      'targetRetirementAge', 'expectedRetirementSpending'],
               optional: ['retLocation', 'travelBudget', 'medicalBudget', 'spendingChangeLater'] };
    case 'retire_dec':
      // Retirement income sources ARE the income here.
      return { must: ['birth', 'currentSavingsPortfolio', 'retirementIncomeSources', 'monthlySpending', 'horizonAge'],
               optional: ['retLocation', 'travelBudget', 'medicalBudget', 'spendingChangeLater'] };
    case 'invest':
      // No income / retirement / spending.
      return { must: ['investObjective', 'trackingLevel', 'investmentHoldings'], optional: ['investRefine'] };
    case 'goals':
      return { must: hasSpend ? ['goals_detail'] : ['goals_detail', 'monthlySavingsCapacity'], optional: [] };
    case 'partner':
      return { must: ['hasPartner', 'income'], optional: ['invitePartner'] };
    case 'family':
      return { must: ['dependentsCount', 'income'], optional: [] };
    case 'debt':
      return { must: hasSpend ? ['debts'] : ['debts', 'monthlySavingsCapacity'], optional: [] };
    case 'legacy':
      return { must: ['legacyTarget'], optional: [] };
  }
}

export function buildSteps(status: Status | null, tracks: Track[]): StepId[] {
  const steps: StepId[] = ['status', 'goals', 'account', 'name'];
  const seen = new Set<StepId>(steps);

  for (const track of SERVICE_ORDER) {
    if (!tracks.includes(track)) continue;
    const { must, optional } = requirements(track, status, tracks);
    for (const f of [...must, ...optional]) {
      if (!seen.has(f)) { seen.add(f); steps.push(f); }
    }
    const recap = RECAP_OF[track];
    if (recap && !seen.has(recap)) { seen.add(recap); steps.push(recap); }
  }

  steps.push('summary');
  return steps;
}

export function isOptional(step: StepId): boolean {
  return OPTIONAL_STEPS.has(step);
}
