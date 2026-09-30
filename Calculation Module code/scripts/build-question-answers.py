#!/usr/bin/env python3
"""AN ANSWER IS A DECISION, SO IT LIVES IN THE DECISION LOG — this only prints it.

Founder, 2026-09-30:
    *"when I asked you to create one decision log and other files recording all decision no matter
    where I make that decision - how does not include updating with questions I am answering - they
    are not decision in your mind or what?"*

They are, and they were in the log from the moment he gave them — DEC-0595, DEC-0596, DEC-0597 hold
his answers to Q51, Q52 and Q53 word for word. What I never did was carry the same decision into the
OTHER file that holds it, the master's own answer column. That is his PFS rule, and I checked one file
and stopped.

Then I fixed it by inventing a SECOND home for answers, which is how two files come to disagree about
one thing. So: a decision in the log names the numbered question it answers, in its `answers` field,
and this script PRINTS moneykeel_question_answers.json from it. The master writes that into
'YOUR ANSWER — use the same number'. One decision, one place, every destination fed from it.

    python3 "Calculation Module code/scripts/build-question-answers.py"
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
LOG  = os.path.join(HERE, 'moneykeel_decisions_in_chat.json')
OUT  = os.path.join(HERE, 'moneykeel_question_answers.json')

log = json.load(open(LOG))['rows']
rows = {}
for r in log:
    for q in r.get('answers', []):
        cur = rows.setdefault(q, {'answered': r['decided'], 'his_words': [], 'what_was_built': []})
        cur['his_words'].append(str(r['his_words']).strip())
        cur['what_was_built'].append(str(r.get('plain', '')).strip())
        # the EARLIEST date he touched it is when he answered; a later line is him confirming
        if str(r['decided']) < str(cur['answered']):
            cur['answered'] = r['decided']

for q, v in rows.items():
    v['his_words'] = ' … '.join(dict.fromkeys(v['his_words']))
    v['what_was_built'] = ' '.join(dict.fromkeys(v['what_was_built']))[:900]

json.dump({
 "_about": ("GENERATED — do not hand-edit, it dies on the next build. Printed from "
  "moneykeel_decisions_in_chat.json by build-question-answers.py: every decision there whose `answers` "
  "field names a numbered question appears here, and build-moneykeel-master.py writes it into "
  "'YOUR ANSWER — use the same number'. An answer to a question IS a decision, so it lives in the "
  "decision log and nowhere else; this file is a printout, which is why it cannot drift from the log."),
 "generated_from": "moneykeel_decisions_in_chat.json",
 "rows": rows,
}, open(OUT, 'w'), indent=1, ensure_ascii=False)

print('%d answer(s) printed from the decision log: %s' % (len(rows), ' '.join(sorted(rows))))
for q, v in sorted(rows.items()):
    print('   %s  answered %s  — %s' % (q, v['answered'], v['his_words'][:70]))
if not rows:
    print('\nNONE. If he has answered a numbered question, the decision in the log needs an "answers" field '
          'naming it — that is the one link between his answer and the file that has to show it.')
