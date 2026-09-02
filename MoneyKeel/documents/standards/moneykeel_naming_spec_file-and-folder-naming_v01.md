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
| `MoneyKeel/functions/` | Every calculation the app makes, one family per file, its test beside it | Screens, wording, colours |
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
7. `audit` — verification records: per-build device-test sheets, audit findings and outcomes.
   Added by the founder 2026-09-01: checking the work is its own kind of paper, and filing test
   sheets under `standards` (or the old `docs/`) hid the record of what was verified.

### Where the founder placed the shared machinery (2026-08-22)

| Subject | Folder | Why |
|---|---|---|
| How assets are classified | `standards` | It is a rule about what counts as what |
| Decimal arithmetic — what rounds, what stays whole | `standards` | It is a rule about how numbers are held |
| What each institution's words mean (Sweep out, Redemption…) | `standards` | It is the translation table |
| Tax | `other` | It serves several screens |
| The ledger engine | `networth-and-performance` | Founder's ruling |

A rule has two homes and one identifier: the **written rule** in `documents/standards/`, and the
**code that obeys it** in `functions/standards/`.

## Naming a document

    [Domain]_[Layer]_[Type]_[Descriptor]_[Version].[ext]

and once it is superseded, the same name with its date in front:

    YYYY-MM-DD_[Domain]_[Layer]_[Type]_[Descriptor]_[Version].[ext]

| Field | What it is | Values |
|---|---|---|
| Date | Only on superseded copies, in `archive/`. **The live file carries no date.** | `2026-08-22` |
| Domain | The product | `moneykeel` (older files keep `finwise` until next touched) |
| Layer | What kind of work it is | `naming` standards and dictionaries · `calc` maths and engines · `data` schemas and contracts · `pres` screens and mockups |
| Type | What the artifact is | `spec`, `enum`, `engine`, `formula`, `schema`, `master`, `audit`, `mock`, `mockup`, `component` |
| Descriptor | **The only part you invent** — see the rule below | `will-money-last`, `monte-carlo-simulator` |
| Version | Lifecycle | `v01`, `v02`, `draft`, `final` |

`audit` was added 2026-09-01 with the folder of the same name — a test sheet is not a spec,
and rule 5 would otherwise force it into `standards`.

`master` was added 2026-08-28 (founder). It is the one workbook that carries every metric, input and
function on one page — `moneykeel_calc_master_calculation-master_v01.xlsx`. It existed before the
pattern did and had no type that fitted; naming it `schema` would have been a lie about what it is.

Examples: `moneykeel_naming_spec_retirement-metrics-dictionary_v01.md` ·
`moneykeel_data_schema_plan-inputs-contract_v02.json` ·
`archive/2026-08-19_moneykeel_naming_spec_retirement-metrics-dictionary_v01.md`

### The descriptor is the only part you invent — and there is one rule for it

Every other field is picked from a fixed list. The descriptor is written fresh each time, so it is
the only place a name can go wrong, and this single rule governs it:

**Write it the way you would say it out loud, naming the answer rather than the machinery.**
`net-worth`, never `nw`. `required-withdrawal`, never `rmd-utils`. `depletion-age-solver`, not
`sim-helper-2`.

**The same one rule names folders and code files**, which carry no pattern at all — a folder is just
a descriptor, and a code file is a descriptor plus its extension. So there is one naming judgement
in the whole system, used in three places:

| What | Pattern | Descriptor rule |
|---|---|---|
| Document | Full pattern | Applies to the descriptor field |
| Folder | No pattern — the name is the descriptor | Applies |
| Code file | No pattern, no date, no version | Applies |

## Naming code — the one deliberate exception

**Code files carry no date and no version in their name.** A code file's name is how every other
file finds it; renaming it on each version means editing everything that uses it, and a wrong
rename breaks the build. So a code file is named plainly for the answer it produces, inside the
folder that gives it its domain and layer:

    MoneyKeel/functions/retirement/depletion-age-solver.ts
    MoneyKeel/functions/retirement/depletion-age-solver.test.ts

The date, the version and the identifier live in a header block **inside** the file and in its row
in the master file — the same information, nothing breakable.

## The founder's own files

When the founder gives feedback he keeps the same filename and adds `-jj` at the end:
`..._v02-jj.xlsx`. **No script ever writes to, overwrites or renames a `-jj` file.** It is an
input of record, like his answered metrics file, and it is kept forever.

## Rules the pattern does not cover

1. The test sits beside the thing it proves, same name plus `.test`.
2. Banned names anywhere: `utils`, `helpers`, `common`, `core`, `lib`, `misc`, `v2`, `new`,
   `final`, `temp`. Duplicate maths hides in folders named like this.
3. Only one live file per subject. Two undated files covering the same thing is a defect.
4. `README.md` is the one exempt filename: every folder carries one, saying what lives there and
   what never does.
5. **Every specification lives in a `standards` folder.** If the type field says `spec`, the file
   sits in `standards` — never in `other`, never beside the thing it specifies. Founder, 2026-08-22.

## Guards to be built (not yet true)

- The build fails on any filename that breaks this pattern.
- The build fails if a dated file appears outside `archive/`, or an undated one inside it.
- The build fails if two live documents cover the same subject.
- The build fails if any live file imports from an old folder location.

## Still to decide

The repository already has a `docs/` folder holding 81 files. Keeping both `docs/` and
`documents/` recreates exactly the confusion this document exists to end. Recommendation: `docs/`
is folded into `documents/` during the move, and only `documents/` survives.
