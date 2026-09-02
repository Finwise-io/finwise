"""The 2026-08-26 formula audit — every figure's formula against the formula of the function it names.

Two comparisons were made across all 163 figures:
  1. does the figure's arithmetic say the same thing as the arithmetic of the function in its
     Function ID column?
  2. where two figures name the SAME function, do they carry the same arithmetic?

Findings are B01 upwards, given once and never renumbered, the same rule the questions and the
A-series audit follow. Every one below was checked against the code file and line named in it —
none is inferred from the two spreadsheet cells alone.

Three kinds, kept apart on purpose:
  CLASH        the figure's formula states a rule the code does not implement. A real defect.
  MISNAMED     the formula and the function it names are about different things.
  ONE FORMULA  figures that are NOT the same figure carrying one formula between them.
"""

COLUMN = 'Formula audit — metric vs the function it names (2026-08-26)'

FINDINGS = [

 # ── CLASH — the file states a rule the code does not have ──────────────────────────────────
 ('B01','CLASH', 'The file says the required payment is "the stated minimum, or interest + 1% of '
   'balance when none is stated". The code (requiredPayment, src/domain/debt/index.ts:44) is the '
   'LARGER of the stated minimum and the payment the person chose, falling back to the stated '
   'minimum — and ZERO for a debt due in full as a lump. There is no interest term and no 1% '
   'anywhere in the debt code. The file describes a rule that was never built.'),
 ('B02','CLASH', 'The file says "spent in a bucket = Σ(expenses this month in that bucket)". The '
   'code (spendBuckets, src/domain/budget/index.ts:72) reads the PLANNED categories the person set '
   'up, or the older planned fields — it never looks at a logged expense at all. Planned is being '
   'shown where spent is promised. One of these figures is labelled "Using $X/mo from your LOGGED '
   'spending" on screen, which makes it a wrong word in front of the person as well as a wrong '
   'number. This is the same class as bug B-24.'),
 ('B03','CLASH', 'The file says "months of cushion = cash ÷ ESSENTIALS a month". The figure routes '
   'through plannedMonthlySpend (src/domain/budget/index.ts:45), which is the larger of every '
   'planned category added up and the stated total — ALL spending, wants included. A '
   'monthlyEssentials function exists three screens away (line 158) and separates needs from wants; '
   'this figure does not call it. Dividing by a bigger number makes the cushion read SHORTER than '
   'it is, which is the safe direction but is still not what the label says.'),
 ('B04','CLASH', 'The file says "match a year = the employer\'s stated rate × PAY, capped at the '
   'stated limit". The code (employerMatchMonthly, src/domain/income/onboarding.ts:263) is the rate '
   'applied to the person\'s OWN 401(k) contribution, not to pay; it is a MONTH, not a year; and '
   'there is NO CAP in it at all. Three differences on one row, and the missing cap is the one that '
   'overstates the match.'),
 ('B05','CLASH', 'The file said taxable income = gross − pre-tax contributions − '
   'the deduction, and the code (taxableByCalendarMonth, src/domain/income/onboarding.ts) never '
   'took the 401(k) off. Tax was charged on money that never reached the person — $4,400 a year '
   'too much on a $120,000 salary putting in $20,000 — and because the withholding rate is worked '
   'out as tax ÷ that same base, the error reached take-home, monthly surplus, planned spend, '
   'essentials, the emergency test, savings by month and the whole snapshot: 17 functions in all. '
   'NOW: the contribution comes off before tax, in the one function that owns the taxable base, '
   'only in a month with pay, never below zero. incomeMonthlyGrid had a line-for-line COPY of that '
   'arithmetic; it now calls the shared function, because the rate is divided by one copy and '
   'applied to the other and fixing one alone gave a different wrong answer. The grid\'s own '
   '"amount -= c401k" line is gone — with the subtraction moved before tax, subtracting again took '
   'it twice. Pinned by five laws in b05_pretax_401k.test.ts, four of which fail on the old code.'),
 ('B06','CLASH', 'Two different return methods. The file states Modified Dietz — (ending − '
   'beginning − net money in) ÷ (beginning + flows weighted by when they arrived). The code '
   '(portfolioPeriodReturn) is Σ(each holding\'s return × its value) ÷ Σ(value), a value-weighted '
   'AVERAGE of holding returns. Different methods give different answers, and neither is what the '
   'other says. Also finding A27.'),
 ('B07','CLASH', 'Three different lists of what counts as an investment for one figure. The '
   'arithmetic says {brokerage, retirement, other investments}. The code (investmentsTotal) says '
   '{stocks_etf, bonds, alternatives, MIXED}. The plain-English column says {Stocks / Funds, Bonds '
   '& CDs, Alternatives, UNCLASSIFIED}. Whether an unclassified account is counted as an investment '
   'depends on which of the three a person reads. Also finding A29.'),
 ('B08','CLASH', 'The file divides by 365 days; the code (yearsToMaturity) divides by 365.25. Also '
   'finding A31.'),
 ('B09','CLASH', 'The file states the root solve — the rate that discounts every coupon and the '
   'face value back to the price. The code (approxYTM) is the straight-line approximation, 4 to 27 '
   'basis points away. Also finding A30.'),
 ('B10','CLASH', 'The file says a lot is long-term when held "≥ 365 whole days". The code (capGains) '
   'says long-term begins the day AFTER the first anniversary — exactly one year is still short '
   'term, which is the IRS rule. The file is one day early and mislabels the tax on a gain at the '
   'boundary. Also finding A34.'),
 ('B11','CLASH', 'The file writes the pot as balance × (1+r)^n + Σ(contribution × (1+r)^(n−year)). '
   'The code (projectNestEgg) also grows each year\'s contribution at its own rate, (1+g)^y, and '
   'compounds it for (n − y − 1) years — an END-of-year contribution. Neither the growth rate nor '
   'the year convention is in the file, and the convention alone moves the answer by a factor of '
   '(1+r). Also finding A44.'),
 ('B20','CLASH', 'The file says "rental net a year = rent received − running costs". The code '
   '(rentalNetAnnual) is Σ(income − expenses) × 12 — the inputs are MONTHLY and the twelve is what '
   'makes it a year. As written, the file\'s formula gives a month and calls it a year.'),
 ('B21','CLASH', 'The file says cash is the balance of every account whose class is Cash. The code '
   '(cashTotal) also adds the CASH PORTION of a connected account\'s class breakdown — a brokerage '
   'that is 10% cash contributes that 10%. The file\'s formula misses that path entirely, so it '
   'understates cash for anyone with a connected account.'),
 ('B22','CLASH', 'The file says "quantity = Σ(shares bought) − Σ(shares sold)". The code '
   '(totalShares) is Σ(shares on each lot). Whether selling reduces a lot or adds a negative one is '
   'stated nowhere; if it does neither, the two answers part company the first time anything is '
   'sold.'),
 ('B25','CLASH', 'The money-in formula lists salary, tips, rental ÷ 12, bonus and equity vesting. '
   'The code (incomeMonthlyGrid) also adds a SIGNING BONUS. A whole income source is missing from '
   'the file\'s arithmetic.'),

 # ── MISNAMED — the formula and the function are about different things ──────────────────────
 ('B12','MISNAMED', 'The figure is a COUNT of records. The function it names, MK-XS-F-111 '
   'mergeHistoryFrom, returns the earlier of two dates. The two have nothing to do with each other, '
   'so the figure has no function on record and does not know it.'),
 ('B13','MISNAMED', 'The figure is the thousand-futures simulation. The function it names, '
   'MK-PL-F-068 selectWillItLast, is the GATE that decides whether the question can be answered at '
   'all — it checks an age, a spending figure and a nest egg are present. The simulation is a '
   'different function and is named on no row of this file.'),
 ('B14','MISNAMED', 'The figure is "the balance last recorded". The function it names, MK-NW-F-003 '
   'valueFreshness, answers HOW OLD that balance is — and answers nothing at all for a live-priced '
   'account. It does not produce the value. The age half of the formula matches; the value half has '
   'no function behind it.'),
 ('B15','MISNAMED', 'The formula claims to split ANY account into its classes — value in class k = '
   'balance × weight(k). The first line of the function it names (accountClassBreakdown) is '
   '"nothing when the account is not CONNECTED". For a typed or imported account it answers '
   'nothing, and the formula does not say so.'),
 ('B23','MISNAMED', 'The formula has two halves: the series, and the change over the year. The '
   'function it names (trendPoints) only builds and sorts the series. The subtraction that makes '
   'the headline change is done somewhere with no function on record.'),

 # ── ONE FORMULA on figures that are not the same figure ─────────────────────────────────────
 ('B16','ONE FORMULA', '"Price paid (average)" and "Total paid" carry the SAME formula and name the '
   'SAME function, costBasis — which returns the total only. The average is a separate function '
   '(avgCost = cost basis ÷ shares) and is named on no row, so one of these two figures is '
   'documented as something it is not.'),
 ('B17','ONE FORMULA', 'Seven figures share one formula and one function, totalGrossAnnual, which '
   'returns GROSS A YEAR and nothing else: "net a year", "Gross / year", "Net / month", and the '
   'four per-source rows (Base salary, Self-employment, Bonus, each income source). Neither net '
   'figure is what the function returns, and a single source is not the total. Six of the seven '
   'need their own formula.'),
 ('B18','ONE FORMULA', 'Four figures share the change-walk identity — "Ending value", "Wealth '
   'generated", "HOW $X BECAME $Y", "Ending market value (per account)". The identity is the frame '
   'they all sit in, not the arithmetic of any one of them. Wealth generated is not ending value, '
   'and one of the four is per account while the others are for everything.'),
 ('B19','ONE FORMULA', 'Four figures share one formula naming buildDebtState — what is owed, each '
   'debt\'s balance, the MONTHLY DEBT PAYMENT, and net worth. buildDebtState returns the total '
   'owed; the monthly payment comes from a different function (requiredPayment, summed), and net '
   'worth is a different figure again.'),

 # ── found while designing the cash-flow screens, 2026-08-26/27 ─────────────────────────────
 ('B26','CLASH', 'TWO DEFINITIONS OF "PLANNED" ON ONE CARD. This month shows "Out (bills + debt)" '
   'from the dated grid (cell.outflow) and, four rows below, "of $X planned" from spendBuckets — '
   'the itemised categories only. With no categories set the second is ZERO while the first is the '
   'whole month, so the card reads "Out $8,321 ... Spent $45 of $0 planned". The pace bar is '
   'measured against nothing. plannedMonthlySpend (MK-CF-F-002) is the canonical planned figure '
   'and the screen does not call it. CashFlowScreen.tsx:588 and :598.'),
 ('B27','CLASH', 'TAKE-HOME TYPED BY THE PERSON IS NOT WHAT THEY SEE. When salaryMode is '
   '"takehome" the app grosses the entered figure up (grossFromNet, tax.ts:172), then taxes it '
   'back down. grossFromNet adds back TAX ONLY — but take-home already has the 401(k) out of it, '
   'so the contribution is removed twice. Someone typing $4,818 a month with $20,000 a year going '
   'into a 401(k) is shown $3,351 — $1,467 a month adrift. Pre-existing; B05 improved it by $200 '
   'and left the cause. The founder\'s ruling 2026-08-27: what is entered as take-home IS '
   'take-home, used as typed, never grossed up.'),
 ('B28','CLASH', 'THE BIG-TICKET RADAR IS BACKWARDS. It flags any bill over $500 from the grid, '
   'and debt payments join the grid as bills — so the MORTGAGE is flagged every single month, '
   'which teaches people to ignore the section. Meanwhile an unusual credit-card payment is tested '
   'against the mean of ALL logged "Debt payment" expenses — mortgage, car and card averaged '
   'together — so a $1,850 payment against a usual $195 is compared to a bar near $3,120 and stays '
   'QUIET. It shows the payment that never changes and hides the one that does. '
   'CashFlowScreen.tsx:462.'),
 ('B29','CLASH', 'THE EMPLOYER MATCH IS WRITTEN THREE TIMES. employerMatchMonthly exists in '
   'src/domain/income/onboarding.ts:936 AND src/onboarding/modules.tsx:372, and the same expression '
   'is written inline a third time at modules.tsx:821. They agree today and nothing keeps them '
   'agreeing. Invisible to the file because src/onboarding is not one of the three folders the '
   'function sweep reads — one of 77 functions doing arithmetic outside them.'),
 ('B30','CLASH', 'THE QUESTION DOES NOT SAY WHAT IT MEANS. The income screen offers a Gross / '
   'Take-home toggle and asks "Take-home pay each month". Most people read take-home as AFTER TAX; '
   'the app stores it as after tax AND after the 401(k) — its own code calls that "available" and '
   'keeps a separate "net (after tax)" concept the question never offers. So someone entering an '
   'after-tax figure has their 401(k) removed a second time. Founder wording 2026-08-27: ask for '
   '"the amount that lands in your bank account", which nobody confuses.'),

 # ── found while designing the filing-status question, 2026-08-27 ───────────────────────────
 ('B31','CLASH', 'NOBODY HAS EVER SET A FILING STATUS. filingStatusOf reads op.filingStatus, no '
   'screen anywhere writes it, so the fallback fires every time and EVERYONE is taxed as a single '
   'filer — including the couple who just told the app they have a partner. Five surfaces read it '
   'and all five get single: every month\'s withholding rate, the effective rate, the Roth '
   'conversion, the retirement tax rate, and the base-pay estimate. On $84,000 a married couple is '
   'shown $328 a month less than lands in their bank; at $200,000 it is $866. The app already asks '
   'whether they have a partner and still taxes them alone.'),
 ('B32','CLASH', 'THE HOUSEHOLD\'S INCOME IS ONE PERSON\'S. Net worth is a household, the debts '
   'are a household, the spending is a household — the income is not. There is exactly one salary '
   'field, and whoEarns (You / Partner / Both) only LABELS whose it is; there is no second amount '
   'anywhere, and none of the extra-income fields is a second wage. So a couple sees one income '
   'against two people\'s spending and two people\'s debts, and their surplus reads far worse '
   'than it is on every screen that uses it. Separately, the joint tax bracket is worked out from '
   'that one income: on $84,000 with a partner earning $54,000 the marginal band should be 22% and '
   'reads 12%, which alone puts take-home $168 a month too high.'),
 ('B33','CLASH', 'THE OVER-65 ADDITION COUNTS ONE PERSON ON A JOINT RETURN. over65CountOf reads the '
   'person\'s own birth year and returns 0 or 1 — a couple where both are 65 or older is counted '
   'as one, so the standard deduction is short by $1,650. Recorded in the 2026-08-20 brief as '
   'deliberately conservative because a partner\'s age was never captured; the filing-status '
   'question is where it can be captured, which removes the reason.'),

 ('B34','CLASH', 'INTEREST AND DIVIDENDS ARE COUNTED AS MONEY YOU CAN SPEND. invAnnual flows '
   'through extraIncome into ex.taxableMonthly, which lands in incomeMonthlyGrid '
   '(src/domain/income/onboarding.ts:1386) — the grid that produces TAKE-HOME. But dividends and '
   'interest are normally reinvested; they never reach the bank account. So every surplus, every '
   'runway and every savings figure is too generous by that amount — $250 a month on $3,000 a '
   'year. They are TAXABLE and they are not SPENDABLE, and the app has only one bucket for both. '
   '[Founder 2026-08-27] They belong in what income is taxed on, never in what lands.'),
 ('B35','CLASH', 'INTEREST AND DIVIDENDS ARE ASKED FOR WHEN THEY CAN BE CALCULATED. The app holds '
   'the accounts and the holdings, and interestIncomeAnnual (src/domain/bonds/index.ts:286) already '
   'works out the interest side. Asking a person to type a figure the app can compute invites a '
   'second, different answer to the same question — and nothing reconciles the two. [Founder '
   '2026-08-27] Show what the holdings say, let them correct it, and show both figures where they '
   'disagree rather than silently picking one.'),

 # ── what could not be compared ─────────────────────────────────────────────────────────────
 ('B24','NOT COMPARABLE', 'This figure names no function, so its formula cannot be checked against '
   'anything. 69 of the 163 figures are in this position — the audit covers the 94 that name one.'),
]

# The findings that change a NUMBER OR A WORD a person reads on the three screens being built
# first — cash flow "This month", cash flow "Spending", and the base-salary income screen.
# Everything else on those rows is the FILE being wrong while the app is right, which is real work
# but not a wrong number in front of anyone. Marked 2026-08-27 at the founder's request.
ACCURACY_NOW = {
  'B26': 'This month · Spending — the pace bar measures against nothing when no categories are set',
  'B27': 'Base salary · This month — take-home shown up to $1,600/mo adrift from what was typed',
  'B28': 'Spending — the radar flags the mortgage monthly and hides an unusual card payment',
  'B01': 'This month — a debt with no stated minimum shows $0/mo and prefills the pay dialog with $0',
  'B30': 'Base salary — the question invites the wrong figure, which is then double-deducted',
  'B29': 'Base salary — three copies of the match arithmetic, free to drift apart',
  'B11': 'This month — the future-paycheck figure omits contribution growth the code applies',
  'B31': 'Base salary · This month — every couple taxed as a single filer, $328–$866/mo too low',
  'B32': "Base salary · This month · Spending — the household's income is one person's, so the surplus reads far worse than it is",
  'B33': 'Base salary — a couple both over 65 is counted as one, $1,650 of deduction short',
  'B34': 'This month · Spending — dividends counted as spendable, so surplus reads $250/mo too high',
}
# Waiting on the card provider — cannot be built or verified until a connection exists
PARKED_ON_PROVIDER = {
  'the by-hand / imported split of actual spend',
  'the imported purchase list',
  'the plus-or-minus three day receipt-to-import match',
}

TEXT  = {n: t for n, k, t in FINDINGS}
KIND  = {n: k for n, k, t in FINDINGS}

ON_ROW = {
 # the five found while designing the cash-flow screens
 'MK-CF-M-019': ['B26','B01','B02'],
 'MK-CF-M-016': ['B28'],   # BIG-TICKET RADAR — the row the radar rule lands on
 'MK-XS-M-005': ['B26'],
 'MK-CF-M-015': ['B26'],
 'MK-CF-M-006': ['B27','B30','B29','B31','B32','B33','B17'],
 'MK-CF-M-007': ['B32'],
 'MK-MN-M-027': ['B31','B32'],
 'MK-MN-M-028': ['B31','B32'],
 'MK-XS-M-006': ['B27','B34','B25'],
 'MK-CF-M-018': ['B27','B34','B25'],
 'MK-MN-M-014': ['B29','B04'],
 'MK-NW-M-011': ['B01'], 'MK-CF-M-019': ['B01','B02'],
 'MK-CF-M-013': ['B02'], 'MK-CF-M-014': ['B02'], 'MK-MN-M-021': ['B02'],
 'MK-NW-M-014': ['B03'], 'MK-MN-M-026': ['B03'],
 'MK-MN-M-027': ['B05'], 'MK-MN-M-028': ['B05'],
 'MK-XS-M-004': ['B06'], 'MK-XS-M-003': ['B07'],
 'MK-NW-M-025': ['B08'], 'MK-NW-M-026': ['B09'],
 'MK-NW-M-036': ['B10'], 'MK-NW-M-037': ['B10'],
 'MK-NW-M-015': ['B11'], 'MK-PL-M-026': ['B11'], 'MK-PL-M-033': ['B11'], 'MK-CF-M-022': ['B11'],
 'MK-CF-M-010': ['B20'], 'MK-NW-M-005': ['B21'], 'MK-NW-M-031': ['B22'],
 'MK-NW-M-022': ['B12'], 'MK-XS-M-002': ['B13'], 'MK-PL-M-034': ['B13'],
 'MK-NW-M-018': ['B14'], 'MK-PL-M-016': ['B14'],
 'MK-NW-M-008': ['B15'], 'MK-NW-M-020': ['B15'],
 'MK-NW-M-001': ['B23'], 'MK-NW-M-003': ['B23'],
 'MK-NW-M-032': ['B16'], 'MK-NW-M-033': ['B16'],
 'MK-MN-M-011': ['B17'], 'MK-MN-M-012': ['B17'], 'MK-MN-M-013': ['B17'], 'MK-CF-M-007': ['B17'], 'MK-CF-M-008': ['B17'], 'MK-CF-M-027': ['B17'],
 'MK-PF-M-001': ['B18'], 'MK-PF-M-002': ['B18'], 'MK-PF-M-003': ['B18'], 'MK-PF-M-004': ['B18'],
 'MK-NW-M-009': ['B19'], 'MK-NW-M-010': ['B19'], 'MK-NW-M-012': ['B19'], 'MK-NW-M-017': ['B19'],
}

CLEAN = ('AGREES — the figure\'s arithmetic and the arithmetic of the function it names say the '
         'same thing. Checked 2026-08-26.')


def accuracy_note(mid):
    """Does this row carry a finding that changes a number a person reads on one of the three
    screens being built first? Named, so the work queue is visible on the row itself."""
    hits = [h for h in ON_ROW.get(mid, []) if h in ACCURACY_NOW]
    if not hits:
        return ''
    return '\n'.join('%s — %s' % (h, ACCURACY_NOW[h]) for h in hits)


def for_row(mid, function_id):
    """What the audit found on one figure."""
    hits = ON_ROW.get(mid)
    if hits:
        return '\n'.join('%d. %s [%s] — %s' % (i, h, KIND[h], TEXT[h]) for i, h in enumerate(hits, 1))
    if not str(function_id or '').strip():
        return 'B24 [NOT COMPARABLE] — ' + TEXT['B24']
    return CLEAN
