// The sync orchestrator (design v2 §3): connections → accounts → per-account holdings +
// activities → ingest → ONE store write. Called on app-open (daily-debounced — the Daily plan
// refreshes SnapTrade's side once a day, so more polling buys nothing) and right after a new
// connection. All rules that touch money live in ingest.ts and are pinned there.
import { snaptradeApi, usdCash, snaptradeConfigured } from './snaptradeClient';
import { ingestSync, type AccountSyncPayload } from './ingest';
import { useStore } from '../../store/useStore';
import type { StActivity } from './snaptrade';

const PAGE = 1000;
const MAX_PAGES = 20;                      // 20k rows — far beyond any personal account's history
const OVERLAP_DAYS = 7;                    // re-pull a week's overlap; dedupe makes it idempotent

export function shouldDailySync(lastSyncAt: string | null | undefined, now: number = Date.now()): boolean {
  if (!lastSyncAt) return true;
  const t = Date.parse(lastSyncAt);
  return Number.isNaN(t) || now - t > 20 * 3600_000;   // ~daily (20h so a morning open re-syncs)
}

async function allActivities(accountId: string, startDate?: string): Promise<StActivity[]> {
  const out: StActivity[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { activities } = await snaptradeApi.activities(accountId, { startDate, offset: page * PAGE });
    const batch = Array.isArray(activities) ? activities : [];
    out.push(...batch);
    if (batch.length < PAGE) break;
  }
  return out;
}

/** Full sync. Returns the number of accounts synced (0 = nothing connected). */
export async function runSnapTradeSync(opts: { force?: boolean } = {}): Promise<number> {
  if (!snaptradeConfigured()) return 0;
  const s = useStore.getState() as any;
  if (!opts.force && !shouldDailySync(s.snaptradeLastSyncAt)) return 0;

  const connections = await snaptradeApi.connections();
  const connMeta = (connections ?? []).map((c) => ({
    id: c.id,
    brokerage: c.brokerage?.name ?? 'your brokerage',
    disabled: !!c.disabled,
  }));
  if (!connMeta.length) {
    s.ingestSnapTradeSync?.({ accounts: s.assetAccounts, newTransactions: [], seenKeys: s.snaptradeSeenKeys ?? {}, needsWrapperConfirm: [] }, []);
    return 0;
  }

  const accounts = await snaptradeApi.accounts();
  // first-ever sync pulls full history; later syncs re-pull a small overlap window
  const startDate = s.snaptradeLastSyncAt
    ? new Date(Date.parse(s.snaptradeLastSyncAt) - OVERLAP_DAYS * 86400_000).toISOString().slice(0, 10)
    : undefined;

  const payloads: AccountSyncPayload[] = [];
  for (const account of accounts ?? []) {
    try {
      const h = await snaptradeApi.holdings(account.id);
      const activities = await allActivities(account.id, startDate);
      payloads.push({
        account,
        positions: h.positions ?? [],
        optionPositions: h.optionPositions ?? [],
        balancesCash: usdCash(h.balances),
        activities,
      });
    } catch (e) {
      // one broken account never sinks the sync — its prior data stays, freshness shows its age
      console.warn('snaptrade sync: account failed', account.id, (e as Error).message);
    }
  }

  const result = ingestSync(s.assetAccounts ?? [], s.snaptradeSeenKeys ?? {}, payloads);
  s.ingestSnapTradeSync?.(result, connMeta);
  return payloads.length;
}
