/** THE STATES OF A DRAWING, READ AS A PERSON READS THEM (the mock-match standing order, docs/MOCK-MATCH-AUDIT-STANDING-ORDER.md):
 *  each phone of a moneykeel_pres_mock_*.html file, from its state label to the next, as its visible words in order — the orange
 *  change marks (.pn), the phone's status bar and its top bar's glyphs left out, since they are the drawing's and not the app's.
 *  And the same words read off a rendered screen, so the two can be set side by side. Used by the drawing tests of account-page
 *  v02 and holding-detail v03 (2026-11-12). */
import * as fs from 'fs';

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '’', nbsp: ' ', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', middot: '·', rarr: '→', mdash: '—', ndash: '–', minus: '−', times: '×', divide: '÷' };
const unescape = (s: string) => s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENTITIES[e] ?? m));
/** One line of words, spaced as printed: no space inside brackets or before a comma, full stop or colon. */
export const words = (s: string) => s.replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/\s+([,.:;])/g, '$1').trim();

export interface DrawnState { label: string; text: string }
/** Every state of the drawing: its label ("STATE A · …") and its words, in order. */
export function drawnStates(file: string): DrawnState[] {
  let html = fs.readFileSync(file, 'utf8').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
  html = html.replace(/<span class="pn"[^>]*>[\s\S]*?<\/span>/g, ' ').replace(/<div class="sbar"[\s\S]*?<\/div>/g, ' ');
  const parts = html.split(/<div class="state"[^>]*>/).slice(1);
  return parts.map((p) => {
    const label = unescape(p.slice(0, p.indexOf('</div>')).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    const body = p.slice(p.indexOf('</div>') + 6);
    const end = body.search(/<div class="(side|state)"|<\/main>|<aside/);
    const text = unescape((end >= 0 ? body.slice(0, end) : body).replace(/<[^>]+>/g, ' '));
    return { label, text: words(text) };
  });
}

/** Every string a rendered screen shows, in order, as one line of words. */
export function screenWords(tree: any): string {
  const out: string[] = [];
  const walk = (n: any) => { if (n == null) return; if (typeof n === 'string') { out.push(n); return; } if (Array.isArray(n)) { n.forEach(walk); return; } (n.children ?? []).forEach(walk); };
  walk(tree);
  return words(out.join(' '));
}

/** The words of a drawn state from the first words given to the last words given, both included. */
export function between(text: string, from: string, to: string): string {
  const a = text.indexOf(from);
  if (a < 0) throw new Error(`the drawing has no «${from}»`);
  const b = text.indexOf(to, a);
  if (b < 0) throw new Error(`the drawing has no «${to}» after «${from}»`);
  return text.slice(a, b + to.length);
}

/** How many of the drawing's words the screen shows in the same order (the longest run they share), as a coverage line. */
export function wordCoverage(drawn: string, built: string): { same: number; of: number; line: string } {
  const d = drawn.split(' '), b = built.split(' ');
  const L = Array.from({ length: d.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = d.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) L[i][j] = d[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const same = L[0][0];
  return { same, of: d.length, line: `${same} of ${d.length} words of the drawing shown in order; ${b.length - same} words on the screen not drawn` };
}
