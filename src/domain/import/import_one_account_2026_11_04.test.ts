/**
 * HIS BUILD 55 FEEDBACK, 2026-11-04: "The file imported is not imported accurately." His file: one E*TRADE account,
 * "Individual Brokerage -2203", worth $169,664.71 on Jun 21, 2026 — a CD, LCTX, a QQQ put, VMFXX and cash.
 * The app made four accounts out of it, dropped the CD's face value, rate and maturity, dropped what the put cost,
 * and stamped every value with the day of the import. The account page he approved (DEC-6457; DEC-7589) lists an
 * imported account's holdings inside the one account, by category, with its cash.
 */
import { importHoldings, importedAccountOf } from './holdingsImport';

// his file, byte for byte as it sits in MoneyKeel/documents/feedback/Build55-nov4-26-jj.csv
const HIS_FILE = [
  'Account Summary,,,,,,,,,', ',,,,,,,,,',
  "Account,Net Account Value,Total Gain $,Total Gain %,Day's Gain Unrealized $,Day's Gain Unrealized %,Available For Withdrawal,Cash Purchasing Power,,",
  ',,,,,,,,,', 'Individual Brokerage -2203,169664.71,-4146.87,-2.49,-34.86,-0.02,7096.82,7096.82,,',
  ',,,,,,,,,', ',,,,,,,,,', 'View Summary - All Positions,,,,,,,,,', ',,,,,,,,,', 'Filters applied: ,,,,,,,,,', ',,,,,,,,,',
  'Symbol,Security type(s),Sort by,Sort order,,,,,,', ',,,,,,,,,', ',All,Symbol,Asc,,,,,,', ',,,,,,,,,',
  "Symbol,Last Price $,Change $,Change %,Quantity,Price Paid $,Day's Gain $,Total Gain $,Total Gain %,Value $", ',,,,,,,,,',
  'KEY BANK CD CLEVELAND OH CD 3.85% 08/24/2026,99.9934,--,--,110000,100,3.74,-7.26,-0.0066,109992.74', ',,,,,,,,,',
  'LCTX,1.21,-0.04,-3.2,965,1.74,-38.6,-511.45,-30.4598,1167.65', ',,,,,,,,,',
  "QQQ Dec 31 '26 $600 Put,14.16,0,0,1,50.35,0,-3628.16,-72.0493,1407.5", ',,,,,,,,,',
  'VMFXX,1,0,0,50000,1,0,0,0,50000', ',,,,,,,,,', 'CASH,,,,,,,,,7096.82', ',,,,,,,,,',
  'TOTAL,,,,,166714.76,-34.86,-4146.87,-2.49,169664.71', ',,,,,,,,,', 'Generated at Jun 21 2026 03:37 PM ET,,,,,,,,,',
].join('\n');

const sharesOf = (p: any) => p.lots.reduce((t: number, l: any) => t + l.shares, 0);

describe('his Build 55 file (2026-11-04)', () => {
  const r = importHoldings(HIS_FILE);

  test('the file names its account, its total and its date — all three are read', () => {
    expect(r.account).toEqual({ name: 'Individual Brokerage', number: '2203', statedTotal: 169664.71 });
    expect(r.asOf).toBe('2026-06-21');
  });

  test('the CD keeps what its own line says: $110,000 face, 3.85%, matures Aug 24, 2026, priced per $100 of face', () => {
    const cd = r.holdings.find((h) => h.symbol.startsWith('KEY BANK'))!;
    expect([cd.assetClass, cd.faceValue, cd.couponRate, cd.maturityDate, cd.priceQuote]).toEqual(['bonds', 110000, 0.0385, '2026-08-24', 'per_100_of_face']);
  });

  test('the put is one contract of 100 shares', () => {
    const put = r.holdings.find((h) => /Put/.test(h.symbol))!;
    expect([put.assetClass, put.multiplier]).toEqual(['alternatives', 100]);
  });

  const acct: any = importedAccountOf(r, { institution: 'E*TRADE', name: '' });

  test('ONE account, named and numbered as the file names it, valued as of the file\'s date', () => {
    expect([acct.label, acct.mask, acct.institution, acct.kind, acct.source, acct.derive_balance]).toEqual(
      ['Individual Brokerage', '••2203', 'E*TRADE', 'brokerage', 'imported', true]);
    expect(acct.value_as_of).toBe('2026-06-21');
    expect(acct.asset_class).toBeUndefined();             // each holding sits under its own class (accountClassBreakdown)
  });

  test('its cash plus its four holdings is the file\'s own total, $169,664.71 — and it is checked against it', () => {
    expect(acct.cash_balance).toBe(7096.82);
    expect(acct.positions).toHaveLength(4);
    expect(acct.balance).toBeCloseTo(169664.71, 6);
    expect(acct.recon_break).toBeUndefined();
  });

  test('each holding carries what the file says it is worth and what was paid', () => {
    const by = (re: RegExp) => acct.positions.find((p: any) => re.test(p.ticker));
    const cd = by(/^KEY BANK/), put = by(/PUT$/), lctx = by(/^LCTX$/), mmf = by(/^VMFXX$/);
    // CD: 110,000 face at 99.9934 per $100 = $109,992.74; paid 100 per $100 = $110,000
    expect([cd.kind, cd.asset_class, cd.face_value, cd.coupon_rate, cd.maturity_date, cd.price_quote]).toEqual(
      ['fixed_income', 'bond', 110000, 0.0385, '2026-08-24', 'per_100_of_face']);
    expect(sharesOf(cd) * cd.last_price / 100).toBeCloseTo(109992.74, 6);
    expect(sharesOf(cd) * cd.lots[0].cost_per_share / 100).toBe(110000);
    // put: 1 contract × 100 × $14.075 = $1,407.50 (the file's value); paid 1 × 100 × $50.35 = $5,035
    expect([put.kind, put.asset_class, put.multiplier]).toEqual(['options', 'other', 100]);
    expect(sharesOf(put) * 100 * put.last_price).toBeCloseTo(1407.5, 6);
    expect(sharesOf(put) * 100 * put.lots[0].cost_per_share).toBeCloseTo(5035, 6);
    // LCTX 965 × $1.21 = $1,167.65, paid $1.74 a share; VMFXX 50,000 × $1 (Stocks / Funds by his rule DEC-0051)
    expect([sharesOf(lctx), lctx.lots[0].cost_per_share, sharesOf(lctx) * lctx.last_price]).toEqual([965, 1.74, 1167.65]);
    expect([sharesOf(mmf), mmf.last_price, mmf.asset_class]).toEqual([50000, 1, 'stock_etf']);
  });

  test('a total that does not add up is kept as a named difference, never smoothed over', () => {
    const off: any = importedAccountOf({ ...r, account: { ...r.account!, statedTotal: 169700 } }, { institution: 'E*TRADE', name: '' });
    expect(off.recon_break?.difference).toBe('-35.29');   // what it holds − the file's total
  });

  test('a name typed on the review screen wins over the file\'s', () => {
    expect((importedAccountOf(r, { institution: 'E*TRADE', name: 'Joint taxable' }) as any).label).toBe('Joint taxable');
  });
});
