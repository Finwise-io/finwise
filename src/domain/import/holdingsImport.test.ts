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

// #13: a REAL E*TRADE export — preamble before the header, mixed asset classes in one account,
// non-ticker securities (CD, option), and a TOTAL summary row. Every column/row verified.
describe('E*TRADE multi-asset export (#13)', () => {
  const csv = [
    'Account Summary',
    'Account,Net Account Value,Total Gain $,Total Gain %,Day\'s Gain Unrealized $,Day\'s Gain Unrealized %,Available For Withdrawal,Cash Purchasing Power',
    '"Individual Brokerage -2203",169664.71,-4146.87,-2.49,-34.86,-.02,7096.82,7096.82',
    '',
    'View Summary - All Positions',
    'Filters applied: ',
    'Symbol,Security type(s),Sort by,Sort order,',
    ',All,Symbol,Asc,',
    '',
    'Symbol,Last Price $,Change $,Change %,Quantity,Price Paid $,Day\'s Gain $,Total Gain $,Total Gain %,Value $',
    'KEY BANK CD CLEVELAND OH CD 3.85% 08/24/2026,99.9934,--,--,110000.0000,100.00,3.7400,-7.2600,-.0066,109992.7400',
    'LCTX,1.21,-0.04,-3.20,965.0000,1.74,-38.6000,-511.4500,-30.4598,1167.6500',
    "QQQ Dec 31 '26 $600 Put,14.16,0.00,0.00,1.0000,50.35,.0000,-3628.1600,-72.0493,1407.5000",
    'VMFXX,1.00,0.00,0.00,50000.0000,1.00,.0000,.0000,.0000,50000.0000',
    'CASH,,,,,,,,,7096.82,',
    'TOTAL,,,,166714.76,-34.86,-4146.87,-2.49,169664.71,',
  ].join('\n');

  const r = importHoldings(csv);
  const byClass = (c: string) => r.holdings.filter((h) => h.assetClass === c);

  test('skips the preamble + the TOTAL row, imports the 5 real holdings', () => {
    expect(r.holdings.length).toBe(5);
    expect(r.holdings.map((h) => h.symbol)).not.toContain('TOTAL');
  });
  test('CD + money-market + cash line → cash; option → alternatives; stock → equities', () => {
    expect(byClass('cash').map((h) => h.symbol).sort()).toEqual(['CASH', 'KEY BANK CD CLEVELAND OH CD 3.85% 08/24/2026', 'VMFXX']);
    expect(byClass('alternatives').map((h) => h.symbol)).toEqual(["QQQ Dec 31 '26 $600 Put"]);
    expect(byClass('stocks_etf').map((h) => h.symbol)).toEqual(['LCTX']);
  });
  test('captures market value; only the equity gets a tradeable ticker', () => {
    const cd = r.holdings.find((h) => h.assetClass === 'cash' && h.symbol.includes('CD'))!;
    expect(cd.value).toBeCloseTo(109992.74, 2);
    expect(cd.ticker).toBe('');                               // a CD is not a tradeable ticker
    expect(r.holdings.find((h) => h.symbol === 'LCTX')!.ticker).toBe('LCTX');
  });
});
