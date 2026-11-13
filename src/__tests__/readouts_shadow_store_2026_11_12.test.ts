/* PHASE 3, STAGE 2 — THE READ-OUTS IN SHADOW IN THE STORE (2026-11-12). After every save the store works the read-outs out
 * and keeps them beside the old copies (readOutShadow); nothing reads them yet. A dev check records a fault for every
 * difference no reason explains. The guard proves it fires: a fixture whose old copy disagrees with its record must fault. */
import { useStore, readOutShadow, SCREENS_READ_THE_RECORD } from '../store/useStore';

// With the screens reading the record (SCREENS_READ_THE_RECORD) there is no shadow: the copies the screens read ARE the
// read-outs. Each check below says what it proves in that world too.
const shadow = !SCREENS_READ_THE_RECORD;

const st = () => useStore.getState() as any;
beforeEach(() => { useStore.getState().resetAll(); readOutShadow.faults = []; });

test('every save is read out in shadow: Savings $1,000 as of Nov 1, then $500 moved in → the shadow reads $1,500 beside the old $1,500, no fault', () => {
  const runs = readOutShadow.runs;
  st().addAsset({ label: 'Savings', kind: 'savings', tax_bucket: 'CASH', balance: 1_000, source: 'manual', value_as_of: '2026-11-01' });
  const id = st().assetAccounts[0].asset_id;
  st().allocateSavings('2026-11', [{ assetId: id, amount: 500 }]);
  if (shadow) {
    expect(readOutShadow.runs).toBeGreaterThanOrEqual(runs + 2);               // the guard looked: one run per save at least
    expect(readOutShadow.readOuts!.assetAccounts.map((a) => [a.asset_id, a.balance, a.value_as_of])).toEqual([[id, 1_500, '2026-11-01']]);
  } else {
    expect(st().assetRecord.length).toBeGreaterThanOrEqual(2);                // the guard looked: the value and the deposit
    expect(st().assetAccounts.map((a: any) => [a.asset_id, a.balance, a.value_as_of])).toEqual([[id, 1_500, '2026-11-01']]);   // $1,000 + $500
  }
  expect(st().assetAccounts[0].balance).toBe(1_500);                           // what the screens read: $1,000 + $500
  expect(readOutShadow.faults).toEqual([]);
  expect(st().readOuts).toBeUndefined();                                       // kept outside the store: never saved, never synced
});

test('a save that changes nothing it reads from does not work them out again', () => {
  st().addAsset({ label: 'Savings', kind: 'savings', tax_bucket: 'CASH', balance: 1_000, source: 'manual' });
  const runs = readOutShadow.runs;
  useStore.setState({ hideBalances: true } as any);
  expect(readOutShadow.runs).toBe(runs);
});

test('the dev check fires: an old copy that says $999 for a record that says $1,000 is recorded as a fault, by account', () => {
  st().addAsset({ label: 'Savings', kind: 'savings', tax_bucket: 'CASH', balance: 1_000, source: 'manual', value_as_of: '2026-11-01' });
  const a = st().assetAccounts[0];
  useStore.setState({ assetAccounts: [{ ...a, balance: 999 }] } as any);
  // in shadow: a fault, by account. With the screens reading the record: the $999 never reaches them — the record's $1,000 is
  // read out over it at once
  if (shadow) expect(readOutShadow.faults.map((f) => [f.accountId, f.what, f.old, f.readOut])).toEqual([[a.asset_id, 'balance', 999, 1_000]]);
  else expect(st().assetAccounts.map((x: any) => [x.asset_id, x.balance])).toEqual([[a.asset_id, 1_000]]);
});
