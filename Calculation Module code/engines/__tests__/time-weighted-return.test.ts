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
  test('time-weighted: 1.062 × 1.0448972 − 1 = 10.97% — not the 42.32% a balance change gives', () => {
    const v = ask(days, [dep('2026-04-15', 'a', 60_000)], '2025-10-04', '2026-10-04');
    expect(v.rate).toBeCloseTo((212_400 / 200_000) * (284_630 / 272_400) - 1, 12);
    expect(v.rate).toBeCloseTo(0.109681, 6);
    expect(v.measuredFrom).toBe('2025-10-04');
    expect(284_630 / 200_000 - 1).toBeCloseTo(0.42315, 5);        // what it used to show
  });
  test('the size of the deposit does not move the answer — that is the whole point', () => {
    for (const paidIn of [1_000, 60_000, 2_000_000]) {
      const d = [day('2025-10-04', [['a', 200_000]]), day('2026-04-15', [['a', 212_400 + paidIn]]),
                 day('2026-10-04', [['a', (212_400 + paidIn) * 1.0448972]])];
      expect(ask(d, [dep('2026-04-15', 'a', paidIn)], '2025-10-04', '2026-10-04').rate).toBeCloseTo(0.1096808, 6);
    }
  });
  test('a withdrawal is split the same way', () => {
    const d = [day('2026-01-01', [['a', 100_000]]), day('2026-03-01', [['a', 70_000]]), day('2026-06-01', [['a', 77_000]])];
    // worth $110,000 just before $40,000 was taken out: 1.10 × 1.10 − 1 = 21%
    expect(ask(d, [dep('2026-03-01', 'a', -40_000)], '2026-01-01', '2026-06-01').rate).toBeCloseTo(0.21, 12);
  });
  test('nothing moved: the plain growth, whatever days lie between', () => {
    expect(ask(days.filter((x) => x.date !== '2026-04-15'), [], '2025-10-04', '2026-10-04').rate).toBeCloseTo(284_630 / 200_000 - 1, 12);
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
  test('the value that day is less than the money added that day: the record contradicts itself', () => {
    const d = [day('2026-01-01', [['a', 100_000]]), day('2026-03-01', [['a', 15_000]]), day('2026-06-01', [['a', 16_000]])];
    expect(ask(d, [dep('2026-03-01', 'a', 20_000)], '2026-01-01', '2026-06-01')).toMatchObject({ rate: null, refused: 'VALUE_BELOW_MONEY_ADDED', day: '2026-03-01' });
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
    // both grew 5% then 5%: 1.05 × 1.05 − 1, whatever b was worth when it was added
    expect(ask(d, [], '2026-01-01', '2026-06-01').rate).toBeCloseTo(0.1025, 12);
    expect((110_250 + 315_000) / 100_000 - 1).toBeGreaterThan(3);   // the balance change would have said +325%
  });
  test('an account that leaves the record takes its last value with it — it is not a loss', () => {
    const d = [day('2026-01-01', [['a', 100_000], ['b', 50_000]]), day('2026-03-01', [['a', 110_000]]), day('2026-06-01', [['a', 121_000]])];
    // the first piece: (110,000 + 50,000 that left) ÷ 150,000; the second: 121,000 ÷ 110,000
    expect(ask(d, [], '2026-01-01', '2026-06-01').rate).toBeCloseTo((160_000 / 150_000) * 1.1 - 1, 12);
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
    // just before the deposit: 110,000 + 50,000 = 160,000 on 150,000; after: 190,000 → 204,000
    expect(ask(d, [dep('2026-02-01', 'a', 30_000)], '2026-01-01', '2026-03-01').rate).toBeCloseTo((160_000 / 150_000) * (204_000 / 190_000) - 1, 12);
  });
});

describe('cash earns only interest', () => {
  const cashIds = new Set(['s']);
  test('a paycheck landing in a cash account is money in, not a return', () => {
    const d = [day('2026-01-01', [['a', 100_000], ['s', 10_000, 'cash']]), day('2026-02-01', [['a', 105_000], ['s', 18_000, 'cash']]), day('2026-03-01', [['a', 110_250], ['s', 12_000, 'cash']])];
    const v = ask(d, [], '2026-01-01', '2026-03-01', { cashIds });
    // piece 1: (123,000 − 8,000 in) ÷ 110,000 · piece 2: (122,250 + 6,000 out) ÷ 123,000
    expect(v.rate).toBeCloseTo((115_000 / 110_000) * (128_250 / 123_000) - 1, 12);
    // cash alone, whatever its balance does, returns nothing
    expect(timeWeightedReturn({ days: d, accountIds: cashIds, cashIds, flows: [], start: '2026-01-01', end: '2026-03-01' }).rate).toBeCloseTo(0, 12);
  });
  test('interest credited to it IS earned', () => {
    const d = [day('2026-01-01', [['s', 10_000, 'cash']]), day('2026-02-01', [['s', 15_040, 'cash']])];
    const v = timeWeightedReturn({ days: d, accountIds: cashIds, cashIds, flows: [], interest: [dep('2026-01-31', 's', 40)], start: '2026-01-01', end: '2026-02-01' });
    expect(v.rate).toBeCloseTo(40 / 10_000, 12);
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
