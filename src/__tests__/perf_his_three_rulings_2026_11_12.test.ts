/** HIS THREE RULINGS OF 2026-11-12, on his own E*TRADE file (MoneyKeel/documents/feedback/Build55-nov4-26-jj.csv), 1 year to
 *  Nov 10, 2026 — the case the Performance tab showed as $3,343 and +2.12%. Every expected figure is worked by hand on its own line.
 *
 *  DEC-10982 "return on investment is always ending value - begining value divided by begining value."
 *  DEC-10983 "The file imported has no interest value. It has coupon rate as part of the name."
 *  DEC-10984 "import file as-is. Yes, if you are showing gains as of June 21 - that should be the number."
 *
 *  The one input not in his file: LCTX's close a year ago, $1.983 (from the phone's price feed, as the phase 4 analysis solved it).
 *    LCTX     965 × ($1.21 − $1.983)                       = −$745.945
 *    CD       no price history, no interest in the file      = $0        (was $3,230: 288 days at 3.85%)
 *    put, money market, cash: no change                      = $0
 *    Wealth generated                                         = −$745.945   (was $2,484)
 *    Ending   (his file's Net Account Value)                  = $169,664.71
 *    Beginning = 169,664.71 + 745.945                         = $170,410.655
 *    Return = (169,664.71 − 170,410.655) ÷ 170,410.655        = −0.4377%  → −0.44%
 */
import { importHoldings, importedAccountOf } from '../domain/import/holdingsImport';
import { buildPerformance, statedCdRate } from '../domain/performance';
import { thePerformance, windowStartKey, endOverBeginning, returnBySum } from '../../MoneyKeel/functions/networth-and-performance/performance';
import { walkShown, writeFigure } from '../../MoneyKeel/functions/_figure-spec';
import { figureSpec } from '../../MoneyKeel/functions/figures';

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

const T = '2026-11-10';
const LCTX = { ticker: 'LCTX', points: [{ date: '2025-11-07', close: 1.983 }, { date: '2026-11-09', close: 1.21 }] };
const priceOf = (tk: string) => (tk === 'LCTX' ? LCTX : null);

function hisYear() {
  const acct: any = { ...importedAccountOf(importHoldings(HIS_FILE), { institution: 'E*TRADE', name: '' }), asset_id: 'etrade' };
  const rows = buildPerformance(acct.positions, priceOf as any, '1Y', new Date(`${T}T12:00:00`), () => null, undefined, { transactions: [], accounts: [acct] });
  const f = thePerformance({ windowStart: windowStartKey('1Y', [], T), windowLabel: '1 year', today: T, holdings: rows as any, priceOf: priceOf as any,
    transactions: [], snapshotDays: [], investmentAccountIds: new Set(['etrade']), accounts: [acct] });
  return { acct, rows: rows as any[], f };
}

describe('DEC-10983 · a rate in an imported holding\'s name is not interest', () => {
  test('the import marks the CD\'s rate as read from the file; statedCdRate gives none for it', () => {
    const { acct } = hisYear();
    const cd = acct.positions.find((p: any) => /^KEY BANK/.test(p.ticker));
    expect([cd.coupon_rate, cd.rate_from_file]).toEqual([0.0385, true]);
    expect(statedCdRate(cd)).toBeNull();
    // a holding saved before the mark existed, inside an account the file made: none either
    const { rate_from_file: _, ...old } = cd;
    expect(statedCdRate(old as any, [{ ...acct, positions: [old] }])).toBeNull();
    // a rate the account holder typed on a CD in an account of their own still counts (R4, DEC-3656)
    expect(statedCdRate(old as any, [{ ...acct, source: 'manual', positions: [old] }])).toBe(0.0385);
  });

  test('his CD earns $0 over the year: no interest line, no gain from the rate', () => {
    const { rows, f } = hisYear();
    const cd = rows.find((r) => /^KEY BANK/.test(r.position.ticker));
    expect(cd.periodTotal).toBeNull();                                   // no price history, no interest on record
    expect(f.walk!.interest).toBe(0);
    // CD $109,992.74 + put $1,407.50 + money market $50,000 = $161,400.24, written $161,400
    expect(f.notIncluded).toBe("KEY BANK CD CLEVELAND OH CD 3.85% 08/24/2026, QQQ DEC 31 '26 $600 PUT and VMFXX ($161,400) have no price history, so their gains are not included.");
  });
});

describe('DEC-10982 · Return = (ending − beginning) ÷ beginning, on the values printed', () => {
  test('his file: wealth generated −$746, beginning $170,411, ending $169,665, Return −0.44%', () => {
    const { f } = hisYear();
    expect(f.walk!.wealthGenerated).toBeCloseTo(965 * (1.21 - 1.983), 6);         // −$745.945 (was $2,484)
    expect(f.walk!.ending).toBeCloseTo(169664.71, 6);
    expect(f.walk!.beginning).toBeCloseTo(169664.71 + 745.945, 6);                // $170,410.655
    expect(f.cumulative).toBeCloseTo((169664.71 - 170410.655) / 170410.655, 12);  // −0.4377%
    expect(writeFigure(figureSpec('MK-PF-M-017')!, f.cumulative!)).toBe('−0.44%');
    const shown = walkShown(f.walk!);
    expect([shown.beginning, shown.ending, shown.wealthGenerated]).toEqual([170411, 169665, -746]);
  });

  test('the sum the summary prints beside the Return', () => {
    const { f } = hisYear();
    const w = (id: string) => (v: number) => writeFigure(figureSpec(id)!, v);
    expect(returnBySum(walkShown(f.walk!), f.cumulative, w('MK-PF-M-018'), w('MK-PF-M-001'), w('MK-PF-M-017')))
      .toBe('Return = (ending $169,665 − beginning $170,411) ÷ beginning $170,411 = −0.44%.');
  });

  test('the sentence under it no longer says the Return is on the dollars with a price history', () => {
    const { f } = hisYear();
    expect(f.notIncluded.startsWith('Return is on the')).toBe(false);
  });

  test('money put in or taken out keeps the time-weighted Return; a refusal stays a refusal', () => {
    const base = { beginning: 1000, ending: 1200, contributions: 0, withdrawals: 0 };
    expect(endOverBeginning(base, 0.5)).toBeCloseTo(0.2, 12);                     // (1,200 − 1,000) ÷ 1,000
    expect(endOverBeginning({ ...base, contributions: 100 }, 0.09)).toBe(0.09);
    expect(endOverBeginning({ ...base, withdrawals: 100 }, 0.11)).toBe(0.11);
    expect(endOverBeginning(base, null)).toBeNull();
    expect(endOverBeginning({ ...base, beginning: 0 }, 0.3)).toBe(0.3);
    expect(returnBySum({ ...base, contributions: 100 }, 0.09, String, String, String)).toBeNull();
  });
});

describe('DEC-10984 · the file\'s own total gain, as the file states it', () => {
  test('read from the account row and saved with the file\'s date: −$4,146.87, Jun 21, 2026', () => {
    const r = importHoldings(HIS_FILE);
    expect(r.account?.statedGain).toBe(-4146.87);
    const { acct } = hisYear();
    expect(acct.stated_gain).toEqual({ amount: -4146.87, as_of: '2026-06-21' });
    expect(writeFigure(figureSpec('MK-NW-M-075')!, acct.stated_gain.amount)).toBe('−$4,146.87');
  });

  test('a file with no Total Gain $ saves none', () => {
    const plain = 'Symbol,Quantity,Price Paid $,Value $\nVTI,10,200,2500';
    const acct: any = importedAccountOf(importHoldings(plain), { institution: 'X', name: '' });
    expect(acct.stated_gain).toBeUndefined();
  });
});
