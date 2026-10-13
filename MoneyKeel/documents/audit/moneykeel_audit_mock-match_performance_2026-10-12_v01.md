# Mock-match audit — the Performance module, 2026-10-12, v01

**What this is.** Every Performance screen compared with its approved drawing, word by word, figure by figure and style by style, on the code as committed at **02adb375** (the 2026-10-12 decisions DEC-4640 … DEC-4646). Method: `docs/MOCK-MATCH-AUDIT-STANDING-ORDER.md`. Template: the Net worth audit of 2026-10-11, v02.

**Drawings in scope.**
- `moneykeel_pres_mock_performance_v17.html` — phones 1, 3, 4 and 5 (approved 2026-10-01, DEC-0647).
- `moneykeel_pres_mock_look-back_v01.html` — states A and B (approved 2026-10-02, DEC-1069).
- `moneykeel_pres_mock_holding-detail_v02.html` — phones A, B and C (approved 2026-10-01, DEC-0650).
- Each drawing's READ THIS FIRST rows, including the rows of 2026-10-12 (DEC-4640, 4641, 4643, 4645, 4646). The design record (`moneykeel_pres_spec_design-each-screen-was-built-from_v01.md`) confirms these three are current.

**Out of scope, on purpose.**
- v17 phone 2, the account page: its figures do not add up; it is the redraw row of 2026-10-11.
- Look ahead v04 belongs to the What-if screen; the design record traces it with that screen.

**How it was done.**
- **The drawing.** Opened in headless Chrome; every visible text read with `innerText`, and every text's computed colour, size and weight. Change-mark badges (their pink and white) were not compared.
- **The build.** Rendered with jest on the drawing's own day: Sep 30, 2026 for phone 1, Aug 4, 2026 for phones 3 to 5, Oct 1, 2026 for Look back and Holding detail. The graph was given a phone's width so it draws.
- **The household is the drawing's.** For phone 1: $100,000 became $123,000, $15,000 added, +0.41% over the month, +4.90% this year, Stocks / Funds +6.10%. For phone 3: $38,000 became $52,704, +0.90%, +4.30%, +7.80%, +7.30% a year, +16.24% since. So figures are compared as figures, not as "a figure here".
- **The diff.** Line by line (difflib). Then the rendered style of every line that matched.

**Classes.** (a) the code was wrong — fixed, held by a test. (b) a READ THIS FIRST row says so. (c) decided here on a standard or another approved drawing, said below. Nothing needs the founder.

---

## Coverage, by phone

Status bar, top bar and tab bar left out; the navigator draws them.

| Drawing · phone | After the fixes | Before (same household, same method) |
|---|---|---|
| Performance v17 · 1, a window refused, money added | 64 of 82 identical; 14 different; 4 missing; 0 extra — (b) ×5, (c) ×9; the two drawn "›" now built; missing = 3 gridline figures (c) and the mark-16 sentence (b) | 63 of 82; 16 different; 3 missing; 1 extra |
| Performance v17 · 3, day one of a linked account, 26 months rebuilt | 57 of 66 identical; 5 different; 4 missing; 0 extra — (b) ×1, (c) ×4; missing = 4 gridline figures (c) | 54 of 66; 8 different; 4 missing; 2 extra |
| Performance v17 · 4, day one, typed by hand | 99 of 100 identical; 1 different ("E*TRADE Brokerage", (c)); 0 missing; 0 extra | same words; 9 styles wrong |
| Performance v17 · 5, no accounts | 60 of 60 identical; 0 different; 0 missing; 0 extra | same words; 8 styles wrong |
| Look back v01 · A, with prices | 19 of 22 identical; 2 different (+2.50%, +16.00%: two decimals, Q49); 1 missing (the typed $20,000 sits in a box); 8 extra (AGG, GLD, BTC, AOR twice: DEC-1624) | same |
| Look back v01 · B, no prices that far back | 17 of 18 identical; 0 different; 1 missing (the typed amount); 8 extra (DEC-1624) | same |
| Holding detail v02 · A, priced | 33 of 49 identical; 14 different; 2 missing; 0 extra — (b) ×5 (DEC-1559, DEC-4529, DEC-4645, row 2026-10-04), (c) ×9 (Q49 precision, the date writer) | same words |
| Holding detail v02 · B, no live price | 14 of 18 identical; 4 different ($28,000, 0.5 coins, Jul 2, 2024: Q49 and the date writer); 0 missing | same |
| Holding detail v02 · C, sold | 15 of 16 identical; 1 different ("(4.05%)", Q49); 0 missing | same words; 1 colour wrong |

The word-for-word test now compares figures too: `src/screens/__tests__/perf_mock_match_2026_10_12.test.tsx` renders phones 1, 3, 4 and 5 on their own day and fails on the first word or figure that differs. Each remaining difference is listed in it with its reason and must still be found.

---

## (a) — fixed, each held by a test in `perf_mock_match_2026_10_12.test.tsx`

| # | Fix | Example | Before | Now |
|---|---|---|---|---|
| 1 | Two notes on one line, a "·" between | Phone 3, under the summary | Two rows: "… — not a yearly rate ⓘ", then "time-weighted, so money you added never counts as return ⓘ", no "·" | One line: "… — not a yearly rate ⓘ · time-weighted, so money you added never counts as return ⓘ". Same for "Earned = dividends + interest received in this window ⓘ · a /year figure is that category's yearly pace ⓘ" (phones 1 and 3) |
| 2 | Window control colours | Phone 1: "1M +0.41%"; "1Y —"; phone 4 "Since today —" | "1M" grey #6B6B66; "1Y" and its "—" #76766F, the same grey as a window that answers; the chosen "—" turned grey | "1M" #76766F; "1Y" #A8A8A2 and its "—" #C2C2BB (two new theme colours for a window that cannot be used); the chosen "—" green #0F6E56 |
| 3 | The date and the summary labels | "Aug 4, 2026"; "Ending value", "Wealth generated", "Return" | 11 pt | 13 pt (drawn 12; the one type scale rounds 12 up to 13, DEC-0059) |
| 4 | Walk weights | Phone 3: "Wealth generated $6,904", "Ending market value (Aug 4, 2026) $52,704" | labels 800, figures 800 | labels 700, figures 900 |
| 5 | Money taken out is not a loss | Phone 3: "Withdrawals −$1,200" | red #A32D2D | text colour #1A1A18, as drawn (the Net worth walk had the same defect, fixed 2026-10-11) |
| 6 | The quiet notes' grey; the rebuilt line's size | "Day one: your value is real…", "2Y is shown per year…", "Tap ▾ to collapse…"; "↺ Rebuilt from E*TRADE's own records, back to Jun 3, 2024…" | #76766F; the rebuilt line 11 pt | #6B6B66; the rebuilt line 13 pt |
| 7 | Category table | Phone 4: "CATEGORY · EARNED · RETURN", "Stocks / Funds $0 —", "All categories $0" | headings #76766F, EARNED and RETURN 800; "$0" in the platform's black; "—" #76766F; "All categories" 800, its figure 800 in black | headings #6B6B66, EARNED and RETURN 700; "$0" #1A1A18; "—" #6B6B66; "All categories" 700, its figure 900 in #1A1A18 |
| 8 | Graph dates over a year name the year | Phone 3, a 26-month line | "Jun 3" … "Aug 4" | "Jun 3, 2024" … "Aug 4, 2026". Phone 1's year-long line still reads "Oct 1" … "Sep 30", as drawn |
| 9 | The gridlines hold the whole line | Phone 3, values $38,000 to $52,704 | $35,000 · $40,000 · $45,000 · $50,000: the line ran $2,704 above its own top gridline | $30,000 · $40,000 · $50,000 · $60,000. Phone 1 ($100,000 to $123,000) unchanged: $100,000 … $130,000 |
| 10 | Day-one frame | Phone 4: "$354,314 ── your line starts today" | #6B6B66 | #76766F, the chart's own label grey (drawn `.axlab`) |
| 12 | "›" on each account bar, as drawn | Phone 1: "▾ VANGUARD BROKERAGE $101,000 ›", "▸ E*TRADE … $22,000 ›"; phone 4 both bars | No arrow; only the underlined name opened the account | "›" after each account bar's total; it opens that account's page (phone 2). None on the all-accounts bar or the category rows: they open nothing approved (DEC-0128). |
| 13 | Every figure on one right edge (DEC-0093) | Phone 1: bar total "$101,000" against the walk's "$80,000" below it | The bar total sat 12 points left of the walk's figures (the card's inset was added twice) | Every money row ends in the same 16-point right column, holding "›" only on an account bar. Bar totals, walk figures, Return rows and category returns all end on one edge. |
| 11 | Holding detail, sold | Phone C: "Holding liquidated — all shares sold. Its history is kept below." | no colour set: the platform's black #000000 | #1A1A18 |

Files: `src/screens/PerformanceScreen.tsx` (1–7, 12, 13), `src/components/SectionBand.tsx` (12, 13: an exact right column and an optional "›"; other screens unchanged), `src/components/ValueGraph.tsx` (8–10; it also draws the account page's line), `src/screens/HoldingDetailScreen.tsx` (11), `src/utils/theme.ts` (the two greyed-window colours). No calculation function changed, so no function rule or outside test card moved.

Each test was run against the code before the fixes and failed, as it should, except the phone 4 and 5 word tests, whose words were already right. The arrow and right-edge tests (5) fail on the code before fixes 12 and 13.

---

## (b) — a READ THIS FIRST row says so

- **Phone 1.**
  - "Since Oct 1 7.46%/year" and the trio's "7.46%" now read "+7.46%"; Vanguard's "6.88%/year" reads "+6.88%". DEC-1669 (2): no rate per year stands in.
  - The mark-16 sentence is gone from the summary and from Vanguard's walk; the summary reads the ordinary window note. DEC-1669 (2).
  - Checked by hand: the household's time-weighted returns are 7.46% and 6.88%, so the drawn figures stand.
- **Phone 3.** "money-weighted" reads "time-weighted". DEC-1669 (1).
- **Look back.** AGG, GLD, BTC and AOR are offered: DEC-1624.
- **Holding detail A.**
  - "$0 — nothing sold": DEC-1559.
  - "held 1 yr or less": row 2026-10-04.
  - "+$7,384 / +$1,974": the DRAWING ERROR row of 2026-10-11, DEC-4529.
  - "both include dividends and interest": the DRAWING ERROR row of 2026-10-12, DEC-4645.

## (c) — decided here, and why. Reversible in one word.

| Drawn | Built | Decision and reason |
|---|---|---|
| Bar totals at 12 pt ("$101,000" on VANGUARD BROKERAGE) | 15 pt | Kept at 15. It is one bar, shared with Net worth, whose approved v08 draws its totals at 15. One bar, one size. |
| "Linked" and "✍️ By hand · you update it" as plain grey text | the source chip "🔗 Linked", green on light green | Kept the chip. Net worth v08 draws it so, under his ruling of 2026-09-14 ("linked / link again"). One chip everywhere. |
| "›" after the all-accounts bar and each category row | no arrow there | They open no approved screen; an arrow that points nowhere is a defect (DEC-0128). The account bars' arrows ARE built (fix 12). Dated row added to v17's READ THIS FIRST. |
| "Oct 1", "(Sep 30)", "SINCE OCT 1" | "Oct 1, 2025", "(Sep 30, 2026)", "SINCE OCT 1, 2025" | One date writer: a date outside this year carries its year. Phone 1 itself writes "SINCE OCT 1, 2025" on its summary bar. |
| Cash "2.50%/year"; a linked bond "4.20%/year" | "—" | The app holds no rate for cash, and a bond inside a linked account states none. A bond held as its own account prints its rate. |
| "E*TRADE ACCOUNT 1" | "E*TRADE Brokerage" | The account-name rule of 2026-08-11: a taxable account with no last four reads institution + Brokerage. |
| Phone 3 closed line "Linked · wealth generated $6,904 since Jun 3, 2024" | "… · return +16.24%" | One line, worded as phone 1 words it; phone 1's is the one v17 marks as new. |
| Gridline figures $125,000 · $115,000 · $105,000 (3 lines); $54,000 … $36,000 | four round lines that hold the line | The app works its gridlines out from the data. The drawn ones are illustrative: $105,000 sits above phone 1's own $100,000 start. |
| The phones disagree with each other (dated row added to v17's READ THIS FIRST, with the 15-pt total and the Linked label) | the majority, applied once | Walk sub-figures green on phone 1 only, black on 3, 4, 5: black. Category figures 600 on phone 1, 700 elsewhere: 700. "All categories" figure green 900 / black 700 / black 900: black 900. Stocks return green on phone 3 only: black. "Cash in this account ⓘ" dot on phone 1, not phone 3: kept. |
| Holding detail B: "NO LIVE PRICE — SHOWING WHAT YOU PAID" in grey | amber | The drawing's own caption calls it "an amber kicker". The caption wins over its CSS. |
| Look back: "Facts about the PAST only" #9A9A94; chosen chips #0E5E47 | #76766F; #0F6E56 | Neither drawn colour is an app colour. v17 says "every colour is the app's own token", so the nearest token stands. |

**Drawing arithmetic (DEC-4529).** No error found, so no correction row was added.
- **Phone 1.** 80,000 + 20,000 = 100,000. 1,500 + 300 = 1,800. 200 + 200 = 400. 4,300 + 1,500 = 5,800. 6,000 + 2,000 = 8,000. 101,000 + 22,000 = 123,000. 100,000 + 15,000 + 8,000 = 123,000. 1,800 + 400 = 2,200. E*TRADE: 2,000 ÷ 20,000 = 10.00%.
- **Phone 3.** 38,000 + 9,000 − 1,200 + 6,904 = 52,704. 1,180 + 520 + 5,204 = 6,904. 1,180 + 300 + 220 = 1,700, and 300 + 220 = 520. 1.073² = 1.1513, so the 2Y window's 15.13% fits inside Since's 16.24%.
- **Phone 4.** 301,610 + 52,704 = 354,314.
- **Look back.** 20,000 × 1.025 = 20,500. 20,000 × 1.16 = 23,200. The difference is 2,700.
- **Holding detail.** 140 × $241.84 = $33,857.60. 38.19 − 22.40 = 15.79, shown 15.8. The gain split already has its row.

## Appearance — rendered values against the drawing (after the fixes)

| Element | Drawing | Built | Result |
|---|---|---|---|
| Dark bars | #085041, 10.5/800, white, capitals | #085041, 11/800, white, uppercase | identical (10.5 is 11 on the scale) |
| Hero trio figures | 20/800; #0F6E56 ending, #006300 gains, #76766F day-one dashes | same | identical |
| Walk rows | 13; sub-labels #6B6B66; figures 700 | same | identical |
| Walk total and strong rows | label 700, figure 900, ending figure #0F6E56 | same | identical (fix 4) |
| Window control | tray #EEEEE9, chosen white, labels 11/700, figures 13/800 | same | identical (fix 2) |
| Category rows | 13.5 → 13; earned #006300 700 | 13; #006300 700 | identical |
| Notes | 11, #6B6B66 | 11, #6B6B66 | identical (fix 6) |
| Holding detail A | every matched line | — | identical, 33 of 33 styles |
| One right edge | the drawing's walk at 396 px, bar totals and category returns at 378 | every figure ends at the same 16-pt right column; "›" in it on account bars | one edge (fix 13); the drawing's own CSS has two |
| Bars, square corners, edge to edge | top-left radius 0 | 0, margin −12 to the card's edge | identical |

## What could not be checked

- **On a phone.** Device fonts, pixel widths, and where the one-line notes wrap at 390 points. To check: a TestFlight screenshot of phones 1 and 3.
- **The graph's drawing.** The gridline figures are drawn inside the chart picture, which a test render does not print. The rule behind them is tested directly (fix 9), and the line itself was not looked at.
- **Shadows** on the chosen window, and the hairline dividers.
