# Home surface — redesign brief v1

**For:** Claude Design
**Date:** 2026-08-13
**Companion:** `PLAN-REDESIGN-BRIEF-v3-2026-08-12.md` — the Plan tab is being redrawn in parallel.
Read §7 of that brief (the rules) as if it were repeated here; it is not repeated, and it binds.

---

## 1. The product, in two sentences

MoneyKeel is a retirement-planning app for people roughly **55 to 70** — most within ten years of
retiring, or already retired. The promise is *"We lay it out. You decide."*: we never advise, we show
honest numbers and let the person choose.

Larger type, high contrast, no jargon, no invented numbers, no dead ends. Assume presbyopia and a
person who does not use financial software daily, and who will read every number and ask "says who?".

---

## 2. What Home is for, and the one thing to protect

**Home is the two-second glance.** A person opens the app, and before they have decided to do
anything, they should know whether they are alright. Everything else on the screen is secondary to
that first moment.

The redesign must not turn it into a dashboard. If it grows into a wall of cards, it has failed even
if every card is good.

---

## 3. What Home shows TODAY — measured, not remembered

Dumped from the running screen, in render order. This is the ground truth to design against.

### Pat — 58, still working

```
Good afternoon Pat

YOUR INVESTMENTS  ⓘ                    $775,152
change shows once your holdings have prices
as of Aug 14                           See your growth ›

Net worth  ⓘ                         $1,021,152  ›

CHIEF OF STAFF — WHAT NEEDS YOU (3)
 1 ◆  Your retirement plan needs attention
      Only a 40% chance it lasts — adjust savings, age, or spending…  ›
 2 ·  Room left in your 401(k)
      You can still contribute $32,500 this year — tax-advantaged.    ›
 3 ·  Concentrated in one account
      $420,000 (52%) of your invested money sits in a single account… ›

WILL MY MONEY LAST?
40% odds of lasting to age 90 — estimate  ⓘ      See the full picture ›

THIS MONTH'S CASH FLOW              ✓ On pace
0% spent · day 14 of 31
Income $8,800 · Spent so far $0 · Left $8,800

Estimates for guidance only — not financial, investment, or tax advice…
```

### June — 72, retired

Same structure, but the hero is replaced by her paycheck:

```
SAFE TO SPEND — AUG                      $8,155  this month · estimate
   Social Security  $2,600 · Pension $1,400
   = Guaranteed  ⓘ $4,000
   + Safe draw from savings ⓘ $4,155
   This year ~$97,860 estimate — varies month to month
   Heads-up: this draw is above what your own numbers support long-term
   See August's paycheck →
```

…then Net worth, Chief of staff, Will my money last, This month's cash flow, disclaimer.

### First day — thirteen lines

```
Welcome
Let's get your real numbers in.
  Connect your first account ›   Takes about 2 minutes. Read-only…
  Import a file from your brokerage ›   The CSV export…
  Add something by hand ›   Your home, savings, or an account with no login.
  Or answer guided setup questions ›
WHAT YOU'LL SEE HERE
 · Your whole money picture in one place
 · What needs your attention — with dollar amounts
 · Whether your money will last — as honest odds
```

---

## 4. What changes, and why

### 4.1 Insights and Sharpen belong on Home (founder ruling, 2026-08-13)

Neither is reachable from Home today. **Insights** — the app's ranked "here is what to look at" — can
only be found by opening the ☰ menu. **Sharpen your plan** — what your plan is still missing — sits
one tab away, on Plan.

**But read §3 again before drawing a link.** Home already carries *"CHIEF OF STAFF — WHAT NEEDS YOU
(3)"*, which is three ranked insight cards, and June's third card literally reads *"One thing would
sharpen every number."* So the content is partly here already, in embedded form, under a different
name.

**The question to solve is not "where do two links go".** It is: *given that Home already shows the
top three things needing attention, what is the relationship between that block and the fuller
Insights screen behind it — and where does "what's missing from your plan" sit without becoming a
fourth competing list?* A link that duplicates the block above it is worse than no link.

### 4.2 The banned word is on this screen

**"SAFE TO SPEND"** is June's hero. **"Safe draw from savings"** is a line inside it.

Founder ruling, 2026-08-12: *"we should never call anything safe — as we don't know. Always ensure
legally we are not saying anything binding."* This is a legal position, not a style preference. The
approved replacements: **Safe to spend → Left to spend · Safe draw from savings → Draw from
savings.** Nothing you write may describe an amount as safe, secure, guaranteed, protected or
risk-free.

### 4.3 Two numbers on June's screen argue with each other

Her hero says **$8,155 safe to spend**, and four lines later: *"this draw is above what your own
numbers support long-term — the pace itself is the risk."*

Both are true and they use different standards — the draw is solved to hold 80% odds, while the
warning measures it against the 4%-a-year guideline (hers is 5.1%). But a person reads a number
presented as spendable, then a warning that it is too much, and cannot tell which to believe. **Make
the screen say one thing.**

### 4.4 The disclaimer is a page-level footnote

*"Estimates for guidance only…"* sits at the foot of everything, so it claims the whole screen is an
estimate — including June's Social Security, which is $2,600 because she told us $2,600.

Founder ruling (Plan brief §7.2): **label the numbers, do not footnote the screen.** The simulation
note goes where the simulated number is; a reported fact says it came from the person. And **a
disclaimer never shares a line with an action.**

---

## 5. States to draw

1. **Pat, working, everything answered** — the case in §3.
2. **June, retired** — the paycheck hero, with the wording fixed and §4.3 resolved.
3. **First day, nothing answered** — the thirteen lines above. Keep the three doors and the honest
   "what you'll see here"; it must never show a fake number or a zero dressed as a fact.
4. **Part-way** — some accounts linked, the plan incomplete. This is the state most real people are
   in and it is the one nobody has drawn.

---

## 6. What the numbers are, and where they come from

- **The odds** (40%, 100%) — 400 simulations of that person's own plan. The one number every screen
  must state identically; Home, Net worth and Plan share a single wording helper by founder ruling.
- **Net worth · investments** — measured balances, not projections.
- **The paycheck** — guaranteed income (what they told us) plus a draw solved to hold the odds at a
  floor the person sets, defaulting to 80%.
- **The three cards** — a ranked insight engine reading their own numbers.
- **Cash flow** — this month's dated income and spending.

**Balances can be hidden.** Every dollar figure must survive being replaced by dots. The odds
percentage is not a dollar figure and stays visible — but a percentage *derived* from dollars is a
different question, and this screen has several. Say what you assume.

---

## 7. Deliverables

1. **`Home.dc.html`** — the four states in §5, phone width 390, full screen top to bottom: status
   bar, header, every section, tab bar. No cropped cards.
2. **A short requirements note** — and for every number on screen, which source in §6 it comes from.
3. **Say what you removed.** Home is the two-second glance and it currently runs to 49 lines for Pat
   and 65 for June. If the redesign only adds, it has made the problem worse.

---

## 8. Open questions — flag your assumption, the founder rules

1. **How do the Chief-of-Staff block and the Insights screen relate?** Same content at two depths?
   The block as a teaser with a "see all" link? Or does one of them stop existing?
2. **Where does "Sharpen your plan" live** without becoming a fourth list on a screen that already
   has three ranked cards?
3. **June's hero.** Is the headline number what she *can* draw, what she *does* draw, or her total
   paycheck? Today it is the maximum, which is what triggers §4.3.
