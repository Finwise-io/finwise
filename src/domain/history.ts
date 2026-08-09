// PRD F1#15 — the ENGINE-OWNED, versioned net-worth history. Before this module the monthly
// snapshots were an untyped Record<string, any> blob written by a screen effect and read
// loosely by two screens; trend math stood on unchecked fields. Now: ONE typed shape with a
// version stamp, ONE writer helper (the Home freeze effect calls it), ONE reader that
// normalizes legacy blobs and drops garbage instead of charting it.
import { round2 } from './_shared/num';

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
export function trendPoints(
  monthly: Record<string, unknown> | null | undefined,
  daily: Record<string, unknown> | null | undefined,
): TrendPoint[] {
  const pts: TrendPoint[] = readHistory(monthly).map((s) => ({ key: s.month, nw: s.net_worth }));
  for (const [k, v] of Object.entries(daily ?? {})) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(k) && typeof v === 'number' && Number.isFinite(v)) pts.push({ key: k, nw: round2(v) });
  }
  return pts.sort((a, b) => a.key.localeCompare(b.key));
}

/** Prune helper for the store writer: newest DAILY_KEEP days survive. */
export function pruneDaily(daily: Record<string, number>): Record<string, number> {
  const keys = Object.keys(daily).sort();
  if (keys.length <= DAILY_KEEP) return daily;
  const keep = new Set(keys.slice(-DAILY_KEEP));
  return Object.fromEntries(Object.entries(daily).filter(([k]) => keep.has(k)));
}

const isYm = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}$/.test(s);
const n = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/** The ONE writer — stamps the version and keeps the arithmetic identity by construction. */
export function makeMonthlySnapshot(i: Omit<MonthlySnapshot, 'v' | 'net_worth'> & { net_worth?: number }): MonthlySnapshot {
  return {
    ...i,
    v: SNAPSHOT_VERSION,
    // the identity is structural: net worth IS assets − debt (never a third number)
    net_worth: round2(n(i.gross_assets) - n(i.gross_debt)),
  };
}

/** Normalize ONE stored entry: v1 passes validated; a legacy blob (no `v`) maps best-effort;
 *  anything without a real month + net worth is dropped (null), never charted. */
export function normalizeSnapshot(ym: string, raw: unknown): MonthlySnapshot | null {
  if (raw == null || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const month = isYm(r.month) ? (r.month as string) : isYm(ym) ? ym : null;
  if (!month) return null;
  const grossAssets = n(r.gross_assets, NaN);
  const grossDebt = n(r.gross_debt, NaN);
  const netWorth = n(r.net_worth, Number.isFinite(grossAssets - grossDebt) ? round2(grossAssets - grossDebt) : NaN);
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
  return Math.round(((currentInvestable - base) / base) * 1000) / 10;
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
export function buildChangeWalk(args: {
  beginning: number; ending: number; fromLabel: string; toLabel: string;
  contributions?: number; withdrawals?: number; dividends?: number; interest?: number; debtPrincipal?: number;
}): ChangeWalk {
  const contributions = Math.max(0, args.contributions ?? 0);
  const withdrawals = Math.max(0, args.withdrawals ?? 0);
  const dividends = Math.max(0, args.dividends ?? 0);
  const interest = Math.max(0, args.interest ?? 0);
  const debtPrincipal = Math.max(0, args.debtPrincipal ?? 0);
  const total = round2(args.ending - args.beginning);
  // the residual IS market movement — the walk must reach the ending value exactly
  const wealthGenerated = round2(total - contributions + withdrawals - debtPrincipal);
  const marketChange = round2(wealthGenerated - dividends - interest);
  return {
    fromLabel: args.fromLabel, toLabel: args.toLabel,
    beginning: round2(args.beginning), contributions, withdrawals,
    wealthGenerated, dividends, interest, marketChange, debtPrincipal,
    ending: round2(args.ending),
  };
}
