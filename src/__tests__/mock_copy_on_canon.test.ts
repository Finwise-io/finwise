/** THE LIVE MOCKS OBEY THE SAME CANON THE CODE DOES.
 *
 *  WHY THIS EXISTS (2026-09-26). The founder: "fix cashflow screens before moving forward." Three of
 *  the four cash-flow mocks were approved BEFORE the one-term rulings of 2026-09-10 and 2026-09-12 and
 *  still drew "Spending", "In (take-home)", "Out (bills + debt)", "spending plan", "/mo" — words the app
 *  had already stopped saying. Nothing caught it, because the canon guard reads code and a mock is not
 *  code. So a mock kept teaching the retired word back to whoever built from it.
 *
 *  WHAT IT READS: only what is DRAWN ON A PHONE — the text inside `class="phone"`. That is the copy a
 *  person would meet. A mock's own notes, its "What changed from vNN" block and its design commentary
 *  are ABOUT the screen, and they quote retired words on purpose ("'In (take-home)' is retired"), so
 *  they are not scanned. Archived versions are never scanned: they are the record of what was, and
 *  rewriting history is the opposite of the point.
 *
 *  The canon itself lives in the standard, not here — the same table the code's guard reads.
 */
import * as fs from 'fs';
import * as path from 'path';
import { readCanon } from './one_term_per_concept.test';

const ROOT = path.join(__dirname, '..', '..');
const DOCS = path.join(ROOT, 'MoneyKeel', 'documents');
const STANDARD = 'MoneyKeel/documents/standards/moneykeel_naming_spec_calculation-vocabulary_v01.md';

/** Every live mock: `*_mock_*.html` outside `archive/`. */
function liveMocks(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === 'archive' || d.name.startsWith('JJ-feedback') ? [] : liveMocks(p);
    return /_mock_.*\.html$/.test(d.name) ? [p] : [];
  });
}

/** The drawn screens, as words: each `class="phone"` block, tags stripped, entities decoded. */
export function phoneCopy(html: string): string[] {
  const out: string[] = [];
  const re = /<div[^>]*class="[^"]*\bphone\b[^"]*"[^>]*>/g;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    // walk divs from the opening tag to its matching close, so nested cards come with it
    let depth = 0, i = m.index;
    const tag = /<\/?div\b[^>]*>/g;
    tag.lastIndex = m.index;
    for (let t = tag.exec(html); t; t = tag.exec(html)) {
      depth += t[0].startsWith('</') ? -1 : 1;
      if (depth === 0) { i = t.index + t[0].length; break; }
    }
    out.push(html.slice(m.index, i));
  }
  return out.map((block) => block
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&middot;/g, '·').replace(/&rarr;/g, '→')
    .replace(/&ldquo;|&rdquo;/g, '"').replace(/&rsquo;/g, '’')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim());
}

test('every live mock draws the canon words on its phone frames', () => {
  const rules = readCanon(fs.readFileSync(path.join(ROOT, STANDARD), 'utf8'));
  const offences: string[] = [];
  const unscannable: string[] = [];
  const seenMocks = liveMocks(DOCS);
  for (const file of seenMocks) {
    const rel = path.relative(ROOT, file);
    const frames = phoneCopy(fs.readFileSync(file, 'utf8'));
    if (frames.length === 0) { unscannable.push(rel); continue; }
    for (const text of frames) {
      for (const r of rules) {
        const hit = text.match(r.re);
        if (hit) offences.push(`${rel} — cluster ${r.cluster} draws "${hit[0]}" → the one word is "${r.word}"`);
      }
    }
  }
  // Visible, not silent: a mock drawn in a format with no phone block cannot be read this way.
  expect(unscannable).toEqual(['MoneyKeel/documents/plan/moneykeel_pres_mock_plan_v06.html']);
  // COVERAGE — this guard must have actually looked at something (2026-09-28). It filters files and
  // records with typed patterns, and asserted nothing about how many it saw, so a pattern that stopped
  // matching would have turned it into a test that passes by looking at nothing. That is how step B6
  // came to read 42 of 251 rows and report itself clean, and how the orphan-route guard was built too
  // narrow three times. A guard that cannot prove it looked is not a guard.
  expect(seenMocks.length).toBeGreaterThanOrEqual(10);   // ten live mocks on 2026-09-28
  expect([...new Set(offences)]).toEqual([]);
});
