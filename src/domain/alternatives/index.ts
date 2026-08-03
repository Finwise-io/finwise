// Other / alternative investments (Phase C) — crypto, private equity, hedge funds, commodities,
// annuities, and anything else that isn't a ticker stock/ETF (Performance) or an individual bond
// (Bonds). Modeled as manually-valued AssetAccounts, so they already flow to Net Worth + nest egg.
import { round2 } from '../_shared/num';
import { benchmarkReturn, type AssetAccount } from '../assets';

export const ALT_KINDS = ['crypto', 'private_equity', 'hedge_funds', 'commodities', 'annuities', 'options', 'other_asset'] as const;
export type AltKindAll = typeof ALT_KINDS[number];
// Founder 2026-08-04: PE/HF out of phase 1 (keep it simple). The full list stays as the data
// model (saved holdings still render + compute); capture UIs offer only this trimmed set.
export const ALT_KINDS_CAPTURE = ['crypto', 'commodities', 'annuities', 'options', 'other_asset'] as const;
export type AltKind = typeof ALT_KINDS[number];

/** Is this account an "other investment" — an alternative held at a manual value (not a bond, not cash/property)? */
export function isAlternative(a: AssetAccount): boolean {
  return ALT_KINDS.includes((a.kind ?? '') as AltKind) && !a.maturity_date && a.tax_bucket !== 'PROPERTY';
}

export interface AltSummary { count: number; totalValue: number; blendedReturn: number; estAnnualGrowth: number; }
export function alternativesSummary(accounts: AssetAccount[]): AltSummary {
  const alts = (accounts ?? []).filter(isAlternative);
  const total = alts.reduce((t, a) => t + (a.balance || 0), 0);
  const weighted = total > 0 ? alts.reduce((t, a) => t + (a.balance || 0) * benchmarkReturn(a.kind), 0) / total : 0;
  return {
    count: alts.length,
    totalValue: round2(total),
    blendedReturn: Math.round(weighted * 1e4) / 1e4,
    estAnnualGrowth: round2(total * weighted),
  };
}
