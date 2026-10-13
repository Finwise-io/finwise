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
import { totalAssets, buildAssetsState, sourceWording, retirementEarmarkedValue } from '../../../src/domain/assets';
import { dataGaps } from '../../../src/domain/gaps';

const ROOT = path.resolve(__dirname, '../../..');
const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 13, 12);

describe('MK-NW-F-015 totalAssets — a missing balance is left out, not $0', () => {
  test('$1,000 + a linked account with no balance = $1,000, and the amber box names that account', () => {
    const accounts: any[] = [
      { asset_id: 'c', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 1000 },
      { asset_id: 'l', label: 'Linked savings', kind: 'savings', tax_bucket: 'CASH', source: 'connected', balance: null },
    ];
    expect(totalAssets(accounts)).toBe(1000);
    expect(dataGaps(accounts as any).filter((g) => g.kind === 'no-balance').map((g) => g.title)).toEqual([expect.stringContaining('Linked savings')]);
  });
  test('the card and the generated header say "left out", never "counts as zero"', () => {
    const rule = JSON.parse(fs.readFileSync(path.join(ROOT, 'Calculation Module code/scripts/moneykeel_function_rules.json'), 'utf8')).rules['MK-NW-F-015'].rule;
    expect(rule).toMatch(/missing balance is left out \(adds nothing\); the amber box names the account/);
    const src = fs.readFileSync(path.join(ROOT, 'src/domain/assets/index.ts'), 'utf8');
    const header = src.slice(src.indexOf('/* ─ MK-NW-F-015'), src.indexOf('export function totalAssets'));
    expect(header).not.toMatch(/counts as zero/);
    expect(header).not.toMatch(/Called by \.\.\. MK-NW-F-022 investableAssets/);   // investableAssets adds through sumWhere
  });
});

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

describe('DEC-4913 — what the Plan counts today, until its callers hand in the rent entries', () => {
  test('the Plan nest egg reads no rent entries, so B\'s home mark still decides: $400,000 counted (Net worth reading: $700,000)', () => {
    // the standard records this as not yet wired (Plan build); this pins the number so the gap cannot move silently
    const A: any = { asset_id: 'A', label: 'A', kind: 'home', tax_bucket: 'PROPERTY', balance: 400000 };
    const B: any = { asset_id: 'B', label: 'B', kind: 'home', tax_bucket: 'PROPERTY', balance: 300000, re_use: 'primary' };
    expect(retirementEarmarkedValue([A, B])).toBe(400000);
  });
});
