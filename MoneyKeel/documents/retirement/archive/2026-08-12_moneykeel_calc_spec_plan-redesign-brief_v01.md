# Design brief — the Plan surface

**App:** MoneyKeel · iOS (iPhone), one-handed use
**Surface:** the Plan tab and the twelve screens it opens
**Date:** 2026-08-12 · v1

---

## 0 · What I need from you

Redesign the Plan surface. You are designing **screens and flow — not the math.** Every number
below is already computed by the app from the person's own accounts; the design decides what is
shown, in what order, in whose words. Never invent a metric, a chart the data can't fill, or a
number the app does not already produce.

Read §6 before you draw anything: it is the honest list of what is wrong today, and it is the
actual assignment.

**Deliver back** — see §9 for the full list — full-screen designs (status bar to tab bar, never a
cropped card), in **every data state**, for **both people** in §5.

---

## 1 · The app in one page

**Who this is for.** People aged roughly 55 to 70 with real money and no adviser: a few hundred
thousand to a few million, spread across a brokerage, an old 401(k), an IRA, some cash, a house.
Not traders. Not spreadsheet people. They have spent thirty years accumulating and have never once
been told plainly whether it is enough.

**What the app promises.** *"We lay it out. You decide."* It never advises, never sells, never
nags. It shows you your own numbers, honestly, including when they are bad.

**Five tabs:** Home · Net worth · Performance · Cash flow · **Plan**

- **Home** — what needs you today.
- **Net worth** — what you own and owe, one flat ledger.
- **Performance** — how the investments are doing versus a benchmark.
- **Cash flow** — money in, money out, month by month.
- **Plan** — *will this money last, and what should I do about it?* ← **you are designing this**

**The one-brain rule.** Every surface reads the same engines. If the Plan tab says the odds are
60%, Home says 60% and Net worth says 60%, because all three call one function. Your design must
never require a number that only exists on one screen.

---

## 2 · The design language, already approved — this holds

The Net worth tab was redesigned to a language the founder approved and shipped. Plan must look
like it came from the same hand. Non-negotiable:

**Structure**
- A **flat continuous ledger**, not a deck of floating cards. Sections are separated by full-width
  **dark-green banners with square corners** (never rounded), title left in white caps, the section
  total right in white.
- **One shared right edge.** Every number on a screen — row values and section totals alike —
  ends on the same vertical line. This was a real bug once (band totals sat 8pt right of row
  values); it is now pinned by a test. Do not break it.
- **Biggest first.** Lists order by size, not alphabetically, not by an internal category order.

**Type and money**
- Money is **one size (15pt), tabular figures**, totals bold. Never mix sizes in a money column.
- **Dollar-first.** A dollar amount before the adjective describing it: "$1,483,000 — comfortable",
  never "you're comfortable, with $1.48M".
- **Nothing below 10.5pt.** There is a test that fails the build for smaller text.

**Words**
- **Plain English, no jargon, no acronyms.** Not "SS" — "Social Security". Not "RMD" — "the
  withdrawal the law requires from 73". Not "Monte Carlo" without explaining it in the same breath.
- **First person.** Section and row titles are the person's own question: "When can I retire?",
  "Can I afford it?", "Will my money last?" — not "Retirement readiness", not "Scenario modeling".
- **One wording, everywhere.** The odds are always said exactly this way, on every screen:
  `<word> — xx% odds of lasting to age abc` (e.g. *"Uncertain — 60% odds of lasting to age 92"*).
  Three screens once had three phrasings. It is now one shared sentence. Any new screen you design
  uses that sentence verbatim.

**Honesty**
- Never show a number the app cannot stand behind. If an answer is missing, say which answer, show
  a clearly-labelled **sample**, and offer the way to fix it — never a plausible-looking guess.
- Estimates are labelled "estimate". Ranges are shown, not hidden.
- **Nothing changes until the person says so.** Every sandbox is explicitly temporary and commits
  only on "Use as my plan".

**Accessibility**
- Tap targets 44pt minimum. Colour-blind-safe palettes (no red/green as the only difference).
- A **hide-balances** mode masks every figure on every screen, including what a screen reader
  speaks. Design must work with all money hidden.

---

## 3 · The Plan surface as it exists today

Everything below is dumped from the running app, in order, with real numbers, for the two people
in §5. This is ground truth, not a description of intent.

### 3.1 · The Plan tab (the hub)

**Worker, 58:**
> Plan · "We lay it out. You decide."
> **WILL MY MONEY LAST? — to 92** · *Uncertain — 60% · range 31–87% · estimate*
> "You could **retire at 65 with ~$1,483,000, lasting past 92 with ~$876,000 to spare.**
> …if you retire at **65**, and spend $5,200/mo in retirement (your planned spending — you set it).
> Change any of those below." · *What drives this? ›*
> **NEXT DECISION · A REAL DATE** — "Your Social Security claim window opens Aug 2030 (age 62). No
> deadline — each year you wait raises the check ~6–8%." · *Lay out 62 vs 67 vs 70 ›*
> **YOUR OTHER DECISIONS — RANKED FOR YOU** — four rows: *When can I retire?* · *Can I afford it?* ·
> *Is a Roth move worth it?* · *What big costs are coming?*
> *Try what-ifs — a sandbox ›* "Sliders for retire age, saving, spending. Nothing changes until you
> tap Use as my plan."
> *Sharpen your plan — 4 of 6 answered ›*
> "Estimates from ~400 market simulations of your own numbers — not advice."

**Retiree, 72:** same shape, different content —
> **IS MY MONEY LASTING? — to 94** · *Holding — 100% · range 100–100%*
> **WHERE YOUR INCOME COMES FROM — YOUR RETIREMENT PAYCHECK**: $2,600 + $1,400 = **$4,000
> guaranteed**, + **$4,155 safe draw from savings** = **$8,155/mo**, "✓ covers your $5,600/mo
> spending — you're using $1,600 of the $4,155 safe draw."
> Decisions: *Can I spend more?* · *Which account do I draw from first?* · *When should I claim
> Social Security?* · *Is a Roth move worth it?* · *What big costs are coming?*

### 3.2 · The twelve screens it opens

| Screen | What it is today | Real content (worker / retiree) |
|---|---|---|
| **Plan answers** | The three questions the odds need, all on one page, prefilled | age · monthly spending · a tappable list of every account with "counts toward retirement" ✓ or "doesn't count" · running total $909,152 · then the odds, live |
| **Will it last** | The odds explained | headline verdict · "in 60 of every 100 futures your money lasts to 92" · **WHAT DRIVES THIS**: 8 tappable driver rows (plan-to age 92 · retire age 65 · nest egg $909,152 · spending $5,200 · guaranteed income · monthly saving · growth 7.7% · inflation 3.2%) |
| **Retirement (the sandbox)** | 1,300 lines. Where you stand + sliders | "IF YOU NEVER SAVE AGAIN — retire 62" · "AT YOUR TARGET 65 — $1.53M, 60% chance it lasts to 92" · WHAT YOU HAVE ($909K split cash/investments/retirement) · **a full investments table with your-return-vs-benchmark per account** · YOUR PLAN with growth/inflation/retire-age controls |
| **Sharpen your plan** | A 6-item completeness checklist | "4 of 6 complete" · three ways to add data · six chore rows with ✓ or "Add ›" |
| **What if I save more** | Sandbox #2 | a +$500/mo stepper · your age / retire-at sliders · "$1,529,075 → $1,582,138" · "60% → 67%" |
| **Social Security timing** | 62 vs 67 vs 70, in dollars | a statement-amount field · a 3-row table (monthly + total by 92) · a live-to age stepper · claim-window date · a reminder · three "Use claim at N as my plan" buttons. **Retiree version is 6 lines: "you already receive $2,600/mo — decided."** |
| **Stress test** | A surprise expense against cash | expense chips · "✓ you could cover a $3,000 hit" · "7.3 months your cash would last" · emergency-fund verdict |
| **Multi-goal** | Sandbox #3 | "TRY THESE TOGETHER" · extra-on-debt and keep-saving steppers · "CAN YOU DO IT ALL? Short $350/mo" · effect on retirement · *Save scenario* / *Use as my plan* |
| **Big one-time costs** | A roof, a car, a wedding | empty today: "Nothing here yet — your odds currently assume no big one-time costs." |
| **Roth conversion** | Sandbox #4 | "$420,000 from your pre-tax" · $10k/$25k/$50k chips |
| **Required withdrawals** | The law's yearly withdrawal from 73 | "yours starts in 2041 (age 73) · first-year estimate ~$15,849" · a 4-item readiness checklist · a year-by-year table to age 100 |
| **Monthly income** | Social Security + pension capture | two fields; feeds the retiree paycheck |

**Also in the app but not on the Plan tab, and arguably part of planning:** Goals, Multi-goal's
"add a goal" target, Look-back, Worth a look, Insights, Tax organizer, Contribution room, Estate,
Education. Tell me if any belong here — do not assume they do.

---

## 4 · How people get here

- **Home** → a strip showing the same odds sentence → *"See the full picture ›"* → Plan tab.
- **Net worth** → a "YOUR RETIREMENT PLAN" band with the same sentence → Plan tab.
- **Home / Net worth / Plan** → when an answer is missing, all three open the **same** Plan-answers
  screen (`?focus=` opens it at the missing question), and return you where you came from. That
  sameness was a founder ruling and must survive the redesign.
- Inside Plan, every row above opens a full screen and comes back.

---

## 5 · The two people — use these exact numbers in your mocks

Mocks must add up. If a total is shown, it must equal its parts.

**Pat, 58, still working.** Salary $9,000/mo gross · spends $5,200/mo · retire at 65 · plan to 92.
Accounts: Vanguard brokerage **$355,152** · Fidelity Traditional IRA **$420,000** · Vanguard Roth
IRA **$96,000** · Ally savings **$38,000** · home **$620,000** (does not count toward retirement).
Mortgage **$210,000**. Counting toward retirement: **$909,152**. Blended growth **7.7%/yr**.
Odds today: **Uncertain — 60% odds of lasting to age 92**, range 31–87%. At 65: ~$1,483,000.

**June, 72, retired.** Spends $5,600/mo · plan to 94. Social Security $2,600/mo · pension
$1,400/mo. Same accounts. Odds: **100% odds of lasting to age 94**, ~$2,810,000 to spare. Her
paycheck: $4,000 guaranteed + $4,155 safe draw = **$8,155/mo**.

**Also design for:** a person with **no age entered** (odds cannot be computed — labelled sample
only), a person whose **only asset is the home they live in** (nothing counts toward retirement),
and a person whose odds are **bad** (e.g. 12% — the design must be able to say so without cruelty
and without hiding it).

---

## 6 · The problems to solve — this is the assignment

1. **There are four sandboxes.** What-if, Multi-goal, Roth and the Retirement screen are four
   separate places to try a change, each with its own controls and its own "Use as my plan"
   button. A person cannot try "retire two years later **and** put $500 more away **and** buy the
   roof in 2028" in one place. Should there be one sandbox? What does it look like?
2. **The hub is a shopping list of decisions.** Five ranked rows, each a door to a different
   screen. It tells you what you *could* consider, not what to do. What does one clear next step
   look like — and what happens to the other four?
3. **The Retirement screen is a second Performance tab.** It carries a full per-account
   your-return-vs-benchmark table that duplicates the Performance tab. That table probably does not
   belong in Plan at all — but decide deliberately, and say where it goes.
4. **The retiree and the worker are almost two different products.** The worker gets a projection;
   the retiree gets a paycheck. Both are right. Is there one design that holds both, or two
   deliberate variants of one design?
5. **Empty states still show the machinery.** Multi-goal with no goals still shows steppers and a
   "Short $350/mo" verdict computed from nothing. Big costs is a single empty line. Design the
   empty state as a real state, not a leftover.
6. **"Sharpen your plan — 4 of 6" is a chore list.** It reads like homework with a progress bar. It
   is really "here is what would make your answer sharper, and by how much". Can it say what each
   missing answer is *worth* — "your range is 31–87% because we're guessing at two things"?
7. **The odds are one number with no shape.** A person sees 60% and a range of 31–87%, but never
   sees the plan **over time** — no picture of the money rising, peaking, drawing down, and where
   the bad futures diverge. Is there one honest picture worth adding? (If yes it must be
   colour-blind-safe, readable at 375pt wide, and truthful about uncertainty — no single smooth
   line implying certainty.)
8. **The Required-withdrawals screen shows two different "first year" numbers** — a header saying
   ~$15,849 and a table whose first row for the same year says ~$35,383 (one is on today's
   balance, the other grown to that year). Both are defensible; together they are confusing.
9. **The Social Security screen collapses to six lines for a retiree** who has already claimed.
   Right answer, but it leaves a dead-end screen. What should be there instead?
10. **Nothing shows the plan as a whole.** There is no single view of "here is my plan: retire at
    65, spend $5,200, claim at 67, the roof in 2028" that a person could read back and confirm.
    Should there be?

---

## 7 · The facts the design must respect

Do not restate these as design copy — but never contradict them.

- The odds come from **400 simulated futures** of that person's own numbers, seeded so the same
  inputs always give the same answer. Each run walks year by year, grows savings in good years and
  shrinks them in bad, subtracts spending, and stops if the money hits zero. The percentage is how
  many of the 400 lasted.
- **Growth is per asset class**, weighted by what the person actually holds — shares 10.4%, a
  60/40 mix 7.9%, bonds and CDs 4.2%, plain savings 2.4%, a home 4.5%, and so on. The blended
  figure for both people here is **7.7%/yr**. The swing (volatility) is measured per class too —
  that is what makes the 400 runs differ.
- **What counts toward retirement:** everything the person owns **except the home they live in and
  the car they drive** — changeable per account by the person, and their choice always wins.
- **Social Security** counts from the age claimed (67 unless set otherwise), never earlier.
  **From 73** the law requires a yearly withdrawal from pre-tax accounts; tax on it is taken out.
  **Big one-time costs** hit in the year named, inflated to that year.
- **The dollar figure is the middle future** (line up all runs, take the middle one); **the odds
  count how many lasted at all.** This is why "Uncertain" can sit next to "money to spare" — both
  are true, and the design must never let one erase the other.
- Some answers may be missing. With **no age** the odds cannot be computed at all. The rule is:
  name what is missing, show a labelled sample, offer the fix.

---

## 8 · What you must not change

- **The five tabs and their names.** Plan stays a tab; it does not become a modal.
- **The calculations, the assumptions, and where data comes from.** No new inputs that would need
  data the app does not have (no bank-by-bank interest rates, no tax-lot optimisation, no live
  advice).
- **The one-wording rule** for the odds sentence (§2).
- **The shared Plan-answers screen** reached identically from Home, Net worth and Plan.
- **The commit gesture**: a sandbox changes nothing until "Use as my plan".
- Do not design anything that requires a chart library, a video, an animation-dependent meaning, or
  a colour as the sole carrier of meaning.

---

## 9 · What to deliver

For each screen: **full screen, top to bottom** — status bar, header, every section, tab bar. Both
people from §5. Every state.

**Priority 1 — the spine**
1. **The Plan tab**, worker and retiree, plus: odds-cannot-be-computed (sample) state, and a
   bad-odds state (12%).
2. **The one sandbox** — whatever replaces the four. Show it mid-change, with the before→after and
   the commit gesture.
3. **Plan answers** — all answered, one missing, nothing answered.

**Priority 2 — the doors**
4. Will it last (the drivers). 5. Social Security timing, worker **and** retiree (see problem 9).
6. Required withdrawals (see problem 8). 7. Big costs, empty and with three costs.
8. Multi-goal / trade-offs, empty and with two goals. 9. Roth. 10. Stress test.
11. Whatever "Sharpen your plan" becomes.

**With each screen, give me in words:**
- what each element is, where its number comes from, and what happens when it is tapped;
- what it shows when the data behind it is missing;
- anything you removed, and why.

**The bar:** a person who has never used the app should be able to open the Plan tab, understand
in ten seconds whether they are all right, and know the single most useful thing to do next.

---

## 10 · Three inconsistencies I already know about

Design around the correct behaviour, not the current one:

1. **Two words for one number.** The Plan hub calls a retiree at 100% *"Holding"*; the Will-it-last
   screen calls the same person at the same moment *"Likely"*. There are two word-sets in the code
   (Likely/Uncertain/Unlikely, and Holding/Watch closely/Running short for people already retired).
   Assume **one** set. Tell me which, and why.
2. **The explainer says 500 runs; the engine runs 400.** Assume **400**.
3. **The explainer says inflation 2.5%; the Will-it-last screen shows 3.2% "from economic data".**
   Assume the screen is right and the explainer is stale — the number is live, not fixed.
