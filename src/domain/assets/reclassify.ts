// ONE-TIME MIGRATION (founder gaps 1 & 2, 2026-08-10): the cash-only rule was applied to NEW data
// only, so a CD and a money-market fund already synced stayed under Cash. A rule that only applies
// to future data is not built. This re-classifies EVERY stored account and position by today's
// rule, once, and marks the profile so it never runs twice.
import { incomeBearingClassOf, maturityClass, type AssetAccount, type AssetClass } from './index';

export const RECLASSIFY_VERSION = 'cash-only-2026-08-10';

/** The class an account SHOULD carry under the current rule. Explicit user choices are respected
 *  only when they still agree with the rule — a stale 'cash' on a CD is exactly what we are fixing. */
export function correctClassOf(a: AssetAccount): AssetClass | null {
  const byLabel = incomeBearingClassOf(a.label);
  if (byLabel) return byLabel;                                  // CD/T-bill → bonds · money-market → stocks
  if (a.maturity_date) return maturityClass(a.maturity_date);   // any maturity → bonds
  if (a.kind === 'money_market') return 'stocks_etf';
  if (a.kind === 'cd') return 'bonds';
  return null;
}

export function reclassifyAccounts(accounts: AssetAccount[]): { accounts: AssetAccount[]; changed: number } {
  let changed = 0;
  const out = (accounts ?? []).map((a) => {
    const want = correctClassOf(a);
    let next = a;
    if (want && a.asset_class !== want) {
      next = { ...next, asset_class: want, tax_bucket: want === 'cash' ? next.tax_bucket : (next.tax_bucket === 'CASH' ? 'TAXABLE' : next.tax_bucket) };
      changed++;
    }
    // positions carry their own class (imported/synced holdings — the same rule applies inside)
    const ps = (next.positions ?? []) as any[];
    if (ps.length) {
      const nps = ps.map((p) => {
        const byLabel = incomeBearingClassOf(`${p.ticker ?? ''} ${p.name ?? p.description ?? ''}`);
        if (byLabel && byLabel !== 'cash') {
          const want2 = byLabel === 'bonds' ? 'bond' : 'stock_etf';
          if (p.asset_class !== want2) { changed++; return { ...p, asset_class: want2 }; }
        }
        return p;
      });
      if (nps.some((p, i) => p !== ps[i])) next = { ...next, positions: nps } as AssetAccount;
    }
    return next;
  });
  return { accounts: out, changed };
}
