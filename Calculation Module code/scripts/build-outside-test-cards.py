#!/usr/bin/env python3
"""THE PACK AN OUTSIDE MODEL IS GIVEN TO WRITE TEST CASES FROM — one card per function.

Why this exists (founder, 2026-10-04): the functions passed every test I wrote and five were still
wrong, because the tests came from the same understanding as the code. The cases have to come from
outside. This prints what an outside model needs to write them — what each function is FOR, what it
is handed, the figures it feeds and the rules it must follow — and deliberately nothing of how it
works: no function body, no formula, no worked answer.

Read from the code and the records on every run; nothing here is typed from memory except the
approved-drawing households, whose sums are re-checked below.

    python3 "Calculation Module code/scripts/build-outside-test-cards.py"
"""
import collections
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'MoneyKeel', 'documents', 'audit', 'outside-test-cases')
BRIEF = os.path.join(OUT, 'moneykeel_audit_brief_outside-test-cases_v02.md')
CODE_ROOTS = ['src', 'MoneyKeel/functions', 'Calculation Module code/engines']
FAMILIES = ('NW', 'PF', 'CF')                      # the three modules of this build (his scope, 2026-10-03)
PER_BATCH = {'orchestrator': 6, 'function': 15}    # a reply is five cases a card; these keep it inside one answer

J = lambda name: json.load(open(os.path.join(HERE, name), encoding='utf8'))

# ── the approved-drawing households: owner-approved numbers that add up on the page ─────────────
# Typed from the drawings; every sum is re-checked here, so a slip stops the build (briefs are code).
DRAWINGS = {
    'MK-NW-O-003': {
        'drawing': 'Net worth, Quiet Instrument v08, state A (approved 2026-09-14)',
        'household': 'Chase Checking $8,000 (a bank account). Vanguard Brokerage $349,333, of which $838 is uninvested cash and '
                     '$348,495 is stocks and funds. E*TRADE bonds and CDs $5,819. Home $450,000. '
                     'Debts: home mortgage $412,000, Chase Visa $6,000.',
        'drawn': {'Cash': 8838, 'Investments': 354314, 'Personal property': 450000, 'What you own': 813152,
                  'Debts': 418000, 'Net worth': 395152},
        'checks': [(8000 + 838, 8838), (348495 + 5819, 354314), (8838 + 354314 + 450000, 813152),
                   (412000 + 6000, 418000), (813152 - 418000, 395152)],
    },
    'MK-NW-O-008': {
        'drawing': 'Performance v17, phone 1 (approved 2026-10-01)',
        'household': 'Two linked accounts, record beginning Oct 1, 2025, read on Sep 30, 2026. All accounts: beginning market value '
                     '$100,000; contributions $15,000; withdrawals $0; dividends $1,800; interest $400; change in investment value '
                     '$5,800. Vanguard alone: beginning $80,000, contributions $15,000, wealth generated $6,000, ending $101,000. '
                     'E*TRADE alone: beginning $20,000, nothing added or taken out, wealth generated $2,000, ending $22,000.',
        'drawn': {'Wealth generated, all accounts': 8000, 'Ending market value, all accounts': 123000,
                  'E*TRADE return': '+10.00%',
                  'note': 'The drawing shows a yearly rate of 7.46% for all accounts and 6.88% for Vanguard, but does not give the '
                          'dates the $15,000 went in, so those two rates cannot be used as expected values.'},
        'checks': [(1800 + 400 + 5800, 8000), (100000 + 15000 - 0 + 8000, 123000), (80000 + 15000 + 6000, 101000),
                   (20000 + 2000, 22000), (101000 + 22000, 123000), (round(2000 / 20000 * 100, 2), 10.00)],
    },
    'MK-CF-O-001': {
        'drawing': 'Income end to end v07, frame 3 (approved 2026-09-02)',
        'household': 'Two wages, $138,000 a year together, so $11,500 gross in a month. Calculated federal tax $1,058 in the month. '
                     '401(k) contributions $1,200 in the month. No take-home entered by either earner.',
        'drawn': {'Take-home, household': 9242},
        'checks': [(138000 / 12, 11500), (11500 - 1058 - 1200, 9242)],
    },
    'MK-CF-O-002': {
        'drawing': 'Cash flow v01, frame C (approved 2026-09-28)',
        'household': 'Mortgage $2,000 and car loan $250, the same every month. Planned expenses: Gas $200, Grocery $900, '
                     'Utilities $200, Other $700. Spent so far: $500 entered by hand over 9 items, $1,200 imported from a card over '
                     '23 purchases. Paid this month and entered on the Debts tab: HELOC $200, credit card $200.',
        'drawn': {'Monthly recurring expenses': 2250, 'Planned expenses': 2000, 'Actual expenses, all sources': 2100},
        'checks': [(2000 + 250, 2250), (200 + 900 + 200 + 700, 2000), (500 + 1200 + 200 + 200, 2100)],
    },
    'MK-CF-O-004': {
        'drawing': 'Income end to end v07, frame 16 (approved 2026-09-02)',
        'household': 'Earner 1 entered a take-home of $5,000 in a month; gross $84,000 a year. Earner 2 entered $3,300; gross '
                     '$54,000 a year. Rent $1,800 a month with $600 of running costs. Interest and dividends $3,000 a year, left '
                     'where they are earned. Bonus $12,000, paid in December.',
        'drawn': {'Take-home in a usual month': 9500, 'What the year is taxed on': 167400},
        'checks': [(1800 - 600, 1200), (5000 + 3300 + 1200, 9500), (84000 + 54000 + 14400 + 3000 + 12000, 167400)],
    },
    'MK-CF-O-010': {
        'drawing': 'Cash flow v01, frame A (approved 2026-09-28)',
        'household': 'Take-home $5,000. Mortgage $2,000 and car loan $250 (the same every month). Budget for expenses $2,000. '
                     'HELOC payment $200 and credit card payment $200. So far this month: the mortgage is paid, the car loan is '
                     'not (due the 28th), $500 of expenses entered by hand, $1,200 imported from a card, and the HELOC and card '
                     'payments are made.',
        'drawn': {'Planned surplus': 350, 'Actual surplus so far': 900},
        'checks': [(5000 - 2000 - 250 - 2000 - 200 - 200, 350), (5000 - 2000 - 0 - 500 - 1200 - 200 - 200, 900)],
    },
    'MK-CF-O-018': {
        'drawing': 'Cash flow v01, frame for the Debts tab (approved 2026-09-28)',
        'household': 'Visa card $3,200 owed at 22.90%. Car loan $9,800 owed at 6.40%. Together they stood at $17,100 at the '
                     'first month-end recorded this year.',
        'drawn': {'Your debt': 13000, 'Paid down since January': 4100, 'Share of where you started': '24%'},
        'checks': [(3200 + 9800, 13000), (17100 - 13000, 4100), (round(4100 / 17100 * 100), 24)],
    },
}
DRAWINGS['MK-CF-O-003'] = DRAWINGS['MK-CF-O-010']   # the same month, asked of the function underneath


def live_headers():
    """Every function record in the three modules, read from the code: the record sits directly above
    its function, so the declaration that follows it is the function it describes."""
    out = []
    files = 0
    for root in CODE_ROOTS:
        for dp, _dn, fn in os.walk(os.path.join(ROOT, root)):
            if 'node_modules' in dp:
                continue
            for f in sorted(fn):
                if not f.endswith(('.ts', '.tsx')) or '.test.' in f:
                    continue
                files += 1
                path = os.path.join(dp, f)
                lines = open(path, encoding='utf8').read().split('\n')
                i = 0
                while i < len(lines):
                    m = re.match(r'^/\* ─ (MK-([A-Z]{2})-([FO])-\d{3}) ─.*?([123] · [A-Z]+)', lines[i])
                    if not m or m.group(2) not in FAMILIES:
                        i += 1
                        continue
                    j = i
                    while not lines[j].strip().endswith('*/'):
                        j += 1
                    k = j + 1
                    while k < len(lines) and lines[k].strip() == '':
                        k += 1
                    out.append({'id': m.group(1), 'family': m.group(2), 'category': m.group(4),
                                'name': lines[i + 1].lstrip(' *').strip(), 'path': os.path.relpath(path, ROOT),
                                'header': lines[i:j + 1], 'decl_at': k, 'lines': lines})
                    i = j + 1
    return out, files


def field(header, name):
    """One field of a record, with its continuation lines, as one string."""
    text, on = [], False
    for ln in header:
        m = re.match(r'^ \* ([A-Z][A-Za-z ]+?) \.{3,} ?(.*)$', ln)
        if m:
            on = m.group(1).strip() == name
            if on:
                text.append(m.group(2))
        elif on:
            if ln.strip() in ('*', '*/'):
                on = False
            else:
                text.append(ln.lstrip(' *').strip())
    return ' '.join(t for t in text if t).strip()


def _close(text, i, open_ch, close_ch):
    """Index of the bracket that closes the one at i."""
    depth = 0
    for k in range(i, len(text)):
        if text[k] == open_ch:
            depth += 1
        elif text[k] == close_ch:
            depth -= 1
            if depth == 0:
                return k
    return len(text) - 1


def signature(lines, at):
    """What the function is handed and gives back — its declaration, and NOT ONE CHARACTER of its body.

    The first version of this cut at the first line ending in "{" and so printed the bodies of every
    one-line function and of every function whose return type is written as { … } — 25 cards carried
    the code the outside model must never see. It is parsed properly now: the parameters by matching
    brackets, then the return type, where a "{" that follows a finished type is the body and one that
    starts a type is part of it.
    """
    text = '\n'.join(lines[at:at + 70])
    m = (re.match(r'(?:export )?(?:default )?(?:async )?function\s+[A-Za-z0-9_]+\s*(?:<[^>(]*>)?\s*\(', text)
         or re.match(r'(?:export )?const\s+[A-Za-z0-9_]+\s*(?::[^=]+)?=\s*(?:async\s*)?(?:<[^>(]*>)?\s*\(', text))
    if not m:
        return text.split('\n')[0].split('=')[0].strip()
    arrow = ' function' not in ' ' + text[:m.end()]
    close = _close(text, m.end() - 1, '(', ')')
    head, rest = text[:close + 1], text[close + 1:]
    k = 0
    while k < len(rest) and rest[k] in ' \t\n':
        k += 1
    out = ''
    if k < len(rest) and rest[k] == ':':
        last, j = ':', k + 1
        while j < len(rest):
            ch = rest[j]
            if arrow and rest[j:j + 2] == '=>':
                break
            if ch == '{':
                if last in ':|&,<([':            # a "{" that STARTS a type: an object type — take it whole
                    e = _close(rest, j, '{', '}')
                    j, last = e + 1, '}'
                    continue
                break                             # a "{" after a finished type: the body
            if ch in '(<[':
                closer = {'(': ')', '<': '>', '[': ']'}[ch]
                e = _close(rest, j, ch, closer)
                j, last = e + 1, closer
                continue
            if ch == ';' or (arrow and ch == '=' and rest[j:j + 2] != '=>'):
                break
            if not ch.isspace():
                last = ch
            j += 1
        out = rest[k:j].rstrip()
    return (head + out).strip()


BUILTIN = {'Date', 'Set', 'Map', 'Record', 'Promise', 'Array', 'Pick', 'Omit', 'Partial', 'String', 'Number', 'Boolean',
           'ReturnType', 'Readonly', 'Required', 'Math', 'Object', 'Dec'}


def types_named(sig, lines):
    """The app's own types a declaration names, spelled out where this file defines them — the type
    and nothing after it (the first version ran on into the function that followed)."""
    out = {}
    text = '\n'.join(lines)
    for t in sorted(set(re.findall(r'\b([A-Z][A-Za-z0-9]{2,})\b', sig)) - BUILTIN):
        m = re.search(r'^(?:export )?interface ' + t + r'\b[^{]*\{', text, re.M)
        if m:
            body = text[m.start():_close(text, m.end() - 1, '{', '}') + 1]
        else:
            m = re.search(r'^(?:export )?type ' + t + r'\s*=', text, re.M)
            if not m:
                continue
            j, depth = m.end(), 0
            while j < len(text) and not (text[j] == ';' and depth == 0):
                depth += text[j] in '{(<['
                depth -= text[j] in '})>]'
                j += 1
            body = text[m.start():j + 1]
        body = re.sub(r'/\* ─ MK-[\s\S]*?\*/\n?', '', body)
        out[t] = '\n'.join(body.split('\n')[:45])
    return out


def main():
    headers, files = live_headers()
    figures = J('moneykeel_figures.json')['figures']
    decisions = {r['id']: r for r in J('moneykeel_decisions.json')['rows']}

    # the drawing sums are checked before anything is printed
    for fid, d in DRAWINGS.items():
        for got, want in d['checks']:
            if abs(got - want) > 1e-9:
                sys.exit(f'STOPPED: the approved-drawing household for {fid} does not add up: {got} is not {want}')

    by_door = collections.defaultdict(list)
    for mid, spec in figures.items():
        by_door[str(spec.get('door', '')).split(' ')[0]].append(mid)

    cards, seen = [], set()
    for h in headers:
        if h['id'] in seen:
            sys.exit(f"STOPPED: {h['id']} has two records in the code — remove the stale one first")
        seen.add(h['id'])
        purpose = field(h['header'], 'Answers')
        if not purpose or purpose.startswith('NOT DETERMINED'):
            sys.exit(f"STOPPED: {h['id']} {h['name']} has no written description — an outside model cannot test it")
        sig = signature(h['lines'], h['decl_at'])
        serves = sorted(set(re.findall(r'MK-[A-Z]{2}-M-\d{3}', field(h['header'], 'Serves'))) | set(by_door.get(h['id'], [])))
        ruled = sorted(set(re.findall(r'DEC-\d{4}', field(h['header'], 'Ruled by'))))
        reads = re.findall(r'(MK-[A-Z]{2}-I-\d{3}) ([^M]+?)(?= MK-[A-Z]{2}-I-|$)', field(h['header'], 'Reads'))

        rules = []
        for did in ruled:
            r = decisions.get(did)
            if not r or 'OLD' in str(r.get('in_use', '')) or str(r.get('type')) not in ('RULE', 'VALUE'):
                continue
            rules.append({'said_by': 'owner', 'decision': did, 'date': str(r.get('decided') or ''),
                          'words': str(r.get('his_words') or '').strip()})
        figs = []
        for mid in serves:
            spec = figures.get(mid)
            if not spec:
                continue
            figs.append({'id': mid, 'words_on_screen': spec.get('label'), 'unit': spec.get('unit'),
                         **({'per': spec['per']} if spec.get('per') else {}),
                         'what_it_answers': spec.get('answers'), 'when_it_refuses': spec.get('refusal'),
                         'shown_on': spec.get('screens')})
            for text in spec.get('decisions') or []:
                rules.append({'said_by': 'author', 'about': mid, 'words': text})

        example_only = purpose.startswith('Example only')
        storage_only = 'calculates nothing' in purpose and not example_only
        is_orch = '-O-' in h['id'] and not example_only
        module = ('performance' if h['family'] == 'PF' or os.path.basename(h['path']) in ('performance.ts', 'look-back.ts')
                  or '/performance/' in h['path'] else 'cashflow' if h['family'] == 'CF' else 'networth')
        card = {'id': h['id'], 'name': h['name'], 'kind': 'orchestrator' if is_orch else 'function',
                'what_it_is_for': purpose, 'handed': sig}
        types = types_named(sig, h['lines'])
        if reads:
            card['inputs_it_reads'] = [f'{i} {n.strip()}' for i, n in reads]
        if figs:
            card['figures_it_feeds'] = figs
        if rules:
            card['rules'] = rules
        if h['id'] in DRAWINGS:
            d = DRAWINGS[h['id']]
            card['approved_drawing'] = {'drawing': d['drawing'], 'household': d['household'], 'drawn': d['drawn']}
        cards.append({'card': card, 'module': module, 'category': h['category'], 'types': types,
                      'skip': 'an example helper — it runs another function on a worked example' if example_only
                      else 'storage only — it reads or saves and does no arithmetic' if storage_only else ''})

    # NOTHING OF HOW IT WORKS MAY LEAVE: a card that carries a statement of code stops the build
    # (a STATEMENT of code — "return" as a word is everywhere in a finance app's comments)
    STATEMENT = re.compile(r'^\s*(return\b|if \(|for \(|while \(|const \w+ =|let \w+ =)|\bfunction \w+\(.*\)\s*\{\s*\S', re.M)
    leaked = [c['card']['id'] for c in cards
              if STATEMENT.search('\n'.join(c['card']['handed'].split('\n')[1:]))
              or re.search(r'\{\s*return\b|=>\s*\S', c['card']['handed'].split('\n')[-1][-40:] if c['card']['handed'].endswith(';') else '')
              or any(STATEMENT.search(v) for v in c['types'].values())]
    if leaked:
        sys.exit(f'STOPPED: {len(leaked)} card(s) carry code from inside a function: {leaked[:12]}')

    # the guard proves it looked
    ids = collections.Counter(c['card']['id'][3:5] + '-' + c['card']['id'][6] for c in cards)
    assert len(cards) >= 350, f'only {len(cards)} records found in the three modules — the reader has gone blind'

    send_dir = os.path.join(OUT, 'to-send')
    os.makedirs(send_dir, exist_ok=True)
    os.makedirs(os.path.join(OUT, 'returned'), exist_ok=True)
    for f in os.listdir(send_dir):
        os.remove(os.path.join(send_dir, f))
    brief = open(BRIEF, encoding='utf8').read().rstrip()

    order = {'orchestrator': 0, '2 · DISPLAYED': 1, '3 · DEPENDENT': 2, '1 · ACTION': 3}
    index, total_cards = [], 0
    for module in ('networth', 'performance', 'cashflow'):
        mine = [c for c in cards if c['module'] == module and not c['skip']]
        orch = sorted((c for c in mine if c['card']['kind'] == 'orchestrator'), key=lambda c: c['card']['id'])
        fns = sorted((c for c in mine if c['card']['kind'] == 'function'),
                     key=lambda c: (order.get(c['category'], 9), c['card']['id']))
        batches = [orch[i:i + PER_BATCH['orchestrator']] for i in range(0, len(orch), PER_BATCH['orchestrator'])]
        batches += [fns[i:i + PER_BATCH['function']] for i in range(0, len(fns), PER_BATCH['function'])]
        for n, batch in enumerate(batches, 1):
            name = f'moneykeel_audit_cards_{module}_{n:02d}-of-{len(batches):02d}.md'
            label = f'{module} {n:02d}'
            # a type many cards name is spelled out ONCE for the batch, not on every card that names it
            types = {}
            for c in batch:
                types.update(c['types'])
            body = [brief, '', '---', '', f'# The cards — batch "{label}"', '',
                    f'{len(batch)} cards, so {len(batch) * 5} cases. Put `"batch": "{label}"` in your reply.', '']
            if types:
                body += ['## The app\'s own types these cards name', '',
                         'What each is made of. The comments inside are the in-house author\'s.', '',
                         '```ts', '\n\n'.join(types[t] for t in sorted(types)), '```', '']
            body += ['## The cards', '', '```json', json.dumps([c['card'] for c in batch], indent=1, ensure_ascii=False), '```', '']
            open(os.path.join(send_dir, name), 'w', encoding='utf8').write('\n'.join(body))
            index.append((name, label, batch))
            total_cards += len(batch)

    skipped = [c for c in cards if c['skip']]
    L = ['# Outside test cases — what to send, and what comes back', '',
         'MoneyKeel · calculation audit · built by `Calculation Module code/scripts/build-outside-test-cards.py` — hand edits die', '',
         '## How to use this', '',
         '1. Open a new chat with the model. Paste the whole of one file from `to-send/`. Each file is the brief followed by its cards.',
         '2. Give the same file to the other model in its own new chat. Neither sees the other\'s reply.',
         '3. Save each reply, unchanged, in `returned/` as `<the batch file\'s name>_claude.json` or `…_gemini.json`.', '',
         f'## What is in the pack', '',
         f'- Read from the code: {files} files, {len(cards)} function and orchestrator records in Net worth, Performance and Cash flow.',
         f'- To be tested: **{total_cards} cards in {len(index)} files — {total_cards * 5} cases from each model.**',
         f'- Left out, each for a stated reason: {len(skipped)} (listed at the foot).', '',
         '| File | Batch | Cards | Cases | First and last card |', '|---|---|---|---|---|']
    for name, label, batch in index:
        L.append(f"| `{name}` | {label} | {len(batch)} | {len(batch) * 5} | {batch[0]['card']['id']} {batch[0]['card']['name']} … "
                 f"{batch[-1]['card']['id']} {batch[-1]['card']['name']} |")
    L += ['', '## Left out of the pack', '', '| Function | Why no cases are asked for |', '|---|---|']
    for c in sorted(skipped, key=lambda c: c['card']['id']):
        L.append(f"| {c['card']['id']} {c['card']['name']} | {c['skip']} |")
    open(os.path.join(OUT, 'moneykeel_audit_cards_index_v01.md'), 'w', encoding='utf8').write('\n'.join(L) + '\n')

    with_owner = sum(1 for c in cards if not c['skip'] and any(r['said_by'] == 'owner' for r in c['card'].get('rules', [])))
    with_any = sum(1 for c in cards if not c['skip'] and c['card'].get('rules'))
    print(f'read {files} files · {len(cards)} records · by family {dict(ids)}')
    print(f'to be tested: {total_cards} cards in {len(index)} files ({total_cards * 5} cases from each model)')
    print(f'left out: {len(skipped)} — ' + ', '.join(f'{n} {k}' for k, n in collections.Counter(c["skip"].split(" — ")[0] for c in skipped).items()))
    print(f'cards carrying an owner decision: {with_owner} · carrying any rule: {with_any} · carrying an approved drawing: '
          f'{sum(1 for c in cards if c["card"].get("approved_drawing"))}')
    for module in ('networth', 'performance', 'cashflow'):
        n = sum(len(b) for _n, l, b in index if l.startswith(module))
        print(f'   {module:12s} {n:4d} cards · {sum(1 for _n, l, _b in index if l.startswith(module))} files')


if __name__ == '__main__':
    main()
