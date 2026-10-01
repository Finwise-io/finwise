#!/usr/bin/env python3
"""EVERY FUNCTION OF A MODULE, BY IDENTIFIER, WITH THE TEST THAT PINS IT — his step 3.c.

    python3 "Calculation Module code/scripts/build-nw-function-tests.py" NW

Writes src/__tests__/nw_function_trace.test.ts, which is a PRINTOUT of the code: the identifier, the
file that DECLARES it, and a test that exercises that file.

Objective 3 of the calculation module, in his words: *an architecture that lets anyone trace a wrong
number to its engine and formula in one minute.* One minute is one hop. Running his seven steps on
2026-10-01 showed the trace worked in one direction only — from a figure you could reach its proof,
and from a function identifier you could reach nothing, because every test names the FIGURES it checks.

THE DECLARING FILE, NOT THE FIRST FILE THAT MENTIONS IT. The first version of this took whichever file
contained the identifier first, and landed on a generated header's "Reaches" list: it reported
MK-NW-F-043 saveAssets as living in firestore.ts, which only names it in a comment, and then reported
it as untested. The function is declared in src/domain/assets/index.ts and is covered. The identifier's
own header rule — the line the header writer emits directly above the function — is what marks the
declaring file, so that is what is matched.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
os.chdir(ROOT)
FAM = (sys.argv[1] if len(sys.argv) > 1 else 'NW').upper()
IDRE = re.compile(r'MK-' + FAM + r'-F-\d{3}')

src_files, test_files = [], []
for d in ('src', 'MoneyKeel/functions', 'Calculation Module code/engines'):
    for dp, dn, fn in os.walk(d):
        if 'node_modules' in dp:
            continue
        for f in fn:
            if not f.endswith(('.ts', '.tsx')):
                continue
            p = os.path.join(dp, f)
            (test_files if '.test.' in f else src_files).append(p)
for dp, dn, fn in os.walk('Calculation Module code'):
    for f in fn:
        if '.test.' in f and f.endswith(('.ts', '.tsx')):
            test_files.append(os.path.join(dp, f))

read = lambda p: open(p, encoding='utf8', errors='ignore').read()
declares, mentions = {}, {}
for p in src_files:
    t = read(p)
    # the header rule the generator emits directly above the function it describes
    for i in set(re.findall(r'/\*\s*─\s*(MK-' + FAM + r'-F-\d{3})\s*─', t)):
        declares.setdefault(i, p)
    for i in set(IDRE.findall(t)):
        mentions.setdefault(i, p)

tb = {p: read(p) for p in test_files}
out = {}
for i in sorted(set(declares) | set(mentions)):
    srcp = declares.get(i) or mentions[i]
    stem = os.path.basename(srcp).replace('.tsx', '').replace('.ts', '')
    hits = []
    for p, b in tb.items():
        if re.search(r'from\s+[\'"][^\'"]*' + re.escape(stem) + r'[\'"]', b):
            hits.append(p)
        elif stem == 'index':
            folder = os.path.basename(os.path.dirname(srcp))
            if re.search(r'from\s+[\'"][^\'"]*' + re.escape(folder) + r'[\'"/]', b):
                hits.append(p)
    out[i] = {'source': srcp, 'declared': i in declares, 'tests': sorted(set(hits))}

json.dump(out, open(os.path.join(HERE, f'moneykeel_{FAM.lower()}_function_tests.json'), 'w',
                    encoding='utf8'), indent=1, ensure_ascii=False)
rows = '\n'.join(f"  ['{i}', '{v['source']}', '{(v['tests'] or [''])[0]}'],"
                 for i, v in sorted(out.items()))
tpl = read(os.path.join(HERE, 'nw_function_trace.template.ts')) if os.path.exists(
    os.path.join(HERE, 'nw_function_trace.template.ts')) else None
print(f'{FAM}: {len(out)} functions · {sum(1 for v in out.values() if v["declared"])} found by their '
      f'own header rule · {sum(1 for v in out.values() if v["tests"])} with a covering test')
missing = [i for i, v in out.items() if not v['tests']]
if missing:
    print('   NO COVERING TEST:', ' '.join(missing))
open(os.path.join(HERE, f'.{FAM.lower()}_rows.txt'), 'w', encoding='utf8').write(rows)
