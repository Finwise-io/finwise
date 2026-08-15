# Requirements note — Plan v4 (synced to brief v3-2026-08-14 + the 2026-08-13 review)

Supersedes all earlier Plan requirements notes. Read this one alone.

## B1 fixed structurally, not per-instance
Every needle and every fill-arc endpoint is now computed by one formula in the logic class
(`arcPt(pct, r)`), never a hand-placed coordinate: angle = 180°·(1−pct/100) swept over the top of the
semicircle, point = (110+r·cosθ, 110−r·sinθ). Needles use r=78, fill arcs use r=90. Odds-style dials
keep a fixed 3-color background (amber 0–40%, gray 40–80%, green 80–100% — decorative rating zones,
same on every frame) with only the needle computed; target/asset-style dials compute both the green
fill and the needle. This removes the whole defect class rather than re-checking six more numbers by
hand.

## Numbers corrected per §4
**Pat's holdings changed** (his mix now blends to 5.85%/yr, not the unstated 5.5% that produced the
old 48%): Fidelity Traditional IRA $380,000, Ally Savings $379,152, Vanguard Brokerage $90,000,
Vanguard Roth IRA $60,000 = $909,152 (same total, real composition). His odds are now **67%**, range
20–98%. His hero sentence now names the projection ("projects to about $2,008,000", never "reaches"),
states growth does almost half the work ($542,500 saved + $426,859 growth-on-existing + $129,685
growth-on-new = $1,098,044 closing the $1,090,848 gap), and the ⓘ carries the full arithmetic so a
person who subtracts $77,500×7 and gets confused finds the answer one tap away.

**June is unchanged from the prior pass** ($985,000, $8,155 paycheck, 100% odds, 1.95% actual draw) —
already reconciling, already pinned. Only her spend-more control changed (see below).

**Ray is unchanged in his numbers** (target $750,000, current $500,000, 73%/80% at 67/70) — only his
copy changed, from the rejected harsh framing to the founder-approved position-and-door pattern.

## Mortgage decision moved off Retire (§3.3.1)
Pat's Retire tab now shows exactly one decision row — "Is converting to a Roth worth it?" — plus a
quiet pointer: *"Paying your mortgage down changes this — see Debt ›"*. Chose to draw the pointer
(the brief left this as the designer's call): someone reading their odds on Retire has no other way
to learn the biggest lever lives on another tab. The mortgage control itself now lives on two new
frames under "Cash Flow · Debt," carrying the rate-comparison text in both directions (Pat's loan
above the Treasury yield, and a required second state — a cheap 2021 loan below it) plus the
retirement consequence in count form ("your money lasts in about 67 futures out of 100 today, and
about X out of 100 if you do this"). The mortgage odds-delta is still the flagged placeholder
subtraction (`67 − round(extra/500)×2`) — §6.1 requires a second full simulation before this ships.

## Spend-more rebuilt in plain English (§3.5, resolves B7)
Replaced entirely: leads with the free-room fact ("Yes — about $1,000 a month more, and nothing
changes"), states the $0 position as "the same as now" rather than an unlabelled total, and reports
consequence as a count via a threshold table (0–1000 free, 1500→"almost every future," 2000→"9 in
10," 2555→"4 in 5, and names the losing case"). The banned words (draw · odds · held at · floor) are
gone from this row; "Draw from savings" stays as the paycheck table's label, a different context.

## Count language applied generally (§3.5.1)
Every consequence line that used to read as a bare percentage now reads as a count: the mortgage
row, Ray's claim-age line, both bad-odds/state-6 cards. "Pre-tax" replaced with "you haven't paid tax
on yet" everywhere the Roth row appears (Pat, June, Ray).

## Day one and age-missing (§5 states 3–4)
Day one now shows all seven glance rows always — three "Add ›"/"Link ›", four tagged with a quiet
"ours" chip for the app's own assumption (retire 65, plan to 90 shown; target and one-time-costs show
"—"/"None" since those have no safe default to assume). The button reads "Add your age ›", matching
the age-missing frame instead of the vaguer "Answer the first question ›". Age-missing's decisions
list now holds only what doesn't need an age (Roth) plus the locked "When can I retire? 🔒" — the
mortgage row is gone from here too, since it moved off the tab entirely.

## State 6 pair corrected (§5 state 6)
Fixed the confused 45% (that was Pat's *other* dial, assets-vs-target — the odds never move when the
target changes, §6.1). Past-target card now correctly shows Pat's real 67% odds. The mirror card
uses a $1,500,000 target, $17,500/yr saving, 74% odds — all engine-verified per the brief. Neither
card carries a warning tint; nothing has gone wrong in either state. The past-target dial caps its
arc visually at 100% while the numeral still reads the real 114% — flagging that choice per the
brief's open question (capping vs. overfilling); overfilling would need a different visual language
this pass didn't design.

## Goals and Prepare (§3.0.1)
Added as two frames each (populated + empty), gathered from existing screens per the brief's
explicit instruction not to invent new information architecture. Deliberately lopsided against
Retire — three to six honest rows, no padding. Sub-tab bar (Retire/Goals/Prepare) now drawn on every
Retire frame too, selected on the first tab, per the brief's explicit instruction.

## Answering the brief's own questions back
- Neither landing view got its own heading beyond the sub-tab bar — the bar names them well enough,
  and Retire is the only one carrying a hero.
- Capped, not overfilled, on the past-target dial (see above) — flagging this as the open half of
  that decision.
- The mortgage control's pointer-vs-silence question: chose the pointer (see above).

## Still open, unchanged from prior passes
Extra-saving-per-month as an eighth glance row, facts-vs-drafts (this build still saves all seven
facts immediately, consistent with the brief's lean), and suggested-target placement remain
unresolved — flagged for the founder, not guessed at here.

## Files
- `Plan.dc.html` — every state in this note.
- `ios-frame.jsx` — device-frame helper, presentation only.
