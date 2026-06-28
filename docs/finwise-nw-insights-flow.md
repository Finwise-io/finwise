# Net Worth & Insights — Flow Review (build #35)

A plain-English, tap-by-tap walkthrough of the two modules you flagged, so you can **review the design now
without waiting for the device build**. Everything here is read straight from the code on branch
`taxonomy-v1.0.7` (latest commit), so it matches exactly what build #35 will do.

- **✅ NEW** = changed or added in this session (the build-33 device-test fixes). The `B-xx` tag is the
  bug-ledger row, so you can cross-reference.
- Each screen is described as: *what you see* → *what you can tap* → *where it goes*.
- At the end (Part 3) is a short **"sign-off checklist"** — the design decisions worth your eyes.

---

## At a glance — the two maps

```
NET WORTH (tab)
│
├─ Net-worth donut (by asset class)            ← masked when "hide balances" is on ✅
├─ Assets − Debts = Net worth   (the math, spelled out)
├─ Emergency-fund runway  🛟
│
├─ "Explore your holdings" box
│    ├─ 📄 Import holdings (brokerage CSV) ───────────► Import screen ✅
│    ├─ 📈 Stocks / ETFs — performance ✅(renamed) ──► Performance screen
│    ├─ 📜 Bonds — coupons, maturity, yield ─────────► Bonds screen ✅
│    └─ 🪙 Alternatives — crypto, PE, … ─────────────► Alternatives screen ✅
│
└─ Account sections: Cash · Investments · Retirement · Property
     └─ Investments list  ── toggle ──►  [ By class ] [ By institution ] ✅
          └─ each row → tap → edit-account sheet

INSIGHTS (tab)
│
├─ Grouped under  🛡 PROTECT · 📈 GROW · ⚙️ OPTIMIZE  ✅
└─ tap any card → drill-down sheet ✅
        ├─ the accounts + the math behind the number
        └─ "Take me there →"  ► the right screen
                                   (e.g. 401(k) room ► Contribution room ✅)
```

---

# PART 1 · NET WORTH

## 1.1 The main screen (top → bottom)

1. **Donut + net worth** — a ring split by *asset class* (Cash / Stocks & ETFs / Bonds / Alternatives /
   Real estate / Personal property), with your net worth in the middle (turns red if negative). A legend
   lists each class with its dollar value and %. Debts show as a red legend row.
   - **✅ Hide balances:** if the eye/Settings toggle is on, the center figure and **every** dollar on this
     screen (and everywhere else) shows `••••`. *(B-74)* 
[pj - tab not working]

2. **The math, spelled out:** `Assets $X − Debts $Y = Net worth $Z` — so the number is never a mystery.
3. **Caption + nudge:** explains that you *add money by account*, but the donut *regroups by what it is*
   (a 401(k) splits into the stocks/bonds/cash it holds). If some accounts have unknown holdings, a nudge
   says "$N is in accounts whose holdings aren't set — tap to choose the mix."
4. **Emergency-fund runway 🛟** — "your cash covers ~N months of spending," coloured green/amber/red.
5. **"Explore your holdings" box** — four rows (the four sub-screens, see 1.4).
6. **Account sections** — Cash, Investments, Retirement, Property. Each lists its accounts; an `+ Add` adds
   one. **Investments** has the class/institution toggle (1.3).
[pj: add cash pop up screen only has savings and checking, what about other sub-types classified as cash?]
[pj: add taxable accounts screen has brokerage and sub-types are randomly displayed. Again all center justified - not pleasing to eye from UI perspective]



7. **Debts** section + a callout for your costliest (highest-APR) debt.

[pj: where is the callout? Also, when I add new debt, it asks for min payment not fixed payment in case of student loan or mortgage]

## 1.2 Adding / capturing an account

- Tap **`+ Add`** on any section (or first-run setup walks you through Cash → Investments → Retirement →
  Property). The sheet asks: **Name**, **Institution / name (e.g. Chase)**, **type**, and **balance**.
- The institution field is what powers the **By institution** view (1.3).

## 1.3 The Investments list — *By class* vs *By institution*  ✅ *(B-78)*

A toggle sits above the Investments list:

```
[ By class ]   [ By institution ]
```

- **By class** — groups by *what it is*: Stocks & ETFs, Bonds, Alternatives, Cash, etc.
  Each group header has an **ⓘ InfoDot** explaining the class ✅ *(B-88)*. Each row shows the account name;
  the sub-line shows its institution.
  - **Fix:** an alternative (crypto/PE) used to show as **"Other"** — it now shows under **"Alternatives"**
    with the correct class label.
[pj: feedback in test-build-34 file #7 and 8]

- **By institution** — groups by *where it's held*: Chase, Vanguard, Fidelity… Each row shows the account
  name; the sub-line shows its class. Accounts with no institution set fall under "No institution set."
- **✅ Tickers surfaced** *(B-87):* if an account holds individual securities (e.g. an imported brokerage
  holding **LCTX**, **AAPL**), the row's sub-line now lists those tickers — so they're not buried under a
  generic "Imported holdings" name.

Tapping any row opens the **edit-account sheet** (name / institution / type / balance / delete).

## 1.4 The four holding sub-screens

### 📈 Stocks / ETFs  (Performance screen)
- **✅ Renamed** from "Portfolio performance" to **"Stocks / ETFs — performance vs benchmark"** *(B-79)*.
- Lists each holding: ticker, name, market value, **share count**, and return since purchase.
  - **✅ Share count** is now clean (no float-drift like "965.0000001") *(B-81)*.
- **Add a holding** → enter ticker, then one or more *lots* (Shares · Cost/share · Date).
  - **✅ Decimals now work** in both Shares and Cost/share (e.g. `12.5` shares, `10.55` cost) — they used to
    snap to whole numbers *(B-81)*.
- You can also **record a sale** of shares here (existing behaviour).

### 📜 Bonds
- Summary (total value, count, coupon/yr, avg yield, next maturity) + a card per bond (face, coupon,
  maturity, yield, YTM). Title has an **ⓘ InfoDot** ✅.
- Tap a bond → edit sheet (issuer, institution, face, coupon, maturity, **current value**, account).
- **✅ "Record a sale"** *(B-86)* — your correction that bonds are sellable on the secondary market:
  - Enter the **amount sold**. A **partial** sale lowers the value *and* scales the face/par down
    proportionally (so coupon income tracks the remaining face). **"Sold the whole position"** closes it.
  - Re-marking the price (not a sale) = just edit **Current value**.
  - A confirm dialog states exactly what will change before it applies.

### 🪙 Alternatives  (crypto, PE, commodities, options…)
- Card per holding + summary. Title has an **ⓘ InfoDot** ✅.
- Tap → edit sheet (type, name, **✅ "Where it's held (institution)"** field, current value, account).
  - **✅ The institution field** *(B-80)* fixes the "options → chase" bug: there used to be no institution
    field, so typing an institution name overwrote the holding's name/ticker. Now it has its own field.
- **✅ "Record a sale"** *(B-86)* — same as bonds (American options sell before expiry; crypto sells
  partially). Full closes the position; partial lowers the value.

### 📄 Import holdings (brokerage CSV)
- Pick a CSV → **preview** of what was read → "Add N holdings."
- **✅ Preview shows a Security name + asset class for *every* row** *(B-82)* — CDs, bonds, and money-market
  rows used to show a blank ticker cell; now each shows ticker‖description‖symbol plus its class
  (Cash / Bonds / Alternatives / Stocks-ETFs).
- **✅ Single-stock files** auto-name the account after the ticker (so it reads **"LCTX"**, not "Imported
  holdings") *(B-87)*. Equities import as one brokerage account with the tickers tracked inside it.

## 1.5 Hide balances ✅ *(B-74)*
One toggle (eye icon / Settings) masks **every** money figure across the whole app — balances, the donut,
goals, holdings, surplus, retirement — to `••••`. Toggling it re-renders everything live.

## 1.6 InfoDots (the ⓘ dots) ✅ *(B-88)*
Tappable "what does this mean?" dots, all reading from one glossary so a term means the same thing
everywhere. Now attached to: the Net Worth **By-class group headers** (each asset class), and the **Bonds**,
**Alternatives**, and **Contribution-room** titles. New terms added: Cash, Stocks & ETFs, Bonds,
Alternatives, Real estate, Personal property, Gross income, Contribution room.

---

# PART 2 · INSIGHTS

## 2.1 The Insights tab ✅ *(B-84)*
Cards are now **grouped under three theme headers** instead of one flat list:

```
🛡 PROTECT     (emergency fund, high-interest debt, concentration, retirement risk)
📈 GROW        (cash sitting idle, trailing the benchmark, investing rate)
⚙️ OPTIMIZE    (401(k) room left, finish your plan)
```

## 2.2 Tap an insight → the drill-down sheet ✅ *(B-84)*
Every card is tappable. Tapping opens a bottom sheet with:
1. The headline + plain explanation.
2. **"Where this comes from"** — the actual **accounts + the math** behind the number (so a figure is never
   unexplained). Examples below.
3. **"Take me there →"** — routes to the screen where you act on it.

## 2.3 The full insight catalog

| Card | Theme | Shows when… | "Where this comes from" (drill-down) | Take me there → |
|------|-------|-------------|--------------------------------------|-----------------|
| Tackle high-interest debt | 🛡 | a debt is above the toxic-APR threshold | the debt, its APR, its balance | Goals |
| Build your emergency fund | 🛡 | cash < 3 months of spending | cash on hand · monthly spending · months covered | Goals |
| Retirement needs attention | 🛡 | plan lasts <60% of the time **✅ now live** *(B-85)* | your chance % · the 60% healthy target | Retirement |
| Concentrated in one account | 🛡 | one account > 40% of investable | each account's % of investable · total invested | Performance |
| Trailing your benchmark | 📈 | portfolio > 2 pts behind benchmark | your 12-mo return · benchmark · the gap | Performance |
| A lot is sitting in cash | 📈 | cash > 30% of investable | each cash account · cash total · investable · % | Performance |
| Nudge up your investing | 📈 | investing < 10% of gross income | annual contributions · gross income · the rate | Goals |
| Room left in your 401(k) | ⚙️ | 401(k) headroom > $1,000 *and* you have wages | the IRS limit · contributed · room left | **Contribution room ✅** *(B-83)* |
| Sharpen your plan | ⚙️ | plan < 100% complete | — | Sharpen plan |

## 2.4 Contribution room screen ✅ *(B-83)*
The **"Room left in your 401(k)"** insight used to dump you in the Retirement cockpit. It now opens a
dedicated **Contribution room** screen showing, per account type:
- **401(k)** — IRS limit (incl. age-50+ catch-up) · what you've contributed · room left (progress bar) ·
  *how to add it* (raise your paycheck deferral %).
- **IRA (Traditional + Roth)** — combined limit · room · note that income limits may apply.
- **HSA** — limit (if you're on a high-deductible plan).
- Title has an ⓘ InfoDot. Limits are the 2026 IRS figures.

## 2.5 Retirement card now works ✅ *(B-85)*
The "retirement needs attention" card was previously dead (it never had a number to test against). Now,
once you've opened the **Retirement** cockpit, it caches your Monte-Carlo "chance it lasts" and the insight
uses it — so the card appears when that chance is under 60%, with the % shown as its provenance.

---

# PART 3 · Sign-off checklist (the design calls worth your eyes)

Review these as a user would; tell me anything that feels wrong and I'll adjust before build #35:

1. **NW grouping** — Is *By class* vs *By institution* the right pair of lenses? Default opens on **By class**.
2. **Tickers on the row** — surfacing held tickers on the *sub-line* (vs. expanding each ticker into its own
   NW row). Lighter; keeps the account model. OK, or do you want each ticker as its own row?
3. **"Record a sale" model** — partial bond sale scales face proportionally; partial alt sale just lowers
   value. Confirm dialog before applying. Does that match how you think about selling them?
4. **Proceeds of a sale** — right now a sale just lowers/closes the holding; it does **not** auto-add the cash
   to a cash account or log income. Intentional for now — flag if you want proceeds routed to cash.
5. **Insight themes** — Protect / Grow / Optimize buckets. Right names + right cards in each?
6. **Provenance depth** — the drill-down shows accounts + the core math. Enough, or do you want per-line
   detail (e.g. every lot)?
7. **Contribution room — IRA/HSA** — 401(k) numbers are exact (from your entries); IRA/HSA show the *limit*
   and room because we don't capture those contributions yet. OK, or should onboarding capture them?
8. **Retirement card dependency** — it only appears *after* you've visited the Retirement screen once (so we
   don't re-run a heavy simulation on every Insights view). Acceptable trade-off?

*(Everything above is already coded, committed, and covered by the 739 passing tests — this doc is for design
sign-off; build #35 puts it on your phone once the EAS quota resets ~Jul 1.)*
