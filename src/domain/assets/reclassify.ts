// ONE-TIME MIGRATION (founder gaps 1 & 2, 2026-08-10): the cash-only rule was applied to NEW data
// only, so a CD and a money-market fund already synced stayed under Cash. A rule that only applies
// to future data is not built. This re-classifies EVERY stored account and position by today's
// rule, once, and marks the profile so it never runs twice.
import { incomeBearingClassOf, maturityClass, type AssetAccount, type AssetClass } from './index';

export const RECLASSIFY_VERSION = 'cash-only-2026-08-10';

/** The class an account SHOULD carry under the current rule. Explicit user choices are respected
 *  only when they still agree with the rule — a stale 'cash' on a CD is exactly what we are fixing. */
/* ─ MK-NW-F-053 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * correctClassOf
 *
 * Answers ..... The class an account SHOULD carry under the current rule.
 *
 * Formula .....
 *     by label = income bearing class of(label)
 *     by label   when by label
 *     maturity class(maturity date)   when maturity date
 *     'stocks_etf'   when kind = 'money_market'
 *     'bonds'   when kind = 'cd'
 *     the answer = nothing
 *
 * Called by ... MK-NW-F-054 reclassifyAccounts
 *
 * Reaches ..... 54 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-NW-F-044 getAssetsState · MK-CF-F-041 getDebtState
 *               MK-CF-F-052 getIncomeState · MK-XS-F-023 getProfileReadModel
 *               MK-ST-F-041 getUserDoc · MK-PL-F-013 goalsFromOnboarding
 *               … and 36 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-013 bond maturity date
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-053
 * Changed ..... 2026-08-10 (88ce4aa)
 */
export function correctClassOf(a: AssetAccount): AssetClass | null {
  const byLabel = incomeBearingClassOf(a.label);
  if (byLabel) return byLabel;                                  // CD/T-bill → bonds · money-market → stocks
  if (a.maturity_date) return maturityClass(a.maturity_date);   // any maturity → bonds
  if (a.kind === 'money_market') return 'stocks_etf';
  if (a.kind === 'cd') return 'bonds';
  return null;
}

/* ─ MK-NW-F-054 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * reclassifyAccounts
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     changed = 0
 *     want = correct class of(a)
 *     next = a
 *     ps = (next.positions ?? []) as any[]
 *     the answer = p
 *
 * Called by ... MK-XS-F-175 uid
 *
 * Reaches ..... 53 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-NW-F-044 getAssetsState · MK-CF-F-041 getDebtState
 *               MK-CF-F-052 getIncomeState · MK-XS-F-023 getProfileReadModel
 *               MK-ST-F-041 getUserDoc · MK-PL-F-013 goalsFromOnboarding
 *               … and 35 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-010 transaction words (the institution's own wording)
 *               MK-XS-I-048 the person’s own asset-class answer
 *
 * Decides .....
 *     · Uses a built-in changed of 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-054
 * Changed ..... 2026-08-10 (88ce4aa)
 */
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
