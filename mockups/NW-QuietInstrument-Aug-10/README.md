# Net worth — "Quiet Instrument" rebuild · 2026-08-10

The founder sent a Claude Design handoff for the Net worth main screen, plus a page of his own
corrections written the same day. This folder holds both, what I built from them, and the audit.

## What is in here

| File | What it is |
|---|---|
| `networth-quiet-instrument-handoff-1b-2026-08-10.dc.html` | **The handoff, exactly as received** (Claude Design option "1b — Quiet Instrument"). Do not edit. |
| `handoff-README-2026-08-10.md` | The handoff's own written spec — copy, tokens, calculations, navigation map. Do not edit. |
| `founder-notes-NW-screen-2026-08-10.docx` | The founder's page of corrections ("NW Main Screen"), same day. Do not edit. |
| `ios-frame.jsx` | The handoff's device-frame helper. Presentation only; not part of the spec. |
| `networth-quiet-instrument-v1-2026-08-10.html` | **Mock v1 — the handoff drawn as received**, extended to all six data states (A with data · A2 by institution · B collapsed · C first day · D banner · E change walk · F fix sheet). |
| `networth-quiet-instrument-v2-BUILD-SPEC-2026-08-10.html` | Mock v2 — what I proposed on 2026-08-10, with the differences from v1 and the reason for each written on the page. Superseded by v3; kept as the trail. |
| `networth-quiet-instrument-v3-BUILT-2026-08-11.html` | **Mock v3 — THE CURRENT ONE.** The screen as built after the founder's six decisions (bar replaces donut, debt bar, cushion bar, biggest-first, cash-flow row deleted, day-one buttons). |
| `NW-quiet-instrument-audit-2026-08-10.xlsx` | The mock-match audit (founder standing order, all five steps): founder notes → where each landed · mock-vs-build diff with the coverage line · defects found · open founder calls · appearance audit. |

## Why three versions exist

The handoff could not know this app. Three of its choices collided with decisions already approved
here, so v2 kept the approved one and said so on the page; the founder then ruled on each
(2026-08-11) and v3 is the result:

- the handoff turned the hero into a solid green block; the white hero card with the green band and
  green number was approved on 2026-08-04, so it stays (v1 shows the alternative);
- the handoff replaced the donut with a stacked bar and the founder's notes of the same day asked for
  the donut *with labels on it* — so v2 kept the donut, and the founder then decided (Q6) that the
  **bar replaces the donut** after all. v3 has the bar, and What you owe and the cushion gained bars too;
- the handoff sends the change line and the debt rows to separate screens; in this app they open the
  approved walk sheet and the one debt editor — same destination, less travel.

Everything structural in the handoff **was** adopted: the flat continuous ledger, one shared right
edge for every number, collapsible institutions, and the left-justified grouping buttons.

## Status

Built and on the branch; gates green (1490 tests, types clean, UI-test gate). **Not** in a build —
no build is cut without an explicit "cut the build".

All six open questions were **answered on 2026-08-11** and built the same day — see the audit
workbook's *Round 2 — your decisions* tab. The mock-match diff after those decisions is
**240 of 253 lines identical and in order**, with every remaining line accounted for and no
unexplained differences. One reversible call of mine is flagged there for a look: the debt bar shows
whole percentages (99% / 1%) rather than the handoff's one decimal place (98.6% / 1.4%), so both bars
on the screen read the same way.
