// Adaptive onboarding engine — see docs/onboarding-flow-design.md (v2 life-stage-first).
// buildSteps(status, tracks) returns the ordered, gated list of step IDs.

export type Status = 'employed' | 'retired' | 'partial' | 'student';

export type Track =
  | 'spend' | 'invest' | 'goals' | 'partner' | 'family'
  | 'retire_acc' | 'retire_dec' | 'legacy' | 'debt';

export type StepId =
  | 'status' | 'goals' | 'account' | 'name' | 'birth' | 'marital' | 'dependents'
  | 'income' | 'other_income' | 'savings'
  | 'ret_location' | 'ret_spend_change' | 'ret_addons' | 'ret_age' | 'ret_horizon'
  | 'spending' | 'goals_detail' | 'debt' | 'partner_invite' | 'summary';

export const STATUS_OPTIONS: { value: Status; icon: string; title: string; sub: string }[] = [
  { value: 'employed', icon: '🧑‍💼', title: 'Employed',            sub: 'Working a job' },
  { value: 'retired',  icon: '🌴',   title: 'Retired',             sub: 'No longer working' },
  { value: 'partial',  icon: '🕐',   title: 'Partially employed',  sub: 'Part-time or semi-retired' },
  { value: 'student',  icon: '🎓',   title: 'Student',             sub: 'Studying' },
];

// Q2 goal options, filtered by life stage.
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

export function buildSteps(status: Status | null, tracks: Track[]): StepId[] {
  const has = (t: Track) => tracks.includes(t);
  const retireAcc = has('retire_acc');
  const retireDec = has('retire_dec');
  const retire = retireAcc || retireDec;
  const household = has('partner') || has('family');

  const steps: StepId[] = ['status', 'goals', 'account', 'name'];

  if (retire) steps.push('birth');
  if (retire || household) steps.push('marital');
  if (has('family')) steps.push('dependents');

  // Income (the component renders status-specific content: job / retirement sources / light)
  const needsIncome = has('spend') || retire || household || status !== 'student';
  if (needsIncome) {
    steps.push('income');
    steps.push('other_income');
  }

  if (retire || has('invest')) steps.push('savings');

  if (retire) {
    steps.push('ret_location', 'ret_spend_change', 'ret_addons');
    steps.push(retireDec && !retireAcc ? 'ret_horizon' : 'ret_age');
  }

  if (has('spend') || retire) steps.push('spending');
  if (has('goals')) steps.push('goals_detail');
  if (has('debt')) steps.push('debt');
  if (has('partner')) steps.push('partner_invite');

  steps.push('summary');
  return steps;
}
