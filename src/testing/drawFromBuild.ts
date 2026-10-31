/** DRAWN FROM THE BUILD (FX-NW, 2026-10-27): turns a rendered React Native tree into the HTML of a phone, in the shape the
 *  update-value-sheet_v02 drawing uses (.v a View, .t a Text, .in a box). It walks the rendered INSTANCES, so an icon (Ionicons)
 *  is drawn as its real glyph, the wordmark as its real image, and a button at its resting opacity (the 250 ms fade never runs in a
 *  render). Used by src/screens/__tests__/drawn_from_build_nw_2026_10_27.test.tsx, which writes the debt editor v02, the step-by-step
 *  add v01 and Add an account in edit mode v01 when FXNW_DRAW_OUT is set, and otherwise holds those drawings word for word.
 *  `drawnLines` reads a drawing written this way back into its lines, one per Text, as `builtLines` reads a render. */
import { StyleSheet } from 'react-native';
import { Colors } from '../utils/theme';

const GLYPHS: Record<string, number> = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json');
const TOKENS = new Map<string, string>();
for (const [k, v] of Object.entries(Colors)) { const key = String(v).toUpperCase().replace(/\s/g, ''); if (!TOKENS.has(key)) TOKENS.set(key, k); }
const col = (v: any) => { const t = TOKENS.get(String(v).toUpperCase().replace(/\s/g, '')); return t ? `var(--${t})` : String(v); };
const px = (v: any) => (typeof v === 'number' ? `${v}px` : String(v));
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const kebab = (k: string) => k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

export function css(st: any): string {
  const s = StyleSheet.flatten(st) ?? {};
  const out: string[] = [];
  const put = (k: string, v: string) => out.push(`${k}:${v}`);
  for (const [k, v] of Object.entries(s)) {
    if (v == null) continue;
    switch (k) {
      case 'paddingHorizontal': put('padding-left', px(v)); put('padding-right', px(v)); break;
      case 'paddingVertical': put('padding-top', px(v)); put('padding-bottom', px(v)); break;
      case 'marginHorizontal': put('margin-left', px(v)); put('margin-right', px(v)); break;
      case 'marginVertical': put('margin-top', px(v)); put('margin-bottom', px(v)); break;
      case 'borderWidth': put('border-width', px(v)); put('border-style', 'solid'); break;
      case 'borderTopWidth': case 'borderBottomWidth': case 'borderLeftWidth': case 'borderRightWidth':
        put(kebab(k), px(v)); put(kebab(k).replace('-width', '-style'), 'solid'); break;
      case 'backgroundColor': put('background', col(v)); break;
      case 'color': case 'borderColor': case 'borderTopColor': case 'borderBottomColor': case 'borderLeftColor': case 'borderRightColor':
        put(kebab(k), col(v)); break;
      case 'flex': if (typeof v === 'number') put('flex', v > 0 ? `${v} 1 0%` : v === 0 ? '0 0 auto' : '0 1 auto'); break;
      case 'fontVariant': put('font-variant-numeric', (v as any[]).join(' ')); break;
      case 'textDecorationLine': put('text-decoration', String(v)); break;
      case 'fontWeight': put('font-weight', String(v) === 'normal' ? '400' : String(v) === 'bold' ? '700' : String(v)); break;
      case 'lineHeight': case 'letterSpacing': case 'fontSize': case 'width': case 'height': case 'minHeight': case 'maxHeight':
      case 'minWidth': case 'maxWidth': case 'top': case 'left': case 'right': case 'bottom': case 'gap': case 'rowGap': case 'columnGap':
      case 'padding': case 'paddingTop': case 'paddingBottom': case 'paddingLeft': case 'paddingRight':
      case 'margin': case 'marginTop': case 'marginBottom': case 'marginLeft': case 'marginRight':
      case 'borderRadius': case 'borderTopLeftRadius': case 'borderTopRightRadius': case 'borderBottomLeftRadius': case 'borderBottomRightRadius':
      case 'flexBasis':
        put(kebab(k), px(v)); break;
      case 'flexDirection': case 'alignItems': case 'alignSelf': case 'justifyContent': case 'flexWrap': case 'textAlign': case 'textTransform':
      case 'position': case 'overflow': case 'fontStyle': case 'alignContent':
        put(kebab(k), String(v)); break;
      case 'flexGrow': case 'flexShrink': case 'opacity': case 'zIndex': case 'aspectRatio': put(kebab(k), String(v)); break;
      default: break;   // shadows, elevation, transforms, tint, fontFamily: not drawn
    }
  }
  return out.join(';');
}

const isIcon = (n: any) => n && typeof n.type !== 'string' && typeof n.props?.name === 'string' && GLYPHS[n.props.name] != null && n.props.size != null;

/** One rendered instance to HTML. Modals are collected separately so the caller can lay the sheet over the page. */
const isTouchable = (n: any) => n && typeof n.type !== 'string' && /TouchableOpacity/.test(String(n.type?.displayName ?? n.type?.name ?? n.type?.render?.displayName ?? ''));
export function toHtml(n: any, modals: string[] = [], inText = false, rest?: number): string {
  if (n == null || n === false || n === true) return '';
  if (typeof n === 'string' || typeof n === 'number') return esc(String(n));
  if (Array.isArray(n)) return n.map((c) => toHtml(c, modals, inText)).join('');
  if (isIcon(n)) {
    const g = String.fromCodePoint(GLYPHS[n.props.name]);
    return `<span class="ion" style="font-size:${n.props.size}px;color:${col(n.props.color ?? '#000')}" title="${esc(n.props.name)}">${g}</span>`;
  }
  const kids = (n.children ?? []) as any[];
  // a TouchableOpacity is drawn at its RESTING opacity (its own style's, else 1): the 250 ms fade between the two never runs in a render
  if (isTouchable(n)) { const o = (StyleSheet.flatten(n.props?.style) ?? {}).opacity; return kids.map((c) => toHtml(c, modals, inText, o ?? 1)).join(''); }
  if (typeof n.type !== 'string') return kids.map((c) => toHtml(c, modals, inText, rest)).join('');
  const p = n.props ?? {};
  const style = css(rest != null ? [p.style, { opacity: rest }] : p.style);
  const sa = style ? ` style="${style}"` : '';
  switch (n.type) {
    case 'Text': {
      const lines = p.numberOfLines ? ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis' : '';
      const body = kids.map((c) => toHtml(c, modals, true)).join('');
      return inText ? `<span class="t"${sa}>${body}</span>` : `<div class="t" style="${style}${lines}">${body}</div>`;
    }
    case 'TextInput': {
      const v = p.value != null && String(p.value) !== '' ? esc(String(p.value)) : '';
      const ph = !v && p.placeholder ? `<span class="t" style="color:${col(p.placeholderTextColor ?? '#999')}">${esc(String(p.placeholder))}</span>` : '';
      return `<div class="in"${sa}><span class="t">${v}</span>${ph}</div>`;
    }
    case 'Modal': {
      if (p.visible === false) return '';
      modals.push(kids.map((c) => toHtml(c, modals)).join(''));
      return '';
    }
    case 'Image':
      return p.accessibilityLabel === 'MoneyKeel' ? `<img class="wmimg" alt="MoneyKeel" src="WORDMARK" style="${style}">` : '';
    case 'RCTScrollView': {
      // the content sits in its own box, styled by contentContainerStyle (a test render keeps that style on the scroll view itself)
      const inner = css([p.horizontal ? { flexDirection: 'row' } : null, p.contentContainerStyle]);
      return `<div class="v scroll"${sa}><div class="v"${inner ? ` style="${inner}"` : ''}>${kids.map((c) => toHtml(c, modals)).join('')}</div></div>`;
    }
    default: {
      const b = p.accessibilityRole === 'button' || p.accessibilityRole === 'radio' ? ` data-b="${esc(String(p.accessibilityLabel ?? ''))}"` : '';
      return `<div class="v"${b}${sa}>${kids.map((c) => toHtml(c, modals)).join('')}</div>`;
    }
  }
}

/** The lines of one state of a drawing written by `toHtml` (its phone carries data-state="<key>"): one line per outermost Text,
 *  nested Texts joined into it, in order — the page under a sheet, then the sheet. Icons, the wordmark and the tab bar are not Texts. */
export function drawnLines(html: string, key: string): string[] {
  const at = html.indexOf(`data-state="${key}"`);
  if (at < 0) return [];
  const end = html.indexOf('<div class="phone">', at);
  const seg = html.slice(at, end < 0 ? html.length : end);
  const out: string[] = [];
  const stack: boolean[] = [];   // for each open tag: is it the Text being read?
  let cur: string | null = null; let depth = 0;
  for (const m of seg.matchAll(/<(\/?)([a-z0-9]+)([^>]*)>|([^<]+)/gi)) {
    if (m[4] != null) { if (cur != null) cur += m[4]; continue; }
    const [, close, tag, attrs] = m;
    if (/^(img|br|meta|input)$/i.test(tag)) continue;
    if (close) {
      const isT = stack.pop();
      if (cur != null) depth--;
      if (isT && cur != null && depth === 0) {
        const t = cur.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
        if (t) out.push(t);
        cur = null;
      }
      continue;
    }
    const isText = tag === 'div' && /class="t"/.test(attrs);
    if (cur == null && isText) { cur = ''; depth = 1; stack.push(true); continue; }
    if (cur != null) depth++;
    stack.push(false);
  }
  return out;
}
