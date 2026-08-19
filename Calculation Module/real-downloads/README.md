# Institution files — drop them here

> **These files show how an institution WORDS things. They are not what its API returns.**
> Founder, 2026-08-18. A downloaded export and a live connection are different roads with different
> fields and often different vocabularies — Vanguard's export carries no cost column at all, while
> its connection sends an average purchase price. So a finding from a file proves something about
> the FILE road only. Anything claimed about a connection has to be observed on a connection.

Files here are **gitignored by default** (real statements must never be committed). But if a file
carries no real balances — sample exports, format documentation, or numbers you typed in yourself —
say so and it gets moved to `fixtures/` and **committed**, where it becomes a permanent test.
That is much better than untracked: a committed file is one a guard test can run forever.

## The one thing that must be exact

**The header row and the description / security-name text, character for character as the
institution writes them.** That is the entire value. Everything else can be invented.

The app finds each column by pattern because no two institutions agree on names, and those patterns
were written from format documentation rather than from files. A real header row confirms them or
shows what was missed. The description text matters even more: for a CD or a bond it is the only
place the maturity and the coupon appear, so it is the only thing that tells a CD from a share.
"KEYBANK NA 4.00% CD 08/24/26" is the data. Whether the balance beside it is real does not matter.

## Made-up numbers: fine, with one condition

**Make them internally consistent.** Shares × price should equal the value; the rows should add to
any total row the file carries.

Not pedantry — it is the difference between a finding and a false alarm. If the app reads a file and
its total does not match the file's, that is either a parsing bug worth hours or a typo in the
sample, and with inconsistent numbers I cannot tell which. I would burn a day chasing the wrong one.

Round numbers are ideal. Ten shares at $100 is easier to check by hand than 13.472 at $88.31.

## What each file needs written next to it

Institution, and which export it is ("Vanguard · holdings download" / "Fidelity · transaction
history"). A CSV alone does not say where it came from, and the whole point is knowing whose
labels these are.

## What a synthetic file CANNOT settle

**The $1.4m of phantom contributions.** The app says money arrived in an account where the statement
says nothing moved, and the remaining suspect is that the account's internal id changed between
connections — so every activity re-imported as new. Only the real activity history from that real
account can show that. A sample file with invented numbers cannot, because the bug is about which
rows arrived twice, not about how a row is worded.

Two different jobs. Sample files fix classification and parsing. The Vanguard bug needs the real thing,
whenever you are willing to pull it.

## Most useful first

1. **Holdings / positions exports** — Vanguard, Fidelity, Schwab, E*TRADE, Chase. Settles
   classification, which is the work in flight.
2. **Transaction / activity exports** — same institutions. Settles how each one words a deposit, a
   dividend, a transfer.
3. **Anything shaped differently** — QFX/OFX, or a PDF where no CSV exists. One of each is enough to
   see how the same holding is described on another road.

Coverage beats depth. Five institutions with three rows each is worth more than one institution with
three hundred, because the disagreement between institutions is the thing being tested.
