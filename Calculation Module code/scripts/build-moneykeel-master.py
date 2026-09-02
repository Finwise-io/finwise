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
TAB_ORDER = ['Reference','Specification','multiple_screens','home','networth','performance','plan','cashflow','menu','inputs','database','core_screens','reconciliation','engines-old-tab','functions_from_code','functions_summary','functions_per_metric']

COLS = ['Metric ID','Parent Screen Name','Secondary Screen Name','Name on Screen',
        'Name of Underlying Metric','Function that produces it','Function ID',
        'Formula (mathematical)','Formula (in words)',
        'Inputs it needs','What comes out — unit and rounding',
        'What it says when it cannot be computed','Grain — one figure per what',
        'Period — as of when, over what window','Dependency — function ID → the output it uses',
        'The chain of functions behind it','Assumptions made anywhere in that chain',
        'Secondary calculations and decisions the engine makes',
        'Errors or findings to address','Decisions made',
        'Same figure as (S16)',
        'Questions for you (numbered)','YOUR ANSWER — use the same number',
        'Your name for it (72-metric file)','Core screen?','Row status',
        'Audit finding — 2026-08-25 review',
        'Formula audit — metric vs the function it names (2026-08-26)',
        'Why no function',
        'Wrong on screen — build first',
        'Where each finding stands',
        'Active or decommissioned','Date last modified']

# formulas: the mathematical form is written here; the words come from the old master where the
# engine has a row there, and are written here where it does not.
import importlib.util as _il
_sp=_il.spec_from_file_location('mkf', os.path.join(os.path.dirname(os.path.abspath(__file__)),'moneykeel_formulas.py'))
_f=_il.module_from_spec(_sp); _sp.loader.exec_module(_f)

_sps=_il.spec_from_file_location('mks', os.path.join(os.path.dirname(os.path.abspath(__file__)),'moneykeel_finding_status.py'))
_fstat=_il.module_from_spec(_sps); _sps.loader.exec_module(_fstat)

_spl=_il.spec_from_file_location('mkl', os.path.join(os.path.dirname(os.path.abspath(__file__)),'moneykeel_lifecycle.py'))
_life=_il.module_from_spec(_spl); _spl.loader.exec_module(_life)
_HIST=_life.History(datetime.date.today().isoformat())

_spk=_il.spec_from_file_location('mkk', os.path.join(os.path.dirname(os.path.abspath(__file__)),'moneykeel_keep.py'))
_keepmod=_il.module_from_spec(_spk); _spk.loader.exec_module(_keepmod)
_KEPT = _keepmod.read(OUT)
print('read back from the file on disk: %d entries of his own' % len(_KEPT))

_spi=_il.spec_from_file_location('mki', os.path.join(os.path.dirname(os.path.abspath(__file__)),'moneykeel_inputs.py'))
_inp=_il.module_from_spec(_spi); _spi.loader.exec_module(_inp)
_spb=_il.spec_from_file_location('mkb', os.path.join(os.path.dirname(os.path.abspath(__file__)),'moneykeel_formula_audit.py'))
_baudit=_il.module_from_spec(_spb); _spb.loader.exec_module(_baudit)
_spa=_il.spec_from_file_location('mka', os.path.join(os.path.dirname(os.path.abspath(__file__)),'moneykeel_audit.py'))
_audit=_il.module_from_spec(_spa); _spa.loader.exec_module(_audit)

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


def numbered(text, sep='\n'):
    """A cell holding more than one thing is numbered, so it can be read and referred to."""
    if not text: return text
    parts = [p.strip(' ·') for p in str(text).split(sep) if p.strip(' ·')]
    if len(parts) < 2: return str(text)
    return '\n'.join('%d. %s' % (i, p) for i, p in enumerate(parts, 1))


import importlib.util as _il3
_sp3=_il3.spec_from_file_location('mkfn', os.path.join(os.path.dirname(os.path.abspath(__file__)),'moneykeel_functions.py'))
_fn=_il3.module_from_spec(_sp3); _sp3.loader.exec_module(_fn)
_FN_ROWS = None
_FNMAP = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'moneykeel_fn_map.json')))
_ENG2FN, _FID = _FNMAP['eng2fn'], _FNMAP['fid']

def functions_for(engine):
    """The function that actually produces a figure, named by its identifier.

    Three honest answers: the function and its identifier · the screen itself, where the figure is
    worked out on the screen · or a plain statement that no function is on record for it.
    """
    e = str(engine)
    if e.startswith('worked out on the screen'):
        return 'Worked out on the screen itself — no function behind it', ''
    if e.startswith('the amount') or e.startswith('the amounts') or e.startswith('the age') or e.startswith('the value'):
        return 'Typed by the person — no function behind it', ''
    names, ids = [], []
    for part in [p.strip() for p in e.split('·')]:
        # a part written as "NOT IN OLD MASTER — budgetVsActual, src/domain/budget" names its function
        m = re.search(r'—\s*([A-Za-z_][A-Za-z0-9_]*)\s*,', part)
        cands = _ENG2FN.get(part.split('[')[0].strip(), [])
        if m and m.group(1) in _FID: cands = [m.group(1)]
        for fn in cands:
            if fn in _FID and fn not in names:
                names.append(fn); ids.append(_FID[fn])
    if not names:
        return 'NOT ON RECORD — no function is recorded for this figure', ''
    if len(names) == 1:
        return names[0], ids[0]
    return numbered(' · '.join(names), ' · '), numbered(' · '.join(ids), ' · ')


_FN_BY_ID = {}
def _fn_index():
    global _FN_ROWS
    if _FN_BY_ID: return _FN_BY_ID
    if _FN_ROWS is None:
        _FN_ROWS = _fn.with_ids_and_chains()
    for r in _FN_ROWS: _FN_BY_ID[r['id']] = r
    return _FN_BY_ID

def _finding_states(mid):
    """Where every finding on this row stands, and what closed it.

    [Founder 2026-08-27] A finding with no outcome is half a record: next month nobody can tell
    what was fixed from what was merely written down. So each one carries its status, the date it
    closed, what closed it, and the test that fails if it comes back.
    """
    import re as _re
    hits = []
    for src in (_audit.ON_ROW.get(mid, []), _baudit.ON_ROW.get(mid, [])):
        hits += [h for h in src if h not in hits]
    if not hits:
        return 'No finding on this row. That is not a statement that the row is right — only that '\
               'nothing has been written against it.'
    out = []
    for h in hits:
        st = _fstat.of(h)[0]
        out.append('%s — %s' % (h, _fstat.cell(h).split(chr(10))[0]))
    return '\n'.join(out)


def _why_none(fid, fn_text):
    """Why a figure has no function — four answers, not one silence.

    The file used to report 69 figures with no function as a single number, which reads as 69
    problems. It is three problems and one non-problem: a value the person typed needs no function
    and is already right. Separating them was the founder's call on 2026-08-26.
    """
    if str(fid or '').strip():
        return 'HAS A FUNCTION — traceable from the screen to the code.'
    t = str(fn_text or '')
    if t.startswith('Typed by the person'):
        return ('TYPED — none needed. The person entered this number; nothing calculates it and '
                'nothing should. This row is already right and needs no work.')
    if t.startswith('Worked out on the screen'):
        return ('WORKED OUT ON THE SCREEN — the arithmetic lives in a screen file, so it cannot be '
                'shared. A second screen needing the same figure writes it again, which is how two '
                'screens come to disagree, and none of it is tested. Lift it into a named function '
                'with a formula and a test. Guard D1 would catch this; D1 is not built.')
    return ('NO FUNCTION ON RECORD — nothing in this file says what produces this figure. Most were '
            'named while reading a screen and never traced back to the code, because the link from '
            'file to code still runs through a column somebody typed in the old inventory. That is '
            'S21, and closing it would answer most of these mechanically.')


def chain_and_assumptions(fid_cell):
    """For a figure: the chain that ends in the function producing it, and every assumption made
    anywhere in that chain, each named with the function that makes it."""
    idx = _fn_index()
    ids = [x for x in re.findall(r'MK-[A-Z]{2}-[FO]-\d{3}', str(fid_cell or ''))]
    if not ids:
        return ('No function on record — nothing to chain', 'No function on record — assumptions unknown')
    chains, notes = [], []
    for fid in ids:
        r = idx.get(fid)
        if not r: continue
        chains.append(r['chain'])
        for who in [r] + [idx[i] for i in re.findall(r'MK-[A-Z]{2}-[FO]-\d{3}', r.get('fed_by','')) if i in idx]:
            a = who.get('assumptions','')
            if a.startswith('None found'): continue
            for line in a.split('\n'):
                line = line.strip(' ·')
                if line and (who['id'] + ' — ' + line) not in notes:
                    notes.append(who['id'] + ' — ' + line)
    chain = '\n'.join(chains) if chains else 'No chain recorded'
    if not notes:
        return numbered(chain), 'None found anywhere in this chain'
    shown = notes[:25]
    out = numbered('\n'.join(shown))
    if len(notes) > 25:
        out += '\n… and %d more, on the functions tab' % (len(notes) - 25)
    return numbered(chain), out

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
    return numbered(ins, ' · '), unit + '  [derived by rule — confirm]', ref, grain + '  [derived by rule — confirm]', period + '  [derived by rule — confirm]', numbered(dep)

_DUP_OF = {}
for _survivor,(_folded,_why) in getattr(_f,'DUPLICATES',{}).items():
    for _f_id in _folded: _DUP_OF[_f_id] = (_survivor,_why)

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
    return '\n\n'.join(out)   # questions keep their own Qnn numbers

def notes(engine):
    e=str(engine)
    parts=[x.strip() for x in e.split('·')]
    F=getattr(_f,'FINDINGS',{}); D=getattr(_f,'DECISIONS',{})
    find=' | '.join(filter(None,(F.get(x,'') for x in parts)))
    dec =' | '.join(filter(None,(D.get(x,'') for x in parts)))
    sec =' | '.join(filter(None,(SECOND.get(x,'') for x in parts)))
    return numbered(find, ' | '), numbered(dec), numbered(sec, ' | ')

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
INPUT_COLS = ['Input ID','Variable name','Source','Where the code keeps it',
              'Functions that read it','Figures it reaches','Row status',
              'Active or decommissioned','Date last modified']

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
 # The band has driven 25 functions since the app existed and had NO identifier: 163 metric rows
 # were searched on 2026-08-27 and not one named it. It is one figure — everything the household
 # is taxed on, at the filing status they gave — shown on the base-pay screen and again on the
 # income summary. Founder ruling: total income is its home, base pay only reads it.
 ('YOUR BASE PAY — your tax band, on everything you are taxed on', 'band',
                                             'NOT IN OLD MASTER — effectiveRate, src/domain/income'),
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
_MREG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'moneykeel_metric_register.json')

def _mreg_load():
    """AN IDENTIFIER IS GIVEN ONCE AND NEVER CHANGES (identifier standard, rule 1).

    Until 2026-08-28 a metric's number was its POSITION in the lists above: nid() simply counted up
    as it walked them. Insert a row anywhere and every metric after it in that family silently
    renumbered — and 93 audit findings are keyed to those numbers, as are the founder's own typed
    answers. A finding would have quietly reattached itself to a different figure. This is the same
    defect the FUNCTION register fixed on 2026-08-26, in the other half of the file.

    A metric is now keyed by what it IS — its family, the words on the screen, and the underlying
    figure — so it keeps its number wherever the row moves.
    """
    if os.path.exists(_MREG_PATH):
        return json.load(open(_MREG_PATH))
    return {'issued': {}, 'highest': {}, 'retired': {},
            'note': 'A metric identifier is issued once against its key and never re-pointed. '
                    'A number here is never handed to a different figure, even if the figure it was '
                    'issued to is deleted — the retired block keeps it with the reason.'}

_MREG = _mreg_load()
_mreg_dirty = False

def nid(family, kind, key=None):
    global _mreg_dirty
    if key is None:                       # engines (retired) and anything not yet keyed
        k=(family,kind); counters[k]=counters.get(k,0)+1
        return f"MK-{family}-{kind}-{counters[k]:03d}"
    rk = '|'.join([family, kind] + [str(x) for x in key])
    if rk in _MREG['issued']:
        return _MREG['issued'][rk]
    hk = f'{family}-{kind}'
    nxt = _MREG['highest'].get(hk, 0) + 1
    _MREG['highest'][hk] = nxt
    ident = f"MK-{family}-{kind}-{nxt:03d}"
    _MREG['issued'][rk] = ident
    _mreg_dirty = True
    return ident

def _mreg_save():
    if _mreg_dirty:
        json.dump(_MREG, open(_MREG_PATH, 'w'), indent=1, sort_keys=True)

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
    _mid = nid('XS','M', (label, metric)); record_metric(eid_for(engine,'XS'), _mid); _FN_OF = functions_for(engine); _CA = chain_and_assumptions(_FN_OF[1])
    ws.append([_mid, screens, 'NA', label, metric, _FN_OF[0], _FN_OF[1], m, w, *sp, *_CA, se, (fi + (' | ' if fi else '') + _f.MISASSIGNED.get(_mid,'')).strip(' |'), assumptions(engine, m, de), dup_note(_mid), qs, '', '', 'NOT DETERMINED', 'VERIFIED 2026-08-22', _audit.for_row(_mid, _CA[1], w), _baudit.for_row(_mid, _FN_OF[1]),
                   _why_none(_FN_OF[1], _FN_OF[0]), _baudit.accuracy_note(_mid),
                   _finding_states(_mid),
                   _HIST.state(_mid, _DUP_OF.get(_mid,('',''))[0]),
                   _HIST.stamp(_mid, (m, w, _FN_OF[1], sp))])

OWNED = {r for rows in SECONDARY.values() for (r,_,_,_) in rows}
FAM = {'menu':'MN','home':'HM','networth':'NW','performance':'PF','cashflow':'CF','plan':'PL'}
for tab in ['home','networth','performance','plan','cashflow','menu']:
    ws = sheet(tab, COLS)
    for label, metric, engine in VERIFIED.get(tab, []):
        m,w = formulas(engine); fi,de,se = notes(engine); qs = questions_for(engine); sp = spec_cols(engine, label, m)
        _mid = nid(FAM[tab],'M', (label, metric)); record_metric(eid_for(engine, FAM[tab]), _mid); _FN_OF = functions_for(engine); _CA = chain_and_assumptions(_FN_OF[1])
        ws.append([_mid, PARENTS[tab], 'NA', label, metric, _FN_OF[0], _FN_OF[1],
                   m, w, *sp, *_CA, se, (fi + (' | ' if fi else '') + _f.MISASSIGNED.get(_mid,'')).strip(' |'), assumptions(engine, m, de), dup_note(_mid), qs, '', '', 'NOT DETERMINED', 'VERIFIED 2026-08-22', _audit.for_row(_mid, _CA[1], w), _baudit.for_row(_mid, _FN_OF[1]),
                   _why_none(_FN_OF[1], _FN_OF[0]), _baudit.accuracy_note(_mid),
                   _finding_states(_mid),
                   _HIST.state(_mid, _DUP_OF.get(_mid,('',''))[0]),
                   _HIST.stamp(_mid, (m, w, _FN_OF[1], sp))])
    if tab == 'menu':
        routes = sorted(r for r in nav['routes'] if r not in nav['reach'] and r not in TABS)
    else:
        parent_route = [k for k,v in TABS.items() if v==tab][0]
        routes = screens_for(tab)
    done = set()
    for route, label, metric, engine in SECONDARY.get(tab, []):
        done.add(route)
        m,w = formulas(engine); fi,de,se = notes(engine); qs = questions_for(engine); sp = spec_cols(engine, label, m)
        _mid = nid(FAM[tab],'M', (route, label, metric)); record_metric(eid_for(engine, FAM[tab]), _mid); _FN_OF = functions_for(engine); _CA = chain_and_assumptions(_FN_OF[1])
        ws.append([_mid, PARENTS[tab], route, label, metric, _FN_OF[0], _FN_OF[1],
                   m, w, *sp, *_CA, se, (fi + (' | ' if fi else '') + _f.MISASSIGNED.get(_mid,'')).strip(' |'), assumptions(engine, m, de), dup_note(_mid), qs, '', '', 'NOT DETERMINED', 'VERIFIED 2026-08-22', _audit.for_row(_mid, _CA[1], w), _baudit.for_row(_mid, _FN_OF[1]),
                   _why_none(_FN_OF[1], _FN_OF[0]), _baudit.accuracy_note(_mid),
                   _finding_states(_mid),
                   _HIST.state(_mid, _DUP_OF.get(_mid,('',''))[0]),
                   _HIST.stamp(_mid, (m, w, _FN_OF[1], sp))])
    NO_FIGURES = {'/auth','/first-run','/settings','/tips','/rewards','/estate','/income','/sharpen','/connect','/add-account','/import-holdings','/onboarding'}
    for r in routes:
        if not r or r in done or r in OWNED: continue
        if r == '/performance':
            ws.append(['', PARENTS[tab], r, '—', '—', '—'] + ['']*17 + ['NOT DETERMINED',
                       'READ 2026-08-22 — the same screen as /invest, reached by a second route'])
            continue
        if r in NO_FIGURES:
            ws.append(['', PARENTS[tab], r, '—', '—', '—'] + ['']*17 + ['NOT DETERMINED',
                       'READ 2026-08-22 — no calculated figure on this screen'])
            continue
        ws.append(['', PARENTS[tab], r] + ['']*20 + ['NOT STARTED — screen not yet read'])

# ---- inputs
ws = sheet('inputs', INPUT_COLS)
# Every input now names the FUNCTIONS that read it, swept from the code by the field the value is
# stored under. The engine columns are gone: the word was retired on 2026-08-25 and neither the
# name nor the E identifier could be looked up in the code.
_BODIES = {}
for _root in _inp.CALC_ROOTS:
    for _dp, _, _fs in os.walk(_root):
        if '__tests__' in _dp: continue
        for _f2 in _fs:
            if _f2.endswith(('.ts','.tsx')) and '.test.' not in _f2:
                for _n, _l, _sg, _b, _nt in _fn.bodies(os.path.join(_dp, _f2)):
                    _BODIES.setdefault(_n, _b)
_READERS = _inp.readers(_BODIES)
_FID = {r['name']: r['id'] for r in _FN_ROWS}
# a function identifier → every metric identifier whose row names it
_MET_BY_FN = {}
for _t2 in ['multiple_screens','home','networth','performance','plan','cashflow','menu']:
    _hd = [c.value for c in wb[_t2][1]]; _fi2 = _hd.index('Function ID')
    for _r2 in wb[_t2].iter_rows(min_row=2, values_only=True):
        if not _r2[0]: continue
        for _f3 in re.findall(r'MK-[A-Z]{2}-[FO]-\d{3}', str(_r2[_fi2] or '')):
            _MET_BY_FN.setdefault(_f3, set()).add(_r2[0])

def _input_row(iid, var, source, fields):
    names = _READERS.get(iid, [])
    fns = [f'{_FID[n]} {n}' for n in names if n in _FID]
    mets = sorted({m for n in names if n in _FID for m in _MET_BY_FN.get(_FID[n], ())})
    if fns:
        who = numbered(' · '.join(fns[:14]), ' · ')
        if len(fns) > 14: who += '\n… and %d more — the full list is on functions_from_code' % (len(fns)-14)
    else:
        seen = _inp.in_files(fields)
        who = ('NO FUNCTION READS IT. The value is captured and stored, and nothing calculates '
               'with it. It appears in %s outside any function, which is the S21 blind spot.'
               % ', '.join(os.path.basename(x) for x in seen)) if seen else \
              'NOT FOUND IN THE CODE AT ALL — either it is named something else there, or nothing '\
              'reads it. Needs reading by hand before this row can be trusted.'
    fig = ' · '.join(mets) if mets else ('NONE ON RECORD — the functions above serve no figure that '
                                         'names them. See S21.')
    shown = ' · '.join(f.replace('\\', '').replace('r\'', '').strip("'") for f in fields)
    return [iid, var, source, shown, who, fig, 'SWEPT FROM THE CODE 2026-08-26',
            _HIST.state(iid), _HIST.stamp(iid, (var, source, shown, who))]

for var, source, metrics, engines in INPUTS + _f.NEW_INPUTS:
    _iid = nid('XS','I', (var, source))
    ws.append(_input_row(_iid, var, source, _inp.FIELDS.get(_iid, [])))
# raw values the code reads that had no row until 2026-08-26
for _iid in sorted(_inp.NEW):
    _v, _src, _flds = _inp.NEW[_iid]
    ws.append(_input_row(_iid, _v, _src, _flds))
for _c in range(1, len(INPUT_COLS)+1):
    ws.column_dimensions[get_column_letter(_c)].width = [15,34,34,34,62,30,26,34,20][_c-1]


# ---- Specification: what a row must carry before its calculation can be written
SPEC = [
 ('', 'SECTION — WHAT THE NUMBER IS', '', ''),
 ('S01','The formula','The actual rules, both as arithmetic and in plain English, followable by hand.','COMPLETE — 163 of 163 carry both forms.'),
 ('S02','The inputs, one by one','Every input named, with its INPUT IDENTIFIER beside it, where it comes from, and what reads it.','PARTIAL — the inputs tab was rebuilt against the CODE on 2026-08-26: 60 rows (12 of them raw values nobody had captured before), each naming the field the code stores it under and every function that touches it. 50 of 60 name at least one function; 2 name none at all; 43 reach a figure. The engine columns are gone. Still partial on the figures side, which waits on S21.'),
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
 ('S11','Which functions a figure depends on','Each dependency named by ITS function identifier and by the output it gives, so a chain can be followed without knowing any function by name. Every figure also carries the whole chain and every assumption made anywhere in it.','COMPLETE — read from the code itself, not from any document.'),
 ('S12','Where it is implemented','The file and line that carry it, so file and code can be checked against each other on every build.','COMPLETE for functions — the functions_from_code tab carries the file and line for all 455, read from the code. Still PARTIAL for figures: 69 of 163 name no function at all, so nothing can be pointed at.'),
 ('', 'SECTION — GOVERNANCE', '', ''),
 ('S13','The founder\'s verdict','A row counts as documented only when he has approved it.','NOT STARTED — the column does not exist yet, so the coverage count means nothing until it does.'),
 ('S14','Lifecycle','Live, cut, or superseded by another identifier.','NOT STARTED.'),
 ('', 'SECTION — NOT ON THE ORIGINAL LIST, STILL NEEDED', '', ''),
 ('S15','Your name for it, from the 72-metric file','The bridge between the founder\'s vocabulary and the code\'s.','NOT STARTED — 0 of 163 rows.'),
 ('S18','The reconciliation engine','Both records kept independently and checked against each other as a build gate — an input an engine names that is on no row, an input declared that no engine names, an engine identifier that does not exist, an engine no metric reaches. Founder, 2026-08-25: never generate one list from the other; agreement by construction hides the orphan.','COMPLETE — moneykeel_reconcile.py runs at the end of every build and STOPS it on a structural break: a duplicate identifier, a reference to an engine or input that does not exist, a fold pointing nowhere, a question number used twice. Findings that are real but unresolved — orphan and dead inputs — are counted every build rather than failing it, and must reach zero before the module is called done. Today: 0 breaks, 9 open findings.'),
 ('S19','Duplicate calculations in the CODE','S16 compared the figures on screens, so it could only see functions a figure names. Two functions in different files computing the same thing, named by no figure, are invisible to it — alternativesSummary and alternativesTotal both total the same holdings. A second pass is needed over the 455 functions themselves.','NOT STARTED.'),
 ('S20','Figures with no function on record','Sixty-nine of the 163 figures name no function in the code. Most were names I assigned while reading a screen, which never had a function behind them. Until each is pointed at a real function, that figure cannot be traced, tested or trusted.','OPEN — counted per screen on the functions_per_metric tab: Plan 23, Menu 20, Cash flow 13, Net worth 9.'),
 ('S21','The identifier inside the code','Every link between this file and the code still travels through a column somebody typed in the old inventory. The identifier standard says it belongs in a header inside each code file; until it does, a real function can look undocumented and a stale line can look correct.','NOT STARTED — this is the weak link behind S12, S19 and S20.'),
 ('S16','The duplication pass','Figures that are the same thing under two identifiers.','COMPLETE — every group judged one at a time. 11 figures were being shown under 24 identifiers; the 13 folded rows now name the identifier that survives and why. 18 groups were checked and are NOT duplicates — one engine legitimately producing several figures — and say so, so the question is not asked twice. Two mis-assigned engines were found and recorded as findings.'),
 ('S24','The formula audit — figure against function','A figure and the function that produces it must state the same rule. If they do not, one of the two is wrong and nobody knows which, which is exactly the case the objectives standard says work must stop on.','OPEN — 94 of the 163 figures name a function and were compared; the other 69 name none and could not be. 51 rows carry a finding: 15 CLASH (the file states a rule the code does not implement), 5 MISNAMED (the formula and the function are about different things), 4 ONE FORMULA (figures that are not the same figure sharing one). 43 rows agree. Every finding was checked against the code file and line, not against the two cells alone.'),
 ('S23','The formula on every function','A figure can only be checked if the rule behind it can be read. The 163 figures carried a formula; the 455 functions underneath them did not, so there was no way to see HOW a number was worked out.','PARTIAL — all 455 now carry both forms, read from the code itself. 24 read by hand and checked line by line, 161 rendered clean from the code, 221 partly rendered with some code still showing, 29 not rendered at all and saying so, 20 with no arithmetic to state. The How-it-was-read column carries the verdict per row, so no row overstates itself.'),
 ('S22','The 2026-08-25 audit','The last 48 hours of work read back against the three standards, so that what is wrong is on record before more is built on top of it.','OPEN — 51 findings, A01 to A51. The ones that land on a figure are in the last column of each screen tab; the ones that belong to the whole file are at the bottom of the Reference tab. A06, A07, A08 and A09 say that the status lines of S01, S02, S20 and S12 above do not match what the file holds — those four are left as they were written rather than quietly re-graded, because changing a status is the founder\'s call.'),
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

FN_COLS = ['Function ID','Function','File','Line','Category','Objective — what this function is for',
           'Formula (mathematical)','Formula (in words)','How the formula was read',
           'What it is handed (its inputs)','What it gives back (its output)',
           'Where its answer appears — the words, the screen, the section','Assumptions it makes',
           'Can its answer reach a screen?','Dependent functions — one step below',
           'Dependent functions — how many in total',
           'Dependent functions — all of them',
           'The chain, ending in this function',
           'Figures that name it','Name in the old inventory',
           'Active or decommissioned','Date last modified']
ws = sheet('functions_from_code', FN_COLS)
ws.append(['READ FROM THE CODE ITSELF. Sorted by what the code does — what a function returns, '
           'whether it reaches outside for data, and who calls it — never by its name. '
           '1 ACTION does something and displays nothing · 2 DISPLAYED lands on a screen · '
           '3 DEPENDENT feeds a chain that ends at a screen · 4 BRINGS DATA IN fetches from outside. '
           'The chain reads left to right and ENDS in the function that shows the answer; everything feeding it comes first.',
           *([''] * (len(FN_COLS)-1))])
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
for row in _fn_index().values() if False else sorted(_fn_index().values(), key=lambda r: r['id']):
    old = _fn_to_old.get(row['name'], '')
    eid = engine_id.get(old, '') if old else ''
    mids = sorted(METRICS_BY_ENGINE.get(eid, [])) if eid else []
    _cat_counts[row['category']] += 1
    _purpose = row.get('purpose') or (_answers.get(_fn_to_old.get(row['name'],''),'') or '')
    if not _purpose:
        _purpose = 'NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.'
    ws.append([row['id'], row['name'], row['file'], row['line'], row['category'], _purpose,
               row['formula_math'], row['formula_words'], row['read_as'],
               numbered(row['inputs'], ' · '), row['output'],
               numbered(row['screen_labels'], ' · '), numbered(row['assumptions']),
               row['can_reach_a_screen'], numbered(row['depends_on'], ' · '), row['feeder_count'],
               numbered(row['fed_by'], ' · '), numbered(row['chain']),
               ' · '.join(mids) or '—', old or '—',
               _HIST.state(row['id']),
               _HIST.stamp(row['id'], (row['formula_math'], row['file'], row['category']))])
for i,w in enumerate([15,28,34,7,26,42,60,64,34,42,30,62,54,14,34,12,52,66,26,22,34,20], start=1):
    ws.column_dimensions[get_column_letter(i)].width = w
_fcol = FN_COLS.index('Formula (mathematical)') + 1
for r in range(2, ws.max_row+1):
    for c in range(1,len(FN_COLS)+1): ws.cell(r,c).alignment = Alignment(wrap_text=True, vertical='top')
    ws.cell(r,_fcol).font = Font(name='Menlo', size=10)
print('functions_from_code:', dict(_cat_counts))


# ---- one row per engine identifier: the definitive list the rest of the file points at
ENG_COLS = ['Engine ID','Engine name','Where it is implemented (S12)','What it answers',
            'Metric identifiers that reach it','How it is reached']
ws = sheet('engines-old-tab', ENG_COLS)
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


# ---- a count per category: how many functions, and how many cannot say what goes in or comes out
SUM_COLS = ['Category','Functions','Handed nothing, and reads no stored data',
            'Handed nothing, but reads the stored data','Does not declare what it gives back',
            'Neither: nothing in, nothing declared out']
ws = sheet('functions_summary', SUM_COLS)
ws.append(['A function handed nothing that reads no stored data has its answer from a constant, '
           'the clock, or something the code does not show. A function that does not declare what it '
           'gives back cannot be checked for returning the right shape. Both are counted here rather '
           'than described.','','','','',''])
ws.cell(ws.max_row,1).font = Font(bold=True, color='1F3864')
import collections as _c2
_tally = _c2.defaultdict(lambda: [0,0,0,0,0])
for _r in _FN_ROWS:
    _cat = _r['category']; _in = _r['inputs']; _out = _r['output']
    _nothing = _in.startswith('Nothing is handed')
    _store = 'stored data' in _in
    _noout = _out.startswith('NOT DECLARED')
    t = _tally[_cat]
    t[0] += 1
    if _nothing and not _store: t[1] += 1
    if _nothing and _store: t[2] += 1
    if _noout: t[3] += 1
    if _nothing and _noout: t[4] += 1
_tot = [0,0,0,0,0]
for _cat in sorted(_tally):
    v = _tally[_cat]
    ws.append([_cat] + v)
    _tot = [a+b for a,b in zip(_tot, v)]
ws.append(['TOTAL'] + _tot)
ws.cell(ws.max_row,1).font = Font(bold=True)
for i,w in enumerate([40,12,40,38,34,34], start=1):
    ws.column_dimensions[get_column_letter(i)].width = w
for r in range(2, ws.max_row+1):
    for c in range(1,7): ws.cell(r,c).alignment = Alignment(wrap_text=True, vertical='top')


# ---- how many functions stand behind each figure, by screen
CNT_COLS = ['Parent screen','Figures','Behind one function only','Behind 2 to 5 functions',
            'Behind more than 5 functions','No function on record']
ws = sheet('functions_per_metric', CNT_COLS)
ws.append(['Counting the function that produces a figure PLUS every function below it. A figure '
           'standing on many functions is not wrong, but a wrong one has that many places to have '
           'started.','','','','',''])
ws.cell(ws.max_row,1).font = Font(bold=True, color='1F3864')
import collections as _c3
_per = _c3.defaultdict(lambda: [0,0,0,0,0])
for _tab in ['multiple_screens','home','networth','performance','plan','cashflow','menu']:
    _sh = wb[_tab]
    _hd = [c.value for c in _sh[1]]
    _fi = _hd.index('Function ID')
    _pa = _hd.index('Parent Screen Name')
    for _r in _sh.iter_rows(min_row=2, values_only=True):
        if not _r[0]: continue
        _screen = _r[_pa] if _tab != 'multiple_screens' else 'Shown on more than one screen'
        _ids = re.findall(r'MK-[A-Z]{2}-[FO]-\d{3}', str(_r[_fi] or ''))
        _row = _per[_screen]
        _row[0] += 1
        if not _ids:
            _row[4] += 1; continue
        _total = 0
        for _i in _ids:
            _frow = _fn_index().get(_i)
            _total += 1 + (_frow['feeder_count'] if _frow else 0)
        if _total == 1: _row[1] += 1
        elif _total <= 5: _row[2] += 1
        else: _row[3] += 1
_tot = [0,0,0,0,0]
for _screen in sorted(_per):
    v = _per[_screen]; ws.append([_screen] + v)
    _tot = [a+b for a,b in zip(_tot, v)]
ws.append(['TOTAL'] + _tot); ws.cell(ws.max_row,1).font = Font(bold=True)
for i,w in enumerate([34,10,26,26,30,24], start=1):
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
 ('TAB — engines-old-tab', 'One row per engine identifier — the definitive list every dependency and every figure points at. Carries where the engine is implemented, what it answers, and which figures reach it.'),
 ('TAB — functions_per_metric', 'By parent screen: how many figures it shows, and how many functions stand behind each one — a single function, two to five, more than five, or none on record.'),
 ('TAB — functions_summary', 'A count per category: how many functions there are, how many are handed nothing at all, how many are handed nothing but reach into the stored data, and how many never say what they give back.'),
 ('TAB — functions_from_code', 'Every function in the calculation code, read from the code itself, sorted into the four categories by what it actually does. 1 ACTION does something and displays nothing. 2 DISPLAYED lands on a screen. 3 DEPENDENT feeds a chain that ends at a screen. 4 BRINGS DATA IN fetches from outside the app. A function that can reach a screen can put a wrong number in front of a person; one that cannot, cannot.'),
 ('TAB — reconciliation', 'The input map checked in BOTH directions: what the inputs tab says uses each input, against what each engine actually names in its own input list. Where the two disagree the row says so. The section at the foot lists inputs an engine names that appear nowhere on the inputs tab.'),
 ('TAB — core_screens', 'Every screen in the app, its parent, my recommendation on whether it belongs to the 55-70 core, and a column for the founder to decide. Until this is decided, no row in the file can honestly claim to be in scope (S17).'),
 ('TAB — database', 'What the app saves in the cloud: where each thing is stored, what it holds, which figures depend on it, how often it is written and at what grain. Also names what is deliberately NOT saved.'),
 ('TAB — inputs', 'The raw values the engines need before any calculation happens.'),
 ('', ''),
 ('COLUMN — Function that produces it', 'The function in the code that produces this figure, named plainly. Three honest answers: the function · "worked out on the screen itself" · or "no function on record", which means nothing in the old inventory ever recorded one.'),
 ('COLUMN — Function ID', 'That function\'s identifier, MK-[family]-F-[number], from the functions_from_code tab.'),
 ('COLUMN — Category / File / Line', 'On the functions tab: which of the four categories the function falls in, and where it lives in the code.'),
 ('COLUMN — Objective — what this function is for', 'Its purpose in one sentence, in the author\'s own words from the note above it in the code, or from the old inventory. NOT DETERMINED where neither exists.'),
 ('COLUMN — Formula (mathematical) [functions tab]', 'What the function actually computes, written as arithmetic, read out of its own body. A sum written in code as a reduce is shown as Σ; a rounding is shown with the number of decimal places it really uses; a condition is shown as its two answers. Nothing here is inferred from the function NAME — where a body could not be rendered faithfully the cell says so instead of guessing.'),
 ('COLUMN — Formula (in words) [functions tab]', 'The same rule in plain English. It is generated from the SAME expression as the arithmetic beside it, so the two cannot drift apart. Where the formula was read by hand this column is written by hand and says what the rule means, not just what it does.'),
 ('COLUMN — How the formula was read', 'How much to trust the two columns before it. READ BY HAND — checked line by line against the code, and the words say what the rule means. READ FROM THE CODE — rendered from the expressions the function runs, with no code left showing. PARTLY READ — faithful, but some of the code is still showing through and it needs a hand pass. NO ARITHMETIC — it fetches, saves or announces, so there is no formula to state. NOT READ — the body is not a shape the reader can render, and nothing is claimed rather than something guessed.'),
 ('COLUMN — What it gives back (its output)', 'What the function returns. NOT DECLARED means the code does not say, so nothing can check it returns the right kind of thing.'),
 ('COLUMN — Can its answer reach a screen?', 'The question that decides whether a function can put a wrong number in front of a person.'),
 ('COLUMN — Figures that name it', 'Which metric identifiers reach this function. It travels through the old inventory to get there, so it is only as good as that record.'),
 ('COLUMN — Name in the old inventory', 'What the old master called this function, kept only so the link to the earlier file is not lost. The word engine is retired.'),
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
 ('COLUMN — What it is for', 'The purpose of the function in one sentence, taken from the note written above it in the code, or from the old inventory when the code carries none. NOT DETERMINED where neither exists — never invented.'),
 ('COLUMN — What it is handed / what it gives back', 'Read from the function\'s own signature: the values passed to it, whether it also reads the stored data, and what it returns. NOT DECLARED means the code does not say what comes back.'),
 ('COLUMN — Where its answer appears', 'In plain English: the words printed beside the answer, which screen they are on, and the section they sit under. NOT FOUND means a screen calls the function but the words could not be traced automatically and need reading.'),
 ('COLUMN — Assumptions it makes', 'What the function takes for granted, in plain English rather than in code: a value used when data is missing, a rate nobody chose on a screen, a year treated as twelve equal months, a cap, rows deliberately left out. Read from the code with the comments stripped out, so it reports what runs rather than what someone wrote about it.'),
 ('COLUMN — Dependent functions', 'A dependent function is one whose output is used by another function, in a chain that ends at a screen. These columns list the dependent functions behind this one: those one step below it, how many there are in total, and all of them however many steps away.'),
 ('COLUMN — The chain, ending in this function', 'Read left to right. The function that shows the answer sits at the END, and everything feeding it comes before it. A loop is marked where a chain turns back on itself. Chains are cut at five levels and eight paths, and say so.'),
 ('COLUMN — The chain of functions behind it', 'The chain that ends in the function producing this figure, read left to right, taken from the functions tab.'),
 ('COLUMN — Assumptions made anywhere in that chain', 'Every assumption made by the producing function OR by any function below it, each named with the identifier of the function that makes it. This is where a figure quietly inherits a rate nobody chose.'),
 ('COLUMN — Same figure as (S16)', 'Where the same figure appears under more than one identifier, the row names the surviving identifier and why. Nothing is deleted: identifiers are never reused, so a folded row stays visible and says what it became.'),
 ('COLUMN — Questions for you (numbered)', 'My open questions about that engine or figure, each with a number that never changes. A number is never reused or renumbered, so an answer can always be matched to its question.'),
 ('COLUMN — YOUR ANSWER — use the same number', 'Answer here, starting each answer with the question number. Nothing else in the file needs to line up.'),
 ('COLUMN — Where each finding stands', 'Every finding on this row, and its outcome. OPEN means nothing has closed it — not that it is unproven, but that it is unaddressed. FIXED carries the date. NOT A DEFECT means the finding itself was examined and was wrong; those are kept, never deleted, because erasing them would hide that the audit can be wrong and the next reader could not tell a dismissed finding from a forgotten one. PARTLY FIXED and NAMED-NOT-FIXED say exactly how far it got. What closed each one, and the test that fails if it returns, are in moneykeel_finding_status.py. Added 2026-08-27 at the founder\'s ruling: a finding without an outcome is half a record.'),
 ('COLUMN — Active or decommissioned', 'ACTIVE means it exists in the code or on a screen today. SUPERSEDED BY names the identifier that replaced it — the same thing under another number, which is then retired and never handed to anything else. DECOMMISSIONED with its date means it was here and is not any more; the row is kept so the number is never reused and earlier work can still be traced. Never blank. Added 2026-08-27.'),
 ('COLUMN — Date last modified', 'The date this ROW last changed — not the date the build last ran. The row\'s content is hashed and kept, so the date only moves when the content really moves. A row untouched since August still reads August in December, which is the whole point: a date that says today on every row means nothing. Added 2026-08-27.'),
 ('COLUMN — Wrong on screen — build first', 'A finding here changes a NUMBER OR A WORD a person actually reads, on one of the three screens being built first: cash flow This month, cash flow Spending, and the base-salary income screen. Blank does NOT mean the row is right — most rows carry findings where the FILE is wrong and the app is correct, which is real work but not a wrong number in front of anyone. Marked 2026-08-27 at the founder\'s request, so the queue is visible on the row rather than in a list somewhere else.'),
 ('COLUMN — Why no function', 'Four answers, never a blank. HAS A FUNCTION. TYPED — the person entered it, none needed, already right. WORKED OUT ON THE SCREEN — the arithmetic is in a screen file and cannot be shared. NO FUNCTION ON RECORD — nothing says what produces it. Added 2026-08-26 because the file reported 69 figures with no function as ONE number, which reads as 69 problems; it is 64 problems of two kinds and 5 rows that are already correct.'),
 ('COLUMN — Formula audit — metric vs the function it names', 'The 2026-08-26 pass: this figure\'s arithmetic checked against the arithmetic of the function in its Function ID column, and against every other figure naming the same function. Four verdicts. CLASH — the figure states a rule the code does not implement; a real defect. MISNAMED — the formula and the function are about different things. ONE FORMULA — figures that are not the same figure sharing one formula between them. AGREES — the two say the same thing. NOT COMPARABLE — no function is named, so nothing can be checked. Each finding is numbered B01 upwards and names the code file and line it was checked against.'),
 ('COLUMN — Audit finding — 2026-08-25 review', 'What the 2026-08-25 review found wrong, unproved or missing on THIS row, each numbered A01 upwards. A number is given once and never reused, the same rule the questions follow. Findings that belong to the whole file rather than to any one row are listed at the bottom of this tab under AUDIT. Blank means nothing was found on this row by this review — it does not mean the row is right.'),
 ('COLUMN — Errors or findings to address', 'What is known to be wrong or unproved about this figure, in plain English. Blank means nothing is on record yet — not that nothing is wrong.'),
 ('COLUMN — Decisions made (S03)', 'The rulings and assumptions that govern this figure, each marked with WHOSE decision it was: [Founder] his own ruling, [The person] something the user set, [Built in] an assumption nobody chose on a screen — which is usually why a number looks wrong. The standing display and rounding rule applies to every row and is stated at the top of this tab.'),
 ('COLUMN — Formula (mathematical)', 'The rule written as arithmetic, so it can be followed symbol by symbol and checked against the code.'),
 ('COLUMN — Formula (in words)', 'The same rule in plain English, followable by hand. Where the engine has a row in the old master this is its wording, carried over; where it does not, it is written here from reading the code.'),
 ('COLUMN — Engine ID', 'The identifier of that engine. Blank where the figure is worked out on the screen itself rather than by an engine — which is itself a finding.'),
 ('COLUMN — Your name for it (72-metric file)', "The founder's own name for the same figure, from METRICS-DELIVERABLE-ANSWERED-2026-08-20.xlsx. This column is the bridge between his vocabulary and the code's."),
 ('COLUMN — Core screen?', 'Whether the screen is part of the 55-70 core, the agreed first scope. Currently NOT DETERMINED on every row: the core list has never been written down, so no row can honestly claim to be in or out of it.'),
 ('COLUMN — Row status', 'VERIFIED with its date means a person read the screen and confirmed the chain. NOT STARTED means the screen has not been read yet. Nothing in between is claimed.'),
 ('', ''),
 ('COLUMN — Where the code keeps it', 'The field name the value is stored under in the code. This is the join between a value a person would name — "bond maturity date" — and the code, and it is what makes the next column checkable rather than remembered.'),
 ('COLUMN — Functions that read it', 'Every function whose body touches that field, swept from the code on every build. Replaces the two engine columns this tab carried until 2026-08-26: the word engine was retired by the vocabulary standard, and neither the engine name nor its E identifier could be looked up in the code.'),
 ('COLUMN — Figures it reaches', 'The figures served by the functions above. NONE ON RECORD means those functions are named by no figure in this file — an S21 gap, not proof the input reaches nobody.'),
 ('COLUMN — Input ID', 'The identifier of a raw input, per the same standard.'),
 ('COLUMN — Variable name', 'What the raw value is called.'),
 ('COLUMN — Source', 'Where the value comes from: the person typed it, an institution download, a connected provider, or another engine computed it.'),
 ('', ''),
 ('Complies with — naming', 'MoneyKeel/documents/standards/moneykeel_naming_spec_file-and-folder-naming_v01.md'),
 ('Complies with — identifiers', 'MoneyKeel/documents/standards/moneykeel_naming_spec_unique-identifier_v01.md'),
 ('Complies with — objectives', 'MoneyKeel/documents/standards/moneykeel_calc_spec_objectives-and-verification_v01.md'),
 ('', ''),
 ('COVERAGE — screens read so far', '49 of 49. Every screen in the app has been read: the five parent screens, every secondary screen and every menu screen. Twelve screens carry no calculated figure and say so.'),
 ('COVERAGE — what that means', 'Every screen in the app is listed on its tab. Only Home carries figures so far; the rest are marked NOT STARTED. A rising count is not completeness while screens remain unread.'),
] + [(' ',' '),
 ('AUDIT — 2026-08-25 review', 'Read against the three standards: the vocabulary, the identifiers, '
  'and the objectives-and-verification. These findings belong to the FILE rather than to any one '
  'row. The ones that land on rows are in the last column of each screen tab, numbered from the '
  'same list, so a number means the same thing wherever it is read.')] + _audit.reference_rows()
for a,b in ref: ws.append([a,b])
ws.column_dimensions['A'].width=46; ws.column_dimensions['B'].width=118
for r in range(2, ws.max_row+1):
    ws.cell(r,1).font=Font(bold=True); ws.cell(r,2).alignment=Alignment(wrap_text=True, vertical='top')

for name in wb.sheetnames:
    if name in ('Reference','database','core_screens','reconciliation','engines-old-tab','functions_from_code','functions_summary','functions_per_metric'): continue
    w=wb[name]
    for i,col in enumerate(COLS if name!='inputs' else INPUT_COLS, start=1):
        w.column_dimensions[get_column_letter(i)].width = max(14, min(42, len(col)+8))

wb._sheets = [wb[n] for n in TAB_ORDER if n in wb.sheetnames]
os.makedirs(os.path.dirname(OUT), exist_ok=True)
# GUARD: every question must have landed on a row. A question the founder cannot see is a
# question that will never be answered.
_all_q = {q.split(' ')[0] for v in getattr(_f,'QUESTIONS',{}).values() for q in v}
_placed = set()
for _t in ['multiple_screens','home','networth','performance','plan','cashflow','menu']:
    _hd = [c.value for c in wb[_t][1]]; _qi = _hd.index('Questions for you (numbered)')
    for _r in wb[_t].iter_rows(min_row=2, values_only=True):
        if _r[0] and _r[_qi]: _placed |= set(re.findall(r'Q\d\d', str(_r[_qi])))
_unplaced = _all_q - _placed
if _unplaced:
    raise SystemExit('BUILD STOPPED — these questions landed on no row: ' + ', '.join(sorted(_unplaced)))

_gone = _HIST.gone()
if _gone:
    print('DECOMMISSIONED this build — in the file yesterday, gone today: %d' % len(_gone))
    for _g in _gone[:12]: print('   ' + _g)
_HIST.save()

_placed, _lost = _keepmod.apply(wb, _KEPT)
_keepmod.write_orphans(_lost, os.path.join(os.path.dirname(OUT), 'kept-but-unplaced.md'))
print(_keepmod.report(_placed, _lost))

wb.save(OUT)
_mreg_save()   # the identifiers this build issued, kept so they never move again
print("wrote", OUT)

# S18 — the gate. Structural breaks stop the build; open findings are counted, not hidden.
import importlib.util as _il2
_sp2=_il2.spec_from_file_location('mkrec', os.path.join(os.path.dirname(os.path.abspath(__file__)),'moneykeel_reconcile.py'))
_rec=_il2.module_from_spec(_sp2); _sp2.loader.exec_module(_rec)
_breaks, _open, _counts = _rec.check(OUT)
print('reconciliation — %(figures)s figures, %(inputs)s inputs, %(functions)s functions' % _counts)
print('  structural breaks: %d   open findings: %d' % (len(_breaks), len(_open)))
for _b in _breaks[:20]: print('   BREAK  ' + _b)
if _breaks:
    raise SystemExit('BUILD STOPPED — the file does not reconcile with itself.')
print("questions placed:", len(_all_q))
