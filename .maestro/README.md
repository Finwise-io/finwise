# Maestro E2E flows

Tap-driven UI tests that exercise journeys the Jest unit/integration suite can't drive (real
navigation, real screens). They complement — not replace — the Jest suite (`npm test`).

## Flows
- **`auth-signup.yaml`** — the **critical** journey: signup → **recovery code shown FIRST** → onboarding
  (no name step). Encodes the contracts that took **4 manual TestFlight rounds** to get right. Creates a
  throwaway account; selectors validated on the first device run.
- **`smoke.yaml`** — launches the app and deep-links through Home → Settings → Net Worth. Asserts the
  app renders without a red-screen, the **net-worth chip ($) agrees with the Net Worth screen** (B-49
  consistency), and the **Settings currency picker is gone** (B-23, USD-only).
- **`b21-add-sheet.yaml`** — from Net Worth, opens the Add-asset editor and confirms it offers a
  **$0-capable add** (the "Add asset" label = amount blank/$0), i.e. the B-21 placeholder path is
  reachable.
- **`nw-donut.yaml`** — the Net Worth screen shows a donut **grouped by asset class** with net worth in
  the center, and the explicit **"Assets − Debts = Net worth" identity** (#19/#9/#4). A seeded
  retirement account shows as **"Unclassified"**, not assumed Stocks/ETFs (#10).
- **`cashflow.yaml`** — taps **"Cash-flow detail →"** on Home (verifying the #15 entry point) and
  asserts the detail screen renders all four sections: the typical-month breakdown (**"= Surplus"**),
  the **month-by-month surplus** projection, **take-home vs spending**, and **planned-vs-actual**.

## Running locally
> ⚠️ Run on a **real device**, NOT the Simulator — this app can't run on the iOS Simulator (ML Kit has
> no arm64-simulator slice, L-3). Set up the device dev build once via `docs/finwise-dev-loop.md`.

Prereqs:
1. Maestro CLI installed — `curl -Ls "https://get.maestro.mobile.dev" | bash` (needs Java).
2. The **dev build installed on your iPhone** (see `docs/finwise-dev-loop.md`).
3. Metro running (`npx expo start --dev-client`) — the dev build loads JS from Metro, so the first
   launch is slow; the flows use `extendedWaitUntil` to absorb that.

```bash
npm run test:e2e            # runs every flow in .maestro/
maestro test .maestro/smoke.yaml   # a single flow
```

## Notes / known limitations
- Selectors match the **iOS accessibility tree**, where touchables group their text (e.g. the chip
  reads `"NW, , $990,000, "`). Assert on clean standalone labels or substrings (`.*990,000.*`).
- Greeting text is time-of-day dependent — match `Good (morning|afternoon|evening)`, not a fixed one.
- The Add-asset **bottom sheet renders as one grouped accessibility element**, so Maestro cannot tap
  the amount field / Save button individually to *complete* a $0 add. That guard (blank blocked,
  typed `"0"` allowed) is covered deterministically by the `assetSheetReady` unit test in
  `src/screens/__tests__/NetWorthScreen.test.tsx`.
- Flows assume the standard seeded profile (e.g. an empty CASH section). `clearState: false` keeps it.
