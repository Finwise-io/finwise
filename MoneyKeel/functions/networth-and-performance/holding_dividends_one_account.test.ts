/** A HOLDING'S DIVIDENDS ARE ITS OWN ACCOUNT'S (2026-10-20) — MK-NW-O-006 theHolding, figure MK-NW-M-034.
 *
 *  The defect: the holding page matched dividends by TICKER across every account, while "Realized from sales" on the
 *  same page counted this account only. VTI held at Vanguard and at Fidelity showed both accounts' dividends on each
 *  account's VTI page, so the two pages added up to twice what was received.
 *
 *  Held through the real doors: the holding page (theHolding), the account page (theAccount.incomeOfHolding) and the
 *  all-accounts figure the Performance tab shows (categoryEarnings, Stocks / Funds earned).
 */
import { theHolding } from './holding';
import { theAccount } from './account';
import { categoryEarnings } from './performance';

const NOW = new Date('2026-10-20T12:00:00Z');
const vti = { position_id: 'p-vti', ticker: 'VTI', label: 'Vanguard Total Market', asset_class: 'stock_etf', unit: 'shares',
  last_price: 300, lots: [{ lot_id: 'l1', shares: 10, cost_per_share: 200, purchase_date: '2024-01-10' }] } as any;
const vanguard = { asset_id: 'vg', label: 'Vanguard brokerage', institution: 'Vanguard', source: 'connected', balance: 3000, positions: [vti] } as any;
const fidelity = { asset_id: 'fd', label: 'Fidelity brokerage', institution: 'Fidelity', source: 'connected', balance: 3000, positions: [{ ...vti, position_id: 'p-vti-2' }] } as any;

const LEDGER = [
  { id: 'd1', account_id: 'vg', ticker: 'VTI', type: 'DIVIDEND', amount: 40, date: '2026-06-20' },
  { id: 'd2', account_id: 'fd', ticker: 'VTI', type: 'DIVIDEND', amount: 10, date: '2026-06-20' },
  // a sale in each account, so the page's two record sets can be compared
  { id: 'b1', account_id: 'vg', ticker: 'VTI', type: 'BUY', shares: 2, price: 200, amount: 400, date: '2025-01-10' },
  { id: 's1', account_id: 'vg', ticker: 'VTI', type: 'SELL', shares: 2, price: 250, amount: 500, date: '2026-05-01' },
  { id: 'b2', account_id: 'fd', ticker: 'VTI', type: 'BUY', shares: 1, price: 200, amount: 200, date: '2025-01-10' },
  { id: 's2', account_id: 'fd', ticker: 'VTI', type: 'SELL', shares: 1, price: 230, amount: 230, date: '2026-05-01' },
] as any[];

const page = (account: any) => theHolding({
  position: account.positions[0], accountId: account.asset_id, price: 300, transactions: LEDGER, now: NOW,
});

describe('VTI in Vanguard ($40 dividend) and in Fidelity ($10 dividend)', () => {
  test('the Vanguard VTI page shows $40 and the Fidelity VTI page shows $10 — before, both showed $50', () => {
    expect(page(vanguard).dividends.trailing12).toBe(40);
    expect(page(vanguard).dividends.allTime).toBe(40);
    expect(page(fidelity).dividends.trailing12).toBe(10);
    expect(page(fidelity).dividends.allTime).toBe(10);
  });

  test('the dividends and the sales on one page are counted from the same account’s records', () => {
    // Vanguard sold 2 bought at $200 for $250 → $100; Fidelity sold 1 bought at $200 for $230 → $30
    expect(page(vanguard).realised.realizedAllTime).toBe(100);
    expect(page(fidelity).realised.realizedAllTime).toBe(30);
  });

  test('each holding page agrees with that holding’s line on its own account page', () => {
    expect(theAccount({ account: vanguard, transactions: LEDGER }).incomeOfHolding('VTI').dividends).toBe(page(vanguard).dividends.allTime);
    expect(theAccount({ account: fidelity, transactions: LEDGER }).incomeOfHolding('VTI').dividends).toBe(page(fidelity).dividends.allTime);
  });

  test('the two pages add up to the all-accounts figure the Performance tab shows (Stocks / Funds earned $50)', () => {
    const rows = [vanguard, fidelity].map((a) => ({ position: a.positions[0], marketValue: 3000, periodReturn: null })) as any[];
    const all = categoryEarnings({ windowStart: null, transactions: LEDGER, rows } as any);
    const stocks = all.find((c) => c.key === 'stocks_etf')!;
    expect(stocks.earned).toBe(50);
    expect(page(vanguard).dividends.allTime + page(fidelity).dividends.allTime).toBe(stocks.earned);
  });

  test('a broker’s "VTI " with a trailing space is still VTI, as the account page reads it', () => {
    const spaced = [{ id: 'd3', account_id: 'vg', ticker: 'VTI ', type: 'DIVIDEND', amount: 5, date: '2026-07-20' }, ...LEDGER];
    const h = theHolding({ position: vti, accountId: 'vg', price: 300, transactions: spaced, now: NOW });
    expect(h.dividends.allTime).toBe(45);
    expect(theAccount({ account: vanguard, transactions: spaced }).incomeOfHolding('VTI').dividends).toBe(45);
  });

  test('the guard looked: six records handed over, two dividends, one counted on each page', () => {
    expect(LEDGER).toHaveLength(6);
    expect(LEDGER.filter((t) => t.type === 'DIVIDEND')).toHaveLength(2);
    const counted = [vanguard, fidelity].map((a) => page(a).dividends.allTime);
    expect(counted).toEqual([40, 10]);
  });
});
