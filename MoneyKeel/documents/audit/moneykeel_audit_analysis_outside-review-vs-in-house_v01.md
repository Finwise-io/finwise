# Why the outside reviews found what the in-house work had not fixed — an analysis

Founder question, 2026-09-12: *why was Claude Code not able to find the gaps, errors and discrepancies in the calculation file when Claude and Gemini both were able to find them?*

Written from the record, not from memory: the two in-house audits of 2026-08-25 (A01–A51) and 2026-08-26 (B01–B35), the outside review of 2026-09-02 (Gemini 37 findings, Claude 4), my assessment of it (2026-09-03), the commit log, and the master file as it stands.

## The short answer

Four causes, in order of weight.

1. **Found, recorded, and not fixed.** 21 of the 41 outside findings had already been written down by the in-house audits a week earlier — the same rows, the same defects (the three contradictions on the odds row, the two return methods, the 365-day rule, the bond-yield approximation stated as an exact solve, the payment rule written three ways). On 2026-08-27 the record said: 15 done, 46 A-findings "recorded on the row they belong to, none worked", B07–B25 "not yet re-verified". The week was spent building the file's machinery (thirty commits on 2026-08-25 alone) instead of closing what the audits had found. The outside reviewers did not out-find the in-house pass on these; they re-found what was still open. This is the largest single cause, and it is exactly the drift the working plan now prevents.

2. **The code was checked against itself, never against the world.** The in-house formula audit compared the file's formula with the code's formula — useful, it found 35 clashes — but nothing compared either with the law. The senior deduction (G3, a 2025 statute), the prior-31-December balance for a required withdrawal (G8), the age attained during the year for catch-up limits (G1), Medicare ending HSA contributions (G10), the long-term holding rule (G2): six of the 41 are facts of tax and Social Security law, and a seventh (G15, the full-retirement-age schedule) was ruled from the law in the brief. I had no source of those facts in the repo and did not go and get one. The outside reviewers brought the law with them. The founder saw this on 2026-09-01 — "how do I trust you did not make any mistake in formulas" — and the answer that day was the first test that types the published figures in by hand.

3. **I did not read what I generated.** The file has 164 figure rows with twenty columns each and 601 function headers, and most of that text is written by scripts. Nine findings (G23, G24, G27, G28, G29, G32, G33, G35, C4) are things a reader sees on the page: "the answer = 0.37" for a bracket function, "tax − free" rendering damage, "rounds to a whole number" on a two-decimal function, a column saying no figure names a function while the metric rows name it, "adds up to $0" on an empty state, VERIFIED typed on every row. They were on disk for a week. I audited the generator's rules and the counts; the reviewers opened the file and read rows. A generated page is not verified because the generator ran.

4. **Rulings lived in chat and in a brief, not on a row with a check.** Seven findings (G6, G13, G15, G16, G30, G34, G37) are rulings the founder had already made on 2026-08-20 — no defaults, the paycheck lines, the Social Security input, the bequest, the fixed inflation default, round once — that the code or the file did not carry. Three of them were done in code and the file's words never followed. There was no ledger of rulings until 2026-09-08 and no check that a ruled row still reads as ruled until 2026-09-12. Context resets between sessions made this worse: what was decided in one conversation was not in the next.

Two smaller causes sit behind these: the in-house audit was written "against the three standards" — it checked compliance with rules I had written, not truth — and its tools were pattern sweeps (a regular expression for "/ 12" that fired on month indexes), which find strings, not wrong laws.

## What the in-house pass did find

To be fair to the record: the two in-house audits wrote 86 findings, and the serious wrong numbers among them were found in-house first — the 401(k) taxed twice (B05, $4,400 a year), take-home typed by hand adrift by up to $1,600 a month (B27), a filing status no screen ever set (B31), a household with one salary field (B32), the big-ticket radar flagging the mortgage every month (B28). The outside review found none of those. It found what in-house had left open, plus the law, plus what a reader sees.

## The outside review was not always right

One finding was false (G31: take-home reduced by uncapped payroll tax — the code never deducts it) and three were half false (G2, G15, G24 claimed code bugs where the code was right and the file wrong). The in-house verification against the code caught all four. The right process is both halves: an outside read, then an in-house check of every claim against the code.

## The 41, one by one

| # | Their finding | Kind | In-house counterpart | Why in-house had not closed it |
|---|---|---|---|---|
| G1 | Catch-up limits test today’s age; law tests age attained during the calendar year | against the law | — | the rule "age attained during the calendar year" was never checked; no test typed the law in |
| G2 | Long-term test "≥365 days" wrong; exactly one year is short-term | against the law | A34 / B10 (08-25) | found in-house first; not fixed until 09-12 |
| G3 | The $6,000 senior deduction (65+, 2025–2028) is missing | against the law | — | the 2025 senior deduction (P.L. 119-21) was not known to the code or to me; no published-values test existed |
| G4 | 7.65% applied uncapped and to all income; take-home understated $301/mo at $250k | against the law | — | partly false (the code never deducts FICA); the caveat wording was the real part |
| G5 | Inflation stated as 2.5 where 0.025 is meant — possible 250%/yr | a unit | — | a unit (2.5 vs 0.025) — nothing read the assumptions column for units |
| G6 | Built-in 22%/15%/50% tax defaults on the draw-order screen, against ruling R2/Q43 | a ruling not carried | — | brief rule R2 (no defaults) was never checked against the draw-order screen |
| G7 | Flat 22% on required withdrawals inside odds while chain carries the effective rate | a code path unwalked | — | a flat 22% inside the odds while the chain carries the effective rate — code read against the brief only from outside |
| G8 | RMD divides today’s balance; law says prior 31 December balance | against the law | — | the prior-31-December balance rule: law, not arithmetic |
| G9 | age = this year − birth year overstates before the birthday | a code path unwalked | — | age = year − birth year: a convention nobody wrote down |
| G10 | HSA limit shown for Medicare-age people who cannot contribute | against the law | — | Medicare stops HSA contributions: law |
| G11 | Missing maturity date invents 0 years, feeding yield-to-maturity | a code path unwalked | — | a missing maturity inventing 0 years — an empty-state path nobody walked |
| G12 | "Out (spent + debt)" names a debt-excluding function; two "Out"s disagree | two columns disagree | B26 (08-26) | found in-house first; still open |
| G13 | Paycheck words add withdrawals+RMD; math and ruling Q38 exclude them | a ruling not carried | — | brief B5 was executed in code on 08-20; the FILE words were never updated |
| G14 | "At <age>: ~$X/mo" attributed to a POT function; no pot→monthly rule stated | two columns disagree | — | a pot function named for a monthly figure — the Function ID column was trusted, not read |
| G15 | "Statement is the age-67 amount; 62 pays 70%" wrong for born 1955–1959 | a ruling not carried | brief B2 (08-20) | code done on 08-20; the file words still said "age-67, 62 pays 70%" |
| G16 | Bequest words say "only once retired"; function subtracts from day one | a ruling not carried | brief B3 (08-20) | code done on 08-20; the file words said "only once retired" |
| G17 | Default 500 paths while screens say 1,000 | two columns disagree | A28 (08-25) | found in-house first (three contradictions on one row); not fixed |
| G18 | Math column says Dietz; words say value-weighted average — different numbers | two columns disagree | A27 / B06 (08-25) | found in-house first; not fixed |
| G19 | Three payment rules across two columns; "interest + 1%" fallback | two columns disagree | B01 / A51 (08-26) | found in-house first; not fixed |
| G20 | Math column claims exact bond-yield solution; code is the approximation | two columns disagree | A30 / B09 (08-25) | found in-house first; not fixed |
| G21 | "Essentials a month" produced 3–4 different ways; none per ruling Q21 | a code path unwalked | B03 (08-26) | found in-house first (one of the four ways); not fixed |
| G22 | taxableIncomeFor lacks pre-tax contributions; B05 may be closed wrongly | a code path unwalked | B05 (08-26, "fixed") | in-house fixed one function and declared it closed; the other path was not re-checked |
| G23 | File renders bracket function as "= 0.37"; bracket table absent — unverifiable | generated text unread | A19 (08-25, partly) | I never read the generated header for the bracket function — "= 0.37" was on disk for a week |
| G24 | Volatility never divided (wrong unit); "rounds to whole number"; defaults unstated | generated text unread | A16 / A18 (08-25) | the heuristics were known to be notes-to-myself on 08-25 and left in |
| G25 | Statement amount cites the transaction-amount input and retirement age — wrong links | two columns disagree | — | wrong input links on two rows — the inputs column was generated and never read |
| G26 | Dependency column cites retired E-identifiers | two columns disagree | A25 (08-25, partly) | retired identifiers still cited; found in part, not closed |
| G27 | "Figures that name it" says none while metric rows name them | generated text unread | — | a generated column said "none" while the metric rows named the function — two generators, never compared |
| G28 | Inputs’ figure links stale; reconciliation covers 48 of 60 by retired type-E names | generated text unread | A11 / A24 (08-25) | found in-house; the sweep was rebuilt only on 09-09 |
| G29 | Specification says 455 functions (there are ~580); S01 "163 of 163" false via M-006 | generated text unread | A09 / A06 (08-25) | found in-house; the false COMPLETE stayed on the Specification |
| G30 | Inflation from a live feed contradicts ruling Q50 (fixed, dated, editable) | a ruling not carried | — | brief Q50 (fixed, dated inflation) was ruled 08-20 and the code kept the live feed |
| G31 | Two take-homes 7.65% apart — base-pay deducts FICA, the grid does not | reviewer wrong | — | premise false — the in-house check caught it |
| G32 | "Adds up to $0" empty states = invented zero; 22 rows wrong division boilerplate | generated text unread | — | "adds up to $0" on empty states and wrong division boilerplate — generated, never read |
| G33 | Unit/period column derived from labels, wrong on ~20 rows; S04/06/07 claim COMPLETE | generated text unread | — | units derived by rule from labels; S04/06/07 said COMPLETE |
| G34 | File copy uses net/estimate/"safe"/ISA/cheque against canon and ruling R1 | a ruling not carried | A02 (08-25, one word) | the canon existed for two words; the file used net / estimate / safe / cheque |
| G35 | Rendering damage ("tax − free"); binary search shown as one midpoint; two undeclared caps | generated text unread | A19 (08-25, partly) | rendering damage ("tax − free") on disk, unread |
| G36 | Per-month = room ÷ months left — undefined in December, convention unstated | a code path unwalked | — | room ÷ months left undefined in December — an edge nobody walked |
| G37 | "Every number held as a float" vs ruling R6/Q56 (decimal, round once) | a ruling not carried | — | the Reference tab said "every number is a float" against R6; the engines had a decimal type since 08-20, the domain did not |
| C1 | Dietz vs value-weighted; asks to standardise money-weighted vs window-return functions | two columns disagree | A12 / A14 (08-25) | found in-house first; still his decision |
| C2 | 1,000 vs 500-path fallback; band removed vs described; three rounding stories | two columns disagree | A28 (08-25) | found in-house first; not fixed |
| C3 | Class-name mismatch; Unclassified accounts may be silently dropped | two columns disagree | A29 / B07 (08-25) | found in-house first; not fixed |
| C4 | Two-decimal rounding logged as "whole number" and "×100 percentage"; misclassified | generated text unread | A15 / A23 (08-25) | found in-house first; not fixed |

Counts by kind: two columns disagree 11 · generated text unread 9 · a ruling not carried 7 · against the law 6 · a code path unwalked 6 · a unit 1 · reviewer wrong 1. With an in-house counterpart already on record: 21 of 41.

## What is in place now against each cause

| Cause | What now exists | Built |
|---|---|---|
| Found and not fixed | The working plan (one row per task, worked in date order); moneykeel_finding_status.py holds every finding's status and what closed it; every August finding was re-verified row by row | 2026-09-12 |
| Checked against itself | statutory_constants.test.ts types the published figures in by hand; guard D4 makes every statutory figure name its publication and year, and fails when the year rolls without a re-check; the RMD schedule, Social Security months and the full FRA table fixed with tests | 2026-09-01 · 2026-09-12 |
| Generated text unread | The formula-agreement gate (header vs file), the header check, the one-term guard reading every generated comment, the extractor's notes-to-myself removed, 49 unreadable bodies read by hand, the canon applied to every generated column | 2026-08-26 → 2026-09-12 |
| Rulings not carried | The rulings ledger with one vocabulary of stages; check-rulings-in-file.py fails when a ruled row drifts; the four-day rule that a chat answer is in the file the same day | 2026-09-08 · 2026-09-12 |

## What is still missing, and proposed

1. **A rules-of-law suite, not only constants.** G1, G8 and G10 are rules (age attained in the year, prior-year balance, Medicare), each now fixed with its own test in a different file. One file that lists every rule of tax and Social Security law the app applies, with its citation and one worked case, is the in-house equivalent of what the reviewers brought.
2. **An outside read as a standing gate.** Before a rebuilt master goes to the founder, one outside pass over the file with a fixed checklist — the columns agree, against the law, units, empty states, rulings applied — followed by the in-house verification of every claim against the code. The 2026-09-02 round proves the pair works: 27 right, 13 half right, 1 wrong, and the wrong one caught.
3. **Read the output.** After every build, a sample of rows and headers read as a reader would, and a nonsense scan ("= 0.37", "tax − free", NOT DETERMINED, NOT READ YET) whose count may only fall.
4. **One source for a metric row's formula.** Metric rows still carry a hand-written maths and words column beside the code-read function header; the two-columns-disagree class (10 of the 41) lives there. Deriving the metric row from the named function's header removes the class.
5. **Units read from the function's return type** (G33), which is still derived from labels.

These five are on the working plan as one row for the founder's decision.