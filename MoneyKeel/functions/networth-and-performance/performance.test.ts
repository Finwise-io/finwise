/** THE DOOR FOR "how are my investments doing" — MK-NW-O-008 thePerformance (Q-PF-1, ruled by the
 *  founder 2026-09-27: "yes").
 *
 *  Four rulings live in this door, and each was paid for once. These are their laws.
 */
import { thePerformance, windowStartKey } from './performance';

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

/* ── B-115 · THE "SINCE" WINDOW ASKED THE RECORD FOR A DAY IT DOES NOT HAVE ───────────────────────
 *
 *  Performance opens on "Since", and "Since" used to start ON the record's first day. A window's
 *  beginning is read at the day BEFORE it opens, so that asked for the day before the record began,
 *  got nothing, and back-solved the beginning from the ending instead — which is the one thing his
 *  ruling forbids (B-98: THE BEGINNING IS READ, NEVER BACK-FILLED).
 *
 *  On a household whose investments went from $100,000 to $130,000 over a month of daily records,
 *  the Performance tab showed a walk from $130,000 to $130,000 and NO return at all, while the
 *  account page — which had always opened the day after — showed $100,000 → $130,000, +30.00%.
 */
describe('B-115 — the Since window opens where the record can answer', () => {
  const day = (n: number) => {
    const d = new Date('2026-09-30T12:00:00Z'); d.setUTCDate(d.getUTCDate() - n);
    return d.toISOString().slice(0, 10);
  };
  const RECORD = Array.from({ length: 31 }, (_, i) => {
    const v = 100_000 + 1_000 * i;
    return {
      date: day(30 - i), origin: 'observed', writtenAt: '2026-09-30T00:00:00Z',
      holdings: [{ accountId: 'a1', securityKey: 'VTI', symbol: 'VTI', units: 1000, price: v / 1000, value: v }],
      accounts: [{ date: day(30 - i), accountId: 'a1', cash: 0, statedTotal: v, currency: 'USD' }],
    };
  });
  const DATES = RECORD.map((d) => d.date);
  const TODAY = '2026-09-30';

  test('the beginning is READ from the record, never back-solved from the ending', () => {
    const start = windowStartKey('SINCE', DATES, TODAY);
    const answer = thePerformance({
      windowStart: start, windowLabel: 'since', today: TODAY,
      ending: 130_000, pricedGain: 0, transactions: [],
      snapshotDays: RECORD as any, investmentAccountIds: new Set(['a1']),
    });
    expect(answer.measured).toBe(100_000);          // read — it was null before the fix
    expect(answer.walk.beginning).toBe(100_000);    // back-solved to 130,000 before the fix
    expect(answer.ret).toBeCloseTo(0.3, 6);         // nothing was shown at all before the fix
  });

  test('it opens the day AFTER the first recorded day, so the beginning lands ON that day', () => {
    expect(windowStartKey('SINCE', DATES, TODAY)).toBe(day(29));
    expect(windowStartKey('SINCE', [], TODAY)).toBe(TODAY);   // no record: it opens today, not a year ago
  });
});
