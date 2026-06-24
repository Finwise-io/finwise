/**
 * THEME 3 GUARD: any input surface (a Modal or sheet that contains a TextInput) must handle the
 * keyboard, so a field can never hide behind it — the 401(k)-amount frustration that started this.
 * Enforces that every screen/component file with a <Modal> + a TextInput also pulls in
 * KeyboardAvoidingView or the shared <KeyboardAwareSheet/>. A new screen that forgets fails CI here.
 *
 * (File-level guard: it can't prove every individual Modal in a multi-modal file is wrapped — but it
 *  catches the common regression of a whole surface shipping with no keyboard handling at all.)
 */
import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..');
function walkTsx(d: string): string[] {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return walkTsx(p);
    return p.endsWith('.tsx') ? [p] : [];
  });
}

test('every Modal with a TextInput handles the keyboard (KeyboardAvoidingView / KeyboardAwareSheet)', () => {
  const files = walkTsx(path.join(root, 'screens')).concat(walkTsx(path.join(root, 'components')));
  const offenders = files.filter((f) => {
    const s = fs.readFileSync(f, 'utf8');
    return s.includes('<Modal') && /\bTextInput\b/.test(s)
      && !/KeyboardAvoidingView|KeyboardAwareSheet/.test(s);
  }).map((f) => path.relative(root, f));
  expect(offenders).toEqual([]);
});
