// DESKTOP Phase 1 — react-native-web PLUS the pieces the phone code expects that RNW omits.
// Metro aliases 'react-native' HERE on web only (see metro.config.js). Keep this file tiny.
export * from 'react-native-web';
export { default } from 'react-native-web';

// Alert: RNW has none. Browser-native dialogs are the honest Phase-1 stand-in; the desktop
// design phase replaces them with styled sheets (mock-gated).
export const Alert = {
  alert(title, message, buttons) {
    const text = [title, message].filter(Boolean).join('\n\n');
    if (!buttons || buttons.length === 0) { window.alert(text); return; }
    if (buttons.length === 1) { window.alert(text); buttons[0].onPress?.(); return; }
    const cancel = buttons.find((b) => b.style === 'cancel');
    const primary = buttons.find((b) => b !== cancel) ?? buttons[0];
    const labels = buttons.map((b) => b.text).join(' / ');
    if (window.confirm(text + '\n\n[OK = ' + (primary.text ?? 'OK') + ' · Cancel = ' + (cancel?.text ?? 'Cancel') + ']' + (buttons.length > 2 ? '\n(all options: ' + labels + ')' : ''))) primary.onPress?.();
    else cancel?.onPress?.();
  },
};
