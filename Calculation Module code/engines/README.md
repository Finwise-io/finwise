# FROZEN — 2026-08-27

**Nothing new goes in this folder.** Founder ruling, 2026-08-27.

The eleven files here still run and are still swept into the master file, so every function in them
keeps its identifier and its row. They are frozen, not deleted: a figure on a screen still depends
on them, and moving them is its own piece of work with its own tests.

**New calculations go in `MoneyKeel/functions/<domain>/`** — one family per file, its test beside
it, named by the answer it produces.

Why this folder is frozen rather than kept: two live folders both called "engines" is how one name
came to mean two different things. `moneyWeightedReturn` exists here AND in `src/domain/performance`,
and they are different methods — an internal rate of return in one, Modified Dietz in the other.
That is finding A13, and a second live engines folder would keep making more of them.

The word "engine" itself was decommissioned by `moneykeel_naming_spec_calculation-vocabulary_v01.md`
on 2026-08-25. This folder keeps the name only because renaming it would break every import.
