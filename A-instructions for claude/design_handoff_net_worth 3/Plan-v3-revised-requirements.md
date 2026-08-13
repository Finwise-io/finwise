# Requirements note — Plan v3 (revised) — for Claude Code

Supersedes `Plan-v3-requirements.md`. Structure and states are unchanged from that note; this
captures the wiring added after founder-approved brief v3 (2026-08-13 revision) and the follow-up
copy fixes made directly against the build.

## What changed since the first v3 handoff

1. **The word "safe" is removed everywhere on this surface.** "Safe draw from savings" → **"Draw
   from savings"**; June's summary sentence → "Guaranteed $4,000 + draw from savings $4,155." This
   is a scoped legal fix (brief §7.1) — do not reintroduce "safe" anywhere money is discussed, on
   this screen or elsewhere in the app.

2. **The mortgage row is now a live, in-place control**, not a link to another screen:
   - A stepper for "Extra each month" ($0–$2,000, $100 increments).
   - As it moves: payoff date, years sooner, and interest saved all update.
   - **Both sides shown together, always**: the line explicitly states the extra payment is money
     not going into savings, and gives the odds change as a second, honestly re-run number ("Your
     odds go from 48% to 43%") — never a subtracted percentage (brief §6.1: odds are only ever an
     output of a full re-run, never an adjustment applied after the fact).
   - "Use as my plan" commits it — this is a draft-until-committed control, unlike the FACTS rows.

3. **"Can I spend more?" (June, retiree) is now a live, in-place control**, not a link to a general
   what-if screen:
   - States the estimated headroom up front: **"Estimated amount you can draw more every month:
     $2,555"** — this exact phrase is the founder's; do not shorten or soften it.
   - A stepper lets her actually draw some of that headroom ($0–$2,555), showing the new monthly
     total live.
   - **"held at odds of 80% [change]"** is shown wherever this number appears — the odds floor is
     one global setting used everywhere the app answers a how-much-can-I-spend question, never a
     per-screen assumption. The `[change]` link must open the same control regardless of which
     screen surfaced it.
   - "Use as my plan" commits it.

4. **The mortgage's automatic inclusion in spending is now stated as a caption, not a separate
   glance row.** It sits directly under "What will you spend each month in retirement?", one line,
   muted: *"Your $2,400/mo mortgage is included automatically until it's paid off in 2054."* This
   was originally drawn as its own row between "spending" and "target nest egg" (per brief §6.1's
   literal example layout) — in review that read as an eighth glance row breaking the seven-peer
   rule and created uneven spacing against neighboring rows. Demoting it to a caption keeps the
   glance at exactly seven rows while still surfacing the fact (brief §6.1's core requirement: don't
   bury a debt that outlives retirement inside one opaque number — say it out loud). Apply this
   pattern to any other debt that outlives the retirement date, not just a mortgage.
   - The row is **not editable inline** in this pass — no "change" affordance shown. If product
     wants the amount/end-date correctable from here (as brief §6.1 originally specified — "the
     person can correct either number"), add a quiet edit affordance on this caption in a follow-up;
     flagging rather than guessing at the interaction now.

## Numbers wired vs. illustrative

The mortgage stepper and spend-more stepper are driven by placeholder formulas in the prototype
(linear interpolation off the base example numbers in brief §3.3/§3.5) — they demonstrate the
INTERACTION shape and the copy pattern, not the real engine. Wire both to the actual two-run
simulation described in brief §6.1 before shipping:
- Mortgage: run the plan as-is, then run it again with the extra payment modeled as reduced
  contributions until the mortgage's new payoff date — report both odds numbers, never derive the
  second by subtraction.
- Spend-more: reuse the existing binary-search-style routine that already produces June's draw
  figure today (brief §3.5 — "no new engine for this") at whatever odds floor is currently set.

## Unchanged from the prior note (still applies)
- Heading hierarchy (L1 quiet caps / L2 filled band / L3 plain row), the collapsed-glance summary
  line, the §6 sourcing table for every other number, and the three open questions (extra-saving
  row, facts-vs-drafts resolution, suggested-target placement) all carry over verbatim from
  `Plan-v3-requirements.md` — see that file for the full detail behind this pass.

## Files
- `Plan.dc.html` — current build: Pat collapsed/expanded (with live mortgage control), June
  collapsed/expanded (with live spend-more control), age-missing, day-one, bad-odds.
- `Plan-v3-requirements.md` — the prior note (hierarchy, sourcing table, open questions) — read
  alongside this one, not instead of it.
- `ios-frame.jsx` — device-frame helper for prototype presentation only.
