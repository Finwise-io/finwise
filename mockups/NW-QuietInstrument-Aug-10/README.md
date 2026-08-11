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
| `networth-quiet-instrument-v2-BUILD-SPEC-2026-08-10.html` | **Mock v2 — the build spec.** What was actually built, in the app's real tokens, with the differences from v1 and the reason for each written on the page. |
| `NW-quiet-instrument-audit-2026-08-10.xlsx` | The mock-match audit (founder standing order, all five steps): founder notes → where each landed · mock-vs-build diff with the coverage line · defects found · open founder calls · appearance audit. |

## Why v1 and v2 both exist

The handoff could not know this app. Three of its choices collide with decisions already approved
here, so v2 keeps the approved one and says so on the page:

- the handoff turns the hero into a solid green block; the white hero card with the green band and
  green number was approved on 2026-08-04, so it stays (v1 shows the alternative);
- the handoff replaces the donut with a stacked bar; the founder's notes of the same day ask for the
  donut *with labels on it*, so the donut stays and gained direct labels;
- the handoff sends the change line and the debt rows to separate screens; in this app they open the
  approved walk sheet and the one debt editor — same destination, less travel.

Everything structural in the handoff **was** adopted: the flat continuous ledger, one shared right
edge for every number, collapsible institutions, and the left-justified grouping buttons.

## Status

Built and on the branch; gates green (1479 tests, types clean, UI-test gate). **Not** in a build —
no build is cut without an explicit "cut the build". Six open questions sit on the audit workbook's
*Open founder calls* tab.
