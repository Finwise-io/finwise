/** ONE TERM PER CONCEPT — founder standing order, 2026-09-02; the sixteen cluster rulings, 2026-09-10.
 *
 *  "Always use same words to describe same thing in the app. There is no score for creative
 *  writing use different terms to describe same thing."
 *
 *  THE CANON LIVES IN THE STANDARD, NOT HERE. This guard reads the table under
 *  "One term per concept — the canon" in
 *  MoneyKeel/documents/standards/moneykeel_naming_spec_calculation-vocabulary_v01.md and fails on
 *  any retired word. Adding a synonym to the law = adding it to that table; nothing is hard-coded
 *  in this file except how the table is read.
 *
 *  WHAT COUNTS AS COPY (what a person could meet): string literals that carry words, template-literal
 *  text, JSX text, and every comment — a comment is how a retired word creeps back. Identifiers are
 *  code, not copy; a single lowercase token in quotes ('partner' as a track id) is a code value.
 *  Test files are not scanned — a test may quote the retired word it guards against.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const STANDARD = 'MoneyKeel/documents/standards/moneykeel_naming_spec_calculation-vocabulary_v01.md';
const ROOTS = ['src', 'MoneyKeel/functions'];

interface Rule { cluster: string; word: string; re: RegExp; }

/** The canon table → one regular expression per retired entry. */
export function readCanon(md: string): Rule[] {
  const start = md.indexOf('## One term per concept');
  if (start < 0) throw new Error(`${STANDARD}: the section "One term per concept — the canon" is missing`);
  const body = md.slice(start);
  const rules: Rule[] = [];
  for (const line of body.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 6 || cells[0] === '#' || /^-+$/.test(cells[0])) continue;
    const [cluster, , word, , retired] = cells;
    for (const raw of retired.split(' · ').map((e) => e.trim()).filter(Boolean)) {
      const entry = raw.replace(/^`|`$/g, '');
      const m = entry.match(/^\/(.+)\/([a-z]*)$/);
      const re = m ? new RegExp(m[1], m[2]) : new RegExp(`\\b${entry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      rules.push({ cluster, word, re });
    }
  }
  if (rules.length === 0) throw new Error(`${STANDARD}: the canon table has no retired entries`);
  return rules;
}

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === '__tests__' || d.name === 'node_modules' ? [] : walk(p);
    return /\.(ts|tsx)$/.test(d.name) && !/\.test\./.test(d.name) && !/\.d\.ts$/.test(d.name) ? [p] : [];
  });
}

/** A quoted single token is a code value (a track id, a kind, a key) — unless it is capitalised copy. */
function isCopy(s: string): boolean {
  const t = s.trim();
  if (t === '') return false;
  if (/\s/.test(t)) return true;
  return /^[A-Z][a-z]/.test(t);
}

interface Segment { text: string; line: number; }

/** Every piece of a file a person could read: string bodies, template text, JSX text, comments. */
export function copySegments(file: string, text: string): Segment[] {
  const kind = file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const out: Segment[] = [];
  const lineOf = (pos: number) => sf.getLineAndCharacterOfPosition(pos).line + 1;
  const seen = new Set<number>();
  // inside a comment a quoted lowercase token ('partner', the track id) is a code value, not copy
  // … and so is a function's own name when it follows its identifier in a generated header line
  // ("Called by ... MK-CF-O-002 spending") — the identifier names the code, not the copy.
  const codeValues = (s: string) => s.replace(/'[a-z_][a-z0-9_]*'/g, "''").replace(/\bMK-[A-Z]{2}-[A-Z]-\d{3} [A-Za-z_][A-Za-z0-9_]*/g, 'MK-ID');
  const comment = (r: ts.CommentRange) => {
    if (seen.has(r.pos)) return;
    seen.add(r.pos);
    out.push({ text: codeValues(text.slice(r.pos, r.end)), line: lineOf(r.pos) });
  };
  const visit = (n: ts.Node) => {
    ts.getLeadingCommentRanges(text, n.getFullStart())?.forEach(comment);
    ts.getTrailingCommentRanges(text, n.getEnd())?.forEach(comment);
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      if (isCopy(n.text)) out.push({ text: n.text, line: lineOf(n.getStart(sf)) });
    } else if (ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) {
      out.push({ text: n.text, line: lineOf(n.getStart(sf)) });
    } else if (ts.isJsxText(n)) {
      if (n.text.trim()) out.push({ text: n.text, line: lineOf(n.getStart(sf)) });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  // JSX comments — {/* … */} — hang off a brace token, not a node, so the walk above misses them.
  for (const m of text.matchAll(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g)) {
    if (m.index != null && !seen.has(m.index + 1)) out.push({ text: codeValues(m[0]), line: lineOf(m.index) });
  }
  return out;
}

/** Copy as a person MEETS it: the text with the expression boundaries still in, so an entry written
 *  across code and words ("} a year") is read the way it was written. Spoken labels are left out —
 *  the canon keeps "a month" and "a year" for them. */
function renderedSegments(file: string, text: string): Segment[] {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: Segment[] = [];
  const lineOf = (pos: number) => sf.getLineAndCharacterOfPosition(pos).line + 1;
  const spoken = (n: ts.Node): boolean => {
    for (let p: ts.Node | undefined = n; p; p = p.parent) {
      if (ts.isJsxAttribute(p) && /accessibility(Label|Hint)|aria-label/.test(p.name.getText(sf))) return true;
      if (ts.isPropertyAssignment(p) && /accessibility(Label|Hint)/.test(p.name.getText(sf))) return true;
    }
    return false;
  };
  const visit = (n: ts.Node) => {
    if (ts.isTemplateExpression(n) && !spoken(n)) {
      // the boundary, not what is inside it: `About ${money(x)} a year` reads as "About } a year",
      // so "} a year" is caught while an identifier inside the expression (spending.length) is not
      // copy and cannot raise a false alarm
      const rendered = n.head.text + n.templateSpans.map((sp) => `}${sp.literal.text}`).join('');
      out.push({ text: rendered, line: lineOf(n.getStart(sf)) });
    } else if ((ts.isJsxElement(n) || ts.isJsxFragment(n)) && !spoken(n)) {
      const rendered = n.children.map((c) => (ts.isJsxText(c) ? c.text : ts.isJsxExpression(c) ? '}' : '')).join('');
      if (rendered.trim()) out.push({ text: rendered, line: lineOf(n.getStart(sf)) });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

const canon = readCanon(fs.readFileSync(STANDARD, 'utf8'));
/** The entries that straddle code and copy — they only mean anything against rendered text. */
const STRADDLING = canon.filter((r) => /[}{$)\]]/.test(r.re.source));

test('THE LAW: a retired word appears nowhere a person could meet it', () => {
  const offences: string[] = [];
  for (const root of ROOTS) {
    for (const file of walk(root)) {
      const text = fs.readFileSync(file, 'utf8');
      for (const seg of copySegments(file, text)) {
        const t = seg.text.trim();
        for (const r of canon) {
          if (r.re.test(t)) offences.push(`${file}:${seg.line} — cluster ${r.cluster} ${r.re} → use "${r.word}"`);
        }
      }
      // THE BLIND SPOT, found 2026-09-26 when the founder asked whether the screens just built were
      // clean. A canon entry written with PUNCTUATION — row 14's `/\} ?a year\b/` — can never match
      // a copy segment: the "}" belongs to the expression and the segment holds only the text beside
      // it. The guard called the app clean while Performance printed "{pct(perYear)} a year".
      // So those entries are tested against what RENDERS: the text with its expression boundaries
      // left in. Spoken labels are exempt by the canon itself ("a month" / "a year" stay there).
      for (const seg of renderedSegments(file, text)) {
        for (const r of STRADDLING) {
          if (r.re.test(seg.text)) offences.push(`${file}:${seg.line} — cluster ${r.cluster} ${r.re} → use "${r.word}" (as it renders)`);
        }
      }
    }
  }
  expect([...new Set(offences)]).toEqual([]);
}, 120_000);

test('the count on screen is the count the simulation runs (1,000 paths)', () => {
  const offences: string[] = [];
  for (const root of ROOTS) {
    for (const file of walk(root)) {
      fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        if (/~400/.test(line)) offences.push(`${file}:${i + 1} — the simulation runs 1,000 paths (willItLast.ts)`);
      });
    }
  }
  expect(offences).toEqual([]);
});

test('the canon table is read, not hard-coded: every cluster row yields at least one retired entry', () => {
  const clusters = new Set(canon.map((r) => r.cluster));
  for (const c of ['0a', '0b', ...Array.from({ length: 16 }, (_, i) => String(i + 1))]) {
    expect(clusters.has(c)).toBe(true);
  }
});
