// THE THREE WAYS IN — one wording, everywhere (one concept → one phrase). Home, Sharpen your plan
// and the three-questions screen all offer the same doors in the same words; before this they were
// re-typed per screen, which is how two screens end up promising slightly different things.
/** THE EMPTY-STATE DOORS — founder ruling Q48 (2026-09-09), mock approved 2026-09-12: a figure with
 *  nothing behind it shows $0, then one line — "Nothing entered yet." — and the door to the thing to
 *  add. One wording per thing, everywhere. A door that opens a sheet on its own screen passes onPress. */
export const EMPTY_DOORS = {
  accounts:   { label: 'Add your accounts ›',   route: '/add-account' },
  debts:      { label: 'Add your debts ›',      route: '/(tabs)/analytics' },
  income:     { label: 'Add your income ›',     route: '/income-manager' },
  expenses:   { label: 'Log your expenses ›',   route: '/(tabs)/budget' },
  bills:      { label: 'Add your bills ›',      route: '/bill-calendar' },
  plan:       { label: 'Set up your plan ›',    route: '/(tabs)/plan' },
  goal:       { label: 'Add a goal ›',          route: '/(tabs)/goals' },
  bigCost:    { label: 'Add a big cost ›',      route: '/big-costs' },
  holding:    { label: 'Add a holding ›',       route: '/add-account' },
  bond:       { label: 'Add a bond ›',          route: '/bonds' },
  investment: { label: 'Add an investment ›',   route: '/other-investments' },
} as const;
export type EmptyDoor = keyof typeof EMPTY_DOORS;

export const DOORS: { icon: string; title: string; sub: string; route: string }[] = [
  { icon: '🔗', title: 'Connect your bank ›', sub: 'Read-only: we can look, never touch your money.', route: '/connect' },
  { icon: '📄', title: 'Import a file from your brokerage ›', sub: 'The CSV export — we read your holdings, nothing is uploaded.', route: '/import-holdings' },
  { icon: '✍️', title: 'Add something by hand ›', sub: 'Your home, savings, or an account with no login.', route: '/add-account' },
];
