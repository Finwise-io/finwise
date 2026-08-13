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
row. Under 60 → no Social Security row. Nothing applies → the whole section stands down rather than
offering someone a decision they cannot make. Draw the row pattern so a fourth decision can slot in
later without a redesign.

Each row carries **what it is worth** — a dollar figure or a points-on-the-odds figure — never a bare
topic. (See §6 for which of those the engine can actually produce today.)

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
- Right dial: **their monthly paycheck** — guaranteed income plus safe draw — in place of the target
  dial. Founder-confirmed.
- The glance loses rows 2 and 5 (they are already retired; there is no target to reach) and its
  spending row becomes what they spend now.
- Their decisions are different: *Can I spend more? · Which account do I draw from first? · Have I
  taken my required withdrawal? · Is a Roth move worth it?* — same "only when it applies" rule.

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

| | |
|---|---|
| Age / plan to | 72 / 94 |
| Social Security | $2,600 a month |
| Pension | $1,400 a month |
| **= Guaranteed** | **$4,000** |
| Safe draw from savings | $4,155 |
| **Paycheck** | **$8,155 a month** |
| Spending | $5,600 a month — using $1,600 of the $4,155 safe draw |
| **Odds** | **100%** of lasting to 94 |

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

---

## 6. What the engine can and cannot do

Design to this or the numbers will not exist.

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
- the safe draw and the retirement paycheck
- **the Social Security check at any claim age**, from the person's own statement amount, on the
  Social Security Administration's published schedule: claiming early costs about 6.67% a year for
  the first three years then 5% a year; waiting past full retirement age adds 8% a year, **and stops
  at 70**. Worked example on a $2,600 statement: **$1,820 at 62 · $2,600 at 67 · $3,224 at 70.** So
  the inline sentence in §3.3 is real arithmetic, not an estimate — and it is why the row must never
  offer an age above 70.

**The app cannot compute today:**
- goals (helping a child, a wedding) as an input to the odds — not wired
- a mortgage payoff as an input to the odds — not wired. **The "Pay off the mortgage early" row can
  carry the balance ($412,000) and the rate, but not a points figure, unless we build that first.**
  Draw it so it works either way and flag which you assumed.

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
