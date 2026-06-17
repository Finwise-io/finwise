// Adaptive onboarding engine — DATA-DRIVEN from docs/onboarding-data-matrix.md (v3).
// The flow is computed: steps = baseline ∪ (per selected service: must-have + optional fields,
// given life stage), service-ordered, de-duplicated, with a recap after each of S1–S4, then summary.

export type Status = 'employed' | 'retired' | 'partial' | 'student';

// Q2 service selections (tracks). Retirement/legacy/debt are stage-gated in Q2.
export type Track =
  | 'spend' | 'invest' | 'goals' | 'partner' | 'family'
  | 'retire_acc' | 'retire_dec' | 'legacy' | 'debt' | 'networth' | 'property';

// Field/step ids. Meta steps + per-field question steps + recaps + summary.
export type StepId =
  // meta
  | 'status' | 'goals' | 'account' | 'verifyEmail' | 'name'
  // S1 — income captured as focused, one-type-per-screen sub-steps
  | 'income_sources' | 'income_salary' | 'income_401k' | 'income_bonus' | 'income_rsu' | 'income_rental' | 'income_tax'
  | 'income_self' | 'income_investment' | 'income_benefits' | 'income_support' | 'income_scholarship' | 'income_loans' | 'income_other'
  | 'monthlySpending' | 'flexBuckets' | 'savingsRateTarget'
  // S2 accumulation
  | 'birth' | 'currentRetirementSavings' | 'contributionsByType' | 'employerContribution'
  | 'targetRetirementAge' | 'expectedRetirementSpending'
  // S2 decumulation
  | 'currentSavingsPortfolio' | 'retirementIncomeSources' | 'horizonAge'
  // S2 optional
  | 'retLocation' | 'travelBudget' | 'medicalBudget' | 'spendingChangeLater'
  // S3
  | 'investObjective' | 'trackingLevel' | 'investmentHoldings'
  | 'networthIntro'
  // S4
  | 'goals_detail' | 'monthlySavingsCapacity'
  // S5 / S6 / S7
  | 'hasPartner' | 'invitePartner' | 'dependentsCount' | 'debts' | 'legacyTarget'
  // recaps + end
  | 'recap_income' | 'recap_spend' | 'recap_retire' | 'recap_invest' | 'recap_goals' | 'recap_debt' | 'summary';

export const STATUS_OPTIONS: { value: Status; icon: string; title: string; sub: string }[] = [
  { value: 'employed', icon: '🧑‍💼', title: 'Employed',           sub: 'Working a job' },
  { value: 'retired',  icon: '🌴',   title: 'Retired',            sub: 'No longer working' },
  { value: 'partial',  icon: '🕐',   title: 'Partially employed', sub: 'Part-time or semi-retired' },
  { value: 'student',  icon: '🎓',   title: 'Student',            sub: 'Studying' },
];

export interface GoalOption { value: Track; icon: string; title: string; sub: string }
export interface GoalGroup { title: string; items: GoalOption[] }

// Plain-language option labels + a one-line scope hint each.
const GOAL_DEF: Record<Track, GoalOption> = {
  spend:      { value: 'spend',      icon: '📊', title: 'Track income & spending', sub: 'See what comes in and where it goes' },
  debt:       { value: 'debt',       icon: '💳', title: 'Pay off my debt',          sub: 'A plan to clear what you owe' },
  goals:      { value: 'goals',      icon: '🎯', title: 'Save for travel, big purchases & goals', sub: 'Set targets and track progress' },
  invest:     { value: 'invest',     icon: '📈', title: 'Track my investments',     sub: 'Stocks, funds, bonds, crypto — vs the market' },
  property:   { value: 'property',   icon: '🏠', title: 'Track my property & belongings', sub: 'Home, car, valuables' },
  networth:   { value: 'networth',   icon: '🧮', title: 'See my net worth',         sub: 'Everything you own minus what you owe' },
  retire_acc: { value: 'retire_acc', icon: '🏖️', title: 'Plan for retirement',      sub: 'Are you on track — and when can you retire?' },
  retire_dec: { value: 'retire_dec', icon: '🛟', title: 'Make my money last',        sub: 'Will your savings last through retirement?' },
  legacy:     { value: 'legacy',     icon: '🎁', title: 'Leave money to family or a cause', sub: 'Plan what you pass on' },
  partner:    { value: 'partner',    icon: '👫',   title: 'Plan with a partner',     sub: 'Manage money together' },
  family:     { value: 'family',     icon: '👨‍👩‍👧', title: 'Plan with family',        sub: 'Dependents and family finances' },
};

// Which life stages each option is offered to (others are offered to everyone).
const STAGE_ONLY: Partial<Record<Track, Status[]>> = {
  retire_acc: ['employed', 'partial', 'student'],
  retire_dec: ['retired', 'partial'],
  legacy: ['retired'],
};
function validFor(track: Track, status: Status | null): boolean {
  const only = STAGE_ONLY[track];
  return !only || (status != null && only.includes(status));
}

// Themed sections; their order flexes by life stage (most relevant first).
const SECTION_ITEMS: Record<string, Track[]> = {
  'Manage money now': ['spend', 'goals', 'debt'],
  'Grow & track':     ['invest', 'property', 'networth'],
  'Plan ahead':       ['retire_acc', 'retire_dec', 'legacy'],
  'With others':      ['partner', 'family'],
};
const SECTION_ORDER: Record<Status, string[]> = {
  student:  ['Manage money now', 'Grow & track', 'Plan ahead', 'With others'],
  employed: ['Manage money now', 'Plan ahead', 'Grow & track', 'With others'],
  partial:  ['Manage money now', 'Plan ahead', 'Grow & track', 'With others'],
  retired:  ['Plan ahead', 'Grow & track', 'Manage money now', 'With others'],
};

/** Grouped, stage-ordered goal sections (headers + selectable items) for the goals screen. */
export function goalGroupsFor(status: Status | null): GoalGroup[] {
  const order = SECTION_ORDER[status ?? 'employed'];
  return order
    .map((title) => ({ title, items: SECTION_ITEMS[title].filter((t) => validFor(t, status)).map((t) => GOAL_DEF[t]) }))
    .filter((g) => g.items.length > 0);
}

/** Flat list of valid options for a stage (used for validation / filtering). */
export function goalOptionsFor(status: Status | null): GoalOption[] {
  return goalGroupsFor(status).flatMap((g) => g.items);
}

// Q "Where does your money come from?" — income sources the user can pick (multi-select). The chosen
// sources decide which income detail screens appear. Ordered by relevance to life stage.
export type IncomeSourceKey =
  | 'employment' | 'self_employment' | 'investment_income' | 'rental'
  | 'retirement_income' | 'benefits' | 'support' | 'scholarship' | 'loans' | 'other_income';

export function incomeSourceOptionsFor(status: Status | null): { value: IncomeSourceKey; icon: string; title: string; sub: string }[] {
  const O: Record<IncomeSourceKey, { value: IncomeSourceKey; icon: string; title: string; sub: string }> = {
    employment:        { value: 'employment',        icon: '💼', title: 'A job (wages or salary)',     sub: 'Paycheck from an employer' },
    self_employment:   { value: 'self_employment',   icon: '🧰', title: 'Self-employed / side gig',     sub: 'Freelance, consulting, a small business' },
    scholarship:       { value: 'scholarship',       icon: '🎓', title: 'Scholarships, grants, stipend', sub: 'Money for school or research' },
    loans:             { value: 'loans',             icon: '🏦', title: 'Student loans',               sub: 'Money you borrow now and repay later' },
    benefits:          { value: 'benefits',          icon: '🛟', title: 'Benefits',                     sub: 'SNAP, TANF, disability, unemployment, housing help' },
    support:           { value: 'support',           icon: '👪', title: 'Child support or alimony',     sub: 'Support payments you receive' },
    investment_income: { value: 'investment_income', icon: '💵', title: 'Interest & dividends',         sub: 'Money your savings or investments pay you' },
    rental:            { value: 'rental',            icon: '🏠', title: 'Rent from a property',         sub: 'You rent out a place you own' },
    retirement_income: { value: 'retirement_income', icon: '🏖️', title: 'Retirement income',            sub: 'Social Security, pension, 401(k)/IRA withdrawals' },
    other_income:      { value: 'other_income',      icon: '🧾', title: 'Something else',               sub: 'Gifts, a one-off payment, anything else' },
  };
  const ORDER: Record<Status, IncomeSourceKey[]> = {
    student:  ['employment', 'scholarship', 'loans', 'self_employment', 'support', 'benefits', 'investment_income', 'other_income'],
    employed: ['employment', 'self_employment', 'investment_income', 'rental', 'benefits', 'support', 'loans', 'other_income'],
    partial:  ['employment', 'self_employment', 'retirement_income', 'benefits', 'investment_income', 'rental', 'support', 'loans', 'other_income'],
    retired:  ['retirement_income', 'investment_income', 'rental', 'benefits', 'support', 'other_income'],
  };
  return (status ? ORDER[status] : ORDER.employed).map((k) => O[k]);
}

// Which selected sources are taxable (drive whether we show the tax screen + count toward the tax base).
const TAXABLE_SOURCES: IncomeSourceKey[] = ['employment', 'self_employment', 'investment_income', 'rental', 'retirement_income', 'other_income'];

// Optional (skippable) field steps — rendered with a "Skip for now".
export const OPTIONAL_STEPS = new Set<StepId>([
  'income_401k', 'employerContribution', 'income_bonus', 'income_rsu', 'income_rental',  // income extras — skippable
  // per-source detail steps: you picked the source, but you can still skip if it turns out to be
  // nothing (e.g. "I selected loans but don't actually have any") — never trap the user.
  'income_self', 'income_investment', 'income_benefits', 'income_support',
  'income_scholarship', 'income_loans', 'income_other',
  'flexBuckets', 'savingsRateTarget',
  'retLocation', 'travelBudget', 'medicalBudget', 'spendingChangeLater',
  'invitePartner', 'networthIntro', 'verifyEmail',   // soft — app works unverified; Settings has a nudge
]);

// Income captured as a focused, one-type-per-screen sub-flow, ending in a recap.
// Retired users instead give their retirement-income sources directly.
function incomeBlock(status: Status | null, answers?: Record<string, any>): StepId[] {
  if (status === 'retired' && !answers?.incomeSources) return ['birth', 'retirementIncomeSources'];  // legacy retired flow
  const srcs: IncomeSourceKey[] = Array.isArray(answers?.incomeSources) ? answers!.incomeSources : [];
  if (!srcs.length) return ['income_sources'];   // pick sources first; details appear once chosen
  const out: StepId[] = ['income_sources'];
  // Age drives RMDs + life-expectancy planning — ask before retirement income so its insights can use it.
  if (status === 'retired' || srcs.includes('retirement_income')) out.push('birth');
  // Retirement income is the retiree's PRIMARY income — ask it first (before dividends/other). Uses the
  // SAME rich screen as the decumulation track (retirementIncomeSources), so it's asked ONCE (deduped).
  if (srcs.includes('retirement_income')) out.push('retirementIncomeSources');
  if (srcs.includes('employment')) {
    // birth first: the 401(k) limit depends on age. Gaps/seasonal work = $0 months in salaryByMonth.
    // Employer match gets its own focused screen right after the contribution.
    out.push('income_salary', 'birth', 'income_401k', 'employerContribution', 'income_bonus', 'income_rsu');
  }
  if (srcs.includes('self_employment')) out.push('income_self');
  if (srcs.includes('investment_income')) out.push('income_investment');
  if (srcs.includes('rental')) out.push('income_rental');
  if (srcs.includes('benefits')) out.push('income_benefits');
  if (srcs.includes('support')) out.push('income_support');
  if (srcs.includes('scholarship')) out.push('income_scholarship');
  if (srcs.includes('loans')) out.push('income_loans');
  if (srcs.includes('other_income')) out.push('income_other');
  // "other" counts as taxable unless the user marked it a gift (gifts aren't taxable to the recipient)
  const taxablePicked = srcs.some((s) =>
    TAXABLE_SOURCES.includes(s) && !(s === 'other_income' && answers?.otherTaxable === 'no'));
  if (taxablePicked) out.push('income_tax');
  out.push('recap_income');
  return out;
}

const RECAP_OF: Partial<Record<Track, StepId>> = {
  spend: 'recap_spend',
  retire_acc: 'recap_retire',
  retire_dec: 'recap_retire',
  invest: 'recap_invest',
  goals: 'recap_goals',
  debt: 'recap_debt',
};

// Service order for emission (so recaps land in a sensible sequence).
const SERVICE_ORDER: Track[] = [
  'spend', 'retire_acc', 'retire_dec', 'invest', 'property', 'networth', 'goals', 'debt', 'legacy', 'partner', 'family',
];

// Per-service field requirements, given life stage + the full track set (for reuse logic).
// Income is NOT listed here — buildSteps hoists the income block for income-bearing tracks.
function requirements(track: Track, status: Status | null, tracks: Track[]): { must: StepId[]; optional: StepId[] } {
  const hasSpend = tracks.includes('spend');
  const decumulating = status === 'retired';
  switch (track) {
    case 'spend':
      // A retiree is drawing down, not saving — drop the savings-rate target for them.
      // With retire_acc selected, the combined contributions screen ABSORBS the savings view
      // (month-by-month savable + where it goes), so the standalone savings screen is skipped.
      return { must: ['monthlySpending'],
               optional: decumulating || tracks.includes('retire_acc')
                 ? ['flexBuckets'] : ['flexBuckets', 'savingsRateTarget'] };
    case 'retire_acc':
      // 401(k) contribution then its match on a dedicated screen (deduped if income flow also present).
      return { must: ['birth', 'currentRetirementSavings', 'income_401k', 'employerContribution', 'contributionsByType',
                      'targetRetirementAge', 'expectedRetirementSpending'],
               optional: ['retLocation', 'travelBudget', 'medicalBudget', 'spendingChangeLater'] };
    case 'retire_dec':
      // Retirement income sources ARE the income here.
      return { must: ['birth', 'currentSavingsPortfolio', 'retirementIncomeSources', 'monthlySpending', 'horizonAge'],
               optional: ['retLocation', 'travelBudget', 'medicalBudget', 'spendingChangeLater'] };
    case 'invest': {
      // If the decumulation track already asks "your savings & investments" (the same total pool),
      // don't ask the investable total again here.
      const totalAlreadyAsked = tracks.includes('retire_dec');
      return { must: totalAlreadyAsked ? ['investObjective', 'trackingLevel']
                                       : ['investObjective', 'trackingLevel', 'investmentHoldings'],
               optional: [] };
    }
    case 'goals':
      return { must: hasSpend ? ['goals_detail'] : ['goals_detail', 'monthlySavingsCapacity'], optional: [] };
    case 'partner':
      return { must: ['hasPartner'], optional: ['invitePartner'] };
    case 'family':
      return { must: ['dependentsCount'], optional: [] };
    case 'debt':
      return { must: hasSpend ? ['debts'] : ['debts', 'monthlySavingsCapacity'], optional: [] };
    case 'legacy':
      return { must: ['legacyTarget'], optional: [] };
    case 'networth':
      return { must: ['networthIntro'], optional: [] };   // hand-off — net worth is built in-app from accounts + debts
    case 'property':
      return { must: ['networthIntro'], optional: [] };   // hand-off — home/car/valuables are added in the assets module
  }
}

// Tracks that embed the income block (S1). Income is hoisted to the front for these so the
// source picker always precedes any income-adjacent question (e.g. retire_acc's 401k screen) —
// otherwise its position would depend on which selected track happens to carry it.
const INCOME_BEARING: Track[] = ['spend', 'partner', 'family'];

export function buildSteps(status: Status | null, tracks: Track[], answers?: Record<string, any>): StepId[] {
  const steps: StepId[] = ['status', 'goals', 'account', 'verifyEmail', 'name'];
  const seen = new Set<StepId>(steps);

  const emit = (f: StepId) => { if (!seen.has(f)) { seen.add(f); steps.push(f); } };

  // Household context FIRST — "who earns this income?" on the salary screen only makes
  // sense after we've asked whether a partner is in the picture.
  if (tracks.includes('partner')) emit('hasPartner');
  if (tracks.includes('family')) emit('dependentsCount');

  if (tracks.some((t) => INCOME_BEARING.includes(t))) {
    for (const f of incomeBlock(status, answers)) emit(f);
  }

  for (const track of SERVICE_ORDER) {
    if (!tracks.includes(track)) continue;
    const { must, optional } = requirements(track, status, tracks);
    for (const f of [...must, ...optional]) emit(f);
    const recap = RECAP_OF[track];
    // Both retirement tracks share one recap — hold it until AFTER the second track's
    // questions, so the payoff covers the whole retirement picture.
    if (recap === 'recap_retire' && track === 'retire_acc' && tracks.includes('retire_dec')) continue;
    if (recap) emit(recap);
  }

  steps.push('summary');
  return steps;
}

export function isOptional(step: StepId): boolean {
  return OPTIONAL_STEPS.has(step);
}
