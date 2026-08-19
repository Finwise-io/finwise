# Open questions for the founder — all five section files, deduplicated

Built 2026-08-19 by the cross-section consistency pass. Every entry under "## Open questions for the founder" in section-A.md through section-E.md appears here exactly once. The tag on each question names the section file(s) and the question's number inside that file — e.g. [A-1] is section-A.md open question 1 — so an in-file reference like "open question 5" still resolves inside its own file. Where two or more files asked the same decision, the entries are merged into one question carrying every tag.

Coverage line: 62 of 62 per-file entries carried (A 12 · B 14 · C 11 · D 13 · E 12) · 6 merged as duplicates · 56 distinct questions below.

## Merged across sections (the same decision asked more than once)

1. [A-1 · B-1 · D-11 · E-3] Flow thresholds — two numbers live for the same short-window gate (1% of beginning value at master tab 1 K15; 10% at master tab 9 B15; audit item 4), and neither supersedes. B and E read them as two different tiers doing two different jobs (1% = when simple return may stand in for Modified Dietz; 10% = when even the Dietz rate refuses); A and D ask for one number to supersede. Confirm the two-named-tiers reading, or pick one number — either way it lives in the one named place that holds the window conventions.
2. [A-2 · B-10] Money-market fund, one rule enforced on every screen: the class itself is decided (a money-market fund is a HOLDING that pays income; Cash means the broker's uninvested balance only — the 2026-08-04 rule in the classifier, KIND_TO_CLASS, src/domain/assets/index.ts:174–185; master tab 1 rows 7 and 37 column K). Two surfaces still disobey it: the grouping that files the fund under Cash, and the account screen that subtracts it from cash AND drops it from holdings, leaving that total short (audit item 46). Confirm the enforcement — those surfaces change to read the one classifier — so Cash drag, Income earned and the account screens all read the same dollars.
3. [C-7 · E-10] Window boundary convention: the convention itself is agreed at master tab 1 K6 (the window opens after the start day's close, so a flow dated on the start day is outside; corollary for spending: start-day rows outside, last-day rows inside). Confirm it as the app-wide rule — portfolio and spending windows alike — so it lives in one tested module (audit item 2 is that nothing downstream carries it yet).
4. [D-8 · E-9] Survivor inputs: capture each spouse's Social Security check and each pension's survivor percentage (0/50/75/100%, printed on the plan election form) — in scope for the next build, or does the survivor/stress view keep the words-only treatment for now? If a v1 slice ships, is it Social-Security-only (larger cheque survives, single filing brackets) with pensions shown as unknown?
5. [E-4 · D-8 rider] Guaranteed income streams: may each stream carry a fixed-versus-inflation-adjusting flag at capture (Social Security = linked; most pensions = flat)? The run today raises ALL guaranteed income with inflation (src/domain/retirement/index.ts:234), which grants a flat pension a raise it will never pay — roughly two-fold over 30 years at 2.5%.

## Section A — Net worth and the balance sheet

6. [A-3] Staleness tolerance for property and vehicles: the six-month account rule fits neither — is 12 months the re-confirm prompt for a home, and what for vehicles?
7. [A-4] Liquidity tags: accept class-based default tags (visible and editable per account), or ask the person to set liquidity when an account is added?
8. [A-5] Liquid net worth under the penalty ages: exclude pre-penalty retirement money entirely (the CFA recommendation, one clean line), or include it net of penalty and assumed tax with a label?
9. [A-6] Home downsizing line: may the app ask for home purchase basis, improvements, and filing status to compute the sale-exclusion tax line, or does the line stay at gross equity less 6–8% selling costs?
10. [A-7] Employer-stock flag: add a user-set "this is my employer" flag on holdings so Concentration P2 can exist, or drop the employer-stock view until then?
11. [A-8] Institution insurance limits: show SIPC/FDIC limits as maintained reference data next to one-institution risk, or keep statutory figures out of the app entirely?
12. [A-9] Embedded-tax assumptions panel: one place holding the assumed income rate, capital-gains rate, the 3.8% surcharge threshold flag, and state tax — who sets the defaults, and may the person edit them?
13. [A-10] Debt-payments-to-income for retirees: confirm the denominator = guaranteed income plus PLANNED sustainable withdrawal (never actual withdrawals taken).
14. [A-11] Trend line marks: deposits and withdrawals are agreed (master tab 1 row 42 column K) — confirm hand-entry revaluation days get the same mark, so a retyped house never reads as a market move.
15. [A-12] Unclassified visibility threshold: at what share of total assets does the Unclassified bucket get flagged loudly (the quiet-4% trap — crosswalk tab 9 row 7; master tab 1 row 38 column K) — 1%?

## Section B — Portfolio performance

16. [B-2] Which return is the HEADLINE on the Performance screen: the money-weighted figure (how your money did) with the time-weighted one behind the compare-to-index view, or both side by side always?
17. [B-3] One purchase decision gates four metrics — Forward income, fund-internal Fees, Look-through, and hedged-fund detection: buy a security-master data feed, or ship all four as absent with the honest sentences written in their cells?
18. [B-4] Until the security-master decision (question 17) is made, may Forward income show the trailing-12-months stand-in labelled "if the last year repeats", or should the metric stay absent entirely?
19. [B-5] Allocation target capture: may the app ask for a broad-shape target (shares/bonds/cash to the nearest 5 points) so "drift" can exist, and at what moment (onboarding vs first visit to the allocation screen)?
20. [B-6] Risk display for this audience: may standard deviation, beta and Sharpe stay off the screen in v1, showing only worst-fall-and-recovery-time and typical-swing-in-dollars?
21. [B-7] Sequence-of-returns buffer default: 2 or 3 years of (essential spend − guaranteed income) — a planning stance, not arithmetic.
22. [B-8] Wash-sale stance: is the standing sentence "we can't check accounts we can't see, including a spouse's or an IRA elsewhere" sufficient, or should the harvest insight be suppressed entirely for households with known unconnected accounts?
23. [B-9] The harvest SAVING figure needs the person's marginal rate — ask one bracket question in-app, or show only the loss in dollars and never the saving?
24. [B-11] Where does the person declare the deliberate cash reserve (emergency fund, near-term spending) that Cash drag P3 subtracts — a plan-tab entry or a per-account flag?
25. [B-12] Non-USD holdings: in scope for v1 or refused with a named limitation — and if in scope, which FX rate source?
26. [B-13] Sequence-of-returns withdrawal input: default to the plan's essential spending or full planned spending?
27. [B-14] Sensitivity-to-market index (Risk measures P3): one household index for beta, or the per-holding benchmark blend (BENCHMARK_RETURN_BLENDED, master 2 r70)? One household index is simpler to say honestly.

## Section C — Budget, spending and cash flow

28. [C-1] Budget rollover (Budget vs actual P3): should an underspent category's leftover roll into next month at all, and if so — capped at one month, and does OVERspend roll too?
29. [C-2] Savings rate: does debt principal paydown count as saving? Today the surplus is measured after debt and principal is excluded from "saved" — defensible either way, but it must be one written rule on screen.
30. [C-3] Essential floor (Fixed vs variable P1-D): do non-monthly essential bills (insurance, property tax) join the monthly floor at one-twelfth, or stay out as dated bills shown beside it? Today they are excluded, which overstates essentials-runway in the months they land.
31. [C-4] Age of money: ship it at all once a bank feed exists, or keep the essentials runway as the app's single buffer metric?
32. [C-5] Savings rate headline: the taxonomy spec (§6, 2026-06-22) names the cash rate over take-home as primary. Does that stand for the 55–70 audience — where the total rate over gross is the one the 15% retirement-readiness benchmark speaks to — or does the headline flip, with the other one tap away?
33. [C-6] Safe to spend: when a missed bill surfaces and the number drops, does the screen retract loudly (a banner naming the change) or correct quietly with a changed as-of date?
34. [C-8] When the bank/card feed (Plaid) arrives: do measured transactions REPLACE the hand-logged ledger for overlapping months, or merge with per-row confirmation? Merging without a rule re-creates the double-count class this module was built to end.
35. [C-9] Pace comparisons (Budget vs actual P2): is the proposed rule — fixed bills by due date + flexible pro-rata — the founder's intended meaning of "on track mid-month", before it is built?
36. [C-10] Interest and fees total: may the three friction lines be added into one headline when one part is estimated and another measured, or do they stay three labelled lines until all are measured?
37. [C-11] Savings rate denominator: the spine (row 49) says employer money goes in BOTH the numerator and gross income; the taxonomy spec §6 and the built engine put it in the numerator only, which flatters the rate. The spine's finance is right — approve the one-line spec amendment and the engine change together, so the two documents stop disagreeing.

## Section D — Retirement and planning

38. [D-1] Should "withdrawals" and "RMDs" come out of the typed retirement-income list (tab 2 R106), since counting them as guaranteed income lets the pot pay itself in the odds and inflates the floor?
39. [D-2] RMD start age: adopt the birth-year rule (73 for those born before 1960, 75 for 1960 and later) in place of the hard-coded 73 (two copies: decumulation/index.ts:103 and retirement/index.ts:147), and exempt Roth 401(k)s?
40. [D-3] Social Security factors: accept the age-67 anchor as a stated approximation for clients born 1956–1959, or add the full-retirement-age table by birth year?
41. [D-4] When a legacy target is held back from the pot, should the estate screen show the simulation's leftover PLUS the held-back target (and should that slice grow), or keep the two apart with a note?
42. [D-5] Once measured withdrawals exist, which figure owns the words "current withdrawal rate" — the plan ((spend − guaranteed) ÷ pot, decumulation/index.ts:33-43), the measured trailing-12 draw, or both, labelled?
43. [D-6] The draw-order tax figures assume half of taxable money is gain when no cost detail exists (decumulation/index.ts:181) — print the assumption on the sheet, or suppress the taxes column until real cost figures arrive?
44. [D-7] Taxable share of Social Security: build the combined-income rule, or keep it as a named question for the tax preparer with no number shown?
45. [D-9] Part-time work: build a wage-that-steps-down input, or keep the two-full-stop-runs bracket as the honest answer?
46. [D-10] Funded ratio: build it — which requires a discount-rate choice the founder must approve and the screen must show — or keep the odds as the single on-track figure?
47. [D-12] May the "yearly cost until a stated year" mechanism built for loan payments (retirement/index.ts:82-97) carry pre-65 health premiums, or do premiums get their own input?
48. [D-13] First-year RMD deferral to 1 April: model the two-RMDs-in-one-tax-year case, or state "we show the calendar-year amount" on screen?

## Section E — Cross-cutting rules

49. [E-1] Real-vs-nominal default: should every projection screen lead with today's-money and offer future dollars on tap, or the reverse — one rule for all screens?
50. [E-2] May the person's own basket inflation rate (once 12 months of their categorised spending exist) replace the headline rate in their projections, or is it display-only beside the headline?
51. [E-5] The embedded-tax note on deferred balances: one stated flat rate, or the person's own projected marginal rate from the tax engine — which shows first?
52. [E-6] Tab 1 K54 says state tax is missing from the capital-gains figure while tab 2 row 57 says the state rate is included — which is true of the shipped code decides what the assumptions label must say, and the two tabs need one answer.
53. [E-7] Ownership: add an owner tag (you / partner / joint) to every account now — one question per account — or defer the per-person and survivor views entirely?
54. [E-8] Joint accounts in a per-person view: a third "joint" column at full value (the CFA recommendation) or a 50/50 split into each person's total?
55. [E-11] Confidence display volume: the source-and-date line on every figure everywhere, or only where a figure is estimated or stale?
56. [E-12] Decimal arithmetic (audit item 21): accept cent-level wobble for v1 under a stated reconciliation tolerance, or gate fractional-share and crypto support until exact-decimal maths lands?
