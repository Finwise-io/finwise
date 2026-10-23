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
 * Called by ... MK-NW-F-104 closedWith · MK-NW-F-149 withoutBlankRows
 *               MK-NW-O-001 theBonds · MK-NW-O-006 theHolding
 *               MK-ST-F-081 timeWeightedReturn · MK-ST-F-083 accountValuesOn
 *               MK-ST-F-084 fillBetweenObservations · MK-ST-F-093 typedValueOnItsDate
 *               MK-XS-F-108 activityKey · MK-XS-F-109 dedupeActivities
 *               MK-XS-F-147 call · MK-XS-F-149 allActivities
 *               MK-XS-F-175 uid
 *
 * Reaches ..... 305 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               … and 287 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-068 how a linked bond's price is quoted — per $100 of face value, or per unit like a share
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
    // how a linked bond's price is quoted (MK-XS-I-068): per $100 of face, value = units × price ÷ 100
    price_quote?: 'per_100_of_face' | 'unclear';
    lots?: Array<{ shares?: number; cost_per_share?: number | null }>;
    /** the value the account's balance was last built from (the store's recomputeBalances) — dollars, as held */
    value_now?: number | null;
  }> | null;
}
/** The value one unit × one price stands for — a hundredth for a bond quoted per $100 of face (MK-XS-I-068, 2026-10-20),
 *  else one. Written here because this engine reads the stored shape and imports nothing from the app; the app's contract
 *  multiplier (MK-PF-F-031) asks this, so the daily record and every screen read one rule. */
/* ─ MK-ST-F-091 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * unitWorth
 *
 * Answers ..... The value one unit × one price stands for — a hundredth for a bond quoted per $100 of face (MK-XS-I-068, 2026-10-20), else one.
 *
 * Formula .....
 *     1 ÷ 100   if price quote = 'per_100_of_face'
 *     1   otherwise
 *
 * Called by ... MK-PF-F-031 contractMultiplier · MK-ST-F-028 buildDayFromAccounts
 *
 * Reaches ..... 333 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               … and 315 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-068 how a linked bond's price is quoted — per $100 of face value, or per unit like a share
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-091
 * Changed ..... not in git yet (—)
 */
export const unitWorth = (p: { price_quote?: string }): number => (p.price_quote === 'per_100_of_face' ? 1 / 100 : 1);

/** Is what was paid for this purchase on record — a cost per share above zero? THE ONE RULE for reading a cost (2026-10-20;
 *  DEC-6627, tenet 4): a missing cost, and the $0 that a blank cost in the holding editor saved and a sync wrote for a
 *  missing one until 2026-10-20, are both not on record — never a real $0. Written here, beside unitWorth and for the same
 *  reason: this engine imports nothing from the app, and the app (MK-PF-F-* lotCostOnRecord, src/domain/performance)
 *  re-exports this one, so the daily record and every screen read a cost one way (moved here 2026-10-21). */
/* ─ MK-ST-F-092 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * lotCostOnRecord
 *
 * Answers ..... Is what was paid for this purchase on record — a cost per share above zero?
 *
 * Formula .....
 *     c = lot.cost per share
 *     the answer = typeof c = 'number' and number.is finite(c) and c > 0
 *
 * Called by ... MK-NW-F-143 gainRowBetween · MK-NW-O-006 theHolding
 *               MK-PF-F-006 capGains · MK-PF-F-035 unknownFigure
 *               MK-PF-F-051 paidOnRecord · MK-PF-F-067 purchaseDays
 *               MK-PF-F-073 sharesThroughWindow · MK-ST-F-028 buildDayFromAccounts
 *               MK-ST-F-091 unitWorth · MK-XS-F-102 ingestSync
 *               MK-XS-F-184 theirCost
 *
 * Reaches ..... 334 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               … and 316 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-007 purchase price and date (per lot)
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-092
 * Changed ..... not in git yet (—)
 */
export function lotCostOnRecord(lot: { cost_per_share?: number | null } | null | undefined): boolean {
  const c = lot?.cost_per_share;
  return typeof c === 'number' && Number.isFinite(c) && c > 0;
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
 *     mine = []
 *     unknown worth = false
 *     units = Σ over lots (or none when missing) of (shares (or 0 when missing or zero))
 *     held = lots (or none when missing) where (shares or 0) > 0
 *     counted = held where lot cost on record(each)
 *     basis = Σ over counted.length ? counted of ((shares as number) × (cost per share as number)): nothing
 *     the answer:
 *     date = date
 *     holdings = holdings
 *     accounts = accts
 *     origin = 'observed'
 *     written at = written at
 *
 * Called by ... MK-NW-O-003 theNetWorth · MK-NW-O-008 thePerformance
 *               MK-ST-F-030 record · MK-ST-F-093 typedValueOnItsDate
 *               MK-XS-F-175 uid · MK-XS-F-192 typedValueDatedBack
 *
 * Reaches ..... 329 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               … and 311 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-031 daily and monthly snapshots
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-068 how a linked bond's price is quoted — per $100 of face value, or per unit like a share
 *
 * Decides .....
 *     · If balance is missing it uses 0.
 *     · If shares is missing it counts as zero, so nothing recorded and a real zero look the same.
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
    const mine: HoldingSnapshot[] = [];
    let unknownWorth = false;
    for (const p of ps) {
      const units = (p.lots ?? []).reduce((t, l) => t + (l.shares || 0), 0);
      if (!(units > 0) || !p.ticker) continue;
      // WHAT WAS PAID, READ ONE WAY (lotCostOnRecord, 2026-10-21): over the purchases whose price paid is on record. A cost
      // missing or saved at $0 added $0, so a holding with no price and no price paid on record was written as worth $0.
      const held = (p.lots ?? []).filter((l) => (l.shares || 0) > 0);
      const counted = held.filter((l) => lotCostOnRecord(l));
      const basis = counted.length ? counted.reduce((t, l) => t + (l.shares as number) * (l.cost_per_share as number), 0) : null;
      // the broker's mark when there is one; the honest cost fallback when there is not — the same rule pricing uses
      // everywhere (never $0 for an unpriced holding); with neither, the value the balance was last built from
      const value = p.last_price != null ? units * p.last_price * unitWorth(p)   // a bond quoted per $100 of face (MK-XS-I-068)
        : basis != null ? basis * unitWorth(p)
        : p.value_now ?? null;
      if (value == null) { unknownWorth = true; break; }
      mine.push({
        date, accountId: a.asset_id, securityKey: p.ticker, symbol: p.ticker,
        units, price: p.last_price ?? null, value, currency: 'USD',
      });
    }
    // A HOLDING WHOSE WORTH IS NOT KNOWN LEAVES ITS ACCOUNT OFF THE DAY (2026-10-21; tenet 3, unknown is not zero) — as a day
    // that cannot price one of an account's holdings always does (fillBetweenObservations; MK-ST-F-081 rule 2: a day that
    // is missing an account is not used for it). It was written as worth $0, a fall in Net worth's history that never happened.
    if (unknownWorth) continue;
    holdings.push(...mine);
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
/** THE FIRST DAY OF THE DAILY RECORD: two years back AND THE DAY BEFORE THAT.
 *
 *  A window's beginning is read at the close of the day BEFORE it opens (his ruling: "beginning value
 *  = close of the day before the start"). A two-year window opens two years back, so the day it reads
 *  is one day older than "two years of dailies" — and a record cut at exactly two years could never
 *  answer the longest window the screen offers. Found 2026-10-03: a linked account's rebuilt history
 *  stopped one day short, so 2Y showed a figure only by working the beginning backwards from today's
 *  prices, which is the thing B-98 forbids. One definition, used by the prune and by the rebuild. */
/* ─ MK-ST-F-079 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * dailyWindowStart
 *
 * Answers ..... THE FIRST DAY OF THE DAILY RECORD: two years back AND THE DAY BEFORE THAT.
 *
 * Formula .....
 *     cutoff = the first 10)}T12:00:00Z` of new date(`${today
 *     the answer = the first 10 of cutoff.to isostring()
 *
 * Called by ... MK-ST-F-029 prune · MK-XS-F-175 uid
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Reaches ..... 54 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PL-F-053 buildRetirementState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-038 debtsFromOnboarding · MK-XS-F-072 deleteAccount
 *               MK-XS-F-138 deriveKeyFromSecret · MK-CF-F-041 getDebtState
 *               MK-CF-F-052 getIncomeState · MK-XS-F-023 getProfileReadModel
 *               MK-ST-F-041 getUserDoc · MK-PL-F-013 goalsFromOnboarding
 *               … and 36 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-079
 * Changed ..... not in git yet (—)
 */
export function dailyWindowStart(today: string): string {
  const cutoff = new Date(`${today.slice(0, 10)}T12:00:00Z`);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - DAILY_YEARS);
  cutoff.setUTCDate(cutoff.getUTCDate() - 1);
  return cutoff.toISOString().slice(0, 10);
}
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
 *     cutoff key = daily window start(today)
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
  const cutoffKey = dailyWindowStart(today);
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
 * Called by ... MK-CF-F-211 DEBTS · MK-NW-F-075 ACC
 *               MK-NW-F-083 PERF · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-088 BENCH · MK-NW-F-127 gainOfRow
 *               MK-NW-F-139 leftOutValueOf · MK-NW-F-143 gainRowBetween
 *               MK-NW-F-144 beforeTheRecordSentence · MK-NW-F-146 undatedGainSentence
 *               MK-NW-F-167 COMPARE · MK-NW-F-171 listedShares
 *               MK-NW-O-002 theAccount · MK-NW-O-003 theNetWorth
 *               MK-NW-O-004 theEmergencyFund · MK-NW-O-006 theHolding
 *               MK-NW-O-008 thePerformance · MK-PF-F-005 unrealizedGain
 *               MK-PF-F-006 capGains · MK-PF-F-013 benchmarkTicker
 *               MK-PF-F-014 buildPerformance · MK-PF-F-028 realizedFromLedger
 *               MK-PF-F-029 closeAsOf · MK-PF-F-039 periodReturnParts
 *               MK-PF-F-046 saleShortOfPurchasesSentence · MK-PF-F-053 isBroadIndexOption
 *               MK-PF-F-055 valueAtClose · MK-PF-F-056 purchasePieces
 *               MK-PF-F-058 gainOnPartSentence · MK-PF-F-064 purchasesHeld
 *               MK-PF-F-067 purchaseDays · MK-PF-F-072 tradesAfter
 *               MK-PF-F-076 firstEvent · MK-ST-F-012 toLedgerRow
 *               MK-ST-F-081 timeWeightedReturn · MK-ST-F-087 readingOf
 *               MK-ST-F-093 typedValueOnItsDate · MK-XS-F-009 readHistory
 *               MK-XS-F-102 ingestSync · MK-XS-F-127 toIsoDate
 *               MK-XS-F-174 recomputeBalances · MK-XS-F-184 theirCost
 *               MK-XS-F-188 fixStoredFees · MK-XS-F-192 typedValueDatedBack
 *
 * Reaches ..... 328 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               … and 310 more — the full list is on functions_from_code
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

/** One day a typed value was moved onto: what the record said the account was worth that day, and what it says now. */
export interface TypedValueMove { date: string; was: number; now: number }

/** A VALUE TYPED WITH AN EARLIER "VALUE AS OF" DATE BELONGS ON THAT DATE (2026-10-20).
 *
 *  The daily record is written from the accounts as they stand on the day it is written, so a value the person types
 *  today from a statement dated Sep 30 was booked as a change TODAY: a Treasury recorded at $24,650 and retyped on
 *  Oct 20 at $24,900 "as of Sep 30" read +$250 earned in October, and September read nothing.
 *
 *  So the value is written where the person dated it: walking back from the latest recorded day to the as-of date, each
 *  recorded day that still holds the value being replaced is superseded by a new row carrying the new value
 *  (append-only: a correction is a new row, never an edit — `record` keeps the latest belief about each day). Four
 *  limits, each the record's own rule:
 *    · only days the record already holds the account on. Nothing is written before the account's first recorded day,
 *      and no day is invented — a day nobody recorded stays unrecorded (DEC-0230: "We never back-fill a year we didn't
 *      record"). Where the as-of day itself was not recorded, the value starts on the first recorded day after it.
 *    · the walk stops at the first day that holds a DIFFERENT value — the value before a sale, or an earlier value the
 *      person typed. A sale of $5,000 on Oct 5 leaves Sep 30 to Oct 4 at the value before the sale; writing the new
 *      value over them would turn the sale into a $5,000 gain. `replacing` is the account as it stood before the save;
 *      without it, the value replaced is the one the latest recorded day holds.
 *    · a typed balance only — an account built by hand with no holdings. A linked account's value is the broker's,
 *      and a day that recorded holdings for the account is priced by those holdings, so neither is touched.
 *    · a date that is not a calendar day, or one after today, moves nothing.
 *  The account's row is written by the same builder every day is written by (buildDayFromAccounts), so a typed cash
 *  balance lands in cash and any other typed balance in typedValue, exactly as a day written today would hold it.
 *  Returns the days and each day moved (oldest first), so the one-number daily totals kept beside the record can move
 *  by the same amounts. */
/* ─ MK-ST-F-093 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * typedValueOnItsDate
 *
 * Answers ..... A VALUE TYPED WITH AN EARLIER "VALUE AS OF" DATE BELONGS ON THAT DATE (2026-10-20).
 *
 * Formula .....
 *     as of = string(account.value as of ?? '')
 *     ms = date.parse(`${as of}T00:00:00Z`)
 *     is day = ÷ ^\d{4}-\d{2}-\d{2}$ ÷ .test(as of) and !number.is na n(ms) and new date(ms).to isostring().slice(0, 10) = as of
 *     the answer:
 *     days = days
 *     moved = []
 *     id = string(account.asset id)
 *     row of = (d: snapshot day) => (accounts ?? []).find((r) => string(account id) = id)
 *     same = (a: account snapshot, b: account snapshot) => cash = cash and (typed value ?? nothing) = (typed value ?? nothing)
 *     row = the first of build day from accounts([account], as of, written at).accounts
 *     in reach = [...(days ?? [])] where date ≥ as of and date ≤ today.sort((a, b) => date.locale compare(date))
 *     latest = for each of in reach: row of.find((r) => r ≠ nothing)
 *     old = the first of build day from accounts([{ ...replacing, asset id: id }], as of, written at).accounts   if replacing
 *     latest   otherwise
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-XS-F-174 recomputeBalances · MK-XS-F-192 typedValueDatedBack
 *
 * Reaches ..... 305 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               … and 287 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-031 daily and monthly snapshots
 *               MK-XS-I-033 the date a hand-typed value was set
 *
 * Decides .....
 *     · If typed value is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-093
 * Changed ..... not in git yet (—)
 */
export function typedValueOnItsDate(
  days: SnapshotDay[], account: AccountLike & { value_as_of?: string | null },
  today: string, writtenAt: string, replacing?: AccountLike | null,
): { days: SnapshotDay[]; moved: TypedValueMove[] } {
  const asOf = String(account?.value_as_of ?? '');
  const ms = Date.parse(`${asOf}T00:00:00Z`);
  const isDay = /^\d{4}-\d{2}-\d{2}$/.test(asOf) && !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === asOf;
  if (!account || !isDay || asOf > today || account.source === 'connected' || (account.positions ?? []).length > 0) {
    return { days, moved: [] };
  }
  const id = String(account.asset_id);
  const rowOf = (d: SnapshotDay) => (d.accounts ?? []).find((r) => String(r.accountId) === id);
  const same = (a: AccountSnapshot, b: AccountSnapshot) => a.cash === b.cash && (a.typedValue ?? null) === (b.typedValue ?? null);
  const row = buildDayFromAccounts([account], asOf, writtenAt).accounts[0];
  const inReach = [...(days ?? [])].filter((d) => d.date >= asOf && d.date <= today).sort((a, b) => b.date.localeCompare(a.date));
  // the value being replaced: the account before the save, else what the latest recorded day holds for it
  const latest = inReach.map(rowOf).find((r) => r != null);
  const old = replacing ? buildDayFromAccounts([{ ...replacing, asset_id: id }], asOf, writtenAt).accounts[0] : latest;
  if (!old) return { days, moved: [] };
  const now = row.cash + (row.typedValue ?? 0);
  let out = days;
  const moved: TypedValueMove[] = [];
  for (const d of inReach) {
    const held = rowOf(d);
    if (!held || (d.holdings ?? []).some((h) => String(h.accountId) === id) || !same(held, old)) break;
    if (same(held, row)) continue;
    out = record(out, {
      ...d, writtenAt,
      accounts: d.accounts.map((r) => (String(r.accountId) === id
        ? { ...r, cash: row.cash, typedValue: row.typedValue, statedTotal: row.statedTotal } : r)),
    });
    moved.unshift({ date: d.date, was: held.cash + (held.typedValue ?? 0), now });
  }
  return { days: out, moved };
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
 *     each = account values on(day, in set)
 *     nothing   when each.size = 0
 *     total = 0; for (const v of each.values()) total += v
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-NW-F-103 investmentRecordDates · MK-NW-O-008 thePerformance
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-103 investmentRecordDates
 *               MK-NW-O-008 thePerformance
 *
 * Serves ...... MK-PF-M-001 · MK-PF-M-004
 * Reads ....... MK-XS-I-031 daily and monthly snapshots
 * Ruled by .... DEC-0046 · DEC-0063 · DEC-0229
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
 *
 * Decides .....
 *     · Uses a built-in total of 0.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-031
 * Changed ..... 2026-08-20 (9f201fb)
 */
export function valueOn(days: SnapshotDay[], accountIds: Set<string>, date: string): number | null {
  const day = onOrBefore(days, date);
  if (!day) return null;
  const inSet = (id: string) => accountIds.size === 0 || accountIds.has(id);
  const each = accountValuesOn(day, inSet);
  if (each.size === 0) return null;
  let total = 0; for (const v of each.values()) total += v;
  return total;
}

/** What each account was worth on one recorded day: its holdings, its cash and its typed balance added up — and, for an account the record holds nothing else for, the broker's own stated total. */
/* ─ MK-ST-F-083 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * accountValuesOn
 *
 * Answers ..... What each account was worth on one recorded day: its holdings, its cash and its typed balance added up — and, for an account the record holds nothing else for, the broker's own stated total.
 *
 * Formula .....
 *     out = new map<string, number>()
 *     held = new set<string>()
 *     own = cash + (typed value ?? 0)
 *     value = stated total as number   if !held.has(account id) and own = 0 and (stated total ?? 0) > 0
 *     own   otherwise
 *     the answer = out
 *
 * Called by ... MK-NW-O-008 thePerformance · MK-ST-F-031 valueOn
 *               MK-ST-F-081 timeWeightedReturn
 *
 * Reaches ..... 12 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-082 NW · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-103 investmentRecordDates · MK-NW-O-003 theNetWorth
 *               MK-NW-O-008 thePerformance · MK-ST-F-081 timeWeightedReturn
 *               MK-NW-F-185 valueChanged · MK-ST-F-031 valueOn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-031 daily and monthly snapshots
 *
 * Decides .....
 *     · If typed value is missing it uses 0.
 *     · If stated total is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-083
 * Changed ..... not in git yet (—)
 */
export function accountValuesOn(day: SnapshotDay, wanted: (accountId: string) => boolean): Map<string, number> {
  const out = new Map<string, number>();
  const held = new Set<string>();
  for (const h of day.holdings ?? []) if (wanted(h.accountId)) { out.set(h.accountId, (out.get(h.accountId) ?? 0) + h.value); held.add(h.accountId); }
  for (const a of day.accounts ?? []) {
    if (!wanted(a.accountId)) continue;
    const own = a.cash + (a.typedValue ?? 0);
    // A LINKED ACCOUNT THAT REPORTS A BALANCE AND NOTHING ELSE (found 2026-10-04, building the
    // time-weighted return). Some institutions send no holdings and no cash figure — only the total.
    // The record then held cash 0 and no holdings, so the account read as worth $0 on every day, and
    // a return measured to today read −100%. Its value is the total the broker stated.
    const value = !held.has(a.accountId) && own === 0 && (a.statedTotal ?? 0) > 0 ? (a.statedTotal as number) : own;
    out.set(a.accountId, (out.get(a.accountId) ?? 0) + value);
  }
  return out;
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
 * Reaches ..... 10 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-ST-F-006 canAnswer
 *               MK-NW-F-103 investmentRecordDates · MK-NW-O-008 thePerformance
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
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-CF-F-026 actualDebtPayment
 *               MK-CF-F-210 annualOfSource · MK-CF-F-143 annualisedGross
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-O-001 basePay
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
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
 * Reaches ..... 78 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-CF-F-026 actualDebtPayment
 *               MK-CF-F-210 annualOfSource · MK-CF-F-143 annualisedGross
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-O-001 basePay
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               … and 60 more — the full list is on functions_from_code
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
 * Reaches ..... 320 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               … and 302 more — the full list is on functions_from_code
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