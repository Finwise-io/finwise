import { applyTransaction, makeTransaction, cashEffect, type Transaction } from './index';
import type { AssetAccount } from '../assets';

const acct = (id: string, over: Partial<AssetAccount> = {}): AssetAccount => ({
  asset_id: id, label: id, tax_bucket: 'TAXABLE', balance: 0, target_return: 0.08, cash_balance: 0, positions: [], ...over,
});
const txn = (p: Partial<Transaction>): Transaction => makeTransaction({ date: '2025-01-02', type: 'BUY', account_id: 'A', ...p } as any);

describe('transaction engine — applyTransaction', () => {
  test('DEPOSIT / WITHDRAWAL move cash', () => {
    let accs = [acct('A')];
    accs = applyTransaction(accs, txn({ type: 'DEPOSIT', amount: 1000 }));
    expect(accs[0].cash_balance).toBe(1000);
    accs = applyTransaction(accs, txn({ type: 'WITHDRAWAL', amount: 400 }));
    expect(accs[0].cash_balance).toBe(600);
  });

  test('BUY spends cash and adds a lot; SELL FIFO returns cash and reduces shares', () => {
    let accs = [acct('A', { cash_balance: 10000 })];
    accs = applyTransaction(accs, txn({ type: 'BUY', ticker: 'AAPL', kind: 'stocks_etf', shares: 10, price: 200 }));
    expect(accs[0].cash_balance).toBe(8000);
    expect(accs[0].positions![0].ticker).toBe('AAPL');
    expect(accs[0].positions![0].lots[0].shares).toBe(10);
    // second buy adds a lot
    accs = applyTransaction(accs, txn({ type: 'BUY', ticker: 'AAPL', shares: 5, price: 220 }));
    expect(accs[0].positions![0].lots.length).toBe(2);
    expect(accs[0].cash_balance).toBe(8000 - 5 * 220);
    // sell 12 → FIFO removes 10 from lot1 + 2 from lot2; 3 left
    accs = applyTransaction(accs, txn({ type: 'SELL', ticker: 'AAPL', shares: 12, price: 250 }));
    const totalShares = accs[0].positions![0].lots.reduce((t, l) => t + l.shares, 0);
    expect(totalShares).toBeCloseTo(3, 6);
    expect(accs[0].cash_balance).toBe(8000 - 1100 + 12 * 250);
  });

  test('SELL all removes the position', () => {
    let accs = [acct('A', { cash_balance: 0 })];
    accs = applyTransaction(accs, txn({ type: 'OPENING_POSITION', ticker: 'VTI', shares: 4, price: 200 }));
    accs = applyTransaction(accs, txn({ type: 'SELL', ticker: 'VTI', shares: 4, price: 300 }));
    expect(accs[0].positions!.length).toBe(0);
    expect(accs[0].cash_balance).toBe(1200);
  });

  test('TRANSFER moves cash between accounts', () => {
    let accs = [acct('A', { cash_balance: 5000 }), acct('B', { cash_balance: 0 })];
    accs = applyTransaction(accs, txn({ type: 'TRANSFER', account_id: 'A', counter_account_id: 'B', amount: 2000 }));
    expect(accs[0].cash_balance).toBe(3000);
    expect(accs[1].cash_balance).toBe(2000);
  });

  test('TRANSFER_IN_KIND moves a whole position', () => {
    let accs = [acct('A'), acct('B')];
    accs = applyTransaction(accs, txn({ type: 'OPENING_POSITION', account_id: 'A', ticker: 'MSFT', shares: 3, price: 100 }));
    accs = applyTransaction(accs, txn({ type: 'TRANSFER_IN_KIND', account_id: 'A', counter_account_id: 'B', ticker: 'MSFT' }));
    expect(accs[0].positions!.length).toBe(0);
    expect(accs[1].positions![0].ticker).toBe('MSFT');
  });

  test('DIVIDEND: cash vs reinvested', () => {
    let accs = [acct('A', { cash_balance: 0 })];
    accs = applyTransaction(accs, txn({ type: 'OPENING_POSITION', ticker: 'SCHD', shares: 100, price: 25 }));
    // cash dividend
    accs = applyTransaction(accs, txn({ type: 'DIVIDEND', ticker: 'SCHD', amount: 80 }));
    expect(accs[0].cash_balance).toBe(80);
    // reinvested dividend adds shares, no cash change
    accs = applyTransaction(accs, txn({ type: 'DIVIDEND', ticker: 'SCHD', reinvested: true, shares: 2, price: 26 }));
    expect(accs[0].cash_balance).toBe(80);
    const sh = accs[0].positions![0].lots.reduce((t, l) => t + l.shares, 0);
    expect(sh).toBe(102);
  });

  test('cashEffect sign matches intent', () => {
    expect(cashEffect(txn({ type: 'BUY', shares: 10, price: 50 }))).toBe(-500);
    expect(cashEffect(txn({ type: 'SELL', shares: 10, price: 50 }))).toBe(500);
    expect(cashEffect(txn({ type: 'DEPOSIT', amount: 300 }))).toBe(300);
    expect(cashEffect(txn({ type: 'DIVIDEND', reinvested: true, shares: 1, price: 10 }))).toBe(0);
  });
});
