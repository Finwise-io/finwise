/** A DARK-GREEN BAR ALWAYS RUNS EDGE TO EDGE (founder, 2026-08-11, restated 2026-09-14 — "in the app
 *  and in every mock, change marks included").
 *
 *  WHAT BREAKS IT. `SectionBand` stretches to its parent's CONTENT width. Inside a card, that stops at
 *  the card's padding — so the bar floats with a gutter down each side. `inCard` cancels the padding
 *  with a negative margin, and `inset` says how much padding to cancel. A band inside a card therefore
 *  needs BOTH, matched to that card's own padding; one without them is a bar that does not reach the
 *  edge, sitting beside siblings on the same screen that do.
 *
 *  WHY A GUARD (2026-09-26). Cash flow had it both ways at once: six bands bled to the card edge and
 *  ten did not, on one screen, and reading did not catch it in four passes over that file. This counts.
 *
 *  HOW IT READS THE CODE. For each `<SectionBand`, it walks backwards to the nearest enclosing `<View`
 *  and reads its style name. If that style is a card (a style whose own definition sets `padding` or
 *  `paddingHorizontal` AND a background), the band must carry `inCard`, and its `inset` must equal that
 *  padding. A band on the page — no card around it — is left alone: it shares the page's gutter with
 *  every other band on that screen, which is the Net worth pattern.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const DIRS = [path.join(ROOT, 'src', 'screens'), path.join(ROOT, 'src', 'components')];

/** `name: { … padding: Spacing.base … backgroundColor: … }` → the padding in points. */
export function paddedContainers(src: string): Record<string, number> {
  const SPACING: Record<string, number> = { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32 };
  const out: Record<string, number> = {};
  for (const m of src.matchAll(/(\w+):\s*\{([^{}]*)\}/g)) {
    const [, name, body] = m;
    const pad = body.match(/\bpadding(?:Horizontal)?:\s*(?:Spacing\.(\w+)|(\d+))/);
    if (!pad) continue;
    const hasSurface = /backgroundColor|borderTopWidth|borderWidth/.test(body);
    if (!hasSurface) continue;
    const points = pad[1] ? SPACING[pad[1]] : Number(pad[2]);
    if (points) out[name] = points;
  }
  return out;
}

/** The style name of the nearest enclosing `<View>` above `line`, or null when the band sits on the page. */
export function enclosingView(lines: string[], line: number): string | null {
  let depth = 0;
  for (let j = line - 1; j >= 0; j--) {
    depth += (lines[j].match(/<\/View>/g) ?? []).length;
    for (const m of [...lines[j].matchAll(/<View\b([^>]*?)(\/?)>/g)].reverse()) {
      if (m[2] === '/') continue;
      if (depth > 0) { depth -= 1; continue; }
      // the StyleSheet may be called anything — `styles.card`, `s.card`, `st.card` (2026-09-26: the
      // first version of this guard only knew the name `styles`, and so walked straight past seven
      // bands on Account detail and six on Holding detail, which use `s.`)
      return m[1].match(/\b[A-Za-z_$][\w$]*\.(\w+)/)?.[1] ?? '';
    }
  }
  return null;
}

const files = DIRS.flatMap((d) => fs.readdirSync(d).filter((n) => /\.tsx$/.test(n) && !/\.test\./.test(n)).map((n) => path.join(d, n)));

test('every dark-green band inside a card bleeds to that card’s edges', () => {
  const offences: string[] = [];
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    if (!src.includes('<SectionBand')) continue;
    const cards = paddedContainers(src);
    const lines = src.split('\n');
    lines.forEach((l, i) => {
      if (!l.includes('<SectionBand')) return;
      const wrapper = enclosingView(lines, i);
      const pad = wrapper ? cards[wrapper] : undefined;
      if (pad === undefined) return;              // on the page, not in a card
      const rel = `${path.relative(ROOT, file)}:${i + 1}`;
      if (!/\binCard\b/.test(l)) {
        offences.push(`${rel} — inside <View style={styles.${wrapper}}> (padding ${pad}) with no inCard: the bar stops ${pad}pt short of each edge`);
        return;
      }
      // inset is written either as points or as a scale name — `inset={16}` and `inset={Spacing.base}`
      // are the same instruction, and reading only the first called a correct band wrong (2026-09-26).
      const SCALE: Record<string, number> = { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32 };
      const named = l.match(/inset=\{Spacing\.(\w+)\}/);
      const inset = l.match(/inset=\{(\d+)\}/);
      const given = named ? SCALE[named[1]] : inset ? Number(inset[1]) : 12;   // inCard's default is Spacing.md
      if (given !== pad) offences.push(`${rel} — inCard inset=${given} but styles.${wrapper} pads ${pad}: the bar misses the edge by ${Math.abs(pad - given)}pt`);
    });
  }
  // COVERAGE — this guard must have actually looked at something (2026-09-28). It filters files and
  // records with typed patterns, and asserted nothing about how many it saw, so a pattern that stopped
  // matching would have turned it into a test that passes by looking at nothing. That is how step B6
  // came to read 42 of 251 rows and report itself clean, and how the orphan-route guard was built too
  // narrow three times. A guard that cannot prove it looked is not a guard.
  expect(files.length).toBeGreaterThanOrEqual(30);   // the screen and component files it walks
  expect(offences).toEqual([]);
});
