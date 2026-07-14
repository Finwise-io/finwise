// F1 — the secure-sync seam (FCC detailed design, engines row 'F1 secure sync seam + connection
// freshness'). ONE provider interface between the connect-flow UI and whatever vendor does the
// actual bank linking. The UI, the merge gate, the freshness rules, and every test run against
// this seam; the real Plaid provider is ONE file implementing it (plus the vendor SDK + keys —
// a founder-approved dependency, batched with the native-build step, like the Tiingo key).
// Until then `activeSyncProvider()` returns the sandbox in dev/test and null in production —
// and the UI says so honestly instead of pretending.

export interface FoundAccount {
  external_id: string;            // the provider's stable id for the account
  name: string;                   // 'Chase Premier Checking'
  institution: string;            // 'Chase'
  kind: string;                   // our ASSET_KINDS id ('checking' | 'savings' | 'brokerage' | '401k' | ...)
  tax_bucket: 'CASH' | 'TAXABLE' | 'PRE_TAX' | 'ROTH';
  balance: number;
  mask?: string;                  // '••4821' — how banks disambiguate accounts
}

export interface SyncProvider {
  id: string;                                              // 'sandbox' | 'plaid'
  displayName: string;                                     // shown in the consent copy
  searchInstitutions(query: string): Promise<string[]>;    // names only — the picker's data
  /** Runs the provider's own sign-in for the institution and returns the accounts it found.
   *  Never sees or stores our user's credentials — that is the whole point of the handoff. */
  linkAccounts(institution: string): Promise<FoundAccount[]>;
}

const TOP_INSTITUTIONS = [
  'Chase', 'Bank of America', 'Wells Fargo', 'Citi', 'Capital One', 'US Bank',
  'Fidelity', 'Charles Schwab', 'Vanguard', 'E*TRADE', 'Merrill', 'Ally',
];

/** Deterministic sandbox: real flow, fake bank. Two accounts per institution, stable ids. */
export class SandboxSyncProvider implements SyncProvider {
  id = 'sandbox';
  displayName = 'the sandbox (no real bank is contacted)';
  async searchInstitutions(query: string): Promise<string[]> {
    const q = query.trim().toLowerCase();
    return q ? TOP_INSTITUTIONS.filter((n) => n.toLowerCase().includes(q)) : TOP_INSTITUTIONS;
  }
  async linkAccounts(institution: string): Promise<FoundAccount[]> {
    const inst = institution.trim() || 'Sandbox Bank';
    return [
      { external_id: `${inst}-chk`, name: `${inst} Checking`, institution: inst, kind: 'checking', tax_bucket: 'CASH', balance: 4211.35, mask: '••4821' },
      { external_id: `${inst}-brk`, name: `${inst} Brokerage`, institution: inst, kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 68240.1, mask: '••9034' },
    ];
  }
}

let overrideProvider: SyncProvider | null | undefined;   // tests inject here
export function setSyncProviderForTesting(p: SyncProvider | null) { overrideProvider = p; }

/** The one lookup the UI uses. Production returns null until a real provider ships —
 *  the connect screen renders the honest not-yet state off that null, never a dead button. */
export function activeSyncProvider(): SyncProvider | null {
  if (overrideProvider !== undefined) return overrideProvider;
  // @ts-ignore -- __DEV__ is the RN global
  return typeof __DEV__ !== 'undefined' && __DEV__ ? new SandboxSyncProvider() : null;
}

// ── connection freshness (the F1 row's second half) ─────────────────────────
export interface ConnectionFreshness { label: string; stale: boolean; daysOld: number }
/** How old a connected account's last successful sync is. Stale after 3 days —
 *  a connected balance older than that must SAY so wherever it is shown. */
export function connectionFreshness(lastSynced: string | null | undefined, now: number = Date.now()): ConnectionFreshness | null {
  if (!lastSynced) return null;
  const t = Date.parse(lastSynced);
  if (Number.isNaN(t)) return null;
  const days = Math.max(0, Math.floor((now - t) / 86400000));
  if (days === 0) return { label: 'updated today', stale: false, daysOld: 0 };
  if (days === 1) return { label: 'updated yesterday', stale: false, daysOld: 1 };
  return { label: `${days} days old`, stale: days > 3, daysOld: days };
}

/** The approved consent copy — honest about where the data goes. We DO NOT say 'never leaves
 *  your device' (it flows through the provider's servers); we say what actually happens. */
export const CONSENT_COPY = [
  'You sign in on your bank’s own page — we never see or store your password.',
  'Your balances and transactions flow through the connection service’s servers to this app.',
  'The connection is read-only: nothing and no one can move your money through it.',
  'You can disconnect any time in Settings, and we delete the connection’s data with it.',
] as const;
