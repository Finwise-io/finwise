// Global in-app text scaling (accessibility / large-text mode).
// The app hardcodes fontSize in StyleSheets, so a true app-wide multiplier needs a render-level hook:
// we patch Text/TextInput render once to flatten the resolved style, read its fontSize, and append a
// scaled fontSize (+ lineHeight) that wins. Driven by a module-level scale set from the store, so any
// re-render (incl. navigating between screens) picks up the current size.
import React from 'react';
import { Text, TextInput, StyleSheet } from 'react-native';

let scale = 1;
export function setGlobalFontScale(s: number) { scale = s && s > 0 ? s : 1; }
export function getGlobalFontScale() { return scale; }

let patched = false;
export function patchTextScaling() {
  if (patched) return;
  patched = true;
  [Text as any, TextInput as any].forEach((Comp: any) => {
    const orig = Comp.render;
    if (typeof orig !== 'function') return;
    Comp.render = function patchedRender(...args: any[]) {
      const el = orig.apply(this, args);
      if (!el || scale === 1 || !el.props) return el;
      const flat: any = StyleSheet.flatten(el.props.style) || {};
      if (!flat.fontSize) return el;
      const extra: any = { fontSize: flat.fontSize * scale };
      if (flat.lineHeight) extra.lineHeight = flat.lineHeight * scale;
      return React.cloneElement(el, { style: [el.props.style, extra] });
    };
  });
}

export const FONT_SCALES: { label: string; value: number }[] = [
  { label: 'Default', value: 1 },
  { label: 'Large', value: 1.15 },
  { label: 'Larger', value: 1.3 },
];
