import { parseCsv, importHoldings, decodeCsvBase64, classifyHolding } from './holdingsImport';

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

  // build-34 #7: the name didn't import because the header wasn't "Description/Security/Name/Fund".
  test('captures the security name from broader header labels (Investment / Holding)', () => {
    const r1 = importHoldings('Symbol,Investment,Quantity\nVTI,"Vanguard Total Stock",100\n');
    expect(r1.mapped.name).toBe('Investment');
    expect(r1.holdings[0]).toMatchObject({ ticker: 'VTI', label: 'Vanguard Total Stock' });
    expect(importHoldings('Ticker,Holding,Shares\nAAPL,"Apple Inc.",25\n').holdings[0].label).toBe('Apple Inc.');
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

// #12: the real cause of "we couldn't read that file" was encoding. Brokerage/Excel CSVs ship as
// UTF-8 (often BOM'd) or UTF-16 (LE/BE). We read raw bytes (base64) and decode here — verify each form
// round-trips back to the SAME csv that the parser already handles. (Buffer is Node-only; fine in jest.)
describe('decodeCsvBase64 — robust to UTF-8/UTF-16, with or without BOM (#12)', () => {
  const csv = 'Symbol,Quantity,Value $\nLCTX,965,1167.65\nVMFXX,50000,50000.00\n';
  const BOM = String.fromCharCode(0xFEFF);
  const b64 = (buf: Buffer) => buf.toString('base64');

  test('plain UTF-8', () => {
    expect(decodeCsvBase64(b64(Buffer.from(csv, 'utf8')))).toBe(csv);
  });
  test('UTF-8 with BOM', () => {
    const withBom = Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(csv, 'utf8')]);
    expect(decodeCsvBase64(b64(withBom))).toBe(csv);
  });
  test('UTF-16 LE with BOM (the classic "couldn\'t read" file)', () => {
    expect(decodeCsvBase64(b64(Buffer.from(BOM + csv, 'utf16le')))).toBe(csv);
  });
  test('UTF-16 LE without BOM (NUL-heavy → detected)', () => {
    expect(decodeCsvBase64(b64(Buffer.from(csv, 'utf16le')))).toBe(csv);
  });
  test('UTF-16 BE with BOM', () => {
    const le = Buffer.from(BOM + csv, 'utf16le');
    const be = Buffer.alloc(le.length);
    for (let i = 0; i < le.length; i += 2) { be[i] = le[i + 1]; be[i + 1] = le[i]; }  // swap to big-endian
    expect(decodeCsvBase64(b64(be))).toBe(csv);
  });
  test('a UTF-16 export still parses end-to-end after decode', () => {
    const decoded = decodeCsvBase64(b64(Buffer.from(BOM + csv, 'utf16le')));
    expect(importHoldings(decoded).holdings.length).toBe(2);
  });
});

// PRD F1 #19 (founder review): crypto / currency / commodities must classify as alternatives,
// not fall through to the stocks_etf default — while mining COMPANIES stay equities.
describe('classifyHolding — crypto, commodities, currency (F1 #19)', () => {
  test('crypto tickers and names → alternatives', () => {
    expect(classifyHolding('GBTC', 'Grayscale Bitcoin Trust')).toBe('alternatives');
    expect(classifyHolding('IBIT', '')).toBe('alternatives');
    expect(classifyHolding('XYZ', 'Something Ethereum Fund')).toBe('alternatives');
    expect(classifyHolding('ZZZ', 'Cryptocurrency Index')).toBe('alternatives');
  });
  test('spot-commodity funds → alternatives', () => {
    expect(classifyHolding('GLD', 'SPDR Gold Shares')).toBe('alternatives');
    expect(classifyHolding('SLV', '')).toBe('alternatives');
    expect(classifyHolding('ZZZ', 'Physical Platinum Trust')).toBe('alternatives');
  });
  test('mining COMPANIES with commodity words stay stocks', () => {
    expect(classifyHolding('GOLD', 'Barrick Gold Corp')).toBe('stocks_etf');
    expect(classifyHolding('AG', 'First Majestic Silver Corp')).toBe('stocks_etf');
    expect(classifyHolding('NEM', 'Newmont Mining')).toBe('stocks_etf');
  });
  test('COIN (Coinbase) is a stock, not crypto', () => {
    expect(classifyHolding('COIN', 'Coinbase Global Inc')).toBe('stocks_etf');
  });
  test('currency funds → alternatives', () => {
    expect(classifyHolding('FXE', 'Invesco Currency Shares Euro')).toBe('alternatives');
  });
  test('existing classes unchanged: money market → cash, treasuries → bonds/cash, options → alternatives', () => {
    expect(classifyHolding('SPAXX', 'Fidelity Government Money Market')).toBe('cash');
    expect(classifyHolding('ZZZ', 'US Treasury Note 2030')).toBe('bonds');
    expect(classifyHolding('ZZZ', 'AAPL Jan 2027 Call')).toBe('alternatives');
  });
});

// PRD Capability-map G2 (founder 2026-06-30, closed 2026-07-18): OPTION rows — OCC symbols,
// date-style symbols, and named calls/puts — file under ALTERNATIVES, never as stocks.
describe('classifyHolding — options (G2)', () => {
  const { classifyHolding } = require('./holdingsImport');
  test('OCC option symbols classify as alternatives', () => {
    expect(classifyHolding('AAPL250116C00220000')).toBe('alternatives');
    expect(classifyHolding('F  261218P00009000')).toBe('alternatives');
  });
  test('date-style option symbols classify as alternatives', () => {
    expect(classifyHolding('AAPL 01/16/2027 220.00 C')).toBe('alternatives');
  });
  test('named calls/puts classify as alternatives; plain tickers stay equities', () => {
    expect(classifyHolding('AAPL', 'AAPL Jan 2027 220 Call')).toBe('alternatives');
    expect(classifyHolding('AAPL', 'Apple Inc')).toBe('stocks_etf');
    expect(classifyHolding('CALLON', 'Callon Petroleum')).toBe('stocks_etf');   // 'call' inside a word ≠ option
  });
});
