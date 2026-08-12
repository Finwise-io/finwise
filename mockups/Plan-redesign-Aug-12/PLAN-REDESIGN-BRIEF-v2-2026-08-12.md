# Design brief — the Plan surface

**App:** MoneyKeel · iOS (iPhone), one-handed use
**Surface:** the Plan tab and the screens it opens
**Date:** 2026-08-12 · **v2** (supersedes v1 of the same date)

**What changed since v1:** §3 is new — the founder has now settled the architecture. Two sections;
the inputs and the sandbox merge into one screen; big one-time costs move onto it; a target nest
egg and the yearly saving it needs join the outcome. Read §3 as decided, not as suggestion. The
open problems in §7 are what's left.

---

## 0 · What I need from you

Redesign the Plan surface. You are designing **screens and flow — not the math.** Every number
below is already computed by the app from the person's own accounts; the design decides what is
shown, in what order, in whose words. Never invent a metric, a chart the data can't fill, or a
number the app does not produce.

**Deliver back** — full list in §10 — full-screen designs (status bar to tab bar, never a cropped
card), in **every data state**, for **both people** in §6.

---

## 1 · The app in one page

**Who this is for.** People aged roughly 55 to 70 with real money and no adviser: a few hundred
thousand to a few million, spread across a brokerage, an old 401(k), an IRA, some cash, a house.
Not traders. Not spreadsheet people. They have spent thirty years accumulating and have never once
been told plainly whether it is enough.

**What the app promises.** *"We lay it out. You decide."* It never advises, never sells, never
nags. It shows you your own numbers, honestly, including when they are bad.

**Five tabs:** Home · Net worth · Performance · Cash flow · **Plan** ← you are designing this

**The one-brain rule.** Every surface reads the same engines. If Plan says 60%, Home says 60% and
Net worth says 60%, because all three call one function. Your design must never need a number that
exists on only one screen.

---

## 2 · The design language, already approved — this holds

The Net worth tab was redesigned to a language the founder approved and shipped. Plan must look
like it came from the same hand.

**Structure**
- A **flat continuous ledger**, not a deck of floating cards. Sections are separated by full-width
  **dark-green banners with square corners** (never rounded), title left in white caps, the section
  total right in white.
- **One shared right edge.** Every number on a screen — row values and section totals alike — ends
  on the same vertical line. This was a real bug once; it is now pinned by a test. Do not break it.
- **Biggest first.** Lists order by size, not alphabetically.

**Type and money**
- Money is **one size (15pt), tabular figures**, totals bold. Never mix sizes in a money column.
- **Dollar-first** — the amount before the adjective: "$1,483,000 — comfortable", never the reverse.
- **Nothing below 10.5pt.** A test fails the build for smaller text.

**Words**
- **Plain English, no jargon, no acronyms.** Not "SS" — "Social Security". Not "RMD" — "the
  withdrawal the law requires from 73".
- **First person.** Titles are the person's own question: "When can I retire?", "Will my money
  last?" — never "Retirement readiness" or "Scenario modeling".
- **One wording, everywhere.** The odds are always said exactly this way, on every screen:
  `<word> — xx% odds of lasting to age abc`. Use it verbatim in anything you design.

**Honesty**
- Never show a number the app cannot stand behind. If an answer is missing, say which one, show a
  clearly-labelled **sample**, and offer the fix — never a plausible-looking guess.
- Estimates are labelled. Ranges are shown, not hidden.

**Accessibility**
- 44pt tap targets. Colour-blind-safe (never colour as the only carrier of meaning).
- A **hide-balances** mode masks every figure on every screen, including what a screen reader
  speaks. Your design must work with all money hidden.

---

## 3 · The architecture — decided, not open

### 3.1 · The Plan tab is two sections

**Section 1 — Your retirement plan.** The answer, and everything that determines it, in one place.

**Section 2 — Decisions you can make today.** Only choices with a real-world action attached.

*"When can I retire?" lives in section 1, not section 2.* It is the retire-at input wearing a
question mark. Treating it as a separate "decision" is exactly why that one question currently
exists in three places.

### 3.2 · Section 1 is one merged screen

Today the plan's inputs live on one screen ("answer these three questions"), the read-only drivers
on a second, the sliders on a third, and big costs on a fourth. **They become one.** Answering and
trying-it-out were never two acts to the person — it is one act: *these are my numbers, what do
they say?*

**Everything prefilled** with a default or a calculated figure. Anything we genuinely cannot know is
**labelled as missing with a way to add it** — never left blank, never guessed.

What the merged screen carries:

| Field | Prefilled from |
|---|---|
| Your age | their answer (the only hard requirement — without it nothing computes) |
| **Retire at** | **default 65**, changeable |
| **Plan to age** | **default 90**, changeable |
| Monthly spending in retirement | **asked plainly**, prefilled from what they spend today |
| What counts toward retirement | every account, ✓ or —, running total ($909,152) |
| **Big one-time costs** | the list, with add/edit — a roof, a car, a wedding |
| Extra saving each month | a stepper, starting at $0 |

On spending, a real gap to close: nobody is currently asked what they expect to spend **in
retirement**. They are asked what they spend now, and the app quietly adjusts it using optional
onboarding answers. Then the Plan tab says "spend $5,200/mo in retirement — your planned spending,
you set it." They did not set it. Ask it, prefilled from today's number.

On big costs, say why they matter, in place: **leave them out and the plan quietly assumes the roof
never needs doing.**

### 3.3 · Facts save · choices commit

Merging creates one problem worth solving in the design: today the answers save instantly, while
the sandbox changes nothing until "Use as my plan". The rule now:

- **Facts save on the spot** — your age, what you spend, what counts, the roof in 2028. These are
  true whether or not you like them.
- **Choices are drafts until "Use as my plan"** — retire at 67, claim at 70, save $500 more. You
  are trying them on.

Make that visible: facts in the upper block, choices in the block that carries the commit button.
A person must always be able to tell which of the two they are touching, and get back to their real
plan in one tap.

### 3.4 · The outcome — two numbers, and they must never fight

The screen resolves to two figures plus one line:

> **Uncertain — 60% odds of lasting to age 90**
> **$909,152 of $1.9M** ▓▓▓▓▓▓░░░░ 48%
> *To reach 80% odds: about $38,000 a year — $3,150 a month.*

**The target is computed, not typed.** It is the nest egg that would put their odds at 80% — the
same engine solved backwards. A typed number stays available as an optional override, clearly
marked as theirs.

This matters more than it looks. Two outcome numbers measuring the same thing in different
currencies invite "which one do I believe?" — and they *will* diverge if the target is arbitrary,
because the odds account for spending, Social Security, big costs, market luck and the drawdown
itself, while a nest-egg target is just a pile. Someone can be 80% of the way to a magazine's
number and have 45% odds. Derive the target from the odds and the two can never contradict each
other: one fact, drawn twice — *how likely*, and *how far*. The yearly saving is the bridge between
them, and it is the most actionable number on the screen.

Also show the required amount against the **tax-advantaged room the app already knows** — "$38,000
needed; $31,000 of it can go in tax-advantaged accounts, the rest to a brokerage." Cheap realism.

### 3.5 · The state that decides whether people trust this app

For a 58-year-old who is behind, the honest required contribution comes out at something like
**$95,000 a year — more than they earn.** Design that state deliberately.

Say the number plainly, then turn immediately to the levers that actually move:

> Retire at 67 instead of 65 · **+14 points**
> Spend $400 less a month · **+9 points**
> Claim Social Security at 70 · **+6 points**

The message is *here are your three real options* — never *you have failed*, and never a softened
number. This is the moment the app earns someone for life or gets deleted.

### 3.6 · The outcome must stay visible

Merged, this screen is long: age, retire at, plan to, spending, a list of accounts, a list of big
costs, a saving stepper, two outcome blocks. If the answer scrolls off while the person changes
inputs at the bottom, the whole point is lost. Solve it — a pinned verdict, a compact echo, your
call — but solve it.

### 3.7 · What is absorbed, what survives

- **Absorbed into section 1:** the answers screen, the What-if sandbox, the read-only drivers
  screen, and the big-costs list. What-if disappears as a destination.
- **Survives in section 2:** Social Security timing (62 vs 67 vs 70 in dollars) · Roth conversion ·
  goals and trade-offs ("can I afford it?") · required withdrawals and draw order (retirees) ·
  the stress test.
- **Section 2 rows earn their place by saying what they are worth** — "claiming at 70 instead of 67
  is +$624/mo" — not by naming a topic.
- **Unchanged:** Home, Net worth and Plan all open the *same* section-1 screen when an answer is
  missing, deep-linked to the missing field, returning where they came from. That was a founder
  ruling.

---

## 4 · The Plan surface as it exists today

Dumped from the running app, in order, with real numbers. Ground truth, not intent.

**The Plan tab, worker (58):**
> Plan · "We lay it out. You decide."
> **WILL MY MONEY LAST? — to 92** · *Uncertain — 60% · range 31–87% · estimate*
> "You could **retire at 65 with ~$1,483,000, lasting past 92 with ~$876,000 to spare.** …if you
> retire at **65**, and spend $5,200/mo in retirement." · *What drives this? ›*
> **NEXT DECISION · A REAL DATE** — "Your Social Security claim window opens Aug 2030 (age 62). No
> deadline — each year you wait raises the check ~6–8%." · *Lay out 62 vs 67 vs 70 ›*
> **YOUR OTHER DECISIONS — RANKED FOR YOU** — *When can I retire?* · *Can I afford it?* · *Is a Roth
> move worth it?* · *What big costs are coming?*
> *Try what-ifs — a sandbox ›* · *Sharpen your plan — 4 of 6 answered ›*
> "Estimates from ~400 market simulations of your own numbers — not advice."

**The Plan tab, retiree (72):** same shape, different content —
> **IS MY MONEY LASTING? — to 94** · *100% · range 100–100%*
> **YOUR RETIREMENT PAYCHECK**: $2,600 + $1,400 = **$4,000 guaranteed** + **$4,155 safe draw** =
> **$8,155/mo** · "✓ covers your $5,600/mo spending — you're using $1,600 of the $4,155 safe draw."
> Decisions: *Can I spend more?* · *Which account do I draw from first?* · *When should I claim
> Social Security?* · *Is a Roth move worth it?* · *What big costs are coming?*

**The screens it opens**

| Screen | What it is today | Fate |
|---|---|---|
| Plan answers | 3 questions + the account list, prefilled | → **merged** |
| Will it last | the odds explained + 8 read-only driver rows | → **merged** |
| Retirement (1,300 lines) | where you stand, sliders, **and a full per-account return-vs-benchmark table** | → sliders merged; the table is a duplicate of the Performance tab, see §7 |
| What if I save more | a +$500 stepper, age/retire sliders, before→after | → **merged, then deleted** |
| Big one-time costs | empty today: "your odds currently assume no big one-time costs" | → **merged** (the screen becomes the add/edit sheet) |
| Sharpen your plan | "4 of 6 complete" + three ways to add data + six chore rows | → see §7 problem 3 |
| Social Security timing | statement field · 62/67/70 table · claim window · reminders · three commit buttons. **Retiree version is 6 lines.** | stays (section 2) |
| Multi-goal | steppers, "CAN YOU DO IT ALL? Short $350/mo", effect on retirement | stays (section 2) |
| Roth conversion | "$420,000 pre-tax" · $10k/$25k/$50k chips | stays (section 2) |
| Required withdrawals | "starts 2041 (age 73) · first-year ~$15,849" · readiness checklist · year-by-year table | stays (section 2) |
| Stress test | a surprise expense vs cash · "7.3 months your cash would last" | stays (section 2) |
| Monthly income | Social Security + pension capture; feeds the retiree paycheck | stays |

---

## 5 · How people get here

- **Home** → a strip with the same odds sentence → *"See the full picture ›"* → Plan.
- **Net worth** → a "YOUR RETIREMENT PLAN" band with the same sentence → Plan.
- **Home / Net worth / Plan** → when an answer is missing, all three open the **same** screen,
  focused on the missing field, and return you where you came from.

---

## 6 · The two people — use these exact numbers

Mocks must add up. If a total is shown, it must equal its parts.

**Pat, 58, still working.** Salary $9,000/mo gross · spends $5,200/mo · retire at 65 · plan to 90.
Vanguard brokerage **$355,152** · Fidelity Traditional IRA **$420,000** · Vanguard Roth IRA
**$96,000** · Ally savings **$38,000** · home **$620,000** (does not count). Mortgage **$210,000**.
Counting toward retirement: **$909,152**. Blended growth **7.7%/yr**. Odds: **Uncertain — 60% odds
of lasting to age 90**, range 31–87%. At 65: ~$1,483,000. Target for 80% odds: **~$1.9M**.
Required saving: **~$38,000/yr**. Tax-advantaged room available: **$32,500/yr**.

**June, 72, retired.** Spends $5,600/mo · plan to 94. Social Security $2,600/mo · pension
$1,400/mo. Same accounts. Odds: **100% odds of lasting to age 94**, ~$2,810,000 to spare. Her
paycheck: $4,000 guaranteed + $4,155 safe draw = **$8,155/mo**.

**Also design for:** no age entered (nothing computes — labelled sample only) · only asset is the
home they live in (nothing counts toward retirement) · **bad odds (12%) where the required saving
is impossible** (§3.5) · every figure masked (hide-balances).

---

## 7 · The problems left to solve

1. **The Retirement screen is a second Performance tab.** It carries a full per-account
   your-return-vs-benchmark table duplicating a whole other tab. It probably does not belong in
   Plan — decide deliberately and say where it goes.
2. **The retiree and the worker are almost two different products.** The worker gets a projection
   and a target; the retiree gets a paycheck and a draw rate. Both are right. One design that holds
   both, or two deliberate variants of one design?
3. **"Sharpen your plan — 4 of 6" is a chore list** with a progress bar. It is really "here is what
   would make your answer sharper, and by how much". Can it say what each missing answer is *worth*
   — "your range is 31–87% because we're guessing at two things"?
4. **The odds have no shape.** A person sees 60% and a range of 31–87%, but never sees the plan over
   time — the money rising, peaking, drawing down, and where the bad futures diverge. Is one honest
   picture worth adding? If yes: colour-blind-safe, readable at 375pt wide, and never a single
   smooth line implying certainty.
5. **Empty states still show the machinery.** Multi-goal with no goals still shows steppers and a
   "Short $350/mo" verdict computed from nothing. Design the empty state as a real state.
6. **Required withdrawals shows two different "first year" numbers** — a header saying ~$15,849 and
   a table whose first row for the same year says ~$35,383 (one on today's balance, one grown to
   that year). Both defensible; together, confusing.
7. **The Social Security screen collapses to six lines for someone already claiming.** Right answer,
   dead-end screen. What should be there instead?
8. **Nothing lets a person read their plan back.** No single view saying "retire at 65, spend
   $5,200, claim at 67, the roof in 2028" that they could confirm or send to a spouse. Should there
   be — and is it section 1's header, or its own thing?

---

## 8 · The facts the design must respect

Do not restate these as copy — but never contradict them.

- The odds come from **400 simulated futures** of that person's own numbers, seeded so the same
  inputs always give the same answer. Each run walks year by year, grows savings in good years and
  shrinks them in bad, subtracts spending, and stops if the money hits zero. The percentage is how
  many of the 400 lasted.
- **80% odds is the "Likely" boundary** — that is why it is the target level.
- **Growth is per asset class**, weighted by what the person holds — shares 10.4%, a 60/40 mix 7.9%,
  bonds and CDs 4.2%, plain savings 2.4%, a home 4.5%. Both people here blend to **7.7%/yr**. The
  swing is measured per class too — that is what makes the 400 runs differ.
- **What counts toward retirement:** everything owned **except the home they live in and the car
  they drive** — changeable per account, and the person's choice always wins.
- **Social Security** counts from the age claimed (67 unless set). **From 73** the law requires a
  yearly withdrawal from pre-tax accounts, and tax on it comes out. **Big one-time costs** hit in
  the year named, inflated to that year.
- **The dollar figure is the middle future** (line up all runs, take the middle); **the odds count
  how many lasted at all.** This is why "Uncertain" can sit beside "money to spare" — both are
  true, and neither may erase the other.
- **Without an age, nothing computes.** Everything else has a default or is calculated.

---

## 9 · What you must not change

- The five tabs and their names. Plan stays a tab, not a modal.
- The calculations, the assumptions, and where data comes from. No inputs needing data the app does
  not have (no bank-by-bank rates, no tax-lot optimisation, no advice).
- The one-wording rule for the odds sentence (§2).
- The same section-1 screen reached identically from Home, Net worth and Plan.
- "Use as my plan" as the commit gesture for choices (§3.3).
- Nothing requiring a chart library, a video, meaning carried by animation, or colour as the sole
  carrier of meaning.

---

## 10 · What to deliver

Full screen, top to bottom — status bar, header, every section, tab bar. Both people from §6.

**Priority 1 — the spine**
1. **The Plan tab**, worker and retiree: the two sections, in one scroll.
2. **Section 1, the merged screen** — the centrepiece. Show it in five states:
   everything answered · one answer missing (deep-linked) · nothing answered (labelled sample) ·
   **mid-change**, with facts saved and choices in draft and the commit visible ·
   **the impossible-required-saving state** (§3.5).
3. **The outcome block** on its own, at three levels: strong (85%), middling (60%), bad (12%).

**Priority 2 — section 2 and its doors**
4. Section 2's row treatment — how a row shows what it is worth.
5. Social Security timing, worker **and** retiree (problem 7). 6. Required withdrawals (problem 6).
7. Multi-goal / trade-offs, empty and with two goals. 8. Roth. 9. Stress test.
10. Whatever "Sharpen your plan" becomes (problem 3).
11. Your answer to problem 4 — the picture of the plan over time, if you think it earns its place.

**With each screen, in words:** what each element is, where its number comes from, what a tap does,
what it shows when the data is missing, and anything you removed and why.

**The bar:** someone who has never used the app opens the Plan tab, understands in ten seconds
whether they are all right, and knows the single most useful thing to do next.

---

## 11 · Three inconsistencies I already know about

Design around the correct behaviour, not the current one:

1. **Two words for one number.** The Plan tab calls a retiree at 100% *"Holding"*; another screen
   calls the same person at the same moment *"Likely"*. Two word-sets exist in the code
   (Likely/Uncertain/Unlikely, and Holding/Watch closely/Running short for the already-retired).
   Assume **one** set. Tell me which, and why.
2. **The explainer says 500 runs; the engine runs 400.** Assume **400**.
3. **The explainer says inflation 2.5%; the screen shows 3.2% "from economic data".** Assume the
   screen is right and the explainer is stale — the number is live, not fixed.
