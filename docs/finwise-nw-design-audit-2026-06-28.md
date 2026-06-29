# Net Worth module — Sr. Design Engineer audit (2026-06-28)

Whole-module review (per-screen reviewers + format scan), synthesized. Gap register below; statuses
updated as fixed. Strengths: clean two-axis taxonomy on the new add flow, coherent IA (donut=allocation ·
accounts=where · explore=holdings), no nav dead-ends, hide-balances correctly masked via `money()` (the
two reviewers' "leak" claim was a misread — `formatMoney` masks; guard test passes).

Screens: NetWorthScreen · PerformanceScreen (Stocks/ETFs) · BondsScreen · OtherInvestmentsScreen
(Alternatives) · ImportHoldingsScreen.

| ID | Sev | Screen | Finding | Fix | Status |
|----|-----|--------|---------|-----|--------|
| NW-1 | HIGH | Bonds | `isBond = !!maturity_date` violates spec ("detect by assetClass, not maturity"). Bond funds (no maturity) are invisible; a CD/T-bill w/ maturity wrongly shows as a bond | `isBond = assetClassOf(a)==='bonds'`; drop "CDs" from empty-state copy | ✅ fixed |
| NW-2 | HIGH | Performance | Screen title still "PORTFOLIO PERFORMANCE", not the canonical "Stocks / ETFs" (build-34 #9) | eyebrow → `ASSET_CLASS_LABEL['stocks_etf']` + subtitle | ✅ fixed |
| NW-3 | HIGH | Import | Preview shows "— —" for non-equity rows (CD/option/bond) — no Value column; can't verify amount | add Value column (`money2(h.value)`) + a total | ✅ fixed |
| NW-4 | MED | All | Center-alignment overused (32 on NetWorth) — multi-line instructional/insight copy reads poorly centered | left-align body/insight copy; keep only hero numbers centered | ✅ fixed |
| NW-5 | MED | Perf/NW/Bonds | Overflow/truncation: Perf return cols fixed 62px no autosize; ticker+name no numberOfLines; sumVal; NW legend value at Larger text; Bonds raw ISO date | add adjustsFontSizeToFit/numberOfLines; humanDate on bonds | ✅ fixed |
| NW-6 | MED | All | Tap targets < 44px — "+ Add" text links, period pills, chips, ✕/Done buttons | hitSlop / minHeight 44 | ✅ fixed |
| NW-7 | MED | All | Missing a11y labels on interactive rows (account/bond/holding rows, add links) — inconsistent | accessibilityRole+label before the onPress arrow | ✅ fixed |
| NW-8 | MED | NetWorth | Donut: ring = assets, center number = net worth (debts a separate red row) — subtly confusing | one caption clause: "ring = assets; debts are the red line" | ✅ fixed |
| NW-9 | MED | NetWorth | Insight uses account axis ("Taxable accounts is your largest holding") not class | switch the stat to largest asset class | ✅ fixed |
| NW-10 | MED | Alternatives | Card hides user's name (label) when institution set; delete has no confirm (sales do) | show label as title; Alert-confirm before delete | ✅ fixed |
| NW-11 | MED | Alts/Import | Traded options: spec=Alternatives, importer classifies put/call→alternatives, but no "options" kind → degrade to "Other" | add `options` kind; import sub-kind from put/call | ✅ fixed |
| NW-12 | LOW | NetWorth | Redundant per-section "+ Add" (all open the same picker); no investable/nest-egg stat | smart per-section add (jump to form); add investable/nest-egg line | ✅ fixed |
| NW-13 | LOW | Perf | 4 equal-weight links bury primary "Add holding"; "BENCH" jargon + VS BENCH missing % | make Add holding primary; rename BENCH; add % | ✅ fixed |
| NW-14 | LOW | Bonds | Cards not sorted by maturity though "NEXT MATURITY" is the headline metric | sort by maturity ascending | ✅ fixed |
| NW-15 | LOW | Module | Quick-add row has no obvious "tap to classify" affordance (only the donut nudge) | per-row "Set type" hint for Unclassified | ✅ fixed |
| NW-16 | LOW | Forms | Add-specifics links missing on Stocks/Bonds/Alts forms (route to detail screens) | "＋ Add specific holdings →" link | ✅ fixed |

**Resolution 2026-06-28:** all 16 findings fixed. NW-1/NW-11 (domain) committed 91bdb1b; the per-screen
format/a11y/design sweep (NW-2..NW-10, NW-12..NW-16) across NetWorth, Performance, Bonds, Alternatives,
Import in the follow-up commit. Gates green: tsc clean · 761 jest tests pass · UI gate ✓ · a11y ratchet ✓.
Pending: device verification on the connected iPhone (hot-reload).

Source: per-screen reviewer findings 2026-06-28.
