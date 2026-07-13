// P0: deleting a ledger row must reverse its balance effect (ledger and balances may never drift).
// Drives the REAL store (recordTransaction/deleteTransaction), not a harness replica — lesson:
// test the exact function production calls.
import { useStore } from '../store/useStore';
import type { AssetAccount } from '../domain/assets';

const acct = (id: string, o: Partial<AssetAccount> = {}): AssetAccount =>
  ({ asset_id: id, label: id, tax_bucket: 'TAXABLE', balance: 0, ...o } as AssetAccount);

const S = () => useStore.getState();
const cashOf = (id: string) => {
  const a = S().assetAccounts.find((x) => x.asset_id === id)!;
  return a.tax_bucket === 'CASH' ? a.balance : (a.cash_balance ?? 0);
};
const sharesOf = (id: string, ticker: string) => {
  const a = S().assetAccounts.find((x) => x.asset_id === id)!;
  const p = (a.positions ?? []).find((p) => p.ticker === ticker);
  return p ? p.lots.reduce((t, l) => t + l.shares, 0) : 0;
};
const snapshot = () => JSON.parse(JSON.stringify({ accounts: S().assetAccounts, txns: S().transactions.map((t) => t.id) }));

function reset(accounts: AssetAccount[]) {
  useStore.setState({ assetAccounts: JSON.parse(JSON.stringify(accounts)), transactions: [], priceCache: {} } as any);
}
const record = (p: any) => { S().recordTransaction(p); return S().transactions[0].id; };
const TODAY = '2026-07-12';

describe('deleteTransaction reverses balance effects (P0)', () => {
  test('deposit → delete → cash exactly restored', () => {
    reset([acct('BRK', { cash_balance: 1000 })]);
    const id = record({ date: TODAY, type: 'DEPOSIT', account_id: 'BRK', amount: 250 });
    expect(cashOf('BRK')).toBe(1250);
    expect(S().deleteTransaction(id)).toBe(true);
    expect(cashOf('BRK')).toBe(1000);
    expect(S().transactions).toHaveLength(0);
  });

  test('buy → delete → lots gone AND cash restored', () => {
    reset([acct('BRK', { cash_balance: 5000 })]);
    const id = record({ date: TODAY, type: 'BUY', account_id: 'BRK', ticker: 'VTI', shares: 10, price: 300 });
    expect(cashOf('BRK')).toBe(2000);
    expect(sharesOf('BRK', 'VTI')).toBe(10);
    expect(S().deleteTransaction(id)).toBe(true);
    expect(cashOf('BRK')).toBe(5000);
    expect(sharesOf('BRK', 'VTI')).toBe(0);
  });

  test('buy → sell → delete the BUY: suffix replays — final state == control where only the sell ever happened', () => {
    // control: only the sell on the base state (clamps to 0 shares — nothing to sell)
    reset([acct('BRK', { cash_balance: 5000 })]);
    record({ date: TODAY, type: 'SELL', account_id: 'BRK', ticker: 'VTI', shares: 5, price: 320 });
    const control = JSON.parse(JSON.stringify(S().assetAccounts));
    // actual: buy, then sell (consumes the buy's lot), then delete the buy
    reset([acct('BRK', { cash_balance: 5000 })]);
    const buyId = record({ date: TODAY, type: 'BUY', account_id: 'BRK', ticker: 'VTI', shares: 10, price: 300 });
    record({ date: TODAY, type: 'SELL', account_id: 'BRK', ticker: 'VTI', shares: 5, price: 320 });
    expect(S().deleteTransaction(buyId)).toBe(true);
    // the replayed SELL must have re-clamped against a world with no lots (same as control)
    const strip = (accs: any[]) => accs.map(({ positions, ...a }: any) => ({ ...a, positions: positions ?? [] }));
    expect(strip(S().assetAccounts)).toEqual(strip(control));
    expect(S().transactions).toHaveLength(1);   // the sell survives, re-snapshotted
    expect(S().transactions[0].type).toBe('SELL');
  });

  test('reinvested dividend → delete → the reinvested lot is removed', () => {
    reset([acct('BRK', { cash_balance: 0, positions: [{ position_id: 'pos_1', ticker: 'VTI', lots: [{ lot_id: 'lot_1', shares: 10, cost_per_share: 200, purchase_date: '2025-01-01' }] }] } as any)]);
    const id = record({ date: TODAY, type: 'DIVIDEND', account_id: 'BRK', ticker: 'VTI', reinvested: true, shares: 0.5, price: 310 });
    expect(sharesOf('BRK', 'VTI')).toBe(10.5);
    expect(S().deleteTransaction(id)).toBe(true);
    expect(sharesOf('BRK', 'VTI')).toBe(10);
  });

  test('transfer between accounts → delete → both sides restored', () => {
    reset([acct('A', { cash_balance: 900 }), acct('B', { cash_balance: 100 })]);
    const id = record({ date: TODAY, type: 'TRANSFER', account_id: 'A', counter_account_id: 'B', amount: 400 });
    expect(cashOf('A')).toBe(500); expect(cashOf('B')).toBe(500);
    expect(S().deleteTransaction(id)).toBe(true);
    expect(cashOf('A')).toBe(900); expect(cashOf('B')).toBe(100);
  });

  test('legacy row without undo_prev: cash-delta type reverses via the synthetic opposite', () => {
    reset([acct('BRK', { cash_balance: 1000 })]);
    const id = record({ date: TODAY, type: 'DEPOSIT', account_id: 'BRK', amount: 300 });
    useStore.setState({ transactions: S().transactions.map((t) => { const { undo_prev, ...rest } = t as any; return rest; }) } as any);
    expect(S().deleteTransaction(id)).toBe(true);
    expect(cashOf('BRK')).toBe(1000);
  });

  test('legacy lot-touching row without undo_prev: delete is BLOCKED and state untouched', () => {
    reset([acct('BRK', { cash_balance: 5000 })]);
    const id = record({ date: TODAY, type: 'BUY', account_id: 'BRK', ticker: 'VTI', shares: 10, price: 300 });
    useStore.setState({ transactions: S().transactions.map((t) => { const { undo_prev, ...rest } = t as any; return rest; }) } as any);
    const before = snapshot();
    expect(S().deleteTransaction(id)).toBe(false);
    expect(snapshot()).toEqual(before);          // nothing changed, row still there
  });

  test('legacy OPENING_CASH (absolute set) blocks deletion of itself and anything older through it', () => {
    reset([acct('BRK', {})]);
    const dep = record({ date: TODAY, type: 'DEPOSIT', account_id: 'BRK', amount: 100 });
    const open_ = record({ date: TODAY, type: 'OPENING_CASH', account_id: 'BRK', amount: 2000 });
    useStore.setState({ transactions: S().transactions.map((t) => { const { undo_prev, ...rest } = t as any; return rest; }) } as any);
    expect(S().deleteTransaction(open_)).toBe(false);   // absolute set, no snapshot → blocked
    expect(S().deleteTransaction(dep)).toBe(false);     // unwinding to it must pass THROUGH the opening → blocked
  });

  test('deleting an unknown id returns false and changes nothing', () => {
    reset([acct('BRK', { cash_balance: 42 })]);
    const before = snapshot();
    expect(S().deleteTransaction('txn_nope')).toBe(false);
    expect(snapshot()).toEqual(before);
  });
});
