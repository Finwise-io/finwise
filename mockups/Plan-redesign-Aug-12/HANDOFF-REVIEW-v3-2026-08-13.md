# Claude Design handoff v3 — received and reviewed

**Received:** 2026-08-13 · `Plan.dc.html` + `Plan-v3-requirements.md` + `Plan-v3-revised-requirements.md`
**Against:** `PLAN-REDESIGN-BRIEF-v3-2026-08-12.md`
**Reviewed:** all 7 drawn states — Pat collapsed, Pat expanded, June collapsed, June expanded,
age-missing, day-one, bad-odds.
**Status:** the structure is right and most of the brief landed. **Six things block a build**, four
numbers on screen are not true, and five need a founder ruling. Two of the problems are mine, not
the designer's, and are marked as such.

> ⚠️ **The files are not on disk yet.** They arrived through chat and the copies I hold have
> character corruption (every em-dash came through mangled). Transcribing them would bake corrupted
> copy into the spec, so **please save the three original files into this folder.** The mock is the
> source of truth; this review is the delta, not a substitute.

---

## Adopted as drawn — this is the good news

- **Two independent dials**, and the note is explicit that the target never moves the odds. The
  thing that has broken this screen twice is finally understood.
- **The hero sentence is exact:** *"$909,152 of $2,000,000 target — short $1,090,848."* Today's
  money against the typed target, 45% on the dial, the corrected shortfall. All of it right.
- **The collapsed glance** — *"Your plan at a glance · 58 → 65 → 90 · $5,200/mo"* — is a genuinely
  good answer to the hardest question in the brief. It is enough for a returning person to think
  "yes, that is still me" without opening anything.
- **Seven rows, every one a question**, with rows 6 and 7 opening one level down by indent and tint
  rather than a new heading level. Exactly the hierarchy asked for.
- **The heading hierarchy (L1 quiet caps / L2 filled band / L3 plain row)** fixes the defect my audit
  found in the built screen: seven filled green bands in one scroll. v3 uses **one** filled band in
  the shown states, and most frames use none.
- **Both in-place controls work as specified** — the mortgage stepper and the spend-more stepper,
  each with "Use as my plan", each showing both sides of the trade.
- **"Estimated amount you can draw more every month: $2,555"** is verbatim, and *"held at odds of
  80% · change ›"* is on the number. Both founder rulings, honoured.
- **"Draw from savings"** throughout. The banned word is gone from this surface.
- **Day one shows no fake zeros**, uses the app's own 84% sample, and labels it.
- **"+ Add a big cost" is back**, which my audit found had gone missing entirely.
- **Every dollar figure reconciles.** I checked all of them: Pat's accounts sum to $909,152;
  2,000,000 − 909,152 = 1,090,848; 909,152 ÷ 2,000,000 = 45%; the bad-odds frame's
  2,100,000 − 312,000 = 1,788,000 and 312,000 ÷ 2,100,000 = 15%; June's 2,600 + 1,400 = 4,000,
  + 4,155 = 8,155, and 4,155 − 1,600 = the $2,555 headroom. The mortgage numbers match mine to the
  dollar.

---

## Blocking — six things that cannot be built as drawn

### B1. Every gauge needle points at the wrong number

I measured the needle angle in all six dials against the figure printed beneath it:

| Dial | Printed | The needle actually points at |
|---|---|---|
| Pat — odds | 48% | **56%** |
| Pat — assets vs target | 45% | **51%** |
| June — odds | 100% | **97%** |
| Bad odds — odds | 12% | **5%** |
| Bad odds — assets vs target | 15% | **4%** |
| Day one — sample | 84% | **65%** |

The **arcs** are drawn correctly (Pat's target arc ends at 45.2%, the bad-odds one at 13.3%) — it is
the pointer that is wrong, in all six, by 3 to 20 points. On the bad-odds target dial there are three
different values in one graphic: an arc at 13%, a needle at 4%, and a numeral saying 15%.

This is not cosmetic. The designer's own note says the value is carried by *"needle position +
numeral both"* — that is the colourblind-safety argument for the whole gauge. If the needle lies, the
gauge lies to exactly the people it was shaped for. Give us the angle formula, not hand-placed
coordinates.

### B2. The ordering rule is not applied — the dated row is last

Brief §3.3: **anything with a real deadline goes first, because it expires.** In both June frames the
required withdrawal sits at the very **bottom**, below three undated rows, as an L2 band after the
list. It should lead.

Correct order for June (72, already claiming, no mortgage): **required withdrawal → can I spend
more? → which account do I draw from first? → is converting to a Roth worth it?**

### B3. The Roth row has three names, and none is the agreed one

- Pat's frames: **"Convert to a Roth"**
- June's frames: **"Is a Roth move worth it?"**
- The agreed name (brief §3.3): **"Is converting to a Roth worth it?"**

One row, one name, everywhere. The agreed one keeps the question grammar the rest of the screen uses.

### B4. Stepper buttons are 30px against a hard 44pt rule

Both steppers use `width:30px;height:30px`. Brief §7: **44pt minimum for anything tappable**, no
exceptions — this audience includes people whose hands are not steady. This is the same defect class
my own audit flagged in the built screen last week.

### B5. Type sizes off the scale

Brief §7 fixes the scale at **11 / 13 / 15 / 17 / 20 / 24 / 30 / 38, nothing in between**. The mock
uses **12px, 12.5px and 13.5px** in the glance summary, the mortgage explanation and June's summary
sentence. Round to the scale.

### B6. The L1 label colour fails contrast

The section label ("DECISIONS YOU CAN MAKE TODAY") is 11px bold in brand green `#178F6B` on the
`#F6F7F5` background. **Measured: 3.78:1** — below the 4.5:1 floor for small text.

The app already learned this exact lesson; the theme file carries the note that the mid brand green
fails the small-text floor and the deep green is the accessible one. Use **`#085041`**, which
measures **8.74:1** on the same background.

---

## Not true on screen — four numbers or claims that do not hold

### N1. The footer sentence the founder already rejected is still there — **my omission, not theirs**

June's frame still ends: *"Have you taken it yet? Confirm › · 400 simulations of your own numbers —
not advice."* The founder called this out on 2026-08-12 as not making sense on the retired screen,
and he was right: her Social Security and pension are figures **she reported**, not simulation
output, and the sentence claims everything above it came from 400 runs. Only the odds and the draw do.

It is now worse than before: the disclaimer has been welded onto the **Confirm** action, so a legal
footnote and a button share one line.

**This is my fault — I agreed the fix in conversation and never wrote it into the brief.** The
instruction should have been: stop footnoting the screen, label the numbers. The simulation note goes
under the odds; the paycheck says where its own figures came from.

### N2. June's assets are Pat's number — **my gap, and my first reading of it was wrong**

June's expanded frame shows *"What counts toward retirement? $909,152"* — Pat's figure. Her
required-withdrawal figure (~$15,849) and her Roth row ($420,000 pre-tax) are Pat's numbers too.

**Correction to my first pass.** I wrote that a $4,155 draw on $909,152 was a 5.5% withdrawal rate
that could not sit beside 100% odds. That was wrong: **$4,155 is her capacity, not her withdrawal.**
She actually draws $1,600 a month — **1.95%** — and I have since run it: the odds at her real
spending are **100%**, exactly as drawn. Capacity and actual are different questions and the screen
was right to show both.

**The real mismatch is smaller and still needs fixing.** Run against $909,152, the engine's maximum
draw is **$3,835**, not $4,155. The balance that produces $4,155 is **$985,000**.

**Corrected, reconciling set — now pinned by tests** (`src/__tests__/june_numbers_probe.test.ts`):

| | |
|---|---|
| Fidelity Traditional IRA | $420,000 |
| Schwab Brokerage | $448,000 |
| Ally Savings | $117,000 |
| **What counts toward retirement** | **$985,000** |
| Maximum draw from savings *(engine, 80% floor)* | **$4,155/mo** |
| Guaranteed (Social Security $2,600 + Pension $1,400) | $4,000/mo |
| **Paycheck** | **$8,155/mo** |
| She spends | $5,600/mo → draws **$1,600**, which is **1.95%** |
| Headroom *(the $2,555 figure)* | $4,155 − $1,600 |
| Odds at her real spending | **100%** to 94 |
| Required withdrawal at 73 | $420,000 ÷ 26.5 = **$15,849** |

The pre-tax balance is deliberately $420,000, which makes both the required-withdrawal figure and the
Roth row true **for her** rather than borrowed from Pat.

### N3. The mortgage caption states something the engine does not do

*"Your $2,400/mo mortgage is included automatically until it's paid off in 2054."*

Right now the app has **no concept of debt inside the retirement simulation at all.** If the person
typed a spending figure that included their mortgage, it is included — but **forever**, not "until
2054". The half of that sentence that matters is the half that is false.

Keep the sentence; it is the right sentence. But it ships only with the engine work in brief §6, and
until then it must not be drawn as a statement of fact.

### N4. The odds delta is computed by subtraction — declared, but flag it in red

The prototype computes `48 − (extra/500) × 5`. Brief §6.1 forbids exactly this: **odds are only ever
the output of a second full run.** The designer declares it honestly as placeholder maths in the
requirements note. Recording it here so it cannot be missed at build time.

---

## Needs a founder ruling — five open items

1. ~~**Pat's expanded frame drops both dials.**~~ **RULED 2026-08-13 — keep them, shrink them.**
   Opening the glance replaced the hero with a one-line summary, while the designer's own note said
   the dials *"never move"*. The founder settled it in favour of the note: the dials stay, smaller,
   while the rows are open — because watching the odds respond IS the reason the inputs were moved
   onto the tab. Recorded in brief v3 §3.2.
2. ~~**"Try all three together ›"** points at the sandbox, which v3 removed.~~ **RULED 2026-08-13 —
   drop it.** Never built; it existed only in the drawing. The steppers ARE the sandbox now, so the
   link had no destination — on the screen where the person is in the most trouble. The idea behind
   it is kept in brief v3 §5 as something the redesign may offer *properly*: today the screen could
   only honour two of the three changes, since claiming later is not a stepper.
3. ~~**The Social Security row is never drawn.**~~ **RULED 2026-08-13.** The window is **60 to 70**,
   and the reason it was drawn nowhere was MY gap: Pat is 58 and June is 72 and already claiming, so
   neither persona could trigger it. Brief v3 gains **Ray, 64, still working, not yet claimed** — who
   also fills the hole in the middle of a 55-to-70 audience. The gate is now built and pinned in the
   app too: before this the only bound was age < 71, so a 58-year-old was told the next decision in
   front of them was a claim window opening in four years.
4. ~~**Decisions are hidden when age is missing.**~~ **RULED 2026-08-13 — do not hide them.** Paying
   off a mortgage needs a mortgage; converting to a Roth needs pre-tax money. Neither needs an age,
   and the rows that DO need one now remove themselves (Social Security 60-70, required withdrawal
   73+). The built app already behaves this way — it is the drawing that hides them — so this is a
   brief instruction, not a code change. The locked *"When can I retire? 🔒"* row stays: a lock
   explains itself, an empty section does not. Recorded in brief v3 §5.
5. ~~**Hide-balances is unresolved.**~~ **RULED 2026-08-13 — hide the number, keep the shape.** The
   odds stay fully visible (not a dollar figure). On the target dial the numeral is dotted and the arc
   still fills. I had recommended hiding that dial outright — its percentage is made of two dollar
   figures, and the arc carries the same ratio the numeral does — but the founder chose the shape.
   Recorded in brief v3 §7 with that reservation stated, plus a refinement offered to the designer:
   a coarse arc ("about this far") leaks far less than a needle at exactly 45%.

---

## Housekeeping

- **Two requirements notes are live at once** and the revised one says to read them together. The
  older one now contains stale claims — most importantly *"no 'Use as my plan' button anywhere in
  v3"*, which the design contradicts on two rows. Ask for one merged note.
- **The older note's design tokens are the v2 oklch set**, not the app's real hexes. The HTML uses the
  right ones; only the note is stale.
- **Correctly declared as open** and needing no action from them: the extra-saving row, the suggested
  target placement, and the facts-versus-drafts resolution.

---

## What I owe before the next pass

1. A full, reconciling set of numbers for June — balance, draw rate and odds that agree.
2. The footer instruction that should have been in v3: label the numbers, do not footnote the screen.
3. The five rulings above, once you have made them.
