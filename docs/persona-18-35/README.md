# Persona: Employed 18–35 (the launch wedge)

> ⚠️ **SUPERSEDED 2026-06-29.** The 18–35 target was retired after the market-opportunity research (the
> "cradle-to-grave gap"): 18–35 budgeting is the *most crowded, lowest-WTP, most-disposable* segment. The
> strategy moved to the under-served middle/late — **`docs/FCC-36-65/`** and **`docs/FCC-65+/`**. The master
> action list moved to **`docs/finwise-master-action-list-v1.1-2026-06-29.xlsx`** (root). The research here is
> kept for reference (the wedge/pain + Robinhood-gen findings still inform the daily-hook thinking).

All documents for the 18–35 focus area live in this folder (now archived/reference).

## Naming convention (so we can always trace back)
`<topic>-v<major.minor>-<YYYY-MM-DD>.md|.xlsx`
- **Always** include a version AND a date in the filename.
- **Never duplicate**: on a substantive change, supersede the file — bump the version (and date), don't fork
  a parallel copy with a different stem. Minor edits keep the version, refresh the date only if meaningful.
- One topic = one living file stem; the version/date trail is the history.

## The doc chain (gated — each approved before the next)
| Stage | File | Status |
|-------|------|--------|
| Research | `18-35-research-v1.0-2026-06-29.md` | ✅ done |
| Product Requirements (PRD) — persona + wedge + scope cut | `18-35-PRD-v0.1-2026-06-29.md` | 🟡 draft — awaiting approval |
| Conceptual design — experience architecture | `18-35-conceptual-design-v*.md` | pending |
| Detailed design — per screen/flow | `18-35-detailed-<screen>-v*.md` | pending |
| Build | (code) | pending |

## Decisions locked (2026-06-29)
1. **Wedge** — Safe-to-spend + "Can I afford X?" → starter emergency fund. ✅
2. **Low-friction data** — privacy-preserving bank sync (read-only, on-device, encrypted). ✅
   (Technical spike needed: aggregator choice + on-device storage model — see PRD §4/§8.)

## Index
- [finwise-master-action-list-v1.0-2026-06-29.xlsx](finwise-master-action-list-v1.0-2026-06-29.xlsx) — master
  open-items list + Principal-PM review + Phase 2 persona-platform plan (3 tabs; your approval/comments columns).
- [18-35-research-v1.0-2026-06-29.md](18-35-research-v1.0-2026-06-29.md) — what 18–35 actually struggle with;
  fact-checked; points to a daily Safe-to-spend wedge.
- [18-35-scope-nw-investing-retirement-v1.0-2026-06-29.md](18-35-scope-nw-investing-retirement-v1.0-2026-06-29.md)
  — data + pros/cons on including Net Worth / Investing / Retirement in v1. Rec: NW light, investing-depth defer,
  retirement light cue. 🟡 awaiting your scope decision.
- [18-35-PRD-v0.1-2026-06-29.md](18-35-PRD-v0.1-2026-06-29.md) — PRD (scope §6 to be revised → v0.2 after the
  scope decision).
