/* What's coming — the door behind the Bill calendar, the radar and the paycheck year. */
import { whatsComing, WHATS_COMING_FIGURES } from './whats-coming';

const profile = {
  monthlySpending: 0,
  spendCats: [
    { id: 'proptax', label: 'Property tax', amount: 4800, bucket: 'nonmonthly', months: [11], dueDay: 1, tier: 'critical' },
    { id: 'carins', label: 'Car insurance', amount: 1400, bucket: 'nonmonthly', months: [10], dueDay: 15 },
  ],
};
const now = new Date('2026-09-28T12:00:00');

describe('MK-CF-O-008 whatsComing — every dated bill ahead, soonest first', () => {
  it('MK-CF-M-028: the bills in date order, with their days away', () => {
    const c = whatsComing({ profile, startBalance: 8000, now, horizonDays: 120 } as any);
    expect(c.bills.map((b) => b.label)).toEqual(['Car insurance', 'Property tax']);
    expect(c.next?.label).toBe('Car insurance');
    expect(c.bills[0].daysAway).toBeGreaterThan(0);
  });
  it('MK-CF-M-062 / 063: a bill the balance covers is not short, and says what is there by then', () => {
    const c = whatsComing({ profile, startBalance: 8000, now, horizonDays: 120 } as any);
    expect(c.bills[0].shortfall).toBe(0);
    expect(c.bills[0].availableByNeed).toBeGreaterThanOrEqual(c.bills[0].amount);
  });
  it('with no balance to start from, every bill is short by its whole amount', () => {
    const c = whatsComing({ profile, startBalance: 0, now, horizonDays: 120 } as any);
    expect(c.bills[0].shortfall).toBe(1400);
  });
  it('every figure this door hands out has a worked example that runs', () => {
    for (const [id, f] of Object.entries(WHATS_COMING_FIGURES as any)) expect(`${id}: ${typeof (f as any).worked?.run}`).toBe(`${id}: function`);
  });
});
