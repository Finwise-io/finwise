// Asset Ledger module (spec service 2). Owns `assets/{uid}`.
// Tracks balances + tax bucket + target return; provides total value & allocation.
import type { UserId, EntityId } from '../_shared/ids';
import { newEntityId } from '../_shared/ids';
import { toNum, round2 } from '../_shared/num';
import { getUserDoc, setUserDoc } from '../_shared/firestore';
import { emit } from '../_shared/eventBus';
import { employerMatchMonthly } from '../income/onboarding';

export type TaxBucket = 'CASH' | 'PRE_TAX' | 'ROTH' | 'TAXABLE' | 'PROPERTY';

export interface AssetAccount {
  asset_id: EntityId;
  label: string;                  // account name, e.g. "Chase Checking"
  institution?: string;           // e.g. "Chase", "Fidelity"
  kind?: string;                  // ASSET_KINDS id, e.g. 'checking','brokerage','401k','home'
  tax_bucket: TaxBucket;
  balance: number;
  target_return: number;          // annual, decimal (e.g. 0.07)
  change_amount?: number;         // net change this month (from savings allocations)
  change_month?: string;          // 'YYYY-MM' the change applies to
  retirement_pct?: number;        // 0–100, how much of this account is earmarked for retirement
                                  // (rest is for other goals); defaults per kind via earmarkDefault()
  actual_ttm?: number;            // user-reported ACTUAL trailing-12-month return (decimal), for
                                  // performance-vs-benchmark; null/undefined = not reported
  positions?: import('../performance').Position[];  // ticker holdings (lots); when present, this account's
                                  // value is DERIVED from live prices (balance is a refreshed cache)
  cash_balance?: number;          // uninvested cash sleeve in an investment account (a brokerage isn't 100%
                                  // invested). Account value = cash_balance + Σ(position market value).
  // Individual bond fields (Phase B) — present → this account is a bond; balance = current value.
  face_value?: number;            // par/face value (total)
  coupon_rate?: number;           // annual coupon, decimal (e.g. 0.045)
  maturity_date?: string;         // 'YYYY-MM-DD'
  origin?: 'onboarding';          // seeded from onboarding answers; re-seeding replaces ONLY these
                                  // rows (absent = user-created, never touched by seeding/restart)
}

/** Value-weighted ACTUAL trailing-12mo return across holdings that have one reported.
 *  Returns null when none are reported (so the UI can prompt instead of showing a fake 0%). */
export function portfolioActualReturn(accounts: AssetAccount[]): number | null {
  const items = (accounts ?? []).filter((a) => a.tax_bucket !== 'PROPERTY' && a.actual_ttm != null && earmarkedAmount(a) > 0);
  const total = items.reduce((t, a) => t + earmarkedAmount(a), 0);
  if (total <= 0) return null;
  const weighted = items.reduce((t, a) => t + (a.actual_ttm as number) * earmarkedAmount(a), 0);
  return Math.round((weighted / total) * 1e4) / 1e4;
}

/** Can this account hold individual ticker securities? (Excludes cash, property, and 529 —
 *  a 529 holds the plan's age-based portfolios, not individual stocks.) */
export function accountAllowsTicker(a: AssetAccount): boolean {
  if (a.tax_bucket === 'PROPERTY' || a.tax_bucket === 'CASH') return false;
  if (a.kind === 'college_529') return false;
  if (a.kind === 'checking' || a.kind === 'savings') return false;
  return true;
}

// Capture types for assets. `section` groups them on the Net Worth screen.
// `ret` = benchmark annual return (nominal). Where a clean 30-yr index series exists it's the real
// historical figure (see BENCHMARK_META for source/period); otherwise it's a flagged estimate.
export const ASSET_KINDS: { id: string; label: string; icon: string; bucket: TaxBucket; section: string; ret: number }[] = [
  { id: 'checking', label: 'Checking', icon: '💵', bucket: 'CASH', section: 'Cash', ret: 0.005 },
  { id: 'savings', label: 'Savings', icon: '🏦', bucket: 'CASH', section: 'Cash', ret: 0.024 },
  { id: 'brokerage', label: 'Brokerage', icon: '📊', bucket: 'TAXABLE', section: 'Investments', ret: 0.08 },
  { id: 'stocks_etf', label: 'Stocks / ETFs', icon: '📈', bucket: 'TAXABLE', section: 'Investments', ret: 0.104 },
  { id: 'fixed_income', label: 'Fixed income', icon: '📜', bucket: 'TAXABLE', section: 'Investments', ret: 0.042 },
  { id: 'private_equity', label: 'Private equity', icon: '🏢', bucket: 'TAXABLE', section: 'Investments', ret: 0.13 },
  { id: 'hedge_funds', label: 'Hedge funds', icon: '📊', bucket: 'TAXABLE', section: 'Investments', ret: 0.06 },
  { id: 'commodities', label: 'Gold / commodities', icon: '🥇', bucket: 'TAXABLE', section: 'Investments', ret: 0.082 },
  { id: 'crypto', label: 'Crypto', icon: '🪙', bucket: 'TAXABLE', section: 'Investments', ret: 0.08 },
  { id: 'annuities', label: 'Annuities', icon: '📃', bucket: 'TAXABLE', section: 'Investments', ret: 0.045 },
  { id: 'college_529', label: '529 / College', icon: '🎓', bucket: 'TAXABLE', section: 'Investments', ret: 0.07 },
  { id: '401k', label: '401(k)', icon: '🏛️', bucket: 'PRE_TAX', section: 'Retirement', ret: 0.079 },
  { id: 'trad_ira', label: 'Traditional IRA', icon: '🏛️', bucket: 'PRE_TAX', section: 'Retirement', ret: 0.079 },
  { id: 'roth_ira', label: 'Roth IRA', icon: '🌱', bucket: 'ROTH', section: 'Retirement', ret: 0.079 },
  { id: 'hsa', label: 'HSA', icon: '🩺', bucket: 'PRE_TAX', section: 'Retirement', ret: 0.079 },
  { id: 'home', label: 'Home', icon: '🏠', bucket: 'PROPERTY', section: 'Property', ret: 0.045 },
  { id: 'vehicle', label: 'Vehicle', icon: '🚗', bucket: 'PROPERTY', section: 'Property', ret: -0.05 },
  { id: 'other_asset', label: 'Other', icon: '📦', bucket: 'TAXABLE', section: 'Investments', ret: 0.05 },
];
export const ASSET_SECTIONS = ['Cash', 'Investments', 'Retirement', 'Property'] as const;
export function assetKind(id?: string) { return ASSET_KINDS.find((k) => k.id === id); }

/** Investable assets for retirement — everything except property (home/vehicle aren't drawn down to live on). */
export function investableValue(accounts: AssetAccount[]): number {
  return round2((accounts ?? []).filter((a) => a.tax_bucket !== 'PROPERTY').reduce((t, a) => t + (a.balance || 0), 0));
}

/** Default % of an account that's earmarked for retirement (rest funds other goals). */
export function earmarkDefault(a: AssetAccount): number {
  if (a.tax_bucket === 'PROPERTY') return 0;            // home/vehicle never funds retirement spending
  const kind = a.kind;
  if (kind === 'college_529') return 0;                 // earmarked for college
  if (a.tax_bucket === 'CASH') return 50;               // cash is part emergency-fund / near-term
  return 100;                                           // retirement & investment accounts default fully in
}
/** The retirement-earmarked $ for one account (uses the saved % or the smart default). */
export function earmarkedAmount(a: AssetAccount): number {
  const pct = a.retirement_pct == null ? earmarkDefault(a) : a.retirement_pct;
  return round2((a.balance || 0) * Math.max(0, Math.min(100, pct)) / 100);
}
/** Total nest egg = sum of each account's retirement-earmarked portion. This — not net worth — funds retirement. */
export function retirementEarmarkedValue(accounts: AssetAccount[]): number {
  return round2((accounts ?? []).reduce((t, a) => t + earmarkedAmount(a), 0));
}

/** Benchmark expected annual return for an asset kind — user override if set, else the ASSET_KINDS default. */
export function benchmarkReturn(kind: string | undefined, overrides?: Record<string, number>): number {
  if (kind && overrides && overrides[kind] != null) return overrides[kind];
  return assetKind(kind)?.ret ?? 0.06;
}

/** Where each benchmark return comes from + the window it's measured over. NOMINAL (the retirement
 *  engine applies inflation separately). `estimate: true` = no clean 30-yr index series exists, so the
 *  figure is a flagged estimate, not an actual historical return. Historical figures are through 2025;
 *  past performance is not a guarantee of future results. */
export const BENCHMARK_META: Record<string, { source: string; period: string; estimate?: boolean }> = {
  checking:       { source: 'Interest checking, ~0%', period: 'current', estimate: true },
  savings:        { source: '3-mo Treasury bill (cash)', period: '30-yr' },
  stocks_etf:     { source: 'S&P 500 total return', period: '30-yr' },
  fixed_income:   { source: 'US Aggregate Bond index', period: '30-yr' },
  private_equity: { source: 'Cambridge Associates US PE', period: '~25-yr', estimate: true },
  hedge_funds:    { source: 'HFRI Fund Weighted Composite', period: '~10-yr', estimate: true },
  commodities:    { source: 'Gold (SPDR GLD)', period: '30-yr' },
  crypto:         { source: 'No long-run benchmark — set your own', period: '—', estimate: true },
  annuities:      { source: 'Typical fixed-annuity rate', period: 'current', estimate: true },
  college_529:    { source: 'Age-based 529 blend', period: 'assumed', estimate: true },
  '401k':         { source: 'Assumed 60/40 mix', period: '30-yr', estimate: true },
  trad_ira:       { source: 'Assumed 60/40 mix', period: '30-yr', estimate: true },
  roth_ira:       { source: 'Assumed 60/40 mix', period: '30-yr', estimate: true },
  hsa:            { source: 'Invested HSA, assumed 60/40', period: '30-yr', estimate: true },
  home:           { source: 'Case-Shiller US home price (nominal)', period: '30-yr' },
  vehicle:        { source: 'Vehicle depreciation', period: 'annual', estimate: true },
  other_asset:    { source: 'Generic blended estimate', period: '—', estimate: true },
};
/** Benchmark return + its source/period for an asset kind. `edited` flags a user override;
 *  `estimate` flags that there's no clean 30-yr series so the figure is an estimate. */
export function benchmarkInfo(kind: string | undefined, overrides?: Record<string, number>): { ret: number; source: string; period: string; edited: boolean; estimate: boolean } {
  const meta = BENCHMARK_META[kind ?? ''] ?? { source: 'Generic blended estimate', period: '—', estimate: true };
  const edited = !!(kind && overrides && overrides[kind] != null);
  return { ret: benchmarkReturn(kind, overrides), source: edited ? 'Your custom estimate' : meta.source, period: edited ? '—' : meta.period, edited, estimate: !!meta.estimate };
}
/** Blended expected return across the EARMARKED nest egg, weighted by each holding's share.
 *  Different asset types earn different returns — equity vs bonds vs PE vs hedge funds — so the
 *  nest egg's growth rate is the value-weighted average of their benchmarks. */
export function blendedReturn(accounts: AssetAccount[], overrides?: Record<string, number>): number {
  const items = (accounts ?? []).filter((a) => a.tax_bucket !== 'PROPERTY');
  const total = items.reduce((t, a) => t + earmarkedAmount(a), 0);
  if (total <= 0) return 0.06;
  const weighted = items.reduce((t, a) => t + benchmarkReturn(a.kind, overrides) * earmarkedAmount(a), 0);
  return Math.round((weighted / total) * 1e4) / 1e4;
}
/** Distinct investment kinds present in the earmarked nest egg (for the benchmark editor). */
export function earmarkedKinds(accounts: AssetAccount[]): string[] {
  const seen = new Set<string>();
  (accounts ?? []).filter((a) => a.tax_bucket !== 'PROPERTY' && earmarkedAmount(a) > 0).forEach((a) => seen.add(a.kind || 'other_asset'));
  return Array.from(seen);
}
export interface AssetsDoc { user_id: UserId; accounts: AssetAccount[]; last_updated?: any; }

export interface AssetsState {
  user_id: UserId;
  total_asset_value: number;
  average_target_return: number;
  accounts: (AssetAccount & { portfolio_percentage: number })[];
}

const DEFAULT_RETURN = 0.07;

export function buildAssetsState(uid: UserId, accounts: AssetAccount[]): AssetsState {
  const total = accounts.reduce((t, a) => t + a.balance, 0);
  const withPct = accounts.map((a) => ({
    ...a, portfolio_percentage: total > 0 ? round2((a.balance / total) * 100) : 0,
  }));
  const avg = total > 0
    ? accounts.reduce((t, a) => t + a.target_return * a.balance, 0) / total
    : DEFAULT_RETURN;
  return { user_id: uid, total_asset_value: round2(total), average_target_return: Math.round(avg * 1e4) / 1e4, accounts: withPct };
}

/** Build asset accounts from onboarding answers (accumulation: retirement savings + holdings). */
export function assetsFromOnboarding(uid: UserId, op: Record<string, any> | null): AssetsDoc {
  const a = op ?? {};
  const accounts: AssetAccount[] = [];
  const add = (label: string, bucket: TaxBucket, bal: number, kind: string) => {
    if (bal > 0) accounts.push({ asset_id: newEntityId('ast'), label, kind, tax_bucket: bucket, balance: bal, target_return: DEFAULT_RETURN, origin: 'onboarding' });
  };
  add('Retirement savings', 'PRE_TAX', toNum(a.currentRetirementSavings), '401k');
  add('Investments', 'TAXABLE', toNum(a.investmentHoldings), 'stocks_etf');
  add('Savings / portfolio', 'TAXABLE', toNum(a.currentSavingsPortfolio), 'stocks_etf'); // retired flow (if present)
  return { user_id: uid, accounts };
}

/** Total monthly contributions across types + employer match (feeds the retirement projection). */
export function monthlyContributionsFromOnboarding(op: Record<string, any> | null): number {
  const a = op ?? {};
  return ['c_401k', 'c_roth', 'c_invest', 'c_property'].reduce((t, k) => t + toNum(a[k]), 0) + employerMatchMonthly(op);
}

const COLLECTION = 'assets';
export const ASSETS_UPDATED = 'AssetsUpdated';
export async function loadAssets(uid: UserId) { return getUserDoc<AssetsDoc>(COLLECTION, uid); }
export async function saveAssets(d: AssetsDoc) { await setUserDoc(COLLECTION, d.user_id, d); emit(ASSETS_UPDATED, { user_id: d.user_id }); }
export async function getAssetsState(uid: UserId) {
  const d = await loadAssets(uid); return d ? buildAssetsState(uid, d.accounts ?? []) : null;
}
