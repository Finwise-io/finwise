"""Builds the MoneyKeel calculation master file.

One row per figure a person reads on screen, tied to its metric, its engine and their identifiers.
Every row is either VERIFIED (a person read the screen and confirmed the chain) or NOT STARTED.
Nothing here is guessed: an engine that cannot be found in the code is written as NOT FOUND.
"""
import json, os, datetime, openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(ROOT)
OUT = 'MoneyKeel/documents/other/moneykeel_calc_master_calculation-master_v01.xlsx'
TODAY = datetime.date.today().isoformat()

PARENTS = {'home':'Home','networth':'Networth','performance':'Performance',
           'cashflow':'Cashflow','plan':'Plan','menu':'Menu'}
TAB_ORDER = ['Reference','Specification','multiple_screens','home','networth','performance','plan','cashflow','menu','inputs']

COLS = ['Metric ID','Parent Screen Name','Secondary Screen Name','Name on Screen',
        'Name of Underlying Metric','Name of Underlying Engine','Engine ID',
        'Your name for it (72-metric file)','Core screen?','Row status']
INPUT_COLS = ['Input ID','Variable name','Source','Which metric uses it','Which engine uses it','Row status']

# ---------------------------------------------------------------- verified rows
# Home — read line by line from src/screens/HomeScreen.tsx on 2026-08-22.
HOME = [
 # label, metric (code), engine, engine id family, note
 ('YOUR INVESTMENTS',              'investTotal',    'TOTAL_INVESTMENTS',      'XS'),
 ('▲ up / ▼ down $X (Y%) this month','youReturn',     'VALUE_WEIGHTED_RETURN',  'XS'),
 ('prices updated <when>',          'freshness',      'PRICE_FRESHNESS',        'XS'),
 ('Your net worth just crossed X',  'milestone',      'NOT IN OLD MASTER — milestoneCrossed, src/domain/milestones.ts', 'HM'),
 ('Needs your attention (1,2,3)',   'topInsights',    'NOT IN OLD MASTER — useInsights, src/domain/insights', 'HM'),
 ('Income',                         'thisMonthNet',   'NOT IN OLD MASTER — incomeMonthlyGrid, src/domain/income', 'CF'),
 ('Spent so far',                   'bva.spent_total','NOT IN OLD MASTER — budgetVsActual, src/domain/budget', 'CF'),
 ('Left / Over',                    'left',           'derived on screen: Income − Spent so far', 'CF'),
 ('<n>% spent · day n of m',        'pctSpent',       'derived on screen: Spent so far ÷ Income', 'CF'),
]
# figures already known to appear on more than one parent screen
MULTI = [
 ('Net worth',      'Home · Networth', 'netWorth',  'NET_WORTH',           'XS'),
 ('Will your money last (odds)', 'Home · Plan', 'wil.chance', 'WILL_IT_LAST_RESULT', 'XS'),
]

nav = json.load(open('/tmp/nav.json'))
TABS = {'/home':'home','/analytics':'networth','/invest':'performance','/cashflow':'cashflow','/plan':'plan'}

def screens_for(tab):
    """every screen belonging to a parent tab: the parent itself plus what it reaches"""
    out=[]
    for route,parent_list in nav['reach'].items():
        if PARENTS[tab] in parent_list: out.append(route)
    return sorted(out)

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

# ---- multiple_screens
ws = sheet('multiple_screens', COLS)
for label, screens, metric, engine, fam in MULTI:
    ws.append([nid('XS','M'), screens, 'NA', label, metric, engine, nid(fam,'E'), '', 'Yes', 'VERIFIED 2026-08-22'])

# ---- home (verified)
ws = sheet('home', COLS)
for label, metric, engine, fam in HOME:
    eid = '' if engine.startswith('derived') else nid(fam,'E')
    ws.append([nid('HM','M'), 'Home', 'NA', label, metric, engine, eid, '', 'Yes', 'VERIFIED 2026-08-22'])

# ---- the other parent tabs: every screen listed, nothing claimed
for tab in ['networth','performance','plan','cashflow','menu']:
    ws = sheet(tab, COLS)
    if tab == 'menu':
        routes = sorted(r for r in nav['routes'] if r not in nav['reach'] and r not in TABS)
    else:
        parent_route = [k for k,v in TABS.items() if v==tab][0]
        routes = [parent_route] + screens_for(tab)
    for r in routes:
        comp = nav['routes'].get(r,'')
        ws.append(['', PARENTS[tab], 'NA' if r in TABS else r, '', '', '', '', '', '', 'NOT STARTED — screen not yet read'])

# ---- inputs
ws = sheet('inputs', INPUT_COLS)
ws.append(['', '', '', '', '', 'NOT STARTED — filled as each screen is read'])


# ---- Specification: what a row must carry before its calculation can be written
SPEC = [
 ('SECTION — WHAT THE NUMBER IS', ''),
 ('The formula', 'The actual rules in plain English, followable by hand. Nothing in the index tabs carries it.'),
 ('The inputs, one by one', 'Every input named separately, with its unit, and where it comes from: the person typed it, an institution download, a connected provider, or another engine.'),
 ('The decisions and assumptions applied', 'Rounding, timing conventions, inflation, which balance is used, which date wins. Each labelled with whose decision it was — the founder\'s, the person\'s, or built in. This is the fourth link of objective 4.'),
 ('What comes out', 'Dollars, a percentage, a date, a count or a range; its unit and its rounding.'),
 ('What it says when it cannot be computed', 'The exact refusal. This is where wrong numbers get invented, so the refusal is part of the specification, not an afterthought.'),
 ('The grain', 'Whether the figure is per holding, per account, per person or per household. Without it a total and a single line look identical.'),
 ('The period', 'As of when, and over what window — this month, twelve months, since the person owned it.'),
 ('SECTION — WHAT PROVES IT', ''),
 ('Worked examples', 'These inputs give this answer. Rung 2 re-runs them through the real engine on every build.'),
 ('An example for every case', 'One per case the grid names: input missing, input degraded, a different shape per institution, time-bounded, related events, account type. This is rung 3, the floor for every calculation.'),
 ('Verification level', 'Whether this engine is marked for rung 4 (the written formula made executable and checked against the code on generated inputs) and rung 5 (laws that must hold for every input). Marked by the founder, recommended by me.'),
 ('SECTION — WHAT CONNECTS IT', ''),
 ('Which engines feed this engine', 'The engines it depends on. Without this, build order and the one-door design cannot be worked out — a metric points at an engine today, but engines do not point at each other.'),
 ('Where it is implemented', 'The file and function that carry it, so file and code can be checked against each other on every build.'),
 ('SECTION — GOVERNANCE', ''),
 ('The founder\'s verdict', 'His approval of the row. A row counts as documented only when he has approved it, so without this column the coverage count is meaningless.'),
 ('Lifecycle', 'Live, cut, or superseded by another identifier. Identifiers are never reused, so a retired one must say what replaced it.'),
]
ws = sheet('Specification', ['What is needed','Why it is needed, and whether the file carries it today'])
for a,b in SPEC:
    ws.append([a,b])
    if a.startswith('SECTION'):
        ws.cell(ws.max_row,1).font=Font(bold=True, color='1F3864')
ws.column_dimensions['A'].width=42; ws.column_dimensions['B'].width=118
for r in range(2, ws.max_row+1):
    ws.cell(r,2).alignment=Alignment(wrap_text=True, vertical='top')

# ---- Reference
ws = sheet('Reference', ['Item','Detail'])
ref = [
 ('Date file created', TODAY),
 ('Date file last modified', TODAY + '  (stamped by the build, not typed; unchanged when the file is only read)'),
 ('Objective of this file',
  'One row for every figure a person reads on screen, tied to the metric behind it, the engine that '
  'produces it, and the identifier that joins them — so a wrong number can be traced from the label '
  'on screen to its engine and formula in a minute. Serves objectives 3 and 4.'),
 ('', ''),
 ('TAB — Specification', 'Everything a row must carry before its calculation can be written in code. The index tabs say what exists and where it is shown; this tab says what is still needed to say what each number IS.'),
 ('TAB — Reference', 'This tab. What the file is, what each tab holds, what each column means, and what it must comply with.'),
 ('TAB — multiple_screens', 'Figures shown on more than one parent screen. A figure lives here ONCE, with every screen and every label it wears listed, so the same figure can never have two definitions.'),
 ('TAB — home', 'Figures shown only on Home and the screens reached from it.'),
 ('TAB — networth', 'Figures shown only on Net worth and the screens reached from it.'),
 ('TAB — performance', 'Figures shown only on Performance and the screens reached from it.'),
 ('TAB — plan', 'Figures shown only on Plan and the screens reached from it.'),
 ('TAB — cashflow', 'Figures shown only on Cash flow and the screens reached from it.'),
 ('TAB — menu', 'Screens reachable only from the menu, and the figures on them.'),
 ('TAB — inputs', 'The raw values the engines need before any calculation happens.'),
 ('', ''),
 ('COLUMN — Metric ID', 'The identifier of the figure, per moneykeel_naming_spec_unique-identifier_v01.md. Given once, never changed, never reused.'),
 ('COLUMN — Parent Screen Name', 'One of: Home, Networth, Performance, Cashflow, Plan, Menu. Menu means reachable only from the menu.'),
 ('COLUMN — Secondary Screen Name', 'The screen reached from the parent, or NA when the figure is on the parent screen itself.'),
 ('COLUMN — Name on Screen', 'The label copied exactly as it is worded on screen, including capitals. Where a figure wears different labels on different screens, all are listed.'),
 ('COLUMN — Name of Underlying Metric', "The metric's name in the code."),
 ('COLUMN — Name of Underlying Engine', 'The engine that produces the figure. NOT IN OLD MASTER means the engine exists in the code but has no row in the old master file.'),
 ('COLUMN — Engine ID', 'The identifier of that engine. Blank where the figure is worked out on the screen itself rather than by an engine — which is itself a finding.'),
 ('COLUMN — Your name for it (72-metric file)', "The founder's own name for the same figure, from METRICS-DELIVERABLE-ANSWERED-2026-08-20.xlsx. This column is the bridge between his vocabulary and the code's."),
 ('COLUMN — Core screen?', 'Whether the screen is part of the 55-70 core, the agreed first scope.'),
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
 ('COVERAGE — screens read so far', '1 of 49 (Home)'),
 ('COVERAGE — what that means', 'Every screen in the app is listed on its tab. Only Home carries figures so far; the rest are marked NOT STARTED. A rising count is not completeness while screens remain unread.'),
]
for a,b in ref: ws.append([a,b])
ws.column_dimensions['A'].width=46; ws.column_dimensions['B'].width=118
for r in range(2, ws.max_row+1):
    ws.cell(r,1).font=Font(bold=True); ws.cell(r,2).alignment=Alignment(wrap_text=True, vertical='top')

for name in wb.sheetnames:
    if name=='Reference': continue
    w=wb[name]
    for i,col in enumerate(COLS if name!='inputs' else INPUT_COLS, start=1):
        w.column_dimensions[get_column_letter(i)].width = max(14, min(42, len(col)+8))

wb._sheets = [wb[n] for n in TAB_ORDER if n in wb.sheetnames]
os.makedirs(os.path.dirname(OUT), exist_ok=True)
wb.save(OUT)
print("wrote", OUT)
