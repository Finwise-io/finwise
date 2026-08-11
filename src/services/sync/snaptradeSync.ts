// The sync orchestrator (design v2 §3): connections → accounts → per-account holdings +
// activities → ingest → ONE store write. Called on app-open (daily-debounced — the Daily plan
// refreshes SnapTrade's side once a day, so more polling buys nothing) and right after a new
// connection. All rules that touch money live in ingest.ts and are pinned there.
import { snaptradeApi, usdCash, snaptradeConfigured } from './snaptradeClient';
import type { AccountSyncPayload } from './ingest';
import { stAssetId } from './ingest';
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

// SnapTrade wraps this endpoint in a pagination envelope {data, pagination:{total}} — LIVE-VERIFIED
// 2026-07-19 against a real E*TRADE connection (their docs' examples show a bare array; production
// does not). Accept both shapes so neither side of a rollout can silently produce an empty ledger.
function unwrapActivities(raw: unknown): { batch: StActivity[]; total: number | null } {
  if (Array.isArray(raw)) return { batch: raw, total: null };
  const data = (raw as { data?: unknown } | null | undefined)?.data;
  const total = (raw as { pagination?: { total?: number } } | null | undefined)?.pagination?.total;
  return { batch: Array.isArray(data) ? (data as StActivity[]) : [], total: typeof total === 'number' ? total : null };
}

async function allActivities(accountId: string, startDate?: string): Promise<StActivity[]> {
  const out: StActivity[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { activities } = await snaptradeApi.activities(accountId, { startDate, offset: page * PAGE });
    const { batch, total } = unwrapActivities(activities);
    out.push(...batch);
    if (total != null ? out.length >= total : batch.length < PAGE) break;
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
    s.ingestSnapTradeSync?.([], []);
    return 0;
  }

  const accounts = await snaptradeApi.accounts();
  // PER-ACCOUNT cursor (audit fix): full history until the broker reports the initial transaction
  // sync COMPLETE — a slow first sync can never be permanently skipped. After that, re-pull with a
  // small overlap window; the dedupe registry makes overlaps free.
  const cursors: Record<string, string> = { ...(s.snaptradeActivityCursor ?? {}) };

  const payloads: AccountSyncPayload[] = [];
  // accounts we could NOT reach this run — recorded, never swallowed (founder finding 2026-08-11)
  const failed: { accountId: string; at: string; reason?: string }[] = [];
  const nowIso = new Date().toISOString();
  for (const account of accounts ?? []) {
    try {
      const h = await snaptradeApi.holdings(account.id);
      const initialDone = account.sync_status?.transactions?.initial_sync_completed === true;
      // SELF-HEAL (build-43 finding #3): Build 43's envelope bug ingested ZERO activity rows but
      // still advanced the cursor — trusting that cursor would fetch one week and silently orphan
      // the whole history. A cursor is only believable if this account actually HAS ledger rows;
      // otherwise start over from the full history. Dedupe makes the re-pull free.
      const accountRowId = ((s.assetAccounts ?? []) as any[]).find((a) => a.snaptrade_account_id === account.id)?.asset_id ?? `st-${account.id}`;
      const hasLedgerRows = ((s.transactions ?? []) as any[]).some((t) => t.source === 'connected' && t.account_id === accountRowId);
      const cursor = hasLedgerRows ? cursors[account.id] : undefined;
      if (!hasLedgerRows) delete cursors[account.id];
      const startDate = cursor
        ? new Date(Date.parse(cursor) - OVERLAP_DAYS * 86400_000).toISOString().slice(0, 10)
        : undefined;                                   // no cursor (or none believable) → full history
      const activities = await allActivities(account.id, startDate);
      payloads.push({
        account,
        positions: h.positions ?? [],
        optionPositions: h.optionPositions ?? [],
        balancesCash: usdCash(h.balances),
        activities,
      });
      if (initialDone) cursors[account.id] = new Date().toISOString();   // advance ONLY once the broker says complete
    } catch (e) {
      // one broken account never sinks the sync — its prior data stays, freshness shows its age.
      // Founder finding 2026-08-11: swallowing it here was why a dead connection and a healthy idle
      // one looked identical on screen. The failure is now RECORDED against the account so the
      // missing-data banner can say "we couldn't reach it" and offer Reconnect, instead of leaving
      // the person to guess from a date that never moves.
      failed.push({ accountId: stAssetId(account.id), at: nowIso, reason: (e as Error).message?.slice(0, 200) });
      console.warn('snaptrade sync: account failed', account.id, (e as Error).message);
    }
  }

  s.ingestSnapTradeSync?.(payloads, connMeta);
  s.setSnaptradeActivityCursor?.(cursors);
  s.setSyncFailures?.(failed);   // empty array CLEARS them — a fixed connection stops complaining
  return payloads.length;
}
