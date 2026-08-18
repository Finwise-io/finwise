// THE ACCEPTANCE TEST — the founder's real Vanguard file, through the NEW engines.
//
// The old code produced $1,064,493 of contributions and $424,818 of withdrawals on an account where
// nothing came in or out, and reported the leftover as a $661,063 "change in investment value".
// This runs the same file through events.ts + money.ts and asserts the statement's own answer.
//
// The file is gitignored and no figure from it is hard-coded here; every expectation is either
// derived from the file at run time or is a structural zero.
import * as fs from 'fs';
import * as path from 'path';
import { classifyEvent, touches } from '../events';
import { readMoney, sumSigned, toNumber } from '../money';

const FILE = path.join(__dirname, '../../../Calculation Module/real-downloads/tes-vk.csv');
const d = fs.existsSync(FILE) ? describe : describe.skip;

d('VANGUARD, through the new engines', () => {
  const lines = fs.readFileSync(FILE, 'utf8').split('\n').map((l) => l.split(','));
  const txStart = lines.findIndex((l) => l[1] === 'Trade Date');
  const rows = lines.slice(txStart + 1).filter((l) => l.length > 11 && l[3]).map((l) => {
    const c = classifyEvent(l[3]);
    return { word: l[3], event: c.event, rule: c.rule, recognised: c.recognised,
             money: readMoney(l[11], 'NEGATIVE_IS_OUT', c.rule.direction) };
  });

  const total = (t: 'contributions' | 'withdrawals' | 'income' | 'costs') =>
    Math.round(sumSigned(rows.filter((r) => touches(r.event, t)).map((r) => r.money)) * 100) / 100;

  test('EVERY word in the file is recognised — nothing falls through to a guess', () => {
    const unknown = rows.filter((r) => !r.recognised).map((r) => r.word);
    expect(unknown).toEqual([]);
  });

  test('CONTRIBUTIONS ARE ZERO, as the statement says', () => {
    expect(total('contributions')).toBe(0);       // was $1,064,493.33
  });

  test('WITHDRAWALS ARE ZERO, as the statement says', () => {
    expect(total('withdrawals')).toBe(0);         // was $424,818.32
  });

  test('income is counted ONCE — reinvestment does not double it', () => {
    const dividends = sumSigned(rows.filter((r) => r.event === 'DIVIDEND').map((r) => r.money));
    const reinvestLegs = rows.filter((r) => r.event === 'REINVEST_PURCHASE');
    expect(reinvestLegs.length).toBeGreaterThan(0);                 // the file HAS them
    for (const leg of reinvestLegs) expect(touches(leg.event, 'income')).toBe(false);
    // the dividends equal the file's own "Dividend Received" rows, and nothing more
    const fromFile = rows.filter((r) => /^Dividend$/i.test(r.word))
      .reduce((t, r) => t + (toNumber(r.money.amount) ?? 0), 0);
    expect(Math.round(dividends * 100) / 100).toBe(Math.round(fromFile * 100) / 100);
  });

  test('fees are a cost with their own line, and they REDUCE rather than add', () => {
    const fees = total('costs');
    expect(fees).toBeLessThan(0);                 // signed: money out
    expect(rows.some((r) => r.event === 'FEE')).toBe(true);
  });

  test('the sweeps and the maturity are internal — the entire phantom $1m', () => {
    const internal = rows.filter((r) => ['SWEEP', 'RETURN_OF_CAPITAL'].includes(r.event));
    expect(internal.length).toBeGreaterThan(4);
    const wouldHaveBeen = internal.reduce((t, r) => t + r.money.amount, 0);
    expect(wouldHaveBeen).toBeGreaterThan(1_000_000);   // what the old code booked as new money
    for (const r of internal) {
      expect(touches(r.event, 'contributions')).toBe(false);
      expect(touches(r.event, 'withdrawals')).toBe(false);
    }
  });
});
