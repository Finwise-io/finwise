# FCC 65+ — Finance Command Center (retirement / decumulation)

Strategy, design, and planning documents for the **65+** customer group. Kept separate from FCC-36-65 so the
two strategies don't convolute. **Queued — we work FCC-36-65 first** (one strategy at a time).

## Target
**65+ · 57M people · 21% of US adults.** Decumulation: turning assets into income, **Social Security / Medicare
timing**, **required minimum withdrawals**, **estate / legacy**, and **fraud protection** (the most-targeted
age group).

## Why here (strategic basis)
Thinly served — planners *model* the math but **none execute it with daily money**; willingness-to-pay is high
and the stakes make people seek help. Trust-sensitivity points to **institution-embedded (B2B2C) distribution**
(advisors, Medicare / benefits brokers). Reuses what's built: retirement cockpit (decumulation), RMD, Social
Security, estate.

## Proposed spearhead (pending your decision)
**Decumulation "safe-to-spend in retirement"** — *how much can I spend this month without running out* — paired
with **Social Security / Medicare timing**. (Note: "safe-to-spend" returns here, reframed for drawdown.)

## Doc chain (separate files, each gated)
| Stage | File | Status |
|-------|------|--------|
| Strategy | `FCC-65+-strategy-v*.md` | queued |
| Conceptual design | `FCC-65+-conceptual-design-v*.md` | queued |
| Detailed design | `FCC-65+-detailed-<screen>-v*.md` | queued |
| Planning / build | `FCC-65+-plan-v*.md` | queued |

## Naming convention
`<topic>-v<major.minor>-<YYYY-MM-DD>.md` — always version + date; never duplicate (supersede in place + bump).

## Decisions locked (shared with FCC-36-65)
1. **Identity** — TWO LEVELS. *Primary (shared with 36-65):* truth + your **CHIEF OF STAFF** for the big
   decisions — we guide you through (numbers, options, trade-offs, steps, deadlines incl. Social Security /
   Medicare / required withdrawals), YOU decide; never advise, never predict. *Secondary (this group):*
   **"Worry less, live more."**
2. **Hook** — **safe-to-spend-in-retirement** (how much can I spend this month without running out); will-it-last
   is the reassurance layer. (The 65+ version of the investments-led 36-65 hook.)
3. **Voice** — pointed but warm; calm + steady for retirees.
4. **Distribution** — direct-to-consumer first (design for B2B2C later).
5. **Sequencing** — proposed: shared 55–70 core first → deepen 70+ (final call across both groups, pending).

## Key requirements captured (for the PRD)
- **Safe-to-spend must be REAL month-by-month, never a flat average** (user, 2026-06-30). A retiree may get one
  big pension/annuity payment in a single month, or face a big lumpy expense (property tax, a trip) in another.
  `income/12 − spend/12` would be WRONG. Safe-to-spend is computed per actual month using the real *timing* of
  guaranteed income and known lumpy expenses. Accuracy is non-negotiable here (a wrong number = lost trust).
  (Builds on the existing 12-month grid that already captures lumpy non-monthly items.)

## Index
- [FCC-65+-problem-strategy-v2.1-2026-06-30.xlsx](FCC-65+-problem-strategy-v2.1-2026-06-30.xlsx) —
  **CURRENT.** Problem + Strategy reworked to mirror the approved 36-65 spine (Identity → Objective → Hook →
  What we reveal / never do → Voice → Sequencing → Scope), hook = safe-to-spend-in-retirement. 🟡 awaiting your
  review. (Prior v1.0/v1.1 in git history.)
