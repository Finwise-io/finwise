// PROBE — the SAME holding, arriving three different ways.
//
// The founder's question was: "how do you determine from an imported file which line is an ETF
// versus a CD versus cash versus options versus currency versus commodity versus a mutual fund?"
// Answering it properly turned up something the inventory had not recorded: there is not ONE
// classifier. There are three, they use different rules, and they disagree.
//
//   1. classifyHolding()  — a line in a FILE you upload (CSV)
//   2. mapPosition()      — a position from a CONNECTED broker (SnapTrade)
//   3. assetClassOf()     — a whole ACCOUNT, when nothing inside it is itemised
//
// This probe runs the same real-world holdings through the file path and the broker path and pins
// where they part company. Nothing here is opinion; every line is executed.
import { classifyHolding } from '../../src/domain/import/holdingsImport';
import { mapPosition } from '../../src/services/sync/snaptrade';
import { assetClassOf } from '../../src/domain/assets';

// a SnapTrade position, shaped as the real payload arrives
const st = (raw: string, description = '', code = 'cs') =>
  mapPosition({ units: 100, price: 10, symbol: { symbol: { raw_symbol: raw, symbol: raw, description, type: { code } } } } as any)!.assetClass;

describe('THE SAME HOLDING, THREE DOORS', () => {
  test('they AGREE on the ordinary cases — shares, funds, CDs, crypto', () => {
    for (const [sym, desc, expected] of [
      ['VTI', 'VANGUARD TOTAL STOCK MARKET ETF', 'stocks_etf'],
      ['VMFXX', 'VANGUARD FEDERAL MONEY MARKET FUND', 'stocks_etf'],
      ['06418AAA1', 'KEYBANK NA 4.00% CD 08/24/26', 'bonds'],
      ['SGOV', 'ISHARES 0-3 MONTH TREASURY BOND ETF', 'bonds'],
    ] as const) {
      expect(classifyHolding(sym, desc)).toBe(expected);
      expect(st(sym, desc)).toBe(expected);
    }
  });

  test('DEFECT — a COMMODITY fund: alternatives from a file, equities from the broker', () => {
    expect(classifyHolding('GLD', 'SPDR GOLD SHARES')).toBe('alternatives');
    expect(st('GLD', 'SPDR GOLD SHARES')).toBe('stocks_etf');          // ← the same holding, a different answer
    expect(classifyHolding('SLV', 'ISHARES SILVER TRUST')).toBe('alternatives');
    expect(st('SLV', 'ISHARES SILVER TRUST')).toBe('stocks_etf');
  });

  test('DEFECT — a CRYPTO fund: the broker path knows only its own type code', () => {
    // IBIT is a spot-bitcoin ETF. The file path knows the ticker and the word; the broker path
    // classifies on `type.code`, and a crypto ETF arrives with the ordinary equity code 'cs'.
    expect(classifyHolding('IBIT', 'ISHARES BITCOIN TRUST')).toBe('alternatives');
    expect(st('IBIT', 'ISHARES BITCOIN TRUST')).toBe('stocks_etf');
    expect(st('BTC', 'BITCOIN', 'crypto')).toBe('alternatives');       // only when the broker SAYS crypto
  });

  test('DEFECT — an OPTION written into a positions row is read as a share', () => {
    // Options normally arrive on their own endpoint and are mapped to alternatives there. A broker
    // that puts one in the ordinary positions list has it classified as equities.
    expect(classifyHolding('AAPL250117C00220000', '')).toBe('alternatives');
    expect(st('AAPL250117C00220000', 'AAPL JAN 17 25 CALL 220')).toBe('stocks_etf');
  });

  // CORRECTED BY THE PROBE, and the correction is worse news than what I first wrote.
  // I expected the file path to catch a currency fund. It does not, unless the word "currency"
  // stands alone. Brokers shorten the name, and "CURRENCYSHARES" is one word — so the rule misses.
  test('DEFECT — a CURRENCY fund is missed by BOTH paths when the broker shortens the name', () => {
    expect(classifyHolding('FXE', 'INVESCO CURRENCYSHARES EURO TRUST')).toBe('stocks_etf');   // ← missed
    expect(st('FXE', 'INVESCO CURRENCYSHARES EURO TRUST')).toBe('stocks_etf');                // ← missed
    // only the full legal name, where "Currency" stands alone, matches:
    expect(classifyHolding('FXE', 'Invesco CurrencyShares Euro Currency Trust')).toBe('alternatives');
    // and there is no currency ticker list at all, unlike crypto and commodities:
    expect(classifyHolding('FXY', 'INVESCO CURRENCYSHARES JAPANESE YEN')).toBe('stocks_etf');
  });

  test('the file path protects a MINING STOCK from the commodity rule; the point is it HAS the rule', () => {
    expect(classifyHolding('GOLD', 'BARRICK GOLD CORP')).toBe('stocks_etf');   // a company, not bullion
    expect(classifyHolding('', 'SPDR GOLD MINISHARES')).toBe('alternatives');
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHICH COLUMN CARRIES THE NAME — institutions do not agree, so the importer matches on PATTERNS
// ════════════════════════════════════════════════════════════════════════════════════════════════
import { importHoldings } from '../../src/domain/import/holdingsImport';

describe('FILE_COLUMN_DETECTION', () => {
  test('the name column is found whatever the institution calls it', () => {
    const headers = ['Description', 'Security', 'Investment Name', 'Fund', 'Holding', 'Instrument'];
    for (const h of headers) {
      const csv = `Symbol,${h},Quantity,Value\nGLD,SPDR GOLD SHARES,10,2000`;
      const r = importHoldings(csv);
      expect(r.mapped.name).toBe(h);                         // it reports WHICH header it used
      expect(r.holdings[0].assetClass).toBe('alternatives');  // and the name drove the class
    }
  });

  test('with NO name column the class falls back to the ticker alone', () => {
    const r = importHoldings('Symbol,Quantity,Value\nGLD,10,2000');
    expect(r.mapped.name).toBeUndefined();
    expect(r.holdings[0].assetClass).toBe('alternatives');    // GLD is a known commodity ticker
    // …but an unknown commodity fund with no name column has nothing left to match on:
    expect(importHoldings('Symbol,Quantity,Value\nAAAU,10,2000').holdings[0].assetClass).toBe('stocks_etf');
  });

  test('a brokerage preamble is skipped — the header is the first row with BOTH a symbol and a quantity', () => {
    const csv = 'Account Summary,,\nAs of 08/15/2026,,\n\nSymbol,Description,Quantity,Value\nVTI,VANGUARD TOTAL STOCK,10,2000';
    expect(importHoldings(csv).holdings).toHaveLength(1);
  });

  test('TOTAL and SUBTOTAL rows are skipped, so a file total is never imported as a holding', () => {
    const csv = 'Symbol,Description,Quantity,Value\nVTI,VANGUARD,10,2000\nTOTAL,,,2000';
    const r = importHoldings(csv);
    expect(r.holdings).toHaveLength(1);
    expect(r.skipped).toBe(1);
  });
});
