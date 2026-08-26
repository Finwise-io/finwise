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
