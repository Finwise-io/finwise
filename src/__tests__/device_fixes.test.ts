// Guards for the build-30 device-only fixes (Workstream E). These pin the code-level change; the actual
// behavior is confirmed on the device build (T09/T10/T22 were device-perception/visibility issues).
import * as fs from 'fs';
import * as path from 'path';
const readSrc = (p: string) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('T22 (FCC): cash flow is a bottom TAB — the tab file exists and no stale root route remains', () => {
  // The original T22 loop happened because /cashflow was a root route the guard bounced. FCC makes it
  // a tab: (tabs)/cashflow.tsx must exist, the tab layout must register it, and app/_layout.tsx must
  // NOT register a root "cashflow" screen (a registration without a route file breaks expo-router).
  expect(fs.existsSync(path.join(__dirname, '..', '..', 'app', '(tabs)', 'cashflow.tsx'))).toBe(true);
  expect(fs.existsSync(path.join(__dirname, '..', '..', 'app', 'cashflow.tsx'))).toBe(false);
  const tabs = fs.readFileSync(path.join(__dirname, '..', '..', 'app', '(tabs)', '_layout.tsx'), 'utf8');
  expect(tabs).toMatch(/cashflow/);
  expect(tabs).toMatch(/Cash flow/);
  const layout = fs.readFileSync(path.join(__dirname, '..', '..', 'app', '_layout.tsx'), 'utf8');
  expect(layout).not.toMatch(/name="cashflow"/);
});

test('T09: the Roth verdict is no longer hidden in Simple mode (only its rationale is Advisor-only)', () => {
  const cockpit = readSrc('screens/RetirementCockpit.tsx');
  expect(cockpit).not.toMatch(/\{!simple && <Text[^>]*>⚖️/);   // the whole line must NOT be gated on !simple
  expect(cockpit).toMatch(/⚖️ <Text/);                          // the lean verdict renders unconditionally
});
