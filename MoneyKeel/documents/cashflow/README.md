# documents/cashflow

**Lives here:** Money in and money out: income, expenses, the budget, debts.

**Never here:** Code of any kind.

Naming and structure: `MoneyKeel/documents/standards/moneykeel_naming_spec_file-and-folder-naming_v01.md`

**Which design each screen was built from, by build:**
`MoneyKeel/documents/standards/moneykeel_pres_spec_design-each-screen-was-built-from_v01.md`

## Three mocks, and what each one is for

One file per subject, latest version only — everything superseded is dated in `archive/`.

| File | What it settles |
|---|---|
| `moneykeel_pres_mock_cash-flow_v01.html` | **THE CASH FLOW SURFACE — all four tabs in one file.** This month and Expenses (four data states, the five rules underneath), Income and Debts (the tab frames), and the architecture note that says why there are four tabs and no separate Budget screen. |
| `moneykeel_pres_mock_income-end-to-end_v07.html` | **Every screen the Income tab opens** — the source picker, base pay for two earners, bonus, rent, dividends, the summary. Seventeen frames; it stands on its own, which is why it is not folded into the file above. |
| `moneykeel_pres_mock_filing-status-question_v03.html` | **"How do you file your taxes?"** — the onboarding question that sets the filing status, in three states. |

**Every one carries a block saying what changed and why** (founder, 2026-09-26: *"How do I know what
changed between V06 and V07?"*). A version that cannot say what changed is not a version; it is an
edit nobody recorded.

## The day they became one file — 2026-09-28

The founder: *"let's discuss how to clean cashflow mockups and combine into one file, as currently we
have v2 with few final screen, and v7 with this month and expense screen revised."* He was right: two
files each held part of the same surface, and the newer one had redrawn two of the four tabs, so
anyone opening the older one would build the wrong thing.

`cash-flow_v01` takes This month and Expenses from **this-month-and-expenses v07** and Income and
Debts from **money-four-tabs v02**. Both are dated in `archive/`. **Look ahead moved out** to
`documents/networth-and-performance/` — "What if I save more?" is opened from Performance, not from a
cash-flow tab, and a file in the wrong folder is a file nobody finds.

Three things were fixed while combining: one month across every frame (the lifted frames said July
while the others said August), the duplicated tab headings, and **the missing `<meta charset>`** — the
file is UTF-8 and every frame carries `·` and `—`, but without the declaration a browser guesses, and
when it guesses wrong the whole page renders as mojibake. Ten live mocks had the same hole; all ten now
declare it.

## The day the words were fixed — 2026-09-26

The founder: *"fix cashflow screens before moving forward."* v06, v03 and v01 were all approved **before**
the one-term-per-concept rulings of 2026-09-10 and 2026-09-12, so they still drew words the app no longer
says — "Spending", "In (take-home)", "Out (bills + debt)", "spending plan", "/mo", "All transactions",
"Invest". Every one is now on the canon, and the code was brought with them (see the changelog in each
file). No figure, frame or design decision changed.
