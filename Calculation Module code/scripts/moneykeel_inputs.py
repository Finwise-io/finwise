"""The inputs tab, rebuilt against the code — which FUNCTION reads each raw value.

Replaces the engine vocabulary the tab was written in. The old tab said BOND_FACTS and
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
 'MK-XS-I-006': ['fetchedAt', 'last_synced', 'pricesFetchedAt'],
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
 'MK-XS-I-039': ['frequency', 'payment_frequency', 'cadence'],
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
                 'the engine, the institution, or the person', ['class_source', 'class_flag']),
 'MK-XS-I-057': ('the date an account history begins',
                 'the institution download', ['history_from']),
 'MK-XS-I-058': ('a break between our figure and the institution\'s',
                 'worked out when a download is read', ['recon_break']),
 'MK-XS-I-059': ('the month a bonus lands',
                 'typed by the person', ['bonusMonth']),
 'MK-XS-I-060': ('how a person is paid — weekly, fortnightly, monthly',
                 'typed at setup', ['salaryMode', 'SALARY_PERIODS']),
}

# MoneyKeel/functions added 2026-08-27 — new calculations live there, and a folder the sweep
# cannot see is a function with no identifier, no row and no formula. That blind spot is how
# recomputeBalances came to build the balance net worth is made of with nothing on record.
CALC_ROOTS = ['src/domain', 'MoneyKeel/functions', 'Calculation Module code/engines', 'src/services']


def _strip(b):
    b = re.sub(r'/\*.*?\*/', ' ', str(b), flags=re.S)
    return '\n'.join(re.sub(r'//.*$', '', l) for l in b.split('\n'))


def readers(bodies_by_name):
    """input identifier → the names of the functions whose body touches one of its fields."""
    out = {}
    for iid, fields in list(FIELDS.items()) + [(k, v[2]) for k, v in NEW.items()]:
        parts = [f if f.startswith(('r', '\\')) or '\\' in f else re.escape(f) for f in fields]
        pat = re.compile(r'(?:\b|(?<=\.))(?:' + '|'.join(parts) + r')\b')
        hits = sorted(n for n, b in bodies_by_name.items() if pat.search(_strip(b)))
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
