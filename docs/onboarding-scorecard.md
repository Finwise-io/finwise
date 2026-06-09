# Onboarding Flow Evaluation + Scorecard (2026-06-09)

Goal (per user): test onboarding across the permutations of user choices, score each flow, find what's
missing/not working — *bottom line, would I be happy with the flow as the user?* Focus: **"I'm retired."**

## How the flow is generated (the permutation space)
`buildSteps(status, tracks, answers)` = `[status, goals, account, name]` → per selected **track**
(emitted in a fixed service order, de-duplicated) its required + optional steps → a recap after
S1–S4 → `summary`. The choice axes:
- **status** (4): employed / retired / partial / student → reorders goal sections + income sources.
- **tracks** (multi-select, ~7–10 valid per status) → which service blocks appear.
- **income sources** (multi-select, 6–10) → which income detail screens appear.
- **answers** → branch (e.g. employment adds 401k/bonus/RSU only for an ongoing job).

Literal full Cartesian = thousands of paths, so this evaluates **representative systematic coverage**:
the **retired flow in depth** + the structural classes of issue that recur across personas.

## Scorecard (0–5 each; "happy as a user" = weighted gut-check)
| Dimension | What it measures |
|---|---|
| **Curation / order** | Steps in a sensible sequence; relevant-first; no jarring jumps |
| **No duplication** | The same fact is never asked twice |
| **Persona fit** | Every step makes sense for this life stage |
| **Insight / value** | Each screen gives something back (a number, a callout), not just data entry |
| **Clarity** | Labels + recaps are self-explanatory; projections show how they're derived |
| **Completeness** | Captures what the downstream features actually need |
| **No dead ends** | No placeholder/"skip for now" screens that do nothing |

---

## "I'm retired" — select-all flow (tracks: spend, retire_dec, invest, property, networth, goals, debt, legacy, partner, family)

### Scores
| Dimension | Score | Notes |
|---|---|---|
| Curation / order | **2/5** | Long; spend's saving/cash-flow steps sit oddly before the retirement picture |
| **No duplication** | **1/5** | Retirement income asked **twice**; investable-assets total asked **twice** |
| **Persona fit** | **2/5** | "How much you'll save" (savings-rate) shown to a decumulating retiree |
| Insight / value | 3/5 | Good callouts on some steps; recap math unexplained |
| Clarity | **2/5** | "Will your money last → age 77" with no shown derivation |
| Completeness | **2/5** | No RMD logic; no income cadence (monthly/qtr/annual) |
| No dead ends | **2/5** | "Refine (optional) — Skip for now" is a no-op screen |
| **Would I be happy? → NO.** | | Duplicative, partly mis-targeted, and thin on retiree-specific substance |

### Confirmed issues (step-level)
| # | Issue | Steps involved | Severity |
|---|---|---|---|
| D1 | **Retirement income captured twice** — same `ri_*` fields on both screens | `income_retirement` ("What you receive each month": SS/pension/withdrawals/annuity) **and** `retirementIncomeSources` ("Monthly income from each source": + RMD + other) | **High** |
| D2 | **Investable-assets total captured twice** — same number, two keys | `currentSavingsPortfolio` ("Your savings & investments", `currentSavingsPortfolio`) **and** `investmentHoldings` ("Your investments", `investmentHoldings`) | **High** |
| P1 | **Savings-rate step shown to a retiree** (decumulating, not saving) | `savingsRateTarget` (SavingsEditor) — optional in `spend` | High |
| C1 | **"Will your money last?" projected age unexplained** (the "77") | `recap_retire` — computes pool ÷ net annual draw, no shown math | Med |
| X1 | **Dead placeholder** | `investRefine` → renders just "Skip for now." | Med |
| F1 | **No income cadence** — retirement income + dividends are monthly-only | `retirementIncomeSources`, `income_retirement`, `income_investment` | High (feature) |
| F2 | **No RMD logic** — age is captured (`birth`) but unused for RMDs | new — derive from birth year | High (feature) |
| S1 | "Total spending" then "spending by category" feels like spending asked twice | `monthlySpending` + `flexBuckets` | Low (by design; make breakdown clearly optional) |
| R1 | **Re-run setup keeps stale data** — Home still shows prior $ | `SettingsScreen.handleRerunOnboarding` only flips `onboardingComplete`; `onboardingProfile` + seeded net worth persist | **High** |

---

## Other personas (structural spot-check vs the same scorecard)
- **Employed (select-all):** cleaner — income sub-flow is well-curated (base salary table, bonus/RSU/401k gated to an ongoing job), good callouts. **Same D2 risk** (invest track's `investmentHoldings` vs retire_acc's `currentRetirementSavings` — different concepts, less duplicative) and **same X1** (`investRefine` dead step) and **R1** (re-run). Score ~3.5/5.
- **Student:** good (hourly + scholarships/loans with timing). `investRefine`/`networthIntro` dead-ish if invest/networth picked. Score ~3.5/5.
- **Partial:** inherits **both** retire_acc *and* retire_dec eligibility → risk of the **most** duplication (currentRetirementSavings + currentSavingsPortfolio + investmentHoldings all possible). Needs the same dedupe. Score ~2.5/5.

### Cross-cutting (all personas)
- **X1 dead `investRefine`** step — remove or make it real.
- **R1 re-run** — same for everyone.
- **D2 asset-total** — unify the "how much do you have invested" question across `currentRetirementSavings` / `currentSavingsPortfolio` / `investmentHoldings`.

---

## Prioritized fix plan (this session)
1. **Dedupe (D1, D2) + persona-fit (P1) + dead step (X1)** — engine curation: one retirement-income
   screen, one investable-assets screen, drop savings-rate + Refine for retired. *(biggest "not curated/duplicate" win)*
2. **F1 income cadence** (monthly / quarterly / annual) on retirement income + dividends.
3. **F2 RMD** — derive start age (73 if born ’51–’59, 75 if ’60+) from birth year; show an RMD insight.
4. **C1** — show the money-last derivation on the recap.
5. **R1 re-run** — make it a clean overwrite (clear onboarding answers + onboarding-seeded data; keep
   prefs, login, logged transactions) with an honest dialog.
