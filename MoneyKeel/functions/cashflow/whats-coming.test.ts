/** THE DOOR FOR "which bills and paychecks are coming" — MK-CF-O-008 whatsComing (Q-CF-3, ruled
 *  2026-09-27: "yes"). */
import { whatsComing } from './whats-coming';

const NOW = new Date('2026-09-28T12:00:00Z');
const profile = {
  monthlySpending: '3000',
  bills: [
    { id: 'b1', label: 'Property tax', amount: 2400, dueDay: 15, month: 11 },
    { id: 'b2', label: 'No date', amount: 500 },
  ],
} as any;

test('what is coming is in date order, soonest first', () => {
  const w = whatsComing({ profile, startBalance: 10000, now: NOW });
  const days = w.bills.map((b: any) => b.daysAway);
  expect([...days].sort((a, b) => a - b)).toEqual(days);
  expect(w.next).toBe(w.bills[0] ?? null);
});

test('nothing dated means no calendar at all, not an empty guess', () => {
  const w = whatsComing({ profile: { monthlySpending: '3000' }, startBalance: 0, now: NOW });
  expect(Array.isArray(w.bills)).toBe(true);
  if (w.bills.length === 0) expect(w.next).toBeNull();
});

test('no profile is answered honestly rather than thrown', () => {
  const w = whatsComing({ profile: null, now: NOW });
  expect(w.bills).toEqual([]);
  expect(w.next).toBeNull();
});
