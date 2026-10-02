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
  /** A HAND-ENTERED account's own value that day — a typed lump with no holdings to sum. Kept
   *  apart from cash: a typed IRA balance is not cash, and a house is neither. */
  typedValue?: number | null;
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

/* ─ MK-ST-F-026 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * holdingId
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     the answer = date | account id | security key
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-026
 * Changed ..... 2026-08-20 (6854e9b)
 */
export const holdingId = (s: Pick<HoldingSnapshot, 'date' | 'accountId' | 'securityKey'>): string =>
  `${s.date}|${s.accountId}|${s.securityKey}`;
/* ─ MK-ST-F-027 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * accountId
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     the answer = date | account id
 *
 * Called by ... MK-NW-O-001 theBonds · MK-ST-F-031 valueOn
 *               MK-XS-F-108 activityKey · MK-XS-F-109 dedupeActivities
 *               MK-XS-F-147 call · MK-XS-F-149 allActivities
 *               MK-XS-F-175 uid
 *
 * Reaches ..... 187 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-NW-F-078 ONE
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               … and 169 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-048 the person’s own asset-class answer
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-027
 * Changed ..... 2026-08-20 (6854e9b)
 */
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
/* ─ MK-ST-F-028 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * buildDayFromAccounts
 *
 * Answers ..... Today's SnapshotDay, observed from the live account state.
 *
 * Formula .....
 *     holdings = []
 *     accts = []
 *     ps = positions (or none when missing)
 *     units = Σ over lots (or none when missing) of (shares (or 0 when missing or zero))
 *     basis = Σ over lots (or none when missing) of ((shares or 0) × (cost per share or 0))
 *     the answer:
 *     date = date
 *     holdings = holdings
 *     accounts = accts
 *     origin = 'observed'
 *     written at = written at
 *
 * Called by ... MK-XS-F-174 recomputeBalances · MK-XS-F-175 uid
 *
 * Reaches ..... 57 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PL-F-053 buildRetirementState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-038 debtsFromOnboarding · MK-XS-F-072 deleteAccount
 *               MK-XS-F-138 deriveKeyFromSecret · MK-NW-F-044 getAssetsState
 *               MK-CF-F-041 getDebtState · MK-CF-F-052 getIncomeState
 *               … and 39 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-031 daily and monthly snapshots
 *               MK-XS-I-048 the person’s own asset-class answer
 *
 * Decides .....
 *     · If balance is missing it uses 0.
 *     · If shares is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If cost per share is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · Uses a built-in d a i l y y e a r s of 2.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-028
 * Changed ..... 2026-08-20 (6854e9b)
 */
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
        value: p.last_price != null ? (units * p.last_price) : (basis),
        currency: 'USD',
      });
    }
    accts.push({
      date, accountId: a.asset_id,
      // uninvested cash: the sleeve on a connected account; the whole balance of a cash account
      // cash is CASH only — a typed house or a typed IRA lump is not a sweep balance
      cash: a.cash_balance ?? (a.asset_class === 'cash' ? (a.balance ?? 0) : 0),
      statedTotal: a.source === 'connected' ? (a.balance ?? null) : null,
      typedValue: a.source !== 'connected' && a.asset_class !== 'cash' && !ps.length ? (a.balance ?? null) : null,
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

/* ─ MK-ST-F-061 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * isMonthEnd
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     last = the date y, m, 0).get date(
 *     false   when the first 7)}-${string(d).pad start(2, '0')}` of all dates.has(`${date
 *     the answer = true
 *
 * Called by ... MK-ST-F-029 prune
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-ST-F-029 prune
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-061
 * Changed ..... not in git yet (—)
 */
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
/* ─ MK-ST-F-029 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * prune
 *
 * Answers ..... Which days survive.
 *
 * Formula .....
 *     cutoff = the date today
 *     cutoff key = the first 10 of cutoff.to isostring()
 *     all = a list with no repeats of for each of days: date
 *     the answer = days where date ≥ cutoff key (or is month end(date, all) when missing or zero)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-031 daily and monthly snapshots
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-029
 * Changed ..... 2026-08-18 (3bd88c8)
 */
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
/* ─ MK-ST-F-030 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * record
 *
 * Answers ..... ── writing ───────────────────────────────────────────────────────────────────────────────────── Add a day.
 *
 * Formula .....
 *     rest = days where date ! = day.date
 *     the answer = [...rest, day].sort((a, b) => date.locale compare(date))
 *
 * Called by ... MK-NW-F-075 ACC · MK-NW-F-084 categoryEarnings
 *               MK-NW-O-008 thePerformance · MK-XS-F-174 recomputeBalances
 *
 * Reaches ..... 66 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-NW-F-082 NW · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-100 TREND
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               … and 48 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-031 daily and monthly snapshots
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-030
 * Changed ..... 2026-08-18 (3bd88c8)
 */
export function record(days: SnapshotDay[], day: SnapshotDay): SnapshotDay[] {
  const rest = days.filter((d) => d.date !== day.date);
  return [...rest, day].sort((a, b) => a.date.localeCompare(b.date));
}

// ── reading ─────────────────────────────────────────────────────────────────────────────────────
/** What one account was worth on a date — the figure the old code had to back-solve.
 *  Returns NOTHING when no record covers that date. Absent beats invented: a missing beginning
 *  value should suppress the return that needs it, not produce a negative market value. */
/* ─ MK-ST-F-031 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * valueOn
 *
 * Answers ..... ── reading ───────────────────────────────────────────────────────────────────────────────────── What one account was worth on a date — the figure the old code had to back-solve.
 *
 * Formula .....
 *     day = on or before(days, date)
 *     nothing   when day is missing
 *     in set = (id: string) => account ids.size = 0 (or account ids.has(id) when missing or zero)
 *     holdings = Σ over day.holdings where in set(account id) of (value)
 *     cash = Σ over day.accounts where in set(account id) of (cash + (typed value ?? 0))
 *     nothing   when !day.holdings.some((h) => in set(account id)) and !day.accounts.some((a) => in set(account id))
 *     the answer = holdings + cash
 *
 * Called by ... MK-NW-O-008 thePerformance
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-NW-O-008 thePerformance
 *
 * Serves ...... MK-PF-M-001 · MK-PF-M-004
 * Reads ....... MK-XS-I-031 daily and monthly snapshots
 * Ruled by .... DEC-0046 · DEC-0063 · DEC-0229
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
 *
 * Decides .....
 *     · If typed value is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-031
 * Changed ..... 2026-08-20 (9f201fb)
 */
export function valueOn(days: SnapshotDay[], accountIds: Set<string>, date: string): number | null {
  const day = onOrBefore(days, date);
  if (!day) return null;
  const inSet = (id: string) => accountIds.size === 0 || accountIds.has(id);
  const holdings = day.holdings.filter((h) => inSet(h.accountId)).reduce((t, h) => t + h.value, 0);
  const cash = day.accounts.filter((a) => inSet(a.accountId)).reduce((t, a) => t + a.cash + (a.typedValue ?? 0), 0);
  if (!day.holdings.some((h) => inSet(h.accountId)) && !day.accounts.some((a) => inSet(a.accountId))) return null;
  return (holdings + cash);
}

/** How many units of one holding were held on a date — what the trend chart needs and never had.
 *  Valuing a past date with TODAY'S share count draws a history the person did not have. */
/* ─ MK-ST-F-032 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * unitsOn
 *
 * Answers ..... How many units of one holding were held on a date — what the trend chart needs and never had.
 *
 * Formula .....
 *     day = on or before(days, date)
 *     h = day.holdings.find((x) => account id = acc id and security key = security key)
 *     the answer:
 *     units   if h
 *     nothing   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-031 daily and monthly snapshots
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-032
 * Changed ..... 2026-08-18 (3bd88c8)
 */
export function unitsOn(days: SnapshotDay[], accId: string, securityKey: string, date: string): number | null {
  const day = onOrBefore(days, date);
  const h = day?.holdings.find((x) => x.accountId === accId && x.securityKey === securityKey);
  return h ? h.units : null;
}

/** The latest day at or before a date, or nothing when the record does not reach back that far. */
/* ─ MK-ST-F-033 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * onOrBefore
 *
 * Answers ..... The latest day at or before a date, or nothing when the record does not reach back that far.
 *
 * Formula .....
 *     best = nothing
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-ST-F-006 canAnswer · MK-ST-F-031 valueOn
 *               MK-ST-F-032 unitsOn
 *
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-ST-F-006 canAnswer · MK-NW-O-008 thePerformance
 *               MK-ST-F-032 unitsOn · MK-ST-F-031 valueOn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-033
 * Changed ..... 2026-08-18 (3bd88c8)
 */
export function onOrBefore<T extends { date: string }>(days: T[], date: string): T | null {
  let best: T | null = null;
  for (const d of days) if (d.date <= date && (!best || d.date > best.date)) best = d;
  return best;
}

/** The first date the record covers — so a change figure can say what it is measured FROM, rather
 *  than presenting a figure measured from install day as though it covered the year. */
/* ─ MK-ST-F-034 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * firstDate
 *
 * Answers ..... The first date the record covers — so a change figure can say what it is measured FROM, rather than presenting a figure measured from install day as though it covered the year.
 *
 * Formula .....
 *     days.reduce((a, b) => (date < date ? a : b)).date   if count of days
 *     nothing   otherwise
 *
 * Called by ... MK-ST-F-004 coverageFor · MK-ST-F-005 measuredFromLabel
 *               MK-ST-F-006 canAnswer · MK-ST-F-035 covers
 *
 * Reaches ..... 83 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-211 DEBTS · MK-CF-F-201 INCOME
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-210 annualOfSource
 *               MK-CF-F-143 annualisedGross · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-O-001 basePay · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               … and 65 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-034
 * Changed ..... 2026-08-18 (3bd88c8)
 */
export function firstDate<T extends { date: string }>(days: T[]): string | null {
  return days.length ? days.reduce((a, b) => (a.date < b.date ? a : b)).date : null;
}

/** Does the record actually cover this window? A return quoted over a period we cannot see is a
 *  return measured over some other period with a misleading label. */
/* ─ MK-ST-F-035 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * covers
 *
 * Answers ..... Does the record actually cover this window?
 *
 * Formula .....
 *     f = first date(days)
 *     the answer = f ≠ nothing and f ≤ from
 *
 * Called by ... MK-CF-F-142 monthsOf · MK-CF-O-001 basePay
 *               MK-ST-F-072 undo
 *
 * Reaches ..... 79 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-211 DEBTS · MK-CF-F-201 INCOME
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-210 annualOfSource
 *               MK-CF-F-143 annualisedGross · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-O-001 basePay · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               … and 61 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-031 daily and monthly snapshots
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-035
 * Changed ..... 2026-08-18 (3bd88c8)
 */
export function covers(days: SnapshotDay[], from: string): boolean {
  const f = firstDate(days);
  return f != null && f <= from;
}

// ── the outside check ───────────────────────────────────────────────────────────────────────────
/** Our figure against the broker's own stated total. This is the only external check the app ever
 *  gets, and it is worth surfacing rather than silently disagreeing with a statement. */
/* ─ MK-ST-F-036 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * reconcile
 *
 * Answers ..... ── the outside check ─────────────────────────────────────────────────────────────────────────── Our figure against the broker's own stated total.
 *
 * Formula .....
 *     theirs = day.accounts.find((a) => account id = acc id).stated total (or nothing when missing)
 *     the answer:
 *     ours = ours
 *     theirs = theirs
 *     difference = nothing   if theirs = nothing
 *     ours − theirs   otherwise
 *
 * Called by ... MK-CF-F-177 wageGrossByMonth · MK-XS-F-028 surplusByMonth
 *
 * Reaches ..... 90 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-CF-F-199 ROOM
 *               MK-CF-F-202 TAX · MK-NW-F-100 TREND
 *               MK-CF-F-215 YEAR · MK-CF-F-026 actualDebtPayment
 *               … and 72 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-031 daily and monthly snapshots
 *
 * Decides .....
 *     · If cash is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-036
 * Changed ..... 2026-08-18 (3bd88c8)
 */
export function reconcile(day: SnapshotDay, accId: string): { ours: number; theirs: number | null; difference: number | null } {
  const ours = (
    day.holdings.filter((h) => h.accountId === accId).reduce((t, h) => t + h.value, 0) +
    (day.accounts.find((a) => a.accountId === accId)?.cash ?? 0));
  const theirs = day.accounts.find((a) => a.accountId === accId)?.statedTotal ?? null;
  return { ours, theirs, difference: theirs == null ? null : (ours - theirs) };
}

// ── the later cloud sync ────────────────────────────────────────────────────────────────────────
/** Everything not yet uploaded, oldest first. Because rows are append-only with stable ids, a sync
 *  is a plain upload with no merging: send these, remember the last date sent, continue. Sending a
 *  row twice is harmless. */
/* ─ MK-ST-F-037 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * pendingUpload
 *
 * Answers ..... ── the later cloud sync ──────────────────────────────────────────────────────────────────────── Everything not yet uploaded, oldest first.
 *
 * Formula .....
 *     days where last uploaded is missing (or date > last uploaded when missing or zero)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-031 daily and monthly snapshots
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-037
 * Changed ..... 2026-08-18 (3bd88c8)
 */
export function pendingUpload(days: SnapshotDay[], lastUploaded: string | null): SnapshotDay[] {
  return days.filter((d) => !lastUploaded || d.date > lastUploaded);
}


import { round2 } from './money';