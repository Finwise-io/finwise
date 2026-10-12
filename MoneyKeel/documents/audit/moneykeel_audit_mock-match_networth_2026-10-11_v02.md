# Mock-match audit — the Net worth module, 2026-10-11, v02 (re-run)

**What this is.** The same audit as v01 (`moneykeel_audit_mock-match_networth_2026-10-11.md`, kept), run again on the code as committed at **c40588f3**, after DEC-4036, DEC-4059, DEC-4082, DEC-4105, DEC-4327, DEC-4350, DEC-4439 and the Performance fixes. Every screen was rendered again and compared again, word by word and figure by figure. Method: `docs/MOCK-MATCH-AUDIT-STANDING-ORDER.md`.

**How it was done this time.**
- **The drawing.** Each drawing was opened in Chrome (headless) and its visible text read with the browser's own `innerText`. That applies the drawing's CSS capitals, so a bar is compared in capitals exactly as drawn. Change-mark badges were removed; the drawn "i" is the ⓘ.
- **The build.** Rendered with jest and @testing-library/react-native, on the clock of the drawing's own day: **Aug 11, 2026** for Net worth, **Sep 14, 2026** for Add an account (the drawing's "value as of" day), **Oct 1, 2026** for Bonds, Alternatives and Holding detail. Every visible Text node was dumped in order with its rendered colour, size, weight and case.
- **The diff.** Line by line (difflib). A line is "identical" only if every word and every figure is the same. Figures are not masked.
- **The households** are v01's (the drawing's own data). Two fixture corrections, both because the fixture, not the app, was short:
  - State D: E*TRADE's last sync is **Jul 28** (the drawing's date), not "8 days ago".
  - Holding detail phone 1: the price lists now hold the close on **the day before** the window opens (the period's start is the close the day before, a Performance fix). Without it the lists fell back to a close 26 months old.

**Classes.** (a) the code is wrong against the drawing or a READ THIS FIRST row — fixed here, held by a test. (b) explained by a READ THIS FIRST row — the row is cited. (c) the drawing's own fault, or a change with no row — listed for the founder with the exact words.

---

## Coverage, by screen and state

The status bar, the top bar and the tab bar are left out, because the navigator draws them.

| Screen · state | Coverage (after the fixes below) | Before the fixes |
|---|---|---|
| Net worth v08 · A with data, by category | 57 of 59 identical; 2 different; 0 missing; 3 extra — all (b) | same |
| Net worth v08 · A2 by institution | 57 of 59 identical; 2 different; 0 missing; 3 extra — all (b) | same |
| Net worth v08 · B collapsed, down case | 38 of 41 identical; 3 different; 0 missing; 3 extra — (b) ×5, (c) ×1 | same |
| Net worth v08 · C first day | 36 of 36 identical; 0 different; 0 missing; 0 extra | same |
| Net worth · brand-new account (nothing at all, no sign-up answers), against C | 36 of 36 identical; 0 different; 0 missing; 0 extra | same |
| Net worth v08 · D missing-data banner, LCTX new today | 38 of 38 identical; 0 different; 0 missing; 0 extra | 37 of 38; return **+0.80%** |
| Net worth v08 · D, LCTX priced $1,930 on the start day | 38 of 38 identical; 0 different; 0 missing; 0 extra | 37 of 38; return **+0.26%** |
| Net worth v08 · D, LCTX at its $965 cost on the start day | 38 of 38 identical; 0 different; 0 missing; 0 extra | same |
| Net worth v08 · E change walk | 18 of 20 identical; 2 different; 0 missing; 0 extra — (c) | same |
| Net worth v08 · F fix sheet | 9 of 10 identical; 1 different; 0 missing; 0 extra — (c) | same |
| Net worth v08 · G add sheet | 7 of 7 identical; 0 different; 0 missing; 0 extra | same |
| Net worth · one account with no balance (Ally CD; rows of 2026-10-09) | every row-stated string present: "Value not entered" on the row (by category, inside Bonds & CDs) and on the bank bar ("▾ ALLY · Value not entered"), "· Ally CD has no balance", left out of the bar; a class whose only account has no balance reads "Alternatives · Value not entered" | same |
| Net worth · one debt with no balance (rows of 2026-10-09) | every row-stated string present: hero $813,152 − $418,000 = $395,152, "DEBTS −$418,000", bar "Home mortgage 99% · Chase Visa 1%", "🧾 Personal loan · Value not entered", "· Personal loan has no balance" | same |
| Net worth · one cash account, no debts (Q48 frame 1 + v08 C) | DEBTS reads "$0" then "Nothing entered yet. Add your debts ›" | DEBTS had **no figure** |
| Net worth · rows of 2026-10-10 (DEC-4036g, DEC-4036i) | "Is this cash savings or investments? Tap to say." present; overdrawn account reads "−$100" | read **"-$100"** |
| Bonds v02 · 1 with bonds (in the soonest-first order, DEC-1558) | 26 of 33 identical; 7 different; 0 missing; 0 extra — (b) ×4, (c) ×3 | same |
| Bonds v02 · 2 first day | 7 of 7 identical; 0 different; 0 missing; 1 extra — (c) | same |
| Bonds v02 · 3 editor (drawn in part) | 21 of 23 identical; 1 different; 1 missing; 9 extra — the difference is the fixture's typed 0 in the accrued box; the missing line is ‹ Back (cut by the slice); the 9 extra are the kept fields (c) and the DEC-3390 label (b) | same |
| Bonds · a bond with no maturity date (DEC-4036b row) | "face $10,000 · 4.00% coupon · maturity date not entered", "$400/year coupon" — as the row says | — |
| Alternatives v02 · 1 with holdings | 16 of 21 identical; 5 different; 0 missing; 0 extra — (c) | same |
| Alternatives v02 · 2 first day | 7 of 8 identical; 1 different; 0 missing; 1 extra — (b) and (c) | same |
| Alternatives v02 · 3 editor (drawn in part) | 18 of 23 identical; 4 different; 1 missing; 5 extra — (b) DEC-1560/DEC-0045 for the kinds; (c) for the line under them | same |
| Holding detail v02 · 1 priced | 37 of 51 identical; 13 different; 1 missing; 0 extra — (b) ×3, (c) ×11 | same |
| Holding detail v02 · 2 no live price | 16 of 20 identical; 4 different; 0 missing; 0 extra — (c) | same |
| Holding detail v02 · 3 sold, short history | 17 of 18 identical; 1 different; 0 missing; 0 extra — (c) | same |
| Holding detail · a purchase with no price paid (row of 2026-10-11) | "100 sh @ no purchase price recorded"; gain "Not stated — a purchase has no price paid or share count on record." | read "100 sh @ No purchases recorded — the section is not drawn." and "No price today — no gain is stated at all. …" under a live price |
| Holding detail · prices that reach back two days | "Your return, past year +0.96%" beside "The market, same dates +0.33%" | the market read **+22.40%** (a whole year) |
| Add an account v02 · 1 Cash | 19 of 19 identical | same |
| Add an account v02 · 2 Stocks / Funds | 24 of 24 identical | same |
| Add an account v02 · 3 Bonds | 30 of 30 identical | same |
| Add an account v02 · 3 Bonds, name "Chase 12-month CD" | 29 of 30 identical; 1 different (the typed name); 0 missing; 3 extra — "Bought from the bank, or through a broker?", "From the bank", "Through a broker": (b) row 2026-10-10 (DEC-3837) | same |
| Add an account v02 · 3 Bonds, "Brokerage" at "CD Capital" | 28 of 30 identical; 2 different (the typed name and institution); no CD question — (b) DEC-4036c, row added today | same |
| Add an account v02 · 4 Alternatives | 29 of 30 identical; 0 different; 1 missing ("Private stake") — (b) row 2026-10-06 | same |
| Add an account v02 · 5 Real estate | 16 of 17 identical; 1 different ("Mortgage balance (optional)"); 0 missing; 3 extra ("Is this the home you live in?", Yes, No) — (b) rows 2026-10-04 | same |
| Add an account v02 · 5, the property door (`cls=property`, and from sign-up `from=onboarding`) | same 16 of 17 as phone 5: the form opens on Real estate — (b) row 2026-10-10 (DEC-4059d) and the row added today (DEC-4350) | same |
| Add an account v02 · 6 Debt | 19 of 19 identical | same |
| Account page = Performance v17 frame 2 | **needs a redraw before rebuild** — not re-compared; v01's nine differences stand, and the drawing's figures do not add up | — |

**Account editor sheet (no drawing).** Its strings, in order, rendered for four accounts:
- Chase Checking: "Edit account · What's it invested in? · Mixed / not sure · Stocks / Funds · Bonds · Cash · [Chase] · $ · [8000] · Save $8,000 · Remove"
- Ally CD (no maturity): "Edit account · Matures (CDs and dated bonds count under Bonds & CDs) · Tap to pick a date · What's it invested in? · …the same four chips… · [Ally] · $ · [10000] · Save $10,000 · Remove"
- Home and Vanguard Brokerage: the same as Chase Checking, with their own values.
- Worth the founder's eye: the Home's sheet asks "What's it invested in?" and offers Stocks / Funds · Bonds · Cash for a house.

---

## (a) — fixed here, each held by `src/screens/__tests__/mock_match_audit_2026_10_11.test.tsx` (items 6–10)

| # | Where | Before | Now | Code |
|---|---|---|---|---|
| 6 | Net worth D and F: "Meanwhile we show what you paid — it stays out of the change line" (MK-NW-M-002) | "Return on cash + investments +0.80%" (LCTX new today) and "+0.26%" (LCTX priced $1,930 on the start day) | "+0.53%" in all three cases, as D draws it | `MoneyKeel/functions/networth-and-performance/net-worth.ts` (theNetWorth MK-NW-O-003, investableChangePct): a holding valued at cost today is taken out of every day of the window. The time-weighted return engine is unchanged. This was v01's "not fixed" item 2. |
| 7 | Net worth, an account entered and no debts (Q48 frame 1; v08 C) | "DEBTS ⓘ" with no figure | "DEBTS ⓘ $0", then "Nothing entered yet. Add your debts ›" | `src/screens/NetWorthScreen.tsx` (DEBTS band) |
| 8 | Every money figure printed below zero (row 2026-10-10, DEC-4036i, "Cash −$100"; all 11 drawings write "−$", none writes "-$") | "-$100", and "-$50,000" for a negative net worth; Cash flow's figures too | "−$100", "−$50,000" | `MoneyKeel/functions/_figure-spec.ts` writeFigure (MK-XS-F-183), the one writer every figure goes through. Six Cash flow worked answers moved with it (`the-month.ts`, `this-month.ts`: "-$3,400/month" → "−$3,400/month" and five more). `e2e_walk_2026_08_11` moved to "−$50,000". |
| 9 | Holding detail, row 2026-10-11 ("each line says what is missing") | "100 sh @ No purchases recorded — the section is not drawn." · "No price today — no gain is stated at all. Not stated where …" (under a live price) | "100 sh @ no purchase price recorded" · "Not stated — a purchase has no price paid or share count on record." | `src/screens/HoldingDetailScreen.tsx` |
| 10 | Holding detail "VS THE STOCK MARKET · SAME DATES", prices that do not reach back | holding +0.96% over 2 days beside the market +22.40% over a year | the market over the same 2 days: +0.33% ($610 → $612); over 2Y, made yearly over the same span | `src/domain/performance/index.ts` buildPerformance (MK-PF-F-014) |

**The master file still has to be rebuilt.** Items 6, 8 and 10 change code that the master's functions_from_code rows and `moneykeel_figures.json` are built from (MK-NW-O-003, MK-XS-F-183, MK-PF-F-014, the six Cash flow worked answers). The build was not run here, as instructed. Until it runs, those rows describe the code before these fixes.

## (b) — explained by a READ THIS FIRST row

- **Net worth A, A2, B.** Emergency fund "2.3 months" and "$3,850/month" (drawn 2.0, $4,500), and the three lines under it: rows 2026-09-28 and 2026-10-04 (DEC-1923).
- **Bonds 1.**
  - Soonest first: DEC-1558.
  - "Yield to maturity: 7.76%" for the Treasury (drawn 4.95%): row 2026-10-08, DEC-3279, "solved exactly". Checked by hand: $531.25 in 0.25 years and $25,531.25 in 0.75 years, discounted at 7.76%, give $24,645.
  - Apple "5.25% *" and the accrued-interest note: DEC-3390.
- **Bonds 3.** The market-value label: DEC-3390.
- **Alternatives 2.** The first-day sentence: DEC-0045.
- **Alternatives 3.** The kinds: DEC-1560 and DEC-0045.
- **Holding 1.** "$0 — nothing sold": DEC-1559. "held 1 yr or less": row 2026-10-04.
- **Add an account.** Phones 3 to 5 and the property door: rows 2026-10-04, 2026-10-06 and 2026-10-10, plus the two rows added today.

## (c) — for the founder, with the exact words

| Drawing | Drawn | Built | Why |
|---|---|---|---|
| Net worth v08 B | "Return on cash + investments −0.40%" | "−0.41%" | −$1,480 ÷ $364,632 = −0.406% |
| Net worth v08 E | "Ending net worth (Aug 4)" · "Aug 3 → Aug 4, 2026" | "Ending net worth (Aug 11)" · "Aug 3 → Aug 11, 2026" | the drawn hero is dated Aug 11 |
| Net worth v08 F | "Balances may have moved in 7 days." | "… in 14 days." | Jul 28 → Aug 11 is 14 days |
| Net worth v08, CSS | bar totals at 36 px from the right, row values at 40 px | all at 36 px | the drawing breaks its own one right edge |
| Empty Debts, two approved drawings | v08 C: "Nothing entered yet." + "Add a mortgage, card, or loan ›" | Q48 frame 1 (and the build, once any account exists): "Nothing entered yet. Add your debts ›" | one empty state, two wordings; the build uses each drawing's words in each drawing's own state |
| Bonds v02 phone 1 | "· 2y" · "· 4y" · "· 1y" | "· 1y" · "· 3y" · "· 0y" | the drawn years follow no single rule |
| Bonds v02 phone 2 | (no line) | "Nothing entered yet. Add a bond ›" | Q48; there is no row on this drawing |
| Bonds v02 phone 3 | (not drawn) | "Institution / account (optional)", "Value as of", "Save", "Delete bond" | DEC-1560 "keep it"; there is no row on this drawing |
| Alternatives v02 phone 1 | "~9.00%" · "~7.00%" · "~3.50%" · "7.32%" · "$4,502" · "Commodities" | "~8.00%" · "~13.00%" · "~8.20%" · "10.06%" · "$6,187" · "Gold / commodities" | the drawn rates are in no version of the code, and 7.32% is not the blend of its own rates |
| Alternatives v02 phones 2–3 | (no line) · "Bitcoin, Ether and the rest — held at the value you set. ~9.00%/year historical benchmark." · "Annuity" | "Nothing entered yet. Add an investment ›" · "Highly volatile — size it accordingly. ~8.00%/year historical benchmark." · "Annuities" | Q48 has no row here; Add an account says "Annuity" and this editor says "Annuities", which breaks one term per concept |
| Holding detail v02 | "$33,857.60", "(1.0%)", "0.50000000 coins", "38.19%", "March 14, 2023", "+$7,400.00 / +$1,957.60" | "$33,858", "(0.96%)", "0.5 coins", "+38.19%", "Mar 14, 2023", "+$7,384 / +$1,974" | Q49 precision; the drawn gain split is wrong (100 × $73.84 = $7,384) |
| Performance v17 frame 2 | — | — | needs a redraw before rebuild: its categories add to $52,704 against a $101,000 total, and its walk gives $80,300 |

## READ THIS FIRST rows added (format of Performance v17's 2026-10-11 row)

- **Net worth v08 — DEC-4439.** "Return on cash + investments" counts money that moves on a day for that whole day. No drawn figure moves: A stays +0.53% and B −0.41%, because the $500 added and the $500 taken out cancel.
- **Add an account v02 — DEC-4036c.** "CD" is read from the account's own name or type only. This replaces "the name or institution says CD" in the row of 2026-10-10.
- **Add an account v02 — DEC-4350.** Opened from sign-up's "Add the property first ›", the form starts on Real estate and Save returns to the rent step.
- **No other gap was found.** Of DEC-4036b…k, DEC-4059b…d, DEC-4082, DEC-4105, DEC-4327 and DEC-4439, each screen change in this module already has a row on its drawing, or changes no screen in this module (DEC-4036j, DEC-4036k and DEC-4105 are Plan; DEC-4327 is sign-up; DEC-4036d, DEC-4036e and DEC-4059c show on the account page, whose v17 rows exist).

## Appearance

- **Net worth.** The rendered colour, size, weight and case were pulled again for A, B, C, D and E. Every value is the same as in v01's table: bars, bar totals, hero, change line, rows, debts, emergency fund and the walk colours.
- **The other screens.** No file under `src/screens` or `src/components` changed between v01 and c40588f3, so their appearance was not pulled again.

## What could not be checked

- **On a phone.** Device fonts, pixel widths and line wrapping. To check: a TestFlight screenshot of A and B, measuring the number column.
- **Inside the bars.** The composition-bar segment widths and colours, and the ⓘ glyph's position.
- **The account page against frame 2.** Not re-compared, because frame 2 needs a redraw first.
- **The master file.** Not rebuilt (no build-all), so it does not yet show items 6, 8 and 10.
- **The retirement line for a brand-new account with one $8,000 account.** It reads "0% odds of lasting to age 90 · retire at 65 with ~$783,000". That line belongs to Plan and was not audited here.
