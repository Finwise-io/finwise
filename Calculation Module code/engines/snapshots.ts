// ENGINE — the daily record of what things were worth.
//
// THE DEFECT THIS REPLACES, and it is the largest one in the module. The app keeps ONE number a day:
// total net worth. Five separate figures need more than that and cannot be computed without it —
// the value an account started a period at, an honest short-window return, which holdings drove it,
// the trend line, and any comparison against an index. The founder's own Vanguard beginning value
// came out at MINUS $448,028 against a statement's $378,022, because with nothing to read the app
// back-solved it from today's value minus whatever the ledger claimed, inheriting every ledger error.
//
// NOBODY SENDS US HISTORY. No institution transmits what an account was worth last month — verified
// across FDX, Plaid, Yodlee, OFX and SnapTrade. So this record is the only past that will ever exist,
// and the day it starts being kept is the day it starts.
//
// FOUNDER DECISIONS, 2026-08-18:
//   · daily rows for TWO YEARS; month-end rows kept FOREVER
//   · phone first; the same store syncs to the cloud later, before the desktop site
//
// BUILT SO THE LATER SYNC IS A PLAIN UPLOAD. Three properties do that, and each is load-bearing:
//   1. APPEND-ONLY. A written row is never edited. A correction arrives as a new row that supersedes
//      it, so the record of what we believed at the time survives.
//   2. A STABLE ID per row — account, security, date. Uploading the same row twice cannot duplicate
//      it, so a sync needs no merge logic, which is where sync bugs live.
//   3. UNITS AND PRICE KEPT SEPARATELY, never just a value. A value alone cannot tell a price move
//      from a purchase, and that distinction is the whole point of keeping this record.

export interface HoldingSnapshot {
  /** 'YYYY-MM-DD'. */
  date: string;
  accountId: string;
  /** Our own key for the security — resolved once, so a ticker change does not orphan the history. */
  securityKey: string;
  /** What the institution called it that day, kept verbatim for tracing. */
  symbol?: string;
  units: number;
  /** Per unit, on that date. Kept apart from units so a price move and a purchase never look alike. */
  price: number | null;
  /** units × price, or the institution's own figure where it gives one. */
  value: number;
  currency: string;
}

export interface AccountSnapshot {
  date: string;
  accountId: string;
  /** Uninvested cash — the sweep balance, after money-market funds have been taken out of it. */
  cash: number;
  /** THE BROKER'S OWN STATED TOTAL. The only outside check we ever get: if our holdings plus cash
   *  do not reach it, something is missing, and we would rather know than quietly disagree. */
  statedTotal: number | null;
  currency: string;
}

export interface SnapshotDay {
  date: string;
  holdings: HoldingSnapshot[];
  accounts: AccountSnapshot[];
  /** How this day came to exist. A reconstruction is not a record and must never read as one. */
  origin: 'observed' | 'reconstructed';
  /** When it was written. A later row for the same day supersedes an earlier one. */
  writtenAt: string;
}

export const holdingId = (s: Pick<HoldingSnapshot, 'date' | 'accountId' | 'securityKey'>): string =>
  `${s.date}|${s.accountId}|${s.securityKey}`;
export const accountId = (s: Pick<AccountSnapshot, 'date' | 'accountId'>): string =>
  `${s.date}|${s.accountId}`;


// ── building a day from what the app holds right now ────────────────────────────────────────────
/** The shape this builder needs from a stored account — structural, so the engine imports nothing
 *  from the app. Numbers are recorded VERBATIM as the institution gave them (a JSON round-trip
 *  keeps them identical); every SUM over them runs through the decimal engine at read time. */
export interface AccountLike {
  asset_id: string;
  balance?: number;
  cash_balance?: number | null;
  source?: string;
  asset_class?: string;
  positions?: Array<{
    ticker?: string;
    last_price?: number | null;
    lots?: Array<{ shares?: number; cost_per_share?: number }>;
  }> | null;
}

/** Today's SnapshotDay, observed from the live account state. This is the write the old code never
 *  made — the reason "beginning" had to be back-solved. securityKey falls back to the ticker until
 *  a resolved security id exists on stored positions. */
export function buildDayFromAccounts(accounts: AccountLike[], date: string, writtenAt: string): SnapshotDay {
  const holdings: HoldingSnapshot[] = [];
  const accts: AccountSnapshot[] = [];
  for (const a of accounts ?? []) {
    const ps = a.positions ?? [];
    for (const p of ps) {
      const units = (p.lots ?? []).reduce((t, l) => t + (l.shares || 0), 0);
      if (!(units > 0) || !p.ticker) continue;
      const basis = (p.lots ?? []).reduce((t, l) => t + (l.shares || 0) * (l.cost_per_share || 0), 0);
      holdings.push({
        date, accountId: a.asset_id, securityKey: p.ticker, symbol: p.ticker,
        units, price: p.last_price ?? null,
        // the broker's mark when there is one; the honest cost fallback when there is not —
        // the same rule pricing uses everywhere (never $0 for an unpriced holding)
        value: p.last_price != null ? Math.round(units * p.last_price * 100) / 100 : Math.round(basis * 100) / 100,
        currency: 'USD',
      });
    }
    accts.push({
      date, accountId: a.asset_id,
      // uninvested cash: the sleeve on a connected account; the whole balance of a cash account
      cash: a.cash_balance ?? (a.asset_class === 'cash' || (!ps.length && a.source !== 'connected') ? (a.balance ?? 0) : 0),
      statedTotal: a.source === 'connected' ? (a.balance ?? null) : null,
      currency: 'USD',
    });
  }
  return { date, holdings, accounts: accts, origin: 'observed', writtenAt };
}

// ── retention ───────────────────────────────────────────────────────────────────────────────────
/** Two years of daily rows. Founder decision: two years is enough, and it is why the Performance
 *  screen offers no window longer than two years — a window longer than the record would draw a
 *  line from dates we have no evidence for. */
export const DAILY_YEARS = 2;
/** Month-ends are NEVER pruned. They are what answers "since I started" once the dailies age out,
 *  and thirty years of them is under two megabytes. */
export const KEEP_MONTH_ENDS_FOREVER = true;

const isMonthEnd = (date: string, allDates: Set<string>): boolean => {
  const [y, m] = date.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  // the true last day of the month, or the latest day we actually hold in that month
  for (let d = last; d > Number(date.slice(8)); d--) {
    if (allDates.has(`${date.slice(0, 7)}-${String(d).padStart(2, '0')}`)) return false;
  }
  return true;
};

/** Which days survive. Everything within two years stays; older days keep only their month-end.
 *  Pruning is the ONE irreversible act here, which is why it is a single named function with the
 *  rule written above it rather than a condition buried in a store. */
export function prune(days: SnapshotDay[], today: string): SnapshotDay[] {
  const cutoff = new Date(today);
  cutoff.setFullYear(cutoff.getFullYear() - DAILY_YEARS);
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  const all = new Set(days.map((d) => d.date));
  return days.filter((d) => d.date >= cutoffKey || isMonthEnd(d.date, all));
}

// ── writing ─────────────────────────────────────────────────────────────────────────────────────
/** Add a day. A day already present is SUPERSEDED, not edited: the newer row wins and the older is
 *  dropped from the working set, so what is read is always the latest belief about that date. */
export function record(days: SnapshotDay[], day: SnapshotDay): SnapshotDay[] {
  const rest = days.filter((d) => d.date !== day.date);
  return [...rest, day].sort((a, b) => a.date.localeCompare(b.date));
}

// ── reading ─────────────────────────────────────────────────────────────────────────────────────
/** What one account was worth on a date — the figure the old code had to back-solve.
 *  Returns NOTHING when no record covers that date. Absent beats invented: a missing beginning
 *  value should suppress the return that needs it, not produce a negative market value. */
export function valueOn(days: SnapshotDay[], accountIds: Set<string>, date: string): number | null {
  const day = onOrBefore(days, date);
  if (!day) return null;
  const inSet = (id: string) => accountIds.size === 0 || accountIds.has(id);
  const holdings = day.holdings.filter((h) => inSet(h.accountId)).reduce((t, h) => t + h.value, 0);
  const cash = day.accounts.filter((a) => inSet(a.accountId)).reduce((t, a) => t + a.cash, 0);
  if (!day.holdings.some((h) => inSet(h.accountId)) && !day.accounts.some((a) => inSet(a.accountId))) return null;
  return round2(holdings + cash);
}

/** How many units of one holding were held on a date — what the trend chart needs and never had.
 *  Valuing a past date with TODAY'S share count draws a history the person did not have. */
export function unitsOn(days: SnapshotDay[], accId: string, securityKey: string, date: string): number | null {
  const day = onOrBefore(days, date);
  const h = day?.holdings.find((x) => x.accountId === accId && x.securityKey === securityKey);
  return h ? h.units : null;
}

/** The latest day at or before a date, or nothing when the record does not reach back that far. */
export function onOrBefore(days: SnapshotDay[], date: string): SnapshotDay | null {
  let best: SnapshotDay | null = null;
  for (const d of days) if (d.date <= date && (!best || d.date > best.date)) best = d;
  return best;
}

/** The first date the record covers — so a change figure can say what it is measured FROM, rather
 *  than presenting a figure measured from install day as though it covered the year. */
export function firstDate(days: SnapshotDay[]): string | null {
  return days.length ? days.reduce((a, b) => (a.date < b.date ? a : b)).date : null;
}

/** Does the record actually cover this window? A return quoted over a period we cannot see is a
 *  return measured over some other period with a misleading label. */
export function covers(days: SnapshotDay[], from: string): boolean {
  const f = firstDate(days);
  return f != null && f <= from;
}

// ── the outside check ───────────────────────────────────────────────────────────────────────────
/** Our figure against the broker's own stated total. This is the only external check the app ever
 *  gets, and it is worth surfacing rather than silently disagreeing with a statement. */
export function reconcile(day: SnapshotDay, accId: string): { ours: number; theirs: number | null; difference: number | null } {
  const ours = round2(
    day.holdings.filter((h) => h.accountId === accId).reduce((t, h) => t + h.value, 0) +
    (day.accounts.find((a) => a.accountId === accId)?.cash ?? 0));
  const theirs = day.accounts.find((a) => a.accountId === accId)?.statedTotal ?? null;
  return { ours, theirs, difference: theirs == null ? null : round2(ours - theirs) };
}

// ── the later cloud sync ────────────────────────────────────────────────────────────────────────
/** Everything not yet uploaded, oldest first. Because rows are append-only with stable ids, a sync
 *  is a plain upload with no merging: send these, remember the last date sent, continue. Sending a
 *  row twice is harmless. */
export function pendingUpload(days: SnapshotDay[], lastUploaded: string | null): SnapshotDay[] {
  return days.filter((d) => !lastUploaded || d.date > lastUploaded);
}

const round2 = (n: number) => Math.round(n * 100) / 100;
