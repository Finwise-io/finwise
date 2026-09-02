"""S18 — the reconciliation engine.

Checks the calculation master against itself, in both directions, and FAILS rather than reports.
Two records are kept independently on purpose: agreement by construction would hide the failure
that matters, an input an engine reads that nobody ever captured. So this is the gate that catches
the orphan instead.

Run on its own:   python3 "Calculation Module code/scripts/moneykeel_reconcile.py"
It also runs at the end of every build of the master file, and stops the build on any break.
"""
import re, sys, os, openpyxl

MASTER = 'MoneyKeel/documents/other/moneykeel_calc_master_calculation-master_v01.xlsx'
SCREEN_TABS = ('multiple_screens','home','networth','performance','plan','cashflow','menu')
# A4, fixed 2026-08-26. This class read [MEIDS] — it carried the RETIRED type E and had no F,
# so no function identifier was ever matched and check 4 below could not fire. It had never
# once run. E is kept only so a row on engines-old-tab can still be recognised.
ID = re.compile(r'MK-[A-Z]{2}-[MFEIDS]-\d{3}')


def check(path=MASTER):
    wb = openpyxl.load_workbook(path)
    head = {t: [c.value for c in wb[t][1]] for t in SCREEN_TABS}
    col = lambda t, name: head[t].index(name)

    metric_ids, function_ids, rows = set(), set(), []
    known_functions = {r[0] for r in wb['functions_from_code'].iter_rows(min_row=3, values_only=True) if r[0]}
    for t in SCREEN_TABS:
        for r in wb[t].iter_rows(min_row=2, values_only=True):
            if not r[0]:
                continue
            rows.append((t, r))
            metric_ids.add(r[0])
            fid = r[col(t, 'Function ID')]
            if fid:
                function_ids |= set(ID.findall(str(fid)))
    function_ids |= known_functions

    input_ids = {r[0] for r in wb['inputs'].iter_rows(min_row=2, values_only=True) if r[0]}
    breaks = []   # structural: the file does not hold together. Stops the build.
    open_ = []    # findings: real, unresolved, and counted every build until they are zero.

    # 1. no identifier is used twice
    seen = set()
    for t, r in rows:
        if r[0] in seen:
            breaks.append('DUPLICATE IDENTIFIER — %s appears more than once' % r[0])
        seen.add(r[0])

    # 2. every input an engine names exists on the inputs tab; nothing is an orphan
    for t, r in rows:
        cell = str(r[col(t, 'Inputs it needs')] or '')
        # A11, fixed 2026-08-26. This looked for 'NO INPUT ID', which appears nowhere in the
        # file; the builder writes 'NOT DETERMINED' and '[NOT AN INPUT'. It had never fired either.
        if cell.startswith('NOT DETERMINED'):
            open_.append('NO INPUT LIST — %s records no input at all, so nothing can be traced to '
                         'a raw value' % r[0])
        elif 'NO INPUT ID' in cell:
            open_.append('ORPHAN INPUT — %s names an input that is on no row of the inputs tab' % r[0])
        elif '[NOT AN INPUT' in cell and not ID.search(cell):
            open_.append("NOT AN INPUT — %s lists only another function's answer where its raw "
                         'inputs should be' % r[0])
        for iid in set(ID.findall(cell)):
            if iid.startswith('MK-XS-I-') and iid not in input_ids:
                breaks.append('UNKNOWN INPUT — %s names %s, which no row of the inputs tab defines' % (r[0], iid))

    # 3. every input declared is named by at least one engine — the dead entry
    named = set()
    for t, r in rows:
        named |= set(ID.findall(str(r[col(t, 'Inputs it needs')] or '')))
    for iid in sorted(input_ids - named):
        open_.append('DEAD INPUT — %s is declared on the inputs tab and no engine names it' % iid)

    # 4. every engine identifier a dependency names must exist
    for t, r in rows:
        for fid in set(ID.findall(str(r[col(t, 'Dependency — function ID → the output it uses')] or ''))):
            if '-F-' in fid and fid not in function_ids:
                breaks.append('UNKNOWN FUNCTION — %s depends on %s, which is in no function row' % (r[0], fid))

    # 5. a folded duplicate must point at an identifier that exists
    for t, r in rows:
        cell = str(r[col(t, 'Same figure as (S16)')] or '')
        if cell.startswith('THE SAME FIGURE AS'):
            target = ID.search(cell)
            if not target or target.group(0) not in metric_ids:
                breaks.append('BROKEN FOLD — %s says it is the same figure as an identifier that does not exist' % r[0])

    # 6. every question number is unique and lands on a row
    qs = []
    for t, r in rows:
        qs += re.findall(r'Q\d\d', str(r[col(t, 'Questions for you (numbered)')] or ''))
    for q in sorted({q for q in qs if qs.count(q) > 1}):
        breaks.append('QUESTION USED TWICE — %s appears on more than one row' % q)

    return breaks, open_, {'figures': len(rows), 'inputs': len(input_ids), 'functions': len(function_ids)}


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    breaks, open_, counts = check()
    print('reconciliation — %(figures)s figures, %(inputs)s inputs, %(functions)s functions' % counts)
    print('structural breaks: %d   open findings: %d' % (len(breaks), len(open_)))
    for b in breaks: print('  BREAK  ' + b)
    for o in open_: print('  OPEN   ' + o)
    if breaks:
        sys.exit(1)
    print('\nThe file holds together. The open findings above are real and unresolved — '
          'they are counted on every build until they reach zero.')
