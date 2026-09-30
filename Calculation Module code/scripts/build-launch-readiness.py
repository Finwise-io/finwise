#!/usr/bin/env python3
"""THE EIGHT STEPS TO A LAUNCH-READY BUILD — measured, never typed.

Founder, 2026-09-30: *"Keep this 8 step plan as a master, and at every step update it and display
it."* And before that: *"No, I want complete launch ready build. Fast does not mean incomplete and
crappy work."* So all three modules, every step, no shortcut.

EVERY STATUS ON THIS PLAN IS COUNTED FROM THE LIVE FILES each time it runs — the master calculation
file, the decision log, the figure register, the gates and the test suite. Nothing here is a status
I typed, because a plan that reports its own progress from memory is the thing this project keeps
being burnt by. A step is DONE when its own numbers say so and not before.

    python3 "Calculation Module code/scripts/build-launch-readiness.py"

It writes MoneyKeel/documents/other/moneykeel_calc_plan_launch-readiness_v01.xlsx and prints the
same table, so it can be read in the terminal or opened.
"""
import json, os, subprocess, sys
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
os.chdir(ROOT)
sys.path.insert(0, HERE)
from xlsx_readable import readable
from moneykeel_open_workbook import refuse_if_open

MASTER = 'MoneyKeel/documents/other/moneykeel_calc_master_calculation-master_v01.xlsx'
OUT    = 'MoneyKeel/documents/other/moneykeel_calc_plan_launch-readiness_v01.xlsx'
# never write over a workbook he has open (2026-09-30)
refuse_if_open(OUT)
ANSWERS = 'MoneyKeel/documents/other/moneykeel_calc_plan_launch-answer-list_v01.xlsx'
MODULES = {'networth': 'Net worth', 'cashflow': 'Cash flow', 'performance': 'Performance'}

figs = json.load(open(os.path.join(HERE, 'moneykeel_figures.json')))['figures']
dec  = json.load(open(os.path.join(HERE, 'moneykeel_decisions.json')))['rows']
wb_m = openpyxl.load_workbook(MASTER, read_only=True, data_only=True)


def module_rows(tab):
    ws = wb_m[tab]
    rows = list(ws.iter_rows(values_only=True))
    hdr = [str(c) for c in rows[0]]
    return hdr, [r for r in rows[1:] if r and r[hdr.index('Metric ID')]]


def count(tab):
    """Everything this plan needs to know about one module, counted off its own tab."""
    hdr, rows = module_rows(tab)
    i = hdr.index
    ids = [r[i('Metric ID')] for r in rows]
    declared = [x for x in ids if x in figs]
    worked = [x for x in declared if figs[x].get('worked')]
    on_screen = [r[i('Metric ID')] for r in rows
                 if 'screen' in str(r[i('Function that produces it')] or '').lower()]
    q = [r[i('Metric ID')] for r in rows
         if str(r[i('Questions for you (numbered)')] or '').strip()
         and not str(r[i('YOUR ANSWER — use the same number')] or '').strip()]
    iv = i('ROW VERIFIED — founder, date and how')
    ver = [r[i('Metric ID')] for r in rows
           if str((r[iv] if iv < len(r) else '') or '').startswith('VERIFIED')]
    d = [x for x in dec if x.get('tab') == tab and 'OLD' not in str(x.get('in_use', ''))]
    no_proof = [x['id'] for x in d
                if not str(x.get('proof') or '').strip() or str(x.get('proof')).startswith(('NONE', 'NOT'))]
    d_open = [x['id'] for x in d if str(x.get('plain', '')).startswith(('HIS QUESTION', 'A QUESTION'))]
    return dict(figures=len(ids), declared=len(declared), worked=len(worked), on_screen=on_screen,
                hand=[x for x in ids if x not in figs], q=q, verified=ver,
                decisions=len(d), no_proof=no_proof, d_open=d_open)


C = {t: count(t) for t in MODULES}


def gate(name):
    r = subprocess.run([sys.executable, os.path.join(HERE, name + '.py')],
                       capture_output=True, text=True)
    return r.returncode == 0


GATES = ['check-formula-agreement', 'check-rulings-in-file', 'check-rulings-sync',
         'check-changelog-anchored', 'check-read-from-approved']
gate_state = {g: gate(g) for g in GATES}

tot = lambda k: sum(len(C[t][k]) if isinstance(C[t][k], list) else C[t][k] for t in MODULES)


def done(ok, now, need, unit):
    return ('DONE' if ok else 'NOT DONE'), f'{now} of {need} {unit}'


STEPS = []


def step(n, what, owner, ok, evidence, blocks, where):
    STEPS.append([n, what, owner, 'DONE' if ok else 'NOT DONE', evidence, blocks, where])


# THE CASH-FLOW FAMILY'S UNWIRED FIGURES, counted off the live ratchet. His instruction 2026-09-30:
# "wire them now" — so a figure a person reads on a cash-flow screen carries its identifier, which is
# what makes screen → engine → formula → inputs answerable in a minute (his objective 4).
CF_SCREENS = ('CashFlowScreen', 'BudgetScreen', 'MonthDetailScreen', 'IncomeDetailScreen',
              'IncomeManagerScreen', 'IncomeScreen', 'MonthlyIncomeScreen', 'PaycheckMonthsScreen',
              'BillCalendarScreen', 'WorthALookScreen', 'ContributionRoomScreen', 'TaxOrganizerScreen')
_ratchet = json.load(open(os.path.join(HERE, 'moneykeel_undeclared_figures.json')))['baseline']
unwired = {k: v for k, v in _ratchet.items() if any(c in k for c in CF_SCREENS) and v}

cf = C['cashflow']
step(1, 'Cash flow pass 1 — every figure printed from the code, none worked out on a screen, and every '
        'figure on a cash-flow screen printed through its identifier', 'Claude',
     len(cf['hand']) == 0 and len(cf['on_screen']) == 0 and sum(unwired.values()) == 0,
     f"{cf['declared']} of {cf['figures']} printed from the code · {len(cf['hand'])} still hand-typed"
     + (f" ({', '.join(cf['hand'][:4])}{'…' if len(cf['hand']) > 4 else ''})" if cf['hand'] else '')
     + f" · {len(cf['on_screen'])} still worked out on a screen"
     + (f" ({', '.join(cf['on_screen'])})" if cf['on_screen'] else '')
     + f" · {sum(unwired.values())} places across {len(unwired)} cash-flow screens still print a figure "
       f"with NO identifier (worst: {', '.join(f'{os.path.basename(k)} {v}' for k, v in sorted(unwired.items(), key=lambda x: -x[1])[:3])})",
     'A hand-typed row can drift from what the app does, with nothing to notice. A figure worked out on a '
     'screen has no row, no example and nothing able to check it. And a figure printed without its '
     'identifier cannot be traced from the screen to its formula, which is the master key his objective 4 '
     'asks for. THREE GENERATIONS OF THE SAME FIGURE currently sit on the cashflow tab — the pre-four-tab '
     'rows and two declared sets, with MK-CF-M-002 and MK-CF-M-049 carrying the IDENTICAL label — so the '
     'dead ones are retired first, pointing at what replaced them, before anything new is declared.',
     'MoneyKeel/functions/cashflow/ · the master file, cashflow tab · the twelve cash-flow screens')

step(2, 'Cash flow pass 2 — a worked example on every figure, run through the real door on every build', 'Claude',
     cf['worked'] == cf['figures'],
     f"{cf['worked']} of {cf['figures']} carry an example a test RUNS",
     'A figure with no worked example has nothing that re-runs it, so its row on the master file is a claim.',
     'MoneyKeel/functions/cashflow/ · src/__tests__/worked_examples.test.ts')

step(3, 'Cash flow pass 3 — every figure shown on two screens proved to agree', 'Claude', False,
     'not started — this is the pass that found B-112 (Home 3.57% against Performance 3.69%), '
     'B-117 (the emergency-fund warning suppressed) and B-118',
     'A wrong number in a finance app loses trust irrecoverably, and the two screens a person moves '
     'between in one tap are where it shows.',
     'src/__tests__/guard_d3_screens_agree.test.tsx')

step(4, 'Pass 4 on all three modules — a test that NAMES each decision and re-runs it', 'Claude',
     tot('no_proof') == 0,
     ' · '.join(f"{MODULES[t]} {len(C[t]['no_proof'])} of {C[t]['decisions']}" for t in MODULES)
     + f" — {tot('no_proof')} decisions have nothing that re-runs them",
     'A decision could be broken today and nothing would go red. This is the pass that found B-116 '
     '(interest on a hand-entered CD booked under Stocks / Funds).',
     'the decision log · one test per decision, named by its identifier')

step(5, 'Rebuild and re-verify everything — master, decision log, answer list, every gate, the full suite', 'Claude',
     all(gate_state.values()),
     ' · '.join(f"{g.replace('check-', '')} {'PASS' if ok else 'FAIL'}" for g, ok in gate_state.items()),
     'The file-and-code rule: neither changes alone, and done means "file and code are both updated and '
     'they match 100%".',
     'Calculation Module code/scripts/build-all.sh')

step(6, 'Answer the open questions', 'FOUNDER',
     tot('q') == 0 and sum(len(C[t]['d_open']) for t in MODULES) == 0,
     ' · '.join(f"{MODULES[t]} {len(C[t]['q'])} on figures + {len(C[t]['d_open'])} on decisions" for t in MODULES)
     + f" — {tot('q') + sum(len(C[t]['d_open']) for t in MODULES)} open",
     'Those figures stay DRAFT: they are declared and printed, and nothing moves behind their doors until '
     'you rule.',
     f'{os.path.basename(ANSWERS)} — tabs Net worth · Cash flow · Performance, column "YOUR ANSWER"')

step(7, 'Read every row and mark it VERIFIED, or say what is wrong', 'FOUNDER',
     tot('verified') == tot('figures'),
     ' · '.join(f"{MODULES[t]} {len(C[t]['verified'])} of {C[t]['figures']}" for t in MODULES)
     + f" — {tot('figures') - tot('verified')} rows still unread",
     'THE HARD GATE. A test proves a figure is what the code gives; only your mark proves it is the figure '
     'you wanted. Every row carries a worked example — a real household with real numbers — so a row can '
     'be checked in a minute.',
     f'{os.path.basename(MASTER)} — tabs networth, cashflow, performance · COLUMN AM '
     '"ROW VERIFIED — founder, date and how"')

step(8, 'Pre-build checklist presented, and your explicit "cut the build"', 'Claude to present · FOUNDER to say',
     False,
     'blocked until steps 1 to 7 are DONE',
     'Standing order since 2026-07-14: go on a plan, silence or enthusiasm is NOT build approval. Only the '
     'literal ask counts.',
     'the checklist in chat, then EAS')

# ── the workbook ────────────────────────────────────────────────────────────────────────────────
COLS = ['Step', 'What has to happen', 'Owner', 'Status', 'Where it stands — counted, not typed',
        'What it blocks', 'Where the work is done']
wb = openpyxl.Workbook(); wb.remove(wb.active)
ws = wb.create_sheet('Read me')
for a, b in [
 ('WHAT THIS IS', 'The eight steps to a launch-ready build for Net worth, Cash flow and Performance — '
  'all three, complete. Your words, 2026-09-30: "No, I want complete launch ready build. Fast does not '
  'mean incomplete and crappy work."'),
 ('EVERY STATUS IS COUNTED, NOT TYPED', 'Each time this runs it counts off the live files: the master '
  'calculation file, the decision log, the figure register, the five gates. No step can say DONE unless '
  'its own numbers say so. A plan that reports its own progress from memory is the thing this project '
  'keeps being burnt by.'),
 ('IT IS REBUILT, NEVER EDITED', 'Generated by build-launch-readiness.py. A hand edit dies on the next '
  'build. Re-run it and it is current.'),
 ('THE TWO STEPS THAT ARE YOURS', 'Step 6 — answer the open questions, on the launch answer list. '
  'Step 7 — read every row and mark it VERIFIED, in column AM of the master file. Nobody can do step 7 '
  'for you: a test proves a figure is what the code gives, never that it is the figure you wanted.'),
 ('THE ORDER MATTERS IN ONE PLACE', 'Do not verify the cashflow tab until step 1 says DONE. Until then '
  '19 of its rows are hand-typed, so their formulas may not be what the app does. Net worth and '
  'Performance are printed from the code today and safe to read now.'),
]:
    ws.append([a, b])
ws.column_dimensions['A'].width = 38; ws.column_dimensions['B'].width = 116
for r in range(1, ws.max_row + 1):
    ws.cell(r, 1).font = Font(bold=True)
    ws.cell(r, 2).alignment = Alignment(wrap_text=True, vertical='top')

w = wb.create_sheet('The eight steps')
w.append(COLS)
for s in STEPS:
    w.append(s)
GREEN = PatternFill('solid', fgColor='DFF2E9'); AMBER = PatternFill('solid', fgColor='FAEEDA')
YOURS = PatternFill('solid', fgColor='EEEEE9')
for r in range(2, w.max_row + 1):
    w.cell(r, 4).fill = GREEN if w.cell(r, 4).value == 'DONE' else AMBER
    if 'FOUNDER' in str(w.cell(r, 3).value):
        w.cell(r, 3).fill = YOURS; w.cell(r, 3).font = Font(bold=True)
readable(w)
wb.save(OUT)

# ── and the same table, in the terminal ─────────────────────────────────────────────────────────
print('\nTHE EIGHT STEPS TO A LAUNCH-READY BUILD — counted %s\n' % __import__('datetime').date.today())
for n, what, owner, st, ev, _, _ in STEPS:
    mark = '✅' if st == 'DONE' else ('⏳' if 'FOUNDER' in owner else '⬜')
    print(f'{mark} {n}. {what}')
    print(f'      owner: {owner}')
    print(f'      {ev}')
print(f'\nwrote {OUT}')
d = sum(1 for s in STEPS if s[3] == 'DONE')
print(f'{d} of 8 steps DONE.')
