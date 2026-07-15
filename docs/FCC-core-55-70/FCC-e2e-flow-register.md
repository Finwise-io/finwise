# E2E flow register — 56 distinct end-to-end user flows, all automated and green

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

## Beyond the 56 — deeper feature journeys (also automated, also green)
The connect flow (9), the Plan tab (16), draw-order steering (11), the bill calendar (7),
multi-goal (6), scenario compare (3), holding detail (12), Invest fidelity (10), plus the
agreement/mask/persona/edge suites — **1,117 tests total**. The 56 above are the distinct
END-TO-END USER FLOWS; the rest pin the numbers those flows stand on.
