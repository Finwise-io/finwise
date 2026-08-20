// THE ACCEPTANCE TEST — a real Vanguard activity FILE, through the NEW engines.
//
// WHAT THIS PROVES, AND WHAT IT DOES NOT. Founder correction 2026-08-18: the sample files show how
// an institution WORDS things; they are not what its API returns. So this test proves the engines
// handle Vanguard's VOCABULARY correctly — 'Sweep out', 'Corp Action (Redemption)', 'Reinvestment'
// — and that the totals come out right when they do.
//
// It does NOT prove what the SnapTrade connection sends for the same account. If the connection uses
// different words, they would fall through to UNKNOWN — which is the safe failure, counted in no
// total, and visible on screen. That is the whole point of the unknown rule: being wrong about the
// vocabulary costs a visible gap, never an invented number.
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
import { readMoney, sumSigned } from '../money';
import { Dec } from '../decimal';

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

  // EXACT now — Track 0. The totals are decimals; equality is asserted on strings, no tolerance.
  const total = (t: 'contributions' | 'withdrawals' | 'income' | 'costs') =>
    sumSigned(rows.filter((r) => touches(r.event, t)).map((r) => r.money));

  test('EVERY word in the file is recognised — nothing falls through to a guess', () => {
    const unknown = rows.filter((r) => !r.recognised).map((r) => r.word);
    expect(unknown).toEqual([]);
  });

  test('CONTRIBUTIONS ARE ZERO, as the statement says', () => {
    expect(total('contributions').isZero()).toBe(true);       // was $1,064,493.33 — now EXACTLY zero
  });

  test('WITHDRAWALS ARE ZERO, as the statement says', () => {
    expect(total('withdrawals').isZero()).toBe(true);         // was $424,818.32 — now EXACTLY zero
  });

  test('income is counted ONCE — reinvestment does not double it', () => {
    const dividends = sumSigned(rows.filter((r) => r.event === 'DIVIDEND').map((r) => r.money));
    const reinvestLegs = rows.filter((r) => r.event === 'REINVEST_PURCHASE');
    expect(reinvestLegs.length).toBeGreaterThan(0);                 // the file HAS them
    for (const leg of reinvestLegs) expect(touches(leg.event, 'income')).toBe(false);
    // the dividends equal the file's own "Dividend Received" rows, and nothing more
    const fromFile = Dec.sum(rows.filter((r) => /^Dividend$/i.test(r.word)).map((r) => r.money.amount));
    expect(dividends.eq(fromFile)).toBe(true);       // EXACT equality — the whole point of Track 0
  });

  test('fees are a cost with their own line, and they REDUCE rather than add', () => {
    const fees = total('costs');
    expect(fees.isNeg()).toBe(true);              // signed: money out
    expect(rows.some((r) => r.event === 'FEE')).toBe(true);
  });

  test('the sweeps and the maturity are internal — the entire phantom $1m', () => {
    const internal = rows.filter((r) => ['SWEEP', 'RETURN_OF_CAPITAL'].includes(r.event));
    expect(internal.length).toBeGreaterThan(4);
    const wouldHaveBeen = Dec.sum(internal.map((r) => r.money.amount));
    expect(wouldHaveBeen.cmp(Dec.of('1000000'))).toBe(1);   // what the old code booked as new money
    for (const r of internal) {
      expect(touches(r.event, 'contributions')).toBe(false);
      expect(touches(r.event, 'withdrawals')).toBe(false);
    }
  });
});
