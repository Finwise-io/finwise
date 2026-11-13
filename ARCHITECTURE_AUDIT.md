# MoneyKeel: Architecture & Security Audit

**Repository:** `finwise` (app name MoneyKeel, bundle `co.finwise.app`) · **Branch:** `taxonomy-v1.0.7` · **Snapshot:** HEAD `5075ce0d` plus about 170 uncommitted paths in progress · **Date:** 2026-11-13
**Method:** read-only inspection of the working tree and the full git history. No code was changed. The only network activity was three unauthenticated GET/OPTIONS probes to the project's own Cloud Function URLs, to see which functions are deployed.
**Audience:** the incoming Fractional Senior Fintech Engineer.

---

## Executive summary

MoneyKeel is a **local-first, end-to-end-encrypted** React Native app on Firebase. It is not a client/server app with a database.

- Every calculation runs on the phone, in roughly 111,000 lines of TypeScript.
- The cloud (Firestore) stores **only an encrypted copy** of the user's data. The encryption key never leaves the user's devices.
- Three small Cloud Functions exist (381 lines). Only one is live: the SnapTrade broker relay.

| Area | Verdict |
|---|---|
| Secrets in the repo or git history | **Clean.** No real secret was ever committed. Two live keys sit in the local untracked `.env` and were bundled into dev builds between 2026-05-21 and 2026-06-19, so they must be rotated. |
| Calls from the phone to aggregators | **Correct for SnapTrade.** Every call goes through an authenticated server relay, and the keys live in Secret Manager. Market data (Yahoo) is fetched straight from the phone. |
| Data isolation | Firestore rules are default-deny and owner/household scoped, with 17 emulator tests. Data is also encrypted end to end. A few rules are looser than they need to be (see S3 and S9). |
| Money precision | **A weak point.** Money is stored and computed as JavaScript floating-point numbers. An exact BigInt decimal type exists, but only 4 app files use it. |
| Ledger | A newer append-only "asset record" exists. The older `transactions` list is called append-only but is hard-deleted and rewritten. |
| Subscriptions, analytics | None. |
| Critical security findings | **None.** One High (latent), five Medium. |

> **The biggest architectural decision for the incoming engineer.** The target blueprint (PostgreSQL + RLS + server-side API) assumes the **server can read the data**. The current design is deliberately **zero-knowledge**: the server cannot. You cannot have both as-is. Either:
> - (a) keep end-to-end encryption, and put the server-side work only where it is needed (aggregator tokens, webhooks, billing), or
> - (b) give up zero-knowledge for server-side computation, with `pgcrypto` and a KMS.
>
> This choice changes pillars 2–5 below, so settle it in week 1.
>
> **Founder's plan (2026-11-13):** launch the **beta on the current architecture** (Firebase, local-first, end-to-end encrypted) and **move to PostgreSQL for full launch**.
> - **Before beta:** close S1, S2, S4, S5 and S6, and fix S3.
> - **Before migrating:** decide whether the server may read user data. If yes, use RLS + `pgcrypto`/KMS. If no, Postgres stores encrypted rows, and the calculations stay on the phone.
> - **What migrates cleanly:** the append-only asset record. It has one row per event, a stable `rowId` and `replacesRowId` for corrections, and maps directly to a Postgres ledger table.
> - **What needs remodelling:** the single encrypted profile document (`users/{uid}.appStateEnc`, 55 fields) has to be split into tables.
> - **Money type:** move every stored amount to `Dec` or integer cents **before** migrating, so the data lands in `NUMERIC` columns exactly.

---

## 1. Current state inventory

### 1.1 Frontend stack

| Item | Value |
|---|---|
| Expo SDK | `expo` 56.0.8 |
| React Native / React | 0.85.3 / 19.2.3 (New Architecture on, `app.config.js` `newArchEnabled: true`) |
| Navigation | `expo-router` 56.2.8, file routes in `app/` |
| State | `zustand` 4.5.7, one store, `src/store/useStore.ts` (2,443 lines, about 114 actions) |
| Animation / graphics | react-native-reanimated 4.3.1, worklets 0.8.3, react-native-svg 15.15.4 |
| Language / tests | TypeScript ^6.0.3, Jest 29 + jest-expo 56 (666 test files, about 8,000 test cases), Maestro end-to-end flows in `.maestro/` |
| Web / desktop | `react-native-web`; `desktop/platform/` holds 3 desktop layout components, with no server |

**Navigation layout:**
- **Tabs:** `app/(tabs)/_layout.tsx` defines 5 visible tabs (Home, Net worth, Performance, Cash flow, Plan; see `src/constants/tabs.ts`) and 6 hidden ones.
- **Other routes:** 43 root stack routes in `app/`, almost all one-line re-exports of `src/screens/*`.
- **Root layout:** `app/_layout.tsx` (617 lines) is **not thin**. It holds:
  - the auth gate and route guard;
  - cloud load and save, and the profile merge;
  - the asset-record cloud save;
  - the SnapTrade sync trigger;
  - Sentry initialisation, the app lock and the recovery-code modal.

**Code layout:**

| Folder | Files | Lines | Role |
|---|---|---|---|
| `src/screens` | 49 | 23,183 | Screens |
| `src/components` | 50 | 5,678 | Shared UI |
| `src/domain` | 70 | 31,971 | Business logic |
| `MoneyKeel/functions/*` | 33 | 26,369 | Calculation functions by module (cash flow, net worth and performance, retirement…) |
| `Calculation Module code/engines` | 13 | 4,632 | Core engines (`decimal`, `money`, `ledger`, `snapshots`, `time-weighted-return`, …) |
| `src/services` | 18 | 7,816 | Firebase, sync, crypto, market data, notifications |
| `src/onboarding` | — | 3,673 | Onboarding (`modules.tsx` alone is 2,783) |

**Clean and reusable.** 31 of 45 component `.tsx` files are pure and props-only. Examples: `GaugeArc`, `HeroAmount`, `MoneyBox`, `SectionBand`, `ValueGraph`, `WindowSelector`, `DateField`, `PlanSlider`, `PlanOutcome`, `PaycheckCard`, `KeyboardAwareScreen`, `InputModal`.

**Tangled or coupled:**
- **Shared UI kit reads the store:** `src/components/UI.tsx` and `TopBar` read the store directly, so the base UI kit is not pure.
- **Components that read the store (14):** `AppLockGate`, `DebtEditorSheet`, `DrawSteerSheet`, `HouseholdBox`, `HouseholdInviteCard`, `HiddenBalancesBanner`, `MortgageRateCompare`, `PlanInputs`, `UpdateToKeepSavingBanner`, `MoneySheets`, `PlanGoals`, `UseThisPlanSheet`, plus the two above.
- **Screens and components that call Firebase, sync or network code directly (about 15):**

  | File | What it calls |
  |---|---|
  | `AuthScreen` | firebase |
  | `CashFlowScreen` | firebase `loadHouseholdPeople` (line 48) |
  | `SettingsScreen` | firebase, appLock, crashReporter, snaptradeClient |
  | `NetWorthScreen` | sync, snaptradeSync |
  | `HomeScreen` | marketData, sync |
  | `ConnectFlowScreen`, `SnapTradeConnect` | sync, snaptradeClient |
  | `HoldingDetailScreen`, `PerformanceScreen` | marketData |
  | `BudgetScreen` | economicData, fileRead |
  | `ExpenseScreen` | receiptScan |
  | `src/onboarding/modules.tsx` | firebase |
  | `app/connect-done.tsx` | snaptradeSync |
  | `HouseholdBox`, `HouseholdInviteCard` | firebase |
  | `MoneySheets` | receiptScan |
  | `DataGapsBanner` | snaptradeSync |

- **Screens doing their own money arithmetic**, which should live in `src/domain`:
  - `RetirementCockpit` (48 `Math.*` calls, lines 85–167)
  - `BudgetScreen` (44, lines 159–199)
  - `NetWorthScreen` (35)
  - `CashFlowScreen` (29)
  - `PlanHubScreen` (23)
  - `RequiredWithdrawalsScreen` and `GoalsScreen` (14 each)
- **Better:** `AccountPortfolioScreen`, `PerformanceScreen`, `HoldingDetailScreen` and `HomeScreen` mostly delegate to domain functions.
- **Files over 1,500 lines:**
  - `MoneyKeel/functions/networth-and-performance/asset-record.ts` (6,481)
  - `src/domain/performance/index.ts` (4,127)
  - `src/domain/assets/index.ts` (3,154)
  - `MoneyKeel/functions/networth-and-performance/performance.ts` (3,106)
  - `src/onboarding/modules.tsx` (2,783)
  - `src/domain/income/onboarding.ts` (2,679)
  - `src/store/useStore.ts` (2,443)
  - `src/screens/AccountPortfolioScreen.tsx` (2,012)
  - `src/screens/NetWorthScreen.tsx` (1,736)
  - `src/services/firebase.ts` (1,649)
  - `src/screens/PerformanceScreen.tsx` (1,504)

### 1.2 Backend and database

| Component | Details |
|---|---|
| **Firebase Auth** | Email and password with email verification. Set up in `src/services/firebase.ts:46-64`. |
| **Cloud Firestore** | Reached directly from the client SDK (`src/services/firebase.ts`). Protected by `firestore.rules` (120 lines) and tested by `firestore.rules.test.cjs` (17 emulator tests). |
| **Cloud Functions** (`functions/`, Node 20, firebase-functions v5, firebase-admin v12, all v2 `onRequest`, us-central1) | `snaptradeRelay` (`functions/snaptrade.js:82`). **Deployed.** Signs SnapTrade calls server-side. |
| | `aiTips` (`functions/index.js:40`). Anthropic proxy. **Not deployed, and nothing calls it.** |
| | `deleteAccount` (`functions/index.js:90`, `functions/accountDelete.js`). **Not deployed.** Until it is, a client-side fallback runs (`firebase.ts:470-474`). |
| ORM | None. |
| Other servers | None. |

**Firestore data model:**

| Path | Contents |
|---|---|
| `users/{uid}` | `appStateEnc`: the **whole synced profile** (55 fields, `src/services/sync/profileMerge.ts:15-31`) as one encrypted string. Also `keyId`, `profileRev`, `keyEnvelope`, `householdId`. |
| `users/{uid}/assetRecord/{0..n}` | The master asset record, 400 rows per part (`src/services/sync/assetRecordCloud.ts:25`), plus `marker` and `questions` documents. |
| `users/{uid}/setAside/own` | Data set aside when another person signs in on the same phone. |
| `households/{owner}/members/{member}` | Household membership. |
| `households/{owner}/keyReturn/current` | Key hand-back when a member leaves. |
| `invites/{code}` | Household invites. |
| `config/app` | Minimum app version, read-only. |
| `feedback/{id}` | Create-only. |
| `snaptrade_users/{uid}` | Server only: each user's SnapTrade user secret. |

**How money is stored.** Plain JavaScript `number` (floating point) everywhere: store types, `AssetRow` (`asset-record.ts:62-85`) and the cloud copy.
- An exact BigInt fixed-point type, `Dec` with 8 decimal places, exists in `Calculation Module code/engines/decimal.ts`.
- Only 4 app files import it: `src/domain/_shared/num.ts`, `src/domain/assets/itemize.ts`, `src/services/sync/ingest.ts` and `MoneyKeel/functions/networth-and-performance/account.ts`.
- There are no integer cents, and no decimal.js, big.js or dinero.

**Ledger:**
- **Asset record** (`asset-record.ts`): one row per event, and a correction is a new row naming `replacesRowId`. It is append-only by design.
- **`transactions`:** commented as an "append-only ledger" (`useStore.ts:553`), but `useStore.ts:1296` hard-deletes rows by id and `useStore.ts:1150` rewrites stored rows (`fixStoredMoney` / `fixStoredFees`).

**Atomicity:**
- **Profile save:** a Firestore `runTransaction` (`firebase.ts:536`) with a monotonic `profileRev`, which the rules enforce. It merges field by field and item by item with timestamps (`profileMerge.ts`, 663 lines), so it is not last-write-wins.
- **Asset record:** its commit is a guarded transaction (`firebase.ts:785-798`). However, `saveAssetRecordPart` (`firebase.ts:658`) is a plain `setDoc` outside it.
- **Batches:** no `writeBatch` anywhere.
- **Size limit:** nothing checks Firestore's 1 MiB document limit on `users/{uid}.appStateEnc`, which holds maps keyed by date that keep growing (`nwDaily`, `monthlySnapshots`, `allocatedByMonth`, `planHistory`).

**On-device storage.** The whole zustand store (no `partialize`) is saved as one encrypted value under the key `finwise-storage-v3` (`useStore.ts:1839-1840`), through `src/store/secureStorage.ts`. Some fields stay on the phone only (`PHONE_ONLY_FIELDS`): `transactions`, `snapshotDays`, `invDaily`, `priceCache`.

### 1.3 Third-party services

| Service | Where | How it is called |
|---|---|---|
| Firebase Auth + Firestore | `src/services/firebase.ts`, `firebaseConfig.ts` | Client SDK |
| Firebase Cloud Functions | `functions/` | HTTPS |
| SnapTrade (broker linking) | `functions/snaptrade.js`; client `src/services/sync/snaptradeClient.ts`, `snaptradeSync.ts` | **Through the relay**, with a Firebase sign-in token |
| Sentry | `@sentry/react-native` 7.11, `src/services/crashReporter.ts`, plugin at `app.config.js:116` | Client SDK, `sendDefaultPii: false`, `tracesSampleRate: 0.2` |
| Anthropic | `functions/index.js` (proxy); client `src/services/economicData.ts:202-223` | Inactive: `AI_PROXY_URL` is empty |
| Google Vision | `src/services/receiptOCR.ts:13, 53-54` | **Dead code**: the key is no longer bundled, and nothing calls it |
| ML Kit text recognition | `src/services/receiptScan.ts` | On the device (receipts) |
| Yahoo Finance (unofficial) | `src/services/marketData.ts:53-55` | **Straight from the phone** |
| BLS CPI, FRED, Treasury fiscaldata | `src/services/economicData.ts:8, 27, 45` | Straight from the phone, public data |
| expo-notifications | `src/services/notifications.ts` | Local reminders only |
| expo-secure-store, expo-local-authentication | `src/services/dataCrypto.ts`, `src/services/appLock.ts` | On the device |
| crypto-js 4.2.0 | `src/services/dataCrypto.ts` (1,001 lines), `src/store/secureStorage.ts` | Encryption at rest and end to end |
| RevenueCat / StoreKit / paywall | — | **None** |
| Analytics | — | **None** |

**Key names in `.env`** (values not reproduced): `FIREBASE_*` (6), `ANTHROPIC_API_KEY`, `GOOGLE_VISION_API_KEY`.

**Keys in `app.config.js` `extra`:**
- `FIREBASE_*`
- `AI_PROXY_URL`
- `SENTRY_DSN` (public, hardcoded default at line 139)
- `SNAPTRADE_RELAY_URL` (hardcoded default at line 142)
- the EAS `projectId`

---

## 2. Critical security and secret-exposure audit

**Severity summary:** 0 Critical · 1 High (latent) · 5 Medium · 5 Low.

| # | Finding | Severity |
|---|---|---|
| S1 | `aiTips` has no auth check, open CORS, no rate limit and no input-size limit. Not deployed today (it returns 404), but deploying it as written opens a paid proxy to Anthropic to the whole internet | **High (latent)** |
| S2 | The Anthropic and Google Vision keys were bundled into the app's `extra` from 2026-05-21 to 2026-06-19. Both keys are still live in the local `.env` | Medium |
| S3 | A household member can read the owner's password-wrapped key envelope, and so can guess the owner's **login password** offline | Medium |
| S4 | On-device encryption silently falls back to a plaintext key and plaintext data | Medium |
| S5 | The Firebase refresh token is in plain AsyncStorage, not the iOS Keychain | Medium |
| S6 | The app lock is off by default, has a cold-start gap, lets the app through when no passcode is set, and is not tied to the data key | Medium |
| S7 | SnapTrade relay inputs are not checked; no App Check, no rate limit, CORS reflects any origin | Low–Medium |
| S8 | AES-CBC with no integrity check (no MAC); PBKDF2 at 100k iterations, below OWASP's 600k | Low |
| S9 | Firestore rules: members can write any subcollection under the owner and can overwrite `keyReturn`; invites can be used more than once; some rules untested | Low |
| S10 | Calls straight from the phone to Yahoo (reveals the tickers held), BLS and FRED; the dead Vision code puts its key in the URL | Low |
| S11 | The founder's Apple ID email is in `eas.json:27`; `pendingRecoveryCode` persists on the phone; `deleteAccount` skips revocation and recent-sign-in checks; `feedback` writes have no size limit | Low |

### 2.1 Hardcoded secrets and keys

**No truly secret value is in any tracked file or anywhere in git history.**
- **Tree searched:** `app/`, `src/`, `functions/`, `scripts/`, `desktop/`, `dist/`, `ios/`, `docs/`, `Security/`, `.github/`, `Calculation Module code/`, `app.config.js` and `eas.json`.
- **History searched:** `git log --all -S` for `AIza…`, `sk-ant-`, `sk_live`, `pk_live`, `-----BEGIN … PRIVATE KEY`, `"private_key"`, `service_account`, `clientSecret`, `consumerKey`, `ghp_` and `xox[bp]-`.
- **Never committed:** `.env`, service-account JSON, `GoogleService-Info.plist`, `.p8`, `.p12` and `.pem`. `.env` is gitignored (`.gitignore:2`).
- **Placeholder text only:** the 4 commits containing `sk-ant` (`e39fbd71`, `fb87a0b3`, `0c549677`, `d58434e8`) hold placeholder text such as `sk-ant-...`.

| Location | What | Classification |
|---|---|---|
| `src/services/firebaseConfig.ts:6` (and the built `dist/` bundle) | Firebase web API key | Public by design. **To do:** confirm it is restricted in Google Cloud Console to Identity Toolkit, Firestore and Token Service, with iOS-bundle and referrer limits. |
| `app.config.js:139` | Sentry DSN | Public by design |
| `app.config.js:142` | SnapTrade relay URL | Not a secret |
| `app.config.js:127` | EAS project ID | Not a secret |
| `eas.json:27` | Apple ID email | Personal information in a tracked file (Low) |
| `.env:17` (local, untracked) | **Live Anthropic key** | Secret. **Rotate it.** |
| `.env:24` (local, untracked) | **Live Google Vision key** | Secret. **Rotate it, or delete it if OCR stays on-device only.** |

**Why rotate (S2).** From the first commit (`e39fbd71`, 2026-05-21) until `fb87a0b3` (2026-06-19), `app.config.js` copied `ANTHROPIC_API_KEY` and `GOOGLE_VISION_API_KEY` into `extra`, which ships inside the binary. Expo loads `.env` automatically, so local `expo start` / `expo export` runs and any EAS build made in that window embedded the keys.

### 2.2 Calls from the phone to aggregators

| Call | Path | Evidence |
|---|---|---|
| SnapTrade | ✅ Through the server relay; Firebase sign-in token required | `src/services/sync/snaptradeClient.ts:96-108`; relay `functions/snaptrade.js:88-94` |
| Anthropic | Through a relay that is not deployed; the client sends **no auth header** | `src/services/economicData.ts:219-223` |
| Account delete | Relay not deployed; a client-side fallback runs | `src/services/firebase.ts:470-474, 1298` |
| Yahoo Finance | ⚠️ **Straight from the phone**: an unofficial endpoint with a spoofed User-Agent, which reveals the holdings to Yahoo | `src/services/marketData.ts:53-55` |
| BLS, FRED | Straight from the phone; public data, no key | `src/services/economicData.ts:27, 45, 113, 154` |
| Google Vision | Dead path, with the key in the query string | `src/services/receiptOCR.ts:53-54` |
| Plaid, MX, Tiingo | Not used | — |

**Relay review:**

| Check | `snaptradeRelay` | `aiTips` | `deleteAccount` |
|---|---|---|---|
| Checks the Firebase ID token | ✅ `snaptrade.js:88-94` | ❌ | ✅ `index.js:94-100`, but no `checkRevoked` and no `auth_time` recency check |
| CORS | `cors:true`; the live probe reflects any Origin | `cors:true` | `cors:true` |
| Input checks | Only checks that `accountId` and `connectionId` are present; both go into the upstream path (`:140-158`). `customRedirect`, `broker`, `startDate`, `endDate` and `offset` are not checked | Only that `expenses` is an array; free text goes into the prompt | No input |
| Rate limit / App Check | None / none | None / none | None / none |
| Secrets | ✅ Secret Manager (`SNAPTRADE_CLIENT_ID`, `SNAPTRADE_CONSUMER_KEY`); each user's secret in `snaptrade_users/{uid}`, closed to clients | ✅ Secret Manager | — |
| Logging | Writes the first 300 characters of SnapTrade's error text to the logs (`:57`, `:174`), which may include account data | — | — |
| Scope | Read-only connection, forced (`:108`) | — | — |

### 2.3 Authentication and storage on the phone

**Sign-in session (S5).** `initializeAuth(..., getReactNativePersistence(AsyncStorage))` (`src/services/firebase.ts:55-61`). The refresh token sits in **unencrypted AsyncStorage**, not the Keychain.

**Data at rest:**
- **Storage:** the store blob is AES-encrypted with crypto-js and saved in AsyncStorage with an `enc:` prefix (`src/store/secureStorage.ts:58-79`).
- **Key:** a random 256-bit key (`:51`) kept in `expo-secure-store` (the iOS Keychain).
- **Weak spots (S4):**
  - If SecureStore fails, the key is written in **plaintext** to AsyncStorage `__fallback_<name>` (`src/services/dataCrypto.ts:54-55, 79-80`).
  - If encryption fails, the data is written in **plaintext** (`secureStorage.ts:76-77`).
  - Plaintext found on read is accepted as legacy (`:62`).
  - Keychain items use the default accessibility setting, not `…THIS_DEVICE_ONLY`.

**Cloud copy (end to end):**
- The data key is wrapped with PBKDF2-SHA256 over the password or the recovery code (salt = uid, 100k iterations; `dataCrypto.ts:18, 291, 499`).
- `CryptoJS.AES.encrypt(str, keyHex)` treats the key as a passphrase: OpenSSL key derivation, **CBC with no MAC** (S8).
- The recovery code is 100 bits from a secure random source (`dataCrypto.ts:255`).

**Face ID / Touch ID (S6).** It exists (`src/services/appLock.ts`, `src/components/AppLockGate.tsx`, mounted at `app/_layout.tsx:547`), but:
- it is **off by default** (`useStore.ts:918`);
- it lets the app through when nothing is enrolled (`AppLockGate.tsx:31`);
- it starts unlocked until the store loads (`:13-14`);
- it re-locks only after 2 minutes in the background;
- there is no privacy screen in the app switcher;
- it is not tied to the data key.

**Household (S3):**
- **Invite code:** 6 characters from `Math.random` (`firebase.ts:935-937`).
- **Key code:** joining also needs a 100-bit key code, which the rules check.
- **Problem:** members can read `users/{owner}` (`firestore.rules:36`), including `keyEnvelope`, so they can test guesses of the owner's password offline.
- **Fix:** move the envelopes to a subdocument only the owner can read.

### 2.4 Firestore rules

**Access model** (`firestore.rules`):
- Default deny (`:116-118`).
- `users/{uid}/**`: the owner, or a household member (`:15-18`). Members cannot change key fields and cannot delete (`:35-47`).
- `profileRev` must go up by exactly 1 on each save (`:32-34`).
- Member documents can only be created by their own uid, with a valid unexpired invite and a key-code proof, and are never updated (`:55-69`).
- `snaptrade_users`: no client access (`:111-113`).

The old exploit where a user could claim a household for themselves is **fixed and tested**.

**Too loose (S9):**
- Members can write **any** subcollection under `users/{owner}/**` (`:43-45`).
- Any member can overwrite `keyReturn` (`:72-75`).
- Invites can be used more than once within 7 days.
- Any signed-in user can `get` an invite by code (`:88`).
- `feedback` writes have no size limit.
- `signedIn()` does not require a verified email.

**Tests not covered:**
- invite `get`, `list` and `update`, and multi-use invites;
- `feedback`;
- deleting member documents;
- members writing new subcollections;
- members overwriting `keyReturn`.

---

## 3. Blueprint gap analysis

| # | Pillar | Current status | Specific findings in repo | Required remediation |
|---|---|---|---|---|
| 1 | **Frontend modularity (React Native iOS)** | **Partial** | Current stack (Expo 56, React Native 0.85, expo-router, TypeScript, about 8,000 tests). 31 of 45 components are pure. About 15 screens and components call Firebase, sync or network code directly. 7 screens do their own money arithmetic. The UI kit (`UI.tsx`, `TopBar`) reads the store. 11 files are over 1,500 lines; `useStore.ts` holds about 114 actions in one store. `app/_layout.tsx` runs the sync logic. | Add a `src/data/` layer (hooks or repositories) so screens never import `services/*`. Move arithmetic out of `RetirementCockpit`, `BudgetScreen`, `NetWorthScreen` and `CashFlowScreen` into `src/domain`. Split `useStore.ts` into slices. Take sync logic out of `_layout.tsx` and put it in a provider. Make `UI.tsx` and `TopBar` props-only. |
| 2 | **Backend API architecture (isolated server, NestJS / FastAPI)** | **Prototype-only** | No API server. Logic runs on the phone, and the backend is Firebase plus 3 HTTP functions (381 lines). Only `snaptradeRelay` is deployed; `aiTips` is unauthenticated (S1); `deleteAccount` is not deployed. No App Check, rate limiting or input schemas. | **Decide end to end vs server-side first (see Executive summary).** Either way: put App Check on all functions, check every input against a schema (zod), add per-user quotas, use origin allow-lists in place of `cors:true`, add `checkRevoked` + an `auth_time` check on delete, and delete or lock down `aiTips`. A NestJS/FastAPI service is warranted only for webhooks, billing and server-side aggregation. |
| 3 | **Database engine and financial ledger schema (PostgreSQL, ACID, currency precision)** | **Prototype-only** | Firestore, not PostgreSQL. The profile is one encrypted document per user with no 1 MiB guard. Money is floating point. The exact `Dec` type is used in only 4 files. `transactions` is called append-only but is hard-deleted and rewritten (`useStore.ts:1296`, `:1150`). The asset record is append-only by design. Saves use transactions plus `profileRev`; `saveAssetRecordPart` runs outside the transaction. | Adopt integer minor units or `Dec` for every stored amount, using one money type end to end. Make `transactions` truly append-only (reversal rows, no delete). Add a document-size guard, or split growing maps into subcollections. For PostgreSQL: a double-entry `ledger_entries` table with `NUMERIC(19,4)`, an immutable insert-only role, and `SERIALIZABLE` for postings. |
| 4 | **Data isolation (row-level security, `pgcrypto`)** | **Partial** (a strong model with gaps) | Firestore rules are default-deny and owner/household scoped, with 17 tests. Data is **encrypted end to end on the client** (the server cannot read it), which goes beyond `pgcrypto`. Gaps: S3, S4, S8, S9, and untested rules. | Move key envelopes to an owner-only path. Remove the plaintext fallbacks. Switch to AES-GCM (or libsodium) and PBKDF2 at ≥600k iterations, or Argon2id. Scope member writes to named subcollections, make invites single-use, require a verified email, and add the missing rules tests. If moving to PostgreSQL: RLS on `user_id` / `household_id`, and `pgcrypto` or KMS envelope encryption for personal-data columns. |
| 5 | **Aggregator integration and webhooks (server-side token exchange, secret vaulting, idempotent async queues)** | **Partial** | SnapTrade is server-side, with keys in Secret Manager and each user's secret server-only. The connection is forced read-only. Sync is **pulled by the client** on demand, with no webhooks, queue or idempotency keys. Relay inputs are not checked (S7). Market data comes from unofficial Yahoo, straight from the phone. | Add the SnapTrade webhook endpoint (signature check) feeding Cloud Tasks or Pub/Sub, keyed by `(uid, connectionId, eventId)` so each event is processed once. Check `accountId`, `connectionId` and date formats; give `customRedirect` an allow-list. Move market data behind a licensed provider through a server proxy (this also stops revealing holdings to Yahoo). Plaid or MX would follow the same relay + Secret Manager pattern. |
| 6 | **Build, monitoring and subscriptions (EAS / Fastlane, Sentry, RevenueCat)** | **Partial** | EAS build profiles (`eas.json`: development / preview / production, remote version numbering). CI in `.github/workflows/ci.yml`: tsc, Jest, a UI-test gate and the rules emulator; no native build or deploy. Sentry is wired with personal data off and 20% tracing. No Fastlane. No RevenueCat or StoreKit. No analytics. | Add RevenueCat (`react-native-purchases`) with server-side entitlement checks. Add `eas build` / `eas submit` to CI on tags. Add a deploy job for rules and functions, in the right order: the app build ships first, then rules and functions. Add Sentry release health and source maps per build. Add analytics that respect privacy (event-only, no amounts). Move the Apple ID email out of `eas.json` into an EAS secret or environment variable. |

---

## 4. Recommended `.cursorrules` and guardrails

This is a starter block (not created in the repo). Save it as `.cursorrules` (Cursor), or as `AGENTS.md` / `CLAUDE.md` rules for other assistants.

```text
# MoneyKeel – AI coding guardrails

## Secrets
- NEVER put an API key, secret, token, private key, password or service-account file in source, app.config.js `extra`, eas.json, tests, fixtures or docs.
- Anything in app.config.js `extra` ships in the app binary and is PUBLIC. Allowed there: Firebase web config, Sentry DSN, relay URLs. Nothing else.
- Server secrets go in Firebase Secret Manager via `defineSecret` / `secrets: [...]` in functions/. Read them only inside function handlers.
- Never log secrets, ID tokens, SnapTrade userSecret, account numbers or full upstream error bodies.

## Network boundaries
- The app may call only: Firebase SDK, our Cloud Functions (with `Authorization: Bearer <Firebase ID token>`), and Sentry.
- No direct calls from the app to aggregators, brokers, AI providers or paid APIs. Add a relay in functions/ instead.
- Screens and components must not import from `src/services/*` or `firebase/*`. Go through `src/domain` / data hooks.

## Cloud Functions
- Every new function: verifyIdToken (checkRevoked for destructive actions), App Check, a zod schema on the request body, a per-uid rate limit, and an origin allow-list (never `cors: true`).
- IDs passed into upstream URLs must match a strict pattern (e.g. /^[A-Za-z0-9-]{1,64}$/).
- Webhooks: verify the signature and process each event once (dedupe on the event ID).

## Data and money
- Never use JavaScript floating point for stored money. Use `Dec` (Calculation Module code/engines/decimal.ts) or integer minor units.
- Ledgers are append-only: corrections are new rows that reference the replaced row. Never `filter()`-delete or rewrite a stored financial row.
- All money arithmetic lives in src/domain or MoneyKeel/functions, never in a screen.
- Every Firestore write to a user's financial data goes through the transaction path in src/services/firebase.ts. No stray setDoc.

## Firestore rules
- Default deny. Any rules change ships with an emulator test in firestore.rules.test.cjs, covering both allow and deny.
- Never widen `users/{uid}/**` writes. Name the subcollection explicitly.

## Device storage and crypto
- Tokens and keys go in expo-secure-store only (WHEN_UNLOCKED_THIS_DEVICE_ONLY), never AsyncStorage.
- Never fall back to plaintext when encryption or the Keychain fails. Fail closed and surface the error.
- Use authenticated encryption (AES-GCM / libsodium). No new crypto-js CBC code.

## Process
- Do not deploy firestore.rules or functions/ before the app build that needs them is live.
- No new dependency without saying why, and no unpinned major versions.
```

**Automated guardrails to add alongside it:**
1. `gitleaks` (or `trufflehog`) as a pre-commit hook and in CI.
2. An ESLint `no-restricted-imports` rule that blocks `src/services/*` and `firebase/*` from `src/screens/**` and `src/components/**`.
3. A Jest guard test in the existing `src/__tests__/guard_*` style that fails if `app.config.js` `extra` gains a key whose name contains `KEY`, `SECRET` or `TOKEN` (other than `SENTRY_DSN`).
4. A guard that fails on `AsyncStorage.setItem` with token or key names, and on any `catch` that writes plaintext.

---

## 5. Prioritized handoff checklist (weeks 1–4)

### Week 1: stop the bleeding and decide the architecture
1. **Rotate** the Anthropic and Google Vision keys in the local `.env` (S2). Delete the Vision key if OCR stays on-device (ML Kit, `src/services/receiptScan.ts`).
2. **Delete or lock down `aiTips`** (`functions/index.js:40-83`) before any `firebase deploy --only functions`: add a token check, size caps, a per-uid quota and App Check (S1).
3. In Google Cloud Console, confirm the Firebase web key (`src/services/firebaseConfig.ts:6`) is restricted to the APIs it needs and to the iOS bundle `co.finwise.app`.
4. Turn on **Firebase App Check** (App Attest on iOS) for Firestore and Functions.
5. Add **gitleaks** to `.github/workflows/ci.yml` and as a pre-commit hook.
6. Move the Apple ID email from `eas.json:27` into an EAS environment variable.
7. **Architecture decision record:** keep zero-knowledge end-to-end encryption, or move to server-side PostgreSQL. Write it up in `docs/`. This sets the plan for weeks 3–4.

### Week 2: client-side hardening
1. `src/store/secureStorage.ts:62, 76-77` and `src/services/dataCrypto.ts:54-55, 79-80`: remove the plaintext fallbacks and fail closed (S4). Set Keychain items to `WHEN_UNLOCKED_THIS_DEVICE_ONLY`.
2. `src/services/firebase.ts:55-61`: replace the AsyncStorage persistence for Auth with a SecureStore-backed adapter (S5).
3. `src/components/AppLockGate.tsx:13-14, 31` and `useStore.ts:918`: close the cold-start gap (stay locked until the store loads), require a passcode when the lock is on, add a privacy screen for the app switcher, and offer to turn the lock on at onboarding (S6).
4. `src/services/dataCrypto.ts`: plan the move to AES-GCM and PBKDF2 ≥600k iterations (or Argon2id), with a versioned envelope so existing data migrates (S8).
5. `src/services/receiptOCR.ts`: delete the dead Vision code (S10).

### Week 3: server and rules
1. `firestore.rules:36`: move `keyEnvelope` and `householdKeyEnvelope` to `users/{uid}/private/keys`, readable by the owner only (S3). Migrate in `src/services/firebase.ts`.
2. `firestore.rules:43-45, 72-75, 88, 104`: name the subcollections members may write, make `keyReturn` writes owner-only or one-time, make invites single-use, put a size limit on `feedback`, and require `email_verified` (S9).
3. Add the missing emulator tests to `firestore.rules.test.cjs` (invites, feedback, member deletes, subcollection writes, `keyReturn`).
4. `functions/snaptrade.js:96-158`: check every input against a zod schema, give `customRedirect` an allow-list, add a per-uid rate limit and an origin allow-list, and remove raw upstream text from the logs (S7).
5. `functions/index.js:90-107`: add `verifyIdToken(token, true)` plus an `auth_time` recency check to `deleteAccount`. Deploy it, then remove the client-side fallback in `src/services/firebase.ts:470-474`.
6. Add a Firestore document-size guard to the profile save (`src/services/firebase.ts:536`), or split `nwDaily`, `monthlySnapshots`, `allocatedByMonth` and `planHistory` out into subcollections.

### Week 4: ledger, data flow, payments
1. **Money type:** pick `Dec` (`Calculation Module code/engines/decimal.ts`) or integer cents for every stored amount. Start with `AssetRow` (`MoneyKeel/functions/networth-and-performance/asset-record.ts:62-85`) and `transactions`.
2. **True append-only:** replace the hard delete at `src/store/useStore.ts:1296` and the rewrite at `:1150` with reversal and correction rows. Put `saveAssetRecordPart` (`src/services/firebase.ts:658`) inside the commit transaction.
3. **Market data:** move it from `src/services/marketData.ts` (unofficial Yahoo) to a licensed provider, through a Cloud Function proxy.
4. **SnapTrade webhooks:** add a signature-checked endpoint and a queue (Cloud Tasks or Pub/Sub) that processes each event once.
5. **Payments:** add RevenueCat (`react-native-purchases`) with entitlement checks. Add `eas build` / `eas submit` on tags in CI, plus a deploy job for rules and functions that runs after the build.
6. **Frontend data layer:**
   - Add `src/data/` hooks.
   - Add the ESLint `no-restricted-imports` rule.
   - Move arithmetic out of `RetirementCockpit`, `BudgetScreen`, `NetWorthScreen` and `CashFlowScreen`.
   - Start splitting `useStore.ts` into slices, and move sync out of `app/_layout.tsx` into a provider.

### Context the engineer needs before touching numbers
- **Calculation rules:** every figure on screen is pinned by tests and by a master file of decisions and IDs, in `Calculation Module code/scripts/` (built by `build-moneykeel-master.py`, with the decision log in `moneykeel_decisions*.json`). Changing a calculation means updating both the code and the master file.
- **Work in progress:** at this snapshot, the "asset record" rework (`MoneyKeel/functions/networth-and-performance/asset-record*.ts`, flag `SCREENS_READ_THE_RECORD` in `src/store/useStore.ts`) is mid-flight and uncommitted.
- **Deploy order:** the new rules and functions must reach production **after** the app build that uses them, or older installs stop saving.
