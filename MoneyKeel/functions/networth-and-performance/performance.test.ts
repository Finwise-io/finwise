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

/** EVERY RETURN IS TIME-WEIGHTED (owner decision, 2026-10-04, DEC-1669: "All return should be True
 *  Weighted Return and not Dietz return."). Mark 16 of Performance v17 — a money-weighted rate per
 *  year standing in where the old return refused — is gone with the method it stood in for: nothing
 *  stands in for a time-weighted return. Where it cannot be measured there is no percent, and a
 *  sentence saying why.
 */
describe('the return is time-weighted — and nothing stands in for it', () => {
  const day = (d: string, v: number) => ({
    date: d, origin: 'observed', writtenAt: 'x',
    holdings: [{ accountId: 'a1', securityKey: 'X', units: 1, price: v, value: v }],
    accounts: [{ date: d, accountId: 'a1', cash: 0, statedTotal: v, currency: 'USD' }],
  });
  const dep = (amount: number, date: string) => [{ txn_id: 'c', account_id: 'a1', type: 'DEPOSIT', amount, date }];
  const ask = (days: any[], end: number, txns: any[] = []) => thePerformance({
    windowStart: '2025-10-02', windowLabel: 'since Oct 1', today: '2026-09-30',
    ending: end, pricedGain: 0, transactions: txns,
    snapshotDays: days as any, investmentAccountIds: new Set(['a1']),
  });

  test('money paid in is never counted as earned: $100,000 → $108,000, +$15,000 in, → $129,150 is +13.40%', () => {
    // worth $123,000 at the close of the day the $15,000 arrived, so $108,000 just before it
    const a = ask([day('2025-10-01', 100_000), day('2026-04-01', 123_000)], 129_150, dep(15_000, '2026-04-01'));
    expect(a.ret).toBeCloseTo((108_000 / 100_000) * (129_150 / 123_000) - 1, 10);   // 1.08 × 1.05 − 1
    expect(a.ret).toBeCloseTo(0.134, 10);
    expect(a.sentence).toBe('');
    expect('refusedRate' in a).toBe(false);            // the stand-in rate does not exist any more
  });

  test('money moved on a day with no recorded value: no percent, and the sentence names the day', () => {
    const a = ask([day('2025-10-01', 100_000)], 123_000, dep(15_000, '2026-04-01'));
    expect(a.ret).toBeNull();
    expect(a.cumulative).toBeNull();
    expect(a.sentence).toBe('Money moved in or out on Apr 1, 2026 and no value was recorded that day, so a return cannot be measured across it. The dollar figures here are still right.');
    expect(a.walk.contributions).toBe(15_000);         // the dollar walk still answers
  });

  test('nothing moved: the plain growth', () => {
    const a = ask([day('2025-10-01', 20_000)], 22_000);
    expect(a.ret).toBeCloseTo(0.10, 10);
    expect(a.sentence).toBe('');
  });

  test('with no beginning to stand on, there is no return', () => {
    const noRecord = thePerformance({
      windowStart: '2025-10-02', windowLabel: 'since', today: '2026-09-30',
      ending: 0, pricedGain: 0, transactions: [], snapshotDays: [],
      investmentAccountIds: new Set(['a1']),
    });
    expect(noRecord.ret).toBeNull();
    expect(noRecord.covered).toBe(false);
  });

  test('a record on some other account is not money put into these investments', () => {
    const other = [{ txn_id: 's', account_id: 'savings', type: 'DEPOSIT', amount: 9_000, date: '2026-04-01' }];
    const a = ask([day('2025-10-01', 20_000)], 22_000, other);
    expect(a.walk.contributions).toBe(0);
    expect(a.ret).toBeCloseTo(0.10, 10);
  });
});
