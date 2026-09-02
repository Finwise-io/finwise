import * as fs from 'fs';
import * as path from 'path';
import { nextRoute, RouteState, MODAL_SEGMENTS } from '../routeGuard';

const S = (over: Partial<RouteState>): RouteState => ({
  user: false, onboardingComplete: false, onboardingPaused: false, segment: '', ...over,
});

describe('auth routing guard (L-4 regression contract)', () => {
  describe('unauthenticated → AuthScreen is the only entry', () => {
    test('lands on /auth from anywhere else', () => {
      expect(nextRoute(S({ user: false, segment: '' }))).toBe('/auth');
      expect(nextRoute(S({ user: false, segment: 'onboarding' }))).toBe('/auth');
      expect(nextRoute(S({ user: false, segment: '(tabs)' }))).toBe('/auth');
    });
    test('stays put when already on /auth', () => {
      expect(nextRoute(S({ user: false, segment: 'auth' }))).toBeNull();
    });
    test('never routes an unauthenticated user into /onboarding (no unauth account step)', () => {
      const states = ['', 'auth', '(tabs)', 'onboarding', 'income'];
      states.forEach((seg) => expect(nextRoute(S({ user: false, segment: seg }))).not.toBe('/onboarding'));
    });
  });

  describe('authenticated but onboarding unfinished → the first-run questions, NOT a dead-end', () => {
    test('a freshly-created account goes to /first-run (FCC B46: value intro → intents → stage)', () => {
      expect(nextRoute(S({ user: true, onboardingComplete: false, segment: 'auth' }))).toBe('/first-run');
      expect(nextRoute(S({ user: true, onboardingComplete: false, segment: '(tabs)' }))).toBe('/first-run');
    });
    test('stays put on first-run once there', () => {
      expect(nextRoute(S({ user: true, onboardingComplete: false, segment: 'first-run' }))).toBeNull();
    });
    test('the deep questionnaire stays legal (the set-up-by-hand door) — never bounced out of it', () => {
      expect(nextRoute(S({ user: true, onboardingComplete: false, segment: 'onboarding' }))).toBeNull();
    });
  });

  describe('authenticated + onboarding complete → app', () => {
    test('bounced to Home from stray routes', () => {
      expect(nextRoute(S({ user: true, onboardingComplete: true, segment: 'auth' }))).toBe('/(tabs)/home');
    });
    // CHANGED 2026-08-28. /onboarding used to be listed as "stray" here, and it is not: Home's own
    // first-run block offers it as "Or answer guided setup questions". The light first-run sets
    // onboardingComplete BEFORE that block is ever shown, so this assertion made the door dead for
    // every real user — tap it, bounce straight back, tap again, bounce again. The founder found it
    // on build 53 as a circular loop with the whole guided setup behind it.
    test('the guided-setup door stays open even once setup is marked complete', () => {
      expect(nextRoute(S({ user: true, onboardingComplete: true, segment: 'onboarding' }))).toBeNull();
    });
    test('left alone inside tabs and modal stacks', () => {
      expect(nextRoute(S({ user: true, onboardingComplete: true, segment: '(tabs)' }))).toBeNull();
      expect(nextRoute(S({ user: true, onboardingComplete: true, segment: 'retirement' }))).toBeNull();
      expect(nextRoute(S({ user: true, onboardingComplete: true, segment: 'import-holdings' }))).toBeNull();
    });
  });

  describe('authenticated + paused setup → free to use the app', () => {
    // Not TRAPPED and not BLOCKED are different things, and this file used to conflate them. Nothing
    // in the guard routes anyone TO /onboarding, so being there is always a choice — and "Pick up
    // where you left off", which is exactly the paused case, is a button Home shows.
    test('free to use the app, and free to resume', () => {
      expect(nextRoute(S({ user: true, onboardingComplete: false, onboardingPaused: true, segment: '(tabs)' }))).toBeNull();
      expect(nextRoute(S({ user: true, onboardingComplete: false, onboardingPaused: true, segment: 'onboarding' }))).toBeNull();
    });
  });

  // T22 (the cash-flow "loop"): a signed-in, onboarded user pushing /cashflow or /contribution-room must
  // STAY there — not be bounced back to Home by the guard.
  describe('T22: detail screens are not bounced back to Home', () => {
    test('cashflow + contribution-room stay put', () => {
      expect(nextRoute(S({ user: true, onboardingComplete: true, segment: 'cashflow' }))).toBeNull();
      expect(nextRoute(S({ user: true, onboardingComplete: true, segment: 'contribution-room' }))).toBeNull();
    });
  });

  // Regression backstop: EVERY top-level route file (app/*.tsx) a signed-in user can navigate to must be
  // whitelisted in MODAL_SEGMENTS, or the guard will replace() it away → infinite loop. This is exactly
  // how T22 (cashflow) and the new contribution-room screen broke. auth/onboarding are handled separately.
  test('every root route is whitelisted (no screen can silently loop back to Home)', () => {
    const appDir = path.join(__dirname, '..', '..', '..', 'app');
    const SPECIAL = new Set(['_layout', 'index', '+not-found', 'auth', 'onboarding']);
    const routes = fs.readdirSync(appDir)
      .filter((f) => f.endsWith('.tsx'))
      .map((f) => f.replace(/\.tsx$/, ''))
      .filter((r) => !SPECIAL.has(r));
    const missing = routes.filter((r) => !MODAL_SEGMENTS.includes(r));
    expect(missing).toEqual([]);
  });
});

// ── THE GUARD THAT WOULD HAVE CAUGHT IT ────────────────────────────────────────────────────────
// Home's first-run block is the only way into the app for someone with no data, and every one of its
// doors is a router call. If the route guard bounces any of them, the door is dead and the screen
// looks like a loop. That is how build 53 shipped with the entire guided setup unreachable.
describe("every door on Home's first-run block actually lands", () => {
  const DOORS = ['onboarding', 'connect', 'import-holdings', '(tabs)', 'monthly-income'];
  // Only the states in which Home is reachable at all. A signed-in user who has not finished the
  // light first-run and has not paused is sent to /first-run from the tabs, so they never see this
  // block — testing that state would fail on a door that is not on screen.
  const STATES = [
    { onboardingComplete: true, onboardingPaused: false },
    { onboardingComplete: true, onboardingPaused: true },
    { onboardingComplete: false, onboardingPaused: true },
  ];
  test('the states above are exactly the ones where Home renders', () => {
    for (const st of STATES) expect(nextRoute(S({ user: true, segment: '(tabs)', ...st }))).toBeNull();
    expect(nextRoute(S({ user: true, segment: '(tabs)', onboardingComplete: false, onboardingPaused: false })))
      .toBe('/first-run');       // the one state Home is NOT reachable in
  });
  test('none of them is bounced back to Home, in any state', () => {
    const dead: string[] = [];
    for (const segment of DOORS) {
      for (const st of STATES) {
        const to = nextRoute(S({ user: true, segment, ...st }));
        if (to != null && to !== `/${segment}`) {
          dead.push(`/${segment} → ${to}  (complete=${st.onboardingComplete}, paused=${st.onboardingPaused})`);
        }
      }
    }
    expect(dead.join('\n')).toBe('');
  });
});
