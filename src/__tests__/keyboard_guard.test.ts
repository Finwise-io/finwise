// KEYBOARD RATCHET (2026-07-19, founder's repeated finding: "screen completely behind keyboard").
// The fix has existed as shared machinery since June (KeyboardAwareScreen/Sheet, and the iOS
// ScrollView inset prop) but was applied screen-by-screen — 11 of 31 input screens — with nothing
// stopping a screen from shipping without it. This guard makes the CLASS extinct: every screen
// that renders a TextInput MUST carry keyboard handling. Zero exceptions, no baseline.
import * as fs from 'fs';
import * as path from 'path';

const SCREENS = path.join(__dirname, '..', 'screens');
const HANDLED = /automaticallyAdjustKeyboardInsets|KeyboardAware|KeyboardAvoidingView/;

test('every screen with a TextInput handles the keyboard (inset prop, KeyboardAware*, or KAV)', () => {
  const offenders = fs.readdirSync(SCREENS)
    .filter((f) => f.endsWith('.tsx'))
    .filter((f) => {
      const src = fs.readFileSync(path.join(SCREENS, f), 'utf8');
      return src.includes('<TextInput') && !HANDLED.test(src);
    });
  expect(offenders).toEqual([]);   // a name here = that screen's inputs can hide behind the keyboard
});
