# Requirements note — Plan v3 (for Claude Code)

## Heading hierarchy chosen
- **L1** — quiet caps label, no fill, brand-green text (`#178F6B`), 11px/700/.08em. Used for section titles: "DECISIONS YOU CAN MAKE TODAY," "REAL OPTIONS, EACH ONE RE-RUN."
- **L2** — filled dark-green band (`#085041`, white text), used only for a subgroup that carries its own running total riding the band's right edge (e.g. "REQUIRED WITHDRAWAL, 2027 · ~$15,849"). Reserve L2 for the rare case a subtotal needs to appear ON the band — never stack multiple L2 bands as the v2 build did.
- **L3** — a plain row, no label styling at all — this is every glance row, every decision row, every sub-account row. It's the majority of the screen and it is deliberately quiet.

Only L1 and L2 read as "structure"; L3 reads as "content." The v2 regression was flattening L1 into L2 everywhere — seven filled bands. v3 uses exactly one L2 band total in the shown states (June's RMD), and most screens use zero.

## The collapsed glance — what it says closed
Fixed row, always present, never expands past one line:
**"Your plan at a glance"** (left) · **"58 → 65 → 90 · $5,200/mo"** (right, muted) · chevron.
That's age → retire age → plan-to age, then spending. It's enough for a returning user to confirm "yes, this is still me" without opening it. Tapping expands to the 7 rows in place (no navigation) — the two dials and the bridge sentence above never move.

## Rows 6 and 7 hierarchy
Both are L3 rows that expand in place; their children are also L3 but indented (`padding-left:36px`, tinted background) — one level down, per the brief, achieved by indentation + tint rather than a new heading level.

## Every number on screen and where it comes from (§6)
| Number | Source |
|---|---|
| Odds 48% / range 18–78% | 400-simulation engine on Pat's own inputs; range = same runs at ±2pt average return |
| Odds 12% (bad state) | same engine, different (bad) inputs |
| Odds 100% (June) | same engine; all 400 runs lasted to 94 |
| Assets vs target 45% / 15% | current assets ÷ **typed** target — a plain division, NOT engine output |
| "$909,152 of $2,000,000 — short $1,090,848" | 909,152 (linked accounts) and 2,000,000 (typed target) are both facts on file; the subtraction is arithmetic |
| Projected-at-65 figure ($1,346,763) | engine projection — deliberately NOT shown in the hero per brief; only exists if a future state needs it, labelled "projection" |
| Mortgage payoff row — balance/rate shown, no points | **not wired** — flagged per brief §6; row is drawn so a points figure can slot in later without changing layout |
| Roth row — dollar amount shown, no points | same as above — not wired, flagged |
| Social Security $1,820/$2,600/$3,224 | SSA published early/delayed-credit schedule applied to Pat's own statement amount — real arithmetic, capped at 70 |
| RMD ~$15,849 | engine's forced-withdrawal calculation for June's year |
| Safe draw $4,155 / paycheck $8,155 | engine's sustainable-draw calculation + guaranteed income |
| Sample 84% (day-one state) | the app's own fixed sample figure, never invented per screen |
| "+14 / +9 / +6 pts" (bad-odds levers) | engine re-run three times, once per single change |
| Suggested target (not shown in these frames) | engine's 80%-odds-solving pot; offered only when target is blank — see below |

## Open questions — assumptions made, flag for founder ruling
1. **Extra saving/mo dropped from the glance**, per the brief's list of seven. It is NOT drawn as an eighth row (the seven are fixed facts/answers). Assumption: it belongs in "Decisions you can make today" as a future row once the engine can price "save $X more/mo → +N pts" the same way it prices the three bad-odds levers — today it's simply not offered as a control anywhere in this design. Flag: if the founder wants a quick "try a change" affordance restored, it should live as a decision-list row, not back on the glance.
2. **Facts vs. drafts: resolved to "everything saves immediately."** All seven glance rows commit the moment they're edited — no draft state, no "Use as my plan" button anywhere in v3. This directly answers the brief's open question #2 in favor of the simpler behavior the founder himself leaned toward.
3. **Suggested target:** not shown in these frames (every state here has a target on file or is pre-target-entry). Recommended placement for the next pass: inline under row 5 ("What's your target nest egg?") only while that field is blank — "We'd suggest $X for 80% odds" with a one-tap "Use this" and a persistent "yours, not ours" visual treatment (dashed border, muted tone) matching the day-one sample card's language.

## "Next decision" dated card
Not drawn as its own element in these frames — folded into the decisions list as a normal L3 row wearing a date (see June's "REQUIRED WITHDRAWAL, 2027" band), per the question raised in brief §3.4. Rationale: since it only ever appears for one real reason (RMD, 73+) and the brief already established "dated when real, absent when nothing is due," a dedicated persistent card slot sitting empty most of a person's life isn't worth a unique component — a list row that happens to carry a date reuses the same pattern as every other decision and needs no special-case layout. Flag for the founder: if a second dated-obligation type is added later (e.g. a Medicare enrollment window), reconsider promoting it back to a standalone card.

## Decisions-list conditionality
Implemented per person, not per state: Pat (58, has a mortgage, has pre-tax money, under 60) shows mortgage + Roth, no Social Security row. June (72, retired) shows her four retiree-specific decisions instead. Bad-odds state deliberately does NOT show the normal decisions list — it substitutes the three-lever list, since those ARE the decisions that matter at 12% odds.

## Files
- `Plan.dc.html` — all states: Pat collapsed/expanded, June collapsed/expanded, age-missing, day-one, bad-odds.
- `ios-frame.jsx` — device-frame helper for prototype presentation only.
