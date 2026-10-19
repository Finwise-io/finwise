// The app-side SnapTrade client (design v2 §1): every call goes to OUR relay function — the app
// never holds SnapTrade keys and never talks to SnapTrade directly. The relay verifies the
// Firebase ID token and acts only for this signed-in user.
import Constants from 'expo-constants';
import { currentIdToken } from '../firebase';
import type { StAccount, StActivity, StOptionHolding, StPosition } from './snaptrade';

/* ─ MK-XS-F-112 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * relayUrl
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     the answer = the relay address from the app config, else from the environment, else nothing
 *
 * Called by ... MK-XS-F-113 snaptradeConfigured · MK-XS-F-147 call
 *
 * Reaches ..... 220 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-NW-F-078 ONE
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               … and 202 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-112
 * Changed ..... 2026-07-18 (0dc9061)
 */
export function relayUrl(): string | null {
  return (
    (Constants.expoConfig?.extra as any)?.SNAPTRADE_RELAY_URL ||
    process.env.SNAPTRADE_RELAY_URL ||
    null
  );
}
/* ─ MK-XS-F-113 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * snaptradeConfigured
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     !!relay url()
 *
 * Called by ... MK-XS-F-116 runSnapTradeSync
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-116 runSnapTradeSync
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-113
 * Changed ..... 2026-07-18 (0dc9061)
 */
export const snaptradeConfigured = () => !!relayUrl();

/* ─ MK-XS-F-147 ──────────────────────────────────────────────────────────── 4 · BRINGS DATA IN
 * call
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     url = relay url()
 *     token = await current id token()
 *     data = await res.json().catch(() => nothing)
 *     the answer = data as T
 *
 * Called by ... MK-PL-F-043 howTheGapCloses · MK-ST-F-010 nameEvidence
 *               MK-XS-F-014 classifyHolding
 *
 * Reaches ..... 217 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-NW-F-078 ONE
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               … and 199 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-147
 * Changed ..... not in git yet (—)
 */
async function call<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const url = relayUrl();
  if (!url) throw new Error('Connections need the relay. Set SNAPTRADE_RELAY_URL (see functions/snaptrade.js).');
  const token = await currentIdToken();
  if (!token) throw new Error('Sign in to connect accounts.');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...params }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data as any)?.error || `Connection service error (${res.status})`);
  return data as T;
}

export interface StConnection { id: string; disabled?: boolean; brokerage?: { name?: string; slug?: string } }
export interface HoldingsPayload { positions: StPosition[]; optionPositions: StOptionHolding[]; balances: { cash?: number | null; currency?: { code?: string } }[] }

export interface BrokerRuntimeFlag { slug: string; name: string; enabled: boolean; maintenance: boolean; degraded: boolean }
export const snaptradeApi = {
  brokerages: () => call<BrokerRuntimeFlag[]>('brokerages'),
  status: () => call<{ registered: boolean; connections: number }>('status'),
  loginUrl: (opts: { broker?: string; reconnect?: string; customRedirect?: string } = {}) =>
    call<{ redirectURI: string | null }>('loginUrl', opts),
  connections: () => call<StConnection[]>('connections'),
  accounts: (connectionId?: string) => call<StAccount[]>('accounts', connectionId ? { connectionId } : {}),
  holdings: (accountId: string) => call<HoldingsPayload>('holdings', { accountId }),
  activities: (accountId: string, opts: { startDate?: string; endDate?: string; offset?: number } = {}) =>
    call<{ activities: StActivity[] }>('activities', { accountId, ...opts }),
  disconnect: (connectionId: string) => call<{ ok: true }>('disconnect', { connectionId }),
  deleteUser: () => call<{ ok: true }>('deleteUser'),
};

/** USD cash across the balances list (v1 is USD-only; other currencies are ignored, not guessed). */
/* ─ MK-XS-F-114 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * usdCash
 *
 * Answers ..... USD cash across the balances list (v1 is USD-only; other currencies are ignored, not guessed).
 *
 * Formula .....
 *     the answer = Σ over balances in USD (or with no currency) of (cash, or 0)
 *
 * Called by ... MK-XS-F-116 runSnapTradeSync
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-116 runSnapTradeSync
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · If cash is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-114
 * Changed ..... 2026-07-18 (0dc9061)
 */
export function usdCash(balances: HoldingsPayload['balances'] | null | undefined): number {
  return (balances ?? [])
    .filter((b) => !b.currency?.code || b.currency.code === 'USD')
    .reduce((t, b) => t + (b.cash ?? 0), 0);
}
