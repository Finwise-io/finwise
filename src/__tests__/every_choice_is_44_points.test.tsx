/** EVERY CHOICE IS AT LEAST 44 POINTS TALL (NW3-16, NW3-17 — FX-SHARED 2026-10-31; DEC-0141, the 44-point floor; tenet 4).
 *
 *  Add an account, the debt editor and the step-by-step add were raised to 44 (DEC-8941). The Bonds and Alternatives editors and
 *  Itemize drew their chips 35 to 39 points tall, the trade sheet and holding editor about 31, the recorder's day chips 40.
 *  One floor for every choice now: Tap.min (src/utils/theme.ts), 44.
 *
 *  WHAT IT READS — the disk: every TouchableOpacity, Pressable and TouchableHighlight in src and app (tests excluded). A touchable is a
 *  CHOICE when it carries a selected or checked state, a radio / checkbox / tab role, or a style named as one (chip, seg, pill, choice,
 *  option, tab). Each choice's base style is read from its file's StyleSheet (or inline) and must set minHeight or height of at least
 *  44 — `Tap.min` counts as 44. A choice whose style cannot be read fails: a guard that skips what it cannot see reports clean.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { Tap, Spacing as SPACING, Typography } from '../utils/theme';

const ROOT = path.join(__dirname, '..', '..');
const CHOICE_STYLE = /(chip|Chip|^seg$|Seg$|^seg[A-Z]|pill|Pill|choice|Choice|option|Option|^tab$|Tab$|pickRow|mergeOpt|mergeRow)/;

function walk(d: string): string[] {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return e.name === '__tests__' || e.name === 'node_modules' ? [] : walk(p);
    return /\.tsx$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
  });
}

const heightOf = (expr: string | undefined): number | null => {
  if (!expr) return null;
  if (/^Tap\.min$/.test(expr.trim())) return Tap.min;
  const n = Number(expr.trim());
  return Number.isFinite(n) ? n : null;
};

export function choicesIn(file: string, text: string) {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const styles: Record<string, Record<string, string>> = {};
  const readStyles = (n: ts.Node) => {
    if (ts.isCallExpression(n) && /StyleSheet\.create$/.test(n.expression.getText(sf)) && n.arguments[0] && ts.isObjectLiteralExpression(n.arguments[0])) {
      const owner = ts.isVariableDeclaration(n.parent) ? n.parent.name.getText(sf) : '?';
      for (const p of n.arguments[0].properties) {
        if (!ts.isPropertyAssignment(p) || !ts.isObjectLiteralExpression(p.initializer)) continue;
        const o: Record<string, string> = {};
        for (const q of p.initializer.properties) if (ts.isPropertyAssignment(q)) o[q.name.getText(sf)] = q.initializer.getText(sf);
        styles[`${owner}.${p.name.getText(sf)}`] = o;
      }
    }
    ts.forEachChild(n, readStyles);
  };
  readStyles(sf);
  let touchables = 0;
  const choices: { at: string; style: string; height: number | null }[] = [];
  const visit = (n: ts.Node) => {
    if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && /^(TouchableOpacity|Pressable|TouchableHighlight)$/.test(n.tagName.getText(sf))) {
      touchables += 1;
      const attrs: Record<string, string> = {};
      for (const a of n.attributes.properties) if (ts.isJsxAttribute(a)) attrs[a.name.getText(sf)] = a.initializer ? a.initializer.getText(sf) : 'true';
      const style = attrs.style ?? '';
      const base = (style.match(/\b([A-Za-z_]+\.[A-Za-z_]+)\b/) ?? [])[1] ?? '';
      const named = base.split('.')[1] ?? '';
      const isChoice = /selected|checked/.test(attrs.accessibilityState ?? '') || /radio|checkbox|tab/.test(attrs.accessibilityRole ?? '') || CHOICE_STYLE.test(named);
      if (isChoice) {
        const o = styles[base] ?? {};
        const inline = style.match(/minHeight:\s*([\w.]+)|(?<![a-zA-Z])height:\s*([\w.]+)/);
        const height = heightOf(o.minHeight) ?? heightOf(o.height) ?? heightOf(inline?.[1]) ?? heightOf(inline?.[2]);
        choices.push({ at: `${path.relative(ROOT, file)}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}`, style: base || style.slice(0, 40), height });
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return { touchables, choices };
}

test('every choice the app draws is at least 44 points tall — and the guard says how much it read', () => {
  expect(Tap.min).toBe(44);
  let files = 0, touchables = 0;
  const all: { at: string; style: string; height: number | null }[] = [];
  for (const root of ['src', 'app']) {
    for (const f of walk(path.join(ROOT, root))) {
      files += 1;
      const r = choicesIn(f, fs.readFileSync(f, 'utf8'));
      touchables += r.touchables; all.push(...r.choices);
    }
  }
  const short = all.filter((c) => c.height == null || c.height < Tap.min).map((c) => `${c.at} ${c.style} — ${c.height ?? 'no height of its own'}`);
  console.log(`every choice is 44 points: ${files} files, ${touchables} touchables, ${all.length} choices`);
  // counted 2026-10-31 from the disk, not typed from memory: 148 files, 628 touchables, 113 choices (51 were short). Floors just under.
  expect(files).toBeGreaterThanOrEqual(148);       // the true counts at the end of 2026-11-01 (PF-TOOLS): 148 files, 631 touchables, 113 choices
  expect(touchables).toBeGreaterThanOrEqual(631);
  expect(all.length).toBeGreaterThanOrEqual(113);
  expect(short).toEqual([]);
});

test('the guard catches what it is for (fed one of each)', () => {
  const probe = `const s = StyleSheet.create({ chip: { paddingVertical: 8 }, ok: { minHeight: Tap.min }, row: { padding: 4 } });
    const a = <TouchableOpacity style={[s.chip]} />; const b = <TouchableOpacity style={s.ok} accessibilityState={{ selected: true }} />;
    const c = <TouchableOpacity style={s.row} accessibilityState={{ selected: true }} />; const d = <TouchableOpacity style={s.row} />;`;
  const r = choicesIn(path.join(ROOT, 'probe.tsx'), probe);
  expect(r.touchables).toBe(4);
  expect(r.choices.map((c) => c.height)).toEqual([null, 44, null]);   // chip and the selected row have no height; d is not a choice
});

/** A SMALL BUTTON THAT ACTS IS HELD TOO (2026-11-01, the lead's instruction from FX-PF: 92 sheet buttons under 44 points — Remove lot ✕,
 *  Add another lot, Delete holding, the ticker suggestions, the activity ✕ deletes, Delete this record — that the test above did not see,
 *  because none is a choice). In scope: every touchable whose spoken name starts Delete, Remove or Add another, whose own words are a ✕
 *  or ×, or whose style is a suggestion row. Its tap area is its style's height (minHeight or height; `Tap.min` is 44) plus the touch
 *  margin above and below; `hitSlop={Tap.slop}` gives 32 of margin, enough for any line of 12 points or more. A button whose height
 *  cannot be read and whose margin is not Tap.slop fails: a guard that skips what it cannot see reports clean. */
export function actionsIn(file: string, text: string) {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const styles: Record<string, Record<string, string>> = {};
  const readStyles = (n: ts.Node) => {
    if (ts.isCallExpression(n) && /StyleSheet\.create$/.test(n.expression.getText(sf)) && n.arguments[0] && ts.isObjectLiteralExpression(n.arguments[0])) {
      const owner = ts.isVariableDeclaration(n.parent) ? n.parent.name.getText(sf) : '?';
      for (const p of n.arguments[0].properties) {
        if (!ts.isPropertyAssignment(p) || !ts.isObjectLiteralExpression(p.initializer)) continue;
        const o: Record<string, string> = {};
        for (const q of p.initializer.properties) if (ts.isPropertyAssignment(q)) o[q.name.getText(sf)] = q.initializer.getText(sf);
        styles[`${owner}.${p.name.getText(sf)}`] = o;
      }
    }
    ts.forEachChild(n, readStyles);
  };
  readStyles(sf);
  const found: { at: string; name: string; tall: number | null }[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isJsxElement(n) && /^(TouchableOpacity|Pressable|TouchableHighlight)$/.test(n.openingElement.tagName.getText(sf))) {
      const attrs: Record<string, string> = {};
      for (const a of n.openingElement.attributes.properties) if (ts.isJsxAttribute(a)) attrs[a.name.getText(sf)] = a.initializer ? a.initializer.getText(sf) : 'true';
      const label = attrs.accessibilityLabel ?? '';
      const ownWords = n.children.filter((c) => ts.isJsxElement(c) && c.openingElement.tagName.getText(sf) === 'Text').map((c) => (c as ts.JsxElement).children.map((x) => x.getText(sf)).join('').trim());
      const style = attrs.style ?? '';
      const acts = /^[{`'"\s]*(Delete|Remove|Add another)/.test(label) || ownWords.some((w) => /^[✕×]$/.test(w)) || /\b(acRow|sugRow)\b/.test(style);
      if (acts) {
        const base = (style.match(/\b([A-Za-z_]+\.[A-Za-z_0-9]+)\b/) ?? [])[1] ?? '';
        const o = styles[base] ?? {};
        const inline = style.match(/minHeight:\s*([\w.]+)|(?<![a-zA-Z])height:\s*([\w.]+)/);
        const h = heightOf(o.minHeight) ?? heightOf(o.height) ?? heightOf(inline?.[1]) ?? heightOf(inline?.[2]);
        const slopText = attrs.hitSlop ?? '';
        const slop = /^\{Tap\.slop\}$/.test(slopText) ? Tap.slop.top + Tap.slop.bottom
          : (Number((slopText.match(/top:\s*(\d+)/) ?? [])[1]) || 0) + (Number((slopText.match(/bottom:\s*(\d+)/) ?? [])[1]) || 0);
        const tall = /^\{Tap\.slop\}$/.test(slopText) ? Math.max(h ?? 0, Tap.min) : h == null ? null : h + slop;
        found.push({ at: `${path.relative(ROOT, file)}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}`, name: label.slice(0, 40) || ownWords.join(' '), tall });
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return found;
}

test('every small button that deletes, removes, closes with a ✕, adds another or offers a suggestion has a 44-point tap area', () => {
  expect(Tap.slop.top + Tap.slop.bottom + 12 * 1.2).toBeGreaterThanOrEqual(Tap.min);
  let files = 0; const all: { at: string; name: string; tall: number | null }[] = [];
  for (const root of ['src', 'app']) for (const f of walk(path.join(ROOT, root))) { files += 1; all.push(...actionsIn(f, fs.readFileSync(f, 'utf8'))); }
  const short = all.filter((c) => c.tall == null || c.tall < Tap.min).map((c) => `${c.at} ${c.name} — ${c.tall ?? 'no height of its own, and no Tap.slop'}`);
  console.log(`every small action button is 44 points to the touch: ${files} files, ${all.length} buttons`);
  // counted 2026-11-01 from the disk: 148 files, 26 buttons — 18 were short and were raised (Tap.slop on 16, Tap.min on 2), 8 were already 44.
  expect(files).toBeGreaterThanOrEqual(148);       // 148 files, 26 buttons on 2026-11-01 (PF-TOOLS)
  expect(all.length).toBeGreaterThanOrEqual(26);
  expect(short).toEqual([]);
});

test('the action guard catches what it is for (fed one of each)', () => {
  const probe = `const s = StyleSheet.create({ link: { fontSize: 13 }, tall: { minHeight: 44 } });
    const a = <TouchableOpacity accessibilityLabel="Delete holding"><Text>Delete holding</Text></TouchableOpacity>;
    const b = <TouchableOpacity hitSlop={{ top: 8, bottom: 8 }}><Text>✕</Text></TouchableOpacity>;
    const c = <TouchableOpacity hitSlop={Tap.slop} accessibilityLabel="Remove lot 1"><Text>✕</Text></TouchableOpacity>;
    const d = <TouchableOpacity style={s.tall} accessibilityLabel="Add another lot"><Text>Add</Text></TouchableOpacity>;
    const e = <TouchableOpacity accessibilityLabel="Save"><Text>Save</Text></TouchableOpacity>;`;
  const r = actionsIn(path.join(ROOT, 'probe.tsx'), probe);
  expect(r.map((c) => c.tall)).toEqual([null, null, 44, 44]);   // e is not an action button
});

/** A LINE OR A LINK THAT ACTS IS HELD TOO (2026-11-01, FX-NW, NW4-04; the lead's instruction to widen this guard). The two tests above
 *  see choices and small buttons that delete, remove, close or add another. They did not see a touchable whose only content is words —
 *  a door line, a "See all activity ›", "Look back: what if…", the change line under Net worth's total — nor a link inside a sentence
 *  (a Text with onPress), and those were 16 to 40 points to the touch. In scope now: every TouchableOpacity, Pressable or
 *  TouchableHighlight whose children are only Text, and every Text with onPress. Its tap area is worked from the disk: its own minHeight
 *  or height, else its words' box (their minHeight, else lineHeight or 1.2 × fontSize — 15 when unset — with their padding) plus its
 *  own padding and border, plus its touch margin (hitSlop, a const of the file it names, or Tap.slop, which is always enough). A size that
 *  cannot be read fails. A Text takes no touch margin, so a link inside a sentence can only pass by being made a touchable. */
export function linesIn(file: string, text: string) {
  const Spacing: Record<string, number> = SPACING, sizes: Record<string, number> = Typography.sizes;

  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const styles: Record<string, Record<string, string>> = {};
  const readStyles = (n: any) => {
    if (ts.isCallExpression(n) && /StyleSheet\.create$/.test(n.expression.getText(sf)) && n.arguments[0] && ts.isObjectLiteralExpression(n.arguments[0])) {
      const owner = ts.isVariableDeclaration(n.parent) ? n.parent.name.getText(sf) : '?';
      for (const p of n.arguments[0].properties) {
        if (!ts.isPropertyAssignment(p) || !ts.isObjectLiteralExpression(p.initializer)) continue;
        const o: Record<string, string> = {};
        for (const q of p.initializer.properties) if (ts.isPropertyAssignment(q)) o[q.name.getText(sf)] = q.initializer.getText(sf);
        styles[`${owner}.${p.name.getText(sf)}`] = o;
      }
    }
    ts.forEachChild(n, readStyles);
  };
  readStyles(sf);
  const num = (e?: string): number | null => {
    if (e == null) return null; const t = e.trim();
    if (/^Tap\.min$/.test(t)) return Tap.min;
    const sp = t.match(/^Spacing\.(\w+)$/); if (sp) return Spacing[sp[1]] ?? null;
    const ty = t.match(/^Typography\.sizes\.(\w+)$/); if (ty) return sizes[ty[1]] ?? null;
    const n = Number(t); return Number.isFinite(n) ? n : null;
  };
  /** every style object a style= expression names, its inline objects included, merged in order */
  const merged = (expr: string): Record<string, string> => {
    const o: Record<string, string> = {};
    for (const m of expr.matchAll(/\b([A-Za-z_]+\.[A-Za-z_0-9]+)\b/g)) Object.assign(o, styles[m[1]] ?? {});
    for (const m of expr.matchAll(/\b(minHeight|height|padding|paddingVertical|paddingTop|paddingBottom|fontSize|lineHeight|borderWidth):\s*([\w.]+)/g)) o[m[1]] = m[2];
    return o;
  };
  const vpad = (o: Record<string, string>) => {
    const p = num(o.padding) ?? 0, v = num(o.paddingVertical);
    return (num(o.paddingTop) ?? v ?? p) + (num(o.paddingBottom) ?? v ?? p) + 2 * (num(o.borderWidth) ?? 0);
  };
  /** a margin named by a const of the file (TopBar's `hit`) is read from that const */
  const slopOf = (s0: string) => {
    const id = (s0.match(/^\{(\w+)\}$/) ?? [])[1];
    const s = id && id !== 'Tap' ? ((text.match(new RegExp(`const ${id} = (\\{[^}]*\\})`)) ?? [])[1] ?? s0) : s0;
    return /^\{Tap\.slop\}$/.test(s) ? Tap.slop.top + Tap.slop.bottom
      : (Number((s.match(/top:\s*(\d+)/) ?? [])[1]) || 0) + (Number((s.match(/bottom:\s*(\d+)/) ?? [])[1]) || 0);
  };
  const attrsOf = (o: any) => { const a: Record<string, string> = {}; for (const x of o.attributes.properties) if (ts.isJsxAttribute(x)) a[x.name.getText(sf)] = x.initializer ? x.initializer.getText(sf) : 'true'; return a; };
  const lineOf = (t: any): number | null => {          // one Text's line: its lineHeight, else 1.2 × its size (15 when unset)
    const o = merged(attrsOf(t.openingElement ?? t).style ?? '');
    const lh = num(o.lineHeight); const fs = o.fontSize == null ? 15 : num(o.fontSize);
    const line = lh ?? (fs == null ? null : fs * 1.2);
    if (line == null) return null;
    return Math.max(num(o.minHeight) ?? 0, line + vpad(o));          // the words' own box: its minHeight, else its line and padding
  };
  const found: { at: string; name: string; tall: number | null }[] = [];
  const at = (n: any) => `${path.relative(ROOT, file)}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}`;
  const visit = (n: any) => {
    if (ts.isJsxElement(n) && /^(TouchableOpacity|Pressable|TouchableHighlight)$/.test(n.openingElement.tagName.getText(sf))) {
      const kids = n.children.filter((c: any) => !(ts.isJsxText(c) && !c.getText(sf).trim()));
      const texts = kids.filter((c: any) => (ts.isJsxElement(c) && c.openingElement.tagName.getText(sf) === 'Text') || (ts.isJsxSelfClosingElement(c) && c.tagName.getText(sf) === 'Text'));
      if (kids.length > 0 && texts.length === kids.length) {      // a line that acts: its only children are words
        const a = attrsOf(n.openingElement); const o = merged(a.style ?? '');
        const slop = a.hitSlop ?? '';
        const own = num(o.minHeight) ?? num(o.height);
        const lines = texts.map(lineOf);
        const body = lines.some((l: any) => l == null) ? null : Math.max(...(lines as number[])) + vpad(o);
        const tall = /^\{Tap\.slop\}$/.test(slop) ? Math.max(own ?? body ?? 0, Tap.min) : own != null ? own + slopOf(slop) : body == null ? null : body + slopOf(slop);
        found.push({ at: at(n), name: (a.accessibilityLabel ?? texts.map((t: any) => t.getText(sf).replace(/<[^>]+>/g, '')).join(' ')).replace(/\s+/g, ' ').slice(0, 50), tall });
      }
    }
    if (ts.isJsxElement(n) && n.openingElement.tagName.getText(sf) === 'Text') {
      const a = attrsOf(n.openingElement);
      if (a.onPress) {                                             // a link inside a sentence
        const l = lineOf(n); const slop = a.hitSlop ?? '';
        const tall = /^\{Tap\.slop\}$/.test(slop) ? Tap.min : l == null ? null : l + slopOf(slop);
        found.push({ at: at(n), name: 'link: ' + n.getText(sf).replace(/<[^>]+>|\{[^}]*\}/g, '').replace(/\s+/g, ' ').slice(0, 44), tall });
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return found;
}

/** NAMED, WITH THE REASON — a tap this reader cannot measure, measured another way */
const LINE_NAMED: Record<string, string> = {
  'src/components/UI.tsx InfoDot': 'the ⓘ pads itself to TAP_MIN by its own arithmetic: pad = ceil((44 − size) ÷ 2) above and below, an equal negative margin; about 47 measured (drawing match round 4, part N)',
};
/** THE TRUE NUMBER LEFT SHORT, FILE BY FILE, ON 2026-11-01 (A RATCHET THAT MAY ONLY FALL). Every one is outside the Net worth module, in
 *  files other agents own; FX-NW brought the module's 31 to 0 (Net worth, the account page, Update value, Bonds, Alternatives, Itemize,
 *  Holding detail, and the shared band, empty line, date link, gaps banner and section header they draw). A file not listed must have 0. */
const LINES_SHORT_ON_2026_11_01: Record<string, number> = {};   // 0 in every file: FX-SHARED gave the 99 left here (18 files) Tap.slop, 2026-11-01

test('every line and every link that acts has a 44-point tap area — and the guard says how much it read and what is still short', () => {
  let files = 0; const all: { at: string; name: string; tall: number | null }[] = [];
  for (const root of ['src', 'app']) for (const f of walk(path.join(ROOT, root))) { files += 1; all.push(...linesIn(f, fs.readFileSync(f, 'utf8'))); }
  const named = all.filter((c) => c.at.startsWith('src/components/UI.tsx') && /setOpen\(true\)\} suppressHighlighting/.test(c.name));
  expect(named.length).toBe(Object.keys(LINE_NAMED).length);          // the info dot is found, once, and is the only name
  const short = all.filter((c) => !named.includes(c) && (c.tall == null || c.tall < Tap.min));
  const byFile: Record<string, number> = {};
  for (const c of short) { const f = c.at.split(':')[0]; byFile[f] = (byFile[f] ?? 0) + 1; }
  console.log(`every line that acts is 44 points to the touch: ${files} files, ${all.length} lines and links, ${short.length} still short`
    + Object.entries(byFile).map(([f, n]) => `\n  ${f}: ${n}`).join(''));
  // counted 2026-11-01 from the disk: 148 files, 488 lines and links; 131 short. 31 were in the Net worth module and the shared parts it
  // draws, each given Tap.slop (or made a touchable that takes it); 99 are left in other agents' files, and the info dot is named above.
  expect(files).toBeGreaterThanOrEqual(148);
  expect(all.length).toBeGreaterThanOrEqual(488);
  const over = Object.entries(byFile).filter(([f, n]) => n > (LINES_SHORT_ON_2026_11_01[f] ?? 0))
    .map(([f, n]) => `${f}: ${n} short (may be ${LINES_SHORT_ON_2026_11_01[f] ?? 0}) — ${short.filter((c) => c.at.startsWith(f + ':')).map((c) => `${c.at.split(':')[1]} ${c.name} ${c.tall == null ? 'unreadable' : Math.round(c.tall)}`).join('; ')}`);
  expect(over).toEqual([]);
  expect(short.length).toBe(0);                                         // 99 that morning (FX-NW's count); 0 since FX-SHARED's Tap.slop, 2026-11-01
});

test('the line guard catches what it is for (fed one of each)', () => {
  const probe = `const hit = { top: 10, bottom: 10 };
    const s = StyleSheet.create({ door: { paddingVertical: 12 }, t: { fontSize: 15 }, small: { fontSize: 13 }, tall: { minHeight: 44 } });
    const a = <TouchableOpacity onPress={go}><Text style={s.small}>See all ›</Text></TouchableOpacity>;
    const b = <TouchableOpacity style={s.door} onPress={go}><Text style={s.t}>Add a bond</Text></TouchableOpacity>;
    const c = <TouchableOpacity hitSlop={Tap.slop} onPress={go}><Text style={s.small}>Edit</Text></TouchableOpacity>;
    const d = <TouchableOpacity hitSlop={hit} onPress={go}><Text style={s.small}>Back</Text></TouchableOpacity>;
    const e = <Text>Nothing yet. <Text onPress={go}>Add ›</Text></Text>;
    const f = <TouchableOpacity onPress={go}><View /><Text>not only words</Text></TouchableOpacity>;`;
  const r = linesIn(path.join(ROOT, 'probe.tsx'), probe);
  expect(r.map((c) => (c.tall == null ? null : Math.round(c.tall * 10) / 10))).toEqual([15.6, 42, 44, 35.6, 18]);   // f is not a line
});
