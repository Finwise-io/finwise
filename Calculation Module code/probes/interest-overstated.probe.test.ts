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
