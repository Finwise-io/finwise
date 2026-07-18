// The app-side SnapTrade client (design v2 §1): every call goes to OUR relay function — the app
// never holds SnapTrade keys and never talks to SnapTrade directly. The relay verifies the
// Firebase ID token and acts only for this signed-in user.
import Constants from 'expo-constants';
import { currentIdToken } from '../firebase';
import type { StAccount, StActivity, StOptionHolding, StPosition } from './snaptrade';

export function relayUrl(): string | null {
  return (
    (Constants.expoConfig?.extra as any)?.SNAPTRADE_RELAY_URL ||
    process.env.SNAPTRADE_RELAY_URL ||
    null
  );
}
export const snaptradeConfigured = () => !!relayUrl();

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

export const snaptradeApi = {
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
export function usdCash(balances: HoldingsPayload['balances'] | null | undefined): number {
  return (balances ?? [])
    .filter((b) => !b.currency?.code || b.currency.code === 'USD')
    .reduce((t, b) => t + (b.cash ?? 0), 0);
}
