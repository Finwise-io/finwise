"""Where every finding stands, and what closed it. Founder ruling 2026-08-27.

WHY THIS FILE EXISTS, in his words: *capturing a finding without capturing that it is fixed and how
is only partial story which we will confuse in future as we would not know what is fixed versus
not.* He is right, and the muddle had already started — B05 was the one fixed finding, and the
"FIXED" was written into the field that holds its TYPE, so closing it destroyed the record of what
kind of defect it had been.

A finding therefore carries FIVE things, and the first four are never blank:
    found    the date it was written down
    status   OPEN · FIXED · NOT A DEFECT · SUPERSEDED BY
    closed   the date it stopped being open, blank only while OPEN
    how      what actually closed it — the function, the file, the change
    proof    the test that fails if it comes back. A fix with no proof is a claim.

NOT A DEFECT is a real outcome and is recorded, never deleted. Two of these were wrong when I
wrote them; erasing them would hide that the audit itself can be wrong, and the next reader would
have no way to know a finding had been examined and dismissed rather than forgotten.
"""

OPEN = 'OPEN'

# finding → (status, closed, how, proof)
STATUS = {
 'B05': ('FIXED', '2026-08-26',
   'The 401(k) now comes off BEFORE tax in taxableByCalendarMonth, the one function that owns the '
   'taxable base — only in a month with pay, never below zero. incomeMonthlyGrid held a '
   'line-for-line copy of that arithmetic and now calls the shared function instead, because the '
   'rate is divided by one copy and applied to the other. Its own "amount -= c401k" line is gone: '
   'with the subtraction moved before tax, subtracting again took it twice.',
   'src/domain/income/b05_pretax_401k.test.ts — six laws, four of which FAIL on the old code. '
   'Verified by reverting the fix and re-running.'),

 'B02': ('NOT A DEFECT', '2026-08-26',
   'I reported four figures showing planned spending where their labels say spent. Opening the '
   'screens showed all four read LOGGED expenses through budgetVsActual and the store\'s own '
   'totals. Nothing on screen was wrong; the master file named the wrong function.',
   'No test — there was nothing to fix in the code. The master file rows were corrected instead. '
   'Cause: the Function ID column travels through a typed column in the old inventory, which is '
   'S21, and I trusted it without opening the screen.'),

 'A44': ('NOT A DEFECT', '2026-08-26',
   'I said the retirement-pot year convention was undetermined. Reading projectNestEgg showed the '
   'code settles it — a contribution is treated as arriving at the END of its year, and '
   'contributions grow at their own rate, defaulting to zero. The finding was rewritten to say '
   'what is actually missing: the FILE states none of it.',
   'No test. The finding text was corrected on the row.'),

 'A10': ('FIXED', '2026-08-26',
   'The reconcile gate matched identifiers with MK-[A-Z]{2}-[MEIDS]-\\d{3} — a class carrying the '
   'retired E and with no F at all, so no function identifier was ever matched and the '
   'UNKNOWN FUNCTION check had never once run. Now [MFEIDS].',
   'Running the gate now reports on function identifiers where before it silently found none. '
   'No regression test yet — noted as owed.'),

 'A11': ('FIXED', '2026-08-26',
   'The orphan-input check looked for the text "NO INPUT ID", which the builder has never written. '
   'It now reads what the builder actually writes, and splits into three findings that each say '
   'what is true: 74 figures record no input at all, 21 inputs are read by nothing, 12 list '
   'another function\'s answer where raw inputs belong.',
   'The gate went from 9 open findings to 107 — the difference is what it had never been able to '
   'see. No regression test yet — noted as owed.'),

 'A09': ('PARTLY FIXED', '2026-08-27',
   'The function sweep read only EXPORTED functions in three folders. Module-private ones are now '
   'read too: 455 → 533, which brought in the retirement simulation, the bond pricer and the '
   'mortgage maths. MoneyKeel/functions was added to the swept roots on 2026-08-27 so new code '
   'cannot land invisible.',
   'STILL OPEN in part: src/onboarding, src/components, src/store and src/utils are not swept — '
   '77 functions doing arithmetic, including recomputeBalances, which builds the account balance '
   'net worth is made of. Counted, not estimated.'),

 'A13': ('NAMED, NOT FIXED', '2026-08-26',
   'Eleven names are declared at 26 places — round2 five times, and moneyWeightedReturn twice as '
   'two genuinely different methods. Every generated header at those sites now says so in as many '
   'words, and names the other places.',
   'Honesty, not a guard. Build-spec item B4 would enforce it and is not built.'),

 # ── 2026-09-12: the August findings re-verified against the screen and the code, one by one ──
 'A01': ('FIXED', '2026-09-10',
   'The typed VERIFIED literal is gone. Every row carries a stage from one vocabulary (WAITING ON YOU · RULED, NOT CODED · CODED, NOT TESTED · TESTED, NOT VERIFIED · VERIFIED) computed from what is on the row, and only the founder\'s own words in "ROW VERIFIED — founder, date and how" make a row VERIFIED (moneykeel_keep.py reads that column back).',
   'The builder: a row with nothing in his column can never read VERIFIED.'),
 'A06': ('FIXED', '2026-09-08',
   'G29: MK-NW-M-006 carries both forms of its formula; the Specification counts are computed by the build, never typed.',
   'The build.'),
 'A12': ('OPEN — YOUR DECISION', '2026-09-12',
   'Two return methods still share one name (moneyWeightedReturn = bisection IRR in moneyWeighted.ts; portfolioPeriodReturn = value-weighted average in performance/index.ts; modifiedDietzOverWindow in the function). Brief E3 asks for the rename to value-weighted; A14 and B06 are the same question: which method is THE return on screen.',
   'Waiting on the founder (workplan row "Three brief items that need your word").'),
 'A14': ('OPEN — YOUR DECISION', '2026-09-12',
   'Same decision as A12 / B06 / E3.',
   ''),
 'A16': ('FIXED', '2026-09-12',
   'The two notes-to-myself the extractor wrote into the assumptions column ("Leaves some rows out of the answer — check which" and "Multiplies by 100 — check whether …") are removed from moneykeel_functions.py. A real assumption of that kind is declared by hand in ASSUMPTIONS_EXTRA.',
   'The rebuilt master carries neither phrase.'),
 'A18': ('FIXED', '2026-09-12',
   '"Treats a year as twelve equal months" now fires only when an ANNUAL figure is divided by twelve; the "30 days" phrase is removed. A month index divided by twelve no longer reads as an assumption.',
   'The rebuilt master.'),
 'A23': ('FIXED', '2026-09-08',
   'C4: round2 reclassified as 3 · DEPENDENT through CATEGORY_OVERRIDES; after Q49 no calculation calls it.',
   'The header guard.'),
 'A27': ('FIXED', '2026-09-08',
   'G18: the maths column of MK-XS-M-004 now states the value-weighted average — the same arithmetic as the words. Which method is THE return stays open under A12.',
   'The formula-agreement gate.'),
 'A28': ('FIXED', '2026-09-08',
   'C2 / G17: no band, 1,000 futures everywhere (the 500 fallback is gone), nearest 5 — the three columns say one thing.',
   'simulation_paths.test.ts.'),
 'A29': ('FIXED', '2026-09-12',
   'The maths column of MK-XS-M-003 now names the CLASSES the code uses — Stocks / Funds, Bonds & CDs, Alternatives, Unclassified (mixed) — not brokerage / retirement / other investments. The code (investmentsTotal) was right; the file was wrong.',
   'The override on the row; the formula-agreement gate for the function.'),
 'A30': ('FIXED', '2026-09-08',
   'G20: the straight-line approximation is stated in both columns of MK-NW-M-026; the root solve was never in the code.',
   'The formula-agreement gate.'),
 'A31': ('FIXED', '2026-08-27',
   'The formula on the row is read from the code and says 365.25.',
   'The formula-agreement gate.'),
 'A32': ('FIXED', '2026-09-12',
   'MK-NW-M-028 now names MK-NW-F-064 bondRateSensitivity and states what it does: reprice every cash flow at the yield ± 1%. No duration is computed and the file no longer claims one.',
   'The override on the row.'),
 'A33': ('OPEN — YOUR DECISION', '2026-09-12',
   'Yield to maturity compounds annually over whole years; US bonds pay semi-annually and quote a bond-equivalent yield. Neither the file nor the code names the convention. Put to the founder with the bond-display question (Q38).',
   ''),
 'A34': ('FIXED', '2026-09-12',
   'The code was right (long-term begins the day after the first anniversary); the file said ≥ 365 whole days — one day early. Both formula columns on MK-NW-M-036 and MK-NW-M-037 now state the IRS rule.',
   'src/domain/performance/performance.test.ts (the day-after-anniversary rule); the override on the rows.'),
 'A35': ('FIXED', '2026-09-01',
   'The Uniform Lifetime table in Calculation Module code/engines/rmd.ts is typed in whole, 72 to 120+, checked against the published IRS table — the interpolated gaps at 93, 94, 97, 98 and 99 are gone.',
   'src/domain/decumulation/decumulation.test.ts.'),
 'A36': ('FIXED', '2026-09-12',
   'rmdStartAge now carries the whole SECURE 2.0 schedule: 70½ for those born before 1949, 72 for 1949–1950, 73 for 1951–1959, 75 from 1960. A missing birth year is taken as 73 and SAID on the row as an assumption.',
   'src/domain/decumulation/rmd_start_age.test.ts.'),
 'A37': ('OPEN — DECLARED', '2026-09-12',
   'The Joint Life and Last Survivor table (spouse more than ten years younger as sole beneficiary) is not modelled. The assumption is now declared on the rmdAtAge row; whether the screen should say it is put to the founder.',
   ''),
 'A38': ('FIXED', '2026-09-12',
   'ssClaimFactorFor no longer rounds the claim age to a whole year — 62 and 6 months is priced as 54 months early, not 48.',
   'src/domain/retirement/ssTiming.test.ts (A38).'),
 'A39': ('FIXED', '2026-09-12',
   'fullRetirementAge carries the whole published schedule: 65 for 1937 and earlier, 65 plus two months a year for 1938–1942, 66 for 1943–1954, then two months a year to 67.',
   'src/domain/retirement/ssTiming.test.ts (A39).'),
 'A40': ('OPEN — DECLARED', '2026-09-12',
   'ssLifetimeTotal is a real-terms total (no cost-of-living rise, no discounting) and the row now says so; the retirement paycheck grows Social Security with inflation. Whether the claim-age screen should say "in today\'s dollars" is put to the founder.',
   ''),
 'A41': ('OPEN', '2026-09-12',
   'Kind-A figures still name no publication and year in the FILE. Build-spec guard D4 (a published-source register the builder reads and a test that every statutory constant is in it) is the fix — workplan row "Build the four missing guards".',
   ''),
 'A42': ('OPEN — DECLARED', '2026-09-12',
   "rothConversionCost does stack the conversion on the year's other ordinary income; IRMAA and the net-investment-income tax are not modelled. Declared on the row; whether to model IRMAA is put to the founder.",
   ''),
 'A43': ('FIXED', '2026-09-12',
   "MK-PL-M-031 now names MK-CF-F-034 payoffPlan and its words say what the code does — avalanche or snowball order, a cleared debt's payment rolling into the next.",
   'The override on the row.'),
 'A45': ('FIXED', '2026-09-12',
   'educationPlan compounds today\'s savings to the start and solves a level contribution as an annuity at the assumed return — the code had moved on; the file still said "no return whatever". MK-PL-M-036 and MK-PL-M-037 now name MK-PL-F-033 and state the annuity.',
   'The override on the rows.'),
 'A46': ('FIXED', '2026-09-11',
   'Founder ruling A46 executed: no coupon rate → $0, the 4.2% constants deleted in MK-NW-F-063 and MK-CF-F-184.',
   'src/domain/bonds/a46_a47_coupon_and_accrued.test.ts.'),
 'A47': ('FIXED', '2026-09-11',
   'Founder ruling A47 executed: accrued interest (MK-XS-I-065) is subtracted before the yield when entered; MK-NW-F-070 says so when it is not.',
   'src/domain/bonds/a46_a47_coupon_and_accrued.test.ts.'),
 'A49': ('FIXED', '2026-09-12',
   'Checked 2026-09-12: no row on any screen tab has an empty "Name on Screen" (0 of 164).',
   'The check is repeatable from the file.'),
 'A50': ('OPEN', '2026-09-12',
   "The CSV import road still classifies with hasSecurityIdentity: true and no institution type or person's answer (assetClassForSymbol, holdingsImport.ts). The person's own class survives afterwards through class_source (B7), so the first two rules are skipped only at import time. Workplan row.",
   ''),
 'A51': ('NOT A DEFECT', '2026-09-08',
   "There is no 1% rule in the code: requiredPayment is the larger of the stated minimum and the payment the person chose, and 0 for a debt due in full. G19 ruled the row's wording ok — the file now states the code's rule.",
   'The formula-agreement gate.'),
 'B01': ('FIXED', '2026-09-08',
   'See A51 — the file\'s "interest + 1%" was the error; MK-NW-M-011 states the code\'s rule (G19).',
   'The formula-agreement gate.'),
 'B03': ('FIXED', '2026-09-08',
   'G21 / Q47: the emergency-fund months divide by the ONE essentials figure, MK-CF-F-190 essentialsMonthly — logged essentials, else the typed figure.',
   'src/screens/__tests__/g21_essentials_screens.test.tsx.'),
 'B04': ('FIXED', '2026-08-27',
   'MK-MN-M-014\'s formula is read from employerMatchMonthly: a percentage of the person\'s own contribution or a flat monthly amount — no "× pay", no "a year".',
   'The formula-agreement gate.'),
 'B06': ('OPEN — YOUR DECISION', '2026-09-12',
   'Same decision as A12 / E3.',
   ''),
 'B07': ('FIXED', '2026-09-12',
   'See A29.',
   ''),
 'B08': ('FIXED', '2026-08-27',
   'See A31.',
   ''),
 'B09': ('FIXED', '2026-09-08',
   'See A30 / G20.',
   ''),
 'B10': ('FIXED', '2026-09-12',
   'See A34 / E7.',
   ''),
 'B11': ('FIXED', '2026-09-12',
   'The pot formula on the projectNestEgg header is read from the code — (1 + g)^y × (1 + r)^(n − y − 1) — and the end-of-year convention and the zero default growth are now declared on the row (ASSUMPTIONS_EXTRA).',
   'The formula-agreement gate.'),
 'B12': ('FIXED', '2026-09-12',
   'MK-NW-M-022 is a count of records; it names no function now and says so. MK-XS-F-111 stays on the "since" date only.',
   'The override on the row.'),
 'B13': ('FIXED', '2026-09-12',
   'MK-XS-M-002 and MK-PL-M-034 name both the door (MK-PL-F-068) and the simulation (MK-PL-F-050).',
   'The override on the rows.'),
 'B14': ('FIXED', '2026-09-12',
   'MK-NW-M-018 and MK-PL-M-016 name the balance input (MK-XS-I-001, or price × quantity) and keep valueFreshness for the "as of" only.',
   'The override on the rows.'),
 'B15': ('FIXED', '2026-08-27',
   'The formula on MK-NW-M-008 / MK-NW-M-020 is read from accountClassBreakdown and opens with "nothing when the account is not CONNECTED".',
   'The formula-agreement gate.'),
 'B16': ('FIXED', '2026-09-12',
   'MK-NW-M-032 "Price paid (average)" names MK-PF-F-003 avgCost = cost basis ÷ shares.',
   'The override on the row.'),
 'B17': ('FIXED', '2026-09-12',
   'The seven Income rows name MK-CF-O-004 incomeSummary — per source, gross and take-home, a year and a month — the Build 54 orchestrator, not totalGrossAnnual.',
   'The override on the rows.'),
 'B18': ('FIXED', '2026-09-12',
   'Ending value and the per-account ending value name MK-ST-F-031 valueOn; wealth generated states ending − beginning − net money in; the walk (MK-XS-F-011) stays on HOW $X BECAME $Y only.',
   'The override on the rows.'),
 'B19': ('FIXED', '2026-09-12',
   "Monthly debt payments names MK-CF-F-024 totalDebtMonthly; each debt's balance is an input; DEBTS and net worth keep buildDebtState / MK-NW-F-065.",
   'The override on the rows.'),
 'B20': ('FIXED', '2026-08-27',
   "MK-CF-M-010's formula is read from rentalNetAnnual: (income − costs) each month × 12.",
   'The formula-agreement gate.'),
 'B21': ('FIXED', '2026-09-12',
   "MK-NW-M-005 now states the connected account's cash slice.",
   'The override on the row.'),
 'B22': ('FIXED', '2026-09-12',
   'MK-NW-M-031 states what a sale does: shares are removed from the lots, never a negative lot; a value-only sale lowers the balance.',
   'The override on the row.'),
 'B23': ('FIXED', '2026-09-12',
   'MK-NW-M-001 states that the subtraction is done on the screen with no function on record — a D1 case, listed for the guard.',
   'The override on the row.'),
 'B24': ('OPEN', '2026-09-12',
   '59 of 164 figures name no function today (69 on 2026-08-26). Each needs its producer named, or a statement that it is an input shown directly. Workplan row.',
   ''),
 'B25': ('FIXED', '2026-09-12',
   'MK-XS-M-006 and MK-CF-M-018 list all eleven sources the grid lands, the signing bonus among them.',
   'The override on the rows.'),
 'B26': ('OPEN — RE-VERIFY ON DEVICE', '2026-09-12',
   'In − Out = surplus is now by construction from the one month cell (B46 finding 7). The pace card\'s "of $X planned" still comes from the itemised categories (planned_total), which fall back to the stated total. To be walked on the Build 55 device test with no categories set.',
   ''),
 'B27': ('FIXED', '2026-09-01',
   'Build 54: take-home typed by the person is used as entered (takeHomeAsEntered, MK-CF-F-144) and the deductions are derived from it — no gross-up round trip.',
   'MoneyKeel/functions/cashflow/base-pay.test.ts.'),
 'B28': ('FIXED', '2026-08-27',
   'The radar rule in MoneyKeel/functions/cashflow/spending.ts: a credit-card or HELOC payment is always a radar item; recurring debt never.',
   'MoneyKeel/functions/cashflow/spending.test.ts.'),
 'B29': ('FIXED', '2026-08-27',
   'One employerMatchMonthly (income/onboarding.ts); modules.tsx re-exports it and its inline copy is removed.',
   'grep: one declaration.'),
 'B30': ('FIXED', '2026-09-11',
   'The toggle reads "Gross (before any deductions)" and "Take-home" (cluster 8); take-home is defined in the glossary as after tax and the 401(k).',
   'one_term_per_concept.test.ts.'),
 'B31': ('FIXED', '2026-08-27',
   'The Filing-status screen writes filingStatus and over65Who; the single-filer fallback fires only until it is answered, and the screen asks.',
   'src/screens/__tests__ (Filing status).'),
 'B32': ('FIXED', '2026-09-01',
   'Build 54: two earners, each with a wage (partnerWage), one tax function (MK-CF-O-001 basePay).',
   'MoneyKeel/functions/cashflow/base-pay.test.ts.'),
 'B33': ('FIXED', '2026-09-08',
   'G3: over65Who counts both on a joint return; the senior deduction per person 65+.',
   'src/domain/income tax tests.'),
 'B34': ('OPEN — YOUR DECISION', '2026-09-12',
   "Investment income (invAnnual) is still added to the monthly take-home grid through extraIncome (MK-CF-F-071). Whether dividends and interest count as money to spend, or as income that stays invested, is the founder's call — put to him with specifics.",
   ''),
}


def of(finding):
    """(status, closed, how, proof) — OPEN and blank when nothing is recorded."""
    return STATUS.get(finding, (OPEN, '', '', ''))


def cell(finding, found_date='2026-08-26'):
    """What the master file shows for this finding's lifecycle. Never blank."""
    st, closed, how, proof = of(finding)
    if st == OPEN:
        return ('OPEN since %s — nothing has closed this. It is not known to be wrong; it is known '
                'to be unaddressed.' % found_date)
    head = '%s %s' % (st, closed)
    out = [head, '', 'WHAT CLOSED IT — ' + how]
    if proof:
        out += ['', 'WHAT PROVES IT — ' + proof]
    return '\n'.join(out)
