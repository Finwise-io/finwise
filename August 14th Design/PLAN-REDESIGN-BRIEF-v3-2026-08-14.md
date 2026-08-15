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

### 3.0 THE PLAN TAB HAS THREE SUB-TABS — added 2026-08-14

The founder reorganised the surface after the brief first went out. **Plan keeps its name** and
gains three sub-tabs. Everything else in this brief describes **Retire**, which is the first of them
and the only one being redesigned in this pass.

| Sub-tab | What lives there |
|---|---|
| **Retire** | The whole of this brief — the two dials, the glance, the decisions. Plus the retirement cockpit, will-it-last, Social Security timing, Roth conversion, required withdrawals, big costs, **"What if I save more?"** (moved in from the Performance tab, where it has always sat despite being a retirement question) and **contribution room** (which today appears only if an insight fires). |
| **Goals** | Everything else a person saves for: goals, the college planner, and **"Can I afford it all?"** promoted to its front door. |
| **Prepare** | Getting your affairs in order: the insurance check, estate & legacy, the tax organiser, **build credit** (founder added it 2026-08-14, reversing the August menu trim for this audience), the **stress test** (folded in — it is an emergency-cash question, not a retirement one) and the **job safety check**. |

### 3.0.1 GOALS AND PREPARE NEED LANDING SCREENS — founder finding, 2026-08-14

*"No design created for Goals and Prepare tabs."* **Correct, and it is my instruction that caused it,
not an oversight on your side.** §3.0 said Retire was *"the only one being redesigned in this pass"*,
which was a reasonable thing to write and the wrong thing to write: **you cannot ship a three-tab bar
where two of the tabs open onto nothing designed.** A person tapping Prepare on day one must land
somewhere deliberate.

**This is a genuine expansion of the ask, so scope it honestly rather than absorbing it.** You are not
redesigning the screens underneath — those exist and work. **You are designing two landing views**,
each a short list that says what lives there and what state it is in. If that is more than this pass
can hold, say so and we will split it; do not quietly return one tab drawn and two empty.

**Goals — what a person is saving for, other than retiring.**

> Rows: their goals, each with its target, what is behind it, and whether it is on track · **"Can I
> afford it all?"** promoted to the front door, because with more than one goal that is the real
> question · the college planner.
>
> **Empty state matters more here than anywhere.** Most people arrive with no goals set. It is an
> on-ramp — *"Nothing here yet. A goal is anything you're putting money aside for: a car, a wedding,
> helping a grandchild."* — never a paragraph about what the screen will one day do (§7).

**Prepare — getting your affairs in order.**

> Rows: the insurance check · estate and legacy · the tax organiser · build credit · the stress test
> · the job-safety check.
>
> **These are mostly things a person does once**, so the useful state is *done or not done* rather
> than a number. A row that says **"not started"** or **"done — March 2026"** tells someone where to
> spend ten minutes. A row that just says "Estate" tells them nothing.
>
> **Prepare is largely a name for something that already exists.** The Goals screen quietly links
> credit, college, estate, insurance and the tax organiser today. This is naming an accidental hub,
> not inventing information architecture — so the bar for "does this landing view earn its place" is
> that it should be easier to use than the pile it replaces.

**Both are lopsided against Retire on purpose.** Retire is the whole redesign; these two are gathered
existing work. **Do not pad them for symmetry** — three honest rows beat six with three invented.

**One question back to us, and flag your assumption:** does either tab need its own heading, or does
the sub-tab bar name it well enough? Retire carries a hero; these two may want nothing above the
first row.

---

**⚠️ DRAW THE SUB-TAB BAR ON EVERY FRAME.** The v3 handoff contains no sub-tabs at all — the words
"Goals" and "Prepare" do not appear anywhere in it. **That is not a miss on your side: this section
was written after you had already drawn**, so the instruction did not exist when you worked. It does
now.

The bar is **chrome, not content** — it sits under the Plan header on every single Retire frame in
§5, including the day-one and age-missing states, with **Retire** selected. Without it, the person has
no way to reach Goals or Prepare, and every frame in this brief silently claims Plan has one screen.
You are still only designing **Retire**; the other two are existing screens gathered under honest
names. Draw the bar, select the first tab, and leave the other two as labels.

**Two more things to know when drawing it.**

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

> **Saving $84,500 a year to 65 projects to about $2,021,000 — just past your $2,000,000 target.** ⓘ

**⚠️ THE FIRST DRAFT OF THIS SENTENCE FAILED ON A FOUNDER READING IT, AND IT WILL FAIL ON USERS THE
SAME WAY.** It read *"Saving $84,500 a year over your 7 years to 65 reaches your target."* Sitting
directly under *"short $1,090,848"*, it invites one obvious piece of arithmetic — $84,500 × 7 =
$591,500 — which is barely half the gap. The founder did exactly that and asked how the number could
possibly be right.

**The number is right. The sentence was wrong.** Measured on the engine:

| Where the $1,090,848 actually closes from | |
|---|---|
| Money he puts in — $84,500 × 7 | **$591,500** |
| Growth on the $909,152 he already has | **$414,605** |
| Growth on the new money as it goes in | **$106,257** |
| **Projects to** | **$2,021,514** |

**Nearly half the gap is closed by growth, and the sentence never mentioned that growth exists.**

**The root cause is structural, not wording, so please design around it rather than patching the
copy.** The hero states *today's* money against a *future* target, and the line beneath offers a
*yearly* amount. That is three different points in time in two lines, and nothing on screen tells the
reader they are not meant to reconcile by subtraction. Any sentence that pairs a total gap with a
per-year figure will be subtracted — treat that as a certainty, not a risk.

**What the sentence must now do — and this is the rule, the exact words are yours:**

1. **Name the projection, not the promise.** "Projects to about $2,021,000", never "reaches your
   target". We are running 400 simulations of an uncertain future; a sentence that guarantees an
   outcome is both untrue and something we will not say. *(This is the same standing rule that banned
   the word "safe" — see §7.1.)*
2. **Say that growth does roughly half the work, on the screen, not only in a tooltip.** A person who
   subtracts and finds a mismatch does not conclude "ah, compounding" — they conclude the app cannot
   add up, on the one screen where trust is the whole product.
3. **Put the full arithmetic one tap away.** Suggested content for the ⓘ, adjust the wording freely:
   > *Why $84,500 a year and not $155,000?* Your $1,090,848 gap does not close from saving alone.
   > Over 7 years you would put in $591,500. The rest — about $521,000 — is growth: roughly $415,000
   > on the $909,152 you already have, and roughly $106,000 on the new money as you add it. That
   > assumes 5.5% a year, which is an estimate, not a promise — the odds dial above is where the
   > range of real outcomes lives.

   *($155,000 is $1,090,848 ÷ 7 — the number the subtraction produces. Opening with the reader's own
   wrong answer is the fastest way to resolve it.)*

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

**When the glance opens, the dials STAY — smaller, but present.** Founder ruling, 2026-08-14.

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

1. **Convert to a Roth**
2. **When to claim Social Security — between 60 and 70, and only if they have not claimed**

> **The mortgage row has MOVED OFF this tab — founder ruling, 2026-08-14:** *"let's move Pay off the
> mortgage early to Cash flow · Debt. It does not belong under Retire."* He is right: it is a debt
> decision a person makes about a debt, and it was only ever here because its side-effect lands on
> retirement. See **§3.3.1** for where it goes and what has to travel with it.

**Shown only when they apply.** No mortgage on file → no mortgage row. No pre-tax money → no Roth
row (there is nothing to convert, so the question is meaningless). Under 60 → no Social Security row.
Under 73 → no required-withdrawal row. Already claiming → the Social Security question is removed
entirely, not answered with a dead end. Nothing applies → the whole section stands down rather than
offering someone a decision they cannot make. **Absent, never greyed out and never "no mortgage on
file".** Draw the row pattern so a further decision can slot in later without a redesign.

**Expect a very short list — shorter since the mortgage row moved off this tab on 2026-08-14.** Pat,
58 with a mortgage and pre-tax savings, now sees **one** row: *Is converting to a Roth worth it?* June,
72 and already claiming, sees **three**. Ray, 64, sees **two**. Design for **one to three** rows and
draw the one-row state properly — it is Pat's, and Pat is the persona this brief opens with.

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
| 2. Is converting to a Roth worth it? | 2. Can I spend more? |
| | 3. Which account do I draw from first? |
| | 4. Is converting to a Roth worth it? |

*(The mortgage row was 2nd and 4th here until 2026-08-14; it now lives on Cash flow · Debt — §3.3.1.
The placement of Social Security at the top of both columns is my reading rather than the founder's
words — flag it and he will confirm or move it.)*

**⚠️ THIS LEAVES PAT WITH ONE ROW, AND THAT IS THE HONEST OUTCOME — DO NOT PAD IT.** He is 58, so the
Social Security row does not reach him for two years, and the mortgage has gone. His decisions section
holds **one** row: *Is converting to a Roth worth it?* A section with one true row is better than a
section with two where one is filler, and the empty-looking result is real information — at 58 with a
mortgage and a plan on track, there genuinely is not much to decide this month. **Draw that state**;
do not invent a third row to balance the block.

**3. A row only takes a position if it applies** (rule above). The numbering is the order among those
present, never a fixed slot with a gap in it.

Each row carries **what it is worth** — a dollar figure, a date, or a points figure — never a bare
topic. (See §6 for what the engine can actually produce.)

**THE RULE FOR EVERY DECISION ROW (founder, 2026-08-12): a row answers in place unless the decision
needs more than one thing set.** A single comparison or a single amount belongs in the row. An
amount *and* a rate, or a list with reasons, earns a screen. Settled row by row:

| Row | Where it goes |
|---|---|
| ~~Pay off the mortgage early~~ | **MOVED to Cash flow · Debt**, 2026-08-14 — §3.3.1 |
| When to claim Social Security (60+) | **In place** — it states the answer |
| Can I spend more? *(retiree)* | **In place**, with a live control |
| Have you taken your required withdrawal? *(73+)* | **In place** — confirm without leaving; a quiet link opens the year-by-year table |
| Which account do I draw from first? *(retiree)* | **Its own screen** — the order, why each account sits where it does, what each choice costs in tax, and the steering control. Today this row drops the person on the whole Cash flow tab and leaves them to find it. |
| Is converting to a Roth worth it? | **The existing Roth screen.** Set the amount to convert this year, see the tax cost now at an editable rate, the two later effects (smaller required withdrawals, a bigger tax-free bucket) and the effect on the odds, ending at the shared "Use as my plan" step. **Built and working — do not redesign it.** The row carries $420,000 pre-tax as its worth. |

### 3.3.1 THE MORTGAGE DECISION LIVES ON CASH FLOW · DEBT — founder ruling, 2026-08-14

*"Let's move Pay off the mortgage early to Cash flow · Debt. It does not belong under Retire."*

**Everything specified below still stands — it is the same control, drawn in a different place.** It
was on the Retire tab only because its side-effect lands on retirement, which is a reason to *carry
the consequence*, not a reason to put a debt decision on a retirement screen. A person thinking about
their mortgage goes looking for their mortgage.

**⚠️ THE RETIREMENT CONSEQUENCE MOVES WITH IT — THIS IS THE WHOLE RISK OF THIS CHANGE.** Paying a
mortgage down faster is money not going into savings, and that is the single most important thing to
know before doing it. If the control moves to Debt and the retirement effect stays behind on Retire,
the person makes the decision blind to its biggest consequence — which is worse than where we started.
**The line comes too**, in the count grammar of §3.5.1:

> **Pay off the mortgage early** — $412,000 at 5.5%
> **Extra each month  [−]  $500  [+]**
> Clears **Nov 2045** instead of Oct 2054 — nine years sooner — and saves **$143,300** in interest.
> That is $500 a month not going into savings, so retirement gets tighter: your money lasts in about
> **5 futures out of 10** today, and about **4 out of 10** if you do this.
> **[ Use as my plan ]**

**It must show BOTH sides.** *"Saves $143,300 in interest"* on its own always reads as an obvious win,
and the retirement line above is what stops the screen selling one side of a trade.

#### The rate comparison — founder ruling, 2026-08-14

*"One critical factor is whether the current mortgage rate is higher or lower than the return on
investment or the 10-year yield. If a person pays off the mortgage versus keeping money in a 10-year
Treasury — what would be the net saving or cost?"*

**This is the question the decision actually turns on, and the screen has never asked it.** Paying a
mortgage down is a **guaranteed** return equal to the mortgage rate. So the fair comparison is against
another guaranteed thing — a Treasury — not against shares. Compare it to shares and you are weighing
a certainty against a hope, which is how people talk themselves into the wrong answer.

**Both numbers are live in the app.** The mortgage rate sits on the debt record; the ten-year Treasury
yield comes from the Federal Reserve series the app already fetches. *(That feed was found dead on
2026-08-14 — the old endpoint 404s and the app had been quietly serving a 4.35% fallback while the
real yield was 4.63%. Fixed the same day. If it ever falls back again the app knows, and a fallback
must be labelled here, because this is the one screen where a stale rate changes an answer.)*

**Pat's numbers, computed and reconciling** — his $412,000 at 5.5%, $500 a month extra:

| | |
|---|---|
| His mortgage costs | **5.50%** |
| A ten-year Treasury pays | **4.63%** |
| **The gap** | **0.87 points** — about **$3,584 a year** on today's balance |
| Same $500/mo into Treasuries instead, to the original payoff date | $346,678 |
| Paying the mortgage down, then investing everything it frees up | **$383,255** |
| **Paying it down leaves him ahead by** | **$36,577** |

*Both routes cost him exactly $2,900 a month and finish on the same date — that is what makes it a
fair comparison rather than a flattering one.*

**THE EXACT TEXT, BOTH DIRECTIONS.** Same sentence shape either way — only the direction words and
the figures change, so nobody can tell from the layout which answer they are getting.

**When the mortgage rate is ABOVE the yield** *(Pat — 5.5% against 4.63%)*:

> **Your mortgage costs 5.5%. A ten-year Treasury pays 4.63% today.**
> So a dollar into your mortgage **saves you more** than the same dollar would earn sitting in
> Treasuries — about **$3,584 a year** at your balance. Over the life of the loan, paying the extra
> $500 a month leaves you around **$36,577 better off** than putting it in Treasuries instead.
> *Shares might earn more than either — or less. Paying the mortgage is the only one that is certain.*

**When the mortgage rate is BELOW the yield** *(a 2021 loan — 3.1% against 4.63%)*:

> **Your mortgage costs 3.1%. A ten-year Treasury pays 4.63% today.**
> So a dollar into your mortgage **saves you less** than the same dollar would earn sitting in
> Treasuries — about **$6,304 a year** at your balance. Over the life of the loan, paying the extra
> $500 a month leaves you around **$40,217 worse off** than putting it in Treasuries instead.
> *Shares might earn more than either — or less. Paying the mortgage is the only one that is certain.*

**Read those two side by side: the second number is bigger.** Someone holding a cheap 2021 loan loses
more by paying it down early than Pat gains by paying his down — and "pay off your mortgage" is the
most repeated piece of advice this audience has ever been given. **This is the state that earns the
feature.** If you draw only the first frame, we have built something that agrees with received wisdom
and stays quiet when it is wrong.

**When the two rates are within about a quarter-point of each other, say that instead of picking a
winner:** *"Your mortgage costs 4.5%. A ten-year Treasury pays 4.63% today. They are close enough that
neither choice is clearly better — this one comes down to whether you would rather owe less or hold
more."* A dollar figure implying precision we do not have is worse than no dollar figure.

**Three things this must never do.**

**Never tell them what to do.** State both rates, state the difference in dollars, stop. We are not
advisers and this is not advice — §7.1 is the standing rule and it applies with force here.

**Never hide it when the answer flips.** If the mortgage rate is *below* the Treasury yield — which is
true of anyone still holding a 2021 loan at 3% — the same sentence must say so just as plainly:
*"Your mortgage costs 3.1%. A ten-year Treasury pays 4.63%. Paying it down early costs you about $X a
year compared with keeping the money in Treasuries."* A comparison that only ever supports paying down
is not a comparison. **Draw both directions**, and treat the below-the-yield frame as a required state.

**Never quietly do the tax.** Treasury interest is taxed federally, and mortgage interest is only
deductible for someone who itemises — which, since 2018, most of this audience does not. Both effects
push the same way, so the honest note is directional, not a calculation: *"Tax usually widens this
gap rather than closing it, but it depends on your return."* Do not print a number we cannot stand
behind for an individual.

**Read §6.1 before drawing that consequence.** It is not a penalty we apply to the odds — it is what
the odds come out as once the money is modelled honestly. The founder was explicit about that.

**The control commits.** A stepper for the extra monthly payment; the payoff date and interest saved
move as it changes; committing makes that payment part of the plan, so it shows in Cash flow as real
money going out — which is now the same tab it lives on.

**Paying it off in full: the app never moves money.** If someone chooses to clear the mortgage
outright, that cash has to come from somewhere real, and we do not guess which account or pretend a
transfer happened. Say what will happen instead: *once you have paid it, we will pick it up from your
connected bank or from a statement you upload — then mark the mortgage paid off here.* Marking it paid
updates net worth everywhere, from that one act. Design that as a stated outcome, not a form asking
which account to debit.

**Two things to confirm when you draw it**, and say which you chose: whether the Debt section shows
this control on the mortgage row itself or as a section beneath the debt list; and whether Retire
keeps a quiet pointer to it — *"paying your mortgage down changes this · see Debt ›"* — or says
nothing. My view is a pointer earns its place, because someone reading their odds on Retire has no
other way to learn that the biggest lever is on another tab. Your call.

---

**The Social Security row answers itself in place.** Founder ruling, 2026-08-12: it must not send the
person to another screen to find out what waiting is worth. The row says the answer:

> **When to claim Social Security** — *waiting from 67 to 70 pays **$624 more a month**: $3,224
> against $2,600*

**The window is 60 to 70** (founder, 2026-08-14). Before 60 it is not a decision, it is trivia. After
70 the delayed credit has stopped accruing, so waiting buys nothing and there is nothing left to
choose. 67 was considered as the upper bound and rejected: between 67 and 70 waiting is worth 8% a
year, which is the most valuable this decision ever gets — and the row only ever shows to someone who
has NOT claimed, so a 68-year-old seeing it genuinely still has the choice open.

**A THIRD PERSON, so the row can actually be drawn.** Pat is 58 and June is 72 and already claiming —
between them, neither ever triggers this row, so the v3 handoff drew it nowhere. That was my gap in
the brief, not the designer's. Draw it against:

> **Ray — 64, still working part-time, has not claimed.** Statement amount $2,600 a month at 67.
> His row: *waiting from 67 to 70 pays $624 more a month: $3,224 against $2,600.*

Ray is worth having for more than this row: the brief has a 58-year-old and a 72-year-old, and the
audience is 55 to 70. **The middle was missing** — and the middle is where the biggest decisions
actually get made.

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

**FOUNDER APPROVED 2026-08-14** — mock `spend-more-plain-english-v1-2026-08-14.html`, frames B and C.
He read the earlier version and said it was *"too complex for a user to understand, particularly
someone with no finance background."* Draw it like this:

> **Can I spend more?**
>
> ### Yes — about $1,000 a month more, and nothing changes.
> You spend **$5,600** a month now. At **$6,600** your money still lasts past 94, exactly as it does
> today.
>
> Spend extra **[−]  $0  [+]**
> You'd spend **$5,600** a month — the same as now.
> > ✓ Your money lasts past 94, in every future we tested.
>
> **[ Use as my plan ]**
> *Your Social Security and pension don't change, so anything extra comes out of savings.*

**Three things make this work, and all three are load-bearing.**

**The answer comes first, and it is free money.** Her first $1,000 a month costs her nothing — that
is the engine's own curve, not a rounding. It was the single most useful fact on the row and the old
static "80%" label sat directly on top of it. Lead with it.

**Consequence is stated as a count, never a percentage.** At the maximum the sentence reads *"Your
money lasts in about 4 futures out of 5. In the other 1, it runs out before 94."* Counts land with
people who bounce off percentages, and naming the losing case is kinder than leaving her to imagine
it. The full set, and these are the engine's numbers:

| Spend extra | A month in total | What the screen says |
|---|---|---|
| **$0** | $5,600 | ✓ Your money lasts past 94, in every future we tested. |
| $500 | $6,100 | ✓ Still lasts past 94 — nothing changes. |
| $1,000 | $6,600 | ✓ Still lasts past 94 — nothing changes. |
| $1,500 | $7,100 | Lasts in almost every future — about 97 out of 100. |
| $2,000 | $7,600 | Lasts in about 9 futures out of 10. |
| $2,555 | $8,155 | ⚠ Lasts in about 4 futures out of 5. In the other 1, it runs out before 94. |

**The draw-and-spend link is said once, or she has to infer it.** *"Your Social Security and pension
don't change, so anything extra comes out of savings."*

**These words are gone from this row: draw · odds · held at · floor.** *"Estimated amount you can draw
more every month"* was the founder's own line and an earlier version of this brief said it must not be
softened. **He withdrew that on 2026-08-14 by approving frames B and C, which do not contain it.**
The words that stay are the ones she uses in conversation: spend, month, lasts, runs out.

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

**⚠️ "HELD AT ODDS OF 80%" BELONGS ON THE $2,555 AND NOWHERE ELSE.** The v3 handoff moved it onto the
running total — *"→ $5,600 a month in total · held at odds of 80%"* — and there it is simply false.
The founder read that line and asked what the $5,600 meant. Two separate defects sit in it:

**1. At the starting position the odds shown are wrong, and contradict the dial above them.** The
phrase explains how $2,555 was *calculated* — it is the largest extra draw that still holds an 80%
floor. It is not a property of whatever the stepper currently reads. Measured on the engine, June's
odds across the whole range of that control are:

| Spend extra | A month in total | Draw from savings | **Her odds** |
|---|---|---|---|
| **$0** *(the default)* | $5,600 | $1,600 | **100%** |
| $500 | $6,100 | $2,100 | **100%** |
| $1,000 | $6,600 | $2,600 | **100%** |
| $1,500 | $7,100 | $3,100 | **97%** |
| $2,000 | $7,600 | $3,600 | **90%** |
| $2,555 *(the maximum)* | $8,155 | $4,155 | **80%** |

Only the last row is 80%. At the default the screen would print **80% directly beneath a dial reading
100%**, for the identical plan — which reads as a broken app, not a nuance.

**The odds beside the running total must be live and must be an output** — §6.1, no exceptions. And
notice what the real curve gives us for free: **her first $1,000 a month costs her nothing at all.**
That is a far better answer to "can I spend more?" than a static 80%, and it is true.

**2. At $0 extra, "$5,600 a month in total" is not a result — it is what she already spends, and
nothing says so.** An arrow into an unchanged number reads as the outcome of a decision she has not
made. Name it. At zero the line should say something like *"your $5,600 a month today"*; it becomes a
"→ … in total" only once the stepper has moved.

**And say the draw-and-spend link once, plainly.** The row above talks about what she can **draw**;
the control talks about what she can **spend**. For June those move together one-for-one, because her
guaranteed $4,000 does not change — every extra dollar spent is an extra dollar drawn. Obvious to us,
invisible to her. One sentence fixes it: *"Your Social Security and pension don't change, so anything
extra comes out of savings."*

---

### 3.5.1 THE COUNT RULE — it applies to every row, not just this one

**Founder-approved 2026-08-14, and it generalises.** Wherever a decision row states what a choice does
to the chance a plan works, **say it as a count out of a round number, not as a percentage** — and
where the news is bad, name what happens in the losing case rather than leaving it to be imagined.

This is not a style note. Our audience is 55 to 70 with no assumed finance background, and a bare
"48%" leaves two questions unanswered: a percentage *of what*, and is that good?

**Apply it to the mortgage row too** (now on Cash flow · Debt, §3.3.1), which used to end *"Your odds go from 48% to 43%"*:

> Clears **Nov 2045** instead of Oct 2054 — nine years sooner — and saves **$143,300** in interest.
> That is $500 a month not going into savings, so your retirement gets tighter: your money lasts in
> about **5 futures out of 10** today, and about **4 out of 10** if you do this.

Same facts, same honesty, no percentage to decode — and it now says *which way is worse*, which the
percentages never did.

**The Social Security row already passes** — *"waiting from 67 to 70 pays $624 more a month: $3,224
against $2,600"* is dollars, months and ages, with nothing to translate. Use it as the benchmark for
the others.

**One word still to fix: "pre-tax".** The Roth row reads *"$420,000 pre-tax"*. Flag what you would put
there instead — *"$420,000 you haven't paid tax on yet"* is longer but needs no glossary. Your call,
but do not leave it as it is.

---

## 4. The three people, with numbers that add up

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

> ### ⚠️ PAT'S 48% IS NOT REPRODUCIBLE FROM PAT'S OWN NUMBERS — founder decision needed
>
> **Found 2026-08-14 while answering "how do we stop errors shipping as instructions".** Every figure
> in June's and Ray's tables is computed from the engine and pinned by a test. **Pat's never were** —
> and he is the persona this brief opens with.
>
> Run his four accounts through the app's own blended-return calculation and they produce **8.65%**.
> At 8.65%, the engine gives Pat **82% odds**, not 48%. The 48% only appears at a **5.5%** return —
> an assumption that **appears nowhere in this brief**, in his table or anywhere else.
>
> So one of three things is true, and only the founder can say which:
>
> 1. **Pat's accounts are wrong for the story** — he is meant to be someone in trouble, and four
>    growth-heavy accounts are not that. Change the holdings, keep 48%.
> 2. **48% is wrong** — he is genuinely at 82%, and most of the states in §5 do not apply to him.
> 3. **There is a return assumption we intend and never wrote down** — in which case write it into his
>    table, where every other input of his already sits.
>
> **Do not resolve this by picking one.** Until it is settled, treat Pat's odds as **provisional**:
> draw the frames, use 48% as drawn, and expect the number to move. Every *shape* in this brief is
> unaffected — the two dials disagreeing, the count sentences, the decision rows — because those are
> about how the screen behaves, not about which value it holds.
>
> **The wider point, and it is the reason this box exists:** three errors were caught in this brief
> in one day, and all three were numbers or claims nobody had checked against the engine. The fix is
> not more care. It is `src/__tests__/brief_figures_guard.test.ts`, which now recomputes every
> persona figure and fails the build when the brief and the engine disagree.

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


### Ray — 64, working part-time, has not claimed Social Security

**Added 2026-08-14.** He exists because the founder ruled the Social Security decision belongs to
ages **60 to 70**, and neither other persona can show it: Pat is 58 and June is 72 and already
drawing. That is why the last handoff drew that row nowhere. He also fills the hole in the middle of
a 55-to-70 audience. Every figure below is run against the real engine and pinned by
`src/__tests__/ray_numbers_probe.test.ts`.

| | |
|---|---|
| Age / retire at / plan to | 64 / 67 / 92 |
| — Vanguard 401(k) *(pre-tax)* | $310,000 |
| — Roth IRA | $95,000 |
| — Savings | $95,000 |
| **What counts toward retirement** | **$500,000** |
| **The target he typed** | **$750,000** — so the dial reads **67%**, short **$250,000** |
| Still putting away | $500 a month |
| Spending | $4,800 a month |
| Social Security statement | **$2,600 a month at 67** — not yet claimed |
| Mortgage | none, paid off |

**His Social Security numbers, which are the point of him:**

| Claim at | Monthly | Total by 90 | His odds |
|---|---|---|---|
| 62 | $1,820 | $611,520 | — |
| **67** | **$2,600** | $717,600 | **73%** |
| **70** | **$3,224** *(+$624 a month)* | $773,760 | **80%** |

**One decision moves him seven points, from below the mark to exactly on it.** No extra saving, no
later retirement, no spending cut — he simply waits three years to claim. This is the single best
argument on the whole surface for why "Decisions you can make today" is a section and not a footnote,
and it is why the row must be drawn.

**He is also the clearest proof of the two-dial rule in §3.1** — his target dial reads **67%** while
his odds read **73%**, two different true statements about one person.

> **⚠️ WHAT FOLLOWS IS ANALYSIS FOR YOU. NONE OF IT IS COPY.** An earlier draft of this paragraph said
> he *"will never reach the target"* and that his *"odds are fine anyway"*. The founder read it as
> screen text and called it **too harsh** — and he was right twice over, because the second half was
> also wrong. Neither sentence may appear in front of Ray, and nothing in his tone may either.

**The arithmetic, for you:** three more years at $500 a month is $18,000 against a $250,000 gap, so
saving is not the lever here. **And 73% is below the 80% mark the app holds everywhere** — so "his
plan works anyway" was not a kind framing of a hard truth, it was simply not true. He is short of the
number he picked *and* below the line. Writing round that with reassurance would be the worse failure.

**But the honest reading of Ray is not bleak, which is the point of him.** One decision he can make
today closes it completely: waiting to claim at 70 instead of 67 takes him from **73% to 80%** — from
about **7 futures in 10 to 8 in 10** — with no extra saving, no later retirement and no spending cut.
The gap is real and the answer is one row down the screen.

**So what he actually sees is a statement of position followed by a door**, never a verdict:

> **$500,000 of the $750,000 you set** — short $250,000.
> Your money lasts in about **7 futures out of 10**. Waiting to claim Social Security at 70 takes that
> to about **8 in 10** — the biggest single change available to you. **See what waiting is worth ›**

**Three rules this frame must hold, and they apply to anyone short of their target:**

1. **Never tell someone they will not get there.** It is a projection, not a prophecy, and it is a
   sentence nobody should read about their own retirement on a Tuesday morning.
2. **Never soften a number that is below the line.** 73% is below 80% and the screen says so plainly.
   Comfort that costs accuracy is the one thing this audience cannot afford from us.
3. **Never state a shortfall without the nearest thing they can do about it.** A gap on its own is an
   accusation; a gap with a door beside it is a plan.

**Draw him in the working lens**, with the decision list: *When should I claim Social Security?* ·
*Is converting to a Roth worth it?* (he has $310,000 pre-tax) · *When can I retire?* — and **no
mortgage row**, because he has no mortgage. That absence is deliberate: it shows the list responds to
the person rather than printing a fixed menu.

---

## 5. Every state you need to draw

1. **Pat, everything answered** — glance collapsed (the default) *and* a second frame with it open.
2. **June, retired** — the paycheck variant, glance collapsed and open.
3. **One answer missing** — age absent. The odds cannot be computed at all without it. Everything
   else has a default or is derived. Show what is missing and how to fix it, without pretending.

   **The decisions list does NOT disappear** (founder ruling, 2026-08-14). The v3 handoff ends this
   state with *"Decisions are hidden until your odds can be computed."* That is wrong, and the
   founder's own list is the proof: **paying off the mortgage early needs a mortgage, not an age.
   Converting to a Roth needs pre-tax money, not an age.** Both work perfectly well for someone who
   has linked their accounts and skipped one question — and hiding them leaves an empty section where
   two actionable things belong, against this app's own rule that an empty state is an on-ramp.

   The rows that genuinely need an age already remove themselves: Social Security is gated to 60-70,
   the required withdrawal to 73+. So **show whatever applies and let the rest stay away on its own.**

   Keep one thing from the handoff's instinct: **"When can I retire? 🔒"** is right to be locked,
   because that one truly cannot be answered without an age. A lock explains itself; an empty section
   does not.

   *(The designer's counter-argument was fair and is recorded: without odds, a decision can only say
   what it is worth in dollars and years, not in points. But the points figure is not wired yet for
   either row, so nothing is actually lost today — and dollars and years are the honest half.)*
4. **Day one, nothing answered** — no accounts, no answers. **Never show $0 as if it were a fact.**
   The current build prints "$0" for what counts and for big costs, which reads as "you have nothing"
   rather than "you haven't told us yet". A locked sample gauge is allowed if it is labelled a
   sample — the app's own sample is *84% odds of lasting to age 90*, never a new invented figure.

   **⚠️ TWO FOUNDER FINDINGS ON THIS FRAME, 2026-08-14 — both must be fixed.**

   **(a) "Answer the first question ›" does not say which question.** The founder read it and asked:
   *which one?* A button that names no action is a button a person has to press to find out what it
   does, on the very first screen they ever see. **Name it: "Add your age ›".**

   You already do this correctly one frame earlier — the age-missing state reads *"Can't compute your
   odds without your age. **Add your age ›**"*, which is exactly right. Day one just did not inherit
   it. **The shipped app is also ahead of the mock here**: it names the specific missing thing
   ("Add what you spend"), so as drawn this is a step backwards from live behaviour. Whatever is
   genuinely first, say it — and if the answer changes as they progress, the button changes with it.

   **(b) The glance shows three questions on day one and seven everywhere else.** Day one lists *How
   old are you? · What will you spend each month? · What counts toward retirement?* The age-missing
   frame, one across, lists all seven. **Show all seven, always.** Three reasons, and the third is the
   one that matters:

   - A person cannot see what the app is going to ask, so they cannot tell how big the job is.
   - The layout changes shape between states, so what they learn on day one is not where things are
     on day two. §3.3 already fixed row positions for exactly this reason.
   - **Four of the hidden rows are not blank — they are OURS.** With nothing answered the app still
     assumes retire at **65**, plan to **90**, a **6%** return and a **2.5%** inflation rate, and the
     sample gauge above is computed with them. Hiding those rows hides the assumptions the number on
     screen is standing on. That is §7.2 — *label the numbers, do not footnote the screen* — and it is
     the strongest argument here by some distance.

   So day one reads: three rows saying **Add ›** or **Link ›**, and four saying **65 · ours until you
   change it**, **90 · ours**, and so on — a quiet tag, not an empty row. The person sees the whole
   shape of what they are being asked, and sees which parts we have filled in on their behalf.
5. **The odds are bad** — the honest state. When saving alone cannot reach a reasonable outcome, the
   screen must say so plainly and pivot to what actually moves the number (retire later, spend less,
   claim later). **It must never promise options and then show none** — that happens in the current
   build.
6. **Already past their own target — and its mirror, on target with poor odds.** These are the two
   hardest states on the surface, and the founder's note on 2026-08-14 is the instruction that
   matters: **"this is assuming the user knows what these odds mean and how to use it — which is not
   the case 99% of the time."** Every word below is written to that.

   **First, what the odds ARE has to be said on the screen, not in a glossary.** This is where a
   person meets a percentage that contradicts something else they can see, and if they do not know
   what it counts, they cannot resolve it. One line, under the number, always:

   > *We play out your retirement 400 times with different market luck. This counts how many of them
   > your money lasted through.*

   **STATE 6 — past their own number, odds still poor.** It happens the moment someone types a modest
   figure. Pat typed **$800,000**; he has **$909,152**, so the target dial reads **114%** while his
   odds read **48%** — a dial pegged past full beside a number under half.

   > **You've passed the $800,000 you set.** You have $909,152 — $109,152 more.
   >
   > **But at $5,200 a month, your money still runs out before 90 in about half the futures we tested.**
   >
   > Your target was your guess at how much you'd need. This is the check on whether it is actually
   > enough — and it isn't yet.
   >
   > Putting more away still moves it a long way: another **$24,000 a year** takes you from about
   > **5 futures in 10 to about 6 in 10**. Retiring later or spending less move it too.

   **⚠️ TWO CORRECTIONS TO THIS BRIEF, FOUND WHILE REWRITING IT — do not use the earlier version.**

   **The odds here are 48%, not 45%.** An earlier draft of this state said 45%. That is Pat's
   *assets-versus-target* figure against a $2,000,000 target — the other dial. Typing a different
   target cannot move the odds by a point (§6.1), so his odds in this state are the same 48% they are
   everywhere else. **On the one state that exists to stop two numbers being confused, the brief
   confused them.**

   **"Saving is no longer the lever" was wrong, and I have removed it.** The earlier draft told you to
   write that. Measured: Pat saving nothing sits at **45%**; at $24,000 a year he is at **64%**; at
   $84,500 a year he is at **90%**. Saving is a very large lever indeed. What is true is narrower —
   he is past his *target*, so the "save this much to reach your number" sentence has nothing left to
   close. That is a sentence losing its job, not a lever disappearing, and telling someone their
   savings no longer matter would have been both false and discouraging.

   **THE MIRROR — on target, and the odds still are not there.** Pat with a **$1,500,000** target:
   saving **$24,000 a year** projects to **$1,506,263**, which reaches it, and the odds at that point
   are **64%**. *(Verified on the engine.)*

   > **You'll reach the $1,500,000 you set** — saving $24,000 a year gets you there by 65.
   >
   > **Even then, your money runs out before 90 in about 4 futures out of 10.**
   >
   > Hitting your own number and the money lasting are two different things. Your number is what you
   > aimed at; this is what happens when you actually spend it. To have both, the number has to be
   > higher — or the spending lower.

   **Neither state is an error and neither may be drawn as one.** Two honest answers to two different
   questions: *am I hitting my own number* and *will the money last*. Decide and show us: does the
   target dial cap at 100% or overfill? What replaces the shortfall line — *"more than you need, by
   $109,152"*? **Do not add a warning icon, a red tint, or any treatment that reads as "something has
   gone wrong here."** Nothing has.

   **No "try all three together" link.** Founder ruling, 2026-08-14. The v3 handoff ends the bad-odds
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

  **The dials under hide-balances.** Founder ruling, 2026-08-14, in his words:
  **"hide the number, keep the shape."**

  The **odds** stay fully visible — "48% odds of lasting to age 90" is not money and
  gives nothing away. On the **target dial the numeral is dotted and the arc still fills** to where it
  would.

  *Recorded because it should be visible later: I recommended hiding the target dial outright, on the
  grounds that its percentage is built entirely from two dollar figures and the arc conveys the same
  ratio the numeral does — so the shape leaks what the dots hide. The founder chose to keep the
  shape. Design it knowing the arc is doing the talking.*

  **A refinement worth proposing rather than assuming:** if the arc is the only thing left, it does
  not have to be precise. Filling to a coarse band — roughly a third, roughly half — reads as "about
  this far along" while giving a shoulder-surfer far less than a needle at exactly 45%. If you think
  that is right, draw it and say so; if you think precision matters more, say that instead.
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

**DONE in the app on 2026-08-14** — 34 user-visible replacements across 16 files, and a build-failing
guard now stops the word returning in any rendered string. You do not need to sweep anything; you need
to not reintroduce it. *("Safe to spend" was the retiree headline on Cash flow, so this was a headline
change, not a footnote one.)*

Not in scope: uses with nothing to do with money — *"your data is safe"*, *"I've saved my recovery
code somewhere safe"*. Those stay.

**Applies to your copy too.** Nothing you write for this redesign may describe an amount as safe,
secure, guaranteed, protected, or risk-free.

---

## 8. What went wrong last round — please don't hand these back

> **Read `HANDOFF-REVIEW-Plan-v3-2026-08-13.md` in this folder alongside this brief.** It is the review of
> the v3 handoff you sent, checked line by line against the files now saved in
> `Claude-Design-handoff-received-2026-08-13/ (beside this file)`. Most of the
> brief landed and the structure is right; the review is the delta, not a re-brief. **Eight things
> block a build and four numbers on screen are not true.** The one to start with:
>
> **All six gauge needles point at the wrong number.** Measured from your file: needles at 56%, 97%,
> 65% and 5% beneath printed values of 48%, 100%, 84% and 12%. The arcs behind them are correct
> (45.2% and 13.3% on the target dials), so it is the pointer alone. Your own note says the value is
> carried by *"needle position and numeral both"* — that is the colourblind-safety argument for
> having a gauge at all, so a lying needle fails exactly the people it was shaped for. **Give us the
> angle formula rather than placed coordinates**, and the whole class stops recurring.
>
> Two of the review's items are **mine, not yours**, and are marked as such in it: the footer sentence
> the founder rejected was never written into this brief, and June had no figures of her own so your
> file understandably borrowed Pat's. Both are fixed here — see §4, which now has three people.

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

1. **`Plan.dc.html`** — the states in §5, **all three people** (§4 gained Ray on 2026-08-14 — he is
   the only one who can show the Social Security row, and the only one whose two dials openly
   disagree), phone width 390. Full screen top to bottom: status bar, header, everything, tab bar.
   No cropped cards.
2. **`Goals.dc.html` and `Prepare.dc.html`** — or two more frames in the same file, whichever suits
   you. The landing view of each, in a populated state AND an empty one (§3.0.1). Added 2026-08-14
   after the founder pointed out that a three-tab bar with two undesigned tabs is not a design.
3. **A short requirements note** — the heading hierarchy you chose, the collapsed/expanded behaviour
   of the glance, and for every number on screen, which of §6 it comes from.
4. **The collapsed glance is the one to get right.** It is the default state — what a person sees
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
