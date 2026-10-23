// ONE-TIME MIGRATION (founder gaps 1 & 2, 2026-08-10): the cash-only rule was applied to NEW data
// only, so a CD and a money-market fund already synced stayed under Cash. A rule that only applies
// to future data is not built. This re-classifies EVERY stored account and position by today's
// rule, once, and marks the profile so it never runs twice.
import { classEvidenceOf, holdingClassOf, holdingTagClass, holdingTagFor, type AssetAccount, type AssetClass } from './index';

export const RECLASSIFY_VERSION = 'cash-only-2026-08-10';

/** The class an account SHOULD carry under the current rule. Explicit user choices are respected
 *  only when they still agree with the rule — a stale 'cash' on a CD is exactly what we are fixing. */
/* ─ MK-NW-F-053 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * correctClassOf
 *
 * Answers ..... The class an account SHOULD carry under the current rule.
 *
 * Formula .....
 *     asset class (or nothing when missing)   when class source = 'user'
 *     evidence = class evidence of(a)
 *     evidence   when evidence
 *     'stocks_etf'   when kind = 'money_market'
 *     'bonds'   when kind = 'cd'
 *     the answer = nothing
 *
 * Called by ... MK-NW-F-054 reclassifyAccounts · MK-NW-F-150 heldInOf
 *
 * Reaches ..... 120 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-076 ALT
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-079 EF · MK-NW-F-080 HOLD
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-NW-F-082 NW
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-027 accountClassBreakdown
 *               MK-NW-F-154 accountInvestments · MK-NW-F-182 accountsInClass
 *               … and 102 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-056 how a holding was classified, and by whom
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-053
 * Changed ..... 2026-08-10 (88ce4aa)
 */
export function correctClassOf(a: AssetAccount): AssetClass | null {
  // the class the person chose is the class it should carry (outside review OpenAI final, 2026-10-09, DEC-2748h)
  if (a.class_source === 'user') return a.asset_class ?? null;
  // the same order assetClassOf reads: a maturity date before the name, and never a property's name
  // (outside review OpenAI final, 2026-10-09, DEC-2484i, DEC-3035o)
  const evidence = classEvidenceOf(a);
  if (evidence) return evidence;                                // maturity → bonds · CD/T-bill → bonds · money-market → stocks
  if (a.kind === 'money_market') return 'stocks_etf';
  if (a.kind === 'cd') return 'bonds';
  return null;
}

/** Corrects the asset class of any account or holding filed under the wrong one, and counts how many it changed. */
/* ─ MK-NW-F-054 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * reclassifyAccounts
 *
 * Answers ..... Corrects the asset class of any account or holding filed under the wrong one, and counts how many it changed.
 *
 * Formula .....
 *     changed = 0
 *     a   when wrapper confirmed
 *     want = nothing   if class source = 'user'
 *     correct class of(a)   otherwise
 *     next = a
 *     ps = (next.positions ?? []) as any[]
 *     p   when class source = 'user' (or class asked when missing or zero)
 *     the answer = p
 *
 * Called by ... MK-NW-F-109 holdingClassOf · MK-XS-F-175 uid
 *
 * Reaches ..... 119 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-076 ALT
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-079 EF · MK-NW-F-080 HOLD
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-NW-F-082 NW
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-027 accountClassBreakdown
 *               MK-NW-F-154 accountInvestments · MK-NW-F-182 accountsInClass
 *               … and 101 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-056 how a holding was classified, and by whom
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
    // what the person confirmed stands — the rule corrects what the app guessed, never what they said
    // (outside review, 2026-10-07)
    if (a.wrapper_confirmed) return a;
    // a class the person chose stays; their holdings are still read one by one below (DEC-2748h)
    const want = a.class_source === 'user' ? null : correctClassOf(a);
    let next = a;
    if (want && a.asset_class !== want) {
      // MOVED OUT OF CASH, ITS TAX TYPE IS NOT GUESSED (DEC-4036f, 2026-10-10): the cash bucket no longer fits, and
      // nothing the person said names another, so the account has no tax type — it used to become TAXABLE.
      next = { ...next, asset_class: want, tax_bucket: want === 'cash' ? next.tax_bucket : (next.tax_bucket === 'CASH' ? undefined as unknown as AssetAccount['tax_bucket'] : next.tax_bucket) };
      changed++;
    }
    // positions carry their own class (imported/synced holdings — the same rule applies inside)
    const ps = (next.positions ?? []) as any[];
    if (ps.length) {
      const nps = ps.map((p) => {
        // a holding the person classed, or one waiting on their answer, is theirs — never re-filed
        // (outside review OpenAI final, 2026-10-09, DEC-2484r)
        if (p.class_source === 'user' || p.class_asked) return p;
        // the class the ONE order gives (MK-NW-F-109 holdingClassOf — the broker's own class first, his ruling of
        // 2026-10-20; then the name) is stored as that class — Gold is Alternatives, not Stocks / Funds; nothing that
        // says what it is leaves it as it is (outside review OpenAI final, 2026-10-09, DEC-3035f). This sweep kept its
        // own name-first copy of the order until 2026-10-20.
        const ordered = holdingClassOf(p);
        const want2 = ordered !== 'mixed' ? holdingTagFor(ordered) : null;
        if (want2 && holdingTagClass(p.asset_class) !== ordered) { changed++; return { ...p, asset_class: want2 }; }
        return p;
      });
      if (nps.some((p, i) => p !== ps[i])) next = { ...next, positions: nps } as AssetAccount;
    }
    return next;
  });
  return { accounts: out, changed };
}
