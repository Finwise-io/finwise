# Requirements note — Plan v3-revised (for Claude Code)

Addresses every blocking (B1–B6) and not-true (N1–N4) item in `HANDOFF-REVIEW-v3-2026-08-13.md`,
plus the five founder rulings and Ray persona from `PLAN-REDESIGN-BRIEF-v3-2026-08-12-6c3cb2f0.md`.

## B1 — gauge needles, fixed with a formula, not coordinates
Every dial now derives its needle endpoint from one function (see `needle(pct)` in the logic
class):
```
v = pct/100 (clamped 0–1)
theta = 180 * (1 - v) degrees   // 180° = left (0%), 0° = right (100%), sweeping over the top
x = cx + r * cos(theta), y = cy - r * sin(theta)   // cx=cy=110, r=78
```
Static dials (Pat, June, bad-odds, day-one, the two state-6 cards) have this formula's output
pre-computed and hand-checked against the printed percentage — every needle now points exactly at
its numeral. Ray's dial is **live**: his three Social Security chips (62/67/70) call `needle()` at
render time, so his is the reference implementation — copy that pattern for any future dial the
person can move, rather than hand-placing coordinates again.

## B2 — dated row leads
June's decisions list now opens with **"Required withdrawal, due Dec 31 · ~$15,849"** as a plain L3
row (not an L2 band at the bottom), per §3.3's ordering rule: anything with a real deadline goes
first because it expires. "Can I spend more? → Which account first? → Is converting to a Roth worth
it?" follow in the fixed retiree-lens order from §3.3's table.

## B3 — one Roth name everywhere
Every occurrence (Pat ×2, June ×2, Ray) now reads **"Is converting to a Roth worth it?"** — the
agreed name from brief §3.3.

## B4 — 44×44px steppers
All stepper buttons (mortgage extra-payment, June's spend-more) use a shared `.pl-stepbtn` class at
44×44px. Glyph size bumped to 20px to stay legible in the larger circle.

## B5 — type scale rounded to 11/13/15/17/20/24/30/38
Every in-app text size that was previously 12, 12.5, 13.5, 10.5, or 16px is now rounded to the
nearest step (13, 13, 13, 11, and 17/20 respectively — button glyphs went to 20 since they sit in a
44px target). Canvas annotation text (the muted meta-commentary above each phone frame, outside the
`.pl-body`) intentionally stays off this scale — it's presentation chrome for this handoff document,
not shipped UI.

## B6 — L1 label contrast
`.pl-l1`, `.pl-lbl-on`, `.pl-dot-on`, and the default link color all moved from `#178F6B` (3.78:1 on
`#F6F7F5`) to **`#085041`** (8.74:1), matching the theme file's own note that the deep green is the
accessible one. Every other use of `#178F6B` — button fills with white text, decorative arc strokes —
was left alone since those aren't the small-text-on-light-background case B6 flagged.

## N1 — no page-level disclaimer; notes sit under the number
Removed the "Estimates from ~400 market simulations… not advice" footer everywhere, per §7.2.
Replaced with source-specific captions:
- Under both dials on Pat's, June's, and Ray's screens: *"The odds come from about 400 runs of your
  own numbers through different markets."*
- Under June's paycheck breakdown: *"Your Social Security and pension as you gave them. The draw is
  what those same runs say you could take without running short — you actually draw $1,600 of it
  (1.95%), spending $5,600/mo."* — states plainly that guaranteed income is reported, not simulated.
- "Have you taken it yet? Confirm ›" now stands alone on the RMD row — never sharing a line with a
  disclaimer sentence again.

## N2 — June's numbers corrected and now reconcile
Replaced Pat's borrowed $909,152 with June's own $985,000 (Fidelity Traditional IRA $420,000 +
Schwab brokerage $448,000 + Ally savings $117,000). This is the balance that actually produces her
$4,155 maximum draw at the 80% floor and her $15,849 RMD (both already correct, both now traceable to
her own accounts instead of Pat's). Her real draw is $1,600/mo (1.95%) against the $4,155 capacity —
both figures are now stated together wherever her paycheck appears, so "100% odds" and "$4,155
capacity" don't read as contradicting her much smaller actual spend.

## N3 — mortgage caption, flagged as pending engine work
The caption now reads: *"Your $2,400/mo mortgage is included until it's paid off in 2054, from your
loan — change if that's wrong,"* with an edit affordance, matching brief §6.1's target design exactly.
**This sentence is not true yet.** The retirement simulation has no concept of debt today (§6.1: not
one mention, in either the simulation or its inputs) — it will charge $2,400/mo forever, past 2054,
until three pieces of engine work land: the extra payment persists as part of the plan (today it's an
unsaved Cash-flow textbox), contributions become a year-by-year schedule instead of one flat number,
and the simulation stops charging a payment once it ends. **Do not ship this row's copy until that
work is done** — until then the honest interim copy is closer to "charged as an ongoing $2,400/mo
expense (does not yet reflect its 2054 end date)."

## N4 — the mortgage odds delta is still a placeholder subtraction
`mortgageOdds = 48 − round((extraPay/500) × 5)` in the logic class is flagged in an inline code
comment. Brief §6.1 is explicit: **the odds are only ever the output of a second full 400-run
simulation**, never an adjustment applied to the first. Before build: run the plan as committed, then
run it again with the extra payment modeled as reduced contributions until the new payoff date, and
print both real results.

## The five founder rulings, as built
1. **Dials stay, shrunk, when the glance opens.** Pat's and June's expanded frames now show both
   dials at ~78px (down from 150px) beside the toggle, instead of vanishing into a one-line summary —
   watching the odds move as inputs change is the reason the inputs live on this tab at all.
2. **"Try all three together" is gone** from the bad-odds screen. It pointed at a sandbox that no
   longer exists as a separate destination — the steppers already on this tab are the sandbox now.
   Each lever is tappable on its own; nothing pretends to combine them yet.
3. **Ray, 64, added** — the only persona who can trigger the Social Security decision (60–70 window;
   Pat is 58, June is 72 and already claiming). His screen also carries the sharpest illustration of
   why the two dials are independent: 67% of his own target, 73–80% odds, both true at once.
4. **Age-missing no longer hides decisions.** Mortgage and Roth rows don't need an age (a mortgage
   and pre-tax money are enough), so they stay live, with odds simply omitted from their explanatory
   text. Only rows that generically need an age — "When can I retire?" — show a locked 🔒 state that
   explains itself, rather than an empty section.
5. **Hide-balances is a rule, not drawn here.** Per §7: odds stay visible (not a dollar figure); on
   the target dial the numeral would dot out while the arc still fills. No frame in this file
   demonstrates the hidden-balance mode — it needs its own toggle state, which is a reasonable follow
   up if a screenshot of it specifically is wanted.

## Heading hierarchy (unchanged from the prior note, confirmed still correct)
L1 = quiet caps label, no fill (`#085041` text, 11px/700/.08em) — section titles only.
L2 = filled dark-green band (`#085041` bg, white text) — reserved for a subgroup carrying its own
running total on the band (June's retirement-paycheck total is the only L2 band left in this file;
the RMD row moved from an L2 band to a plain L3 row per B2, since a dated row belongs in the list's
normal flow, not set apart).
L3 = plain row — everything else, including the two sub-account levels (indent + tint, not a new
heading level).

## Still open — flagged, not resolved here (brief §10, unchanged)
1. "Extra saving each month" isn't one of the founder's seven glance rows and isn't drawn as an
   eighth. It has no home in this pass — the founder should rule whether it belongs as a decision-list
   row (once the engine can price "save $X more → +N points" the way it already prices the three
   bad-odds levers) or is simply gone.
2. All seven glance rows save immediately in this build — no draft/commit split remains on them. The
   two live controls (mortgage stepper, spend-more stepper) keep their own draft-until-"Use as my
   plan" behavior, since those are choices, not facts.
3. Suggested target placement (offering the 80%-odds figure when the target field is blank) is not
   drawn in any state here — every persona in this file already has a target on file or predates
   target entry entirely (day-one). Recommend inline under row 5 with a dashed "yours, not ours"
   treatment, as previously proposed.

## Files
- `Plan.dc.html` — all states: Pat collapsed/expanded, June collapsed/expanded, Ray, age-missing,
  day-one, bad-odds, and the two state-6 cards (past target / on-target-poor-odds).
- `ios-frame.jsx` — device-frame helper for prototype presentation only.
- Earlier notes (`Plan-v3-requirements.md`, `Plan-v3-revised-requirements.md`) are superseded by this
  one — read this file alone going forward.
