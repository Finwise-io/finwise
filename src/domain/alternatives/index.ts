// Other / alternative investments (Phase C) — crypto, private equity, hedge funds, commodities,
// annuities, and anything else that isn't a ticker stock/ETF (Performance) or an individual bond
// (Bonds). Modeled as manually-valued AssetAccounts, so they already flow to Net Worth + nest egg.
import { benchmarkReturn, assetClassOf, accountClassBreakdown, holdingClassOf, type AssetAccount } from '../assets';

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
 * Called by ... MK-NW-F-113 altPartsOf
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-113 altPartsOf
 *               MK-NW-F-002 alternativesSummary · MK-NW-O-005 theAlternativesOutlook
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
 *     parts = for each of accounts (or none when missing): each = each
 *     parts = alt parts of(each) where parts.length > 0
 *     flat = parts.flat map((x) => parts)
 *     total = Σ over flat of (value)
 *     weighted = Σ over total > 0 ? flat of (value × benchmark return(kind, overrides))÷ total : nothing
 *
 * Called by ... MK-NW-O-005 theAlternativesOutlook
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-O-005 theAlternativesOutlook
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-002
 * Changed ..... 2026-06-06 (a41cd47)
 */
export function alternativesSummary(accounts: AssetAccount[], overrides?: Record<string, number>): AltSummary {
  // THE SAME DOLLARS AS THE ALTERNATIVES LINE (outside review, 2026-10-07). This took whole accounts that
  // are alternatives, so a bitcoin fund or options inside a brokerage were missed and a crypto account's
  // own uninvested cash was counted — $18,641 where the Alternatives line (MK-NW-F-019) read $23,031 for
  // the same household. It reads each account's class split now, and rates each part by what it is,
  // the person's own rate for that kind first.
  const parts = (accounts ?? []).map((a) => ({ a, parts: altPartsOf(a) })).filter((x) => x.parts.length > 0);
  const flat = parts.flatMap((x) => x.parts);
  const total = flat.reduce((t, p) => t + p.value, 0);
  const weighted = total > 0 ? flat.reduce((t, p) => t + p.value * benchmarkReturn(p.kind, overrides), 0) / total : null;
  return {
    count: parts.length,
    totalValue: (total),
    blendedReturn: (weighted),
    estAnnualGrowth: total > 0 && weighted != null ? (total * weighted) : null,
  };
}

/** The alternatives inside one account, each with the kind its yearly rate is read from. */
/* ─ MK-NW-F-113 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * altPartsOf
 *
 * Answers ..... The alternatives inside one account, each with the kind its yearly rate is read from.
 *
 * Formula .....
 *     split = account class breakdown(a)
 *     v = split.alternatives   if split
 *     balance (or 0 when missing or zero)   otherwise
 *     the answer = [{ value: v, kind: kind }]
 *     []   when split is missing (or split.alternatives is missing when missing or zero)
 *     out = []
 *     sh = (lots ?? []).reduce((t: number, l: any) => t + (shares or 0), 0)
 *     name = `${ticker ?? ''} ${name ?? label ?? ''}`
 *     rest = Σ over split.alternatives − out of (value)
 *
 * Called by ... MK-NW-F-002 alternativesSummary
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-002 alternativesSummary
 *               MK-NW-O-005 theAlternativesOutlook
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-034 option positions — contracts, strike, expiry, put or call
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · If balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If shares is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-113
 * Changed ..... not in git yet (—)
 */
function altPartsOf(a: AssetAccount): { value: number; kind: string | undefined }[] {
  const split = accountClassBreakdown(a);
  if (isAlternative(a)) {
    const v = split ? split.alternatives : (a.balance || 0);
    return [{ value: v, kind: a.kind }];
  }
  if (!split || !split.alternatives) return [];
  const out: { value: number; kind: string | undefined }[] = [];
  for (const o of ((a as any).option_holdings ?? []) as any[]) if (o.value) out.push({ value: o.value, kind: 'options' });
  for (const p of (a.positions ?? []) as any[]) {
    if (holdingClassOf(p) !== 'alternatives' || p.last_price == null) continue;
    const sh = (p.lots ?? []).reduce((t: number, l: any) => t + (l.shares || 0), 0);
    const name = `${p.ticker ?? ''} ${p.name ?? p.label ?? ''}`;
    const kind = /\b(bitcoin|ethereum|crypto|btc|eth|ibit|fbtc|gbtc)\b/i.test(name) ? 'crypto'
      : /\b(gold|silver|platinum|palladium|commodit(y|ies)|gld|iau|slv)\b/i.test(name) ? 'commodities' : 'other_asset';
    out.push({ value: sh * p.last_price, kind });
  }
  const rest = split.alternatives - out.reduce((t, x) => t + x.value, 0);
  if (Math.abs(rest) > 0.005) out.push({ value: rest, kind: 'other_asset' });
  return out;
}
