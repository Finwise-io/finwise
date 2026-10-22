// UNDO PUTS EVERY ACCOUNT BACK, FOR EVERY KIND OF MONEY RECORD (2026-10-21) — MK-CF-F-116 inverseOf through the real
// applyTransaction (MK-CF-F-111) and the store's delete.
//
// Found by the RULES agent: a $500 transfer A ($1,000) → B ($1,000) stored with direction OUT was undone by swapping the
// two accounts AND flipping the direction; the two cancelled, so the undo moved the money a second time (here: a $500.37
// transfer left A at −$0.74 and B at $2,000.74) instead of putting it back. A transfer between two accounts is now undone
// by the swap alone.
//
// Worked by hand first. Accounts A and B each hold $1,000.00. Each record below moves money as its kind and direction say
// (moneyIntoAccount, ledger.ts); "after" is A, B once it is applied; undoing it must give A $1,000.00, B $1,000.00 again.
import { applyTransaction, inverseOf, type Transaction } from './index';
import { useStore } from '../../store/useStore';

const START = () => [
  { asset_id: 'A', label: 'Checking A', kind: 'checking', tax_bucket: 'CASH', balance: 1_000 },
  { asset_id: 'B', label: 'Checking B', kind: 'checking', tax_bucket: 'CASH', balance: 1_000 },
] as any[];
const cents = (n: number) => Math.round(n * 100) / 100;
const at = (accounts: any[]) => accounts.map((a) => cents(a.balance));
const rec = (over: Partial<Transaction>): Transaction =>
  ({ id: `t-${Math.random()}`, date: '2026-10-05', account_id: 'A' as any, source: 'manual', ...over } as Transaction);

/** [what, the record, A and B after it is applied — worked by hand] */
const CASES: [string, Transaction, [number, number]][] = [
  ['transfer A → B $500.37, direction OUT (the RULES agent\'s case)', rec({ type: 'TRANSFER', counter_account_id: 'B' as any, amount: 500.37, direction: 'OUT' }), [499.63, 1_500.37]],
  ['transfer A ← B $500.37, direction IN', rec({ type: 'TRANSFER', counter_account_id: 'B' as any, amount: 500.37, direction: 'IN' }), [1_500.37, 499.63]],
  ['transfer A → B $500.37, no direction', rec({ type: 'TRANSFER', counter_account_id: 'B' as any, amount: 500.37 }), [499.63, 1_500.37]],
  ['deposit $250.11, no direction', rec({ type: 'DEPOSIT', amount: 250.11 }), [1_250.11, 1_000]],
  ['deposit $250.11 reversed (direction OUT)', rec({ type: 'DEPOSIT', amount: 250.11, direction: 'OUT' }), [749.89, 1_000]],
  ['deposit typed as −$250.11 (a reversal, no direction)', rec({ type: 'DEPOSIT', amount: -250.11 }), [749.89, 1_000]],
  ['withdrawal $200.09, no direction', rec({ type: 'WITHDRAWAL', amount: 200.09 }), [799.91, 1_000]],
  ['withdrawal $200.09 reversed (direction IN)', rec({ type: 'WITHDRAWAL', amount: 200.09, direction: 'IN' }), [1_200.09, 1_000]],
  ['dividend $50.23, no direction', rec({ type: 'DIVIDEND', amount: 50.23, ticker: 'VTI' }), [1_050.23, 1_000]],
  ['dividend $50.23 reversed (direction OUT)', rec({ type: 'DIVIDEND', amount: 50.23, ticker: 'VTI', direction: 'OUT' }), [949.77, 1_000]],
  ['coupon $25.50 reversed (direction OUT)', rec({ type: 'COUPON', amount: 25.5, direction: 'OUT' }), [974.5, 1_000]],
  ['interest $3.21, direction IN', rec({ type: 'INTEREST', amount: 3.21, direction: 'IN' }), [1_003.21, 1_000]],
  ['fee $4.99, no direction', rec({ type: 'FEE', amount: 4.99 }), [995.01, 1_000]],
  ['fee $4.99 refunded (direction IN)', rec({ type: 'FEE', amount: 4.99, direction: 'IN' }), [1_004.99, 1_000]],
  ['journal into A $300.01 (one-sided transfer, direction IN)', rec({ type: 'TRANSFER', amount: 300.01, direction: 'IN' }), [1_300.01, 1_000]],
  ['journal out of A $300.01 (one-sided transfer, direction OUT)', rec({ type: 'TRANSFER', amount: 300.01, direction: 'OUT' }), [699.99, 1_000]],
  ['one-sided transfer $300.01, no direction', rec({ type: 'TRANSFER', amount: 300.01 }), [699.99, 1_000]],
];

describe('apply, then undo, gives the starting balances to the cent', () => {
  test.each(CASES)('%s', (_what, t, after) => {
    const applied = applyTransaction(START(), t);
    expect(at(applied)).toEqual(after);
    const inv = inverseOf(t);
    expect(inv).not.toBeNull();
    expect(at(applyTransaction(applied, inv!))).toEqual([1_000, 1_000]);
  });
});

describe('the same through the store\'s delete — a row recorded before undo copies were kept is undone by inverseOf', () => {
  test.each(CASES)('%s', (_what, t) => {
    useStore.getState().resetAll();
    useStore.setState({ assetAccounts: applyTransaction(START(), t), transactions: [t] } as any);
    expect(useStore.getState().deleteTransaction(String(t.id))).toBe(true);
    const s = useStore.getState() as any;
    expect(at(['A', 'B'].map((id) => s.assetAccounts.find((a: any) => a.asset_id === id)))).toEqual([1_000, 1_000]);
    expect(s.transactions).toHaveLength(0);
  });
});

test('BEFORE the fix, pinned: flipping the direction as well as swapping the accounts moved the $500 a second time', () => {
  const t = CASES[0][1];
  const applied = applyTransaction(START(), t);
  const wrongUndo = { ...inverseOf(t)!, direction: 'IN' as const };   // what inverseOf returned until this fix
  expect(at(applyTransaction(applied, wrongUndo))).toEqual([-0.74, 2_000.74]);
});
