/**
 * Naming consistency guard (the label twin of the A-2 number-agreement work): one concept → one WORD,
 * everywhere the user sees it. Asset-class labels come from the single canonical ASSET_CLASS_LABEL, and
 * the onboarding goal uses the standard finance terms ("Real estate" + "Personal property"), not the
 * colloquial "belongings". (modules.tsx/screens import RN, so we assert on source text where needed.)
 */
import * as fs from 'fs';
import * as path from 'path';
import { ASSET_CLASS_LABEL } from '../domain/assets';

test('canonical asset-class labels use the standard finance terms', () => {
  expect(ASSET_CLASS_LABEL.real_estate).toBe('Real estate');
  expect(ASSET_CLASS_LABEL.personal_property).toBe('Personal property');   // standard term, NOT "belongings"
  expect(ASSET_CLASS_LABEL.cash).toBe('Cash');
});

test('the Net Worth donut reads labels from ASSET_CLASS_LABEL (single source — no hardcoded class names)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'screens', 'NetWorthScreen.tsx'), 'utf8');
  expect(src).toMatch(/ASSET_CLASS_LABEL\[key\]/);
  expect(src).not.toMatch(/label: 'Personal property'/);   // not hardcoded in CLASS_META anymore
});

test('the onboarding "property" goal uses the canonical class terms, not "belongings"', () => {
  const src = fs.readFileSync(path.join(__dirname, 'engine.ts'), 'utf8');
  const line = src.split('\n').find((l) => l.includes("value: 'property'") && l.includes('title')) || '';
  expect(line).toMatch(/real estate/i);
  expect(line).toMatch(/personal property/i);
  expect(line).not.toMatch(/belongings/i);
});

test('stock-option entry clarifies the unit (options = shares, not 100-share trading contracts)', () => {
  const src = fs.readFileSync(path.join(__dirname, 'modules.tsx'), 'utf8');
  expect(src).toMatch(/Each option = 1 share/);
  expect(src).toMatch(/NOT 100-share trading contracts/);
});
