// The FCC lens resolver (approved detailed design v1.1, Home sheet): ONE stage field decides which
// hero leads Home and the bottom-tab order — working = "Grow & Track", retired = "Surplus".
// The stage comes from onboarding (`status`) or the explicit first-run / Settings "Your setup" choice
// (the override). One resolver, read everywhere — never a screen-local copy.
import { currentRetirementIncomeMonthly } from '../income';

export type Lens = 'working' | 'retired';

/** Route names inside app/(tabs)/ — `analytics` IS the Net worth tab (route name is invisible to users). */
export type FccTab = 'home' | 'analytics' | 'invest' | 'cashflow' | 'plan';

/**
 * The person's explicit choice (first-run stage question / Settings → Your setup) wins.
 * Otherwise: retired status → retired lens; semi-retired ('partial') counts as retired once
 * retirement income actually flows. Everyone else — including skip-with-no-answer — is working.
 */
/* ─ MK-XS-F-024 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * resolveLens
 *
 * Answers ..... The person's explicit choice (first-run stage question / Settings → Your setup) wins.
 *
 * Formula .....
 *     override   when override = 'working' (or override = 'retired' when missing or zero)
 *     status = op.status
 *     'retired'   when status = 'retired'
 *     'retired'   when status = 'partial' and current retirement income monthly(op ?? {}) > 0
 *     the answer = 'working'
 *
 * Called by ... MK-XS-F-192 typedValueDatedBack
 *
 * Reaches ..... 53 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-CF-F-041 getDebtState · MK-CF-F-052 getIncomeState
 *               MK-XS-F-023 getProfileReadModel · MK-ST-F-041 getUserDoc
 *               … and 35 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-024
 * Changed ..... 2026-07-13 (9ac80a7)
 */
export function resolveLens(op: Record<string, any> | null | undefined, override?: Lens | null): Lens {
  if (override === 'working' || override === 'retired') return override;
  const status = op?.status;
  if (status === 'retired') return 'retired';
  if (status === 'partial' && currentRetirementIncomeMonthly(op ?? {}) > 0) return 'retired';
  return 'working';
}

/**
 * Bottom-bar order per lens (design pin: "Tab order is set once from stage; identical across sessions").
 * working: Home · Net worth · Performance · Cash flow · Plan
 * retired: Home · Cash flow · Net worth · Plan · Performance (the paycheck sits next to Home)
 * The route key stays `invest`; the tab is TITLED Performance (founder, 2026-08-04) — routes are
 * invisible to a person, the title is not.
 */
/* ─ MK-XS-F-025 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * tabOrder
 *
 * Answers ..... Bottom-bar order per lens (design pin: "Tab order is set once from stage; identical across sessions").
 *
 * Formula .....
 *     retired → home, cashflow, analytics, plan, invest
 *     otherwise → home, analytics, invest, cashflow, plan
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-025
 * Changed ..... 2026-07-13 (9ac80a7)
 */
export function tabOrder(lens: Lens): FccTab[] {
  return lens === 'retired'
    ? ['home', 'cashflow', 'analytics', 'plan', 'invest']
    : ['home', 'analytics', 'invest', 'cashflow', 'plan'];
}
