# MoneyKeel — how folders and files are named

Approved by the founder 2026-08-22. This document is itself named by the rule it describes.

**In two sentences:** `engines/` is the maths and `documents/` is the paper; the same six
sub-folders sit under every top folder, so anything can be found in one guess. A file with **no
date** in its name is the live one, and the moment it is replaced it gains its date and moves to
`archive/`.

## The top folders

| Folder | Lives here | Never here |
|---|---|---|
| `MoneyKeel/documents/` | Workbooks, specifications, decisions, standards — the paper the founder reads and approves | Code of any kind |
| `MoneyKeel/engines/` | Every calculation the app makes, one family per file, its test beside it | Screens, wording, colours |
| `MoneyKeel/screens/` | Layout, wording, what to show when | Arithmetic — a screen asks an engine |
| `MoneyKeel/data/` | Reading downloads, connections, saving and loading | Arithmetic |
| `MoneyKeel/archive/` | Dated copies of anything replaced | Anything the app still uses |

## The six sub-folders, the same under every top folder

1. `networth-and-performance` — net worth, holdings, **the ledger of money movements**, returns.
2. `cashflow` — income, spending, budget, debts.
3. `retirement` — projections, the odds, required withdrawals, Social Security, the nest egg.
4. `home-screen` — the glance, insights, what greets the person.
5. `other` — serves several screens at once: **tax**, and anything that is no single screen's own.
6. `standards` — the rules themselves.

### Where the founder placed the shared machinery (2026-08-22)

| Subject | Folder | Why |
|---|---|---|
| How assets are classified | `standards` | It is a rule about what counts as what |
| Decimal arithmetic — what rounds, what stays whole | `standards` | It is a rule about how numbers are held |
| What each institution's words mean (Sweep out, Redemption…) | `standards` | It is the translation table |
| Tax | `other` | It serves several screens |
| The ledger engine | `networth-and-performance` | Founder's ruling |

A rule has two homes and one identifier: the **written rule** in `documents/standards/`, and the
**code that obeys it** in `engines/standards/`.

## Naming a document

    [Domain]_[Layer]_[Type]_[Descriptor]_[Version].[ext]

and once it is superseded, the same name with its date in front:

    YYYY-MM-DD_[Domain]_[Layer]_[Type]_[Descriptor]_[Version].[ext]

| Field | What it is | Values |
|---|---|---|
| Date | Only on superseded copies, in `archive/`. **The live file carries no date.** | `2026-08-22` |
| Domain | The product | `moneykeel` (older files keep `finwise` until next touched) |
| Layer | What kind of work it is | `tax` naming and dictionaries · `calc` maths and engines · `data` schemas and contracts · `pres` screens and mockups |
| Type | What the artifact is | `spec`, `enum`, `engine`, `formula`, `schema`, `mock`, `mockup`, `component` |
| Descriptor | Plain words, hyphenated | `will-money-last`, `monte-carlo-simulator` |
| Version | Lifecycle | `v01`, `v02`, `draft`, `final` |

Examples: `moneykeel_tax_spec_retirement-metrics-dictionary_v01.md` ·
`moneykeel_data_schema_plan-inputs-contract_v02.json` ·
`archive/2026-08-19_moneykeel_tax_spec_retirement-metrics-dictionary_v01.md`

## Naming code — the one deliberate exception

**Code files carry no date and no version in their name.** A code file's name is how every other
file finds it; renaming it on each version means editing everything that uses it, and a wrong
rename breaks the build. So a code file is named plainly for the answer it produces, inside the
folder that gives it its domain and layer:

    MoneyKeel/engines/retirement/depletion-age-solver.ts
    MoneyKeel/engines/retirement/depletion-age-solver.test.ts

The date, the version and the identifier live in a header block **inside** the file and in its row
in the master file — the same information, nothing breakable.

## The founder's own files

When the founder gives feedback he keeps the same filename and adds `-jj` at the end:
`..._v02-jj.xlsx`. **No script ever writes to, overwrites or renames a `-jj` file.** It is an
input of record, like his answered metrics file, and it is kept forever.

## Rules that hold everywhere

1. Named the way you would say it out loud — `net-worth`, never `nw`; `required-withdrawal`, never
   `rmdUtils`.
2. Named for the answer, not the machinery.
3. The test sits beside the thing it proves, same name plus `.test`.
4. Banned names anywhere: `utils`, `helpers`, `common`, `core`, `lib`, `misc`, `v2`, `new`,
   `final`, `temp`. Duplicate maths hides in folders named like this.
5. Only one live file per subject. Two undated files covering the same thing is a defect.
6. `README.md` is the one exempt filename: every folder carries one, saying what lives there and
   what never does.
7. All standards documents sit in a `standards` folder. Nowhere else.

## Guards to be built (not yet true)

- The build fails on any filename that breaks this pattern.
- The build fails if a dated file appears outside `archive/`, or an undated one inside it.
- The build fails if two live documents cover the same subject.
- The build fails if any live file imports from an old folder location.

## Still to decide

The repository already has a `docs/` folder holding 81 files. Keeping both `docs/` and
`documents/` recreates exactly the confusion this document exists to end. Recommendation: `docs/`
is folded into `documents/` during the move, and only `documents/` survives.
