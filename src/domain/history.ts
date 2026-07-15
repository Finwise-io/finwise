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
