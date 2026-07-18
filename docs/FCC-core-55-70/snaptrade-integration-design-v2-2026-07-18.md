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
5. **Accounts found** — existing screen (name · mask · first-class balance).
6. **Wrapper confirm (NEW when needed)** — SnapTrade has **no normalized 401(k)/IRA/Roth/taxable
   label**; only the broker's free-form `raw_type` string. We map the common strings per institution;
   when ambiguous we ask with the existing "Held in" chooser (Taxable / 401(k)/IRA / Roth). Wrong
   wrapper = wrong tax math, so this is confirm-not-guess (accuracy-is-trust P0).
7. **Merge gate** — the existing update-not-twin logic runs unchanged (same institution+mask ⇒ update).
8. **Broken connections** — at app-open we check `disabled` on the connections list (broken
   connections silently serve CACHED data — the flag is the only tell). Stale banner + "Fix it" opens
   the portal with `reconnect=<connectionId>`. This detection is required by SnapTrade's launch checklist.

## 3 · When we call what (the schedule)

| Moment | Calls | Why |
|---|---|---|
| App open (connected user) | list connections (check `disabled`) → per-account `sync_status`, `/positions/all`, balances | SnapTrade's own recommended pattern; holdings are fetched live per request on Real-time |
| While app active | re-fetch positions/balances every 10 min | their documented cadence; stays far under limits |
| Activities | on app open, only when `sync_status.transactions.last_successful_sync` advanced; pull from (last ingested date − 7 days) overlap | transactions refresh once daily anyway — more polling buys nothing |
| First connect | poll `sync_status.initial_sync_completed` (backoff 2s→60s), then page activities 1000/page from `first_transaction_date` | initial transaction sync takes 1–60s+; full history backfill (Schwab ~2yr read-only, Vanguard/Robinhood since account open) |
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
| SPLIT / ADJUSTMENT | position adjustment, **no cash effect** (new small handler) | |
| OPTION-* | skipped in v1, disclosed | |

**Dedupe/idempotency:** SnapTrade activity `id` **can change on reprocessing** — we dedupe on a
composite key (account, trade_date, type, amount, units, symbol-UUID, `external_reference_id`), so
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
balances/activities, secrets custody) ② extend the `SyncProvider` seam (today it's search+link only)
to portal-URL + reconnect + positions/activities pull ③ `raw_type`→wrapper mapping + confirm step
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