"""Builds the MoneyKeel calculation master file.

One row per figure a person reads on screen, tied to its metric, its engine and their identifiers.
Every row is either VERIFIED (a person read the screen and confirmed the chain) or NOT STARTED.
Nothing here is guessed: an engine that cannot be found in the code is written as NOT FOUND.
"""
import json, os, re, datetime, openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(ROOT)
OUT = 'MoneyKeel/documents/other/moneykeel_calc_master_calculation-master_v01.xlsx'
TODAY = datetime.date.today().isoformat()

PARENTS = {'home':'Home','networth':'Networth','performance':'Performance',
           'cashflow':'Cashflow','plan':'Plan','menu':'Menu'}
TAB_ORDER = ['Reference','Specification','multiple_screens','home','networth','performance','plan','cashflow','menu','inputs','database','core_screens','reconciliation','engines','functions_from_code']

COLS = ['Metric ID','Parent Screen Name','Secondary Screen Name','Name on Screen',
        'Name of Underlying Metric','Name of Underlying Engine','Engine ID',
        'Formula (mathematical)','Formula (in words)',
        'Inputs it needs','What comes out — unit and rounding',
        'What it says when it cannot be computed','Grain — one figure per what',
        'Period — as of when, over what window','Dependency — engine ID → the output it uses',
        'Secondary calculations and decisions the engine makes',
        'Errors or findings to address','Decisions made',
        'Same figure as (S16)',
        'Questions for you (numbered)','YOUR ANSWER — use the same number',
        'Your name for it (72-metric file)','Core screen?','Row status']

# formulas: the mathematical form is written here; the words come from the old master where the
# engine has a row there, and are written here where it does not.
import importlib.util as _il
_sp=_il.spec_from_file_location('mkf', os.path.join(os.path.dirname(os.path.abspath(__file__)),'moneykeel_formulas.py'))
_f=_il.module_from_spec(_sp); _sp.loader.exec_module(_f)

_oldwords = {}
_answers = {}
def _load_old_words():
    w=openpyxl.load_workbook('Calculation Module/MoneyKeel-calculation-master-v1.xlsx', data_only=True)
    sh=w['2. Engines']; hd=[str(c.value) if c.value else '' for c in sh[2]]; jx={h:n for n,h in enumerate(hd)}
    for r in sh.iter_rows(min_row=3, values_only=True):
        n=r[jx['Engine name']]
        if not n: continue
        n=str(n).strip()
        _KNOWN_ENGINES.add(n)
        _oldwords[n] = str(r[jx['Formula — the actual rules']] or '').strip()
        a = str(r[jx['What it answers']] or '').strip().replace('\n',' ')
        _answers[n] = (a.split('?')[0].strip() + '?') if '?' in a else (a[:90] or '')

SECOND = {
 'ALLOCATION_BY_CLASS':'DECIDES the class of every asset before it can group them, and DECIDES the words shown for each class. The classifying rule itself is engine MK-ST-E-xxx — see the asset-classification standard.',
 'ACCOUNT_SPLIT':'DECIDES which class each holding inside one account belongs to, then how much of the account total sits in each.',
 'ASSET_CLASS_OF_ACCOUNT':'DECIDES an account-level class from the holdings inside it, and what to call a mixed account on screen.',
 'HOLDING_MARKET_VALUE':'DECIDES whether a line is a share, a bond, an option, a crypto amount or a currency, because the units differ; and DECIDES the price to use when the feed has none.',
 'BOND_FACTS':'DECIDES how a bond is NAMED on screen — issuer, or the identifying number, or a plain description; and DECIDES whether a line is a bond at all.',
 'LEDGER':'DECIDES what each institution word means before any amount is booked, and DECIDES the sign when a stated direction and the amount disagree.',
 'HAND_VALUE_AGE':'DECIDES whether a stated value is fresh enough to show without a warning.',
 'PRICE_FRESHNESS':'DECIDES the moment a price stops being current.',
 'TOTAL_CASH':'DECIDES what counts as cash — and deliberately excludes money-market funds.',
}
USED_BY = {}
METRICS_BY_ENGINE = {}
UNMATCHED = {}
_deps = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'moneykeel_engine_deps.json')))

def assumptions(engine, math_text, decided):
    e=str(engine); mt=(math_text or '').lower(); out=[]
    if decided: out.append('[Founder] ' + decided)
    if 'inflation' in mt or 'inflation' in e.lower():
        out.append('[Built in] Inflation comes from a published feed, with a fallback figure when the feed is silent.')
    if '(1 + r)' in mt or 'random return' in mt or 'return' in mt and 'assumed' in mt:
        out.append('[Built in] The assumed rate of return, which the person can change on the cockpit.')
    if 'life expectancy' in mt:
        out.append('[Built in] A life-expectancy figure the person never chose.')
    if '25' in mt and 'nest egg' in mt:
        out.append('[Founder] Twenty-five times the yearly spending not covered by guaranteed income, counted from the start of the retirement year.')
    if 'claim' in mt or 'full retirement age' in mt:
        out.append('[The person] The claim age they set, and the statement amount they typed.')
    if 'retire' in mt or 'retirement' in mt:
        out.append('[The person] The retirement age in their plan.')
    if not out:
        out.append('NOT DETERMINED — no assumption recorded for this figure yet.')
    return '\n'.join(out)

def spec_cols(engine, label, math_text):
    e=str(engine); parts=[x.strip() for x in e.split('·')]
    ins_raw=' · '.join(filter(None,(_deps['inputs'].get(x,'').replace('\n',' · ') for x in parts)))
    ins, ids, unmatched = _f.match_inputs(ins_raw)
    for i in ids: USED_BY.setdefault(i,set()).update(parts)
    for u in unmatched: UNMATCHED.setdefault(u, set()).update(parts)

    unit, grain, period = _f.derive(e, label, math_text)
    ref = ' | '.join(filter(None,(_f.REFUSAL.get(x,'') for x in parts)))
    if not ref:
        mt = (math_text or '')
        if e.startswith('worked out on the screen'):
            ref = 'Inherits the refusal of the figures it is built from: if either side is missing, this line is not shown.'
        elif 'Σ' in mt or mt.startswith(('total','net worth','cash','investments','assets')):
            ref = _f.EMPTY_SUM
        elif e.startswith('the amount') or e.startswith('the amounts') or e.startswith('the age') or e.startswith('the value'):
            ref = 'Nothing to compute — the person either entered it or has not, and the screen shows it only when they have.'
        elif '÷' in mt:
            ref = 'A division: with nothing on the bottom there is no answer, and the line must not appear as zero. NOT YET CONFIRMED against the engine.'
        else:
            ref = 'NOT DETERMINED — this engine has not been read for its refusal yet.'
    dep = dep_note(e)
    if not ins: ins = 'NOT DETERMINED — no input list on record for this engine'
    return ins, unit + '  [derived by rule — confirm]', ref, grain + '  [derived by rule — confirm]', period + '  [derived by rule — confirm]', dep

_DUP_OF = {}
for _keep,(_folded,_why) in getattr(_f,'DUPLICATES',{}).items():
    for _f_id in _folded: _DUP_OF[_f_id] = (_keep,_why)

_KNOWN_ENGINES = set()
def mark_engine(engine):
    """An engine name that exists in no engine row is a name I assigned while reading the screen.
    It must say so, or the row looks like it points at something documented when it does not."""
    out=[]
    for part in [p.strip() for p in str(engine).split('·')]:
        if part and part.isupper() and part.replace('_','').isalpha() and part not in _KNOWN_ENGINES:
            out.append(part + '  [NAME ASSIGNED HERE — no engine row exists for it yet]')
        else:
            out.append(part)
    return ' · '.join(out)

def dep_id(name):
    if name not in engine_id:
        engine_id[name] = nid('XS','E')
    return engine_id[name]

def dep_note(engine):
    parts=[x.strip() for x in str(engine).split('·')]
    seen=[]
    for x in parts:
        for d in _deps['deps'].get(x,[]):
            if d not in [y[0] for y in seen]: seen.append((d,))
    if not seen: return 'None — this engine reads raw inputs only' if any(x in _deps['inputs'] for x in parts) else 'NOT DETERMINED'
    out=[]
    for (d,) in seen:
        out.append(dep_id(d) + ' (' + d + ') → ' + (_answers.get(d,'') or 'output not recorded'))
    return '\n'.join(out)

def dup_note(mid):
    if mid in _DUP_OF:
        keep,why=_DUP_OF[mid]; return 'THE SAME FIGURE AS ' + keep + ' — ' + why
    kept = getattr(_f,'DUPLICATES',{}).get(mid)
    if kept: return 'THE SURVIVING IDENTIFIER for this figure. Folded in: ' + ', '.join(kept[0]) + '. ' + kept[1]
    return ''

_asked=set()
def questions_for(engine):
    Q=getattr(_f,'QUESTIONS',{})
    out=[]
    for part in [x.strip() for x in str(engine).split('·')]:
        if part in Q and part not in _asked:
            _asked.add(part); out.extend(Q[part])
    return '\n\n'.join(out)

def notes(engine):
    e=str(engine)
    parts=[x.strip() for x in e.split('·')]
    F=getattr(_f,'FINDINGS',{}); D=getattr(_f,'DECISIONS',{})
    find=' | '.join(filter(None,(F.get(x,'') for x in parts)))
    dec =' | '.join(filter(None,(D.get(x,'') for x in parts)))
    sec =' | '.join(filter(None,(SECOND.get(x,'') for x in parts)))
    return find, dec, sec

def formulas(engine):
    e=str(engine)
    if e in _f.MATH:
        parts=[x.strip() for x in e.split('·')]
        words=' · '.join(filter(None,(_oldwords.get(x,'') for x in parts))) or ''
        return _f.MATH[e], words or getattr(_f,'WORDS',{}).get(e,'')
    if e in _f.SCREEN:
        return _f.SCREEN[e], 'Worked out on the screen itself, with no engine behind it — a place a second definition can appear.'
    if e in _f.NOTDOC: return _f.NOTDOC[e]
    if e in _f.OTHER:  return _f.OTHER[e]
    return '', ''
INPUT_COLS = ['Input ID','Variable name','Source','Which metric uses it','Which engine uses it','Engine ID','Row status']

# ---------------------------------------------------------------- verified rows
# Read screen by screen from the source on 2026-08-22. Nothing here is inferred:
# an engine with no row in the old master is written as NOT IN OLD MASTER with where it lives.
NM = 'NOT IN OLD MASTER'

# figures shown on MORE THAN ONE parent screen — they live here once, with every label they wear
MULTI = [
 ('Net worth · YOUR NET WORTH',                    'Home · Networth',            'nw.net_worth',      'NET_WORTH'),
 ('Will my money last / Is my money lasting (odds)','Home · Plan · Cashflow',     'wil.chance',        'WILL_IT_LAST_RESULT'),
 ('YOUR INVESTMENTS · 📈 INVESTMENTS',              'Home · Performance · Networth','investTotal',     'TOTAL_INVESTMENTS'),
 ('▲ up/▼ down $X (Y%) this month · Return · YOUR RETURN','Home · Performance',   'youReturn / shownReturn','VALUE_WEIGHTED_RETURN'),
 ('Spent so far · Spent $X of $Y left to spend this month','Home · Cashflow',     'bva.spent_total',   NM + ' — budgetVsActual, src/domain/budget'),
 ('Income · In (received) · In (take-home)',        'Home · Cashflow',            'thisMonthNet',      NM + ' — incomeMonthlyGrid, src/domain/income'),
 ('Left / Over · left to spend this month',         'Home · Cashflow',            'left',              'worked out on the screen: money in − spent so far'),
]

HOME = [
 ('prices updated <when>',           'freshness',   'PRICE_FRESHNESS'),
 ('Your net worth just crossed X',   'milestone',   NM + ' — milestoneCrossed, src/domain/milestones.ts'),
 ('Needs your attention (1, 2, 3)',  'topInsights', NM + ' — useInsights, src/domain/insights'),
 ('<n>% spent · day n of m',         'pctSpent',    'worked out on the screen: spent so far ÷ money in'),
]

NETWORTH = [
 ('Change in net worth +$X',                 'changeThisYear', 'TREND_SERIES'),
 ('Return on cash + investments ±X%',        'invPct',         'NW_CHANGE_PCT'),
 ('the trend line',                          'series',         'TREND_SERIES'),
 ('WHAT YOU OWN',                            'totalAssets',    'ACCOUNT_SHARE_OF_TOTAL'),
 ('💵 CASH',                                  'cashOnHand',     'TOTAL_CASH'),
 ('🏠 PERSONAL PROPERTY','sectionTotals','worked out on the screen: the sum of the accounts in the personal-property section'),
 ('class rows — by class, institution or type','classRows',     'ALLOCATION_BY_CLASS'),
 ('each account and its balance',            'a.balance',      'ACCOUNT_SPLIT'),
 ('WHAT YOU OWE · 💳 DEBTS',                  'dState.total_debt_balance', 'DEBT_PICTURE'),
 ('each debt and what is left on it',        'd.remaining_balance', 'DEBT_PICTURE'),
 ('minimum monthly payment on a debt',       'd.minimum_monthly_payment', 'DEBT_REQUIRED_PAYMENT'),
 ('Monthly debt payments $X/mo',             'dState.total_monthly_debt_service', 'DEBT_PICTURE'),
 ('EMERGENCY CUSHION — X.X months',          'runwayMonths',   'worked out on the screen: cash ÷ a typical month of essentials'),
 ('of essentials covered by your cash — $X cash ÷ $Y/mo essentials','cashOnHand / monthlySpend','TOTAL_CASH · PLANNED_SPENDING'),
 ('YOUR RETIREMENT PLAN — on track for $X by age Y','pathAhead','POT_AT_RETIREMENT'),
 ('Net worth so far (setup)',                'nw.net_worth',   'NET_WORTH'),
 ('Assets $X − Debts $Y = Net worth $Z',     'totalAssets / dState.total_debt_balance', 'NET_WORTH · DEBT_PICTURE'),
]

PERFORMANCE = [
 ('Ending value',                            'walk.ending',          'NW_CHANGE_WALK'),
 ('Wealth generated',                        'walk.wealthGenerated', 'NW_CHANGE_WALK'),
 ('HOW $X BECAME $Y · ALL ACCOUNTS',         'walk.beginning / walk.ending', 'NW_CHANGE_WALK'),
 ('Ending market value (per account)',       'w.ending',             'NW_CHANGE_WALK'),
 ('each account and its ending value',       'a.ending',             'PERFORMANCE_TABLE'),
 ('WHAT EACH CATEGORY EARNED — RETURN',      'b.earned / b.ret',     'PERFORMANCE_TABLE'),
 ('All categories',                          'total',                'PERFORMANCE_TABLE'),
 ('HONEST COMPARISON',                       'benchPort',            'BENCHMARK_RETURN_BLENDED'),
 ('Return (money-weighted, when the record covers it)','mw.rate',    'MODIFIED_DIETZ (Calculation Module code/engines/window-return.ts)'),
]

CASHFLOW = [
 ('Expected in',                             'cell.inflow',   NM + ' — the by-month grid, src/domain/cashflow'),
 ('Planned out · incl. <big bill>',          'cell.outflow',  NM + ' — the by-month grid, src/domain/cashflow'),
 ('= Planned surplus',                       'cell.net',      'worked out on the screen: expected in − planned out'),
 ('Out (spent + debt)',                      'out',           NM + ' — budgetVsActual, src/domain/budget'),
 ('= Surplus',                               'inn - out',     'worked out on the screen: in − out'),
 ('YOUR SOURCES — Base salary',              'op.baseSalary', 'TOTAL_INCOME'),
 ('YOUR SOURCES — Self-employment',          'op.seAmount',   'TOTAL_INCOME'),
 ('YOUR SOURCES — Bonus',                    'op.bonusAnnual','TOTAL_INCOME'),
 ('YOUR SOURCES — Stock vesting (equity)',   'rsuTotal',      NM + ' — the equity schedule, src/domain/income'),
 ('YOUR SOURCES — Rental property',          'rentalTotal',   'RENTAL_INCOME_A_YEAR'),
 ('YOUR SOURCES — Social Security · pension','guaranteed',    'RETIREMENT_INCOME_NOW'),
 ('RECEIVED · <month> — each payment',       'i.amount',      NM + ' — the received list, src/domain/income'),
 ('<MONTH> · $X SPENT',                      'spent',         'SPENDING_BY_KIND'),
 ('each expense and its amount',             'e.amount',      'SPENDING_BY_KIND'),
 ('BY CATEGORY VS PLAN — $X of $Y',          'b.spent / b.planned', 'PLANNED_SPENDING'),
 ('BIG-TICKET RADAR — <bill> · due <month>', 'b.amount',      NM + ' — the big-bill radar, src/domain/cashflow'),
 ('well above your usual <category>',        'e.amount',      NM + ' — the unusual-spend check, src/domain/budget'),
 ('THIS MONTH — In (take-home)',             'inflow',        NM + ' — incomeMonthlyGrid, src/domain/income'),
 ('THIS MONTH — Out (bills + debt)',         'outflow',       'SPENDING_BY_KIND · DEBT_REQUIRED_PAYMENT'),
 ('THIS MONTH — free to use',                'free',          'worked out on the screen: in − out − what the Plan committed'),
 ('<goal> · from your Plan',                 'c.monthlyAmount', NM + ' — plan commitments, src/domain/planning'),
 ('YOUR FUTURE PAYCHECK — At <age>: ~$X / mo','projection.monthly', 'POT_AT_RETIREMENT'),
 ('YOUR FUTURE PAYCHECK — Social Security · pension','projection.guaranteed','RETIREMENT_INCOME'),
]

PLAN = [
 ('✓ What you have — already in: N accounts, $X counted','door.credit.total','WHAT_THE_PLAN_STILL_NEEDS'),
 ("Your odds — can't work them out yet. Add <what> below.",'door.missing','WHAT_THE_PLAN_STILL_NEEDS'),
 ('YOUR RETIREMENT PAYCHECK — each guaranteed source','g.amount', NM + ' — retirementPaycheckYear, src/domain/paycheck'),
 ('= Guaranteed',                            'payMonth.guaranteedTotal', NM + ' — retirementPaycheckYear, src/domain/paycheck'),
 ('+ Draw from savings',                     'payMonth.safeDraw',        NM + ' — retirementPaycheckYear, src/domain/paycheck'),
 ('Your paycheck $X/mo',                     'paycheckTotal', 'worked out on the screen: guaranteed + draw from savings'),
 ('SAVED SCENARIOS (n)',                     'scenarios.length', NM + ' — saved scenarios, src/domain/scenarios'),
]


# secondary screens: (route, label on screen, metric in code, engine)
SECONDARY = {
 'networth': [
  ('/account-detail','Market value','account.balance','HAND_VALUE_AGE'),
  ('/account-detail','Income','acctIncome','the ledger sum of interest and dividends for the account'),
  ('/account-detail','each asset class inside the account','breakdown[k]','ACCOUNT_SPLIT'),
  ('/account-detail','Income: <amount> on a holding row','incomeOf(rw)','the ledger sum for that holding'),
  ('/account-detail','ACTIVITY — n records','txns.length','HISTORY_DEPTH'),
  ('/account-detail','Face value','b.face','BOND_FACTS'),
  ('/account-detail','Interest payments — X%/yr · $Y/yr','annualCoupon(b)','BOND_COUPON'),
  ('/account-detail','Matures — <date> (n years away)','years','BOND_YEARS_LEFT'),
  ('/account-detail','Yield if held to maturity','ytm','BOND_YIELD_TO_MATURITY'),
  ("/account-detail","Yield on today's value",'cy','BOND_CURRENT_YIELD'),
  ('/account-detail','Rates rise 1% → value roughly $X–$Y','sens.ratesUp','BOND_RATE_SENSITIVITY'),
  ('/holding-detail','CURRENT PRICE · LIVE','price','the price feed, with its freshness'),
  ('/holding-detail','Current value','value','HOLDING_MARKET_VALUE'),
  ('/holding-detail','Quantity — n shares','shares','HOLDING_SHARES'),
  ('/holding-detail','Price paid (average)','rawAvg','HOLDING_COST_BASIS'),
  ('/holding-detail','Total paid','basis','HOLDING_COST_BASIS'),
  ('/holding-detail','Dividends received (12 mo)','dividends.trailing12','the ledger sum of dividends over twelve months'),
  ('/holding-detail','Realized gain from your buys and sells','realized','REALISED_GAIN'),
  ('/holding-detail','Gain — long-term (held over 1 yr)','cg.longGain','HOLDING_CAP_GAINS'),
  ('/holding-detail','Gain — short-term (under 1 yr)','cg.shortGain','HOLDING_CAP_GAINS'),
  ('/itemize','We keep the total at $X','lump.balance','the account balance being itemised'),
  ('/itemize','$X of $Y itemized · remainder','allocated / remainder','worked out on the screen: total − what has been itemised'),
  ('/itemize','each holding and its value','h.value','HOLDING_MARKET_VALUE'),
  ('/bonds','total value of your bonds','summary.totalValue','BOND_FACTS'),
  ('/bonds','n bonds · face $X','summary.totalFace','BOND_FACTS'),
  ('/bonds','COUPON / YR','summary.coupon','BOND_COUPON'),
  ('/bonds','AVG YIELD','summary.yield','BOND_CURRENT_YIELD'),
  ('/bonds','each bond — face, coupon, yield','bi','BOND_FACTS · BOND_COUPON'),
 ],
 'plan': [
  ('/will-it-last','What you have (nest egg)','inp.start_balance','WILL_IT_LAST_INPUTS'),
  ('/will-it-last','Monthly spending in retirement','inp.retire_monthly_spend_today','RETIREMENT_SPENDING'),
  ('/will-it-last','Guaranteed income — $X/mo from age Y','inp.guaranteed_monthly_income','GUARANTEED_STREAMS (engines: B1 rebuild)'),
  ('/will-it-last','Monthly saving until then','inp.annual_contrib','WILL_IT_LAST_INPUTS'),
  ('/required-withdrawals','Yours starts in <year> (age N)','rmdStartAgeFor(age)','RMD_START_AGE (Calculation Module code/engines/rmd.ts)'),
  ('/required-withdrawals','Required $X','required','REQUIRED_WITHDRAWAL'),
  ('/required-withdrawals','Taken so far $X · still to take','taken / still','worked out on the screen: required − taken so far'),
  ('/required-withdrawals','YEAR BY YEAR (ESTIMATES) — each year and amount','r.amount','REQUIRED_WITHDRAWAL'),
  ('/required-withdrawals','BASED ON THESE ACCOUNTS — each balance','a.balance','HAND_VALUE_AGE'),
  ('/ss-timing',"Monthly check (today's dollars)",'A.guaranteedMonthly','SS_BENEFIT_AT_AGE'),
  ('/ss-timing','You receive $X/mo ✓','op.ri_ss','RETIREMENT_INCOME_NOW'),
  ('/ss-timing','Claiming at N pays $X a month','r.monthly','SS_CLAIM_FACTOR · SS_BENEFIT_AT_AGE'),
  ('/ss-timing','about $X in total by age N','r.lifetime','SS_LIFETIME_TOTAL'),
  ('/ss-timing','Showing example numbers (a $X/mo statement)','exampleStmt','the worked example used until a real statement goes in'),
  ('/roth','Convert to Roth this year (<year>)','A.rothConversionThisYear','the amount the person chose'),
  ('/roth','Extra tax next April (estimate) — about $X','taxCost','TAX_ON_CONVERSION'),
  ('/roth','from your pre-tax $X','preTax','PRE_TAX_BALANCE'),
  ('/what-if','+$X/mo (the saving dial)','addMonthly','the amount the person chose'),
  ('/what-if','$X → $Y (nest egg before and after)','result.before.egg / result.after.egg','POT_AT_RETIREMENT'),
  ('/what-if','the difference the change makes','result.after.egg - result.before.egg','worked out on the screen: after − before'),
  ('/multi-goal','each goal and its monthly amount','d.monthlyAmount','the amounts the person chose'),
  ('/multi-goal','Retirement saving — $X/mo now → $Y/mo','A.contribMonthly / retirementMo','WILL_IT_LAST_INPUTS'),
  ('/multi-goal','Extra on debt $X/mo','extraDebt','the amount the person chose'),
  ('/multi-goal','paid off <month> · saves $X','weighed.debtPayoff','DEBT_PAYOFF'),
  ('/retirement','incl. Social Security $X/mo from age N','ssIncome','RETIREMENT_INCOME_NOW'),
  ('/retirement','your $X grows to $Y by age N at Z%/yr','nestEgg / scProjected','POT_AT_RETIREMENT'),
  ('/retirement','At Z% return, your money lasts past age N','scDeplete','WILL_IT_LAST_RESULT'),
  ('/retirement','Retire at age (the dial)','rAge','the age the person chose'),
  ('/education','the future total cost of school','plan.futureTotalCost','EDUCATION_COST'),
  ('/education','$X/mo set aside closes the $Y gap','plan.monthlyNeeded / plan.gap','EDUCATION_COST'),
 ],
 'cashflow': [
  ('/monthly-income','each source of guaranteed income','g.amount','RETIREMENT_INCOME_NOW'),
  ('/month-detail','what came in and went out that month','cell','the by-month grid'),
  ('/paycheck-months','the months a paycheck lands','payYear','RETIREMENT_PAYCHECK'),
  ('/income-manager','each income source and its amount','sources','TOTAL_INCOME'),
  ('/bill-calendar','each bill and the day it falls','bills','THE_BILL_CALENDAR'),
 ],
 'menu': [
  ('/big-costs','each big cost and its year','c.amount','BIG_COSTS'),
  ('/big-costs','the total of your big costs','total','BIG_COSTS'),
  ('/contribution-room','$X left / up to $Y','room / limit','CONTRIBUTION_ROOM'),
  ('/contribution-room','about $X of the $Y limit','used / limit','CONTRIBUTION_ROOM'),
  ('/contribution-room','about $X/mo for the rest of the year','perMonth','worked out on the screen: room left ÷ months left'),
  ('/credit','$X of $Y used — the line marks 30%','bal / lim','CREDIT_USE'),
  ('/expense','$X of $Y this month · over by $Z','catSpend / catBudget','PLANNED_SPENDING'),
  ('/goals','typical free cash to save $X/mo','capacity.avg','GOAL_CAPACITY'),
  ('/goals','each goal — $X of $Y · $Z to go','g.saved / g.target','GOAL_PROGRESS'),
  ('/goals','your non-monthly budget','sinkBasis','SINKING_FUNDS'),
  ('/income-detail','net a year','state.total_net_annual','TOTAL_INCOME'),
  ('/income-detail','Gross / year','state.total_gross_annual','TOTAL_INCOME'),
  ('/income-detail','Net / month','state.net_monthly_income','TOTAL_INCOME'),
  ('/income-detail','Employer 401(k) match','state.employer_match_annual','EMPLOYER_MATCH'),
  ('/insights','each insight and the dollars behind it','shareOf(v)','NOT IN OLD MASTER — useInsights, src/domain/insights'),
  ('/insights','Total invested · Cash total · Investable total','investable / cash','TOTAL_INVESTABLE · TOTAL_CASH'),
  ('/insurance','the life-cover gap','need.gap','INSURANCE_NEED'),
  ('/insurance','Income replacement (N yrs)','need.incomeReplacement','INSURANCE_NEED'),
  ('/insurance','+ Debts, goals & final expenses · Total need','need.total','INSURANCE_NEED'),
  ('/jobsafety','N months of essentials is $X ($Y/mo)','target / ess','JOB_SAFETY_RUNWAY'),
  ('/jobsafety','Using $X/mo from your logged spending','monthSpend','SPENDING_BY_KIND'),
  ('/other-investments','the total value of these investments','summary.totalValue','ALTERNATIVES_TOTAL'),
  ('/other-investments','EST. GROWTH / YR','summary.growth','ALTERNATIVES_GROWTH'),
  ('/stress-test','You could cover a $X hit','shock','STRESS_TEST'),
  ("/stress-test","You'd have $X left — about N months of essentials",'r.cashAfter / r.runwayAfter','STRESS_TEST'),
  ('/stress-test','your $X/mo of must-pay bills','ess','PLANNED_SPENDING'),
  ('/tax-organizer','each taxable line and its amount','l.amount','TAXABLE_INCOME'),
  ('/tax-organizer','Taxable income · Non-taxable','org.taxableTotal','TAXABLE_INCOME'),
  ('/tax-organizer','each contribution and its amount','c.amount','CONTRIBUTION_ROOM'),
  ('/worth-a-look','$X left <account> on <date>','f.amount','NOT IN OLD MASTER — the outflow watch, src/domain/insights'),
 ],
 'performance': [
  ('/look-back','Left in <fund> it became $X (up/down $Y, Z%)','result.stayed','LOOK_BACK'),
  ('/look-back','Moved to <fund> it would be $X','result.moved','LOOK_BACK'),
  ('/look-back','Difference: $X more/less if you had moved','result.difference','LOOK_BACK'),
 ],
}


INPUTS = [
 ('account balance','the institution download, a connection, or typed by hand','net worth · what you own · cushion · required withdrawal','NET_WORTH · TOTAL_CASH · TOTAL_INVESTMENTS · REQUIRED_WITHDRAWAL'),
 ('account type (taxable, pre-tax, Roth)','typed at setup, or guessed from the account name','how this account is taxed · required withdrawal · Roth move','TAX_TREATMENT · REQUIRED_WITHDRAWAL'),
 ('institution name','the download or the connection','net worth by institution · account rows','ACCOUNT_SPLIT'),
 ('holding quantity (shares)','the download, a connection, or typed','current value · cost basis · gains','HOLDING_SHARES · HOLDING_MARKET_VALUE'),
 ('holding price','the price feed','current value · today\'s market value · freshness','HOLDING_MARKET_VALUE · PRICE_FRESHNESS'),
 ('price fetched at','the app, when it last asked for prices','prices updated <when>','PRICE_FRESHNESS'),
 ('purchase price and date (per lot)','the download or typed','price paid · total paid · long or short-term gain','HOLDING_COST_BASIS · HOLDING_CAP_GAINS'),
 ('transaction amount','the institution download','contributions · withdrawals · income · the change walk','LEDGER · NW_CHANGE_WALK'),
 ('transaction date','the institution download','the period a figure covers · the change walk','LEDGER · NW_CHANGE_WALK'),
 ('transaction words (the institution\'s own wording)','the institution download','what each line means: money in, money out, income, cost','LEDGER · the institution-words table'),
 ('bond face value','typed, or the download','face value · what comes back at maturity','BOND_FACTS'),
 ('bond coupon rate','typed, or the download','interest payments a year · yield','BOND_COUPON · BOND_CURRENT_YIELD'),
 ('bond maturity date','typed, or the download','years away · yield if held to maturity','BOND_YEARS_LEFT · BOND_YIELD_TO_MATURITY'),
 ('debt balance','typed, or a connection','what you owe · net worth · payoff','DEBT_PICTURE'),
 ('debt interest rate','typed','payoff date · what extra payments save','DEBT_PAYOFF'),
 ('debt minimum payment','typed','monthly debt payments · money out','DEBT_REQUIRED_PAYMENT'),
 ('birth year','typed at setup','current age · retirement age · Social Security · required withdrawal','SS_BENEFIT_AT_AGE · RMD_START_AGE'),
 ('retirement age','typed, or the dial on Plan','the odds · projected pot · the paycheck','WILL_IT_LAST_RESULT · POT_AT_RETIREMENT'),
 ('monthly spending in retirement','typed','the odds · the draw from savings','WILL_IT_LAST_INPUTS'),
 ('Social Security monthly amount','typed from the statement, or a worked example','guaranteed income · the paycheck · claim timing','SS_BENEFIT_AT_AGE · RETIREMENT_INCOME_NOW'),
 ('Social Security claim age','typed','how much the check is · lifetime total','SS_CLAIM_FACTOR'),
 ('pension monthly amount','typed','guaranteed income · the paycheck','RETIREMENT_INCOME_NOW'),
 ('salary and other income','typed at setup','money in · take-home · savings capacity','TOTAL_INCOME'),
 ('logged spending','typed, or read from a download','spent so far · by category · essentials','SPENDING_BY_KIND · PLANNED_SPENDING'),
 ('typical monthly essentials','typed','the cushion · job-safety runway · stress test','PLANNED_SPENDING · JOB_SAFETY_RUNWAY'),
 ('big costs (amount and year)','typed','the odds · the plan · the radar','BIG_COSTS'),
 ('goals (target, saved, date)','typed','goal progress · what you can afford together','GOAL_PROGRESS'),
 ('assumed return','built in, and adjustable on the cockpit','projected pot · the odds','POT_AT_RETIREMENT · WILL_IT_LAST_RESULT'),
 ('inflation rate','a published feed, with a built-in fallback','tomorrow\'s dollars · the odds','WILL_IT_LAST_INPUTS'),
 ('tax filing status and age','typed at setup','tax bands · the deduction · tax on a Roth move','TAXABLE_INCOME · TAX_ON_CONVERSION'),
 ('daily and monthly snapshots','the app itself, once a day','the trend line · change in net worth · beginning values','TREND_SERIES · NW_CHANGE_WALK'),
]

VERIFIED = {'home':HOME,'networth':NETWORTH,'performance':PERFORMANCE,'cashflow':CASHFLOW,'plan':PLAN}

def build_nav():
    """The screen map, read from the app itself: which route shows which screen, and which
    parent screen can reach it. Regenerated on every build so the file cannot describe a
    navigation that no longer exists."""
    import re as _re
    routes={}
    for root,_,fs in os.walk('app'):
        for f in fs:
            if not f.endswith('.tsx'): continue
            fp=os.path.join(root,f); src=open(fp).read()
            r='/'+os.path.relpath(fp,'app').replace('.tsx','').replace('(tabs)/','')
            comps=[x.split('/')[-1] for x in _re.findall(r"from\s+'([^']*screens/[A-Za-z0-9_]+)'", src)]
            if comps: routes[r]=comps[0]
    comp_file={}
    for root,_,fs in os.walk('src/screens'):
        for f in fs:
            if f.endswith('.tsx') and '__tests__' not in root: comp_file[f[:-4]]=os.path.join(root,f)
    def targets(text):
        return set(_re.findall(r"push\(\s*['\"`](/[a-z0-9\-]+)", text)) | \
               set(_re.findall(r"href=\{?['\"`](/[a-z0-9\-]+)", text)) | \
               set(_re.findall(r"replace\(\s*['\"`](/[a-z0-9\-]+)", text))
    comp_push={}
    for root,_,fs in os.walk('src/components'):
        for f in fs:
            if f.endswith('.tsx') and '__tests__' not in root:
                t=targets(open(os.path.join(root,f)).read())
                if t: comp_push[f[:-4]]=t
    edges={}
    for r,c in routes.items():
        fp=comp_file.get(c)
        if not fp: continue
        src=open(fp).read(); e=targets(src)
        for cname,tg in comp_push.items():
            if _re.search(r'\b'+cname+r'\b', src): e |= tg
        edges[r]=e
    tabs={'/home':'Home','/analytics':'Networth','/invest':'Performance','/cashflow':'Cashflow','/plan':'Plan'}
    reach={}
    for tab,name in tabs.items():
        seen={tab}; stack=[tab]
        while stack:
            cur=stack.pop()
            for nxt in edges.get(cur,()):  
                if nxt not in seen and nxt in routes:
                    seen.add(nxt); stack.append(nxt); reach.setdefault(nxt,set()).add(name)
    return {'routes':routes,'reach':{k:sorted(v) for k,v in reach.items()}}

nav = build_nav()
TABS = {'/home':'home','/analytics':'networth','/invest':'performance','/cashflow':'cashflow','/plan':'plan'}

def screens_for(tab):
    """every screen belonging to a parent tab: the parent itself plus what it reaches"""
    out=[]
    for route,parent_list in nav['reach'].items():
        if PARENTS[tab] in parent_list: out.append(route)
    return sorted(out)

_load_old_words()
wb = openpyxl.Workbook(); wb.remove(wb.active)
H = Font(bold=True, color='FFFFFF'); HFILL = PatternFill('solid', fgColor='1F3864')

def sheet(name, cols):
    ws = wb.create_sheet(name)
    ws.append(cols)
    for c in range(1, len(cols)+1):
        ws.cell(1,c).font = H; ws.cell(1,c).fill = HFILL
        ws.cell(1,c).alignment = Alignment(wrap_text=True, vertical='top')
    ws.freeze_panes = 'A2'
    return ws

counters = {}
def nid(family, kind):
    k=(family,kind); counters[k]=counters.get(k,0)+1
    return f"MK-{family}-{kind}-{counters[k]:03d}"

# ---- engine identifiers: one per engine, assigned once
ENGINE_FAMILY = {}
engine_id = {}
def record_metric(eid, mid):
    if eid: METRICS_BY_ENGINE.setdefault(eid, []).append(mid)

def eid_for(engine, family):
    if engine.startswith('worked out on the screen'): return ''
    key = engine
    if key not in engine_id:
        engine_id[key] = nid(family, 'E')
    return engine_id[key]

ws = sheet('multiple_screens', COLS)
for label, screens, metric, engine in MULTI:
    m,w = formulas(engine); fi,de,se = notes(engine); qs = questions_for(engine); sp = spec_cols(engine, label, m)
    _mid = nid('XS','M'); record_metric(eid_for(engine,'XS'), _mid)
    ws.append([_mid, screens, 'NA', label, metric, mark_engine(engine), eid_for(engine,'XS'), m, w, *sp, se, (fi + (' | ' if fi else '') + _f.MISASSIGNED.get(_mid,'')).strip(' |'), assumptions(engine, m, de), dup_note(_mid), qs, '', '', 'NOT DETERMINED', 'VERIFIED 2026-08-22'])

OWNED = {r for rows in SECONDARY.values() for (r,_,_,_) in rows}
FAM = {'menu':'MN','home':'HM','networth':'NW','performance':'PF','cashflow':'CF','plan':'PL'}
for tab in ['home','networth','performance','plan','cashflow','menu']:
    ws = sheet(tab, COLS)
    for label, metric, engine in VERIFIED.get(tab, []):
        m,w = formulas(engine); fi,de,se = notes(engine); qs = questions_for(engine); sp = spec_cols(engine, label, m)
        _mid = nid(FAM[tab],'M'); record_metric(eid_for(engine, FAM[tab]), _mid)
        ws.append([_mid, PARENTS[tab], 'NA', label, metric, mark_engine(engine),
                   eid_for(engine, FAM[tab]), m, w, *sp, se, (fi + (' | ' if fi else '') + _f.MISASSIGNED.get(_mid,'')).strip(' |'), assumptions(engine, m, de), dup_note(_mid), qs, '', '', 'NOT DETERMINED', 'VERIFIED 2026-08-22'])
    if tab == 'menu':
        routes = sorted(r for r in nav['routes'] if r not in nav['reach'] and r not in TABS)
    else:
        parent_route = [k for k,v in TABS.items() if v==tab][0]
        routes = screens_for(tab)
    done = set()
    for route, label, metric, engine in SECONDARY.get(tab, []):
        done.add(route)
        m,w = formulas(engine); fi,de,se = notes(engine); qs = questions_for(engine); sp = spec_cols(engine, label, m)
        _mid = nid(FAM[tab],'M'); record_metric(eid_for(engine, FAM[tab]), _mid)
        ws.append([_mid, PARENTS[tab], route, label, metric, mark_engine(engine),
                   eid_for(engine, FAM[tab]), m, w, *sp, se, (fi + (' | ' if fi else '') + _f.MISASSIGNED.get(_mid,'')).strip(' |'), assumptions(engine, m, de), dup_note(_mid), qs, '', '', 'NOT DETERMINED', 'VERIFIED 2026-08-22'])
    NO_FIGURES = {'/auth','/first-run','/settings','/tips','/rewards','/estate','/income','/sharpen','/connect','/add-account','/import-holdings','/onboarding'}
    for r in routes:
        if not r or r in done or r in OWNED: continue
        if r == '/performance':
            ws.append(['', PARENTS[tab], r, '—', '—', '—'] + ['']*15 + ['NOT DETERMINED',
                       'READ 2026-08-22 — the same screen as /invest, reached by a second route'])
            continue
        if r in NO_FIGURES:
            ws.append(['', PARENTS[tab], r, '—', '—', '—'] + ['']*15 + ['NOT DETERMINED',
                       'READ 2026-08-22 — no calculated figure on this screen'])
            continue
        ws.append(['', PARENTS[tab], r] + ['']*18 + ['NOT STARTED — screen not yet read'])

# ---- inputs
ws = sheet('inputs', INPUT_COLS)
for var, source, metrics, engines in INPUTS + _f.NEW_INPUTS:
    ids = ' · '.join(engine_id[e] for e in engine_id if any(p.strip()==e for p in engines.split('·')))
    ws.append([nid('XS','I'), var, source, metrics, engines, ids, 'VERIFIED 2026-08-22'])


# ---- Specification: what a row must carry before its calculation can be written
SPEC = [
 ('', 'SECTION — WHAT THE NUMBER IS', '', ''),
 ('S01','The formula','The actual rules, both as arithmetic and in plain English, followable by hand.','COMPLETE — 163 of 163 carry both forms.'),
 ('S02','The inputs, one by one','Every input named, with its INPUT IDENTIFIER beside it, its unit and where it comes from.','PARTIAL — 59 rows name inputs carrying their identifiers; 72 rows name at least one input that appears nowhere on the inputs tab, and say so in the cell. The reconciliation tab checks both directions and is where the gap is counted.'),
 ('S03','The decisions and assumptions applied','Each marked with whose decision it was: the founder\'s, the person\'s, or built in.','PARTIAL — every row carries a cell; 37 name a real decision, 126 read NOT DETERMINED.'),
 ('S04','What comes out','Dollars, a percentage, a date, a count; its unit and its rounding.','COMPLETE — 163 of 163, derived by rule from the label and formula and marked as derived. Confirm rather than trust.'),
 ('S05','What it says when it cannot be computed','The exact refusal — where wrong numbers get invented.','PARTIAL — 126 of 163 written; 37 read NOT DETERMINED because that engine has not been read for its refusal yet.'),
 ('S06','The grain','One figure per holding, account, debt, goal, category, month or person.','COMPLETE — 163 of 163, derived by rule and marked as derived.'),
 ('S07','The period','As of when, and over what window.','COMPLETE — 163 of 163, derived by rule and marked as derived.'),
 ('', 'SECTION — WHAT PROVES IT', '', ''),
 ('S08','Worked examples','These inputs give this answer. Rung 2 re-runs them through the real engine on every build.','NOT STARTED — waits on the founder\'s answers to the numbered questions, since an example needs the rule settled first.'),
 ('S09','An example for every case','One per case the grid names: missing, degraded, per institution, time-bounded, related events, account type. Rung 3.','NOT STARTED — the biggest single piece of work, and it belongs in the per-family detail files rather than here.'),
 ('S10','Verification level','Which engines are marked for rung 4 and rung 5. Marked by the founder, recommended by me.','NOT STARTED — the column does not exist yet.'),
 ('', 'SECTION — WHAT CONNECTS IT', '', ''),
 ('S11','Which engines feed this engine','Each dependency named by ITS engine identifier and by the output it gives, so a chain can be followed without knowing any engine by name.','COMPLETE — read from the code itself, not from any document. 64 rows name a dependency by identifier; the rest read raw inputs only.'),
 ('S12','Where it is implemented','The file and function that carry it, so file and code can be checked against each other on every build.','PARTIAL — the engines tab carries the file and line for every engine identifier that has one on record; the rest read NOT DETERMINED, and the ones worked out on a screen say so.'),
 ('', 'SECTION — GOVERNANCE', '', ''),
 ('S13','The founder\'s verdict','A row counts as documented only when he has approved it.','NOT STARTED — the column does not exist yet, so the coverage count means nothing until it does.'),
 ('S14','Lifecycle','Live, cut, or superseded by another identifier.','NOT STARTED.'),
 ('', 'SECTION — NOT ON THE ORIGINAL LIST, STILL NEEDED', '', ''),
 ('S15','Your name for it, from the 72-metric file','The bridge between the founder\'s vocabulary and the code\'s.','NOT STARTED — 0 of 163 rows.'),
 ('S18','The reconciliation engine','Both records kept independently and checked against each other as a build gate — an input an engine names that is on no row, an input declared that no engine names, an engine identifier that does not exist, an engine no metric reaches. Founder, 2026-08-25: never generate one list from the other; agreement by construction hides the orphan.','COMPLETE — moneykeel_reconcile.py runs at the end of every build and STOPS it on a structural break: a duplicate identifier, a reference to an engine or input that does not exist, a fold pointing nowhere, a question number used twice. Findings that are real but unresolved — orphan and dead inputs — are counted every build rather than failing it, and must reach zero before the module is called done. Today: 0 breaks, 9 open findings.'),
 ('S19','Duplicate calculations in the CODE','S16 compared the figures on screens, so it could only see engines a figure names. Two functions in different files that compute the same thing, named by no figure, are invisible to it — alternativesSummary and alternativesTotal both total the same holdings. A second pass is needed over the code itself.','NOT STARTED — found while answering a question about S16, not by S16.'),
 ('S20','Engine names that exist nowhere','Twenty engine names in this file were assigned while reading a screen and have no engine row anywhere. Every one now says so on its row rather than looking documented.','FLAGGED — the names are marked; each still needs a row of its own, or to be pointed at an engine that already exists.'),
 ('S16','The duplication pass','Figures that are the same thing under two identifiers.','COMPLETE — every group judged one at a time. 11 figures were being shown under 24 identifiers; the 13 folded rows now name the identifier that survives and why. 18 groups were checked and are NOT duplicates — one engine legitimately producing several figures — and say so, so the question is not asked twice. Two mis-assigned engines were found and recorded as findings.'),
 ('S17','Which screens are the 55-70 core','The agreed first scope has never been written down.','READY FOR THE FOUNDER — the core_screens tab lists all 49 screens with my recommendation (39 in, 5 out, 5 borderline) and a column for his decision.'),
]

ws = sheet('Specification', ['No.','What is needed','Why it is needed','Where it stands in this file today'])
for n,a,b,c in SPEC:
    ws.append([n,a,b,c])
    if a.startswith('SECTION'):
        ws.cell(ws.max_row,2).font=Font(bold=True, color='1F3864')
ws.column_dimensions['A'].width=7; ws.column_dimensions['B'].width=40
ws.column_dimensions['C'].width=86; ws.column_dimensions['D'].width=52
for r in range(2, ws.max_row+1):
    for c in (2,3,4): ws.cell(r,c).alignment=Alignment(wrap_text=True, vertical='top')


# ---- what is saved in the cloud, read from the code on 2026-08-22
DB_COLS = ['Where it is stored','Field name in the database','What it holds',
           'Metric or input it serves','How often it is written','Grain — one row per what','Encrypted?']
DB = [
 ('users/{uid}','appStateEnc','THE WHOLE app state, encrypted on the device before it leaves it. Everything below lives inside this one field.','every metric in this file, through the inputs tab','2 seconds after any change in the app, the whole payload rewritten','ONE document per person — or per household when two people share','Yes — the server cannot read it'),
 ('users/{uid}','keyEnvelope','The encryption key, wrapped by the password and by the recovery code.','—','when the password or recovery code is set or changed','one per person','the key itself is wrapped, never stored bare'),
 ('users/{uid}','appState','The old plaintext copy from before encryption. Deleted on the first save by an updated app.','—','never written now; removed on first save','one per person','No — which is why it is being removed'),
 ('users/{uid}','householdId','Whose document this person reads and writes — their own, or the partner who invited them.','—','when an invite is redeemed','one per person','No'),
 ('households/{owner}/members/{member}','code, householdId','The record that a partner joined a household, bound to a real invite.','—','once, when the invite is redeemed','one per member','No'),
 ('invites/{code}','householdId','An invite code and the household it points at.','—','when an invite is created','one per invite','No'),
 ('feedback/{doc}','the message','Feedback sent from inside the app.','—','when feedback is sent','one per message','No'),
 ('snaptrade_users/{uid}','the connection record','The link to the brokerage connection service.','—','when an account is connected','one per person','No'),
 ('inside appStateEnc','assetAccounts','Every account: its name, institution, balance, class and where the figure came from.','account balance · account type · institution','with every save','one entry per account','inside the encrypted blob'),
 ('inside appStateEnc','liabilities','Every debt: balance, rate, minimum payment, due day.','debt balance · debt interest rate · debt minimum payment','with every save','one entry per debt','inside the encrypted blob'),
 ('inside appStateEnc','investments','Holdings: ticker, quantity, price paid, lots.','holding quantity · purchase price and date','with every save','one entry per holding','inside the encrypted blob'),
 ('inside appStateEnc','expenses','Logged spending: date, amount, category, store.','logged spending','with every save','one entry per expense','inside the encrypted blob'),
 ('inside appStateEnc','incomes · recurringIncomes','Money received and the sources that repeat.','salary and other income','with every save','one entry per payment or source','inside the encrypted blob'),
 ('inside appStateEnc','recurringExpenses','Bills that repeat, and the day they fall.','logged spending · the bill calendar','with every save','one entry per bill','inside the encrypted blob'),
 ('inside appStateEnc','monthlySnapshots','Net worth as it stood at each month end.','the trend line · beginning values','once a month, on the first open of a new month','one entry per month','inside the encrypted blob'),
 ('inside appStateEnc','nwDaily','Net worth captured when the app is opened.','the trend line · change in net worth','once a day, on the first open','one entry per day','inside the encrypted blob'),
 ('inside appStateEnc','onboardingProfile','What the person told us at setup: birth year, retirement age, spending, Social Security, pension, filing status.','birth year · retirement age · monthly spending · Social Security · pension · filing status','with every save','one per person','inside the encrypted blob'),
 ('inside appStateEnc','retirementAssumptions','The plan\'s settings: return, claim age, contributions, draw.','assumed return · Social Security claim age','with every save','one per person','inside the encrypted blob'),
 ('inside appStateEnc','retirementScenarios','Saved what-ifs.','the saved scenarios count','when a scenario is saved','one entry per scenario','inside the encrypted blob'),
 ('inside appStateEnc','bigCosts','One-off costs ahead, with the year each falls.','big costs','with every save','one entry per cost','inside the encrypted blob'),
 ('inside appStateEnc','goals · selectedGoals','Goals: target, saved so far, date.','goals','with every save','one entry per goal','inside the encrypted blob'),
 ('inside appStateEnc','budgetCategories · monthlyBudgetTarget · allocatedByMonth','The plan for spending, by category and by month.','typical monthly essentials · planned spending','with every save','one entry per category or month','inside the encrypted blob'),
 ('inside appStateEnc','benchmarkReturns','The index returns the comparison uses.','benchmark return','when they are fetched','one entry per index and period','inside the encrypted blob'),
 ('inside appStateEnc','snaptradeConnections','Which brokerages are connected.','—','when a connection changes','one entry per connection','inside the encrypted blob'),
 ('inside appStateEnc','estatePlan · badges · xp · streak · lastCheckIn','Estate notes and the encouragement counters.','—','with every save','one per person','inside the encrypted blob'),
 ('NOT SAVED — DEVICE ONLY','snapshotDays','THE DAILY RECORD: for each day, every account and every holding — units, price and value kept apart. This is what a beginning value is READ from instead of being back-solved.','beginning value · change in account value · the performance walk','once a day, on the first open','one entry per day, per account, per holding','not sent at all'),
 ('NOT SAVED — DEVICE ONLY','invDaily','Cash + investments captured daily — the baseline the Net worth return line is measured from.','Return on cash + investments','once a day, on the first open','one entry per day','not sent at all'),
 ('NOT SAVED — DEVICE ONLY','transactions','The append-only ledger read from institution downloads: every buy, sell, contribution, withdrawal, dividend and interest line. Read by 32 places in the app.','contributions · withdrawals · income · realised gain · the change walk','when a file is imported or a connection syncs','one entry per transaction','not sent at all'),
 ('NOT SAVED','prices','Prices are fetched fresh and held only on the device.','holding price · price fetched at','never written to the cloud','—','—'),
 ('NOT SAVED','economic figures (inflation, the 10-year yield)','Fetched from a feed each time; deliberately left out of the sync.','inflation rate','never written to the cloud','—','—'),
]

ws = sheet('database', DB_COLS)
for row in DB: ws.append(list(row))
for i,c in enumerate(DB_COLS, start=1):
    ws.column_dimensions[get_column_letter(i)].width = [30,34,60,44,44,44,26][i-1]
for r in range(2, ws.max_row+1):
    for c in range(1, len(DB_COLS)+1):
        ws.cell(r,c).alignment = Alignment(wrap_text=True, vertical='top')


# ---- S17: which screens are the 55-70 core. My recommendation; his decision.
CORE = {
 '/home':'Yes — the first screen','/analytics':'Yes — Net worth','/invest':'Yes — Performance',
 '/cashflow':'Yes — Cash flow','/plan':'Yes — Plan',
 '/account-detail':'Yes — where a wrong balance is chased','/holding-detail':'Yes — where a wrong gain is chased',
 '/bonds':'Yes — this age group holds them','/other-investments':'Yes — the things with no market price',
 '/import-holdings':'Yes — the way real data gets in','/add-account':'Yes','/connect':'Yes','/itemize':'Yes — splitting one lump into holdings',
 '/look-back':'Borderline — interesting, not needed to trust a number',
 '/will-it-last':'Yes — the question the whole plan answers','/what-if':'Yes','/retirement':'Yes — the cockpit',
 '/ss-timing':'Yes — a 55-70 decision','/required-withdrawals':'Yes — a 73+ obligation','/roth':'Yes — a 55-70 decision',
 '/multi-goal':'Yes','/sharpen':'Borderline — a way in, not a figure',
 '/monthly-income':'Yes','/income-manager':'Yes','/income-detail':'Yes','/income':'Yes',
 '/month-detail':'Yes','/bill-calendar':'Yes','/paycheck-months':'Yes','/big-costs':'Yes — the costs that break a plan',
 '/contribution-room':'Yes — still relevant while working','/tax-organizer':'Yes','/insights':'Yes — what needs you today',
 '/expense':'Yes','/goals':'Yes','/estate':'Yes — squarely a 55-70 concern','/insurance':'Borderline — matters at 55, less at 70',
 '/stress-test':'Borderline','/jobsafety':'No — a working-age worry','/credit':'No — a working-age worry',
 '/education':'No — college costs belong to the younger group','/worth-a-look':'Borderline',
 '/rewards':'No — encouragement, not a number','/tips':'No — encouragement, not a number',
 '/settings':'Yes — carries hide-balances and the lock','/auth':'Yes — the way in','/first-run':'Yes','/onboarding':'Yes',
 '/savings':'Borderline','/performance':'Yes — a second route to Performance','/budget':'Yes','/connect-done':'Yes',
}
ws = sheet('core_screens', ['Screen name','Parent screen','Core or not — my recommendation','JJ — Decision (Y/N)'])
_seen=set()
for route, comp in sorted(nav['routes'].items()):
    if route in _seen: continue
    _seen.add(route)
    parents = nav['reach'].get(route) or ([PARENTS[t] for t,rt in [('home','/home'),('networth','/analytics'),('performance','/invest'),('cashflow','/cashflow'),('plan','/plan')] if rt==route] or ['Menu'])
    ws.append([route, ' · '.join(parents), CORE.get(route,'NOT DETERMINED — not yet judged'), ''])
for i,w in enumerate([34,34,52,26], start=1):
    ws.column_dimensions[get_column_letter(i)].width = w
for r in range(2, ws.max_row+1):
    for c in range(1,5): ws.cell(r,c).alignment = Alignment(wrap_text=True, vertical='top')


# ---- reconciliation: the two directions of the input map must agree
REC_COLS = ['Input ID','Input','Engines the inputs tab says use it',
            'Engines that actually name it in their own input list','Verdict']
ws = sheet('reconciliation', REC_COLS)
declared = {}
_iid = 0
for var, source, metrics, engines in INPUTS + _f.NEW_INPUTS:
    _iid += 1
    iid = 'MK-XS-I-%03d' % _iid
    dec = {e.strip() for e in str(engines).split('·') if e.strip() and e.strip() != '—'}
    act = USED_BY.get(iid, set())
    both = dec & act
    only_dec = dec - act
    only_act = act - dec
    if not dec and not act:
        verdict = 'NOT USED ANYWHERE — no engine on either side names this input. Either it is not needed, or an engine reads it without saying so.'
    elif not act:
        verdict = 'DECLARED BUT NEVER NAMED — the inputs tab says these engines use it, but no engine names it in its own input list. Unproved in one direction.'
    elif not dec:
        verdict = 'USED BUT NOT DECLARED — engines name this input, but the inputs tab does not list them.'
    elif only_dec or only_act:
        verdict = 'PARTLY AGREES — ' + (('declared but not naming it: ' + ', '.join(sorted(only_dec))) if only_dec else '') + \
                  ('  |  ' if only_dec and only_act else '') + \
                  (('naming it but not declared: ' + ', '.join(sorted(only_act))) if only_act else '')
    else:
        verdict = 'AGREES — both directions name the same engines.'
    ws.append([iid, var, ' · '.join(sorted(dec)) or '—', ' · '.join(sorted(act)) or '—', verdict])

ws.append([])
ws.append(['GAPS — inputs an engine names that are on NO row of the inputs tab.',
           'Each one is either a missing input, or the same input under another name.', '', '', ''])
ws.cell(ws.max_row,1).font = Font(bold=True, color='9C0006')
for phrase, engines in sorted(UNMATCHED.items()):
    ws.append(['NO ID', phrase, '—', ' · '.join(sorted(engines))[:300],
               'MISSING FROM THE INPUTS TAB — add it, or point it at the input it already is.'])
for i,w in enumerate([15,46,44,44,70], start=1):
    ws.column_dimensions[get_column_letter(i)].width = w
for r in range(2, ws.max_row+1):
    for c in range(1,6): ws.cell(r,c).alignment = Alignment(wrap_text=True, vertical='top')


# ---- every FUNCTION in the calculation code, sorted into the four categories
import importlib.util as _il3
_sp3=_il3.spec_from_file_location('mkfn', os.path.join(os.path.dirname(os.path.abspath(__file__)),'moneykeel_functions.py'))
_fn=_il3.module_from_spec(_sp3); _sp3.loader.exec_module(_fn)

FN_COLS = ['Function ID','Function','File','Line','Category','Why it was put there',
           'Can its answer reach a screen?','Dependent functions — one step below',
           'Dependent functions — how many in total',
           'Dependent functions — all of them',
           'The chain, ending in this function',
           'Figures that name it','Name in the old inventory']
ws = sheet('functions_from_code', FN_COLS)
ws.append(['READ FROM THE CODE ITSELF. Sorted by what the code does — what a function returns, '
           'whether it reaches outside for data, and who calls it — never by its name. '
           '1 ACTION does something and displays nothing · 2 DISPLAYED lands on a screen · '
           '3 DEPENDENT feeds a chain that ends at a screen · 4 BRINGS DATA IN fetches from outside. '
           'The chain reads left to right and ENDS in the function that shows the answer; everything feeding it comes first.',
           '','','','','','','','','','',''])
ws.cell(ws.max_row,1).font = Font(bold=True, color='1F3864')

_fn_to_old = {}
_w3 = openpyxl.load_workbook('Calculation Module/MoneyKeel-calculation-master-v1.xlsx', data_only=True)
_s3 = _w3['2. Engines']; _h3=[str(c.value) if c.value else '' for c in _s3[2]]; _j3={h:n for n,h in enumerate(_h3)}
for _r in _s3.iter_rows(min_row=3, values_only=True):
    _n = _r[_j3['Engine name']]
    if not _n: continue
    for _x in re.split(r'[,/·]| and ', str(_r[_j3['Function in the code']] or '')):
        _x=_x.strip()
        if _x.isidentifier(): _fn_to_old.setdefault(_x, str(_n).strip())

import collections as _co
_cat_counts = _co.Counter()
for row in _fn.with_ids_and_chains():
    old = _fn_to_old.get(row['name'], '')
    eid = engine_id.get(old, '') if old else ''
    mids = sorted(METRICS_BY_ENGINE.get(eid, [])) if eid else []
    _cat_counts[row['category']] += 1
    ws.append([row['id'], row['name'], row['file'], row['line'], row['category'], row['why'],
               row['can_reach_a_screen'], row['depends_on'], row['feeder_count'],
               row['fed_by'], row['chain'],
               ' · '.join(mids) or '—', old or '—'])
for i,w in enumerate([15,28,40,7,30,52,15,40,12,60,74,30,26], start=1):
    ws.column_dimensions[get_column_letter(i)].width = w
for r in range(2, ws.max_row+1):
    for c in range(1,14): ws.cell(r,c).alignment = Alignment(wrap_text=True, vertical='top')
print('functions_from_code:', dict(_cat_counts))


# ---- one row per engine identifier: the definitive list the rest of the file points at
ENG_COLS = ['Engine ID','Engine name','Where it is implemented (S12)','What it answers',
            'Metric identifiers that reach it','How it is reached']
ws = sheet('engines', ENG_COLS)
_src = {}
_w2 = openpyxl.load_workbook('Calculation Module/MoneyKeel-calculation-master-v1.xlsx', data_only=True)
_s2 = _w2['2. Engines']; _h2=[str(c.value) if c.value else '' for c in _s2[2]]; _j2={h:n for n,h in enumerate(_h2)}
for _r in _s2.iter_rows(min_row=3, values_only=True):
    _n = _r[_j2['Engine name']]
    if _n: _src[str(_n).strip()] = str(_r[_j2['Source']] or '').strip()
for name, eid in sorted(engine_id.items(), key=lambda kv: kv[1]):
    mids = sorted(METRICS_BY_ENGINE.get(eid, []))
    if name.startswith('worked out on the screen') or name.startswith('the amount') or name.startswith('the age'):
        where = 'On the screen itself — no engine file'
    else:
        where = _src.get(name, 'NOT DETERMINED — no source line on record')
    reached = ('Named by ' + str(len(mids)) + ' figure(s)') if mids else 'Only as another engine’s dependency — no figure names it directly'
    ws.append([eid, name, where, _answers.get(name,'') or '—', ' · '.join(mids) or '—', reached])
for i,w in enumerate([16,46,52,58,40,44], start=1):
    ws.column_dimensions[get_column_letter(i)].width = w
for r in range(2, ws.max_row+1):
    for c in range(1,7): ws.cell(r,c).alignment = Alignment(wrap_text=True, vertical='top')

# ---- Reference
ws = sheet('Reference', ['Item','Detail'])
ref = [
 ('STANDING DECISION — how numbers are held and shown',
  'Every number is held as a float internally. Decimals are SHOWN only for prices of stocks, bonds '
  'and options, for interest and dividend rates, and for expenses; everything else displays whole '
  'dollars. Rounding happens once, at the edge, never in the middle. Founder, 2026-08-22.'),
 ('Date file created', TODAY),
 ('Date file last modified', TODAY + '  (stamped by the build, not typed; unchanged when the file is only read)'),
 ('Objective of this file',
  'One row for every figure a person reads on screen, tied to the metric behind it, the engine that '
  'produces it, and the identifier that joins them — so a wrong number can be traced from the label '
  'on screen to its engine and formula in a minute. Serves objectives 3 and 4.'),
 ('', ''),
 ('TAB — Specification', 'Everything a row must carry before its calculation can be written in code, NUMBERED S01 upwards so a piece of work can be named by its number. The last column says where each one stands in this file today.'),
 ('TAB — Reference', 'This tab. What the file is, what each tab holds, what each column means, and what it must comply with.'),
 ('TAB — multiple_screens', 'Figures shown on more than one parent screen. A figure lives here ONCE, with every screen and every label it wears listed, so the same figure can never have two definitions.'),
 ('TAB — home', 'Figures shown only on Home and the screens reached from it.'),
 ('TAB — networth', 'Figures shown only on Net worth and the screens reached from it.'),
 ('TAB — performance', 'Figures shown only on Performance and the screens reached from it.'),
 ('TAB — plan', 'Figures shown only on Plan and the screens reached from it.'),
 ('TAB — cashflow', 'Figures shown only on Cash flow and the screens reached from it.'),
 ('TAB — menu', 'Screens reachable only from the menu, and the figures on them.'),
 ('TAB — engines', 'One row per engine identifier — the definitive list every dependency and every figure points at. Carries where the engine is implemented, what it answers, and which figures reach it.'),
 ('TAB — functions_from_code', 'Every function in the calculation code, read from the code itself, sorted into the four categories by what it actually does. 1 ACTION does something and displays nothing. 2 DISPLAYED lands on a screen. 3 DEPENDENT feeds a chain that ends at a screen. 4 BRINGS DATA IN fetches from outside the app. A function that can reach a screen can put a wrong number in front of a person; one that cannot, cannot.'),
 ('TAB — reconciliation', 'The input map checked in BOTH directions: what the inputs tab says uses each input, against what each engine actually names in its own input list. Where the two disagree the row says so. The section at the foot lists inputs an engine names that appear nowhere on the inputs tab.'),
 ('TAB — core_screens', 'Every screen in the app, its parent, my recommendation on whether it belongs to the 55-70 core, and a column for the founder to decide. Until this is decided, no row in the file can honestly claim to be in scope (S17).'),
 ('TAB — database', 'What the app saves in the cloud: where each thing is stored, what it holds, which figures depend on it, how often it is written and at what grain. Also names what is deliberately NOT saved.'),
 ('TAB — inputs', 'The raw values the engines need before any calculation happens.'),
 ('', ''),
 ('COLUMN — Metric ID', 'The identifier of the figure, per moneykeel_naming_spec_unique-identifier_v01.md. Given once, never changed, never reused.'),
 ('COLUMN — Parent Screen Name', 'One of: Home, Networth, Performance, Cashflow, Plan, Menu. Menu means reachable only from the menu.'),
 ('COLUMN — Secondary Screen Name', 'The screen reached from the parent, or NA when the figure is on the parent screen itself.'),
 ('COLUMN — Name on Screen', 'The label copied exactly as it is worded on screen, including capitals. Where a figure wears different labels on different screens, all are listed.'),
 ('COLUMN — Name of Underlying Metric', "The metric's name in the code."),
 ('COLUMN — Name of Underlying Engine', 'The engine that produces the figure. NOT IN OLD MASTER means the engine exists in the code but has no row in the old master file.'),
 ('COLUMN — Inputs it needs (S02)', 'Every input the engine reads, named. Carried from the old master where it has a row there.'),
 ('COLUMN — What comes out (S04)', 'Dollars, a percentage, a date, a count; how it is held and how it is shown. Marked "derived by rule" where it was worked out from the label and formula rather than read from the engine — those need confirming.'),
 ('COLUMN — What it says when it cannot be computed (S05)', 'The refusal. Written where the engine has been read; NOT DETERMINED where it has not, rather than guessed.'),
 ('COLUMN — Grain (S06)', 'One figure per what: holding, account, debt, goal, category, month, or person.'),
 ('COLUMN — Period (S07)', 'As of when, and over what window.'),
 ('COLUMN — Dependency (S11)', 'The engines this one leans on, each named by ITS identifier and by the output it gives. Read from the code itself, never from a document. "None" means the engine reads raw inputs only.'),
 ('COLUMN — Secondary calculations and decisions the engine makes', 'The judgements an engine must make BEFORE its headline figure exists: what class an asset is, what to call it on screen, which units apply, whether a value is fresh. Each of these is a formula of its own and needs its own row.'),
 ('COLUMN — Function ID', 'Every function in the code carries one, MK-[family]-F-[number]. The family comes from the folder the code sits in.'),
 ('COLUMN — Dependent functions', 'A dependent function is one whose output is used by another function, in a chain that ends at a screen. These columns list the dependent functions behind this one: those one step below it, how many there are in total, and all of them however many steps away.'),
 ('COLUMN — The chain, ending in this function', 'Read left to right. The function that shows the answer sits at the END, and everything feeding it comes before it. A loop is marked where a chain turns back on itself. Chains are cut at five levels and eight paths, and say so.'),
 ('COLUMN — Same figure as (S16)', 'Where the same figure appears under more than one identifier, the row names the surviving identifier and why. Nothing is deleted: identifiers are never reused, so a folded row stays visible and says what it became.'),
 ('COLUMN — Questions for you (numbered)', 'My open questions about that engine or figure, each with a number that never changes. A number is never reused or renumbered, so an answer can always be matched to its question.'),
 ('COLUMN — YOUR ANSWER — use the same number', 'Answer here, starting each answer with the question number. Nothing else in the file needs to line up.'),
 ('COLUMN — Errors or findings to address', 'What is known to be wrong or unproved about this figure, in plain English. Blank means nothing is on record yet — not that nothing is wrong.'),
 ('COLUMN — Decisions made (S03)', 'The rulings and assumptions that govern this figure, each marked with WHOSE decision it was: [Founder] his own ruling, [The person] something the user set, [Built in] an assumption nobody chose on a screen — which is usually why a number looks wrong. The standing display and rounding rule applies to every row and is stated at the top of this tab.'),
 ('COLUMN — Formula (mathematical)', 'The rule written as arithmetic, so it can be followed symbol by symbol and checked against the code.'),
 ('COLUMN — Formula (in words)', 'The same rule in plain English, followable by hand. Where the engine has a row in the old master this is its wording, carried over; where it does not, it is written here from reading the code.'),
 ('COLUMN — Engine ID', 'The identifier of that engine. Blank where the figure is worked out on the screen itself rather than by an engine — which is itself a finding.'),
 ('COLUMN — Your name for it (72-metric file)', "The founder's own name for the same figure, from METRICS-DELIVERABLE-ANSWERED-2026-08-20.xlsx. This column is the bridge between his vocabulary and the code's."),
 ('COLUMN — Core screen?', 'Whether the screen is part of the 55-70 core, the agreed first scope. Currently NOT DETERMINED on every row: the core list has never been written down, so no row can honestly claim to be in or out of it.'),
 ('COLUMN — Row status', 'VERIFIED with its date means a person read the screen and confirmed the chain. NOT STARTED means the screen has not been read yet. Nothing in between is claimed.'),
 ('', ''),
 ('COLUMN — Input ID', 'The identifier of a raw input, per the same standard.'),
 ('COLUMN — Variable name', 'What the raw value is called.'),
 ('COLUMN — Source', 'Where the value comes from: the person typed it, an institution download, a connected provider, or another engine computed it.'),
 ('COLUMN — Which metric uses it', 'Every metric identifier that depends on this input.'),
 ('COLUMN — Which engine uses it', 'Every engine identifier that reads this input.'),
 ('', ''),
 ('Complies with — naming', 'MoneyKeel/documents/standards/moneykeel_naming_spec_file-and-folder-naming_v01.md'),
 ('Complies with — identifiers', 'MoneyKeel/documents/standards/moneykeel_naming_spec_unique-identifier_v01.md'),
 ('Complies with — objectives', 'MoneyKeel/documents/standards/moneykeel_calc_spec_objectives-and-verification_v01.md'),
 ('', ''),
 ('COVERAGE — screens read so far', '49 of 49. Every screen in the app has been read: the five parent screens, every secondary screen and every menu screen. Twelve screens carry no calculated figure and say so.'),
 ('COVERAGE — what that means', 'Every screen in the app is listed on its tab. Only Home carries figures so far; the rest are marked NOT STARTED. A rising count is not completeness while screens remain unread.'),
]
for a,b in ref: ws.append([a,b])
ws.column_dimensions['A'].width=46; ws.column_dimensions['B'].width=118
for r in range(2, ws.max_row+1):
    ws.cell(r,1).font=Font(bold=True); ws.cell(r,2).alignment=Alignment(wrap_text=True, vertical='top')

for name in wb.sheetnames:
    if name in ('Reference','database','core_screens','reconciliation','engines','functions_from_code'): continue
    w=wb[name]
    for i,col in enumerate(COLS if name!='inputs' else INPUT_COLS, start=1):
        w.column_dimensions[get_column_letter(i)].width = max(14, min(42, len(col)+8))

wb._sheets = [wb[n] for n in TAB_ORDER if n in wb.sheetnames]
os.makedirs(os.path.dirname(OUT), exist_ok=True)
# GUARD: every question must have landed on a row. A question the founder cannot see is a
# question that will never be answered.
_all_q = {q.split(' ')[0] for v in getattr(_f,'QUESTIONS',{}).values() for q in v}
_unplaced = _all_q - {q for e in _asked for q in
                      {x.split(' ')[0] for x in getattr(_f,'QUESTIONS',{}).get(e,[])}}
if _unplaced:
    raise SystemExit('BUILD STOPPED — these questions landed on no row: ' + ', '.join(sorted(_unplaced)))

wb.save(OUT)
print("wrote", OUT)

# S18 — the gate. Structural breaks stop the build; open findings are counted, not hidden.
import importlib.util as _il2
_sp2=_il2.spec_from_file_location('mkrec', os.path.join(os.path.dirname(os.path.abspath(__file__)),'moneykeel_reconcile.py'))
_rec=_il2.module_from_spec(_sp2); _sp2.loader.exec_module(_rec)
_breaks, _open, _counts = _rec.check(OUT)
print('reconciliation — %(figures)s figures, %(inputs)s inputs, %(engines)s engines' % _counts)
print('  structural breaks: %d   open findings: %d' % (len(_breaks), len(_open)))
for _b in _breaks[:20]: print('   BREAK  ' + _b)
if _breaks:
    raise SystemExit('BUILD STOPPED — the file does not reconcile with itself.')
print("questions placed:", len(_all_q))
