# Section D — Retirement and planning: metric use-case grid

Spine: crosswalk tab "9. Comprehensive Metrics", rows 60–75 (16 metrics, 51 purpose cases).
Written 2026-08-19 as the Certified Financial Advisor for a 55–70-year-old client. Every cell is a
calculation or a named refusal; a figure that cannot be supported is absent, never invented.
"Refuse" always means: show the dollars we do know, then one plain reason, never a blank (the spine's Comprehensive Metrics tab (crosswalk-Aug19) B16–B17). Every
claim about what the app does today cites a file or a master-tab cell; unverified claims say
"(to verify)". Citations: "tab N" = MoneyKeel-calculation-master-v1.xlsx; K-numbers = tab 1 column K;
R-numbers = the Engines tab rows; "audit item N" = audits/cross-tab-consistency-audit-2026-08-19.md.

Coverage line: 16 of 16 Section D metrics (spine rows 60–75) · 51 of 51 purpose cases · 306 of 306 condition cells — every cell a calculation, a named refusal, an argued N/A, or a pointer to the cell that carries the rule.

---

### Retirement pot
What the person is really asking: What is earmarked for retirement?

#### P1 — Today's figure

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | An account has no value — never priced, or added with a blank balance | Leave it out of the pot and say so by name: "Vanguard IRA not counted — no value yet." Never a silent zero, which shrinks the pot and reads as a loss (K52). Fix: type a balance or connect the account. A missing earmark share is NOT missing — the stated default applies (R121: everything counts except the home you live in and the car you drive; a 529 is 0%). |
| B degraded | A hand-entered balance is months old | Count it, and carry the oldest ingredient's date on the pot line — "includes Chase IRA as you entered it on 3 March" (K44). The pot must also show what it is made of — each account, at what share — or the person cannot correct the one that is wrong (K41; audit item 19). |
| C shape-per-road | The balance field differs by door: connected = broker's stated total, imported = the file's figure, by hand = what was typed (all three land in the one gathered list every surface reads — R137; the file door is R131) | One earmark rule on every door (R140: the saved share beats the default, clamped 0–100). The same account arriving by a different door must give the same pot — a test worth pinning today. |
| D time-bounded | "What was my pot three months ago?" | Refuse until a per-account daily record covers that date: the app has only ever kept one household number per day, which cannot be split back into accounts (tab 9 B6; audit item 49). The new record starts the day it is first kept (engines/snapshots.ts:12) — screen says "history starts 19 Aug 2026"; a rebuilt past is never drawn as a measured one (tab 9 B13). |
| E related events | Money moves between two of the person's own accounts | The pot changes only by the earmark difference between the two sides; a 401(k)-to-IRA rollover (both 100%) changes nothing. Shares moved out to another firm the person still owns must not shrink the pot — and must not book as a contribution, which is what the event table does today (audit item 32; engines/events.ts:139-140). |
| F account-type / confidence | Tax treatment is typed, never sent (R33) | Show the pot split by how it is taxed (R151): a $1,000,000 pre-tax pot and a $1,000,000 Roth pot are not the same money. An unconfirmed tax type silently lands in "taxable" today (src/domain/decumulation/index.ts:19) — say "treated as taxable until you confirm". And carry the label: retirement money is investable but not freely spendable before the age rules, and part of it is owed in tax (K39; audit item 18). |

#### P2 — Progress

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No target exists | No progress bar — a bar against a number that does not exist is decoration. Two doors, in the founder's order: the target is THEIRS to type (planning/target.ts founder correction, 2026-08-14); while the field is blank we may offer the 80%-odds pot as a suggestion, labelled as ours (PlanHubScreen.tsx:140). |
| B degraded | The target rests on stated spending | Compute, label the base — and name WHICH dial this is, because the two progress reads use different bases on purpose (planning/target.ts founder correction). Against THEIR typed target: today's money ÷ their number, a plain division, never engine output (targetPct). Against OUR suggested target: projected-at-retirement ÷ the 80%-odds pot, BOTH measured at retirement — today's pile against a day-one-of-retirement number reads 48% for someone genuinely 78% of the way. Never mix the two bases on one bar. |
| C shape-per-road | same as P1-C | same as P1-C |
| D time-bounded | "Did my pot grow this quarter?" | A pot line rises with a deposit exactly like a good market month. Mark deposit and withdrawal days on the line, or split the quarter into "you added $X" and "markets moved $Y" — never one blended climb (K42; audit item 20). Without per-account history, show the dollars in and out from the ledger and refuse the market split. |
| E related events | A broker restates a past value | Write a new dated row and keep the old (tab 9 B12). Today record() drops the earlier row for the same day (engines/snapshots.ts:99-104; audit item 54), so last month's progress can change with no trace and no figure can be reproduced. |
| F account-type / confidence | Progress counted in pre-tax dollars | Overstates. At a 22% rate, a $1,000,000 traditional IRA spends like $780,000. Keep the bar in gross dollars and put the embedded-tax sentence under it — a corrected bar the person cannot trace is worse than a noted one. |

#### P3 — Plan input

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Age, spending, or the pot itself | The odds are never computed on a guess: no age → no answer (R159); nothing earmarked → the door lists exactly what is missing (R157; selectWillItLast gates on pot > 0, willItLast.ts:126). Until then the Sample sentence, the word Sample first (R80). |
| B degraded | The pot is built on old typed balances | The odds inherit the oldest date; carry it in the caption ("using balances as of 3 March"). Stated, not suppressed — the person can judge their own figure (K44). |
| C shape-per-road | same as P1-C | same as P1-C |
| D time-bounded | — | Not applicable, argued: the plan takes today's pot by definition — the simulation supplies every future year itself, and feeding it a past pot would count history twice. |
| E related events | A legacy target exists | It comes off the pot before the odds run — always, including while still working (willItLast.ts:85-91, founder fix 2026-08-18). The engines tab still carries the pre-fix defect note (R159) — refresh it. |
| F account-type / confidence | Pre-tax share and its tax ride into the odds | The run charges tax on forced pre-tax withdrawals (willItLast.ts:92-98, from R151's split). Unconfirmed tax types shrink the pre-tax share and flatter the odds (decumulation/index.ts:19) — when the unconfirmed share is material, put "confirm how these accounts are taxed" beside the odds. |

---

### Target number
What the person is really asking: How much do I need?

#### P1 — Rule of thumb

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No spending answer | No target — 25 × nothing is not a number. Door: "tell us what a month costs." Never substitute a national average silently. |
| B degraded | Spending stated, not measured | Compute and label the base: "sized from the $5,500 a month you told us." When measured spending exists and disagrees (the ledger says $7,000), show both and ask which to plan on — never pick silently. |
| C shape-per-road | Spending arrives three ways: one typed figure, category answers, or measured from transactions | The app already takes the larger of typed-versus-categories (R98) — a stated rule; keep it, and name the source under the target. |
| D time-bounded | The rule has no age in it | That is its flaw: 25× assumes roughly 30 years. For a 57-year-old planning to 97 it understates. Date the target to the retirement age, or lead with the suggested target, which is solved at the retirement date (targetAtRetirement) — remembering it is only a suggestion: the moment the person types their own number, ours stops existing (planning/target.ts founder correction). |
| E related events | One-off big costs | A $60,000 roof is not "annual spending × 25" — add named one-time costs on top, dollar for dollar, in their year. The simulation already takes them (retirement/index.ts one_off_costs). |
| F account-type / confidence | The pot that meets the target is partly pre-tax | The same spending needs MORE pre-tax dollars: a $2,000,000 need met from a traditional IRA at 22% takes about $2,560,000. Say what the 25× rule ignores; the derived target charges the tax inside the run (willItLast.ts rmd_tax_rate). |

#### P2 — From my own spending

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No transaction history | Fall back to the stated figure and say so — that is P1, honestly relabelled. |
| B degraded | Only 3 months of history | Misses the lumpy months — annual premiums, property tax, gifts. Use 12 months or label the window; never scale a quiet quarter by four. |
| C shape-per-road | Card spending arrives twice — the purchase and the card payment | Exclude transfers and card payments from the spending base (spine row 44) or the target is sized off double-counted spending. |
| D time-bounded | Trailing 12 months | The window rule is already agreed, not open: the window opens AFTER the start day's close, so a flow dated on the start day is OUTSIDE the window (the Metrics tab K6, convention 2; audit item 2 — carried downstream only by these grids until it lives in one tested module). Carry it here rather than re-deciding it. |
| E related events | One-offs inside the year | Take flagged one-offs out of the base and show them separately (spine row 44) — then add them back as dated big costs where they will recur in retirement. |
| F account-type / confidence | Essential versus total | Only the person can say which spending is essential (spine row 46). Target on total spending; show the essential-only target beside it as the floor. |

#### P3 — Gap-funded

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No guaranteed income captured | The gap defaults to full spending — the larger, frightening number. Show it, and lead with the fix: "add your Social Security and this shrinks" (the spine's own trap: the raw 25× number stops people planning; the gap-funded one is the honest lead). |
| B degraded | The Social Security figure is the statement amount | That is the age-67 check. Claiming at 62 pays about 70% of it (R85). The gap must use the check the chosen claim age pays — the odds already do (willItLast.ts:71-73) — or the target is understated. |
| C shape-per-road | Guaranteed income only ever arrives typed — no institution sends it (R106) | Ask the person to read it off their SSA or pension statement, and name that document on screen so they can re-check it. |
| D time-bounded | Income starts later than retirement | Retire at 60, Social Security at 67: seven bridge years carry FULL spending. A flat (spending − income) × 25 misses this; the simulation charges the bridge correctly (guaranteed_start_age, retirement/index.ts:71). Use the simulation, or state "assumes the income is already flowing". |
| E related events | The typed income list includes "withdrawals" and "RMDs" (R106) | Exclude both from the gap: a portfolio withdrawal is the pot paying itself, not outside income. Counting it shrinks the gap with the pot's own money. (Open question 1.) |
| F account-type / confidence | Fixed versus inflation-adjusted income | Social Security rises with inflation; most pensions do not. A fixed $2,000 pension buys about half as much in 24 years at 3%. The gap at 65 is not the gap at 85 — state which one the target uses. |

---

### Probability of success
What the person is really asking: Will my money last?

#### P1 — Simulated

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Age, spending, or pot | No odds — and never a confident zero (R160). The door lists exactly what is missing (R157); until then the Sample sentence, the word Sample first (R80). |
| B degraded | Return and swing come from our own table, not a measurement (R93) | Honest if stated. When the person typed a scenario return with nothing held, the swing falls back to return × 1.7, a last-resort rule (R86; willItLast.ts:19) — caption "assumed swing" in that state. |
| C shape-per-road | Pot balances arrive by three doors | same as Retirement pot P1-C — the odds must not move because the same account arrived by a different door. |
| D time-bounded | The horizon | The age is never left off: "82% of lasting to 92" and "to 100" are different plans (R77). A changed horizon is a re-run, both figures dated. |
| E related events | Big costs, payments that end, legacy, corrections | All in the run: one-time costs land in their year (retirement/index.ts one_off_costs), a mortgage that ends stops being charged and is never inflated (retirement/index.ts:82-97), the legacy target is off the pot from day one (willItLast.ts:85-91). Inputs re-run the same seeded 400 paths (seed 42, willItLast.ts:112) — the number moves only when an input moves, never on refresh. |
| F account-type / confidence | Tax awareness and precision honesty | The run charges tax on forced pre-tax withdrawals using the pre-tax share and the person's effective rate (willItLast.ts:92-98). Unconfirmed tax types deflate that share and flatter the odds (decumulation/index.ts:19). And 87% is not meaningfully different from 83% (spine trap) — show the band the engine already computes (willItLast.ts:134-139) rather than defending single points. |

#### P2 — Historical

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | A long historical return series for the person's mix | Not built — no historical-sequence engine on tab 2 (checked 2026-08-19). Show nothing labelled "historical", and never caption the simulated odds as history. |
| B degraded | Index history stands in for the person's actual funds | If built, say so — "your mix approximated by index history since 1926". Most of the person's own funds did not exist for the period. |
| C shape-per-road | same as P1-C for the plan inputs | The history series itself has one road — our market-data feed — so no per-road shape arises for it. |
| D time-bounded | Rolling windows shorter than the plan's horizon | A 40-year plan tested on 30-year windows is not tested. Say the window and the count: "this plan held in 61 of 68 thirty-year stretches." |
| E related events | same as P1-E | same as P1-E |
| F account-type / confidence | same as P1-F | same as P1-F |

#### P3 — Under stress

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No baseline odds | Nothing to stress — a stress figure is a change from the base. Same door as P1-A. |
| B degraded | same as P1-B | same as P1-B |
| C shape-per-road | same as P1-C | same as P1-C |
| D time-bounded | The shock must carry its date | A crash in year one and the same crash in year ten are different plans (sequence risk, spine row 37). Name the shock's year on screen. |
| E related events | A care event | It is a named big cost with a year — the vehicle already exists (willItLast.ts:105). Run with and without. |
| F account-type / confidence | How the result is reported | In life terms, not a new percent: "spending would need to fall $700 a month" or "short at 84 instead of never" (spine row 73; R81). A survivor stress cannot be computed yet — no survivor logic exists in src/domain (checked 2026-08-19); say in words what changes (one Social Security check stops, filing turns single) and never fake the number. |

---

### Safe withdrawal rate
What the person is really asking: How much can I take out?

#### P1 — Rule of thumb

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No pot | Nothing to size. Same door as Probability of success P1-A. |
| B degraded | The 4% figure itself is the degraded input | It is a 30-year, US-history result (spine trap). For a 57-year-old with a 40-year horizon it overstates what is safe: quote it as "the classic 30-year rule" with the person's own horizon beside it, or do not quote it. |
| C shape-per-road | — | Not applicable, argued: the rule consumes one input — the pot — whose per-door handling is Retirement pot P1-C; the rule adds no input of its own that has a shape. |
| D time-bounded | 4% is defined on the STARTING balance, then raised with inflation | Not 4% of each year's balance — those are two different rules with different risk. State which one the screen means. |
| E related events | Big one-off costs sit outside the rule | A $40,000 roof is not a withdrawal-rate change; keep lumps as dated costs so the rate keeps meaning "ordinary living". |
| F account-type / confidence | The same 4% is different spending money by account type | From pre-tax, 4% gross funds about 3.1% net at a 22% rate; from Roth, 4% is 4%. Never present the rate as spendable dollars without the tax note — and no tax note at all where the account's tax type is unconfirmed (audit item 22's rule). |

#### P2 — Personalised

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Age, spending, pot | Same door as Probability of success P1-A. |
| B degraded | same as Probability of success P1-B | The solved rate inherits the assumed return and swing; caption them. |
| C shape-per-road | same as Retirement pot P1-C | same as Retirement pot P1-C |
| D time-bounded | Solved at the person's own horizon | The mechanics exist: the app already re-runs the plan at every spending step — each stepper position is a real run (planning/spendMore.ts:38-45) — and the target solver bisects the same simulation (planning/target.ts). The personalised safe spend = the largest monthly spend that holds the odds at the chosen threshold, quoted in dollars per month and dated. |
| E related events | same as Probability of success P1-E | same as Probability of success P1-E |
| F account-type / confidence | State the threshold and the tax | Say what the figure holds — 80% is the app's stated line, with its reason written above the constant (planning/target.ts TARGET_ODDS) — and quote dollars per month either after the tax the pot's mix implies, or gross with the note. |

#### P3 — Dynamic guardrails

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Not built — no guardrail engine exists (checked 2026-08-19) | Show nothing called "guardrails". The honest near substitute already ships: "can I spend more" is a live upper edge computed by real runs (spendMore.ts), not a band. |
| B degraded | The band's triggers are OUR choices | If built, name them on screen — "cut spending 10% after a year that ends 20% down". A guardrail nobody can state is a black box over the grocery budget. |
| C shape-per-road | — | Not applicable, argued: guardrails consume the same inputs as P2 and add none with a shape of their own. |
| D time-bounded | The band adjusts by rule at stated review dates | Say the review date. A guardrail checked "sometimes" is not a rule. |
| E related events | same as Probability of success P1-E | same as Probability of success P1-E |
| F account-type / confidence | A cut lands on spending AFTER guaranteed income | A 10% portfolio-draw cut is not a 10% lifestyle cut for someone whose floor covers 60% of spending — translate every cut into the lifestyle change in dollars per month. |

---

### Current withdrawal rate
What the person is really asking: How much am I actually taking?

#### P1 — This year

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | The portfolio value at the start of the 12 months | The app has only ever stored one household number per day (tab 9 B6; audit item 49), and the start value must be built the same way as the end — positions plus cash plus interest built up since the last coupon (K6/K7; audit item 3). Until the per-account record covers 12 months: refuse the RATE, show the DOLLARS — "you took $31,000 out over the last 12 months" (tab 9 B15-B16). The new store's valueOn() supplies the denominator once wired to screens (engines/snapshots.ts:110; no screen reads it yet — checked 2026-08-19). |
| B degraded | Today's on-screen figure is a PLAN, not a measurement | withdrawalPlan computes (planned spend − guaranteed income) ÷ pot (src/domain/decumulation/index.ts:33-43). Honest as a plan; it must never be captioned "current" or "actual". The measured rate needs the ledger's real withdrawals. Show both, labelled, once both exist. (Open question 5.) |
| C shape-per-road | Withdrawal words differ per road | A connection sends one word per event (R13); files use each institution's own words. Two live defects make the measured total wrong by construction: an in-kind transfer OUT matches a pattern that books it as money IN — a contribution (audit item 32; engines/events.ts:139-140) — and SnapTrade's EXTERNAL_ASSET_TRANSFER_IN arrives with underscores the pattern cannot see, so it lands UNKNOWN (audit item 33). Fix the word table before trusting a measured rate on any road. |
| D time-bounded | The 12-month window, and shorter ones | The boundary rule is agreed: the window opens AFTER the start day's close, so a flow dated on the start day is OUTSIDE the window (the Metrics tab K6, convention 2; audit item 2 — carried downstream only by these grids until it lives in one tested module) — so a withdrawal dated on the start day is outside. Carry it here. A 3-month figure is a pace, not a rate: "$8,000 in 3 months — about $32,000 a year at this pace", never a silent ×4. And the file carries two different flow thresholds for voiding a short-window figure (1% at K15 versus 10% at tab 9 B15 — audit item 4); one must supersede. (Open question 11.) |
| E related events | Sweeps, maturities, transfers, reversals, reinvestment | None is a withdrawal: a sweep is the account's own cash changing seats, a maturing T-bill is your own money back (engines/events.ts:80-84), and a transfer between the person's own accounts cancels across the household only when BOTH legs have arrived (K10; audit item 30). A reversal must cancel, not add — today a stated direction overrides the received sign and totals sum absolute values (audit item 36). This is the founder's $1.4m class: reinvestment lines, arriving with a negative sign, read as $424,818 of withdrawals from an account nothing left (crosswalk tab 1 J9) — and a T-bill rolling three times booked its principal back as new money on every roll (taxonomy row 29). A fund's return of capital stays out of withdrawals but is misfiled as a sale today (audit item 37) — right for this total, wrong for cost. And a reinvested dividend is neither a withdrawal nor a contribution: it is income ONCE, on its income leg; the purchase leg raises units AND cost basis, and is never a flow (the Metrics tab K14; the Transaction taxonomy tab rows 20–21; founder case 5; events.ts:78-79 rightly keeps it out of flows). |
| F account-type / confidence | Which "withdrawal" — left the pot, or left the household? | An RMD moved into a taxable brokerage left the IRA and counts for tax — rmdTakenThisYear sees it only when the IRA's leg books as a WITHDRAWAL row (decumulation/index.ts:161-166); booked as an internal transfer it counts in neither figure (how each road books this move — to verify). Either way it never left the household — the household rate must not read it as spending. Tax withheld DID leave: a $10,000 IRA distribution with $2,000 withheld is a $10,000 draw even though $8,000 landed as cash. Name which rate the screen shows. |

#### P2 — Trend

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Less than two years of ledger | No trend. Show the one year you have and the true first date of history per account (K48). |
| B degraded | History depth differs per account | One broker sends 24 months, another 12: a trend crossing the join reads as a spending change that never happened. Mark the join, or start the trend where every account is covered. |
| C shape-per-road | same as P1-C | same as P1-C |
| D time-bounded | Year over year on matching windows | Same months against same months; a calendar-year versus trailing-12 mismatch manufactures a trend. |
| E related events | Restated history | Keep the superseded rows (tab 9 B12; audit item 54) or last year's rate silently changes and the trend can never be reproduced. |
| F account-type / confidence | same as P1-F | same as P1-F |

#### P3 — Against the safe rate

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Either side missing | Show the side you have, never the gap alone: "we can show what you took; answer three questions and we can show what is safe." |
| B degraded | Plan against fact, mixed silently | Today both sides would be plans (P1-B). Label the nature of each side on the comparison itself. |
| C shape-per-road | same as P1-C | same as P1-C |
| D time-bounded | Same window on both sides | The safe rate is annual; compare against the trailing-12 figure, never against a hot quarter. |
| E related events | same as P1-E | same as P1-E |
| F account-type / confidence | Report the difference in dollars per month, not points | "$400 a month over" lands; "1.3 points over" does not (spine row 65). Guaranteed income is already on the safe-rate side (net withdrawal = spend − guaranteed, decumulation/index.ts:36) — never subtract it a second time from the measured side. |

---

### Portfolio longevity
What the person is really asking: What age does the money run out?

#### P1 — Central case

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Same three answers as the odds | Same door (R157). No guessed age, ever. |
| B degraded | A single "age 91" overstates what the model knows | It is the middle path's answer — caption it as the middle: "on the middle path, to about 91", with the range (P2) beside it. |
| C shape-per-road | same as Retirement pot P1-C | same as Retirement pot P1-C |
| D time-bounded | A plan that never runs out returns NOTHING, not zero | "Runs out at 0" is nonsense on a screen (R81). And the horizon rides the label: lasting "to 90" is not "forever". |
| E related events | Big costs, ending payments, legacy | same as Probability of success P1-E. |
| F account-type / confidence | The deterministic walk charges RMD tax when the pre-tax share is known (decumulation/index.ts:48-70) | Unconfirmed tax types understate the drag and push the age later, flatteringly. Same confirm-tax-type prompt as the odds. |

#### P2 — Range

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | The band needs the same run with the band switched on | (retirement/index.ts:78 with_band; BandPoint p10/p50/p90 at :105). Same door as P1-A. |
| B degraded | The band IS the honesty | 10th to 90th of simulated paths: "between 84 and never". Here the single clean number is the degraded form — the range is the answer (spine trap; K63's rule; audit item 29). |
| C shape-per-road | same as Retirement pot P1-C | same as Retirement pot P1-C |
| D time-bounded | same as P1-D | same as P1-D |
| E related events | same as Probability of success P1-E | same as Probability of success P1-E |
| F account-type / confidence | same as P1-F | same as P1-F |

#### P3 — Under stress

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No baseline | Nothing to stress. Same as Probability of success P3-A. |
| B degraded | same as P1-B | same as P1-B |
| C shape-per-road | same as Retirement pot P1-C | same as Retirement pot P1-C |
| D time-bounded | Date the shock | Crash-first and crash-later give different ages on the same average — same as Probability of success P3-D. |
| E related events | A care event as a dated big cost | same as Probability of success P3-E. |
| F account-type / confidence | Report the moved AGE | "Runs short at 84 instead of lasting" — an age moves people where a percent does not (R81; spine row 73). |

---

### Guaranteed income floor
What the person is really asking: What arrives no matter what?

#### P1 — Total

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Nothing captured | "Not captured yet" — never "you have $0 guaranteed income"; those are different sentences. Only a stated "not eligible" means zero (R159). Fix: type Social Security and pension from the statements. |
| B degraded | The Social Security figure is the age-67 statement amount | The floor must use the check the chosen claim age pays: claim at 62 → about 70% (R85). The odds already do this (willItLast.ts:71-73); every floor display must match them. |
| C shape-per-road | Typed only — no institution sends benefits (R106) | Name the source document and its date on screen ("from your SSA statement, as you entered it on …") so the person can re-check it. |
| D time-bounded | The floor is dated | Before the claim age it is $0 a month — a 60-year-old retiree's floor starts at 67, not at retirement. Show "from age 67" on the line. |
| E related events | "Withdrawals" and "RMDs" sit inside the typed income list (R106) | Exclude both from the floor: they are the pot paying itself. Otherwise a person reads $4,000 of "guaranteed" income of which $2,000 stops the day the pot empties. (Open question 1.) |
| F account-type / confidence | Fixed versus inflation-adjusted | Social Security adjusts; most pensions do not. Show the floor today AND at 85 in today's dollars: a fixed $2,000 pension is about $984 of today's buying power in 24 years at 3%. The model cannot see the difference yet — one guaranteed-income field, and the run raises ALL of it with inflation (retirement/index.ts:234): right for Social Security, flattering for a fixed pension. A fixed-versus-adjusting flag per income stream is the missing input (rides open question 8). |

#### P2 — Coverage of essentials

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Essential spending unconfirmed | The app must not decide what is essential in someone's life (spine row 46). Until confirmed: coverage of TOTAL spending, labelled as such. |
| B degraded | same as P1-B | same as P1-B |
| C shape-per-road | same as P1-C | same as P1-C |
| D time-bounded | Coverage erodes when the floor is partly fixed | 90% covered today can be 70% at 85 (the P1-F arithmetic). Show both dates or the better-looking one misleads. |
| E related events | same as P1-E | same as P1-E |
| F account-type / confidence | Gross against net mixes money | Essentials are paid with after-tax dollars, and part of the Social Security check may be taxable (Social Security decision P4). State the basis — cover essentials with the floor AFTER tax, or say the comparison is gross. |

#### P3 — After the first death

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Survivor inputs do not exist | Not modelled in code (checked src/domain 2026-08-19) and not capturable: one ssMonthly field exists (willItLast.ts:73). Refusal, with the arithmetic in words: the smaller Social Security check STOPS — the survivor keeps the larger; a pension pays its chosen survivor share (0/50/75/100%, printed on the pension's own statement). Fix: capture each spouse's check and the pension's survivor option. (Open question 8.) |
| B degraded | If captured: statement amounts | Same age-adjustment as P1-B, for each spouse separately. |
| C shape-per-road | same as P1-C | same as P1-C |
| D time-bounded | Dated twice | The survivor floor applies from an unknown date; show it as "if one of you died this year" — a scenario, never a forecast. |
| E related events | same as P1-E | same as P1-E |
| F account-type / confidence | Filing turns single | Same income, higher brackets, from the year after — the floor's after-tax value falls twice (one check gone, more tax on the rest). Name both effects; compute neither until the inputs exist. |

---

### Social Security decision
What the person is really asking: When should I claim?

#### P1 — Benefit at each age

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No statement amount | No table. We do not hold the earnings record and must not estimate the check from income — an invented benefit is the worst seed a claiming decision can have. Fix: ssa.gov → statement → type the age-67 monthly figure. |
| B degraded | One factor schedule for every birth year | The table anchors full retirement age at 67 — right for everyone born 1960 or later (R85), but clients born 1956–1959 have full retirement ages of 66y4m–66y10m, so their factors are off by up to a few percent. Also sanity-check the typed figure: a yearly amount in the monthly box is a 12× error — flag anything over about $5,000 a month. (Open question 3.) |
| C shape-per-road | One road — typed | Same rule as Guaranteed income floor P1-C: name the document and the date it was typed. |
| D time-bounded | Today's dollars throughout | Each claim age's check is shown in today's money (R117), no cost-of-living additions — consistent with the plan's convention. Never mix an inflated check into a today's-dollars table. |
| E related events | Claiming before full retirement age while still working | The earnings test withholds $1 for every $2 above a limit until full retirement age — not modelled. Say it in words to anyone under that age with wage income, or the 62 column overpromises. |
| F account-type / confidence | The check is not all spendable | Up to 85% can be taxable (P4). Keep the comparison table gross; the note carries the tax. |

#### P2 — Break-even

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | same as P1-A | same as P1-A |
| B degraded | same as P1-B | same as P1-B |
| C shape-per-road | same as P1-C | same as P1-C |
| D time-bounded | The basis moves the crossover | In today's dollars the cumulative-check crossover for 62-versus-70 lands near 80: a 0.70× check from 62 against a 1.24× check from 70 crosses at about 80⅓ (the division is (8 × 0.70) ÷ (1.24 − 0.70) + 70). Change the basis and it moves — crediting an investment return on the early checks pushes it LATER; summing nominal dollars with cost-of-living raises pulls it EARLIER, because the annual difference grows while the head start stays in old dollars. State the basis; today's dollars is the app's convention (R117). |
| E related events | The framing is the event to guard | Break-even invites betting on dying early (spine trap). Lead with "delaying insures against a long life — the risk that actually hurts"; the crossover age is the footnote. |
| F account-type / confidence | Taxes shift the crossover | A bigger check can push more of itself into the taxable 85%; without the tax model (P4) keep the table gross and say so. |

#### P3 — Household strategy

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | The second spouse's statement is not capturable | One ssMonthly field exists (willItLast.ts:73) — the coordination question cannot be answered yet. Refusal, with the one rule that matters in words: the survivor keeps the LARGER check, so the higher earner delaying is survivor insurance for both. Fix: capture both statements. |
| B degraded | same as P1-B, per spouse | same as P1-B, per spouse |
| C shape-per-road | same as P1-C | same as P1-C |
| D time-bounded | Two claim windows, one household | The claim question is live between 60 and 70 (planning/hub.ts SS_DECISION_FROM/TO) — each spouse has their own window; the household view needs both dates on one line. |
| E related events | Spousal benefits | A spouse with a small own record may claim on the partner's — not modelled; name it as a question for the Social Security office rather than guessing. |
| F account-type / confidence | same as P1-F | same as P1-F |

#### P4 — Taxable share

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | The rule is not built | Income tax fills brackets on gross only (R108/R109); no combined-income rule exists (checked 2026-08-19). Show no number; the words: "up to 85% of the check can be taxable, depending on your other income." (Open question 7.) |
| B degraded | If built: the rule in plain terms | Combined income = other income + tax-free interest + half the check. Over $25,000 single / $32,000 married: up to 50% taxable; over $34,000 / $44,000: up to 85%. Those thresholds never adjust for inflation — more retirees cross them every year. |
| C shape-per-road | Other income arrives typed (R158) | The taxable share is only as good as the typed income; label it. |
| D time-bounded | Per tax year | An RMD or a Roth conversion in the same year raises that year's taxable share of the checks — cross-link both screens. |
| E related events | A conversion or a large sale in the same year | Same mechanism as D: the events live on other screens; the effect lands here. |
| F account-type / confidence | audit item 22's rule | No tax figure without its assumptions named: filing status, other income, and the state (a few states tax benefits; most do not). |

---

### Required minimum distributions
What the person is really asking: What must I take, and when?

#### P1 — This year's amount

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | The prior 31 December pre-tax balance | The IRS divides LAST December's balance; the app rarely holds it (per-account history starts when first kept — audit item 49). The custodian's own RMD letter or the January statement is the record; our figure from today's balance is an ESTIMATE and the schedule already says so in code (decumulation/index.ts:137-141). Screen: "estimated from today's balance — your custodian's letter has the exact figure." |
| B degraded | Today's balance stands in for 31 December | State it under the number, every time. A ±10% market move since December moves the true RMD ±10%. |
| C shape-per-road | Which accounts are pre-tax is typed, not sent (R33; connections guess from broker words, R12) | A missed IRA understates the RMD — a real penalty (25%, reducible to 10% when corrected). Ask the person to confirm the pre-tax list on the RMD screen itself. |
| D time-bounded | A calendar-year figure, with one wrinkle | Taken-so-far counts this calendar year's withdrawals from pre-tax accounts (rmdTakenThisYear, decumulation/index.ts:161-166) — apply the agreed K6 boundary convention here too: a year opens after 31 December's close, so a 31 December withdrawal belongs to the year just ending (audit item 2 — carried downstream only by these grids until it lives in one tested module). The FIRST year may defer to 1 April of the next, putting two RMDs in one tax year — not modelled; one line of words. (Open question 13.) |
| E related events | Aggregation is not uniform | IRAs may satisfy their combined RMD from any one IRA; each 401(k) must pay its own. The code pools ALL pre-tax into one figure (rmdAtAge on the total) — right for IRA-only clients, wrong the day a 401(k) sits beside them. Split by wrapper before saying "you still owe $X". |
| F account-type / confidence | The start age is hard-coded at 73 — in TWO places (decumulation/index.ts:103, and its mirror rmdStartAge (engines/rmd.ts) at retirement/index.ts:147; a fix must land in both) | The law says 75 for anyone born 1960 or later — most of the younger half of this audience — and the spine's own trap says confirm, never hard-code. Roth IRAs have no lifetime RMD; Roth 401(k)s stopped having them in 2024. Drive the age off birth year and wrapper, or the app tells a 64-year-old born in 1962 to plan forced withdrawals two years early. (Open question 2.) |

#### P2 — First RMD year

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Birth year | No answer — the age rule IS the birth year. Same no-guessed-age rule as the odds (R159). |
| B degraded | — | Not applicable, argued: this answer is a rule lookup on one typed field; a birth year has no degraded form — it is known or it is missing (A). |
| C shape-per-road | same as P1-C | The year only matters where pre-tax money exists, and which money is pre-tax is typed. |
| D time-bounded | The 1 April deferral | First year only: deferring moves the deadline, not the year it accrues; show both dates. |
| E related events | Still working past the start age | A current employer's 401(k) can wait until retirement (plan permitting, not a 5% owner) — IRAs cannot. Not modelled; one line of words on screen. |
| F account-type / confidence | same as P1-F | The 73-versus-75 birth-year rule decides this whole answer. |

#### P3 — Tax effect

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Other income unknown | The RMD's tax depends on what it stacks on top of. Without typed income, show the RMD gross and refuse the tax line — no tax figure when its base is unknown (audit item 22). |
| B degraded | Effective rate standing in for marginal | The odds charge the forced draw at the person's effective rate (willItLast.ts:98) — a stated simplification for a whole-plan run. THIS year's RMD is a MARGINAL question (spine row 56) and the effective rate understates it. Name which rate each screen uses. |
| C shape-per-road | same as P1-C | same as P1-C |
| D time-bounded | Per tax year, stacking with everything else in it | The same mechanism as Social Security decision P4-D, in the other direction: the RMD can drag more of the check into tax. |
| E related events | Medicare premiums two years later | A large RMD can cross an income threshold and raise the premium two years on (spine row 70's trap) — not modelled; the words belong on screen for anyone near a threshold. |
| F account-type / confidence | audit item 22 in full | Assumptions named: filing status, the typed flat state rate (R107). Suppress wherever the account's tax type is unconfirmed. |

#### P4 — Lifetime effect

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | same as Probability of success P1-A | It is a projection over the same plan. |
| B degraded | Future balances move with returns | The schedule is labelled ESTIMATES in the code (decumulation/index.ts:137); keep that label on screen for every future row. |
| C shape-per-road | same as P1-C | same as P1-C |
| D time-bounded | The horizon rides the label | Rows between the published ages use an interpolated divisor (rmdDivisor, decumulation/index.ts:110-119) — a stated approximation. |
| E related events | Conversions change the path | The lifetime RMD picture is exactly what makes early Roth conversions worth modelling (spine row 69) — but no conversion engine exists; show the schedule as-is and cross-link the conversion screen's refusal (Roth conversion analysis P3). |
| F account-type / confidence | same as P1-F | same as P1-F |

---

### Roth conversion analysis
What the person is really asking: Should I move money now to save tax later?

#### P1 — Room this year

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Taxable income for the year | A bank feed sees net pay, never gross (spine row 43); the app holds the typed annual figure (R158). Without it: no room figure — show the method in words and ask for last year's return's taxable income as the seed. |
| B degraded | Typed income is a plan | December knows the year; March guesses it. Label the room "based on the income you expect" and invite a year-end revisit. |
| C shape-per-road | Filing status and state rate are typed; state tax is one flat typed rate (R107) | Some states tax conversions fully, a few not at all — the flat rate is the person's own honest stand-in; name it. |
| D time-bounded | A calendar-year figure | Room resets on 1 January; a mid-year figure assumes the rest of the year lands as planned (same label as B). |
| E related events | Realised gains eat the same bracket | A sale this year fills the bracket the conversion was aiming at; the room figure must see this year's realised gains (section B's realised-gains metric feeds it). |
| F account-type / confidence | The bracket top is not the only cliff | Medicare premium thresholds (felt two years later) and the capital-gains stack (a conversion can push 0%-rate gains to 15%) sit around the bracket lines — the true room is the LOWEST cliff. Name all three lines on screen. |

#### P2 — Cost now

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Amount and income | Needs P1 first; without room and income, no cost figure. |
| B degraded | One flat rate standing in for the fill | The cost is the amount × the rates it FILLS — a conversion crossing a bracket line pays two rates. Compute by filling brackets (the progressive-fill engine exists for income, R108), never by one flat rate; marginal, not effective (spine row 56). |
| C shape-per-road | same as P1-C | same as P1-C |
| D time-bounded | Age matters before 59½ | Paying the tax out of the converted money before 59½ adds a 10% penalty on the tax slice — real for a 58-year-old client. "Pay from outside the account" (spine row 70) is the default advice here anyway. |
| E related events | Withholding on the conversion is itself a distribution | Withhold 20% and only 80% converts; the withheld slice is taxed AND misses the Roth. State the two ways to pay and their different endings. |
| F account-type / confidence | audit item 22 | Every assumption on screen: filing status, other income, state rate, no Medicare-premium modelling. Suppress the dollar cost where the source account's tax type is unconfirmed. |

#### P3 — Lifetime saving

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Both whole paths to the horizon | Not built — no conversion-path engine exists (checked 2026-08-19). Never show "you save $X" from a one-year rate comparison. The honest sentence is the mechanism: "pay a known rate now to avoid unknown rates on forced withdrawals later — worth doing when your rate now is lower than your rate then." |
| B degraded | If built: two full runs, convert and don't | Through the RMDs avoided and the survivor's single-filer years; the saving is the difference of two lifetime tax totals, shown as a RANGE across return paths, never one number (K63's rule). |
| C shape-per-road | same as P1-C | same as P1-C |
| D time-bounded | The horizon and the heir's window both ride the answer | Part of a conversion's value lands after death — a ten-year emptying window on an inherited IRA against a tax-free inherited Roth. |
| E related events | The RMDs avoided are the engine of the saving | Cross-link Required minimum distributions P4. |
| F account-type / confidence | The survivor's filing status is half the case | Single brackets on the same income — not modelled (no survivor logic, checked 2026-08-19); name it as the reason the analysis waits rather than guessing. |

#### P4 — Side effects

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | — | Not applicable, argued: this purpose is a named checklist, not a computed figure — nothing can be missing from it. The list: Medicare premium thresholds (two-year lookback), capital-gains stacking, marketplace-subsidy loss before 65, state tax, the five-year clock on converted dollars. |
| B degraded | Thresholds move yearly | Premium cliffs and bracket lines change every year; a hard-coded table is the RMD-start-age defect again (spine row 69's trap) — date every table. |
| C shape-per-road | same as P1-C | same as P1-C |
| D time-bounded | Each effect has its own date | The premium effect lands two years after the conversion year; the five-year clock runs per conversion; the subsidy effect exists only before 65. A dated list, per effect. |
| E related events | same as P1-E | same as P1-E |
| F account-type / confidence | Compute honestly or hand over the exact question | For each effect, either the app computes it or it prints the question for the tax preparer: "would a $40,000 conversion in 2026 change my 2028 Medicare premium?" A named question beats a wrong number. |

---

### Withdrawal sequencing
What the person is really asking: Which account should I spend first?

#### P1 — Conventional order

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Tax types unconfirmed | No order — the order IS the tax types. Unconfirmed accounts silently land in "taxable" today (decumulation/index.ts:19), which puts them at the front of the invested draw — only cash sits ahead (DEFAULT_DRAW_ORDER, decumulation/index.ts:78). Screen: "confirm how each account is taxed and we can order them." |
| B degraded | Bucket sizes rest on earmarked shares and possibly stale balances | The ORDER is robust to stale balances; the AMOUNTS are not — carry the oldest-date caption on the amounts (K44), not on the order. |
| C shape-per-road | same as Retirement pot P1-C | same as Retirement pot P1-C |
| D time-bounded | The order changes at the RMD age | The code pins the required withdrawal on top from 73 — "law, not preference" (decumulation/index.ts:93-97). Right rule, wrong age for clients born 1960 or later (75) — same fix as Required minimum distributions P1-F. |
| E related events | Excess RMD is reinvested after tax into the taxable bucket in the comparator (decumulation/index.ts:196) | A fair modelling choice — state it, because it flatters orders that drain pre-tax early. |
| F account-type / confidence | The tax gross-ups carry a hidden guess | Pre-tax draws gross up at a 22% default and taxable draws at 15% × an ASSUMED half-gain (decumulation/index.ts:181). The founder's cost-basis cases echo here exactly: with no basis (case 1) or only an average (case 2), the gain share is a guess — and with only an average there is no honest long/short split either (tab 8 F7; audit item 51). Screen: "assumes half your taxable money is gain — connect cost details to sharpen this." (Open question 6.) |

#### P2 — Tax-smoothed

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Not built | The comparator walks fixed orders only (drawOrderOutcome, decumulation/index.ts:176-212); filling a target bracket each year needs a yearly income projection and per-year bracket tables. Refusal: show the fixed-order comparison as the honest available answer, and say plainly that drawing across buckets to fill a bracket is usually better (spine row 71). |
| B degraded | If built: bracket mechanics | same as Roth conversion analysis P2-B — fill brackets, never one flat rate. |
| C shape-per-road | same as Retirement pot P1-C | same as Retirement pot P1-C |
| D time-bounded | Year-by-year by construction | Each year's fill target is dated; the plan is a schedule, not a single rule. |
| E related events | RMDs come first always; conversions fill what is left (spine row 71) | Cross-link both screens so the three engines never contradict on one year. |
| F account-type / confidence | same as P1-F | same as P1-F |

#### P3 — With RMDs and conversions

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Half built | The RMD half ships (the pinned first step, P1-D); the conversion half does not (no engine). Show the RMD-aware order; refuse the conversion overlay with the cross-link to Roth conversion analysis P3. |
| B degraded | same as P1-B | same as P1-B |
| C shape-per-road | same as Retirement pot P1-C | same as Retirement pot P1-C |
| D time-bounded | same as P1-D | same as P1-D |
| E related events | same as P2-E | same as P2-E |
| F account-type / confidence | same as P1-F | same as P1-F |

---

### Healthcare and care costs
What the person is really asking: What will health cost me?

#### P1 — Pre-65 bridge

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | The premium | No healthcare engine exists at all (checked src/domain 2026-08-19). The honest vehicle exists though: a yearly amount charged until a stated year — recurring_until (retirement/index.ts:82-97), built for loan payments; today only the mortgage flow feeds it (debt/mortgageOdds.ts:67) and no premium door exists (checked 2026-08-19). Ask: "what would you pay a month for cover until 65?" — the person's own marketplace quote is the source. (Open question 12.) |
| B degraded | A quoted premium is this year's price | Health costs outrun headline inflation (spine rows 57, 72); a flat premium understates the later bridge years. Raise it by a stated health-inflation rate, or say the figure is today's price. |
| C shape-per-road | Typed only | Same rule as Guaranteed income floor P1-C: name the source and its date ("your marketplace quote, entered 19 Aug 2026"). |
| D time-bounded | The bridge ENDS at 65 by construction | Exactly what recurring_until models — a cost through a year, never inflated past its end. The end year comes from the birth year, computed once, not typed twice. |
| E related events | The bridge interacts with conversions | Marketplace subsidies fall as income rises: a Roth conversion in a bridge year can cost thousands in subsidy. The checklist item lives on the conversion screen (Roth conversion analysis P4); this screen names the same link from its side. |
| F account-type / confidence | It is all estimate | No institution will ever confirm a future premium. Caption every bridge figure "your estimate" — the measured-versus-estimated axis here has only one side. |

#### P2 — Medicare era

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Parts and supplement premiums | Not built. Words first: "Part B has a standard premium; supplements vary; high income raises the premium." Vehicle: fold into monthly retirement spending OR a named recurring line — one place, never both; double-charging spending is this section's version of the sweep bug. |
| B degraded | Premium tables move yearly and look back two years | A hard-coded table is the defect the RMD trap names (spine row 69). Date any table; drive the lookback from the income of two years back if ever built. |
| C shape-per-road | same as P1-C | same as P1-C |
| D time-bounded | From 65 — and the income that sets the premium is measured at 63 | The two-year lookback opens the planning window at 63; the screen's date logic keys off birth year. |
| E related events | Conversions and RMDs feed the premium thresholds | This is where the other screens' side effects land — cross-link, one shared sentence. |
| F account-type / confidence | same as P1-F | same as P1-F |

#### P3 — Long-term care

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | The event's size and year are unknowable | The risk is a tail, not an average (spine row 72) — an average would mislead even if we had one. The vehicle ships today: a named one-time cost in a chosen year (one_off_costs, willItLast.ts:105, founder-approved 2026-08-02). "A care event: $150,000 around age 85" — run the odds with and without. |
| B degraded | Any care figure is a scenario | Never a forecast. Show the two odds side by side (with / without), not one blended number. |
| C shape-per-road | same as P1-C | same as P1-C |
| D time-bounded | The year is the scenario's handle | Age 80 versus 90 changes the answer materially — money has longer to grow before a later event. Let the person move the year and watch the odds. |
| E related events | Insurance flips the shape | A premium is a recurring cost; a covered event shrinks the lump. Model premium-instead-of-lump as the alternative run and show both. |
| F account-type / confidence | same as P1-F | same as P1-F |

---

### Stress tests
What the person is really asking: What if things go wrong?

#### P1 — Market crash early

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No baseline plan | Nothing to stress — a stress is a difference from the base. Same door as Probability of success P1-A. |
| B degraded | The built range is a return nudge, not a crash | Today's band re-runs at the average return ± 2 points (willItLast.ts:136-138) and shows path percentiles (retirement/index.ts BandPoint); neither forces the bad years FIRST. A true crash-early run needs an ordered first decade — not built: simulate() draws every year at random (retirement/index.ts:206, 222) and no ordered-path input exists (checked 2026-08-19). Until then, never caption the band as a crash test. |
| C shape-per-road | same as Retirement pot P1-C | same as Retirement pot P1-C |
| D time-bounded | The shock's timing IS the test | The same crash in year one and year ten give very different endings on the same average (spine row 37). Name the year on screen. |
| E related events | same as Probability of success P1-E | same as Probability of success P1-E |
| F account-type / confidence | Report the outcome move, not a new percent | "Spending must fall $700 a month" or "short at 84" (spine row 73). Percentages numb; dollars and ages land. |

#### P2 — Higher inflation

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | same as P1-A | same as P1-A |
| B degraded | One rate for all spending | Health and insurance outrun the headline rate (spine row 57); a single +2-point stress still understates a retiree's basket. Say what the stress raises and what it does not. |
| C shape-per-road | same as Retirement pot P1-C | same as Retirement pot P1-C |
| D time-bounded | The mechanics ship today | The exact inputs are exposed for re-running with patches (willItLast.ts:40); run base and +2 points, show both, both dated. |
| E related events | Fixed payments do NOT inflate | The mortgage stays the same dollars to its end (retirement/index.ts:94-96) — an inflation stress that inflates it overstates the damage. The engine already separates the two; the stress must keep them separate. |
| F account-type / confidence | same as P1-F | same as P1-F |

#### P3 — One spouse dies

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Inputs do not exist | One Social Security field, no survivor shares (willItLast.ts:73; checked 2026-08-19). Named refusal plus the words: one check stops, the survivor keeps the larger; the pension falls to its survivor share; filing turns single. Fix: capture the three numbers (Guaranteed income floor P3-A). |
| B degraded | same as Guaranteed income floor P3-B | same as Guaranteed income floor P3-B |
| C shape-per-road | same as Guaranteed income floor P1-C | same as Guaranteed income floor P1-C |
| D time-bounded | Scenario-dated | "If this year" — same as Guaranteed income floor P3-D. |
| E related events | same as Probability of success P1-E | same as Probability of success P1-E |
| F account-type / confidence | The survivor files single | Higher rates on the same income — name it; compute nothing until the inputs exist (Guaranteed income floor P3-F). |

#### P4 — A care event

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | same as P1-A | same as P1-A |
| B degraded | same as Healthcare and care costs P3-B | A scenario, never a forecast; with/without side by side. |
| C shape-per-road | same as Retirement pot P1-C | same as Retirement pot P1-C |
| D time-bounded | same as Healthcare and care costs P3-D | The year is the handle. |
| E related events | The vehicle is built | A dated one-time cost (willItLast.ts:105) — this stress ships today; run with and without. |
| F account-type / confidence | same as P1-F | same as P1-F |

#### P5 — Longer life

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | same as P1-A | same as P1-A |
| B degraded | The horizon is a choice, not a measurement | 90 is the default (willItLast.ts:68); to 100 is the stress. Neither is a prediction — both are dated plans. |
| C shape-per-road | same as Retirement pot P1-C | same as Retirement pot P1-C |
| D time-bounded | The stress IS the time bound | The same plan run to 100. The odds sentence always carries the age (R77), so the two runs cannot be confused. |
| E related events | Lifetime income is worth MORE here | Social Security and annuities never run out, so a floor-heavy plan barely moves in this stress — show which plans this is true of (same run mechanics as Probability of success P1-E). |
| F account-type / confidence | same as P1-F | same as P1-F |

---

### Legacy and estate
What the person is really asking: What is left, and for whom?

#### P1 — Terminal value

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Same door as Probability of success P1-A | It is the same projection's last page (R78 reads "what is left at the end"). |
| B degraded | One number overstates | The leftover at the horizon is a spread across paths; show the 10th/50th/90th from the band (retirement/index.ts BandPoint), never the middle alone. |
| C shape-per-road | same as Retirement pot P1-C | same as Retirement pot P1-C |
| D time-bounded | Dated at the horizon, in stated dollars | Say today's-money or future-money on the figure (crosswalk the the Comprehensive Metrics tab of the spine (crosswalk-Aug19) tab row tab row 77): $2,000,000 in 25 years is about $1,080,000 today at 2.5% — the division is 2,000,000 ÷ 1.025²⁵ (the spine's own cell rounds this to $1.2m; correct it there). Shown without the basis it is not a number, it is a mood. |
| E related events | The held-back legacy is NOT in the simulation's leftover | The legacy target is removed from the pot before the run (willItLast.ts:54-55), so "what is left" EXCLUDES the money already promised. The estate line must add the held-back target back — noting its growth is not modelled — or the person under-reads their own estate. (Open question 4.) |
| F account-type / confidence | What the heirs get is not what the balance says | A $1,000,000 traditional IRA is a tax bill wearing a bequest (spine row 74). Split the terminal value by tax treatment before anyone reads it as "what I leave". |

#### P2 — After tax

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | The heirs' tax rates | Tax on an inherited pre-tax account lands at the HEIR'S rate — a number we cannot know. Refuse the precise figure; show a range at stated rates: "at 12%: $X; at 24%: $Y." |
| B degraded | same as P1-B | same as P1-B |
| C shape-per-road | same as Retirement pot P1-C | same as Retirement pot P1-C |
| D time-bounded | The ten-year clock | A non-spouse heir must empty an inherited IRA within ten years — often the heir's peak earning years. The range in A says "within ten years of inheriting". |
| E related events | Estate tax | Applies only above the federal exclusion — high, and most clients never touch it — but several STATES cut in far lower. One line naming the person's state question; no number without their state's rule. |
| F account-type / confidence | audit item 22 again | No after-tax figure where the account tax types are unconfirmed; assumptions (heir's rate, state) named on screen. |

#### P3 — Coverage of intentions

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Intentions barely captured | One legacy-target number exists (op.legacyTarget, willItLast.ts:54). Coverage of WHOM gets WHAT needs per-person intentions that do not exist yet. Show target versus projected estate; refuse the per-heir view until captured. |
| B degraded | same as P1-B | Coverage against a range, not a point. |
| C shape-per-road | same as Retirement pot P1-C | same as Retirement pot P1-C |
| D time-bounded | Coverage at the horizon | An early death covers intentions differently — cross-link the survivor stress (Stress tests P3). |
| E related events | same as P1-E | Count the held-back target on the covered side exactly once — never twice. |
| F account-type / confidence | Intentions are after-tax promises | "Leave $200,000 to each child" means dollars the child keeps; met from a pre-tax pot at 22% it takes about $256,000 per child. Capture the intention's basis when the input is built. |

---

### Work-optional date
What the person is really asking: When could I stop?

#### P1 — Earliest feasible

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Same door as Probability of success P1-A | No date from guessed inputs, ever. |
| B degraded | A single date reads like a promise | It inherits every assumption in the plan. Give the date WITH the odds at it — "2031, the first year the plan clears 80%" — and the year either side. |
| C shape-per-road | same as Retirement pot P1-C | same as Retirement pot P1-C |
| D time-bounded | The answer moves with markets | The earliest year computed after a good quarter is later after a bad one. Date the computation and re-run on demand; never cache a promise. |
| E related events | Big costs near the boundary dominate | A $60,000 cost the year after stopping can move the date a full year — show which input moves it, the same one-lever honesty as the target. |
| F account-type / confidence | Feasible = clears the STATED threshold | 80% is the app's line, with its reason written above it (planning/target.ts TARGET_ODDS). Mechanics: search on the retirement age over the same seeded run — the method the target solver already uses on the pot (planning/target.ts smallestThatWorks); the retire-age version is not built yet (checked: target.ts solves the pot and the saving only). |

#### P2 — Effect of one more year

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | same as P1-A | same as P1-A |
| B degraded | same as P1-B | same as P1-B |
| C shape-per-road | same as Retirement pot P1-C | same as Retirement pot P1-C |
| D time-bounded | One more year is three levers at once | Another year of saving, one fewer year of spending, a shorter horizon — that is why it moves so much (spine row 75). Report the move in odds AND in money: "+9 points, or about $450 a month more for life." |
| E related events | same as P1-E | same as P1-E |
| F account-type / confidence | The most abused lever (spine trap) | Show its size honestly and stop. Never advise "just work another year" — the person prices their own year. |

#### P3 — Part-time version

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | A wage that steps down has no input | The plan knows full contributions until the retirement age, then none (retirement/index.ts annual_contribution). Part-time income cannot be expressed. Refusal: bracket it honestly with two full-stop runs — "stop fully at 62" versus "at 66" — and say the part-time truth lies between. (Open question 9.) |
| B degraded | If built: part-time income is a typed guess | Same label discipline as P1-B. |
| C shape-per-road | same as Retirement pot P1-C | same as Retirement pot P1-C |
| D time-bounded | Two dates, not one | The step-down year and the full-stop year; both ride the label. |
| E related events | Part-time wages before full retirement age interact with an early Social Security claim | The earnings test (Social Security decision P1-E) — the two screens must not contradict each other. |
| F account-type / confidence | same as P1-F | same as P1-F |

---

## Open questions for the founder — decisions I could not make as the CFA

All of these were answered by the founder on 2026-08-20 — the verdicts live in METRICS-DELIVERABLE-ANSWERED-2026-08-20.xlsx and BRIEF-decisions-and-fixes-2026-08-20.md. Questions touching a cut metric (brief §C) are void. Kept for the record only.


1. Should "withdrawals" and "RMDs" come out of the typed retirement-income list (the Engines tab R106), since counting them as guaranteed income lets the pot pay itself in the odds and inflates the floor?
2. RMD start age: adopt the birth-year rule (73 for those born before 1960, 75 for 1960 and later) in place of the hard-coded 73 (two copies: decumulation/index.ts:103 and retirement/index.ts:147), and exempt Roth 401(k)s?
3. Social Security factors: accept the age-67 anchor as a stated approximation for clients born 1956–1959, or add the full-retirement-age table by birth year?
4. When a legacy target is held back from the pot, should the estate screen show the simulation's leftover PLUS the held-back target (and should that slice grow), or keep the two apart with a note?
5. Once measured withdrawals exist, which figure owns the words "current withdrawal rate" — the plan ((spend − guaranteed) ÷ pot, decumulation/index.ts:33-43), the measured trailing-12 draw, or both, labelled?
6. The draw-order tax figures assume half of taxable money is gain when no cost detail exists (decumulation/index.ts:181) — print the assumption on the sheet, or suppress the taxes column until real cost figures arrive?
7. Taxable share of Social Security: build the combined-income rule, or keep it as a named question for the tax preparer with no number shown?
8. Survivor inputs (each spouse's check, pension survivor share) — and a fixed-versus-inflation-adjusting flag per income stream, since the run today raises ALL guaranteed income with inflation (retirement/index.ts:234): in scope for the next build, or does the stress screen keep the words-only treatment for now?
9. Part-time work: build a wage-that-steps-down input, or keep the two-full-stop-runs bracket as the honest answer?
10. Funded ratio: build it — which requires a discount-rate choice you must approve and the screen must show — or keep the odds as the single on-track figure?
11. Which flow threshold voids a short-window rate — the 1% on the metrics tab (K15) or the 10% on the snapshot tab (tab 9 B15)? One must supersede the other (audit item 4).
12. May the "yearly cost until a stated year" mechanism built for loan payments (retirement/index.ts:82-97) carry pre-65 health premiums, or do premiums get their own input?
13. First-year RMD deferral to 1 April: model the two-RMDs-in-one-tax-year case, or state "we show the calendar-year amount" on screen?
