// The read-outs of the one master record in the old shapes (asset-record-readouts.ts), each rule with its own example.
import { addRows, valueRows, type NewRow } from './asset-record';
import { valueToday, accountReadOut, accountsReadOut, transactionsReadOut, daysReadOut, invDailyReadOut, readOuts, readOutDifferences } from './asset-record-readouts';
import type { AssetAccount } from '../../../src/domain/assets';

const T1 = '2026-11-01T09:00:00.000Z', T2 = '2026-11-12T09:00:00.000Z';
const acct = (id: string, more: Partial<AssetAccount> = {}): AssetAccount => ({ asset_id: id, label: id, tax_bucket: 'TAXABLE', balance: 0, target_return: 0.07, source: 'manual', ...more } as AssetAccount);
const build = (...steps: [NewRow[], string][]) => steps.reduce((rec, [rows, at]) => addRows(rec, rows, at), [] as ReturnType<typeof addRows>);

describe('today’s value: the latest value plus the money recorded after it', () => {
  test('THE WORKPLAN ROW: Savings $1,000 as of Nov 1, $500 moved in Nov 12 → $1,500 (valuesNow alone read $1,000)', () => {
    const rec = build([valueRows({ accountId: 's', date: '2026-11-01', source: 'typed', typedValue: 1_000 }), T1],
      [[{ accountId: 's', holding: null, kind: 'DEPOSIT', date: '2026-11-12', amount: 500, source: 'typed' }], T2]);
    expect(valueToday(rec, 's')).toMatchObject({ total: 1_500, date: '2026-11-01', movedSince: 500 });
    expect(accountReadOut(rec, acct('s', { tax_bucket: 'CASH', balance: 1_500 }))).toMatchObject({ balance: 1_500, value_as_of: '2026-11-01' });
  });
  test('money dated on or before a dated value is already in it: $1,000 as of Nov 1 with a $200 deposit of Oct 20 typed later → $1,000', () => {
    const rec = build([valueRows({ accountId: 's', date: '2026-11-01', source: 'typed', typedValue: 1_000 }), T1],
      [[{ accountId: 's', holding: null, kind: 'DEPOSIT', date: '2026-10-20', amount: 200, source: 'typed' }], T2]);
    expect(valueToday(rec, 's').total).toBe(1_000);
  });
  test('out and in: $5,000 undated, then a $50 fee, a $300 withdrawal, $20 interest and a $100 transfer to another account → $4,570', () => {
    const rec = build([valueRows({ accountId: 'b', date: null, source: 'typed', typedValue: 5_000 }), T1],
      [[{ accountId: 'b', holding: null, kind: 'FEE', date: '2026-11-02', amount: 50, source: 'typed' },
        { accountId: 'b', holding: null, kind: 'WITHDRAWAL', date: '2026-11-03', amount: 300, source: 'typed' },
        { accountId: 'b', holding: null, kind: 'INTEREST', date: '2026-11-04', amount: 20, source: 'typed' },
        { accountId: 'b', holding: null, kind: 'TRANSFER', date: '2026-11-05', amount: 100, toAccountId: 's', source: 'typed' }], T2]);
    expect(valueToday(rec, 'b').total).toBe(4_570);
    expect(valueToday(rec, 's').movedSince).toBe(100);   // the $100 reached the other account
  });
  test('a value the one-time move saved already counts the money it saved beside it: $5,012 with the $12 dividend → $5,012', () => {
    const rec = build([[...valueRows({ accountId: 'b', date: null, source: 'typed', typedValue: 5_012 }),
      { accountId: 'b', holding: null, kind: 'FACT', date: null, source: 'typed', ref: 'moved-from-phone:b' },
      { accountId: 'b', holding: 'VTI', kind: 'DIVIDEND', date: '2026-10-20', amount: 12, source: 'typed' }], T1]);
    expect(valueToday(rec, 'b').total).toBe(5_012);
  });
  test('an unknown is not $0: a holding with no value leaves the total blank', () => {
    const rec = build([valueRows({ accountId: 'l', date: '2026-11-01', source: 'linked', cash: 100, holdings: [{ holding: 'X', shares: 1, price: null, value: null }] }), T1]);
    expect(valueToday(rec, 'l').total).toBeNull();
    expect(accountReadOut(rec, acct('l', { balance: 999 })).balance).toBeUndefined();
  });
});

describe('accounts', () => {
  test('an account the record holds nothing for is returned exactly as its details stand (plan R1, R2)', () => {
    const a = acct('w', { balance: 12_400, value_as_of: '2026-09-01' });
    expect(accountReadOut([], a)).toBe(a);
  });
  test('an account the record says was taken away is left out', () => {
    const rec = build([[...valueRows({ accountId: 'g', date: null, source: 'typed', typedValue: 1 }), { accountId: 'g', holding: null, kind: 'FACT', date: null, source: 'typed', facts: { accountRemoved: true } }], T1]);
    expect(accountsReadOut(rec, [acct('g'), acct('k', { balance: 3 })]).map((a) => a.asset_id)).toEqual(['k']);
  });
  test('a CD with no market value keeps what was paid ($4,900, paid); with face only, the face ($20,000, face) — DEC-0281', () => {
    const rec = build([[{ accountId: 'c', holding: null, kind: 'FACT', date: null, source: 'typed', facts: { face_value: 5_000, amount_paid: 4_900 } },
      { accountId: 'm', holding: null, kind: 'FACT', date: null, source: 'typed', facts: { face_value: 20_000 } }], T1]);
    expect(accountReadOut(rec, acct('c', { kind: 'cd', tax_bucket: 'CASH' }))).toMatchObject({ balance: 4_900, value_basis: 'paid', amount_paid: 4_900 });
    expect(accountReadOut(rec, acct('m', { kind: 'bond', asset_class: 'bonds' }))).toMatchObject({ balance: 20_000, value_basis: 'face' });
  });
  test('an option held as 200 shares on the record reads back as 2 contracts at $3.50 a share; a new holding gets a steady id', () => {
    const rec = build([[{ accountId: 'o', holding: 'AAPL C', kind: 'PURCHASE', date: '2026-09-01', shares: 200, price: 3.5, source: 'typed', ref: 'typed-lot:o:o1' }], T1]);
    const read = accountReadOut(rec, acct('o', { positions: [{ position_id: 'p', ticker: 'AAPL C', kind: 'options', multiplier: 100, lots: [] }] as any }));
    expect(read.positions![0].lots).toEqual([{ lot_id: 'o1', shares: 2, cost_per_share: 3.5, purchase_date: '2026-09-01' }]);
    const fresh = accountReadOut(rec, acct('o', { positions: [] }));
    expect(fresh.positions![0]).toMatchObject({ position_id: 'pos-o-AAPL C', ticker: 'AAPL C' });
  });
  test('built from its holdings: cash $100 + 10 VTI at the feed’s $250 → $2,600, each holding’s value kept', () => {
    const rec = build([[...valueRows({ accountId: 'd', date: null, source: 'typed', cash: 100 }),
      { accountId: 'd', holding: 'VTI', kind: 'PURCHASE', date: '2026-01-02', shares: 10, price: 200, source: 'typed', ref: 'typed-lot:d:l1' }], T1]);
    const read = accountReadOut(rec, acct('d', { derive_balance: true, positions: [{ position_id: 'p', ticker: 'VTI', lots: [] }] as any }),
      { VTI: { ticker: 'VTI', points: [{ date: '2026-11-11', close: 250 }] } });
    expect(read).toMatchObject({ balance: 2_600, cash_balance: 100 });
    expect(read.positions![0].value_now).toBe(2_500);
  });
});

describe('activity', () => {
  test('each kind maps back, its own id taken back out of its key; a transfer is listed once, under the account it left', () => {
    const rec = build([[
      { accountId: 'a', holding: 'VTI', kind: 'PURCHASE', date: '2026-10-01', shares: 20, price: 100, amount: 2_000, source: 'typed', ref: 'typed-txn:t1' },
      { accountId: 'a', holding: 'VTI', kind: 'SALE', date: '2026-10-15', shares: 5, price: 120, source: 'typed', ref: 'typed-txn:t2' },
      { accountId: 'a', holding: null, kind: 'TRANSFER', date: '2026-10-16', amount: 50, toAccountId: 'b', source: 'typed', ref: 'typed-txn:t3' },
      { accountId: 'a', holding: 'VTI', kind: 'DIVIDEND', date: '2026-10-20', amount: 12, source: 'linked', ref: 'broker-1' },
      { accountId: 'a', holding: null, kind: 'OTHER', date: '2026-10-21', amount: 1, source: 'linked', word: 'JOURNAL', ref: 'broker-2' },
    ], T1]);
    const ts = transactionsReadOut(rec);
    expect(ts.map((t) => [t.id, t.type, t.date, t.counter_account_id ?? null, t.source])).toEqual([
      ['rec:5', 'ADJUSTMENT', '2026-10-21', null, 'connected'], ['rec:4', 'DIVIDEND', '2026-10-20', null, 'connected'],
      ['t3', 'TRANSFER', '2026-10-16', 'b', 'manual'], ['t2', 'SELL', '2026-10-15', null, 'manual'], ['t1', 'BUY', '2026-10-01', null, 'manual']]);
    expect(ts[0].unclassified_word).toBe('JOURNAL');
  });
});

describe('the daily values, from the record’s dated values only', () => {
  test('a day carries every account (plan R6): a file Nov 1 $30,000 and Savings typed Nov 5 $1,000 → Nov 1 $30,000, Nov 5 $31,000', () => {
    const rec = build([valueRows({ accountId: 'f', date: '2026-11-01', source: 'file', cash: 0, holdings: [{ holding: 'VTI', shares: 100, price: 300, value: 30_000 }] }), T1],
      [valueRows({ accountId: 's', date: '2026-11-05', source: 'typed', typedValue: 1_000 }), T2],
      [valueRows({ accountId: 'u', date: null, source: 'typed', typedValue: 7 }), T2]);   // undated: belongs to no day
    const days = daysReadOut(rec, ['f', 's', 'u'], '2026-11-12');
    expect(days.map((d) => d.date)).toEqual(['2026-11-01', '2026-11-05']);
    const inv = invDailyReadOut(days, [acct('f'), acct('s', { tax_bucket: 'CASH' }), acct('u')]);
    expect(inv).toEqual({ '2026-11-01': 30_000, '2026-11-05': 31_000 });
  });
  test('readOuts holds all four, and the round trip of a record against its own read-out finds nothing', () => {
    const rec = build([valueRows({ accountId: 's', date: '2026-11-01', source: 'typed', typedValue: 1_000 }), T1]);
    const r = readOuts({ assetRecord: rec, assetAccounts: [acct('s', { tax_bucket: 'CASH', balance: 1_000, value_as_of: '2026-11-01' })] }, '2026-11-12');
    expect(r.invDaily).toEqual({ '2026-11-01': 1_000 });
    const c = readOutDifferences(r, { assetAccounts: [acct('s', { tax_bucket: 'CASH', balance: 1_000, value_as_of: '2026-11-01' })], transactions: [] });
    expect(c).toEqual({ differences: [], looked: { accounts: 1, holdings: 0, activity: 0 } });
  });
});
