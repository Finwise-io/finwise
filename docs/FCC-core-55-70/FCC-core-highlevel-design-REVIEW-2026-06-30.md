# FCC 55-70 high-level design v1.1 — alignment review vs Problem + Strategy
**Date:** 2026-06-30 · **Method:** 7 independent reviewers (per-group coverage, per-group strategy fidelity, identity+regulatory line, scope/sequencing, hook-frequency+completeness) → adversarial verification of every finding against the full design + scope sections → synthesis. 55 findings raised, 8 rejected, 47 kept.

## Verdict
**Strongly aligned.** The design faithfully delivers the 55-70 shared core: the two-faces identity (Grow & Track / Worry-less-Safe-to-spend), the never-recommend "chief of staff, not advisor" line (held with the clever user-moved longevity slider), the honestly-scoped month-by-month safe-to-spend engine, and the multi-goal trade-off that nails the hardest 55-65 job. Deferred items (Medicare, deep tax/estate/fraud, sandwich-caregiving) are correctly left out. **Two real fixes**, a few clarifications, and **one scope decision** to reconcile.

## Must-fix (2)
1. **[HIGH] Retired hero missing its "this year" number.** Strategy promises "this month AND this year" (stated 4×); design shows monthly only. → Add a yearly safe-to-spend figure beside the monthly on the Cash flow card + retired Home hero. Engine already produces it.
2. **[HIGH] "Best path / which is best / best-math" leaks advisor-voice** — the regulatory line. Strategy never crowns a winner. Appears in Overview, Principle 1, the Social Security feature/screen/journey. → Find-and-replace with neutral "what each option does to your numbers/odds"; cut the wireframe line "waiting to ~67 gives the most total" ("your call" doesn't neutralize a sentence that already picked the winner).

## Clarifications (3 medium)
3. **Safe-to-spend must visibly move with markets.** Strategy: the number is live, updates as markets move — the reason a retiree opens the app. Design defines the formula but never says it re-derives off live balances. → Add one line; name it the recurring reason to open.
4. **Scam flag has no engine.** Traced to the insights engine, which reads balances not transactions. → Specify a simple v1 rule (e.g. unusually large transfer to a new payee) marked NEW, or narrow the promise. Label it a single-transaction flag, not "fraud protection."
5. **Draw-order isn't steerable.** Strategy: "a model you steer — change the order and re-run." Design shows fixed 1-2-3-4 with only a "why" tap. → Add a "change order / re-run" affordance; reword "sensible/tax-smart order" → "the order the math would tap your accounts in."

## Scope tensions
- **[MED] Multi-goal building-years engine (afford home/college/parents) is in v1, but the 36-65 strategy files goals/college under phase 2.** Review's read: NOT scope creep — well-built, reuses existing primitives, targets the in-scope 55-65 persona ("can I afford to retire AND keep helping my parents/kids?"). → Reconcile the **strategy** (admit the v1 multi-goal scenario at engine level; keep only deeper 36-55 work — equity-comp tax, standalone college planner — in phase 2). Decide debt-payoff dial: in or deferred.
- **[LOW] User-editable "Edit tabs" + "More" drawer** — neither strategy asked for it; adds build + a11y cost. Mode-adaptive auto default order is excellent, keep in v1. → Decide: keep editing in v1 (cost called out) or defer editing to phase 2.
- **[LOW] "Help parents $X/mo" needs a boundary line** — it's a scenario outflow only, NOT shared parent accounts (cut) or a household model (deferred). → Add one fencing line so the PRD can't grow it.

## Correctly deferred (NOT gaps)
Medicare/IRMAA timing · deep estate + fraud suite · the legacy "what I leave behind" half · deep tax optimization (Roth-window/IRMAA/bracket) · equity-comp tax detail · standalone college planner · sharing parents' accounts · executing RMDs against accounts · full household / two-earner model. Design doesn't half-promise any of these. (Worth one-line "intentionally deferred" notes for legacy + household so they don't read as oversights.)

## Strengths (keep / template)
- The **user-moved longevity slider** guardrail — make it the standard for every chief-of-staff decision screen.
- **Month-by-month safe-to-spend** honestly marked NEW on verified primitives; refuses the flat-yearly-average shortcut.
- The **multi-goal trade-off** (retire 67→69, confidence 84%→76%, "trim one") with a strict no-recommend stance.
- The **working→retired transition** (same accounts/engines, only face + order flip).
- **"Plan — we lay it out. You decide."** stamped where the advice line is most at risk.

## Open decisions for the founder (shape v1.2)
1. Customizable "Edit tabs" — keep in v1 or defer editing to phase 2 (keep auto order)?
2. Debt payoff as a multi-goal dial — v1 or defer?
3. Simple Roth-conversion scenario (strategy carves the simple case in) — v1 or defer?

## Actions
- Design **v1.2**: fold fixes 1-5 + the parent-boundary line + the "intentionally deferred" notes.
- **36-65 strategy** bump: admit the v1 multi-goal scenario; reframe phase-2 to the deeper 36-55 work only.
