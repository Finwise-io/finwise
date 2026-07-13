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

function loadSentry(): any {
  // @sentry/react-native is installed + wired (Expo plugin in app.config.js, Metro wrap, DSN in extra).
  // require()'d (not import) so the app still runs if the native module is ever absent; jest uses the
  // stub in __mocks__/@sentry/react-native.js so tests never load the native SDK.
  try { return require('@sentry/react-native'); } catch { return null; }
}

/** Initialise crash reporting once, at app start. Safe to call when Sentry isn't installed. */
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
export function crashReportingEnabled(): boolean {
  return enabled;
}

/** B-L2 verification: send a harmless test event so you can confirm wiring in the Sentry dashboard
 *  (works on the production/TestFlight build). No-ops to the dev console when Sentry isn't configured. */
export function sendTestReport(): boolean {
  captureException(new Error('MoneyKeel diagnostic test — Sentry wiring check'), { kind: 'test_report' });
  return enabled;
}
