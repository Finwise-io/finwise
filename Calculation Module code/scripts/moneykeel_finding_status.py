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
