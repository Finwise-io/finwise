"""The inputs tab, rebuilt against the code — which FUNCTION reads each raw value.

Replaces the retired vocabulary the tab was written in. The old tab said BOND_FACTS and
MK-NW-E-015; neither has existed since the vocabulary standard of 2026-08-25, and neither could
be looked up in the code. This reads the code instead.

How it works, and its honest limit. Each input is a value a PERSON would name — "bond maturity
date". The code names it in field names — `maturity_date` on the stored account, `maturity` once a
bond has been read out of it. So each input carries the field names it is stored under, and a
function is listed against an input when its body touches one of them. The field list below is
the only hand-written part, and it is checked against the real type definitions by a guard.
"""
import os, re

# input identifier → the field names the code stores that value under, and the words that name it
FIELDS = {
 'MK-XS-I-001': ['balance', 'cash_balance', 'total_asset_value'],
 'MK-XS-I-002': ['tax_bucket', 'tax_treatment', 'taxBucket'],
 'MK-XS-I-003': ['institution'],
 'MK-XS-I-004': ['shares', 'totalShares', 'quantity'],
 'MK-XS-I-005': ['last_price', 'close', 'latestClose', 'priceOf'],
 'MK-XS-I-006': ['fetchedAt', 'pricesFetchedAt'],   # last_synced moved to its own input, MK-XS-I-066 (2026-10-13)
 'MK-XS-I-007': ['cost_per_share', 'purchase_date', 'cost_basis', 'costBasis'],
 'MK-XS-I-008': [r't\.amount', r'txn\.amount', r'transaction\.amount'],
 'MK-XS-I-009': [r't\.date', r'txn\.date', 'posted_at'],
 'MK-XS-I-010': ['description', 'merchant', 'raw_description', 'payee'],
 'MK-XS-I-011': ['face_value', 'face'],
 'MK-XS-I-012': ['coupon_rate', 'couponRate'],
 'MK-XS-I-013': ['maturity_date', 'maturity'],
 'MK-XS-I-014': ['remaining_balance'],
 'MK-XS-I-015': ['interest_rate_apr'],
 'MK-XS-I-016': ['minimum_monthly_payment'],
 'MK-XS-I-017': ['birthYear', 'birth_year'],
 'MK-XS-I-018': ['retireAge', 'retire_age', 'targetRetirementAge'],
 'MK-XS-I-019': ['expectedRetirementSpending', 'spendingChangeLater', 'travelBudget', 'medicalBudget'],
 'MK-XS-I-020': ['socialSecurityMonthly', 'ssMonthly', 'statementMonthly'],
 'MK-XS-I-021': ['claimAge', 'ssClaimAge'],
 'MK-XS-I-022': ['pensionMonthly', 'ri_pension', 'pension'],
 'MK-XS-I-023': ['salaryByMonth', 'bonusAnnual', 'tipsMonthly', 'signingOnetime', 'salaryAnnual'],
 'MK-XS-I-024': ['loggedSpend', 'expenses', 'txns', 'transactions'],
 'MK-XS-I-025': ['monthlyEssentials', 'essentials'],
 'MK-XS-I-026': ['bigCosts', 'oneOffs'],
 'MK-XS-I-027': ['goals', 'targetDate', r'g\.saved', r'g\.target'],
 'MK-XS-I-028': ['mean_return', 'target_return', 'assumedReturn', 'meanReturn'],
 'MK-XS-I-029': ['inflation', 'inflationRate'],
 'MK-XS-I-030': ['filingStatus', 'over65', 'FilingStatus'],
 'MK-XS-I-031': ['nwDaily', 'readHistory', 'SnapshotDay', 'recordSnapshotDay'],
 'MK-XS-I-032': ['spendCats', 'b_fixed', 'b_nonmonthly', 'b_flexible'],
 'MK-XS-I-033': ['value_as_of'],
 'MK-XS-I-034': ['option_holdings', 'contracts', 'strike', 'expiry'],
 'MK-XS-I-035': ['annuityMonthly', 'ri_annuity', 'annuity'],
 'MK-XS-I-036': ['otherGuaranteed', 'guaranteed_streams', 'guaranteedOutside'],
 'MK-XS-I-037': ['ri_rmd'],
 'MK-XS-I-038': ['ri_withdrawals'],
 'MK-XS-I-039': ['frequency', 'payment_frequency', 'cadence', 'salaryFreq', 'seFreq', 'otherFreq', r'_freq\b', 'RI_CAD_DIV'],
 'MK-XS-I-040': ['alreadyReceiving', 'income_sources', 'incomeSources'],
 'MK-XS-I-041': ['monthly_payment'],
 'MK-XS-I-042': ['payment_type', 'paymentShape'],
 'MK-XS-I-043': ['c_401k', 'c_roth', 'c_invest', 'c_property', 'annual_contribution'],
 'MK-XS-I-044': ['assumptions', 'planOverrides'],
 'MK-XS-I-045': ['retLocation'],
 'MK-XS-I-046': ['employerMatchMode', 'employerMatchValue'],
 'MK-XS-I-047': ['bequest'],
 'MK-XS-I-048': ['asset_class', 'class_source', 'stated'],
}

# raw values the code reads that had NO row on the tab until 2026-08-26 — found by sweeping the
# stored types rather than by anyone remembering them
NEW = {
 'MK-XS-I-049': ('bond price — what the bond is worth today',
                 'the download, a connection, or typed', [r'b\.value', r'bond\.value', r'BondInfo']),
 'MK-XS-I-050': ('the share of an account earmarked for retirement',
                 'typed by the person, per account', ['retirement_pct']),
 'MK-XS-I-051': ('what an account actually returned over the last twelve months',
                 'typed by the person, per account', ['actual_ttm']),
 'MK-XS-I-052': ('the day of the month a debt payment is due',
                 'typed, or a connection', ['due_day']),
 'MK-XS-I-053': ('the month a debt is first paid',
                 'typed by the person', ['first_payment_date']),
 'MK-XS-I-054': ('the date a debt is due to be paid off in full',
                 'typed by the person', ['payoff_date']),
 'MK-XS-I-055': ('the wrapper an account sits in — ISA, 401(k), IRA and the rest',
                 'typed at setup, or from the connection', ['wrapper_confirmed', 'kind']),
 'MK-XS-I-056': ('how a holding was classified, and by whom',
                 'the function, the institution, or the person', ['class_source', 'class_flag']),
 'MK-XS-I-057': ('the date an account history begins',
                 'the institution download', ['history_from']),
 'MK-XS-I-058': ('a break between our figure and the institution\'s',
                 'worked out when a download is read', ['recon_break']),
 'MK-XS-I-059': ('the month a bonus lands',
                 'typed by the person', ['bonusMonth']),
 'MK-XS-I-060': ('how a person is paid — weekly, fortnightly, monthly',
                 'typed at setup', ['salaryMode', 'SALARY_PERIODS']),
 # 2026-09-08 — founder rulings G8 and G10 (second verification)
 'MK-XS-I-061': ('pre-tax balance on 31 December last year',
                 'typed by the person on the Required-withdrawals screen', ['rmdPriorYearEndPreTax', 'priorYearEndPreTax']),
 'MK-XS-I-062': ('enrolled in Medicare (yes / no)',
                 'typed by the person on the Contribution-room screen (HSA card, shown at 65+)', ['medicareEnrolled']),
 # 2026-09-11 — founder rulings Q06, Q09, A47 (his -jj master, column W, 2026-08-26)
 'MK-XS-I-063': ('option contract multiplier — 100 unless the broker or the person states otherwise',
                 'set by the broker on a connected holding, or typed by the person', ['multiplier', 'OPTION_CONTRACT_MULTIPLIER', 'contractMultiplier']),
 'MK-XS-I-064': ('the unit beside a quantity — shares, coins, contracts, ounces or units',
                 'typed by the person on the holding; otherwise the unit the kind implies', ['unit', 'quantityUnit', 'quantityWithUnit']),
 'MK-XS-I-065': ('accrued interest on a bond — interest earned since the last coupon',
                 'typed by the person on the Bonds screen (optional)', ['accrued_interest', 'accruedInterest', 'accruedInterestCaveat']),
 # 2026-10-13 — outside re-run: the time an account last updated is not the time prices were fetched. It sat under
 # MK-XS-I-006 (price fetched at), so MK-NW-F-045 sourceWording's card named the price time while it reads the sync.
 'MK-XS-I-066': ('last successful update of a linked or imported account',
                 'set by the connection on each successful sync, or when a file is imported', ['last_synced']),
 # 2026-10-20 — DEC-0281 (cost is one of the nine facts a bond shows, and step 2 of its value rule; the current price is
 # calculated, not entered) and DEC-3390 (the interest built up since the last coupon, which depends on how often it pays)
 'MK-XS-I-067': ('what was paid for a bond or CD held as its own account',
                 'typed by the person in the Bonds editor or Add an account (optional)', ['amount_paid']),
 'MK-XS-I-068': ('how a linked bond\'s price is quoted — per $100 of face value, or per unit like a share',
                 'calculated at each sync from the broker\'s own total of the account', ['price_quote', 'unitWorth']),
 'MK-XS-I-069': ('how many times a year a bond or CD pays its interest — once or twice',
                 'typed by the person in the Bonds editor or Add an account (optional)', ['coupons_per_year', 'couponsPerYear']),
 # 2026-10-20 — his ruling "always the class broker sends" (settling DEC-2159): the broker's own class for a holding decides it,
 # so the sync and the importer keep it on the saved holding exactly as sent, and every reader asks the one order with it
 'MK-XS-I-070': ('the class a broker sends for a holding — its security type and its cash-equivalent flag',
                 'sent by the connection on each sync (SnapTrade\'s type code and flag), or read from an import file\'s type column',
                 ['broker_type', 'cash_equivalent', 'brokerTag', 'cashEquivalent', 'brokerType']),
 # 2026-10-26 (PF-TOOLS) — the nine values the 2026-10-25 Cash flow fix wave began storing, each named by the agent that added it
 # (FIX-INCOME-B: signing date, sell at vest, unemployment share; FIX-ROOM: Medicare start; FIX-INCOME-A: hours a week; CF-MMFIX-A:
 # the Bill calendar's cash on hand; FIX-TRADES: cash never entered; FIX-MONTH: a payment's debt, the Roth conversion's year)
 'MK-XS-I-071': ('the date a signing bonus is paid — its year, and its month when known',
                 'typed by the person in sign-up (Bonuses) or the Income manager', ['signingDate']),
 'MK-XS-I-072': ('whether shares are sold when they vest — yes makes a vest money that lands; otherwise it is shares, taxed in its year',
                 'typed by the person in the grants editor or Bonus and stock', ['rsuSoldAtVest']),
 'MK-XS-I-073': ('the part of a month\'s benefits that is unemployment pay, when another kind of benefit is chosen beside it',
                 'typed by the person in sign-up (Benefits)', ['\\.unemploymentMonthly']),
 'MK-XS-I-074': ('the month Medicare began — "YYYY-MM", or "before-YYYY" for a start before the year',
                 'typed by the person on the Contribution-room screen (HSA card, beside MK-XS-I-062)', ['medicareStart']),
 'MK-XS-I-075': ('hours a week, for a wage paid by the hour',
                 'typed by the person on Your base pay', ['hoursPerWeek']),
 'MK-XS-I-076': ('cash on hand typed on the Bill calendar, with the date it was typed',
                 'typed by the person on the Bill calendar', ['billCalendarStart']),
 'MK-XS-I-077': ('that an account\'s cash was never entered — the cash figure is activity since the import or since it was added',
                 'set by the app when a trade or a deposit opens a cash figure from nothing; cleared by an opening cash record', ['cash_not_entered']),
 'MK-XS-I-078': ('the debt a logged debt payment was paid on',
                 'set when the person logs a payment from a debt (Log a payment)', ['debtId']),
 'MK-XS-I-079': ('the year a Roth conversion is made — its tax is due the April after',
                 'saved when the person adopts a conversion on the Roth screen', ['rothConversionYear']),
 # 2026-10-30 (PF-TOOLS) — the three values the fix wave of 2026-10-27/30 began storing, each named by the agent that added it
 # (FX-CF-C, workplan #361: one IRA amount a month and the HSA cover; FX-PF, workplan #293: the purchase an opening record is of)
 'MK-XS-I-080': ('what goes into IRAs a month — Traditional and Roth together, one amount, since they share one limit',
                 'typed by the person on the Contribution-room screen (IRA card); until it is typed, the Roth amount sign-up stored', ['c_ira']),
 'MK-XS-I-081': ('the HSA cover — self-only or family',
                 'typed by the person on the Contribution-room screen (HSA card)', ['hsaCover']),
 'MK-XS-I-082': ('the purchase an opening record is of — so editing or removing that purchase changes or removes its record',
                 'set by the app when a holding\'s purchases open its records (openingRecordsOf); absent on records written before 2026-10-27', ['lot_id']),
}

# MoneyKeel/functions added 2026-08-27 — new calculations live there, and a folder the sweep
# cannot see is a function with no identifier, no row and no formula. That blind spot is how
# recomputeBalances came to build the balance net worth is made of with nothing on record.
CALC_ROOTS = ['src/domain', 'MoneyKeel/functions', 'Calculation Module code/engines', 'src/services', 'src/store']   # MUST equal moneykeel_functions.CALC_ROOTS — the build asserts it (2026-09-12: src/store added, B3)


def _strip(b):
    b = re.sub(r'/\*.*?\*/', ' ', str(b), flags=re.S)
    return '\n'.join(re.sub(r'//.*$', '', l) for l in b.split('\n'))


# Inputs the app reads through a key built at run time — a['ri_' + k] — which no field pattern can
# see (2026-09-09, G28). Named by hand from the code; the build adds these readers to the sweep's.
DYNAMIC = {
 'MK-XS-I-020': ['retirementIncomeMonthly', 'guaranteedOutsideStreams', 'currentRetirementIncomeMonthly'],
 'MK-XS-I-022': ['retirementIncomeMonthly', 'guaranteedOutsideStreams', 'currentRetirementIncomeMonthly'],
 'MK-XS-I-035': ['retirementIncomeMonthly', 'guaranteedOutsideStreams', 'currentRetirementIncomeMonthly'],
 'MK-XS-I-036': ['retirementIncomeMonthly', 'guaranteedOutsideStreams', 'currentRetirementIncomeMonthly'],
 'MK-XS-I-037': ['retirementIncomeMonthly'],
 'MK-XS-I-038': ['retirementIncomeMonthly'],
 'MK-XS-I-039': ['retirementIncomeMonthly', 'guaranteedOutsideStreams', 'currentRetirementIncomeMonthly'],
}

def readers(bodies_by_name):
    """input identifier → the names of the functions whose body touches one of its fields."""
    out = {}
    for iid, fields in list(FIELDS.items()) + [(k, v[2]) for k, v in NEW.items()]:
        parts = [f if f.startswith(('r', '\\')) or '\\' in f else re.escape(f) for f in fields]
        pat = re.compile(r'(?:\b|(?<=\.))(?:' + '|'.join(parts) + r')\b')
        hits = sorted(set(n for n, b in bodies_by_name.items() if pat.search(_strip(b))) | {n for n in DYNAMIC.get(iid, []) if n in bodies_by_name})
        out[iid] = hits
    return out


def in_files(pattern_fields):
    """Files that mention a field at all — catches values read outside any function the sweep
    can see, which is the S21 blind spot rather than a missing input."""
    parts = [f if '\\' in f else re.escape(f) for f in pattern_fields]
    pat = re.compile(r'(?:\b|(?<=\.))(?:' + '|'.join(parts) + r')\b')
    found = []
    for root in CALC_ROOTS:
        for dp, _, fs in os.walk(root):
            if '__tests__' in dp: continue
            for f in fs:
                if not f.endswith(('.ts', '.tsx')) or '.test.' in f: continue
                fp = os.path.join(dp, f)
                if pat.search(_strip(open(fp).read())): found.append(fp)
    return sorted(found)
