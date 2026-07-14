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
      expect(nextRoute(S({ user: true, onboardingComplete: true, segment: 'onboarding' }))).toBe('/(tabs)/home');
    });
    test('left alone inside tabs and modal stacks', () => {
      expect(nextRoute(S({ user: true, onboardingComplete: true, segment: '(tabs)' }))).toBeNull();
      expect(nextRoute(S({ user: true, onboardingComplete: true, segment: 'retirement' }))).toBeNull();
      expect(nextRoute(S({ user: true, onboardingComplete: true, segment: 'import-holdings' }))).toBeNull();
    });
  });

  describe('authenticated + paused setup → free to use the app', () => {
    test('not trapped back into onboarding', () => {
      expect(nextRoute(S({ user: true, onboardingComplete: false, onboardingPaused: true, segment: 'onboarding' }))).toBe('/(tabs)/home');
      expect(nextRoute(S({ user: true, onboardingComplete: false, onboardingPaused: true, segment: '(tabs)' }))).toBeNull();
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
