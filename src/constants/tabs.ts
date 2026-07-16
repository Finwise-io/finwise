// The five FCC tabs — ONE source for the bottom bar AND the Menu (founder UX review 2026-07-16:
// "it is hard to link menu to button bar" — so the menu now renders from the same map the bar
// uses; they can never drift apart). Route names are invisible to users — `analytics` IS the
// Net worth tab.
import type { FccTab } from '../domain/profile/lens';

export const TAB_META: Record<FccTab, { title: string; icon: string }> = {
  home:      { title: 'Home',      icon: 'home' },
  analytics: { title: 'Net worth', icon: 'diamond' },
  invest:    { title: 'Invest',    icon: 'stats-chart' },
  cashflow:  { title: 'Cash flow', icon: 'cash' },
  plan:      { title: 'Plan',      icon: 'compass' },
};
