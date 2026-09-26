// Rebuilding the past from the records a broker gave us (founder, 2026-09-25: "Yes rebuild - day
// one history"). The test the whole feature stands on: the shares on a past day are whatever the
// RECORDS say they were — never today's share count priced at an old date, which is what the old
// back-fill did and why the app disagreed with the broker's own statement.
import { rebuildDays, rebuildableFrom, rebuiltSentence, type RebuildTxn } from '../rebuild-history';
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
