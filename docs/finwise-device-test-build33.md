# FinWise — Device test checklist (build #33, v1.0.8)

Single comprehensive pass on a real device (TestFlight). Tick each item; note anything off in the **Notes**
column. Build: #33 · v1.0.8 · branch `taxonomy-v1.0.7` · submitted 2026-06-25.

> Why a real device: ML Kit (receipt OCR) + keychain encryption only run in a real build, and several
> build-30 bugs were device-only. The Simulator can't run this app.

---

## 1. Accuracy — the trust-critical numbers
- [ ] **Surplus agrees everywhere.** Home cash-flow box, **Cash-flow detail**, and **Budget** "Planned surplus"
      all show the SAME number, after debt. Home is labeled as *this month* (Actual); the others *Planned*.
- [ ] **% spending category matches.** Enter a spending category as a **percent** (e.g. rent 30%). The dollar
      on the spending screen == the dollar the Budget/runway uses (with a 401(k) set).
- [ ] **Savings rate is consistent** between onboarding ("% of take-home you save") and Analytics.
- [ ] **Take-home** shown anywhere = after tax AND 401(k) (not "net before 401k").

## 2. The three build-30 device bugs
- [ ] **T22 — Cash-flow detail.** From Home tap "Cash-flow detail →". It opens a screen **titled "Cash-flow
      detail"** with a **back button** — does NOT look like Home / feel like a loop.
- [ ] **T10 — Grow & track.** Menu (☰) → **"Grow & track"** opens your portfolio/performance screen.
- [ ] **T09 — Roth in Simple mode.** Retirement screen in **Simple** display mode shows the Roth verdict
      ("⚖️ Lean Roth / Lean Traditional"). (Advisor mode shows the full rationale.)

## 3. New features
- [ ] **Hide balances — eye icon.** Tap the **eye** (top-right, next to the NW chip). Every money amount
      becomes ••••. Tap again to restore.
- [ ] **Hide balances — Settings.** Settings → Security → **Hide balances** toggle does the same.
- [ ] **Goals funded from surplus.** Home → "Put your surplus to work" sheet shows a **GOALS** section above
      **ACCOUNTS**. Assign part of the surplus to a goal → save.
- [ ] **Goal progress moves from real money.** That goal's **saved / progress bar** increases by what you assigned.
- [ ] **Goal status.** Rewards/Goals screen shows **"need $X/mo by <date>"** and **🟢 on track / 🟡 behind**.
- [ ] **Info-dots (ⓘ).** Budget "Planned surplus" and Retirement "Tax-smart moves" have a tappable ⓘ that
      opens a plain-English definition.
- [ ] **Keyboard.** Classify a **401(k)** account's asset class — the **amount field stays visible** above the
      keyboard (the original frustration). Spot-check a couple other input sheets too.

## 4. Verifications
- [ ] **Sentry (B-L2).** Settings → Legal & Support → **"Send a diagnostic report"** → within ~1 min the event
      appears in the Sentry dashboard (org `finwise-35`). _This is the B-L2 "done" check._
- [ ] **CSV import (T19).** Net Worth → Import holdings → pick a CSV → it reads without "couldn't read that file".

## 5. Core smoke (nothing regressed)
- [ ] Fresh **onboarding** completes for at least one persona; numbers reconcile on the recap.
- [ ] **Net Worth** donut + legend render; Assets − Debts = Net worth is shown.
- [ ] **Retirement** cockpit loads; chance-of-success + nest egg show; the **disclaimer** is at the bottom.
- [ ] **Sign up → log out → recover → log back in** works.
- [ ] No crash opening any tab; app survives **background → foreground**.

---

### Result
- Pass: ____ / total · Date tested: ________ · Device/iOS: ________
- **Blockers found (must fix before public submit):**
- **Non-blockers (fast-follow):**
