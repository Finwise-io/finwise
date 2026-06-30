# FCC core (55–70) — the shared build

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
| High-level conceptual design (+ wireframes) | `FCC-core-highlevel-design-v1.0-2026-06-30.xlsx` | 🟡 awaiting your review (first design gate) |
| PRD (one-stop-shop + calculation catalog + sameness contract) | `FCC-core-PRD-v*.xlsx` | pending |
| Detailed design (+ wireframes + data-lineage map) | `FCC-core-detailed-*-v*.xlsx` | pending |
| UX design (design system · colorblind-safe · mobile) | `FCC-core-ux-v*.xlsx` | pending |
| Build | (code) | pending |

## Naming convention
`<topic>-v<major.minor>-<YYYY-MM-DD>.xlsx` — always version + date; supersede in place, never duplicate.

## Key engineering note surfaced by the high-level design
Most of the core REUSES what's built (net worth, performance/Grow-&-Track, retirement Monte-Carlo, spend-down
primitives). The genuinely **NEW** build is: (1) the secure read-only bank/brokerage **connection**; (2) a
**real month-by-month engine** for Safe-to-spend — today retirement income is averaged to a flat monthly figure
and the safe withdrawal is annual-only, so "safe to spend THIS month" doesn't exist yet and must be built
(per the user's non-negotiable accuracy requirement).

## Index
- [FCC-core-highlevel-design-v1.0-2026-06-30.xlsx](FCC-core-highlevel-design-v1.0-2026-06-30.xlsx) — overview ·
  10 principles · 10 features (each traced to a need + reuse/NEW) · navigation (5 tabs) · 6 key screens with
  phone wireframes · 6 primary journeys. Approve?/Comments on every row.
