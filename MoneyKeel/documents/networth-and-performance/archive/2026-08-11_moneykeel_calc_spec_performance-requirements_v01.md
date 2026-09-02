# Handoff: Performance Screen (MoneyKeel)

## Overview
"Performance" tab — answers "how did my money do," distinct from Net Worth ("what do I have") and the account page's Activity ledger ("what actually happened"). Three states of the same screen, all sharing one structure so nothing moves position as data fills in: **Summary** (rich data), **Account Portfolio** (drill-in detail), **Day One** (empty state, honest zeros).

## About the Design File
`Performance.dc.html` is a **design reference**, not production code — rebuild in the target codebase's stack using its existing components/navigation/state patterns.

## Fidelity
High-fidelity. Colors, type, spacing, and copy below are final.

## Screens

### 1. Performance — Summary (main tab screen)
Header (brand-green band): MoneyKeel logo, "Performance," date. Below: period chips (Since Jul 19 / 1M / This year / 1Y / 3Y — each shows its own return or "—" if no data; exactly one active at a time). Summary block: ending value, wealth generated, return, a explanatory caption, then a line chart of value over the period. A warning banner (amber) when any figure is incomplete, sitting directly below the summary. Then "HOW $X BECAME $Y · ALL ACCOUNTS" walk (always expanded), followed by one walk per connected account (collapsible — tap the band to expand/collapse; tap the account name to navigate to its Portfolio screen). Ends with "WHAT EACH CATEGORY EARNED" table (category, earned, return/yr, tap row → category detail).

### 2. Account Portfolio (E*TRADE Account 1 — drill-in from an account walk)
Back caret + account name/subtitle header. Header stats (market value, return, income). Warning banner with two actions: "Enter dividends yourself" / "Sync now." This account's own walk (same structure as the all-accounts walk — contributions/withdrawals live per-account here). "BY CATEGORY & HOLDING": category sub-bands (light-green tint) each expand to list actual holdings with market value + return, and an "Income: $X kind" caption under each holding that earned income; an empty category says "Nothing held in this account" rather than disappearing. "ACTIVITY" ledger: dated records, broker records read-only, user-entered records tagged "you entered this" and editable (✎). Three entry points at the bottom: "Add a contribution or withdrawal," "Add a dividend or interest," "Add a buy or sale."

### 3. Day One (empty state)
Identical structure to Summary — same chips, same summary layout, same chart frame, same per-account walks, same category table — but every dollar figure is an honest `$0` / `—`, never invented or hidden. Chart shows a single point with "your line starts today." No collapse arrows needed (nothing to hide when everything's zero).

## Interactions & Navigation Map

| Element | Action |
|---|---|
| MoneyKeel logo | Navigate to **Home** |
| Period chip (Since Jul 19 / 1M / This year / 1Y / 3Y) | **In place** — switches the summary+chart+walk window; recomputes all downstream numbers for that window |
| Summary "ⓘ" icons | Info popover (window ≠ annualized; money-weighted definition) |
| "⚠ N numbers need more information ›" banner | Navigate to **Data issues** list screen |
| "Enter dividends yourself ›" | Navigate to **manual dividend entry** flow, scoped to this account |
| "Sync now ›" | **In place** — triggers a re-sync of this account's connection; show inline loading state |
| All-accounts walk | Always expanded, never collapsible |
| Per-account walk band (e.g. "▸ VANGUARD BROKERAGE") | **In place** — toggle expand/collapse; state persists per account across visits |
| Account name/subtitle within an expanded walk | Navigate to **Account Portfolio** for that account |
| Category row in "WHAT EACH CATEGORY EARNED" (Stocks & ETFs, Bonds & CDs, Sweep cash) | Navigate to **Category detail** (all holdings of that class across all accounts) |
| "ⓘ" on a category's income (e.g. "Sweep cash ⓘ") | Info popover explaining what counts as earned |
| Account Portfolio: back caret | Navigate back to **Performance — Summary** |
| Category sub-band (STOCKS & ETFS / BONDS & CDS / CASH / ALTERNATIVES) | **In place** — toggle expand/collapse |
| Holding row (e.g. "LCTX ›") | Navigate to **Holding detail** screen |
| Activity row (broker record) | Navigate to **Record detail** (read-only) |
| Activity row (user-entered, ✎) | Navigate to **Edit record** flow |
| "Add a contribution or withdrawal ›" | Open **add-transaction** flow, type = contribution/withdrawal |
| "Add a dividend or interest ›" | Open **add-transaction** flow, type = dividend/interest |
| "Add a buy or sale ›" | Open **add-transaction** flow, type = buy/sell |
| "See all activity (older than Jul 19) ›" | Navigate to **full activity history** for this account |
| Bottom nav (Home / Net worth / Performance / Cash flow / Plan) | Navigate to respective tab; Performance is current/active |

## Calculations
All figures reconcile for the "Since Jul 19" window (source: Aug 4, 2026 snapshot):

```
ALL-ACCOUNTS WALK
Beginning market value (Jul 19) = 352,404
+ Contributions                  = 0
+ Withdrawals                    = 0
Wealth generated                 = Dividends + Interest + Change in investment value
                                  = 1,220 + 430 + 260 = 1,910
Ending market value (Aug 4)      = Beginning + Contributions − Withdrawals + Wealth generated
                                  = 352,404 + 1,910 = 354,314

PER-ACCOUNT WALKS (must sum to the all-accounts walk)
Vanguard: 300,000 → +1,610 (1,100 div + 330 int + 180 chg) → 301,610
E*TRADE:   52,404 → +300   (120 div + 100 int + 80 chg)    → 52,704
Check: 300,000+52,404 = 352,404 ✓ · 1,610+300 = 1,910 ✓ · 301,610+52,704 = 354,314 ✓

RETURN % (Summary card) = Wealth generated / Beginning market value
  = 1,910 / 352,404 ≈ +0.5%  (money-weighted: exclude any period contributions/withdrawals from the denominator so money added never inflates return)

CATEGORY EARNINGS (What each category earned) — sum of dividends+interest per category, across all accounts, for the window
Stocks & ETFs = 1,220 (all dividends)         → return shown as %  (price-return style, e.g. +2.1%)
Bonds & CDs   = 210                            → return shown as annualized coupon rate (e.g. "4.2%/yr" — this is the holding's stated yield, NOT computed from the window's dollar earnings)
Sweep cash    = 220                            → shown as "2.5%/yr" (stated APY)
All categories total = 1,220 + 210 + 220 = 1,650
  (this total is category INCOME only — dividends+interest — so it will not equal the walk's full "Wealth generated" of 1,910, which also includes price/market change; do not force these two totals to match)

E*TRADE ACCOUNT PORTFOLIO (by category & holding)
Stocks & ETFs: LCTX $40,000 (965 sh @ $41.45), income $120 dividends
Bonds & CDs:   KeyBank CD 4.00% $5,704 (income $40 int) + US Treasury 4.25% $3,000 (income $20 int) = $8,704, income $60
Cash:          Sweep cash $4,000, income $40 interest
Alternatives:  $0 (empty — display "Nothing held," not a blank row)
Total = 40,000 + 8,704 + 4,000 + 0 = 52,704 ✓ · Income = 120+40+20+40 = 220 ✓ (matches header "Income: $220")

DAY-ONE STATE
Beginning market value (today) = Ending market value (today) = current holdings value (real, unchanged)
Contributions = Withdrawals = Wealth generated = Dividends = Interest = Change in investment value = 0
Return = "—" (never "0%" — 0% implies a measured return of zero; "—" means "not yet measurable")
Every period chip other than the active "since today" shows "—" until enough history exists to compute it.
```

**General rule for future windows:** whichever period chip is active, every downstream number (summary, chart, all walks, category table) recomputes for that window's start date — the structure never changes, only the dates and figures. A chip with no data for its window shows "—", never a fabricated number.

## State Management
- `activePeriod`: `'since' | '1m' | 'ytd' | '1y' | '3y'` — drives the window for summary/chart/walks/category table.
- Per-account `isOpen` boolean for each connected account's walk on the Summary screen; persists across sessions (remember what the user leaves open/closed).
- Per-category `isOpen` boolean for each of the 4 classes on the Account Portfolio screen.
- Data-quality flags per number (e.g. `needsPrice`, `missingDividends`) drive the warning banner count and copy; the banner must be omitted entirely when the flag list is empty, not shown with "0 numbers."
- All monetary values and percentages are derived from the account/holding data model — never hand-typed — so Day One, mid-history, and rich-history states are the same render logic fed different data.

## Design Tokens
Shared with the Net Worth screen — reuse the same palette so the app doesn't feel like two products:
- Ink: `oklch(24% 0.02 75)`; muted text: `oklch(48%/55% 0.02 75)`; hairlines: `oklch(90% 0.012 75)`; section-break band: `oklch(94% 0.012 75)`
- Brand green (primary, positive, active states): `oklch(38% 0.1 150)`; header band: `oklch(28% 0.09 150)`; light tint (category sub-bands): `oklch(93% 0.05 150)`
- Category colors (colorblind-safe, blue-green family + neutral — do not introduce a red hue for categories): Stocks & ETFs = brand green `oklch(38% 0.1 150)`; Bonds & CDs = dark green `oklch(24% 0.09 150)`; Cash/Sweep = light green `oklch(80% 0.05 150)`; Alternatives/uncategorized = neutral `oklch(65% 0.02 75)`
- Warning/incomplete-data accent (amber, only hue reserved for "needs attention" — never reused for a category): `oklch(42% 0.1 65)` text/icon, `oklch(96% 0.025 65)` banner fill, `oklch(75% 0.09 65)` banner border
- Typography: Public Sans 400/500/600/700; all monetary figures use tabular numerals; hero window figures ~19px/700, row text 13–13.5px, captions 11–11.5px.

## Files
- `Performance.dc.html` — design source, all three states.
- `ios-frame.jsx` — device-frame helper for prototype presentation only.
