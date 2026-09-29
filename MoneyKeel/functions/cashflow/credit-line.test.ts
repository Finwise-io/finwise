/** THE DOOR FOR "how much of my credit line is used" — MK-CF-O-006 theCreditLine (Q-CF-6). */
import { theCreditLine } from './credit-line';

test('the share used is what is owed over the limit, with the band it falls in', () => {
  expect(theCreditLine({ balance: 3000, limit: 10000 }).used).toBeCloseTo(0.3, 6);
  expect(theCreditLine({ balance: 3000, limit: 10000 }).status).toBe('good');
  expect(theCreditLine({ balance: 4500, limit: 10000 }).status).toBe('caution');
  expect(theCreditLine({ balance: 8000, limit: 10000 }).status).toBe('high');
});

test('NO LIMIT, NO RATIO — a 0% would read as "you have used none of it"', () => {
  const r = theCreditLine({ balance: 3000, limit: 0 });
  expect(r.used).toBeNull();
  expect(r.status).toBeNull();
});

test('owing nothing against a real limit is a true zero', () => {
  expect(theCreditLine({ balance: 0, limit: 10000 }).used).toBe(0);
  expect(theCreditLine({ balance: 0, limit: 10000 }).status).toBe('good');
});
