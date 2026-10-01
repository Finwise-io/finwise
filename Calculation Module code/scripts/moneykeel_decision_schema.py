"""THE DECISION LOG — the schema, and the one place every decision he has made is recorded.

FOUNDER, 2026-09-28: *"Rulings in master file needs to be one place to record all decisions, no matter
where they are made. All the decisions sitting in change log, standards, requirements, Audit, and
mockup files - record in separate file called decisions... After mistakes over and over, I no longer
trust you."*

He then asked for the schema to be designed as a senior product manager would: *"what information you
need to make sure when you look back you can understand decision, apply it, build it and test it
accurately."* Every column below exists because something went wrong without it, and the failure is
named on the column. Nothing here is a field a log usually has.

ONE FILE, ONE SOURCE. moneykeel_decisions.json is the source; the workbook is PRINTED from it, and the
`rulings` tab is removed from the calculation master the same day so there is one record and not two.
"""

# ── THE COLUMNS, grouped by the four things he named ─────────────────────────────────────────────
# (key, heading, why it exists — the failure it answers)
COLUMNS = [
    # UNDERSTAND IT
    ('id',          'Decision ID',
     'Issued once, never re-pointed. The design Changelog lost ten rows between two of its versions; a row with no stable identifier cannot be found missing.'),
    ('decided',     'Date decided',
     'The day HE decided it.'),
    ('recorded',    'Date recorded',
     'Separate from the day it was decided, on purpose. His 2026-09-12 correction was acted on sixteen days late; a gap between these two columns is the warning sign, and nothing showed it before.'),
    ('his_words',   'His decision — his words, verbatim',
     'Never rewritten (standing order). It is also the only defence when my paraphrase drifts from what he said.'),
    ('plain',       'WHAT IS THE DECISION? — plain English, numbered where there are several',
     'His instruction, 2026-09-28, after reading a row that said "balance authority rule gains the derive-from-holdings fallback when the broker reports no usable total": *"don\'t know what this means?"* He was right — it is unreadable. This column answers one question and nothing else: what was decided. One sentence per decision, numbered 1. 2. 3. when a row holds several, no term a person would have to look up. Where a row still needs writing it says so rather than repeating the jargon.'),
    ('means',       'What it means in practice',
     'The detail behind the plain sentence — what changes on the screen, in the money, or in how we work. His words are the authority; the plain column is what I act on; this is the working-out. If any two disagree the row is wrong.'),
    ('why',         'Why he decided it',
     'Stops me re-litigating a settled question, and stops me applying it to a case he would have decided differently. "The estimate stays federal" only makes sense with its reasoning attached.'),
    ('type',        'Type — RULE · VALUE · DESIGN · PROCESS · SCOPE',
     'A RULE is an invariant and needs a permanent guard; a VALUE is a number or word chosen and needs a pinned figure; DESIGN is a mock approved; PROCESS is how we work; SCOPE is what is in or out. Treating all five the same is how rules were pinned as one-off values and came back.'),

    # APPLY IT
    ('scope',       'Scope — app-wide · module · screen · figure',
     '"One term per concept" began as an income-screen decision and became app-wide the same day. Ambiguous scope is how a decision gets applied to too little.'),
    ('screens',     'Screens it governs',
     'So a screen task can ask what governs it and get an answer.'),
    ('governs',     'Figures and functions it governs (by identifier)',
     'His always-use-identifiers order. Without it a decision cannot be traced to the code that must honour it.'),
    ('exceptions',  'EXCEPTIONS — where this decision does NOT apply',
     'His required column. It reads "none recorded" when there are none and is never blank: blank means nobody looked.'),
    ('edges',       'Known edge cases and limits',
     'The one he found on 2026-09-28: "the Rent / Mortgage budget carries the mortgage" is right, AND it reads $100/month light when the budget and the debt disagree. That limit existed and was written nowhere.'),
    ('search',      'Search words — the plain words he would look for it by',
     'He asked "why ask again if I ruled it already?" about sweeping cash. The ruling existed and I could not find it. Discoverability is a column, not a hope.'),

    # BUILD IT
    ('changed',     'What was changed to apply it (code and file)',
     'By name, so it can be opened.'),
    ('apply_steps', 'HOW TO APPLY IT — the numbered steps',
     'His control, 2026-10-01: *"what are the steps to apply it. If these questions are not answered '
     'in the file or source of decision - guard should return failed process."* `changed` is past '
     'tense — what was already done — and a decision recorded before anything is built has nothing to '
     'put there. This column is the path FORWARD, written when the decision is recorded and before any '
     'code exists. DEC-0036 is why: his reword was recorded, mapped and counted as handled, with no '
     'statement anywhere of what to change, so it reached one of the four places that carry that '
     'sentence and sat unapplied in the other three. The gate refuses a new row without it.'),
    ('moved',       'Which figures moved, and from what to what',
     'A VALUE decision changes numbers a person sees (the emergency fund from 2.0 to 2.5 months). Without before and after, nobody can tell whether it was ever really applied.'),
    ('carriers',    'Every file that must carry it',
     'His Post Feedback Sync rule made checkable: the log, the standard, the screen rows, the working plan, the changelog, code and test. A sync gate reads this column.'),
    ('approved_on', 'Approved on which artifact version',
     'income-end-to-end_v07, not "the mock". Two of the four approved-design misses came from treating "the mock" as a single thing.'),
    ('in_use',      'STILL IN USE? — IN USE · OLD, NOT IN USE',
     'His instruction, 2026-09-29: *"just make decision mark old and not in use, see row for latest decision."* A replaced decision is a STATE, not a story — it was being written into the prose, where it cannot be sorted or filtered and where it is buried under the one thing that decides whether to act on the row at all. An OLD row names the decision that replaced it. The row is never deleted: an old build has to stay readable.'),
    ('supersedes',  'Replaces · Replaced by — the decision ID',
     'The newest approval wins (his standing order). This column is the link between the two rows, so the current decision can be opened from the old one and the other way round.'),

    # TEST IT
    ('proof',       'Proof — the test that fails if this comes back',
     'The most important column in the file. Every rule that has held here was held by something that executes. A decision with no proof is a note.'),
    ('status',      'Status — WAITING ON YOU · RULED · CODED · TESTED · VERIFIED',
     'One ladder, the same words everywhere.'),
    ('dates_done',  'Date coded · Date tested',
     ''),
    ('verified',    'VERIFIED by him — date and how',
     'Device, mock or workbook. Only his mark makes a row VERIFIED.'),

    # HOW MUCH TO TRUST THE ROW
    ('confidence',  'Confidence in this row — HIGH · MEDIUM · LOW',
     'HIGH where his verbatim words are here. LOW where I reconstructed the decision from a changelog row that only recorded what I built. Across hundreds of rows I am inferring some, and he must be able to see WHICH rather than trusting them equally.'),
    ('open_q',      'Open question on this decision — for him',
     'Where extracting it raised something only he can answer. On the row, not on a separate list that drifts out of sync.'),
    ('expect',      'File checks — what the master file must say (machine-read every build)',
     'His question of 2026-09-12, "why not tested?": a corrected row with no check is a claim. 38 of these are read against the master after every build by step B3, which is how a decision that lives in a FILE rather than in code is proved. They came here with the rulings ledger so this file is the one source.'),
    ('standard_carrier', 'The standard that carries it',
     'A decision that is not about one screen belongs in a standard, or it is only in this log — and a rule in one place is the fault this file exists to fix.'),
    ('was_ruling_id', 'Its old ruling number',
     'G37, A15 and the rest. The retired ledger is quoted across the workplan, the master and my own comments; without this column those references go nowhere.'),
    ('plain_written', 'Is the plain-English written? — yes · no',
     'So the count is visible and can be filtered, not buried in the text. It is a ratchet on every build: it may only rise. Mechanical rewriting was tried and thrown away — a glossary swapping code words for plain ones turned his own example into worse English than the jargon, so these are written by hand, row by row.'),
    ('proof_plan',  'HOW THIS GETS A TEST — the plan, on the row',
     'He asked on 2026-09-28: "what\'s the plan to test them?" A plan given in chat is the exact thing this file exists to stop — it lives in one place, nothing checks it, and it is forgotten. So each untested decision carries its own next step, by KIND, because one guard closes many rows at once: 115 are design approvals (a mock-match audit per screen), 61 are copy (the canon word list, in batches), 30 are figures (a worked example run through the door), 24 are screens (the existing band, title and type guards), 9 are files or process (an `expect` check), 9 need reading.'),
    ('confidence_plan', 'HOW THIS ROW GETS HIS WORDS — the plan, on the row',
     'He asked: "what\'s the plan to improve the confidence?" All 41 low-confidence rows came from the design Changelog alone, and four sources are still unswept — his -jj feedback workbooks, the audit files, the standards and the requirements workbooks. His actual wording is very likely in one of them, which lifts the row with no question to him. Only the residue goes to him, as a short list. Asking him to re-decide what he already wrote down is the fault, not the fix.'),
    ('raw',         'As the source records it, word for word',
     'The unedited text from the changelog, ledger or file the row came from. The plain-English columns are rewritten from it, and a rewrite can lose something, so the original stays here to be checked against. Nothing is edited out of the record, only made readable in front of it.'),
    ('source',      'Source — the file and row, or "in chat"',
     'His required column. A decision with no source cannot be re-read in the words he wrote it in.'),
]

HEADINGS = [h for _, h, _ in COLUMNS]
KEYS = [k for k, _, _ in COLUMNS]

# ── THE TABS — the same shape as the calculation master, so it reads the same way ────────────────
# Founder, 2026-09-28: "have similar tabs <one for each parent screen + multi-screen> as master
# calculation file in decision file to make it easy to read, and track."
#
# ALL DECISIONS is the authoritative list; the per-screen tabs are VIEWS printed from the same rows,
# so they cannot drift from it. Nothing is ever edited in the workbook — it is printed from the JSON,
# the same rule as the calculation master and the working plan (hand edits die).
PARENT_TABS = ['multiple_screens', 'home', 'networth', 'performance', 'cashflow', 'plan', 'menu']
TABS = ['Read me', 'ALL DECISIONS'] + PARENT_TABS + ['process-and-standards']

TAB_ABOUT = {
    'multiple_screens':     'Decisions that govern more than one parent screen, or the whole app.',
    'home':                 'Decisions about the Home screen and what greets the person.',
    'networth':             'Decisions about Net worth, accounts, holdings and debts.',
    'performance':          'Decisions about Performance, returns and the account page.',
    'cashflow':             'Decisions about income, expenses, the budget and debts in the month.',
    'plan':                 'Decisions about will my money last, the odds, retirement and goals.',
    'menu':                 'Decisions about the menu screens — insights, tips, stress test, insurance, settings.',
    'process-and-standards': 'Decisions about HOW WE WORK, and about the standards themselves — filing, naming, gates, the build rules. They govern no single screen.',
}
