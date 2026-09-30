#!/usr/bin/env python3
"""SWEEP EVERY DECISION HE HAS MADE INTO ONE LOG — his instruction, 2026-09-28.

*"All the decisions sitting in change log, standards, requirements, Audit, and mockup files - record
in separate file called decisions."*

It writes moneykeel_decisions.json, which the workbook is printed from. It is IDEMPOTENT: a decision
is keyed by its source and its own words, so re-running adds what is new and never duplicates what is
there, and an identifier once issued is never re-pointed at a different decision.

WHAT IT WILL NOT DO: invent his words. Where a source records only what I BUILT and not what he SAID,
the row is written with `confidence: LOW` and says so, because a paraphrase of mine standing in for his
ruling is the fault that started all of this. He can see which rows to trust from the column.
"""
import json, os, re, sys, glob, datetime, hashlib, importlib.util as _u

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
os.chdir(ROOT)
TODAY = datetime.date.today().isoformat()
OUT = os.path.join(HERE, 'moneykeel_decisions.json')

def _load(name):
    s = _u.spec_from_file_location(name, os.path.join(HERE, name + '.py'))
    m = _u.module_from_spec(s); s.loader.exec_module(m); return m
SCHEMA = _load('moneykeel_decision_schema')
TABS = _load('moneykeel_decision_tabs')
PLAIN = _load('moneykeel_decision_plain')

import openpyxl

# ── the log so far ───────────────────────────────────────────────────────────────────────────────
doc = json.load(open(OUT)) if os.path.exists(OUT) else {
    '_about': ('THE DECISION LOG — the source. MoneyKeel/documents/decision-log/'
               'moneykeel_log_decisions_v01.xlsx is PRINTED from this by build-decision-log.py; a hand '
               'edit to the workbook dies on the next build. Founder, 2026-09-28: one place for every '
               'decision, no matter where it was made. A decision identifier is issued once and never '
               're-pointed. A row is never deleted — a reversed decision is SUPERSEDED and says by what.'),
    'highest': 0, 'rows': [],
}
_keyless = [r.get('id') for r in doc['rows'] if not r.get('key')]
if _keyless:
    raise SystemExit(
        'These rows carry no key, so the sweeps cannot tell they are already recorded and would add '
        'them again as new decisions: ' + ' '.join(str(x) for x in _keyless))
by_key = {r['key']: r for r in doc['rows']}
by_source = {}      # filled once key_of and _source_id exist, just below

def key_of(f):
    """THE DECISION, not the file it was found in and not the day it was recorded.

    Keyed on HIS WORDS where the row has them, because his words ARE the decision — the same ruling
    written into two versions of a workbook, or summarised by me two different ways, is one decision.

    THREE KEYS TRIED, and the first two produced a log that lied about its own size:
      1. source + words → 251 decisions became 561 rows, one per workbook version.
      2. date + words → better, but the SAME ruling carried on two dates (the v1.0 workbook of
         2026-07-01 and the v1.1 of 2026-07-06) still became two rows, and so did every ruling I had
         summarised in slightly different words in two places. 38 of 593 rows were one decision twice.
      3. HIS WORDS ALONE, normalised — this. Where he left no words, the date and my summary are the
         only thing to key on, and those rows fall back to the old key.

    Found by his question about DEC-0004: chasing why a dead decision read as live surfaced the pairs.
    """
    words = PLAIN._norm(f.get('his_words') or '')
    if len(words) >= 15:
        return hashlib.sha1(('W|' + words[:400]).encode('utf8')).hexdigest()[:12]
    rest = (f.get('plain') or '') + '||' + (f.get('means') or '')
    return hashlib.sha1((f.get('decided', '') + '||' + re.sub(r'\s+', ' ', rest).strip()[:400]).encode('utf8')).hexdigest()[:12]

def _source_id(f):
    """THE SOURCE'S OWN WORDS, which are not mine to change — a second way to recognise a row.

    THE FAULT THIS FIXES (2026-09-30). For a row with no quoted words of his, `key_of` falls back to
    hashing the date plus MY plain-English summary. So the moment I rewrote a summary, the key moved,
    the sweep stopped recognising the decision and added it AGAIN under a fresh identifier. It cost two
    rows in one afternoon: DEC-0008 came back as DEC-0517 when I rewrote it on his question about the
    font standard, and DEC-0002 was re-minted when I deleted its hand-written entry. His rule is that
    an identifier is issued once and never re-pointed — and my own editing was re-pointing them.

    `means` is the SOURCE's summary, copied from the changelog and never rewritten by me, so it is
    stable across any rewording of mine. It is checked when the key misses.
    """
    m = PLAIN._norm(str(f.get('means') or ''))
    return (str(f.get('decided') or '') + '|' + m[:200]) if len(m) >= 15 else None


def add(**f):
    """one decision. Returns 'new' or 'kept'."""
    k = key_of(f)
    if k not in by_key:
        sid = _source_id(f)
        if sid and sid in by_source:
            row = by_source[sid]
            # the row is the same decision, recognised by the source's own words. Move it onto the
            # new key so the two agree from here on; the identifier never changes.
            by_key.pop(row.get('key'), None)
            row['key'] = k
            by_key[k] = row
    if k in by_key:
        row = by_key[k]
        for kk, vv in f.items():                 # fill blanks only; never overwrite what is there
            if kk == 'source':
                # EVERY file it was found in — the sources accumulate rather than the first one winning
                have = [x.strip() for x in str(row.get('source', '')).split(' ||| ') if x.strip()]
                if vv and vv not in have:
                    row['source'] = ' ||| '.join(have + [vv])
                continue
            if vv and not row.get(kk):
                row[kk] = vv
        return 'kept'
    doc['highest'] += 1
    row = {kk: '' for kk in SCHEMA.KEYS}
    row.update(f)
    row['id'] = 'DEC-%04d' % doc['highest']
    row['key'] = k
    row['recorded'] = row.get('recorded') or TODAY
    row['tab'] = row.get('tab') or 'process-and-standards'
    doc['rows'].append(row); by_key[k] = row
    return 'new'

# the second index: the source's own words → the row, so a row I have reworded is still recognised
for _r in doc['rows']:
    _sid = _source_id(_r)
    if _sid:
        by_source.setdefault(_sid, _r)

HIS = re.compile(r'\b(jj|founder|approved mock|decided|adopted|approved|directed)\b', re.I)
# the words that mark a sentence as HIS, quoted — used to lift his verbatim words out of a Why cell
QUOTED = re.compile('[\u201c"\u2018\']([^\u201d"\u2019\']{8,400})[\u201d"\u2019\']')

def his_words_from(change, why, who):
    """his verbatim words if the row quotes them; otherwise nothing — never a paraphrase of mine."""
    for blob in (why, change, who):
        m = QUOTED.search(str(blob or ''))
        if m and not m.group(1).startswith('~'):
            return m.group(1).strip()
    return ''

# ── SOURCE 1 · the design Changelog ──────────────────────────────────────────────────────────────
def sweep_changelog():
    files = sorted(glob.glob('docs/FCC-core-55-70/FCC-core-detailed-design-v*.xlsx'))
    new = kept = 0
    seen_rows = 0
    unmatched = []
    # EVERY version, not only the newest: ten rows exist in the 2026-08-12 workbook and were dropped
    # from the 2026-08-14 one, three of them his decisions. A log built from the newest file alone
    # would inherit that loss silently.
    for path in files:
        wb = openpyxl.load_workbook(path, read_only=True)
        if 'Changelog' not in wb.sheetnames:
            continue
        for r in wb['Changelog'].iter_rows(values_only=True):
            if not r or len(r) < 5 or not r[0] or not str(r[0])[:4].isdigit():
                continue
            date, sheet, change, why, who = (str(x or '').strip() for x in r[:5])
            seen_rows += 1
            if not HIS.search(who):
                continue                          # mine, not his — counted by the B6 gate, not a decision
            tab, ok = TABS.classify_row(sheet, change)
            if not ok:
                unmatched.append(f'{date[:10]} | {sheet[:60]}')
            hw = his_words_from(change, why, who)
            res = add(
                decided=date[:10], tab=tab,
                source=f'{os.path.basename(path)} · Changelog · {date[:10]} · {sheet[:70]}',
                his_words=hw,
                plain=PLAIN.what_is_the_decision(sheet + ' — ' + hw + ' — ' + change[:200], change[200:])[0],
                plain_written=('yes' if PLAIN.what_is_the_decision(sheet + ' — ' + hw + ' — ' + change[:200], change[200:])[1] else 'no'),
                means=change,
                raw=change + ('\n\nWHY (from the source): ' + why if why else ''),
                why=why,
                type='DESIGN' if re.search(r'\bmock\b|\bv\d\b|approved', sheet + change, re.I) else 'RULE',
                scope='app-wide' if tab == 'multiple_screens' else tab,
                screens=sheet,
                exceptions='none recorded',
                # STATUS IS NOT ASSUMED (corrected 2026-09-28 before the file was handed over). The first
                # run stamped every changelog row 'TESTED, NOT VERIFIED', which I could not know: a
                # changelog row says what was BUILT, and names a test only sometimes. Writing a status I
                # had not established is the same fault as a figure with no provenance — it survives
                # because it looks plausible. A row says what the source actually supports.
                status=('CODED, NOT TESTED — the Changelog records it as built and names a test: see the proof column'
                        if re.search(r'\btest\b|\bguard\b|\blaws?\b', change, re.I)
                        else 'RECORDED — status not established. The Changelog says what was built; no test is named, and I have not verified one exists.'),
                proof=(' · '.join(sorted(set(re.findall(r'[\w/.-]+\.test\.tsx?|[\w/.-]+\.test\.ts|\b\w+_guard\b|\bguard_\w+\b', change))))[:200]
                       or 'NONE NAMED on the source row — so nothing re-runs this decision'),
                approved_on=' · '.join(sorted(set(re.findall(r'\b[a-z][a-z-]*[-_]v\d{2}\b|\bv\d{1,2}\b', sheet + ' ' + change, re.I))))[:120],
                confidence='HIGH — his words are quoted on the row' if hw
                           else 'LOW — the source records what I BUILT, not what he SAID. His wording needs finding, or the row needs his confirmation.',
                search=' '.join(sorted({w.lower() for w in re.findall(r'[A-Za-z][A-Za-z-]{3,}', sheet)}))[:200],
            )
            new += res == 'new'; kept += res == 'kept'
    return new, kept, seen_rows, unmatched

# ── SOURCE 2 · the rulings ledger being retired ──────────────────────────────────────────────────
def sweep_rulings():
    p = os.path.join(HERE, 'moneykeel_rulings.json')
    if not os.path.exists(p):
        return 0, 0, 0, []
    led = json.load(open(p))
    new = kept = 0
    for L in led:
        rows_txt = str(L.get('rows') or '')
        tab, ok = TABS.classify_row(rows_txt, str(L.get('ruling') or ''))
        res = add(
            decided=str(L.get('date') or '')[:10], tab=tab,
            source=f"the rulings ledger being retired (moneykeel_rulings.json · {L.get('id')}) — originally: {str(L.get('source') or 'not recorded')[:160]}",
            his_words=str(L.get('ruling') or ''),
            plain=PLAIN.what_is_the_decision(str(L.get('ruling') or '')[:200], str(L.get('ruling') or '')[200:] + ' ' + str(L.get('code') or ''))[0],
            plain_written=('yes' if PLAIN.what_is_the_decision(str(L.get('ruling') or '')[:200], str(L.get('ruling') or '')[200:] + ' ' + str(L.get('code') or ''))[1] else 'no'),
            means=str(L.get('code') or ''),
            raw='RULING: ' + str(L.get('ruling') or '') + '\n\nWHAT WAS CHANGED: ' + str(L.get('code') or ''),
            why=str(L.get('notes') or ''),
            type='RULE',
            scope='app-wide' if tab == 'multiple_screens' else tab,
            screens=rows_txt, governs=' · '.join(re.findall(r'MK-[A-Z]{2}-[A-Z]-\d{3}', rows_txt + ' ' + str(L.get('code') or ''))),
            exceptions='none recorded',
            proof=str(L.get('proof') or ''),
            status=str(L.get('status') or ''),
            dates_done=str(L.get('coded') or ''),
            verified=str(L.get('verified') or ''),
            changed=str(L.get('code') or ''),
            standard_carrier=str(L.get('standard') or ''),
            # THE MACHINE-READABLE FILE CHECKS COME WITH THE DECISION (2026-09-28). 24 rulings carry
            # `expect` — {tab, key, col, contains} read against the master file after every build, which
            # is how a FILE-ONLY decision is proved rather than claimed (his question 2026-09-12: "why
            # not tested?"). They move here so the decision log is the one source, and step B3 reads it.
            expect=L.get('expect') or '',
            was_ruling_id=str(L.get('id') or ''),
            confidence='HIGH — his words are the ruling text, recorded the day he said it',
            search=' '.join(sorted({w.lower() for w in re.findall(r'[A-Za-z][A-Za-z-]{3,}', str(L.get('ruling') or ''))}))[:200],
        )
        new += res == 'new'; kept += res == 'kept'
    return new, kept, len(led), []


# ── SOURCE 3 · HIS OWN FEEDBACK WORKBOOKS AND THE AUDIT FILES ────────────────────────────────────
# These hold his VERBATIM words, in the column he typed them into — YOUR RULING, VERDICT, Comments,
# Founder finding. They are the likeliest home for the wording behind the 41 rows the changelog could
# only record as "what I built", which is the whole plan for raising those rows to HIGH confidence
# without asking him anything.
#
# THE COLUMN HE TYPES IN IS NAMED, not guessed, and any workbook whose columns match none of them is
# REPORTED rather than skipped — a sweep that silently reads nothing is the fault this file's own
# guard exists to stop.
# ONLY COLUMNS THAT ARE UNAMBIGUOUSLY HIS. The first run of this sweep read the VERDICT column of the
# second-verification assessment — which is MY verdict on somebody else's finding, not his decision —
# and added 285 rows whose whole content was "AGREE" or "PARTLY". 78 of the first 120 also repeated a
# ruling already in the log. A sweep that hoovers up every column produces a log nobody can trust,
# which is the opposite of the point.
HIS_COLUMNS = ['your ruling', 'his ruling', 'founder finding', 'your answer', 'founder comment',
               'comments']
# a cell holding only a verdict word is not a decision — it is an answer to a question recorded elsewhere
NOT_A_DECISION = {'agree', 'partly', 'disagree', 'yes', 'no', 'ok', 'okay', 'n/a', 'na', '-', 'tbd',
                  'open', 'done', 'noted', 'approved', 'true', 'false'}
SUBJECT_COLUMNS = ['one concept', 'row identifier', 'their finding (short)', '#', 'where',
                   'words in use today', 'source']

def _same_words(a, b):
    """the same decision, allowing for the quote marks and spacing differing between files"""
    na, nb = PLAIN._norm(a), PLAIN._norm(b)
    if not na or not nb:
        return False
    short, long_ = (na, nb) if len(na) <= len(nb) else (nb, na)
    return len(short) >= 20 and short in long_


def sweep_feedback():
    # ONLY THE NEWEST VERSION OF EACH OF HIS FEEDBACK FILES (2026-09-30). His synonym-cluster
    # workbook exists as v01 (2026-09-10) and v02 (2026-09-12) — the same rulings, carried forward.
    # Sweeping both put "/month, /year", "Emergency fund" and "you entered" in the log twice each,
    # and they slipped the merge because his words there are shorter than the floor it needs.
    # The same class as the "v1.0 review → v1.1" tab: an earlier version is not a second decision.
    _all = sorted(glob.glob(os.path.join(ROOT, 'MoneyKeel/documents/*/JJ-feedback-archive/*.xlsx'))
                  + glob.glob(os.path.join(ROOT, 'MoneyKeel/documents/audit/*.xlsx')))
    _newest = {}
    for _f in _all:
        _stem = re.sub(r'_v\d+(-jj)?\.xlsx$', '', os.path.basename(_f))
        _stem = re.sub(r'^\d{4}-\d{2}-\d{2}_folded-in_', '', _stem)
        if _stem not in _newest or os.path.basename(_f) > os.path.basename(_newest[_stem]):
            _newest[_stem] = _f
    files = sorted(_newest.values())
    new = kept = rows_read = 0
    no_column = []
    for path in files:
        base = os.path.basename(path)
        try:
            wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        except Exception as e:
            no_column.append(f'{base}: could not be opened — {e}')
            continue
        for tab in wb.sheetnames:
            ws = wb[tab]
            rows = list(ws.iter_rows(values_only=True))
            if len(rows) < 2:
                continue
            hdr = [str(c or '').strip().lower() for c in rows[0]]
            his_i = next((i for i, h in enumerate(hdr) if h in HIS_COLUMNS), None)
            if his_i is None:
                continue
            subj_i = next((i for i, h in enumerate(hdr) if h in SUBJECT_COLUMNS), 0)
            found_here = 0
            for r in rows[1:]:
                if not r or his_i >= len(r):
                    continue
                words = str(r[his_i] or '').strip()
                if len(words) < 12 or words.lower().strip(' .') in NOT_A_DECISION:
                    continue
                # ALREADY IN THE LOG? The rulings ledger was BUILT from these files, so most of his
                # wording is here already. Where it is, the source is added to that row rather than a
                # second row being created — which is worth more than a new row: it shows the decision
                # reaching two files, and it is the evidence the confidence plan is looking for.
                existing = next((x for x in doc['rows']
                                 if x.get('his_words') and _same_words(x['his_words'], words)), None)
                if existing is not None:
                    src = f'{base} · {tab} · the column he typed in ("{rows[0][his_i]}")'
                    have = [t.strip() for t in str(existing.get('source', '')).split(' ||| ') if t.strip()]
                    if src not in have:
                        existing['source'] = ' ||| '.join(have + [src])
                    rows_read += 1
                    kept += 1
                    continue
                subject = str(r[subj_i] or '').strip() if subj_i < len(r) else ''
                rows_read += 1
                found_here += 1
                tabname, ok = TABS.classify_row(subject, words)
                res = add(
                    decided=re.search(r'20\d\d-\d\d-\d\d', base).group(0) if re.search(r'20\d\d-\d\d-\d\d', base) else '',
                    tab=tabname,
                    source=f'{base} · {tab} · the column he typed in ("{rows[0][his_i]}") · row: {subject[:70]}',
                    his_words=words,
                    means=subject,
                    raw=f'SUBJECT: {subject}\n\nHIS WORDS: {words}',
                    type='RULE',
                    scope='app-wide' if tabname == 'multiple_screens' else tabname,
                    screens=subject,
                    exceptions='none recorded',
                    status='RECORDED — status not established. Swept from his own feedback workbook; whether it is coded and tested has not been checked on this row.',
                    proof='NONE NAMED on the source row — so nothing re-runs this decision',
                    confidence='HIGH — these are his own words, from the column he typed them into',
                    plain=PLAIN.what_is_the_decision(words[:200], words[200:] + ' ' + subject)[0],
                    plain_written=('yes' if PLAIN.what_is_the_decision(words[:200], words[200:] + ' ' + subject)[1] else 'no'),
                    search=' '.join(sorted({w.lower() for w in re.findall(r'[A-Za-z][A-Za-z-]{3,}', subject + ' ' + words)}))[:200],
                )
                new += res == 'new'; kept += res == 'kept'
            if found_here == 0:
                no_column.append(f'{base} · {tab}: a column he types in, and no rows with anything in it')
    return new, kept, rows_read, no_column



# ── SOURCE 4 · THE STANDARDS, THE MOCKS AND THE REQUIREMENTS WORKBOOKS ───────────────────────────
# Prose, not tables — so a decision is found by HIS OWN QUOTED WORDS near a word that marks a
# decision. It is deliberately narrow: a sweep that guesses at prose fills the log with sentences he
# never said, and a log nobody can trust is worse than a short one.
#
# MOST OF WHAT IT FINDS IS ALREADY HERE, and that is the point rather than a waste: the row gains
# another source, which shows the decision reaching a second file — exactly the evidence the
# confidence plan is looking for, and exactly what was missing when his 2026-09-12 correction lived
# in one place.
MARKS_A_DECISION = re.compile(r'founder|he ruled|his ruling|standing order|approved|ruling|decided', re.I)
QUOTE_IN_PROSE = re.compile('[\u201c"]([^\u201d"]{15,400})[\u201d"]')

def _strip_tags(t):
    t = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', t, flags=re.S | re.I)
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', t))

def sweep_prose():
    paths = (sorted(glob.glob(os.path.join(ROOT, 'MoneyKeel/documents/standards/*.md')))
             + sorted(glob.glob(os.path.join(ROOT, 'MoneyKeel/documents/standards/*.html')))
             + sorted(glob.glob(os.path.join(ROOT, 'MoneyKeel/documents/*/moneykeel_pres_mock_*.html'))))
    new = kept = found = 0
    quiet = []
    for path in paths:
        base = os.path.basename(path)
        try:
            text = _strip_tags(open(path, encoding='utf8', errors='ignore').read())
        except Exception as e:
            quiet.append(f'{base}: could not be read — {e}')
            continue
        here = 0
        for m in QUOTE_IN_PROSE.finditer(text):
            words = m.group(1).strip()
            around = text[max(0, m.start() - 220):m.start()]
            if not MARKS_A_DECISION.search(around):
                continue                       # a quote with nothing marking it as his is just a quote
            if len(words) < 20:
                continue
            found += 1; here += 1
            existing = next((x for x in doc['rows']
                             if x.get('his_words') and _same_words(x['his_words'], words)), None)
            src = f'{base} · quoted in the text'
            if existing is not None:
                have = [t.strip() for t in str(existing.get('source', '')).split(' ||| ') if t.strip()]
                if src not in have:
                    existing['source'] = ' ||| '.join(have + [src])
                kept += 1
                continue
            subject = around[-120:].strip()
            tabname, ok = TABS.classify_row(base, words + ' ' + subject)
            res = add(
                decided=re.search(r'20\d\d-\d\d-\d\d', around) and re.search(r'20\d\d-\d\d-\d\d', around).group(0) or '',
                tab=tabname, source=src, his_words=words, means=subject,
                raw=f'QUOTED IN: {base}\n\nAROUND IT: ...{subject}\n\nHIS WORDS: {words}',
                type='RULE', scope='app-wide' if tabname == 'multiple_screens' else tabname,
                screens=base, exceptions='none recorded',
                status='RECORDED — status not established. Quoted in a standard or a mock; whether it is coded and tested has not been checked on this row.',
                proof='NONE NAMED on the source — so nothing re-runs this decision',
                confidence='HIGH — his own words, quoted in the file',
                plain=PLAIN.what_is_the_decision(words[:200], words[200:] + ' ' + subject)[0],
                plain_written=('yes' if PLAIN.what_is_the_decision(words[:200], words[200:] + ' ' + subject)[1] else 'no'),
                search=' '.join(sorted({w.lower() for w in re.findall(r'[A-Za-z][A-Za-z-]{3,}', words)}))[:200],
            )
            new += res == 'new'; kept += res == 'kept'
        if here == 0:
            quiet.append(f'{base}: no quoted decision of his found')
    return new, kept, found, quiet



# ── SOURCE 5 · THE REQUIREMENTS WORKBOOKS ────────────────────────────────────────────────────────
# The PRD, the UX design, the high-level design and the detailed design each carry a column he types
# into — "💬 Comments", "💬 Your comments", "🟢 Response". 289 rows across them hold something he wrote,
# and not one of them was in any ledger.
#
# The Changelog tab is SKIPPED here because it is swept in full by its own pass; sweeping it twice
# would not duplicate rows (the key is the decision, not the file) but it would hide how much each
# source actually contributed, and the counts are what he reads.
def sweep_requirements():
    new = kept = found = 0
    quiet = []
    for path in sorted(glob.glob(os.path.join(ROOT, 'docs/FCC-core-55-70/FCC-core-*.xlsx'))):
        base = os.path.basename(path)
        try:
            wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        except Exception as e:
            quiet.append(f'{base}: could not be opened — {e}'); continue
        for tab in wb.sheetnames:
            if tab.strip().lower() == 'changelog':
                continue                            # its own sweep reads this one in full
            # A REVIEW TAB IS A RESTATEMENT, NOT A NEW DECISION (2026-09-30). The v1.1 workbook carries
            # a tab "v1.0 review → v1.1" holding every comment he made on v1.0 — restated in MY words
            # beside my answer. The comment itself is already swept, verbatim, from the v1.0 workbook
            # it was typed into. Reading both put 17 of his questions in the log twice, once in his
            # words and once in mine, and the pair looked like a decision superseding another.
            #
            # He found the class: DEC-0004 read as live when his approved mock had replaced it. Chasing
            # that surfaced 38 duplicate rows, of which these were the last and least obvious — the two
            # copies do not even share wording, so nothing but the source tells you they are one.
            if re.match(r'v\d+\.\d+\s*(review)?\s*(→|->)\s*v\d+\.\d+', tab.strip(), re.I):
                continue
            rows = list(wb[tab].iter_rows(values_only=True))
            if len(rows) < 2:
                continue
            hdr = [str(c or '').strip().lower() for c in rows[0]]
            ci = next((i for i, h in enumerate(hdr) if 'comment' in h or 'response' in h), None)
            if ci is None:
                continue
            # the subject is the first column with real words in it — the rule, the criterion, the field
            for r in rows[1:]:
                if not r or ci >= len(r):
                    continue
                words = str(r[ci] or '').strip()
                if len(words) < 12 or words.lower().strip(' .') in NOT_A_DECISION:
                    continue
                subject = ' · '.join(str(x).strip() for x in r[:ci] if x and len(str(x).strip()) > 2)[:220]
                found += 1
                existing = next((x for x in doc['rows']
                                 if x.get('his_words') and _same_words(x['his_words'], words)), None)
                src = f'{base} · {tab} · the column he typed in ("{rows[0][ci]}")'
                if existing is not None:
                    have = [t.strip() for t in str(existing.get('source', '')).split(' ||| ') if t.strip()]
                    if src not in have:
                        existing['source'] = ' ||| '.join(have + [src])
                    kept += 1
                    continue
                tabname, ok = TABS.classify_row(tab + ' ' + subject, words)
                res = add(
                    decided=re.search(r'20\d\d-\d\d-\d\d', base).group(0) if re.search(r'20\d\d-\d\d-\d\d', base) else '',
                    tab=tabname, source=src, his_words=words, means=subject,
                    raw=f'SUBJECT: {subject}\n\nHIS WORDS: {words}',
                    type='RULE', scope='app-wide' if tabname == 'multiple_screens' else tabname,
                    screens=subject[:120], exceptions='none recorded',
                    status='RECORDED — status not established. Swept from a requirements workbook; whether it is coded and tested has not been checked on this row.',
                    proof='NONE NAMED on the source row — so nothing re-runs this decision',
                    confidence='HIGH — his own words, from the column he typed them into',
                    plain=PLAIN.what_is_the_decision(words[:200], words[200:] + ' ' + subject)[0],
                    plain_written=('yes' if PLAIN.what_is_the_decision(words[:200], words[200:] + ' ' + subject)[1] else 'no'),
                    search=' '.join(sorted({w.lower() for w in re.findall(r'[A-Za-z][A-Za-z-]{3,}', subject + ' ' + words)}))[:200],
                )
                new += res == 'new'; kept += res == 'kept'
    return new, kept, found, quiet



# ── SOURCE 6 · WHAT HE SAID IN CHAT ─────────────────────────────────────────────────────────────
# THE ONE HOLE THE OTHER FIVE CANNOT REACH, named honestly on 2026-09-28: a decision made in
# conversation and never written into a changelog, a standard or a workbook exists in no file, so no
# sweep can find it. Writing it down the same day is the only control, and this is where it goes.
#
# It is the only hand-written file feeding the log, and that is deliberate: everything else is read
# from a record he can check against. A row here carries his words and nothing else does, so it says
# plainly that it came from a conversation.
def sweep_in_chat():
    path = os.path.join(HERE, 'moneykeel_decisions_in_chat.json')
    if not os.path.exists(path):
        return 0, 0, 0
    rows = json.load(open(path))['rows']
    new = kept = 0
    for r in rows:
        f = dict(r)
        subject = f.pop('subject', '')
        res = add(
            source='in chat, ' + f.get('decided', '') + ' — written down the same day; it is in no other file',
            confidence='HIGH — his own words, recorded in the conversation they were said in',
            scope=f.get('tab', ''),
            raw='SUBJECT: ' + subject + '\n\nHIS WORDS: ' + str(f.get('his_words') or ''),
            plain_written='yes',
            **f,
        )
        new += res == 'new'; kept += res == 'kept'
    return new, kept, len(rows)



# ── ONE MORE PASS: THE SAME WORDS, REWORDED BY ME (2026-09-30) ───────────────────────────────────
# Keying on his words caught the exact repeats. It cannot catch the pairs where my own transcription
# differs by a hyphen or a capital — "how about one time income?" and "How about one-time income?"
# are one question of his, recorded from two workbook versions.
#
# So a second pass compares what is left and MERGES the pairs that are the same words. It prints
# every merge: a merge that nobody can see is a row quietly disappearing from his record, and this
# file exists because things disappeared quietly.
def merge_reworded(rows):
    import difflib
    def flat(t):
        return re.sub(r'[^a-z0-9 ]', '', PLAIN._norm(t).replace('-', ' '))
    keep, merged = [], []
    for r in rows:
        # A SPLIT ROW IS NEVER MERGED BACK (2026-09-30). The halves of a split inherit the parent's
        # `his_words` word for word — DEC-0002 and DEC-0002b both carry "cashflow. Approve." — so this
        # matched them at a ratio of 1.0 and folded them into one on every re-run, silently undoing the
        # split he asked for. They are two rows BY DECLARATION, in moneykeel_decisions_splits.json.
        if str(r.get('raw') or '').startswith('SPLIT FROM '):
            keep.append(r); continue
        w = flat(r.get('his_words'))
        if len(w) < 15:
            keep.append(r); continue
        hit = None
        for k in keep:
            kw = flat(k.get('his_words'))
            if len(kw) >= 15 and abs(len(kw) - len(w)) <= 40 \
               and difflib.SequenceMatcher(None, kw[:220], w[:220]).ratio() > 0.90:
                hit = k; break
        if hit is None:
            # THE GENERAL CATCH: the same decision written into the log twice, where his words are
            # missing from one copy (a changelog row that quoted nothing) or too short to compare
            # ("/month, /year"). The PLAIN sentence is what the decision IS, so two rows that say
            # the same thing in the same words are one decision whatever their sources.
            pw = flat(r.get('plain'))
            if len(pw) >= 60:
                for k in keep:
                    kp = flat(k.get('plain'))
                    if len(kp) >= 60 and difflib.SequenceMatcher(None, kp[:400], pw[:400]).ratio() > 0.93:
                        hit = k; break
        if hit is None:
            keep.append(r); continue
        merged.append((r['id'], hit['id'], str(r.get('his_words'))[:70]))
        # the EARLIEST date wins, and every source of both is kept
        if r.get('decided') and (not hit.get('decided') or str(r['decided']) < str(hit['decided'])):
            hit['decided'] = r['decided']
        srcs = [t.strip() for t in (str(hit.get('source', '')) + ' ||| ' + str(r.get('source', ''))).split(' ||| ') if t.strip()]
        hit['source'] = ' ||| '.join(dict.fromkeys(srcs))
        for kk, vv in r.items():
            if kk in ('id', 'key', 'source', 'decided'):
                continue
            if vv and not hit.get(kk):
                hit[kk] = vv
    return keep, merged



# ── A SOURCE ROW THAT HOLDS TWO DECISIONS (founder, 2026-09-30: "split DEC - 0002") ──────────────
# A changelog row records a day's work, not one decision. DEC-0002 carried the four-tab cash-flow
# architecture AND the name of its third tab. The architecture is in force — his mock approval names
# it — while the name was replaced by his Expenses ruling. Marking the row OLD buries the live
# decision; leaving it IN USE leaves a dead name reading as current. So it becomes two rows.
#
# The split text is HIS source row divided, never rewritten, and each part says which half it is and
# points at the other. A split is declared by hand in moneykeel_decisions_splits.json because only
# reading tells you a row holds two things.
# A DECISION THAT RESTATES A STANDARD SAYS SO ON ITS ROW (founder, 2026-09-30). DEC-0008 stated the
# money-size rule and named nothing behind it, so he had to ask whether it was a new exception to the
# font standard. It was not: it is his own 2026-07-15 amendment applied to two named tables. A
# changelog row carries no standard reference, so the link is declared by hand in
# moneykeel_decisions_anchors.json and printed into the row's own columns.
# HIS ANSWERS ON THE WORDING ASKS (2026-09-30). He returned the file with all 33 rows answered and
# said: "Record them in decision log, any other file needed to be updated (PFS)." A plain "yes"
# confirms my plain-English summary AS WRITTEN — so the row stops being my reconstruction and becomes
# his, which is what lifts it from LOW to HIGH confidence. Where he typed his own wording it REPLACES
# mine word for word and nothing of mine survives in that cell.
def apply_answers(rows):
    path = os.path.join(HERE, 'moneykeel_decisions_answers.json')
    if not os.path.exists(path):
        return rows, []
    spec = json.load(open(path))
    answers, when = spec['rows'], spec['answered_on']
    done = []
    by_id = {r.get('id'): r for r in rows}
    for ident, a in answers.items():
        r = by_id.get(ident)
        if r is None:
            raise SystemExit(f'his answer names {ident}, which is not a decision in the log')
        verdict = (a.get('verdict') or '').strip()
        wording = (a.get('his_wording') or '').strip()
        if wording:
            r['his_words'] = wording
            r['plain'] = wording
            r['plain_written'] = 'yes'
            r['confidence'] = f'HIGH — his own wording, typed on the wording asks he returned {when}'
            done.append((ident, 'HIS OWN WORDING replaces mine'))
        elif verdict.lower() in ('yes', 'y'):
            # the summary was mine and he read it and said yes, so it is his now — and it says so
            r['his_words'] = f'"{verdict}" — confirming, word for word, the summary on this row'
            r['confidence'] = f'HIGH — he read this row and confirmed it as written, {when}'
            done.append((ident, 'confirmed as written'))
        else:
            raise SystemExit(f'{ident} carries neither a verdict nor wording — read the file again')
        r['verified'] = f'ANSWERED BY HIM {when} on moneykeel_log_wording-asks_v01-jj.xlsx'
    return rows, done


def apply_anchors(rows):
    path = os.path.join(HERE, 'moneykeel_decisions_anchors.json')
    if not os.path.exists(path):
        return rows, []
    spec = json.load(open(path))['rows']
    done = []
    for r in rows:
        a = spec.get(r.get('id'))
        if not a:
            continue
        r['standard_carrier'] = a['standard_carrier']
        r['exceptions'] = a['exceptions']
        done.append((r['id'], a['standard_carrier'].split(' \u2014 ')[0]))
    unknown = sorted(set(spec) - {r.get('id') for r in rows})
    if unknown:
        raise SystemExit('anchors name decisions that do not exist: ' + ' '.join(unknown))
    return rows, done


def apply_splits(rows):
    path = os.path.join(HERE, 'moneykeel_decisions_splits.json')
    if not os.path.exists(path):
        return rows, []
    spec = json.load(open(path))['rows']
    out, done = [], []
    for r in rows:
        hay = str(r.get('raw') or r.get('means') or '')
        # A ROW THAT IS ALREADY SPLIT IS NOT SPLIT AGAIN (2026-09-30). Each part's `raw` quotes the
        # source row word for word, so the match phrase is still in it — without this the parts would
        # be split again on every run and collide on their identifiers.
        if hay.startswith('SPLIT FROM '):
            out.append(r); continue
        rule = next((x for x in spec if x['match'].lower() in hay.lower()), None)
        if rule is None:
            out.append(r); continue
        for i, part in enumerate(rule['parts']):
            new = dict(r)
            # KEEP A KEY ON EVERY PART (fixed 2026-09-30). This popped the key, so on the NEXT run
            # `by_key` threw KeyError and the whole pipeline — build-all.sh included — stopped. Worse,
            # had it not thrown, the parent's key would have been missing and the changelog sweep would
            # have re-added the original row as a brand-new decision. Part 0 keeps the parent's key;
            # the others take it with a suffix, so both are found next time and neither is re-added.
            new['key'] = r['key'] if i == 0 else f"{r['key']}#{i}"
            new['id'] = r['id'] if i == 0 else r['id'] + chr(ord('a') + i)
            new['plain'] = part['plain']
            new['plain_written'] = 'yes'
            new['screens'] = part.get('screens', new.get('screens'))
            new['type'] = part.get('type', new.get('type'))
            new['status'] = part.get('status', new.get('status'))
            new['means'] = part['subject']
            new['raw'] = ('SPLIT FROM ' + r['id'] + ', one source row holding two decisions.\n\nTHIS HALF: '
                          + part['subject'] + '\n\nTHE SOURCE ROW, WORD FOR WORD:\n' + hay)
            if part.get('keep'):
                new['in_use'] = 'IN USE'
                new['_split_keep'] = True
            else:
                new['in_use'] = part.get('status', 'OLD, NOT IN USE')
                new['_supersede_phrase'] = part.get('superseded_by_phrase')
            out.append(new)
            done.append((new['id'], part['subject'][:70]))
    return out, done


if __name__ == '__main__':
    print('── sweeping every decision into one log')
    n1, k1, seen1, un1 = sweep_changelog()
    print(f'   design Changelog (every version) : {seen1} dated rows read · {n1} decisions added · {k1} already there')
    if un1:
        print(f'   {len(un1)} row(s) matched no screen — classify them in moneykeel_decision_tabs.py:')
        for u in un1[:10]:
            print('     ' + u)
        sys.exit(1)
    n2, k2, seen2, _ = sweep_rulings()
    print(f'   the rulings ledger being retired : {seen2} rulings read · {n2} added · {k2} already there')
    n3, k3, seen3, quiet3 = sweep_feedback()
    print(f'   his feedback and audit workbooks : {seen3} answers of his read · {n3} added · {k3} already there')
    for q in quiet3[:8]:
        print('     (nothing taken from) ' + q)
    n4, k4, seen4, quiet4 = sweep_prose()
    print(f'   the standards and the mocks      : {seen4} quoted decisions found · {n4} added · {k4} already there (source added)')
    print(f'     {len(quiet4)} file(s) held no quoted decision of his')
    n6, k6, seen6 = sweep_in_chat()
    print(f'   what he said IN CHAT             : {seen6} recorded · {n6} added · {k6} already there')
    n5, k5, seen5, quiet5 = sweep_requirements()
    print(f'   the requirements workbooks       : {seen5} comments of his read · {n5} added · {k5} already there (source added)')
    doc['rows'], _merged = merge_reworded(doc['rows'])
    if _merged:
        print(f'   merged {len(_merged)} row(s) that were the same words reworded by me:')
        for gone, into, w in _merged[:12]:
            print(f'     {gone} → {into}   “{w}”')

    doc['rows'], _answered = apply_answers(doc['rows'])
    if _answered:
        print(f'   his answers folded onto {len(_answered)} row(s) — the wording asks he returned:')
        for aid, how in _answered:
            print(f'     {aid}  {how}')

    doc['rows'], _anchored = apply_anchors(doc['rows'])
    if _anchored:
        print(f'   anchored {len(_anchored)} row(s) to the standard that carries the rule:')
        for aid, where in _anchored:
            print(f'     {aid}  →  {where}')

    doc['rows'], _split = apply_splits(doc['rows'])
    if _split:
        print(f'   split {len(_split)} row(s) that held more than one decision:')
        for sid, what in _split:
            print(f'     {sid}  {what}')

    # OLD DECISIONS ARE MARKED (his instruction, 2026-09-29). Two passes: find the row that replaced
    # each superseded one, then write the link BOTH ways so either row opens the other.
    by_phrase = {}
    for r in doc['rows']:
        by_phrase[str(r.get('raw') or r.get('means') or '')] = r
    for r in doc['rows']:
        src_text = str(r.get('raw') or r.get('means') or '')
        if r.pop('_split_keep', False):
            r['in_use'] = 'IN USE'
            continue          # the live half of a split — its source row still holds the dead words
        repl_phrase = r.pop('_supersede_phrase', None) or PLAIN.superseded_by_phrase(src_text)
        if not repl_phrase:
            r['in_use'] = r.get('in_use') or 'IN USE'
            continue
        newer = next((x for k, x in by_phrase.items() if repl_phrase.lower() in k.lower()), None)
        if newer is None:
            r['in_use'] = 'OLD, NOT IN USE — replaced, but the replacing row was not found; needs checking'
            continue
        r['in_use'] = 'OLD, NOT IN USE — see %s for the decision in force' % newer['id']
        r['supersedes'] = 'Replaced by %s' % newer['id']
        have = str(newer.get('supersedes') or '')
        add = 'Replaces %s' % r['id']
        if add not in have:
            newer['supersedes'] = (have + ' · ' + add).strip(' ·')
        newer['in_use'] = newer.get('in_use') or 'IN USE'

    # THE PLAN GOES ON EVERY ROW, recomputed each sweep so it follows the row as its state changes
    for r in doc['rows']:
        whose, why = PLAIN.whose_decision(str(r.get('raw') or r.get('means') or ''))
        if whose == 'MINE':
            r['confidence'] = ('NOT A DECISION OF HIS — this is my own engineering, recorded in a changelog '
                               'whose approval column said JJ for everything that day: ' + why)
            r['type'] = 'BUILD RECORD'
        r['confidence_plan'] = PLAIN.confidence_plan(r)
        r['proof_plan'] = PLAIN.proof_plan(r)
    json.dump(doc, open(OUT, 'w'), indent=1, ensure_ascii=False)
    from collections import Counter
    c = Counter(r['tab'] for r in doc['rows'])
    conf = Counter(str(r.get('confidence', ''))[:4] for r in doc['rows'])
    print(f'\n   {len(doc["rows"])} decisions in the log')
    print('   by tab        :', dict(c.most_common()))
    print('   by confidence :', dict(conf.most_common()))
    old = [r for r in doc['rows'] if str(r.get('in_use', '')).startswith('OLD')]
    print(f'   OLD, NOT IN USE: {len(old)} decision(s) replaced by a later one, each naming the row in force')
    # A HAND-WRITTEN ROW THAT MATCHES NOTHING IS WORSE THAN AN UNWRITTEN ONE (2026-09-29). The plain
    # English is keyed by a phrase from the source, and a key with a stray quote or a trailing full
    # stop matches NO row — so the sentence is written, the count says 171, and thirteen rows still
    # read as jargon. Exactly the shape CLAUDE.md warns about: a filter typed by hand, matching less
    # than it appears to, reporting clean. Now it fails.
    # A SPLIT ROW STILL COUNTS AS REACHED (2026-09-30). When a row is split, each half takes its
    # wording from the splits file, so the hand-written entry no longer shows up in `means` — but the
    # entry is still the row's IDENTITY, because the key is computed from it. Deleting it as "dead"
    # changed the key, the changelog sweep stopped recognising the row, re-added it as a new decision
    # and DEC-0002b was lost. The split parts quote the source word for word in `raw`, so `raw` is
    # read here too: the phrase IS in the log, just not where it used to be.
    hay = [str(r.get('screens') or '') + ' ' + str(r.get('means') or '') + ' ' + str(r.get('his_words') or '')
           + (' ' + str(r.get('raw') or '') if str(r.get('raw') or '').startswith('SPLIT FROM ') else '')
           for r in doc['rows']]
    dead = [k for k in PLAIN.HAND_WRITTEN if not any(PLAIN._norm(k) in PLAIN._norm(h) for h in hay)]
    if dead:
        print('   %d hand-written row(s) match NO decision — the sentence exists and reaches nobody:' % len(dead))
        for k in dead:
            print('     ' + repr(k[:90]))
        print('\n   BUILD STOPPED. Fix the key to a phrase that really appears in the source text.')
        sys.exit(1)
    # THE RATCHET, made real (2026-09-29). Every row is written; from here a NEW row arriving unwritten
    # fails the build rather than quietly lowering the proportion. The count may only rise.
    written = sum(1 for r in doc['rows'] if r.get('plain_written') == 'yes')
    unwritten = [r['id'] for r in doc['rows'] if r.get('plain_written') != 'yes']
    if unwritten:
        print('   %d row(s) are NOT written in plain English: %s' % (len(unwritten), ' '.join(unwritten[:20])))
        print('\n   BUILD STOPPED. Every decision in this log is written in words a person can read.')
        print('   Add its sentence to HAND_WRITTEN in moneykeel_decision_plain.py, keyed on a phrase')
        print('   that appears in the row\'s headline.')
        sys.exit(1)
    print(f'   PLAIN ENGLISH  : {written} of {len(doc["rows"])} rows are written in words a person can read')
    print(f'                    {len(doc["rows"]) - written} say "NOT YET WRITTEN IN PLAIN ENGLISH" on their face — a ratchet, it may only fall')
    print('   wrote', OUT)
