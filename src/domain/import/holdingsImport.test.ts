import { parseCsv, importHoldings } from './holdingsImport';

describe('parseCsv', () => {
  test('handles quoted fields with embedded commas and "" escapes', () => {
    const rows = parseCsv('Symbol,Description,Qty\nAAPL,"Apple, Inc.",10\nBRK.B,"Berkshire ""B""",2\n');
    expect(rows[1]).toEqual(['AAPL', 'Apple, Inc.', '10']);
    expect(rows[2]).toEqual(['BRK.B', 'Berkshire "B"', '2']);
  });
  test('drops blank lines', () => {
    expect(parseCsv('A,B\n\n1,2\n\n').length).toBe(2);
  });
});

describe('importHoldings', () => {
  test('Fidelity-style: symbol + quantity + average cost basis (per share)', () => {
    const csv = [
      'Symbol,Description,Quantity,Average Cost Basis,Last Price',
      'VTI,"Vanguard Total Stock",100,180.50,250.10',
      'AAPL,"Apple Inc.",25,120.00,210.00',
    ].join('\n');
    const r = importHoldings(csv);
    expect(r.holdings).toHaveLength(2);
    expect(r.skipped).toBe(0);
    expect(r.holdings[0]).toMatchObject({ ticker: 'VTI', shares: 100, costPerShare: 180.5, label: 'Vanguard Total Stock' });
    expect(r.mapped.cost).toBe('Average Cost Basis');
  });

  test('total Cost Basis is divided by shares to get per-share cost', () => {
    const csv = 'Ticker,Shares,Cost Basis\nSPY,10,"$4,000.00"\n';
    const r = importHoldings(csv);
    expect(r.holdings[0]).toMatchObject({ ticker: 'SPY', shares: 10, costPerShare: 400 });
  });

  test('drops summary/blank/invalid rows (Total, no shares, negative)', () => {
    const csv = [
      'Symbol,Quantity,Cost Basis',
      'MSFT,5,1500',
      'Total,,5000',          // summary row → no valid ticker
      'CASH,100,100',         // CASH is not a holding
      'GOOG,-3,300',          // negative shares
      ',8,80',                // no ticker
    ].join('\n');
    const r = importHoldings(csv);
    expect(r.holdings.map((h) => h.ticker)).toEqual(['MSFT']);
    expect(r.total).toBe(5);
    expect(r.skipped).toBe(4);
  });

  test('normalises dates to YYYY-MM-DD from either order', () => {
    const csv = 'Symbol,Quantity,Purchase Date\nVOO,1,03/15/2024\nQQQ,1,2023-7-9\n';
    const r = importHoldings(csv);
    expect(r.holdings[0].date).toBe('2024-03-15');
    expect(r.holdings[1].date).toBe('2023-07-09');
  });

  test('uppercases tickers and tolerates missing cost (defaults to 0)', () => {
    const r = importHoldings('symbol,shares\nvti,10\n');
    expect(r.holdings[0]).toMatchObject({ ticker: 'VTI', shares: 10, costPerShare: 0 });
  });

  test('empty / header-only file yields nothing, not a crash', () => {
    expect(importHoldings('').holdings).toEqual([]);
    expect(importHoldings('Symbol,Shares').holdings).toEqual([]);
  });
});
