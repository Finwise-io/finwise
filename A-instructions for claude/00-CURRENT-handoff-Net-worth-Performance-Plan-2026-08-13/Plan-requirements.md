# Handoff: Plan Surface Redesign v2 (MoneyKeel)

## Overview
Redesign of the Plan tab per the founder-approved v2 architecture brief. Two fixed sections replace the prior scattered screens: **Section 1 — Your retirement plan** (the answer, and everything that determines it, merged into one screen) and **Section 2 — Decisions you can make today** (real-world choices only). The What-if sandbox, the Plan-answers screen, the read-only drivers screen, and the big-costs list are all absorbed into Section 1; What-if disappears as a separate destination.

## About the Design File
`Plan.dc.html` is a **design reference**, not production code. Rebuild in the target codebase's existing stack/navigation/state patterns.

## Fidelity
High-fidelity. Copy, structure, and the two-gauge hero pattern are final. Dollar figures are illustrative per the brief's Pat/June numbers — wire to the real engine outputs.

## The one-wording decision (brief §11.1)
Adopted **Likely / Uncertain / Unlikely** as the single word-set, for both workers and retirees. The alternate set ("Holding / Watch closely / Running short") is retired — June at 100% now reads "Likely," not "Holding." Use this word verbatim, everywhere: `<word> — xx% odds of lasting to age abc`.

## Screens

### 1. The Plan tab (hub) — both sections in one scroll
**Section 1 band ("YOUR RETIREMENT PLAN"):** a dark-green square-cornered banner "WILL MY MONEY LAST?" (worker) or "IS MY MONEY LASTING?" (retiree), then the **two-gauge hero** (see below), then a link to the full merged screen ("Your plan, in full — age, spending, accounts, big costs ›").
**Retiree variant:** replaces the odds-vs-target framing with the paycheck breakdown (Social Security + pension = guaranteed income; safe draw from savings; total paycheck), since a retiree's real question is "is my paycheck covering my spending," not "will I reach a target." Odds still shown, worded identically to the worker's.
**Section 2 band ("DECISIONS YOU CAN MAKE TODAY"):** a flat list of rows, each showing what it's worth in dollars or points, never just a topic name — e.g. "Claim Social Security at 70, not 67 · +$624/mo," "Pay off the mortgage early · +3 pts."

### 2. The two-gauge hero (used on the Plan tab and Section 1 header)
Two side-by-side semicircle gauges replace the single-number odds callout:
- **Left gauge — Odds:** the % chance of lasting to the target age, needle-and-arc style, three color zones (bad/amber, mid/neutral, good/green — colorblind-safe, never relying on hue alone; needle position + numeral both carry the value).
- **Right gauge — Assets vs. target:** current retirement assets as a % of the computed target nest egg (single-tone fill vs. neutral remainder + needle).
Below both: **"$909,152 of $1.9M target"** (the two absolute dollar figures the percentages are drawn from), then the bridge sentence:
> **Add $38,000 to your retirement assets every year for 7 years to reach your target and raise your odds to 80%.**
This sentence is the single most actionable line on the screen — it is a derived output (see Calculations), never a separately-typed figure. On the retiree paycheck variant, this sentence and the target gauge are replaced by the guaranteed-income/safe-draw breakdown since there is no "reach a target" framing once already drawing down.

### 3. Section 1 — the merged screen (5 states)
One scrolling screen with a **pinned outcome strip** at the top (position:sticky in the design; on native, a header that stays visible while the person edits inputs below — this satisfies brief §3.6). Below it, two clearly-separated blocks:
- **FACTS — save as you go** (a small "FACT" tag on each row): age, monthly spending in retirement, the account list with ✓/— and running total, big one-time costs with add/edit. Editing any fact commits immediately — no draft state, no "Use as my plan" gate.
- **CHOICES — try them, nothing changes yet** (a small "DRAFT" tag on each row): retire-at stepper, plan-to-age stepper, extra-saving-per-month stepper. Two buttons at the bottom: **"Save this scenario"** (keeps the draft for later, does not apply it) and **"Use as my plan"** (commits — this is the only action that changes the live plan).

**State 1 — everything answered:** all facts filled, choices at their current committed values, outcome strip showing the live odds/target.
**State 2 — one answer missing (age):** the missing fact is highlighted (amber tag "MISSING," an inline "Add ›" affordance in place of a value), every choice control is disabled/dimmed, and the outcome strip is replaced by a dashed placeholder: "Your odds — can't compute yet. Add your age above." Reached identically — same screen, same missing-field focus — whether the person came from Home, Net worth, or Plan (brief §3.7, a founder ruling).
**State 3 — nothing answered:** a labelled, clearly-bordered **sample** ("SAMPLE — NOT YOUR NUMBERS") using a typical person's numbers, with an "Add your age ›" CTA above it; all facts/choices rows below are dimmed and inert.
**State 4 — mid-change (interactive in the prototype):** the outcome strip shows both gauges live-updating as the retire-age and extra-saving steppers move, with facts dimmed to signal "already saved, not part of what you're trying." Both commit buttons are present and enabled.
**State 5 — the impossible-required-saving state (brief §3.5):** says the honest number plainly once ("~$95,000 a year — more than you earn"), then immediately pivots to "THREE REAL OPTIONS," each a lever with its point gain (retire 2 years later +14, spend $400/mo less +9, claim Social Security at 70 +6) and a "Try all three together" link into the sandbox. Never a softened number, never just a verdict with no path forward.

### 4. The outcome block alone, three levels (strong 85% / middling 60% / bad 12%)
Compact standalone cards showing the same two-gauge-derived pattern at each odds level, to pressure-test the design holds up across the range without redesigning per-level. The bad-odds card explicitly states the required-saving number is "never shown as the ask" — it exists to justify why the card pivots to levers instead of a target gap.

## Interactions & Navigation Map

| Element | Action |
|---|---|
| MoneyKeel logo | Navigate to **Home** |
| "WILL MY MONEY LAST? / IS MY MONEY LASTING?" banner | **In place** — no tap target, section label |
| Two-gauge hero | **In place** — visual only, no tap target itself |
| "Other options to increase odds ›" | Navigate to **Section 1, Decisions view** or scroll to Section 2 rows worth the most points |
| "Your plan, in full — age, spending, accounts, big costs ›" | Navigate to **Section 1, the merged screen** |
| Section 2 row (Claim Social Security, Send a child to college, Pay off mortgage, Convert to a Roth, Stress test) | Navigate to that decision's own screen (Social Security timing / Can-I-afford-it / Roth / Stress test) |
| Section 1: fact row (age, spending) | Navigate to **inline edit** for that fact; saves immediately on confirm, no draft step |
| Section 1: account row (✓) | Navigate to **account detail**; the "doesn't count" toggle for the home is editable there — the person's choice always overrides the default |
| Section 1: "+ Add a big cost" | Open **add-cost** sheet (amount, year); becomes part of Facts once saved |
| Section 1: retire-at / plan-to-age / extra-saving stepper | **In place** — updates the draft and the live outcome strip; does not touch the committed plan |
| "Save this scenario" | **In place** — stores the draft scenario for later without applying it |
| "Use as my plan" | **In place** — commits the draft choices as the new plan; outcome strip's "IF YOU USE THIS" framing disappears once committed |
| Missing-fact "Add ›" | Navigate to that fact's edit screen; returns to Section 1 focused on the same field |
| Bad-odds "Try all three together — one sandbox ›" | Navigate to **Section 1 choices**, preloaded with all three levers as drafts |
| Bottom nav (Home / Net worth / Performance / Cash flow / Plan) | Navigate to respective tab; Plan is current/active |

## Calculations
Source figures for Pat (58, working) per brief §6:
```
Counts toward retirement = Vanguard brokerage 355,152 + Fidelity Traditional IRA 420,000
  + Vanguard Roth IRA 96,000 + Ally savings 38,000 = 909,152  (home 620,000 excluded — lived-in)
Blended growth = 7.7%/yr (weighted by asset class: shares 10.4%, 60/40 mix 7.9%, bonds/CDs 4.2%,
  cash 2.4%, home 4.5% — home's growth still applies even though home doesn't count toward the total)
Odds = 60% = (count of the 400 simulated futures where money lasted to age 90) / 400
Range 31–87% = confidence band on the 60% ESTIMATE ITSELF (modeling uncertainty), not a spread of
  dollar outcomes — do not word this as "your odds could be as low as 31%"; word it as the test
  producing a range around the estimate (see the exact caption used in the dial screen for wording)
Dollar figure shown ($1,483,000 at 65) = the MIDDLE of the 400 runs' values at that age — a
  different aggregation from the odds (a count), which is why "Uncertain" and "money to spare" can
  coexist truthfully on one screen (brief §8)
Target (the right-hand gauge's 100% mark) = the nest egg that gives 80% odds, i.e. the SAME engine
  solved backwards for the value where count/400 = 320 — for Pat ≈ $1.9M. Never type this number;
  it must be produced by the same simulation the odds come from, or it can contradict the odds
  (someone can be 80% of the way to an arbitrary "target" figure and have 45% odds)
Assets-vs-target % = 909,152 / 1,900,000 ≈ 48%  (current assets ÷ derived target)
Required additional saving = solve for the extra annual contribution that moves the 60%-odds
  scenario to the 80%-odds target, run through the same 400-simulation engine — for Pat ≈ $38,000/yr
  ($3,150/mo); years-to-close-gap = target retire age − current age (Pat: 65 − 58 = 7 years)
Tax-advantaged room = the unused annual contribution room the app already knows from linked account
  types (401k/IRA limits) — for Pat, $32,500/yr of the $38,000 required fits there; the remainder
  ($5,500/yr) would go to a taxable brokerage
```
For June (72, retired) — paycheck framing, no target gauge:
```
Guaranteed income = Social Security 2,600 + Pension 1,400 = 4,000/mo
Safe draw from savings = 4,155/mo (the engine's sustainable draw rate against her balance and odds)
Paycheck = Guaranteed income + Safe draw = 4,000 + 4,155 = 8,155/mo
Slack = Safe draw − actual spending draw = 4,155 − (5,600 spend − 4,000 guaranteed) = 4,155 − 1,600
  = 2,555/mo unused of the safe draw (screen shows "using $1,600 of the $4,155 safe draw")
Odds = 100% (all 400 runs lasted to 94), median leftover ≈ $2,810,000
```
Bad-odds state (12%, illustrative, not tied to Pat/June):
```
Required saving to reach 80% odds ≈ $95,000/yr — exceeds plausible income, so it is never presented
  as "the ask." Instead show the three highest-point-value real levers, each independently computed
  by re-running the 400 simulations with that single change applied:
  retire 2 years later → +14 pts · spend $400/mo less → +9 pts · claim Social Security at 70 → +6 pts
```

## State Management
- `factsCommitted`: object of saved fact values (age, spending, accounts ✓/—, big costs) — writes immediately on edit, no draft layer.
- `draftChoices`: object of in-progress choice values (retireAge, planToAge, extraSaveMonthly) — starts equal to the committed plan; diverges as the person moves steppers; discarded on navigating away unless "Save this scenario" is tapped; only "Use as my plan" writes it into the committed plan.
- `liveOutcome`: derived, not stored — recomputed from `factsCommitted` + `draftChoices` on every change, feeding both gauges and the bridge sentence. Must always reflect the DRAFT state while any choice differs from committed, with visible "IF YOU USE THIS" framing; reverts to plain framing once committed or once drafts are reset to match committed values.
- Per-account "counts/doesn't count" override, keyed by account id, defaulting to "everything except home + car" but always overridable — persists as a fact, not a draft.
- Missing-field state: a single `missingFields` list drives the amber "MISSING" treatment and disables all choice controls until resolved; Home, Net worth, and Plan must all route to this same screen/state when any required field is missing.

## Design Tokens
Shared with Net Worth and Performance — same palette across the app:
- Ink: `oklch(24% 0.02 75)`; muted text: `oklch(48%/52%/55% 0.02 75)`; hairlines: `oklch(90% 0.012 75)`; section-break band: `oklch(94% 0.012 75)`
- Section banners: solid dark green `oklch(28% 0.09 150)`, white text, **square corners only** — this is now a pinned rule per the approved language, never round these.
- Brand green (positive, gauges' good zone, active fills): `oklch(46% 0.1 150)` / `oklch(38% 0.1 150)`
- Gauge neutral zone: `oklch(82%–88% 0.012–0.02 75)`
- Warning/bad zone (odds gauge's low end, "Unlikely" state, missing-fact tag): `oklch(58–60% 0.11–0.12 65)` fill, `oklch(38% 0.12 65)` text, `oklch(96% 0.025 65)` tint background
- FACT tag: neutral chip `oklch(93% 0.012 75)` bg / `oklch(55% 0.02 75)` text. DRAFT tag: green-tinted chip `oklch(90% 0.05 150)` bg / `oklch(30% 0.1 150)` text — this color distinction is the primary way a person tells facts from choices at a glance.
- Typography: Public Sans 400/500/600/700/800. **Rule: money is one size (15pt) per column, tabular figures, totals bold — never mix sizes in a money column.** **Rule: nothing below 10.5pt.** Titles are first-person questions ("Will my money last?"), never institutional labels ("Retirement readiness").
- **One shared right edge:** every number on a screen — row values and section totals alike — must end on the same vertical line. Treat this as a hard constraint, not a suggestion (the brief notes it broke once and is now pinned by a test).

## Accessibility
- All tap targets ≥44pt (steppers, row links, chip buttons already sized to this).
- Colorblind-safe throughout: gauges and status tags carry meaning through position/numeral/pattern, not hue alone.
- Must degrade correctly under a hide-balances mode: every dollar figure (including gauge percentages, which are derived from dollars) needs a masked presentation; the odds percentage itself is not a dollar figure and stays visible even with balances hidden — confirm this split with product before build.

## What changed from the prior handoff (Net Worth / Performance still apply as shipped)
This supersedes the earlier `Plan.dc.html` structure (a flat "next step" list); the tab now firmly separates the merged Section 1 from the worth-labelled Section 2 rows, and the odds hero is now two gauges instead of one dial. Net Worth and Performance handoffs are unaffected.

## Open items still flagged in the brief, not designed here (§7)
Deliberately out of scope for this pass — flag before building further: the Retirement screen's duplicate return-vs-benchmark table (problem 1), whether one design or two variants best serves both worker and retiree long-term (problem 2 — this pass ships one design with a paycheck variant, which may or may not fully resolve it), "Sharpen your plan" as a worth-labelled list rather than a chore list (problem 3), the plan-over-time picture/fan-chart (problem 4, deferred), empty states for Multi-goal (problem 5), the two conflicting "first year" required-withdrawal numbers (problem 6), and the Social Security screen's dead-end six-line state for already-claiming retirees (problem 7).

## Files
- `Plan.dc.html` — design source: the Plan tab (both people), Section 1 in five states, the outcome block at three levels.
- `ios-frame.jsx` — device-frame helper for prototype presentation only.
