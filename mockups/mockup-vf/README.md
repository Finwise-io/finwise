# mockup-vf — the FINAL approved-track screen specs

One file per screen. These are the **current** pictures the build must match; when a screen changes,
the file here is **updated in place** (its dated version history stays in `mockups/` — nothing is lost).

| File | Screen | States drawn | Last updated |
|---|---|---|---|
| `networth-FINAL.html` | Net worth (tab) | expanded · all-collapsed · first-day · missing-data banner in place · the $2,110 change sheet · the fix-it sheet | 2026-08-04 (from networth-final-v8) |
| `performance-FINAL.html` | Performance (tab) | rich · first-day · missing-data | 2026-08-04 (from performance-final-v3) |

## What these files already carry (decided + logged in the design doc changelog)
- **Banded sections** (UX design v1.2): deep-green title bands in white caps with totals riding the
  band; light-green group sub-bands. Built app-wide on all five tabs.
- **Empty-state rule**: keep the FULL layout with $0 values and the door to add data; the retirement
  first-view is the ONE app-wide sample (Home's), never reinvented per screen.
- **Value-walk structure** (both walks): Beginning value → Contributions → Withdrawals →
  WEALTH GENERATED (Dividends · Interest · Change in investment value) → Ending value. Rows always
  sum exactly. Net worth's sheet says "net worth" and carries "Debt principal you paid"; Performance
  says "market value". No ＋ signs; − kept.
- **Change percent** measured on cash + investments, denominator named on the line.
- **Classification**: cash = cash only — money-market funds → Stocks/ETFs, CDs/T-bills → Bonds & CDs.
- **Missing-data honesty**: no standing disclaimers; an inline banner appears ONLY when a promised
  number is incomplete, names each gap, and its fix-it sheet links straight to the cure. Five checks:
  no price · stale account · no dividend/interest records · stale hand-entered value · shared-history
  depth (the depth line appears only where the window predates the shared history).

## Rules for this folder
1. One file per screen, no version numbers in the name — the newest picture lives here.
2. Numbers inside must add up, in every state.
3. Every screen shows top-to-bottom, including the first-day and missing-data states.
