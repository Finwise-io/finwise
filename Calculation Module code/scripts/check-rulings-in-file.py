"""Guard: a FILE-ONLY decision is proved the same way a code decision is — by a check that fails if it
comes back. Each decision in the DECISION LOG may carry `expect`: a list of
{tab, key, col, contains | not_contains}, read against the master file on disk after every build.
Founder question 2026-09-12 ("#6 — why not tested?"): a corrected row with no check was a claim.

RE-POINTED 2026-09-28 from moneykeel_rulings.json to moneykeel_decisions.json, on his instruction that
the decision log is the one master source for every decision and the `rulings` tab comes off the
calculation master. The 38 checks came across with their decisions; the enforcement is unchanged, only
the file it reads them from. A gate was re-pointed here, never dropped.
"""
import json, os, sys, openpyxl
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
M = os.path.join(ROOT, 'MoneyKeel/documents/other/moneykeel_calc_master_calculation-master_v01.xlsx')
L = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'moneykeel_decisions.json')
KEYCOL = {'functions_from_code': 'Function ID', 'inputs': 'Input ID', 'Specification': 'No.', 'Reference': 'Item'}

wb = openpyxl.load_workbook(M, read_only=True)
_cache = {}
def sheet(tab):
    if tab not in _cache:
        rows = list(wb[tab].iter_rows(values_only=True)); h = [str(x) for x in rows[0]]
        _cache[tab] = (h, rows[1:])
    return _cache[tab]
def cell(tab, key, col):
    h, rows = sheet(tab); kc = KEYCOL.get(tab, 'Metric ID')
    for r in rows:
        if r and str(r[h.index(kc)]) == key:
            if col not in h: return None
            return str(r[h.index(col)] or '')
    return None

failures = []; checked = 0
for e in json.load(open(L))['rows']:
    for x in e.get('expect', []):
        checked += 1
        v = cell(x['tab'], x['key'], x['col'])
        if v is None: failures.append(f"{e['id']}: row {x['key']} or column {x['col']!r} not found on {x['tab']}"); continue
        for want in x.get('contains', []):
            if want not in v: failures.append(f"{e['id']}: {x['tab']} · {x['key']} · {x['col']} does not contain {want!r}")
        for bad in x.get('not_contains', []):
            if bad in v: failures.append(f"{e['id']}: {x['tab']} · {x['key']} · {x['col']} still contains {bad!r}")
print(f'rulings in the file — {checked} expectations checked')
for f in failures: print('  FAIL', f)
if failures: sys.exit(1)
print('  every expectation holds.')
