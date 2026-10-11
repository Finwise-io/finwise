# Inputs and use — audit summary (v01, 2026-10-11)

Read-only. No app code changed. Workbook: `moneykeel_audit_inputs-and-use_v01.xlsx` (tabs Inputs, Use, Inputs register, Entered not read, Coverage).

## Coverage

- Examined **740 of 740** functions and orchestrators that carry an ID in the code. The register issues **746**; **6** have no code at all (listed below).
- **4,582** input rows (one per function × input), covering **740 of 740** functions. **65 of 65** inputs on the inputs register checked.
- **223 of 223** metrics in force checked (237 issued, 14 retired).
- **54** screens on disk; **50** reachable in the live app. No way in: Tips, Rewards, `/income-detail`, the old `/invest`.
- **148** fields a person types were checked for a reader.

How it was read: the TypeScript compiler traced every call from the 50 live screens. Each field's origin comes from where the code writes it. Machine-sorted, so treat each row as a lead. I checked every Net worth, Performance and Cash flow finding below by hand.

## Counts

| | Count |
|---|---|
| Functions **used** by a live screen | 610 |
| Only tests run them | 50 |
| Worked example only (by design) | 35 |
| Nothing calls them | 26 |
| Called only by other unused code | 19 |
| ID issued, no code | 6 |
| Metrics printed by their ID | 140 |
| Metrics printed, matched by words only (no ID) | 47 |
| Metrics not printed under their own ID | 24 |
| Metrics on a screen with no way in | 4 |
| Metrics not found on any screen | 4 |
| Metrics unsettled | 4 |
| Input rows: made by another function | 2,548 |
| Input rows: typed by a person | 714 |
| Input rows: typed, or from a linked bank | 510 |
| Input rows: from a linked bank or price feed | 243 |
| Input rows: set by a decision | 278 |
| Input rows: published figure | 53 |
| Input rows: **number with no decision or source beside it** | 186 (160 in used functions) |
| Input rows: **missing — nothing supplies it** | 65 (55 in used functions) |

---

## Net worth

**Missing inputs**
- **MK-XS-I-063** (option contract size) is read by MK-NW-O-006 theHolding, MK-NW-F-091 and MK-NW-F-128. Nothing ever sets it, so every option counts as 100 shares. Your rule DEC-0274 says the broker or the person can say otherwise. Neither can: `src/services/sync/ingest.ts:175` passes no size. **Wire it** from the broker, with a box on the holding.
- **MK-NW-O-003** theNetWorth takes a monthly history for its trend, but none of its 8 callers passes one. The screen draws its own trend instead (`NetWorthScreen.tsx:690`). **Remove** the unused input, together with MK-NW-M-003 (below).
- **MK-NW-O-004** theEmergencyFund reads an old rent field, `rentalIncome`. Nothing writes it any more; rent is now kept as a list. Only accounts set up before that change carry it. **Remove** once old accounts are moved over.

**Numbers with no decision behind them**
- **MK-NW-F-034** benchmarkReturn: assumes **6%** when the kind of account is unknown (`assets/index.ts:2326`).
- **MK-NW-F-040** assetsFromOnboarding: **7%** return during setup (`assets/index.ts:2550`).
- **MK-NW-F-064** bondRateSensitivity: the ±1% range shown on "rates rise 1%" (`bonds/index.ts:928`).

For each: **record a decision** or point it at the per-class return table (DEC-0335).

**Not used**
- **Tests only:** MK-NW-F-006, F-013, F-015 totalAssets, F-017, F-018, F-019, F-020, F-038, F-062 couponIncomeAnnual, F-063 interestIncomeAnnual. Their tests pass on numbers no screen shows. **Remove**, or wire them in where a screen does that sum by itself.
- **Nothing calls them:** MK-NW-F-043 saveAssets, F-044 getAssetsState. **Called only by those:** F-042, F-111. **Remove.**
- **ID issued, no code:** MK-NW-F-089 MW. **Retire the ID.**

**Metrics not printed under their own ID** (the trail from screen to formula is broken)
- MK-NW-M-003 trend line: the line was taken off the screen. **Retire it.**
- MK-NW-M-028 "rates rise 1%" prints under MK-NW-M-023 (`AccountPortfolioScreen.tsx:865`).
- MK-NW-M-042 "n bonds · face" prints under MK-NW-M-053 (`BondsScreen.tsx:60`).
- MK-NW-M-014, M-015 and M-017 are not printed under their own IDs.
- MK-NW-M-045 is not printed under its own ID.

For each: **print it under its own ID**, or retire it.

## Performance

- **Missing:** MK-XS-I-063 (above) also feeds MK-PF-F-002 costBasis, F-004 marketValue, F-006 capGains, F-028 realizedFromLedger and F-031 contractMultiplier. An option's value, cost and gain all assume 100 shares. **Wire it.**
- **Unused input:** MK-NW-O-008 thePerformance still accepts `ending`, but no caller passes it. It is now worked out from the accounts. **Remove.**
- **Tests only:** MK-PF-F-003 avgCost, F-016 attribution, F-017 allocation, F-018 portfolioTrend, F-019 portfolioPeriodReturn, F-021 periodDollarDelta. **Remove**, or wire them in.
- **Not printed under its own ID:**
  - MK-PF-M-008 "market +X%".
  - MK-XS-M-004 Home's "▲ up $X (Y%) this month" is printed with no ID at all (`HomeScreen.tsx:319`).

  For both: **print through the ID.**
- No number without a decision was found in Performance functions.

## Cash flow

**Missing inputs**
- **HSA contribution** (`c_hsa`): read by MK-CF-O-005 theContributionRoom, but no screen asks for it. HSA room always shows nothing used. **Wire** a box.
- **Take-home that changes month to month** (`landsByMonth`): read by MK-CF-F-144 and MK-CF-F-146. The Base pay screen has no such table, and `base-pay.ts:1110–1112` passes only the typical month. **Wire it, or remove the branch.**
- **Dated big bills** (`bigBills`): read by MK-CF-F-153 radar. Only the worked example supplies them, so the dated rows never appear. **Wire it from the bill list, or remove.**
- **Monthly tax grid:** MK-CF-F-049 buildIncomeState (reached from Home) calls MK-CF-F-098 without filing status, state rate or age (`income/calc.ts:244`). That grid taxes everyone as single, with no state tax, under 65. **Wire** the three answers in.
- **Required-withdrawal age:** MK-CF-F-058 rothConversionWindow is never given it, so it uses **73**. A person born 1960 or later starts at 75. The published age function already exists. **Wire it.**
- **Old single-scholarship fields:** read by MK-CF-F-071, F-077, F-079 and MK-CF-O-019. Nothing writes them now; the scholarships list replaced them. **Remove** after moving old accounts over.

**Numbers with no decision behind them** (hand-checked; none found by `rulings-for.py`)
- MK-CF-F-036: toxic debt above **7%**.
- MK-CF-F-031: credit use good at **30%**, caution at **50%**.
- MK-CF-F-032: credit-score bands **800/740/670/580**.
- MK-CF-F-057: Roth-or-not lean at **12%/24%**.
- MK-CF-F-086, F-098, F-101: state tax capped at **15%**.
- MK-CF-F-107: safe draw aims for **80** chances in 100, and warns above **4.5%**.
- MK-CF-F-109: eight flag thresholds ($500, $1,000, 90 days …).
- MK-CF-F-153: a big bill is **$500**.
- Bonus month defaults to **December**: MK-CF-F-079, F-088, MK-CF-O-004, MK-CF-O-019.
- **40 hours** a week: MK-CF-F-130, F-141.
- Retire age **67**: MK-CF-O-017.
- Bill lead days **2/10/365**: MK-CF-F-019.

**Record a decision** for each.

**Published, but not on the published-sources register,** so no expiry check covers them:
- MK-CF-F-104 capital-gains bands.
- MK-CF-F-103 37% top band.
- MK-CF-F-056 catch-up at 50.
- MK-CF-F-089 age 65.

**Add them to the register.** MK-CF-F-106's 1,000 futures is your ruling G17; it just isn't cited beside the number.

**Not used**
- **Nothing calls them:** MK-CF-F-015, F-016, F-017, F-040, F-041, F-052, F-059, F-080, F-091, F-133, F-159.
- **Called only by those:** MK-CF-F-039, F-050, F-097, F-185.
- **MK-CF-O-016** incomeSources is an orchestrator, but only its own worked example calls it; no screen does. **Remove it, or wire it** where the income list is built.
- **Tests only:** MK-CF-F-020 cashflowYear, F-110, F-119, F-168, F-169, F-170, F-174, F-186, F-210.
- **ID issued, no code:** MK-CF-F-208, F-209, F-213, F-214, F-215. **Retire the IDs.**

**Remove** the unused functions.

**Metrics:** MK-CF-M-050 and M-054 (each planned or received line) print under MK-CF-M-004 (`CashFlowScreen.tsx:645`). **Print each under its own ID.**

**Typed but read by no function:**
- `hours` on the add-income sheet (`BudgetScreen.tsx:148`). **Remove the box**, or use it.
- `debtExtraMonthly` is read only on the Debts screen. **Unsettled.**

---

## Other modules (short)

- **Plan:** MK-PL-F-003 depletionAge is never given the pre-tax share or the tax rate (`RetirementCockpit.tsx:210`). **Wire them.** Also 46 numbers with no decision. Two metrics are found on no screen (MK-PL-M-011, M-029), and 35 are printed with no ID.
- **Cross-screen:** MK-XS-F-004 reads `otherIncomeYear`, which nothing writes. MK-XS-F-056 fetchEconomicData runs only in tests. That agrees with your ruling Q-50 (inflation is a fixed average, never live), so **remove it.**
- **Menu:** 13 declared metrics print under no ID: contribution room, credit line, stress test, job safety, tax organizer. MK-MN-M-011…014 sit on `/income-detail`, which has no way in.
- **Unused elsewhere:** 25 tests-only, 13 nothing-calls-them, 12 only-unused-callers (Plan, Storage, Cross-screen). Notifications (MK-XS-F-085…090) and receipt reading (MK-XS-F-092…094) are built but never switched on.

## Limits

- An origin of "typed" means a live screen saves that field name. It does not prove the box is visible in every data state.
- Fields read through names built at run time (`ri_` + key) are counted as read.
- Other agents edited `src/domain/performance` during the run. The register grew from 736 to 746 IDs while I worked.
