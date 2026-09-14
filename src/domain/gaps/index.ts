// DATA GAPS — the ONE function behind the missing-data banner and its fix-it sheet
// (founder-approved final mocks, mockup-vf/networth-FINAL + performance-FINAL, 2026-08-04).
//
// The founder's rule, in their words: a standing disclaimer is useless — say nothing when the
// numbers are complete, and speak up ONLY when a promised calculation is missing an input, naming
// the exact gap. So this function answers one question: which promised numbers on this screen are
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
  /** A SECOND door, when the first one may not be enough. The approved fix-it sheet (State F) always
   *  offered "Sync now › Reconnect ›" together: a sync cannot revive a connection the broker has
   *  dropped, and the founder found himself told to re-log-in with nowhere to do it. */
  alt?: { label: string; route: string };
}

const STALE_SYNC_DAYS = 3;
const STALE_VALUE_DAYS = 365;
/* ─ MK-XS-F-170 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * daysSince
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     nothing   when iso is missing
 *     t = date.parse(string(iso))
 *     the answer:
 *     nothing   if number.is na n(t)
 *     max(0, round down((now − t) ÷ 86400000))   otherwise
 *
 * Called by ... MK-XS-F-002 dataGaps
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-002 dataGaps
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-170
 * Changed ..... not in git yet (—)
 */
const daysSince = (iso: string | null | undefined, now: number): number | null => {
  if (!iso) return null;
  const t = Date.parse(String(iso));
  return Number.isNaN(t) ? null : Math.max(0, Math.floor((now - t) / 86400000));
};
/* ─ MK-XS-F-118 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * prettyDate
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     d = the date `${iso}-15T12:00:00`   if iso.length = 7
 *     `${iso}T12:00:00`   otherwise
 *     the answer:
 *     iso   if is na n(get time())
 *     to locale date string('en − US', { month: 'short', day: 'numeric' })   otherwise
 *
 * Called by ... MK-XS-F-002 dataGaps
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-002 dataGaps
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-118
 * Changed ..... not in git yet (—)
 */
const prettyDate = (iso: string) => {
  const d = new Date(iso.length === 7 ? `${iso}-15T12:00:00` : `${iso}T12:00:00`);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
// Founder finding 2026-08-11: this named an account by its INSTITUTION alone, so two Vanguard
// accounts produced two identical banner lines ("Vanguard last updated Aug 3" twice) with no way to
// tell which was which. It now speaks the app's ONE account name — institution + last four — and
// falls back to the same disambiguation every other screen uses.
/* ─ MK-XS-F-119 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * namesFor
 *
 * Answers ..... Founder finding 2026-08-11: this named an account by its INSTITUTION alone, so two Vanguard accounts produced two identical banner lines ("Vanguard last updated Aug 3" twice) with no way to tell which was which.
 *
 * Formula .....
 *     account display names(accounts)
 *
 * Called by ... MK-XS-F-002 dataGaps
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-002 dataGaps
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-119
 * Changed ..... not in git yet (—)
 */
const namesFor = (accounts: AssetAccount[]) => accountDisplayNames(accounts);
/* ─ MK-XS-F-120 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * nameOf
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     the answer = the person's name for the account, else the institution, else the label, else 'this account'
 *
 * Called by ... MK-NW-F-028 classPortionLabel · MK-XS-F-002 dataGaps
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-028 classPortionLabel · MK-XS-F-002 dataGaps
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-003 institution name
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-120
 * Changed ..... not in git yet (—)
 */
const nameOf = (a: AssetAccount, names: Map<string, string>) =>
  names.get(a.asset_id) || a.institution?.trim() || a.label || 'this account';

/**
 * Every incomplete promise across the given accounts.
 * @param windowStart the window the screen's figures cover ('YYYY-MM-DD' / 'YYYY-MM'); the
 *   history-depth gap speaks ONLY when a figure's window predates what the source shared
 *   (founder 2026-08-04: on a one-day change line it would wrongly imply older income is inside).
 */
/* ─ MK-XS-F-002 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * dataGaps
 *
 * Answers ..... Every incomplete promise across the given accounts.
 *
 * Formula .....
 *     gaps = []
 *     names = names for(accounts ?? [])
 *     who = name of(a, names)
 *     priced = price ≠ nothing and price > 0
 *     d = days since(last synced, now)
 *     unreachable = (failures ?? []).find((f) => account id = asset id)
 *     has activity = (transactions ?? []).some((t) => account id = asset id and (type = 'DIVIDEND' or type = 'INTEREST'))
 *     cov = history coverage(a, window start, new date(now))   if window start
 *     nothing   otherwise
 *     d = days since(value as of, now)
 *     the answer = gaps
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-006 price fetched at
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-033 the date a hand-typed value was set
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · If shares is missing it uses 0.
 *     · Treats a year as 365 days.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-002
 * Changed ..... 2026-08-11 (bfefb86)
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
      const d = daysSince(a.last_synced, now);
      const unreachable = (failures ?? []).find((f) => f.accountId === a.asset_id);
      if (unreachable) {
        // We TRIED and could not reach it — say that, and offer the re-login, because another sync
        // will not fix a connection the broker has dropped (founder finding 2026-08-11).
        gaps.push({
          kind: 'unreachable-account', accountId: a.asset_id,
          title: `We couldn't reach ${who}`,
          meanwhile: `Its numbers are the ones from ${d != null ? prettyDate(String(a.last_synced).slice(0, 10)) : 'its last successful update'} — we don't guess at newer ones. This usually means the connection needs a re-login.`,
          fixLabel: 'Reconnect', route: '/connect',
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
          // …and always a way to re-log-in, because a sync cannot fix a dropped connection
          alt: { label: 'Reconnect', route: '/connect' },
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

    // 4) a value you entered once and haven't touched in a year
    if (a.source !== 'connected' && a.tax_bucket === 'PROPERTY') {
      const d = daysSince(a.value_as_of, now);
      if (d != null && d > STALE_VALUE_DAYS) {
        gaps.push({
          kind: 'stale-value', accountId: a.asset_id,
          title: `${a.label || 'A value'} hasn't been updated in ${Math.floor(d / 365)} year${d >= 730 ? 's' : ''}`,
          meanwhile: 'We still count what you entered — property has no price feed, so only you can refresh it.',
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
/* ─ MK-XS-F-003 ───────────────────────────────────────────── 2 · DISPLAYED (presentation only)
 * gapsHeadline
 *
 * Answers ..... The banner sentence — plural-correct, and absent (null) when nothing is missing.
 *
 * Formula .....
 *     nothing   when count of gaps is missing
 *     '1 number needs more information'   if gaps.length = 1
 *     `${gaps.length} numbers need more information`   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-003
 * Changed ..... 2026-08-09 (69f88a0)
 */
export function gapsHeadline(gaps: DataGap[]): string | null {
  if (!gaps.length) return null;
  return gaps.length === 1 ? '1 number needs more information' : `${gaps.length} numbers need more information`;
}
