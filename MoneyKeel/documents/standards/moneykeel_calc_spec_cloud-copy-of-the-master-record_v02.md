# The cloud copy of the master record — design v02

Written 2026-11-12 for the engineer who builds it and for the founder. Design only; no code changed.
It follows DEC-10342/10471 (one master record, one dated row per event, nothing overwritten; every difference put to the account holder before anything changes), DEC-10514 (the record is saved to the cloud too), DEC-10685 (only the phone that read the latest cloud copy saves), DEC-10749 (a copy the phone cannot unlock is never taken as new) and DEC-10813 (another person's sign-in sets the previous person's data aside).

**What changed from v01** (outside review, 2026-11-12): random 12-character tags kept off backups (R1); R2 named as DEC-10685 step 6's design; R3 repoints a dropped duplicate's references; R5 waits for the account holder; questions reach the cloud (R6a); old builds refused (R8a); a change of data owner sets aside (R11); salted fingerprint (R12); member access narrowed, invites provable and expiring (R13); owner recovery via a member (R14); delete account per the lead (R16); start state for old data (R18); steps 5 and 7 ship together.

Words: **the record** = every event in what the account holder owns. **The profile** = the rest the cloud keeps (accounts, budget, plan). **A key** = the secret that locks the data from the server. **A merge** = joining two copies, losing nothing. **The data owner** = whose cloud copy the phone holds: a household or one person.

## 1. The recommendation

Replace DEC-10685's stop-gap refusal with a merge: read the newer cloud copy, add this phone's unsaved rows after it, save. Row names are unique per phone; a broker event fetched twice is saved once; two corrections of one row wait for the account holder. The profile merges item by item by time stamp, and old app versions are refused. A household shares one key via a one-time key code. Delete account runs on the server and hands a household to its remaining member.

## 2. Today, as the code does it

- **Profile:** saved whole over `users/{owner}.appStateEnc`, unchecked, 2 s after any change (`app/_layout.tsx:318-335`; `src/services/firebase.ts:479`, MK-XS-F-073); each start the cloud copy replaces the phone's (`app/_layout.tsx:254-256`). **Problem 3.**
- **Whose data:** saving needs `assetRecordOwner` (`app/_layout.tsx:166-170`), which a pre-update phone lacks, so offline typing is never saved, then replaced (`:106-108`, `:250`, `:261`). **Problem 4.**
- **Record:** parts of 400 rows plus a plain marker (`src/services/sync/assetRecordCloud.ts:24`, `:220`); one transaction saves only if the marker is unchanged (`firebase.ts:627-645`, MK-XS-F-233), else nothing is saved and a fault recorded (MK-XS-F-240, MK-XS-F-230). **Problem 1.** Row names are highest number + 1 (`asset-record.ts:357`, MK-NW-F-233); the phone id is `phone-<time>-<random>` in backed-up storage (`firebase.ts:670-680`).
- **Keys:** one per person (`firebase.ts:96`), so a member cannot read the owner's data (`app/_layout.tsx:221-226`), yet the rules let a member write and delete it (`firestore.rules:22-28`). **Problem 2.**
- **Delete account** leaves everything under `users/{uid}` (`firebase.ts:443-448`). **Problem 5.** 33 stored fields never leave the phone (`app/_layout.tsx:25-38`). **Problem 6.**

## 3. The rules

**R1 — Row names are unique across phones.** A new row is `<tag>.<count>`. The tag is 12 characters from a secure random source (as the data key is made, `dataCrypto.ts:205`), stored on this device only (the keychain's "this device only" setting), so a backup restored on another phone makes a new tag. Count = this tag's highest + 1. A phone that finds its tag on rows it did not write takes a new tag. Old names "1", "2"… stay.
*Example:* cloud rows 1–390. A adds `q8z3m1x7k2pa.1`–`.20`; B adds `h4t9w2c6n0re.1`–`.5`. 25 names, none alike.

**R2 — Merge: the design DEC-10685 step 6 asked for**; its refusal is the stop-gap until this is built (*lead's decision, reversible*). The phone reads the cloud record whole, keeps every cloud row in order, adds its missing rows after them, and saves through the same marker transaction.
*Example:* cloud 390. A adds 20, saves: 410. B read 390, added 5; its save sees a new marker, so B reads 410, adds 5: 415, writing only part 1 (rows 401–415).

**R3 — An event both phones fetched is saved once.** The merging phone's unsaved broker, file and price-feed rows go through MK-NW-F-238 sortArriving, which matches the broker's key. Whatever named a dropped duplicate (correction, sale, batch, question) names the kept row.
*Example:* both fetched Robinhood's $42.10 dividend (key `rh-88213`); B corrected its copy to $42.00. One dividend row; B's correction names A's row.

**R4 — Once only, clashing old names are renamed before the merge.** Only rows that never reached the cloud; everything naming them, question keys included, follows.
*Example:* B's unsaved 391–395 clash with A's 391–410; they become `h4t9w2c6n0re.1`–`.5`. Merged: 410 + 5 = 415.

**R5 — Two corrections of one row change nothing until the account holder answers** (DEC-10471). Both are kept and shown with the question; the row they correct still counts.
*Example:* row 14 is 100 MSFT at $350. A corrects to $320; B, offline, to $335. After the merge the holding still counts at $35,000 and both corrections are shown. Choosing $320 saves the answer: $32,000.

**R6 — A row naming a row the other phone removed goes to the account holder** (the check a sync runs, MK-NW-F-256).
*Example:* A removes purchase row 120 (50 VTI at $200); B, offline, sells 20 VTI from it. The account holder is asked which purchase the 20 came from; the gain shows as not known meanwhile.

**R6a — Open questions are saved to the cloud, not rebuilt on each phone**, because a question can rest on a broker figure never saved as a row ("Robinhood says $350, you entered $320"). They live in one encrypted document beside the parts, merged by question key; one whose answer row is in the record is removed.
*Example:* the $350/$320 question asked on A shows on B; answering on B removes it from both.

**R7 — A merge beaten by a third phone tries again, at most 3 times**, then records a fault; its rows stay on the phone and the next change retries.
*Example:* three phones save at once; none of the 25 rows is lost.

**R8 — The profile merges item by item, by time stamp.** Each setting, list item with an id, and dated entry carries when it last changed; the phone keeps its unsaved changes. A save transaction reads `profileRev`: unchanged → save; changed → keep each item's later-stamped value. Lists of words (`selectedGoals`, `wrapperConfirmQueue`) merge as sets; `planHistory` by date and label; any other list without ids as one item.
*Example:* cloud: Checking $4,000, Brokerage $30,000. A, offline, adds Roth IRA $8,000 at 09:00; the spouse adds HSA $3,000 at 09:30. Merged: $4,000 + $30,000 + $3,000 + $8,000 = $45,000.

**R8a — Old app versions cannot overwrite a merged profile.** The access rules accept a new profile only with `profileRev` = the stored value + 1, so Build 57's plain save is refused. A minimum app version in the cloud makes an old app say "Update MoneyKeel to keep saving".
*Example:* `profileRev` is 7; Build 57 saves without it and is refused; the merged profile at 7 stays.

**R9 — Both phones changed one item: the later counts, the other is shown in a note.**
*Example:* budget $3,500. A sets $4,000 at 10:00 offline; B sets $3,800 at 10:20. $3,800 counts; A's phone notes its $4,000.

**R10 — A deletion is a stamped change; markers are dropped after 180 days** to keep the profile far under the one-megabyte limit.
*Example:* A deletes "Car $15,000" at 11:00; B's edit at 10:40 loses; the deletion marker goes on day 181.

**R11 — Offline typing is never replaced; data owners are never mixed.** Each start merges (R8). The phone records its data owner. When it changes (joining or leaving a household, another person signing in), the phone's data is set aside under the old owner (DEC-10813) and the new owner's copy loads, never merged. A pre-update phone is noted as the signed-in person's at once.
*Example:* Pat's updated phone, offline: Savings $12,400 → $12,900; online, it is saved. Sam joins Pat's household: Sam's own $9,000 savings are set aside and return if Sam leaves.

**R12 — A copy this phone cannot unlock is never taken as new (DEC-10749).** Each encrypted document carries a fingerprint: a salted one-way hash of the key that cannot reveal it. Without that key the phone keeps its data and saves nothing.
*Example:* the profile says `9c41e0aa51d7`; Sam's phone has no key with it, so it waits for R13.

**R13 — A household shares one key: the owner's existing key.** With the 6-letter invite code the owner's phone shows a one-time 20-letter key code. The invite holds the key locked by the key code, a check value of it, and an expiry the rules fix at 7 days. Joining needs proof of the key code matching the check value, so the invite code alone opens nothing. The member re-locks the key under their own password and recovery code and deletes the invite. A member may save the profile, parts, marker and questions; never the owner's key envelope, never a delete.
*Example:* Pat invites Sam with `K7MQ2D` and a key code. Sam adds Brokerage $30,000; Pat's phone reads it. Someone holding only `K7MQ2D` is refused.

**R14 — Recovery goes both ways.** A member's recovery code unlocks both keys; a member who lost it too gets a new invite. An owner who lost both codes gets a one-time return code from a member, whose phone stores the key locked by it; the owner types it and sets a new password and recovery code.
*Example:* Pat loses both; Sam sends a return code; Pat reads the same $30,000.

**R15 — Unsaved changes are set aside with their owner's data (DEC-10813).**
*Example:* Pat's unsaved Roth IRA $8,000 is set aside when Sam signs in; it merges into Pat's account when Pat returns.

**R16 — Delete account runs on the server.** *Lead's decision, reversible.* Solo: everything under `users/{self}` goes. A member: only `users/{self}` and their member document. An owner with a member, after a warning naming the member: a server function copies the household's profile, parts, marker and questions to `users/{member}`, makes the household key the member's own, re-points the member, then deletes `users/{owner}` with everything under it, `households/{owner}/members/*` and pending invites. The member's phone treats the move as the same data owner (R11).
*Example:* Pat deletes with 815 rows: 3 parts, marker and profile move to Sam, who still sees Brokerage $30,000.

**R17 — The old activity list and daily values stay on the phone.** The record carries every purchase, sale, dividend and dated value; two cloud copies could disagree.

| Field | Recommendation |
|---|---|
| `transactions`, `snapshotDays`, `invDaily` | phone only — the record carries them |
| `planHistory`, `dismissedInsights`, `knownPayees` | add to profile |
| `goalsSeeded`, `employmentStatus` (setup answers) | add to profile |
| `milestoneHighSeen`, `transitionChecks`, `drawOrder`, `lensOverride` (the account holder's choices) | add to profile |
| `txnFlags` (flags on old activity), `lastRetireChance` (worked out again) | phone only |
| `snaptradeActivityCursor`, `snaptradeLastSyncAt`, `snaptradeSeenKeys` | phone only — R3 saves once |
| `rebuiltFrom`, `rebuiltAt`, `syncFailures`, `priceCache`, `pricesFetchedAt`, `assetRecordFaults`, `debts`, `onboardingDraft` | phone only |

*Example:* a new phone gets every record row; its old activity screen stays empty until phase 3.

**R18 — Data written before this change.** A document with no fingerprint is opened by trying the key: it opens → it is this key's, and the next save adds the fingerprint; it fails → unreadable (R12). A profile with no `profileRev` counts as 0, and an item with no stamp as older than any stamped change. A phone with no list of unsaved changes starts an empty one.
*Example:* the cloud profile from Build 57 has no stamps; A's Roth $8,000 at 09:00 is stamped, so it is kept, and `profileRev` goes 0 → 1.

## 4. The data layout in Firestore

| Document | Fields (new in **bold**) |
|---|---|
| `users/{uid}` | email, name, createdAt, keyEnvelope, householdId, appStateEnc, **profileRev**, **keyId**, **householdKeyEnvelope**, **movedFrom** |
| inside appStateEnc | profile fields, **stamps** {"monthlyBudgetTarget": time, "assetAccounts#acc_7": time, deletions} |
| `users/{owner}/assetRecord/{0,1,2…}` | enc, **keyId** |
| `users/{owner}/assetRecord/marker` | writer, rows, lastRowId, lastWrittenAt, at — a phone id, a count, a row name and times; no money and no holdings |
| **`users/{owner}/assetRecord/questions`** | enc, keyId |
| `households/{owner}/members/{member}` | code, joinedAt, **keyCodeProof** |
| **`households/{owner}/keyReturn`** | enc (the key locked by a return code), expiresAt |
| `invites/{code}` | householdId, inviterName, createdAt, **wrappedKey**, **keyCodeCheck**, **expiresAt** |
| **`config/app`** | **minVersion** |

Rules: profile writes need `profileRev` + 1; members never write `keyEnvelope` and never delete; member creation needs a matching proof before `expiresAt`; `expiresAt` must equal creation + 7 days.

## 5. The steps to build

Each step updates code and master file together and ends green.

1. **R1:** tag in device-only storage; MK-NW-F-233 counts per tag; the number sorts at `asset-record.ts:3327-3328` (by date) and `:3400` (facts, by time) use record position.
2. **R5:** MK-NW-F-234 rowsInForce: a row with two competing corrections still counts.
3. **R2–R4, R6, R6a:** a pure merge function in `assetRecordCloud.ts`.
4. **R2, R7:** MK-XS-F-240 and MK-XS-F-230 merge where they now refuse.
5. **With step 7, one release:** **R11, R15, R18** data owner and set-aside on change; unsaved-changes list and stamps.
6. **R8–R10:** per-list treatment named; deletion markers pruned.
7. **R8, R8a:** MK-XS-F-073 saves in a `profileRev` transaction; `loadProfileFor` merges (`app/_layout.tsx:254-256`); rules; `config/app`.
8. **R12:** salted fingerprint.
9. **R13, R14:** key code at invite (`src/onboarding/modules.tsx:2538`), proof at join (`src/screens/AuthScreen.tsx:53-70`), return code, rules.
10. **R16:** one server function in `functions/index.js`; MK-XS-F-072 calls it.
11. **R17:** fields marked "add to profile" join `SYNC_FIELDS`.

## 6. The tests

| Rule | Test | Pass when |
|---|---|---|
| R1 | `two phones, ids made a minute apart` / `backup restored` | tags differ / restored phone makes a new tag |
| R2 | `merge 390 → 410 → 415` | cloud 415; part 1 holds 15 rows |
| R3 | `$42.10 dividend twice, one corrected` | one row; correction names the kept row |
| R4 | `old 391–395 clash with 391–410` | 415 rows |
| R5 | `MSFT $320 and $335` | $35,000 until answered; $32,000 after |
| R6, R6a | `sale from removed purchase` / `question asked on A` | one question / seen on B, gone after answer |
| R7 | `three phones save at once` | no row lost |
| R8, R8a | `Roth $8,000 + HSA $3,000` / `Build 57 save` | $45,000 / refused (rules emulator) |
| R9, R10 | `$4,000 vs $3,800` / `deleted 11:00, edited 10:40` | $3,800 and a note / stays deleted |
| R11 | `offline first start` / `Sam joins, then leaves` | $12,900 saved / Sam's $9,000 never in Pat's cloud, back on leaving |
| R12, R18 | `unknown fingerprint` / `no fingerprint, key opens` | nothing saved / fingerprint added |
| R13 | `join with invite code only` / `expired invite` | both refused |
| R14 | `owner restored by return code` | Pat reads $30,000 |
| R16 | `owner with member deletes, 815 rows` / `member deletes` | Sam holds 815 rows, nothing under `users/{pat}` / Pat's 3 parts untouched |
| R17 | `SYNC_FIELDS contents` | matches the table |

## 7. Out of scope

A member's pre-joining cloud data (it stays in `users/{member}`); taking the key back from a leaver; households of over one member; screens reading the record (phase 3); how questions behave; desktop.

## 8. Risks

- **Phone clocks** decide "later" (R8–R10); a wrong clock picks the wrong winner, but the loser is shown.
- **R3 needs the broker's key**; a hand-edited file may not match.
- **A member who leaves keeps the key** to copies already taken.
- **If everyone loses their codes**, the data cannot be opened, as for a solo account today.
- **A phone offline over 180 days** may bring back an item deleted elsewhere.
- **Old builds** stop saving at the rules change; their typing waits on the phone.
