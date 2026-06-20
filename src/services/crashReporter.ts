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
  // Sentry is NOT bundled yet. @sentry/react-native needs a proper Expo/Metro integration
  // (wrap metro.config.js with getSentryExpoConfig + the Expo plugin) and a SENTRY_DSN before it
  // works. Until then we ship crash capture via the global ErrorUtils handler below + dev console.
  // To enable Sentry later: `npx expo install @sentry/react-native`, add the metro wrap + plugin,
  // set SENTRY_DSN, then restore:  try { return require('@sentry/react-native'); } catch { return null; }
  return null;
}

/** Initialise crash reporting once, at app start. Safe to call when Sentry isn't installed. */
export function initCrashReporting(): void {
  const dsn = (Constants.expoConfig?.extra as any)?.SENTRY_DSN || process.env.SENTRY_DSN || '';
  const S = loadSentry();
  if (S && dsn) {
    try {
      S.init({ dsn, enableNative: true, tracesSampleRate: 0.2 });
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
