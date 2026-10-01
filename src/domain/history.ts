// PRD F1#15 — the FUNCTION-OWNED, versioned net-worth history. Before this module the monthly
// snapshots were an untyped Record<string, any> blob written by a screen effect and read
// loosely by two screens; trend math stood on unchecked fields. Now: ONE typed shape with a
// version stamp, ONE writer helper (the Home freeze effect calls it), ONE reader that
// normalizes legacy blobs and drops garbage instead of charting it.

export const SNAPSHOT_VERSION = 1 as const;

export interface AccountSnap {
  id: string; label: string; kind: string | null;
  bucket: string; institution: string | null; balance: number;
}
export interface DebtSnap { id: string; label: string; type: string; balance: number; apr: number }

export interface MonthlySnapshot {
  v: typeof SNAPSHOT_VERSION;
  month: string;                 // 'YYYY-MM' — the cell's identity
  net_worth: number;
  gross_assets: number;
  gross_debt: number;
  income_net: number;
  spending: number;
  debt_paid: number;
  savings: number;
  allocated: number;
  planned_budget: number;
  savings_rate: number;          // integer percent
  by_category: Record<string, number>;
  assets: AccountSnap[];
  debts: DebtSnap[];
  captured_at: string;           // ISO
}

// ── daily net-worth points (founder approval 2026-07-19: "go with daily snapshot change now") ──
// A lean 'YYYY-MM-DD' → net-worth map captured once per app-open day, so the trend graph draws
// within DAYS of first use instead of waiting two month-ends. Monthly snapshots stay the deep,
// typed record; dailies are just chart points. Retention is bounded (see DAILY_KEEP).
export const DAILY_KEEP = 400;
export interface TrendPoint { key: string; nw: number }   // key 'YYYY-MM' (month-end) or 'YYYY-MM-DD'

/** Chart series = monthly snapshots + daily points, chronological ('YYYY-MM' sorts before its days). */
/* ─ MK-XS-F-005 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * trendPoints
 *
 * Answers ..... Chart series = monthly snapshots + daily points, chronological ('YYYY-MM' sorts before its days).
 *
 * Formula .....
 *     pts = for each of read history(monthly): key = month
 *     nw = net worth
 *     the answer = pts.sort((a, b) => key.locale compare(key))
 *
 * Called by ... MK-NW-O-003 theNetWorth
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-O-003 theNetWorth
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-031 daily and monthly snapshots
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-005
 * Changed ..... 2026-07-19 (6c94acf)
 */
export function trendPoints(
  monthly: Record<string, unknown> | null | undefined,
  daily: Record<string, unknown> | null | undefined,
): TrendPoint[] {
  const pts: TrendPoint[] = readHistory(monthly).map((s) => ({ key: s.month, nw: s.net_worth }));
  for (const [k, v] of Object.entries(daily ?? {})) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(k) && typeof v === 'number' && Number.isFinite(v)) pts.push({ key: k, nw: (v) });
  }
  return pts.sort((a, b) => a.key.localeCompare(b.key));
}

/** Prune helper for the store writer: newest DAILY_KEEP days survive. */
/* ─ MK-XS-F-006 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * pruneDaily
 *
 * Answers ..... Prune helper for the store writer: newest DAILY_KEEP days survive.
 *
 * Formula .....
 *     keys = the names in daily, in order
 *     daily   when keys.length ≤ DAILY_KEEP
 *     keep = a list with no repeats of keys.slice(-DAILY_KEEP)
 *     the answer = object.from entries(object.entries(daily).filter(([k]) => keep.has(k)))
 *
 * Called by ... MK-XS-F-175 uid
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
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-006
 * Changed ..... 2026-07-19 (6c94acf)
 */
export function pruneDaily(daily: Record<string, number>): Record<string, number> {
  const keys = Object.keys(daily).sort();
  if (keys.length <= DAILY_KEEP) return daily;
  const keep = new Set(keys.slice(-DAILY_KEEP));
  return Object.fromEntries(Object.entries(daily).filter(([k]) => keep.has(k)));
}

/* ─ MK-XS-F-121 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * isYm
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     the answer = true when the text is exactly 'YYYY-MM'
 *
 * Called by ... MK-XS-F-008 normalizeSnapshot
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-XS-F-008 normalizeSnapshot
 *               MK-XS-F-009 readHistory · MK-NW-O-003 theNetWorth
 *               MK-XS-F-005 trendPoints
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-121
 * Changed ..... not in git yet (—)
 */
const isYm = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}$/.test(s);
/* ─ MK-XS-F-122 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * n
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     v   if typeof v = 'number' and number.is finite(v)
 *     fallback   otherwise
 *
 * Called by ... MK-CF-F-028 loanPayment · MK-CF-F-129 round4
 *               MK-CF-F-155 cash · MK-CF-F-189 essentialsFromLoggedSpending
 *               MK-CF-O-001 basePay · MK-HM-F-006 money0
 *               MK-NW-F-026 accountDisplayNames · MK-NW-F-060 approxYTM
 *               MK-NW-F-069 priceAtYield · MK-PF-F-006 capGains
 *               MK-PL-F-033 educationPlan · MK-PL-F-050 simulate
 *               MK-PL-F-079 numOrZero · MK-ST-F-021 toNumber
 *               MK-ST-F-049 formatMoney · MK-ST-F-050 formatMoneyCents
 *               MK-ST-F-051 moneyCompact · MK-ST-F-052 toNum
 *               MK-ST-F-053 money · MK-ST-F-054 money2
 *               MK-ST-F-058 numberOrUndefined · MK-XS-F-007 makeMonthlySnapshot
 *               MK-XS-F-008 normalizeSnapshot · MK-XS-F-131 toInt
 *               MK-XS-F-171 numOrNaN · MK-XS-F-175 uid
 *
 * Reaches ..... 307 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-NW-F-081 LB · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-NW-F-078 ONE · MK-CF-O-011 PAY
 *               … and 289 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-122
 * Changed ..... not in git yet (—)
 */
const n = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/** The ONE writer — stamps the version and keeps the arithmetic identity by construction. */
/* ─ MK-XS-F-007 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * makeMonthlySnapshot
 *
 * Answers ..... The ONE writer — stamps the version and keeps the arithmetic identity by construction.
 *
 * Formula .....
 *     net worth = gross assets − gross debt
 *     v = the snapshot version
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-007
 * Changed ..... 2026-07-15 (980516a)
 */
export function makeMonthlySnapshot(i: Omit<MonthlySnapshot, 'v' | 'net_worth'> & { net_worth?: number }): MonthlySnapshot {
  return {
    ...i,
    v: SNAPSHOT_VERSION,
    // the identity is structural: net worth IS assets − debt (never a third number)
    net_worth: (n(i.gross_assets) - n(i.gross_debt)),
  };
}

/** Normalize ONE stored entry: v1 passes validated; a legacy blob (no `v`) maps best-effort;
 *  anything without a real month + net worth is dropped (null), never charted. */
/* ─ MK-XS-F-008 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * normalizeSnapshot
 *
 * Answers ..... Normalize ONE stored entry: v1 passes validated; a legacy blob (no `v`) maps best-effort; anything without a real month + net worth is dropped (null), never charted.
 *
 * Formula .....
 *     nothing   when raw = nothing (or raw is not a object when missing or zero)
 *     r = raw as record<string, unknown>
 *     month = month as string   if is ym(month)
 *     ym   if is ym(ym)
 *     nothing   otherwise   otherwise
 *     nothing   when month is missing
 *     gross assets = n(gross assets, na n)
 *     gross debt = n(gross debt, na n)
 *     net worth = n(net worth, number.is finite(gross assets − gross debt) ? (gross assets − gross debt) : na n)
 *     nothing   when !number.is finite(net worth)
 *
 * Called by ... MK-XS-F-009 readHistory
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-XS-F-009 readHistory
 *               MK-NW-O-003 theNetWorth · MK-XS-F-005 trendPoints
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-008
 * Changed ..... 2026-07-15 (980516a)
 */
export function normalizeSnapshot(ym: string, raw: unknown): MonthlySnapshot | null {
  if (raw == null || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const month = isYm(r.month) ? (r.month as string) : isYm(ym) ? ym : null;
  if (!month) return null;
  const grossAssets = n(r.gross_assets, NaN);
  const grossDebt = n(r.gross_debt, NaN);
  const netWorth = n(r.net_worth, Number.isFinite(grossAssets - grossDebt) ? (grossAssets - grossDebt) : NaN);
  if (!Number.isFinite(netWorth)) return null;
  return {
    v: SNAPSHOT_VERSION,
    month,
    net_worth: netWorth,
    gross_assets: Number.isFinite(grossAssets) ? grossAssets : netWorth,
    gross_debt: Number.isFinite(grossDebt) ? grossDebt : 0,
    income_net: n(r.income_net),
    spending: n(r.spending),
    debt_paid: n(r.debt_paid),
    savings: n(r.savings),
    allocated: n(r.allocated),
    planned_budget: n(r.planned_budget),
    savings_rate: n(r.savings_rate),
    by_category: (r.by_category && typeof r.by_category === 'object' ? r.by_category : {}) as Record<string, number>,
    assets: Array.isArray(r.assets) ? (r.assets as AccountSnap[]) : [],
    debts: Array.isArray(r.debts) ? (r.debts as DebtSnap[]) : [],
    captured_at: typeof r.captured_at === 'string' ? r.captured_at : '',
  };
}

/** The ONE reader every history surface uses: normalized, garbage-free, sorted by month. */
/* ─ MK-XS-F-009 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * readHistory
 *
 * Answers ..... The ONE reader every history surface uses: normalized, garbage-free, sorted by month.
 *
 * Formula .....
 *     for each stored month: normalize snapshot(month, value); drop the unreadable ones; sort by month, oldest first
 *
 * Called by ... MK-XS-F-005 trendPoints
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-O-003 theNetWorth
 *               MK-XS-F-005 trendPoints
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-031 daily and monthly snapshots
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-009
 * Changed ..... 2026-08-05 (db8f3c8)
 */
export function readHistory(raw: Record<string, unknown> | null | undefined): MonthlySnapshot[] {
  return Object.entries(raw ?? {})
    .map(([ym, v]) => normalizeSnapshot(ym, v))
    .filter((x): x is MonthlySnapshot => x != null)
    .sort((a, b) => (a.month < b.month ? -1 : 1));
}

/** FOUNDER RULE 2026-08-04: the NW change PERCENT is measured on cash + investments only —
 *  property values move only when someone retypes them, so a total-net-worth percent is noise.
 *  Baseline = the earliest invDaily point on/after the change line's own baseline date; the
 *  percent exists ONLY when that history exists (never back-guessed). Returns % (1dp) or null. */
/* ─ MK-XS-F-010 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * investableChangePct
 *
 * Answers ..... FOUNDER RULE 2026-08-04: the NW change PERCENT is measured on cash + investments only — property values move only when someone retypes them, so a total-net-worth percent is noise.
 *
 * Formula .....
 *     nothing   when since key is missing (or not (current investable > 0) when missing or zero)
 *     base = (inv daily as any)[base key]   if base key ≠ nothing
 *     nothing   otherwise
 *     nothing   when base is not a number (or not (base > 0) when missing or zero)
 *     the answer = ((current investable − base) ÷ base) × 100
 *
 * Called by ... MK-NW-F-101 PLAN · MK-NW-O-003 theNetWorth
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-O-003 theNetWorth
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-010
 * Changed ..... 2026-08-05 (db8f3c8)
 */
export function investableChangePct(
  invDaily: Record<string, unknown> | null | undefined,
  currentInvestable: number,
  sinceKey: string | null | undefined,
): number | null {
  if (!sinceKey || !(currentInvestable > 0)) return null;
  // a daily key compares lexically against either baseline form ('YYYY-MM' or 'YYYY-MM-DD')
  const baseKey = Object.keys(invDaily ?? {})
    .filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k) && k >= sinceKey)
    .sort()[0];
  const base = baseKey != null ? (invDaily as any)[baseKey] : null;
  if (typeof base !== 'number' || !(base > 0)) return null;
  // Q49 (2026-09-09): full precision here — it used to round to one decimal INSIDE the function, so the
  // screen's two decimals (founder 2026-09-14) printed +0.50% for a real +0.53%. Rounding happens at display.
  return ((currentInvestable - base) / base) * 100;
}

/** THE CHANGE WALK (founder-approved final mock, 2026-08-04) — what drove the net-worth change,
 *  in the founder's structure. The rows ALWAYS sum to the ending value, by construction:
 *  beginning + contributions − withdrawals + wealth generated + debt principal = ending.
 *  Wealth generated splits into dividends + interest + change in investment value; whatever the
 *  ledger cannot explain lands in that last line rather than being silently dropped. */
export interface ChangeWalk {
  fromLabel: string; toLabel: string;
  beginning: number; contributions: number; withdrawals: number;
  wealthGenerated: number; dividends: number; interest: number; marketChange: number;
  debtPrincipal: number; ending: number;
}
/* ─ MK-XS-F-011 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * buildChangeWalk
 *
 * Answers ..... My net worth changed since last time — what actually caused it?
 *
 * Formula .....
 *     contributions = max(0, args.contributions (or 0 when missing))
 *     withdrawals = max(0, args.withdrawals (or 0 when missing))
 *     dividends = max(0, args.dividends (or 0 when missing))
 *     interest = max(0, args.interest (or 0 when missing))
 *     debt principal = max(0, args.debt principal (or 0 when missing))
 *     total = args.ending − args.beginning
 *     wealth generated = total − contributions + withdrawals − debt principal
 *     market change = wealth generated − dividends − interest
 *
 * Called by ... MK-NW-O-008 thePerformance
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · If contributions is missing it uses 0.
 *     · If withdrawals is missing it uses 0.
 *     · If dividends is missing it uses 0.
 *     · If interest is missing it uses 0.
 *     · If debt principal is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-011
 * Changed ..... 2026-08-09 (cd7fd4a)
 */
export function buildChangeWalk(args: {
  beginning: number; ending: number; fromLabel: string; toLabel: string;
  contributions?: number; withdrawals?: number; dividends?: number; interest?: number; debtPrincipal?: number;
}): ChangeWalk {
  const contributions = Math.max(0, args.contributions ?? 0);
  const withdrawals = Math.max(0, args.withdrawals ?? 0);
  const dividends = Math.max(0, args.dividends ?? 0);
  const interest = Math.max(0, args.interest ?? 0);
  const debtPrincipal = Math.max(0, args.debtPrincipal ?? 0);
  const total = (args.ending - args.beginning);
  // the residual IS market movement — the walk must reach the ending value exactly
  const wealthGenerated = (total - contributions + withdrawals - debtPrincipal);
  const marketChange = (wealthGenerated - dividends - interest);
  return {
    fromLabel: args.fromLabel, toLabel: args.toLabel,
    beginning: (args.beginning), contributions, withdrawals,
    wealthGenerated, dividends, interest, marketChange, debtPrincipal,
    ending: (args.ending),
  };
}
