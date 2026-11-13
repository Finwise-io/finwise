# The cloud copy of the master record — design v01

Written 2026-11-12 for the engineer who builds it and for the founder. Design only; no code changed.
It follows DEC-10342/10471 (one master record, one dated row per event, nothing overwritten), DEC-10514 (the record is saved to the cloud too), DEC-10685 (only the phone that read the latest cloud copy saves), DEC-10749 (a copy the phone cannot unlock is never taken as new) and DEC-10813 (another person's sign-in sets the previous person's data aside).

Words: **the record** = the list of every event in what the account holder owns. **The profile** = everything else the cloud keeps (accounts, budget, plan). **A key** = the secret that locks the data so the server cannot read it. **A merge** = putting two copies together so nothing from either is lost.

## 1. The recommendation

Keep today's safety rule (a phone saves only after reading the cloud's latest copy) but stop refusing when another phone saved first: read the newer copy, add this phone's unsaved rows after it, save. Every row gets a name no other phone can make. A broker event both phones fetched is saved once; two corrections of one row are both kept, the later counts, and the account holder is asked. The profile merges item by item by time stamp, so accounts typed offline survive. A household shares one key, passed with a one-time key code. Delete account removes every cloud document. The old activity list and daily values stay on the phone; the record carries those events.

## 2. Today, as the code does it

- **Profile save:** two seconds after any change the whole profile overwrites `users/{owner}.appStateEnc`, unchecked (`app/_layout.tsx:318-335`; `src/services/firebase.ts:474-480`, MK-XS-F-073). The last phone to save wins every field.
- **Profile load:** at each start the cloud profile replaces the phone's (`app/_layout.tsx:254-256`); only a same-session retry keeps the phone's (`:210`). **Problem 3.**
- **Whose data:** saving needs `assetRecordOwner` to match (`app/_layout.tsx:166-170`). A phone from before this build has none, so an offline first start saves nothing and the next online load replaces it; the record typed offline is dropped (`:106-108`, `:250`, `:261`). **Problem 4.**
- **Record save:** parts of 400 rows under `users/{owner}/assetRecord/{n}` plus a plain marker (`src/services/sync/assetRecordCloud.ts:24`, `:220`). One transaction writes only if the marker is the one this phone last read (`firebase.ts:627-645`, MK-XS-F-233). Otherwise nothing is written and a fault recorded (`assetRecordCloud.ts:356-366`, MK-XS-F-240); at sign-in, records that part ways are never saved (`:206-215`, MK-XS-F-230). **Problem 1.**
- **Row names:** highest number plus one (`MoneyKeel/functions/networth-and-performance/asset-record.ts:357`, MK-NW-F-233 addRows). Two phones at 390 rows both make "391".
- **Keys:** each person gets their own key at sign-up (`firebase.ts:96`). A household member reads the owner's documents (`firestore.rules:22-28`) with a different key, so reads are unreadable and saves blocked (`app/_layout.tsx:221-226`). **Problem 2.**
- **Delete account:** deletes `users/{uid}` and the member document only (`firebase.ts:443-448`); Firestore leaves the documents under it. **Problem 5.**
- **Phone only:** 33 stored fields are outside `SYNC_FIELDS` (`app/_layout.tsx:25-38`), among them `transactions`, `snapshotDays`, `invDaily`. **Problem 6.**

## 3. The rules

**R1 — Row names are unique across phones.** A new row is `<phone tag>.<count>`: 8 characters from the phone's id (`getPhoneId`, `firebase.ts:670`), count = this tag's highest + 1. Old names "1", "2"… stay.
*Example:* cloud rows 1–390. Phone A adds `a3f9k2qm.1`–`.20`; phone B adds `b7x1p4td.1`–`.5`. 25 names, none alike.

**R2 — When another phone saved first, merge and save; never refuse.** Read the cloud record whole (as today), keep every cloud row in order, add this phone's missing rows after them, save through the same marker transaction. DEC-10685 holds: the save follows a read of the latest copy.
*Example:* cloud 390 rows. A adds 20 and saves: 410. B, which read 390, adds 5; its save sees a new marker, so B reads the 410 and adds its 5: 415. Part 0 holds rows 1–400, part 1 rows 401–415. The cloud held 410, so B writes only part 1 (10 rows become 15) and the marker.

**R3 — An event both phones fetched is saved once.** The merging phone's unsaved rows from a broker, file or price feed go through the door every arrival uses (MK-NW-F-238 sortArriving), which matches the broker's own key. Typed rows are added as written.
*Example:* both phones fetched Robinhood's $42.10 VTI dividend (key `rh-88213`). It counts once: $42.10, not $84.20.

**R4 — Once only, clashing old names are renamed before the merge.** Only rows that never reached the cloud are renamed, and whatever names them follows.
*Example:* B holds unsaved rows 391–395 from before the update; the cloud holds A's 391–410. B's become `b7x1p4td.1`–`.5`; B's sale naming "393" now names `b7x1p4td.3`. Merged: 410 + 5 = 415.

**R5 — Two corrections of one row: both kept, the later counts, the account holder is asked.**
*Example:* row 14 is 100 MSFT at $350. A corrects to $320 at 10:02; B, offline, to $335 at 10:05. $335 counts (100 × $335 = $33,500) and the account holder is asked which is correct. Choosing $320 saves a new correction: $32,000.

**R6 — A row naming a row the other phone removed goes to the account holder** (the check a sync runs, MK-NW-F-256).
*Example:* A removes purchase row 120 (50 VTI at $200); B, offline, sells 20 VTI from row 120. The account holder is asked which purchase the 20 came from; the gain shows as not known meanwhile.

**R7 — A merge beaten by a third phone tries again, at most 3 times**, then records a fault; nothing is lost and the next change retries.
*Example:* three phones save at once; the third try of the slowest succeeds, or after 3 losses all its rows stay on the phone.

**R8 — The profile merges item by item, by time stamp.** Each setting, list item with an id, and dated entry carries when it last changed; the phone keeps its unsaved changes. A save transaction reads the cloud version: unchanged since this phone read it → save; changed → keep the later-stamped value of each item.
*Example:* cloud: Checking $4,000, Brokerage $30,000. A, offline, adds Roth IRA $8,000 at 09:00; the spouse's phone adds HSA $3,000 at 09:30. Merged: $4,000 + $30,000 + $3,000 + $8,000 = $45,000.

**R9 — Both phones changed one item: the later counts, the other is shown in a note.**
*Example:* budget $3,500. A sets $4,000 at 10:00 offline; B sets $3,800 at 10:20. $3,800 counts; A's phone says its $4,000 was changed on another phone.

**R10 — A deletion is a stamped change, so an older copy does not bring the item back.**
*Example:* A deletes the goal "Car $15,000" at 11:00; B edited it at 10:40. It stays deleted.

**R11 — What the account holder typed offline is never replaced.** Each start merges (R8), never overlays. The phone's data is this person's where the phone noted them as owner (`phoneDataOwner`, DEC-10813); the record's owner is noted with it.
*Example:* a Build 57 phone signed in as Pat is updated and opened offline. Pat changes Savings $12,400 → $12,900 and types 10 VTI. Online two hours later: today both are lost; under R11 both are saved.

**R12 — A copy this phone cannot unlock is never taken as new (DEC-10749).** Each encrypted document carries a plain key fingerprint; without that key the phone keeps its data and saves nothing.
*Example:* the profile says key `9c41e0aa`; Sam's phone lacks it, so it waits for R13.

**R13 — A household shares one key: the owner's existing key**, so nothing is re-locked. Beside the 6-letter invite code, the owner's phone shows a one-time 20-letter key code; the key, locked by that code, is stored on the invite. The joining member types both, locks the key again under their own password and recovery code on their own document, and deletes the invite. Invites expire after 7 days.
*Example:* Pat invites Sam with `K7MQ2D` and a key code. Sam adds Brokerage $30,000; Pat's phone reads it.

**R14 — Recovery:** the member's recovery code unlocks both keys after a password reset; a member who lost it too gets a new invite from anyone holding the key.
*Example:* Sam loses password and code; Pat re-invites; Sam reads the same $30,000.

**R15 — Unsaved changes are set aside with their owner's data (DEC-10813)** and never saved under another person.
*Example:* Pat's unsaved Roth IRA $8,000 is set aside when Sam signs in; it merges into Pat's account when Pat returns.

**R16 — Delete account removes every cloud document:** the phone deletes each part, the marker, the member document, then the person's document; a server function deletes again everything under the person's id. *A household:* when the owner deletes their account while a member exists, the household’s shared documents stay with the member, who becomes the household’s owner; only the owner’s own person document, parts and marker are deleted. *Example:* A (owner) and B share household h1 with 815 record rows; A deletes A’s account — h1 and its 815 rows remain, owned by B. (Decided 2026-11-12 by Claude under the decide-and-apply standing order; to reverse, delete h1 with A.)
*Example:* 815 rows ÷ 400, rounded up = 3 parts; 3 + 1 marker = 4 documents, then `users/{uid}`.

**R17 — The old activity list and daily values stay on the phone.** The record carries every purchase, sale, dividend and dated value (DEC-10342 replaced the old copies); two cloud copies could disagree. Each other field:

| Field | Recommendation |
|---|---|
| `transactions`, `snapshotDays`, `invDaily` (old activity, old daily record, old daily points) | phone only — the record carries them |
| `planHistory` (saved plan versions) | add to profile |
| `dismissedInsights` (hidden cards) | add to profile |
| `knownPayees` (payees confirmed "this was me") | add to profile |
| `goalsSeeded`, `employmentStatus` (setup answers) | add to profile |
| `milestoneHighSeen`, `transitionChecks`, `drawOrder`, `lensOverride` (the account holder's choices) | add to profile |
| `txnFlags` (flags on old activity rows) | phone only |
| `lastRetireChance` (worked out again) | phone only |
| `snaptradeActivityCursor`, `snaptradeLastSyncAt`, `snaptradeSeenKeys` (this phone's broker fetch) | phone only — R3 saves once |
| `rebuiltFrom`, `rebuiltAt`, `syncFailures`, `priceCache`, `pricesFetchedAt`, `assetRecordFaults`, `debts`, `onboardingDraft` | phone only |

*Example:* a new phone gets every record row and Pat's saved plans; the old activity screen stays empty there until phase 3 moves screens onto the record.

## 4. The data layout in Firestore

| Document | Fields (new in **bold**) |
|---|---|
| `users/{uid}` | email, name, createdAt, keyEnvelope, householdId, appStateEnc, **profileRev** (goes up 1 per save), **keyId**, **householdKeyEnvelope** (members) |
| inside appStateEnc | profile fields, **stamps** {"monthlyBudgetTarget": time, "assetAccounts#acc_7": time, deletions} |
| `users/{owner}/assetRecord/{0,1,2…}` | enc, **keyId** |
| `users/{owner}/assetRecord/marker` | writer, rows, lastRowId, lastWrittenAt, at (unchanged) |
| `households/{owner}/members/{member}` | code, joinedAt (unchanged) |
| `invites/{code}` | householdId, inviterName, createdAt, **wrappedKey**, **expiresAt** |

Rules: the owner or a member may delete an invite; a member document is created only before `expiresAt`.

## 5. The steps to build

Each step updates code and master file together and ends green.

1. **R1:** MK-NW-F-233 addRows counts per tag; the number sorts at `asset-record.ts:3327-3328`, `:3400` use record position.
2. **R5:** MK-NW-F-234 rowsInForce counts the later of two corrections; add the question.
3. **R2–R4, R6:** a pure merge function in `assetRecordCloud.ts`.
4. **R2, R7:** MK-XS-F-240 and MK-XS-F-230 merge where they now refuse.
5. **R11:** `profileIsTheirs` (`app/_layout.tsx:166`) reads `phoneDataOwner`.
6. **R8–R10, R15:** the unsaved-changes list and stamps; set aside with the data.
7. **R8, R11:** MK-XS-F-073 saves in a `profileRev` transaction; `loadProfileFor` merges (`app/_layout.tsx:254-256`).
8. **R12:** key fingerprint on every encrypted document.
9. **R13, R14:** key code at invite (`src/onboarding/modules.tsx:2538`), unlock at join (`src/screens/AuthScreen.tsx:53-70`), household key for household documents, rules.
10. **R16:** MK-XS-F-072 deletes every document; a server function in `functions/index.js`.
11. **R17:** fields marked "add to profile" join `SYNC_FIELDS`.

## 6. The tests

| Rule | Test | Pass when |
|---|---|---|
| R1 | `two phones name 20 and 5 rows after 390` | 25 unique names |
| R2 | `merge 390 → 410 → 415` | cloud 415; only part 1 written, 15 rows |
| R3 | `one $42.10 dividend from two phones` | one row, total $42.10 |
| R4 | `old 391–395 clash with 391–410` | 415 rows; sale names `b7x1p4td.3` |
| R5 | `MSFT $320 at 10:02, $335 at 10:05` | $33,500; one question; answer gives $32,000 |
| R6 | `sale from a removed purchase` | one question; gain not known |
| R7 | `three phones save at once` | no row lost |
| R8 | `offline Roth $8,000 + HSA $3,000` | 4 accounts, $45,000 |
| R9 | `budget $4,000 at 10:00 vs $3,800 at 10:20` | $3,800; one note |
| R10 | `deleted 11:00, edited 10:40` | stays deleted |
| R11 | `offline first start after update` | cloud holds $12,900 and the 10 VTI row |
| R12 | `fingerprint not on phone` | data kept, nothing saved |
| R13 | `Sam joins, adds $30,000` | Pat reads $30,000; invite gone |
| R14 | `Sam resets with recovery code` | both keys unlock |
| R15 | `Pat's unsaved Roth when Sam signs in` | never in Sam's cloud |
| R16 | `delete with 815 rows` (rules emulator) | 0 documents under `users/{uid}` |
| R17 | `SYNC_FIELDS contents` | matches the table field by field |

## 7. Out of scope

A member's own data from before joining; taking the key back from a member who leaves; moving screens onto the record (phase 3); how questions and answers behave (its own design, per DEC-10685); desktop; the profile's one-megabyte limit (`moneykeel_data_spec_cloud-storage-shape_v01.md`).

## 8. Risks

- **Phone clocks** pick "later" (R5, R8–R10); a wrong clock picks the wrong winner, but the loser is always kept or shown.
- **R3 needs the broker's key**; a hand-edited file may not match.
- **The key code travels by message**; whoever holds both codes can join, as with the invite code today. Expiry limits it.
- **A member who leaves keeps the key** to copies already taken.
- **R4 must rename question keys too**, or a question loses its row.
- **Deleting offline** may stop part-way until the server function is deployed.
