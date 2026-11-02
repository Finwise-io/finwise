# E2E flow register — 92 distinct end-to-end user flows, all automated and green

**Founder ask 2026-07-15: "test at least 50 end-to-end user flows."** This register names each
distinct flow and the automated test that drives it — real screens, real taps and typing, and
assertions that cross surfaces (a flow's outcome is checked where the USER would look next,
not where the code lives). Every flow runs on every commit; a broken flow blocks "done."

Personas used across the register: a 60-yr worker (salary + 401(k)), a 74-yr retiree
(SS + pension + IRA, required withdrawals apply), plus edge personas per flow (debts-only,
bonds-only, brand-new with nothing).

## The paying-user basics — `ui_tester_flows.test.tsx`
| # | Flow |
|---|---|
| 01 | Brand-new user: skip the questions → Home doors → import a brokerage CSV → a real Home |
| 02 | The daily habit: two taps → log a $6.50 coffee → it shows in Cash flow's month-so-far |
| 03 | The retiree's morning: paycheck breakdown; raising SS by $100 moves Guaranteed by $100 |
| 04 | A big decision end to end: SS statement → adopt claim-at-67 → every surface agrees → revert restores exactly |
| 05 | Money management: add accounts → drill in → $500 transfer moves both sides → the eye masks everything |
| 06 | Importing the same file twice → update-not-twin (no doubled money) |
| 07 | The + Expense sheet never saves junk (blank/no-category guarded; a real entry saves once) |
| 08 | Lens flip mid-session with an adopted plan → nothing corrupts, commitments survive |
| 09 | Delete the other side of a transfer → history intact, deleted page degrades honestly |
| 10 | Debts-only user → negative net worth in words, Home stands, no fake odds |

## Cross-feature seam attacks — `adversarial_pass.test.tsx`
| # | Flow |
|---|---|
| 11 | Connect Chase → then import a Chase file → the merge gate still catches it (no twins across sources) |
| 12 | Adopt a Roth conversion → its tax appears on the grid AND bill calendar → revert removes it everywhere |
| 13 | Add $300k by hand → the milestone crossing fires on Home |
| 14 | Add a home + mortgage → both sides of Own − Owe, one honest math line |
| 15 | The unified add screen: explicit $0 allowed, blank blocked (B-21 lives on) |
| 16 | Connect's accounts-found list + the add screen under hide-balances → fully masked |
| 17 | A one-off bill dated in a passed month → lands in Later exactly once, never silently dropped |
| 18 | Bill calendar with zero cash accounts → honest verdict, editable start |
| 19 | Filing status → married moves take-home, Roth tax, AND sell-tax in one motion |
| 20 | Adopt horizon 94 → Home's "lasts to age 94" sentence updates |
| 21 | The same egg all pre-tax never beats all-Roth on the odds (RMD drag honesty) |
| 22 | A legacy history blob + a v1 snapshot chart together on the Net worth trend |

## Persona upgrade / routing contracts — `fcc_user_flows.test.tsx`
| # | Flow |
|---|---|
| 23 | Existing working user lands on the new Home — no crash, stale flags ignored |
| 24 | Their tab order is the working order; new store fields arrive as defaults |
| 25 | Cash flow and Plan render working-lens content end to end |
| 26 | The retiree's paycheck LEADS Home and Cash flow with no switch to flip |
| 27 | Retiree tab order puts Cash flow next to Home |
| 28 | The guard walks auth → first-run → Home (the B46 routing contract) |
| 29 | First Home after onboarding: a real hero from their answers + ONE capture affordance |
| 30 | Empty Home shows the three doors — no dead end, no fake zeros |
| 31 | "Retired, or nearly" counts as retired — the paycheck leads |

## First-run + Home dashboard — `first_run_lens.test.tsx`
| # | Flow |
|---|---|
| 32 | The stage answer sets the ONE lens field the whole app reads |
| 33 | Retired + secure-retirement goal → the Monthly-income fast door |
| 34 | Skip writes nothing and lands on Home (defaults, no dead end) |
| 35 | Questions answered but NO money data → the doors still show (a profile is not data) |

## The gap-filling suite — `e2e_flows_register.test.tsx` (new, this pass)
| # | Flow |
|---|---|
| 36 | Retiree front door: type SS + pension → Save → the paycheck hero carries the sum |
| 37 | Month detail: dated headline; Previous/Next navigation holds |
| 38 | What-if: +$100 twice → a complete spoken before→after estimate |
| 39 | SS at 62: all claim rows with chances → adopt 70 → revert restores byte-identical |
| 40 | Look-back: a real counterfactual from cached prices; refuses honestly without them |
| 41 | Settings revisit flips working→retired → Cash flow leads with the paycheck |
| 42 | Import a crypto row → filed under Alternatives, visibly correctable — never as a stock |
| 43 | Cash account ledger day: deposit → withdraw → both rows in history, balance exact |
| 44 | Stale gold nudge → update value in one tap → the as-of clock resets today |
| 45 | Add a card debt by hand → Net worth OWES it with the pay-first pill |
| 46 | Allocate this month's surplus to a goal → saved rises, the month is funded |
| 47 | Open an insight → the provenance sheet shows the accounts and the math |
| 48 | 401(k) room → "try it in a what-if" opens pre-filled |
| 49 | Set married on the Tax organizer → the Roth tax bill drops in the same session |
| 50 | Paycheck months: twelve dated rows, each a full safe-to-spend sentence |
| 51 | A working user opens the steer sheet → projection-mode banner (not today's money) |
| 52 | Tap a coming-up bill → form prefills → the ONE spending category updates |
| 53 | The milestone's full arc: cross → dismiss → the NEXT rung still fires |
| 54 | A paused deep-setup draft resumes from the Home doors |
| 55 | From connect's consent screen, Add-by-hand is one tap away (never a dead end) |
| 56 | A logged grocery run appears inside its month's detail |

## Performance, recording — `src/screens/__tests__/performance_journeys_recording_2026_10_23.test.tsx` (added 2026-10-23, 21 tests)
| # | Flow |
|---|---|
| 57 | Record a buy from the account page: the sheet reads the trade-sheet drawing, the activity lists the buy, and the account page, the Performance tab, Net worth and Home agree — the drawing's household, a typed total that stays $40,000, and v17 phone 1 |
| 57 D | An option contract bought and sold by hand: 1 contract at $2.50 costs $250, 1 at $3.00 brings in $300, the activity says contracts, realized +$100 |
| 57 E | A VTI bought on the trade sheet lists under Stocks / Funds on the account page and in the Performance tab's category table |
| 58 | A sale with a $5 fee from the Holding page: the fee comes off what the sale brought in once, on every screen ($975; the account +4.15%, VTI +5.21%) |
| 58 B | A sale's realized gain reads what was paid, for a holding brought in by Import holdings (+$180), added in the holding editor (+$2,050) or bought the same day (+$50) |
| 59 | Sell a holding in full from its page: the page closes, the beginning still counts what it was worth, and the account page, the Performance tab and Home agree ($15,100 → $15,450, +3.71%) |
| 60 | A purchase with no price paid and one with no share count, kept through an editor save: both pages say what is missing, and every figure built from it refuses alike |
| 61 | Correct a buy's price on its ✎ ($100.00 → $98.00), then delete it: every screen moves to the new numbers; a delete the app refuses shows its alert |
| 62 | Update the value of an account built by hand: Net worth, the Performance tab and the account page agree on $8,400, stamped today |

## Performance, viewing — `src/screens/__tests__/performance_journeys_viewing_2026_10_23.test.tsx` (added 2026-10-23, 12 tests)
| # | Flow |
|---|---|
| 63 | The window journey in the founder's household (v17 phone 1): Since → 1M → This year → 1Y → 2Y on the Performance tab, then the account page and the Holding page open on the window picked |
| 64 | Hide balances from the eye on the Performance tab: every dollar hidden on four screens, percents stay, VoiceOver hears "hidden" |
| 65 | A brand-new person: the empty tab → "Add your accounts ›" → Add by hand → phone 4's first day → a holding bought shows |
| 66 | Look back from an alternative's page with nothing held: the fetch works ($2,700 more if you had moved) or fails (the failure line, no figure) |
| 67 | Old prices, a failed refresh, then a pull to refresh that works: the tab, the account page, the Holding page and Home agree |
| 68 | A screen-reader user: Home's card → Net worth; the Performance tab → the account page → the Holding page, each door reached by its spoken action |

## Cash flow, entering — `src/screens/__tests__/cashflow_journeys_entering_2026_10_24.test.tsx` (added 2026-10-24, 14 tests)
| # | Flow |
|---|---|
| 69 | A $6.50 coffee logged from ＋ Expense on Cash flow (Home has no ＋ Expense, his DEC-0039) moves This month, the Expenses tab and Home together, and the rows add up to the totals printed (+$893) |
| 70 | A one-time $2,000 bonus lands in September only, at the rate in force: $7,195 on the Income tab, This month and Home; October $5,396; never again |
| 71 | Base pay, the 401(k) and filing status move all four take-homes together: $6,976 single, $7,403 jointly, $6,963 with $1,500 into the 401(k); a take-home typed the old way shows its gross worked back |
| 72 | A $1,200 December bill: in December only, on the calendar's Dec 15, and in Home's December record; every calendar row adds up as printed |
| 73 | Setting the budget, then changing one category, moves the editor's card, This month, Expenses and Home's record together (not set → +$1,550 → +$1,400) |
| 74 | A $250 car-loan payment agrees across Debts, This month, Home and Net worth ($333,000 → $332,750); a $386.42 payment is offered to the cent |

## Cash flow, viewing — `src/screens/__tests__/cashflow_journeys_viewing_2026_10_24.test.tsx` (added 2026-10-24, 15 tests)
| # | Flow |
|---|---|
| 75 | The tab tour in the founder's household: This month → Income → Expenses → Debts → Home, each as drawn, every total one of This month's own lines |
| 76 | Last month and the month before equal Home's saved records and its month-end sheet ($6,000 · $1,510 · $4,490; $6,000 · $1,030 · $4,970); a late entry is named |
| 77 | A brand-new person enters base pay ($6,000 gross, $500 401(k)); This month and Home fill with Your base pay's ≈$5,022 |
| 78 | Hide balances and a screen reader on the four tabs, the past month and Home: every row heard as hidden, every door reached, every info dot said in words |
| 79 | Filing status single → jointly: $9,650 → $5,720 a year, 22% → 12%, take-home $6,196 → $6,523 on every screen, $327/month more; a fall is said too |
| 80 | A bill edited on the calendar moves only its own month: Car insurance $1,200 → $1,500, December +$300, October and November unchanged |

## Cash flow, the bill check — `src/screens/__tests__/bill_calendar_coming_up_agrees_2026_10_24.test.tsx` (added 2026-10-24, 8 tests)
| # | Flow |
|---|---|
| 81 | Menu → Bill calendar: COMING UP reads the month table at the need-by day; a $100 card added on the Debts tab takes $300 off both the line and November's End |

## Trade sheet, a first buy and the unknowns — `src/screens/__tests__/trade_sheet_first_buy_and_unknowns_2026_10_25.test.tsx` (added 2026-10-25, 8 tests)
| # | Flow |
|---|---|
| 82 | The first buy of an option the account does not hold: the sheet asks its type and shares per contract; 5 contracts at $2.50 are refused against $1,000 of cash; 1 is recorded — cash $750 on the account page, 1 contract worth $250 on its page; a mini option at 10 shares moves $25 |
| 83 | A ticker nothing identifies (UNKNOWN123): Record buy waits for a type; chosen as Other it lists under Alternatives; an older record with no type, corrected on its ✎, reopens Unclassified on the account page and the Performance tab, and Net worth asks what it is |
| 84 | A sale against a purchase whose share count is not on record: refused on the sheet with the reason, in red; recorded and corrected on the ✎, the purchase is kept and the cash takes the sale's $48 |
| 85 | An account built from imported holdings, cash never entered: Available cash reads not entered before and after two buys and nothing is refused; the total reads $10,000 on the account page, the Performance tab and Net worth, and the 1M window keeps Beginning $9,500 · Wealth generated $500 · +5.09% |

## Holdings — `src/screens/__tests__/holdings_fixes_2026_10_25.test.tsx` (added 2026-10-25, 12 tests)
| # | Flow |
|---|---|
| 86 | A buy on the account page of an imported account: the account page, the Holding page and the Performance tab read one 1M window ($9,500 · $500 · +5.09%), with cash entered too ($14,500 · $500), and Net worth the one total |
| 87 | An option bought, listed, traded again, offered for sale and corrected — in contracts on every screen, 100 shares a contract (2 contracts · $2.50, $500); a stock still reads in shares |
| 88 | Cash never entered: the Cash row reads not entered · activity since the import, −$1,000, and VTI $11,000 − $1,000 = Total $10,000 on the account page, Performance and Net worth |
| 89 | A holding the app cannot class, by hand and linked: Net worth asks → Edit holding opens with nothing chosen and Save waits → Other → Alternatives on the account page and Performance, and nothing asks again, through the next sync |
| 90 | A holding with no price in an account built by hand: what was paid on its row, its bar, its page and Net worth — $1,000 + $3,650 + $1,000 = $5,650 |

## Debts — `src/screens/__tests__/add_account_debt_blank_not_zero_2026_10_25.test.tsx` and `src/screens/__tests__/payoff_debts_and_plan_agree_2026_10_25.test.tsx` (added 2026-10-25)
| # | Flow |
|---|---|
| 91 | A card and a mortgage added by hand with boxes left blank: the card's Save waits for its balance, payment and rate; the mortgage's payment is saved as not entered, and Net worth, the Debts tab and This month all say payment not entered; a typed 0 is $0 |
| 92 | A $60,100 loan at 0% with $100 a month: the Debts tab and the Plan tab print one payoff, month 601 (Nov 2076); a payment that cannot cover the interest reads never on both |

## The fix wave of 2026-10-27/30 — no flow added, no flow's outcome moved
The wave added no end-to-end flow; the 92 above still run and are green (the closing full run, 2026-10-31: 10,665 of 10,698 tests pass, 31 skipped, 2 red in no flow file). Five flows check words the wave changed, and each test now reads the new words with its reason on the line:
- **46** and **51** — the curly ’ (Allocate this month’s surplus…, not today’s money), the apostrophe rule DEC-8932.
- **52** — the bill form’s title on its dark-green bar, EDIT THIS BILL (the bar ruling DEC-8915).
- **71** and **79** — the figure bold inside its sentence on the filing comparison; $327/month more is unchanged.
The Cash flow flows 69, 72 to 78 and 80 were re-run after the wave’s Cash flow fixes and are green; the mortgage counted once (DEC-8919) moves no flow’s household.

## Round 3 of the fix wave, 2026-10-31/11-01 — no flow added; four flows' outcomes moved, each worked by hand
- **72** and **80** — with no cash on record the Bill calendar's End reads — (DEC-9279); a typed 0 still projects ($2,980, then $5,960).
- **74** — the payment box is found by its name, not a grey 0 (DEC-9283); the $386.42 payment is unchanged: 14,000 − 386.42 = 13,613.58.
- **75** — the tab tour reads Debts' new DEBT-TO-INCOME, 53.00% · High in the founder's household (DEC-9304).
- **77** — with no retirement age entered the plan's 65 is said as the app's, ours until you change it (DEC-9277).
- **79** finds the filing phone in the drawing by its words; $327/month more is unchanged.
The closing full run, 2026-11-01: 593 suites, 10,904 tests, every red decided.

## Round 4 of the fix wave, 2026-11-01 — no flow added; three flows' figures moved, each worked by hand
- **57** — a buy on a typed $50,000 account: the return is the walk's own, 50,000 ÷ 49,000 − 1 = +2.04% before and after the buy (it read +11.11%, then +11.01%); 2Y +2.06%/year (DEC-9484).
- **63** — the window journey on v17 phone 4 reads the summary +9.76% (it read +9.86%) and E*TRADE +9.34% (DEC-9484).
- **The account page's state I** — 1Y +2.25% on the page, the tab's card and the summary, starting from the Sep 29, 2025 close (it read +7.07% from a close 424 days old) (DEC-9486).
- **The Tax organizer test (CF4-10)** — its household now saves 'annually': wages $60,000, taxable $43,900, tax $5,020 (it read $720,000 from a frequency the app does not have).

## Round 5 of the fix wave, 2026-11-02 — no flow added; figures moved, each worked by hand
- **Debts and its payoff plan** — an owed $30,000 setup loan joins the debts: ‘across 3 debts · $736/month’ ($110 + $300 + $325.58), and the payoff plan pays it: $736/month, paid off Jul 2032, $8,794 of interest (DEC-9591, DEC-9593).
- **The Tax organizer** — $13,170 ÷ $120,000 = 10.975% prints 10.98% (it printed 10.97%) (DEC-9598).
- **Will my money last** — the worker’s growth, 24,480 ÷ 320,000 = 7.65% exactly, prints 7.7% (it printed 7.6%) (DEC-9598).

## Round 6 of the fix wave, 2026-11-02 — no flow added; figures moved, each worked by hand
- **Debts and its payoff plan** — a setup loan’s payment is not assumed: payments $410 (it read $736), the plan $410/month to Oct 2029 with $2,476 of interest (it read Jul 2032 and $8,794) (DEC-9669).
- **The Tax organizer** — a $1,666.67 monthly 401(k) prints $20,000.04 a year, taxable $83,899.96, rate 10.97% (it read 10.98% on a rounded $20,000) (DEC-9674).
- **A Treasury held in a brokerage** — $10,000 at 4.00% earns $400 a year on every screen (it earned nothing) (DEC-9675).

## Beyond the 92 — deeper feature journeys (also automated, also green)
The connect flow (9), the Plan tab (16), draw-order steering (11), the bill calendar (7),
multi-goal (6), scenario compare (3), holding detail (12), Invest fidelity (10), plus the
agreement/mask/persona/edge suites — **1,117 tests total**. The 92 above are the distinct
END-TO-END USER FLOWS; the rest pin the numbers those flows stand on.
