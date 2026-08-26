# MoneyKeel — the unique identifier

Agreed with the founder 2026-08-22. Every figure a person reads, every engine that produces one,
every raw input and every assumption carries one of these for life.

**In two sentences:** an identifier looks like `MK-NW-M-045` — MoneyKeel, the net worth family, a
metric, number 45. It is given out once and never changes, so a figure on screen, its row in the
master file and its code all answer to the same name.

## The shape

    MK-[family]-[type]-[number]

The founder's first draft was `MK-CM-Mv1-NW-M-45`. Two segments were dropped, each for a reason:

- **`CM` dropped.** All of this work is the calculation work and the folder already says so. Long
  identifiers get shortened by hand; short ones get used as written.
- **`Mv1` dropped.** A version inside an identifier means the identifier changes when the file
  does — and then it is not an identifier. The version belongs to the file, never to the thing.

## The pieces

| Piece | Values |
|---|---|
| Family | `HM` home · `NW` net worth · `PF` performance · `PL` plan · `CF` cash flow · `MN` menu · `XS` shared across screens · `ST` standards |
| Type | `M` metric — what a person reads · `E` engine — the code that computes · `I` input — a raw value · `D` decision or assumption · `S` screen |
| Number | Three digits, given out in order within each family, **never reused** |

Examples: `MK-NW-M-045` a metric · `MK-PL-F-012` a function · `MK-CF-I-007` an input ·
`MK-PL-D-003` an assumption · `MK-NW-S-004` a screen.

**`E` is retired.** It stood for "engine", a word invented for something that does not exist in the
code. The vocabulary standard replaced it: what produces a figure is a **function**, and the one
that answers a whole question by calling the others is an **orchestrator function**. Identifiers
already issued as `MK-…-E-…` are not reused for anything else; they survive only on the
`engines-old-tab` sheet, which is kept so the earlier work can still be traced.

### Addressing every cell of the founder's 72-metric grid

Purposes and data conditions hang off the metric they belong to:

    MK-NW-M-045          the metric
    MK-NW-M-045-P02      purpose 2 of that metric
    MK-NW-M-045-P02-B    that purpose under data condition B

So every cell of the answered metrics file has an address, and nothing in it is unreachable.

## The five rules

1. **Assigned once, never changed.** If a figure moves to another screen the identifier stays and
   the screen is just a column. An identifier that changes when things move is not one.
2. **Never reused.** A cut metric's number is retired, never handed to something else.
3. **New meaning, new identifier.** If a figure's definition becomes a genuinely different thing it
   gets a new identifier, and the old one is marked as superseded by it.
4. **Both directions.** A metric names every engine that serves it; an engine names every metric it
   serves. Neither side is allowed to be silent.
5. **Three places carry it:** the row in the master file, a header inside the code file, and — later
   — the app itself, so a figure on screen can name its own identifier when something looks wrong.

## Which family a figure belongs to

The family is **where the figure lives**, not where it was first seen:

- Shown on exactly one parent screen → that screen's family.
- Shown on more than one parent screen → `XS`, and its row sits on the multiple_screens tab with
  every label it wears listed.
- A rule rather than a figure — asset classification, decimal arithmetic, the institution-words
  table → `ST`.

## A worked example

The founder's row: Performance screen · label "Ending Market Value" · metric Ending Market Value ·
engine asset class of account.

**Two identifiers, because the row joins two things:**

| | Identifier | Why |
|---|---|---|
| The metric | `MK-XS-M-001` | Ending market value appears on Performance **and** on account and holding screens, so its family is shared, not `PF` |
| The engine | `MK-ST-E-001` | Asset classification is a rule, and rules are family `ST` |

The row then reads: **`MK-XS-M-001` — Ending Market Value — served by `MK-ST-E-001`.**

**And the example immediately catches something.** An asset-classification engine decides which
bucket a holding belongs to; it does not produce a money total. Ending market value is quantity ×
price, summed. So that engine column is wrong — which is the point of making every row name its
engine.

## Connecting the two files that never spoke

The new master file carries a crosswalk: one row per identifier, with its name in the founder's
72-metric file and its name in the old master beside it. Every metric of his gets an identifier,
every old master row gets one, and any name that exists in only one of the two files is visible
rather than hidden. That is the shared key the two files never had.

## Complies with

- `moneykeel_naming_spec_file-and-folder-naming_v01.md` — how this file is named and where it sits.
- `moneykeel_calc_spec_objectives-and-verification_v01.md` — objective 3 (trace in a minute) and
  objective 4 (screen to engine to formula to inputs to decisions).
