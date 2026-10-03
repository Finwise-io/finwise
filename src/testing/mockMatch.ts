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
    .replace(/\p{Extended_Pictographic}|️|[ⓘ›↺·▮⌁▐＋]/gu, ' ');
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
    .replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&nbsp;/g, ' ').replace(/&minus;/g, '−').replace(/&rarr;/g, '→')
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
