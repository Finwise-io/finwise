// Pure auth-routing decision, extracted from app/_layout.tsx so it can be unit-tested.
// L-4: the "You're signed in" dead-end shipped because NO test covered cross-screen routing.
// This function encodes the whole contract; routeGuard.test.ts asserts every branch.

// Modal/stack routes a signed-in user is allowed to sit on without being bounced Home.
export const MODAL_SEGMENTS = [
  'income','expense','savings','invest','jobsafety','income-detail','income-manager','performance',
  'bonds','other-investments','sharpen','insights','bill-calendar','credit','stress-test','education',
  'insurance','estate','roth','tax-organizer','retirement','import-holdings',
  // T22: 'cashflow' was missing, so tapping "Cash-flow detail →" pushed /cashflow and the guard
  // immediately replaced back to Home — read as an infinite loop. 'contribution-room' (the 401(k)-room
  // insight target) had the same latent bug. Any NEW root screen must be added here (pinned by a test).
  'cashflow','contribution-room','itemize','monthly-income','paycheck-months',   // FCC Phase 2: retiree income + paycheck
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
    if (onboardingComplete) {
      // Done — keep them in the app; only bounce to Home from stray routes (e.g. /auth, /onboarding).
      if (!inTabs && !inModals) return '/(tabs)/home';
    } else if (onboardingPaused) {
      // Paused setup — let them use the app; don't trap them back in onboarding.
      if (inOnboarding) return '/(tabs)/home';
    } else {
      // Authenticated but setup unfinished → onboarding QUESTIONS (no account step; L-4).
      if (!inOnboarding) return '/onboarding';
    }
  } else {
    // Unauthenticated → AuthScreen first (the only place to sign up or log in).
    if (!inAuth) return '/auth';
  }
  return null;
}
