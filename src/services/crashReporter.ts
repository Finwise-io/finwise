// F-6 (QA-2026-06-18): crash & error reporting.
// Sentry-ready: if `@sentry/react-native` is installed AND a SENTRY_DSN is configured (via
// app.config.js `extra` — a DSN is a public ingest key, safe to bundle, NOT a secret), uncaught and
// reported errors are shipped to Sentry. When neither is present this degrades to a dev-console
// logger, so call sites stay identical and the app never depends on the native SDK being installed.
//
// To activate: `npx expo install @sentry/react-native` and set SENTRY_DSN in your build env.
import Constants from 'expo-constants';

type Extra = Record<string, unknown>;

let sentry: any = null;
let enabled = false;

/* ─ MK-XS-F-133 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * loadSentry
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     the answer = the crash-reporting module, or nothing when it is absent
 *
 * Called by ... MK-XS-F-036 initCrashReporting
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-036 initCrashReporting
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-133
 * Changed ..... not in git yet (—)
 */
function loadSentry(): any {
  // @sentry/react-native is installed + wired (Expo plugin in app.config.js, Metro wrap, DSN in extra).
  // require()'d (not import) so the app still runs if the native module is ever absent; jest uses the
  // stub in __mocks__/@sentry/react-native.js so tests never load the native SDK.
  try { return require('@sentry/react-native'); } catch { return null; }
}

/** Initialise crash reporting once, at app start. Safe to call when Sentry isn't installed. */
/* ─ MK-XS-F-036 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * initCrashReporting
 *
 * Answers ..... Initialise crash reporting once, at app start.
 *
 * Formula .....
 *     dsn = (constants.expo config.extra as any).SENTRY_DSN (or process.env.SENTRY_DSN (or '' when missing or zero) when missing or zero)
 *     s = load sentry()
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-036
 * Changed ..... 2026-06-23 (f43819e)
 */
export function initCrashReporting(): void {
  const dsn = (Constants.expoConfig?.extra as any)?.SENTRY_DSN || process.env.SENTRY_DSN || '';
  const S = loadSentry();
  if (S && dsn) {
    try {
      // sendDefaultPii:false — never let Sentry auto-attach IP/PII; we only tag the uid via setUserScope.
      // Keeps crash reporting consistent with the privacy promise (no financial data, minimal PII).
      S.init({ dsn, enableNative: true, tracesSampleRate: 0.2, sendDefaultPii: false });
      sentry = S;          // FIX: without this, captureException (enabled && sentry) never actually reported
      enabled = true;
    } catch {
      enabled = false;
    }
  }
  // Always install a global JS-error handler so uncaught errors are captured even without Sentry.
  installGlobalHandler();
}

/* ─ MK-XS-F-134 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * installGlobalHandler
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     g = global this as any
 *     prev = error utils.get global handler.()
 *
 * Called by ... MK-XS-F-036 initCrashReporting
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-036 initCrashReporting
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-134
 * Changed ..... not in git yet (—)
 */
function installGlobalHandler(): void {
  const g: any = globalThis as any;
  if (g.__finwiseErrHandler) return; // install once
  const prev = g.ErrorUtils?.getGlobalHandler?.();
  g.ErrorUtils?.setGlobalHandler?.((error: any, isFatal?: boolean) => {
    captureException(error, { fatal: !!isFatal, source: 'global' });
    prev?.(error, isFatal);
  });
  g.__finwiseErrHandler = true;
}

/** Report a caught error. No-ops safely when reporting isn't configured. */
/* ─ MK-XS-F-037 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * captureException
 *
 * Answers ..... Report a caught error.
 *
 * Formula .....
 *     It records or announces something and returns no figure — no arithmetic of its own.
 *
 * Called by ... MK-XS-F-036 initCrashReporting · MK-XS-F-040 sendTestReport
 *               MK-XS-F-134 installGlobalHandler
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-036 initCrashReporting · MK-XS-F-134 installGlobalHandler
 *               MK-XS-F-040 sendTestReport
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-037
 * Changed ..... 2026-06-19 (fb87a0b)
 */
export function captureException(error: unknown, extra?: Extra): void {
  if (enabled && sentry) {
    try {
      sentry.captureException(error, extra ? { extra } : undefined);
      return;
    } catch {
      /* fall through to console */
    }
  }
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.error('[crashReporter]', error, extra ?? '');
}

/** Tag the current user on reports (call after login; pass null on logout). Never sends PII beyond the uid. */
/* ─ MK-XS-F-038 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * setUserScope
 *
 * Answers ..... Tag the current user on reports (call after login; pass null on logout).
 *
 * Formula .....
 *     It records or announces something and returns no figure — no arithmetic of its own.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-038
 * Changed ..... 2026-06-23 (f43819e)
 */
export function setUserScope(uid: string | null): void {
  if (enabled && sentry) {
    try {
      sentry.setUser(uid ? { id: uid } : null);
    } catch {
      /* ignore */
    }
  }
}

/** Whether reports are actually shipping to Sentry (DSN + SDK present). Used by the verification UI. */
/* ─ MK-XS-F-039 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * crashReportingEnabled
 *
 * Answers ..... Whether reports are actually shipping to Sentry (DSN + SDK present).
 *
 * Formula .....
 *     enabled
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-039
 * Changed ..... 2026-07-13 (762d771)
 */
export function crashReportingEnabled(): boolean {
  return enabled;
}

/** B-L2 verification: send a harmless test event so you can confirm wiring in the Sentry dashboard
 *  (works on the production/TestFlight build). No-ops to the dev console when Sentry isn't configured. */
/* ─ MK-XS-F-040 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * sendTestReport
 *
 * Answers ..... B-L2 verification: send a harmless test event so you can confirm wiring in the Sentry dashboard (works on the production/TestFlight build).
 *
 * Formula .....
 *     enabled
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-040
 * Changed ..... 2026-07-13 (762d771)
 */
export function sendTestReport(): boolean {
  captureException(new Error('MoneyKeel diagnostic test — Sentry wiring check'), { kind: 'test_report' });
  return enabled;
}
