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
import { historyCoverage } from '../assets';

export type GapKind = 'no-price' | 'stale-account' | 'no-activity' | 'stale-value' | 'history-depth';

export interface DataGap {
  kind: GapKind;
  title: string;        // what is missing, in plain words
  meanwhile: string;    // what we are doing instead — never a vague hedge
  fixLabel: string;     // the button that cures it
  route: string;        // where that button lands (the exact field, not a settings page)
  accountId?: string;
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
const nameOf = (a: AssetAccount) => (a.institution?.trim() || a.label || 'this account');

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
): DataGap[] {
  const gaps: DataGap[] = [];
  for (const a of accounts ?? []) {
    const who = nameOf(a);

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
      if (d != null && d > STALE_SYNC_DAYS) {
        gaps.push({
          kind: 'stale-account', accountId: a.asset_id,
          title: `${who} last updated ${prettyDate(String(a.last_synced).slice(0, 10))}`,
          meanwhile: `Balances may have moved in ${d} days. A fresh sync usually fixes this; if not, the connection needs a re-login.`,
          fixLabel: 'Sync now', route: `/account-detail?id=${a.asset_id}`,
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
          fixLabel: 'Update the value', route: `/(tabs)/networth?edit=${a.asset_id}`,
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
