# Mock-match audit — the Net worth module, 2026-10-11

**What this is.** Every approved drawing in the Net worth module, compared with the built screen word by word **and figure by figure**, plus the rendered style values. The method is the standing order in `docs/MOCK-MATCH-AUDIT-STANDING-ORDER.md`.

**Why figures matter here.** The tests that already hold these screens (`networth_matches_v08`, `kept_editors_match`) mask every figure and date as "$#" and "#%". They cannot see a wrong number, a dropped sign or a NaN replaced by a sentence. This audit compares the real strings.

**How each screen was drawn and rendered.**
- **The drawing.** Every visible line of each phone, in order, with the change-mark badges removed. Lines inside a bar the drawing capitalises by CSS (`.band .t`, `.heroband .t`, `.bandInCard .t`, `.walkband`, `.bandT`) are compared in capitals.
- **The build.** Rendered with jest and @testing-library/react-native, using the household the phone draws. For Net worth the clock was set to the drawing's own day, **Aug 11, 2026**; for Bonds, Alternatives, Holding detail and Add an account it was set to **Oct 1, 2026**. Every visible Text node was dumped in render order, together with its rendered style.
- **The diff.** Line by line. A line is "identical" only if every word and every figure is the same.

**Classes.**
- **(a)** The code is wrong against the drawing or a READ THIS FIRST row. Fixed, or marked NOT FIXED with the reason.
- **(b)** A later ruling already written in a READ THIS FIRST row. The row is cited.
- **(c)** The drawing's own numbers don't add up, or the drawing contradicts another rule or drawing with no row. Reported, not changed.

---

## Coverage, by screen and state

The status bar, the top bar (Menu · MoneyKeel · ◉ · ⚙) and the tab bar are left out of these counts, because the navigator draws them, not the screen. See "What this audit could not check".

| Screen · state | Coverage |
|---|---|
| Net worth v08 · A with data, by category | 49 of 51 identical; 2 different; 0 missing; 3 extra |
| Net worth v08 · A2 by institution | 50 of 52 identical; 2 different; 0 missing; 3 extra |
| Net worth v08 · B all collapsed, down case | 35 of 38 identical; 3 different; 0 missing; 3 extra |
| Net worth v08 · C first day | 31 of 31 identical; 0 different; 0 missing; 0 extra |
| Net worth v08 · D missing-data banner (to the debts) | 34 of 35 identical; 1 different; 0 missing; 0 extra |
| Net worth v08 · E change walk | 19 of 21 identical; 2 different; 0 missing; 0 extra |
| Net worth v08 · F fix sheet | 8 of 10 identical; 2 different; 0 missing; 0 extra |
| Net worth v08 · G add sheet | 7 of 7 identical; 0 different; 0 missing; 0 extra |
| Net worth · one account with no balance (no phone; READ THIS FIRST rows of 2026-10-09) | every row-stated string present after fix 1; before it, the hero was broken |
| Bonds v02 · 1 with bonds | 21 of 33 identical; 12 different; 0 missing; 6 extra |
| Bonds v02 · 2 first day | 8 of 8 identical; 0 different; 0 missing; 1 extra |
| Bonds v02 · 3 editor (drawn in part) | 21 of 26 identical; 1 different; 4 missing; 3 extra — the 4 missing are the drawn input-box contents (25000, 4.25 and two hints), not checked against the form's inputs |
| Alternatives v02 · 1 with holdings | 16 of 21 identical; 5 different; 0 missing; 0 extra |
| Alternatives v02 · 2 first day | 7 of 8 identical; 1 different; 0 missing; 1 extra |
| Alternatives v02 · 3 editor (drawn in part) | 17 of 25 identical; 5 different; 3 missing (the drawn input-box contents, not checked); 0 extra |
| Holding detail v02 · 1 a priced holding | 36 of 50 identical; 14 different; 0 missing; 0 extra |
| Holding detail v02 · 2 no live price | 17 of 21 identical; 4 different; 0 missing; 0 extra |
| Holding detail v02 · 3 sold, short history | 18 of 19 identical; 1 different; 0 missing; 0 extra |
| Add an account v02 · 1 Cash | 18 of 19 identical; 1 different; 0 missing; 0 extra |
| Add an account v02 · 2 Stocks / Funds | 22 of 23 identical; 1 different; 0 missing; 0 extra |
| Add an account v02 · 3 Bonds | 28 of 29 identical; 1 different; 0 missing; 0 extra |
| Add an account v02 · 4 Alternatives | 27 of 29 identical; 1 different; 1 missing; 0 extra |
| Add an account v02 · 5 Real estate | 15 of 17 identical; 2 different (the date; Mortgage balance); 0 missing; 1 extra (the home question) |
| Add an account v02 · 6 Debt | 18 of 19 identical; 1 different; 0 missing; 0 extra |
| Account page = Performance v17 frame 2 | **does not match** — 7 sections and their order differ (see that section); figures not comparable because the drawing's own numbers do not add up |

How the counts treat a few things:
- "‹ Back" is counted as identical on every pushed screen, because both the drawing and the build have it.
- On Add an account, the drawn input boxes ("Chase checking", "$0", "0.0" and so on) are counted as identical. The text reader cannot see an input box, so each one was checked against the rendered TextInput placeholder, in order, on all 6 phones: all match.

**Account editor sheet.** The Net worth screen's own "Edit account" sheet has no approved drawing. The design record names none, so there was nothing to match it against. It still needs a drawing.

---

## Net worth — Quiet Instrument v08

**The household.** The data the drawing draws: Chase Checking $8,000; Vanguard Brokerage $349,333, made of $838 cash and 3,319 VTI at $105; E*TRADE bonds $5,819; Home $450,000; mortgage $412,000; Chase Visa $6,000. The record starts on Aug 3 at $393,042.
- **State E** also has a $200 debt payment, which is the drawing's "Debt principal you paid".
- **State D** has LCTX (965 shares, no price) held on the start day as well.

With that data the drawing's figures are reproduced exactly: $813,152, $395,152, +$2,110, +0.53%, $354,314, the walk's $1,910 / $1,220 / $430 / $260 / $200, and 87.2% odds.

### A · A2 · B (the same differences in all three)

| String / element | Drawing | Built | Class | Fixed |
|---|---|---|---|---|
| Emergency fund months (MK-NW-M-013) | 2.0 months | 2.3 months | (b) row 2026-10-04, DEC-1923: "For the household drawn below the figure reads 2.3 months, not 2.4: $8,838 ÷ ($1,300 + $2,400 mortgage + $150 card)" | — |
| Emergency fund working | $8,838 cash ÷ $4,500/month essentials — you entered | $8,838 cash ÷ $3,850/month essentials — you entered | (b) same row ($1,300 + $2,400 + $150 = $3,850) | — |
| Line under the working | — | 1.9 months at your planned spend — $8,838 cash ÷ $4,750/month | (b) row 2026-09-28 (MK-NW-M-046, MK-NW-M-047): "give both numbers" | — |
| Line under the working | — | Both include $2,550/month of debt payments you cannot stop. | (b) row 2026-09-28 | — |
| Line under the working | — | Your Rent / Mortgage budget line is not counted here: your home's mortgage, Home mortgage, is in Debts and is counted from there. | (b) row 2026-10-04, DEC-1923 (the words are in the row) | — |
| B: return in the down case (MK-NW-M-002) | −0.40% | −0.41% | (c) the drawing's arithmetic: −$1,480 ÷ $364,632 = −0.406%, which rounds to −0.41%. The build is right. | — |

### C · first day: 31 of 31 identical. Nothing to fix.

### D · the missing-data banner

| String / element | Drawing | Built | Class | Fixed |
|---|---|---|---|---|
| Stale-account line | · E*TRADE Brokerage last updated Jul 28 | (the fixture's sync day) | (c) see F | — |
| Return on cash + investments, with an unpriced LCTX | +0.53% | +0.53% when LCTX is on the start day's record; **+0.26%** when LCTX had a price ($1,930) on the start day and has none today | **(a) NOT FIXED** — see "Defects found and not fixed", item 2 | — |

### E · the change walk

| String / element | Drawing | Built | Class | Fixed |
|---|---|---|---|---|
| Ending line | Ending net worth (Aug 4) | Ending net worth (Aug 11) | (c) the drawing's hero is dated Aug 11 and says "since Aug 3", so its walk cannot end on Aug 4. The build ends on the as-of day. | — |
| Window line | Aug 3 → Aug 4, 2026 · … | Aug 3 → Aug 11, 2026 · … | (c) same | — |
| Dividends / Interest / Change in investment value **values**, colour | textSecondary #6B6B66 (`.wrow.ind .v`) | textPrimary #1A1A18 | (a) | `src/components/ChangeWalkSheet.tsx:45` |
| Withdrawals −$500, colour | text colour (no rule; Performance v17's walk draws −$1,200 the same way) | red #A32D2D | (a) | `src/components/ChangeWalkSheet.tsx:45` (red style removed) |

### F · the fix sheet

| String / element | Drawing | Built (record 14 days old) | Class | Fixed |
|---|---|---|---|---|
| Gap title | E*TRADE Brokerage last updated Jul 28 | same words, with the fixture's date | (c) the drawing's numbers: Jul 28 → Aug 11 is 14 days, but it says "7 days" | — |
| Gap sentence | Balances may have moved in 7 days. … | Balances may have moved in 14 days. … | (c) same. The build counts the days correctly. | — |

### G · the add sheet: 7 of 7 identical.

### One account with no balance (rows of 2026-10-09, DEC-3279e, DEC-3657; no phone draws it)

| String / element | Row says | Built before | Class | Fixed |
|---|---|---|---|---|
| Hero, with one **debt** with no balance (MK-NW-M-009, MK-NW-F-065) | "Net worth counts the debts that are known" | `Own $813,152 − Owe No debts entered.`, then the sentence `Nothing entered yet — it says so and offers the door, rather than showing $0 as a fact.` where $395,152 belongs, the change line replaced by "tracking starts today", and no total on DEBTS | (a) | `src/domain/debt/index.ts:672` — buildDebtState (MK-CF-F-036) now sums with totalDebtBalance (MK-CF-F-027), so a missing balance is left out instead of making the total NaN. Now: Own $813,152 − Owe $418,000 · $395,152 · +$2,110 · DEBTS −$418,000 |
| Debts bar | "The bar and the percents count only known money" | legend "Personal loan <1%" | (a) | `src/screens/NetWorthScreen.tsx:975` |
| Same defect class, outside Net worth | — | GoalsScreen summed debts raw (NaN on a missing balance) | (a) | `src/screens/GoalsScreen.tsx:66` |
| Account row, bank band, amber box | "Value not entered", "Ally · Value not entered", "Ally CD has no balance" | as the rows say | identical | — |

### Appearance — rendered values against the drawing

| Element | Drawing | Built (rendered) | Result |
|---|---|---|---|
| Dark bars (hero, retirement, What you own, Debts, Emergency fund) | #085041, 11/800, white, capitals | #085041, 11/800, #FFFFFF, textTransform uppercase | identical |
| Light bars (Cash, Investments, Personal property, institutions) | #DFF2E9, 11/800, #085041, capitals | same | identical |
| Bar totals | 15/800 | 15/800 | identical |
| Hero number | 38/800 #0F6E56 | 38/800 #0F6E56 | identical |
| Change line up / down | 13/800 #006300 / #854F0B | same | identical |
| Retirement line | 15/600; "87.2% odds…" 800 | 15/600 with an 800 span | identical |
| Account row name / value / source / chip | 15 primary / 15 secondary / 11 tertiary / 11/700 chip | same | identical |
| Debt values | 15/800 #A32D2D | same | identical |
| Emergency fund months / word / working / note | 24/800 · 13/800 amber · 13 secondary · 11 tertiary | same | identical |
| First-day question "How do you want to add an account?" | plain `<b>` = 700, textPrimary | 800 | (a) fixed, `src/screens/NetWorthScreen.tsx:1414` |
| Banner (state D) | amberLight, 13/800 heading, 13 lines | same | identical |
| Fix sheet title / cards / buttons | 17/800 · 13/700 · 13/800 on #085041 · outlined | same | identical |
| Add sheet title / doors | 20/800 · 15/800 + 13 sub | same | identical |
| **One right edge** | Drawing CSS: bars at 12 + 8 + 16 = **36 px**, rows at 16 + 8 + 16 = **40 px** | every bar total, row value and debt value at **36 px** (12 padding + 8 gap + 16 arrow column) | build has one edge; **the drawing's own CSS does not** — (c), see below |
| Row left inset | Drawing `.sheetRow`/`.debt` 16 px, `.acct` 36 px | 12 px / 32 px | (c) the drawing insets rows 4 px more than its bars, which is exactly what moves its row numbers off the bars' edge; the build keeps rows on the bar inset |

---

## Bonds v02

| String / element | Drawing | Built | Class |
|---|---|---|---|
| Order of the three bonds | Treasury, Apple, CD | CD (Feb 2027), Treasury, Apple | (b) row 2026-10-04, DEC-1558 "sort by soonest maturing first" |
| Yields to maturity | 4.95% · 5.12% · 4.00% | 7.76% · 5.25% · 4.00% (on Oct 1) | (b) row 2026-10-08: "Yield to maturity is solved exactly, at the bond's exact years left" |
| The star note | "* accrued interest not entered — the yield uses the price as you entered it", on "yield 4.61%" | "* Added estimated $493 in accrued interest to bond value at 4.5% coupon for 200 days to calculate YTM. If this is not accurate, enter actual accrued interest", on Yield to maturity | (b) row 2026-10-09, DEC-3390 |
| Years to maturity after the date | · 1y (CD, 4 months out) · 2y (Treasury, 9 months) · 4y (Apple, 3.5 years) | · 0y · 1y · 3y | (c) the drawing's figures follow no single rule: rounding gives 0 / 1 / 3 and rounding up gives 1 / 1 / 4. The build rounds, so a CD 4 months out reads "0y". |
| First day | (no line) | Nothing entered yet. Add a bond › | (c) the empty-state rule Q48 (2026-09-09) predates this drawing; it has no row on the drawing |
| Editor: extra fields (institution, market value, value as of) and Save / Delete | drawn in part | present | (c) DEC-1560 "Rest - keep it" covers them, but the Bonds drawing has no row saying so |
| Editor: market value label | Current value (blank = face value) | Market value, as your statement shows it — without accrued interest (blank = face value) | (b) row 2026-10-09 (DEC-3390) |

## Alternatives v02

| String / element | Drawing | Built | Class |
|---|---|---|---|
| Expected rates per holding | Crypto ~9.00% · Private equity ~7.00% · Commodities ~3.50% | ~8.00% · ~13.00% · ~8.20% | (c) the drawing says it was "drawn from the code", but the code's rates (src/domain/assets/index.ts:284-287) have been 8% / 13% / 8.2% since June 2026. The editor's "~9.00%/year historical benchmark" cannot come from any version of the code. The drawing's own EXP. RETURN 7.32% / $4,502 does not equal its three rates either (they give 7.43% / $4,568). The build adds up: $6,187 ÷ $61,500 = 10.06%. |
| Kind word | Commodities | Gold / commodities | (c) the one-term canon. The Add an account drawing has the row (2026-10-06); this drawing has none. |
| First day | crypto, private equity, hedge funds, commodities, … | crypto, commodities, … | (b) row 2026-10-06, DEC-0045 |
| First day | (no line) | Nothing entered yet. Add an investment › | (c) Q48, as for Bonds |
| Editor kinds and the line under them | Private equity · Commodities · Annuity · "Bitcoin, Ether and the rest — held at the value you set." | Gold / commodities · Annuities · Options · Other · "Highly volatile … size it accordingly." | (b) for the kinds (row 2026-10-04, DEC-1560). The line under them: (c) — already an open workplan row (kept_editors_match difference 9). |

## Holding detail v02

| String / element | Drawing | Built | Class |
|---|---|---|---|
| Cents on totals | $33,857.60 · $24,500.00 · $134.40 · $28,000.00 · $0.00 | $33,858 · $24,500 · $134 · $28,000 · $0 | (c) the precision standard Q49 predates this drawing; no row |
| Day change | (1.0%) · (4.1%) | (0.96%) · (4.05%) | (c) Q49, two decimals |
| Coin quantity | 0.50000000 coins | 0.5 coins | (c) Q49 |
| Sign on percents | (38.19%) · 38.19% · 22.40% | (+38.19%) · +38.19% · +22.40% | (c) the build has printed the "+" since July. Approved drawings disagree with each other: Performance v17 phone 1 writes "+16.24%" and its frame 2 writes "6.88%". |
| Lot dates | March 14, 2023 · January 9, 2026 · July 2, 2024 | Mar 14, 2023 · Jan 9, 2026 · Jul 2, 2024 | (c) every other approved drawing writes the short month ("Aug 3, 2026"); the build has always done so |
| Gain split | long +$7,400.00 · short +$1,957.60 | long +$7,384 · short +$1,974 | (c) the drawing's split is wrong: 100 × ($241.84 − $168) = $7,384 and 40 × ($241.84 − $192.50) = $1,974. Its total, $9,357.60, is right. |
| Realized from sales | $0.00 + "From your recorded buys and sells …" | $0 — nothing sold | (b) row 2026-10-04, DEC-1559 |
| Short-term label | Gain — short-term (under 1 yr) | Gain — short-term (held 1 yr or less) | (b) row 2026-10-04 |

## Add an account v02

The only differences are the date ("value as of Sep 14, 2026", the drawing's own day) and the rows:
- Real estate: "Mortgage balance (optional)" and "Is this the home you live in? Yes / No" — (b) row 2026-10-04, DEC-1925 and DEC-1926.
- Alternatives: no "Private stake" — (b) row 2026-10-06.

All 6 phones' input boxes match.

## Account page = Performance v17 frame 2 (DEC-0646)

**The guard that claimed this matched never looked at frame 2.** `src/screens/__tests__/account_portfolio_vs_mock.test.tsx` slices the drawing from the first "ACCOUNT PORTFOLIO". That text appears only in frame 2's *caption*, so the slice is frame 3 (the Performance tab's day one). It also only checks that 11 sections are present. Its "11 of 11 sections" in the design record was never a match.

**Frame 2 against the build (words; frame 2's figures do not add up, see below):**

| Element | Frame 2 | Built | Class |
|---|---|---|---|
| Line under the title | Portfolio · Linked · 7 days old | Linked · read-only, then "Updated Oct 4, 10:42 AM", then today's date | (a) NOT FIXED |
| Window selector (Since … · 1M · This year · 1Y · 2Y) | not drawn | present | (a) NOT FIXED |
| Summary bar | THIS ACCOUNT · SINCE OCT 1, with the value on the bar | SUMMARY · SINCE JUL 19, 2026, no value | (a) NOT FIXED |
| Trio, first label | Market value | Ending value | (a) NOT FIXED |
| Walk title | HOW … BECAME … · THIS ACCOUNT | HOW … BECAME … | (a) NOT FIXED |
| Walk footnote | Every line opens the rows behind it › | Every line here comes from E*TRADE's own records. … | (a) NOT FIXED — and the drawn words promise rows that open, which the build does not have |
| Account bar ("▸ E*TRADE … Linked · 7 days old · wealth generated …") | not drawn | present | (a) NOT FIXED |
| WHAT EACH CATEGORY EARNED | not drawn (it is frame 1's and frame 3's) | present | (a) NOT FIXED |
| Category rows in BY CATEGORY & HOLDING | light-green bars "▾ STOCKS / FUNDS $40,000 +2.10% ›" | plain rows, no caret, no arrow | (a) NOT FIXED |
| Holding sub-line | 965 shares · $41.45 | "LCTX · 800 shares" on one line, no price | (a) NOT FIXED |
| Holdings footnote | Income sits with the holding that earned it (120＋40＋20＋40 = $220 for this account). Tap a holding for its own page. ⓘ | Counted inside this account's total — … $220 for this account. | (a) NOT FIXED |
| ACTIVITY bar | ACTIVITY · SINCE JUL 19 | ACTIVITY | (a) NOT FIXED |
| Activity row | Dividend · LCTX / Aug 1 · from E*TRADE / $120 | 08-01 / Dividend LCTX / from E*TRADE / +$120 | **(a) FIXED**: `src/screens/AccountPortfolioScreen.tsx:66` (the day in words), `:746-752` (the row). It is now "Dividend · LCTX", "Aug 1 · from E*TRADE", "$120", and a minus stays a minus. This is also v14's drawn form. |
| "See all activity (older than Jul 19) ›" | drawn | shown only when older records exist | data |

**Frame 2's own numbers do not add up (c).**
- Its categories total $40,000 + $8,704 + $4,000 + $0 = $52,704, but its Total and trio say $101,000.
- Its walk, $80,000 + $0 − $0 + $300, gives $80,300, not $101,000.
- Its bar says "since Oct 1" while its walk runs Jul 19 → Aug 4.
- KeyBank CD interest is "$40" in the holdings and "$60" in the activity.

The figures must be redrawn before the screen can be matched by number.

---

## Fixed in this audit (a)

Each fix is held by `src/screens/__tests__/mock_match_audit_2026_10_11.test.tsx`.

1. **A debt with no balance broke the Net worth hero** (MK-XS-M-001, MK-NW-M-009). The total was NaN, so the screen printed "Owe No debts entered." and a sentence where the figure belongs. Now it reads Own $813,152 − Owe $418,000 · $395,152 · DEBTS −$418,000.
   - The code changed in `src/domain/debt/index.ts:672-674`: buildDebtState (MK-CF-F-036) now sums with totalDebtBalance (MK-CF-F-027). **The master file's formula line for MK-CF-F-036 must say "Σ over debts of (remaining balance, or 0 when missing)".** The functions_from_code tab is rebuilt from the code; that build was not run here (no build-all, as instructed).
   - The same class in Goals: `src/screens/GoalsScreen.tsx:66`.
2. **The debts bar drew an unknown debt as "<1%"**: `src/screens/NetWorthScreen.tsx:975`.
3. **Walk colours**: the indented values are now grey, and Withdrawals is no longer red. `src/components/ChangeWalkSheet.tsx:45`.
4. **First-day question weight** 800 → 700: `src/screens/NetWorthScreen.tsx:1414`.
5. **Account page activity rows**, written as frame 2 and v14 write them: `src/screens/AccountPortfolioScreen.tsx:66, 746-752`. Two tests that pinned the old "08-01" form were updated: `src/__tests__/founder_2026_08_11.test.tsx`.

## Defects found and not fixed (a)

1. **The account page's top half is not frame 2.** Nine elements are in the table above. This is a rebuild of a screen the Performance tab shares, not an edit, and frame 2's figures must be redrawn first because they do not add up. The next task is to start from frame 2 and v14 and rebuild the top half. It also needs a guard that reads frame 2, not frame 3.
2. **An unpriced holding leaks into "Return on cash + investments"** (MK-NW-M-002). The fix sheet promises: "Meanwhile we show what you paid — it stays out of the change line." Today's record values an unpriced holding at what was paid (`Calculation Module code/engines/snapshots.ts:207`). So a holding that had a price on the start day and has none today moves the return: +0.53% became +0.26% for LCTX ($1,930 then, $965 paid).
   - Not changed here: it is the return engine (MK-XS-M-004, DEC-1669), and the file-and-code rule says the engine and the master file change together.

## Drawings that need a correction or a row (c)

- **Net worth v08.** B's −0.40% should read −0.41%. E's walk ends Aug 4 on an Aug 11 screen. F's "7 days" should be 14. The CSS puts rows 4 px inside the bars, which breaks the one right edge its own caption claims.
- **Bonds v02.** The years-to-maturity figures follow no single rule (the build shows "0y" for a CD four months out). There is no row for the Q48 empty line or for the editor's kept fields (DEC-1560).
- **Alternatives v02.** Its rates match no version of the code, and its blended return does not equal its own rates. There is no row for "Gold / commodities" or the Q48 line.
- **Holding detail v02.** It contradicts Q49 (cents, one decimal), drops the "+" the build has always printed, writes long month names, and splits the gain wrongly ($7,400 / $1,957.60 should be $7,384 / $1,974).
- **Performance v17 frame 2.** Its figures do not add up (four ways, above).

## What this audit could not check

- **Device rendering.** iOS fonts, actual pixel widths and line wrapping. The right edge was computed from the rendered padding, gap and arrow-column widths, not measured on a phone. To check: a TestFlight screenshot of states A and B, measuring that the bar totals and the row values end on one x.
- **The top bar and tab bar.** The navigator draws them, outside the screen render. Checked from code instead: the TopBar has Menu, the wordmark and two icons, and TAB_META titles are Home · Net worth · Performance · Cash flow · Plan.
- **Composition-bar segment widths and colours, and the ⓘ glyph's position inside a bar.** These are not exposed as text. The bar's legend order and percents were compared.
- **The Edit account sheet.** It has no approved drawing.
