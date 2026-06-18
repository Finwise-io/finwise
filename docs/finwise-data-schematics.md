# Finwise — Data Schematics

| | |
|---|---|
| **Project** | Finwise (mobile — React Native / Expo) |
| **Version** | 1.0.0 |
| **Last Updated** | 2026-06-17 |
| **Status** | Developer-ready. Field types, sources, constraints, and calculation logic are drawn directly from the code (cited per entity). |

> **Purpose.** The authoritative map of Finwise's data: every entity, every field — its type, whether
> it is **Input** (user/derived‑from‑input) or **Calculated**, its constraints, and (for calculated
> fields) the exact formula in the Logic & Calculation Annex (§3). A machine‑readable JSON Schema
> mirror is in §4.

## Conventions (read first)

- **Source values:** `Input` (entered by the user or written from an input), `External (auto)`
  (fetched live from a public API — market prices and macro rates; not user‑entered), `Reference
  (static)` (constant data baked into the code — canonical lists, historical benchmark figures, IRS
  tables), `Calculated` (derived at read time — not stored), `Seeded` (input‑derived but materialized
  once from the onboarding answers; rows carry `origin:'onboarding'`).
- **Source of truth.** Finwise has **no external bank feed** — account/transaction data is **user
  input**, stored locally and synced to the cloud. The **external, auto‑captured** sources are:
  **market prices** (`priceCache`, daily closes per ticker), **inflation** (`inflationRate`, BLS CPI),
  and the **10‑yr Treasury yield** (`treasuryYield`, US Treasury) — each with a typical‑rate fallback
  when the live fetch fails. Calculated values are derived **on the device** from inputs/external data —
  never stored as fact (so they can't drift). See §2.15.
- **Money.** Stored as **JavaScript `Number` (IEEE‑754 double), interpreted as USD**; rounded to cents
  via `round2(n) = Math.round(n*100)/100` (`src/domain/_shared/num.ts`) where persisted/displayed.
  Raw *onboarding* inputs use **`Money = string | number`**, coerced with `toNum()`. *(There is no
  fixed‑precision `Decimal` type; treat money as double, round at the edges.)*
- **Rates / returns / percentages.** Stored as **decimals 0–1** (e.g. APR `0.065` = 6.5%; return
  `0.079` = 7.9%). Shown as `%` in the UI; **never store the percent form.**
- **IDs.** **`EntityId`** = `"<prefix>_<base36 timestamp><6 random base36>"` (e.g. `ast_l9k2…`), from
  `newEntityId(prefix)` (`src/domain/_shared/ids.ts`). *(Not RFC‑4122 UUIDs.)* The auth **`uid`** is the
  Firebase Auth user id (opaque string).
- **Dates / time.** Day = **ISO‑8601 date string `"YYYY-MM-DD"`**; month bucket = **`"YYYY-MM"`**;
  server times = Firestore **`Timestamp`**; client audit times = **ISO‑8601 datetime string**.
- **Enums** are listed inline in the Constraints column.

---

# 0. Data Schematics Rules (the charter)

Every entity, field, and calculation in this document must obey these rules. They exist to protect
**data integrity** — most of the bugs we've shipped trace back to breaking one of them.

| # | Rule | Why it matters | Anti‑pattern (don't) |
|---|---|---|---|
| **DR‑1** | **Capture once — single source of truth.** A fact is stored in exactly one place; everything else **derives** from it. | The same number stored twice will drift apart. | Storing net worth on two screens from two sources → they disagree (bug **B‑49**). |
| **DR‑2** | **Capture only what you use.** Every input field must have a consumer (a screen or a calculation). If nothing reads it, don't collect it. | Orphan data confuses users and rots. | Asking "average monthly spend" then never showing or using it. |
| **DR‑3** | **Derive, don't store calculations.** Calculated values are computed on read, never persisted. | Stored derivations drift from their inputs. | Saving `net_worth` as a field instead of `assets − debts`. |
| **DR‑4** | **One concept, one definition.** A named figure (take‑home, monthly spending, savings rate) has exactly one formula, used everywhere. | Two meanings for one word break trust. | "Savings rate" meaning two things (bug **B‑52**); "monthly spend" two ways (**B‑24/B‑50**). |
| **DR‑5** | **Explicit type & unit on every field.** Money = `Number` (USD); rate = decimal 0–1; date = ISO‑8601. Never ambiguous forms. | Ambiguity = silent errors. | Storing `"6.5%"` as a string, or mixing cents and whole dollars (**B‑46**). |
| **DR‑6** | **Stable, unique identity.** Every row has an immutable unique `id`; references use the **id**, never the label. | Labels change; ids shouldn't. | Linking a transaction to an account by its name. |
| **DR‑7** | **Classify every field** as Input / Calculated / Seeded, and name its **source of truth**. | You can't trust data you can't trace. | A field nobody can say where it comes from. |
| **DR‑8** | **Null override = "derive the default," not zero.** A nullable assumption means "fall back to the computed value." | Treating null as 0 corrupts projections. | `expectedReturn = null` read as 0% return. |
| **DR‑9** | **Seed once, then the user owns it.** Onboarding seeds entities one time (`origin:'onboarding'`); re‑seeding replaces **only** seeded rows, never user‑added/edited ones. | Don't destroy user edits on re‑run. | Re‑seeding wiping a hand‑added account. |
| **DR‑10** | **Validate at the edge.** Enforce constraints (range, format, required) on input so downstream code can trust the data. | Garbage in stays garbage. | Accepting a negative balance or a 13th month. |
| **DR‑11** | **Full precision in, round at the edge.** Compute in full precision; round money to cents only for display/persistence — never mid‑calculation. | Mid‑calc rounding compounds error. | Rounding each step of an amortization. |
| **DR‑12** | **Time‑correct data.** Month‑bucketed values use the correct month; **past = actuals, future = plan**. | Mixing plan and actual misleads. | A calendar showing planned spend as if it were spent. |
| **DR‑13** | **One currency of record (USD).** Store in the base currency; format per locale at display only. | Storing formatted/local values can't be re‑computed. | Persisting "€1.000,50" as a string. |
| **DR‑14** | **Audit, don't overwrite.** Account‑value changes go through the append‑only `Transaction` ledger; never silently mutate a stored balance. | A silent overwrite has no history. | Setting `balance = X` with no record of why. |

> **The two you named:** DR‑1 ("never capture the same number twice") and DR‑2 ("capture and not use
> it") are the load‑bearing rules — most drift and clutter come from breaking them.

---

# 1. Architecture & persistence

Finwise keeps **one app‑state object** (the Zustand store) that is **double‑persisted**:

| Layer | Where | Form | Purpose |
|---|---|---|---|
| **Local** | Device AsyncStorage, key **`finwise-storage-v3`** | **AES‑256 encrypted** blob (`enc:` prefix); 256‑bit key in Expo SecureStore (`finwise-enc-key`) | fast, offline, primary store (`src/store/secureStorage.ts`) |
| **Cloud** | Firestore `users/{uid}.appState` | plaintext JSON of the app state | cross‑device + partner sharing (`src/services/firebase.ts`) |

**Household routing (the one indirection):** if `householdId` is set, **all cloud reads/writes target
`users/{householdId}`** instead of `users/{uid}` — both partners share one `appState` document. Access
is gated by a `households/{householdId}/members/{uid}` doc proving a valid invite code (see §2.13 and
the security rules `firestore.rules`).

**Sync is explicit, not live:** `saveUserData(uid, appState)` (push) and `loadUserData(uid)` →
`loadFromCloud()` (pull) — typically on login/logout. Local persistence is automatic on every change.

**Firestore collections** (detailed in §2.13): `users/{uid}` · `households/{owner}/members/{member}` ·
`invites/{code}` · `feedback/{autoId}`.

---

# 2. Field dictionary

> One table per entity. Columns: **Field · Type · Source · Logic/Calculation · Constraints ·
> Description.** "Calc §n" points to the Logic & Calculation Annex.

## 2.1 UserProfile — `src/store/useStore.ts:90`, mirror in Firestore `users/{uid}`
The signed‑in identity.

| Field | Type | Source | Logic / Calculation | Constraints | Description |
|---|---|---|---|---|---|
| `uid` | String (Firebase uid) | Input (auth) | N/A | **PK**, Not Null, Unique | Firebase Auth user id |
| `email` | String | Input | Validated as email at sign‑up | Not Null, email format | Login email |
| `name` | String | Input | N/A | — | Display name |
| `createdAt` | ISO‑8601 String (client) / Timestamp (Firestore) | Input | server timestamp on `registerUser` | Not Null | Account creation time |

## 2.2 AssetAccount — `src/domain/assets/index.ts:12`
A cash, investment, retirement, or property account. The richest entity.

| Field | Type | Source | Logic / Calculation | Constraints | Description |
|---|---|---|---|---|---|
| `asset_id` | String (EntityId `ast_…`) | Input | `newEntityId('ast')` | **PK**, Not Null, Unique | Account id |
| `label` | String | Input | N/A | Not Null | Account name (e.g. "Chase Checking") |
| `institution` | String? | Input | N/A | Optional | Institution (e.g. "Fidelity") |
| `kind` | String (ASSET_KINDS id) | Input | one of `checking, savings, brokerage, stocks_etf, fixed_income, private_equity, hedge_funds, commodities, crypto, annuities, college_529, 401k, trad_ira, roth_ira, hsa, home, vehicle, other_asset` | Not Null, enum | Drives tax bucket, section, default return |
| `tax_bucket` | Enum String | Input (from kind) | `'CASH'\|'PRE_TAX'\|'ROTH'\|'TAXABLE'\|'PROPERTY'` | Not Null, enum | Tax treatment; drives nest‑egg & withdrawal logic |
| `balance` | Number (float, USD) | Input *or* Calculated | manual: as entered; **ledger‑managed: `cash_balance + Σ(position market values)`** (Calc §3.11) | ≥ 0 (≥ 0 except market swings) | Current value |
| `cash_balance` | Number (float, USD) | Input | N/A | ≥ 0 | Uninvested cash sleeve in an investment account |
| `positions` | Array&lt;Position&gt; | Input | see §2.3 | Optional | Holdings (when present, `balance` is derived) |
| `target_return` | Number (decimal 0–1) | Input/Seeded | default from `ASSET_KINDS[kind].ret` | 0–1 | Expected annual return |
| `actual_ttm` | Number (decimal)? | Input | N/A | nullable | User‑reported trailing‑12‑mo return |
| `retirement_pct` | Number (0–100) | Input | null ⇒ `earmarkDefault()` (Calc §3.3) | 0–100 or null | % earmarked for retirement |
| `change_amount` | Number (float, USD) | Input | N/A | — | Net change booked this month (savings allocations) |
| `change_month` | String `"YYYY-MM"` | Input | N/A | format | Month `change_amount` applies to |
| `face_value` | Number (float, USD)? | Input | N/A | bonds only | Bond par value |
| `coupon_rate` | Number (decimal 0–1)? | Input | N/A | bonds only | Bond annual coupon |
| `maturity_date` | String `"YYYY-MM-DD"`? | Input | N/A | bonds only | Bond maturity |
| `origin` | `'onboarding'`? | Seeded flag | set by `assetsFromOnboarding` | optional | Marks seeded rows (re‑seed replaces only these) |

> **ASSET_KINDS reference** (`assets/index.ts:60`): each `kind` maps to `{ bucket, section, ret }` —
> e.g. `checking`→CASH/Cash/0.005, `brokerage`→TAXABLE/Investments/0.08, `401k`→PRE_TAX/Retirement/0.079,
> `home`→PROPERTY/Property/0.045, `vehicle`→PROPERTY/Property/−0.05.

## 2.3 Position & Lot — `src/domain/performance/index.ts:10,18`
Holdings inside a ledger‑managed account, with cost basis.

**Position**

| Field | Type | Source | Logic | Constraints | Description |
|---|---|---|---|---|---|
| `position_id` | String (`pos_…`) | Input | `newEntityId('pos')` | PK, Unique | Holding id |
| `ticker` | String (UPPERCASE) | Input | uppercased | Not Null | Symbol (e.g. `VTI`) |
| `label` | String? | Input | N/A | Optional | Display name |
| `kind` | String (ASSET_KINDS id) | Input | N/A | enum | Benchmark mapping |
| `lots` | Array&lt;Lot&gt; | Input | — | Not Null | Purchase lots |

**Lot**

| Field | Type | Source | Logic | Constraints | Description |
|---|---|---|---|---|---|
| `lot_id` | String (`lot_…`) | Input | `newEntityId('lot')` | PK, Unique | Lot id |
| `shares` | Number (float) | Input | N/A | > 0 | Share count |
| `cost_per_share` | Number (float, USD) | Input | N/A | ≥ 0 | Purchase price |
| `purchase_date` | String `"YYYY-MM-DD"` | Input | N/A | format | Buy date (long/short‑term gains) |

## 2.4 Debt (Liability) — `src/domain/debt/index.ts:10`

| Field | Type | Source | Logic / Calculation | Constraints | Description |
|---|---|---|---|---|---|
| `debt_id` | String (`debt_…`) | Input | `newEntityId('debt')` | PK, Unique | Debt id |
| `label` | String | Input | N/A | Not Null | Account name |
| `institution` | String? | Input | N/A | Optional | Lender |
| `debt_type` | Enum String | Input | `'MORTGAGE'\|'CREDIT_CARD'\|'STUDENT_LOAN'\|'AUTO'\|'PERSONAL'\|'OTHER'` | Not Null, enum | Kind of debt |
| `remaining_balance` | Number (float, USD) | Input | N/A | ≥ 0 | Outstanding principal |
| `interest_rate_apr` | Number (decimal 0–1) | Input | N/A | ≥ 0 (e.g. 0.065) | APR |
| `minimum_monthly_payment` | Number (float, USD) | Input | N/A | ≥ 0 | Minimum due |
| `monthly_payment` | Number (float, USD) | Input | defaults to `minimum_monthly_payment` | ≥ minimum | Actual payment used in payoff (Calc §3.6) |
| `due_day` | Number (int) | Input | N/A | 1–31 | Day of month due |
| `origin` | `'onboarding'`? | Seeded flag | `debtsFromOnboarding` | optional | Seeded marker |

## 2.5 Goal — `src/domain/goals/index.ts:8` (domain) and `src/store/useStore.ts:66` (runtime)
The runtime store Goal is the live one used by the app.

| Field | Type | Source | Logic / Calculation | Constraints | Description |
|---|---|---|---|---|---|
| `id` | String | Input | generated | PK, Unique | Goal id |
| `label` | String | Input | N/A | Not Null | Goal name |
| `icon` | String (emoji) | Input | N/A | — | Display icon |
| `target` | Number (float, USD) | Input | N/A | > 0 | Target amount |
| `saved` | Number (float, USD) | Input | sum of contributions | 0 ≤ saved | Amount saved so far |
| `targetDate` | String `"YYYY-MM"` | Input | N/A | format | Target month |
| `savingsType` | Enum String | Input | `'fixed'\|'percent'\|'leftover'` | enum | Allocation method |
| `savingsAmount` | Number (float, USD) | Input | used when `fixed` | ≥ 0 | $/month |
| `savingsPercent` | Number (0–100) | Input | used when `percent` | 0–100 | % of surplus |
| `color` | String | Input | N/A | — | UI color |
| `origin` | `'onboarding'`? | Seeded flag | `seedGoals` | optional | Seeded marker (cleared on restart) |

> *Domain `Goal` (`goals/index.ts`)* uses `goal_id`, `label`, `target_amount` (Number), `target_year`
> (Number\|null). The monthly contribution to hit a goal is **Calculated** — see Calc §3.12.

## 2.6 IncomeEntry — `src/store/useStore.ts:28` (logged income transaction)

| Field | Type | Source | Logic | Constraints | Description |
|---|---|---|---|---|---|
| `id` | String | Input | generated | PK, Unique | Entry id |
| `type` | String | Input | e.g. "salary","bonus","freelance" | Not Null | Income category |
| `amount` | Number (float, USD) | Input | N/A | > 0 | Amount |
| `hours` | Number? | Input | N/A | ≥ 0 | Hours (if hourly) |
| `rate` | Number? | Input | N/A | ≥ 0 | Hourly rate |
| `source` | String | Input | N/A | — | Source label |
| `date` | String `"YYYY-MM-DD"` | Input | N/A | format | Date received |
| `notes` | String? | Input | N/A | Optional | Note |
| `createdAt` | ISO‑8601 String | Input | client time | Not Null | Audit |

## 2.7 ExpenseEntry — `src/store/useStore.ts:40` (logged expense transaction)

| Field | Type | Source | Logic | Constraints | Description |
|---|---|---|---|---|---|
| `id` | String | Input | generated | PK, Unique | Entry id |
| `amount` | Number (float, USD) | Input | N/A | > 0 | Amount spent |
| `category` | String | Input | canonical (`BUDGET_CATEGORIES`) or custom | Not Null | Category |
| `store` | String | Input | N/A | — | Merchant |
| `date` | String `"YYYY-MM-DD"` | Input | N/A | format | Spend date |
| `notes` | String? | Input | N/A | Optional | Note |
| `receiptUri` | String (URI)? | Input | from receipt OCR | Optional | Receipt image |
| `createdAt` | ISO‑8601 String | Input | client time | Not Null | Audit |

## 2.8 Transaction (investment ledger) — `src/domain/transactions/index.ts:22`
Append‑only audit ledger that drives ledger‑managed account values.

| Field | Type | Source | Logic | Constraints | Description |
|---|---|---|---|---|---|
| `id` | String (`txn_…`) | Input | `newEntityId('txn')` | PK, Unique | Ledger id |
| `date` | String `"YYYY-MM-DD"` | Input | N/A | format | When it happened |
| `type` | Enum String | Input | `OPENING_POSITION\|OPENING_CASH\|BUY\|SELL\|DEPOSIT\|WITHDRAWAL\|TRANSFER\|TRANSFER_IN_KIND\|DIVIDEND\|INTEREST\|COUPON\|FEE` | Not Null, enum | Event type |
| `account_id` | String (EntityId) | Input | FK→AssetAccount | Not Null | Account affected |
| `counter_account_id` | String (EntityId)? | Input | FK; TRANSFER only | Optional | Other side of a transfer |
| `ticker` | String? | Input | N/A | Optional | Security symbol |
| `position_id` | String (EntityId)? | Input | FK→Position | Optional | Position affected |
| `assetClass` | Enum String? | Input | `'stock_etf'\|'bond'\|'other'` | Optional | Security class |
| `shares` | Number? | Input | BUY/SELL/OPENING | ≥ 0 | Quantity |
| `price` | Number (float, USD)? | Input | per share | ≥ 0 | Trade price |
| `amount` | Number (float, USD)? | Input | cash legs | — | Cash amount |
| `reinvested` | Boolean? | Input | dividends | — | Reinvest vs cash |
| `note` | String? | Input | N/A | Optional | Note |
| `created_at` | ISO‑8601 String | Input | client time | Not Null | Audit entry time |

## 2.9 RetirementAssumptions — `src/store/useStore.ts:154`
User overrides for the projection. **Null ⇒ derive from live data** (so the plan tracks reality unless
the user pins a value).

| Field | Type | Source | Logic / Calculation | Constraints | Description |
|---|---|---|---|---|---|
| `retireAge` | Number? | Input | null ⇒ from profile/target | 0–120 / null | Retirement age |
| `horizonAge` | Number? | Input | null ⇒ 90 | / null | Plan‑to (longevity) age |
| `contribMonthly` | Number (USD)? | Input | null ⇒ derived contributions | ≥ 0 / null | Monthly contribution |
| `spendMonthly` | Number (USD)? | Input | null ⇒ from spending | ≥ 0 / null | Retirement spend (today's $) |
| `risk` | Enum? | Input | `'conservative'\|'moderate'\|'aggressive'` | / null | Risk → return if `expectedReturn` null |
| `expectedReturn` | Number (decimal)? | Input | null ⇒ benchmark/risk | 0–1 / null | Growth assumption |
| `inflation` | Number (decimal)? | Input (override) | null ⇒ live `inflationRate`/100 (§2.15, External) | 0–1 / null | Inflation assumption; **base value is auto‑captured**, this only overrides it |
| `ssEligible` | Boolean? | Input | N/A | / null | Eligible for Social Security |
| `ssMonthly` | Number (USD)? | Input | N/A | ≥ 0 / null | SS benefit (today's $) |
| `ssClaimAge` | Number? | Input | null ⇒ 67 | / null | SS claim age |
| `actualReturn` | Number (decimal)? | Input | N/A | / null | User's trailing‑12‑mo return |
| `returnBasis` | Enum? | Input | `'benchmark'\|'actual'\|'scenario'` | / null | Which return drives the projection |

## 2.10 RetirementScenario — `src/store/useStore.ts:171`

| Field | Type | Source | Logic | Constraints | Description |
|---|---|---|---|---|---|
| `id` | String | Input | generated | PK, Unique | Scenario id |
| `name` | String | Input | N/A | Not Null | Label |
| `createdAt` | ISO‑8601 String | Input | client time | Not Null | Saved at |
| `assumptions` | RetirementAssumptions | Input | snapshot of §2.9 | — | Saved overrides |
| `retireAge` | Number | Calculated (cached) | from assumptions | — | Cached for display |
| `chance` | Number (0–100) | Calculated (cached) | Calc §3.9 at save time | 0–100 | Cached success % |

## 2.11 SpendCat (budget category) — `src/domain/onboardingProfile.ts` (`spendCats[]`)

| Field | Type | Source | Logic | Constraints | Description |
|---|---|---|---|---|---|
| `id` | String | Input | generated | PK within array | Category id |
| `label` | String | Input | N/A | Not Null | Name (e.g. "Rent") |
| `tier` | Enum String | Input | `'critical'\|'important'\|'flex'` | enum | Priority (drives emergency‑fund essentials) |
| `bucket` | Enum String | Input | `'fixed'\|'nonmonthly'\|'flexible'` | enum | Rollup bucket |
| `unit` | Enum String | Input | `'dollar'\|'pct'` | enum | Amount unit |
| `amount` | Money (string\|number) | Input | if `pct`, % of take‑home | ≥ 0 | Monthly $ or % |
| `months` | Array&lt;Number&gt; | Input | nonmonthly due months | each 1–12 | When non‑monthly bills land |
| `dueDay` | Money (string\|number) | Input | N/A | 1–31 | Day of month due |
| `custom` | Boolean | Input | N/A | — | User‑created flag |

> Canonical defaults: `BUDGET_CATEGORIES` (`src/constants/categories.ts`) — id/label/bucket/icon, e.g.
> `rent`→fixed, `groceries`→flexible, `travel`→nonmonthly.

## 2.12 Badge — `src/store/useStore.ts:81`

| Field | Type | Source | Logic | Constraints | Description |
|---|---|---|---|---|---|
| `id` | String | Input (catalog) | from `DEFAULT_BADGES` | PK, Unique | Badge id (e.g. `streak_7`) |
| `label` | String | Input | N/A | Not Null | Name |
| `icon` | String (emoji) | Input | N/A | — | Icon |
| `earned` | Boolean | Calculated/Set | flips true when condition met | — | Earned status |
| `earnedAt` | ISO‑8601 String? | Set | time of earning | Optional | When earned |
| `description` | String | Input | N/A | — | How to earn |

> Gamification scalars (store): `xp` Number (≥0), `streak` Number (≥0, consecutive days),
> `lastCheckIn` String (date) — see Calc §3.13 for XP/streak rules.

## 2.13 Firestore documents — `src/services/firebase.ts`

**`users/{uid}`**

| Field | Type | Source | Constraints | Description |
|---|---|---|---|---|
| `email` | String | Input | Not Null | Login email (also in appState) |
| `name` | String | Input | — | Display name |
| `createdAt` | Timestamp | Input | Not Null | Server creation time |
| `householdId` | String? | Input | optional | Shared‑household pointer (device‑local) |
| `appState` | JSON Object | Input | Not Null | **Full Zustand app state** (the data model below `users`) |

**`households/{owner}/members/{member}`** — the access grant (§1 routing)

| Field | Type | Source | Constraints | Description |
|---|---|---|---|---|
| `code` | String | Input | Not Null, ↔ a real `invites/{code}` | Invite code presented to join |
| `joinedAt` | Timestamp | Input | Not Null | When the member joined |

**`invites/{code}`** — `code` = 6‑char `[A–Z2–9]` (no `0/O/1/I/L`)

| Field | Type | Source | Constraints | Description |
|---|---|---|---|---|
| `householdId` | String | Input | Not Null | Inviter's uid (the shared doc) |
| `inviterName` | String? | Input | optional | For the join message |
| `createdAt` | Timestamp | Input | Not Null | When created |

**`feedback/{autoId}`**

| Field | Type | Source | Constraints | Description |
|---|---|---|---|---|
| `uid`/`email`/`name` | String? | Input | nullable (anon allowed) | Submitter (if signed in) |
| `type` | String | Input | Not Null | Category (bug/feature/UX/general) |
| `subject` / `message` | String | Input | Not Null | Content |
| `appVersion` | String | Input | — | App version at submit |
| `createdAt` | Timestamp | Input | Not Null | When submitted |

## 2.14 OnboardingProfile (the input layer) — `src/domain/onboardingProfile.ts`
The progressive answer blob captured during setup. **It is the `Input` source that seeds the domain
entities above** (`assetsFromOnboarding`, `debtsFromOnboarding`, `seedGoals`, income/budget builders).
All fields optional; amounts are `Money = string|number`. Grouped (not exhaustive of every alias):

| Group | Representative fields (type) |
|---|---|
| **Identity / status** | `status` (`employed\|student\|retired\|partial`), `name` (String), `birthYear`/`birthMonth` (Money), `hasPartner` (`yes\|no`), `partnerName` (String), `inviteCode` (String), `dependentsCount` (Money), `incomeSources` (String[]) |
| **Employment income** | `salaryFreq` (`hourly\|weekly\|biweekly\|monthly`), `baseSalary` (Money), `hoursPerWeek` (Money), `salaryMode` (`gross\|takehome`), `salaryByMonth` (Money[12]), `salaryMonthMode` (`same\|months`), `tipsMonthly` (Money), `whoEarns` (`you\|partner\|both`) |
| **Bonus / equity** | `bonusAnnual`,`bonusMonth`,`signingOnetime` (Money); `equityType` (`rsu\|option`), `rsuGrants` (`{shares,price,date}[]`), `rsuShares`,`rsuPrice`,`optStrike`,`optMarket` (Money) |
| **401(k)** | `c_401k` (Money), `employerMatchValue` (Money), `employerMatchMode` (`pct\|dollar`) |
| **Other income** | `rentals` (`{type,income,expenses}[]`), `seAmount`/`seFreq`, `invAnnual`, `benefitMonthly`/`benefitTypes`/`benefitMonths`, `supportMonthly`, `scholarships[]`, `loans[]`, `otherAmount`/`otherFreq`/`otherTaxable` |
| **Retirement income** (retired) | `ri_ss, ri_pension, ri_withdrawals, ri_rmd, ri_annuities, ri_other` (Money) + matching `ri_*_freq` (`monthly\|quarterly\|annual`) |
| **Tax** | `taxMode` (`system\|manual`), `manualTaxRate` (Money, decimal 0–1) |
| **Spending / budget** | `monthlySpending` (Money), `spendCats` (SpendCat[] — §2.11), `savingsByMonth` (Money[12]), `savingsMode` (`auto\|custom`) |
| **Net worth seeds** | `currentRetirementSavings`, `currentSavingsPortfolio`, `investmentHoldings` (Money) → seed assets |
| **Debt seed** | `debtName` (String), `debtBalance`,`debtRate`,`debtPayment` (Money) |
| **Retirement plan** | `targetRetirementAge`, `expectedRetirementSpending`, `horizonAge`, `c_roth`,`c_invest`,`c_property`, `investRaw`/`investUnit`, `retLocation`, `travelBudget`, `medicalBudget`, `spendingChangeLater` (`same\|less\|more`) |
| **Goals / legacy** | `goals` (`{label,target,year}[]`), `legacyTarget` (Money — bequest) |

> Why grouped: most of these are *not* persisted as a normalized entity — they're the raw input that
> the calculation layer reads (or that seeds the entities). The **derived** values they feed are in §3.

## 2.15 Economic & market data (External / auto‑captured) — `src/services/economicData.ts`, `marketData.ts`, store
**Not user input.** Fetched live from public APIs and cached in the store. Each macro rate has a
typical‑rate **fallback** used (and flagged) when the live fetch fails (B‑25).

| Field | Type | Source | Logic / Calculation | Constraints | Description |
|---|---|---|---|---|---|
| `inflationRate` | Number (**percent**, e.g. `3.2` = 3.2% YoY) | **External (auto)** | BLS CPI series `CUUR0000SA0`; fallback `3.2` | ≥ 0 | Live inflation; **÷100 for use** (note: stored as percent, unlike decimal rates — DR‑5 exception) |
| `treasuryYield` | Number (**percent**, e.g. `4.35`) | **External (auto)** | US Treasury fiscaldata avg‑interest API; fallback `4.35` | ≥ 0 | 10‑yr yield (risk‑free rate); ÷100 for use |
| `inflationIsFallback` / `treasuryIsFallback` | Boolean | Calculated (flag) | `true` when the live fetch failed | — | Lets the UI label a value as a typical‑rate estimate (B‑25) |
| `priceCache` | Record&lt;ticker, PriceSeries&gt; | **External (auto)** | **Yahoo Finance** chart endpoint, daily **dividend+split‑adjusted (total‑return) closes**, behind a swappable `PriceProvider` (`marketData.ts`) | keyed by UPPERCASE ticker | Drives ledger account values + live benchmark returns |
| `pricesFetchedAt` | ISO‑8601 String? | System | set on refresh; throttled ~10 min | nullable | Last market‑data refresh (staleness) |

> **Override relationship:** `RetirementAssumptions.inflation` (§2.9) is a *user* `Input` that, when
> **null**, derives from this live `inflationRate` (DR‑8). So the *base* inflation is auto‑captured;
> the user can pin an override on top.

## 2.16 Benchmark & reference returns — `src/domain/assets/index.ts`, `performance/index.ts`, store
**"Benchmark return" is three different things** — classify precisely (DR‑7):

| Field / function | Type | Source | Logic / Calculation | Constraints | Description |
|---|---|---|---|---|---|
| `ASSET_KINDS[kind].ret` | Number (decimal 0–1) | **Reference (static)** | hardcoded default per kind | 0–1 | Default expected return; seeds `target_return` |
| `BENCHMARK_META[kind]` | `{source,period,estimate?}` | **Reference (static)** | historical index figures **through 2025** | `estimate` flag | Provenance (e.g. `stocks_etf`→"S&P 500 total return, 30‑yr") |
| `BENCHMARK_TICKER[kind]` | String (ticker) | **Reference (static)** | kind → symbol (default `SPY`) | — | Which ticker represents the benchmark |
| `benchmarkReturns[kind]` | Number (decimal) | **Input (override)** | `setBenchmarkReturn` | 0–1 | User override of expected return per kind |
| `AssetAccount.target_return` | Number (decimal) | Input / Seeded | seeded from `ASSET_KINDS.ret` | 0–1 | Per‑account expected return |
| `AssetAccount.actual_ttm` | Number (decimal)? | Input | user‑reported | nullable | Account's actual trailing‑12‑mo return |
| `benchmarkReturn(kind, overrides)` | Number (decimal) | Calculated | `override ?? ASSET_KINDS[kind].ret` | 0–1 | Resolved expected return (override beats static) |
| `periodReturn(series, period)` | Number (decimal)? | **Calculated (from External)** | `end_close / start_close − 1` over window | nullable | **LIVE** return from the price series (External feed) |
| `blendedReturn(accounts)` | Number (decimal) | Calculated | value‑weighted Σ `benchmarkReturn(kind)` | 0–1 | Portfolio's blended benchmark |
| `portfolioActualReturn(accounts)` | Number (decimal)? | Calculated | value‑weighted Σ `actual_ttm` | nullable | Portfolio's blended **actual** (user‑reported) |

> **Don't conflate** the *expected* benchmark return (a **static** historical assumption, unless the
> user overrides it) with *the index's recent return* (**live**, `periodReturn` over the benchmark
> ticker's External price series).

### Reference / constant data (Source = `Reference (static)`)
Constant tables baked into the app (not user data, not fetched): `ASSET_KINDS` (18 kinds +
bucket/section/ret), `BENCHMARK_META` / `BENCHMARK_TICKER`, `BUDGET_CATEGORIES` (canonical spend
categories), `DEFAULT_BADGES` (badge catalog), the **IRS Uniform Lifetime Table** divisors +
`RMD_START_AGE = 73` (`decumulation/index.ts`), `TOXIC_APR = 0.07`, and the macro **fallbacks**
`FALLBACK_INFLATION 3.2` / `FALLBACK_TREASURY 4.35`.

---

# 3. Logic & Calculation Annex

> Every `Calculated` value, with **business logic → formula → dependencies → edge cases**. These are
> derived on read; they are **not stored** (so they cannot drift from the inputs — rule DR‑3).

## 3.0 Calculated Field Registry
Index of every derived value, so calculated fields are as scannable as the input tables. Per DR‑3 none
of these are stored.

| Field | Output type | Inputs (depends on) | Where used | Formula (short) | Annex |
|---|---|---|---|---|---|
| `net_worth` | Number (USD) | gross_assets, gross_debt | Home, Net Worth, Retirement | assets − debts | §3.1 |
| `gross_assets` | Number (USD) | AssetAccount.balance[] | Net Worth | Σ balance | §3.2 |
| `nest_egg` | Number (USD) | balance, retirement_pct, tax_bucket | Retirement | Σ balance×pct% | §3.3 |
| `spendable_nest_egg` | Number (USD) | nest_egg, legacyTarget | Retirement | max(0, nest_egg − legacy) | §3.3 |
| `take_home` (`monthlyIncome`) | Number (USD/mo) | income inputs, taxMode, manualTaxRate | Home, Budget, Cash‑flow | (gross − taxable×rate)/12 | §3.4 |
| `incomeTaxRate` | Number (decimal 0–1) | taxableAnnual, manualTaxRate | income chain | manual or IRS estimate | §3.4 |
| `retirementMonthlyIncome` | Number (USD/mo) | ri_* + ri_*_freq | Retirement | Σ ri / cadence | §3.5 |
| `debt_months_to_payoff` | Number (months) | balance, apr, monthly_payment | Goals/Debt | amortization (log) | §3.6 |
| `plannedMonthlySpend` | Number (USD/mo) | spendCats, monthlySpending | Budget, Home, Bill calendar | max(buckets, stated) | §3.7 |
| `budgetVsActual` | Object (planned/spent/remaining) | plannedSpend, ExpenseEntry[] | Home, Budget | planned − spent | §3.8 |
| `chance_of_success` | Number (0–100) | RetirementInputs (start_balance, return, vol, spend…) | Retirement | successes ÷ paths | §3.9 |
| `needed` (retirement) | Number (USD) | spendAtRetire, guaranteedAtRetire | Retirement | max(0, spend − guar) × 25 | §3.9 |
| `rmd` | Number (USD) | pre‑tax balance, age | Retirement, Home | balance ÷ ULT divisor | §3.9 |
| `account.balance` (ledger) | Number (USD) | cash_balance, positions, priceCache | Invest, Net Worth | cash + Σ shares×close | §3.11 |
| `goal_monthly` | Number (USD/mo) | target, saved, targetDate | Goals | (target − saved) / months | §3.12 |
| `resolveNetWorthRows` | Accounts + Debts | nwSeeded, live rows, onboarding | all financial screens | live if any, else seeded | §3.10 |
| `xp` / `streak` | Number | actions, lastCheckIn | Rewards | action points; daily streak | §3.13 |



### 3.1 `net_worth` — `src/domain/networth/index.ts:13`
- **Business logic:** what you own minus what you owe.
- **Formula:** `net_worth = round2(gross_assets − gross_debt)`.
- **Dependencies:** `gross_assets` (Calc §3.2), `gross_debt` (Σ `Debt.remaining_balance`).
- **Edge cases:** may be **negative** (underwater) — allowed. No division. Inputs come from live
  accounts, else seeded onboarding accounts (Calc §3.10).

### 3.2 `gross_assets` / `total_asset_value` — `src/domain/assets/index.ts` (`buildAssetsState`)
- **Business logic:** total value of all accounts.
- **Formula:** `Σ AssetAccount.balance` (where ledger‑managed `balance` = `cash_balance + Σ position
  market values`, Calc §3.11).
- **Edge cases:** missing balance ⇒ treated as 0; property included in net worth but **excluded** from
  the nest egg (§3.3).

### 3.3 `nest_egg` = `retirementEarmarkedValue(accounts)` — `src/domain/assets/index.ts:88,98,102`
- **Business logic:** the portion of assets actually earmarked to fund retirement — *not* net worth.
- **Formula:**
  ```
  earmarkDefault(a)   = a.tax_bucket == 'PROPERTY' ? 0 : 100      // home/vehicle don't fund spending
  earmarkedAmount(a)  = a.balance * (a.retirement_pct ?? earmarkDefault(a)) / 100
  nest_egg            = Σ earmarkedAmount(a)
  ```
- **Dependencies:** `AssetAccount.balance`, `retirement_pct`, `tax_bucket`.
- **Edge cases:** `retirement_pct` null ⇒ smart default (property 0%, retirement/investment 100%); a
  retiree's accounts default fully in, so nest egg ≈ investable net worth; **spendable** nest egg nets
  out the legacy reserve: `spendableEgg = max(0, nest_egg − legacyTarget)` (RetirementCockpit).

### 3.4 Income chain: gross → taxable → **take‑home** → available — `src/onboarding/modules.tsx`
- **Business logic:** translate raw income into spendable, after‑tax monthly income.
- **Formulas:**
  ```
  incomeTaxRate(a)   = a.taxMode=='manual' ? manualTaxRate/100 : estimateEffectiveTaxRate(taxableAnnual(a))
  monthlyIncome(a)   = (totalGrossAnnual(a) − taxableAnnual(a) * incomeTaxRate(a)) / 12     // NET take-home
  availableYr        = netYr − employee_401k_yr                                            // free to save/spend
  ```
- **Dependencies:** all income inputs (`baseSalary`, bonuses, rentals, benefits…), `taxMode`,
  `manualTaxRate`, `c_401k`.
- **Edge cases:** `if (totalGrossAnnual ≤ 0) monthlyIncome = 0`; only the **taxable** base is taxed
  (gifts/benefits excluded). **Use `monthlyIncome` (net) everywhere** — mixing it with gross was bug
  B‑55.

### 3.5 `retirementMonthlyIncome(a)` — `src/onboarding/modules.tsx:359`
- **Business logic:** guaranteed monthly retirement income (gross).
- **Formula:** `Σ over {ss,pension,withdrawals,rmd,annuities,other} of ri_<k> / CAD_DIV[ri_<k>_freq]`
  (cadence‑normalized to monthly).
- **Edge cases:** missing source ⇒ 0; this is **gross** — apply tax via the income chain for take‑home.

### 3.6 Debt payoff — `debtPayoff(a)` (`src/onboarding/modules.tsx:380`), `requiredPayment` (`src/domain/debt`)
- **Business logic:** months to clear a debt at a given payment; flag interest‑only.
- **Formula:**
  ```
  mRate         = apr / 12
  interestOnly  = pay > 0 && pay ≤ balance * mRate            // payment ≤ monthly interest
  months        = (!interestOnly && bal>0 && pay>0)
                  ? −log(1 − bal*mRate/pay) / log(1 + mRate)   // standard amortization
                  : ∞ (interest-only) / 0 (no balance)
  ```
- **Dependencies:** `remaining_balance`, `interest_rate_apr`, `monthly_payment` (≥ minimum).
- **Edge cases:** `interestOnly` ⇒ never pays off (surface a warning); `bal=0`⇒0 months; high‑APR debt
  flagged when `apr > TOXIC_APR (0.07)`.

### 3.7 Budget: `plannedMonthlySpend` / `monthly_spending` — `src/domain/budget/index.ts`
- **Business logic:** one definition of planned monthly spending (itemized if available, else stated).
- **Formula:** `monthly_spending = max(spendBuckets(op).monthly_total, toNum(op.monthlySpending))`.
- **Dependencies:** `spendCats` (→ fixed+flexible+nonmonthly buckets), `monthlySpending`.
- **Edge cases:** itemizing only part of a stated total must not under‑count — `max()` prevents the 2×
  runway bug (B‑24/B‑50). Non‑monthly items land in their `months` via `spendByMonth`.

### 3.8 `budgetVsActual(expenses, op, month)` — `src/domain/budget/index.ts`
- **Business logic:** planned vs actually‑logged spend for a month, by bucket.
- **Formula:** `planned_total` = plannedMonthlySpend (§3.7); `spent_total` = Σ ExpenseEntry.amount in
  month; `remaining = planned − spent`; per‑bucket the same.
- **Edge cases:** no budget ⇒ planned 0 ("No budget set"); month with no expenses ⇒ spent 0.

### 3.9 Retirement Monte‑Carlo: `simulate()` → `chance_of_success`, `needed`, gap — `src/domain/retirement/index.ts`
- **Business logic:** probability the plan lasts to the horizon, across many market futures.
- **Formula:**
  ```
  // per path: grow start_balance with random returns ~N(mean_return, vol_return),
  // add inflated contributions to retire_age, then withdraw inflated (spend − guaranteed) to horizon.
  success(path)      = balance never hits 0 before horizon_age
  chance_of_success  = round( successes / paths * 100 )                 // 0–100
  needed             = max(0, spendAtRetire − guaranteedAtRetire) * 25  // 4% rule (×25)
  gap                = max(0, needed − projected_at_retirement)
  suggested_extra_monthly = round2(extra needed to close the gap)
  ```
- **Dependencies:** RetirementInputs (§ "RetirementInputs": `start_balance` = nest egg, `mean_return`,
  `vol_return`, `inflation`, contributions, spend, guaranteed income, ages, `paths` default 400–500,
  `seed`).
- **Edge cases:** `paths` fixed seed ⇒ reproducible; spend ≤ guaranteed ⇒ no withdrawal (portfolio
  grows); `start_balance` uses **spendable** nest egg (post‑legacy) for retirees.

### 3.10 `resolveNetWorthRows(uid, op, nwSeeded, liveAccounts, liveLiabs)` — `src/domain/snapshot/index.ts:119`
- **Business logic:** one source for "what accounts/debts to use" — live if present, else seed from
  onboarding (so Home, Net Worth, and Retirement all agree).
- **Formula:** `useLive = nwSeeded || liveAccounts.length>0 || liveLiabs.length>0`; return live rows if
  `useLive`, else `assetsFromOnboarding(op)` / `debtsFromOnboarding(op)`.
- **Edge cases:** fixes the $0‑nest‑egg bug (B‑54) where a screen read raw empty arrays instead of the
  seeded set.

### 3.11 Ledger‑managed account `balance` — `src/domain/performance` + `transactions`
- **Business logic:** an account with `positions` derives its value from holdings, not a typed number.
- **Formula:** `balance = cash_balance + Σ_position( shares × latest_close(ticker) )`, shares from the
  lots in `priceCache`.
- **Edge cases:** missing price ⇒ fall back to cost basis (not $0) (B‑19); stale prices flagged via
  `pricesFetchedAt`.

### 3.12 Goal monthly contribution — `src/domain/goals`
- **Business logic:** what to save per month to hit a goal by its date.
- **Formula:** `monthly = max(0, (target_amount − saved) / months_until(target_year/targetDate))`.
- **Edge cases:** past/!set date ⇒ guard months ≥ 1; already funded ⇒ 0.

### 3.13 Gamification: XP & streak — `src/store/useStore.ts`
- **Business logic:** reward engagement.
- **Formula:** XP += action value (log income +15, expense +10, savings +20, investment +25, badge
  +50, daily streak +5); `streak` increments once per calendar day on check‑in, resets if a day is
  missed (`lastCheckIn` vs today via `toDateString()`).
- **Edge cases:** same‑day re‑open ⇒ no double‑count; a missed day ⇒ streak resets to 1.

### 3.14 Insight rule thresholds — `src/domain/insights/index.ts`
The story‑telling insights fire on these derived conditions (priority): emergency runway **< 3 months**
(cash ÷ monthly essentials); retirement success **< 60%**; toxic debt **APR > 7%** (`TOXIC_APR`);
401(k) room **> $1k** + earned income; trailing benchmark **< −2%**; cash drag **> 30%** of investable;
single‑account concentration **> 40%**; gross investing rate **< 10%**; plan completeness **< 100%**.

---

# 4. JSON Schema (machine‑readable mirror)

> Representative JSON Schema (draft‑2020‑12) for the core stored entities, so the data can be validated
> programmatically and this doc stays "alive." Money = `number` (USD); rates = `number` 0–1; dates =
> `string` (`date` or `YYYY-MM`); ids = prefixed strings.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://finwise.app/schemas/data-model.json",
  "title": "Finwise Data Model (core entities)",
  "$defs": {
    "Money":  { "type": "number", "description": "USD; round to 2dp at edges" },
    "Rate":   { "type": "number", "minimum": 0, "maximum": 1, "description": "decimal 0–1 (e.g. 0.065 = 6.5%)" },
    "EntityId": { "type": "string", "pattern": "^[a-z]+_[a-z0-9]+$" },
    "MonthKey": { "type": "string", "pattern": "^\\d{4}-\\d{2}$" },
    "DateKey":  { "type": "string", "format": "date" },

    "AssetAccount": {
      "type": "object",
      "required": ["asset_id", "label", "kind", "tax_bucket", "balance"],
      "properties": {
        "asset_id":   { "$ref": "#/$defs/EntityId" },
        "label":      { "type": "string", "minLength": 1 },
        "institution":{ "type": "string" },
        "kind":       { "enum": ["checking","savings","brokerage","stocks_etf","fixed_income","private_equity","hedge_funds","commodities","crypto","annuities","college_529","401k","trad_ira","roth_ira","hsa","home","vehicle","other_asset"] },
        "tax_bucket": { "enum": ["CASH","PRE_TAX","ROTH","TAXABLE","PROPERTY"] },
        "balance":    { "$ref": "#/$defs/Money" },
        "cash_balance": { "$ref": "#/$defs/Money" },
        "target_return": { "$ref": "#/$defs/Rate" },
        "actual_ttm": { "type": ["number","null"] },
        "retirement_pct": { "type": ["number","null"], "minimum": 0, "maximum": 100 },
        "change_amount": { "$ref": "#/$defs/Money" },
        "change_month": { "$ref": "#/$defs/MonthKey" },
        "face_value": { "$ref": "#/$defs/Money" },
        "coupon_rate": { "$ref": "#/$defs/Rate" },
        "maturity_date": { "$ref": "#/$defs/DateKey" },
        "positions": { "type": "array", "items": { "$ref": "#/$defs/Position" } },
        "origin": { "const": "onboarding" }
      }
    },
    "Position": {
      "type": "object",
      "required": ["position_id","ticker","lots"],
      "properties": {
        "position_id": { "$ref": "#/$defs/EntityId" },
        "ticker": { "type": "string", "pattern": "^[A-Z.\\-]{1,10}$" },
        "label": { "type": "string" },
        "kind": { "type": "string" },
        "lots": { "type": "array", "items": { "$ref": "#/$defs/Lot" } }
      }
    },
    "Lot": {
      "type": "object",
      "required": ["lot_id","shares","cost_per_share","purchase_date"],
      "properties": {
        "lot_id": { "$ref": "#/$defs/EntityId" },
        "shares": { "type": "number", "exclusiveMinimum": 0 },
        "cost_per_share": { "$ref": "#/$defs/Money" },
        "purchase_date": { "$ref": "#/$defs/DateKey" }
      }
    },
    "Debt": {
      "type": "object",
      "required": ["debt_id","label","debt_type","remaining_balance","interest_rate_apr","minimum_monthly_payment"],
      "properties": {
        "debt_id": { "$ref": "#/$defs/EntityId" },
        "label": { "type": "string", "minLength": 1 },
        "institution": { "type": "string" },
        "debt_type": { "enum": ["MORTGAGE","CREDIT_CARD","STUDENT_LOAN","AUTO","PERSONAL","OTHER"] },
        "remaining_balance": { "$ref": "#/$defs/Money" },
        "interest_rate_apr": { "$ref": "#/$defs/Rate" },
        "minimum_monthly_payment": { "$ref": "#/$defs/Money" },
        "monthly_payment": { "$ref": "#/$defs/Money" },
        "due_day": { "type": "integer", "minimum": 1, "maximum": 31 },
        "origin": { "const": "onboarding" }
      }
    },
    "Goal": {
      "type": "object",
      "required": ["id","label","target","saved"],
      "properties": {
        "id": { "type": "string" },
        "label": { "type": "string", "minLength": 1 },
        "icon": { "type": "string" },
        "target": { "$ref": "#/$defs/Money", "exclusiveMinimum": 0 },
        "saved": { "$ref": "#/$defs/Money" },
        "targetDate": { "$ref": "#/$defs/MonthKey" },
        "savingsType": { "enum": ["fixed","percent","leftover"] },
        "savingsAmount": { "$ref": "#/$defs/Money" },
        "savingsPercent": { "type": "number", "minimum": 0, "maximum": 100 },
        "color": { "type": "string" },
        "origin": { "const": "onboarding" }
      }
    },
    "Transaction": {
      "type": "object",
      "required": ["id","date","type","account_id"],
      "properties": {
        "id": { "$ref": "#/$defs/EntityId" },
        "date": { "$ref": "#/$defs/DateKey" },
        "type": { "enum": ["OPENING_POSITION","OPENING_CASH","BUY","SELL","DEPOSIT","WITHDRAWAL","TRANSFER","TRANSFER_IN_KIND","DIVIDEND","INTEREST","COUPON","FEE"] },
        "account_id": { "$ref": "#/$defs/EntityId" },
        "counter_account_id": { "$ref": "#/$defs/EntityId" },
        "ticker": { "type": "string" },
        "position_id": { "$ref": "#/$defs/EntityId" },
        "assetClass": { "enum": ["stock_etf","bond","other"] },
        "shares": { "type": "number", "minimum": 0 },
        "price": { "$ref": "#/$defs/Money" },
        "amount": { "$ref": "#/$defs/Money" },
        "reinvested": { "type": "boolean" },
        "created_at": { "type": "string", "format": "date-time" }
      }
    },
    "RetirementAssumptions": {
      "type": "object",
      "description": "all nullable — null means derive from live data",
      "properties": {
        "retireAge": { "type": ["number","null"] },
        "horizonAge": { "type": ["number","null"] },
        "contribMonthly": { "type": ["number","null"] },
        "spendMonthly": { "type": ["number","null"] },
        "risk": { "enum": ["conservative","moderate","aggressive", null] },
        "expectedReturn": { "type": ["number","null"], "minimum": 0, "maximum": 1 },
        "inflation": { "type": ["number","null"], "minimum": 0, "maximum": 1 },
        "ssEligible": { "type": ["boolean","null"] },
        "ssMonthly": { "type": ["number","null"] },
        "ssClaimAge": { "type": ["number","null"] },
        "actualReturn": { "type": ["number","null"] },
        "returnBasis": { "enum": ["benchmark","actual","scenario", null] }
      }
    }
  }
}
```

---

### Appendix — source files
- Store + types: `src/store/useStore.ts` · Persistence: `src/store/secureStorage.ts` · Cloud:
  `src/services/firebase.ts` · Rules: `firestore.rules`
- Entities: `src/domain/assets/index.ts`, `debt/index.ts`, `goals/index.ts`, `performance/index.ts`,
  `transactions/index.ts`, `onboardingProfile.ts`, `budget/index.ts`, `retirement/index.ts`,
  `decumulation/index.ts`, `income/types.ts`, `profile/types.ts`
- Calc: `src/domain/networth/index.ts`, `snapshot/index.ts`, `insights/index.ts`,
  `src/onboarding/modules.tsx`, `_shared/{num,ids,money}.ts`
- Companions: `docs/finwise-ui-design-guidelines.md`, `docs/finwise-bug-ledger.md`
