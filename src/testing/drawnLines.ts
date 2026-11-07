/** A DRAWING HELD WORD FOR WORD, IN ORDER, BOTH WAYS — the lines a drawing marks as the screen's (2026-10-27, FX-CF-C; REC2-01,
 *  REC2-02 of the Cash flow drawing match, round 2).
 *
 *  A drawing written for this marks every line the screen prints with `data-l` — a title, a sentence, a choice, the figure in a
 *  money box (or its placeholder). The match is then exact: the drawn phone's lines and the rendered screen's lines are the same
 *  list, in the same order. A dropped drawn line fails, an extra rendered line fails, a changed figure fails — "$4,250" is
 *  compared as "$4,250", never as "a dollar amount". The change marks (`class="pn"`) are the drawing's notes, not the screen.
 *
 *  What this cannot see, and no caller may claim it does: size, colour and spacing. Callers check those on the rendered styles.
 */
import * as fs from 'fs';
import * as path from 'path';
import { ruledHtml } from './ruledSince';

const ROOT = path.join(__dirname, '..', '..');

/** each `<div class="phone">` block of the drawing, nested divs included */
export function phoneBlocks(file: string): string[] {
  const html = ruledHtml(file, fs.readFileSync(path.join(ROOT, file), 'utf8'));   // the drawing as ruled since (ruledSince.ts, 2026-11-06)
  const out: string[] = [];
  const open = /<div class="phone">/g;
  for (let m = open.exec(html); m; m = open.exec(html)) {
    const tag = /<\/?div\b[^>]*>/g;
    tag.lastIndex = m.index;
    let depth = 0, end = html.length;
    for (let t = tag.exec(html); t; t = tag.exec(html)) {
      depth += t[0].startsWith('</') ? -1 : 1;
      if (depth === 0) { end = t.index + t[0].length; break; }
    }
    out.push(html.slice(m.index, end));
  }
  return out;
}

const decode = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&');

/** the lines a drawn phone marks as the screen's, in order */
export function drawnLines(block: string): string[] {
  const b = block.replace(/<span class="pn">[^<]*<\/span>/g, '');
  const out: string[] = [];
  const re = /<(\w+)\b[^>]*\sdata-l\b[^>]*>([\s\S]*?)<\/\1>/g;
  for (let m = re.exec(b); m; m = re.exec(b)) out.push(decode(m[2].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim());
  return out.filter(Boolean);
}

/** how many dark-green and light-green bars a drawn phone has, and their titles in order */
export function drawnBands(block: string): { dark: string[]; light: string[] } {
  const b = block.replace(/<span class="pn">[^<]*<\/span>/g, '');
  const grab = (cls: string) => [...b.matchAll(new RegExp(`<div class="${cls}"><span class="t" data-l>([^<]*)</span>`, 'g'))].map((m) => decode(m[1]));
  return { dark: grab('band'), light: grab('lband') };
}

const textOf = (n: any): string => (n == null ? '' : typeof n === 'string' ? n : Array.isArray(n) ? n.map(textOf).join('') : (n.children ?? []).map(textOf).join(''));

/** every line the rendered screen prints, in order: each Text (nested Text read as one line), and each text box as what it shows —
 *  its value, or its placeholder when empty */
export function renderedLines(tree: any): string[] {
  const out: string[] = [];
  const walk = (n: any) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    // an icon-font glyph (the top bar's eye and gear, once the font has loaded) is a private-use character, not a word
    if (n.type === 'Text') { const t = textOf(n).replace(/[\uE000-\uF8FF]/g, '').replace(/\s+/g, ' ').trim(); if (t) out.push(t); return; }
    if (n.type === 'TextInput') { const t = String(n.props.value || n.props.placeholder || '').trim(); if (t) out.push(t); return; }
    (n.children ?? []).forEach(walk);
  };
  walk(tree);
  return out;
}

const flat = (st: any): any => (Array.isArray(st) ? Object.assign({}, ...st.flat(Infinity).filter(Boolean).map(flat)) : st ?? {});

/** the rendered bars: every View filled with the deep green or the light green, with its title and its title's style */
export function renderedBands(tree: any, deep: string, light: string): { kind: 'dark' | 'light'; title: string; style: any; titleStyle: any; valueStyle: any }[] {
  const out: any[] = [];
  const walk = (n: any) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    const st = flat(n.props?.style);
    if (n.type === 'View' && (st.backgroundColor === deep || st.backgroundColor === light)) {
      const texts = (n.children ?? []).filter((c: any) => c && c.type === 'Text');
      out.push({ kind: st.backgroundColor === deep ? 'dark' : 'light', title: textOf(texts[0]), style: st,
        titleStyle: flat(texts[0]?.props?.style), valueStyle: texts[1] ? flat(texts[1].props.style) : null });
    }
    (n.children ?? []).forEach(walk);
  };
  walk(tree);
  return out;
}

/** the shared footer (src/components/Disclaimer.tsx): it printed one straight apostrophe, "aren't", which this levelled to the
 *  drawing's ’ until the app-wide sweep reached it. Since 2026-10-27 (FX-SHARED) the footer prints ’ itself and
 *  src/__tests__/curly_apostrophe_everywhere.test.ts holds it, so NOTHING is levelled any more: the lines are compared as rendered. */
export const levelSharedFooter = (lines: string[]) => lines;
