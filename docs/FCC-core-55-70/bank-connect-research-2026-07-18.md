# Bank/brokerage connection options without a legal entity — research 2026-07-18

**Context.** Plaid production access requires a registered business entity, which we don't have
(individual Apple developer account, no LLC). The F1 SyncProvider seam means ANY provider below
plugs into the same place the sandbox provider lives today; the connect flow already says honestly
that live linking is off until a provider ships.

## Verified options (web-checked 2026-07-18)

| Provider | Entity needed? | Cost at our scale | Coverage | Mobile integration | Verdict |
|---|---|---|---|---|---|
| **Teller** | No for the developer tier — self-serve signup | FREE up to 100 live connections | 7,000+ US institutions (banks-first) | Teller Connect (iOS/Android SDKs + web) — WebView route avoids a native dep | **Best no-entity option for BANKS** |
| **SnapTrade** | Self-serve keys, pay-as-you-go, no contract ("personal + commercial" tiers) | Pay-as-you-go, no monthly minimum, unlimited connections | BROKERAGES + retirement accounts (E*TRADE, Public, and other majors) | Hosted connection portal (URL/iframe) — WebView, no native dep | **Best for INVESTMENT accounts — the heart of the 55-70 product** |
| **Stripe Financial Connections** | Sole proprietor OK (Stripe account) | Per-connection/per-account usage pricing | 5,000 institutions | Stripe mobile SDK | Workable; payments-oriented, data is the side product |
| **SimpleFIN Bridge** | None — the USER subscribes ($1.50/mo or $15/yr) and grants the app a token | Free to the app | 12,000+ institutions via relay | Token paste / URL flow | Indie-favorite model, but asking 55-70 customers to buy a second subscription is real friction — stopgap only |
| MX / Finicity (Mastercard) / Yodlee / Akoya | Yes — enterprise sales cycle + entity | Quote-based | Broad | Varies | Not now |

## The other unlock: form an LLC (~$50–$500 state fee, days–2 weeks)
Reopens Plaid itself, and a finance app arguably wants an entity anyway (liability separation,
data-access agreements, app-store finance categories). Most aggregators eventually want an entity
at production scale even when the developer tier is self-serve.

## Recommendation
1. **Wire SnapTrade first** — investment/retirement accounts are what a 55-70 audience most wants
   linked, self-serve keys today, pay-as-you-go, and the hosted portal means NO new native
   dependency (WebView), so it does not have to batch into a native build the way Plaid's SDK did.
2. **Teller second** for checking/savings — free to 100 connections, also WebView-able.
3. **File the LLC in parallel** — durable unlock for Plaid (or any enterprise aggregator) later.
4. SimpleFIN only if we want a zero-cost power-user escape hatch; not the mainline.

Both #1 and #2 implement the existing `SyncProvider` interface (same seam as the sandbox
provider); each is roughly a day of wiring + tests, and neither blocks Build 43.

## Addendum (same day): does SnapTrade replace the market-data provider? NO — but it shrinks the need

Verified against SnapTrade's docs: its endpoints are ACCOUNT data only — positions (with the
broker's current marks), balances, orders, and transaction history (often years; e.g. Schwab
retains ~4). There is **no historical price-series or benchmark endpoint** — no daily closes for
a ticker, no SPY history. Teller likewise: bank account data only, zero market data.

What that means per feature of the APPROVED Invest design:
- **Covered by SnapTrade (connected users):** portfolio value hero (broker marks), gain since
  purchase (cost basis), and — a real win — its multi-year transaction history feeds the
  money-weighted personal return from REAL flows.
- **Still needs a market-data provider:** the 1M/3M/1Y/3Y period returns (needs each ticker's
  historical daily closes), the "vs the market" comparison (SPY series), look-back
  counterfactuals, and current prices for MANUAL/CSV holdings (users who never connect — a core
  path for this audience).
- Our own monthly snapshots grow a trend history going forward, but cannot backfill 1–2 years
  and carry no benchmark line.

Sizing the remaining need: END-OF-DAY daily closes, ~a few hundred tickers + SPY, ~3 years of
history — the smallest tier any end-of-day vendor sells. The 2026-07-15 price-provider research
stands: delayed/end-of-day data with end-user display rights (sales-quote route, e.g. Intrinio).
