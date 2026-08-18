# Real downloads — drop institution files here

**Nothing in this folder is committed to git.** The ignore rule is in `.gitignore`; only this
README is tracked. These are real statements with real balances, and they stay on this machine.

## What to download, most useful first

**1 · Holdings / positions, one per institution** — Vanguard, E*TRADE, Fidelity, Schwab, Chase.
Usually *Download* or *Export* on the holdings page; CSV if offered.

This is the file that settles classification. The app currently finds each column by pattern
because no two institutions agree on names, and those patterns were written from format
documentation rather than from files. A real header row either confirms them or shows what was
missed. The **description text** matters most of all — for a CD or a bond it is the only place the
maturity and the coupon appear, so it is what tells a CD apart from a share.

**2 · Transaction history, Vanguard first, the longest window offered.**

This is the more valuable of the two, because it is where the unexplained $1.4m of contributions
would be visible. The app says money arrived in an account where the statement says nothing moved,
and every other explanation has been ruled out by running the code. This file would show what
activities actually exist and how Vanguard words each one.

**3 · Anything that exports differently** — QFX/OFX, or a PDF where no CSV is offered. Worth having
one of each to see how the same holding is described on a different road.

## What to redact, and what NOT to

**Redact:** account numbers, and your name and address if they appear in the header.

**Do NOT redact:** the description or security-name text, the tickers, or the column headers.
Those are the entire point — the labels are what I need to read.

Balances and dollar amounts are best left real. They are what make it possible to check that the
app's total matches the institution's, which is the acceptance test. If you would rather not, scale
every number in a file by the same factor and say so — the labels still do their job.

## What happens to them

They become fixtures: a test that runs the real header row and the real description text through
the live code and pins what it produces. Committed as a *shape* — headers and representative
description text, no balances — so the classification rules can never drift away from the files
they were built for. The originals stay here, untracked.
