# FinWise — Pre‑ship Checklist
### The states to verify on every flow BEFORE a build goes out — so defects are caught here, not by the founder on TestFlight.

> Born 2026-06-22 after the recovery flow took **4 manual TestFlight rounds**. Every bug we hit was a
> *class* of bug we now check systematically. Rule: **a build isn't "done" until each changed flow
> passes its row here.** And: **every bug found by hand becomes a regression test** at the lowest layer
> that can catch it (see `finwise-robustness-assessment.md`).

## A. Universal states — check on EVERY flow you touched
These are the categories that have actually bitten us. For each screen/flow changed, run through:

| State | What to do | The bug it catches |
|---|---|---|
| **First run** | Fresh state (clearState / new account) | wrong initial values |
| **Second run** | Do the flow **twice** in one session | **state persisting across remounts** (the recovery checkbox stayed checked — issue 2) |
| **Ordering / timing** | Watch what appears **first**; nothing should flash then get covered | the recovery screen appearing **after** onboarding (4 rounds) |
| **Slow path** | Throttle network; trigger any heavy crypto/compute | a frozen control during PBKDF2; a value set "a few seconds late" (L‑6) |
| **Error path** | Bad input, wrong password, offline, duplicate email | unhandled errors, "Something went wrong" |
| **Background → resume** | Background the app mid‑flow, reopen (Face ID if on) | cloud reload clobbering local state (re‑run setup → Home, L‑5) |
| **Keyboard** | Tap every input near the bottom | field/button hidden behind the keyboard (#20) |
| **Number agreement** | Compare the same figure across screens | one concept, two numbers (spend/savings‑rate/net‑worth divergence) |

## B. Critical flows — specific contracts (the automated Maestro flows assert these)

**Signup → recovery → onboarding** (`.maestro/auth-signup.yaml`)
- [ ] Account screen is **first** (Create account / Sign in), not a question
- [ ] After Create account, the **recovery code screen is the FIRST thing shown** — no question behind it, no multi‑second delay
- [ ] Recovery checkbox starts **unchecked**; Continue is **disabled** until checked
- [ ] **Do it twice** → second signup's checkbox is **unchecked** again
- [ ] After recovery → onboarding asks **"Which best describes you?"** — **no "What should we call you?"** (name came from signup)

**Login** — valid creds → Home; wrong password → friendly error (not "Something went wrong"); reset‑needed → recovery prompt.

**Re‑run setup** (`.maestro/rerun-setup.yaml`)
- [ ] Settings → re‑run setup → lands in **setup** (first question)
- [ ] Background + **Face ID unlock** → still in **setup**, **not Home** (L‑5)

**Delete account** — confirm → re‑auth → returns to auth screen; data gone.

**Import holdings** (post‑taxonomy) — a real brokerage CSV (the E*TRADE file) imports; CD→cash, option→alternatives, stock→equities; preamble + TOTAL rows skipped.

## C. Money‑number agreement (taxonomy)
For any screen showing a money concept, confirm it matches its **canonical selector** (agreement tests enforce this in Jest, but spot‑check on device):
- [ ] Net worth identical on the chip and the Net Worth screen
- [ ] "Actual spend" (transactions) vs "Planned spend" (max of estimate/categories) labeled and distinct
- [ ] Investments / investable / cash totals match the donut

## D. Performance budget
- [ ] No interactive control is frozen **> ~1s** on a critical screen (heavy crypto/compute deferred or off‑thread)
- [ ] Cold start to first interactive screen is reasonable

## How this ties together
1. **Jest** (`npm test`) — logic, data, render‑doesn't‑crash, and **agreement tests** + every **regression test**.
2. **Maestro** (`npm run test:e2e`, on a **real device** — the simulator can't run this app) — the journey *contracts* in §B.
3. **This checklist** — the human pass for what automation can't yet cover, on the **fast local device loop** (`docs/finwise-dev-loop.md`), not TestFlight.
4. **TestFlight** — final confirmation, not the place bugs are first found.
