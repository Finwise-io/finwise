/* WHAT THE ACCOUNT HOLDER ENTERS, AS ROWS OF THE ONE MASTER RECORD (phase 2, 2026-11-11). Each case starts from the
 * holdings stated in it, so every number can be worked by hand. */
import { typedChangeToRecord, lotRef, txnRef, type TypedChange } from './asset-record-from-typed';
import { addRows, openPurchases, rowsInForce, saleGain, sharesOnRecord, valuesNow, factsOf, type AssetRow } from './asset-record';

const AT = '2026-11-11T10:00:00.000Z', AT2 = '2026-11-11T11:00:00.000Z', AT3 = '2026-11-11T12:00:00.000Z';
const run = (record: AssetRow[], c: TypedChange, at = AT) => {
  const out = typedChangeToRecord(record, c, at);
  return out;
};
const savings = { asset_id: 'sav', label: 'Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 12_400, source: 'manual', value_as_of: '2026-09-01' } as any;
const vti = { position_id: 'vti', ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 80, purchase_date: '2025-03-03' }] } as any;
const brokerage = { asset_id: 'van', label: 'Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 8_000, source: 'manual', positions: [vti] } as any;

describe('an account added by hand', () => {
  test('Savings typed at $12,400 "as of" Sep 1: one value, on Sep 1', () => {
    const out = run([], { kind: 'account-added', account: savings });
    const now = valuesNow(out.record, 'sav');
    expect(now?.date).toBe('2026-09-01');
    expect(now?.total).toBe(12_400);
    expect(now?.source).toBe('typed');
    expect(out.problems).toEqual([]);
  });

  test('with no "as of" date the value stays undated — never the phone\'s date', () => {
    const out = run([], { kind: 'account-added', account: { ...savings, value_as_of: undefined } });
    expect(valuesNow(out.record, 'sav')?.date).toBeNull();
  });

  test('an account linked to a broker, or made from a file, is not written here', () => {
    expect(run([], { kind: 'account-added', account: { ...brokerage, source: 'connected' } }).record).toEqual([]);
    expect(run([], { kind: 'account-added', account: { ...brokerage, source: 'imported' } }).record).toEqual([]);
  });

  test('100 VTI bought Mar 3, 2025 at $80: one purchase of 100 at $80 on Mar 3, 2025', () => {
    const out = run([], { kind: 'account-added', account: brokerage });
    const open = openPurchases(out.record, 'van', 'VTI');
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({ date: '2025-03-03', shares: 100, price: 80, ownEntry: true });
    // the $8,000 is the total the account holder typed (the account is not built from its holdings): it is written, with no
    // date because none was given (comparison check, 2026-11-11 — before, it was dropped)
    expect(rowsInForce(out.record).filter((r) => r.kind === 'VALUE').map((r) => [r.typedValue, r.date, r.amount])).toEqual([[8_000, null, null]]);
  });

  test('a CD valued at its face value (no market value given) writes its facts and no value', () => {
    const cd = { asset_id: 'cd', label: 'CD', kind: 'cd', balance: 10_000, source: 'manual', face_value: 10_000, coupon_rate: 0.04, maturity_date: '2030-09-30', value_basis: 'face' } as any;
    const out = run([], { kind: 'account-added', account: cd });
    expect(rowsInForce(out.record).filter((r) => r.kind === 'VALUE')).toHaveLength(0);
    expect(factsOf(out.record, 'cd', null)).toMatchObject({ face_value: 10_000, coupon_rate: 0.04, maturity_date: '2030-09-30' });
  });
});

describe('an account changed by hand', () => {
  test('Savings $12,400 on Sep 1, changed to $13,000 "as of" Oct 1: both kept, Oct 1 is today\'s value', () => {
    const one = run([], { kind: 'account-added', account: savings }).record;
    const after = { ...savings, balance: 13_000, value_as_of: '2026-10-01' };
    const out = run(one, { kind: 'account-changed', before: savings, after, update: { balance: 13_000, value_as_of: '2026-10-01' } }, AT2);
    expect(valuesNow(out.record, 'sav')).toMatchObject({ date: '2026-10-01', total: 13_000 });
    expect(rowsInForce(out.record).filter((r) => r.kind === 'VALUE')).toHaveLength(2);
  });

  test('a change of name only writes no value', () => {
    const one = run([], { kind: 'account-added', account: savings }).record;
    const out = run(one, { kind: 'account-changed', before: savings, after: { ...savings, label: 'Rainy day' }, update: { label: 'Rainy day' } as any }, AT2);
    expect(out.record).toHaveLength(one.length);
  });

  test('a file\'s holdings handed to an imported account are left to the file (no typed purchases)', () => {
    const imp = { ...brokerage, source: 'imported', positions: [] };
    const out = run([], { kind: 'account-changed', before: imp, after: { ...imp, positions: [vti] }, update: { positions: [vti] } as any });
    expect(rowsInForce(out.record).filter((r) => r.kind === 'PURCHASE')).toHaveLength(0);
  });
});

describe('a holding changed by hand', () => {
  const start = () => run([], { kind: 'account-added', account: brokerage }).record;

  test('the price paid changed from $80 to $90: the purchase reads $90, the $80 row is kept', () => {
    const before = start();
    const after = { ...vti, lots: [{ ...vti.lots[0], cost_per_share: 90 }] };
    const out = run(before, { kind: 'holding-changed', accountId: 'van', before: vti, after }, AT2);
    expect(openPurchases(out.record, 'van', 'VTI')[0]).toMatchObject({ shares: 100, price: 90, firstDate: '2025-03-03' });
    expect(out.record.length).toBe(before.length + 1);
    expect(out.record.some((r) => r.price === 80)).toBe(true);
  });

  test('a second lot of 40 at $95 on Jan 9, 2026 added: 140 shares on record', () => {
    const after = { ...vti, lots: [...vti.lots, { lot_id: 'l2', shares: 40, cost_per_share: 95, purchase_date: '2026-01-09' }] };
    const out = run(start(), { kind: 'holding-changed', accountId: 'van', before: vti, after }, AT2);
    expect(sharesOnRecord(out.record, 'van', 'VTI')).toBe(140);
  });

  test('the lot taken out: 0 shares on record, the purchase row kept with a removal naming it', () => {
    const before = start();
    const out = run(before, { kind: 'holding-changed', accountId: 'van', before: vti, after: { ...vti, lots: [] } }, AT2);
    expect(sharesOnRecord(out.record, 'van', 'VTI')).toBe(0);
    expect(out.record.length).toBe(before.length + 1);
  });

  test('the whole holding removed: 0 shares on record', () => {
    const out = run(start(), { kind: 'holding-removed', accountId: 'van', position: vti }, AT2);
    expect(sharesOnRecord(out.record, 'van', 'VTI')).toBe(0);
  });

  // the account holder can always take a purchase away (outside check, 2026-11-12): it was refused here, so the app and
  // the record disagreed; the removal is saved and the sale it sold from is left for the account holder to place
  test('a holding a sale has sold from is removed when the account holder removes it: 0 shares held, the sale of 10 kept and left to place', () => {
    let rec = start();
    rec = run(rec, { kind: 'transaction-recorded', transaction: { id: 's1', type: 'SELL', account_id: 'van', ticker: 'VTI', shares: 10, price: 100, date: '2026-10-01', created_at: AT } as any }, AT2).record;
    const out = run(rec, { kind: 'holding-removed', accountId: 'van', position: vti }, AT3);
    expect(out.problems).toEqual([]);
    expect(sharesOnRecord(out.record, 'van', 'VTI')).toBe(0);
    expect(rowsInForce(out.record).filter((r) => r.kind === 'SALE').map((r) => r.shares)).toEqual([10]);
  });

  test('a broker\'s tax lot corrected by the account holder is found by its date, shares and price, and saved as typed', () => {
    const linked = addRows([], [{ accountId: 'rh', holding: 'MSFT', kind: 'PURCHASE', date: '2026-07-30', shares: 500, price: 350, amount: 175_000, source: 'linked', stillHeldOn: '2026-09-15' }], AT);
    const msft = { position_id: 'm', ticker: 'MSFT', kind: 'stocks_etf', lots: [{ lot_id: 'x', shares: 500, cost_per_share: 350, purchase_date: '2026-07-30' }] } as any;
    const out = run(linked, { kind: 'holding-changed', accountId: 'rh', before: msft, after: { ...msft, lots: [{ ...msft.lots[0], cost_per_share: 320 }] } }, AT2);
    expect(openPurchases(out.record, 'rh', 'MSFT')[0]).toMatchObject({ shares: 500, price: 320 });
    expect(rowsInForce(out.record).find((r) => r.kind === 'PURCHASE')?.source).toBe('typed');
  });

  test('an option lot of 1 contract at $2.50: 100 shares at $2.50 ($250 paid)', () => {
    const opt = { position_id: 'o', ticker: 'QQQ261231P600', kind: 'options', multiplier: 100, lots: [{ lot_id: 'o1', shares: 1, cost_per_share: 2.5, purchase_date: '2026-06-01' }] } as any;
    const out = run([], { kind: 'holding-added', accountId: 'van', position: opt });
    const p = rowsInForce(out.record).find((r) => r.kind === 'PURCHASE');
    expect(p).toMatchObject({ shares: 100, price: 2.5, amount: 250, ref: lotRef('van', { lot_id: 'o1' }) });
  });

  test('the same holding handed in twice adds it once', () => {
    const once = run([], { kind: 'holding-added', accountId: 'van', position: vti }).record;
    const twice = run(once, { kind: 'holding-added', accountId: 'van', position: vti }, AT2).record;
    expect(sharesOnRecord(twice, 'van', 'VTI')).toBe(100);
  });
});

describe('a transaction recorded or deleted by hand', () => {
  const buy = { id: 'b1', type: 'BUY', account_id: 'man', ticker: 'VTI', shares: 20, price: 100, date: '2026-10-01', created_at: AT } as any;
  const sell = { id: 's1', type: 'SELL', account_id: 'man', ticker: 'VTI', shares: 5, price: 120, date: '2026-10-15', created_at: AT } as any;

  test('bought 20 VTI at $100 on Oct 1, sold 5 at $120 on Oct 15: 15 held, the sale made $100 (5 × $20)', () => {
    let rec = run([], { kind: 'transaction-recorded', transaction: buy }).record;
    rec = run(rec, { kind: 'transaction-recorded', transaction: sell }, AT2).record;
    expect(sharesOnRecord(rec, 'man', 'VTI')).toBe(15);
    const s = rowsInForce(rec).find((r) => r.kind === 'SALE') as AssetRow;
    expect(s).toMatchObject({ date: '2026-10-15', shares: 5, price: 120, amount: 600, ref: txnRef(sell) });
    expect(saleGain(rec, s.rowId)).toBe(100);
  });

  test('the sale deleted: 20 held again', () => {
    let rec = run([], { kind: 'transaction-recorded', transaction: buy }).record;
    rec = run(rec, { kind: 'transaction-recorded', transaction: sell }, AT2).record;
    const out = run(rec, { kind: 'transaction-deleted', transaction: sell }, AT3);
    expect(sharesOnRecord(out.record, 'man', 'VTI')).toBe(20);
    expect(out.problems).toEqual([]);
  });

  test('a dividend of $12.50, a deposit of $500 and a fee of $2 each saved on their own date', () => {
    let rec: AssetRow[] = [];
    for (const [i, t] of [['DIVIDEND', 12.5], ['DEPOSIT', 500], ['FEE', 2]].entries()) {
      rec = run(rec, { kind: 'transaction-recorded', transaction: { id: `m${i}`, type: t[0], account_id: 'man', ticker: t[0] === 'DIVIDEND' ? 'VTI' : undefined, amount: t[1], date: `2026-10-0${i + 2}`, created_at: AT } as any }).record;
    }
    expect(rowsInForce(rec).map((r) => [r.kind, r.amount, r.date])).toEqual([
      ['DIVIDEND', 12.5, '2026-10-02'], ['DEPOSIT', 500, '2026-10-03'], ['FEE', 2, '2026-10-04']]);
  });

  test('$1,000 moved from checking to savings: one transfer row naming both accounts', () => {
    const out = run([], { kind: 'transaction-recorded', transaction: { id: 't', type: 'TRANSFER', account_id: 'chk', counter_account_id: 'sav', amount: 1000, date: '2026-10-05', created_at: AT } as any });
    expect(rowsInForce(out.record)).toEqual([expect.objectContaining({ kind: 'TRANSFER', accountId: 'chk', toAccountId: 'sav', amount: 1000, holding: null })]);
  });
});

describe('savings moved, accounts removed or unlinked', () => {
  test('$500 of this month\'s surplus moved into Savings on Nov 11: a deposit of $500 dated Nov 11', () => {
    const out = run([], { kind: 'savings-moved', accountId: 'sav', amount: 500, date: '2026-11-11' });
    expect(rowsInForce(out.record)).toEqual([expect.objectContaining({ kind: 'DEPOSIT', amount: 500, date: '2026-11-11', source: 'typed' })]);
  });

  test('two moves of $500 on one day are two deposits', () => {
    const one = run([], { kind: 'savings-moved', accountId: 'sav', amount: 500, date: '2026-11-11' }).record;
    const two = run(one, { kind: 'savings-moved', accountId: 'sav', amount: 500, date: '2026-11-11' }, AT2).record;
    expect(rowsInForce(two).filter((r) => r.kind === 'DEPOSIT')).toHaveLength(2);
  });

  test('an account removed keeps its history, with a fact saying it was removed', () => {
    const one = run([], { kind: 'account-added', account: savings }).record;
    const out = run(one, { kind: 'account-removed', accountId: 'sav' }, AT2);
    expect(valuesNow(out.record, 'sav')?.total).toBe(12_400);
    expect(factsOf(out.record, 'sav', null)).toMatchObject({ accountRemoved: true });
  });

  test('an account unlinked and kept: a fact saying so, nothing removed', () => {
    const out = run([], { kind: 'account-unlinked', accountId: 'rh', keptAsTyped: true });
    expect(factsOf(out.record, 'rh', null)).toEqual({ unlinked: true });
  });
});

describe('outside check, 2026-11-12', () => {
  const brk = (id: string) => ({ asset_id: id, label: id, institution: 'Vanguard', kind: 'brokerage', balance: 0, source: 'manual', positions: [] }) as any;

  test('3 MSFT moved from account A to account B with "transfer shares" (the app sends no share count): one transfer of 3 shares, A holds 0 and B holds 3', () => {
    const msft = { position_id: 'm', ticker: 'MSFT', kind: 'stocks_etf', lots: [{ lot_id: 'lm', shares: 3, cost_per_share: 100, purchase_date: '2025-01-02' }] } as any;
    const one = run([], { kind: 'account-added', account: { ...brk('A'), positions: [msft] } }).record;
    const out = run(one, { kind: 'transaction-recorded', transaction: { id: 'tk', type: 'TRANSFER_IN_KIND', account_id: 'A', counter_account_id: 'B', ticker: 'MSFT', date: '2026-03-01', created_at: AT } as any }, AT2);
    expect(rowsInForce(out.record).filter((r) => r.kind === 'TRANSFER')).toEqual([expect.objectContaining({ accountId: 'A', toAccountId: 'B', holding: 'MSFT', shares: 3, date: '2026-03-01' })]);
    expect(rowsInForce(out.record).filter((r) => r.kind === 'OTHER')).toEqual([]);
    expect(sharesOnRecord(out.record, 'A', 'MSFT')).toBe(0);
    expect(sharesOnRecord(out.record, 'B', 'MSFT')).toBe(3);
    // the shares keep their own purchase: bought Jan 2, 2025 at $100
    expect(openPurchases(out.record, 'B', 'MSFT')).toEqual([expect.objectContaining({ date: '2025-01-02', shares: 3, price: 100 })]);
  });

  test('10 APPL bought Mar 3, 2025 at $150, the ticker corrected to AAPL: 0 APPL and 10 AAPL, bought Mar 3, 2025 at $150', () => {
    const appl = { position_id: 'p', ticker: 'APPL', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 10, cost_per_share: 150, purchase_date: '2025-03-03' }] } as any;
    const one = run([], { kind: 'holding-added', accountId: 'van', position: appl }).record;
    const out = run(one, { kind: 'holding-changed', accountId: 'van', before: appl, after: { ...appl, ticker: 'AAPL' } }, AT2);
    expect(out.problems).toEqual([]);
    expect(sharesOnRecord(out.record, 'van', 'APPL')).toBe(0);
    expect(sharesOnRecord(out.record, 'van', 'AAPL')).toBe(10);
    expect(openPurchases(out.record, 'van', 'AAPL')).toEqual([expect.objectContaining({ date: '2025-03-03', shares: 10, price: 150 })]);
  });
});

describe('outside check 2, 2026-11-12: a tax lot edited after part of it was sold', () => {
  // 100 VTI bought Mar 3, 2025 at $80; 30 sold Oct 15, 2026 at $120; the editor shows the 70 left
  const bought = { position_id: 'p', ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 80, purchase_date: '2025-03-03' }] } as any;
  const left = { ...bought, lots: [{ ...bought.lots[0], shares: 70 }] };
  const sold = () => {
    const one = run([], { kind: 'holding-added', accountId: 'van', position: bought }).record;
    return run(one, { kind: 'transaction-recorded', transaction: { id: 's1', type: 'SELL', account_id: 'van', ticker: 'VTI', shares: 30, price: 120, date: '2026-10-15', created_at: AT } as any }, AT2).record;
  };

  test('the price paid changed from $80 to $85: the purchase stays 100 shares at $85, 70 held, and the sale made 30 × ($120 − $85) = $1,050', () => {
    const out = run(sold(), { kind: 'holding-changed', accountId: 'van', before: left, after: { ...left, lots: [{ ...left.lots[0], cost_per_share: 85 }] } }, AT3);
    expect(out.problems).toEqual([]);
    expect(sharesOnRecord(out.record, 'van', 'VTI')).toBe(70);
    expect(rowsInForce(out.record).filter((r) => r.kind === 'PURCHASE').map((r) => [r.date, r.shares, r.price, r.amount])).toEqual([['2025-03-03', 100, 85, 8_500]]);
    expect(saleGain(out.record, rowsInForce(out.record).find((r) => r.kind === 'SALE')!.rowId)).toBe(1_050);
  });

  test('the 70 shares left changed to 60: the purchase is corrected to 90, so 60 are held and the sale of 30 stays', () => {
    const out = run(sold(), { kind: 'holding-changed', accountId: 'van', before: left, after: { ...left, lots: [{ ...left.lots[0], shares: 60 }] } }, AT3);
    expect(out.problems).toEqual([]);
    expect(sharesOnRecord(out.record, 'van', 'VTI')).toBe(60);
    expect(rowsInForce(out.record).filter((r) => r.kind === 'PURCHASE').map((r) => [r.shares, r.price, r.amount])).toEqual([[90, 80, 7_200]]);
    expect(saleGain(out.record, rowsInForce(out.record).find((r) => r.kind === 'SALE')!.rowId)).toBe(1_200);
  });
});
