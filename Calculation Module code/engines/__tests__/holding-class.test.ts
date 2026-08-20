// THE ONE CLASSIFIER — B7 (founder brief 2026-08-20): name first, broker tag as fallback only,
// fund only on evidence, the person's answer above everything, and money never moves class quietly.
import { classifyHoldingClass, nameEvidence } from '../holding-class';

describe('name first — the defect B7 names cannot recur', () => {
  test('a position LABELLED money market is a fund, whatever the broker tag says', () => {
    // the real Vanguard position that was counted as cash — the tag path overrode the name
    const v = classifyHoldingClass({
      name: 'VANGUARD FEDERAL MONEY MARKET INVESTOR CL', ticker: 'VMFXX',
      brokerTag: '', cashEquivalent: true, hasSecurityIdentity: true,
    });
    expect(v.cls).toBe('stocks_etf');
    expect(v.source).toBe('name');
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
  test('broker tag decides only when the name says nothing', () => {
    expect(classifyHoldingClass({ name: 'APPLE INC', brokerTag: 'cs', hasSecurityIdentity: true }).source).toBe('broker-tag');
    expect(classifyHoldingClass({ name: 'SOME FUND', brokerTag: 'bnd', hasSecurityIdentity: true }).cls).toBe('bonds');
  });

  test('a maturity date makes it a bond before any tag is consulted', () => {
    expect(classifyHoldingClass({ name: 'Brokered product', maturityDate: '2027-03-01', brokerTag: 'cs', hasSecurityIdentity: true }).cls).toBe('bonds');
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
