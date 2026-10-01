// F1 — the secure-sync seam (FCC detailed design, functions row 'F1 secure sync seam + connection
// freshness'). ONE provider interface between the connect-flow UI and whatever vendor does the
// actual bank linking. The UI, the merge gate, the freshness rules, and every test run against
// this seam. The REAL provider is SnapTrade (design v2 2026-07-18): snaptradeClient.ts +
// snaptradeSync.ts + SnapTradeConnect — active whenever SNAPTRADE_RELAY_URL is configured.
// Until then `activeSyncProvider()` returns the sandbox in dev/test and null in production —
// and the UI says so honestly instead of pretending.

import { ageLabel, daysSince, isStale } from '../../domain/_shared/freshness';

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
  id: string;                                              // 'sandbox' | 'snaptrade'
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
/* ─ MK-XS-F-098 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * setSyncProviderForTesting
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     It records or announces something and returns no figure — no arithmetic of its own.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-098
 * Changed ..... 2026-07-14 (1990149)
 */
export function setSyncProviderForTesting(p: SyncProvider | null) { overrideProvider = p; }

/** The one lookup the UI uses. Production returns null until a real provider ships —
 *  the connect screen renders the honest not-yet state off that null, never a dead button. */
/* ─ MK-XS-F-099 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * activeSyncProvider
 *
 * Answers ..... The one lookup the UI uses.
 *
 * Formula .....
 *     override provider   when override provider ! = undefined
 *     new sandbox sync provider()   if typeof __DEV__ ! = 'undefined' and __DEV__
 *     nothing   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-099
 * Changed ..... 2026-07-14 (1990149)
 */
export function activeSyncProvider(): SyncProvider | null {
  if (overrideProvider !== undefined) return overrideProvider;
  // @ts-ignore -- __DEV__ is the RN global
  return typeof __DEV__ !== 'undefined' && __DEV__ ? new SandboxSyncProvider() : null;
}

// ── connection freshness (the F1 row's second half) ─────────────────────────
export interface ConnectionFreshness { label: string; stale: boolean; daysOld: number }
/** How old a connected account's last successful sync is. Stale after 3 days —
 *  a connected balance older than that must SAY so wherever it is shown. */
/* ─ MK-XS-F-100 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * connectionFreshness
 *
 * Answers ..... How old a connected account's last successful sync is.
 *
 * Formula .....
 *     days = days since(last synced, now)
 *     label = age label(last synced, now)
 *     nothing   when days = nothing (or label = nothing when missing or zero)
 *     the answer:
 *     label = label
 *     stale = is stale(last synced, now)
 *     days old = days
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-100
 * Changed ..... 2026-08-10 (e37d50e)
 */
export function connectionFreshness(lastSynced: string | null | undefined, now: number = Date.now()): ConnectionFreshness | null {
  // the threshold and the words come from the ONE freshness rule in src/domain/_shared/freshness.ts
  // (DEC-0301), so a connection, an account's source chip and the price cache cannot disagree about
  // what "old" means or say the same age two different ways
  const days = daysSince(lastSynced, now);
  const label = ageLabel(lastSynced, now);
  if (days == null || label == null) return null;
  return { label, stale: isStale(lastSynced, now), daysOld: days };
}

/** The approved consent copy — honest about where the data goes. We DO NOT say 'never leaves
 *  your device' (it flows through the provider's servers); we say what actually happens. */
export const CONSENT_COPY = [
  'You sign in on your bank’s own page — we never see or store your password.',
  'Your balances and transactions flow through the connection service’s servers to this app.',
  'The connection is read-only: nothing and no one can move your money through it.',
  // Founder ask 2026-07-19 (seen on a live E*TRADE connect): the broker's own consent page may
  // describe its data-sharing program broadly, including trading. Say the truth where the worry is.
  'Your brokerage’s page may mention trading access — MoneyKeel registers every connection read-only, and this app has no trading commands at all.',
  // Walk row 16 (founder decision 2026-07-28, audit Home·NW #17): ONE promise everywhere — the
  // user CHOOSES on disconnect. This sentence must match Settings' actual disconnect choices.
  'Disconnect any time in Settings — you choose: keep your numbers as a by-hand account, or delete the connection’s data.',
] as const;
