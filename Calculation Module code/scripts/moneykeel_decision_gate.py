"""NOTHING ENTERS THE DECISION LOG WITHOUT A PATH TO APPLY IT — his two controls, 2026-10-01.

HIS WORDS, control 1: *"for every new decision to be written to decision log - guard should ask three
questions (a) what's impacted - screens, metrics, functions, orchestrators. (b) what changes with this
decision. (c) what are the steps to apply it. If these questions are not answered in the file or source
of decision - guard should return failed process with comment 'not added to decision log as not clear
path defined to apply it to the app.'"*

HIS WORDS, control 2: *"guard should screen if there is prior decision for same thing - if yes, it
should fail writing and ask - prior decision 'xxxxx' taken on <date>, current decision 'xxxx' <date>.
Should new decision replace old?"*

WHY BOTH, measured rather than argued. The Net worth compliance validation of 2026-10-01 found four
breaches, and these two controls are the root cause of two of them:

  · DEC-0036, his reword of the drawing-too-much heads-up, was recorded, mapped, and counted as
    handled — with no statement anywhere of what to change. It reached ONE of the four places that
    carry that sentence and sat unapplied in the other three for weeks. A recorded decision with no
    path is a note, and a note is what everyone assumed was a fix.
  · DEC-0104 and DEC-0109 are the SAME decision, ruled three weeks apart, because the first sweep
    missed a screen and he had to say it again. Nothing linked them, so the second looked like new
    work rather than evidence that the first had failed.

TWO DESIGN CALLS, stated plainly so they can be overruled:

1 · IT BINDS NEW DECISIONS AND RATCHETS THE OLD ONES. 148 of the 492 in force answer all three
    questions today; 344 do not. Failing the build on all 344 would leave it red forever and the
    control would be switched off within a day — which is how a gate becomes decoration. So a NEW row
    is refused outright, and the 344 are carried as a debt that prints its TRUE number every build and
    may only fall (his standing order, 2026-09-28).

2 · THE DUPLICATE TEST DEMANDS TWO KINDS OF AGREEMENT, not one. A pair is only raised when the two
    decisions govern some of the same rows AND use the same distinctive words. Words alone matched 30
    unrelated pairs when tried — his decisions share vocabulary constantly — and a gate that cries
    wolf is one he stops reading. Rows alone would pair every decision about the same screen.

WHO ANSWERS THE THREE QUESTIONS. Not him. He has said he will not answer questions in a file, and
these are not questions for him — they are the work I must have done before claiming a decision is
recorded. The gate forces me to know the path before I write it down.

WHO ANSWERS THE SUPERSEDE QUESTION. The gate prints it at build time, so I meet it first. Where the
code settles it — same rows, same words, later date — I mark the older row OLD, NOT IN USE with the
newer one named on it, and say so. It reaches him only where the two genuinely differ in substance,
which is the one case his standing order against questions leaves open.
"""
import re
from datetime import date

# The last decision recorded before these controls existed. Anything above it is NEW and is bound.
BASELINE_ID = 'DEC-0643'
BASELINE_DATE = '2026-10-01'

REFUSAL = ('not added to decision log as not clear path defined to apply it to the app.')

EMPTY = {'', 'none', 'none recorded', 'n/a', 'tbd', 'not recorded', '-', '—', 'unknown', '?'}


def _said(row, *keys):
    """Has any of these columns actually been answered? A placeholder is not an answer — 'none
    recorded' is the correct value for the exceptions column and tells us nothing about a path."""
    for k in keys:
        v = str(row.get(k) or '').strip()
        if v and v.lower() not in EMPTY and len(v) > 3:
            return True
    return False


def three_questions(row):
    """His three questions, in his order. Returns the ones left unanswered, by name."""
    missing = []
    if not _said(row, 'governs', 'screens'):
        missing.append("(a) what's impacted — no screen, figure, function or orchestrator named")
    if not _said(row, 'means', 'moved'):
        missing.append('(b) what changes with this decision — nothing recorded')
    if not _said(row, 'apply_steps', 'changed', 'carriers'):
        missing.append('(c) the steps to apply it — no step, change or carrying file named')
    return missing


def is_new(row):
    """A decision recorded after the controls came in. Either its id is above the baseline or it was
    recorded on or after the day they started."""
    rid = str(row.get('id') or '')
    if re.fullmatch(r'DEC-\d{4}', rid) and rid > BASELINE_ID:
        return True
    return str(row.get('recorded') or '') > BASELINE_DATE


# ── control 2 · is this the same thing he has already decided? ───────────────────────────────────
STOP = set('''about above after again against already also always another answer answers because
 been before being below better between both called cannot change changed changes could decision
 decisions does doing done during each either enough every everything except figure figures first
 from gets give given gives going have having here house instead into itself just know later less
 like line lines little long look looks made make makes many means might more most much must name
 named names need needs never nothing number numbers often once only other others over owns part
 people person place places plain point points quite rather read really right rows said same says
 screen screens seen separate shall should show shows since some something sort still such take
 takes than that their them then there these they thing things think this those three through time
 times today total totals under until upon used uses using very want wants were what when where
 which while will with within without word words work works would your yours founder ruling ruled
 wording words copy'''.split())


def _subject(row):
    """The words that make this decision recognisable, with the vocabulary everything shares removed."""
    text = ' '.join(str(row.get(k) or '') for k in ('his_words', 'plain', 'means', 'search')).lower()
    return {w for w in re.findall(r"[a-z][a-z\-']{3,}", text) if w not in STOP}


def _rows_of(row):
    """The identifiers and screens it governs — what it actually touches."""
    text = ' '.join(str(row.get(k) or '') for k in ('governs', 'screens'))
    return (set(re.findall(r'MK-[A-Z]{2}-[MFOI]-\d{3}', text))
            | set(re.findall(r'[A-Z][A-Za-z]+Screen', text))
            | set(re.findall(r'src/[\w/.\-]+', text)))


# TUNED AGAINST A PAIR ALREADY KNOWN TO BE REAL. DEC-0104 and DEC-0109 are the same decision ruled
# three weeks apart, so any setting that loses them is wrong whatever else it does. Measured on the 492
# in force: five shared words at 34% raised 59 pairs; six words at 45% raised 10 but DROPPED the real
# one. These three thresholds keep it and raise 26, of which about a third are genuinely one decision
# said twice — readable by hand, which is the only test that matters for a list someone must triage.
MIN_SHARED_WORDS = 5      # an absolute floor: two generic words on one screen is not a repeat
MIN_SHARE = 0.40          # …and that must be a real share of the smaller decision's subject
MIN_SUBJECT = 6           # a decision with fewer distinctive words than this is too thin to compare


def prior_decisions(rows, min_words=MIN_SHARE, min_rows=1):
    """Pairs where a decision repeats one he already made. Both kinds of agreement are required.

    Returns (new_row, prior_row, shared_words, shared_rows), newest first, oldest prior first — so the
    pair reads the way he asked for it: the prior decision, then the current one.
    """
    live = [r for r in rows if 'OLD' not in str(r.get('in_use', ''))]
    cache = {r['id']: (_subject(r), _rows_of(r)) for r in live}
    by_date = sorted(live, key=lambda r: (str(r.get('decided') or r.get('recorded') or ''), r['id']))
    pairs = []
    for i, new in enumerate(by_date):
        nw, nr = cache[new['id']]
        if len(nw) < MIN_SUBJECT or not nr:
            continue
        for prior in by_date[:i]:
            pw, pr = cache[prior['id']]
            if len(pw) < MIN_SUBJECT:
                continue
            shared_rows = nr & pr
            if len(shared_rows) < min_rows:
                continue
            shared = nw & pw
            share = len(shared) / min(len(nw), len(pw))
            if len(shared) >= MIN_SHARED_WORDS and share >= min_words:
                pairs.append((new, prior, shared, shared_rows))
    return pairs


def resolved(new, prior):
    """Has this pair already been settled? Two ways, and the gate honours both.

    A pair is settled when the newer decision REPLACES the older one — `supersedes` names it — or when
    it is NOT a repeat at all and says why on `not_a_repeat_of`. The first version of this control had
    only the first way, so a false pair could never be cleared: DEC-0648 (archive the old Invest mock)
    was raised against DEC-0030 (keep the look-back card on the holding page) because both touch the
    holding screen and share the words invest, page, detail and drawing. They are different decisions.
    With no way to say so, the only ways to a green build were to mark a live decision superseded,
    which is a lie in the record, or to loosen the detector, which is how a gate stops working.
    """
    for key in ('supersedes', 'not_a_repeat_of'):
        if prior['id'] in str(new.get(key) or '') or new['id'] in str(prior.get(key) or ''):
            return True
    return False


def supersede_question(new, prior):
    """His wording for the question the gate asks, with the two decisions and their dates in it."""
    def short(r):
        t = str(r.get('his_words') or r.get('plain') or '').strip().replace('\n', ' ')
        return (t[:150] + '…') if len(t) > 150 else t
    return (f'prior decision "{short(prior)}" taken on {prior.get("decided") or prior.get("recorded")}'
            f' ({prior["id"]}), current decision "{short(new)}" '
            f'{new.get("decided") or new.get("recorded")} ({new["id"]}).'
            f' Should new decision replace old?')


# ── THE DEBT, carrying its TRUE number (standing order, 2026-09-28) ──────────────────────────────
#
# These two controls bind what comes NEXT. What is already in the log was written before they existed,
# and the numbers below are what that cost, measured on 2026-10-01 rather than estimated:
NO_PATH = 343             # (344 of 492 until DEC-0104 was marked restated as DEC-0109.)
                          # of the 492 decisions in force, this many do not answer all three questions.
                          # 148 do. Every one of the 344 is a decision nobody can act on without
                          # going back to the conversation it came from — which is the hole DEC-0036
                          # fell through. Lower it by answering them, never by loosening the test.
DUPLICATE_PAIRS = 25      # decisions that appear to repeat an earlier one. Resolve a pair by marking
                          # the older row OLD, NOT IN USE with the newer named on it, or by recording
                          # what is genuinely different. Was 26 until DEC-0104 was marked restated as
                          # DEC-0109 — the pair this detector was tuned on, and the one that let the
                          # odds wording split for seven weeks.
