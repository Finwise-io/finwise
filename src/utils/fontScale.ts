// Global in-app text scaling (accessibility / large-text mode).
// The app hardcodes fontSize in StyleSheets, so a true app-wide multiplier needs a render-level hook.
// In RN 0.85 / React 19, Text & TextInput are PLAIN function components (no .render to patch), so we
// instead swap the `react-native` module's Text/TextInput exports with thin wrappers that scale the
// resolved fontSize. Metro accesses these as namespace props at call time, so the swap reaches every
// `import { Text } from 'react-native'` app-wide. Scale is module-level + the nav tree remounts on
// change (Stack key), so screens pick up the current size.
import React from 'react';
import { StyleSheet } from 'react-native';

const RN: any = require('react-native');

let scale = 1;
export function setGlobalFontScale(s: number) { scale = s && s > 0 ? s : 1; }
export function getGlobalFontScale() { return scale; }

let patched = false;
export function patchTextScaling() {
  if (patched) return;
  patched = true;
  for (const key of ['Text', 'TextInput']) {
    const Orig = RN[key];
    if (!Orig) continue;
    const Scaled = (props: any) => {
      if (scale === 1) return React.createElement(Orig, props);
      const flat: any = StyleSheet.flatten(props?.style) || {};
      if (!flat.fontSize) return React.createElement(Orig, props);
      const extra: any = { fontSize: flat.fontSize * scale };
      if (flat.lineHeight) extra.lineHeight = flat.lineHeight * scale;
      return React.createElement(Orig, { ...props, style: [props.style, extra] });
    };
    (Scaled as any).displayName = `Scaled${key}`;
    // RN's index exposes Text/TextInput as getter-only lazy exports, so plain assignment is a no-op —
    // redefine the property to return our wrapper.
    try { Object.defineProperty(RN, key, { configurable: true, enumerable: true, get: () => Scaled }); }
    catch { try { RN[key] = Scaled; } catch { /* frozen — ignore */ } }
  }
}

export const FONT_SCALES: { label: string; value: number }[] = [
  { label: 'Default', value: 1 },
  { label: 'Large', value: 1.15 },
  { label: 'Larger', value: 1.3 },
];
