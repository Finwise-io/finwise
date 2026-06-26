# Net Worth + Insights — product/design deep-dive & redesign (build #33 device test)

Triggered by the build‑#33 device test. Two modules need real product+design work, not point patches:
**Net Worth (+ all sub‑screens)** and **Insights**. This doc is the assessment + the redesign + the open
decisions. Reproduce the issues from `docs/finwise-device-test-build33.xlsx`.

---

## A. NET WORTH — diagnosis

**Root cause: three orthogonal grouping axes are conflated in the UI.**
1. **Institution** (Chase, Vanguard) — `AssetAccount.institution`, optional, usually unset.
2. **Account / tax section** — Cash · Taxable accounts · Retirement accounts · Real estate & personal property
   (`SECTION_LABEL`, maps to `tax_bucket`). How the money is *held*.
3. **Asset class** — Cash · Stocks/ETFs · Bonds · Alternatives · Real estate · Personal property
   (`ASSET_CLASS_LABEL`, the donut). What the money *is*.
Plus a 4th hidden axis: **kind** (checking, brokerage, crypto, other_asset…) which maps to a class but has its
own labels — the source of "Other" vs "Alternatives".

### Bugs & their root cause (file:line)
| Issue | Where | Root cause | Class |
|---|---|---|---|
| **"By account" shows asset‑kinds, not institutions** | `NetWorthScreen.tsx:154,172` | group key uses `institution` but the row TITLE still renders `assetKind(a.kind).label`; with institution unset everything collapses to kind labels + duplicate "Other" + one huge "stocks/etfs" | **real bug** |
| **Imported stock LCTX → "brokerage / imported holdings"** | `ImportHoldingsScreen.tsx:86‑96` | equities are bundled into ONE brokerage account labeled with the import name; LCTX is a *position* inside, not surfaced at top level | by‑design, bad UX |
| **Alternatives render as "Other"** | `NetWorthScreen.tsx:154‑172`, `ASSET_KINDS` | row uses KIND label (`other_asset`→"Other") not CLASS label ("Alternatives") | inconsistency |
| **CSV preview blank ticker for CD/ETF/bond** | `ImportHoldingsScreen.tsx:142‑155` | preview shows only `ticker`; non‑equities have none — should show `symbol`/`label` | real bug |
| **Options entry overwrites ticker → "chase"** | options add/edit sheet | institution field bound to the ticker/label field | real bug (verify exact binding) |
| **Short‑term bonds missing under "Bonds"** | `BondsScreen.tsx:25`, `bonds/index.ts:11` | `isBond` requires `maturity_date`; bond *funds* (class=bonds, no maturity) never appear → live in Taxable as a kind | IA gap |
| **"Portfolio" label** | `NetWorthScreen.tsx` explore box | row is "Portfolio performance vs benchmark"; the screen IS the Stocks/ETFs tracker → label it so | labeling |
| **Bonds/Alternatives can't record transactions** | Bonds/OtherInvestments screens | account‑based (manual balance) vs Stocks/ETFs position+ledger model | inconsistency |
| **Performance "$1192. 965 sh · ‑29% since buy"; YTD ‑26% / 1Y +28% / since‑buy ‑29% don't reconcile** | `PerformanceScreen.tsx:140‑142`, `domain/performance` | `money()` rounds, `totalShares` shows raw decimals → butted together; return windows computed off different bases | real bug |
| **cost/share integer‑only** | `PerformanceScreen.tsx` add‑holding | the *lot* field uses `decimal-pad` (ok) — the field the user hit may differ; **verify on device's exact field** | verify |

### Redesign — one coherent information architecture
**Principle: pick ONE primary axis (asset class), make the others explicit secondary views.** Net Worth's job
is "what do I own, by what it is, and is it diversified." Institution is a *filter/detail*, not a primary lens.

- **NW home = by ASSET CLASS** (donut + class rows) — already correct; keep. Caption already says "regrouped by
  what it is."
- **A holding always shows: `<name/ticker> · <class> · <account> · $value`** — so LCTX reads
  "LCTX · Stocks/ETFs · Imported holdings · $1,192", never "brokerage/imported holdings". Use the CLASS label
  (not kind) for the class chip everywhere.
- **"Explore your holdings" rows = the asset‑class managers**, labeled by class: **Stocks/ETFs** (the
  Performance/Grow&track screen, retitled), **Bonds**, **Alternatives**, plus **Import**. One vocabulary.
- **Two toggles, both honest:** *By class* (default) and *By institution* (only when institutions are set;
  if none set, hide the toggle or show "add an institution to group this way"). Fix the row‑title bug so the
  institution view groups + labels by institution.
- **Bonds & Alternatives**: keep them as managers, but give every class the SAME verbs — Add, Edit, and
  **Record activity** (buy/sell for tradeables; deposit/withdraw/value‑update for manual) — so the user isn't
  surprised that only Stocks/ETFs can log activity. (Decision below on how far to take this.)
- **Import**: preview shows a **Security** column (symbol or name) for every row; classify each row to the
  canonical class and let the user correct it inline; never label a stock "imported holdings".

```
NET WORTH (by asset class)                    [ By class ▾ | By institution ]
  ◐ donut + legend (class, $, %)
  "You add by account; here it's regrouped by what it is."

  Explore your holdings
   📥 Import a brokerage file
   📈 Stocks / ETFs        $2.50M   (was "Portfolio performance")
   📜 Bonds                $0.00
   🪙 Alternatives         $2.10K
   ─ holdings ─
   LCTX · Stocks/ETFs · Imported holdings · $1,192   ‑29% since buy
```

---

## B. INSIGHTS — diagnosis

9 rule‑based cards (`domain/insights/index.ts`), one flat list, each routes somewhere. Engine is clean; the
**presentation + destinations** are the problem.

### Issues
- **No provenance.** Every card is a one‑liner + a number; it never shows *which accounts* or the math. Users
  don't trust a number they can't trace. (The `Insight` type has no `details`/`dataSource`.)
- **Wrong / contextless destinations:**
  - `k401-room` ("$6,500 room") → `/retirement` cockpit (and only visible there in Advisor+non‑retired). User
    wanted a **contribution‑room detail**: IRS limit, what you've put in, what's left, how to add it. The
    `k401Headroom()/annualIraLimit()/IRS_LIMITS` helpers already exist (`domain/income/limits.ts`).
  - `concentration` / `cash-drag` → generic `/performance` with nothing highlighted; user can't tell *which*
    account is 92%.
- **Dead card:** `retire-offtrack` never fires — `retireChance` is always `null` on Insights (the Monte‑Carlo
  is skipped to avoid a heavy re‑sim).

### Redesign
- **Add provenance to every insight.** Extend `Insight` with `details: {label,value}[]` (the accounts + the
  math) and `cta:{label,route}`. Tapping a card opens a **drill‑down sheet**: the one‑liner, the breakdown
  ("Vanguard Brokerage $450k ÷ $1.1M investable = 41%", or "Checking $5k + Savings $2k = cash"), then the CTA.
- **Right destinations:**
  - Build a **`/contribution-room`** screen (401k/IRA/HSA: limit · used · remaining · catch‑up · how to add),
    reusing the limits helpers. Route `k401-room` (and a new IRA/HSA‑room insight) there.
  - For `concentration`/`cash-drag`, pass the flagged account/context so Performance highlights it (route param)
    — or show it in the drill‑down sheet and make the CTA "Open <account>".
- **Fix `retire-offtrack`:** cache the cockpit's `chance_of_success` in the store when computed, OR run a light
  (100‑path) sim on Insights; otherwise delete the dead card.
- **Group the list** by theme (Protect / Grow / Optimize) with headers, so it reads as a plan, not a pile.

```
Insight card (tap → drill-down sheet)
 🎯 Concentrated in one account
    92% of your invested money is in one account.
    ▸ tap → sheet:
        Vanguard Brokerage      $2,500,000   92%
        Schwab IRA                 $180,000    7%
        … = $2.72M investable
        [ Open Vanguard Brokerage → ]   [ How to diversify ]
```

---

## C. Separable bugs (fix directly, outside the redesign)
T22 cash‑flow loop (still loops on device — needs real diagnosis); **hide‑balances must mask ALL amounts**
(currently only the NW chip+donut); keyboard hides bottom fields when content fits (add keyboard‑height bottom
inset / scroll‑into‑view); **goal status bar always green** (on‑track/behind color not wired to `goalStatus`);
**% spending category** has no entry UI (the A‑1 fix exists in the engine but the user can't enter a % category);
"Set limits" appears twice on the Activity tab; Sentry test‑event still to verify.

## D. Open decisions (see chat)
1. NW primary axis = **asset class**, institution as a secondary view (recommended) — confirm.
2. Bonds & Alternatives: give them **Record‑activity** parity, or keep manual‑balance + just relabel? 
3. Imported equities: surface each ticker as a holding under its brokerage (recommended) vs keep bundled.
4. Insights: build **provenance drill‑down + `/contribution-room`** now (recommended) vs lighter relabel.
