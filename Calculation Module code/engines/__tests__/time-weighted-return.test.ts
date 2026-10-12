/** THE TIME-WEIGHTED RETURN — the one way the app works out a return.
 *
 *  Owner decision, 2026-10-04 (DEC-1669): "All return should be True Weighted Return and not Dietz
 *  return." The first test is his own case, with his numbers.
 */
import { timeWeightedReturn, movementsOf, type DatedAmount } from '../time-weighted-return';

type Row = [account: string, value: number, kind?: 'holding' | 'cash' | 'typed'];
const day = (date: string, rows: Row[], origin: 'observed' | 'reconstructed' = 'observed') => ({
  date, origin, writtenAt: `${date}T00:00:00Z`,
  holdings: rows.filter((r) => (r[2] ?? 'holding') === 'holding').map(([accountId, value]) => ({ date, accountId, securityKey: 'X', units: 1, price: value, value, currency: 'USD' })),
  accounts: rows.map(([accountId, value, kind]) => ({ date, accountId, cash: kind === 'cash' ? value : 0, statedTotal: null, typedValue: kind === 'typed' ? value : null, currency: 'USD' })),
}) as any;
const dep = (date: string, accountId: string, amount: number): DatedAmount => ({ date, accountId, amount });
const ask = (days: any[], flows: DatedAmount[], start: string, end: string, more: Record<string, any> = {}) =>
  timeWeightedReturn({ days, accountIds: new Set(['a', 'b', 'c', 's']), flows, start, end, ...more });

describe('his case: $200,000, then $60,000 paid in on a day worth $212,400 before it, then $284,630', () => {
  const days = [day('2025-10-04', [['a', 200_000]]), day('2026-04-15', [['a', 272_400]]), day('2026-10-04', [['a', 284_630]])];
  // His words give the value BEFORE the $60,000: $212,400. Since DEC-4439 (2026-10-11) "before" is the previous
  // evening, so his case is written with that evening recorded — and his 10.97% stands.
  const hisDays = [days[0], day('2026-04-14', [['a', 212_400]]), days[1], days[2]];
  test('time-weighted: 1.062 × 1.0448972 − 1 = 10.97% — not the 42.32% a balance change gives', () => {
    const v = ask(hisDays, [dep('2026-04-15', 'a', 60_000)], '2025-10-04', '2026-10-04');
    // 212,400 ÷ 200,000 = 1.062 · 272,400 ÷ (212,400 + 60,000) = 1 · 284,630 ÷ 272,400 = 1.0448972
    expect(v.rate).toBeCloseTo((212_400 / 200_000) * (272_400 / 272_400) * (284_630 / 272_400) - 1, 12);
    expect(v.rate).toBeCloseTo(0.109681, 6);
    expect(v.measuredFrom).toBe('2025-10-04');
    expect(284_630 / 200_000 - 1).toBeCloseTo(0.42315, 5);        // what it used to show
  });
  test('the same three days with no evening recorded before the deposit: the last value on record stands for it', () => {
    const v = ask(days, [dep('2026-04-15', 'a', 60_000)], '2025-10-04', '2026-10-04');
    // MOVED 2026-10-11 by DEC-4439: 10.97% → 9.47%, hand-checked: 272,400 ÷ (200,000 + 60,000) = 1.0476923;
    // × 284,630 ÷ 272,400 = 1.0448972 → 284,630 ÷ 260,000 − 1 = 9.4731% (before: 212,400 ÷ 200,000 × 284,630 ÷ 272,400)
    expect(v.rate).toBeCloseTo((272_400 / 260_000) * (284_630 / 272_400) - 1, 12);
    expect(v.rate).toBeCloseTo(0.094731, 6);
  });
  test('the size of the deposit does not move the answer — that is the whole point', () => {
    for (const paidIn of [1_000, 60_000, 2_000_000]) {
      // the evening before the deposit is recorded, as his words state it (DEC-4439: "before" is the previous evening)
      const d = [day('2025-10-04', [['a', 200_000]]), day('2026-04-14', [['a', 212_400]]), day('2026-04-15', [['a', 212_400 + paidIn]]),
                 day('2026-10-04', [['a', (212_400 + paidIn) * 1.0448972]])];
      expect(ask(d, [dep('2026-04-15', 'a', paidIn)], '2025-10-04', '2026-10-04').rate).toBeCloseTo(0.1096808, 6);
    }
  });
  test('a withdrawal is split the same way', () => {
    // worth $110,000 the evening before $40,000 was taken out: 1.10 × 70,000 ÷ (110,000 − 40,000) × 1.10 − 1 = 21%
    const d = [day('2026-01-01', [['a', 100_000]]), day('2026-02-28', [['a', 110_000]]), day('2026-03-01', [['a', 70_000]]), day('2026-06-01', [['a', 77_000]])];
    expect(ask(d, [dep('2026-03-01', 'a', -40_000)], '2026-01-01', '2026-06-01').rate).toBeCloseTo(0.21, 12);
    // with no evening recorded before it, the last value on record stands for it.
    // MOVED 2026-10-11 by DEC-4439: 21% → 28.33%, hand-checked: 70,000 ÷ (100,000 − 40,000) = 1.1666667;
    // × 77,000 ÷ 70,000 = 1.10 → 77,000 ÷ 60,000 − 1 = 28.3333% (before: (70,000 + 40,000) ÷ 100,000 × 1.10 − 1 = 21%)
    const sparse = d.filter((x) => x.date !== '2026-02-28');
    expect(ask(sparse, [dep('2026-03-01', 'a', -40_000)], '2026-01-01', '2026-06-01').rate).toBeCloseTo(77_000 / 60_000 - 1, 12);
  });
  test('nothing moved: the plain growth, whatever days lie between', () => {
    expect(ask(days.filter((x) => x.date !== '2026-04-15'), [], '2025-10-04', '2026-10-04').rate).toBeCloseTo(284_630 / 200_000 - 1, 12);
  });
});

describe('DEC-4439 (2026-10-11, "approved."): money that moves on a day counts for that whole day', () => {
  // day link = evening value ÷ (previous evening + money added − money taken out that day) − 1
  const opened = (evening: number) => ask([day('2026-10-09', [['a', 0, 'typed']]), day('2026-10-10', [['a', evening]])],
    [dep('2026-10-10', 'a', 10_000)], '2026-10-09', '2026-10-10');
  test('a new account opened with a $10,000 deposit, worth $10,050 that evening: +0.50% (+$50)', () => {
    const v = opened(10_050);
    expect(v.rate).toBeCloseTo(10_050 / 10_000 - 1, 12);
    expect(v.rate).toBeCloseTo(0.005, 12);
    expect(v.measuredFrom).toBe('2026-10-10');          // it started with nothing: measured from the first money's day
  });
  test('the same, worth $9,800 that evening: −2.00% (−$200)', () => {
    expect(opened(9_800).rate).toBeCloseTo(-0.02, 12);
  });
  // THE REAL CASE: the new account's first record IS the deposit day — no $0 row the evening before
  const firstSeen = (evening: number, added: DatedAmount[]) => ask(
    [day('2026-10-09', [['a', 50_000]]), day('2026-10-10', [['a', 50_000], ['b', evening]])], added, '2026-10-09', '2026-10-10');
  test('a new account first on record the day $10,000 was added to it, worth $10,050: +0.50% that day for it', () => {
    // 50,000 + 10,050 ÷ (50,000 + 0 + 10,000) − 1 = 60,050 ÷ 60,000 − 1; alone: 10,050 ÷ (0 + 10,000) − 1
    expect(firstSeen(10_050, [dep('2026-10-10', 'b', 10_000)]).rate).toBeCloseTo(60_050 / 60_000 - 1, 12);
    const alone = timeWeightedReturn({ days: [day('2026-10-09', [['a', 50_000]]), day('2026-10-10', [['a', 50_000], ['b', 10_050]])],
      accountIds: new Set(['b']), flows: [dep('2026-10-10', 'b', 10_000)], start: '2026-10-09', end: '2026-10-10' });
    expect(alone).toMatchObject({ refused: 'START_NOT_RECORDED' });   // b alone has no day at the start to stand on
    const sinceOpened = timeWeightedReturn({ days: [day('2026-10-10', [['b', 10_050]]), day('2026-10-11', [['b', 10_050]])],
      accountIds: new Set(['b', 'a']), flows: [dep('2026-10-11', 'a', 0)], start: '2026-10-10', end: '2026-10-11' });
    expect(sinceOpened.rate).toBeCloseTo(0, 12);                      // a later day with nothing moved: nothing earned
  });
  test('the same, worth $9,800: −2.00% that day for it', () => {
    // 50,000 + 9,800 ÷ (50,000 + 10,000) − 1 = 59,800 ÷ 60,000 − 1 = −0.3333% for the two; b's own day 9,800 ÷ 10,000 − 1 = −2.00%
    expect(firstSeen(9_800, [dep('2026-10-10', 'b', 10_000)]).rate).toBeCloseTo(59_800 / 60_000 - 1, 12);
  });
  test('an account first on record with NO money added that day joins at its first value: 0% for it that day', () => {
    // 60,050 ÷ (50,000 + 10,050) − 1 = 0
    expect(firstSeen(10_050, []).rate).toBeCloseTo(0, 12);
  });
  test('Vanguard worth $50,000 the evening before, $10,000 added that morning, $60,300 that evening: +0.50% (was +0.60%)', () => {
    const v = ask([day('2026-10-09', [['a', 50_000]]), day('2026-10-10', [['a', 60_300]])], [dep('2026-10-10', 'a', 10_000)], '2026-10-09', '2026-10-10');
    expect(v.rate).toBeCloseTo(60_300 / 60_000 - 1, 12);
    expect(v.rate).toBeCloseTo(0.005, 12);
    expect(v.rate).not.toBeCloseTo(50_300 / 50_000 - 1, 6);   // the old end-of-day reading, +0.60%
  });
});

describe('it refuses rather than guess — and never falls back to another method', () => {
  const days = [day('2026-01-01', [['a', 100_000]]), day('2026-06-01', [['a', 130_000]])];
  test('the start day is not recorded: no figure', () => {
    const v = ask(days, [], '2025-12-01', '2026-06-01');
    expect(v).toMatchObject({ rate: null, refused: 'START_NOT_RECORDED' });
  });
  test('money moved on a day with no recorded value: no figure, and the day is named', () => {
    const v = ask(days, [dep('2026-03-10', 'a', 20_000)], '2026-01-01', '2026-06-01');
    expect(v).toMatchObject({ rate: null, refused: 'MOVEMENT_DAY_NOT_RECORDED', day: '2026-03-10' });
  });
  test('a movement with no date: no figure', () => {
    expect(ask(days, [dep('', 'a', 20_000)], '2026-01-01', '2026-06-01')).toMatchObject({ rate: null, refused: 'MOVEMENT_HAS_NO_DATE' });
  });
  test('shares moved in or out: no figure, and the day is named', () => {
    expect(ask(days, [], '2026-01-01', '2026-06-01', { sharesMoved: ['2026-02-02'] })).toMatchObject({ rate: null, refused: 'SHARES_MOVED', day: '2026-02-02' });
    // …but a move before the period began is not this period's business
    expect(ask(days, [], '2026-01-01', '2026-06-01', { sharesMoved: ['2025-11-11'] }).rate).toBeCloseTo(0.30, 12);
  });
  // MOVED 2026-10-11 by DEC-4439: refused (VALUE_BELOW_MONEY_ADDED) → measured −86.67%, hand-checked:
  // 15,000 ÷ (100,000 + 20,000) = 0.125; × 16,000 ÷ 15,000 → 16,000 ÷ 120,000 − 1 = −86.6667%. A value below the
  // money added that day is a loss, not a broken record, now that the money counts for its whole day.
  test('the value that day is less than the money added that day: a loss, measured', () => {
    const d = [day('2026-01-01', [['a', 100_000]]), day('2026-03-01', [['a', 15_000]]), day('2026-06-01', [['a', 16_000]])];
    expect(ask(d, [dep('2026-03-01', 'a', 20_000)], '2026-01-01', '2026-06-01').rate).toBeCloseTo(16_000 / 120_000 - 1, 12);
  });
  test('nothing to grow from: a value with nothing there the evening before and no money added — no figure, the day named', () => {
    const d = [day('2026-01-01', [['a', 0, 'typed']]), day('2026-03-01', [['a', 5_000, 'typed']]), day('2026-06-01', [['a', 5_000, 'typed']])];
    const v = ask(d, [], '2026-01-01', '2026-06-01');
    expect(v).toMatchObject({ rate: null, refused: 'NOTHING_TO_GROW_FROM', day: '2026-03-01' });
    expect(v.moreTakenOutThanThere).toBeUndefined();
  });
  test('nothing to grow from: more taken out than was there the evening before — no figure, the day named, and which', () => {
    const d = [day('2026-01-01', [['a', 1_000]]), day('2026-03-01', [['a', 0]]), day('2026-06-01', [['a', 0]])];
    expect(ask(d, [dep('2026-03-01', 'a', -1_500)], '2026-01-01', '2026-06-01'))
      .toMatchObject({ rate: null, refused: 'NOTHING_TO_GROW_FROM', day: '2026-03-01', moreTakenOutThanThere: true });
  });
  test('today is not in the record: no figure', () => {
    expect(ask(days, [], '2026-01-01', '2026-07-01')).toMatchObject({ rate: null, refused: 'END_NOT_RECORDED' });
  });
});

describe('what the record itself decides', () => {
  test('a period that starts with nothing starts at the first deposit', () => {
    const d = [day('2026-01-01', [['a', 0, 'typed']]), day('2026-02-01', [['a', 50_000]]), day('2026-06-01', [['a', 55_000]])];
    const v = ask(d, [dep('2026-02-01', 'a', 50_000)], '2026-01-01', '2026-06-01');
    expect(v.rate).toBeCloseTo(0.10, 12);
    expect(v.measuredFrom).toBe('2026-02-01');
    // never any money at all: nothing to state
    expect(ask([day('2026-01-01', [['a', 0, 'typed']]), day('2026-06-01', [['a', 0, 'typed']])], [], '2026-01-01', '2026-06-01'))
      .toMatchObject({ rate: null, refused: 'NOTHING_INVESTED' });
  });
  test('an account that joins the record arrives as money in, at its first recorded value — it is not a gain', () => {
    const d = [day('2026-01-01', [['a', 100_000]]), day('2026-03-01', [['a', 105_000], ['b', 300_000]]), day('2026-06-01', [['a', 110_250], ['b', 315_000]])];
    // MOVED 2026-10-11 by DEC-4439: 10.25% → 6.3125%, hand-checked: b's $300,000 arrives on 1 Mar and counts all that
    // day (it earned nothing in the record before it was in it): 405,000 ÷ (100,000 + 300,000) = 1.0125; then
    // 425,250 ÷ 405,000 = 1.05 → 425,250 ÷ 400,000 − 1 = 6.3125% (before: 105,000 ÷ 100,000 × 1.05 − 1 = 10.25%)
    expect(ask(d, [], '2026-01-01', '2026-06-01').rate).toBeCloseTo(1.0125 * 1.05 - 1, 12);
    expect((110_250 + 315_000) / 100_000 - 1).toBeGreaterThan(3);   // the balance change would have said +325%
  });
  test('an account that leaves the record takes its last value with it — it is not a loss', () => {
    const d = [day('2026-01-01', [['a', 100_000], ['b', 50_000]]), day('2026-03-01', [['a', 110_000]]), day('2026-06-01', [['a', 121_000]])];
    // MOVED 2026-10-11 by DEC-4439: 17.33% → 21.00%, hand-checked: b's $50,000 leaves on 1 Mar and is gone all that
    // day: 110,000 ÷ (150,000 − 50,000) = 1.10; then 121,000 ÷ 110,000 = 1.10 → 21%
    // (before: (110,000 + 50,000 that left) ÷ 150,000 × 1.10 − 1 = 17.33%)
    expect(ask(d, [], '2026-01-01', '2026-06-01').rate).toBeCloseTo(1.1 * 1.1 - 1, 12);
  });
  test('a rebuilt day that is missing a hand-entered account with holdings is not used', () => {
    // a is linked (every day); b is entered by hand and holds shares (the days the app was opened only)
    const d = [day('2026-01-01', [['a', 100_000], ['b', 100_000]]),
               day('2026-02-01', [['a', 150_000]], 'reconstructed'),            // b has no value this day
               day('2026-03-01', [['a', 110_000], ['b', 110_000]])];
    expect(ask(d, [], '2026-01-01', '2026-03-01').rate).toBeCloseTo(0.10, 12);   // straight across the gap
    // money moved on that half-recorded day: the total was not measured there, so no figure
    expect(ask(d, [dep('2026-02-01', 'a', 40_000)], '2026-01-01', '2026-03-01')).toMatchObject({ rate: null, refused: 'MOVEMENT_DAY_NOT_RECORDED', day: '2026-02-01' });
  });
  test('a typed balance has no price: its last recorded value stands, so the rebuilt day IS complete', () => {
    const d = [day('2026-01-01', [['a', 100_000], ['c', 50_000, 'typed']]),
               day('2026-02-01', [['a', 140_000]], 'reconstructed'),            // $30,000 paid into a this day
               day('2026-03-01', [['a', 154_000], ['c', 50_000, 'typed']])];
    // MOVED 2026-10-11 by DEC-4439: 14.53% → 13.33%, hand-checked: 2 Feb the $30,000 counts all day, so
    // (140,000 + 50,000) ÷ (150,000 + 30,000) = 1.0555556; then 204,000 ÷ 190,000 → 204,000 ÷ 180,000 − 1 = 13.3333%
    // (before: 160,000 ÷ 150,000 × 204,000 ÷ 190,000 − 1). The typed balance still stands on the rebuilt day.
    expect(ask(d, [dep('2026-02-01', 'a', 30_000)], '2026-01-01', '2026-03-01').rate).toBeCloseTo((190_000 / 180_000) * (204_000 / 190_000) - 1, 12);
  });
});

describe('cash earns only interest', () => {
  const cashIds = new Set(['s']);
  test('a paycheck landing in a cash account is money in, not a return', () => {
    const d = [day('2026-01-01', [['a', 100_000], ['s', 10_000, 'cash']]), day('2026-02-01', [['a', 105_000], ['s', 18_000, 'cash']]), day('2026-03-01', [['a', 110_250], ['s', 12_000, 'cash']])];
    const v = ask(d, [], '2026-01-01', '2026-03-01', { cashIds });
    // MOVED 2026-10-11 by DEC-4439: 9.0078% → 8.9146%, hand-checked: the $8,000 in counts all of 1 Feb, the $6,000 out
    // all of 1 Mar: 123,000 ÷ (110,000 + 8,000) = 1.0423729 · 122,250 ÷ (123,000 − 6,000) = 1.0448718 → product − 1 = 8.9146%
    // (before: (123,000 − 8,000) ÷ 110,000 × (122,250 + 6,000) ÷ 123,000 − 1)
    expect(v.rate).toBeCloseTo((123_000 / 118_000) * (122_250 / 117_000) - 1, 12);
    // cash alone, whatever its balance does, returns nothing
    expect(timeWeightedReturn({ days: d, accountIds: cashIds, cashIds, flows: [], start: '2026-01-01', end: '2026-03-01' }).rate).toBeCloseTo(0, 12);
  });
  test('interest credited to it IS earned', () => {
    const d = [day('2026-01-01', [['s', 10_000, 'cash']]), day('2026-02-01', [['s', 15_040, 'cash']])];
    const v = timeWeightedReturn({ days: d, accountIds: cashIds, cashIds, flows: [], interest: [dep('2026-01-31', 's', 40)], start: '2026-01-01', end: '2026-02-01' });
    // MOVED 2026-10-11 by DEC-4439: 0.40% → 0.2667%, hand-checked: the balance rose $5,040, $40 of it interest, so $5,000
    // is money in and counts all of 1 Feb: 15,040 ÷ (10,000 + 5,000) − 1 = 40 ÷ 15,000 = 0.2667% (before: 40 ÷ 10,000).
    // The $40 is still earned; it is now earned on the $15,000 the day held.
    expect(v.rate).toBeCloseTo(40 / 15_000, 12);
  });
  test('money moved from cash into an investment account is neither in nor out of the two together', () => {
    const d = [day('2026-01-01', [['a', 100_000], ['s', 50_000, 'cash']]), day('2026-02-01', [['a', 130_000], ['s', 20_000, 'cash']]), day('2026-03-01', [['a', 143_000], ['s', 20_000, 'cash']])];
    const v = ask(d, [dep('2026-02-01', 'a', 30_000)], '2026-01-01', '2026-03-01', { cashIds });
    expect(v.rate).toBeCloseTo((150_000 / 150_000) * (163_000 / 150_000) - 1, 12);
  });
});

describe('movementsOf — which records are money moving', () => {
  const ids = new Set(['a', 'b']);
  const t = (type: string, account_id: string, amount: number, more: Record<string, any> = {}) => ({ type, account_id, amount, date: '2026-02-02', ...more });
  test('deposits in, withdrawals out; buying, selling, dividends and fees are not money moving', () => {
    const m = movementsOf([t('DEPOSIT', 'a', 500), t('WITHDRAWAL', 'a', 200), t('BUY', 'a', 900), t('SELL', 'a', 900), t('DIVIDEND', 'a', 30), t('FEE', 'a', 5), t('DEPOSIT', 'z', 999)], ids);
    expect(m.flows).toEqual([{ date: '2026-02-02', accountId: 'a', amount: 500 }, { date: '2026-02-02', accountId: 'a', amount: -200 }]);
    expect(m.sharesMoved).toEqual([]);
  });
  test('cash between accounts leaves the first and arrives in the second', () => {
    expect(movementsOf([t('TRANSFER', 'a', 300, { counter_account_id: 'b' })], ids).flows).toEqual([{ date: '2026-02-02', accountId: 'a', amount: -300 }, { date: '2026-02-02', accountId: 'b', amount: 300 }]);
    expect(movementsOf([t('TRANSFER', 'z', 300, { counter_account_id: 'b' })], ids).flows).toEqual([{ date: '2026-02-02', accountId: 'b', amount: 300 }]);
  });
  test('shares moved across the edge of the measured accounts are named; between two of them they are not', () => {
    expect(movementsOf([t('TRANSFER_IN_KIND', 'a', 0)], ids).sharesMoved).toEqual(['2026-02-02']);
    expect(movementsOf([t('TRANSFER_IN_KIND', 'a', 0, { counter_account_id: 'b' })], ids).sharesMoved).toEqual([]);
  });
  test('interest that was not reinvested is listed, for the cash rule', () => {
    expect(movementsOf([t('INTEREST', 'a', 12), t('INTEREST', 'a', 7, { reinvested: true })], ids).interest).toEqual([{ date: '2026-02-02', accountId: 'a', amount: 12 }]);
  });
});

describe('shares moved in or out are money in or out at what they were worth — when the record says so', () => {
  const ids = new Set(['a', 'b']);
  const moved = (more: Record<string, any>) => ({ type: 'TRANSFER_IN_KIND', account_id: 'a', date: '2026-02-02', ...more });
  test('a broker’s row that says which way, with an amount or with shares and a price', () => {
    expect(movementsOf([moved({ direction: 'IN', amount: 50_000 })], ids)).toMatchObject({ flows: [{ date: '2026-02-02', accountId: 'a', amount: 50_000 }], sharesMoved: [] });
    expect(movementsOf([moved({ direction: 'OUT', shares: 100, price: 120 })], ids)).toMatchObject({ flows: [{ accountId: 'a', amount: -12_000 }], sharesMoved: [] });
  });
  test('a move made in the app names both accounts: out of the first, into the second', () => {
    expect(movementsOf([moved({ counter_account_id: 'z', shares: 10, price: 30 })], ids).flows).toEqual([{ date: '2026-02-02', accountId: 'a', amount: -300 }]);
    expect(movementsOf([moved({ account_id: 'z', counter_account_id: 'b', shares: 10, price: 30 })], ids).flows).toEqual([{ date: '2026-02-02', accountId: 'b', amount: 300 }]);
  });
  test('no direction, or no worth: the day is named and nothing is guessed', () => {
    expect(movementsOf([moved({ amount: 50_000 })], ids)).toMatchObject({ flows: [], sharesMoved: ['2026-02-02'] });          // an older row: which way?
    expect(movementsOf([moved({ direction: 'IN', shares: 100 })], ids)).toMatchObject({ flows: [], sharesMoved: ['2026-02-02'] });   // worth what?
  });
  test('the return across the day: $50,000 of shares arriving is not a $50,000 gain', () => {
    const days = [day('2026-01-01', [['a', 100_000]]), day('2026-02-02', [['a', 155_000]]), day('2026-03-01', [['a', 162_750]])];
    const m = movementsOf([moved({ direction: 'IN', amount: 50_000 })], new Set(['a']));
    const v = timeWeightedReturn({ days, accountIds: new Set(['a']), flows: m.flows, sharesMoved: m.sharesMoved, start: '2026-01-01', end: '2026-03-01' });
    // MOVED 2026-10-11 by DEC-4439: 10.25% → 8.50%, hand-checked: 155,000 ÷ (100,000 + 50,000) = 1.0333333;
    // × 162,750 ÷ 155,000 = 1.05 → 162,750 ÷ 150,000 − 1 = 8.50% (before: 105,000 ÷ 100,000 × 1.05 − 1). Still not a $50,000 gain.
    expect(v.rate).toBeCloseTo(162_750 / 150_000 - 1, 12);
  });
});
