// PROBE — the SAME holding, arriving three different ways.
//
// The founder's question was: "how do you determine from an imported file which line is an ETF
// versus a CD versus cash versus options versus currency versus commodity versus a mutual fund?"
// Answering it properly turned up something the inventory had not recorded: there is not ONE
// classifier. There are three, they use different rules, and they disagree.
//
//   1. assetClassForSymbol()  — a line in a FILE you upload (CSV)
//   2. mapPosition()      — a position from a CONNECTED broker (SnapTrade)
//   3. assetClassOf()     — a whole ACCOUNT, when nothing inside it is itemised
//
// This probe runs the same real-world holdings through the file path and the broker path and pins
// where they part company. Nothing here is opinion; every line is executed.
import { assetClassForSymbol } from '../../src/domain/import/holdingsImport';
import { mapPosition } from '../../src/services/sync/snaptrade';
import { assetClassOf } from '../../src/domain/assets';

// a SnapTrade position, shaped as the real payload arrives
const st = (raw: string, description = '', code = 'cs') =>
  mapPosition({ units: 100, price: 10, symbol: { symbol: { raw_symbol: raw, symbol: raw, description, type: { code } } } } as any)!.assetClass;

describe('THE SAME HOLDING, THREE DOORS', () => {
  // DEC-2159 / his 2026-10-20 words, "always the class broker sends": each door is handed the type the broker sends
  // (SnapTrade's code; a file's type column), and that type decides. With none sent, the name decides on both.
  test('they AGREE on the ordinary cases — shares, funds, CDs, a T-bill ETF (DEC-2159 / his 2026-10-20 words: the same broker type, the same class, on both doors)', () => {
    for (const [sym, desc, code, fileType, expected] of [
      ['VTI', 'VANGUARD TOTAL STOCK MARKET ETF', 'et', 'ETFs & Closed End Funds', 'stocks_etf'],
      ['VMFXX', 'VANGUARD FEDERAL MONEY MARKET FUND', 'oef', 'Mutual Funds', 'stocks_etf'],
      ['06418AAA1', 'KEYBANK NA 4.00% CD 08/24/26', '', '', 'bonds'],                                   // live CDs arrive with no type
      ['SGOV', 'ISHARES 0-3 MONTH TREASURY BOND ETF', 'et', 'ETFs & Closed End Funds', 'stocks_etf'],  // was bonds by its name
      ['SGOV', 'ISHARES 0-3 MONTH TREASURY BOND ETF', '', '', 'bonds'],                                 // no type sent: the name decides
    ] as const) {
      expect(assetClassForSymbol(sym, desc, fileType || null)).toBe(expected);
      expect(st(sym, desc, code)).toBe(expected);
    }
  });

  // The three DEFECT pins below documented the doors DISAGREEING. B7 (founder brief 2026-08-20)
  // built the ONE classifier both doors now call, so they pin AGREEMENT instead — same holdings,
  // same answers, whichever way the data arrives.
  test('FIXED BY B7 — a COMMODITY fund is alternatives through BOTH doors when the broker sends no type; DEC-2159 / his 2026-10-20 words: sent as an ETF it is Stocks / Funds through both', () => {
    expect(assetClassForSymbol('GLD', 'SPDR GOLD SHARES')).toBe('alternatives');
    expect(st('GLD', 'SPDR GOLD SHARES', '')).toBe('alternatives');
    expect(assetClassForSymbol('SLV', 'ISHARES SILVER TRUST')).toBe('alternatives');
    expect(st('SLV', 'ISHARES SILVER TRUST', '')).toBe('alternatives');
    expect(st('GLD', 'SPDR GOLD SHARES', 'et')).toBe('stocks_etf');                                     // was alternatives (DEC-2162)
    expect(assetClassForSymbol('GLD', 'SPDR GOLD SHARES', 'ETFs & Closed End Funds')).toBe('stocks_etf');
  });

  test('DEC-2159 / his 2026-10-20 words — a CRYPTO fund the broker sends as an equity or an ETF is Stocks / Funds (was: alternatives, the name outranked the tag); sent as crypto, or with no type, it is alternatives', () => {
    expect(assetClassForSymbol('IBIT', 'ISHARES BITCOIN TRUST')).toBe('alternatives');
    expect(st('IBIT', 'ISHARES BITCOIN TRUST', '')).toBe('alternatives');
    expect(st('IBIT', 'ISHARES BITCOIN TRUST', 'cs')).toBe('stocks_etf');
    expect(st('IBIT', 'ISHARES BITCOIN TRUST', 'et')).toBe('stocks_etf');
    expect(st('BTC', 'BITCOIN', 'crypto')).toBe('alternatives');
  });

  test('FIXED BY B7 — an OPTION in a positions row with no type sent is alternatives through BOTH doors (DEC-2159 / his 2026-10-20 words: a type the broker sends would decide)', () => {
    expect(assetClassForSymbol('AAPL250117C00220000', '')).toBe('alternatives');
    expect(st('AAPL250117C00220000', 'AAPL JAN 17 25 CALL 220', '')).toBe('alternatives');
    expect(assetClassForSymbol('AAPL250117C00220000', '', 'Option')).toBe('alternatives');
  });

  test('FIXED BY B7 — the CURRENCYSHARES gap is closed where the broker sends no type; DEC-2159 / his 2026-10-20 words: sent as an ETF it is Stocks / Funds', () => {
    expect(assetClassForSymbol('FXE', 'INVESCO CURRENCYSHARES EURO TRUST')).toBe('alternatives');
    expect(st('FXE', 'INVESCO CURRENCYSHARES EURO TRUST', '')).toBe('alternatives');
    expect(assetClassForSymbol('FXY', 'INVESCO CURRENCYSHARES JAPANESE YEN')).toBe('alternatives');
    expect(st('FXE', 'INVESCO CURRENCYSHARES EURO TRUST', 'et')).toBe('stocks_etf');                   // was alternatives
  });

  test('the file path protects a MINING STOCK from the commodity rule; the point is it HAS the rule', () => {
    expect(assetClassForSymbol('GOLD', 'BARRICK GOLD CORP')).toBe('stocks_etf');   // a company, not bullion
    expect(assetClassForSymbol('', 'SPDR GOLD MINISHARES')).toBe('alternatives');
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
