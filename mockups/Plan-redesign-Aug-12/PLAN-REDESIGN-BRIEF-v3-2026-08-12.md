# Plan surface — redesign brief v3

**For:** Claude Design
**Supersedes:** `PLAN-REDESIGN-BRIEF-v2-2026-08-12.md` (v1 and v2 stay on file)
**Why a v3:** the v2 design was built, and the founder's verdict on the built screen is
**"too much information on one screen"** and **"the way you designed it is very confusing."**
He has since settled the structure himself. This brief carries his structure, not a fresh
exploration of it. Everything in §3 is a decision already made — design *to* it, don't re-open it.

**One-line summary of the change:** the target nest egg is now a number the person **types**, the
retirement inputs collapse into one **"Your plan at a glance"** block of seven equal rows, and the
decisions list shrinks to what actually applies to that person.

---

## 1. The product, in two sentences

MoneyKeel is a retirement-planning app for people roughly **55 to 70** — most of them within ten
years of retiring or already retired. The promise is *"We lay it out. You decide."*: we never advise,
we show honest numbers and let the person choose.

Design implications that are not negotiable: **larger type, high contrast, no jargon, no invented
numbers, and no dead ends.** Assume presbyopia and a person who does not use financial software
daily. Assume they will read every number and ask "says who?".

---

## 2. The problem to solve

**The Plan tab has too much on it.** The built screen currently stacks, in one scroll: a gauge, a
range, three money rows, a bridge sentence, seven filled green section bands, two text fields, five
account rows, three doors, a big-costs section, three steppers, a link, an amber next-decision card,
a decisions list, a progress meter and a footer. It is roughly 100 visible lines. A person opens it
and cannot tell what they are meant to look at.

**Your primary job in this brief is subtraction.** The structure in §3 is the founder's; how little
of it can be on screen at once — and what each state hides until asked for — is yours.

---

## 3. The structure the founder specified

Design to this. It is settled.

### 3.0 THE PLAN TAB HAS THREE SUB-TABS — added 2026-08-13

The founder reorganised the surface after the brief first went out. **Plan keeps its name** and
gains three sub-tabs. Everything else in this brief describes **Retire**, which is the first of them
and the only one being redesigned in this pass.

| Sub-tab | What lives there |
|---|---|
| **Retire** | The whole of this brief — the two dials, the glance, the decisions. Plus the retirement cockpit, will-it-last, Social Security timing, Roth conversion, required withdrawals, big costs, **"What if I save more?"** (moved in from the Performance tab, where it has always sat despite being a retirement question) and **contribution room** (which today appears only if an insight fires). |
| **Goals** | Everything else a person saves for: goals, the college planner, and **"Can I afford it all?"** promoted to its front door. |
| **Prepare** | Getting your affairs in order: the insurance check, estate & legacy, the tax organiser, **build credit** (founder added it 2026-08-13, reversing the August menu trim for this audience), the **stress test** (folded in — it is an emergency-cash question, not a retirement one) and the **job safety check**. |

**Two things to know when drawing it.**

The split is **lopsided on purpose**. Retire is the entire redesign; Goals and Prepare are existing
screens being gathered under honest names. Do not pad them for symmetry.

And Prepare is **mostly a renaming of something that already exists** — the Goals screen quietly
links credit, college, estate, insurance and the tax organiser today. This is not new
information architecture so much as a name for an accidental hub.

The full picture — where all 48 screens are reachable from today, and where each should live — is
generated from the code: `docs/FCC-core-55-70/screen-architecture.html`
(regenerate with `node scripts/screen-map.mjs`).

### 3.1 The hero — two dials

Side by side:

| Left dial | Right dial |
|---|---|
| **The odds.** "48% — odds of lasting to age 90", with the range beneath. | **Assets vs target.** How far today's money is toward the target *they typed*. |

Beneath both, **one sentence, this shape**:

> **$909,152 of $2,000,000 target — short $1,090,848**

**The right dial compares what they have TODAY to their target.** Not what they are projected to have
at retirement. The founder chose this explicitly. 909,152 ÷ 2,000,000 = **45%** on the dial, and the
shortfall is **$1,090,848**. (An earlier draft of this sentence circulated with "short $653,237" —
that is the gap from the projected-at-retirement figure and is **wrong for this design**. Do not use it.)

**And one more line beneath it: what closes the gap.** Founder ruling, 2026-08-13 (audit D4). The v3
handoff ended the hero at the shortfall and went straight to the glance, which leaves the screen
stating a problem and offering nothing. This was the most actionable line on the old design and it
comes back — now measured against **their** target rather than ours:

> **Saving $84,500 a year over your 7 years to 65 reaches your target.**

**Solve it, do not formula it.** The obvious closed-form annuity calculation gives $82,000 for Pat and
lands at $1,977,544 — **$22,000 short of the target it just promised to reach.** That is the same
class of defect as audit D1/D2. Find the smallest yearly saving whose projection actually reaches the
target and round it **up** — measured: $84,500 lands at $2,021,514, and one $500 step lower lands at
$1,994,407 and misses.

**When they are already past their target, the sentence changes rather than disappearing** — see §5,
state 6.

### 3.2 "Your plan at a glance" — seven equal rows, **collapsed by default**

Directly under the hero. **It starts collapsed.** Opening it reveals seven rows, and

> **all seven sit at the same level of hierarchy. Anything beneath them — an individual account, an
> individual cost — is one level down and must be drawn as one level down.**

The seven, in this order:

1. **Your age** — editable field, pre-filled when we know it
2. **Target retirement age**
3. **Plan to age**
4. **Monthly spending in retirement** — a dollar amount, pre-filled from what we already know they
   spend, and editable
5. **Target retirement assets / nest egg** — *the number they type.* This is the new one.
6. **Current retirement assets** — **expandable and editable**; expanding shows the individual
   accounts (one level down)
7. **Big one-time costs** — expanding shows the individual costs (one level down)

Rows 6 and 7 are the only ones with a level beneath them. That is the hierarchy problem to solve
visually: seven peers, two of which open.

**When the glance opens, the dials STAY — smaller, but present.** Founder ruling, 2026-08-13.

The v3 handoff drew Pat's expanded frame with **both dials gone**, replaced by a single line of text,
while its own requirements note said the dials *"never move"*. The drawing and the note disagreed;
this settles it.

Keeping them is the whole reason the inputs sit on the tab rather than behind a link: a person nudges
the retirement age **in order to watch the odds respond**. Take the dials away while they edit and
they are adjusting numbers blind, then scrolling back up to find out what happened. The screen would
still be tall and they would still be guessing.

So: **shrink them and keep them visible while the rows are open** — the number being changed and the
number it is being changed *for*, on screen together. How small, and whether they pin to the top or
simply compress in place, is yours to design.

**Every row is a question, not a parameter.** Founder ruling, 2026-08-12: *"We should not have these
retirement parameters — Current Age, Target Retirement Age, Plan to Age, Current Nest Egg /
Retirement Assets — as simply parameters versus framing it as a question. These are simple to
understand."* So: *"How old are you?"*, *"When do you want to retire?"*, *"How long should the money
last?"*, *"What will you spend each month in retirement?"*, *"What's your target nest egg?"*,
*"What counts toward retirement?"*, *"What big one-time costs are coming?"* — your wording, that
grammar. Keep them short enough to sit on one line beside their answer.

### 3.3 "Decisions you can make today" — only what applies to this person

1. **Pay off the mortgage early**
2. **Convert to a Roth**
3. **When to claim Social Security — at 60 and above only**

**Shown only when they apply.** No mortgage on file → no mortgage row. No pre-tax money → no Roth
row (there is nothing to convert, so the question is meaningless). Under 60 → no Social Security row.
Under 73 → no required-withdrawal row. Already claiming → the Social Security question is removed
entirely, not answered with a dead end. Nothing applies → the whole section stands down rather than
offering someone a decision they cannot make. **Absent, never greyed out and never "no mortgage on
file".** Draw the row pattern so a further decision can slot in later without a redesign.

**Expect a short list.** Pat, 58 with a mortgage and pre-tax savings, sees **two** rows. June, 72 and
already claiming, sees **three**. Design for two-to-four rows, not for a full menu.

#### The order — a rule, not a sequence

Founder ruling, 2026-08-12. Today there is no rule at all: the rows are hard-coded one after another
in the order the lines happen to sit in the source file. **This must become a rule the code applies.**

**1. Anything with a real deadline goes first**, because it expires. Today that is the required
withdrawal, due 31 December. This extends the one ordering principle the app already has — the
next-decision card already holds that a required withdrawal outranks everything because it is dated.

**2. Everything else holds a FIXED order per lens**, chosen by what is most on the mind at that stage
of life. It does not re-sort as balances move: a person who learns where a row sits finds it in the
same place next month. (Ranking by size or by impact was considered and rejected for exactly that
reason — rows changing position between visits, with the person having done nothing.)

| Still working | Drawing down |
|---|---|
| 1. When to claim Social Security *(60+)* | 1. When to claim Social Security *(only if not yet claiming)* |
| 2. Pay off the mortgage early | 2. Can I spend more? |
| 3. Is converting to a Roth worth it? | 3. Which account do I draw from first? |
| | 4. Pay off the mortgage early |
| | 5. Is converting to a Roth worth it? |

*The placement of Social Security at the top of both columns, and the mortgage row appearing for
retirees at all, are my reading rather than the founder's words — flag them and he will confirm or
move them. Everything else in this table is his.*

**3. A row only takes a position if it applies** (rule above). The numbering is the order among those
present, never a fixed slot with a gap in it.

Each row carries **what it is worth** — a dollar figure, a date, or a points figure — never a bare
topic. (See §6 for what the engine can actually produce.)

**THE RULE FOR EVERY DECISION ROW (founder, 2026-08-12): a row answers in place unless the decision
needs more than one thing set.** A single comparison or a single amount belongs in the row. An
amount *and* a rate, or a list with reasons, earns a screen. Settled row by row:

| Row | Where it goes |
|---|---|
| Pay off the mortgage early | **In place**, with a live control |
| When to claim Social Security (60+) | **In place** — it states the answer |
| Can I spend more? *(retiree)* | **In place**, with a live control |
| Have you taken your required withdrawal? *(73+)* | **In place** — confirm without leaving; a quiet link opens the year-by-year table |
| Which account do I draw from first? *(retiree)* | **Its own screen** — the order, why each account sits where it does, what each choice costs in tax, and the steering control. Today this row drops the person on the whole Cash flow tab and leaves them to find it. |
| Is converting to a Roth worth it? | **The existing Roth screen.** Set the amount to convert this year, see the tax cost now at an editable rate, the two later effects (smaller required withdrawals, a bigger tax-free bucket) and the effect on the odds, ending at the shared "Use as my plan" step. **Built and working — do not redesign it.** The row carries $420,000 pre-tax as its worth. |

**The mortgage row: a live control, and it commits.** The row is not a fact to read, it is a thing to
do. A stepper for the extra monthly payment; the payoff date and the interest saved move as it
changes; committing makes that payment part of the plan, so it appears in Cash flow as real money
going out.

**It must show BOTH sides.** Money paid into a mortgage is money not invested, and *"saves $143,300 in
interest"* on its own always reads as an obvious win. At a mortgage rate near the assumed investment
return it is close to a wash. On $412,000 at 5.5%, paying $2,400 a month:

> **Pay off the mortgage early** — $412,000 at 5.5%
> **Extra each month  [−]  $500  [+]**
> Clears **Nov 2045** instead of Oct 2054 — nine years sooner — and saves **$143,300** in interest.
> That is $500 a month not going into savings. Your odds go from **48%** to **43%**.
> **[ Use as my plan ]**

**Read §6.1 before drawing that odds line.** It is not a penalty we apply to the odds — it is what the
odds come out as once the money is modelled honestly. The distinction matters and the founder was
explicit about it.

**Paying it off in full: the app never moves money.** If someone chooses to clear the mortgage
outright, that cash has to come from somewhere real, and we do not guess which account or pretend a
transfer happened. Say what will happen instead: *once you have paid it, we will pick it up from your
connected bank or from a statement you upload — then mark the mortgage paid off here.* Marking it paid
updates net worth everywhere, from that one act. Design that as a stated outcome, not a form asking
which account to debit.

**The Social Security row answers itself in place.** Founder ruling, 2026-08-12: it must not send the
person to another screen to find out what waiting is worth. The row says the answer:

> **When to claim Social Security** — *waiting from 67 to 70 pays **$624 more a month**: $3,224
> against $2,600*

**Use 67 and 70, never 72.** The delayed credit is 8% a year and it **stops at 70** — waiting past 70
adds nothing at all. A row offering 72 would imply money that does not exist, and the engine already
caps at 70, so the figure would silently be the age-70 one wearing a wrong label. The three ages that
mean something are 62 (earliest), 67 (full) and 70 (last credit).

### 3.4 "Next decision" — the dated card

An amber card naming the one dated thing in front of them.

**Founder ruling: the Social Security claim window is NOT a next decision for someone in their 50s** —
it has moved into the decisions list above, at 60+. What remains for this card is genuinely dated
obligations, chiefly the required withdrawal from 73 onward.

Which means **for most people under 73 this card will not appear at all.** That is correct behaviour
under the standing rule — *dated when real, absent when nothing is due* — and you should not invent a
filler decision to keep it on screen. But it does raise a question worth answering in your design:
**is a card that only appears after 73 still worth having as its own element, or should a dated
obligation simply be the first row of the decisions list, wearing a date?** Draw whichever you
believe, and say why.

### 3.5 The retiree variant

Someone already drawing down has no "reach a target". For them:

- Left dial: **the odds**, unchanged.
- Right dial: **their monthly paycheck** — guaranteed income plus the draw from savings — in place of
  the target dial. Founder-confirmed.
- The glance loses rows 2 and 5 (they are already retired; there is no target to reach) and its
  spending row becomes what they spend now.
- Their decisions: *Can I spend more? · Which account do I draw from first? · Have you taken your
  required withdrawal? · Is converting to a Roth worth it?* — same "only when it applies" rule, same
  in-place-or-screen split as the table in §3.3.

**"Can I spend more?" answers in place, with a control.** Today this row opens a general what-if
screen, and for June — who is at 100% — it says *"+0 points"*, offering a decision that changes
nothing. Instead:

> **Can I spend more?**
> **Estimated amount you can draw more every month: $2,555**
> Spend extra  **[−]  $500  [+]** → $6,100 a month in total.
> **[ Use as my plan ]**

**The wording "estimated amount you can draw more every month" is the founder's and is not to be
softened or shortened.** See §7 on the words that are forbidden here.

**No new engine for this.** The app already finds this number: it tries an amount, runs the 400
futures with that amount coming out each year, and works up to the largest amount that still holds
the line. That is precisely how the retiree's monthly draw figure is produced today — this row is
that same number minus what they already spend.

**The line it holds is the person's, not ours.** Founder ruling, 2026-08-12: the odds floor is a
setting they control, **defaulting to 80%** because that is the line the engine already holds. It is
one setting used everywhere the app answers a how-much question, so two screens can never hold
different lines. Show which line is in force wherever a number depends on it, and make it changeable
without hunting:

> Estimated amount you can draw more every month: **$2,555**
> *held at odds of 80%* **[ change ]**

---

## 4. The two people, with numbers that add up

Use these exact figures. They reconcile; please keep them reconciling.

### Pat — 58, working, married, one child

| | |
|---|---|
| Age / retire at / plan to | 58 / 65 / 90 |
| Spending in retirement | $5,200 a month |
| **What counts toward retirement** | **$909,152** |
| — Vanguard Brokerage | $355,152 |
| — Fidelity Traditional IRA | $420,000 |
| — Vanguard Roth IRA | $96,000 |
| — Ally Savings | $38,000 |
| Home (does **not** count) | $620,000 |
| **Target nest egg (Pat typed it)** | **$2,000,000** |
| Assets vs target | **45%** · short **$1,090,848** |
| **Odds** | **48%** of lasting to 90 · range 18–78% |
| Big one-time cost | Roof, 2028 — $18,000 |
| Mortgage | $412,000 at 5.5% |
| Pre-tax money (for the Roth row) | $420,000 |

*If you need it: what Pat is on track to have at 65 is $1,346,763. It is not in the hero. Use it only
if a state genuinely needs it, and label it as a projection.*

### June — 72, retired

**Corrected 2026-08-13** — the first version of this brief gave June a paycheck and no portfolio, so
the v3 handoff borrowed Pat's account total for her. Every figure below is now run against the real
engine and pinned by `src/__tests__/june_numbers_probe.test.ts`.

| | |
|---|---|
| Age / plan to | 72 / 94 |
| — Fidelity Traditional IRA | $420,000 |
| — Schwab Brokerage | $448,000 |
| — Ally Savings | $117,000 |
| **What counts toward retirement** | **$985,000** |
| Social Security | $2,600 a month |
| Pension | $1,400 a month |
| **= Guaranteed** | **$4,000** |
| Draw from savings *(the most she could take, engine at the 80% floor)* | **$4,155** |
| **Paycheck** | **$8,155 a month** |
| Spending | $5,600 a month — so she draws **$1,600**, which is **1.95%** |
| Headroom — *"estimated amount you can draw more every month"* | **$2,555** |
| **Odds** at what she actually spends | **100%** of lasting to 94 |
| Required withdrawal at 73 | $420,000 ÷ 26.5 = **~$15,849** |

**$4,155 is capacity, not her withdrawal.** She draws $1,600. Those are different questions and the
screen is right to carry both — but do not describe $4,155 as what she takes out, and do not compute
a withdrawal rate from it. Her rate is 1.95%.

**Her pre-tax balance is $420,000 on purpose**, so the required-withdrawal figure and the Roth row are
true for her rather than borrowed from Pat. *(It is a coincidence that Pat's Traditional IRA is the
same size. If that reads confusingly in a side-by-side, say so and I will move one of them.)*

---

## 5. Every state you need to draw

1. **Pat, everything answered** — glance collapsed (the default) *and* a second frame with it open.
2. **June, retired** — the paycheck variant, glance collapsed and open.
3. **One answer missing** — age absent. The odds cannot be computed at all without it. Everything
   else has a default or is derived. Show what is missing and how to fix it, without pretending.
4. **Day one, nothing answered** — no accounts, no answers. **Never show $0 as if it were a fact.**
   The current build prints "$0" for what counts and for big costs, which reads as "you have nothing"
   rather than "you haven't told us yet". A locked sample gauge is allowed if it is labelled a
   sample — the app's own sample is *84% odds of lasting to age 90*, never a new invented figure.
5. **The odds are bad** — the honest state. When saving alone cannot reach a reasonable outcome, the
   screen must say so plainly and pivot to what actually moves the number (retire later, spend less,
   claim later). **It must never promise options and then show none** — that happens in the current
   build.
6. **Already past their own target** — added 2026-08-13 (audit D4), and not drawn in the v3 handoff.
   This is not a rare case: it happens the moment someone types a modest number. If Pat typed
   $800,000, today's $909,152 is **114% of target** while the odds sit at **45%** — a dial pegged past
   full beside a number under half.

   That is not a contradiction and must not be drawn as one. They are two honest answers to two
   different questions: *am I hitting my own number* and *will the money last*. Decide and show us:
   does the dial cap at 100% or overfill? What replaces the shortfall line — "more than you need,
   by $109,152"? And what does the closing sentence say when there is nothing to close but the odds
   are still poor? The honest answer there is that saving more is no longer the lever, so it should
   point at what is.

   Draw the mirror case too, briefly: **on target, poor odds.** Measured on Pat — a $1,500,000 target
   is reached by saving $24,000 a year, and the odds at that point are **64%**. Someone can hit their
   number exactly and still not be at 80%. The screen must be able to say both without either one
   looking like an error.

   **No "try all three together" link.** Founder ruling, 2026-08-13. The v3 handoff ends the bad-odds
   frame with *"Try all three together — one sandbox ›"*, pointing at the what-if sandbox that was
   folded into this tab on 2026-08-12 — the steppers **are** the sandbox now. So the link has no
   destination, on the screen where the person is already in the most trouble. It was never built;
   it exists only in the drawing. **Drop it.** Each option is tappable on its own.

   **But the idea behind it is worth keeping, done properly.** "What if I did two or three of these
   at once?" is a real question, and today the screen can only answer part of it: retiring later and
   spending less are steppers, while claiming Social Security at 70 is not. A link that half-delivers
   on the worst screen in the app is worse than one fewer option — so if you want to offer combined
   changes, design it so it can honour all three, and say what it needs.

---

## 6. What the engine can and cannot do

Design to this or the numbers will not exist.

### 6.1 THE ODDS ARE AN OUTPUT. We never reach in and change them.

**Founder ruling, 2026-08-12 — read this before designing anything that shows an odds figure:**

> *"Instead of artificially changing odds — let's look to get the numbers right. Odds are output and
> we should not modify it."*

There is no such thing in this app as "the mortgage penalty on your odds" or "the effect of X on your
odds" applied as an adjustment. There is only: **model the person's actual money honestly, run it,
and report what comes out.** If paying $500 a month extra on a mortgage lowers the odds, that is
because $500 a month genuinely stopped going into savings — not because we subtracted five points.

Practically, this means the mortgage row's *"48% → 43%"* line is produced by running the plan twice —
once as it stands, once with the money moved — and printing both results. Never by a formula that
adjusts a percentage. Anywhere you show an odds figure changing, it must be a second honest run.

**The odds** are 400 seeded market simulations of that person's own plan: grow what they have to
retirement with a random return each year, subtract big one-time costs in their year, then from
retirement draw their spending (raised by inflation) less their guaranteed income, apply the tax on
legally forced withdrawals from 73, and ask at the plan-to age — did the money last? 48% means 192 of
400 futures made it. The range is the same 400 runs re-done with the average return two points lower
and two points higher.

**Critical consequence: the target does not affect the odds.** Typing $2M instead of $5M does not
move the odds by a point — nothing about naming a target changes whether money survives being spent.
The two dials are two honest, *independent* facts: *am I hitting my own number* and *will this
actually work*. Do not draw anything that implies one drives the other, and do not put a shared
progress track behind them.

**The app can compute:**
- the odds, and the range
- a **suggested** target — the pot that would put the odds at 80% — offered when the person leaves
  the target blank. It is a suggestion, never the headline.
- the yearly saving needed to reach a given number
- the points a single change is worth (retire two years later, spend $400 less, claim at 70) by
  re-running the simulation with that one change
- what is projected to be left at any age
- the draw from savings and the retirement paycheck
- **the Social Security check at any claim age**, from the person's own statement amount, on the
  Social Security Administration's published schedule: claiming early costs about 6.67% a year for
  the first three years then 5% a year; waiting past full retirement age adds 8% a year, **and stops
  at 70**. Worked example on a $2,600 statement: **$1,820 at 62 · $2,600 at 67 · $3,224 at 70.** So
  the inline sentence in §3.3 is real arithmetic, not an estimate — and it is why the row must never
  offer an age above 70.

**The app cannot compute today:**
- goals (helping a child, a wedding) as an input to the odds — not wired

**The app CAN compute, but only after engine work the founder has approved:**

**The yearly saving that reaches a TYPED target** (§3.1's closing sentence). What exists today solves
for the saving that reaches 80% *odds* — a different question. The new one solves for the saving whose
projection reaches *their number*, by search rather than by formula, rounded up. Small piece of work,
and it must carry the same pin as D1/D2: the figure has to actually land at or above the target, and
one step lower has to miss.

**The odds effect of paying a mortgage down faster.** The founder ruled on 2026-08-12 that the
mortgage row must show it (the "48% → 43%" line above). It does not exist yet, and it is not a small
wire-up — **the retirement simulation currently has no concept of debt at all.** Not one mention, in
either the simulation or the layer that feeds it. Three things have to be built before that line is
true:

1. **The extra payment has to be stored.** Today it is an unsaved text box on the Cash flow Debts
   tab: type a number, see a payoff date, leave the screen, it is gone. It never becomes part of the
   plan.
2. **Contributions have to become a schedule rather than one flat number.** Paying $500 a month extra
   means $6,000 a year less going into savings while the mortgage runs — and the whole payment
   freeing up once it clears. The simulation takes a single annual contribution figure.
3. **The simulation has to know a payment ends.**

**Point 3 is a defect that already exists, independent of this row.** The app asks what someone will
spend each month in retirement and then charges that figure, raised by inflation, for every year of
the plan. If the person included their mortgage in that figure — and most people with a mortgage
would — the app keeps charging it long after the house is paid off. Pat's mortgage clears in 2054 and
Pat's plan runs to 2058: four years of a payment that will not exist. **Today's odds are pessimistic
for anyone whose mortgage ends inside their plan**, and no screen says so.

**The founder's fix, and it is a design element you must draw.** When a debt runs past the retirement
date, do not leave it buried inside one flat spending figure — **say it out loud, on its own line,
auto-filled from the debt and editable:**

> **Mortgage payment** — $2,400 a month **until 2054** *(from your mortgage — change it if that is
> wrong)*

The date comes from the loan's own arithmetic. The person can correct either number. The simulation
then charges it until that year and stops, which is what makes the odds right — no special-casing,
no adjustment, just the money modelled as it actually behaves (§6.1).

This belongs with the spending row in the glance (§3.2, row 4), and it applies to any debt that
outlives the retirement date, not only a mortgage.

---

## 7. Rules that cannot bend

- **Colours and type come from the app's tokens.** Deep green `#085041` for section bands with white
  caps; `#178F6B` primary; amber `#854F0B` on `#FAEEDA`; text `#1A1A18` / `#6B6B66` / `#76766F`;
  background `#F6F7F5`; cards white. Type scale: **11 / 13 / 15 / 17 / 20 / 24 / 30 / 38** — nothing
  in between, nothing smaller than 11.
- **44pt minimum for anything tappable.**
- **Colour is never the only carrier of meaning** — this audience includes red-green colour blindness.
- **Every number on a screen shares one right edge**, including totals that ride a section band.
- **Money is one size** on a given screen so digits line up.
- **No fake zeros and no dead ends.** An empty state is an on-ramp, never a brochure paragraph about
  what the screen will one day do.
- **Balances can be hidden.** Every dollar figure must survive being replaced by dots.
- **Say "says who?"** — where a number came from is part of the design, not a footnote we add later.

### 7.2 Label the numbers. Do not footnote the screen.

**Founder finding, 2026-08-12** (and my omission — this should have been in the first v3): the built
screen ends with *"Estimates from ~400 market simulations of your own numbers — not advice."* He
rejected it, and he is right. It sits at the foot of the whole page, so it claims **everything above
it** came from 400 simulations. On June's screen most of it did not:

- Her Social Security is $2,600 **because she told us $2,600.**
- Her pension is $1,400 **because she told us.**
- Her target nest egg is a number **she typed.**
- Only the odds and the maximum draw come out of the simulation.

A blanket footnote labels a person's own reported facts as model output. There is a second problem
under it: June is at **100%**, and a footnote whispering "estimates" invites *"so it might not be
100%?"* while never answering — the range that would answer it is not on her screen.

**So: no page-level disclaimer. Put the note where the number is.**

> *(under the odds)* The odds come from about 400 runs of your own numbers through different markets.
>
> *(under the paycheck)* Your Social Security and pension as you gave them. The draw is what those
> same runs say you could take without running short.

**And never let a disclaimer share a line with an action.** The v3 handoff put *"Have you taken it
yet? Confirm ›"* and the 400-simulations sentence on one line. A legal note and a button are not the
same kind of thing and must not sit together.

### 7.1 The word "safe" is banned on anything to do with money

**Founder ruling, 2026-08-12:** *"we should never call anything safe — as we don't know. Always ensure
legally we are not saying anything binding."*

We are not licensed advisers and every number on this surface is an estimate from a simulation. A
label that calls an amount *safe* reads as a guarantee, and we cannot make one. This is a legal
position, not a style preference — there is no exception for a number that "obviously" holds.

The replacements, founder-chosen:

| Was | Is |
|---|---|
| Safe to spend | **Left to spend** |
| Safe draw from savings | **Draw from savings** |
| within the safe range | **within the ~4% guideline** |
| Your safety net | **Your cushion** |
| a safe pace | *(rewrite — name the pace, do not grade it)* |
| Spent $X of $Y safe this month | *(rewrite against "left to spend")* |

**Scope, measured:** 29 user-visible occurrences across 14 files — Home, Cash flow, Plan, the paycheck
card, month detail, paycheck months, the retirement cockpit, the draw-steering sheet, tips, and the
glossary. *"Safe to spend"* is a headline label on Cash flow, not a footnote. This sweeps as one
change or not at all; a Plan-tab-only fix would leave three screens contradicting each other.

Not in scope: uses with nothing to do with money — *"your data is safe"*, *"I've saved my recovery
code somewhere safe"*. Those stay.

**Applies to your copy too.** Nothing you write for this redesign may describe an amount as safe,
secure, guaranteed, protected, or risk-free.

---

## 8. What went wrong last round — please don't hand these back

An audit of the built v2 screen against the v2 handoff found these. They are ours, not yours, but
they show where this surface breaks:

- **Two measures of the same thing, side by side, that disagree.** The v2 design had a progress dial
  beside an odds dial with a shared "target" language, and the built version turned it into three
  dollar rows. Either way a person saw "you're most of the way there" beside "probably not". The
  fix in v3 is that the two dials now measure genuinely different questions — keep them visually
  independent so nobody tries to reconcile them.
- **Seven filled green bands in one scroll.** The v2 design had two heading levels — a quiet
  deep-green label and a filled band. The build flattened both into filled bands and the page became
  a stripe. **Give us an explicit, minimal heading hierarchy** and say which level each heading is.
- **Rows that promised a worth and shipped without one** — "Convert to a Roth" with no dollars.
  If a row carries a figure in your design, say where that figure comes from (§6).
- **A section that warned about big one-time costs and gave no way to add one.**
- **An empty state that printed $0 twice.**

---

## 9. Deliverables

1. **`Plan.dc.html`** — the states in §5, both people, phone width 390. Full screen top to bottom:
   status bar, header, everything, tab bar. No cropped cards.
2. **A short requirements note** — the heading hierarchy you chose, the collapsed/expanded behaviour
   of the glance, and for every number on screen, which of §6 it comes from.
3. **The collapsed glance is the one to get right.** It is the default state — what a person sees
   every single time they open the tab. What does it say when it is closed? A summary line? Nothing?
   That single decision is most of the "too much information" problem.

---

## 10. Open questions — flag your assumption, the founder will rule

1. **"Extra saving each month" is not in the founder's list of seven.** Today it is a stepper on the
   Plan tab and it is the one control that visibly moves the odds ("what if I put $500 more away?").
   Dropping it removes the only place a person can try a change. Draw it as an eighth row, or as
   something else entirely, or leave it out — but say which you chose and why.
2. **Saved facts versus drafts.** Today, age and spending save the moment they change, while retire
   age and plan-to age stay a draft until "Use as my plan" is tapped. Now that all seven sit in one
   glance, does that split still make sense, or does everything save immediately? A person editing
   seven rows in a collapsed panel and then hunting for a commit button is a worse experience than
   simply letting the number above them move.
3. **What the suggested target looks like.** When someone leaves the target blank, we can offer the
   80%-odds figure. Where does that offer live, and how do we make it obvious it is ours and not
   theirs?
