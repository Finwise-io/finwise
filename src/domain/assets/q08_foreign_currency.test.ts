/** Q08 (founder, 2026-08-26): a foreign currency is cash held in that currency; no interest or dividend.
 *  Entered as what it is worth in dollars today — no exchange-rate feed exists (display currency: Q43). */
import { ASSET_KINDS, assetClassOf } from './index';
import { interestIncomeAnnual } from '../bonds';
import { incomeFromAccounts } from '../income/from-accounts';

const fx = { asset_id: 'fx1', kind: 'foreign_currency', label: 'Euros', tax_bucket: 'CASH', balance: 12_000 } as any;

test('it is a kind a person can pick, in the Cash section, with no growth', () => {
  const k = ASSET_KINDS.find((x) => x.id === 'foreign_currency');
  expect(k).toBeDefined();
  expect(k!.section).toBe('Cash');
  expect(k!.bucket).toBe('CASH');
  expect(k!.ret).toBe(0);
});

test('its asset class is cash', () => {
  expect(assetClassOf(fx)).toBe('cash');
});

test('it earns no interest and is not reported as an account we failed to read', () => {
  expect(interestIncomeAnnual([fx])).toBe(0);
  const r = incomeFromAccounts([fx], [], new Date(2026, 8, 10));
  expect(r.annual).toBe(0);
  expect(r.lines).toEqual([]);
  expect(r.missing).toBeNull();
});
