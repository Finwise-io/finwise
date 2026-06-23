# FinWise — Sentry crash reporting setup (B-L2)

The app is **DSN-ready**: `crashReporter.ts` is wired into `app/_layout.tsx` (init + user scope) and the
root `ErrorBoundary`, reads `SENTRY_DSN` from `app.config.js → extra`, sends `sendDefaultPii: false`,
tags only the anonymous `uid`, and degrades to a safe no-op when Sentry isn't present. Settings →
**Legal & Support → "Send a diagnostic report"** triggers a test event for verification. The privacy
policy already discloses Sentry.

The remaining steps need a Sentry account + a rebuild (native SDK). Do these once.

## 1. Create the Sentry project (🧑)
1. Sign up at https://sentry.io → create an **Organization** and a **Project**, platform **React Native**.
2. Copy the **DSN** (looks like `https://abc123@o456.ingest.sentry.io/789`). It's a **public ingest key** — safe to bundle.
3. Create an **auth token** (Settings → Auth Tokens) with `project:releases` scope — used at *build time* to upload source maps. This **is** a secret → store as an EAS secret, never in the repo.

## 2. Install the SDK (🧑)
```bash
npx expo install @sentry/react-native
```

## 3. Activate the code (🤖 — one line; tell me to do it after install)
In `src/services/crashReporter.ts`, change `loadSentry()` to actually load the now-installed module:
```js
function loadSentry(): any {
  try { return require('@sentry/react-native'); } catch { return null; }
}
```
_(It's intentionally `return null` today so the Metro build doesn't try to bundle a module that isn't installed yet. Once installed, this is safe.)_

## 4. Wire the Expo plugin + Metro (🤖 — after install)
- `app.config.js → plugins`: add
  ```js
  ['@sentry/react-native/expo', { organization: 'YOUR_ORG', project: 'YOUR_PROJECT' }],
  ```
- `metro.config.js`: wrap the export with `getSentryExpoConfig(__dirname)` (instead of `getDefaultConfig`) so source maps upload — keeping the existing `unstable_enablePackageExports = false` and `sourceExts.push('cjs')` tweaks.

## 5. Set the keys (🧑)
- **DSN** (non-secret) — either set `SENTRY_DSN` as an env var / EAS secret, or paste it into `app.config.js → extra.SENTRY_DSN` default. Send me the DSN and I'll wire whichever you prefer.
- **Auth token** (secret) — `eas secret:create --name SENTRY_AUTH_TOKEN --value <token>`.

## 6. Rebuild + verify (🧑)
```bash
eas build --platform ios --profile production
```
Install the build → **Settings → Send a diagnostic report** → confirm the event appears in the Sentry
dashboard within ~1 min. (Also try force-quitting after a deliberate error to confirm native crashes
report.) **B-L2 is done when that test event shows up.**

---

### What I need from you to finish B-L2
1. Run `npx expo install @sentry/react-native`.
2. Send me the **DSN** (and your Sentry **org + project** slugs for the plugin).
Then I'll do steps 3–4 and the DSN wiring in one commit; you set the auth-token secret and rebuild.
