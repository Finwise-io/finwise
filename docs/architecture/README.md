# Architecture

| Document | What it covers |
|---|---|
| [MoneyKeel-tech-architecture-v1-2026-08-18.html](MoneyKeel-tech-architecture-v1-2026-08-18.html) | The whole app as eleven modules in four layers. The proposed `MoneyKeel-Latest-version/` folder structure, the two-versions-back archive scheme and the three fences that stop archived code being compiled, tested or imported. The module-by-module move order. |

**Live artifact:** https://claude.ai/code/artifact/51826ab7-f52f-4f82-a46d-c07c348024a8

## The map is generated, never hand-edited

    node "Calculation Module code/scripts/module-map.mjs"

It reads every file off disk and reports the modules, their file counts and their dependency edges.
The numbers in the document came from that command, so a hand-edit would be a number nobody can
reproduce. Regenerate it and update the document rather than typing a correction into it.

## Founder decisions recorded 2026-08-18

- The eleven module names stand as listed.
- `src/` disappears once the last module has moved — two places to look is the problem being solved.
- Archives are written **per release**, not per commit, and match the build number. Two are kept.
- The Calculation Module is finished **before** the move: the probes are the only evidence the move
  changed no behaviour, and they cover 105 of 158 formulas today.
