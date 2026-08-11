// DATA GAPS — the ONE engine behind the missing-data banner and its fix-it sheet
// (founder-approved final mocks, mockup-vf/networth-FINAL + performance-FINAL, 2026-08-04).
//
// The founder's rule, in their words: a standing disclaimer is useless — say nothing when the
// numbers are complete, and speak up ONLY when a promised calculation is missing an input, naming
// the exact gap. So this engine answers one question: which promised numbers on this screen are
// incomplete right now? Zero gaps → no banner at all.
//
// Each gap carries: what's missing (title), what the app is honestly doing meanwhile (meanwhile),
// and the button that lands on the exact cure (fixLabel + route) — never a generic settings page.
import type { AssetAccount } from '../assets';
import { historyCoverage, accountDisplayNames } from '../assets';

export type GapKind = 'no-price' | 'stale-account' | 'unreachable-account' | 'no-activity' | 'stale-value' | 'history-depth';

export interface DataGap {
  kind: GapKind;
  title: string;        // what is missing, in plain words
  meanwhile: string;    // what we are doing instead — never a vague hedge
  fixLabel: string;     // the button that cures it
  route: string;        // where that button lands (the exact field, not a settings page)
  accountId?: string;
  /** What the button DOES. 'sync' runs the sync in place (a button that says "Sync now" must sync,
   *  founder finding 2026-08-11); 'reconnect' opens the connection flow; absent = plain navigation. */
  action?: 'sync' | 'reconnect';
}

const STALE_SYNC_DAYS = 3;
const STALE_VALUE_DAYS = 365;
const daysBetween = (iso: string | null | undefined, now: number): number | null => {
  if (!iso) return null;
  const t = Date.parse(String(iso));
  return Number.isNaN(t) ? null : Math.max(0, Math.floor((now - t) / 86400000));
};
const prettyDate = (iso: string) => {
  const d = new Date(iso.length === 7 ? `${iso}-15T12:00:00` : `${iso}T12:00:00`);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
// Founder finding 2026-08-11: this named an account by its INSTITUTION alone, so two Vanguard
// accounts produced two identical banner lines ("Vanguard last updated Aug 3" twice) with no way to
// tell which was which. It now speaks the app's ONE account name — institution + last four — and
// falls back to the same disambiguation every other screen uses.
const namesFor = (accounts: AssetAccount[]) => accountDisplayNames(accounts);
const nameOf = (a: AssetAccount, names: Map<string, string>) =>
  names.get(a.asset_id) || a.institution?.trim() || a.label || 'this account';

/**
 * Every incomplete promise across the given accounts.
 * @param windowStart the window the screen's figures cover ('YYYY-MM-DD' / 'YYYY-MM'); the
 *   history-depth gap speaks ONLY when a figure's window predates what the source shared
 *   (founder 2026-08-04: on a one-day change line it would wrongly imply older income is inside).
 */
export function dataGaps(
  accounts: AssetAccount[],
  windowStart?: string | null,
  now: number = Date.now(),
  transactions: { account_id?: string; type?: string }[] = [],   // the store's ledger (income rows live there, not on the account)
  failures: { accountId: string; at: string; reason?: string }[] = [],   // accounts the last sync could not reach
): DataGap[] {
  const gaps: DataGap[] = [];
  const names = namesFor(accounts ?? []);   // one naming rule, the same one every screen shows
  for (const a of accounts ?? []) {
    const who = nameOf(a, names);

    // 1) a holding we hold but cannot price today → we show cost, and we say so
    for (const p of (a.positions ?? []) as any[]) {
      const priced = p.price != null && p.price > 0;
      if (!priced && (p.shares ?? 0) > 0) {
        gaps.push({
          kind: 'no-price', accountId: a.asset_id,
          title: `${p.ticker || p.name || 'A holding'} has no price today`,
          meanwhile: 'Meanwhile we show what you paid — it stays out of the change line, and we say so.',
          fixLabel: 'Check ticker or set a price',
          route: `/holding-detail?account=${a.asset_id}&position=${p.position_id}`,
        });
      }
    }

    // 2) a connected account whose last successful sync has gone stale
    if (a.source === 'connected') {
      const d = daysBetween(a.last_synced, now);
      const unreachable = (failures ?? []).find((f) => f.accountId === a.asset_id);
      if (unreachable) {
        // We TRIED and could not reach it — say that, and offer the re-login, because another sync
        // will not fix a connection the broker has dropped (founder finding 2026-08-11).
        gaps.push({
          kind: 'unreachable-account', accountId: a.asset_id,
          title: `We couldn't reach ${who}`,
          meanwhile: `Its numbers are the ones from ${d != null ? prettyDate(String(a.last_synced).slice(0, 10)) : 'its last successful update'} — we don't guess at newer ones. This usually means the connection needs a re-login.`,
          fixLabel: 'Reconnect', route: `/connect?account=${a.asset_id}`,
          action: 'reconnect',
        });
      } else if (d != null && d > STALE_SYNC_DAYS) {
        gaps.push({
          kind: 'stale-account', accountId: a.asset_id,
          title: `${who} last updated ${prettyDate(String(a.last_synced).slice(0, 10))}`,
          meanwhile: `Balances may have moved in ${d} days. A fresh sync usually fixes this; if not, the connection needs a re-login.`,
          // founder finding 2026-08-11: this used to NAVIGATE to the account page, which has no sync
          // on it — a button that said "Sync now" and synced nothing. It runs the sync in place now.
          fixLabel: 'Sync now', route: `/account-detail?id=${a.asset_id}`, action: 'sync',
        });
      }
      // 3) a broker that sends balances but no dividend/interest records
      const hasActivity = (transactions ?? []).some((t) => t.account_id === a.asset_id && (t.type === 'DIVIDEND' || t.type === 'INTEREST'));
      if (!hasActivity && (a.positions ?? []).length > 0) {
        gaps.push({
          kind: 'no-activity', accountId: a.asset_id,
          title: `${who} hasn't shared dividend records`,
          meanwhile: 'Its return shows price change only — we never estimate income we were not given.',
          fixLabel: 'Enter dividends yourself', route: `/account-detail?id=${a.asset_id}`,
        });
      }
      // 5) the shared-history depth — ONLY when this window reaches back past it
      // the depth line uses the CANONICAL helper (it returns null when the window is covered —
      // that is the founder's scoping rule: silent on short windows, speaks on year-scale figures)
      const cov = windowStart ? historyCoverage(a, windowStart, new Date(now)) : null;
      if (cov && cov.kind === 'partial') {
        gaps.push({
          kind: 'history-depth', accountId: a.asset_id,
          title: cov.sentence,
          meanwhile: `Figures for this window count from ${prettyDate(String(cov.from))} onward for this account — we say so rather than showing a smaller number as if it were complete.`,
          fixLabel: "See what's counted", route: `/account-detail?id=${a.asset_id}`,
        });
      }
    }

    // 4) a value you typed once and haven't touched in a year
    if (a.source !== 'connected' && a.tax_bucket === 'PROPERTY') {
      const d = daysBetween(a.value_as_of, now);
      if (d != null && d > STALE_VALUE_DAYS) {
        gaps.push({
          kind: 'stale-value', accountId: a.asset_id,
          title: `${a.label || 'A value'} hasn't been updated in ${Math.floor(d / 365)} year${d >= 730 ? 's' : ''}`,
          meanwhile: 'We still count what you typed — property has no price feed, so only you can refresh it.',
          // the Net worth tab's route key is 'analytics' — '/(tabs)/networth' matches nothing, so this
          // button used to land on an unmatched route and bounce Home. Every fix button must reach the
          // exact cure: the account's own page, where Edit opens its editor.
          fixLabel: 'Update the value', route: `/account-detail?id=${a.asset_id}`,
        });
      }
    }
  }
  return gaps;
}

/** The banner sentence — plural-correct, and absent (null) when nothing is missing. */
export function gapsHeadline(gaps: DataGap[]): string | null {
  if (!gaps.length) return null;
  return gaps.length === 1 ? '1 number needs more information' : `${gaps.length} numbers need more information`;
}
