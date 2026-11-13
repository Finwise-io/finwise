# Questions and answers on the master record — design v01

2026-11-12 · Design only, no code changed · Follows DEC-10342, DEC-10385, DEC-10386, DEC-10471, DEC-10515, DEC-10749.

## 1. Summary

The record already asks the account holder about most differences. Four faults remain. A changed answer leaves the earlier answer's rows in force. One difference can raise two questions. A question stays after a newer list settled it. Some differences are found but never asked. The fix: each question gets one key, each answer's rows carry that key, and one checker re-tests every stored question after every write. **The newest answer wins, and it first undoes the earlier one.** There are two new questions: which lot a sale came from, and whether an option expired. An option's expiry becomes a sale at $0 on its expiry date.

## 2. Today

- `asset-record.ts:617` MK-NW-F-238 sortArriving raises event questions; `:2211` MK-NW-F-273 answerEventQuestion writes them. Its "mine after theirs" branch (`:2214`) skips the keep-date fact.
- `asset-record.ts:2563` MK-NW-F-277 purchasesFromList raises list questions; `:2805` MK-NW-F-278 answerListQuestion writes them. A "mine" fact stays in force after a later "the list is correct" (`:2593`).
- `:1524` MK-NW-F-256 salesNeedingAnAnswer is answered through `:3083` MK-NW-F-281 correctRow with `sells`.
- `:1033` MK-NW-F-247, `:1106` MK-NW-F-249, `:1566` MK-NW-F-257 and `:1493` MK-NW-F-255 find differences that are never stored. Only F-247 has a writer (`:1075` MK-NW-F-248).
- `asset-record-from-broker.ts:303-306` MK-NW-F-193 eventRow saves an option expiry as OTHER.
- Store `:487` keys: `<account>`, `<account>#typed`, `<account>#moved`. Sync (`:1053-1062`) re-checks kept questions but never closes one a newer list settled. File import (`:1392-1398`) never re-checks, and `needsADate` never clears (`:1395`). Typed changes (`:147`) only append. The move (`:1412`) overwrites, and its sentences have no answer.

Outside checks, run on the code: "both" (60) changed to "mine" stays at 60. "Theirs" changed to "mine" raises a second list question. "Mine" changed to "the list is correct" leaves the "mine" fact in force. A list that shows the Feb lot sold leaves the gain at $750 instead of $250. One removal raises two questions. A Jul question about VTI survives Aug's list of 20. An option expiry becomes −200 shares on the list day, and its $800 loss appears nowhere.

## 3. The question kinds

"Robinhood" stands for the broker, or "your file of Jun 30, 2026". Each sentence names both sources and both values (DEC-10471). Each answer also writes a fact carrying the question's key.

| # | Kind · raised by | When | The sentence | Choices → what each writes |
|---|---|---|---|---|
| E1 | event price · F-238 | same day and shares, other price | "The information from Robinhood indicates price of $210 for 20 VTI bought Feb 10, 2026; you entered $205. Confirm changing the price to $210." | **Change** → typed correction with Robinhood's figures · **Keep mine** → keep-date and keep-price facts · **Two purchases** → the arriving row saved |
| E2 | event date · F-238 | same shares, up to 5 days apart | "…indicates 10 VTI bought Jan 10, 2026; you entered Jan 12. Confirm changing the date to Jan 10." | as E1 |
| E3 | event ratio · F-238 | a split sent again, other ratio | "…indicates the TSLA split of Jan 15, 2026 was 3-for-1; the record holds 2-for-1. Confirm changing it to 3-for-1." | **Change** / **Keep mine** |
| E4 | taken away · F-238, with L3 | a purchase the account holder took away is sent again | "Robinhood still lists 10 VTI bought Jan 10, 2026 at $200; you took it away. Confirm keeping it away: 20 shares." | **Keep it away** → facts for both questions · **Put it back** → the purchase saved again: 30 |
| L1 | list typed · F-277 | the list differs from a typed purchase | "Robinhood's list of Mar 1, 2026 indicates 300 MSFT bought Jul 30; you entered 500 bought Jul 29. Confirm changing to 300." | **The list is correct** → purchases replaced (each keeps shares already sold), listed lots added, unlisted shares kept to show · **Mine is correct** → keep-over-list fact with the gap |
| L2 | not listed · F-277 | no transaction explains the difference | "Robinhood's list of Jul 31, 2026 leaves out the 20 VTI on record, and no sale is on record. Confirm changing VTI to 0 shares." | as L1 |
| L3 | removed · F-277 | the list states a purchase taken away | shown as E4 | as E4 |
| L4 | list price · F-277 | another price for a lot | "Robinhood's list indicates $345 for 100 MSFT bought Jul 30, 2026; the record holds $350. Confirm changing to $345." | **Change** → typed price correction · **Keep mine** → fact |
| L5 | count · F-277 | a broker average states other shares | "Robinhood indicates 1,000 X; the record holds 500 and no transaction explains 500 more. Confirm adding 500 with no date and no price." | **Change** → one undated purchase of 500 (fewer: taken from the oldest, kept to show) · **Keep mine** → fact |
| L6 | **new** sold from · F-277 | the lots differ only by where an unnamed sale came from | "Robinhood lists 100 MSFT of Jan 10 and 50 of Feb 10, 2026. The record sold the 50 of Mar 10 from Jan 10. Confirm they came from Feb 10: the sale made $250, not $750." | **The list is correct** → typed sale correction naming Feb 10 · **Mine is correct** → fact |
| X1 | **new** expired · F-277 | an option past expiry leaves the list, no sale on record | "Robinhood no longer lists 2 AAPL $260 calls of Feb 20, 2026 (200 at $4.00). Confirm they expired worthless on Feb 20: a loss of $800." | **Expired** → sale of 200 at $0 on Feb 20 · **Sold or exercised** → nothing; he enters it |
| S1 | which lot · F-256 | a sale may have sold an undated purchase (DEC-10385) | "You sold 100 X on Nov 10, 2026 at $420. Which purchase did they come from?" | one choice per purchase made by that day, with its gain ("Nov 5 · 100 at $400 → $2,000") → typed sale correction with `sells` |
| S2 | sale before list · F-257 | a typed sale dated before a list still showing the shares | "You entered a sale of 200 MSFT on Nov 10, 2026; Robinhood's list of Nov 16 still shows them. Confirm your date of Nov 10." | **Keep** → fact · **Change the date** → typed correction · **Take it away** → removal |
| S3 | sold beyond · F-255 | a sale takes more than the record holds | "Robinhood sends a sale of 300 X on Feb 5, 2026; the record holds 200. Enter the purchase the other 100 came from." | **Enter it** → typed purchase · **Leave not known** → fact |
| V1 | values · F-247 | a broker value for a day he typed | "The information from Robinhood indicates $170,000 on Nov 3, 2026; you entered $172,500. Confirm changing Nov 3 to $170,000." | **Change** → typed copy of Robinhood's values · **Keep mine** → fact |
| V2 | no date · F-249 | values given with no date | "Your file imported Nov 4, 2026 does not say what day its $4,800 is from. What day is it from?" | **A date** → typed copy on that date, undated rows removed · **Not known** → fact; kept off the screens |
| M1 | not explained · F-228 | the move could not place something | its own sentence: "The shares of VTI moved on Mar 3, 2026 cannot be placed from what the phone held, so the transfer was not moved." | **Enter it** → typed transaction · **Leave it** → fact |
| C1 | confirm my change · F-279 | he changes a figure a broker gave | "The information from Robinhood indicates price of 350, you entered 320. Confirm changing price for 100 shares of MSFT to 320." | **Confirm** → typed correction (F-281) · **Cancel** → nothing. Asked at once, never stored |

## 4. The rules for answers

**Rule 1. The newest answer wins, and it first undoes the earlier one.** Every row an answer writes carries the question's key. A changed answer first undoes each row with that key: a correction goes back to the figures it replaced, and a new row is removed. Then the new choice runs through the first-answer writer. A sale that sold from an undone lot becomes an S1 question.
- 1a. VTI: Jan 10 lot of 10 at $200, Feb 10 lot of 20 at $210; Jan 10 taken away. "Keep it away" gives 20 shares. Changing to "Put it back" removes that fact and gives 30 shares, cost $2,000 + $4,200 = $6,200.
- 1b. Typed Jan 12 10 at $195 and Feb 10 20 at $205; Robinhood sends Jan 10 at $200 and Feb 10 at $210. "Change" gives a cost of $6,200. Changing to "Keep mine" gives $1,950 + $4,100 = $6,050, and the keep-date fact stops the list asking again.
- 1c. The same, but "Two purchases" gives 60 shares. Changing to "Keep mine" removes Robinhood's two rows: 30 shares, $6,050.

**Rule 2. "The list is correct" names the lot a sale came from (L6).** Shares do not change. MSFT: Jan 10 100 at $50, Feb 10 100 at $60, 50 sold at $65 on Mar 10. Oldest first, the sale made 50 × $15 = $750. Robinhood lists Jan 100 and Feb 50, so the sale names Feb: 50 × $5 = $250. Shares stay 150. When more than one unnamed sale could explain the gap, each sale is asked as S1.

**Rule 3. One question per difference.** A difference's key is the account, the holding, the purchases on record, the listed dates and the figures. When a history question and a list question share a key, the list question is shown, because the list states what is held (DEC-10471). Its answer writes both facts. Example: removing VTI Jan 10 raises only E4. "Keep it away" leaves 20 shares.

**Rule 4. A newer list settles an older list's question.** The question closes once a later list for the same account and holding is set beside the record. If that list also differs, it asks its own question. Example: Jun 30 lists VTI 20 and Jul 31 leaves it out, so L2 is asked. Aug 31 lists 20: the Jul question closes and the record keeps 20. If Aug had listed 15, Aug would ask 20 against 15. An answer to a closed question writes nothing.

**Rule 5. An option's expiry is a sale at $0 on its expiry date** (a transaction detail, DEC-10471). The sale's shares are contracts × shares per contract, at $0, on the broker's date or else the option's own expiry date. Example: 2 AAPL $260 calls of Feb 20, 2026, bought at $4.00 a share, cost 200 × $4 = $800. The sale on Feb 20 gives a loss of 200 × ($0 − $4) = −$800. The Feb 23 list then agrees, so nothing is asked. If the broker sends no expiry, X1 asks.

**Rule 6. A question that is no longer true is dropped.** After each write to an account (sync, file, typed change, move, answer), every stored question is asked again of the record. A question not raised again is dropped. `needsADate` comes from F-249 and is never sticky. Example: E2 asks about a typed Jul 29 against Robinhood's Jul 30. He edits the date to Jul 30, and the question is dropped.

**Rule 7. An answered question comes back only when the difference changes.** The key carries the figures. Example: typed 450 against Robinhood's 500, "Keep mine", a gap of 50. Buying 100 makes it 550 against 600, still 50: nothing is asked. A list of 650 with no transaction makes the gap 100: that is asked.

**Rule 8. Nothing changes before he answers.** A figure that waits on an answer shows as not known (DEC-10385). Example: while S1 is open, the sale of 100 at $420 shows its gain as not known.

## 5. Build steps, in order

1. Add `answerTo` (the question key) to AssetRow, written on every answer row.
2. Write `differenceKey`, one shape for every question kind.
3. Write `undoAnswer` and `answerQuestion` (undo, then the existing writer). Delete the "mine after theirs" branches at `asset-record.ts:1079` and `:2214`.
4. Write `oneQuestionPerDifference` and use it in the broker, file and typed paths.
5. Add L6 to F-277 and its writer to F-278 (correctRow with `sells`).
6. Keep each option's expiry date as a fact. Map OPTIONEXPIRATION in F-193, and typed or file expiries, to a $0 sale. Add X1.
7. Write `questionsStillTrue` (rules 4 and 6). Call it from typedIntoRecord, ingestSnapTradeSync, recordFileImport, moveOldCopiesToRecordOnce and after each answer. Store `values`, `contradicted`, `beyond` and `expired` too.
8. Add writers for V2, S2, S3 and M1.
9. Put the new functions on the master file with their IDs. File and code are both updated and they match 100%.

## 6. Tests

| Name | Numbers |
|---|---|
| changed-mine-to-list-correct | 20 → 30 VTI, $6,200, no keep fact in force |
| changed-theirs-to-mine | $6,200 → $6,050; next sync asks nothing |
| changed-both-to-mine | 60 → 30; list question gone |
| changed-back-again | mine → theirs → mine: $6,050, one answer fact |
| undo-with-later-sale | list correct, 10 sold from the new lot, then mine → S1 raised |
| list-names-the-sold-lot | $750 → $250; 150 shares both ways |
| two-unnamed-sales-ask | two sales of 25, Feb lot short 50 → two S1 |
| one-removal-one-question | one E4; keep away → 20; two later syncs ask nothing |
| newer-list-closes-older | files and syncs: Jun 20, Jul none, Aug 20 → 0 stored; Aug 15 → one, 20 against 15 |
| option-expiry-sale | 200 at $0 on 2026-02-20, −$800, 0 questions |
| option-gone-asks-expired | X1; expired → same sale |
| typed-question-dropped | Jul 29 vs Jul 30; edit to Jul 30 → 0 |
| needs-a-date-clears | answer Jun 21 → flag off; values on Jun 21 |
| answered-stays-answered | 450/500, +100 → none; 650 → asked |
| every-kind-has-a-writer | 18 of 18 kinds, each choice writes its rows (the guard counts the kinds it saw) |

## 7. Out of scope

The screens are drawn in phase 3; the sentences above set which figures each one names. Option exercise and assignment stay OTHER, and the list question still asks about them. Storing `answerTo` in the cloud belongs to the cloud-storage design.

## 8. Risks

- **Undo across later rows**: S1 covers sales; transfers need a test.
- **Cost**: each re-check runs purchasesFromList; time it on 50 holdings.
- **Merging hides a second difference**: the key must carry the figures.
- **Older phones**: stored questions without a key are re-raised from the record, never trusted.
- **No expiry date sent**: no sale is made; X1 asks with the date blank.
