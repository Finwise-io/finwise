# Handoff: Net Worth Screen (MoneyKeel)

## Overview
Redesign of the "Net Worth" screen for MoneyKeel, a personal financial-planning app. Shows the user's total net worth (assets minus debts), a retirement-plan summary, an asset breakdown (by category or by institution), debts, and an emergency-cushion health check. Direction implemented: **"Quiet Instrument"** — a flat, continuous ledger (hairline dividers, no floating cards) with tabular numbers and a colorblind-safe blue/green + amber palette.

## About the Design Files
The bundled file (`Net Worth.dc.html`) is a **design reference built in HTML** — a working prototype of look, layout, and interaction (tab switching, expand/collapse), not production code to copy verbatim. Recreate this UI in the target codebase's existing stack (React Native / SwiftUI / Compose / whatever the app already uses) using its established components, navigation, and state patterns. If no stack exists yet, React Native is a reasonable default for a cross-platform financial app.

## Fidelity
**High-fidelity.** Colors, type sizes, spacing, and copy below are final; match them precisely. Layout is an iPhone-width (390px) screen inside a status-bar-safe container — build to standard iOS/Android safe-area conventions rather than the literal 390px canvas.

## Screens / Views

### 1. Net Worth (primary screen — fully designed)
**Purpose:** at-a-glance net worth, retirement outlook, asset/debt breakdown, cushion health.

**Layout (top to bottom):**
- Header band (brand blue, full-bleed, sits under the status bar): MoneyKeel wordmark (small monogram chip + text), "Your Net Worth" + info glyph, date on the right, Own/Owe subtotal line, large net-worth figure, change line, "since" date line.
- Retirement summary row (white background, full-bleed, bottom hairline).
- Segmented tabs: "By category" / "By institution" (underline style, active = brand blue underline + dark text).
- "WHAT YOU OWN" header row (label left, total right).
- Shared composition bar: thin horizontal stacked bar (10px tall) + wrapping legend (swatch + label + %) — same bar is shown regardless of which tab is active, since the underlying totals don't change.
- Asset rows — **By category tab:** three expandable groups (CASH, INVESTMENTS, PERSONAL PROPERTY), each a row with color dot, label, total, and a rotating chevron; expanding reveals indented child rows (account name, amount, `›`).
- Asset rows — **By institution tab:** expandable groups per institution (Chase, Vanguard, Real estate), each showing only that institution's **asset** total (debts are never merged into an institution's asset row); expanding reveals child rows — just the account/holding name and amount (no redundant asset-class tag).
- Section divider (8px solid gap in the neutral tone) before debts.
- "WHAT YOU OWE" header row (amber total).
- Debt composition bar + legend (mirrors the assets bar, amber shades).
- Debt rows: Home mortgage, Chase Visa (flat rows, color dot + label + amount + `›`), each always visible (not tabbed).
- Emergency Cushion card: months figure, "Tight" status chip, thin progress bar, formula caption.
- Bottom tab bar: Home / Net worth (active) / Performance / Cash flow / Plan.

**Typography:** Public Sans (UI text, 11–15px, weight 400/600/700); numbers everywhere use `font-variant-numeric: tabular-nums` for column alignment. Large hero figure ~38px/600.

**Copy (exact):**
- "Your Net Worth" / info glyph / "Aug 4, 2026"
- "Own $813,152 − Owe $418,000"
- "$395,152"
- "▲ +$2,110 · +0.5% on cash + investments ›"
- "since Aug 3, 2026"
- "YOUR RETIREMENT PLAN" / "Likely — retire at 65 with ~$1,412,000, lasting past 92 with ~$890,000 to spare"
- "WHAT YOU OWN" / "$813,152"
- Legend: Real estate 55% · Stocks/ETFs 43% · Cash 1% · Bonds & CDs 1%
- Groups: CASH $8,838 (Chase Checking $8,000; Vanguard — sweep cash $838); INVESTMENTS $354,314 (Stocks & ETFs — Vanguard $348,495; Bonds & CDs — Vanguard T $5,819); PERSONAL PROPERTY · 1 item $450,000 (Primary residence $450,000)
- By institution: Chase $8,000 (Checking $8,000); Vanguard $355,152 (Sweep cash $838; Stocks & ETFs $348,495; Bonds & CDs (T) $5,819); Real estate $450,000 (Primary residence $450,000)
- "WHAT YOU OWE" / "−$418,000"; legend: Home mortgage 98.6% · Chase Visa 1.4%
- Debt rows: "Home mortgage −$412,000 ›"; "Chase Visa · pay first −$6,000 ›"
- "EMERGENCY CUSHION" / "2.0 months" / "Tight ⚠" / "$8,838 ÷ $4,500/mo · ⓘ"

### Screens referenced but not yet designed
The nav bar and several `›` rows point to screens outside this handoff's scope — build placeholders or request follow-up designs before shipping:
- **Home**, **Performance**, **Cash flow**, **Plan** tab screens
- **Account/holding detail** screen (one per tapped account row)
- **Debt detail** screen (mortgage, credit card)
- **Retirement plan detail** screen
- **Performance walk / "How $X became $Y"** screen (the change-% drill-in)
- Info popovers for the ⓘ glyphs (short tooltip/bottom-sheet, not full screens)

## Interactions & Behavior — Navigation Map
Every clickable element below and its destination. "In place" = no navigation, just local UI state.

| Element | Action |
|---|---|
| MoneyKeel wordmark | Navigate to **Home** |
| "ⓘ" next to "Your Net Worth" | Open info popover: explains Own/Owe/Net worth definitions |
| "▲ +$2,110 · +0.5% on cash + investments ›" | Navigate to **Performance → change walk** ("How $393,042 became $395,152") |
| Retirement summary row | Navigate to **Plan → Retirement detail** |
| "By category" / "By institution" tab | **In place** — switches the asset-list view; does not affect the composition bar |
| CASH / INVESTMENTS / PERSONAL PROPERTY group row | **In place** — toggles expand/collapse of that group's child rows |
| Institution group row (Chase / Vanguard / Real estate) | **In place** — toggles expand/collapse |
| Account child row (e.g. "Chase Checking ›") | Navigate to **Account detail** for that specific account (same destination whether reached via category or institution tab) |
| "Home mortgage ›" / "Chase Visa ›" | Navigate to **Debt detail** for that liability |
| Emergency Cushion "ⓘ" | Open info popover: explains the months-of-cushion formula |
| Bottom nav — Home | Navigate to **Home** |
| Bottom nav — Net worth | **In place** (current screen) |
| Bottom nav — Performance | Navigate to **Performance** |
| Bottom nav — Cash flow | Navigate to **Cash flow** |
| Bottom nav — Plan | Navigate to **Plan** |

Expand/collapse and tab switching are independent — a group's open/closed state is not reset when switching tabs (both tabs share one clean state model; only the grouping differs, not the underlying open/closed flags need to be tracked per grouping-mode if the same account can appear open in one tab and collapsed in the other — treat them as separate toggle states, as implemented in the prototype).

## Calculations
All figures reconcile as follows (source: Aug 4, 2026 snapshot):

```
Cash            = Chase Checking + Vanguard sweep cash        = 8,000 + 838       = 8,838
Investments     = Stocks & ETFs (Vanguard) + Bonds & CDs (T)  = 348,495 + 5,819   = 354,314
Personal property = Primary residence                          = 450,000

WHAT YOU OWN (Own) = Cash + Investments + Personal property   = 8,838 + 354,314 + 450,000 = 813,152

Home mortgage = 412,000
Chase Visa    = 6,000
WHAT YOU OWE (Owe) = Home mortgage + Chase Visa                = 418,000

NET WORTH = Own − Owe = 813,152 − 418,000 = 395,152
```

**Change line:** `Δ = currentNet − priorNet`; the **% is computed only against the cash+investments denominator** (never against real estate/property, which has no live market feed), and the UI must label that denominator explicitly ("on cash + investments") rather than implying it's the full net-worth % change:
```
Δ$ = 2,110
denominator = priorCash+Investments (i.e. cash + investments the day before)
Δ% = Δ$ / denominator → +0.5%
```

**Category donut / stacked bar %:** each category ÷ Own, rounded to whole percent:
```
Real estate %  = PersonalProperty / Own = 450,000 / 813,152 ≈ 55%
Stocks/ETFs %  = Investments / Own      = 354,314 / 813,152 ≈ 43%  (the "Stocks/ETFs" legend label maps to the Investments group total)
Cash %, Bonds & CDs % = remaining ~1% each (split within Cash/Investments — Cash and Bonds&CDs are small enough that rounding can make them show as 1% even though they're subsets of the Cash/Investments groups; if exact precision matters, compute each sub-line individually against Own rather than against its parent group)
```
Percentages must always sum to 100% after rounding — adjust the largest bucket by any rounding remainder rather than letting the bar overflow/underflow.

**Debt composition bar %:** each debt ÷ Owe:
```
Home mortgage % = 412,000 / 418,000 ≈ 98.6%
Chase Visa %     = 6,000 / 418,000   ≈ 1.4%
```

**Emergency cushion (months):**
```
months = Cash / monthlySpend = 8,838 / 4,500 ≈ 2.0
```
Status label thresholds (used for the "Tight" chip + progress-bar color): e.g. `<3 months = Tight (amber)`, `3–6 = Adequate`, `>6 = Strong` — confirm exact thresholds/copy with product before shipping; only "Tight" was specified in source material.

**Institution totals (By institution tab):** sum only the **asset** accounts held at that institution — never merge in liabilities held at the same institution (e.g. Chase's tile shows only its $8,000 checking balance; the Chase Visa **debt** always lives in the WHAT YOU OWE section, never inside an institution's asset row):
```
Chase total    = Chase Checking                         = 8,000
Vanguard total = sweep cash + Stocks & ETFs + Bonds&CDs  = 838 + 348,495 + 5,819 = 355,152
Real estate total = Primary residence                    = 450,000
```

## State Management
- `activeTab`: `'category' | 'institution'` — controls which grouping renders under WHAT YOU OWN; does not affect WHAT YOU OWE or the composition bar.
- Per-group `isOpen` booleans, one per expandable row, independent per grouping mode (e.g. `cashOpen`, `investmentsOpen`, `personalPropertyOpen` for category mode; `chaseOpen`, `vanguardOpen`, `realEstateOpen` for institution mode).
- All monetary figures and percentages should be derived (computed), not hand-typed — see Calculations above — so the screen stays correct as account balances change.
- Data-freshness / missing-data banner (referenced in source material, not built here): if any account price/balance is stale or missing, show a dismissible-by-resolution banner under the hero; out of scope for this handoff but flagged for backend/data-layer planning.

## Design Tokens
**Colors (OKLCH — colorblind-safe: blue-green family for assets/positive, distinct amber for debts/warnings, so no reliance on red vs. green hue alone):**
- Ink (primary text): `oklch(24% 0.02 75)`
- Ink soft / muted text: `oklch(48% 0.02 75)` / `oklch(55% 0.02 75)`
- Hairline dividers: `oklch(90% 0.012 75)`
- Section-break band: `oklch(94% 0.012 75)`
- Brand / positive accent (hero band, active tab, "Stocks/ETFs" & "Investments"): `oklch(38% 0.1 150)`, hero band background `oklch(28% 0.09 150)`
- Brand accent, light tint (Cash): `oklch(80% 0.05 150)`
- Brand accent, dark tint (Bonds & CDs): `oklch(24% 0.09 150)`
- Neutral (Real estate / Personal property — deliberately desaturated, not a third hue): `oklch(65% 0.02 75)`
- Debt / warning accent (amber, distinct hue from the brand green): `oklch(42% 0.1 65)` (primary), `oklch(70% 0.06 65)` (light tint), `oklch(45% 0.13 65)` (cushion "Tight" chip)

**Typography:** Public Sans, weights 400/600/700. Sizes: 38px (hero number), 15px (section totals), 13–13.5px (row labels/amounts), 11–11.5px (captions/legend/labels).

**Spacing:** 18px horizontal screen padding; 12–14px vertical row padding; 36px child-row indent under category groups, 18px under institution groups (institution groups nest one level less since the institution name itself is the "account owner").

**Radii/borders:** hairline 1px dividers only — this direction is deliberately flat (no card radii/shadows), unlike the alternate "Warm Ledger" direction (also explored, not part of this handoff).

## Assets
No image assets — the composition bars, legend swatches, and status dots are all solid-color CSS shapes. The MoneyKeel wordmark is currently a text lockup + single-letter monogram chip (placeholder); swap in the real logo lockup when available.

## Files
- `Net Worth.dc.html` — the design source (option "1b — Quiet Instrument") containing the full markup, inline styles, and interaction logic for this screen.
- `ios-frame.jsx` — device-frame helper used only for prototype presentation; not part of the design spec.
