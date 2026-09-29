/** THE DOOR FOR "what are my bonds worth" — MK-NW-O-001 theBonds (Q-NW-4, ruled 2026-09-27).
 *
 *  The laws the door must hold, including both halves of the founder's answer: one question so the
 *  two screens cannot disagree, and a CD is not a tradeable bond.
 */
import { theBonds, isCertificateOfDeposit } from './bonds';

const inYears = (n: number) => new Date(Date.now() + n * 365 * 864e5).toISOString().slice(0, 10);
const bond = (over: Partial<any> = {}) => ({
  asset_id: 'b1', label: 'US Treasury 4.25% 2028', institution: 'E*TRADE', kind: 'fixed_income',
  tax_bucket: 'TAXABLE', balance: 9800, face_value: 10000, coupon_rate: 0.0425,
  maturity_date: inYears(2), ...over,
} as any);
const cd = (over: Partial<any> = {}) => bond({ asset_id: 'c1', label: 'KeyBank CD 4.00%', institution: 'KeyBank', coupon_rate: 0.04, balance: 10000, ...over });

test('a CD is recognised by its name, wherever the name carries it', () => {
  expect(isCertificateOfDeposit({ label: 'KeyBank CD 4.00%' } as any)).toBe(true);
  expect(isCertificateOfDeposit({ label: 'Savings', institution: 'Ally Certificate of Deposit' } as any)).toBe(true);
  expect(isCertificateOfDeposit({ label: 'US Treasury 4.25% 2028' } as any)).toBe(false);
  expect(isCertificateOfDeposit({ label: 'Vanguard CD Fund' } as any)).toBe(true);   // named CD, treated as one
});

test('the totals are the sum of the rows — the two screens read one answer', () => {
  const a = theBonds({ accounts: [bond(), cd()] });
  expect(a.count).toBe(2);
  expect(a.rows).toHaveLength(2);
  expect(a.totalValue).toBe(a.rows.reduce((t, r) => t + r.value, 0));
  expect(a.totalFace).toBe(a.rows.reduce((t, r) => t + r.face, 0));
  expect(Math.round(a.couponPerYear)).toBe(Math.round(a.rows.reduce((t, r) => t + r.couponPerYear, 0)));
});

test('a bond gets the rates-move estimate, and no refusal', () => {
  const a = theBonds({ accounts: [bond()], accountId: 'b1' });
  expect(a.one).not.toBeNull();
  expect(a.one!.isCD).toBe(false);
  expect(a.one!.ratesMove).not.toBeNull();
  expect(a.one!.ratesMove!.ratesUp.delta).toBeLessThanOrEqual(0);   // rates up, value down
  expect(a.one!.ratesMoveRefusal).toBe('');
});

test('A CD NEVER GETS ONE, and the door says why (founder, 2026-09-27)', () => {
  const a = theBonds({ accounts: [cd()], accountId: 'c1' });
  expect(a.one!.isCD).toBe(true);
  expect(a.one!.ratesMove).toBeNull();
  expect(a.one!.ratesMoveRefusal).toMatch(/not traded/);
  expect(a.one!.ratesMoveRefusal).toMatch(/fixed penalty/);
  expect(a.one!.ratesMoveRefusal).toMatch(/brokered CD/);
});

test('the one account asked for is the one answered, and only that one', () => {
  const a = theBonds({ accounts: [bond(), cd()], accountId: 'c1' });
  expect(a.one!.accountId).toBe('c1');
  expect(a.count).toBe(2);        // the totals still cover everything held
});

test('no account named → no "one", and the totals still answer', () => {
  const a = theBonds({ accounts: [bond(), cd()] });
  expect(a.one).toBeNull();
  expect(a.totalValue).toBeGreaterThan(0);
});

test('nothing held → zeros and an empty list, never a wrong number', () => {
  const a = theBonds({ accounts: [] });
  expect(a.count).toBe(0);
  expect(a.rows).toEqual([]);
  expect(a.one).toBeNull();
});

test('a matured bond says so and is refused the estimate', () => {
  const a = theBonds({ accounts: [bond({ maturity_date: inYears(-1) })], accountId: 'b1' });
  expect(a.one!.matured).toBe(true);
});
