/** A DRAWING'S STATES, LINE BY LINE (2026-11-12, the cloud-copy drawings: invite-and-join, return code, two-phone note, update to
 *  keep saving, delete account with a household). Those drawings mark no `data-l` lines, so each state's phone is read the way a
 *  person reads it: every block (a div, a paragraph, a line break) is one line; the drawing's own notes are left out — its state
 *  label, its status bar and its orange change marks (`class="pn"`). The rendered screen is read by renderedLines (drawnLines.ts).
 *
 *  What this cannot see: size, colour and spacing. Callers check those on the rendered styles. */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const decode = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

/** the HTML inside the element that opens at `start`, matched by depth on `tag` */
function elementAt(html: string, start: number, tag = 'div'): string {
  const re = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'g');
  re.lastIndex = start;
  let depth = 0;
  for (let t = re.exec(html); t; t = re.exec(html)) {
    depth += t[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return html.slice(start, t.index + t[0].length);
  }
  return html.slice(start);
}

/** every state the drawing draws: its label (e.g. "STATE C · SAM SIGNS UP WITH BOTH CODES · NOV 14, 2026"), its lines in order, and
 *  its words as one stream (every tag a word break), which is what a screen is compared on: a line the drawing writes in two spans
 *  and the app in one nested Text is the same words in the same order. A phone may carry two states one under the other. */
export function drawingStates(file: string): { label: string; lines: string[]; stream: string }[] {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const out: { label: string; lines: string[]; stream: string }[] = [];
  const open = /<div class="screen">/g;
  for (let m = open.exec(html); m; m = open.exec(html)) {
    const screen = elementAt(html, m.index);
    const parts = screen.split(/(?=<div class="state">)/).filter((p) => p.startsWith('<div class="state">'));
    for (let b of parts) {
      const label = decode((/<div class="state">([\s\S]*?)<\/div>/.exec(b)?.[1] ?? '').replace(/<[^>]+>/g, '')).trim();
      b = b.replace(/<div class="state">[\s\S]*?<\/div>/, '');
      const sbar = b.indexOf('<div class="sbar">');
      if (sbar >= 0) b = b.slice(0, sbar) + b.slice(sbar + elementAt(b, sbar).length);
      b = b.replace(/<span class="pn">[^<]*<\/span>/g, '');
      const text = b.replace(/<br\s*\/?>/g, '\n').replace(/<\/?(div|p|li|ul|section|h\d)\b[^>]*>/g, '\n').replace(/<[^>]+>/g, '');
      const lines = decode(text).split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
      // a tag between a word and its full stop or comma is no word break: <b>pat@email.com</b>. reads "pat@email.com."
      const stream = decode(b.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/ ([.,;:!?])(?= |$)/g, '$1').trim();
      out.push({ label, lines, stream });
    }
  }
  return out;
}

/** the rendered lines as one stream of words */
export const streamOf = (lines: string[]): string => lines.join(' ').replace(/\s+/g, ' ').trim();

/** the state whose label starts with `key` ("STATE C") — its words as one stream */
export function drawnStream(file: string, key: string): string {
  const st = drawingStates(file).find((s) => s.label.startsWith(key + ' ') || s.label === key);
  if (!st) throw new Error(`${file} draws no ${key}`);
  return st.stream;
}

/** where two streams part, said plainly: the words before, and what each says from there */
export function streamBreak(drawn: string, built: string): string {
  if (drawn === built) return 'identical';
  let i = 0;
  while (i < drawn.length && drawn[i] === built[i]) i++;
  return `same for ${i} of ${drawn.length} characters; then drawn "${drawn.slice(i, i + 80)}" vs built "${built.slice(i, i + 80)}"`;
}


/** The MoneyKeel bar and the tab bar a drawing draws on a tab or Settings: the navigator's, not the screen's. */
export const CHROME_TOP = '▦ Menu ◉ ⚙ ';
export const CHROME_TABS = ' Home Net worth Performance Cash flow Plan';

/** Settings rows built before these drawings that the drawings leave out (each its own built line, in order). */
export const SETTINGS_ROWS_NOT_DRAWN = [
  ' Still working Retired, or nearly',
  ' 📄 Terms of Service › ✉️ Contact Support support@finwise.app › 🩺 Send a diagnostic report Anonymous — helps us fix problems. No financial data. › ℹ️ Version 1.0.0 ⚠️ Financial Disclaimer MoneyKeel is for informational and educational purposes only. It does not constitute financial, investment, tax, or legal advice. Always consult a qualified financial professional before making financial decisions.',
  ' Danger zone Resetting will permanently delete all your data. This cannot be undone. Reset all data',
];
