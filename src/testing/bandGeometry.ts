/** WHERE EACH BAR REACHES, READ OFF THE RENDERED SCREEN (2026-10-27, FX-PLAN; his words that day, DEC-8839: "the standard design says
 *  box titles in dark green bar, and sub-titles in light green bar"; the standing rule that a bar runs edge to edge, 2026-08-11).
 *
 *  A source guard can read what a bar was told (`inCard`, a bleed wrapper); only the rendered tree says where it ends up. This walks
 *  the tree a test renderer gives, adding up every margin and padding on the way down, and reports for each bar how far its left and
 *  right edges sit from the edges of the surface it is drawn on — its card, or the page (the screen's own background). A bar that
 *  runs edge to edge reads 0 and 0.
 *
 *  What it assumes, said plainly: boxes stack top to bottom and stretch across their parent (the app's layout for every card and
 *  bar). A bar inside a row would read wrong, which is why a bar in a row is refused outright by guard_band_never_beside_title. */
import { Colors } from '../utils/theme';

type Style = Record<string, any>;
const flat = (st: any): Style => (Array.isArray(st) ? st.reduce((a: Style, x: any) => ({ ...a, ...flat(x) }), {}) : st && typeof st === 'object' ? st : {});
const side = (st: Style, prop: 'margin' | 'padding', which: 'Left' | 'Right'): number =>
  Number(st[`${prop}${which}`] ?? st[`${prop}Horizontal`] ?? st[prop] ?? 0) || 0;

/** left, right: how far the bar stops short of its surface's edges; screenLeft, screenRight: of the phone's own edges */
export type BarReach = { kind: 'dark' | 'light'; title: string; surface: string; left: number; right: number; screenLeft: number; screenRight: number };

const textOf = (n: any): string => (n == null ? '' : typeof n === 'string' ? n : Array.isArray(n) ? n.map(textOf).join('') : (n.children ?? []).map(textOf).join(''));

/** Every bar in the rendered tree (a row-laid View on the deep-green or the light-green fill, 8 points tall of padding — the
 *  SectionBand's own shape), with how far it stops short of its surface's left and right edges. */
export function barsAndReach(tree: any): BarReach[] {
  const out: BarReach[] = [];
  // L, R: the left and right edges of the parent's content, from the screen's edges; surface: the nearest box with a fill
  const walk = (n: any, L: number, R: number, surf: { name: string; L: number; R: number }) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach((c) => walk(c, L, R, surf)); return; }
    const st = flat(n.props?.style);
    const l = L + side(st, 'margin', 'Left'), r = R + side(st, 'margin', 'Right');
    const fill = st.backgroundColor;
    const isBar = (fill === Colors.primaryDeep || fill === Colors.bandLight) && st.flexDirection === 'row' && st.paddingVertical === 8;
    if (isBar) {
      out.push({ kind: fill === Colors.primaryDeep ? 'dark' : 'light', title: textOf((n.children ?? [])[0]).trim() || textOf(n).trim(),
        surface: surf.name, left: Math.round((l - surf.L) * 100) / 100, right: Math.round((r - surf.R) * 100) / 100,
        screenLeft: Math.round(l * 100) / 100, screenRight: Math.round(r * 100) / 100 });
      return;
    }
    const next = fill && fill !== 'transparent' ? { name: String(n.props?.testID ?? fill), L: l, R: r } : surf;
    // a scroll view carries its content's padding as a prop of its own (the test renderer's inner View has no style)
    const cc = flat(n.props?.contentContainerStyle);
    const pl = side(st, 'padding', 'Left') + side(cc, 'padding', 'Left'), pr = side(st, 'padding', 'Right') + side(cc, 'padding', 'Right');
    (n.children ?? []).forEach((c: any) => walk(c, l + pl, r + pr, next));
  };
  walk(tree, 0, 0, { name: 'screen', L: 0, R: 0 });
  return out;
}
