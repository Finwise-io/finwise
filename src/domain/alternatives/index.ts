// Other / alternative investments (Phase C) — crypto, private equity, hedge funds, commodities,
// annuities, and anything else that isn't a ticker stock/ETF (Performance) or an individual bond
// (Bonds). Modeled as manually-valued AssetAccounts, so they already flow to Net Worth + nest egg.
import { benchmarkReturn, assetClassOf, type AssetAccount } from '../assets';

export const ALT_KINDS = ['crypto', 'private_equity', 'hedge_funds', 'commodities', 'annuities', 'options', 'other_asset'] as const;
export type AltKindAll = typeof ALT_KINDS[number];
// Founder 2026-08-04: PE/HF out of phase 1 (keep it simple). The full list stays as the data
// model (saved holdings still render + compute); capture UIs offer only this trimmed set.
export const ALT_KINDS_CAPTURE = ['crypto', 'commodities', 'annuities', 'options', 'other_asset'] as const;
export type AltKind = typeof ALT_KINDS[number];

/** Is this account an "other investment" — an alternative held at a manual value (not a bond, not cash/property)? */
/* ─ MK-NW-F-001 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * isAlternative
 *
 * Answers ..... Is this account an "other investment" — an alternative held at a manual value (not a bond, not cash/property)?
 *
 * Formula .....
 *     asset class of(a) = 'alternatives'
 *
 * Called by ... MK-NW-F-002 alternativesSummary
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-002 alternativesSummary
 *               MK-NW-O-005 theAlternativesOutlook
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-001
 * Changed ..... 2026-06-06 (a41cd47)
 */
export function isAlternative(a: AssetAccount): boolean {
  // ONE TEST, THE SAME ONE THE NET WORTH TAB USES (outside review, 2026-10-04). This used to ask the
  // account's KIND, while the rows under the total and the Alternatives slice on Net worth ask its
  // CLASS (assetClassOf) — so a fund the person classed as an alternative was in the rows and not the
  // total, a crypto-kind account they classed as Stocks / Funds was in the total and not the rows,
  // and the rows did not add up to the figure above them.
  return assetClassOf(a) === 'alternatives';
}

export interface AltSummary { count: number; totalValue: number;
  /** Null when nothing is held: 0% would read as a forecast. */
  blendedReturn: number | null;
  /** The rate in money over a year; null when nothing is held — $0 would read as a forecast too (outside review, 2026-10-07). */
  estAnnualGrowth: number | null; }

/** Adds up the alternative investments: how many there are, what they are worth together, their blended yearly growth rate and the growth in dollars that rate gives over a year. */
/* ─ MK-NW-F-002 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * alternativesSummary
 *
 * Answers ..... Adds up the alternative investments: how many there are, what they are worth together, their blended yearly growth rate and the growth in dollars that rate gives over a year.
 *
 * Formula .....
 *     alts = accounts (or none when missing) where is alternative
 *     total = Σ over alts of (balance (or 0 when missing or zero))
 *     weighted = Σ over total > 0 ? alts of ((balance or 0) × benchmark return(kind))÷ total : nothing
 *
 * Called by ... MK-NW-O-005 theAlternativesOutlook
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-O-005 theAlternativesOutlook
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · If balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-002
 * Changed ..... 2026-06-06 (a41cd47)
 */
export function alternativesSummary(accounts: AssetAccount[]): AltSummary {
  const alts = (accounts ?? []).filter(isAlternative);
  const total = alts.reduce((t, a) => t + (a.balance || 0), 0);
  const weighted = total > 0 ? alts.reduce((t, a) => t + (a.balance || 0) * benchmarkReturn(a.kind), 0) / total : null;
  return {
    count: alts.length,
    totalValue: (total),
    blendedReturn: (weighted),
    estAnnualGrowth: total > 0 && weighted != null ? (total * weighted) : null,
  };
}
