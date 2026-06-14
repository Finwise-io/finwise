# Maestro E2E flows

Tap-driven UI tests that exercise journeys the Jest unit/integration suite can't drive (real
navigation, real screens). They complement — not replace — the Jest suite (`npm test`).

## Flows
- **`smoke.yaml`** — launches the app and deep-links through Home → Settings → Net Worth. Asserts the
  app renders without a red-screen, the **net-worth chip ($) agrees with the Net Worth screen** (B-49
  consistency), and the **Settings currency picker is gone** (B-23, USD-only).
- **`b21-add-sheet.yaml`** — from Net Worth, opens the Add-asset editor and confirms it offers a
  **$0-capable add** (the "Add asset" label = amount blank/$0), i.e. the B-21 placeholder path is
  reachable.

## Running locally
Prereqs:
1. Maestro CLI installed — `curl -Ls "https://get.maestro.mobile.dev" | bash` (needs Java).
2. A booted iOS simulator with the app installed (`npm run ios` once).
3. Metro running (`npm start`) — the dev build loads JS from Metro, so the first launch is slow;
   the flows use `extendedWaitUntil` to absorb that.

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
