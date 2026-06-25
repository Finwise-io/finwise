// Guards for the build-30 device-only fixes (Workstream E). These pin the code-level change; the actual
// behavior is confirmed on the device build (T09/T10/T22 were device-perception/visibility issues).
import * as fs from 'fs';
import * as path from 'path';
const readSrc = (p: string) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('T22: the cash-flow detail route is registered with a titled header + back button', () => {
  const layout = fs.readFileSync(path.join(__dirname, '..', '..', 'app', '_layout.tsx'), 'utf8');
  expect(layout).toMatch(/name="cashflow"/);
  expect(layout).toMatch(/Cash-flow detail/);
});

test('T09: the Roth verdict is no longer hidden in Simple mode (only its rationale is Advisor-only)', () => {
  const cockpit = readSrc('screens/RetirementCockpit.tsx');
  expect(cockpit).not.toMatch(/\{!simple && <Text[^>]*>⚖️/);   // the whole line must NOT be gated on !simple
  expect(cockpit).toMatch(/⚖️ <Text/);                          // the lean verdict renders unconditionally
});
