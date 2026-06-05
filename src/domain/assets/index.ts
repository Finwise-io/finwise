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
}

// Capture types for assets. `section` groups them on the Net Worth screen.
export const ASSET_KINDS: { id: string; label: string; icon: string; bucket: TaxBucket; section: string; ret: number }[] = [
  { id: 'checking', label: 'Checking', icon: '💵', bucket: 'CASH', section: 'Cash', ret: 0.005 },
  { id: 'savings', label: 'Savings', icon: '🏦', bucket: 'CASH', section: 'Cash', ret: 0.04 },
  { id: 'stocks_etf', label: 'Stocks / ETFs', icon: '📈', bucket: 'TAXABLE', section: 'Investments', ret: 0.07 },
  { id: 'fixed_income', label: 'Fixed income', icon: '📜', bucket: 'TAXABLE', section: 'Investments', ret: 0.04 },
  { id: 'private_equity', label: 'Private equity', icon: '🏢', bucket: 'TAXABLE', section: 'Investments', ret: 0.10 },
  { id: 'hedge_funds', label: 'Hedge funds', icon: '📊', bucket: 'TAXABLE', section: 'Investments', ret: 0.06 },
  { id: 'commodities', label: 'Commodities', icon: '🥇', bucket: 'TAXABLE', section: 'Investments', ret: 0.05 },
  { id: 'crypto', label: 'Crypto', icon: '🪙', bucket: 'TAXABLE', section: 'Investments', ret: 0.07 },
  { id: 'annuities', label: 'Annuities', icon: '📃', bucket: 'TAXABLE', section: 'Investments', ret: 0.04 },
  { id: 'college_529', label: '529 / College', icon: '🎓', bucket: 'TAXABLE', section: 'Investments', ret: 0.06 },
  { id: '401k', label: '401(k)', icon: '🏛️', bucket: 'PRE_TAX', section: 'Retirement', ret: 0.07 },
  { id: 'trad_ira', label: 'Traditional IRA', icon: '🏛️', bucket: 'PRE_TAX', section: 'Retirement', ret: 0.07 },
  { id: 'roth_ira', label: 'Roth IRA', icon: '🌱', bucket: 'ROTH', section: 'Retirement', ret: 0.07 },
  { id: 'hsa', label: 'HSA', icon: '🩺', bucket: 'PRE_TAX', section: 'Retirement', ret: 0.06 },
  { id: 'home', label: 'Home', icon: '🏠', bucket: 'PROPERTY', section: 'Property', ret: 0.03 },
  { id: 'vehicle', label: 'Vehicle', icon: '🚗', bucket: 'PROPERTY', section: 'Property', ret: -0.05 },
  { id: 'other_asset', label: 'Other', icon: '📦', bucket: 'TAXABLE', section: 'Investments', ret: 0.04 },
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
    if (bal > 0) accounts.push({ asset_id: newEntityId('ast'), label, kind, tax_bucket: bucket, balance: bal, target_return: DEFAULT_RETURN });
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
