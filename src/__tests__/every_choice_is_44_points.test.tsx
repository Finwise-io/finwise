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
import { Tap } from '../utils/theme';

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
  expect(files).toBeGreaterThanOrEqual(148);       // the true counts on 2026-11-01 (PF-TOOLS): 148 files, 628 touchables, 113 choices
  expect(touchables).toBeGreaterThanOrEqual(628);
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
