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

test('Theme 1: deprecated synonyms are retired from user-facing labels (one concept → one word)', () => {
  const screen = (f: string) => fs.readFileSync(path.join(__dirname, '..', 'screens', f), 'utf8');
  const modules = fs.readFileSync(path.join(__dirname, 'modules.tsx'), 'utf8');

  // "Alternatives" (the canonical asset class), not "Other investments"
  expect(screen('OtherInvestmentsScreen.tsx')).toMatch(/<Text style={styles\.h1}>Alternatives<\/Text>/);
  expect(screen('NetWorthScreen.tsx')).not.toMatch(/Other investments —/);

  // tax treatment uses canonical words, not the "brokerage" wrapper
  expect(screen('RetirementCockpit.tsx')).not.toMatch(/Taxable \/ brokerage/);

  // Take-home: one casing, no redundant "(After Tax)" qualifier, and the take-home figure is never "Available"
  expect(modules).not.toMatch(/Take-Home \(After Tax\)/);
  expect(modules).not.toMatch(/Available \(after tax & 401/);
});

test('Bonds + Alternatives expose a "Record a sale" action (they are sellable — secondary-market bonds, options before expiry)', () => {
  const bonds = fs.readFileSync(path.join(__dirname, '..', 'screens', 'BondsScreen.tsx'), 'utf8');
  const alts = fs.readFileSync(path.join(__dirname, '..', 'screens', 'OtherInvestmentsScreen.tsx'), 'utf8');
  // a full sale closes the position (onDelete); a partial sale lowers the value (onSave) — both wired via applySale.
  for (const src of [bonds, alts]) {
    expect(src).toMatch(/Record a sale/);
    expect(src).toMatch(/applySale/);
    expect(src).toMatch(/onDelete\?\.\(\)/);   // full sale closes
  }
});

test('NW: investment rows group by asset CLASS label + a true By-institution view (not kind labels)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'screens', 'NetWorthScreen.tsx'), 'utf8');
  expect(src).toMatch(/By institution/);
  expect(src).not.toMatch(/'By account'/);                       // renamed from the misleading label
  expect(src).toMatch(/ASSET_CLASS_LABEL\[assetClassOf\(a\)\]/);  // class label, not assetKind().label
});

test('Theme 1: Net Worth capture reads as account framing (Option B) with canonical hints', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'screens', 'NetWorthScreen.tsx'), 'utf8');
  expect(src).toMatch(/Investments: 'Taxable accounts'/);
  expect(src).toMatch(/Retirement: 'Retirement accounts'/);
  expect(src).toMatch(/Property: 'Real estate & personal property'/);
  // section hints rewritten in canonical terms — property names real estate, not bare "belongings/valuables"
  expect(src).toMatch(/Home & other real estate/);
  expect(src).not.toMatch(/Home, vehicles, valuables/);
});
