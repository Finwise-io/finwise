# MoneyKeel Cash flow — 94 screen checks to settle

Evidence package v01 · built 2026-11-02 from the code at `41175b97` · for a reviewer with no access to the code.

## What you are asked to do

On 2026-10-25 an outside reviewer checked every figure on MoneyKeel's Cash flow screens against eight rules. In 94 checks it said FAIL because it could not see the screens, the drawings or the simulation — each case quotes its own words. This package carries what it could not see. For each check, answer RIGHT, WRONG or CANNOT TELL, give the reason in a sentence or two, and show the sum you worked by hand.

## MoneyKeel, in two lines

MoneyKeel is a personal finance app on the phone. Its Cash flow screens show a household what comes in each month, what goes out, its debts, the bills ahead, and what its savings could pay in retirement.

## His eight rules — the tenets

The founder approved these on 2026-10-09 (DEC-3523). The decision log records them as:

> The eight tenets are approved, in this order: 1. A wrong number ends trust. 2. Every number shows how it was made. 3. Unknown is not zero. 4. One thing, one number, one word. 5. The person's word outranks the app's guess. 6. His decision is the design. 7. Honest like a fiduciary. 8. Plain words for a reader of 55 to 70. When two pull against each other, the higher one wins.

The approved standard (`MoneyKeel/documents/standards/moneykeel_spec_tenets_v01.md`) says what each one means:

> **1. A wrong number ends trust.** Being right comes before being fast, being complete or looking good. A late, correct figure beats an on-time, wrong one.
>
> **2. Every number shows how it was made.** A person can trace any figure to its parts on the screen: the rows under a total add up to it, and a figure that is an estimate says so.
>
> **3. Unknown is not zero.** Something never entered shows as "not entered" and the reason, never as $0 or a default that looks like an answer.
>
> **4. One thing, one number, one word.** A concept is worked out in one place and called by one name. The same figure on two screens is the same figure.
>
> **5. The person's word outranks the app's guess.** What they confirmed, typed or chose is never overwritten by a rule, a sync or a sweep.
>
> **6. His decision is the design.** The last approved drawing and the decision log say what the app does. A change of mine never stands against them. Every decision is recorded in his words and applied in every place it reaches.
>
> **7. Honest like a fiduciary.** Advice serves the person's own money and goals, and tax, risk and cost are stated plainly. Nothing is made to look better than it is.
>
> **8. Plain words for a reader of 55 to 70.** No jargon. A sentence a ten-year-old could repeat. The screen says what a number means, not only what it is.
>

Higher means earlier in the list: tenet 1 is the highest, so when two pull against each other the lower number wins.

## The rulings every case may need

Quoted from the decision log. `his_words` are his; `the_log_records` is the log's record of what he decided. A row marked "the lead's decision" was made under his rulings, not by him.

```json
[
 {
  "id": "DEC-3523",
  "decided": "2026-10-09",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "tenets approved",
  "the_log_records": "The eight tenets are approved, in this order: 1. A wrong number ends trust. 2. Every number shows how it was made. 3. Unknown is not zero. 4. One thing, one number, one word. 5. The person's word outranks the app's guess. 6. His decision is the design. 7. Honest like a fiduciary. 8. Plain words for a reader of 55 to 70. When two pull against each other, the higher one wins."
 },
 {
  "id": "DEC-0808",
  "decided": "2026-09-27",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "If I approved mock up post build - that the latest approval. Why you keep asking me same thing over and over.",
  "the_log_records": "A design he approves after a build IS the design. Closing the gap between the build and that design is my job, never a question to him."
 },
 {
  "id": "DEC-4529",
  "decided": "2026-10-11",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "agree - leave the drawing, add line detailing correction. Make sure to have the same level of details so one can understand. ok",
  "the_log_records": "Where an approved drawing shows a figure that is wrong and the app is right, the drawing is left as drawn and its READ THIS FIRST box gets a line naming the figure, what the drawing shows, what is right, and why, with the arithmetic — Net worth v08 B −0.40% → −0.41%; E (Aug 4) → (Aug 11); F 7 days → 14 days; Bonds v02 years left 2y/4y/1y → 1y/3y/0y; Other investments v02 \"Annuity\" → \"Annuities\"; Holding detail v02 gain $7,400.00 + $1,957.60 → $7,384 + $1,974 in whole dollars. And the edit sheet of a home (any property) no longer asks \"What's it invested in?\"."
 },
 {
  "id": "DEC-1560",
  "decided": "2026-10-04",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "Rest - keep it.",
  "the_log_records": "In twelve named places the app differs from its approved drawing and the app stays as it is."
 },
 {
  "id": "DEC-0440",
  "decided": "2026-09-28",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "Approved",
  "the_log_records": "“Approved.” The cash-flow mocks become ONE file: moneykeel_pres_mock_cash-flow_v01.html. It carries the four-tab architecture from v02 together with the This month and Expenses screens as revised in v07, so there is no longer a choice between two half-current versions. v02 and v07 are dated and archived."
 },
 {
  "id": "DEC-0177",
  "decided": "2026-08-27",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "\"yes\" — DEC-0177, confirmed as written: moneykeel_pres_mock_income-end-to-end_v02.html APPROVED. 14 screens in one document; 13 earlier income mocks archived.",
  "the_log_records": "The income mock is approved: 14 screens in one document, with the 13 earlier income mocks archived so there is one live file rather than a folder to choose from."
 }
]
```

Each part also quotes, under every case, the decisions that name that figure.

## What each case carries

- **The case**: the figure's identifier and the tenet (41 on tenet 5, 51 on tenet 6, 2 on tenet 1), what the first reviewer said, and the figure's own record: its words, how it is worked, and what it says when it cannot be worked.
- **The render**: every line the screen shows, in order, in the case's own household on the case's own day, after the taps named. A line `[icon]` is an icon. Beside it, every figure the screen printed under its identifier.
- **The store before and after**: every value the person entered, before the screen opened and after; and the same household arriving by a sync from the cloud, with anything the sync rewrote.
- **For tenet 6**: the drawing's phones that hold this screen, the phone the figure's line is drawn on, the drawing's dated "READ THIS FIRST" rows (where a row and a phone disagree, the row is the design), the design record's row for the screen, and every test that holds the screen to a phone, with its code and its result at this build.
- **For the simulation (tenet 1)**: what the card was handed, every run of the simulation it made, the draw search step by step, what it handed back, and the method's own code.
- **Our tests**: our measuring test's check for the case, and its result.

## How to judge a case

- **RIGHT** — the evidence shows the screen keeps the tenet. Say which lines show it.
- **WRONG** — the evidence shows the screen breaks the tenet. Say what it should show instead, and why.
- **CANNOT TELL** — the evidence still does not settle it. Name exactly what would.

**Tenet 5** — did a rule, a sync or a sweep replace what the person entered? Read the stored values, then the screen. Work the figure from what was entered. If the screen uses something else, find the decision that says so; a figure built from a rule the person did not choose and no decision allows is WRONG.

**Tenet 6** — does the screen match his latest approved drawing for this figure: its words, their order, and its figures? The rendered household is not the drawing's household, so compare words and order with the drawing, and work the values by hand from the stored values. A line the drawing does not draw is RIGHT only where a dated row or a decision keeps it (DEC-1560: "Rest - keep it."). A drawing that is wrong where the app is right is corrected by a dated row (DEC-4529), never by the app. A design he approved after the build is the design (DEC-0808).

**Tenet 1, the simulation** — is the figure what the stated method gives, and does the contract say enough for someone else to reproduce it? Check the runs against his rulings quoted in that part.

Work every money figure you judge by hand, and write the sum. Never take our status as the answer.

## What our own tests already show

32 of 94 cases are marked **SETTLED BY OUR TESTS — WORDS AND FIGURES**: the figure's line is drawn on the phone that holds its screen, and every test holding that phone word for word and figure for figure passes at this build. Appearance is not tested. 1 more is marked **SETTLED — THE FIGURE IS RETIRED**: the app no longer has that figure, and its line prints under another. Give your own verdict on these too; tell us if you disagree.

## The answer format — one JSON line per case

Put one line per case in a file named `answers.jsonl`, in any order, every case once:

```json
{"case": "<figure identifier>#<tenet>", "verdict": "RIGHT | WRONG | CANNOT TELL", "reason": "<one or two plain sentences>", "hand_worked": "<the sum you worked, with its numbers>", "evidence_used": ["<render key and line>", "<drawing phone and line>", "<decision>"], "missing": "<CANNOT TELL only: what would settle it>", "fix": "<WRONG only: what the screen or its record should say>"}
```

`moneykeel_audit_cf-evidence_answer-template_v01.jsonl` holds one such line for every case, with the case filled in. Our measurer reads the file back and refuses a line whose case is unknown, a case answered twice, a verdict outside the three, or a RIGHT or WRONG with no reason.

## What is in this package

- `moneykeel_audit_cf-evidence_part-01-of-08.md` — The Cash flow tab: This month, and Home's box for this month: 21 cases.
- `moneykeel_audit_cf-evidence_part-02-of-08.md` — The Cash flow tab: Expenses: 10 cases.
- `moneykeel_audit_cf-evidence_part-03-of-08.md` — The Cash flow tab: Income: 9 cases.
- `moneykeel_audit_cf-evidence_part-04-of-08.md` — The Cash flow tab: Debts: 12 cases.
- `moneykeel_audit_cf-evidence_part-05-of-08.md` — Your future paycheck and the retired month — the cards no drawing draws, and the simulation: 10 cases.
- `moneykeel_audit_cf-evidence_part-06-of-08.md` — Your base pay: 12 cases.
- `moneykeel_audit_cf-evidence_part-07-of-08.md` — Your income, all of it — and the income manager: 15 cases.
- `moneykeel_audit_cf-evidence_part-08-of-08.md` — The bill calendar: 5 cases.
- `moneykeel_audit_cf-evidence_index_v01.md` — the cases in one table: each by its identifier, its part, what the first reviewer said it lacked, and our status.
- `moneykeel_audit_cf-evidence_answer-template_v01.jsonl` — the answer lines to fill in.
- `moneykeel_audit_cf-evidence_contents_v01.json` — what was built, from which commit, and the self-check's result.

## What this package does not show

- **Appearance**: colours, type sizes and spacing. No test here compares them.
- **Edits**: changing an entered value on its own editor screen. Opening the screen and a sync of the same record are shown.
- **The code**, except the simulation's method, which is its contract.
