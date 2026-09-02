// Pure auth-routing decision, extracted from app/_layout.tsx so it can be unit-tested.
// L-4: the "You're signed in" dead-end shipped because NO test covered cross-screen routing.
// This function encodes the whole contract; routeGuard.test.ts asserts every branch.

// Modal/stack routes a signed-in user is allowed to sit on without being bounced Home.
export const MODAL_SEGMENTS = [
  'income','expense','savings','invest','jobsafety','income-detail','income-manager','performance',
  'bonds','other-investments','sharpen','insights','bill-calendar','credit','stress-test','education',
  'insurance','estate','roth','tax-organizer','retirement','import-holdings','holding-detail','required-withdrawals','connect','add-account',
  // T22: 'cashflow' was missing, so tapping "Cash-flow detail →" pushed /cashflow and the guard
  // immediately replaced back to Home — read as an infinite loop. 'contribution-room' (the 401(k)-room
  // insight target) had the same latent bug. Any NEW root screen must be added here (pinned by a test).
  'cashflow','contribution-room','itemize','monthly-income','paycheck-months',   // FCC Phase 2: retiree income + paycheck
  'worth-a-look',   // FCC Home tab: F10 flag detail (idle-cash cut by the founder 2026-08-20, brief §C)
  'connect-done',               // SnapTrade portal deep-link return (audit fix P1-3)
  'ss-timing', 'big-costs',                  // FCC Plan tab: the Social Security claim-timing decision
  'month-detail',               // FCC Cash flow tab: the per-month cell renderer
  'account-detail',             // FCC Net worth tab: one page per account
  'multi-goal',                 // FCC Plan tab: Afford it all? (the F4 composer)
  'first-run',                  // FCC: the lens questions (intents + stage), also Settings' revisit target
  'base-pay',                   // Your base pay — one section per earner (approved mock income-v5, 2a-2e)
  'filing-status',              // How do you file? — never asked before (approved mock income-v5, 4a-4c)
  'income-summary',             // Your income, all of it (approved mock income-v5, 5a-5b)
  'look-back','what-if',        // FCC Invest tab: backward + forward what-ifs
  'will-it-last',               // FCC Plan tab: the one number, opened up
];

export type RouteState = {
  user: boolean;              // is someone authenticated?
  onboardingComplete: boolean;
  onboardingPaused: boolean;  // chose "Save & come back later"
  segment: string;            // segments[0] — the top-level route group
};

/** The route to `router.replace()` to, or `null` to stay put. */
export function nextRoute({ user, onboardingComplete, onboardingPaused, segment }: RouteState): string | null {
  const inTabs       = segment === '(tabs)';
  const inOnboarding = segment === 'onboarding';
  const inAuth       = segment === 'auth';
  const inModals     = MODAL_SEGMENTS.includes(segment);

  if (user) {
    // NOBODY IS EVER SENT HERE, SO BEING HERE IS A CHOICE. The guard's job is to stop someone being
    // TRAPPED in setup; it is not to stop them CHOOSING it. Those were the same line until
    // 2026-08-28, and it bounced /onboarding to Home in three of the four states — including the two
    // that matter, because the light first-run sets onboardingComplete before Home is ever shown.
    // The founder tapped "Or answer guided setup questions", landed back on the same screen, tapped
    // "Pick up where you left off", landed back again: a circular loop, with the whole guided setup
    // unreachable behind it. Nothing in this file routes anyone TO /onboarding, and the screen has
    // its own exits (Save & come back later, and finishing), so staying put is always safe.
    // Same class as T22.
    if (inOnboarding) return null;
    if (onboardingComplete) {
      // Done — keep them in the app; only bounce to Home from stray routes (e.g. /auth).
      if (!inTabs && !inModals) return '/(tabs)/home';
    } else if (onboardingPaused) {
      // Paused setup — let them use the app.
    } else {
      // FCC (B46): a brand-new user gets the LIGHT first-run (value intro → intents → stage →
      // routed fast-path). The deep questionnaire (/onboarding) stays legal — it's the
      // set-up-by-hand door Home offers; the guard must not bounce someone who chose it.
      if (!inOnboarding && segment !== 'first-run') return '/first-run';
    }
  } else {
    // Unauthenticated → AuthScreen first (the only place to sign up or log in).
    if (!inAuth) return '/auth';
  }
  return null;
}
