# Claude Design handoff v4 — received and reviewed

**Received:** 2026-08-14 · `Plan.dc.html` + `Plan-v4-requirements.md`
**Against:** `PLAN-REDESIGN-BRIEF-v3-2026-08-14.md` and `HANDOFF-REVIEW-Plan-v3-2026-08-13.md` (nine blockers)
**Reviewed:** all 17 frames — Pat collapsed/expanded, June, Ray, age-missing, day-one, bad-odds,
the two state-6 cards, both mortgage frames, Goals populated/empty, Prepare populated/empty.
**Status:** **the nine v3 blockers are closed.** Five new things block a build, three of them numbers.

> ⚠️ **Save the files into `Claude-Design-handoff-received-2026-08-13/`** (or a new dated folder
> beside it). This review was done from the chat copies.

---

## Closed from v3 — all nine, and B1 was fixed the right way

**B1 — the needles.** Fixed **structurally**, which is what was asked for and is better than fixing six
numbers. One formula, `arcPt(pct, r)`: angle = 180°·(1−pct/100), point = (110+r·cosθ, 110−r·sinθ),
needles at r=78, fill arcs at r=90. Hand-placed coordinates are gone from the file. **That removes the
defect class, not the instances** — no future dial can drift.

**B2** dated row leads June's list. **B3** one Roth name. **B4** 44×44 steppers. **B5** type scale.
**B6** `#085041`. **B7** spend-more rebuilt in plain English. **B8** day one shows all seven rows with
"Add your age ›". **B9** Goals and Prepare have landing views, populated and empty.

**Every number I pinned reconciles to the dollar.** I checked all of them against the engine: Pat's
$909,152 across the corrected accounts, 67% odds, range 20–98%, $77,500 → $2,008,196, the growth split
($542,500 / $426,859 / $129,685), the 45% dial, the $1,090,848 shortfall; June's $985,000, $8,155,
100%, $1,600 actual draw at 1.95%; Ray's $500,000 of $750,000, 67%, $1,820/$2,600/$3,224, 73%→80%;
state 6 at 114% and 67%; the mirror at $17,500 → $1,505,001 and 74%; bad-odds $312,000 of $2,100,000,
short $1,788,000, 15%. **All correct.**

**They also answered the brief's three questions back**, which is what was asked: no separate heading
for Goals or Prepare (the sub-tab bar names them), the past-target dial caps rather than overfills
(flagged as the open half), and the mortgage pointer on Retire earns its place. Good calls, all three.

---

## Blocking — five

### V1. The below-yield mortgage frame has two wrong numbers

The frame reads **"$380,000 at 3.1%"** but carries the figures computed for the brief's **$412,000**
example. Both money figures on it are wrong for the balance shown:

| | On screen | Correct at $380,000 |
|---|---|---|
| Yearly difference vs Treasuries | $6,304 | **$5,814** |
| Over the life of the loan | $40,217 worse off | **$31,873 worse off** |

Either restore the balance to **$412,000** (both figures then hold exactly) or recompute for $380,000.
**This is the frame the whole feature exists for** — the case where paying a mortgage down early costs
money — so it is the worst one to be wrong on.

### V2. The spend-more copy overstates at one stepper position

The threshold rule buckets everything under $2,555 as *"about 9 future simulations out of 10."* The
stepper moves in $500 steps, so it lands on **$2,500** — where the real answer is **81%**, not 90%.

| Extra | Real | The copy says |
|---|---|---|
| $2,000 | 90% | 9 in 10 ✓ |
| **$2,500** | **81%** | **9 in 10 ✗ — off by 9 points** |
| $2,555 | 80% | 4 in 5 ✓ |

Nine points, in the flattering direction, on the screen about spending more. Narrow the bucket: below
about $2,200 is 9 in 10, above it is 4 in 5.

### V3. The mortgage caption is stated as fact again

*"Includes your $2,400/mo mortgage payment until it's paid off in 2054."*

Review item **N3** established this **is not true**: the retirement simulation has no concept of debt,
so it charges that payment forever, past 2054, until three pieces of engine work land. The previous
requirements note said in bold *"do not ship this row's copy until that work is done."* **v4 drops the
flag and the caption now reads as a plain statement.** Restore the flag, or use the honest interim
wording until the engine work is done.

### V4. Type below the floor

The **"DUE DEC 31"** chip is **10.5px**. The scale is 11 / 13 / 15 / 17 / 20 / 24 / 30 / 38 and
nothing goes below 11 — the audience is 55 to 70. It is the only off-scale size left in the file.

### V5. Amber says two different things on one screen

On day one, the **"Add ›"** rows are amber *(you need to do something)* and the **"ours"** chip is
also amber *(this is our assumption — nothing is wrong)*. The tokens reserve amber for needs-attention,
and here it marks both a gap and a perfectly fine default on the same screen. Give "ours" a neutral
chip and keep amber for the rows that actually want action.

---

## Not true, but only in the note

The requirements note states the growth split totals **$1,098,044**. It is **$1,099,044**
(542,500 + 426,859 + 129,685). **The screen is right** — the hero says "about $2,008,000" and
909,152 + 1,099,044 = 2,008,196. Only the prose is wrong.

---

## Needed, and not their fault — the founder ruled after this pass

**The target nest egg question must offer a figure and say it is ours.** Founder ruling 2026-08-14,
brief §3.2:

> **What's your target nest egg?**
> **$1,250,000** — *our starting figure, not yours. Change it to your own number.* ›

For Pat the suggestion is **$1,250,000** (the pot that reaches 80% odds — verified). Note it sits well
below the $2,000,000 he typed: our suggestion and his ambition are different things and the screen
must not blur them. The v4 note still lists suggested-target placement as unresolved; it has been
resolved. Day one's target row should carry it too, instead of a bare "Add ›".

---

## Correctly left open — no action needed from them

The mortgage odds delta is still the placeholder subtraction and **they flagged it**, which is right:
§6.1 requires a second full simulation before it ships. Extra-saving as an eighth row, facts-versus-
drafts, and capping-versus-overfilling the past-target dial all remain founder calls and are flagged
rather than guessed at.

---

## What I owe before the next pass

The five blocking items above, the target-question wording, and the corrected mortgage figures — all
already in brief v3-2026-08-14 except V1 and V2, which are new and recorded here.
