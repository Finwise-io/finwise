# Scope decision: should v1 include Net Worth, Investing, Retirement? · v1.0 · 2026-06-29

Question raised before approving the PRD: the wedge is daily cash-flow, but isn't Net Worth + Investing
(this is the "Robinhood generation") and "can I retire" core enough to include in v1? Research run
2026-06-29 (107 agents, 5 angles, fact-checked) to answer with data. Pairs with the wedge research
`18-35-research-v1.0-2026-06-29.md`.

## What the data says (verified, high confidence)
1. **"Robinhood generation" is real but COOLING and SHALLOW.** Under-35 investing rate **fell 32% → 26%**
   (2021→2024, FINRA Foundation NFCS); new-investor inflows **collapsed 21% → 8%**. Democratization is genuine
   (≈⅓ of 25-yr-olds have an account, 6× since 2015, reaching lower incomes — JPMorgan Chase Institute) — but
   among young adults the rate is **down**, not up.
2. **Those who invest skew SPECULATIVE, not portfolio-trackers.** Among under-35 non-retirement investors:
   43% trade options, 29% bought meme stocks, 27% hold crypto, 22% trade on margin (FINRA). That's a
   **Robinhood-style active-trading** use case — they do it **in Robinhood**, not in a budgeting app's passive
   net-worth view.
3. **Day-to-day dominates, hard.** 61% of 18-34s aren't saving for retirement monthly; 48% can't cover 2
   months of expenses; retirement is the **lowest** thing they save for (9%, behind travel/transport/housing);
   Gen Z ranks debt, living expenses, and major life events **above** retirement (CNBC, TIAA, Transamerica).
4. **Retirement = broad-but-passive + overconfident.** 76% of Gen Z / 85% of Millennial workers "save" for
   retirement — but mostly **auto-enrolled 401(k)**, not active planning; only ~20% of Gen Z actively save.
   76% **feel** "on track" (highest confidence of any generation) while their plans are projected to cover only
   **~58%** of needed income (BlackRock). Profile = **high confidence + low knowledge** → wants a simple honest
   nudge, **not** a planning calculator.
5. **No evidence on the product-strategy half.** The research could **NOT** verify (a) that 18-35 want/track
   net worth, (b) whether all-in-one vs single-purpose apps retain/monetize better, or (c) willingness-to-pay
   by feature. These remain **open** — the recommendation below rests on engagement/priority data, not direct
   retention/WTP data.

## Pros / cons per feature

### Net Worth (light, secondary — NOT the headline)
| Pros of including | Cons of including |
|---|---|
| Cheap — already built | **No data** that 18-35 specifically want/track net worth |
| Known "watch it grow" retention pattern (general PFM) | For many 18-35 (low/negative net worth, debt > assets) it can **demotivate** |
| Completes the picture for the ~26% who invest; bridge to the platform + older personas | Adds surface area; risks **diluting** the safe-to-spend focus if it competes for the hero slot |
| On-brand with the cohort's aspirational identity | Real value depends on the same sync (already needed for the wedge — so not extra friction) |
**Verdict: INCLUDE — light + secondary** (a card, with investment **balances** rolled in). Don't lead with it.

### Deep investment performance tracking (Stocks/Bonds/Alts screens)
| Pros | Cons |
|---|---|
| Serves the engaged young-investor segment | Investing rate **declining**; new-investor inflows **collapsed** |
| | Engaged investors are **active traders who stay in Robinhood** — won't use a passive view |
| | Expensive to build/maintain (prices, performance) for a **shrinking, shallow minority** |
**Verdict: DEFER (strong).** Keep balances in Net Worth; no performance/holdings depth in v1.

### Retirement "am I on track"
| Pros | Cons |
|---|---|
| Most already have a 401(k); high confidence + **low knowledge** → they want a simple honest signal + "where to start" | Retirement ranks **low priority** at this age (day-to-day dominates) |
| A **light** cue is cheap (engine exists; surface a simple version) | A full Monte-Carlo planner is overkill — would dilute |
| Honesty differentiator: their confidence outruns reality — a gentle reality-check builds trust | Risk of feeling irrelevant/preachy to 18-24 |
**Verdict: INCLUDE a LIGHTWEIGHT "on-track" cue + education** (not the cockpit). Optional/secondary.

## Net recommendation (revised v1 scope)
- **Lead with the cash-flow wedge** (validated hard). 
- **Net Worth: in, but light + secondary** (incl. investment balances). Not the home hero.
- **Deep investment tracking: defer.** 
- **Retirement: a light "on-track" nudge + education, not the engine.**

This **partly revises** the "Robinhood generation ⇒ build investing + net worth" instinct: the data says drop
investment **depth** (not keep it), keep net worth **light** (not headline), and a **light retirement cue is
worth keeping** (you'd been willing to drop it).

## Honest caveat (don't over-trust this)
The product-strategy questions (net-worth desirability, bundling-vs-single-purpose retention, willingness-to-
pay) returned **no verified evidence** — so the Net-Worth-inclusion call is **judgment from engagement data,
not proof.** Worth validating with our **own usage analytics post-launch** (does the NW card drive return
visits? do investors engage?) before investing more in it.

Sources: FINRA Foundation 2024 NFCS; JPMorgan Chase Institute; TIAA Institute 2024; Transamerica 2024;
BlackRock Read on Retirement; CNBC/Generation Lab; Bankrate. Full claim/vote detail in the workflow output.
