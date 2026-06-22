# FinWise — Fast local device loop (stop using TestFlight to debug)

> Why this exists: the iOS **Simulator can't run this app** (ML Kit has no arm64‑simulator slice, L‑3),
> so every check was becoming a **~20‑minute TestFlight round**. But a **development build on your real
> iPhone runs fine** (ML Kit ships arm64 *device* binaries) — and reloads JS from Metro in **seconds**.
> This is the loop that turns "4 TestFlight rounds" into "4 reloads."

## One‑time setup (≈20 min, done once)
1. **Install the dev‑client package** (picks the SDK‑correct version):
   ```bash
   npx expo install expo-dev-client
   ```
2. **Build the dev client for your device** (the `development` eas profile already exists — it sets
   `developmentClient: true`):
   ```bash
   npx eas build --platform ios --profile development
   ```
   - Register your iPhone when prompted (Apple lets you add it to the provisioning profile).
   - Install the resulting build on your phone (the EAS link / QR).
   *This is a normal native build, so it does ~once what TestFlight did — but you only rebuild it when
   native dependencies change, not for JS/UI edits.*

## The daily loop (seconds per change)
1. Start Metro:
   ```bash
   npx expo start --dev-client
   ```
2. Open the **FinWise (dev)** app on your phone → it connects to Metro.
3. Edit JS/TS/UI → **save** → the app **fast‑refreshes** in ~1–2s. No rebuild, no TestFlight.
4. Shake the phone for the dev menu (reload, inspector, performance monitor).

**Rebuild the dev client (`eas build … development`) only when:** you add/remove a **native dependency**
(e.g. expo‑dev‑client itself, a new expo module), or change `app.config.js` native settings. Pure
JS/UI/logic changes never need it.

## Running the Maestro E2E flows against the device
With the dev app installed + Metro running:
```bash
npm run test:e2e                       # all flows in .maestro/
maestro test .maestro/auth-signup.yaml # one flow
```
Maestro drives the **real device** (not the simulator). First launch is slow (Metro bundle) — the
flows use `extendedWaitUntil` to absorb it.

## When to still use TestFlight
- Final pre‑release confirmation of a build.
- Anything that must run a **production** (non‑dev, no‑Metro) binary.
- Sharing with other testers.

Everything else — your own verification, the pre‑ship checklist (`docs/finwise-preship-checklist.md`),
Maestro — happens here, fast.
