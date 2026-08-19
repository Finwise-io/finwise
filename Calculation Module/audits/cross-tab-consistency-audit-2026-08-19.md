# Cross-tab consistency audit — 2026-08-19

**Written by an independent review agent, preserved verbatim. Not edited by Claude Code.**
Scope: every column-K commitment on "1. Metrics" vs "2. Engines", "5. Transaction taxonomy",
"8. Cost basis", "9. Snapshot & honesty" and the engine source files.
Top claims independently re-verified against the code before this was filed (items 31, 32, 36, 54).

**Totals: 54 discrepancies — 28 money-wrong · 9 label-wrong · 17 merely-unstated.**

Three largest single exposures:
1. **events.ts:56 — the totals vocabulary has no "cost basis" and no "realised gain" member.**
   Nine taxonomy rows are unrepresentable in the engine by construction (breaks the agreed
   reinvestment-increases-basis rule, return-of-capital-reduces-basis, splits, option expiry P/L).
2. **An outbound in-kind transfer books as a CONTRIBUTION** — the pattern
   `/exchange (received in|delivered out)|…/` maps "delivered out" to SECURITIES_IN (direction IN,
   touches contributions). The same phantom-contribution class the module was built to end,
   rebuilt into the replacement.
3. **ledger.ts totalOf sums absolute values, and money.ts lets a stated direction override the
   received sign** — a reversal adds instead of cancelling. The $2,387 class, rebuilt into the
   replacement.

Also: 8 engines carry OPPOSITE statuses on the two tabs (Metrics says DEFECT, Engines says
PINNED/no-fix), and two tabs give two different flow thresholds (1% vs 10%) for the same decision.

---

(full 54-item report appended below from the audit transcript)

## A. Metrics column K commitments that appear nowhere downstream (or are contradicted)

1. K14 / taxonomy G21 vs events.ts:78 — reinvested dividend must increase cost basis; REINVEST_PURCHASE touches ['units'] only; Engines rows 64/136 silent. MONEY-WRONG.
2. K6(2) — window-boundary convention (is a T-10 flow inside or outside) stated nowhere. UNSTATED.
3. K6(3)+K7(2) vs snapshots.ts — "positions plus cash plus accrued interest"; snapshot types carry no accrued-interest field; probe books $1,289 as an accepted residual. MONEY-WRONG.
4. K15 vs tab 9 B15 — same decision, two thresholds (1% vs 10%), neither superseding. MONEY-WRONG.
5. K16 — Simple Dietz as documented fallback: no row anywhere. UNSTATED.
6. K17(1) — flow-timing convention w=(D−d)/D end-of-day: stated nowhere downstream. UNSTATED.
7. K19 vs Engines r112 — "flows changing direction more than once → refuse" missing from PERSONAL_RETURN's four refusals; row PINNED. MONEY-WRONG.
8. K20 vs Engines r144 — cumulative return must add CASH distributions only + state lookback; row is gain÷paid, PINNED, while Metrics says DEFECT. MONEY-WRONG.
9. K21 — CAGR input must be Modified Dietz, actual calendar days: nowhere. UNSTATED.
10. K26(2) vs rows 37/97 — suppress current yield for zero-coupon/discount, show YTM instead: nowhere; a T-bill reads as paying nothing. MONEY-WRONG.
11. K27 — day-count convention + coupon-reinvestment assumption + bill labelling: no work item. UNSTATED.
12. K29 vs rows 60/59 — weight on absolute exposure, suppress chart on negative positions; row 59 floors negative cash to zero. LABEL-WRONG.
13. K30+K60 vs r60 — weights at BMV, gap shown as "rest of the change", tolerance assertion; row uses today's value, PINNED vs DEFECT. MONEY-WRONG.
14. K31 — "stop using the word drift until a target exists": nowhere. LABEL-WRONG.
15. K32 vs r70 — show two returns side by side, print NO difference; row blends and prints beat-by. MONEY-WRONG.
16. K33 — label "fees we can see": nowhere. UNSTATED.
17. K36 — debt sign convention stated once: nowhere. UNSTATED.
18. K39 — retirement money investable but not freely spendable before age rules: only in K39. LABEL-WRONG.
19. K41 — nest egg must show what it is made of: nowhere. UNSTATED.
20. K42 vs r130 — mark deposit/withdrawal days on the trend line: not carried. UNSTATED.
21. K50 + tab 10 C15 vs all engine code — decimal end-to-end; everything is binary floating point; untracked. MONEY-WRONG.
22. K47+K54 vs rows 57/63 — suppress tax display when tax type unknown; name the four assumptions; 3.8% surcharge: none present. MONEY-WRONG.
23. K55 — copy line "no daily price exists for this holding": only in K55. LABEL-WRONG.
24. K56 vs r37 — coupon parse failure must be UNKNOWN, never zero: no rule anywhere. MONEY-WRONG.
25. K57 vs r14 — record per source whether option price/cost is per share or per contract + standing assertion vs broker total: hard-coded, verified once by hand. UNSTATED.
26. K59 vs r71 — account return = Modified Dietz incl. cash, weight at beginning value; row weights today's money, PINNED vs DEFECT. MONEY-WRONG.
27. K61 — wording "your largest single investment" + fund note: not carried. LABEL-WRONG.
28. K62 vs r115 + probe — rebase rule/deposit marks; probe PINS current rebase as correct. MONEY-WRONG.
29. K63 — look-back must show a range, not one clean number: nowhere. UNSTATED.
30. K10 vs r76 — household-wide netting; engine cancels only within the measured set, PINNED; no work item. MONEY-WRONG.

## B. Taxonomy tab vs events.ts / ledger.ts / money.ts

31. ROOT CAUSE — events.ts:56 totals vocabulary lacks "cost basis" and "realised gain"; 9 taxonomy rows unrepresentable by construction. MONEY-WRONG (class-level).
32. Taxonomy r9 vs events.ts:139 — securities OUT maps to SECURITIES_IN (direction IN, touches contributions): an outbound share transfer books as a CONTRIBUTION. MONEY-WRONG.
33. Taxonomy r8 vs same mapping — SnapTrade sends EXTERNAL_ASSET_TRANSFER_IN with underscores; pattern requires spaces → UNKNOWN; contributions silently missing on that road. MONEY-WRONG.
34. Rows 20/23 vs events.ts:112 — OFX-style single-row REINVEST (income+purchase in one) maps wholly to REINVEST_PURCHASE: the income leg is counted NOWHERE on single-row rails; a test pins it. MONEY-WRONG.
35. Row 22 vs ledger.ts:33 — capital-gain distribution labelled a dividend downstream. LABEL-WRONG.
36. Row 24 + rule 2 vs money.ts:39 + ledger.ts:165 — stated direction overrides received sign, and totals sum ABSOLUTE values: reversals add instead of cancelling. The $2,387 class rebuilt. MONEY-WRONG.
37. Row 25 vs events.ts:80 + ledger.ts:36 — fund return-of-capital must reduce basis, leave units; engine reduces units via SELL, touches no basis. "The most damaging misfile for this audience." MONEY-WRONG.
38. Row 26 vs events.ts:136 — accrued interest PAID at purchase matches /interest/ → INCOME received. An outgoing payment books as income. MONEY-WRONG.
39. Rows 35–37 vs events.ts:89 + ledger.ts:42 — splits/mergers: CORPORATE_ACTION claims units but the ledger maps it to ADJUSTMENT (touches nothing); events.ts and ledger.ts contradict each other. MONEY-WRONG.
40. Row 38 — cash in lieu: no pattern matches → UNKNOWN; the engine's own note says it "must be recorded"; nothing records it. MONEY-WRONG (small).
41. Row 40 vs events.ts:93 — option expiry must realise the loss of full basis (or gain of premium); expiry touches units only → no P/L ever appears. MONEY-WRONG.
42. Rows 41–43 vs events.ts:91 + ledger.ts:43 — one OPTION_EXERCISE for share- and cash-settled, mapped to ADJUSTMENT; the cash enters no total while Engines r13 promises it is "never dropped". MONEY-WRONG.
43. Row 45 — staking income event committed, does not exist (quarantines as UNKNOWN). UNSTATED.
44. Rule 3(b) — alert on first unknown word within a day: no alert exists. UNSTATED.
45. Rule 4(i) — full identity assertion (beginning+flows+market+income−costs=ending within a cent): not built; only reconcile-to-broker exists. UNSTATED.

## C. Engines-tab statuses vs Metrics

46. EIGHT engines carry opposite statuses on the two tabs (Metrics DEFECT vs Engines PINNED/no-fix): PERSONAL_FLOWS, HOLDING_TOTAL_ROI, WHAT_DROVE_THE_RETURN, PORTFOLIO_RETURN, CAP_GAINS_TAX/RATES, TOTAL_CASH, option_holdings, ALLOCATION_BY_CLASS. A reader cannot tell which tab to believe. LABEL-WRONG.
47. r46 NW_CHANGE_PCT fix adopts a chosen start date but not K15's flows test. UNSTATED.
48. r119 ACCOUNT_SPLIT (the tab's CHECKED row) vs K46 — a negative leftover must refuse to draw; the engine silently absorbs it into the largest holding. MONEY-WRONG.

## D. Cost-basis tab vs engines

49. Tab 8 B10 + tab 9 B8 vs snapshots.ts — snapshot types lack cost basis, basis-definition tag, accrued interest, flows-by-bucket, unmapped-event count, last-sync time: the store was built without the fields its own spec tab commits to. UNSTATED.
50. Tab 8 B12 — none of the four basis adjustments (reinvest +, ROC −, split unchanged, in-kind carries) exists in code. MONEY-WRONG.
51. Tab 8 F7 vs J53/r62 — with only an average basis, show NO long/short split rather than a guessed one; today one synthetic lot feeds a guessed split. MONEY-WRONG.
52. Tab 8 F8 — the sentence "It does not include trading costs, so your real gain is likely smaller" is missing everywhere. LABEL-WRONG.
53. Tab 8 B11 — rank bases, fall back downward only: not implemented or tracked. UNSTATED.
54. Tab 9 B12 vs snapshots.ts:102 — restatement must write a NEW versioned row and keep the old; record() destroys the earlier row, contradicting the file's own header promise. LABEL-WRONG.

## Counts
Money-wrong 28 · Label-wrong 9 · Merely-unstated 17.
