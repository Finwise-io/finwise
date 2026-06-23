# FinWise — App Store Listing Copy + Screenshots Plan

_Launch-checklist Phase 2. Ready to paste into App Store Connect. Replaces the older Appendix A draft.
Character limits are Apple's; counts are approximate — verify in App Store Connect, which shows a live
counter. Positioning reflects the launch decisions: **US-only v1** (R-4) and **privacy-first / never
sent to AI** (B-L1)._

---

## 1. Text fields

### App name — max 30 chars
**`FinWise: Budget & Retirement`**  _(28)_
- Alt A: `FinWise: Money & Retire Plan` (28)
- Alt B: `FinWise — Private Money Plan` (28)

### Subtitle — max 30 chars
**`Budget, net worth, retirement`**  _(29)_
- Alt: `Private all-in-one money plan` (29)

### Promotional text — max 170 chars _(editable anytime, no resubmission — use for seasonal hooks)_
**`Your whole financial life in one private place — budget, net worth, and a real retirement plan. Encrypted, and never sent to AI. No bank login required.`**  _(~150)_

### Keywords — max 100 chars, comma-separated, NO spaces, don't repeat the name/subtitle
**`networth,savings,debt,money,finance,cash flow,portfolio,planner,nest egg,bills,FIRE,401k,fire calc`**
- Notes: Apple already indexes words in the name/subtitle, so "budget/retirement" are omitted here to save space. Singular forms cover plurals. Verify ≤100 chars.

### Description — max 4000 chars
```
FinWise is the private, all-in-one money app that meets you where you are — whether you're a student on a part-time paycheck, a server whose income changes week to week, a professional juggling salary and stock, or a retiree making savings last.

Most finance apps make you hand over your bank logins. FinWise doesn't. Your data is end-to-end encrypted — even we can't read it — and it's never sent to any AI or LLM provider. You stay in control.

ONE PLACE FOR YOUR WHOLE FINANCIAL LIFE
• Net worth — every account and debt in one clear picture, grouped by what you own, with an emergency-fund runway.
• Cash flow & bill calendar — see when money lands, when bills hit, and the months you'll be short, before they happen.
• Budget — track income and spending against a plan that fits real life, not a rigid spreadsheet.
• Goals & debt — save toward what matters and find the fastest way out of debt.

A REAL RETIREMENT PLAN (not a single guess)
• "Will my money last?" answered with a Monte Carlo simulation — 400 possible market futures, shown as a range of outcomes, not a false promise.
• Models Social Security, pensions, inflation, and required minimum distributions.
• See how retiring a year earlier, saving more, or spending less changes your odds.

BUILT FOR EVERYONE
• Simple mode keeps it friendly; Advisor mode shows the full detail.
• Import your investment holdings from a CSV — no account linking required.
• Clear, plain-English numbers with the math shown, so you can trust what you see.

PRIVATE BY DESIGN
• End-to-end encrypted on your device and in the cloud.
• Never sent to AI or LLM providers — tips and receipt scanning run on your device.
• No ads, no selling your data, no bank logins required.

FinWise provides general information for educational purposes, not financial, investment, or tax advice. Projections are estimates and are not guaranteed.
```
_(~1,750 chars — room to expand. US-only at launch.)_

### What's New (release notes for v1.0)
```
Welcome to FinWise 1.0 — your private, all-in-one money and retirement planner.
• Net worth, budget, cash flow, goals, and debt in one place
• A real retirement plan with Monte Carlo "will my money last?" odds
• End-to-end encrypted — and never sent to AI. No bank login required.
We'd love your feedback at support@finwise.app.
```

### URLs & metadata
- **Privacy Policy URL:** the live page (must match `docs/privacy/index.html` after the B-L1 re-host)
- **Support URL:** a simple support/contact page
- **Marketing URL (optional):** a landing page if you have one
- **Primary category:** Finance · **Secondary (optional):** Productivity
- **Age rating:** 4+ (no objectionable content)
- **Price:** Free (note any future IAP separately)

---

## 2. Screenshots plan

**⚠️ Capture on a REAL device, not the Simulator** — FinWise can't run on the iOS Simulator (ML Kit has
no arm64-sim slice). Use a connected iPhone (Xcode → Window → Devices, or the device screenshot button)
on the **production/TestFlight build**, then add caption frames in a tool (Figma / Screenshot Studio /
Fastlane frameit).

**Sizes to upload (App Store Connect):**
- **6.9" iPhone** (e.g. iPhone 16 Pro Max, 1320×2868) — the primary required set; Apple scales it down.
- **6.5" iPhone** (1242×2688) — optional fallback for older-device listings.
- **iPad 13"** — only if you ship an iPad build (you can launch iPhone-only).

**Order matters** (first 2–3 are what most users see). 8 frames, each with a bold caption + a one-line
subcaption, on-brand color. Set up the named **persona** so the numbers look real, not empty.

| # | Screen | Caption (bold) | Subcaption | Setup |
|---|--------|----------------|------------|-------|
| 1 | **Home dashboard** | Your money, all in one place | Net worth, cash flow, and what needs attention — at a glance | Professional persona with a few accounts + this month's spend logged |
| 2 | **Privacy (Settings → Security, or a marketing frame)** | Private by design | Encrypted. Never sent to AI. No bank login required. | Show the emphasized "encrypted … never sent to AI/LLM" claim |
| 3 | **Retirement cockpit (Monte Carlo + band)** | Will your money last? | A real answer — 400 market futures, shown as a range | Retiree or pre-retiree persona with a nest egg + spending plan |
| 4 | **Net Worth (donut by asset class)** | See everything you own and owe | Grouped by asset class, with your emergency-fund runway | Persona with cash + investments + a home + a debt |
| 5 | **Cash flow / bill calendar** | Know the tight months early | When money lands, when bills hit, and where you'll be short | Variable-income persona (bills + an irregular paycheck) |
| 6 | **Budget / spending** | A budget that fits real life | Track spending against a plan, not a rigid template | Persona with itemized categories + month-to-date expenses |
| 7 | **Goals & debt payoff** | A clear path forward | Fund your goals and find the fastest way out of debt | Persona with 1–2 goals + a card balance |
| 8 | **Simple vs Advisor mode** | Simple when you want it, deep when you need it | Plain-English by default; full detail one tap away | Same screen toggled, or a split frame |

**Caption style:** ≤5 words bold headline + ≤9 words subcaption; consistent brand color background; the
device frame showing the real screen. Keep the value prop (privacy + all-in-one + real retirement) in
the first three frames.

**App Preview video (optional, post-launch):** a 15–30s screen recording walking Home → Net Worth →
Retirement odds converts well, but is not required for v1.

---

## 3. Pre-submit checklist (🧑)
- [ ] Pick the final name/subtitle from the options above.
- [ ] Verify each field's character count in App Store Connect (live counter).
- [ ] Capture the 8 screenshots on a **real device** (production build) per the persona setups.
- [ ] Add caption frames; upload 6.9" (+ 6.5" if desired).
- [ ] Confirm Privacy Policy + Support URLs are live and match the in-app claims.
- [ ] Fill the reviewer note + demo login (`docs/finwise-app-review-notes.md`).
