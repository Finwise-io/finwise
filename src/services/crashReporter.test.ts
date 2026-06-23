jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: {} } } }));
(global as any).__DEV__ = false;

import * as fs from 'fs';
import * as path from 'path';
import { initCrashReporting, captureException, setUserScope, sendTestReport, crashReportingEnabled } from './crashReporter';

// B-L2: until a SENTRY_DSN + the native SDK are present, crash reporting must be a SAFE no-op (the app
// never depends on Sentry being installed). When it IS configured, the call sites already in place
// (app/_layout initCrashReporting + setUserScope; ErrorBoundary captureException) start shipping events.
describe('crashReporter — safe no-op until Sentry + DSN are configured', () => {
  beforeAll(() => { jest.spyOn(console, 'error').mockImplementation(() => {}); });

  test('initialises without a DSN/SDK and never throws; reporting stays disabled', () => {
    expect(() => initCrashReporting()).not.toThrow();
    expect(crashReportingEnabled()).toBe(false);
  });

  test('captureException / setUserScope no-op safely when disabled', () => {
    expect(() => captureException(new Error('boom'), { a: 1 })).not.toThrow();
    expect(() => setUserScope('uid123')).not.toThrow();
    expect(() => setUserScope(null)).not.toThrow();
  });

  test('sendTestReport returns false (nothing shipped) when reporting is off', () => {
    expect(sendTestReport()).toBe(false);
  });
});

// Static guard: the Settings "Send a diagnostic report" row must stay wired to sendTestReport so the
// B-L2 production-verification path can't silently break.
test('Settings wires the diagnostic row to sendTestReport (B-L2 verification path)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'screens', 'SettingsScreen.tsx'), 'utf8');
  expect(src).toMatch(/sendTestReport\(\)/);
  expect(src).toMatch(/Send a diagnostic report/);
});
