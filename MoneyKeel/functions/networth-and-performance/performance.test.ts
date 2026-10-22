/** THE DOOR FOR "how are my investments doing" — MK-NW-O-008 thePerformance (Q-PF-1, ruled by the
 *  founder 2026-09-27: "yes").
 *
 *  Four rulings live in this door, and each was paid for once. These are their laws.
 */
import { thePerformance, windowStartKey, whyNoReturn } from './performance';
import { TIME_WEIGHTED_REFUSALS } from '../../../Calculation Module code/engines/time-weighted-return';

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
  const w = f.walk!;
  expect(w.beginning + w.contributions - w.withdrawals + w.wealthGenerated).toBeCloseTo(w.ending, 4);
  expect(w.beginning).toBe(100000);        // READ from the record, not derived
  expect(f.measured).toBe(100000);
});

test('THE BEGINNING IS READ, NEVER BACK-FILLED — and with no record at all, it is derived and says so', () => {
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
  expect(derived.walk!.beginning).toBe(120000 - 5000);   // no record at all: the account page's approved 'read back from your activity records' state

  // A RECORD THAT BEGINS TOO LATE (second-round review, 2026-10-07; Performance v17) greyed the window with no walk.
  // SETTLED 2026-10-13 by DEC-5291 ("approved."): with a gain known from price history it is worked back like the
  // no-record case — $120,000 − $5,000 = $115,000 (was: no walk, "The record begins Mar 2, 2026, …").
  const late = thePerformance({
    windowStart: '2026-01-01', windowLabel: 'x', today: '2026-07-01', ending: 120000, pricedGain: 5000,
    investmentAccountIds: IDS, snapshotDays: [day('2026-03-02', 110000)], transactions: [],
  });
  expect(late.walk!.beginning).toBe(115000);
  expect(late.workedBack).toBe(true);
  expect(late.sentence).toBe('');
  // …and where nothing has a history (the gain is unknown), DEC-3035i's refusal stands, word for word
  const blind = thePerformance({
    windowStart: '2026-01-01', windowLabel: 'x', today: '2026-07-01', ending: 120000, pricedGain: null,
    investmentAccountIds: IDS, snapshotDays: [day('2026-03-02', 110000)], transactions: [],
  });
  expect(blind.walk).toBeNull();
  expect(blind.ending).toBe(120000);
  expect(blind.sentence).toBe('The record begins Mar 2, 2026, so it cannot say what this account was worth on Dec 31, 2025.');
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
  expect(f.walk!.dividends).toBe(400);
  expect(f.walk!.interest).toBe(100);
  expect(f.walk!.wealthGenerated).toBeCloseTo(10000, 4);   // the whole gain, income included
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
    expect(answer.walk!.beginning).toBe(100_000);    // back-solved to 130,000 before the fix
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

  test('money paid in is never counted as earned: $100,000, +$15,000 in, $123,000 that evening, → $129,150 is +12.30%', () => {
    // MOVED 2026-10-11 by DEC-4439: 13.40% → 12.30%, hand-checked: the $15,000 counts all of 1 Apr, so
    // 123,000 ÷ (100,000 + 15,000) = 1.0695652; × 129,150 ÷ 123,000 = 1.05 → 129,150 ÷ 115,000 − 1 = 12.3043%
    // (before: 108,000 ÷ 100,000 × 1.05 − 1 = 13.40%, the $15,000 counted at the close of its day). Still not +29.15%.
    const a = ask([day('2025-10-01', 100_000), day('2026-04-01', 123_000)], 129_150, dep(15_000, '2026-04-01'));
    expect(a.ret).toBeCloseTo((123_000 / 115_000) * (129_150 / 123_000) - 1, 10);
    expect(a.ret).toBeCloseTo(129_150 / 115_000 - 1, 10);
    expect(a.sentence).toBe('');
    expect('refusedRate' in a).toBe(false);            // the stand-in rate does not exist any more
  });

  test('money moved on a day with no recorded value: no percent, and the sentence names the day', () => {
    const a = ask([day('2025-10-01', 100_000)], 123_000, dep(15_000, '2026-04-01'));
    expect(a.ret).toBeNull();
    expect(a.cumulative).toBeNull();
    expect(a.sentence).toBe('Money moved in or out on Apr 1, 2026 and no value was recorded that day, so a return cannot be measured across it. The dollar figures here are still right.');
    expect(a.walk!.contributions).toBe(15_000);         // the dollar walk still answers
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
    expect(a.walk!.contributions).toBe(0);
    expect(a.ret).toBeCloseTo(0.10, 10);
  });
});

/** THE DOLLAR WALK AND THE RETURN TELL ONE STORY (2026-10-04). The return counted a transfer in and a
 *  newly added account as money put in; the walk left both in "change in investment value", so the
 *  dollars said "gained" where the percent said "added". */
describe('the walk counts what the return counts as money put in', () => {
  const day = (d: string, rows: [string, number][]) => ({
    date: d, origin: 'observed', writtenAt: 'x',
    holdings: rows.map(([accountId, v]) => ({ accountId, securityKey: 'X', units: 1, price: v, value: v })),
    accounts: rows.map(([accountId]) => ({ date: d, accountId, cash: 0, statedTotal: null, currency: 'USD' })),
  });
  const acct = (id: string, value: number) => ({ asset_id: id, label: id, kind: 'brokerage', tax_bucket: 'TAXABLE', balance: value,
    positions: [{ position_id: `p${id}`, ticker: 'X', last_price: value, lots: [{ lot_id: 'l', shares: 1, cost_per_share: 1, purchase_date: '2024-01-02' }] }] });
  const base = { windowStart: '2026-01-02', windowLabel: 'since Jan 1', today: '2026-09-30', pricedGain: 0 };

  test('cash transferred in from a bank account is money put in — not a gain', () => {
    const a = thePerformance({ ...base, ending: 126_000, investmentAccountIds: new Set(['b']), accounts: [acct('b', 126_000)],
      snapshotDays: [day('2026-01-01', [['b', 100_000]]), day('2026-04-01', [['b', 120_000]])] as any,
      transactions: [{ id: 't', type: 'TRANSFER', account_id: 'checking', counter_account_id: 'b', amount: 15_000, date: '2026-04-01' }] });
    expect(a.walk!.contributions).toBe(15_000);                       // it read $0, and the $15,000 sat in "change in investment value"
    expect(a.walk!.wealthGenerated).toBeCloseTo(11_000, 6);           // 126,000 − 100,000 − 15,000
    // MOVED 2026-10-11 by DEC-4439: 10.25% → 9.57%, hand-checked: the $15,000 counts all of 1 Apr: 120,000 ÷ 115,000 ×
    // 126,000 ÷ 120,000 − 1 = 126,000 ÷ 115,000 − 1 = 9.5652% (before: 105,000 ÷ 100,000 × 1.05 − 1); still not +26%
    expect(a.ret).toBeCloseTo((120_000 / 115_000) * (126_000 / 120_000) - 1, 10);
  });

  test('cash transferred out is money taken out; between two measured accounts it is neither', () => {
    const out = thePerformance({ ...base, ending: 90_000, investmentAccountIds: new Set(['b']), accounts: [acct('b', 90_000)],
      snapshotDays: [day('2026-01-01', [['b', 100_000]]), day('2026-04-01', [['b', 90_000]])] as any,
      transactions: [{ id: 't', type: 'TRANSFER', account_id: 'b', counter_account_id: 'checking', amount: 10_000, date: '2026-04-01' }] });
    expect(out.walk!.withdrawals).toBe(10_000);
    expect(out.walk!.wealthGenerated).toBeCloseTo(0, 6);
    const between = thePerformance({ ...base, ending: 200_000, investmentAccountIds: new Set(['b', 'c']), accounts: [acct('b', 90_000), acct('c', 110_000)],
      snapshotDays: [day('2026-01-01', [['b', 100_000], ['c', 100_000]]), day('2026-04-01', [['b', 90_000], ['c', 110_000]])] as any,
      transactions: [{ id: 't', type: 'TRANSFER', account_id: 'b', counter_account_id: 'c', amount: 10_000, date: '2026-04-01' }] });
    expect([between.walk!.contributions, between.walk!.withdrawals]).toEqual([0, 0]);
    expect(between.ret).toBeCloseTo(0, 10);
  });

  test('DEC-4439: an account first on record the day $10,000 was added to it, worth $10,050, made $50 — return +0.50%', () => {
    const a = thePerformance({ ...base, windowStart: '2026-10-10', today: '2026-10-10', ending: 10_050, investmentAccountIds: new Set(['n']), accounts: [acct('n', 10_050)],
      snapshotDays: [day('2026-10-10', [['n', 10_050]])] as any,
      transactions: [{ id: 'd', type: 'DEPOSIT', account_id: 'n', amount: 10_000, date: '2026-10-10' }] });
    // the window opens the day it was opened: nothing before it, so this asks the record from the day before
    const b = thePerformance({ ...base, windowStart: '2026-10-10', today: '2026-10-10', ending: 60_050, investmentAccountIds: new Set(['n', 'b']),
      accounts: [acct('n', 10_050), acct('b', 50_000)],
      snapshotDays: [day('2026-10-09', [['b', 50_000]]), day('2026-10-10', [['b', 50_000], ['n', 10_050]])] as any,
      transactions: [{ id: 'd', type: 'DEPOSIT', account_id: 'n', amount: 10_000, date: '2026-10-10' }] });
    expect(b.walk!.contributions).toBe(10_000);                       // the money added, not its $10,050 evening value
    expect(b.walk!.wealthGenerated).toBeCloseTo(50, 6);               // 60,050 − 50,000 − 10,000
    expect(b.ret).toBeCloseTo(60_050 / 60_000 - 1, 10);               // 60,050 ÷ (50,000 + 10,000) − 1
    expect(a.ending).toBe(10_050);
  });

  test('an account added inside the window arrives as money put in, at its first recorded value', () => {
    const a = thePerformance({ ...base, ending: 110_000 + 52_000, investmentAccountIds: new Set(['b', 'c']), accounts: [acct('b', 110_000), acct('c', 52_000)],
      snapshotDays: [day('2026-01-01', [['b', 100_000]]), day('2026-06-01', [['b', 105_000], ['c', 50_000]])] as any,
      // its own opening deposit is inside that first value, so it is not counted a second time
      transactions: [{ id: 'd', type: 'DEPOSIT', account_id: 'c', amount: 50_000, date: '2026-06-01' }] });
    expect(a.walk!.beginning).toBe(100_000);
    expect(a.walk!.contributions).toBe(50_000);                       // it read as a $50,000 gain
    expect(a.walk!.wealthGenerated).toBeCloseTo(12_000, 6);           // b made $10,000, c made $2,000
    // MOVED 2026-10-11 by DEC-4439: 9.74% → 8.00%, hand-checked: c's $50,000 counts all of 1 Jun: 155,000 ÷ (100,000 +
    // 50,000) = 1.0333333; × 162,000 ÷ 155,000 → 162,000 ÷ 150,000 − 1 = 8.00% (before: 1.05 × 162,000 ÷ 155,000 − 1)
    expect(a.ret).toBeCloseTo((155_000 / 150_000) * (162_000 / 155_000) - 1, 10);
  });
});

/** EVERY REFUSAL HAS A SENTENCE (MK-NW-F-105, kept through DEC-4439, 2026-10-11). The list is the engine's own, so a
 *  refusal added there without words here fails. START_NOT_RECORDED is the one the screens word themselves: they draw
 *  no walk and say where the record begins (DEC-3035i), so whyNoReturn stays silent for it. */
describe('whyNoReturn — a sentence for every refusal the time-weighted return can give', () => {
  // nine since 2026-10-20: ACTIVITY_NOT_KNOWN, a record the app could not name (Q15) — its sentence names the word.
  // ten since 2026-10-21: INCOME_HAS_NO_AMOUNT, interest, a dividend or a coupon with no amount (DEC-3523 tenet 3) — its
  // sentence names the kind and the day (reversal_and_missing_amount.test.ts)
  test('the engine lists ten refusals, and the two DEC-4439 removed are gone', () => {
    expect(TIME_WEIGHTED_REFUSALS.length).toBe(10);
    expect(TIME_WEIGHTED_REFUSALS as readonly string[]).toContain('ACTIVITY_NOT_KNOWN');
    expect(TIME_WEIGHTED_REFUSALS as readonly string[]).toContain('INCOME_HAS_NO_AMOUNT');
    expect(TIME_WEIGHTED_REFUSALS as readonly string[]).not.toContain('VALUE_BELOW_MONEY_ADDED');
  });
  test.each(TIME_WEIGHTED_REFUSALS.filter((r) => r !== 'START_NOT_RECORDED'))('%s has a sentence', (refused) => {
    expect(whyNoReturn({ rate: null, refused, day: '2026-08-14', measuredFrom: null })).not.toBe('');
  });
  test('nothing to grow from says which of its two states is true', () => {
    const v = { rate: null, refused: 'NOTHING_TO_GROW_FROM' as const, day: '2026-08-14', measuredFrom: null };
    expect(whyNoReturn(v)).toBe('A value was recorded on Aug 14, 2026 with nothing there the evening before and no money added that day, so a return cannot be measured across it. The dollar figures here are still right.');
    expect(whyNoReturn({ ...v, moreTakenOutThanThere: true })).toBe('More money was taken out on Aug 14, 2026 than was there the evening before plus the money added that day, so a return cannot be measured across it. The dollar figures here are still right.');
  });
  test('the sentences of the removed refusals are gone (DEC-4439)', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, 'performance.ts'), 'utf8');
    expect(src).not.toMatch(/is less than the money added that day/);
    expect(src).not.toMatch(/is more than the money added that day, and nothing was there before it/);
  });
});
