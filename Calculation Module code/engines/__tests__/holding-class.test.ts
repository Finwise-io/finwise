// THE ONE CLASSIFIER — B7 (founder brief 2026-08-20): the person's answer above everything, and money never moves
// class quietly. ITS ORDER IS HIS RULING OF 2026-10-20, "always the class broker sends" (settling DEC-2159 against
// B7's name-first order): the class the broker sends decides; the name and the rest only when it sends none.
import { classifyHoldingClass, nameEvidence, brokerClassOf, BROKER_TYPE_CLASS } from '../holding-class';

describe('name first — the defect B7 names cannot recur', () => {
  test('DEC-2159 / his 2026-10-20 words: a money-market fund the broker flags cash-equivalent is Cash, whatever its name says', () => {
    // the real Vanguard position B7 was written about. Under B7 its name made it a fund (Stocks / Funds); his newer
    // ruling makes the broker's flag — the broker saying "this is cash" — decide.
    const v = classifyHoldingClass({
      name: 'VANGUARD FEDERAL MONEY MARKET INVESTOR CL', ticker: 'VMFXX',
      brokerTag: '', cashEquivalent: true, hasSecurityIdentity: true,
    });
    expect(v.cls).toBe('cash');
    expect(v.source).toBe('broker');
  });

  test('DEC-2159 / his 2026-10-20 words: a money-market fund the broker sends as a fund, NOT flagged, is Stocks / Funds (E*TRADE, live 2026-07-19)', () => {
    const v = classifyHoldingClass({ name: 'VANGUARD FEDERAL MONEY MARKET FUND', ticker: 'VMFXX', brokerTag: 'oef', cashEquivalent: false, hasSecurityIdentity: true });
    expect([v.cls, v.source]).toEqual(['stocks_etf', 'broker']);
  });

  test('a position LABELLED money market with NOTHING from the broker is still a fund by its name (B7, kept where the broker is silent)', () => {
    const v = classifyHoldingClass({ name: 'VANGUARD FEDERAL MONEY MARKET INVESTOR CL', ticker: 'VMFXX', hasSecurityIdentity: true });
    expect([v.cls, v.source]).toEqual(['stocks_etf', 'name']);
  });

  test('a bare money-market ticker classes the same as its name — the founder\'s gap #2', () => {
    expect(nameEvidence('SPAXX')).toBe('stocks_etf');
    expect(nameEvidence('VMFXX')).toBe('stocks_etf');
  });

  test('sweep and settlement balances ARE cash', () => {
    expect(nameEvidence('Sweep account')).toBe('cash');
    expect(nameEvidence('Settlement fund')).toBe('cash');
  });

  test('the founder\'s real fixed-income shapes land in Bonds & CDs (B47 finding 5 kept)', () => {
    expect(nameEvidence('U S TREASURY BILL 0 11/10/26 07/14/26')).toBe('bonds');
    expect(nameEvidence('CERTIFICATE OF DEPOSIT 4.5% DUE 2027')).toBe('bonds');
    expect(classifyHoldingClass({ name: 'JPMORGAN CHASE 1.625% DUE 2026', hasSecurityIdentity: true }).cls).toBe('bonds');
  });

  test('options, crypto and commodities are alternatives; a mining COMPANY stays a stock', () => {
    expect(nameEvidence('AAPL250117C00220000')).toBe('alternatives');   // OCC option symbol
    expect(nameEvidence('AAPL 01/17/2026 220 C')).toBe('alternatives'); // date-style option
    expect(nameEvidence('GBTC')).toBe('alternatives');
    expect(nameEvidence('GLD')).toBe('alternatives');
    expect(nameEvidence('Barrick Gold Corp')).toBeNull();               // company words guard it
  });
});

describe('the fallback ladder', () => {
  test('DEC-2159 / his 2026-10-20 words: the broker\'s type decides before the name (was: only when the name said nothing)', () => {
    expect(classifyHoldingClass({ name: 'APPLE INC', brokerTag: 'cs', hasSecurityIdentity: true }).source).toBe('broker');
    expect(classifyHoldingClass({ name: 'SOME FUND', brokerTag: 'bnd', hasSecurityIdentity: true }).cls).toBe('bonds');
  });

  test('DEC-2159 / his 2026-10-20 words: the broker\'s type decides before a maturity date (was: the maturity date made it a bond before any tag)', () => {
    expect(classifyHoldingClass({ name: 'Brokered product', maturityDate: '2027-03-01', brokerTag: 'cs', hasSecurityIdentity: true }).cls).toBe('stocks_etf');
    // with nothing from the broker, the maturity date still makes it a bond
    expect(classifyHoldingClass({ name: 'Brokered product', maturityDate: '2027-03-01', hasSecurityIdentity: true }).cls).toBe('bonds');
  });

  test('an unlabelled broker BALANCE is cash; an unlabelled priced SECURITY is an investment', () => {
    expect(classifyHoldingClass({}).cls).toBe('cash');
    expect(classifyHoldingClass({ ticker: 'ZZZZ', hasSecurityIdentity: true }).cls).toBe('stocks_etf');
  });
});

describe('the person\'s answer, and the quiet-move guard', () => {
  test('their own answer outranks every rule and raises no flag', () => {
    const v = classifyHoldingClass({
      name: 'VANGUARD FEDERAL MONEY MARKET INVESTOR CL', userAnswer: 'cash',
      previousClass: 'cash', hasSecurityIdentity: true,
    });
    expect(v.cls).toBe('cash');
    expect(v.source).toBe('user');
    expect(v.flagged).toBeUndefined();
  });

  test('a class change between syncs keeps the previous class and FLAGS it', () => {
    const v = classifyHoldingClass({
      name: 'SOMETHING RENAMED TO A TREASURY NOTE', previousClass: 'stocks_etf', hasSecurityIdentity: true,
    });
    expect(v.cls).toBe('stocks_etf');                       // the money did not move
    expect(v.flagged).toEqual({ was: 'stocks_etf', evidenceSays: 'bonds' });
  });

  test('agreement between syncs raises no flag', () => {
    const v = classifyHoldingClass({ name: 'APPLE INC', brokerTag: 'cs', previousClass: 'stocks_etf', hasSecurityIdentity: true });
    expect(v.flagged).toBeUndefined();
  });
});
