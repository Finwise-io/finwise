# FinWise — dependency security scan & triage (2026-06-27)

Pre-launch dependency audit (parked item **P-23**). Source: `npm audit`. The headline "52 vulnerabilities"
is misleading — **almost all are build/dev tooling that never ships in the app bundle.** This note records
what's actually in the shipped app, what was fixed, and what's deferred (with reasons).

## What ships in the app vs. what's only tooling
Metro bundles only the JS that app code (`src/`, `app/`) imports. Dev/build tools (Expo CLI, Metro, Jest,
Babel, firebase-tools, jsdom, etc.) are **not** in the user's app, so their advisories carry **no runtime
exposure** for users — they only matter to our build machine.

## Findings & actions

| Package | Sev | In shipped app? | Action |
|---|---|---|---|
| **xlsx** | high (no upstream fix) | **No** — not imported anywhere in `src/`/`app/`; only used by doc-gen tooling | ✅ **Moved to `devDependencies`** (was mis-listed in `dependencies`). Removes it from the production surface. |
| **ws** | high | **No** — transitive via Expo/Metro/firebase-tools/jsdom (dev server + tooling) | No action (tooling only, not shipped). |
| **@grpc/grpc-js** (<=1.9.15) | high | **Yes** — via Firebase (Firestore/Functions) | **Deferred to fast-follow.** Advisory = a *malformed request/compressed message can crash a server/client*. We are a **client talking only to Google's Firebase servers**, so this requires Google's infra to send malicious frames — not a realistic threat. A semver-safe `npm audit fix` exists; apply it **with device verification**, not blindly before the final build. |
| **undici** | high | Yes (Firebase-transitive) | Deferred (same reasoning — needs a malicious WebSocket server). |
| **@firebase/** *(auth, firestore, functions, storage, …)* | moderate | Yes | Deferred. Bumping Firebase major near the final build risks breaking auth/Firestore with no way to device-test this window. Fast-follow + device test. |
| ~46 other moderates (Expo, Metro, Jest, Babel, @grpc tooling) | low/moderate | **No** (tooling) | No action. |

## Result
- Production-dependency **highs: 5 → 4** after the `xlsx` move; the remaining highs are Firebase-transitive
  crash-DoS bugs that require a malicious/compromised server (very low real-world risk for a Firebase client).
- **No remediation that touches the shipped app was applied** before build #36, on purpose — the only
  meaningful runtime fixes are Firebase version bumps, which must be device-verified, not rushed into the
  final build.

## Recommended fast-follow (post-launch)
1. `npm audit fix` (non-`--force`) to patch `@grpc/grpc-js` / `undici`; rebuild + device-test Firestore/auth.
2. Plan a Firebase SDK bump on its own, with a full auth/sync regression pass.
3. Wire `npm audit --audit-level=high` + a secret scanner (gitleaks) into CI so this is continuous (P-23 / P-24).
