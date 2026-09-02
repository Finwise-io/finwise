"""Write the identifier header above every function in the calculation code (S21).

    python3 "Calculation Module code/scripts/write-headers.py"           # write them
    python3 "Calculation Module code/scripts/write-headers.py" --check   # the guard: fail if any
                                                                         # header is not what this
                                                                         # would write
Run from the repository root.
"""
import json, os, sys, collections, importlib.util as il
import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
def _mod(name):
    sp = il.spec_from_file_location(name, os.path.join(HERE, name + '.py'))
    m = il.module_from_spec(sp); sp.loader.exec_module(m); return m

fn   = _mod('moneykeel_functions')
hdr  = _mod('moneykeel_headers')
inp  = _mod('moneykeel_inputs')

MASTER = 'MoneyKeel/documents/other/moneykeel_calc_master_calculation-master_v01.xlsx'
CHECK  = '--check' in sys.argv

rows = fn.with_ids_and_chains()
wb   = openpyxl.load_workbook(MASTER, data_only=True)

bodies = {}
where  = collections.defaultdict(list)
for root in inp.CALC_ROOTS:
    for dp, _, fs in os.walk(root):
        if '__tests__' in dp: continue
        for f in fs:
            if not f.endswith(('.ts', '.tsx')) or '.test.' in f: continue
            path = os.path.join(dp, f)
            for n, line, sig, body, note in fn.bodies(path):
                bodies.setdefault(n, body)
                where[path].append((n, line))

# the objective as the master file states it, so the header and the spreadsheet cannot differ
_ow = {}
_fh = [str(c.value) for c in wb['functions_from_code'][1]]
_oi = _fh.index('Objective — what this function is for')
for _r in wb['functions_from_code'].iter_rows(min_row=3, values_only=True):
    if _r[1] and _r[_oi] and not str(_r[_oi]).startswith('NOT DETERMINED'):
        _ow[_r[1]] = str(_r[_oi]).strip()
# The FILE only — never the line. Inserting a header moves every line below it, so a line number
# printed here changes on the next run and the guard reports a difference that is not one.
_sites = {n: v for n, v in ((n, sorted({p for p, fs in where.items() for nm, _ in fs if nm == n}))
                            for n in {nm for fs in where.values() for nm, _ in fs}) if len(v) > 1}
data = hdr.gather(rows, wb, inp.readers(bodies), {r['name']: r['id'] for r in rows}, _ow, _sites)
meta = {r['name']: {'id': r['id'], 'name': r['name'], 'category': r['category']} for r in rows}
payload = {n: {'meta': meta[n], 'data': data[n]} for n in data if n in meta}

cache = json.load(open(hdr.CACHE)) if os.path.exists(hdr.CACHE) else {}
touched, checked = [], 0
for path, funcs in sorted(where.items()):
    changed = hdr.apply_to_file(path, funcs, payload, cache, dry=CHECK)
    checked += len([f for f in funcs if f[0] in payload])
    if changed: touched.append(path)
json.dump(cache, open(hdr.CACHE, 'w'), indent=0)

if CHECK:
    if touched:
        print('BUILD STOPPED — %d file(s) carry a header that is not what the generator would '
              'write. A header is a printed view, never a source: edit the master file or the '
              'code, then re-run write-headers.py.' % len(touched))
        for p in touched: print('   ' + p)
        raise SystemExit(1)
    print('headers: all %d match what the generator would write' % checked)
else:
    print('headers written: %d functions across %d file(s) changed' % (checked, len(touched)))
