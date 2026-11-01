// THE EVIDENCE GENERATOR'S OWN JEST CONFIG (2026-10-31, BRIEF-94).
// Run only by build-cf-evidence-package.py. It renders screens the way the app's UI tests do (the jest-expo preset and the
// same setup file as the `ui` project in jest.config.js), but it matches ONLY the generator, whose name has no ".test." in it —
// so the app's own `npx jest` never runs it, and nothing it writes lands in the suite.
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..', '..');
const ui = require(path.join(ROOT, 'jest.config.js')).projects.find((p) => p.displayName === 'ui');
if (!ui) throw new Error('jest.config.js has no `ui` project — the generator can no longer copy how the app renders a screen');

module.exports = {
  rootDir: ROOT,
  testTimeout: 600_000,
  preset: ui.preset,
  setupFiles: ui.setupFiles,
  transformIgnorePatterns: ui.transformIgnorePatterns,
  moduleNameMapper: ui.moduleNameMapper,
  testMatch: ['<rootDir>/Calculation Module code/scripts/cf-evidence/*.gen.tsx'],
};
