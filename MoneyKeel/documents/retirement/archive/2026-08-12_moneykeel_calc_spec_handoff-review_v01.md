# Claude Design handoff — received and reviewed

**Received:** 2026-08-12 · `Plan-requirements.md` + `Plan.dc.html` + `ios-frame.jsx`
**Against:** `PLAN-REDESIGN-BRIEF-v2-2026-08-12.md`
**Status:** adopt the design; five corrections below applied before any code is written.

> Drop the two original files (`Plan.dc.html`, `Plan-requirements.md`) into this folder — the mock
> is the source of truth and must live with the others. This review is the delta, not a substitute.

---

## Adopted as drawn

- **The two-gauge hero** — odds on the left, assets-vs-target on the right, both absolute dollars
  beneath ("$909,152 of $1.9M target"), then the bridge sentence. This is the shape the founder
  asked for on 2026-08-12, drawn better than the brief described it.
- **The bridge sentence** — "Add $38,000 to your retirement assets every year for 7 years to reach
  your target and raise your odds to 80%," with the tax-advantaged room named.
- **FACT / DRAFT chips** as the primary way a person tells a saved fact from a draft choice. The
  brief asked for the distinction to be visible; the chips answer it in one glance.
- **All five states of the merged screen**, including the pinned outcome strip and the honest
  impossible-saving state with three real levers.
- **Section 2 rows carrying what they are worth** in dollars or points, never a bare topic.
- **The retiree paycheck variant** replacing the target gauge — right call: there is no "reach a
  target" framing once someone is drawing down.

---

## Correction 1 (blocking) — the verdict word is gone

The handoff picks **Likely / Uncertain / Unlikely** as the single word-set and puts it on every
screen: *"Uncertain — 60% odds of lasting to 90"*, *"Likely — 100% odds of lasting to age 94"*.

**The founder removed the word entirely on 2026-08-12**, hours after the brief went out:
*"uncertain and giving it 60% probability does not make sense — it should be either or."* Both
word-sets are already deleted from the code and pinned absent by tests.

Not the designer's error — brief v2 §11.1 explicitly asked them to choose one. The sequencing was
mine. The subtraction is clean: every place the design reads `<word> — xx% odds of lasting to age
abc` becomes `xx% odds of lasting to age abc`, and nothing else in the layout moves.

## Correction 2 — the range claim would make the app lie

The handoff states the 31–87% range is *"a confidence band on the 60% ESTIMATE ITSELF (modeling
uncertainty), not a spread of dollar outcomes"* and instructs: *"do not word this as 'your odds
could be as low as 31%'."*

**That is the opposite of what our engine computes.** `willItLast.ts` derives the band by re-running
the whole simulation with the assumed average return **2 percentage points lower and 2 points
higher**. It is a market-outcome range, not a statistical confidence interval. The shipped
wording — *"range 31–87% across bad-to-good markets"* — is already correct, and the handoff's
instruction would replace a true sentence with a false one.

**Keep:** the honest reading — if long-run returns come in meaningfully below what we assume, the
odds are 31%; meaningfully above, 87%.

## Correction 3 — the home's growth does not belong in the blend

The handoff's calculation note says the blend includes *"home 4.5% — home's growth still applies
even though home doesn't count toward the total."*

It does not. If the home is excluded from what counts toward retirement, it contributes neither
balance nor growth to the money being simulated. Including its rate would tilt the blended return
of a portfolio that does not contain it.

## Correction 4 — June's slack row contradicts the handoff's own arithmetic

The Section 2 row reads **"Spend more — you have slack · +$1,600/mo room."**
The handoff's own calculation block has it right: safe draw $4,155 − the $1,600 she is drawing =
**$2,555/mo unused.** $1,600 is what she *is* using, not what is spare. The row should read
**+$2,555/mo room** — or the whole framing changed, since "spend more" against a safe-draw ceiling
deserves care.

## Correction 5 — small ones

- **The sample is 84%, not 74%.** `SAMPLE_CHANCE = 84`, `SAMPLE_HORIZON = 90`, used app-wide. The
  empty state must show the app's own sample, not a new invented one.
- **The required-withdrawal figure (~$15,849 first year) is the one already flagged as
  inconsistent** with the year-by-year table on that screen (brief §7 problem 6). The handoff
  propagated it. Do not treat it as settled copy until that problem is resolved.

---

## What this costs to build — display vs engine

**Display work** (the design as drawn, on existing numbers): the two-gauge hero, the tab's two
sections, FACT/DRAFT treatment, the five states, the pinned strip, the three outcome-block levels,
Section 2 row treatment.

**New engine work** (does not exist today):
1. **The derived target** — solve the simulation backwards for the nest egg where the odds hit 80%.
   A bisection over start balance, roughly a dozen full runs per recalculation.
2. **The required annual saving** — a second solve, for the contribution that closes that gap by
   the retirement year.
3. **Per-lever point deltas** (+14 / +9 / +6) — one full re-run per lever, per recalculation.
4. **Section 2's dollar-and-point labels for goals and debts** ("send a child to college · −4 pts",
   "pay off the mortgage early · +3 pts") — these need goals and debt payoff wired into the odds
   engine as scenario inputs. Today they are not.
5. **The draft-vs-committed state layer** — facts write through, choices stay in a draft until
   "Use as my plan".

**Already exists:** saved scenarios (`retirementScenarios` in the store), the odds engine, the
earmark rule, big costs, tax-advantaged room.

The performance of 1–3 together is the one real risk: a person moving a stepper would trigger a
target solve, a saving solve, and three lever runs. That needs measuring on a real phone before it
ships, not after.

---

## One question back

The handoff puts the **merged screen behind a link** from the Plan tab ("Your plan, in full — age,
spending, accounts, big costs ›") rather than inside it. So the tab is a summary — hero, decisions
— and the inputs are one tap away.

That is a defensible reading of "the Plan tab is two sections", and it keeps the tab short. But it
is not quite what the brief described (§3.1–3.2 read as the merged screen *being* section 1). Worth
a founder call before building, because it decides whether a person can change their retire age
without leaving the tab.
