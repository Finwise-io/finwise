// The classifier, proved against every holding in the founder's own Fidelity and Vanguard files.
import { classifyHolding, looksFixedIncome } from '../classify';

const c = (ticker: string, name = '', extra: any = {}) =>
  classifyHolding({ ticker, name, ...extra }).assetClass;

describe("FIDELITY — every row in the founder's real file", () => {
  test('the core cash position, asterisks and all', () => {
    // "SPAXX**" — the asterisks are a footnote marker, not part of the ticker
    expect(c('SPAXX**', 'HELD IN MONEY MARKET')).toBe('stocks_funds');
    expect(c('FDRXX**', 'HELD IN MONEY MARKET')).toBe('stocks_funds');
    // CORE** is the FDIC sweep — genuinely cash, unlike the money-market funds above
    expect(c('CORE**', 'FDIC-INSURED DEPOSIT SWEEP')).toBe('cash');
  });

  test('options, written the way Fidelity writes them — a leading dash and a space', () => {
    expect(c(' -DIA261231P470', 'DIA DEC 31 2026 $470 PUT')).toBe('alternatives');
    expect(c(' -WEN260821C8', 'WEN AUG 21 2026 $8 CALL')).toBe('alternatives');
  });

  test('A CURRENCY HELD DIRECTLY — missed by BOTH old classifiers', () => {
    expect(c('CHF', 'SWISS FRANC')).toBe('alternatives');
  });

  test('a commodity fund — was Alternatives from a file, ordinary shares from the broker', () => {
    expect(c('SLV', 'ISHARES SILVER TR ISHARES')).toBe('alternatives');
  });

  test('Treasuries and CDs by CUSIP, identified only by the words', () => {
    expect(c('912810TQ1', 'UNITED STATES TREAS SER BONDS OF FEBRUAR 3.87500% 02/15/2043 BDS')).toBe('bonds');
    expect(c('49306SX43', 'KEYBANK NATIONAL ASSOCIATION CD 3.85000% 08/24/2026')).toBe('bonds');
    expect(c('912797UG0', 'UNITED STATES TREAS BILLS 0.00000% 09/17/2026 ZERO CPN')).toBe('bonds');
  });

  test('ordinary funds stay ordinary', () => {
    expect(c('BIV', 'VANGUARD BD INDEX FDS INTERMED TERM')).toBe('bonds');       // a BOND index fund
    expect(c('JPST', 'J P MORGAN EXCHANGE TRADED FD ULTRA SHRT INC')).toBe('stocks_funds');
    expect(c('02315N709', 'VANGUARD TARGET 2040')).toBe('stocks_funds');
  });
});

describe("VANGUARD — the founder's own holdings", () => {
  test('the money-market fund that started all of this', () => {
    expect(c('VMFXX', 'VANGUARD FEDERAL MONEY MARKET INVESTOR CL')).toBe('stocks_funds');
    expect(c('VMFXX', '')).toBe('stocks_funds');                       // ticker alone is enough
  });
  test('a Treasury bill with the maturity buried in the name', () => {
    expect(c('912797VW4', 'U S TREASURY BILL 0 11/10/26 07/14/26')).toBe('bonds');
  });
  test('ordinary shares', () => {
    expect(c('SNDL', 'SNDL INC')).toBe('stocks_funds');
    expect(c('DIDIY', 'DIDI GLOBAL INC SPON ADS')).toBe('stocks_funds');
  });
});

describe('ONE ANSWER WHICHEVER DOOR IT CAME THROUGH — the defect this replaces', () => {
  const doors = (t: string, n: string) => [
    c(t, n),                                            // uploaded file: ticker and name
    c(t, n, { institutionType: 'cs' }),                 // broker: ordinary equity type code
    c(t, n, { institutionType: 'et' }),                 // broker: ETF type code
  ];

  test('a gold fund is Alternatives on every road', () => {
    expect(new Set(doors('GLD', 'SPDR GOLD SHARES')).size).toBe(1);
    expect(doors('GLD', 'SPDR GOLD SHARES')[0]).toBe('alternatives');
  });

  test('a spot-bitcoin fund is Alternatives on every road', () => {
    expect(new Set(doors('IBIT', 'ISHARES BITCOIN TRUST')).size).toBe(1);
  });

  test('an option is Alternatives on every road', () => {
    expect(new Set(doors('AAPL250117C00220000', 'AAPL JAN 17 25 CALL 220')).size).toBe(1);
  });

  test('a CD is Bonds & CDs even when the broker calls it an ordinary share', () => {
    // Vanguard sends brokered CDs with an equity type code — the words win
    expect(c('06418AAA1', 'KEYBANK NA 4.00% CD 08/24/26', { institutionType: 'cs' })).toBe('bonds');
  });
});

describe('THE RULES THAT PROTECT AGAINST OVER-EAGER MATCHING', () => {
  test('a mining company is a share, not bullion', () => {
    expect(c('GOLD', 'BARRICK GOLD CORP')).toBe('stocks_funds');
    expect(c('AG', 'FIRST MAJESTIC SILVER CORP')).toBe('stocks_funds');
  });
  test('a CUSIP is an identifier, not a clue — and it is never sent to a price feed', () => {
    // I first wrote this rule as "a CUSIP almost always means fixed income". The founder's own
    // Fidelity file disproved it in one row: 02315N709 is VANGUARD TARGET 2040, a target-date fund.
    const r = classifyHolding({ ticker: '38259P508', name: '' });
    expect(r.assetClass).toBe('unclassified');
    expect(r.confident).toBe(false);
    // with the NAME, the same identifier resolves properly, either way
    expect(c('02315N709', 'VANGUARD TARGET 2040')).toBe('stocks_funds');
    expect(c('49306SX43', 'KEYBANK NATIONAL ASSOCIATION CD 3.85000% 08/24/2026')).toBe('bonds');
  });
  test('the person\'s own answer beats everything', () => {
    expect(c('GLD', 'SPDR GOLD SHARES', { stated: 'cash' })).toBe('cash');
  });
  test('nothing to go on is UNCLASSIFIED, never "probably shares"', () => {
    const r = classifyHolding({});
    expect(r.assetClass).toBe('unclassified');
    expect(r.confident).toBe(false);
  });
});

describe('EVERY ANSWER SAYS WHY — so a wrong one can be traced to its rule', () => {
  test('the reason is a sentence a person could read', () => {
    expect(classifyHolding({ ticker: 'SPAXX**' }).because).toMatch(/money-market/);
    expect(classifyHolding({ ticker: 'CHF', name: 'SWISS FRANC' }).because).toMatch(/currency/);
    expect(classifyHolding({ ticker: '49306SX43', name: 'KEYBANK CD 3.85% 08/24/2026' }).because)
      .toMatch(/bond, CD or Treasury/);
  });
});

describe('FIXED INCOME BY ITS WORDS — where a CD\'s identity actually lives', () => {
  test('the shapes institutions really write', () => {
    for (const t of [
      'KEYBANK NA 4.00% CD 08/24/26',
      'UNITED STATES TREAS SER BONDS OF FEBRUAR 3.87500% 02/15/2043 BDS',
      'U S TREASURY BILL 0 11/10/26 07/14/26',
      'UNITED STATES TREAS NOTE CPN 1.62500 MTD 2026-02-15',
      'APPLE INC 3.85% DUE 2043',
    ]) expect(looksFixedIncome(t)).toBe(true);
  });
  test('and what it must NOT catch', () => {
    for (const t of ['VANGUARD TOTAL STOCK MARKET ETF', 'APPLE INC', 'SPDR GOLD SHARES']) {
      expect(looksFixedIncome(t)).toBe(false);
    }
  });
});
