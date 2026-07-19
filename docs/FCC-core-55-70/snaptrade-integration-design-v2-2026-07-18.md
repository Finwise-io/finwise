# SnapTrade integration — detailed design v2 (2026-07-18)

**v2 = v1 + founder decisions (same day): Daily plan $1/user/mo · ALL SnapTrade-supported institutions in v1 with per-broker honesty cards · OPTIONS ITEMIZED (closes the PRD Capability-map G2 comment fragment that v1.1 answered incompletely — founder catch) · honesty card approved · BUILD NOW (rides Build 43).**

**Status: APPROVED 2026-07-18 — building.** Full documentation review completed
2026-07-18 (four research passes over docs.snaptrade.com, the API reference, the webhook/sync/rate-limit
guides, and the per-broker support matrix at support.snaptrade.com/brokerages). Every claim below is
doc-verified; open questions are marked. This supersedes the "wire Plaid" plan (Plaid requires a legal
entity we don't have).

---

## 1 · Architecture (the one picture)

```
MoneyKeel app (Expo)                    Firebase Cloud Function (we already run one)      SnapTrade
────────────────────                    ─────────────────────────────────────────────    ─────────
Connect screen ──asks──────────────────▶ /snaptradeRelay (holds consumerKey + userSecret) ──signed──▶ API
   ▲                                        · register user (first connect)
   │  in-app browser (expo-web-browser)     · mint 5-minute portal link
   └──deep-link redirect◀────────────────── · list connections / accounts
Store (ledger + accounts) ◀─normalized──    · positions/all · balances · activities
```

- **Why a relay:** SnapTrade signs every call with the secret `consumerKey` (HMAC-SHA256). Their docs
  are explicit: signing lives on a server, never in the app binary. Our existing `functions/` (the
  AI-proxy that already keeps keys off the client, F-1) gains one more endpoint. Per-user `userSecret`
  is stored server-side (Firestore, server-only rules), keyed by the Firebase uid.
- **Portal on mobile:** the system in-app browser (`expo-web-browser`), NOT an embedded WebView —
  SnapTrade's docs warn WebViews break bank OAuth/passkeys. Outcome returns via our deep link:
  `status=SUCCESS&connection_id=…` / `ERROR` / `ABANDONED`, plus a timeout path (ABANDONED isn't
  guaranteed if the user just closes the browser). Portal links expire in 5 minutes → minted on tap.
  ⚠️ `expo-web-browser` is an Expo native module → **batches into Build 43** like any native change.
- **No webhooks in v1** (they require a public endpoint + always-on server logic). The docs sanction
  a polling pattern, and the **Real-time plan is built for exactly our shape**: fetch on app-open,
  fetch on app-open (data is once-daily anyway; no in-session polling needed on the Daily plan).
  Webhooks become an option later — the relay function can host them.
- **Plan + cost (DECIDED):** Daily, **$1 per connected user per month**, no contract. Holdings refresh once daily on SnapTrade's side; the app fetches on open (their cached-daily data) — our freshness labels already say 'updated today/yesterday'. A user-facing Refresh costs $0.05/press server-side → debounced to once per day per user. The relay function can host their completion notifications later if we want tighter loops. Free tier (1 user,
  5 connections) covers all development and founder device-testing. Note: transactions are once-daily
  + one-day delayed on EVERY plan — that's a SnapTrade property, and our UI must say so.

## 2 · The connect flow (maps onto the existing /connect screens)

1. **Pick your brokerage** — list = SnapTrade's `/brokerages` (enabled, not in maintenance) ∩ our
   curated v1 list (§5).
2. **The honesty card (NEW, before any handoff)** — per-broker coverage disclosure, e.g. for Chase:
   > **What Chase shares:** balances · stocks, ETFs and mutual funds · about 2 years of activity
   > (refreshed daily).
   > **What it can't share:** bonds and fixed income · options. Anything you add by hand stays and
   > counts — nothing gets overwritten.
   Powered by a curated `BROKER_COVERAGE` table we ship (source: SnapTrade's support matrix — there is
   **no API endpoint** for the data matrix, only coarse runtime flags we'll use for
   maintenance/degraded warnings).
3. **Consent** — the existing approved `CONSENT_COPY` stands unchanged (it already says data flows
   through the connection service's servers).
4. **Bank sign-in** — in-app browser portal, read-only connection type (`connectionType: 'read'`).
5. **Accounts found** — as built, a dedicated in-flow **review step** (what arrived, per-account
   status badge) rather than the pre-existing screen (§10.5).
6. **Wrapper confirm (NEW when needed)** — SnapTrade has **no normalized 401(k)/IRA/Roth/taxable
   label**; only the broker's free-form `raw_type` string. We map the common strings per institution;
   when ambiguous we ask with the existing "Held in" chooser (Taxable / 401(k)/IRA / Roth). Wrong
   wrapper = wrong tax math, so this is confirm-not-guess (accuracy-is-trust P0).
7. **Merge gate** — as built, stronger than "runs unchanged": the connected account **absorbs** a
   manual twin (same institution+mask, else institution+wrapper), keeping the manual row's id,
   earmarks and confirmed wrapper — so a user who tracked Schwab by hand and then connects it never
   sees a duplicate (§10.6).
8. **Broken connections** — at app-open we check `disabled` on the connections list (broken
   connections silently serve CACHED data — the flag is the only tell). Stale banner + "Fix it" opens
   the portal with `reconnect=<connectionId>`. This detection is required by SnapTrade's launch checklist.

## 3 · When we call what (the schedule)

| Moment | Calls | Why |
|---|---|---|
| App open (connected user) | list connections (check `disabled`) → per-account `sync_status`, `/positions/all`, balances | SnapTrade's own recommended pattern; holdings are fetched live per request on Real-time |
| ~~While app active — re-fetch every 10 min~~ | **SUPERSEDED (§10.1)** — no in-session polling on the Daily plan; one sync per app-open, at most once per 20 hours | data only changes once daily; polling would buy nothing and cost calls |
| Activities | on app open; per-account **cursor** advanced only after the broker's `initial_sync_completed` — **as built, §10.2** (replaces the "−7 days overlap" sketch) | transactions refresh once daily anyway — more polling buys nothing |
| First connect | sync immediately after the portal returns; if the broker's initial transaction sync isn't finished yet, the cursor stays put and the next app-open completes the backfill (**as built, §10.2** — replaces the 2s→60s poll) | initial transaction sync takes 1–60s+; full history backfill (Schwab ~2yr read-only, Vanguard/Robinhood since account open) |
| Rate limits | 250 req/min global, **10 req/min per account** | schedule stays well inside; 429 → honor the Reset header |

## 4 · Data mapping (what we capture, field by field)

**Account → our `AssetAccount`:** `institution_name`→institution · `number`→mask · `balance.total`→
balance · `raw_type`+mapping+user-confirm→`kind`+`tax_bucket` · `sync_status.holdings.last_successful_sync`
→`last_synced` · `source:'connected'` · account `status` closed/unavailable → shown, never silently dropped.

**Positions → our positions/lots:** `tax_lots[]` (Fidelity, E*TRADE, Robinhood) map straight onto our
lots (date, quantity, price, cost basis). Brokers without lots → one synthetic lot from
`average_purchase_price` (gain-since-purchase still exact, per-lot history honestly absent).
Instrument classing: `type.code 'bnd'`→bonds · `crypto`→alternatives · stocks/ETF/ADR/CEF/mutual
funds→equities. `cash_equivalent` positions (money-market): ingested as holdings AND subtracted from
the balances-endpoint cash before it becomes our cash sleeve (SnapTrade counts them in both — dedupe
rule, pinned by test). **Options: ITEMIZED (founder decision, closing PRD Capability-map G2):** option holdings come from
SnapTrade's option-holdings endpoint and land under ALTERNATIVES as their own kind — display name
(e.g. 'AAPL $220 call · exp Jan 16 2027'), units (contracts), value (price × units × multiplier),
cost basis where provided. CSV import learns the same lesson as crypto (F1 #18): OCC-style option
rows file under alternatives-options, never as stocks. Option value already sits inside
`balance.total`, so net worth math is unchanged — itemization adds the visible rows. Futures/CFDs
remain total-only (not itemized), stated on the honesty card.

**Activities → our ledger (`TxnType`):**

| SnapTrade | Ours | Note |
|---|---|---|
| BUY / SELL | BUY / SELL | with units·price·fee |
| DIVIDEND | DIVIDEND (cash) | |
| REI / STOCK_DIVIDEND | DIVIDEND, `reinvested: true` | DRIP |
| CONTRIBUTION | DEPOSIT | |
| WITHDRAWAL | WITHDRAWAL | |
| INTEREST | INTEREST | |
| FEE / TAX | FEE (TAX noted) | |
| TRANSFER | TRANSFER; counter-account unknown → DEPOSIT/WITHDRAWAL by sign, noted | |
| EXTERNAL_ASSET_TRANSFER_IN/OUT | TRANSFER_IN_KIND | |
| SPLIT / ADJUSTMENT | new `ADJUSTMENT` ledger type — **no cash effect** (as built: a no-op in the apply engine, visible in history) | |
| ~~OPTION-* skipped in v1~~ | **SUPERSEDED (§10.3)** — option BUY/SELL land as real BUY/SELL ledger rows with exact cash; only EXPIRATION/EXERCISE/ASSIGNMENT are skipped (no cash moves) | G2 closure |

**Dedupe/idempotency:** SnapTrade activity `id` **can change on reprocessing** — we dedupe on a
composite key (account, trade_date, type, amount, units, symbol-UUID, `external_reference_id`,
description — the last added at build time to keep same-day same-amount rows apart, §10.4), so
re-ingesting a window never doubles a row. Symbols keyed on SnapTrade's UUID/FIGI, never raw ticker
(tickers aren't stable). Connected rows carry `source:'connected'` — the F10 worth-a-look review and
money-weighted return then run on REAL flows (mapped: money-weighted return needs exactly the
CONTRIBUTION/WITHDRAWAL rows this feed provides, often years deep).

## 5 · v1 brokerage list (DECIDED: everything SnapTrade supports, honestly labeled)

**Founder decision:** include ALL SnapTrade-supported institutions in v1 — including limited-data
and alpha ones — each with its own honesty card. Concretely: Schwab (read-only), Vanguard ("this
connection needs re-linking every few days" caveat on its card), Chase, E*TRADE, Robinhood, Public,
Webull ("shares trades only — no dividends or transfers"), Empower ("shares holdings only — no
activity"), Wells Fargo ("shares stock holdings only"), and the alpha tier TIAA / Edward Jones /
Transamerica (carded "early access — may disconnect"). **Fidelity: application submitted** (gated by
SnapTrade; added the day access is granted). Institutions SnapTrade cannot reach (Merrill/Bank of
America, 401(k) recordkeepers like Principal/Voya) appear in the picker as "not yet possible to
connect — add by hand or CSV and everything still counts."

## 6 · Is our backend ready? Mostly yes — the gaps, named

**Already built and tested:** the 12-type append-only ledger + pure apply engine with exact undo ·
positions with lots · the brokerage cash sleeve · tax-wrapper model · merge-not-duplicate gate ·
3-day freshness rule + stale banners · masked display · connected-vs-manual row tagging · monthly
snapshots. The store ingests everything in §4 with **no schema change**.

**New work (the honest list):** ① the relay Cloud Function (register/login-link/list/positions/
balances/activities, secrets custody) ② ~~extend the `SyncProvider` seam~~ **SUPERSEDED (§10.7)** —
built as a dedicated client + sync module instead; the old seam stays for the sandbox flow
③ `raw_type`→wrapper mapping + confirm step
④ the curated coverage table + honesty card UI ⑤ the activity mapper + composite-key dedupe
⑥ SPLIT/ADJUSTMENT no-cash handler ⑦ `expo-web-browser` dependency (native → Build 43)
⑧ Settings: view/disconnect connections + delete-user on account deletion (SnapTrade launch-checklist
requirement, matches our consent copy's promise).

## 7 · Open questions (doc gaps, resolved via a 1-day spike on the free tier)
portal multi-broker allowlist? · fixed-income field depth where supported? · cash+positions vs
balance.total reconciliation guarantee? · free-key concurrent-connection limit? · Fidelity gate lead
time? · manual-refresh latency?

## 8 · Decisions — RESOLVED 2026-07-18
1. Architecture: relay + in-app browser + fetch-on-open — **Daily plan $1/user/mo** ✅
2. Brokers: **all supported institutions**, honesty-carded; **Fidelity application: submit now** ✅
3. **Options itemized in v1** (G2 closure); futures stay total-only, disclosed ✅
4. Honesty card ✅
5. **Build now**; the in-app-browser native piece batches into Build 43 ✅

## 9 · Process note (the G2 lesson, logged)
The founder's PRD comment (Capability map G2) asked about options/crypto/currency/commodities in one
sentence; the v1.1 response answered three of the four and silently dropped "options." Caught by the
founder 2026-07-18. Rule going forward: multi-part founder comments are answered fragment by
fragment, each part named. A comment-by-comment verification pass of the detailed-design/high-level
v1.0 sheets (~40 comments) against the built app is queued as its own task.

## 10 · As-built amendments (2026-07-18, recorded after the build + 4-agent audit)

The build and its adversarial audit improved on the approved design in seven places. The approved
text above is kept with ~~strikethrough~~ markers; this section is the record of what shipped and
why. Rule applied: the code wins, the doc gets fixed.

1. **No 10-minute polling.** On the Daily plan, broker data changes once a day — an in-session
   poll would only re-download the same answer. As built: one sync per app-open, throttled to once
   per 20 hours (`shouldDailySync`, `src/services/sync/snaptradeSync.ts`), plus an explicit
   user-initiated refresh.
2. **Per-account activity cursor replaces the "−7 days overlap" and the first-connect poll.**
   Each account remembers the last date it fully ingested; the cursor only advances after the
   broker reports its initial transaction sync finished (`initial_sync_completed`). That closes
   two audit findings at once: a first sync that landed mid-backfill can never permanently skip
   history, and nothing depends on a guessed overlap window. Idempotency comes from the composite
   dedupe key, not from avoiding re-reads.
3. **Option trades are real ledger rows (audit P2, money-correctness).** Mapping option BUY/SELL
   to deposits/withdrawals — the easy path — would have corrupted the money-weighted return
   (fake external flows). As built they are BUY/SELL with the price normalized so
   shares × price = the broker's exact cash amount (`ingest.ts`); expirations/exercises/assignments
   are skipped because the broker reports their cash legs separately.
4. **Dedupe key gained `description`** — two same-day, same-amount, same-type rows (e.g. two $9.99
   fees) must not collapse into one.
5. **A review step ends the connect flow** (`SnapTradeConnect.tsx` step `review`): what arrived,
   per-account status, before the wrapper questions — the user sees the result where they are,
   instead of being dropped onto another screen to hunt for it.
6. **The merge gate absorbs manual twins** (audit P0): connecting a brokerage the user already
   tracked by hand keeps the manual row's identity (earmarks, confirmed wrapper) and links it to
   the connection — no duplicate, no double-count (`ingest.ts` + pin in `ingest.test.ts`).
7. **Dedicated SnapTrade client instead of extending the old `SyncProvider` seam**
   (`snaptradeClient.ts` + `snaptradeSync.ts`): the seam's search+link shape didn't fit a
   portal-handoff flow, and forcing it would have entangled the sandbox path. The sandbox flow
   keeps the old seam; `ConnectFlowScreen` picks live vs sandbox by whether the relay is configured.

Also recorded here for completeness: sync-state fields that must NOT cloud-sync (`snaptradeSeenKeys`,
`snaptradeLastSyncAt`, `snaptradeActivityCursor` are device-local — syncing seen-keys without the
rows would blank history on reinstall); connected balances are exempt from price-driven
`recomputeBalances` (the broker's total is authoritative); the cash sleeve keeps real negative
values (margin debit is information, not an error).