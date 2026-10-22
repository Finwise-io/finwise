# MoneyKeel — the words we use for calculations, and what each one means

Agreed with the founder 2026-08-25. **One word for one thing.** If a word is not in this document
it is not used; if something new needs a name, it is added here first.

Every input, metric, function and decision is referred to **by its identifier**, with the plain name
in brackets after it — `MK-XS-I-001 (account balance)`. Never by name alone.

---

## The words

| Word | What it is | What it is NOT | Identifier |
|---|---|---|---|
| **Screen** | A place a person is looking. | — | `MK-…-S-…` |
| **Name on screen** | The words printed beside a number, copied exactly as worded. | Not the metric. Two screens may word the same metric differently. | — |
| **Metric** | The figure itself — the thing being measured. | Not the words around it, not the code that makes it. | `MK-…-M-…` |
| **Input** | A value the app was given. Nobody calculated it. | Not anything worked out from something else. | `MK-XS-I-…` |
| **Function** | A set of code that reads inputs and produces an output. The only word here that exists in the code. | Not a calculation by definition — some functions only save, fetch or format. | `MK-…-F-…` |
| **Dependent function** | A function whose output is used by another function, in a chain that ends at a screen. | Not something a screen may call. | `MK-…-F-…` |
| **Orchestrator function** | The one function that answers a whole question, calling the others in the right sequence. A screen calls this and nothing else. | Not a place to do arithmetic of its own. | `MK-…-F-…` |
| **Decision** | A rule or assumption applied on the way to a figure, marked with whose it was. | Not a calculation. | `MK-…-D-…` |

---

## The four categories of function

Every function in the code is one of these. The category comes from **what the code does** — what it
returns, whether it reaches outside for data, and who calls it — never from its name.

**1 · ACTION** — does something and displays nothing. Saving, syncing, recording. It cannot put a
wrong number in front of a person.

**2 · DISPLAYED** — its output appears on a screen: a number, a date, a word or a warning.

**3 · DEPENDENT** — its output feeds another function, and that chain ends at a screen.

**4 · BRINGS DATA IN** — fetches from outside the app: a price feed, an institution file, a
connection. What it produces is an **input**, not a calculation — with one exception: if it also
*decides* something, such as which price wins or what to use when the feed is silent, that deciding
part is a calculation and needs its own row.

**The sorting question:** *can this function's output reach a screen by any path?* If yes, it can put
a wrong number in front of a person and it needs a formula, inputs and a test. If no, it cannot.

**One carve-out.** A function that only changes how a value LOOKS — masking an account number,
formatting dollars — is presentation, not a calculation. The rounding it applies is governed once by
the standing display decision, and is tested against that decision rather than becoming a row of its
own.

---

## Orchestrator functions — the three rules

1. **A screen may only call an orchestrator function.** Never a dependent function directly.
2. **An orchestrator calls the orchestrator one level below it wherever one exists**, and calls plain
   dependent functions only for things no orchestrator owns. It never repeats a sequence another
   orchestrator already owns.
3. **A calculation is never written twice.** Dependent functions are shared by whoever needs them —
   that sharing is what stops two screens disagreeing.

**What an orchestrator buys, stated honestly:** consistency and traceability, not correctness. If the
arithmetic inside a dependent function is wrong, every screen shows the same wrong number. That is
better — one bug, one fix, no divergence — but correctness comes from the tests, not the shape.

### The three guards that make it real

An orchestrator is a convention, and conventions get broken. These are enforced by the build.

- **Guard 1 — nobody in the kitchen.** A screen that calls a dependent function directly fails the
  build. Catches the shortcut past an orchestrator.
- **Guard 2 — one identifier, one producer.** Two functions claiming the same metric identifier fails
  the build. Catches a second version of a figure being written from scratch.
- **Guard 3 — the screens must agree.** For one test person, every metric shown on more than one
  screen is rendered on each and compared; a difference fails the build. **This is the guard that
  does not rely on discipline, because it looks at what a person would see rather than at the code.**

---

## The tree — from a raw input to the number on the screen

Read downwards. Net worth, as it actually works today.

    RAW INPUTS — given to the app, calculated by nobody
      MK-XS-I-001  account balance ............ an institution download, a connection, or typed
      MK-XS-I-004  holding quantity ........... an institution download, a connection, or typed
      MK-XS-I-005  holding price .............. the price feed  (arrives via a category-4 function)
      MK-XS-I-011  bond face value ............ the download, or typed
      MK-XS-I-014  debt balance ............... typed, or a connection
      MK-XS-I-048  the person's own class answer  typed — and it outranks the institution
            │
            ▼
    DEPENDENT FUNCTIONS — each answers one small thing, and is shared by everyone who needs it
      MK-ST-F-010  nameEvidence ............... what the holding's name tells us
      MK-NW-F-008  incomeBearingClassOf ....... does it pay income
      MK-NW-F-011  assetClassOf ............... cash, bond, shares, property — the person's own
                                                answer wins when they gave one
      (bond value) ........................... face × price per hundred of face
      (stock value) .......................... quantity × price
            │
            ▼
    ORCHESTRATOR — "what is this account worth?"
      calls the dependent functions above in its own sequence, and owns the rules:
      uninvested cash counts, an option is 100 shares per contract, a bond is quoted per
      hundred of face
            │
            ▼
    ORCHESTRATOR — "what is this person worth?"
      calls the ACCOUNT orchestrator once per account — never the parts underneath it —
      then subtracts the debts
            │
            ▼
    METRIC        MK-XS-M-001  net worth
    SCREEN        Net worth  ·  and Home
    NAME ON SCREEN  "YOUR NET WORTH"  on one,  "Net worth"  on the other
            │
            ▼
    WHAT THE PERSON READS        $412,908

**Three things this tree shows that a list cannot:**

- The metric is one thing; the two screens word it differently. That is allowed. Two different
  *numbers* would not be.
- Nothing on the way down is repeated. Every calculation appears once and is shared.
- If the figure is wrong, the trace is: the name on screen → its metric identifier → the
  orchestrator → the chain of dependent functions → the input. Every step has an identifier, so
  finding the step is reading, not hunting.

---

## A sentence names what it is about (founder, 2026-09-12)

"Let's not assume that the reader knows what the statement is referring to. Always be explicit." A
sentence on a screen, in the file or in a mock names its subject — the figure, the row, the account —
inside the sentence. "So this reads high — by roughly $880 a month" failed the rule: nothing said what
"this" was. "The take-home above is higher than it will really be, by roughly $880 a month" passes.
The same applies to a note that follows a figure: it says which figure, never "it" or "this".

## One term per concept — the canon

Founder standing order 2026-09-02 ("always use the same words to describe the same thing"), and the
sixteen cluster rulings of 2026-09-10 (synonym workbook v02). One word for one concept in every place a
person can read it: screen copy, spoken labels, notes, and the comments in the code — a comment is where
a retired word creeps back. Two guards read THIS table and nothing else, and fail on any retired word:
`src/__tests__/one_term_per_concept.test.ts` over the code, and — since 2026-09-26 —
`src/__tests__/mock_copy_on_canon.test.ts` over every live mock. A row is added here the day its concept is ruled. Its
status follows the one vocabulary (RULED, NOT CODED · CODED, NOT TESTED · TESTED, NOT VERIFIED ·
VERIFIED); it becomes VERIFIED only on the founder's mark, and the synonym-workbook row closes then.

How the "Retired" column is read by the guard: entries are separated by " · ". A plain entry is a whole
phrase, matched exactly as cased. An entry in backticks written `/…/` is a regular expression (a
trailing `i` means any casing). Identifiers in code are not copy and are not checked; a single lowercase
token in quotes is a code value, not copy.

| # | Concept | The one word | In context | Retired · never again | Status | Ruled |
|---|---|---|---|---|---|---|
| 0a | Money after tax and everything taken out | take-home | Base salary (take-home) · Income (take-home) | `/lands in \S+ bank\b/` · `/lands in \S+ account\b/` · what lands · `/takes home ≈?\$/` · `/\bAfter Tax\b/` | TESTED, NOT VERIFIED | 2026-09-02 |
| 0b | A figure the app computed, not entered | calculated | "(calculated)" beside the figure | worked out · `/\bour estimate\b/` · Estimated federal tax · work it out · work them out · work this out · work these out · estimated from your | TESTED, NOT VERIFIED | 2026-09-02 |
| 1 | The money left after everything out, per month | Surplus | Planned surplus · Surplus after your budget | Left over · LEFT OVER · Left to spend · left to spend · LEFT TO SPEND · Free to spend · free to spend · `/what[’']s left\b/` · `/^Available$/` | TESTED, NOT VERIFIED | 2026-09-10 |
| 2 | The retirement success percentage | odds — "In 78 out of 100 simulated futures, your money lasts to age 90." | odds it lasts · odds of running short | chance it lasts · chance of lasting · chance of running short · % of scenarios · of every 100 futures · future simulation · future simulations · `/\bout of 10\b/` | TESTED, NOT VERIFIED | 2026-09-10 |
| 3 | The money going out in a month | Expenses — in prose too (founder, 2026-09-12): "spending" is retired everywhere; the verb "spend" stays | planned expenses · actual expenses · recurring expenses · Outflow (expenses + debt) — the brackets say what is inside | outgo · Spent so far · `/\b[Ss]pending\b/` · SPENDING · Actual spend · Planned out · `/\bOut \(/` · essential bills · must-pay bills | TESTED, NOT VERIFIED | 2026-09-10 |
| 4 | A figure the person gave us | you entered | what you entered · the amounts you entered | you told us · you set it · set by you · you typed · captured amounts · income captured | TESTED, NOT VERIFIED | 2026-09-10 |
| 5 | The money arriving in a month | Inflow (…) — the brackets name the sources: Inflow (income (take-home) + rent) | Planned inflow · Actual inflow (…) | MONEY IN · `/\bMoney [Ii]n\b(?! [a-z])/` · Expected in · In (take-home) · In (received) · A usual month · `/= In\b/` | TESTED, NOT VERIFIED | 2026-09-10 |
| 6 | Cash saved for emergencies | Emergency fund | — | cushion · Cushion · CUSHION | TESTED, NOT VERIFIED | 2026-09-10 |
| 7 | The per-category monthly plan | Budget | your expense budget · Set your budget | monthly plan · expense plan · spending plan · Set limits · category limits | TESTED, NOT VERIFIED | 2026-09-10 |
| 8 | Pay before anything comes out | Gross (before any deductions) — income before tax is NOT gross (gross − 401(k) − premiums) | — | Gross (before tax) · `/before tax\)/` | TESTED, NOT VERIFIED | 2026-09-10 |
| 9 | The investments tab, when other screens point to it | Performance, and Net worth | — | from Portfolio · Investments tab · Portfolio tab · open Net Worth or Investments | TESTED, NOT VERIFIED | 2026-09-10 |
| 10 | Money owed | Debt — the types stay (mortgage, card, loan); the info dot says "Debt is the amount you owe" | Debt balance | WHAT YOU OWE · Amount you owe · Still owed on it | TESTED, NOT VERIFIED | 2026-09-10 |
| 11 | One ticker inside an account | Holding — never a blind swap for "position"; the sale notice says "Holding liquidated — all shares sold"; the sale buttons say "Sell all" (everything) and "Sell" (part) (founder, 2026-09-12) | Stocks / Funds · Sell all · Sell | Position closed · Close position · Record sale · Record a sale · Stocks & funds · Shares and funds | TESTED, NOT VERIFIED | 2026-09-10 |
| 12 | The logged ledger rows | activity | this month’s activity | `/month[’']s transactions/` · Check your transactions · your transactions · `/Records a [“"]?Debt payment[”"]?/` · View transactions · `/odd transactions\b/` · `/add a transaction\b/` · `/flagged transaction\b/` · `/\btransaction history\b/` | TESTED, NOT VERIFIED | 2026-09-10 |
| 13 | Money that arrives or leaves once | one-time — "lump sum" is NOT always one-time; a debt due at once says "the full balance is due on that date" (founder, 2026-09-12) | — | one-off · One-off · ONE-OFF · plan for the lump sum | TESTED, NOT VERIFIED | 2026-09-10 |
| 14 | How a label says per month / per year | /month · /year · /quarter · /week · /2 weeks (founder, 2026-09-12) | $500/month · Gross /year | `/\/ ?mo\b/i` · `/\/ ?yr\b/i` · `/\/ ?qtr\b/i` · `/\/ ?wk\b/i` · `/\/ ?2wk\b/i` · Gross a year · take-home a year · `/\$[\d,]+ a month\b/` · `/\$[\d,]+ a year\b/` · `/\} ?a month\b/` · `/\} ?a year\b/` | TESTED, NOT VERIFIED | 2026-09-10 |
| 15 | Naming the will-it-last question | Will my money last — one form for both lenses | WILL MY MONEY LAST? | IS MY MONEY LASTING · Is my money lasting · MONEY-LASTS | TESTED, NOT VERIFIED | 2026-09-10 |
| 16 | The other adult in the household | spouse | Spouse’s name · your spouse | `/\b[Pp]artners?\b/` · `/\b[Pp]artner[’']s\b/` | TESTED, NOT VERIFIED | 2026-09-10 |
| 17 | The door that links a bank or brokerage account | Connect your bank ›  (founder, 2026-09-14) | the door title on Home, Sharpen your plan and What counts toward retirement — one list, src/constants/doors.ts | `/\bconnect your first account\b/i` | TESTED, NOT VERIFIED (2026-09-14) — src/screens/__tests__/first_run_lens.test.tsx pins Home to the list | 2026-09-14 |
| 18 | An account linked through the Link door, and repairing that link | Linked · Link again (founder, 2026-09-14: "connected / reconnected - change to linked / link again") | "🔗 Linked" on an account row, with its date only when stale · "Link again ›" on the fix sheet · "Linked accounts" in Settings | `/\bConnected ·/` · `/\bReconnect\b/` · Connection paused · Connected accounts · `/\bre-login\b/` · `/\bre-linking\b/` | TESTED, NOT VERIFIED (2026-09-14) — one_term_per_concept.test.ts reads this row | 2026-09-14 |
| 19 | The uninvested money sitting in a brokerage | cash in this account — the account keeps its own name above it (founder, 2026-08-11: the mock's shorter wording was declined by name) | the Cash row on Net worth · the Cash category on Performance and Account detail | `/[Ss]weep cash/` · Cash in the account | CODED, NOT VERIFIED (2026-09-27) | 2026-08-11 |
| 20 | A balance (an account's, a bank's, a class's or a debt's) that was never entered | Value not entered (founder, 2026-10-10, DEC-3657: "Should say 'Ally . Value not entered'") | Ally · Value not entered | — | TESTED, NOT VERIFIED | 2026-10-10 |
| 21 | The door when no debt is entered | Add your debts › (founder, 2026-10-11, DEC-4528) | every empty Debts section and the step-by-step walk — src/constants/doors.ts EMPTY_DOORS.debts | — (the old wording is quoted in drawings and their READ THIS FIRST rows, so it is not retired by the guard) | TESTED, NOT VERIFIED | 2026-10-11 |
| 22 | The kind of alternative investment that is a contract paying an income, held at a value you set | Annuities (founder, 2026-10-11, DEC-4529: Other investments v02 “Annuity” → “Annuities”; one word per concept, DEC-0382) — the kind’s name, as Hedge funds is | the kinds on Add an account and on the Alternatives editor · the first-day sentence “crypto, commodities, annuities” — every chip reads its word from the one list of kinds (ASSET_KINDS, src/domain/assets) | — (“Annuity” as the kind’s name. The guard cannot hold it, because the same word rightly names the income one annuity pays, “Annuity” on Monthly income (approved 2026-10-02), and one account of that kind, as in “MetLife Annuity”; src/screens/__tests__/kept_editors_match.test.tsx holds the kind instead. Add an account said “Annuity” until 2026-10-20) | TESTED, NOT VERIFIED (2026-10-20) — src/screens/__tests__/kept_editors_match.test.tsx | 2026-10-11 |
| 0c | what produces a figure | function (the one answering a whole question: orchestrator function) | Identifier standard 2026-08-22: `E` retired — "a word invented for something that does not exist in the code"; enforced in copy and comments 2026-09-13 | `/(?<!code\/)\bengines?\b(?!-old-tab)/i` | TESTED, NOT VERIFIED (2026-09-13) — the guard reads this row; the folder path `Calculation Module code/engines/` and the `engines-old-tab` sheet are spared until that folder empties into `MoneyKeel/functions/` | 2026-08-22, identifier standard (`E` retired); guard 2026-09-13 |

**Row 19, and why it took six weeks to be enforced (2026-09-27).** The founder ruled the cash wording on
2026-08-11 and the decision went into the Changelog tab — and nowhere else. Net worth obeyed it;
Performance and Account detail never heard it, and mock v14 put the declined phrase back on screen,
where he approved it because it was in front of him and his own earlier ruling was not. He caught it:
*"Why ask again if I ruled it already?"* A ruling recorded in a changelog row is a ruling with nothing
holding it. It is a canon row now, so the guard fails on it.

**The mocks obey it too, from 2026-09-26.** A ruling used to reach the code and stop there. Three
cash-flow mocks approved before the September rulings still drew "Spending", "In (take-home)",
"Out (bills + debt)", "spending plan" and "/mo" — and a mock is what the next screen gets built from,
so a retired word kept being taught back. `mock_copy_on_canon.test.ts` reads only what is DRAWN on a
phone frame (the text inside `class="phone"`): a mock's notes and its "What changed" block quote retired
words on purpose and are not scanned, and `archive/` is never scanned — it is the record of what was.
On its first run it found **20 breaches across four mocks** that careful reading had missed, including
two in files edited that same morning.

**The rule this leaves behind:** when a word is ruled, every live mock that draws it is redrawn the same
day. A mock is not on the canon because it was approved; it is on the canon because it says the words.

**The ledger rows, 2026-09-26.** Row 12's entry `Records a Debt payment` was written with straight
text while the code writes curly quotes — `Records a “Debt payment”` — so it never matched. It is now a
regular expression that allows either. Five more phrases were living in the same gap and are now retired
with it: `View transactions` (the Debts alert on the Budget screen), `odd transactions` and
`flagged transaction` (Worth a look), `add a transaction` (the recurring empty state) and
`transaction history` (one broker row, while every other row in the same file already said "activity
history"). What the code CALLS its field — `store.transactions`, `domain/transactions` — is an
identifier, not copy, and is untouched.

**"= In" is retired too (2026-09-26).** Found while fixing the cash-flow screens: the total row under
the INFLOW band said `= In` on Month detail (twice) and on Your retirement paycheck, while the Cash flow
tab one tap away said `Inflow (income (take-home))` — the same concept, two words, which is the whole
disease. They now all say `= Inflow`, and row 5 carries `/= In\b/` so it cannot come back. The entry
cannot reach `= Inflow` itself: `In\b` stops at the "f".

**And in capitals (2026-09-27).** The five entries were case-sensitive, so `EST. GROWTH / YR` on the
Alternatives screen — a band label, in capitals, with a space — matched none of them. Found while
answering the founder's question about that screen, not by the guard. They now carry `i`.

**The spaced form counts too (2026-09-26).** Row 14's retired entries were written `/mo` and `/yr`
and so could never match `/ mo` — a slash, a space, then the word. Eleven labels were living in that gap
(the future-paycheck line on Cash flow said `~$5,200 / mo`, and the onboarding recap said `Total income
/ yr`, `Surplus / mo`, `Rent / mo`). The entries now read `/\/ ?mo\b/` and its four siblings, which
catch both, and cannot reach `/month` — `mo\b` stops at the "n".

Two things the guard also holds that are not synonyms: a run-count on screen must say 1,000 (the
simulation runs 1,000 paths — `~400` is retired), and the words in the code's own comments count.

---

## Where each of these lives in the master file

| Word | Tab |
|---|---|
| Metric, name on screen, screen | the parent-screen tabs, `menu`, `multiple_screens` |
| Function, its category, its objective, its inputs and output, its assumptions | `functions_from_code` |
| How many functions stand behind each figure | `functions_per_metric` |
| The four categories, counted | `functions_summary` |
| Input | `inputs` |
| The two records checked against each other | `reconciliation` |
| The retired word | `engines-old-tab`, kept only so earlier work can be traced |

## Complies with

- `moneykeel_naming_spec_unique-identifier_v01.md` — how identifiers are formed and assigned.
- `moneykeel_naming_spec_file-and-folder-naming_v01.md` — how this file is named and where it sits.
- `moneykeel_calc_spec_objectives-and-verification_v01.md` — the objectives this serves, and the
  verification ladder the guards belong to.
