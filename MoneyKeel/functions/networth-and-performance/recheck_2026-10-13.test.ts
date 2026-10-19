/* NET WORTH RE-RUN, 2026-10-13 — the card wordings corrected to match the code, each pinned by the code's answer.
 *
 * MK-NW-F-015 totalAssets: a missing balance is left out (adds nothing) and the amber box names the account
 *   (DEC-3279e) — the card used to say "counts as zero".
 * MK-NW-F-039 buildAssetsState: shares and the average return need a total ABOVE zero — the card said "only when
 *   the total is 0"; the code tests total > 0, because an average weighted by a negative total means nothing.
 * MK-NW-F-045 sourceWording: reads the account's last successful sync (MK-XS-I-066), never the time prices were
 *   fetched (MK-XS-I-006) — the card's input list named the price time.
 */
import * as fs from 'fs';
import * as path from 'path';
import { buildAssetsState, sourceWording, retirementEarmarkedValue } from '../../../src/domain/assets';
import { dataGaps } from '../../../src/domain/gaps';

const ROOT = path.resolve(__dirname, '../../..');
const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 13, 12);

// REMOVED 2026-10-19 (DEC-5758, his words: "Removing #4,5,6,7-10,11 - approved."): MK-NW-F-015 totalAssets left the code —
// nothing in the app, the doors or the engines called it; the screen's total comes from MK-NW-F-039 buildAssetsState. The block "MK-NW-F-015 totalAssets — a missing balance is left out, not $0"
// (2 cases) is no longer run; its record is kept in the results file. The number is retired in
// moneykeel_function_register.json, never reused.

describe('MK-NW-F-039 buildAssetsState — zero OR LESS gives 0% shares and no average', () => {
  test('one overdrawn account at −$50 → total −$50, share 0%, no average return', () => {
    const s = buildAssetsState('me' as any, [{ asset_id: 'o', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: -50, target_return: 0.01 } as any]);
    expect(s.total_asset_value).toBe(-50);
    expect(s.accounts[0].portfolio_percentage).toBe(0);
    expect(s.average_target_return).toBeNull();
  });
  test('the card says "zero or less"', () => {
    const rule = JSON.parse(fs.readFileSync(path.join(ROOT, 'Calculation Module code/scripts/moneykeel_function_rules.json'), 'utf8')).rules['MK-NW-F-039'].rule;
    expect(rule).toMatch(/no answer when the total is zero or less/);
    expect(rule).toMatch(/−\$50 → total −\$50, its share 0%, no average return/);
  });
});

describe('MK-NW-F-045 sourceWording — the last successful sync, not the price time', () => {
  test('synced 10 days ago with prices fetched today → "Linked · …" with the age; synced today → "Linked"', () => {
    const old: any = { asset_id: 'l', kind: 'brokerage', source: 'connected', last_synced: new Date(NOW - 10 * DAY).toISOString(), pricesFetchedAt: NOW };
    expect(sourceWording(old, NOW)).toMatch(/^Linked · .+/);
    const fresh: any = { ...old, last_synced: new Date(NOW).toISOString(), pricesFetchedAt: NOW - 30 * DAY };
    expect(sourceWording(fresh, NOW)).toBe('Linked');
  });
  test('the inputs register files last_synced under MK-XS-I-066, not MK-XS-I-006, and the header names it', () => {
    const reg = fs.readFileSync(path.join(ROOT, 'Calculation Module code/scripts/moneykeel_inputs.py'), 'utf8');
    expect(reg).toMatch(/'MK-XS-I-006': \['fetchedAt', 'pricesFetchedAt'\]/);
    expect(reg).toMatch(/'MK-XS-I-066': \('last successful update of a linked or imported account'/);
    const src = fs.readFileSync(path.join(ROOT, 'src/domain/assets/index.ts'), 'utf8');
    const header = src.slice(src.indexOf('/* ─ MK-NW-F-045'), src.indexOf('export function sourceWording'));
    expect(header).toMatch(/MK-XS-I-066/);
    expect(header).not.toMatch(/MK-XS-I-006/);
  });
});

describe('DEC-4913 — the Plan\'s retirement money is handed the rent entries, as Net worth reads them', () => {
  test('handed the profile\'s rent entries, B is a rental and A a second home: $700,000 (it was $400,000 before the Plan was wired)', () => {
    // SETTLED 2026-10-13: every Plan caller now hands in the Income screen's rent entries (profile rentals), so B's home
    // mark no longer decides there. The cross-screen agreement is held by
    // src/screens/__tests__/dec4913_retirement_money_agreement.test.tsx (Net worth vs Plan, same household, $700,000).
    const A: any = { asset_id: 'A', label: 'A', kind: 'home', tax_bucket: 'PROPERTY', balance: 400000 };
    const B: any = { asset_id: 'B', label: 'B', kind: 'home', tax_bucket: 'PROPERTY', balance: 300000, re_use: 'primary' };
    const rentals = [{ property_id: 'B', income: 1400, expenses: 0 }];
    expect(retirementEarmarkedValue([A, B], rentals)).toBe(700000);
    // told nothing about rent (no rent entries at all), the stored home mark still decides
    expect(retirementEarmarkedValue([A, B])).toBe(400000);
  });
});

describe('the cards say what the code does (2026-10-13)', () => {
  const rules = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'Calculation Module code/scripts/moneykeel_function_rules.json'), 'utf8')).rules;
  test('MK-NW-F-090 windowStartKey: any other window name gives nothing (DEC-4640) — card and the code\'s own description', () => {
    expect(rules()['MK-NW-F-090'].rule).toMatch(/Any other label: nothing/);
    expect(rules()['MK-NW-F-090'].rule).not.toMatch(/12 months back, the same/);
    const src = fs.readFileSync(path.join(ROOT, 'MoneyKeel/functions/networth-and-performance/performance.ts'), 'utf8');
    expect(src).toMatch(/nothing for a window name the app does not have \(DEC-4640\)/);
  });
  test('MK-NW-F-107 propertyUses: a rent entry naming no property is not rent (DEC-4059d) — the old exception is gone', () => {
    expect(rules()['MK-NW-F-107'].rule).not.toMatch(/makes the one remaining property a rental/);
    expect(rules()['MK-NW-F-107'].rule).toMatch(/names no property is not rent: it makes no property a rental \(DEC-4059d/);
  });
  test('MK-NW-F-084 and MK-NW-F-094 carry today\'s rules', () => {
    expect(rules()['MK-NW-F-084'].rule).toMatch(/row worth exactly \$0 holds nothing/);
    expect(rules()['MK-NW-F-094'].rule).toMatch(/never \$0 \(DEC-3279e\)/);
    expect(rules()['MK-NW-F-033'].rule).toMatch(/\$700,000/);
  });
});
