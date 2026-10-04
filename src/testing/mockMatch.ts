/** HOLDING A BUILT SCREEN AGAINST ITS APPROVED DRAWING, WORD FOR WORD — the shared method.
 *
 *  The mock-match standing order (2026-08-10): take every visible word of the drawing, in order; take
 *  every visible word of the rendered screen, in order; the two are the same stream or the screen does
 *  not match. A presence check ("the text is somewhere on screen") never proves a match.
 *
 *  Figures and dates are DATA, so each is compared as a token — "$123,000" and "$52,704" are both "a
 *  dollar amount here". Glyphs that are not words (the ⓘ, the ›, an icon) are dropped on both sides.
 *
 *  What this cannot see, and no caller may claim it does: colour, size, spacing, alignment.
 */
import * as fs from 'fs';
import * as path from 'path';

const MON = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*';

/** One stream of words. `names` are the account or person names a fixture may spell differently. */
export function norm(lines: string[], names: RegExp[] = []): string {
  let s = lines.join(' ').toLowerCase()
    .replace(/[’‘]/g, "'").replace(/[“”]/g, '"')
    .replace(/\p{Extended_Pictographic}|️|\u200D|[\uE000-\uF8FF]|[ⓘ›↺·▮⌁▐＋]/gu, ' ');   // icons: emoji, the joiner between two of them, and icon-font glyphs (private-use codes)
  for (const n of names) s = s.replace(n, '<name>');
  return s
    .replace(new RegExp(`${MON} \\d{1,2}(, \\d{4})?`, 'g'), '<date>')
    .replace(/[~]?[−-]?\$[\d,]+(\.\d+)?/g, '$#').replace(/[+−-]?\d+(\.\d+)?%/g, '#%').replace(/\d+(\.\d+)?/g, '#')
    .replace(/\s+/g, ' ').trim();
}

/** Every text line of the drawing, tags gone. `strip` removes markup that is not part of the screen
 *  (change-mark badges, the drawing's own "i" for an info dot). */
export function drawingLines(file: string, strip: RegExp[] = []): string[] {
  let body = fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8')
    .replace(/^[\s\S]*<body/, '<body').replace(/<(script|style)[\s\S]*?<\/\1>/g, '').replace(/<!--[\s\S]*?-->/g, '');
  for (const r of strip) body = body.replace(r, '');
  return body.replace(/<[^>]+>/g, '\n')
    .replace(/&amp;/g, '&').replace(/&#39;|&#x27;|&rsquo;/g, "'").replace(/&nbsp;/g, ' ').replace(/&minus;/g, '−').replace(/&rarr;/g, '→')
    .replace(/&ldquo;|&rdquo;|&quot;/g, '"').replace(/&mdash;/g, '—').replace(/&middot;/g, '·').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/** Every visible Text of a rendered tree, in order (pass `screen.toJSON()`). */
export function builtLines(tree: any): string[] {
  const out: string[] = [];
  const text = (n: any): string => (n == null ? '' : typeof n === 'string' ? n : Array.isArray(n) ? n.map(text).join('') : (n.children ?? []).map(text).join(''));
  const walk = (n: any) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.type === 'Text') { const t = text(n).replace(/\s+/g, ' ').trim(); if (t) out.push(t); return; }
    (n.children ?? []).forEach(walk);
  };
  walk(tree);
  return out;
}

/** Where two streams part, with the words either side — a failure has to say WHERE. '' when equal. */
export function firstDifference(drawn: string, built: string): string {
  const x = drawn.split(' '), y = built.split(' ');
  let i = 0; while (i < x.length && i < y.length && x[i] === y[i]) i += 1;
  if (i === x.length && i === y.length) return '';
  return `at word ${i} of ${x.length} drawn / ${y.length} built:\n  DRAWN … ${x.slice(Math.max(0, i - 10), i + 16).join(' ')}\n  BUILT … ${y.slice(Math.max(0, i - 10), i + 16).join(' ')}`;
}

/** For a drawing that shows only PART of a screen: are the drawn words in the built screen, in order
 *  and unbroken? '' when they are; otherwise where the longest run parts, with the words either side.
 *  What this does not hold, and the caller must say so: the built words before and after the run. */
export function firstBreakInside(drawn: string, built: string): string {
  const x = drawn.split(' '), y = built.split(' ');
  let best = -1, bestAt = 0;
  for (let start = 0; start < y.length; start += 1) {
    if (y[start] !== x[0]) continue;
    let i = 0; while (i < x.length && start + i < y.length && x[i] === y[start + i]) i += 1;
    if (i === x.length) return '';
    if (i > best) { best = i; bestAt = start; }
  }
  if (best < 0) return `the first drawn word "${x[0]}" is nowhere on the built screen:\n  DRAWN … ${x.slice(0, 20).join(' ')}\n  BUILT … ${y.slice(0, 30).join(' ')}`;
  return `the run breaks at word ${best} of ${x.length} drawn:\n  DRAWN … ${x.slice(Math.max(0, best - 10), best + 16).join(' ')}\n  BUILT … ${y.slice(Math.max(0, bestAt + best - 10), bestAt + best + 16).join(' ')}`;
}

/** For a drawing that leaves out part of a form: which drawn lines are NOT on the built screen, in the
 *  drawn order? Empty when every drawn line is there and in order. The built screen may carry lines
 *  between them — the caller must say which, because this does not hold them. */
export function missingInOrder(drawn: string[], built: string[]): string[] {
  const b = built.map((l) => norm([l]));
  const out: string[] = [];
  let at = 0;
  for (const line of drawn) {
    const want = norm([line]);
    if (!want) continue;
    const i = b.findIndex((x, k) => k >= at && x === want);
    if (i < 0) out.push(line); else at = i + 1;
  }
  return out;
}
