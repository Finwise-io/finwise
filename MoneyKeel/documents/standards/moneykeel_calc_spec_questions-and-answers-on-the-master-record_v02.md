# Questions and answers on the master record — design v02

2026-11-12 · Design only, no code changed · Follows DEC-10342, DEC-10385, DEC-10386, DEC-10471, DEC-10515, DEC-10749 and the cloud design (`moneykeel_calc_spec_cloud-copy-of-the-master-record_v01.md`, R5 and R9). v01 is in `archive/2026-11-12_moneykeel_calc_spec_questions-and-answers-on-the-master-record_v01.md`.

**What changed from v01.** A question has two keys: a name without figures, used to undo, and a difference with figures, used to decide whether to ask again. An undo touches only rows still in force. Duplicates are removed across all three keys. A newer list can undo an older answer. Also new: kinds D1, T1, R1, X2; a store action; keying old answers; two phones. Rule 9 follows DEC-10471; wording fixed.

## 1. Summary

Every question gets one name, the rows its answer writes carry that name, and one checker re-tests every stored question after every write. **The newest answer wins, after undoing the earlier one — never over something he has changed since.** An option's expiry becomes a sale at $0.

## 2. Today

- `asset-record.ts:617` MK-NW-F-238 raises event questions and `:2211` MK-NW-F-273 writes the answers. Its "mine after theirs" branch (`:2214`) skips the keep-date fact.
- `:2563` MK-NW-F-277 raises list questions and `:2805` MK-NW-F-278 writes the answers. The keep-mine fact is written at `:2811` and read at `:2588-2594`, and it is never removed.
- MK-NW-F-256, -247, -249, -257, -255, -263 and -250 find differences that are never stored. `asset-record-from-typed.ts:683` and `:700` save refused edits only as faults. `asset-record-from-broker.ts:303-306` saves an expiry as OTHER.
- `src/store/useStore.ts:487` keeps questions under `<account>`, `#typed` (`:147`) and `#moved` (`:1412`). The sync (`:1053-1062`) never closes a question a newer list settled. The file import never re-checks, and `needsADate` sticks (`:1395`). Nothing in `src/` writes an answer.

## 3. The question kinds

"Robinhood" also stands for "your file of Jun 30, 2026". Each sentence names both sources and values (DEC-10471), and each answer writes a fact with the question's name.

| # | Kind · raised by | When | The sentence | Choices → what each writes |
|---|---|---|---|---|
| E1 | event price · F-238 | same day and shares, other price | "The information from Robinhood indicates price of $210 for 20 VTI bought Feb 10, 2026; you entered $205. Confirm changing the price to $210. This changes the sale of 5 VTI on Mar 10: it made $225, it will make $200." (sales from MK-NW-F-272, `:2150`) | **Change** → typed correction with Robinhood's figures · **Keep mine** → keep-date and keep-price facts · **Two purchases** → the arriving row saved |
| E2 | event date · F-238 | same shares, up to 5 days apart | "…indicates 10 VTI bought Jan 10, 2026; you entered Jan 12. Confirm changing the date to Jan 10." plus each sale it moves | as E1 |
| E3 | event ratio · F-238 | a split resent, other ratio | "…indicates the TSLA split of Jan 15, 2026 was 3-for-1; the record holds 2-for-1. Confirm changing it to 3-for-1." | **Change** / **Keep mine** |
| E4 | taken away · F-238 | the history resends a purchase he took away, and no list covers it | "Robinhood sends again 10 VTI bought Jan 10, 2026 at $200; you took this purchase away. Confirm it stays taken away: 20 shares." | **Stays away** → fact · **Put it back** → purchase saved again: 30 |
| L1 | list typed · F-277 | the list differs from a typed purchase | "Robinhood's list of Mar 1, 2026 indicates 300 MSFT bought Jul 30; you entered 500 bought Jul 29. Confirm changing MSFT to 300 shares bought Jul 30." | **The list is correct** → purchases replaced (keeping shares sold), listed lots added · **Mine is correct** → fact |
| L2 | not listed · F-277 | no transaction explains the difference | "Robinhood's list of Jul 31, 2026 leaves out the 20 VTI on record, and no sale is on record. Confirm changing VTI to 0 shares." | as L1 |
| L3 | removed · F-277 (absorbs E4) | the list states a purchase he took away | "Robinhood still lists and resends 10 VTI bought Jan 10, 2026 at $200; you took it away. Confirm it stays taken away: 20 shares." | **Stays away** → list and event facts · **Put it back** → purchase saved again: 30 |
| L4 | list price · F-277 | another price for a lot | "Robinhood's list indicates $345 for 100 MSFT bought Jul 30, 2026; the record holds $350. Confirm changing to $345." | **Change** → typed price correction · **Keep mine** → fact |
| L5 | count · F-277 | a broker average states other shares | "Robinhood indicates 1,000 X; the record holds 500, and no transaction explains the other 500. Confirm adding 500 shares with no date or price." | **Change** → one undated purchase · **Keep mine** → fact |
| L6 | sold from · F-277 (new) | the lots differ only by where an unnamed sale came from | "Robinhood lists 100 MSFT bought Jan 10 and 50 bought Feb 10, 2026. The record counts the 50 shares sold on Mar 10 as coming from the Jan 10 purchase. Confirm they came from Feb 10: the sale made $250, not $750." | **The list is correct** → typed sale correction naming Feb 10 · **Mine is correct** → fact |
| X1 | expired · F-277 (new) | an option past its expiry leaves the list, with no sale on record | "Robinhood no longer lists your 2 AAPL $260 calls expiring Feb 20, 2026 (200 shares, bought at $4.00 a share). Confirm they expired worthless on Feb 20: a loss of $800." | **Expired** → sale of 200 at $0 on Feb 20 · **Sold or exercised** → fact; he enters it; "Robinhood says 0" shows meanwhile |
| X2 | exercised · F-277 (new) | in one update, an option leaves and its shares arrive | "Robinhood dropped 2 AAPL $260 calls and added 200 AAPL shares on Feb 20, 2026. Enter what happened." | **Enter it** → his typed transactions · **Leave as is** → fact. One question, never two |
| S1 | which lot · F-256 | a sale could have sold an undated purchase (DEC-10385) | "You sold 100 X on Nov 10, 2026 at $420. Which purchase did they come from?" | one choice per purchase made by that day, with its gain ("Nov 5 · 100 at $400 → $2,000") → typed sale correction with `sells` |
| S2 | sale before list · F-257 | a typed sale is dated before a list that still shows the shares | "You entered a sale of 200 MSFT on Nov 10, 2026, but Robinhood's Nov 16 list still shows them. Confirm Nov 10." | **Keep** → fact · **Change the date** → typed correction · **Take it away** → removal |
| S3 | sold beyond · F-255 | a sale takes more shares than the record holds | "Robinhood sends a sale of 300 X on Feb 5, 2026; the record holds 200. Enter the purchase the other 100 came from." | **Enter it** → typed purchase · **Leave not known** → fact |
| D1 | shares differ · F-263 (new) | shares differ, no list question covers it | "Robinhood says 300 MSFT; the record holds 500 and no sale explains 200. Confirm changing MSFT to 300 shares." | **Change** → as "the list is correct" · **Keep 500** → fact; "Robinhood says 300" stays shown |
| T1 | total differs · F-250 (new) | stated total ≠ rows | "Robinhood states $169,665; the record adds up to $168,271, $1,394 less. Enter what is missing." | **Enter it** → typed holding or cash · **The rows are right** → fact |
| R1 | which purchase · typed `:683`, `:700` (new) | his edit matches two purchases | "You changed the MSFT lot of Jul 30, 2026 to $320. Two purchases match: 100 at $350 from Robinhood and 100 at $350 you entered. Which one?" | each purchase → typed correction (or removal) of that one · **Cancel** → nothing |
| V1 | values · F-247 | Robinhood's value for a day he typed | "The information from Robinhood indicates $170,000 on Nov 3, 2026; you entered $172,500. Confirm changing Nov 3 to $170,000." | **Change** → typed copy of Robinhood's values · **Keep mine** → fact |
| V2 | no date · F-249 | values given with no date | "Your file imported Nov 4, 2026 does not say what day its $4,800 is from. What day is it from?" | **A date** → typed copy on that date, undated rows removed · **Not known** → fact; kept off the screens |
| M1 | not explained · F-228 | the move could not place it | "The phone shows 20 VTI moved out on Mar 3, 2026, but not which purchase they came from. Enter that purchase, or leave the move off." | **Enter it** → typed purchase and transfer · **Leave it** → fact |
| C1 | confirm my change · F-279 | he changes a broker's figure | "The information from Robinhood indicates price of 350, you entered 320. Confirm changing price for 100 shares of MSFT to 320." plus each sale it moves | **Confirm** → typed correction (F-281) · **Cancel** → nothing. Asked at once, never stored |

## 4. The rules for answers

**Rule 1. Two keys.** The *name* has no figures: the account, the holding, the family (event, list, sale or value), the purchases on record (as first saved), and the listed dates or the sale. The *difference* is the name plus the figures. Undo and duplicates use the name; asking again uses the difference (Rule 8). Example: typed 450 against Robinhood's 500, "Keep mine". A list of 650 is the same name with a new difference, so it is asked. "The list is correct" finds the keep-mine fact by name, removes it, and gives 650.

**Rule 2. The newest answer wins, after undoing the earlier one.**
- The undo touches only rows still in force: a correction goes back to the figures it replaced, and a new row is removed. Then the new choice runs.
- If he has changed a row since, it is not undone. He is asked instead. Example: E1 "Change" makes VTI $205 → $210, and he later types $208. When he switches E1 to "Keep mine", he sees: "You entered $208 on Mar 3 after this answer. Confirm changing price for 20 shares of VTI to $205."
- Example: typed VTI 10 at $195 and 20 at $205; Robinhood sends $200 and $210. "Change" costs $6,200; switching to "Keep mine" gives $1,950 + $4,100 = $6,050. "Two purchases" (60) switched to "Keep mine" gives 30.
- A sale from an undone lot: if every purchase it could take from is dated, oldest first applies (DEC-10342); if one is undated, he is asked S1 (DEC-10385).

**Rule 3. "The list is correct" names a sale's lot (L6).** Shares do not change. MSFT Jan 10 100 at $50, Feb 10 100 at $60, 50 sold at $65 on Mar 10: oldest first gives 50 × $15 = $750; the list (Jan 100, Feb 50) names Feb: 50 × $5 = $250. Several possible sales: each is S1.

**Rule 4. One question per difference, wherever kept.** Same name = one question, across all three keys. An event and a list question match when the event's purchase on record is among the list question's purchases (taken away: a listed lot of the same date and shares). The list question is shown (the list states what is held, DEC-10471); the answer writes both facts. Example: removing VTI Jan 10 raises only L3.

**Rule 5. A newer list settles an older list's question.**
- The older question closes once a later list for that holding is set beside the record.
- If it matches the record as it was before he answered the older question, that answer is undone (Rule 2). He sees: "Robinhood's list of Aug 31 shows the 20 VTI again, so your Jul 31 answer was undone."
- Example: Jun 30 lists VTI Jan 10 20 at $200. Jul 31 leaves it out, and he answers "The list is correct" (0 shares). Aug 31 lists it again, so the Jul answer is undone: 20 shares at $200 bought Jan 10, $4,000. Nothing is added without a date or price.
- An answer sent to a closed question writes nothing, and he is told: "Robinhood's list of Aug 31 already settled this; nothing changed."

**Rule 6. An option's expiry is a sale at $0 on its expiry date** (a transaction detail, DEC-10471). This covers OPTIONEXPIRATION and typed or file expiries. Shares = contracts × shares per contract; the date is the broker's, else the option's own. Example: 2 calls bought at $4.00 a share cost 200 × $4 = $800. The sale on Feb 20 loses $800, and nothing is asked.

**Rule 7. A question no longer true is dropped.** After every write to an account, each stored question is asked again; one not raised again is dropped. `needsADate` comes from F-249. Example: E2 (typed Jul 29, Robinhood Jul 30) is dropped when he edits his date to Jul 30.

**Rule 8. An answered question comes back only when its difference changes.** Example: 450 kept against 500 (a gap of 50). After buying 100, 550 against 600 is not asked; 650 is (Rule 1).

**Rule 9. Until he answers, the record keeps what it holds and shows the other figure** (DEC-10471, example 1). Example: 500 MSFT on record, Robinhood says 300, no sale: 500 stays, "Robinhood says 300" shows; the sale of 200 arriving makes it 300. Only a gain waiting on S1 shows as not known (DEC-10385).

**Rule 10. Two phones, two answers.** Both are kept; the later counts and the other is shown in a note (cloud design R5, R9). Example: phone A answers "Keep mine" at 10:02 and phone B answers "Change" at 10:05. The price is $210, and a note shows that phone A said "Keep mine".

## 5. Build steps, in order

1. Add `answerTo` (the question name) to AssetRow, and write `questionName` and `differenceKey` for every kind.
2. Key old answers: each stored answer fact (`eventPair`, `keepsOverList`, `valuesAnswered`) gets its name, and so do the rows saved with it (same account, holding and time-stamp). The guard prints how many it saw and how many it keyed; any unkeyed fails the build.
3. Write `undoAnswer` (rows still in force only, otherwise ask) and `answerQuestion`. Delete the "mine after theirs" branches at `asset-record.ts:1079` and `:2214` only after step 2 reports 0 unkeyed.
4. Add a store action, `answerAssetRecordQuestion(accountId, question, choice)`, that writes the answer and then runs step 8. Add `confirmMyChange` for C1.
5. Add L6 to F-277 and its writer to F-278.
6. Keep each option's expiry date as a fact. Map OPTIONEXPIRATION in F-193, and typed or file expiries, to a $0 sale. Add X1 and X2.
7. Add D1, T1, R1, and writers for V2, S2, S3 and M1. Typed `:683` and `:700` raise R1 instead of a fault.
8. Write `questionsStillTrue` (Rules 4, 5, 7, all three keys). Call it from all four store writers and from step 4.
9. Put the new functions on the master file with their IDs, and log the rulings. File and code are both updated and they match 100%.

## 6. Tests

- gap-moves-then-list-correct: 450 kept against 500, then a list of 650 → 650, and no keep fact left.
- undo-spares-his-edit: $210, then he types $208, then "Keep mine" → he is asked first.
- changed-answers: 20 → 30; $6,200 → $6,050; 60 → 30.
- undo-dated-lots-no-question: 0 questions.
- list-names-the-sold-lot: $750 → $250.
- one-removal-one-question: L3 only.
- same-question-three-keys: shown once.
- newer-list-closes-older: 0 questions.
- newer-list-undoes-answer: $4,000 from Jan 10, with the note.
- closed-question-answer: 0 rows, "already settled".
- option-expiry-sale: −$800.
- x1-sold-closes.
- exercise-one-question.
- keeps-500-shows-300.
- e1-names-sales: $225 → $200.
- two-phones: $210 and one note.
- old-answers-keyed: the guard counts what it saw.
- every-kind-has-a-writer: 22 of 22.

## 7. Out of scope

The screens (phase 3), and how an exercise is written to the record (X2 only asks).

## 8. Risks

- **Cost**: time the re-checks on 50 holdings.
- **Too wide a name** merges two differences; test two lots on one date.
- **Unkeyed old answers** delay step 3.
- **Phone clocks** pick the later answer; the other is shown.
