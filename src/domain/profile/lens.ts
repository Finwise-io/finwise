// The FCC lens resolver (approved detailed design v1.1, Home sheet): ONE stage field decides which
// hero leads Home and the bottom-tab order — working = "Grow & Track", retired = "Safe to spend".
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
export function resolveLens(op: Record<string, any> | null | undefined, override?: Lens | null): Lens {
  if (override === 'working' || override === 'retired') return override;
  const status = op?.status;
  if (status === 'retired') return 'retired';
  if (status === 'partial' && currentRetirementIncomeMonthly(op ?? {}) > 0) return 'retired';
  return 'working';
}

/**
 * Bottom-bar order per lens (design pin: "Tab order is set once from stage; identical across sessions").
 * working: Home · Net worth · Invest · Cash flow · Plan
 * retired: Home · Cash flow · Net worth · Plan · Invest (the paycheck sits next to Home)
 */
export function tabOrder(lens: Lens): FccTab[] {
  return lens === 'retired'
    ? ['home', 'cashflow', 'analytics', 'plan', 'invest']
    : ['home', 'analytics', 'invest', 'cashflow', 'plan'];
}
