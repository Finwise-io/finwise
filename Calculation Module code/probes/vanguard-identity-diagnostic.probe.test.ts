// TRACK 1 · STEP 1 — THE IDENTITY DIAGNOSTIC ON THE REAL VANGUARD LEDGER
// (BRIEF-decisions-and-fixes-2026-08-20.md, section F: "Prove the cause before changing anything.")
//
// The accounting identity every statement satisfies:
//
//     ending = beginning + contributions − withdrawals + income − costs + market change
//
// Vanguard's own figures for this account (the founder's statement, 2026): beginning $378,022,
// contributions $0, withdrawals $0 — nothing external ever touched the account. The app showed
// beginning −$448,028 and $1.46m in / $0.62m out across the linked accounts. A market value cannot
// be negative: beginning was never measured, it was BACK-SOLVED from today's value minus whatever
// the ledger claimed happened, so it inherited every ledger error.
//
// This probe runs the REAL file through BOTH classifiers and closes the identity:
//   · the OLD production mapper (mapActivityType — the code that produced the founder's numbers,
//     still exported from src/services/sync/snaptrade.ts) — proving each phantom dollar and the
//     exact rule that minted it;
//   · the CURRENT engine road (toLedgerRow — what ingest.ts calls today) — proving the same rows
//     close the identity to Vanguard's own statement, to the cent.
import * as fs from 'fs';
import * as path from 'path';
import { mapActivityType } from '../../src/services/sync/snaptrade';
import { toLedgerRow, totalOf, unclassified, type LedgerRow } from '../engines/ledger';
import { Dec } from '../engines/decimal';

const DIR = path.join(__dirname, '../../Calculation Module/real-downloads');
const lines = fs.readFileSync(path.join(DIR, 'tes-vk.csv'), 'utf8').split('\n').map((l) => l.split(','));

// ── the file's two blocks, exactly as Vanguard wrote them ──────────────────────────────────────
const txStart = lines.findIndex((l) => l[1] === 'Trade Date');
const holdings = lines.slice(0, txStart).filter((l) => l[5] && l[5].trim() && l[5] !== 'Total Value');
const txns = lines.slice(txStart + 1).filter((l) => l.length > 11 && l[3]);
// columns: 3 = Transaction Type · 4 = Description · 6 = Symbol · 7 = Shares · 11 = Net Amount
const BEGINNING = Dec.of(fs.readFileSync(path.join(DIR, 'tes-vk.beginning.txt'), 'utf8').trim());

describe('the statement truth, from the file alone (exact decimals)', () => {
  const ending = Dec.sum(holdings.map((l) => Dec.of(l[5])));
  const of = (type: RegExp) => Dec.sum(txns.filter((l) => type.test(l[3])).map((l) => Dec.of(l[11])));

  test('ending value = the sum of the holdings block, to the cent', () => {
    expect(ending.toString()).toBe('362088.59');
  });

  test('income and costs are what the file says, nothing more', () => {
    expect(of(/^Interest$/).toString()).toBe('4261.34');           // two Treasury coupons/discounts
    expect(of(/^Dividend$/).toString()).toBe('1193.32');           // seven money-market payouts
    expect(of(/^Fee$/).toString()).toBe('-460');                   // two ADR custody fees
  });

  test('the identity closes: market change is the residual, and it is the ONLY unknown', () => {
    // ending = beginning + 0 − 0 + income − costs + market change
    const income = of(/^Interest$|^Dividend$/);
    const fees = of(/^Fee$/);                                      // already negative
    const marketChange = ending.sub(BEGINNING).sub(income).sub(fees);
    expect(marketChange.toString()).toBe('-20928.07');             // the real story: the account LOST money
    // and the reinvestment legs cancel their payouts exactly — no cash left or entered
    expect(of(/^Reinvestment$/).add(of(/^Dividend$/)).isZero()).toBe(true);
  });
});

describe('THE CAUSE — the old production mapper, fed the same rows', () => {
  // the exact function production called (src/services/sync/snaptrade.ts), given each row the way
  // the sync road carried it: the broker's word as the type, the signed Net Amount as the amount.
  const mapped = txns.map((l) => ({
    word: l[3], amount: Number(l[11]),
    out: mapActivityType({ type: l[3], amount: Number(l[11]) } as any),
  }));
  const bookedAs = (t: string) => mapped.filter((m) => m.out.txnType === t);
  const sumAbs = (ms: typeof mapped) => Dec.sum(ms.map((m) => Dec.of(String(Math.abs(m.amount)))));

  test('phantom contributions: $1,064,493.33 minted on an account nothing entered', () => {
    const deposits = bookedAs('DEPOSIT');
    expect(sumAbs(deposits).toString()).toBe('1064493.33');
    // every single one is a sweep or a maturity — internal plumbing, not new money
    for (const d of deposits) expect(d.word).toMatch(/^Sweep out$|^Corp Action \(Redemption\)$/);
  });

  test('phantom withdrawals: $424,818.32 minted on an account nothing left', () => {
    const withdrawals = bookedAs('WITHDRAWAL');
    expect(sumAbs(withdrawals).toString()).toBe('424818.32');
    // sweeps into the settlement fund plus the reinvestment legs — again, internal
    for (const w of withdrawals) expect(w.word).toMatch(/^Sweep in$|^Reinvestment$/);
  });

  test('every phantom dollar came from ONE rule: the unknown-word sign-guess', () => {
    // the guilty branch marks itself: default → note "broker: <word>"
    const phantoms = mapped.filter((m) => ['DEPOSIT', 'WITHDRAWAL'].includes(m.out.txnType as string));
    expect(phantoms.length).toBe(17);   // 5 sweeps out + 2 redemptions + 3 sweeps in + 7 reinvest legs
    for (const p of phantoms) expect(p.out.note).toBe(`broker: ${p.word}`);
    // and NOT ONE recognised word contributed a cent to either phantom total
    expect(sumAbs(phantoms).toString()).toBe(Dec.of('1064493.33').add(Dec.of('424818.32')).toString());
  });

  test('the back-solved beginning goes NEGATIVE — the minus sign the founder saw', () => {
    // the old screen derived beginning = ending − (in − out) − income + fees, because it never
    // measured a beginning. Feed that formula the old bookings:
    const inflow = sumAbs(bookedAs('DEPOSIT'));
    const outflow = sumAbs(bookedAs('WITHDRAWAL'));
    const income = sumAbs(bookedAs('DIVIDEND')).add(sumAbs(bookedAs('INTEREST')));
    const fees = sumAbs(bookedAs('FEE'));
    const backSolved = Dec.of('362088.59').sub(inflow.sub(outflow)).sub(income).add(fees);
    expect(backSolved.isNeg()).toBe(true);                         // a market value below zero
    expect(backSolved.toString()).toBe('-282581.08');              // for THIS account alone
  });

  test('the doubled interest: the live road mapped a reinvest leg to DIVIDEND and stored |amount|', () => {
    // over the live connection the reinvestment legs arrived as REI (verified 2026-08); the old
    // ingest stored Math.abs(amount) (git: ingest.ts before 2026-08-19), so the payout and its
    // reinvestment both counted as income:
    expect(mapActivityType({ type: 'REI', amount: -139.49 } as any))
      .toMatchObject({ txnType: 'DIVIDEND', reinvested: true });
    const PAYOUTS = ['139.49', '9.46', '9.75', '10.14', '525.76', '294.41', '204.31'];
    const bothLegsAbs = Dec.sum(PAYOUTS.flatMap((p) => [Dec.of(p).abs(), Dec.of('-' + p).abs()]));
    expect(bothLegsAbs.round(2).toString()).toBe('2386.64');       // the $2,387 on the founder's screen
    expect(Dec.sum(PAYOUTS.map(Dec.of)).toString()).toBe('1193.32'); // what Vanguard actually paid
  });
});

describe('THE CURE, on the same rows — the engine road production calls today', () => {
  const rows: LedgerRow[] = txns.map((l) => toLedgerRow({
    word: l[3], description: l[4], amount: l[11],
    units: l[7] ? Number(l[7]) : undefined, ticker: l[6] || undefined,
  }, 'NEGATIVE_IS_OUT'));

  test('every word is recognised — the sign-guess has nothing to guess about', () => {
    expect(unclassified(rows)).toEqual([]);
  });

  test('the identity closes to Vanguard\'s own statement, to the cent', () => {
    expect(totalOf(rows, 'contributions').isZero()).toBe(true);    // was 1,064,493.33
    expect(totalOf(rows, 'withdrawals').isZero()).toBe(true);      // was 424,818.32
    expect(totalOf(rows, 'income').toString()).toBe('5454.66');    // 4,261.34 interest + 1,193.32 dividends, ONCE
    expect(totalOf(rows, 'costs').toString()).toBe('-460');        // two ADR fees, reducing
    const ending = Dec.sum(holdings.map((l) => Dec.of(l[5])));
    const marketChange = ending.sub(BEGINNING)
      .sub(totalOf(rows, 'income')).sub(totalOf(rows, 'costs'))
      .sub(totalOf(rows, 'contributions')).add(totalOf(rows, 'withdrawals'));
    expect(marketChange.toString()).toBe('-20928.07');
    // return on the founder's statement: (362,088.59 − 378,022) ÷ 378,022 = −4.2%
    const ret = ending.sub(BEGINNING).divRound(BEGINNING).round(4);
    expect(ret.toString()).toBe('-0.0421');
  });
});
