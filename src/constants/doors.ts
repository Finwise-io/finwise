// THE THREE WAYS IN — one wording, everywhere (one concept → one phrase). Home, Sharpen your plan
// and the three-questions screen all offer the same doors in the same words; before this they were
// re-typed per screen, which is how two screens end up promising slightly different things.
export const DOORS: { icon: string; title: string; sub: string; route: string }[] = [
  { icon: '🔗', title: 'Connect your bank ›', sub: 'Read-only: we can look, never touch your money.', route: '/connect' },
  { icon: '📄', title: 'Import a file from your brokerage ›', sub: 'The CSV export — we read your holdings, nothing is uploaded.', route: '/import-holdings' },
  { icon: '✍️', title: 'Add something by hand ›', sub: 'Your home, savings, or an account with no login.', route: '/add-account' },
];
