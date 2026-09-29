/** THE WORKED EXAMPLES, RUN — the six steps, step 6 (2026-09-28).
 *
 *  Step 6 is the one that was never done: *"the row's worked example runs through the real
 *  orchestrator, the identifier joins them, then: file and code are both updated and they match
 *  100%."* Until today the master file's rows said what a figure MEANS and what its formula is, and
 *  a reader had to take that on trust — nothing anywhere showed the arithmetic on a real case, and
 *  nothing checked that the words and the code still agreed.
 *
 *  A worked example is the missing half. The door declares one concrete household beside the figure,
 *  in plain English with its numbers, and says what the figure comes to. This test builds that same
 *  household, calls the REAL orchestrator, writes the answer with the SAME writer the screen prints
 *  through, and fails when the two differ by a character.
 *
 *  What that buys, in the founder's four objectives: objective 3 — anyone can trace a wrong number
 *  to its engine in a minute, because the row now carries a case they can follow by hand; and the
 *  file-and-code rule — the example on the row is a printout of something that executed, not
 *  something I typed beside the code and hoped stayed true.
 *
 *  The count of figures WITHOUT one is a ratchet: it may fall, never rise.
 */
import { FIGURE_REGISTER, FIGURE_DOOR } from '../../MoneyKeel/functions/figures';
import { writeFigure } from '../../MoneyKeel/functions/_figure-spec';

/** Figures with no worked example yet. It may only ever get shorter — a new figure brings its own
 *  example, and one that is on this list leaves it and never comes back. */
const NOT_YET_WORKED = 9;

const worked = Object.entries(FIGURE_REGISTER).filter(([, f]) => f.worked);

test('every worked example gives the answer its row states — run through the real door', () => {
  const wrong: string[] = [];
  for (const [id, f] of worked) {
    const w = f.worked!;
    let got: string;
    try {
      const raw = w.run();
      got = typeof raw === 'string' ? raw : writeFigure(f, raw, { withPeriod: !!f.per });
    } catch (e: any) {
      wrong.push(`${id} ${FIGURE_DOOR[id]}: the example THREW — ${e?.message ?? e}`);
      continue;
    }
    if (got !== w.answer) {
      wrong.push(`${id} ${FIGURE_DOOR[id]} (${f.label})\n`
        + `      the row says: ${JSON.stringify(w.answer)}\n`
        + `      the code gives: ${JSON.stringify(got)}\n`
        + `      given: ${w.given}`);
    }
  }
  expect(wrong).toEqual([]);
});

test('a worked example is a case a person can follow — it states numbers, and it is not the formula again', () => {
  const thin: string[] = [];
  for (const [id, f] of worked) {
    const w = f.worked!;
    // an example with no numbers in it is prose, not a case: there is nothing to follow by hand
    if (!/\d/.test(w.given)) thin.push(`${id}: the case states no numbers`);
    if (!/\d/.test(w.answer)) thin.push(`${id}: the answer states no number`);
    if (w.given.trim().length < 30) thin.push(`${id}: the case is too short to be followed`);
    // the answer must be what the screen would print, not a sentence about it
    if (w.answer.length > 140) thin.push(`${id}: the answer is a paragraph, not a figure`);
  }
  expect(thin).toEqual([]);
});

test('THE RATCHET — the number of figures with no worked example may only fall', () => {
  const missing = Object.entries(FIGURE_REGISTER).filter(([, f]) => !f.worked).map(([id]) => id);
  if (missing.length > NOT_YET_WORKED) {
    throw new Error(
      `${missing.length} figures have no worked example; the ratchet stands at ${NOT_YET_WORKED}.\n`
      + `A figure without one has nothing that re-runs it, so its row on the master file is a claim.\n`
      + `Declare worked: { given, answer, run } on it, or lower nothing.\n`
      + missing.join(' '));
  }
  // and when it falls, it is pinned lower here in the same commit
  expect(missing.length).toBe(NOT_YET_WORKED);
});
