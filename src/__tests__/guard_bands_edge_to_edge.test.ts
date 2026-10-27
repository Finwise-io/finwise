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
 *  HOW IT READS THE CODE (rebuilt 2026-10-25, the Performance drawing check MM-PF D1 and D2). For each
 *  `<SectionBand`, it reads the band's WHOLE opening tag and walks outwards through the containers that
 *  hold it (View, TouchableOpacity, Pressable, Animated.View). The first container whose style is a card
 *  (a style whose own definition sets `padding` or `paddingHorizontal` AND a surface) decides: the band
 *  must carry `inCard`, and its `inset` must equal that padding. A container with no such style is a
 *  wrapper that adds no gutter, and the walk goes on past it. A band with no card around it is on the
 *  page: it shares the page's gutter with every other band on that screen, which is the Net worth pattern.
 *
 *  THE BLIND SPOT IT HAD, AND WHY IT IS CLOSED. The first version read one line at a time. A card whose
 *  opening tag ran over two lines (`<View style={s.card} accessible` / `accessibilityLabel={…}>`) did not
 *  match, so the walk went straight past it and called the band "on the page". That is how Holding
 *  detail's VS THE STOCK MARKET bar and Look back's WHAT ACTUALLY HAPPENED bar sat 20 and 12 points short
 *  of their cards' edges while this guard read green, and how What-if, Will it last, Multi-goal and
 *  Required withdrawals carried the same fault. A band whose own tag ran over two lines had its `inCard`
 *  and `inset` unread for the same reason. Both are read whole now, and every band is counted.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const DIRS = [path.join(ROOT, 'src', 'screens'), path.join(ROOT, 'src', 'components')];
const SCALE: Record<string, number> = { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32 };

/** `name: { … padding: Spacing.base … backgroundColor: … }` → the padding in points. */
export function paddedContainers(src: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of src.matchAll(/(\w+):\s*\{([^{}]*)\}/g)) {
    const [, name, body] = m;
    const pad = body.match(/\bpadding(?:Horizontal)?:\s*(?:Spacing\.(\w+)|(\d+))/);
    if (!pad) continue;
    const hasSurface = /backgroundColor|borderTopWidth|borderWidth/.test(body);
    if (!hasSurface) continue;
    const points = pad[1] ? SCALE[pad[1]] : Number(pad[2]);
    if (points) out[name] = points;
  }
  return out;
}

/** `name: { … marginHorizontal: -Spacing.lg … }` → the points a wrapper takes back from the card around it, on each side
 *  (a "bleed" wrapper, e.g. the account page's sheetBleed: the sheet's own padding, taken back on both sides). */
export function bleedWrappers(src: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of src.matchAll(/(\w+):\s*\{([^{}]*)\}/g)) {
    const neg = m[2].match(/\bmarginHorizontal:\s*-\s*(?:Spacing\.(\w+)|(\d+))/);
    if (neg) out[m[1]] = neg[1] ? SCALE[neg[1]] : Number(neg[2]);
  }
  return out;
}

/** The end of the JSX opening tag that starts at `at` (the index of its "<"): the first ">" outside braces and
 *  quotes. A ">" inside `{() => …}` or a string is not the end of the tag — reading to the first ">" was wrong. */
export function tagEnd(src: string, at: number): number {
  let depth = 0; let quote: string | null = null;
  for (let i = at + 1; i < src.length; i += 1) {
    const c = src[i];
    if (quote) { if (c === quote && src[i - 1] !== '\\') quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    else if (c === '}') depth -= 1;
    else if (c === '>' && depth === 0) return i;
  }
  return src.length - 1;
}

const CONTAINER = /<\/?(View|TouchableOpacity|Pressable|Animated\.View)\b/g;
type Tag = { at: number; close: boolean; self: boolean; style: string };
/** Every container tag in a file, in order, each read whole however many lines it runs over. */
export function containerTags(src: string): Tag[] {
  const out: Tag[] = [];
  for (const m of src.matchAll(CONTAINER)) {
    const at = m.index!;
    if (m[0].startsWith('</')) { out.push({ at, close: true, self: false, style: '' }); continue; }
    const end = tagEnd(src, at);
    const text = src.slice(at, end + 1);
    // the StyleSheet may be called anything — `styles.card`, `s.card`, `st.card` (2026-09-26)
    const style = text.match(/\bstyle=\{\s*\[?\s*!?\s*[A-Za-z_$][\w$]*\.(\w+)/)?.[1] ?? '';
    out.push({ at, close: false, self: text.endsWith('/>'), style });
  }
  return out;
}

/** The style names of the containers that hold the band at `at`, nearest first. */
export function enclosingStyles(tags: Tag[], at: number): string[] {
  const out: string[] = []; let depth = 0;
  for (let k = tags.length - 1; k >= 0; k -= 1) {
    const t = tags[k];
    if (t.at >= at) continue;
    if (t.close) { depth += 1; continue; }
    if (t.self) continue;
    if (depth > 0) { depth -= 1; continue; }
    out.push(t.style);
  }
  return out;
}

const files = DIRS.flatMap((d) => fs.readdirSync(d).filter((n) => /\.tsx$/.test(n) && !/\.test\./.test(n)).map((n) => path.join(d, n)));

/** Every band in every file: where it is, the card it sits in (if any), and what it was told. */
function readBands() {
  const out: { rel: string; card: string | null; pad: number | null; inCard: boolean; inset: number; bleed: number }[] = [];
  let written = 0;
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    if (!src.includes('<SectionBand')) continue;
    written += (src.match(/<SectionBand\b/g) ?? []).length;
    const cards = paddedContainers(src);
    const bleeds = bleedWrappers(src);
    const tags = containerTags(src);
    for (const m of src.matchAll(/<SectionBand\b/g)) {
      const at = m.index!;
      const tag = src.slice(at, tagEnd(src, at) + 1);
      const rel = `${path.relative(ROOT, file)}:${src.slice(0, at).split('\n').length}`;
      const around = enclosingStyles(tags, at);
      const cardAt = around.findIndex((st) => cards[st] !== undefined);
      const card = cardAt < 0 ? null : around[cardAt];
      // what the wrappers between the band and its card take back from the card's padding
      const bleed = (cardAt < 0 ? around : around.slice(0, cardAt)).reduce((t, st) => t + (bleeds[st] ?? 0), 0);
      // inset is written either as points or as a scale name — `inset={16}` and `inset={Spacing.base}`
      // are the same instruction, and reading only the first called a correct band wrong (2026-09-26).
      const named = tag.match(/\binset=\{Spacing\.(\w+)\}/);
      const pts = tag.match(/\binset=\{(\d+)\}/);
      const inset = named ? SCALE[named[1]] : pts ? Number(pts[1]) : 12;   // inCard's default is Spacing.md
      out.push({ rel, card, pad: card ? cards[card] : null, inCard: /\binCard\b/.test(tag), inset, bleed });
    }
  }
  return { out, written };
}

test('every dark-green band inside a card bleeds to that card’s edges', () => {
  const { out: bands, written } = readBands();
  const offences: string[] = [];
  for (const b of bands) {
    if (b.card == null) continue;              // on the page, not in a card
    // how far the bar reaches out: its own inCard inset, plus what any wrapper around it takes back
    const reach = (b.inCard ? b.inset : 0) + b.bleed;
    if (reach === 0) { offences.push(`${b.rel} — inside a card styled ${b.card} (padding ${b.pad}) with no inCard: the bar stops ${b.pad}pt short of each edge`); continue; }
    if (reach !== b.pad) offences.push(`${b.rel} — the bar reaches out ${reach}pt but ${b.card} pads ${b.pad}: it misses the edge by ${Math.abs((b.pad ?? 0) - reach)}pt`);
  }
  // COVERAGE — this guard must prove it looked (2026-09-28; rebuilt 2026-10-25). It saw every band written in the
  // screen and component files, each one classed as in a card or on the page, and none skipped. 144 bands in 35 files
  // on 2026-10-25, 72 of them in a card: floors, so a pattern that stops matching goes red rather than quiet.
  const inCards = bands.filter((b) => b.card != null).length;
  const onPage = bands.filter((b) => b.card == null).length;
  expect(files.length).toBeGreaterThanOrEqual(30);   // the screen and component files it walks
  expect(bands.length).toBe(written);                // every band written was read — none skipped
  expect(inCards + onPage).toBe(bands.length);       // and each one classed
  // 2026-10-25 (Cash flow drawing match CF-02, CF-19): seven bands with no total became the drawing's quiet grey labels — the
  // Income tab's THIS MONTH, YOUR SOURCES and RECEIVED THIS MONTH, the Debts tab's YOUR DEBT, YOUR DEBTS and PROGRESS, and the
  // first open's SET UP YOUR MONTH: 137 bands, 66 in a card, on that day
  expect(bands.length).toBeGreaterThanOrEqual(135);
  expect(inCards).toBeGreaterThanOrEqual(64);        // half the bands sit in a card; a reader that finds none is blind again
  expect(offences).toEqual([]);
});

test('the reader sees a card whose opening tag runs over two lines, and a band whose own tag does (the old blind spot)', () => {
  // the shape Holding detail and Look back had: the card's tag ends on the next line, after an arrow function's "=>"
  const src = [
    'const s = StyleSheet.create({ card: { backgroundColor: Colors.cardBg, padding: Spacing.lg } });',
    '<View style={s.card} accessible',
    '  accessibilityLabel={`x`} onLayout={(e) => go(e)}>',
    '  <SectionBand',
    '    inCard inset={20} title="ONE" />',
    '  <SectionBand title="TWO" />',
    '</View>',
    '<SectionBand title="THREE" />',
  ].join('\n');
  const cards = paddedContainers(src); const tags = containerTags(src);
  const at = [...src.matchAll(/<SectionBand\b/g)].map((m) => m.index!);
  expect(at).toHaveLength(3);
  expect(enclosingStyles(tags, at[0]).find((st) => cards[st] !== undefined)).toBe('card');
  expect(src.slice(at[0], tagEnd(src, at[0]) + 1)).toMatch(/inCard inset=\{20\}/);
  expect(enclosingStyles(tags, at[1]).find((st) => cards[st] !== undefined)).toBe('card');   // would be an offence: no inCard
  expect(enclosingStyles(tags, at[2]).find((st) => cards[st] !== undefined)).toBeUndefined();  // on the page
  // a wrapper that takes the card's padding back on both sides is read as reaching the edge
  expect(bleedWrappers('const s = StyleSheet.create({ sheetBleed: { marginHorizontal: -Spacing.lg } });')).toEqual({ sheetBleed: 20 });
});
