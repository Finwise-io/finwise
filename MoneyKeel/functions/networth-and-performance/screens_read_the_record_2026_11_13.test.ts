/* PHASE 3, STAGES 3–5 — THE SWITCH, BUILT AND HELD OFF (2026-11-13). The pure parts it is made of, on worked examples. */
import { keepActivityIds, daysWithTheRecord, screensReadTheRecord } from './asset-record-readouts';
import { addRows, type NewRow } from './asset-record';

test('an empty record reads out nothing: the screens keep what they have', () => {
  expect(screensReadTheRecord({ assetRecord: [], assetAccounts: [{ asset_id: 'a', label: 'A', balance: 5 } as any] }, '2026-11-13')).toBeNull();
});

test('Savings $1,000 as of Nov 1 and a $500 deposit on Nov 12 → the account the screens read says $1,500 as of Nov 1', () => {
  const rows: NewRow[] = [
    { accountId: 'S', holding: null, kind: 'VALUE', date: '2026-11-01', source: 'typed', typedValue: 1_000 } as any,
    { accountId: 'S', holding: null, kind: 'DEPOSIT', date: '2026-11-12', source: 'typed', amount: 500 } as any,
  ];
  const record = addRows([], rows, '2026-11-12T10:00:00.000Z');
  const out = screensReadTheRecord({ assetRecord: record, assetAccounts: [{ asset_id: 'S', label: 'Savings', kind: 'savings', tax_bucket: 'CASH', balance: 900 } as any] }, '2026-11-13')!;
  expect(out.assetAccounts.map((a) => [a.label, a.balance, a.value_as_of])).toEqual([['Savings', 1_500, '2026-11-01']]);
});

test('an activity record read out keeps the old id and its own note where it is the same event; a new one keeps its own', () => {
  const read = [{ id: 'rec:7', date: '2026-11-12', type: 'DEPOSIT', account_id: 'S', amount: 500 } as any, { id: 'rec:8', date: '2026-11-13', type: 'FEE', account_id: 'S', amount: 2 } as any];
  const old = [{ id: 'txn_1', date: '2026-11-12', type: 'DEPOSIT', account_id: 'S', amount: 500, note: 'bonus' } as any];
  expect(keepActivityIds(read, old).map((t) => [t.id, t.note ?? null])).toEqual([['txn_1', 'bonus'], ['rec:8', null]]);
});

test('the days before the record’s first day stay as they were; from it on the days are the record’s', () => {
  const day = (date: string, id: string, v: number) => ({ date, holdings: [], accounts: [{ date, accountId: id, cash: v, currency: 'USD' }], origin: 'observed', writtenAt: '' } as any);
  const out = daysWithTheRecord([day('2026-11-01', 'S', 1_000)], [day('2026-10-31', 'S', 950), day('2026-11-01', 'S', 999)], new Set(['S']));
  expect(out.map((d) => [d.date, d.accounts[0].cash])).toEqual([['2026-10-31', 950], ['2026-11-01', 1_000]]);
});
