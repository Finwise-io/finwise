# FCC core (55–70) — the shared build

> **BRAND DECISION 2026-07-13: the app is MoneyKeel** (domain moneykeel.ai; tagline: “Your money’s chief of staff”).
> Docs below predate the rename — read FinWise as MoneyKeel throughout; xlsx branding cells update at the next doc revision.
> Naming trail: Keel/Helm and every variant squatted (verified at authoritative registries; earlier availability lists were wrong).

Design + build deliverables for the **shared 55–70 core** — the first thing we build. It's the top of the
working-years product (36–65, *Grow & Track* lens) AND the front door of the retirement product (65+,
*Safe-to-spend / Worry less, live more* lens): **one product, two faces.** Strategy for both groups is locked
(see `../FCC-36-65/` and `../FCC-65+/`).

## Identity (locked, shared)
Truth + your **chief of staff** for the big decisions — we guide you through (numbers, options, trade-offs,
steps, deadlines), **you decide**. Never advise, never predict. Plain English · month-by-month accuracy ·
mobile-first · colorblind-safe.

## Doc chain (gated — each approved before the next; deliverables in Excel/Word w/ Approve?+Comments)
| Stage | File | Status |
|-------|------|--------|
| High-level conceptual design (+ wireframes) | `FCC-core-highlevel-design-v1.2-2026-06-30.xlsx` | ✅ APPROVED |
| PRD (one-stop-shop + calculation catalog + sameness contract) | `FCC-core-PRD-v1.1-2026-07-01.xlsx` | ✅ APPROVED 2026-07-12 — v1.0 reviewed 2026-07-01 (14 comments + Plaid decision, marks preserved in the v1.0 file) → v1.1 answers every comment + adds 10 criteria; review with detailed design + UX together |
| Detailed design (+ wireframes + data-lineage map) | `FCC-core-detailed-design-v1.1-2026-07-06.xlsx` | ✅ APPROVED 2026-07-12 — v1.0 reviewed 2026-07-06 (32 comments + 4 macro, marks kept in v1.0) → v1.1 answers all + 3 new screens (40 total); top-bar “+” swap PROPOSED |
| UX design (design system · colorblind-safe · mobile) | `FCC-core-UX-design-v1.1-2026-07-06.xlsx` | ✅ APPROVED 2026-07-12 — v1.1 adds the keyboard GATE (buttons never behind the keyboard), copy-provenance rule, “+” component |
| Build | (code) | 🟢 IN PROGRESS — P0 fixes landed first; then engine + screen slices |

## Decisions locked 2026-07-01
- **Plaid = Option A APPROVED**: opt-in, read-only account connection; manual entry + file import stay
  first-class forever; "never leaves your device" copy retired for connected data. Cost check: Plaid free for
  the first 10 connected accounts, then ~$0.50–$1.50/account/month pay-as-you-go, no minimum — MX/Finicity are
  ~$10–15k/yr sales contracts (2–10× more at our size). Full comparison on the PRD's Plaid tab.

## Naming convention
`<topic>-v<major.minor>-<YYYY-MM-DD>.xlsx` — always version + date; supersede in place, never duplicate.

## Key engineering note surfaced by the high-level design
Most of the core REUSES what's built (net worth, performance/Grow-&-Track, retirement Monte-Carlo, spend-down
primitives). The genuinely **NEW** build is: (1) the secure read-only bank/brokerage **connection**; (2) a
**real month-by-month engine** for Safe-to-spend — today retirement income is averaged to a flat monthly figure
and the safe withdrawal is annual-only, so "safe to spend THIS month" doesn't exist yet and must be built
(per the user's non-negotiable accuracy requirement).

## Index
- [FCC-core-PRD-v1.1-2026-07-01.xlsx](FCC-core-PRD-v1.1-2026-07-01.xlsx) — **CURRENT PRD.** 9 tabs: the new
  "v1.0 review → v1.1" tab answers all 14 of your comments (code-grounded) + records the Plaid decision & cost
  comparison; 180 acceptance criteria (10 added from your review) tagged MET(91)/PARTIAL(28)/GAP(59); 422-field
  dictionary (+first_payment_date; actual_ttm editability corrected); 92-calc catalog; sameness contract (+lumpy-
  income month placement).
- [FCC-core-PRD-v1.0-2026-06-30.xlsx](FCC-core-PRD-v1.0-2026-06-30.xlsx) — superseded; **keeps your original
  review marks** (the review record).
- [FCC-core-detailed-design-v1.1-2026-07-06.xlsx](FCC-core-detailed-design-v1.1-2026-07-06.xlsx) — **CURRENT.**
  40 screens; the new "v1.0 review → v1.1" tab answers all 32 comments + 4 macro items; adds Onboarding flow map,
  manual add/edit account, Quick-add expense; top-bar "+" swap PROPOSED (your approve/reject inside).
- [FCC-core-UX-design-v1.1-2026-07-06.xlsx](FCC-core-UX-design-v1.1-2026-07-06.xlsx) — **CURRENT.** Adds the
  keyboard-visibility GATE, copy-provenance rule (no AI-generated text), the "+" component spec.
- [FCC-core-detailed-design-v1.0-2026-07-01.xlsx](FCC-core-detailed-design-v1.0-2026-07-01.xlsx) — superseded; keeps your review marks. Every screen
  of the 5 tabs wireframed + specified element-by-element with data lineage (number → engine → fields → sameness
  pin), all states, and the net-new engine specs (safe-to-spend paycheck, dated 12-month grid, account-sync seam,
  scenario adoption, scam flag, bond rate-sensitivity).
- [FCC-core-UX-design-v1.0-2026-07-01.xlsx](FCC-core-UX-design-v1.0-2026-07-01.xlsx) — superseded. Validated colorblind-safe
  palette (checked by script, not eyeballed), 65+ readability layer, mobile-fit rules, chart/money display specs,
  FCC component specs, accessibility gate checklist, voice & tone do/don't.
- [FCC-core-highlevel-design-v1.2-2026-06-30.xlsx](FCC-core-highlevel-design-v1.2-2026-06-30.xlsx) — **APPROVED.**
  Overview · 11 principles · 11 features (each traced to a need + reuse/NEW) · navigation (5 tabs) · 8 key screens
  with phone wireframes · 7 journeys. Front "What changed v1.1→v1.2" tab maps every review fix. Approve?/Comments
  on every row. (v1.0 = your comments + responses; v1.1 = folded those in; both in git history — superseded.)
- [FCC-core-highlevel-design-REVIEW-2026-06-30.md](FCC-core-highlevel-design-REVIEW-2026-06-30.md) — the
  multi-agent alignment review (design vs Problem+Strategy, both groups): verdict "strongly aligned", 2 must-fix +
  clarifications + the multi-goal scope reconciliation. Drove v1.2.
