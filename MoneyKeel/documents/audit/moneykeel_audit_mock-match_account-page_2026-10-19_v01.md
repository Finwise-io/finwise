# Mock-match audit — the Account page, 2026-10-19, v01

**What this is.** The Account page (the one Account detail / Account portfolio screen, `src/screens/AccountPortfolioScreen.tsx`, opened by `/account-detail`) compared with its approved drawing, line by line, card by card and style by style, after it was rebuilt to that drawing. Method: `docs/MOCK-MATCH-AUDIT-STANDING-ORDER.md`. Code: branch `taxonomy-v1.0.7` on top of `b5dadbd2`, not committed.

**The drawing.** `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_account-page_v01.html` — five states on one phone, READ THIS FIRST rows 1 to 44. **Approved 2026-10-19, his word "approved." (DEC-6457).** It is the design of this screen and replaces Performance v17 frame 2 for it (v17's other frames stay the Performance tab's, DEC-0647).

| State | What it shows |
|---|---|
| A | Vanguard Brokerage, linked, record since Oct 1, 2025, today Sep 30, 2026 |
| B | Muni 2029, a bond built by hand Jun 2, 2026, no rate entered |
| C | Fidelity Brokerage, linked today, no past activity sent (drawn with no record of the account yet) |
| D | the same account, 1Y picked, worked back from VTI's price history |
| E | US Treasury 4.00% 2030, a bond's own page |

**How it was done.** `src/screens/__tests__/account_page_drawing_states.test.tsx`, 45 tests:
- **The drawing** is read from the file: every visible string of each state, in order. Left out, because they are the drawing's and not the app's: the orange state labels, the orange change marks, the phone's status bar.
- **The screen** is rendered with each state's own data (account, records, daily record, prices) on Sep 30, 2026, and every line is read off the rendered tree, in order.
- **The two lists must be the same list.** The test fails on the first line that differs and prints the coverage.
- **Two readings, not differences:** an apostrophe is an apostrophe (’ in the drawing, ' in four shared sentences of the app), and the top bar's icons, drawn as glyphs, are read as the app's wordmark image and two icon buttons.

---

## Coverage, by state

| State | Now | Before (same data, same method, the committed screen) |
|---|---|---|
| A | **124 of 124 lines identical; 0 different; 0 missing; 0 extra** | 98 of 124; 19 different; 7 missing; 26 extra |
| B | **65 of 65 lines identical; 0 different; 0 missing; 0 extra** | 58 of 65; 7 different; 0 missing; 6 extra |
| C | **83 of 83 lines identical; 0 different; 0 missing; 0 extra** | 67 of 83; 13 different; 3 missing; 8 extra |
| D | **89 of 89 lines identical; 0 different; 0 missing; 0 extra** | 68 of 89; 14 different; 7 missing; 7 extra |
| E | **71 of 71 lines identical; 0 different; 0 missing; 0 extra** | 64 of 71; 7 different; 0 missing; 6 extra |

**Nesting:** 5 of 5 states — every line sits in the same card, box or bar the drawing puts it in, in the same order (each card is told apart by its white, 16-round, shadowed box; the amber box, the window bar and the button row by their own marks).

**One right edge:** 5 of 5 states — every figure in a bar, the walk, the table and the activity ends at one 16-point column (A 33 figures checked, B 9, C 19, D 19, E 9). "›" sits only in that column and only on a holding that opens its page (A 3, C 2, D 2, B and E none); "✎" on no row (no record in these states was typed by hand).

**Appearance:** every element the drawing styles was checked as rendered — 5 of 5 states, 84 style checks plus every card's box, each line of the test naming the drawing's CSS rule it reads.

---

## Fix table

| Fix | Example | Before | Now |
|---|---|---|---|
| 1. A linked account's date shows only when stale (row 7) | Vanguard, synced this morning | "Linked · read-only" and "Updated Sep 30, 1:00 AM" every visit | "🔗 Linked"; synced Sep 20: "🔗 Linked · 10 days old"; no "Updated" line ever |
| 2. The source chip is the app's one chip | Muni 2029 | "By hand · you update it", grey text | "✍️ By hand · you update it" in its pill; "Value as of Sep 1, 2026" beside it |
| 3. No date line under the name | state A | "Sep 30, 2026" under the chip | gone (not on the drawing) |
| 4. The class line sits under the name | state B | below the walk, after the account's own row | under the chip: "Bonds & CDs · tax type not stated — choose ›", "choose ›" in the link green |
| 5. The summary bar names the account and carries its value | state A | "SUMMARY · SINCE OCT 1, 2025 ⓘ", no figure | "THIS ACCOUNT · SINCE OCT 1, 2025" with $101,000 |
| 6. The trio's first word, and its colours | state A | "Ending value"; all three figures black | "Market value" $101,000 deep green; $6,000 and +8.26% green; day one in the text colour |
| 7. Sections the drawing does not have are gone (row 18) | state A | value line; "▸ Vanguard Vanguard Brokerage $101,000 ›"; WHAT EACH CATEGORY EARNED ($1,500 · $185 · $15 · All categories $1,700) | gone |
| 8. The rebuilt line is gone | state A | "↺ Rebuilt from Vanguard's own records, back to Oct 1, 2025 — the first day it shares." | gone; the walk's footnote names the source |
| 9. A false records sentence is gone | state A, 15 records | "Vanguard hasn't shared any activity records yet — its income lines stay empty…" | gone; only an unreadable start date is said (DEC-4059c) |
| 10. The amber box of missing information (state D) | Fidelity, no dividend records | none on the page | "⚠ 1 number needs more information ›", the bullet "Fidelity hasn’t shared dividend records for this account. Its dividends sit inside the change in investment value…", "Enter dividends yourself ›", "Sync now ›" |
| 11. The walk's footnote follows row 9 | Muni 2029; state D | "Every line here comes from Muni 2029’s own records…"; the same on a worked-back window | "A hand-entered account has no records to rebuild from…"; state D none |
| 12. The walk's weights | state A | Wealth generated plain grey; parts not indented; ending black | Wealth generated 800 black; Dividends, Interest, Change indented 20; ending $101,000 deep green |
| 13. A holding's name, then its shares and price | VOO | "VOO · 160 shares", no price | "VOO", beneath it "160 shares · $562.50" |
| 14. The cash row says what it is and what it paid | Vanguard's cash | "Cash in this account", no line, no income | "uninvested balance"; "Income: $15 interest" (interest that names no holding) |
| 15. Class bars carry the dot and ▾ / ▸ | state A | "STOCKS / FUNDS", no dot | "▾ STOCKS / FUNDS" with its blue dot; "▸ ALTERNATIVES" when empty; a tap closes a class |
| 16. The note under the table | state A | "Counted inside this account's total — listed here so nothing is hidden. … — $1,700 for this account." | "… Income sits with the holding that earned it (1,500 ＋ 100 ＋ 85 ＋ 15 = $1,700 for this account). Tap a holding for its own page. ⓘ" |
| 17. One right edge, "›" only where a row opens | state A | no column; no "›" on any holding | one 16-point column on every row; "›" on VOO, KeyBank CD, US Treasury 2028 |
| 18. The activity bar sits in its card and names the window | state A | "ACTIVITY 15 records" above the card | "ACTIVITY · SINCE OCT 1, 2025 15 records" inside it; with 1M picked "ACTIVITY · THE PAST MONTH 3 records" |
| 19. Activity rows named as the table names them | state A | "Interest · 49306SAB2", "Interest", "Buy · VOO · 10 sh @ $600.00" | "Interest · KeyBank CD", "Interest · cash in this account", "Buy · VOO · 10 shares @ $600.00" |
| 20. Edit only on an account built by hand | state A | "Edit" on a linked account | none on A, C, D; "Edit", "Update value" on B and E |
| 21. **Day one shows on the app's real day one** (DEC-6075) | Fidelity linked today, Home has written today's record | "SUMMARY · SINCE SEP 29, 2026"; "Your daily record does not reach back to Sep 29, 2026 yet…"; the day-one line never showed | "THIS ACCOUNT · SINCE TODAY"; "You linked this account today. Fidelity sent no past activity, so its figures start today." |
| 22. Day one by hand, the same | gold coins added today | "SUMMARY · SINCE SEP 29, 2026", "…does not reach back to Sep 29, 2026…" | "You added this account today, so its figures start today." |
| 23. A holding has no figure on day one | VTI, day one with Home's record | "+0.00%" on VTI and the bar | "—", as drawn |
| 24. The account's own record sets "Since" | Muni 2029 beside a checking account recorded since Jan 2, 2025 | "Since Jan 2, 2025", Return and Wealth generated "—" | "Since Jun 2, 2026", +1.50%, $150 (state B exactly) |
| 25. A balance never entered is never $0 (row 16) | Muni 2029 with no balance | Ending value $0, Wealth generated −$10,000, Return −100.00%, every window −100.00% | Market value "Value not entered", "—", "—", every window "—" |
| 26. Cards as drawn | every card | no shadow; 12 at the foot | the theme's card shadow (0 1 4, 6%); 10 at the foot |
| 27. Small spacings as drawn | rows | income line indented 20; "Nothing held" 12/10; ✎ in a 31-point slot; 12-month card text 2 below its title | 17; 17 · 4 · 8; the 16-point column; 6 |
| 28. The page opens on the window picked on Performance (row 18) | 1Y picked on Performance, then Fidelity's bar tapped | the page opened on Since every time | it opens on 1Y (state D, word for word); from Net worth on Since; a window the account cannot show (Muni 2029 handed 1Y) on Since, as row 19 says |

---

## Known differences — each named in the test with its reason

| What | App | Drawing | Why the app's stands |
|---|---|---|---|
| The amber box's corner and inner space | 16 round, 12 in | 12 round, 10 / 12 in | It is the app's one amber box (Performance, Net worth). The drawing's row 26 calls it "the same box as the app’s missing-data banner". |
| Space above the name | 20 | 4 | The app's one content padding on every page; the drawing's own comment says "content padding Spacing.lg (20)". |
| Space between a figure and the 16-point column | 0 | 8 on a row, 6 on a bar | Flush gives ONE edge for every figure (the Performance tab's rule, DEC-0093); the drawing's CSS gives two edges, 2 points apart. |
| The amber box's two doors, text size | 13 | 12 | 12 is not on the app's one type scale (a test fails the build on any size off it); 13 is every door's size. |

No word differs.

---

## What could not be checked

- **On a phone:** device fonts, where long lines wrap at 390 points, the card shadow as drawn by iOS. To check: a TestFlight screenshot of states A and D.
- **Touch:** the 36-point amber-box doors carry 4 points of extra touch area each way; their reach was not tried by hand.

## Found while doing this, outside this screen — reported, not changed

- **Two source-wording helpers.** `sourceWording` (src/domain/assets) and the chip's `sourceWords` (src/components/SourceChip.tsx) word an imported account differently: "Imported" against "Imported · Sep 30, 2026". The chip shows the date every time.
- **Card shadows elsewhere.** Performance v17 and Net worth v08 draw a card shadow; no card on those tabs carries one.
- **CLAUDE.md** still says v17 frame 2 is the Account detail screen's design (MOCK-FIRST section). It is not mine to edit.

## Records updated

Decision log (DEC-6457, from `moneykeel_decisions_in_chat.json`) · design Changelog row 400 and its anchor · the design record's Account portfolio row · the tracker row (DONE) · READ THIS FIRST row 44 on the drawing and a dated line on v17 · the orchestrator map's design list (`/account-detail` → account-page_v01, `/invest` → performance_v17). · the account door's rule in words (MK-NW-O-002 theAccount, now with the cash's own interest), re-read from the code.
