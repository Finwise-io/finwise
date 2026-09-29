/** THE DOOR FOR "how are my investments doing" — MK-NW-O-008 thePerformance (Q-PF-1, ruled by the
 *  founder 2026-09-27: "yes").
 *
 *  Four rulings live in this door, and each was paid for once. These are their laws.
 */
import { thePerformance } from './performance';

const day = (date: string, value: number) => ({
  date, origin: 'observed' as const, writtenAt: `${date}T12:00:00.000Z`,
  holdings: [{ date, accountId: 'a1', securityKey: 'VTI', units: 1, price: value, value, currency: 'USD' }],
  accounts: [{ date, accountId: 'a1', cash: 0, statedTotal: value, currency: 'USD' }],
});
const IDS = new Set(['a1']);

test('the walk always sums to the ending, by construction', () => {
  const f = thePerformance({
    windowStart: '2026-01-01', windowLabel: 'since Jan 1', today: '2026-07-01',
    ending: 120000, pricedGain: 0, investmentAccountIds: IDS,
    snapshotDays: [day('2025-12-31', 100000)],
    transactions: [{ id: 1, date: '2026-03-01', type: 'DEPOSIT', amount: 10000 }],
  });
  const w = f.walk;
  expect(w.beginning + w.contributions - w.withdrawals + w.wealthGenerated).toBeCloseTo(w.ending, 4);
  expect(w.beginning).toBe(100000);        // READ from the record, not derived
  expect(f.measured).toBe(100000);
});

test('THE BEGINNING IS READ, NEVER BACK-FILLED — and when the record cannot reach, it is derived and says so', () => {
  const read = thePerformance({
    windowStart: '2026-01-01', windowLabel: 'x', today: '2026-07-01', ending: 120000, pricedGain: 5000,
    investmentAccountIds: IDS, snapshotDays: [day('2025-12-31', 100000)], transactions: [],
  });
  expect(read.measured).toBe(100000);      // the record answered

  const derived = thePerformance({
    windowStart: '2026-01-01', windowLabel: 'x', today: '2026-07-01', ending: 120000, pricedGain: 5000,
    investmentAccountIds: IDS, snapshotDays: [], transactions: [],
  });
  expect(derived.measured).toBeNull();     // the record could not, and the figure admits it
  expect(derived.walk.beginning).toBe(120000 - 5000);
});

test('A RATE NEEDS SOMETHING TO STAND ON — no record and no movement means no return', () => {
  const f = thePerformance({
    windowStart: '2026-01-01', windowLabel: 'x', today: '2026-07-01', ending: 0, pricedGain: 0,
    investmentAccountIds: IDS, snapshotDays: [], transactions: [],
  });
  expect(f.ret).toBeNull();               // never a confident +0.00%
  expect(f.cumulative).toBeNull();
});

test('ONE MEANING OF RETURN: dividends and interest are inside wealth generated', () => {
  const f = thePerformance({
    windowStart: '2026-01-01', windowLabel: 'x', today: '2026-07-01', ending: 110000, pricedGain: 0,
    investmentAccountIds: IDS, snapshotDays: [day('2025-12-31', 100000)],
    transactions: [
      { id: 1, date: '2026-02-01', type: 'DIVIDEND', amount: 400 },
      { id: 2, date: '2026-03-01', type: 'INTEREST', amount: 100 },
    ],
  });
  expect(f.walk.dividends).toBe(400);
  expect(f.walk.interest).toBe(100);
  expect(f.walk.wealthGenerated).toBeCloseTo(10000, 4);   // the whole gain, income included
});

test('A WINDOW LONGER THAN A YEAR CARRIES BOTH: the total and the yearly rate', () => {
  const f = thePerformance({
    windowStart: '2024-01-01', windowLabel: 'since Jan 2024', today: '2026-07-01',
    ending: 121000, pricedGain: 0, investmentAccountIds: IDS,
    snapshotDays: [day('2023-12-31', 100000)], transactions: [],
  });
  expect(f.years).toBeGreaterThan(1);
  expect(f.cumulative).not.toBeNull();
  expect(f.perYear).not.toBeNull();
  expect(f.perYear!).toBeLessThan(f.cumulative!);    // a yearly rate is smaller than the total
  expect(f.ret).toBe(f.perYear);                     // and the yearly rate is what a long window shows
});

test('a window under a year shows the total, and no yearly rate at all', () => {
  const f = thePerformance({
    windowStart: '2026-01-01', windowLabel: 'x', today: '2026-07-01', ending: 110000, pricedGain: 0,
    investmentAccountIds: IDS, snapshotDays: [day('2025-12-31', 100000)], transactions: [],
  });
  expect(f.perYear).toBeNull();
  expect(f.ret).toBe(f.cumulative);
});
