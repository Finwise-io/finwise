// Per-broker coverage for the connect flow's HONESTY CARD (design v2 §2.2, founder-approved).
// SnapTrade exposes NO API for this matrix — only coarse up/down flags — so this table is curated
// from their official support matrix (support.snaptrade.com/brokerages) and dated. When SnapTrade's
// runtime /brokerages flags say maintenance_mode or is_degraded, the UI adds a temporary warning
// ON TOP of this card. Review this table whenever the broker list changes.
export const COVERAGE_AS_OF = '2026-07-18';

export type BrokerTier = 'ga' | 'alpha' | 'gated' | 'unsupported';
export interface BrokerCoverage {
  slug: string;              // SnapTrade broker slug (portal preselect + runtime flag lookup)
  name: string;
  tier: BrokerTier;
  shares: string[];          // plain-English: what a connection brings in
  cantShare: string[];       // plain-English: what it can NOT bring in
  caveat?: string;           // one honest line shown bold on the card
  txnDepth: string;          // how far activity history goes back
}

export const BROKER_COVERAGE: BrokerCoverage[] = [
  { slug: 'SCHWAB', name: 'Charles Schwab', tier: 'ga',
    shares: ['balances', 'stocks, ETFs and mutual funds', 'options', 'about 2 years of activity'],
    cantShare: ['bonds and fixed income'], txnDepth: 'about 2 years' },
  { slug: 'VANGUARD', name: 'Vanguard', tier: 'ga',
    shares: ['balances', 'stocks, ETFs and mutual funds', 'activity since the account opened'],
    cantShare: ['bonds and fixed income', 'options'],
    caveat: 'This connection needs re-linking every few days — Vanguard signs in with a password, not a lasting link.',
    txnDepth: 'since the account opened' },
  { slug: 'CHASE', name: 'Chase / J.P. Morgan', tier: 'ga',
    shares: ['balances', 'stocks, ETFs and mutual funds', 'about 2 years of activity'],
    cantShare: ['bonds and fixed income', 'options'], txnDepth: 'about 2 years' },
  { slug: 'ETRADE', name: 'E*TRADE', tier: 'ga',
    shares: ['balances', 'stocks and ETFs', 'options', 'purchase history (tax lots)', 'about 2 years of activity'],
    cantShare: ['bonds and fixed income', 'mutual funds'], txnDepth: 'about 2 years' },
  { slug: 'ROBINHOOD', name: 'Robinhood', tier: 'ga',
    shares: ['balances', 'stocks, ETFs and crypto', 'options', 'purchase history (tax lots)', 'activity since the account opened'],
    cantShare: ['bonds and fixed income'], txnDepth: 'since the account opened' },
  { slug: 'PUBLIC', name: 'Public', tier: 'ga',
    shares: ['balances', 'stocks, ETFs and crypto', 'bonds and fixed income', 'options', 'mutual funds', 'activity since the account opened'],
    cantShare: [], txnDepth: 'since the account opened' },
  { slug: 'WEBULL', name: 'Webull', tier: 'ga',
    shares: ['balances', 'stocks and ETFs', 'options', 'trades from about 2 years'],
    cantShare: ['bonds and fixed income', 'dividend and transfer history'],
    caveat: 'Webull shares trades only — dividends and transfers will not appear.', txnDepth: 'about 2 years, trades only' },
  { slug: 'EMPOWER', name: 'Empower', tier: 'ga',
    shares: ['balances', 'mutual-fund holdings'],
    cantShare: ['any transaction history', 'stocks, bonds, options detail'],
    caveat: 'Empower shares holdings only — no activity history comes through.', txnDepth: 'none' },
  { slug: 'WELLS_FARGO', name: 'Wells Fargo', tier: 'ga',
    shares: ['balances', 'stock holdings'],
    cantShare: ['funds, bonds and options detail', 'reliable activity history'],
    caveat: 'Wells Fargo shares stock holdings only.', txnDepth: 'not stated by the connection service' },
  { slug: 'TIAA', name: 'TIAA', tier: 'alpha',
    shares: ['balances', 'stocks, ETFs and mutual funds', 'about 2 years of activity'],
    cantShare: ['bonds and fixed income', 'options'],
    caveat: 'Early access — this connection may drop and need re-linking.', txnDepth: 'about 2 years' },
  { slug: 'EDWARD_JONES', name: 'Edward Jones', tier: 'alpha',
    shares: ['balances', 'stocks, ETFs and mutual funds', 'about 18 months of activity'],
    cantShare: ['bonds and fixed income', 'options'],
    caveat: 'Early access — this connection may drop and need re-linking.', txnDepth: 'about 18 months' },
  { slug: 'TRANSAMERICA', name: 'Transamerica', tier: 'alpha',
    shares: ['balances', 'stocks and ETFs', 'about 2 years of activity'],
    cantShare: ['funds, bonds and options detail'],
    caveat: 'Early access — this connection may drop and need re-linking.', txnDepth: 'about 2 years' },
  { slug: 'FIDELITY', name: 'Fidelity', tier: 'gated',
    shares: ['balances', 'stocks, ETFs and mutual funds', 'bonds and fixed income', 'options', 'purchase history (tax lots)', 'about 2 years of activity', '401(k) NetBenefits accounts'],
    cantShare: [],
    caveat: 'Coming soon — our connection service is reviewing our access application.', txnDepth: 'about 2 years' },
];

/** Institutions people will look for that NO connection can reach — shown honestly in the picker. */
export const UNSUPPORTED_INSTITUTIONS: { name: string; why: string }[] = [
  { name: 'Merrill / Bank of America', why: 'not yet reachable by our connection service' },
  { name: 'Principal', why: '401(k) plans there aren’t connectable yet' },
  { name: 'Voya', why: '401(k) plans there aren’t connectable yet' },
  { name: 'John Hancock', why: '401(k) plans there aren’t connectable yet' },
];
export const UNSUPPORTED_FALLBACK = 'Add it by hand or import a CSV — everything still counts toward your picture.';

export function coverageFor(slugOrName: string): BrokerCoverage | undefined {
  const q = slugOrName.trim().toLowerCase();
  return BROKER_COVERAGE.find((b) => b.slug.toLowerCase() === q || b.name.toLowerCase().includes(q));
}
