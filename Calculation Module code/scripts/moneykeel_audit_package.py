"""THE PACKAGE AN OUTSIDE MODEL RECEIVES TO JUDGE A WHOLE MODULE — Cash flow first (2026-10-23).

Called by build-outside-test-cards.py --audit-package CF, AFTER every check that script makes: each card
carries a formula read from its function as it stands (fingerprint), no rule is written in code, every
figure a rule states is traced to the code, and no card carries a line from inside a function. This file
only arranges what that script has already checked into the files the owner sends.

Same format as the Performance package sent on 2026-10-13 and returned (returned/MoneyKeel_Performance_
Audit_Package/source_packet): one brief, then the cards in parts. What changed, and why — each fixes a
weakness that made the Performance reviewer give a wrong verdict (returned/results/performance_openai_
rerun_*_results.json, REVIEWER WRONG):

  1. EVERY decision that governs the module, not only those made after the reviews began. The Performance
     reviewer had no DEC-0292 or DEC-0251 and so "corrected" a right $3,952 to $1,552 and a right 5.2
     months to a refusal. The set is read from the decision log: the cashflow tab, the multiple_screens
     rows that name a Cash flow screen or figure, any other row that names a Cash flow identifier, and
     every decision a card's code record names.
  2. Each case states the day it is asked (as_of) and the date of every dated record. The Performance
     drawing gave no today's date, and cases on "this month" cannot be run without one.
  3. The conventions the app counts by are stated, each pointing at the card or the owner's words that
     holds it (a month is a calendar month; planned and actual are separate; rounding happens once; how a
     figure is written). The reviewer read "6.28%" as a full-precision figure.
  4. An input the app's own types cannot hold may be tested, but is marked outside_domain and never makes
     a formula WRONG on its own. Six Performance verdicts rested on inputs no caller can send.
  5. The screen register carries each figure's period, unit, grain, ruling date and the decisions that
     govern it, and where on the screen it is printed. The Performance register left out the period.
  6. Parts are grouped by subject, at most 15 cards, and rules and screens are their own sessions, so no
     one reply has to hold 60 cases, 49 rules and 424 screen checks at once.

Nothing here is typed from memory except the subject of each part (its card list is checked against the
code: every card in exactly one part) and the conventions' wording (each names where it is held).
"""
import collections
import datetime
import json
import os
import re
import subprocess

# ── which module, and its parts ───────────────────────────────────────────────────────────────────
# Each part is one session for the outside model: at most 15 cards (the original batch size, chosen so a
# reply of five cases a card fits in one answer). The card lists are typed here; the build stops unless
# every Cash flow card is in exactly one of them, so a function added or removed is caught, not dropped.
MAX_CARDS = 15

CF_PARTS = [
    ('Wages — what is paid, in which months, and the year it makes',
     ['MK-CF-F-059', 'MK-CF-F-130', 'MK-CF-F-060', 'MK-CF-F-177', 'MK-CF-F-061', 'MK-CF-F-080', 'MK-CF-F-081',
      'MK-CF-F-082', 'MK-CF-F-083', 'MK-CF-F-206', 'MK-CF-F-233', 'MK-CF-F-234', 'MK-CF-F-078', 'MK-CF-F-178',
      'MK-CF-F-079']),
    ('Earners, and a salary that varies month to month',
     ['MK-CF-F-172', 'MK-CF-F-173', 'MK-CF-F-174', 'MK-CF-F-175', 'MK-CF-F-176', 'MK-CF-F-188', 'MK-CF-F-163',
      'MK-CF-F-164', 'MK-CF-F-165', 'MK-CF-F-166', 'MK-CF-F-167', 'MK-CF-F-168', 'MK-CF-F-169', 'MK-CF-F-170']),
    ('Stock that vests, and rent from a property',
     ['MK-CF-F-062', 'MK-CF-F-063', 'MK-CF-F-064', 'MK-CF-F-065', 'MK-CF-F-066', 'MK-CF-F-219', 'MK-CF-F-067',
      'MK-CF-F-068', 'MK-CF-F-216', 'MK-CF-F-217', 'MK-CF-F-218']),
    ('Benefits, retirement income and other income',
     ['MK-CF-F-069', 'MK-CF-F-070', 'MK-CF-F-071', 'MK-CF-F-072', 'MK-CF-F-073', 'MK-CF-F-074', 'MK-CF-F-075',
      'MK-CF-F-076', 'MK-CF-F-077', 'MK-CF-F-092']),
    ('The income summary, the income manager, and income paid by accounts',
     ['MK-CF-O-004', 'MK-CF-O-016', 'MK-CF-O-019', 'MK-CF-F-210', 'MK-CF-F-182', 'MK-CF-F-183', 'MK-CF-F-184',
      'MK-CF-F-127', 'MK-CF-F-044', 'MK-CF-F-045', 'MK-CF-F-046', 'MK-CF-F-161', 'MK-CF-F-049', 'MK-CF-F-129',
      'MK-CF-F-052']),
    ('The budget, and the Expenses tab',
     ['MK-CF-F-001', 'MK-CF-F-002', 'MK-CF-F-120', 'MK-CF-F-003', 'MK-CF-F-004', 'MK-CF-F-221',
      'MK-CF-F-008', 'MK-CF-O-002', 'MK-CF-F-149', 'MK-CF-F-150', 'MK-CF-F-151', 'MK-CF-F-152', 'MK-CF-F-153',
      'MK-CF-O-020']),
    ('Essentials, savings by month, and the budget against what was spent',
     ['MK-CF-F-006', 'MK-CF-F-007', 'MK-CF-F-009', 'MK-CF-F-010', 'MK-CF-F-011', 'MK-CF-F-012', 'MK-CF-F-013',
      'MK-CF-F-014', 'MK-CF-F-017', 'MK-CF-F-191', 'MK-CF-F-189', 'MK-CF-F-190']),
    ('Bills ahead, what is coming, and the credit line',
     ['MK-CF-O-008', 'MK-CF-F-212', 'MK-CF-F-121', 'MK-CF-F-018', 'MK-CF-F-160', 'MK-CF-F-122', 'MK-CF-F-124',
      'MK-CF-F-019', 'MK-CF-F-232', 'MK-CF-F-020', 'MK-CF-O-006']),
    ('Debts — payments, balances and paying them off',
     ['MK-CF-O-018', 'MK-CF-F-021', 'MK-CF-F-022', 'MK-CF-F-023', 'MK-CF-F-024', 'MK-CF-F-025', 'MK-CF-F-026',
      'MK-CF-F-027', 'MK-CF-F-028', 'MK-CF-F-029', 'MK-CF-F-030', 'MK-CF-F-034', 'MK-CF-F-159', 'MK-CF-F-235',
      'MK-CF-F-236']),
    ('Debts — credit, kinds of debt, and a mortgage against a Treasury',
     ['MK-CF-F-031', 'MK-CF-F-032', 'MK-CF-F-033', 'MK-CF-F-035', 'MK-CF-F-036', 'MK-CF-F-037', 'MK-CF-F-038',
      'MK-CF-F-041', 'MK-CF-F-042', 'MK-CF-F-125', 'MK-CF-F-126', 'MK-CF-F-229', 'MK-CF-F-043']),
    ('Recording a transaction — cash, holdings and undo',
     ['MK-CF-F-132', 'MK-CF-F-133', 'MK-CF-F-134', 'MK-CF-F-135', 'MK-CF-F-136', 'MK-CF-F-137', 'MK-CF-F-138',
      'MK-CF-F-139', 'MK-CF-F-111', 'MK-CF-F-222', 'MK-CF-F-223', 'MK-CF-F-224', 'MK-CF-F-112', 'MK-CF-F-113']),
    ('Transactions — undo, labels, cash effect, income from holdings, and review flags',
     ['MK-CF-F-114', 'MK-CF-F-115', 'MK-CF-F-116', 'MK-CF-F-117', 'MK-CF-F-118', 'MK-CF-F-119', 'MK-CF-F-108',
      'MK-CF-F-131', 'MK-CF-F-162', 'MK-CF-F-109', 'MK-CF-F-110']),
    ('Contribution limits, room left this year, and the future paycheck',
     ['MK-CF-O-005', 'MK-CF-F-197', 'MK-CF-F-195', 'MK-CF-F-196', 'MK-CF-F-053', 'MK-CF-F-054', 'MK-CF-F-055',
      'MK-CF-F-056', 'MK-CF-F-057', 'MK-CF-F-058', 'MK-CF-O-017', 'MK-CF-F-105', 'MK-CF-F-106', 'MK-CF-F-107']),
    # the parts below are the ones the fixes of 2026-10-23 reach (the Home cash-flow box, the tax tables,
    # refusal and period words): they are built last and read again after those fixes land
    ('This month — the plan and what has happened',
     ['MK-CF-O-010', 'MK-CF-O-003', 'MK-CF-F-227', 'MK-CF-F-226', 'MK-CF-F-225', 'MK-CF-F-156', 'MK-CF-F-005',
      'MK-CF-F-220', 'MK-CF-F-231', 'MK-CF-F-157', 'MK-CF-F-155', 'MK-CF-F-192', 'MK-CF-F-193', 'MK-CF-F-194',
      'MK-CF-F-148']),
    ('Base pay — gross, take-home, and the rate of tax in force',
     ['MK-CF-O-001', 'MK-CF-F-140', 'MK-CF-F-141', 'MK-CF-F-142', 'MK-CF-F-128', 'MK-CF-F-143', 'MK-CF-F-144',
      'MK-CF-F-145', 'MK-CF-F-146', 'MK-CF-F-171', 'MK-CF-F-198', 'MK-CF-F-179', 'MK-CF-F-180', 'MK-CF-F-181']),
    ('Federal tax — the 2026 tables, the deductions and the bands',
     ['MK-CF-F-097', 'MK-CF-F-098', 'MK-CF-F-187', 'MK-CF-F-099', 'MK-CF-F-100', 'MK-CF-F-101', 'MK-CF-F-102',
      'MK-CF-F-103', 'MK-CF-F-104', 'MK-CF-F-185', 'MK-CF-F-186']),
    ('Tax on the household — what is taxed, the filing status, the rates, and the tax organizer',
     ['MK-CF-O-007', 'MK-CF-F-084', 'MK-CF-F-230', 'MK-CF-F-085', 'MK-CF-F-086', 'MK-CF-F-087', 'MK-CF-F-088',
      'MK-CF-F-089', 'MK-CF-F-090', 'MK-CF-F-048']),
]

# Notes that travel with a part. Every identifier they name is checked against today's cards.
CF_NOTES = {
    'This month — the plan and what has happened': [
        'MK-CF-O-010 and MK-CF-O-003 each carry an approved drawing (the same month, asked of the door and of the '
        'function underneath). One case for each must be that household exactly as drawn.',
        'The planned block and the actual block never share a row. Work each one separately, and give its rows and '
        'its surplus as separate expected values, so that the rows can be seen to add up to the surplus.',
        'The approved drawing does not name the month or today\'s date. It does say the car loan is not yet paid and '
        'falls due later in the month, on the day its household gives, so use an `as_of` day before that day, and say '
        'which day you chose.',
        'Home shows a box for this month\'s cash flow. Where your case is one a person would also see on Home, say so '
        'in `notes`, so the two can be compared (tenet 4: the same figure on two screens is the same figure).',
    ],
    'Base pay — gross, take-home, and the rate of tax in force': [
        'MK-CF-O-001 carries an approved drawing. One case must be that household exactly as drawn.',
        'Pay periods in a year are on MK-CF-F-140. Where a case has an hourly worker, say the hours a week.',
        'The Social Security and Medicare amounts in MK-CF-F-198 are what a paycheck withholds, per employer. '
        'Where a household of two earners owes a different amount when it files, say so in `notes` — do not '
        'replace the withholding rule with the filing rule.',
    ],
    'Federal tax — the 2026 tables, the deductions and the bands': [
        'For each band table give witnesses at every band top the app uses and one dollar above it.',
    ],
    'Tax on the household — what is taxed, the filing status, the rates, and the tax organizer': [
        'Where a case needs the filing status and nobody chose one, MK-CF-F-085 says which the app assumes. Judge '
        'that assumption as well.',
    ],
    'The income summary, the income manager, and income paid by accounts': [
        'MK-CF-O-004 carries an approved drawing. One case must be that household exactly as drawn.',
        'The income summary gives two totals that are not the same thing: what reaches the bank in a usual month, '
        'and the whole year the tax is worked on. Keep them apart in every case.',
    ],
    'The budget, and the Expenses tab': [
        'MK-CF-O-002 carries an approved drawing. One case must be that household exactly as drawn.',
        'A debt payment logged as an expense must be counted once. Include, in at least one case, a car loan paid '
        'and logged under Debt payment, and a card payment for a card whose purchases are imported.',
    ],
    'Debts — payments, balances and paying them off': [
        'MK-CF-O-018 carries an approved drawing. One case must be that household exactly as drawn.',
        'Where a payoff runs month by month, give the number of months and the total interest, and say in `notes` '
        'how you worked them (a table you built by hand or with your own calculator).',
    ],
    'Bills ahead, what is coming, and the credit line': [
        'Every bill in a case has a due date and every case has an as-of date: a bill that falls before the as-of '
        'date is not ahead.',
    ],
}

# Two formulas that compute the same thing differently are one of the shapes the known errors took. These
# groups are printed beside a part so the reviewer can compare. Every identifier is checked.
CF_COMPARE = [
    ('A date written as a year-month', ['MK-CF-F-191', 'MK-CF-F-163']),
    ('Days between two dates', ['MK-CF-F-160', 'MK-CF-F-162']),
    ('A wage turned into a month or a year', ['MK-CF-F-140', 'MK-CF-F-141', 'MK-CF-F-143', 'MK-CF-F-059', 'MK-CF-F-130',
                                              'MK-CF-F-082', 'MK-CF-F-045']),
    ('Gross income for the year', ['MK-CF-F-083', 'MK-CF-F-045', 'MK-CF-F-143', 'MK-CF-F-082']),
    ('A rate of tax', ['MK-CF-F-048', 'MK-CF-F-090', 'MK-CF-F-102', 'MK-CF-F-181']),
    ('What the year is taxed on', ['MK-CF-F-084', 'MK-CF-F-230', 'MK-CF-F-088', 'MK-CF-F-100']),
    ('The household\'s 401(k) contributions', ['MK-CF-F-206', 'MK-CF-F-188']),
    ('Essentials in a month', ['MK-CF-F-009', 'MK-CF-F-189', 'MK-CF-F-190']),
    ('Debt payments in a month', ['MK-CF-F-023', 'MK-CF-F-024', 'MK-CF-F-025', 'MK-CF-F-026', 'MK-CF-F-149',
                                  'MK-CF-F-150', 'MK-CF-F-157', 'MK-CF-F-236']),
    ('Rent from a property', ['MK-CF-F-127', 'MK-CF-F-067', 'MK-CF-F-068', 'MK-CF-F-219']),
    ('Guaranteed income in a month', ['MK-CF-F-072', 'MK-CF-F-075', 'MK-CF-F-076', 'MK-CF-F-105']),
    ('Take-home', ['MK-CF-F-044', 'MK-CF-F-144', 'MK-CF-F-171', 'MK-CF-F-180']),
    ('Planned spending in a month', ['MK-CF-F-002', 'MK-CF-F-003', 'MK-CF-F-120', 'MK-CF-F-221', 'MK-CF-F-008']),
    ('Spending logged in a month', ['MK-CF-F-008', 'MK-CF-F-151', 'MK-CF-F-014']),
    ('What is left in a month', ['MK-CF-F-011', 'MK-CF-F-012', 'MK-CF-F-017', 'MK-CF-F-156', 'MK-CF-F-005', 'MK-CF-F-220']),
    ('What a pot grows to', ['MK-CF-F-126', 'MK-CF-F-229']),
    ('Money paid out by accounts — dividends and interest', ['MK-CF-F-119', 'MK-CF-F-183', 'MK-CF-F-184']),
    ('Cash in an account', ['MK-CF-F-133', 'MK-CF-F-135', 'MK-CF-F-118']),
    ('A loan\'s payment, and the months to clear it', ['MK-CF-F-028', 'MK-CF-F-029', 'MK-CF-F-030', 'MK-CF-F-034',
                                                       'MK-CF-F-125']),
    ('The age a person is in the tax year', ['MK-CF-F-197', 'MK-CF-F-089']),
]

# The screens the module owns (the compliance check's own list, validate-module-complies.py, his scope).
CF_OWNED_SCREENS = ['CashFlowScreen', 'BudgetScreen', 'IncomeManagerScreen', 'MonthlyIncomeScreen', 'BillCalendarScreen',
                    'BasePayScreen', 'IncomeSummaryScreen']
# The two screen parts: the Cash flow tab (and Home's box, which shows the same month) and every other screen.
SCREEN_PART_TITLES = ('The screens — the Cash flow tab, its four tabs, and Home\'s box for this month',
                      'The screens — Base pay, Income summary, the income manager, the bill calendar and guaranteed income')

FILE_STEM = 'moneykeel_audit_module_cf_for-openai_v01'
TAX_FILE = 'moneykeel_audit_module_cf_tax-sources-and-acceptance_v01.json'
CONTENTS_FILE = 'moneykeel_audit_module_cf_contents_v01.json'
PACKAGE_DIR = 'MoneyKeel_CashFlow_Audit_Package'


def count(n, word):
    return f'{n} {word}' + ('' if n == 1 else 's')


def _git(root, *args):
    return subprocess.run(['git', '-C', root, *args], capture_output=True, text=True).stdout.strip()


def route_to_screen(root):
    """Each route file in app/ names the screen it renders — read, never typed (the compliance check's method)."""
    out = {}
    for dp, _dn, fn in os.walk(os.path.join(root, 'app')):
        for f in fn:
            if not f.endswith('.tsx') or f.startswith('_'):
                continue
            src = open(os.path.join(dp, f), encoding='utf8', errors='ignore').read()
            m = re.search(r'screens/([A-Za-z]+)', src)
            if m:
                out['/' + os.path.splitext(f)[0]] = m.group(1)
    return out


def printed_in(root, screens):
    """Where on each screen a Cash flow figure is printed: the screen and the part of it (the component the
    figure's identifier is written in). A comment that names a figure is not a place it is printed."""
    out = collections.defaultdict(set)
    for s in screens:
        p = os.path.join(root, 'src', 'screens', s + '.tsx')
        if not os.path.exists(p):
            continue
        comp = s
        for line in open(p, encoding='utf8').read().split('\n'):
            m = re.match(r'^(?:export )?(?:default )?function ([A-Z]\w+)|^(?:export )?const ([A-Z]\w+)\s*[:=]', line)
            if m:
                comp = m.group(1) or m.group(2)
            if line.strip().startswith(('//', '*', '/*')):
                continue
            for fid in re.findall(r'MK-CF-M-\d{3}', line):
                out[fid].add(s if comp == s else f'{s} › {comp}')
    return {k: sorted(v) for k, v in out.items()}


TEST_FILE = re.compile(r'[\w./-]*\.test\.tsx?\b(?:\s*›[^·\n]*)?')


def decision_text(d):
    """One decision as the outside model reads it. His words are printed exactly; in the log's own record and its
    governs list, the name of a test file is replaced — the judge is never pointed at the app's tests."""
    r = d['row']
    hide = lambda t: TEST_FILE.sub('[a test of the app]', str(t or '').strip())
    return {'id': r['id'], 'decided': str(r.get('decided') or '') or 'not dated in the log', 'type': r.get('type'), 'tab': r.get('tab'),
            'whose': d['whose'], 'his_words': str(r.get('his_words') or '').strip(), 'the_log_records': hide(r.get('plain')),
            'governs': hide(r.get('governs'))}


def governing_decisions(rows, cf_cards, owned_screens, owned_routes, card_ruled, card_paths):
    """Every decision in force that governs Cash flow, each with the reason it is in.

    Read from the log's own columns (tab, governs, screens) and from the code records (a card's Ruled by
    line). In: a row filed on the cashflow tab; a row on any other tab whose governs or screens names a
    Cash flow identifier, one of the module's seven screens, one of their routes, or a file Cash flow
    cards live in; and every decision a card's code record names. A row that is OLD, NOT IN USE is out —
    it has been replaced, and the row that replaced it is in by the same test. (The lead's brief named the
    cashflow tab and the multiple_screens rows; the other tabs are read too, because a rule filed under
    Net worth that names a Cash flow function governs that function all the same.)"""
    ident = re.compile(r'MK-CF-[MFOI]-\d{3}')
    files = sorted(card_paths, key=len, reverse=True)
    out = collections.OrderedDict()
    for r in rows:
        if 'OLD' in str(r.get('in_use', '')):
            continue
        text = str(r.get('governs') or '') + ' ' + str(r.get('screens') or '')
        why = []
        if r.get('tab') == 'cashflow':
            why.append('filed on the cashflow tab of the decision log')
        names = set(ident.findall(text))
        screens = [s for s in owned_screens if s in text] + [x for x in owned_routes if re.search(re.escape(x) + r'(?![\w-])', text)]
        in_files = [f for f in files if f in text]
        named = sorted(names)[:6] + screens[:4] + in_files[:3]
        if r.get('tab') != 'cashflow' and named:
            why.append(f"filed on the {r.get('tab')} tab, and it names " + ', '.join(named))
        if r['id'] in card_ruled:
            why.append('named on the code record of ' + ', '.join(sorted(card_ruled[r['id']])[:6]))
        if why:
            whose = ('the lead\'s decision under his rulings, recorded in his log — not his own'
                     if str(r.get('plain') or '').startswith('NOT A DECISION OF HIS') else 'his')
            out[r['id']] = {'row': r, 'why_in_scope': why, 'whose': whose,
                            'names': (names | set(card_ruled.get(r['id'], set()))) & (set(cf_cards) | {n for n in names if '-M-' in n}),
                            'files': in_files, 'screens': screens}
    return out


def published_amounts(root):
    """The 2026 amounts the Cash flow functions use, read from the code (the same files the card builder's
    published_tables() reads), as data. src/__tests__/cf_audit_package_figures.test.ts checks every one
    against the app's own constants, so this reading and the app cannot say different things."""
    tax = open(os.path.join(root, 'src/domain/income/tax.ts'), encoding='utf8').read()
    lim = open(os.path.join(root, 'src/domain/income/limits.ts'), encoding='utf8').read()
    pay = open(os.path.join(root, 'MoneyKeel/functions/cashflow/base-pay.ts'), encoding='utf8').read()
    num = lambda x: None if x == 'Infinity' else float(x.replace('_', ''))
    pairs = lambda t: [(num(a), float(b)) for a, b in re.findall(r'\[\s*([\d_]+|Infinity)\s*,\s*([\d.]+)\s*\]', t)]
    single = pairs(re.search(r'export const TAX_BRACKETS[^=]*=\s*\[([\s\S]*?)\];', tax).group(1))
    single_ded = num(re.search(r'export const STANDARD_DEDUCTION = ([\d_]+)', tax).group(1))
    table = re.search(r'export const TAX_TABLES[^=]*=\s*\{([\s\S]*?)\n\};', tax).group(1)
    tables = {}
    for key in ('single', 'married', 'mfs', 'hoh'):
        blk = re.search(key + r':\s*\{([\s\S]*?)\n?\s*\},', table).group(1)
        tables[key] = {'bands': [{'up_to': t, 'rate': r} for t, r in (single if 'TAX_BRACKETS' in blk else pairs(blk))],
                       'standard_deduction': single_ded if 'STANDARD_DEDUCTION' in blk else num(re.search(r'deduction:\s*([\d_]+)', blk).group(1)),
                       'added_for_each_person_65_or_over': num(re.search(r'over65Add:\s*([\d_]+)', blk).group(1))}
    assert all(len(t['bands']) == 7 for t in tables.values()), 'a tax table did not read as seven bands'
    ltcg = {k: {'zero_up_to': num(a), 'fifteen_up_to': num(b)} for k, a, b in
            re.findall(r'(\w+):\s*\[([\d_]+),\s*([\d_]+)\]', re.search(r'const LTCG[^=]*=\s*\{([\s\S]*?)\};', tax).group(1))}
    sd = re.search(r'export const SENIOR_DEDUCTION = \{([\s\S]*?)\} as const', tax).group(1)
    g = lambda k: num(re.search(k + r':\s*([\d_.]+)', sd).group(1))
    starts = {k: num(v) for k, v in re.findall(r'(\w+):\s*([\d_]+)', re.search(r'phaseOutStart:\s*\{([^}]*)\}', sd).group(1))}
    eligible = {k: v == 'true' for k, v in re.findall(r'(\w+):\s*(true|false)', re.search(r'eligible:\s*\{([^}]*)\}', sd).group(1))}
    limits = {k: num(v) for k, v in re.findall(r'(\w+):\s*([\d_]+)', re.search(r'export const IRS_LIMITS = \{([\s\S]*?)\} as const', lim).group(1))}
    # the three payroll rates, from the one function that withholds them (MK-CF-F-198 payrollTaxWithheld)
    m = re.search(r'Math\.min\(w, SS_WAGE_BASE\) \* ([\d.]+) \+ w \* ([\d.]+) \+ Math\.max\(0, w - MEDICARE_ADDITIONAL_THRESHOLD\) \* ([\d.]+)', pay)
    assert m, 'the payroll rates did not read from payrollTaxWithheld'
    rates = [float(x) for x in m.groups()]
    assert len(ltcg) == 4 and len(limits) >= 9 and len(starts) == 4 and len(eligible) == 4, 'an amount did not read whole'
    return {
        'tax_year': int(re.search(r'export const TAX_YEAR = (\d+)', tax).group(1)),
        'federal_income_tax': tables,
        'senior_deduction': {'amount_per_person_65_or_over': g('amount'), 'phase_out_rate': g('phaseOutRate'),
                             'phase_out_starts_above': starts, 'given_when_filing': eligible,
                             'first_tax_year': int(g('firstYear')), 'last_tax_year': int(g('lastYear'))},
        'long_term_capital_gains': ltcg,
        'contribution_limits': limits,
        'payroll': {'social_security_rate': rates[0], 'social_security_wage_base': num(re.search(r'export const SS_WAGE_BASE = ([\d_]+)', pay).group(1)),
                    'medicare_rate': rates[1], 'additional_medicare_rate': rates[2],
                    'additional_medicare_withholding_above': num(re.search(r'export const MEDICARE_ADDITIONAL_THRESHOLD = ([\d_]+)', pay).group(1))},
    }


NAMES = {'single': 'Single', 'married': 'Married filing jointly', 'mfs': 'Married filing separately', 'hoh': 'Head of household'}


def tax_sources_file(amounts, sources, built_on):
    """The published amounts, each with the source the app cites and what makes it pass — the shape of the
    returned Performance file (MoneyKeel_tax_sources_and_acceptance.json), with the reply fields left for the judge."""
    cite = {s['symbol']: s for s in sources}
    pick = lambda *syms: [{'what': cite[s]['what'], 'publication_the_app_cites': cite[s]['publication'],
                           'the_app_last_checked_it': cite[s]['checked'], 'valid_through_tax_year': cite[s]['valid_through']}
                          for s in syms if s in cite]
    reply = {'verdict': 'RIGHT | WRONG | INCOMPLETE | CANNOT TELL', 'why': '', 'source': {'source': '', 'url': '', 'section': ''},
             'witnesses': [{'input': {}, 'expected': {'exact': 0, 'shown': ''}, 'formula_gives': {'exact': 0, 'shown': ''}, 'working': []}]}
    checks = [
        {'topic': f"Federal income tax {amounts['tax_year']} — bands by filing status",
         'the_app_uses': amounts['federal_income_tax'],
         'cards': ['MK-CF-F-098', 'MK-CF-F-101', 'MK-CF-F-103', 'MK-CF-F-097'],
         'cites': pick('TAX_TABLES', 'TAX_BRACKETS', 'TAX_YEAR'),
         'acceptance': ['Every band top and every rate equals the published figure for the tax year, to the dollar.',
                        'Witnesses: the tax at every band top the app uses, and one dollar above it, for every filing status, worked band by band.',
                        'Where a top is wrong, give the tax the right table gives and the tax the app\'s table gives (formula_gives) at that top.'],
         'reply': reply},
        {'topic': f"Standard deduction and the amount added at 65, {amounts['tax_year']}",
         'the_app_uses': {k: {'standard_deduction': v['standard_deduction'], 'added_for_each_person_65_or_over': v['added_for_each_person_65_or_over']}
                          for k, v in amounts['federal_income_tax'].items()},
         'cards': ['MK-CF-F-099', 'MK-CF-F-100', 'MK-CF-F-089'],
         'cites': pick('TAX_TABLES', 'STANDARD_DEDUCTION'),
         'acceptance': ['Each amount equals the published figure for its filing status.',
                        'Say who counts as 65 or over in the tax year, and how a married couple with one person 65 or over is counted.'],
         'reply': reply},
        {'topic': 'Senior deduction, tax years ' + f"{amounts['senior_deduction']['first_tax_year']} to {amounts['senior_deduction']['last_tax_year']}",
         'the_app_uses': amounts['senior_deduction'],
         'cards': ['MK-CF-F-187', 'MK-CF-F-099'],
         'cites': pick('SENIOR_DEDUCTION'),
         'acceptance': ['The amount, the phase-out rate and the income it phases out above equal the law for each filing status.',
                        'Say whether the phase-out reduces each eligible person\'s amount, or the total of a couple\'s, and on what measure of income.',
                        'Witnesses: a married couple filing jointly, both 65 or over, at the income the phase-out starts at, and above it until nothing is left; a single filer the same; filing separately.'],
         'reply': reply},
        {'topic': f"Long-term capital gains, {amounts['tax_year']} — the 0% and 15% tops",
         'the_app_uses': amounts['long_term_capital_gains'],
         'cards': ['MK-CF-F-104'],
         # the app's register of published sources has no row for these tops (found 2026-10-23) — said so, not borrowed
         'cites': pick('LTCG') or [{'what': 'The 0% and 15% long-term capital gains tops', 'publication_the_app_cites':
                                    'none — the app\'s record of published sources has no entry for these amounts',
                                    'the_app_last_checked_it': None, 'valid_through_tax_year': None}],
         'acceptance': ['Each top equals the published figure for its filing status.',
                        'Say how a gain stacks on ordinary taxable income, and whether the card does that.'],
         'reply': reply},
        {'topic': f"Contribution limits, {int(amounts['contribution_limits']['year'])} — 401(k), IRA, HSA and catch-ups",
         'the_app_uses': amounts['contribution_limits'],
         'cards': ['MK-CF-F-053', 'MK-CF-F-054', 'MK-CF-F-055', 'MK-CF-F-056', 'MK-CF-F-197', 'MK-CF-O-005'],
         'cites': pick('IRS_LIMITS', 'annualHsaLimit', 'ageAttainedInYear'),
         'acceptance': ['Each limit equals the published figure for the year.',
                        'Witnesses at the ages where a limit changes: the year a person turns 50, 55, 60, 63 and 64.',
                        'Say what age is tested — the age reached during the year, or the age today.'],
         'reply': reply},
        {'topic': f"Social Security and Medicare withheld from a paycheck, {amounts['tax_year']}",
         'the_app_uses': amounts['payroll'],
         'cards': ['MK-CF-F-198', 'MK-CF-O-001'],
         'cites': pick('SS_WAGE_BASE', 'MEDICARE_ADDITIONAL_THRESHOLD'),
         'acceptance': ['The wage base and the threshold equal the published figures.',
                        'Keep two things apart: what one employer withholds, and what a household owes when it files. Say which the card describes, and give a witness for a couple whose two wages are each under the withholding threshold but together over the filing threshold.'],
         'reply': reply},
    ]
    cross = [
        {'id': 'X1', 'check': 'Home\'s box for this month and the Cash flow tab\'s This month give the same take-home, the same spent so far and the same left, for one household.',
         'figures': ['MK-CF-M-002', 'MK-CF-M-051', 'MK-CF-M-052', 'MK-CF-M-053'], 'tenet': 4},
        {'id': 'X2', 'check': 'The rows of This month add up to its surplus, in the planned block and in the actual block, each on its own.',
         'figures': ['MK-CF-M-004', 'MK-CF-M-002', 'MK-CF-M-003', 'MK-CF-M-049', 'MK-CF-M-053'], 'tenet': 2},
        {'id': 'X3', 'check': 'For a household whose only income is wages, the take-home on Base pay equals the take-home each month on the Income summary.',
         'figures': ['MK-CF-M-031', 'MK-CF-M-037'], 'tenet': 4},
        {'id': 'X4', 'check': 'A car loan payment logged under Debt payment is counted once: with the debts, not again with the expenses.',
         'figures': ['MK-CF-M-013', 'MK-CF-M-003', 'MK-CF-M-052'], 'tenet': 1},
        {'id': 'X5', 'check': 'The 401(k) of each earner comes off the take-home and off the income that is taxed, and the household total is the earners\' figures added.',
         'figures': ['MK-CF-M-034', 'MK-CF-M-037', 'MK-CF-M-041'], 'tenet': 4},
        {'id': 'X6', 'check': 'For a household whose only income is wages, the federal band on Base pay and on the Income summary is the same band.',
         'figures': ['MK-CF-M-032', 'MK-CF-M-043'], 'tenet': 4},
        {'id': 'X7', 'check': 'A bill that falls once a year is in its own month on the bill calendar and in that month\'s planned outflow, and in no other month.',
         'figures': ['MK-CF-M-016', 'MK-CF-M-028', 'MK-CF-M-048'], 'tenet': 4},
    ]
    return {
        'what_this_is': ('The published amounts the Cash flow functions use, read from the app on ' + built_on + ', each with the '
                         'publication the app cites and what makes it pass; then the checks that span several cards. '
                         'Fill each `reply` from your own reading of the published source. The amounts are the app\'s, '
                         'not answers: check every one.'),
        'tax_year': amounts['tax_year'],
        'filing_status_names': NAMES,
        'source_checks': checks,
        'cross_card_acceptance_cases': [dict(c, reply={'verdict': 'HOLDS | DOES NOT HOLD | CANNOT TELL', 'case': {}, 'why': ''}) for c in cross],
        'scope_limits': ['Federal amounts only, unless a card names a state rate.',
                         'You are not shown the code, the tests or any answer the app gives. A verdict is about the amounts and the words, not about a run of the app.'],
    }


# ── the brief ─────────────────────────────────────────────────────────────────────────────────────

def _conventions():
    """How the app counts — each line names the card, the owner's words or the approved drawing that holds it,
    so the reviewer can check it rather than take it. No line here states a figure of its own."""
    return [
        '## How the app counts — read before you work a case', '',
        'Each line below names where it is held. They are here because the last outside review lost verdicts for want '
        'of them. Where a card says something different, the card is what you judge — and the difference is a finding.', '',
        '1. **Every case states the day it is asked.** Put `"as_of": "YYYY-MM-DD"` on every case, and give the date of '
        'every dated record in `inputs`: a payment received, an expense logged, a debt payment, a pay day, a bill\'s '
        'due date, a birth year. A case about "this month" or "so far" without its day cannot be run.',
        '2. **A month is a calendar month.** "This month" is the calendar month that holds the `as_of` day, written as '
        'a year and a month (MK-CF-F-191, MK-CF-F-163). A record counts in a month when its date falls in that month '
        '(MK-CF-F-148, MK-CF-F-212). A figure whose `per` is month is for one calendar month; one whose `per` is year '
        'is for a year.',
        '3. **Planned and actual are two separate blocks.** Planned is what the plan says the month holds '
        '(MK-CF-F-156). Actual is what has happened (MK-CF-F-005). They never share a row, and each ends in its own '
        'surplus. The approved drawing on MK-CF-O-010 shows both for one month.',
        '4. **A debt is counted from the list of debts, not from the budget** (the owner, 2026-10-04 — ruling 3 '
        'below). A debt payment that is also logged as an expense must be counted once. Which block counts it, and '
        'how, is on MK-CF-F-005, MK-CF-F-150 and MK-CF-F-157.',
        '5. **Full precision, rounded once** (the owner, DEC-0264: "full precision for calculation; display two '
        'decimals unless stated (whole dollars for totals, balances, projections…)"). Nothing rounds inside a '
        'calculation. An amount or a percent in an owner ruling or an approved drawing is written as the screen '
        'writes it — already rounded once. Work at full precision, round at the end, then compare.',
        '6. **How a figure is written depends on its `unit`** in the screen register. `money`: whole dollars, a '
        'negative written with "−". `money-cents`: dollars and cents. `percent`: a whole percent. `percent-2dp`: two '
        'decimals. `months`: one decimal and the word month or months. A figure with a `per` of month or year has '
        '"/month" or "/year" after it. Examples, written by the app\'s own writer: {writer_examples}.',
        '7. **Unknown is not zero** (tenet 3). Where a card says "nothing" or "no answer", the expected answer is '
        '`REFUSES` with the reason — never 0. Where a card says a missing input "counts as 0", that is the card\'s '
        'claim: judge it against tenet 3.',
        '8. **What can reach a function.** Its `handed` line and the types printed in its part say what it is given. '
        'An edge case whose input those types cannot hold — words where a number is typed, a date that is not a '
        'date — is welcome, but put `"outside_domain": true` on it and say why in `notes`. Such a case alone never '
        'makes a formula `WRONG`; where the card does not say what happens, the verdict is `INCOMPLETE`, severity low.',
        '9. **The owner\'s decisions are settled; the author\'s words are claims.** A card\'s rules marked '
        '`"said_by": "owner"`, the decisions printed in each part, the owner\'s rulings below and the approved '
        'drawings are his. Everything else — formulas in words, `what_it_is_for`, the screen register\'s words and '
        'its worked examples — is the in-house author\'s, to be checked. A screen-register row with a `ruled` date '
        'was ruled by the owner on that date; a row without one is a draft.',
        '10. **A screen-register row\'s worked example ran through the app\'s own door** and gave the answer printed '
        'beside it. It is not your expected answer: it is the app\'s, shown so you can see what a figure is. Where '
        'the words of a row and its own worked answer disagree, that is a finding (tenet 2).',
        '',
    ]


def writer_examples():
    """The three examples in convention 6. Each is checked by src/__tests__/cf_audit_package_figures.test.ts
    through the app's own writer (writeFigure); the test fails when the text here and the writer differ."""
    return [('money', 'month', -3248.4, '−$3,248/month'), ('money-cents', None, 186, '$186.00'), ('percent', None, 0.2178, '22%')]


def brief_head(ctx, parts, decisions, figures_cf, screens, skipped, built_on, commit):
    chosen, tables, brief, tenets = ctx['chosen'], ctx['tables'], ctx['brief'], ctx['tenets']
    rulings = ctx['rulings']
    n_cards = len(chosen)
    n_orch = sum(1 for c in chosen if c['card']['kind'] == 'orchestrator')
    card_parts = [p for p in parts if p['kind'] == 'cards']
    screen_parts = [p for p in parts if p['kind'] == 'screens']
    ex = '; '.join(f'a `{u}` figure{" per " + p if p else ""} of {("−" if v < 0 else "") + format(abs(v), ",.4f").rstrip("0").rstrip(".")} is written "{w}"'
                   for u, p, v, w in writer_examples())
    L = [f'# MoneyKeel — the Cash flow module, judged from outside', '',
         f'Written for: OpenAI, the outside judge of every Cash flow calculation. Package v01, built {built_on} from the app '
         f'as it stands on disk (last commit {commit}). You have not seen any review of this module and none is given here: '
         'judge it as if for the first time.', '',
         '# What this is', '',
         f'MoneyKeel is a personal-finance app for readers of 55 to 70. The Cash flow module answers: what comes in, what goes '
         f'out, what is left this month, what the tax and the take-home are, what bills are ahead, and what is owed. '
         f'This package holds every one of its functions that does arithmetic — {n_cards} cards, {n_orch} of them '
         f'orchestrators — with its formula in words as it is in the app today; every figure its screens print '
         f'({len(figures_cf)}); every decision of the owner\'s that governs it ({len(decisions)}); the published amounts it '
         f'uses; and the tenets every figure must meet. {len(skipped)} more functions store or demonstrate and do no '
         'arithmetic of their own; they are listed at the end with the reason, and no cases are asked for them.', '',
         'Afterwards a script runs every case you write against the app. Your answer, the app\'s answer and any difference '
         'go to the owner side by side. Nothing you write is changed to agree with the app.', '',
         '# Read in this order', '',
         '| File | What it is | One session? |', '|---|---|---|',
         f'| `{FILE_STEM}.md` | This brief: the jobs, how to reply, how the app counts, the tenets, the general brief, the owner\'s rulings, the index of decisions, the screens, the published amounts | Read at the start of every session |',
         f'| `{TAX_FILE}` | The published amounts with the source the app cites and what makes each pass, and {len(ctx["cross"])} checks that span several cards | '
         f'With parts {", ".join(str(p["n"]) for p in parts if p.get("tax_topics"))} (the published amounts); its cross-card checks are copied into the screen parts |',
         f'| `{CONTENTS_FILE}` | What is in each part, by identifier — so you can confirm you were given everything | Reference |']
    for p in parts:
        L.append(f'| `{p["file"]}` | Part {p["n"]} of {len(parts)} — {p["title"]}: '
                 + (f'{len(p["cards"])} cards, {len(p["cards"]) * 5} cases, {count(len(p["decisions"]), "decision")} to check'
                    if p['kind'] == 'cards' else f'{len(p["figures"])} figures to check against the tenets, {count(len(p["decisions"]), "decision")}')
                 + ' | Yes |')
    L += ['', 'Give each part to the model in its own session, with this brief and, for the parts that check published amounts, the tax file. '
          'Parts may be done in any order. Each reply is one JSON object; save each reply unchanged.', '',
          '# Your jobs', '',
          '1. **Formula check, every card.** Is the formula right for what the card says it is for? Verdict `RIGHT`, `WRONG`, '
          '`INCOMPLETE` or `CANNOT TELL`, with why, what it should be, and what it rests on — the owner\'s decision, a '
          'published source, standard finance practice, or ordinary arithmetic. Severity for anything not RIGHT: high (a '
          'wrong number a person would act on), medium, low.',
          '2. **Five cases per card** — two easy, two complex (real-world inputs: unround figures, two earners, several '
          'debts, dated records), one edge — each worked by hand, with the expected answer at full precision and as it '
          'would be shown. Where the honest answer is no number, `REFUSES` and why. Where the owner\'s rule is needed and '
          'missing, `RULE UNCLEAR` with each reading\'s answer.',
          '3. **The decided rules are in.** Each card part ends with the decisions that govern its cards. For each one, '
          'say `HELD` (the formulas in this part do what it says), `NOT HELD` (with the case that shows it) or '
          '`CANNOT TELL` (what you would need).',
          f'4. **The screens meet the tenets** — in the two screen parts only ({", ".join(str(p["n"]) for p in screen_parts)}). '
          'For each figure, check it against each tenet that applies: its words are plain and say what the number means; '
          'with no input it refuses with a reason, never $0 dressed as an answer; a total and the rows under it add up; '
          'one concept has one name and the same figure wherever it is shown; an estimate says it is one. `PASS` or '
          '`FAIL` with the tenet number and why. Then the cross-card checks in the tax file.',
          f'5. **The published amounts** — in parts {", ".join(str(p["n"]) for p in parts if p.get("tax_topics"))}. Check every amount the app uses against its '
          'published source, and fill `source_checks` for the topics the part names.', '',
          '# How to reply', '',
          'One JSON object per part, in this shape and nothing outside it. Leave out the keys a part does not ask for.', '',
          '```json', '{',
          '  "batch": "cf module — part N",', '  "written_by": "<you>",',
          '  "ready_to_close": false,', '  "still_open": ["<card or figure id>: what must change"],',
          '  "formula_checks": [{"id": "", "name": "", "verdict": "RIGHT|WRONG|INCOMPLETE|CANNOT TELL", "why": "", "should_be": "", "rests_on": "", "severity": "high|medium|low|"}],',
          '  "cases": [{"id": "", "name": "", "kind": "easy|complex|edge", "title": "", "as_of": "YYYY-MM-DD", "given": "", "inputs": {}, "expected": {}, "formula_gives": {}, "working": [], "rests_on": "", "confidence": "high|medium|low", "outside_domain": false, "notes": ""}],',
          '  "rules_held": [{"rule": "DEC-…", "cards": [], "verdict": "HELD|NOT HELD|CANNOT TELL", "why": ""}],',
          '  "could_not_test": [{"id": "", "missing": ""}],',
          '  "screen_checks": [{"figure": "MK-CF-M-…", "tenet": 0, "verdict": "PASS|FAIL", "why": ""}],',
          '  "cross_card_checks": [{"id": "X…", "verdict": "HOLDS|DOES NOT HOLD|CANNOT TELL", "case": {}, "why": ""}],',
          '  "source_checks": [{"topic": "", "verdict": "", "why": "", "source": {"source": "", "url": "", "section": ""}, "witnesses": []}]',
          '}', '```', '',
          '`ready_to_close` is true only when every card in the part is RIGHT and every rule HELD. `formula_gives` is what '
          'the formula as written produces; leave it out when it is the same as `expected`. Never change an expected '
          'answer to agree with anything the app produces. Where you think the owner\'s rule is wrong, say so in `notes` '
          'with your reasoning; do not apply your own rule.', '']
    L += _conventions()
    L[L.index(next(x for x in L if '{writer_examples}' in x))] = next(x for x in L if '{writer_examples}' in x).replace('{writer_examples}', ex)
    L += ['# The tenets — every function and every figure must meet them', '', tenets, '',
          '# The general brief — how a card is read and how a case is worked', '',
          'This is the brief every outside batch has been given since 2026-10-04. Where it and the sections above differ, '
          'the sections above are the newer instruction for this package (the reply shape, `as_of`, `outside_domain`).', '',
          brief, '', '---', '',
          '# What the owner has ruled — settled, in his words', '',
          'His rulings carried to every outside review. Most were made about Net worth or Performance; read each for what '
          'it says. The decisions that govern Cash flow are printed in full in the part that checks each.', '']
    L += [f'{i}. {r["date"]} — "{r["words"]}" {r["about"]}' for i, r in enumerate(rulings, 1)]
    L += ['', f'# The decisions that govern Cash flow — {len(decisions)}, and the part that checks each', '',
          'From the owner\'s decision log, every decision in force that governs this module. Each is printed in full — '
          'his words, the log\'s record of it, and what it governs — in the part that checks it. A decision that governs '
          'cards in more than one part is checked in each.', '',
          '| Decision | Decided | Kind | Checked in part |', '|---|---|---|---|']
    where = collections.defaultdict(list)
    for p in parts:
        for d in p['decisions']:
            where[d].append(str(p['n']))
    for did, d in decisions.items():
        r = d['row']
        L.append(f"| {did} | {r.get('decided') or 'not dated'} | {r.get('type')} | {', '.join(where[did])} |")
    L += ['', '# The screens the figures print on', '',
          'Read from the app: each figure declares the screens it is printed on, and each screen\'s own file names the '
          'part of the screen it is printed in — a tab, a card, a sheet. The Cash flow tab holds four tabs (This month, '
          'Income, Expenses, Debts); the panels the app\'s own names call BudgetScreen are drawn inside it.', '',
          '| Screen | The app\'s screen | Where on it the figures are printed | Figures | Checked in part |', '|---|---|---|---|---|']
    for route, s in screens:
        figs = [k for k, v in figures_cf.items() if route in v['screens']]
        places = sorted({w for k in figs for w in ctx['shown_in'].get(k, [])
                         if w.split(' › ')[0] == s or (route == '/cashflow' and w.startswith('BudgetScreen'))})
        L.append(f"| `{route}` | {s} | {'; '.join(places) or 'not written by its identifier in the screen file'} | {len(figs)} | "
                 f"{', '.join(sorted({str(p['n']) for p in screen_parts if set(figs) & set(p['figures'])}, key=int))} |")
    L += [''] + tables
    L += ['# Not on a card — what each is, and why no cases are asked', '', '| Function | Why |', '|---|---|']
    for c in skipped:
        L.append(f"| {c['card']['id']} {c['card']['name']} | {c['skip']}. {c['card']['what_it_is_for']} |")
    L += ['', '# Before you send each reply', '',
          '- One formula check for every card in the part; five cases for every card you could test, the rest under `could_not_test`.',
          '- Every case has `as_of`, and every dated record in it has its date.',
          '- Every card judged `WRONG` or `INCOMPLETE` has a case that shows the difference, with `formula_gives`.',
          '- Every list of rows sums to its total, and every orchestrator case gives the rows and the total separately.',
          '- One `rules_held` line for every decision the part lists.',
          '- Everything quotes its identifier exactly.', '']
    return '\n'.join(L)


def part_body(p, nparts, ctx):
    L = [f'# Cash flow — part {p["n"]} of {nparts}: {p["title"]}', '']
    if p['kind'] == 'cards':
        L += [f'{len(p["cards"])} cards, so {len(p["cards"])} formula checks and {len(p["cards"]) * 5} cases, and one '
              f'`rules_held` line for each of the {len(p["decisions"])} decisions at the end. Read the brief '
              f'`{FILE_STEM}.md` first. Put `"batch": "cf module — part {p["n"]}"` in your reply.', '']
        if p['notes']:
            L += ['## Notes for this part', ''] + [f'- {x}' for x in p['notes']] + ['']
        if p['types']:
            L += ['## The app\'s own types these cards name', '', 'What each is made of. The comments inside are the in-house author\'s.', '',
                  '```ts', '\n\n'.join(p['types'][t] for t in sorted(p['types'])), '```', '']
        L += ['## The cards', '', '```json', json.dumps(p['card_json'], indent=1, ensure_ascii=False), '```', '']
        if p['lean']:
            L += ['## Formulas these cards lean on', '',
                  f'{len(p["lean"])} functions named by the formulas above whose own cards are in another part. They are '
                  'here so you can work your answers. Do not judge or test them in this part.', '',
                  '```json', json.dumps(p['lean'], indent=1, ensure_ascii=False), '```', '']
        if p['compare']:
            L += ['## The same idea, computed elsewhere — for comparison only', '',
                  'Some cards here compute something another card also computes. Their formulas are printed so you can check '
                  'the two agree. Do not judge or test these here; where one disagrees with a card in this part, the finding '
                  'goes on this part\'s card and names both identifiers.', '']
            for title, here, there in p['compare']:
                L += [f'**{title}** — in this part: {", ".join(here)}', '', '```json', json.dumps(there, indent=1, ensure_ascii=False), '```', '']
        if p['figures_json']:
            L += ['## The figures these cards feed — as the screen register holds them', '',
                  'The author\'s record of each figure, with a worked example the app\'s own door ran (convention 10). '
                  'Judge the cards; the figures themselves are checked against the tenets in the screen parts.', '',
                  '```json', json.dumps(p['figures_json'], indent=1, ensure_ascii=False, default=str), '```', '']
    else:
        L += [f'{len(p["figures"])} figures to check against the tenets, {len(p["decisions"])} decisions to check, and the '
              'cross-card checks named below. No cards in this part. Read the brief '
              f'`{FILE_STEM}.md` first. Put `"batch": "cf module — part {p["n"]}"` in your reply, with `screen_checks`, '
              '`rules_held` and `cross_card_checks`.', '',
              '## The figures — as the screen register holds them', '',
              'Each figure: the words beside it on screen, its unit and period, the screens and the parts of them it is '
              'printed in, what it answers, how it is worked, what it says when it cannot be worked, the author\'s notes, '
              'the worked example the app\'s own door ran, and the decisions that govern it.', '',
              '```json', json.dumps(p['figures_json'], indent=1, ensure_ascii=False, default=str), '```', '',
              '## The cross-card checks for this part', '',
              f'From `{TAX_FILE}`. For each, build one household of your own, work the figures named, and say whether they agree.', '',
              '```json', json.dumps(p['cross'], indent=1, ensure_ascii=False), '```', '']
    if p['decisions']:
        L += ['## The decisions that govern this part — one `rules_held` line for each', '',
              'From the owner\'s decision log, in force. `his_words` are his; `the_log_records` is the log\'s record of what he '
              'decided; `governs` is what the log says it reaches; `whose` says when a row is the lead\'s decision under his '
              'rulings rather than his own. The names of the app\'s test files are replaced by [a test of the app]: you are not '
              'shown the tests.', '',
              '```json', json.dumps([decision_text(ctx['decisions'][d]) for d in p['decisions']], indent=1, ensure_ascii=False), '```', '']
    else:
        L += ['## The decisions that govern this part', '',
              'No decision in the owner\'s log names these cards, the figures they feed or the files they live in. '
              '`rules_held` stays empty for this part; judge the cards against the tenets, published sources and arithmetic.', '']
    return '\n'.join(L)


def figure_json(fid, spec, where, gov):
    keep = ('label', 'unit', 'per', 'grain', 'screens', 'answers', 'formula', 'inputs', 'decisions', 'refusal', 'note', 'worked', 'door', 'ruled')
    out = {'id': fid}
    for k in keep:
        if spec.get(k) not in (None, '', []):
            out[k] = spec[k]
    out['printed_in'] = where.get(fid, [])
    out['decisions_that_govern_it'] = gov
    return out


INDEX = 'moneykeel_audit_cards_index_v01.md'
INDEX_START = '<!-- THE CASH FLOW PACKAGE — this section and the two Cash flow rows above are written by moneykeel_audit_package.py on each build of the package -->'
INDEX_END = '<!-- end of the Cash flow package section -->'


def update_index(out_dir, contents, parts):
    """THE INDEX POINTS AT THE PACKAGE (2026-10-24). The index is written whole only by build-outside-test-cards.py
    --rewrite-the-pack, which also rewrites every file of the pack as sent — never to be run for this. It listed sixteen
    Cash flow batch files that were never on disk (the pack as sent holds fifteen, now in to-send/archive/ under
    2026-10-04). So this writes only what is Cash flow's in it: the Cash flow rows of its two tables become one pointer
    row each, and one section names the package and its parts. Every other line is left byte for byte, and checked."""
    path = os.path.join(out_dir, INDEX)
    before = open(path, encoding='utf8').read()
    body = before.split('\n' + INDEX_START)[0].rstrip('\n') + '\n'
    lines = body.split('\n')
    batch_row = re.compile(r'^\| `(?:moneykeel_audit_cards_cashflow_\d\d-of-\d\d\.md|to-send/MoneyKeel_CashFlow_Audit_Package/)`')
    left_row = re.compile(r'^\| (?:MK-CF-[FO]-\d{3} |Cash flow \|)')
    out, done_batch, done_left, dropped = [], False, False, 0
    c = contents['counts']
    for ln in lines:
        if batch_row.match(ln):
            dropped += 1
            if not done_batch:
                out.append(f'| `to-send/{PACKAGE_DIR}/` (and its .zip) | cashflow module v01 — replaces the Cash flow batches | '
                           f'{c["cards"]} | {c["cases_asked"]:,} | {len(parts)} parts — see "The Cash flow package" below |')
                done_batch = True
        elif left_row.match(ln):
            dropped += 1
            if not done_left:
                out.append(f'| Cash flow | listed with the reason in the package brief `{FILE_STEM}.md`, section "Not on a card" '
                           f'({c["not_carded"]} on {contents["built_on"]}) |')
                done_left = True
        else:
            out.append(ln)
    assert done_batch and done_left, 'the index no longer has the Cash flow rows this writes over — read it before changing this'
    kept = [ln for ln in lines if not batch_row.match(ln) and not left_row.match(ln)]
    assert [ln for ln in out if not batch_row.match(ln) and not left_row.match(ln)] == kept, 'a line of the index that is not Cash flow\'s would change'
    sec = ['', INDEX_START, '', '## The Cash flow package — what to send for Cash flow', '',
           f'Built {contents["built_on"]} by `build-outside-test-cards.py --audit-package CF`, checked by '
           '`check-outside-audit-package.py`, which zips it only when every check passes. It replaces the Cash flow batch '
           'files above: the fifteen of 2026-10-04 that were on disk are in `to-send/archive/` under that date.', '',
           f'- Folder: `to-send/{PACKAGE_DIR}/`, and `to-send/{PACKAGE_DIR}.zip`.',
           f'- {c["functions"]} functions and {c["orchestrators"]} orchestrators: {c["cards"]} on cards ({c["cases_asked"]:,} cases asked for), '
           f'{c["not_carded"]} listed with the reason; {c["figures"]} figures; {c["decisions"]} decisions of his that govern it.',
           f'- How to send: one new chat for each part. Paste the brief `{FILE_STEM}.md` and the part. For parts '
           + ', '.join(str(n) for n in contents['parts_that_check_published_amounts']) + f' add `{TAX_FILE}`. Save each reply, unchanged, in `returned/`.',
           '- Once sent, the folder and the zip move to `to-send/archive/` under the date they were sent.', '',
           '| Part | File | What it covers | Cards | Cases |', '|---|---|---|---|---|']
    for p in parts:
        sec.append(f'| {p["n"]} | `{p["file"]}` | {p["title"]} | {len(p["cards"]) or "—"} | '
                   + (f'{len(p["cards"]) * 5}' if p['kind'] == 'cards' else f'{len(p["figures"])} figures against the tenets') + ' |')
    sec += ['', INDEX_END, '']
    after = '\n'.join(out).rstrip('\n') + '\n' + '\n'.join(sec)
    open(path, 'w', encoding='utf8').write(after)
    print(f'index: {dropped} Cash flow rows replaced by 2 pointer rows, the Cash flow package section written; every other line unchanged')


def build(ctx):
    root, out_dir = ctx['ROOT'], ctx['OUT']
    testable, cards, appendix = ctx['testable'], ctx['cards'], ctx['appendix']
    figures = ctx['figures']
    rows = ctx['decision_rows']
    built_on = datetime.date.today().isoformat()
    commit = _git(root, 'rev-parse', '--short', 'HEAD') or 'not recorded'
    # the cards are read from the code ON DISK: say so when it holds changes the last commit does not
    dirty = [ln for ln in _git(root, 'status', '--porcelain', '--', 'src', 'MoneyKeel/functions', 'Calculation Module code/engines').split('\n') if ln.strip()]
    if dirty:
        commit = f'{commit}, plus {len(dirty)} changed files not yet committed'

    # ── 1. the cards, counted from the code ─────────────────────────────────────────────────────────
    chosen = sorted((c for c in testable if c['card']['id'].startswith('MK-CF-')), key=lambda c: c['card']['id'])
    skipped = sorted((c for c in cards if c['skip'] and c['card']['id'].startswith('MK-CF-')), key=lambda c: c['card']['id'])
    all_cf = [c for c in cards if c['card']['id'].startswith('MK-CF-')]
    assert len(chosen) + len(skipped) == len(all_cf), 'a Cash flow record is neither carded nor listed'
    assert len(all_cf) >= 220 and len(chosen) >= 200, f'only {len(all_cf)} Cash flow records ({len(chosen)} testable) — the reader has gone blind'
    by_id = {c['card']['id']: c for c in chosen}
    parts_spec = [(t, list(ids)) for t, ids in CF_PARTS]
    flat = [i for _t, ids in parts_spec for i in ids]
    dup = [i for i, n in collections.Counter(flat).items() if n > 1]
    assert not dup, f'cards in two parts: {dup}'
    extra = sorted(set(flat) - set(by_id))
    assert not extra, f'in a part but not a testable card today (removed, renumbered or now storage only): {extra}'
    # A CARD NEW SINCE THE LISTS WERE TYPED is placed, and said so, never dropped: with the part that already holds the most
    # cards from its own file, if it has room; else with the part holding the most of the cards its formula names. A card
    # neither rule can place stops the build.
    def place(c):
        same = collections.Counter(n for n, (_t, ids) in enumerate(parts_spec) for i in ids if by_id[i]['path'] == c['path'])
        named = set(re.findall(r'\b[a-z][a-z0-9]*[A-Z]\w*\b', c['card']['formula_in_words']))
        lean = collections.Counter(n for n, (_t, ids) in enumerate(parts_spec) for i in ids if by_id[i]['card']['name'] in named)
        for counter, why in ((same, 'the cards of its own file'), (lean, 'the cards its formula names')):
            for n, _k in counter.most_common():
                if len(parts_spec[n][1]) < MAX_CARDS:
                    return n, why
        return None, None
    placed = []
    for i in sorted(set(by_id) - set(flat)):
        n, why = place(by_id[i])
        assert n is not None, (f'{i} {by_id[i]["card"]["name"]} is a new Cash flow card and no part can take it '
                               f'(file {by_id[i]["path"]}): add it to a part in CF_PARTS')
        parts_spec[n][1].append(i)
        placed.append({'card': i, 'part': n + 1, 'why': why})
        print(f'   placed the new card {i} {by_id[i]["card"]["name"]} in part {n + 1} ({parts_spec[n][0]}) — with {why}')
    assert sorted(i for _t, ids in parts_spec for i in ids) == sorted(by_id), 'the parts do not hold exactly today\'s Cash flow cards'
    assert all(len(ids) <= MAX_CARDS for _t, ids in parts_spec), 'a part holds more than the cards one reply can carry'
    for title, notes in CF_NOTES.items():
        assert title in {t for t, _ in CF_PARTS}, f'a note is written for a part that does not exist: {title}'
        for i in re.findall(r'MK-[A-Z]{2}-[FOM]-\d{3}', ' '.join(notes)):
            assert i in by_id or i in figures, f'a note names {i}, which is not a card or figure today'
    for title, ids in CF_COMPARE:
        for i in ids:
            assert i in by_id, f'comparison "{title}" names {i}, which is not a Cash flow card today'

    # ── 2. the figures and the screens ──────────────────────────────────────────────────────────────
    figures_cf = {k: v for k, v in sorted(figures.items()) if k.startswith('MK-CF-M-')}
    assert len(figures_cf) >= 60, f'only {len(figures_cf)} Cash flow figures in the register'
    r2s = route_to_screen(root)
    routes = sorted({r for v in figures_cf.values() for r in v.get('screens', [])})
    unmapped = [r for r in routes if r not in r2s and r != '/home']
    assert not unmapped, f'a figure names a screen no route file renders: {unmapped}'
    screens = [(r, r2s.get(r, 'HomeScreen')) for r in routes]
    shown_in = printed_in(root, sorted({s for _r, s in screens} | set(CF_OWNED_SCREENS)))   # BudgetScreen has no route: it is drawn inside the Cash flow tab

    # ── 3. the decisions that govern it ─────────────────────────────────────────────────────────────
    card_ruled = collections.defaultdict(set)
    for c in all_cf:
        for d in c.get('ruled', []):
            card_ruled[d].add(c['card']['id'])
    owned_routes = [r for r in routes if r != '/home']
    card_paths = collections.defaultdict(set)
    for c in chosen:
        card_paths[c['path']].add(c['card']['id'])
    decisions = governing_decisions(rows, by_id, CF_OWNED_SCREENS, owned_routes, card_ruled, card_paths)
    assert len(decisions) >= 100, f'only {len(decisions)} decisions govern Cash flow — the filter has gone blind'
    gov_of = collections.defaultdict(list)          # a card or figure → the decisions that name it
    for did, d in decisions.items():
        for n in d['names']:
            gov_of[n].append(did)

    # ── 4. the parts ────────────────────────────────────────────────────────────────────────────────
    parts = []
    serves = {c['card']['id']: {f['id'] for f in c['card'].get('figures_it_feeds', [])} for c in chosen}
    for n, (title, ids) in enumerate(parts_spec, 1):
        group = [by_id[i] for i in ids]
        types = {}
        for c in group:
            types.update(c['types'])
        figs = sorted({f for i in ids for f in serves[i] if f in figures_cf})
        decs = [did for did, d in decisions.items() if d['names'] & (set(ids) | set(figs))
                or any(card_paths[f] & set(ids) for f in d['files'])]
        lean = appendix(group)
        compare = []
        for ctitle, members in CF_COMPARE:
            here = [i for i in members if i in ids]
            there = [i for i in members if i not in ids]
            if here and there:
                compare.append((ctitle, here, [{k: by_id[i]['card'][k] for k in ('id', 'name', 'what_it_is_for', 'formula_in_words')} for i in there]))
        card_json = []
        for c in group:
            card = dict(c['card'])
            card['handed'] = re.sub(r'\s*\{\s*$', '', card['handed'])     # the declaration ends at its return type
            card['decisions_that_govern_it'] = sorted(set(gov_of.get(card['id'], [])) | {d for f in serves[card['id']] for d in gov_of.get(f, [])})
            feeds = card.get('figures_it_feeds', [])
            card['period'] = ([f'{f["id"]}: ' + (f'a {f["per"]}' if f.get('per') else 'no period on the figure')
                               + (f' — {figures_cf[f["id"]]["grain"]}' if figures_cf.get(f['id'], {}).get('grain') else '') for f in feeds]
                              if feeds else 'No figure on screen names this function; its period is whatever its formula states.')
            card['when_it_gives_no_number'] = ([f'{f["id"]}: {f.get("when_it_refuses")}' for f in feeds] if feeds
                                               else 'Not recorded apart from the formula: read the formula for what it gives when an input is missing.')
            card_json.append(card)
        parts.append({'n': n, 'kind': 'cards', 'title': title, 'cards': ids, 'decisions': decs, 'figures': figs, 'types': types,
                      'lean': lean, 'compare': compare, 'card_json': card_json, 'notes': CF_NOTES.get(title, []),
                      'figures_json': [figure_json(f, figures_cf[f], shown_in, gov_of.get(f, [])) for f in figs]})
    # the two screen parts: every figure in one, every decision no card part carries in one
    tax = tax_sources_file(published_amounts(root), json.load(open(os.path.join(ctx['HERE'], 'moneykeel_published_sources.json'), encoding='utf8')), built_on)
    ctx['cross'] = tax['cross_card_acceptance_cases']
    for x in ctx['cross']:
        gone = [f for f in x['figures'] if f not in figures_cf]
        assert not gone, f'the cross-card check {x["id"]} names {gone}, which the register no longer declares'
    # a part whose cards use a published amount checks that amount too: its topics, by the cards each topic names
    for t in tax['source_checks']:
        for c in t['cards']:
            assert c in by_id, f'the tax topic "{t["topic"]}" names {c}, which is not a card today'
    for p in parts:
        p['tax_topics'] = [t['topic'] for t in tax['source_checks'] if set(t['cards']) & set(p['cards'])]
        if p['tax_topics']:
            p['notes'] = p['notes'] + [f'This part also checks published amounts. Fill `source_checks` from `{TAX_FILE}` for: '
                                       + '; '.join(p['tax_topics']) + ' — one entry for each, with the source you checked it against.']
    tab_figs = sorted(k for k, v in figures_cf.items() if '/cashflow' in v['screens'] or '/home' in v['screens'])
    other_figs = sorted(k for k in figures_cf if k not in tab_figs)
    carried = {d for p in parts for d in p['decisions']}
    for n, (title, figs) in enumerate(zip(SCREEN_PART_TITLES, (tab_figs, other_figs)), len(parts) + 1):
        routes_here = {r for f in figs for r in figures_cf[f]['screens']}
        screens_here = {s for r, s in screens if r in routes_here}
        decs = [did for did, d in decisions.items() if d['names'] & set(figs) or set(d['screens']) & (screens_here | routes_here)]
        cross = [x for x in tax['cross_card_acceptance_cases'] if set(x['figures']) & set(figs)]
        parts.append({'n': n, 'kind': 'screens', 'title': title, 'cards': [], 'decisions': decs, 'figures': figs, 'cross': cross,
                      'figures_json': [figure_json(f, figures_cf[f], shown_in, gov_of.get(f, [])) for f in figs]})
    # a decision no part carries goes to the screen part of the Cash flow tab — and is counted
    carried = {d for p in parts for d in p['decisions']}
    orphans = [d for d in decisions if d not in carried]
    parts[-2]['decisions'] += orphans
    assert {d for p in parts for d in p['decisions']} == set(decisions), 'a decision is in no part'
    assert {f for p in parts if p['kind'] == 'screens' for f in p['figures']} == set(figures_cf), 'a figure is in no screen part'
    nparts = len(parts)
    for p in parts:
        p['file'] = f'{FILE_STEM}_part-{p["n"]:02d}-of-{nparts:02d}.md'

    # ── 5. write ────────────────────────────────────────────────────────────────────────────────────
    pkg = os.path.join(out_dir, 'to-send', PACKAGE_DIR)
    # A PACKAGE THAT WENT TO AN OUTSIDE MODEL IS NEVER REWRITTEN IN PASSING (the pack-as-sent rule): writing over one
    # that is on disk needs --rewrite-the-package, said on purpose. Once sent, it moves to to-send/archive/ with its date.
    if os.path.isdir(pkg) and os.listdir(pkg):
        if not ctx.get('rewrite'):
            raise SystemExit(f'STOPPED: to-send/{PACKAGE_DIR}/ already holds a package. If it has NOT been sent, rebuild it '
                             'with --rewrite-the-package; if it has, move it to to-send/archive/ under its date first.')
        for f in os.listdir(pkg):
            os.remove(os.path.join(pkg, f))
    os.makedirs(pkg, exist_ok=True)
    ctx.update({'chosen': chosen, 'decisions': decisions, 'shown_in': shown_in})
    head = brief_head(ctx, parts, decisions, figures_cf, screens, skipped, built_on, commit)
    # the judge is never pointed at the app's tests: a test file's name, wherever a record quotes one, is replaced
    # — except inside his own words, which are never rewritten (a decision's record already hides the rest)
    def scrub(t):
        cut = t.find('## The decisions that govern this part')
        return TEST_FILE.sub('[a test of the app]', t) if cut < 0 else TEST_FILE.sub('[a test of the app]', t[:cut]) + t[cut:]
    open(os.path.join(pkg, FILE_STEM + '.md'), 'w', encoding='utf8').write(scrub(head))
    for p in parts:
        open(os.path.join(pkg, p['file']), 'w', encoding='utf8').write(scrub(part_body(p, nparts, ctx)))
    open(os.path.join(pkg, TAX_FILE), 'w', encoding='utf8').write(scrub(json.dumps(tax, indent=1, ensure_ascii=False)))
    contents = {
        'what_this_is': 'What is in each part of the Cash flow package, by identifier. Built by build-outside-test-cards.py --audit-package CF.',
        'built_on': built_on, 'commit': commit,
        'counts': {'functions': sum(1 for c in all_cf if '-F-' in c['card']['id']),
                   'orchestrators': sum(1 for c in all_cf if '-O-' in c['card']['id']),
                   'cards': len(chosen), 'not_carded': len(skipped), 'figures': len(figures_cf),
                   'decisions': len(decisions), 'parts': nparts, 'cases_asked': len(chosen) * 5},
        'parts': [{'part': p['n'], 'file': p['file'], 'title': p['title'], 'kind': p['kind'], 'cards': p['cards'],
                   'figures': p['figures'], 'decisions': p['decisions'], 'leaned_on': [x['id'] for x in p.get('lean', [])]} for p in parts],
        'not_carded': [{'id': c['card']['id'], 'name': c['card']['name'], 'why': c['skip']} for c in skipped],
        'placed_by_rule': placed,          # cards new since the part lists were typed, and where the rule put each
        'decisions': {did: d['why_in_scope'] for did, d in decisions.items()},
        'screens': [{'route': r, 'screen': s, 'figures': [k for k, v in figures_cf.items() if r in v['screens']],
                     'printed_in': sorted({w for k, v in figures_cf.items() if r in v['screens'] for w in shown_in.get(k, [])})} for r, s in screens],
        'parts_that_check_published_amounts': {p['n']: p['tax_topics'] for p in parts if p.get('tax_topics')},
        'writer_examples': [{'unit': u, 'per': pp, 'value': v, 'written': w} for u, pp, v, w in writer_examples()],
    }
    json.dump(contents, open(os.path.join(pkg, CONTENTS_FILE), 'w', encoding='utf8'), indent=1, ensure_ascii=False)
    if ctx.get('write_index', True):
        update_index(out_dir, contents, parts)
    print(f'Cash flow package written: to-send/{PACKAGE_DIR}/ — {len(chosen)} cards in {nparts - 2} card parts and 2 screen parts, '
          f'{len(figures_cf)} figures, {len(decisions)} decisions, {len(skipped)} listed without cards; '
          f'{len(orphans)} decisions carried by no card part went to part {parts[-2]["n"]}')
    return contents
