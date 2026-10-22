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
import { plural } from '../_shared/plural';   // the one list of words and plurals (DEC-4082, 2026-10-10)
import type { AssetAccount } from '../assets';
import type { Debt } from '../debt';
import { historyCoverage, accountDisplayNames, unpricedValueOf } from '../assets';
import { daysSince } from '../_shared/freshness';
import { unnamedActivityOf } from '../../../Calculation Module code/engines/ledger';

export type GapKind = 'no-balance' | 'no-price' | 'stale-account' | 'unreachable-account' | 'no-activity' | 'stale-value' | 'history-depth' | 'bond-quote' | 'unknown-activity';

export interface DataGap {
  kind: GapKind;
  title: string;        // what is missing, in plain words
  meanwhile: string;    // what we are doing instead — never a vague hedge
  fixLabel: string;     // the button that cures it
  route: string;        // where that button lands (the exact field, not a settings page)
  accountId?: string;
  debtId?: string;      // set on a debt's gap (a debt with no balance)
  /** What the button DOES. 'sync' runs the sync in place (a button that says "Sync now" must sync,
   *  founder finding 2026-08-11); 'reconnect' opens the connection flow; absent = plain navigation. */
  action?: 'sync' | 'reconnect';
  /** A SECOND door, when the first one may not be enough. The approved fix-it sheet (State F) always
   *  offered "Sync now › Link again ›" together: a sync cannot revive a connection the broker has
   *  dropped, and the founder found himself told to re-log-in with nowhere to do it. */
  alt?: { label: string; route: string };
  /** THE SAME GAP AS THE ACCOUNT'S OWN PAGE SAYS IT (account-page drawing v01, approved 2026-10-19, state D): the page is
   *  already about the account, so it names the source and says "for this account" — "Fidelity hasn't shared dividend
   *  records for this account". Absent: the page says the title. */
  onItsPage?: string;
}

const STALE_SYNC_DAYS = 3;
const STALE_VALUE_DAYS = 365;
// daysSince now comes from the ONE freshness rule in src/domain/_shared/freshness.ts (DEC-0301).
/* ─ MK-XS-F-118 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * prettyDate
 *
 * Answers ..... daysSince now comes from the ONE freshness rule in src/domain/_shared/freshness.ts (DEC-0301).
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
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-028 classPortionLabel
 *               MK-XS-F-002 dataGaps · MK-NW-O-005 theAlternativesOutlook
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-003 institution name
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-120
 * Changed ..... not in git yet (—)
 */
const nameOf = (a: AssetAccount, names: Map<string, string>) =>
  names.get(a.asset_id) || a.institution?.trim() || a.label || 'this account';
/** What a gap calls a holding: its ticker, or — where the ticker is a 9-character security identifier, as a bond's or a
 *  CD's is — the security's readable name, the way the account page names it (Build-43 finding 4). */
/* ─ MK-XS-F-186 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * holdingName
 *
 * Answers ..... What a gap calls a holding: its ticker, or — where the ticker is a 9-character security identifier, as a bond's or a CD's is — the security's readable name, the way the account page names it (Build-43 finding 4).
 *
 * Formula .....
 *     t = string(ticker ?? '').trim()
 *     nm = string(name ?? label ?? '').trim()
 *     the answer:
 *     nm   if ÷ ^[0 − 9A − Z]{9}$ ÷ .test(t) and ÷ \d ÷ .test(t) and nm
 *     t (or nm (or 'A holding' when missing or zero) when missing or zero)   otherwise
 *
 * Called by ... MK-XS-F-002 dataGaps
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-002 dataGaps
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-186
 * Changed ..... not in git yet (—)
 */
const holdingName = (p: { ticker?: string; name?: string; label?: string }) => {
  const t = String(p.ticker ?? '').trim();
  const nm = String(p.name ?? p.label ?? '').trim();
  return (/^[0-9A-Z]{9}$/.test(t) && /\d/.test(t) && nm) ? nm : (t || nm || 'A holding');
};

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
 *     held = (lots ?? []).reduce((t: number, l: any) => t + (number(shares) or 0), 0)
 *     broker price = last price ≠ nothing and number.is finite(last price) and last price > 0
 *     looked = price of(string(ticker ?? ''))   if !broker price and price of
 *     nothing   otherwise
 *     priced = broker price (or looked ≠ nothing and number.is finite(looked) and looked ≥ 0 when missing or zero)
 *     judged = broker price (or source = 'connected' (or price of ≠ nothing when missing or zero) when missing or zero)
 *     what = holding name(p)
 *     d = days since(last synced, now)
 *     unreachable = (failures ?? []).find((f) => account id = asset id)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-003 institution name
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-009 transaction date
 *               MK-XS-I-011 bond face value
 *               MK-XS-I-014 debt balance
 *
 * Decides .....
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
  transactions: { account_id?: string; type?: string; date?: string; amount?: number; shares?: number; note?: string; unclassified_word?: string }[] = [],   // the store's ledger (income rows live there, not on the account)
  failures: { accountId: string; at: string; reason?: string }[] = [],   // accounts the last sync could not reach
  debts: Pick<Debt, 'debt_id' | 'label' | 'institution' | 'remaining_balance'>[] = [],   // what you owe — a debt with no balance is a gap too
  // a holding's latest close from the price history the app holds (R7, 2026-10-20) — how a hand-added holding is priced
  priceOf?: (ticker: string) => number | null | undefined,
): DataGap[] {
  const gaps: DataGap[] = [];
  const names = namesFor(accounts ?? []);   // one naming rule, the same one every screen shows
  for (const a of accounts ?? []) {
    const who = nameOf(a, names);

    // 0) an account with no balance at all — a linked account that failed to sync before it ever sent
    //    one. It is left out of every total rather than counted as $0, and said so here (outside review
    //    batch 06, 2026-10-07; MK-NW-F-066 sumWhere reports how many were left out)
    if (a.balance == null || !Number.isFinite(a.balance as number)) {
      gaps.push({
        kind: 'no-balance', accountId: a.asset_id,
        title: `${who} has no balance`,
        meanwhile: 'It is left out of your totals until it has one — not counted as $0.',
        fixLabel: a.source === 'connected' ? 'Sync now' : 'Enter its value',
        route: `/account-detail?id=${a.asset_id}`, ...(a.source === 'connected' ? { action: 'sync' as const } : {}),
      });
    }

    // 1) a holding we hold but cannot price today → we show cost, and we say so.
    //    READ FROM THE HOLDING AS IT IS STORED (2026-10-20, R7): a sync writes the broker's price as `last_price` and the
    //    quantity on the purchases (`lots`); an imported or hand-added holding carries its purchases only and is priced
    //    from the price history the app holds (`priceOf`, handed in by the screen). This read `p.price` and `p.shares`,
    //    which nothing writes, so the gap never fired on a real account — only on the made-up holdings in its tests.
    //    A hand-added holding is judged only where the screen hands its price lookup in; without it, it is not judged.
    for (const p of (a.positions ?? []) as any[]) {
      const held = (p.lots ?? []).reduce((t: number, l: any) => t + (Number(l?.shares) || 0), 0);
      if (!(held > 0)) continue;
      const brokerPrice = p.last_price != null && Number.isFinite(p.last_price) && p.last_price > 0;
      const looked = !brokerPrice && priceOf ? priceOf(String(p.ticker ?? '')) : null;
      // A CLOSE OF $0 IN THE PRICE HISTORY IS A PRICE (2026-10-21; DEC-5068, tenet 3 the right way round: a known $0 is $0).
      // The feed skips a day it has no close for, so a $0 close was sent as $0; the holding is counted at $0 with what it
      // lost, so this box's claim that it stays out of the change line would be false. A broker's own mark of $0 with no
      // close behind it still reads as no price (DEC-0019 reads a broker's zero as not sent).
      const priced = brokerPrice || (looked != null && Number.isFinite(looked) && looked >= 0);
      const judged = brokerPrice || a.source === 'connected' || priceOf != null;
      const what = holdingName(p);
      if (judged && !priced) {
        gaps.push({
          kind: 'no-price', accountId: a.asset_id,
          title: `${what} has no price today`,
          // THE SENTENCE SAYS WHAT THE ROW SHOWS (2026-10-21, outside review OpenAI, Performance re-run; tenet 2). A broker's
          // own $0 mark with no close behind it is shown as $0 — quantity × the $0 it sent — not as what was paid; only a
          // holding with no price at all falls back to what was paid. Both stay out of the change line.
          // A LINKED holding with no price at all is counted as the rest of the broker's total — what its priced holdings and
          // cash leave over — on Net worth and on the account page's row alike (2026-10-21, tenets 2 and 3); this said "what
          // you paid", which no screen showed for it. One built by hand is counted at what was paid (B-19), as before.
          meanwhile: p.last_price === 0
            ? `Meanwhile we show the $0 price ${a.institution?.trim() || 'your broker'} sent — it stays out of the change line, and we say so.`
            : a.source === 'connected' && p.last_price == null && unpricedValueOf(a) != null
            ? `Meanwhile it counts as the rest of ${a.institution?.trim() || 'your broker'}'s total — what the other holdings and the cash leave over. It stays out of the change line, and we say so.`
            // nothing is left over for it: its row says no price today, with no figure, and so does this
            : a.source === 'connected' && p.last_price == null
            ? `Meanwhile it counts for nothing: ${a.institution?.trim() || 'your broker'}'s total leaves nothing over for it once the other holdings and the cash are counted. It stays out of the change line, and we say so.`
            : 'Meanwhile we show what you paid — it stays out of the change line, and we say so.',
          fixLabel: 'Check ticker or set a price',
          route: `/holding-detail?account=${a.asset_id}&position=${p.position_id}`,
        });
      }
      // 1b) A LINKED BOND WHOSE QUOTE CANNOT BE TOLD (MK-XS-I-068, 2026-10-20): the broker may quote it per $100 of face,
      //     which would make its value a hundredth of quantity × price, and its own total could not settle which. The app
      //     shows quantity × price and does not guess; the person checks it, and a face value they enter decides it.
      if (p.price_quote === 'unclear') {
        gaps.push({
          kind: 'bond-quote', accountId: a.asset_id,
          title: `${what} — check its value`,
          meanwhile: `We show its quantity × its price. If ${a.institution?.trim() || 'your broker'} quotes this bond per $100 of face, its value is a hundredth of that; entering its face value settles it.`,
          fixLabel: 'Enter its face value',
          route: `/holding-detail?account=${a.asset_id}&position=${p.position_id}`,
        });
      }
    }

    // 2) a connected account whose last successful sync has gone stale
    if (a.source === 'connected') {
      const d = daysSince(a.last_synced, now);
      const unreachable = (failures ?? []).find((f) => f.accountId === a.asset_id);
      if (unreachable) {
        // We TRIED and could not reach it — say that, and offer Link again, because another sync
        // will not fix a connection the broker has dropped (founder finding 2026-08-11).
        gaps.push({
          kind: 'unreachable-account', accountId: a.asset_id,
          title: `We couldn't reach ${who}`,
          meanwhile: `Its numbers are the ones from ${d != null ? prettyDate(String(a.last_synced).slice(0, 10)) : 'its last successful update'} — we don't guess at newer ones. This usually means it needs linking again.`,
          fixLabel: 'Link again', route: '/connect',   // founder 2026-09-14: linked / link again
          action: 'reconnect',
        });
      } else if (d != null && d > STALE_SYNC_DAYS) {
        gaps.push({
          kind: 'stale-account', accountId: a.asset_id,
          title: `${who} last updated ${prettyDate(String(a.last_synced).slice(0, 10))}`,
          meanwhile: `Balances may have moved in ${d} days. A fresh sync usually fixes this; if not, link it again.`,
          // founder finding 2026-08-11: this used to NAVIGATE to the account page, which has no sync
          // on it — a button that said "Sync now" and synced nothing. It runs the sync in place now.
          fixLabel: 'Sync now', route: `/account-detail?id=${a.asset_id}`, action: 'sync',
          // …and always a way to re-log-in, because a sync cannot fix a dropped connection
          alt: { label: 'Link again', route: '/connect' },
        });
      }
      // 3) a broker that sends balances but no dividend/interest records
      const hasActivity = (transactions ?? []).some((t) => t.account_id === a.asset_id && (t.type === 'DIVIDEND' || t.type === 'INTEREST'));
      if (!hasActivity && (a.positions ?? []).length > 0) {
        gaps.push({
          kind: 'no-activity', accountId: a.asset_id,
          title: `${who} hasn't shared dividend records`,
          onItsPage: `${a.institution?.trim() || who} hasn't shared dividend records for this account`,
          // corrected 2026-10-12 (DEC-4645): this read "Its return shows price change only", which was false — the
          // return is measured on the account's recorded values, and its prices are dividend-adjusted closes. What is
          // missing without the records is the dividends' own line: they sit inside the change in investment value.
          meanwhile: 'Its dividends sit inside the change in investment value, not on a line of their own — we never estimate income we were not given.',
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
          title: `${a.label || 'A value'} hasn't been updated in ${plural(Math.floor(d / 365), 'year')}`,
          meanwhile: 'We still count what you entered — property has no price feed, so only you can refresh it.',
          // the Net worth tab's route key is 'analytics' — '/(tabs)/networth' matches nothing, so this
          // button used to land on an unmatched route and bounce Home. Every fix button must reach the
          // exact cure: the account's own page, where Edit opens its editor.
          fixLabel: 'Update the value', route: `/account-detail?id=${a.asset_id}`,
        });
      }
    }

    // 7) AN ACTIVITY THE APP DOES NOT KNOW (2026-10-20, Q15 — the institution-word rule). A record whose word the app
    //    could not name is counted in no total — but the broker's balance moved by it, so the return refuses across its
    //    day. Said here, naming the broker's own word, so the person can find the record. Only records inside the
    //    window this screen measures, and only those that carry money or shares (unnamedActivityOf, the one test).
    const unnamed = (transactions ?? [])
      .filter((t) => String(t?.account_id ?? '') === String(a.asset_id) && (!windowStart || String(t?.date ?? '') >= windowStart))
      .map((t) => ({ t, u: unnamedActivityOf(t as any) }))
      .filter((x) => x.u != null)
      .sort((x, y) => String(x.t.date ?? '').localeCompare(String(y.t.date ?? '')));
    if (unnamed.length) {
      const words = [...new Set(unnamed.map((x) => x.u!.word))].map((w) => (w ? `"${w}"` : 'one with no word'));
      const from = a.institution?.trim() || who;
      const what = unnamed.length === 1 ? `an activity the app does not know: ${words[0]}` : `${plural(unnamed.length, 'record')} the app does not know: ${words.join(', ')}`;
      const first = prettyDate(String(unnamed[0].t.date ?? '').slice(0, 10));
      gaps.push({
        kind: 'unknown-activity', accountId: a.asset_id,
        title: `${who} sent ${what}`,
        onItsPage: `${from} sent ${what}`,
        meanwhile: `${unnamed.length === 1 ? `It is dated ${first}` : `The first is dated ${first}`}. The app does not count it as money put in or taken out, and does not measure the return across ${unnamed.length === 1 ? 'that day' : 'those days'}. The balance is the one ${from} sends.`,
        // the account's own page, opened at its ACTIVITY with every record listed (the account-page drawing's row 50)
        fixLabel: 'See the activity', route: `/account-detail?id=${a.asset_id}&show=activity`,
      });
    }
  }

  // 6) a debt with no balance — it adds nothing to what you owe, so net worth would look complete
  //    while a debt is unknown. Named here, like an account with no balance (Tenet 3, unknown is not
  //    zero). (outside review OpenAI final, 2026-10-09, DEC-3279e)
  for (const d of debts ?? []) {
    if (d == null) continue;
    if (d.remaining_balance == null || !Number.isFinite(d.remaining_balance as number)) {
      const who = d.label?.trim() || d.institution?.trim() || 'A debt';
      gaps.push({
        kind: 'no-balance', debtId: d.debt_id,
        title: `${who} has no balance`,
        meanwhile: 'It is left out of what you owe until it has one — not counted as $0.',
        fixLabel: 'Enter what you owe', route: '/(tabs)/analytics',
      });
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
 *     `${plural(gaps.length, 'number')} ${gaps.length = 1 ? 'needs' : 'need'} more information`
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
  return `${plural(gaps.length, 'number')} ${gaps.length === 1 ? 'needs' : 'need'} more information`;
}
