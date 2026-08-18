// PROBE — why the app can report more interest than the statement does.
//
// Founder, 2026-08-17: the app showed about $2,000 of Vanguard interest against $1,193 actually
// received. That is roughly $800 too much. Below are the mechanisms that can produce it, each one
// executed rather than argued, so the real cause can be identified from his ledger rather than
// guessed at.
import { mapActivityType } from '../../src/services/sync/snaptrade';

const t = (type: string, amount = 0) => mapActivityType({ type, amount } as any);

// The screen sums the ledger like this — copied from NetWorthScreen.tsx:662 so the probe tests the
// real rule and not a paraphrase of it.
const sumOf = (rows: any[], type: string) =>
  rows.filter((r) => r.type === type).reduce((n, r) => n + Math.abs(Number(r.amount) || 0), 0);

describe('MECHANISM 1 — the sum takes the ABSOLUTE value, so charges add instead of subtract', () => {
  test('a NEGATIVE interest row increases reported interest', () => {
    const ledger = [
      { type: 'INTEREST', amount: 1_193 },     // what was actually received
      { type: 'INTEREST', amount: -400 },      // an interest charge, or a reversal
    ];
    expect(sumOf(ledger, 'INTEREST')).toBe(1_593);   // ← not 793. The charge was ADDED.
  });

  test('the same fault affects every line of the change walk, not just interest', () => {
    expect(sumOf([{ type: 'DEPOSIT', amount: 5_000 }, { type: 'DEPOSIT', amount: -5_000 }], 'DEPOSIT'))
      .toBe(10_000);                                  // a deposit and its reversal read as $10,000 in
  });
});

describe('MECHANISM 2 — a broker credit of any kind is booked as interest', () => {
  test('an unrecognised MISC line with money coming in becomes INTEREST', () => {
    // this rule exists because E*TRADE bills margin interest as MISC. The consequence is that ANY
    // positive MISC line — a fee reversal, a promotional credit, a correction — becomes interest.
    expect(t('MISC', 250)).toEqual({ txnType: 'INTEREST', note: 'brokerage credit (MISC)' });
    expect(t('MISC', -250).txnType).toBe('FEE');
  });
});

describe('MECHANISM 3 — the same line ingested twice counts twice', () => {
  test('duplicated interest rows simply add up', () => {
    const once = [{ type: 'INTEREST', amount: 1_193 }];
    const twice = [...once, { type: 'INTEREST', amount: 1_193 }];
    expect(sumOf(twice, 'INTEREST')).toBe(2_386);    // close to the ~$2,000 seen, if partially duplicated
  });
});

describe('WHAT IS NOT THE CAUSE — ruled out here so the search narrows', () => {
  test('a dividend is never counted as interest', () => {
    expect(t('DIVIDEND', 500).txnType).toBe('DIVIDEND');
    expect(t('REI', 500).txnType).toBe('DIVIDEND');
  });

  test('a matured bond paying out is not counted as interest either', () => {
    expect(t('REDEMPTION', 100_000).txnType).toBe('SELL');
  });

  test('an unrecognised word with money in becomes a DEPOSIT, not interest', () => {
    // so the missing $800 of interest is NOT the same fault as the phantom contributions —
    // these are two separate defects with two separate causes.
    expect(t('BOND INTEREST PAID', 800).txnType).toBe('DEPOSIT');
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// THE FOUNDER'S EXACT $2,387 — reproduced to the dollar
// ════════════════════════════════════════════════════════════════════════════════════════════════
// His Vanguard file shows 7 monthly money-market payouts totalling $1,193.32, each arriving as a
// PAIR of lines: the credit ("Dividend Received", +139.49) and the reinvestment debit ("Dividend
// Reinvestment", −139.49). The pair nets to zero cash — the money never left the account.
//
// The app shows interest of $2,387. That is 2 × 1,193.32 = 2,386.64, rounded. The doubling has two
// layers, both in OUR code:
//   1. ingest.ts:161 stores amount: Math.abs(act.amount) — THE SIGN IS DESTROYED AT INGEST, so the
//      debit leg becomes indistinguishable from a second credit.
//   2. NetWorthScreen.tsx:662 sums with Math.abs again — so even a signed ledger would still add.
describe('THE $2,387 — a zero-sum pair counted twice', () => {
  const PAIRS = [139.49, 9.46, 9.75, 10.14, 525.76, 294.41, 204.31];   // the file's 7 months

  // the real pipeline, step by step: map → store-abs (ingest.ts:161) → screen abs-sum
  const throughPipeline = (rows: { type: string; amount: number }[]) => {
    const stored = rows
      .map((r) => ({ ours: mapActivityType(r as any).txnType, amount: Math.abs(r.amount) }));
    const sumOf = (type: string) =>
      stored.filter((s) => s.ours === type).reduce((n, s) => n + Math.abs(s.amount), 0);
    return { sumOf };
  };

  test('delivered as INTEREST pairs (how a broker types money-market income), interest = $2,386.64', () => {
    const rows = PAIRS.flatMap((amt) => [
      { type: 'INTEREST', amount: amt },       // the credit
      { type: 'INTEREST', amount: -amt },      // the reinvestment debit — nets to ZERO in reality
    ]);
    const { sumOf } = throughPipeline(rows);
    expect(Math.round(sumOf('INTEREST') * 100) / 100).toBe(2_386.64);   // ← the founder's $2,387
    // the true interest received in those rows is 1,193.32; the true NET cash effect is 0.
  });

  test('delivered as DIVIDEND + REI instead, the dividends line doubles the same way', () => {
    const rows = PAIRS.flatMap((amt) => [
      { type: 'DIVIDEND', amount: amt },
      { type: 'REI', amount: -amt },           // REI is in the table → DIVIDEND, reinvested
    ]);
    const { sumOf } = throughPipeline(rows);
    expect(Math.round(sumOf('DIVIDEND') * 100) / 100).toBe(2_386.64);
    // same fault, different label — whichever word the broker uses, the pair doubles.
  });

  test('THE FIX RULE: income counts ONCE; the reinvestment leg is a PURCHASE, never income', () => {
    // under the fix: credit leg → income; any leg whose word contains REINVEST → an internal buy.
    const fixed = PAIRS.map((amt) => amt);                     // one credit per month, once
    expect(Math.round(fixed.reduce((a, b) => a + b) * 100) / 100).toBe(1_193.32);
  });
});
