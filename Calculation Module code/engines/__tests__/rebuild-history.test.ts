// Rebuilding the past from the records a broker gave us (founder, 2026-09-25: "Yes rebuild - day
// one history"). The test the whole feature stands on: the shares on a past day are whatever the
// RECORDS say they were — never today's share count priced at an old date, which is what the old
// back-fill did and why the app disagreed with the broker's own statement.
import { rebuildDays, rebuildableFrom, rebuiltSentence, fillBetweenObservations, type RebuildTxn } from '../rebuild-history';
import { timeWeightedReturn } from '../time-weighted-return';
import { valueOn } from '../snapshots';

const ACC = 'et1';
const account = (units: number, cash: number) => ({
  asset_id: ACC, source: 'connected', asset_class: 'stocks_etf', balance: 0, cash_balance: cash,
  positions: [{ ticker: 'LCTX', last_price: 40, lots: [{ shares: units, cost_per_share: 30 }] }],
});
// a flat $10 close every day, so a value change can only come from units or cash
const flat = (_k: string, _d: string) => 10;
const base = {
  today: '2026-08-04', earliest: '2024-01-01', accountIds: new Set([ACC]), writtenAt: '2026-08-04T12:00:00Z',
};

describe('where a rebuilt line may start', () => {
  test('it starts at the first record the account gave us', () => {
    const txns: RebuildTxn[] = [
      { date: '2026-07-20', type: 'BUY', account_id: ACC, ticker: 'LCTX', shares: 10, price: 9 },
      { date: '2026-06-03', type: 'DEPOSIT', account_id: ACC, amount: 500 },
    ];
    expect(rebuildableFrom(txns, ACC)).toBe('2026-06-03');
  });

  test('it never reaches behind an opening capture — nothing explains what sat there before it', () => {
    const txns: RebuildTxn[] = [
      { date: '2026-06-03', type: 'DEPOSIT', account_id: ACC, amount: 500 },
      { date: '2026-07-01', type: 'OPENING_POSITION', account_id: ACC, ticker: 'LCTX', shares: 40 },
      { date: '2026-07-20', type: 'BUY', account_id: ACC, ticker: 'LCTX', shares: 10, price: 9 },
    ];
    expect(rebuildableFrom(txns, ACC)).toBe('2026-07-01');
  });

  test('no records at all → no rebuilt line (a hand-entered account starts the day it is entered)', () => {
    expect(rebuildableFrom([], ACC)).toBeNull();
    const out = rebuildDays({ ...base, accounts: [account(100, 0)] as any, transactions: [], priceOn: flat });
    expect(out.days).toEqual([]);
  });
});

describe('the walk backwards', () => {
  test('shares that were transferred OUT are put back; shares that came IN are taken back out (2026-10-04)', () => {
    const txns: RebuildTxn[] = [
      { date: '2026-08-01', type: 'TRANSFER_IN_KIND', account_id: ACC, ticker: 'LCTX', shares: 30, direction: 'OUT' },
      { date: '2026-07-25', type: 'TRANSFER_IN_KIND', account_id: ACC, ticker: 'LCTX', shares: 50, direction: 'IN' },
      { date: '2026-07-20', type: 'DEPOSIT', account_id: ACC, amount: 1 },
    ];
    const out = rebuildDays({ ...base, accounts: [account(100, 0)] as any, transactions: txns, priceOn: flat });
    const unitsOn = (d: string) => out.days.find((x) => x.date === d)!.holdings.reduce((t, h) => t + h.units, 0);
    expect(unitsOn('2026-07-31')).toBe(130);        // before 30 went out there were 130 — it used to say 70
    expect(unitsOn('2026-07-24')).toBe(80);         // and before 50 came in, 80
  });
  test('a purchase is undone: before the buy there were fewer shares and more cash', () => {
    const txns: RebuildTxn[] = [
      { date: '2026-08-01', type: 'BUY', account_id: ACC, ticker: 'LCTX', shares: 40, price: 10 },
      { date: '2026-07-28', type: 'DEPOSIT', account_id: ACC, amount: 400 },
    ];
    const out = rebuildDays({ ...base, accounts: [account(100, 0)] as any, transactions: txns, priceOn: flat });
    const ids = new Set([ACC]);
    // on 2 Aug the buy has happened: 100 shares × $10, no cash
    expect(valueOn(out.days, ids, '2026-08-02')).toBe(1000);
    // on 31 Jul it has not: 60 shares × $10 = 600, plus the $400 that had not been spent yet
    expect(valueOn(out.days, ids, '2026-07-31')).toBe(1000);
    const jul31 = out.days.find((d) => d.date === '2026-07-31')!;
    expect(jul31.holdings.reduce((t, h) => t + h.units, 0)).toBe(60);
    expect(jul31.accounts[0].cash).toBe(400);
    // the line starts on the day of the first record and no earlier — on that day the deposit has
    // happened, so the cash is in it; the days behind it are not ours to know
    expect(out.days[0].date).toBe('2026-07-28');
    expect(out.days[0].accounts[0].cash).toBe(400);
    expect(out.days[0].holdings[0].units).toBe(60);
  });

  test('a sale, a withdrawal and a cash dividend are all undone the right way round', () => {
    const txns: RebuildTxn[] = [
      { date: '2026-08-02', type: 'SELL', account_id: ACC, ticker: 'LCTX', shares: 10, price: 10 },
      { date: '2026-08-01', type: 'WITHDRAWAL', account_id: ACC, amount: 50 },
      { date: '2026-07-31', type: 'DIVIDEND', account_id: ACC, ticker: 'LCTX', amount: 20 },
      { date: '2026-07-20', type: 'BUY', account_id: ACC, ticker: 'LCTX', shares: 5, price: 10 },
    ];
    const out = rebuildDays({ ...base, accounts: [account(100, 70)] as any, transactions: txns, priceOn: flat });
    const day = (d: string) => out.days.find((x) => x.date === d)!;
    // before the sale: 110 shares, and the $100 it brought in had not arrived
    expect(day('2026-08-01').holdings[0].units).toBe(110);
    expect(day('2026-08-01').accounts[0].cash).toBe(-30);
    // before the withdrawal, that $50 was still in the account
    expect(day('2026-07-31').accounts[0].cash).toBe(20);
    // before the dividend, its $20 was not
    expect(day('2026-07-30').accounts[0].cash).toBe(0);
  });

  test('a reinvested dividend takes back units, not cash', () => {
    const txns: RebuildTxn[] = [
      { date: '2026-08-01', type: 'DIVIDEND', account_id: ACC, ticker: 'LCTX', shares: 2, amount: 20, reinvested: true },
      { date: '2026-07-01', type: 'DEPOSIT', account_id: ACC, amount: 10 },
    ];
    const out = rebuildDays({ ...base, accounts: [account(100, 10)] as any, transactions: txns, priceOn: flat });
    const jul31 = out.days.find((d) => d.date === '2026-07-31')!;
    expect(jul31.holdings[0].units).toBe(98);
    expect(jul31.accounts[0].cash).toBe(10);
  });
});

describe('what the rebuild refuses to do', () => {
  test('a day it cannot price is left empty, never filled in with a stale price', () => {
    const txns: RebuildTxn[] = [{ date: '2026-07-28', type: 'DEPOSIT', account_id: ACC, amount: 10 }];
    const priceOn = (_k: string, d: string) => (d === '2026-08-01' ? null : 10);
    const out = rebuildDays({ ...base, accounts: [account(100, 10)] as any, transactions: txns, priceOn });
    expect(out.days.some((d) => d.date === '2026-08-01')).toBe(false);
    expect(out.skipped).toContain('2026-08-01');
  });

  test('every rebuilt day is marked as a reconstruction, never as an observation', () => {
    const txns: RebuildTxn[] = [{ date: '2026-08-01', type: 'DEPOSIT', account_id: ACC, amount: 10 }];
    const out = rebuildDays({ ...base, accounts: [account(100, 10)] as any, transactions: txns, priceOn: flat });
    expect(out.days.length).toBeGreaterThan(0);
    expect(out.days.every((d) => d.origin === 'reconstructed')).toBe(true);
  });

  test('an account that is not linked is left alone — its past is not ours to rebuild', () => {
    const txns: RebuildTxn[] = [{ date: '2026-08-01', type: 'DEPOSIT', account_id: ACC, amount: 10 }];
    const out = rebuildDays({ ...base, accountIds: new Set(['someone-else']), accounts: [account(100, 10)] as any, transactions: txns, priceOn: flat });
    expect(out.days).toEqual([]);
  });

  test('the line stops at the two-year floor the app keeps', () => {
    const txns: RebuildTxn[] = [{ date: '2020-01-02', type: 'DEPOSIT', account_id: ACC, amount: 10 }];
    const out = rebuildDays({ ...base, earliest: '2026-07-30', accounts: [account(100, 10)] as any, transactions: txns, priceOn: flat });
    expect(out.days[0].date).toBe('2026-07-30');
    expect(out.startByAccount[ACC]).toBe('2026-07-30');
  });

  test('the days come back oldest first, starting at the first record — never earlier', () => {
    const txns: RebuildTxn[] = [{ date: '2026-08-01', type: 'DEPOSIT', account_id: ACC, amount: 10 }];
    // the two-year floor allows 28 July, but the records only reach 1 August, so the line does too
    const out = rebuildDays({ ...base, earliest: '2026-07-28', accounts: [account(100, 10)] as any, transactions: txns, priceOn: flat });
    expect(out.days.map((d) => d.date)).toEqual(['2026-08-01', '2026-08-02', '2026-08-03']);
  });
});

describe('what the screen says about it', () => {
  test('it names the institution and the first day it shares', () => {
    expect(rebuiltSentence('E*TRADE', '2024-06-03'))
      .toBe('Rebuilt from E*TRADE’s own records, back to Jun 3, 2024 — the first day it shares.');
  });
  test('with no institution name it still says where the history came from', () => {
    expect(rebuiltSentence(null, '2024-06-03')).toContain('your account’s own records');
  });
  test('no rebuilt history, no sentence', () => {
    expect(rebuiltSentence('E*TRADE', null)).toBe('');
  });
});

/** A HAND-ENTERED ACCOUNT ON THE DAYS BETWEEN TWO OBSERVATIONS (2026-10-04). A rebuilt day holds linked
 *  accounts only, so it could not speak for a household that also has a hand-entered account — and
 *  money moving in the linked account on such a day left the combined return unmeasurable. */
describe('fillBetweenObservations', () => {
  const seen = (date: string, hand: { units: number; price: number | null; cash?: number }, linked: number) => ({
    date, origin: 'observed', writtenAt: 'x',
    holdings: [{ date, accountId: 'hand', securityKey: 'ABC', units: hand.units, price: hand.price, value: hand.units * (hand.price ?? 10), currency: 'USD' },
               { date, accountId: 'linked', securityKey: 'VTI', units: 1, price: linked, value: linked, currency: 'USD' }],
    accounts: [{ date, accountId: 'hand', cash: hand.cash ?? 0, statedTotal: null, currency: 'USD' }, { date, accountId: 'linked', cash: 0, statedTotal: null, currency: 'USD' }],
  }) as any;
  const rebuilt = (date: string, linked: number) => ({
    date, origin: 'reconstructed', writtenAt: 'x',
    holdings: [{ date, accountId: 'linked', securityKey: 'VTI', units: 1, price: linked, value: linked, currency: 'USD' }],
    accounts: [{ date, accountId: 'linked', cash: 0, statedTotal: null, currency: 'USD' }],
  }) as any;
  const closes: Record<string, number> = { '2026-03-02': 21, '2026-03-03': 22 };
  const priceOn = (key: string, day: string) => (key === 'ABC' ? closes[day] ?? null : null);
  const handOn = (days: any[], date: string) => days.find((d) => d.date === date)!.holdings.find((h: any) => h.accountId === 'hand');

  test('the same shares and cash on both sides: the days between get those shares at each day’s close', () => {
    const days = fillBetweenObservations([seen('2026-03-01', { units: 100, price: 20 }, 50_000), rebuilt('2026-03-02', 51_000), rebuilt('2026-03-03', 52_000), seen('2026-03-04', { units: 100, price: 23 }, 53_000)], priceOn);
    expect(handOn(days, '2026-03-02')).toMatchObject({ units: 100, price: 21, value: 2_100 });
    expect(handOn(days, '2026-03-03')).toMatchObject({ units: 100, price: 22, value: 2_200 });
    expect(days.find((d) => d.date === '2026-03-02')!.origin).toBe('reconstructed');        // a rebuilt day stays marked as one
  });

  test('different shares on the two sides: something changed on a day nobody saw, so nothing is filled', () => {
    const days = fillBetweenObservations([seen('2026-03-01', { units: 100, price: 20 }, 50_000), rebuilt('2026-03-02', 51_000), seen('2026-03-04', { units: 150, price: 23 }, 53_000)], priceOn);
    expect(handOn(days, '2026-03-02')).toBeUndefined();
    // …and the same for cash that moved
    const cash = fillBetweenObservations([seen('2026-03-01', { units: 100, price: 20, cash: 0 }, 50_000), rebuilt('2026-03-02', 51_000), seen('2026-03-04', { units: 100, price: 23, cash: 500 }, 53_000)], priceOn);
    expect(handOn(cash, '2026-03-02')).toBeUndefined();
  });

  test('no price for a day leaves that day without the account; a holding never priced keeps its entered value', () => {
    const gap = fillBetweenObservations([seen('2026-03-01', { units: 100, price: 20 }, 50_000), rebuilt('2026-03-05', 51_000), seen('2026-03-08', { units: 100, price: 23 }, 53_000)], priceOn);
    expect(handOn(gap, '2026-03-05')).toBeUndefined();
    const unpriced = fillBetweenObservations([seen('2026-03-01', { units: 100, price: null }, 50_000), rebuilt('2026-03-02', 51_000), seen('2026-03-04', { units: 100, price: null }, 53_000)], priceOn);
    expect(handOn(unpriced, '2026-03-02')).toMatchObject({ units: 100, price: null, value: 1_000 });
  });

  test('nothing is filled before the account was first observed, and an observed day is never touched', () => {
    const input = [rebuilt('2026-02-27', 49_000), seen('2026-03-01', { units: 100, price: 20 }, 50_000), rebuilt('2026-03-02', 51_000), seen('2026-03-04', { units: 100, price: 23 }, 53_000)];
    const days = fillBetweenObservations(input, priceOn);
    expect(handOn(days, '2026-02-27')).toBeUndefined();
    expect(days.find((d) => d.date === '2026-03-01')).toBe(input[1]);
  });

  test('so money that moved in the linked account on a day the app was not opened can be measured for the two together', () => {
    const record = [seen('2026-03-01', { units: 100, price: 20 }, 50_000), rebuilt('2026-03-02', 61_000), seen('2026-03-04', { units: 100, price: 23 }, 62_220)];
    const ask = (days: any[]) => timeWeightedReturn({ days, accountIds: new Set(['hand', 'linked']), start: '2026-03-01', end: '2026-03-04',
      flows: [{ date: '2026-03-02', accountId: 'linked', amount: 10_000 }] });
    expect(ask(record)).toMatchObject({ rate: null, refused: 'MOVEMENT_DAY_NOT_RECORDED', day: '2026-03-02' });   // before: no figure
    const v = ask(fillBetweenObservations(record, priceOn));
    // 2 Mar: 61,000 + 2,100 = 63,100, of which 10,000 arrived that day → 53,100 on 52,000; then 64,520 on 63,100
    expect(v.rate).toBeCloseTo((53_100 / 52_000) * (64_520 / 63_100) - 1, 12);
  });
});
