# Second verification of the MoneyKeel calculation master file
### A brief for an independent reviewer · 2026-09-02

## What you are being given, and why

You have one Excel file: **moneykeel_calc_master_calculation-master_v01.xlsx**. It is the single
source of truth for every calculation in MoneyKeel, a personal-finance app for people aged 55 to 70.
Every figure a user sees on a screen has a row here: which function produces it, the formula in
mathematical form and in words, the inputs it needs, the assumptions in its chain, and the chain of
functions behind it, ending at the screen.

This file was built and checked by one reviewer (an AI assistant working with the founder). You are
the **second verification**. You have no access to the app's code — that is deliberate. Your job is
to check what the file itself says: against the published rules of the world, against arithmetic,
and against itself. A wrong number in a finance app destroys trust irrecoverably, so treat every
row as guilty until it checks out.

One reason to take this seriously: an earlier check of exactly this kind — statutory facts against
published sources — found three real errors that 2,500 internal tests could not see, because the
tests only proved the code agreed with itself: a 401(k) catch-up applied at the wrong ages, a wrong
IRA limit, and an invented interpolation in the required-minimum-distribution table.

## How the file is organised

Every object carries an identifier and rows link by identifier, never by name:
- **MK-XX-M-NNN** — a metric (a figure on a screen). XX names the family, for example MK-NW-M-015.
- **MK-XX-F-NNN** — a function. **MK-XX-O-NNN** — an orchestrator function (one that assembles others).
- **MK-XS-I-NNN** — an input (something the user or a feed provides).

The tabs (row counts exclude the header row):

| Tab | Rows | What it holds |
|---|---|---|
| Reference | 114 | Definitions and reference items |
| Specification | 29 | What this file must contain and why (S01–S21) |
| multiple_screens, home, networth, performance, plan, cashflow, menu | 192 together | **The metric rows** — one per figure a user can see: 163 active, 1 decommissioned. Columns include the producing function and its identifier, both formula forms, inputs, unit and rounding, the empty-state text, grain, period, the dependency chain, assumptions, and audit columns |
| inputs | 60 | Every input: identifier, source, which functions read it, which figures it reaches |
| database | 30 | Where each stored field lives, what it holds, what it serves |
| core_screens | 49 | Screen list with the founder's core / not-core decisions |
| reconciliation | 50 | Input-to-function cross-check: what the inputs tab claims vs what functions declare |
| engines-old-tab | 136 | The retired old inventory — kept for history, identifiers retired |
| functions_from_code | 581 | **Every function, read from the code**: identifier, file and line, category, objective, both formula forms, inputs, output, where its answer appears, assumptions, dependent functions, the chain, figures that name it |
| functions_summary, functions_per_metric | 18 together | Roll-up counts |

## What to check — five hunts, in order of value

**Hunt 1 — facts about the world (highest value).** Anywhere a row states a statutory or published
figure, verify it against the official source for **tax year 2026**, and give the source in your
finding. In particular:
- Federal income-tax brackets and standard deductions (single and married filing jointly, and the
  extra deduction at 65 and over) — against the Internal Revenue Service.
- 401(k) and IRA contribution limits, the catch-up at 50 and over, and the higher catch-up that
  applies ONLY at ages 60 to 63 — against the Internal Revenue Service.
- Required minimum distributions: the start ages (73, or 75 for those born 1960 or later) and the
  Uniform Lifetime Table divisors — against the Internal Revenue Service.
- Social Security claiming arithmetic: full retirement age 67, roughly 70% at 62, 124% at 70 —
  against the Social Security Administration.
- Payroll tax: Social Security plus Medicare at 7.65% of wages — and check it is described as
  applying to wages, not to all income.
- Any long-run market-return, volatility, or inflation assumption a row states — flag anything that
  misstates the index it cites or uses a figure with no stated basis.

**Hunt 2 — arithmetic and logic in the formulas.** Read "Formula (in words)" and "Formula
(mathematical)" on every active metric row and on functions_from_code rows. Look for: annual and
monthly figures mixed without dividing or multiplying by twelve; a rate used as 24 where 0.24 is
meant, or the reverse; rounding declared one way and computed another; age or date off-by-one
(reaching 65 vs being 65); a subtraction in words that the mathematical form adds; a formula whose
result could not have the unit the "What comes out" column declares. Work each formula by hand with
a small example where you can.

**Hunt 3 — the file against itself.** Rows link by identifier, so contradictions are checkable:
- Every "Function ID" a metric row names must exist on functions_from_code, spelled identically.
- A figure that appears on two screens (see the "Same figure as (S16)" column and the
  multiple_screens tab) must name the same producing function everywhere it appears.
- The inputs tab says which functions read each input; each such function's own "What it is handed"
  should agree. The reconciliation tab shows the method — extend its spirit to anything you can cross-check.
- Chains must be closed: every function named inside a chain column should have its own row.
- Identifier hygiene: the format MK-XX-Y-NNN, no duplicates, and no active row citing a retired
  identifier from engines-old-tab.

**Hunt 4 — assumptions a fiduciary would not sign.** Read the assumption columns as a certified
financial adviser would: anything tax-wrong (for example, ignoring that a withdrawal from a pre-tax
account is taxed), anything that silently favours a tidy number over a true one, anything that would
mislead a 55-to-70-year-old making a retirement decision.

**Hunt 5 — the empty states and the wording.** "What it says when it cannot be computed" must never
show an invented zero as a real figure. And the file promises ONE term per concept — the money that
arrives after tax and deductions is always called **take-home**, and a figure the app computed
rather than the user entered is always called **calculated**. Flag any row whose visible wording
uses a synonym instead.

## What NOT to do

- **Do not trust the file's own audit columns.** "Audit finding", "Formula audit", "Where each
  finding stands" record the FIRST verification. You are the second: re-derive, do not inherit.
- **Do not re-report what a row already flags.** Around 108 findings and 33 numbered questions are
  already logged in those columns. But DO report if a logged finding is itself wrong or was closed
  incorrectly.
- **Do not report the known gaps as discoveries**: some figures name no producing function yet —
  the rows say so. Reporting "row X names no function" adds nothing; reporting "row X names no
  function but its formula contradicts row Y" does.
- **No summaries in place of findings.** "The tax tabs look broadly correct" is not a result.

## How to report

One table, one row per finding, worst first:

| # | Tab | Row identifier (MK-…) | Column | What the file says | What is wrong | The correct fact, with source | Severity |

Severity, exactly one of: **A — wrong number that reaches a screen** · **B — wrong fact not yet
reaching a screen** · **C — contradiction between tabs** · **D — wording or cosmetic**.

Every finding must carry the row's identifier. A finding without an identifier cannot be acted on.

Close with a coverage statement per hunt: "checked N of N rows" — and if you sampled rather than
read everything, say exactly which rows you did not check. A clean hunt is reported as "checked
N of N, no findings", never silently omitted.
