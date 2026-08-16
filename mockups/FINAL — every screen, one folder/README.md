# FINAL mock-ups — one folder

**Built 2026-08-14.** Every mock-up that is the *current, final* version of its screen, copied here
from wherever it lived. **Nothing was moved or deleted** — the originals stay where they are, because
the mock-first rule keeps superseded versions. This is a reading copy.

There were **150 mock files** across nine folders, most of them superseded drafts (twenty-one
versions of one net-worth screen, ten of another). **These 34 are the ones that still stand.**

---

## Net worth — the authoritative numbered set

The founder's standing order of 2026-08-03: this set is THE one authoritative net-worth mock set,
drawn from shipping code plus approved deltas. Refreshed into the August-10 folder.

| File | Screen |
|---|---|
| `01-networth-main.html` | The main screen, three grouping states |
| `02-add-or-connect-chooser.html` | Add or connect |
| `03-account-sheet.html` | The account sheet |
| `04-debt-editor.html` | The one repayment-shaped debt editor |
| `05-account-detail-whole.html` | An account, whole |
| `06-account-detail-class-slice.html` | An account, one asset class |
| `07-account-detail-matured-cd.html` | A matured CD |
| `08-itemize.html` | Itemising a balance into holdings |
| `09-import-holdings.html` | Importing holdings from a file |
| `10-connect-flow.html` | Connecting an institution |
| `11-bond-alt-editors.html` | **Editors** for bonds, options, crypto, commodities, private equity, hedge funds |
| `12-networth-quiet-instrument-BUILT.html` | The built look — v5, the visual direction that shipped |
| `13-networth-CLAUDE-DESIGN-latest.html` | **Claude Design's own delivered file** — their latest net-worth screen |

## Performance

| File | |
|---|---|
| `22-performance-CLAUDE-DESIGN-latest.html` | **Claude Design's own delivered file** — their latest |

*(Our own August-4 `performance-FINAL` draft is deliberately NOT here. Claude Design's August-11
handoff supersedes it, and two files called "final" for one screen is the exact confusion this
folder exists to remove.)*

## Plan

| File | |
|---|---|
| `30-plan-hub-v9-AS-SHIPPED.html` | The hub that is **built and shipping** — v9 of nine |
| `31-plan-spend-more-plain-english.html` | "Can I spend more?", founder-approved frames B and C |
| `32-plan-CLAUDE-DESIGN-v3-SUPERSEDED-BY-v4-NOT-ON-DISK.html` | Claude Design's **v3** — see the warning below |

> ### ⚠️ Claude Design's Plan **v4** is not on disk
>
> The v4 drawing and its requirements note arrived through chat on 2026-08-14 and **were never saved
> into the handoff folder**. The Plan file sitting on disk is still **v3** — no sub-tabs, no "future
> simulations" wording, none of the corrected numbers, none of the formula-driven dials.
>
> I nearly filed that v3 file here labelled as v4. It is named for what it actually is instead.
>
> **Please save Claude Design's v4 files** (`Plan.dc.html` and `Plan-v4-requirements.md`) into
> `August 14th Design/Claude-Design-handoff-received-2026-08-13/`, and this folder can carry the real
> one. Note that even v4 is **not final** — the review found five corrections still outstanding.
>
> Meanwhile the current Plan surface is specified by the written brief in `August 14th Design/`, not
> by any file in this folder.

## Account and holding

| File | |
|---|---|
| `40-account-detail-v2.html` | v2 |
| `41-holding-detail-full-v2.html` | The holding screen — **stock only**, see the gaps below |
| `42-matured-bond-banner.html` | |
| `43-invest-add-record-router.html` | Adding a record |

## Cash flow, Home and the rest

`50-cashflow-4tabs` · `51-home-v2` · `52-home-investments-card` · `53-lookahead` ·
`54-income-popup-v2` · `55-big-costs` · `56-return-breakdown` · `57-jobsafety-rebuild`

## The shared language every screen obeys

`60-chart-palettes-v2` (the colourblind-validated palette) · `61-staleness-stamps-v2` ·
`62-separator-dots` · `63-brand-wordmark`

## Approved wireframes

`70-wireframes-home-networth` · `71-wireframes-invest` — from detailed design v1.1.

---

# What is NOT here, and should be

**This is every final mock that EXISTS. It is not every screen.** The app has around fifty screens
and this folder holds thirty-four mocks, several of which are shared language rather than screens.
The gaps below are real and worth knowing before anyone treats this folder as complete.

### Holding screens for six of the seven asset types

`41-holding-detail-full-v2.html` covers a **stock**. An **ETF** is assumed to behave the same way,
but was never drawn separately.

**Bonds and CDs, options, crypto, commodities have an EDITOR mock (`11`) and no holding screen.** An
editor is the form you type a holding into; a holding screen is what you land on when you tap it.
They are different things, and a bond genuinely needs what a stock's screen has nowhere to put —
coupon, maturity date, yield to maturity, accrued interest.

**Currency has nothing at all, and the app has no currency asset type.** That is a feature that does
not exist, not a drawing that is missing.

**Bonds and CDs are the gap worth closing first** — the app already holds bond-specific data with
nowhere to show it, and this audience is far likelier to hold a CD than an option.

### Screens with no mock of any kind

Among them: `contribution-room`, `idle-cash`, `worth-a-look`, `savings`, `sharpen`, `ss-timing`,
`stress-test`, `tax-organizer`, `estate`, `insurance`, `credit`, `education`, `multi-goal`,
`what-if`, `will-it-last`, `look-back`, `month-detail`, `paycheck-months`, `required-withdrawals`,
`roth`, `bill-calendar`, `onboarding`, `first-run`, `settings`.

Some were built before the mock-first rule existed (2026-07-19) and have never been redrawn. That is
not automatically a problem — but it does mean "does the built screen match the mock?" cannot be
asked of them, because there is nothing to match against.

---

## How each file was chosen

Where several versions existed, the final is the one that is either **numbered highest**, **marked
FINAL or BUILT**, or **most recently dated** — in that order of authority. Twenty-one versions of
`nw-vs-performance-mains` and ten of `networth-final` collapsed to the single `-FINAL` of each.
Nothing was judged on looks; only on what the trail says was settled.
